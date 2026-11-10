"""Pinned runtime XAML and catalog snippets for the Expander and Grid pages."""
from pathlib import Path
import copy
import hashlib
import json
import re
import subprocess
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
baseline = json.loads((ROOT / 'references/baseline.json').read_text(encoding='utf-8'))
gallery = baseline['gallery']['path']
commit = baseline['gallery']['commit']
def read(path):
    return subprocess.check_output(['git', '-C', gallery, 'show', f'{commit}:{path}'])
catalog = json.loads(read('catalog/windows-samples.json').decode('utf-8-sig'))
ns = 'http://schemas.microsoft.com/winfx/2006/xaml/presentation'
x = 'http://schemas.microsoft.com/winfx/2006/xaml'
ET.register_namespace('', ns)
ET.register_namespace('x', x)
def tag(node):
    return node.tag.rsplit('}', 1)[-1]
controls, sources = {}, []
for name in ['Expander', 'Grid']:
    folder = f'WinUIGallery/Samples/{name}'
    filenames = subprocess.check_output(['git', '-C', gallery, 'ls-tree', '--name-only', f'{commit}:{folder}']).decode().splitlines()
    for filename in filenames:
        if Path(filename).suffix not in ['.txt', '.xaml', '.cs']:
            continue
        original = f'{folder}/{filename}'
        data = read(original)
        target = ROOT / 'references/gallery-input' / name / filename
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        sources.append({'path': target.relative_to(ROOT).as_posix(), 'source': original, 'sha256': hashlib.sha256(data).hexdigest()})
    page = ET.fromstring(read(f'{folder}/{name}Page.xaml'))
    runtime = []
    for example in (node for node in page.iter() if tag(node) == 'ControlExample'):
        host = next((child for child in example if tag(child) == 'ControlExample.Example'), example)
        runtime.append(next(child for child in host if tag(child) == name))
    entry = next(control for control in catalog['controls'] if control['name'] == name)
    samples = []
    for sample, node in zip(entry['samples'], runtime, strict=True):
        node = copy.deepcopy(node)
        for child in node.iter():
            child.attrib.pop(f'{{{x}}}Name', None)
        xml = ET.tostring(node, encoding='unicode')
        xml = re.sub(r' xmlns(?::\w+)?="[^"]+"', '', xml)
        samples.append({'title': sample['header'], 'xaml': xml.strip(), 'referenceXaml': sample['xaml'], 'file': Path(sample['gallery']['source']).name})
    controls[name] = {'description': entry['details'], 'samples': samples}
output = {'galleryCommit': commit, 'controls': controls, 'sources': sources,
          'differences': ['Expander second runtime header/content are TextBlocks; its catalog snippet uses ToggleButton/Button.',
                          'Grid runtime height is 160 and rectangles are 50x50; its catalog snippet says height 120 and omits rectangle sizes.']}
(ROOT / 'gallery/src/official-layout-gallery.json').write_bytes((json.dumps(output, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
print('Extracted pinned Expander and Grid runtime pages and reference snippets')
