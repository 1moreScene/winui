import{chromium}from'../gallery/node_modules/playwright/index.mjs';
import{mkdir}from'node:fs/promises';
const base=process.argv[2]??'http://127.0.0.1:5173';
const browser=await chromium.launch({channel:'chrome'});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1.25});
 await mkdir('out/collections-page-browser',{recursive:true});
 for(const route of ['list-view','grid-view']){
  await page.goto(base+'/#'+route);await page.getByRole('listbox',{name:route==='list-view'?'Contacts':'Landscape images',exact:true}).waitFor();
  await page.waitForFunction(name=>window.collectionScenes?.[name]?.snapshot.imageRequests.length===0,route==='list-view'?'list-basic':'grid-basic');
  await page.waitForTimeout(400);
  await page.screenshot({path:`out/collections-page-browser/${route}.png`});
 }
}finally{await browser.close();}
