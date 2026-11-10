import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=path=>readFileSync(resolve(root,path));
const json=path=>JSON.parse(read(path));
const sha=path=>createHash('sha256').update(read(path)).digest('hex');
const fingerprint=path=>({path,sha256:sha(path)});
const trace=path=>{const rows=json(path);return{...fingerprint(path),frames:rows.length,leakingFrames:rows.filter(row=>row.leaks.length).length,leaks:rows.flatMap(row=>row.leaks).length};};
const result=path=>({...fingerprint(path),stats:json(path).stats});
const core='src/frame.rs',frozen='out/frame-flicker-source/src/frame.rs';
if(sha(core)!==sha(frozen))throw Error('Current Frame differs from tested Rust source');
const wasm='out/frame-flicker-sdk/winui_bg.wasm';
const previewWasm=readdirSync(resolve(root,'out/frame-flicker-preview/assets')).find(name=>name.endsWith('.wasm'));
if(sha(wasm)!==sha(`out/frame-flicker-preview/assets/${previewWasm}`))throw Error('Preview does not contain tested WASM');
const nativeList=read('out/frame-flicker-native-test-list.txt');
const nativeText=nativeList[0]===255?nativeList.toString('utf16le'):nativeList.toString('utf8');
const nativeCount=nativeText.split(/\r?\n/).filter(line=>line.endsWith(': test')).length;
const rustFiles=[];
function walk(path){for(const entry of readdirSync(resolve(root,path),{withFileTypes:true})){
 const child=`${path}/${entry.name}`;if(entry.isDirectory())walk(child);else if(entry.name.endsWith('.rs'))rustFiles.push(fingerprint(child));
}}
walk('out/frame-flicker-source/src');
const data={date:'2026-11-08',generatedAt:new Date().toISOString(),
 problem:'Cached exit acquired host opacity=1 after the old sparse Rust track disappeared, before React committed hidden state.',
 fix:'Rust emits a total retained-page presentation frame including visibility, opacity, interactivity and paint order. Hosts project it synchronously and after layout commits.',
 baseline:trace('out/frame-flicker/baseline-chromium-trace.json'),
 fixed:['chromium','msedge','webkit'].map(name=>({browser:name,trace:trace(`out/frame-flicker/fixed-${name}-trace.json`),result:result(`out/frame-flicker-fixed-${name}-results.json`)})),
 navigationRegression:result('out/navigation-motion-chrome-results.json'),
 installedEntry:{result:result('out/frame-flicker-installed-chromium-results.json'),trace:trace('out/frame-flicker/installed-chromium-trace.json')},
 rust:{command:'cargo test --locked --manifest-path out/frame-flicker-source/Cargo.toml --target-dir out/frame-flicker-build',observedExitCode:0,passed:nativeCount,frameTests:11,newPresentationTests:4,
  sourceSnapshot:'out/frame-flicker-source',excluded:json('out/frame-flicker-source/snapshot.json').excluded,rustFiles},
 currentSources:[core,'packages/winui-wasm/src/frame.ts','packages/winui-wasm/src/react.tsx','tests/frame_presentation.rs','gallery/tests/frame-flicker.spec.ts','gallery/tests/fixtures/frame-flicker.tsx'].map(fingerprint),
 sourceCapture:'Fingerprints captured after validation. Rust Frame is checked against the frozen build source. Unrelated concurrent TS edits may differ from the isolated preview; the installed default production entry was checked separately.',
 wasm:{...fingerprint(wasm),preview: fingerprint(`out/frame-flicker-preview/assets/${previewWasm}`),installed:fingerprint('packages/winui-wasm/src/wasm/winui_bg.wasm'),matchesInstalled:sha(wasm)===sha('packages/winui-wasm/src/wasm/winui_bg.wasm')},
 checks:{typescript:'npm run typecheck: passed',productionBuild:'vite.frame-flicker.config.ts and default Vite build: passed',nativeWorkspace:'Blocked by concurrent unfinished picker_controls paint/input modules and methods; see out/frame-flicker-workspace-check.log'},
 limits:{os:'Windows only; macOS and Linux not exercised',firefox:{status:'launch blocked: spawn UNKNOWN after installing required browser',result:result('out/frame-flicker-fixed-firefox-results.json')},pixelScope:'Cached React SceneView solid-color page pixels on Canvas2D/WebGL2; not a complete native WinUI image/animation parity claim'},
 preview:'http://127.0.0.1:62145/#home',
};
if(data.baseline.leakingFrames!==5||data.fixed.some(run=>run.trace.leakingFrames!==0||run.result.stats.unexpected!==0))throw Error('Unexpected flicker regression result');
writeFileSync(resolve(root,'references/frame-flicker-validation.json'),JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify({baselineLeaks:data.baseline.leaks,fixed:data.fixed.map(run=>({browser:run.browser,frames:run.trace.frames,leaks:run.trace.leaks})),rustTests:nativeCount,wasmMatchesInstalled:data.wasm.matchesInstalled}));
