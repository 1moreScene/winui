"""Fetch pinned source evidence for the next five composed controls."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import hashlib,json,urllib.request
ROOT=Path(__file__).resolve().parent.parent
COMMIT='7b12709347527238494ca28cb9fed326d513e779'
KINDS=['AutoSuggestBox','NumberBox','ComboBox','ContentDialog','TeachingTip']
tree=json.loads((ROOT/'out/winui-tree.json').read_text());tree=tree if isinstance(tree,list) else tree['tree']
files=[]
for e in tree:
 p=e['path'];name=p.rsplit('/',1)[-1]
 if e['type']!='blob' or not p.endswith(('.cpp','.h','.idl','.xaml')) or 'perf2026' in p:continue
 if any(p.startswith('controls/dev/'+k+'/') and '/TestUI/' not in p for k in KINDS) or any(p=='dxaml/xcp/dxaml/lib/'+k+'_Partial'+s for k in KINDS for s in ['.cpp','.h']) or p=='controls/dev/CommonStyles/ContentDialog_themeresources.xaml':
  files.append({'upstream':p,'local':'references/winui/'+name,'gitBlobSha1':e['sha']})
def fetch(f):
 p=ROOT/f['local'];data=urllib.request.urlopen(f'https://raw.githubusercontent.com/microsoft/microsoft-ui-xaml/{COMMIT}/{f["upstream"]}',timeout=40).read()
 assert hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()==f['gitBlobSha1']
 if p.exists():assert p.read_bytes()==data,f['local']
 else:p.write_bytes(data)
 f['sha256']=hashlib.sha256(data).hexdigest()
with ThreadPoolExecutor(max_workers=5) as pool:list(pool.map(fetch,files))
(ROOT/'references/composed-controls-sources.json').write_text(json.dumps({'commit':COMMIT,'controls':KINDS,'files':files},indent=2)+'\n')
print(f'Fetched and verified {len(files)} pinned sources')
