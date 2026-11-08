"""Reproduce the fixed Gallery command/menu examples without reading working edits."""
from pathlib import Path
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parents[1]
COMMIT = '7360ac322414e118eadfb0c7c2f4ecc31a218f59'
KINDS = {'AppBarSeparator', 'MenuBar', 'CommandBarFlyout', 'XamlUICommand', 'StandardUICommand'}
baseline = json.loads((ROOT / 'references/baseline.json').read_text(encoding='utf-8-sig'))
gallery = Path(baseline['gallery']['path'])

def git(*args):
    return subprocess.check_output(['git', '-C', str(gallery), *args])

# The catalog supplies headers/descriptions; ensure it belongs to the pinned source.
catalog = json.loads((gallery / 'catalog/windows-samples.json').read_text(encoding='utf-8'))
controls, sources = {}, []
for control in catalog['controls']:
    name = control['name']
    if name not in KINDS:
        continue
    prefix = f'WinUIGallery/Samples/{name}/'
    files = git('ls-tree', '-r', '--name-only', COMMIT, '--', prefix).decode().splitlines()
    for path in files:
        if Path(path).suffix not in {'.cs', '.xaml', '.txt'}:
            continue
        data = git('show', f'{COMMIT}:{path}')
        target = ROOT / 'references/gallery-input' / name / Path(path).name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        sources.append({'local': target.relative_to(ROOT).as_posix(), 'upstream': path,
                        'sha256': hashlib.sha256(data).hexdigest()})
    controls[name] = {'description': control['details'], 'samples': [
        {'title': sample['header'], 'xaml': sample.get('xaml', ''), 'code': sample.get('code', '')}
        for sample in control['samples']]}
assert set(controls) == KINDS
output = {'commit': COMMIT, 'controls': controls, 'sources': sources}
(ROOT / 'gallery/src/official-command-menus.json').write_text(
    json.dumps(output, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Extracted {len(controls)} controls, {sum(len(c["samples"]) for c in controls.values())} examples, {len(sources)} source files')
