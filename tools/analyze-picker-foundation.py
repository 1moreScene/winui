"""Compare Rust spectrum pixels with native interiors, excluding selection chrome.

This is CPU bitmap validation, not control, backend, ring-edge or animation acceptance.
"""
from pathlib import Path
import datetime, hashlib, json, math, re
from PIL import Image, ImageChops, ImageStat, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'out/picker-raster'
native = json.loads((ROOT / 'references/picker-controls-native.json').read_text(encoding='utf-8-sig'))
rows = []
for shape, state in [('box', 'Selected'), ('ring', 'Ring')]:
    raw = (OUT / f'spectrum-{shape}.rgba').read_bytes()
    bitmap = Image.frombytes('RGBA', (256, 256), raw).convert('RGB')
    bitmap.save(OUT / f'spectrum-{shape}.png')
    for theme in ['Light', 'Dark']:
        row = next(r for r in native['rows'] if r['theme'] == theme and r['kind'] == 'ColorPicker' and r['state'] == state)
        parts = {p['name']: p for p in row['parts']}
        rect = parts['SpectrumRectangle' if shape == 'box' else 'SpectrumEllipse']['bounds']
        scale = 1.25
        box = tuple(round(n * scale) for n in [rect['x'], rect['y'], rect['x']+rect['width'], rect['y']+rect['height']])
        actual = bitmap.resize((box[2]-box[0], box[3]-box[1]), Image.Resampling.BILINEAR)
        reference = Image.open(ROOT / 'out/picker-native' / (row['name']+'.png')).convert('RGB').crop(box)
        mask = Image.new('L', actual.size)
        draw = ImageDraw.Draw(mask)
        if shape == 'box': draw.rectangle((8, 8, actual.width-9, actual.height-9), fill=255)
        else: draw.ellipse((8, 8, actual.width-9, actual.height-9), fill=255)
        ellipse = parts['SelectionEllipsePanel']['bounds']
        draw.rectangle(tuple((v * scale) for v in [ellipse['x']-rect['x']-2,ellipse['y']-rect['y']-2,ellipse['x']-rect['x']+ellipse['width']+2,ellipse['y']-rect['y']+ellipse['height']+2]), fill=0)
        diff = ImageChops.difference(reference, actual)
        error = sum(ImageStat.Stat(diff, mask).mean)/3
        diff.point(lambda p:min(255,p*4)).save(OUT / (row['name']+'-cpu-diff.png'))
        rows.append({'theme':theme,'shape':shape,'comparedPixels':sum(mask.histogram()[128:]),'interiorRgbMae':error,'native':row['name']})
report = {'recordedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'status':'Value and CPU spectrum foundation validated; control UI coverage is recorded in picker-controls.json',
    'controls':['CalendarView','CalendarDatePicker','DatePicker','TimePicker','ColorPicker'],
    'scope':'Gregorian date-only arithmetic, local minute values and HSV/ARGB conversions. CPU spectrum interior pixels compared to same-SDK HueSaturation Box/Ring fixtures. No browser control or animation parity claim.',
    'nativeRun':'references/picker-controls-run.json','nativeStates':len(native['rows']),
    'spectrum':{'rows':rows,'excluded':['Selection ellipse','Outer ring edge and clipping','Other spectrum component combinations','Canvas2D/WebGL2 presentation']},
    'tests':{'log':'out/picker-foundation-tests.log'},
    'remaining':['Wire five Rust control trees, layout, input, events and popup lifetimes.',
        'Expose typed TS/React factories and Gallery examples only when their Rust control kinds exist.',
        'Verify locale calendars, date/time field ordering, wheel input, keyboard and accessibility.',
        'Compare control geometry, materials, hover and animations in both browser backends; Store Gallery acceptance remains separate.']}
log = ROOT/'out/picker-foundation-tests.log'
if log.exists(): report['tests'].update(passed=sum(map(int,re.findall(r'test result: ok\. (\d+) passed',log.read_text(encoding='utf-8-sig')))),failed=bool(re.search(r'error:|test result: FAILED',log.read_text(encoding='utf-8-sig'))))
report['sourceFiles']={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [ROOT/'src/picker_value.rs',ROOT/'src/picker_spectrum.rs',ROOT/'references/picker-controls-template.json',ROOT/'references/picker-controls-sources.json']}
(ROOT/'references/validation/picker-foundation.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
sources=json.loads((ROOT/'references/picker-controls-sources.json').read_text(encoding='utf-8'))
template=json.loads((ROOT/'references/picker-controls-template.json').read_text(encoding='utf-8'))
status={'recordedAt':report['recordedAt'],'controls':report['controls'],'phase':'Rust value/spectrum foundation implemented; Scene controls and public UI not implemented','implementedControlKinds':[],
    'sourceCommit':sources['commit'],'sourceFiles':len(sources['files']),'sdkStyles':len(template['styles']),
    'nativeStates':report['nativeStates'],'rustTests':report['tests'],'validation':'references/validation/picker-foundation.json','remaining':report['remaining']}
if not (ROOT/'references/validation/picker-controls.json').exists():
    (ROOT/'references/picker-controls-status.json').write_text(json.dumps(status,indent=2)+'\n',encoding='utf-8')
assert all(r['interiorRgbMae'] < 2 for r in rows), rows
print(json.dumps({'nativeStates':report['nativeStates'],'spectrum':rows},indent=2))
