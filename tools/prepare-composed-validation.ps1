$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$gallery=Join-Path $root 'out/composed-validation/gallery'
New-Item -ItemType Directory -Path $gallery -Force | Out-Null
# Freeze generated WASM and host sources together so concurrent builds cannot reload a test page.
foreach($name in @('src','public','tests','index.html','package.json','collection-validation-paths.ts')) {
 Copy-Item -LiteralPath (Join-Path $root "gallery/$name") -Destination $gallery -Recurse -Force
}
$modules=Join-Path $gallery 'node_modules'
if(!(Test-Path -LiteralPath $modules)){New-Item -ItemType Junction -Path $modules -Target (Join-Path $root 'gallery/node_modules') | Out-Null}
$references=Join-Path $root 'out/composed-validation/references'
if(!(Test-Path -LiteralPath $references)){New-Item -ItemType Junction -Path $references -Target (Join-Path $root 'references') | Out-Null}
Write-Output "Frozen composed validation host: $gallery"
