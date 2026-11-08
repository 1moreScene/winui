param([switch]$SkipBuild)
$ErrorActionPreference='Stop'
$repo=Split-Path $PSScriptRoot -Parent
$binary=Join-Path $repo 'out/content-hosts-probe-bin'
$output=Join-Path $repo 'out/content-hosts-native'
if(!$SkipBuild){
 & dotnet build (Join-Path $PSScriptRoot 'native-content-hosts/ContentHostsProbe.csproj') -c Release -p:Platform=x64 -o $binary --nologo -v:q
 if($LASTEXITCODE -ne 0){throw 'Content hosts probe build failed'}
}
New-Item -ItemType Directory -Path $output -Force | Out-Null
$started=[DateTime]::UtcNow
$process=Start-Process -FilePath (Join-Path $binary 'ContentHostsProbe.exe') -ArgumentList ('"'+$output+'"') -WindowStyle Hidden -PassThru
try{
 while($true){
  $errorFile=Join-Path $output 'error.txt'
  if((Test-Path -LiteralPath $errorFile) -and (Get-Item -LiteralPath $errorFile).LastWriteTimeUtc -ge $started){throw(Get-Content -LiteralPath $errorFile -Raw)}
  $result=Join-Path $output 'results.json'
  if((Test-Path -LiteralPath $result) -and (Get-Item -LiteralPath $result).LastWriteTimeUtc -ge $started){break}
  if($process.HasExited){throw 'Content hosts probe exited without results'}
  if(([DateTime]::UtcNow-$started).TotalSeconds -gt 60){throw 'Content hosts probe timed out'}
  Start-Sleep -Milliseconds 150
 }
 Copy-Item -LiteralPath $result -Destination (Join-Path $repo 'references/content-hosts-native.json')
 Write-Output "Content host probe complete: $output"
}finally{if(!$process.HasExited){Stop-Process -Id $process.Id}}
