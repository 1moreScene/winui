param([switch]$Details)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$build=Join-Path $root 'out/compact-controls-probe-bin'
$output=Join-Path $root 'out/compact-controls-native'
if($Details){$build=Join-Path $root 'out/compact-details-probe-bin';$output=Join-Path $root 'out/compact-details-native'}
& python -X utf8 (Join-Path $root 'tools/extract-compact-controls.py')
if($LASTEXITCODE -ne 0){throw 'Compact control extraction failed'}
& dotnet build (Join-Path $root 'tools/native-navigation/NavigationProbe.csproj') -c Release -p:Platform=x64 -o $build --nologo -v:q
if($LASTEXITCODE -ne 0){throw 'Compact control probe build failed'}
New-Item -ItemType Directory -Path $output -Force | Out-Null
$started=[DateTime]::UtcNow
$mode=if($Details){'--compact-details'}else{'--compact-controls'}
$process=Start-Process -FilePath (Join-Path $build 'NavigationProbe.exe') -ArgumentList @(('"{0}"' -f $output),$mode) -WindowStyle Hidden -PassThru
try {
 while($true){
  $errorFile=Join-Path $output 'compact-controls-error.txt'
  $complete=Join-Path $output 'compact-controls-complete.json'
  if((Test-Path -LiteralPath $errorFile) -and (Get-Item -LiteralPath $errorFile).LastWriteTimeUtc -ge $started){throw (Get-Content -LiteralPath $errorFile -Raw)}
  if((Test-Path -LiteralPath $complete) -and (Get-Item -LiteralPath $complete).LastWriteTimeUtc -ge $started){break}
  if($process.HasExited){throw 'Compact control probe exited before completion'}
  if(([DateTime]::UtcNow-$started).TotalSeconds -gt 150){throw 'Compact control probe timed out'}
  Start-Sleep -Milliseconds 200
 }
 if(!$Details){foreach($name in @('compact-controls-palettes.json','compact-controls-metrics.json')){Copy-Item -LiteralPath (Join-Path $output $name) -Destination (Join-Path $root ('references/'+$name))}}
 & python -X utf8 (Join-Path $root 'tools/extract-compact-controls.py')
 if($LASTEXITCODE -ne 0){throw 'Compact control extraction failed'}
 Write-Output "Compact control probe complete: $output"
}finally{if(!$process.HasExited){Stop-Process -Id $process.Id}}
