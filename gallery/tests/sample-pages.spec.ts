import {selectGalleryOption,openSource} from './gallery-control-helper';
import { expect, test } from '@playwright/test';
import { clickGalleryNavigation } from './gallery-navigation-helper';
const active='[data-winui-frame] > [data-frame-instance]:not([hidden]):not([inert]) ';

test('source-derived page header, fixed placement, Output and code stay interactive', async ({ page }) => {
  await page.goto('/#button');
  const header = page.locator(active+'.gallery-page-header');
  await expect(header.getByRole('heading', { name: 'Button', exact: true })).toBeVisible();
  const rect = (await header.boundingBox())!;
  const title = (await header.locator('h1').boundingBox())!;
  expect(title.x - rect.x).toBe(36);
  expect(title.y - rect.y).toBe(24);
  expect(await header.locator('h1').evaluate(e => getComputedStyle(e).fontSize)).toBe('28px');
  await header.getByRole('button',{name:'Documentation',exact:true}).click();
  await expect(page.getByRole('menuitem', { name: 'Button - API', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menuitem', { name: 'Button - API', exact: true })).toBeHidden();
  await header.getByRole('button',{name:'Source',exact:true}).click();
  await expect(page.getByRole('menuitem', { name: 'Official Gallery sample' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Standard XAML', exact: true }).click();
  await expect(page.locator('#button-click-output')).toContainText('Button1 (1)');
  const preview = (await page.locator('#button-standard .basic-live').boundingBox())!;
  const output = (await page.locator('#button-standard .basic-output').boundingBox())!;
  const options = (await page.locator('#button-standard .options').boundingBox())!;
  expect(output.x).toBeGreaterThan(preview.x);
  expect(output.x + output.width).toBeLessThanOrEqual(options.x);
  const sourceHeader=await openSource(page.locator('#button-standard .source'));
  await expect(page.locator('#button-standard pre[data-sample-source]')).toContainText('<Button');
  expect((await sourceHeader.boundingBox())!.height).toBe(48);
  await page.locator(active+'.gallery-scroll-content').hover();
  await page.mouse.wheel(0, 700);
  await expect.poll(async () => (await header.boundingBox())!.y).toBe(rect.y);
  await page.screenshot({ path: '../out/sample-page-button-scrolled.png' });
});

test('page geometry follows the existing NavigationView snapshots at all breakpoints', async ({ page }) => {
  await page.goto('/#text-box');
  for (const width of [1440, 900, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => {
      const content = document.querySelector('.home-main')!.getBoundingClientRect();
      return Math.abs(content.x - window.gallery.navigation!.snapshot.content.x);
    })).toBeLessThan(1);
    await expect(page.locator(active+'.gallery-page-header h1')).toHaveText('TextBox');
    expect(await page.locator(active+'.gallery-scroll-content').evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
    await page.screenshot({ path: `../out/sample-page-textbox-${width}.png` });
  }
  await clickGalleryNavigation(page, 'ListView', 'Collections');
  await expect(page.locator(active+'.gallery-page-header h1')).toHaveText('ListView');
  await expect(page.getByRole('button', { name: 'Toggle navigation pane' })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.home-pane-backdrop')).toHaveCount(0);
});

test('three themes keep official example grouping, placeholders and exclusions', async ({ page }) => {
  await page.goto('/#button');
  for (const theme of ['Light', 'Dark', 'HighContrast']) {
    await selectGalleryOption(page.locator('#theme'),theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(page.locator(active+'.home-sample-page .example')).toHaveCount(4);
    await page.screenshot({ path: `../out/sample-page-button-${theme}.png` });
  }
  await page.goto('/#sample/CalendarView');
  await expect(page.locator(active+'.gallery-page-header h1')).toHaveText('CalendarView');
  await expect(page.getByRole('heading', { name: '此示例尚未实现' })).toBeVisible();
  await page.goto('/#sample/Chart');
  await expect(page.getByRole('heading', { name: '范围外（不实现）' })).toBeVisible();
  await expect(page.locator(active+'.gallery-page-description')).toHaveCount(1);
  await expect(page.locator('.home-nav-group')).toHaveCount(0);
});

test('snapshot subscriptions deliver Rust geometry and unsubscribe cleanly', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.gallery-navigation canvas')).toBeVisible();
  await expect.poll(() => page.evaluate(() => !!window.gallery.navigation)).toBe(true);
  const result = await page.evaluate(async () => {
    const view = window.gallery.navigation!;
    let count = 0;
    let geometry = -1;
    const off = view.onSnapshot(snapshot => { count++; geometry = snapshot.content.x; });
    const first = count;
    off();
    view.update({ header: '' });
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    return { first, count, geometry, actual: view.snapshot.content.x };
  });
  expect(result.first).toBe(1);
  expect(result.count).toBe(1);
  expect(result.geometry).toBe(result.actual);
});

test('individual control pages show their own examples in official order', async ({ page }) => {
  for (const [route, ids] of [
    ['#popup', ['overlay-popup']], ['#tool-tip', ['overlay-tooltip']],
    ['#flyout', ['overlay-flyout']], ['#menu-flyout', ['overlay-menu']],
    ['#slider', ['overlay-slider']], ['#line', ['shape-line', 'shape-polyline', 'shape-path']],
    ['#shapes', ['shape-rectangle', 'shape-polygon']],
  ] as const) {
    await page.goto(`/${route}`);
    await expect(page.locator(active+'.gallery-page-header h1')).toBeVisible();
    await expect(page.locator(active+'.home-sample-page .example')).toHaveCount(ids.length);
    expect(await page.locator(active+'.home-sample-page .example').evaluateAll(elements => elements.map(element => element.id))).toEqual(ids);
  }
});

test('new command pages retain readable source panels inside the shared page layout', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const route of ['#app-bar-button', '#app-bar-toggle-button', '#drop-down-button', '#selector-bar', '#command-bar']) {
    await page.goto(`/${route}`);
    await expect(page.locator(active+'.gallery-page-header h1')).toBeVisible();
    await expect(page.locator(active+'.home-sample-page .example').first()).toBeVisible();
    await openSource(page.locator(active+'.home-sample-page .example .source').first());
    await expect(page.locator(active+'.home-sample-page .example pre').first()).not.toBeEmpty();
  }
  expect(errors).toEqual([]);
});
