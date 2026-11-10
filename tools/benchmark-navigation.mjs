import {chromium} from '../gallery/node_modules/@playwright/test/index.mjs';
import {writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const url=process.env.NAVIGATION_PERF_URL??'http://127.0.0.1:5413';
const name=process.argv[2]??'baseline';
mkdirSync('out/navigation-performance',{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});
const page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1.25});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
const wasmAsset=page.waitForResponse(response=>response.headers()['content-type']?.startsWith('application/wasm'));
const cold=performance.now();await page.goto(url+'/#home');
await page.waitForFunction(()=>!!window.gallery?.navigation,{timeout:120000});
const readyMs=performance.now()-cold;
const wasmSha256=createHash('sha256').update(await (await wasmAsset).body()).digest('hex');
await page.waitForTimeout(1200);
await page.evaluate(()=>{
 const root=window.gallery.navigation.scene;
 const result={frames:[],draws:[],root:root.handle,clones:[],measures:0,longTasks:[]};window.navPerf=result;
 const draw=root.draw.bind(root);root.draw=(...args)=>{const start=performance.now();const value=draw(...args);result.draws.push(performance.now()-start);return value;};
 const raw=window.gallery.navigation.scene.raw,frame=raw.scene_frame.bind(raw);
 raw.scene_frame=(...args)=>{const start=performance.now();const value=frame(...args);result.frames.push({id:args[0],ms:performance.now()-start,bytes:value.length});return value;};
 const clone=window.structuredClone;window.structuredClone=(...args)=>{const start=performance.now();const value=clone(...args);result.clones.push(performance.now()-start);return value;};
 const measure=CanvasRenderingContext2D.prototype.measureText;CanvasRenderingContext2D.prototype.measureText=function(...args){result.measures++;return measure.apply(this,args);};
 new PerformanceObserver(list=>result.longTasks.push(...list.getEntries().map(e=>({start:e.startTime,ms:e.duration})))).observe({type:'longtask',buffered:false});
});
const cdp=process.env.NAVIGATION_PROFILE==='0'?null:await page.context().newCDPSession(page);if(cdp){await cdp.send('Profiler.enable');await cdp.send('Profiler.start');}
const stages=[];
async function stage(label,action){
 const before=await page.evaluate(()=>({frames:window.navPerf.frames.length,draws:window.navPerf.draws.length,clones:window.navPerf.clones.length,measures:window.navPerf.measures}));
 const start=performance.now();await action();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));const actionMs=performance.now()-start;await page.waitForTimeout(500);
 const data=await page.evaluate(before=>({frames:window.navPerf.frames.slice(before.frames),draws:window.navPerf.draws.slice(before.draws),root:window.navPerf.root,clones:window.navPerf.clones.slice(before.clones),measures:window.navPerf.measures-before.measures,diagnostics:window.gallery.navigation.diagnostics,nodes:window.gallery.navigation.scene.snapshot.nodes.length,parts:window.gallery.navigation.snapshot.parts.length}),before);
 stages.push({label,actionMs,elapsedMs:performance.now()-start,...data});
}
await stage('hover',async()=>{for(let i=0;i<24;i++)await page.mouse.move(80,125+i*9);});
await stage('expand',async()=>{await page.evaluate(()=>{for(const item of window.gallery.navigation.properties.items??[])if(item.children?.length)window.gallery.navigation.setExpanded(item.id,true);});});
await stage('scroll',async()=>{await page.mouse.move(160,500);for(let i=0;i<20;i++){await page.mouse.wheel(0,i<12?70:-70);await page.waitForTimeout(20);}});
await stage('enter-button',async()=>{await page.evaluate(()=>{location.hash='#button';});await page.getByRole('heading',{name:'Button',exact:true}).waitFor();});
await stage('enter-navigation',async()=>{await page.evaluate(()=>{location.hash='#navigation-view';});await page.getByRole('heading',{name:'NavigationView',exact:true}).waitFor();});
await page.evaluate(()=>{for(const item of window.gallery.navigation.properties.items??[])if(item.children?.length)window.gallery.navigation.setExpanded(item.id,false);});
await page.mouse.move(160,500);await page.mouse.wheel(0,-10000);await page.waitForTimeout(500);
await stage('click-navigation',async()=>{await page.locator('#home-navigation [data-item-id="gallery-all"]').click();await page.getByRole('heading',{name:'All samples',exact:true}).waitFor();});
const profile=cdp?(await cdp.send('Profiler.stop')).profile:null;
const extra=await page.evaluate(()=>({longTasks:window.navPerf.longTasks,route:location.hash}));
const result={url,wasmSha256,profiled:!!cdp,readyMs,stages,...extra,errors};
writeFileSync(`out/navigation-performance/${name}.json`,JSON.stringify(result,null,2));
if(profile)writeFileSync(`out/navigation-performance/${name}.cpuprofile`,JSON.stringify(profile));
const quantile=(values,q)=>values.sort((a,b)=>a-b)[Math.floor((values.length-1)*q)]??0;
console.log(JSON.stringify({readyMs,stages:stages.map(s=>({label:s.label,actionMs:s.actionMs,elapsedMs:s.elapsedMs,frames:s.frames.length,wasmP50:quantile(s.frames.map(f=>f.ms),.5),wasmP95:quantile(s.frames.map(f=>f.ms),.95),rootWasmP95:quantile(s.frames.filter(f=>f.id===s.root).map(f=>f.ms),.95),drawP50:quantile([...s.draws],.5),drawP95:quantile([...s.draws],.95),bytes:quantile(s.frames.map(f=>f.bytes),.5),clones:s.clones.length,cloneMs:s.clones.reduce((a,b)=>a+b,0),measures:s.measures,nodes:s.nodes})),longTasks:extra.longTasks.length,errors},null,2));
await browser.close();
