import { expect, test } from '@playwright/test';

const active = '[data-winui-frame] > [data-frame-instance]:not([hidden]):not([inert])';
const moduleUrl = (name: string) => new RegExp(`/(?:src/)?${name}(?:\\.tsx|-[^/]+\\.js)(?:\\?|$)`);

for (const { module, route } of [
  { module: 'ButtonPage', route: '#button' },
  { module: 'NavigationPage', route: '#navigation-view' },
  { module: 'GridPage', route: '#grid' },
  { module: 'TableViewPage', route: '#table-view' },
]) test(`${route} loads on demand and shows an animated Rust ProgressRing until ready`, async ({ page }, testInfo) => {
  const errors: string[] = [], requests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => requests.push(request.url()));
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(moduleUrl(module), async request => { await gate; await request.continue(); });
  try {
    await page.goto('/#home');
    await expect(page.getByRole('heading', { name: 'WinUI Gallery', exact: true })).toBeVisible();
    expect(requests.some(url => moduleUrl(module).test(url))).toBe(false);
    await page.evaluate(route => { location.hash = route; }, route);
    const loading = page.locator(`${active} .gallery-page-loading`);
    await expect(loading).toBeVisible();
    await expect(loading).toHaveText('');
    const ring = loading.getByRole('progressbar', { name: 'Loading page' });
    await expect(ring).toBeVisible();
    await expect(ring).toHaveAttribute('aria-busy', 'true');
    expect(await ring.getAttribute('aria-valuenow')).toBeNull();
    await expect(loading.locator('.winui-scene')).toHaveAttribute('data-backend', 'Canvas2D');
    const canvas = loading.locator('.winui-surface > canvas').first();
    const before = await canvas.evaluate(canvas => (canvas as HTMLCanvasElement).toDataURL());
    await expect.poll(() => canvas.evaluate(canvas => (canvas as HTMLCanvasElement).toDataURL())).not.toBe(before);
    if (route === '#grid') await page.screenshot({ path: testInfo.outputPath('loading.png') });
    release();
    await expect(loading).toHaveCount(0);
    await expect(page.locator(`${active} .example canvas`).first()).toBeVisible();
    expect(errors).toEqual([]);
  } finally { release(); }
});

for (const theme of ['Dark', 'HighContrast']) test(`pending navigation remains usable and releases its indicator in ${theme}`, async ({ page }, testInfo) => {
  await page.addInitScript(theme => localStorage.setItem('winui-gallery.theme', theme), theme);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(moduleUrl('GridPage'), async request => { await gate; await request.continue(); });
  try {
    await page.goto('/#home');
    await expect(page.getByRole('heading', { name: 'WinUI Gallery', exact: true })).toBeVisible();
    await page.evaluate(() => {
      const sdk = window.gallery.sdk, create = sdk.scene.bind(sdk);
      (window as any).loadingScenes = [];
      sdk.scene = (host, options) => {
        const scene = create(host, options);
        if (host.parentElement?.classList.contains('gallery-page-loading')) (window as any).loadingScenes.push(scene);
        return scene;
      };
      location.hash = '#grid';
    });
    const loading = page.locator(`${active} .gallery-page-loading`);
    await expect(loading.getByRole('progressbar')).toBeVisible();
    const state = await page.evaluate(() => {
      const scene = (window as any).loadingScenes.find((scene: any) => !scene.isDisposed);
      return { animating: scene.snapshot.animating,
        ring: scene.snapshot.nodes.find((node: any) => node.kind === 'ProgressRing')?.props };
    });
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    expect(state.animating).toBe(false);
    expect(state.ring.isActive).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('loading.png') });
    await page.getByRole('button', { name: 'Go back', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'WinUI Gallery', exact: true })).toBeVisible();
    await expect(loading).toHaveCount(0);
    release();
    await expect(page.locator('.gallery-page-loading')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => (window as any).loadingScenes.every((scene: any) => scene.isDisposed))).toBe(true);
    await expect(page.getByRole('heading', { name: 'WinUI Gallery', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Go forward', exact: true }).click();
    await expect(page.locator(`${active} .example canvas`).first()).toBeVisible();
    await expect(page.locator('.gallery-page-loading')).toHaveCount(0);
  } finally { release(); }
});
