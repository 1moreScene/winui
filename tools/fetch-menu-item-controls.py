"""Pin and verify the five public menu item controls against the existing baseline."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import json, hashlib, urllib.request
root = Path(__file__).resolve().parent.parent
commit = json.loads((root/'references/baseline.json').read_text())['winui']['commit']
tree = json.loads((root/'out/winui-tree.json').read_text())
tree = tree if isinstance(tree, list) else tree['tree']
names = ['MenuFlyoutItem', 'ToggleMenuFlyoutItem', 'RadioMenuFlyoutItem', 'MenuFlyoutSubItem', 'MenuFlyoutSeparator']
files = [dict(upstream=e['path'], local='references/menu-item-controls/'+e['path'].replace('/', '__'), gitBlobSha1=e['sha']) for e in tree
    if e['type']=='blob' and e['path'].endswith(('.cpp','.h','.idl','.xaml'))
    and not any(x in e['path'].lower() for x in ['test','automation','generated'])
    and any(e['path'].rsplit('/',1)[-1].startswith(n) for n in names)]
(root/'references/menu-item-controls').mkdir(exist_ok=True)
def fetch(f):
    path=root/f['local']
    data=path.read_bytes() if path.exists() else urllib.request.urlopen(f'https://raw.githubusercontent.com/microsoft/microsoft-ui-xaml/{commit}/{f["upstream"]}',timeout=45).read()
    assert hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()==f['gitBlobSha1']
    path.write_bytes(data)
    f['sha256']=hashlib.sha256(data).hexdigest()
with ThreadPoolExecutor(max_workers=5) as pool: list(pool.map(fetch,files))
(root/'references/menu-item-controls-sources.json').write_text(json.dumps(dict(commit=commit,controls=names,files=files),indent=2)+'\n')
print(f'Verified {len(files)} files')
