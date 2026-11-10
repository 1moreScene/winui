"""Record distinct tested binaries; never promote ROI diagnostics to pixel equality."""
from pathlib import Path
import datetime, hashlib, json, re

ROOT = Path(__file__).resolve().parent.parent
def read(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8-sig"))
def save(path, value):
    (ROOT / path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
def sha(path):
    return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()
def failures(suites):
    result=[]
    for suite in suites:
        for spec in suite.get("specs", []):
            for test in spec.get("tests", []):
                if test.get("status") not in ("expected", "skipped"):
                    result.append({"title":spec["title"],"status":test.get("status"),"errors":[r.get("error",{}).get("message") for r in test.get("results",[]) if r.get("error")]})
        result.extend(failures(suite.get("suites", [])))
    return result

comparison=read("references/validation/overlay-controls-comparison.json")
native=read("out/overlay-controls-native/controls-native.json")
text=read("references/validation/overlay-text-metrics.json")
browser=read("out/overlay-repaired-full-browser.json")
before=read("out/overlay-final-full-browser.json")
rust=(ROOT/"out/overlay-svg-final-rust.log").read_text(encoding="utf8")
assert "test result: FAILED" not in rust
assert not comparison["errors"]
rows=comparison["rows"]
assert len(rows)==48 and len(comparison["frames"])==312
assert all(r["geometryError"]<.81 and r["rowError"]<.81 and r["outerEdgeMAE"]<4 for r in rows)
assert text["layoutMetricsAccepted"]
latest_targeted=read("out/overlay-svg-final-browser.json")
assert latest_targeted["stats"]["unexpected"] == 0
assert latest_targeted["stats"]["expected"] == 61
corner_materials=read("references/validation/popup-corner-materials.json")
assert len(corner_materials["rows"]) == 32 and not corner_materials["errors"]
assert max(r["cornerBackgroundError"] for r in corner_materials["rows"]) == 0
final_full=read("out/overlay-corner-full-browser.json")
final_stamp=read("out/overlay-corner-full-stamp.json")
full_fetch_evidence=[f"out/overlay-corner-full-collections-{backend}.json" for backend in ["Canvas2D", "WebGL2"]]
assert all(read(p)["wasmSha256"] == final_stamp["sha256"] for p in full_fetch_evidence)
svg_before=read("out/overlay-webgl-icon-diagnostics-before.json")
svg_after=read("out/overlay-webgl-icon-diagnostics.json")
assert len(svg_before)==len(svg_after)==10
assert all(not r["errors"] and not r["calls"] for r in svg_after)
assert all(r["wasm"]==read("out/overlay-validation/packages/winui-wasm/src/wasm/build-stamp.json")["sha256"] for r in svg_after)
sources=["src/scene/overlays.rs","src/scene/overlay_visual.rs","src/scene/paint.rs","src/scene/layout.rs","src/scene/text_edit.rs","src/typography.rs","src/render.rs","src/gpu.rs","src/acrylic.glsl","src/material.rs","src/material_blur.rs","packages/winui-wasm/src/react.tsx","tools/native-navigation/EffectsProbe.cs","tools/native-navigation/OverlayControlsProbe.cs","tools/native-navigation/TooltipControlsProbe.cs","tools/native-navigation/AcrylicKernelProbe.cs","gallery/tests/react-mount.spec.ts","gallery/tests/react-mount-fixture.tsx"]
sources += ["tools/native-navigation/PopupCornersProbe.cs", "gallery/tests/popup-corners.spec.ts", "gallery/tests/materials.spec.ts"]
report={
    "generatedAtUtc":datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "scope":"Generic Popup/Flyout/MenuFlyout/ToolTip presentation, primary-font spacing and synchronous React host mounting",
    "acceptedPixelEquality":False,
    "visual":{"report":"references/validation/overlay-controls-comparison.json","nativeStableScenes":len(native["rows"]),"browserStableScenes":len(rows),"nativeMotionTracks":len(native["motion"]),"nativeMotionFrames":sum(len(t["frames"]) for t in native["motion"]),"browserMotionFrames":len(comparison["frames"]),"maximumGeometryErrorDip":max(r["geometryError"] for r in rows),"maximumMenuRowErrorDip":max(r["rowError"] for r in rows),"maximumOuterEdgeMAE":max(r["outerEdgeMAE"] for r in rows),"wasm":read("out/overlay-validation/packages/winui-wasm/src/wasm/build-stamp.json"),"materialROI":[{k:r[k] for k in ("backend","name","materialBox","materialMAE")} for r in rows]},
    "fontMetrics":{"report":"references/validation/overlay-text-metrics.json","cases":len(text["rows"]),"maximumBaselineErrorDip":max(abs(r["baselineError"]) for r in text["rows"]),"maximumLineHeightErrorDip":max(abs(r["heightError"]) for r in text["rows"]),"primaryLineMetricsAccepted":text["layoutMetricsAccepted"],"allWidthsAccepted":text["widthAccepted"],"widthDifferences":[r for r in text["rows"] if abs(r["widthError"])>1e-5]},
    "rust":{"passed":sum(map(int,re.findall(r"test result: ok\. (\d+) passed",rust))),"log":"out/overlay-svg-final-rust.log","separateTarget":"out/overlay-rust-check"},
    "browser":{"report":"out/overlay-repaired-full-browser.json","stats":browser["stats"],"failures":failures(browser["suites"]),"wasm":read("out/overlay-repaired-full-stamp.json"),"boundary":"Historical full run before the final asymmetric material clip repair; retain failures and separate subsequent checks."},
    "latestTargeted":{"report":"out/overlay-svg-final-browser.json","stats":latest_targeted["stats"],"wasm":read("out/overlay-validation/packages/winui-wasm/src/wasm/build-stamp.json")},
    "svgUploadRepair":{"before":"out/overlay-webgl-icon-diagnostics-before.json","after":"out/overlay-webgl-icon-diagnostics.json","beforeFailingRepeats":sum(bool(r["errors"] or r["calls"]) for r in svg_before),"afterFailingRepeats":sum(bool(r["errors"] or r["calls"]) for r in svg_after),"fix":"Resolve decoded images to a natural-size Canvas pixel surface before their first WebGL texture upload; no URL extension heuristic, covering SVG data and blob sources too."},
    "latestFull":{"report":"out/overlay-corner-full-browser.json","stats":final_full["stats"],"failures":failures(final_full["suites"]),"wasm":final_stamp,"fetchedBinaryEvidence":full_fetch_evidence,"boundary":"147 assertions passed before the final shared SVG upload fix. One unhandled WebGL 1281 was observed despite the green assertions; retain that observation and validate the repair separately.","runtimeObservations":[{"error":"WebGL error: 1281","location":"IconElement Gallery SVG upload during Canvas2D to WebGL2 switch","reproduction":"out/overlay-webgl-icon-diagnostics-before.json"}]},
    "sharedRecheck":{"report":"out/overlay-shared-recheck.json","stats":read("out/overlay-shared-recheck.json")["stats"],"failures":failures(read("out/overlay-shared-recheck.json")["suites"])},
    "cornerMaterials":{"report":"references/validation/popup-corner-materials.json","browserScenes":len(read("references/validation/popup-corner-materials.json")["rows"]),"maximumCornerBackgroundError":max(r["cornerBackgroundError"] for r in read("references/validation/popup-corner-materials.json")["rows"])},
    "earlierFullCheckpoint":{"report":"out/overlay-final-full-browser.json","stats":before["stats"],"failures":failures(before["suites"]),"wasm":read("out/overlay-before-react-stamp.json")},
    "reactMount":{"report":"out/overlay-react-tests.json","stats":read("out/overlay-react-tests.json")["stats"],"completeTreeMountCycles":40,"openingTargetCases":12,"scope":"Both renderers, ordinary and StrictMode; no first-frame partial tree, no retained font metric hosts after disposal"},
    "additionalEvidence":["references/validation/overlay-own-shadow-sampling.json","references/validation/overlay-app-backdrop-kernel.json","out/overlay-slider-repeat.json","out/overlay-clock-repeat.log","out/overlay-react-integration.json"],
    "checks":{"build":"out/overlay-svg-final-build.log","typecheck":"out/overlay-svg-final-build.log","clippyHost":"out/overlay-svg-final-clippy.log","clippyWasm":"out/overlay-svg-final-wasm-clippy.log","fmt":"out/overlay-svg-final-fmt.log","enums":"out/overlay-final-enums.log","sourceAndLocalFingerprints":"out/overlay-final-baseline.log"},
    "review":"out/overlay-controls-review/index.html",
    "cornerReview":"out/popup-corner-materials/index.html",
    "remaining":["Native DirectWrite glyph coverage differs from browser Canvas glyph rasterization.","In-app Gaussian and DWM HostBackdrop kernels retain measured residuals. HostBackdrop remains a scene-bounded browser adaptation, with no external desktop access.","Seven Segoe Fluent Icons/Latin/None cases retain native width differences; None/Clip primary baselines and line spacing pass all 42 cases.","Worker-thread screenshot brackets do not establish equal DWM/browser compositor presentation times.","The next composed-control batch has source/template baselines and NumberBox expression core; its five Scene controls are not implemented or accepted by this report."],
    "boundary":["Material ROI now excludes glyphs and separators; old ROI numbers are not directly comparable.","Matching resolved SDK probes, not a claim of Store Gallery distribution or whole-surface pixel equality.","Current repository fingerprints are recorded separately from immutable tested WASM hashes; other collection work shares this checkout."],
    "repositoryAtReportTime":[{"path":p,"sha256":sha(p)} for p in sources],
}
save("references/validation/overlay-refinement.json",report)
save("references/popup-corner-materials-native.json",read("out/overlay-controls-native/popup-corner-materials.json"))
save("references/overlay-controls-metrics.json",native)
save("references/overlay-desktop-acrylic-defaults.json",read("out/overlay-controls-native/desktop-acrylic-defaults.json"))
for path in ["references/stage-7.json","references/validation/overlay-controls-validation.json"]:
    prior=read(path)
    prior["refinement"]={"report":"references/validation/overlay-refinement.json","acceptedPixelEquality":False,"latestTargetedBrowser":report["latestTargeted"]["stats"],"latestFullBrowser":report["latestFull"]["stats"],"latestFullBoundary":"Before SVG upload fix; one unhandled GPU error is retained in the linked report.","historicalFullBrowser":report["browser"]["stats"],"rust":report["rust"]["passed"],"nativeScenes":len(native["rows"])}
    save(path,prior)
print(json.dumps({"rust":report["rust"]["passed"],"latestTargeted":latest_targeted["stats"],"fullBeforeSvgFix":final_full["stats"],"nativeScenes":len(native["rows"]),"widthDifferences":len(report["fontMetrics"]["widthDifferences"])}))
