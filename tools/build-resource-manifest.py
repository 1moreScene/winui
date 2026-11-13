"""Record reviewed media, exact pinned Git blobs and licensing evidence.

Explicit maintenance command, not an automatic approval step in the build.
Requires the pinned local Gallery checkout only when refreshing this inventory.
"""
from pathlib import Path
import base64
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parents[1]
GALLERY_COMMIT = '7360ac322414e118eadfb0c7c2f4ecc31a218f59'
WINUI_COMMIT = '7b12709347527238494ca28cb9fed326d513e779'
MEDIA = {'.png', '.jpg', '.jpeg', '.svg', '.ttf', '.otf', '.woff', '.woff2', '.gif', '.webp', '.mp3', '.mp4', '.wav', '.ico'}

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    baseline = json.loads((ROOT / 'references/baseline.json').read_text(encoding='utf-8-sig'))
    gallery = Path(baseline['gallery']['path'])
    tree = subprocess.check_output(['git', '-C', str(gallery), 'ls-tree', '-r', GALLERY_COMMIT, '--', 'WinUIGallery/Assets/']).decode()
    blobs = {}
    for line in tree.splitlines():
        info, path = line.split('\t', 1)
        blobs.setdefault(info.split()[2], []).append(path)
    components = [
        {'id': 'gallery', 'license': 'MIT', 'source': f'https://github.com/microsoft/WinUI-Gallery/tree/{GALLERY_COMMIT}', 'notices': ['references/GALLERY-LICENSE']},
        {'id': 'winui', 'license': 'MIT', 'source': f'https://github.com/microsoft/microsoft-ui-xaml/tree/{WINUI_COMMIT}', 'notices': ['references/winui/LICENSE']},
        {'id': 'winjs-symbols', 'license': 'Apache-2.0', 'source': 'https://github.com/winjs/winjs/tree/b9e0b33f76c57caac941c9b1885bf69443320b1c/src/fonts', 'notices': ['third_party/icon-fonts/Symbols-LICENSE', 'third_party/icon-fonts/Symbols-NOTICE', 'third_party/icon-fonts/WinJS-REPOSITORY-LICENSE']},
        {'id': 'fluent-system-icons', 'license': 'MIT', 'source': 'https://github.com/microsoft/fluentui-system-icons/tree/e15fc0de25fab983e3e42bac8798be69a85c23bf', 'notices': ['third_party/icon-fonts/FluentSystemIcons-LICENSE']},
        {'id': 'libreicons', 'license': 'MIT', 'source': 'https://github.com/DiemenDesign/LibreICONS/tree/2d2172d15e3c6ca03c018629d60050e4b99e5c55', 'notices': ['gallery/public/official/LibreICONS-LICENSE.txt']},
        {'id': 'project', 'license': 'MIT', 'source': 'Project-authored geometric artwork and synthetic two-color editor fixture', 'notices': ['LICENSE']},
        {'id': 'tableview-captures', 'license': 'MIT', 'source': 'Project-generated raster comparison captures of the pinned community WinUI.TableView, not redistributed font/SDK binaries', 'notices': ['LICENSE', 'third_party/WinUI.TableView/LICENSE.md', 'third_party/WinUI.TableView/v1.5.1/LICENSE.md', 'third_party/WinUI.TableView/NOTICE.md']},
        {'id': 'communitytoolkit-segmented', 'license': 'MIT', 'source': 'https://github.com/CommunityToolkit/Windows/tree/a2fa47ad72cb95ed81f3ff0885da627a5fd6c14e/components/Segmented', 'notices': ['third_party/CommunityToolkit.Segmented/License.md']},
        {'id': 'calendar-data', 'license': 'MIT AND Apache-2.0 AND Unicode-3.0', 'source': 'Pinned ICU4X/calendrical_calculations and lunar_python 1.4.9 generator; HKO is a comparison link, not an imported dataset', 'notices': ['third_party/calendar/ICU4X-LICENSE', 'third_party/calendar/calendrical-calculations-LICENSE', 'third_party/calendar/lunar-python-LICENSE']},

    ]
    files = []
    candidates = sorted(set(p for base in ['gallery/public', 'packages/winui-wasm/src/assets', 'third_party/icon-fonts'] for p in (ROOT / base).rglob('*') if p.is_file() and p.suffix.lower() in MEDIA))
    for path in candidates:
        relative = path.relative_to(ROOT).as_posix()
        data = path.read_bytes()
        git_blob = hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
        entry = {'path': relative, 'sha256': sha(path), 'bytes': len(data)}
        if relative.startswith('gallery/public/official/') and git_blob in blobs:
            entry.update(components=['gallery'], source=f'https://github.com/microsoft/WinUI-Gallery/blob/{GALLERY_COMMIT}/{blobs[git_blob][0]}', gitBlobSha1=git_blob)
        elif relative.endswith('/libre-camera-panorama.svg'):
            reference = json.loads((ROOT / 'references/external-icons.json').read_text())
            assert sha(path) == reference['sha256']
            entry.update(components=['libreicons'], source=reference['url'])
        elif relative.startswith('gallery/public/project/'):
            assert path.name in ['person-profile.png', 'person-profile.svg']
            entry.update(components=['project'], source='tools/generate-project-avatar.py')
        elif relative == 'gallery/public/official/rich-edit/embedded.png':
            fixture = json.loads((ROOT / 'gallery/src/rich-edit-fixtures.json').read_text())
            assert data == base64.b64decode(fixture['image'].split(',')[1])
            entry.update(components=['project'], source='gallery/src/rich-edit-fixtures.json: image; 48x32 red/blue test rectangles')
        elif relative == 'gallery/public/community-segmented/Segmented.png':
            assert git_blob == 'ba9ad789deff1e197472c2d763f8128cf53a1fc3'
            entry.update(components=['communitytoolkit-segmented'], source='https://github.com/CommunityToolkit/Windows/blob/a2fa47ad72cb95ed81f3ff0885da627a5fd6c14e/components/Segmented/samples/Assets/Segmented.png', gitBlobSha1=git_blob)
        elif relative.startswith('gallery/public/community-table-view/'):
            entry.update(components=['tableview-captures'], source='tools/native-table-view and tools/native-table-view-grouping; pinned community raster captures')
        elif relative == 'third_party/icon-fonts/Symbols.ttf':
            entry.update(components=['winjs-symbols'], source='https://raw.githubusercontent.com/winjs/winjs/b9e0b33f76c57caac941c9b1885bf69443320b1c/src/fonts/Symbols.ttf')
        elif relative.startswith('third_party/icon-fonts/FluentSystemIcons-'):
            entry.update(components=['fluent-system-icons'], source=f'https://raw.githubusercontent.com/microsoft/fluentui-system-icons/e15fc0de25fab983e3e42bac8798be69a85c23bf/fonts/{path.name}')
        elif relative == 'packages/winui-wasm/src/assets/winui-icons.woff':
            entry.update(components=['winjs-symbols', 'fluent-system-icons', 'project'], source='tools/build-icon-font.py and tools/icon_geometry.py', modified=True)
        else:
            raise ValueError(f'Unreviewed resource: {relative}')
        files.append(entry)
    from verify_mit_resources import verify, EMBEDDED_ASSETS
    mit_source, merged, palettes = verify(ROOT)
    # Preview license evidence remains historical and is not a shipped component.
    issues = []
    notices = {file: sha(ROOT / file) for component in components for file in component['notices']}
    inline = []
    for filename, source, owners in [
        ('gallery/src/HomePage.tsx', f'https://github.com/microsoft/WinUI-Gallery/blob/{GALLERY_COMMIT}/WinUIGallery/App.xaml#GitHubIcon', ['gallery']),
        ('gallery/src/rich-edit-fixtures.json', 'Project-authored red/blue PNG literal and test documents', ['project']),
    ]:
        inline.append({'path': filename, 'sha256': sha(ROOT / filename), 'source': source, 'components': owners})
    evidence = ['references/mit-xaml-sources.json', 'references/mit-xaml-generation.json', 'references/mit-palette-generation.json', 'references/browser-theme-profile.json', 'references/mit-palette-requirements.json', 'tools/build-mit-resource-dictionary.py', 'tools/generate-mit-palettes.py', 'tools/mit_xaml_resources.py', 'tools/sdk_resource_reader.py', 'tools/verify_mit_resources.py', 'third_party/resource-source-verification.json', 'references/external-icons.json', 'third_party/icon-fonts/source.json']
    evidence += [entry['local'] for entry in mit_source['files']] + [merged['output']] + [entry['path'] for entry in palettes['outputs']]
    evidence += [file.relative_to(ROOT).as_posix() for file in (ROOT/'references/sdk').glob('*.xaml')]
    evidence += [entry['path'] for entry in EMBEDDED_ASSETS]
    segmented = json.loads((ROOT / 'references/segmented-source.json').read_text(encoding='utf8'))
    for entry in segmented['files']:
        assert sha(ROOT / entry['localPath']) == entry['sha256'], entry['localPath']
        evidence.append(entry['localPath'])
    result = {'schema': 1, 'reviewedOn': '2026-11-10', 'components': components, 'files': files, 'notices': notices, 'inlineResources': inline,
              'supportingFiles': {file: sha(ROOT / file) for file in evidence},
              'embeddedResources': [{**entry,'source':f'https://github.com/microsoft/microsoft-ui-xaml/blob/{WINUI_COMMIT}/{entry["upstream"]}'} for entry in EMBEDDED_ASSETS],
              'reviewScope': 'Media in gallery/public, packages/winui-wasm/src/assets and third_party/icon-fonts; pinned source references; Cargo/npm dependencies in dependency-licenses.json. Local out/target/node_modules/native tools and Windows SDK installations are not redistribution grants.',
              'unresolved': issues}
    (ROOT / 'third_party/resource-manifest.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    print(f'Recorded {len(files)} media files; {len(issues)} unresolved release blocker.')

if __name__ == '__main__':
    main()
