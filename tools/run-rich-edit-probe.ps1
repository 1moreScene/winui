param([switch]$SkipBuild)
$ErrorActionPreference='Stop'
$repo=Split-Path $PSScriptRoot -Parent
$binary=Join-Path $repo 'out/rich-edit-native-bin'
$output=Join-Path $repo 'out/rich-edit-native'
if(!$SkipBuild){
 & dotnet build (Join-Path $PSScriptRoot 'native-rich-edit/RichEditProbe.csproj') -c Release -p:Platform=x64 -o $binary --nologo -v:q
 if($LASTEXITCODE -ne 0){throw 'RichEditBox probe build failed'}
}
New-Item -ItemType Directory -Path $output -Force | Out-Null
$started=[DateTime]::UtcNow
$process=Start-Process -FilePath (Join-Path $binary 'RichEditProbe.exe') -ArgumentList ('"'+$output+'"') -WindowStyle Hidden -PassThru
try{
 while($true){
  $errorFile=Join-Path $output 'error.txt'
  if((Test-Path -LiteralPath $errorFile) -and (Get-Item -LiteralPath $errorFile).LastWriteTimeUtc -ge $started){throw(Get-Content -LiteralPath $errorFile -Raw)}
  $result=Join-Path $output 'results.json'
  if((Test-Path -LiteralPath $result) -and (Get-Item -LiteralPath $result).LastWriteTimeUtc -ge $started){break}
  if($process.HasExited){throw 'RichEditBox probe exited without results'}
  if(([DateTime]::UtcNow-$started).TotalSeconds -gt 45){throw 'RichEditBox probe timed out'}
  Start-Sleep -Milliseconds 150
 }
 Copy-Item -LiteralPath $result -Destination (Join-Path $repo 'references/rich-edit-native.json')
 Write-Output "RichEditBox probe complete: $output"
}finally{if(!$process.HasExited){Stop-Process -Id $process.Id}}
