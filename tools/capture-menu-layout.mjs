import {chromium} from '../gallery/node_modules/playwright/index.mjs';
import {mkdirSync} from 'node:fs';
const folder=new URL('../out/menu-layout-review/',import.meta.url);mkdirSync(folder,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1.25});
 for(const route of ['menu-bar','command-bar-flyout','relative-panel','wrap-panel']){
  await page.goto(`http://127.0.0.1:5270/#${route}`);await page.locator('.basic-example:visible .basic-preview canvas').first().waitFor();await page.waitForTimeout(200);
  await page.screenshot({path:new URL(route+'-light.png',folder).pathname.replace(/^\/(\w:)/,'$1')});
  if(route==='menu-bar')await page.locator('#menu-basic').getByRole('menuitem',{name:'File',exact:true}).click();
  if(route==='command-bar-flyout')await page.getByRole('button',{name:'mountain',exact:true}).click();
  if(route==='menu-bar'||route==='command-bar-flyout'){await page.waitForTimeout(250);await page.screenshot({path:new URL(route+'-open.png',folder).pathname.replace(/^\/(\w:)/,'$1')});}
 }
}finally{await browser.close();}
