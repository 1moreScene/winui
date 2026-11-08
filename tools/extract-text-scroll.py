"""Pinned template/resource contract for stage 6.3; no generic XAML executor."""
from pathlib import Path
import json, re, shutil, hashlib, xml.etree.ElementTree as E
ROOT=Path(__file__).resolve().parent.parent
X='{http://schemas.microsoft.com/winfx/2006/xaml}'
def tag(n):return n.tag.rsplit('}',1)[-1]
def save(path,data):
 p=ROOT/path;text=json.dumps(data,ensure_ascii=False,indent=2)+'\n'
 if not p.exists() or p.read_text(encoding='utf-8')!=text:p.write_text(text,encoding='utf-8')
ir={'sourceCommit':'7b12709347527238494ca28cb9fed326d513e779','sourceAliases':{},'styles':{},'scalars':{},'requiredBrushes':{}}
for name in ['TextBox','PasswordBox','ScrollViewer','ScrollBar']:
 xml=E.parse(ROOT/f'references/winui/{name}_themeresources.xaml').getroot()
 for theme,key in [('Light','Light'),('Dark','Default'),('HighContrast','HighContrast')]:
  dic=next((n for n in xml.iter() if tag(n)=='ResourceDictionary' and n.get(X+'Key')==key),None)
  if dic is not None:ir['sourceAliases'].setdefault(theme,{}).update({n.get(X+'Key'):n.get('ResourceKey') for n in dic if tag(n)=='StaticResource'})
 for n in xml:
  if tag(n) in ['Double','String','Thickness','CornerRadius'] and n.get(X+'Key'):
   ir['scalars'][n.get(X+'Key')]=n.text
 styles=[n for n in xml.iter() if tag(n)=='Style' and n.get(X+'Key')=='Default'+name+'Style']
 if styles:
  style=styles[0];ir['styles'][name]={'defaults':{n.get('Property'):n.get('Value') for n in style if tag(n)=='Setter' and n.get('Value') is not None},'states':[]}
  for n in style.iter():
   if tag(n) in ['VisualState','VisualTransition']:
    ir['styles'][name]['states'].append({'kind':tag(n),'attributes':dict(n.attrib),'animations':[{'kind':tag(a),'attributes':dict(a.attrib)} for a in n.iter() if tag(a) in ['DoubleAnimation','DoubleAnimationUsingKeyFrames','DiscreteObjectKeyFrame','SplineDoubleKeyFrame','LinearDoubleKeyFrame']]})
keys=['TextControl'+part+state for part in ['Background','BorderBrush','Foreground','PlaceholderForeground'] for state in ['', 'PointerOver','Focused','Disabled']]
keys+=['TextControlHeaderForeground','TextControlHeaderForegroundDisabled','TextControlSelectionHighlightColor','TextControlButtonForeground','TextControlButtonForegroundPointerOver','TextControlButtonForegroundPressed','TextControlButtonBackgroundPointerOver','TextControlButtonBackgroundPressed','SystemControlDescriptionTextForegroundBrush']
keys+=['ScrollBarThumbFill','ScrollBarThumbFillPointerOver','ScrollBarThumbFillPressed','ScrollBarThumbFillDisabled','ScrollBarTrackFill','ScrollBarTrackStroke','ScrollBarButtonArrowForeground','ScrollBarButtonArrowForegroundPointerOver','ScrollBarButtonArrowForegroundPressed','ScrollBarPanningThumbBackground']
for key in keys:
 leaf=ir['sourceAliases'].get('Light',{}).get(key,key)
 ir['requiredBrushes'][key]={'colorResource':not leaf.endswith('Brush') and ('Color' in leaf or leaf.startswith('Temporary'))}
palettes=ROOT/'references/text-scroll-palettes.json'
ir['aliases']={};ir['primitives']=json.loads(palettes.read_text(encoding='utf-8-sig')) if palettes.exists() else {}
save('references/text-scroll-template.json',ir)
gallery=Path(json.loads((ROOT/'references/baseline.json').read_text(encoding='utf-8'))['gallery']['path'])
catalog=json.loads((gallery/'catalog/windows-samples.json').read_text(encoding='utf-8-sig'));controls={};sources=[]
for c in catalog['controls']:
 if c['name'] not in ['ScrollViewer','TextBox','PasswordBox']:continue
 name=c['name'];dest=ROOT/'references/gallery-input'/name;dest.mkdir(parents=True,exist_ok=True)
 for p in (gallery/'WinUIGallery/Samples'/name).iterdir():
  if p.suffix not in ['.txt','.xaml','.cs']:continue
  target=dest/p.name
  if not target.exists() or target.read_bytes()!=p.read_bytes():shutil.copyfile(p,target)
  sources.append({'path':target.relative_to(ROOT).as_posix(),'source':p.relative_to(gallery).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
 controls[name]={'description':c['details'],'samples':[{'title':s['header'],'file':Path(s['gallery']['source']).name,'xaml':s['xaml']} for s in c['samples']]}
save('gallery/src/official-text-scroll.json',{'galleryCommit':'7360ac322414e118eadfb0c7c2f4ecc31a218f59','controls':controls,'sources':sources})
asset=gallery/'WinUIGallery/Assets/SampleMedia/cliff.jpg';shutil.copyfile(asset,ROOT/'gallery/public/official/cliff.jpg')
print(f'Extracted {len(keys)} required brushes and {len(sources)} Gallery sources')
