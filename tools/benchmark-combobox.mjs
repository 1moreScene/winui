import {chromium} from '../gallery/node_modules/playwright/index.mjs';
import {writeFileSync} from 'node:fs';
const output=process.argv[2]??'out/combobox-performance.json',url=process.argv[3]??'http://127.0.0.1:5296';
const browser=await chromium.launch({channel:'chrome'});const rows=[];
try{
 for(const backend of ['Canvas2D','WebGL2'])for(const count of [40,10000]){
  const page=await browser.newPage({viewport:{width:1500,height:900},deviceScaleFactor:1.25});
  await page.goto(url+'/#combo-box');await page.getByRole('combobox',{name:'Colors',exact:true}).waitFor();
  const result=await page.evaluate(async({backend,count})=>{
   const {WinUI}=await import('/src/index.ts');document.querySelector('#app').style.display='none';
   const host=document.createElement('div');host.style.cssText='position:fixed;inset:0;width:1400px;height:700px';document.body.append(host);
   const sdk=await WinUI.create({globalScrollbars:false}),scene=sdk.scene(host,{backend}),combo=scene.root.canvas().comboBox({width:240,maxDropDownHeight:280,items:Array.from({length:count},(_,i)=>`Item ${i}`),canvasLeft:24,canvasTop:100});combo.open();
   await new Promise(r=>setTimeout(r,950));
   const popup=scene.snapshot.nodes.find(n=>n.kind==='Flyout'&&n.composedOwner===combo.snapshot.id);
   const point={clientX:popup.world[4]+40,clientY:Math.max(4,Math.min(696,popup.world[5]+popup.rect.height/2))};
   const before=scene.diagnostics,times=[];let previous=performance.now(),middleOffset=0;
   for(let i=0;i<120;i++){await new Promise(requestAnimationFrame);const now=performance.now();times.push(now-previous);previous=now;host.querySelector('[role="option"]').dispatchEvent(new WheelEvent('wheel',{...point,deltaY:i<60?24:-24,bubbles:true,cancelable:true}));if(i===60)middleOffset=scene.snapshot.nodes.find(n=>n.kind==='ListView').scroll.verticalOffset;}
   await new Promise(requestAnimationFrame);
   const after=scene.diagnostics,snapshot=scene.snapshot;times.sort((a,b)=>a-b);
   const result={backend,count,buildVersion:WinUI.buildVersion,middleOffset,meanRenderMs:(after.averageFrameMs*after.frames-before.averageFrameMs*before.frames)/Math.max(1,after.frames-before.frames),p95FrameIntervalMs:times[Math.floor(times.length*.95)],frames:after.frames-before.frames,nodeCount:snapshot.nodes.length,snapshotBytes:JSON.stringify(snapshot).length,floatingSurface:snapshot.floatingSurface,diagnostics:after};
   if(result.frames<80||middleOffset<=0)throw new Error('Benchmark did not scroll the actual SDK list: '+JSON.stringify(result));
   scene.dispose();sdk.dispose();host.remove();return result;
  },{backend,count});rows.push(result);await page.close();
 }
 writeFileSync(output,JSON.stringify({scope:'Local headless Chrome, 120 real SDK wheel frames per case, 1400x700 DIP, DPR 1.25; not a cross-device frame-rate guarantee.',rows},null,2)+'\n');
 console.log(JSON.stringify(rows.map(({backend,count,meanRenderMs,p95FrameIntervalMs,snapshotBytes})=>({backend,count,meanRenderMs,p95FrameIntervalMs,snapshotBytes})),null,2));
}finally{await browser.close();}
