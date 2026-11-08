"""Fetch the fixed command/menu batch; validate each upstream Git blob."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import json,urllib.request,hashlib
ROOT=Path(__file__).resolve().parents[1]
COMMIT='7b12709347527238494ca28cb9fed326d513e779'
tree=json.loads((ROOT/'out/winui-tree.json').read_text());tree=tree if isinstance(tree,list) else tree['tree']
folders=['controls/dev/MenuBar/','controls/dev/CommandBarFlyout/']
names=[n+s for n in ['XamlUICommand','StandardUICommand','AppBarSeparator'] for s in ['_Partial.cpp','_Partial.h','_themeresources.xaml']]
entries=[e for e in tree if e['type']=='blob' and e['path'].endswith(('.cpp','.h','.idl','.xaml')) and (any(e['path'].startswith(f) and '/' not in e['path'][len(f):] for f in folders) or e['path'].rsplit('/',1)[-1] in names and '/winrtgeneratedclasses/' not in e['path'])]
folder=ROOT/'references/command-menus';folder.mkdir(exist_ok=True)
def fetch(e):
 target=folder/e['path'].rsplit('/',1)[-1]
 data=target.read_bytes() if target.exists() else urllib.request.urlopen(f'https://raw.githubusercontent.com/microsoft/microsoft-ui-xaml/{COMMIT}/{e["path"]}',timeout=45).read()
 assert hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()==e['sha'],e['path']
 target.write_bytes(data)
 return {'local':target.relative_to(ROOT).as_posix(),'upstream':e['path'],'gitBlobSha1':e['sha'],'sha256':hashlib.sha256(data).hexdigest()}
with ThreadPoolExecutor(max_workers=5) as pool:files=list(pool.map(fetch,entries))
(ROOT/'references/command-menus-sources.json').write_text(json.dumps({'commit':COMMIT,'files':files},indent=2)+'\n',encoding='utf-8')
print('Verified',len(files),'command/menu source files')
