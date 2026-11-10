"""Original geometric fallback outlines on a 24-unit design grid.

These are primitives, not outlines extracted from Windows fonts. Numeric native
ink bounds are applied separately by build-icon-font.py.
"""
import math
from fontTools.pens.ttGlyphPen import TTGlyphPen


def geometry(code):
    recipes = {
        'E770': [('box', 4, 3, 16, 15, 2, 1.2), ('line', [(2, 21), (22, 21)], 1.2)],
        'E793': [('ring',12,12,4.5,1.2),('polygon',[(12,12)]+[(12+4.5*math.cos(math.pi/2+i*math.pi/32),12+4.5*math.sin(math.pi/2+i*math.pi/32)) for i in range(33)])]
            + [('line',[(12+8*math.cos(i*math.pi/4),12+8*math.sin(i*math.pi/4)),(12+11*math.cos(i*math.pi/4),12+11*math.sin(i*math.pi/4))],1.3) for i in range(8)],
        'E7C4': [('line', [(10, 3), (22, 3), (22, 15), (10, 15), (10, 3)], 1.5),
            ('line', [(10, 9), (3, 9), (3, 21), (15, 21), (15, 15)], 1.5)],
        'E8A7': [('line', [(12, 3), (4, 3), (4, 21), (21, 21), (21, 12)], 1.5),
            ('line', [(10, 14), (22, 2), (14, 2)], 1.5), ('line', [(22, 2), (22, 10)], 1.5)],
        'EC8F': [('line', [(4, 9), (12, 2), (20, 9)], 1.5), ('line', [(4, 15), (12, 22), (20, 15)], 1.5)],
        'F13E': [('line', [(3, 12), (9, 18), (21, 5)], 3)],
        'E936': [('polygon', [(2, 4), (22, 4), (12, 15)])],
        'E788': [('line', [(21, 21), (21, 12), (12, 21), (21, 21)], 1.5)],
        'E80A': [('box',3,3,18,18,1.5,1.2)]
            + [('line', [(v, 3), (v, 21)], 1.5) for v in (9, 15)]
            + [('line', [(3, v), (21, v)], 1.5) for v in (9, 15)],
        'E9D9': [('box',4,4,16,16,3,1.2),
            ('line', [(2, 12), (7, 12), (9, 7), (12, 17), (15, 10), (17, 12), (22, 12)], 1.5)],
        'EA39': [('ring', 12, 12, 10, 1.1), ('line', [(8, 8), (16, 16)], 1.1), ('line', [(16, 8), (8, 16)], 1.1)],
        'EA38': [('line', [(12+10*math.cos(a), 12+10*math.sin(a)),
                           (12-10*math.cos(a), 12-10*math.sin(a))], 1.5)
                  for a in (0, math.pi/4, math.pi/2, 3*math.pi/4)],
        'EB3C': [('line', [(3, 2), (3, 22), (20, 22), (3, 2)], 1.5),
            ('line', [(7, 13), (7, 18), (11, 18), (7, 13)], 1.3),
            ('line', [(17, 17), (17, 3), (21, 3), (21, 21)], 1.5)]
            + [('line', [(17, y), (19, y)], 1.3) for y in (7, 10, 13)],
        'EDE1': [('line', [(3, 3), (3, 21)], 1.5), ('line', [(7, 12), (21, 12)], 1.5),
            ('line', [(15, 6), (21, 12), (15, 18)], 1.5)],
        'F0AD': [('line', [(12, 21), (12, 3)], 3), ('line', [(4, 11), (12, 3), (20, 11)], 3)],
        'F0AE': [('line', [(12, 3), (12, 21)], 3), ('line', [(4, 13), (12, 21), (20, 13)], 3)],
        'F13F': [('circle', 12, 5, 1.2), ('line', [(12, 10), (12, 20)], 2)],
        'F13C': [('circle', 12, 20, 1.1), ('line', [(12, 4), (12, 14)], 2)],
        'F13D': [('line', [(6, 6), (18, 18)], 2), ('line', [(18, 6), (6, 18)], 2)],
        'E990': [('line', [(2, 6), (22, 6), (22, 18), (2, 18), (2, 6)], 1.5),
            ('line', [(3, 15), (21, 15)], 1.3), ('line', [(5, 11), (13, 11)], 1.3), ('circle', 19, 10, 0.7)],
    }
    if code not in recipes:
        return None
    pen = TTGlyphPen(None)

    def polygon(points, hole=False):
        area=sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(points,points[1:]+points[:1]))
        if (area < 0) != hole:
            points=list(reversed(points))
        # TTGlyphPen rounds coordinates to integers: scale the design grid
        # before recording so circles and thin strokes retain sub-grid detail.
        points=[(x*80,y*80) for x,y in points]
        pen.moveTo(points[0])
        for point in points[1:]:pen.lineTo(point)
        pen.closePath()

    def circle(x,y,r,hole=False):
        polygon([(x+r*math.cos(i*math.tau/64),y+r*math.sin(i*math.tau/64)) for i in range(64)],hole)

    def box(x,y,w,h,r,hole=False):
        points=[]
        for cx,cy,start in [(x+w-r,y+r,-math.pi/2),(x+w-r,y+h-r,0),(x+r,y+h-r,math.pi/2),(x+r,y+r,math.pi)]:
            points.extend((cx+r*math.cos(start+i*math.pi/32),cy+r*math.sin(start+i*math.pi/32)) for i in range(17))
        polygon(points,hole)

    for recipe in recipes[code]:
        kind,*args=recipe
        if kind=='circle':circle(*args)
        elif kind=='polygon':polygon(args[0])
        elif kind=='box':
            x,y,w,h,r,stroke=args;box(x,y,w,h,r);box(x+stroke,y+stroke,w-2*stroke,h-2*stroke,max(0,r-stroke),True)
        elif kind=='ring':
            x,y,r,w=args;circle(x,y,r);circle(x,y,r-w,True)
        else:
            points,width=args;r=width/2
            for a,b in zip(points,points[1:]):
                length=math.dist(a,b);dx=(b[1]-a[1])/length*r;dy=-(b[0]-a[0])/length*r
                polygon([(a[0]+dx,a[1]+dy),(b[0]+dx,b[1]+dy),(b[0]-dx,b[1]-dy),(a[0]-dx,a[1]-dy)])
            for x,y in points:circle(x,y,r)
    return pen.glyph()
