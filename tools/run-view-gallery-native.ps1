$ErrorActionPreference='Stop'
$galleryRoot=Split-Path $PSScriptRoot -Parent
$galleryBin=Join-Path $galleryRoot 'out/native-view-gallery-bin'
$galleryOutput=Join-Path $galleryRoot 'out/view-gallery-native'
dotnet build (Join-Path $galleryRoot 'tools/native-view-gallery/ViewGalleryProbe.csproj') -c Release -p:Platform=x64 -o $galleryBin --nologo -v:q
if($LASTEXITCODE -ne 0){throw 'Gallery example native probe build failed'}
$galleryStarted=[DateTime]::UtcNow
$galleryProcess=Start-Process -FilePath (Join-Path $galleryBin 'ViewGalleryProbe.exe') -ArgumentList @(('"{0}"' -f $galleryOutput),('"{0}"' -f $galleryRoot)) -WindowStyle Hidden -PassThru
try{
 while($true){
  $galleryError=Join-Path $galleryOutput 'error.txt'
  $galleryMarker=Join-Path $galleryOutput 'complete.json'
  if((Test-Path -LiteralPath $galleryError) -and (Get-Item -LiteralPath $galleryError).LastWriteTimeUtc -ge $galleryStarted){throw (Get-Content -LiteralPath $galleryError -Raw)}
  if((Test-Path -LiteralPath $galleryMarker) -and (Get-Item -LiteralPath $galleryMarker).LastWriteTimeUtc -ge $galleryStarted){break}
  if($galleryProcess.HasExited){throw 'Gallery native probe exited before completion'}
  if(([DateTime]::UtcNow-$galleryStarted).TotalSeconds -gt 90){throw 'Gallery native capture timed out'}
  Start-Sleep -Milliseconds 200
 }
}finally{if(!$galleryProcess.HasExited){Stop-Process -Id $galleryProcess.Id}}
python -X utf8 (Join-Path $galleryRoot 'tools/record-view-gallery-native.py')
if($LASTEXITCODE -ne 0){throw 'Gallery native evidence recording failed'}
