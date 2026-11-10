"""Compile the pinned NavigationView visual template into its Rust part contract."""
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
X = '{http://schemas.microsoft.com/winfx/2006/xaml}'
source = ROOT / 'references/winui/NavigationView.xaml'
resources = ROOT / 'references/winui/NavigationView_themeresources.xaml'
native = ET.parse(source).getroot()
style = next(e for e in native if e.attrib.get('TargetType') == 'controls:NavigationView')
template = next(e for e in style.iter() if e.tag.endswith('ControlTemplate'))
visuals = {'Grid', 'Border', 'StackPanel', 'SplitView', 'Button', 'ContentControl',
           'ContentPresenter', 'ItemsRepeater', 'ItemsRepeaterScrollHost', 'Flyout',
           'NavigationViewItemSeparator', 'TextBlock', 'FontIcon', 'SymbolIcon', 'AnimatedIcon', 'ScrollViewer', 'Viewbox', 'Rectangle', 'ToolTip'}
content_properties = {'SplitView.Pane', 'SplitView.Content', 'Button.Flyout', 'ToolTipService.ToolTip'}
parts = []

def visit(element, parent=None, slot=None):
    kind = element.tag.rsplit('}', 1)[-1]
    if kind not in visuals:
        raise ValueError(f'Unimplemented NavigationView visual: {kind}')
    name = element.attrib.get(X + 'Name', f'{kind}_{len(parts)}')
    # The unnamed overflow flyout is a stable source part, not a second menu.
    if kind == 'Flyout':
        name = 'TopNavOverflowFlyout'
    part = {'name': name, 'kind': kind, 'parent': parent, 'slot': slot,
            'attributes': {k.rsplit('}', 1)[-1]: v for k, v in element.attrib.items()}}
    parts.append(part)
    for child in element:
        tag = child.tag.rsplit('}', 1)[-1]
        if tag in visuals:
            visit(child, name)
        elif tag in content_properties:
            for content in child:
                visit(content, name, tag.rsplit('.', 1)[-1])
        elif '.' in tag or tag in {'VisualStateManager.VisualStateGroups'}:
            # Bindings/states/resources are executed by the source-traced Rust
            # NavigationView state machine; never instantiate style definitions.
            continue
        elif tag.startswith('Animated') and tag.endswith('VisualSource'):
            part['animatedVisualSource'] = tag
        else:
            raise ValueError(f'Unimplemented template child: {tag}')

visit(next(e for e in template if e.tag.rsplit('}', 1)[-1] == 'Grid'))
navigation_parts=parts
item_templates={}
theme_root=ET.parse(resources).getroot()
for key,attribute,value in [
    ('Left','Key','MUX_NavigationViewItemPresenterStyleWhenOnLeftPane'),
    ('Top','Key','MUX_NavigationViewItemPresenterStyleWhenOnTopPane'),
    ('Overflow','Key','MUX_NavigationViewItemPresenterStyleWhenOnTopPaneOverflow'),
]:
    item_style=next(e for e in theme_root if e.attrib.get(X+attribute)==value)
    item_template=next(e for e in item_style.iter() if e.tag.endswith('ControlTemplate'))
    parts=[]
    visit(next(e for e in item_template if e.tag.rsplit('}',1)[-1] in visuals))
    item_templates[key]=parts
for key in ['Header','Separator']:
    aux_style=next(e for e in native if e.attrib.get('TargetType')=='controls:NavigationViewItem'+key)
    aux_template=next(e for e in aux_style.iter() if e.tag.endswith('ControlTemplate'))
    parts=[]
    visit(next(e for e in aux_template if e.tag.rsplit('}',1)[-1] in visuals))
    item_templates[key]=parts
parts=navigation_parts
metrics = {}
for e in ET.parse(resources).getroot().iter():
    key = e.attrib.get(X + 'Key')
    if key and e.text and e.text.strip() and e.tag.rsplit('}', 1)[-1] in {'Double', 'Thickness', 'CornerRadius'}:
        metrics[key] = e.text.strip()
record = {'sourceCommit': json.loads((ROOT / 'references/baseline.json').read_text())['winui']['commit'],
          'sources': [{'path': str(p.relative_to(ROOT)).replace('\\', '/'),
                       'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in [source, resources]],
          'executor': 'src/scene/navigation_view.rs', 'parts': parts, 'itemTemplates':item_templates,'metrics': metrics,
          'stateExecutor': 'src/navigation.rs; visual states, selection, hierarchy, pane and indicator timelines',
          'scope': 'Specialized compiled NavigationView template, not a general XAML parser.'}
(ROOT / 'references/navigation-composition-template.json').write_text(json.dumps(record, indent=2) + '\n', encoding='utf-8')
print(f'Compiled {len(parts)} NavigationView visual parts and {len(metrics)} native metrics')
