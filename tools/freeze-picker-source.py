"""Freeze the complete shared Rust tree and resource contracts without editing it."""
from pathlib import Path
import hashlib,json,shutil,sys,time
ROOT=Path(__file__).resolve().parents[1]
name=sys.argv[1]
assert name.replace('-','').isalnum()
dest=ROOT/'out'/name
assert not dest.exists(),f'Immutable source snapshot already exists: {dest}'
paths=[p for directory in ['src','references','tools','tests','examples'] for p in (ROOT/directory).rglob('*') if p.is_file() and '__pycache__' not in p.parts]
paths += [ROOT/p for p in ['Cargo.toml','Cargo.lock','build.rs','rust-toolchain.toml']]
for attempt in range(5):
    data={p.relative_to(ROOT):p.read_bytes() for p in paths}
    time.sleep(.15)
    if all(p.read_bytes()==data[p.relative_to(ROOT)] for p in paths):break
else:raise RuntimeError('Shared sources kept changing; no snapshot was written')
for rel,blob in data.items():
    p=dest/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(blob)
(dest/'snapshot.json').write_text(json.dumps({'origin':str(ROOT),'excluded':[], 'files':{p.as_posix():hashlib.sha256(b).hexdigest() for p,b in data.items()}},indent=2)+'\n',encoding='utf-8')
print(dest)
