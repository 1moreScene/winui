$ErrorActionPreference='Stop'
$readingRoot=Split-Path $PSScriptRoot -Parent
$readingBin=Join-Path $readingRoot 'out/native-reading-bin'
$readingOutput=Join-Path $readingRoot 'out/reading-native'
dotnet build (Join-Path $readingRoot 'tools/native-reading-controls/ReadingProbe.csproj') -c Release -p:Platform=x64 -o $readingBin --nologo -v:q
if($LASTEXITCODE -ne 0){throw 'Native probe build failed'}
$readingStarted=[DateTime]::UtcNow
$readingProcess=Start-Process -FilePath (Join-Path $readingBin 'ReadingProbe.exe') -ArgumentList @(('"{0}"' -f $readingOutput)) -WindowStyle Hidden -PassThru
try{
 while($true){
  $readingError=Join-Path $readingOutput 'error.txt';$readingMarker=Join-Path $readingOutput 'complete.json'
  if((Test-Path -LiteralPath $readingError) -and (Get-Item -LiteralPath $readingError).LastWriteTimeUtc -ge $readingStarted){throw (Get-Content -LiteralPath $readingError -Raw)}
  if((Test-Path -LiteralPath $readingMarker) -and (Get-Item -LiteralPath $readingMarker).LastWriteTimeUtc -ge $readingStarted){break}
  if($readingProcess.HasExited){throw 'Native probe exited before completion'}
  if(([DateTime]::UtcNow-$readingStarted).TotalSeconds -gt 90){throw 'Native capture timed out'}
  Start-Sleep -Milliseconds 200
 }
}finally{if(!$readingProcess.HasExited){Stop-Process -Id $readingProcess.Id}}
python -X utf8 (Join-Path $readingRoot 'tools/record-reading-native.py')
if($LASTEXITCODE -ne 0){throw 'Native evidence recording failed'}
