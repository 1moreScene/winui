param([ValidateSet('Both','Navigation','Buttons','Effects','Materials','Foundation','AcceptTiming','SelectionInput','TextScroll','Progress','BasicNext','FiveControls','Icons','AnimatedIcons','Vectors')][string]$Kind='Both',[switch]$KeepWindow,[switch]$PerMonitorDpi)
$ErrorActionPreference='Stop'
if($PerMonitorDpi -and $Kind -notin @('BasicNext','FiveControls')){throw '-PerMonitorDpi currently applies to BasicNext and FiveControls probes only'}
$root=Split-Path $PSScriptRoot -Parent
$build=Join-Path $root 'out/native-probe-bin'
& dotnet build (Join-Path $root 'tools/native-navigation/NavigationProbe.csproj') -c Release -p:Platform=x64 -o $build --nologo -v:q
if($LASTEXITCODE -ne 0){throw 'Native probe build failed'}
foreach($case in @('Navigation','Buttons','Effects','Materials','Foundation','AcceptTiming','SelectionInput','TextScroll','Progress','BasicNext','FiveControls','Icons','AnimatedIcons','Vectors')){
 if(($Kind -eq 'Both' -and $case -in @('Effects','Materials','Foundation','AcceptTiming','SelectionInput','TextScroll','Progress','BasicNext','FiveControls','Icons','AnimatedIcons','Vectors')) -or ($Kind -ne 'Both' -and $Kind -ne $case)){continue}
 $output=Join-Path $root $(if($case -eq 'Vectors'){'out/vectors-native'}elseif($case -eq 'AnimatedIcons'){'out/animated-icons-native'}elseif($case -eq 'Icons'){'out/icons-native'}elseif($case -eq 'FiveControls'){if($PerMonitorDpi){'out/five-controls-native-125'}else{'out/five-controls-native'}}elseif($case -eq 'BasicNext'){if($PerMonitorDpi){'out/basic-next-native-125'}else{'out/basic-next-native'}}elseif($case -eq 'Progress'){'out/progress-native'}elseif($case -eq 'Buttons'){'out/button-native'}elseif($case -eq 'Effects'){'out/effects-native'}elseif($case -eq 'Materials'){'out/materials-native'}elseif($case -eq 'Foundation'){'out/foundation-native'}elseif($case -eq 'AcceptTiming'){'out/accept-native'}elseif($case -eq 'TextScroll'){'out/text-scroll-native'}elseif($case -eq 'SelectionInput'){'out/selection-input-native'}else{'out/navigation-native'})
 New-Item -ItemType Directory -Path $output -Force | Out-Null
 $started=[DateTime]::UtcNow
 $arguments=@(('"{0}"' -f $output));if($case -eq 'Buttons'){$arguments+='--buttons'};if($case -eq 'Effects'){$arguments+='--effects'};if($case -eq 'Materials'){$arguments+='--materials'};if($case -eq 'Foundation'){$arguments+='--foundation'};if($case -eq 'AcceptTiming'){$arguments+='--accept-timing'};if($case -eq 'SelectionInput'){$arguments+='--selection-input'};if($case -eq 'TextScroll'){$arguments+='--text-scroll'}
 if($case -eq 'Progress'){$arguments+='--progress'}
 if($case -eq 'FiveControls'){$arguments+='--five-controls';if($PerMonitorDpi){$arguments+='--per-monitor-dpi'}}
 if($case -eq 'BasicNext'){$arguments+='--basic-next';if($PerMonitorDpi){$arguments+='--per-monitor-dpi'}}
 if($case -eq 'Icons'){$arguments+='--icons'}
 if($case -eq 'AnimatedIcons'){$arguments+='--animated-icons'}
 if($case -eq 'Vectors'){$arguments+='--vectors'}
 $process=Start-Process -FilePath (Join-Path $build 'NavigationProbe.exe') -ArgumentList $arguments -WindowStyle Hidden -PassThru
 $marker=Join-Path $output $(if($case -eq 'Vectors'){'vectors-complete.json'}elseif($case -eq 'AnimatedIcons'){'animated-icons-complete.json'}elseif($case -eq 'Icons'){'icons-complete.json'}elseif($case -eq 'FiveControls'){'five-controls-complete.json'}elseif($case -eq 'BasicNext'){'basic-next-complete.json'}elseif($case -eq 'Progress'){'progress-complete.json'}elseif($case -eq 'Buttons'){'button-environment.json'}elseif($case -eq 'Effects'){'effects-complete.json'}elseif($case -eq 'Materials'){'materials-complete.json'}elseif($case -eq 'Foundation'){'foundation-complete.json'}elseif($case -eq 'AcceptTiming'){'accept-timing.json'}elseif($case -eq 'TextScroll'){'text-scroll-complete.json'}elseif($case -eq 'SelectionInput'){'selection-input-complete.json'}else{'complete.json'})
 $errorFile=Join-Path $output $(if($case -eq 'Vectors'){'vectors-error.txt'}elseif($case -eq 'AnimatedIcons'){'animated-icons-error.txt'}elseif($case -eq 'Icons'){'icons-error.txt'}elseif($case -eq 'FiveControls'){'five-controls-error.txt'}elseif($case -eq 'BasicNext'){'basic-next-error.txt'}elseif($case -eq 'Progress'){'progress-error.txt'}elseif($case -eq 'Buttons'){'button-error.txt'}elseif($case -eq 'Effects'){'effects-error.txt'}elseif($case -eq 'Materials'){'materials-error.txt'}elseif($case -eq 'Foundation'){'foundation-error.txt'}elseif($case -eq 'AcceptTiming'){'accept-error.txt'}elseif($case -eq 'TextScroll'){'text-scroll-error.txt'}elseif($case -eq 'SelectionInput'){'selection-input-error.txt'}else{'error.txt'})
 try{
  while($true){
   if((Test-Path -LiteralPath $errorFile) -and (Get-Item -LiteralPath $errorFile).LastWriteTimeUtc -ge $started){throw (Get-Content -LiteralPath $errorFile -Raw)}
   if((Test-Path -LiteralPath $marker) -and (Get-Item -LiteralPath $marker).LastWriteTimeUtc -ge $started){break}
   if($process.HasExited){throw "Native $case probe exited before completion"}
   if(([DateTime]::UtcNow-$started).TotalSeconds -gt 90){throw "Native $case capture timed out"}
   Start-Sleep -Milliseconds 200
  }
  Write-Output "$case capture complete: $output"
 }finally{if(!$KeepWindow -and !$process.HasExited){Stop-Process -Id $process.Id}}
 if($case -eq 'Materials'){
  & node (Join-Path $root 'tools/extract-native-motion.mjs')
  if($LASTEXITCODE -ne 0){throw 'Native motion extraction failed'}
 }
}
