"""Extract RichEditBox references from the repository's fixed Gallery/WinUI/SDK."""
from pathlib import Path
import hashlib, json, subprocess, xml.etree.ElementTree as E
ROOT = Path(__file__).resolve().parent.parent
COMMIT = '7360ac322414e118eadfb0c7c2f4ecc31a218f59'
WINUI = '7b12709347527238494ca28cb9fed326d513e779'
GALLERY = Path(json.loads((ROOT/'references/baseline.json').read_text(encoding='utf-8'))['gallery']['path'])
from mit_xaml_resources import resource_path as SDK
X = '{http://schemas.microsoft.com/winfx/2006/xaml}'
tag = lambda n: n.tag.rsplit('}',1)[-1]
def save(path, data):
    p=ROOT/path; p.parent.mkdir(parents=True,exist_ok=True)
    text=json.dumps(data,ensure_ascii=False,indent=2)+'\n'
    if not p.exists() or p.read_text(encoding='utf-8')!=text:p.write_text(text,encoding='utf-8')
def git(path):return subprocess.check_output(['git','-C',str(GALLERY),'show',f'{COMMIT}:{path}'])
sources=[]
expected = {
    'RichEditBox.cpp':'ac9086580127f926e44704553b8771e6f0fed6a4bd9ab132e48e93803a7e4111',
    'RichEditBox.h':'44e1d3eefcdccf8b4b9c34ce1a367feb495a1d57defc16b0b5170f6255fec768',
    'RichEditBox_Partial.cpp':'a7610f2b9485aa4684c01ede96bdd9d860790079ab1105e32e51e6b2d1171525',
    'RichEditBox_themeresources.xaml':'a7e951a3b55a32f85ecd1c65738d1518fd0801a81c81a51a5c1a192d3d9e9535',
}
for name,path in [('RichEditBox.cpp','dxaml/xcp/core/native/text/Controls/RichEditBox.cpp'),('RichEditBox.h','dxaml/xcp/core/native/text/Controls/RichEditBox.h'),('RichEditBox_Partial.cpp','dxaml/xcp/dxaml/lib/RichEditBox_Partial.cpp'),('RichEditBox_themeresources.xaml','controls/dev/CommonStyles/RichEditBox_themeresources.xaml')]:
    local=ROOT/'references/winui'/name
    if hashlib.sha256(local.read_bytes()).hexdigest()!=expected[name]:raise ValueError('Pinned RichEditBox source changed: '+name)
    sources.append({'path':local.relative_to(ROOT).as_posix(),'source':path,'commit':WINUI,'sha256':hashlib.sha256(local.read_bytes()).hexdigest()})
sdk_root=E.parse(SDK).getroot()
style=next(n for n in sdk_root.iter() if tag(n)=='Style' and n.get(X+'Key')=='DefaultRichEditBoxStyle')
scalar_keys=['TextControlThemeMinWidth','TextControlThemeMinHeight','TextControlThemePadding','ControlCornerRadius']
scalars={key:next(n.text for n in sdk_root.iter() if n.get(X+'Key')==key) for key in scalar_keys}
dest=ROOT/'references/sdk/rich-edit.xaml';dest.write_bytes(E.tostring(style,encoding='utf-8',xml_declaration=True))
save('references/rich-edit-template.json',{'sourceCommit':WINUI,'templateSource':'references/mit-xaml-generated/generic.xaml','sdkSha256':hashlib.sha256(SDK.read_bytes()).hexdigest(),'sources':sources,'scalars':scalars,'defaults':{n.get('Property'):n.get('Value') for n in style if tag(n)=='Setter' and n.get('Value') is not None},'parts':[n.get(X+'Name') for n in style.iter() if n.get(X+'Name')],'states':[n.get(X+'Name') for n in style.iter() if tag(n)=='VisualState'],'sharedResources':'references/text-scroll-template.json','headerMargin':[0,0,0,8]})
folder='WinUIGallery/Samples/RichEditBox'
paths=subprocess.check_output(['git','-C',str(GALLERY),'ls-tree','--name-only',f'{COMMIT}:{folder}']).decode().splitlines()
gallery_sources=[]
for name in paths:
    if Path(name).suffix not in ['.txt','.xaml','.cs']:continue
    raw=git(f'{folder}/{name}');local=ROOT/'references/gallery-input/RichEditBox'/name;local.parent.mkdir(parents=True,exist_ok=True);local.write_bytes(raw)
    gallery_sources.append({'source':f'{folder}/{name}','path':local.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(raw).hexdigest()})
page=E.fromstring(git(f'{folder}/RichEditBoxPage.xaml'))
examples=[n for n in page.iter() if tag(n)=='ControlExample']
samples=[]
for n in examples:
    file=n.get('SampleDefinition','').replace('\\','/').rsplit('/',1)[-1]
    raw=git(f'{folder}/{file}').decode('utf-8-sig')
    sections={}
    import re
    for match in re.finditer(r'^--- (\w+)\s*\n(.*?)(?=^--- |\Z)',raw,re.M|re.S): sections[match[1]]=match[2].strip()
    samples.append({'title':sections.get('header',''),'source':file,'xaml':sections.get('xaml','')})
save('gallery/src/official-rich-edit.json',{'galleryCommit':COMMIT,'sources':gallery_sources,'samples':samples})
print(f'RichEditBox: {len(sources)} WinUI sources, {len(gallery_sources)} Gallery sources, {len(samples)} samples')
