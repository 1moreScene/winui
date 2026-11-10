"""Offline merge of verified MIT XAML, independent of Windows/NuGet installations.

The core WinUI generic dictionary provides legacy defaults. WinUI control and
common theme dictionaries override resources in the same global theme scope.
Opt-in compact density, perf2026 and test dictionaries are not default inputs.
"""
from pathlib import Path
import copy
import hashlib
import json
import xml.etree.ElementTree as E

ROOT = Path(__file__).resolve().parents[1]
X = '{http://schemas.microsoft.com/winfx/2006/xaml}'
P = '{http://schemas.microsoft.com/winfx/2006/xaml/presentation}'
COMMIT = '7b12709347527238494ca28cb9fed326d513e779'

def build():
    manifest = json.loads((ROOT / 'references/mit-xaml-sources.json').read_text())
    assert manifest['commit'] == COMMIT and manifest['license'] == 'MIT'
    scopes = {'Shared': {}}
    sources = []
    def order(file):
        path = file['upstream']
        return (0 if path.startswith('dxaml/') else 1 if '/Materials/' in path else 3 if '/CommonStyles/' in path else 2, path)
    def key(node):
        return node.get(X + 'Key') or node.get(X + 'Name') or ('@Style:' + node.get('TargetType', '') if node.tag.endswith('}Style') else None)
    for file in sorted(manifest['files'], key=order):
        path = ROOT / file['local']
        data = path.read_bytes()
        assert hashlib.sha256(data).hexdigest() == file['sha256'], file['local']
        assert hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest() == file['gitBlobSha1'], file['local']
        if not path.name.endswith('.xaml'):
            continue
        assert not any(value in file['upstream'] for value in ['perf2026', 'TestUI', '/DensityStyles/', '/TableView/'])
        root = E.fromstring(data)
        assert root.tag == P + 'ResourceDictionary', file['local']
        count = 0
        for node in root:
            if node.tag == P + 'ResourceDictionary.ThemeDictionaries':
                for dictionary in node:
                    theme = dictionary.get(X + 'Key')
                    if theme not in ['Default', 'Light', 'HighContrast']:
                        raise ValueError(f'Unreviewed theme {theme}: {path}')
                    scope = scopes.setdefault(theme, {})
                    for resource in dictionary:
                        name = key(resource)
                        if name:
                            scope[name] = copy.deepcopy(resource)
                            count += 1
            else:
                name = key(node)
                if name:
                    scopes['Shared'][name] = copy.deepcopy(node)
                    count += 1
        sources.append({**file, 'resourceEntries': count})
    root = E.Element(P + 'ResourceDictionary')
    themed = E.SubElement(root, P + 'ResourceDictionary.ThemeDictionaries')
    for theme in ['Default', 'HighContrast', 'Light']:
        dictionary = E.SubElement(themed, P + 'ResourceDictionary', {X + 'Key': theme})
        dictionary.extend(scopes.get(theme, {}).values())
    root.extend(scopes['Shared'].values())
    output = ROOT / 'references/mit-xaml-generated/generic.xaml'
    output.parent.mkdir(exist_ok=True)
    data = E.tostring(root, encoding='utf-8', xml_declaration=True)
    if not output.exists() or output.read_bytes() != data:
        output.write_bytes(data)
    proof = {'schema': 1, 'sourceCommit': COMMIT, 'license': 'MIT',
             'inputs': sources, 'output': output.relative_to(ROOT).as_posix(),
             'sha256': hashlib.sha256(data).hexdigest(), 'generator': 'tools/build-mit-resource-dictionary.py',
             'scopes': {theme: len(values) for theme, values in scopes.items()},
             'packageTemplatesRead': False}
    (ROOT / 'references/mit-xaml-generation.json').write_text(json.dumps(proof, indent=2) + '\n', encoding='utf8', newline='\n')
    print(f'Generated verified MIT resource dictionary from {len(sources)} inputs: {len(data)} bytes.')
    return output

if __name__ == '__main__':
    build()
