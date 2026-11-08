import {selectGalleryOption,openSource} from './gallery-control-helper';
import { expect, test } from '@playwright/test';

let sampleBaseline=0;
test.beforeEach(async ({ page }) => { await page.goto('/#navigation-view'); await expect(page.locator('#runtime-status')).toHaveText('Ready'); await expect.poll(() => page.evaluate(() => window.gallery.views.filter(view=>!view.isDisposed).length)).toBe(8); await expect(page.locator('#example-0').getByRole('checkbox',{name:'Cancel pane closing',exact:true})).toBeVisible();sampleBaseline=await page.evaluate(()=>window.gallery.sdk.liveCount); });

test('real WASM selection, source and canvas pixels', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const sample = page.locator('#example-0');
  await selectGalleryOption(sample.getByLabel('PaneDisplayMode 0'),'Left');
  await sample.locator('[data-item-id="page2"]').click();
  await expect.poll(() => page.evaluate(() => window.gallery.views[0].snapshot.selectedId)).toBe('page2');
  await expect.poll(() => page.evaluate(() => window.gallery.views[0].properties.header)).toBe('Sample Page 2');
  const pixels = await sample.locator('.sample-viewport canvas').evaluate(canvas => {
    const c = canvas as HTMLCanvasElement; return [...c.getContext('2d')!.getImageData(0, 0, 2, 2).data].some(value => value > 0);
  });
  expect(pixels).toBe(true);
  await openSource(sample.locator('.source')); await expect(sample.locator('pre')).toContainText('ThemeMode');
  await expect(sample.locator('pre')).toContainText('<NavigationView'); expect(errors).toEqual([]);
});

test('focus keeps keyboard semantics without CSS or Canvas black frames', async ({ page }) => {
  const sample=page.locator('#example-0');
  await selectGalleryOption(sample.getByLabel('PaneDisplayMode 0'),'Left');
  const first=sample.locator('[data-item-id="page1"]');
  await first.click();
  await expect.poll(()=>page.evaluate(()=>window.gallery.views[0].snapshot.focusedId)).toBe('page1');
  expect(await first.evaluate(e=>getComputedStyle(e).outlineStyle)).toBe('none');
  await first.focus();await page.keyboard.press('ArrowDown');
  await expect.poll(()=>page.evaluate(()=>window.gallery.views[0].snapshot.focusedId)).toBe('page2');
  const darkBorderPixels=await sample.locator('.sample-viewport canvas').evaluate(canvas=>{
    const c=canvas as HTMLCanvasElement;const part=window.gallery.views[0].snapshot.parts.find(p=>p.id==='page2')!;
    const scale=c.width/c.getBoundingClientRect().width;
    const r=part.rect;const pixels=c.getContext('2d')!.getImageData(Math.round((r.x+8)*scale),Math.round((r.y+1)*scale),Math.round((r.width-16)*scale),Math.max(1,Math.round(2*scale))).data;
    let dark=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]<80&&pixels[i+1]<80&&pixels[i+2]<80&&pixels[i+3]>240)dark++;
    return dark;
  });
  expect(darkBorderPixels).toBe(0);
  await sample.screenshot({path:'../out/navigation-no-focus-frame.png'});
});

test('rapid real pointer reversals keep indicator within the clicked-item span',async({page})=>{
  for(const index of [0,1]){
    if(index===0)await selectGalleryOption(page.getByLabel('PaneDisplayMode 0'),'Left');
    await page.locator(`#example-${index}`).scrollIntoViewIfNeeded();
    const bounds=[];
    for(const id of ['page1','page2','page3'])bounds.push((await page.locator(`#example-${index} [data-item-id="${id}"]`).boundingBox())!);
    for(let step=0;step<70;step++){
      const b=bounds[[2,0,1,0,2,1,0][step%7]];await page.mouse.click(b.x+b.width/2,b.y+b.height/2);
      if(step%7===0){
        const valid=await page.evaluate(index=>{
          const s=window.gallery.views[index].snapshot;const parts=s.parts.filter(p=>['page1','page2','page3'].includes(p.id));
          const top=index===1;const lo=Math.min(...parts.map(p=>top?p.rect.x:p.rect.y));const hi=Math.max(...parts.map(p=>top?p.rect.x+p.rect.width:p.rect.y+p.rect.height));
          return s.indicatorVisuals.every(v=>{const start=top?v.rect.x:v.rect.y;const end=start+(top?v.rect.width:v.rect.height);return start>=lo-0.01&&end<=hi+0.01;});
        },index);expect(valid).toBe(true);
      }
    }
    await expect.poll(()=>page.evaluate(index=>window.gallery.views[index].snapshot.animating,index)).toBe(false);
    expect(await page.evaluate(index=>{const v=window.gallery.views[index].snapshot.indicatorVisuals.at(-1)!;return index===1?v.rect.width:v.rect.height;},index)).toBe(16);
  }
});

test('adaptive thresholds and five public modes', async ({ page }) => {
  for (const [width, mode] of [[640, 'Minimal'], [641, 'Compact'], [1008, 'Expanded']] as const) {
    await page.evaluate(width => { document.querySelector<HTMLElement>('#example-0 .sample-viewport')!.style.width = `${width}px`; }, width);
    await expect.poll(() => page.evaluate(() => window.gallery.views[0].snapshot.displayMode)).toBe(mode);
  }
  for (const [mode, expected] of [['Left', 'Expanded'], ['LeftCompact', 'Compact'], ['LeftMinimal', 'Minimal'], ['Top', 'Minimal']]) {
    await selectGalleryOption(page.getByLabel('PaneDisplayMode 0'),mode);
    await expect.poll(() => page.evaluate(() => window.gallery.views[0].snapshot.displayMode)).toBe(expected);
  }
});

test('synchronous PaneClosing cancellation and reverse timeline', async ({ page }) => {
  const sample = page.locator('#example-0');
  await selectGalleryOption(sample.getByLabel('PaneDisplayMode 0'),'Left');
  await sample.getByLabel('Cancel pane closing').check();
  await sample.locator('[data-item-id="$toggle"]').click();
  await expect.poll(() => page.evaluate(() => window.gallery.views[0].snapshot.isPaneOpen)).toBe(true);
  await sample.getByLabel('Cancel pane closing').uncheck();
  await sample.locator('[data-item-id="$toggle"]').click();
  await expect.poll(() => page.evaluate(() => window.gallery.views[0].snapshot.isPaneOpen)).toBe(false);
  await sample.locator('[data-item-id="$toggle"]').click();
  await expect.poll(() => page.evaluate(() => window.gallery.views[0].snapshot.isPaneOpen)).toBe(true);
});

test('keyboard focus and hierarchy invoke real Rust state', async ({ page }) => {
  const top = page.locator('#example-3');
  await top.locator('[data-item-id="page1"]').focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(() => page.evaluate(() => window.gallery.views[3].snapshot.selectedId)).toBe('page2');
  const hierarchy = page.locator('#example-6');
  await hierarchy.locator('[data-item-id="documents"]').click();
  await expect(hierarchy.locator('[data-item-id="page5"]')).toBeAttached();
  await expect.poll(() => page.evaluate(() => window.gallery.views[6].snapshot.selectedId)).toBe('page1');
  await hierarchy.locator('[data-item-id="page5"]').click();
  await expect.poll(() => page.evaluate(() => window.gallery.views[6].snapshot.selectedId)).toBe('page5');
});

test('theme changes, high contrast and reduced motion', async ({ page }) => {
  await selectGalleryOption(page.locator('#theme'),'Dark'); await expect(page.locator('html')).toHaveAttribute('data-theme', 'Dark');
  await expect.poll(() => page.evaluate(() => window.gallery.views[0].properties.theme)).toBe('Dark');
  await page.screenshot({ path: '../out/gallery-dark.png' });
  await selectGalleryOption(page.locator('#theme'),'HighContrast'); await page.locator("#motion [role=\"checkbox\"]").check();
  await expect.poll(() => page.evaluate(() => window.gallery.views[0].properties.reducedMotion)).toBe(true);
  await page.screenshot({ path: '../out/gallery-high-contrast.png' });
});

test('top overflow and footer selection', async ({ page }) => {
  await page.evaluate(() => { document.querySelector<HTMLElement>('#example-1 .sample-viewport')!.style.width = '300px'; });
  const top = page.locator('#example-1');
  await top.locator('[data-item-id="$overflow"]').click(); await top.locator('[data-item-id="page4"]').click();
  await expect.poll(() => page.evaluate(() => window.gallery.views[1].snapshot.selectedId)).toBe('page4');
  const footer = page.locator('#example-5'); await footer.locator('[data-item-id="page4"]').click();
  await expect.poll(() => page.evaluate(() => window.gallery.views[5].snapshot.selectedId)).toBe('page4');
});

test('React remount releases surfaces and event callbacks', async ({ page }) => {
  for (let i = 0; i < 4; i++) { await page.locator('#example-0 .reset').getByRole('button').click(); await expect.poll(() => page.evaluate(() => window.gallery.sdk.liveCount)).toBe(sampleBaseline); }
  const result = await page.evaluate(() => {
    const host = document.createElement('div'); host.style.cssText = 'width:600px;height:400px'; document.body.append(host);
    const view = window.gallery.create(host, { items: [{ id: 'one', text: 'One' }] });
    const before = window.gallery.sdk.liveCount; view.dispose(); view.dispose();
    let invalid = false; try { view.update({ header: 'stale' }); } catch { invalid = true; }
    host.remove(); return { before, after: window.gallery.sdk.liveCount, invalid, canvases: host.querySelectorAll('canvas').length };
  });
  expect(result).toEqual({ before: sampleBaseline+1, after: sampleBaseline, invalid: true, canvases: 0 });
});

test('batch rollback, callback cancellation and destruction during dispatch', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const browserModule = '/src/index.ts';
    const { EventKind } = await import(browserModule);
    const host = document.createElement('div'); host.style.cssText = 'width:600px;height:400px'; document.body.append(host);
    const view = window.gallery.create(host, { items: [{ id: 'one', text: 'One' }] });
    let rollback = false;
    try { view.batch([{ header: 'must not commit' }, { openPaneLength: -1 }]); } catch { rollback = view.properties.header !== 'must not commit'; }
    let detachedCalls = 0; const off = view.on(EventKind.ItemInvoked, () => detachedCalls++); off();
    view.on(EventKind.ItemInvoked, () => view.dispose()); view.invoke('one');
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    host.remove(); return { rollback, detachedCalls, live: window.gallery.sdk.liveCount };
  });
  expect(result).toEqual({ rollback: true, detachedCalls: 0, live: sampleBaseline });
});

test('record startup, frame diagnostics and screenshots', async ({ page }, testInfo) => {
  await page.screenshot({ path: '../out/gallery-light.png' });
  await page.evaluate(async () => {
    const modulePath = '/src/index.ts'; const { EventKind } = await import(modulePath);
    document.querySelector('#example-0 [data-item-id="page2"]')!.addEventListener('pointerdown', () => performance.mark('navigation-pointerdown'), { once: true });
    const off = window.gallery.views[0].on(EventKind.SelectionChanged, () => { performance.measure('input-to-selection-notification', 'navigation-pointerdown'); off(); });
  });
  await page.locator('#example-0 [data-item-id="page2"]').click();
  await expect.poll(() => page.evaluate(() => window.gallery.views[0].snapshot.animating)).toBe(false);
  const metrics = await page.evaluate(() => ({ wasmReadyMs: window.gallery.readyMs, appReadyFromNavigationMs: window.gallery.appReadyMs,
    inputToSelectionNotificationMs: performance.getEntriesByName('input-to-selection-notification')[0]?.duration,
    diagnostics: window.gallery.views.map(view => view.diagnostics), devicePixelRatio, userAgent: navigator.userAgent,
    resources: performance.getEntriesByType('resource').filter(e => e.name.includes('.wasm')).map(e => ({ name: e.name, duration: e.duration, bytes: (e as PerformanceResourceTiming).encodedBodySize })) }));
  await testInfo.attach('browser-metrics.json', { body: JSON.stringify(metrics, null, 2), contentType: 'application/json' });
  expect(metrics.diagnostics.every(d => Number.isFinite(d.averageFrameMs))).toBe(true);
});
