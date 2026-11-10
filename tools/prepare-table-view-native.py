"""Build an instrumented copy of the pinned SampleApp; never edit the reference repo."""
from pathlib import Path
import io
import json
import re
import subprocess
import zipfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r"C:\Users\weixiaoxiao\source\repos\WinUI.TableView")
COMMIT = "665fea52b8ad47a64187d0f202d5281b074f616f"
TARGET = ROOT / "out/table-view-native-source"
TARGET.mkdir(parents=True, exist_ok=True)
archive = subprocess.check_output(["git", "-C", str(SOURCE), "archive", "--format=zip", COMMIT])
with zipfile.ZipFile(io.BytesIO(archive)) as source:
    for entry in source.infolist():
        if entry.is_dir(): continue
        path=TARGET / entry.filename
        data=source.read(entry)
        if not path.exists() or path.read_bytes()!=data:
            path.parent.mkdir(parents=True,exist_ok=True)
            path.write_bytes(data)
(TARGET / "global.json").write_text(json.dumps({"sdk": {"version": "10.0.403", "rollForward": "latestPatch"}}), encoding="utf-8")
# Use only the installed Windows target, leaving the actual control code unchanged.
project = TARGET / "src/WinUI.TableView.csproj"
text = re.sub(r'<TargetFrameworks(?: Condition="[^"]*")?>.*?</TargetFrameworks>', '', project.read_text(encoding="utf-8-sig"), flags=re.S)
project.write_text(text.replace('<LangVersion>', '<TargetFramework>net10.0-windows10.0.19041.0</TargetFramework><LangVersion>', 1), encoding="utf-8")
# WinUI 1.6 build tasks need the cached WindowsDesktop runtime for compilation.
(TARGET / "Directory.Build.targets").write_text('<Project><ItemGroup><KnownFrameworkReference Update="Microsoft.WindowsDesktop.App;Microsoft.WindowsDesktop.App.WPF;Microsoft.WindowsDesktop.App.WindowsForms"><LatestRuntimeFrameworkVersion>10.0.9</LatestRuntimeFrameworkVersion><DefaultRuntimeFrameworkVersion>10.0.9</DefaultRuntimeFrameworkVersion></KnownFrameworkReference></ItemGroup></Project>', encoding="utf-8")
# The unpackaged instrumented host needs an explicit library resource root.
control = TARGET / "src/Controls/TableViewFilterItemsControl.xaml.cs"
text = control.read_text(encoding="utf-8-sig").replace('InitializeComponent();', 'Microsoft.UI.Xaml.Application.LoadComponent(this, new System.Uri("ms-appx:///WinUI.TableView/Controls/TableViewFilterItemsControl.xaml"), Microsoft.UI.Xaml.Controls.Primitives.ComponentResourceLocation.Nested);')
control.write_text(text, encoding="utf-8")
sample = TARGET / "samples/WinUI.TableView.SampleApp"
main = sample / "MainPage.xaml.cs"
text = main.read_text(encoding="utf-8-sig")
needle = "navigationView.SelectedItem = overViewNavItem;\n#endif"
assert needle in text
main.write_text(text.replace(needle, needle + "\n        if (Environment.GetEnvironmentVariable(\"WINUI_TABLEVIEW_CAPTURE_DIR\") is not null) await ParityCapture.Run();"), encoding="utf-8")
(sample / "ParityCapture.cs").write_bytes((ROOT / "tools/native-table-view/ParityCapture.cs").read_bytes())
(sample / "OwnWindowCapture.cs").write_bytes((ROOT / "tools/native-table-view/OwnWindowCapture.cs").read_bytes())
(sample / "AnimationMetrics.cs").write_bytes((ROOT / "tools/native-table-view/AnimationMetrics.cs").read_bytes())
(sample / "PerformanceCapture.cs").write_bytes((ROOT / "tools/native-table-view/PerformanceCapture.cs").read_bytes())
english={item.attrib["name"]: item.findtext("value") for item in ET.parse(SOURCE/"src/Strings/en-US/WinUI.TableView.resw").getroot().findall("data")}
binary=ROOT/"out/table-view-native-bin"
binary.mkdir(parents=True,exist_ok=True)
(binary/"table-view-english.json").write_text(json.dumps(english,ensure_ascii=False),encoding="utf-8")
print(sample / "WinUI.TableView.SampleApp.csproj")
