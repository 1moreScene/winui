import official from './official-home.json';

/** Existing Gallery sample pages; an entry means a demo exists, not full parity. */
const implemented: Record<string, string> = {
  TableView: '#table-view', Segmented:'#segmented',
  ConnectedAnimation:'#connected-animation',ThemeTransition:'#theme-transitions',XamlCompInterop:'#xaml-comp-interop',
  CustomUserControls:'#custom-user-controls',PageTransition:'#page-transitions',
  ItemsView:'#items-view',AnnotatedScrollBar:'#annotated-scroll-bar',PagerControl:'#pager-control',LayoutPanel:'#layout-panel',RichTextBlock:'#rich-text-block',
  SplitView:'#split-view',SemanticZoom:'#semantic-zoom',ParallaxView:'#parallax-view',XamlUICommand:'#ui-command',StandardUICommand:'#standard-command',
  ItemsRepeater:"#items-repeater",PullToRefresh:"#pull-to-refresh",
  MenuBar:"#menu-bar",CommandBarFlyout:"#command-bar-flyout",RelativePanel:"#relative-panel",WrapPanel:"#wrap-panel",
  CalendarView:'#calendar-view',CalendarDatePicker:'#calendar-date-picker',DatePicker:'#date-picker',TimePicker:'#time-picker',ColorPicker:'#color-picker',
  AppBarSeparator:'#app-bar-separator', AppBarButton:"#app-bar-button",AppBarToggleButton:"#app-bar-toggle-button",DropDownButton:"#drop-down-button",SelectorBar:"#selector-bar",CommandBar:"#command-bar",
  Button: '#button', HyperlinkButton: '#hyperlink-button', RepeatButton: '#repeat-button',
  ToggleButton: '#toggle-button', SplitButton: '#split-button', ToggleSplitButton: '#toggle-split-button',
  CheckBox: '#checkbox', ComboBox: '#combo-box', RadioButton: '#radio-button', RatingControl: '#rating-control',
  Slider: '#slider', ToggleSwitch: '#toggle-switch', InfoBadge: '#info-badge', InfoBar: '#info-bar',
  ProgressBar: '#progress-bar', ProgressRing: '#progress-ring', ToolTip: '#tool-tip',
  ContentDialog: '#content-dialog', Flyout: '#flyout', Popup: '#popup', TeachingTip: '#teaching-tip',
  MenuFlyout: '#menu-flyout', FlipView: '#flip-view', GridView: '#grid-view', ListView: '#list-view',
  TreeView: '#tree-view', PipsPager: '#pips-pager', ScrollViewer: '#scroll-viewer',
  Border: '#border', Canvas: '#canvas', Expander: '#expander', Grid: '#grid', VariableSizedWrapGrid: '#variable-sized-wrap-grid',
  Viewbox: '#viewbox', BreadcrumbBar: '#breadcrumb-bar', NavigationView: '#navigation-view', TabView: '#tab-view',
  Image: '#image', PersonPicture: '#person-picture', Acrylic: '#acrylic', AnimatedIcon: '#animated-icon',
  IconElement: '#icon-element', Line: '#line', Shape: '#shapes', RadialGradientBrush: '#gradients',
  SystemBackdrops: '#system-backdrops', AutoSuggestBox: '#auto-suggest-box', NumberBox: '#number-box',
  RichEditBox:'#rich-edit-box', PasswordBox: '#password-box', TextBlock: '#textblock', TextBox: '#text-box',
  EasingFunction: '#easing', ImplicitTransition: '#transitions',
};
const excluded: Record<string, string> = {
  Chart: '官方 Chart / Charts 不在实现范围。',
  Sound: 'Sound 不在实现范围。', WebView2: 'WebView2 不在实现范围。',
  MapControl: 'MapControl 不在实现范围。', InkCanvas: 'InkCanvas / InkToolbar 不在实现范围。',
};

export const galleryGroups = [
  ...official.groups.filter(g => g.special),
  ...official.groups.filter(g => !g.special).sort((a, b) => a.title.localeCompare(b.title, 'en')),
  {id:'CommunityControls',title:'Community controls',special:false,icon:'\uE734',items:[
    {id:'Segmented',title:'Segmented',subtitle:'A selectable group of equal or content-sized segments.',description:'CommunityToolkit Segmented supports single or multiple selection, horizontal and vertical layouts, and Default, Pivot and Button styles.',image:'/community-segmented/Segmented.png',sourcePath:'CommunityToolkit/Windows/components/Segmented',samplePage:'Gallery/SegmentedPage.tsx',tags:['segmented','community toolkit','selection','toggle','tabs'],namespace:'CommunityToolkit.WinUI.Controls',baseClasses:['Object','DependencyObject','UIElement','FrameworkElement','Control','ItemsControl','ListViewBase'],experimental:false,isNew:true,isUpdated:false,docs:[{Title:'CommunityToolkit Segmented',Uri:'https://github.com/CommunityToolkit/Windows/tree/a2fa47ad72cb95ed81f3ff0885da627a5fd6c14e/components/Segmented'}]}
  ]}
];
export const galleryItems = galleryGroups.flatMap(group => group.items.map(item => ({
  ...item, ...(item.id==='TableView'?{description:'An editable data grid with sorting, filtering, templates and virtualized rows. Community WinUI.TableView (MIT).',subtitle:'Community WinUI.TableView data grid.',namespace:'WinUI.TableView',baseClasses:['Object','DependencyObject','UIElement','FrameworkElement','Control','ItemsControl','ListViewBase','ListView'],experimental:false,tags:['table','data grid','editing','sorting','filtering','virtualization','community'],docs:[{Title:'Community TableView documentation',Uri:'https://github.com/w-ahmad/WinUI.TableView/blob/665fea52b8ad47a64187d0f202d5281b074f616f/README.md'}]}:{}),communitySource:item.id==='TableView'?{repository:'https://github.com/w-ahmad/WinUI.TableView',commit:'665fea52b8ad47a64187d0f202d5281b074f616f',sample:'samples/WinUI.TableView.SampleApp/Pages/OverviewPage.xaml',license:'LICENSE.md',label:'WinUI.TableView'}:item.id==='Segmented'?{repository:'https://github.com/CommunityToolkit/Windows',commit:'a2fa47ad72cb95ed81f3ff0885da627a5fd6c14e',sample:'components/Segmented/samples/SegmentedBasicSample.xaml',license:'License.md',label:'Windows Community Toolkit'}:undefined, groupId: group.id, groupTitle: group.title,
  implemented: !!implemented[item.id], href: implemented[item.id] ?? `#sample/${item.id}`,
  excludedReason: excluded[item.id] ?? '',
}))).sort((a, b) => a.title.localeCompare(b.title, 'en'));
export type GalleryItem = typeof galleryItems[number];
export const itemById = new Map(galleryItems.map(item => [item.id, item]));
export function itemForRoute(route: string) {
  const sdkAliases:Record<string,{id:string;title:string}>={'#scroll-bar':{id:'ScrollViewer',title:'ScrollBar'},'#thumb':{id:'Slider',title:'Thumb'},'#tick-bar':{id:'Slider',title:'TickBar'},'#items-presenter':{id:'ListView',title:'ItemsPresenter'},'#scroll-content-presenter':{id:'ScrollViewer',title:'ScrollContentPresenter'},'#menu-items':{id:'MenuFlyout',title:'Menu item controls'},'#menu-flyout-item':{id:'MenuFlyout',title:'MenuFlyoutItem'},'#toggle-menu-flyout-item':{id:'MenuFlyout',title:'ToggleMenuFlyoutItem'},'#radio-menu-flyout-item':{id:'MenuFlyout',title:'RadioMenuFlyoutItem'},'#menu-flyout-sub-item':{id:'MenuFlyout',title:'MenuFlyoutSubItem'},'#menu-flyout-separator':{id:'MenuFlyout',title:'MenuFlyoutSeparator'},'#content-control':{id:'CustomUserControls',title:'ContentControl'},'#content-presenter':{id:'CustomUserControls',title:'ContentPresenter'},'#user-control':{id:'CustomUserControls',title:'UserControl'},'#page':{id:'PageTransition',title:'Page'},'#scene-frame':{id:'PageTransition',title:'Frame'},'#stack-layout':{id:'ItemsRepeater',title:'ItemsRepeater'},'#uniform-grid-layout':{id:'ItemsRepeater',title:'ItemsRepeater'},'#refresh-container':{id:'PullToRefresh',title:'PullToRefresh'},'#refresh-visualizer':{id:'PullToRefresh',title:'PullToRefresh'}};
  const alias=sdkAliases[route];if(alias){const base=galleryItems.find(item=>item.id===alias.id);if(base)return {...base,title:alias.title,href:route};}
  return galleryItems.find(item => item.href === route);
}

export function readGalleryList(key: string): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string' && itemById.has(id)))] : [];
  } catch { return []; }
}
export function writeGalleryList(key: string, value: string[]) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Browsing still works without storage. */ }
}
export const recentKey = 'winui-gallery.recent';
export const favoritesKey = 'winui-gallery.favorites';
