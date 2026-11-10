"""Record the actual preview, executable hashes, regression scope and corrections."""
from pathlib import Path
import datetime,hashlib,json,re,urllib.request

ROOT=Path(__file__).resolve().parent.parent
def read(name):return json.loads((ROOT/name).read_text(encoding='utf-8-sig'))
def sha(name):return hashlib.sha256((ROOT/name).read_bytes()).hexdigest()
def stats(name):return read(name)['stats']
frozen=sha('out/composed-validation/packages/winui-wasm/src/wasm/winui_bg.wasm')
served=hashlib.sha256(urllib.request.urlopen('http://127.0.0.1:5173/src/wasm/winui_bg.wasm').read()).hexdigest()
rust=(ROOT/'out/picker-foundation-rust-full.log').read_text(encoding='utf-8-sig')
report={'recordedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'status':'Verified reported ComboBox regressions; complete native control parity remains unaccepted',
 'fixes':[
  {'problem':'Short font list displayed a scrollbar at fractional DPR','owner':'src/scene/scroll.rs','cause':'Positive machine-roundoff residue from extent minus viewport','before':{'dpr':1.375,'extent':147.63636363636365,'viewport':147.63636363636363,'overflowDip':147.63636363636365-147.63636363636363,'log':'out/combo-roundoff-before.log'},'correction':'Zero only relative machine-roundoff; genuine 0.001 DIP overflow remains scrollable.'},
  {'problem':'Editable dropdown hover collapsed to a thin bar','owner':'src/scene/composed.rs','cause':'Auto-height Button retained default centered vertical alignment','correction':'Explicit Stretch fills editor height; the native hover margin remains separate from the hit area.'},
  {'problem':'Current Gallery help icons failed to mount after a fresh build','owner':'src/resources.rs','correction':'Export shared StaticResource brush dependencies from same-SDK measured compact-control palettes and SDK theme XML; validate Light, Dark and HighContrast.'},
  {'problem':'An inactive cached Frame page retained its ComboBox document input lock','owner':'packages/winui-wasm/src/scene.ts','correction':'Platform adapter excludes inactive/disconnected hosts while Rust retains popup state; reactivation restores the scope.'}],
 'preview':{'url':'http://127.0.0.1:5173/#combo-box','browser':'Independent headless Microsoft Edge; existing user browser not automated','servedWasmSha256':served,'currentFileSha256':sha('packages/winui-wasm/src/wasm/winui_bg.wasm'),'frozenSha256':frozen,'matchesFrozen':served==frozen,'fractionalDpiResults':read('out/combo-fractional.json'),'log':'out/combo-delivered-edge.log'},
 'checks':{'rust':{'passed':sum(map(int,re.findall(r'test result: ok\. (\d+) passed',rust))),'failed':bool(re.search(r'error:|test result: FAILED',rust)),'scope':'Full Rust test run, including command controls and picker foundations','log':'out/picker-foundation-rust-full.log'},'chromium':stats('out/composed-browser-results.json'),'webkit':stats('out/composed-webkit-results.json'),'motion':stats('out/composed-motion-results.json'),'regression':stats('out/composed-regression-results.json')},
 'browserCheckScope':'Composed suites include actual painted scrollbar tracks at DPR 1.25, 1.375 and 1.5625 on both renderers, editor refocus, 28 closed-faceplate states, background scroll confinement, templates and lifetime. Separate native matrix and motion reports retain their raw differences.',
 'testFixtureCorrections':['Explicit Light/Dark Rust-root backdrop and native-host background for transparent SDK scenes.','Await projected Rust checkbox state after real pointer clicks.','Count visible examples when Frame retains cached pages.','Scope renderer assertion to the sample preview; use current explicit Gallery routes and commit NumberBox edits with Enter.'],
 'historicalFixtureFailures':['out/combo-gallery-fixture-before-browser-results.json','out/combo-gallery-fixture-before-webkit-results.json','out/combo-gallery-fixture-before-regression-results.json'],
 'nativeFaceplate':'references/validation/combobox-faceplate.json',
 'nextBatch':'references/validation/picker-foundation.json',
 'remaining':['Glyph coverage, rounded-edge rasterization, desktop DWM/HostBackdrop and Store Gallery frame acceptance are not established by these patches.','Next-batch five control UIs are not yet implemented; shared Rust foundation and native fixtures are recorded separately.']}
assert served==frozen,report['preview']
assert all(row['scroll']['scrollableHeight']==0 and row['scroll']['verticalThumb'] is None for row in report['preview']['fractionalDpiResults'])
assert not report['checks']['rust']['failed']
matrix=read('references/validation/composed-controls.json')
assert matrix['wasm']['allMatricesMatchFrozenBinary'] and all(row['backendVerified'] for row in matrix['backends'].values())
report['nativeFixtureVerification']={}
for browser in ['chromium','webkit']:
 path=f'out/combo-final-native-fixtures-{browser}.log'
 log=(ROOT/path).read_text(encoding='utf-8-sig')
 passed=re.findall(r'(\d+) passed',log)
 assert passed and int(passed[-1])==8 and not re.search(r'\d+ failed',log),path
 report['nativeFixtureVerification'][browser]={'passed':8,'log':path,'includes':'Explicit Rust backdrop, all 100 actual backend kind/loss assertions and 28 faceplate states per backend'}
for name in ['chromium','webkit','motion','regression']:
 result=report['checks'][name]
 assert result['expected'] and not result['unexpected'] and not result['flaky'],(name,result)
report['sources']={p:sha(p)for p in ['src/scene/scroll.rs','src/scene/composed.rs','src/resources.rs','tools/extract-compact-controls.py','references/compact-shared-resources.json','packages/winui-wasm/src/scene.ts','packages/winui-wasm/src/scroll-input-scope.ts','gallery/tests/composed-scroll-scope.spec.ts','gallery/tests/composed-fractional-scroll.spec.ts','tests/collection_scroll.rs','tests/composed.rs','tests/shared_resources.rs']}
(ROOT/'references/validation/combo-correction.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'previewSha256':served,'checks':report['checks']},indent=2))
