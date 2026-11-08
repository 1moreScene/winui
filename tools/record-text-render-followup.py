"""Record the text-rendering repair independently of older overlay checkpoints."""
from pathlib import Path
import datetime, hashlib, json, re

ROOT=Path(__file__).resolve().parent.parent
def read(p):return json.loads((ROOT/p).read_text(encoding='utf-8-sig'))
def save(p,d):(ROOT/p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
def sha(p):return hashlib.sha256((ROOT/p).read_bytes()).hexdigest()

before=read('references/validation/overlay-text-coverage-before-baseline.json')
after=read('references/validation/overlay-text-coverage-after-baseline.json')
native=read('references/text-coverage-native.json')
full=read('out/overlay-baseline-full-browser.json')
stamp=read('out/overlay-baseline-full-stamp.json')
controls=read('references/validation/overlay-controls-comparison.json')
corners=read('references/validation/popup-corner-materials.json')
rust=(ROOT/'out/overlay-baseline-rust.log').read_text(encoding='utf8')
assert full['stats']['expected']==149 and full['stats']['unexpected']==0 and full['stats']['flaky']==0
assert not any(token in (ROOT/'out/overlay-baseline-full-browser.log').read_text(encoding='utf8') for token in ['Unhandled error','WebGL error'])
assert len(before['rows'])==len(after['rows'])==168 and not before['errors'] and not after['errors']
assert after['wasm']==stamp['sha256']==controls['wasm']
assert all(read(f'out/overlay-baseline-full-collections-{b}.json')['wasmSha256']==stamp['sha256'] for b in ['Canvas2D','WebGL2'])
assert all(abs(r['dpi']-r['captureScale'])<.001 and r['win32Dpi']==r['dpi']*96 for r in native['rows'])
assert len(controls['rows'])==48 and len(controls['frames'])==312 and not controls['errors']
assert all(r['geometryError']<.81 and r['rowError']<.81 and r['outerEdgeMAE']<4 for r in controls['rows'])
assert len(corners['rows'])==32 and not corners['errors'] and max(r['cornerBackgroundError'] for r in corners['rows'])==0
assert 'test result: FAILED' not in rust
groups=[]
for family in ['Segoe UI','Arial','Segoe Fluent Icons']:
 for trimming in ['None','Clip']:
  old=[r['inkMAE'] for r in before['rows'] if r['family']==family and r['trimming']==trimming]
  new=[r['inkMAE'] for r in after['rows'] if r['family']==family and r['trimming']==trimming]
  groups.append(dict(family=family,trimming=trimming,cases=len(new),beforeInkMAE=sum(old)/len(old),afterInkMAE=sum(new)/len(new)))
ordinary=lambda d:sum(r['inkMAE'] for r in d['rows'] if r['family']!='Segoe Fluent Icons')/sum(r['family']!='Segoe Fluent Icons' for r in d['rows'])
source_files=['src/scene/paint.rs','src/render.rs','src/material.rs','src/material_blur.rs','tests/text_raster.rs','tests/material_blend.rs','tools/native-navigation/Program.cs','tools/native-navigation/TextCoverageProbe.cs']
report={
 'generatedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'acceptedPixelEquality':False,
 'changes':[
  'All axis-aligned glyph runs snap their physical baseline, including the DWriteLayout route.',
  'DWriteLayout painting adds the TextBlock height-rounding adjustment without changing its public baseline metrics. LineServices retains its already-adjusted baseline.',
  'Material pixel byte conversion uses ToUint8Clamp ties-to-even; recipe Color packing is unchanged.'
 ],
 'sources':'references/text-raster-sources.json',
 'sourceBinaryCorrespondence':read('references/baseline.json')['winui']['correspondence'],
 'text':{'nativeReport':'references/text-coverage-native.json','beforeReport':'references/validation/overlay-text-coverage-before-baseline.json','afterReport':'references/validation/overlay-text-coverage-after-baseline.json','nativeScenes':2,'nativeTextCases':84,'browserCasesPerVersion':168,'sample':'Open','ordinaryGlyphMeanBefore':ordinary(before),'ordinaryGlyphMeanAfter':ordinary(after),'groups':groups,'beforeWasm':before['wasm'],'afterWasm':after['wasm'],'review':'out/overlay-text-coverage/index.html'},
 'browser':{'report':'out/overlay-baseline-full-browser.json','stats':full['stats'],'wasm':stamp,'unhandledErrorsInLog':False,'fetchedBinaryEvidence':[f'out/overlay-baseline-full-collections-{b}.json' for b in ['Canvas2D','WebGL2']]},
 'rust':{'passed':sum(map(int,re.findall(r'test result: ok\. (\d+) passed',rust))),'log':'out/overlay-baseline-rust.log'},
 'controls':{'report':'references/validation/overlay-controls-comparison.json','wasm':controls['wasm'],'stableComparisons':48,'motionComparisons':312,'maximumGeometryErrorDip':max(r['geometryError'] for r in controls['rows']),'maximumRowErrorDip':max(r['rowError'] for r in controls['rows']),'maximumEdgeRGBMAE':max(r['outerEdgeMAE'] for r in controls['rows']),'maximumMaterialRGBMAE':max(r['materialMAE'] for r in controls['rows'])},
 'popupCorners':{'report':'references/validation/popup-corner-materials.json','comparisons':32,'cornerLeakMaximum':0},
 'checks':{'buildAndTypecheck':'out/overlay-baseline-build.log','fmt':'out/overlay-baseline-fmt.log','clippyHost':'out/overlay-baseline-clippy.log','clippyWasm':'out/overlay-baseline-wasm-clippy.log','sourceAndReferenceFingerprints':'out/overlay-baseline-fingerprints.log'},
 'diagnostics':['references/validation/overlay-text-coverage-diagnostic.json','references/validation/overlay-canvas-context-diagnostic.json','references/validation/overlay-noise-sampling-diagnostic.json','references/validation/overlay-app-backdrop-kernel.json'],
 'remaining':[
  'Glyph coverage still differs after aligning placement. Diagnostic Canvas modes are not production corrections.',
  'Symbol-font None/Latin text still falls back in the browser while the native fast path renders missing glyphs.',
  'In-app Gaussian and DWM HostBackdrop retain measured residuals; external desktop sampling and compositor present-time equivalence are not provided by this browser renderer.'
 ],
 'nextBatch':{'controls':['AutoSuggestBox','NumberBox','ComboBox','ContentDialog','TeachingTip'],'sceneControlsImplemented':False,'status':'Source/template baseline and NumberBox parser core only; the requested floating-fidelity gate is not accepted.'},
 'boundaries':[
  'The first text-only probe omitted its per-monitor startup flag. That unaware capture is discarded; all accepted rows assert XAML scale, Win32 DPI, and physical capture ratio agreement.',
  'Material UNORM conversion is corrected to the Canvas byte-domain rule. The isolated flat-noise error remains measurable; no native equality improvement is claimed for that diagnostic.',
  'The matching-SDK probe is not a Store Gallery distribution acceptance.',
  'Windows native host support has not been added; delivery-mode clarification is pending.'
 ],
 'standards':['https://tc39.es/ecma262/multipage/abstract-operations.html#sec-touint8clamp'],
 'repositoryAtReportTime':[{'path':p,'sha256':sha(p)} for p in source_files],
 'nativeRuntime':{'probeExeSha256':sha('out/text-coverage-native-bin/NavigationProbe.exe'),'winuiDllSha256':sha('out/text-coverage-native-bin/Microsoft.UI.Xaml.dll')},
}
save('references/validation/overlay-text-render-followup.json',report)
for p in ['references/stage-7.json','references/validation/overlay-controls-validation.json']:
 d=read(p);d['textRenderingFollowup']={'report':'references/validation/overlay-text-render-followup.json','acceptedPixelEquality':False,'browser':full['stats'],'rust':report['rust']['passed'],'wasm':stamp['sha256']};save(p,d)
p='references/validation/overlay-refinement.json';d=read(p);d['supersededBy']='references/validation/overlay-text-render-followup.json';d['sharedArtifactBoundary']='Shared comparison/image paths have been refreshed by the linked follow-up. Values and tested-binary hashes embedded in this historical checkpoint retain their original scope.';save(p,d)
print(json.dumps({'rust':report['rust']['passed'],'browser':full['stats'],'ordinaryInkBefore':ordinary(before),'ordinaryInkAfter':ordinary(after),'acceptedPixelEquality':False}))
