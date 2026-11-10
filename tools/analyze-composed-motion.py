"""Review real native capture times against the frozen Rust clock replay."""
from pathlib import Path
import datetime, hashlib, json, math, shutil
from PIL import Image, ImageChops, ImageStat

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'out/composed-motion'
native = json.loads((ROOT / 'references/composed-controls-motion.json').read_text(encoding='utf-8-sig'))
(OUT / 'native').mkdir(exist_ok=True, parents=True)
for row in native['rows']:
    shutil.copyfile(ROOT / 'out/composed-controls-native' / row['image'], OUT / 'native' / row['image'])
report = {'recordedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'scope': '368 live same-SDK native frames, replayed at their pre-capture times. Native DWM scheduling and capture latency are retained; raw pixel errors are evidence, not an assertion of Store distribution parity.',
          'wasmSha256': hashlib.sha256((ROOT / 'out/composed-validation/packages/winui-wasm/src/wasm/winui_bg.wasm').read_bytes()).hexdigest(), 'backends': {}}
for backend in ['Canvas2D', 'WebGL2']:
    matrix = json.loads((OUT / backend / 'metrics.json').read_text())
    rows = []
    for row in matrix['rows']:
        a = Image.open(OUT / backend / row['image']).convert('RGB')
        n = Image.open(OUT / 'native' / row['image']).convert('RGB')
        assert a.size == n.size
        # Include the complete owner and popup, including the broad dialog shadow.
        candidates = [r['actual']['bounds'] for r in matrix['rows'] if r['name'] == row['name'] and r['phase'] == 'Open']
        candidates.append(row['bounds'])
        pad = 100 if row['kind'] == 'ContentDialog' else 32
        left = min(r['x'] for r in candidates) - pad
        top = min(r['y'] for r in candidates) - pad
        right = max(r['x'] + r['width'] for r in candidates) + pad
        bottom = max(r['y'] + r['height'] for r in candidates) + pad
        box = (max(0, math.floor(left * 1.25)), max(0, math.floor(top * 1.25)), min(n.width, math.ceil(right * 1.25)), min(n.height, math.ceil(bottom * 1.25)))
        diff = ImageChops.difference(n, a)
        mae = sum(ImageStat.Stat(diff.crop(box)).mean) / 3
        diff.point(lambda p: min(255, p * 4)).save(OUT / backend / row['image'].replace('.png', '-diff.png'))
        rows.append({'image': row['image'], 'name': row['name'], 'phase': row['phase'], 'requestedMs': row['requestedMs'], 'nativeCaptureStartedMs': row['captureStartedMs'], 'nativeCaptureElapsedMs': row['elapsedMs'], 'region': box, 'regionRgbMae': mae, 'actual': row['actual']})
    report['backends'][backend] = {'frames': len(rows), 'regionMeanRgbMae': sum(r['regionRgbMae'] for r in rows) / len(rows), 'rows': rows}
(ROOT / 'references/validation/composed-controls-motion.json').write_text(json.dumps(report, indent=2) + '\n')
html = '''<!doctype html><meta charset=utf-8><title>Native motion comparison</title><style>body{font:15px Segoe UI;background:#202020;color:#eee;margin:24px}select,input{margin:8px}#view{width:1000px;height:500px;position:relative}img{position:absolute;width:100%;height:100%}pre{white-space:pre-wrap}</style><h1>Live same-SDK motion replay</h1><p>Native client underneath, frozen Rust replay above. The frame times include native compositor latency. This is not Store distribution pixel acceptance.</p><select id=backend><option>Canvas2D</option><option>WebGL2</option></select><select id=state></select><label>Frame <input id=frame type=range min=0 max=22 value=0></label><label>Rust opacity <input id=mix type=range min=0 max=100 value=50></label><label><input id=diff type=checkbox>Difference ×4</label><div id=view><img id=native><img id=actual></div><pre id=details></pre><script>const report=REPORT;for(const n of [...new Set(report.backends.Canvas2D.rows.map(r=>r.name))]){let o=document.createElement('option');o.textContent=n;state.append(o)}function render(){let rows=report.backends[backend.value].rows.filter(r=>r.name===state.value);frame.max=rows.length-1;let r=rows[+frame.value];native.src='native/'+r.image;actual.src=backend.value+'/'+r.image.replace('.png',diff.checked?'-diff.png':'.png');actual.style.opacity=diff.checked?1:mix.value/100;details.textContent=JSON.stringify(r,null,2)}for(let e of [backend,state,frame,mix,diff])e.oninput=render;render()</script>'''.replace('REPORT', json.dumps(report))
(OUT / 'index.html').write_text(html)
print(json.dumps({k: {'frames': v['frames'], 'regionMeanRgbMae': v['regionMeanRgbMae']} for k, v in report['backends'].items()}, indent=2))
