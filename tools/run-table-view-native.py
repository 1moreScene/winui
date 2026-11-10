"""Compile and run the instrumented community SampleApp without desktop automation."""
from pathlib import Path
import hashlib
import json
import os
import subprocess
import sys
import time
import argparse

parser=argparse.ArgumentParser()
parser.add_argument("--performance",action="store_true")
args=parser.parse_args()

ROOT=Path(__file__).resolve().parents[1]
subprocess.run([sys.executable,"-X","utf8",str(ROOT/"tools/prepare-table-view-native.py")],cwd=ROOT,check=True)
vswhere=Path(os.environ["ProgramFiles(x86)"])/"Microsoft Visual Studio/Installer/vswhere.exe"
msbuild=subprocess.check_output([str(vswhere),"-products","*","-latest","-find",r"MSBuild\**\Bin\MSBuild.exe"],text=True).strip().splitlines()[0]
binary=ROOT/"out/table-view-native-bin"
output=ROOT/("out/table-view-native-performance" if args.performance else "out/table-view-native")
project=ROOT/"out/table-view-native-source/samples/WinUI.TableView.SampleApp/WinUI.TableView.SampleApp.csproj"
subprocess.run([msbuild,str(project),"/restore","/p:Configuration=Debug","/p:Platform=x64","/p:RuntimeIdentifiers=win-x64","/p:RuntimeIdentifier=win-x64","/p:SelfContained=false","/p:WindowsPackageType=None","/p:WindowsAppSDKSelfContained=true","/p:EnableMsixTooling=false","/p:NuGetAudit=false",f"/p:RestoreSources={Path.home()}/.nuget/packages",f"/p:OutputPath={binary}/","/nologo","/v:quiet","/clp:ErrorsOnly"],cwd=ROOT,check=True)
output.mkdir(parents=True,exist_ok=True)
started=time.time()
env={**os.environ,"WINUI_TABLEVIEW_CAPTURE_DIR":str(output)}
if args.performance:env["WINUI_TABLEVIEW_PERFORMANCE_FIXTURE"]=str(ROOT/"out/table-view-120/fixtures.json")
startup=subprocess.STARTUPINFO();startup.dwFlags|=subprocess.STARTF_USESHOWWINDOW;startup.wShowWindow=0
process=subprocess.Popen([str(binary/"WinUI.TableView.SampleApp.exe")],cwd=binary,env=env,startupinfo=startup)
while True:
    for name in ["error.txt","unhandled.txt"]:
        path=output/name
        if path.exists() and path.stat().st_mtime>=started: raise RuntimeError(path.read_text(encoding="utf-8"))
    complete=output/"complete.json"
    if complete.exists() and complete.stat().st_mtime>=started: break
    if process.poll() is not None: raise RuntimeError("SampleApp exited before capture completion")
    if time.time()-started>150: raise TimeoutError("SampleApp capture timed out")
    time.sleep(.2)
record={"startedAtUnix":started,"completedAtUnix":time.time(),"communityCommit":"665fea52b8ad47a64187d0f202d5281b074f616f","sdk":"Microsoft.WindowsAppSDK/1.6.250108002","kind":"Local source-built instrumented SampleApp, unpackaged/self-contained WinUI; not Store","binaryHashes":{name:hashlib.sha256((binary/name).read_bytes()).hexdigest() for name in ["WinUI.TableView.SampleApp.exe","WinUI.TableView.SampleApp.dll","WinUI.TableView.dll","Microsoft.UI.Xaml.dll"] if (binary/name).exists()},"instrumentation":["MainPage capture entry","Windows-only target and cached compilation runtime","Explicit nested library resource URI for unpackaged filter UserControl"],"fixtureParameters":{"language":"English source resw values, applied through original mutable localized-string properties","lightAccent":"#0067C0","darkAccent":"#4CC2FF","sizeDip":[800,320],"dpr":1.25},"boundaries":["RTB static template captures","Own-client PrintWindow frames with actual sample times","Programmatic control actions; no computer use, OS input injection, or physical-input parity claim"]}
if args.performance:
    record["fixtureSha256"]=hashlib.sha256((ROOT/"out/table-view-120/fixtures.json").read_bytes()).hexdigest()
    record["fixtureParameters"]={"language":"English source resw", "accent":"#0067C0", "background":"#F3F3F3", "tables":[{key:value for key,value in spec.items() if key not in ["items","columns"]} | {"rows":len(spec["items"]),"columns":len(spec["columns"])} for spec in json.loads((ROOT/"out/table-view-120/fixtures.json").read_text(encoding="utf-8"))]}
for path in [output/"run.json",ROOT/("references/table-view-native-performance-run.json" if args.performance else "references/table-view-native-run.json")]:path.write_text(json.dumps(record,indent=2)+"\n",encoding="utf-8")
print(f"Native SampleApp capture completed: {output}")
