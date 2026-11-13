"""Extract the Segmented resource aliases and metrics used by the Rust scene."""
from pathlib import Path
import json
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'third_party/CommunityToolkit.Segmented/src'
X = '{http://schemas.microsoft.com/winfx/2006/xaml}'

def keyed(root, key):
    return next(element for element in root.iter() if element.get(X + 'Key') == key)

def milliseconds(value):
    hours, minutes, seconds = map(float, value.split(':'))
    return round(((hours * 60 + minutes) * 60 + seconds) * 1000)

def floats(value):
    return [float(part) for part in value.split(',')]

def thickness(value):
    values = floats(value)
    return values * (4 // len(values))

segmented = ET.parse(SOURCE / 'Segmented/Segmented.xaml').getroot()
item = ET.parse(SOURCE / 'SegmentedItem/SegmentedItem.xaml').getroot()
result = {'source': 'references/segmented-source.json', 'palettes': {}}
profile = json.loads((ROOT / 'references/browser-theme-profile.json').read_text(encoding='utf8'))
result['systemColors'] = profile['system']
for root in [segmented, item]:
    for dictionary in root.iter():
        if dictionary.tag.endswith('ResourceDictionary') and X + 'Key' in dictionary.attrib:
            palette = result['palettes'].setdefault(dictionary.attrib[X + 'Key'], {})
            for e in dictionary:
                if e.tag.endswith('StaticResource'):
                    palette[e.attrib[X + 'Key']] = e.attrib['ResourceKey']
pill = next(e for e in item.iter() if e.get(X + 'Name') == 'PART_Pill')
press = next(e for e in item.iter() if e.get('Value') == '0.96' and e.get('KeySpline'))
disabled = next(e for e in item.iter() if e.get('To') == '{ThemeResource SegmentedItemDisabledOpacity}')
result['layouts'] = {}
for style in ['Default', 'Pivot', 'Button']:
    template = keyed(item, style + 'SegmentedItemStyle')
    parts = {e.get(X + 'Name'): e for e in template.iter() if e.get(X + 'Name')}
    holder, icon, content = (parts[name] for name in ['ContentHolder', 'PART_IconBox', 'PART_ContentPresenter'])
    margin = holder.get('Margin')
    if margin == '{TemplateBinding Padding}':
        margin = keyed(item, 'ButtonItemPadding').text
    result['layouts'][style] = {
        'holderMargin': thickness(margin),
        'iconMargin': thickness(icon.get('Margin', '0')),
        'contentMargin': thickness(content.get('Margin', '0')),
        'iconWidth': float(icon.get('Width')),
        'spacing': float(holder.get('Spacing') or holder.get('ColumnSpacing')),
        'border': float(keyed(item, 'SegmentedItemBorderThickness').text) if 'BorderThickness' in parts['PART_Root'].attrib else 0.,
    }
    if 'IconTop' in parts:
        setters = {s.get('Target'): s.get('Value') for s in parts['IconTop'].iter() if s.get('Target')}
        result['layouts']['IconTop'] = {
            'holderMargin': thickness(setters['ContentHolder.Margin']),
            'iconMargin': thickness(setters['PART_IconBox.Margin']),
            'contentMargin': thickness(setters['PART_ContentPresenter.Margin']),
            'iconWidth': float(setters['PART_IconBox.Width']),
            'spacing': float(setters['ContentHolder.Spacing']),
            'maxWidth': float(setters['PART_ContentPresenter.MaxWidth']),
            'hoverMargin': thickness(setters['PART_Hover.Margin']),
            'border': result['layouts'][style]['border'],
        }
result['metrics'] = {
    'spacing': float(keyed(segmented, 'SegmentedItemSpacing').text),
    'buttonSpacing': float(keyed(segmented, 'ButtonItemSpacing').text),
    'scaleMs': milliseconds(keyed(item, 'SegmentedItemScaleAnimationDuration').text),
    'disabledMs': milliseconds(disabled.get('Duration')),
    'disabledOpacity': float(keyed(item, 'SegmentedItemDisabledOpacity').text),
    'brushMs': milliseconds(keyed(item, 'SegmentedItemBackgroundBrushTransition').get('Duration')),
    'pressScale': float(press.get('Value')),
    'pillWidth': float(pill.get('Width')),
    'pillHeight': float(pill.get('Height')),
    'pillRadius': [float(pill.get('RadiusX')), float(pill.get('RadiusY'))],
    'border': float(keyed(segmented, 'SegmentedBorderThickness').text),
    'pillScale': 4, 'pressedPillScale': 2, 'curve': floats(press.get('KeySpline')),
    'hoverMargins': [floats(keyed(item, key).text) for key in ['LeftItemHoverMargin', 'MiddleItemHoverMargin', 'RightItemHoverMargin']],
}
(ROOT / 'references/segmented-template.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf8')
