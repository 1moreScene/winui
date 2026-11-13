import {selectGalleryOption,setGalleryChecked} from './gallery-control-helper';
import {test,expect} from '@playwright/test';
for(const backend of ['Canvas2D','WebGL2']){
 test(`${backend} NumberBox commits expressions, steps, clears and restores invalid input`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#number-box');await selectGalleryOption(page.getByRole('combobox',{name:'Renderer',exact:true}),backend);await expect.poll(()=>page.evaluate(()=>Object.values((window as any).composedScenes??{}).filter(Boolean).map((s:any)=>s.snapshot.backend.kind))).toContain(backend);await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));
  const input=page.getByRole('spinbutton',{name:'Quantity',exact:true});await input.fill('2 + 3 * 4');await input.press('Enter');await expect(input).toHaveValue('14');await page.getByRole('button',{name:'Clear value',exact:true}).focus();await input.focus();await expect(page.getByRole('button',{name:'Clear text',exact:true})).toBeVisible();await input.press('ArrowUp');await expect(input).toHaveValue('15');await input.press('PageDown');await expect(input).toHaveValue('5');await input.fill('bad');await input.press('Enter');await expect(input).toHaveValue('5');await input.fill('');await input.press('Enter');await input.press('ArrowUp');await expect(input).toHaveValue('');expect(errors).toEqual([]);
 });
 test(`${backend} AutoSuggestBox filters and submits a keyboard suggestion`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#auto-suggest-box');await selectGalleryOption(page.getByRole('combobox',{name:'Renderer',exact:true}),backend);await expect.poll(()=>page.evaluate(()=>Object.values((window as any).composedScenes??{}).filter(Boolean).map((s:any)=>s.snapshot.backend.kind))).toContain(backend);await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));const input=page.getByRole('combobox',{name:'Colors',exact:true});await input.fill('re');await expect.poll(()=>page.evaluate(()=>window.composedScenes.AutoSuggestBox.snapshot.nodes.find(n=>n.kind==='AutoSuggestBox')?.props.text)).toBe('re');await expect.poll(()=>page.locator('#composed-suggest [role=option]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')))).toEqual(['Green','Red']);await input.press('ArrowDown');await expect(input).toHaveValue('Green');await input.press('Enter');await expect(page.getByLabel('composed-suggest output')).toContainText('Query: Green');expect(errors).toEqual([]);
 });
 test(`${backend} official ComboBox samples select colors and fonts and validate font sizes`,async({page})=>{
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/#combo-box');
  await selectGalleryOption(page.getByRole('combobox',{name:'Renderer',exact:true}),backend);
  await expect.poll(()=>page.evaluate(()=>window.composedScenes?.ComboBox?.snapshot.backend.kind)).toBe(backend);
  const input=page.getByRole('combobox',{name:'Colors',exact:true});
  await input.focus();
  await input.press('ArrowDown');
  await expect(input).toHaveValue('Blue');
  await input.press('r');
  await expect(input).toHaveValue('Red');
  await expect.poll(()=>page.evaluate(()=>window.composedScenes.ComboBox.snapshot.nodes.find(n=>n.kind==='Rectangle')?.props.fill)).toBe('#ff0000');
  await input.press('F4');
  await expect(input).toHaveAttribute('aria-expanded','true');
  await input.press('Escape');
  await expect(input).toHaveAttribute('aria-expanded','false');
  const font=page.getByRole('combobox',{name:'Font',exact:true});
  await expect(font).toHaveValue('Courier New');
  await font.press('Home');
  await expect.poll(()=>page.evaluate(()=>window.composedScenes.ComboBoxFonts.snapshot.nodes.find(n=>n.props.text==='You can set the font used for this text.')?.props.fontFamily)).toBe('Arial');
  const size=page.getByRole('combobox',{name:'Font Size',exact:true});
  await expect(size).toHaveValue('10');
  await size.fill('27.5');
  await size.press('Enter');
  await expect.poll(()=>page.evaluate(()=>window.composedScenes.ComboBoxEditable.snapshot.nodes.find(n=>n.props.text==='You can set the font size used for this text.')?.props.fontSize)).toBe(27.5);
  await size.press('F4');
  await expect(size).toHaveAttribute('aria-expanded','true');
  await expect(page.getByRole('option',{name:'27.5',exact:true})).toHaveCount(0);
  await size.press('Escape');
  await size.fill('100');
  await size.press('Enter');
  await expect(page.getByRole('dialog')).toContainText('The font size must be a number between 8 and 100.');
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await expect(size).toHaveValue('27.5');
  expect(errors).toEqual([]);
 });
 test(`${backend} ContentDialog result, cancellation and deferral`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#content-dialog');await selectGalleryOption(page.getByRole('combobox',{name:'Renderer',exact:true}),backend);await expect.poll(()=>page.evaluate(()=>Object.values((window as any).composedScenes??{}).filter(Boolean).map((s:any)=>s.snapshot.backend.kind))).toContain(backend);await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));const open=page.getByRole('button',{name:'Show dialog',exact:true}),save=page.getByRole('button',{name:'Save',exact:true});await open.click();await expect(save).toBeVisible();await setGalleryChecked(page.getByRole('checkbox',{name:'Cancel closing',exact:true}),true);await save.click();await expect(save).toBeVisible();await setGalleryChecked(page.getByRole('checkbox',{name:'Cancel closing',exact:true}),false);await setGalleryChecked(page.getByRole('checkbox',{name:'Delay primary action',exact:true}),true);await save.click();await expect(save).toBeDisabled();await expect(save).toBeHidden();await expect(page.getByLabel('composed-dialog output')).toContainText('Primary');await expect(open).toBeFocused();expect(errors).toEqual([]);
 });
 test(`${backend} TeachingTip target, placements and close lifecycle`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#teaching-tip');await selectGalleryOption(page.getByRole('combobox',{name:'Renderer',exact:true}),backend);await expect.poll(()=>page.evaluate(()=>Object.values((window as any).composedScenes??{}).filter(Boolean).map((s:any)=>s.snapshot.backend.kind))).toContain(backend);await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));await page.getByRole('button',{name:'Show teaching tip',exact:true}).click();const close=page.getByRole('button',{name:'Got it',exact:true});await expect(close).toBeVisible();await page.getByRole('button',{name:'Learn more',exact:true}).click();await expect(page.getByLabel('composed-teaching output')).toContainText('Action invoked');await close.click();await expect(close).toBeHidden();expect(errors).toEqual([]);
 });
}

test('public SDK preserves suggestion business objects, handles editable commits and disposes pending dialogs',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#number-box');await page.getByRole('spinbutton',{name:'Quantity',exact:true}).waitFor();
 const result=await page.evaluate(async()=>{const path='/@id/winui-wasm';const api=await import(path);const sdk=await api.WinUI.create({globalScrollbars:false}),host=document.createElement('div');host.style.cssText='width:800px;height:500px';document.body.append(host);const scene=sdk.scene(host,{reducedMotion:true});const root=scene.root.canvas();const item={id:'first',text:'First',business:{amount:42}};const suggest=root.autoSuggestBox({items:[item]});let same=false,chosen=false;suggest.onSuggestionChosen((e:any)=>{same=e.selectedItem===item;});suggest.onQuerySubmitted((e:any)=>{chosen=e.chosenItem===item;});suggest.choose(0);
 const combo=root.comboBox({items:['One','Two'],isEditable:true,selectedIndex:0});combo.onTextSubmitted((e:any)=>{e.handled=true;});combo.update({text:'Two'});combo.submit();const dialog=root.contentDialog({title:'Pending',primaryButtonText:'Save'});const completion=dialog.showAsync();let rejected=false;try{root.contentDialog().showAsync();}catch{rejected=true;}
 for(let n=0;n<5;n++)await new Promise(requestAnimationFrame);const selected=combo.properties.selectedIndex;dialog.dispose();const disposedResult=await completion;scene.dispose();sdk.dispose();host.remove();return {same,chosen,selected,rejected,disposedResult};});
 expect(result).toEqual({same:true,chosen:true,selected:0,rejected:true,disposedResult:'None'});expect(errors).toEqual([]);
});
test('NumberBox localized input and IME draft preserve commit semantics',async({page})=>{
 await page.goto('/#number-box');const input=page.getByRole('spinbutton',{name:'Quantity',exact:true});await input.waitFor();await page.evaluate(()=>{const scene=window.composedScenes.NumberBox;const node=scene.snapshot.nodes.find(n=>n.kind==='NumberBox')!;const editor=node.composed!.parts.InputBox;const element=document.querySelector(`[data-editor="${editor}"]`) as HTMLInputElement;element.dispatchEvent(new CompositionEvent('compositionstart',{data:'',bubbles:true}));element.value='24';element.dispatchEvent(new CompositionEvent('compositionupdate',{data:'24',bubbles:true}));element.dispatchEvent(new InputEvent('input',{data:'24',inputType:'insertCompositionText',isComposing:true,bubbles:true}));});await input.press('Enter');await expect.poll(()=>page.evaluate(()=>window.composedScenes.NumberBox.snapshot.nodes.find(n=>n.kind==='NumberBox')!.composed!.value)).toBe(42);await input.dispatchEvent('compositionend',{data:'24'});await input.press('Enter');await expect(input).toHaveValue('24');
 await page.evaluate(()=>{const scene=window.composedScenes.NumberBox;const n=scene.snapshot.nodes.find(n=>n.kind==='NumberBox')!;const node=(scene as any).nodes.get(n.id);node.update({numberFormat:{locale:'de-DE',useGrouping:true,minimumFractionDigits:2},maximum:10000,value:1234.5});});await expect(input).toHaveValue('1.234,50');await input.fill('2.345,75');await input.press('Enter');await expect(input).toHaveValue('2.345,75');
});
test('ContentDialog keeps keyboard focus inside its root and respects the focused button',async({page})=>{
 await page.goto('/#content-dialog');await page.getByRole('button',{name:'Show dialog',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Save your work?',exact:true});await expect(dialog).toBeVisible();const save=page.getByRole('button',{name:'Save',exact:true}),cancel=page.getByRole('button',{name:'Cancel',exact:true});await save.focus();for(let i=0;i<7;i++){await page.keyboard.press('Tab');expect(await dialog.evaluate(e=>e.contains(document.activeElement))).toBe(true);}await cancel.focus();await page.keyboard.press('Enter');await expect(dialog).toBeHidden();await expect(page.getByLabel('composed-dialog output')).toContainText('None');
});

test('ComboBox large sources remain virtualized and support rich item templates',async({page})=>{
 await page.goto('/#combo-box');await page.getByRole('combobox',{name:'Colors',exact:true}).waitFor();const result=await page.evaluate(async()=>{const path='/@id/winui-wasm';const api=await import(path),sdk=await api.WinUI.create({globalScrollbars:false}),host=document.createElement('div');host.style.cssText='width:900px;height:600px';document.body.append(host);const scene=sdk.scene(host,{reducedMotion:true}),root=scene.root.canvas();const combo=root.comboBox({width:240,items:Array.from({length:10000},(_,i)=>({id:String(i),text:`Item ${i}`,description:`Details ${i}`})),selectedIndex:9999});const release=combo.itemsView.setItemTemplate((item:any,container:any)=>{container.text({text:item.description});});combo.open();for(let i=0;i<5;i++)await new Promise(requestAnimationFrame);const items=combo.itemsView.realizedItems();const control=combo.snapshot;const popup=scene.snapshot.nodes.find((n:any)=>n.id===control.composed!.parts.Popup)!;const result={live:items.length,total:scene.snapshot.nodes.length,last:items.some((s:any)=>s.index===9999),popupY:popup.rect.y,descriptions:scene.snapshot.nodes.some((n:any)=>n.props.text==='Details 9999')};release();scene.dispose();sdk.dispose();host.remove();return result;});expect(result.live).toBeLessThan(150);expect(result.total).toBeLessThan(400);expect(result.last).toBe(true);expect(result.descriptions).toBe(true);expect(result.popupY).toBeGreaterThan(-600);
});

test('all official composed samples mount, format quarters and show hero content',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#number-box');await expect(page.locator('section.example:visible')).toHaveCount(3);const quarter=page.getByRole('spinbutton',{name:'Enter a dollar amount:',exact:true});await quarter.fill('2.36');await quarter.press('Enter');await expect(quarter).toHaveValue('2.25');await page.goto('/#combo-box');await expect(page.locator('section[id^="composed-combo"]:visible')).toHaveCount(3);
 const font=page.getByRole('combobox',{name:'Font',exact:true});
 // Keyboard press does not wait for Frame transition actionability like click does.
 await expect.poll(()=>font.evaluate(element=>!!element.closest('[inert]'))).toBe(false);
 await font.press('F4');await expect(page.getByRole('option',{name:'Segoe UI',exact:true})).toBeVisible();await page.goto('/#content-dialog');await expect(page.locator('section.example:visible')).toHaveCount(2);await page.getByRole('button',{name:'Show dialog without default',exact:true}).click();await expect(page.getByRole('checkbox',{name:'Upload your content to the cloud.',exact:true})).toBeFocused();await page.keyboard.press('Escape');await page.goto('/#teaching-tip');await expect(page.locator('section.example:visible')).toHaveCount(3);await page.getByRole('button',{name:'Show teaching tip with hero',exact:true}).click();await expect(page.getByRole('img',{name:'Sunset',exact:true})).toBeVisible();await page.getByRole('button',{name:'Close',exact:true}).click();await expect(page.getByRole('img',{name:'Sunset',exact:true})).toBeHidden();expect(errors).toEqual([]);
});
