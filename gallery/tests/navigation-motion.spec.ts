import {expect,test} from '@playwright/test';
import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {PNG} from 'pngjs';
import {PaneDisplayMode,RendererBackend,NavigationCacheMode,NavigationTransition,ThemeMode} from '../src/enums';
import type {WinUI,NavigationView,Scene,SceneNavigationView,NavigationSnapshot} from '../src/index';
declare global{interface Window {navigationMotion:{sdk:WinUI;view:NavigationView;time:number;sample(time:number):void};sharedMotion:{sdk:WinUI;host:HTMLElement};}}

test('hierarchy source offsets and chevrons animate and reverse in the production Canvas host',async({page})=>{
 await page.goto('/#home');await expect.poll(()=>page.evaluate(()=>!!window.gallery?.navigation)).toBe(true);
 await page.evaluate(async({mode})=>{
  const host=document.createElement('div');host.id='motion-host';host.style.cssText='position:fixed;inset:0 auto auto 0;width:800px;height:600px;z-index:99999';document.body.append(host);
  let time=1000;const SDK=window.gallery.sdk.constructor as typeof import('../src').WinUI;
  const sdk=await SDK.create({globalScrollbars:false,clock:()=>time});
  const view=sdk.navigationView(host,{paneDisplayMode:mode,isBackButtonVisible:false,isSettingsVisible:false,openPaneLength:280,selectedId:'follower',items:[{id:'parent',text:'Parent',selectsOnInvoked:false,children:[{id:'child',text:'Child'},{id:'nested',text:'Nested',children:[{id:'leaf',text:'Leaf'}]}]},{id:'follower',text:'Follower'},{id:'last',text:'Last'}]});
  window.navigationMotion={sdk,view,time,sample(next){time=next;this.time=next;view.update({});}};
 },{mode:PaneDisplayMode.Left});
 await expect.poll(()=>page.evaluate(()=>window.navigationMotion.view.snapshot.time)).toBe(1000);
 const start=await page.evaluate(()=>window.navigationMotion.view.snapshot.parts.find(p=>p.id==='follower')!.rect.y);
 await page.evaluate(()=>window.navigationMotion.view.setExpanded('parent',true));
 await expect.poll(()=>page.evaluate(()=>window.navigationMotion.view.snapshot.expandedIds.includes('parent'))).toBe(true);
 expect(await page.evaluate(()=>window.navigationMotion.view.snapshot.parts.find(p=>p.id==='follower')!.rect.y)).toBe(start);
 const frames:NavigationSnapshot[]=[];
 for(const time of [1000,1033,1066,1100,1133,1166,1200,1500]){
  await page.evaluate(time=>window.navigationMotion.sample(time),time);
  await expect.poll(()=>page.evaluate(()=>window.navigationMotion.view.snapshot.time)).toBe(time);
  frames.push(await page.evaluate(()=>window.navigationMotion.view.snapshot));
  if(time===1100||time===1500)await page.locator('#motion-host').screenshot({path:`../out/navigation-motion-canvas-${time}.png`});
 }
 const middle=frames[3].parts.find(p=>p.id==='follower')!.rect.y;
 expect(middle).toBeGreaterThan(start);expect(middle).toBeLessThan(start+80);
 expect(frames[6].parts.find(p=>p.id==='follower')!.rect.y).toBe(start+80);
 const progress=frames.map(s=>s.hierarchyVisuals.find(p=>p.id==='parent')!.chevron!.progress);
 expect(new Set(progress).size).toBeGreaterThan(3);
 await page.evaluate(()=>{window.navigationMotion.sample(1600);window.navigationMotion.view.setExpanded('parent',false);window.navigationMotion.sample(1670);});
 await expect.poll(()=>page.evaluate(()=>window.navigationMotion.view.snapshot.time)).toBe(1670);
 const reversing=await page.evaluate(()=>window.navigationMotion.view.snapshot.parts.find(p=>p.id==='follower')!.rect.y);
 await page.evaluate(()=>window.navigationMotion.view.setExpanded('parent',true));
 await expect.poll(()=>page.evaluate(()=>window.navigationMotion.view.snapshot.expandedIds.includes('parent'))).toBe(true);
 expect(await page.evaluate(()=>window.navigationMotion.view.snapshot.parts.find(p=>p.id==='follower')!.rect.y)).toBeCloseTo(reversing,5);
 await page.evaluate(()=>window.navigationMotion.view.update({reducedMotion:true}));
 await expect.poll(()=>page.evaluate(()=>window.navigationMotion.view.snapshot.animating)).toBe(false);
 expect(await page.evaluate(()=>window.navigationMotion.view.snapshot.hierarchyVisuals.every(p=>p.offsetY===0))).toBe(true);
 mkdirSync('../out/navigation-motion-samples',{recursive:true});writeFileSync('../out/navigation-motion-samples/canvas.json',JSON.stringify({frames,progress},null,2));
 await page.evaluate(()=>{window.navigationMotion.sdk.dispose();document.getElementById('motion-host')!.remove();});
});

test('shared Canvas2D and WebGL2 NavigationView use the same hierarchy timeline',async({page})=>{
 await page.goto('/#home');await expect.poll(()=>page.evaluate(()=>!!window.gallery?.navigation)).toBe(true);
 const records=[];
 for(const backend of [RendererBackend.Canvas2D,RendererBackend.WebGL2]){
  records.push(await page.evaluate(async({backend,mode})=>{
   let time=1000;const SDK=window.gallery.sdk.constructor as typeof import('../src').WinUI;const sdk=await SDK.create({globalScrollbars:false,clock:()=>time});
   const host=document.createElement('div');host.id='shared-motion-host';host.style.cssText='position:fixed;left:0;top:0;width:800px;height:600px;z-index:99999';document.body.append(host);
   const scene=sdk.scene(host,{backend,root:{background:'#426786'}});const view=scene.root.navigationView({paneDisplayMode:mode,isBackButtonVisible:false,selectedId:'last',items:[{id:'parent',text:'Parent',children:[{id:'child',text:'Child'}]},{id:'last',text:'Last'}]},{width:800,height:600});
   await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));view.setExpanded('parent',true);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
   const sample=()=>view.snapshot.navigation!;const initial=sample();time=1100;view.configure({});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const middle=sample();time=1600;view.configure({});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const end=sample();
   const result={initial:initial.hierarchyVisuals,middle:middle.hierarchyVisuals,end:end.hierarchyVisuals,pane:end.paneMaterial};window.sharedMotion={sdk,host};return result;
  },{backend,mode:PaneDisplayMode.Left}));
  const screenshot=await page.locator('#shared-motion-host').screenshot();writeFileSync(`../out/navigation-motion-${backend}.png`,screenshot);
  const png=PNG.sync.read(screenshot);const pixel=(Math.round(500*1.25)*png.width+Math.round(30*1.25))*4;
  expect([...png.data.subarray(pixel,pixel+4)]).toEqual([66,103,134,255]);
  await page.evaluate(()=>{window.sharedMotion.sdk.dispose();window.sharedMotion.host.remove();});
 }
 expect(records[0]).toEqual(records[1]);expect(records[0].middle.some(v=>Math.abs(v.offsetY)>0.01)).toBe(true);
});

test('native-style rapid page navigation keeps the first exit and reveals the second exit',async({page})=>{
 await page.goto('/#home');await expect.poll(()=>page.evaluate(()=>!!window.gallery?.navigation)).toBe(true);
 const result=await page.evaluate(async({cache,transition})=>{
  let time=0;const SDK=window.gallery.sdk.constructor as typeof import('../src').WinUI;const sdk=await SDK.create({globalScrollbars:false,clock:()=>time});
  const frame=sdk.frame({resolvePage:page=>({cacheMode:cache,create:()=>page})});frame.navigate('A',{transition});time=1000;frame.navigate('B',{transition});time=1080;frame.navigate('C',{transition});const state=frame.snapshot;sdk.dispose();return state;
 },{cache:NavigationCacheMode.Disabled,transition:NavigationTransition.Entrance});
 expect(result.pages.map(p=>p.page)).toEqual(['A','B','C']);
 const b=result.pages.find(p=>p.page==='B')!.instance;expect(result.visuals.find(v=>v.instance===b)).toMatchObject({y:140,opacity:1});
});

test('pane recipes match the live native SDK and Acrylic color and fallback restoration animate',async({page})=>{
 await page.goto('/#home');await expect.poll(()=>page.evaluate(()=>!!window.gallery?.navigation)).toBe(true);
 const observed=await page.evaluate(async({mode,compact,themes})=>{
  let time=1000;const SDK=window.gallery.sdk.constructor as typeof import('../src').WinUI;const sdk=await SDK.create({globalScrollbars:false,clock:()=>time});
  const host=document.createElement('div');host.style.cssText='position:fixed;left:0;top:0;width:800px;height:600px;z-index:99999';document.body.append(host);
  const view=sdk.navigationView(host,{paneDisplayMode:compact,isPaneOpen:true,isBackButtonVisible:false});const wait=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  await wait();const recipes=[];for(const theme of themes){view.update({theme});await wait();recipes.push({theme,material:view.snapshot.paneMaterial});}
  view.update({paneDisplayMode:mode,theme:themes[0],expandedPaneMaterial:{tintColor:'#ffffff',tintOpacity:0.6,fallbackColor:'#f2f2f2'}});await wait();
  const before=view.snapshot.paneMaterial!;
  view.update({expandedPaneMaterial:{tintColor:'#2055ee',tintOpacity:0.6,fallbackColor:'#dadada'}});await wait();const start=view.snapshot.paneMaterial!;
  time=1250;view.update({});await wait();const middle=view.snapshot.paneMaterial!;
  time=1500;view.update({});await wait();const end=view.snapshot.paneMaterial!;
  view.update({isBackdropAvailable:false});time=1800;view.update({});await wait();const fallback=view.snapshot.paneMaterial!;
  view.update({isBackdropAvailable:true});await wait();const restoring=view.snapshot.paneMaterial!;time=1880;view.update({});await wait();const restored=view.snapshot.paneMaterial!;
  sdk.dispose();host.remove();return{recipes,before,start,middle,end,fallback,restoring,restored};
 },{mode:PaneDisplayMode.Left,compact:PaneDisplayMode.LeftCompact,themes:[ThemeMode.Light,ThemeMode.Dark]});
 const contract=JSON.parse(readFileSync('../references/navigation-motion-contract.json','utf8')) as {materials:{theme:string;overlay:{tintColor:string;tintOpacity:number;luminosityOpacity:number;fallbackColor:string}}[]};
 const rgba=(color:string)=>color.length===7?`${color.toLowerCase()}ff`:color.toLowerCase();
 for(const record of observed.recipes){const expected=contract.materials.find(m=>m.theme===record.theme)!.overlay;expect(record.material).not.toBeNull();
  const recipe=record.material!.recipe;expect(rgba(recipe.tintColor)).toBe(expected.tintColor);expect(recipe.tintOpacity).toBeCloseTo(expected.tintOpacity,6);expect(recipe.luminosityOpacity).toBeCloseTo(expected.luminosityOpacity,6);expect(rgba(recipe.fallbackColor)).toBe(expected.fallbackColor);
 }
 expect(observed.start.colors!.tint).toBe(observed.before.colors!.tint);expect(observed.middle.colors!.tint).not.toBe(observed.start.colors!.tint);expect(observed.end.colors!.tint).not.toBe(observed.middle.colors!.tint);
 expect(observed.fallback.weight).toBe(0);expect(observed.restoring.weight).toBe(0);expect(observed.restored.weight).toBeGreaterThan(0);expect(observed.restored.weight).toBeLessThan(1);
 writeFileSync('../out/navigation-motion-materials.json',JSON.stringify(observed,null,2));
});

test('native Acrylic fallback colors reach actual Canvas2D and WebGL2 pixels in both themes',async({page})=>{
 await page.goto('/#home');await expect.poll(()=>page.evaluate(()=>!!window.gallery?.navigation)).toBe(true);
 const cases=[];
 for(const backend of [RendererBackend.Canvas2D,RendererBackend.WebGL2])for(const theme of [ThemeMode.Light,ThemeMode.Dark]){
  const material=await page.evaluate(async({backend,theme,mode})=>{
   const SDK=window.gallery.sdk.constructor as typeof import('../src').WinUI;const sdk=await SDK.create({globalScrollbars:false});const host=document.createElement('div');host.id='shared-motion-host';host.style.cssText='position:fixed;left:0;top:0;width:800px;height:600px;z-index:99999';document.body.append(host);
   const scene=sdk.scene(host,{backend,theme,root:{background:'#426786'}});const nav=scene.root.navigationView({paneDisplayMode:mode,isPaneOpen:true,isBackdropAvailable:false},{width:800,height:600});
   await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));window.sharedMotion={sdk,host};return nav.snapshot.navigation!.paneMaterial;
  },{backend,theme,mode:PaneDisplayMode.LeftCompact});
  const buffer=await page.locator('#shared-motion-host').screenshot();writeFileSync(`../out/navigation-motion-fallback-${backend}-${theme}.png`,buffer);
  const png=PNG.sync.read(buffer),index=(Math.round(500*1.25)*png.width+Math.round(200*1.25))*4;
  const pixel=[...png.data.subarray(index,index+4)];expect(pixel).toEqual(theme===ThemeMode.Light?[249,249,249,255]:[44,44,44,255]);cases.push({backend,theme,pixel,material});
  await page.evaluate(()=>{window.sharedMotion.sdk.dispose();window.sharedMotion.host.remove();});
 }
 writeFileSync('../out/navigation-motion-fallback-pixels.json',JSON.stringify(cases,null,2));
});
