"""Keep native differences explicit; pixel averages never authorize parity."""
import json
from pathlib import Path
from PIL import Image, ImageChops

root=Path(__file__).resolve().parents[1]
directory=root/'out/table-view-native-performance'
native=json.loads((directory/'geometry.json').read_text(encoding='utf-8-sig'))
rust=json.loads((directory/'rust-geometry.json').read_text(encoding='utf-8'))
results=[]
for name in ['editing','large']:
    for state in (['default','scrolled','editor-default','editor-scrolled'] if name=='editing' else ['default','scrolled']):
        nr=next(r for r in native if r['name']==f'{name}-{state}')
        rr=next(r for r in rust['geometry'] if r['key']==name and r['state']==state)
        table=next(p for p in rr['parts'] if p['kind']=='TableView')
        assert rr['dpr']==nr['scale']
        assert abs(table['rect']['width']-nr['bounds']['width'])<.01 and abs(table['rect']['height']-nr['bounds']['height'])<.01, 'Native and Rust fixture dimensions must match before comparing pixels'
        # RTB can allocate the overflowing descendant width. Only compare the
        # declared root region, recording that crop; preserve original captures.
        n=Image.open(directory/f'{name}-{state}.png').convert('RGBA')
        r=Image.open(directory/f'rust-{name}-{state}.png').convert('RGBA')
        bounds=(0,0,round(nr['bounds']['width']*nr['scale']),round(nr['bounds']['height']*nr['scale']))
        if r.width<bounds[2] or r.height<bounds[3]:raise ValueError((r.size,bounds))
        background=Image.new('RGBA',(bounds[2],bounds[3]),(243,243,243,255))
        a=Image.alpha_composite(background,n.crop(bounds)).convert('RGB')
        b=Image.alpha_composite(background,r.crop(bounds)).convert('RGB')
        diff=ImageChops.difference(a,b);errors=[max(pixel) for pixel in diff.get_flattened_data()]
        native_rows=[p['bounds'] for p in nr['parts'] if p['type']=='TableViewRow']
        rust_rows=[p for p in rr['parts'] if p.get('name') and ', Name:' in p['name']]
        native_names=[p['text'] for p in sorted(nr['parts'],key=lambda p:p['bounds']['y']) if p['type']=='TextBlock' and p.get('text') and 30<=p['bounds']['x']<196 and 32.8<=p['bounds']['y']<340]
        rust_names=[p['name'].split(', Name: ',1)[1] for p in sorted(rust_rows,key=lambda p:p['world'][5]) if 32.8-.001<=p['world'][5]<330]
        results.append({'name':name,'state':state,'nativeImageSize':n.size,'nativeRootCrop':bounds,'rustImageSize':r.size,'rustRootCrop':bounds,
            'background':'#F3F3F3','pixels':len(errors),'changedPixels':sum(e>0 for e in errors),
            'pixelsAbove16':sum(e>16 for e in errors),'maximumError':max(errors),'meanMaxChannelError':sum(errors)/len(errors),
            'nativeFirstRow':native_rows[0] if native_rows else None,
            'rustFirstNameCell':rust_rows[0] if rust_rows else None,
            'nativeVisibleNameText':native_names,'rustVisibleNameText':rust_names,
            'visibleNameContentMatches':native_names==rust_names,
            'pixelComparisonScope':'Render differences include different tied-age row content; not a rendering acceptance metric' if name=='large' and state=='scrolled' else 'Comparable visible business rows; text, control geometry and focus-policy differences remain',
            'acceptedAsNativeParity':False})
report={'scope':'Same light theme, accent, data, explicit row/header heights, frozen columns, 125% DPI and root size; raw RTB vs Rust Canvas2D with declared background. Static comparisons do not certify Composition presentation.',
    'acceptedAsFullNativeParity':False,'results':results,
    'remainingDifferences':['Canvas and native text/vector rasterization','Switch and editor geometry still require the complete WinUI 1.6.4 state matrix','Default minimum-height sizing versus explicit fixed row height is outside this fixture','Native reset sorting retains ListView anchoring; Rust reset currently retains scroll offset','Native and Rust order tied-age rows differently in the large sorted fixture; raw pixel errors include that content difference','Physical 120Hz presentation and full editor/drag/frozen state matrix remain unaccepted']}
(directory/'comparison.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps([{k:r[k] for k in ['name','state','changedPixels','pixelsAbove16','meanMaxChannelError']} for r in results],indent=2))
