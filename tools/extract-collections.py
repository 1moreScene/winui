"""Extract actual resolved SDK templates; no generic XAML execution claimed."""
from pathlib import Path
import json,hashlib,xml.etree.ElementTree as E,shutil,re
from sdk_resource_reader import brush as sdk_brush
ROOT=Path(__file__).resolve().parent.parent
X='{http://schemas.microsoft.com/winfx/2006/xaml}'
from mit_xaml_resources import resource_path as sdk
r=E.parse(sdk).getroot();tag=lambda n:n.tag.rsplit('}',1)[-1]
prefixes=('ListView','GridView','ItemsStackPanel','ItemsWrapGrid','VariableSizedWrapGrid')
ir={'sdkSource':sdk.relative_to(ROOT).as_posix(),'sdkSha256':hashlib.sha256(sdk.read_bytes()).hexdigest(),'styles':{},'metrics':{},'brushes':[],'presenters':{},'sourceFiles':json.loads((ROOT/'references/collections-sources.json').read_text())['files']}
selected=E.Element(r.tag)
for n in r.iter():
 key=n.get(X+'Key','');name=tag(n)
 if name=='Style':
  target=n.get('TargetType','').rsplit(':',1)[-1]
  if target in ['ListView','GridView','ListViewItem','GridViewItem'] and (not key or key in ['DefaultListViewItemStyle','DefaultGridViewItemStyle']):
   ir['styles'][target]={'key':key,'setters':{s.get('Property'):s.get('Value') for s in n if tag(s)=='Setter' and s.get('Value') is not None}}
   selected.append(E.fromstring(E.tostring(n)))
   for p in n.iter():
    if tag(p) in ['ListViewItemPresenter','GridViewItemPresenter']:
     ir['presenters'][target]=p.attrib
     for v in p.attrib.values():
      if v.startswith('{ThemeResource ') and any(w in v for w in ['Brush','Background','Foreground','Fill','Border']) and not any(w in v for w in ['Thickness','Opacity','CornerRadius']):ir['brushes'].append(v[15:-1])
 if key.startswith(prefixes) and name in ['Double','Thickness','CornerRadius','Color','Duration']:
  ir['metrics'].setdefault(key,{'type':name,'value':n.text or ''})
  selected.append(E.fromstring(E.tostring(n)))
header_brushes={'ListViewHeaderItemDividerStroke','GridViewHeaderItemDividerStroke'}
ir['brushes']=sorted(set(ir['brushes'])|header_brushes|{'ControlStrongStrokeColorDefaultBrush','ControlStrongFillColorDefaultBrush','SystemControlBackgroundBaseMediumBrush','SystemControlForegroundAltHighBrush'})
ir['headerStyles']={}
for n in r.iter():
 if tag(n)=='Style' and n.get('TargetType') in ['ListViewHeaderItem','GridViewHeaderItem']:ir['headerStyles'][n.get('TargetType')]={s.get('Property'):s.get('Value') for s in n if tag(s)=='Setter' and s.get('Value') is not None}
ir['textStyles']={}
for n in r.iter():
 key=n.get(X+'Key','')
 if tag(n)=='Style' and key in ['BaseTextBlockStyle','BodyTextBlockStyle','CaptionTextBlockStyle','TitleTextBlockStyle','SubtitleTextBlockStyle']:
  ir['textStyles'][key]={s.get('Property'):s.get('Value') for s in n if tag(s)=='Setter' and s.get('Value') is not None}
gallery_root=Path(json.loads((ROOT/'references/baseline.json').read_text(encoding='utf-8-sig'))['gallery']['path'])
ir['sampleTemplates']={}
E.register_namespace('', 'http://schemas.microsoft.com/winfx/2006/xaml/presentation');E.register_namespace('x',X[1:-1])
for owner in ['ListView','GridView']:
 page=E.parse(gallery_root/f'WinUIGallery/Samples/{owner}/{owner}Page.xaml').getroot()
 for n in page.iter():
  key=n.get(X+'Key','')
  if tag(n)=='DataTemplate' and key in ['ContactListViewTemplate','BasicListViewTemplate','ImageTemplate','IconTextTemplate','ImageTextTemplate','TextTemplate','ImageOverlayTemplate']:
   n=E.fromstring(E.tostring(n))
   for e in n.iter():
    e.attrib.pop(X+'DataType',None);e.attrib.pop(X+'Phase',None);e.attrib.pop(X+'Key',None)
    for a,v in list(e.attrib.items()):e.set(a,v.replace('{x:Bind ','{Binding '))
   ir['sampleTemplates'][key]=E.tostring(n,encoding='unicode')
chrome=(ROOT/'references/winui/ListViewBaseItemChrome.cpp').read_text(encoding='utf-8-sig')
def vector(name):
 m=re.search(r'::'+name+r'\s*=\s*\{([^}]+)\}',chrome);assert m,name
 return [float(v.strip().removesuffix('f')) for v in m[1].split(',')]
ir['chrome']={name:vector(name) for name in ['s_selectionIndicatorSize','s_selectionIndicatorMargin','s_backplateMargin','s_multiSelectSquareSize','s_multiSelectRoundedSquareInlineMargin','s_multiSelectSquareOverlayMargin']}
presenter=(ROOT/'references/winui/ListViewBaseItemPresenter_Partial.cpp').read_text(encoding='utf-8-sig')
assert 'opacityAnimationDuration = 83' in presenter and 'scaleAnimationDuration = 167' in presenter
ir['animations']={'indicatorOpacityMs':83,'indicatorScaleMs':167,'indicatorScaleCurve':[.167,.167,0,1],'source':'ListViewBaseItemPresenter_Partial.cpp::VisitAnimationCommand(SelectionIndicatorVisibility)'}
motion=json.loads((ROOT/'references/collections-animation-metrics.json').read_text(encoding='utf-8'))
ir['animations']['dragPlaceholderFadeMs']=motion['FadeOut-Hidden'][0]['durationMs']
ir['animations']['dragPlaceholderCurve']=motion['FadeOut-Hidden'][0]['curve']
ir['animations']['repositionMs']=motion['Reposition-Primary'][0]['durationMs']
ir['animations']['repositionCurve']=motion['Reposition-Primary'][0]['curve']
ir['animations']['listAddedDelayMs']=motion['AddToList-Added'][0]['delayMs']
ir['animations']['listAddedMs']=motion['AddToList-Added'][0]['durationMs']
ir['animations']['listAddedInitialScale']=motion['AddToList-Added'][0]['values']['InitialScaleX']
ir['animations']['listAffectedMs']=motion['AddToList-Affected'][0]['durationMs']
ir['animations']['listRemainingDelayMs']=motion['DeleteFromList-Remaining'][0]['delayMs']


assert set(ir['styles'])=={'ListView','GridView','ListViewItem','GridViewItem'} and len(ir['presenters'])==2
palette=ROOT/'references/collections-palettes.json'
ir['palettes']=json.loads(palette.read_text(encoding='utf-8-sig'))
for theme in ['Light','Dark']:
 # Required runtime resources must survive a clean build without native probe output.
 for key in sorted(header_brushes):ir['palettes'][theme][key]=sdk_brush(theme,key)
 missing=set(ir['brushes'])-ir['palettes'][theme].keys()
 assert not missing,f'Missing collection brushes in {theme}: {sorted(missing)}'
ir['palettes']['HighContrast']={k:{'kind':'solid','color':color,'opacity':1} for k,color in {'ControlStrongStrokeColorDefaultBrush':'#FFFFFF','ControlStrongFillColorDefaultBrush':'#FFFFFF','SystemControlBackgroundBaseMediumBrush':'#FFFFFF','SystemControlForegroundAltHighBrush':'#000000'}.items()}
ir['highContrastSource']='Shared black/white high-contrast fixture; not an arbitrary Windows system palette acceptance.'
(ROOT/'references/collections-template.json').write_text(json.dumps(ir,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
E.ElementTree(selected).write(ROOT/'references/sdk/collections.xaml',encoding='utf-8',xml_declaration=True)
gallery=Path(json.loads((ROOT/'references/baseline.json').read_text(encoding='utf-8-sig'))['gallery']['path']);catalog=json.loads((gallery/'catalog/windows-samples.json').read_text())
official={};sources=[]
for c in catalog['controls']:
 if c['name'] not in ['ListView','GridView','VariableSizedWrapGrid']:continue
 name=c['name'];dest=ROOT/'references/gallery-input'/name;dest.mkdir(exist_ok=True)
 for p in (gallery/'WinUIGallery/Samples'/name).iterdir():
  if p.suffix not in ['.txt','.xaml','.cs']:continue
  shutil.copyfile(p,dest/p.name);sources.append({'local':(dest/p.name).relative_to(ROOT).as_posix(),'upstream':p.relative_to(gallery).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
 official[name]={'description':c['details'],'samples':[{'title':s['header'],'xaml':s['xaml']} for s in c['samples']]}
(ROOT/'gallery/src/official-collections.json').write_text(json.dumps({'controls':official,'sources':sources},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
contacts_file=gallery/'WinUIGallery/Assets/SampleMedia/Contacts.txt';lines=contacts_file.read_text(encoding='utf-8-sig').splitlines()
contacts=[{'id':str(i//3),'text':lines[i]+' '+lines[i+1],'firstName':lines[i],'lastName':lines[i+1],'company':lines[i+2]} for i in range(0,len(lines)-2,3)]
object_source=gallery/'WinUIGallery/Samples/ConnectedAnimation/ConnectedAnimationPage.xaml.cs'
descriptions=re.findall(r'@"([^"]+)"',object_source.read_text(encoding='utf-8-sig'))[:8]
assert len(descriptions)==8
media=[]
for i in range(1,9):
 p=gallery/f'WinUIGallery/Assets/SampleMedia/LandscapeImage{i}.jpg';target=ROOT/f'gallery/public/official/LandscapeImage{i}.jpg';shutil.copyfile(p,target)
 media.append({'id':str(i),'text':f'Item {i}','image':f'/official/LandscapeImage{i}.jpg','views':str(100+(i*137)%899),'likes':str(10+(i*17)%89),'description':descriptions[i-1],'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'upstream':p.relative_to(gallery).as_posix()})
(ROOT/'gallery/src/collections-data.json').write_text(json.dumps({'contacts':contacts,'photos':media},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
(ROOT/'references/collections-assets.json').write_text(json.dumps({'contacts':{'upstream':contacts_file.relative_to(gallery).as_posix(),'sha256':hashlib.sha256(contacts_file.read_bytes()).hexdigest()},'photos':media},indent=2)+'\n',encoding='utf8')
print('Extracted',len(ir['styles']),'styles;',len(ir['brushes']),'presenter brushes;',len(sources),'Gallery files')
