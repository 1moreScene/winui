param([string]$Runtime='out/picker-reported-isolated-runtime')
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$base=Join-Path $root 'out/picker-validation/gallery'
$gallery=Join-Path $root 'out/picker-reported-preview/gallery'
New-Item -ItemType Directory -Path $gallery -Force | Out-Null
foreach($name in @('src','public','index.html','package.json','collection-validation-paths.ts','tsconfig.json','tsconfig.sdk.json')) {
 Copy-Item -LiteralPath (Join-Path $base $name) -Destination $gallery -Recurse -Force
}
foreach($name in @('picker-controls-types.ts','PickerControlsPage.tsx')) {
 Copy-Item -LiteralPath (Join-Path $root "gallery/src/$name") -Destination (Join-Path $gallery 'src') -Force
}
Copy-Item -Path (Join-Path $root "$Runtime/*") -Destination (Join-Path $gallery 'src/wasm') -Force
$modules=Join-Path $gallery 'node_modules'
if(!(Test-Path -LiteralPath $modules)){New-Item -ItemType Junction -Path $modules -Target (Join-Path $root 'gallery/node_modules') | Out-Null}
$references=Join-Path $root 'out/picker-reported-preview/references'
if(!(Test-Path -LiteralPath $references)){New-Item -ItemType Junction -Path $references -Target (Join-Path $root 'references') | Out-Null}
Write-Output "Prepared picker fix host: $gallery"
