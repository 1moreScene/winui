import {test,expect} from '@playwright/test';
import {PNG} from 'pngjs';
import {mkdirSync,writeFileSync} from 'node:fs';
import type {WinUI,Scene,FloatingSurface} from '../src/index';
declare global {interface Window {menuMotion:{ui:WinUI;scene:Scene;menu:FloatingSurface;time:number};}}
for(const backend of ['Canvas2D','WebGL2'] as const)test(`${backend} menu translates at full size inside native window insets`,async({page})=>{
 await page.goto('/#menu-flyout');await expect(page.getByRole('heading',{name:'MenuFlyout',exact:true})).toBeVisible();const rows:object[]=[];mkdirSync('../out/overlay-presentation',{recursive:true});
 for(const side of ['Top','Bottom','Left','Right'] as const){
  await page.evaluate(async({backend,side})=>{
   const a=await import('/src/index.ts' as string) as typeof import('../src/index');window.menuMotion?.ui.dispose();document.querySelector('#menu-motion')?.remove();const host=document.createElement('div');host.id='menu-motion';host.style.cssText='position:fixed;left:0;top:0;width:640px;height:480px;z-index:2147483640';document.body.append(host);
   const f={time:1000} as Window['menuMotion'];window.menuMotion=f;f.ui=await a.WinUI.create({globalScrollbars:false,clock:()=>f.time});f.scene=f.ui.scene(host,{backend:a.RendererBackend[backend],reducedMotion:false,root:{background:'#f3f3f3'}});const c=f.scene.root.canvas();const owner=c.button({width:80,height:32,canvasLeft:280,canvasTop:220,opacity:0});f.menu=c.menuFlyout({width:200,height:120,background:'#ff0000',isOpen:false,placement:a.OverlayPlacement[side],menuItems:[{id:'one',text:'Command'}]});f.menu.showAt(owner);await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));
  },{backend,side});
  for(const time of [1000,1100,1500]){
   const n=await page.evaluate(async t=>{const f=window.menuMotion;f.time=t;f.scene.root.update({opacity:1});await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));const n=f.menu.snapshot;return {rect:n.rect,overlay:n.overlay!};},time);
   expect(n.overlay.actualPlacement).toBe(side);expect(n.overlay.offset[0]).toBe(0);if(time===1000)expect(n.overlay.offset[1]).toBe(side==='Top'?60:-60);
   const png=PNG.sync.read(await page.locator('#menu-motion').screenshot({path:`../out/overlay-presentation/${backend}-Menu-${side}-${time}.png`}));let minY=png.height,maxY=-1;
   const x=Math.round(n.rect.x+n.rect.width/2);
   for(let y=0;y<png.height;y++){const at=(y*png.width+x)*4;if(png.data[at]>220&&png.data[at+1]<35&&png.data[at+2]<35){minY=Math.min(minY,y);maxY=Math.max(maxY,y);}}
   const dy=n.overlay.offset[1],clip=n.overlay.clip;const expectedTop=n.rect.y+dy+Math.max(1,clip.y),expectedBottom=n.rect.y+dy+Math.min(n.rect.height-1,clip.y+clip.height);
   expect(Math.abs(minY-expectedTop)).toBeLessThanOrEqual(1.5);expect(Math.abs(maxY+1-expectedBottom)).toBeLessThanOrEqual(1.5);
   // Native popup islands clip the complete moving presenter and its shadow.
   if(time===1000){const wrongY=Math.round(side==='Top'?n.rect.y+dy+clip.y+clip.height+2:n.rect.y+dy+clip.y-2);const at=(wrongY*png.width+x)*4;expect(png.data[at]).toBeGreaterThanOrEqual(241);}
   rows.push({side,time,offset:n.overlay.offset,expectedTop,expectedBottom,minY,maxY});
  }
 }
 await page.evaluate(()=>{window.menuMotion.ui.dispose();document.querySelector('#menu-motion')?.remove();});writeFileSync(`../references/validation/overlay-menu-motion-${backend}.json`,JSON.stringify({backend,rows},null,2)+'\n');
});
