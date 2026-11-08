import {selectGalleryOption} from './gallery-control-helper';
import {test,expect} from '@playwright/test';
for(const backend of ['Canvas2D','WebGL2'])test(`${backend} menu caches touch versus mouse template padding`,async({browser})=>{
 const context=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:true});const page=await context.newPage();await page.goto('/#overlays');await selectGalleryOption(page.getByRole('combobox',{name:'Renderer',exact:true}),backend);const target=page.getByRole('button',{name:'Show menu',exact:true});await target.scrollIntoViewIfNeeded();const box=await target.boundingBox();await page.touchscreen.tap(box!.x+box!.width/2,box!.y+box!.height/2);await expect(page.getByRole('menu')).toBeVisible();
 const rowHeight=()=>page.evaluate(()=>window.overlayScenes.menu.snapshot.nodes.find(n=>n.kind==='MenuFlyout')!.overlay!.rows[0].height);
 await expect.poll(rowHeight).toBe(40);await page.mouse.move(2,2);await expect.poll(rowHeight).toBe(40);await page.keyboard.press('Escape');await expect(page.getByRole('menu')).toBeHidden();await target.click();await expect(page.getByRole('menu')).toBeVisible();await expect.poll(rowHeight).toBe(32);await context.close();
});
