import {chromium} from '../gallery/node_modules/playwright-core/index.mjs';
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:1300,height:950}});
await page.goto('http://127.0.0.1:5173/#split-button');await page.getByRole('button',{name:'Font color options',exact:true}).click();await page.waitForTimeout(450);
writeFileSync('out/split-button-live.json',JSON.stringify(await page.evaluate(()=>window.compactScenes['split-color'].snapshot),null,2));
await page.locator('#split-color').screenshot({path:'out/split-button-live.png'});await browser.close();
