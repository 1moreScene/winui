"""Extract the audited stage-6 subset from pinned XAML; fail on unknown states."""
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as E
ROOT = Path(__file__).resolve().parent.parent
X = '{http://schemas.microsoft.com/winfx/2006/xaml}'
def tag(n): return n.tag.rsplit('}', 1)[-1]
def save(path, value):
    text = json.dumps(value, ensure_ascii=False, indent=2) + '\n'
    p = ROOT / path
    if not p.exists() or p.read_text(encoding='utf-8') != text: p.write_text(text, encoding='utf-8')
result = {'sourceCommit': '7b12709347527238494ca28cb9fed326d513e779', 'aliases': {}, 'styles': {}}
for name in ['ToggleButton', 'CheckBox']:
    xml = E.parse(ROOT / f'references/winui/{name}_themeresources.xaml').getroot()
    for theme, source in [('Light', 'Light'), ('Dark', 'Default'), ('HighContrast', 'HighContrast')]:
        dictionary = next(n for n in xml.iter() if tag(n) == 'ResourceDictionary' and n.get(X+'Key') == source)
        aliases = {n.get(X+'Key'): n.get('ResourceKey') for n in dictionary if tag(n) == 'StaticResource'}
        result['aliases'].setdefault(theme, {}).update(aliases)
    style = next(n for n in xml.iter() if tag(n) == 'Style' and n.get(X+'Key') == 'Default'+name+'Style')
    defaults = {n.get('Property'): n.get('Value') for n in style if n.get('Value') is not None}
    parts = {n.get(X+'Name'): n for n in style.iter() if n.get(X+'Name') and tag(n) not in ['VisualState', 'VisualStateGroup']}
    base = {}
    for part, n in parts.items():
        for key, value in n.attrib.items():
            if value.startswith('{ThemeResource '): base[f'{part}.{key}'] = value[15:-1]
            elif value.startswith('{TemplateBinding ') and value[17:-1] in defaults:
                v = defaults[value[17:-1]]
                if v.startswith('{ThemeResource '): base[f'{part}.{key}'] = v[15:-1]
    states = {}
    for state in (n for n in style.iter() if tag(n) == 'VisualState'):
        values = dict(base)
        for animation in state.iter():
            if tag(animation) == 'ObjectAnimationUsingKeyFrames':
                frames = list(animation)
                assert len(frames) == 1 and tag(frames[0]) == 'DiscreteObjectKeyFrame'
                value = frames[0].get('Value')
                if value.startswith('{ThemeResource '):
                    values[animation.get('Storyboard.TargetName')+'.'+animation.get('Storyboard.TargetProperty')] = value[15:-1]
                else:
                    assert value in ['{StaticResource CheckBoxIndeterminateGlyph}'], value
        states[state.get(X+'Name')] = values
    assert len(states) == 12, (name, states.keys())
    result['styles'][name] = {'states': states, 'animatedIcon': name == 'CheckBox', 'backgroundTransitionMs': 83 if name == 'ToggleButton' else 0}
    if name == 'CheckBox':
        keys = ['CheckBoxSize', 'CheckBoxGlyphSize', 'CheckBoxHeight', 'CheckBoxMinWidth', 'CheckBoxBorderThickness']
        result['checkbox'] = {key: float(next(n for n in xml.iter() if n.get(X+'Key') == key).text) for key in keys}
        result['checkbox']['padding'] = list(map(float, next(n for n in xml.iter() if n.get(X+'Key') == 'CheckBoxPadding').text.split(',')))
        result['checkbox']['checkedGlyph'] = next(n for n in xml.iter() if n.get(X+'Key') == 'CheckBoxCheckedGlyph').text
        result['checkbox']['mixedGlyph'] = next(n for n in xml.iter() if n.get(X+'Key') == 'CheckBoxIndeterminateGlyph').text
palette = ROOT / 'references/foundation-palettes.json'
if palette.exists():
    result['primitives'] = json.loads(palette.read_text(encoding='utf-8-sig'))
    for theme, aliases in result['aliases'].items():
        for leaf in aliases.values():
            assert leaf in result['primitives'][theme], f'Missing native brush {theme}/{leaf}'
save('references/selection-template.json', result)
samples = {}
files = []
for directory in sorted((ROOT/'references/gallery-foundation').iterdir()):
    if not directory.is_dir(): continue
    examples = []
    for p in sorted(directory.glob('*.txt')):
        title, code = p.read_text(encoding='utf-8-sig').split('--- xaml', 1)
        examples.append({'file': p.name, 'title': title.removeprefix('--- header').strip(), 'xaml': code.strip()})
    samples[directory.name] = examples
    for p in sorted(directory.iterdir()):
        if p.is_file(): files.append({'path': p.relative_to(ROOT).as_posix(), 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()})
baseline = json.loads((ROOT/'references/baseline.json').read_text(encoding='utf-8-sig'))
catalog = json.loads((Path(baseline['gallery']['path'])/'catalog/windows-samples.json').read_text(encoding='utf-8-sig'))
descriptions = {c['name']: c['details'] for c in catalog['controls'] if c['name'] in samples}
for p in sorted((ROOT/'references/gallery-shared').glob('*')):
    if p.is_file(): files.append({'path': p.relative_to(ROOT).as_posix(), 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()})
save('gallery/src/official-foundation.json', {'galleryCommit': '7360ac322414e118eadfb0c7c2f4ecc31a218f59', 'descriptions': descriptions, 'samples': samples, 'sources': files})
print(f'Extracted 24 selection visual states and {len(files)} pinned Gallery files.')

native_path=ROOT/'out/foundation-native/foundation-metrics.json'
if native_path.exists():
    native=json.loads(native_path.read_text(encoding='utf-8-sig'))
    save('references/validation/native-selection-behavior.json',{'sdk':native['sdk'],'sequence':native['sequence']})
