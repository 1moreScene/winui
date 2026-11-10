"""Resolve Motion sample brushes from the already pinned native SDK."""
from pathlib import Path
import hashlib
import json
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from sdk_resource_reader import sdk, brush

root = Path(__file__).resolve().parents[1]
keys = ['SolidBackgroundFillColorBaseBrush', 'FlyoutBackgroundThemeBrush', 'SystemControlForegroundChromeGrayBrush',
        'SmokeFillColorDefaultBrush', 'CardBackgroundFillColorDefaultBrush', 'AcrylicBackgroundFillColorBaseBrush']
result = dict(sdk='microsoft/microsoft-ui-xaml@7b12709347527238494ca28cb9fed326d513e779', sdkSha256=hashlib.sha256(sdk.read_bytes()).hexdigest(), aliases={}, primitives={theme:{key:brush(source,key) for key in keys} for theme,source in [('Light','Light'),('Dark','Default'),('HighContrast','HighContrast')]})
system_colors=json.loads((root/'references/motion-system-colors.json').read_text(encoding='utf-8-sig'))
for theme in ['Light','Dark','HighContrast']:
    result['primitives'][theme]['SystemAccentColor']={'kind':'solid','color':system_colors['accent'],'opacity':1.0}
result['systemColorSource']='motion-system-colors.json; frozen UISettings accent, independent of application light/dark theme'
path=root/'references/motion-resources.json'
text=json.dumps(result,indent=2)+'\n'
if not path.exists() or path.read_text(encoding='utf-8')!=text:path.write_text(text,encoding='utf-8',newline='\n')
print('Resolved Motion brushes from pinned SDK')
