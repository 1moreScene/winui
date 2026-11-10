"""Record reproducible Gallery alignment evidence, with explicit binary scopes."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
FROZEN = ROOT / 'out/repeater-gallery-final'


def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def relative(path):
    return path.relative_to(ROOT).as_posix()


def browser(path):
    data = read(path)
    stats = data['stats']
    assert stats['unexpected'] == stats['flaky'] == stats['skipped'] == 0, path
    assert stats['expected'] > 0 and not data.get('errors'), path
    return dict(path=relative(path), sha256=sha(path), **stats)


snapshot = read(FROZEN / 'snapshot.json')
for entry in snapshot['files']:
    assert sha(FROZEN / entry['path']) == entry['sha256'], entry['path']
winui = read(ROOT / 'references/repeater-refresh-sources.json')
for entry in winui['files']:
    assert sha(ROOT / entry['local']) == entry['sha256'], entry['local']
gallery = read(ROOT / 'references/repeater-refresh-gallery.json')
official = read(FROZEN / 'gallery/src/official-repeater-refresh.json')['_repository']
native = read(ROOT / 'references/repeater-refresh-native.json')
rust_log = ROOT / 'out/repeater-gallery-rust.log'
rust_text = rust_log.read_text(encoding='utf-8-sig')
assert 'test result: FAILED' not in rust_text
rust_count = sum(map(int, re.findall(r'test result: ok\. (\d+) passed;', rust_text)))
assert rust_count >= 315
geometry = {}
for backend in ['Canvas2D', 'WebGL2', 'gallery-dependencies']:
    path = FROZEN / f'out/repeater-refresh-geometry/{backend}.json'
    data = read(path)
    geometry[backend] = dict(path=relative(path), states=len(data), maxDip=max(row['maxDip'] for row in data))
    assert geometry[backend]['maxDip'] <= 0.81

own_files = [
    'src/scene/repeater.rs', 'src/scene/refresh.rs',
    'src/scene/collections.rs', 'src/scene/layout.rs',
    'gallery/src/RepeaterRefreshPage.tsx', 'gallery/src/repeater-gallery-data.ts',
    'gallery/src/repeater-gallery.css', 'packages/winui-wasm/src/repeater-refresh-types.ts',
    'gallery/src/GalleryControls.tsx',
    'gallery/src/official-repeater-refresh.json',
    'gallery/tests/repeater-gallery.spec.ts', 'gallery/tests/repeater-refresh.spec.ts',
    'gallery/tests/repeater-refresh-production.spec.ts',
    'gallery/tests/repeater-refresh-types.tsx',
    'references/repeater-gallery-resources.json', 'tests/repeater_refresh.rs',
]
for path in own_files:
    assert sha(ROOT / path) == sha(FROZEN / path), path
frozen_wasm = FROZEN / 'packages/winui-wasm/src/wasm/winui_bg.wasm'
current_wasm = ROOT / 'packages/winui-wasm/src/wasm/winui_bg.wasm'
current_run = read(ROOT / 'out/repeater-gallery-current-runtime.json')
assert current_run['binaryUnchangedDuringRun']
assert current_run['wasmSha256'] == sha(current_wasm)
checks = dict(
    rust=dict(passed=rust_count, log=relative(rust_log), scope='All targets of frozen cargo test --locked; no exclusions.'),
    browser=browser(FROZEN / 'out/repeater-refresh-browser-results.json'),
    production=browser(FROZEN / 'out/repeater-refresh-production-results.json'),
    currentBinaryBrowser=browser(ROOT / 'out/repeater-refresh-browser-results.json'),
    typescript=True, productionBuild=True, declarations=True,
    buildLogs=[relative(FROZEN / f'out/repeater-gallery-{kind}.log') for kind in ['typecheck', 'vite', 'declarations']],
)
assert checks['browser']['expected'] == checks['currentBinaryBrowser']['expected'] == 15
assert checks['production']['expected'] == 10
status = dict(
    recordedAtUtc=datetime.now(timezone.utc).isoformat(),
    controls=['ItemsRepeater', 'StackLayout', 'UniformGridLayout', 'RefreshContainer', 'RefreshVisualizer'],
    phase='Official Gallery runtime cases aligned, with Rust layout and input dependencies',
    fullyMatchesNative=False,
    galleryCommit=gallery['commit'], sourceCommit=winui['commit'],
    galleryFiles=len(gallery['files']), sourceFiles=len(winui['files']),
    officialSamples=official['pages'], nativeStates=len(native['rows']),
    defaultBackend='Canvas2D', optionalBackend='WebGL2',
    checks=checks, geometry=geometry,
    wasm=dict(
        frozenSha256=sha(frozen_wasm), currentSha256=sha(current_wasm),
        matchesCurrentBinary=sha(frozen_wasm) == sha(current_wasm),
        frozenBinaryScope=f'{rust_count} Rust tests; Chromium Canvas2D/WebGL2; production Chromium/WebKit Canvas2D; native geometry.',
        currentBinaryScope='Independent Chromium rerun with current workspace binary. Other sessions continue editing shared SDK files.',
        currentRun='out/repeater-gallery-current-runtime.json',
    ),
    evidence=dict(
        documentation='docs/repeater-gallery-alignment.md',
        native='references/repeater-refresh-native.json',
        nativeRun='references/repeater-refresh-native-run.json',
        sourceSnapshot='out/repeater-gallery-final/snapshot.json',
        screenshots='out/repeater-gallery-final/out/repeater-refresh-presentation',
        refreshNaturalSize='references/repeater-gallery-refresh-measures.json',
        nativeSha256=sha(ROOT / 'references/repeater-refresh-native.json'),
        refreshNaturalSizeSha256=sha(ROOT / 'references/repeater-gallery-refresh-measures.json'),
    ),
    files=[dict(path=path, sha256=sha(ROOT / path)) for path in own_files],
    remaining=[
        'Windows DirectManipulation inertia, damping, elastic rebound and Composition frame-by-frame parity remain unaccepted.',
        'Complete native UIA/XYFocus and Store-distribution pixel acceptance remain.',
        'Arbitrary custom VirtualizingLayout/IElementFactory and RecyclePool contracts are not implemented.',
        'Unknown item size estimation, exact scroll anchoring and complete ItemsSourceView semantics remain.',
        'Random recipe data follows the source rules, not an identical cross-language random sequence.',
        'Gallery custom layouts use safe tail and unknown-size handling instead of preserving original C# boundary/cache defects.',
    ],
)
historical = ROOT / 'references/repeater-refresh-initial-status.json'
if not historical.exists():
    historical.write_bytes((ROOT / 'references/repeater-refresh-status.json').read_bytes())
status['previousValidation'] = relative(historical)
for path in ['references/repeater-gallery-alignment.json', 'references/repeater-refresh-status.json']:
    (ROOT / path).write_text(json.dumps(status, indent=2) + '\n', encoding='utf-8')
print(json.dumps(dict(rust=rust_count, browser=checks['browser']['expected'], production=checks['production']['expected'], currentBinaryBrowser=checks['currentBinaryBrowser']['expected'], geometry=geometry, matchesCurrentBinary=status['wasm']['matchesCurrentBinary']), indent=2))
