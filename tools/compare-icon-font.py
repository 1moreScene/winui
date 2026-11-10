"""Local-only native raster QA; never exports native font outlines."""
from pathlib import Path
import json
import math
from PIL import Image, ImageDraw, ImageFont, ImageChops
from fontTools.ttLib import TTFont

ROOT=Path(__file__).resolve().parents[1]
output=ROOT/'out/icon-parity';output.mkdir(exist_ok=True)
font=TTFont(ROOT/'packages/winui-wasm/src/assets/winui-icons.woff');font.flavor=None;font.save(output/'fallback.ttf')
native=ImageFont.truetype('C:/Windows/Fonts/SegoeIcons.ttf',64)
portable=ImageFont.truetype(str(output/'fallback.ttf'),64)
before=ImageFont.truetype(str(output/'before.ttf'),64) if (output/'before.ttf').exists() else None
codes=list(json.loads((ROOT/'third_party/icon-fonts/fallback-map.json').read_text()))
def raster(font,code):
    image=Image.new('L',(96,96));ImageDraw.Draw(image).text((12,80),chr(int(code,16)),font=font,fill=255,anchor='ls');return image
def iou(a,b):
    a=a.point(lambda p:255 if p>127 else 0);b=b.point(lambda p:255 if p>127 else 0)
    return sum(ImageChops.darker(a,b).tobytes())/max(1,sum(ImageChops.lighter(a,b).tobytes()))
sheet=Image.new('RGB',(8*204,math.ceil(len(codes)/8)*126),'white');draw=ImageDraw.Draw(sheet);results=[]
for i,code in enumerate(codes):
    a=raster(native,code);b=raster(portable,code);x=i%8*204;y=i//8*126
    draw.text((x+4,y+2),code,fill='black');sheet.paste(ImageChops.invert(a).convert('RGB'),(x,y+24));sheet.paste(ImageChops.invert(b).convert('RGB'),(x+100,y+24))
    results.append({'code':code,'iou':iou(a,b),'beforeIoU':iou(a,raster(before,code)) if before else None})
sheet.save(output/'after.png')
(output/'results.json').write_text(json.dumps({'method':'64px baseline-aligned binary raster IoU; local Windows font only, not full native control acceptance','glyphs':results},indent=2)+'\n')
print('Compared',len(results),'glyphs; average IoU',round(sum(r['iou'] for r in results)/len(results),3))
if before:print('Before average IoU',round(sum(r['beforeIoU'] for r in results)/len(results),3))
