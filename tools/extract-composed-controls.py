"""Stage same-SDK templates and pinned Gallery examples before implementation."""
from pathlib import Path
import hashlib,json,shutil,xml.etree.ElementTree as E
ROOT=Path(__file__).resolve().parent.parent
KINDS=['AutoSuggestBox','NumberBox','ComboBox','ContentDialog','TeachingTip']
X='{http://schemas.microsoft.com/winfx/2006/xaml}'
sdk=Path.home()/'.nuget/packages/microsoft.windowsappsdk.winui/2.3.10-experimental/lib/native/Microsoft.UI/Themes/generic.xaml'
root=E.parse(sdk).getroot();selected=E.Element(root.tag);metrics={};styles=[]
for dictionary in root.iter():
 if dictionary.tag.rsplit('}',1)[-1]!='ResourceDictionary':continue
 theme=dictionary.get(X+'Key','Shared')
 if theme not in ['Shared','Default','Light','HighContrast']:continue
 for n in dictionary:
  key=n.get(X+'Key',n.get(X+'Name',''))
  if key.startswith(tuple(KINDS+['AutoSuggestList'])):
   metrics.setdefault(theme,{})[key]={'type':n.tag.rsplit('}',1)[-1],'value':n.text or '',**n.attrib}
   selected.append(E.fromstring(E.tostring(n)))
for n in root.iter():
 if n.tag.rsplit('}',1)[-1]=='Style' and (n.get('TargetType','').rsplit(':',1)[-1] in KINDS+['ComboBoxItem'] or n.get(X+'Key',n.get(X+'Name','')).startswith(tuple(KINDS))):
  styles.append({'target':n.get('TargetType'),'key':n.get(X+'Key',n.get(X+'Name')),'xml':E.tostring(n,encoding='unicode')});selected.append(E.fromstring(E.tostring(n)))
assert set(KINDS).issubset({s['target'].rsplit(':',1)[-1] for s in styles})
manifest=json.loads((ROOT/'references/composed-controls-sources.json').read_text())
data={'status':'Pinned source/template baseline; implementation and validation are tracked in composed-controls-status.json','sdk':'Microsoft.WindowsAppSDK.WinUI/2.3.10-experimental','templateSource':str(sdk),'templateSha256':hashlib.sha256(sdk.read_bytes()).hexdigest(),'controls':KINDS,'metrics':metrics,'styles':styles,'sources':manifest['files']}
(ROOT/'references/composed-controls-template.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
E.ElementTree(selected).write(ROOT/'references/sdk/composed-controls.xaml',encoding='utf-8',xml_declaration=True)
gallery=Path(json.loads((ROOT/'references/baseline.json').read_text(encoding='utf-8-sig'))['gallery']['path'])
catalog=json.loads((gallery/'catalog/windows-samples.json').read_text(encoding='utf-8-sig'));controls={};sources=[]
for control in catalog['controls']:
 if control['name'] not in KINDS:continue
 name=control['name'];dest=ROOT/'references/gallery-input'/name;dest.mkdir(exist_ok=True)
 for p in (gallery/'WinUIGallery/Samples'/name).iterdir():
  if p.suffix not in ['.txt','.xaml','.cs']:continue
  target=dest/p.name;shutil.copyfile(p,target);sources.append({'local':str(target.relative_to(ROOT)),'upstream':str(p.relative_to(gallery)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
 controls[name]={'description':control['details'],'samples':[{'title':s['header'],'xaml':s['xaml']} for s in control['samples']]}
assert set(controls)==set(KINDS)
(ROOT/'gallery/src/official-composed-controls.json').write_text(json.dumps({'controls':controls,'sources':sources},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(f'Extracted {len(styles)} styles, {sum(map(len,metrics.values()))} resources and {len(sources)} Gallery source files')
