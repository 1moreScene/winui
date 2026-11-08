import {selectGalleryOption} from './gallery-control-helper';
import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import type { WinUI, Scene, SceneNode } from '../src/index';
declare global { interface Window { iconsFixture: { sdk: WinUI; scene: Scene; nodes: SceneNode[] }; } }
for (const backend of ['Canvas2D', 'WebGL2'] as const) test(`${backend} five icon controls match native size and isolated crops`, async ({ page }) => {
  const native = JSON.parse(readFileSync('../references/icons-metrics.json', 'utf8'));
  await page.goto('/#icon-element');
  await expect(page.getByRole('img', { name: 'Slices bitmap icon' })).toBeVisible();
  const results: object[] = [];
  for (const theme of ['Light', 'Dark']) for (const kind of ['FontIcon', 'SymbolIcon', 'PathIcon', 'BitmapIcon', 'ImageIcon']) {
    const rows = native.rows.filter((r: any) => r.theme === theme && r.kind === kind);
    await page.evaluate(async ({ rows, backend, theme }) => {
      window.iconsFixture?.sdk.dispose(); document.getElementById('icons-fixture')?.remove();
      const a = await import('/src/index.ts' as string) as typeof import('../src/index');
      const sdk = await a.WinUI.create({ globalScrollbars: false });
      const host = document.createElement('div'); host.id = 'icons-fixture'; host.style.cssText = 'position:fixed;inset:0;width:1000px;height:500px;z-index:99999'; document.body.append(host);
      const scene = sdk.scene(host, { theme: a.ThemeMode[theme as keyof typeof a.ThemeMode], backend: a.RendererBackend[backend], reducedMotion: true });
      const canvas = scene.root.canvas();
      const nodes = rows.map((r: any) => {
        const p = { ...r.props, canvasLeft: r.bounds.x, canvasTop: r.bounds.y, foreground: '#0067c0' };
        switch (r.kind) {
          case 'FontIcon': return canvas.fontIcon(p);
          case 'SymbolIcon': return canvas.symbolIcon(p);
          case 'PathIcon': return canvas.pathIcon(p);
          case 'BitmapIcon': return canvas.bitmapIcon(p);
          default: return canvas.imageIcon(p);
        }
      });
      window.iconsFixture = { sdk, scene, nodes };
    }, { rows, backend, theme });
    await expect.poll(() => page.evaluate(() => window.iconsFixture.scene.snapshot.nodes.filter(n => n.kind.endsWith('Icon')).map(n => [n.rect.width, n.rect.height]))).toEqual(rows.map((r: any) => [r.bounds.width, r.bounds.height]));
    const actual = PNG.sync.read(await page.locator('#icons-fixture').screenshot());
    const reference = PNG.sync.read(readFileSync(`../out/icons-native/${theme}-${kind}.png`));
    for (const row of rows) {
      let sum = 0, count = 0; const r = row.bounds;
      for (let y = r.y; y < r.y + r.height; y++) for (let x = r.x; x < r.x + r.width; x++) for (let c = 0; c < 3; c++) {
        sum += Math.abs(actual.data[(y * actual.width + x) * 4 + c] - reference.data[(y * reference.width + x) * 4 + c]); count++;
      }
      const mean = sum / count; results.push({ theme, kind, index: row.index, bounds: r, mean });
      expect(mean, `${theme} ${kind} ${row.index}`).toBeLessThan(kind.endsWith('Icon') && (kind === 'FontIcon' || kind === 'SymbolIcon') ? 25 : 12);
    }
  }
  writeFileSync(`../references/validation/icons-${backend}.json`, JSON.stringify({ reference: 'Matching SDK natural controls rendered through RenderTargetBitmap; not Store-window or animated parity', acceptedPixelParity: false, rows: results }, null, 2) + '\n');
});
test('IconElement React samples expose flat props, bitmap options, SVG and real button input', async ({ page }) => {
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/#icon-element');
  await expect(page.locator('.example')).toHaveCount(6);
  await expect.poll(() => page.evaluate(() => window.iconScenes?.['bitmap-icon']?.snapshot.nodes.find(n => n.kind === 'BitmapIcon')?.rect.width)).toBe(50);
  await expect(page.getByLabel('Monochrome',{exact:true})).not.toBeChecked();
  await page.getByLabel('Monochrome',{exact:true}).check();
  await expect.poll(() => page.evaluate(() => window.iconScenes['bitmap-icon'].snapshot.nodes.find(n => n.kind === 'BitmapIcon')?.props.showAsMonochrome)).toBe(true);
  await page.getByLabel('Monochrome',{exact:true}).uncheck();
  await expect.poll(() => page.evaluate(() => window.iconScenes['bitmap-icon'].snapshot.nodes.find(n => n.kind === 'BitmapIcon')?.props.showAsMonochrome)).toBe(false);
  await page.getByRole('button', { name: 'Accept', exact: true }).click();
  await expect(page.getByLabel('Icon output')).toHaveText('Accepted');
  await expect.poll(() => page.evaluate(() => window.iconScenes['svg-icon'].snapshot.nodes.find(n => n.kind === 'ImageIcon')?.rect.height ?? 0)).toBeGreaterThan(0);
  await page.locator("#symbol-icon [aria-label=\"Source code\"][aria-expanded]").click();
  await expect(page.locator('#symbol-icon pre')).toContainText('<SymbolIcon symbol={Symbol.Accept} />');
  await expect(page.locator('#symbol-icon pre')).not.toContainText('options=');
  await selectGalleryOption(page.getByRole('combobox', { name: 'Renderer', exact: true }),'WebGL2');
  await expect.poll(() => page.evaluate(() => window.iconScenes['symbol-icon'].snapshot.backend.kind)).toBe('WebGL2');
  await page.getByRole('button', { name: 'Font icon button', exact: true }).click();
  await expect(page.getByLabel('Icon output')).toHaveText('FontIcon clicked');
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  expect(errors).toEqual([]);
});
for (const backend of ['Canvas2D', 'WebGL2'] as const) test(`${backend} icon updates, shared image ownership and fractional-DPR path coverage`, async ({ browser }) => {
  const coverage: { dpr: number; mean: number }[] = [];
  for (const dpr of [1.25, 1.5, 2]) {
    const context = await browser.newContext({ deviceScaleFactor: dpr, viewport: { width: 1100, height: 600 } });
    const page = await context.newPage();
    await page.goto('/#icon-element');
    await expect(page.getByRole('img', { name: 'Slices bitmap icon' })).toBeVisible();
    await page.evaluate(async ({ backend }) => {
      const a = await import('/src/index.ts' as string) as typeof import('../src/index');
      const sdk = await a.WinUI.create({ globalScrollbars: false }); const host = document.createElement('div'); host.id = 'icons-fixture'; host.style.cssText = 'position:fixed;inset:0;width:1000px;height:500px;z-index:99999'; document.body.append(host);
      const scene = sdk.scene(host, { backend: a.RendererBackend[backend], root: { background: '#ffffff' } }); const c = scene.root.canvas();
      const path = c.pathIcon({ data: 'M10 0 A10 10 0 1 1 9.999 0 Z', foreground: '#000000', canvasLeft: 24, canvasTop: 24 });
      const bitmap = c.bitmapIcon({ uriSource: '/official/Slices.png', width: 50, canvasLeft: 100, canvasTop: 24 });
      const image = c.imageIcon({ source: '/official/Slices.png', width: 50, canvasLeft: 200, canvasTop: 24 });
      let rejected = false; try { scene.batch(() => { path.update({ opacity: 0.5 }); path.update({ data: 'M broken' }); }); } catch { rejected = true; }
      if (!rejected) throw new Error('Malformed geometry was silently accepted');
      window.iconsFixture = { sdk, scene, nodes: [path, bitmap, image] };
    }, { backend });
    await expect.poll(() => page.evaluate(() => window.iconsFixture.scene.snapshot.nodes.find(n => n.kind === 'BitmapIcon')?.rect.height)).toBeCloseTo(50, 0);
    expect(await page.evaluate(() => window.iconsFixture.scene.snapshot.nodes.find(n => n.kind === 'PathIcon')?.props.opacity)).toBe(1);
    const png = PNG.sync.read(await page.locator('#icons-fixture').screenshot());
    let error = 0, count = 0;
    for (let y = 24 * dpr; y < 44 * dpr; y++) for (let x = 24 * dpr; x < 44 * dpr; x++) {
      let covered = 0; for (let sy = 0; sy < 32; sy++) for (let sx = 0; sx < 32; sx++) if (Math.hypot(x + (sx + .5) / 32 - 34 * dpr, y + (sy + .5) / 32 - 34 * dpr) <= 10 * dpr) covered++;
      const expected = 255 * (1 - covered / 1024); error += Math.abs(png.data[(y * png.width + x) * 4] - expected); count++;
    }
    coverage.push({ dpr, mean: error / count });
    expect(error / count, `circle coverage at DPR ${dpr}`).toBeLessThan(4);
    await page.evaluate(async () => {
      const { scene, nodes } = window.iconsFixture;
      const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const sources = () => scene.snapshot.imageSources.length;
      nodes[1].dispose(); await frame(); if (sources() !== 1) throw new Error('Shared image released prematurely');
      nodes[2].dispose(); await frame(); if (sources() !== 0) throw new Error('Orphaned image reference');
      nodes[0].dispose(); let rejected = false; try { nodes[0].update({ opacity: .5 }); } catch { rejected = true; }
      if (!rejected) throw new Error('Disposed icon accepted an update');
      window.iconsFixture.sdk.dispose();
    });
    await context.close();
  }
  writeFileSync(`../references/validation/icon-path-coverage-${backend}.json`, JSON.stringify({ reference: 'Independent 32x32 subpixel area integration of a circle; not native pixel parity', rows: coverage }, null, 2) + '\n');
});
