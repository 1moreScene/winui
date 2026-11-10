import {
  Scene,
  type ScrollViewer,
  type Panel,
  type HostScrollMetrics,
  type ViewChange,
} from "./scene";
import { WinUiRuntime } from "./wasm/winui";
import {
  ThemeMode,
  HorizontalAlignment,
  VerticalAlignment,
  ScrollBarVisibility,
} from "./enums";

export interface GlobalScrollbarDiagnostics {
  managed: number;
  visible: number;
  leases: number;
  scans: number;
  updates: number;
  skipped: number;
  material: "fallback";
}
/** Lease for application-owned DOM scroll surfaces. dispose restores native chrome
 * when the last lease covering a surface is released; content is never reparented. */
export interface GlobalScrollbars {
  refresh(): void;
  /** Change a managed DOM surface through the shared Rust ScrollViewer animation. */
  changeView(element: HTMLElement, view: ViewChange): void;
  readonly diagnostics: Readonly<GlobalScrollbarDiagnostics>;
  dispose(): void;
}
type Scope = Document | HTMLElement;
type Binding = {
  element: HTMLElement;
  clip: Panel;
  view: ScrollViewer;
  off: () => void;
  abort: AbortController;
  id: string;
  originalId: string;
  last: string;
  expected: [number, number] | null;
  native: [number, number];
  scale: [number, number];
  reverse: [boolean, boolean];
};
const managers = new WeakMap<Document, Scrollbars>();
let nextId = 0;
const marker = "data-winui-scroll-host";
const wheelX = "data-winui-wheel-contained-x";
const wheelY = "data-winui-wheel-contained-y";
const hostStyle = `[${marker}]{scrollbar-width:none!important}[${marker}]::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}[${wheelX}]{overscroll-behavior-x:contain!important}[${wheelY}]{overscroll-behavior-y:contain!important}`;
/** Axis-aligned inset clips, including the Rust Expander's projected clip. */
function insetClip(value:string,width:number,height:number):[number,number,number,number]|null {
  const match=/^inset\(([^()]*)\)$/.exec(value);if(!match)return null;
  const parts=match[1].trim().split(/\s+/);if(parts.length<1||parts.length>4||parts.some(part=>!/^[-+.\d]+(?:px|%)$/.test(part)&&part!=='0'))return null;
  const [t,r=t,b=t,l=r]=parts;
  const px=(v:string,extent:number)=>parseFloat(v)*(v.endsWith('%')?extent/100:1);
  return [px(t,height),px(r,width),px(b,height),px(l,width)];
}
function composedContains(a: Element, b: Element) {
  for (let p: Element | null = b; p; p = parentOf(p)) if (p === a) return true;
  return false;
}

function parentOf(e: Element): HTMLElement | null {
  return (
    e.parentElement ??
    ((e.getRootNode() as ShadowRoot).host as HTMLElement | undefined) ??
    null
  );
}

export function acquireGlobalScrollbars(
  scope: Scope,
  onDispose: () => void = () => {},
): GlobalScrollbars {
  const doc = scope.nodeType === 9 ? (scope as Document) : scope.ownerDocument!;
  let manager = managers.get(doc);
  if (!manager) {
    manager = new Scrollbars(doc, () => managers.delete(doc));
    managers.set(doc, manager);
  }
  const release = manager.acquire(scope);
  let disposed = false;
  return {
    refresh: () => {
      if (!disposed) manager.refresh();
    },
    changeView: (element, view) => {
      if (disposed) throw new Error("Global scrollbars lease is disposed");
      manager.changeView(element, view);
    },
    get diagnostics() {
      return manager.diagnostics;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      release();
      onDispose();
    },
  };
}
class Scrollbars {
  private raw = new WinUiRuntime();
  private scene: Scene;
  private layer: HTMLDivElement;
  private style: HTMLStyleElement;
  private abort = new AbortController();
  private scopes = new Map<Scope, number>();
  private bindings = new Map<HTMLElement, Binding>();
  private resize: ResizeObserver;
  private observers = new Map<Document | ShadowRoot, MutationObserver>();
  private shadowStyles = new Map<ShadowRoot, HTMLStyleElement>();
  private frame = 0;
  private scanNeeded = true;
  private disposed = false;
  private counts = { scans: 0, updates: 0, visible: 0, skipped: 0 };
  private observed = new Set<Element>();
  private potentialHosts=new Set<HTMLElement>();
  private frameStyles=new WeakMap<Element,string>();
  private moving = new Set<Element>();
  private theme = "";
  private restoreShadowHook: () => void = () => {};
  constructor(
    private doc: Document,
    private done: () => void,
  ) {
    this.layer = doc.createElement("div");
    this.layer.dataset.winuiGlobalScrollbars = "";
    this.layer.style.cssText =
      "position:fixed;inset:0;z-index:2147483000;pointer-events:none;contain:strict;";
    doc.documentElement.append(this.layer);
    this.style = doc.createElement("style");
    this.style.textContent = hostStyle;
    doc.head.append(this.style);
    this.scene = new Scene(
      this.raw,
      this.layer,
      { root: { background: "#00000000" }, reducedTransparency: true },
      () => performance.now(),
      () => {},
    );
    this.resize = new ResizeObserver(() => {
      // Known scroll hosts only need new geometry. Discovery is needed when a
      // previously nonoverflowing candidate first acquires an extent.
      if([...this.potentialHosts].some(e=>!this.bindings.has(e)&&e.isConnected&&(e.scrollWidth>e.clientWidth||e.scrollHeight>e.clientHeight)))this.scanNeeded=true;
      this.schedule();
    });
    this.observeRoot(doc);
    const signal = this.abort.signal,
      win = doc.defaultView!;
    const proto = (win as Window & typeof globalThis).Element.prototype;
    const original = proto.attachShadow,
      self = this;
    const hook = function (this: Element, init: ShadowRootInit) {
      const root = original.call(this, init);
      if (init.mode === "open") {
        self.observeRoot(root);
        self.refresh();
      }
      return root;
    };
    proto.attachShadow = hook;
    this.restoreShadowHook = () => {
      if (proto.attachShadow === hook) proto.attachShadow = original;
    };

    doc.addEventListener("scroll", (e) => this.nativeScroll(e), {
      capture: true,
      passive: true,
      signal,
    });
    doc.addEventListener(
      "pointermove",
      (e) => {
        if (this.layer.contains(e.target as Node)) return;
        this.scene.hostPointer(e.clientX, e.clientY);
      },
      { passive: true, signal },
    );
    doc.addEventListener("pointerleave", () => this.scene.hostPointer(), {
      signal,
    });
    win.addEventListener("resize", () => this.refresh(), { signal });
    win.visualViewport?.addEventListener("resize", () => this.refresh(), {
      signal,
    });
    for (const query of [
      "(prefers-color-scheme: dark)",
      "(forced-colors: active)",
    ])
      win
        .matchMedia(query)
        .addEventListener("change", () => this.refresh(), { signal });
    doc.addEventListener("load", () => this.refresh(), {
      capture: true,
      signal,
    });
    doc.addEventListener("toggle", () => this.refresh(), {
      capture: true,
      signal,
    });
    for (const type of ["transitionrun", "animationstart"])
      doc.addEventListener(
        type,
        (event) => {
          const target = event.target;
          if (
            target instanceof Element &&
            [...this.bindings.keys()].some((e) => target.contains(e))
          ) {
            this.moving.add(target);
            this.schedule();
          }
        },
        { capture: true, signal },
      );
    for (const type of ["transitioncancel", "animationcancel"])
      doc.addEventListener(type, () => this.schedule(), {
        capture: true,
        signal,
      });
    doc.addEventListener("transitionend", () => this.refresh(), {
      capture: true,
      signal,
    });
    doc.addEventListener("animationend", () => this.refresh(), {
      capture: true,
      signal,
    });
    doc.fonts?.addEventListener("loadingdone", () => this.refresh(), {
      signal,
    });
  }
  get diagnostics(): GlobalScrollbarDiagnostics {
    return {
      managed: this.bindings.size,
      visible: this.counts.visible,
      leases: [...this.scopes.values()].reduce((a, b) => a + b, 0),
      scans: this.counts.scans,
      updates: this.counts.updates,
      skipped: this.counts.skipped,
      material: "fallback",
    };
  }

  acquire(scope: Scope) {
    this.scopes.set(scope, (this.scopes.get(scope) ?? 0) + 1);
    this.scanNeeded=false;
    this.scan();
    this.schedule();
    return () => {
      const n = this.scopes.get(scope) ?? 0;
      if (n > 1) this.scopes.set(scope, n - 1);
      else this.scopes.delete(scope);
      if (this.scopes.size) this.refresh();
      else this.dispose();
    };
  }
  refresh() {
    if (this.disposed) return;
    this.scanNeeded = true;
    this.schedule();
  }
  changeView(element: HTMLElement, view: ViewChange) {
    if (!this.bindings.has(element)) this.scan();
    const binding = this.bindings.get(element);
    if (!binding) throw new Error("Element is not a managed scroll surface");
    binding.last = "";
    this.update();
    binding.view.changeView(view);
  }
  private schedule() {
    if (!this.frame && !this.disposed)
      this.frame = requestAnimationFrame(() => {
        this.frame = 0;
        this.update();
      });
  }
  private own(node: Node | null) {
    const element =
      node?.nodeType === 1 ? (node as Element) : node?.parentElement;
    return (
      !!element &&
      (this.layer.contains(element) ||
        element === this.style ||
        element.hasAttribute("data-winui-scrollbar-style") ||
        (()=>{const surface=element.closest('.winui-surface'),content=element.closest('[data-winui-content-host]');return !!surface&&(!content||!surface.contains(content));})())
    );
  }
  private frameStyleKey(css:CSSStyleDeclaration){
    const matrix=/^matrix\(([^)]+)\)$/.exec(css.transform);
    const axes=css.transform==='none'?'1,0,0,1':matrix?matrix[1].split(',').slice(0,4).map(Number).join(','):css.transform;
    return [css.display,css.visibility,css.overflowX,css.overflowY,css.clipPath,css.position,axes].join('|');
  }
  private observeRoot(root: Document | ShadowRoot) {
    if (this.observers.has(root)) {
      const style = this.shadowStyles.get(root as ShadowRoot);
      if (style && style.parentNode !== root) root.appendChild(style);
      return;
    }
    if (root.nodeType !== 9) {
      const shadow = root as ShadowRoot;
      const style = this.style.cloneNode(true) as HTMLStyleElement;
      style.dataset.winuiScrollbarStyle = "";
      this.shadowStyles.set(shadow, style);
      shadow.append(style);
      shadow.addEventListener("scroll", (e) => this.nativeScroll(e), {
        capture: true,
        passive: true,
        signal: this.abort.signal,
      });
    }
    const observer = new MutationObserver((records) => {
      // The Frame adapter owns these style updates. Motion changes positions,
      // not scrollbar membership. Visibility changes still emit hidden/inert
      // records, and new page subtrees still emit childList records below.
      const frameMotion=(record:MutationRecord)=>{
        if(record.type!=='attributes'||record.attributeName!=='style'||!(record.target instanceof Element)||!record.target.matches('[data-winui-frame], [data-winui-frame] > [data-frame-instance]'))return false;
        const key=this.frameStyleKey(getComputedStyle(record.target)),previous=this.frameStyles.get(record.target);
        this.frameStyles.set(record.target,key);return previous===key;
      };
      const motionRecords=new Set(records.filter(frameMotion));
      if(motionRecords.size)this.schedule();
      // Rust animations move a hosted DOM subtree without a browser scroll or
      // CSS animation event. Track those projected ancestor clips/transforms.
      if(records.some(record=>record.type==='attributes'&&record.attributeName==='style'
        &&record.target instanceof Element&&!!record.target.closest('.winui-surface')
        &&!!record.target.querySelector('[data-winui-content-host]')))this.schedule();
      if (
        records.some(
          (r) =>
            !motionRecords.has(r) && !this.own(r.target) &&
            !(
              r.type === "attributes" &&
              (r.attributeName === marker || r.attributeName === wheelX || r.attributeName === wheelY || r.attributeName === "id")
            ),
        )
      ) {
        // MutationObserver runs before paint, including commits made inside rAF.
        // Deferring discovery to another rAF exposed native chrome for one frame.
        this.scanNeeded=false;
        this.scan();
        this.schedule();
      }
    });
    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [
        "class",
        "style",
        "hidden",
        "open",
        "dir",
        "data-theme",
        "inert",
        "data-winui-scrollbars",
      ],
    });
    this.observers.set(root, observer);
  }
  private candidates() {
    const elements = new Set<HTMLElement>();
    for (const scope of this.scopes.keys()) {
      if (scope.nodeType === 9) {
        if (this.doc.scrollingElement)
          elements.add(this.doc.scrollingElement as HTMLElement);
      } else elements.add(scope as HTMLElement);
      const walk = (root: Document | ShadowRoot | HTMLElement) => {
        for (const node of root.querySelectorAll<HTMLElement>("*")) {
          if (this.own(node)) continue;
          elements.add(node);
          if (node.shadowRoot) {
            this.observeRoot(node.shadowRoot);
            walk(node.shadowRoot);
          }
        }
      };
      if (scope.nodeType !== 9 && (scope as HTMLElement).shadowRoot) {
        const shadow = (scope as HTMLElement).shadowRoot!;
        this.observeRoot(shadow);
        walk(shadow);
      }
      walk(scope);
    }
    return elements;
  }
  private scan() {
    this.counts.scans++;
    this.counts.skipped = 0;
    this.potentialHosts.clear();
    const keep = new Set<HTMLElement>(),
      observe = new Set<Element>();
    for (const element of this.candidates()) {
      if (
        element === this.doc.body ||
        this.own(element) ||
        element.matches("input,select,option") ||
        element.closest('[data-winui-scrollbars="native"]')
      )
        continue;
      const css = getComputedStyle(element),
        isRoot = element === this.doc.scrollingElement;
      if(element.matches('[data-winui-frame], [data-winui-frame] > [data-frame-instance]'))this.frameStyles.set(element,this.frameStyleKey(css));
      if (
        css.display === "none" ||
        css.visibility === "hidden"
      )
        continue;
      const axis = (value: string) =>
        value === "auto" || value === "scroll" || value === "overlay";
      if (!isRoot && !axis(css.overflowX) && !axis(css.overflowY)) continue;
      observe.add(element);
      for (const child of element.children) observe.add(child);
      // Closed UA internals, cross-origin documents and transformed/nonrectangular
      // surfaces retain their native chrome. The current adapter never hides them.
      let unsupported = false;
      for (let p: Element | null = element; p; p = parentOf(p)) {
        const c = getComputedStyle(p);
        if (
          (c.clipPath !== "none" && !insetClip(c.clipPath,(p as HTMLElement).offsetWidth,(p as HTMLElement).offsetHeight)) ||
          (c.transform !== "none" &&
            (() => {
              const m = new DOMMatrixReadOnly(c.transform);
              return (
                !m.is2D ||
                m.a <= 0 ||
                m.d <= 0 ||
                Math.abs(m.b) > 1e-6 ||
                Math.abs(m.c) > 1e-6
              );
            })())
        ) {
          unsupported = true;
          break;
        }
      }
      if (
        unsupported ||
        element.scrollWidth > 10_000_000 ||
        element.scrollHeight > 10_000_000 ||
        element.closest("dialog[open],:popover-open")
      ) {
        this.counts.skipped++;
        continue;
      }
      this.potentialHosts.add(element);
      if (
        element.scrollWidth <= element.clientWidth &&
        element.scrollHeight <= element.clientHeight &&
        !this.bindings.has(element)
      )
        continue;
      keep.add(element);
      if (!this.bindings.has(element)) this.bind(element);
    }
    for (const [element, binding] of this.bindings)
      if (!keep.has(element)) this.unbind(binding);
    for (const element of this.observed)
      if (!observe.has(element)) this.resize.unobserve(element);
    for (const element of observe)
      if (!this.observed.has(element)) this.resize.observe(element);
    this.observed = observe;
    for (const [root, observer] of this.observers)
      if (root.nodeType !== 9 && !(root as ShadowRoot).host.isConnected) {
        observer.disconnect();
        this.observers.delete(root);
        this.shadowStyles.get(root as ShadowRoot)?.remove();
        this.shadowStyles.delete(root as ShadowRoot);
      }
  }
  private bind(element: HTMLElement) {
    if (this.bindings.size >= 1500) {
      this.counts.skipped++;
      return;
    }
    const clip = this.scene.root.grid({
      width: 0,
      height: 0,
      clip: true,
      horizontalAlignment: HorizontalAlignment.Left,
      verticalAlignment: VerticalAlignment.Top,
    });
    const view = clip.scrollViewer({
      width: 0,
      height: 0,
      horizontalAlignment: HorizontalAlignment.Left,
      verticalAlignment: VerticalAlignment.Top,
    });
    const originalId = element.id,
      id = originalId || `winui-dom-scroll-${++nextId}`;
    if (!originalId) element.id = id;
    const binding: Binding = {
      element,
      clip,
      view,
      id,
      originalId,
      off: () => {},
      abort: new AbortController(),
      last: "",
      expected: null,
      native: [element.scrollLeft, element.scrollTop],
      scale: [1, 1],
      reverse: [false, false],
    };
    binding.off = view.onViewChanged((e) => {
      if (!e.view || this.disposed) return;
      this.write(binding, e.view.horizontalOffset, e.view.verticalOffset);
    });
    this.bindings.set(element, binding);
    element.setAttribute(marker, "");
    element.addEventListener("wheel", event => {
      if (event.defaultPrevented || event.ctrlKey || element.closest('[inert]')) return;
      const view = binding.view.view;
      const hidden = element.getAttribute("data-winui-scrollbars") === "hidden";
      // Native DOM handles regular scrolling/touch/selection. Horizontal-only
      // surfaces need WinUI's vertical-wheel routing; hidden surfaces still use
      // the same Rust viewer with Hidden chrome rather than opting out of it.
      if (!hidden && !(event.deltaX === 0 && view.horizontalWheelContained && !view.verticalWheelContained)) return;
      if (this.scene.hostWheel(event)) event.preventDefault();
    }, { passive: false, signal: binding.abort.signal });
    element.addEventListener(
      "focusin",
      () => this.scene.hostPointer(...this.center(binding)),
      { signal: binding.abort.signal },
    );
  }
  private center(b: Binding): [number, number] {
    const r = b.element.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  }
  private normalized(b: Binding): [number, number] {
    const e = b.element;
    return [
      (b.reverse[0] ? e.scrollWidth - e.clientWidth : 0) + e.scrollLeft,
      (b.reverse[1] ? e.scrollHeight - e.clientHeight : 0) + e.scrollTop,
    ];
  }
  private write(b: Binding, x: number, y: number) {
    const e = b.element;
    if (!e.isConnected) return;
    if (
      Math.abs(e.scrollLeft - b.native[0]) > 0.5 ||
      Math.abs(e.scrollTop - b.native[1]) > 0.5
    ) {
      b.last = "";
      this.schedule();
      return;
    }
    const left =
        x / b.scale[0] - (b.reverse[0] ? e.scrollWidth - e.clientWidth : 0),
      top =
        y / b.scale[1] - (b.reverse[1] ? e.scrollHeight - e.clientHeight : 0);
    if (
      Math.abs(e.scrollLeft - left) < 0.05 &&
      Math.abs(e.scrollTop - top) < 0.05
    )
      return;
    b.expected = [left, top];
    e.scrollTo({ left, top, behavior: "instant" });
    b.native = [e.scrollLeft, e.scrollTop];
  }
  private nativeScroll(event: Event) {
    const target =
      event.target === this.doc ? this.doc.scrollingElement : event.target;
    const b = this.bindings.get(target as HTMLElement);
    if (b) {
      const expected = b.expected;
      b.expected = null;
      if (
        !expected ||
        Math.abs(b.element.scrollLeft - expected[0]) > 0.5 ||
        Math.abs(b.element.scrollTop - expected[1]) > 0.5
      ) {
        b.last = "";
        this.schedule();
      }
    }
    this.schedule();
  }
  private update() {
    if (this.disposed) return;
    if (this.scanNeeded) {
      this.scanNeeded = false;
      this.scan();
    }
    this.counts.updates++;
    this.counts.visible = 0;
    const win = this.doc.defaultView!,
      root = this.doc.documentElement;
    const theme =
      root.dataset.theme ??
      (win.matchMedia("(forced-colors: active)").matches
        ? "HighContrast"
        : win.matchMedia("(prefers-color-scheme: dark)").matches
          ? "Dark"
          : "Light");
    if (theme !== this.theme) {
      this.theme = theme;
      this.scene.configure({
        theme:
          theme === "Dark"
            ? ThemeMode.Dark
            : theme === "HighContrast"
              ? ThemeMode.HighContrast
              : ThemeMode.Light,
      });
    }
    for (const b of this.bindings.values()) {
      const e = b.element,
        css = getComputedStyle(e),
        isRoot = e === this.doc.scrollingElement,
        r = e.getBoundingClientRect();
      const sx = isRoot ? 1 : r.width / (e.offsetWidth || 1),
        sy = isRoot ? 1 : r.height / (e.offsetHeight || 1);
      b.scale = [sx, sy];
      b.reverse = [
        css.direction === "rtl",
        css.display.includes("flex") && css.flexDirection === "column-reverse",
      ];
      let x = isRoot ? 0 : r.left + e.clientLeft * sx,
        y = isRoot ? 0 : r.top + e.clientTop * sy,
        w = isRoot ? root.clientWidth : e.clientWidth * sx,
        h = isRoot ? root.clientHeight : e.clientHeight * sy;
      let left = Math.max(0, x),
        top = Math.max(0, y),
        right = Math.min(win.innerWidth, x + w),
        bottom = Math.min(win.innerHeight, y + h);
      for (
        let parent = parentOf(e);
        parent && parent !== this.doc.body;
        parent = parentOf(parent)
      ) {
        const c = getComputedStyle(parent),
          p = parent.getBoundingClientRect();
        if(c.clipPath!=='none') {
          const clip=insetClip(c.clipPath,p.width,p.height);
          if(clip){top=Math.max(top,p.top+clip[0]);right=Math.min(right,p.right-clip[1]);bottom=Math.min(bottom,p.bottom-clip[2]);left=Math.max(left,p.left+clip[3]);}
        }
        if (c.overflowX !== "visible") {
          left = Math.max(left, p.left + parent.clientLeft);
          right = Math.min(
            right,
            p.left + parent.clientLeft + parent.clientWidth,
          );
        }
        if (c.overflowY !== "visible") {
          top = Math.max(top, p.top + parent.clientTop);
          bottom = Math.min(
            bottom,
            p.top + parent.clientTop + parent.clientHeight,
          );
        }
      }
      const visible = w > 0 && h > 0 && right > left && bottom > top;
      let opacity=1;
      for(let ancestor:HTMLElement|null=e;ancestor;ancestor=parentOf(ancestor)){
        const style=getComputedStyle(ancestor);
        opacity*=Number(style.opacity);
        if(style.display==='none'||style.visibility==='hidden')opacity=0;
      }
      const enabled=!e.closest('[inert]');
      if (visible) this.counts.visible++;
      const offset = this.normalized(b),
        metrics: HostScrollMetrics = {
          viewportWidth: w,
          viewportHeight: h,
          extentWidth: e.scrollWidth * sx,
          extentHeight: e.scrollHeight * sy,
          horizontalOffset: Math.max(0, offset[0] * sx),
          verticalOffset: Math.max(0, offset[1] * sy),
        };
      const occlusions: {
        x: number;
        y: number;
        width: number;
        height: number;
      }[] = [];
      if (!isRoot && visible) {
        for (const vertical of [true, false]) {
          const cross = vertical ? x + w - 7 : y + h - 7;
          const from = vertical ? Math.max(y, top) : Math.max(x, left),
            to = vertical ? Math.min(y + h, bottom) : Math.min(x + w, right);
          for (const f of [0.01, 0.25, 0.5, 0.75, 0.99]) {
            const along = from + (to - from) * f;
            const hit = this.doc
              .elementsFromPoint(
                vertical ? cross : along,
                vertical ? along : cross,
              )
              .find((n) => !this.layer.contains(n));
            if (hit && !composedContains(e, hit) && !composedContains(hit, e)) {
              const c = hit.getBoundingClientRect();
              const l = Math.max(x, c.left),
                t = Math.max(y, c.top),
                r = Math.min(x + w, c.right),
                b = Math.min(y + h, c.bottom);
              if (
                r > l &&
                b > t &&
                !occlusions.some(
                  (o) =>
                    o.x === l - x &&
                    o.y === t - y &&
                    o.width === r - l &&
                    o.height === b - t,
                )
              )
                occlusions.push({
                  x: l - x,
                  y: t - y,
                  width: r - l,
                  height: b - t,
                });
            }
          }
        }
      }
      metrics.occlusions = occlusions;
      const allowed = (value: string) =>
        value === "auto" || value === "scroll" || value === "overlay";
      const hidden = e.getAttribute("data-winui-scrollbars") === "hidden";
      const state = JSON.stringify([
        left,
        top,
        right,
        bottom,
        x,
        y,
        w,
        h,
        visible,
        opacity,enabled,
        [
          metrics.viewportWidth,
          metrics.viewportHeight,
          metrics.extentWidth,
          metrics.extentHeight,
          metrics.occlusions,
        ],
        css.overflowX,
        css.overflowY,
        hidden,
        theme,
      ]);
      if (state === b.last) continue;
      b.last = state;
      this.scene.batch(() => {
        b.clip.update({
          width: Math.max(0, right - left),
          height: Math.max(0, bottom - top),
          translationX: left,
          translationY: top,
          visible,
          opacity,
        });
        b.view.update({
          enabled,
          width: w,
          height: h,
          translationX: x - left,
          translationY: y - top,
          horizontalScrollBarVisibility:
            isRoot || allowed(css.overflowX)
              ? hidden ? ScrollBarVisibility.Hidden : ScrollBarVisibility.Auto
              : ScrollBarVisibility.Disabled,
          verticalScrollBarVisibility:
            isRoot || allowed(css.overflowY)
              ? hidden ? ScrollBarVisibility.Hidden : ScrollBarVisibility.Auto
              : ScrollBarVisibility.Disabled,
          accessibleName: `${e.getAttribute("aria-label") || e.getAttribute("title") || e.tagName.toLowerCase()} scroll area`,
        });
      });
      b.native = [e.scrollLeft, e.scrollTop];
      const view = b.view.setHostMetrics(metrics, b.id);
      // Keep native wheel/touch/selection handling; Rust decides which axes
      // retain wheel input when their offset reaches an endpoint.
      e.toggleAttribute(wheelX, enabled && view.horizontalWheelContained);
      e.toggleAttribute(wheelY, enabled && view.verticalWheelContained);
    }
    for (const e of this.moving)
      if (
        !e.isConnected ||
        !e.getAnimations().some((a) => a.playState === "running" || a.pending)
      )
        this.moving.delete(e);
    if (this.moving.size) this.schedule();
  }
  private unbind(b: Binding) {
    b.off();
    b.abort.abort();
    b.clip.dispose();
    this.bindings.delete(b.element);
    b.element.removeAttribute(marker);
    b.element.removeAttribute(wheelX);
    b.element.removeAttribute(wheelY);
    if (!b.originalId && b.element.id === b.id) b.element.removeAttribute("id");
  }
  private dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.abort.abort();
    this.restoreShadowHook();
    this.resize.disconnect();
    for (const observer of this.observers.values()) observer.disconnect();
    for (const b of [...this.bindings.values()]) this.unbind(b);
    this.scene.dispose();
    this.raw.free();
    this.layer.remove();
    this.style.remove();
    for (const style of this.shadowStyles.values()) style.remove();
    this.done();
  }
}
