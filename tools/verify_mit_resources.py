"""Fail closed on missing, modified or preview-derived runtime resource inputs."""
from pathlib import Path
import hashlib
import json
import re

COMMIT = '7b12709347527238494ca28cb9fed326d513e779'
EMBEDDED_ASSETS = [{
    'path':'references/winui/NoiseAsset_256X256_PNG.png',
    'upstream':'controls/dev/Materials/Acrylic/Assets/NoiseAsset_256X256_PNG.png',
    'gitBlobSha1':'41de173d9014b38f8290acf270c490b37fc79a60',
    'sha256':'4f2aa94a2e345a32dae689176b86c644bef87081ff9daef8c77417731862031b',
    'components':['winui'],
}]

def verify(root):
    def load(path):
        return json.loads((root / path).read_text(encoding='utf8'))
    def check(path, expected):
        file = (root / path).resolve()
        assert file.is_relative_to(root.resolve()), f'Unsafe MIT input: {path}'
        assert hashlib.sha256(file.read_bytes()).hexdigest() == expected, f'Modified MIT input: {path}'
    source = load('references/mit-xaml-sources.json')
    assert source['commit'] == COMMIT and source['license'] == 'MIT'
    assert source['licensePath'] == 'references/mit-xaml/LICENSE'
    for entry in source['files']:
        check(entry['local'], entry['sha256'])
        data = (root / entry['local']).read_bytes()
        assert hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest() == entry['gitBlobSha1']
    merged = load('references/mit-xaml-generation.json')
    assert merged['sourceCommit'] == COMMIT and merged['license'] == 'MIT'
    assert merged['packageTemplatesRead'] is False
    assert {x['local'] for x in merged['inputs']} == {x['local'] for x in source['files'] if x['local'].endswith('.xaml')}
    check(merged['output'], merged['sha256'])
    palettes = load('references/mit-palette-generation.json')
    assert palettes['license'] == 'MIT' and palettes['nativePaletteValuesRead'] is False
    for entry in palettes['outputs']:
        check(entry['path'], entry['sha256'])
    for entry in EMBEDDED_ASSETS:
        check(entry['path'], entry['sha256'])
        data = (root/entry['path']).read_bytes()
        assert hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest() == entry['gitBlobSha1']
    for path in (root/'references/sdk').glob('*.xaml'):
        # Selected templates may be displayed as source or compiled into contracts.
        assert path.read_bytes().startswith(b'<?xml'), f'Unrecognized template: {path}'
    for path in (root/'tools').glob('*.py'):
        if path.name.startswith('extract-') or path.name == 'sdk_resource_reader.py':
            assert not re.search(r'\.nuget[/\\].*experimental', path.read_text(encoding='utf8'), re.I), f'Restricted input: {path}'
    return source, merged, palettes

if __name__ == '__main__':
    verify(Path(__file__).resolve().parents[1])
    print('Verified pinned MIT source, dictionary, palettes and no preview fallback.')
