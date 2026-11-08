$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$build=Join-Path $root 'out/collections-probe-bin'
$output=Join-Path $root 'out/collections-native'
& python -X utf8 (Join-Path $root 'tools/extract-collections.py')
if($LASTEXITCODE -ne 0){throw 'Collection extraction failed'}
& dotnet build (Join-Path $root 'tools/native-navigation/NavigationProbe.csproj') -c Release -p:Platform=x64 -o $build --nologo -v:q
if($LASTEXITCODE -ne 0){throw 'Collection native build failed'}
New-Item -ItemType Directory -Path $output -Force | Out-Null
$started=[DateTime]::UtcNow
$p=Start-Process -FilePath (Join-Path $build 'NavigationProbe.exe') -ArgumentList @(('"{0}"' -f $output),'--collections') -WindowStyle Hidden -PassThru
try{
 while($true){
  $errorFile=Join-Path $output 'collections-error.txt';$done=Join-Path $output 'collections-complete.json'
  if((Test-Path -LiteralPath $errorFile) -and (Get-Item -LiteralPath $errorFile).LastWriteTimeUtc -ge $started){throw (Get-Content -LiteralPath $errorFile -Raw)}
  if((Test-Path -LiteralPath $done) -and (Get-Item -LiteralPath $done).LastWriteTimeUtc -ge $started){break}
  if($p.HasExited){throw 'Collection probe exited before completion'}
  if(([DateTime]::UtcNow-$started).TotalSeconds -gt 150){throw 'Collection probe timed out'}
  Start-Sleep -Milliseconds 200
 }
 foreach($f in @('collections-palettes.json','collections-metrics.json')){Copy-Item -LiteralPath (Join-Path $output $f) -Destination (Join-Path $root ('references/'+$f))}
 & python -X utf8 (Join-Path $root 'tools/extract-collections.py')
 if($LASTEXITCODE -ne 0){throw 'Collection extraction failed'}
 Write-Output "Collection probe complete: $output"
}finally{if(!$p.HasExited){Stop-Process -Id $p.Id}}
