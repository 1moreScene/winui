from pathlib import Path
import json,hashlib,urllib.request,concurrent.futures
R=Path.cwd(); commit='7b12709347527238494ca28cb9fed326d513e779'
tree=json.loads((R/'out/winui-tree.json').read_text()); tree=tree if isinstance(tree,list) else tree['tree']
names=['SplitView','SemanticZoom','ParallaxView','XamlUICommand','StandardUICommand','ScrollView','SwipeControl']
entries=[e for e in tree if e['type']=='blob' and e['path'].endswith(('.cpp','.h','.idl','.xaml')) and '/winrtgeneratedclasses/' not in e['path'] and (e['path']=='dxaml/xcp/dxaml/lib/ThemeAnimations.cpp' or any('/'+n+'/' in e['path'] and not any(v in e['path'] for v in ['/TestUI/','/InteractionTests/','/APITests/']) for n in names) or any(e['path'].rsplit('/',1)[-1].startswith(n+'_') for n in names))]
dest=R/'references/view-command';dest.mkdir(exist_ok=True)
def fetch(e):
 p=dest/e['path'].replace('/','__');data=p.read_bytes() if p.exists() else urllib.request.urlopen(f'https://raw.githubusercontent.com/microsoft/microsoft-ui-xaml/{commit}/{e["path"]}',timeout=60).read();assert hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()==e['sha'];p.write_bytes(data);return dict(local=p.relative_to(R).as_posix(),upstream=e['path'],sha256=hashlib.sha256(data).hexdigest(),gitBlobSha1=e['sha'])
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool: files=list(pool.map(fetch,entries))
(R/'references/view-command-sources.json').write_text(json.dumps(dict(commit=commit,files=files),indent=2)+'\n')
print(len(files),'verified source files')
