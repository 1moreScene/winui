import {test,expect,type Page} from '@playwright/test';
import {writeFileSync,mkdirSync} from 'node:fs';
import {PNG} from 'pngjs';
import {PaneDisplayMode,RendererBackend,ThemeMode,NavigationViewBackButtonVisible,NavigationTransition,NodeKind} from 'winui-wasm';

async function mount(page:Page,mode:PaneDisplayMode,backend:RendererBackend,theme=ThemeMode.Light){
 await page.goto('/#home');await page.waitForFunction(()=>!!window.gallery?.navigation);
 await page.evaluate(async options=>{
  let time=1000;const SDK=window.gallery.sdk.constructor as typeof import('winui-wasm').WinUI;
  const sdk=await SDK.create({globalScrollbars:false,clock:()=>time});const host=document.createElement('div');host.id='pane-motion-host';host.style.cssText='position:fixed;left:0;top:0;width:800px;height:540px;z-index:99999';document.body.append(host);
  const scene=sdk.scene(host,{backend:options.backend,theme:options.theme,reducedMotion:false,root:{background:'#142b48'}});
  const nav=scene.root.navigationView({paneDisplayMode:options.mode,isPaneOpen:false,reducedMotion:false,isBackButtonVisible:options.back,items:[{id:'first',text:'First',icon:'\uE80F'}]});
  const frame=nav.content.sceneFrame({pages:[{key:'page',content:{kind:options.canvas,name:'backdrop',properties:{background:'#0088cc'},children:[{kind:options.rectangle,properties:{canvasLeft:0,width:90,height:540,fill:'#ec3b55'}},{kind:options.rectangle,properties:{canvasLeft:180,width:90,height:540,fill:'#36b96f'}}]}}]});
  frame.navigate('page',{transition:options.transition});scene.render();
  const capture=()=>({time,width:nav.navigation.pane.width,open:nav.navigation.isPaneOpen,material:nav.navigation.paneMaterial,animating:nav.navigation.animating});
  Object.assign(window,{paneMotion:{sdk,scene,nav,frame,host,capture,sample(value:number){time=value;scene.render();return capture();}}});
 },{mode,backend,theme,back:NavigationViewBackButtonVisible.Collapsed,transition:NavigationTransition.Suppress,canvas:NodeKind.Canvas as const,rectangle:NodeKind.Rectangle as const});
 await page.waitForFunction(()=>window.paneMotion.frame.navigation.frame.current?.page==='page');
}
declare global {interface Window {paneMotion:{sdk:import('winui-wasm').WinUI;scene:import('winui-wasm').Scene;nav:import('winui-wasm').SceneNavigationViewController;frame:import('winui-wasm').SceneFrameController;host:HTMLElement;capture:()=>{time:number;width:number;open:boolean;material:import('winui-wasm').NavigationSnapshot['paneMaterial'];animating:boolean};sample:(time:number)=>ReturnType<Window['paneMotion']['capture']>};paneLiveTrace:Array<{time:number;width:number;open:boolean}>;}}
test.afterEach(async({page})=>{await page.evaluate(()=>{window.paneMotion?.sdk.dispose();window.paneMotion?.host.remove();});});

for(const backend of [RendererBackend.Canvas2D,RendererBackend.WebGL2])for(const mode of [PaneDisplayMode.Left,PaneDisplayMode.LeftCompact,PaneDisplayMode.LeftMinimal]){
 test(`${backend} ${mode}: pane motion survives every scene layout and reversal`,async({page})=>{
  await mount(page,mode,backend);const initial=await page.evaluate(()=>window.paneMotion.capture().width);
  await page.evaluate(()=>{window.paneMotion.nav.invoke('$toggle');window.paneMotion.scene.render();});
  const frames=[];
  for(const time of [1000,1016,1040,1080,1175,1350])frames.push(await page.evaluate(time=>window.paneMotion.sample(time),time));
  expect(frames[0].width).toBe(initial);expect(frames.at(-1)!.width).toBe(320);
  expect(new Set(frames.map(f=>f.width)).size).toBeGreaterThan(3);expect(frames[2].width).toBeGreaterThan(initial);expect(frames[2].width).toBeLessThan(320);
  await page.evaluate(()=>{window.paneMotion.sample(1500);window.paneMotion.nav.invoke('$toggle');window.paneMotion.scene.render();});
  const closing=await page.evaluate(()=>window.paneMotion.sample(1530));expect(closing.width).toBeGreaterThan(initial);expect(closing.width).toBeLessThan(320);
  await page.evaluate(()=>{window.paneMotion.nav.invoke('$toggle');window.paneMotion.scene.render();});
  expect((await page.evaluate(()=>window.paneMotion.capture())).width).toBeCloseTo(closing.width,5);
  expect((await page.evaluate(()=>window.paneMotion.sample(1570))).width).toBeGreaterThan(closing.width);
  mkdirSync('../out/navigation-pane-motion',{recursive:true});writeFileSync(`../out/navigation-pane-motion/${backend}-${mode}.json`,JSON.stringify({frames,closing},null,2));
 });
}
for(const backend of [RendererBackend.Canvas2D,RendererBackend.WebGL2])for(const theme of [ThemeMode.Light,ThemeMode.Dark]){
 test(`${backend} ${theme}: closing overlay retains real Acrylic pixels above Page`,async({page})=>{
  await mount(page,PaneDisplayMode.LeftCompact,backend,theme);
  await page.evaluate(()=>{window.paneMotion.nav.invoke('$toggle');window.paneMotion.scene.render();window.paneMotion.sample(1350);window.paneMotion.sample(1500);});
  const pixel=async()=>{const png=PNG.sync.read(await page.locator('#pane-motion-host').screenshot());const scale=png.width/800;const offset=(Math.round(250*scale)*png.width+Math.round(150*scale))*4;return [...png.data.subarray(offset,offset+4)];};
  const before=await pixel();expect(before[3]).toBe(255);expect(before).not.toEqual([0,136,204,255]);
  await page.evaluate(()=>{window.paneMotion.nav.invoke('$toggle');window.paneMotion.scene.render();});
  expect((await page.evaluate(()=>window.paneMotion.capture())).material).not.toBeNull();const closing=await pixel();expect(closing).toEqual(before);
  const early=await page.evaluate(()=>window.paneMotion.sample(1504));expect(early.width).toBeGreaterThan(150);expect(await pixel()).toEqual(before);
  const middle=await page.evaluate(()=>window.paneMotion.sample(1530));expect(middle.material).not.toBeNull();expect(middle.width).toBeGreaterThan(48);expect(middle.width).toBeLessThan(320);
  await page.locator('#pane-motion-host').screenshot({path:`../out/navigation-pane-motion/${backend}-${theme}-closing.png`});
  expect((await page.evaluate(()=>window.paneMotion.sample(1620))).material).toBeNull();
  await page.evaluate(()=>{const p=window.paneMotion;p.sample(2000);p.nav.invoke('$toggle');p.scene.render();p.sample(2350);});
  expect(await pixel()).toEqual(before);
  await page.evaluate(()=>{const p=window.paneMotion;p.frame.findName('backdrop')!.update({background:'#ffe400'});p.scene.render();});
  const changedBackdrop=await pixel();expect(changedBackdrop).not.toEqual(before);
  writeFileSync(`../out/navigation-pane-motion/${backend}-${theme}-pixels.json`,JSON.stringify({before,closing,middle,changedBackdrop},null,2));
 });
}
test('Gallery toggle receives actual pointer input and animates its real Frame layout',async({page})=>{
 await page.goto('/#navigation-view');const example=page.locator('#example-7');await example.scrollIntoViewIfNeeded();
 await expect(example.locator('[data-item-id="$toggle"]')).toBeVisible();
 await page.evaluate(()=>{window.paneLiveTrace=[];window.gallery.views[7].onSnapshot(s=>window.paneLiveTrace.push({time:s.time,width:s.pane.width,open:s.isPaneOpen}));});
 await example.locator('[data-item-id="$toggle"]').click();await expect.poll(()=>page.evaluate(()=>window.gallery.views[7].snapshot.isPaneOpen)).toBe(false);
 await expect.poll(()=>page.evaluate(()=>window.gallery.views[7].snapshot.pane.width)).toBe(48);
 const closed=await page.evaluate(()=>window.paneLiveTrace);expect(closed.some(s=>s.width>48&&s.width<320)).toBe(true);
 await example.locator('[data-item-id="$toggle"]').click();await expect.poll(()=>page.evaluate(()=>window.gallery.views[7].snapshot.pane.width)).toBe(320);
 const opened=await page.evaluate(()=>window.paneLiveTrace);expect(new Set(opened.map(s=>s.width)).size).toBeGreaterThan(3);
 writeFileSync('../out/navigation-pane-motion/gallery-pointer.json',JSON.stringify(opened,null,2));
});

for(const viewport of [{width:1440,height:1100},{width:1528,height:698},{width:1527,height:697}])for(const route of ['#home','#navigation-view'])test(`top hamburger visibly animates the whole CompactInline navigation on ${route} at ${viewport.width}x${viewport.height}`,async({page})=>{
 await page.setViewportSize(viewport);
 await page.goto('/'+route);await page.waitForFunction(()=>!!window.gallery?.navigation);if(route==='#navigation-view')await page.waitForFunction(()=>!!window.gallery.views?.[7]);
 await expect.poll(()=>page.evaluate(()=>window.gallery.navigation!.snapshot.isPaneOpen)).toBe(true);
 // Deterministic replay of the real Gallery, its real top button and Rust scene.
 // Only the host clock is instrumented; every frame still paints and projects.
 await page.evaluate(()=>{const v=window.gallery.navigation!,scene=v.scene as unknown as {clock:()=>number;render:()=>void};let time=v.snapshot.time+1000;scene.clock=()=>time;Object.assign(window,{topPaneClock:(delta:number)=>{time+=delta;scene.render();}});scene.render();});
 const toggle=page.getByRole('button',{name:'Toggle navigation pane',exact:true});
 await toggle.click();await expect(toggle).toHaveAttribute('aria-expanded','false');
 const samples=[];
 for(const delta of [0,16,34,50,60,39,1])samples.push(await page.evaluate(delta=>{
  (window as any).topPaneClock(delta);const s=window.gallery.navigation!.snapshot;
  return {time:s.time,width:s.pane.width,x:document.querySelector('.gallery-frame')!.getBoundingClientRect().x,rust:s.content.x,animating:s.animating};
 },delta));
 expect(samples[0].width).toBe(320);expect(samples[1].width).toBeGreaterThan(160);expect(samples[4].width).toBeGreaterThan(48);expect(samples.at(-1)!.width).toBe(48);
 expect(new Set(samples.map(s=>s.width)).size).toBeGreaterThan(5);
 for(const sample of samples)expect(sample.x).toBeCloseTo(sample.rust,3);
 mkdirSync('../out/navigation-pane-motion',{recursive:true});writeFileSync(`../out/navigation-pane-motion/top-${route.slice(1)}-${viewport.width}x${viewport.height}-samples.json`,JSON.stringify(samples,null,2));
 await toggle.click();await expect(toggle).toHaveAttribute('aria-expanded','true');
 await page.evaluate(()=>(window as any).topPaneClock(100));
 const mid=await page.evaluate(()=>window.gallery.navigation!.snapshot.pane.width);expect(mid).toBeGreaterThan(48);expect(mid).toBeLessThan(320);
 // A real second click reverses the currently visible frame without snapping.
 await toggle.click();await expect(toggle).toHaveAttribute('aria-expanded','false');
 expect(await page.evaluate(()=>window.gallery.navigation!.snapshot.pane.width)).toBeCloseTo(mid,5);
 await page.evaluate(()=>(window as any).topPaneClock(200));
 expect(await page.evaluate(()=>document.querySelector('.gallery-frame')!.getBoundingClientRect().x)).toBe(48);
});

test('actual 125% browser clock presents intermediate pane and page frames at 1528x698',async({page})=>{
 await page.setViewportSize({width:1528,height:698});await page.goto('/#home');await page.waitForFunction(()=>!!window.gallery?.navigation);await page.waitForTimeout(500);
 await page.evaluate(()=>{(window as any).realTopFrames=[];window.gallery.navigation!.onSnapshot(s=>(window as any).realTopFrames.push({open:s.isPaneOpen,time:s.time,width:s.pane.width,x:document.querySelector('.gallery-frame')!.getBoundingClientRect().x}));});
 const toggle=page.getByRole('button',{name:'Toggle navigation pane',exact:true});
 await toggle.click();await expect.poll(()=>page.evaluate(()=>window.gallery.navigation!.snapshot.pane.width)).toBe(48);
 await toggle.click();await expect.poll(()=>page.evaluate(()=>window.gallery.navigation!.snapshot.pane.width)).toBe(320);
 const frames=await page.evaluate(()=>(window as any).realTopFrames as {open:boolean;time:number;width:number;x:number}[]);
 for(const open of [false,true])expect(frames.some(f=>f.open===open&&f.width>48&&f.width<320&&f.x>48&&f.x<320)).toBe(true);
 mkdirSync('../out/navigation-pane-motion',{recursive:true});writeFileSync('../out/navigation-pane-motion/top-real-clock-1528x698.json',JSON.stringify(frames,null,2));
});
