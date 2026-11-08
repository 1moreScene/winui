import {selectGalleryOption} from './gallery-control-helper';
import {test,expect} from '@playwright/test';import {PNG} from 'pngjs';
import {mkdirSync} from 'node:fs';
for(const backend of ['Canvas2D','WebGL2'])test(`${backend} Popup Acrylic respects all rounded corners in light, dark and solid fallback`,async({browser})=>{
 mkdirSync('../out/popup-corners',{recursive:true});const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1.25});const page=await context.newPage();await page.goto('/#popup');await selectGalleryOption(page.getByRole('combobox',{name:'Renderer',exact:true}),backend);
 for(const theme of ['Light','Dark']){await selectGalleryOption(page.locator('#theme'),theme);await page.getByRole('button',{name:'Show Popup (using Offset)',exact:true}).click();await expect(page.getByRole('button',{name:'Close Popup',exact:true})).toBeVisible();
 for(const fallback of [false,true]){const border=await page.evaluate(async fallback=>{const s=window.overlayScenes.popup;s.configure({reducedMotion:true,reducedTransparency:fallback});await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));const b=s.snapshot.nodes.find(n=>n.kind==='Border')!;return {x:b.world[4],y:b.world[5],width:b.rect.width,height:b.rect.height};},fallback);const canvas=page.locator('#overlay-popup .winui-scene canvas').first();const png=PNG.sync.read(await canvas.screenshot({path:`../out/popup-corners/${backend}-${theme}-${fallback}.png`}));const scale=png.width/(await canvas.boundingBox())!.width;const bg=theme==='Dark'?32:243;
 for(const [x,y] of [[border.x+1,border.y+1],[border.x+border.width-1,border.y+1],[border.x+1,border.y+border.height-1],[border.x+border.width-1,border.y+border.height-1]]){const at=(Math.floor(y*scale)*png.width+Math.floor(x*scale))*4;for(let k=0;k<3;k++)expect(Math.abs(png.data[at+k]-bg)).toBeLessThanOrEqual(1);}
 const inside=(Math.floor((border.y+border.height-12)*scale)*png.width+Math.floor((border.x+border.width/2)*scale))*4;expect(png.data[inside]).toBeGreaterThan(bg+2);
 }await page.getByRole('button',{name:'Close Popup',exact:true}).click();}
 await context.close();
});

for(const backend of ['Canvas2D','WebGL2'])test(`${backend} high contrast material aliases retain asymmetric corner clipping`,async({page})=>{
 await page.goto('/tests/react-mount.html');
 for(const radii of [[24,8,20,4],[80,0,0,0]]){
  await page.evaluate(async({backend,radii})=>{
   const a=await import('/src/index.ts' as string) as typeof import('../src/index');
   window.overlayScenes??={};window.overlayScenes['corner-hc']?.dispose();document.querySelector('#corner-hc')?.remove();
   const host=document.createElement('div');host.id='corner-hc';host.style.cssText='position:fixed;inset:0;width:400px;height:240px';document.body.append(host);
   const ui=await a.WinUI.create({globalScrollbars:false});const scene=ui.scene(host,{theme:a.ThemeMode.HighContrast,backend:a.RendererBackend[backend as keyof typeof a.RendererBackend],reducedMotion:true,root:{background:'#ff0000'}});window.overlayScenes['corner-hc']=scene;
   const popup=scene.root.canvas().popup({isOpen:true,horizontalOffset:40,verticalOffset:40,autoFocus:false});
   popup.border({width:200,height:120,cornerRadii:radii as [number,number,number,number],borderThickness:[1,2,3,4],acrylicResource:'FlyoutPresenterBackground'});
  },{backend,radii});
  await expect.poll(()=>page.evaluate(()=>window.overlayScenes['corner-hc'].snapshot.nodes.length)).toBe(4);
  const png=PNG.sync.read(await page.locator('#corner-hc canvas').screenshot());const d=png.width/400;
  const rgb=(x:number,y:number)=>{const at=(Math.floor(y*d)*png.width+Math.floor(x*d))*4;return [...png.data.subarray(at,at+3)];};
  const corners=[[40.25,40.25],[239.75,40.25],[239.75,159.75],[40.25,159.75]];
  for(let i=0;i<4;i++)if(radii[i]>0)expect(rgb(...corners[i] as [number,number])).toEqual([255,0,0]);
  expect(rgb(140,100)).toEqual([0,0,0]);
 }
});
