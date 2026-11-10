"""Fetch the fixed MIT XAML inputs and verify each against its Git tree blob.

Maintenance only; normal generation is offline and never reads NuGet templates.
"""
from pathlib import Path
import concurrent.futures
import hashlib
import json
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
COMMIT = '7b12709347527238494ca28cb9fed326d513e779'
DEST = ROOT / 'references/mit-xaml'

def main():
    tree = json.loads((ROOT / 'out/mit-winui-tree.json').read_text(encoding='utf8'))
    assert not tree.get('truncated')
    paths = {entry['path']: entry for entry in tree['tree'] if entry['type'] == 'blob'}
    selected = [path for path in paths if path == 'dxaml/xcp/dxaml/themes/generic.xaml' or
                path.startswith('controls/dev/') and path.endswith('.xaml') and
                not Path(path).name.startswith(('InkToolbar', 'MapControl', 'WebView2', 'TableView')) and
                not any(part in path for part in ['/TestUI/', '/InteractionTests/', '/APITests/', '/UnitTests/', '/test/', '/Tests/']) and
                not any(part in path for part in ['perf2026', 'TestUI', '/DensityStyles/', '/TableView/', '/WebView2/', '/MapControl/', '/InkToolbar/'])]
    # Includes the explicit Microsoft MIT license, not a NuGet package license.
    selected.append('LICENSE')
    def fetch(path):
        target = DEST / path
        expected = paths[path]['sha']
        def valid(data):
            return hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest() == expected
        data = target.read_bytes() if target.exists() else None
        if data is None or not valid(data):
            error = None
            for attempt in range(3):
                try:
                    url = f'https://raw.githubusercontent.com/microsoft/microsoft-ui-xaml/{COMMIT}/{path}'
                    request = urllib.request.Request(url, headers={'User-Agent': 'WinUI-WASM-MIT-XAML-Migration'})
                    with urllib.request.urlopen(request, timeout=25) as response:
                        data = response.read()
                    assert valid(data), f'Git blob mismatch: {path}'
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_bytes(data)
                    break
                except Exception as exc:
                    error = exc
                    if attempt == 2:
                        raise RuntimeError(f'{path}: {error}') from error
                    time.sleep(0.2)
        return {'local': target.relative_to(ROOT).as_posix(), 'upstream': path,
                'gitBlobSha1': expected, 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)}
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        files = list(pool.map(fetch, sorted(selected)))
    manifest = {'repository': 'https://github.com/microsoft/microsoft-ui-xaml', 'commit': COMMIT,
                'license': 'MIT', 'licensePath': 'references/mit-xaml/LICENSE', 'files': files}
    (ROOT / 'references/mit-xaml-sources.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf8')
    print(f'Verified {len(files)} fixed MIT source files against Git blobs.')

if __name__ == '__main__':
    main()
