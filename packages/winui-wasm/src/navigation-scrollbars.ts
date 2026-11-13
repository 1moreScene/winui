import type {NavigationScrollbarVisual} from './sdk';
let nextHost=0;
const keyHandlers = new WeakMap<HTMLElement,(event:KeyboardEvent)=>void>();

/** Accessibility and input projection only. Rust owns geometry, paint and keys. */
export function projectNavigationScrollbars(host:HTMLElement,visuals:readonly NavigationScrollbarVisual[],viewports:readonly {content:boolean;rect:import('./sdk').Rect}[],onKey:(content:boolean,key:string)=>void,signal:AbortSignal):void{
 for(const content of [false,true]){
  const id=content?'content':'menu';
  let viewport=host.querySelector<HTMLElement>(`:scope > [data-navigation-scroll-viewport="${id}"]`);
  const region=viewports.find(v=>v.content===content);
  if(!region)viewport?.remove();else{
   if(!viewport){viewport=document.createElement('div');viewport.dataset.navigationScrollViewport=id;viewport.dataset.navigationTouch='';viewport.setAttribute('aria-hidden','true');host.append(viewport);}
   const r=region.rect;viewport.style.cssText=`position:absolute;left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px;pointer-events:auto;z-index:0;touch-action:none`;
  }
  let bar=host.querySelector<HTMLElement>(`:scope > [data-navigation-scrollbar="${id}"]`);
  const visual=visuals.find(v=>v.content===content);
  if(!visual){
   if(bar){const handler=keyHandlers.get(bar);if(handler)bar.removeEventListener('keydown',handler);keyHandlers.delete(bar);bar.remove();}
   continue;
  }
  if(!bar){
   bar=document.createElement('div');bar.dataset.navigationScrollbar=id;
   bar.setAttribute('role','scrollbar');bar.setAttribute('aria-orientation','vertical');
   bar.setAttribute('aria-label',content?'Navigation content scroll':'Navigation menu scroll');bar.tabIndex=0;
   const handler=(event:KeyboardEvent)=>{if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key)){event.preventDefault();event.stopPropagation();onKey(content,event.key);}};
   keyHandlers.set(bar,handler);
   bar.addEventListener('keydown',handler,{signal});
   host.append(bar);
  }
  const r=visual.rect;
  if(!host.id)host.id=`winui-navigation-scroll-view-${++nextHost}`;
  bar.setAttribute('aria-controls',host.id);
  bar.dataset.navigationTouch='';
  bar.style.cssText=`position:absolute;left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px;opacity:0;z-index:2;touch-action:none`;
  bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax',String(visual.maximum));bar.setAttribute('aria-valuenow',String(visual.offset));
 }
}
