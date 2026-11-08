param([switch]$SkipBuild)
$ErrorActionPreference='Stop'
$repo=Split-Path $PSScriptRoot -Parent
$project=Join-Path $PSScriptRoot 'native-repeater-style/RepeaterStyleProbe.csproj'
$binary=Join-Path $repo 'out/repeater-style-probe-bin'
$output=Join-Path $repo 'out/repeater-style-native'
if(!$SkipBuild){& dotnet build $project -c Release -p:Platform=x64 -o $binary --nologo -v:q;if($LASTEXITCODE -ne 0){throw 'Probe build failed'}}
New-Item -ItemType Directory -Path $output -Force | Out-Null
$started=[DateTime]::UtcNow
$process=Start-Process -FilePath (Join-Path $binary 'RepeaterStyleProbe.exe') -ArgumentList @($output) -WindowStyle Hidden -PassThru
if(!$process.WaitForExit(30000)){Stop-Process -Id $process.Id;throw 'Probe timeout'}
$errorFile=Join-Path $output 'error.txt'
if((Test-Path -LiteralPath $errorFile) -and (Get-Item -LiteralPath $errorFile).LastWriteTimeUtc -ge $started){throw (Get-Content -LiteralPath $errorFile -Raw)}
$result=Join-Path $output 'results.json'
if(!(Test-Path -LiteralPath $result) -or (Get-Item -LiteralPath $result).LastWriteTimeUtc -lt $started){throw 'Fresh native results missing'}
Copy-Item -LiteralPath $result -Destination (Join-Path $repo 'references/repeater-button-native.json') -Force
$sources=@{};Get-ChildItem -LiteralPath (Split-Path $project) -File | ForEach-Object {$sources[$_.Name]=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()}
$binaries=@{};foreach($name in @('RepeaterStyleProbe.exe','RepeaterStyleProbe.dll','Microsoft.UI.Xaml.dll')){$binaries[$name]=(Get-FileHash -LiteralPath (Join-Path $binary $name) -Algorithm SHA256).Hash.ToLowerInvariant()}
@{startedAt=$started.ToString('o');completedAt=[DateTime]::UtcNow.ToString('o');sources=$sources;binaries=$binaries;galleryCommit='7360ac322414e118eadfb0c7c2f4ecc31a218f59';gallerySourceSha256=(Get-FileHash -LiteralPath (Join-Path $repo 'gallery/src/official-repeater-refresh.json') -Algorithm SHA256).Hash.ToLowerInvariant();results='references/repeater-button-native.json'}|ConvertTo-Json -Depth 6|Set-Content -LiteralPath (Join-Path $repo 'references/repeater-button-native-run.json') -Encoding utf8
Write-Output 'Captured same-SDK color Button states and template geometry.'
