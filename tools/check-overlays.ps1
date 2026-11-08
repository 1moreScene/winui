$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$checks=@(
 @{Name='fmt';Exe='cargo';Args=@('fmt','--all','--','--check')},
 @{Name='clippy-host';Exe='cargo';Args=@('clippy','--all-targets','--locked','--','-D','warnings')},
 @{Name='clippy-wasm';Exe='cargo';Args=@('clippy','--target','wasm32-unknown-unknown','--locked','--','-D','warnings')},
 @{Name='enums';Exe='node';Args=@('tools/generate-enums.mjs','--check')},
 @{Name='baseline';Exe='node';Args=@('tools/verify-baseline.mjs','--local')},
 @{Name='strict-ts';Exe='npm.cmd';Args=@('--prefix','gallery','run','typecheck')}
)
$results=@()
Push-Location $root
try {
 New-Item -ItemType Directory -Path out/lint -Force | Out-Null
 foreach($check in $checks) {
  $arguments=$check.Args
  & $check.Exe @arguments 2>&1 | Tee-Object -Variable captured | Out-Null
  $code=$LASTEXITCODE
  $log="out/lint/overlays-$($check.Name).log"
  @($captured|ForEach-Object {[string]$_})|Set-Content -LiteralPath $log -Encoding utf8NoBOM
  $results+=@{command=(@($check.Exe)+$arguments)-join ' ';exitCode=$code;log=$log}
  Write-Output "$($check.Name): $code"
 }
 @{generatedAtUtc=[DateTime]::UtcNow.ToString('o');checks=$results}|ConvertTo-Json -Depth 6|Set-Content -LiteralPath references/validation/overlays-checks.json -Encoding utf8NoBOM
 if(@($results|Where-Object {$_.exitCode -ne 0}).Count){throw 'Overlay integration checks failed'}
} finally {Pop-Location}
