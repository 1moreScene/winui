"""Record functional results and native visual evidence as separate gates."""
from pathlib import Path
import argparse
import datetime
import hashlib
import json
import struct

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument("--rust-passed", type=int, required=True, help="Observed successful scoped Rust test count from this session")
parser.add_argument("--rust-command", default="cargo test --locked --test table_view --test composed --test picker_controls --test scroll_primitives")
args = parser.parse_args()


def read(relative):
    return json.loads((ROOT / relative).read_text(encoding="utf-8-sig"))


def digest(relative):
    return hashlib.sha256((ROOT / relative).read_bytes()).hexdigest()


browser = read("out/table-view-browser.json")
stats = browser["stats"]
assert stats["unexpected"] == 0 and stats["flaky"] == 0
run = read("references/table-view-native-run.json")
native = read("out/table-view-native/native.json")
defaults = next(record for record in native["records"] if record["name"] == "Light-defaults")
assert defaults["RasterizationScale"] == run["fixtureParameters"]["dpr"]
images = {}
for theme in ["Light", "Dark"]:
    for state in ["default", "cell-selected", "row-selected", "editing", "sorted"]:
        relative = f"gallery/public/community-table-view/{theme}-{state}.png"
        assert struct.unpack(">II", (ROOT / relative).read_bytes()[16:24]) == (1000, 400)
        assert digest(relative) == digest(f"out/table-view-native/{theme}-{state}.png")
        images[relative] = digest(relative)
license_hash = read("references/table-view-source.json")["licenseSha256"]
for path in ["third_party/WinUI.TableView/LICENSE.md", "gallery/public/licenses/WinUI.TableView/LICENSE.md", "gallery/dist/licenses/WinUI.TableView/LICENSE.md", "gallery/dist/sdk-types/licenses/WinUI.TableView/LICENSE.md"]:
    assert digest(path) == license_hash
report = {
    "recordedAt": datetime.datetime.now().astimezone().isoformat(),
    "acceptedAsFullNativeParity": False,
    "communityCommit": run["communityCommit"],
    "native": {"run": "references/table-view-native-run.json", "runSha256": digest("references/table-view-native-run.json"), "installedApp": "references/table-view-installed-app.json", "recordCount": len(native["records"]), "parameters": run["fixtureParameters"], "referenceImages": images},
    "functional": {"rustPassedObservedInSession": args.rust_passed, "rustCommand": args.rust_command, "browser": stats, "browserTarget": browser["config"].get("metadata",{}).get("baseURL"), "browserResultSha256": digest("out/table-view-browser.json"), "checks": ["source fingerprints and MIT bytes", "TypeScript strict and public enum checks", "Rust/React origin audit", "release WASM", "Vite production build", "SDK declarations"]},
    "reportedRegressions": {"filterCheckbox": "Checked/Unchecked/Indeterminate events update the draft; pointer, Space, Select All, Cancel and Ok verified on default Gallery", "popupOcclusion": "Floating pointer route stops at its own surface; exposed table backing pixels unchanged while hovering checkbox", "cornerMenuIcons": "Source SelectAll, ClearSelection, Copy, Paste symbols and EDE1 export glyph; six leading icon columns checked for actual painted ink", "nativeMenuBoundary": "Original menu visual tree captured; main-client PrintWindow excludes separate MenuFlyout HWND and is not menu pixel acceptance"},
    "rustInputAndFrameFixes": {"lightDismiss": "Rust closes/consumes outside presses before table templates process them", "filterScrollThumb": "Rust captures scroll-owner thumb drag outside the surface until release", "layoutReuse": "Rust reuses measured rows until layout inputs or realized range change", "textMotion": "Glyph baseline and phase remain stable before continuous scroll transforms", "frozenEditing": "Reveal uses refreshed Canvas geometry, frozen-band insets and arranged pixel widths; delayed template content receives initial focus once", "comboEditor": "Rust passes collectionItems and initial selected text to its existing ComboBox; actual popup ink verified outside the table body", "galleryWorkaround": False},
    "visualEvidence": read("out/table-view-visual-differences.json"),
    "motionEvidence": {"selection": "WinUI 1.6.4 ListViewBaseItemPresenter: 83ms opacity, 167ms scale; source curve retained", "resetEntrance": "Native EnterPage description: 667ms, 28 DIP, no staggering", "nativeFrames": "out/table-view-native/*-own-window.png; actual sampling times in native.json", "boundary": "RTB and programmatic own-window frames do not certify physical input or Composition presentation timestamps"},
    "intentionalException": "User policy suppresses black native focus/current-cell outlines while preserving focus and keyboard navigation",
    "notFullyPorted": ["ObservableCollection single-row AddDelete transition branches", "complete Content/Reorder transition lifecycle", "natural variable row/detail heights", "CLR/XAML/WinRT runtime object interfaces"],
    "notAccepted": ["full popup Acrylic/Composition comparison", "all editor 1.6.4 pixel matrices", "all frozen/drag/detail states", "native system high contrast and complete touch-column input matrix", "all animation interruption, reversal and unloading branches"],
    "sdkWasmSha256": digest("packages/winui-wasm/src/wasm/winui_bg.wasm"),
    "licenseSha256": license_hash,
}
performance_path=ROOT/"references/validation/table-view-performance.json"
press_images=[f"out/table-view-checkbox-{state}.png" for state in ["unchecked-hover","unchecked-pressed","checked-hover","checked-pressed"]]
if all((ROOT/path).exists() for path in press_images):
    report["reportedRegressions"]["cellCheckBoxPress"]={
        "scope":"Actual browser pointer hold, leave/release cancellation, keyboard hold/release, business binding, and checked/unchecked glyph pixels; not native pixel acceptance",
        "rustFix":"Generated boolean cells delegate to shared SDK control capture/Pressed/release. State events write the binding after release; cancellable editors and caller templates keep their own commit contract. Read-only columns preserve enabled visuals and disable hit testing.",
        "screenshots":{path:digest(path) for path in press_images},
        "sourceSha256":digest("src/scene/table_view/runtime.rs"),
        "galleryOrReactProductPatch":False,"computerUse":False}
broader_path=ROOT/"out/table-view-check-press-broader-browser.json"
if broader_path.exists():
    broader=read("out/table-view-check-press-broader-browser.json")
    if broader["stats"]["unexpected"]==0 and broader["stats"]["flaky"]==0:
        report["functional"]["previousBroaderBrowser"]={"path":"out/table-view-check-press-broader-browser.json","sha256":digest("out/table-view-check-press-broader-browser.json"),"stats":broader["stats"],"wasmSha256":broader["config"]["metadata"]["wasmSha256"],"scope":"Earlier full TableView suite, before the stale-source binding guard; latest targeted browser checks are recorded separately above"}
chrome_path=ROOT/"out/table-view-filter-chrome-hover.json"
if chrome_path.exists():
    chrome=read("out/table-view-filter-chrome-hover.json")
    assert chrome["wasmSha256"]==report["sdkWasmSha256"]
    assert all(sample["backingPixelsUnchanged"] and sample["neighbourPixelsUnchanged"] and sample["ownerReceivesPointer"] for sample in chrome["samples"])
    report["reportedRegressions"]["filterChromeHover"]={"evidence":chrome,"evidenceSha256":digest("out/table-view-filter-chrome-hover.json"),"screenshotSha256":digest("out/table-view-filter-chrome-hover-fixed.png"),"rustHitTestSourceSha256":digest("src/scene/input.rs"),"rustPlatformInputSourceSha256":digest("src/wasm/popup_input.rs"),"fix":"Shared Rust popup window hit boundary owns chrome; Rust/WASM input islands inside each popup prevent cross-scene fallthrough without intercepting its controls; outside hover remains live","galleryOrReactProductPatch":False,"computerUse":False}
grouping_path=ROOT/"references/table-view-grouping-research.json"
if grouping_path.exists():
    report["groupingResearch"]={"path":"references/table-view-grouping-research.json","sha256":digest("references/table-view-grouping-research.json"),"scope":"Historical v1.5.0 investigation, superseded by the authorized 1.5.1 release grouping supplement"}
grouping_release=ROOT/"references/table-view-grouping-release.json"
if grouping_release.exists():
    report["groupingRelease"]={"path":"references/table-view-grouping-release.json","sha256":digest("references/table-view-grouping-release.json"),"runtimeSourceSha256":digest("src/scene/table_view/grouping.rs"),"scope":"Authorized 1.5.1 grouping supplement; actual NuGet release DLL in community SampleApp, separate from original control baseline; static/functional evidence does not imply full native or physical 120Hz acceptance","computerUse":False}
grouping_visual=ROOT/"out/table-view-grouping-visual.json"
if grouping_visual.exists():
    visual=read("out/table-view-grouping-visual.json")
    assert visual["wasmSha256"]==report["sdkWasmSha256"]
    report["groupingVisualEvidence"]={"path":"out/table-view-grouping-visual.json","sha256":digest("out/table-view-grouping-visual.json"),"evidence":visual,"reactBoundary":"Public API, business callbacks and native content-slot plumbing only; grouping/input/layout/state/drawing stay in Rust"}
    release=read("references/table-view-grouping-release.json")
    for path in ["third_party/WinUI.TableView/v1.5.1/LICENSE.md","gallery/public/licenses/WinUI.TableView/v1.5.1/LICENSE.md","gallery/dist/licenses/WinUI.TableView/v1.5.1/LICENSE.md","gallery/dist/sdk-types/licenses/WinUI.TableView/v1.5.1/LICENSE.md"]:
        assert digest(path)==release["licenseSha256"]
if performance_path.exists():
    performance=read("references/validation/table-view-performance.json")
    report["historicalPerformanceEvidence"]={"path":"references/validation/table-view-performance.json","sha256":digest("references/validation/table-view-performance.json"),"wasmSha256":performance["afterWasmSha256"],"scope":performance["boundary"]}
high_refresh_path=ROOT/"references/validation/table-view-120.json"
if high_refresh_path.exists():
    high_refresh=read("references/validation/table-view-120.json")
    assert browser["config"]["metadata"]["wasmSha256"]==report["sdkWasmSha256"]
    key="performanceEvidence" if high_refresh["afterWasmSha256"]==report["sdkWasmSha256"] else "historicalHighRefreshEvidence"
    report[key]={"path":"references/validation/table-view-120.json","sha256":digest("references/validation/table-view-120.json"),"wasmSha256":high_refresh["afterWasmSha256"],"appliesToCurrentSdk":key=="performanceEvidence","scope":high_refresh["boundary"]}
served_path=ROOT/"out/table-view-served-release.json"
if served_path.exists():
    served=read("out/table-view-served-release.json")
    assert served["sha256"]==report["sdkWasmSha256"]
    report["servedSdk"]=served
path = ROOT / "references/validation/table-view.json"
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Recorded {stats['expected']} browser passes and {args.rust_passed} observed Rust passes; full native parity remains unaccepted.")
