"""Snapshot UxTheme records used by the pinned LayoutTransition/ThemeGenerator.

The Windows animation records are machine data, not hand fitted Gallery curves.
"""
import ctypes as C
import json
import platform
from pathlib import Path

u = C.WinDLL('uxtheme')
u.OpenThemeData.argtypes = [C.c_void_p, C.c_wchar_p]
u.OpenThemeData.restype = C.c_void_p
u.CloseThemeData.argtypes = [C.c_void_p]
u.GetThemeAnimationProperty.argtypes = [C.c_void_p, C.c_int, C.c_int, C.c_int, C.c_void_p, C.c_uint, C.POINTER(C.c_uint)]
u.GetThemeAnimationTransform.argtypes = [C.c_void_p, C.c_int, C.c_int, C.c_uint, C.c_void_p, C.c_uint, C.POINTER(C.c_uint)]
u.GetThemeTimingFunction.argtypes = [C.c_void_p, C.c_int, C.c_void_p, C.c_uint, C.POINTER(C.c_uint)]
animation = u.OpenThemeData(None, 'Animations')
timing = u.OpenThemeData(None, 'timingfunction')
if not animation or not timing:
    raise RuntimeError('Theme animation records unavailable')
result = {'os': platform.platform(), 'source': 'Pinned ThemeGenerator.cpp + LayoutTransition_partial.cpp; Windows UxTheme / vsanimation.h', 'records': {}}
try:
    for name, story, target in [('entrance', 32, 1), ('reposition', 3, 1), ('content', 24, 1), ('contentOut', 24, 2), ('add', 8, 1), ('delete', 9, 1), ('popup', 18, 1), ('popupOut', 19, 1)]:
        count, size = C.c_uint(), C.c_uint()
        if u.GetThemeAnimationProperty(animation, story, target, 1, C.byref(count), 4, C.byref(size)) < 0:
            raise RuntimeError(name)
        rows = []
        for index in range(count.value):
            buffer, curve_buffer = C.create_string_buffer(256), C.create_string_buffer(64)
            if u.GetThemeAnimationTransform(animation, story, target, index, buffer, 256, C.byref(size)) < 0:
                raise RuntimeError(name + ' transform')
            kind, curve_id, start, duration, flags = (C.c_uint * 5).from_buffer(buffer)
            if u.GetThemeTimingFunction(timing, curve_id, curve_buffer, 64, C.byref(size)) < 0:
                raise RuntimeError(name + ' timing')
            curve = list((C.c_float * 4).from_buffer(curve_buffer, 4)) if C.c_uint.from_buffer(curve_buffer).value == 1 else [0., 0., 1., 1.]
            values = list((C.c_float * (6 if kind in [0, 1] else 2 if kind == 2 else 8)).from_buffer(buffer, 20))
            rows.append(dict(kind=kind, delayMs=start, durationMs=duration, flags=flags, curve=curve, values=values))
        properties = {}
        for prop, label in [(2, 'staggerDelay'), (3, 'staggerDelayCap'), (4, 'staggerFactor')]:
            value = C.c_float() if prop == 4 else C.c_uint()
            if u.GetThemeAnimationProperty(animation, story, target, prop, C.byref(value), 4, C.byref(size)) >= 0:
                properties[label] = value.value
        result['records'][name] = dict(tracks=rows, **properties)
finally:
    u.CloseThemeData(animation)
    u.CloseThemeData(timing)
path = Path(__file__).resolve().parent.parent / 'references/gallery-motion-native.json'
path.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(path)
