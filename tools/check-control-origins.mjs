import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import {posix} from 'node:path';
import {audit as auditGallery,walk} from './gallery-control-source.mjs';
import {auditFrontend,auditReact,parse} from './control-implementation-audit.mjs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const enums = JSON.parse(read('references/api-enums.json'));
const gallerySubstitutes=auditGallery();
if(gallerySubstitutes.length)throw new Error(`Gallery contains HTML control substitutes: ${JSON.stringify(gallerySubstitutes)}`);
const controls = new Set(`NavigationViewItem TableView MenuFlyoutItem ToggleMenuFlyoutItem RadioMenuFlyoutItem MenuFlyoutSubItem MenuFlyoutSeparator MenuBar MenuBarItem CommandBarFlyout RelativePanel WrapPanel AppBarSeparator Grid StackPanel TextBlock Button NavigationView Frame CalendarView CalendarDatePicker DatePicker TimePicker ColorPicker Image Ellipse ToggleButton CheckBox RadioButton RadioButtons ToggleSwitch ScrollViewer TextBox RichEditBox PasswordBox ProgressBar ProgressRing RepeatButton Viewbox Border Canvas HyperlinkButton Expander InfoBadge FontIcon SymbolIcon PathIcon BitmapIcon ImageIcon AnimatedIcon IconSourceElement Rectangle Line Path Polygon Polyline Popup ToolTip Flyout MenuFlyout Slider InfoBar PersonPicture RatingControl SplitButton ToggleSplitButton ItemsStackPanel ItemsWrapGrid VariableSizedWrapGrid ListView GridView AutoSuggestBox NumberBox ComboBox ContentDialog TeachingTip FlipView PipsPager BreadcrumbBar TreeView TabView AppBarButton AppBarToggleButton DropDownButton SelectorBar CommandBar`.split(' '));
for(const name of `SplitView SemanticZoom ParallaxView UICommand StandardCommand ItemsRepeater RefreshContainer RefreshVisualizer ScrollView SwipeControl ItemsView AnnotatedScrollBar PagerControl LayoutPanel RichTextBlock RichTextBlockOverflow ContentControl ContentPresenter UserControl Page ScrollBar Thumb TickBar ScrollContentPresenter ItemsPresenter`.split(' '))controls.add(name);
const shapes = new Set(['Ellipse','Rectangle','Line','Path','Polygon','Polyline']);
const internals = {
  NavigationViewItemHeader:'Source-native group-header template container, owned by NavigationView.',
  NavigationViewItemSeparator:'Source-native separator template container, owned by NavigationView.',
  NavigationViewItemPresenter:'Source-native item template presenter, owned by NavigationView.',
  ItemsRepeaterScrollHost:'Source-native viewport template part, owned by NavigationView.',
  CollectionItem: 'Internal realized ListView/GridView item container, owned by the collection; no standalone React control.',
  CollectionHeader: 'Internal collection group-header presenter, owned by the collection; no standalone React control.',
};
const adapters = {
  NavigationViewContent:"React projection of a named Rust NavigationView slot; no independent control behavior.",
  Frame: 'Microsoft.UI.Xaml.Controls.Frame: Rust journal, cache and motion with a React DOM content host; sources in references/frame-sources.json.',
  WinUIProvider: 'WASM runtime ownership and React context, not a visual control.',
  SceneView: 'Canvas rendering host, not a visual control.',
  SceneNavigationView: 'React adapter to the existing NavigationView inside a shared scene.',
  SceneFrame: 'React adapter to the Rust Frame node in a shared scene.',
  RichInline: 'Named Rust Grid content slot inside a RichTextBlock, not another text renderer.',
};
const files=(directory,suffixes)=>readdirSync(new URL(`../${directory}/`,import.meta.url),{recursive:true}).filter(path=>suffixes.some(s=>path.endsWith(s))).map(path=>`${directory}/${path.replaceAll('\\','/')}`);
const rust=files('src',['.rs']).filter(path=>path!=='src/enums.rs').map(path=>({path,text:read(path)}));
const directImplementations={NavigationView:['src/navigation.rs','src/render.rs'],Frame:['src/frame.rs']};
const implementation=name=>rust.flatMap(({path,text})=>{const match=new RegExp(`\\bNodeKind::${name}\\b`).exec(text);return match?[{path,line:text.slice(0,match.index).split('\n').length}]:directImplementations[name]?.includes(path)?[{path}]:[];});
const wasm=read('src/wasm.rs');
const bridges={
  'packages/winui-wasm/src/scene.ts':['scene_create','scene_node','scene_update','scene_input','scene_frame','scene_destroy'],
  'packages/winui-wasm/src/sdk.ts':['template','animated_icon_info'],
  'packages/winui-wasm/src/frame.ts':['navigation_frame_create','navigation_frame_command','navigation_frame_tick','navigation_frame_destroy'],
};
for(const [path,methods] of Object.entries(bridges))for(const method of methods){
  if(!new RegExp(`\\braw\\s*\\.\\s*${method}\\s*\\(`).test(read(path))||!new RegExp(`pub fn ${method}\\b`).test(wasm))throw new Error(`${path} lost the Rust WASM bridge ${method}`);
}
const primitiveNames=new Set(['ScrollBar','Thumb','TickBar']);
const nativeAliases={TableView:'WinUI.TableView.TableView',UICommand:'Microsoft.UI.Xaml.Input.XamlUICommand',StandardCommand:'Microsoft.UI.Xaml.Input.StandardUICommand',WrapPanel:'CommunityToolkit.WinUI.Controls.WrapPanel'};
const nodeKinds = Object.keys(enums.NodeKind.members).map(name => {
  const rustImplementation=implementation(name);
  if(!rustImplementation.length)throw new Error(`NodeKind ${name} has no Rust runtime implementation reference.`);
  if (internals[name]) return { name, classification: 'internal rendering machinery', reason: internals[name],rustImplementation };
  if (!controls.has(name)) throw new Error(`NodeKind ${name} has no reviewed WinUI control origin.`);
  return { name, classification: 'WinUI control', nativeType: nativeAliases[name]??`Microsoft.UI.Xaml.${shapes.has(name) ? 'Shapes' : primitiveNames.has(name)?'Controls.Primitives':'Controls'}.${name}`,rustImplementation };
});
const react = read('packages/winui-wasm/src/react.tsx');
const reactAudit=auditReact(react);
if(reactAudit.errors.length)throw new Error(reactAudit.errors.join('\n'));
const exports = reactAudit.exports;
for (const name of exports) if (!controls.has(name) && !adapters[name]) throw new Error(`React export ${name} needs an origin review.`);
for(const {name} of nodeKinds)if(!internals[name]&&!reactAudit.kinds.includes(name))throw new Error(`${name} is missing a React-to-Rust node adapter.`);
const frontend=[...files('gallery/src',['.tsx','.ts','.jsx','.js','.mts','.mjs','.cts','.cjs']),...files('packages/winui-wasm/src',['.tsx','.ts'])].filter(path=>!path.includes('/wasm/'));
const frontendErrors=frontend.flatMap(path=>auditFrontend(path,read(path)));
if(frontendErrors.length)throw new Error(`Frontend control implementations must call Rust: ${JSON.stringify(frontendErrors,null,2)}`);
// The framework-independent SDK and its local imports must stay React-free.
const visited=new Set();
function checkSdk(path){if(visited.has(path))return;visited.add(path);const specifiers=new Set();
  walk(parse(path,read(path)),node=>{if(['ImportDeclaration','ExportNamedDeclaration','ExportAllDeclaration','ImportExpression'].includes(node.type)&&typeof node.source?.value==='string')specifiers.add(node.source.value);});
  for(const specifier of specifiers){
    if(/^react(?:-dom)?(?:\/|$)/.test(specifier))throw new Error(`React dependency in basic SDK: ${path}`);
    if(specifier.startsWith('.')&&!specifier.includes('?')){
      const target=posix.normalize(posix.join(posix.dirname(path),specifier));
      const relative=['','.ts','.tsx','/index.ts'].map(suffix=>target+suffix).find(candidate=>/\.tsx?$/.test(candidate)&&existsSync(new URL(`../${candidate}`,import.meta.url)));
      if(relative)checkSdk(relative);
    }
  }
}
checkSdk('packages/winui-wasm/src/index.ts');
for (const path of ['packages/winui-wasm/src/react.tsx','packages/winui-wasm/src/scene.ts','packages/winui-wasm/src/enums.ts','src/enums.rs',
  'src/scene/mod.rs','src/scene/input.rs','src/scene/layout.rs','src/scene/properties.rs'])
  if (/\bInputProbe\b|\binputProbe\b|data-input-probe/.test(read(path))) throw new Error(`Retired prototype remains in ${path}`);
const record = { date:'2026-11-09', baseline:'Microsoft.WindowsAppSDK.WinUI/2.3.10-experimental',
  removed:['InputProbe React component','Panel.inputProbe factory','InputProbe NodeKind and render/input branches','legacy composition/commit prototype protocol'],
  replacement:'Real TextBox with EditorHost and EditComposition protocol', nodeKinds,
  galleryInterface:{htmlControlSubstitutes:gallerySubstitutes.length,sourceAudit:'tools/check-control-origins.mjs --check',runtimeAudit:'gallery/tests/gallery-controls.spec.ts and navigation-external-content.spec.ts',implementation:'Existing SDK controls mounted through GalleryControls.tsx; navigation dismiss paint, timelines, geometry and input belong to Rust.'},
  implementationBoundary:{reactExports:exports,frontendFiles:frontend.length,reactFreeSdkFiles:visited.size,wasmBridges:bridges,rules:['Every official React control reaches the shared Rust SDK adapter.','Every runtime NodeKind has reviewed origin and Rust implementation references.','No frontend HTML/ARIA control substitutes or navigation dismiss handlers.','React control adapters contain only approved DOM content hosts; no frontend painting, animation or input capture.'],limitations:'Static checks enforce known boundaries and reject unreviewed additions; runtime regressions and code review remain necessary for semantic correctness.'},
  reactAdapters:adapters, notes:['Origins classify APIs, not implementation completeness or native visual parity.','WrapPanel follows the pinned Gallery CommunityToolkit source, not an invented Microsoft control.','Scene/Panel/runtime/renderer and host bridges are infrastructure, not additional user-facing controls.','Historical validation records retain the prototype name as evidence of the old run.'] };
if(!process.argv.includes('--check'))writeFileSync(new URL('../references/control-origins.json',import.meta.url),JSON.stringify(record,null,2)+'\n');
console.log(`Reviewed ${nodeKinds.length} runtime kinds, ${exports.length} React exports and ${frontend.length} frontend files; Rust SDK boundaries passed.`);
