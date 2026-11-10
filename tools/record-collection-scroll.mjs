import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=path=>readFileSync(new URL('../'+path,import.meta.url));
const json=path=>JSON.parse(read(path));
const hash=path=>createHash('sha256').update(read(path)).digest('hex');
const assert=(condition,message)=>{if(!condition)throw Error(message);};
const runtime='out/collections-5195-test-runtime';
const wasmSha256=hash(runtime+'/winui_bg.wasm');
assert(json(runtime+'/build-stamp.json').sha256===wasmSha256,'Snapshot build stamp mismatch');
const reports=[
 ['out/collections-5195-scroll-msedge-results.json',3],
 ['out/collections-5195-scroll-chrome-results.json',3],
 ['out/collections-5195-scroll-regression-results.json',21],
 ['out/collections-5195-scroll-host-results.json',15],
].map(([path,count])=>{
 const stats=json(path).stats;
 assert(stats.expected===count&&!stats.unexpected&&!stats.skipped&&!stats.flaky,`Unsuccessful browser report: ${path}`);
 return{path,sha256:hash(path),passed:count};
});
const rustPath='out/collection-scroll-rust.log',rust=read(rustPath).toString();
assert(!/test result: FAILED|error:/.test(rust),'Rust suite failed');
const rustPassed=[...rust.matchAll(/test result: ok\. (\d+) passed/g)].reduce((sum,m)=>sum+Number(m[1]),0);
assert(rustPassed>=178,'Missing Rust regression results');
const logs=['out/collection-scroll-build.log','out/collection-scroll-production.log','out/collection-scroll-types.log','out/collection-scroll-clippy.log','out/collection-scroll-wasm-clippy.log'];
for(const path of logs)assert(!/error\[E\d+\]|error TS\d+|^error:/m.test(read(path).toString()),`Failure in ${path}`);
const windows=['msedge','chrome'].map(channel=>{
 const path=`references/validation/collections-5195-scroll-window-${channel}.json`,rows=json(path);
 for(const row of rows)assert(row.frames.length>5&&row.frames.every(f=>f.count<40&&f.covered&&f.error===null)&&row.frames.at(-1).offset>59000,`Invalid virtualized scroll: ${channel}/${row.mode}`);
 return{channel,path,sha256:hash(path),cases:rows.map(row=>({mode:row.mode,maxContainers:Math.max(...row.frames.map(f=>f.count)),sampledFrames:row.frames.length}))};
});
const matrices=['Canvas2D','WebGL2'].map(backend=>{
 const path=`references/validation/collections-5195-${backend}.json`,report=json(path);
 assert(report.wasmSha256===wasmSha256,`${backend} tested another binary`);
 return{backend,path,sha256:hash(path)};
});
const manifestPath='out/collections-5195-app-runtime/manifest.json',manifest=json(manifestPath);
assert(manifest.wasmSha256===wasmSha256,'Application snapshot has another binary');
const changedApplicationFiles=manifest.files.filter(file=>hash('gallery/src/'+file.path)!==file.sha256).map(file=>file.path);
const profiles=['before','after'].map(label=>{
 const path=`out/collection-scroll-${label}.json`,data=json(path);
 if(label==='after')assert(data.wasmSha256===wasmSha256,'Profile measured another current binary');
 return{label,path,sha256:hash(path),wasmSha256:data.wasmSha256,channel:data.channel,results:data.results.map(({mode,count,summary,nodes})=>({mode,count,summary,nodes}))};
});
const dist=readdirSync(new URL('../gallery/dist/assets/',import.meta.url)).find(path=>path.startsWith('winui_bg-')&&path.endsWith('.wasm'));
const status={recordedAt:new Date().toISOString(),scope:'Collection scrolling: presented-viewport virtualization, layout measurement reuse, font metrics caching, capture-frame coalescing, stable accessible labels',
 testedRuntime:{url:'http://127.0.0.1:5195/#list-view',wasmSha256,runtime,manifestPath,matchesCurrentBinary:hash('packages/winui-wasm/src/wasm/winui_bg.wasm')===wasmSha256,matchesDistBinary:!!dist&&hash('gallery/dist/assets/'+dist)===wasmSha256,changedApplicationFiles},
 rustPassed,rustLog:{path:rustPath,sha256:hash(rustPath)},browserPassed:reports.reduce((sum,r)=>sum+r.passed,0),reports,windows,matrices,
 logs:logs.map(path=>({path,sha256:hash(path)})),profiles,
 sources:['src/scene/collections.rs','src/scene/collections/adaptive.rs','src/scene/scroll.rs','src/typography.rs','packages/winui-wasm/src/scene.ts','tests/collection_scroll.rs','gallery/tests/collection-scroll.spec.ts'].map(path=>({path,sha256:hash(path)})),
 limits:['Timing includes diagnostic profiler overhead and local browser scheduling; it is not a cross-device frame-rate guarantee.','Coalescing repeated sampled offsets reconstructs a continuous curve; it does not establish full Windows inertia/compositor parity.','The earlier full collection status remains a separate checkpoint; this record covers the subsequent scrolling fix.']};
writeFileSync(new URL('../references/validation/collections-scroll-status.json',import.meta.url),JSON.stringify(status,null,2)+'\n');
console.log(JSON.stringify({rustPassed,browserPassed:status.browserPassed,wasmSha256,matchesCurrentBinary:status.testedRuntime.matchesCurrentBinary,matchesDistBinary:status.testedRuntime.matchesDistBinary,changedApplicationFiles}));
