import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const read=path=>JSON.parse(readFileSync(new URL(path,root),'utf8').replace(/^\uFEFF/,''));
const report=read('out/overlays-browser/results.json');
const tests=[];
function collect(suite){for(const spec of suite.specs??[])for(const test of spec.tests??[])tests.push({name:spec.title,status:test.status});for(const child of suite.suites??[])collect(child);}
for(const suite of report.suites)collect(suite);
const files=['src/scene/overlay_visual.rs','src/render.rs','src/gpu.rs','src/scene/overlays.rs','src/scene/slider.rs','src/scene/mod.rs','src/scene/input.rs','src/scene/layout.rs','src/scene/paint.rs','src/scene/scroll.rs','src/scene/properties.rs','src/resources.rs','packages/winui-wasm/src/scene.ts','packages/winui-wasm/src/react.tsx','gallery/src/OverlaysPage.tsx','gallery/src/App.tsx','gallery/src/ButtonPage.tsx','packages/winui-wasm/src/index.ts','references/api-enums.json','references/overlay-template.json','references/overlay-palettes.json','references/overlay-metrics.json','tests/overlays.rs','gallery/tests/overlays.spec.ts','gallery/tests/overlays-parity.spec.ts','tools/extract-overlays.py','tools/native-navigation/OverlaysProbe.cs','tools/verify-overlays-themes.mjs','tools/check-overlays.ps1','gallery/tests/overlay-presentation.spec.ts','gallery/tests/overlay-shadow.spec.ts','gallery/tests/overlay-menu-motion.spec.ts','references/overlay-native-motion.json','tools/capture-overlay-motion.py','tools/native-navigation/OverlayPresentationProbe.cs','tools/run-overlay-presentation-probe.ps1','tools/prepare-overlay-validation.ps1','docs/overlays.md'];
const result={
 stage:'7 first floating-controls slice',date:'2026-11-07',generatedAtUtc:new Date().toISOString(),
 controls:['Popup','ToolTip','Flyout','MenuFlyout','Slider'],
 route:'http://127.0.0.1:5173/#overlays',scope:'docs/overlays.md',
 rust:read('references/validation/rust-tests.json'),
 integrationChecks:read('references/validation/overlays-checks.json'),
 themeSmoke:read('references/validation/overlays-themes.json'),
 rustAnalyzer:read('references/validation/rust-analyzer.json'),
 navigationSmoke:read('references/validation/overlays-navigation.json'),
 validatedWasm:read('out/overlay-validation/packages/winui-wasm/src/wasm/build-stamp.json'),
 actualControls:read('references/validation/overlay-controls-validation.json'),
 presentation:{canvas:read('references/validation/overlay-presentation-Canvas2D.json'),gpu:read('references/validation/overlay-presentation-WebGL2.json'),menuCanvas:read('references/validation/overlay-menu-motion-Canvas2D.json'),menuGpu:read('references/validation/overlay-menu-motion-WebGL2.json'),shadowCanvas:read('references/validation/overlay-shadow-Canvas2D.json'),shadowGpu:read('references/validation/overlay-shadow-WebGL2.json')},
 fingerprintBoundary:'Browser report covers the frozen SDK/WASM presentation follow-up at the identified validatedWasm; other controls are edited concurrently. Rust and lint reports carry their own check timestamps.',
 browser:{report:'out/overlays-browser/results.json',passed:tests.filter(t=>t.status==='expected').length,total:tests.length,tests},
 native:{contract:'references/overlay-template.json',metrics:'references/overlay-metrics.json',canvas:read('references/validation/overlays-Canvas2D.json'),gpu:read('references/validation/overlays-WebGL2.json')},
 limitations:['Initial slices, not the complete WinUI feature surfaces.','Nested menu items, advanced presenter templates and automatic flyout scrolling remain pending.','Menu system backdrop samples the same browser scene rather than the external desktop. Native shadow profiles are checked, while complete floating-control pixel equivalence remains unproven.','Slider ticks, tick snapping, custom value converters and engagement are pending.','ToolTip uses source fallback timings, without reading Windows system settings or implementing the full reshow/safe-zone service.','Static Slider active-pixel errors are diagnostics, not a declaration of native pixel equivalence.','New production performance and screen-reader acceptance have not been established.'],
 files:files.map(path=>({path,sha256:createHash('sha256').update(readFileSync(new URL(path,root))).digest('hex')})),
};
writeFileSync(new URL('references/stage-7.json',root),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({rust:result.rust.passed,browser:result.browser.passed,total:result.browser.total}));
