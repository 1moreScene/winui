import {chromium} from '@playwright/test';
import {writeFileSync,mkdirSync} from 'node:fs';
const label=process.argv[2]??'before';
const baseURL=process.argv[3]??'http://127.0.0.1:5406';
const browser=await chromium.launch({channel:'chrome'});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1.25});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.longTasks=[];new PerformanceObserver(list=>window.longTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask',buffered:true});});
 const cdp=await page.context().newCDPSession(page);await cdp.send('Profiler.enable');await cdp.send('Profiler.start');const start=Date.now();
 await page.goto(baseURL+'/#items-repeater');await page.waitForFunction(()=>Object.keys(window.repeaterScenes??{}).length===7);await page.waitForTimeout(1200);
 const state=()=>page.evaluate(()=>Object.fromEntries(Object.entries(window.repeaterScenes).map(([key,s])=>{const n=s.snapshot;return[key,{diagnostics:s.diagnostics,nodes:n.nodes.length,animating:n.animating,layoutPasses:n.layoutPasses,repeaters:n.nodes.filter(n=>n.repeater).map(n=>({count:n.repeater.realized.length,total:n.repeater.totalCount,extent:n.repeater.extent})),host:s.element?.getBoundingClientRect().toJSON()}];})));
 const first=await state();await page.waitForTimeout(1600);const idle=await state();
 await page.locator('#repeater-animated').scrollIntoViewIfNeeded();await page.waitForTimeout(150);await page.locator('#repeater-animated').getByRole('button',{name:'Blue',exact:true}).click();await page.waitForTimeout(400);const active=await state();
 const {profile}=await cdp.send('Profiler.stop');const nodes=new Map(profile.nodes.map(n=>[n.id,n]));const samples=new Map();profile.samples?.forEach((id,i)=>samples.set(id,(samples.get(id)??0)+(profile.timeDeltas?.[i]??0)));
 const top=[...samples].map(([id,us])=>({ms:us/1000,name:nodes.get(id).callFrame.functionName,url:nodes.get(id).callFrame.url,line:nodes.get(id).callFrame.lineNumber})).sort((a,b)=>b.ms-a.ms).slice(0,30);
 const result={label,elapsed:Date.now()-start,errors,first,idle,active,top,longTasks:await page.evaluate(()=>window.longTasks)};mkdirSync('../out',{recursive:true});writeFileSync(`../out/repeater-profile-${label}.json`,JSON.stringify(result,null,2));writeFileSync(`../out/repeater-profile-${label}.cpuprofile`,JSON.stringify(profile));await page.locator('#repeater-animated').screenshot({path:`../out/repeater-animated-${label}.png`});
 console.log(JSON.stringify({elapsed:result.elapsed,errors,scenes:Object.fromEntries(Object.keys(first).map(key=>[key,{frames:first[key].diagnostics.frames,idleFrames:idle[key].diagnostics.frames-first[key].diagnostics.frames,nodes:first[key].nodes,animating:idle[key].animating,p95:active[key].diagnostics.frameP95Ms,layoutPasses:idle[key].layoutPasses}])),longTasks:result.longTasks,top:top.slice(0,12)},null,2));
}finally{await browser.close();}
