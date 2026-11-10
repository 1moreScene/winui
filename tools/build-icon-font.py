"""Rebuild the checked-in portable fallback (requires fonttools). No system fonts."""
from pathlib import Path
import hashlib
import json
from fontTools.ttLib import TTFont
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from icon_geometry import geometry

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'third_party/icon-fonts'
read = lambda p: json.loads(p.read_text(encoding='utf-8-sig'))
legacy = TTFont(SOURCE / 'Symbols.ttf')
fluent = TTFont(SOURCE / 'FluentSystemIcons-Regular.ttf')
filled = TTFont(SOURCE / 'FluentSystemIcons-Filled.ttf')
mapping = {code: (legacy, code) for code in legacy.getBestCmap()}
symbols = read(ROOT / 'references/icons-template.json')['symbols']
for name, code in read(ROOT / 'references/sdk-symbols.json').items():
    if code in legacy.getBestCmap():
        mapping[ord(symbols[name])] = (legacy, code)
metadata = read(SOURCE / 'FluentSystemIcons-Regular.json')
for code, name in read(SOURCE / 'fallback-map.json').items():
    if isinstance(name, dict):
        mapping[int(code,16)] = (filled, read(SOURCE / 'FluentSystemIcons-Filled.json')[name['filled']])
    else:
        mapping[int(code, 16)] = (fluent, metadata[name])
native_metrics = read(SOURCE / 'native-metrics.json')['glyphs']
glyphs = {'.notdef': TTGlyphPen(None).glyph()}
metrics = {'.notdef': (2048, 0)}
cmap = {}
for code, (font, original) in sorted(mapping.items()):
    name = f'icon{code:04X}'
    source = font.getBestCmap()[original]
    pen = TTGlyphPen(None)
    scale = 2048 / font['head'].unitsPerEm
    font.getGlyphSet()[source].draw(TransformPen(pen, (scale, 0, 0, scale, 0, 0)))
    glyphs[name] = pen.glyph()
    advance, bearing = font['hmtx'][source]
    metrics[name] = (round(advance * scale), round(bearing * scale))
    original = geometry(f'{code:04X}')
    if original is not None:
        # The recipe grid uses screen coordinates; convert to font coordinates.
        pen = TTGlyphPen(None)
        original.draw(TransformPen(pen,(1,0,0,-1,0,1920)),None)
        glyphs[name] = pen.glyph()
    if f'{code:04X}' in native_metrics:
        # Fit ink bounds/advance, never copy native outlines into the asset.
        current = glyphs[name]
        bounds = BoundsPen(None);current.draw(bounds,None)
        if bounds.bounds:
            x0,y0,x1,y1 = bounds.bounds
            target = native_metrics[f'{code:04X}']
            a,b,c,d = target['bounds'];sx=(c-a)/(x1-x0);sy=(d-b)/(y1-y0)
            pen=TTGlyphPen(None)
            current.draw(TransformPen(pen,(sx,0,0,sy,a-x0*sx,b-y0*sy)),None)
            glyphs[name]=pen.glyph();metrics[name]=(target['advance'],round(a))
    cmap[code] = name
builder = FontBuilder(2048, isTTF=True)
builder.setupGlyphOrder(list(glyphs))
builder.setupCharacterMap(cmap)
builder.setupGlyf(glyphs)
builder.setupHorizontalMetrics(metrics)
# Segoe Fluent Icons uses a one-em line box (2048 ascent, zero descent/gap).
# A text-font descender reserve here shifts and enlarges every fallback icon.
builder.setupHorizontalHeader(ascent=2048, descent=0, lineGap=0)
builder.setupNameTable({'familyName':'WinUI Portable Icons','styleName':'Regular',
    'uniqueFontIdentifier':'WinUI Portable Icons 1','fullName':'WinUI Portable Icons',
    'psName':'WinUIPortableIcons','version':'Version 1.0',
    'copyright':'Copyright (c) Microsoft Open Technologies, Inc.; Copyright (c) 2020 Microsoft Corporation; Copyright (c) 2026 WinUI WASM contributors. Modified work.',
    'licenseDescription':'Apache-2.0 and MIT components. Remapped, scaled, fitted and merged; see THIRD_PARTY_NOTICES.txt and third_party/icon-fonts/Symbols-NOTICE. No Windows font outlines included.',
    'licenseInfoURL':'https://www.apache.org/licenses/LICENSE-2.0'})
builder.setupOS2(sTypoAscender=2048, sTypoDescender=0, sTypoLineGap=0, usWinAscent=2048, usWinDescent=0)
builder.setupPost()
builder.font['head'].created = builder.font['head'].modified = 2082844800
builder.font.recalcTimestamp = False
builder.font.flavor = 'woff'
output = ROOT / 'packages/winui-wasm/src/assets/winui-icons.woff'
output.parent.mkdir(exist_ok=True)
builder.save(output)
manifest = {'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),
    'codepoints':[f'{code:04X}' for code in sorted(cmap)],
    'sources':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(SOURCE.iterdir()) if p.is_file() and p.name != 'coverage.json'}}
(SOURCE / 'coverage.json').write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
print(f'Built portable font: {len(cmap)} codepoints, {output.stat().st_size} bytes')
