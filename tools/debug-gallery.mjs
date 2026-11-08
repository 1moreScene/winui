import { createRequire } from 'node:module';
const require=createRequire(new URL('../gallery/package.json',import.meta.url));const{chromium}=require('playwright');
const browser=await chromium.launch({channel:'chrome'});try{const page=await browser.newPage();page.on('pageerror',e=>console.log('PAGE ERROR',e));page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text());});await page.goto('http://127.0.0.1:5173/');await page.waitForTimeout(1000);console.log((await page.locator('body').innerText()).slice(0,800));}finally{await browser.close();}
