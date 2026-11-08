"""Freeze the shared workspace before validation; never edit another batch out."""
from pathlib import Path
import shutil,json,hashlib,sys,re
ROOT=Path(__file__).resolve().parents[1]
name=sys.argv[1] if len(sys.argv)>1 else 'repeater-refresh-delivery'
assert re.fullmatch(r'[a-z0-9-]+',name)
DEST=ROOT/'out'/name
assert not DEST.exists(),f'Immutable snapshot already exists: {DEST}'
DEST.mkdir(parents=True)
for folder in ['src','references','tests']:
 shutil.copytree(ROOT/folder,DEST/folder)
for name in ['Cargo.toml','Cargo.lock','build.rs','rust-toolchain.toml']:
 shutil.copy2(ROOT/name,DEST/name)
(DEST/'tools').mkdir()
for name in ['extract_button.rs','extract_content.rs','extract_material.rs','copy-sdk-types.mjs']:
 shutil.copy2(ROOT/'tools'/name,DEST/'tools'/name)
gallery=DEST/'gallery';gallery.mkdir()
for name in ['src','public','tests']:shutil.copytree(ROOT/'gallery'/name,gallery/name)
for name in ['package.json','package-lock.json','index.html','vite.config.ts','playwright.repeater-refresh.config.ts','playwright.repeater-refresh-production.config.ts','tsconfig.json','tsconfig.sdk.json','collection-validation-paths.ts']:
 shutil.copy2(ROOT/'gallery'/name,gallery/name)
files=[]
for folder in ['src','references']:
 for p in (DEST/folder).rglob('*'):
  if p.is_file():files.append(dict(path=p.relative_to(DEST).as_posix(),sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
(DEST/'snapshot.json').write_text(json.dumps(dict(origin=str(ROOT),excluded=[],files=files),indent=2)+'\n',encoding='utf-8')
print(DEST)
