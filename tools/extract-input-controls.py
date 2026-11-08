"""Extract phase-6 selection resources and examples from the fixed baselines."""
from pathlib import Path
import json, shutil, hashlib, xml.etree.ElementTree as E
ROOT=Path(__file__).resolve().parent.parent
X='{http://schemas.microsoft.com/winfx/2006/xaml}'
def tag(n):return n.tag.rsplit('}',1)[-1]
def save(path,data):
 p=ROOT/path;value=json.dumps(data,ensure_ascii=False,indent=2)+'\n'
 if not p.exists() or p.read_text(encoding='utf-8')!=value:p.write_text(value,encoding='utf-8')
ir={'sourceCommit':'7b12709347527238494ca28cb9fed326d513e779','aliases':{},'styles':{}}
for name in ['RadioButton','ToggleSwitch']:
 xml=E.parse(ROOT/f'references/winui/{name}_themeresources.xaml').getroot()
 for theme,key in [('Light','Light'),('Dark','Default'),('HighContrast','HighContrast')]:
  dic=next(n for n in xml.iter() if tag(n)=='ResourceDictionary' and n.get(X+'Key')==key)
  ir['aliases'].setdefault(theme,{}).update({n.get(X+'Key'):n.get('ResourceKey') for n in dic if tag(n)=='StaticResource'})
 style=next(n for n in xml.iter() if tag(n)=='Style' and n.get(X+'Key')=='Default'+name+'Style')
 parts={n.get(X+'Name'):n for n in style.iter() if n.get(X+'Name') and tag(n) not in ['VisualStateGroup','VisualState','VisualTransition']}
 defaults={n.get('Property'):n.get('Value') for n in style if tag(n)=='Setter' and n.get('Value') is not None}
 base={f'{part}.{k}':v[15:-1] for part,n in parts.items() for k,v in n.attrib.items() if v.startswith('{ThemeResource ')}
 for part,node in parts.items():
  for key,value in node.attrib.items():
   if value.startswith('{TemplateBinding '):
    resolved=defaults.get(value[17:-1],'')
    if resolved.startswith('{ThemeResource '):base[part+'.'+key]=resolved[15:-1]
 states={};numbers={}
 for state in (n for n in style.iter() if tag(n)=='VisualState'):
  values=dict(base);sizes={}
  for animation in state.iter():
   target=animation.get('Storyboard.TargetName');prop=animation.get('Storyboard.TargetProperty')
   if prop:prop=prop.replace('(Shape.Fill).(SolidColorBrush.Color)','Fill').replace('(Shape.Stroke).(SolidColorBrush.Color)','Stroke').replace('(Panel.Background).(SolidColorBrush.Color)','Background')
   if not target or not prop:continue
   frames=list(animation)
   if frames and frames[-1].get('Value','').startswith('{ThemeResource '):values[target+'.'+prop]=frames[-1].get('Value')[15:-1]
   if tag(animation)=='DoubleAnimationUsingKeyFrames' and frames:
    v=frames[-1].get('Value','')
    if v.replace('.','',1).isdigit():sizes[target+'.'+prop]={'value':float(v),'duration':frames[-1].get('KeyTime'),'spline':frames[-1].get('KeySpline')}
  states[state.get(X+'Name')]=values;numbers[state.get(X+'Name')]=sizes
 defaults={n.get('Property'):n.get('Value') for n in style if tag(n)=='Setter' and n.get('Value') is not None}
 scalars={n.get(X+'Key'):float(n.text) for n in xml if tag(n)=='Double'}
 ir['styles'][name]={'defaults':defaults,'scalars':scalars,'states':states,'tracks':numbers}
palette=ROOT/'references/input-palettes.json'
ir['primitives']=json.loads(palette.read_text(encoding='utf-8-sig')) if palette.exists() else {}
save('references/selection-input-template.json',ir)
baseline=json.loads((ROOT/'references/baseline.json').read_text(encoding='utf-8-sig'));gallery=Path(baseline['gallery']['path'])
catalog=json.loads((gallery/'catalog/windows-samples.json').read_text(encoding='utf-8-sig'))
controls={};files=[]
for control in catalog['controls']:
 if control['name'] not in ['RadioButton','ToggleSwitch','ScrollViewer','TextBox']:continue
 name=control['name'];dest=ROOT/'references/gallery-input'/name;dest.mkdir(parents=True,exist_ok=True)
 paths=[p for p in (gallery/'WinUIGallery/Samples'/name).iterdir() if p.is_file() and p.suffix in ['.txt','.xaml','.cs']]
 for p in paths:
  target=dest/p.name
  if not target.exists() or target.read_bytes()!=p.read_bytes():shutil.copyfile(p,target)
  files.append({'path':target.relative_to(ROOT).as_posix(),'source':p.relative_to(gallery).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
 controls[name]={'description':control['details'],'samples':[{'title':s['header'],'file':Path(s['gallery']['source']).name,'xaml':s['xaml']} for s in control['samples']]}
save('gallery/src/official-input.json',{'galleryCommit':baseline['gallery']['commit'],'controls':controls,'sources':files})
print(f'Extracted selection input templates and {len(files)} Gallery input source files')
