from pathlib import Path
import json,hashlib,urllib.request
root=Path('.');b=json.loads(Path('references/baseline.json').read_text(encoding='utf-8-sig'));t=json.loads(Path('out/winui-tree.json').read_text());t=t if isinstance(t,list) else t['tree'];files=[]
for e in t:
 p=e['path']
 if e['type']!='blob' or not p.endswith(('.cpp','.h')) or 'ConnectedAnimation' not in p or '/test/' in p or '/winrtgenerated' in p:continue
 dest=root/'references/motion'/p.replace('/','__');dest.parent.mkdir(parents=True,exist_ok=True)
 data=dest.read_bytes() if dest.exists() else urllib.request.urlopen(f'https://raw.githubusercontent.com/microsoft/microsoft-ui-xaml/{b["winui"]["commit"]}/{p}',timeout=30).read()
 assert hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()==e['sha']
 dest.write_bytes(data);files.append(dict(local=dest.as_posix(),upstream=p,sha256=hashlib.sha256(data).hexdigest(),gitBlobSha1=e['sha']))
Path('references/motion-sources.json').write_text(json.dumps(dict(commit=b['winui']['commit'],files=files),indent=2)+'\n')
print('Captured',len(files),'pinned ConnectedAnimation files')
