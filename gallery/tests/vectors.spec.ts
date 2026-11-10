import {selectGalleryOption} from './gallery-control-helper';
import {test,expect} from '@playwright/test';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {PNG} from 'pngjs';
import type {Scene,WinUI} from 'winui-wasm';
declare global{interface Window{vectorFixture:{sdk:WinUI;scene:Scene};}}
for(const backend of ['Canvas2D','WebGL2'] as const)test(`${backend} shapes and advanced icon sources match the native vector matrix`,async({browser})=>{
 const native=JSON.parse(readFileSync('../references/vectors-metrics.json','utf8'));const context=await browser.newContext({deviceScaleFactor:native.dpi,viewport:{width:1100,height:600}});const page=await context.newPage();await page.goto('/#icon-element');await expect(page.getByRole('img',{name:'Slices bitmap icon'})).toBeVisible();const results:object[]=[];
 for(const group of native.rows){
  await page.evaluate(async({group,backend})=>{
   window.vectorFixture?.sdk.dispose();document.getElementById('vector-fixture')?.remove();const a=await import('/@id/winui-wasm' as string) as typeof import('winui-wasm');const sdk=await a.WinUI.create({globalScrollbars:false});const host=document.createElement('div');host.id='vector-fixture';host.style.cssText='position:fixed;inset:0;width:1000px;height:500px;z-index:99999';document.body.append(host);const scene=sdk.scene(host,{theme:group.theme,backend:a.RendererBackend[backend],reducedMotion:true});const c=scene.root.canvas();
   for(const row of group.nodes){const props={...row.props,canvasLeft:24+row.index%4*240,canvasTop:24+Math.floor(row.index/4)*100};switch(group.kind){case 'Rectangle':c.rectangle(props);break;case 'Line':c.line(props);break;case 'Path':c.path(props);break;case 'Polygon':c.polygon(props);break;case 'Polyline':c.polyline(props);break;case 'BitmapIcon':c.bitmapIcon(props);break;case 'ImageIcon':c.imageIcon(props);break;case 'FontIcon':c.fontIcon(props);break;case 'PathIcon':c.pathIcon(props);break;case 'IconSourceElement':c.iconSourceElement(props);break;case 'AnimatedIcon':c.animatedIcon(props);break;}}
   window.vectorFixture={sdk,scene};
  },{group,backend});
  await expect.poll(()=>page.evaluate(()=>window.vectorFixture.scene.snapshot.nodes.length)).toBe(group.nodes.length+2).catch(async error=>{
   const diagnostic=await page.evaluate(()=>{const s=window.vectorFixture.scene as unknown as {frame:number;drawing:boolean;disposed:boolean;stats:unknown;nodes:Map<number,unknown>};return{visibility:document.visibilityState,focus:document.hasFocus(),now:performance.now(),timeline:document.timeline.currentTime,pendingFrame:s.frame,drawing:s.drawing,disposed:s.disposed,stats:s.stats,registeredNodes:s.nodes.size,snapshot:window.vectorFixture.scene.snapshot};});
   writeFileSync('../out/overlay-vectors-frame-stall.json',JSON.stringify({backend,kind:group.kind,diagnostic},null,2));throw error;
  });
  await expect.poll(()=>page.evaluate(()=>window.vectorFixture.scene.snapshot.imageRequests.length)).toBe(0);
  const nodes=await page.evaluate(kind=>window.vectorFixture.scene.snapshot.nodes.filter(n=>n.kind===kind),group.kind);
  for(let i=0;i<nodes.length;i++){const row=group.nodes[i];expect(Math.abs(nodes[i].rect.width-row.bounds.width),`${group.kind} ${i} width`).toBeLessThanOrEqual(1/native.dpi+.001);expect(Math.abs(nodes[i].rect.height-row.bounds.height),`${group.kind} ${i} height`).toBeLessThanOrEqual(1/native.dpi+.001);}
  const actual=PNG.sync.read(await page.locator('#vector-fixture').screenshot());const reference=PNG.sync.read(readFileSync(`../out/vectors-native/${group.theme}-${group.kind}.png`));mkdirSync('../out/vectors-browser',{recursive:true});writeFileSync(`../out/vectors-browser/${group.theme}-${group.kind}-${backend}.png`,PNG.sync.write(actual));
  for(const row of group.nodes){const r=row.bounds,d=native.dpi;let error=0,count=0;for(let y=Math.floor((r.y-4)*d);y<Math.ceil((r.y+r.height+4)*d);y++)for(let x=Math.floor((r.x-4)*d);x<Math.ceil((r.x+r.width+4)*d);x++)for(let c=0;c<3;c++){error+=Math.abs(actual.data[(y*actual.width+x)*4+c]-reference.data[(y*reference.width+x)*4+c]);count++;}const mean=error/count;results.push({theme:group.theme,kind:group.kind,index:row.index,mean,native:r,actual:nodes[row.index].rect});expect(mean,`${group.theme} ${group.kind} ${row.index}`).toBeLessThan(['FontIcon','IconSourceElement','AnimatedIcon'].includes(group.kind)?20:8);}
  if(group.kind==='Line')for(const row of group.nodes.slice(0,4))for(const endpoint of [1,2]){
   const x=(row.bounds.x+row.props[`x${endpoint}`])*native.dpi,y=(row.bounds.y+row.props[`y${endpoint}`])*native.dpi;
   let sum=0,count=0;for(let py=Math.floor(y)-8;py<Math.floor(y)+8;py++)for(let px=Math.floor(x)-8;px<Math.floor(x)+8;px++)for(let c=0;c<3;c++){sum+=Math.abs(actual.data[(py*actual.width+px)*4+c]-reference.data[(py*reference.width+px)*4+c]);count++;}
   expect(sum/count,`${group.theme} ${row.props.strokeStartLineCap} endpoint ${endpoint}`).toBeLessThan(4);
  }
 }
 writeFileSync(`../references/validation/vectors-${backend}.json`,JSON.stringify({reference:native.reference,acceptedPixelParity:false,rows:results},null,2)+'\n');await context.close();
});

test('five Shape Gallery examples update Rust geometry and show the matching source',async({page})=>{
 await page.goto('/#shapes');
 await expect(page.locator('.example')).toHaveCount(5);
 await expect.poll(()=>page.evaluate(()=>Object.keys(window.shapeScenes??{}).length)).toBe(5);
 for(const [label,value,name,kind,property] of [
  ['Radius X','35','rectangle','Rectangle','radiusX'],
  ['End point Y','80','line','Line','y2'],
  ['Path stroke','6','path','Path','strokeThickness'],
  ['Polygon stroke','8','polygon','Polygon','strokeThickness'],
  ['Polyline stroke','4','polyline','Polyline','strokeThickness'],
 ]){
  await page.getByLabel(label,{exact:true}).fill(value);
  await expect.poll(()=>page.evaluate(({name,kind,property})=>(window.shapeScenes[name].snapshot.nodes.find(n=>n.kind===kind)?.props as any)[property],{name,kind,property})).toBe(Number(value));
 }
 await page.locator('#shape-path details').evaluate((e:HTMLDetailsElement)=>e.open=true);
 await expect(page.locator('#shape-path pre')).toContainText('<Path data=');
 await page.locator('#shape-path').getByRole('button',{name:'Official XAML'}).click();
 await expect(page.locator('#shape-path pre')).toContainText('DarkGoldenRod');
 await selectGalleryOption(page.locator('#theme'),'Dark');
 await selectGalleryOption(page.getByLabel('Renderer',{exact:true}),'WebGL2');
 await expect.poll(()=>page.evaluate(()=>Object.values(window.shapeScenes).every(s=>s.snapshot.backend.kind==='WebGL2'))).toBe(true);
});

for(const backend of ['Canvas2D','WebGL2'] as const)test(`${backend} gradient Shape preserves transparent corners and smooth fractional-DPR coverage`,async({browser})=>{
 const context=await browser.newContext({deviceScaleFactor:1.25});const page=await context.newPage();await page.goto('/#shapes');
 await expect(page.locator('.example')).toHaveCount(5);
 await page.evaluate(async backend=>{
  const a=await import('/@id/winui-wasm' as string) as typeof import('winui-wasm');const sdk=await a.WinUI.create({globalScrollbars:false});const host=document.createElement('div');host.id='gradient-shape';host.style.cssText='position:fixed;inset:0;width:120px;height:120px;background:white;z-index:99999';document.body.append(host);
  const scene=sdk.scene(host,{backend:a.RendererBackend[backend],theme:a.ThemeMode.Light,root:{padding:[0,0,0,0],background:'#ffffff'}});
  scene.root.path({width:100,height:100,horizontalAlignment:a.HorizontalAlignment.Left,verticalAlignment:a.VerticalAlignment.Top,data:'M0 0L100 0L0 100Z',fill:{kind:a.GradientKind.Linear,from:[0,0],to:[1,0],stops:[{offset:0,color:'#ff0000'},{offset:1,color:'#0000ff'}]}});
  window.vectorFixture={sdk,scene};
 },backend);
 await expect.poll(()=>page.evaluate(()=>window.vectorFixture.scene.snapshot.nodes.length)).toBe(2);
 const png=PNG.sync.read(await page.locator('#gradient-shape').screenshot());
 const pixel=(x:number,y:number)=>Array.from(png.data.subarray((y*png.width+x)*4,(y*png.width+x)*4+3));
 expect(pixel(12,12)[0]).toBeGreaterThan(215);expect(pixel(12,12)[2]).toBeLessThan(40);
 expect(pixel(100,6)[2]).toBeGreaterThan(190);expect(pixel(100,6)[0]).toBeLessThan(65);
 expect(pixel(110,110)).toEqual([255,255,255]);
 let partial=0;for(let y=1;y<124;y++)for(let x=1;x<124;x++){const [r,g,b]=pixel(x,y);if(g>5&&g<245&&r>0&&b>0)partial++;}expect(partial).toBeGreaterThan(70);
 await context.close();
});
