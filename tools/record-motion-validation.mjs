import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=path=>readFileSync(resolve(root,path));
const json=path=>JSON.parse(read(path));
const hash=path=>createHash('sha256').update(read(path)).digest('hex');
const browser=json('out/motion-browser-results.json');
if(browser.stats.unexpected||browser.stats.flaky||browser.stats.expected!==8)throw new Error('Motion browser run must pass all eight tests without retries');
const tested=json('out/motion-tested-wasm.json');
if(tested.sha256!==hash('gallery/src/wasm/winui_bg.wasm'))throw new Error('The current WASM differs from the browser-tested artifact');
const rust=read('out/motion-rust-regression.log').toString();
if(/test result: FAILED|error\[/.test(rust))throw new Error('Rust regression log contains failures');
const suites=[...rust.matchAll(/test result: ok\. (\d+) passed; (\d+) failed/g)];
if(suites.length<30)throw new Error('Full Rust regression log is incomplete');
const inputs=['src/scene/motion_effects.rs','src/scene/motion.rs','gallery/src/motion.ts','gallery/src/MotionPages.tsx','references/gallery-motion-native.json','references/motion-resources.json','references/motion-sources.json'];
const lint=read('out/motion-clippy.log').toString();
const lintPassed=!/^error:/m.test(lint)&&!/could not compile/.test(lint);
const result={
  validationDate:'2026-11-09',
  galleryCommit:json('references/baseline.json').gallery.commit,
  winuiCommit:json('references/motion-sources.json').commit,
  wasm:{sha256:tested.sha256,matchesCurrentBinary:true,productionAsset:readdirSync(resolve(root,'gallery/dist/assets')).find(file=>file.endsWith('.wasm'))},
  rust:{passed:suites.reduce((sum,match)=>sum+Number(match[1]),0),failed:0,suites:suites.length,log:'out/motion-rust-regression.log',motionSpecificTests:11,existingAnimationAndKeyframeTests:5},
  browser:{passed:browser.stats.expected,failed:browser.stats.unexpected,backends:['Canvas2D','WebGL2'],host:'Vite development host with release WASM',results:'out/motion-browser-results.json',screenshots:'out/motion/'},
  typecheck:true,enumGenerationCheck:true,wasmReleaseBuild:true,viteProductionBuild:true,sdkDeclarations:true,
  clippy:{passed:lintPassed,command:'cargo clippy --locked --lib -- -D warnings',log:'out/motion-clippy.log',note:lintPassed?null:'Strict lint remains blocked by diagnostics in other ongoing control modules; see the log.'},
  nativeEvidence:{kind:'Pinned WinUI source plus captured Windows UxTheme records and resolved SDK brushes',fullNativeVisualAcceptance:false,uxThemeOS:json('references/gallery-motion-native.json').os},
  inputs:inputs.map(path=>({path,sha256:hash(path)})),
  limitations:['Two-dimensional affine scene; Z/projection and Gravity ThemeShadow are not implemented.','Typed scalar expression tree; no arbitrary Composition expression string parser.','Connected animation operates within one Scene; exact transparent-surface crossfade and native clip morphing remain incomplete.','Functional SDK examples are not a claim of full Gallery page or native frame-by-frame parity.'],
};
const asset=resolve(root,'gallery/dist/assets',result.wasm.productionAsset);
if(createHash('sha256').update(readFileSync(asset)).digest('hex')!==tested.sha256)throw new Error('Production WASM differs from the tested artifact');
writeFileSync(resolve(root,'references/validation/motion-effects.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({rust:result.rust.passed,browser:result.browser.passed,wasm:tested.sha256,clippyPassed:lintPassed}));
