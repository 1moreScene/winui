import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=path=>readFileSync(resolve(root,path));
const json=path=>JSON.parse(read(path));
const sha=path=>createHash('sha256').update(read(path)).digest('hex');
const fingerprint=path=>({path,sha256:sha(path)});
const text=path=>{const b=read(path);return b.toString(b[0]===255?'utf16le':'utf8');};
const result=path=>({...fingerprint(path),stats:json(path).stats});
const buildSources=json('out/navigation-host-build-sources.json');
const drift=Object.entries(buildSources).filter(([path,hash])=>sha(path)!==hash).map(([path])=>path);
if(drift.length)throw Error(`Source changed after build: ${drift}`);
const baseline=json('out/navigation-host-baseline-motion.json');
const traces=['chromium','msedge','webkit'].map(browser=>{
 const path=`out/navigation-host-${browser}-frames.json`,rows=json(path),pages=rows.flatMap(row=>row.pages);
 return{browser,...fingerprint(path),frames:rows.length,visiblePagesWithNativeChrome:pages.filter(page=>page.opacity>0&&page.bars.some(bar=>bar.width!=='none'||!bar.managed)).length,
  movingVisiblePages:pages.filter(page=>page.opacity>0&&page.y>1&&page.y<139).length};
});
if(traces.some(trace=>trace.visiblePagesWithNativeChrome!==0||trace.movingVisiblePages===0))throw Error('Unexpected Frame/scrollbar regression');
const scoped=text('out/navigation-host-rust-scoped-regression.log'),fresh=text('out/navigation-scrollbars-tests-final.log');
const passed=log=>[...log.matchAll(/test result: ok\. (\d+) passed;/g)].reduce((sum,m)=>sum+Number(m[1]),0);
const binaries=['out/navigation-host-sdk/winui_bg.wasm','gallery/src/wasm/winui_bg.wasm',
 ...['out/navigation-host-preview/assets','gallery/dist/assets'].map(dir=>`${dir}/${readdirSync(resolve(root,dir)).find(name=>name.endsWith('.wasm'))}`)].map(fingerprint);
if(binaries.some(binary=>binary.sha256!==binaries[0].sha256))throw Error('Installed/preview binaries do not match');
const browsers=['regression-chromium','msedge','webkit','installed-chromium'].map(name=>result(`out/navigation-host-${name}-results.json`));
if(browsers.some(browser=>browser.stats.unexpected||browser.stats.flaky))throw Error('Browser regression did not pass');
const data={date:'2026-11-08',generatedAt:new Date().toISOString(),
 fixes:['Keep global Rust scrollbar ownership during inert Frame transitions; discover new surfaces before paint.','Apply DOM ancestor opacity and interactivity to the Rust scrollbar projection.','Use the shared Rust ScrollState paint, drag, repeat and auto-hide behavior for NavigationView menu and content ScrollViewers.','Expose Rust scrollbar geometry and deferred wake deadlines consistently through standalone and Scene hosts.'],
 baseline:{...fingerprint('out/navigation-host-baseline-motion.json'),frames:baseline.length,visibleNativeScrollbarPages:baseline.flatMap(row=>row.pages).filter(page=>!page.hidden&&Number(page.opacity)>0&&page.bar==='auto').length,
  observation:'The previously tested example did animate: 140 DIP to zero, while inert pages exposed native browser scrollbars.'},
 traces,browsers,browserPassed:browsers.reduce((sum,browser)=>sum+browser.stats.expected,0),
 rust:{scopedRegression:{passed:passed(scoped),filtered:1,command:'cargo test --locked -- --skip five_picker_templates_measure_paint_and_release_all_private_children',...fingerprint('out/navigation-host-rust-scoped-regression.log')},
  newScrollbarTests:{passed:passed(fresh),...fingerprint('out/navigation-scrollbars-tests-final.log')},
  fullSuite:{status:'One unrelated picker template failure: unknown field textAlignment. The scoped regression explicitly excludes this test; it is not counted as passing.',...fingerprint('out/navigation-host-rust-regression.log')}},
 checks:{releaseWasm:'passed from current workspace source; no isolated exclusions',typecheck:'passed',declarations:'passed',productionBuild:'default and validation Vite entries passed'},
 sources:{capturedAtBuild:buildSources,matchesCurrent:true},binaries,
 screenshots:['out/navigation-host-menu.png','out/navigation-host-example.png'].map(fingerprint),
 preview:'http://127.0.0.1:62145/#navigation-view',previewAlias:'http://127.0.0.1:57172/#navigation-view',
 limits:['Windows only; macOS/Linux not exercised.','Firefox could not launch in the previous validation and is not counted.','This validates scrollbar and Frame behavior, not complete native Composition/pixel parity.'],
};
writeFileSync(resolve(root,'references/navigation-host-validation.json'),JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify({browserPassed:data.browserPassed,traces,rustScoped:passed(scoped),newScrollbarTests:passed(fresh),wasm:binaries[0].sha256}));
