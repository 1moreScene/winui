import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const cpp=read('references/winui/NavigationView.cpp');
const section=cpp.slice(cpp.indexOf('void NavigationView::CreateAndAttachHeaderAnimation'));
const curve=section.match(/CreateCubicBezierEasingFunction\(\{\s*([\d.]+)f?,\s*([\d.]+)f?\s*\},\s*\{\s*([\d.]+)f?,\s*([\d.]+)f?\s*\}/);
const duration=section.match(/moveAnimation\.Duration\((\d+)ms\)/);
const xaml=read('references/winui/NavigationView_themeresources.xaml');
if(!curve||!duration||!xaml.includes('AnimatedChevronUpDownSmallVisualSource'))throw new Error('Pinned NavigationView animation source changed');
const native=JSON.parse(read('references/navigation-motion-native.json'));
const rgba=color=>`#${color.slice(3)}${color.slice(1,3)}`.toLowerCase();
const materials=native.records.filter(r=>r.action==='native-materials').map(r=>({theme:r.theme,
 expanded:{kind:r.expanded.kind,color:rgba(r.expanded.color)},
 overlay:{tintColor:rgba(r.overlay.tint),tintOpacity:r.overlay.tintOpacity,luminosityOpacity:r.overlay.luminosityOpacity,fallbackColor:rgba(r.overlay.fallback)}}));
const sources=['references/winui/NavigationView.cpp','references/winui/NavigationViewItem.cpp','references/winui/NavigationView_themeresources.xaml','references/winui/ThemeTransitions.cpp','references/animated-icons.json','references/navigation-motion-native.json'];
const contract={commit:'7b12709347527238494ca28cb9fed326d513e779',reposition:{durationMs:Number(duration[1]),curve:curve.slice(1).map(Number)},chevronSource:'ChevronUpDownSmall',materials,
 sources:sources.map(path=>({path,sha256:createHash('sha256').update(readFileSync(new URL(path,root))).digest('hex')})),
 boundary:'Source parameters plus live same-SDK own-window observations; not Store release Composition present-time acceptance.'};
writeFileSync(new URL('references/navigation-motion-contract.json',root),JSON.stringify(contract,null,2)+'\n');
console.log('Extracted native NavigationView offset recipe, chevron source and observed pane materials');
