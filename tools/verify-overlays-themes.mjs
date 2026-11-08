import {chromium,expect} from '../gallery/node_modules/@playwright/test/index.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
const output=new URL('../out/overlays-themes/',import.meta.url);mkdirSync(output,{recursive:true});
const browser=await chromium.launch({channel:process.env.PW_CHANNEL??'chrome'});
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const rows=[];
try {
 await page.goto('http://127.0.0.1:5173/#overlays');
 for(const backend of ['Canvas2D','WebGL2']) {
  await page.getByRole('combobox',{name:'Renderer',exact:true}).selectOption(backend);
  for(const theme of ['Light','Dark','HighContrast']) {
   await page.locator('#theme').selectOption(theme);
   await page.getByRole('button',{name:'Show Popup (using Offset)',exact:true}).click();
   await page.getByRole('button',{name:'Close Popup',exact:true}).click();
   const target=page.getByRole('button',{name:'Empty cart',exact:true});await target.click();
   const confirm=page.getByRole('button',{name:'Confirm empty cart',exact:true});await expect(confirm).toBeFocused();
   await page.locator('#overlay-flyout .winui-scene').screenshot({path:new URL(`${backend}-${theme}.png`,output).pathname.replace(/^\/(\w:)/,'$1')});
   await page.keyboard.press('Escape');await expect(confirm).toBeHidden();await expect(target).toBeFocused();
   await page.getByRole('button',{name:'Show menu',exact:true}).click();await expect(page.getByRole('menu')).toBeFocused();await page.keyboard.press('Home');await page.keyboard.press('Enter');
   await expect(page.getByLabel('MenuFlyout output')).toContainText('open');
   const slider=page.getByRole('slider',{name:'Volume',exact:true});await slider.focus();await page.keyboard.press('End');await expect(slider).toHaveAttribute('aria-valuenow','100');await page.keyboard.press('ArrowLeft');await expect(slider).toHaveAttribute('aria-valuenow','99');
   await expect(page.getByRole('tooltip',{name:'99',exact:true})).toBeVisible();
   rows.push({backend,theme,passed:true});
  }
 }
 expect(errors).toEqual([]);
 writeFileSync(new URL('../references/validation/overlays-themes.json',import.meta.url),JSON.stringify({rows,errors,boundary:'Browser themes only; deterministic HighContrast resources, without changing Windows settings.'},null,2)+'\n');
 console.log(JSON.stringify({passed:rows.length,errors}));
} finally {await browser.close();}
