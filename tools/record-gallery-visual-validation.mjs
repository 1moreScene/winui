import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {audit} from './gallery-control-source.mjs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url));
const json=path=>JSON.parse(read(path));
const hash=path=>createHash('sha256').update(read(path)).digest('hex');
function result(path) {
  const value=json(path);
  if(value.stats.interrupted||value.errors.length)throw Error(`Incomplete run: ${path}`);
  const cases=[];
  function walk(suite){for(const spec of suite.specs??[])for(const test of spec.tests)cases.push({file:spec.file,title:spec.title,status:test.status});for(const child of suite.suites??[])walk(child);}
  for(const suite of value.suites)walk(suite);
  return {path,passed:value.stats.expected,failed:value.stats.unexpected,cases};
}
const visual=result('out/gallery-visual-results.json');
const controls=result('out/gallery-controls-results.json');
const regression=result('out/gallery-visual-regression-baseline-results.json');
const retry=result('out/gallery-visual-regression-results.json');
const current=result('out/gallery-visual-current-results.json');
if(visual.failed||controls.failed||retry.failed)throw Error('Unresolved checks');
if(current.failed||current.passed!==6)throw Error('Current binary verification failed');
if(visual.passed!==7||controls.passed!==5||regression.cases.length!==17||retry.passed!==1)throw Error('Missing expected coverage');
const unresolved=regression.cases.filter(test=>test.status!=='expected'&&!retry.cases.some(other=>other.file===test.file&&other.title===test.title&&other.status==='expected'));
if(unresolved.length)throw Error(JSON.stringify(unresolved));
const substitutes=audit();if(substitutes.length)throw Error('Gallery JSX control substitutes remain');
const rust=read('out/gallery-visual-full-rust.log').toString();
if(/test result: FAILED|error: test failed/.test(rust))throw Error('Rust checks failed');
const names=['HomePage.tsx','GalleryControls.tsx','GalleryPageHeader.tsx','gallery-controls.css','home.css','style.css','CollectionsPage.tsx','CommandControlsPage.tsx','NavigationControlsPage.tsx'];
function build(buildName){
  const assets=`out/${buildName}-preview/assets`,wasm=`${assets}/${readdirSync(new URL(`../${assets}`,import.meta.url)).find(name=>name.endsWith('.wasm'))}`;
  return {wasm:{path:wasm,sha256:hash(wasm),matchesCurrentBinary:hash(wasm)===hash('packages/winui-wasm/src/wasm/winui_bg.wasm')},
    sources:names.map(name=>{const path=`out/${buildName}-dev/src/${name}`;return {path,sha256:hash(path),matchesCurrentSource:hash(path)===hash(`gallery/src/${name}`)};})};
}
const sourcePaths=['WinUIGallery/MainWindow.xaml','WinUIGallery/Styles/ItemTemplates.xaml','WinUIGallery/Controls/PageHeader.xaml'];
const record={date:'2026-11-08',baseline:{galleryCommit:'7360ac322414e118eadfb0c7c2f4ecc31a218f59',
  sources:sourcePaths.map(path=>({path:`../WinUI-Gallery/${path}`,sha256:hash(`../WinUI-Gallery/${path}`)})),
  selectorBarResources:{path:'references/winui/SelectorBar_themeresources.xaml',sha256:hash('references/winui/SelectorBar_themeresources.xaml')}},
  rootCause:{layer:'Rust SDK',path:'src/scene/paint.rs',sha256:hash('src/scene/paint.rs'),
    before:'A scene without a root background brush received an implicit full-viewport theme fill.',
    after:'A null root background is transparent. Explicit root brushes and individual control template fills remain effective.'},
  callerCorrections:['Use existing AutoSuggestBox with QueryIcon and pinned 580 DIP maximum width.','Remove favorite action absent from official ControlItemTemplate; keep page-header ToggleButton.','Give SDK icon buttons their actual width, height, minimum size, padding and centered Rust content.','Use official theme icon Button; retain full theme choice in Settings.','Remove zero-width renderer Expander wrappers and obsolete details/input styles.'],
  validation:{visual,controls,regression:{baseline:regression,recheck:retry,unresolved:0,
    note:'The 140-click indicator stress test hit its 30-second test budget during concurrent browser suites. The unchanged test passed when rerun by itself; this is not a navigation latency benchmark.'},
    uniqueBrowserChecks:visual.passed+controls.passed+regression.cases.length,
    rust:{command:'cargo test --locked',log:'out/gallery-visual-full-rust.log',passed:[...rust.matchAll(/test result: ok\. (\d+) passed/g)].reduce((sum,match)=>sum+Number(match[1]),0),failed:0},
    geometry:{pages:json('out/gallery-visual/page-geometry.json').length,path:'out/gallery-visual/page-geometry.json'},
    iconGeometry:'out/gallery-visual/icons.json',remainingHtmlSubstitutes:substitutes.length},
  testedBuild:build('gallery-visual-final'),
  currentBuildVerification:{result:current,build:build('gallery-visual-current'),scope:'Six focused checks repeat search/card/icon behavior, both-backend three-theme alpha and explicit brushes, Home SelectorBar alpha and 125% DPR on a later WASM build.'},
  screenshots:['out/gallery-visual-home.png','out/gallery-visual-category.png','out/gallery-visual-header-1440.png','out/gallery-visual-header-390.png','out/gallery-visual-125pct.png'],
  limits:['Frozen sources and binaries were tested; equality flags report subsequent concurrent workspace changes.','Full native screenshot and Composition frame-by-frame parity is not certified by geometry, source and alpha checks.','PageHeader documentation/source menu content and API icon foreground still require further native comparison.']};
writeFileSync(new URL('../references/gallery-visual-validation.json',import.meta.url),JSON.stringify(record,null,2)+'\n');
console.log(`Recorded ${record.validation.uniqueBrowserChecks} browser checks, ${record.validation.rust.passed} Rust checks, ${record.validation.geometry.pages} pages.`);
