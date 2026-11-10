import {test,expect} from '@playwright/test';
import {PNG} from 'pngjs';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import fixtures from '../src/rich-edit-fixtures.json' with {type:'json'};
import type {Scene,WinUI,RichEditBoxController as RichEditBox} from 'winui-wasm';
declare global{interface Window{richFormatFixture:{ui:WinUI;scene:Scene;editor:RichEditBox};}}

test('RTF Gallery imports Unicode/formats and roundtrips embedded images and math',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#rich-edit-box');const section=page.locator('#rich-edit-rtf');const area=page.getByRole('textbox',{name:'RTF rich editor',exact:true});await expect(area).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>window.richEditors.rtf.text)).toContain('中文 🙂');
 await page.evaluate(()=>window.richEditors.rtf.select(0,0));await section.getByRole('button',{name:'Insert image',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>window.richEditors.rtf.document.runs.filter(r=>r.image).length)).toBe(1);await section.getByRole('button',{name:'Insert formula',exact:true}).click();
 await section.getByRole('button',{name:'Export RTF',exact:true}).click();const rtf=await page.getByRole('textbox',{name:'RTF source',exact:true}).inputValue();expect(rtf).toContain('\\pngblip');expect(rtf).toContain('\\moMath');
 await section.getByRole('button',{name:'Load RTF',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.richEditors.rtf.document.runs.filter(r=>r.image||r.mathml).length)).toBe(2);
 await expect(area).toHaveAttribute('aria-description',/Red and blue sample.*Math formula/);mkdirSync('../out/rich-edit-formats',{recursive:true});await section.screenshot({path:'../out/rich-edit-formats/gallery-rtf.png'});expect(errors).toEqual([]);
});

test('MathML Gallery renders namespace-prefixed math, exports and rejects invalid XML atomically',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#rich-edit-box');const source=page.getByRole('textbox',{name:'MathML source',exact:true});await expect(source).toBeVisible();
 await source.fill(fixtures.fraction);await page.getByRole('button',{name:'Apply MathML',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.richEditors.mathml.document.runs[0].mathml)).toBe(fixtures.fraction);
 await page.getByRole('button',{name:'Read MathML',exact:true}).click();await expect(source).toHaveValue(fixtures.fraction);await source.fill('<math><mfrac/></math>');await page.getByRole('button',{name:'Apply MathML',exact:true}).click();await expect(page.getByLabel('Rich document status')).toContainText('incorrect argument count');expect(await page.evaluate(()=>window.richEditors.mathml.getMathML())).toBe(fixtures.fraction);
 await page.locator('#rich-edit-math').getByRole('button',{name:'Matrix',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.richEditors.math.getMathML())).toContain('mtable');await page.locator('#rich-edit-mathml').screenshot({path:'../out/rich-edit-formats/gallery-mathml.png'});expect(errors).toEqual([]);
});

for(const backend of ['Canvas2D','WebGL2'] as const)test(`${backend} paints real embedded pixels and formula rules, with selection/history and rich clipboard`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#rich-edit-box');await expect(page.getByRole('textbox',{name:'Simple rich editor',exact:true})).toBeVisible();
 await page.evaluate(async({backend,fixtures})=>{
  const path='/@id/winui-wasm',a=await import(/* @vite-ignore */path) as typeof import('winui-wasm');const host=document.createElement('div');host.id='rich-formats-fixture';host.style.cssText='position:fixed;inset:0;width:420px;height:320px;z-index:999999;background:white';document.body.append(host);const ui=await a.WinUI.create({globalScrollbars:false}),scene=ui.scene(host,{theme:a.ThemeMode.Light,backend:a.RendererBackend[backend],reducedMotion:true});
  const editor=scene.root.richEditBox({accessibleName:'Object editor',width:360,height:240,fontSize:20,document:{runs:[{text:'Before '},{text:'\ufffc',image:{source:fixtures.image,width:96,height:64,altText:'Test picture'}},{text:'\n'},{text:'\ufffc',mathml:fixtures.fraction},{text:' After'}]}});window.richFormatFixture={ui,scene,editor};
 },{backend,fixtures});
 const area=page.getByRole('textbox',{name:'Object editor',exact:true});await expect(area).toBeVisible();await expect.poll(()=>page.evaluate(()=>window.richFormatFixture.scene.snapshot.imageRequests.length)).toBe(0);
 const shot=PNG.sync.read(await page.locator('#rich-formats-fixture').screenshot({path:`../out/rich-edit-formats/${backend}-objects.png`}));let red=0,blue=0;for(let i=0;i<shot.data.length;i+=4){if(shot.data[i]>180&&shot.data[i+1]<80&&shot.data[i+2]<90)red++;if(shot.data[i]<70&&shot.data[i+1]>80&&shot.data[i+2]>180)blue++;}expect(red).toBeGreaterThan(1500);expect(blue).toBeGreaterThan(1500);
 await page.evaluate(()=>window.richFormatFixture.editor.select(7,3));const copied=await area.evaluate(e=>{const data=new DataTransfer();e.dispatchEvent(new ClipboardEvent('copy',{clipboardData:data,bubbles:true,cancelable:true}));return {json:data.getData('application/x-winui-rich-document+json'),rtf:data.getData('text/rtf'),text:data.getData('text/plain')};});expect(copied.json).toContain('mathml');expect(copied.json).toContain('image/png');expect(copied.text).toContain('sqrt');expect(copied.rtf).toContain('\\moMath');expect(copied.rtf).toContain('\\mdegHide on');
 const cut=await area.evaluate(e=>{const clipboard=new DataTransfer();e.dispatchEvent(new ClipboardEvent('cut',{clipboardData:clipboard,bubbles:true,cancelable:true}));return clipboard.getData('application/x-winui-rich-document+json');});expect(cut).toBe(copied.json);
 await expect.poll(()=>page.evaluate(()=>window.richFormatFixture.editor.document.runs.filter(r=>r.image||r.mathml).length)).toBe(0);await area.focus();await area.press('Control+z');await expect.poll(()=>page.evaluate(()=>window.richFormatFixture.editor.document.runs.filter(r=>r.image||r.mathml).length)).toBe(2);
 await page.evaluate(()=>window.richFormatFixture.editor.selectAll());await area.evaluate((e,data)=>{const clipboard=new DataTransfer();clipboard.setData('application/x-winui-rich-document+json',data);e.dispatchEvent(new ClipboardEvent('paste',{clipboardData:clipboard,bubbles:true,cancelable:true}));},copied.json);
 await expect.poll(()=>page.evaluate(()=>window.richFormatFixture.editor.document.runs.filter(r=>r.image||r.mathml).length)).toBe(2);await area.focus();await area.press('Control+a');await area.press('Backspace');await expect(area).toHaveValue('');await area.press('Control+z');await expect.poll(()=>page.evaluate(()=>window.richFormatFixture.editor.document.runs.filter(r=>r.image||r.mathml).length)).toBe(2);
 await page.evaluate(()=>window.richFormatFixture.editor.selectAll());await area.evaluate((e,rtf)=>{const clipboard=new DataTransfer();clipboard.setData('text/rtf',rtf);e.dispatchEvent(new ClipboardEvent('paste',{clipboardData:clipboard,bubbles:true,cancelable:true}));},copied.rtf);await expect.poll(()=>page.evaluate(()=>window.richFormatFixture.editor.document.runs.some(r=>r.image))).toBe(true);
 await page.evaluate(async()=>{const path='/@id/winui-wasm',a=await import(/* @vite-ignore */path) as typeof import('winui-wasm');window.richFormatFixture.scene.configure({theme:a.ThemeMode.HighContrast});});await page.locator('#rich-formats-fixture').screenshot({path:`../out/rich-edit-formats/${backend}-high-contrast.png`});
 const timing=await page.evaluate(()=>{const e=window.richFormatFixture.editor,start=performance.now();let bytes=0;for(let i=0;i<20;i++)bytes+=e.getRtf().length;return {operation:'20 warm RTF exports',milliseconds:performance.now()-start,bytes};});writeFileSync(`../out/rich-edit-formats/${backend}-timing.json`,JSON.stringify(timing,null,2));
 const release=await page.evaluate(()=>{const {editor,ui}=window.richFormatFixture;const rtf=editor.getRtf();ui.dispose();let rejected=false;try{editor.getRtf();}catch{rejected=true;}const host=document.getElementById('rich-formats-fixture')!,count=host.childElementCount;host.remove();return {rejected,count,rtf:rtf.includes('\\pngblip')};});expect(release).toEqual({rejected:true,count:0,rtf:true});expect(errors).toEqual([]);
});

test('image file paste loads natural dimensions and a replaced document cancels pending paste',async({page})=>{
 await page.goto('/#rich-edit-box');const area=page.getByRole('textbox',{name:'Simple rich editor',exact:true});await expect(area).toBeVisible();
 await area.evaluate(async(e,url)=>{const blob=await(await fetch(url)).blob(),data=new DataTransfer();data.items.add(new File([blob],'pasted.png',{type:'image/png'}));e.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));},fixtures.image);
 await expect.poll(()=>page.evaluate(()=>window.richEditors.simple.document.runs.find(r=>r.image)?.image?.width)).toBe(48);
 await page.evaluate(()=>window.richEditors.simple.selectAll());await area.evaluate(async(e,url)=>{const blob=await(await fetch(url)).blob(),data=new DataTransfer();data.items.add(new File([blob],'stale.png',{type:'image/png'}));e.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));window.richEditors.simple.setText('replacement');},fixtures.image);
 await expect(area).toHaveValue('replacement');await expect.poll(()=>page.evaluate(()=>window.richEditors.simple.document.runs.some(r=>r.image))).toBe(false);
});

test('pinned native RTF and MathML cases have matching outer geometry and recorded raster differences',async({page})=>{
 const native=JSON.parse(readFileSync('../references/rich-edit-native.json','utf8')) as {cases:Array<{name:string;rect:{x:number;y:number;width:number;height:number};FontSize:number;mathml?:string;focus:string}>};
 await page.goto('/#rich-edit-box');await expect(page.getByRole('textbox',{name:'Simple rich editor',exact:true})).toBeVisible();
 const results:object[]=[];
 for(const row of native.cases.filter(r=>['Light-rtf','Dark-rtf','Light-mathml','Dark-mathml'].includes(r.name))){
  await page.evaluate(async({row,rtf})=>{window.richFormatFixture?.ui.dispose();document.getElementById('rich-native-fixture')?.remove();const path='/@id/winui-wasm',a=await import(/* @vite-ignore */path) as typeof import('winui-wasm');const host=document.createElement('div');host.id='rich-native-fixture';host.style.cssText=`position:fixed;inset:0;width:420px;height:320px;z-index:999999;background:${row.name.startsWith('Dark')?'#202020':'white'}`;document.body.append(host);const ui=await a.WinUI.create({globalScrollbars:false}),scene=ui.scene(host,{theme:row.name.startsWith('Dark')?a.ThemeMode.Dark:a.ThemeMode.Light,reducedMotion:true});const editor=scene.root.canvas().richEditBox({accessibleName:'Native comparison',canvasLeft:24,canvasTop:24,width:300,height:row.rect.height,fontSize:row.FontSize,...row.mathml?{mathML:row.mathml}:{rtf}});window.richFormatFixture={ui,scene,editor};},{row,rtf:fixtures.rtf});
  const area=page.getByRole('textbox',{name:'Native comparison',exact:true});await expect(area).toBeVisible();if(row.focus!=='Unfocused')await area.focus();
  const geometry=await page.evaluate(()=>window.richFormatFixture.editor.snapshot.rect);expect(Math.abs(geometry.width-row.rect.width)).toBeLessThan(1);expect(Math.abs(geometry.height-row.rect.height)).toBeLessThan(1);
  const actual=PNG.sync.read(await page.locator('#rich-native-fixture').screenshot({path:`../out/rich-edit-formats/${row.name}-browser.png`})),reference=PNG.sync.read(readFileSync(`../out/rich-edit-native/${row.name}.png`));
  let difference=0,count=0;for(let y=24;y<24+row.rect.height;y++)for(let x=24;x<324;x++)for(let c=0;c<3;c++){difference+=Math.abs(actual.data[(y*actual.width+x)*4+c]-reference.data[(y*reference.width+x)*4+c]);count++;}results.push({name:row.name,geometry,meanAbsoluteChannelError:difference/count,acceptance:'Recorded raster difference; no pixel equivalence claimed.'});
 }
 expect(results).toHaveLength(4);writeFileSync('../out/rich-edit-formats/native-comparison.json',JSON.stringify(results,null,2));await page.evaluate(()=>{window.richFormatFixture.ui.dispose();document.getElementById('rich-native-fixture')?.remove();});
});
