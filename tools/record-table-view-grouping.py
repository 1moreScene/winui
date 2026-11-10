"""Record release grouping, native geometry, pixels and measured CPU budgets separately."""
from pathlib import Path
import datetime
import hashlib
import json
import re
import urllib.request

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8-sig"))


def sha(path):
    return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()


sdk = sha("packages/winui-wasm/src/wasm/winui_bg.wasm")
browser = read("out/table-view-browser.json")
visual = read("out/table-view-grouping-visual.json")
performance = read("out/table-view-120/grouping-served.json")
release = read("references/table-view-grouping-release.json")
assert browser["stats"]["unexpected"] == browser["stats"]["flaky"] == 0
assert browser["config"]["metadata"]["wasmSha256"] == visual["wasmSha256"] == performance["wasmSha256"] == sdk
assert len(visual["results"]) == 12
assert all(state["matchingVisibleItems"] for state in visual["results"])
assert performance["errors"] == []
for path in ["third_party/WinUI.TableView/v1.5.1/LICENSE.md", "gallery/public/licenses/WinUI.TableView/v1.5.1/LICENSE.md", "gallery/dist/licenses/WinUI.TableView/v1.5.1/LICENSE.md", "gallery/dist/sdk-types/licenses/WinUI.TableView/v1.5.1/LICENSE.md"]:
    assert sha(path) == release["licenseSha256"], path
served_bytes = urllib.request.urlopen("http://127.0.0.1:5173/src/wasm/winui_bg.wasm").read()
assert hashlib.sha256(served_bytes).hexdigest() == sdk
production = list((ROOT / "gallery/dist/assets").glob("*.wasm"))
assert len(production) == 1 and sha(production[0]) == sdk
rust_passes = 0
for path in ["out/table-view-grouping-rust-scoped.log", "out/table-view-grouping-picker.log"]:
    log = (ROOT / path).read_text(encoding="utf-8")
    assert "test result: FAILED" not in log
    rust_passes += sum(map(int, re.findall(r"test result: ok\. (\d+) passed", log)))
scrolling = [stage for stage in performance["summary"] if "wheel" in stage["name"] or "impulse" in stage["name"]]
report = {
    "recordedAt": datetime.datetime.now().astimezone().isoformat(),
    "sdkWasmSha256": sdk,
    "computerUse": False,
    "community": {"tag": release["tag"], "commit": release["commit"], "packageSha256": release["packageSha256"], "releaseDllSha256": release["releaseDllSha256"], "nativeDependency": release["nativeDependency"], "nativeRun": release["nativeRun"], "nativeResultSha256": release["nativeResultSha256"]},
    "implementation": {path: sha(path) for path in ["src/scene/table_view.rs", "src/scene/table_view/runtime.rs", "src/scene/table_view/grouping.rs", "src/scene/paint.rs", "references/table-view-grouping-runtime.json"]},
    "boundary": "Rust owns grouping/counting/order/expansion/selection/layout/virtualization/clipping/input/drawing. TS owns business functions, typed API and native template-slot mounting; React does not implement the control behavior.",
    "functional": {"rustPasses": rust_passes, "browser": browser["stats"], "browserResultSha256": sha("out/table-view-browser.json")},
    "nativeStaticEvidence": {"path": "out/table-view-grouping-visual.json", "sha256": sha("out/table-view-grouping-visual.json"), "states": visual["results"], "acceptedAsFullParity": False},
    "performance": {"path": "out/table-view-120/grouping-served.json", "sha256": sha("out/table-view-120/grouping-served.json"), "driver": performance["driver"], "requestedHz": performance["requestedHz"], "budgetMs": performance["budgetMs"], "summary": performance["summary"], "allScrollingP95Within120Budget": all(stage["drawP95"] <= performance["budgetMs"] for stage in scrolling), "physicalPresentationAccepted": False},
    "notAccepted": ["Full native/Composition parity", "Physical-monitor 120Hz presentation and stable 120fps across all paths", "System high contrast native pixel comparison", "Natural per-group variable header height; the SDK exposes a uniform groupHeaderHeight", "The 125% fixture retains a 0.8 DIP group-header right-edge width difference and text rasterization differences"],
    "licenseSha256": release["licenseSha256"],
}
path = ROOT / "references/validation/table-view-grouping.json"
path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Recorded {rust_passes} Rust passes, {browser['stats']['expected']} browser passes, 12 native static states; physical 120Hz remains a separate gate.")
