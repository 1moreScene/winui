import {test,expect} from '@playwright/test';
import {PNG} from 'pngjs';
import {mkdirSync,writeFileSync} from 'node:fs';
import type {WinUI,Scene,FloatingSurface,SceneNode} from '../src/index';
declare global {interface Window {overlayVisualFixture:{ui:WinUI;scene:Scene;surface:FloatingSurface;owner:SceneNode;time:number;events:string[]};}}
for(const backend of ['Canvas2D','WebGL2'] as const)test(`${backend} shared floating presentation animates, casts hollow shadows and samples Acrylic`,async({page})=>{
 test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const rows:object[]=[];
 await page.goto('/#flyout');await expect(page.getByRole('heading',{name:'Flyout',exact:true})).toBeVisible();
 mkdirSync('../out/overlay-presentation',{recursive:true});
 for(const kind of ['Flyout','MenuFlyout','ToolTip'] as const){
  await page.evaluate(async({kind,backend})=>{
   const a=await import('/src/index.ts' as string) as typeof import('../src/index');window.overlayVisualFixture?.ui.dispose();document.querySelector('#overlay-visual-fixture')?.remove();
   const host=document.createElement('div');host.id='overlay-visual-fixture';host.style.cssText='position:fixed;left:0;top:0;width:480px;height:320px;z-index:2147483640';document.body.append(host);
   const f={time:1000,events:[]} as unknown as Window['overlayVisualFixture'];window.overlayVisualFixture=f;f.ui=await a.WinUI.create({globalScrollbars:false,clock:()=>f.time});f.scene=f.ui.scene(host,{backend:a.RendererBackend[backend],reducedMotion:false});
   // Coarse stripes distinguish scene sampling from a popup window's local Backdrop.
   const canvas=f.scene.root.canvas();for(let x=0;x<480;x+=80)canvas.rectangle({canvasLeft:x,width:80,height:320,fill:x%160?'#247abb':'#ff735c'});
   f.owner=canvas.button({text:'Anchor',width:100,height:32,canvasLeft:180,canvasTop:250});
   const options={width:240,height:120,isOpen:false,placement:a.OverlayPlacement.Top};
   f.surface=kind==='Flyout'?canvas.flyout(options):kind==='ToolTip'?canvas.toolTip({...options,text:'Material ToolTip'}):canvas.menuFlyout({...options,menuItems:[{id:'one',text:'Command'},{id:'two',text:'Option',kind:a.MenuEntryKind.Toggle}]});
   if(kind==='Flyout')f.surface.text({text:'Material Flyout'});
   for(const event of [a.EventKind.Opening,a.EventKind.Opened,a.EventKind.Closed])f.surface.on(event,()=>f.events.push(event));
   await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));
  },{kind,backend});
  const canvas=page.locator('#overlay-visual-fixture');const closed=PNG.sync.read(await canvas.screenshot());
  await page.evaluate(()=>window.overlayVisualFixture.surface.showAt(window.overlayVisualFixture.owner));
  async function frame(time:number){return page.evaluate(async time=>{const f=window.overlayVisualFixture;f.time=time;f.scene.root.update({opacity:1});await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));const n=f.surface.snapshot;return {overlay:n.overlay!,rect:n.rect,world:n.world,events:[...f.events],animating:f.scene.snapshot.animating};},time);}
  const initial=await frame(1000),middle=await frame(1100),settled=await frame(1500);
  expect(initial.overlay.active).toBe(true);expect(middle.overlay.active).toBe(true);expect(settled.overlay.active).toBe(false);expect(settled.overlay.opacity).toBe(1);expect(settled.overlay.offset).toEqual([0,0]);expect(settled.events.filter(e=>e==='opened')).toHaveLength(1);
  if(kind!=='ToolTip')expect(Math.abs(middle.overlay.offset[1])+Math.abs(middle.overlay.offset[0])).toBeGreaterThan(0);else expect(middle.overlay.opacity).toBeGreaterThan(initial.overlay.opacity);
  const active=PNG.sync.read(await canvas.screenshot({path:`../out/overlay-presentation/${backend}-${kind}.png`}));
  const r=settled.rect;let shadowDelta=0,samples=0;
  for(let y=Math.ceil(r.y+20);y<Math.floor(r.y+r.height-20);y++)for(let x=Math.floor(r.x-8);x<Math.floor(r.x-1);x++){
   const at=(y*active.width+x)*4;for(let k=0;k<3;k++)shadowDelta+=closed.data[at+k]-active.data[at+k];samples+=3;
  }
  shadowDelta/=samples;expect(shadowDelta).toBeGreaterThan(0.5);
  await page.evaluate(()=>window.overlayVisualFixture.scene.configure({reducedTransparency:true}));await frame(1500);const fallback=PNG.sync.read(await canvas.screenshot());
  function range(image:PNG){let min=255,max=0;for(let x=Math.ceil(r.x+25);x<Math.floor(r.x+r.width-25);x++){const at=(Math.floor(r.y+r.height-20)*image.width+x)*4;min=Math.min(min,image.data[at]);max=Math.max(max,image.data[at]);}return max-min;}
  const activeRange=range(active),fallbackRange=range(fallback);expect(activeRange).toBeGreaterThan(fallbackRange+2);expect(fallbackRange).toBeLessThanOrEqual(1);
  let chroma=0;for(let x=Math.ceil(r.x+25);x<Math.floor(r.x+r.width-25);x++){const at=(Math.floor(r.y+r.height-20)*active.width+x)*4;chroma=Math.max(chroma,Math.abs(active.data[at]-active.data[at+1]),Math.abs(active.data[at+1]-active.data[at+2]));}
  if(kind==='ToolTip')expect(chroma).toBeLessThanOrEqual(1);else expect(chroma).toBeGreaterThan(5);
  await page.evaluate(()=>window.overlayVisualFixture.surface.update({isOpen:false}));const exiting=await frame(1540);expect(exiting.overlay.isOpen).toBe(false);
  if(kind==='MenuFlyout'){expect(exiting.overlay.opacity).toBe(0);expect(exiting.events.filter(e=>e==='closed')).toHaveLength(1);}else{expect(exiting.overlay.opacity).toBeGreaterThan(0);expect(exiting.overlay.opacity).toBeLessThan(1);}
  await page.evaluate(()=>window.overlayVisualFixture.surface.show());const reversed=await frame(1540);if(kind==='MenuFlyout')expect(reversed.overlay.opacity).toBe(1);else expect(reversed.overlay.opacity).toBeCloseTo(exiting.overlay.opacity,6);await frame(2100);
  await page.evaluate(()=>window.overlayVisualFixture.surface.update({isOpen:false}));const finished=await frame(2500);expect(finished.animating).toBe(false);expect(finished.events.filter(e=>e==='closed')).toHaveLength(kind==='MenuFlyout'?2:1);
  rows.push({kind,shadowDelta,activeRange,fallbackRange,chroma,initial:initial.overlay,middle:middle.overlay,settled:settled.overlay});
 }
 await page.evaluate(()=>{window.overlayVisualFixture.ui.dispose();document.querySelector('#overlay-visual-fixture')?.remove();});expect(errors).toEqual([]);
 writeFileSync(`../references/validation/overlay-presentation-${backend}.json`,JSON.stringify({backend,rows,errors,boundary:'Browser pixels prove shadow/material/motion behavior; source parameters and native timing records are pinned, but full live native compositor parity is not asserted.'},null,2)+'\n');
});
