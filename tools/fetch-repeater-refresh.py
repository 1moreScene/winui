"""Fetch the fixed baseline sources; validate each upstream Git blob."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import json, hashlib, urllib.request
ROOT = Path(__file__).resolve().parent.parent
COMMIT = json.loads((ROOT/'references/baseline.json').read_text())['winui']['commit']
tree = json.loads((ROOT/'out/winui-tree.json').read_text())
tree = tree if isinstance(tree, list) else tree['tree']
names = ['ItemsRepeater', 'StackLayout', 'UniformGridLayout', 'FlowLayout', 'FlowLayoutAlgorithm', 'ElementManager', 'ViewManager', 'ViewportManager', 'RefreshContainer', 'RefreshVisualizer', 'RefreshRequestedEventArgs', 'RefreshInteractionRatioChangedEventArgs', 'RefreshInfoProviderImpl', 'RefreshStateChangedEventArgs']
files = []
for entry in tree:
    p = entry['path']
    if entry['type'] != 'blob' or not p.endswith(('.cpp', '.h', '.idl', '.xaml')) or any(v in p.lower() for v in ['test', 'automation', 'generated']): continue
    if ('/Repeater/' in p or '/PullToRefresh/' in p) and any(p.rsplit('/',1)[-1].startswith(n) for n in names):
        files.append(dict(upstream=p, local='references/repeater-refresh/'+p.rsplit('/',1)[-1], gitBlobSha1=entry['sha']))
(ROOT/'references/repeater-refresh').mkdir(exist_ok=True)
def fetch(f):
    target = ROOT/f['local']
    data = target.read_bytes() if target.exists() else urllib.request.urlopen(f'https://raw.githubusercontent.com/microsoft/microsoft-ui-xaml/{COMMIT}/{f["upstream"]}', timeout=45).read()
    assert hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest() == f['gitBlobSha1'], f['upstream']
    target.write_bytes(data)
    f['sha256'] = hashlib.sha256(data).hexdigest()
with ThreadPoolExecutor(max_workers=5) as pool: list(pool.map(fetch, files))
(ROOT/'references/repeater-refresh-sources.json').write_text(json.dumps(dict(commit=COMMIT, controls=['ItemsRepeater','StackLayout','UniformGridLayout','RefreshContainer','RefreshVisualizer'], files=files), indent=2)+'\n')
print(f'Verified {len(files)} source files')
