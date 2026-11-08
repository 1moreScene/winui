"""Extract same-SDK templates and the pinned Gallery examples for five controls."""
from pathlib import Path
import json,hashlib,shutil,re,xml.etree.ElementTree as E
ROOT=Path(__file__).resolve().parent.parent
X='{http://schemas.microsoft.com/winfx/2006/xaml}'
KINDS=['InfoBar','PersonPicture','RatingControl','SplitButton','ToggleSplitButton']
def tag(n):return n.tag.rsplit('}',1)[-1]
def save(p,o):(ROOT/p).write_text(json.dumps(o,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
sdk=Path.home()/'.nuget/packages/microsoft.windowsappsdk.winui/2.3.10-experimental/lib/native/Microsoft.UI/Themes/generic.xaml'
root=E.parse(sdk).getroot()
ir={'sdk':'Microsoft.WindowsAppSDK.WinUI/2.3.10-experimental','templateSource':str(sdk),'templateSha256':hashlib.sha256(sdk.read_bytes()).hexdigest(),'metrics':{},'aliases':{},'styles':{},'requiredBrushes':[],'sources':[]}
selected=E.Element(root.tag)
for dictionary in root.iter():
 if tag(dictionary)!='ResourceDictionary':continue
 theme=dictionary.get(X+'Key','Shared')
 if theme not in ['Shared','Default','Light','HighContrast']:continue
 for n in dictionary:
  key=n.get(X+'Key','')
  if not key.startswith(tuple(KINDS)):continue
  ir['metrics'].setdefault(theme,{})[key]={'type':tag(n),'value':n.text or '',**n.attrib}
  selected.append(E.fromstring(E.tostring(n)))
  if tag(n)=='StaticResource':ir['aliases'].setdefault(theme,{})[key]=n.get('ResourceKey')
  if tag(n).endswith('Brush') or (tag(n)=='StaticResource' and any(v in key for v in ['Foreground','Background','Fill','Stroke','Brush']) and not any(v in key for v in ['Thickness','Opacity'])):ir['requiredBrushes'].append(key)
for n in root.iter():
 if tag(n)!='Style':continue
 name=n.get(X+'Key','');target=n.get('TargetType','').rsplit(':',1)[-1]
 if not (name in ['DefaultPersonPictureStyle','SplitButtonStyle'] or (not name and target in ['InfoBar','RatingControl'] and target not in ir['styles'])):continue
 ir['styles'][target]={'key':name,'setters':{s.get('Property'):s.get('Value') for s in n if tag(s)=='Setter' and s.get('Value') is not None},'states':[{**v.attrib,'setters':[dict(s.attrib) for s in v.iter() if tag(s)=='Setter']} for v in n.iter() if tag(v)=='VisualState']}
 selected.append(E.fromstring(E.tostring(n)))
ir['styles']['ToggleSplitButton']={**ir['styles']['SplitButton'],'key':'SplitButtonStyle'}
info_style=next(n for n in root.iter() if tag(n)=='Style' and n.get('TargetType','').rsplit(':',1)[-1]=='InfoBar' and not n.get(X+'Key'))
close=next(n for n in info_style.iter() if n.get('Name')=='CloseButton')
close_aliases={}
for d in close.iter():
 if tag(d)=='ResourceDictionary' and d.get(X+'Key') in ['Default','Light','HighContrast']:
  close_aliases[d.get(X+'Key')]={n.get(X+'Key'):n.get('ResourceKey') for n in d if tag(n)=='StaticResource'}
assert set(close_aliases)=={'Default','Light','HighContrast'}
ir['infoBarCloseButton']={'aliases':close_aliases,'glyphContainer':'Viewbox','glyphSymbol':'Cancel','glyphFontSize':20,'padding':[11,5,11,6]}
ir['requiredBrushes'].extend(v for d in close_aliases.values() for v in d.values())
assert set(ir['styles'])==set(KINDS),ir['styles'].keys()
ir['requiredBrushes']=sorted(set(ir['requiredBrushes']))
source_manifest=ROOT/'references/compact-controls-sources.json'
if source_manifest.exists():
 for f in json.loads(source_manifest.read_text())['files']:
  p=ROOT/f['local']
  if p.exists():ir['sources'].append({**f,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
palette=ROOT/'references/compact-controls-palettes.json'
if palette.exists():ir['palettes']=json.loads(palette.read_text(encoding='utf-8-sig'))
initials=(ROOT/'references/winui/InitialsGenerator.cpp').read_text(encoding='utf-8-sig')
ir['initialsRanges']=[[int(a,16)+(op=='>'),int(b,16),kind] for op,a,b,kind in re.findall(r'if \(\(character (>=|>) (0x[0-9A-F]+)\) && \(character <= (0x[0-9A-F]+)\)\)\s*\{\s*return CharacterType::(Glyph|Symbolic|Standard);',initials)]
ir['ratingFontInfo']=dict(next(n for n in root.iter() if n.get(X+'Key')=='MUX_RatingControlDefaultFontInfo').attrib)
rating=(ROOT/'references/winui/RatingControl.cpp').read_text(encoding='utf-8-sig')
ir['ratingConstants']={name:float(value) for name,value in re.findall(r'const (?:float|int) c_(\w+) = (-?[\d.]+)f?;',rating)}
assert ir['ratingConstants']['captionSpacing']==12 and ir['initialsRanges']
metrics=ROOT/'references/compact-controls-metrics.json'
if metrics.exists():
 observations=[r for r in json.loads(metrics.read_text(encoding='utf-8-sig'))['matrix'] if r['kind']=='RatingControl' and r['props'].get('placeholderValue')==0 and r.get('observed')]
 if observations:
  minimum=observations[0]['observed']['placeholderValue']
  assert minimum in [0,1] and all(r['observed']['placeholderValue']==minimum for r in observations)
  ir['observedBehavior']={'ratingPlaceholderMinimum':minimum,'evidence':'compact-controls-metrics.json: input placeholderValue=0; observed actual DP','sourceDifference':'Pinned C++ permits 0..1; resolved SDK binary coerces them to 1. SDK probe governs this slice.'}
save('references/compact-controls-template.json',ir)
# StaticResource aliases denote the same brush, including aliases whose SDK
# color depends on a system accent unavailable to the offline XML reader.
# Export their measured leaf resources for arbitrary SDK ResourceBrush users.
from sdk_resource_reader import brush as sdk_brush
shared={'aliases':{},'primitives':{},'source':'compact-controls-template.json and same-SDK compact-controls-palettes.json','unresolved':[]}
shared_keys=set(ir['requiredBrushes'])
for theme_aliases in ir['aliases'].values():shared_keys.update(theme_aliases);shared_keys.update(theme_aliases.values())
for theme,source_theme in [('Light','Light'),('Dark','Default'),('HighContrast','HighContrast')]:
 aliases=ir['aliases'].get(source_theme,{})
 primitives={k:v for k,v in ir.get('palettes',{}).get(theme,{}).items() if isinstance(v,dict) and 'kind' in v}
 for alias,leaf in aliases.items():
  if alias in primitives:primitives.setdefault(leaf,primitives[alias])
 for key in sorted(shared_keys):
  if key not in primitives:
   try:primitives[key]=sdk_brush(source_theme,key)
   except (KeyError,ValueError,TypeError) as error:shared['unresolved'].append({'theme':theme,'key':key,'reason':str(error)})
 shared['aliases'][theme]=aliases
 shared['primitives'][theme]=primitives
save('references/compact-shared-resources.json',shared)
(ROOT/'references/sdk').mkdir(exist_ok=True)
E.ElementTree(selected).write(ROOT/'references/sdk/compact-controls.xaml',encoding='utf-8',xml_declaration=True)
gallery=Path(json.loads((ROOT/'references/baseline.json').read_text(encoding='utf-8-sig'))['gallery']['path'])
catalog=json.loads((gallery/'catalog/windows-samples.json').read_text(encoding='utf-8-sig'))
controls={};sources=[]
for control in catalog['controls']:
 if control['name'] not in KINDS:continue
 name=control['name'];dest=ROOT/'references/gallery-input'/name;dest.mkdir(exist_ok=True)
 for p in (gallery/'WinUIGallery/Samples'/name).iterdir():
  if p.suffix not in ['.txt','.xaml','.cs']:continue
  target=dest/p.name;shutil.copyfile(p,target);sources.append({'local':str(target.relative_to(ROOT)),'upstream':str(p.relative_to(gallery)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
 controls[name]={'description':control['details'],'samples':[{'title':s['header'],'xaml':s['xaml']} for s in control['samples']]}
save('gallery/src/official-compact-controls.json',{'controls':controls,'sources':sources})
print(f'Extracted {len(ir["styles"])} same-SDK templates, {len(ir["requiredBrushes"])} brushes and {len(sources)} Gallery sources')
