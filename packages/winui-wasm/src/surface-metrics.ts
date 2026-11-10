/** Browser surface sizing only; control layout and rasterization remain in Rust. */
export class SurfaceMetrics {
  width: number;
  height: number;
  dpr = Math.min(devicePixelRatio || 1, 8);
  private observer: ResizeObserver;
  private resolution!: MediaQueryList;
  private disposed = false;
  private resolutionChanged = () => {
    if (this.disposed) return;
    this.watchResolution();
    this.invalidate();
  };

  constructor(
    element: HTMLElement,
    private invalidate: () => void,
    signal: AbortSignal,
  ) {
    const style = getComputedStyle(element);
    this.width = Number.parseFloat(style.width) || 0;
    this.height = Number.parseFloat(style.height) || 0;
    this.observer = new ResizeObserver(([entry]) => {
      if (this.disposed) return;
      // clientWidth/clientHeight discard CSS fractions before DPR conversion.
      this.width = entry.contentRect.width;
      this.height = entry.contentRect.height;
      this.watchResolution();
      this.invalidate();
    });
    // Observe physical-size changes too: CSS size can remain identical when a
    // window moves between displays. Older engines retain the media-query path.
    try {
      this.observer.observe(element, { box: "device-pixel-content-box" });
    } catch {
      this.observer.observe(element);
    }
    window.addEventListener("resize", () => {
      if (this.disposed) return;
      this.watchResolution();
      this.invalidate();
    }, { signal });
    this.watchResolution();
  }

  private watchResolution() {
    this.resolution?.removeEventListener("change", this.resolutionChanged);
    this.dpr = Math.min(devicePixelRatio || 1, 8);
    this.resolution = matchMedia(`(resolution: ${devicePixelRatio || 1}dppx)`);
    this.resolution.addEventListener("change", this.resolutionChanged);
  }

  present(canvas: HTMLCanvasElement) {
    // Keep one backing pixel mapped to one display pixel. The enclosing surface
    // clips the <1 physical pixel allocated by ceil(width * DPR).
    const width = `${canvas.width / this.dpr}px`;
    const height = `${canvas.height / this.dpr}px`;
    if (canvas.style.width !== width) canvas.style.width = width;
    if (canvas.style.height !== height) canvas.style.height = height;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.observer.disconnect();
    this.resolution.removeEventListener("change", this.resolutionChanged);
  }
}
