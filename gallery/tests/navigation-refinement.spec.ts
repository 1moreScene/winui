import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {PNG} from 'pngjs';
const folder='../out/navigation-refinement-browser';
for(const backend of ['Canvas2D','WebGL2'])test(`${backend} TabView actually paints entrance/add/delete frames and settles`,async({page})=>{
 mkdirSync(folder,{recursive:true});await page.goto('/#tab-view');await page.locator('#tab-0 [role="tab"]').first().waitFor();
 await page.evaluate(async backend=>{const a=await import('/@id/winui-wasm' as string) as typeof import('winui-wasm');const sdk=await a.WinUI.create({globalScrollbars:false});const host=document.createElement('div');host.id='motion-test';host.style.cssText='position:fixed;left:0;top:0;width:400px;height:240px;z-index:99999';document.body.append(host);const scene=sdk.scene(host,{backend:backend as import('winui-wasm').RendererBackend});const items=[{id:'a',text:'First'},{id:'b',text:'Second'},{id:'c',text:'Third'}];const tabs=scene.root.tabView({width:400,height:240,items});(window as any).__motion={scene,sdk,host,tabs,items,frames:[]};},backend);
 const capture=async(name:string)=>{const result=await page.evaluate(()=>{const t=(window as any).__motion;return{visuals:t.tabs.snapshot.navigationControl.tabVisuals,animating:t.scene.snapshot.animating,image:(t.scene.draw(),t.host.querySelector('canvas').toDataURL().split(',')[1])};});const bytes=Buffer.from(result.image,'base64');writeFileSync(`${folder}/${backend}-${name}.png`,bytes);writeFileSync(`${folder}/${backend}-${name}.json`,JSON.stringify({visuals:result.visuals,animating:result.animating},null,2));return{...result,png:PNG.sync.read(bytes)};};
 await expect.poll(async()=>{const v=await page.evaluate(()=>(window as any).__motion.tabs.snapshot.navigationControl.tabVisuals);return v.some((x:any)=>x.opacity>0&&x.opacity<1&&x.offsetY>0);}).toBe(true);
 const entrance=await capture('entrance');await page.waitForTimeout(750);const steady=await capture('steady');expect(steady.visuals.every((v:any)=>v.opacity===1&&v.offsetY===0)).toBe(true);expect(entrance.png.data.equals(steady.png.data)).toBe(false);
 await page.evaluate(()=>{const t=(window as any).__motion;t.tabs.update({items:[...t.items,{id:'new',text:'Added tab'}]});});
 await expect.poll(()=>page.evaluate(()=>(window as any).__motion.tabs.snapshot.navigationControl.tabVisuals.find((v:any)=>v.key==='new')?.opacity)).toBe(0);
 await expect.poll(async()=>{const added=await capture('added');return added.visuals.some((v:any)=>v.key==='new'&&v.opacity>0&&v.opacity<1);},{intervals:[16]}).toBe(true);await page.waitForTimeout(200);await capture('added-steady');
 await page.evaluate(()=>{const t=(window as any).__motion;t.tabs.update({items:t.items});});
 await expect.poll(()=>page.evaluate(()=>(window as any).__motion.tabs.snapshot.navigationControl.tabVisuals.some((v:any)=>v.key==='new'&&v.removed))).toBe(true);const leaving=await capture('leaving');expect(leaving.visuals.some((v:any)=>v.removed&&v.opacity>0)).toBe(true);
 await page.waitForTimeout(550);const final=await capture('final');expect(final.visuals.some((v:any)=>v.removed)).toBe(false);expect(final.animating).toBe(false);expect(leaving.png.data.equals(final.png.data)).toBe(false);
 await page.evaluate(()=>{const t=(window as any).__motion;t.scene.dispose();t.sdk.dispose();t.host.remove();delete(window as any).__motion;});
});
for(const backend of ['Canvas2D','WebGL2'])test(`${backend} templated FlipView paints sampled Acrylic above page content`,async({page})=>{
 await page.goto('/#flip-view');await page.locator('#flip-basic canvas').first().waitFor();
 await page.evaluate(async backend=>{const a=await import('/@id/winui-wasm' as string) as typeof import('winui-wasm');const sdk=await a.WinUI.create({globalScrollbars:false});const host=document.createElement('div');host.id='acrylic-test';host.style.cssText='position:fixed;left:0;top:0;width:400px;height:200px;z-index:99999';document.body.append(host);const scene=sdk.scene(host,{backend:backend as import('winui-wasm').RendererBackend});const flip=scene.root.flipView({width:400,height:200,items:[{id:'a',text:'A'},{id:'b',text:'B'}]});flip.setItemTemplate((_,slot)=>{slot.container.grid({background:'#2050a0'});});(window as any).__acrylic={scene,sdk,host,flip};},backend);
 await expect.poll(()=>page.evaluate(()=>(window as any).__acrylic.flip.snapshot.rect.width)).toBe(400);
 await page.mouse.move(200,100);await expect.poll(()=>page.evaluate(()=>(window as any).__acrylic.flip.snapshot.navigationControl.parts.some((p:any)=>p.role==='flipButton'&&p.visible))).toBe(true);
 const result=await page.evaluate(()=>{const t=(window as any).__acrylic;const chrome=t.flip.snapshot.navigationControl.parts.find((p:any)=>p.role==='flipButton'&&p.visible);return{chrome,image:(t.scene.draw(),t.host.querySelector('canvas').toDataURL().split(',')[1])};});expect(result.chrome).toBeTruthy();mkdirSync(folder,{recursive:true});const bytes=Buffer.from(result.image,'base64');writeFileSync(`${folder}/${backend}-FlipView-Acrylic.png`,bytes);const png=PNG.sync.read(bytes);const dpr=1.25;const color=(x:number,y:number)=>[...png.data.subarray((Math.floor(y*dpr)*png.width+Math.floor(x*dpr))*4,(Math.floor(y*dpr)*png.width+Math.floor(x*dpr))*4+3)];
 const p=result.chrome.rect;const background=color(p.x-8,p.y+8),material=color(p.x+5,p.y+8);expect(background).toEqual([32,80,160]);expect(material.reduce((sum,c,i)=>sum+Math.abs(c-background[i]),0)).toBeGreaterThan(80);
 await page.evaluate(()=>{const t=(window as any).__acrylic;t.scene.dispose();t.sdk.dispose();t.host.remove();delete(window as any).__acrylic;});
});

test('TabView close buttons match fixed native geometry and hover/pressed states',async({page})=>{
 test.setTimeout(90000);const matrix=JSON.parse(readFileSync('../references/navigation-controls-close-metrics.json','utf8').replace(/^\uFEFF/,''));const results=[];
 await page.goto('/#tab-view');await page.locator('#tab-0 [role="tab"]').first().waitFor();
 for(const row of matrix.cases){
  const target=await page.evaluate(async row=>{const a=await import('/@id/winui-wasm' as string) as typeof import('winui-wasm');const sdk=await a.WinUI.create({globalScrollbars:false});const host=document.createElement('div');host.id='close-matrix';host.style.cssText='position:fixed;left:0;top:0;width:800px;height:450px;z-index:99999';document.body.append(host);const scene=sdk.scene(host,{theme:row.theme});const panel=scene.root.canvas({width:800,height:450});const tabs=panel.tabView({canvasLeft:24,canvasTop:24,width:400,height:240,items:['Document 0','Long document 1','Document 2'].map((text,i)=>({id:String(i),text,icon:'\uE8A5',enabled:!(row.state==='Disabled'&&i===row.targetIndex)}))});(window as any).__close={scene,sdk,host,tabs};await new Promise(r=>setTimeout(r,800));const parts=tabs.snapshot.navigationControl!.parts;return{button:parts.find(p=>p.role==='closeTab'&&p.index===row.targetIndex)!,tab:parts.find(p=>p.role==='tab'&&p.index===row.targetIndex)!};},row);
  if(row.state==='ParentHover')await page.mouse.move(24+target.tab.rect.x+12,24+target.tab.rect.y+14);
  if(row.state==='CloseHover'||row.state==='ClosePressed'){await page.mouse.move(24+target.button.rect.x+16,24+target.button.rect.y+12);if(row.state==='ClosePressed')await page.mouse.down();}
  await page.waitForTimeout(25);
  const image=Buffer.from(await page.evaluate(()=>{const t=(window as any).__close;t.scene.draw();return t.host.querySelector('canvas').toDataURL().split(',')[1];}),'base64');mkdirSync(folder,{recursive:true});writeFileSync(`${folder}/${row.id}.png`,image);
  const actual=PNG.sync.read(image),native=PNG.sync.read(readFileSync(`../out/navigation-controls-refinement-native/${row.id}.png`));const r=target.button.rect;
  const error=Math.max(Math.abs(r.x+24-row.rect[0]),Math.abs(r.y+24-row.rect[1]),Math.abs(r.width-row.rect[2]),Math.abs(r.height-row.rect[3]));expect(error,row.id).toBeLessThan(0.02);
  let sum=0,n=0;for(let y=Math.floor((r.y+24)*1.25);y<Math.ceil((r.y+24+r.height)*1.25);y++)for(let x=Math.floor((r.x+24)*1.25);x<Math.ceil((r.x+24+r.width)*1.25);x++)for(let k=0;k<3;k++){sum+=Math.abs(actual.data[(y*actual.width+x)*4+k]-native.data[(y*native.width+x)*4+k]);n++;}
  const mae=sum/n;expect(mae,row.id).toBeLessThan(12);results.push({id:row.id,geometryErrorDIP:error,meanAbsoluteColorError:mae});
  if(row.state==='ClosePressed')await page.mouse.up();await page.mouse.move(799,449);await page.evaluate(()=>{const t=(window as any).__close;t.scene.dispose();t.sdk.dispose();t.host.remove();delete(window as any).__close;});
 }
 writeFileSync('../references/navigation-controls-close-validation.json',JSON.stringify({kind:'same-SDK forced template states, not Composition acceptance',cases:results},null,2));
});
