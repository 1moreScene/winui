"""Extract fixed SDK picker templates, brushes and pinned Gallery samples."""
from pathlib import Path
import hashlib, json, re, subprocess, xml.etree.ElementTree as E
from sdk_resource_reader import sdk, root, table, tag, brush
ROOT = Path(__file__).resolve().parent.parent
KINDS = ['CalendarView', 'CalendarDatePicker', 'DatePicker', 'TimePicker', 'ColorPicker']
PREFIXES = tuple(KINDS + ['CalendarViewDayItem', 'DateTimePicker', 'DateTimeFlyout', 'LoopingSelector', 'ColorSpectrum'])
EXTRA_METRICS = {'SliderPreContentMargin','SliderPostContentMargin','SliderTrackThemeHeight','SliderHorizontalThumbHeight','SliderHorizontalThumbWidth'}
X = '{http://schemas.microsoft.com/winfx/2006/xaml}'
ir = {'sdk': 'Microsoft.WindowsAppSDK.WinUI/2.3.10-experimental', 'templateSha256': hashlib.sha256(sdk.read_bytes()).hexdigest(), 'controls': KINDS, 'styles': {}, 'metrics': {}, 'parts': {}, 'states': {}, 'xml': {}, 'brushKeys': [], 'palettes': {}, 'aliases': {}, 'unresolved': []}
selected = E.Element(root.tag)
keys = {'SystemListLowColor','SystemBaseHighColor','SystemBaseMediumColor','SystemBaseMediumLowColor'}


def visit(parent, theme='Shared'):
    for node in parent:
        key = node.get(X + 'Key', '')
        kind = tag(node)
        current = key if kind == 'ResourceDictionary' and key in ['Light', 'Default', 'HighContrast'] else theme
        if (key.startswith(PREFIXES) or key in EXTRA_METRICS) and kind in ['Double', 'Thickness', 'CornerRadius', 'Duration', 'String', 'GridLength', 'Int32', 'FontWeight']:
            ir['metrics'].setdefault(current, {})[key] = {'type': kind, 'value': node.text or ''}
            selected.append(E.fromstring(E.tostring(node)))
        target = node.get('TargetType', '').split(':')[-1]
        if kind == 'Style' and (target.startswith(PREFIXES) or key.startswith(PREFIXES)):
            name = key or target
            ir['styles'][name] = {s.get('Property'): s.get('Value') for s in node if tag(s) == 'Setter' and s.get('Value') is not None}
            ir['parts'][name] = [{'type': tag(p), **p.attrib} for p in node.iter() if p.get(X + 'Name')]
            ir['states'][name] = [{'name': v.get(X + 'Name'), 'xml': E.tostring(v, encoding='unicode')} for v in node.iter() if tag(v) == 'VisualState']
            ir['xml'][name] = E.tostring(node, encoding='unicode')
            selected.append(E.fromstring(E.tostring(node)))
        if kind != 'Style':
            visit(node, current)


visit(root)
for entries in table.values():
    for key, node in entries.items():
        if key.startswith(PREFIXES) and tag(node) in ['StaticResource', 'Color', 'SolidColorBrush', 'LinearGradientBrush', 'AcrylicBrush'] and any(k in key for k in ['Brush', 'Background', 'Foreground', 'Fill', 'Stroke']):
            keys.add(key)
for theme in ['Light', 'Default', 'HighContrast']:
    name = 'Dark' if theme == 'Default' else theme
    ir['palettes'][name] = {}
    ir['aliases'][name] = {}
    for key in sorted(keys):
        try:
            ir['palettes'][name][key] = brush(theme, key)
        except (KeyError, ValueError, TypeError) as error:
            ir['unresolved'].append({'theme': name, 'key': key, 'reason': str(error)})
# Native view transitions are part of the same fixed SDK template contract.
style=E.fromstring(ir['xml']['DefaultCalendarViewStyle'])
transitions=[]
for node in style.iter():
    if tag(node)!='VisualTransition': continue
    tracks=[]
    for animation in node.iter():
        if tag(animation) not in ['DoubleAnimationUsingKeyFrames','DoubleAnimation']:continue
        tracks.append({'target':animation.get('Storyboard.TargetName'),'property':animation.get('Storyboard.TargetProperty'),'frames':[{'kind':tag(f),**dict(f.attrib)} for f in animation]})
    transitions.append({'from':node.get('From'),'to':node.get('To'),'tracks':tracks})
spline=table['Shared']['ControlFastOutSlowInKeySpline'].text
ir['calendarMotion']={'curve':[float(v) for v in spline.split(',')],'headerFadeMs':float(next(n for n in style.iter() if tag(n)=='DoubleAnimation' and n.get('Storyboard.TargetName')=='HeaderButton').get('Duration').split(':')[-1])*1000,'transitions':transitions}
ir['brushKeys'] = sorted(keys)
native = ROOT / 'references/picker-controls-palettes.json'
if native.exists():
    for theme, values in json.loads(native.read_text(encoding='utf-8-sig')).items():
        ir['palettes'].setdefault(theme, {}).update({k: v for k, v in values.items() if isinstance(v, dict) and 'kind' in v})
(ROOT / 'references/picker-controls-template.json').write_text(json.dumps(ir, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
E.ElementTree(selected).write(ROOT / 'references/sdk/picker-controls.xaml', encoding='utf-8', xml_declaration=True)
gallery = Path(json.loads((ROOT / 'references/baseline.json').read_text(encoding='utf-8-sig'))['gallery']['path'])
commit = '7360ac322414e118eadfb0c7c2f4ecc31a218f59'
catalog = json.loads((gallery / 'catalog/windows-samples.json').read_text(encoding='utf-8-sig'))
controls, sources = {}, []
def fixed_gallery_file(rel, dest):
    data = subprocess.check_output(['git', '-C', str(gallery), 'show', commit + ':' + rel])
    dest.write_bytes(data)
    sources.append({'upstream': rel, 'local': dest.relative_to(ROOT).as_posix(), 'sha256': hashlib.sha256(data).hexdigest()})
    return data.decode('utf-8-sig')
for control in catalog['controls']:
    if control['name'] not in KINDS:
        continue
    name = control['name']
    dest = ROOT / 'references/gallery-input' / name
    dest.mkdir(exist_ok=True)
    for path in (gallery / 'WinUIGallery/Samples' / name).iterdir():
        if path.suffix not in ['.xaml', '.cs', '.txt']:
            continue
        rel = path.relative_to(gallery).as_posix()
        fixed_gallery_file(rel, dest / path.name)
    page = E.parse(dest / (name + 'Page.xaml')).getroot()
    samples = []
    for example in page.iter():
        definition = example.get('SampleDefinition')
        if not definition:
            continue
        text = (dest / definition.replace('\\', '/').split('/')[-1]).read_text(encoding='utf-8-sig')
        sections = {key: body.strip() for key, body in re.findall(r'^--- (\w+)\s*\n(.*?)(?=^--- |\Z)', text, re.M | re.S)}
        options = []
        for node in example.iter():
            if tag(node) in ['CheckBox', 'ComboBox', 'RadioButtons']:
                options.append({'kind': tag(node), 'name': node.get(X+'Name'), 'label': node.get('Content', node.get('Header', '')), 'checked': node.get('IsChecked', 'False')=='True', 'items': [child.text for child in node if tag(child)=='String']})
        samples.append({'title': sections['header'], 'xaml': sections.get('xaml', ''), 'code': sections.get('code', ''), 'options': options})
    controls[name] = {'description': control['details'], 'samples': samples}
assert set(controls) == set(KINDS)
language_source = fixed_gallery_file('WinUIGallery/Helpers/Language/LanguageList.cs', ROOT/'references/gallery-input/CalendarView/LanguageList.cs')
languages = [{'name': name, 'code': code} for name, code in re.findall(r'new Language\("([^"]+)", "([^"]+)"\)', language_source)]
calendar_code = (ROOT/'references/gallery-input/CalendarView/CalendarViewPage.xaml.cs').read_text(encoding='utf-8-sig')
calendars = list(dict.fromkeys(re.findall(r'CalendarIdentifiers\.(\w+)', calendar_code)))
(ROOT / 'gallery/src/official-picker-controls.json').write_text(json.dumps({'commit': commit, 'controls': controls, 'languages': languages, 'calendarIdentifiers': [name+'Calendar' for name in calendars], 'sources': sources}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Extracted {len(ir["styles"])} picker styles, {len(keys)} brushes and {len(sources)} Gallery sources')
