"""Fetch the fixed content host implementation, without touching reference repositories."""
from pathlib import Path
import concurrent.futures, hashlib, json, subprocess, urllib.request

R=Path(__file__).resolve().parents[1]
B=json.loads((R/'references/baseline.json').read_text(encoding='utf-8-sig'))
commit=B['winui']['commit']
tree=json.loads((R/'out/winui-tree.json').read_text())
tree=tree if isinstance(tree,list) else tree['tree']
names=['ContentControl','ContentPresenter','UserControl','Page','Frame','NavigationCache','NavigationHistory']
entries=[e for e in tree if e['type']=='blob' and e['path'].endswith(('.cpp','.h')) and (
 e['path'].rsplit('/',1)[-1] in [n+suffix for n in names for suffix in ['.cpp','.h','_Partial.cpp','_Partial.h']]
) and '/winrtgeneratedclasses/' not in e['path']]
dest=R/'references/content-hosts';dest.mkdir(exist_ok=True)
def fetch(e):
 p=dest/e['path'].replace('/','__')
 d=p.read_bytes() if p.exists() else urllib.request.urlopen(f'https://raw.githubusercontent.com/microsoft/microsoft-ui-xaml/{commit}/{e["path"]}',timeout=60).read()
 assert hashlib.sha1(b'blob '+str(len(d)).encode()+b'\0'+d).hexdigest()==e['sha']
 p.write_bytes(d)
 return dict(local=p.relative_to(R).as_posix(),upstream=e['path'],sha256=hashlib.sha256(d).hexdigest(),gitBlobSha1=e['sha'])
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool: files=list(pool.map(fetch,entries))
(R/'references/content-hosts-sources.json').write_text(json.dumps(dict(commit=commit,files=files),indent=2)+'\n')
g=Path(B['gallery']['path']);gc=B['gallery']['commit']
cat=json.loads((g/'catalog/windows-samples.json').read_text(encoding='utf-8'))
controls={c['name']:dict(description=c['details'],samples=[dict(title=s['header'],xaml=s.get('xaml',''),code=s.get('code','')) for s in c['samples']]) for c in cat['controls'] if c['name'] in ['Custom & User Controls','Page Transitions']}
for name in ['CustomUserControls','PageTransition']:
 for path in subprocess.check_output(['git','-C',str(g),'ls-tree','-r','--name-only',gc,'--',f'WinUIGallery/Samples/{name}/']).decode().splitlines():
  if Path(path).suffix in ['.cs','.xaml','.txt']:
   d=subprocess.check_output(['git','-C',str(g),'show',f'{gc}:{path}']);p=R/'references/gallery-input'/name/Path(path).name;p.parent.mkdir(exist_ok=True,parents=True);p.write_bytes(d)
(R/'gallery/src/official-content-hosts.json').write_text(json.dumps(dict(commit=gc,controls=controls),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(len(files),'fixed source files')
