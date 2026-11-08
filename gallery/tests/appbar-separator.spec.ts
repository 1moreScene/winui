import {test,expect} from '@playwright/test';
import {PNG} from 'pngjs';
import {writeFileSync} from 'node:fs';
test('AppBarSeparator official command sample, source and nonfocusable semantics',async({page},testInfo)=>{
 await page.goto('/#app-bar-separator');
 await expect(page.getByRole('heading',{name:'AppBarSeparator',exact:true})).toBeVisible();
 await expect(page.getByRole('separator')).toHaveCount(2);
 const states=await page.evaluate(()=>window.commandMenuScene.snapshot.nodes.filter(n=>n.kind==='AppBarSeparator').map(n=>({visible:n.visible,tabStop:n.tabStop,width:n.rect.width,height:n.rect.height})));
 expect(states).toHaveLength(2);for(const state of states){expect(state.visible).toBe(true);expect(state.tabStop).toBe(false);expect(state.width).toBeGreaterThan(0);expect(state.width).toBeLessThan(7);}
 await page.getByRole('button',{name:'More',exact:true}).click();
 await expect(page.getByRole('separator')).toHaveCount(2);
 await expect.poll(()=>page.evaluate(()=>window.commandMenuScene.snapshot.animating)).toBe(false);
 const presentation=await page.evaluate(()=>{const scene=window.commandMenuScene;const bar=scene.snapshot.nodes.find(n=>n.kind==='CommandBar')!;const host=document.querySelector('#separator-0 .winui-scene')??document.querySelector('#separator-0 canvas')!.parentElement!;const source=document.querySelector('#separator-0 .source')!.getBoundingClientRect();return{body:bar.command!.body.height,host:host.getBoundingClientRect().height,sourceTop:source.top,hostBottom:host.getBoundingClientRect().bottom};});
 expect(presentation.host).toBeGreaterThanOrEqual(presentation.body);
 expect(presentation.sourceTop).toBeGreaterThanOrEqual(presentation.hostBottom-1);
 const expanded=await page.locator('#separator-0').screenshot();writeFileSync('../out/appbar-separator-expanded.png',expanded);await testInfo.attach('official-example-expanded',{body:expanded,contentType:'image/png'});
 await page.getByRole('button',{name:'Source code',exact:true}).click();
 await expect(page.locator('pre')).toContainText('CommandBarItemKind.Separator');
 expect(await page.locator('pre').textContent()).not.toContain('options={{');
});
for(const backend of ['Canvas2D','WebGL2'] as const)test(backend+' public AppBarSeparator factory uses the shared Rust template',async({page})=>{
 await page.goto('/#app-bar-separator');await page.getByRole('separator').first().waitFor();
 const state=await page.evaluate(async backend=>{
  const a=await import('/src/index.ts' as string) as typeof import('../src/index');const ui=await a.WinUI.create({globalScrollbars:false});const host=document.createElement('div');host.style.cssText='position:fixed;inset:0;width:400px;height:160px';document.body.append(host);
  const scene=ui.scene(host,{backend:a.RendererBackend[backend]});const row=scene.root.stack({height:64,orientation:a.Orientation.Horizontal});row.appBarButton({label:'Before'});const separator=row.appBarSeparator();row.appBarButton({label:'After'});
  await new Promise(r=>setTimeout(r,150));const first=separator.snapshot;separator.update({foreground:'#ff0000',padding:[2,12,2,12]});await new Promise(r=>setTimeout(r,100));const second=separator.snapshot;const result={kind:first.kind,width:first.rect.width,height:first.rect.height,tab:first.tabStop,foreground:separator.properties.foreground,afterHeight:second.rect.height};scene.dispose();ui.dispose();host.remove();return result;
 },backend);
 expect(state.kind).toBe('AppBarSeparator');expect(state.tab).toBe(false);expect(state.width).toBeLessThan(7);expect(state.height).toBe(64);expect(state.afterHeight).toBe(64);expect(state.foreground).toBe('#ff0000');
});

for(const backend of ['Canvas2D','WebGL2'] as const)test(backend+' primary row animates, shows complete labels and remains clickable below compact bounds',async({page},testInfo)=>{
 await page.goto('/#app-bar-separator');await page.getByRole('separator').first().waitFor();
 await page.evaluate(async backend=>{
  const a=await import('/src/index.ts' as string) as typeof import('../src/index');const f:any={time:1000,events:[]};
  f.ui=await a.WinUI.create({clock:()=>f.time,globalScrollbars:false});f.host=document.createElement('div');f.host.id='primary-expansion';f.host.style.cssText='position:fixed;left:0;top:0;width:600px;height:48px;z-index:999999';document.body.append(f.host);
  f.scene=f.ui.scene(f.host,{autoHeight:true,backend:a.RendererBackend[backend],root:{background:'#f3f3f3'}});
  f.bar=f.scene.root.commandBar({primaryCommands:[{id:'camera',label:'Attach Camera'},{id:'orientation',label:'Screen orientation'}]});f.bar.onCommandInvoked((e:any)=>f.events.push(e.command.id));(window as any).__primaryExpansion=f;
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 },backend);
 const frame=async(time:number)=>page.evaluate(async time=>{const f=(window as any).__primaryExpansion;f.time=time;f.scene.root.update({opacity:1});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const bar=f.bar.snapshot;return{clip:bar.command.primaryClip.height,body:bar.command.body.height,progress:bar.command.expansionProgress,logical:bar.rect.height,host:f.host.getBoundingClientRect().height,canvas:f.host.querySelector('canvas').height/devicePixelRatio,root:f.scene.snapshot.nodes.find((n:any)=>n.id===f.scene.snapshot.root).rect.height};},time);
 await page.evaluate(()=>(window as any).__primaryExpansion.bar.open());
 const start=await frame(1000),middle=await frame(1040),end=await frame(1260);
 expect(start.clip).toBe(48);expect(middle.clip).toBeGreaterThan(48);expect(middle.clip).toBeLessThan(middle.body);expect(end.clip).toBe(end.body);expect(end.logical).toBe(48);expect(end.host).toBeGreaterThanOrEqual(end.body);expect(end.canvas).toBeGreaterThanOrEqual(end.body);
 const pngBytes=await page.locator('#primary-expansion').screenshot();await testInfo.attach('expanded-labels',{body:pngBytes,contentType:'image/png'});const png=PNG.sync.read(pngBytes),scale=png.width/600;let ink=0;
 for(let y=Math.ceil(49*scale);y<png.height-3*scale;y++)for(let x=0;x<png.width;x++){const at=(y*png.width+x)*4;if(png.data[at]<128&&png.data[at+1]<128&&png.data[at+2]<128)ink++;}
 expect(ink,'second-line caption pixels below compact height').toBeGreaterThan(5);
 const camera=page.locator('#primary-expansion').getByRole('button',{name:'Attach Camera',exact:true});const box=await camera.boundingBox();await camera.click({position:{x:box!.width/2,y:box!.height-3}});
 await expect.poll(()=>page.evaluate(()=>(window as any).__primaryExpansion.events)).toEqual(['camera']);
 await frame(1260);const closing=await frame(1300);expect(closing.clip).toBeLessThan(closing.body);expect(closing.clip).toBeGreaterThan(48);
 await page.evaluate(()=>(window as any).__primaryExpansion.bar.open());const reversed=await frame(1300);expect(reversed.clip).toBeCloseTo(closing.clip,4);await frame(1600);
 await page.evaluate(()=>{const f=(window as any).__primaryExpansion;f.scene.dispose();f.ui.dispose();f.host.remove();});
});
