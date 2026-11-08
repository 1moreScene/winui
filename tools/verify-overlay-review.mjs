import {chromium} from '../gallery/node_modules/@playwright/test/index.mjs';
import {pathToFileURL} from 'node:url';import {resolve} from 'node:path';
const browser=await chromium.launch({channel:'chrome'});const page=await browser.newPage({viewport:{width:1200,height:850}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(pathToFileURL(resolve('out/overlay-controls-review/index.html')).href);
for(const name of ['Light-Plain-MenuFlyout-Top','Dark-Stripes-MenuFlyout-Bottom']){await page.locator('#fixture').selectOption(name);for(const backend of ['Canvas2D','WebGL2']){await page.locator('#backend').selectOption(backend);for(const mode of ['static','motion','close']){await page.locator('#mode').selectOption(mode);if(mode!=='static')await page.locator('#time').evaluate(e=>{e.value='6';e.dispatchEvent(new Event('input'));});await page.waitForFunction(()=>[...document.querySelectorAll('img')].every(i=>i.complete&&i.naturalWidth>0));}}}
await page.locator('#mode').selectOption('static');await page.locator('#fixture').selectOption('Light-Plain-MenuFlyout-Top');await page.waitForFunction(()=>[...document.querySelectorAll('img')].every(i=>i.complete&&i.naturalWidth>0));await page.screenshot({path:'out/overlay-controls-review/preview.png',fullPage:true});
await page.goto(pathToFileURL(resolve('out/popup-corner-materials/index.html')).href);
for(const name of await page.locator('#scene option').evaluateAll(items=>items.map(item=>item.value))){
  await page.locator('#scene').selectOption(name);
  for(const backend of ['Canvas2D','WebGL2']){
    await page.locator('#backend').selectOption(backend);
    await page.waitForFunction(()=>[...document.querySelectorAll('img')].every(i=>i.complete&&i.naturalWidth>0));
  }
}
await page.locator('#scene').selectOption('PopupCorners-Dark-Different-False');
await page.locator('#backend').selectOption('Canvas2D');
await page.waitForFunction(()=>[...document.querySelectorAll('img')].every(i=>i.complete&&i.naturalWidth>0));
await page.screenshot({path:'out/popup-corner-materials/preview.png',fullPage:true});
await page.goto(pathToFileURL(resolve('out/overlay-text-coverage/index.html')).href);
for(const [font,size,trimming,theme] of [['Segoe UI','11','None','Light'],['Arial','16','Clip','Dark'],['Segoe Fluent Icons','28','None','Light']]){
  for(const [id,value] of [['font',font],['size',size],['trimming',trimming],['theme',theme]])await page.locator('#'+id).selectOption(value);
  for(const backend of ['Canvas2D','WebGL2'])for(const stage of ['before','after']){
    await page.locator('#backend').selectOption(backend);await page.locator('#stage').selectOption(stage);
    await page.waitForFunction(()=>[...document.querySelectorAll('img')].every(i=>i.complete&&i.naturalWidth>0));
  }
}
for(const [id,value] of [['font','Segoe UI'],['size','11'],['trimming','None'],['theme','Light'],['backend','Canvas2D'],['stage','after']])await page.locator('#'+id).selectOption(value);
await page.waitForFunction(()=>[...document.querySelectorAll('img')].every(i=>i.complete&&i.naturalWidth>0));
await page.screenshot({path:'out/overlay-text-coverage/preview.png',fullPage:true});
if(errors.length)throw Error(errors.join('\n'));console.log('All reviews verified: static/motion, 32 Popup corners, and before/after native text images');await browser.close();
