"""Verify retained community/WinUI inputs and redistributed license bytes."""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]


def read_json(relative):
    return json.loads((ROOT / relative).read_text(encoding="utf-8-sig"))


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


community = read_json("references/table-view-source.json")
for relative, expected in community["files"].items():
    assert sha(ROOT / "references/table-view" / relative) == expected, relative
for relative in ["third_party/WinUI.TableView/LICENSE.md", "gallery/public/licenses/WinUI.TableView/LICENSE.md"]:
    assert sha(ROOT / relative) == community["licenseSha256"], relative
winui = read_json("references/table-view-winui-1.6/source.json")
for entry in winui["files"]:
    path = ROOT / entry["path"].replace("\\", "/")
    data = path.read_bytes()
    assert sha(path) == entry["sha256"], str(path)
    assert hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest() == entry["gitBlob"], str(path)
contract = read_json("references/table-view-runtime.json")
assert contract["communityCommit"] == community["commit"]
assert read_json("references/table-view-template.json")["commit"] == community["commit"]
metrics = read_json("references/table-view-native-animation-metrics.json")
assert contract["entrance"]["defaults"] == metrics["EntranceThemeTransition-defaults"]
assert contract["entrance"]["translation"] in metrics["EnterPage-Primary"]
assert contract["entrance"]["opacity"] in metrics["EnterPage-Primary"]
print(f"Verified {len(community['files'])} community inputs, {len(winui['files'])} matching WinUI inputs, runtime contract and exact MIT license bytes.")

grouping = read_json("references/table-view-grouping-release.json")
for relative, expected in grouping["files"].items():
    assert sha(ROOT / "references/table-view-1.5.1" / relative) == expected, relative
for relative in ["third_party/WinUI.TableView/v1.5.1/LICENSE.md", "gallery/public/licenses/WinUI.TableView/v1.5.1/LICENSE.md"]:
    assert sha(ROOT / relative) == grouping["licenseSha256"], relative
print(f"Verified {len(grouping['files'])} v1.5.1 grouping supplement files and release MIT copies.")

group_runtime = read_json("references/table-view-grouping-runtime.json")
assert group_runtime["commit"] == grouping["commit"]
assert group_runtime["groupIndentSize"] == 24
assert group_runtime["themes"]["Light"]["TableViewGroupHeaderRowMinHeight"] == 36
assert group_runtime["expandIcon"]["fontSize"] == 12
