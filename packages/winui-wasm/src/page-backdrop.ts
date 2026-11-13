import type { Rect } from './sdk';

/** Browser content adapter: capture page pixels, never implement a material.
 * Rust owns blur, tint, noise, clipping, transitions and transparency policy. */
export class PageBackdrop {
  private region: { client: Rect; local: Rect; scale: number } | null = null;
  private observer?: MutationObserver;
  private timer?: ReturnType<typeof setTimeout>;
  private pending = false;
  private dirty = false;
  private generation = 0;
  private key = '';
  private lastCapture = 0;
  private canvas?: HTMLCanvasElement;
  constructor(private host: HTMLElement, private commit: (canvas: HTMLCanvasElement | null, bounds: Rect) => void) {}

  sync(client: Rect | null, local: Rect, scale: number, revision: number) {
    if (!client) { this.stop(); return; }
    this.region = { client, local, scale };
    const key = JSON.stringify([client, local, scale, revision]);
    if (key !== this.key) { this.key = key; this.invalidate(); }
    if (!this.observer) {
      this.observer = new MutationObserver(records => {
        const ignored = (node: Node) => {
          const el = node instanceof Element ? node : node.parentElement;
          return !!el && (this.host.contains(el) || !!el.closest('[data-winui-floating],.html2canvas-container'));
        };
        if (records.some(r => !ignored(r.target) &&
          (r.type !== 'childList' || [...r.addedNodes, ...r.removedNodes].some(n => !ignored(n))))) this.invalidate();
      });
      this.observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
      document.addEventListener('scroll', this.invalidate, true);
      window.addEventListener('resize', this.invalidate);
    }
  }

  private invalidate = () => {
    this.dirty = true;
    if (!this.region || this.pending || this.timer) return;
    this.timer = setTimeout(() => { this.timer = undefined; void this.capture(); }, Math.max(0, 250 - (performance.now() - this.lastCapture)));
  };

  private async capture() {
    if (!this.region || this.pending) return;
    const { client, local, scale } = this.region;
    const generation = this.generation;
    this.pending = true; this.dirty = false;
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(document.documentElement, {
        x: client.x + scrollX, y: client.y + scrollY,
        width: client.width, height: client.height, scale,
        backgroundColor: null, logging: false, useCORS: true, imageTimeout: 2000,
        ignoreElements: el => el.matches('[data-winui-floating],.html2canvas-container,iframe'),
      });
      // Reading also verifies that the source is safe for Rust's pixel sampler.
      try { canvas.getContext('2d')!.getImageData(0, 0, 1, 1); }
      catch (error) { canvas.width = canvas.height = 0; throw error; }
      if (generation === this.generation && this.region) {
        this.commit(canvas, local);
        this.releaseCanvas();
        this.canvas = canvas;
        this.host.dataset.winuiPageBackdrop = 'ready';
      } else {
        canvas.width = canvas.height = 0;
      }
    } catch (error) {
      if (generation === this.generation) {
        this.host.dataset.winuiPageBackdrop = 'unavailable';
        this.commit(null, local);
        this.releaseCanvas();
        console.warn('WinUI page backdrop capture unavailable', error);
      }
    } finally {
      this.pending = false; this.lastCapture = performance.now();
      if (this.dirty && this.region) this.invalidate();
    }
  }

  stop() {
    if (!this.region) return;
    this.region = null; this.key = ''; this.generation++;
    this.observer?.disconnect(); this.observer = undefined;
    document.removeEventListener('scroll', this.invalidate, true);
    window.removeEventListener('resize', this.invalidate);
    clearTimeout(this.timer); this.timer = undefined;
    delete this.host.dataset.winuiPageBackdrop;
    this.commit(null, { x: 0, y: 0, width: 0, height: 0 });
    this.releaseCanvas();
  }
  private releaseCanvas() {
    if (this.canvas) this.canvas.width = this.canvas.height = 0;
    this.canvas = undefined;
  }
}
