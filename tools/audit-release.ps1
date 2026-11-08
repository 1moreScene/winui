param()
$ErrorActionPreference = 'Stop'
$root=Split-Path $PSScriptRoot -Parent
$pkg=Get-AppxPackage Microsoft.WinUI3ControlsGallery
if(-not $pkg){throw 'Microsoft Store Gallery is not installed'}
$depsPath=Join-Path $pkg.InstallLocation 'WinUIGallery.deps.json'
$deps=Get-Content -LiteralPath $depsPath -Raw | ConvertFrom-Json
$probe=Join-Path $root 'tools/native-navigation/bin/x64/Release/net10.0-windows10.0.22621.0/win-x64'
$binaries=@(foreach($name in @('Microsoft.ui.xaml.dll','Microsoft.UI.Xaml.Controls.dll')){
  $installed=Join-Path $pkg.InstallLocation $name
  $comparison=Join-Path $probe $name
  $storeHash=(Get-FileHash -LiteralPath $installed -Algorithm SHA256).Hash.ToLower()
  $probeHash=(Get-FileHash -LiteralPath $comparison -Algorithm SHA256).Hash.ToLower()
  [ordered]@{name=$name;installed=$installed;installedSha256=$storeHash;probe=$comparison;probeSha256=$probeHash;identical=$storeHash -eq $probeHash}
})
$screenshot=Join-Path $root 'out/release-audit/store-checkbox-checked.png'
$record=[ordered]@{
  capturedAtUtc=[DateTime]::UtcNow.ToString('o')
  package=[ordered]@{name=$pkg.Name;fullName=$pkg.PackageFullName;version=$pkg.Version.ToString();publisher=$pkg.Publisher;signatureKind=$pkg.SignatureKind.ToString();isDevelopmentMode=$pkg.IsDevelopmentMode;location=$pkg.InstallLocation}
  installedDependencies=@($deps.libraries.PSObject.Properties.Name | Where-Object {$_ -match '^Microsoft.WindowsAppSDK'})
  depsSha256=(Get-FileHash -LiteralPath $depsPath -Algorithm SHA256).Hash.ToLower()
  binaries=$binaries
  observedWindow=[ordered]@{app='Microsoft.WinUI3ControlsGallery_8wekyb3d8bbwe!App';title='WinUI Gallery';page='CheckBox';capture='Computer Use sky / Windows.Graphics.Capture';actions=@('Basic input','CheckBox','Two-state CheckBox click');screenshot='out/release-audit/store-checkbox-checked.png';sha256=(Get-FileHash -LiteralPath $screenshot -Algorithm SHA256).Hash.ToLower()}
  conclusions=@('The installed Microsoft Gallery is Store-signed and uses the same experimental SDK labels as the probe. Binary identity is recorded separately for both WinUI DLLs.','The prior image is a custom forced-state RenderTargetBitmap matrix, not an official Gallery release screenshot.','Live inspection confirms the official example structure and state feedback; it does not establish browser pixel or animation parity.','Browser CheckBox previously used only FontIcon fallback, omitting the template AnimatedAcceptVisualSource path.','The new source-derived vector and marker playback still require native multi-frame validation and native AnimatedIcon interruption/queue parity. Full material/control parity is not accepted.')
}
$record | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath (Join-Path $root 'references/validation/release-audit.json') -Encoding utf8NoBOM
$binaries | ForEach-Object { Write-Output "$($_.name): Store/probe identical=$($_.identical)" }
Write-Output "Store Gallery $($pkg.Version), signature=$($pkg.SignatureKind)"
