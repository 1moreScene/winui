import {chromium} from '../gallery/node_modules/playwright/index.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const dir='out/scroll-primitives-visual';mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1.25});
 await context.addInitScript(()=>localStorage.setItem('winui-gallery.theme','Light'));
 const page=await context.newPage(),errors=[],pending=[],wasm=new Set();page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(new URL(r.url()).pathname.endsWith('.wasm'))pending.push(r.body().then(b=>wasm.add(createHash('sha256').update(b).digest('hex'))));});
 const rows=[];
 for(const route of ['scroll-bar','thumb','tick-bar','items-presenter','scroll-content-presenter']){
  await page.goto(`${process.env.WINUI_PRIMITIVES_URL??'http://127.0.0.1:5221'}/#${route}`);
  const key=route+'-basic';
  await page.waitForFunction(key=>{const scene=window.scrollPrimitiveScenes?.[key];const el=document.getElementById(key),frame=el?.closest('[data-frame-instance]');return scene&&scene.snapshot.nodes.some(n=>n.primitive)&&el&&(!frame||!frame.inert);},key);
  if(route==='tick-bar')await page.waitForFunction(key=>window.scrollPrimitiveScenes[key].snapshot.nodes.some(n=>n.primitive?.ticks?.length===6),key);
  await page.locator('#'+key).screenshot({path:`${dir}/${route}.png`});
  rows.push(await page.evaluate(key=>{const scene=window.scrollPrimitiveScenes[key];return{key,backend:scene.snapshot.backend.kind,nodes:scene.snapshot.nodes.length};},key));
 }
 await Promise.all(pending);if(errors.length)throw Error(errors.join('\n'));if(wasm.size!==1)throw Error('Capture did not use one stable WASM');
 writeFileSync(`${dir}/results.json`,JSON.stringify({rows,errors,wasmSha256:[...wasm][0]},null,2));
}finally{await browser.close();}
