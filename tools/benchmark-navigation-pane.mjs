import {chromium} from '../gallery/node_modules/@playwright/test/index.mjs';
import {writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1.25});
const url=process.env.NAVIGATION_PERF_URL??'http://127.0.0.1:5413',name=process.argv[2]??'pane-before';
let wasmSha256;
const wasmAsset=page.waitForResponse(response=>response.headers()['content-type']?.startsWith('application/wasm'));
const results=[];
for(const route of ['#home','#navigation-view','pane-overlay']){
 if(route==='pane-overlay'){
  await page.goto(url+'/composition.html');await page.waitForFunction(()=>!!window.composition?.ui);
  await page.evaluate(()=>{const {ui,SDK} =window.composition;window.composition.scene.dispose();const scene=ui.scene(document.getElementById('host'),{theme:SDK.ThemeMode.Light});
   const nav=scene.root.navigationView({paneDisplayMode:SDK.PaneDisplayMode.LeftCompact,isPaneOpen:true,isBackButtonVisible:SDK.NavigationViewBackButtonVisible.Collapsed,items:[{id:'a',text:'First',icon:'\uE80F'},{id:'b',text:'Second',icon:'\uE768'}]});
   const frame=nav.content.sceneFrame({pages:[{key:'page',content:{kind:SDK.NodeKind.Canvas,properties:{background:'#0088cc'},children:[{kind:SDK.NodeKind.Rectangle,properties:{canvasLeft:0,width:90,height:540,fill:'#ec3b55'}},{kind:SDK.NodeKind.Rectangle,properties:{canvasLeft:180,width:90,height:540,fill:'#36b96f'}}]}}]});
   frame.navigate('page',{transition:SDK.NavigationTransition.Suppress});scene.render();window.gallery={navigation:nav.asView()};
  });
 }else{await page.goto(url+'/'+route);await page.waitForFunction(()=>!!window.gallery?.navigation);if(route.includes('navigation'))await page.waitForFunction(()=>!!window.gallery.views?.[7]);}
 if(!wasmSha256)wasmSha256=createHash('sha256').update(await (await wasmAsset).body()).digest('hex');
 await page.waitForTimeout(800);
 await page.evaluate(()=>{const view=window.gallery.navigation,scene=view.scene,raw=scene.raw,frame=raw.scene_frame.bind(raw);const probe={frames:[],samples:[],raf:[],active:false,handle:scene.handle};window.panePerf=probe;
 raw.scene_frame=(...args)=>{const start=performance.now(),value=frame(...args);if(probe.active)probe.frames.push({id:args[0],time:start,ms:performance.now()-start,width:args[2],height:args[3]});return value;};
 view.onSnapshot(s=>{if(probe.active)probe.samples.push({time:performance.now(),width:s.pane.width,passes:scene.state.layoutPasses});});
 const raf=t=>{if(probe.active)probe.raf.push(t);requestAnimationFrame(raf);};requestAnimationFrame(raf);
 });
 for(const phase of ['close','open']){
  await page.evaluate(()=>{const p=window.panePerf;p.frames=[];p.samples=[];p.raf=[];p.active=true;});
  if(route==='pane-overlay')await page.locator('#host [data-item-id="$toggle"]').click();else await page.getByRole('button',{name:'Toggle navigation pane',exact:true}).click();await page.waitForTimeout(750);
  const value=await page.evaluate(()=>{const p=window.panePerf;p.active=false;return {frames:p.frames,samples:p.samples,raf:p.raf,handle:p.handle};});
  results.push({route,phase,wasmSha256,...value});
 }
}
await browser.close();mkdirSync('out/navigation-performance',{recursive:true});writeFileSync(`out/navigation-performance/${name}.json`,JSON.stringify(results,null,2));
const q=(a,p)=>a.sort((x,y)=>x-y)[Math.floor((a.length-1)*p)]??0;
console.log(JSON.stringify(results.map(r=>{const intervals=r.raf.slice(1).map((t,i)=>t-r.raf[i]),root=r.frames.filter(f=>f.id===r.handle);return {route:r.route,phase:r.phase,frames:r.frames.length,scenes:new Set(r.frames.map(f=>f.id)).size,rootFrames:root.length,rootP50Ms:q(root.map(f=>f.ms),.5),rootP95Ms:q(root.map(f=>f.ms),.95),rafP50Ms:q(intervals,.5),rafP95Ms:q(intervals,.95),widths:r.samples.map(s=>Math.round(s.width)),layoutPasses:(r.samples.at(-1)?.passes??0)-(r.samples[0]?.passes??0)}}),null,2));
