import type {NavigationScrollbarVisual} from './sdk';
let nextHost=0;

/** Accessibility and input projection only. Rust owns geometry, paint and keys. */
export function projectNavigationScrollbars(host:HTMLElement,visuals:readonly NavigationScrollbarVisual[],onKey:(content:boolean,key:string)=>void,signal:AbortSignal):void{
 for(const content of [false,true]){
  const id=content?'content':'menu';
  let bar=host.querySelector<HTMLElement>(`:scope > [data-navigation-scrollbar="${id}"]`);
  const visual=visuals.find(v=>v.content===content);
  if(!visual){bar?.remove();continue;}
  if(!bar){
   bar=document.createElement('div');bar.dataset.navigationScrollbar=id;
   bar.setAttribute('role','scrollbar');bar.setAttribute('aria-orientation','vertical');
   bar.setAttribute('aria-label',content?'Navigation content scroll':'Navigation menu scroll');bar.tabIndex=0;
   bar.addEventListener('keydown',event=>{if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key)){event.preventDefault();event.stopPropagation();onKey(content,event.key);}},{signal});
   host.append(bar);
  }
  const r=visual.rect;
  if(!host.id)host.id=`winui-navigation-scroll-view-${++nextHost}`;
  bar.setAttribute('aria-controls',host.id);
  bar.style.cssText=`position:absolute;left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px;opacity:0;z-index:1;touch-action:none`;
  bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax',String(visual.maximum));bar.setAttribute('aria-valuenow',String(visual.offset));
 }
}
