"""Run the tagged community SampleApp with its published NuGet control binary."""
from pathlib import Path
import json,os,subprocess,time,shutil,hashlib
ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'out/table-view-release-source'
target=ROOT/'out/table-view-grouping-native-source'
shutil.copytree(source,target,dirs_exist_ok=True)
(target/'global.json').write_text(json.dumps({'sdk':{'version':'10.0.403','rollForward':'latestPatch'}}),encoding='utf-8')
(target/'Directory.Build.targets').write_text('<Project><ItemGroup><KnownFrameworkReference Update="Microsoft.WindowsDesktop.App;Microsoft.WindowsDesktop.App.WPF;Microsoft.WindowsDesktop.App.WindowsForms"><LatestRuntimeFrameworkVersion>10.0.9</LatestRuntimeFrameworkVersion><DefaultRuntimeFrameworkVersion>10.0.9</DefaultRuntimeFrameworkVersion></KnownFrameworkReference></ItemGroup></Project>',encoding='utf-8')
sample=target/'samples/WinUI.TableView.SampleApp'
main=sample/'MainWindow.xaml.cs';text=main.read_text(encoding='utf-8-sig');needle='private async void RootGridLoaded(object sender, RoutedEventArgs e)\n    {'
assert needle in text
main.write_text(text.replace(needle,needle+'\n        if (Environment.GetEnvironmentVariable("WINUI_TABLEVIEW_GROUPING_CAPTURE") is not null) { await GroupingCapture.Run(this); return; }'),encoding='utf-8')
(sample/'GroupingCapture.cs').write_bytes((ROOT/'tools/native-table-view/GroupingCapture.cs').read_bytes())
vswhere=Path(os.environ['ProgramFiles(x86)'])/'Microsoft Visual Studio/Installer/vswhere.exe'
msbuild=subprocess.check_output([str(vswhere),'-products','*','-latest','-find',r'MSBuild\**\Bin\MSBuild.exe'],text=True).strip().splitlines()[0]
binary=ROOT/'out/table-view-grouping-native-bin';output=ROOT/'out/table-view-grouping-native';output.mkdir(parents=True,exist_ok=True)
args=[msbuild,str(sample/'WinUI.TableView.SampleApp.csproj'),'/restore','/p:Configuration=Debug','/p:Platform=x64','/p:RuntimeIdentifiers=win-x64','/p:RuntimeIdentifier=win-x64','/p:SelfContained=false','/p:WindowsPackageType=None','/p:EnableMsixTooling=false','/p:PublishAot=false','/p:UseTableViewNuGet=true','/p:TableViewPackageVersion=1.5.1','/p:NuGetAudit=false',f'/p:OutputPath={binary}/','/nologo','/v:quiet','/clp:ErrorsOnly']
subprocess.run(args,cwd=ROOT,check=True)
started=time.time();env={**os.environ,'WINUI_TABLEVIEW_GROUPING_CAPTURE':str(output)}
startup=subprocess.STARTUPINFO();startup.dwFlags|=subprocess.STARTF_USESHOWWINDOW;startup.wShowWindow=0
process=subprocess.Popen([str(binary/'WinUI.TableView.SampleApp.exe')],cwd=binary,env=env,startupinfo=startup)
while True:
 error=output/'error.txt';complete=output/'complete.json'
 if error.exists() and error.stat().st_mtime>=started:raise RuntimeError(error.read_text(encoding='utf-8'))
 if complete.exists() and complete.stat().st_mtime>=started:break
 if process.poll() is not None:raise RuntimeError('Release SampleApp exited before completing captures')
 if time.time()-started>180:raise TimeoutError('Release grouping capture timed out')
 time.sleep(.2)
record=json.loads((ROOT/'references/table-view-grouping-release.json').read_text(encoding='utf-8'))
record.update({'nativeRun':str(output.relative_to(ROOT)),'nativeResultSha256':hashlib.sha256((output/'native.json').read_bytes()).hexdigest(),'instrumentation':['SampleApp capture entry','Public release GroupDescriptions and private source Group command through reflection; no control DLL changes'],'computerUse':False})
(ROOT/'references/table-view-grouping-release.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
print('Captured release grouping reference:',output)
