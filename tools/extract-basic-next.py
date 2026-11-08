"""Pinned RepeatButton template and Viewbox source/Gallery contract."""
from pathlib import Path
import json, re, shutil, hashlib, xml.etree.ElementTree as E
ROOT=Path(__file__).resolve().parent.parent
X='{http://schemas.microsoft.com/winfx/2006/xaml}'
def tag(n):return n.tag.rsplit('}',1)[-1]
def resource(value):
    m=re.fullmatch(r'\{(?:ThemeResource|StaticResource) ([^}]+)\}',value)
    if not m:raise ValueError('Unsupported RepeatButton resource '+value)
    return m[1]
def save(path,data):(ROOT/path).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
source=E.parse(ROOT/'references/winui/RepeatButton_themeresources.xaml').getroot()
style=next(n for n in source if tag(n)=='Style' and n.get(X+'Key')=='DefaultRepeatButtonStyle')
defaults={n.get('Property'):n.get('Value') for n in style if tag(n)=='Setter' and n.get('Value') is not None}
normal={p:resource(defaults[p]) for p in ['Background','BorderBrush','Foreground']}
states={'Normal':normal}
for n in style.iter():
    name=n.get(X+'Name')
    if tag(n)!='VisualState' or name not in ['PointerOver','Pressed','Disabled']:continue
    values=normal.copy()
    for a in n.iter():
        if tag(a)!='ObjectAnimationUsingKeyFrames':continue
        if a.get('Storyboard.TargetName')!='ContentPresenter':raise ValueError('Unsupported RepeatButton target')
        prop=a.get('Storyboard.TargetProperty');frames=list(a)
        if prop not in normal or len(frames)!=1 or frames[0].get('KeyTime')!='0':raise ValueError('Unsupported RepeatButton state animation')
        values[prop]=resource(frames[0].get('Value'))
    states[name]=values
duration=next(n.get('Duration') for n in style.iter() if tag(n)=='BrushTransition')
parts=list(map(float,duration.split(':')));ms=(parts[0]*3600+parts[1]*60+parts[2])*1000
aliases={}
for theme,key in [('Light','Light'),('Dark','Default'),('HighContrast','HighContrast')]:
    d=next(n for n in source.iter() if tag(n)=='ResourceDictionary' and n.get(X+'Key')==key)
    aliases[theme]={n.get(X+'Key'):n.get('ResourceKey') for n in d if tag(n)=='StaticResource' and n.get(X+'Key') in {v for s in states.values() for v in s.values()}}
ir={'sourceCommit':'7b12709347527238494ca28cb9fed326d513e779','aliases':{},'sourceAliases':aliases,'primitives':{},'requiredBrushes':{k:{'colorResource':False} for k in aliases['Light']},
    'repeatStyle':{'key':style.get(X+'Key','DefaultRepeatButtonStyle'),'states':states,'backgroundSizing':defaults['BackgroundSizing'],'backgroundTransitionMs':ms,'part':'ContentPresenter'},'templateDefaults':defaults}
ir['presenterAttributes']=dict(next(n for n in style.iter() if tag(n)=='ContentPresenter').attrib)
ir['unimplementedPublicCapabilities']=['XAML ContentTemplate/ContentTransitions execution', 'Direct BorderBrush/BorderThickness/BackgroundSizing overrides', 'Direct HorizontalContentAlignment/VerticalContentAlignment overrides; use explicit child layout for customization']
for name,key in [('basic-next-palettes.json','primitives'),('basic-next-defaults.json','nativeDefaults')]:
    p=ROOT/'references'/name
    if p.exists():ir[key]=json.loads(p.read_text(encoding='utf-8-sig'))
ir['sources']=[{'path':p.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for name in ['RepeatButton_themeresources.xaml','RepeatButton_Partial.cpp','RepeatButton_Partial.h','RepeatButtonAutomationPeer_Partial.cpp','Viewbox.cpp','Viewbox.h'] for p in [ROOT/'references/winui'/name]]
save('references/basic-next-template.json',ir)
gallery=Path(json.loads((ROOT/'references/baseline.json').read_text(encoding='utf-8'))['gallery']['path'])
catalog=json.loads((gallery/'catalog/windows-samples.json').read_text(encoding='utf-8-sig'))
controls={};sources=[]
for c in catalog['controls']:
    if c['name'] not in ['RepeatButton','Viewbox']:continue
    name=c['name'];dest=ROOT/'references/gallery-input'/name;dest.mkdir(exist_ok=True)
    for p in (gallery/'WinUIGallery/Samples'/name).iterdir():
        if p.suffix not in ['.txt','.xaml','.cs']:continue
        target=dest/p.name;shutil.copyfile(p,target)
        sources.append({'path':target.relative_to(ROOT).as_posix(),'source':p.relative_to(gallery).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
    controls[name]={'description':c['details'],'samples':[{'title':s['header'],'file':Path(s['gallery']['source']).name,'xaml':s['xaml']} for s in c['samples']]}
save('gallery/src/official-basic-next.json',{'galleryCommit':'7360ac322414e118eadfb0c7c2f4ecc31a218f59','controls':controls,'sources':sources})
print('Extracted RepeatButton states/resources and two official basic-control examples')
