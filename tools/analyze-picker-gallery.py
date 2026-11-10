"""Record pinned Gallery example coverage separately from native pixel parity."""
from pathlib import Path
import datetime
import hashlib
import json
import re
import urllib.request

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return json.loads((ROOT / path).read_text(encoding='utf-8-sig'))


def digest(path):
    return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()


official = read('gallery/src/official-picker-controls.json')
assert official['commit'] == '7360ac322414e118eadfb0c7c2f4ecc31a218f59'
for source in official['sources']:
    assert digest(source['local']) == source['sha256'], source['local']
counts = {name: len(control['samples']) for name, control in official['controls'].items()}
assert sum(counts.values()) == 8
checks = {}
for name, path, expected in [
    ('Chromium', 'out/picker-gallery-results.json', 26),
    ('WebKit', 'out/picker-gallery-webkit-results.json', 26),
    ('Live5173', 'out/picker-gallery-live-results.json', 16),
]:
    stats = read(path)['stats']
    assert stats['expected'] == expected and not stats['unexpected'] and not stats['skipped'], (name, stats)
    checks[name] = stats

rust = {}
for path in ['out/picker-gallery-rust.log', 'out/picker-gallery-core.log']:
    log = (ROOT / path).read_text(encoding='utf-8-sig')
    assert not re.search(r'test result: FAILED|error:', log), path
    rust[path] = sum(map(int, re.findall(r'test result: ok\. (\d+) passed', log)))
assert sum(rust.values()) == 25
assert (ROOT / 'out/picker-gallery-typecheck.log').stat().st_size == 0
assert 'built in' in (ROOT / 'out/picker-gallery-production.log').read_text(encoding='utf-8-sig')

before = read('out/picker-gallery-live-before.json')
after = read('out/picker-gallery-live-after.json')
live_sweep = read('out/picker-gallery-live-route-sweep.json')
assert len(live_sweep['rows']) == 10 and not live_sweep['errors']
with urllib.request.urlopen('http://127.0.0.1:5173/src/wasm/winui_bg.wasm') as response:
    served = hashlib.sha256(response.read()).hexdigest()
frozen = digest('out/picker-validation/packages/winui-wasm/src/wasm/winui_bg.wasm')
report = {
    'recordedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'galleryCommit': official['commit'],
    'gallerySourceFiles': len(official['sources']),
    'exampleCounts': counts,
    'examples': {name: [sample['title'] for sample in control['samples']] for name, control in official['controls'].items()},
    'calendarIdentifiersInSourceOrder': official['calendarIdentifiers'],
    'languagesInSourceOrder': official['languages'],
    'checks': checks,
    'rust': rust,
    'typecheck': 'passed',
    'declarations': 'out/picker-gallery-declarations.log',
    'productionBuild': 'out/picker-gallery-production.log',
    'browserSuiteWasmSha256': frozen,
    'liveBuildBeforeChecks': before,
    'liveBuildAfterChecks': after,
    'sharedRuntimeStableDuringLiveChecks': before['sha256'] == after['sha256'],
    'liveRouteSweep': live_sweep,
    'servedWasmSha256AtRecording': served,
    'liveChecksMatchServedAtRecording': after['sha256'] == served,
    'liveRouteSweepIncludesServedRuntimeAtRecording': served in live_sweep['wasmResponseSha256'],
    'fullBrowserSuiteMatchesLiveBinary': frozen == after['sha256'],
    'versionScope': 'Chromium/WebKit suites use the frozen WASM. Live5173 checks run the eight Gallery examples and the six layout/motion regressions on the shared preview. Before/after stamps expose concurrent rebuilds; the route sweep records actual response-body hashes. No full-suite certification is inferred for any later shared binary.',
    'scope': [
        'Pinned page XAML and SampleDefinition .txt files determine the eight example titles and their order.',
        'CalendarView uses the original options and language/calendar lists; no invented event output.',
        'DatePicker day/weekday pattern, two-month default and current-year through five-year range execute in the real SDK.',
        'TimePicker shows both 12/24 hour clocks using the same current local time.',
        'ColorPicker options drive real Rust state and the Shape rectangle preview, including the gradient border resource.',
        'Both renderers cover selection, flyout commit/dismiss, text sizing and calendar motion regressions.',
    ],
    'remaining': [
        'Nine non-Gregorian calendars remain disabled; the SDK explicitly rejects them.',
        'Languages lacking browser Intl data remain disabled; Windows language support is not simulated.',
        'The supported DayFormat tokens do not implement arbitrary WinRT DateTimeFormatter patterns.',
        'Gallery case coverage does not establish full Store Gallery/DWM or frame-by-frame pixel parity.',
    ],
    'sourceFiles': {path: digest(path) for path in [
        'tools/extract-picker-controls.py', 'gallery/src/official-picker-controls.json',
        'gallery/src/PickerControlsPage.tsx', 'gallery/src/picker-gallery.css',
        'gallery/src/GalleryControls.tsx', 'packages/winui-wasm/src/picker-controls-types.ts',
        'src/scene/picker_controls.rs', 'src/scene/picker_controls/input.rs',
        'src/scene/picker_controls/layout.rs', 'src/shapes.rs',
    ]},
}
(ROOT / 'references/validation/picker-gallery.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
status = read('references/picker-controls-status.json')
status['galleryDisplay'] = {
    'commit': official['commit'], 'sourceFiles': len(official['sources']),
    'examples': sum(counts.values()), 'validation': 'references/validation/picker-gallery.json',
}
(ROOT / 'references/picker-controls-status.json').write_text(json.dumps(status, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'examples': counts, 'checks': checks, 'rust': rust, 'liveMatchesServed': report['liveChecksMatchServedAtRecording']}, indent=2))
