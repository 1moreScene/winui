"""Extract the pinned WinUI AnimatedAccept paths, transforms and marker slices.

Input is Microsoft's MIT-licensed generated C++ source; the full file and its
SHA-256 remain under references/. Fail on unsupported geometry or transform
changes rather than silently inventing a replacement animation.
"""
from pathlib import Path
import hashlib
import json
import re

PIN = '7b12709347527238494ca28cb9fed326d513e779'
path = Path('references/winui/AnimatedAcceptVisualSource.cpp')
source = path.read_text(encoding='utf-8-sig')
NUMBER = r'(-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?)[FL]?'


def method(name):
    match = re.search(r'\b' + re.escape(name) + r'\(\)(?: const)?\s*\{(.*?)\n    \}', source, re.S)
    assert match, name
    return match.group(1)


def numbers(value):
    return [float(x) for x in re.findall(NUMBER, value)]


def matrix(body, call):
    match = re.search(re.escape(call) + r'\([^;]*?\{([^}]+)\}', body)
    assert match, call
    return numbers(match.group(1))


geometries = []
for index in range(3):
    body = method(f'Geometry_{index}')
    points = [[float(x), float(y)] for x, y in re.findall(
        r'(?:BeginFigure|AddLine)\(\{\s*' + NUMBER + r',\s*' + NUMBER, body)]
    assert len(points) in (2, 3), points
    assert 'AddBezier' not in body, 'New geometry must be explicitly supported'
    geometries.append(points)

markers = {key: float(value) for key, value in re.findall(
    r'\{ L"([A-Za-z_]+)", ([\d.]+) \}', method('Markers'))}
assert len(markers) == 39
curves = []
# Each easing call has two float2 arguments.
for i in range(2):
    curves.append(numbers(re.search(r'CreateCubicBezierEasingFunction\((.*?)\);', method(f'CubicBezierEasingFunction_{i}')).group(1)))
    assert len(curves[i]) == 4

segments = {}
for index in range(15):
    name = f'SpriteShape_{index:02}'
    location = source.index(f'CompositionSpriteShape {name}()')
    comment = source[:location].split('return result;')[-1]
    label = re.findall(r'PreComp layer: (.*)', comment)[-1].strip()
    key = 'Indeterminate' if 'Indeterminate State' in label else re.search(r'(\w+To\w+)', label).group(1)
    body = method(name)
    geometry_call = re.search(r'(PathGeometry_\d+)\(\)|(_pathGeometry_\d+)', body)
    geometry = method(geometry_call.group(1) or 'PathGeometry_09')
    geometry_index = 0 if 'Geometry_0()' in geometry else 2 if 'Geometry_2()' in geometry else 1
    segment = {'geometry': geometry_index}
    trim = re.search(r'L"(TrimStart|TrimEnd)", (\w+)\(\)', geometry)
    if trim:
        animation = method(trim.group(2))
        keys = re.findall(r'(?:CreateScalarKeyFrameAnimation|InsertKeyFrame)\(' + NUMBER + r', ' + NUMBER, animation)
        assert len(keys) >= 2
        # Generated C++ constructs the easing once (CubicBezierEasingFunction_0())
        # and reuses it through _cubicBezierEasingFunction_0. Casing is significant
        # in C++, but both references must resolve to the same extracted curve.
        easing_ids = re.findall(r'cubicBezierEasingFunction_(\d+)', animation, re.I)
        assert len(easing_ids) == 1, f'Unknown/ambiguous trim easing: {animation}'
        easing_index = int(easing_ids[0])
        assert easing_index < len(curves)
        segment['trim'] = {
            'property': trim.group(1),
            'start': float(keys[-2][0]),
            'end': float(keys[-1][0]),
            'curve': curves[easing_index],
        }
    segments[key] = segment

for key, start in markers.items():
    if key.endswith('_Start'):
        name = key[:-6]
        segment = segments.setdefault(name, {'geometry': None})
        segment.update(start=start, end=markers[name + '_End'])

container = matrix(method('ContainerVisual_00'), 'TransformMatrix')
shape = matrix(method('SpriteShape_01'), 'CreateSpriteShape')
stroke = re.search(r'StrokeThickness\(' + NUMBER, method('SpriteShape_01'))
size = numbers(method('Size'))
ticks = int(re.search(r'c_durationTicks\{ (\d+)L', source).group(1))
runtime_path = Path('references/validation/native-accept-timing.json')
if runtime_path.exists():
    runtime = json.loads(runtime_path.read_text(encoding='utf-8-sig'))
    assert runtime['durationMs'] == ticks / 10000, 'Native accept duration drift'
    assert runtime['markers'] == markers, 'Native accept marker drift'
assert container[0] == container[5] and container[12:14] == [24, 24]
assert shape == [shape[0], 0, 0, shape[0], 24, 23]
assert size == [48, 48]
result = {
    'sourceCommit': PIN,
    'sourceSha256': hashlib.sha256(path.read_bytes()).hexdigest(),
    'durationMs': ticks / 10000,
    'size': size[0],
    'scale': container[0],
    'shapeScale': shape[0],
    'stroke': float(stroke.group(1)),
    'geometries': geometries,
    'markers': markers,
    'segments': segments,
}
Path('references/animated-accept.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(f'Extracted {len(segments)} accept segments, {len(markers)} markers and {len(geometries)} paths')
