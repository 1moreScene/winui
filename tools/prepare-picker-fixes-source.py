"""Overlay picker fixes on the last compiling shared SDK, retaining working edits."""
from pathlib import Path
import shutil,json,hashlib
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'out/picker-delivery-source-v4'
DEST=ROOT/'out/picker-reported-isolated-source'
assert BASE.exists() and not DEST.exists()
shutil.copytree(BASE,DEST)
for rel in ['src/scene/picker_controls.rs','tests/picker_controls.rs']:
    shutil.copy2(ROOT/rel,DEST/rel)
for p in (ROOT/'src/scene/picker_controls').glob('*.rs'):
    shutil.copy2(p,DEST/'src/scene/picker_controls'/p.name)
p=DEST/'src/scene/mod.rs';s=p.read_text(encoding='utf-8');assert 'n.picker.snapshot()' in s;s=s.replace('n.picker.snapshot()','n.picker.snapshot(self.time)');p.write_text(s,encoding='utf-8')
p=DEST/'src/scene/input.rs';s=p.read_text(encoding='utf-8');needle='        if self.picker_input(&input)?';assert needle in s;s=s.replace(needle,'        self.pump_composed_events();\n'+needle);needle='        self.pump_navigation_control_events();\n        self.revision += 1;';assert needle in s;s=s.replace(needle,'        self.pump_navigation_control_events();\n        self.pump_composed_events();\n        self.revision += 1;');p.write_text(s,encoding='utf-8')
files={str(p.relative_to(DEST)).replace('\\','/'):hashlib.sha256(p.read_bytes()).hexdigest() for directory in ['src','references','tests'] for p in (DEST/directory).rglob('*') if p.is_file()}
(DEST/'snapshot.json').write_text(json.dumps({'base':str(BASE),'workingTreePreserved':True,'pickerOverlay':['src/scene/picker_controls.rs','src/scene/picker_controls/*.rs','tests/picker_controls.rs'],'integrationPatches':['Picker snapshot clock','Process template events synchronously around input'],'excluded':['Unfinished concurrent source changes after the last compiling SDK baseline, including the draft ScrollView/Swipe input integration.'],'files':files},indent=2)+'\n',encoding='utf-8')
print(DEST)
