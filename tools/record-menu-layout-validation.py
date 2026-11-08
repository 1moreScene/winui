"""Bind batch results to the exact frozen Rust, browser source and production WASM."""
from pathlib import Path
from datetime import datetime,timezone
import json,hashlib,re,gzip
ROOT=Path(__file__).resolve().parents[1]
def read(path):return (ROOT/path).read_text(encoding='utf-8-sig')
def obj(path):return json.loads(read(path))
def sha(path):return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
def passed(path,count):
 text=read(path)
 assert re.search(rf'\b{count} passed\b',text) and not re.search(r'\b\d+ failed\b',text),path
 return {'passed':count,'log':path}
rust_log='out/menu-layout-frozen-final-rust.log'
rust=read(rust_log);assert 'test result: FAILED' not in rust
rust_count=sum(map(int,re.findall(r'test result: ok\. (\d+) passed',rust)));assert rust_count==105
snapshot='out/menu-layout-validation-source-v2'
manifest=obj(snapshot+'/source-manifest.json');stamp=obj('out/menu-layout-runtime/build-stamp.json')
assert stamp['sha256']==sha('out/menu-layout-runtime/winui_bg.wasm')
batch=['src/scene/command_menus.rs','src/scene/menu_entries.rs','src/scene/layout_panels.rs','src/scene/input.rs','src/scene/layout.rs','src/scene/properties.rs','src/scene/mod.rs','src/scene/paint.rs','src/scene/command_controls.rs','src/scene/command_controls/layout.rs','src/scene/command_controls/paint.rs','src/scene/command_controls/input.rs','src/scene/compact_controls.rs','src/scene/five_controls.rs','src/selection.rs','src/wasm.rs']
batch_matches={path:sha(path)==manifest['files'][path]for path in batch}
assert all(batch_matches[path]for path in batch[:3]),'A batch-owned implementation module changed after the frozen run'
drift=[path for path,digest in manifest['files'].items()if path.startswith('src/')and(ROOT/path).exists()and sha(path)!=digest]
native=obj('references/menu-layout-native.json');probe=obj('references/menu-layout-probe-run.json');assert len(native['rows'])==24
template=obj('references/command-menu-template.json');assert template['flyoutGeometry']['sha256']==sha('references/menu-layout-native.json')
native_case=next(r for r in native['rows']if r['theme']=='Light'and r['kind']=='RelativePanel'and r['state']=='Width300')
errors={}
for browser in ['edge','webkit']:
 rows=obj(f'out/menu-layout-{browser}-geometry.json');row=next(r for r in rows if r['deviceScaleFactor']==1.25);values=[]
 for node in row['nodes']:
  target=next(p for p in native_case['parts']if p['name']==node['key'])['rect']
  values.extend(abs(node['rect'][key]-target[i]) for i,key in enumerate(['x','y','width','height']))
 errors[browser]=max(values)
app=obj('out/collections-5270-app-runtime/manifest.json');assert app['wasmSha256']==stamp['sha256']
assets=list((ROOT/'out/menu-layout-gallery/assets').glob('*.wasm'));assert any(hashlib.sha256(p.read_bytes()).hexdigest()==stamp['sha256'] for p in assets)
record={
 'recordedAt':datetime.now(timezone.utc).isoformat(),
 'controls':['MenuBar','MenuBarItem','CommandBarFlyout','RelativePanel','WrapPanel'],
 'implementation':'Rust scene properties, measure/arrange, template children, input, checked/radio state, keyboard shortcuts, floating lifetime and rendering. TS maps typed parameters and browser semantics; React mounts the same API.',
 'commandModels':'Deferred from this five-control batch by user choice.',
 'samples':8,
 'baseline':{'galleryCommit':'7360ac322414e118eadfb0c7c2f4ecc31a218f59','winuiCommit':'7b12709347527238494ca28cb9fed326d513e779','sdk':probe['sdk'],'nativeProbe':'references/menu-layout-probe-run.json','nativeStates':len(native['rows']),'binarySourceCommitEquivalenceEstablished':False},
 'validation':{'rust':{'passed':rust_count,'newTests':16,'log':rust_log,'sourceManifest':snapshot+'/source-manifest.json'},'browser':passed('out/menu-layout-browser-final.log',26),'productionBrowser':passed('out/menu-layout-production-browser.log',18),'finalRightPlacement':passed('out/menu-layout-final-placement.log',2),'browserProjects':['Edge headless','WebKit headless'],'renderers':['Canvas2D','WebGL2'],'dpr':[1,1.25,1.5,2],'relativePanelSameSdkMaxErrorDip':errors,'typescript':'strict typecheck and declarations passed, including enum negative cases','galleryControlSourceAudit':'tools/gallery-control-source.mjs --check passed','productionBuildLog':'out/menu-layout-vite-build.log'},
 'runtime':{'sha256':stamp['sha256'],'bytes':(ROOT/'out/menu-layout-runtime/winui_bg.wasm').stat().st_size,'gzipBytes':len(gzip.compress((ROOT/'out/menu-layout-runtime/winui_bg.wasm').read_bytes())),'browserSourceManifest':'out/collections-5268-app-runtime/manifest.json','finalProductionSourceManifest':'out/collections-5270-app-runtime/manifest.json','productionDirectory':'out/menu-layout-gallery','productionUrl':'http://127.0.0.1:5270/#menu-bar','coreBatchModulesMatchFrozenRun':all(batch_matches[path]for path in batch[:3]),'integrationFileFingerprintsMatchFrozenRun':batch_matches,'otherRustFilesChangedAfterSnapshot':drift,'note':'Independent frozen source/runtime; concurrent edits outside this batch are not validated by this binary.'},
 'fullSuiteAttempt':{'log':'out/menu-layout-all-rust.log','passed':False,'failure':'animated_icon::scene_coalesces_state_updates_inherits_state_and_stops_hidden_or_reduced','note':'The broad attempt stopped in this separate animation test. This batch reports the independent 105-test relevant regression, not a full-suite pass.'},
 'acceptedFullStorePixelParity':False,'acceptedCompositionMotionParity':False,
 'remaining':['Full Store Gallery Composition material and frame timing acceptance','Native submenu hover delay and diagonal pointer buffer','Very tall menus need their own scroll host','Systematic differential coverage of extreme RelativePanel constraints','Experimental SDK WrapPanel Last overflow/explicit-size edge cases','Complete native UIA provider behavior'],
 'reviewImages':'out/menu-layout-review','documentation':'docs/menu-layout-controls.md'
}
(ROOT/'references/menu-layout-status.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(f'Recorded {rust_count} Rust, 26 SDK browser, 18 production browser and 2 final placement checks; native states=24')
