import { test, expect } from '@playwright/test';
import { PNG } from 'pngjs';
import { selectGalleryOption } from './gallery-control-helper';

for (const backend of ['Canvas2D', 'WebGL2']) {
  for (const dpr of [1, 1.25, 1.5, 1.75, 2]) {
    test(`${backend} DPR=${dpr} Expander clears fractional backing rows through Down Up Down`, async ({ browser }) => {
      const context = await browser.newContext({ deviceScaleFactor: dpr, viewport: {width:1440,height:1000}, colorScheme:'light' });
      const page = await context.newPage();
      const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
      await page.goto('/#expander');
      await selectGalleryOption(page.getByRole('combobox',{name:'Renderer',exact:true}),backend);
      const direction = page.getByRole('combobox',{name:'ExpandDirection',exact:true});
      for (const [index,mode] of ['Down','Up','Down','Up','Down'].entries()) {
        if (await direction.inputValue() !== mode) await selectGalleryOption(direction,mode);
        await page.mouse.move(0,0);
        await expect.poll(()=>page.evaluate(()=>window.fiveScenes['expander-text'].snapshot.animating)).toBe(false);
        const image = PNG.sync.read(await page.locator('#expander-text .basic-preview .winui-scene').screenshot({path:`../out/expander-edge/${backend}-${dpr}-${index}-${mode}.png`}));
        let darkestRow = 0;
        for (let y=image.height-5;y<image.height;y++) {
          let dark=0;
          for(let x=4;x<Math.min(image.width,260*dpr)-4;x++) {
            const i=(y*image.width+x)*4;
            if(image.data[i]<80&&image.data[i+1]<80&&image.data[i+2]<80)dark++;
          }
          darkestRow=Math.max(darkestRow,dark);
        }
        expect(darkestRow,`${backend} DPR=${dpr} step=${index} ${mode}: dark horizontal residue`).toBe(0);
      }
      expect(errors).toEqual([]);
      await context.close();
    });
  }
}
