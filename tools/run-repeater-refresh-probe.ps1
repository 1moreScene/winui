param([switch]$SkipBuild)
$ErrorActionPreference='Stop'
$repo=Split-Path $PSScriptRoot -Parent
$project=Join-Path $PSScriptRoot 'native-repeater-refresh/RepeaterRefreshProbe.csproj'
$binary=Join-Path $repo 'out/repeater-refresh-probe-bin'
$output=Join-Path $repo 'out/repeater-refresh-native'
if(!$SkipBuild){& dotnet build $project -c Release -p:Platform=x64 -o $binary --nologo -v:q;if($LASTEXITCODE -ne 0){throw 'Probe build failed'}}
New-Item -ItemType Directory -Path $output -Force | Out-Null
$started=[DateTime]::UtcNow
$process=Start-Process -FilePath (Join-Path $binary 'RepeaterRefreshProbe.exe') -ArgumentList @($output) -WindowStyle Hidden -PassThru
while(!$process.HasExited){if(([DateTime]::UtcNow-$started).TotalSeconds -gt 60){Stop-Process -Id $process.Id;throw 'Probe timeout'};Start-Sleep -Milliseconds 200}
$errorFile=Join-Path $output 'error.txt'
if((Test-Path -LiteralPath $errorFile) -and (Get-Item -LiteralPath $errorFile).LastWriteTimeUtc -ge $started){throw (Get-Content -LiteralPath $errorFile -Raw)}
$result=Join-Path $output 'results.json'
if(!(Test-Path -LiteralPath $result) -or (Get-Item -LiteralPath $result).LastWriteTimeUtc -lt $started){throw 'Fresh native results missing'}
Copy-Item -LiteralPath $result -Destination (Join-Path $repo 'references/repeater-refresh-native.json') -Force
Copy-Item -LiteralPath (Join-Path $output 'gallery-refresh-measures.json') -Destination (Join-Path $repo 'references/repeater-gallery-refresh-measures.json') -Force
$data=Get-Content -LiteralPath $result -Raw -Encoding utf8 | ConvertFrom-Json
$data.palettes|ConvertTo-Json -Depth 8|Set-Content -LiteralPath (Join-Path $repo 'references/repeater-gallery-native-palettes.json') -Encoding utf8
$sources=@{};Get-ChildItem -LiteralPath (Split-Path $project) -File | ForEach-Object {$sources[$_.Name]=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()}
$binaries=@{};foreach($name in @('RepeaterRefreshProbe.exe','RepeaterRefreshProbe.dll','Microsoft.UI.Xaml.dll')){$binaries[$name]=(Get-FileHash -LiteralPath (Join-Path $binary $name) -Algorithm SHA256).Hash.ToLowerInvariant()}
@{startedAt=$started.ToString('o');completedAt=[DateTime]::UtcNow.ToString('o');sources=$sources;binaries=$binaries;results='references/repeater-refresh-native.json'}|ConvertTo-Json -Depth 6|Set-Content -LiteralPath (Join-Path $repo 'references/repeater-refresh-native-run.json') -Encoding utf8
Write-Output 'Captured fixed-SDK repeater and refresh fixtures.'
