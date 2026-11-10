"""One-time, byte-preserving extraction of the SDK dependency graph from Gallery."""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
OLD = ROOT / 'gallery/src'
NEW = ROOT / 'packages/winui-wasm/src'
graph = json.loads((ROOT / 'out/sdk-package-graph.json').read_text())
names = set(graph['files'])
names.update(path.relative_to(OLD).as_posix() for path in (OLD / 'wasm').glob('*') if path.is_file())
mapping = {(OLD / name).resolve(): NEW / name for name in names}
for source, target in mapping.items():
    if not source.is_relative_to(ROOT) or not target.resolve().is_relative_to(ROOT):
        raise ValueError('SDK move escaped workspace')
    target.parent.mkdir(parents=True, exist_ok=True)
    if source.exists():
        if target.exists():
            raise ValueError(f'Target already exists: {target}')
        source.rename(target)
for directory in ['wasm', 'assets']:
    if (OLD / directory).exists() and not any((OLD / directory).iterdir()):
        (OLD / directory).rmdir()

quoted = re.compile(r'''(["'])([^"'\r\n]+)\1''')
for folder in [ROOT / 'gallery/src', ROOT / 'gallery/tests']:
    for path in folder.rglob('*'):
        if not path.is_file() or path.suffix not in ['.ts', '.tsx', '.js', '.jsx']:
            continue
        text = path.read_text(encoding='utf8')
        def replace(match):
            quote, value = match.groups()
            if value in ['/src/index.ts', '/src/index', '/src/icon-fonts.ts']:
                return quote + '/@id/winui-wasm' + quote
            if value.startswith('.'):
                base = path.parent / value
                candidates = [base, Path(str(base) + '.ts'), Path(str(base) + '.tsx'), base / 'index.ts']
                for candidate in candidates:
                    if candidate.resolve() in mapping:
                        entry = 'winui-wasm/react' if candidate.name == 'react.tsx' else 'winui-wasm'
                        return quote + entry + quote
            return match.group(0)
        updated = quoted.sub(replace, text)
        if updated != text:
            path.write_bytes(updated.encode('utf8'))

# Build/extraction/validation tools must use the single new source location.
for path in (ROOT / 'tools').rglob('*'):
    if not path.is_file() or path.suffix not in ['.mjs', '.py', '.ps1', '.rs', '.csproj'] or path.name == Path(__file__).name:
        continue
    text = path.read_text(encoding='utf8')
    updated = text
    for name in sorted(names, key=len, reverse=True):
        updated = updated.replace('gallery/src/' + name, 'packages/winui-wasm/src/' + name)
    updated = updated.replace('gallery/src/wasm', 'packages/winui-wasm/src/wasm')
    updated = updated.replace('gallery/src/assets', 'packages/winui-wasm/src/assets')
    if updated != text:
        path.write_bytes(updated.encode('utf8'))
print(f'Moved {len(mapping)} SDK files; Gallery and tests now import package entries.')
