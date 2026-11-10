import {PNG} from 'pngjs';
import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import type {Scene,WinUI,RichEditBoxController as RichEditBox} from 'winui-wasm';
declare global {interface Window {richFixture?:{ui:WinUI;scene:Scene;editor:RichEditBox};}}
test('React editor types Unicode, formats inserted text, pastes and replays rich history',async({page,context})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#rich-edit-box');const editor=page.getByRole('textbox',{name:'Simple rich editor',exact:true});await expect(editor).toBeVisible();
 await editor.fill('Hello ');await editor.press('End');await editor.press('Control+b');await editor.pressSequentially('bold');await editor.press('Control+b');await editor.pressSequentially(' 中文🙂');
 await expect.poll(()=>page.evaluate(()=>window.richEditors.simple.text)).toBe('Hello bold 中文🙂');
 const runs=await page.evaluate(()=>window.richEditors.simple.document.runs);expect(runs.some(r=>r.text==='bold'&&r.format?.bold)).toBe(true);expect(runs.at(-1)?.format?.bold).toBe(false);
 await context.grantPermissions(['clipboard-read','clipboard-write']);await page.evaluate(()=>navigator.clipboard.writeText(' pasted🙂'));await editor.press('Control+v');await expect(editor).toHaveValue('Hello bold 中文🙂 pasted🙂');
 await editor.press('Control+z');await expect(editor).toHaveValue('Hello bold 中文🙂');await editor.press('Control+y');await expect(editor).toHaveValue('Hello bold 中文🙂 pasted🙂');
 expect(await editor.evaluate(e=>getComputedStyle(e).outlineStyle)).toBe('none');expect(errors).toEqual([]);
});
test('toolbar formats the preserved selection, serializes the document and restores it',async({page})=>{
 await page.goto('/#rich-edit-box');const section=page.locator('#rich-edit-custom');const area=page.getByRole('textbox',{name:'Custom rich editor',exact:true});await expect(area).toBeVisible();
 await page.evaluate(()=>window.richEditors.custom.select(0,6));await section.getByRole('button',{name:'Bold',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>window.richEditors.custom.document.runs[0].format?.bold)).toBe(true);
 await section.getByRole('button',{name:'Red',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.richEditors.custom.document.runs[0].format?.foreground)).toBe('#ff0000');
 await section.getByRole('button',{name:'Save document',exact:true}).click();const saved=await page.evaluate(()=>window.richEditors.custom.document);
 await area.fill('Replacement');await section.getByRole('button',{name:'Restore document',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.richEditors.custom.document)).toEqual(saved);
 mkdirSync('../out/rich-edit-browser',{recursive:true});await section.screenshot({path:'../out/rich-edit-browser/custom.png'});
});
test('custom CommandBarFlyout invokes Rust formatting and keeps the original selection',async({page})=>{
 await page.goto('/#rich-edit-box');await expect(page.getByRole('textbox',{name:'Editor with custom menu',exact:true})).toBeVisible();await page.evaluate(()=>window.richEditors.menu.select(0,6));await page.getByRole('button',{name:'Formatting menu',exact:true}).click();
 await page.locator('#rich-edit-menu').getByRole('button',{name:'Bold',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.richEditors.menu.document.runs[0].format?.bold)).toBe(true);
});
for(const backend of ['Canvas2D','WebGL2'] as const)test(`${backend} public SDK owns document, layout, wheel, selection and disposal`,async({page})=>{
 await page.goto('/#rich-edit-box');await expect(page.getByRole('textbox',{name:'Simple rich editor',exact:true})).toBeVisible();
 await page.evaluate(async backend=>{
  const path='/@id/winui-wasm';const a=await import(/* @vite-ignore */path) as typeof import('winui-wasm');const ui=await a.WinUI.create({globalScrollbars:false});const host=document.createElement('div');host.id='rich-fixture';host.style.cssText='position:fixed;inset:0;width:420px;height:320px;z-index:999999;background:white';document.body.append(host);
  const scene=ui.scene(host,{backend:a.RendererBackend[backend],theme:a.ThemeMode.Light,reducedMotion:true});const editor=scene.root.richEditBox({accessibleName:'Fixture editor',width:240,height:120,document:{runs:[{text:'Small '},{text:'Big',format:{fontSize:32,bold:true,underline:true,foreground:'#ff0000'}},{text:'\n'+Array.from({length:20},(_,i)=>'Line '+i).join('\n')} ]}});window.richFixture={ui,scene,editor};
 },backend);
 const area=page.getByRole('textbox',{name:'Fixture editor',exact:true});await expect(area).toBeVisible();await area.click();await area.press('Control+Home');await area.hover();await page.mouse.wheel(0,160);
 await expect.poll(()=>page.evaluate(()=>window.richFixture!.editor.snapshot.editor!.scrollY)).toBeGreaterThan(0);
 await area.press('Control+Home');await expect.poll(()=>page.evaluate(()=>window.richFixture!.editor.snapshot.editor!.scrollY)).toBe(0);
 const rect=await area.boundingBox();await page.mouse.click(rect!.x+8,rect!.y+10);await area.press('Control+End');await area.press('ArrowUp');const value=await page.evaluate(()=>({text:window.richFixture!.editor.text,start:window.richFixture!.editor.properties.selectionStart}));expect(value.start).toBeLessThan(value.text.length);
 await page.evaluate(async()=>{const path='/@id/winui-wasm';const a=await import(/* @vite-ignore */path) as typeof import('winui-wasm');const e=window.richFixture!.editor;e.select(0,5);e.formatParagraph({listStyle:a.RichEditListStyle.Bullet});e.update({isReadOnly:true});});
 const before=await area.inputValue();await area.pressSequentially('bad');await expect(area).toHaveValue(before);
 await page.evaluate(async()=>{const path='/@id/winui-wasm';const a=await import(/* @vite-ignore */path) as typeof import('winui-wasm');window.richFixture!.scene.configure({theme:a.ThemeMode.Dark});});
 await page.locator('#rich-fixture').screenshot({path:`../out/rich-edit-browser/${backend}-dark.png`});
 await page.evaluate(async()=>{const path='/@id/winui-wasm';const a=await import(/* @vite-ignore */path) as typeof import('winui-wasm');window.richFixture!.scene.configure({theme:a.ThemeMode.HighContrast});});
 const hc=PNG.sync.read(await page.locator('#rich-fixture').screenshot({path:`../out/rich-edit-browser/${backend}-high-contrast.png`}));
 const geometry=await page.evaluate(()=>{const n=window.richFixture!.editor.snapshot,e=n.editor!;return {x:n.world[4]+e.view.x+28,y:n.world[5]+e.caret.y,right:n.world[4]+e.caret.x,height:e.caret.height};});
 let white=0,yellow=0;
 for(let y=Math.ceil(geometry.y+1);y<Math.floor(geometry.y+geometry.height-1);y++)for(let x=Math.ceil(geometry.x+1);x<Math.floor(geometry.right-1);x++){const at=(y*hc.width+x)*4,r=hc.data[at],g=hc.data[at+1],b=hc.data[at+2];if(r>220&&g>220&&b>220)white++;if(r>220&&g>220&&b<30)yellow++;}
 expect(yellow,'high contrast selection background').toBeGreaterThan(50);expect(white,'selected text uses system highlight text color').toBe(0);
 const inherited=await page.evaluate(async()=>{const path='/@id/winui-wasm';const a=await import(/* @vite-ignore */path) as typeof import('winui-wasm');const e=window.richFixture!.editor;e.update({isReadOnly:false,fontWeight:700,fontStyle:a.FontStyle.Italic});e.setText('Inherited');e.selectAll();e.toggleBold();e.toggleItalic();e.formatParagraph({listStyle:a.RichEditListStyle.Bullet});e.formatParagraph({alignment:a.RichEditAlignment.Right});return e.document;});
 expect(inherited.runs[0].format?.bold).toBe(false);expect(inherited.runs[0].format?.italic).toBe(false);expect(inherited.paragraphs?.[0]?.listStyle).toBe('Bullet');
 const released=await page.evaluate(()=>{const {ui,editor}=window.richFixture!;ui.dispose();let rejected=false;try{editor.toggleBold();}catch{rejected=true;}const host=document.getElementById('rich-fixture')!;const children=host.childElementCount;host.remove();return {rejected,children};});expect(released).toEqual({rejected:true,children:0});
});
test('SplitButton color and ToggleSplitButton lists mutate actual rich documents',async({page})=>{
 await page.goto('/#split-button');const area=page.getByRole('textbox',{name:'Color editor',exact:true});await expect(area).toBeVisible();await area.fill('Selected');await area.press('Control+a');await page.getByRole('button',{name:'Font color',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>window.compactScenes['split-color-editor'].snapshot.nodes.find(n=>n.kind==='RichEditBox')?.props.document?.runs[0].format?.foreground)).toBe('#008000');
 await page.goto('/#toggle-split-button');await expect(page.getByRole('textbox',{name:'List editor',exact:true})).toBeVisible();await page.getByRole('button',{name:'Bullets',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>window.compactScenes['toggle-split'].snapshot.nodes.find(n=>n.kind==='RichEditBox')?.props.document?.paragraphs?.[0]?.listStyle)).toBe('Bullet');
});
