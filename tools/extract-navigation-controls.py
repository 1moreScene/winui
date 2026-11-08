"""Read the resolved SDK templates and fixed Gallery navigation examples."""
from pathlib import Path
import json, hashlib, shutil, xml.etree.ElementTree as E
ROOT=Path(__file__).resolve().parent.parent
KINDS=['FlipView','PipsPager','BreadcrumbBar','TreeView','TabView']
X='{http://schemas.microsoft.com/winfx/2006/xaml}'
def tag(e):return e.tag.rsplit('}',1)[-1]
def save(path,data):(ROOT/path).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
sdk=Path.home()/'.nuget/packages/microsoft.windowsappsdk.winui/2.3.10-experimental/lib/native/Microsoft.UI/Themes/generic.xaml'
root=E.parse(sdk).getroot(); selected=E.Element(root.tag)
ir={'sdk':'Microsoft.WindowsAppSDK.WinUI/2.3.10-experimental','templateSha256':hashlib.sha256(sdk.read_bytes()).hexdigest(),'styles':{},'metrics':{},'brushes':[],'parts':{},'states':{}}
brushes=set()
for n in root.iter():
 key=n.get(X+'Key',n.get(X+'Name',''));name=tag(n)
 if key.startswith(tuple(KINDS)) and name in ['Double','Thickness','CornerRadius','Duration','x:String','String']:
  ir['metrics'][key]={'type':name,'value':n.text or ''}
  selected.append(E.fromstring(E.tostring(n)))
 target=n.get('TargetType','').split(':')[-1]
 if name=='Style' and (target in KINDS+['TabViewItem','TreeViewItem','BreadcrumbBarItem','TabViewListView'] or key.startswith(tuple(KINDS))):
  style=key or target
  ir['styles'][style]={s.get('Property'):s.get('Value') for s in n if tag(s)=='Setter' and s.get('Value') is not None}
  ir['parts'][style]=[{'type':tag(p),**p.attrib} for p in n.iter() if p.get(X+'Name')]
  ir['states'][style]=[{'name':v.get(X+'Name'),'setters':[dict(p.attrib) for p in v.iter() if tag(p) in ['Setter','DiscreteObjectKeyFrame','DoubleAnimation','DoubleAnimationUsingKeyFrames','DiscreteDoubleKeyFrame','SplineDoubleKeyFrame']]} for v in n.iter() if tag(v)=='VisualState']
  selected.append(E.fromstring(E.tostring(n)))
  for p in n.iter():
   for v in p.attrib.values():
    if v.startswith('{ThemeResource ') and any(x in v for x in ['Brush','Background','Foreground','Fill','Stroke']) and not any(x in v for x in ['Thickness','Opacity','CornerRadius','FontSize','FontFamily','Height','Width','Padding','Margin','Duration','Scale','Style']):brushes.add(v[15:-1])
brushes.add('TabViewItemSeparator')
ir['brushes']=sorted(brushes)
palette=ROOT/'references/navigation-controls-palettes.json'
if palette.exists():ir['palettes']=json.loads(palette.read_text(encoding='utf-8-sig'))
native=ROOT/'references/navigation-controls-metrics.json'
if native.exists():
 for entry in json.loads(native.read_text(encoding='utf-8-sig')).get('unresolved',[]):
  if 'error' not in entry:ir.setdefault('palettes',{}).setdefault(entry['theme'],{})[entry['key']]=None
text_metrics=ROOT/'references/navigation-controls-text-metrics.json'
if text_metrics.exists():
 text_cases=json.loads(text_metrics.read_text(encoding='utf-8-sig'))['cases']
 caption=next(p for p in text_cases[0]['parts'] if p['type']=='TextBlock' and p.get('text')=='Home')
 ir['metrics']['BreadcrumbBarCaptionHeight']={'type':'Double','value':str(caption['rect'][3]),'source':'same-SDK TextBlock actual line box, font size 14'}
save('references/navigation-controls-template.json',ir)
E.ElementTree(selected).write(ROOT/'references/sdk/navigation-controls.xaml',encoding='utf-8',xml_declaration=True)
gallery=Path(json.loads((ROOT/'references/baseline.json').read_text(encoding='utf-8-sig'))['gallery']['path'])
catalog=json.loads((gallery/'catalog/windows-samples.json').read_text(encoding='utf8')); controls={};sources=[]
for c in catalog['controls']:
 if c['name'] not in KINDS:continue
 name=c['name']; dest=ROOT/'references/gallery-input'/name; dest.mkdir(exist_ok=True)
 for p in (gallery/'WinUIGallery/Samples'/name).iterdir():
  if p.suffix not in ['.xaml','.cs','.txt']:continue
  shutil.copyfile(p,dest/p.name);sources.append({'local':str((dest/p.name).relative_to(ROOT)),'upstream':str(p.relative_to(gallery)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
 controls[name]={'description':c['details'],'samples':[{'title':s['header'],'xaml':s.get('xaml',''),'code':s.get('code','')} for s in c['samples']]}
# The catalog omits FlipviewShowingBoundData; follow the page's actual order.
parts=(gallery/'WinUIGallery/Samples/FlipView/FlipviewShowingBoundData.txt').read_text(encoding='utf-8-sig').split('--- ')
sections={part.split('\n',1)[0].strip():part.split('\n',1)[1].strip() for part in parts if '\n' in part}
controls['FlipView']['samples'].insert(1,{'title':sections['header'],'xaml':sections['xaml'],'code':sections.get('csharp','')})
save('gallery/src/official-navigation-controls.json',{'controls':controls,'sources':sources})
asset_names=['cliff.jpg','grapes.jpg','rainier.jpg','sunset.jpg','valley.jpg','folder.png','cmd.png','powershell.png','linux.png']+[f'LandscapeImage{i}.jpg' for i in range(1,9)]
assets=[]
def asset(source,dest):
 target=ROOT/'gallery/public/official'/dest;shutil.copyfile(source,target);assets.append({'local':target.relative_to(ROOT).as_posix(),'upstream':source.relative_to(gallery).as_posix(),'sha256':hashlib.sha256(source.read_bytes()).hexdigest()});return '/official/'+dest
for name in asset_names:asset(gallery/'WinUIGallery/Assets/SampleMedia'/name,name)
catalog_data=json.loads((gallery/'WinUIGallery/SampleSupport/Data/ControlInfoData.json').read_text(encoding='utf-8-sig'))
bound=[]
for group in catalog_data['Groups'][:3]:
 for item in group['Items']:
  path=item.get('ImagePath','').replace('ms-appx:///','')
  if not path:continue
  source=gallery/'WinUIGallery'/path
  bound.append({'id':item['UniqueId'],'text':item['Title'],'imageSource':asset(source,'nav-'+source.name)})
colors=json.loads((ROOT/'references/navigation-controls-system-colors.json').read_text(encoding='utf-8-sig'))
save('gallery/src/navigation-controls-data.json',{'boundFlipItems':bound,'accentStrip':{'Light':colors['light2'],'Dark':colors['dark2'],'HighContrast':'#000000'}})
for index in range(1,4):
 source=gallery/f'WinUIGallery/SampleSupport/SamplePages/SamplePage{index}.xaml';target=ROOT/f'references/gallery-input/TabView/ContentSamplePage{index}.xaml';shutil.copyfile(source,target)
 sources.append({'local':target.relative_to(ROOT).as_posix(),'upstream':source.relative_to(gallery).as_posix(),'sha256':hashlib.sha256(source.read_bytes()).hexdigest()})
 old=ROOT/f'references/gallery-shared/SamplePage{index}.xaml'
 if old.exists() and old.read_bytes()==source.read_bytes():old.unlink()
save('gallery/src/official-navigation-controls.json',{'controls':controls,'sources':sources})
save('references/navigation-controls-assets.json',assets)
print('Extracted',len(ir['styles']),'styles,',len(brushes),'brushes and',len(sources),'Gallery files')
