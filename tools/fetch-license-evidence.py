"""Fetch immutable upstream evidence for the resource review; never fetch at build time."""
from pathlib import Path
import concurrent.futures
import hashlib
import json
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'out/license-evidence'
OUT.mkdir(parents=True, exist_ok=True)
SOURCES = {
    'winjs-font': ('https://raw.githubusercontent.com/winjs/winjs/b9e0b33f76c57caac941c9b1885bf69443320b1c/src/fonts/Symbols.ttf', 'third_party/icon-fonts/Symbols.ttf'),
    'winjs-license': ('https://raw.githubusercontent.com/winjs/winjs/b9e0b33f76c57caac941c9b1885bf69443320b1c/License.txt', None),
    'fluent-regular': ('https://raw.githubusercontent.com/microsoft/fluentui-system-icons/e15fc0de25fab983e3e42bac8798be69a85c23bf/fonts/FluentSystemIcons-Regular.ttf', 'third_party/icon-fonts/FluentSystemIcons-Regular.ttf'),
    'fluent-filled': ('https://raw.githubusercontent.com/microsoft/fluentui-system-icons/e15fc0de25fab983e3e42bac8798be69a85c23bf/fonts/FluentSystemIcons-Filled.ttf', 'third_party/icon-fonts/FluentSystemIcons-Filled.ttf'),
    'fluent-license': ('https://raw.githubusercontent.com/microsoft/fluentui-system-icons/e15fc0de25fab983e3e42bac8798be69a85c23bf/LICENSE', 'third_party/icon-fonts/FluentSystemIcons-LICENSE'),
    'libre-icon': ('https://raw.githubusercontent.com/DiemenDesign/LibreICONS/2d2172d15e3c6ca03c018629d60050e4b99e5c55/svg-color/libre-camera-panorama.svg', 'gallery/public/official/libre-camera-panorama.svg'),
    'libre-license': ('https://raw.githubusercontent.com/DiemenDesign/LibreICONS/2d2172d15e3c6ca03c018629d60050e4b99e5c55/LICENSE', 'gallery/public/official/LibreICONS-LICENSE.txt'),
    'winui-license': ('https://raw.githubusercontent.com/microsoft/microsoft-ui-xaml/7b12709347527238494ca28cb9fed326d513e779/LICENSE', 'references/winui/LICENSE'),
}

def fetch(item):
    name, (url, local) = item
    request = urllib.request.Request(url, headers={'User-Agent': 'winui-wasm-resource-review'})
    with urllib.request.urlopen(request, timeout=25) as response:
        data = response.read()
    (OUT / name).write_bytes(data)
    result = {'url': url, 'sha256': hashlib.sha256(data).hexdigest(), 'local': local}
    if local:
        result['identical'] = data == (ROOT / local).read_bytes()
        if not result['identical']:
            result['textEquivalent'] = data.decode('utf8', errors='replace').split() == (ROOT / local).read_text(encoding='utf-8-sig', errors='replace').split()
    return name, result

if __name__ == '__main__':
    results = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(fetch, item): item[0] for item in SOURCES.items()}
        for future in concurrent.futures.as_completed(futures):
            name = futures[future]
            try:
                _, results[name] = future.result()
            except Exception as error:
                results[name] = {'error': str(error)}
            print(name, results[name].get('identical', results[name].get('error', 'downloaded')))
    (OUT / 'evidence.json').write_text(json.dumps(results, indent=2) + '\n', encoding='utf8')
