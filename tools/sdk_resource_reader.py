"""Resolve composed-control brushes from the pinned SDK dictionaries."""
from pathlib import Path
import json,re,math,xml.etree.ElementTree as E
ROOT=Path(__file__).resolve().parent.parent
X='{http://schemas.microsoft.com/winfx/2006/xaml}'
sdk=Path.home()/'.nuget/packages/microsoft.windowsappsdk.winui/2.3.10-experimental/lib/native/Microsoft.UI/Themes/generic.xaml'
root=E.parse(sdk).getroot();table={'Shared':{}}
tag=lambda n:n.tag.rsplit('}',1)[-1]
for n in root:
 if n.get(X+'Key'):table['Shared'][n.get(X+'Key')]=n
 if tag(n)=='ResourceDictionary.ThemeDictionaries':
  for d in n:
   theme=d.get(X+'Key');table[theme]={v.get(X+'Key'):v for v in d if v.get(X+'Key')}
def find(theme,key):
 for t in [theme,'Shared','Default']:
  if key in table.get(t,{}):return table[t][key]
 raise KeyError(key)
def color(theme,value,seen=()):
 value=value.strip()
 m=re.fullmatch(r'\{(?:ThemeResource|StaticResource) (.+)\}',value)
 if m:return resolve_color(theme,m[1],seen)
 if value=='Transparent':return '#00000000'
 if value=='Black':return '#000000'
 if value=='White':return '#ffffff'
 if value=='LightGray':return '#d3d3d3'
 if value.startswith('#'):
  h=value[1:]
  if len(h)==8:return '#'+h[2:]+h[:2]
  if len(h)==6:return value
  if len(h)==3:return '#'+''.join(c*2 for c in h)
 raise ValueError(value)
def resolve_color(theme,key,seen=()):
 if key in seen:raise ValueError('cycle '+key)
 if theme=='HighContrast' and key.startswith('SystemColor'):
  return '#808080' if 'GrayText' in key else '#000000' if any(t in key for t in ['HighlightText','ButtonFace','WindowColor']) else '#ffff00' if any(t in key for t in ['Highlight','Hotlight']) else '#ffffff'
 n=find(theme,key)
 if tag(n)=='StaticResource':return resolve_color(theme,n.get('ResourceKey'),(*seen,key))
 if tag(n)=='Color':return color(theme,n.text or '',(*seen,key))
 if tag(n)=='SolidColorBrush':return color(theme,n.get('Color','Transparent'),(*seen,key))
 raise ValueError(key)
def transform(node):
 kind=tag(node)
 if kind=='ScaleTransform':
  sx=float(node.get('ScaleX','1'));sy=float(node.get('ScaleY','1'));cx=float(node.get('CenterX','0'));cy=float(node.get('CenterY','0'))
  return [sx,0,0,sy,cx*(1-sx),cy*(1-sy)]
 if kind=='MatrixTransform':return [float(v)for v in re.split(r'[,\s]+',node.get('Matrix','1,0,0,1,0,0').strip())]
 if kind=='TranslateTransform':return [1,0,0,1,float(node.get('X','0')),float(node.get('Y','0'))]
 if kind=='RotateTransform':
  a=math.radians(float(node.get('Angle','0')));c=math.cos(a);s=math.sin(a);x=float(node.get('CenterX','0'));y=float(node.get('CenterY','0'))
  return [c,s,-s,c,x-c*x+s*y,y-s*x-c*y]
 raise ValueError('unsupported brush transform '+kind)

def brush_transform(node,property):
 value=next((n for n in node if tag(n).endswith('.'+property)),None)
 return transform(value[0]) if value is not None and len(value) else [1,0,0,1,0,0]

def brush(theme,key,seen=()):
 if key in seen:raise ValueError('cycle '+key)
 n=find(theme,key);kind=tag(n)
 if kind=='StaticResource':return brush(theme,n.get('ResourceKey'),(*seen,key))
 if kind=='Color':return {'kind':'solid','color':color(theme,n.text or 'Transparent'),'opacity':1.0}
 if kind=='SolidColorBrush':return {'kind':'solid','color':color(theme,n.get('Color','Transparent')),'opacity':float(n.get('Opacity','1'))}
 if kind=='AcrylicBrush':return {'kind':'acrylic','tint':color(theme,n.get('TintColor')),'tintOpacity':float(n.get('TintOpacity','1')),'luminosityOpacity':float(n.get('TintLuminosityOpacity','1')),'fallback':color(theme,n.get('FallbackColor'))}
 if kind=='LinearGradientBrush':
  return {'kind':'linearGradient','mappingMode':n.get('MappingMode','RelativeToBoundingBox'),'spreadMethod':n.get('SpreadMethod','Pad'),'relativeTransform':brush_transform(n,'RelativeTransform'),'transform':brush_transform(n,'Transform'),'from':[float(v) for v in n.get('StartPoint','0,0').split(',')],'to':[float(v) for v in n.get('EndPoint','1,1').split(',')],'opacity':float(n.get('Opacity','1')),'stops':[{'offset':float(v.get('Offset')),'color':color(theme,v.get('Color'))} for v in n.iter() if tag(v)=='GradientStop']}
 raise ValueError(kind+' '+key)
