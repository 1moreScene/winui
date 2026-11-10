import {test,expect} from '@playwright/test';
import {PNG} from 'pngjs';
for(const [route,count]of [['app-bar-button',6],['app-bar-toggle-button',4],['drop-down-button',2],['selector-bar',3],['command-bar',1]] as const)test(`${route}: official examples load and source stays flat`,async({page})=>{const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#'+route);await expect(page.locator('.basic-example')).toHaveCount(count);await page.locator('.basic-example [data-control-id],.basic-example [data-navigation-part]').first().waitFor({timeout:15000});await page.locator('.basic-example').first().getByRole('button',{name:'Source code',exact:true}).click();await expect(page.locator('.basic-example pre').first()).toBeVisible();const code=await page.locator('.basic-example pre').first().textContent();expect(code).toBeTruthy();expect(code).not.toContain('options={{');expect(errors).toEqual([]);});
test('AppBar buttons: real pointer, three-state, accelerator and focus',async({page})=>{await page.goto('/#app-bar-button');await page.locator('#appbar-0 .basic-preview button[data-control-id]').click();await expect(page.locator('#appbar-0')).toContainText('You clicked: Button1');await page.locator('#appbar-4 .basic-preview button[data-control-id]').focus();await page.keyboard.press('Control+s');await expect(page.locator('#appbar-4')).toContainText('You clicked: Button5');await page.goto('/#app-bar-toggle-button');const button=page.locator('#toggle-3 .basic-preview button[data-control-id]');await button.click();await expect(button).toHaveAttribute('aria-pressed','true');await button.click();await expect(button).toHaveAttribute('aria-pressed','mixed');await button.click();await expect(button).toHaveAttribute('aria-pressed','false');expect(await button.evaluate(b=>getComputedStyle(b).outlineStyle)).toBe('none');});
test('DropDownButton uses real MenuFlyout and icon column',async({page})=>{await page.goto('/#drop-down-button');const b=page.locator('#dropdown-1 .basic-preview button[data-control-id]');await b.click();const menu=page.getByRole('menu');await expect(menu).toBeVisible();await expect(menu.getByRole('menuitem')).toHaveCount(3);await expect(b).toHaveAttribute('aria-expanded','true');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await expect(page.locator('#dropdown-1 output')).toHaveText('send');await expect(b).toHaveAttribute('aria-expanded','false');await b.focus();await page.keyboard.press('ArrowDown');await expect(menu).toBeVisible();await page.keyboard.press('Escape');await expect(b).toBeFocused();});
test('SelectorBar optional selection, arrows and official page/color updates',async({page})=>{await page.goto('/#selector-bar');const first=page.locator('#selector-0 [role=tab]');await expect(first).toHaveCount(3);await expect(first.first()).toHaveAttribute('aria-selected','false');await first.first().focus();await page.keyboard.press('ArrowRight');await expect(first.nth(1)).toHaveAttribute('aria-selected','true');await page.locator('#selector-1 [role=tab]').nth(4).click();await expect.poll(()=>page.evaluate(()=>window.commandControls['selector-1'].snapshot.navigationControl?.selectedIndex)).toBe(4);await page.locator('#selector-2 [role=tab]').nth(1).click();await expect.poll(()=>page.evaluate(()=>window.commandControls['selector-2'].snapshot.navigationControl?.selectedIndex)).toBe(1);});
test('CommandBar More, native secondary menu, dismissal and mutations',async({page})=>{const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#command-bar');const sample=page.locator('#command-0');await sample.getByRole('button',{name:'More',exact:true}).click();await expect(sample.getByRole('button',{name:'Settings',exact:true})).toBeVisible();await sample.getByRole('button',{name:'Settings',exact:true}).click();await expect(sample).toContainText('You clicked: Settings');await sample.getByRole('button',{name:'Add secondary commands',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window.commandControls['command-0'] as import('winui-wasm').CommandBarController).properties.secondaryCommands?.length)).toBe(6);await sample.getByRole('button',{name:'More',exact:true}).click();await expect(page.getByRole('button',{name:'Button 4',exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(sample.getByRole('button',{name:'More',exact:true})).toBeFocused();await sample.getByRole('button',{name:'Remove secondary commands',exact:true}).click();expect(errors).toEqual([]);});
test('CommandBar dynamic overflow preserves handle and toggle after responsive moves',async({page})=>{await page.goto('/#command-bar');await page.locator('#command-0 button[data-control-id]').first().waitFor();const result=await page.evaluate(async()=>{const a=await import('/@id/winui-wasm' as string) as typeof import('winui-wasm');const sdk=await a.WinUI.create({globalScrollbars:false});const host=document.createElement('div');host.style.cssText='position:fixed;inset:0;width:700px;height:350px;z-index:99999';document.body.append(host);const scene=sdk.scene(host);const bar=scene.root.commandBar({width:500,defaultLabelPosition:a.CommandBarDefaultLabelPosition.Right,primaryCommands:[{id:'toggle',label:'Toggle',kind:a.CommandBarItemKind.Toggle},{id:'edit',label:'Edit'},{id:'share',label:'Share'}],secondaryCommands:[{id:'settings',label:'Settings'}]});await new Promise(r=>setTimeout(r,200));const toggle=scene.snapshot.nodes.find(n=>n.kind===a.NodeKind.AppBarToggleButton)!;host.querySelector<HTMLButtonElement>(`button[data-control-id="${toggle.id}"]`)!.click();await new Promise(r=>setTimeout(r,100));bar.update({width:100,isOpen:true});await new Promise(r=>setTimeout(r,300));const overflow=[...bar.snapshot.command!.overflow];const during=scene.snapshot.nodes.find(n=>n.id===toggle.id)!;bar.update({width:500,isOpen:false});await new Promise(r=>setTimeout(r,200));const after=scene.snapshot.nodes.find(n=>n.id===toggle.id)!;const result={overflow,checked:during.props.isChecked,after:after.props.isChecked,same:after.id===toggle.id,animating:scene.snapshot.animating};scene.dispose();sdk.dispose();host.remove();return result;});expect(result.overflow).toEqual(['toggle','edit','share','settings']);expect(result.checked).toBe(true);expect(result.after).toBe(true);expect(result.same).toBe(true);});
test('closed secondary accelerators, typed business data and attached flyout stay usable',async({page})=>{await page.goto('/#command-bar');const sample=page.locator('#command-0');await sample.getByRole('button',{name:'Add',exact:true}).focus();await page.keyboard.press('Control+i');await expect(sample).toContainText('You clicked: Settings');const result=await page.evaluate(async()=>{const a=await import('/@id/winui-wasm' as string) as typeof import('winui-wasm');const sdk=await a.WinUI.create({globalScrollbars:false});const host=document.createElement('div');host.style.cssText='position:fixed;inset:0;width:500px;height:250px;z-index:99999';document.body.append(host);const scene=sdk.scene(host);const menu=scene.root.menuFlyout({menuItems:[{id:'one',text:'One'}]});const command={id:'menu',label:'Open menu',flyout:menu,businessValue:42,execute:()=>43};const bar=scene.root.commandBar({width:100,primaryCommands:[command]});let same=false;bar.onCommandInvoked(e=>{same=e.item===command&&e.item.businessValue===42&&e.item.execute()===43;});bar.open();await new Promise(r=>setTimeout(r,350));const button=host.querySelector<HTMLButtonElement>('button[aria-label="Open menu"]')!;button.click();await new Promise(r=>setTimeout(r,350));const result={same,bar:bar.properties.isOpen,menu:menu.properties.isOpen};scene.dispose();sdk.dispose();host.remove();return result;});expect(result).toEqual({same:true,bar:true,menu:true});});


test('adding and removing secondary commands retains primary buttons through open and closed updates', async ({page}) => {
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/#command-bar');
  const sample=page.locator('#command-0');
  const primary=['Add','Edit','Share'].map(name=>sample.getByRole('button',{name,exact:true}));
  for(const button of primary)await expect(button).toBeVisible();
  const identities=await Promise.all(primary.map(button=>button.getAttribute('data-control-id')));
  const geometry=await Promise.all(primary.map(button=>button.boundingBox()));
  for(let cycle=0;cycle<4;cycle++) {
    await sample.getByRole('button',{name:'Add secondary commands',exact:true}).click();
    await expect.poll(()=>page.evaluate(()=>window.commandControls['command-0'].snapshot.command?.inline)).toEqual(['add','edit','share']);
    for(let i=0;i<primary.length;i++) {
      await expect(primary[i]).toBeVisible();
      await expect(primary[i]).toHaveAttribute('data-control-id',identities[i]!);
      const after=await primary[i].boundingBox();
      expect(after!.width).toBeCloseTo(geometry[i]!.width,1);
      expect(after!.height).toBeCloseTo(geometry[i]!.height,1);
    }
    await sample.getByRole('button',{name:'More',exact:true}).click();
    await expect(sample.getByRole('button',{name:'Button 4',exact:true})).toBeVisible();
    // Keep the popup open while its source changes, then insert again.
    await page.evaluate(()=>window.commandControls['command-0'].update({secondaryCommands:[{id:'settings',label:'Settings'},{id:'extra',label:'Extra'}]}));
    await expect(sample.getByRole('button',{name:'Extra',exact:true})).toBeVisible();
    for(const button of primary)await expect(button).toBeVisible();
    await page.keyboard.press('Escape');
    await sample.getByRole('button',{name:'Remove secondary commands',exact:true}).click();
    for(const button of primary)await expect(button).toBeVisible();
    await primary[cycle%primary.length].click();
    await expect(sample).toContainText('You clicked: '+['Add','Edit','Share'][cycle%3]);
  }
  expect(errors).toEqual([]);
});


test('DropDownButton normal border stays inside its bounds at fractional and integer DPR', async ({browser},testInfo) => {
  for(const deviceScaleFactor of [1,1.25,1.5,2]) {
    const context=await browser.newContext({baseURL:testInfo.project.use.baseURL,deviceScaleFactor,viewport:{width:800,height:450}});
    const page=await context.newPage();
    await page.goto('/#drop-down-button');
    await page.locator('#dropdown-0 .basic-preview button[data-control-id]').waitFor();
    const rect=await page.evaluate(async()=>{
      const a=await import('/@id/winui-wasm' as string) as typeof import('winui-wasm');
      const sdk=await a.WinUI.create({globalScrollbars:false});
      const host=document.createElement('div');
      host.id='dropdown-border-test';
      host.style.cssText='position:fixed;inset:0;width:800px;height:450px;z-index:99999';
      document.body.append(host);
      const scene=sdk.scene(host,{root:{background:'#f3f3f3'}});
      const canvas=scene.root.canvas({width:800,height:450});
      const button=canvas.dropDownButton({text:'Email',canvasLeft:24,canvasTop:24});
      await new Promise(r=>setTimeout(r,150));
      return button.snapshot.rect;
    });
    const screenshot=await page.locator('#dropdown-border-test').screenshot();
    await testInfo.attach(`DropDownButton-Normal-DPR-${deviceScaleFactor}`,{body:screenshot,contentType:'image/png'});
    const png=PNG.sync.read(screenshot);
    const left=Math.floor(rect.x*deviceScaleFactor),top=Math.floor(rect.y*deviceScaleFactor);
    const right=Math.ceil((rect.x+rect.width)*deviceScaleFactor),bottom=Math.ceil((rect.y+rect.height)*deviceScaleFactor);
    let worst=0;
    for(let y=top-2;y<bottom+2;y++)for(let x=left-2;x<right+2;x++) {
      if(x>=left&&x<right&&y>=top&&y<bottom)continue;
      for(let c=0;c<3;c++)worst=Math.max(worst,Math.abs(png.data[(y*png.width+x)*4+c]-243));
    }
    expect(worst,`paint outside normal border at DPR ${deviceScaleFactor}`).toBeLessThanOrEqual(1);
    await context.close();
  }
});
