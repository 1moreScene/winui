import {test,expect} from '@playwright/test';
import {selectGalleryOption} from './gallery-control-helper';
test('five public control routes expose SDK samples and matching flat source',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const [route,title] of [['menu-flyout-item','MenuFlyoutItem'],['toggle-menu-flyout-item','ToggleMenuFlyoutItem'],['radio-menu-flyout-item','RadioMenuFlyoutItem'],['menu-flyout-sub-item','MenuFlyoutSubItem'],['menu-flyout-separator','MenuFlyoutSeparator']]){
  await page.goto('/#'+route);await expect(page.getByRole('heading',{name:title,exact:true}).first()).toBeVisible();await expect(page.locator('.basic-example:visible')).toHaveCount(5);
  await page.locator('.basic-example:visible').first().getByRole('button',{name:'Source code',exact:true}).click();await expect(page.locator('.basic-example:visible pre').first()).toContainText('<MenuFlyoutItem');expect(await page.locator('.basic-example:visible pre').first().textContent()).not.toContain('options={{');
 }
 expect(errors).toEqual([]);
});
for(const backend of ['Canvas2D','WebGL2']){
 test(backend+' toggle and command events come from Rust and focus returns',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#menu-items');await selectGalleryOption(page.getByRole('combobox',{name:'Renderer',exact:true}),backend);
  const example=page.locator('#menu-item-toggle'),button=example.getByRole('button',{name:'View options',exact:true});await expect(example.locator('.winui-scene').first()).toHaveAttribute('data-backend',backend);await button.click();await expect(page.getByRole('menuitemcheckbox',{name:'Show toolbar',exact:true})).toHaveAttribute('aria-checked','false');
  await page.keyboard.press('Home');await page.keyboard.press('Enter');await expect(example.locator('output')).toHaveText('Toolbar: true');await expect(button).toBeFocused();expect(await page.evaluate(()=>window.menuItemToggle?.properties.isChecked)).toBe(true);
  await button.click();await page.keyboard.press('Home');await page.keyboard.press('Enter');await expect(example.locator('output')).toHaveText('Toolbar: false');
  const commands=page.locator('#menu-item-command');await commands.getByRole('button',{name:'File commands',exact:true}).click();await page.keyboard.press('Home');await page.keyboard.press('Enter');await expect(commands.locator('output')).toHaveText('Open invoked');expect(errors).toEqual([]);
 });
 test(backend+' radio groups and nested submenus use presenter navigation',async({page})=>{
  await page.goto('/#menu-items');await selectGalleryOption(page.getByRole('combobox',{name:'Renderer',exact:true}),backend);
  const example=page.locator('#menu-item-radio');await example.getByRole('button',{name:'Page orientation',exact:true}).click();await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await expect(example.locator('output')).toHaveText('Landscape selected');
  const checked=await page.evaluate(()=>window.menuItemScenes.radio.snapshot.nodes.filter(n=>n.kind==='RadioMenuFlyoutItem').map(n=>({text:n.props.text,checked:n.props.isChecked})));expect(checked).toEqual([{text:'Portrait',checked:false},{text:'Landscape',checked:true},{text:'Small icons',checked:true},{text:'Large icons',checked:false}]);
  const sub=page.locator('#menu-item-submenu'),button=sub.getByRole('button',{name:'Share menu',exact:true});await button.click();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');await expect(page.getByRole('menuitem',{name:'Email',exact:true})).toBeVisible();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await expect(sub.locator('output')).toHaveText('Copy link invoked');await expect(button).toBeFocused();
 });
 test(backend+' separators and disabled items are skipped by keyboard',async({page})=>{
  await page.goto('/#menu-items');await selectGalleryOption(page.getByRole('combobox',{name:'Renderer',exact:true}),backend);
  const example=page.locator('#menu-item-separator');await example.getByRole('button',{name:'Document menu',exact:true}).click();await expect(page.getByRole('separator')).toHaveCount(2);await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await expect(example.locator('output')).toHaveText('Print invoked');
  const commands=page.locator('#menu-item-command');await commands.getByRole('button',{name:'File commands',exact:true}).click();await page.keyboard.press('End');await page.keyboard.press('Enter');await expect(commands.locator('output')).toHaveText('Save invoked');expect(await commands.getByRole('button',{name:'File commands',exact:true}).evaluate(e=>getComputedStyle(e).outlineStyle)).toBe('none');
 });
}
test('ordinary SDK updates, atomic validation, group ownership and disposal need no caller state machine',async({page})=>{
 await page.goto('/#menu-items');await page.locator('#menu-item-command .basic-preview canvas').first().waitFor();
 const result=await page.evaluate(async()=>{
  const ui=window.gallery.sdk;const host=document.createElement('div');host.style.cssText='width:480px;height:120px';document.body.append(host);const scene=ui.scene(host);
  const menu=scene.root.menuFlyout(),toggle=menu.toggleMenuFlyoutItem({text:'Flag'});const first=menu.radioMenuFlyoutItem({text:'A',groupName:'g',isChecked:true});const sub=menu.menuFlyoutSubItem({text:'More'});const second=sub.radioMenuFlyoutItem({text:'B',groupName:'g',isChecked:true});const line=menu.menuFlyoutSeparator();const item=menu.menuFlyoutItem({text:'Open'});const off=item.onClick(()=>{});off();toggle.update({isChecked:true});item.update({text:'Updated'});let invalid=false;
  try{scene.batch(()=>{item.update({text:'Wrong'});toggle.update({isChecked:null as never});});}catch{invalid=true;}
  await new Promise(r=>setTimeout(r,80));const props={first:first.properties.isChecked,second:second.properties.isChecked,toggle:toggle.properties.isChecked,text:item.properties.text};line.dispose();sub.dispose();const disposed=second.isDisposed;let stale=false;try{second.update({text:'Bad'});}catch{stale=true;}menu.dispose();const released=[toggle,first,line,item].every(n=>n.isDisposed);scene.dispose();host.remove();return{invalid,props,disposed,stale,released};
 });
 expect(result).toEqual({invalid:true,props:{first:false,second:true,toggle:true,text:'Updated'},disposed:true,stale:true,released:true});
});

for(const backend of ['Canvas2D','WebGL2'])test(backend+' RTL long labels keep separate caption slots and mirror submenu navigation',async({page})=>{
 await page.goto('/#menu-items');await page.locator('#menu-item-command .basic-preview canvas').first().waitFor();
 const slots=await page.evaluate(async backend=>{
  const host=document.createElement('div');host.style.cssText='position:fixed;left:0;top:0;width:600px;height:300px;z-index:100000;background:#fafafa';document.body.append(host);
  const scene=window.gallery.sdk.scene(host,{backend:backend as never,reducedMotion:true});
  const menu=scene.root.menuFlyout({width:260,flowDirection:'RightToLeft' as never,placementPosition:[20,20]});
  const item=menu.menuFlyoutItem({text:'A long document label which must not overlap its accelerator',icon:'\uE8E5',keyboardAccelerators:[{key:'o',modifiers:['Control' as never]}]});
  menu.toggleMenuFlyoutItem({text:'Toolbar',icon:'\uE74E',isChecked:true});menu.menuFlyoutSubItem({text:'Share'}).menuFlyoutItem({text:'Email'});
  menu.show();await new Promise(r=>setTimeout(r,100));menu.focus();
  (window as unknown as {menuRefinement:unknown}).menuRefinement={scene,menu,host,item};
  return menu.snapshot.overlay!.menuParts;
 },backend);
 expect(slots[0].shortcut.x+slots[0].shortcut.width).toBeLessThanOrEqual(slots[0].label.x+0.01);
 expect(slots[0].icon.x).toBeGreaterThan(slots[0].label.x);expect(slots[2].chevron.x).toBeLessThan(slots[2].label.x);
 await page.keyboard.press('End');await page.keyboard.press('ArrowLeft');await expect(page.getByRole('menuitem',{name:'Email',exact:true})).toBeVisible();
 await page.keyboard.press('ArrowRight');await expect(page.getByRole('menuitem',{name:'Email',exact:true})).toBeHidden();await page.keyboard.press('Escape');
 await page.evaluate(()=>{const value=(window as unknown as {menuRefinement:{scene:{dispose():void};host:HTMLElement}}).menuRefinement;value.scene.dispose();value.host.remove();});
});

