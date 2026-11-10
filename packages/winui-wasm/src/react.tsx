// React applications can import shared SDK enums, options and utilities here.
// SDK control objects have a Controller suffix; unsuffixed names are components.
export * from './index';

import type {RichEditBoxOptions} from "./rich-edit-types";
import {RichEditBox as RichEditBoxController} from "./scene";
import {TableView as TableViewController} from './scene';
import type {TableViewGroupInfo,TableViewGroupSlot,TableViewOptions,TableViewColumn,TableViewSlot,TableViewEvent} from './table-view-types';

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
  Children,
  Fragment,
  isValidElement,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  WinUI,
  EventKind,
  type NavigationViewController as Controller,
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
export function Frame(props:FrameProps):ReactNode;
export function Frame(props:SceneFrameProps):ReactNode;
export function Frame(props:FrameProps|SceneFrameProps){
  const scene=useContext(SceneContext);
  return scene?<SceneFrame {...props as SceneFrameProps}/>:<HostedFrame {...props as FrameProps}/>;
}
function HostedFrame(props:FrameProps){
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
/** Shared declaration-only properties; no React objects cross the WASM boundary. */
export interface ControlAttachments {toolTip?:ReactElement|null;contextFlyout?:ReactElement|null;}
/** A declared floating surface or a borrowed SDK surface in the same Scene. */
export type FlyoutDeclaration=ReactElement|FloatingSurface<PopupOptions>|string|null;
function useAssociatedFlyout(node:ButtonController|null,value:FlyoutDeclaration|undefined){
 useLayoutEffect(()=>{if(!node||node.isDisposed)return;if(value===null||typeof value==='string'||value instanceof FloatingSurface)node.setFlyout(value instanceof FloatingSurface&&value.isDisposed?null:value);},[node,value]);
 return isValidElement(value)?value:null;
}
function useFlyoutProperty(node:ButtonController|null,children:ReactNode,value:FlyoutDeclaration|undefined){
 const slot=propertyChildren(children,ButtonFlyout);
 if(slot.found&&value!==undefined)throw new Error('Flyout was assigned as both a prop and a property element');
 const source=slot.found?slot.value:value;
 if(source!=null&&typeof source!=='string'&&!(source instanceof FloatingSurface)&&!isValidElement(source))throw new TypeError('Flyout requires one floating surface declaration');
 const declaration=useAssociatedFlyout(node,source as FlyoutDeclaration|undefined);
 return {content:slot.content,declaration};
}
const DecorationTargetContext=createContext<SceneNode|null>(null);
const ContextFlyoutOwnerContext=createContext<SceneNode|null>(null);
function ContextFlyoutProperty({children}:{children?:ReactNode}){return children;}
function ToolTipProperty({children}:{children?:ReactNode}){return children;}
function PropertyContent({children}:{children?:ReactNode}){return children===''?null:typeof children==='string'||typeof children==='number'?<TextBlock text={String(children)}/>:children;}
/** Extract a property element (including inside fragments) without creating layout nodes. */
function propertyChildren(children:ReactNode,property:unknown){
 let found=false,value:ReactNode=undefined;
 const visit=(nodes:ReactNode):ReactNode=>Children.map(nodes,child=>{
  if(!isValidElement<{children?:ReactNode}>(child))return child;
  if(child.type===property){if(found)throw new Error('A declarative property can only be assigned once');found=true;value=child.props.children;return null;}
  if(child.type===Fragment)return <Fragment key={child.key}>{visit(child.props.children)}</Fragment>;
  return child;
 });
 const content=visit(children);return {content,found,value};
}
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
  children?: ReactNode|((node:SceneNode)=>ReactNode);
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
  options:propertyOptions,
  children,
  ...callbacks
}: NodeElementProps) {
  const {toolTip,contextFlyout,...options}=propertyOptions as ControlAttachments & Record<string,unknown>;
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
      case NodeKind.TableView:created=scene.create(parent,NodeKind.TableView,options);break;
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
      case NodeKind.RichEditBox:
      case NodeKind.TextBox:
      case NodeKind.PasswordBox:
      case NodeKind.ScrollViewer:
        if (!(parent instanceof PanelController))
          throw new Error("Input/scroll controls require a layout parent");
        created =
          kind === NodeKind.RichEditBox
            ? parent.richEditBox(options)
            : kind === NodeKind.TextBox
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
      case NodeKind.NavigationViewItem:created=scene.create(parent,kind,options);break;
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
    if(kind===NodeKind.NavigationView&&patch.navigation){
      const current=patch.navigation as Record<string,unknown>;
      const old=JSON.parse((previous.current as Record<string,string>).navigation??'{}') as Record<string,unknown>;
      patch.navigation=Object.fromEntries(Object.entries(current).filter(([key,value])=>controlPropertyJSON(value)!==JSON.stringify(old[key])));
      if(!Object.keys(patch.navigation as object).length)delete patch.navigation;
    }
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
  if (!node || (!children&&toolTip==null&&contextFlyout==null)) return null;
  const declarations=typeof children==='function'?children(node):children;
  const attached=propertyChildren(declarations,ToolTipProperty);
  const contextual=propertyChildren(attached.content,ContextFlyoutProperty);
  if(contextual.found&&contextFlyout!=null)throw new Error('ContextFlyout was assigned twice');
  const menu=contextual.found?contextual.value:contextFlyout;
  const contextMenu=menu==null?null:<ContextFlyoutOwnerContext.Provider value={node}><DecorationTargetContext.Provider value={node}>{menu}</DecorationTargetContext.Provider></ContextFlyoutOwnerContext.Provider>;
  if(attached.found&&toolTip!=null)throw new Error('ToolTip was assigned as both a prop and a property element');
  const tip=attached.found?attached.value:toolTip;
  const tipDeclaration=tip==null?null:<DecorationTargetContext.Provider value={node}>{tip}</DecorationTargetContext.Provider>;
  if (
    node instanceof ViewboxController ||
    node instanceof PanelController ||
    node instanceof ButtonController ||
    node instanceof ToggleController
  )
    return (
      <><ParentContext.Provider value={node}>{contextual.content}</ParentContext.Provider>{tipDeclaration}{contextMenu}</>
    );
  return <>{tipDeclaration}{contextMenu}</>;
}
/** Direct JSX properties use the same types and Rust defaults as the basic SDK. */
export interface ContainerProps extends PanelOptions, ControlAttachments {
 onPointerEntered?:(event:SceneEvent)=>void;onPointerExited?:(event:SceneEvent)=>void;
  children?: ReactNode;
  onReady?: (node: PanelController) => void;
}
export interface GridProps extends ContainerProps {
  /** Activate a focusable Grid by pointer, Enter or Space; handled in Rust. */
  onClick?:(event:SceneEvent)=>void;
}
export function Grid({ onReady, children,onPointerEntered,onPointerExited,onClick, ...options }: GridProps) {
  return (
    <NodeElement
      kind={NodeKind.Grid}
      onClick={onClick}
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
export interface ButtonProps extends ButtonOptions, ControlAttachments {
  /** Owned Flyout/MenuFlyout declaration; Rust opens it on pointer/keyboard activation. */
  flyout?: FlyoutDeclaration;
  onContextRequested?: (event:SceneEvent)=>void;
  onPointerEntered?: (event:SceneEvent)=>void;
  onPointerExited?: (event:SceneEvent)=>void;
  children?: ReactNode;
  onReady?: (node: ButtonController) => void;
  onClick?: (event: SceneEvent) => void;
  onEvent?: (event: SceneEvent) => void;
}
export function Button({
  flyout,
  onContextRequested,
  onPointerEntered, onPointerExited,
  onReady,
  children,
  onClick,
  onEvent,
  ...options
}: ButtonProps) {
  const[node,setNode]=useState<ButtonController|null>(null);
  const owned=useFlyoutProperty(node,children,flyout);
  return (
    <NodeElement
      kind={NodeKind.Button}
      onPointerEntered={onPointerEntered}
      onPointerExited={onPointerExited}
      options={options}
      onClick={onClick}
      onEvent={event=>{onEvent?.(event);if(event.kind===EventKind.ContextRequested)onContextRequested?.(event);}}
      onReady={(n) => {setNode(n as ButtonController);onReady?.(n as ButtonController);}}
    >
      {owned.content}
      {owned.declaration}
    </NodeElement>
  );
}
/** Property-element syntax, like XAML Button.Flyout. Creates no visual node. */
function ButtonFlyout({children}:{children?:ReactNode}) {
  const owner=useContext(ParentContext);
  if(!(owner instanceof ButtonController))throw new Error('A Flyout property requires a button control');
  return children;
}
Button.Flyout=ButtonFlyout;
export interface TextBlockProps extends TextOptions, ControlAttachments {
  /** Attached property elements, e.g. TextBox.ToolTip. */ children?:ReactNode;
  onReady?: (node: SceneNode<TextOptions>) => void;
}
export function TextBlock({ onReady, children, ...options }: TextBlockProps) {
  return (
    <NodeElement
      kind={NodeKind.TextBlock}
      options={options}
      onReady={(n) => onReady?.(n as SceneNode<TextOptions>)}
    >{children}</NodeElement>
  );
}
export interface ToggleProps extends ToggleOptions, ControlAttachments {
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
export interface SceneNavigationViewProps extends NavigationViewOptions, ControlAttachments {
  layout?:LayoutOptions;
  children?:ReactNode;
  onReady?:(node:NavigationController)=>void;
  onSnapshot?:(snapshot:Readonly<import('./sdk').NavigationSnapshot>)=>void;
  onEvent?:(event:SceneEvent)=>void;
  onSelectionChanged?:(event:SceneEvent)=>void;
  onPaneClosing?:(event:SceneEvent)=>void;
}
export function SceneNavigationView({layout={},children,onReady,onSnapshot,onEvent,onSelectionChanged,onPaneClosing,...navigation}:SceneNavigationViewProps){
  const unsubscribe=useRef<(()=>void)|undefined>(undefined);
  const latest=useRef(onSnapshot);latest.current=onSnapshot;
  useLayoutEffect(()=>()=>unsubscribe.current?.(),[]);
  return <NodeElement kind={NodeKind.NavigationView} options={{...layout,navigation}}
    onReady={node=>{const control=node as NavigationController;unsubscribe.current?.();unsubscribe.current=control.onSnapshot(state=>latest.current?.(state));onReady?.(control);}}
    onEvent={onEvent} onSelectionChanged={onSelectionChanged} onPaneClosing={onPaneClosing}>{children}</NodeElement>;
}
/** Declare content in a stable slot; Rust moves it when pane orientation changes. */
export function NavigationViewContent({slot,children}:{slot:import('./enums').NavigationViewSlot;children?:ReactNode}){
  const parent=useContext(ParentContext);
  if(!(parent instanceof NavigationController))throw new Error('NavigationViewContent requires a NavigationView');
  return <ParentContext.Provider value={parent.slot(slot)}>{children}</ParentContext.Provider>;
}
/** Source-traced ellipse geometry, laid out and painted by the shared Rust scene. */
export function Ellipse({onReady,...options}: LayoutOptions & {onReady?:(node:SceneNode)=>void}) {
  return <NodeElement kind={NodeKind.Ellipse} options={options} onReady={onReady} />;
}
export interface RadioButtonProps extends RadioOptions, ControlAttachments {
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
export interface RadioButtonsProps extends RadioButtonsOptions, ControlAttachments {
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
export interface ToggleSwitchProps extends ToggleSwitchOptions, ControlAttachments {
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

export interface TextBoxProps extends TextBoxOptions, ControlAttachments {
  /** Attached property elements, e.g. TextBox.ToolTip. */ children?:ReactNode;
  onReady?: (node: TextBoxController) => void;
  onTextChanged?: (event: SceneEvent) => void;
  onSelectionChanged?: (event: SceneEvent) => void;
}
export function TextBox({
  children,
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
    >{children}</NodeElement>
  );
}
export interface RichEditBoxProps extends RichEditBoxOptions, ControlAttachments {
  /** Attached declarations can use the mounted editor for business commands. */ children?:ReactNode|((editor:RichEditBoxController)=>ReactNode);
  onReady?: (node:RichEditBoxController)=>void;
  onTextChanged?: (event:SceneEvent)=>void;
  onSelectionChanged?: (event:SceneEvent)=>void;
}
export function RichEditBox({children,onReady,onTextChanged,onSelectionChanged,...options}:RichEditBoxProps) {
  return <NodeElement kind={NodeKind.RichEditBox} options={options} onReady={n=>onReady?.(n as RichEditBoxController)} onTextChanged={onTextChanged} onSelectionChanged={onSelectionChanged}>{typeof children==='function'?node=>children(node as RichEditBoxController):children}</NodeElement>;
}
export interface PasswordBoxProps extends PasswordBoxOptions, ControlAttachments {
  /** Attached property elements, e.g. TextBox.ToolTip. */ children?:ReactNode;
  onReady?: (node: PasswordController) => void;
  onPasswordChanged?: (event: SceneEvent) => void;
}
export function PasswordBox({
  children,
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
    >{children}</NodeElement>
  );
}
export interface ScrollViewerProps extends ScrollViewerOptions, ControlAttachments {
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

export interface ProgressBarProps extends ProgressBarOptions, ControlAttachments {
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
export interface ProgressRingProps extends ProgressRingOptions, ControlAttachments {
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

export interface RepeatButtonProps extends RepeatButtonOptions, ControlAttachments {
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
export interface ViewboxProps extends ViewboxOptions, ControlAttachments {
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

export interface BorderProps extends BorderOptions, ControlAttachments {
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
export interface CanvasProps extends CanvasOptions, ControlAttachments {
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
function ExpanderHeaderContent({children}:{children:ReactNode}) {
  const parent = useContext(ParentContext) as ExpanderController | null;
  return parent ? <ParentContext.Provider value={parent.headerContent}><PropertyContent>{children}</PropertyContent></ParentContext.Provider> : null;
}
export interface ExpanderProps extends Omit<ExpanderOptions, 'header'>, ControlAttachments {
  /** Text or SDK content, measured and arranged in the Rust header slot. */ header?: ReactNode;
  children?: ReactNode;
  onReady?: (n: ExpanderController) => void;
  onExpanding?: (e: SceneEvent) => void;
  onCollapsed?: (e: SceneEvent) => void;
}
export function Expander({
  header,
  children,
  onReady,
  onExpanding,
  onCollapsed,
  ...options
}: ExpanderProps) {
  const slot=propertyChildren(children,ExpanderHeaderContent);if(slot.found&&header!==undefined)throw new Error('Expander.Header was assigned twice');children=slot.content;header=slot.found?slot.value:header;
  return (
    <NodeElement
      kind={NodeKind.Expander}
      options={{...options, header: typeof header === 'string' ? header : ''}}
      onReady={(n) => onReady?.(n as ExpanderController)}
      onExpanding={onExpanding}
      onCollapsed={onCollapsed}
    >
      {children}
      {header != null && typeof header !== 'string' && <ExpanderHeaderContent>{header}</ExpanderHeaderContent>}
    </NodeElement>
  );
}
export interface HyperlinkButtonProps extends HyperlinkButtonOptions, ControlAttachments {
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
export interface AnimatedIconProps extends AnimatedIconOptions, ControlAttachments { onReady?:(node:AnimatedIconController)=>void; }
export function AnimatedIcon({onReady,...options}:AnimatedIconProps){return <NodeElement kind={NodeKind.AnimatedIcon} options={options} onReady={n=>onReady?.(n as AnimatedIconController)}/>;}

export interface RectangleProps extends RectangleOptions, ControlAttachments {onReady?:(node:SceneNode<RectangleOptions>)=>void;}
export function Rectangle({onReady,...options}:RectangleProps){return <NodeElement kind={NodeKind.Rectangle} options={options} onReady={n=>onReady?.(n as SceneNode<RectangleOptions>)}/>;}

export interface LineProps extends LineOptions, ControlAttachments {onReady?:(node:SceneNode<LineOptions>)=>void;}
export function Line({onReady,...options}:LineProps){return <NodeElement kind={NodeKind.Line} options={options} onReady={n=>onReady?.(n as SceneNode<LineOptions>)}/>;}

export interface PathProps extends PathOptions, ControlAttachments {onReady?:(node:SceneNode<PathOptions>)=>void;}
export function Path({onReady,...options}:PathProps){return <NodeElement kind={NodeKind.Path} options={options} onReady={n=>onReady?.(n as SceneNode<PathOptions>)}/>;}

export interface PolygonProps extends PolygonOptions, ControlAttachments {onReady?:(node:SceneNode<PolygonOptions>)=>void;}
export function Polygon({onReady,...options}:PolygonProps){return <NodeElement kind={NodeKind.Polygon} options={options} onReady={n=>onReady?.(n as SceneNode<PolygonOptions>)}/>;}

export interface PolylineProps extends PolylineOptions, ControlAttachments {onReady?:(node:SceneNode<PolylineOptions>)=>void;}
export function Polyline({onReady,...options}:PolylineProps){return <NodeElement kind={NodeKind.Polyline} options={options} onReady={n=>onReady?.(n as SceneNode<PolylineOptions>)}/>;}

export interface FloatingProps<T extends PopupOptions> {
  /** Attach to another control in this Scene. */ target?:SceneNode|string|null;
  /** A render callback exposes the mounted surface, e.g. for a confirm action's hide(). */
  children?:ReactNode|((surface:FloatingSurface<T>)=>ReactNode);
  onReady?:(surface:FloatingSurface<T>)=>void;
  onOpening?:(event:SceneEvent)=>void;onOpened?:(event:SceneEvent)=>void;
  onClosing?:(event:SceneEvent)=>void;onClosed?:(event:SceneEvent)=>void;
  onItemInvoked?:(event:SceneEvent)=>void;
}
function FloatingElement<T extends PopupOptions>({kind,target,children,onReady,onOpening,onOpened,onClosing,onClosed,onItemInvoked,...options}:T & FloatingProps<T> & {kind:NodeKind}) {
  const parent=useContext(ParentContext);
  const owner=useContext(DecorationTargetContext)??(parent instanceof ButtonController?parent:null);
  const contextOwner=useContext(ContextFlyoutOwnerContext);
  const anchor=target===undefined?(contextOwner??(kind===NodeKind.ToolTip?owner:parent instanceof ButtonController&&(kind===NodeKind.Flyout||kind===NodeKind.MenuFlyout)?parent:null)):target;
  const [node,setNode]=useState<FloatingSurface<T>|null>(null);
  useLayoutEffect(()=>{if(node&&!node.isDisposed&&contextOwner&&!contextOwner.isDisposed)contextOwner.setContextFlyout(node);},[node,contextOwner]);
  return <ContextFlyoutOwnerContext.Provider value={null}><NodeElement kind={kind} options={{...options,target:anchor}} onReady={n=>{const surface=n as FloatingSurface<T>;setNode(surface);onReady?.(surface);}}
    onOpening={onOpening} onOpened={onOpened} onClosing={onClosing} onClosed={onClosed} onItemInvoked={onItemInvoked}>{typeof children==='function'?(node&&!node.isDisposed?children(node):null):children}</NodeElement></ContextFlyoutOwnerContext.Provider>;
}
/** Root-level content with parent-relative offsets. */
export function Popup(props:PopupOptions & FloatingProps<PopupOptions>){return <FloatingElement {...props} kind={NodeKind.Popup}/>;}
/** Automatically shown on target hover/focus, or explicitly controlled by isOpen. */
export function ToolTip(props:ToolTipOptions & FloatingProps<ToolTipOptions>){return <FloatingElement {...props} kind={NodeKind.ToolTip}/>;}
/** Dismissible floating content. Closing can be cancelled synchronously. */
export function Flyout(props:FlyoutOptions & FloatingProps<FlyoutOptions>){return <FloatingElement {...props} kind={NodeKind.Flyout}/>;}
/** Flat command, toggle and separator menu. */
export function MenuFlyout(props:MenuFlyoutOptions & FloatingProps<MenuFlyoutOptions>){return <FloatingElement {...props} kind={NodeKind.MenuFlyout}/>;}
export interface SliderProps extends SliderOptions, ControlAttachments {onReady?:(slider:SliderController)=>void;onValueChanged?:(event:SceneEvent)=>void;}
export function Slider({onReady,onValueChanged,...options}:SliderProps){return <NodeElement kind={NodeKind.Slider} options={options} onReady={n=>onReady?.(n as SliderController)} onValueChanged={onValueChanged}/>;}

export interface InfoBarProps extends InfoBarOptions, ControlAttachments {children?:ReactNode;action?:ReactNode;onReady?:(control:InfoBarController)=>void;onCloseButtonClick?:(event:SceneEvent)=>void;onClosing?:(event:SceneEvent)=>void;onClosed?:(event:SceneEvent)=>void;onOpened?:(event:SceneEvent)=>void;}
export function InfoBar({children,action,onReady,onCloseButtonClick,onClosing,onClosed,onOpened,...options}:InfoBarProps){const slot=propertyChildren(children,InfoBarActionProperty);if(slot.found&&action!==undefined)throw new Error('InfoBar.ActionButton was assigned twice');children=slot.content;action=slot.found?slot.value:action;return <NodeElement kind={NodeKind.InfoBar} options={options} onReady={n=>onReady?.(n as InfoBarController)} onCloseButtonClick={onCloseButtonClick} onClosing={onClosing} onClosed={onClosed} onOpened={onOpened}>{children}{action&&<NodeElement kind={NodeKind.Grid} options={{isInfoBarAction:true}}>{action}</NodeElement>}</NodeElement>;}
export interface PersonPictureProps extends PersonPictureOptions, ControlAttachments {onReady?:(control:SceneNode<PersonPictureOptions>)=>void;}
export function PersonPicture({onReady,...options}:PersonPictureProps){return <NodeElement kind={NodeKind.PersonPicture} options={options} onReady={n=>onReady?.(n as SceneNode<PersonPictureOptions>)}/>;}
export interface RatingControlProps extends RatingControlOptions, ControlAttachments {onReady?:(control:RatingController)=>void;onValueChanged?:(event:SceneEvent)=>void;}
export function RatingControl({onReady,onValueChanged,...options}:RatingControlProps){return <NodeElement kind={NodeKind.RatingControl} options={options} onReady={n=>onReady?.(n as RatingController)} onValueChanged={onValueChanged}/>;}
export interface SplitButtonProps extends SplitButtonOptions, ControlAttachments {children?:ReactNode;flyout?:FlyoutDeclaration;onReady?:(control:SplitController)=>void;onClick?:(event:SceneEvent)=>void;}
export interface ToggleSplitButtonProps extends ToggleSplitButtonOptions, ControlAttachments {children?:ReactNode;flyout?:FlyoutDeclaration;onReady?:(control:ToggleSplitController)=>void;onClick?:(event:SceneEvent)=>void;onIsCheckedChanged?:(event:SceneEvent)=>void;}
function SplitElement({kind,children,flyout,onReady,onClick,onIsCheckedChanged,...options}:(SplitButtonProps|ToggleSplitButtonProps)&{kind:NodeKind;onIsCheckedChanged?:(event:SceneEvent)=>void}){
 const [node,setNode]=useState<SplitController|null>(null);
 const owned=useFlyoutProperty(node,children,flyout);
 return <NodeElement kind={kind} options={options} onReady={n=>{const control=n as SplitController;setNode(control);onReady?.(control as ToggleSplitController);}} onClick={onClick} onIsCheckedChanged={onIsCheckedChanged}>{owned.content}{owned.declaration}</NodeElement>;
}
export function SplitButton(props:SplitButtonProps){return <SplitElement {...props} kind={NodeKind.SplitButton}/>;}
export function ToggleSplitButton(props:ToggleSplitButtonProps){return <SplitElement {...props} kind={NodeKind.ToggleSplitButton}/>;}

export interface CollectionProps<T extends CollectionItem=CollectionItem> extends CollectionViewOptions<T>, ControlAttachments {
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
export interface FlipViewProps<T extends NavigationData=NavigationData> extends FlipViewOptions<T>, ControlAttachments {renderItem?:NavigationRender<T>;onReady?:(node:FlipViewController<T>)=>void;onSelectionChanged?:(event:NavigationControlEvent<T>)=>void;}
export function FlipView<T extends NavigationData=NavigationData>({renderItem,onReady,onSelectionChanged,...options}:FlipViewProps<T>){
 const [node,setNode]=useState<FlipViewController<T>|null>(null);
 return <><NodeElement kind={NodeKind.FlipView} options={options} onReady={n=>{const control=n as FlipViewController<T>;setNode(control);onReady?.(control);}} onEvent={e=>{if(e.kind===EventKind.SelectionChanged&&node)onSelectionChanged?.(node.navigationEvent(e));}}/><NavigationTemplates control={node} content={renderItem}/></>;
}
export interface PipsPagerProps extends PipsPagerOptions, ControlAttachments {onReady?:(node:PipsPagerController)=>void;onSelectedIndexChanged?:(event:NavigationControlEvent)=>void;}
export function PipsPager({onReady,onSelectedIndexChanged,...options}:PipsPagerProps){
 const control=useRef<PipsPagerController|null>(null);return <NodeElement kind={NodeKind.PipsPager} options={options} onReady={n=>{control.current=n as PipsPagerController;onReady?.(control.current);}} onEvent={e=>{if(e.kind===EventKind.SelectedIndexChanged&&control.current)onSelectedIndexChanged?.(control.current.navigationEvent(e));}}/>;
}
export interface BreadcrumbBarProps<T extends NavigationData=NavigationData> extends BreadcrumbBarOptions<T>, ControlAttachments {renderItem?:NavigationRender<T>;onReady?:(node:BreadcrumbBarController<T>)=>void;onItemClicked?:(event:NavigationControlEvent<T>)=>void;}
export function BreadcrumbBar<T extends NavigationData=NavigationData>({renderItem,onReady,onItemClicked,...options}:BreadcrumbBarProps<T>){
 const [node,setNode]=useState<BreadcrumbBarController<T>|null>(null);return <><NodeElement kind={NodeKind.BreadcrumbBar} options={options} onReady={n=>{const control=n as BreadcrumbBarController<T>;setNode(control);onReady?.(control);}} onEvent={e=>{if(e.kind===EventKind.ItemClick&&node)onItemClicked?.(node.navigationEvent(e));}}/><NavigationTemplates control={node} header={renderItem}/></>;
}
export interface TabViewProps<T extends TabItem=TabItem> extends TabViewOptions<T>, ControlAttachments {
 renderHeader?:NavigationRender<T>;renderContent?:NavigationRender<T>;tabStripHeader?:ReactNode;tabStripFooter?:ReactNode;
 onReady?:(node:TabViewController<T>)=>void;onSelectionChanged?:(event:NavigationControlEvent<T>)=>void;
 onTabCloseRequested?:(event:NavigationControlEvent<T>)=>void;onAddTabButtonClick?:(event:NavigationControlEvent<T>)=>void;
 onTabDroppedOutside?:(event:NavigationControlEvent<T>)=>void;onItemsChanged?:(event:NavigationItemsChangedEvent<T>)=>void;
}
export function TabView<T extends TabItem=TabItem>({renderHeader,renderContent,tabStripHeader,tabStripFooter,onReady,onSelectionChanged,onTabCloseRequested,onAddTabButtonClick,onTabDroppedOutside,onItemsChanged,...options}:TabViewProps<T>){
 const [node,setNode]=useState<TabViewController<T>|null>(null);return <><NodeElement kind={NodeKind.TabView} options={options} onReady={n=>{const control=n as TabViewController<T>;setNode(control);onReady?.(control);}} onEvent={e=>{if(!node)return;const event=node.navigationEvent(e);if(e.kind===EventKind.SelectionChanged)onSelectionChanged?.(event);if(e.kind===EventKind.TabCloseRequested)onTabCloseRequested?.(event);if(e.kind===EventKind.AddTabButtonClick)onAddTabButtonClick?.(event);if(e.kind===EventKind.TabDroppedOutside)onTabDroppedOutside?.(event);if(e.kind===EventKind.ItemsChanged)onItemsChanged?.({...event,items:node.items});}}/><NavigationTemplates control={node} content={renderContent} header={renderHeader} stripHeader={tabStripHeader} stripFooter={tabStripFooter}/></>;
}
export interface TreeViewProps<T extends TreeItem=TreeItem> extends TreeViewOptions<T>, ControlAttachments {
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
export interface ItemsPanelProps extends ItemsPanelOptions, ControlAttachments {children?:ReactNode;onReady?:(panel:PanelController<ItemsPanelOptions>)=>void;}
export function ItemsStackPanel({children,onReady,...options}:ItemsPanelProps){return <NodeElement kind={NodeKind.ItemsStackPanel} options={options} onReady={n=>onReady?.(n as PanelController<ItemsPanelOptions>)}>{children}</NodeElement>;}
export function ItemsWrapGrid({children,onReady,...options}:ItemsPanelProps){return <NodeElement kind={NodeKind.ItemsWrapGrid} options={options} onReady={n=>onReady?.(n as PanelController<ItemsPanelOptions>)}>{children}</NodeElement>;}
export function VariableSizedWrapGrid({children,onReady,...options}:ItemsPanelProps){return <NodeElement kind={NodeKind.VariableSizedWrapGrid} options={options} onReady={n=>onReady?.(n as PanelController<ItemsPanelOptions>)}>{children}</NodeElement>;}

export interface NumberBoxProps extends NumberBoxOptions, ControlAttachments {onReady?:(node:NumberBoxController)=>void;onValueChanged?:(event:ComposedEvent)=>void;}
export function NumberBox({onReady,onValueChanged,...options}:NumberBoxProps){return <NodeElement kind={NodeKind.NumberBox} options={options} onReady={n=>onReady?.(n as NumberBoxController)} onValueChanged={onValueChanged}/>;}
export interface AutoSuggestBoxProps<T extends CollectionItem=CollectionItem> extends AutoSuggestBoxOptions<T>, ControlAttachments {onReady?:(node:AutoSuggestBoxController<T>)=>void;onTextChanged?:(event:ComposedEvent<T>)=>void;onSuggestionChosen?:(event:ComposedEvent<T>)=>void;onQuerySubmitted?:(event:ComposedEvent<T>)=>void;renderItem?:(item:T,context:{selected:boolean;index:number})=>ReactNode;}
export function AutoSuggestBox<T extends CollectionItem=CollectionItem>({onReady,onTextChanged,onSuggestionChosen,onQuerySubmitted,renderItem,...options}:AutoSuggestBoxProps<T>){const[node,setNode]=useState<AutoSuggestBoxController<T>|null>(null);return <><NodeElement kind={NodeKind.AutoSuggestBox} options={options} onReady={n=>{setNode(n as AutoSuggestBoxController<T>);onReady?.(n as AutoSuggestBoxController<T>);}} onEvent={e=>{if(e.kind===EventKind.TextChanged)onTextChanged?.(e);if(e.kind===EventKind.SuggestionChosen)onSuggestionChosen?.(e);if(e.kind===EventKind.QuerySubmitted)onQuerySubmitted?.(e);}}/>{node&&renderItem&&<ComposedItemTemplate view={node.itemsView} render={renderItem}/>}</>;}
export interface ComboBoxProps<T extends CollectionItem=CollectionItem> extends ComboBoxOptions<T>, ControlAttachments {onReady?:(node:ComboBoxController<T>)=>void;onSelectionChanged?:(event:ComposedEvent<T>)=>void;onTextSubmitted?:(event:ComposedEvent<T>)=>void;renderItem?:(item:T,context:{selected:boolean;index:number})=>ReactNode;}
export function ComboBox<T extends CollectionItem=CollectionItem>({onReady,onSelectionChanged,onTextSubmitted,renderItem,...options}:ComboBoxProps<T>){const[node,setNode]=useState<ComboBoxController<T>|null>(null);return <><NodeElement kind={NodeKind.ComboBox} options={options} onReady={n=>{setNode(n as ComboBoxController<T>);onReady?.(n as ComboBoxController<T>);}} onSelectionChanged={onSelectionChanged} onEvent={e=>{if(e.kind===EventKind.TextSubmitted)onTextSubmitted?.(e);}}/>{node&&renderItem&&<ComposedItemTemplate view={node.itemsView} render={renderItem}/>}</>;}
function ComposedItemTemplate<T extends CollectionItem>({view,render}:{view:import('./scene').SuggestionItemsView<T>;render:(item:T,context:{selected:boolean;index:number})=>ReactNode}){
 const[slots,setSlots]=useState<readonly CollectionRealization<T>[]>([]);
 useLayoutEffect(()=>{const off=view.onRealizedChanged(items=>setSlots([...items]));const offSelection=view.onSelectionChanged(()=>setSlots([...view.realizedItems()]));const release=view.setItemTemplate(()=>{});setSlots([...view.realizedItems()]);return()=>{off();offSelection();release();};},[view]);
 return <>{slots.filter(s=>!s.container.isDisposed).map(s=><ParentContext.Provider key={s.key+':'+s.container.snapshot.id} value={s.container}>{render(s.item,{selected:s.selected,index:s.index})}</ParentContext.Provider>)}</>;
}
export interface ContentDialogProps extends ContentDialogOptions, ControlAttachments {children?:ReactNode;onReady?:(node:ContentDialogController)=>void;onPrimaryButtonClick?:(event:ComposedEvent)=>void;onSecondaryButtonClick?:(event:ComposedEvent)=>void;onCloseButtonClick?:(event:ComposedEvent)=>void;onClosing?:(event:ComposedEvent)=>void;onOpened?:(event:ComposedEvent)=>void;onClosed?:(event:ComposedEvent)=>void;}
export function ContentDialog({children,onReady,onPrimaryButtonClick,onSecondaryButtonClick,onCloseButtonClick,onClosing,onOpened,onClosed,...options}:ContentDialogProps){return <NodeElement kind={NodeKind.ContentDialog} options={options} onReady={n=>onReady?.(n as ContentDialogController)} onCloseButtonClick={onCloseButtonClick} onClosing={onClosing} onOpened={onOpened} onClosed={onClosed} onEvent={e=>{if(e.kind===EventKind.PrimaryButtonClick)onPrimaryButtonClick?.(e);if(e.kind===EventKind.SecondaryButtonClick)onSecondaryButtonClick?.(e);}}>{children}</NodeElement>;}
export interface TeachingTipProps extends TeachingTipOptions, ControlAttachments {children?:ReactNode;heroContent?:ReactNode;target?:SceneNode|string|null;onReady?:(node:TeachingTipController)=>void;onActionButtonClick?:(event:ComposedEvent)=>void;onCloseButtonClick?:(event:ComposedEvent)=>void;onClosing?:(event:ComposedEvent)=>void;onClosed?:(event:ComposedEvent)=>void;}
export function TeachingTip({children,heroContent,target,onReady,onActionButtonClick,onCloseButtonClick,onClosing,onClosed,...options}:TeachingTipProps){const slot=propertyChildren(children,TeachingTipHeroProperty);if(slot.found&&heroContent!==undefined)throw new Error('TeachingTip.HeroContent was assigned twice');children=slot.content;heroContent=slot.found?slot.value:heroContent;const[node,setNode]=useState<TeachingTipController|null>(null);return <NodeElement kind={NodeKind.TeachingTip} options={{...options,target}} onReady={n=>{setNode(n as TeachingTipController);onReady?.(n as TeachingTipController);}} onClosing={onClosing} onClosed={onClosed} onCloseButtonClick={onCloseButtonClick} onEvent={e=>{if(e.kind===EventKind.ActionButtonClick)onActionButtonClick?.(e);}}>{children}{node&&heroContent&&<ParentContext.Provider value={node.heroContent}>{heroContent}</ParentContext.Provider>}</NodeElement>;}

export interface AppBarButtonProps extends AppBarButtonOptions, ControlAttachments {children?:ReactNode;flyout?:FlyoutDeclaration;onReady?:(node:AppBarButtonController)=>void;onClick?:(event:SceneEvent)=>void;}
export interface AppBarToggleButtonProps extends AppBarToggleButtonOptions, ControlAttachments {children?:ReactNode;flyout?:FlyoutDeclaration;onReady?:(node:AppBarToggleButtonController)=>void;onClick?:(event:SceneEvent)=>void;onCheckedChanged?:(event:SceneEvent)=>void;}
export interface DropDownButtonProps extends DropDownButtonOptions, ControlAttachments {children?:ReactNode;flyout?:FlyoutDeclaration;onReady?:(node:DropDownButtonController)=>void;onClick?:(event:SceneEvent)=>void;}
function CommandActionElement({kind,children,flyout,onReady,onClick,onCheckedChanged,...options}:(AppBarButtonProps|AppBarToggleButtonProps|DropDownButtonProps)&{kind:NodeKind;onCheckedChanged?:(event:SceneEvent)=>void}){const[node,setNode]=useState<AppBarButtonController|AppBarToggleButtonController|DropDownButtonController|null>(null);const owned=useFlyoutProperty(node,children,flyout);return <NodeElement kind={kind} options={options} onReady={n=>{const action=n as AppBarButtonController;setNode(action);(onReady as ((node:AppBarButtonController)=>void)|undefined)?.(action);}} onClick={onClick} onEvent={e=>{if([EventKind.Checked,EventKind.Unchecked,EventKind.Indeterminate].includes(e.kind))onCheckedChanged?.(e);}}>{owned.content}{owned.declaration}</NodeElement>;}
export function AppBarButton(props:AppBarButtonProps){return <CommandActionElement kind={NodeKind.AppBarButton} {...props}/>;}
export function AppBarToggleButton(props:AppBarToggleButtonProps){return <CommandActionElement kind={NodeKind.AppBarToggleButton} {...props}/>;}
export function DropDownButton(props:DropDownButtonProps){return <CommandActionElement kind={NodeKind.DropDownButton} {...props}/>;}
export interface CommandBarProps<T extends CommandBarItem=CommandBarItem> extends CommandBarOptions<T>, ControlAttachments {children?:ReactNode;onReady?:(node:CommandBarController<T>)=>void;onCommandInvoked?:(event:CommandBarEvent<T>)=>void;}
export function CommandBar<T extends CommandBarItem=CommandBarItem>({children,onReady,onCommandInvoked,...options}:CommandBarProps<T>){return <NodeElement kind={NodeKind.CommandBar} options={options} onReady={n=>onReady?.(n as CommandBarController<T>)} onEvent={e=>{if(e.kind===EventKind.ItemClick){const event=e as CommandBarEvent;onCommandInvoked?.({...event,item:[...options.primaryCommands??[],...options.secondaryCommands??[]].find(i=>i.id===event.command.id)});}}}>{children}</NodeElement>;}
export interface SelectorBarProps<T extends NavigationData=NavigationData> extends SelectorBarOptions<T>, ControlAttachments {onReady?:(node:SelectorBarController<T>)=>void;onSelectionChanged?:(event:NavigationControlEvent<T>)=>void;}
export function SelectorBar<T extends NavigationData=NavigationData>({onReady,onSelectionChanged,...options}:SelectorBarProps<T>){const control=useRef<SelectorBarController<T>|null>(null);return <NodeElement kind={NodeKind.SelectorBar} options={options} onReady={n=>{control.current=n as SelectorBarController<T>;onReady?.(control.current);}} onEvent={e=>{if(e.kind===EventKind.SelectionChanged&&control.current)onSelectionChanged?.(control.current.navigationEvent(e));}}/>;}

export interface AppBarSeparatorProps extends AppBarSeparatorOptions, ControlAttachments {onReady?:(node:import('./scene').AppBarSeparator)=>void;}
/** Noninteractive separator, drawn by the shared Rust AppBar template. */
export function AppBarSeparator({onReady,...options}:AppBarSeparatorProps){return <NodeElement kind={NodeKind.AppBarSeparator} options={options} onReady={node=>onReady?.(node as import('./scene').AppBarSeparator)}/>;}

export interface CalendarViewProps extends CalendarViewOptions, ControlAttachments {onReady?:(node:CalendarViewController)=>void;onSelectedDatesChanged?:(event:PickerEvent)=>void;onDisplayModeChanged?:(event:PickerEvent)=>void;}
export function CalendarView({onReady,onSelectedDatesChanged,onDisplayModeChanged,...options}:CalendarViewProps){return <NodeElement kind={NodeKind.CalendarView} options={options} onReady={n=>onReady?.(n as CalendarViewController)} onEvent={e=>{if(e.kind===EventKind.SelectedDatesChanged)onSelectedDatesChanged?.(e as PickerEvent);if(e.kind===EventKind.DisplayModeChanged)onDisplayModeChanged?.(e as PickerEvent);}}/>;}
export interface CalendarDatePickerProps extends CalendarDatePickerOptions, ControlAttachments {onReady?:(node:CalendarDatePickerController)=>void;onDateChanged?:(event:PickerEvent)=>void;onOpened?:(event:PickerEvent)=>void;onClosed?:(event:PickerEvent)=>void;}
export function CalendarDatePicker({onReady,onDateChanged,onOpened,onClosed,...options}:CalendarDatePickerProps){return <NodeElement kind={NodeKind.CalendarDatePicker} options={options} onReady={n=>onReady?.(n as CalendarDatePickerController)} onEvent={e=>{if(e.kind===EventKind.DateChanged)onDateChanged?.(e as PickerEvent);if(e.kind===EventKind.Opened)onOpened?.(e as PickerEvent);if(e.kind===EventKind.Closed)onClosed?.(e as PickerEvent);}}/>;}
export interface DatePickerProps extends DatePickerOptions, ControlAttachments {onReady?:(node:DatePickerController)=>void;onDateChanged?:(event:PickerEvent)=>void;onSelectedDateChanged?:(event:PickerEvent)=>void;onOpened?:(event:PickerEvent)=>void;onClosed?:(event:PickerEvent)=>void;}
export function DatePicker({onReady,onDateChanged,onSelectedDateChanged,onOpened,onClosed,...options}:DatePickerProps){return <NodeElement kind={NodeKind.DatePicker} options={options} onReady={n=>onReady?.(n as DatePickerController)} onEvent={e=>{if(e.kind===EventKind.DateChanged)onDateChanged?.(e as PickerEvent);if(e.kind===EventKind.SelectedDateChanged)onSelectedDateChanged?.(e as PickerEvent);if(e.kind===EventKind.Opened)onOpened?.(e as PickerEvent);if(e.kind===EventKind.Closed)onClosed?.(e as PickerEvent);}}/>;}
export interface TimePickerProps extends TimePickerOptions, ControlAttachments {onReady?:(node:TimePickerController)=>void;onTimeChanged?:(event:PickerEvent)=>void;onSelectedTimeChanged?:(event:PickerEvent)=>void;onOpened?:(event:PickerEvent)=>void;onClosed?:(event:PickerEvent)=>void;}
export function TimePicker({onReady,onTimeChanged,onSelectedTimeChanged,onOpened,onClosed,...options}:TimePickerProps){return <NodeElement kind={NodeKind.TimePicker} options={options} onReady={n=>onReady?.(n as TimePickerController)} onEvent={e=>{if(e.kind===EventKind.TimeChanged)onTimeChanged?.(e as PickerEvent);if(e.kind===EventKind.SelectedTimeChanged)onSelectedTimeChanged?.(e as PickerEvent);if(e.kind===EventKind.Opened)onOpened?.(e as PickerEvent);if(e.kind===EventKind.Closed)onClosed?.(e as PickerEvent);}}/>;}
export interface ColorPickerProps extends ColorPickerOptions, ControlAttachments {onReady?:(node:ColorPickerController)=>void;onColorChanged?:(event:PickerEvent)=>void;}
export function ColorPicker({onReady,onColorChanged,...options}:ColorPickerProps){return <NodeElement kind={NodeKind.ColorPicker} options={options} onReady={n=>onReady?.(n as ColorPickerController)} onEvent={e=>{if(e.kind===EventKind.ColorChanged)onColorChanged?.(e as PickerEvent);}}/>;}

export interface MenuBarProps extends MenuBarOptions, ControlAttachments {children?:ReactNode;onReady?:(node:import('./scene').MenuBar)=>void;onItemInvoked?:(event:SceneEvent)=>void;}
export function MenuBar({children,onReady,onItemInvoked,...options}:MenuBarProps){return <NodeElement kind={NodeKind.MenuBar} options={options} onReady={n=>onReady?.(n as import('./scene').MenuBar)} onItemInvoked={onItemInvoked}>{children}</NodeElement>;}
export interface MenuBarItemProps extends MenuBarItemOptions, ControlAttachments {onReady?:(node:import('./scene').MenuBarItem)=>void;onItemInvoked?:(event:SceneEvent)=>void;}
export function MenuBarItem({onReady,onItemInvoked,...options}:MenuBarItemProps){return <NodeElement kind={NodeKind.MenuBarItem} options={options} onReady={n=>onReady?.(n as import('./scene').MenuBarItem)} onItemInvoked={onItemInvoked}/>;}
export interface RelativePanelProps extends RelativePanelOptions, ControlAttachments {children?:ReactNode;onReady?:(node:PanelController<RelativePanelOptions>)=>void;}
export function RelativePanel({children,onReady,...options}:RelativePanelProps){return <NodeElement kind={NodeKind.RelativePanel} options={options} onReady={n=>onReady?.(n as PanelController<RelativePanelOptions>)}>{children}</NodeElement>;}
export interface WrapPanelProps extends WrapPanelOptions, ControlAttachments {children?:ReactNode;onReady?:(node:PanelController<WrapPanelOptions>)=>void;}
export function WrapPanel({children,onReady,...options}:WrapPanelProps){return <NodeElement kind={NodeKind.WrapPanel} options={options} onReady={n=>onReady?.(n as PanelController<WrapPanelOptions>)}>{children}</NodeElement>;}
export interface CommandBarFlyoutProps extends CommandBarFlyoutOptions, ControlAttachments {target?:SceneNode|string|null;onReady?:(node:import('./scene').CommandBarFlyout)=>void;onCommandInvoked?:(event:CommandBarEvent)=>void;onClosing?:(event:SceneEvent)=>void;onClosed?:(event:SceneEvent)=>void;}
export function CommandBarFlyout({target,onReady,onCommandInvoked,onClosing,onClosed,...options}:CommandBarFlyoutProps){const parent=useContext(ParentContext),contextOwner=useContext(ContextFlyoutOwnerContext);const anchor=target===undefined?(contextOwner??(parent instanceof ButtonController?parent:null)):target;const[node,setNode]=useState<import('./scene').CommandBarFlyout|null>(null);useLayoutEffect(()=>{if(node&&!node.isDisposed&&contextOwner&&!contextOwner.isDisposed)contextOwner.setContextFlyout(node);},[node,contextOwner]);return <NodeElement kind={NodeKind.CommandBarFlyout} options={{...options,target:anchor}} onReady={n=>{setNode(n as import('./scene').CommandBarFlyout);onReady?.(n as import('./scene').CommandBarFlyout);}} onEvent={e=>{if(e.kind===EventKind.ItemClick)onCommandInvoked?.(e as CommandBarEvent);}} onClosing={onClosing} onClosed={onClosed}/>;}

export interface SplitViewProps extends importViewTypes.SplitViewOptions, ControlAttachments {children?:ReactNode;pane?:ReactNode;onReady?:(node:import('./scene').SplitView)=>void;onPaneClosing?:(event:SceneEvent)=>void;onEvent?:(event:SceneEvent)=>void;}
/** WinUI SplitView, implemented entirely by the Rust SDK. */
export function SplitView({children,pane,onReady,onPaneClosing,onEvent,...options}:SplitViewProps){const slot=propertyChildren(children,SplitViewPaneProperty);if(slot.found&&pane!==undefined)throw new Error('SplitView.Pane was assigned twice');children=slot.content;pane=slot.found?slot.value:pane;return <NodeElement kind={NodeKind.SplitView} options={options} onReady={n=>onReady?.(n as import('./scene').SplitView)} onPaneClosing={onPaneClosing} onEvent={onEvent}><NodeElement kind={NodeKind.Grid} options={{viewControls:{slot:'Content'}}}>{children}</NodeElement><NodeElement kind={NodeKind.Grid} options={{viewControls:{slot:'Pane'}}}>{pane}</NodeElement></NodeElement>;}
export interface SemanticZoomProps extends importViewTypes.SemanticZoomOptions, ControlAttachments {zoomedInView:ReactNode;zoomedOutView:ReactNode;onReady?:(node:import('./scene').SemanticZoom)=>void;onEvent?:(event:SceneEvent)=>void;}
/** WinUI SemanticZoom, using two Rust scene subtrees. */
export function SemanticZoom({zoomedInView,zoomedOutView,onReady,onEvent,...options}:SemanticZoomProps){return <NodeElement kind={NodeKind.SemanticZoom} options={options} onReady={n=>onReady?.(n as import('./scene').SemanticZoom)} onEvent={onEvent}><NodeElement kind={NodeKind.Grid} options={{viewControls:{slot:'ZoomedIn'}}}>{zoomedInView}</NodeElement><NodeElement kind={NodeKind.Grid} options={{viewControls:{slot:'ZoomedOut'}}}>{zoomedOutView}</NodeElement></NodeElement>;}
export interface ParallaxViewProps extends importViewTypes.ParallaxViewOptions, ControlAttachments {children?:ReactNode;onReady?:(node:import('./scene').ParallaxView)=>void;}
/** WinUI ParallaxView. React only passes the Rust scrolling source. */
export function ParallaxView({children,onReady,...options}:ParallaxViewProps){return <NodeElement kind={NodeKind.ParallaxView} options={options} onReady={n=>onReady?.(n as import('./scene').ParallaxView)}>{children}</NodeElement>;}
export interface UICommandProps extends importViewTypes.UICommandOptions, ControlAttachments {onReady?:(node:import('./scene').UICommand)=>void;onExecuteRequested?:(event:importViewTypes.UICommandEvent)=>void;onCanExecuteRequested?:(event:importViewTypes.UICommandEvent)=>void;}
/** Implements WinUI XamlUICommand. Rust owns the command; React supplies business callbacks. */
export function UICommand({onReady,onExecuteRequested,onCanExecuteRequested,...options}:UICommandProps){return <NodeElement kind={NodeKind.UICommand} options={options} onReady={n=>onReady?.(n as import('./scene').UICommand)} onEvent={e=>{if(e.kind===EventKind.ExecuteRequested)onExecuteRequested?.(e as importViewTypes.UICommandEvent);if(e.kind===EventKind.CanExecuteRequested)onCanExecuteRequested?.(e as importViewTypes.UICommandEvent);}}/>;}
export interface StandardCommandProps extends importViewTypes.StandardCommandOptions, ControlAttachments {onReady?:(node:import('./scene').StandardCommand)=>void;onExecuteRequested?:(event:importViewTypes.UICommandEvent)=>void;onCanExecuteRequested?:(event:importViewTypes.UICommandEvent)=>void;}
/** Implements WinUI StandardUICommand. Native presets are metadata; callbacks perform business actions. */
export function StandardCommand({onReady,onExecuteRequested,onCanExecuteRequested,...options}:StandardCommandProps){return <NodeElement kind={NodeKind.StandardCommand} options={options} onReady={n=>onReady?.(n as import('./scene').StandardCommand)} onEvent={e=>{if(e.kind===EventKind.ExecuteRequested)onExecuteRequested?.(e as importViewTypes.UICommandEvent);if(e.kind===EventKind.CanExecuteRequested)onCanExecuteRequested?.(e as importViewTypes.UICommandEvent);}}/>;}

export interface ItemsRepeaterProps<T extends CollectionItem=CollectionItem> extends ItemsRepeaterOptions<T>, ControlAttachments {
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
export interface RefreshVisualizerProps extends RefreshVisualizerOptions, ControlAttachments {children?:ReactNode;onReady?:(control:RefreshVisualizerController)=>void;onRefreshRequested?:(event:RefreshRequestedEvent)=>void;onRefresh?:()=>Promise<void>;onRefreshStateChanged?:(event:SceneEvent)=>void;}
export interface RefreshContainerProps extends RefreshContainerOptions, ControlAttachments {children?:ReactNode;visualizerContent?:ReactNode;visualizerOptions?:RefreshVisualizerOptions;onReady?:(control:RefreshContainerController)=>void;onRefreshRequested?:(event:RefreshRequestedEvent)=>void;onRefresh?:()=>Promise<void>;onRefreshStateChanged?:(event:SceneEvent)=>void;}
function RefreshElement({kind,children,onReady,onRefreshRequested,onRefresh,onRefreshStateChanged,visualizerContent,visualizerOptions,...options}:((RefreshVisualizerProps|RefreshContainerProps)&{kind:NodeKind;visualizerContent?:ReactNode;visualizerOptions?:RefreshVisualizerOptions})){const slot=propertyChildren(children,RefreshVisualizerProperty);if(slot.found&&visualizerContent!==undefined)throw new Error('Refresh visualizer content was assigned twice');children=slot.content;visualizerContent=slot.found?slot.value:visualizerContent;
 const[visualizer,setVisualizer]=useState<RefreshVisualizerController|null>(null);
 useLayoutEffect(()=>{if(visualizer&&visualizerOptions&&!visualizer.isDisposed)visualizer.update(visualizerOptions);},[visualizer,controlPropertyJSON(visualizerOptions)]);
 return <><NodeElement kind={kind} options={options} onReady={n=>{if(kind===NodeKind.RefreshContainer)setVisualizer((n as RefreshContainerController).visualizer);onReady?.(n as RefreshContainerController);}} onEvent={e=>{if(e.kind===EventKind.RefreshRequested){const event=e as RefreshRequestedEvent;onRefreshRequested?.(event);if(onRefresh){const deferral=event.getDeferral();Promise.resolve().then(onRefresh).catch(reportError).finally(()=>deferral.complete());}}if(e.kind===EventKind.RefreshStateChanged)onRefreshStateChanged?.(e);}}>{children}</NodeElement>{visualizer&&visualizerContent&&<ParentContext.Provider value={visualizer}>{visualizerContent}</ParentContext.Provider>}</>;
}
export function RefreshContainer(props:RefreshContainerProps){return <RefreshElement {...props} kind={NodeKind.RefreshContainer}/>;}
export function RefreshVisualizer(props:RefreshVisualizerProps){return <RefreshElement {...props} kind={NodeKind.RefreshVisualizer}/>;}

export interface ScrollViewProps extends importViewTypes.ScrollViewOptions, ControlAttachments {children?:ReactNode;onReady?:(node:import('./scene').ScrollView)=>void;}
export function ScrollView({children,onReady,...options}:ScrollViewProps){return <NodeElement kind={NodeKind.ScrollView} options={options} onReady={n=>onReady?.(n as import('./scene').ScrollView)}>{children}</NodeElement>;}
export interface SwipeControlProps extends importViewTypes.SwipeControlOptions, ControlAttachments {children?:ReactNode;onReady?:(node:import('./scene').SwipeControl)=>void;}
export function SwipeControl({children,onReady,...options}:SwipeControlProps){return <NodeElement kind={NodeKind.SwipeControl} options={options} onReady={n=>onReady?.(n as import('./scene').SwipeControl)}>{children}</NodeElement>;}

export interface ItemsViewProps<T extends CollectionItem=CollectionItem> extends Omit<CollectionProps<T>,'onReady'>,ItemsViewOptions<T>, ControlAttachments {onReady?:(control:import('./scene').ItemsView<T>)=>void;onItemInvoked?:(event:SceneEvent&{item:T})=>void;}
export function ItemsView<T extends CollectionItem=CollectionItem>({onReady,onItemInvoked,...props}:ItemsViewProps<T>){return <CollectionElement {...props} kind={NodeKind.ItemsView} onReady={n=>onReady?.(n as import('./scene').ItemsView<T>)} onItemClick={onItemInvoked??props.onItemClick}/>;}
export interface PagerControlProps extends PagerControlOptions, ControlAttachments {onReady?:(node:import('./scene').PagerControl)=>void;onSelectedIndexChanged?:(event:PagerIndexChangedEvent)=>void;}
export function PagerControl({onReady,onSelectedIndexChanged,...options}:PagerControlProps){return <NodeElement kind={NodeKind.PagerControl} options={options} onReady={n=>onReady?.(n as import('./scene').PagerControl)} onEvent={e=>{if(e.kind===EventKind.SelectedIndexChanged)onSelectedIndexChanged?.(e as PagerIndexChangedEvent);}}/>;}
export interface AnnotatedScrollBarProps extends AnnotatedScrollBarOptions, ControlAttachments {onReady?:(node:import('./scene').AnnotatedScrollBar)=>void;onScrolling?:(event:AnnotatedScrollingEvent)=>void;onDetailLabelRequested?:(event:DetailLabelRequestedEvent)=>void;renderLabel?:(label:import('./reading-controls-types').AnnotatedScrollBarLabel,index:number)=>ReactNode;renderDetail?:(content:string)=>ReactNode;}
export function AnnotatedScrollBar({onReady,onScrolling,onDetailLabelRequested,renderLabel,renderDetail,...options}:AnnotatedScrollBarProps){
 const control=useRef<import('./scene').AnnotatedScrollBar|null>(null);const[slots,setSlots]=useState<ReturnType<import('./scene').AnnotatedScrollBar['labelSlots']>>([]);const[detail,setDetail]=useState<PanelController|null>(null),[content,setContent]=useState('');
 return <><NodeElement kind={NodeKind.AnnotatedScrollBar} options={{...options,hasLabelTemplate:!!renderLabel,hasDetailTemplate:!!renderDetail}} onReady={n=>{control.current=n as import('./scene').AnnotatedScrollBar;onReady?.(control.current);}} onEvent={e=>{const c=control.current;if(!c||c.isDisposed)return;if(e.kind===EventKind.Scrolling)onScrolling?.(e as AnnotatedScrollingEvent);if(e.kind===EventKind.DetailLabelRequested){const event=e as DetailLabelRequestedEvent;onDetailLabelRequested?.(event);if(renderDetail)setContent(event.content??event.label??'');}if(e.kind===EventKind.RealizationChanged){setSlots(c.labelSlots());if(renderDetail)setDetail(c.detailContent());}}}/>{renderLabel&&slots.filter(s=>!s.slot.isDisposed).map(s=><ParentContext.Provider key={s.id} value={s.slot}>{renderLabel(s.label,s.index)}</ParentContext.Provider>)}{detail&&!detail.isDisposed&&renderDetail&&<ParentContext.Provider value={detail}>{renderDetail(content)}</ParentContext.Provider>}</>;
}
export interface LayoutPanelProps extends LayoutPanelOptions, ControlAttachments {children?:ReactNode;onReady?:(node:PanelController<LayoutPanelOptions>)=>void;}
export function LayoutPanel({children,onReady,...options}:LayoutPanelProps){return <NodeElement kind={NodeKind.LayoutPanel} options={options} onReady={n=>onReady?.(n as PanelController<LayoutPanelOptions>)}>{children}</NodeElement>;}
export interface RichTextBlockProps extends RichTextBlockOptions, ControlAttachments {children?:ReactNode;onReady?:(node:import('./scene').RichTextBlock)=>void;onHyperlinkClick?:(event:SceneEvent)=>void;onSelectionChanged?:(event:RichTextSelectionEvent)=>void;}
export function RichTextBlock({children,onReady,onHyperlinkClick,onSelectionChanged,...options}:RichTextBlockProps){return <NodeElement kind={NodeKind.RichTextBlock} options={options} onReady={n=>onReady?.(n as import('./scene').RichTextBlock)} onEvent={e=>{if(e.kind===EventKind.HyperlinkClick)onHyperlinkClick?.(e);if(e.kind===EventKind.TextSelectionChanged)onSelectionChanged?.(e as RichTextSelectionEvent);}}>{children}</NodeElement>;}
export interface RichTextBlockOverflowProps extends RichTextBlockOverflowOptions, ControlAttachments {onReady?:(node:import('./scene').RichTextBlockOverflow)=>void;}
export function RichTextBlockOverflow({onReady,...options}:RichTextBlockOverflowProps){return <NodeElement kind={NodeKind.RichTextBlockOverflow} options={options} onReady={n=>onReady?.(n as import('./scene').RichTextBlockOverflow)}/>;}
/** Named InlineUIContainer slot. Rust measures and flows the SDK subtree. */
export function RichInline({name,children}:{name:string;children:ReactNode}){return <NodeElement kind={NodeKind.Grid} options={{layoutKey:name}}>{children}</NodeElement>;}

export interface ContentControlProps extends ContentControlOptions, ControlAttachments {children?:ReactNode;onReady?:(node:import('./scene').ContentControl)=>void;}
export function ContentControl({children,onReady,...options}:ContentControlProps){return <NodeElement kind={NodeKind.ContentControl} options={options} onReady={n=>onReady?.(n as import('./scene').ContentControl)}>{children}</NodeElement>;}
export interface ContentPresenterProps extends ContentPresenterOptions, ControlAttachments {children?:ReactNode;onReady?:(node:import('./scene').ContentPresenter)=>void;}
export function ContentPresenter({children,onReady,...options}:ContentPresenterProps){return <NodeElement kind={NodeKind.ContentPresenter} options={options} onReady={n=>onReady?.(n as import('./scene').ContentPresenter)}>{children}</NodeElement>;}
export interface UserControlProps extends UserControlOptions, ControlAttachments {children?:ReactNode;onReady?:(node:import('./scene').UserControl)=>void;}
export function UserControl({children,onReady,...options}:UserControlProps){return <NodeElement kind={NodeKind.UserControl} options={options} onReady={n=>onReady?.(n as import('./scene').UserControl)}>{children}</NodeElement>;}
export interface PageProps extends PageOptions, ControlAttachments {children?:ReactNode;onReady?:(node:import('./scene').Page)=>void;}
export function Page({children,onReady,...options}:PageProps){return <NodeElement kind={NodeKind.Page} options={options} onReady={n=>onReady?.(n as import('./scene').Page)}>{children}</NodeElement>;}
export interface SceneFrameProps extends SceneFrameOptions, ControlAttachments {onReady?:(node:import('./scene').SceneFrame)=>void;onNavigating?:(event:SceneFrameNavigationEvent)=>void;onNavigated?:(event:SceneFrameNavigationEvent)=>void;onNavigationStopped?:(event:SceneFrameNavigationEvent)=>void;}
export function SceneFrame({onReady,onNavigating,onNavigated,onNavigationStopped,...options}:SceneFrameProps){return <NodeElement kind={NodeKind.Frame} options={options} onReady={n=>onReady?.(n as import('./scene').SceneFrame)} onEvent={e=>{if(e.kind===EventKind.FrameNavigating)onNavigating?.(e as SceneFrameNavigationEvent);if(e.kind===EventKind.FrameNavigated)onNavigated?.(e as SceneFrameNavigationEvent);if(e.kind===EventKind.FrameNavigationStopped)onNavigationStopped?.(e as SceneFrameNavigationEvent);}}/>;}

export interface MenuFlyoutItemProps extends importMenuItemTypes.MenuFlyoutItemOptions, ControlAttachments {onReady?:(node:import('./scene').MenuFlyoutItem)=>void;onClick?:(event:SceneEvent)=>void;}
export function MenuFlyoutItem({onReady,onClick,...options}:MenuFlyoutItemProps){return <NodeElement kind={NodeKind.MenuFlyoutItem} options={options} onReady={n=>onReady?.(n as import('./scene').MenuFlyoutItem)} onClick={onClick}/>;}
export interface ToggleMenuFlyoutItemProps extends importMenuItemTypes.ToggleMenuFlyoutItemOptions, ControlAttachments {onReady?:(node:import('./scene').ToggleMenuFlyoutItem)=>void;onClick?:(event:SceneEvent)=>void;onIsCheckedChanged?:(event:SceneEvent)=>void;}
export function ToggleMenuFlyoutItem({onReady,onClick,onIsCheckedChanged,...options}:ToggleMenuFlyoutItemProps){return <NodeElement kind={NodeKind.ToggleMenuFlyoutItem} options={options} onReady={n=>onReady?.(n as import('./scene').ToggleMenuFlyoutItem)} onClick={onClick} onIsCheckedChanged={onIsCheckedChanged}/>;}
export interface RadioMenuFlyoutItemProps extends importMenuItemTypes.RadioMenuFlyoutItemOptions, ControlAttachments {onReady?:(node:import('./scene').RadioMenuFlyoutItem)=>void;onClick?:(event:SceneEvent)=>void;onIsCheckedChanged?:(event:SceneEvent)=>void;}
export function RadioMenuFlyoutItem({onReady,onClick,onIsCheckedChanged,...options}:RadioMenuFlyoutItemProps){return <NodeElement kind={NodeKind.RadioMenuFlyoutItem} options={options} onReady={n=>onReady?.(n as import('./scene').RadioMenuFlyoutItem)} onClick={onClick} onIsCheckedChanged={onIsCheckedChanged}/>;}
export interface MenuFlyoutSubItemProps extends importMenuItemTypes.MenuFlyoutSubItemOptions, ControlAttachments {children?:ReactNode;onReady?:(node:import('./scene').MenuFlyoutSubItem)=>void;}
export function MenuFlyoutSubItem({children,onReady,...options}:MenuFlyoutSubItemProps){return <NodeElement kind={NodeKind.MenuFlyoutSubItem} options={options} onReady={n=>onReady?.(n as import('./scene').MenuFlyoutSubItem)}>{children}</NodeElement>;}
export interface MenuFlyoutSeparatorProps extends importMenuItemTypes.MenuFlyoutSeparatorOptions, ControlAttachments {onReady?:(node:import('./scene').MenuFlyoutSeparator)=>void;}
export function MenuFlyoutSeparator({onReady,...options}:MenuFlyoutSeparatorProps){return <NodeElement kind={NodeKind.MenuFlyoutSeparator} options={options} onReady={n=>onReady?.(n as import('./scene').MenuFlyoutSeparator)}/>;}
import type * as importMenuItemTypes from './menu-item-types';

export interface ScrollBarProps extends ScrollBarOptions, ControlAttachments {onReady?:(node:import('./scene').ScrollBar)=>void;onScroll?:(event:ScrollBarEvent)=>void;onValueChanged?:(event:SceneEvent)=>void;}
export function ScrollBar({onReady,onScroll,onValueChanged,...options}:ScrollBarProps){return <NodeElement kind={NodeKind.ScrollBar} options={options} onReady={n=>onReady?.(n as import('./scene').ScrollBar)} onEvent={e=>{if(e.kind===EventKind.Scroll)onScroll?.(e as ScrollBarEvent);if(e.kind===EventKind.ValueChanged)onValueChanged?.(e);}}/>;}
export interface ThumbProps extends ThumbOptions, ControlAttachments {onReady?:(node:import('./scene').Thumb)=>void;onDragStarted?:(event:ThumbDragStartedEvent)=>void;onDragDelta?:(event:ThumbDragDeltaEvent)=>void;onDragCompleted?:(event:ThumbDragCompletedEvent)=>void;}
export function Thumb({onReady,onDragStarted,onDragDelta,onDragCompleted,...options}:ThumbProps){return <NodeElement kind={NodeKind.Thumb} options={options} onReady={n=>onReady?.(n as import('./scene').Thumb)} onEvent={e=>{if(e.kind===EventKind.DragStarted)onDragStarted?.(e as ThumbDragStartedEvent);if(e.kind===EventKind.DragDelta)onDragDelta?.(e as ThumbDragDeltaEvent);if(e.kind===EventKind.DragCompleted)onDragCompleted?.(e as ThumbDragCompletedEvent);}}/>;}
export interface TickBarProps extends TickBarOptions, ControlAttachments {onReady?:(node:import('./scene').TickBar)=>void;}
export function TickBar({onReady,...options}:TickBarProps){return <NodeElement kind={NodeKind.TickBar} options={options} onReady={n=>onReady?.(n as import('./scene').TickBar)}/>;}
export interface ScrollContentPresenterProps extends ScrollContentPresenterOptions, ControlAttachments {children?:ReactNode;onReady?:(node:import('./scene').ScrollContentPresenter)=>void;onViewChanged?:(event:SceneEvent)=>void;}
export function ScrollContentPresenter({children,onReady,onViewChanged,...options}:ScrollContentPresenterProps){return <NodeElement kind={NodeKind.ScrollContentPresenter} options={options} onReady={n=>onReady?.(n as import('./scene').ScrollContentPresenter)} onEvent={e=>{if(e.kind===EventKind.ViewChanged)onViewChanged?.(e);}}>{children}</NodeElement>;}
function PresenterPart({footer,children}:{footer?:boolean;children:ReactNode}){const parent=useContext(ParentContext) as import('./scene').ItemsPresenter|null;if(!parent)return null;return <ParentContext.Provider value={footer?parent.footerContent:parent.headerContent}>{children}</ParentContext.Provider>;}
export interface ItemsPresenterProps extends Omit<ItemsPresenterOptions,'header'|'footer'>, ControlAttachments {header?:ReactNode;footer?:ReactNode;children?:ReactNode;onReady?:(node:import('./scene').ItemsPresenter)=>void;}
export function ItemsPresenter({header,footer,children,onReady,...options}:ItemsPresenterProps){const head=propertyChildren(children,PresenterHeaderProperty),foot=propertyChildren(head.content,PresenterFooterProperty);if(head.found&&header!==undefined||foot.found&&footer!==undefined)throw new Error('ItemsPresenter header/footer was assigned twice');children=foot.content;header=head.found?head.value:header;footer=foot.found?foot.value:footer;const h=typeof header==='string'?header:'',f=typeof footer==='string'?footer:'';return <NodeElement kind={NodeKind.ItemsPresenter} options={{...options,header:h,footer:f}} onReady={n=>onReady?.(n as import('./scene').ItemsPresenter)}>{children}{header&&typeof header!=='string'&&<PresenterPart>{header}</PresenterPart>}{footer&&typeof footer!=='string'&&<PresenterPart footer>{footer}</PresenterPart>}</NodeElement>;}

/** Template context uses stable business identity and native Rust content slots. */
export interface TableViewTemplateContext<T extends object> {row:string;column:string;index:number;editing:boolean;selected:boolean;commit:(value:unknown)=>void;cancel:()=>void;}
export interface ReactTableViewColumn<T extends object> extends TableViewColumn<T> {
 renderHeader?:(column:TableViewColumn<T>)=>ReactNode;
 renderCell?:(item:T,context:TableViewTemplateContext<T>)=>ReactNode;
 renderEditor?:(item:T,context:TableViewTemplateContext<T>)=>ReactNode;
}
export interface TableViewProps<T extends object=Record<string,unknown>> extends Omit<TableViewOptions<T>,'columns'>, ControlAttachments {
 columns?:readonly ReactTableViewColumn<T>[];
 /** Optional business content in the Rust-owned group header slot. */ renderGroupHeader?:(group:TableViewGroupInfo)=>ReactNode;
 onGrouping?:(event:TableViewEvent<T>)=>void;
 renderRowDetails?:(item:T)=>ReactNode;renderRowHeader?:(item:T)=>ReactNode;
 onReady?:(table:TableViewController<T>)=>void;
 onItemsChanged?:(items:readonly T[])=>void;
 onCellSelectionChanged?:(event:TableViewEvent<T>)=>void;
 onCellDoubleTapped?:(event:TableViewEvent<T>)=>void;
 onRowDoubleTapped?:(event:TableViewEvent<T>)=>void;
 onClearSorting?:(event:TableViewEvent<T>)=>void;
 onSelectionChanged?:(event:TableViewEvent<T>)=>void;
 onCurrentCellChanged?:(event:TableViewEvent<T>)=>void;
 onSorting?:(event:TableViewEvent<T>)=>void;
 onBeginningEdit?:(event:TableViewEvent<T>)=>void;
 onPreparingCellForEdit?:(event:TableViewEvent<T>)=>void;
 onCellEditEnding?:(event:TableViewEvent<T>)=>void;
 onCellEditEnded?:(event:TableViewEvent<T>)=>void;
 onColumnReordering?:(event:TableViewEvent<T>)=>void;
 onColumnReordered?:(event:TableViewEvent<T>)=>void;
 onCopy?:(event:TableViewEvent<T>)=>void;
 onPaste?:(event:TableViewEvent<T>)=>void;
 onExport?:(event:TableViewEvent<T>)=>void;
 onContextRequested?:(event:TableViewEvent<T>)=>void;
 onEvent?:(event:TableViewEvent<T>)=>void;
}
/** Community TableView, backed by the same Rust SDK as the framework-independent API. */
export function TableView<T extends object=Record<string,unknown>>({columns,renderGroupHeader,onGrouping,renderRowDetails,renderRowHeader,onReady,onItemsChanged,onCellSelectionChanged,onCellDoubleTapped,onRowDoubleTapped,onClearSorting,onSelectionChanged,onCurrentCellChanged,onSorting,onBeginningEdit,onPreparingCellForEdit,onCellEditEnding,onCellEditEnded,onColumnReordering,onColumnReordered,onCopy,onPaste,onExport,onContextRequested,onEvent,...options}:TableViewProps<T>){
 const control=useRef<TableViewController<T>|null>(null),[slots,setSlots]=useState<TableViewSlot<T>[]>([]),[headers,setHeaders]=useState<{column:string;container:PanelController}[]>([]),[groups,setGroups]=useState<TableViewGroupSlot[]>([]);
 const refresh=()=>{const node=control.current;if(!node||node.isDisposed)return;const next=node.realizedCells();const hs=node.realizedHeaders();const gs=node.realizedGroups();setGroups(old=>old.length===gs.length&&old.every((g,i)=>g.container===gs[i].container&&g.id===gs[i].id&&g.count===gs[i].count&&g.isExpanded===gs[i].isExpanded)?old:gs);setHeaders(old=>old.length===hs.length&&old.every((h,i)=>h.container===hs[i].container)?old:hs);setSlots(old=>old.length===next.length&&old.every((s,i)=>s.container===next[i].container&&s.item===next[i].item&&s.editing===next[i].editing)?old:next);};
 const nativeColumns=columns?.map(({renderCell,renderEditor,renderHeader,...column})=>({...column,hasTemplate:!!renderCell,hasEditTemplate:!!renderEditor,hasHeaderTemplate:!!renderHeader}));
 const callbacks:Partial<Record<EventKind,((e:TableViewEvent<T>)=>void)|undefined>>={[EventKind.Grouping]:onGrouping,[EventKind.CellSelectionChanged]:onCellSelectionChanged,[EventKind.CellDoubleTapped]:onCellDoubleTapped,[EventKind.RowDoubleTapped]:onRowDoubleTapped,[EventKind.ClearSorting]:onClearSorting,[EventKind.SelectionChanged]:onSelectionChanged,[EventKind.CurrentCellChanged]:onCurrentCellChanged,[EventKind.Sorting]:onSorting,[EventKind.BeginningEdit]:onBeginningEdit,[EventKind.PreparingCellForEdit]:onPreparingCellForEdit,[EventKind.CellEditEnding]:onCellEditEnding,[EventKind.CellEditEnded]:onCellEditEnded,[EventKind.ColumnReordering]:onColumnReordering,[EventKind.ColumnReordered]:onColumnReordered,[EventKind.CopyRequested]:onCopy,[EventKind.PasteFromClipboard]:onPaste,[EventKind.TableViewExport]:onExport,[EventKind.ContextRequested]:onContextRequested};
 return <><NodeElement kind={NodeKind.TableView} options={{...options,columns:nativeColumns,hasRowDetailsTemplate:!!renderRowDetails,hasRowHeaderTemplate:!!renderRowHeader,hasGroupHeaderTemplate:!!renderGroupHeader}} onReady={n=>{control.current=n as TableViewController<T>;onReady?.(control.current);refresh();}} onEvent={e=>{const event=e as TableViewEvent<T>;if(e.kind===EventKind.TableViewChanged&&e.table?.items)onItemsChanged?.(event.items);callbacks[e.kind]?.(event);onEvent?.(event);if(e.kind===EventKind.RealizationChanged||e.kind===EventKind.TableViewChanged)refresh();}}/>
 {renderGroupHeader&&groups.filter(g=>!g.container.isDisposed).map(g=><ParentContext.Provider key={g.container.snapshot.id} value={g.container}>{renderGroupHeader(g)}</ParentContext.Provider>)}
 {headers.filter(h=>!h.container.isDisposed).map(h=>{const column=columns?.find(c=>(c.key??c.path??c.field)===h.column);return column?.renderHeader?<ParentContext.Provider key={h.container.snapshot.id} value={h.container}>{column.renderHeader(column)}</ParentContext.Provider>:null;})}
 {slots.filter(slot=>!slot.container.isDisposed).map(slot=>{let content:ReactNode;if(slot.role==='details')content=renderRowDetails?.(slot.item);else if(slot.role==='rowHeader')content=renderRowHeader?.(slot.item);else{const column=columns?.find(c=>(c.key??c.path??c.field)===slot.column);const render=slot.editing?column?.renderEditor:column?.renderCell;const selected=control.current?.tableSnapshot?.selectedCells.some(c=>c.row===slot.row&&c.column===slot.column)||control.current?.tableSnapshot?.selectedKeys.includes(slot.row)||false;content=render?.(slot.item,{row:slot.row,column:slot.column,index:slot.index,editing:slot.editing,selected,commit:value=>control.current?.commitEdit(value),cancel:()=>control.current?.cancelEdit()});}return content===undefined?null:<ParentContext.Provider key={slot.container.snapshot.id} value={slot.container}>{content}</ParentContext.Provider>;})}</>;
}

/** Source-native NavigationViewItem, including use inside PaneFooter. */
export function NavigationViewItem({children,onReady,onClick,...options}:import('./scene').NavigationViewItemOptions & {children?:ReactNode;onReady?:(item:import('./scene').NavigationViewItem)=>void;onClick?:(event:SceneEvent)=>void}){
 return <NodeElement kind={NodeKind.NavigationViewItem} options={options} onReady={node=>onReady?.(node as import('./scene').NavigationViewItem)} onClick={onClick}>{children}</NodeElement>;
}

// Property elements route into existing Rust slots; they create no additional
// control implementation, DOM chrome, input handling or animation state.
function SplitViewPaneProperty({children}:{children?:ReactNode}){return children;}
function RefreshVisualizerProperty({children}:{children?:ReactNode}){return children;}
function InfoBarActionProperty({children}:{children?:ReactNode}){return children==null||children===false?null:<NodeElement kind={NodeKind.Grid} options={{isInfoBarAction:true}}><PropertyContent>{children}</PropertyContent></NodeElement>;}
function TeachingTipHeroProperty({children}:{children?:ReactNode}){
 const owner=useContext(ParentContext);
 if(!(owner instanceof TeachingTipController))throw new Error('TeachingTip.HeroContent requires a TeachingTip');
 return <ParentContext.Provider value={owner.heroContent}><PropertyContent>{children}</PropertyContent></ParentContext.Provider>;
}
function PresenterHeaderProperty({children}:{children?:ReactNode}){return <PresenterPart><PropertyContent>{children}</PropertyContent></PresenterPart>;}
function PresenterFooterProperty({children}:{children?:ReactNode}){return <PresenterPart footer><PropertyContent>{children}</PropertyContent></PresenterPart>;}
function FloatingContentProperty({children}:{children?:ReactNode|((surface:FloatingSurface<PopupOptions>)=>ReactNode)}){
 const owner=useContext(ParentContext);
 if(!(owner instanceof FloatingSurface))throw new Error('Flyout.Content requires a floating surface');
 return <PropertyContent>{typeof children==='function'?children(owner):children}</PropertyContent>;
}

SplitButton.Flyout=ButtonFlyout;
ToggleSplitButton.Flyout=ButtonFlyout;
AppBarButton.Flyout=ButtonFlyout;
AppBarToggleButton.Flyout=ButtonFlyout;
DropDownButton.Flyout=ButtonFlyout;
Button.Content=PropertyContent;
SplitButton.Content=PropertyContent;
ToggleSplitButton.Content=PropertyContent;
DropDownButton.Content=PropertyContent;
AppBarButton.Icon=PropertyContent;
AppBarToggleButton.Icon=PropertyContent;
Expander.Header=ExpanderHeaderContent;
Expander.Content=PropertyContent;
InfoBar.ActionButton=InfoBarActionProperty;
InfoBar.Content=PropertyContent;
SplitView.Pane=SplitViewPaneProperty;
SplitView.Content=PropertyContent;
TeachingTip.HeroContent=TeachingTipHeroProperty;
TeachingTip.Content=PropertyContent;
ContentControl.Content=PropertyContent;
ContentPresenter.Content=PropertyContent;
UserControl.Content=PropertyContent;
Page.Content=PropertyContent;
ContentDialog.Content=PropertyContent;
Flyout.Content=FloatingContentProperty;
MenuFlyout.Items=PropertyContent;
Popup.Child=PropertyContent;
ToolTip.Content=PropertyContent;
ItemsPresenter.Header=PresenterHeaderProperty;
ItemsPresenter.Footer=PresenterFooterProperty;
RefreshContainer.VisualizerContent=RefreshVisualizerProperty;
Button.ToolTip=ToolTipProperty;
SplitButton.ToolTip=ToolTipProperty;
ToggleSplitButton.ToolTip=ToolTipProperty;
AppBarButton.ToolTip=ToolTipProperty;
AppBarToggleButton.ToolTip=ToolTipProperty;
DropDownButton.ToolTip=ToolTipProperty;
TextBlock.ToolTip=ToolTipProperty;
TextBox.ToolTip=ToolTipProperty;
PasswordBox.ToolTip=ToolTipProperty;
RichEditBox.ToolTip=ToolTipProperty;
Grid.ToolTip=ToolTipProperty;
StackPanel.ToolTip=ToolTipProperty;
Border.ToolTip=ToolTipProperty;
ScrollViewer.ToolTip=ToolTipProperty;

Button.ContextFlyout=ContextFlyoutProperty;
TextBox.ContextFlyout=ContextFlyoutProperty;
RichEditBox.ContextFlyout=ContextFlyoutProperty;
PasswordBox.ContextFlyout=ContextFlyoutProperty;
TextBlock.ContextFlyout=ContextFlyoutProperty;
Grid.ContextFlyout=ContextFlyoutProperty;
StackPanel.ContextFlyout=ContextFlyoutProperty;
Border.ContextFlyout=ContextFlyoutProperty;
