$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$build=Join-Path $root 'out/text-coverage-native-bin'
$output=Join-Path $root 'out/overlay-text-native'
& dotnet build (Join-Path $root 'tools/native-navigation/NavigationProbe.csproj') -c Release -p:Platform=x64 -o $build --nologo -v:q
if($LASTEXITCODE -ne 0){throw 'Text coverage probe build failed'}
New-Item -ItemType Directory -Path $output -Force | Out-Null
$started=[DateTime]::UtcNow
$process=Start-Process -FilePath (Join-Path $build 'NavigationProbe.exe') -ArgumentList @(('"{0}"' -f $output),'--text-coverage') -WindowStyle Hidden -PassThru
try {
 while($true){
  $failure=Join-Path $output 'text-coverage-error.txt';$complete=Join-Path $output 'text-coverage-complete.json'
  if((Test-Path -LiteralPath $failure) -and (Get-Item -LiteralPath $failure).LastWriteTimeUtc -ge $started){throw (Get-Content -LiteralPath $failure -Raw)}
  if((Test-Path -LiteralPath $complete) -and (Get-Item -LiteralPath $complete).LastWriteTimeUtc -ge $started){break}
  if($process.HasExited){throw 'Text coverage probe exited before completion'}
  if(([DateTime]::UtcNow-$started).TotalSeconds -gt 45){throw 'Text coverage probe timed out'}
  Start-Sleep -Milliseconds 200
 }
 Write-Output "Text coverage probe complete: $output"
}finally{if(!$process.HasExited){Stop-Process -Id $process.Id}}
