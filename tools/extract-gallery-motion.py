"""Extract pinned Gallery examples, dimensions, options and source; no duplicate snippets."""
import hashlib
import json
import re
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'references/gallery-motion'
X = '{http://schemas.microsoft.com/winfx/2006/xaml}'
def tag(node): return node.tag.rsplit('}', 1)[-1]
def snippet(path):
    text = path.read_text(encoding='utf-8-sig')
    marker = re.search(r'^--- (?:xaml|c#)\s*$', text, re.M)
    if not marker: raise ValueError(f'Missing sample language marker: {path}')
    title, code = text[:marker.start()], text[marker.end():]
    return {'title': title.removeprefix('--- header').strip(), 'xaml': code.strip()}
def page(name): return ET.parse(SOURCE / name / f'{name}Page.xaml').getroot()
def extract_acrylic():
    root = page('Acrylic')
    samples=[]
    colors={'Aqua':'#00ffff','Magenta':'#ff00ff','Yellow':'#ffff00','Black':'#000000','Green':'#008000','SkyBlue':'#87ceeb'}
    for name in ['Example1','Example3','Example4']:
        example=next(n for n in root.iter() if n.get(X+'Name')==name)
        grid=next(n for n in example.iter() if n.get(X+'Name')==name+'Grid')
        definition=example.get('SampleDefinition').split('\\')[-1]
        sample=snippet(SOURCE/'Acrylic'/definition)
        sample['name']=name
        sample['minWidth']=int(grid.get('MinWidth'))
        sample['baseHeight']=int(grid.get('Height',grid.get('MinHeight','200')))
        sample['shapes']=[]
        for n in grid.iter():
            if tag(n) in ['Rectangle','Ellipse'] and n.get('Fill') in colors:
                allowed={'Width','Height','HorizontalAlignment','VerticalAlignment','Fill'}
                assert set(n.attrib)<=allowed, f'Unsupported shape attributes: {n.attrib}'
                sample['shapes'].append({'kind':tag(n),'width':int(n.get('Width')),'height':int(n.get('Height')),
                    'horizontal':n.get('HorizontalAlignment'),'vertical':n.get('VerticalAlignment'),'fill':colors[n.get('Fill')]})
        assert len(sample['shapes'])==3
        sample['layouts']={}
        for state in ['WideLayout','WiderLayout']:
            setters=next(n for n in root.iter() if n.get(X+'Name')==state)
            sample['layouts'][state]={n.get('Target').split('.')[-1]:float(n.get('Value')) for n in setters.iter()
                if tag(n)=='Setter' and n.get('Target','').startswith(name+'Grid.')}
        sample['columns']=[n.get('Width') for n in grid.iter() if tag(n)=='ColumnDefinition']
        samples.append(sample)
    return samples
easing=page('EasingFunction')
easing_samples=[]
for example in easing.iter():
    if tag(example)!='ControlExample': continue
    sample=snippet(SOURCE/'EasingFunction'/example.get('SampleDefinition').split('\\')[-1])
    animation=next(n for n in example.iter() if tag(n)=='DoubleAnimation')
    parts=list(map(float,animation.get('Duration').split(':')))
    sample['duration']=1000*(parts[0]*3600+parts[1]*60+parts[2])
    sample['easing']=next((tag(n) for n in animation.iter() if tag(n) in ['CircleEase','ExponentialEase']),None)
    sample['mode']=next((n.get('EasingMode') for n in animation.iter() if n.get('EasingMode')),None)
    sample['exponent']=next((float(n.get('Value')) for n in example.iter() if tag(n)=='NumberBox'),None)
    easing_samples.append(sample)
transition_source=(ROOT/'references/winui/SharedTransitionAnimations.cpp').read_text(encoding='utf-8-sig')
curve=re.search(r'CreateCubicBezierEasingFunction\(compositor, \{ ([\d.]+)f, ([\d.]+)f \}, \{ ([\d.]+)f, ([\d.]+)f \}',transition_source)
assert curve, 'Missing fixed-source scalar/vector transition easing'
defaults=json.loads((ROOT/'references/motion-native-defaults.json').read_text(encoding='utf-8-sig'))
transition={'curve':[float(v) for v in curve.groups()], 'duration':defaults['scalarMs'], 'vectorDuration':defaults['vectorMs']}
result={'galleryCommit':'7360ac322414e118eadfb0c7c2f4ecc31a218f59','acrylic':extract_acrylic(),'easing':easing_samples, 'propertyTransition':transition,
    'catalog':[], 'sources':[{'path':str(p.relative_to(ROOT)).replace('\\','/'),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in SOURCE.rglob('*') if p.is_file()]}
for directory in SOURCE.iterdir():
    if directory.is_dir():
        if directory.name in ['ConnectedAnimation','ThemeTransition','XamlCompInterop']:
            # Use the actual page order, including C#-only Composition samples.
            paths=[directory/n.get('SampleDefinition').split('\\')[-1] for n in page(directory.name).iter() if tag(n)=='ControlExample' and n.get('SampleDefinition')]
        else:
            paths=[p for p in sorted(directory.glob('*.txt')) if '--- xaml' in p.read_text(encoding='utf-8-sig')]
        result['catalog'].append({'name':directory.name,'samples':[snippet(p) for p in paths]})
target=ROOT/'gallery/src/official-motion.json'
text=json.dumps(result,indent=2,ensure_ascii=False)+'\n'
if not target.exists() or target.read_text(encoding='utf-8')!=text: target.write_text(text,encoding='utf-8')
print(f'Extracted {len(result["acrylic"])} Acrylic and {len(easing_samples)} easing examples; {len(result["sources"])} pinned sources.')
