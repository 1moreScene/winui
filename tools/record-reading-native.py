from pathlib import Path
import json,hashlib
R=Path(__file__).resolve().parents[1];out=R/'out/reading-native';data=json.loads((out/'complete.json').read_text(encoding='utf-8-sig'))
def record(p):return {'path':str(p.relative_to(R)).replace('\\','/'),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size}
data['sdk']='Microsoft.WindowsAppSDK.WinUI/2.3.10-experimental'
data['galleryCommit']='7360ac322414e118eadfb0c7c2f4ecc31a218f59'
data['winuiCommit']='7b12709347527238494ca28cb9fed326d513e779'
data['artifacts']=[record(p)for p in sorted(out.glob('*.png'))]+[record(p)for p in sorted((R/'out/native-reading-bin').glob('Microsoft.UI.Xaml*'))if p.is_file()]
(R/'references/validation/reading-native.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(len(data['cases']),'native states recorded')
