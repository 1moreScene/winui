"""Offline integrity check and separate fail-closed redistribution gate.

--files verifies reviewed inputs, notices and locks only (local development).
--release additionally rejects unresolved permission/provenance issues.
Neither mode is a legal opinion or an automatic license approval system.
"""
from pathlib import Path
import argparse
import hashlib
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
MEDIA = {'.png', '.jpg', '.jpeg', '.svg', '.ttf', '.otf', '.woff', '.woff2', '.gif', '.webp', '.mp3', '.mp4', '.wav', '.ico'}
APPROVED = {'MIT', 'Apache-2.0', 'ISC', 'BSD-3-Clause', 'Unicode-3.0', 'Zlib', 'MIT OR Apache-2.0',
            'Apache-2.0 OR MIT', 'MIT/Apache-2.0', 'MIT OR Zlib OR Apache-2.0', '0BSD OR MIT OR Apache-2.0',
            '(Apache-2.0 OR MIT) AND BSD-3-Clause', 'Unlicense OR MIT', '(MIT OR Apache-2.0) AND Unicode-3.0'}

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def read_manifest(name):
    return json.loads((ROOT / 'third_party' / name).read_text(encoding='utf8'))

def verify(release=False):
    resources = read_manifest('resource-manifest.json')
    dependencies = read_manifest('dependency-licenses.json')
    errors = []
    def check(path, expected):
        file = (ROOT / path).resolve()
        if not file.is_relative_to(ROOT) or not file.is_file():
            errors.append(f'Missing or unsafe reviewed file: {path}')
        elif digest(file) != expected:
            errors.append(f'Reviewed bytes changed: {path}')
    records = resources['files']
    reviewed = {entry['path'] for entry in records}
    if len(reviewed) != len(records):
        errors.append('Duplicate reviewed media paths')
    actual = {file.relative_to(ROOT).as_posix() for directory in ['gallery/public', 'packages/winui-wasm/src/assets', 'third_party/icon-fonts']
              for file in (ROOT / directory).rglob('*') if file.is_file() and file.suffix.lower() in MEDIA}
    for path in sorted(actual - reviewed):
        errors.append(f'Unreviewed media: {path}')
    owners = {component['id'] for component in resources['components']}
    for component in resources['components']:
        license = component.get('license')
        if license not in APPROVED | {'MIT AND Apache-2.0 AND Unicode-3.0', 'LicenseRef-Microsoft-Windows-App-SDK-Engineering-Preview'}:
            errors.append(f'Unreviewed resource license: {component["id"]}: {license}')
        if release and component.get('redistributionApproved') is False:
            errors.append(f'Resource component has no redistribution approval: {component["id"]}')
    for entry in records + resources.get('inlineResources', []):
        check(entry['path'], entry['sha256'])
        if not entry.get('components') or not set(entry['components']).issubset(owners):
            errors.append(f'Missing reviewed owner: {entry["path"]}')
    for path, expected in resources['notices'].items():
        check(path, expected)
    for path, expected in resources.get('supportingFiles', {}).items():
        check(path, expected)
    for path, expected in dependencies['lockfiles'].items():
        check(path, expected)
    for package in dependencies['components']:
        license = package['license']
        if license == 'MPL-2.0':
            if package['ecosystem'] != 'npm' or not package.get('dev') or not package['name'].startswith('lightningcss'):
                errors.append(f'MPL component needs distribution/source review: {package["name"]}')
        elif license not in APPROVED:
            errors.append(f'Unreviewed dependency license: {package["name"]}: {license}')
        for notice in package['notices']:
            check(notice['path'], notice['sha256'])
    # Full license texts must also be delivered, not just inventoried in source.
    for path in ['THIRD_PARTY_NOTICES.txt', 'gallery/public/licenses/THIRD_PARTY_NOTICES.txt']:
        if not (ROOT / path).is_file():
            errors.append(f'Missing aggregate distribution notices: {path}')
    aggregate_path = ROOT / 'THIRD_PARTY_NOTICES.txt'
    if aggregate_path.is_file():
        aggregate = aggregate_path.read_text(encoding='utf8')
        notice_paths = set(resources['notices']) | {notice['path'] for package in dependencies['components'] for notice in package['notices']}
        for path in notice_paths:
            file = ROOT / path
            if file.is_file() and file.read_text(encoding='utf8', errors='replace') not in aggregate:
                errors.append(f'Full license text missing from aggregate: {path}')
        public = ROOT / 'gallery/public/licenses/THIRD_PARTY_NOTICES.txt'
        if public.is_file() and public.read_bytes() != aggregate_path.read_bytes():
            errors.append('Public license bundle differs from the reviewed source bundle')
    for name in ['resource-manifest.json', 'dependency-licenses.json']:
        public = ROOT / 'gallery/public/licenses' / name
        if not public.is_file() or public.read_bytes() != (ROOT / 'third_party' / name).read_bytes():
            errors.append(f'Public source inventory is stale: {name}')
    if release:
        # A clean finding list is insufficient: the immutable MIT chain is required.
        try:
            import importlib.util
            spec = importlib.util.spec_from_file_location('verify_mit_resources', Path(__file__).with_name('verify_mit_resources.py'))
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            verify_mit = module.verify
            verify_mit(ROOT)
        except (AssertionError, OSError, ValueError, KeyError) as error:
            errors.append(f'MIT resource provenance verification failed: {error}')
        for issue in resources['unresolved']:
            errors.append(f'{issue["id"]}: {issue["summary"]}\n  Required: {issue["requiredResolution"]}')
        # Deleting a finding cannot clear an extraction chain still using the
        # restricted package. MIT replacement requires actual source changes.
        for path in sorted((ROOT / 'tools').glob('*.py')):
            if path.name.startswith('extract-') or path.name == 'sdk_resource_reader.py':
                if re.search(r'\.nuget/packages/microsoft\.windowsappsdk\.winui/[^\s\x27\x22]*experimental', path.read_text(encoding='utf8'), re.I):
                    errors.append(f'Restricted preview package is still an extraction input: {path.relative_to(ROOT).as_posix()}')
        if (ROOT / 'gallery/public/official/person-profile.png').exists():
            errors.append('The undocumented external portrait has been reintroduced')
    return resources, dependencies, errors

def main():
    parser = argparse.ArgumentParser()
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument('--files', action='store_true')
    modes.add_argument('--release', action='store_true')
    args = parser.parse_args()
    resources, dependencies, errors = verify(args.release)
    if errors:
        print('\n'.join(errors), file=sys.stderr)
        print(f'License review failed ({len(errors)} findings). No redistribution approval.', file=sys.stderr)
        return 1
    print(f'Reviewed file integrity passed: {len(resources["files"])} media files and {len(dependencies["components"])} dependency records.')
    if resources['unresolved']:
        print(f'Local file check only; {len(resources["unresolved"])} permission issue still blocks redistribution.')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
