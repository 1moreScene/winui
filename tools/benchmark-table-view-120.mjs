import {chromium} from '../gallery/node_modules/@playwright/test/index.mjs';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const requestedLabel=process.argv[2]??'baseline';
const runs=requestedLabel==='pair'?[
 {label:'paired-before-1',artifact:'out/table-view-sdk-final'},
 {label:'paired-after-1',artifact:'out/table-view-120-final'},
 {label:'paired-after-2',artifact:'out/table-view-120-final'},
 {label:'paired-before-2',artifact:'out/table-view-sdk-final'},
]:[{label:requestedLabel,artifact:process.env.TABLE_VIEW_ARTIFACT}];
const hz=Number(process.env.TABLE_VIEW_HZ??120),interval=1000/hz;
const url=process.env.TABLE_VIEW_PERF_URL??'http://127.0.0.1:5173';
const executablePath=process.env.TABLE_VIEW_CHROME_SHELL??`${process.env.LOCALAPPDATA}/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-win64/chrome-headless-shell.exe`;
mkdirSync('out/table-view-120',{recursive:true});
const args=['--enable-begin-frame-control','--run-all-compositor-stages-before-draw',...(process.env.TABLE_VIEW_GPU==='software'?[]:['--enable-gpu'])];
const browser=await chromium.launch({executablePath,headless:true,args});
try {for(const {label,artifact} of runs){
const page=await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1.25});
await page.routeWebSocket(/^ws:\/\/127\.0\.0\.1:\d+\//,()=>{});
if(artifact){
 const dir=resolve(artifact);
 await page.route('**/src/wasm/winui.js*',route=>route.fulfill({body:readFileSync(resolve(dir,'winui.js')),contentType:'text/javascript'}));
 await page.route('**/src/wasm/winui_bg.wasm*',route=>new URL(route.request().url()).searchParams.has('url')?route.continue():route.fulfill({body:readFileSync(resolve(dir,'winui_bg.wasm')),contentType:'application/wasm'}));
}
const cdp=await page.context().newCDPSession(page),errors=[];page.on('pageerror',e=>errors.push(String(e)));
const browserCdp=await browser.newBrowserCDPSession();const gpuInitial=(await browserCdp.send('SystemInfo.getInfo')).gpu;
let running=true;const begins=[];
const pump=(async()=>{let deadline=performance.now();while(running){const now=performance.now();if(deadline>now)await new Promise(r=>setTimeout(r,deadline-now));const start=performance.now();try{await cdp.send('HeadlessExperimental.beginFrame',{interval});begins.push({start,ms:performance.now()-start});}catch(e){if(running)throw e;}deadline+=interval;if(performance.now()-deadline>interval)deadline=performance.now();}})();
try {
 const wasm=page.waitForResponse(r=>r.headers()['content-type']?.startsWith('application/wasm'));
 await page.goto(url+'/#table-view');await page.waitForFunction(()=>window.tableViewControls?.large?.tableSnapshot?.totalCount===10000);
 const bytes=await (await wasm).body(),wasmSha256=createHash('sha256').update(bytes).digest('hex');
 writeFileSync(`out/table-view-120/${label}.wasm`,bytes);
 await page.waitForTimeout(1000);
 const gpu=(await browserCdp.send('SystemInfo.getInfo')).gpu;
 await page.evaluate(()=>{
  const data={raf:[],draws:[],frames:[],inputs:[],longTasks:[]};window.table120=data;
  const scenes=window.tableViewScenes,raw=scenes.large.raw,frame=raw.scene_frame.bind(raw),input=raw.scene_input.bind(raw);
  raw.scene_frame=(...args)=>{const start=performance.now(),value=frame(...args);const marker='"rustFrameTimings":',at=value.lastIndexOf(marker);let phases=null;if(at>=0){const begin=at+marker.length;phases=JSON.parse(value.slice(begin,value.indexOf('}',begin)+1));}data.frames.push({id:args[0],ms:performance.now()-start,bytes:value.length,phases});return value;};
  raw.scene_input=(...args)=>{const start=performance.now(),value=input(...args);data.inputs.push({id:args[0],ms:performance.now()-start});return value;};
  for(const [key,scene] of Object.entries(scenes)){const draw=scene.draw.bind(scene);scene.draw=(...args)=>{const start=performance.now(),value=draw(...args),state=scene.state,table=state.nodes.find(n=>n.table)?.table;data.draws.push({key,ms:performance.now()-start,time:state.time,offset:table?.scroll?.verticalOffset,motion:table?.motion,retainedHits:state.backend?.retainedRasterHits,vectorHits:state.backend?.vectorRasterHits});return value;};}
  const tick=t=>{data.raf.push(t);requestAnimationFrame(tick);};requestAnimationFrame(tick);
  new PerformanceObserver(list=>data.longTasks.push(...list.getEntries().map(e=>({start:e.startTime,ms:e.duration})))).observe({type:'longtask',buffered:false});
 });
 const stages=[];
 async function stage(name,action){
  const first=await page.evaluate(()=>({raf:table120.raf.length,draws:table120.draws.length,frames:table120.frames.length,inputs:table120.inputs.length}));
  const actionData=await action();await page.waitForTimeout(850);
  stages.push({name,action:actionData,...await page.evaluate(first=>({raf:table120.raf.slice(first.raf),draws:table120.draws.slice(first.draws),frames:table120.frames.slice(first.frames),inputs:table120.inputs.slice(first.inputs)}),first)});
 }
 const keys=process.env.TABLE_VIEW_INCLUDE_GROUPING==='1'?['editing','large','grouping']:['editing','large'];
 for(const key of keys){
  if(key==='grouping')await page.locator('#table-grouping').getByRole('checkbox',{name:'10,000 grouped rows',exact:true}).check();
  await page.locator('#table-'+key).scrollIntoViewIfNeeded();await page.waitForTimeout(200);
  await stage(key+'-sort',()=>page.evaluate(key=>{const start=performance.now();window.tableViewControls[key].sort('age',window.tableViewControls[key].tableSnapshot.sorts[0]?.direction==='Descending'?'Ascending':'Descending');return{actionMs:performance.now()-start};},key));
  await stage(key+'-wheel',async()=>{const b=await page.locator(key==='grouping'?'#table-grouping-runtime canvas':'#table-'+key+' canvas').first().boundingBox();await page.mouse.move(b.x+80,b.y+85);for(let i=0;i<12;i++){await page.mouse.wheel(0,25);await page.waitForTimeout(25);}});
  await page.evaluate(key=>{const s=window.tableViewScenes[key],body=s.state.nodes.find(n=>n.kind==='ScrollViewer'&&n.props.accessibleName==='Table rows');s.raw.scene_input(s.handle,JSON.stringify({kind:'scroll',id:body.id,x:null,y:0,zoom:null,animated:false}),s.clock());s.draw();},key);
  await page.waitForTimeout(100);
  await stage(key+'-scroll-impulse',()=>page.evaluate(key=>{const s=window.tableViewScenes[key],body=s.state.nodes.find(n=>n.kind==='ScrollViewer'&&n.props.accessibleName==='Table rows'),time=s.clock();s.raw.scene_input(s.handle,JSON.stringify({kind:'scroll',id:body.id,x:null,y:300,zoom:null,animated:true}),time);s.draw();return{time,from:0,to:300};},key));
  if(key==='editing'){
   await page.evaluate(()=>{const s=window.tableViewScenes.editing,body=s.snapshot.nodes.find(n=>n.kind==='ScrollViewer'&&n.props.accessibleName==='Table rows');s.raw.scene_input(s.handle,JSON.stringify({kind:'scroll',id:body.id,x:0,y:0,zoom:null,animated:false}),s.clock());s.draw();const table=window.tableViewControls.editing,row=table.tableSnapshot.viewKeys[5];table.beginEdit({row,column:'age'});});
   await page.waitForTimeout(350);
   await stage('editing-active-editor-wheel',async()=>{const b=await page.locator('#table-editing canvas').first().boundingBox();await page.mouse.move(b.x+80,b.y+85);for(let i=0;i<12;i++){await page.mouse.wheel(0,15);await page.waitForTimeout(25);}const editorRetained=await page.evaluate(()=>window.tableViewScenes.editing.snapshot.nodes.some(n=>n.kind==='NumberBox'));if(!editorRetained)throw new Error('Active editor was recycled; invalid performance fixture');return{rowIndex:5,column:'age',wheelCount:12,deltaY:15,editorRetained};});
   await page.evaluate(()=>window.tableViewControls.editing.cancelEdit());
  }
 }
 const q=(a,p)=>a.sort((a,b)=>a-b)[Math.floor((a.length-1)*p)]??0;
 const handles=await page.evaluate(()=>Object.fromEntries(Object.entries(window.tableViewScenes).map(([key,s])=>[key,s.handle])));
 const summary=stages.map(s=>{const key=s.name.split('-')[0],frames=s.frames.filter(v=>v.id===handles[key]),draws=s.draws.filter(v=>v.key===key),dt=s.raf.slice(1).map((t,i)=>t-s.raf[i]);return{name:s.name,frames:frames.length,drawP50:q(draws.map(v=>v.ms),.5),drawP95:q(draws.map(v=>v.ms),.95),wasmP95:q(frames.map(v=>v.ms),.95),budgetMisses:draws.filter(v=>v.ms>interval).length,rafMedian:q(dt,.5),rafP95:q(dt,.95),phases:Object.fromEntries(['layoutMs','displayListMs','paintMs','snapshotMs','previousSerializeMs'].map(key=>[key,q(frames.map(v=>v.phases?.[key]??0),.95)]))};});
 const extra=await page.evaluate(()=>({longTasks:table120.longTasks}));
 writeFileSync(`out/table-view-120/${label}.json`,JSON.stringify({url,requestedHz:hz,budgetMs:interval,driver:'Chromium Headless Shell CDP BeginFrame, real wall-clock pacing; not physical-monitor presentation acceptance',browser:browser.version(),args,gpu,gpuInitial,wasmSha256,handles,summary,stages,begins,...extra,errors},null,2));
 console.log(JSON.stringify({label,wasmSha256,stages:summary.map(s=>({name:s.name,p95:s.drawP95,misses:s.budgetMisses})),errors}));
} finally {running=false;await pump;await page.close();}
}} finally {await browser.close();}
