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
import { GalleryButton, GalleryCheckBox, GalleryComboBox, GalleryExpander, GalleryExpanderHeader, GalleryOption, GallerySlider } from './GalleryControls';
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
const BasicNextPage = lazy(() => import("./BasicNextPage").then(module=>({default:module.BasicNextPage})));
const ProgressPage = lazy(() => import("./ProgressPage").then(module => ({default: module.ProgressPage})));
const TextScrollPage = lazy(() => import("./TextScrollPage").then(module => ({default: module.TextScrollPage})));
const InputControlsPage = lazy(() => import("./InputControlsPage").then(module => ({default: module.InputControlsPage})));
import { BasicControlsPage } from "./BasicControlsPage";
import {
  AcrylicPage,
  EasingPage,
  GradientPage,
  SystemBackdropsPage,
  PropertyTransitionsPage,
} from "./MaterialsPage";
import { EffectsPage } from "./EffectsPage";
import { ButtonPage, FoundationPage } from "./ButtonPage";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { NavigationView } from "./react";
import {
  WinUI,
  ThemeMode,
  PaneDisplayMode,
  EventKind,
  type NavigationView as Controller,
  type NavigationEvent,
  type NavigationViewOptions,
  type Frame, type PageStackEntry,
} from "./index";
import { exampleNames, exampleOptions, galleryPaneMaterial } from "./examples";
import official from "./official-navigation.json";
import exampleSource from "./examples.ts?raw";
import reactSource from "./App.tsx?raw";
import { GalleryShell } from './HomePage';
import { NavigationFrameExample } from './NavigationFrameExample';
import { useGalleryTheme } from './gallery-theme';
import { itemForRoute, readGalleryList, writeGalleryList, recentKey } from './gallery-catalog';

declare global {
  interface Window {
    gallery: {
      sdk: WinUI;
      views: Controller[];
      readyMs: number;
      appReadyMs?: number;
      create: WinUI["navigationView"];
      /** The application's shared, real Rust NavigationView. */
      navigation?: Controller;
      frame?: Frame<PageStackEntry>;
    };
  }
}
const shortNames = [
  "Default pane",
  "Top navigation",
  "Adaptive orientation",
  "Selection & focus",
  "Data binding",
  "Footer menu items",
  "Hierarchical navigation",
  "API in action",
];

function Example({
  index,
  theme,
  reducedMotion,
  reducedTransparency,
  hidden,
  sdk,
}: {
  index: number;
  theme: ThemeMode;
  reducedMotion: boolean;
  reducedTransparency: boolean;
  hidden: boolean;
  sdk: WinUI;
}) {
  const initial = useMemo(
    () => ({
      ...exampleOptions(index, theme),
      contentNode: sdk.template("gallery/SamplePage1"),
    }),
    [index, sdk],
  );
  const [mode, setMode] = useState(
    initial.paneDisplayMode ?? PaneDisplayMode.Auto,
  );
  const [settings, setSettings] = useState(initial.isSettingsVisible ?? true);
  const [back, setBack] = useState(initial.isBackButtonVisible ?? false);
  const [follows, setFollows] = useState(
    initial.selectionFollowsFocus ?? false,
  );
  const [cancelClosing, setCancelClosing] = useState(false);
  const [width, setWidth] = useState<number | undefined>();
  const [resetKey, setResetKey] = useState(0);
  const [extra, setExtra] = useState(0);
  const [eventText, setEventText] = useState("Ready");
  const [displayMode, setDisplayMode] = useState("");
  const [source, setSource] = useState<"ts" | "xaml">("ts");
  const count = useRef(0);
  const controller = useRef<Controller | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const items = useMemo(
    () => [
      ...(initial.items ?? []),
      ...Array.from({ length: extra }, (_, i) => ({
        id: `added${i}`,
        text: `New category ${i + 1}`,
        icon: "\uE710",
      })),
    ],
    [initial, extra],
  );
  const options: NavigationViewOptions = useMemo(
    () => ({
      ...initial,
      items,
      theme,
      reducedMotion,
      reducedTransparency,
      paneDisplayMode: mode,
      expandedPaneMaterial: galleryPaneMaterial(theme),
      isSettingsVisible: settings,
      isBackButtonVisible: back,
      isBackEnabled: false,
      selectionFollowsFocus: follows,
    }),
    [
      initial,
      items,
      theme,
      reducedMotion,
      reducedTransparency,
      mode,
      settings,
      back,
      follows,
    ],
  );
  useEffect(() => {
    if (index !== 2) return;
    const observer = new ResizeObserver((entries) =>
      setMode(
        entries[0].contentRect.width >= 641
          ? PaneDisplayMode.Top
          : PaneDisplayMode.LeftMinimal,
      ),
    );
    observer.observe(viewport.current!);
    return () => observer.disconnect();
  }, [index]);
  function onEvent(event: NavigationEvent) {
    setEventText(
      `${++count.current} · ${event.kind}${event.itemId ? ` → ${event.itemId}` : ""}`,
    );
    if (controller.current)
      setDisplayMode(controller.current.snapshot.displayMode);
  }
  function onSelectionChanged(event: NavigationEvent) {
    let number = Number(event.itemId?.replace("page", "")) || 1;
    if (index === 1 && number === 4) number = 3; // actual pinned Gallery XAML Tag, distinct from its snippet
    if (index === 5 && number === 6) number = 5;
    const resource =
      event.itemId === "$settings"
        ? "gallery/SampleSettingsPage"
        : `gallery/SamplePage${index === 4 ? 1 : number}`;
    const patch: NavigationViewOptions = {
      contentNode: sdk.template(resource),
    };
    if ([0, 4, 6, 7].includes(index) && event.itemId !== "$settings")
      patch.header = `Sample Page ${number}`;
    controller.current?.update(patch);
  }
  function reset() {
    setMode(initial.paneDisplayMode ?? PaneDisplayMode.Auto);
    setSettings(initial.isSettingsVisible ?? true);
    setBack(initial.isBackButtonVisible ?? false);
    setFollows(initial.selectionFollowsFocus ?? false);
    setCancelClosing(false);
    setWidth(undefined);
    setExtra(0);
    count.current = 0;
    setEventText("Ready");
    setResetKey((key) => key + 1);
  }
  return (
    <section className="example" id={`example-${index}`} hidden={hidden}>
      <h2>{exampleNames[index]}</h2>
      <div className="example-card">
        <div className="example-live">
          <div className="viewport-scroll">
            <div
              ref={viewport}
              className="sample-viewport"
              style={{ width: width ?? "100%" }}
            >
              <NavigationView
                key={resetKey}
                className="control-host"
                {...options}
                style={{ height: 460 }}
                onReady={(control) => {
                  controller.current = control;
                  window.gallery.views[index] = control;
                }}
                onEvent={onEvent}
                onSelectionChanged={onSelectionChanged}
                onPaneClosing={(event) => {
                  event.cancel = cancelClosing;
                }}
              />
            </div>
          </div>
          <aside className="options">
            <h3>Options</h3>
            <label className="field">
              PaneDisplayMode
              <GalleryComboBox
                aria-label={`PaneDisplayMode ${index}`}
                value={mode}
                onValueChanged={(e) =>
                  setMode(e as PaneDisplayMode)
                }
              >
                {Object.values(PaneDisplayMode).map((value) => (
                  <GalleryOption key={value}>{value}</GalleryOption>
                ))}
              </GalleryComboBox>
            </label>
            <div className="checks">
              <GalleryCheckBox
                  
                  checked={settings}
                  onValueChanged={(e) => setSettings(e)} className="check-option" label={<>
                
                Settings visible
              </>}/>
              <GalleryCheckBox
                  
                  checked={back}
                  onValueChanged={(e) => setBack(e)} className="check-option" label={<>
                
                Back button
              </>}/>
              <GalleryCheckBox
                  
                  checked={follows}
                  onValueChanged={(e) => setFollows(e)} className="check-option" label={<>
                
                Selection follows focus
              </>}/>
              <GalleryCheckBox
                  
                  checked={cancelClosing}
                  onValueChanged={(e) => setCancelClosing(e)} className="check-option" label={<>
                
                Cancel pane closing
              </>}/>
              {index === 4 && (
                <GalleryButton onClick={() => setExtra((value) => value + 1)}>
                  Add category
                </GalleryButton>
              )}
            </div>
            <label className="field">
              Sample width{" "}
              <span className="width-value">
                {width ? `${width}px` : "Auto"}
              </span>
              <GallerySlider
                aria-label={`Sample width ${index}`}
                className="width-slider"
                
                min="360"
                max="1120"
                value={width ?? 800}
                onValueChanged={(e) => setWidth(Number(e))}
              />
            </label>
            <GalleryButton className="reset" onClick={reset}>
              Reset sample
            </GalleryButton>
          </aside>
        </div>
        <div className="output">
          <span>Output</span>
          <code className="event-output" aria-live="polite">
            {eventText}
          </code>
          <span className="mode-output">{displayMode}</span>
        </div>
        <GalleryExpander className="source">
          <GalleryExpanderHeader>
            Source code <span>React + TypeScript · Rust SDK</span>
          </GalleryExpanderHeader>
          <div className="source-tabs">
            <GalleryButton
              className={source === "ts" ? "active" : ""}
              onClick={() => setSource("ts")}
            >
              TypeScript / React
            </GalleryButton>
            <GalleryButton
              className={source === "xaml" ? "active" : ""}
              onClick={() => setSource("xaml")}
            >
              Official XAML reference
            </GalleryButton>
          </div>
          <pre>
            <code>
              {source === "ts"
                ? `${exampleSource}\n\n// Gallery React application\n${reactSource}`
                : official.samples[index].xaml}
            </code>
          </pre>
        </GalleryExpander>
      </div>
    </section>
  );
}

function NavigationPage({ sdk }: { sdk: WinUI }) {
  const [controlCount, setControlCount] = useState(0);
  const [theme, setTheme] = useGalleryTheme();
  const [reducedMotion, setReducedMotion] = useState(
    matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [reducedTransparency, setReducedTransparency] = useState(
    matchMedia("(prefers-reduced-transparency: reduce)").matches,
  );
  useEffect(() => {
    setControlCount(sdk.liveCount);
    window.gallery.appReadyMs = performance.now();
  }, [sdk]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return (
    <>
      <main id="overview">
        <div className="page-toolbar">
          <span className="implementation-badge">
            <span className="status-dot" />
            Rust-owned controls
          </span>
          <div className="preferences">
            <GalleryCheckBox
                id="motion"
                
                checked={reducedMotion}
                onValueChanged={(e) => setReducedMotion(e)}  label={<>
              
              Reduce motion
            </>}/>
            <GalleryCheckBox
                id="transparency"
                
                checked={reducedTransparency}
                onValueChanged={(e) =>
                  setReducedTransparency(e)
                }  label={<>
              
              Reduce transparency
            </>}/>
          </div>
        </div>
        <div id="samples">
          <NavigationFrameExample theme={theme} reducedMotion={reducedMotion} reducedTransparency={reducedTransparency}/>
          {exampleNames.map((name, index) => (
            <Example
              key={name}
              sdk={sdk}
              index={index}
              theme={theme}
              reducedMotion={reducedMotion}
              reducedTransparency={reducedTransparency}
              hidden={false}
            />
          ))}
        </div>
        <section id="baseline" className="baseline">
          <h2>Implementation baseline</h2>
          <p>
            Official Gallery{" "}
            <code>7360ac322414e118eadfb0c7c2f4ecc31a218f59</code>
            <br />
            Windows App SDK <code>2.5.4-experimental</code> → WinUI{" "}
            <code>2.3.10-experimental</code>
            <br />
            WinUI source tag <code>
              winui3/release/2.5.4-experimental
            </code> · <code>7b127093</code>
          </p>
          <p>
            React mounts {controlCount} real Rust controls through the public
            SDK. Native template composition, acrylic, top overflow measurement
            and full accessibility parity are tracked separately in the
            repository documentation. Button and shared-scene foundations are
            available in the sidebar. Other full Gallery controls, Charts and
            community TableView remain outside this batch.
          </p>
        </section>
        <footer>
          WinUI Rust Gallery<span>NavigationView · v0.1.0</span>
        </footer>
      </main>
    </>
  );
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
  return <GalleryShell route={route} renderPage={page=>samplePage(page,sdk)} />;
}

function samplePage(route: string, sdk: WinUI) {
  if (!route || ['#home', '#all', '#settings'].includes(route) || route.startsWith('#category/') || route.startsWith('#sample/'))
    return null;
  if (route === '#navigation-view' || route === '#baseline' || /^#example-\d+$/.test(route))
    return <NavigationPage sdk={sdk} />;
  const menuItemRoutes:Record<string,string>={'#menu-items':'Menu item controls','#menu-flyout-item':'MenuFlyoutItem','#toggle-menu-flyout-item':'ToggleMenuFlyoutItem','#radio-menu-flyout-item':'RadioMenuFlyoutItem','#menu-flyout-sub-item':'MenuFlyoutSubItem','#menu-flyout-separator':'MenuFlyoutSeparator'};
  if(menuItemRoutes[route])return <Suspense fallback={<p role="status">Loading controls…</p>}><MenuItemControlsPage key={route} title={menuItemRoutes[route]}/></Suspense>;
  const repeaterRefreshRoutes={'#items-repeater':'ItemsRepeater','#stack-layout':'StackLayout','#uniform-grid-layout':'UniformGridLayout','#pull-to-refresh':'RefreshContainer','#refresh-container':'RefreshContainer','#refresh-visualizer':'RefreshVisualizer'} as const;
  if(route in repeaterRefreshRoutes)return <Suspense fallback={<p role="status">Loading controls…</p>}><RepeaterRefreshPage key={route} kind={repeaterRefreshRoutes[route as keyof typeof repeaterRefreshRoutes]}/></Suspense>;
  const viewCommandRoutes={'#split-view':'SplitView','#semantic-zoom':'SemanticZoom','#parallax-view':'ParallaxView','#ui-command':'XamlUICommand','#standard-command':'StandardUICommand'} as const;
  const readingRoutes={'#items-view':'ItemsView','#annotated-scroll-bar':'AnnotatedScrollBar','#pager-control':'PagerControl','#layout-panel':'LayoutPanel','#rich-text-block':'RichTextBlock'}as const;
  if(route in readingRoutes)return <Suspense fallback={<p role="status">Loading controls…</p>}><ReadingControlsPage key={route} kind={readingRoutes[route as keyof typeof readingRoutes]}/></Suspense>;
  if(route in viewCommandRoutes)return <Suspense fallback={<p role="status">Loading controls…</p>}><ViewCommandPage key={route} kind={viewCommandRoutes[route as keyof typeof viewCommandRoutes]}/></Suspense>;
  const pickerRoutes={'#calendar-view':'CalendarView','#calendar-date-picker':'CalendarDatePicker','#date-picker':'DatePicker','#time-picker':'TimePicker','#color-picker':'ColorPicker'} as const;
  if(route in pickerRoutes)return <Suspense fallback={<p role="status">Loading controls…</p>}><PickerControlsPage key={route} kind={pickerRoutes[route as keyof typeof pickerRoutes]}/></Suspense>;
  const composedRoutes={'#auto-suggest-box':'AutoSuggestBox','#number-box':'NumberBox','#combo-box':'ComboBox','#content-dialog':'ContentDialog','#teaching-tip':'TeachingTip'} as const;
  if(route in composedRoutes)return <Suspense fallback={<p role="status">Loading controls…</p>}><ComposedControlsPage key={route} kind={composedRoutes[route as keyof typeof composedRoutes]}/></Suspense>;
  const motionRoutes={'#connected-animation':'ConnectedAnimation','#theme-transitions':'ThemeTransition','#xaml-comp-interop':'XamlCompInterop'} as const;
  if(route in motionRoutes)return <Suspense fallback={<p role="status">Loading motion…</p>}><MotionPages key={route} kind={motionRoutes[route as keyof typeof motionRoutes]}/></Suspense>;
  const primitiveRoutes={'#scroll-bar':'ScrollBar','#thumb':'Thumb','#tick-bar':'TickBar','#items-presenter':'ItemsPresenter','#scroll-content-presenter':'ScrollContentPresenter'} as const;
  if(route in primitiveRoutes)return <Suspense fallback={<p role="status">Loading SDK primitives…</p>}><ScrollPrimitivesPage key={route} kind={primitiveRoutes[route as keyof typeof primitiveRoutes]}/></Suspense>;
  const contentRoutes={'#content-control':'ContentControl','#content-presenter':'ContentPresenter','#user-control':'UserControl','#custom-user-controls':'UserControl','#page':'Page','#scene-frame':'Frame','#page-transitions':'Frame'} as const;
  if(route in contentRoutes)return <Suspense fallback={<p role="status">Loading content controls…</p>}><ContentHostsPage key={route} kind={contentRoutes[route as keyof typeof contentRoutes]}/></Suspense>;
  if(['#menu-bar','#menu-bar-item','#command-bar-flyout','#relative-panel','#wrap-panel'].includes(route))return <Suspense fallback={<p role="status">Loading controls…</p>}><MenuLayoutPage key={route} filter={({'#menu-bar':'MenuBar','#menu-bar-item':'MenuBarItem','#command-bar-flyout':'CommandBarFlyout','#relative-panel':'RelativePanel','#wrap-panel':'WrapPanel'} as const)[route as '#menu-bar']}/></Suspense>;
  if(route==='#app-bar-separator')return <Suspense fallback={<p role="status">Loading command controls…</p>}><AppBarSeparatorPage/></Suspense>;
  const commandRoutes={'#app-bar-button':'AppBarButton','#app-bar-toggle-button':'AppBarToggleButton','#drop-down-button':'DropDownButton','#selector-bar':'SelectorBar','#command-bar':'CommandBar'} as const;
  if(route in commandRoutes)return <Suspense fallback={<p role="status">Loading command controls…</p>}><CommandControlsPage key={route} kind={commandRoutes[route as keyof typeof commandRoutes]}/></Suspense>;
  const navigationRoutes={'#flip-view':'FlipView','#pips-pager':'PipsPager','#breadcrumb-bar':'BreadcrumbBar','#tree-view':'TreeView','#tab-view':'TabView','#tab-view-window':'TabView'} as const;
  if(route in navigationRoutes)return <Suspense fallback={<p role="status">Loading navigation controls…</p>}><NavigationControlsPage key={route} kind={navigationRoutes[route as keyof typeof navigationRoutes]} windowed={route==='#tab-view-window'}/></Suspense>;
  const collectionRoutes={'#list-view':'ListView','#grid-view':'GridView','#items-stack-panel':'ItemsStackPanel','#items-wrap-grid':'ItemsWrapGrid','#variable-sized-wrap-grid':'VariableSizedWrapGrid'} as const;
  if(route in collectionRoutes)return <Suspense fallback={<p role="status">Loading collections…</p>}><CollectionsPage key={route} kind={collectionRoutes[route as keyof typeof collectionRoutes]}/></Suspense>;
  const compactRoutes={'#info-bar':'InfoBar','#person-picture':'PersonPicture','#rating-control':'RatingControl','#split-button':'SplitButton','#toggle-split-button':'ToggleSplitButton'} as const;
  if(route in compactRoutes)return <Suspense fallback={<p role="status">Loading controls…</p>}><CompactControlsPage key={route} kind={compactRoutes[route as keyof typeof compactRoutes]}/></Suspense>;
  const overlayRoutes={'#popup':'Popup','#tool-tip':'ToolTip','#flyout':'Flyout','#menu-flyout':'MenuFlyout','#slider':'Slider'} as const;
  if(route==='#overlays'||route in overlayRoutes)return <Suspense fallback={<p role="status">Loading floating controls…</p>}><OverlaysPage key={route} page={overlayRoutes[route as keyof typeof overlayRoutes]}/></Suspense>;
  if(["#shapes","#rectangle","#line","#path","#polygon","#polyline"].includes(route))return <Suspense fallback={<p role="status">Loading shapes…</p>}><ShapesPage key={route} filter={route==='#shapes'||route==='#rectangle'||route==='#polygon'?'Shape':'Line'}/></Suspense>;
  if(route==="#animated-icon")return <Suspense fallback={<p role="status">Loading animated icons…</p>}><AnimatedIconPage/></Suspense>;
  if(route==="#icon-element")return <Suspense fallback={<p role="status">Loading icons…</p>}><IconsPage/></Suspense>;
  const fiveRoutes={"#border":"Border","#canvas":"Canvas","#hyperlink-button":"HyperlinkButton","#expander":"Expander","#info-badge":"InfoBadge"} as const;
  if(route in fiveRoutes)return <Suspense fallback={<p role="status">Loading controls…</p>}><FiveControlsPage key={route} page={fiveRoutes[route as keyof typeof fiveRoutes]}/></Suspense>;
  if(route==="#repeat-button" || route==="#viewbox")return <Suspense fallback={<p role="status">Loading controls…</p>}><BasicNextPage key={route} page={route==="#repeat-button"?"RepeatButton":"Viewbox"}/></Suspense>;
  if (route === "#radio-button" || route === "#radio-buttons")
    return <Suspense fallback={<p role="status">Loading controls…</p>}><InputControlsPage key={route} page="RadioButton" /></Suspense>;
  if (["#text-box","#password-box","#scroll-viewer"].includes(route))
    return <Suspense fallback={<p role="status">Loading controls…</p>}><TextScrollPage key={route} page={route==="#text-box"?"TextBox":route==="#password-box"?"PasswordBox":"ScrollViewer"}/></Suspense>;
  if (route === "#progress-bar" || route === "#progress-ring") return <Suspense fallback={<p role="status">Loading controls…</p>}><ProgressPage key={route} page={route==="#progress-bar"?"ProgressBar":"ProgressRing"}/></Suspense>;
  if (route === "#toggle-switch")
    return <Suspense fallback={<p role="status">Loading controls…</p>}><InputControlsPage key={route} page="ToggleSwitch" /></Suspense>;
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
