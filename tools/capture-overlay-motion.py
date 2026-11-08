"""Capture the same UxTheme timing records consumed by pinned ThemeGenerator.cpp."""
import ctypes as C, json, platform
from pathlib import Path
u=C.WinDLL('uxtheme');u.OpenThemeData.argtypes=[C.c_void_p,C.c_wchar_p];u.OpenThemeData.restype=C.c_void_p
u.CloseThemeData.argtypes=[C.c_void_p]
u.GetThemeAnimationProperty.argtypes=[C.c_void_p,C.c_int,C.c_int,C.c_int,C.c_void_p,C.c_uint,C.POINTER(C.c_uint)]
u.GetThemeAnimationTransform.argtypes=[C.c_void_p,C.c_int,C.c_int,C.c_uint,C.c_void_p,C.c_uint,C.POINTER(C.c_uint)]
u.GetThemeTimingFunction.argtypes=[C.c_void_p,C.c_int,C.c_void_p,C.c_uint,C.POINTER(C.c_uint)]
animation=u.OpenThemeData(None,'Animations');timing=u.OpenThemeData(None,'timingfunction')
if not animation or not timing:raise RuntimeError('Theme animation data unavailable')
result={'os':platform.platform(),'source':'ThemeGenerator.cpp / vsanimation.h / UxTheme APIs','records':{}}
try:
 for name,story in [('flyoutOpen',18),('flyoutClose',19),('toolTipOpen',4),('toolTipClose',5)]:
  count=C.c_uint();size=C.c_uint()
  if u.GetThemeAnimationProperty(animation,story,1,1,C.byref(count),4,C.byref(size))<0:raise RuntimeError(name)
  rows=[]
  for index in range(count.value):
   buffer=C.create_string_buffer(256)
   if u.GetThemeAnimationTransform(animation,story,1,index,buffer,256,C.byref(size))<0:raise RuntimeError(name+' transform')
   kind,curve_id,start,duration,flags=(C.c_uint*5).from_buffer(buffer)
   curve_buffer=C.create_string_buffer(64)
   if u.GetThemeTimingFunction(timing,curve_id,curve_buffer,64,C.byref(size))<0:raise RuntimeError('curve')
   curve_kind=C.c_uint.from_buffer(curve_buffer).value
   curve=list((C.c_float*4).from_buffer(curve_buffer,4)) if curve_kind==1 else [0.,0.,1.,1.]
   values=list((C.c_float*(6 if kind in [0,1] else 2 if kind==2 else 8)).from_buffer(buffer,20))
   rows.append({'kind':kind,'delayMs':start,'durationMs':duration,'flags':flags,'curve':curve,'values':values})
  result['records'][name]=rows
finally:u.CloseThemeData(animation);u.CloseThemeData(timing)
path=Path(__file__).resolve().parent.parent/'references/overlay-native-motion.json'
path.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result['records'],indent=2))
