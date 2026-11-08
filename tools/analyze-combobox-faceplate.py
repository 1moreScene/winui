"""Compare closed faceplate patches without diluting errors in empty windows."""
from pathlib import Path
import datetime
import hashlib
import json
from PIL import Image, ImageChops, ImageStat

ROOT = Path(__file__).resolve().parent.parent


def read(path):
    return json.loads((ROOT / path).read_text(encoding='utf-8-sig'))


def digest(path):
    return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()


native = read('out/faceplate-native/combo-faceplate.json')
report = {
    'recordedAtUtc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'scope': 'Closed ComboBox at 1.25 DPR: 28 explicit same-SDK VSM fixtures, Light/Dark, editable/readonly. Flat background and straight edges exclude text, glyphs, rounded corners and the intentionally suppressed focus ring; this is not whole-control pixel acceptance.',
    'nativeRun': read('references/combo-faceplate-run.json'),
    'backends': {},
    'wasmSha256': digest('out/composed-validation/gallery/src/wasm/winui_bg.wasm'),
    'scrollScope': 'Rust owns active popup root, hit routing and boundary consumption. The SDK document adapter projects that scope onto native DOM wheel, touch, keyboard and background pointer input. Closing/disposal releases it.',
    'overflowFix': 'Canonical physical cross constraint preserves adaptive template measurements. ScrollState discards relative floating-point roundoff in extent minus viewport, including the 2.84e-14 DIP residue at 1.375 DPR. The short font sample has zero scrollableHeight and no vertical thumb; true subpixel overflow remains scrollable.',
    'performanceBefore': read('out/combobox-performance-before.json'),
    'performanceAfter': read('out/combobox-performance-after.json'),
    'remaining': ['DWrite/browser glyph coverage, rounded-edge rasterization, and desktop DWM versus browser composition remain separate from these patch comparisons.', 'Performance is a local headless Chrome benchmark, not a cross-device frame-rate guarantee.'],
}
for browser, screenshot_root in [('chromium', 'out/combo-faceplate'), ('webkit', 'out/composed-webkit/faceplate')]:
    browser_report = {}
    for backend in ['Canvas2D', 'WebGL2']:
        rows = []
        for row in native['rows']:
            name = row['name']
            expected = Image.open(ROOT / 'out/faceplate-native' / (name + '.png')).convert('RGB')
            actual = Image.open(ROOT / screenshot_root / backend / (name + '.png')).convert('RGB')
            r = row['bounds']
            left, right = [round((r['x'] + v) * 1.25) for v in [90, 170]]
            top, bottom = [round(v * 1.25) for v in [r['y'], r['y'] + r['height']]]
            difference = ImageChops.difference(expected, actual)
            patches = {'body': (left, top + 8, right, bottom - 8), 'topEdge': (left, top, right, top + 1), 'bottomEdge': (left, bottom - 1, right, bottom), 'arrowUpper': (round((r['x']+218)*1.25),round((r['y']+6)*1.25),round((r['x']+230)*1.25),round((r['y']+10)*1.25))}
            errors = {key: sum(ImageStat.Stat(difference.crop(box)).mean) / 3 for key, box in patches.items()}
            rows.append({'name': name, 'patchRgbMae': errors})
        browser_report[backend] = {'rows': rows, 'maxPatchRgbMae': max(v for row in rows for v in row['patchRgbMae'].values())}
    report['backends' if browser == 'chromium' else 'webkitBackends'] = browser_report
report['performanceMatchesFrozenBinary'] = all(row['buildVersion'] == report['wasmSha256'] for row in report['performanceAfter']['rows'])
(ROOT / 'references/validation/combobox-faceplate.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'maxPatchRgbMae': {k: v['maxPatchRgbMae'] for k, v in report['backends'].items()}, 'performanceMatchesFrozenBinary': report['performanceMatchesFrozenBinary']}, indent=2))
