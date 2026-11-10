import fs from 'node:fs';
import crypto from 'node:crypto';
const hash=path=>crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');
const browser=JSON.parse(fs.readFileSync('out/navigation-composition-motion.json','utf8'));
const composition=JSON.parse(fs.readFileSync('out/navigation-composition-browser/results.json','utf8'));
if(browser.stats.unexpected||browser.stats.expected!==16)throw new Error('Pane browser regression did not pass');
if(composition.errors.length||composition.interactions.length!==22)throw new Error('Composition regression did not pass');
const rust=fs.readFileSync('out/navigation-pane-after.log','utf8');
const suites=[...rust.matchAll(/test result: (\w+)\. (\d+) passed; (\d+) failed;/g)];
if(suites.some(m=>Number(m[3])))throw new Error('Navigation Rust regression failed');
const wasm=hash('out/navigation-composition-wasm/winui_bg.wasm');
if(wasm!==composition.wasmSha256||wasm!==hash('packages/winui-wasm/src/wasm/winui_bg.wasm'))throw new Error('Gallery differs from the verified build');
const sources=['src/scene/layout.rs','src/scene/navigation_view.rs','src/navigation.rs','src/model.rs','src/render.rs','tests/navigation_pane_scene.rs','gallery/tests/navigation-pane-motion.spec.ts'];
const pixels=Object.fromEntries(['Canvas2D','WebGL2'].flatMap(backend=>['Light','Dark'].map(theme=>[`${backend}-${theme}`,JSON.parse(fs.readFileSync(`out/navigation-pane-motion/${backend}-${theme}-pixels.json`,'utf8'))])));
const bounds=composition.geometry.flatMap(row=>row.differences);
const report={
 date:'2026-11-09',status:'passed',
 causes:['Two Arrange paths reset the pane animation every frame.','Logical IsPaneOpen changed the brush and stacking before closing animation finished.','Direct inherited policy assignment bypassed the Acrylic material timeline.'],
 fixes:['Only the template executor binds policies; adapt runs on viewport changes.','Closing keeps the overlay recipe/color track and paints above Page until the visual phase ends.','Fallback is immediate; restored material fades in through the existing 167 ms track.','Changing SelectsOnInvoked on a selected item is valid; suppressed API selection is reverted like native ChangeSelection.'],
 timings:{openMs:350,closeMs:120,materialRestoreMs:167,curve:[0.1,0.9,0.2,1]},
 validation:{beforeFix:'out/navigation-pane-before.log: three regressions reproduced',rustPassed:suites.reduce((sum,m)=>sum+Number(m[2]),0),newRustCases:4,rustLog:'out/navigation-pane-after.log',browserPassed:16,browserReport:'out/navigation-composition-motion.json',actualPointerTrace:'out/navigation-pane-motion/gallery-pointer.json',actualPixels:pixels,geometryCases:composition.geometry.length,geometryComparisons:bounds.length,maxPhysicalPixelError:Math.max(...bounds.map(d=>d.maxPhysicalError)),publicApiInteractions:22,compositionReport:'out/navigation-composition-browser/results.json',typescriptStrict:true,sdkDeclarations:true,origins:true,enumDrift:true,productionBuild:true},
 build:{wasmSha256:wasm,release:true,optLevel:1,lto:false,codegenUnits:16,galleryArtifact:'gallery/dist',preview:'http://127.0.0.1:5413/#navigation-view'},
 scope:'Same pinned SDK/Gallery baseline. External DOM still uses resource fallback, not synthetic cross-surface blur.',
 workspaceRegression:{log:'out/navigation-pane-rust-full.log',passed:474,failed:1,failure:'table_view::frozen_column_uses_scroll_compensation_and_header_stays_fixed',note:'Full run before selection-suppression follow-up; NavigationView targeted suite was rerun afterwards.'},
 sources:sources.map(path=>({path,sha256:hash(path)})),
};
fs.writeFileSync('references/validation/navigation-pane-motion.json',JSON.stringify(report,null,2)+'\n');
const previous=JSON.parse(fs.readFileSync('references/validation/navigation-composition.json','utf8'));
previous.followup={date:report.date,status:'Pane motion/material regression fixed',record:'references/validation/navigation-pane-motion.json',wasmSha256:wasm};
fs.writeFileSync('references/validation/navigation-composition.json',JSON.stringify(previous,null,2)+'\n');
console.log(JSON.stringify({rust:report.validation.rustPassed,browser:16,composition:22,wasm},null,2));
