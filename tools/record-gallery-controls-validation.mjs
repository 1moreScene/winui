import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {audit} from './gallery-control-source.mjs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url));
const json=path=>JSON.parse(read(path));
const hash=path=>createHash('sha256').update(read(path)).digest('hex');
const suites=['gallery-controls','gallery-controls-pages','gallery-controls-regression'].map(name=>{
  const path=`out/${name}-results.json`,result=json(path);
  if(result.stats.unexpected||result.stats.interrupted||result.errors.length)throw new Error(`${name}: incomplete validation`);
  return {path,passed:result.stats.expected,failed:result.stats.unexpected};
});
const rust=read('out/gallery-controls-rust.log').toString();
if(/test result: FAILED|error: test failed/.test(rust))throw new Error('Rust checks failed');
const sourceSubstitutes=audit();if(sourceSubstitutes.length)throw new Error('HTML substitutes remain');
const pages=json('out/gallery-controls/page-audit.json');
const assets=readdirSync(new URL('../out/gallery-controls-preview/assets/',import.meta.url));
const wasm=assets.find(name=>name.endsWith('.wasm')),wasmPath=`out/gallery-controls-preview/assets/${wasm}`;
const before=json('out/gallery-dom-controls-before.json');
const finalResult=json('out/gallery-controls-final-results.json');
if(finalResult.stats.unexpected||finalResult.stats.interrupted||finalResult.errors.length)throw new Error('Final build verification failed');
const finalAssets=readdirSync(new URL('../out/gallery-controls-final-preview/assets/',import.meta.url));
const finalWasmPath=`out/gallery-controls-final-preview/assets/${finalAssets.find(name=>name.endsWith('.wasm'))}`;
const sourceNames=['GalleryControls.tsx','gallery-controls.css','HomePage.tsx','GalleryPageHeader.tsx','react.tsx','scene.ts','global-scrollbars.ts'];
const record={date:'2026-11-08',baseline:'WinUI Gallery 7360ac322414e118eadfb0c7c2f4ecc31a218f59',
  removedHtmlWidgets:Object.fromEntries(['input','select','button','details','summary','option'].map(tag=>[tag,before.filter(row=>row.tag===tag).length])),
  remainingHtmlSubstitutes:sourceSubstitutes.length,implementedPagesAudited:pages.length,pageAudit:'out/gallery-controls/page-audit.json',
  implementation:'Existing Rust SDK controls through application mounting adapters. Source DOM is a child of the real Expander, with shared Rust ScrollViewer chrome.',
  suites,browserChecks:suites.reduce((sum,suite)=>sum+suite.passed,0),
  rust:{passed:[...rust.matchAll(/test result: ok\. (\d+) passed/g)].reduce((sum,match)=>sum+Number(match[1]),0),failed:0,
    suites:['composed','overlays','navigation_indicator','navigation','text_scroll'],log:'out/gallery-controls-rust.log'},
  productionWasm:{path:wasmPath,sha256:hash(wasmPath),matchesCurrentBinary:hash(wasmPath)===hash('gallery/src/wasm/winui_bg.wasm')},
  sources:sourceNames.map(name=>({path:`out/gallery-controls-dev/src/${name}`,sha256:hash(`out/gallery-controls-dev/src/${name}`),matchesCurrentSource:hash(`out/gallery-controls-dev/src/${name}`)===hash(`gallery/src/${name}`)})),
  finalBuildVerification:{result:'out/gallery-controls-final-results.json',passed:finalResult.stats.expected,failed:finalResult.stats.unexpected,
    scope:'Checkbox/ComboBox pointer and keyboard, real Expander child layout, code ScrollViewer in three themes, Home SelectorBar/search/narrow layout/cached lifecycle.',
    wasm:{path:finalWasmPath,sha256:hash(finalWasmPath),matchesCurrentBinary:hash(finalWasmPath)===hash('gallery/src/wasm/winui_bg.wasm')},
    sources:sourceNames.map(name=>({path:`out/gallery-controls-final-dev/src/${name}`,sha256:hash(`out/gallery-controls-final-dev/src/${name}`),matchesCurrentSource:hash(`out/gallery-controls-final-dev/src/${name}`)===hash(`gallery/src/${name}`)})),
    notes:['After the complete baseline, concurrent Frame work changed a page DOM identifier, inert projection during navigation, navigation-stopped callbacks, and added Scene.isDisposed. The reviewed diffs do not change GalleryControls painting or input implementation. These four checks validate the current build separately.']},
  screenshots:['out/gallery-controls-button.png','out/gallery-controls-source.png','out/gallery-controls-scroll-Light.png','out/gallery-controls-scroll-Dark.png','out/gallery-controls-scroll-HighContrast.png','out/gallery-controls-mobile.png'],
  limits:['The immutable source snapshot and build were tested; current-source/binary comparisons identify concurrent workspace changes.',
    'Browser behavior and control origin checks do not certify complete native visual or Composition animation parity.',
    'Newly added controls in concurrent SDK work are not certified by this Gallery audit unless their page appears in the recorded page list.'],
};
writeFileSync(new URL('../references/gallery-controls-validation.json',import.meta.url),JSON.stringify(record,null,2)+'\n');
console.log(`Recorded ${record.browserChecks} browser checks, ${record.rust.passed} Rust checks, ${pages.length} Gallery pages; ${sourceSubstitutes.length} HTML substitutes.`);
