"""Fetch pinned collection controls, presenters and layout algorithms."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import json,urllib.request,hashlib
ROOT=Path(__file__).resolve().parent.parent
COMMIT='7b12709347527238494ca28cb9fed326d513e779'
tree=json.loads((ROOT/'out/winui-tree.json').read_text(encoding='utf8'));tree=tree if isinstance(tree,list) else tree['tree']
names=['ItemsStackPanel_Partial.cpp','ItemsWrapGrid_Partial.cpp','OrientedVirtualizingPanel_Partial.cpp','VariableSizedWrapGrid_Partial.cpp','VariableSizedWrapGrid_OccupancyMap.cpp','ListViewBase_Partial.cpp','ListViewBase_Partial_Interaction.cpp','ListViewBase_Partial_Selection.cpp','ListViewBase_Partial_DataVirtualization.cpp','ListViewItemPresenter_Partial.cpp','GridViewItemPresenter_Partial.cpp','ListViewBaseItemPresenter_Partial.cpp','ListView_Partial.cpp','GridView_Partial.cpp','ListViewBaseItemChrome.cpp','ItemsStackPanel.cpp','ListViewBaseItemChrome.h','ListViewItemChrome.h','GridViewItemChrome.h','ListViewItem_themeresources.xaml','GridViewItem_themeresources.xaml']
names+=['StackingLayoutStrategyImpl.cpp','WrappingLayoutStrategyImpl.cpp','LayoutStrategyBase.cpp','StackingLayoutStrategyImpl.h','WrappingLayoutStrategyImpl.h']
names+=['image.cpp','mediabase.cpp','ListViewBase_Partial_Reorder.cpp','ListViewBaseItem_Partial.cpp']
entries=[x for x in tree if x['path'].rsplit('/',1)[-1] in names and x['type']=='blob' and not '/winrtgeneratedclasses/' in x['path']]
assert len(entries)==len(names),(len(entries),len(names))
def fetch(e):
 p=ROOT/'references/winui'/e['path'].rsplit('/',1)[-1];data=urllib.request.urlopen(f'https://raw.githubusercontent.com/microsoft/microsoft-ui-xaml/{COMMIT}/{e["path"]}',timeout=50).read()
 assert hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()==e['sha']
 if p.exists():assert p.read_bytes()==data
 else:p.write_bytes(data)
 return {'local':p.relative_to(ROOT).as_posix(),'upstream':e['path'],'gitBlobSha1':e['sha'],'sha256':hashlib.sha256(data).hexdigest()}
with ThreadPoolExecutor(max_workers=5) as pool:files=list(pool.map(fetch,entries))
(ROOT/'references/collections-sources.json').write_text(json.dumps({'commit':COMMIT,'files':files},indent=2)+'\n',encoding='utf8')
print('Verified',len(files),'pinned collection source files')
