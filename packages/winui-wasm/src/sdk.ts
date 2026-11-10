import {NavigationView} from "./navigation-view";
export {NavigationView} from "./navigation-view";
import {acquireGlobalScrollbars,type GlobalScrollbars} from "./global-scrollbars";
import {projectNavigationScrollbars} from './navigation-scrollbars';
import { SurfaceMetrics } from "./surface-metrics";
import { Frame, type FrameOptions } from './frame';
import { Scene, type SceneOptions } from "./scene";
import init, { WinUiRuntime } from "./wasm/winui";
const wasmBinaryUrl = new URL('./wasm/winui_bg.wasm', import.meta.url).href;
import wasmBuild from "./wasm/build-stamp.json";
import {ensureHostStyles} from './host-styles';
import {loadIconFonts} from './icon-fonts';

import {
  PaneDisplayMode,
  ThemeMode,
  ItemKind,
  DisplayMode,
  EventKind,
  ContentKind,
  GridUnit,
  HorizontalAlignment,
  VerticalAlignment,
  Orientation,
} from "./enums";
export {
  PaneDisplayMode,
  ThemeMode,
  ThemeMode as Theme,
  ItemKind,
  DisplayMode,
  EventKind,
  ContentKind,
  GridUnit,
  HorizontalAlignment,
  VerticalAlignment,
  Orientation,
} from "./enums";
/** Typed content tree measured, arranged and drawn in Rust. */
export interface ContentNode {
  /** Node template. Default: ContentKind.Grid. */ kind?: ContentKind;
  children?: ContentNode[];
  rows?: GridTrack[];
  columns?: GridTrack[];
  row?: number;
  column?: number;
  rowSpan?: number;
  columnSpan?: number;
  margin?: [number, number, number, number];
  width?: number | null;
  height?: number | null;
  minWidth?: number;
  minHeight?: number;
  fill?: string | null;
  text?: string;
  fontSize?: number;
  fontWeight?: number;
  wrap?: boolean;
  trimSideBearings?: boolean;
  spacing?: number;
  /** Default HorizontalAlignment.Stretch. */ horizontalAlignment?: HorizontalAlignment;
  /** Default VerticalAlignment.Stretch. */ verticalAlignment?: VerticalAlignment;
  /** Default Orientation.Vertical. */ orientation?: Orientation;
}
export interface GridTrack {
  /** Track unit. Default GridUnit.Star. */ unit?: GridUnit;
  value?: number;
}
export interface NavigationItem {
  id: string;
  text: string;
  icon?: string;
  /** Native animated icon; uses the same Rust marker player as AnimatedIcon. */ animatedIconSource?: import("./enums").AnimatedIconSource;
  /** Node template. Default: ItemKind.Item. Headers and separators are not interactive. */
  kind?: ItemKind;
  enabled?: boolean;
  selectsOnInvoked?: boolean;
  children?: NavigationItem[];
  /** Optional native ToolTip; compact items also expose their text automatically. */ tooltip?:string;
  /** Display arbitrary Rust content while preserving native navigation behavior. */
  contentTemplate?:import('./content-host-types').ContentTemplate;
  /** Badge supplied to the item presenter. */ infoBadge?:import('./content-host-types').ContentTemplate;
  /** Native lazy hierarchy marker; Expanding lets the application supply children. */ hasUnrealizedChildren?:boolean;
  iconSource?:import('./scene').IconSource;
}
/** AcrylicBrush recipe. Rust owns color conversion, blur, blend layers and noise. */
export interface AcrylicOptions {
  tintColor: string;
  tintOpacity: number;
  luminosityOpacity?: number | null;
  fallbackColor: string;
}
export interface NavigationViewOptions {
  items?: NavigationItem[];
  footerItems?: NavigationItem[];
  /** Placement policy. Default: PaneDisplayMode.Auto. Rust computes effective display mode. */
  paneDisplayMode?: PaneDisplayMode;
  selectedId?: string | null;
  isPaneOpen?: boolean | null;
  isPaneVisible?: boolean;
  isSettingsVisible?: boolean;
  /** Native three-state policy. Default Auto. */
  isBackButtonVisible?: import("./enums").NavigationViewBackButtonVisible;
  isBackEnabled?: boolean;
  isPaneToggleButtonVisible?: boolean;
  selectionFollowsFocus?: boolean;
  openPaneLength?: number;
  compactPaneLength?: number;
  compactModeThresholdWidth?: number;
  expandedModeThresholdWidth?: number;
  paneTitle?: string;
  /** Native default null; an empty string keeps the header presenter. */
  header?: string|null;
  /** Native default null. Use the Content slot to host a Frame. */
  content?: string|null;
  contentNode?: ContentNode | null;
  headerTemplate?:import('./content-host-types').ContentTemplate|null;
  paneHeader?:import('./content-host-types').ContentTemplate|null;
  paneCustomContent?:import('./content-host-types').ContentTemplate|null;
  paneFooter?:import('./content-host-types').ContentTemplate|null;
  autoSuggestBox?:import('./content-host-types').ContentTemplate|null;
  contentOverlay?:import('./content-host-types').ContentTemplate|null;
  menuItemTemplate?:import('./content-host-types').ContentTemplate|null;
  /** Default MoreLabel. */ overflowLabelMode?:import('./enums').NavigationViewOverflowLabelMode;
  /** Default Never. */ shoulderNavigationEnabled?:import('./enums').NavigationViewShoulderNavigationEnabled;
  /** Default false. Page content is painted by the browser host; Rust owns the
   * transparent navigation surface, dismiss layer, clipping and input regions. */
  hasExternalContent?:boolean;
  /** Default Auto (transparent desktop light-dismiss). On uses the native theme brush. */
  lightDismissOverlayMode?:import('./enums').LightDismissOverlayMode;
  /** Palette. Default: ThemeMode.Light; resolve system preferences in the host. */
  theme?: ThemeMode;
  accent?: string;
  reducedMotion?: boolean;
  reducedTransparency?: boolean;
  /** Host sampling capability. Default true for Rust canvas content; set false for external DOM to use the native resource fallback. */
  isBackdropAvailable?:boolean;
  expandedPaneMaterial?: AcrylicOptions | null;
  alwaysShowHeader?: boolean;
}
export interface NavigationEvent {
  /** Rust recommendation from native NavigationView ordering: Entrance for left panes, directional slide for Top. */
  recommendedNavigationTransition?:import('./enums').NavigationTransition;
  /** Notification category. Only EventKind.PaneClosing accepts cancellation. */
  kind: EventKind;
  itemId?: string;
  /** Internal handshake token for diagnostics; business callbacks do not need it. */
  requestId?: number;
  /** Set synchronously inside PaneClosing. Default false; ignored on notifications. */
  cancel: boolean;
}
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Part {
  id: string;
  text: string;
  icon: string;
  rect: Rect;
  enabled: boolean;
  selected: boolean;
  expanded: boolean | null;
  depth: number;
  kind: ItemKind;
  clip: Rect | null;
}
export interface NavigationScrollbarVisual {
  /** False for the menu template ScrollViewer, true for native Canvas content. */ readonly content:boolean;
  /** Rust pointer rail and current thumb in NavigationView-local DIP. */ readonly rect:Rect;readonly thumb:Rect;
  readonly offset:number;readonly maximum:number;readonly opacity:number;readonly expansion:number;
}
export interface NavigationSnapshot {
  /** Rust-owned surface regions for externally painted page content; null for normal content. */
  hostClip:Rect[]|null;
  /** Rust paint and input state; the host never creates another dismiss control. */
  lightDismiss:{rect:Rect;color:string;opacity:number;interactive:boolean}|null;
  /** Rust deadline for deferred auto-hide; hosts sleep instead of polling. */ nextFrameAt:number|null;
  /** Shared Rust ScrollViewer state; DOM hosts draw no scrollbar chrome. */ scrollbars:NavigationScrollbarVisual[];
    /** Rust-owned touch viewport geometry; projection forwards input without scrolling DOM. */ scrollViewports:{content:boolean;rect:Rect}[];
  /** Effective native pane recipe and Rust animated effect colors; null for the default transparent expanded pane. */
  paneMaterial:{recipe:AcrylicOptions;colors:{tint:string;luminosity:string;fallback:string}|null;weight:number;backdropAvailable:boolean}|null;
  /** Rust's 200 ms implicit item offsets and native AnimatedChevron marker state. */
  hierarchyVisuals:{id:string;layoutY:number;offsetY:number;chevron:{state:string;progress:number;active:boolean;queuedStates:string[];segmentStart:string;segmentEnd:string}|null}[];
  /** Rust timeline time sampled for this frame, from the runtime host clock. */ time: number;
  /** Effective Rust layout; derived from PaneDisplayMode and available width. */
  displayMode: DisplayMode;
  isPaneOpen: boolean;
  selectedId: string | null;
  focusedId: string | null;
  pane: Rect;
  /** Rust visual content bounds. Inline width changes once per pane state;
   * the animated x position corresponds to native ContentTransform. */
  content: Rect;
  parts: Part[];
  events: Omit<NavigationEvent, "cancel">[];
  animating: boolean;
  expandedIds: string[];
  overflowOpen: boolean;
  scrollOffset: number;
  maxScroll: number;
  indicatorVisuals: { rect: Rect; opacity: number }[];
  contentScrollOffset: number;
  maxContentScroll: number;
}
type Listener = (event: NavigationEvent) => void;
let initialization: Promise<unknown> | undefined;
export interface RuntimeOptions {
  /** Automatically attach Rust-rendered scrollbars to this document. Default true. */ globalScrollbars?:boolean;
  /** Optional monotonic host clock for deterministic replay/capture. Default performance.now. */ clock?: () => number;
}

/** One WASM runtime may own many independently disposable controls. */
export class WinUI {
  /** Content hash of the loaded SDK build, useful when diagnosing stale tabs. */
  static readonly buildVersion=wasmBuild.sha256;
  private controls = new Set<{ dispose(): void }>();
  private disposed = false;
  private constructor(
    private raw: WinUiRuntime,
    private clock: () => number,
  ) {}
  static async create(options: RuntimeOptions = {}): Promise<WinUI> {
    ensureHostStyles(document);
    await loadIconFonts();
    await (initialization ??= init({module_or_path:`${wasmBinaryUrl}${wasmBinaryUrl.includes('?')?'&':'?'}v=${wasmBuild.sha256}`}));
    const sdk=new WinUI(new WinUiRuntime(),options.clock??(()=>performance.now()));
    if(options.globalScrollbars!==false)sdk.installGlobalScrollbars();return sdk;
  }
  /** Native source dimensions, duration and marker table, read from Rust. */
  animatedIconInfo(source:import('./enums').AnimatedIconSource): {size:[number,number];durationMs:number;markers:Readonly<Record<string,number>>}{
    if(this.disposed)throw new Error('WinUI runtime is disposed');
    return JSON.parse(this.raw.animated_icon_info(JSON.stringify(source)));
  }
  /** Attach all current/future scroll surfaces under a document or subtree.
   * Multiple runtimes share one document renderer. The lease is released on runtime disposal. */
  installGlobalScrollbars(root:Document|HTMLElement=document):GlobalScrollbars {
    if(this.disposed)throw new Error("WinUI runtime is disposed");let lease:GlobalScrollbars;
    lease=acquireGlobalScrollbars(root,()=>this.controls.delete(lease));this.controls.add(lease);return lease;
  }
  navigationView(
    host: HTMLElement,
    options: NavigationViewOptions = {},
  ): NavigationView {
    if (this.disposed) throw new Error("WinUI runtime is disposed");
    const view = new NavigationView(
      this.raw,
      host,
      options,
      () => this.controls.delete(view),
      this.clock,
    );
    this.controls.add(view);
    return view;
  }
  /** Create a page Frame sharing this runtime. Dispose it or the owning runtime to release cached content. */
  frame<T>(options:FrameOptions<T>):Frame<T> {
    if(this.disposed)throw new Error('WinUI runtime is disposed');
    let frame:Frame<T>;
    frame=new Frame(this.raw,options,this.clock,()=>this.controls.delete(frame));
    this.controls.add(frame);return frame;
  }
  scene(host: HTMLElement, options: SceneOptions = {}): Scene {
    if (this.disposed) throw new Error("WinUI runtime is disposed");
    let scene: Scene | undefined;
    scene = new Scene(this.raw, host, options, this.clock, () => {
      if (scene) this.controls.delete(scene);
    });
    this.controls.add(scene);
    return scene;
  }
  get liveCount(): number {
    if (this.disposed) return 0;
    return this.raw.live_count();
  }
  /** Resolve a source-extracted content template by resource key. Returns a detached tree. */
  template(key: string): ContentNode {
    if (this.disposed) throw new Error("WinUI runtime is disposed");
    return JSON.parse(this.raw.template(key));
  }
  dispose(): void {
    if (this.disposed) return;
    for (const control of this.controls) control.dispose();
    this.raw.free();
    this.disposed = true;
  }
}
