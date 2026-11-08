import {selectGalleryOption} from './gallery-control-helper';
import {test,expect} from '@playwright/test';
import {PNG} from 'pngjs';
for(const backend of ['Canvas2D','WebGL2'])for(const dpr of [1.25,1.375,1.5625])test(`${backend} font popup has no painted scrollbar at ${dpr} DPR`,async({browser})=>{
 const context=await browser.newContext({deviceScaleFactor:dpr,viewport:{width:1440,height:1000}}),page=await context.newPage();
 await page.goto('/#combo-box');await selectGalleryOption(page.getByRole('combobox',{name:'Renderer',exact:true}),backend);
 await expect.poll(()=>page.evaluate(()=>(window as any).composedScenes.ComboBoxFonts.snapshot.backend.kind)).toBe(backend);
 await page.locator('#composed-combo-source').scrollIntoViewIfNeeded();await page.getByRole('combobox',{name:'Font',exact:true}).click();
 const list=page.locator('#composed-combo-source [role=listbox]');await list.hover();await page.mouse.wheel(0,40);await page.waitForTimeout(650);
 const scroll=await page.evaluate(()=>(window as any).composedScenes.ComboBoxFonts.snapshot.nodes.find((n:any)=>n.kind==='ListView').scroll);
 expect(scroll.scrollableHeight).toBe(0);expect(scroll.verticalThumb).toBeNull();expect(scroll.verticalOffset).toBe(0);
 const image=PNG.sync.read(await list.screenshot());let dark=0;
 for(let y=Math.ceil(12*dpr);y<image.height-12*dpr;y++)for(let x=Math.ceil(image.width-8*dpr);x<image.width-3*dpr;x++){
  const at=(y*image.width+x)*4;if(Math.max(...image.data.subarray(at,at+3))<180)dark++;
 }
 expect(dark,'no gray thumb pixels in the inner right-hand track').toBe(0);await context.close();
});
