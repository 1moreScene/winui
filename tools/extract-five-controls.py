"""Source contracts for Border, Canvas, HyperlinkButton, Expander and InfoBadge."""
from pathlib import Path
import json,hashlib,shutil,xml.etree.ElementTree as E,re
ROOT=Path(__file__).resolve().parent.parent
X='{http://schemas.microsoft.com/winfx/2006/xaml}'
def tag(n):return n.tag.rsplit('}',1)[-1]
def save(p,o):(ROOT/p).write_text(json.dumps(o,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
ir={'sourceCommit':'7b12709347527238494ca28cb9fed326d513e779','primitives':{},'aliases':{},'requiredBrushes':{},'metrics':{},'hyperlinkStyle':{}}
for name in ['HyperlinkButton','Expander','InfoBadge']:
 root=E.parse(ROOT/f'references/winui/{name}_themeresources.xaml').getroot()
 for theme,key in [('Light','Light'),('Dark','Default'),('HighContrast','HighContrast')]:
  d=next(n for n in root.iter() if tag(n)=='ResourceDictionary' and n.get(X+'Key')==key)
  for n in d:
   k=n.get(X+'Key')
   if tag(n)=='StaticResource':ir['requiredBrushes'][k]={}
   elif k:ir['metrics'].setdefault(theme,{})[k]=n.text
 for n in root:
  k=n.get(X+'Key')
  if k and tag(n) in ['Double','Thickness','String']:ir['metrics'][k]=n.text
 if name=='HyperlinkButton':
  style=next(n for n in root if n.get(X+'Key')=='DefaultHyperlinkButtonStyle')
  vals={n.get('Property'):n.get('Value') for n in style if tag(n)=='Setter' and n.get('Value')}
  states={}
  for state in ['Normal','PointerOver','Pressed','Disabled']:
   states[state]={p:f'HyperlinkButton{p}'+('' if state=='Normal' else state) for p in ['Background','Foreground','BorderBrush']}
  ir['hyperlinkStyle']={'key':'DefaultHyperlinkButtonStyle','states':states,'backgroundSizing':vals['BackgroundSizing'],'backgroundTransitionMs':83,'part':'ContentPresenter'}
for key in ['SystemFillColorAttentionBrush','SystemFillColorSolidNeutralBrush','SystemFillColorSuccessBrush','SystemFillColorCautionBrush','SystemFillColorCriticalBrush']:ir['requiredBrushes'][key]={}
expander=E.parse(ROOT/'references/winui/Expander.xaml').getroot()
ir['expanderTransitions']={}
ir['expanderVisibility']={}
for state in expander.iter():
 if tag(state)=='VisualState' and state.get(X+'Name') in ['ExpandUp','ExpandDown','CollapseUp','CollapseDown']:
  frames=[n for n in state.iter() if tag(n)=='SplineDoubleKeyFrame']
  ir['expanderTransitions'][state.get(X+'Name')]=[dict(n.attrib) for n in frames]
  ir['expanderVisibility'][state.get(X+'Name')]=max(float(n.get('KeyTime').split(':')[-1])*1000 for n in state.iter() if tag(n)=='DiscreteObjectKeyFrame' and n.get('Value') in ['Visible','Collapsed'])
chevron=(ROOT/'references/winui/AnimatedChevronUpDownSmallVisualSource.cpp').read_text(encoding='utf-8-sig')
curves={i:[float(n) for n in re.findall(r'-?\d+\.\d+',a+','+b)] for i,a,b in re.findall(r'CubicBezierEasingFunction_(\d+)\(\)\s*\{[^}]*?CreateCubicBezierEasingFunction\(\{([^}]+)\}, \{([^}]+)\}',chevron)}
def animation(name,vector=False):
 body=chevron.split(name+'()\n    {',1)[1].split('return result;',1)[0]
 pattern=r'(?:Create(?:Scalar|Vector2)KeyFrameAnimation|InsertKeyFrame)\(([^;]+?)\);'
 result=[]
 for args in re.findall(pattern,body):
  values=re.findall(r'(-?\d+(?:\.\d+)?)(?:F)?',args.split('EasingFunction')[0])
  count=3 if vector else 2
  values=[float(v) for v in values[:count]]
  if len(values)!=count:raise ValueError('Unsupported chevron keyframe '+args)
  curve_name=re.search(r'(?:_cubicBezierEasingFunction_|CubicBezierEasingFunction_)(\d+)',args)
  curve=curves[curve_name[1]] if curve_name else 'step' if 'HoldThenStep' in args or '_holdThenStep' in args else 'start'
  result.append({'progress':values[0],'value':values[1:] if vector else values[1],'curve':curve})
 return result
ir['chevron']={'durationMs':4333.3333,'points':[[-3.54299998,-1.79299998],[.0199999996,1.70700002],[3.48900008,-1.71500003]],'rotation':animation('RotationAngleInDegreesScalarAnimation_180_to_180'),'offset':animation('OffsetVector2Animation',True),'curve':[.166999996,.166999996,0.,1.], 'markers':{k:float(v) for k,v in re.findall(r'\{ L"([^"]+)", (\d+(?:\.\d+)?) \}',chevron)}}
badge=E.parse(ROOT/'references/winui/InfoBadge_themeresources.xaml').getroot()
ir['badgeStyles']={}
for s in badge:
 if tag(s)!='Style' or not s.get(X+'Key','').endswith('InfoBadgeStyle'):continue
 vals={n.get('Property'):n.get('Value') for n in s if tag(n)=='Setter' and n.get('Value')}
 icon=next((n for n in s.iter() if tag(n) in ['FontIconSource','SymbolIconSource']),None)
 pad=vals.get('Padding','0,0,0,0')
 if pad.startswith('{ThemeResource '):pad=ir['metrics']['Light'][pad[len('{ThemeResource '):-1]]
 ir['badgeStyles'][s.get(X+'Key')]={'padding':[float(v) for v in pad.split(',')], 'icon':dict(icon.attrib) if icon is not None else None}
palette=ROOT/'references/five-controls-palettes.json'
if palette.exists():ir['primitives']=json.loads(palette.read_text(encoding='utf-8-sig'))
native_metrics=ROOT/'references/five-controls-metrics.json'
if native_metrics.exists():
 records=json.loads(native_metrics.read_text(encoding='utf-8-sig'))['matrix']
 exp=next(x for x in records if x['kind']=='Expander' and x.get('extra'))
 ir['nativeDefaults']={'expanderMinWidth':exp['extra']['minWidth']}
def contrast(k):
 if k=='InfoBadgeBackground':return '#ffff00'
 if k=='InfoBadgeForeground':return '#000000'
 if 'Background' in k:return '#000000'
 if 'Disabled' in k or k=='HyperlinkButtonForegroundPressed':return '#808080'
 if k=='HyperlinkButtonForeground' or ('Chevron' in k and ('PointerOver' in k or 'Pressed' in k)):return '#ffff00'
 return '#ffffff' if 'Border' in k or 'Foreground' in k else '#ffff00'
ir['primitives']['HighContrast']={k:{'kind':'solid','color':contrast(k),'opacity':1} for k in ir['requiredBrushes']}
files=['Border.cpp','canvas.cpp','HyperLinkButton_Partial.cpp','HyperLinkButton_Partial.h','HyperlinkButton_themeresources.xaml','Expander.cpp','Expander.h','Expander.xaml','Expander_themeresources.xaml','AnimatedChevronUpDownSmallVisualSource.cpp','InfoBadge.cpp','InfoBadge.h','InfoBadge.xaml','InfoBadge_themeresources.xaml']
ir['sources']=[{'path':(p:=ROOT/'references/winui'/n).relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for n in files]
save('references/five-controls-template.json',ir)
gallery=Path(json.loads((ROOT/'references/baseline.json').read_text(encoding='utf-8'))['gallery']['path'])
catalog=json.loads((gallery/'catalog/windows-samples.json').read_text(encoding='utf-8-sig'))
controls={};sources=[]
for c in catalog['controls']:
 if c['name'] not in ['Border','Canvas','HyperlinkButton','Expander','InfoBadge']:continue
 name=c['name'];dest=ROOT/'references/gallery-input'/name;dest.mkdir(exist_ok=True)
 for p in (gallery/'WinUIGallery/Samples'/name).iterdir():
  if p.suffix not in ['.txt','.xaml','.cs']:continue
  target=dest/p.name;shutil.copyfile(p,target)
  sources.append({'path':target.relative_to(ROOT).as_posix(),'source':p.relative_to(gallery).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
 controls[name]={'description':c['details'],'samples':[{'title':s['header'],'file':Path(s['gallery']['source']).name,'xaml':s['xaml']} for s in c['samples']]}
save('gallery/src/official-five-controls.json',{'galleryCommit':'7360ac322414e118eadfb0c7c2f4ecc31a218f59','controls':controls,'sources':sources})
print('Extracted five source contracts and Gallery samples')
