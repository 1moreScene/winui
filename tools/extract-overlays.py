"""Extract the pinned Popup/ToolTip/Flyout/MenuFlyout/Slider source contract."""
from pathlib import Path
import json, hashlib, re, xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
X = '{http://schemas.microsoft.com/winfx/2006/xaml}'
def tag(n): return n.tag.rsplit('}', 1)[-1]
def save(path, value):
    (ROOT / path).write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')

manifest = json.loads((ROOT/'references/overlay-sources.json').read_text())
contract = {'commit': manifest['commit'], 'sources': [], 'metrics': {}, 'aliases': {}, 'styles': {}}
for file in manifest['files']:
    p = ROOT/file['local']
    contract['sources'].append({**file, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()})
    if p.suffix != '.xaml': continue
    root = ET.parse(p).getroot()
    for dictionary in root.iter():
        if tag(dictionary) != 'ResourceDictionary': continue
        theme = dictionary.get(X+'Key', 'Shared')
        if theme not in ['Shared','Default','Light','HighContrast']: continue
        for n in dictionary:
            key = n.get(X+'Key')
            if not key: continue
            if tag(n) == 'StaticResource':
                contract['aliases'].setdefault(theme,{})[key] = n.get('ResourceKey')
            elif tag(n) in ['Double','Thickness','CornerRadius','Duration']:
                contract['metrics'].setdefault(theme,{})[key] = n.text
            elif tag(n) == 'Style':
                contract['styles'][key] = {s.get('Property'):s.get('Value') for s in n if tag(s)=='Setter' and s.get('Value') is not None}
header = (ROOT/'references/winui/ToolTipService_Partial.h').read_text(encoding='utf-8-sig')
contract['toolTipService'] = {key:int(re.search(r'#define\s+'+key+r'\s+(\d+)',header)[1]) for key in ['BETWEEN_SHOW_DELAY_MS','DEFAULT_SPI_GETMOUSEHOVERTIME','DEFAULT_SHOW_DURATION_SECONDS']}
palette = ROOT/'references/overlay-palettes.json'
contract['palettes'] = json.loads(palette.read_text(encoding='utf-8-sig')) if palette.exists() else {}
contract['palettes']['HighContrast']={}
for key in contract['palettes'].get('Light',{}):
    alias=contract['aliases'].get('HighContrast',{}).get(key,'')
    color='#808080' if 'Disabled' in key or 'Gray' in alias else '#ffff00' if 'Accent' in alias or 'Highlight' in alias else '#000000' if 'Background' in key or 'Fill' in key and 'Value' not in key else '#ffffff'
    contract['palettes']['HighContrast'][key]={'kind':'solid','color':color,'opacity':1}
native=ROOT/'references/overlay-metrics.json'
contract['nativeMetrics']=json.loads(native.read_text(encoding='utf-8-sig'))['surfaces'] if native.exists() else []
motion=json.loads((ROOT/'references/overlay-native-motion.json').read_text(encoding='utf-8'))
menu_header=(ROOT/'references/winui/MenuPopupThemeTransition_Partial.h').read_text(encoding='utf-8-sig')
flyout=(ROOT/'references/winui/FlyoutBase_partial.cpp').read_text(encoding='utf-8-sig')
tip_header=(ROOT/'references/winui/ToolTip_Partial.h').read_text(encoding='utf-8-sig')
contract['toolTipPlacement']={name:float(value) for name,value in re.findall(r'#define (DEFAULT_(?:KEYBOARD|MOUSE|TOUCH)_OFFSET)\s+(\d+)',tip_header)}
contract['presentation']={'nativeTiming':motion,'entranceOffset':float(re.search(r'g_entranceThemeOffset = ([0-9.]+)',flyout)[1]),'menuOpenMs':int(re.search(r's_OpenDuration = (\d+)',menu_header)[1]),'menuCloseMs':int(re.search(r's_OpacityChangeDuration = (\d+)',menu_header)[1]),'menuCurve':[0,0,0,1],'menuClosedRatio':float(re.search(r'PreparePopupThemeTransitionsAndShadows\(pPopup, ([0-9.]+)',(ROOT/'references/winui/MenuFlyout_Partial.cpp').read_text(encoding='utf-8-sig'))[1]),'shadow':{'flyoutTranslationZ':32,'toolTipTranslationZ':16},'menuSystemBackdrop':'AcrylicBackgroundFillColorDefaultBackdrop','browserSystemBackdropRecipe':'FlyoutPresenterBackground'}
menu_root=ET.parse(ROOT/'references/winui/MenuFlyout_themeresources.xaml').getroot()
glyph=next(n for n in menu_root.iter() if n.get(X+'Name')=='CheckGlyph')
def thickness(key,theme='Shared'):
    values=[float(v) for v in contract['metrics'][theme][key].split(',')]
    return values*4 if len(values)==1 else values
contract['menuLayout']={'itemMargin':thickness('MenuFlyoutItemMargin'),'padding':thickness('MenuFlyoutItemThemePadding'),'narrowPadding':thickness('MenuFlyoutItemThemePaddingNarrow'),'placeholder':thickness('MenuFlyoutItemPlaceholderThemeThickness','Light')[0],'separatorPadding':thickness('MenuFlyoutSeparatorThemePadding'),'separatorHeight':float(contract['metrics']['Shared']['MenuFlyoutSeparatorHeight']),'checkGlyph':glyph.get('Glyph'),'checkSize':float(glyph.get('FontSize'))}
shadow_source=(ROOT/'references/winui/ThemeShadow.cpp').read_text(encoding='utf-8-sig')
contract['presentation']['windowInsets']={}
# CommandBarFlyout uses the same 32-DIP ThemeShadow depth as Flyout. Its
# popup island must include that shadow, including in primary-only mode.
for kind,depth in [('Flyout','Medium'),('CommandBarFlyout','Medium'),('MenuFlyout','Medium'),('ToolTip','Small')]:
    section=re.search(r'case DropShadowDepthClass::'+depth+r':(.*?)break;',shadow_source,re.S)[1]
    contract['presentation']['windowInsets'][kind]=[float(re.search(r'insets\.'+side+r' = ([0-9.]+)',section)[1]) for side in ['left','top','right','bottom']]
contract['presentation']['menuBorderScaleEnabled']=any(n.get(X+'Name')=='MenuFlyoutPresenterBorder' for n in menu_root.iter())
save('references/overlay-template.json',contract)

baseline=json.loads((ROOT/'references/baseline.json').read_text())
gallery=Path(baseline['gallery']['path'])
catalog=json.loads((gallery/'catalog/windows-samples.json').read_text(encoding='utf-8-sig'))
controls={}
for name in ['Popup','ToolTip','Flyout','MenuFlyout','Slider']:
    folder=gallery/'WinUIGallery/Samples'/name
    page=folder/(name+'Page.xaml')
    if not page.exists(): continue
    control=next(c for c in catalog['controls'] if c['name']==name)
    samples=[{'title':s['header'],'xaml':s['xaml']} for s in control['samples']]
    controls[name]={'page':page.relative_to(gallery).as_posix(),'sha256':hashlib.sha256(page.read_bytes()).hexdigest(),'description':control['details'],'samples':samples}
save('gallery/src/official-overlays.json',{'galleryCommit':baseline['gallery']['commit'],'controls':controls})
print('extracted',len(contract['sources']),'sources;',len(controls),'Gallery pages')
