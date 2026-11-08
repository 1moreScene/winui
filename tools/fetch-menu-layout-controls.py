"""Fetch exact pinned layout sources and Gallery samples; preserve reference working trees."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import json,hashlib,urllib.request,subprocess
ROOT=Path(__file__).resolve().parents[1]
COMMIT='7b12709347527238494ca28cb9fed326d513e779'
tree=json.loads((ROOT/'out/winui-tree.json').read_text());tree=tree if isinstance(tree,list) else tree['tree']
paths=['dxaml/xcp/core/core/elements/RelativePanel.cpp','dxaml/xcp/core/inc/RelativePanel.h']+[f'dxaml/xcp/components/relativepanel/{folder}/{name}.{ext}' for folder,name,ext in [('inc','RPGraph','h'),('inc','RPNode','h'),('lib','RPGraph','cpp'),('lib','RPNode','cpp')]]
entries=[e for e in tree if e['type']=='blob' and (e['path'] in paths or e['path'].startswith('controls/dev/WrapPanel/') and '/' not in e['path'][len('controls/dev/WrapPanel/'):] and e['path'].endswith(('.cpp','.h','.idl')))]
folder=ROOT/'references/menu-layout';folder.mkdir(exist_ok=True)
def fetch(e):
    target=folder/e['path'].rsplit('/',1)[-1]
    data=target.read_bytes() if target.exists() else urllib.request.urlopen(f'https://raw.githubusercontent.com/microsoft/microsoft-ui-xaml/{COMMIT}/{e["path"]}',timeout=45).read()
    assert hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()==e['sha']
    target.write_bytes(data)
    return {'local':target.relative_to(ROOT).as_posix(),'upstream':e['path'],'sha256':hashlib.sha256(data).hexdigest(),'gitBlobSha1':e['sha']}
with ThreadPoolExecutor(max_workers=5) as pool:files=list(pool.map(fetch,entries))
(ROOT/'references/menu-layout-sources.json').write_text(json.dumps({'commit':COMMIT,'files':files},indent=2)+'\n')
helpers=[e for e in tree if e['path'] in [f'dxaml/xcp/dxaml/lib/CascadingMenuHelper.{ext}' for ext in ['cpp','h']]]
folder=ROOT/'references/command-menus'
with ThreadPoolExecutor(max_workers=2) as pool:helper_files=list(pool.map(fetch,helpers))
(ROOT/'references/cascading-menu-sources.json').write_text(json.dumps({'commit':COMMIT,'files':helper_files},indent=2)+'\n')
baseline=json.loads((ROOT/'references/baseline.json').read_text(encoding='utf-8-sig'));gallery=Path(baseline['gallery']['path']);commit=baseline['gallery']['commit']
catalog=json.loads((gallery/'catalog/windows-samples.json').read_text(encoding='utf8'));controls={};sources=[]
for c in catalog['controls']:
    if c['name'] not in ['MenuBar','CommandBarFlyout','RelativePanel','WrapPanel']:continue
    name=c['name'];prefix=f'WinUIGallery/Samples/{name}/'
    paths=subprocess.check_output(['git','-C',str(gallery),'ls-tree','-r','--name-only',commit,'--',prefix]).decode().splitlines()
    for path in paths:
        if Path(path).suffix not in ['.cs','.xaml','.txt']:continue
        data=subprocess.check_output(['git','-C',str(gallery),'show',f'{commit}:{path}']);target=ROOT/'references/gallery-input'/name/Path(path).name;target.parent.mkdir(exist_ok=True);target.write_bytes(data)
        sources.append({'local':target.relative_to(ROOT).as_posix(),'upstream':path,'sha256':hashlib.sha256(data).hexdigest()})
    controls[name]={'description':c['details'],'samples':[{'title':s['header'],'xaml':s.get('xaml',''),'code':s.get('code','')}for s in c['samples']]}
(ROOT/'gallery/src/official-menu-layout.json').write_text(json.dumps({'commit':commit,'controls':controls,'sources':sources},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(f'Verified {len(files)} layout sources and {len(sources)} Gallery files')
