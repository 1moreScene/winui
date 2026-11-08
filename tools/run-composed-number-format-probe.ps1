$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$build=Join-Path $root 'out/composed-controls-probe-bin'
$output=Join-Path $root 'out/composed-controls-native'

& python -X utf8 (Join-Path $root 'tools/extract-composed-controls.py')
if($LASTEXITCODE -ne 0){throw 'Composed control extraction failed'}
& dotnet build (Join-Path $root 'tools/native-navigation/NavigationProbe.csproj') -c Release -p:Platform=x64 -o $build --nologo -v:q
if($LASTEXITCODE -ne 0){throw 'Composed control probe build failed'}
New-Item -ItemType Directory -Path $output -Force | Out-Null
$started=[DateTime]::UtcNow
$mode='--composed-format'
$process=Start-Process -FilePath (Join-Path $build 'NavigationProbe.exe') -ArgumentList @(('"{0}"' -f $output),$mode) -WindowStyle Hidden -PassThru
try {
 while($true){
  $errorFile=Join-Path $output 'composed-controls-error.txt'
  $complete=Join-Path $output 'composed-controls-complete.json'
  if((Test-Path -LiteralPath $errorFile) -and (Get-Item -LiteralPath $errorFile).LastWriteTimeUtc -ge $started){throw (Get-Content -LiteralPath $errorFile -Raw)}
  if((Test-Path -LiteralPath $complete) -and (Get-Item -LiteralPath $complete).LastWriteTimeUtc -ge $started){break}
  if($process.HasExited){throw 'Composed control probe exited before completion'}
  if(([DateTime]::UtcNow-$started).TotalSeconds -gt 150){throw 'Composed control probe timed out'}
  Start-Sleep -Milliseconds 200
 }
 Copy-Item -LiteralPath (Join-Path $output 'composed-number-format.json') -Destination (Join-Path $root 'references/composed-number-format.json')
 Write-Output "Composed control probe complete: $output"
}finally{if(!$process.HasExited){Stop-Process -Id $process.Id}}
