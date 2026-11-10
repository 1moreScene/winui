import {Scene,type SceneNavigationView,type SceneEvent,type Panel} from './scene';
import type {WinUiRuntime} from './wasm/winui';
import {EventKind,NavigationViewSlot} from './enums';
import type {NavigationViewOptions,NavigationSnapshot,NavigationEvent} from './sdk';

/** Standalone host for the same Rust NavigationView used inside SceneView.
 * The scene owns its source template, content, input, animation and disposal. */
export class NavigationView {
  readonly scene:Scene;
  readonly control:SceneNavigationView;
  private disposed=false;
  private originalPointerEvents='';
  private originalPriority='';
  private host:HTMLElement|null=null;
  private ownsScene:boolean;
  get isDisposed(){return this.disposed||this.control.isDisposed;}
  static fromScene(scene:Scene,control:SceneNavigationView){control.assertOwned(scene);return new NavigationView(scene,control);}
  constructor(raw:WinUiRuntime|Scene,host:HTMLElement|SceneNavigationView,options:NavigationViewOptions={},
    private released:()=>void=()=>{},clock:()=>number=()=>performance.now()){
    this.ownsScene=!(raw instanceof Scene);
    if(raw instanceof Scene){this.scene=raw;this.control=host as SceneNavigationView;return;}
    host=host as HTMLElement;this.host=host;
    this.originalPointerEvents=host.style.pointerEvents;
    this.originalPriority=host.style.getPropertyPriority('pointer-events');
    this.scene=new Scene(raw,host,{theme:options.theme,reducedMotion:options.reducedMotion,reducedTransparency:options.reducedTransparency},clock,()=>{});
    try{this.control=this.scene.root.navigationView(options);this.scene.render();}
    catch(error){this.scene.dispose();throw error;}
    if(options.hasExternalContent)host.style.setProperty('pointer-events','none',this.originalPriority);
  }
  private assert(){if(this.isDisposed)throw new Error('NavigationView is disposed');}
  get snapshot():Readonly<NavigationSnapshot>{this.assert();return this.control.navigation;}
  get properties():Readonly<NavigationViewOptions>{this.assert();return this.control.properties.navigation!;}
  get diagnostics(){this.assert();return this.scene.diagnostics;}
  on(kind:EventKind,listener:(event:NavigationEvent)=>void){this.assert();return this.control.on(kind,event=>listener(event as unknown as NavigationEvent));}
  onSnapshot(listener:(snapshot:Readonly<NavigationSnapshot>)=>void){this.assert();return this.control.onSnapshot(listener);}
  update(patch:NavigationViewOptions){this.batch([patch]);}
  batch(patches:readonly NavigationViewOptions[]){
    this.assert();this.scene.batch(()=>{for(const patch of patches)this.control.configure(patch);});
    const patch=Object.assign({},...patches) as NavigationViewOptions;
    if(patch.theme!==undefined||patch.reducedMotion!==undefined||patch.reducedTransparency!==undefined)this.scene.configure({theme:patch.theme,reducedMotion:patch.reducedMotion,reducedTransparency:patch.reducedTransparency});
  }
  invoke(id:string){this.assert();this.control.invoke(id);}
  setExpanded(id:string,expanded:boolean){this.assert();this.control.setExpanded(id,expanded);}
  /** Compose real SDK controls in a stable Rust-owned template slot. */
  slot(slot:NavigationViewSlot):Panel{this.assert();return this.control.slot(slot);}
  get content(){return this.slot(NavigationViewSlot.Content);}
  dispose(){if(this.disposed)return;this.disposed=true;if(this.ownsScene)this.scene.dispose();else this.control.dispose();
    if(this.host?.style.pointerEvents==='none')this.host.style.setProperty('pointer-events',this.originalPointerEvents,this.originalPriority);
    this.released();
  }
}
