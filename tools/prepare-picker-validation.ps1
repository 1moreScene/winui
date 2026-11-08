param([string]$Runtime="out/picker-delivery-runtime-v2")
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$gallery=Join-Path $root 'out/picker-validation/gallery'
New-Item -ItemType Directory -Path $gallery -Force | Out-Null
foreach($name in @('src','public','tests','index.html','package.json','collection-validation-paths.ts','tsconfig.json','tsconfig.sdk.json')) {
 Copy-Item -LiteralPath (Join-Path $root "gallery/$name") -Destination $gallery -Recurse -Force
}
Copy-Item -Path (Join-Path $root "$Runtime/*") -Destination (Join-Path $gallery 'src/wasm') -Force
$modules=Join-Path $gallery 'node_modules'
if(!(Test-Path -LiteralPath $modules)){New-Item -ItemType Junction -Path $modules -Target (Join-Path $root 'gallery/node_modules') | Out-Null}
$references=Join-Path $root 'out/picker-validation/references'
if(!(Test-Path -LiteralPath $references)){New-Item -ItemType Junction -Path $references -Target (Join-Path $root 'references') | Out-Null}
Write-Output "Frozen picker validation host: $gallery"
