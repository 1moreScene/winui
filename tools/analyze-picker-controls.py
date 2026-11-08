"""Record reproducible picker coverage without treating geometry as pixel parity."""
from pathlib import Path
from PIL import Image,ImageChops,ImageDraw,ImageStat
import datetime,hashlib,json,re
ROOT=Path(__file__).resolve().parents[1]
def read(p):return json.loads((ROOT/p).read_text(encoding='utf-8-sig'))
def digest(p):return hashlib.sha256((ROOT/p).read_bytes()).hexdigest()
scale=1.25
def box(r):return tuple(round(v*scale) for v in [r['x'],r['y'],r['x']+r['width'],r['y']+r['height']])
def mae(a,b,mask=None):return sum(ImageStat.Stat(ImageChops.difference(a,b),mask).mean)/3
native=read('references/picker-controls-native.json')
report={'recordedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'controls':['CalendarView','CalendarDatePicker','DatePicker','TimePicker','ColorPicker'],
 'nativeRun':'references/picker-controls-run.json','nativeStates':len(native['rows']),'browsers':{},
 'scope':'Same-SDK explicit static fixtures, Gregorian civil dates, local-minute times, palette/spectrum and browser interactions. Full-image RGB error includes text and edges; it is not a pass criterion for pixel parity.',
 'remaining':['Windows non-Gregorian calendars are rejected explicitly.','Arbitrary WinRT DateTimeFormatter patterns, timezone/100ns DateTime semantics and OS named-color Ctrl+arrow steps are not implemented.',
 'CalendarView continuous virtualized month scrolling, Shift-range semantics and all automation patterns are not accepted as native equivalents.',
 'Calendar zoom uses fixed SDK tracks; independent native frame-by-frame motion and packaged Store Gallery/DWM acceptance remain outstanding.',
 'Browser font rasterization, ClearType, fallback fonts, material edge coverage and whole-control image equality remain unaccepted.']}
for browser,folder in [('Chromium','picker-visual'),('WebKit','picker-webkit')]:
 results=[]
 for backend in ['Canvas2D','WebGL2']:
  data=read(f'out/{folder}/{backend}/metrics.json');assert len(data['rows'])==len(native['rows'])
  rows=[]
  for row in data['rows']:
   ref=row['native'];actual=row['actual'];assert actual['backend']['kind']==backend and not actual['backend']['lost']
   a=Image.open(ROOT/f'out/{folder}/{backend}'/(row['name']+'.png')).convert('RGB');b=Image.open(ROOT/'out/picker-native'/(row['name']+'.png')).convert('RGB')
   geometry={k:abs(actual['owner'][k]-ref['bounds'][k]) for k in ['x','y','width','height']}
   r={'name':row['name'],'geometryErrorDip':max(geometry.values()),'fullControlRgbMae':mae(a.crop(box(ref['bounds'])),b.crop(box(ref['bounds'])))}
   if ref['popups']:
    r['popupGeometryErrorDip']=max(abs(actual['parts']['Popup']['bounds'][k]-ref['popups'][0]['bounds'][k]) for k in ['x','y','width','height'])
   if ref['kind']=='ColorPicker' and ref['state'] in ['Selected','Ring']:
    parts={p['name']:p for p in ref['parts']};shape='SpectrumEllipse' if ref['state']=='Ring' else 'SpectrumRectangle';rect=parts[shape]['bounds'];crop=box(rect);left=a.crop(crop);right=b.crop(crop);mask=Image.new('L',left.size);d=ImageDraw.Draw(mask)
    if ref['state']=='Ring':d.ellipse((8,8,left.width-9,left.height-9),fill=255)
    else:d.rectangle((8,8,left.width-9,left.height-9),fill=255)
    e=parts['SelectionEllipsePanel']['bounds'];d.rectangle(tuple(v*scale for v in [e['x']-rect['x']-2,e['y']-rect['y']-2,e['x']-rect['x']+e['width']+2,e['y']-rect['y']+e['height']+2]),fill=0)
    r['spectrumInteriorRgbMae']=mae(left,right,mask)
   if ref['state'].startswith('Wheel'):
    up=next(p for popup in ref['popups'] for p in popup['parts'] if p['name']=='UpButton' and p['visible']=='Visible' and p['bounds']['width']>0)
    r['navigationButtonRgbMae']=mae(a.crop(box(up['bounds'])),b.crop(box(up['bounds'])))
    if ref['state']=='WheelPressed':r['pressedFixtureScope']='Native VSM-only pressed state; Rust pointer press also invokes a wheel step. Whole wheel content is not a pressed-state pixel comparison.'
   rows.append(r)
  results.append({'backend':backend,'states':len(rows),'wasmSha256':data['wasmSha256'],'maxControlGeometryErrorDip':max(r['geometryErrorDip'] for r in rows),'maxPopupGeometryErrorDip':max((r.get('popupGeometryErrorDip',0) for r in rows)), 'rows':rows})
  assert not data['errors'],data['errors']
  assert max(r['geometryErrorDip'] for r in rows)<.81
  assert max(r.get('popupGeometryErrorDip',0) for r in rows)<.81
  assert all(r.get('spectrumInteriorRgbMae',0)<2 for r in rows)
 report['browsers'][browser]=results
log=(ROOT/'out/picker-shared-final-rust.log').read_text(encoding='utf-8-sig')
report['rust']={'passed':sum(map(int,re.findall(r'test result: ok\. (\d+) passed',log))),'failed':bool(re.search(r'test result: FAILED|error:',log)),'log':'out/picker-shared-final-rust.log'}
for browser,path in [('Chromium','out/picker-browser-results.json'),('WebKit','out/picker-webkit-results.json')]:
 data=read(path);report.setdefault('checks',{})[browser]=data['stats'];assert not data['stats']['unexpected']
report['sourceFiles']={p:digest(p) for p in ['src/wasm.rs','src/scene/picker_controls.rs','src/scene/picker_controls/input.rs','src/scene/picker_controls/layout.rs','src/scene/picker_controls/paint.rs','src/scene/picker_controls/motion.rs','gallery/src/picker-controls-types.ts','gallery/src/PickerControlsPage.tsx','references/picker-controls-template.json']}
(ROOT/'references/validation/picker-controls.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
sources=read('references/picker-controls-sources.json');templates=read('references/picker-controls-template.json')
status={'recordedAt':report['recordedAt'],'controls':report['controls'],'implementedControlKinds':report['controls'],'phase':'Rust controls, TS/React APIs and Gallery implemented; measured parity coverage and remaining limitations recorded separately','sourceCommit':sources['commit'],'sourceFiles':len(sources['files']),'sdkStyles':len(templates['styles']),'nativeStates':report['nativeStates'],'rustTests':report['rust'],'checks':report['checks'],'validation':'references/validation/picker-controls.json','remaining':report['remaining']}
(ROOT/'references/picker-controls-status.json').write_text(json.dumps(status,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'nativeStates':report['nativeStates'],'rust':report['rust'],'coverage':{k:[{a:b for a,b in v.items() if a!='rows'}for v in values] for k,values in report['browsers'].items()}},indent=2))
