"""Normalize owned-HWND WGC captures; alignment never changes the time scale."""
import argparse
import hashlib
import json
import math
from datetime import datetime, timezone
from pathlib import Path

root = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(__doc__)
parser.add_argument("capture", type=Path)
parser.add_argument("--sdk-dll", type=Path, required=True)
args = parser.parse_args()
raw = args.capture.read_bytes()
(root / "references/validation/motion-spring-native-raw.json").write_bytes(raw)
data = json.loads(raw)
assert data["offscreen"] and not data["activated"]
cases = []
for case in data["cases"]:
    if case["reverse"]:
        continue
    z, period = case["damping"], case["period"]
    w = 1 / period
    wd = w * math.sqrt(1 - z * z)

    def value(t):
        return 1.5 - .5 * math.exp(-z * w * t) * (math.cos(wd * t) + z * w / wd * math.sin(wd * t))

    samples = [s for s in case["samples"] if 0 <= s["timeMs"] <= min(2500, case["elapsedMs"])]

    def errors(lag):
        return [value(max(0, s["timeMs"] - lag)) - s["scale"] for s in samples]

    lag = min(range(101), key=lambda lag: sum(e * e for e in errors(lag)))
    error = errors(lag)
    cases.append(dict(period=period, dampingRatio=z, pipelineAlignmentMs=lag,
                      rmsError=math.sqrt(sum(e * e for e in error) / len(error)),
                      maxError=max(map(abs, error)), batchCompletedMs=case["elapsedMs"],
                      samples=[dict(timeMs=max(0, s["timeMs"] - lag), scale=s["scale"]) for s in samples]))
sources = [dict(path=str(p.relative_to(root)).replace("\\", "/"), sha256=hashlib.sha256(p.read_bytes()).hexdigest())
           for p in sorted((root / "tools/native-spring-contract").glob("*")) if p.is_file()]
reverse = next(c for c in data["cases"] if c["reverse"])
result = dict(capturedAtUtc=datetime.fromtimestamp(args.capture.stat().st_mtime, timezone.utc).isoformat(),
              sdk=data["sdk"], sdkDllSha256=hashlib.sha256(args.sdk_dll.read_bytes()).hexdigest(),
              galleryAppOperated=False, target="Independent, nonactivated offscreen probe HWND only; WGC, no screen/other-window capture.",
              encoding="scaleX=0.5+blue/128; 8-bit channel quantization", rawSha256=hashlib.sha256(raw).hexdigest(),
              rawPath="references/validation/motion-spring-native-raw.json", sources=sources, cases=cases,
              depth=dict(samples=data["depth"], meaning="Blue later sibling stays in front of red Z=32 sibling in both Composition and XAML; default projection preserves collection order."),
              reversal=dict(period=reverse["period"], dampingRatio=reverse["damping"], reversedAtMs=reverse["reversedAt"],
                            initialVelocityType=reverse["initialVelocityType"], samples=reverse["samples"],
                            meaning="Native reversal briefly stays at its current scale before decreasing; default InitialVelocity resets to zero."),
              boundary="Constant alignment removes WGC/commit latency, not a time scale fit. Confirms trajectory, not exact native rest/completion detection.")
(root / "references/validation/motion-spring-native.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8", newline="\n")
print(json.dumps([dict(period=c["period"], damping=c["dampingRatio"], maxError=c["maxError"]) for c in cases]))
