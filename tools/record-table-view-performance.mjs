import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const before=read('out/table-view-performance/before.json');
const after=read('out/table-view-performance/after.json');
const sha256=createHash('sha256').update(readFileSync('packages/winui-wasm/src/wasm/winui_bg.wasm')).digest('hex');
if(after.wasmSha256!==sha256)throw new Error('Performance sample does not match the current WASM');
if(before.url!==after.url||before.profiled!==after.profiled)throw new Error('Benchmark conditions differ');
const quantile=(values,p)=>values.sort((a,b)=>a-b)[Math.floor((values.length-1)*p)]??0;
function summarize(stage){
 const intervals=stage.raf.slice(1).map((t,i)=>t-stage.raf[i]);
 return {frames:stage.frames.length,wasmP50Ms:quantile(stage.frames.map(f=>f.ms),.5),wasmP95Ms:quantile(stage.frames.map(f=>f.ms),.95),drawP50Ms:quantile(stage.draws.map(f=>f.ms),.5),drawP95Ms:quantile(stage.draws.map(f=>f.ms),.95),frameIntervalP95Ms:quantile(intervals,.95),slowIntervals:intervals.filter(ms=>ms>25).length,intervals:intervals.length};
}
const stages=after.stages.map(stage=>{const original=before.stages.find(s=>s.label===stage.label);if(!original)throw new Error(`Missing baseline ${stage.label}`);return{label:stage.label,before:summarize(original),after:summarize(stage)};});
const record={recordedAt:new Date().toISOString(),url:after.url,conditions:{renderer:'Canvas2D',deviceScaleFactor:1.25,viewport:[1440,1100],build:'release',profiled:after.profiled,automation:'CLI Playwright regression/CPU sampling; no computer use'},beforeWasmSha256:before.wasmSha256,afterWasmSha256:after.wasmSha256,stages,longTasks:{before:before.longTasks.length,after:after.longTasks.length},vectorRasterHits:after.stages.at(-1)?.diagnostics.editing.vectorRasterHits,errors:after.errors,changes:['Rust light-dismiss routing precedes control template input','Rust scroll-owner pointer capture includes virtualized lists','Rust TableView reuses layout until properties, geometry or realized rows change','Rust row offsets are retained and pointer hit testing is shared by the paint','Rust table text snaps before scrolling, preserving glyph phase and continuous motion','Rust Canvas2D shares bounded pure-vector raster textures without changing animation samples'],boundary:'Observed profiled headless Chrome samples on this machine; not a constant frame-rate guarantee or full native animation parity acceptance'};
writeFileSync('references/validation/table-view-performance.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({stages:stages.map(s=>({label:s.label,beforeDrawP95:s.before.drawP95Ms,afterDrawP95:s.after.drawP95Ms,beforeWasmP95:s.before.wasmP95Ms,afterWasmP95:s.after.wasmP95Ms})),longTasks:record.longTasks,errors:record.errors},null,2));
