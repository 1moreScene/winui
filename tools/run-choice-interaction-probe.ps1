param([switch]$SkipBuild)
$ErrorActionPreference='Stop'
$repo=Split-Path $PSScriptRoot -Parent
$binary=Join-Path $repo 'out/choice-probe-bin'
$output=Join-Path $repo 'out/choice-native'
$sources=@('Program.cs','ChoiceInteractionProbe.cs','EffectsProbe.cs','CompactControlsProbe.cs')
$hashes=@{}
foreach($name in $sources){$hashes[$name]=(Get-FileHash -LiteralPath (Join-Path $PSScriptRoot "native-navigation/$name") -Algorithm SHA256).Hash.ToLowerInvariant()}
if(!$SkipBuild){
    & dotnet build (Join-Path $PSScriptRoot 'native-navigation/NavigationProbe.csproj') -c Release -p:Platform=x64 -o $binary --nologo -v:q
    if($LASTEXITCODE -ne 0){throw 'Choice interaction probe build failed'}
}
New-Item -ItemType Directory -Path $output -Force | Out-Null
$started=[DateTime]::UtcNow
$process=Start-Process -FilePath (Join-Path $binary 'NavigationProbe.exe') -ArgumentList @($output,'--choice-interaction') -WindowStyle Hidden -PassThru
while(!$process.HasExited){
    if(([DateTime]::UtcNow-$started).TotalSeconds -gt 45){throw 'Choice interaction probe timed out'}
    Start-Sleep -Milliseconds 200
}
$errorFile=Join-Path $output 'choice-interaction-error.txt'
if((Test-Path -LiteralPath $errorFile) -and (Get-Item -LiteralPath $errorFile).LastWriteTimeUtc -ge $started){throw (Get-Content -LiteralPath $errorFile -Raw)}
$result=Join-Path $output 'choice-interaction.json'
if(!(Test-Path -LiteralPath $result) -or (Get-Item -LiteralPath $result).LastWriteTimeUtc -lt $started){throw 'Fresh native interaction result missing'}
$data=Get-Content -LiteralPath $result -Raw | ConvertFrom-Json
if($data.rows.Count -ne 48 -or ($data.rows | Where-Object {!$_.Foreground}).Count){throw 'Native foreground capture coverage incomplete'}
foreach($name in $sources){if($hashes[$name] -ne (Get-FileHash -LiteralPath (Join-Path $PSScriptRoot "native-navigation/$name") -Algorithm SHA256).Hash.ToLowerInvariant()){throw "Probe source changed: $name"}}
$binaries=@{}
foreach($name in @('NavigationProbe.exe','NavigationProbe.dll','Microsoft.UI.Xaml.dll')){$binaries[$name]=(Get-FileHash -LiteralPath (Join-Path $binary $name) -Algorithm SHA256).Hash.ToLowerInvariant()}
Copy-Item -LiteralPath $result -Destination (Join-Path $repo 'references/composed-choice-interaction.json') -Force
@{startedAt=$started.ToString('o');completedAt=[DateTime]::UtcNow.ToString('o');sdk='Microsoft.WindowsAppSDK.WinUI/2.3.10-experimental';sources=$hashes;binaries=$binaries;mode='--choice-interaction';states=$data.rows.Count} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $repo 'references/choice-interaction-run.json') -Encoding utf8
Write-Output 'Captured 40 pointer observations and 8 explicitly marked SDK template states.'
