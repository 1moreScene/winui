"""Generate runtime palettes using resource names only, never native palette values."""
from pathlib import Path
import hashlib
import json
from sdk_resource_reader import brush, X, tag
import xml.etree.ElementTree as E

ROOT = Path(__file__).resolve().parents[1]

def main():
    schema = json.loads((ROOT/'references/mit-palette-requirements.json').read_text())
    outputs=[]
    errors=[]
    for filename,themes in schema['files'].items():
        result={}
        for theme,keys in themes.items():
            result[theme]={}
            for key in keys:
                try:
                    result[theme][key]=brush('Default' if theme=='Dark' else theme,key)
                except Exception as error:
                    errors.append(f'{filename}/{theme}/{key}: {error}')
        if not errors:
            data=(json.dumps(result,indent=2)+'\n').encode('utf8')
            target=ROOT/'references'/filename
            if target.read_bytes()!=data:target.write_bytes(data)
            outputs.append({'path':target.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(data).hexdigest()})
    if errors:
        raise RuntimeError('Unresolved MIT palette resources:\n'+'\n'.join(errors))
    # Navigation's original bootstrap dictionary predates the other extractors.
    # Generate it here too, instead of retaining a captured native brush table.
    source = E.parse(ROOT/'references/mit-xaml/controls/dev/NavigationView/NavigationView_themeresources.xaml').getroot()
    aliases = {}
    for theme, native in [('Light','Light'),('Dark','Default'),('HighContrast','HighContrast')]:
        dictionary = next(n for n in source.iter() if tag(n)=='ResourceDictionary' and n.get(X+'Key')==native)
        aliases[theme] = {n.get(X+'Key'):n.get('ResourceKey') for n in dictionary if tag(n)=='StaticResource'}
    # Retain the project's existing navigation high-contrast role policy.
    for key in aliases['HighContrast']:
        aliases['HighContrast'][key] = ('AccentFillColorDefaultBrush' if any(s in key for s in ['Indicator','Selected','PointerOver']) else 'LayerFillColorDefaultBrush' if 'Background' in key else 'TextFillColorPrimaryBrush')
    for key in ['NavigationViewContentBackground','NavigationViewSelectionIndicatorForeground','NavigationViewItemForeground','NavigationViewItemForegroundDisabled','NavigationViewItemBackgroundSelected','NavigationViewItemBackgroundPointerOver','NavigationViewItemBackgroundPressed','NavigationViewItemSeparatorForeground','NavigationViewContentGridBorderBrush']:
        aliases['HighContrast'].setdefault(key,aliases['Light'][key])
    primitives = {theme:{key:brush('Default' if theme=='Dark' else theme,key) for key in keys} for theme,keys in schema['navigationPrimitives'].items()}
    result = {'sourceCommit':'7b12709347527238494ca28cb9fed326d513e779','source':'Verified MIT NavigationView aliases and generated MIT brushes; project browser high-contrast roles','aliases':aliases,'primitives':primitives}
    data=(json.dumps(result,indent=2)+'\n').encode('utf8')
    target=ROOT/'references/navigation-resources.json'
    if target.read_bytes()!=data:target.write_bytes(data)
    outputs.append({'path':target.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(data).hexdigest()})
    record={'license':'MIT','source':'references/mit-xaml-generation.json','platformColors':'references/browser-theme-profile.json','schema':'references/mit-palette-requirements.json','outputs':outputs,'nativePaletteValuesRead':False}
    (ROOT/'references/mit-palette-generation.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf8', newline='\n')
    print(f'Generated {len(outputs)} palette files entirely from MIT resources and the numeric platform profile.')

if __name__=='__main__':main()
