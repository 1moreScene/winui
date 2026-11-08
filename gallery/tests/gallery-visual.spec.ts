import {test,expect} from '@playwright/test';
import {PNG} from 'pngjs';
import {mkdirSync,writeFileSync} from 'node:fs';
import official from '../src/official-home.json' with {type:'json'};
import {selectGalleryOption} from './gallery-control-helper';
const active='[data-frame-instance]:not([hidden]):not([inert]) ';
test.beforeEach(async({page})=>{page.on('pageerror',error=>console.error(error.message));});

test('Pinned Gallery search is one AutoSuggestBox and control cards have no invented favorite action',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  const group=official.groups.find(group=>group.title==='Menus & toolbars')!;
  await page.goto(`/#category/${group.id}`);
  await expect(page.getByRole('heading',{name:group.title,exact:true})).toBeVisible();
  await expect(page.locator('.home-search [data-gallery-control]')).toHaveCount(1);
  await expect(page.locator('.home-search [data-gallery-control="AutoSuggestBox"]')).toHaveCount(1);
  await expect(page.locator(active+'.home-sample button')).toHaveCount(0);
  const geometry=await page.locator('.home-search').evaluate(host=>{
    const scene=(host.querySelector('[data-gallery-control]') as HTMLElement&{galleryScene:import('../src').Scene}).galleryScene;
    const nodes=scene.snapshot.nodes,owner=nodes.find(node=>node.kind==='AutoSuggestBox')!;
    const query=nodes.find(node=>node.id===owner.composed!.parts.DropDownButton)!;
    return {width:host.getBoundingClientRect().width,height:owner.rect.height,queryX:query.world[4],queryWidth:query.rect.width,queryIcon:owner.props.queryIcon};
  });
  expect(geometry.width).toBeLessThanOrEqual(580);expect(geometry.height).toBe(32);expect(geometry.queryIcon).toBe(true);
  expect(geometry.queryX+geometry.queryWidth).toBeLessThanOrEqual(geometry.width+0.1);
  await page.screenshot({path:'../out/gallery-visual-category.png'});
  const search=page.getByRole('combobox',{name:'Search controls and samples',exact:true});
  await page.keyboard.press('Control+f');await expect(search).toBeFocused();await search.fill('split button');
  await expect(page.getByRole('option',{name:'SplitButton',exact:true})).toBeVisible();
  await search.press('ArrowDown');await search.press('Enter');
  await expect(page.locator(active+'.gallery-page-header h1')).toHaveText('SplitButton');expect(errors).toEqual([]);
});

test('All icon actions fit their actual Rust canvas and center their glyphs at desktop and narrow widths',async({page})=>{
  await page.goto('/#button');const results=[];
  for(const width of [1440,900,390]) {
    await page.setViewportSize({width,height:1000});
    await expect(page.getByRole('button',{name:'Toggle theme',exact:true})).toBeVisible();
    await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
    const rows=await page.locator('.gallery-icon-action').evaluateAll(elements=>elements.filter(element=>element.getClientRects().length>0).map(element=>{
      const host=element as HTMLElement&{galleryScene:import('../src').Scene};const scene=host.galleryScene.snapshot;
      const control=scene.nodes.find(node=>node.kind===host.dataset.galleryControl)!;
      const glyph=scene.nodes.find(node=>node.kind==='FontIcon')!;
      const canvas=host.querySelector('canvas')!.getBoundingClientRect(),box=host.getBoundingClientRect();
      return {name:control.props.accessibleName,width:box.width,height:box.height,overflow:Math.max(control.rect.width-canvas.width,control.rect.height-canvas.height),
        centerError:Math.abs(glyph.world[4]+glyph.rect.width/2-control.rect.width/2),yError:Math.abs(glyph.world[5]+glyph.rect.height/2-control.rect.height/2)};
    }));
    for(const row of rows){expect(row.width,row.name??'icon').toBeLessThanOrEqual(40);expect(row.height).toBe(32);expect(row.overflow).toBeLessThanOrEqual(.5);expect(row.centerError).toBeLessThanOrEqual(.5);expect(row.yError).toBeLessThanOrEqual(.5);}
    results.push({width,rows});await page.screenshot({path:`../out/gallery-visual-header-${width}.png`});
  }
  mkdirSync('../out/gallery-visual',{recursive:true});writeFileSync('../out/gallery-visual/icons.json',JSON.stringify(results,null,2));
});

for(const backend of ['Canvas2D','WebGL2'])test(`${backend} SDK scene defaults to transparent in every theme and preserves explicit root brushes`,async({page})=>{
  await page.goto('/');await expect(page.getByRole('tab',{name:'Recent',exact:true})).toBeVisible();
  for(const theme of ['Light','Dark','HighContrast']) {
    await page.evaluate(({backend,theme})=>{
      const host=document.createElement('div');host.id='transparent-scene';host.style.cssText='position:fixed;left:400px;top:120px;width:360px;height:100px;z-index:100;background:rgb(219,170,42)';document.body.append(host);
      const scene=window.gallery.sdk.scene(host,{backend:backend as import('../src').RendererBackend,theme:theme as import('../src').ThemeMode});
      scene.root.selectorBar({items:[{id:'a',text:'First'},{id:'b',text:'Second'}],selectedIndex:0});
      Object.assign(host,{galleryScene:scene});
    },{backend,theme});
    const host=page.locator('#transparent-scene');
    await expect.poll(()=>host.evaluate(host=>(host as HTMLElement&{galleryScene:import('../src').Scene}).galleryScene.snapshot.backend.kind)).toBe(backend);
    const sample=async()=>{const image=PNG.sync.read(await host.screenshot());const offset=(Math.floor(image.height*.9)*image.width+Math.floor(image.width*.9))*4;return [...image.data.subarray(offset,offset+4)];};
    expect(await sample()).toEqual([219,170,42,255]);
    await host.evaluate(host=>(host as HTMLElement&{galleryScene:import('../src').Scene}).galleryScene.root.update({background:'#21a4c8'}));
    await expect.poll(sample).toEqual([33,164,200,255]);
    await host.evaluate(host=>{(host as HTMLElement&{galleryScene:import('../src').Scene}).galleryScene.dispose();host.remove();});
  }
});

test('Home SelectorBar caller has no background override and unused pixels are transparent',async({page})=>{
  await page.goto('/');await expect(page.getByRole('tab',{name:'Recent',exact:true})).toBeVisible();
  const result=await page.locator('.home-tabs .winui-scene > canvas').evaluate(canvas=>{
    const c=canvas as HTMLCanvasElement;return [...c.getContext('2d')!.getImageData(c.width-4,4,1,1).data];
  });expect(result[3]).toBe(0);await page.screenshot({path:'../out/gallery-visual-home.png'});
});

test('All implemented pages keep embedded Rust control roots inside their host viewport',async({page})=>{
  test.setTimeout(180_000);await page.goto('/#all');
  const links=await page.locator(active+'.home-sample-link').evaluateAll(elements=>elements.map(element=>({href:element.getAttribute('href')!,title:element.querySelector('strong')!.textContent!})).filter(link=>!link.href.startsWith('#sample/')));
  const records=[];
  for(const link of links) {
    await page.evaluate(href=>location.hash=href,link.href);await expect(page.locator(active+'.gallery-page-header h1')).toHaveText(link.title);
    await expect(page.locator(active+'.home-sample-page main').first()).toBeVisible();
    const audit=()=>page.locator('[data-gallery-control]').evaluateAll(elements=>elements.filter(element=>element.getClientRects().length>0&&!element.closest('[inert],[hidden]')).map(element=>{
      const host=element as HTMLElement&{galleryScene:import('../src').Scene};const scene=host.galleryScene;if(!scene||scene.isDisposed)return {kind:host.dataset.galleryControl,missing:true,overflow:0};
      const node=scene.snapshot.nodes.find(node=>node.kind===host.dataset.galleryControl)!;const box=host.querySelector('canvas')!.getBoundingClientRect();
      return {kind:node.kind,missing:false,overflow:Math.max(node.rect.width-box.width,node.rect.height-box.height),native:[node.rect.width,node.rect.height],canvas:[box.width,box.height],host:host.getBoundingClientRect().toJSON(),name:node.props.accessibleName,frame:host.closest('[data-frame-instance]')?.getAttribute('data-frame-page')};
    }));
    await expect.poll(async()=>Math.max(0,...(await audit()).map(row=>row.overflow)),{message:link.href}).toBeLessThanOrEqual(1);
    const rows=await audit();
    for(const row of rows){expect(row.missing,link.href).toBe(false);expect(row.overflow,`${link.href} ${row.kind}`).toBeLessThanOrEqual(1);}
    records.push({route:link.href,controls:rows.length});
  }
  mkdirSync('../out/gallery-visual',{recursive:true});writeFileSync('../out/gallery-visual/page-geometry.json',JSON.stringify(records,null,2));expect(records.length).toBeGreaterThanOrEqual(57);
});

test('125 percent DPR keeps search and icon action content inside the native hit region',async({browser})=>{
  const context=await browser.newContext({deviceScaleFactor:1.25,viewport:{width:1440,height:1000}});
  const page=await context.newPage();await page.goto('/#button');await expect(page.getByRole('button',{name:'Toggle theme',exact:true})).toBeVisible();
  const bad=await page.locator('.gallery-icon-action').evaluateAll(elements=>elements.flatMap(element=>{
    const host=element as HTMLElement&{galleryScene:import('../src').Scene};const nodes=host.galleryScene.snapshot.nodes;
    const root=nodes.find(node=>node.kind===host.dataset.galleryControl)!,icon=nodes.find(node=>node.kind==='FontIcon')!;
    const box=host.querySelector('canvas')!.getBoundingClientRect();
    return root.rect.width>box.width+.5||root.rect.height>box.height+.5||Math.abs(icon.world[4]+icon.rect.width/2-root.rect.width/2)>.5?[root.props.accessibleName]:[];
  }));expect(bad).toEqual([]);await page.screenshot({path:'../out/gallery-visual-125pct.png'});await context.close();
});
