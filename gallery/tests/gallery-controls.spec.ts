import { expect, test } from '@playwright/test';
import official from '../src/official-home.json' with {type:'json'};
import { selectGalleryOption, openSource } from './gallery-control-helper';
import { mkdirSync,writeFileSync,readFileSync } from 'node:fs';
const catalog=readFileSync(new URL('../src/gallery-catalog.ts',import.meta.url),'utf8');
const mappings=catalog.match(/const implemented[^=]*=\s*\{([\s\S]*?)\n\};/)![1];
const galleryItems=[...mappings.matchAll(/(\w+)\s*:\s*['"]([^'"]+)['"]/g)].map(match=>({id:match[1],href:match[2],title:official.groups.flatMap(group=>group.items).find(item=>item.id===match[1])!.title}));
const active='[data-winui-frame] > [data-frame-instance]:not([hidden]):not([inert]) ';

test('Gallery options use real CheckBox and ComboBox with pointer and keyboard',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/#button');
  const disable=page.getByRole('checkbox',{name:'Disable button',exact:true});
  await expect(disable).toBeVisible();await disable.click();await expect(disable).toBeChecked();
  await expect(page.getByRole('button',{name:'Standard XAML',exact:true})).toBeDisabled();
  await disable.press('Space');await expect(disable).not.toBeChecked();
  const theme=page.getByRole('button',{name:'Toggle theme',exact:true});await theme.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','Dark');
  await theme.press('Space');await expect(page.locator('html')).toHaveAttribute('data-theme','Light');
  await page.screenshot({path:'../out/gallery-controls-button.png'});expect(errors).toEqual([]);
});

test('Source content is inside one Rust Expander and follows its layout and clip',async({page})=>{
  await page.goto('/#breadcrumb-bar');
  const source=page.locator('.example .source').first();const header=await openSource(source);
  const code=source.locator('pre').first();await expect(code).toBeVisible();
  await expect(source.locator('[data-gallery-expander]')).toHaveCount(0);
  expect(await code.evaluate(element=>{
    const content=element.closest('[data-winui-content-host]');
    const surface=content?.closest('[data-gallery-control="Expander"]') as HTMLElement&{galleryScene:import('winui-wasm').Scene};
    const slot=content?.parentElement?.getAttribute('data-scene-node');
    const snapshot=surface?.galleryScene.snapshot;
    const node=snapshot?.nodes.find(node=>String(node.id)===slot);
    return !!node&&snapshot?.nodes.find(parent=>parent.id===node.parent)?.kind==='Expander';
  })).toBe(true);
  await source.getByRole('button',{name:'Official XAML',exact:true}).click();await expect(code).toContainText('<');
  const head=(await header.boundingBox())!,body=(await code.boundingBox())!,box=(await source.boundingBox())!;
  expect(body.y).toBeGreaterThanOrEqual(head.y+head.height);
  expect(body.y+body.height).toBeLessThanOrEqual(box.y+box.height+1);
  await page.screenshot({path:'../out/gallery-controls-source.png'});
  await header.press('Space');await expect(code).toBeHidden();
});

test('Code horizontal and vertical scrollbars use the shared Rust ScrollViewer in all themes',async({page})=>{
  test.setTimeout(90_000);
  await page.goto('/#grid-view');const source=page.locator(active+'.example .source').first();
  for(const theme of ['Light','Dark','HighContrast']) {
    await selectGalleryOption(page.locator(active+'#theme'),theme);
    // Theme/navigation can remount the sample. Resolve its current Expander
    // and wait for the async code presenter before changing app-owned text.
    await openSource(source);
    const code=source.locator('pre').first();
    await expect(code).not.toHaveAttribute('data-source-status','loading');
    await code.locator('code').evaluate(element=>{element.textContent=Array.from({length:80},(_,i)=>`// line ${i} `+'source '.repeat(120)).join('\n');});
    await code.evaluate(element=>{element.style.maxHeight='160px';});
    await expect.poll(()=>code.evaluate(e=>e.scrollWidth>e.clientWidth&&e.scrollHeight>e.clientHeight)).toBe(true);
    await expect(code).toHaveAttribute('data-winui-scroll-host','');
    // Settings uses Frame navigation; returning re-registers this DOM scroll host.
    const id=await code.getAttribute('id');
    const horizontal=page.locator(`[data-winui-global-scrollbars] [role="scrollbar"][aria-controls="${id}"][aria-orientation="horizontal"]`);
    const vertical=page.locator(`[data-winui-global-scrollbars] [role="scrollbar"][aria-controls="${id}"][aria-orientation="vertical"]`);
    await expect(horizontal).toBeVisible();await expect(vertical).toBeVisible();
    await expect(code).toHaveCSS('scrollbar-width','none');
    expect(await code.evaluate(e=>getComputedStyle(e,'::-webkit-scrollbar').display)).toBe('none');
    await code.evaluate(element=>element.scrollTo({left:0,top:0,behavior:'instant'}));
    await expect(horizontal).toHaveAttribute('aria-valuenow','0');
    await horizontal.focus();await horizontal.press('ArrowRight');await expect.poll(()=>code.evaluate(e=>e.scrollLeft)).toBeGreaterThan(0);
    await vertical.focus();await vertical.press('End');await expect.poll(()=>code.evaluate(e=>e.scrollTop)).toBeGreaterThan(100);
    await page.screenshot({path:`../out/gallery-controls-scroll-${theme}.png`});
  }
  await source.getByRole('button',{name:'Source code',exact:true}).click();await expect(source.locator('pre').first()).toBeHidden();
});

test('Every implemented Gallery page mounts existing SDK controls and no HTML substitutes',async({page})=>{
  test.setTimeout(300_000);page.setDefaultTimeout(15_000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const rows=[];
  for(const item of galleryItems.filter(item=>!item.href.startsWith('#sample/'))) {
    // This is an ownership inventory. Load each route independently so cached
    // pages and overlapping Frame transitions cannot redirect source locators.
    await page.goto('/'+item.href);
    await expect.poll(()=>page.evaluate(()=>window.gallery?.frame?.snapshot.animating)).toBe(false);
    await expect(page.locator(active+'.gallery-page-header h1')).toHaveText(item.title);
    const body=page.locator(active+'.home-sample-page');
    await expect(body).toBeVisible();
    // Pages may use main, article or section for their app layout. Require a
    // real SDK rendering surface in the sample rather than one DOM tag name.
    await expect.poll(()=>body.locator('.winui-surface canvas').count()).toBeGreaterThan(0);
    const source=body.locator('.example [data-gallery-expander].source').first();
    if(await source.count()) {await openSource(source);await expect(source.locator('pre').first()).toBeVisible();await expect(source.locator('[data-gallery-expander]')).toHaveCount(0);}
    const audit=await page.evaluate(()=>{
      const foreign=[...document.querySelectorAll('input,select,textarea,button,details,summary')].filter(e=>!e.closest('.winui-surface')).map(e=>e.outerHTML.slice(0,100));
      const origins=[...document.querySelectorAll<HTMLElement>('[data-gallery-control]')].filter(e=>e.getClientRects().length>0).map(element=>{
        const scene=(element as HTMLElement&{galleryScene?:import('winui-wasm').Scene}).galleryScene;
        return {kind:element.dataset.galleryControl,valid:!!scene&&!scene.isDisposed&&scene.snapshot.nodes.some(node=>node.kind===element.dataset.galleryControl)};
      });
      return {foreign,origins};
    });
    expect(audit.foreign,item.id).toEqual([]);expect(audit.origins.length).toBeGreaterThan(0);expect(audit.origins.every(o=>o.valid),item.id).toBe(true);
    rows.push({id:item.id,route:item.href,hosts:audit.origins.length});
  }
  mkdirSync('../out/gallery-controls',{recursive:true});writeFileSync('../out/gallery-controls/page-audit.json',JSON.stringify(rows,null,2));
  expect(rows.length).toBeGreaterThanOrEqual(57);expect(errors).toEqual([]);
});

test('Home SelectorBar, search AutoSuggestBox, lifecycle and narrow source layout remain usable',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
  await page.getByRole('tab',{name:'Recent',exact:true}).focus();await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab',{name:'Favorites',exact:true})).toHaveAttribute('aria-selected','true');
  await page.getByRole('combobox',{name:'Search controls and samples'}).fill('Button');await expect(page.getByRole('heading',{name:'Search results'})).toBeVisible();
  await page.getByRole('combobox',{name:'Search controls and samples'}).fill('');
  await page.evaluate(()=>location.hash='#button');await expect(page.getByRole('checkbox',{name:'Disable button'})).toBeVisible();
  await page.evaluate(()=>location.hash='#combo-box');await expect(page.locator('#composed-combo')).toBeVisible();await page.evaluate(()=>location.hash='#button');await expect(page.getByRole('checkbox',{name:'Disable button'})).toBeVisible();
  const baseline=await page.evaluate(()=>window.gallery.sdk.liveCount);
  for(let i=0;i<4;i++) {await page.evaluate(()=>location.hash='#combo-box');await expect(page.locator('#composed-combo')).toBeVisible();await page.evaluate(()=>location.hash='#button');await expect(page.getByRole('checkbox',{name:'Disable button'})).toBeVisible();await expect.poll(()=>page.evaluate(()=>window.gallery.sdk.liveCount)).toBe(baseline);}
  await page.setViewportSize({width:390,height:844});await openSource(page.locator('#button-standard .source'));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:'../out/gallery-controls-mobile.png'});expect(errors).toEqual([]);
});
