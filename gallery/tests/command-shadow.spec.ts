import {test,expect} from '@playwright/test';
import {PNG} from 'pngjs';

for(const backend of ['Canvas2D','WebGL2'])test(`${backend} CommandBarFlyout keeps a soft shadow outside both bottom corners`,async({browser},info)=>{
 test.setTimeout(90000);
 for(const dpr of [1,1.25,2]){
  const context=await browser.newContext({baseURL:info.project.use.baseURL,viewport:{width:1440,height:1000},deviceScaleFactor:dpr,colorScheme:'light'});
  const page=await context.newPage();await page.goto('/#command-bar-flyout');
  if(backend==='WebGL2'){
   await page.locator('.stage-toolbar [role="combobox"]').click();
   await page.getByRole('option',{name:backend,exact:true}).click();
   await expect.poll(()=>page.evaluate(()=>{
    try{return window.menuLayoutScenes['command-flyout'].snapshot.backend.kind;}
    catch(error){if(error instanceof Error&&error.message==='Scene is disposed')return null;throw error;}
   })).toBe(backend);
  }
  const target=page.getByRole('button',{name:'mountain',exact:true});
  for(const expanded of [false,true]){
   await target.click({button:expanded?'right':'left'});
   await expect(page.getByRole('button',{name:'Save',exact:true})).toBeVisible();
   if(expanded)await expect(page.getByRole('button',{name:'Resize',exact:true})).toBeVisible();
   await page.waitForTimeout(300);
   const geometry=await page.evaluate(expanded=>{
    const s=window.menuLayoutScenes['command-flyout'].snapshot;
    const panel=s.nodes.find(n=>n.kind===(expanded?'Flyout':'CommandBarFlyout')&&n.overlay?.isOpen)!;
    return {panel:{x:panel.world[4],y:panel.world[5],width:panel.rect.width,height:panel.rect.height},surface:s.floatingSurface!.bounds};
   },expanded);
   const {panel,surface}=geometry;
   expect(surface.y+surface.height-panel.y-panel.height).toBeGreaterThanOrEqual(16);
   expect(surface.x).toBeLessThan(panel.x);
   expect(surface.x+surface.width).toBeGreaterThan(panel.x+panel.width);
   const png=await page.locator('#command-flyout [data-winui-floating]:popover-open canvas').screenshot();
   const pixels=PNG.sync.read(png),scale=pixels.width/surface.width;
   const gray=(x:number,y:number)=>{const at=(Math.min(pixels.height-1,Math.max(0,Math.round(y*scale)))*pixels.width+Math.min(pixels.width-1,Math.max(0,Math.round(x*scale))))*4;return(pixels.data[at]+pixels.data[at+1]+pixels.data[at+2])/3;};
   const bottom=panel.y+panel.height-surface.y;
   const middle=panel.x+panel.width/2-surface.x;
   // The old island cropped every pixel below the primary panel: only its
   // transparent rounded-corner wedges retained a rectangular shadow remnant.
   expect(gray(middle,bottom+3)).toBeLessThan(gray(middle,bottom+16)-3);
   await info.attach(`${backend}-${dpr}-${expanded?'expanded':'transient'}`,{body:png,contentType:'image/png'});
   await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Save',exact:true})).not.toBeVisible();
  }
  await context.close();
 }
});
