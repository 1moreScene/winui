"""Restore missing pinned 1.6.4 inputs and verify their Git object identity."""
from pathlib import Path
import hashlib
import json
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / "references/table-view-winui-1.6/source.json").read_text(encoding="utf-8"))
for entry in manifest["files"]:
    path = ROOT / entry["path"].replace("\\", "/")
    data = path.read_bytes() if path.exists() else urllib.request.urlopen(
        f"https://raw.githubusercontent.com/microsoft/microsoft-ui-xaml/{manifest['commit']}/{entry['upstream']}", timeout=60
    ).read()
    assert hashlib.sha256(data).hexdigest() == entry["sha256"], str(path)
    assert hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest() == entry["gitBlob"], str(path)
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
print(f"Verified {len(manifest['files'])} source blobs at {manifest['commit']}.")
