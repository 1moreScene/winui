"""Fetch fixed-version behavior, templates and property defaults for navigation controls."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import json, urllib.request, hashlib
ROOT = Path(__file__).resolve().parent.parent
COMMIT = '7b12709347527238494ca28cb9fed326d513e779'
tree = json.loads((ROOT/'out/winui-tree.json').read_text(encoding='utf8'))
tree = tree if isinstance(tree,list) else tree['tree']
dirs = ['controls/dev/Breadcrumb/','controls/dev/PipsPager/','controls/dev/TreeView/','controls/dev/TabView/']
extra = ['FlipView_Partial.cpp','FlipView_Partial.h','FlipView_themeresources.xaml','FlipViewItem_themeresources.xaml']
entries = [e for e in tree if e['type']=='blob' and (
    any(e['path'].startswith(d) and '/' not in e['path'][len(d):] for d in dirs)
    and e['path'].endswith(('.cpp','.h','.xaml','.idl'))
    or e['path'].rsplit('/',1)[-1] in extra and '/winrtgeneratedclasses/' not in e['path']
    or e['path'].startswith('controls/dev/Generated/') and e['path'].rsplit('/',1)[-1] in [n+'.properties.cpp' for n in ['PipsPager','TabView','TreeView','TreeViewItem','BreadcrumbBar']])]
def fetch(e):
    target = ROOT/'references/winui'/e['path'].rsplit('/',1)[-1]
    if target.exists(): data = target.read_bytes()
    else:
        data = urllib.request.urlopen(f'https://raw.githubusercontent.com/microsoft/microsoft-ui-xaml/{COMMIT}/{e["path"]}',timeout=45).read()
        target.write_bytes(data)
    assert hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()==e['sha'],e['path']
    return {'local':target.relative_to(ROOT).as_posix(),'upstream':e['path'],'gitBlobSha1':e['sha'],'sha256':hashlib.sha256(data).hexdigest()}
with ThreadPoolExecutor(max_workers=5) as pool: files=list(pool.map(fetch,entries))
(ROOT/'references/navigation-controls-sources.json').write_text(json.dumps({'commit':COMMIT,'files':files},indent=2)+'\n',encoding='utf8')
print('Verified',len(files),'navigation control sources')
