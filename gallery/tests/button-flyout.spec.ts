import {test,expect} from '@playwright/test';

test('owned Flyout opens on keyboard, cancels confirm-close and restores anchor focus',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/tests/button-flyout.html');
  const anchor=page.getByRole('button',{name:'Owned surface',exact:true});
  await expect(anchor).toHaveAttribute('aria-haspopup','dialog');
  await expect(anchor).toHaveAttribute('aria-expanded','false');
  await anchor.focus();await page.keyboard.press('Enter');
  const confirm=page.getByRole('button',{name:'Confirm close',exact:true});
  await expect(confirm).toBeVisible();await expect(confirm).toBeFocused();
  await expect(anchor).toHaveAttribute('aria-expanded','true');
  await page.evaluate(()=>{window.buttonFlyoutFixture.cancel=true;});
  await confirm.click();
  await expect.poll(()=>page.evaluate(()=>window.buttonFlyoutFixture.closing)).toBe(1);
  await expect(confirm).toBeVisible();
  await page.evaluate(()=>{window.buttonFlyoutFixture.cancel=false;});
  await confirm.click();await expect(confirm).toBeHidden();await expect(anchor).toBeFocused();
  await page.keyboard.press('Space');await expect(confirm).toBeVisible();
  await page.keyboard.press('Escape');await expect(confirm).toBeHidden();await expect(anchor).toBeFocused();
  expect(await page.evaluate(()=>window.buttonFlyoutFixture.clicks)).toBe(2);
  expect(errors).toEqual([]);
});

test('Button.Flyout mounts menu-item declarations and invokes them without open state',async({page})=>{
  await page.goto('/tests/button-flyout.html');
  const anchor=page.getByRole('button',{name:'Owned menu',exact:true});
  await expect(anchor).toHaveAttribute('aria-haspopup','menu');
  await anchor.click();
  const item=page.getByRole('menuitem',{name:'Open document',exact:true});
  await expect(item).toBeVisible();await item.click();
  await expect(item).toBeHidden();await expect(anchor).toBeFocused();
  expect(await page.evaluate(()=>window.buttonFlyoutFixture.invoked)).toBe(1);
  await expect(anchor).toHaveAttribute('aria-expanded','false');
});

test('StrictMode replacement, removal and unmount release associations and owned surfaces',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/tests/button-flyout.html');
  const anchor=page.getByRole('button',{name:'Owned surface',exact:true});
  await expect(anchor).toBeVisible();
  for(let i=0;i<3;i++){
    await anchor.click();await expect(page.getByRole('button',{name:'Confirm close',exact:true})).toBeVisible();
    await page.evaluate(()=>window.buttonFlyoutFixture.remount!());
    await expect(anchor).toHaveAttribute('aria-expanded','false');
  }
  await page.evaluate(()=>window.buttonFlyoutFixture.setSurface!(false));
  await expect(anchor).not.toHaveAttribute('aria-haspopup',/.+/);
  await expect.poll(()=>page.evaluate(()=>window.buttonFlyoutFixture.scene!.snapshot.nodes.filter(node=>node.kind==='Flyout').length)).toBe(0);
  await page.evaluate(()=>window.buttonFlyoutFixture.setSurface!(true));
  await expect(anchor).toHaveAttribute('aria-haspopup','dialog');
  await anchor.click();await expect(page.getByRole('button',{name:'Confirm close',exact:true})).toBeVisible();
  await page.evaluate(()=>window.buttonFlyoutFixture.unmount!());
  await expect(page.locator('.winui-scene')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('plain SDK Button can associate an existing surface and rejects cross-scene references',async({page})=>{
  await page.goto('/tests/button-flyout.html');
  await expect(page.getByRole('button',{name:'Owned surface',exact:true})).toBeVisible();
  const result=await page.evaluate(async()=>{
    const path='/@id/winui-wasm';
    const {WinUI}=await import(/* @vite-ignore */path) as typeof import('winui-wasm');
    const runtime=await WinUI.create({globalScrollbars:false});
    const host=document.createElement('div'),other=document.createElement('div');
    host.style.cssText=other.style.cssText='width:400px;height:200px';document.body.append(host,other);
    try{
      const scene=runtime.scene(host,{reducedMotion:true}),foreign=runtime.scene(other);
      const owner=scene.root.button({text:'Owner'}),surface=scene.root.flyout({width:120,height:60});
      owner.setFlyout(surface);owner.invoke();
      await new Promise<void>(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done())));
      const opened=surface.properties.isOpen;
      let rejected=false;try{owner.setFlyout(foreign.root.flyout());}catch{rejected=true;}
      surface.hide();
      await new Promise<void>(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done())));
      owner.setFlyout(null);owner.invoke();
      return {opened,rejected,detached:!surface.properties.isOpen};
    }finally{runtime.dispose();host.remove();other.remove();}
  });
  expect(result).toEqual({opened:true,rejected:true,detached:true});
});
