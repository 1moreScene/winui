import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const require=createRequire(new URL('../gallery/package.json',import.meta.url));
const {chromium}=require('playwright');
const {PNG}=require('pngjs');
const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root));
const native=JSON.parse(read('out/accept-native/accept-timing.json'));
function analyze(frames,rect){
 const last=frames.at(-1).png,scale=last.width/240,white=[],blue=[];
 for(let y=Math.ceil(rect.y*scale);y<(rect.y+rect.height)*scale;y++)
  for(let x=Math.ceil(rect.x*scale);x<(rect.x+rect.width)*scale;x++){
   const i=(y*last.width+x)*4;
   if(last.data[i]>170&&last.data[i+1]>170&&last.data[i+2]>170)white.push(i);
   if(last.data[i]<60)blue.push(i);
  }
 if(!white.length||!blue.length)throw Error('Missing glyph/background mask');
 const sum=(png,mask)=>mask.reduce((total,i)=>total+png.data[i],0),full=sum(last,white);
 const samples=frames.map(({png,...frame})=>({...frame,whiteCoverage:sum(png,white)/full,backgroundRed:sum(png,blue)/blue.length})).filter(f=>f.backgroundRed<60);
 return{captureScale:scale,maskPixels:white.length,samples,first95Percent:samples.find(s=>s.whiteCoverage>=.95)};
}
const nativeCases=Object.fromEntries(Object.entries(native.cases).map(([name,frames])=>[name,analyze(frames.map(f=>({timeMs:f.startMs,endMs:f.endMs,png:PNG.sync.read(read(`out/accept-native/${f.name}.png`))})),{x:14,y:20,width:16,height:16})]));
const runtimeEvidence={...native,captureAnalysis:nativeCases,recordedAtUtc:new Date().toISOString(),dllSha256:createHash('sha256').update(read('out/native-probe-bin/Microsoft.UI.Xaml.Controls.dll')).digest('hex')};
writeFileSync(new URL('references/validation/native-accept-timing.json',root),JSON.stringify(runtimeEvidence,null,2)+'\n');
const browser=await chromium.launch({channel:'chrome'});
const results={};
try{
 for(const backend of['Canvas2D','WebGL2']){
  const page=await browser.newPage({viewport:{width:600,height:300},deviceScaleFactor:1.25});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/#checkbox');
  await page.evaluate(async backend=>{
   const a=await import('/src/index.ts');const clock={value:0};const sdk=await a.WinUI.create({clock:()=>clock.value});
   const host=document.createElement('div');host.id='timing';host.style.cssText='position:fixed;left:0;top:0;width:240px;height:96px;z-index:99999';document.body.append(host);
   const scene=sdk.scene(host,{backend:a.RendererBackend[backend],reducedMotion:false});
   const check=scene.root.checkBox({width:220,height:32,margin:[12,12,0,0],verticalAlignment:a.VerticalAlignment.Top});
   window.acceptTiming={clock,sdk,scene,check};
  },backend);
  await page.waitForFunction(()=>window.acceptTiming.scene.snapshot.nodes.length===2);
  await page.evaluate(()=>window.acceptTiming.check.update({isChecked:true}));
  const frames=[];mkdirSync(new URL('out/accept-timing/',root),{recursive:true});
  for(const timeMs of[0,50,100,150,180,190,200,220,260,320]){
   await page.evaluate(time=>window.acceptTiming.clock.value=time,timeMs);
   await page.waitForFunction(time=>window.acceptTiming.scene.snapshot.time===time,timeMs);
   const bytes=await page.locator('#timing').screenshot();
   writeFileSync(new URL(`out/accept-timing/${backend}-${timeMs}.png`,root),bytes);
   frames.push({timeMs,png:PNG.sync.read(bytes)});
  }
  if(errors.length)throw Error(errors.join('\n'));
  results[backend]=analyze(frames,{x:14,y:20,width:16,height:16});
  // Reject the old linear regression (95% near 320ms). Rasterization masks
  // differ; this is not a native present-time or pixel-equivalence threshold.
  if(results[backend].first95Percent.timeMs>260)throw Error(`${backend} retained slow/linear CheckBox easing`);
  await page.close();
 }
}finally{await browser.close();}
const comparison={recordedAtUtc:new Date().toISOString(),sliceDurationMs:native.segments.NormalOffToNormalOn.durationMs,easing:[.550000012,0,0,1],native:nativeCases,backends:results,acceptedPixelParity:false,acceptedExactPresentTiming:false,boundary:'Per-backend normalized settled-glyph mask coverage, not identical rasterization. Native foreground capture timestamps bracket compositor presentation; browser uses deterministic Rust time. Coalesced native case is a diagnostic sequence of attached-state setters, not OS pointer input.'};
writeFileSync(new URL('references/validation/accept-timing-comparison.json',root),JSON.stringify(comparison,null,2)+'\n');
console.log(JSON.stringify({native95Ms:nativeCases.normal.first95Percent.timeMs,browser95Ms:Object.fromEntries(Object.entries(results).map(([k,v])=>[k,v.first95Percent.timeMs]))}));

