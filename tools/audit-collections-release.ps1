$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$pkg=Get-AppxPackage Microsoft.WinUI3ControlsGallery
if(!$pkg){throw 'Store Gallery is not installed'}
$depsPath=Join-Path $pkg.InstallLocation 'WinUIGallery.deps.json'
$deps=Get-Content -LiteralPath $depsPath -Raw | ConvertFrom-Json
function Hash($path){(Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLower()}
$binaries=@(foreach($name in @('Microsoft.UI.Xaml.dll','Microsoft.UI.Xaml.Controls.dll')){
 $installed=Join-Path $pkg.InstallLocation $name
 $probe=Join-Path $root ('out/collections-probe-bin/'+$name)
 [ordered]@{name=$name;installed=$installed;installedSha256=Hash $installed;probe=$probe;probeSha256=Hash $probe;identical=(Hash $installed) -eq (Hash $probe)}
})
$screenshots=@(foreach($name in @('list-selection','grid-basic-layout','grid-layout','grid-content')){
 $path='out/collections-release/'+$name+'.png'
 [ordered]@{path=$path;sha256=Hash (Join-Path $root $path)}
})
$record=[ordered]@{
 recordedAtUtc=[DateTime]::UtcNow.ToString('o')
 package=[ordered]@{name=$pkg.Name;fullName=$pkg.PackageFullName;version=$pkg.Version.ToString();publisher=$pkg.Publisher;signatureKind=$pkg.SignatureKind.ToString();isDevelopmentMode=$pkg.IsDevelopmentMode;location=$pkg.InstallLocation}
 installedDependencies=@($deps.libraries.PSObject.Properties.Name | Where-Object {$_ -match '^Microsoft.WindowsAppSDK'})
 depsSha256=Hash $depsPath;binaries=$binaries
 observedWindow=[ordered]@{app='Microsoft.WinUI3ControlsGallery_8wekyb3d8bbwe!App';id=94965600;title='WinUI Gallery';capture='Computer Use sky / Windows.Graphics.Capture';pages=@('ListView','GridView');screenshots=$screenshots}
 findings=@('Store ListView uses bordered 350/400 by 400 DIP examples and the original two-row contact template.','GridView uses 190 by 130 DIP images, natural collection height, a 100-DIP photo-overlay template and container margins for spacing.','Content customization exposes Image, Icon/Text, Image/Text and Text templates, Reverse FlowDirection, selection and drag/reorder properties.','These live screenshots establish example organization and observed appearance; they do not establish browser pixel or compositor present-time equivalence.')
 acceptedPixelParity=$false;acceptedStorePresentTimeParity=$false
}
$record | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath (Join-Path $root 'references/validation/collections-release-audit.json') -Encoding utf8NoBOM
$binaries | ForEach-Object {Write-Output "$($_.name): Store/probe identical=$($_.identical)"}
