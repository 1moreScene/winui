$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
New-Item -ItemType Directory -Path (Join-Path $root 'out/lint') -Force | Out-Null
Push-Location $root
try {
    & cargo test --locked 2>&1 | Tee-Object -Variable testOutput
    $exitCode=$LASTEXITCODE
    $lines=@($testOutput | ForEach-Object { $_.ToString() })
    $lines | Set-Content -LiteralPath out/lint/rust-tests.log -Encoding utf8NoBOM
    if($exitCode -ne 0){throw 'Rust regression failed'}
    $passed=0
    foreach($line in $lines){if($line -match '^test result: ok\. (\d+) passed;'){$passed += [int]$Matches[1]}}
    if($passed -eq 0){throw 'No Rust test results found'}
    [ordered]@{generatedAtUtc=[DateTime]::UtcNow.ToString('o');passed=$passed;exitCode=$exitCode;command='cargo test --locked';log='out/lint/rust-tests.log'} | ConvertTo-Json | Set-Content -LiteralPath references/validation/rust-tests.json -Encoding utf8NoBOM
}finally{Pop-Location}
