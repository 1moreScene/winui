import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const browser=read('out/navigation-composition-motion.json'),native=read('out/navigation-composition-browser/results.json');
const profiles=read('references/navigation-motion-contract.json').pane;
const pane=read('out/navigation-performance/top-toggle-after.json');
const wasm=hash('packages/winui-wasm/src/wasm/winui_bg.wasm');
assert.equal(browser.stats.unexpected,0);assert.equal(browser.stats.expected,41);
assert.deepEqual(native.errors,[]);assert.equal(native.geometry.length,30);assert.equal(native.interactions.length,22);assert.equal(native.wasmSha256,wasm);
assert.equal(read('packages/winui-wasm/src/wasm/build-stamp.json').sha256,wasm);assert(pane.every(row=>row.wasmSha256===wasm));
function passed(path){const text=readFileSync(path,'utf8');assert(!text.includes('FAILED'),path);return [...text.matchAll(/test result: ok\. (\d+) passed/g)].reduce((n,m)=>n+Number(m[1]),0);}
const sources=['src/navigation.rs','src/navigation_motion.rs','tools/extract-navigation-motion.mjs','references/navigation-motion-contract.json','references/winui/SplitView_themeresources.xaml','tests/navigation_pane_scene.rs','gallery/tests/navigation-pane-motion.spec.ts'];
const record={date:'2026-11-09',status:'passed',wasmSha256:wasm,
 cause:'NavigationView incorrectly reused the Overlay 120 ms close curve for Expanded/CompactInline. It had already closed about 68% by 16 ms, so a few delayed frames looked like a snap.',
 fix:'Select the exact left-side RootSplitView source track per adaptive display mode. CompactInline uses 200 ms in both directions with (0,0.35,0.15,1), including OpenInlineLeft -> ClosedCompactLeft. Retarget samples the previous curve before assigning the new one.',
 profiles,actualTopButtonSamples:Object.fromEntries(['home','navigation-view'].map(route=>[route,read(`out/navigation-pane-motion/top-${route}-samples.json`)])),
 validation:{fullRustPassed:passed('out/navigation-top-toggle-all-rust.log'),targetedRustPassed:passed('out/navigation-top-toggle-rust.log'),browserPassed:41,
 nativeGeometryCases:30,nativeGeometryComparisons:native.geometry.reduce((n,row)=>n+row.differences.length,0),publicInteractions:22,
 maxPhysicalError:Math.max(...native.geometry.flatMap(row=>row.differences.map(d=>d.maxPhysicalError))),
 topButton:'Actual Gallery pointer clicks on Home and NavigationView pages; rendered Frame x matches Rust at 0/16/50/100/160/199/200 ms, then real pointer reversal. Canvas2D/WebGL2 and real Acrylic pixels remain covered.',
 typeScript:true,sdkDeclarations:true,controlOrigins:true,enumDrift:true,productionBuild:true},
 build:{release:true,optLevel:3,lto:true,codegenUnits:1},
 evidence:['out/navigation-top-toggle-all-rust.log','out/navigation-top-toggle-rust.log','out/navigation-composition-motion.json','out/navigation-composition-browser/results.json','out/navigation-performance/top-toggle-after.json'],
 sources:Object.fromEntries(sources.map(path=>[path,hash(path)]))};
writeFileSync('references/validation/navigation-top-toggle.json',JSON.stringify(record,null,2)+'\n');
for(const path of ['references/validation/navigation-performance.json','references/validation/navigation-pane-motion.json']){
 const previous=read(path);previous.topToggleFollowup={date:record.date,status:'passed',record:'references/validation/navigation-top-toggle.json',wasmSha256:wasm};
 writeFileSync(path,JSON.stringify(previous,null,2)+'\n');
}
console.log(JSON.stringify({wasmSha256:wasm,validation:record.validation},null,2));
