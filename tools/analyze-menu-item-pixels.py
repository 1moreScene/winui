"""Inspect same-DPR composed screenshots without resizing or alignment fitting."""
from pathlib import Path
import json
from PIL import Image, ImageChops, ImageStat
root=Path(__file__).resolve().parent.parent
native=json.loads((root/'references/menu-item-native.json').read_text(encoding='utf-8-sig'))
results=[]
for row in (r for r in native['rows'] if r['state'] in ['Normal','Narrow']):
    theme=row['theme'];kind=row['kind'];state=row['state']
    scale=row['dpr'];x,y,w,h=row['clientBounds']
    assert x>=0 and y>=0, 'Presenter must be inside the captured probe client'
    image=Image.open(root/f'out/menu-item-native/{theme}-{kind}-{state}-composed.png').convert('RGB')
    crop=image.crop((round(x*scale),round(y*scale),round((x+w)*scale),round((y+h)*scale)))
    crop.save(root/f'out/menu-item-native/{theme}-{kind}-{state}-crop.png')
    for backend in ['Canvas2D','WebGL2']:
        name=f'{backend}-{theme}' if kind=='MenuItems' else f'{backend}-{theme}-{kind}-{state}'
        browser=Image.open(root/f'out/menu-item-comparison/{name}.png').convert('RGB')
        width=min(browser.width,crop.width);height=min(browser.height,crop.height)
        diff=ImageChops.difference(browser.crop((0,0,width,height)),crop.crop((0,0,width,height)))
        mean=sum(ImageStat.Stat(diff).mean)/3
        results.append(dict(theme=theme,kind=kind,state=state,backend=backend,nativeSize=crop.size,browserSize=browser.size,overlapMeanAbsoluteRgbError=mean,pixelParityAccepted=False))
result=dict(scope='Normal composed probe screenshots. Overlap only, no resize or alignment fitting. Numeric differences are diagnostic and do not accept pixel equivalence.',rows=results)
(root/'references/menu-item-pixel-comparison.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf8')
print(json.dumps(results,indent=2))
