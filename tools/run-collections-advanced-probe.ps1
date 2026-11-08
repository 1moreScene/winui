$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$build=Join-Path $root 'out/collections-advanced-probe-bin'
$output=Join-Path $root 'out/collections-advanced-native'
& dotnet build (Join-Path $root 'tools/native-navigation/NavigationProbe.csproj') -c Release -p:Platform=x64 -o $build --nologo -v:q
if($LASTEXITCODE -ne 0){throw 'Advanced collection probe build failed'}
New-Item -ItemType Directory -Path $output -Force | Out-Null
$started=[DateTime]::UtcNow
$p=Start-Process -FilePath (Join-Path $build 'NavigationProbe.exe') -ArgumentList @(('"{0}"' -f $output),'--collections-advanced') -WindowStyle Hidden -PassThru
try{while($true){
 $errorFile=Join-Path $output 'collections-advanced-error.txt';$done=Join-Path $output 'collections-advanced-complete.json'
 if((Test-Path -LiteralPath $errorFile) -and (Get-Item -LiteralPath $errorFile).LastWriteTimeUtc -ge $started){throw (Get-Content -LiteralPath $errorFile -Raw)}
 if((Test-Path -LiteralPath $done) -and (Get-Item -LiteralPath $done).LastWriteTimeUtc -ge $started){break}
 if($p.HasExited){throw 'Advanced probe exited before completion'}
 if(([DateTime]::UtcNow-$started).TotalSeconds -gt 90){throw 'Advanced probe timed out'}
 Start-Sleep -Milliseconds 150
};Write-Output "Advanced collection probe complete: $output"
}finally{if(!$p.HasExited){Stop-Process -Id $p.Id}}
