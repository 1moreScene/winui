import {selectGalleryOption} from './gallery-control-helper';
import {test,expect} from '@playwright/test';
test('RadioButtons group selection, arrow navigation, Tab entry and source use the shared SDK',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#radio-button');
 const group=page.getByRole('radiogroup',{name:'Options:',exact:true});await expect(group).toBeVisible();const radios=group.getByRole('radio');await expect(radios).toHaveCount(3);await page.locator('main').screenshot({path:'../out/selection-input/radio-gallery-initial.png'});
 expect(await page.evaluate(()=>window.inputScenes['radio-group'].snapshot.nodes.filter(n=>n.kind==='RadioButton').every(n=>n.text.lines.length===1))).toBe(true);
 await radios.nth(1).click();await expect(radios.nth(1)).toBeChecked();await expect(page.locator('#radio-group [role=status]')).toHaveText('You selected Option 2');
 await radios.nth(1).press('ArrowDown');await expect(radios.nth(2)).toBeChecked();await expect(radios.nth(2)).toBeFocused();await expect(radios.nth(1)).not.toBeChecked();
 expect(await radios.evaluateAll(nodes=>nodes.map(n=>(n as HTMLButtonElement).tabIndex))).toEqual([-1,-1,0]);
 await radios.nth(2).press('Enter');await expect(radios.nth(2)).toBeChecked();await radios.nth(2).press('Space');await expect(radios.nth(2)).toBeChecked();
 const background=page.getByRole('radiogroup',{name:'Background',exact:true});await background.getByRole('radio',{name:'White',exact:true}).click();await expect(background.getByRole('radio',{name:'White',exact:true})).toBeChecked();
 await page.locator("#radio-group details.source [aria-label=\"Source code\"][aria-expanded]").click();await expect(page.locator('#radio-group pre')).toContainText('<RadioButtons');await expect(page.locator('#radio-group pre')).not.toContainText('options=');
 for(const backend of ['WebGL2','Canvas2D']){await selectGalleryOption(page.getByLabel('Input renderer'),backend);await expect(page.getByRole('radiogroup',{name:'Options:',exact:true}).getByRole('radio')).toHaveCount(3);}
 await page.locator('main').screenshot({path:'../out/selection-input/radio-gallery.png'});expect(errors).toEqual([]);
});
test('ToggleSwitch pointer, Space, drag, theme and reduced-motion policies remain Rust-owned',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#toggle-switch');const control=page.getByRole('switch',{name:'simple ToggleSwitch',exact:true});await expect(control).not.toBeChecked();await page.locator('main').screenshot({path:'../out/selection-input/switch-gallery-initial.png'});
 await control.click();await expect(control).toBeChecked();await control.press('Space');await expect(control).not.toBeChecked();await control.press('Enter');await expect(control).not.toBeChecked();
 const box=(await control.boundingBox())!;await page.mouse.move(box.x+5,box.y+20);await page.mouse.down();await page.mouse.move(box.x+30,box.y+20,{steps:5});await page.mouse.up();await expect(control).toBeChecked();
 const custom=page.getByRole('switch',{name:'Toggle work',exact:true});await expect(custom).toBeChecked();await custom.click();await expect(custom).not.toBeChecked();
 for(const theme of ['Dark','HighContrast','Light']){await selectGalleryOption(page.locator('#theme'),theme);await expect(control).toBeVisible();}
 await page.evaluate(()=>window.inputScenes['switch-simple'].configure({reducedMotion:true}));await control.click();await expect.poll(()=>page.evaluate(()=>window.inputScenes['switch-simple'].snapshot.animating)).toBe(false);
 await page.locator('main').screenshot({path:'../out/selection-input/switch-gallery.png'});expect(errors).toEqual([]);
});
test('named radio groups span containers and preserve selection',async({page})=>{
 await page.goto('/#radio-button');await expect(page.getByRole('radiogroup',{name:'Options:',exact:true})).toBeVisible();
 await page.evaluate(()=>{
  const scene=window.inputScenes['radio-group'];const a=scene.root.stack({margin:[300,0,0,0]});const b=scene.root.stack({margin:[300,90,0,0]});
  const first=a.radioButton({text:'Cross one',groupName:'cross'});const second=b.radioButton({text:'Cross two',groupName:'cross'});first.update({isChecked:true});second.update({isChecked:true});
 });
 await expect(page.getByRole('radio',{name:'Cross one',exact:true})).not.toBeChecked();await expect(page.getByRole('radio',{name:'Cross two',exact:true})).toBeChecked();
 await page.getByRole('radio',{name:'Cross one',exact:true}).click();await expect(page.getByRole('radio',{name:'Cross one',exact:true})).toBeChecked();await expect(page.getByRole('radio',{name:'Cross two',exact:true})).not.toBeChecked();
});

import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {PNG} from 'pngjs';
import type {Scene,RadioButton,ToggleSwitch} from '../src/index';
declare global {interface Window {selectionInputFixture:{scene:Scene;control:RadioButton|ToggleSwitch}}}
test('RadioButton and ToggleSwitch settled templates compare with the matched SDK matrix',async({page})=>{
 test.setTimeout(120000);mkdirSync('../out/selection-input',{recursive:true});
 const native=JSON.parse(readFileSync('../out/selection-input-native/input-metrics.json','utf8'));
 const comparisons:{backend:string;theme:string;kind:string;state:string;checked:boolean;mean:number;glyphMean:number;circleRows?:{actual:number[];native:number[]}}[]=[];
 await page.goto('/#navigation-view');await expect(page.locator('#runtime-status')).toHaveText(/Ready/);
 for(const backend of ['Canvas2D','WebGL2'])for(const item of native.matrix){
  await page.evaluate(async({backend,item})=>{
   const a=await import('/src/index.ts' as string) as typeof import('../src/index');
   const host=document.createElement('div');host.id='selection-input-fixture';host.style.cssText='position:fixed;left:0;top:0;width:1000px;height:500px;z-index:99999';document.body.append(host);
   const surface=window.gallery.sdk.scene(host,{backend:a.RendererBackend[backend as keyof typeof a.RendererBackend],theme:a.ThemeMode[item.theme as keyof typeof a.ThemeMode],reducedMotion:true});
   const layout={width:220,height:item.bounds.height,margin:[24,24,0,0] as [number,number,number,number],verticalAlignment:a.VerticalAlignment.Top,horizontalAlignment:a.HorizontalAlignment.Left,enabled:item.state!=='Disabled',accessibleName:'fixture'};
   const control=item.kind==='RadioButton'?surface.root.radioButton({...layout,text:'RadioButton',isChecked:item.isChecked}):surface.root.toggleSwitch({...layout,isOn:item.isChecked});
   window.selectionInputFixture={scene:surface,control};
  },{backend,item});
  const control=page.getByRole(item.kind==='RadioButton'?'radio':'switch',{name:'fixture',exact:true});await expect(control).toBeAttached();
  const box=(await control.boundingBox())!;await page.mouse.move(990,490);
  if(item.state==='PointerOver'||item.state==='Pressed')await page.mouse.move(box.x+8,box.y+12);
  if(item.state==='Pressed')await page.mouse.down();
  await expect.poll(()=>page.evaluate(()=>window.selectionInputFixture.control.snapshot.state)).toBe(item.state);
  const screenshot=await control.screenshot();if(item.theme==='Light'&&item.state==='Normal')writeFileSync(`../out/selection-input/${backend}-${item.kind}-${item.isChecked}.png`,screenshot);const actual=PNG.sync.read(screenshot);const expected=PNG.sync.read(readFileSync(`../out/selection-input-native/${item.theme}-${item.kind}.png`));
  let sum=0,glyph=0;for(let y=0;y<actual.height;y++)for(let x=0;x<actual.width;x++)for(let c=0;c<3;c++){
   const difference=Math.abs(actual.data[(y*actual.width+x)*4+c]-expected.data[((item.bounds.y+y)*expected.width+item.bounds.x+x)*4+c]);sum+=difference;if(x<40)glyph+=difference;
  }
  let circleRows:{actual:number[];native:number[]}|undefined;
  if(item.kind==='RadioButton'&&item.theme==='Light'&&item.state==='Normal'&&item.isChecked){
   const rows=(png:PNG,ox:number,oy:number)=>Array.from({length:20},(_,y)=>{let ink=0;for(let x=0;x<20;x++){const i=((y+oy)*png.width+x+ox)*4;if(png.data[i]<100&&png.data[i+2]>100)ink++;}return ink;});
   circleRows={actual:rows(actual,0,6),native:rows(expected,item.bounds.x,item.bounds.y+6)};
   expect(Math.max(...circleRows.actual.map((v,i)=>Math.abs(v-circleRows!.native[i])))).toBeLessThanOrEqual(2);
   expect(Math.abs(circleRows.actual.reduce((a,b)=>a+b,0)-circleRows.native.reduce((a,b)=>a+b,0))).toBeLessThanOrEqual(8);
  }
  comparisons.push({backend,theme:item.theme,kind:item.kind,state:item.state,checked:item.isChecked,mean:sum/(actual.width*actual.height*3),glyphMean:glyph/(40*actual.height*3),circleRows});
  if(item.state==='Pressed'){await page.mouse.move(990,490);await page.mouse.up();}
  await page.evaluate(()=>{window.selectionInputFixture.scene.dispose();document.getElementById('selection-input-fixture')!.remove();});
 }
 writeFileSync('../references/validation/selection-input-comparison.json',JSON.stringify({comparisons,acceptedReleaseParity:false,acceptedPixelParity:false,reference:'Own fixed-SDK forced-state RenderTargetBitmap matrix, not a Store Gallery screenshot',boundary:'Whole-control average error is a diagnostic budget; glyph-region errors are recorded separately. High-contrast palette is tested semantically but not included in this native matrix.'},null,2)+'\n');
 expect(Math.max(...comparisons.map(c=>c.mean))).toBeLessThan(4);
 expect(Math.max(...comparisons.map(c=>c.glyphMean))).toBeLessThan(5);
});
