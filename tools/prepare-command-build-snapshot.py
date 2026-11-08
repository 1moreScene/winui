"""Freeze SDK sources for independent command/render validation during picker work."""
from pathlib import Path
import sys,re,shutil,json,hashlib
ROOT=Path(__file__).resolve().parents[1]
name=sys.argv[1]
assert re.fullmatch(r'[a-z0-9-]+',name)
destination=ROOT/'out'/name
assert not destination.exists(),f'Immutable snapshot already exists: {destination}'
destination.mkdir()
for name in ['src','references','tests','examples','tools']:
 shutil.copytree(ROOT/name,destination/name)
for name in ['Cargo.toml','Cargo.lock','build.rs','rust-toolchain.toml']:
 shutil.copy2(ROOT/name,destination/name)
excluded=[]
module=destination/'src/scene/mod.rs'
s=module.read_text(encoding='utf-8')
if 'pub mod picker_controls;' in s:
 s=s.replace('pub mod picker_controls;','').replace('        self.sync_pickers();\n','')
 s=re.sub(r'^.*(?:pub picker: picker_controls::|pub picker: Option<picker_controls::|picker: Default::default\(\)|picker: picker_controls::is_control|if picker_controls::is_control\(kind\) \{ self.init_picker\(id\)\?; \}).*\n','',s,flags=re.M)
 module.write_text(s,encoding='utf-8')
 p=destination/'src/scene/properties.rs';s=p.read_text(encoding='utf-8')
 s=re.sub(r'    #\[serde\(skip_serializing_if="Option::is_none"\)\]\n    pub picker_controls: Option<Box<super::picker_controls::PickerProperties>>,\n','',s)
 s=re.sub(r'^.*(?:picker_controls:None|super::picker_controls::defaults\(kind|super::picker_controls::validate\(kind).*\n','',s,flags=re.M)
 p.write_text(s,encoding='utf-8')
 p=destination/'src/scene/composed.rs';s=p.read_text(encoding='utf-8');s=re.sub(r'^.*if self.picker_template_event\(&event\).*\n','',s,flags=re.M);p.write_text(s,encoding='utf-8')
 excluded=['Unfinished picker_controls scene module, properties, initialization and event hook; working tree untouched. Pure picker_value/picker_spectrum remain.']
files=[]
for p in destination.rglob('*.rs'):
 files.append({'path':p.relative_to(destination).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(destination/'snapshot.json').write_text(json.dumps({'origin':str(ROOT),'excluded':excluded,'rustFiles':files},indent=2)+'\n',encoding='utf-8')
print(destination)
