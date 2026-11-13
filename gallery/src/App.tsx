import { GalleryLanguageProvider } from "./GalleryLanguage";
import { lazy, Suspense, useEffect, useState } from "react";
import { type WinUI, type NavigationViewController as Controller, type FrameController as Frame, type PageStackEntry } from "winui-wasm";
import { GalleryPageLoading } from "./GalleryPageLoading";
import { GalleryShell } from './HomePage';
import { itemForRoute, readGalleryList, writeGalleryList, recentKey } from './gallery-catalog';

const SegmentedPage=lazy(()=>import('./SegmentedPage').then(m=>({default:m.SegmentedPage})));
const TableViewPage=lazy(()=>import('./TableViewPage').then(m=>({default:m.TableViewPage})));
const MotionPages=lazy(()=>import('./MotionPages').then(m=>({default:m.MotionPages})));
const MenuItemControlsPage=lazy(()=>import('./MenuItemControlsPage').then(m=>({default:m.MenuItemControlsPage})));
const ReadingControlsPage=lazy(()=>import('./ReadingControlsPage').then(m=>({default:m.ReadingControlsPage})));
const ScrollPrimitivesPage=lazy(()=>import('./ScrollPrimitivesPage').then(m=>({default:m.ScrollPrimitivesPage})));
const ContentHostsPage=lazy(()=>import('./ContentHostsPage').then(m=>({default:m.ContentHostsPage})));
const ViewCommandPage=lazy(()=>import('./ViewCommandPage').then(m=>({default:m.ViewCommandPage})));
const RepeaterRefreshPage=lazy(()=>import('./RepeaterRefreshPage').then(m=>({default:m.RepeaterRefreshPage})));
const MenuLayoutPage=lazy(()=>import('./MenuLayoutPage').then(m=>({default:m.MenuLayoutPage})));
const PickerControlsPage=lazy(()=>import('./PickerControlsPage').then(m=>({default:m.PickerControlsPage})));
const AppBarSeparatorPage=lazy(()=>import('./AppBarSeparatorPage').then(m=>({default:m.AppBarSeparatorPage})));
const CommandControlsPage=lazy(()=>import('./CommandControlsPage').then(m=>({default:m.CommandControlsPage})));
const NavigationControlsPage=lazy(()=>import('./NavigationControlsPage').then(m=>({default:m.NavigationControlsPage})));
const ComposedControlsPage=lazy(()=>import('./ComposedControlsPage').then(m=>({default:m.ComposedControlsPage})));
const CompactControlsPage=lazy(()=>import('./CompactControlsPage').then(m=>({default:m.CompactControlsPage})));
const CollectionsPage=lazy(()=>import('./CollectionsPage').then(m=>({default:m.CollectionsPage})));
const OverlaysPage=lazy(()=>import("./OverlaysPage").then(m=>({default:m.OverlaysPage})));
const ShapesPage=lazy(()=>import("./ShapesPage").then(m=>({default:m.ShapesPage})));
const AnimatedIconPage=lazy(()=>import("./AnimatedIconPage").then(m=>({default:m.AnimatedIconPage})));
const IconsPage=lazy(()=>import("./IconsPage").then(m=>({default:m.IconsPage})));
const FiveControlsPage=lazy(()=>import("./FiveControlsPage").then(m=>({default:m.FiveControlsPage})));
const GridPage=lazy(()=>import('./GridPage').then(m=>({default:m.GridPage})));
const BasicNextPage = lazy(() => import("./BasicNextPage").then(module=>({default:module.BasicNextPage})));
const ProgressPage = lazy(() => import("./ProgressPage").then(module => ({default: module.ProgressPage})));
const RichEditBoxPage=lazy(()=>import("./RichEditBoxPage").then(m=>({default:m.RichEditBoxPage})));
const TextScrollPage = lazy(() => import("./TextScrollPage").then(module => ({default: module.TextScrollPage})));
const InputControlsPage = lazy(() => import("./InputControlsPage").then(module => ({default: module.InputControlsPage})));
const NavigationPage = lazy(() => import("./NavigationPage").then(m => ({default: m.NavigationPage})));
const BasicControlsPage = lazy(() => import("./BasicControlsPage").then(m => ({default: m.BasicControlsPage})));
const AcrylicPage = lazy(() => import("./MaterialsPage").then(m => ({default: m.AcrylicPage})));
const EasingPage = lazy(() => import("./MaterialsPage").then(m => ({default: m.EasingPage})));
const GradientPage = lazy(() => import("./MaterialsPage").then(m => ({default: m.GradientPage})));
const SystemBackdropsPage = lazy(() => import("./MaterialsPage").then(m => ({default: m.SystemBackdropsPage})));
const PropertyTransitionsPage = lazy(() => import("./MaterialsPage").then(m => ({default: m.PropertyTransitionsPage})));
const EffectsPage = lazy(() => import("./EffectsPage").then(m => ({default: m.EffectsPage})));
const ButtonPage = lazy(() => import("./ButtonPage").then(m => ({default: m.ButtonPage})));
const FoundationPage = lazy(() => import("./ButtonPage").then(m => ({default: m.FoundationPage})));

declare global {
  interface Window {
    gallery: {
      sdk: WinUI;
      views: Controller[];
      sampleFrames?:import("winui-wasm").SceneFrameController[];
      readyMs: number;
      appReadyMs?: number;
      create: WinUI["navigationView"];
      /** The application's shared, real Rust NavigationView. */
      navigation?: Controller;
      frame?: Frame<PageStackEntry>;
    };
  }
}
export function App({ sdk }: { sdk: WinUI }) {
  const [hash, setHash] = useState(location.hash);
  // Replace the original landing routes as well as the bare application URL.
  const route = hash === '#overview' ? '#home' : hash === '#samples' ? '#all' : hash;
  useEffect(() => {
    const update = () => setHash(location.hash);
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  useEffect(() => {
    const item = itemForRoute(route);
    document.title = item ? `${item.title} · WinUI Gallery` : 'WinUI Gallery';
    if (item) writeGalleryList(recentKey, [item.id, ...readGalleryList(recentKey).filter(id => id !== item.id)].slice(0, 10));
  }, [route]);
  return <GalleryLanguageProvider><GalleryShell sdk={sdk} route={route} renderPage={page => {
    const content = samplePage(page, sdk);
    return content ? <Suspense key={page} fallback={<GalleryPageLoading />}>{content}</Suspense> : null;
  }} /></GalleryLanguageProvider>;
}

function samplePage(route: string, sdk: WinUI) {
  if (!route || ['#home', '#all', '#settings'].includes(route) || route.startsWith('#category/') || route.startsWith('#sample/'))
    return null;
  if (route === '#navigation-view' || route === '#baseline' || /^#example-\d+$/.test(route))
    return <NavigationPage sdk={sdk} />;
  const menuItemRoutes:Record<string,string>={'#menu-items':'Menu item controls','#menu-flyout-item':'MenuFlyoutItem','#toggle-menu-flyout-item':'ToggleMenuFlyoutItem','#radio-menu-flyout-item':'RadioMenuFlyoutItem','#menu-flyout-sub-item':'MenuFlyoutSubItem','#menu-flyout-separator':'MenuFlyoutSeparator'};
  if(menuItemRoutes[route])return <MenuItemControlsPage key={route} title={menuItemRoutes[route]}/>;
  const repeaterRefreshRoutes={'#items-repeater':'ItemsRepeater','#stack-layout':'StackLayout','#uniform-grid-layout':'UniformGridLayout','#pull-to-refresh':'RefreshContainer','#refresh-container':'RefreshContainer','#refresh-visualizer':'RefreshVisualizer'} as const;
  if(route in repeaterRefreshRoutes)return <RepeaterRefreshPage key={route} kind={repeaterRefreshRoutes[route as keyof typeof repeaterRefreshRoutes]}/>;
  const viewCommandRoutes={'#split-view':'SplitView','#semantic-zoom':'SemanticZoom','#parallax-view':'ParallaxView','#ui-command':'XamlUICommand','#standard-command':'StandardUICommand'} as const;
  const readingRoutes={'#items-view':'ItemsView','#annotated-scroll-bar':'AnnotatedScrollBar','#pager-control':'PagerControl','#layout-panel':'LayoutPanel','#rich-text-block':'RichTextBlock'}as const;
  if(route in readingRoutes)return <ReadingControlsPage key={route} kind={readingRoutes[route as keyof typeof readingRoutes]}/>;
  if(route in viewCommandRoutes)return <ViewCommandPage key={route} kind={viewCommandRoutes[route as keyof typeof viewCommandRoutes]}/>;
  const pickerRoutes={'#calendar-view':'CalendarView','#calendar-date-picker':'CalendarDatePicker','#date-picker':'DatePicker','#time-picker':'TimePicker','#color-picker':'ColorPicker'} as const;
  if(route in pickerRoutes)return <PickerControlsPage key={route} kind={pickerRoutes[route as keyof typeof pickerRoutes]}/>;
  const composedRoutes={'#auto-suggest-box':'AutoSuggestBox','#number-box':'NumberBox','#combo-box':'ComboBox','#content-dialog':'ContentDialog','#teaching-tip':'TeachingTip'} as const;
  if(route in composedRoutes)return <ComposedControlsPage key={route} kind={composedRoutes[route as keyof typeof composedRoutes]}/>;
  const motionRoutes={'#connected-animation':'ConnectedAnimation','#theme-transitions':'ThemeTransition','#xaml-comp-interop':'XamlCompInterop'} as const;
  if(route in motionRoutes)return <MotionPages key={route} kind={motionRoutes[route as keyof typeof motionRoutes]}/>;
  if(route==='#segmented')return <SegmentedPage/>;
  if(route==='#table-view')return <TableViewPage/>;
  const primitiveRoutes={'#scroll-bar':'ScrollBar','#thumb':'Thumb','#tick-bar':'TickBar','#items-presenter':'ItemsPresenter','#scroll-content-presenter':'ScrollContentPresenter'} as const;
  if(route in primitiveRoutes)return <ScrollPrimitivesPage key={route} kind={primitiveRoutes[route as keyof typeof primitiveRoutes]}/>;
  const contentRoutes={'#content-control':'ContentControl','#content-presenter':'ContentPresenter','#user-control':'UserControl','#custom-user-controls':'UserControl','#page':'Page','#scene-frame':'Frame','#page-transitions':'Frame'} as const;
  if(route in contentRoutes)return <ContentHostsPage key={route} kind={contentRoutes[route as keyof typeof contentRoutes]}/>;
  if(['#menu-bar','#menu-bar-item','#command-bar-flyout','#relative-panel','#wrap-panel'].includes(route))return <MenuLayoutPage key={route} filter={({'#menu-bar':'MenuBar','#menu-bar-item':'MenuBarItem','#command-bar-flyout':'CommandBarFlyout','#relative-panel':'RelativePanel','#wrap-panel':'WrapPanel'} as const)[route as '#menu-bar']}/>;
  if(route==='#app-bar-separator')return <AppBarSeparatorPage/>;
  const commandRoutes={'#app-bar-button':'AppBarButton','#app-bar-toggle-button':'AppBarToggleButton','#drop-down-button':'DropDownButton','#selector-bar':'SelectorBar','#command-bar':'CommandBar'} as const;
  if(route in commandRoutes)return <CommandControlsPage key={route} kind={commandRoutes[route as keyof typeof commandRoutes]}/>;
  const navigationRoutes={'#flip-view':'FlipView','#pips-pager':'PipsPager','#breadcrumb-bar':'BreadcrumbBar','#tree-view':'TreeView','#tab-view':'TabView','#tab-view-window':'TabView'} as const;
  if(route in navigationRoutes)return <NavigationControlsPage key={route} kind={navigationRoutes[route as keyof typeof navigationRoutes]} windowed={route==='#tab-view-window'}/>;
  const collectionRoutes={'#list-view':'ListView','#grid-view':'GridView','#items-stack-panel':'ItemsStackPanel','#items-wrap-grid':'ItemsWrapGrid','#variable-sized-wrap-grid':'VariableSizedWrapGrid'} as const;
  if(route in collectionRoutes)return <CollectionsPage key={route} kind={collectionRoutes[route as keyof typeof collectionRoutes]}/>;
  const compactRoutes={'#info-bar':'InfoBar','#person-picture':'PersonPicture','#rating-control':'RatingControl','#split-button':'SplitButton','#toggle-split-button':'ToggleSplitButton'} as const;
  if(route in compactRoutes)return <CompactControlsPage key={route} kind={compactRoutes[route as keyof typeof compactRoutes]}/>;
  const overlayRoutes={'#popup':'Popup','#tool-tip':'ToolTip','#flyout':'Flyout','#menu-flyout':'MenuFlyout','#slider':'Slider'} as const;
  if(route==='#overlays'||route in overlayRoutes)return <OverlaysPage key={route} page={overlayRoutes[route as keyof typeof overlayRoutes]}/>;
  if(["#shapes","#rectangle","#line","#path","#polygon","#polyline"].includes(route))return <ShapesPage key={route} filter={route==='#shapes'||route==='#rectangle'||route==='#polygon'?'Shape':'Line'}/>;
  if(route==="#animated-icon")return <AnimatedIconPage/>;
  if(route==="#icon-element")return <IconsPage/>;
  const fiveRoutes={"#border":"Border","#canvas":"Canvas","#hyperlink-button":"HyperlinkButton","#expander":"Expander","#info-badge":"InfoBadge"} as const;
  if(route==='#grid')return <GridPage/>;
  if(route in fiveRoutes)return <FiveControlsPage key={route} page={fiveRoutes[route as keyof typeof fiveRoutes]}/>;
  if(route==="#repeat-button" || route==="#viewbox")return <BasicNextPage key={route} page={route==="#repeat-button"?"RepeatButton":"Viewbox"}/>;
  if (route === "#radio-button" || route === "#radio-buttons")
    return <InputControlsPage key={route} page="RadioButton" />;
  if(route==="#rich-edit-box")return <RichEditBoxPage/>;
  if (["#text-box","#password-box","#scroll-viewer"].includes(route))
    return <TextScrollPage key={route} page={route==="#text-box"?"TextBox":route==="#password-box"?"PasswordBox":"ScrollViewer"}/>;
  if (route === "#progress-bar" || route === "#progress-ring") return <ProgressPage key={route} page={route==="#progress-bar"?"ProgressBar":"ProgressRing"}/>;
  if (route === "#toggle-switch")
    return <InputControlsPage key={route} page="ToggleSwitch" />;
  const basicPages: Record<
    string,
    "TextBlock" | "Image" | "ToggleButton" | "CheckBox"
  > = {
    "#textblock": "TextBlock",
    "#image": "Image",
    "#toggle-button": "ToggleButton",
    "#checkbox": "CheckBox",
  };
  if (basicPages[route])
    return <BasicControlsPage key={route} page={basicPages[route]} />;
  return route === "#effects" || route === "#acrylic" ? (
    <AcrylicPage />
  ) : route === "#easing" ? (
    <EasingPage />
  ) : route === "#transitions" ? (
    <PropertyTransitionsPage />
  ) : route === "#gradients" ? (
    <GradientPage />
  ) : route === "#system-backdrops" ? (
    <SystemBackdropsPage />
  ) : route === "#effects-lab" ? (
    <EffectsPage />
  ) : route.startsWith("#button") ? (
    <ButtonPage sdk={sdk} />
  ) : [
      "#foundation",
      "#shared-scene",
      "#rendering-scene",
      "#input-host",
    ].includes(route) ? (
    <FoundationPage sdk={sdk} />
  ) : (
    null
  );
}
