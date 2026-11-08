"""Assert the validated WASM is still current and record this batch's evidence."""
from pathlib import Path
from datetime import datetime,timezone
import hashlib,json,re
ROOT=Path(__file__).resolve().parents[1]
def read(path):return json.loads((ROOT/path).read_text(encoding='utf-8-sig'))
def digest(path):return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
dev=read('out/view-command-browser-results.json');production=read('out/view-command-production-results.json')
assert dev['stats']['expected']==18 and dev['stats']['unexpected']==0 and not dev['errors']
assert production['stats']['expected']==16 and production['stats']['skipped']==2 and production['stats']['unexpected']==0 and not production['errors']
matrix=read('references/validation/view-command-browser-native.json')['cases']
assert len(matrix)==64
stamp=read('gallery/src/wasm/build-stamp.json')
binary=digest('gallery/src/wasm/winui_bg.wasm');assert stamp['sha256']==binary
assert {case['geometry']['wasmSha256'] for case in matrix}=={binary},'comparison used another WASM'
assert all(case['geometry']['backend']['kind']==case['backend'] and not case['geometry']['backend']['lost'] for case in matrix)
dist=list((ROOT/'out/view-command-production/assets').glob('*.wasm'))
assert any(hashlib.sha256(p.read_bytes()).hexdigest()==binary for p in dist),'production build differs from tested WASM'
# Follow the current index's actual chunk graph; stale files from earlier builds
# in this isolated out directory are not treated as evidence.
production_root=ROOT/'out/view-command-production'
html=(production_root/'index.html').read_text(encoding='utf-8')
entry=re.search(r'<script[^>]+src="([^"]+\.js)"',html).group(1)
pending=[production_root/entry.lstrip('/')];seen=set();shipped=set()
while pending:
 path=pending.pop()
 if path in seen:continue
 seen.add(path);text=path.read_text(encoding='utf-8')
 pending.extend(path.parent/name for name in re.findall(r'["\']\./([^"\']+\.js)["\']',text))
 shipped.update(path.parent/name for name in re.findall(r'["\'`](?:/assets/|\./)?([A-Za-z0-9_-]+\.wasm)["\'`]',text))
assert shipped and {hashlib.sha256(p.read_bytes()).hexdigest() for p in shipped}=={binary},'current production entry points at another WASM'
native=read('references/validation/view-command-native.json')
by_id={c['id']:c for c in native['cases']}
geometry=[]
for case in matrix:
 expected=next(p['rect'] for p in by_id[case['id']]['parts'] if p['name']=='ContentRoot')
 actual=case['geometry']['content'];geometry.extend([abs(actual['x']+24-expected['x']),abs(actual['width']-expected['width'])])
log=(ROOT/'out/view-command-rust-tests.log').read_text(encoding='utf-8-sig')
assert 'test result: FAILED' not in log and 'error:' not in log
counts=[int(n)for n in re.findall(r'test result: ok\. (\d+) passed',log)]
assert counts
files=['src/scene/view_controls.rs','src/scene/mod.rs','src/scene/input.rs','src/scene/layout.rs','src/scene/paint.rs','src/scene/properties.rs','src/scene/five_controls.rs','src/scene/scroll.rs','src/wasm.rs','src/enums.rs','gallery/src/view-controls-types.ts','gallery/src/scene.ts','gallery/src/react.tsx','gallery/src/index.ts','gallery/src/ViewCommandPage.tsx','gallery/src/App.tsx','gallery/src/gallery-catalog.ts','gallery/src/RepeaterRefreshPage.tsx','gallery/tests/view-commands.spec.ts','tests/view_commands.rs','references/view-command-template.json']
files.extend(['src/typography.rs','src/resources.rs','src/scene/command_menus.rs','src/scene/collections.rs','src/scene/collections/adaptive.rs','src/scene/menu_entries.rs','src/scene/overlays.rs','gallery/src/official-view-command.json','gallery/tests/api-react-types.tsx','tools/native-view-gallery/Program.cs','tools/extract-view-command.py'])
data={'recordedAt':datetime.now(timezone.utc).isoformat(),'controls':['SplitView','SemanticZoom','ParallaxView','UICommand','StandardCommand'],'nativeTypeMapping':{'UICommand':'XamlUICommand','StandardCommand':'StandardUICommand'},'implementation':'Rust scene controls and command model; typed TS/React calling adapters','wasmSha256':binary,'matchesCurrentBinary':True,'loadedComparisonWasmSha256':binary,'rustTests':{'passed':sum(counts),'suites':len(counts),'log':'out/view-command-rust-tests.log'},'browser':{'development':dev['stats'],'production':production['stats'],'strictModeDevelopment':True},'nativeStates':len(native['cases']),'browserNativeCases':len(matrix),'maxGeometryErrorDip':max(geometry),'worstMeanPixelError255':max(c['meanPixelError'] for c in matrix),'nativeEvidence':'references/validation/view-command-native.json','comparisonEvidence':'references/validation/view-command-browser-native.json','publicEnumTypeNegatives':True,'typecheck':True,'declarations':True,'productionBuild':True,'sourceSnapshotSha256':{path:digest(path)for path in files},'remaining':['Store Gallery Composition animation frame acceptance, full native pixel/font equivalence.','SemanticZoom continuous multitouch pinch, arbitrary ISemanticZoomInformation and delayed zoom-button fade.','SplitView advanced nested focus constraints and complete custom template border/corner support.','Parallax DirectManipulation elastic overscroll and complex transformed ancestors.','Complete native command localization resources and synchronous parameter-dependent ICommand CanExecute querying.']}
gallery_native=read('references/validation/view-gallery-native.json')
gallery_browser=read('references/validation/view-gallery-browser.json')
assert len(gallery_native['cases'])==len(gallery_browser['cases'])==12
assert all(c['actualTheme']==c['theme'] for c in gallery_browser['cases'])
assert gallery_native['sourceSha256']==digest('gallery/src/official-view-command.json')
gallery_errors=[abs(c['node'][key]-c['native'][key])for c in gallery_browser['cases']for key in ['width','height']]
assert max(gallery_errors)<=0.5
data['galleryExamples']={'count':6,'nativeStates':12,'browserStates':12,'catalogItems':gallery_native['catalogItems'],'maxDimensionErrorDip':max(gallery_errors),'nativeEvidence':'references/validation/view-gallery-native.json','browserEvidence':'references/validation/view-gallery-browser.json','runtimeSourceAndOriginalXamlVerified':True,'sourceSha256':gallery_native['sourceSha256'],'controlledViewport':gallery_native['viewport']}
data['dependencies']=['Rust ScrollView shared scrolling engine','Rust SwipeControl directional Reveal/Execute actions','Rust collection headers','MenuEntry command binding','Container pointer notifications','Shared grapheme fallback for TextWrapping.Wrap']
data['remaining']=['Store Gallery Composition animation frame acceptance, full native pixel/font equivalence.','SemanticZoom arbitrary ISemanticZoomInformation and Windows Back integration; implemented pinch/button fade still need Store animation frame acceptance.','SplitView advanced nested focus constraints and complete custom template border/corner support.','Parallax DirectManipulation elastic overscroll and complex transformed ancestors.','ScrollView full ScrollPresenter inertia configuration and SwipeControl exact native damping, action template and settling trajectories.','Complete native command localization resources and synchronous parameter-dependent ICommand CanExecute querying.']
(ROOT/'references/view-command-status.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:data[k]for k in ['wasmSha256','rustTests','browserNativeCases','maxGeometryErrorDip','worstMeanPixelError255']},ensure_ascii=False))
