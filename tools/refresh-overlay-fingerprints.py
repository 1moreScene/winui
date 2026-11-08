"""Refresh only the overlay-owned reference fingerprints after native recapture."""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parent.parent
OWNED = [
    "references/overlay-controls-metrics.json",
    "references/overlay-desktop-acrylic-defaults.json",
    "references/popup-corner-materials-native.json",
    "tools/native-navigation/OverlayControlsProbe.cs",
    "tools/native-navigation/PopupCornersProbe.cs",
    "references/extended-source-map.json",
    "references/text-raster-sources.json",
    "references/text-coverage-native.json",
    "tools/native-navigation/TextCoverageProbe.cs",
    "tools/native-navigation/Program.cs",
]
path = ROOT / "references/baseline.json"
manifest = json.loads(path.read_text(encoding="utf-8-sig"))
files = manifest["referenceFiles"]
for relative in OWNED:
    source = ROOT / relative
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    entry = next((f for f in files if Path(f["path"]) == source), None)
    if entry is None:
        files.append({"path": str(source), "sha256": digest})
    else:
        entry["sha256"] = digest
path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
print(f"Refreshed {len(OWNED)} overlay-owned fingerprints; other entries retained.")
