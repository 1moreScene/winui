import {expect,test} from '@playwright/test';
import {NavigationCacheMode as C,NavigationTransition as T} from 'winui-wasm';

test('Frame home navigation retains page instance, scroll and browser history',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/#all');
  await expect.poll(()=>page.evaluate(()=>window.gallery?.frame?.snapshot.current?.page)).toBe('#all');
  const initial=await page.evaluate(()=>window.gallery.frame!.snapshot.currentInstance);
  const active=()=>page.locator('[data-frame-instance]:not([hidden]):not([inert])');
  await active().locator('.gallery-scroll-content').evaluate(e=>e.scrollTop=350);
  await page.evaluate(()=>location.hash='#button');
  await expect.poll(()=>page.evaluate(()=>window.gallery.frame!.snapshot.current?.page)).toBe('#button');
  await expect.poll(()=>page.evaluate(()=>window.gallery.frame!.snapshot.animating)).toBe(false);
  await expect(page.getByRole('button',{name:'Go back',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Go back',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.gallery.frame!.snapshot.current?.page)).toBe('#all');
  await expect.poll(()=>page.evaluate(()=>window.gallery.frame!.snapshot.animating)).toBe(false);
  expect(await page.evaluate(()=>window.gallery.frame!.snapshot.currentInstance)).toBe(initial);
  expect(await active().locator('.gallery-scroll-content').evaluate(e=>e.scrollTop)).toBe(350);
  await expect(page.getByRole('button',{name:'Go forward',exact:true})).toBeEnabled();
  await page.keyboard.press('Alt+ArrowRight');
  await expect.poll(()=>page.evaluate(()=>window.gallery.frame!.snapshot.current?.page)).toBe('#button');
  await expect.poll(()=>page.evaluate(()=>window.gallery.frame!.snapshot.animating)).toBe(false);
  await page.screenshot({path:'../out/frame-home-button.png'});
  expect(errors).toEqual([]);
});

test('Frame cache, cancellation, lifecycle, parameter identity and disposal share the public SDK',async({page})=>{
  await page.goto('/');await expect.poll(()=>page.evaluate(()=>!!window.gallery?.frame)).toBe(true);
  const result=await page.evaluate(async({C,T})=>{
    const log:string[]=[];let serial=0,cancel=false;const parameter={business:'same object'};
    const baseline=window.gallery.sdk.liveCount;
    const frame=window.gallery.sdk.frame<{id:string;serial:number}>({cacheSize:1,reducedMotion:true,
      resolvePage:id=>({cacheMode:id==='required'?C.Required:id==='disabled'?C.Disabled:C.Enabled,
        create:()=>({id,serial:++serial}),dispose:p=>log.push(`dispose:${p.id}:${p.serial}`),
        onNavigatingFrom:(_,e)=>{log.push('navigatingFrom');if(cancel)e.cancel=true;},
        onNavigatedFrom:()=>log.push('from'),onNavigatedTo:()=>log.push('to')}),
      onNavigating:()=>log.push('navigating'),onNavigated:()=>log.push('navigated')});
    frame.navigate('required',{parameter,transition:T.Suppress});const required=frame.content;
    frame.navigate('enabled');frame.navigate('other');frame.goBack();const recreated=frame.content?.serial===4;
    frame.goBack();const permanent=frame.content===required&&frame.parameterFor(frame.snapshot.current!)===parameter;
    const before=JSON.stringify(frame.snapshot);cancel=true;const cancelled=!frame.navigate('disabled')&&JSON.stringify(frame.snapshot)===before;cancel=false;
    frame.navigate('disabled');const disabled=frame.content;frame.navigate('required');frame.goBack();const disabledRecreated=frame.content!==disabled;
    frame.configure({cacheSize:0});frame.clearHistory();const historyEmpty=!frame.canGoBack&&!frame.canGoForward;
    frame.dispose();frame.dispose();
    let stopped=false,created=false;
    const guarded=window.gallery.sdk.frame({resolvePage:()=>({create:()=>{created=true;return null;}}),onNavigating:event=>event.cancel=true,onNavigationStopped:()=>stopped=true});
    guarded.navigate('blocked');guarded.dispose();
    return{permanent,recreated,cancelled,disabledRecreated,historyEmpty,stopped:stopped&&!created,live:window.gallery.sdk.liveCount===baseline,log};
  },{C,T});
  expect(result).toMatchObject({permanent:true,recreated:true,cancelled:true,disabledRecreated:true,historyEmpty:true,stopped:true,live:true});
  expect(result.log.slice(0,4)).toEqual(['navigating','to','navigated','navigating']);
  expect(result.log.some(s=>s.startsWith('dispose:'))).toBe(true);
});

test('Frame rapid transitions settle and reduced motion stops an active timeline',async({page})=>{
  await page.goto('/#home');await expect.poll(()=>page.evaluate(()=>!!window.gallery?.frame)).toBe(true);
  for(const route of ['#all','#button','#settings','#home','#all']){
    await page.evaluate(route=>location.hash=route,route);
    await expect.poll(()=>page.evaluate(()=>window.gallery.frame!.snapshot.current?.page)).toBe(route);
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect.poll(()=>page.evaluate(()=>window.gallery.frame!.snapshot.animating)).toBe(false);
  expect(await page.locator('[data-frame-instance]:not([hidden])').count()).toBe(1);
  await page.evaluate(()=>location.hash='#settings');
  await expect.poll(()=>page.evaluate(()=>window.gallery.frame!.snapshot.current?.page)).toBe('#settings');
  expect(await page.evaluate(()=>window.gallery.frame!.snapshot.animating)).toBe(false);
  await expect(page.getByRole('combobox',{name:'App theme'})).toBeVisible();
  await page.getByRole('combobox',{name:'App theme'}).focus();
  await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme','Dark');
  await page.screenshot({path:'../out/frame-home-dark.png'});
});

test('NavigationView Frame sample reuses enabled state and recreates disabled pages',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/#navigation-view');
  const sample=page.locator('#navigation-frame-example');
  await expect(sample.getByRole('textbox',{name:'Library note'})).toBeVisible();
  await sample.getByRole('textbox',{name:'Library note'}).fill('keep my note');
  await sample.locator('[data-item-id="Downloads"]').click();
  await expect(sample.getByRole('textbox',{name:'Downloads note'})).toBeVisible();
  await sample.locator('aside').getByRole('button',{name:'Back',exact:true}).click();
  await expect(sample.getByRole('textbox',{name:'Library note'})).toHaveValue('keep my note');
  const mode=sample.getByRole('combobox',{name:'Page cache mode'});
  await mode.focus();await mode.press('Home');await mode.press('Enter');
  await expect(mode).toHaveValue('Disabled');
  await sample.locator('[data-item-id="Downloads"]').click();
  await expect(sample.getByRole('textbox',{name:'Downloads note'})).toBeVisible();
  await sample.locator('aside').getByRole('button',{name:'Back',exact:true}).click();
  await expect(sample.getByRole('textbox',{name:'Library note'})).toHaveValue('');
  await sample.scrollIntoViewIfNeeded();await page.screenshot({path:'../out/frame-navigation-sample.png'});
});

test('cached progress pages suspend their Canvas frame scheduling',async({page})=>{
  await page.goto('/#progress-ring');
  await expect.poll(()=>page.evaluate(()=>window.gallery?.frame?.snapshot.current?.page)).toBe('#progress-ring');
  await expect.poll(()=>page.evaluate(()=>!!window.progressScenes?.['ring-indeterminate'])).toBe(true);
  await page.evaluate(()=>location.hash='#home');
  await expect.poll(()=>page.evaluate(()=>window.gallery.frame!.snapshot.animating)).toBe(false);
  const frames=()=>page.evaluate(()=>window.progressScenes['ring-indeterminate'].diagnostics.frames);
  const before=await frames();await page.waitForTimeout(200);expect(await frames()).toBe(before);
});
