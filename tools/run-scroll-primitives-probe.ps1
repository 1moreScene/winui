param([switch]$SkipBuild,[switch]$DefaultsOnly)
$ErrorActionPreference='Stop'
$repo=Split-Path $PSScriptRoot -Parent
$binary=Join-Path $repo 'out/scroll-primitives-probe-bin'
$output=Join-Path $repo 'out/scroll-primitives-native'
if(!$SkipBuild){
 & dotnet build (Join-Path $PSScriptRoot 'native-scroll-primitives/ScrollPrimitivesProbe.csproj') -c Release -p:Platform=x64 -o $binary --nologo -v:q
 if($LASTEXITCODE -ne 0){throw 'Scroll primitives native probe build failed'}
}
New-Item -ItemType Directory -Path $output -Force | Out-Null
$started=[DateTime]::UtcNow
$arguments=@(('"'+$output+'"'));if($DefaultsOnly){$arguments+='--defaults-only'}
$process=Start-Process -FilePath (Join-Path $binary 'ScrollPrimitivesProbe.exe') -ArgumentList $arguments -WindowStyle Hidden -PassThru
try{
 while($true){
  $errorFile=Join-Path $output 'error.txt'
  if((Test-Path -LiteralPath $errorFile) -and (Get-Item -LiteralPath $errorFile).LastWriteTimeUtc -ge $started){throw(Get-Content -LiteralPath $errorFile -Raw)}
  $result=Join-Path $output $(if($DefaultsOnly){'defaults.json'}else{'results.json'})
  if((Test-Path -LiteralPath $result) -and (Get-Item -LiteralPath $result).LastWriteTimeUtc -ge $started){break}
  if($process.HasExited){throw 'Native probe exited before producing results'}
  if(([DateTime]::UtcNow-$started).TotalSeconds -gt 60){throw 'Native probe timed out'}
  Start-Sleep -Milliseconds 150
 }
 if(!$DefaultsOnly){Copy-Item -LiteralPath $result -Destination (Join-Path $repo 'references/scroll-primitives-native.json')}
 Copy-Item -LiteralPath (Join-Path $output 'defaults.json') -Destination (Join-Path $repo 'references/scroll-primitives-defaults.json')
 Write-Output "Scroll primitives probe complete: $output"
}finally{if(!$process.HasExited){Stop-Process -Id $process.Id}}
