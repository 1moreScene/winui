"""Resolve composed-control brushes from the verified fixed MIT dictionary."""
from pathlib import Path
import json,re,math,hashlib
from sdk_resource_reader import ROOT,X,sdk,root,table,tag,find,brush,resolve_color
data=json.loads((ROOT/'references/composed-controls-template.json').read_text())
keys={'ContentDialogTopOverlay','ContentDialogSeparatorBorderBrush','ComboBoxItemPillFillBrush'}
keys.update(key for entries in table.values() for key,n in entries.items() if key.startswith('TextControlButton') and tag(n) in ['StaticResource','SolidColorBrush','LinearGradientBrush'])
for theme,entries in data['metrics'].items():
 for key,n in entries.items():
  if n['type'].endswith('Brush') or (n['type']=='StaticResource' and any(s in key for s in ['Background','Foreground','BorderBrush','Fill','Stroke']) and not any(s in key for s in ['Thickness','Opacity','Color'])):keys.add(key)
primitives={};aliases={};unsupported=[]
for theme in ['Light','Default','HighContrast']:
 target='Dark' if theme=='Default' else theme
 primitives[target]={};aliases[target]={}
 for key in sorted(keys):
  try:primitives[target][key]=brush(theme,key)
  except (KeyError,ValueError,TypeError) as e:
   if key=='ComboBoxItemPillFillBrush' and tag(find(theme,key))=='StaticResource':aliases[target][key]=find(theme,key).get('ResourceKey')
   else:unsupported.append({'theme':theme,'key':key,'reason':str(e)})
native=ROOT/'references/composed-controls-palettes.json'
if native.exists():
 for theme,brushes in json.loads(native.read_text()).items():
  primitives.setdefault(theme,{}).update({k:v for k,v in brushes.items() if 'kind' in v})
def milliseconds(key):
 text=(find('Light',key).text or '').strip();h,m,seconds=text.split(':');return (float(h)*3600+float(m)*60+float(seconds))*1000
header=(ROOT/'references/winui/TeachingTip.h').read_text()
def duration(member):return int(re.search(member+r'\s*\{\s*(\d+)ms',header)[1])
def curve(name):
 values=[]
 for number in [1,2]:
  match=re.search(name+str(number)+r'\s*\{([^}]+)',header);values.extend(float(v.strip().rstrip('f'))for v in match[1].split(','))
 return values
motion={'contentDialog':{'openMs':milliseconds('ControlNormalAnimationDuration'),'closeMs':milliseconds('ControlFastAnimationDuration'),'fadeMs':milliseconds('ControlFasterAnimationDuration'),'curve':[float(v)for v in (find('Light','ControlFastOutSlowInKeySpline').text or '').split(',')],'closedScale':1.05},'teachingTip':{'openMs':duration('m_expandAnimationDuration'),'closeMs':duration('m_contractAnimationDuration'),'openCurve':curve('s_expandAnimationEasingCurveControlPoint'),'closeCurve':curve('s_contractAnimationEasingCurveControlPoint'),'initialScale':0.01,'closedDimension':20}}
def split_constant(file,name):
 return int(re.search(r's_'+name+r'\s*=\s*(\d+)',(ROOT/'references/winui'/file).read_text())[1])
motion['comboBox']={'openMs':split_constant('SplitOpenThemeAnimation_Partial.h','OpenDuration'),'closeMs':split_constant('SplitCloseThemeAnimation_Partial.h','CloseDuration'),'fadeMs':split_constant('SplitCloseThemeAnimation_Partial.h','OpacityChangeDuration'),'curve':[0,0,0,1],'openClosedRatio':0.5,'closeClosedRatio':0.15}
shadow=(ROOT/'references/winui/HWCompNodeWinRT.cpp').read_text();shadow=shadow[shadow.index('void HWCompTreeNodeWinRT::UpdateDropShadowVisualForThemeTransitionClip'):];shadow=shadow[:shadow.index('void HWCompTreeNodeWinRT::UpdatePrimaryVisual')]
motion['comboBox'].update({'shadowDelayMs':int(re.search(r'put_DelayTime\(\{ static_cast<INT64>\((\d+)\)',shadow)[1])/10000,'shadowFadeMs':int(re.search(r'put_Duration\(\{ static_cast<INT64>\((\d+)\)',shadow)[1])/10000,'shadowCurve':[float(v.strip().rstrip('f')) for group in re.findall(r'float2\{([^}]+)',shadow)for v in group.split(',')]})
motion['autoSuggestBox']={'openMs':0,'closeMs':0,'source':'No popup or item-container transition in the pinned default template.'}
motion['numberBox']={'openMs':0,'closeMs':0,'source':'UpDownPopup has no transition in the pinned template.'}
out={'motion':motion,'aliases':aliases,'primitives':primitives,'templateSource':sdk.relative_to(ROOT).as_posix(),'unresolved':unsupported}
(ROOT/'references/composed-controls-resources.json').write_text(json.dumps(out,indent=2)+'\n')
print('Resolved',sum(map(len,primitives.values())),'brushes; unresolved',len(unsupported));print(unsupported[:15])
