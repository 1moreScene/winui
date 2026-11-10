"""Verified, generated MIT resource input. No installed SDK template fallback."""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
COMMIT = '7b12709347527238494ca28cb9fed326d513e779'
SOURCE_ID = 'microsoft/microsoft-ui-xaml@' + COMMIT
resource_path = ROOT / 'references/mit-xaml-generated/generic.xaml'
proof = json.loads((ROOT / 'references/mit-xaml-generation.json').read_text(encoding='utf8'))
assert proof['sourceCommit'] == COMMIT and proof['license'] == 'MIT'
assert proof['packageTemplatesRead'] is False
assert hashlib.sha256(resource_path.read_bytes()).hexdigest() == proof['sha256'], 'Regenerate the MIT resource dictionary'
for file in proof['inputs']:
    assert hashlib.sha256((ROOT / file['local']).read_bytes()).hexdigest() == file['sha256'], file['local']
