import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

test('navigation quality: native fallback avoids full-viewport Acrylic work', async ({ page }) => {
  await page.goto('/#button');
  await expect.poll(() => page.evaluate(() => !!window.gallery?.navigation)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.gallery.navigation!.snapshot.animating)).toBe(false);
  expect(await page.evaluate(() => window.gallery.navigation!.properties.isBackdropAvailable)).toBe(false);
  const before = await page.evaluate(() => window.gallery.navigation!.diagnostics);
  const start = Date.now();
  for(let i=0;i<35;i++) await page.mouse.move(30+i%5*28,70+i%15*38);
  const after = await page.evaluate(() => window.gallery.navigation!.diagnostics);
  const averageNewFrameMs = (after.averageFrameMs*after.frames-before.averageFrameMs*before.frames)/Math.max(1,after.frames-before.frames);
  const result = {viewport:[1440,1000],moves:35,elapsedMs:Date.now()-start,before,after,averageNewFrameMs};
  mkdirSync('../out/navigation-performance',{recursive:true});
  writeFileSync('../out/navigation-performance/after.json',JSON.stringify(result,null,2));
  expect(after.frames-before.frames).toBeGreaterThan(10);
  expect(averageNewFrameMs).toBeLessThan(20);
});

test('navigation quality: scrolling and expanding keep selection geometry attached', async ({ page }) => {
  await page.goto('/#button');
  await expect(page.locator('.gallery-navigation [data-item-id="Button"]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.gallery.navigation?.snapshot.animating)).toBe(false);
  await page.locator('.gallery-navigation [data-item-id="group:FundamentalsItem"]').click();
  await expect.poll(() => page.evaluate(() => window.gallery.navigation!.snapshot.expandedIds.includes('group:FundamentalsItem'))).toBe(true);
  expect(await page.evaluate(() => window.gallery.navigation!.snapshot.selectedId)).toBe('Button');
  await expect.poll(()=>page.evaluate(()=>window.gallery.navigation!.snapshot.animating)).toBe(false);
  expect(await page.evaluate(() => window.gallery.navigation!.snapshot.animating)).toBe(false);
  await page.mouse.move(150,400);await page.mouse.wheel(0,35);
  await expect.poll(() => page.evaluate(() => window.gallery.navigation!.snapshot.scrollOffset)).toBeGreaterThan(0);
  const result = await page.evaluate(() => {
    const snapshot=window.gallery.navigation!.snapshot;
    const selected=snapshot.parts.find(part=>part.id==='Button')!;
    const bar=snapshot.indicatorVisuals.at(-1)!;
    return {selected:snapshot.selectedId,animating:snapshot.animating,height:bar.rect.height,
      error:Math.abs(bar.rect.y-selected.rect.y-(selected.rect.height-16)/2)};
  });
  expect(result).toEqual({selected:'Button',animating:false,height:16,error:0});
});

test('navigation quality: rapid cross-depth switching never stretches between hierarchy levels', async ({ page }) => {
  await page.goto('/#button');
  const ids=['gallery-all','Button'];
  const boxes=[];
  for(const id of ids) boxes.push((await page.locator(`.gallery-navigation [data-item-id="${id}"]`).boundingBox())!);
  for(let i=0;i<20;i++) {
    const index=i%2,box=boxes[index];await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
    await expect.poll(() => page.evaluate(() => window.gallery.navigation!.snapshot.selectedId)).toBe(ids[index]);
    const bars=await page.evaluate(() => window.gallery.navigation!.snapshot.indicatorVisuals);
    expect(bars.every(bar=>bar.rect.height<=16.01&&bar.rect.width<=3.01)).toBe(true);
  }
  await expect.poll(() => page.evaluate(() => window.gallery.navigation!.snapshot.animating)).toBe(false);
  expect(await page.evaluate(() => window.gallery.navigation!.snapshot.indicatorVisuals.at(-1)!.rect.height)).toBe(16);
  await page.screenshot({path:'../out/navigation-performance/settled.png'});
});
