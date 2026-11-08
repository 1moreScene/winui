"""Fetch the exact pinned WinUI sources for the compact control batch."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import json, urllib.request,hashlib
ROOT=Path(__file__).resolve().parent.parent
COMMIT='7b12709347527238494ca28cb9fed326d513e779'
groups={
 'InfoBar':['InfoBar.cpp','InfoBar.h','InfoBar.idl','InfoBar.xaml','InfoBar_themeresources.xaml','InfoBarPanel.cpp','InfoBarClosingEventArgs.cpp'],
 'PersonPicture':['PersonPicture.cpp','PersonPicture.h','PersonPicture.idl','PersonPicture.xaml','PersonPicture_themeresources.xaml','InitialsGenerator.cpp'],
 'RatingControl':['RatingControl.cpp','RatingControl.h','RatingControl.idl','RatingControl.xaml','RatingControl_themeresources.xaml'],
 'SplitButton':['SplitButton.cpp','SplitButton.h','SplitButton.idl','SplitButton.xaml','SplitButton_themeresources.xaml','ToggleSplitButton.cpp','ToggleSplitButton.h'],
}
files=[{'local':f'references/winui/{name}','upstream':f'controls/dev/{group}/{name}'} for group,names in groups.items() for name in names]
def fetch(f):
 target=ROOT/f['local']
 data=urllib.request.urlopen(f'https://raw.githubusercontent.com/microsoft/microsoft-ui-xaml/{COMMIT}/{f["upstream"]}',timeout=40).read()
 if target.exists():assert target.read_bytes()==data, f'Existing reference changed: {target}'
 else:target.write_bytes(data)
with ThreadPoolExecutor(max_workers=5) as pool:list(pool.map(fetch,files))
# When available, independently verify the downloaded bytes against the pinned
# Git tree's blob IDs, rather than trusting a similarly named local checkout.
tree_file=ROOT/'out/winui-tree.json'
if tree_file.exists():
 tree=json.loads(tree_file.read_text(encoding='utf8'))
 entries=tree if isinstance(tree,list) else tree['tree']
 blobs={entry['path']:entry['sha'] for entry in entries if entry.get('type')=='blob'}
 for f in files:
  data=(ROOT/f['local']).read_bytes()
  actual=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
  assert actual==blobs[f['upstream']],f['upstream']
  f['gitBlobSha1']=actual
(ROOT/'references/compact-controls-sources.json').write_text(json.dumps({'commit':COMMIT,'files':files},indent=2)+'\n',encoding='utf8')
print(f'Fetched {len(files)} pinned sources')
