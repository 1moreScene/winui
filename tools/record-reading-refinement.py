"""Record actual Rust, production browser and same-SDK Gallery validation."""
from pathlib import Path
import json, hashlib, datetime, re
from PIL import Image, ImageChops, ImageStat
R=Path(__file__).resolve().parents[1]
read=lambda path:json.loads((R/path).read_text(encoding='utf-8-sig'))
sha=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
native=read('references/validation/reading-gallery-native.json')
browser=read('references/validation/reading-gallery-browser.json')
results=read('out/reading-production-results.json')
manifest=read('out/reading-production/.vite/manifest.json')
paths={p for entry in manifest.values() for p in entry.get('assets',[]) if p.endswith('.wasm')}
assert len(paths)==1,paths
wasm=R/'out/reading-production'/next(iter(paths))
log=(R/'out/reading-rust-validation.log').read_text(encoding='utf-8-sig')
passed=[int(n) for n in re.findall(r'test result: ok\. (\d+) passed',log)]
suite_names=re.findall(r"Running tests[\\/]([a-z_]+)\.rs",log)
assert len(passed)==len(suite_names) and len(passed)>=5,(passed,suite_names)
assert results['stats']['unexpected']==0 and results['stats']['expected']>=17,results['stats']
assert all(c['buildVersion']==sha(wasm) for c in browser['cases']), 'Matrix belongs to another WASM build'
def world_rect(n):return dict(x=n['world'][4],y=n['world'][5],width=n['rect']['width'],height=n['rect']['height'])
def intersects(a,b):return a['x']<b['x']+b['width'] and a['x']+a['width']>b['x'] and a['y']<b['y']+b['height'] and a['y']+a['height']>b['y']
for case in browser['cases']:
 ref=next(c for c in native['cases'] if c['id']==case['id'])
 if 'nodes' not in case:continue
 case['visibleItemErrors']=[]
 if ref['kind']=='ItemsView':
  viewport=next(p['rect'] for p in ref['parts'] if p['type']=='ItemsView')
  for index,item in enumerate(p for p in ref['parts'] if p['type']=='ItemContainer'):
   if not intersects(item['rect'],viewport):continue
   node=next((n for n in case['nodes'] if n['kind']=='CollectionItem' and n['props']['collectionIndex']==index),None)
   if node:
    actual=world_rect(node)
    case['visibleItemErrors'].append(dict(index=index,**{key:actual[key]-item['rect'][key] for key in ['x','y','width','height']}))
 source=R/f'out/reading-gallery-native/{case["id"]}.png'
 actual=R/f'out/reading-gallery-browser/{case["renderer"]}-{case["id"]}.png'
 bounds=(24,24,664,min(1000,24+int(max(case['rect']['height'],ref['rect']['height']))))
 a=Image.open(actual).convert('RGB').crop(bounds);b=Image.open(source).convert('RGB').crop(bounds)
 case['sampleRegionMeanAbsoluteRGBError']=sum(ImageStat.Stat(ImageChops.difference(a,b)).mean)/3
 # Keep committed evidence compact; the test can regenerate the complete trees.
 case['nodeGeometry']=[{'id':n['id'],'kind':n['kind'],'rect':n['rect'],'world':n['world'],'visible':n['visible'],'text':str(n['props'].get('text',''))[:80],'collectionIndex':n['props'].get('collectionIndex')} for n in case['nodes'] if n['kind'] in ['CollectionItem','Image','Button','NumberBox','ComboBox','TextBlock','Border','RichTextBlock','RichTextBlockOverflow']]
 case['nodeCount']=len(case.pop('nodes'))
(R/'references/validation/reading-gallery-browser.json').write_text(json.dumps(browser,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
files=['src/scene/reading_controls.rs','src/scene/reading_controls/advanced.rs','src/scene/reading_controls/rich.rs','src/scene/repeater.rs','src/scene/collections.rs','src/scene/layout.rs','src/scene/input.rs','packages/winui-wasm/src/scene.ts','packages/winui-wasm/src/react.tsx','packages/winui-wasm/src/reading-controls-types.ts','gallery/src/ReadingControlsPage.tsx','references/reading-controls-template.json','tools/record-reading-refinement.py','gallery/tests/reading-controls.spec.ts','gallery/tests/reading-gallery-fixture.ts']
status={
 'date':datetime.date.today().isoformat(),
 'controls':['ItemsView','AnnotatedScrollBar','PagerControl','LayoutPanel','RichTextBlock'],
 'ownership':{'Rust':['control tree','layout and line breaking','bidi order','UTF-16 selection','highlighting','overflow chains','item packing and realization','commands and paging','scroll coordination','label collision and templates','tooltip and repeat scheduling','hit testing','painting','lifetime'],'TypeScript':['typed handles','business objects','callbacks','clipboard and input host adaptation','accessibility projection'],'React':'same SDK factories and business templates'},
 'rust':{'passed':sum(passed),'suites':dict(zip(suite_names,passed))},
 'browser':results['stats'],'nativeStates':len(native['cases']),'browserNativeStates':len(browser['cases']),
 'legacyNativeStates':len(read('references/validation/reading-native.json')['cases']),
 'wasm':{'tested':sha(wasm),'current':sha(R/'packages/winui-wasm/src/wasm/winui_bg.wasm'),'matchesCurrentBinary':sha(wasm)==sha(R/'packages/winui-wasm/src/wasm/winui_bg.wasm'),'matrixMatchesTestedBinary':all(c['buildVersion']==sha(wasm) for c in browser['cases']),'bytes':wasm.stat().st_size},
 'sourceFiles':len(read('references/reading-controls-sources.json')['files']),
 'sourceFingerprints':{p:sha(R/p) for p in files},
 'validationArtifacts':['references/validation/reading-gallery-native.json','references/validation/reading-gallery-browser.json','references/validation/reading-gallery-release-audit.json','out/reading-production-results.json','out/reading-rust-validation.log'],
 'limits':[
  'Store package and probe DLL hashes match. Five sample interactions were observed directly in the Store window; controlled-width/theme comparisons use the native probe.',
  'Visible Gallery layouts and sample interactions are validated. The full native LinedFlowLayout frozen-line/cache optimizer and every arbitrary data source are not proven equivalent.',
  'Browser font shaping/rasterization follows Rust bidi/layout. This is not DirectWrite pixel equivalence or a complete Windows UIA text provider.',
  'Rich native ActualWidth/Height and SDK allocated scene rectangles have different semantics; their differences remain explicitly recorded.',
  'Static captures and mean image errors do not establish Composition, AnimatedIcon or transition-frame equivalence.',
  'Button Style supports typed SDK property overrides, not general arbitrary XAML ControlTemplates.',
  'User-requested suppression of focus outlines is an explicit native appearance exception.'
 ]
}
assert status['wasm']['matrixMatchesTestedBinary'],status['wasm']
(R/'references/reading-controls-status.json').write_text(json.dumps(status,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:status[k] for k in ['rust','browser','nativeStates','browserNativeStates','wasm']},indent=2))
