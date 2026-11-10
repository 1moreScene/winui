"""Original geometric demo avatar; no photograph, external font or traced outline.

Copyright (c) 2026 WinUI WASM contributors. SPDX-License-Identifier: MIT
Requires Pillow only when regenerating, not when building or using the SDK.
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'gallery/public/project'
DEST.mkdir(parents=True, exist_ok=True)
svg = '''<svg xmlns="http://www.w3.org/2000/svg" width="225" height="160" viewBox="0 0 225 160">
<!-- Original geometric demo avatar. Copyright (c) 2026 WinUI WASM contributors. MIT. -->
<rect width="225" height="160" fill="#315d88"/>
<circle cx="112" cy="57" r="29" fill="#e2ecf5"/>
<ellipse cx="112" cy="156" rx="64" ry="59" fill="#e2ecf5"/>
</svg>
'''
(DEST / 'person-profile.svg').write_text(svg, encoding='utf8')
scale = 4
image = Image.new('RGB', (225 * scale, 160 * scale), '#315d88')
draw = ImageDraw.Draw(image)
for box in [(83, 28, 141, 86), (48, 97, 176, 215)]:
    draw.ellipse(tuple(value * scale for value in box), fill='#e2ecf5')
image.resize((225, 160), Image.Resampling.LANCZOS).save(DEST / 'person-profile.png')
print('Generated original project avatar (PNG and SVG).')
