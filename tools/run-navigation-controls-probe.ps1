param([switch]$BaselineOnly,[switch]$RefinementOnly,[switch]$ButtonsOnly)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$build=Join-Path $root 'out/navigation-controls-probe-bin'
$output=Join-Path $root $(if($ButtonsOnly){'out/navigation-paging-native'}elseif($RefinementOnly){'out/navigation-controls-refinement-native'}elseif($BaselineOnly){'out/navigation-controls-baseline'}else{'out/navigation-controls-native'})
& dotnet build (Join-Path $root 'tools/native-navigation-controls/NavigationControlsProbe.csproj') -c Release -p:Platform=x64 -o $build --nologo -v:q
if($LASTEXITCODE -ne 0){throw 'Navigation controls probe build failed'}
New-Item -ItemType Directory -Path $output -Force | Out-Null
$started=[DateTime]::UtcNow
$probeArguments=@(('"{0}"' -f $output));if($BaselineOnly){$probeArguments+='--baseline-only'};if($RefinementOnly){$probeArguments+='--refinement-only'};if($ButtonsOnly){$probeArguments+='--buttons-only'}
$process=Start-Process -FilePath (Join-Path $build 'NavigationControlsProbe.exe') -ArgumentList $probeArguments -WindowStyle Hidden -PassThru
try{
 while($true){
  $failure=Join-Path $output 'error.txt';$done=Join-Path $output 'complete.json'
  if((Test-Path -LiteralPath $failure) -and (Get-Item -LiteralPath $failure).LastWriteTimeUtc -ge $started){throw(Get-Content -LiteralPath $failure -Raw)}
  if((Test-Path -LiteralPath $done) -and (Get-Item -LiteralPath $done).LastWriteTimeUtc -ge $started){break}
  if($process.HasExited){throw 'Navigation probe exited before completion'}
  if(([DateTime]::UtcNow-$started).TotalSeconds -gt 110){throw 'Navigation probe timed out'}
  Start-Sleep -Milliseconds 150
 }
 Copy-Item -LiteralPath (Join-Path $output 'navigation-controls-animation-metrics.json') -Destination (Join-Path $root 'references/navigation-controls-animation-metrics.json')
 if($ButtonsOnly){Copy-Item -LiteralPath (Join-Path $output 'navigation-controls-paging-buttons.json') -Destination (Join-Path $root 'references/navigation-controls-paging-buttons.json');Write-Output "Paging button probe complete: $output";return}
 if($RefinementOnly){Copy-Item -LiteralPath (Join-Path $output 'navigation-controls-close-metrics.json') -Destination (Join-Path $root 'references/navigation-controls-close-metrics.json');Write-Output "Close button probe complete: $output";return}
 Copy-Item -LiteralPath (Join-Path $output 'system-colors.json') -Destination (Join-Path $root 'references/navigation-controls-system-colors.json')
 if($BaselineOnly){Copy-Item -LiteralPath (Join-Path $output 'navigation-controls-metrics.json') -Destination (Join-Path $root 'references/navigation-controls-text-metrics.json')}
 if(!$BaselineOnly){
 Copy-Item -LiteralPath (Join-Path $output 'navigation-controls-palettes.json') -Destination (Join-Path $root 'references/navigation-controls-palettes.json')
 Copy-Item -LiteralPath (Join-Path $output 'navigation-controls-metrics.json') -Destination (Join-Path $root 'references/navigation-controls-metrics.json')
 }
 Write-Output "Navigation controls probe complete: $output"
}finally{if(!$process.HasExited){Stop-Process -Id $process.Id}}
