"""Extract runtime recipes from the pinned SDK and the already pinned C++ sources."""
import hashlib,json,re
from pathlib import Path
import sdk_resource_reader as sdk
root=Path(__file__).resolve().parents[1]
styles={}
for node in sdk.root.iter():
    target=node.get('TargetType','').split(':')[-1]
    if sdk.tag(node)=='Style' and (target in ['MenuBar','MenuBarItem','CommandBarFlyoutCommandBar'] or node.get(sdk.X+'Key','').startswith('CommandBarFlyout')):
        styles[node.get(sdk.X+'Key',target)]={s.get('Property'):s.get('Value') for s in node if sdk.tag(s)=='Setter' and s.get('Value') is not None}
keys=[key for key in sdk.table['Default'] if key.startswith('MenuBar') and sdk.tag(sdk.table['Default'][key]) in ['SolidColorBrush','AcrylicBrush','StaticResource']]
keys += ['CommandBarFlyoutBackground','CommandBarFlyoutBorderBrush','CommandBarFlyoutForeground']
keys += ['CardBackgroundFillColorSecondaryBrush','CardStrokeColorDefaultBrush','TextOnAccentFillColorPrimaryBrush']
palettes={theme:{key:sdk.brush(theme,key) for key in keys} for theme in ['Light','Default','HighContrast']}
metrics={key:(node.text or '').strip() for key,node in sdk.table['Shared'].items() if key.startswith(('MenuBar','CommandBarFlyout')) and sdk.tag(node) in ['Double','Thickness','CornerRadius']}
out={'sdk':'microsoft/microsoft-ui-xaml@7b12709347527238494ca28cb9fed326d513e779','sdkSha256':hashlib.sha256(sdk.sdk.read_bytes()).hexdigest(),'styles':styles,'metrics':metrics,'palettes':palettes}
# The current SDK selects opacity storyboards over its legacy translation ones.
template=next(n for n in sdk.root.iter() if sdk.tag(n)=='ControlTemplate' and n.get('TargetType','').split(':')[-1]=='CommandBarFlyoutCommandBar')
storyboards={}
for n in template.iter():
    name=n.get(sdk.X+'Name','')
    if sdk.tag(n)=='Storyboard' and name in ['OpeningOpacityStoryboard','ClosingOpacityStoryboard']:
        storyboards[name]={'fillBehavior':n.get('FillBehavior'),'tracks':[dict(t.attrib) for t in n]}
assert set(storyboards)=={'OpeningOpacityStoryboard','ClosingOpacityStoryboard'}
def duration(key):
    return sum(float(v)*60**i for i,v in enumerate(reversed(sdk.find('Shared',key).text.split(':'))))*1000
helper=root/'references/command-menus/CascadingMenuHelper.cpp'
out['motion']={'opacityMs':duration('ControlFasterAnimationDuration'),'expandMs':duration('ControlNormalAnimationDuration'),'collapseMs':duration('ControlFastAnimationDuration'),'expandCurve':[float(v) for v in sdk.find('Shared','ControlFastOutSlowInKeySpline').text.split(',')],'storyboards':storyboards,'submenuDelayMs':400,'submenuDelaySource':'CascadingMenuHelper uses MenuShowDelay; portable host uses Windows default (400 ms)','helperSha256':hashlib.sha256(helper.read_bytes()).hexdigest()}
native=root/'references/menu-layout-native.json'
if native.exists():
    data=json.loads(native.read_text(encoding='utf8'));sample=next(r for r in data['rows'] if r['theme']=='Light' and r['state']=='Standard-FlyoutPresenter');action=next(p for p in sample['parts'] if p['type']=='AppBarButton');more=next(p for p in sample['parts'] if p['name']=='MoreButton');icon=next(p for p in sample['parts'] if p['name']=='ContentViewbox');label=next(p for p in sample['parts'] if p['name']=='TextLabel')
    out['flyoutGeometry']={'source':'references/menu-layout-native.json','sha256':hashlib.sha256(native.read_bytes()).hexdigest(),'primaryWidth':action['rect'][2],'rowHeight':sample['rect'][1],'moreWidth':more['rect'][2],'primaryInset':action['rect'][0],'primaryVerticalInset':action['rect'][1],'iconY':icon['rect'][1]-action['rect'][1],'labelY':label['rect'][1]-action['rect'][1],'actionHeight':action['rect'][3]}
(root/'references/command-menu-template.json').write_text(json.dumps(out,indent=2,ensure_ascii=False)+'\n',encoding='utf8')
print(f'Extracted {len(styles)} styles, {len(keys)} brushes')
