"""Pinned IconElement behavior, Symbol migration map and native defaults."""
from pathlib import Path
import json,re,hashlib,shutil
ROOT=Path(__file__).resolve().parent.parent
def read(p):return json.loads((ROOT/p).read_text(encoding='utf-8-sig'))
def save(p,o):(ROOT/p).write_text(json.dumps(o,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
values=read('references/sdk-symbols.json');cpp=(ROOT/'references/winui/icon.cpp').read_text(encoding='utf-8-sig')
conversion={int(a,16):int(b,16) for a,b in re.findall(r'case (0x[0-9A-F]+): return static_cast<WCHAR>\((0x[0-9A-F]+)\);',cpp)}
symbols={name:chr(conversion.get(code,code)) for name,code in values.items()}
assert symbols['Accept']=='\ue8fb' and symbols['Emoji']=='\ue899'
paths=['icon.cpp','icon.h','SymbolIcon_Partial.cpp','FontIconSource_Partial.cpp','BitmapIconSource_Partial.cpp','PathIconSource_Partial.cpp','IconSource.cs','ImageIcon.cpp','ImageIcon.h','ImageIcon.xaml']
ir={'sourceCommit':'7b12709347527238494ca28cb9fed326d513e779','symbols':symbols,'defaults':read('references/icon-defaults.json'),'sources':[{'path':(p:=ROOT/'references/winui'/name).relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for name in paths]}
save('references/icons-template.json',ir)
schema=read('references/api-enums.json')
schema['Symbol']={'rust':'Symbol','description':'Built-in WinUI symbol; legacy values map to the pinned Fluent glyphs. Default Emoji.','members':{name:[name,'Built-in '+name+' symbol.'] for name in values},'default':'Emoji'}
save('references/api-enums.json',schema)
gallery=Path(read('references/baseline.json')['gallery']['path']);catalog=json.loads((gallery/'catalog/windows-samples.json').read_text(encoding='utf-8-sig'))
control=next(c for c in catalog['controls'] if c['name']=='IconElement');sources=[];dest=ROOT/'references/gallery-input/IconElement';dest.mkdir(exist_ok=True)
for p in (gallery/'WinUIGallery/Samples/IconElement').iterdir():
 if p.suffix not in ['.cs','.xaml','.txt']:continue
 shutil.copyfile(p,dest/p.name);sources.append({'path':(dest/p.name).relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
import xml.etree.ElementTree as ET
page=ET.parse(gallery/'WinUIGallery/Samples/IconElement/IconElementPage.xaml').getroot()
note=next(e.get('Text') for e in page.iter() if e.tag.endswith('TextBlock') and e.get('Text','').startswith('The ShowAsMonochrome'))
save('gallery/src/official-icons.json',{'description':control['details'],'bitmapDescription':note,'samples':[{'title':s['header'],'xaml':s['xaml']} for s in control['samples']],'sources':sources})
print(f'Extracted {len(symbols)} native symbols and IconElement sources')
