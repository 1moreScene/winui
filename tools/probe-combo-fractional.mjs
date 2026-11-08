import {chromium} from '../gallery/node_modules/playwright/index.mjs';
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({channel:process.env.PW_CHANNEL??'chrome'}),rows=[];
try{for(const dpr of process.env.PROBE_DPRS?.split(',').map(Number)??[1,1.1,1.2,1.25,1.3333333333333,1.375,1.5,1.5625,1.6666666667,1.75,2,2.25]){
const page=await browser.newPage({viewport:{width:1536,height:864},deviceScaleFactor:dpr});await page.goto('http://127.0.0.1:5173/#combo-box');const box=page.getByRole('combobox',{name:'Font',exact:true});await box.click();await page.waitForTimeout(650);rows.push(await page.evaluate(dpr=>{const s=window.composedScenes.ComboBoxFonts.snapshot,n=s.nodes.find(n=>n.kind==='ListView');return{dpr,rect:n.rect,scroll:n.scroll};},dpr));await page.screenshot({path:`out/combo-fractional-${process.env.PROBE_LABEL??'before'}-${dpr}.png`});await page.close();
}}finally{await browser.close();}writeFileSync('out/combo-fractional.json',JSON.stringify(rows,null,2));console.log(rows.map(r=>({dpr:r.dpr,max:r.scroll.scrollableHeight,extent:r.scroll.extentHeight,viewport:r.scroll.viewportHeight,thumb:r.scroll.verticalThumb})));
