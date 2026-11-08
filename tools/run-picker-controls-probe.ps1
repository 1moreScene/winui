param([switch]$SkipBuild)
$ErrorActionPreference='Stop'
$repo=Split-Path $PSScriptRoot -Parent
$binary=Join-Path $repo 'out/picker-probe-bin'
$output=Join-Path $repo 'out/picker-native'
$project=Join-Path $PSScriptRoot 'native-navigation/NavigationProbe.csproj'
$sourceFiles=@((Get-ChildItem -LiteralPath (Split-Path $project) -File | Where-Object {$_.Extension -in @('.cs','.csproj')}).FullName)
$hashes=@{}
foreach($path in $sourceFiles){$hashes[(Split-Path $path -Leaf)]=(Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()}
if(!$SkipBuild){
    & dotnet build $project -c Release -p:Platform=x64 -o $binary --nologo -v:q
    if($LASTEXITCODE -ne 0){throw 'Picker probe build failed'}
}
New-Item -ItemType Directory -Path $output -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $repo 'references/picker-controls-template.json') -Destination (Join-Path $output 'picker-contract.json') -Force
$started=[DateTime]::UtcNow
$process=Start-Process -FilePath (Join-Path $binary 'NavigationProbe.exe') -ArgumentList @($output,'--picker-controls') -WindowStyle Hidden -PassThru
while(!$process.HasExited){
    if(([DateTime]::UtcNow-$started).TotalSeconds -gt 90){Stop-Process -Id $process.Id;throw 'Picker probe timed out'}
    Start-Sleep -Milliseconds 200
}
$errorFile=Join-Path $output 'picker-error.txt'
if((Test-Path -LiteralPath $errorFile) -and (Get-Item -LiteralPath $errorFile).LastWriteTimeUtc -ge $started){throw (Get-Content -LiteralPath $errorFile -Raw)}
$result=Join-Path $output 'picker-controls.json'
if(!(Test-Path -LiteralPath $result) -or (Get-Item -LiteralPath $result).LastWriteTimeUtc -lt $started){throw 'Fresh picker result missing'}
$data=Get-Content -LiteralPath $result -Raw -Encoding utf8 | ConvertFrom-Json
if($data.rows.Count -ne 66 -or ($data.rows | Where-Object {!$_.Foreground}).Count){throw 'Native foreground capture coverage incomplete'}
foreach($row in $data.rows | Where-Object {$_.kind -eq 'CalendarView' -and $_.state -in @('Year','Decade')}){if($row.props.displayMode -ne $row.state){throw 'Calendar mode fixture was reset during template loading'}}
foreach($path in $sourceFiles){if($hashes[(Split-Path $path -Leaf)] -ne (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()){throw "Probe source changed: $path"}}
$binaries=@{}
foreach($name in @('NavigationProbe.exe','NavigationProbe.dll','Microsoft.UI.Xaml.dll')){$binaries[$name]=(Get-FileHash -LiteralPath (Join-Path $binary $name) -Algorithm SHA256).Hash.ToLowerInvariant()}
Copy-Item -LiteralPath $result -Destination (Join-Path $repo 'references/picker-controls-native.json') -Force
Copy-Item -LiteralPath (Join-Path $output 'picker-palettes.json') -Destination (Join-Path $repo 'references/picker-controls-palettes.json') -Force
@{startedAt=$started.ToString('o');completedAt=[DateTime]::UtcNow.ToString('o');sdk=$data.sdk;sources=$hashes;binaries=$binaries;mode='--picker-controls';states=$data.rows.Count;scope=$data.scope} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $repo 'references/picker-controls-run.json') -Encoding utf8
Write-Output 'Captured 66 explicit same-SDK picker states.'
