import {chromium} from '../gallery/node_modules/playwright/index.mjs';
import pngjs from '../gallery/node_modules/pngjs/lib/png.js';
import {writeFileSync,mkdirSync} from 'node:fs';
const {PNG}=pngjs;
const browser=await chromium.launch({channel:'chrome'}),results=[];
mkdirSync('out/text-scroll',{recursive:true});
const pixel=(bytes,x,y)=>{const p=PNG.sync.read(bytes),at=(y*p.width+x)*4;return Array.from(p.data.subarray(at,at+4));};
try {
  for(const backend of ['Canvas2D','WebGL2']){
    const page=await browser.newPage({viewport:{width:1000,height:600}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:5173/');
    await page.locator('#runtime-status').filter({hasText:'Ready'}).waitFor();
    await page.evaluate(async backend=>{
      const a=await import('/src/index.ts');const host=document.createElement('div');host.id='scroll-material';
      host.style.cssText='position:fixed;inset:0;width:400px;height:266px;z-index:99999';document.body.append(host);
      window.materialScene=window.gallery.sdk.scene(host,{backend:a.RendererBackend[backend],reducedMotion:true});
      const view=window.materialScene.root.scrollViewer({width:400,height:266,horizontalScrollBarVisibility:a.ScrollBarVisibility.Auto});
      view.grid({width:1000,height:800,background:'#0000ff'});
    },backend);
    await page.locator('#scroll-material [role=region]').waitFor();await page.mouse.move(395,25);await page.waitForTimeout(100);
    const diagnostics=await page.evaluate(()=>window.materialScene.snapshot.backend);
    const acrylic=await page.locator('#scroll-material').screenshot({path:`out/text-scroll/${backend}-scroll-acrylic.png`});
    await page.evaluate(()=>window.materialScene.configure({reducedTransparency:true}));await page.waitForTimeout(100);
    const fallback=await page.locator('#scroll-material').screenshot({path:`out/text-scroll/${backend}-scroll-fallback.png`});
    const body=pixel(acrylic,100,100),track=pixel(acrylic,393,120),solid=pixel(fallback,393,120);
    if(errors.length||diagnostics.lost||body[2]<200||body[0]>5||track[0]<20||solid[0]<150||Math.abs(solid[0]-solid[2])>3)throw Error(`Scroll material regression: ${JSON.stringify({backend,errors,body,track,solid})}`);
    results.push({backend,errors,diagnostics,body,acrylicTrack:track,fallbackTrack:solid});await page.close();
  }
  writeFileSync('references/validation/scroll-material.json',JSON.stringify({results,acceptedNativeMaterialParity:false},null,2)+'\n');
  console.log(JSON.stringify(results));
} finally {await browser.close();}
