import {readFileSync,writeFileSync,readdirSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,relative,join} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const read=path=>readFileSync(join(root,path),'utf8').replace(/^\uFEFF/,'');
const sha=path=>createHash('sha256').update(readFileSync(join(root,path))).digest('hex');
const artifact='out/navigation-frame-final-preview';
const files=(dir)=>readdirSync(join(root,dir)).flatMap(name=>{
  const path=join(dir,name);return statSync(join(root,path)).isDirectory()?files(path):/\.(js|css|wasm|html)$/.test(path)?[{path:path.replaceAll('\\','/'),sha256:sha(path)}]:[];
});
const rust=read('out/frame-rust-tests.log'),targeted=read('out/frame-final-rust-targeted.log');
const passed=log=>[...log.matchAll(/test result: ok\. (\d+) passed/g)].reduce((n,m)=>n+Number(m[1]),0);
const chrome=JSON.parse(read('out/frame-chrome-results.json')),edge=JSON.parse(read('out/frame-edge-results.json'));
if(chrome.stats.unexpected||edge.stats.unexpected)throw new Error('Browser regressions did not all pass');
const sourceFiles=['src/frame.rs','src/navigation.rs','src/model.rs','src/render.rs','src/wasm.rs','src/lib.rs','references/api-enums.json',
  'gallery/src/frame.ts','gallery/src/react.tsx','gallery/src/sdk.ts','gallery/src/index.ts','gallery/src/HomePage.tsx','gallery/src/App.tsx',
  'gallery/src/GalleryNavigation.tsx','gallery/src/NavigationFrameExample.tsx','gallery/src/GalleryControls.tsx','gallery/src/scene.ts','gallery/src/sample-pages.css','gallery/src/gallery-controls.css'];
const assets=files(artifact);const wasm=assets.find(file=>file.path.endsWith('.wasm'));
const record={date:'2026-11-08',generatedAt:new Date().toISOString(),baseline:JSON.parse(read('references/frame-sources.json')),
  artifact,wasmSha256:wasm.sha256,matchesCurrentWasm:wasm.sha256===sha('gallery/src/wasm/winui_bg.wasm'),
  builds:['npm run build (Rust/WASM, TypeScript strict, Vite production, SDK declarations)','tsc --noEmit + vite build + npm run declarations after final TS changes'],
  rust:{full:{passed:passed(rust),log:'out/frame-rust-tests.log'},finalNavigation:{passed:passed(targeted),log:'out/frame-final-rust-targeted.log'}},
  browsers:{chrome:{stats:chrome.stats,result:'out/frame-chrome-results.json'},edge:{stats:edge.stats,result:'out/frame-edge-results.json'}},
  screenshots:['out/frame-home-button.png','out/frame-home-dark.png','out/frame-navigation-sample.png','out/home-mobile.png'],
  checks:['generated Rust/TS enums match references/api-enums.json','strict enum positive/negative type checks','control origin audit'],
  coverage:['Frame history and browser traversal','cache identity, LRU, Required and Disabled','lifecycle, cancellation, navigation stopped, parameters and idempotent disposal','rapid transitions and reduced motion','React page state and scroll restoration','cached ProgressRing stops scheduling','all implemented Gallery entries retain the shared shell','light/dark/high contrast and narrow layout','fallback draw cost and NavigationView indicator geometry'],
  limits:['DOM content uses source brush fallback: no cross-DOM Acrylic sampling','No Store Composition frame-by-frame or pixel-perfect acceptance in this batch','Shared workspace may continue to change; immutable preview assets and their hashes identify this acceptance run'],
  sources:sourceFiles.map(path=>({path,sha256:sha(path)})),assets};
writeFileSync(join(root,'references/navigation-frame-validation.json'),JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({rust:record.rust,browsers:record.browsers,wasmSha256:record.wasmSha256,matchesCurrentWasm:record.matchesCurrentWasm}));
