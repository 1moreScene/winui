import {chromium} from '../gallery/node_modules/playwright/index.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
const output='out/content-hosts-visual';mkdirSync(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1.25});
 await context.addInitScript(()=>localStorage.setItem('winui-gallery.theme','Light'));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const rows=[];
 for(const route of ['content-control','content-presenter','user-control','page','scene-frame']){
  await page.goto(`${process.env.WINUI_CONTENT_HOSTS_URL??'http://127.0.0.1:5216'}/#${route}`);
  await page.waitForFunction(route=>!!window.contentHostScenes?.[route==='page'?'content-page':route]?.snapshot.nodes.some(n=>n.contentHost),route);
  if(route==='scene-frame')await page.waitForFunction(()=>window.contentHostFrame?.navigation.frame.current?.page==='first');
  await page.waitForFunction(route=>{const el=document.getElementById(route==='page'?'content-page':route),frame=el?.closest('[data-frame-instance]');return el&&(!frame||!frame.inert);},route);
  await page.locator('#'+(route==='page'?'content-page':route)).screenshot({path:`${output}/${route}.png`});
  rows.push(await page.evaluate(route=>{const s=window.contentHostScenes[route==='page'?'content-page':route];return{route,backend:s.snapshot.backend.kind,nodeCount:s.snapshot.nodes.length};},route));
 }
 if(errors.length)throw Error(errors.join('\n'));
 writeFileSync(`${output}/results.json`,JSON.stringify({rows,errors},null,2));
}finally{await browser.close();}
