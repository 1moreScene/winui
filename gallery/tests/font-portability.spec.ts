import {test, expect} from '@playwright/test';
import {PNG} from 'pngjs';

// Emulate a platform font API that changes metrics at oversized probe sizes,
// while leaving the actual-size browser rasterization untouched.
for (const dpr of [1, 1.25, 1.5, 2]) {
  test(`oversized font probes cannot move or clip actual-size text at DPR ${dpr}`, async ({browser}, testInfo) => {
    const context = await browser.newContext({deviceScaleFactor: dpr, viewport: {width: 1440, height: 1000}});
    const page = await context.newPage();
    await page.addInitScript(() => {
      const original = CanvasRenderingContext2D.prototype.measureText;
      CanvasRenderingContext2D.prototype.measureText = function(text: string) {
        const metrics = original.call(this, text);
        if (parseFloat(this.font.match(/([\d.]+)px/)?.[1] ?? '0') < 1000) return metrics;
        return new Proxy(metrics, {get(target, property) {
          const value = Reflect.get(target, property, target);
          return typeof value === 'number' ? value * 2 : value;
        }});
      };
      const rect = HTMLElement.prototype.getBoundingClientRect;
      HTMLElement.prototype.getBoundingClientRect = function() {
        const result = rect.call(this);
        if (this.parentElement?.hasAttribute('data-winui-font-metrics') && parseFloat(this.style.fontSize) >= 1000) {
          return new DOMRect(result.x, result.y, result.width, result.height / 2);
        }
        return result;
      };
    });
    try {
      await page.goto('/#expander');
      await page.waitForFunction(() => !!window.gallery?.sdk);
      const results = await page.evaluate(async () => {
        const a = await import('/@id/winui-wasm' as string) as typeof import('winui-wasm');
        const ctx = document.createElement('canvas').getContext('2d')!;
        const rows = [];
        for (const backend of [a.RendererBackend.Canvas2D, a.RendererBackend.WebGL2]) {
          const host = document.createElement('div');
          host.dataset.portabilityBackend = backend;
          host.style.cssText = `position:fixed;left:${backend === a.RendererBackend.Canvas2D ? 0 : 650}px;top:0;z-index:2147483640;width:650px;height:600px;background:white`;
          document.body.append(host);
          const scene = window.gallery.sdk.scene(host, {backend, reducedMotion: true, theme: a.ThemeMode.Light, root: {background: '#ffffff'}});
          const stack = scene.root.grid().stack({spacing: 4});
          const nodes = [];
          for (const size of [12, 14, 20, 32]) {
            for (const family of ['system-ui', '__MissingFont__, Arial, sans-serif']) {
              const text = 'Navigation gyp 中文';
              const font = `400 ${size}px ${family}, Segoe UI, system-ui, sans-serif`;
              ctx.font = font;
              const metrics = ctx.measureText(text);
              nodes.push({node: stack.text({text, fontSize: size, fontFamily: family}),
                ascent: metrics.fontBoundingBoxAscent, descent: metrics.fontBoundingBoxDescent});
            }
            ctx.font = `400 ${size}px "WinUI Native Fluent Icons", "WinUI Native MDL2 Icons", "WinUI Portable Icons"`;
            const iconMetrics = ctx.measureText('\uE713');
            nodes.push({node: stack.fontIcon({glyph: '\uE713', fontSize: size}), ascent: iconMetrics.fontBoundingBoxAscent, descent: iconMetrics.fontBoundingBoxDescent});
          }
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          for (const {node, ascent, descent} of nodes) {
            const {text, desired} = node.snapshot;
            rows.push({backend, baseline: text.lines[0].baseline, height: text.height,
              desired: desired[1], ascent, descent});
          }
        }
        return rows;
      });
      for (const row of results) {
        expect(Math.abs(row.baseline - row.ascent), JSON.stringify(row)).toBeLessThanOrEqual(1);
        expect(row.height, JSON.stringify(row)).toBeGreaterThanOrEqual(row.ascent + row.descent - 1);
        expect(row.desired, JSON.stringify(row)).toBeGreaterThanOrEqual(row.height);
      }
      const images = [];
      for (const backend of ['Canvas2D', 'WebGL2']) {
        const path = testInfo.outputPath(`${backend}.png`);
        images.push(PNG.sync.read(await page.locator(`[data-portability-backend="${backend}"]`).screenshot({path})));
        await testInfo.attach(backend, {path, contentType: 'image/png'});
      }
      const ink = images.map(image => image.data.reduce((sum, value, index) => sum + (index % 4 === 3 ? 0 : 255 - value), 0));
      expect(ink[0]).toBeGreaterThan(100_000 * dpr * dpr);
      expect(Math.abs(ink[0] - ink[1]) / ink[0]).toBeLessThan(0.05);
    } finally {
      await context.close();
    }
  });
}
