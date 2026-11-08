"""Pinned Shape/Line examples and the CShape geometry contracts."""
from pathlib import Path
import json,hashlib,shutil,xml.etree.ElementTree as ET
root=Path(__file__).resolve().parent.parent
def load(p):return json.loads((root/p).read_text(encoding='utf-8-sig'))
def save(p,o):(root/p).write_text(json.dumps(o,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
gallery=Path(load('references/baseline.json')['gallery']['path']);catalog=json.loads((gallery/'catalog/windows-samples.json').read_text(encoding='utf-8-sig'));controls={};files=[]
for name in ['Shape','Line']:
 dest=root/'references/gallery-input'/name;dest.mkdir(exist_ok=True)
 for p in (gallery/'WinUIGallery/Samples'/name).iterdir():
  if p.suffix in ['.xaml','.cs','.txt']:
   shutil.copyfile(p,dest/p.name);files.append({'path':(dest/p.name).relative_to(root).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
 c=next(c for c in catalog['controls'] if c['id']==name.lower());controls[name]={'description':c['details'],'samples':[{'title':s['header'],'xaml':s['xaml']} for s in c['samples']]}
 sliders={}
 for e in ET.parse(gallery/f'WinUIGallery/Samples/{name}/{name}Page.xaml').getroot().iter():
  if e.tag.endswith('Slider'):
   key=e.get('{http://schemas.microsoft.com/winfx/2006/xaml}Name');lo=float(e.get('Minimum','0'));hi=float(e.get('Maximum','100'));sliders[key]={'minimum':lo,'maximum':hi,'value':max(lo,min(hi,float(e.get('Value','0'))))}
 controls[name]['sliders']=sliders
save('gallery/src/official-vectors.json',{'controls':controls,'sources':files})
sources=['shape.cpp','shape.h','rectangle.cpp','line.cpp','path.cpp','polygon.cpp','polyline.cpp']
save('references/vectors-template.json',{'sourceCommit':'7b12709347527238494ca28cb9fed326d513e779','measure':'CShape::ApplyContentStretch / GenerateGeometryBounds','rectangle':'GetOutlineRect / UpdateRectangleBoundsForStretchMode / CreateRoundedRect','stroke':'CShape::InitPenFromShape; independent start/end/dash caps, joins, miter, dash widths','sources':[{'path':f'references/winui/{n}','sha256':hashlib.sha256((root/'references/winui'/n).read_bytes()).hexdigest()} for n in sources]})
print('Extracted Shape and Line Gallery samples, sliders and seven vector source fingerprints')
