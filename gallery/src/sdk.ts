import {acquireGlobalScrollbars,type GlobalScrollbars} from "./global-scrollbars";
import {projectNavigationScrollbars} from './navigation-scrollbars';
import { SurfaceMetrics } from "./surface-metrics";
import { Frame, type FrameOptions } from './frame';
import { Scene, type SceneOptions } from "./scene";
import init, { WinUiRuntime } from "./wasm/winui";
import wasmBinaryUrl from "./wasm/winui_bg.wasm?url";
import wasmBuild from "./wasm/build-stamp.json";
if(import.meta.hot)import.meta.hot.accept('./wasm/build-stamp.json',()=>location.reload());
import "./host.css";

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
  isBackButtonVisible?: boolean;
  isBackEnabled?: boolean;
  isPaneToggleButtonVisible?: boolean;
  selectionFollowsFocus?: boolean;
  openPaneLength?: number;
  compactPaneLength?: number;
  compactModeThresholdWidth?: number;
  expandedModeThresholdWidth?: number;
  paneTitle?: string;
  header?: string;
  content?: string;
  contentNode?: ContentNode | null;
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
  /** Rust deadline for deferred auto-hide; hosts sleep instead of polling. */ nextFrameAt:number|null;
  /** Shared Rust ScrollViewer state; DOM hosts draw no scrollbar chrome. */ scrollbars:NavigationScrollbarVisual[];
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

/** Rust owns all layout, interaction, selection and animation state.
 * DOM buttons are an accessibility/focus projection of Rust's arranged parts.
 */
export class NavigationView {
  get isDisposed():boolean{return this.disposed;}
  private readonly handle: number;
  private element = document.createElement("div");
  private canvas = document.createElement("canvas");
  private accessibility = document.createElement("nav");
  private buttons = new Map<string, HTMLButtonElement>();
  private listeners = new Map<EventKind, Set<Listener>>();
  private snapshotListeners = new Set<(snapshot: Readonly<NavigationSnapshot>) => void>();
  private abort = new AbortController();
  private viewport: SurfaceMetrics;
  private frameId = 0;
  private wakeTimer:ReturnType<typeof setTimeout>|undefined;
  private disposed = false;
  private dispatching = false;
  private jobs: (() => void)[] = [];
  private state!: NavigationSnapshot;
  private stats = { frames: 0, totalMs: 0, maxMs: 0 };

  constructor(
    private raw: WinUiRuntime,
    host: HTMLElement,
    options: NavigationViewOptions,
    private released: () => void,
    private clock: () => number = () => performance.now(),
  ) {
    this.element.className = "winui-surface";
    this.element.style.cssText =
      "position:relative;width:100%;height:100%;overflow:hidden;touch-action:pan-y;";
    this.canvas.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;";
    this.canvas.setAttribute("aria-hidden", "true");
    this.accessibility.style.cssText = "position:absolute;inset:0;";
    this.accessibility.setAttribute("aria-label", "NavigationView");
    this.element.append(this.canvas, this.accessibility);
    this.handle = raw.create(JSON.stringify(options), this.canvas);
    host.append(this.element);
    const signal = this.abort.signal;
    this.element.addEventListener(
      "pointermove",
      (e) => {
        const p = this.point(e);
        this.send({ kind: "move", ...p });
      },
      { signal },
    );
    this.element.addEventListener(
      "pointerdown",
      (e) => {
        if (e.button !== 0) return;
        this.element.setPointerCapture(e.pointerId);
        this.send({ kind: "down", ...this.point(e) });
      },
      { signal },
    );
    this.element.addEventListener(
      "pointerup",
      (e) => {
        if (e.button !== 0) return;
        this.send({ kind: "up", ...this.point(e) });
        if (this.element.hasPointerCapture(e.pointerId))
          this.element.releasePointerCapture(e.pointerId);
      },
      { signal },
    );
    this.element.addEventListener(
      "pointerleave",
      () => this.send({ kind: "leave" }),
      { signal },
    );
    this.element.addEventListener(
      "pointercancel",
      () => this.send({ kind: "cancel" }),
      { signal },
    );
    this.element.addEventListener(
      "lostpointercapture",
      () => this.send({ kind: "cancel" }),
      { signal },
    );
    this.element.addEventListener(
      "wheel",
      (e) => {
        const r = this.element.getBoundingClientRect();
        if (
          this.state?.maxScroll > 0 &&
          e.clientX - r.left < this.state.pane.width
        ) {
          e.preventDefault();
          this.send({
            kind: "wheel",
            delta:
              e.deltaY *
              (e.deltaMode === 1
                ? 16
                : e.deltaMode === 2
                  ? this.element.clientHeight
                  : 1),
          });
        } else if (
          this.state?.maxContentScroll > 0 &&
          e.clientX - r.left >= this.state.content.x
        ) {
          e.preventDefault();
          this.send({
            kind: "contentWheel",
            delta:
              e.deltaY *
              (e.deltaMode === 1
                ? 16
                : e.deltaMode === 2
                  ? this.element.clientHeight
                  : 1),
          });
        }
      },
      { signal, passive: false },
    );
    this.element.addEventListener(
      "keydown",
      (e) => {
        if (
          [
            "ArrowUp",
            "ArrowDown",
            "ArrowLeft",
            "ArrowRight",
            "Home",
            "End",
            "Enter",
            " ",
            "Escape",
          ].includes(e.key)
        ) {
          e.preventDefault();
          this.send({ kind: "key", key: e.key });
          this.draw();
          const focused = this.state.focusedId;
          if (focused)
            this.buttons.get(focused)?.focus({ preventScroll: true });
        }
      },
      { signal },
    );
    this.element.addEventListener(
      "focusout",
      (e) => {
        if (!this.element.contains(e.relatedTarget as Node | null))
          this.send({ kind: "blur" });
      },
      { signal },
    );
    this.viewport = new SurfaceMetrics(this.element, () => this.resize(), signal);
    this.resize();
    this.draw();
  }
  private assertAlive(): void {
    if (this.disposed)
      throw new Error(`NavigationView ${this.handle} is disposed`);
  }
  private point(e: PointerEvent): { x: number; y: number } {
    const r = this.element.getBoundingClientRect();
    return { x: (e.clientX-r.left)*this.viewport.width/Math.max(1,r.width), y: (e.clientY-r.top)*this.viewport.height/Math.max(1,r.height) };
  }
  private resize(): void {
    if (!this.disposed)
      this.send({
        kind: "resize",
        width: this.viewport.width,
        height: this.viewport.height,
      });
  }
  private send(input: object): void {
    if (this.disposed) return;
    this.raw.input(this.handle, JSON.stringify(input), this.clock());
    this.schedule();
  }
  private schedule(): void {
    if (!this.frameId && !this.disposed)
      this.frameId = requestAnimationFrame(() => {
        this.frameId = 0;
        this.draw();
      });
  }
  private draw(): void {
    if (this.disposed) return;
    const start = performance.now();
    this.state = JSON.parse(
      this.raw.frame(
        this.handle,
        this.clock(),
        this.viewport.dpr,
      ),
    ) as NavigationSnapshot;
    this.viewport.present(this.canvas);
    this.project(this.state);
    for (const listener of this.snapshotListeners) {
      try { listener(this.snapshot); } catch (error) { reportError(error); }
    }
    this.stats.frames++;
    this.stats.totalMs += performance.now() - start;
    this.stats.maxMs = Math.max(this.stats.maxMs, performance.now() - start);
    if (this.state.animating) this.schedule();
    clearTimeout(this.wakeTimer);
    if(!this.state.animating&&this.state.nextFrameAt!=null)this.wakeTimer=setTimeout(()=>this.schedule(),Math.max(1,this.state.nextFrameAt-this.clock()));
    this.dispatch(this.state.events);
  }
  private project(snapshot: NavigationSnapshot): void {
    const ids = new Set<string>();
    for (const part of snapshot.parts) {
      if (part.kind !== ItemKind.Item || part.id.startsWith("$expand:"))
        continue;
      ids.add(part.id);
      let b = this.buttons.get(part.id);
      if (!b) {
        b = document.createElement("button");
        b.type = "button";
        b.dataset.itemId = part.id;
        b.style.cssText =
          "position:absolute;opacity:0;margin:0;padding:0;border:0;cursor:default;";
        b.addEventListener(
          "focus",
          () => this.send({ kind: "focus", id: part.id }),
          { signal: this.abort.signal },
        );
        // detail=0 covers assistive-technology activation. Keyboard activation is handled above.
        b.addEventListener(
          "click",
          (e) => {
            if (e.detail === 0) this.send({ kind: "invoke", id: part.id });
          },
          { signal: this.abort.signal },
        );
        this.accessibility.append(b);
        this.buttons.set(part.id, b);
      }
      b.textContent = part.text;
      b.setAttribute(
        "aria-label",
        part.id === "$toggle"
          ? snapshot.isPaneOpen
            ? "Close navigation"
            : "Open navigation"
          : part.text,
      );
      b.disabled = !part.enabled;
      if (part.selected) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
      if (part.expanded !== null)
        b.setAttribute("aria-expanded", String(part.expanded));
      else b.removeAttribute("aria-expanded");
      if (part.id === "$toggle")
        b.setAttribute("aria-expanded", String(snapshot.isPaneOpen));
      const r = part.rect;
      b.style.left = `${r.x}px`;
      b.style.top = `${r.y}px`;
      b.style.width = `${r.width}px`;
      b.style.height = `${r.height}px`;
      const c = part.clip;
      b.style.clipPath = c
        ? `inset(${Math.max(0, c.y - r.y)}px ${Math.max(0, r.x + r.width - c.x - c.width)}px ${Math.max(0, r.y + r.height - c.y - c.height)}px ${Math.max(0, c.x - r.x)}px)`
        : "none";
      b.title =
        snapshot.displayMode !== "Expanded" && !snapshot.isPaneOpen
          ? part.text
          : "";
    }
    for (const [id, b] of this.buttons)
      if (!ids.has(id)) {
        b.remove();
        this.buttons.delete(id);
      }
    this.accessibility.dataset.displayMode = snapshot.displayMode;
    projectNavigationScrollbars(this.accessibility,snapshot.scrollbars??[],(content,key)=>this.send({kind:'scrollKey',content,key}),this.abort.signal);
  }
  private dispatch(events: NavigationSnapshot["events"]): void {
    if (this.dispatching) return;
    this.dispatching = true;
    try {
      for (const rawEvent of events) {
        if (this.disposed) break;
        const event: NavigationEvent = { ...rawEvent, cancel: false };
        for (const listener of [...(this.listeners.get(event.kind) ?? [])]) {
          if (this.disposed) break;
          try {
            listener(event);
          } catch (error) {
            reportError(error);
          }
        }
        if (!this.disposed && event.kind === EventKind.PaneClosing)
          this.send({
            kind: "resolveClosing",
            request: event.requestId,
            cancel: event.cancel,
          });
      }
    } finally {
      this.dispatching = false;
      const jobs = this.jobs.splice(0);
      if (!this.disposed && jobs.length) {
        for (const job of jobs) job();
        this.schedule();
      }
    }
  }
  /** Unsubscribe is idempotent. Only paneClosing accepts synchronous event.cancel. */
  on(kind: EventKind, listener: Listener): () => void {
    this.assertAlive();
    const set = this.listeners.get(kind) ?? new Set<Listener>();
    this.listeners.set(kind, set);
    set.add(listener);
    return () => set.delete(listener);
  }
  update(patch: NavigationViewOptions): void {
    this.batch([patch]);
  }
  batch(patches: readonly NavigationViewOptions[]): void {
    this.assertAlive();
    const json = JSON.stringify(patches);
    const job = () => {
      this.raw.update(this.handle, json, this.clock());
      this.schedule();
    };
    if (this.dispatching) this.jobs.push(job);
    else job();
  }
  invoke(id: string): void {
    this.assertAlive();
    this.send({ kind: "invoke", id });
  }
  /** Expand/collapse a branch without invoking it or changing selection. */
  setExpanded(id: string, expanded: boolean): void {
    this.assertAlive();
    this.send({ kind: "expand", id, expanded });
  }
  /** Observe Rust's arranged geometry for a DOM content host. Emits the current
   * snapshot immediately, then after each rendered frame. Returns an unsubscribe. */
  onSnapshot(listener: (snapshot: Readonly<NavigationSnapshot>) => void): () => void {
    this.assertAlive();
    this.snapshotListeners.add(listener);
    listener(this.snapshot);
    return () => this.snapshotListeners.delete(listener);
  }
  get snapshot(): Readonly<NavigationSnapshot> {
    this.assertAlive();
    return structuredClone(this.state);
  }
  /** Read a detached copy of the current Rust properties; mutate through update/batch. */
  get properties(): Readonly<NavigationViewOptions> {
    this.assertAlive();
    return JSON.parse(this.raw.properties(this.handle));
  }
  get diagnostics(): {
    frames: number;
    averageFrameMs: number;
    maxFrameMs: number;
  } {
    this.assertAlive();
    return {
      frames: this.stats.frames,
      averageFrameMs: this.stats.totalMs / Math.max(1, this.stats.frames),
      maxFrameMs: this.stats.maxMs,
    };
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.wakeTimer);
    this.viewport.dispose();
    this.abort.abort();
    this.jobs.length = 0;
    this.listeners.clear();
    this.snapshotListeners.clear();
    this.buttons.clear();
    this.raw.destroy(this.handle);
    this.element.remove();
    this.released();
  }
}
