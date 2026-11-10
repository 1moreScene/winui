import {chromium} from '../gallery/node_modules/@playwright/test/index.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const name=process.argv[2]??'baseline';
const url=process.env.TABLE_VIEW_PERF_URL??'http://127.0.0.1:5173';
mkdirSync('out/table-view-performance',{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});
const page=await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1.25});
const errors=[];page.on('pageerror',error=>errors.push(String(error)));
const response=page.waitForResponse(r=>r.headers()['content-type']?.startsWith('application/wasm'));
await page.goto(url+'/#table-view');
await page.waitForFunction(()=>window.tableViewControls?.large?.tableSnapshot?.totalCount===10000);
const wasmSha256=createHash('sha256').update(await (await response).body()).digest('hex');
await page.waitForTimeout(1200);
await page.evaluate(()=>{
 const scenes=window.tableViewScenes;
 const data={frames:[],inputs:[],draws:[],raf:[],longTasks:[],scenes:Object.fromEntries(Object.entries(scenes).map(([k,s])=>[s.handle,k]))};window.tablePerf=data;
 const raw=scenes.large.raw,frame=raw.scene_frame.bind(raw),input=raw.scene_input.bind(raw);
 raw.scene_frame=(...args)=>{const t=performance.now(),value=frame(...args);data.frames.push({id:args[0],ms:performance.now()-t,bytes:value.length});return value;};
 raw.scene_input=(...args)=>{const t=performance.now(),value=input(...args);data.inputs.push({id:args[0],ms:performance.now()-t});return value;};
 for(const [key,scene] of Object.entries(scenes)){const draw=scene.draw.bind(scene);scene.draw=(...args)=>{const t=performance.now(),value=draw(...args);data.draws.push({key,ms:performance.now()-t});return value;};}
 const tick=t=>{data.raf.push(t);requestAnimationFrame(tick);};requestAnimationFrame(tick);
 new PerformanceObserver(list=>data.longTasks.push(...list.getEntries().map(e=>({start:e.startTime,ms:e.duration})))).observe({type:'longtask',buffered:false});
});
const cdp=process.env.TABLE_VIEW_PROFILE==='0'?null:await page.context().newCDPSession(page);
if(cdp){await cdp.send('Profiler.enable');await cdp.send('Profiler.start');}
const stages=[];
async function stage(label,action){
 const start=await page.evaluate(()=>({frames:tablePerf.frames.length,inputs:tablePerf.inputs.length,draws:tablePerf.draws.length,raf:tablePerf.raf.length}));
 await action();await page.waitForTimeout(900);
 const result=await page.evaluate(start=>({frames:tablePerf.frames.slice(start.frames),inputs:tablePerf.inputs.slice(start.inputs),draws:tablePerf.draws.slice(start.draws),raf:tablePerf.raf.slice(start.raf),diagnostics:Object.fromEntries(Object.entries(window.tableViewScenes).map(([k,s])=>[k,{...s.diagnostics,nodes:s.snapshot.nodes.length}]))}),start);
 stages.push({label,...result});
}
for(const key of ['editing','shaping','large']){
 await page.locator('#table-'+key).scrollIntoViewIfNeeded();
 await stage(key+'-hover',async()=>{const box=await page.locator('#table-'+key+' canvas').first().boundingBox();for(let i=0;i<24;i++)await page.mouse.move(box.x+70+(i%3)*45,box.y+48+(i%6)*38);});
 await stage(key+'-sort-animation',async()=>page.evaluate(key=>window.tableViewControls[key].sort('age'),key));
 await stage(key+'-wheel-animation',async()=>{const box=await page.locator('#table-'+key+' canvas').first().boundingBox();await page.mouse.move(box.x+80,box.y+80);for(let i=0;i<8;i++){await page.mouse.wheel(0,35);await page.waitForTimeout(30);}});
}
const profile=cdp?(await cdp.send('Profiler.stop')).profile:null;
const extra=await page.evaluate(()=>({longTasks:tablePerf.longTasks,scenes:tablePerf.scenes}));
writeFileSync(`out/table-view-performance/${name}.json`,JSON.stringify({url,wasmSha256,profiled:!!cdp,stages,...extra,errors},null,2));
if(profile)writeFileSync(`out/table-view-performance/${name}.cpuprofile`,JSON.stringify(profile));
const q=(values,p)=>values.sort((a,b)=>a-b)[Math.floor((values.length-1)*p)]??0;
console.log(JSON.stringify({wasmSha256,stages:stages.map(s=>{const intervals=s.raf.slice(1).map((t,i)=>t-s.raf[i]);return{label:s.label,frames:s.frames.length,wasmP50:q(s.frames.map(f=>f.ms),.5),wasmP95:q(s.frames.map(f=>f.ms),.95),inputP95:q(s.inputs.map(f=>f.ms),.95),drawP95:q(s.draws.map(f=>f.ms),.95),frameIntervalP95:q(intervals,.95),missedFrames:intervals.filter(t=>t>25).length,bytesP50:q(s.frames.map(f=>f.bytes),.5)};}),longTasks:extra.longTasks.length,errors},null,2));
await browser.close();
