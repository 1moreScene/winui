"""Record only successful runs, preserving frozen/current binary distinctions."""
from pathlib import Path
from datetime import datetime,timezone
import hashlib,json,re
ROOT=Path(__file__).resolve().parents[1]
FROZEN=ROOT/'out/repeater-refresh-delivery'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def browser(path):
 data=read(path);stats=data['stats'];assert stats['unexpected']==0 and stats['expected']>0,path
 return dict(path=path.relative_to(ROOT).as_posix(),**stats)
rust_logs=['out/repeater-refresh-rust-final.log','out/repeater-refresh-menu-regression.log','out/repeater-refresh-unit-final.log']
rust_count=0
for log in rust_logs:
 text=(ROOT/log).read_text(encoding='utf-8-sig');assert 'test result: FAILED' not in text,log
 rust_count+=sum(map(int,re.findall(r'test result: ok\. (\d+) passed;',text)))
frozen_wasm=FROZEN/'packages/winui-wasm/src/wasm/winui_bg.wasm';current_wasm=ROOT/'packages/winui-wasm/src/wasm/winui_bg.wasm'
geometry={}
for backend in ['Canvas2D','WebGL2']:
 p=FROZEN/f'out/repeater-refresh-geometry/{backend}.json';data=read(p);geometry[backend]=dict(states=len(data),maxDip=max(v['maxDip'] for v in data),path=p.relative_to(ROOT).as_posix())
own=['src/scene/repeater.rs','src/scene/refresh.rs','packages/winui-wasm/src/repeater-refresh-types.ts','gallery/src/RepeaterRefreshPage.tsx','gallery/tests/repeater-refresh.spec.ts','gallery/tests/repeater-refresh-types.tsx','gallery/src/official-repeater-refresh.json']
status=dict(recordedAtUtc=datetime.now(timezone.utc).isoformat(),controls=['ItemsRepeater','StackLayout','UniformGridLayout','RefreshContainer','RefreshVisualizer'],phase='Rust controls, typed TS/React API, Gallery and scoped validation implemented',fullyMatchesNative=False,sourceCommit=read(ROOT/'references/baseline.json')['winui']['commit'],sourceFiles=len(read(ROOT/'references/repeater-refresh-sources.json')['files']),nativeStates=len(read(ROOT/'references/repeater-refresh-native.json')['rows']),defaultBackend='Canvas2D',optionalBackend='WebGL2',checks=dict(rust=dict(passed=rust_count,logs=rust_logs,scope='Frozen source, all integration targets plus library tests; menu target run separately after the initial shared-workspace failure.'),browser=browser(FROZEN/'out/repeater-refresh-browser-results.json'),production=browser(FROZEN/'out/repeater-refresh-production-results.json'),currentBinaryBrowser=browser(ROOT/'out/repeater-refresh-browser-results.json'),typescript=True,productionBuild=True,declarations=True),geometry=geometry,wasm=dict(frozenSha256=sha(frozen_wasm),currentSha256=sha(current_wasm),matchesCurrentBinary=sha(frozen_wasm)==sha(current_wasm),frozenBinaryScope='Native geometry matrix and Chromium Canvas2D/WebGL2; production Chromium and WebKit Canvas2D.',currentBinaryScope='Independent Chromium Canvas2D/WebGL2 rerun. The current workspace includes other sessions changes after the frozen Rust snapshot.'),evidence=dict(documentation='docs/repeater-refresh.md',native='references/repeater-refresh-native.json',nativeRun='references/repeater-refresh-native-run.json',sourceSnapshot='out/repeater-refresh-delivery/snapshot.json',screenshots='out/repeater-refresh-delivery/out/repeater-refresh-presentation'),files=[dict(path=p,sha256=sha(ROOT/p)) for p in own],remaining=['Arbitrary VirtualizingLayout/IElementFactory and native RecyclePool reuse are not implemented.','GetOrCreateElement forced realization and pinning, full ItemsSourceView mutation semantics and exact unknown-size scroll anchoring remain.','Windows DirectManipulation/InteractionTracker inertia, elastic rebound and Composition frame timing are not accepted as equivalent.','Complete native UIA/XYFocus and Store-distribution pixel acceptance remain.','Independent same-SDK RenderTargetBitmap cannot validate RefreshVisualizer Composition rotation.'])
(ROOT/'references/repeater-refresh-status.json').write_text(json.dumps(status,indent=2)+'\n',encoding='utf-8')
print(json.dumps(dict(rust=rust_count,browser=status['checks']['browser']['expected'],production=status['checks']['production']['expected'],currentBinaryBrowser=status['checks']['currentBinaryBrowser']['expected'],geometry=geometry,matchesCurrentBinary=status['wasm']['matchesCurrentBinary']),indent=2))
