"""Reproduce the fixed Gallery command/menu examples without reading working edits."""
from pathlib import Path
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parents[1]
COMMIT = '7360ac322414e118eadfb0c7c2f4ecc31a218f59'
KINDS = {'SplitView', 'SemanticZoom', 'ParallaxView', 'XamlUICommand', 'StandardUICommand'}
baseline = json.loads((ROOT / 'references/baseline.json').read_text(encoding='utf-8-sig'))
gallery = Path(baseline['gallery']['path'])

def git(*args):
    return subprocess.check_output(['git', '-C', str(gallery), *args])

# The catalog supplies headers/descriptions; ensure it belongs to the pinned source.
catalog = json.loads((gallery / 'catalog/windows-samples.json').read_text(encoding='utf-8'))
controls, sources = {}, []
for control in catalog['controls']:
    name = control['name']
    if name not in KINDS:
        continue
    prefix = f'WinUIGallery/Samples/{name}/'
    files = git('ls-tree', '-r', '--name-only', COMMIT, '--', prefix).decode().splitlines()
    for path in files:
        if Path(path).suffix not in {'.cs', '.xaml', '.txt'}:
            continue
        data = git('show', f'{COMMIT}:{path}')
        target = ROOT / 'references/gallery-input' / name / Path(path).name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        sources.append({'local': target.relative_to(ROOT).as_posix(), 'upstream': path,
                        'sha256': hashlib.sha256(data).hexdigest()})
    controls[name] = {'description': control['details'], 'samples': [
        {'title': sample['header'], 'xaml': sample.get('xaml', ''), 'code': sample.get('code', '')}
        for sample in control['samples']]}
assert set(controls) == KINDS
output = {'commit': COMMIT, 'controls': controls, 'sources': sources}
(ROOT / 'gallery/src/official-view-command.json').write_text(
    json.dumps(output, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Extracted {len(controls)} controls, {sum(len(c["samples"]) for c in controls.values())} examples, {len(sources)} source files')

# SDK template projection is independent of the runtime's native screenshots.
import xml.etree.ElementTree as E
from sdk_resource_reader import root, sdk, tag, X, brush, find
ir=json.loads((ROOT/'references/view-command-template.json').read_text(encoding='utf-8'))
ir['sdk']='Microsoft.WindowsAppSDK.WinUI/2.3.10-experimental'
ir['sdkSha256']=hashlib.sha256(sdk.read_bytes()).hexdigest()
selected=E.Element(root.tag);ir['styles']={};ir['metrics']={}
for n in root.iter():
 key=n.get(X+'Key','')
 if tag(n)=='Style' and (n.get('TargetType','') in ['SplitView','SemanticZoom'] or key in ['DefaultSplitViewStyle','SemanticZoomRevealStyle']):
  selected.append(E.fromstring(E.tostring(n)));ir['styles'][key or n.get('TargetType')]={s.get('Property'):s.get('Value') for s in n if tag(s)=='Setter' and s.get('Value') is not None}
 if key.startswith(('SplitView','SemanticZoom')) and tag(n) in ['Double','String','Thickness','CornerRadius','Duration']:
  selected.append(E.fromstring(E.tostring(n)));ir['metrics'].setdefault(key,n.text or '')
semantic=next(n for n in root.iter() if tag(n)=='Style' and n.get('TargetType')=='SemanticZoom' and not n.get(X+'Key'))
button=next(n for n in semantic.iter() if n.get(X+'Name')=='ZoomOutButton');ir['zoomButton']=dict(button.attrib)
ir['palettes']={}
for theme,source in [('Light','Light'),('Dark','Default'),('HighContrast','HighContrast')]:
 ir['palettes'][theme]={k:brush(source,k) for k in ['SystemControlPageBackgroundChromeLowBrush','SplitViewLightDismissOverlayBackground']}
E.ElementTree(selected).write(ROOT/'references/sdk/view-command.xaml',encoding='utf-8',xml_declaration=True)
(ROOT/'references/view-command-template.json').write_text(json.dumps(ir,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# Resolve each SplitView transition directly from its storyboard, including
# resource duration references. Windows fade metrics are saved native evidence.
import re
split=next(n for n in root.iter() if tag(n)=='Style' and n.get(X+'Key')=='DefaultSplitViewStyle')
def motion(before,after):
 transition=next(n for n in split.iter() if tag(n)=='VisualTransition' and n.get('From')==before and n.get('To')==after)
 frame=next(n for n in transition.iter() if tag(n)=='SplineDoubleKeyFrame')
 time=frame.get('KeyTime');resource=re.fullmatch(r'\{StaticResource (.+)\}',time)
 if resource:time=ir['metrics'][resource[1]]
 h,m,s=map(float,time.split(':'))
 return {'durationMs':round((h*3600+m*60+s)*1000),'curve':[float(v) for v in re.split(r'[, ]+',frame.get('KeySpline'))]}
ir['motion']={'overlayOpen':motion('Closed','OpenOverlayLeft'),'compactOpen':motion('ClosedCompactLeft','OpenCompactOverlayLeft'),'inlineOpen':motion('Closed','OpenInlineLeft'),'overlayClose':motion('OpenOverlayLeft','Closed'),'compactClose':motion('OpenCompactOverlayLeft','ClosedCompactLeft'),'inlineClose':motion('OpenInlineLeft','Closed')}
(ROOT/'references/view-command-template.json').write_text(json.dumps(ir,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# Complete live examples (the catalog text intentionally abbreviates them).
gallery_data_path='WinUIGallery/SampleSupport/Data/ControlInfoData.json'
gallery_data_bytes=git('show',f'{COMMIT}:{gallery_data_path}')
gallery_data=json.loads(gallery_data_bytes.decode('utf-8-sig'))
(ROOT/'references/gallery-input/ControlInfoData.json').write_bytes(gallery_data_bytes)
output['sources'].append({'local':'references/gallery-input/ControlInfoData.json','upstream':gallery_data_path,'sha256':hashlib.sha256(gallery_data_bytes).hexdigest()})
output['data']=gallery_data
for name,control in controls.items():
 page=E.fromstring(git('show',f'{COMMIT}:WinUIGallery/Samples/{name}/{name}Page.xaml'))
 examples=[n for n in page.iter() if tag(n)=='ControlExample']
 for sample,example in zip(control['samples'],examples):
  live=next((c for c in example if not tag(c).startswith('ControlExample.')),None)
  if live is None:live=next(c[0]for c in example if tag(c)=='ControlExample.Example')
  sample['runtimeXaml']=E.tostring(live,encoding='unicode')
  sample['optionsXaml']='\n'.join(E.tostring(c,encoding='unicode')for c in example if tag(c)=='ControlExample.Options')
  sample['exampleAttributes']=dict(example.attrib)
  sample['description']=' '.join(' '.join(n.itertext()).split()) if (n:=next((n for n in live.iter() if tag(n)=='TextBlock' and n.text and n.text.strip()),None))is not None else ''
(ROOT/'gallery/src/official-view-command.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
ir['palettes']={theme:{**value,**{key:brush(source,key)for key in ['SystemControlBackgroundChromeMediumLowBrush','SystemControlForegroundAltHighBrush','SwipeItemForeground','SwipeItemBackground','SwipeItemPreThresholdExecuteForeground','SwipeItemPreThresholdExecuteBackground','SwipeItemPostThresholdExecuteForeground']}}for (theme,source),value in zip([('Light','Light'),('Dark','Default'),('HighContrast','HighContrast')],ir['palettes'].values())}
ir['swipeThreshold']=float(re.search(r'c_ThresholdValue = ([\d.]+)',(ROOT/'references/view-command/controls__dev__SwipeControl__SwipeControl.cpp').read_text()).group(1))
ir['dependencyStyles']={}
for n in root.iter():
 if tag(n)=='Style' and n.get(X+'Key')in ['DefaultSwipeControlStyle','DefaultScrollViewStyle']:
  ir['dependencyStyles'][n.get(X+'Key')]=E.tostring(n,encoding='unicode')
(ROOT/'references/view-command-template.json').write_text(json.dumps(ir,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

semantic_source=(ROOT/'references/view-command/dxaml__xcp__dxaml__lib__SemanticZoom_Partial.cpp').read_text()
def define(name):return float(re.search(r'#define '+re.escape(name)+r'\s+([\d.]+)',semantic_source).group(1))
low=define('_zoomMin');high=define('_zoomMax');span=high-low
clamp=lambda v,lo,hi:max(lo,min(hi,v))
upper=clamp(span*define('_upperThresholdDelta'),define('c_thresholdDeltaMin'),define('c_thresholdDeltaMax'))
lower=clamp(span*define('_lowerThresholdDelta'),define('c_thresholdDeltaMin'),define('c_thresholdDeltaMax'))
buffer=clamp(define('_thresholdBufferDelta'),define('c_thresholdBufferDeltaMin'),define('c_thresholdBufferDeltaMax'))
ir['semanticPinch']={'minimum':low,'maximum':high,'upperLow':high-upper-buffer,'upperHigh':high-upper,'lowerLow':low+lower,'lowerHigh':low+lower+buffer,'minimumDelta':define('zoomDeltaThreshold')}
transition=next(n for n in semantic.iter()if tag(n)=='VisualTransition'and n.get('To')=='ZoomOutButtonHidden')
h,m,s=map(float,next(n for n in transition if tag(n)=='Storyboard').get('BeginTime').split(':'))
ir['zoomButtonHideDelayMs']=(h*3600+m*60+s)*1000
(ROOT/'references/view-command-template.json').write_text(json.dumps(ir,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
