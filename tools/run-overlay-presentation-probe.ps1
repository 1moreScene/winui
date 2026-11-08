$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$build=Join-Path $root 'out/overlay-presentation-native-bin'
$output=Join-Path $root 'out/overlay-presentation-native'
& dotnet build (Join-Path $root 'tools/native-navigation/NavigationProbe.csproj') -c Release -p:Platform=x64 -o $build --nologo -v:q
if($LASTEXITCODE -ne 0){throw 'Overlay probe build failed'}
New-Item -ItemType Directory -Path $output -Force | Out-Null
$started=[DateTime]::UtcNow
$process=Start-Process -FilePath (Join-Path $build 'NavigationProbe.exe') -ArgumentList @(('"{0}"' -f $output),'--overlay-presentation') -WindowStyle Hidden -PassThru
try {
 while($true) {
  $errorFile=Join-Path $output 'presentation-error.txt'
  $complete=Join-Path $output 'presentation-complete.json'
  if((Test-Path -LiteralPath $errorFile) -and (Get-Item -LiteralPath $errorFile).LastWriteTimeUtc -ge $started){throw (Get-Content -LiteralPath $errorFile -Raw)}
  if((Test-Path -LiteralPath $complete) -and (Get-Item -LiteralPath $complete).LastWriteTimeUtc -ge $started){break}
  if($process.HasExited){throw 'Overlay probe exited before completion'}
  if(([DateTime]::UtcNow-$started).TotalSeconds -gt 90){throw 'Overlay probe timed out'}
  Start-Sleep -Milliseconds 200
 }
 Write-Output "Overlay presentation probe complete: $output"
} finally {if(!$process.HasExited){Stop-Process -Id $process.Id}}
