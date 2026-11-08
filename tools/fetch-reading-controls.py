from pathlib import Path
import json,hashlib,subprocess,urllib.request,concurrent.futures
R=Path.cwd();names=['ItemsView','AnnotatedScrollBar','PagerControl','LayoutPanel','RichTextBlock','LinedFlowLayout','ItemContainer','TextHighlighter','TextHighlightRenderer','TextHighlightMerge'];commit='7b12709347527238494ca28cb9fed326d513e779'
t=json.loads((R/'out/winui-tree.json').read_text());t=t if isinstance(t,list)else t['tree']
entries=[e for e in t if e['type']=='blob' and e['path'].endswith(('.cpp','.h','.idl','.xaml')) and '/winrtgeneratedclasses/' not in e['path'] and (any('/'+n+'/' in e['path'] and not any(v in e['path']for v in ['/TestUI/','/InteractionTests/','/APITests/'])for n in names) or any(e['path'].rsplit('/',1)[-1].startswith(n)for n in names))]
dest=R/'references/reading-controls';dest.mkdir(exist_ok=True)
def fetch(e):
 p=dest/e['path'].replace('/','__');d=p.read_bytes()if p.exists()else urllib.request.urlopen(f'https://raw.githubusercontent.com/microsoft/microsoft-ui-xaml/{commit}/{e["path"]}',timeout=60).read();assert hashlib.sha1(b'blob '+str(len(d)).encode()+b'\0'+d).hexdigest()==e['sha'];p.write_bytes(d);return dict(local=p.relative_to(R).as_posix(),upstream=e['path'],sha256=hashlib.sha256(d).hexdigest(),gitBlobSha1=e['sha'])
with concurrent.futures.ThreadPoolExecutor(max_workers=6)as pool:files=list(pool.map(fetch,entries))
(R/'references/reading-controls-sources.json').write_text(json.dumps(dict(commit=commit,files=files),indent=2)+'\n')
b=json.loads((R/'references/baseline.json').read_text(encoding='utf-8-sig'));g=Path(b['gallery']['path']);gc='7360ac322414e118eadfb0c7c2f4ecc31a218f59'
cat=json.loads((g/'catalog/windows-samples.json').read_text(encoding='utf-8'));controls={}
for c in cat['controls']:
 if c['name']not in names:continue
 n=c['name'];controls[n]=dict(description=c['details'],samples=[dict(title=s['header'],xaml=s.get('xaml',''),code=s.get('code',''))for s in c['samples']])
 for path in subprocess.check_output(['git','-C',str(g),'ls-tree','-r','--name-only',gc,'--',f'WinUIGallery/Samples/{n}/']).decode().splitlines():
  if Path(path).suffix in ['.cs','.xaml','.txt']:
   d=subprocess.check_output(['git','-C',str(g),'show',f'{gc}:{path}']);p=R/'references/gallery-input'/n/Path(path).name;p.parent.mkdir(exist_ok=True,parents=True);p.write_bytes(d)
(R/'gallery/src/official-reading-controls.json').write_text(json.dumps(dict(commit=gc,controls=controls),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(len(files),'source files',[(n,len(c['samples']))for n,c in controls.items()])
