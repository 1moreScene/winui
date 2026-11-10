import {selectGalleryOption,setGalleryChecked} from './gallery-control-helper';
import {test,expect} from '@playwright/test';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {PNG} from 'pngjs';
import type {Scene,WinUI,AnimatedIconController as AnimatedIcon} from 'winui-wasm';
declare global{interface Window{animatedFixture:{sdk:WinUI;scene:Scene;icons:AnimatedIcon[]};animatedLiveFrames:{progress:number;inkHash:number}[];}}
for(const backend of ['Canvas2D','WebGL2'] as const)test(`${backend} seven animated sources match frozen native Composition frames`,async({browser})=>{
 const metrics=JSON.parse(readFileSync('../references/animated-icons-metrics.json','utf8'));
 const results:object[]=[];
 for(const group of metrics.rows){
  const context=await browser.newContext({deviceScaleFactor:group.captureScale,viewport:{width:1100,height:600}});const page=await context.newPage();await page.goto('/#icon-element');
  await expect(page.getByRole('img',{name:'Slices bitmap icon'})).toBeVisible();
  await page.evaluate(async({group,backend})=>{
   const a=await import('/@id/winui-wasm' as string) as typeof import('winui-wasm');const sdk=await a.WinUI.create({globalScrollbars:false});const host=document.createElement('div');host.id='animated-fixture';host.style.cssText='position:fixed;inset:0;width:1000px;height:500px;z-index:99999';document.body.append(host);const scene=sdk.scene(host,{theme:group.theme,backend:a.RendererBackend[backend],reducedMotion:true});const canvas=scene.root.canvas();const icons=group.nodes.map((r:any)=>canvas.animatedIcon({source:a.AnimatedIconSource[r.name as keyof typeof a.AnimatedIconSource],state:String(r.progress),width:48,height:48,canvasLeft:r.bounds.x,canvasTop:r.bounds.y,foreground:'#0067c0'}));window.animatedFixture={sdk,scene,icons};
  },{group,backend});
  await expect.poll(()=>page.evaluate(()=>window.animatedFixture.scene.snapshot.nodes.filter(n=>n.kind==='AnimatedIcon').length)).toBe(63);
  const actual=PNG.sync.read(await page.locator('#animated-fixture').screenshot());const native=PNG.sync.read(readFileSync(`../out/animated-icons-native/${group.theme}-AnimatedIcons.png`));
  mkdirSync('../out/animated-icons-browser',{recursive:true});writeFileSync(`../out/animated-icons-browser/${group.theme}-${backend}.png`,PNG.sync.write(actual));
  for(const r of group.nodes){let sum=0,count=0;const d=group.captureScale,b=r.bounds;for(let y=b.y*d;y<(b.y+b.height)*d;y++)for(let x=b.x*d;x<(b.x+b.width)*d;x++)for(let c=0;c<3;c++){sum+=Math.abs(actual.data[(y*actual.width+x)*4+c]-native.data[(y*native.width+x)*4+c]);count++;}const mean=sum/count;results.push({theme:group.theme,source:r.name,progress:r.progress,mean});expect(mean,`${group.theme} ${r.name} p=${r.progress}`).toBeLessThan(12);}
  await context.close();
 }
 writeFileSync(`../references/validation/animated-icons-${backend}.json`,JSON.stringify({reference:metrics.reference,acceptedPixelParity:false,rows:results},null,2)+'\n');
});

test('AnimatedIcon Gallery pointer states, fallbacks, sources and remounts use the real SDK',async({page})=>{
 await page.goto('/#animated-icon');
 const button=page.getByRole('button',{name:'AnimatedIcon Example',exact:true});
 await expect(button).toBeVisible();
 await button.hover();
 await expect.poll(()=>page.evaluate(()=>window.animatedGallery.button.snapshot.nodes.find(n=>n.kind==='AnimatedIcon')?.animatedIcon?.state)).toBe('PointerOver');
 await page.waitForTimeout(200);
 const ink=async()=>page.evaluate(()=>{const scene=window.animatedGallery.button;const canvas=scene.element.querySelector('canvas')!;const ctx=canvas.getContext('2d')!;const node=scene.snapshot.nodes.find(n=>n.kind==='AnimatedIcon')!;const [,,,,x,y]=node.world;const data=ctx.getImageData(Math.round(x),Math.round(y),Math.round(node.rect.width),Math.round(node.rect.height)).data;let count=0;for(let i=0;i<data.length;i+=4)if(data[i]<90&&data[i+1]<90&&data[i+2]<90)count++;return count;});
 const normalInk=await ink();const box=(await button.boundingBox())!;
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
 await expect.poll(()=>page.evaluate(()=>window.animatedGallery.button.snapshot.nodes.find(n=>n.kind==='AnimatedIcon')?.animatedIcon?.state)).toBe('Pressed');
 await page.waitForTimeout(200);expect(await ink()).toBeLessThan(normalInk*.9);
 await page.mouse.up();
 await expect.poll(()=>page.evaluate(()=>window.animatedGallery.button.snapshot.nodes.find(n=>n.kind==='AnimatedIcon')?.animatedIcon?.state)).toBe('PointerOver');
 await button.focus();await page.keyboard.down('Space');
 await expect.poll(()=>page.evaluate(()=>window.animatedGallery.button.snapshot.nodes.find(n=>n.kind==='AnimatedIcon')?.animatedIcon?.state)).toBe('Pressed');
 await page.keyboard.up('Space');
 await page.mouse.move(0,0);
 await expect.poll(()=>page.evaluate(()=>window.animatedGallery.button.snapshot.nodes.find(n=>n.kind==='AnimatedIcon')?.animatedIcon?.state)).toBe('Normal');
 await selectGalleryOption(page.getByLabel('Animation kind'),'Settings');
 await page.evaluate(()=>{
  const scene=window.animatedGallery.button,canvas=scene.element.querySelector('canvas')!,ctx=canvas.getContext('2d')!,until=performance.now()+700;window.animatedLiveFrames=[];
  const sample=()=>{const n=scene.snapshot.nodes.find(n=>n.kind==='AnimatedIcon')!;const [,,,,x,y]=n.world;const pixels=ctx.getImageData(Math.round(x),Math.round(y),Math.round(n.rect.width),Math.round(n.rect.height)).data;let hash=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]<90&&pixels[i+1]<90&&pixels[i+2]<90)hash=(hash+Math.imul(i+1,2654435761))>>>0;window.animatedLiveFrames.push({progress:n.animatedIcon!.progress,inkHash:hash});if(performance.now()<until)requestAnimationFrame(sample);};requestAnimationFrame(sample);
 });
 await button.hover();await page.waitForTimeout(400);
 const frames=await page.evaluate(()=>window.animatedLiveFrames);
 expect(new Set(frames.map(f=>f.inkHash)).size,'real hover changes the dark icon pixels, independently of button background').toBeGreaterThan(2);
 for(const source of ['Back','ChevronDownSmall','ChevronRightDownSmall','ChevronUpDownSmall','Find','GlobalNavigationButton','Settings']){
  await selectGalleryOption(page.getByLabel('Animation kind'),source);
  await expect.poll(()=>page.evaluate(()=>window.animatedGallery.button.snapshot.nodes.find(n=>n.kind==='AnimatedIcon')?.props.source)).toBe(source);
 }
 await selectGalleryOption(page.getByLabel('Animation kind'),'ChevronUpDownSmall');
 await button.click();
 await expect.poll(()=>page.evaluate(()=>window.animatedGallery.button.snapshot.nodes.find(n=>n.kind==='AnimatedIcon')?.animatedIcon?.state.endsWith('On'))).toBe(true);
 await button.click();
 await expect.poll(()=>page.evaluate(()=>window.animatedGallery.button.snapshot.nodes.find(n=>n.kind==='AnimatedIcon')?.animatedIcon?.state.endsWith('Off'))).toBe(true);
 await setGalleryChecked(page.getByLabel('Show fallback'),true);
 await expect.poll(()=>page.evaluate(()=>window.animatedGallery.button.snapshot.nodes.find(n=>n.kind==='AnimatedIcon')?.props.source)).toBe('');
 await setGalleryChecked(page.getByLabel('Reduce motion'),true);
 await button.hover();
 await expect.poll(()=>page.evaluate(()=>window.animatedGallery.button.snapshot.nodes.find(n=>n.kind==='AnimatedIcon')?.animatedIcon?.active)).toBe(false);
 await page.locator('#animated-button').getByRole('button',{name:'Source code',exact:true}).click();
 await expect(page.locator('#animated-button pre')).toContainText('<AnimatedIcon source=');
 await selectGalleryOption(page.getByLabel('Renderer',{exact:true}),'WebGL2');
 await expect(button).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>window.animatedGallery.button.snapshot.backend.kind)).toBe('WebGL2');
 await page.goto('/#icon-element');
 await expect(page.getByRole('img',{name:'Slices bitmap icon'})).toBeVisible();
 await expect(page.getByRole('button',{name:'AnimatedIcon Example',exact:true})).toHaveCount(0);
});
