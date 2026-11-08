import {test,expect} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
import {PNG} from 'pngjs';
import type {WinUI,Scene} from '../src/index';
declare global{interface Window{badgeGalleryFixture:{sdk:WinUI;scene:Scene};}}
for(const backend of ['Canvas2D','WebGL2'] as const)test(`${backend} official composed InfoBadge styles match native icon/value/dot geometry`,async({page})=>{
 const native=JSON.parse(readFileSync('../references/five-controls-metrics.json','utf8'));
 await page.goto('/#info-badge');await expect(page.getByRole('img',{name:'Unread notification',exact:true})).toBeVisible();
 await expect(page.getByRole('combobox',{name:'Badge style'}).locator('option')).toHaveText(['Attention','Informational','Success','Critical']);
 const rows:object[]=[];
 for(const item of native.galleryBadges){
  await page.evaluate(async({item,backend})=>{
   window.badgeGalleryFixture?.sdk.dispose();document.getElementById('badge-gallery-fixture')?.remove();
   const a=await import('/src/index.ts' as string) as typeof import('../src/index');const sdk=await a.WinUI.create({globalScrollbars:false});const host=document.createElement('div');host.id='badge-gallery-fixture';host.style.cssText='position:fixed;inset:0;width:1000px;height:500px;z-index:99999';document.body.append(host);const scene=sdk.scene(host,{theme:item.theme,backend:a.RendererBackend[backend],reducedMotion:true});const panel=scene.root.stack({orientation:a.Orientation.Horizontal,spacing:20,horizontalAlignment:a.HorizontalAlignment.Left,verticalAlignment:a.VerticalAlignment.Top,translationX:24,translationY:24});
   const style=a.InfoBadgeStyle[item.style as keyof typeof a.InfoBadgeStyle];panel.infoBadge({badgeStyle:style,...(item.style==='Success'?{symbol:a.Symbol.Accept}:item.style==='Critical'?{symbol:a.Symbol.Cancel}:{glyph:item.style==='Attention'?'\uEA38':'\uF13F'}),horizontalAlignment:a.HorizontalAlignment.Right});panel.infoBadge({value:10,badgeStyle:style,horizontalAlignment:a.HorizontalAlignment.Right});panel.infoBadge({badgeStyle:style,verticalAlignment:a.VerticalAlignment.Center});window.badgeGalleryFixture={sdk,scene};
  },{item,backend});
  await expect.poll(()=>page.evaluate(()=>window.badgeGalleryFixture.scene.snapshot.nodes.filter(n=>n.kind==='InfoBadge').length)).toBe(3);
  const nodes=await page.evaluate(()=>window.badgeGalleryFixture.scene.snapshot.nodes.filter(n=>n.kind==='InfoBadge'));
  for(let i=0;i<3;i++){expect(nodes[i].rect.width).toBeCloseTo(item.nodes[i].bounds.width,4);expect(nodes[i].rect.height).toBeCloseTo(item.nodes[i].bounds.height,4);expect(nodes[i].world[4]).toBeCloseTo(item.nodes[i].bounds.x,4);expect(nodes[i].world[5]).toBeCloseTo(item.nodes[i].bounds.y,4);}
  const actual=PNG.sync.read(await page.locator('#badge-gallery-fixture').screenshot());const reference=PNG.sync.read(readFileSync(`../out/five-controls-native/${item.theme}-BadgeGallery-${item.style}.png`));
  let error=0,count=0;for(let i=0;i<3;i++){const r=item.nodes[i].bounds;for(let y=r.y;y<r.y+r.height;y++)for(let x=r.x;x<r.x+r.width;x++)for(let c=0;c<3;c++){error+=Math.abs(actual.data[(y*actual.width+x)*4+c]-reference.data[(y*reference.width+x)*4+c]);count++;}}
  const mean=error/count;rows.push({theme:item.theme,style:item.style,mean,nodes:nodes.map(n=>({rect:n.rect,world:n.world}))});expect(mean).toBeLessThan(16);
 }
 writeFileSync(`../references/validation/badge-gallery-${backend}.json`,JSON.stringify({reference:'Matching SDK actual named styles in the official horizontal StackPanel composition; not isolated default controls',acceptedPixelParity:false,rows},null,2)+'\n');
});
test('SDK fetches the content-versioned WASM binary used by the Gallery',async({page})=>{
 const requests:string[]=[];page.on('request',r=>{if(r.url().includes('.wasm'))requests.push(r.url());});await page.goto('/#info-badge');await expect(page.getByRole('img',{name:'Unread notification',exact:true})).toBeVisible();const stamp=JSON.parse(readFileSync('../gallery/src/wasm/build-stamp.json','utf8'));expect(requests.some(url=>url.includes('v='+stamp.sha256))).toBe(true);const version=await page.evaluate(async()=>{const a=await import('/src/index.ts' as string) as typeof import('../src/index');return a.WinUI.buildVersion;});expect(version).toBe(stamp.sha256);
});
