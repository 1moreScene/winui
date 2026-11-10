"""Capture full notices from the exact installed Cargo/npm dependencies, offline.

Run deliberately after dependency updates; check-resource-licenses.py detects
stale locks or edited notices. This does not approve a new license expression.
"""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'third_party/licenses/dependencies'
DEST.mkdir(parents=True, exist_ok=True)

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def notices(directory, target):
    files = sorted(file for file in directory.iterdir() if file.is_file()
                   and file.name.lower().startswith(('license', 'licence', 'notice', 'copying', 'copyright')))
    target.mkdir(parents=True, exist_ok=True)
    results = []
    for file in files:
        output = target / file.name
        shutil.copyfile(file, output)
        results.append({'path': output.relative_to(ROOT).as_posix(), 'sha256': digest(output)})
    return results

def main():
    cargo = json.loads(subprocess.check_output(['cargo', 'metadata', '--locked', '--offline', '--format-version', '1'], cwd=ROOT))
    components = []
    for package in sorted(cargo['packages'], key=lambda p: (p['name'], p['version'])):
        if package['name'] == 'winui-wasm':
            continue
        name, version = package['name'], package['version']
        license_files = notices(Path(package['manifest_path']).parent, DEST / 'rust' / f'{name}-{version}')
        if not license_files:
            raise ValueError(f'No full license text for Rust {name} {version}')
        components.append({'ecosystem': 'cargo', 'name': name, 'version': version,
                           'license': package['license'], 'repository': package.get('repository'),
                           'source': f'https://crates.io/crates/{name}/{version}', 'notices': license_files})
    npm_entries = {}
    for project in ['gallery', 'packages/winui-wasm']:
        lock = json.loads((ROOT / project / 'package-lock.json').read_text(encoding='utf8'))
        for path, package in sorted(lock['packages'].items()):
            if not path or path in ['../packages/winui-wasm', 'node_modules/winui-wasm']:
                continue  # First-party package, reviewed separately.
            name, version = path.split('node_modules/')[-1], package['version']
            key = (name, version)
            if key in npm_entries:
                npm_entries[key]['projects'].append(project)
                continue
            directory = ROOT / project / path
            entry = {'ecosystem': 'npm', 'name': name, 'version': version,
                     'license': package.get('license'), 'integrity': package.get('integrity'),
                     'dev': package.get('dev', False), 'optional': package.get('optional', False),
                     'source': package.get('resolved'), 'installedAtReview': directory.is_dir(), 'notices': [], 'projects': [project]}
            if directory.is_dir():
                actual = json.loads((directory / 'package.json').read_text(encoding='utf8'))
                if actual['version'] != version:
                    raise ValueError(f'Installed npm version differs from lock: {name}')
                entry['repository'] = actual.get('repository')
                entry['notices'] = notices(directory, DEST / 'npm' / f'{name.replace("/", "__")}-{version}')
                if not entry['notices'] and name.startswith('@rolldown/binding-') and entry['dev']:
                    entry['noticeSource'] = 'rolldown project license (build tool; native binding is not shipped)'
                    entry['notices'] = notices(ROOT / project / 'node_modules/rolldown', DEST / 'npm' / f'{name.replace("/", "__")}-{version}')
                if not entry['notices']:
                    raise ValueError(f'No full license text for installed npm {name}')
            elif not entry['optional']:
                raise ValueError(f'Nonoptional npm dependency missing: {name}')
            npm_entries[key] = entry
            components.append(entry)
    result = {'schema': 1, 'reviewedOn': '2026-11-10',
              'scope': 'All resolved Cargo crates and npm packages, including build/test tools. Uninstalled optional platform binaries are metadata-only and are not distributed.',
              'lockfiles': {name: digest(ROOT / name) for name in ['Cargo.toml', 'Cargo.lock', 'gallery/package.json', 'gallery/package-lock.json', 'packages/winui-wasm/package.json', 'packages/winui-wasm/package-lock.json']},
              'components': components}
    (ROOT / 'third_party/dependency-licenses.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    print(f'Captured {len(components)} dependency records and their installed full notices.')

if __name__ == '__main__':
    main()
