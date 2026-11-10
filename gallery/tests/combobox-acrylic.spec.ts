import { test, expect } from '@playwright/test';
import { PNG } from 'pngjs';

test('actual Gallery ComboBox host does not force the Acrylic fallback', async ({ page }) => {
  await page.goto('/#combo-box');
  const renderer = page.getByRole('combobox', { name: 'Renderer', exact: true });
  await renderer.click();
  await expect(renderer).toHaveAttribute('aria-expanded', 'true');
  const material = () => renderer.evaluate(element => {
    const host = element.closest('[data-gallery-control="ComboBox"]') as HTMLElement & { galleryScene: import('winui-wasm').Scene };
    const state = host.galleryScene.snapshot;
    const combo = state.nodes.find(n => n.kind === 'ComboBox')!;
    return state.nodes.find(n => n.id === combo.composed!.parts.Popup)!.materialWeight;
  });
  await expect.poll(material).toBe(1);
  await expect.poll(() => renderer.evaluate(element => {
    const host = element.closest('[data-gallery-control="ComboBox"]') as HTMLElement & { galleryScene: import('winui-wasm').Scene };
    return host.galleryScene.element.dataset.winuiPageBackdrop;
  })).toBe('ready');
  await page.screenshot({ path: '../out/combobox-gallery-acrylic.png' });
  await renderer.press('Escape');
  const colors = page.getByRole('combobox', { name: 'Colors', exact: true });
  await colors.click();
  await expect(colors).toHaveAttribute('aria-expanded', 'true');
  await expect.poll(() => page.evaluate(() => {
    const state = window.composedScenes.ComboBox.snapshot;
    const combo = state.nodes.find(n => n.kind === 'ComboBox')!;
    return state.nodes.find(n => n.id === combo.composed!.parts.Popup)!.materialWeight;
  })).toBe(1);
  await expect.poll(() => page.evaluate(() => window.composedScenes.ComboBox.element.dataset.winuiPageBackdrop)).toBe('ready');
  await page.screenshot({ path: '../out/combobox-example-acrylic.png' });
});

for (const backend of ['Canvas2D', 'WebGL2'] as const) {
  for (const theme of ['Light', 'Dark'] as const) {
    test(`${backend} ${theme} ComboBox acrylic samples live content and honors transparency policy`, async ({ page }) => {
      await page.goto('/#combo-box');
      await page.evaluate(async ({ backend, theme }) => {
        const api = await import('/@id/winui-wasm' as string);
        const sdk = await api.WinUI.create({ globalScrollbars: false });
        const host = document.createElement('div');
        host.id = 'combo-acrylic-fixture';
        host.style.cssText = 'position:fixed;left:20px;top:20px;width:500px;height:400px;z-index:999999';
        document.body.append(host);
        const scene = sdk.scene(host, { backend: api.RendererBackend[backend], theme: api.ThemeMode[theme], reducedMotion: true, reducedTransparency: false });
        scene.root.update({ background: '#ff2020' });
        const combo = scene.root.canvas().comboBox({ width: 240, canvasLeft: 80, canvasTop: 80,
          items: [{ id: 'a', text: 'Alpha' }, { id: 'b', text: 'Beta' }, { id: 'c', text: 'Gamma' }], selectedIndex: 0 });
        combo.open();
        (window as any).comboAcrylicFixture = { sdk, scene, combo, host };
      }, { backend, theme });
      const settle = () => page.evaluate(async () => { for (let i = 0; i < 5; i++) await new Promise(requestAnimationFrame); });
      await settle();
      const pixel = async () => {
        const clip = await page.evaluate(() => {
          const { scene, combo, host } = (window as any).comboAcrylicFixture;
          const popup = scene.snapshot.nodes.find((n: any) => n.id === combo.snapshot.composed.parts.Popup).rect;
          const r = host.getBoundingClientRect();
          return { x: r.x + popup.x + popup.width - 22, y: r.y + popup.y + popup.height - 22, width: 1, height: 1 };
        });
        return [...PNG.sync.read(await page.screenshot({ clip })).data.slice(0, 3)];
      };
      const red = await pixel();
      await page.evaluate(() => (window as any).comboAcrylicFixture.scene.root.update({ background: '#2020ff' }));
      await settle();
      const blue = await pixel();
      expect(Math.max(...red.map((v, i) => Math.abs(v - blue[i])))).toBeGreaterThan(5);
      await page.evaluate(() => (window as any).comboAcrylicFixture.scene.configure({ reducedTransparency: true }));
      await settle();
      const fallbackBlue = await pixel();
      await page.evaluate(() => (window as any).comboAcrylicFixture.scene.root.update({ background: '#ff2020' }));
      await settle();
      expect(await pixel()).toEqual(fallbackBlue);
      await page.evaluate(() => {
        const f = (window as any).comboAcrylicFixture;
        f.scene.dispose(); f.sdk.dispose(); f.host.remove();
      });
    });
  }
}
