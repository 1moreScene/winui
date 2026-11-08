"""Record only a completed, matching fixed-SDK native capture."""
from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[1]
folder=ROOT/'out/view-command-native'
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
data=json.loads((folder/'complete.json').read_text(encoding='utf-8'))
assert len(data['cases'])==42
assert all((folder/(c['id']+'.png')).exists() for c in data['cases'])
data['source']='out/view-command-native/complete.json'
data['nativeProbeSha256']=digest(ROOT/'out/native-view-command-bin/ViewCommandProbe.dll')
data['nativeProbeSourceSha256']=digest(ROOT/'tools/native-view-command/Program.cs')
runtime=ROOT/'out/native-view-command-bin/Microsoft.WinUI.dll'
data['nativeRuntimeSha256']=digest(runtime) if runtime.exists() else None
template=json.loads((ROOT/'references/view-command-template.json').read_text(encoding='utf-8'))
data['sdkSha256']=template['sdkSha256']
data['themeAnimations']=json.loads((folder/'theme-animations.json').read_text(encoding='utf-8'))
data['screenshots']={c['id']:digest(folder/(c['id']+'.png')) for c in data['cases']}
(ROOT/'references/validation/view-command-native.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
template['themeAnimations']=data['themeAnimations']
(ROOT/'references/view-command-template.json').write_text(json.dumps(template,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Recorded 42 native states and Windows fade metrics')
