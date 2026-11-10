import type { WinUiRuntime } from './wasm/winui';
import { NavigationCacheMode, NavigationMode, NavigationTransition } from './enums';

/** A stable journal entry. Parameters stay in the JS host; Rust stores their identity. */
export interface PageStackEntry { readonly id:number; readonly page:string; readonly parameter:number; readonly transition:NavigationTransition; readonly cacheMode:NavigationCacheMode; }
export interface FramePage { readonly instance:number; readonly page:string; readonly cacheMode:NavigationCacheMode; }
/** Backend-independent compositor output, in DIP. */
export interface FrameVisual {
  readonly instance:number; readonly x:number; readonly y:number; readonly opacity:number;
  /** Rust presentation membership. Transparent incoming pages remain in layout. */ readonly visible:boolean;
  /** Rust controls activation at the transition boundary. */ readonly interactive:boolean;
  /** Rust paint order; cached instance IDs are unrelated to layer order. */ readonly zIndex:number;
}
/** @internal Host projection only. Missing/disposed pages stay hidden until reconciliation removes them. */
export function projectFrameVisual(element:HTMLElement,visual:FrameVisual|undefined):void{
  const values={transform:visual?`translate(${visual.x}px, ${visual.y}px)`:'',opacity:String(visual?.opacity??0),zIndex:String(visual?.zIndex??0),display:visual?.visible?'flex':'none',pointerEvents:visual?.interactive?'':'none'};
  for(const key of Object.keys(values) as Array<keyof typeof values>)if(element.style[key]!==values[key])element.style[key]=values[key];
  if(element.hidden!==!visual?.visible)element.hidden=!visual?.visible;
  if(element.inert!==!visual?.interactive)element.inert=!visual?.interactive;
}
export interface FrameSnapshot {
  readonly current:PageStackEntry|null; readonly currentInstance:number|null;
  readonly backStack:readonly PageStackEntry[]; readonly forwardStack:readonly PageStackEntry[];
  readonly pages:readonly FramePage[]; readonly visuals:readonly FrameVisual[];
  readonly animating:boolean; readonly cacheSize:number; readonly mode:NavigationMode;
}
/** Synchronous pre-navigation event. Cancellation leaves history, cache and current page intact. */
export interface NavigatingEvent { readonly from:PageStackEntry|null; readonly to:PageStackEntry; readonly mode:NavigationMode; readonly parameter:unknown; cancel:boolean; }
/** Page lifecycle notifications also run when a cached instance is revisited. */
export interface NavigatedEvent { readonly entry:PageStackEntry; readonly mode:NavigationMode; readonly parameter:unknown; }
/** Host content and lifecycle. dispose runs after exit animation or cache eviction. */
export interface PageDefinition<T> {
  /** Default Disabled. */ cacheMode?:NavigationCacheMode;
  create:(event:NavigatedEvent)=>T;
  onNavigatingFrom?:(content:T,event:NavigatingEvent)=>void;
  onNavigatedFrom?:(content:T,event:NavigatedEvent)=>void;
  onNavigatedTo?:(content:T,event:NavigatedEvent)=>void;
  dispose?:(content:T)=>void;
}
export interface FrameOptions<T> {
  /** Resolve the page's definition. The page string identifies its cache type. */ resolvePage:(page:string)=>PageDefinition<T>;
  /** Native default 10; Required pages use a separate cache. */ cacheSize?:number;
  /** Default follows prefers-reduced-motion. Can be overridden through configure. */ reducedMotion?:boolean;
  onNavigating?:(event:NavigatingEvent)=>void;
  onNavigated?:(event:NavigatedEvent)=>void;
  /** Notification after either synchronous pre-navigation callback cancels. */
  onNavigationStopped?:(event:NavigatingEvent)=>void;
  onNavigationFailed?:(error:unknown)=>void;
}
export interface NavigateOptions {
  parameter?:unknown;
  /** Default Entrance. */ transition?:NavigationTransition;
}
type Command = {kind:string;[key:string]:unknown};
type LivePage<T> = {definition:PageDefinition<T>;content:T};

/** Framework independent Frame. Rust owns journal/cache/motion; the host owns business content. */
export class Frame<T> {
  private readonly handle:number;
  private state:FrameSnapshot;
  private pages=new Map<number,LivePage<T>>();
  private parameters=new Map<number,unknown>();
  private nextParameter=0;
  private listeners=new Set<(snapshot:Readonly<FrameSnapshot>)=>void>();
  private raf=0; private disposed=false; private changing=false;
  private media=matchMedia('(prefers-reduced-motion: reduce)');
  private followMotion:boolean;
  private motionChanged=()=>{if(this.followMotion)this.commit({kind:'configure',cacheSize:this.state.cacheSize,reducedMotion:this.media.matches},false);};
  constructor(private raw:WinUiRuntime,private options:FrameOptions<T>,private clock:()=>number,private released:()=>void){
    this.handle=raw.navigation_frame_create();this.followMotion=options.reducedMotion===undefined;
    this.state=JSON.parse(raw.navigation_frame_tick(this.handle,clock()));
    try{this.configure({cacheSize:options.cacheSize??10,reducedMotion:options.reducedMotion});}
    catch(error){raw.navigation_frame_destroy(this.handle);throw error;}
    this.media.addEventListener('change',this.motionChanged);
  }
  private assert(){if(this.disposed)throw new Error('Frame is disposed');}
  get isDisposed():boolean{return this.disposed;}
  get snapshot():Readonly<FrameSnapshot>{this.assert();return structuredClone(this.state);}
  get canGoBack(){this.assert();return this.state.backStack.length>0;}
  get canGoForward(){this.assert();return this.state.forwardStack.length>0;}
  get content():T|undefined {this.assert();return this.state.currentInstance===null?undefined:this.pages.get(this.state.currentInstance)?.content;}
  contentFor(instance:number):T|undefined {this.assert();return this.pages.get(instance)?.content;}
  parameterFor(entry:PageStackEntry):unknown {this.assert();return this.parameters.get(entry.parameter);}
  onSnapshot(listener:(snapshot:Readonly<FrameSnapshot>)=>void):()=>void {this.assert();this.listeners.add(listener);listener(this.snapshot);return()=>this.listeners.delete(listener);}
  navigate(page:string,options:NavigateOptions={}):boolean {
    this.assert();let definition:PageDefinition<T>;
    try{definition=this.options.resolvePage(page);}catch(error){if(this.options.onNavigationFailed){this.options.onNavigationFailed(error);return false;}throw error;}
    const parameter=++this.nextParameter;this.parameters.set(parameter,options.parameter);
    try{return this.commit({kind:'navigate',page,parameter,transition:options.transition??NavigationTransition.Entrance,cacheMode:definition.cacheMode??NavigationCacheMode.Disabled});}
    finally{if(![this.state.current,...this.state.backStack,...this.state.forwardStack].some(e=>e?.parameter===parameter))this.parameters.delete(parameter);}
  }
  goBack():boolean {return this.canGoBack&&this.commit({kind:'back'});}
  goForward():boolean {return this.canGoForward&&this.commit({kind:'forward'});}
  /** Host history integration: traverse directly to an existing entry, without creating intermediate pages. */
  goToEntry(entry:number):boolean {return this.commit({kind:'traverse',entry});}
  refresh():boolean {this.assert();return !!this.state.current&&this.commit({kind:'refresh'});}
  clearHistory():void {this.commit({kind:'clearHistory'},false);}
  /** Change the live page cache policy. Disabled removes an existing cache entry immediately. */
  setCacheMode(page:string,mode:NavigationCacheMode):void {this.commit({kind:'cacheMode',page,mode},false);}
  configure(options:{cacheSize?:number;reducedMotion?:boolean}):void {
    const motion=Object.hasOwn(options,'reducedMotion')?options.reducedMotion:this.options.reducedMotion;
    if(this.commit({kind:'configure',cacheSize:options.cacheSize??this.state.cacheSize,reducedMotion:motion??this.media.matches},false)){
      this.options.reducedMotion=motion;this.followMotion=motion===undefined;
    }
  }
  private event(entry:PageStackEntry,mode:NavigationMode):NavigatedEvent{return {entry,mode,parameter:this.parameters.get(entry.parameter)};}
  private notify(callback:()=>void){try{callback();}catch(error){reportError(error);}}
  private commit(command:Command,navigation=true):boolean {
    this.assert();if(this.changing)throw new Error('Reentrant Frame navigation is not supported');this.changing=true;
    let candidate:LivePage<T>|undefined;let committed=false;
    try{
      const time=this.clock(),json=JSON.stringify(command);
      const next=JSON.parse(this.raw.navigation_frame_command(this.handle,json,time,true)) as FrameSnapshot;
      const previous=this.state,old=previous.currentInstance===null?undefined:this.pages.get(previous.currentInstance);
      if(navigation&&next.current){
        const event:NavigatingEvent={from:previous.current,to:next.current,mode:next.mode,parameter:this.parameters.get(next.current.parameter),cancel:false};
        this.options.onNavigating?.(event);if(this.disposed)return false;
        if(event.cancel){this.notify(()=>this.options.onNavigationStopped?.(event));return false;}
        old?.definition.onNavigatingFrom?.(old.content,event);if(this.disposed)return false;
        if(event.cancel){this.notify(()=>this.options.onNavigationStopped?.(event));return false;}
        if(next.currentInstance!==null&&!this.pages.has(next.currentInstance)){
          const definition=this.options.resolvePage(next.current.page);candidate={definition,content:definition.create(this.event(next.current,next.mode))};
        }
      }
      if(this.disposed){if(candidate)candidate.definition.dispose?.(candidate.content);return false;}
      this.state=JSON.parse(this.raw.navigation_frame_command(this.handle,json,time,false));committed=true;
      if(candidate&&this.state.currentInstance!==null)this.pages.set(this.state.currentInstance,candidate);
      if(navigation&&this.state.current){
        const event=this.event(this.state.current,this.state.mode);
        if(old&&previous.current)this.notify(()=>old.definition.onNavigatedFrom?.(old.content,event));
        if(this.disposed)return true;
        const current=this.pages.get(this.state.currentInstance!);
        if(current)this.notify(()=>current.definition.onNavigatedTo?.(current.content,event));
        if(this.disposed)return true;
        this.notify(()=>this.options.onNavigated?.(event));
      }
      if(!this.disposed)this.publish();return true;
    }catch(error){
      if(candidate&&!committed)candidate.definition.dispose?.(candidate.content);
      if(this.options.onNavigationFailed){this.options.onNavigationFailed(error);return false;}throw error;
    }finally{this.changing=false;}
  }
  private publish(){
    const retained=new Set(this.state.pages.map(p=>p.instance));
    for(const [id,page] of this.pages)if(!retained.has(id)){this.pages.delete(id);this.notify(()=>page.definition.dispose?.(page.content));}
    const parameters=new Set([this.state.current,...this.state.backStack,...this.state.forwardStack].filter(e=>e!==null).map(e=>e.parameter));
    for(const key of this.parameters.keys())if(!parameters.has(key))this.parameters.delete(key);
    for(const listener of this.listeners)this.notify(()=>listener(this.snapshot));
    if(this.state.animating&&!this.raf&&!this.disposed)this.raf=requestAnimationFrame(()=>{
      this.raf=0;if(this.disposed)return;this.state=JSON.parse(this.raw.navigation_frame_tick(this.handle,this.clock()));this.publish();
    });
  }
  dispose():void {
    if(this.disposed)return;this.disposed=true;cancelAnimationFrame(this.raf);this.media.removeEventListener('change',this.motionChanged);
    this.raw.navigation_frame_destroy(this.handle);for(const page of this.pages.values())this.notify(()=>page.definition.dispose?.(page.content));
    this.pages.clear();this.parameters.clear();this.listeners.clear();this.released();
  }
}
