import {test,expect} from '@playwright/test';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {PNG} from 'pngjs';
import type {WinUI,Scene,Slider} from '../src/index';
declare global {interface Window {floatingFixture:{ui:WinUI;scene:Scene;slider:Slider};}}
for(const backend of ['Canvas2D','WebGL2'] as const) test(`${backend} Slider native static matrix at fractional DPR`,async({browser})=>{
 test.setTimeout(120000);const context=await browser.newContext({viewport:{width:1200,height:720},deviceScaleFactor:1.25});const page=await context.newPage();
 const native=JSON.parse(readFileSync('../references/overlay-metrics.json','utf8').replace(/^\uFEFF/,''));const rows:{theme:string;index:number;activeMAE:number;geometryError:number}[]=[];
 await page.goto('/#overlays');await expect(page.getByRole('heading',{name:'Slider',exact:true})).toBeVisible();
 for(const item of native.matrix) {
  const geometry=await page.evaluate(async({item,backend})=>{
   const a=await import('/src/index.ts' as string) as typeof import('../src/index');window.floatingFixture?.ui.dispose();document.querySelector('#floating-fixture')?.remove();
   const host=document.createElement('div');host.id='floating-fixture';host.style.cssText='position:fixed;left:0;top:0;width:1000px;height:500px;z-index:2147483640';document.body.append(host);
   const ui=await a.WinUI.create({globalScrollbars:false});const scene=ui.scene(host,{backend:a.RendererBackend[backend],theme:a.ThemeMode[item.theme as keyof typeof a.ThemeMode],reducedMotion:true});const canvas=scene.root.canvas();
   const {state,...props}=item.props;const slider=canvas.slider({...props,orientation:props.orientation as import('../src/index').Orientation,canvasLeft:24,canvasTop:24,isThumbToolTipEnabled:false});window.floatingFixture={ui,scene,slider};
   await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
   let n=slider.snapshot;let t=n.slider!.thumb;const x=n.world[4]+t.x+t.width/2,y=n.world[5]+t.y+t.height/2;
   if(state==='PointerOver'||state==='Pressed')scene.input(slider,{kind:'move',x,y,pointer:1});
   if(state==='Pressed')scene.input(slider,{kind:'down',x,y,pointer:1});
   await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
   n=slider.snapshot;t=n.slider!.thumb;return {thumb:{x:n.world[4]+t.x,y:n.world[5]+t.y,width:t.width,height:t.height},track:{x:n.world[4]+n.slider!.track.x,y:n.world[5]+n.slider!.track.y,width:n.slider!.track.width,height:n.slider!.track.height}};
  },{item,backend});
  const png=PNG.sync.read(await page.locator('#floating-fixture canvas').screenshot());const reference=PNG.sync.read(readFileSync(`../out/overlays-native/${item.theme}-Slider-${item.index}.png`));
  expect([png.width,png.height]).toEqual([reference.width,reference.height]);const scale=png.width/1000;const r=item.bounds;const bg=item.theme==='Light'?243:32;let error=0,active=0;
  for(let y=Math.floor((r.y-4)*scale);y<Math.ceil((r.y+r.height+4)*scale);y++)for(let x=Math.floor((r.x-4)*scale);x<Math.ceil((r.x+r.width+4)*scale);x++) {
   const at=(y*png.width+x)*4;let visible=false;for(let k=0;k<3;k++)visible ||= Math.abs(reference.data[at+k]-bg)>2||Math.abs(png.data[at+k]-bg)>2;
   if(visible){active++;for(let k=0;k<3;k++)error+=Math.abs(reference.data[at+k]-png.data[at+k]);}
  }
  const activeMAE=error/Math.max(1,active*3);let geometryError=0;for(const part of ['thumb','track'] as const)for(const k of ['x','y','width','height'] as const)geometryError=Math.max(geometryError,Math.abs(geometry[part][k]-item[part][k]));
  rows.push({theme:item.theme,index:item.index,activeMAE,geometryError});
 }
 mkdirSync('../references/validation',{recursive:true});writeFileSync(`../references/validation/overlays-${backend}.json`,JSON.stringify({backend,dpr:1.25,rows,maximumGeometryError:Math.max(...rows.map(r=>r.geometryError)),maximumActiveMAE:Math.max(...rows.map(r=>r.activeMAE)),scope:'Forced-state static probe. Active-pixel error is diagnostic; native Composition timing, shadows and full pixel equivalence are not accepted.'},null,2)+'\n');
 expect(Math.max(...rows.map(r=>r.geometryError))).toBeLessThanOrEqual(0.81);expect(rows.every(r=>Number.isFinite(r.activeMAE))).toBe(true);
 await context.close();
});
