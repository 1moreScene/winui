"""Compile the pinned LottieGen Composition subset; reject unrecognized semantics."""
from pathlib import Path
import re,json,hashlib,shutil
ROOT=Path(__file__).resolve().parent.parent
N=r'[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?'
names=['Back','ChevronDownSmall','ChevronRightDownSmall','ChevronUpDownSmall','Find','GlobalNavigationButton','Settings']
def numbers(s):return [float(x) for x in re.findall(N,s)]
def args(s):
 out=[];start=0;depth=0;quoted=False
 for i,c in enumerate(s):
  if c=='"':quoted=not quoted
  if quoted:continue
  if c in '({[':depth+=1
  if c in ')}]':depth-=1
  if c==',' and depth==0:out.append(s[start:i].strip());start=i+1
 return out+[s[start:].strip()]
def calls(s,name):
 out=[]
 for m in re.finditer(re.escape(name)+r'\(',s):
  start=m.end();depth=1;quote=False
  for i in range(start,len(s)):
   c=s[i]
   if c=='"':quote=not quote
   if not quote:
    if c=='(':depth+=1
    if c==')':depth-=1
   if depth==0:out.append(args(s[start:i]));break
 return out
def save(p,o):(ROOT/p).write_text(json.dumps(o,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
all_sources={};fingerprints=[]
for short in names:
 name='Animated'+short+'VisualSource';p=ROOT/'references/winui'/f'{name}.cpp';raw=p.read_text(encoding='utf-8-sig')
 fingerprints.append({'path':p.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
 text=re.sub(r'//[^\n]*','',raw)
 methods={m.group(2):(m.group(1).strip(),m.group(3)) for m in re.finditer(r'(?m)^    ([^\n]+?) (\w+)\(\)(?: const)?\s*\{(.*?)\n    \}',text,re.S)}
 aliases={}
 for key,(_,b) in methods.items():
  for alias in re.findall(r'(?:return|=)\s*(_\w+)\s*=',b):aliases[alias]=key
 def ref(v):
  v=v.strip().removesuffix('()');v=aliases.get(v,v)
  assert v in methods,(name,'unknown reference',v)
  return v
 def ease(v):
  if v.startswith('_c.CreateCubicBezierEasingFunction('):return {'curve':numbers(','.join(calls(v,'_c.CreateCubicBezierEasingFunction')[0]))}
  t,b=methods[ref(v)]
  if t=='CubicBezierEasingFunction':
   a=calls(b,'_c.CreateCubicBezierEasingFunction')[0];return {'curve':numbers(','.join(a))}
  assert t=='StepEasingFunction',(name,v,t)
  assert 'IsFinalStepSingleFrame(true)' in b or 'IsInitialStepSingleFrame(true)' in b
  return {'step':'end' if 'IsFinalStepSingleFrame(true)' in b else 'start'}
 def value(v):
  if v.startswith('L"'):
   expr=v[2:-1];variables=set(re.findall(r'_\.(t\d+)',expr));pts=[numbers(p) for p in re.findall(r'Vector2\(([^)]+)\)',expr)]
   assert len(variables)==1 and len(pts)==4 and expr.startswith('Pow(1-_.'),(name,'unsupported expression',expr)
   # Only the generated cubic Bernstein expression is accepted.
   variable=next(iter(variables));expected=f'Pow(1-_.{variable},3)*Vector2'
   assert expr.startswith(expected) and expr.count('Square(')==2 and expr.count('Pow(')==2
   return {'variable':variable,'points':pts}
  if v in ['true','false']:return [1. if v=='true' else 0.]
  return numbers(v)
 animations={}
 for key,(typ,b) in methods.items():
  if not typ.endswith('KeyFrameAnimation'):continue
  kind={'ScalarKeyFrameAnimation':'scalar','Vector2KeyFrameAnimation':'vector','BooleanKeyFrameAnimation':'bool'}[typ]
  initial=calls(b,'Create'+typ);assert len(initial)==1,(name,key)
  entries=initial+calls(b,'result.InsertKeyFrame')+calls(b,'result.InsertExpressionKeyFrame')
  keys=[{'progress':float(a[0].rstrip('F')),'value':value(a[1]),**(ease(a[2]) if len(a)>2 else {})} for a in entries]
  keys.sort(key=lambda k:k['progress']);animations[key]={'kind':kind,'keys':keys}
 geometries={};groups={}
 for key,(typ,b) in methods.items():
  if typ!='winrt::com_ptr<CanvasGeometry>':continue
  if 'CreateGeometryGroup' in b:
   assert 'D2D1_FILL_MODE_WINDING' in b
   groups[key]=re.findall(r'(Geometry_\d+)\(\)\.get\(\)->Geometry\(\)',b);continue
  commands=[]
  for m in re.finditer(r'sink->(BeginFigure|AddLine|AddBezier|EndFigure)\((.*?)\);',b,re.S):
   op,arg=m.groups();vals=numbers(args(arg)[0])
   if op=='BeginFigure':assert len(vals)==2;commands.append({'Move':vals})
   if op=='AddLine':assert len(vals)==2;commands.append({'Line':vals})
   if op=='AddBezier':assert len(vals)==6;commands.append({'Cubic':vals})
   if op=='EndFigure' and 'CLOSED' in arg:commands.append('Close')
  assert commands and set(re.findall(r'sink->(\w+)\(',b))<=set(['SetFillMode','BeginFigure','AddLine','AddBezier','EndFigure','Close'])
  geometries[key]={'commands':commands,'evenOdd':'D2D1_FILL_MODE_WINDING' not in b}
 for key,children in groups.items():
  assert children
  geometries[key]={'commands':[cmd for child in children for cmd in geometries[child]['commands']],'evenOdd':False}
 for key,(typ,b) in methods.items():
  if typ=='CompositionEllipseGeometry':
   radius=value(calls(b,'result.Radius')[0][0]);geometries[key]={'ellipse':radius}
 def geometry(v):
  key=ref(v)
  if key in geometries:return key
  typ,b=methods[key];assert typ=='CompositionPathGeometry',(name,key,typ)
  match=re.search(r'CanvasGeometryToIGeometrySource2D\((\w+)\(\)\)',b);assert match,(name,key)
  return match.group(1)
 allowed={'CenterPoint','Offset','Scale','TransformMatrix','RotationAngleInDegrees','IsVisible','Opacity','Size','Clip','FillBrush','StrokeBrush','StrokeThickness','StrokeDashCap','StrokeStartCap','StrokeEndCap','StrokeLineJoin','StrokeMiterLimit','Children','Shapes','Properties'}
 def node(key):
  typ,b=methods[key];assert typ in ['ContainerVisual','ShapeVisual','CompositionContainerShape','CompositionSpriteShape']
  properties={};geo=None
  if typ=='CompositionSpriteShape':
   constructor=calls(b,'_c.CreateSpriteShape') or calls(b,'CreateSpriteShape');assert len(constructor)==1,(name,key)
   a=constructor[0];g=a[0]
   if g=='geometry':g=re.search(r'const auto geometry = ([^;]+);',b).group(1)
   geo=geometry(g)
   if len(a)>=2:properties['TransformMatrix']=numbers(a[1])
   if len(a)>=3:properties['FillBrush']=[1.]
  for prop in sorted(set(re.findall(r'result\.(\w+)\(',b))):
   assert prop in allowed,(name,key,'unsupported property',prop)
   if prop in ['Children','Shapes','Properties']:continue
   a=calls(b,'result.'+prop)[0]
   if prop in ['FillBrush','StrokeBrush']:properties[prop]=[1.]
   elif prop=='Clip':
    _,clip=methods[ref(a[0])];assert '_c.CreateInsetClip()' in clip and not re.search(r'result\.\w+\(',clip)
    properties['Clip']=[1.]
   elif prop.startswith('Stroke') and '::' in a[0]:
    assert a[0].endswith('::Round'),(name,key,prop,a)
    properties[prop]=[1.]
   else:properties[prop]=value(a[0])
  matrix=properties.get('TransformMatrix')
  if matrix and len(matrix)==16:properties['TransformMatrix']=[matrix[i] for i in [0,1,4,5,12,13]]
  assert not matrix or len(properties['TransformMatrix'])==6
  child_refs=re.findall(r'(?:\.Append|\.InsertAtTop)\((\w+)\(\)\)',b)
  bindings={a[1][2:-1]:ref(a[2]) for a in calls(b,'StartProgressBoundAnimation')}
  return {'properties':properties,'geometry':geo,'animations':bindings,'children':[node(c) for c in child_refs]}
 root=node('Root');_,root_body=methods['Root']
 vars={a[1][2:-1]:ref(a[2]) for a in calls(root_body,'StartProgressBoundAnimation') if a[0]=='propertySet'}
 root['animations']={k:v for k,v in root['animations'].items() if k not in vars}
 markers={k:float(v) for k,v in re.findall(r'\{ L"([A-Za-z_]+)", ('+N+r') \}',raw)}
 duration=float(re.search(r'c_durationTicks\{ (\d+)',raw).group(1))/10000
 size=numbers(re.search(r'winrt::float2 Size\(\) const\s*\{\s*return \{([^}]+)',text).group(1))
 all_sources[short]={'duration':duration,'size':size,'markers':markers,'animations':animations,'variables':vars,'geometries':geometries,'root':root}
 print(short,len(geometries),'geometries',len(animations),'tracks',len(markers),'markers')
save('references/animated-icons.json',{'sourceCommit':'7b12709347527238494ca28cb9fed326d513e779','sources':fingerprints,'visuals':all_sources})
baseline=json.loads((ROOT/'references/baseline.json').read_text(encoding='utf-8-sig'));gallery=Path(baseline['gallery']['path']);dest=ROOT/'references/gallery-input/AnimatedIcon';dest.mkdir(exist_ok=True)
for p in (gallery/'WinUIGallery/Samples/AnimatedIcon').iterdir():
 if p.suffix in ['.cs','.xaml','.txt']:shutil.copyfile(p,dest/p.name)
catalog=json.loads((gallery/'catalog/windows-samples.json').read_text(encoding='utf-8-sig'));control=next(c for c in catalog['controls'] if c['id']=='animatedicon')
save('gallery/src/official-animated-icons.json',{'description':control['details'],'samples':[{'title':s['header'],'xaml':s['xaml']} for s in control['samples']]})
