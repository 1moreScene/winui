"""Extract the pinned Progress templates and built-in AnimatedVisual contract."""
from pathlib import Path
import json, re, hashlib, shutil, xml.etree.ElementTree as E

ROOT = Path(__file__).resolve().parent.parent
X = '{http://schemas.microsoft.com/winfx/2006/xaml}'
def tag(n): return n.tag.rsplit('}', 1)[-1]
def save(path, data):
    (ROOT/path).write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')

ir = {'sourceCommit': '7b12709347527238494ca28cb9fed326d513e779', 'aliases': {}, 'primitives': {}, 'scalars': {}, 'styles': {}, 'requiredBrushes': {}}
for name in ['ProgressBar', 'ProgressRing']:
    resources = E.parse(ROOT/f'references/winui/{name}_themeresources.xaml').getroot()
    for theme, key in [('Light', 'Light'), ('Dark', 'Default'), ('HighContrast', 'HighContrast')]:
        d = next(n for n in resources.iter() if tag(n) == 'ResourceDictionary' and n.get(X+'Key') == key)
        ir['aliases'].setdefault(theme, {}).update({n.get(X+'Key'): n.get('ResourceKey') for n in d if tag(n) == 'StaticResource'})
    for n in resources:
        if tag(n) in ['Double', 'Thickness', 'CornerRadius'] and n.get(X+'Key'):
            ir['scalars'][n.get(X+'Key')] = float(n.text)
    style = next(n for n in E.parse(ROOT/f'references/winui/{name}.xaml').getroot() if tag(n) == 'Style')
    ir['styles'][name] = {'defaults': {n.get('Property'): n.get('Value') for n in style if tag(n) == 'Setter' and n.get('Value') is not None}, 'states': []}
    for n in style.iter():
        if tag(n) in ['VisualState', 'VisualTransition']:
            ir['styles'][name]['states'].append({'kind': tag(n), 'attributes': dict(n.attrib), 'animations': [{'kind': tag(a), 'attributes': dict(a.attrib)} for a in n.iter() if 'KeyFrame' in tag(a) or tag(a) in ['ColorAnimation', 'RepositionThemeAnimation']]})
    for key, leaf in ir['aliases']['Light'].items():
        ir['requiredBrushes'][key] = {'colorResource': not leaf.endswith('Brush')}

def cpp(name): return (ROOT/f'references/winui/{name}.cpp').read_text(encoding='utf-8-sig')
for mode in ['Indeterminate', 'Determinate']:
    source = cpp('ProgressRing'+mode)
    ticks = int(re.search(r'c_durationTicks\{ (\d+)L', source)[1])
    ir['ring'+mode] = {'durationMs': ticks/10000}
    assert 'StrokeThickness(1.5F)' in source
    assert '0.166999996F, 0.166999996F' in source # linear cubic spline
ir['ringIndeterminate'].update({'size': 80, 'radius': 35, 'stroke': 7.5, 'rotation': 900, 'switchProgress': .5, 'minimumTrim': .0001})
ir['ringDeterminate'].update({'size': 32, 'radius': 14.15999984, 'stroke': 2.65499997, 'visibleAfter': .00833333377,
    'trimKeys': [[.00833333377, .0001], [.25, .25], [.5, .5], [.75, .75], [.983333349, .96666666], [.991666675, 1.0]]})
assert '7.0F, 7.0F' in cpp('ProgressRingIndeterminate') and '1.76999998F' in cpp('ProgressRingDeterminate')
ir['bar'] = {'durationMs': 2000, 'firstDurationMs': 1500, 'secondDelayMs': 750, 'firstWidth': .4, 'secondWidth': .6,
    'firstStart': -.4, 'firstEnd': 1.2, 'secondStart': -.9, 'secondEnd': .996, 'curve': [.4, 0, .6, 1],
    'colorDurationMs': 167, 'settleResetMs': 167, 'settleMs': 750, 'settleCurve': [0, 0, 0, 1], 'resumeFirstMs': 333, 'resumeTrackMs': 500}
palette = ROOT/'references/progress-palettes.json'
if palette.exists(): ir['primitives'] = json.loads(palette.read_text(encoding='utf-8-sig'))
# The resolved colors are captured from the matching SDK, including color-valued resources.
ir['aliases'] = {}
ir['sources'] = [{'path': p.relative_to(ROOT).as_posix(), 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted((ROOT/'references/winui').glob('Progress*'))]
save('references/progress-template.json', ir)
gallery = Path(json.loads((ROOT/'references/baseline.json').read_text(encoding='utf-8'))['gallery']['path'])
catalog = json.loads((gallery/'catalog/windows-samples.json').read_text(encoding='utf-8-sig'))
controls, sources = {}, []
for c in catalog['controls']:
    if c['name'] not in ['ProgressBar', 'ProgressRing']: continue
    name = c['name']; dest = ROOT/'references/gallery-input'/name; dest.mkdir(exist_ok=True)
    for p in (gallery/'WinUIGallery/Samples'/name).iterdir():
        if p.suffix not in ['.txt', '.cs', '.xaml']: continue
        target = dest/p.name; shutil.copyfile(p, target)
        sources.append({'path': target.relative_to(ROOT).as_posix(), 'source': p.relative_to(gallery).as_posix(), 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()})
    controls[name] = {'description': c['details'], 'samples': [{'title': s['header'], 'file': Path(s['gallery']['source']).name, 'xaml': s['xaml']} for s in c['samples']]}
save('gallery/src/official-progress.json', {'galleryCommit': '7360ac322414e118eadfb0c7c2f4ecc31a218f59', 'controls': controls, 'sources': sources})
print('Extracted ProgressBar/ProgressRing templates, animation parameters and official examples')
