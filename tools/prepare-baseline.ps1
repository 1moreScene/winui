param([string]$GalleryPath = 'C:\Users\11156\source\repos\WinUI-Gallery')
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$extendedSourceMap = Get-Content -LiteralPath (Join-Path $root 'references/extended-source-map.json') -Raw | ConvertFrom-Json -AsHashtable
$overlaySources = Join-Path $root 'references/overlay-sources.json'
if (Test-Path -LiteralPath $overlaySources) {
    foreach ($source in (Get-Content -LiteralPath $overlaySources -Raw | ConvertFrom-Json).files) {
        $extendedSourceMap[[IO.Path]::GetFileName($source.local)] = $source.upstream
    }
}
$pinned = '7360ac322414e118eadfb0c7c2f4ecc31a218f59'
foreach ($source in (Get-Content -LiteralPath (Join-Path $root 'references/compact-controls-sources.json') -Raw | ConvertFrom-Json).files) {
    $extendedSourceMap[[IO.Path]::GetFileName($source.local)] = $source.upstream
}
foreach ($source in (Get-Content -LiteralPath (Join-Path $root 'references/collections-sources.json') -Raw | ConvertFrom-Json).files) {
    $extendedSourceMap[[IO.Path]::GetFileName($source.local)] = $source.upstream
}
$actual = (& git -C $GalleryPath rev-parse HEAD).Trim()
if ($actual -ne $pinned) { throw "Gallery HEAD changed: expected $pinned, got $actual" }
function Save-Json($value, $path) { $value | ConvertTo-Json -Depth 60 | Set-Content -LiteralPath (Join-Path $root $path) -Encoding utf8NoBOM }
function Fingerprint($path) { [ordered]@{ path = $path; sha256 = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLower() } }
$assetsPath = Join-Path $GalleryPath 'WinUIGallery\obj\WinUIGallery\project.assets.json'
$assets = Get-Content -LiteralPath $assetsPath -Raw | ConvertFrom-Json
$resolved = @($assets.libraries.PSObject.Properties.Name | Where-Object { $_ -match '^Microsoft.WindowsAppSDK' })
if ($resolved -notcontains 'Microsoft.WindowsAppSDK/2.5.4-experimental' -or $resolved -notcontains 'Microsoft.WindowsAppSDK.WinUI/2.3.10-experimental') { throw 'Resolved Gallery SDK baseline changed' }
$catalog = Get-Content -LiteralPath (Join-Path $GalleryPath 'catalog\windows-samples.json') -Raw | ConvertFrom-Json
$navigation = $catalog.controls | Where-Object id -eq 'navigationview'
$button = $catalog.controls | Where-Object id -eq 'button'
Save-Json $button 'gallery/src/official-button.json'
Save-Json $navigation 'gallery/src/official-navigation.json'
$scope = @($catalog.controls | ForEach-Object {
    [ordered]@{ id = $_.id; name = $_.name; category = $_.gallery.group.title; galleryPage = $_.gallery.page;
        samples = @($_.samples | ForEach-Object { [ordered]@{ title = $_.header; source = $_.gallery.source } });
        nativeNamespace = $_.apiNamespace; winuiSource = $(if ($_.id -eq 'navigationview') { 'controls/dev/NavigationView' } elseif ($_.id -eq 'button') { 'controls/dev/CommonStyles/Button_themeresources.xaml + dxaml/xcp/dxaml/lib/ButtonBase_Partial.cpp' } elseif ($_.id -eq 'acrylic') { 'controls/dev/Materials/Acrylic/AcrylicBrush.cpp + AcrylicBrush.h' } elseif ($_.id -eq 'easingfunction') { 'dxaml/xcp/components/animation/EasingFunctions.cpp + dxaml/xcp/core/inc/EasingFunctions.h' } elseif ($_.id -eq 'implicittransition') { 'dxaml/xcp/components/comptree/SharedTransitionAnimations.cpp' } elseif ($_.id -in @('togglebutton','checkbox')) { 'controls/dev/CommonStyles/'+$_.name+'_themeresources.xaml + dxaml/xcp/dxaml/lib/ToggleButton_Partial.cpp + CheckBox_Partial.cpp' } elseif ($_.id -eq 'radiobutton') { 'controls/dev/RadioButtons + controls/dev/CommonStyles/RadioButton_themeresources.xaml + dxaml/xcp/dxaml/lib/RadioButton_Partial.cpp' } elseif ($_.id -eq 'toggleswitch') { 'controls/dev/CommonStyles/ToggleSwitch_themeresources.xaml + dxaml/xcp/dxaml/lib/ToggleSwitch_Partial.cpp' } elseif ($_.id -eq 'textblock') { 'dxaml/xcp/core/text/TextBlock/TextBlock.cpp' } elseif ($_.id -eq 'image') { 'dxaml/xcp/core/core/elements/imagebase.cpp + imagebrush.cpp' } else { $null });
        requiredResources = $(if ($_.id -eq 'navigationview') { @('NavigationView.xaml', 'NavigationView_themeresources.xaml', 'SplitView_themeresources.xaml') } elseif ($_.id -eq 'button') { @('Button_themeresources.xaml','button-palettes.json','button-native-metrics.json') } elseif ($_.id -eq 'acrylic') { @('AcrylicBrush.cpp','AcrylicBrush.h','NoiseAsset_256X256_PNG.png','material-graph.json') } elseif ($_.id -eq 'easingfunction') { @('EasingFunctions.cpp','EasingFunctions.h','native-easing-functions.json') } elseif ($_.id -eq 'implicittransition') { @('SharedTransitionAnimations.cpp','motion-native-defaults.json') } elseif ($_.id -eq 'radialgradientbrush') { @('gallery-motion/RadialGradientBrush','official-motion.json','gradient-comparison.json') } elseif ($_.id -in @('togglebutton','checkbox')) { @('selection-template.json','foundation-palettes.json','AnimatedAcceptVisualSource (pending)','FontIcon fallback') } elseif ($_.id -in @('radiobutton','toggleswitch')) { @('selection-input-template.json','input-palettes.json','input-timing.json','input-reposition.json','radio-group-metrics.json') } elseif ($_.id -eq 'textblock') { @('TextBlock.cpp','TextBlock_themeresources.xaml','native font metrics') } elseif ($_.id -eq 'image') { @('imagebase.cpp','imagebrush.cpp','treetops.jpg','valley.jpg') } else { @() });
        hostDependencies = $(if ($_.id -eq 'navigationview') { @('Canvas2D', 'pointer and keyboard events', 'ResizeObserver', 'requestAnimationFrame', 'DOM accessibility', 'Segoe UI and Fluent Icons fonts') } elseif ($_.id -eq 'button') { @('Canvas2D or WebGL2','pointer capture and keyboard','font metrics and glyph rasterization','DOM accessibility','image decode') } elseif ($_.id -eq 'acrylic') { @('same-scene ordered backdrop','Canvas2D or WebGL2 render targets','requestAnimationFrame','reduced-motion / reduced-transparency policies') } elseif ($_.id -in @('easingfunction','implicittransition')) { @('Rust clock / requestAnimationFrame','same-scene presentation matrix','reduced-motion policy') } elseif ($_.id -eq 'radialgradientbrush') { @('Canvas2D local brush cache or WebGL2 analytic gradient') } elseif ($_.id -eq 'systembackdrops') { @('Windows compositor host: unavailable in current browser adapter') } elseif ($_.id -in @('togglebutton','checkbox')) { @('shared Rust scene and capture/keyboard','DOM accessibility','Canvas2D or WebGL2','system Fluent Icons font') } elseif ($_.id -in @('radiobutton','toggleswitch')) { @('shared Rust state/input/layout','Canvas2D default or opt-in WebGL2','DOM radio/switch semantics') } elseif ($_.id -eq 'textblock') { @('font measurement and fallback','Canvas2D or GPU glyph texture','DOM accessible text') } elseif ($_.id -eq 'image') { @('browser image decoding','same-origin or CORS source','Canvas2D or GPU image texture') } else { @() });
        implementation = $(if ($_.id -eq 'navigationview') { 'vertical slice plus shared scene integration; advanced navigation gaps remain' } elseif ($_.id -eq 'button') { 'stage 4: Standard/Accent/Subtle; shared scene, real input and 36 native fixture comparisons' } elseif ($_.id -eq 'acrylic') { '3 official Acrylic samples and options; theme/custom/luminosity, source graph and 500ms color interruption on Canvas2D/WebGL2; 12 native static + 34 fixed-progress captures' } elseif ($_.id -eq 'easingfunction') { '4 official examples; all 11 XAML easing families and 3 modes; 8481 native scalar samples verified' } elseif ($_.id -eq 'radialgradientbrush') { 'official interactive sample, relative/absolute mapping and Pad/Repeat/Reflect; 12 dual-backend native comparisons' } elseif ($_.id -eq 'implicittransition') { '4 scalar/2D vector examples via public animate API; source cubic and native default durations; implicit property attachment, Z, brush and local-theme examples pending' } elseif ($_.id -eq 'systembackdrops') { 'documented Windows host boundary; no Mica/DesktopAcrylicController emulation' } elseif ($_.id -in @('togglebutton','checkbox')) { 'stage 6.1: 4 official examples, nullable checked state, notification-before-click and keyboard/input/lifecycle; 72 native settled states on two backends; AnimatedAcceptVisualSource paths/timing remain pending' } elseif ($_.id -in @('radiobutton','toggleswitch')) { 'stage 6.2: exclusive groups, roving Tab/spatial arrows, switch drag and native-derived state/timing resources; four Gallery examples with ProgressRing dependency supplied in stage 6.4; Store page inspection plus 32 native states on two backends; full pixel/present-time parity unaccepted' } elseif ($_.id -eq 'textblock') { 'stage 6.1: first 2 official examples and typed FontStyle, fractional baseline/width verification; character spacing, inlines and selection pending' } elseif ($_.id -eq 'image') { 'stage 6.1: official local-image and stretch examples, 4 stretch modes and native crops; decode-size API, NineGrid, SVG and animated playback pending' } else { 'not started; source mapping not audited' });
        acceptance = 'native equivalence not accepted'
    }
})
foreach ($entry in $scope) {
    if ($entry.id -in @('infobar','personpicture','ratingcontrol','splitbutton','togglesplitbutton')) {
        $entry.winuiSource = 'controls/dev/' + $(if($entry.id -eq 'togglesplitbutton'){'SplitButton'}else{$entry.name}) + '; exact paths in compact-controls-sources.json'
        $entry.requiredResources = @('compact-controls-template.json','compact-controls-palettes.json','compact-controls-metrics.json','sdk/compact-controls.xaml','compact-controls-sources.json')
        $entry.hostDependencies = @('shared Rust layout/input/clock and Canvas2D default','Segoe UI and Segoe Fluent Icons; browser image decode','SplitButton uses root-owned Flyout/MenuFlyout; DOM ARIA projection')
        $entry.implementation = 'compact batch: five Rust/TS/React slices and nine Gallery examples; SplitButton now shares real GridView/ItemsWrapGrid and VariableSizedWrapGrid; RichEditBox, full templates and Store present-time parity pending; docs/compact-controls.md'
    }
    if ($entry.id -in @('listview','gridview','itemsstackpanel','itemswrapgrid','variablesizedwrapgrid')) {
        $entry.winuiSource = 'Exact pinned paths in collections-sources.json; ListViewBase selection, item chrome and stacking/wrapping/occupancy layout'
        $entry.requiredResources = @('collections-template.json','collections-palettes.json','collections-metrics.json','collections-sources.json','collections-assets.json')
        $entry.hostDependencies = @('Rust collection identity, selection, realization, scroll and indicator animation','TS business objects and normal SDK/React item templates','Segoe UI / Segoe Fluent Icons; browser image decode; Canvas2D default')
        $entry.implementation = 'collection slice: 5 controls, uniform virtualized views and 10 Gallery samples; original contact/photo templates and source-derived media clips/item borders; same-SDK static matrices and independent input/lifecycle/capacity checks; advanced collection features and Store present-time parity pending; docs/collections.md'
    }
    if ($entry.id -eq 'animatedicon') {
        $entry.winuiSource = 'controls/dev/AnimatedIcon/AnimatedIcon.cpp + AnimatedVisuals'
        $entry.implementation = 'stage 6.8 seven built-in sources, Rust QueueOne, fallback and NavigationView integration; 252 frozen Composition regions; arbitrary sources and Store present-time parity pending; docs/animated-icons-shapes.md'
    }
    if ($entry.id -in @('shape','line')) {
        $entry.winuiSource = 'dxaml/xcp/core/core/elements/shape.cpp + rectangle/line/path/polygon/polyline.cpp'
        $entry.implementation = 'stage 6.8 Rectangle/Line/Path/Polygon/Polyline slices; geometry, brushes, stroke, stretch and five examples; intrinsic Canvas size and full GeometryGroup parity pending; docs/animated-icons-shapes.md'
    }
    if ($entry.id -eq 'iconelement') {
        $entry.winuiSource = 'dxaml/xcp/core/core/elements/icon.cpp + controls/dev/ImageIcon'
        $entry.requiredResources = @('icons-template.json','sdk-symbols.json','icon-defaults.json','icons-metrics.json','gallery-input/IconElement')
        $entry.hostDependencies = @('Segoe Fluent Icons/MDL2 font rasterization','browser PNG/JPEG/SVG decode with same-origin or CORS','shared Rust geometry/layout/foreground; Canvas2D default or optional WebGL2')
        $entry.implementation = 'stage 6.8 extends five icons with local direction/mirroring, typed source descriptors, source element, exact pinned camera asset and native image scaling tests; full RTL/system scaling/UIA/pixel parity pending; docs/animated-icons-shapes.md'
    }
    if ($entry.id -in @('scrollviewer','textbox','passwordbox')) {
        $entry.winuiSource = 'controls/dev/CommonStyles/' + $entry.name + '_themeresources.xaml + dxaml/xcp/dxaml/lib/' + $entry.name + '_Partial.cpp'
        $entry.requiredResources = @('text-scroll-template.json','text-scroll-metrics.json','text-scroll-palettes.json')
        $entry.hostDependencies = @('shared Rust layout/input/rendering','browser input/textarea IME and clipboard','Canvas2D default; optional WebGL2','DOM focus/selection and ARIA ranges')
        $entry.implementation = 'stage 6.3 implemented slice: text editing/password/scrolling and eight official examples; detailed parity gaps in docs/text-scroll.md'
    }
    if ($entry.id -in @('progressbar','progressring')) {
        $entry.winuiSource = 'controls/dev/' + $entry.name + '/' + $entry.name + '.cpp + .xaml + _themeresources.xaml'
        $entry.requiredResources = @('progress-template.json','progress-palettes.json','progress-metrics.json','input-reposition.json')
        $entry.hostDependencies = @('shared Rust scene/clock/layout/rendering','Canvas2D default; optional WebGL2','DOM progressbar ARIA; no pointer interception')
        $entry.implementation = 'stage 6.4: typed range/progress properties, source built-in visuals, four Gallery samples and ToggleSwitch ProgressRing dependency; host numeric editors replace deferred NumberBox; custom AnimatedVisual sources and Store present-time acceptance pending'
    }
    if ($entry.id -in @('repeatbutton','viewbox')) {
        $entry.winuiSource = $(if($entry.id -eq 'repeatbutton'){'controls/dev/CommonStyles/RepeatButton_themeresources.xaml + dxaml/xcp/dxaml/lib/RepeatButton_Partial.cpp'}else{'dxaml/xcp/core/core/elements/Viewbox.cpp'})
        $entry.requiredResources = @('basic-next-template.json','basic-next-defaults.json','basic-next-palettes.json','basic-next-metrics.json','basic-next-metrics-125.json')
        $entry.hostDependencies = @('shared Rust scene/layout/input and demand clock','Canvas2D default; optional WebGL2','DOM transformed child space and button semantics')
        $entry.implementation = 'stage 6.5: Rust RepeatButton timer/default states and Viewbox source scaling/clip/child ownership, two actual React examples; 100%/125% native profiles and own-window keyboard observations; full native pixel/present-time equivalence unaccepted, advanced template gaps in docs/repeat-viewbox.md'
    }
    if ($entry.id -in @('border','canvas','hyperlinkbutton','expander','infobadge')) {$entry.implementation='stage 6.6 source slice, public Rust/TS/React and native probes; scope and remaining gaps in docs/five-controls.md'}
    if ($entry.id -in @('popup','tooltip','flyout','menuflyout','slider') -and (Test-Path -LiteralPath (Join-Path $root 'references/overlay-template.json'))) {
        $entry.winuiSource = 'Exact pinned source paths in overlay-sources.json; FlyoutBase/Popup and corresponding presenters are shared by SplitButton controls'
        $entry.requiredResources = @('overlay-template.json','overlay-sources.json','overlay-palettes.json','overlay-metrics.json','overlay-native-motion.json')
        $entry.hostDependencies = @('shared Rust root overlay layout, input, clock and rendering','Scene DOM focus/ARIA projection; Canvas2D default, optional WebGL2')
        $entry.implementation = 'stage 7 running source slice; shared by SplitButton and ToggleSplitButton, not a separate overlay implementation; detailed capabilities and remaining limits in docs/overlays.md and references/stage-7.json; full native equivalence unaccepted'
    }
    if ($entry.id -eq 'toggleswitch') {$entry.implementation += '; stage 6.4 supplies the second sample ProgressRing dependency'}
    if ($entry.id -in @('autosuggestbox','numberbox')) { $entry.implementation = 'deferred until stage 7 Popup infrastructure; composition, not TextBox inheritance; no partial API exported' }
}
Save-Json ([ordered]@{ galleryCommit = $pinned; controlCount = $scope.Count; controls = $scope;
    exclusions = @('Charts: previous scope retained, no implementation in this batch', 'Community TableView: external dependency, no implementation in this batch', 'Unrelated Windows system APIs: host support required, not emulated') }) 'references/scope.json'
$files = @('LICENSE','Directory.Build.props','standalone.props','WinUIGallery\WinUIGallery.csproj','WinUIGallery\Directory.Build.props','WinUIGallery\Directory.Build.targets','catalog\windows-samples.json','WinUIGallery\Samples\NavigationView\NavigationViewPage.xaml','WinUIGallery\Samples\NavigationView\NavigationViewPage.xaml.cs')
$fingerprints = @($files | ForEach-Object { Fingerprint (Join-Path $GalleryPath $_) })
$fingerprints += Fingerprint $assetsPath
foreach ($file in @('references/compact-controls-sources.json','references/compact-controls-template.json','references/compact-controls-palettes.json','references/compact-controls-metrics.json','references/compact-controls-assets.json','references/sdk/compact-controls.xaml','tools/fetch-compact-controls.py','tools/extract-compact-controls.py','tools/native-navigation/CompactControlsProbe.cs','gallery/public/project/person-profile.png','gallery/src/official-compact-controls.json')) {$fingerprints += Fingerprint (Join-Path $root $file)}
foreach ($file in @('references/overlay-sources.json','references/overlay-template.json','references/overlay-palettes.json','references/overlay-controls-metrics.json','references/overlay-desktop-acrylic-defaults.json','references/popup-corner-materials-native.json','references/host-backdrop-profile.json','references/overlay-desktop-graph-evidence.json','tools/native-navigation/OverlayControlsProbe.cs','tools/native-navigation/TooltipControlsProbe.cs','tools/native-navigation/RawHostBackdropProbe.cs','tools/native-navigation/AcrylicKernelProbe.cs','tools/native-navigation/PopupCornersProbe.cs','tools/native-navigation/TextCoverageProbe.cs','tools/native-navigation/Program.cs','references/text-raster-sources.json','references/text-coverage-native.json','tools/extract-overlays.py','references/composed-controls-sources.json','references/composed-controls-template.json','references/sdk/composed-controls.xaml','gallery/src/official-composed-controls.json','tools/fetch-composed-controls.py','tools/extract-composed-controls.py')) {if(Test-Path -LiteralPath (Join-Path $root $file)) {$fingerprints += Fingerprint (Join-Path $root $file)}}
$fingerprints += @(Get-ChildItem -LiteralPath (Join-Path $root 'references/gallery-pages') -File | ForEach-Object { Fingerprint $_.FullName })
$fingerprints += @(Get-ChildItem -LiteralPath (Join-Path $root 'references/gallery-motion') -File -Recurse | ForEach-Object { Fingerprint $_.FullName })
$fingerprints += @(Get-ChildItem -LiteralPath (Join-Path $root 'references/gallery-foundation') -File -Recurse | ForEach-Object { Fingerprint $_.FullName })
$fingerprints += @(Get-ChildItem -LiteralPath (Join-Path $root 'references/gallery-input') -File -Recurse | ForEach-Object { Fingerprint $_.FullName })
foreach ($file in @('references/selection-input-template.json','references/input-palettes.json','references/input-timing.json','references/input-easing.json','references/input-reposition.json','references/radio-group-metrics.json','tools/native-navigation/SelectionInputProbe.cs')) { $fingerprints += Fingerprint (Join-Path $root $file) }
$fingerprints += @(Get-ChildItem -LiteralPath (Join-Path $root 'references/gallery-shared') -File | ForEach-Object { Fingerprint $_.FullName })
foreach ($file in @('references/foundation-palettes.json','references/selection-template.json','tools/native-navigation/FoundationProbe.cs','tools/native-navigation/AcceptTimingProbe.cs','references/animated-accept.json','references/validation/native-accept-timing.json','gallery/public/official/treetops.jpg','gallery/public/official/valley.jpg')) { $fingerprints += Fingerprint (Join-Path $root $file) }
foreach ($file in @('references/text-scroll-template.json','references/text-scroll-metrics.json','references/text-scroll-palettes.json','references/text-helper-metrics.json','tools/native-navigation/TextScrollProbe.cs','gallery/public/official/cliff.jpg')) { $fingerprints += Fingerprint (Join-Path $root $file) }
foreach ($file in @('references/progress-template.json','references/progress-palettes.json','references/progress-metrics.json','tools/extract-progress.py','tools/native-navigation/ProgressProbe.cs')) {$fingerprints += Fingerprint (Join-Path $root $file)}
foreach ($file in @('references/basic-next-template.json','references/basic-next-defaults.json','references/basic-next-palettes.json','references/basic-next-metrics.json','references/basic-next-metrics-125.json','tools/extract-basic-next.py','tools/native-navigation/BasicNextProbe.cs')) {$fingerprints += Fingerprint (Join-Path $root $file)}
foreach ($file in @('references/five-controls-template.json','references/five-controls-metrics.json','references/five-controls-palettes.json','tools/extract-five-controls.py','tools/native-navigation/FiveControlsProbe.cs')) {$fingerprints += Fingerprint (Join-Path $root $file)}
$fingerprints += Fingerprint (Join-Path $root 'tools/native-navigation/NavigationProbe.csproj')
foreach ($file in @('references/collections-template.json','references/collections-palettes.json','references/collections-metrics.json','references/collections-sources.json','references/collections-assets.json','tools/extract-collections.py','tools/native-navigation/CollectionsProbe.cs')) {$fingerprints += Fingerprint (Join-Path $root $file)}
foreach ($file in @('NavigationProbe.exe','Microsoft.UI.Xaml.dll')) { $path = Join-Path $root ('out/collections-probe-bin/'+$file); if (Test-Path -LiteralPath $path) {$fingerprints += Fingerprint $path} }
foreach ($asset in (Get-Content -LiteralPath (Join-Path $root 'references/collections-assets.json') -Raw | ConvertFrom-Json).photos) {$fingerprints += Fingerprint (Join-Path $root ('gallery/public'+$asset.image))}
$fingerprints += Fingerprint (Join-Path $GalleryPath 'WinUIGallery/Assets/SampleMedia/Contacts.txt')
foreach ($file in @('gallery/src/collections-data.json','gallery/src/official-collections.json','references/sdk/collections.xaml')) {$fingerprints += Fingerprint (Join-Path $root $file)}
foreach ($file in @('references/icons-template.json','references/icons-metrics.json','references/sdk-symbols.json','references/icon-defaults.json','tools/extract-icons.py','tools/native-navigation/IconsProbe.cs','gallery/public/official/MirrorPCConsent.svg')) {$fingerprints += Fingerprint (Join-Path $root $file)}
$fingerprints += Fingerprint (Join-Path $GalleryPath 'WinUIGallery/Assets/SampleMedia/MirrorPCConsent.svg')
foreach ($file in @('references/extended-source-map.json','references/animated-icons.json','references/animated-icons-metrics.json','references/vectors-template.json','references/vectors-metrics.json','references/external-icons.json','tools/extract-animated-icons.py','tools/extract-vectors.py','tools/native-navigation/AnimatedIconsProbe.cs','tools/native-navigation/VectorsProbe.cs','gallery/public/official/libre-camera-panorama.svg','gallery/public/official/LibreICONS-LICENSE.txt')) {$fingerprints += Fingerprint (Join-Path $root $file)}
foreach ($file in @('tools/native-navigation/ButtonProbe.cs','tools/native-navigation/Program.cs','tools/native-navigation/EffectsProbe.cs','tools/native-navigation/MaterialsProbe.cs','references/composition-color-profile.json','references/motion-native-defaults.json','references/validation/native-easing-functions.json','references/button-palettes.json','references/button-native-metrics.json','gallery/public/official/Slices.png')) { $fingerprints += Fingerprint (Join-Path $root $file) }
foreach ($file in @('WinUIGallery/Samples/Button/ButtonPage.xaml','WinUIGallery/Samples/Button/ButtonPage.xaml.cs','WinUIGallery/Assets/SampleMedia/Slices.png')) { $fingerprints += Fingerprint (Join-Path $GalleryPath $file) }
foreach ($file in @('out/native-buttons-bin/NavigationProbe.exe','out/native-buttons-bin/Microsoft.UI.Xaml.dll','tools/native-navigation/obj/project.assets.json','out/native-probe-bin/NavigationProbe.exe','out/native-probe-bin/Microsoft.UI.Xaml.dll')) { if(Test-Path -LiteralPath (Join-Path $root $file)) { $fingerprints += Fingerprint (Join-Path $root $file) } }

$probe = Join-Path $root 'tools/native-navigation/bin/x64/Release/net10.0-windows10.0.22621.0/win-x64'
foreach ($file in @('NavigationProbe.exe','Microsoft.UI.Xaml.dll')) { if (Test-Path -LiteralPath (Join-Path $probe $file)) { $fingerprints += Fingerprint (Join-Path $probe $file) } }
$nuget = Join-Path $env:USERPROFILE '.nuget\packages\microsoft.windowsappsdk.winui\2.3.10-experimental'
$fingerprints += Fingerprint (Join-Path $nuget 'microsoft.windowsappsdk.winui.nuspec')
$fingerprints += Fingerprint (Join-Path $nuget 'license.txt')
$sourceFiles = @(Get-ChildItem -LiteralPath (Join-Path $root 'references/winui') -File | ForEach-Object {
    $file = Fingerprint $_.FullName
    $file['sourcePath'] = $(if ($extendedSourceMap.ContainsKey($_.Name)) {$extendedSourceMap[$_.Name]} elseif ($_.Name -eq 'LICENSE') { 'LICENSE' } elseif ($_.Name -eq 'NavigationView.properties.cpp') { 'controls/dev/Generated/NavigationView.properties.cpp' } elseif ($_.Name -eq 'SplitView_themeresources.xaml') { 'controls/dev/SplitView/SplitView_themeresources.xaml' }
    elseif ($_.Name -eq 'icon.cpp') {'dxaml/xcp/core/core/elements/icon.cpp'}
    elseif ($_.Name -eq 'icon.h') {'dxaml/xcp/core/inc/icon.h'}
    elseif ($_.Name -in @('SymbolIcon_Partial.cpp','FontIconSource_Partial.cpp','BitmapIconSource_Partial.cpp','PathIconSource_Partial.cpp')) {'dxaml/xcp/dxaml/lib/' + $_.Name}
    elseif ($_.Name -eq 'IconSource.cs') {'dxaml/xcp/tools/XCPTypesAutoGen/Modules/Controls/IconSource.cs'}
    elseif ($_.Name -in @('ImageIcon.cpp','ImageIcon.h','ImageIcon.xaml')) {'controls/dev/ImageIcon/' + $_.Name}
    elseif ($_.Name -in @('AcrylicBrush.cpp','AcrylicBrush.h')) { 'controls/dev/Materials/Acrylic/' + $_.Name }
    elseif ($_.Name -eq 'NoiseAsset_256X256_PNG.png') { 'controls/dev/Materials/Acrylic/Assets/' + $_.Name }
    elseif ($_.Name -eq 'Button_themeresources.xaml') { 'controls/dev/CommonStyles/' + $_.Name }
    elseif ($_.Name -in @('ButtonBase_Partial.cpp','Button_Partial.cpp')) { 'dxaml/xcp/dxaml/lib/' + $_.Name }
    elseif ($_.Name -eq 'EasingFunctions.cpp') { 'dxaml/xcp/components/animation/' + $_.Name }
    elseif ($_.Name -eq 'EasingFunctions.h') { 'dxaml/xcp/core/inc/' + $_.Name }
    elseif ($_.Name -eq 'SharedTransitionAnimations.cpp') { 'dxaml/xcp/components/comptree/' + $_.Name }
    elseif ($_.Name -in @('ToggleButton_themeresources.xaml','CheckBox_themeresources.xaml','RadioButton_themeresources.xaml','ToggleSwitch_themeresources.xaml')) { 'controls/dev/CommonStyles/' + $_.Name }
    elseif ($_.Name -in @('ToggleButton_Partial.cpp','CheckBox_Partial.cpp','RadioButton_Partial.cpp','ToggleSwitch_Partial.cpp','ThemeAnimations.cpp')) { 'dxaml/xcp/dxaml/lib/' + $_.Name }
    elseif ($_.Name -in @('RadioButtons.cpp','RadioButtons.xaml','RadioButtonsElementFactory.cpp','ColumnMajorUniformToLargestGridLayout.cpp')) { 'controls/dev/RadioButtons/' + $_.Name }
    elseif ($_.Name -in @('ProgressRingDeterminate.cpp','ProgressRingIndeterminate.cpp')) {'controls/dev/ProgressRing/AnimatedVisuals/' + $_.Name}
    elseif ($_.Name -match '^Progress(Bar|Ring)') {'controls/dev/' + $(if($_.Name.StartsWith('ProgressBar')){'ProgressBar'}else{'ProgressRing'}) + '/' + $_.Name}
    elseif ($_.Name -eq 'HyperlinkButton_themeresources.xaml') {'controls/dev/CommonStyles/' + $_.Name}
    elseif ($_.Name -in @('HyperLinkButton_Partial.cpp','HyperLinkButton_Partial.h')) {'dxaml/xcp/dxaml/lib/' + $_.Name}
    elseif ($_.Name -in @('Border.cpp','canvas.cpp')) {'dxaml/xcp/core/core/elements/' + $_.Name}
    elseif ($_.Name -eq 'AnimatedChevronUpDownSmallVisualSource.cpp') {'controls/dev/AnimatedIcon/AnimatedVisuals/' + $_.Name}
    elseif ($_.Name.StartsWith('Expander')) {'controls/dev/Expander/' + $_.Name}
    elseif ($_.Name.StartsWith('InfoBadge')) {'controls/dev/InfoBadge/' + $_.Name}
    elseif ($_.Name -eq 'RepeatButton_themeresources.xaml') {'controls/dev/CommonStyles/' + $_.Name}
    elseif ($_.Name -in @('RepeatButton_Partial.cpp','RepeatButton_Partial.h','RepeatButtonAutomationPeer_Partial.cpp')) {'dxaml/xcp/dxaml/lib/' + $_.Name}
    elseif ($_.Name -eq 'Viewbox.cpp') {'dxaml/xcp/core/core/elements/Viewbox.cpp'}
    elseif ($_.Name -eq 'Viewbox.h') {'dxaml/xcp/core/inc/Viewbox.h'}
    elseif ($_.Name -eq 'ThemeAnimationsHelper.cpp') { 'dxaml/xcp/components/themeanimationshelper/lib/' + $_.Name }
    elseif ($_.Name -in @('imagebase.cpp','imagebrush.cpp')) { 'dxaml/xcp/core/core/elements/' + $_.Name }
    elseif ($_.Name -eq 'TextBlock.cpp') { 'dxaml/xcp/core/text/TextBlock/TextBlock.cpp' }
    elseif ($_.Name -eq 'Button.cpp') { 'dxaml/xcp/core/core/elements/Button.cpp' }
    elseif ($_.Name -eq 'ButtonBaseKeyProcess.h') { 'dxaml/xcp/components/controls/KeyDownUp/inc/ButtonBaseKeyProcess.h' }
    elseif ($_.Name -eq 'TextBlock_themeresources.xaml') { 'controls/dev/CommonStyles/' + $_.Name }
    elseif ($_.Name -in @('AnimatedBackVisualSource.cpp','AnimatedAcceptVisualSource.cpp')) { 'controls/dev/AnimatedIcon/AnimatedVisuals/' + $_.Name }
    elseif ($_.Name -in @('AnimatedIcon.cpp','AnimatedIcon.h')) { 'controls/dev/AnimatedIcon/' + $_.Name }
    elseif ($_.Name -in @('ScrollViewer_themeresources.xaml','ScrollBar_themeresources.xaml','TextBox_themeresources.xaml','PasswordBox_themeresources.xaml')) { 'controls/dev/CommonStyles/' + $_.Name }
    elseif ($_.Name -in @('ScrollViewer_Partial.cpp','ScrollBar_Partial.cpp','TextBox_Partial.cpp','PasswordBox_Partial.cpp')) { 'dxaml/xcp/dxaml/lib/' + $_.Name }
    elseif ($_.Name -eq 'TextBoxBase.cpp') { 'dxaml/xcp/core/native/text/Controls/TextBoxBase.cpp' }
    elseif ($_.Name -in @('TextBox.cs','PasswordBox.cs')) { 'dxaml/xcp/tools/XCPTypesAutoGen/Modules/Controls/' + $_.Name }
    elseif ($_.Name -eq 'AutoSuggestBox.cs') { 'dxaml/xcp/tools/XCPTypesAutoGen/Modules/AutoSuggestBox/AutoSuggestBox.cs' }
    elseif ($_.Name -in @('NumberBox.idl','NumberBox.cpp')) { 'controls/dev/NumberBox/' + $_.Name }
    else { throw ('Missing pinned source path: ' + $_.Name) })
    $file
})
Save-Json ([ordered]@{ capturedOn = '2026-11-07'; gallery = [ordered]@{ repository = 'https://github.com/microsoft/WinUI-Gallery'; path = $GalleryPath; commit = $actual; dirty = @(& git -C $GalleryPath status --porcelain); license = 'MIT' };
    resolvedNuget = $resolved; targetFramework = 'net9.0-windows10.0.22621.0';
    winui = [ordered]@{ repository = 'https://github.com/microsoft/microsoft-ui-xaml'; tag = 'winui3/release/2.5.4-experimental'; commit = '7b12709347527238494ca28cb9fed326d513e779'; license = 'MIT';
        correspondence = 'Same release label as the resolved umbrella package. Binary-to-source commit equivalence has not been established; NuGet nuspec does not provide a repository commit.' };
    referenceFiles = $fingerprints; winuiFiles = $sourceFiles }) 'references/baseline.json'
$xmlPath = Join-Path $root 'references/winui/NavigationView_themeresources.xaml'
[xml]$xml = Get-Content -LiteralPath $xmlPath -Raw
$xns = 'http://schemas.microsoft.com/winfx/2006/xaml'
$names = [ordered]@{ compactPaneLength = 'NavigationViewCompactPaneLength'; itemHeight = 'NavigationViewItemOnLeftMinHeight'; indicatorWidth = 'NavigationViewSelectionIndicatorWidth'; indicatorHeight = 'NavigationViewSelectionIndicatorHeight'; indicatorRadius = 'NavigationViewSelectionIndicatorRadius'; topPaneHeight = 'NavigationViewTopPaneHeight'; headerRowHeight = 'NavigationViewPaneHeaderRowMinHeight'; overflowWidth = 'TopNavigationViewOverflowButtonWidth' }
$ir = [ordered]@{ sourceCommit = '7b12709347527238494ca28cb9fed326d513e779'; source = 'controls/dev/NavigationView/NavigationView_themeresources.xaml' }
foreach ($field in $names.Keys) {
    $node = $xml.DocumentElement.ChildNodes | Where-Object { $_.GetAttribute('Key', $xns) -eq $names[$field] }
    if ($node.LocalName -ne 'Double') { throw "Unsupported or missing scalar: $($names[$field])" }
    $ir[$field] = [double]::Parse($node.InnerText, [Globalization.CultureInfo]::InvariantCulture)
}
foreach ($entry in @(@('headerMargin','NavigationViewHeaderMargin'),@('itemMargin','NavigationViewItemButtonMargin'))) {
    $node = $xml.SelectNodes('//*') | Where-Object { $_.GetAttribute('Key', $xns) -eq $entry[1] } | Select-Object -First 1
    $values = @($node.InnerText.Split(',') | ForEach-Object { [double]::Parse($_, [Globalization.CultureInfo]::InvariantCulture) })
    if ($values.Count -eq 1) { $values = @($values[0],$values[0],$values[0],$values[0]) }
    elseif ($values.Count -eq 2) { $values = @($values[0],$values[1],$values[0],$values[1]) }
    elseif ($values.Count -ne 4) { throw 'Unsupported Thickness' }
    $ir[$entry[0]] = $values
}
$style = $xml.SelectNodes('//*') | Where-Object { $_.GetAttribute('Key', $xns) -eq 'NavigationViewTitleHeaderContentControlTextStyle' } | Select-Object -First 1
$ir['headerFontSize'] = [double]($style.ChildNodes | Where-Object { $_.GetAttribute('Property') -eq 'FontSize' }).GetAttribute('Value')
Save-Json $ir 'references/navigation-template.json' 
Save-Json ([ordered]@{
    source = 'NavigationView_themeresources.xaml'; genericXamlRuntime = $false; extracted = $names;
    supported = @('Required scalar/Thickness/header font resources (build.rs)', 'Required ThemeResource aliases and native SDK palette leaves', 'Acrylic tint/luminosity/noise recipe via Canvas effects', '600ms bounded indicator stretch/opacity with continuous retarget', 'Gallery SamplePage1..7 and SampleSettingsPage: Grid/StackPanel/ScrollViewer/TextBlock/Ellipse, selected styles/resources, spans and alignment');
    extractionContract = 'build.rs and tools/extract_content.rs fail on unsupported required nodes/attributes/styles; no general template executor';
    deferred = @('Full bindings/converters and general XAML VisualState execution', 'Arbitrary AnimatedVisual sources and full present-time acceptance', 'AutoSuggestBox', 'PaneCustomContent/PaneFooter arbitrary content', 'Frame content transitions', 'Complete overflow recovery/flyout focus policy', 'Full UIA semantics', 'Direct2D/Composition exact effect equivalence');
    userExceptions = @('No browser CSS or Rust Canvas focus black frame; preserve focus/keyboard semantics')
}) 'references/template-report.json'
Copy-Item -LiteralPath (Join-Path $GalleryPath 'LICENSE') -Destination (Join-Path $root 'references/GALLERY-LICENSE')
Write-Output "Captured $($scope.Count) Gallery entries, $($navigation.samples.Count) NavigationView samples and $($sourceFiles.Count) WinUI source files."
