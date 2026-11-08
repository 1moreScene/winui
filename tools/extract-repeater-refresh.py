"""Reproduce source constants and the pinned Gallery sample text."""
from pathlib import Path
import json, re, hashlib, subprocess,xml.etree.ElementTree as E
ROOT=Path(__file__).resolve().parents[1]
r=ROOT/'references/repeater-refresh'
def number(file,pattern):return float(re.search(pattern,(r/file).read_text(encoding='utf-8-sig')).group(1))
baseline=json.loads((ROOT/'references/baseline.json').read_text())
manifest=json.loads((ROOT/'references/repeater-refresh-sources.json').read_text())
assert manifest['commit']==baseline['winui']['commit']
for file in manifest['files']:
 data=(ROOT/file['local']).read_bytes()
 assert hashlib.sha256(data).hexdigest()==file['sha256'],file['local']
c=dict(sourceCommit=manifest['commit'],visualizerHeight=number('RefreshVisualizer.xaml',r'Property="Height" Value="(\d+)"'),visualizerMinHeight=number('RefreshVisualizer.xaml',r'MinHeight="(\d+)"'),indicatorSize=number('RefreshVisualizer.cpp',r'#define DEFAULT_INDICATOR_SIZE (\d+)'),minimumOpacity=number('RefreshVisualizer.cpp',r'#define MINIMUM_INDICATOR_OPACITY ([\d.]+)'),executionRatio=number('RefreshInfoProviderImpl.h',r'#define DEFAULT_EXECUTION_RATIO ([\d.]+)'),pendingDuration=number('RefreshVisualizer.cpp',r'contentScaleAnimation.Duration\((\d+)ms\)'),rotationDuration=number('RefreshVisualizer.cpp',r'contentExecutionRotationAnimation.Duration\((\d+)ms\)'))
(ROOT/'references/repeater-refresh-template.json').write_text(json.dumps(c,indent=2)+'\n',encoding='utf-8')
gallery=Path(baseline['gallery']['path']);commit=baseline['gallery']['commit'];files=[];samples={}
paths=subprocess.check_output(['git','-C',str(gallery),'ls-tree','-r','--name-only',commit,'--','WinUIGallery/Samples/ItemsRepeater','WinUIGallery/Samples/PullToRefresh'],text=True).splitlines()
for path in paths:
 if Path(path).suffix not in ['.cs','.txt','.xaml']:continue
 data=subprocess.check_output(['git','-C',str(gallery),'show',f'{commit}:{path}'])
 files.append(dict(path=path,sha256=hashlib.sha256(data).hexdigest()))
 if path.endswith('.txt'):
  sections=re.split(r'^--- ([^\r\n]+)\s*$',data.decode('utf-8-sig'),flags=re.M);sections=dict(zip(sections[1::2],sections[2::2]));samples[Path(path).stem]=dict(title=sections.get('header',Path(path).stem).strip(),xaml=sections.get('xaml','').strip(),csharp=sections.get('c#','').strip(),source=path)
def source(path):return subprocess.check_output(['git','-C',str(gallery),'show',f'{commit}:{path}'])
X='{http://schemas.microsoft.com/winfx/2006/xaml}'
def local(node):return node.tag.rsplit('}',1)[-1]
def xml(node):return E.tostring(node,encoding='unicode').replace('ns0:','').replace(':ns0=', '=')
pages={};resources={};pagecode={}
for kind in ['ItemsRepeater','PullToRefresh']:
 base=f'WinUIGallery/Samples/{kind}/{kind}Page';root=E.fromstring(source(base+'.xaml'));pagecode[kind]=source(base+'.xaml.cs').decode('utf-8-sig')
 order=[]
 for example in root.iter():
  if local(example)!='ControlExample':continue
  key=Path(example.get('SampleDefinition').replace('\\','/')).stem;order.append(key)
  samples[key]['title']=example.get('HeaderText',samples[key]['title'])
  live=next((child for child in example if not local(child).startswith('ControlExample.')),None)
  if live is None:live=next(child[0] for child in example if local(child)=='ControlExample.Example')
  samples[key]['runtimeXaml']=xml(live)
  samples[key]['optionsXaml']='\n'.join(xml(c)for c in example if local(c)=='ControlExample.Options')
  samples[key]['pageSource']=base+'.xaml'
 pages[kind]=order
 if kind=='ItemsRepeater':
  dictionary=next(n for n in root if local(n)=='Page.Resources')
  resources={n.get(X+'Key',n.get(X+'Name','')):xml(n) for n in dictionary}
code=pagecode['ItemsRepeater']
strings=lambda text:re.findall(r'"([^"]*)"',text)
colors=strings(code.split('public List<String> ColorList',1)[1].split('};',1)[0])
mixed_block=code.split('List<object> basicData',1)[1].split('};',1)[0].split('{',1)[1]
mixed=[int(n)if n else text for n,text in re.findall(r'\b(\d+)\b|"([^"]*)"',mixed_block)]
categories=[dict(id=name,items=strings(re.search(r'Get'+name+r'\(\)\s*\{\s*return new ObservableCollection<string>\s*\{([^}]+)',code).group(1)))for name in ['Fruits','Vegetables','Grains','Proteins']]
layouts=[]
dest=ROOT/'references/repeater-gallery';dest.mkdir(exist_ok=True)
for name in ['ActivityFeedLayout','VariedImageSizeLayout']:
 path=f'WinUIGallery/Layouts/{name}.cs';data=source(path);(dest/(name+'.cs')).write_bytes(data);files.append(dict(path=path,sha256=hashlib.sha256(data).hexdigest()));layouts.append(path)
for name in ['SunBlack.png','SunWhite.png']:
 path='WinUIGallery/Assets/SampleMedia/'+name;data=source(path);target=ROOT/'gallery/public/official/repeater'/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data);files.append(dict(path=path,sha256=hashlib.sha256(data).hexdigest()))
from sdk_resource_reader import resolve_color,sdk
keys=['SystemChromeLowColor','SystemControlBackgroundChromeMediumBrush','SystemControlBackgroundBaseLowBrush','SystemControlBackgroundAccentBrush','SystemControlForegroundChromeWhiteBrush','SystemControlForegroundAltHighBrush','TextFillColorInverseBrush','TextControlBorderBrush','SystemControlForegroundBaseHighBrush','ControlFillColorDefaultBrush','ControlStrokeColorDefaultBrush']
palettes={}
for label,theme in [('Light','Light'),('Dark','Default'),('HighContrast','HighContrast')]:
 palettes[label]={}
 for key in keys:
  try:palettes[label][key]=resolve_color(theme,key)
  except (KeyError,ValueError):pass
native_palette_path=ROOT/'references/repeater-gallery-native-palettes.json'
if native_palette_path.exists():
 for theme,brushes in json.loads(native_palette_path.read_text(encoding='utf-8-sig')).items():
  for key,brush in brushes.items():
   if brush['kind']=='solid':palettes[theme][key]=brush['color']
brush_resources=dict(aliases={},primitives={theme:{key:dict(kind='solid',color=value,opacity=1)for key,value in brushes.items()}for theme,brushes in palettes.items()})
if native_palette_path.exists():
 for theme,brushes in json.loads(native_palette_path.read_text(encoding='utf-8-sig')).items():brush_resources['primitives'][theme].update(brushes)
(ROOT/'references/repeater-gallery-resources.json').write_text(json.dumps(brush_resources,indent=2)+'\n',encoding='utf-8')
samples['_repository']=dict(commit=commit,pages=pages,resources=resources,pageCodeBehind=pagecode,customLayoutSources=layouts,data=dict(bars=[300,25,175],maxLength=425,numberCount=500,flowCount=500,colors=colors,mixed=mixed,categories=categories,recipeCount=1000,extras=['Garlic','Lemon','Butter','Lime','Feta Cheese','Parmesan Cheese','Breadcrumbs'],refreshControls='AcrylicBrush ColorPicker NavigationView ParallaxView PersonPicture PullToRefreshPage RatingsControl RevealBrush TreeView'.split(),refreshFriends='Mike Ben Barbra Claire Justin Shawn Drew Lili'.split(),refreshDelays=[500,800]),palettes=palettes,sdkResources=dict(path=str(sdk),sha256=hashlib.sha256(sdk.read_bytes()).hexdigest()))
(ROOT/'references/repeater-refresh-gallery.json').write_text(json.dumps(dict(commit=commit,files=files),indent=2)+'\n',encoding='utf-8')
(ROOT/'gallery/src/official-repeater-refresh.json').write_text(json.dumps(samples,indent=2)+'\n',encoding='utf-8')
print(f'Extracted repeater/refresh constants, {len(files)} Gallery sources')
