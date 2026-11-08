import {readFileSync,writeFileSync,readdirSync,statSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const root=resolve(import.meta.dirname,'..');
const require=createRequire(join(root,'gallery/package.json'));const {PNG}=require('pngjs');
const read=p=>readFileSync(join(root,p),'utf8').replace(/^\uFEFF/,'');
const sha=p=>createHash('sha256').update(readFileSync(join(root,p))).digest('hex');
const json=p=>JSON.parse(read(p));
const native=json('references/navigation-motion-native.json'),contract=json('references/navigation-motion-contract.json');
const artifact='out/navigation-motion-preview';const bundle=json(`${artifact}/wasm-build.json`);
const sourceFiles=['src/navigation.rs','src/navigation_motion.rs','src/render.rs','src/scene/paint.rs','src/scene/layout.rs','src/frame.rs','src/lib.rs','gallery/src/sdk.ts','gallery/src/react.tsx','tools/native-navigation/NavigationMotionProbe.cs','tools/native-navigation/Program.cs','tools/native-navigation/NavigationProbe.csproj','tools/native-navigation/NativeMotionRedPage.xaml','tools/native-navigation/NativeMotionBluePage.xaml','tools/extract-navigation-motion.mjs','references/navigation-motion-contract.json'];
const browser=Object.fromEntries(['chrome','msedge'].map(channel=>{const path=`out/navigation-motion-${channel}-results.json`;const result=json(path);if(result.stats.unexpected||result.stats.flaky)throw new Error(`${channel} did not pass cleanly`);return[channel,{path,stats:result.stats}];}));
const log=read('out/navigation-motion-rust.log');if(log.includes('test result: FAILED'))throw new Error('Rust tests failed');
const rustPassed=[...log.matchAll(/test result: ok\. (\d+) passed/g)].reduce((n,m)=>n+Number(m[1]),0);
const nativeCases=native.records.filter(r=>Array.isArray(r.samples)).map(r=>({theme:r.theme,action:r.action,frames:r.samples.length,
  allForeground:r.samples.every(s=>s.foreground),captureModes:[...new Set(r.samples.map(s=>s.capture))],
  ...(r.action==='expand'||r.action==='collapse'?{markerDeltaDip:r.samples.at(-1).markerTop-r.samples[0].markerTop,
    intermediatePositions:r.samples.filter(s=>s.markerTop!==r.samples[0].markerTop&&s.markerTop!==r.samples.at(-1).markerTop).length}:{})}));
const nativePixels=[];
for(const theme of ['Light','Dark'])for(const mode of ['expanded','fallback']){
 const path=`out/navigation-motion-native-final/Material-${theme}-${mode}.png`;const png=PNG.sync.read(readFileSync(join(root,path))),scale=png.width/800;
 const i=(Math.round(500*scale)*png.width+Math.round((mode==='expanded'?30:200)*scale))*4;const pixel=[...png.data.subarray(i,i+4)];
 const expected=mode==='expanded'?[66,103,134,255]:theme==='Light'?[249,249,249,255]:[44,44,44,255];
 if(JSON.stringify(pixel)!==JSON.stringify(expected))throw new Error(`Native ${theme} ${mode} pixel mismatch: ${pixel}`);
 nativePixels.push({path,scale,pixel,expected});
}
const files=dir=>readdirSync(join(root,dir)).flatMap(name=>{const path=join(dir,name);return statSync(join(root,path)).isDirectory()?files(path):/\.(wasm|js|css|html)$/.test(path)?[{path:path.replaceAll('\\','/'),sha256:sha(path)}]:[];});
const dll='out/navigation-motion-probe-bin/Microsoft.UI.Xaml.dll';
const record={date:'2026-11-08',generatedAt:new Date().toISOString(),baseline:{commit:contract.commit,sdk:native.sdk,dpi:native.dpi,probeDll:{path:dll,sha256:sha(dll)},nativeData:{path:'references/navigation-motion-native.json',sha256:sha('references/navigation-motion-native.json')}},
  sourceRecipe:contract.reposition,chevronSource:contract.chevronSource,nativeCases,nativePixels,
  nativeRapidOverlap:native.records.find(r=>r.action==='page-RapidEntrance').samples.some(s=>s.red&&s.blue),
  rust:{passed:rustPassed,log:'out/navigation-motion-rust.log'},browser,
  materialChecks:json('out/navigation-motion-materials.json'),fallbackPixelChecks:json('out/navigation-motion-fallback-pixels.json'),
  artifact,wasmSha256:bundle.sha256,matchesCurrentWasm:sha('gallery/src/wasm/winui_bg.wasm')===bundle.sha256,
  sources:sourceFiles.map(path=>({path,sha256:sha(path)})),assets:files(artifact),
  limits:['Live same-SDK standalone probe, not the Store release window.','UI Rendering time brackets plus own-window GDI pixels; no exact compositor present timestamps.','Cross-DOM Acrylic remains the explicit native resource fallback.','No claim of complete font rasterization, GPU pixel or frame-present equivalence.']};
writeFileSync(join(root,'references/navigation-motion-validation.json'),JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({rustPassed,browsers:Object.fromEntries(Object.entries(browser).map(([c,v])=>[c,v.stats])),nativeSequences:nativeCases.length,nativeFrames:nativeCases.reduce((n,r)=>n+r.frames,0),nativePixels,wasmSha256:record.wasmSha256,matchesCurrentWasm:record.matchesCurrentWasm}));
