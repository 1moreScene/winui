"""Compare matched SDK hover templates and retain raw native input observations."""
from pathlib import Path
import datetime, hashlib, json, math
from PIL import Image, ImageChops, ImageStat

ROOT=Path(__file__).resolve().parent.parent
native=json.loads((ROOT/'references/composed-choice-interaction.json').read_text(encoding='utf-8-sig'))
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
report={'recordedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'nativeRun':json.loads((ROOT/'references/choice-interaction-run.json').read_text(encoding='utf-8-sig')),
        'wasmSha256':digest(ROOT/'out/composed-validation/gallery/src/wasm/winui_bg.wasm'),
        'editorHostSha256':digest(ROOT/'out/composed-validation/gallery/src/editor-host.ts'),
        'scope':native['scope'],'fullNativePixelMatch':False,'backends':{}}
for backend in ['Canvas2D','WebGL2']:
    rows=[]
    for theme in ['Light','Dark']:
        for editable in [False,True]:
            label=f'{theme}-'+('Editable' if editable else 'ReadOnly')
            for state,fixture in [('Hover','HoverTemplate'),('SelectedHover','SelectedHoverTemplate')]:
                row=next(r for r in native['rows'] if r['theme']==theme and r['editable']==editable and r['state']==fixture)
                n=Image.open(ROOT/'out/choice-native'/row['image']).convert('RGB')
                a=Image.open(ROOT/'out/composed-choice'/backend/f'choice-{label}-{state}.png').convert('RGB')
                parts=[p for group in row['parts'] for p in group]
                items=[p for p in parts if p['type']=='ComboBoxItem']
                patches=[]
                for index,name in [(0,'hoveredItem'),(1,'acrylicBody'),(2,'selectedItem')]:
                    r=items[index]['bounds'];x=r['x']+r['width']*.7;y=r['y']+8
                    box=(math.ceil(x*1.25),math.ceil(y*1.25),math.floor((r['x']+r['width']*.9)*1.25),math.floor((r['y']+r['height']-8)*1.25))
                    error=sum(ImageStat.Stat(ImageChops.difference(n,a).crop(box)).mean)/3
                    patches.append({'name':name,'region':box,'rgbMae':error,'nativeMean':ImageStat.Stat(n.crop(box)).mean,'browserMean':ImageStat.Stat(a.crop(box)).mean})
                rows.append({'name':label+'-'+state,'nativeFixture':fixture,'nativeStates':row['visualStates'],'patches':patches})
    report['backends'][backend]={'rows':rows,'maxMaterialPatchRgbMae':max(p['rgbMae'] for r in rows for p in r['patches'] if p['name']=='acrylicBody')}
report['nativePointerClose']={'observations':sum(r['state'].startswith('Close-')for r in native['rows']),
                            'allSelectedFirstAndClosed':all(r['SelectedIndex']==0 and not r['IsDropDownOpen'] and r['popupCount']==0 for r in native['rows'] if r['state'].startswith('Close-'))}
report['notes']=['NumberBox clear is deliberately based on current nonempty editable content and focus, independent of input history.',
                 'Unchanged Rust selection no longer overwrites a pending browser selection before select/selectionchange arrives.',
                 'Windowed popup shadows are outside the Acrylic sampling surface.',
                 'Hover visual comparisons use explicitly marked native VSM fixtures; real native pointer observations remain separately recorded.',
                 'Raw glyph coverage, noise phase, desktop backdrop and Store distribution animation parity remain outside this acceptance.']
(ROOT/'references/validation/composed-choice.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'materialPatchMax':{k:v['maxMaterialPatchRgbMae']for k,v in report['backends'].items()},'nativePointerClose':report['nativePointerClose']},indent=2))
