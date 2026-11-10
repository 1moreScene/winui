import {test,expect} from '@playwright/test';

test('Rust resolves forward names across StrictMode, repeated updates and target recreation',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/tests/declarative-properties.html?mode=names');
  const references=()=>page.evaluate(()=>{
    const snap=window.declarativeFixture.scene?.snapshot;
    const nodes=snap?.nodes??[];
    const ticks=nodes.find(node=>node.props.name==='named-ticks');
    const slider=nodes.find(node=>node.props.name==='named-slider');
    return {source:ticks?.props.primitives?.source,target:slider?.id,pending:snap?.unresolvedElementReferences?.length??0};
  });
  await expect.poll(async()=>{const state=await references();return !!state.target&&state.source===state.target&&state.pending===0;}).toBe(true);
  const first=(await references()).target;
  await page.getByRole('button',{name:'Refresh declaration',exact:true}).click();
  await expect.poll(async()=>{const state=await references();return state.source===first&&state.pending===0;}).toBe(true);
  await page.getByRole('button',{name:'Toggle named target',exact:true}).click();
  await expect.poll(async()=>{const state=await references();return state.target===undefined&&state.source==null&&state.pending===1;}).toBe(true);
  await page.getByRole('button',{name:'Toggle named target',exact:true}).click();
  await expect.poll(async()=>{const state=await references();return !!state.target&&state.target!==first&&state.source===state.target&&state.pending===0;}).toBe(true);
  await page.getByRole('button',{name:'Named action',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.declarativeFixture.actions)).toBe(1);
  expect(errors).toEqual([]);
});

test('collection invocation closes its enclosing Rust flyout without a surface callback',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/tests/declarative-properties.html?mode=collection');
  await page.getByRole('button',{name:'Choose item',exact:true}).click();
  const item=page.getByRole('option',{name:'Second',exact:true});await expect(item).toBeVisible();await item.click();
  await expect(item).toBeHidden();
  expect(await page.evaluate(()=>window.declarativeFixture.actions)).toBe(1);
  expect(errors).toEqual([]);
});

test('plain TypeScript SDK submits the same named relations and preserves public property declarations',async({page})=>{
  await page.goto('/tests/declarative-properties.html?mode=names');
  const result=await page.evaluate(async()=>{
    const {WinUI}=await import('/@id/winui-wasm' as string) as typeof import('winui-wasm');
    const ui=await WinUI.create({globalScrollbars:false}),host=document.createElement('div');
    host.style.cssText='width:400px;height:200px';document.body.append(host);
    const scene=ui.scene(host,{reducedMotion:true});
    const ticks=scene.root.tickBar({source:'volume'});
    const slider=scene.root.slider({name:'volume',value:40});
    const tip=scene.root.teachingTip({target:'volume'});
    await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
    const snapshot=scene.snapshot,source=snapshot.nodes.find(node=>node.id===ticks.snapshot.id)?.props.primitives?.source;
    const before={source,target:slider.snapshot.id,declaration:ticks.properties.source,placement:tip.properties.target,pending:snapshot.unresolvedElementReferences?.length??0};
    ticks.update({source:null});tip.update({target:null});slider.dispose();
    await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
    const detached=ticks.properties.source;ui.dispose();host.remove();return {before,detached};
  });
  expect(result.before.source).toBe(result.before.target);
  expect(result.before).toMatchObject({declaration:'volume',placement:'volume',pending:0});
  expect(result.detached).toBeNull();
});

test('Gallery source panels expose the migrated declarations across control families',async({page})=>{
  test.setTimeout(180000);
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  const samples=[
    ['popup','overlay-popup','<Popup'],['tool-tip','overlay-tooltip','Button.ToolTip'],
    ['menu-flyout','overlay-menu','Button.Flyout'],['slider','overlay-slider','<Slider'],
    ['content-dialog','composed-dialog','<ContentDialog'],['teaching-tip','composed-teaching','target="teaching-target"'],
    ['line','shape-line','<Line'],['split-button','split-color','closeFlyout'],['toggle-split-button','toggle-split','closeFlyout'],
    ['annotated-scroll-bar','annotated-linked','scrollTarget="annotated-scroll"'],
    ['rich-text-block','rich-text-overflow','overflowContentTarget="overflow-first"'],
    ['tick-bar','tick-bar-basic','source="tick-source"'],
    ['scroll-content-presenter','scroll-content-presenter-basic','scrollTarget="scroll-content"'],
    ['parallax-view','parallax-list','source="parallax-list-source"'],
    ['ui-command','ui-command-basic','command="custom-command"'],
    ['list-view','list-context','contextFlyout='],['standard-command','standard-command-basic','contextFlyout='],
  ];
  for(const [route,id,declaration] of samples){
    await page.goto('/#'+route);
    const sample=page.locator('#'+id);
    await sample.getByRole('button',{name:'Source code',exact:true}).click();
    const code=sample.locator('pre').first();
    await expect(code).toContainText(declaration);
    for(const obsolete of ['<Canvas','surface=>','surface.hide()','setContextTarget','setHeroTarget','showAt('])await expect(code).not.toContainText(obsolete);
  }
  expect(errors).toEqual([]);
});

test('all button families accept owned declarations and ordinary confirm needs no controller',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/tests/declarative-properties.html');
  for(const [anchor,item] of [['Split declaration options','Split command'],['Toggle split declaration options','Toggle split command'],['App action','App command'],['Toggle action','Toggle command'],['Dropdown declaration','Dropdown command']]){
    await page.getByRole('button',{name:anchor,exact:true}).click();
    const command=page.getByRole('menuitem',{name:item,exact:true});await expect(command).toBeVisible();await command.click();await expect(command).toBeHidden();
  }
  await page.getByRole('button',{name:'Command declaration',exact:true}).click();await expect(page.getByRole('button',{name:'Owned command',exact:true})).toBeVisible();await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Simple close',exact:true}).click();
  const confirm=page.getByRole('button',{name:'Declarative confirm',exact:true});await expect(confirm).toBeVisible();await confirm.click();await expect(confirm).toBeHidden();
  expect(await page.evaluate(()=>window.declarativeFixture.actions)).toBe(6);expect(errors).toEqual([]);
});

test('attached ToolTips on leaf and container controls infer targets and stay outside Rust properties',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/tests/declarative-properties.html?mode=tips');
  for(const [role,name,tip] of [['textbox','Attached input','Input help'],['switch','Attached switch','Switch help'],['button','Attached button','Button help']] as const){
    await page.getByRole(role,{name,exact:true}).hover();await expect(page.getByRole('tooltip',{name:tip,exact:true})).toBeVisible();await page.mouse.move(850,750);await expect(page.getByRole('tooltip',{name:tip,exact:true})).toBeHidden();
  }
  expect(errors).toEqual([]);
});

test('ContextFlyout handles right click and keyboard on buttons and editors without showAt handlers',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/tests/declarative-properties.html?mode=context');
  const owner=page.getByRole('button',{name:'Context owner',exact:true});
  await owner.click({button:'right'});const command=page.getByRole('menuitem',{name:'Context action',exact:true});await expect(command).toBeVisible();await command.click();await expect(command).toBeHidden();
  const input=page.getByRole('textbox',{name:'Context input',exact:true});await input.focus();await page.keyboard.press('Shift+F10');
  const edit=page.getByRole('menuitem',{name:'Input context action',exact:true});await expect(edit).toBeVisible();await edit.click();await expect(edit).toBeHidden();await expect(input).toBeFocused();
  const bounds=await page.locator('#root .winui-scene').boundingBox();await page.mouse.click(bounds!.x+70,bounds!.y+240,{button:'right'});
  const shape=page.getByRole('menuitem',{name:'Shape context action',exact:true});await expect(shape).toBeVisible();await shape.click();
  expect(await page.evaluate(()=>window.declarativeFixture.actions)).toBe(3);expect(errors).toEqual([]);
});

test('named property elements populate native slots with no extra control implementation',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/tests/declarative-properties.html?mode=slots');
  for(const text of ['Declared header','Declared pane','Declared content','Declared items header','Declared items footer','Declared hero','Declared refresh visual'])await expect.poll(()=>page.evaluate(text=>window.declarativeFixture.scene?.snapshot.nodes.some(node=>node.props.text===text),text)).toBe(true);
  await page.getByRole('button',{name:'Declared action',exact:true}).click();expect(await page.evaluate(()=>window.declarativeFixture.actions)).toBe(1);expect(errors).toEqual([]);
});

test('Gallery displays the simplified Flyout sample, matching its running declaration',async({page})=>{
  await page.goto('/#flyout');
  const source=page.locator('#overlay-flyout .source');
  await source.getByRole('button',{name:'Source code',exact:true}).click();
  const code=source.locator('pre');await expect(code).toContainText('Button.Flyout');await expect(code).toContainText('closeFlyout');await expect(code).not.toContainText('<Canvas');await expect(code).not.toContainText('(surface)');await expect(code).not.toContainText('setFlyout');
  await page.getByRole('button',{name:'Empty cart',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>{const overlay=window.overlayScenes.flyout.snapshot.nodes.find(node=>node.kind==='Flyout')?.overlay;return !!overlay&&overlay.opacity>=.999&&overlay.offset.every(value=>Math.abs(value)<.1);})).toBe(true);
  await page.getByRole('button',{name:'Confirm empty cart',exact:true}).click();await expect(page.getByRole('button',{name:'Confirm empty cart',exact:true})).toBeHidden();
});

test('Gallery header menus and API information use owned declarative flyouts',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/#button');
  const details=page.getByRole('button',{name:'API details',exact:true});await details.click();
  await expect(page.getByText('Namespace',{exact:true})).toBeVisible();
  await page.keyboard.press('Escape');await expect(details).toBeFocused();
  const source=page.getByRole('button',{name:'Source',exact:true});await source.click();
  await expect(page.getByRole('menuitem',{name:'Official Gallery sample',exact:true})).toBeVisible();
  await page.keyboard.press('Escape');await expect(source).toBeFocused();
  expect(errors).toEqual([]);
});
