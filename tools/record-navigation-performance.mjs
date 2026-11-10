import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const original=read('out/navigation-performance/baseline.json');
const production=read('out/navigation-performance/production.json');
const browser=read('out/navigation-composition-motion.json');
const consistency=read('out/navigation-composition-browser/results.json');
const published=read('packages/winui-wasm/src/wasm/build-stamp.json');
const paneBefore=read('out/navigation-performance/pane-before.json');
const overlayBefore=read('out/navigation-performance/pane-overlay-before.json').filter(row=>row.route==='pane-overlay');
const paneAfter=read('out/navigation-performance/pane-after.json');
assert.equal(production.profiled,false);assert.deepEqual(production.errors,[]);
assert.equal(browser.stats.unexpected,0);assert.equal(browser.stats.expected,39);
assert.deepEqual(consistency.errors,[]);assert.equal(consistency.interactions.length,22);assert.equal(consistency.geometry.length,30);
assert.equal(consistency.wasmSha256,production.wasmSha256);
assert.equal(published.sha256,production.wasmSha256);
assert.equal(createHash('sha256').update(readFileSync('packages/winui-wasm/src/wasm/winui_bg.wasm')).digest('hex'),production.wasmSha256);
assert.equal(paneAfter.length,6);for(const row of paneAfter)assert.equal(row.wasmSha256,production.wasmSha256);
const quantile=(values,q)=>values.sort((a,b)=>a-b)[Math.floor((values.length-1)*q)]??0;
const summarize=run=>({readyMs:run.readyMs,stages:run.stages.map(stage=>({label:stage.label,actionMs:stage.actionMs,elapsedMs:stage.elapsedMs,
 frames:stage.frames.length,wasmP50Ms:quantile(stage.frames.map(f=>f.ms),.5),wasmP95Ms:quantile(stage.frames.map(f=>f.ms),.95),
 rootDrawP50Ms:quantile([...(stage.draws??[])],.5),rootDrawP95Ms:quantile([...(stage.draws??[])],.95),
 medianStateBytes:quantile(stage.frames.map(f=>f.bytes),.5),cloneMs:stage.clones.reduce((a,b)=>a+b,0),cloneCalls:stage.clones.length,nodes:stage.nodes})),longTasks:run.longTasks.length});
const originalProfile=read('out/navigation-performance/baseline.cpuprofile');
const originalWasm=originalProfile.nodes.find(n=>n.callFrame.url?.includes('.wasm'))?.callFrame.url.match(/v=([a-f0-9]{64})/)?.[1];
const totalPassed=path=>[...readFileSync(path,'utf8').matchAll(/test result: ok\. (\d+) passed/g)].reduce((n,m)=>n+Number(m[1]),0);
for(const path of ['out/navigation-performance-all-rust.log','out/navigation-performance-final-rust.log'])assert(!readFileSync(path,'utf8').includes('FAILED'),path);
const summarizePane=rows=>rows.map(row=>{
 const root=row.frames.filter(frame=>frame.id===row.handle);
 const intervals=row.raf.slice(1).map((time,index)=>time-row.raf[index]);
 const endWidth=row.samples.at(-1)?.width;
 const end=row.samples.find((sample,index)=>index>0&&sample.width===endWidth&&row.samples.slice(0,index).some(s=>s.width!==endWidth))?.time??row.samples.at(-1)?.time;
 const motionRaf=row.raf.filter(time=>time>=row.samples[0]?.time&&time<=end);
 const motionIntervals=motionRaf.slice(1).map((time,index)=>time-motionRaf[index]);
 return {route:row.route,phase:row.phase,frames:row.frames.length,scenes:new Set(row.frames.map(frame=>frame.id)).size,
  rootFrames:root.length,rootWasmP50Ms:quantile(root.map(frame=>frame.ms),.5),rootWasmP95Ms:quantile(root.map(frame=>frame.ms),.95),
  rafP50Ms:quantile([...intervals],.5),rafP95Ms:quantile([...intervals],.95),motionRafP50Ms:quantile([...motionIntervals],.5),motionRafP95Ms:quantile([...motionIntervals],.95),distinctPaneWidths:new Set(row.samples.map(sample=>sample.width)).size};
});
const record={date:'2026-11-09',status:'passed',wasmSha256:production.wasmSha256,renderer:'Canvas2D',browser:'Chrome',viewport:[1440,960],dpr:1.25,
 originalFault:{wasmSha256:originalWasm,profiled:true,...summarize(original)},
 production:{profiled:false,...summarize(production)},
 pane:{profiled:false,before:summarizePane(paneBefore),overlayBefore:summarizePane(overlayBefore),after:summarizePane(paneAfter),
  windowMs:750,note:'rAF intervals cover the click plus 750 ms including settled frames. Compare moving width samples and WASM costs as well; this is not a guarantee that every animation frame meets 16.7 ms.'},
 build:{release:true,optLevel:3,lto:true,codegenUnits:1},
 measurementLimits:'Original fault trace used the CPU Profiler; production timings do not. Preserve both and do not treat their timing ratio as an isolated code speedup. Machine load and browser caches affect timings.',
 validation:{fullRustPassed:totalPassed('out/navigation-performance-all-rust.log'),finalTargetedRustPassed:totalPassed('out/navigation-performance-final-rust.log'),browserPassed:browser.stats.expected,
 nativeGeometryCases:consistency.geometry.length,interactions:consistency.interactions.length,geometryComparisons:consistency.geometry.reduce((n,row)=>n+(row.differences?.length??0),0),
 maxPhysicalError:Math.max(...consistency.geometry.flatMap(row=>row.differences.map(part=>part.maxPhysicalError))),errors:consistency.errors},
 changes:['exact Rust property-value cache with full public snapshot hydration','control-scoped detached subscriptions','paint-only hover/indicator/material/scrollbar animation updates','cached compact control defaults, checked for all 116 kinds','no default ViewProperties allocation for ordinary ancestors','retained host child order and navigation rectangles','unchanged host policy submissions do not invalidate layout','collapsed source formatting starts when visible','coalesced offscreen fixed-size surface resizes with explicit-read/input refresh','private decorative source nodes stay in Rust without redundant DOM','source root/item template arrangement is no longer duplicated','Frame transforms update known scrollbars without whole-document scans','discrete inline content width plus Rust animated translation instead of page reflow','fixed Acrylic PaneRoot surface plus animated clip, with shadow after backdrop sampling'],
 evidence:['tools/benchmark-navigation.mjs','tools/benchmark-navigation-pane.mjs','tests/navigation_performance.rs','tests/navigation_pane_scene.rs','gallery/tests/navigation-performance.spec.ts','gallery/tests/navigation-pane-motion.spec.ts','out/navigation-performance/production.json','out/navigation-performance/pane-after.json','out/navigation-composition-motion.json','out/navigation-composition-browser/results.json'],
 sources:Object.fromEntries(['src/wasm.rs','src/render.rs','src/navigation.rs','src/scene/mod.rs','src/scene/input.rs','src/scene/navigation_view.rs','src/scene/properties.rs','src/scene/view_controls.rs','packages/winui-wasm/src/scene.ts','gallery/src/HomePage.tsx','gallery/src/sample-pages.css','packages/winui-wasm/src/frame.ts','packages/winui-wasm/src/global-scrollbars.ts','gallery/src/SourceCode.tsx','references/winui/SplitView_themeresources.xaml'].map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')]))};
writeFileSync('references/validation/navigation-performance.json',JSON.stringify(record,null,2)+'\n');
for(const path of ['references/validation/navigation-composition.json','references/validation/navigation-pane-motion.json']){
 const previous=read(path);previous.performanceFollowup={date:record.date,status:record.status,record:'references/validation/navigation-performance.json',wasmSha256:record.wasmSha256};
 writeFileSync(path,JSON.stringify(previous,null,2)+'\n');
}
console.log(JSON.stringify({wasmSha256:record.wasmSha256,validation:record.validation,production:record.production},null,2));
