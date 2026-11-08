from pathlib import Path
import json,hashlib,xml.etree.ElementTree as E
R=Path(__file__).resolve().parents[1];X='{http://schemas.microsoft.com/winfx/2006/xaml}'
ir={'sourceCommit':'7b12709347527238494ca28cb9fed326d513e779','metrics':{},'aliases':{},'primitives':{}}
def tag(n):return n.tag.rsplit('}',1)[-1]
for file in ['references/scroll-primitives/controls__dev__CommonStyles__ScrollBar_themeresources.xaml','references/winui/Slider_themeresources.xaml']:
 root=E.parse(R/file).getroot()
 for n in root:
  if tag(n)=='Double'and n.get(X+'Key'):ir['metrics'][n.get(X+'Key')]=float(n.text)
 for theme,key in [('Light','Light'),('Dark','Default'),('HighContrast','HighContrast')]:
  for d in root.iter():
   if tag(d)=='ResourceDictionary'and d.get(X+'Key')==key:
    for n in d:
     if tag(n)=='StaticResource':ir['aliases'].setdefault(theme,{})[n.get(X+'Key')]=n.get('ResourceKey')
ir['tickBar']={'minimumGap':20,'thickness':'one physical pixel','source':'TickBar_Partial.h / TickBar_Partial.cpp'}
ir['repeat']={'delayMilliseconds':250,'intervalMilliseconds':50,'source':'RepeatButton default Delay; ScrollBar repeat part Interval=50'}
# Reuse the pinned SDK brush resolver without executing its output-writing phase.
resolver={'__file__':str(R/'tools/extract-composed-resources.py')}
source=(R/'tools/extract-composed-resources.py').read_text(encoding='utf-8')
exec(compile(source.split("\ndata=json.loads",1)[0],str(R/'tools/extract-composed-resources.py'),'exec'),resolver)
keys=['ScrollBarTrackFill','ScrollBarThumbFill','ScrollBarThumbFillPointerOver','ScrollBarThumbFillPressed','ScrollBarThumbFillDisabled','ScrollBarButtonArrowForeground','ScrollBarButtonArrowForegroundPressed','ScrollBarButtonArrowForegroundDisabled','SliderTickBarFill','SliderTickBarFillDisabled']
for theme,native in [('Light','Light'),('Dark','Default'),('HighContrast','HighContrast')]:
 ir['primitives'][theme]={key:resolver['brush'](native,key)for key in keys}
ir['sdkSource']=str(resolver['sdk'])
ir['sdkSourceSha256']=hashlib.sha256(resolver['sdk'].read_bytes()).hexdigest()
p=R/'references/scroll-primitives-template.json';s=json.dumps(ir,ensure_ascii=False,indent=2)+'\n'
if not p.exists()or p.read_text(encoding='utf-8')!=s:p.write_text(s,encoding='utf-8')
print('Extracted source metrics and theme aliases for scroll primitives')
