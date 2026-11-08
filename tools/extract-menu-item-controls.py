"""Extract the RadioMenuFlyoutItem glyph from the pinned default template."""
from pathlib import Path
import json, hashlib, xml.etree.ElementTree as ET
root=Path(__file__).resolve().parent.parent
manifest=json.loads((root/'references/menu-item-controls-sources.json').read_text())
entry=next(f for f in manifest['files'] if f['upstream'].endswith('/RadioMenuFlyoutItem_themeresources.xaml'))
data=(root/entry['local']).read_bytes()
assert hashlib.sha256(data).hexdigest()==entry['sha256']
x='{http://schemas.microsoft.com/winfx/2006/xaml}'
glyph=next(e for e in ET.fromstring(data).iter() if e.tag.endswith('FontIcon') and e.get(x+'Name')=='CheckGlyph')
value=dict(commit=manifest['commit'],source=entry['upstream'],sha256=entry['sha256'],radioGlyph=glyph.get('Glyph'),radioSize=float(glyph.get('FontSize')))
# Keep state resources and geometry from the default templates, not Reveal styles.
menu_path=root/'references/winui/MenuFlyout_themeresources.xaml'
menu_root=ET.fromstring(menu_path.read_bytes())
styles={e.get(x+'Key'):e for e in menu_root.iter() if e.tag.endswith('Style')}
import re
def resource(v):
    m=re.fullmatch(r'\{(?:ThemeResource|StaticResource) ([^}]+)\}',v or '')
    return m.group(1) if m else None
value['presenterSource']=dict(path=str(menu_path.relative_to(root)),sha256=hashlib.sha256(menu_path.read_bytes()).hexdigest())
value['parts']={}
for name,key,tree in [('command','DefaultMenuFlyoutItemStyle',menu_root),('toggle','DefaultToggleMenuFlyoutItemStyle',menu_root),('submenu','DefaultMenuFlyoutSubItemStyle',menu_root),('radio','DefaultRadioMenuFlyoutItemStyle',ET.fromstring(data))]:
    style=next(e for e in tree.iter() if e.tag.endswith('Style') and e.get(x+'Key')==key)
    parts={}
    foreground=next(resource(e.get('Value')) for e in style if e.get('Property')=='Foreground')
    for e in style.iter():
        part=e.get(x+'Name')
        if part in ['TextBlock','CheckGlyph','SubItemChevron','IconContent','KeyboardAcceleratorTextBlock','LayoutRoot']:
            parts[part]={'Normal':resource(e.get('Background' if part=='LayoutRoot' else 'Foreground')) or ('MenuFlyoutItemBackground' if part=='LayoutRoot' else foreground)}
            if e.get('Glyph'):parts[part]['glyph']=e.get('Glyph')
            if e.get('FontSize'):parts[part]['size']=float(e.get('FontSize'))
            if e.get('Margin'):parts[part]['margin']=e.get('Margin')
    for group in style.iter():
        if not group.tag.endswith('VisualStateGroup') or group.get(x+'Name')!='CommonStates':continue
        for state in group:
            for setter in state.iter():
                target=setter.get('Target','').split('.')
                if len(target)==2 and target[0] in parts and target[1] in ['Foreground','Background']:
                    key=resource(setter.get('Value'))
                    if key:parts[target[0]][state.get(x+'Name')]=key
    value['parts'][name]=parts
text_path=root/'references/winui/TextBlock_themeresources.xaml'
text_root=ET.fromstring(text_path.read_bytes())
value['shortcutSize']=float(next(e.text for e in text_root if e.get(x+'Key')=='CaptionTextBlockFontSize'))
value['captionSource']=dict(path=str(text_path.relative_to(root)),sha256=hashlib.sha256(text_path.read_bytes()).hexdigest())
value['shortcutGap']=24.0
chevron_margin=next(e.text for e in menu_root.iter() if e.get(x+'Key')=='MenuFlyoutItemChevronMargin')
value['chevronGap']=float(chevron_margin.split(',')[0])
(root/'references/menu-item-template.json').write_text(json.dumps(value,indent=2)+'\n',encoding='utf8')
print('Extracted pinned RadioMenuFlyoutItem glyph and size')
