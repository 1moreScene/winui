"""Record actual Gallery XAML examples in a controlled native SDK host."""
from pathlib import Path
from datetime import datetime,timezone
import json,hashlib
root=Path(__file__).resolve().parents[1]
def sha(path):return hashlib.sha256((root/path).read_bytes()).hexdigest()
source=json.loads((root/'gallery/src/official-view-command.json').read_text(encoding='utf-8'))
capture=json.loads((root/'out/view-gallery-native/complete.json').read_text(encoding='utf-8-sig'))
assert capture['sourceCommit']==source['commit'] and len(capture['cases'])==12
types={'SplitView','SemanticZoom','ParallaxView','ScrollView','ListView','GridView','AppBarButton','MenuBar','MenuBarItem','TextBlock','Rectangle'}
for case in capture['cases']:
    case['parts']=[p for p in case['parts'] if p['type'] in types]
    case['screenshot']='out/view-gallery-native/'+case['id']+'.png'
    case['screenshotSha256']=sha(case['screenshot'])
capture.update(recordedAt=datetime.now(timezone.utc).isoformat(),kind='Independent WinUI SDK probe loading the fixed Gallery runtime XAML and data; not the Store application',viewport={'width':640,'parallaxHeight':600,'semanticHeight':500,'splitWidth':400,'splitHeight':300},catalogItems=sum(len(g['Items'])for g in source['data']['Groups']),sourceSha256=sha('gallery/src/official-view-command.json'),probeSha256=sha('tools/native-view-gallery/Program.cs'))
path=root/'references/validation/view-gallery-native.json'
path.write_text(json.dumps(capture,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'states':len(capture['cases']),'catalogItems':capture['catalogItems']}))
