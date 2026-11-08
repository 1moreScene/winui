"""Resolve Motion sample brushes from the already pinned native SDK."""
from pathlib import Path
import hashlib
import json
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from sdk_resource_reader import sdk, brush

root = Path(__file__).resolve().parents[1]
keys = ['SolidBackgroundFillColorBaseBrush', 'FlyoutBackgroundThemeBrush']
result = dict(sdk='Microsoft.WindowsAppSDK.WinUI/2.3.10-experimental', sdkSha256=hashlib.sha256(sdk.read_bytes()).hexdigest(), aliases={}, primitives={theme:{key:brush(source,key) for key in keys} for theme,source in [('Light','Light'),('Dark','Default'),('HighContrast','HighContrast')]})
path=root/'references/motion-resources.json'
text=json.dumps(result,indent=2)+'\n'
if not path.exists() or path.read_text(encoding='utf-8')!=text:path.write_text(text,encoding='utf-8')
print('Resolved Motion brushes from pinned SDK')
