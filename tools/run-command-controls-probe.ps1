$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$build=Join-Path $root 'out/navigation-controls-probe-bin'
$output=Join-Path $root 'out/command-controls-native'
& dotnet build (Join-Path $root 'tools/native-navigation-controls/NavigationControlsProbe.csproj') -c Release -p:Platform=x64 -o $build --nologo -v:q
if($LASTEXITCODE -ne 0){throw 'Navigation controls probe build failed'}
New-Item -ItemType Directory -Path $output -Force | Out-Null
$started=[DateTime]::UtcNow
$probeArguments=@(('"{0}"' -f $output),'--commands-only')
$process=Start-Process -FilePath (Join-Path $build 'NavigationControlsProbe.exe') -ArgumentList $probeArguments -WindowStyle Hidden -PassThru
try{
 while($true){
  $failure=Join-Path $output 'error.txt';$done=Join-Path $output 'complete.json'
  if((Test-Path -LiteralPath $failure) -and (Get-Item -LiteralPath $failure).LastWriteTimeUtc -ge $started){throw(Get-Content -LiteralPath $failure -Raw)}
  if((Test-Path -LiteralPath $done) -and (Get-Item -LiteralPath $done).LastWriteTimeUtc -ge $started){break}
  if($process.HasExited){throw 'Navigation probe exited before completion'}
  if(([DateTime]::UtcNow-$started).TotalSeconds -gt 180){throw 'Navigation probe timed out'}
  Start-Sleep -Milliseconds 150
 }
 Copy-Item -LiteralPath (Join-Path $output 'command-controls-palettes.json') -Destination (Join-Path $root 'references/command-controls-palettes.json')
 Copy-Item -LiteralPath (Join-Path $output 'command-controls-metrics.json') -Destination (Join-Path $root 'references/command-controls-metrics.json')
 Write-Output "Command controls probe complete: $output"
}finally{if(!$process.HasExited){Stop-Process -Id $process.Id}}
