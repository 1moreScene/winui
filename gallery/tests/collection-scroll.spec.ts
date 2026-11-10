import {test,expect} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import {collectionEvidencePrefix as prefix} from '../collection-validation-paths';

test('actual wheel input scrolls every overflowing Gallery ListView',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#list-view');await page.getByRole('listbox',{name:'Contacts',exact:true}).waitFor();
 const cases=await page.evaluate(()=>Object.entries(window.collectionScenes).flatMap(([scene,s])=>s.snapshot.nodes.filter(n=>n.kind==='ListView'&&n.scroll&&n.scroll.scrollableHeight>0).map(n=>({scene,id:n.id,name:n.props.accessibleName!}))));
 expect(cases.length).toBeGreaterThanOrEqual(6);
 for(const row of cases){const list=page.getByRole('listbox',{name:row.name,exact:true});await list.scrollIntoViewIfNeeded();const rect=await list.boundingBox();if(!rect)throw Error('missing list');const before=await page.evaluate(row=>window.collectionScenes[row.scene].snapshot.nodes.find(n=>n.id===row.id)!.scroll!.verticalOffset,row);await page.mouse.move(rect.x+100,rect.y+100);await page.mouse.wheel(0,240);await expect.poll(()=>page.evaluate(row=>window.collectionScenes[row.scene].snapshot.nodes.find(n=>n.id===row.id)!.scroll!.verticalOffset,row)).toBeGreaterThan(before+20);}
 expect(errors).toEqual([]);
});

test('animated distant wheel destinations keep realization bounded and cover the visible viewport',async({page})=>{
 await page.goto('/#list-view');const results=await page.evaluate(async()=>{
  const a=await import('/@id/winui-wasm' as string) as typeof import('winui-wasm');const sdk=await a.WinUI.create({globalScrollbars:false});const results=[];
  for(const mode of ['plain','template','grouped']){
   const host=document.createElement('div');host.style.cssText='position:fixed;inset:0;width:400px;height:300px;z-index:99999';document.body.append(host);const scene=sdk.scene(host);
   const items=Array.from({length:100000},(_,i)=>({id:String(i),text:`Item ${i}`}));const list=scene.root.listView({width:360,height:280,...(mode==='grouped'?{groups:[{id:'a',header:'Group A',items:items.slice(0,50000)},{id:'b',header:'Group B',items:items.slice(50000)}]}:{items})});
   if(mode==='template')list.setItemTemplate((item,slot)=>slot.text({text:item.text}));await new Promise(r=>setTimeout(r,120));
   const frames:{nodes:number;count:number;offset:number;covered:boolean;error:string|null}[]=[];
   // Observe after actual frames without structured-cloning diagnostic snapshots
   // in every rAF: instrumentation must not dominate the scroll under test.
   const id=list.snapshot.id;const internal=scene as any,original=internal.draw;internal.draw=function(){original.call(this);const state=this.state as typeof scene.snapshot;const node=state.nodes.find(n=>n.id===id)!;const offset=node.scroll!.verticalOffset;const children=state.nodes.filter(n=>n.props.collectionOwner===node.id&&n.kind===a.NodeKind.CollectionItem);const bottom=Math.min(offset+180,node.scroll!.extentHeight-1);frames.push({nodes:state.nodes.length,count:children.length,offset,covered:children.some(n=>n.rect.y<=bottom&&n.rect.y+n.rect.height>=bottom),error:node.collection!.realizationError});};
   host.querySelector('canvas')!.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,clientX:80,clientY:100,deltaY:60000}));await new Promise(r=>setTimeout(r,850));internal.draw=original;
   results.push({mode,frames});scene.dispose();host.remove();
  }
  sdk.dispose();return results;
 });
 writeFileSync(`../references/validation/${prefix}-scroll-window-${process.env.PW_CHANNEL??'chrome'}.json`,JSON.stringify(results,null,2));
 for(const row of results){expect(row.frames.length,row.mode).toBeGreaterThan(5);expect(Math.max(...row.frames.map(f=>f.count)),row.mode).toBeLessThan(40);expect(row.frames.every(f=>f.covered&&f.error===null),row.mode).toBe(true);expect(row.frames.at(-1)!.offset).toBeGreaterThan(59000);}
});

test('scrolling preserves existing accessible text nodes and final selection',async({page})=>{
 await page.goto('/#list-view');await page.getByRole('listbox',{name:'Contacts',exact:true}).waitFor();
 const result=await page.evaluate(async()=>{
  const scene=window.collectionScenes['list-basic'];const root=document.querySelector('#list-basic [role="listbox"]')!;const first=root.querySelector('[role="option"]')!;const text=first.querySelector('span')!;const original=text.firstChild;
  const canvas=document.querySelector('#list-basic canvas')!;canvas.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,clientX:root.getBoundingClientRect().x+80,clientY:root.getBoundingClientRect().y+80,deltaY:30}));await new Promise(r=>setTimeout(r,350));
  return{same:original===text.firstChild,frames:scene.diagnostics.frames,offset:scene.snapshot.nodes.find(n=>n.kind==='ListView')!.scroll!.verticalOffset};
 });expect(result.same).toBe(true);expect(result.offset).toBeGreaterThan(25);const list=page.getByRole('listbox',{name:'Contacts',exact:true});const option=list.getByRole('option').nth(2);await option.click();await expect(option).toHaveAttribute('aria-selected','true');
});
