import { test, expect, type Page } from '@playwright/test';
import type { Scene, SceneNode, ScrollViewerController as ScrollViewer, WinUI } from 'winui-wasm';
import { setGalleryChecked } from './gallery-control-helper';

declare global {
  interface Window {
    inputBehavior: { sdk: WinUI; scene: Scene; outer: ScrollViewer; inner: SceneNode };
  }
}

async function start(page: Page) {
  await page.goto('/#text-box');
  await expect(page.getByRole('textbox', { name: 'simple TextBox', exact: true })).toBeVisible();
  await page.evaluate(() => {
    document.getElementById('app')!.style.display = 'none';
    document.body.style.minHeight = '2600px';
    scrollTo(0, 0);
  });
}

for (const kind of ['ScrollViewer', 'ScrollView', 'ScrollContentPresenter', 'ListView', 'GridView'] as const) {
  test(`${kind} retains wheel at endpoints without moving its SDK or browser parent`, async ({ page }) => {
    await start(page);
    await page.evaluate(async kind => {
      const a = await import('/@id/winui-wasm' as string) as typeof import('winui-wasm');
      const host = document.createElement('div');
      host.id = 'input-behavior';
      host.style.cssText = 'position:fixed;left:300px;top:60px;width:600px;height:600px;z-index:100';
      document.body.append(host);
      const sdk = await a.WinUI.create({ globalScrollbars: false });
      const scene = sdk.scene(host, { reducedMotion: true });
      const outer = scene.root.scrollViewer({ width: 500, height: 500, accessibleName: 'Outer' });
      const content = outer.stack({ height: 1600, width: 500 });
      const options = { width: 260, height: 160, horizontalAlignment: a.HorizontalAlignment.Left,
        verticalAlignment: a.VerticalAlignment.Top, horizontalScrollMode: a.ScrollMode.Enabled,
        horizontalScrollBarVisibility: a.ScrollBarVisibility.Auto, accessibleName: 'Inner' };
      let inner: SceneNode;
      if (kind === 'ListView' || kind === 'GridView') {
        const items = Array.from({ length: 80 }, (_, i) => ({ id: String(i), text: `Item ${i}` }));
        inner = kind === 'ListView' ? content.listView({ ...options, items }) : content.gridView({ ...options, items });
      } else {
        const view = kind === 'ScrollView' ? content.scrollView(options)
          : kind === 'ScrollContentPresenter' ? content.scrollContentPresenter(options) : content.scrollViewer(options);
        view.border({ width: 700, height: 900 });
        inner = view;
      }
      window.inputBehavior = { sdk, scene, outer, inner };
    }, kind);
    await expect.poll(() => page.evaluate(() => window.inputBehavior.inner.snapshot.scroll?.scrollableHeight ?? 0)).toBeGreaterThan(0);
    const r = await page.locator('#input-behavior [aria-label="Inner"]').boundingBox();
    await page.mouse.move(r!.x + 80, r!.y + 80);
    await page.mouse.wheel(0, -300);
    await page.waitForTimeout(100);
    expect(await page.evaluate(() => window.inputBehavior.outer.snapshot.scroll!.verticalOffset)).toBe(0);
    expect(await page.evaluate(() => scrollY)).toBe(0);
    await page.mouse.wheel(0, 100000);
    await expect.poll(() => page.evaluate(() => {
      const v = window.inputBehavior.inner.snapshot.scroll!;
      return v.verticalOffset === v.scrollableHeight;
    })).toBe(true);
    await page.mouse.wheel(0, 500);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => window.inputBehavior.outer.snapshot.scroll!.verticalOffset)).toBe(0);
    expect(await page.evaluate(() => scrollY)).toBe(0);
    if (kind !== 'ListView' && kind !== 'GridView') {
      await page.mouse.wheel(100000, 0);
      await expect.poll(() => page.evaluate(() => {
        const v = window.inputBehavior.inner.snapshot.scroll!;
        return v.horizontalOffset === v.scrollableWidth;
      })).toBe(true);
      await page.mouse.wheel(300, 0);
      expect(await page.evaluate(() => scrollX)).toBe(0);
    }
    // Moving onto the surrounding content still scrolls the outer viewer.
    await page.mouse.move(r!.x + 350, r!.y + 250);
    await page.mouse.wheel(0, 100);
    await expect.poll(() => page.evaluate(() => window.inputBehavior.outer.snapshot.scroll!.verticalOffset)).toBeGreaterThan(0);
  });
}

test('hosted DOM and shadow scroll surfaces contain each axis and release the policy on disposal', async ({ page }) => {
  await start(page);
  await page.evaluate(async () => {
    window.gallery.sdk.dispose();
    const a = await import('/@id/winui-wasm' as string) as typeof import('winui-wasm');
    const sdk = await a.WinUI.create();
    const host = document.createElement('div');
    host.id = 'native-input-behavior';
    host.style.cssText = 'position:fixed;left:300px;top:60px;width:500px;height:400px;overflow:auto;overscroll-behavior:auto';
    host.innerHTML = '<div style="width:900px;height:1200px"><div id="native-inner" style="width:260px;height:160px;overflow:auto"><div style="width:700px;height:900px">Content</div></div></div>';
    document.body.append(host);
    const shadow = document.createElement('div');
    shadow.style.cssText = 'position:fixed;left:850px;top:60px';
    shadow.attachShadow({ mode: 'open' }).innerHTML = '<div id="shadow-inner" style="width:200px;height:160px;overflow:auto"><div style="height:800px">Shadow content</div></div>';
    document.body.append(shadow);
    window.inputBehavior = { sdk } as Window['inputBehavior'];
  });
  const inner = page.locator('#native-inner');
  await expect(inner).toHaveCSS('overscroll-behavior-x', 'contain');
  await expect(inner).toHaveCSS('overscroll-behavior-y', 'contain');
  await inner.evaluate(e => { e.scrollTop = 10000; e.scrollLeft = 10000; });
  await inner.hover({ position: { x: 80, y: 80 } });
  await page.mouse.wheel(0, 400);
  await page.mouse.wheel(400, 0);
  await page.waitForTimeout(150);
  expect(await page.locator('#native-input-behavior').evaluate(e => [e.scrollTop, e.scrollLeft])).toEqual([0, 0]);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  const shadow = page.locator('#shadow-inner');
  await expect(shadow).toHaveCSS('overscroll-behavior-y', 'contain');
  await shadow.evaluate(e => { e.scrollTop = 10000; });
  await shadow.hover();
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  // Shrinking content removes containment on that axis without an SDK restart.
  await inner.evaluate(e => { (e.firstElementChild as HTMLElement).style.width = '100px'; });
  await expect(inner).toHaveCSS('overscroll-behavior-x', 'auto');
  await page.evaluate(() => window.inputBehavior.sdk.dispose());
  await expect(inner).toHaveCSS('overscroll-behavior-y', 'auto');
  await expect(shadow).toHaveCSS('overscroll-behavior-y', 'auto');
});

test('headers and labels use arrow, editors keep I-beam, and links keep hand cursor', async ({ page }) => {
  await start(page);
  await page.evaluate(async () => {
    const a = await import('/@id/winui-wasm' as string) as typeof import('winui-wasm');
    const host = document.createElement('div');
    host.id = 'cursor-behavior';
    host.style.cssText = 'position:fixed;left:300px;top:60px;width:600px;height:800px;z-index:100';
    document.body.append(host);
    const sdk = await a.WinUI.create({ globalScrollbars: false });
    const scene = sdk.scene(host, { reducedMotion: true });
    const stack = scene.root.stack({ spacing: 8, horizontalAlignment: a.HorizontalAlignment.Left });
    stack.button({ text: 'Button label' });
    stack.checkBox({ text: 'Checkbox label' });
    stack.toggleSwitch({ header: 'Switch header' });
    stack.textBox({ width: 260, header: 'Editor header', text: 'Editable', accessibleName: 'Editor' });
    stack.passwordBox({ width: 260, header: 'Password header', password: 'secret', accessibleName: 'Password' });
    stack.hyperlinkButton({ text: 'Hyperlink label' });
    stack.richTextBlock({ text: 'Selectable rich text', accessibleName: 'Rich' });
    stack.richTextBlock({ text: 'Nonselectable rich text', accessibleName: 'Static rich', isTextSelectionEnabled: false });
    stack.richTextBlock({ paragraphs: [{ runs: [{ text: 'Rich hyperlink', link: 'target' }] }] });
    window.inputBehavior = { sdk, scene } as Window['inputBehavior'];
  });
  for (const name of ['Button label', 'Checkbox label']) {
    const control = page.getByRole(name === 'Button label' ? 'button' : 'checkbox', { name, exact: true });
    await expect(control).toHaveCSS('cursor', 'default');
    await expect(control).toHaveCSS('user-select', 'none');
  }
  for (const name of ['Editor', 'Password']) {
    const input = page.getByRole('textbox', { name, exact: true });
    await expect(input).toHaveCSS('cursor', 'text');
    await expect(input).toHaveCSS('user-select', 'text');
    const group = input.locator('..');
    await expect(group).toHaveCSS('cursor', 'default');
    const r = await group.boundingBox();
    await page.mouse.move(r!.x + 10, r!.y + 5);
    expect(await page.evaluate(({ x, y }) => getComputedStyle(document.elementFromPoint(x, y)!).cursor,
      { x: r!.x + 10, y: r!.y + 5 })).toBe('default');
  }
  const editor = page.getByRole('textbox', { name: 'Editor', exact: true });
  await editor.fill('Still editable');
  await expect(editor).toHaveValue('Still editable');
  await expect(page.getByRole('button', { name: 'Clear text', exact: true })).toHaveCSS('cursor', 'default');
  await expect(page.getByRole('link', { name: 'Hyperlink label', exact: true })).toHaveCSS('cursor', 'pointer');
  await expect(page.locator('[role=document]').filter({ hasText: 'Nonselectable rich text' })).toHaveCSS('cursor', 'default');
  await expect(page.locator('[role=document]').filter({ hasText: /^Selectable rich text$/ })).toHaveCSS('cursor', 'text');
  const richLink = page.getByRole('link', { name: 'Rich hyperlink', exact: true });
  const linkRect = await richLink.boundingBox();
  await page.mouse.move(linkRect!.x + 2, linkRect!.y + 2);
  await expect(richLink.locator('..')).toHaveCSS('cursor', 'pointer');
  await page.evaluate(() => window.inputBehavior.scene.root.update({ enabled: false }));
  await expect(editor).toHaveCSS('cursor', 'default');
  await expect(page.getByRole('link', { name: 'Hyperlink label', exact: true })).toHaveCSS('cursor', 'default');
});

test('ComboBox selection text uses arrow while editable input keeps I-beam after live mode changes', async ({ page }) => {
  await page.goto('/#combo-box');
  const font = page.getByRole('combobox', { name: 'Font', exact: true });
  await expect(font).toBeVisible();
  const r = (await font.boundingBox())!;
  const point = { x: r.x + 18, y: r.y + r.height / 2 };
  await page.mouse.move(point.x, point.y);
  // Inspect the actual hit target over the displayed text, not its container.
  expect(await page.evaluate(({ x, y }) => {
    const hit = document.elementFromPoint(x, y)!;
    return { role: hit.getAttribute('role'), cursor: getComputedStyle(hit).cursor };
  }, point)).toEqual({ role: 'combobox', cursor: 'default' });
  await expect(font).toHaveCSS('user-select', 'none');
  await font.click();
  await expect(font).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('option', { name: 'Arial', exact: true }).click();
  await expect(font).toHaveValue('Arial');
  await expect(font).toHaveCSS('cursor', 'default');

  const size = page.getByRole('combobox', { name: 'Font size', exact: true });
  await expect(size).toHaveCSS('cursor', 'text');
  await expect(size).toHaveCSS('user-select', 'text');
  await size.fill('18');
  await expect(size).toHaveValue('18');
  await size.press('Escape');

  const colors = page.getByRole('combobox', { name: 'Colors', exact: true });
  const editable = page.getByRole('checkbox', { name: 'Editable', exact: true });
  await expect(colors).toHaveCSS('cursor', 'default');
  await setGalleryChecked(editable, true);
  await expect(colors).toHaveCSS('cursor', 'text');
  await expect(colors).toHaveCSS('user-select', 'text');
  await colors.fill('Green');
  await colors.press('Escape');
  await setGalleryChecked(editable, false);
  await expect(colors).toHaveCSS('cursor', 'default');
  await expect(colors).toHaveCSS('user-select', 'none');
});
