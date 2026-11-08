$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$build=Join-Path $root 'out/overlays-probe-bin'
$output=Join-Path $root 'out/overlays-native'
& dotnet build (Join-Path $root 'tools/native-navigation/NavigationProbe.csproj') -c Release -p:Platform=x64 -o $build --nologo -v:q
if($LASTEXITCODE -ne 0){throw 'Overlay probe build failed'}
New-Item -ItemType Directory -Path $output -Force | Out-Null
$started=[DateTime]::UtcNow
$process=Start-Process -FilePath (Join-Path $build 'NavigationProbe.exe') -ArgumentList @(('"{0}"' -f $output),'--overlays') -WindowStyle Hidden -PassThru
try {
 while($true) {
  $errorFile=Join-Path $output 'overlays-error.txt'
  $complete=Join-Path $output 'overlays-complete.json'
  if((Test-Path -LiteralPath $errorFile) -and (Get-Item -LiteralPath $errorFile).LastWriteTimeUtc -ge $started){throw (Get-Content -LiteralPath $errorFile -Raw)}
  if((Test-Path -LiteralPath $complete) -and (Get-Item -LiteralPath $complete).LastWriteTimeUtc -ge $started){break}
  if($process.HasExited){throw 'Overlay probe exited before completion'}
  if(([DateTime]::UtcNow-$started).TotalSeconds -gt 90){throw 'Overlay probe timed out'}
  Start-Sleep -Milliseconds 200
 }
 Copy-Item -LiteralPath (Join-Path $output 'overlay-palettes.json') -Destination (Join-Path $root 'references/overlay-palettes.json')
 Copy-Item -LiteralPath (Join-Path $output 'overlay-metrics.json') -Destination (Join-Path $root 'references/overlay-metrics.json')
 & python -X utf8 (Join-Path $root 'tools/extract-overlays.py')
 if($LASTEXITCODE -ne 0){throw 'Overlay extraction failed'}
 Write-Output "Overlay probe complete: $output"
} finally {if(!$process.HasExited){Stop-Process -Id $process.Id}}
