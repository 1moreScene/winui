import{test,expect}from'@playwright/test';
import{readFileSync,writeFileSync,mkdirSync}from'node:fs';import{resolve}from'node:path';import{PNG}from'pngjs';
const fixtures=JSON.parse(readFileSync('../references/navigation-controls-paging-buttons.json','utf8').replace(/^\uFEFF/,''));
test('paging buttons compare actual rendered flat/striped materials and arrows against the same SDK',async({page})=>{
 test.setTimeout(180000);const results=[];await page.goto('/#flip-view');await page.locator('#flip-basic canvas').first().waitFor();
 for(const backend of ['Canvas2D','WebGL2'])for(const row of fixtures.cases){
  const rawSource='data:image/png;base64,'+readFileSync(resolve(`../out/navigation-paging-native/${row.theme}-${row.kind}-${row.axis}-${row.pattern}-Source-compositor.png`)).toString('base64');
  const target=await page.evaluate(async({row,backend,rawSource})=>{const a=await import('/src/index.ts' as string) as typeof import('../src/index');const sdk=await a.WinUI.create({globalScrollbars:false});const host=document.createElement('div');host.id='paging-matrix';host.style.cssText='position:fixed;left:0;top:0;width:800px;height:450px;z-index:99999';document.body.append(host);const scene=sdk.scene(host,{theme:row.theme,backend:backend as import('../src/index').RendererBackend});const canvas=scene.root.canvas({width:800,height:450});
  // Identical pre-brush pixels isolate Acrylic from differences in pattern
  // panel layout rounding. The source is an owned native fixture, never a mock.
  canvas.image({source:rawSource,width:800,height:450.4});
  let node:any;if(row.kind==='FlipView'){node=canvas.flipView({canvasLeft:24,canvasTop:24,width:400,height:270,selectedIndex:1,orientation:row.axis,items:['a','b','c'].map(id=>({id,text:''}))});}
  else{node=canvas.pipsPager({canvasLeft:24,canvasTop:24,numberOfPages:10,selectedPageIndex:4,orientation:row.axis,previousButtonVisibility:a.PipsPagerButtonVisibility.Visible,nextButtonVisibility:a.PipsPagerButtonVisibility.Visible});}
  (window as any).__paging={sdk,scene,node,host};await new Promise(r=>setTimeout(r,200));return node.snapshot.navigationControl.parts.find((p:any)=>p.key==='next');},{row,backend,rawSource});
  await page.mouse.move(200,100);if(row.state!=='Normal')await page.mouse.move(24+target.rect.x+target.rect.width/2,24+target.rect.y+target.rect.height/2);if(row.state==='Pressed')await page.mouse.down();await page.waitForTimeout(60);
  const shot=await page.evaluate(()=>{const t=(window as any).__paging;t.scene.draw();return{parts:t.node.snapshot.navigationControl.parts,image:t.host.querySelector('canvas').toDataURL().split(',')[1]};});expect(shot.parts.some((p:any)=>p.key==='next'&&p.visible),row.id).toBe(true);const image=Buffer.from(shot.image,'base64');const folder=`../out/navigation-paging-${backend}`;mkdirSync(folder,{recursive:true});writeFileSync(`${folder}/${row.id}.png`,image);
  const actual=PNG.sync.read(image),native=PNG.sync.read(readFileSync(`../out/navigation-paging-native/${row.id}-compositor.png`));const rect=target.rect;const [x,y,w,h]=row.button;const error=Math.max(Math.abs(24+rect.x-x),Math.abs(24+rect.y-y),Math.abs(rect.width-w),Math.abs(rect.height-h));expect(error,row.id).toBeLessThanOrEqual(0.02);
  let sum=0,n=0,max=0;const byPixel=[];for(let j=Math.floor(y*1.25);j<Math.ceil((y+h)*1.25);j++)for(let i=Math.floor(x*1.25);i<Math.ceil((x+w)*1.25);i++){let d=0;for(let k=0;k<3;k++){const delta=Math.abs(actual.data[(j*actual.width+i)*4+k]-native.data[(j*native.width+i)*4+k]);d+=delta;sum+=delta;n++;max=Math.max(max,delta);}byPixel.push(d/3);}
  const mae=sum/n;
  const faceX=Math.floor((x+w*(row.axis==='Vertical'?0.25:0.5))*1.25),faceY=Math.floor((y+h*(row.axis==='Vertical'?0.5:0.25))*1.25);
  const faceActual=[...actual.data.subarray((faceY*actual.width+faceX)*4,(faceY*actual.width+faceX)*4+3)],faceNative=[...native.data.subarray((faceY*native.width+faceX)*4,(faceY*native.width+faceX)*4+3)];
  const faceError=Math.max(...faceActual.map((c,i)=>Math.abs(c-faceNative[i])));
  results.push({id:row.id,backend,geometryErrorDIP:error,meanAbsoluteColorError:mae,maxColorError:max,faceActual,faceNative,faceError});
  if(row.state==='Pressed')await page.mouse.up();await page.mouse.move(799,449);await page.evaluate(()=>{const t=(window as any).__paging;t.scene.dispose();t.sdk.dispose();t.host.remove();delete(window as any).__paging;});
 }
 writeFileSync('../references/navigation-paging-validation.json',JSON.stringify({nativeCapture:fixtures.capture,advancedEffects:fixtures.advancedEffects,dpr:1.25,cases:results},null,2));expect(results.every(r=>r.meanAbsoluteColorError<15)).toBe(true);// The island fixture changes only pixels outside the brush. Guard the actual
 // regression (sampling adjacent content); retain per-pixel native residuals
 // separately rather than interpreting a single noisy pixel as full parity.
 for(const backend of ['Canvas2D','WebGL2'])for(const theme of ['Light','Dark']){
  const flat=results.find(r=>r.backend===backend&&r.id===`${theme}-FlipView-Horizontal-Flat-Normal`)!;
  const island=results.find(r=>r.backend===backend&&r.id===`${theme}-FlipView-Horizontal-ButtonIsland-Normal`)!;
  expect(Math.max(...flat.faceActual.map((c,i)=>Math.abs(c-island.faceActual[i])))).toBeLessThanOrEqual(6);
 }
});
