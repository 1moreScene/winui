import { readFileSync, writeFileSync } from 'node:fs';
import {audit as auditGallery} from './gallery-control-source.mjs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const enums = JSON.parse(read('references/api-enums.json'));
const gallerySubstitutes=auditGallery();
if(gallerySubstitutes.length)throw new Error(`Gallery contains HTML control substitutes: ${JSON.stringify(gallerySubstitutes)}`);
const controls = new Set(`MenuFlyoutItem ToggleMenuFlyoutItem RadioMenuFlyoutItem MenuFlyoutSubItem MenuFlyoutSeparator MenuBar MenuBarItem CommandBarFlyout RelativePanel WrapPanel AppBarSeparator Grid StackPanel TextBlock Button NavigationView Frame CalendarView CalendarDatePicker DatePicker TimePicker ColorPicker Image Ellipse ToggleButton CheckBox RadioButton RadioButtons ToggleSwitch ScrollViewer TextBox PasswordBox ProgressBar ProgressRing RepeatButton Viewbox Border Canvas HyperlinkButton Expander InfoBadge FontIcon SymbolIcon PathIcon BitmapIcon ImageIcon AnimatedIcon IconSourceElement Rectangle Line Path Polygon Polyline Popup ToolTip Flyout MenuFlyout Slider InfoBar PersonPicture RatingControl SplitButton ToggleSplitButton ItemsStackPanel ItemsWrapGrid VariableSizedWrapGrid ListView GridView AutoSuggestBox NumberBox ComboBox ContentDialog TeachingTip FlipView PipsPager BreadcrumbBar TreeView TabView AppBarButton AppBarToggleButton DropDownButton SelectorBar CommandBar`.split(' '));
const shapes = new Set(['Ellipse','Rectangle','Line','Path','Polygon','Polyline']);
const internals = {
  CollectionItem: 'Internal realized ListView/GridView item container, owned by the collection; no standalone React control.',
  CollectionHeader: 'Internal collection group-header presenter, owned by the collection; no standalone React control.',
};
const adapters = {
  Frame: 'Microsoft.UI.Xaml.Controls.Frame: Rust journal, cache and motion with a React DOM content host; sources in references/frame-sources.json.',
  WinUIProvider: 'WASM runtime ownership and React context, not a visual control.',
  SceneView: 'Canvas rendering host, not a visual control.',
  SceneNavigationView: 'React adapter to the existing NavigationView inside a shared scene.',
};
const nodeKinds = Object.keys(enums.NodeKind.members).map(name => {
  if (internals[name]) return { name, classification: 'internal rendering machinery', reason: internals[name] };
  if (!controls.has(name)) throw new Error(`NodeKind ${name} has no reviewed WinUI control origin.`);
  return { name, classification: 'WinUI control', nativeType: `Microsoft.UI.Xaml.${shapes.has(name) ? 'Shapes' : 'Controls'}.${name}` };
});
const react = read('gallery/src/react.tsx');
const exports = [...react.matchAll(/export function (\w+)/g)].map(match => match[1]);
for (const name of exports) if (!controls.has(name) && !adapters[name]) throw new Error(`React export ${name} needs an origin review.`);
for (const path of ['gallery/src/react.tsx','gallery/src/scene.ts','gallery/src/enums.ts','src/enums.rs',
  'src/scene/mod.rs','src/scene/input.rs','src/scene/layout.rs','src/scene/properties.rs'])
  if (/\bInputProbe\b|\binputProbe\b|data-input-probe/.test(read(path))) throw new Error(`Retired prototype remains in ${path}`);
const record = { date:'2026-11-08', baseline:'Microsoft.WindowsAppSDK.WinUI/2.3.10-experimental',
  removed:['InputProbe React component','Panel.inputProbe factory','InputProbe NodeKind and render/input branches','legacy composition/commit prototype protocol'],
  replacement:'Real TextBox with EditorHost and EditComposition protocol', nodeKinds,
  galleryInterface:{htmlControlSubstitutes:gallerySubstitutes.length,sourceAudit:'tools/gallery-control-source.mjs --check',runtimeAudit:'gallery/tests/gallery-controls.spec.ts',implementation:'Existing SDK controls mounted through GalleryControls.tsx; no alternate checkbox, dropdown, button or expander state machine.'},
  reactAdapters:adapters, notes:['Origins classify APIs, not implementation completeness or native visual parity.','Scene/Panel/runtime/renderer and host bridges are infrastructure, not additional user-facing controls.','Historical validation records retain the prototype name as evidence of the old run.'] };
writeFileSync(new URL('../references/control-origins.json',import.meta.url),JSON.stringify(record,null,2)+'\n');
console.log(`Reviewed ${nodeKinds.length} runtime kinds and ${exports.length} React exports; no custom prototype control remains.`);
