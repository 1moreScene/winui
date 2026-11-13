$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$source = Join-Path $root 'third_party/CommunityToolkit.Segmented/src'
$harness = Join-Path $PSScriptRoot 'native-segmented'
$probe = Join-Path $root 'out/segmented-native'
$component = Join-Path $probe 'component'
$bin = Join-Path $probe 'bin-local'
$capture = Join-Path $probe 'capture'
New-Item -ItemType Directory -Force -Path $component | Out-Null
foreach ($folder in @('Segmented', 'SegmentedItem', 'Themes', 'Helpers')) {
    Copy-Item -LiteralPath (Join-Path $source $folder) -Destination $component -Recurse -Force
}
Copy-Item -LiteralPath (Join-Path $source 'EqualPanel.cs') -Destination $component -Force
foreach ($file in @('Component.csproj', 'Usings.cs')) {
    Copy-Item -LiteralPath (Join-Path $harness $file) -Destination $component -Force
}
foreach ($file in @('SegmentedProbe.csproj', 'App.xaml', 'Program.cs')) {
    Copy-Item -LiteralPath (Join-Path $harness $file) -Destination $probe -Force
}
dotnet build (Join-Path $probe 'SegmentedProbe.csproj') -c Release -p:Platform=x64 -p:NuGetAudit=false --ignore-failed-sources -o $bin --nologo -v:q
if ($LASTEXITCODE -ne 0) { throw 'Segmented native build failed' }
$started = [DateTime]::UtcNow
$process = Start-Process -FilePath (Join-Path $bin 'SegmentedProbe.exe') -ArgumentList ('"{0}"' -f $capture) -WindowStyle Hidden -PassThru
if (!$process.WaitForExit(30000)) { Stop-Process -Id $process.Id; throw 'Segmented native probe timed out' }
$errorFile = Join-Path $capture 'error.txt'
if ((Test-Path $errorFile) -and (Get-Item $errorFile).LastWriteTimeUtc -ge $started) {
    throw (Get-Content $errorFile -Raw)
}
$record = Get-Item (Join-Path $capture 'native.json')
if ($record.LastWriteTimeUtc -lt $started) { throw 'Segmented native probe produced no fresh result' }
$record.FullName
