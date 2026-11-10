import {expect,test} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import {RendererBackend,PaneDisplayMode,NavigationTransition} from 'winui-wasm';

test('example page animation never releases global WinUI scrollbar ownership',async({page})=>{
 await page.goto('/#navigation-view');const sample=page.locator('#navigation-frame-example');
 await expect(sample.locator('[data-item-id="Downloads"]')).toBeVisible();
 await expect(sample.locator('[data-winui-frame]')).toHaveAttribute('data-animating','false');
 await page.evaluate(()=>{const rows:unknown[]=[];(window as any).navHostTrace=rows;let end=performance.now()+10000;
 const sample=()=>{const frame=document.querySelector('#navigation-frame-example [data-winui-frame]') as HTMLElement;rows.push({time:performance.now(),animating:frame.dataset.animating,pages:[...frame.querySelectorAll<HTMLElement>(':scope > [data-frame-instance]')].filter(e=>!e.hidden).map(e=>({id:e.dataset.framePage,inert:e.inert,y:new DOMMatrixReadOnly(getComputedStyle(e).transform).f,opacity:Number(getComputedStyle(e).opacity),bars:[...e.querySelectorAll<HTMLElement>('.frame-sample-page')].map(s=>({width:getComputedStyle(s).scrollbarWidth,managed:s.hasAttribute('data-winui-scroll-host')}))}))});if(performance.now()<end)requestAnimationFrame(sample)};requestAnimationFrame(sample);(window as any).stopNavHostTrace=()=>end=0;
 });
 for(const id of ['Downloads','Account','Library']){await sample.locator(`[data-item-id="${id}"]`).click();await expect(sample.locator(`[data-frame-page="${id}"]:not([hidden])`)).toBeVisible();await expect(sample.locator('[data-winui-frame]')).toHaveAttribute('data-animating','false');}
 const rows=await page.evaluate(()=>{(window as any).stopNavHostTrace();return (window as any).navHostTrace as {animating:string;pages:{id:string;inert:boolean;y:number;opacity:number;bars:{width:string;managed:boolean}[]}[]}[];});
 writeFileSync(`../out/navigation-host-${process.env.PW_CHANNEL??process.env.PW_BROWSER??'chromium'}-frames.json`,JSON.stringify(rows,null,2));
 const pages=rows.flatMap(r=>r.pages);expect(pages.some(p=>p.opacity>0&&p.y>1&&p.y<139)).toBe(true);
 expect(pages.filter(p=>p.opacity>0).flatMap(p=>p.bars).filter(b=>b.width!=='none'||!b.managed)).toEqual([]);
});

test('new and inert DOM scroll surfaces are claimed before the next paint',async({page})=>{
 await page.goto('/#home');await expect.poll(()=>page.evaluate(()=>!!window.gallery?.sdk)).toBe(true);
 const result=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>{
  const parent=document.createElement('div');parent.inert=true;parent.style.cssText='position:fixed;left:400px;top:200px';
  parent.innerHTML='<div style="overflow:auto;width:250px;height:100px"><div style="height:800px">new page</div></div>';document.body.append(parent);
  queueMicrotask(()=>{const scroll=parent.firstElementChild as HTMLElement;resolve({managed:scroll.hasAttribute('data-winui-scroll-host'),width:getComputedStyle(scroll).scrollbarWidth});parent.remove();});
 })));
 expect(result).toEqual({managed:true,width:'none'});
});

test('independent nested React Frame plays every Rust transition and keeps scrollbars claimed',async({page})=>{
 await page.goto('/tests/fixtures/navigation-host.html');await expect.poll(()=>page.evaluate(()=>!!window.externalFrame)).toBe(true);
 await expect.poll(()=>page.evaluate(()=>window.externalFrame.snapshot.animating)).toBe(false);
 for(const transition of [NavigationTransition.Entrance,NavigationTransition.SlideFromLeft,NavigationTransition.SlideFromRight]){
  const rows=await page.evaluate(transition=>new Promise<{x:number;y:number;opacity:number;bar:string;managed:boolean}[]>(resolve=>{
   const frame=window.externalFrame;frame.navigate(frame.snapshot.current?.page==='red'?'blue':'red',{transition});const rows:{x:number;y:number;opacity:number;bar:string;managed:boolean}[]=[];
   const sample=()=>{const host=document.querySelector<HTMLElement>('.independent-frame > [data-frame-instance]:not([aria-hidden])');if(host){const s=getComputedStyle(host),m=new DOMMatrixReadOnly(s.transform),article=host.querySelector('article')!;rows.push({x:m.e,y:m.f,opacity:Number(s.opacity),bar:getComputedStyle(article).scrollbarWidth,managed:article.hasAttribute('data-winui-scroll-host')});}
    if(frame.snapshot.animating)requestAnimationFrame(sample);else resolve(rows);
   };requestAnimationFrame(sample);
  }),transition);
  expect(rows.some(r=>r.opacity>0&&(transition===NavigationTransition.Entrance?r.y>1&&r.y<139:Math.abs(r.x)>1&&Math.abs(r.x)<199))).toBe(true);
  expect(rows.filter(r=>r.bar!=='none'||!r.managed)).toEqual([]);
  expect(rows.at(-1)).toMatchObject({x:0,y:0,opacity:1});
 }
});

test('home menu has a Rust scrollbar that drags and accepts keyboard input',async({page})=>{
 await page.goto('/#home');await expect.poll(()=>page.evaluate(()=>!!window.gallery?.navigation)).toBe(true);
 await page.evaluate(()=>{const nav=window.gallery.navigation!;for(const item of nav.snapshot.parts.filter(p=>p.expanded===false))nav.setExpanded(item.id,true);});
 const bar=page.locator('#home-navigation [role="scrollbar"][aria-label="Navigation menu scroll"]');await expect(bar).toBeVisible();
 await bar.hover();await expect.poll(()=>page.evaluate(()=>window.gallery.navigation!.snapshot.scrollbars[0]?.opacity)).toBe(1);
 await bar.focus();await bar.press('End');await expect.poll(()=>page.evaluate(()=>{const n=window.gallery.navigation!.snapshot;return Math.abs(n.scrollOffset-n.maxScroll)<0.1;})).toBe(true);
 await bar.press('Home');await expect.poll(()=>page.evaluate(()=>window.gallery.navigation!.snapshot.scrollOffset)).toBe(0);
 const before=await page.evaluate(()=>window.gallery.navigation!.snapshot.selectedId);
 const r=await page.evaluate(()=>window.gallery.navigation!.snapshot.scrollbars.find(b=>!b.content)!.thumb),host=(await page.locator('#home-navigation').boundingBox())!;
 await page.mouse.move(host.x+r.x+r.width/2,host.y+r.y+r.height/2);await page.mouse.down();await page.mouse.move(host.x+r.x+r.width/2,host.y+r.y+r.height/2+200,{steps:8});await page.mouse.up();
 expect(await page.evaluate(()=>window.gallery.navigation!.snapshot.scrollOffset)).toBeGreaterThan(100);
 expect(await page.evaluate(()=>window.gallery.navigation!.snapshot.selectedId)).toBe(before);
});

for(const backend of [RendererBackend.Canvas2D,RendererBackend.WebGL2])test(`public ${backend} NavigationView has the same Rust scrollbar outside Gallery`,async({page})=>{
 await page.goto('/#home');await expect.poll(()=>page.evaluate(()=>!!window.gallery?.sdk)).toBe(true);
 const observed=await page.evaluate(async({backend,mode})=>{
  const host=document.createElement('div');host.id='external-nav-scroll';host.style.cssText='position:fixed;left:350px;top:80px;width:800px;height:400px;z-index:1000';document.body.append(host);
  const scene=window.gallery.sdk.scene(host,{backend});const nav=scene.root.navigationView({paneDisplayMode:mode,items:Array.from({length:40},(_,i)=>({id:`row${i}`,text:`Row ${i}`}))},{width:800,height:400});
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return nav.snapshot.navigation!.scrollbars;
 },{backend,mode:PaneDisplayMode.Left});
 expect(observed).toHaveLength(1);expect(observed[0].maximum).toBeGreaterThan(1000);
 const bar=page.locator('#external-nav-scroll [role="scrollbar"]');await expect(bar).toBeVisible();await bar.focus();await bar.press('End');
 await expect.poll(async()=>Number(await bar.getAttribute('aria-valuenow'))).toBe(observed[0].maximum);
});
