param([string]$Binary)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
if(!$Binary){
 $candidate=Get-ChildItem -LiteralPath (Join-Path $env:USERPROFILE '.vscode/extensions') -Directory -Filter 'rust-lang.rust-analyzer-*' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
 if(!$candidate){throw 'Pass -Binary pointing to the rust-analyzer used by your editor'}
 $Binary=Join-Path $candidate.FullName 'server/rust-analyzer.exe'
}
$log=Join-Path $root 'out/lint/rust-analyzer-fixed.log'
New-Item -ItemType Directory -Path (Split-Path $log -Parent) -Force | Out-Null
Push-Location $root
try {
 $version=(& $Binary --version).Trim()
 & $Binary diagnostics . --severity error *> $log
 $result=$LASTEXITCODE
 $report=[ordered]@{generatedAtUtc=[DateTime]::UtcNow.ToString('o');analyzer=$version;rustc=(& rustc --version).Trim();exitCode=$result;log=$log;command='rust-analyzer diagnostics . --severity error';boundary='Uses the installed VS Code server, rather than treating cargo check as editor-diagnostic verification. Editor restart may be required to reload its old process.'}
 $report|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $root 'references/validation/rust-analyzer.json') -Encoding utf8NoBOM
 if($result -ne 0){Get-Content -LiteralPath $log -Tail 25;throw 'rust-analyzer diagnostics failed'}
 Write-Output "$version / $($report.rustc): zero error diagnostics"
}finally{Pop-Location}
