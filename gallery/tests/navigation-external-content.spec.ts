import {expect,test} from '@playwright/test';
import {EventKind,LightDismissOverlayMode,PaneDisplayMode,ThemeMode} from 'winui-wasm';
import native from '../../references/view-command-template.json' with {type:'json'};

test('Gallery dismiss is a Rust part with native paint, cancellable close and page pass-through',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:900,height:1000});await page.goto('/#button');
  await page.waitForFunction(()=>!!window.gallery?.navigation);
  const dismiss=page.locator('.gallery-navigation [data-item-id="$dismiss"]');
  for(const theme of Object.values(ThemeMode)){
    await page.evaluate(({theme,mode})=>window.gallery.navigation!.update({theme,lightDismissOverlayMode:mode,reducedMotion:true,isPaneOpen:true}),{theme,mode:LightDismissOverlayMode.On});
    await expect(dismiss).toBeVisible();
    await expect.poll(()=>page.evaluate(()=>window.gallery.navigation!.snapshot.lightDismiss?.opacity)).toBe(1);
    const expected=native.palettes[theme].SplitViewLightDismissOverlayBackground.color;
    const observed=await page.evaluate(()=>{
      const nav=window.gallery.navigation!,layer=nav.snapshot.lightDismiss!,part=nav.snapshot.parts.find(p=>p.id==='$dismiss')!;
      const canvas=document.querySelector<HTMLCanvasElement>('.gallery-navigation canvas')!,r=canvas.getBoundingClientRect();
      const button=document.querySelector<HTMLElement>('.gallery-navigation [data-item-id="$dismiss"]')!,b=button.getBoundingClientRect();
      const x=layer.rect.x+layer.rect.width/2,y=layer.rect.height/2;
      return {layer,part:part.rect,hit:document.elementFromPoint(r.left+x,r.top+y)===button,buttonWidth:b.width,alpha:canvas.getContext('2d')!.getImageData(Math.floor(x*canvas.width/r.width),Math.floor(y*canvas.height/r.height),1,1).data[3]};
    });
    expect(observed.layer.color).toBe(expected);expect(observed.part).toEqual(observed.layer.rect);expect(observed.hit).toBe(true);
    expect(Math.abs(observed.buttonWidth-observed.layer.rect.width)).toBeLessThan(1);
    expect(Math.abs(observed.alpha-(expected.length===9?parseInt(expected.slice(7,9),16):255))).toBeLessThanOrEqual(2);
    expect(await page.locator('.home-pane-backdrop').count()).toBe(0);
    await page.evaluate(kind=>{const off=window.gallery.navigation!.on(kind,event=>{event.cancel=true;});Object.assign(window,{releaseDismissCancellation:off});},EventKind.PaneClosing);
    await dismiss.click();await expect.poll(()=>page.evaluate(()=>window.gallery.navigation!.snapshot.isPaneOpen)).toBe(true);
    await page.evaluate(()=>{(window as unknown as {releaseDismissCancellation:()=>void}).releaseDismissCancellation();});
    await dismiss.click();await expect(dismiss).toHaveCount(0);
    await expect.poll(()=>page.evaluate(()=>window.gallery.navigation!.snapshot.lightDismiss)).toBeNull();
    const checkbox=page.getByRole('checkbox',{name:'Disable button',exact:true});
    await checkbox.click();await expect(checkbox).toBeChecked();await checkbox.click();await expect(checkbox).not.toBeChecked();
  }
  expect(errors).toEqual([]);
});

test('both narrow Gallery and Navigation + Frame example use SDK Escape and dismiss input',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/#home');
  const toggle=page.getByRole('button',{name:'Toggle navigation pane',exact:true});
  await toggle.click();await expect(page.locator('.gallery-navigation [data-item-id="$dismiss"]')).toBeVisible();
  await page.keyboard.press('Escape');await expect.poll(()=>page.evaluate(()=>window.gallery.navigation!.snapshot.isPaneOpen)).toBe(false);
  await page.setViewportSize({width:300,height:844});await toggle.click();
  await expect.poll(()=>page.evaluate(()=>window.gallery.navigation!.snapshot.isPaneOpen)).toBe(true);
  await expect.poll(()=>page.evaluate(()=>window.gallery.navigation!.snapshot.animating)).toBe(false);
  await page.keyboard.press('Escape');await expect.poll(()=>page.evaluate(()=>window.gallery.navigation!.snapshot.isPaneOpen)).toBe(false);
  await page.setViewportSize({width:390,height:844});
  await toggle.click();await page.locator('.gallery-navigation [data-item-id="$dismiss"]').click();
  await expect.poll(()=>page.evaluate(()=>window.gallery.navigation!.snapshot.isPaneOpen)).toBe(false);
  await page.setViewportSize({width:900,height:1000});await page.goto('/#navigation-view');
  const sample=page.locator('#navigation-frame-example'),sampleToggle=sample.locator('[data-item-id="$toggle"]'),dismiss=sample.locator('[data-item-id="$dismiss"]');
  await sampleToggle.click();await expect(dismiss).toBeVisible();
  await expect(sample.locator('[aria-label="Close sample navigation pane"]')).toHaveCount(0);
  await dismiss.click();await expect(dismiss).toHaveCount(0);
  const note=sample.getByRole('textbox',{name:'Library note',exact:true});await note.fill('Rust owns the overlay');await expect(note).toHaveValue('Rust owns the overlay');
  await sampleToggle.click();await expect(dismiss).toBeVisible();await note.focus();await page.keyboard.press('Escape');await expect(dismiss).toHaveCount(0);
});

test('external SDK surface updates and disposes without leaving masks or host styles',async({page})=>{
  await page.goto('/#home');await page.waitForFunction(()=>!!window.gallery?.sdk);
  const result=await page.evaluate(async({mode,theme,overlay})=>{
    const host=document.createElement('div');host.style.cssText='position:fixed;inset:100px 0 0;z-index:100;width:700px;height:500px;pointer-events:all!important';document.body.append(host);
    const baseline=window.gallery.sdk.liveCount;
    const nav=window.gallery.sdk.navigationView(host,{hasExternalContent:true,paneDisplayMode:mode,theme,lightDismissOverlayMode:overlay,reducedMotion:true,isPaneOpen:true});
    const initial=nav.snapshot;
    nav.update({hasExternalContent:false});await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
    const normal=nav.snapshot.hostClip;
    nav.dispose();const pointerEvents=host.style.pointerEvents,priority=host.style.getPropertyPriority('pointer-events');const children=host.childElementCount;host.remove();
    return {initial:initial.lightDismiss,normal,pointerEvents,priority,children,counts:[baseline,window.gallery.sdk.liveCount]};
  },{mode:PaneDisplayMode.LeftCompact,theme:ThemeMode.Light,overlay:LightDismissOverlayMode.Auto});
  expect(result.initial?.interactive).toBe(true);expect(result.initial?.color).toBe('#00000000');expect(result.normal).toBeNull();
  expect(result.pointerEvents).toBe('all');expect(result.priority).toBe('important');expect(result.children).toBe(0);expect(result.counts[0]).toBe(result.counts[1]);
});
