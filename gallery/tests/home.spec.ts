import {selectGalleryOption} from './gallery-control-helper';
import { clickGalleryNavigation } from './gallery-navigation-helper';
import { expect, test } from '@playwright/test';
import official from '../src/official-home.json' with { type: 'json' };
const active='[data-winui-frame] > [data-frame-instance]:not([hidden]):not([inert]) ';
const officialSamples = official.groups.flatMap(group => group.items);
const sampleCount = officialSamples.length + 1; // CommunityToolkit Segmented

test('new home replaces original landing routes and page title', async ({ page }) => {
  for (const route of ['/', '/#home', '/#overview', '/#unknown-page']) {
    await page.goto(route);
    await expect(page).toHaveTitle('WinUI Gallery');
    await expect(page.getByRole('heading', { name: 'WinUI Gallery', exact: true })).toBeVisible();
    await expect(page.locator('#example-0')).toHaveCount(0);
  }
  await page.goto('/#samples');
  await expect(page.getByRole('heading', { name: 'All samples', exact: true })).toBeVisible();
  await expect(page.locator(active+'.home-sample')).toHaveCount(sampleCount);
});

test('official home structure, assets, resource scrolling and full catalog', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'WinUI Gallery', exact: true })).toBeVisible();
  await expect(page.locator(active+'.home-resource')).toHaveCount(6);
  await expect(page.locator('.gallery-navigation .winui-surface > canvas')).toHaveCount(1);
  await expect(page.locator('.home-sidebar details')).toHaveCount(0);
  await expect(page.locator(active+'.home-samples .home-sample')).toHaveCount(officialSamples.filter(i => i.isNew || i.isUpdated).length + 1);
  const first = page.locator(active+'.home-resource').first();
  const sample = page.locator(active+'.home-sample').first();
  expect(await first.evaluate(e => [e.clientWidth + 2, e.clientHeight + 2])).toEqual([232, 172]);
  expect(await sample.evaluate(e => [e.clientWidth + 2, e.clientHeight + 2])).toEqual([300, 96]);
  await page.getByRole('button', { name: 'Scroll resources right' }).click();
  await expect.poll(() => page.locator(active+'.home-horizontal-content').first().evaluate(e => e.scrollLeft)).toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: 'Scroll resources left' })).toBeVisible();
  await page.getByRole('button', { name: 'Scroll resources left' }).click();
  await expect.poll(() => page.locator(active+'.home-horizontal-content').first().evaluate(e => e.scrollLeft)).toBe(0);
  await page.screenshot({ path: '../out/home-light.png', fullPage: true });
  await clickGalleryNavigation(page, 'gallery-all');
  await expect(page.locator(active+'.home-sample')).toHaveCount(sampleCount);
  await expect(page.locator(active+'[data-sample-id="Segmented"]')).toHaveCount(1);
  await page.locator(active+'.home-sample').last().scrollIntoViewIfNeeded();
  const images = await page.locator(active+'.home-sample img').evaluateAll(images => [...new Set(images.map(image => (image as HTMLImageElement).src))]);
  for (const url of images) expect((await page.request.get(url)).ok(), url).toBe(true);
  const ids = await page.locator(active+'.home-sample').evaluateAll(cards => cards.map(card => card.getAttribute('data-sample-id')));
  expect(new Set(ids)).toEqual(new Set([...officialSamples.map(item => item.id), 'Segmented']));
  expect(errors).toEqual([]);
});

for (const theme of ['Light', 'Dark', 'HighContrast']) test(`home card rows hide scrollbars and handle mouse/trackpad input in ${theme}`, async ({ page }) => {
  await page.addInitScript(theme => {
    localStorage.setItem('winui-gallery.theme', theme);
    localStorage.setItem('winui-gallery.recent', JSON.stringify(['Expander', 'Grid', 'Canvas', 'Border', 'Button', 'ComboBox', 'TextBox', 'NavigationView']));
  }, theme);
  await page.emulateMedia({ reducedMotion: theme === 'Dark' ? 'reduce' : 'no-preference' });
  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto('/');
  const main = page.locator(active + '.home-main');
  const rows = page.locator(active + '.home-horizontal-content');
  await expect(rows).toHaveCount(2);
  for (const row of await rows.all()) {
    await expect(row).toHaveAttribute('data-winui-scroll-host', '');
    const id = await row.getAttribute('id');
    const bars = page.locator(`[data-winui-global-scrollbars] [role=scrollbar][aria-controls="${id}"]`);
    const offset = () => row.evaluate(e => e.scrollLeft);
    await row.hover({ position: { x: 120, y: 45 } });
    const pageOffset = await main.evaluate(e => e.scrollTop);
    await page.mouse.wheel(0, 120);
    await expect.poll(offset).toBeGreaterThan(80);
    await expect(bars.filter({ visible: true })).toHaveCount(0);
    expect(await row.evaluate(e => [getComputedStyle(e).scrollbarWidth, e.scrollTop])).toEqual(['none', 0]);
    expect(await main.evaluate(e => e.scrollTop)).toBe(pageOffset);
    await page.mouse.wheel(0, -10000);
    await expect.poll(offset).toBe(0);
    await page.mouse.wheel(0, -120);
    await page.keyboard.down('Shift');
    await page.mouse.wheel(0, 120);
    await page.keyboard.up('Shift');
    await expect.poll(offset).toBeGreaterThan(80);
    await page.mouse.wheel(0, -10000);
    await expect.poll(offset).toBe(0);
    await page.mouse.wheel(180, 0);
    await expect.poll(offset).toBeGreaterThan(140);
    await page.mouse.wheel(0, 10000);
    await expect.poll(() => row.evaluate(e => e.scrollWidth - e.clientWidth - e.scrollLeft)).toBeLessThan(1);
    await page.mouse.wheel(0, 120);
    expect(await main.evaluate(e => e.scrollTop)).toBe(pageOffset);
    await expect(bars.filter({ visible: true })).toHaveCount(0);
  }
  // Arrow buttons move one viewport, including after responsive resizing.
  await page.setViewportSize({ width: 390, height: 844 });
  const row = rows.first();
  await row.evaluate(e => e.scrollTo({ left: 0, behavior: 'instant' }));
  await expect.poll(() => row.evaluate(e => e.scrollLeft)).toBe(0);
  await page.getByRole('button', { name: 'Scroll resources right', exact: true }).click();
  await expect.poll(() => row.evaluate(e => Math.abs(e.scrollLeft - e.clientWidth))).toBeLessThan(1);
  await expect(page.getByRole('button', { name: 'Scroll resources left', exact: true })).toBeFocused();
  await page.screenshot({ path: `../out/home-horizontal-${theme}.png` });
  await page.setViewportSize({ width: 2200, height: 1000 });
  await expect(page.getByRole('button', { name: 'Scroll resources right', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Scroll resources left', exact: true })).toHaveCount(0);
});

test('search, category, favorites and recent navigation persist', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Favorites' }).click();
  await expect(page.getByText('No favorites yet')).toBeVisible();
  await page.getByRole('tab', { name: 'Recent', exact: true }).click();
  await page.keyboard.press('Control+f');
  await expect(page.getByRole('combobox', { name: 'Search controls and samples' })).toBeFocused();
  await page.keyboard.type('CalendarDatePicker');
  await expect(page.locator(active+'.home-sample')).toHaveCount(1);
  await page.locator(active+'.home-sample-link').click();
  await expect(page.getByRole('heading', { name: 'CalendarDatePicker', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Favorite CalendarDatePicker', exact: true }).click();
  await clickGalleryNavigation(page, 'gallery-home');
  await expect(page.getByRole('heading', { name: 'Recently visited', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Favorites' }).click();
  await expect(page.locator(active+'.home-sample')).toHaveCount(1);
  await page.reload();
  await page.getByRole('tab', { name: 'Favorites' }).click();
  await expect(page.locator(active+'[data-sample-id=CalendarDatePicker]')).toBeVisible();
  await page.locator(active+'.home-sample-link').click();
  await page.getByRole('button', { name: 'Unfavorite CalendarDatePicker', exact: true }).click();
  await clickGalleryNavigation(page, 'gallery-home');await page.getByRole('tab',{name:'Favorites',exact:true}).click();
  await expect(page.getByText('No favorites yet')).toBeVisible();
  await clickGalleryNavigation(page, 'category:DateAndTime', 'DateAndTime');
  await expect(page.locator(active+'.home-sample')).toHaveCount(4);
  await page.getByRole('combobox', { name: 'Search controls and samples' }).fill('not-an-existing-control');
  await expect(page.getByRole('status')).toHaveText('0 results for “not-an-existing-control”');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Date & time', exact: true })).toBeVisible();
});

test('existing Rust samples are reachable and return home without stale controls', async ({ page }) => {
  await page.goto('/#all');
  await page.locator(active+'[data-sample-id=Button] .home-sample-link').click();
  await expect(page.getByRole('heading', { name: 'Button', exact: true })).toBeVisible();
  await expect(page.locator('canvas').first()).toBeVisible();
  await clickGalleryNavigation(page, 'gallery-home');
  await expect(page.getByRole('heading', { name: 'WinUI Gallery', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.gallery.frame!.snapshot.animating)).toBe(false);
  expect(await page.evaluate(() => window.gallery.frame!.snapshot.pages.some(page=>page.page==='#button'))).toBe(true);
  await page.goto('/#all');
  await page.locator(active+'[data-sample-id=NavigationView] .home-sample-link').click();
  await expect.poll(() => page.evaluate(() => window.gallery.views.filter(Boolean).length)).toBe(8);
  await expect(page.locator('#example-0 .control-host .winui-surface > canvas')).toBeVisible();
  await page.locator('#example-0 [data-item-id=page2]').click();
  await expect.poll(() => page.evaluate(() => window.gallery.views[0].snapshot.selectedId)).toBe('page2');
  await clickGalleryNavigation(page, 'gallery-home');
  await expect(page.locator(active+'.home-recent [data-sample-id=NavigationView]')).toBeVisible();
});

test('every implemented navigation item keeps the new shared shell', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const titlebar = await page.locator('.home-titlebar').elementHandle();
  await clickGalleryNavigation(page, 'gallery-all');
  const links = await page.locator(active+'.home-sample-link').evaluateAll(links => links.map(link => ({ href: link.getAttribute('href')!, id: link.closest('[data-sample-id]')!.getAttribute('data-sample-id')! })).filter(link => !link.href.startsWith('#sample/')));
  expect(links.length).toBeGreaterThanOrEqual(52);
  for (const {id, href} of links) {
    const groupId = official.groups.find(group => group.items.some(item => item.id === id))!.id;
    await clickGalleryNavigation(page, id, groupId);
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.locator(active+'.gallery-page-header h1')).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.gallery.navigation!.snapshot.selectedId)).toBe(id);
    await expect(page.locator('.gallery-navigation')).toHaveCount(1);
    await expect(page.locator('.sidebar, .titlebar, .home-nav-group')).toHaveCount(0);
    expect(await titlebar!.evaluate(element => element.isConnected)).toBe(true);
  }
  await page.screenshot({ path: '../out/gallery-shared-shell.png' });
  expect(errors).toEqual([]);
});

test('theme, sample state and new navigation survive search and page changes', async ({ page }) => {
  await page.goto('/#button');
  await expect(page.locator(active+'.gallery-page-header h1')).toHaveText('Button');
  await selectGalleryOption(page.locator(active+'#theme'),'Dark');
  await clickGalleryNavigation(page, 'NavigationView', 'Navigation');
  await expect(page.locator('html')).toHaveAttribute('data-theme','Dark');
  await expect(page.locator('.home-gallery')).toBeVisible();
  await page.locator('#example-0 [data-item-id=page2]').click();
  const search = page.getByRole('combobox', { name: 'Search controls and samples' });
  await search.fill('CalendarDatePicker');
  await expect(page.locator(active+'.home-sample')).toHaveCount(1);
  await expect(page.locator(active+'.home-sample-page')).toBeHidden();
  await page.getByRole('combobox', { name: 'Search controls and samples' }).fill('');
  await expect(page.locator(active+'.home-sample-page')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.gallery.views[0].snapshot.selectedId)).toBe('page2');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'Dark');
  await clickGalleryNavigation(page, 'gallery-home');
  await expect(page.getByRole('heading', { name: 'WinUI Gallery', exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'Dark');
});

test('themes, tab keyboard navigation, narrow layout and menu', async ({ page }) => {
  await page.goto('/#settings');
  await selectGalleryOption(page.getByRole('combobox', { name: 'App theme' }),'Dark');
  await clickGalleryNavigation(page, 'gallery-home');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'Dark');
  await page.screenshot({ path: '../out/home-dark.png' });
  await page.getByRole('tab', { name: 'Recent', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Favorites' })).toBeFocused();
  await expect(page.getByRole('tab', { name: 'Favorites' })).toHaveAttribute('aria-selected', 'true');
  expect(await page.getByRole('tab', { name: 'Favorites' }).evaluate(e => getComputedStyle(e).outlineStyle)).toBe('none');
  await clickGalleryNavigation(page, '$settings');
  await selectGalleryOption(page.getByRole('combobox', { name: 'App theme' }),'HighContrast');
  await clickGalleryNavigation(page, 'gallery-home');
  await expect(page.locator(active+'.home-hero-art')).toBeHidden();
  await page.screenshot({ path: '../out/home-high-contrast.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Toggle navigation pane' })).toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('button', { name: 'Toggle navigation pane' }).click();
  await expect(page.locator('.gallery-navigation [data-item-id="$settings"]')).toBeVisible();
  await clickGalleryNavigation(page, '$settings');
  await expect(page.getByRole('button', { name: 'Toggle navigation pane' })).toHaveAttribute('aria-expanded', 'false');
  await selectGalleryOption(page.getByRole('combobox', { name: 'App theme' }),'Light');
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'WinUI Gallery', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await page.locator('.home-main').evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
  await page.screenshot({ path: '../out/home-mobile.png' });
});
