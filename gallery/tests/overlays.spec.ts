import {selectGalleryOption,setGalleryChecked} from './gallery-control-helper';
import {test,expect} from '@playwright/test';
test('Popup and Flyout close, cancel, escape clipping and restore real keyboard focus',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#overlays');
 const open=page.getByRole('button',{name:'Show Popup (using Offset)',exact:true});await open.click();
 await expect(page.getByRole('button',{name:'Close Popup',exact:true})).toBeVisible();await page.getByRole('button',{name:'Close Popup',exact:true}).click();
 await expect(page.getByRole('button',{name:'Close Popup',exact:true})).toBeHidden();
 const target=page.getByRole('button',{name:'Empty cart',exact:true});await target.click();
 const confirm=page.getByRole('button',{name:'Confirm empty cart',exact:true});await expect(confirm).toBeVisible();await expect(confirm).toBeFocused();
 // A plain flyout anchor must not acquire an artificial ScrollViewer.
 const geometry=await page.evaluate(()=>{const s=window.overlayScenes.flyout.snapshot;return {flyout:s.nodes.find(n=>n.kind==='Flyout')?.rect,scrollCount:s.nodes.filter(n=>n.kind==='ScrollViewer').length};});
 expect(geometry.flyout!.height).toBeGreaterThan(48);expect(geometry.scrollCount).toBe(0);
 await page.keyboard.press('Escape');await expect(confirm).toBeHidden();await expect(target).toBeFocused();
 await setGalleryChecked(page.getByRole('checkbox',{name:'Cancel closing'}),true);await target.click();await page.keyboard.press('Escape');await expect(confirm).toBeVisible();
 await setGalleryChecked(page.getByRole('checkbox',{name:'Cancel closing'}),false);if(await confirm.isVisible())await confirm.press('Escape');await expect(confirm).toBeHidden();
 expect(errors).toEqual([]);
});
test('ToolTip has hover delay, accessible description and no black focus outline',async({page})=>{
 await page.goto('/#tool-tip');const owner=page.getByRole('button',{name:'Button with ToolTip',exact:true});await owner.hover();
 const tip=page.getByRole('tooltip',{name:'A ToolTip with content',exact:true});await expect(tip).toBeVisible();
 await expect(owner).toHaveAttribute('aria-describedby',/winui-tip-/);await page.mouse.move(1,1);await expect(tip).toBeHidden();
 await owner.focus();await expect(tip).toBeVisible();expect(await owner.evaluate(e=>getComputedStyle(e).outlineStyle)).toBe('none');
});
test('MenuFlyout arrows skip disabled/separators and invoke toggle with focus recovery',async({page})=>{
 await page.goto('/#menu-flyout');const target=page.getByRole('button',{name:'Show menu',exact:true});await target.click();const menu=page.getByRole('menu');await expect(menu).toBeVisible();await expect(menu).toBeFocused();
 await page.keyboard.press('End');await page.keyboard.press('Enter');await expect(page.getByLabel('MenuFlyout output')).toContainText('option: false');await expect(menu).toBeHidden();await expect(target).toBeFocused();
 await target.click();await expect(menu).toBeFocused();await page.keyboard.press('Home');await page.keyboard.press('Enter');await expect(page.getByLabel('MenuFlyout output')).toContainText('open');
});
for(const backend of ['Canvas2D','WebGL2'])test(`${backend} Slider uses Rust value, drag capture, keyboard, reverse and shared ToolTip`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#slider');
  await selectGalleryOption(page.getByRole('combobox',{name:'Renderer',exact:true}),backend);
  await expect(page.locator('#overlay-slider .basic-preview .winui-scene').first()).toHaveAttribute('data-backend',backend);
  // Backend selection remounts the React controllers; let onReady/property effects commit.
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  const slider=page.getByRole('slider',{name:'Volume',exact:true});await slider.focus();await page.keyboard.press('Home');await expect(slider).toHaveAttribute('aria-valuenow','0');
  await page.keyboard.press('ArrowRight');await expect(slider).toHaveAttribute('aria-valuenow','1');await page.keyboard.press('PageUp');await expect(slider).toHaveAttribute('aria-valuenow','10');
  const box=await slider.boundingBox();await page.mouse.move(box!.x+box!.width*.5,box!.y+box!.height*.7);await page.mouse.down();await page.mouse.move(box!.x+box!.width+30,box!.y+box!.height*.7);await expect(slider).toHaveAttribute('aria-valuenow','100');
  // Slider_Partial.cpp::PerformPointerUpAction closes the thumb tooltip.
  // Validate the live drag feedback before releasing capture.
  await expect(page.getByRole('tooltip',{name:'100',exact:true})).toBeVisible();
  await page.mouse.up();await expect(page.getByRole('tooltip',{name:'100',exact:true})).toBeHidden();
  await setGalleryChecked(page.getByRole('checkbox',{name:'Reverse direction',exact:true}),true);await slider.focus();await page.keyboard.press('ArrowRight');await expect(slider).toHaveAttribute('aria-valuenow','99');
  await setGalleryChecked(page.getByRole('checkbox',{name:'Reverse direction',exact:true}),false);
  await setGalleryChecked(page.getByRole('checkbox',{name:'Enabled',exact:true}),false);await expect(slider).toHaveAttribute('aria-disabled','true');await setGalleryChecked(page.getByRole('checkbox',{name:'Enabled',exact:true}),true);
 expect(errors).toEqual([]);
});
test('floating SDK validates ownership and releases detached layers across repeated Gallery remounts',async({page})=>{
 await page.goto('/#slider');await expect(page.getByRole('heading',{name:'Slider',exact:true})).toBeVisible();
 const result=await page.evaluate(async()=>{
  const entry='/src/index.ts';const {WinUI,OverlayPlacement,MenuEntryKind,EventKind}=await import(/* @vite-ignore */ entry) as typeof import('../src/index');
  const host=document.createElement('div');host.style.cssText='width:500px;height:300px';document.body.append(host);const ui=await WinUI.create({globalScrollbars:false});const scene=ui.scene(host);const button=scene.root.button({text:'Owner'});const flyout=scene.root.flyout({placement:OverlayPlacement.Bottom});flyout.text({text:'Hello'});flyout.showAt(button);
  const otherHost=document.createElement('div');document.body.append(otherHost);const other=ui.scene(otherHost);let rejected=false;try{flyout.showAt(other.root.button({text:'Foreign'}));}catch{rejected=true;}
  const menu=scene.root.menuFlyout({menuItems:[{id:'option',kind:MenuEntryKind.Toggle}]});const off=menu.on(EventKind.MenuItemInvoked,()=>{});off();menu.dispose();flyout.dispose();scene.dispose();other.dispose();ui.dispose();host.remove();otherHost.remove();return {rejected,detached:!host.isConnected};
 });expect(result).toEqual({rejected:true,detached:true});
 for(let i=0;i<3;i++){await page.goto('/#button');await expect(page.getByRole('heading',{name:'Button',exact:true})).toBeVisible();await page.goto('/#menu-flyout');await expect(page.getByRole('button',{name:'Show menu',exact:true})).toBeVisible();}
});
