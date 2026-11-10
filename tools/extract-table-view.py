"""Retain the user-selected community baseline and its verbatim license."""
from pathlib import Path
import argparse
import hashlib
import json
import re
import shutil
import subprocess
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
COMMIT = "665fea52b8ad47a64187d0f202d5281b074f616f"
parser = argparse.ArgumentParser()
parser.add_argument("--source", type=Path, default=Path(r"C:\Users\weixiaoxiao\source\repos\WinUI.TableView"))
args = parser.parse_args()
source = args.source.resolve()
commit = subprocess.check_output(["git", "-C", str(source), "rev-parse", "HEAD"], text=True).strip()
if commit != COMMIT:
    raise SystemExit(f"Expected pinned TableView commit {COMMIT}, found {commit}; review the baseline explicitly.")
files = sorted({
    "src/WinUI.TableView.csproj", "src/TableView.cs", "src/TableView.Properties.cs",
    "src/TableView.Events.cs", "src/TableView.Paste.cs", "src/TableViewCell.cs",
    "src/TableViewRow.cs", "src/TableViewColumnHeader.cs", "src/TableViewHeaderRow.cs",
    "src/ItemsSource/CollectionView.cs", "src/ColumnFilterHandler.cs", "src/Controls/TableViewFilterItemsControl.xaml", "src/Controls/TableViewFilterItemsControl.xaml.cs",
    *[str(path.relative_to(source)).replace("\\", "/") for path in (source / "src/Columns").glob("*.cs")],
    *[str(path.relative_to(source)).replace("\\", "/") for path in (source / "src/Themes").glob("*.xaml")],
    *[str(path.relative_to(source)).replace("\\", "/") for path in (source / "src").rglob("*.cs") if not {"bin", "obj"}.intersection(path.relative_to(source).parts)],
    *[str(path.relative_to(source)).replace("\\", "/") for path in (source / "src").rglob("*.resw") if not {"bin", "obj"}.intersection(path.relative_to(source).parts)],
})
for name in files:
    target = ROOT / "references/table-view" / name
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source / name, target)
for relative in ["third_party/WinUI.TableView/LICENSE.md", "gallery/public/licenses/WinUI.TableView/LICENSE.md"]:
    target = ROOT / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source / "LICENSE.md", target)
project = ET.parse(source / "src/WinUI.TableView.csproj")
packages = {p.attrib["Include"]: p.attrib.get("Version") for p in project.findall(".//PackageReference")}
assets = source / "src/obj/project.assets.json"
resolved = None
if assets.exists():
    data = json.loads(assets.read_text(encoding="utf-8-sig"))
    resolved = {"sha256": hashlib.sha256(assets.read_bytes()).hexdigest(), "windowsAppSdk": [key for key in data.get("libraries", {}) if key.startswith("Microsoft.WindowsAppSDK/")]}
record = {
    "repository": "https://github.com/w-ahmad/WinUI.TableView", "localPath": str(source),
    "commit": commit, "date": "2026-11-09", "license": "third_party/WinUI.TableView/LICENSE.md",
    "licenseSha256": hashlib.sha256((source / "LICENSE.md").read_bytes()).hexdigest(),
    "sourceWorkingTree": subprocess.check_output(["git", "-C", str(source), "status", "--short"], text=True).splitlines(),
    "declaredPackages": packages, "resolvedAssets": resolved,
    "files": {name: hashlib.sha256((source / name).read_bytes()).hexdigest() for name in files},
    "scope": "Community implementation only; official Windows App SDK TableView remains excluded.",
    "dependencyDifference": "Community project declares WindowsAppSDK 1.6.250108002. Reused SDK controls retain this project's independent pinned WinUI baseline; native pixel parity has not been accepted.",
}
(ROOT / "references/table-view-source.json").write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
def local(tag):
    return tag.rsplit("}", 1)[-1]

def node(element):
    return {"type": local(element.tag), "attributes": {local(k): v for k, v in element.attrib.items()}, "text": (element.text or "").strip(), "children": [node(child) for child in element]}

properties = (source / "src/TableView.Properties.cs").read_text(encoding="utf-8-sig")
defaults = dict(re.findall(r"public static readonly (?:new )?DependencyProperty (\w+)Property = .*?new PropertyMetadata\(([^,;)]+)", properties))
templates = {path.name: node(ET.parse(path).getroot()) for path in sorted((source / "src/Themes").glob("*.xaml"))}
contract = {"commit": commit, "defaults": defaults, "templates": templates,
    "filterItems": node(ET.parse(source / "src/Controls/TableViewFilterItemsControl.xaml").getroot()),
    "windowsRowPresenter": "TableViewRow.xaml uses native Microsoft.UI.Xaml.Controls.Primitives.ListViewItemPresenter via a subclass overriding Arrange only; not the Uno not_win storyboard branch.",
    "focusException": "User requires suppressing black focus/current-cell outlines. This deliberate exception is excluded from visual parity comparisons."}
(ROOT / "references/table-view-template.json").write_text(json.dumps(contract, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
# A small executable contract, separate from the complete source/template IR.
# Rust consumes these resources instead of borrowing another WinUI SDK version.
resources = ET.parse(source / "src/Themes/Resources.xaml").getroot()
themes = {}
for dictionary in resources.findall("./{*}ResourceDictionary.ThemeDictionaries/{*}ResourceDictionary"):
    theme = dictionary.attrib["{http://schemas.microsoft.com/winfx/2006/xaml}Key"]
    values = {}
    for child in dictionary:
        key = child.attrib.get("{http://schemas.microsoft.com/winfx/2006/xaml}Key")
        if not key: continue
        kind = local(child.tag)
        if kind == "StaticResource": values[key] = {"resource": child.attrib["ResourceKey"]}
        elif kind == "SolidColorBrush":
            color=child.attrib.get("Color","Transparent")
            if color.startswith(("{ThemeResource ","{StaticResource ")):
                color_key=color.split(" ",1)[1][:-1]
                values[key]={"resource": "SystemControlHighlightAccentBrush" if color_key=="SystemAccentColor" else color_key+"Brush"}
            elif color=="Transparent": values[key]={"color":"#00000000"}
            else: raise SystemExit(f"Unmapped TableView solid brush: {key}={color}")
            if "Opacity" in child.attrib: values[key]["opacity"]=float(child.attrib["Opacity"])
        elif kind == "Double": values[key] = float(child.text)
        elif kind in ("String", "Thickness", "CornerRadius"): values[key] = child.text
    themes[theme] = values
presenter = ROOT / "references/table-view-winui-1.6/ListViewBaseItemPresenter_Partial.cpp"
if not presenter.exists(): raise SystemExit("Fetch the matching WinUI 1.6.4 presenter sources first")
indicator = presenter.read_text(encoding="utf-8-sig").split("ListViewBaseItemPresenter::VisitAnimationCommand(_In_ ListViewBaseItemAnimationCommand_SelectionIndicatorVisibility* pCommand)", 1)[1]
opacity = int(re.search(r"opacityAnimationDuration = (\d+)", indicator)[1])
scale = int(re.search(r"scaleAnimationDuration = (\d+)", indicator)[1])
assert "easingScale.cp2.X = 0.167f" in indicator and "easingScale.cp3.Y = 1.0f" in indicator
runtime = {"communityCommit": COMMIT, "winuiSource": "references/table-view-winui-1.6/source.json", "themes": themes,
    "indicator": {"opacityMs": opacity, "scaleMs": scale, "fromZeroCurve": [0.167, 0.167, 0, 1], "fromNonzeroCurve": [0, 0, 0, 1]},
    "cell": {"selectionBorderThickness": float(themes["Light"]["TableViewCellSelectionBorderThickness"]),
        "contentMargin": float(re.search(r"Margin = new Thickness\((\d+), 0", (source / "src/Columns/TableViewTextColumn.cs").read_text(encoding="utf-8-sig"))[1])}}
native = json.loads((ROOT / "references/table-view-native-animation-metrics.json").read_text(encoding="utf-8"))
entrance = native["EnterPage-Primary"]
runtime["entrance"] = {"defaults": native["EntranceThemeTransition-defaults"],
    "translation": next(a for a in entrance if a["type"] == "Translation"),
    "opacity": next(a for a in entrance if a["type"] == "Opacity"),
    "source": "WinUI 1.6.4 LayoutTransition_partial.cpp EntranceThemeTransition::CreateStoryboardImpl -> TAS_ENTERPAGE; native OS timing query in the same SampleApp."}
behavior=(source / "src/TableView.cs").read_text(encoding="utf-8-sig")
runtime["dragSelection"]={"edgeThreshold":float(re.search(r"const double edgeThreshold = ([\d.]+)",behavior)[1]),
    "maxScrollSpeed":float(re.search(r"const double maxScrollSpeed = ([\d.]+)",behavior)[1]),
    "intervalMs":float(re.search(r"_autoScrollTimer = new DispatcherTimer \{ Interval = TimeSpan.FromMilliseconds\((\d+)\)",behavior)[1])}
# These missing common primitives come from the matching 1.6.4 source, rather
# than substituting a guessed color from the project's other SDK baseline.
common=ET.parse(ROOT / "references/table-view-winui-1.6/Common_themeresources_any.xaml").getroot()
runtime["dependencies"]={}
for theme,source_theme in [("Light","Light"),("Dark","Default")]:
    dictionary=next(n for n in common.iter() if local(n.tag)=="ResourceDictionary" and n.attrib.get("{http://schemas.microsoft.com/winfx/2006/xaml}Key")==source_theme)
    entries={n.attrib.get("{http://schemas.microsoft.com/winfx/2006/xaml}Key"):n for n in dictionary}
    palette={}
    for key in ["FocusStrokeColorOuterBrush","FocusStrokeColorInnerBrush","ControlStrongFillColorDisabledBrush"]:
        brush=entries[key];color_key=brush.attrib["Color"].split(" ",1)[1][:-1]
        value=entries[color_key].text.strip();assert value.startswith("#"),value
        if len(value)==9:value="#"+value[3:]+value[1:3]
        palette[key]={"kind":"solid","color":value,"opacity":float(brush.attrib.get("Opacity","1"))}
    runtime["dependencies"][theme]=palette
(ROOT / "references/table-view-runtime.json").write_text(json.dumps(runtime, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Retained {len(files)} pinned community source files and the original MIT license.")
