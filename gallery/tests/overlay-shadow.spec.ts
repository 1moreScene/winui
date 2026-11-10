import {test,expect} from '@playwright/test';
import {PNG} from 'pngjs';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import type {WinUI} from 'winui-wasm';
declare global {interface Window {shadowUI:WinUI;}}
for(const backend of ['Canvas2D','WebGL2'] as const)test(`${backend} hollow shadow corners and downward projection match native Composition`,async({browser})=>{
 const context=await browser.newContext({viewport:{width:1100,height:650},deviceScaleFactor:1.25});const page=await context.newPage();const rows:object[]=[];
 await page.goto('/#flyout');await expect(page.getByRole('heading',{name:'Flyout',exact:true})).toBeVisible();mkdirSync('../out/overlay-presentation',{recursive:true});
 for(const theme of ['Light','Dark'] as const)for(const z of [16,32]){
  await page.evaluate(async({backend,theme,z})=>{
   const a=await import('/@id/winui-wasm' as string) as typeof import('winui-wasm');window.shadowUI?.dispose();document.querySelector('#shadow-fixture')?.remove();const host=document.createElement('div');host.id='shadow-fixture';host.style.cssText='position:fixed;left:0;top:0;width:1000px;height:500px;z-index:2147483640';document.body.append(host);
   const ui=await a.WinUI.create({globalScrollbars:false});window.shadowUI=ui;const scene=ui.scene(host,{backend:a.RendererBackend[backend],theme:a.ThemeMode[theme],reducedMotion:true,root:{background:theme==='Light'?'#f3f3f3':'#202020'}});const c=scene.root.canvas();
   const owner=c.button({width:100,height:32,opacity:0,canvasLeft:170,canvasTop:z===16?220:224});const props={width:240,height:120,isOpen:false,placement:a.OverlayPlacement.Top,background:theme==='Light'?'#f9f9f9':'#2c2c2c',cornerRadius:8};const surface=z===16?c.toolTip(props):c.flyout(props);surface.showAt(owner);
   await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));
  },{backend,theme,z});
  const png=PNG.sync.read(await page.locator('#shadow-fixture').screenshot({path:`../out/overlay-presentation/${backend}-${theme}-Shadow-${z}.png`}));const native=PNG.sync.read(readFileSync(`../out/overlay-presentation-native/${theme}-Shadow-${z}.png`));
  expect([png.width,png.height]).toEqual([native.width,native.height]);let error=0,count=0,cornerDarkening=0;const bg=theme==='Light'?243:32;
  for(let y=90;y<315;y++)for(let x=90;x<460;x++){
   // Outside the straight bounds, keep one physical pixel clear of edge filtering.
   if(x<124||x>425||y<124||y>275){const at=(y*png.width+x)*4;for(let k=0;k<3;k++){error+=Math.abs(png.data[at+k]-native.data[at+k]);count++;}}
  }
  for(const [cx,cy] of [[135,135],[415,135],[135,265],[415,265]])for(let dy=-10;dy<=10;dy++)for(let dx=-10;dx<=10;dx++){
   const x=cx+dx,y=cy+dy;if(x<125||x>=425||y<125||y>=275||Math.hypot(dx+.5,dy+.5)<10.1)continue;
   // Only the rounded exterior, rather than the panel's interior quadrant.
   if((cx===135?dx>=0:dx<0)||(cy===135?dy>=0:dy<0))continue;
   const at=(y*png.width+x)*4;for(let k=0;k<3;k++)cornerDarkening=Math.max(cornerDarkening,native.data[at+k]-png.data[at+k]);
  }
  const sample=(x:number,y:number)=>bg-png.data[(y*png.width+x)*4];const top=sample(275,123),bottom=sample(275,278);const mae=error/count;
  expect(mae).toBeLessThan(1.6);expect(cornerDarkening).toBeLessThanOrEqual(8);expect(bottom).toBeGreaterThan(top+3);
  rows.push({theme,translationZ:z,externalShadowMAE:mae,maximumCornerDarkening:cornerDarkening,top,bottom});
 }
 writeFileSync(`../references/validation/overlay-shadow-${backend}.json`,JSON.stringify({backend,dpr:1.25,rows,boundary:'Compares live native ThemeShadow own-window captures at Z 16/32; this verifies shadow profiles and rounded exterior pixels, not full control pixel equivalence.'},null,2)+'\n');await context.close();
});
