param([switch]$SkipBuild)
$ErrorActionPreference='Stop'
$repo=Split-Path $PSScriptRoot -Parent
$project=Join-Path $PSScriptRoot 'native-menu-layout/MenuLayoutProbe.csproj'
$binary=Join-Path $repo 'out/menu-layout-probe-bin'
$output=Join-Path $repo 'out/menu-layout-native'
if(!$SkipBuild){
 & dotnet build $project -c Release -p:Platform=x64 -o $binary --nologo -v:q
 if($LASTEXITCODE -ne 0){throw 'Menu/layout native probe build failed'}
}
New-Item -ItemType Directory -Path $output -Force | Out-Null
$started=[DateTime]::UtcNow
$process=Start-Process -FilePath (Join-Path $binary 'MenuLayoutProbe.exe') -ArgumentList ('"'+$output+'"') -WindowStyle Hidden -PassThru
try{
 while(!$process.HasExited){
  if(([DateTime]::UtcNow-$started).TotalSeconds -gt 90){throw 'Menu/layout probe timed out'}
  Start-Sleep -Milliseconds 150
 }
 $failure=Join-Path $output 'error.txt'
 if((Test-Path -LiteralPath $failure) -and (Get-Item -LiteralPath $failure).LastWriteTimeUtc -ge $started){throw(Get-Content -LiteralPath $failure -Raw)}
 $result=Join-Path $output 'results.json'
 if(!(Test-Path -LiteralPath $result) -or (Get-Item -LiteralPath $result).LastWriteTimeUtc -lt $started){throw 'Fresh native result missing'}
 $data=Get-Content -LiteralPath $result -Raw -Encoding utf8 | ConvertFrom-Json
 if($data.rows.Count -ne 24){throw 'Incomplete native state coverage'}
 Copy-Item -LiteralPath $result -Destination (Join-Path $repo 'references/menu-layout-native.json') -Force
 $sources=@{};$binaries=@{}
 foreach($source in Get-ChildItem -LiteralPath (Split-Path $project) -File){$sources[$source.Name]=(Get-FileHash -LiteralPath $source.FullName -Algorithm SHA256).Hash.ToLowerInvariant()}
 foreach($name in @('MenuLayoutProbe.exe','MenuLayoutProbe.dll','Microsoft.ui.xaml.dll','Microsoft.UI.Xaml.Controls.dll')){
  $path=Join-Path $binary $name
  if(Test-Path -LiteralPath $path){$binaries[$name]=(Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()}
 }
 @{startedAt=$started.ToString('o');sdk=$data.sdk;states=$data.rows.Count;sources=$sources;binaries=$binaries;scope=$data.scope} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $repo 'references/menu-layout-probe-run.json') -Encoding utf8
 Write-Output 'Captured 24 same-SDK menu/layout states.'
}finally{if(!$process.HasExited){Stop-Process -Id $process.Id}}
