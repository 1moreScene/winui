"""Stage pinned calendar, date/time and color source evidence."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import hashlib, json, urllib.request
ROOT = Path(__file__).resolve().parent.parent
COMMIT = '7b12709347527238494ca28cb9fed326d513e779'
KINDS = ['CalendarView', 'CalendarDatePicker', 'DatePicker', 'TimePicker', 'ColorPicker']
tree = json.loads((ROOT / 'out/winui-tree.json').read_text())
tree = tree if isinstance(tree, list) else tree['tree']
files = []
for entry in tree:
    path = entry['path']
    lower = path.lower()
    if entry['type'] != 'blob' or not path.endswith(('.cpp', '.h', '.idl', '.xaml')):
        continue
    if any(s in lower for s in ['/test', 'perf2026', '/winrtgeneratedclasses/', 'automationpeer']):
        continue
    if not (any(kind.lower() in lower for kind in KINDS) or 'datetimepickerflyout' in lower or 'loopingselector' in lower or any(s in path for s in ['CalendarPanel_Partial', 'CalendarLayoutStrategy']) or path in ['controls/dev/Common/ColorConversion.cpp', 'controls/dev/Common/ColorConversion.h']):
        continue
    files.append({'upstream': path, 'local': 'references/pickers/' + path.rsplit('/', 1)[-1], 'gitBlobSha1': entry['sha']})
(ROOT / 'references/pickers').mkdir(exist_ok=True)


def fetch(record):
    target = ROOT / record['local']
    data = target.read_bytes() if target.exists() else urllib.request.urlopen(f'https://raw.githubusercontent.com/microsoft/microsoft-ui-xaml/{COMMIT}/{record["upstream"]}', timeout=40).read()
    assert hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest() == record['gitBlobSha1'], record['upstream']
    if not target.exists():
        target.write_bytes(data)
    record['sha256'] = hashlib.sha256(data).hexdigest()


with ThreadPoolExecutor(max_workers=5) as pool:
    list(pool.map(fetch, files))
(ROOT / 'references/picker-controls-sources.json').write_text(json.dumps({'commit': COMMIT, 'controls': KINDS, 'files': files}, indent=2) + '\n')
print(f'Fetched and verified {len(files)} picker sources')
