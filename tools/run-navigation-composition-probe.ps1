param([switch]$SkipBuild)
$ErrorActionPreference='Stop'
$repo=Split-Path $PSScriptRoot -Parent
$binary=Join-Path $repo 'out/navigation-composition-probe-bin'
$output=Join-Path $repo 'out/navigation-composition-native'
if(!$SkipBuild){
 & dotnet build (Join-Path $PSScriptRoot 'native-navigation-composition/NavigationCompositionProbe.csproj') -c Release -p:Platform=x64 -o $binary --nologo -v:q
 if($LASTEXITCODE -ne 0){throw 'Navigation composition probe build failed'}
}
New-Item -ItemType Directory -Path $output -Force | Out-Null
$started=[DateTime]::UtcNow
$process=Start-Process -FilePath (Join-Path $binary 'NavigationCompositionProbe.exe') -ArgumentList ('"'+$output+'"') -WindowStyle Hidden -PassThru
try{
 while($true){
  $errorFile=Join-Path $output 'error.txt'
  if((Test-Path -LiteralPath $errorFile) -and (Get-Item -LiteralPath $errorFile).LastWriteTimeUtc -ge $started){throw(Get-Content -LiteralPath $errorFile -Raw)}
  $result=Join-Path $output 'results.json'
  if((Test-Path -LiteralPath $result) -and (Get-Item -LiteralPath $result).LastWriteTimeUtc -ge $started){break}
  if($process.HasExited){throw 'Navigation composition probe exited without results'}
  if(([DateTime]::UtcNow-$started).TotalSeconds -gt 150){throw 'Navigation composition probe timed out'}
  Start-Sleep -Milliseconds 150
 }
 Copy-Item -LiteralPath $result -Destination (Join-Path $repo 'references/navigation-composition-native.json')
 Write-Output "Navigation composition probe complete: $output"
}finally{if(!$process.HasExited){Stop-Process -Id $process.Id}}
