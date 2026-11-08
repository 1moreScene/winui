$ErrorActionPreference='Stop'
$viewRoot=Split-Path $PSScriptRoot -Parent
$viewBin=Join-Path $viewRoot 'out/native-view-command-bin'
$viewOutput=Join-Path $viewRoot 'out/view-command-native'
dotnet build (Join-Path $viewRoot 'tools/native-view-command/ViewCommandProbe.csproj') -c Release -p:Platform=x64 -o $viewBin --nologo -v:q
if($LASTEXITCODE -ne 0){throw 'View/command native build failed'}
$viewStarted=[DateTime]::UtcNow
$viewProcess=Start-Process -FilePath (Join-Path $viewBin 'ViewCommandProbe.exe') -ArgumentList ('"{0}"' -f $viewOutput) -WindowStyle Hidden -PassThru
try{
 while($true){
  $viewError=Join-Path $viewOutput 'error.txt'
  $viewMarker=Join-Path $viewOutput 'complete.json'
  if((Test-Path -LiteralPath $viewError) -and (Get-Item -LiteralPath $viewError).LastWriteTimeUtc -ge $viewStarted){throw (Get-Content -LiteralPath $viewError -Raw)}
  if((Test-Path -LiteralPath $viewMarker) -and (Get-Item -LiteralPath $viewMarker).LastWriteTimeUtc -ge $viewStarted){break}
  if($viewProcess.HasExited){throw 'Native view capture exited before completion'}
  if(([DateTime]::UtcNow-$viewStarted).TotalSeconds -gt 90){throw 'Native view capture timed out'}
  Start-Sleep -Milliseconds 200
 }
}finally{if(!$viewProcess.HasExited){Stop-Process -Id $viewProcess.Id}}
python -X utf8 (Join-Path $viewRoot 'tools/record-view-command-native.py')
if($LASTEXITCODE -ne 0){throw 'Native view capture recording failed'}
