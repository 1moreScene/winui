import {test,expect} from '@playwright/test';

test('navigation and Frame subscriptions detach only their selected state',async({page})=>{
 await page.goto('/composition.html');await page.waitForFunction(()=>!!(window as any).composition?.scene);
 const result=await page.evaluate(()=>{
  const {view,frame,scene}=(window as any).composition;
  let fullSceneClones=0,navigationCalls=0,frameCalls=0;const clone=window.structuredClone;
  window.structuredClone=((value:any,...args:any[])=>{if(Array.isArray(value?.nodes))fullSceneClones++;return (clone as any)(value,...args);}) as typeof structuredClone;
  const first=view.onSnapshot((snapshot:any)=>{navigationCalls++;snapshot.parts[0].text='mutated by listener';});
  let otherText='';const second=view.onSnapshot((snapshot:any)=>{otherText=snapshot.parts[0].text;});
  const third=frame.onSnapshot((snapshot:any)=>{frameCalls++;snapshot.backStack.length=99;});
  scene.render();const actualText=view.snapshot.parts[0].text,back=frame.navigation.frame.backStack.length;
  first();second();third();window.structuredClone=clone;
  return {fullSceneClones,navigationCalls,frameCalls,otherText,actualText,back};
 });
 expect(result.fullSceneClones).toBe(0);expect(result.navigationCalls).toBeGreaterThan(1);expect(result.frameCalls).toBeGreaterThan(1);
 expect(result.actualText).not.toBe('mutated by listener');expect(result.otherText).toBe(result.actualText);expect(result.back).toBe(0);
});

test('unchanged properties stay cached and public snapshots remain complete after updates',async({page})=>{
 await page.goto('/composition.html');await page.waitForFunction(()=>!!(window as any).composition?.scene);
 const result=await page.evaluate(()=>{
  const {scene}=(window as any).composition;const button=scene.root.button({text:'Before',width:120});scene.render();
  const raw=scene.raw,original=raw.scene_frame;let wire:any;
  raw.scene_frame=function(...args:any[]){const result=original.apply(this,args);wire=JSON.parse(result);return result;};
  scene.render();const stable={cached:wire.nodes.filter((n:any)=>n.props===null).length,total:wire.nodes.length};
  button.update({text:'After',width:180});scene.render();
  const complete=scene.snapshot.nodes.every((n:any)=>!!n.props);
  const snapshot=button.snapshot;const sent=wire.nodes.find((n:any)=>n.id===snapshot.id).props;
  raw.scene_frame=original;
  return {stable,complete,text:snapshot.props.text,width:snapshot.rect.width,sentText:sent?.text};
 });
 expect(result.stable.cached/result.stable.total).toBeGreaterThan(.9);expect(result.complete).toBe(true);
 expect(result.text).toBe('After');expect(result.sentText).toBe('After');expect(result.width).toBe(180);
});

test('real pointer hover changes the Rust source brush without another layout',async({page})=>{
 await page.goto('/composition.html');await page.waitForFunction(()=>!!(window as any).composition?.scene);
 await page.mouse.move(790,530);await page.waitForTimeout(50);
 const before=await page.evaluate(()=>{const {scene,view}=(window as any).composition;return {passes:scene.snapshot.layoutPasses,part:view.snapshot.parts.find((p:any)=>p.id==='b')};});
 await page.mouse.move(before.part.rect.x+24,before.part.rect.y+18);await page.waitForTimeout(80);
 const after=await page.evaluate(()=>{const scene=(window as any).composition.scene;return {passes:scene.snapshot.layoutPasses,brush:scene.snapshot.nodes.find((n:any)=>n.templatePart==='ItemPart:b/LayoutRoot')?.props.background};});
 expect(after.passes).toBe(before.passes);expect(after.brush).toEqual({resource:'NavigationViewItemBackgroundPointerOver'});
});

test('unchanged host policies preserve the current layout',async({page})=>{
 await page.goto('/composition.html');await page.waitForFunction(()=>!!(window as any).composition?.scene);
 const result=await page.evaluate(()=>{const scene=(window as any).composition.scene;const before=scene.snapshot.layoutPasses;
  scene.configure({theme:'Light',reducedMotion:true,reducedTransparency:false});scene.render();return {before,after:scene.snapshot.layoutPasses};});
 expect(result.after).toBe(result.before);
});

test('entering the Gallery page does not format collapsed sample sources',async({page})=>{
 const requests:string[]=[];page.on('request',request=>requests.push(request.url()));
 await page.goto('/#navigation-view');await page.waitForFunction(()=>!!window.gallery?.views?.[7]);await page.waitForTimeout(100);
 expect(await page.locator('.source pre .token').count()).toBe(0);
 expect(requests.some(url=>/\/(?:standalone|babel|estree)-/.test(url))).toBe(false);
});

test('Frame motion refreshes scrollbar geometry without rescanning the document',async({page})=>{
 await page.goto('/#home');await page.waitForFunction(()=>!!window.gallery?.navigation);await page.waitForTimeout(500);
 const result=await page.evaluate(async()=>{
  const lease=window.gallery.sdk.installGlobalScrollbars();const frame=document.createElement('div'),content=document.createElement('div');
  frame.dataset.winuiFrame='';content.dataset.frameInstance='performance';frame.style.cssText='position:fixed;left:400px;top:100px;width:100px;height:100px';
  content.style.cssText='width:100px;height:100px;overflow:auto';content.innerHTML='<div style="height:400px">Scrollable page</div>';frame.append(content);document.body.append(frame);
  await new Promise(resolve=>setTimeout(resolve,200));const before=lease.diagnostics;
  for(let i=0;i<20;i++){await new Promise(resolve=>requestAnimationFrame(resolve));content.style.transform=`translate(${i}px, 0px)`;content.style.opacity=String(.5+i/40);}
  await new Promise(resolve=>requestAnimationFrame(resolve));const after=lease.diagnostics;
  content.hidden=true;await new Promise(resolve=>requestAnimationFrame(resolve));const hidden=lease.diagnostics;
  frame.remove();lease.dispose();return {before,after,hidden};
 });
 expect(result.after.scans).toBe(result.before.scans);expect(result.after.updates).toBeGreaterThan(result.before.updates);
 expect(result.hidden.scans).toBeGreaterThan(result.after.scans);
});

test('offscreen fixed surfaces coalesce resize work and resume with real Rust geometry',async({page})=>{
 await page.goto('/composition.html');await page.waitForFunction(()=>!!(window as any).composition?.scene);
 const result=await page.evaluate(async()=>{
  const {scene,view}=(window as any).composition,host=document.getElementById('host')!;
  const wait=()=>new Promise(resolve=>setTimeout(resolve,100));
  host.style.position='absolute';host.style.top='1600px';await wait();const before=scene.diagnostics.frames;
  host.style.width='720px';await wait();const deferred=scene.diagnostics.frames;
  host.style.top='0px';await wait();const resumed=scene.diagnostics.frames,visibleWidth=view.control.snapshot.rect.width;
  host.style.top='1600px';await wait();const beforeRead=scene.diagnostics.frames;
  host.style.width='680px';await wait();const beforeForcedRead=scene.diagnostics.frames;
  const explicitWidth=view.control.snapshot.rect.width,afterRead=scene.diagnostics.frames;
  let selected='';const off=view.onSnapshot((s:any)=>{selected=s.selectedId;});view.update({selectedId:'b'});await wait();off();
  return {before,deferred,resumed,visibleWidth,beforeRead,beforeForcedRead,afterRead,explicitWidth,selected};
 });
 expect(result.deferred).toBe(result.before);expect(result.resumed).toBeGreaterThan(result.deferred);expect(result.visibleWidth).toBe(720);
 expect(result.beforeForcedRead).toBe(result.beforeRead);expect(result.afterRead).toBeGreaterThan(result.beforeForcedRead);expect(result.explicitWidth).toBe(680);expect(result.selected).toBe('b');
});

test('an existing overflow candidate is discovered when Frame geometry makes it scrollable',async({page})=>{
 await page.goto('/#home');await page.waitForFunction(()=>!!window.gallery?.navigation);await page.waitForTimeout(400);
 const result=await page.evaluate(async()=>{
  const lease=window.gallery.sdk.installGlobalScrollbars(),frame=document.createElement('div'),content=document.createElement('div');
  frame.dataset.winuiFrame='';frame.style.cssText='position:fixed;left:400px;top:100px;width:100px;height:100px';
  content.dataset.frameInstance='candidate';content.style.cssText='width:100px;height:100px;overflow:auto';content.innerHTML='<div style="height:40px">Content</div>';frame.append(content);document.body.append(frame);
  const wait=()=>new Promise(resolve=>setTimeout(resolve,150));await wait();const before=content.hasAttribute('data-winui-scroll-host');
  content.style.height='20px';await wait();const after=content.hasAttribute('data-winui-scroll-host');
  frame.style.transform='rotate(10deg)';await wait();const fallback=!content.hasAttribute('data-winui-scroll-host');
  frame.remove();lease.dispose();return {before,after,fallback};
 });
 expect(result.before).toBe(false);expect(result.after).toBe(true);expect(result.fallback).toBe(true);
});

test('Rust keeps every navigation template part without projecting empty DOM grids',async({page})=>{
 await page.goto('/#home');await page.waitForFunction(()=>!!window.gallery?.navigation);
 const result=await page.evaluate(()=>{const scene=window.gallery.navigation!.scene;return {rust:scene.snapshot.nodes.length,dom:scene.element.querySelectorAll('[data-scene-node]').length};});
 expect(result.rust).toBeGreaterThan(300);expect(result.dom).toBeLessThan(result.rust*.6);
 await expect(page.locator('.gallery-navigation [data-item-id="gallery-home"]')).toBeVisible();
});

test('custom item content retains its real interactive SDK control and ancestor clips',async({page})=>{
 await page.goto('/composition.html');await page.waitForFunction(()=>!!(window as any).composition?.scene);
 await page.evaluate(()=>{const {view,scene,SDK}=(window as any).composition;view.update({items:[{id:'a',text:'Menu',contentTemplate:{kind:SDK.NodeKind.ToggleButton,properties:{text:'Inner action',accessibleName:'Inner action'}}}]});scene.render();});
 const button=page.getByRole('button',{name:'Inner action',exact:true});await expect(button).toBeVisible();await button.click();
 await expect(button).toHaveAttribute('aria-pressed','true');
 expect(await page.evaluate(()=>(window as any).composition.scene.snapshot.nodes.some((n:any)=>n.kind==='ToggleButton'&&n.props.text==='Inner action'&&n.props.isChecked))).toBe(true);
});

test('inline pane animation keeps the hosted page width stable per state',async({page})=>{
 await page.goto('/#navigation-view');await page.waitForFunction(()=>!!window.gallery?.views?.[7]);
 await page.evaluate(()=>{(window as any).paneLayout=[];window.gallery.navigation!.onSnapshot(s=>{const frame=document.querySelector<HTMLElement>('.gallery-frame')!;(window as any).paneLayout.push({open:s.isPaneOpen,width:parseFloat(frame.style.width),rust:s.content.width,x:s.content.x});});});
 const toggle=page.getByRole('button',{name:'Toggle navigation pane',exact:true});await toggle.click();await page.waitForTimeout(400);await toggle.click();await page.waitForTimeout(500);
 const samples=await page.evaluate(()=>(window as any).paneLayout as {open:boolean;width:number;rust:number;x:number}[]);
 for(const open of [false,true]){const values=samples.filter(s=>s.open===open);expect(values.length).toBeGreaterThan(2);expect(new Set(values.map(s=>s.width)).size).toBe(1);expect(values.every(s=>s.width===s.rust)).toBe(true);}
 expect(new Set(samples.map(s=>s.x)).size).toBeGreaterThan(5);
});
