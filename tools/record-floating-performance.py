"""Record a matched frozen binary/app validation; never imply current-root or Store parity."""
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from urllib.request import urlopen
from PIL import Image, ImageChops, ImageStat
import gzip
import json
import re

ROOT = Path(__file__).resolve().parents[1]

def read(path):
    return json.loads((ROOT / path).read_text(encoding='utf-8-sig'))

def save(path, value):
    (ROOT / path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

def log(path):
    return (ROOT / path).read_text(encoding='utf-8-sig')

runtime = 'out/command-menu-expansion-runtime'
app = 'out/collections-5255-app-runtime'
stamp = read(f'{runtime}/build-stamp.json')
expected = stamp['sha256']
binary = (ROOT / runtime / 'winui_bg.wasm').read_bytes()
assert sha256(binary).hexdigest() == expected
assert sha256(urlopen('http://127.0.0.1:5197/src/wasm/winui_bg.wasm').read()).hexdigest() == expected
assert read(f'{app}/manifest.json') == read('out/collections-5197-app-runtime/manifest.json')
assets = list((ROOT / 'out/overlay-command-expanded-dist').rglob('*.wasm'))
assert len(assets) == 1 and sha256(assets[0].read_bytes()).hexdigest() == expected

for name in ['clippy', 'wasm-clippy']:
    text = log(f'out/command-menu-expansion-{name}.log')
    assert 'Finished' in text and 'error:' not in text
assert 'Finished' in log('out/overlay-expanded-workspace-check.log')
assert '14 passed' in log('out/overlay-expanded-workspace-command-tests.log')
for name in ['typecheck', 'declarations']:
    assert 'error TS' not in log(f'out/command-menu-expansion-{name}.log')
assert 'built in' in log('out/command-menu-expansion-vite.log')
assert '4 passed' in log('out/command-menu-expansion-deployment.log')
rust = log('out/command-menu-expansion-all-rust.log')
assert 'FAILED' not in rust and 'error:' not in rust
rust_count = sum(map(int, re.findall(r'test result: ok\. (\d+) passed', rust)))
stats = read('out/overlay-regression-browser-results.json')['stats']
assert stats['expected'] == 25 and not any(stats[k] for k in ['unexpected', 'flaky', 'skipped'])
visual = read('references/command-controls-expanded-visual.json')
assert len(visual['cases']) == 104 and not visual['errors'] and visual['runtime']['sha256'] == expected

snapshot = ROOT / 'out/command-menu-start-source'
manifest = read('out/command-menu-start-source/snapshot.json')
manifest['files'] = [{'path': p.relative_to(snapshot).as_posix(), 'sha256': sha256(p.read_bytes()).hexdigest()}
                     for p in sorted(snapshot.rglob('*')) if p.is_file() and p.name != 'snapshot.json']
manifest['rustFiles'] = [f for f in manifest['files'] if f['path'].endswith('.rs')]
manifest['verifiedRuntimeSha256'] = expected
manifest['overlaidWorkingTreeFiles'] = [
    'src/enums.rs', 'src/scene/command_controls.rs', 'src/scene/command_controls/input.rs',
    'src/scene/command_controls/layout.rs', 'src/scene/command_controls/paint.rs',
    'src/scene/layout.rs', 'src/scene/mod.rs', 'src/scene/input.rs', 'src/scene/paint.rs',
    'src/wasm.rs', 'tests/command_controls.rs', 'references/api-enums.json']
save('out/command-menu-start-source/snapshot.json', manifest)

performance = {}
for background in ['stripes', 'uniform']:
    prefix = '' if background == 'stripes' else 'uniform-'
    before = read(f'references/validation/overlay-performance-{prefix}before.json')
    after = read(f'references/validation/overlay-performance-{prefix}expanded.json')
    assert after['runtimeSha256'] == expected and len(after['results']) == 30 and not after['errors']
    before_rows = {(r['backend'], r['profile']): r for r in before['results']}
    performance[background] = [{
        'backend': row['backend'], 'profile': row['profile'],
        'beforeP50Ms': before_rows[row['backend'], row['profile']]['p50Ms'],
        'afterP50Ms': row['p50Ms'],
        'beforeP95Ms': before_rows[row['backend'], row['profile']]['p95Ms'],
        'afterP95Ms': row['p95Ms'],
        'beforeReadbackMs': before_rows[row['backend'], row['profile']]['readbackMs'],
        'afterReadbackMs': row['readbackMs'],
    } for row in after['results']]

pixels = []
for backend in ['Canvas2D', 'WebGL2']:
    for profile in ['CommandBar', 'Flyout', 'MenuFlyout', 'ToolTip', 'ComboBox', 'NestedFlyouts']:
        a = Image.open(ROOT / f'out/overlay-performance-before-images/{backend}-{profile}.png').convert('RGBA')
        b = Image.open(ROOT / f'out/overlay-performance-expanded-images/{backend}-{profile}.png').convert('RGBA')
        assert a.size == b.size
        difference = ImageChops.difference(a, b)
        pixels.append({'backend': backend, 'profile': profile,
                       'maxChannelDifference': max(v[1] for v in difference.getextrema()),
                       'meanRGBDifference': ImageStat.Stat(difference).mean[:3]})

baseline = (ROOT / 'out/overlay-performance-before-runtime/winui_bg.wasm').read_bytes()
current = (ROOT / 'packages/winui-wasm/src/wasm/winui_bg.wasm').read_bytes()
root_changes = [f['path'] for f in manifest['rustFiles']
                if not (ROOT / f['path']).exists() or sha256((ROOT / f['path']).read_bytes()).hexdigest() != f['sha256']]
app_changes = [f['path'] for f in read(f'{app}/manifest.json')['files']
               if not (ROOT / 'gallery/src' / f['path']).exists()
               or sha256((ROOT / 'gallery/src' / f['path']).read_bytes()).hexdigest() != f['sha256']]
record = {
    'recordedAt': datetime.now(timezone.utc).isoformat(),
    'runtime': {**stamp, 'url': 'http://127.0.0.1:5197/#app-bar-separator',
                'frozenRuntime': runtime, 'frozenApplication': app,
                'production': 'out/overlay-command-expanded-dist', 'productionWasmAssets': 1,
                'matchesCurrentBinary': sha256(current).hexdigest() == expected,
                'sharedRustFilesDifferentFromSnapshot': root_changes,
                'sharedApplicationFilesDifferentFromSnapshot': app_changes},
    'isolation': 'Built from out/command-menu-start-source to exclude concurrently unfinished picker_controls UI wiring. Other chat code in root is preserved. Current shared workspace cargo check also passed; that is not a same-binary runtime acceptance.',
    'validation': {'rustTests': rust_count, 'browserTests': 25, 'deployedSmokeTests': 4,
                   'sharedWorkspaceCommandTests': 14,
                   'strictHostAndWasmClippy': True, 'typescriptStrict': True,
                   'declarations': True, 'viteProduction': True, 'nativeStaticComparisons': 104,
                   'maximumRootErrorDIP': max(abs(v) for c in visual['cases'] for v in c['dimensionError']),
                   'maximumPartErrorDIP': max(c['partGeometryError'] for c in visual['cases']),
                   'maximumPopupErrorDIP': max(c.get('popupGeometryError', 0) for c in visual['cases'])},
    'primaryExpansion': {'openMs': 250, 'closeMs': 167, 'logicalCompactHeightDIP': 48,
                         'targetsMeasuredLabelHeight': True, 'reserveVisualExtentOnce': True,
                         'interruptionAndBelowCompactHitTest': True, 'explicitClipAndReducedMotion': True,
                         'moreGlyphAnimated': False, 'actualExampleCapture': 'out/appbar-separator-expanded.png'},
    'performanceMethod': 'Release WASM, 720x480 DIP, DPR1.25, 36 deterministic scene_frame calls per profile, 15 profiles x 2 backends x 2 backgrounds. Includes layout, paint, serialization and test JSON parse; excludes DOM projection/RAF/GPU completion. Local shared machine, not a cross-device guarantee.',
    'performance': performance,
    'realGalleryRAF': {'before': read('references/validation/overlay-raf-before.json'),
                       'after': read('references/validation/overlay-raf-expanded.json'),
                       'afterRuntimeSha256': expected},
    'settledOverlayPixelsBeforeAfter': pixels,
    'binarySize': {'beforeBytes': len(baseline), 'afterBytes': len(binary),
                   'beforeGzipBytes': len(gzip.compress(baseline)), 'afterGzipBytes': len(gzip.compress(binary)),
                   'note': 'opt-level s to 3 plus new command controls and expansion; this is not an isolated compiler-profile size comparison.'},
    'remaining': ['Some complex/stacked InApp Acrylic cases still exceed 16.7 ms p95.',
                  'Native references reuse matched SDK static probes, not new Store or GPU present-time captures.',
                  'Full OpenUp/custom-template/UIA combinations and browser/native font rasterization parity remain.'],
    'nextBatch': {'implemented': ['AppBarSeparator'],
                  'fixedSourceOnly': ['MenuBar', 'CommandBarFlyout', 'XamlUICommand', 'StandardUICommand']},
}
save('references/validation/overlay-performance-summary.json', record)
status = read('references/command-controls-status.json')
# Preserve the previously accepted record; its served URL now points at the newer runtime.
if not (ROOT / 'references/command-controls-before-floating-status.json').exists():
    save('references/command-controls-before-floating-status.json', status)
status['recordedAt'] = record['recordedAt']
status['validation'].update(record['validation'])
status['validation']['productionWasmMatchesTested'] = True
status['validation']['meanImageError'] = sum(c['meanAbsoluteColorError'] for c in visual['cases']) / len(visual['cases'])
status['validation']['maximumImageError'] = max(c['meanAbsoluteColorError'] for c in visual['cases'])
status['runtime'] = record['runtime']
status['floatingPerformance'] = 'references/validation/overlay-performance-summary.json'
status['primaryExpansion'] = record['primaryExpansion']
save('references/command-controls-status.json', status)
print(json.dumps({'runtime': expected, 'rustTests': rust_count, 'browserTests': 25, 'deployedSmokeTests': 4}))
