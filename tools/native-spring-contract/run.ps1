param([string]$Output)
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
if (!$Output) { $Output = Join-Path $repoRoot 'out/motion-native-spring-waveform.json' }
$runRoot = Join-Path $repoRoot ('out/spring-native-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $runRoot -Force | Out-Null
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio/Installer/vswhere.exe'
$vcvars = & $vswhere -latest -products '*' -find 'VC/Auxiliary/Build/vcvars64.bat' | Select-Object -First 1
if (!$vcvars) { throw 'MSVC x64 tools are required.' }
$cpp = Join-Path $PSScriptRoot 'Capture.cpp'
$dll = Join-Path $runRoot 'SpringCapture.dll'
$obj = Join-Path $runRoot 'Capture.obj'
$command = Join-Path $runRoot 'build-capture.cmd'
[IO.File]::WriteAllText($command, "@call `"$vcvars`" >nul`r`n@cl /nologo /std:c++20 /EHsc /LD /MD `"$cpp`" /Fo`"$obj`" /Fe`"$dll`" /link d3d11.lib dxgi.lib windowsapp.lib`r`n", [Text.UTF8Encoding]::new($false))
& $env:ComSpec /c $command
if ($LASTEXITCODE -ne 0) { throw 'Native capture helper build failed.' }
$bin = Join-Path $runRoot 'bin'
& dotnet build (Join-Path $PSScriptRoot 'SpringContract.csproj') -c Release -p:Platform=x64 "-p:OutputPath=$bin/"
if ($LASTEXITCODE -ne 0) { throw 'Spring probe build failed.' }
Copy-Item -LiteralPath $dll -Destination (Join-Path $bin 'SpringCapture.dll')
$exe = Join-Path $bin 'SpringContract.exe'
# This owns an offscreen, nonactivated HWND. It never discovers or controls Gallery.
$probe = Start-Process -FilePath $exe -ArgumentList ('"' + [IO.Path]::GetFullPath($Output) + '"') -WindowStyle Hidden -PassThru
if (!$probe.WaitForExit(30000)) { $probe.Kill(); throw 'Spring capture timed out.' }
if (!(Test-Path -LiteralPath $Output)) { throw 'The probe produced no result.' }
Write-Output $Output
