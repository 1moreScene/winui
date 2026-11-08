from pathlib import Path
import concurrent.futures,hashlib,json,urllib.request
R=Path(__file__).resolve().parents[1]
commit=json.loads((R/'references/baseline.json').read_text(encoding='utf-8-sig'))['winui']['commit']
tree=json.loads((R/'out/winui-tree.json').read_text());tree=tree if isinstance(tree,list)else tree['tree']
names=['ScrollBar','Thumb','TickBar','ItemsPresenter','ScrollContentPresenter']
entries=[e for e in tree if e['type']=='blob' and e['path'].endswith(('.cpp','.h','.xaml','.cs')) and ('/dxaml/lib/' in e['path']or'/core/core/elements/'in e['path']or'/core/inc/'in e['path']or'/CommonStyles/'in e['path']or'/XamlOM/Model/'in e['path'])and(e['path'].rsplit('/',1)[-1]in[n+s for n in names for s in['.cpp','.h','_Partial.cpp','_Partial.h','_themeresources.xaml']]or e['path'].endswith('Microsoft.UI.Xaml.Controls.Primitives.cs'))]
dest=R/'references/scroll-primitives';dest.mkdir(exist_ok=True)
def fetch(e):
 p=dest/e['path'].replace('/','__');d=p.read_bytes()if p.exists()else urllib.request.urlopen(f'https://raw.githubusercontent.com/microsoft/microsoft-ui-xaml/{commit}/{e["path"]}',timeout=60).read()
 assert hashlib.sha1(b'blob '+str(len(d)).encode()+b'\0'+d).hexdigest()==e['sha'];p.write_bytes(d)
 return dict(local=p.relative_to(R).as_posix(),upstream=e['path'],sha256=hashlib.sha256(d).hexdigest(),gitBlobSha1=e['sha'])
with concurrent.futures.ThreadPoolExecutor(max_workers=6)as pool:files=list(pool.map(fetch,entries))
(R/'references/scroll-primitives-sources.json').write_text(json.dumps(dict(commit=commit,files=files),indent=2)+'\n',encoding='utf-8')
print(len(files),'pinned sources')
