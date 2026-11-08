import { expect, type Page } from '@playwright/test';

/** Pointer input against Rust's real arranged NavigationView parts. DOM scrolling
 * cannot scroll these projected buttons; wheel the existing SDK control instead. */
export async function clickGalleryNavigation(page: Page, id: string, groupId?: string) {
  const navigation = page.locator('.gallery-navigation');
  const toggle = page.getByRole('button', { name: 'Toggle navigation pane' });
  if (await toggle.getAttribute('aria-expanded') === 'false') await toggle.click();
  await expect(navigation.locator('canvas')).toBeVisible();
  if (groupId) {
    const open = await page.evaluate(group => window.gallery.navigation!.snapshot.expandedIds.includes(`group:${group}`), groupId);
    if (!open) await clickGalleryNavigation(page, `group:${groupId}`);
    await expect.poll(() => page.evaluate(group => window.gallery.navigation!.snapshot.expandedIds.includes(`group:${group}`), groupId)).toBe(true);
  }
  let reset = false;
  for (let attempt = 0; attempt < 16; attempt++) {
    const part = await page.evaluate(id => window.gallery.navigation!.snapshot.parts.find(p => p.id === id), id);
    const clip = part?.clip;
    let delta = !part ? 600 : !clip ? 0 : part.rect.y < clip.y ? part.rect.y - clip.y - 8
      : part.rect.y + part.rect.height > clip.y + clip.height ? part.rect.y + part.rect.height - clip.y - clip.height + 8 : 0;
    if (part && !delta) {
      await navigation.locator(`[data-item-id="${id}"]`).click();
      if(!id.startsWith('group:')){
        await expect.poll(()=>page.evaluate(id=>{
          const frame=window.gallery?.frame?.snapshot;
          return window.gallery.navigation?.snapshot.selectedId===id&&frame?.current?.page===(location.hash||'#home')&&!frame.animating;
        },id)).toBe(true);
      }
      return;
    }
    const offset = await page.evaluate(() => window.gallery.navigation!.snapshot.scrollOffset);
    if (!part && !reset) { delta = offset > 0 ? -offset : 600; reset = true; }
    const bounds = (await navigation.boundingBox())!;
    await page.mouse.move(bounds.x + 100, bounds.y + 180);
    await page.mouse.wheel(0, delta);
    await expect.poll(() => page.evaluate(() => window.gallery.navigation!.snapshot.scrollOffset)).not.toBe(offset);
  }
  throw new Error(`Navigation item did not enter its Rust clip: ${id}`);
}
