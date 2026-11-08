import type {ScrollBarOptions,ThumbOptions,TickBarOptions,ItemsPresenterOptions,ScrollContentPresenterOptions,ThumbDragStartedEvent,ThumbDragDeltaEvent,ThumbDragCompletedEvent,ScrollBarEvent} from './scroll-primitives-types';
import type {ContentControlOptions,ContentPresenterOptions,UserControlOptions,PageOptions,SceneFrameOptions,SceneFrameNavigationEvent} from './content-host-types';
import type {ItemsViewOptions,PagerControlOptions,AnnotatedScrollBarOptions,RichTextBlockOptions,RichTextBlockOverflowOptions,LayoutPanelOptions,AnnotatedScrollingEvent,PagerIndexChangedEvent,DetailLabelRequestedEvent,RichTextSelectionEvent} from './reading-controls-types';
import type {ItemsRepeaterOptions,RefreshContainerOptions,RefreshVisualizerOptions,RefreshRequestedEvent} from './repeater-refresh-types';
import type {ItemsRepeater as RepeaterController,RefreshContainer as RefreshContainerController,RefreshVisualizer as RefreshVisualizerController,RepeaterRealization} from './scene';
import type {MenuBarOptions,MenuBarItemOptions,CommandBarFlyoutOptions,RelativePanelOptions,WrapPanelOptions} from './menu-layout-types';
import type {CalendarViewOptions,CalendarDatePickerOptions,DatePickerOptions,TimePickerOptions,ColorPickerOptions,PickerEvent} from './picker-controls-types';
import type {CalendarView as CalendarViewController,CalendarDatePicker as CalendarDatePickerController,DatePicker as DatePickerController,TimePicker as TimePickerController,ColorPicker as ColorPickerController} from './scene';
import {controlPropertyJSON} from './scene';
import type * as importViewTypes from './view-controls-types';
import { Frame as FrameController, projectFrameVisual, type FrameSnapshot, type PageStackEntry, type NavigatingEvent, type NavigatedEvent } from './frame';
import { NavigationCacheMode, NavigationMode, NavigationTransition } from './enums';
import type {AppBarSeparatorOptions,AppBarButtonOptions,AppBarToggleButtonOptions,DropDownButtonOptions,CommandBarOptions,CommandBarEvent,CommandBarItem} from './command-controls-types';
import type {SelectorBarOptions} from './navigation-controls-types';
import {AppBarButton as AppBarButtonController,AppBarToggleButton as AppBarToggleButtonController,DropDownButton as DropDownButtonController,CommandBar as CommandBarController,SelectorBar as SelectorBarController} from './scene';
import {NumberBox as NumberBoxController,AutoSuggestBox as AutoSuggestBoxController,ComboBox as ComboBoxController,ContentDialog as ContentDialogController,TeachingTip as TeachingTipController} from './scene';
import {NavigationControl as DataNavigationController,FlipView as FlipViewController,PipsPager as PipsPagerController,BreadcrumbBar as BreadcrumbBarController,TreeView as TreeViewController,TabView as TabViewController} from './scene';
import type {NavigationData,TreeItem,TabItem,FlipViewOptions,PipsPagerOptions,BreadcrumbBarOptions,TreeViewOptions,TabViewOptions,NavigationControlEvent,NavigationItemsChangedEvent,NavigationTemplateSlot,TreeRowSnapshot} from './navigation-controls-types';
import type {NumberBoxOptions,AutoSuggestBoxOptions,ComboBoxOptions,ContentDialogOptions,TeachingTipOptions,ComposedEvent} from './composed-types';
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  WinUI,
  EventKind,
  type NavigationView as Controller,
  type NavigationViewOptions,
  type NavigationEvent,
  type NavigationSnapshot,
} from "./index";

const RuntimeContext = createContext<WinUI | null>(null);
/** Current page lifecycle context, including cached inactive pages. */
export const PageNavigationContext=createContext<{entry:PageStackEntry;active:boolean;parameter:unknown}|null>(null);
export interface FrameProps {
  /** Optional controlled page identity. NavigationView remains responsible for selecting menu items. */ page?:string;
  renderPage:(entry:PageStackEntry)=>ReactNode;
  /** Default Disabled, like native Page. A callback permits a per-page policy. */ cacheMode?:NavigationCacheMode|((page:string)=>NavigationCacheMode);
  /** Default 10. */ cacheSize?:number;
  /** Default Entrance. */ transition?:NavigationTransition;
  reducedMotion?:boolean;
  className?:string; style?:CSSProperties;
  onReady?:(frame:FrameController<PageStackEntry>)=>void;
  onNavigating?:(event:NavigatingEvent)=>void;
  onNavigated?:(event:NavigatedEvent)=>void;
  onNavigationStopped?:(event:NavigatingEvent)=>void;
  onNavigationFailed?:(error:unknown)=>void;
}
/** React content retained by Rust page-instance identity. Motion values are projected from Rust. */
export function Frame(props:FrameProps){
  const parentPage=useContext(PageNavigationContext);
  const runtime=useContext(RuntimeContext);if(!runtime)throw new Error('Frame requires a WinUIProvider');
  const latest=useRef(props);latest.current=props;
  const control=useRef<FrameController<PageStackEntry>|null>(null),host=useRef<HTMLDivElement>(null);
  const [snapshot,setSnapshot]=useState<Readonly<FrameSnapshot>|null>(null);
  const focusedPages=useRef(new Map<number,HTMLElement>()),restoreFocus=useRef(false),lastInstance=useRef<number|null>(null);
  useLayoutEffect(()=>{
    const frame=runtime.frame<PageStackEntry>({cacheSize:latest.current.cacheSize,reducedMotion:latest.current.reducedMotion,
      resolvePage:page=>({cacheMode:typeof latest.current.cacheMode==='function'?latest.current.cacheMode(page):latest.current.cacheMode,
        create:event=>event.entry}),
      onNavigating:event=>latest.current.onNavigating?.(event),onNavigated:event=>latest.current.onNavigated?.(event),
      onNavigationStopped:event=>latest.current.onNavigationStopped?.(event),
      onNavigationFailed:error=>{if(latest.current.onNavigationFailed)latest.current.onNavigationFailed(error);else reportError(error);},
    });control.current=frame;
    let signature='';
    const unsubscribe=frame.onSnapshot(state=>{
      if(state.currentInstance!==lastInstance.current){
        const previous=host.current?.querySelector<HTMLElement>(`:scope > [data-frame-instance="${lastInstance.current}"]`);
        if(previous?.contains(document.activeElement)&&document.activeElement instanceof HTMLElement){focusedPages.current.set(lastInstance.current!,document.activeElement);restoreFocus.current=true;}
        lastInstance.current=state.currentInstance;
      }
      // React reconciles page membership once; animation frames only project Rust compositor output.
      const next=JSON.stringify([state.current,state.pages,state.animating,state.visuals.map(v=>[v.instance,v.visible,v.interactive,v.zIndex])]);
      if(next!==signature){signature=next;setSnapshot(state);}
      if(host.current){
        host.current.dataset.animating=String(state.animating);
        for(const element of host.current.querySelectorAll<HTMLElement>(':scope > [data-frame-instance]')){
          const id=Number(element.dataset.frameInstance),visual=state.visuals.find(v=>v.instance===id);
          projectFrameVisual(element,visual);
        }
      }
    });
    latest.current.onReady?.(frame);
    if(latest.current.page!==undefined&&frame.snapshot.current?.page!==latest.current.page)frame.navigate(latest.current.page,{transition:latest.current.transition});
    return()=>{unsubscribe();control.current=null;frame.dispose();};
  },[runtime]);
  useLayoutEffect(()=>{
    const frame=control.current;if(!frame)return;
    if(props.cacheSize!==undefined||props.reducedMotion!==undefined)frame.configure({cacheSize:props.cacheSize,reducedMotion:props.reducedMotion});
  },[props.cacheSize,props.reducedMotion]);
  useLayoutEffect(()=>{
    const frame=control.current;if(!frame)return;
    const state=frame.snapshot;
    const pages=[...state.pages,...state.backStack,...state.forwardStack,...(state.current?[state.current]:[])];
    for(const page of new Set(pages.map(page=>page.page))){const mode=typeof props.cacheMode==='function'?props.cacheMode(page):props.cacheMode??NavigationCacheMode.Disabled;
      if(pages.some(p=>p.page===page&&p.cacheMode!==mode))frame.setCacheMode(page,mode);}
  },[props.cacheMode]);
  useLayoutEffect(()=>{
    const frame=control.current;if(frame&&props.page!==undefined&&props.page!==frame.snapshot.current?.page)frame.navigate(props.page,{transition:props.transition});
  },[props.page,props.transition]);
  // A parent React commit may occur between SDK frames (theme, async page load,
  // cache membership). Re-project the current core frame before it can paint.
  useLayoutEffect(()=>{
    const frame=control.current;if(!host.current||!frame)return;const state=frame.snapshot;
    for(const element of host.current.querySelectorAll<HTMLElement>(':scope > [data-frame-instance]'))
      projectFrameVisual(element,state.visuals.find(v=>v.instance===Number(element.dataset.frameInstance)));
  });
  useLayoutEffect(()=>{
    if(!snapshot||snapshot.animating||snapshot.currentInstance===null||!restoreFocus.current)return;
    const element=host.current?.querySelector<HTMLElement>(`:scope > [data-frame-instance="${snapshot.currentInstance}"]`);
    const saved=focusedPages.current.get(snapshot.currentInstance);
    const target=saved&&element?.contains(saved)?saved:element?.querySelector<HTMLElement>('h1,h2,h3')??element;
    if(target){if(!target.hasAttribute('tabindex'))target.tabIndex=-1;target.focus({preventScroll:true});}
    restoreFocus.current=false;
    const retained=new Set(snapshot.pages.map(page=>page.instance));for(const id of focusedPages.current.keys())if(!retained.has(id))focusedPages.current.delete(id);
  },[snapshot?.currentInstance,snapshot?.animating]);
  return <div ref={host} className={props.className} style={{position:'relative',minHeight:0,overflow:'hidden',...props.style}} data-winui-frame="" data-animating={snapshot?.animating??false}>
    {snapshot?.pages.map(page=>{
      const active=page.instance===snapshot.currentInstance;
      const visual=snapshot.visuals.find(v=>v.instance===page.instance);
      const entry=active?snapshot.current!:control.current?.contentFor(page.instance);
      if(!entry)return null;
      return <div key={page.instance} data-frame-instance={page.instance} data-frame-page={page.page}
        hidden={!visual?.visible} inert={!visual?.interactive} aria-hidden={!active||undefined}
        style={{position:'absolute',inset:0,display:visual?.visible?'flex':'none',flexDirection:'column',minHeight:0,
          transform:visual?`translate(${visual.x}px, ${visual.y}px)`:undefined,opacity:visual?.opacity??0,zIndex:visual?.zIndex??0,pointerEvents:visual?.interactive?undefined:'none'}}>
        <PageNavigationContext.Provider value={{entry,active:active&&(parentPage?.active??true),parameter:control.current?.parameterFor(entry)}}>{props.renderPage(entry)}</PageNavigationContext.Provider>
      </div>;
    })}
  </div>;
}
/** Initialize WASM once for a React tree. Supply runtime to share an existing SDK.
 * Owned runtimes are disposed on unmount; supplied runtimes remain caller-owned.
 */
export function WinUIProvider({
  runtime,
  children,
  fallback = "Loading WinUI…",
}: {
  runtime?: WinUI;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [owned, setOwned] = useState<WinUI | null>(null);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    if (runtime) return;
    let cancelled = false;
    let created: WinUI | undefined;
    WinUI.create()
      .then((value) => {
        if (cancelled) value.dispose();
        else {
          created = value;
          setOwned(value);
        }
      })
      .catch(setError);
    return () => {
      cancelled = true;
      created?.dispose();
    };
  }, [runtime]);
  if (error) throw error;
  const value = runtime ?? owned;
  return value ? (
    <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>
  ) : (
    fallback
  );
}
export interface NavigationViewProps extends NavigationViewOptions {
  id?:string;
  className?: string;
  style?: CSSProperties;
  /** Receives the same public controller as the framework-independent SDK. */
  onReady?: (view: Controller) => void;
  /** Arranged Rust geometry for positioning application content beside the pane. */
  onSnapshot?: (snapshot: Readonly<NavigationSnapshot>) => void;
  onEvent?: (event: NavigationEvent) => void;
  onSelectionChanged?: (event: NavigationEvent) => void;
  /** Synchronous cancellation: set event.cancel=true before returning. */
  onPaneClosing?: (event: NavigationEvent) => void;
}
/** React owns mounting and business callbacks only; the underlying control is Rust. */
export function NavigationView({
  id,
  className,
  style,
  onReady,
  onSnapshot,
  onEvent,
  onSelectionChanged,
  onPaneClosing,
  ...options
}: NavigationViewProps) {
  const callbacks = { onReady, onSnapshot, onEvent, onSelectionChanged, onPaneClosing };
  const runtime = useContext(RuntimeContext);
  if (!runtime) throw new Error("NavigationView requires a WinUIProvider");
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<Controller | null>(null);
  const latest = useRef({ options, callbacks });
  latest.current = { options, callbacks };
  const previous = useRef<NavigationViewOptions>({});
  useEffect(() => {
    const control = runtime.navigationView(
      host.current!,
      latest.current.options,
    );
    view.current = control;
    previous.current = structuredClone(latest.current.options);
    for (const kind of Object.values(EventKind))
      control.on(kind, (event) => {
        const cb = latest.current.callbacks;
        cb.onEvent?.(event);
        if (kind === EventKind.SelectionChanged) cb.onSelectionChanged?.(event);
        if (kind === EventKind.PaneClosing) cb.onPaneClosing?.(event);
      });
    latest.current.callbacks.onReady?.(control);
    control.onSnapshot(snapshot => latest.current.callbacks.onSnapshot?.(snapshot));
    return () => {
      view.current = null;
      control.dispose();
    };
  }, [runtime]);
  useEffect(() => {
    // Send only changed properties. A React rerender must not reset Rust selection.
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(options)) {
      if (
        JSON.stringify(value) !==
        JSON.stringify(previous.current[key as keyof NavigationViewOptions])
      )
        patch[key] = value;
    }
    if (Object.keys(patch).length)
      view.current?.update(patch as NavigationViewOptions);
    previous.current = structuredClone(options);
  }, [options]);
  return (
    <div
      id={id}
      ref={host}
      className={className}
      style={{ width: "100%", height: 332, ...style }}
    />
  );
}
import {
  Scene as SceneController,
  FloatingSurface,Slider as SliderController, type PopupOptions,type FlyoutOptions,type ToolTipOptions,type MenuFlyoutOptions,type SliderOptions,
  Panel as PanelController,
  Button as ButtonController,
  ToggleButton as ToggleController,
  RadioButton as RadioController,
  RadioButtons as RadiosController,
  ToggleSwitch as SwitchController,
  type RadioOptions,
  type RadioButtonsOptions,
  type ToggleSwitchOptions,
  Border as BorderController,
  Canvas as CanvasController,
  Expander as ExpanderController,
  HyperlinkButton as HyperlinkButtonController,
  type BorderOptions,
  type CanvasOptions,
  type HyperlinkButtonOptions,
  type ExpanderOptions,
  type FontIconOptions,
  type SymbolIconOptions,
  type PathIconOptions,
  type BitmapIconOptions,
  type ImageIconOptions,
  type IconSourceElementOptions, type AnimatedIconOptions, AnimatedIcon as AnimatedIconController,
  type RectangleOptions,type LineOptions,type PathOptions,type PolygonOptions,type PolylineOptions,
  type InfoBadgeOptions,
  ProgressBar as ProgressBarController,
  ProgressRing as ProgressRingController,
  type ProgressBarOptions,
  type ProgressRingOptions,
  TextBox as TextBoxController,
  PasswordBox as PasswordController,
  ScrollViewer as ScrollController,
  type TextBoxOptions,
  type PasswordBoxOptions,
  type ScrollViewerOptions,
  type ToggleOptions,
  SceneNode,
  SceneNavigationView as NavigationController,
  type SceneOptions,
  type PanelOptions,
  type ButtonOptions,
  Viewbox as ViewboxController,
  RepeatButton as RepeatController,
  type ViewboxOptions,
  type RepeatButtonOptions,
  type TextOptions,
  type ImageOptions,
  type LayoutOptions,
  type SceneEvent,
} from "./scene";
import { NodeKind } from "./enums";
import {InfoBar as InfoBarController,RatingControl as RatingController,SplitButton as SplitController,ToggleSplitButton as ToggleSplitController,type InfoBarOptions,type PersonPictureOptions,type RatingControlOptions,type SplitButtonOptions,type ToggleSplitButtonOptions} from './scene';
import {CollectionView as CollectionController,type CollectionItem,type CollectionViewOptions,type ItemsPanelOptions,type CollectionRealization,type CollectionGroup,type CollectionItemsChangedEvent,type CollectionDragEvent} from './scene';
const ParentContext = createContext<
  | PanelController
  | ButtonController
  | ToggleController
  | ViewboxController
  | null
>(null);
const SceneContext = createContext<SceneController | null>(null);
export interface SceneViewProps extends SceneOptions {
  style?: CSSProperties;
  className?: string;
  children?: ReactNode;
  onReady?: (scene: SceneController) => void;
}
/** Creates one shared Rust scene. Every child below uses this surface and its input tree. */
export function SceneView(props: SceneViewProps) {
  return <SceneRoot key={props.backend ?? "default"} {...props} />;
}
function SceneRoot({
  style,
  className,
  children,
  onReady,
  ...options
}: SceneViewProps) {
  const pageNavigation=useContext(PageNavigationContext);
  const runtime = useContext(RuntimeContext);
  if (!runtime) throw new Error("SceneView requires WinUIProvider");
  const host = useRef<HTMLDivElement>(null);
  const current = useRef({ options, onReady });
  current.current = { options, onReady };
  const [scene, setScene] = useState<SceneController | null>(null);
  const previous = useRef<SceneOptions>({});
  useLayoutEffect(()=>{scene?.setHostActive(pageNavigation?.active??true);},[scene,pageNavigation?.active]);
  useLayoutEffect(() => {
    const created = runtime.scene(host.current!, current.current.options);
    previous.current = structuredClone(current.current.options);
    setScene(created);
    current.current.onReady?.(created);
    return () => created.dispose();
  }, [runtime, options.backend]);
  useLayoutEffect(() => {
    if (!scene) return;
    scene.configure({
      theme: options.theme,
      reducedMotion: options.reducedMotion,
      reducedTransparency: options.reducedTransparency,
    });
    if (
      options.root &&
      JSON.stringify(options.root) !== JSON.stringify(previous.current.root)
    )
      scene.root.update(options.root);
    previous.current = structuredClone(options);
  }, [scene, options]);
  return (
    <div ref={host} className={className} style={{ height: 240, ...style }}>
      {scene && (
        <SceneContext.Provider value={scene}>
          <ParentContext.Provider value={scene.root}>
            {children}
          </ParentContext.Provider>
        </SceneContext.Provider>
      )}
    </div>
  );
}
interface NodeElementProps {
  onCloseButtonClick?:(event:SceneEvent)=>void;
  onIsCheckedChanged?:(event:SceneEvent)=>void;
  kind: NodeKind;
  options: object;
  children?: ReactNode;
  onReady?: (node: SceneNode) => void;
  onEvent?: (event: SceneEvent) => void;
  onPointerEntered?: (event:SceneEvent)=>void;
  onPointerExited?: (event:SceneEvent)=>void;
  onClick?: (event: SceneEvent) => void;
  onChecked?: (event: SceneEvent) => void;
  onUnchecked?: (event: SceneEvent) => void;
  onIndeterminate?: (event: SceneEvent) => void;
  onSelectionChanged?: (event: SceneEvent) => void;
  onPaneClosing?: (event: SceneEvent) => void;
  onToggled?: (event: SceneEvent) => void;
  onValueChanged?: (event: SceneEvent) => void;
  onTextChanged?: (event: SceneEvent) => void;
  onPasswordChanged?: (event: SceneEvent) => void;
  onExpanding?: (event: SceneEvent) => void;
  onCollapsed?: (event: SceneEvent) => void;
  onViewChanged?: (event: SceneEvent) => void;
  onOpening?: (event: SceneEvent) => void;
  onOpened?: (event: SceneEvent) => void;
  onClosing?: (event: SceneEvent) => void;
  onClosed?: (event: SceneEvent) => void;
  onItemInvoked?: (event: SceneEvent) => void;
}
// A scene remount disposes old command/source wrappers before onReady supplies
// their replacements. Reconcile those stale references without moving state out
// of Rust. Live cross-scene references still fail normal ownership validation.
function liveReferenceOptions(options:object){
 const seen=new WeakMap<object,unknown>();
 function clean(value:unknown):unknown {if(value instanceof SceneNode)return value.isDisposed?null:value;if(!value||typeof value!=='object'||(Object.getPrototypeOf(value)!==Object.prototype&&!Array.isArray(value)))return value;if(seen.has(value))return seen.get(value);const copy:unknown[]|Record<string,unknown>=Array.isArray(value)?[]:{};seen.set(value,copy);for(const[key,child]of Object.entries(value))(copy as Record<string,unknown>)[key]=clean(child);return copy;}
 return clean(options) as object;
}
function NodeElement({
  kind,
  options,
  children,
  ...callbacks
}: NodeElementProps) {
  const scene = useContext(SceneContext),
    parent = useContext(ParentContext);
  if (!scene || !parent)
    throw new Error("Scene controls require SceneView and a container");
  const current = useRef({ options, callbacks });
  current.current = { options, callbacks };
  const [node, setNode] = useState<SceneNode | null>(null);
  const previous = useRef<object>({});
  useLayoutEffect(() => {
    let created: SceneNode;
    const options = liveReferenceOptions(current.current.options);
    switch (kind) {
      case NodeKind.ScrollBar:case NodeKind.Thumb:case NodeKind.TickBar:case NodeKind.ItemsPresenter:case NodeKind.ScrollContentPresenter:created=scene.create(parent,kind,options);break;
      case NodeKind.MenuFlyoutItem:case NodeKind.ToggleMenuFlyoutItem:case NodeKind.RadioMenuFlyoutItem:case NodeKind.MenuFlyoutSubItem:case NodeKind.MenuFlyoutSeparator:created=scene.create(parent,kind,options);break;
      case NodeKind.ContentControl:case NodeKind.ContentPresenter:case NodeKind.UserControl:case NodeKind.Page:case NodeKind.Frame:created=scene.create(parent,kind,options);break;
      case NodeKind.RichTextBlockOverflow:case NodeKind.ItemsView:case NodeKind.PagerControl:case NodeKind.AnnotatedScrollBar:case NodeKind.RichTextBlock:case NodeKind.LayoutPanel:case NodeKind.ScrollView:case NodeKind.SwipeControl:created=scene.create(parent,kind,options);break;
      case NodeKind.ItemsRepeater:case NodeKind.RefreshContainer:case NodeKind.RefreshVisualizer:created=scene.create(parent,kind,options);break;
      case NodeKind.SplitView:case NodeKind.SemanticZoom:case NodeKind.ParallaxView:case NodeKind.UICommand:case NodeKind.StandardCommand:created=scene.create(parent,kind,options);break;
      case NodeKind.MenuBar:case NodeKind.MenuBarItem:case NodeKind.CommandBarFlyout:case NodeKind.RelativePanel:case NodeKind.WrapPanel:case NodeKind.AppBarSeparator:case NodeKind.AppBarButton:case NodeKind.AppBarToggleButton:case NodeKind.DropDownButton:case NodeKind.CommandBar:case NodeKind.SelectorBar:created=scene.create(parent,kind,options);break;
      case NodeKind.FlipView:created=parent.flipView(options);break;
      case NodeKind.PipsPager:created=parent.pipsPager(options);break;
      case NodeKind.BreadcrumbBar:created=parent.breadcrumbBar(options);break;
      case NodeKind.TreeView:created=parent.treeView(options);break;
      case NodeKind.TabView:created=parent.tabView(options);break;
      case NodeKind.CalendarView:case NodeKind.CalendarDatePicker:case NodeKind.DatePicker:case NodeKind.TimePicker:case NodeKind.ColorPicker:created=scene.create(parent,kind,options);break;
      case NodeKind.NumberBox:created=parent.numberBox(options);break;
      case NodeKind.AutoSuggestBox:created=parent.autoSuggestBox(options);break;
      case NodeKind.ComboBox:created=parent.comboBox(options);break;
      case NodeKind.ContentDialog:created=parent.contentDialog(options);break;
      case NodeKind.TeachingTip:created=parent.teachingTip(options);break;
      case NodeKind.ListView:created=parent.listView(options);break;
      case NodeKind.GridView:created=parent.gridView(options);break;
      case NodeKind.ItemsStackPanel:created=parent.itemsStackPanel(options);break;
      case NodeKind.ItemsWrapGrid:created=parent.itemsWrapGrid(options);break;
      case NodeKind.VariableSizedWrapGrid:created=parent.variableSizedWrapGrid(options);break;
      case NodeKind.InfoBar:created=parent.infoBar(options);break;
      case NodeKind.PersonPicture:created=parent.personPicture(options);break;
      case NodeKind.RatingControl:created=parent.ratingControl(options);break;
      case NodeKind.SplitButton:created=parent.splitButton(options);break;
      case NodeKind.ToggleSplitButton:created=parent.toggleSplitButton(options);break;
      case NodeKind.Popup:created=parent.popup(options);break;
      case NodeKind.ToolTip:created=parent.toolTip(options);break;
      case NodeKind.Flyout:created=parent.flyout(options);break;
      case NodeKind.MenuFlyout:created=parent.menuFlyout(options);break;
      case NodeKind.Slider:created=parent.slider(options);break;
      case NodeKind.Border:
        created = parent.border(options);
        break;
      case NodeKind.Canvas:
        created = parent.canvas(options);
        break;
      case NodeKind.IconSourceElement:created=parent.iconSourceElement(options);break;
      case NodeKind.AnimatedIcon:created=parent.animatedIcon(options);break;
      case NodeKind.Rectangle:created=parent.rectangle(options);break;
      case NodeKind.Line:created=parent.line(options);break;
      case NodeKind.Path:created=parent.path(options);break;
      case NodeKind.Polygon:created=parent.polygon(options);break;
      case NodeKind.Polyline:created=parent.polyline(options);break;
      case NodeKind.FontIcon:
        created = parent.fontIcon(options);
        break;
      case NodeKind.SymbolIcon:
        created = parent.symbolIcon(options);
        break;
      case NodeKind.PathIcon:
        created = parent.pathIcon(options);
        break;
      case NodeKind.BitmapIcon:
        created = parent.bitmapIcon(options);
        break;
      case NodeKind.ImageIcon:
        created = parent.imageIcon(options);
        break;
      case NodeKind.InfoBadge:
        created = parent.infoBadge(options);
        break;
      case NodeKind.Expander:
      case NodeKind.HyperlinkButton:
        if (!(parent instanceof PanelController))
          throw new Error("Interactive controls require a panel");
        created =
          kind === NodeKind.Expander
            ? parent.expander(options)
            : parent.hyperlinkButton(options);
        break;
      case NodeKind.ProgressBar:
      case NodeKind.ProgressRing:
        created =
          kind === NodeKind.ProgressBar
            ? parent.progressBar(options)
            : parent.progressRing(options);
        break;
      case NodeKind.TextBox:
      case NodeKind.PasswordBox:
      case NodeKind.ScrollViewer:
        if (!(parent instanceof PanelController))
          throw new Error("Input/scroll controls require a layout parent");
        created =
          kind === NodeKind.TextBox
            ? parent.textBox(options)
            : kind === NodeKind.PasswordBox
              ? parent.passwordBox(options)
              : parent.scrollViewer(options);
        break;
      case NodeKind.RadioButton:
      case NodeKind.RadioButtons:
      case NodeKind.ToggleSwitch:
        if (!(parent instanceof PanelController))
          throw new Error("Interactive controls cannot be nested");
        created =
          kind === NodeKind.RadioButton
            ? parent.radioButton(options)
            : kind === NodeKind.RadioButtons
              ? parent.radioButtons(options)
              : parent.toggleSwitch(options);
        break;
      case NodeKind.Viewbox:
        created = parent.viewbox(options);
        break;
      case NodeKind.RepeatButton:
        if (!(parent instanceof PanelController))
          throw new Error("RepeatButton requires a layout parent");
        created = parent.repeatButton(options);
        break;
      case NodeKind.Grid:
        created = parent.grid(options);
        break;
      case NodeKind.StackPanel:
        created = parent.stack(options);
        break;
      case NodeKind.TextBlock:
        created = parent.text(options);
        break;
      case NodeKind.Ellipse:
        created = parent.ellipse(options);
        break;
      case NodeKind.Image:
        created = parent.image(options);
        break;
      case NodeKind.CheckBox:
      case NodeKind.ToggleButton:
        if (!(parent instanceof PanelController))
          throw new Error("Interactive controls cannot be nested");
        created =
          kind === NodeKind.CheckBox
            ? parent.checkBox(options)
            : parent.toggleButton(options);
        break;
      case NodeKind.Button:
        if (!(parent instanceof PanelController))
          throw new Error("Button cannot contain another button");
        created = parent.button(options);
        break;
      case NodeKind.NavigationView: {
        if (!(parent instanceof PanelController))
          throw new Error("NavigationView cannot be Button content");
        const { navigation, ...layout } = options as LayoutOptions & {
          navigation?: NavigationViewOptions;
        };
        created = parent.navigationView(navigation, layout);
        break;
      }
      default: throw new Error(`Unsupported scene component: ${kind}`);
    }
    previous.current = Object.fromEntries(Object.entries(options).map(([key,value])=>[key,controlPropertyJSON(value)]));
    setNode(created);
    current.current.callbacks.onReady?.(created);
    const offs = Object.values(EventKind).filter(k=>k!==EventKind.PointerEntered&&k!==EventKind.PointerExited).map((kind) =>
      created.on(kind, (event) => {
        const c = current.current.callbacks;
        if(kind===EventKind.CloseButtonClick)c.onCloseButtonClick?.(event);
        if(kind===EventKind.IsCheckedChanged)c.onIsCheckedChanged?.(event);
        c.onEvent?.(event);
        if (kind === EventKind.Click) c.onClick?.(event);
        if (kind === EventKind.Opening) c.onOpening?.(event);
        if (kind === EventKind.Opened) c.onOpened?.(event);
        if (kind === EventKind.Closing) c.onClosing?.(event);
        if (kind === EventKind.Closed) c.onClosed?.(event);
        if (kind === EventKind.MenuItemInvoked) c.onItemInvoked?.(event);
        if (kind === EventKind.Expanding) c.onExpanding?.(event);
        if (kind === EventKind.Collapsed) c.onCollapsed?.(event);
        if (kind === EventKind.Checked) c.onChecked?.(event);
        if (kind === EventKind.Unchecked) c.onUnchecked?.(event);
        if (kind === EventKind.Indeterminate) c.onIndeterminate?.(event);
        if (kind === EventKind.SelectionChanged) c.onSelectionChanged?.(event);
        if (kind === EventKind.PaneClosing) c.onPaneClosing?.(event);
        if (kind === EventKind.Toggled) c.onToggled?.(event);
        if (kind === EventKind.ValueChanged) c.onValueChanged?.(event);
        if (kind === EventKind.TextChanged) c.onTextChanged?.(event);
        if (kind === EventKind.PasswordChanged) c.onPasswordChanged?.(event);
        if (kind === EventKind.ViewChanged) c.onViewChanged?.(event);
      }),
    );
    return () => {
      for (const off of offs) off();
      created.dispose();
    };
  }, [scene, parent, kind]);
  useLayoutEffect(() => {
    if (!node || node.isDisposed) return;
    const patch: Record<string, unknown> = {};
    const liveOptions=liveReferenceOptions(options);
    for (const [key, value] of Object.entries(liveOptions))
      if (
        controlPropertyJSON(value) !==
        (previous.current as Record<string, unknown>)[key]
      )
        patch[key] = value;
    if (Object.keys(patch).length) node.update(patch);
    previous.current = Object.fromEntries(Object.entries(liveOptions).map(([key,value])=>[key,controlPropertyJSON(value)]));
  }, [node, options]);
  useLayoutEffect(()=>{
    if(!node)return;
    const offs:(()=>void)[]=[];
    if(callbacks.onPointerEntered)offs.push(node.on(EventKind.PointerEntered,e=>current.current.callbacks.onPointerEntered?.(e)));
    if(callbacks.onPointerExited)offs.push(node.on(EventKind.PointerExited,e=>current.current.callbacks.onPointerExited?.(e)));
    return()=>{for(const off of offs)off();};
  },[node,!!callbacks.onPointerEntered,!!callbacks.onPointerExited]);
  if (!node || !children) return null;
  if (
    node instanceof ViewboxController ||
    node instanceof PanelController ||
    node instanceof ButtonController ||
    node instanceof ToggleController
  )
    return (
      <ParentContext.Provider value={node}>{children}</ParentContext.Provider>
    );
  return null;
}
/** Direct JSX properties use the same types and Rust defaults as the basic SDK. */
export interface ContainerProps extends PanelOptions {
 onPointerEntered?:(event:SceneEvent)=>void;onPointerExited?:(event:SceneEvent)=>void;
  children?: ReactNode;
  onReady?: (node: PanelController) => void;
}
export function Grid({ onReady, children,onPointerEntered,onPointerExited, ...options }: ContainerProps) {
  return (
    <NodeElement
      kind={NodeKind.Grid}
      onPointerEntered={onPointerEntered} onPointerExited={onPointerExited}
      options={options}
      onReady={(n) => onReady?.(n as PanelController)}
    >
      {children}
    </NodeElement>
  );
}
export function StackPanel({ onReady, children, ...options }: ContainerProps) {
  return (
    <NodeElement
      kind={NodeKind.StackPanel}
      options={options}
      onReady={(n) => onReady?.(n as PanelController)}
    >
      {children}
    </NodeElement>
  );
}
export interface ButtonProps extends ButtonOptions {
  onContextRequested?: (event:SceneEvent)=>void;
  onPointerEntered?: (event:SceneEvent)=>void;
  onPointerExited?: (event:SceneEvent)=>void;
  children?: ReactNode;
  onReady?: (node: ButtonController) => void;
  onClick?: (event: SceneEvent) => void;
  onEvent?: (event: SceneEvent) => void;
}
export function Button({
  onContextRequested,
  onPointerEntered, onPointerExited,
  onReady,
  children,
  onClick,
  onEvent,
  ...options
}: ButtonProps) {
  return (
    <NodeElement
      kind={NodeKind.Button}
      onPointerEntered={onPointerEntered}
      onPointerExited={onPointerExited}
      options={options}
      onClick={onClick}
      onEvent={event=>{onEvent?.(event);if(event.kind===EventKind.ContextRequested)onContextRequested?.(event);}}
      onReady={(n) => onReady?.(n as ButtonController)}
    >
      {children}
    </NodeElement>
  );
}
export interface TextBlockProps extends TextOptions {
  onReady?: (node: SceneNode<TextOptions>) => void;
}
export function TextBlock({ onReady, ...options }: TextBlockProps) {
  return (
    <NodeElement
      kind={NodeKind.TextBlock}
      options={options}
      onReady={(n) => onReady?.(n as SceneNode<TextOptions>)}
    />
  );
}
export interface ToggleProps extends ToggleOptions {
  children?: ReactNode;
  onReady?: (control: ToggleController) => void;
  onEvent?: (event: SceneEvent) => void;
  onClick?: (event: SceneEvent) => void;
  onChecked?: (event: SceneEvent) => void;
  onUnchecked?: (event: SceneEvent) => void;
  onIndeterminate?: (event: SceneEvent) => void;
}
function ToggleElement({
  kind,
  onReady,
  children,
  onEvent,
  onClick,
  onChecked,
  onUnchecked,
  onIndeterminate,
  ...options
}: ToggleProps & { kind: NodeKind.CheckBox | NodeKind.ToggleButton }) {
  return (
    <NodeElement
      kind={kind}
      options={options}
      onEvent={onEvent}
      onClick={onClick}
      onChecked={onChecked}
      onUnchecked={onUnchecked}
      onIndeterminate={onIndeterminate}
      onReady={(n) => onReady?.(n as ToggleController)}
    >
      {children}
    </NodeElement>
  );
}
export function ToggleButton(props: ToggleProps) {
  return <ToggleElement kind={NodeKind.ToggleButton} {...props} />;
}
export function CheckBox(props: ToggleProps) {
  return <ToggleElement kind={NodeKind.CheckBox} {...props} />;
}
export function Image({onReady,...options}: ImageOptions & {onReady?:(node:SceneNode<ImageOptions>)=>void}) {
  return <NodeElement kind={NodeKind.Image} options={options} onReady={node=>onReady?.(node as SceneNode<ImageOptions>)}/>;
}
export interface SceneNavigationViewProps extends NavigationViewOptions {
  /** Scene layout is independent of the navigation pane's own configuration. */
  layout?: LayoutOptions;
  onReady?: (node: NavigationController) => void;
  onEvent?: (event: SceneEvent) => void;
  onSelectionChanged?: (event: SceneEvent) => void;
  onPaneClosing?: (event: SceneEvent) => void;
}
export function SceneNavigationView({
  layout = {},
  onReady,
  onEvent,
  onSelectionChanged,
  onPaneClosing,
  ...navigation
}: SceneNavigationViewProps) {
  return (
    <NodeElement
      kind={NodeKind.NavigationView}
      options={{ ...layout, navigation }}
      onEvent={onEvent}
      onSelectionChanged={onSelectionChanged}
      onPaneClosing={onPaneClosing}
      onReady={(n) => onReady?.(n as NavigationController)}
    />
  );
}
/** Source-traced ellipse geometry, laid out and painted by the shared Rust scene. */
export function Ellipse({onReady,...options}: LayoutOptions & {onReady?:(node:SceneNode)=>void}) {
  return <NodeElement kind={NodeKind.Ellipse} options={options} onReady={onReady} />;
}
export interface RadioButtonProps extends RadioOptions {
  children?: ReactNode;
  onReady?: (control: RadioController) => void;
  onEvent?: (event: SceneEvent) => void;
  onChecked?: (event: SceneEvent) => void;
  onUnchecked?: (event: SceneEvent) => void;
  onClick?: (event: SceneEvent) => void;
}
export function RadioButton({
  onReady,
  children,
  onEvent,
  onChecked,
  onUnchecked,
  onClick,
  ...options
}: RadioButtonProps) {
  return (
    <NodeElement
      kind={NodeKind.RadioButton}
      options={options}
      onReady={(n) => onReady?.(n as RadioController)}
      onEvent={onEvent}
      onChecked={onChecked}
      onUnchecked={onUnchecked}
      onClick={onClick}
    >
      {children}
    </NodeElement>
  );
}
export interface RadioButtonsProps extends RadioButtonsOptions {
  onReady?: (control: RadiosController) => void;
  onSelectionChanged?: (event: SceneEvent) => void;
  onEvent?: (event: SceneEvent) => void;
}
export function RadioButtons({
  onReady,
  onSelectionChanged,
  onEvent,
  ...options
}: RadioButtonsProps) {
  return (
    <NodeElement
      kind={NodeKind.RadioButtons}
      options={options}
      onReady={(n) => onReady?.(n as RadiosController)}
      onSelectionChanged={onSelectionChanged}
      onEvent={onEvent}
    />
  );
}
export interface ToggleSwitchProps extends ToggleSwitchOptions {
  onReady?: (control: SwitchController) => void;
  onToggled?: (event: SceneEvent) => void;
  onEvent?: (event: SceneEvent) => void;
}
export function ToggleSwitch({
  onReady,
  onToggled,
  onEvent,
  ...options
}: ToggleSwitchProps) {
  return (
    <NodeElement
      kind={NodeKind.ToggleSwitch}
      options={options}
      onReady={(n) => onReady?.(n as SwitchController)}
      onToggled={onToggled}
      onEvent={onEvent}
    />
  );
}

export interface TextBoxProps extends TextBoxOptions {
  onReady?: (node: TextBoxController) => void;
  onTextChanged?: (event: SceneEvent) => void;
  onSelectionChanged?: (event: SceneEvent) => void;
}
export function TextBox({
  onReady,
  onTextChanged,
  onSelectionChanged,
  ...options
}: TextBoxProps) {
  return (
    <NodeElement
      kind={NodeKind.TextBox}
      options={options}
      onReady={(n) => onReady?.(n as TextBoxController)}
      onTextChanged={onTextChanged}
      onSelectionChanged={onSelectionChanged}
    />
  );
}
export interface PasswordBoxProps extends PasswordBoxOptions {
  onReady?: (node: PasswordController) => void;
  onPasswordChanged?: (event: SceneEvent) => void;
}
export function PasswordBox({
  onReady,
  onPasswordChanged,
  ...options
}: PasswordBoxProps) {
  return (
    <NodeElement
      kind={NodeKind.PasswordBox}
      options={options}
      onReady={(n) => onReady?.(n as PasswordController)}
      onPasswordChanged={onPasswordChanged}
    />
  );
}
export interface ScrollViewerProps extends ScrollViewerOptions {
  children?: ReactNode;
  onReady?: (node: ScrollController) => void;
  onViewChanged?: (event: SceneEvent) => void;
}
export function ScrollViewer({
  onReady,
  onViewChanged,
  children,
  ...options
}: ScrollViewerProps) {
  return (
    <NodeElement
      kind={NodeKind.ScrollViewer}
      options={options}
      onReady={(n) => onReady?.(n as ScrollController)}
      onViewChanged={onViewChanged}
    >
      {children}
    </NodeElement>
  );
}

export interface ProgressBarProps extends ProgressBarOptions {
  onReady?: (control: ProgressBarController) => void;
  onValueChanged?: (event: SceneEvent) => void;
}
/** Standard WinUI range indicator. */
export function ProgressBar({
  onReady,
  onValueChanged,
  ...options
}: ProgressBarProps) {
  return (
    <NodeElement
      kind={NodeKind.ProgressBar}
      options={options}
      onReady={(n) => onReady?.(n as ProgressBarController)}
      onValueChanged={onValueChanged}
    />
  );
}
export interface ProgressRingProps extends ProgressRingOptions {
  onReady?: (control: ProgressRingController) => void;
}
/** Default 32 DIP active indeterminate ring, rendered by Rust. */
export function ProgressRing({ onReady, ...options }: ProgressRingProps) {
  return (
    <NodeElement
      kind={NodeKind.ProgressRing}
      options={options}
      onReady={(n) => onReady?.(n as ProgressRingController)}
    />
  );
}

export interface RepeatButtonProps extends RepeatButtonOptions {
  children?: ReactNode;
  onReady?: (node: RepeatController) => void;
  onClick?: (event: SceneEvent) => void;
  onEvent?: (event: SceneEvent) => void;
}
export function RepeatButton({
  children,
  onReady,
  onClick,
  onEvent,
  ...options
}: RepeatButtonProps) {
  return (
    <NodeElement
      kind={NodeKind.RepeatButton}
      options={options}
      onReady={(n) => onReady?.(n as RepeatController)}
      onClick={onClick}
      onEvent={onEvent}
    >
      {children}
    </NodeElement>
  );
}
export interface ViewboxProps extends ViewboxOptions {
  children?: ReactNode;
  onReady?: (node: ViewboxController) => void;
}
/** Exactly one child; use Grid or StackPanel to compose content inside it. */
export function Viewbox({ children, onReady, ...options }: ViewboxProps) {
  return (
    <NodeElement
      kind={NodeKind.Viewbox}
      options={options}
      onReady={(n) => onReady?.(n as ViewboxController)}
    >
      {children}
    </NodeElement>
  );
}

export interface BorderProps extends BorderOptions {
  children?: ReactNode;
  onReady?: (n: BorderController) => void;
}
export function Border({ children, onReady, ...options }: BorderProps) {
  return (
    <NodeElement
      kind={NodeKind.Border}
      options={options}
      onReady={(n) => onReady?.(n as BorderController)}
    >
      {children}
    </NodeElement>
  );
}
export interface CanvasProps extends CanvasOptions {
  children?: ReactNode;
  onReady?: (n: CanvasController) => void;
}
export function Canvas({ children, onReady, ...options }: CanvasProps) {
  return (
    <NodeElement
      kind={NodeKind.Canvas}
      options={options}
      onReady={(n) => onReady?.(n as CanvasController)}
    >
      {children}
    </NodeElement>
  );
}
export interface ExpanderProps extends ExpanderOptions {
  children?: ReactNode;
  onReady?: (n: ExpanderController) => void;
  onExpanding?: (e: SceneEvent) => void;
  onCollapsed?: (e: SceneEvent) => void;
}
export function Expander({
  children,
  onReady,
  onExpanding,
  onCollapsed,
  ...options
}: ExpanderProps) {
  return (
    <NodeElement
      kind={NodeKind.Expander}
      options={options}
      onReady={(n) => onReady?.(n as ExpanderController)}
      onExpanding={onExpanding}
      onCollapsed={onCollapsed}
    >
      {children}
    </NodeElement>
  );
}
export interface HyperlinkButtonProps extends HyperlinkButtonOptions {
  children?: ReactNode;
  onReady?: (n: HyperlinkButtonController) => void;
  onClick?: (e: SceneEvent) => void;
}
export function HyperlinkButton({
  children,
  onReady,
  onClick,
  ...options
}: HyperlinkButtonProps) {
  return (
    <NodeElement
      kind={NodeKind.HyperlinkButton}
      options={options}
      onReady={(n) => onReady?.(n as HyperlinkButtonController)}
      onClick={onClick}
    >
      {children}
    </NodeElement>
  );
}
export function InfoBadge(options: InfoBadgeOptions) {
  return <NodeElement kind={NodeKind.InfoBadge} options={options} />;
}

export function FontIcon(options: FontIconOptions) { return <NodeElement kind={NodeKind.FontIcon} options={options} />; }

export function SymbolIcon(options: SymbolIconOptions) { return <NodeElement kind={NodeKind.SymbolIcon} options={options} />; }

export function PathIcon(options: PathIconOptions) { return <NodeElement kind={NodeKind.PathIcon} options={options} />; }

export function BitmapIcon(options: BitmapIconOptions) { return <NodeElement kind={NodeKind.BitmapIcon} options={options} />; }

export function ImageIcon(options: ImageIconOptions) { return <NodeElement kind={NodeKind.ImageIcon} options={options} />; }

export function IconSourceElement(options:IconSourceElementOptions) {return <NodeElement kind={NodeKind.IconSourceElement} options={options}/>;}
export interface AnimatedIconProps extends AnimatedIconOptions { onReady?:(node:AnimatedIconController)=>void; }
export function AnimatedIcon({onReady,...options}:AnimatedIconProps){return <NodeElement kind={NodeKind.AnimatedIcon} options={options} onReady={n=>onReady?.(n as AnimatedIconController)}/>;}

export interface RectangleProps extends RectangleOptions {onReady?:(node:SceneNode<RectangleOptions>)=>void;}
export function Rectangle({onReady,...options}:RectangleProps){return <NodeElement kind={NodeKind.Rectangle} options={options} onReady={n=>onReady?.(n as SceneNode<RectangleOptions>)}/>;}

export interface LineProps extends LineOptions {onReady?:(node:SceneNode<LineOptions>)=>void;}
export function Line({onReady,...options}:LineProps){return <NodeElement kind={NodeKind.Line} options={options} onReady={n=>onReady?.(n as SceneNode<LineOptions>)}/>;}

export interface PathProps extends PathOptions {onReady?:(node:SceneNode<PathOptions>)=>void;}
export function Path({onReady,...options}:PathProps){return <NodeElement kind={NodeKind.Path} options={options} onReady={n=>onReady?.(n as SceneNode<PathOptions>)}/>;}

export interface PolygonProps extends PolygonOptions {onReady?:(node:SceneNode<PolygonOptions>)=>void;}
export function Polygon({onReady,...options}:PolygonProps){return <NodeElement kind={NodeKind.Polygon} options={options} onReady={n=>onReady?.(n as SceneNode<PolygonOptions>)}/>;}

export interface PolylineProps extends PolylineOptions {onReady?:(node:SceneNode<PolylineOptions>)=>void;}
export function Polyline({onReady,...options}:PolylineProps){return <NodeElement kind={NodeKind.Polyline} options={options} onReady={n=>onReady?.(n as SceneNode<PolylineOptions>)}/>;}

export interface FloatingProps<T extends PopupOptions> {
  /** Attach to another control in this Scene. */ target?:SceneNode|null;
  children?:ReactNode;
  onReady?:(surface:FloatingSurface<T>)=>void;
  onOpening?:(event:SceneEvent)=>void;onOpened?:(event:SceneEvent)=>void;
  onClosing?:(event:SceneEvent)=>void;onClosed?:(event:SceneEvent)=>void;
  onItemInvoked?:(event:SceneEvent)=>void;
}
function FloatingElement<T extends PopupOptions>({kind,target,children,onReady,onOpening,onOpened,onClosing,onClosed,onItemInvoked,...options}:T & FloatingProps<T> & {kind:NodeKind}) {
  const [node,setNode]=useState<FloatingSurface<T>|null>(null);
  useLayoutEffect(()=>{if(node&&!node.isDisposed&&!target?.isDisposed)node.attachTo(target??null);},[node,target]);
  return <NodeElement kind={kind} options={options} onReady={n=>{const surface=n as FloatingSurface<T>;if(target&&!target.isDisposed)surface.attachTo(target);setNode(surface);onReady?.(surface);}}
    onOpening={onOpening} onOpened={onOpened} onClosing={onClosing} onClosed={onClosed} onItemInvoked={onItemInvoked}>{children}</NodeElement>;
}
/** Root-level content with parent-relative offsets. */
export function Popup(props:PopupOptions & FloatingProps<PopupOptions>){return <FloatingElement {...props} kind={NodeKind.Popup}/>;}
/** Automatically shown on target hover/focus, or explicitly controlled by isOpen. */
export function ToolTip(props:ToolTipOptions & FloatingProps<ToolTipOptions>){return <FloatingElement {...props} kind={NodeKind.ToolTip}/>;}
/** Dismissible floating content. Closing can be cancelled synchronously. */
export function Flyout(props:FlyoutOptions & FloatingProps<FlyoutOptions>){return <FloatingElement {...props} kind={NodeKind.Flyout}/>;}
/** Flat command, toggle and separator menu. */
export function MenuFlyout(props:MenuFlyoutOptions & FloatingProps<MenuFlyoutOptions>){return <FloatingElement {...props} kind={NodeKind.MenuFlyout}/>;}
export interface SliderProps extends SliderOptions {onReady?:(slider:SliderController)=>void;onValueChanged?:(event:SceneEvent)=>void;}
export function Slider({onReady,onValueChanged,...options}:SliderProps){return <NodeElement kind={NodeKind.Slider} options={options} onReady={n=>onReady?.(n as SliderController)} onValueChanged={onValueChanged}/>;}

export interface InfoBarProps extends InfoBarOptions {children?:ReactNode;action?:ReactNode;onReady?:(control:InfoBarController)=>void;onCloseButtonClick?:(event:SceneEvent)=>void;onClosing?:(event:SceneEvent)=>void;onClosed?:(event:SceneEvent)=>void;onOpened?:(event:SceneEvent)=>void;}
export function InfoBar({children,action,onReady,onCloseButtonClick,onClosing,onClosed,onOpened,...options}:InfoBarProps){return <NodeElement kind={NodeKind.InfoBar} options={options} onReady={n=>onReady?.(n as InfoBarController)} onCloseButtonClick={onCloseButtonClick} onClosing={onClosing} onClosed={onClosed} onOpened={onOpened}>{children}{action&&<NodeElement kind={NodeKind.Grid} options={{isInfoBarAction:true}}>{action}</NodeElement>}</NodeElement>;}
export interface PersonPictureProps extends PersonPictureOptions {onReady?:(control:SceneNode<PersonPictureOptions>)=>void;}
export function PersonPicture({onReady,...options}:PersonPictureProps){return <NodeElement kind={NodeKind.PersonPicture} options={options} onReady={n=>onReady?.(n as SceneNode<PersonPictureOptions>)}/>;}
export interface RatingControlProps extends RatingControlOptions {onReady?:(control:RatingController)=>void;onValueChanged?:(event:SceneEvent)=>void;}
export function RatingControl({onReady,onValueChanged,...options}:RatingControlProps){return <NodeElement kind={NodeKind.RatingControl} options={options} onReady={n=>onReady?.(n as RatingController)} onValueChanged={onValueChanged}/>;}
export interface SplitButtonProps extends SplitButtonOptions {children?:ReactNode;flyout?:FloatingSurface<PopupOptions>|null;onReady?:(control:SplitController)=>void;onClick?:(event:SceneEvent)=>void;}
export interface ToggleSplitButtonProps extends ToggleSplitButtonOptions {children?:ReactNode;flyout?:FloatingSurface<PopupOptions>|null;onReady?:(control:ToggleSplitController)=>void;onClick?:(event:SceneEvent)=>void;onIsCheckedChanged?:(event:SceneEvent)=>void;}
function SplitElement({kind,children,flyout,onReady,onClick,onIsCheckedChanged,...options}:(SplitButtonProps|ToggleSplitButtonProps)&{kind:NodeKind;onIsCheckedChanged?:(event:SceneEvent)=>void}){
 const [node,setNode]=useState<SplitController|null>(null);
 useLayoutEffect(()=>{if(flyout!==undefined&&node&&!node.isDisposed&&!flyout?.isDisposed)node.setFlyout(flyout);},[node,flyout]);
 return <NodeElement kind={kind} options={options} onReady={n=>{const control=n as SplitController;setNode(control);onReady?.(control as ToggleSplitController);}} onClick={onClick} onIsCheckedChanged={onIsCheckedChanged}>{children}</NodeElement>;
}
export function SplitButton(props:SplitButtonProps){return <SplitElement {...props} kind={NodeKind.SplitButton}/>;}
export function ToggleSplitButton(props:ToggleSplitButtonProps){return <SplitElement {...props} kind={NodeKind.ToggleSplitButton}/>;}

export interface CollectionProps<T extends CollectionItem=CollectionItem> extends CollectionViewOptions<T> {
 /** Native collection header. */ renderHeader?:ReactNode;
 /** Runs only for Rust-realized items. Normal SDK components and callbacks are supported. */ renderItem?:(item:T,state:{selected:boolean;index:number})=>ReactNode;
 /** Optional custom group heading; the collection measures and owns its container. */
 renderGroupHeader?:(group:CollectionGroup<T>)=>ReactNode;
 onContextRequested?:(event:SceneEvent&{item:T;container:import("./scene").CollectionItemContainer})=>void;
 onItemsChanged?:(event:CollectionItemsChangedEvent<T>)=>void;
 onDragItemsStarting?:(event:CollectionDragEvent<T>)=>void;
 onDragOver?:(event:CollectionDragEvent<T>)=>void;
 onDrop?:(event:CollectionDragEvent<T>)=>void;
 onDragItemsCompleted?:(event:CollectionDragEvent<T>)=>void;
 onLoadMore?:(request:{startIndex:number;count:number})=>void;
 onReady?:(control:CollectionController<T>)=>void;
 onItemClick?:(event:SceneEvent&{item:T})=>void;
 onSelectionChanged?:(event:SceneEvent&{selectedKeys:readonly string[];selectedItems:readonly T[]})=>void;
}
function CollectionElement<T extends CollectionItem>({kind,renderHeader,renderItem,renderGroupHeader,onReady,onItemClick,onSelectionChanged,onContextRequested,onItemsChanged,onDragItemsStarting,onDragOver,onDrop,onDragItemsCompleted,onLoadMore,...options}:CollectionProps<T>&{kind:NodeKind}){
 const [header,setHeader]=useState<PanelController|null>(null);
 const control=useRef<CollectionController<T>|null>(null);const [slots,setSlots]=useState<CollectionRealization<T>[]>([]);const[headers,setHeaders]=useState<ReturnType<CollectionController<T>["realizedGroups"]>>([]);
 const refresh=()=>{const node=control.current;if(node&&!node.isDisposed){setSlots(node.realizedItems());setHeaders(node.realizedGroups());}};
 return <><NodeElement kind={kind} options={{...options,hasItemTemplate:!!renderItem,hasGroupHeaderTemplate:!!renderGroupHeader}} onReady={n=>{control.current=n as CollectionController<T>;if(renderHeader)setHeader(control.current.header());onReady?.(control.current);refresh();}} onEvent={e=>{
  const node=control.current;if(!node||node.isDisposed)return;
  if(e.kind===EventKind.ItemClick){const item=node.clientItems[e.selectedIndex??-1];if(item!==undefined)onItemClick?.({...e,item});}
  if(e.kind===EventKind.SelectionChanged){onSelectionChanged?.({...e,selectedKeys:node.selectedKeys,selectedItems:node.selectedItems});refresh();}
  if(e.kind===EventKind.ContextRequested){const slot=node.realizedItems().find(s=>s.key===e.collection?.keys[0]);if(slot)onContextRequested?.(Object.assign(e,{item:slot.item,container:slot.container}));}
  if(e.kind===EventKind.ItemsChanged){onItemsChanged?.({...e,items:node.clientItems,groups:node.clientGroups,reason:e.collection!.reason});refresh();}
  if(e.kind===EventKind.IncrementalLoadRequested)onLoadMore?.({startIndex:e.collection!.index,count:e.collection!.count});
  const handler=e.kind===EventKind.DragItemsStarting?onDragItemsStarting:e.kind===EventKind.DragOver?onDragOver:e.kind===EventKind.Drop?onDrop:e.kind===EventKind.DragItemsCompleted?onDragItemsCompleted:undefined;
  if(handler){const drag=Object.assign(e,{items:(e as CollectionDragEvent<T>).items,insertIndex:e.collection!.index,acceptedOperation:e.collection!.operation});handler(drag);}
  if(e.kind===EventKind.RealizationChanged)refresh();
 }}/>{header&&!header.isDisposed&&renderHeader&&<ParentContext.Provider value={header}>{renderHeader}</ParentContext.Provider>}{renderItem&&slots.filter(s=>!s.container.isDisposed).map(slot=><ParentContext.Provider key={slot.key+':'+slot.container.snapshot.id} value={slot.container}>{renderItem(slot.item,{selected:slot.selected,index:slot.index})}</ParentContext.Provider>)}{renderGroupHeader&&headers.filter(s=>!s.container.isDisposed).map(slot=><ParentContext.Provider key={"group:"+slot.key+":"+slot.container.snapshot.id} value={slot.container}>{renderGroupHeader(slot.group)}</ParentContext.Provider>)}</>;
}
export function ListView<T extends CollectionItem=CollectionItem>(props:CollectionProps<T>){return <CollectionElement {...props} kind={NodeKind.ListView}/>;}
export function GridView<T extends CollectionItem=CollectionItem>(props:CollectionProps<T>){return <CollectionElement {...props} kind={NodeKind.GridView}/>;}
type NavigationRender<T>=(item:T,context:{index:number;selected:boolean})=>ReactNode;
function NavigationTemplates<T extends NavigationData>({control,content,header,stripHeader,stripFooter}:{control:DataNavigationController<any,T>|null;content?:NavigationRender<T>;header?:NavigationRender<T>;stripHeader?:ReactNode;stripFooter?:ReactNode}){
 const [,refresh]=useState(0);const roles=[content?'content':null,header?'header':null,stripHeader!==undefined?'stripHeader':null,stripFooter!==undefined?'stripFooter':null].filter(Boolean) as ('content'|'header'|'stripHeader'|'stripFooter')[];const roleKey=roles.join('|');
 useLayoutEffect(()=>{if(!control||control.isDisposed)return;const off=control.onTemplateSlotsChanged(()=>refresh(v=>v+1));const release=roles.map(role=>control.attachReactTemplate(role));return()=>{off();for(const stop of release)stop();};},[control,roleKey]);
 if(!control||control.isDisposed)return null;
 return <>{roles.flatMap(role=>control.templateSlots(role).filter(s=>!s.slot.container.isDisposed).map(({item,slot})=><ParentContext.Provider key={`${role}:${slot.itemKey}:${slot.id}`} value={slot.container}>{role==='stripHeader'?stripHeader:role==='stripFooter'?stripFooter:(role==='header'?header:content)?.(item,{index:slot.index,selected:slot.index===control.selectedIndex})}</ParentContext.Provider>))}</>;
}
export interface FlipViewProps<T extends NavigationData=NavigationData> extends FlipViewOptions<T> {renderItem?:NavigationRender<T>;onReady?:(node:FlipViewController<T>)=>void;onSelectionChanged?:(event:NavigationControlEvent<T>)=>void;}
export function FlipView<T extends NavigationData=NavigationData>({renderItem,onReady,onSelectionChanged,...options}:FlipViewProps<T>){
 const [node,setNode]=useState<FlipViewController<T>|null>(null);
 return <><NodeElement kind={NodeKind.FlipView} options={options} onReady={n=>{const control=n as FlipViewController<T>;setNode(control);onReady?.(control);}} onEvent={e=>{if(e.kind===EventKind.SelectionChanged&&node)onSelectionChanged?.(node.navigationEvent(e));}}/><NavigationTemplates control={node} content={renderItem}/></>;
}
export interface PipsPagerProps extends PipsPagerOptions {onReady?:(node:PipsPagerController)=>void;onSelectedIndexChanged?:(event:NavigationControlEvent)=>void;}
export function PipsPager({onReady,onSelectedIndexChanged,...options}:PipsPagerProps){
 const control=useRef<PipsPagerController|null>(null);return <NodeElement kind={NodeKind.PipsPager} options={options} onReady={n=>{control.current=n as PipsPagerController;onReady?.(control.current);}} onEvent={e=>{if(e.kind===EventKind.SelectedIndexChanged&&control.current)onSelectedIndexChanged?.(control.current.navigationEvent(e));}}/>;
}
export interface BreadcrumbBarProps<T extends NavigationData=NavigationData> extends BreadcrumbBarOptions<T> {renderItem?:NavigationRender<T>;onReady?:(node:BreadcrumbBarController<T>)=>void;onItemClicked?:(event:NavigationControlEvent<T>)=>void;}
export function BreadcrumbBar<T extends NavigationData=NavigationData>({renderItem,onReady,onItemClicked,...options}:BreadcrumbBarProps<T>){
 const [node,setNode]=useState<BreadcrumbBarController<T>|null>(null);return <><NodeElement kind={NodeKind.BreadcrumbBar} options={options} onReady={n=>{const control=n as BreadcrumbBarController<T>;setNode(control);onReady?.(control);}} onEvent={e=>{if(e.kind===EventKind.ItemClick&&node)onItemClicked?.(node.navigationEvent(e));}}/><NavigationTemplates control={node} header={renderItem}/></>;
}
export interface TabViewProps<T extends TabItem=TabItem> extends TabViewOptions<T> {
 renderHeader?:NavigationRender<T>;renderContent?:NavigationRender<T>;tabStripHeader?:ReactNode;tabStripFooter?:ReactNode;
 onReady?:(node:TabViewController<T>)=>void;onSelectionChanged?:(event:NavigationControlEvent<T>)=>void;
 onTabCloseRequested?:(event:NavigationControlEvent<T>)=>void;onAddTabButtonClick?:(event:NavigationControlEvent<T>)=>void;
 onTabDroppedOutside?:(event:NavigationControlEvent<T>)=>void;onItemsChanged?:(event:NavigationItemsChangedEvent<T>)=>void;
}
export function TabView<T extends TabItem=TabItem>({renderHeader,renderContent,tabStripHeader,tabStripFooter,onReady,onSelectionChanged,onTabCloseRequested,onAddTabButtonClick,onTabDroppedOutside,onItemsChanged,...options}:TabViewProps<T>){
 const [node,setNode]=useState<TabViewController<T>|null>(null);return <><NodeElement kind={NodeKind.TabView} options={options} onReady={n=>{const control=n as TabViewController<T>;setNode(control);onReady?.(control);}} onEvent={e=>{if(!node)return;const event=node.navigationEvent(e);if(e.kind===EventKind.SelectionChanged)onSelectionChanged?.(event);if(e.kind===EventKind.TabCloseRequested)onTabCloseRequested?.(event);if(e.kind===EventKind.AddTabButtonClick)onAddTabButtonClick?.(event);if(e.kind===EventKind.TabDroppedOutside)onTabDroppedOutside?.(event);if(e.kind===EventKind.ItemsChanged)onItemsChanged?.({...event,items:node.items});}}/><NavigationTemplates control={node} content={renderContent} header={renderHeader} stripHeader={tabStripHeader} stripFooter={tabStripFooter}/></>;
}
export interface TreeViewProps<T extends TreeItem=TreeItem> extends TreeViewOptions<T> {
 renderItem?:(item:T,context:{index:number;selected:boolean;depth:number;expanded:boolean;partial:boolean})=>ReactNode;
 onReady?:(node:TreeViewController<T>)=>void;
 onSelectionChanged?:(event:NavigationControlEvent<T>&{selectedKeys:readonly string[];selectedItems:readonly T[]})=>void;
 onItemInvoked?:(event:NavigationControlEvent<T>)=>void;onExpanding?:(event:NavigationControlEvent<T>)=>void;onCollapsed?:(event:NavigationControlEvent<T>)=>void;
 onItemsChanged?:(event:NavigationItemsChangedEvent<T>)=>void;
}
export function TreeView<T extends TreeItem=TreeItem>({renderItem,onReady,onSelectionChanged,onItemInvoked,onExpanding,onCollapsed,onItemsChanged,...options}:TreeViewProps<T>){
 const control=useRef<TreeViewController<T>|null>(null);const[slots,setSlots]=useState<ReturnType<TreeViewController<T>['realizedItems']>>([]);const [rows,setRows]=useState<readonly TreeRowSnapshot[]>([]);
 const refresh=()=>{const node=control.current;if(!node||node.isDisposed)return;setSlots(node.realizedItems());setRows(node.treeRows());};
 return <><NodeElement kind={NodeKind.TreeView} options={{...options,hasItemTemplate:!!renderItem}} onReady={n=>{control.current=n as TreeViewController<T>;onReady?.(control.current);refresh();}} onEvent={e=>{const node=control.current;if(!node)return;const event=node.navigationEvent(e);if(e.kind===EventKind.SelectionChanged){onSelectionChanged?.({...event,selectedKeys:node.selectedKeys,selectedItems:node.selectedItems});refresh();}if(e.kind===EventKind.RealizationChanged)refresh();if(e.kind===EventKind.ItemInvoked)onItemInvoked?.(event);if(e.kind===EventKind.Expanding)onExpanding?.(event);if(e.kind===EventKind.Collapsed)onCollapsed?.(event);if(e.kind===EventKind.ItemsChanged){onItemsChanged?.({...event,items:node.items});refresh();}}}/>{renderItem&&slots.filter(s=>!s.container.isDisposed).map(slot=>{const row=rows.find(r=>r.key===slot.key);return <ParentContext.Provider key={`${slot.key}:${slot.container.snapshot.id}`} value={slot.container}>{renderItem(slot.item,{index:slot.index,selected:slot.selected,depth:row?.depth??0,expanded:row?.expanded??false,partial:row?.partial??false})}</ParentContext.Provider>;})}</>;
}
export interface ItemsPanelProps extends ItemsPanelOptions {children?:ReactNode;onReady?:(panel:PanelController<ItemsPanelOptions>)=>void;}
export function ItemsStackPanel({children,onReady,...options}:ItemsPanelProps){return <NodeElement kind={NodeKind.ItemsStackPanel} options={options} onReady={n=>onReady?.(n as PanelController<ItemsPanelOptions>)}>{children}</NodeElement>;}
export function ItemsWrapGrid({children,onReady,...options}:ItemsPanelProps){return <NodeElement kind={NodeKind.ItemsWrapGrid} options={options} onReady={n=>onReady?.(n as PanelController<ItemsPanelOptions>)}>{children}</NodeElement>;}
export function VariableSizedWrapGrid({children,onReady,...options}:ItemsPanelProps){return <NodeElement kind={NodeKind.VariableSizedWrapGrid} options={options} onReady={n=>onReady?.(n as PanelController<ItemsPanelOptions>)}>{children}</NodeElement>;}

export interface NumberBoxProps extends NumberBoxOptions {onReady?:(node:NumberBoxController)=>void;onValueChanged?:(event:ComposedEvent)=>void;}
export function NumberBox({onReady,onValueChanged,...options}:NumberBoxProps){return <NodeElement kind={NodeKind.NumberBox} options={options} onReady={n=>onReady?.(n as NumberBoxController)} onValueChanged={onValueChanged}/>;}
export interface AutoSuggestBoxProps<T extends CollectionItem=CollectionItem> extends AutoSuggestBoxOptions<T>{onReady?:(node:AutoSuggestBoxController<T>)=>void;onTextChanged?:(event:ComposedEvent<T>)=>void;onSuggestionChosen?:(event:ComposedEvent<T>)=>void;onQuerySubmitted?:(event:ComposedEvent<T>)=>void;renderItem?:(item:T,context:{selected:boolean;index:number})=>ReactNode;}
export function AutoSuggestBox<T extends CollectionItem=CollectionItem>({onReady,onTextChanged,onSuggestionChosen,onQuerySubmitted,renderItem,...options}:AutoSuggestBoxProps<T>){const[node,setNode]=useState<AutoSuggestBoxController<T>|null>(null);return <><NodeElement kind={NodeKind.AutoSuggestBox} options={options} onReady={n=>{setNode(n as AutoSuggestBoxController<T>);onReady?.(n as AutoSuggestBoxController<T>);}} onEvent={e=>{if(e.kind===EventKind.TextChanged)onTextChanged?.(e);if(e.kind===EventKind.SuggestionChosen)onSuggestionChosen?.(e);if(e.kind===EventKind.QuerySubmitted)onQuerySubmitted?.(e);}}/>{node&&renderItem&&<ComposedItemTemplate view={node.itemsView} render={renderItem}/>}</>;}
export interface ComboBoxProps<T extends CollectionItem=CollectionItem> extends ComboBoxOptions<T>{onReady?:(node:ComboBoxController<T>)=>void;onSelectionChanged?:(event:ComposedEvent<T>)=>void;onTextSubmitted?:(event:ComposedEvent<T>)=>void;renderItem?:(item:T,context:{selected:boolean;index:number})=>ReactNode;}
export function ComboBox<T extends CollectionItem=CollectionItem>({onReady,onSelectionChanged,onTextSubmitted,renderItem,...options}:ComboBoxProps<T>){const[node,setNode]=useState<ComboBoxController<T>|null>(null);return <><NodeElement kind={NodeKind.ComboBox} options={options} onReady={n=>{setNode(n as ComboBoxController<T>);onReady?.(n as ComboBoxController<T>);}} onSelectionChanged={onSelectionChanged} onEvent={e=>{if(e.kind===EventKind.TextSubmitted)onTextSubmitted?.(e);}}/>{node&&renderItem&&<ComposedItemTemplate view={node.itemsView} render={renderItem}/>}</>;}
function ComposedItemTemplate<T extends CollectionItem>({view,render}:{view:import('./scene').SuggestionItemsView<T>;render:(item:T,context:{selected:boolean;index:number})=>ReactNode}){
 const[slots,setSlots]=useState<readonly CollectionRealization<T>[]>([]);
 useLayoutEffect(()=>{const off=view.onRealizedChanged(items=>setSlots([...items]));const offSelection=view.onSelectionChanged(()=>setSlots([...view.realizedItems()]));const release=view.setItemTemplate(()=>{});setSlots([...view.realizedItems()]);return()=>{off();offSelection();release();};},[view]);
 return <>{slots.filter(s=>!s.container.isDisposed).map(s=><ParentContext.Provider key={s.key+':'+s.container.snapshot.id} value={s.container}>{render(s.item,{selected:s.selected,index:s.index})}</ParentContext.Provider>)}</>;
}
export interface ContentDialogProps extends ContentDialogOptions{children?:ReactNode;onReady?:(node:ContentDialogController)=>void;onPrimaryButtonClick?:(event:ComposedEvent)=>void;onSecondaryButtonClick?:(event:ComposedEvent)=>void;onCloseButtonClick?:(event:ComposedEvent)=>void;onClosing?:(event:ComposedEvent)=>void;onOpened?:(event:ComposedEvent)=>void;onClosed?:(event:ComposedEvent)=>void;}
export function ContentDialog({children,onReady,onPrimaryButtonClick,onSecondaryButtonClick,onCloseButtonClick,onClosing,onOpened,onClosed,...options}:ContentDialogProps){return <NodeElement kind={NodeKind.ContentDialog} options={options} onReady={n=>onReady?.(n as ContentDialogController)} onCloseButtonClick={onCloseButtonClick} onClosing={onClosing} onOpened={onOpened} onClosed={onClosed} onEvent={e=>{if(e.kind===EventKind.PrimaryButtonClick)onPrimaryButtonClick?.(e);if(e.kind===EventKind.SecondaryButtonClick)onSecondaryButtonClick?.(e);}}>{children}</NodeElement>;}
export interface TeachingTipProps extends TeachingTipOptions{children?:ReactNode;heroContent?:ReactNode;target?:SceneNode|null;onReady?:(node:TeachingTipController)=>void;onActionButtonClick?:(event:ComposedEvent)=>void;onCloseButtonClick?:(event:ComposedEvent)=>void;onClosing?:(event:ComposedEvent)=>void;onClosed?:(event:ComposedEvent)=>void;}
export function TeachingTip({children,heroContent,target,onReady,onActionButtonClick,onCloseButtonClick,onClosing,onClosed,...options}:TeachingTipProps){const[node,setNode]=useState<TeachingTipController|null>(null);useLayoutEffect(()=>{node?.attachTo(target??null);},[node,target]);return <NodeElement kind={NodeKind.TeachingTip} options={options} onReady={n=>{setNode(n as TeachingTipController);onReady?.(n as TeachingTipController);}} onClosing={onClosing} onClosed={onClosed} onCloseButtonClick={onCloseButtonClick} onEvent={e=>{if(e.kind===EventKind.ActionButtonClick)onActionButtonClick?.(e);}}>{children}{node&&heroContent&&<ParentContext.Provider value={node.heroContent}>{heroContent}</ParentContext.Provider>}</NodeElement>;}

export interface AppBarButtonProps extends AppBarButtonOptions {children?:ReactNode;flyout?:FloatingSurface<PopupOptions>|null;onReady?:(node:AppBarButtonController)=>void;onClick?:(event:SceneEvent)=>void;}
export interface AppBarToggleButtonProps extends AppBarToggleButtonOptions {children?:ReactNode;flyout?:FloatingSurface<PopupOptions>|null;onReady?:(node:AppBarToggleButtonController)=>void;onClick?:(event:SceneEvent)=>void;onCheckedChanged?:(event:SceneEvent)=>void;}
export interface DropDownButtonProps extends DropDownButtonOptions {children?:ReactNode;flyout?:FloatingSurface<PopupOptions>|null;onReady?:(node:DropDownButtonController)=>void;onClick?:(event:SceneEvent)=>void;}
function CommandActionElement({kind,children,flyout,onReady,onClick,onCheckedChanged,...options}:(AppBarButtonProps|AppBarToggleButtonProps|DropDownButtonProps)&{kind:NodeKind;onCheckedChanged?:(event:SceneEvent)=>void}){const[node,setNode]=useState<AppBarButtonController|AppBarToggleButtonController|DropDownButtonController|null>(null);useLayoutEffect(()=>{if(node&&!node.isDisposed&&flyout!==undefined)node.setFlyout(flyout);},[node,flyout]);return <NodeElement kind={kind} options={options} onReady={n=>{const action=n as AppBarButtonController;setNode(action);(onReady as ((node:AppBarButtonController)=>void)|undefined)?.(action);}} onClick={onClick} onEvent={e=>{if([EventKind.Checked,EventKind.Unchecked,EventKind.Indeterminate].includes(e.kind))onCheckedChanged?.(e);}}>{children}</NodeElement>;}
export function AppBarButton(props:AppBarButtonProps){return <CommandActionElement kind={NodeKind.AppBarButton} {...props}/>;}
export function AppBarToggleButton(props:AppBarToggleButtonProps){return <CommandActionElement kind={NodeKind.AppBarToggleButton} {...props}/>;}
export function DropDownButton(props:DropDownButtonProps){return <CommandActionElement kind={NodeKind.DropDownButton} {...props}/>;}
export interface CommandBarProps<T extends CommandBarItem=CommandBarItem> extends CommandBarOptions<T> {children?:ReactNode;onReady?:(node:CommandBarController<T>)=>void;onCommandInvoked?:(event:CommandBarEvent<T>)=>void;}
export function CommandBar<T extends CommandBarItem=CommandBarItem>({children,onReady,onCommandInvoked,...options}:CommandBarProps<T>){return <NodeElement kind={NodeKind.CommandBar} options={options} onReady={n=>onReady?.(n as CommandBarController<T>)} onEvent={e=>{if(e.kind===EventKind.ItemClick){const event=e as CommandBarEvent;onCommandInvoked?.({...event,item:[...options.primaryCommands??[],...options.secondaryCommands??[]].find(i=>i.id===event.command.id)});}}}>{children}</NodeElement>;}
export interface SelectorBarProps<T extends NavigationData=NavigationData> extends SelectorBarOptions<T>{onReady?:(node:SelectorBarController<T>)=>void;onSelectionChanged?:(event:NavigationControlEvent<T>)=>void;}
export function SelectorBar<T extends NavigationData=NavigationData>({onReady,onSelectionChanged,...options}:SelectorBarProps<T>){const control=useRef<SelectorBarController<T>|null>(null);return <NodeElement kind={NodeKind.SelectorBar} options={options} onReady={n=>{control.current=n as SelectorBarController<T>;onReady?.(control.current);}} onEvent={e=>{if(e.kind===EventKind.SelectionChanged&&control.current)onSelectionChanged?.(control.current.navigationEvent(e));}}/>;}

export interface AppBarSeparatorProps extends AppBarSeparatorOptions {onReady?:(node:import('./scene').AppBarSeparator)=>void;}
/** Noninteractive separator, drawn by the shared Rust AppBar template. */
export function AppBarSeparator({onReady,...options}:AppBarSeparatorProps){return <NodeElement kind={NodeKind.AppBarSeparator} options={options} onReady={node=>onReady?.(node as import('./scene').AppBarSeparator)}/>;}

export interface CalendarViewProps extends CalendarViewOptions{onReady?:(node:CalendarViewController)=>void;onSelectedDatesChanged?:(event:PickerEvent)=>void;onDisplayModeChanged?:(event:PickerEvent)=>void;}
export function CalendarView({onReady,onSelectedDatesChanged,onDisplayModeChanged,...options}:CalendarViewProps){return <NodeElement kind={NodeKind.CalendarView} options={options} onReady={n=>onReady?.(n as CalendarViewController)} onEvent={e=>{if(e.kind===EventKind.SelectedDatesChanged)onSelectedDatesChanged?.(e as PickerEvent);if(e.kind===EventKind.DisplayModeChanged)onDisplayModeChanged?.(e as PickerEvent);}}/>;}
export interface CalendarDatePickerProps extends CalendarDatePickerOptions{onReady?:(node:CalendarDatePickerController)=>void;onDateChanged?:(event:PickerEvent)=>void;onOpened?:(event:PickerEvent)=>void;onClosed?:(event:PickerEvent)=>void;}
export function CalendarDatePicker({onReady,onDateChanged,onOpened,onClosed,...options}:CalendarDatePickerProps){return <NodeElement kind={NodeKind.CalendarDatePicker} options={options} onReady={n=>onReady?.(n as CalendarDatePickerController)} onEvent={e=>{if(e.kind===EventKind.DateChanged)onDateChanged?.(e as PickerEvent);if(e.kind===EventKind.Opened)onOpened?.(e as PickerEvent);if(e.kind===EventKind.Closed)onClosed?.(e as PickerEvent);}}/>;}
export interface DatePickerProps extends DatePickerOptions{onReady?:(node:DatePickerController)=>void;onDateChanged?:(event:PickerEvent)=>void;onSelectedDateChanged?:(event:PickerEvent)=>void;onOpened?:(event:PickerEvent)=>void;onClosed?:(event:PickerEvent)=>void;}
export function DatePicker({onReady,onDateChanged,onSelectedDateChanged,onOpened,onClosed,...options}:DatePickerProps){return <NodeElement kind={NodeKind.DatePicker} options={options} onReady={n=>onReady?.(n as DatePickerController)} onEvent={e=>{if(e.kind===EventKind.DateChanged)onDateChanged?.(e as PickerEvent);if(e.kind===EventKind.SelectedDateChanged)onSelectedDateChanged?.(e as PickerEvent);if(e.kind===EventKind.Opened)onOpened?.(e as PickerEvent);if(e.kind===EventKind.Closed)onClosed?.(e as PickerEvent);}}/>;}
export interface TimePickerProps extends TimePickerOptions{onReady?:(node:TimePickerController)=>void;onTimeChanged?:(event:PickerEvent)=>void;onSelectedTimeChanged?:(event:PickerEvent)=>void;onOpened?:(event:PickerEvent)=>void;onClosed?:(event:PickerEvent)=>void;}
export function TimePicker({onReady,onTimeChanged,onSelectedTimeChanged,onOpened,onClosed,...options}:TimePickerProps){return <NodeElement kind={NodeKind.TimePicker} options={options} onReady={n=>onReady?.(n as TimePickerController)} onEvent={e=>{if(e.kind===EventKind.TimeChanged)onTimeChanged?.(e as PickerEvent);if(e.kind===EventKind.SelectedTimeChanged)onSelectedTimeChanged?.(e as PickerEvent);if(e.kind===EventKind.Opened)onOpened?.(e as PickerEvent);if(e.kind===EventKind.Closed)onClosed?.(e as PickerEvent);}}/>;}
export interface ColorPickerProps extends ColorPickerOptions{onReady?:(node:ColorPickerController)=>void;onColorChanged?:(event:PickerEvent)=>void;}
export function ColorPicker({onReady,onColorChanged,...options}:ColorPickerProps){return <NodeElement kind={NodeKind.ColorPicker} options={options} onReady={n=>onReady?.(n as ColorPickerController)} onEvent={e=>{if(e.kind===EventKind.ColorChanged)onColorChanged?.(e as PickerEvent);}}/>;}

export interface MenuBarProps extends MenuBarOptions {children?:ReactNode;onReady?:(node:import('./scene').MenuBar)=>void;onItemInvoked?:(event:SceneEvent)=>void;}
export function MenuBar({children,onReady,onItemInvoked,...options}:MenuBarProps){return <NodeElement kind={NodeKind.MenuBar} options={options} onReady={n=>onReady?.(n as import('./scene').MenuBar)} onItemInvoked={onItemInvoked}>{children}</NodeElement>;}
export interface MenuBarItemProps extends MenuBarItemOptions {onReady?:(node:import('./scene').MenuBarItem)=>void;onItemInvoked?:(event:SceneEvent)=>void;}
export function MenuBarItem({onReady,onItemInvoked,...options}:MenuBarItemProps){return <NodeElement kind={NodeKind.MenuBarItem} options={options} onReady={n=>onReady?.(n as import('./scene').MenuBarItem)} onItemInvoked={onItemInvoked}/>;}
export interface RelativePanelProps extends RelativePanelOptions {children?:ReactNode;onReady?:(node:PanelController<RelativePanelOptions>)=>void;}
export function RelativePanel({children,onReady,...options}:RelativePanelProps){return <NodeElement kind={NodeKind.RelativePanel} options={options} onReady={n=>onReady?.(n as PanelController<RelativePanelOptions>)}>{children}</NodeElement>;}
export interface WrapPanelProps extends WrapPanelOptions {children?:ReactNode;onReady?:(node:PanelController<WrapPanelOptions>)=>void;}
export function WrapPanel({children,onReady,...options}:WrapPanelProps){return <NodeElement kind={NodeKind.WrapPanel} options={options} onReady={n=>onReady?.(n as PanelController<WrapPanelOptions>)}>{children}</NodeElement>;}
export interface CommandBarFlyoutProps extends CommandBarFlyoutOptions {target?:SceneNode|null;onReady?:(node:import('./scene').CommandBarFlyout)=>void;onCommandInvoked?:(event:CommandBarEvent)=>void;onClosing?:(event:SceneEvent)=>void;onClosed?:(event:SceneEvent)=>void;}
export function CommandBarFlyout({target,onReady,onCommandInvoked,onClosing,onClosed,...options}:CommandBarFlyoutProps){const[node,setNode]=useState<import('./scene').CommandBarFlyout|null>(null);useLayoutEffect(()=>{if(node&&!node.isDisposed)node.attachTo(target??null);},[node,target]);return <NodeElement kind={NodeKind.CommandBarFlyout} options={options} onReady={n=>{setNode(n as import('./scene').CommandBarFlyout);onReady?.(n as import('./scene').CommandBarFlyout);}} onEvent={e=>{if(e.kind===EventKind.ItemClick)onCommandInvoked?.(e as CommandBarEvent);}} onClosing={onClosing} onClosed={onClosed}/>;}

export interface SplitViewProps extends importViewTypes.SplitViewOptions {children?:ReactNode;pane?:ReactNode;onReady?:(node:import('./scene').SplitView)=>void;onPaneClosing?:(event:SceneEvent)=>void;onEvent?:(event:SceneEvent)=>void;}
/** WinUI SplitView, implemented entirely by the Rust SDK. */
export function SplitView({children,pane,onReady,onPaneClosing,onEvent,...options}:SplitViewProps){return <NodeElement kind={NodeKind.SplitView} options={options} onReady={n=>onReady?.(n as import('./scene').SplitView)} onPaneClosing={onPaneClosing} onEvent={onEvent}><NodeElement kind={NodeKind.Grid} options={{viewControls:{slot:'Content'}}}>{children}</NodeElement><NodeElement kind={NodeKind.Grid} options={{viewControls:{slot:'Pane'}}}>{pane}</NodeElement></NodeElement>;}
export interface SemanticZoomProps extends importViewTypes.SemanticZoomOptions {zoomedInView:ReactNode;zoomedOutView:ReactNode;onReady?:(node:import('./scene').SemanticZoom)=>void;onEvent?:(event:SceneEvent)=>void;}
/** WinUI SemanticZoom, using two Rust scene subtrees. */
export function SemanticZoom({zoomedInView,zoomedOutView,onReady,onEvent,...options}:SemanticZoomProps){return <NodeElement kind={NodeKind.SemanticZoom} options={options} onReady={n=>onReady?.(n as import('./scene').SemanticZoom)} onEvent={onEvent}><NodeElement kind={NodeKind.Grid} options={{viewControls:{slot:'ZoomedIn'}}}>{zoomedInView}</NodeElement><NodeElement kind={NodeKind.Grid} options={{viewControls:{slot:'ZoomedOut'}}}>{zoomedOutView}</NodeElement></NodeElement>;}
export interface ParallaxViewProps extends importViewTypes.ParallaxViewOptions {children?:ReactNode;onReady?:(node:import('./scene').ParallaxView)=>void;}
/** WinUI ParallaxView. React only passes the Rust scrolling source. */
export function ParallaxView({children,onReady,...options}:ParallaxViewProps){return <NodeElement kind={NodeKind.ParallaxView} options={options} onReady={n=>onReady?.(n as import('./scene').ParallaxView)}>{children}</NodeElement>;}
export interface UICommandProps extends importViewTypes.UICommandOptions {onReady?:(node:import('./scene').UICommand)=>void;onExecuteRequested?:(event:importViewTypes.UICommandEvent)=>void;onCanExecuteRequested?:(event:importViewTypes.UICommandEvent)=>void;}
/** Implements WinUI XamlUICommand. Rust owns the command; React supplies business callbacks. */
export function UICommand({onReady,onExecuteRequested,onCanExecuteRequested,...options}:UICommandProps){return <NodeElement kind={NodeKind.UICommand} options={options} onReady={n=>onReady?.(n as import('./scene').UICommand)} onEvent={e=>{if(e.kind===EventKind.ExecuteRequested)onExecuteRequested?.(e as importViewTypes.UICommandEvent);if(e.kind===EventKind.CanExecuteRequested)onCanExecuteRequested?.(e as importViewTypes.UICommandEvent);}}/>;}
export interface StandardCommandProps extends importViewTypes.StandardCommandOptions {onReady?:(node:import('./scene').StandardCommand)=>void;onExecuteRequested?:(event:importViewTypes.UICommandEvent)=>void;onCanExecuteRequested?:(event:importViewTypes.UICommandEvent)=>void;}
/** Implements WinUI StandardUICommand. Native presets are metadata; callbacks perform business actions. */
export function StandardCommand({onReady,onExecuteRequested,onCanExecuteRequested,...options}:StandardCommandProps){return <NodeElement kind={NodeKind.StandardCommand} options={options} onReady={n=>onReady?.(n as import('./scene').StandardCommand)} onEvent={e=>{if(e.kind===EventKind.ExecuteRequested)onExecuteRequested?.(e as importViewTypes.UICommandEvent);if(e.kind===EventKind.CanExecuteRequested)onCanExecuteRequested?.(e as importViewTypes.UICommandEvent);}}/>;}

export interface ItemsRepeaterProps<T extends CollectionItem=CollectionItem> extends ItemsRepeaterOptions<T>{
 renderItem?:(item:T,context:{index:number})=>ReactNode;
 onReady?:(control:RepeaterController<T>)=>void;
 onElementPrepared?:(event:SceneEvent)=>void;onElementClearing?:(event:SceneEvent)=>void;onElementIndexChanged?:(event:SceneEvent)=>void;
}
export function ItemsRepeater<T extends CollectionItem=CollectionItem>({renderItem,onReady,onElementPrepared,onElementClearing,onElementIndexChanged,...options}:ItemsRepeaterProps<T>){
 const control=useRef<RepeaterController<T>|null>(null);const[slots,setSlots]=useState<RepeaterRealization<T>[]>([]);
 const keys=useRef(new WeakMap<RepeaterRealization<T>['container'],number>()),nextKey=useRef(0);
 const templateKey=(container:RepeaterRealization<T>['container'])=>{let key=keys.current.get(container);if(key===undefined){key=nextKey.current++;keys.current.set(container,key);}return key;};
 const refresh=()=>{const node=control.current;if(node&&!node.isDisposed){const next=node.realizedItems();setSlots(current=>current.length===next.length&&current.every((slot,i)=>slot.container===next[i].container&&slot.index===next[i].index&&slot.item===next[i].item)?current:next);}};
 return <><NodeElement kind={NodeKind.ItemsRepeater} options={{...options,hasItemTemplate:!!renderItem}} onReady={n=>{control.current=n as RepeaterController<T>;onReady?.(control.current);refresh();}} onEvent={e=>{if(e.kind===EventKind.RealizationChanged)refresh();if(e.kind===EventKind.ElementPrepared)onElementPrepared?.(e);if(e.kind===EventKind.ElementClearing)onElementClearing?.(e);if(e.kind===EventKind.ElementIndexChanged)onElementIndexChanged?.(e);}}/>{renderItem&&slots.filter(s=>!s.container.isDisposed).map(slot=><ParentContext.Provider key={templateKey(slot.container)} value={slot.container}>{renderItem(slot.item,{index:slot.index})}</ParentContext.Provider>)}</>;
}
export interface RefreshVisualizerProps extends RefreshVisualizerOptions{children?:ReactNode;onReady?:(control:RefreshVisualizerController)=>void;onRefreshRequested?:(event:RefreshRequestedEvent)=>void;onRefresh?:()=>Promise<void>;onRefreshStateChanged?:(event:SceneEvent)=>void;}
export interface RefreshContainerProps extends RefreshContainerOptions{children?:ReactNode;visualizerContent?:ReactNode;visualizerOptions?:RefreshVisualizerOptions;onReady?:(control:RefreshContainerController)=>void;onRefreshRequested?:(event:RefreshRequestedEvent)=>void;onRefresh?:()=>Promise<void>;onRefreshStateChanged?:(event:SceneEvent)=>void;}
function RefreshElement({kind,children,onReady,onRefreshRequested,onRefresh,onRefreshStateChanged,visualizerContent,visualizerOptions,...options}:((RefreshVisualizerProps|RefreshContainerProps)&{kind:NodeKind;visualizerContent?:ReactNode;visualizerOptions?:RefreshVisualizerOptions})){
 const[visualizer,setVisualizer]=useState<RefreshVisualizerController|null>(null);
 useLayoutEffect(()=>{if(visualizer&&visualizerOptions&&!visualizer.isDisposed)visualizer.update(visualizerOptions);},[visualizer,controlPropertyJSON(visualizerOptions)]);
 return <><NodeElement kind={kind} options={options} onReady={n=>{if(kind===NodeKind.RefreshContainer)setVisualizer((n as RefreshContainerController).visualizer);onReady?.(n as RefreshContainerController);}} onEvent={e=>{if(e.kind===EventKind.RefreshRequested){const event=e as RefreshRequestedEvent;onRefreshRequested?.(event);if(onRefresh){const deferral=event.getDeferral();Promise.resolve().then(onRefresh).catch(reportError).finally(()=>deferral.complete());}}if(e.kind===EventKind.RefreshStateChanged)onRefreshStateChanged?.(e);}}>{children}</NodeElement>{visualizer&&visualizerContent&&<ParentContext.Provider value={visualizer}>{visualizerContent}</ParentContext.Provider>}</>;
}
export function RefreshContainer(props:RefreshContainerProps){return <RefreshElement {...props} kind={NodeKind.RefreshContainer}/>;}
export function RefreshVisualizer(props:RefreshVisualizerProps){return <RefreshElement {...props} kind={NodeKind.RefreshVisualizer}/>;}

export interface ScrollViewProps extends importViewTypes.ScrollViewOptions {children?:ReactNode;onReady?:(node:import('./scene').ScrollView)=>void;}
export function ScrollView({children,onReady,...options}:ScrollViewProps){return <NodeElement kind={NodeKind.ScrollView} options={options} onReady={n=>onReady?.(n as import('./scene').ScrollView)}>{children}</NodeElement>;}
export interface SwipeControlProps extends importViewTypes.SwipeControlOptions {children?:ReactNode;onReady?:(node:import('./scene').SwipeControl)=>void;}
export function SwipeControl({children,onReady,...options}:SwipeControlProps){return <NodeElement kind={NodeKind.SwipeControl} options={options} onReady={n=>onReady?.(n as import('./scene').SwipeControl)}>{children}</NodeElement>;}

export interface ItemsViewProps<T extends CollectionItem=CollectionItem> extends Omit<CollectionProps<T>,'onReady'>,ItemsViewOptions<T>{onReady?:(control:import('./scene').ItemsView<T>)=>void;onItemInvoked?:(event:SceneEvent&{item:T})=>void;}
export function ItemsView<T extends CollectionItem=CollectionItem>({onReady,onItemInvoked,...props}:ItemsViewProps<T>){return <CollectionElement {...props} kind={NodeKind.ItemsView} onReady={n=>onReady?.(n as import('./scene').ItemsView<T>)} onItemClick={onItemInvoked??props.onItemClick}/>;}
export interface PagerControlProps extends PagerControlOptions{onReady?:(node:import('./scene').PagerControl)=>void;onSelectedIndexChanged?:(event:PagerIndexChangedEvent)=>void;}
export function PagerControl({onReady,onSelectedIndexChanged,...options}:PagerControlProps){return <NodeElement kind={NodeKind.PagerControl} options={options} onReady={n=>onReady?.(n as import('./scene').PagerControl)} onEvent={e=>{if(e.kind===EventKind.SelectedIndexChanged)onSelectedIndexChanged?.(e as PagerIndexChangedEvent);}}/>;}
export interface AnnotatedScrollBarProps extends AnnotatedScrollBarOptions{onReady?:(node:import('./scene').AnnotatedScrollBar)=>void;onScrolling?:(event:AnnotatedScrollingEvent)=>void;onDetailLabelRequested?:(event:DetailLabelRequestedEvent)=>void;renderLabel?:(label:import('./reading-controls-types').AnnotatedScrollBarLabel,index:number)=>ReactNode;renderDetail?:(content:string)=>ReactNode;}
export function AnnotatedScrollBar({onReady,onScrolling,onDetailLabelRequested,renderLabel,renderDetail,...options}:AnnotatedScrollBarProps){
 const control=useRef<import('./scene').AnnotatedScrollBar|null>(null);const[slots,setSlots]=useState<ReturnType<import('./scene').AnnotatedScrollBar['labelSlots']>>([]);const[detail,setDetail]=useState<PanelController|null>(null),[content,setContent]=useState('');
 return <><NodeElement kind={NodeKind.AnnotatedScrollBar} options={{...options,hasLabelTemplate:!!renderLabel,hasDetailTemplate:!!renderDetail}} onReady={n=>{control.current=n as import('./scene').AnnotatedScrollBar;onReady?.(control.current);}} onEvent={e=>{const c=control.current;if(!c||c.isDisposed)return;if(e.kind===EventKind.Scrolling)onScrolling?.(e as AnnotatedScrollingEvent);if(e.kind===EventKind.DetailLabelRequested){const event=e as DetailLabelRequestedEvent;onDetailLabelRequested?.(event);if(renderDetail)setContent(event.content??event.label??'');}if(e.kind===EventKind.RealizationChanged){setSlots(c.labelSlots());if(renderDetail)setDetail(c.detailContent());}}}/>{renderLabel&&slots.filter(s=>!s.slot.isDisposed).map(s=><ParentContext.Provider key={s.id} value={s.slot}>{renderLabel(s.label,s.index)}</ParentContext.Provider>)}{detail&&!detail.isDisposed&&renderDetail&&<ParentContext.Provider value={detail}>{renderDetail(content)}</ParentContext.Provider>}</>;
}
export interface LayoutPanelProps extends LayoutPanelOptions{children?:ReactNode;onReady?:(node:PanelController<LayoutPanelOptions>)=>void;}
export function LayoutPanel({children,onReady,...options}:LayoutPanelProps){return <NodeElement kind={NodeKind.LayoutPanel} options={options} onReady={n=>onReady?.(n as PanelController<LayoutPanelOptions>)}>{children}</NodeElement>;}
export interface RichTextBlockProps extends RichTextBlockOptions{children?:ReactNode;onReady?:(node:import('./scene').RichTextBlock)=>void;onHyperlinkClick?:(event:SceneEvent)=>void;onSelectionChanged?:(event:RichTextSelectionEvent)=>void;}
export function RichTextBlock({children,onReady,onHyperlinkClick,onSelectionChanged,...options}:RichTextBlockProps){return <NodeElement kind={NodeKind.RichTextBlock} options={options} onReady={n=>onReady?.(n as import('./scene').RichTextBlock)} onEvent={e=>{if(e.kind===EventKind.HyperlinkClick)onHyperlinkClick?.(e);if(e.kind===EventKind.TextSelectionChanged)onSelectionChanged?.(e as RichTextSelectionEvent);}}>{children}</NodeElement>;}
export interface RichTextBlockOverflowProps extends RichTextBlockOverflowOptions {onReady?:(node:import('./scene').RichTextBlockOverflow)=>void;}
export function RichTextBlockOverflow({onReady,...options}:RichTextBlockOverflowProps){return <NodeElement kind={NodeKind.RichTextBlockOverflow} options={options} onReady={n=>onReady?.(n as import('./scene').RichTextBlockOverflow)}/>;}
/** Named InlineUIContainer slot. Rust measures and flows the SDK subtree. */
export function RichInline({name,children}:{name:string;children:ReactNode}){return <NodeElement kind={NodeKind.Grid} options={{layoutKey:name}}>{children}</NodeElement>;}

export interface ContentControlProps extends ContentControlOptions {children?:ReactNode;onReady?:(node:import('./scene').ContentControl)=>void;}
export function ContentControl({children,onReady,...options}:ContentControlProps){return <NodeElement kind={NodeKind.ContentControl} options={options} onReady={n=>onReady?.(n as import('./scene').ContentControl)}>{children}</NodeElement>;}
export interface ContentPresenterProps extends ContentPresenterOptions {children?:ReactNode;onReady?:(node:import('./scene').ContentPresenter)=>void;}
export function ContentPresenter({children,onReady,...options}:ContentPresenterProps){return <NodeElement kind={NodeKind.ContentPresenter} options={options} onReady={n=>onReady?.(n as import('./scene').ContentPresenter)}>{children}</NodeElement>;}
export interface UserControlProps extends UserControlOptions {children?:ReactNode;onReady?:(node:import('./scene').UserControl)=>void;}
export function UserControl({children,onReady,...options}:UserControlProps){return <NodeElement kind={NodeKind.UserControl} options={options} onReady={n=>onReady?.(n as import('./scene').UserControl)}>{children}</NodeElement>;}
export interface PageProps extends PageOptions {children?:ReactNode;onReady?:(node:import('./scene').Page)=>void;}
export function Page({children,onReady,...options}:PageProps){return <NodeElement kind={NodeKind.Page} options={options} onReady={n=>onReady?.(n as import('./scene').Page)}>{children}</NodeElement>;}
export interface SceneFrameProps extends SceneFrameOptions {onReady?:(node:import('./scene').SceneFrame)=>void;onNavigating?:(event:SceneFrameNavigationEvent)=>void;onNavigated?:(event:SceneFrameNavigationEvent)=>void;onNavigationStopped?:(event:SceneFrameNavigationEvent)=>void;}
export function SceneFrame({onReady,onNavigating,onNavigated,onNavigationStopped,...options}:SceneFrameProps){return <NodeElement kind={NodeKind.Frame} options={options} onReady={n=>onReady?.(n as import('./scene').SceneFrame)} onEvent={e=>{if(e.kind===EventKind.FrameNavigating)onNavigating?.(e as SceneFrameNavigationEvent);if(e.kind===EventKind.FrameNavigated)onNavigated?.(e as SceneFrameNavigationEvent);if(e.kind===EventKind.FrameNavigationStopped)onNavigationStopped?.(e as SceneFrameNavigationEvent);}}/>;}

export interface MenuFlyoutItemProps extends importMenuItemTypes.MenuFlyoutItemOptions {onReady?:(node:import('./scene').MenuFlyoutItem)=>void;onClick?:(event:SceneEvent)=>void;}
export function MenuFlyoutItem({onReady,onClick,...options}:MenuFlyoutItemProps){return <NodeElement kind={NodeKind.MenuFlyoutItem} options={options} onReady={n=>onReady?.(n as import('./scene').MenuFlyoutItem)} onClick={onClick}/>;}
export interface ToggleMenuFlyoutItemProps extends importMenuItemTypes.ToggleMenuFlyoutItemOptions {onReady?:(node:import('./scene').ToggleMenuFlyoutItem)=>void;onClick?:(event:SceneEvent)=>void;onIsCheckedChanged?:(event:SceneEvent)=>void;}
export function ToggleMenuFlyoutItem({onReady,onClick,onIsCheckedChanged,...options}:ToggleMenuFlyoutItemProps){return <NodeElement kind={NodeKind.ToggleMenuFlyoutItem} options={options} onReady={n=>onReady?.(n as import('./scene').ToggleMenuFlyoutItem)} onClick={onClick} onIsCheckedChanged={onIsCheckedChanged}/>;}
export interface RadioMenuFlyoutItemProps extends importMenuItemTypes.RadioMenuFlyoutItemOptions {onReady?:(node:import('./scene').RadioMenuFlyoutItem)=>void;onClick?:(event:SceneEvent)=>void;onIsCheckedChanged?:(event:SceneEvent)=>void;}
export function RadioMenuFlyoutItem({onReady,onClick,onIsCheckedChanged,...options}:RadioMenuFlyoutItemProps){return <NodeElement kind={NodeKind.RadioMenuFlyoutItem} options={options} onReady={n=>onReady?.(n as import('./scene').RadioMenuFlyoutItem)} onClick={onClick} onIsCheckedChanged={onIsCheckedChanged}/>;}
export interface MenuFlyoutSubItemProps extends importMenuItemTypes.MenuFlyoutSubItemOptions {children?:ReactNode;onReady?:(node:import('./scene').MenuFlyoutSubItem)=>void;}
export function MenuFlyoutSubItem({children,onReady,...options}:MenuFlyoutSubItemProps){return <NodeElement kind={NodeKind.MenuFlyoutSubItem} options={options} onReady={n=>onReady?.(n as import('./scene').MenuFlyoutSubItem)}>{children}</NodeElement>;}
export interface MenuFlyoutSeparatorProps extends importMenuItemTypes.MenuFlyoutSeparatorOptions {onReady?:(node:import('./scene').MenuFlyoutSeparator)=>void;}
export function MenuFlyoutSeparator({onReady,...options}:MenuFlyoutSeparatorProps){return <NodeElement kind={NodeKind.MenuFlyoutSeparator} options={options} onReady={n=>onReady?.(n as import('./scene').MenuFlyoutSeparator)}/>;}
import type * as importMenuItemTypes from './menu-item-types';

export interface ScrollBarProps extends ScrollBarOptions {onReady?:(node:import('./scene').ScrollBar)=>void;onScroll?:(event:ScrollBarEvent)=>void;onValueChanged?:(event:SceneEvent)=>void;}
export function ScrollBar({onReady,onScroll,onValueChanged,...options}:ScrollBarProps){return <NodeElement kind={NodeKind.ScrollBar} options={options} onReady={n=>onReady?.(n as import('./scene').ScrollBar)} onEvent={e=>{if(e.kind===EventKind.Scroll)onScroll?.(e as ScrollBarEvent);if(e.kind===EventKind.ValueChanged)onValueChanged?.(e);}}/>;}
export interface ThumbProps extends ThumbOptions {onReady?:(node:import('./scene').Thumb)=>void;onDragStarted?:(event:ThumbDragStartedEvent)=>void;onDragDelta?:(event:ThumbDragDeltaEvent)=>void;onDragCompleted?:(event:ThumbDragCompletedEvent)=>void;}
export function Thumb({onReady,onDragStarted,onDragDelta,onDragCompleted,...options}:ThumbProps){return <NodeElement kind={NodeKind.Thumb} options={options} onReady={n=>onReady?.(n as import('./scene').Thumb)} onEvent={e=>{if(e.kind===EventKind.DragStarted)onDragStarted?.(e as ThumbDragStartedEvent);if(e.kind===EventKind.DragDelta)onDragDelta?.(e as ThumbDragDeltaEvent);if(e.kind===EventKind.DragCompleted)onDragCompleted?.(e as ThumbDragCompletedEvent);}}/>;}
export interface TickBarProps extends TickBarOptions {onReady?:(node:import('./scene').TickBar)=>void;}
export function TickBar({onReady,...options}:TickBarProps){return <NodeElement kind={NodeKind.TickBar} options={options} onReady={n=>onReady?.(n as import('./scene').TickBar)}/>;}
export interface ScrollContentPresenterProps extends ScrollContentPresenterOptions {children?:ReactNode;onReady?:(node:import('./scene').ScrollContentPresenter)=>void;onViewChanged?:(event:SceneEvent)=>void;}
export function ScrollContentPresenter({children,onReady,onViewChanged,...options}:ScrollContentPresenterProps){return <NodeElement kind={NodeKind.ScrollContentPresenter} options={options} onReady={n=>onReady?.(n as import('./scene').ScrollContentPresenter)} onEvent={e=>{if(e.kind===EventKind.ViewChanged)onViewChanged?.(e);}}>{children}</NodeElement>;}
function PresenterPart({footer,children}:{footer?:boolean;children:ReactNode}){const parent=useContext(ParentContext) as import('./scene').ItemsPresenter|null;if(!parent)return null;return <ParentContext.Provider value={footer?parent.footerContent:parent.headerContent}>{children}</ParentContext.Provider>;}
export interface ItemsPresenterProps extends Omit<ItemsPresenterOptions,'header'|'footer'> {header?:ReactNode;footer?:ReactNode;children?:ReactNode;onReady?:(node:import('./scene').ItemsPresenter)=>void;}
export function ItemsPresenter({header,footer,children,onReady,...options}:ItemsPresenterProps){const h=typeof header==='string'?header:'',f=typeof footer==='string'?footer:'';return <NodeElement kind={NodeKind.ItemsPresenter} options={{...options,header:h,footer:f}} onReady={n=>onReady?.(n as import('./scene').ItemsPresenter)}>{children}{header&&typeof header!=='string'&&<PresenterPart>{header}</PresenterPart>}{footer&&typeof footer!=='string'&&<PresenterPart footer>{footer}</PresenterPart>}</NodeElement>;}
