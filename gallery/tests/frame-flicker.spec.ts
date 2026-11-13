import {expect,test} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {PNG} from 'pngjs';
import {RendererBackend,NavigationTransition} from 'winui-wasm';
declare global{interface Window{flickerTrace:{rows:{time:number;animating:boolean;current:string|null;pages:unknown[];leaks:unknown[]}[];stop:()=>void};}}
test('cached pages never become visible outside the Rust compositor frame',async({page})=>{
 await page.goto('/#home');await expect.poll(()=>page.evaluate(()=>!!window.gallery?.frame)).toBe(true);
 await expect.poll(()=>page.evaluate(()=>window.gallery.frame!.snapshot.animating)).toBe(false);
 await page.evaluate(()=>{
  const rows:Window['flickerTrace']['rows']=[];
  const off=window.gallery.frame!.onSnapshot(state=>{
   const pages=[...document.querySelectorAll<HTMLElement>('.gallery-frame > [data-frame-instance]')].map(element=>{
    const id=Number(element.dataset.frameInstance);const style=getComputedStyle(element);const visual=state.visuals.find(v=>v.instance===id);
    return{id,page:element.dataset.framePage,hidden:element.hidden,display:style.display,opacity:Number(style.opacity),rustOpacity:visual?.opacity??0,hasVisual:!!visual};
   });
   const leaks=pages.filter(p=>!p.hidden&&p.display!=='none'&&p.opacity>0.001&&p.rustOpacity<=0.001);
   rows.push({time:performance.now(),animating:state.animating,current:state.current?.page??null,pages,leaks});
  });window.flickerTrace={rows,stop:off};
 });
 for(const route of ['#button','#home','#settings','#button','#home']){
  await page.evaluate(route=>location.hash=route,route);
  await expect.poll(()=>page.evaluate(()=>window.gallery.frame!.snapshot.current?.page)).toBe(route);
  await expect.poll(()=>page.evaluate(()=>window.gallery.frame!.snapshot.animating)).toBe(false);
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 }
 const trace=await page.evaluate(()=>{window.flickerTrace.stop();return window.flickerTrace.rows;});
 mkdirSync('../out/frame-flicker',{recursive:true});writeFileSync(`../out/frame-flicker/${process.env.RUN_TAG??'current'}-${process.env.PW_CHANNEL??process.env.PW_BROWSER??'chromium'}-trace.json`,JSON.stringify(trace,null,2));
 expect(trace.length).toBeGreaterThan(20);
 expect(trace.flatMap(frame=>frame.leaks)).toEqual([]);
});

for(const backend of [RendererBackend.Canvas2D,RendererBackend.WebGL2]){
 test(`${backend} cached React scene pages retain their final pixels after back, forward and rerenders`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`/tests/fixtures/frame-flicker.html?backend=${backend}`);
  await expect.poll(()=>page.evaluate(()=>!!window.frameFixture?.frame)).toBe(true);
  await expect.poll(()=>page.evaluate(()=>window.frameFixture.frame.snapshot.animating)).toBe(false);
  const first=await page.evaluate(()=>window.frameFixture.frame.snapshot.currentInstance);
  const sample=async(color:number[])=>{
   await expect.poll(()=>page.evaluate(()=>window.frameFixture.frame.snapshot.animating)).toBe(false);
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const screenshot=await page.locator('.fixture-frame').screenshot();
   const png=PNG.sync.read(screenshot),pixel=(Math.floor(png.height/2)*png.width+Math.floor(png.width/2))*4;
   expect([...png.data.subarray(pixel,pixel+4)]).toEqual([...color,255]);
   expect(await page.locator('.fixture-frame > [data-frame-instance]:not([hidden])').count()).toBe(1);
   const cached=page.locator('.fixture-frame > [data-frame-instance][hidden] .winui-surface > canvas');
   expect(await cached.evaluateAll(canvases=>canvases.every(canvas=>(canvas as HTMLCanvasElement).width===0&&(canvas as HTMLCanvasElement).height===0))).toBe(true);
  };
  await sample([255,0,0]);
  for(const transition of [NavigationTransition.Entrance,NavigationTransition.SlideFromLeft,NavigationTransition.SlideFromRight]){
   await page.evaluate(transition=>window.frameFixture.frame.navigate('blue',{transition}),transition);
   await page.evaluate(()=>window.frameFixture.rerender());
   await sample([0,0,255]);
   await page.evaluate(()=>window.frameFixture.frame.goBack());await sample([255,0,0]);
   expect(await page.evaluate(()=>window.frameFixture.frame.snapshot.currentInstance)).toBe(first);
   await page.evaluate(()=>window.frameFixture.frame.goForward());await sample([0,0,255]);
   await page.evaluate(()=>window.frameFixture.frame.goBack());await sample([255,0,0]);
  }
  await page.evaluate(()=>{const frame=window.frameFixture.frame;frame.navigate('green');frame.navigate('blue');frame.navigate('red');window.frameFixture.rerender();});
  await page.emulateMedia({reducedMotion:'reduce'});await sample([255,0,0]);
  await page.evaluate(()=>window.frameFixture.frame.navigate('green'));await sample([0,128,0]);
  expect(errors).toEqual([]);
 });
}
