param([switch]$SkipBuild)
$ErrorActionPreference='Stop'
$repo=Split-Path $PSScriptRoot -Parent
$binary=Join-Path $repo 'out/faceplate-probe-bin'
$output=Join-Path $repo 'out/faceplate-native'
$sources=@('Program.cs','ComboFaceplateProbe.cs','EffectsProbe.cs','CompactControlsProbe.cs')
$hashes=@{}
foreach($name in $sources){$hashes[$name]=(Get-FileHash -LiteralPath (Join-Path $PSScriptRoot "native-navigation/$name") -Algorithm SHA256).Hash.ToLowerInvariant()}
if(!$SkipBuild){
    & dotnet build (Join-Path $PSScriptRoot 'native-navigation/NavigationProbe.csproj') -c Release -p:Platform=x64 -o $binary --nologo -v:q
    if($LASTEXITCODE -ne 0){throw 'ComboBox faceplate probe build failed'}
}
New-Item -ItemType Directory -Path $output -Force | Out-Null
$started=[DateTime]::UtcNow
$process=Start-Process -FilePath (Join-Path $binary 'NavigationProbe.exe') -ArgumentList @($output,'--combo-faceplate') -WindowStyle Hidden -PassThru
while(!$process.HasExited){
    if(([DateTime]::UtcNow-$started).TotalSeconds -gt 45){throw 'ComboBox faceplate probe timed out'}
    Start-Sleep -Milliseconds 200
}
$errorFile=Join-Path $output 'combo-faceplate-error.txt'
if((Test-Path -LiteralPath $errorFile) -and (Get-Item -LiteralPath $errorFile).LastWriteTimeUtc -ge $started){throw (Get-Content -LiteralPath $errorFile -Raw)}
$result=Join-Path $output 'combo-faceplate.json'
if(!(Test-Path -LiteralPath $result) -or (Get-Item -LiteralPath $result).LastWriteTimeUtc -lt $started){throw 'Fresh native interaction result missing'}
$data=Get-Content -LiteralPath $result -Raw | ConvertFrom-Json
if($data.rows.Count -ne 28 -or ($data.rows | Where-Object {!$_.Foreground}).Count){throw 'Native foreground capture coverage incomplete'}
foreach($name in $sources){if($hashes[$name] -ne (Get-FileHash -LiteralPath (Join-Path $PSScriptRoot "native-navigation/$name") -Algorithm SHA256).Hash.ToLowerInvariant()){throw "Probe source changed: $name"}}
$binaries=@{}
foreach($name in @('NavigationProbe.exe','NavigationProbe.dll','Microsoft.UI.Xaml.dll')){$binaries[$name]=(Get-FileHash -LiteralPath (Join-Path $binary $name) -Algorithm SHA256).Hash.ToLowerInvariant()}
Copy-Item -LiteralPath $result -Destination (Join-Path $repo 'references/composed-combo-faceplate.json') -Force
@{startedAt=$started.ToString('o');completedAt=[DateTime]::UtcNow.ToString('o');sdk='Microsoft.WindowsAppSDK.WinUI/2.3.10-experimental';sources=$hashes;binaries=$binaries;mode='--combo-faceplate';states=$data.rows.Count} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $repo 'references/combo-faceplate-run.json') -Encoding utf8
Write-Output 'Captured 28 explicit same-SDK closed ComboBox states.'
