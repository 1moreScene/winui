import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const cpp=read('references/winui/NavigationView.cpp');
const section=cpp.slice(cpp.indexOf('void NavigationView::CreateAndAttachHeaderAnimation'));
const curve=section.match(/CreateCubicBezierEasingFunction\(\{\s*([\d.]+)f?,\s*([\d.]+)f?\s*\},\s*\{\s*([\d.]+)f?,\s*([\d.]+)f?\s*\}/);
const duration=section.match(/moveAnimation\.Duration\((\d+)ms\)/);
const xaml=read('references/winui/NavigationView_themeresources.xaml');
const split=read('references/winui/SplitView_themeresources.xaml');
// Read the exact left-side SplitView transition used by NavigationView.
// CompactInline closes through OpenInlineLeft -> ClosedCompactLeft, whose
// clip track uses OpenDuration; generic Inline -> Closed is a different track.
function paneTrack(from,to){
 const transition=split.match(new RegExp(`<VisualTransition From="${from}" To="${to}">([\\s\\S]*?)</VisualTransition>`))?.[1];
 const track=transition?.match(/<DoubleAnimationUsingKeyFrames[^>]*Storyboard.TargetName="PaneClipRectangleTransform"[^>]*>([\s\S]*?)<\/DoubleAnimationUsingKeyFrames>/)?.[1];
 const key=track?.match(/<SplineDoubleKeyFrame[^>]*>/)?.[0];
 if(!key)throw new Error(`Missing pane clip track ${from} -> ${to}`);
 let time=key.match(/KeyTime="([^"]+)"/)?.[1];
 if(time?.startsWith('{StaticResource ')){
  const resource=time.slice(16,-1);
  time=split.match(new RegExp(`<x:String x:Key="${resource}">([^<]+)</x:String>`))?.[1];
 }
 const clock=time?.split(':').map(Number),spline=key.match(/KeySpline="([^"]+)"/)?.[1].split(/[ ,]+/).map(Number);
 if(clock?.length!==3||spline?.length!==4)throw new Error(`Invalid pane timing ${from} -> ${to}`);
 return {from,to,target:'PaneClipRectangleTransform.TranslateX',durationMs:(clock[0]*3600+clock[1]*60+clock[2])*1000,curve:spline};
}
const pane={inlineOpen:paneTrack('ClosedCompactLeft','OpenInlineLeft'),inlineClose:paneTrack('OpenInlineLeft','ClosedCompactLeft'),
 compactOpen:paneTrack('ClosedCompactLeft','OpenCompactOverlayLeft'),compactClose:paneTrack('OpenCompactOverlayLeft','ClosedCompactLeft'),
 overlayOpen:paneTrack('Closed','OpenOverlayLeft'),overlayClose:paneTrack('OpenOverlayLeft','Closed')};
if(!curve||!duration||!xaml.includes('AnimatedChevronUpDownSmallVisualSource'))throw new Error('Pinned NavigationView animation source changed');
const native=JSON.parse(read('references/navigation-motion-native.json'));
const rgba=color=>`#${color.slice(3)}${color.slice(1,3)}`.toLowerCase();
const materials=native.records.filter(r=>r.action==='native-materials').map(r=>({theme:r.theme,
 expanded:{kind:r.expanded.kind,color:rgba(r.expanded.color)},
 overlay:{tintColor:rgba(r.overlay.tint),tintOpacity:r.overlay.tintOpacity,luminosityOpacity:r.overlay.luminosityOpacity,fallbackColor:rgba(r.overlay.fallback)}}));
const sources=['references/winui/NavigationView.cpp','references/winui/NavigationViewItem.cpp','references/winui/NavigationView_themeresources.xaml','references/winui/SplitView_themeresources.xaml','references/winui/ThemeTransitions.cpp','references/animated-icons.json','references/navigation-motion-native.json'];
const contract={commit:'7b12709347527238494ca28cb9fed326d513e779',reposition:{durationMs:Number(duration[1]),curve:curve.slice(1).map(Number)},pane,chevronSource:'ChevronUpDownSmall',materials,
 sources:sources.map(path=>({path,sha256:createHash('sha256').update(readFileSync(new URL(path,root))).digest('hex')})),
 boundary:'Source parameters plus live same-SDK own-window observations; not Store release Composition present-time acceptance.'};
const output=new URL('references/navigation-motion-contract.json',root),content=JSON.stringify(contract,null,2)+'\n';
// Rust can map this include_str! input during a concurrent Windows build.
// Preserve unchanged inputs instead of truncating them and invalidating Cargo.
if(!existsSync(output)||readFileSync(output,'utf8').replaceAll('\r\n','\n')!==content)writeFileSync(output,content);
console.log('Extracted native NavigationView offset recipe, chevron source and observed pane materials');
