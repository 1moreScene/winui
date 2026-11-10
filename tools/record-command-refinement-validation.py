"""Record the command-control refinement, without treating probes as Store acceptance."""
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
import json
import re
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8-sig"))


def log(path):
    return (ROOT / path).read_text(encoding="utf-8-sig")


browser = read("out/command-controls-browser-results.json")["stats"]
visual_test = read("out/command-controls-visual-results.json")["stats"]
assert browser["expected"] == 13 and visual_test["expected"] == 1
for stats in [browser, visual_test]:
    assert not any(stats[k] for k in ["unexpected", "flaky", "skipped"])
assert "2 passed" in log("out/command-refinement-deployed.log")
rust_log = log("out/command-refinement-tests.log")
assert "FAILED" not in rust_log and "error:" not in rust_log
rust_count = sum(map(int, re.findall(r"test result: ok\. (\d+) passed", rust_log)))
assert rust_count >= 231
for name in ["clippy", "wasm-clippy"]:
    content = log(f"out/command-refinement-{name}.log")
    assert "Finished" in content and "error:" not in content
assert "error TS" not in log("out/command-refinement-typecheck.log")
assert "built in" in log("out/command-refinement-vite.log")
assert "error TS" not in log("out/command-refinement-declarations.log")

visual = read("references/command-controls-refinement-visual.json")
assert len(visual["cases"]) == 104 and not visual["errors"]
runtime_path = "out/collections-5199-test-runtime"
app_path = "out/collections-5199-app-runtime"
stamp = read(f"{runtime_path}/build-stamp.json")
expected = stamp["sha256"]
assert visual["runtime"]["sha256"] == expected
assert sha256((ROOT / runtime_path / "winui_bg.wasm").read_bytes()).hexdigest() == expected
assert sha256(urlopen("http://127.0.0.1:5197/src/wasm/winui_bg.wasm").read()).hexdigest() == expected
assert read(f"{app_path}/manifest.json") == read("out/collections-5197-app-runtime/manifest.json")
production_assets = list((ROOT / "out/command-refinement-final-dist/assets").glob("*.wasm"))
assert len(production_assets) == 1
assert sha256(production_assets[0].read_bytes()).hexdigest() == expected

record = read("references/command-controls-initial-status.json")
record["recordedAt"] = datetime.now(timezone.utc).isoformat()
cases = visual["cases"]
record["validation"].update({
    "rustTests": rust_count,
    "browserTests": browser["expected"],
    "deployedSmokeTests": 2,
    "rendererComparisons": len(cases),
    "maximumRootErrorDIP": max(abs(v) for c in cases for v in c["dimensionError"]),
    "maximumPartErrorDIP": max(c["partGeometryError"] for c in cases),
    "maximumPopupErrorDIP": max(c.get("popupGeometryError", 0) for c in cases),
    "meanImageError": sum(c["meanAbsoluteColorError"] for c in cases) / len(cases),
    "maximumImageError": max(c["meanAbsoluteColorError"] for c in cases),
    "normalBorderDPR": [1, 1.25, 1.5, 2],
    "productionWasmMatchesTested": True,
})
manifest = read(f"{app_path}/manifest.json")
changed = [f["path"] for f in manifest["files"] if
           not (ROOT / "gallery/src" / f["path"]).exists() or
           sha256((ROOT / "gallery/src" / f["path"]).read_bytes()).hexdigest() != f["sha256"]]
record["runtime"] = {
    "url": "http://127.0.0.1:5197/#command-bar",
    "sha256": expected,
    "matchesCurrentBinary": read("packages/winui-wasm/src/wasm/build-stamp.json")["sha256"] == expected,
    "frozenRuntime": runtime_path,
    "frozenApplication": app_path,
    "servedRuntime": "out/collections-5197-test-runtime",
    "applicationFilesChangedSinceFreeze": changed,
    "note": "5197 serves the exact runtime and application tested on 5199. Later shared workspace edits are excluded.",
}
record["refinement"] = {
    "fixed": [
        "Partial commandControls updates merge fields and retain unchanged primary/secondary source identity.",
        "Internal AppBar template context survives unrelated property updates.",
        "DropDownButton uses InnerBorderEdge background and an entirely inset border.",
        "SelectorBar pill uses the native scaled elliptical corners, with balanced renderer clip state.",
    ],
    "regression": "Four add/remove cycles, open-popup source replacement, stable primary node IDs and dimensions, command clicks; fractional-DPR normal border pixel containment; interrupted selection clip balance.",
    "visualRecord": "references/command-controls-refinement-visual.json",
    "releaseAudit": "references/command-controls-refinement-release-audit.json",
    "storeAcceptance": "Not completed: physical Escape stopped desktop automation before usable Store visual evidence. Native screenshots are reused same-SDK probe evidence, not new Store captures.",
    "commandBarAnimationSource": "CommandBar_Partial.cpp hooks OverflowContentTransform above popup content, shadow and system backdrop; the whole-popup translation is intentional.",
}
assert all(max(map(abs, c["dimensionError"])) < .81
           and c["partGeometryError"] < .81
           and c.get("popupGeometryError", 0) < .81 for c in cases)
record["scope"]["fullStoreGalleryFrameByFrameParity"] = False
(ROOT / "references/command-controls-status.json").write_text(
    json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(json.dumps({"rustTests": rust_count, "browserTests": browser["expected"],
                  "rendererCases": len(cases), "sha256": expected}, indent=2))
