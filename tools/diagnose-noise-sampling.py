"""Isolate filter/UNORM precision on an already-flat white Acrylic backdrop."""
from pathlib import Path
from PIL import Image
from struct import pack,unpack
import json,math

noise=Image.open('references/winui/NoiseAsset_256X256_PNG.png').convert('RGBA')
native=Image.open('out/overlay-controls-native/RawAppBackdrop-Edge.png').convert('RGB')
def f32(x): return unpack('f',pack('f',x))[0]
rows=[]
for precision in [None,8,9,10]:
 samples=[]
 for y in range(200,300):
  for x in range(925,1025):
   xx=((x+.5)/1.25-100-.5)%256; yy=((y+.5)/1.25-100-.5)%256
   ix,iy=math.floor(xx),math.floor(yy);fx,fy=xx-ix,yy-iy
   if precision:fx=round(fx*2**precision)/2**precision;fy=round(fy*2**precision)/2**precision
   a,b,c,d=[noise.getpixel((i%256,j%256)) for i,j in [(ix,iy),(ix+1,iy),(ix,iy+1),(ix+1,iy+1)]]
   v=[((a[k]*(1-fx)+b[k]*fx)*(1-fy)+(c[k]*(1-fx)+d[k]*fx)*fy)/255 for k in [0,3]]
   samples.append((v,native.getpixel((x,y))[0]))
 for filtered_rounding in ['none','floor','nearest']:
  for arithmetic in ['f64','f32']:
   for blend in ['lerp','over']:
    cast=f32 if arithmetic=='f32' else float;error=0;count=0
    for (color,alpha),expected in samples:
     if filtered_rounding!='none':
      r=math.floor if filtered_rounding=='floor' else round;color=r(color*255)/255;alpha=r(alpha*255)/255
     color,alpha=cast(color),cast(alpha);opacity=cast(alpha*cast(.02))
     value=cast(1+cast(cast(color-1)*opacity)) if blend=='lerp' else cast(cast(1-opacity)+cast(color*opacity))
     value=round(cast(value*255));error+=abs(value-expected);count+=value!=expected
    rows.append(dict(precision=precision,filteredRounding=filtered_rounding,arithmetic=arithmetic,blend=blend,mean=error/len(samples),different=count))
rows.sort(key=lambda r:r['mean'])
Path('references/validation/overlay-noise-sampling-diagnostic.json').write_text(json.dumps(dict(rows=rows,boundary='Diagnostic fixed-function precision candidates; one flat region, no production parameter fitting or claim of hardware-independent equivalence.'),indent=2)+'\n')
print(json.dumps(rows[:12],indent=2))
