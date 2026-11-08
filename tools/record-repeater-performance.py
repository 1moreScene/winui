"""Record the actual performance/visual regression artifacts and binary scope."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib, json, re
ROOT=Path(__file__).resolve().parents[1]
FROZEN=ROOT/'out/repeater-performance-delivery'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def rel(p):return p.relative_to(ROOT).as_posix()
def checks(p,expected):
 d=read(p);s=d['stats'];assert s['expected']==expected and not(s['unexpected'] or s['flaky'] or s['skipped'] or d.get('errors')),p
 return dict(path=rel(p),sha256=sha(p),**s)

for entry in read(FROZEN/'snapshot.json')['files']:
 assert sha(FROZEN/entry['path'])==entry['sha256'],entry['path']
before=read(ROOT/'out/repeater-profile-before.json');after=read(FROZEN/'out/repeater-profile-after.json')
assert not before['errors'] and not after['errors']
idle={key:dict(before=before['idle'][key]['diagnostics']['frames']-before['first'][key]['diagnostics']['frames'],after=after['idle'][key]['diagnostics']['frames']-after['first'][key]['diagnostics']['frames'])for key in after['first']}
assert all(v['after']==0 for v in idle.values())
rust_path=ROOT/'out/repeater-perf-rust-delivery.log';rust=rust_path.read_text(encoding='utf-8-sig');assert 'test result: FAILED' not in rust
count=sum(map(int,re.findall(r'test result: ok\. (\d+) passed;',rust)));assert count>=333
frozen_binary=sha(FROZEN/'gallery/src/wasm/winui_bg.wasm');current_binary=sha(ROOT/'gallery/src/wasm/winui_bg.wasm');run=read(ROOT/'out/repeater-performance-current-runtime.json');assert run['binaryUnchangedDuringRun'] and run['wasmSha256']==current_binary
paths=['src/scene/repeater.rs','src/scene/paint.rs','src/button.rs','gallery/src/react.tsx','gallery/src/RepeaterRefreshPage.tsx','gallery/src/repeater-gallery.css','gallery/tests/repeater-performance.spec.ts','tests/repeater_refresh.rs','references/repeater-button-native.json']
for path in paths:assert sha(ROOT/path)==sha(FROZEN/path),path
result=dict(recordedAtUtc=datetime.now(timezone.utc).isoformat(),galleryCommit='7360ac322414e118eadfb0c7c2f4ecc31a218f59',fullyMatchesNative=False,
 changes=['Preserve size estimates across intermediate Grid star-column measurements and finite Arrange.','Defer unknown-size template viewport expansion until the first real template is measured; never cache empty template placeholders as 32-DIP content.','Reconcile React template membership once per RealizationChanged batch, preserving per-element notifications and container identity.','Use native Button ContentPresenter VSM precedence for local Background/Foreground, with background transitions.','Reuse shared ControlExample preview, Options and source-tab presentation.'],
 measurements=dict(idleFramesOver1600ms=idle,recipesFrameP95Ms=dict(before=before['active']['recipes']['diagnostics']['frameP95Ms'],after=after['active']['recipes']['diagnostics']['frameP95Ms']),sampleScope='Single local Chromium diagnostic: page initialization, 1600 ms idle and one color-button click. Small frame sample; timings are not cross-device guarantees. Remaining startup long tasks are recorded in the full profiles.',before='out/repeater-profile-before.json',after=rel(FROZEN/'out/repeater-profile-after.json')),
 checks=dict(rust=dict(passed=count,log=rel(rust_path),scope='All frozen cargo test --locked targets, no exclusions'),performance=checks(FROZEN/'out/repeater-performance-results.json',4),regression=checks(FROZEN/'out/repeater-refresh-browser-results.json',15),production=checks(FROZEN/'out/repeater-performance-production-results.json',18),currentBinary=checks(ROOT/'out/repeater-performance-results.json',4),typescript=True,productionBuild=True,declarations=True),
 wasm=dict(frozenSha256=frozen_binary,currentSha256=current_binary,matchesCurrentBinary=frozen_binary==current_binary,currentRun='out/repeater-performance-current-runtime.json'),
 evidence=dict(sourceSnapshot=rel(FROZEN/'snapshot.json'),nativeButtonStates='references/repeater-button-native.json',nativeRun='references/repeater-button-native-run.json',screenshots=rel(FROZEN/'out/repeater-performance'),documentation='docs/repeater-performance.md'),
 files=[dict(path=path,sha256=sha(ROOT/path))for path in paths],remaining=['Full Windows Composition motion/pixel acceptance and Store-distribution parity remain unaccepted.','Startup still has long tasks from mounting the Gallery; see the recorded full-page profile.'])
(ROOT/'references/repeater-performance-validation.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
previous=read(ROOT/'references/repeater-gallery-alignment.json')
status=dict(controls=previous['controls'],phase='Repeater layout/virtualization performance, native Button states and shared Gallery presentation corrected',fullyMatchesNative=False,latestValidation='references/repeater-performance-validation.json',previousValidation='references/repeater-gallery-alignment.json',recordedAtUtc=result['recordedAtUtc'],checks=result['checks'],wasm=result['wasm'])
(ROOT/'references/repeater-refresh-status.json').write_text(json.dumps(status,indent=2)+'\n',encoding='utf-8')
print(json.dumps(dict(rust=count,idle=idle,recipesP95=result['measurements']['recipesFrameP95Ms'],production=result['checks']['production']['expected'],matchesCurrentBinary=result['wasm']['matchesCurrentBinary']),indent=2))
