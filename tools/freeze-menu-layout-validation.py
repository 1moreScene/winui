"""Freeze the complete current Rust tree and dependencies without excluding controls."""
from pathlib import Path
import json,hashlib,shutil,sys
ROOT=Path(__file__).resolve().parents[1]
name=sys.argv[1] if len(sys.argv)>1 else 'menu-layout-validation-source'
assert name.startswith('menu-layout-') and all(c.isalnum()or c=='-' for c in name)
dest=ROOT/'out'/name
assert not dest.exists(),f'Immutable snapshot already exists: {dest}'
dest.mkdir()
files={}
for folder in ['src','references','tests','examples']:
 for path in (ROOT/folder).rglob('*'):
  if path.is_file():files[path.relative_to(ROOT).as_posix()]=path.read_bytes()
for name in ['Cargo.toml','Cargo.lock','build.rs','rust-toolchain.toml','tools/extract_button.rs','tools/extract_content.rs','tools/extract_material.rs']:
 files[name]=(ROOT/name).read_bytes()
for name,data in files.items():
 target=dest/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
manifest={'origin':str(ROOT),'excluded':[],'files':{name:hashlib.sha256(data).hexdigest() for name,data in files.items()}}
(dest/'source-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8')
print(dest)
