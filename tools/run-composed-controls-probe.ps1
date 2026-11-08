$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$build=Join-Path $root 'out/composed-controls-probe-bin'
$output=Join-Path $root 'out/composed-controls-native'

& python -X utf8 (Join-Path $root 'tools/extract-composed-controls.py')
if($LASTEXITCODE -ne 0){throw 'Composed control extraction failed'}
$sourceFiles=@('Program.cs','ComposedControlsProbe.cs','CompactControlsProbe.cs','OverlayPresentationProbe.cs','EffectsProbe.cs')
$sourceHashes=@{}
foreach($name in $sourceFiles){$path=Join-Path $root ('tools/native-navigation/'+$name);$sourceHashes[$name]=(Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()}
& dotnet build (Join-Path $root 'tools/native-navigation/NavigationProbe.csproj') -c Release -p:Platform=x64 -o $build --nologo -v:q
if($LASTEXITCODE -ne 0){throw 'Composed control probe build failed'}
New-Item -ItemType Directory -Path $output -Force | Out-Null
$started=[DateTime]::UtcNow
$mode='--composed-controls'
$process=Start-Process -FilePath (Join-Path $build 'NavigationProbe.exe') -ArgumentList @(('"{0}"' -f $output),$mode) -WindowStyle Hidden -PassThru
try {
 while($true){
  $errorFile=Join-Path $output 'composed-controls-error.txt'
  $complete=Join-Path $output 'composed-controls-complete.json'
  if((Test-Path -LiteralPath $errorFile) -and (Get-Item -LiteralPath $errorFile).LastWriteTimeUtc -ge $started){throw (Get-Content -LiteralPath $errorFile -Raw)}
  if((Test-Path -LiteralPath $complete) -and (Get-Item -LiteralPath $complete).LastWriteTimeUtc -ge $started){break}
  if($process.HasExited){throw 'Composed control probe exited before completion'}
  if(([DateTime]::UtcNow-$started).TotalSeconds -gt 210){throw 'Composed control probe timed out'}
  Start-Sleep -Milliseconds 200
 }
 foreach($name in @('composed-controls-palettes.json','composed-controls-metrics.json','composed-controls-motion.json')){Copy-Item -LiteralPath (Join-Path $output $name) -Destination (Join-Path $root ('references/'+$name))}
 & python -X utf8 (Join-Path $root 'tools/extract-composed-controls.py')
 if($LASTEXITCODE -ne 0){throw 'Composed control extraction failed'}
 foreach($name in $sourceFiles){$path=Join-Path $root ('tools/native-navigation/'+$name);if($sourceHashes[$name] -ne (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()){throw ('Native probe source changed during capture: '+$name)}}
 $files=@{};foreach($name in @('NavigationProbe.exe','NavigationProbe.dll','Microsoft.UI.Xaml.dll')){$path=Join-Path $build $name;if(Test-Path -LiteralPath $path){$files[$name]=(Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()}}
 $record=@{startedAt=$started.ToString('o');completedAt=[DateTime]::UtcNow.ToString('o');sources=$sourceHashes;binaries=$files;sdk='Microsoft.WindowsAppSDK.WinUI/2.3.10-experimental';mode=$mode;os=[Environment]::OSVersion.VersionString}
 $record | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $output 'composed-controls-run.json') -Encoding utf8
 Copy-Item -LiteralPath (Join-Path $output 'composed-controls-run.json') -Destination (Join-Path $root 'references/composed-controls-run.json')
 Write-Output "Composed control probe complete: $output"
}finally{if(!$process.HasExited){Stop-Process -Id $process.Id}}
