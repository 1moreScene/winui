import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const browser=read('out/navigation-composition-motion.json'),native=read('out/navigation-composition-browser/results.json');
const wasm=hash('packages/winui-wasm/src/wasm/winui_bg.wasm');
assert.equal(browser.stats.unexpected,0);assert.equal(browser.stats.expected,46);
assert.deepEqual(native.errors,[]);assert.equal(native.geometry.length,30);assert.equal(native.interactions.length,22);assert.equal(native.wasmSha256,wasm);
assert.equal(read('packages/winui-wasm/src/wasm/build-stamp.json').sha256,wasm);
function passed(path){const text=readFileSync(path,'utf8');assert(!text.includes('FAILED'),path);return [...text.matchAll(/test result: ok\. (\d+) passed/g)].reduce((n,m)=>n+Number(m[1]),0);}
const live=readFileSync('out/navigation-live-browser.jsonl','utf8').trim().split('\n').map(JSON.parse).filter(row=>!row.webdriver&&row.kind==='click');
const actual=live.filter(row=>row.build===wasm&&row.samples.some(s=>s.width>49&&s.width<319&&s.frameX>49&&s.frameX<319));
assert(actual.length,'Require the actual user browser to present intermediate pane and Frame positions');
const summary=rows=>rows.map(row=>({build:row.build,viewport:row.viewport,reducedMotion:row.reducedMotion,
 distinctPaneWidths:new Set(row.samples.map(s=>s.width)).size,distinctFramePositions:new Set(row.samples.map(s=>s.frameX)).size,
 positions:row.samples.filter((s,i)=>!i||s.width!==row.samples[i-1].width).map(s=>({at:s.at,width:s.width,x:s.frameX}))}));
const traces=Object.fromEntries([1440,1528,1527].flatMap((width,i)=>['home','navigation-view'].map(route=>{
 const size=`${width}x${[1100,698,697][i]}`;return [`${route}/${size}`,read(`out/navigation-pane-motion/top-${route}-${size}-samples.json`)];
})));
const record={date:'2026-11-09',status:'passed',wasmSha256:wasm,
 cause:'At the actual 1528x698 viewport and DPR 1.25, NavigationView receives a 650 DIP Measure constraint but arranges at 650.4 DIP. Measure treated this difference as a viewport resize every frame and snapped the pane animation. Earlier integer-physical-size tests missed it.',
 fix:'Measure predicts content constraints without changing ActualSize, adaptive state or timelines. Only Arrange adapts to actual size changes. Content is remeasured if a nested rounded slot requires a different width.',
 actualBrowser:{userConfirmedVisibleMotion:true,before:summary(live.filter(row=>row.build!==wasm&&new Set(row.samples.map(s=>s.width)).size<=2).slice(0,2)),after:summary(actual)},
 replayTraces:traces,realClockTrace:read('out/navigation-pane-motion/top-real-clock-1528x698.json'),validation:{fullRustPassed:passed('out/navigation-fractional-all-rust.log'),targetedRustPassed:passed('out/navigation-fractional-rust-after.log'),browserPassed:46,
 generatedViewportTestPassed:passed('out/navigation-fractional-generated.log'),generatedViewportCases:32,repeatedLayoutInvariants:384,
 nativeGeometryCases:30,publicInteractions:22,maxPhysicalError:Math.max(...native.geometry.flatMap(row=>row.differences.map(d=>d.maxPhysicalError))),
 regressionBefore:'out/navigation-fractional-rust-before.log and out/navigation-fractional-browser-before.log both reproduced endpoint snapping',
 nestedFractionalDpiCases:8,typeScript:true,sdkDeclarations:true,controlOrigins:true,enumDrift:true,productionBuild:true},
 sources:Object.fromEntries(['src/navigation.rs','src/scene/navigation_view.rs','tests/navigation_pane_scene.rs','gallery/tests/navigation-pane-motion.spec.ts'].map(path=>[path,hash(path)]))};
writeFileSync('references/validation/navigation-fractional-pane.json',JSON.stringify(record,null,2)+'\n');
for(const path of ['references/validation/navigation-top-toggle.json','references/validation/navigation-performance.json']){
 const previous=read(path);previous.fractionalDpiFollowup={date:record.date,status:'passed',record:'references/validation/navigation-fractional-pane.json',wasmSha256:wasm};
 writeFileSync(path,JSON.stringify(previous,null,2)+'\n');
}
console.log(JSON.stringify({wasmSha256:wasm,actualBrowser:record.actualBrowser.after,validation:record.validation},null,2));
