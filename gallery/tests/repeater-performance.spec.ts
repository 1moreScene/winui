import {test,expect} from '@playwright/test';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
const native=JSON.parse(readFileSync('../references/repeater-button-native.json','utf8')) as {rows:{theme:string;state:string;background?:string;foreground?:string;items?:{index:number;kind:string;rect:number[]}[]}[]};

test('all seven repeaters settle and stop scheduling frames while idle',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#items-repeater');
 await expect.poll(()=>page.evaluate(()=>Object.keys(window.repeaterScenes??{}).length)).toBe(7);
 await page.evaluate(()=>document.fonts.ready.then(()=>undefined));
 await expect.poll(()=>page.evaluate(()=>Object.entries(window.repeaterScenes).every(([key,s])=>{const state=s.snapshot,repeaters=state.nodes.filter(n=>n.repeater);return !state.animating&&repeaters.length>=(key==='nested'?5:1)&&repeaters.every(n=>n.repeater!.realized.length>0&&n.repeater!.realized.every(slot=>state.nodes.find(child=>child.id===slot.id)!.children.length>0));}))).toBe(true);
 // onReady precedes React mounting the item templates. Sample idle only after
 // those layout effects and font-driven invalidations have had time to commit.
 await page.waitForTimeout(250);
 const before=await page.evaluate(()=>Object.fromEntries(Object.entries(window.repeaterScenes).map(([k,s])=>[k,{frames:s.diagnostics.frames,layouts:s.snapshot.layoutPasses}])));
 await page.waitForTimeout(800);
 const after=await page.evaluate(()=>Object.fromEntries(Object.entries(window.repeaterScenes).map(([k,s])=>[k,{frames:s.diagnostics.frames,layouts:s.snapshot.layoutPasses}])));
 expect(after).toEqual(before);expect(errors).toEqual([]);
 mkdirSync('../out/repeater-performance',{recursive:true});writeFileSync('../out/repeater-performance/idle.json',JSON.stringify({before,after},null,2));
});

test('React templates survive virtualized round trips and recipe filtering',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#items-repeater');await expect.poll(()=>page.evaluate(()=>window.repeaterGalleryViews?.recipes?.items.length)).toBe(1000);
 for(const [key,last]of [['virtual',490],['recipes',990]]as const){
  for(const index of [last,0,last,0]){await page.evaluate(({key,index})=>window.repeaterGalleryViews[key].scrollIntoView(index),{key,index});await expect.poll(()=>page.evaluate(({key,index})=>window.repeaterGalleryViews[key].realizedItems().some(slot=>slot.index===index),{key,index})).toBe(true);await expect.poll(()=>page.evaluate(key=>window.repeaterGalleryViews[key].realizedItems().every(slot=>slot.container.snapshot.children.length>0),key)).toBe(true);}
  expect(await page.evaluate(key=>window.repeaterScenes[key].snapshot.nodes.length,key)).toBeLessThan(350);
 }
 await page.locator('#repeater-recipes').getByRole('textbox',{name:'Filter by ingredient...',exact:true}).fill('Garlic');await expect.poll(()=>page.evaluate(()=>window.repeaterGalleryViews.recipes.items.length)).toBeLessThan(1000);
 await page.locator('#repeater-recipes').getByRole('textbox',{name:'Filter by ingredient...',exact:true}).fill('');await expect.poll(()=>page.evaluate(()=>window.repeaterGalleryViews.recipes.items.length)).toBe(1000);expect(errors).toEqual([]);
});

for(const theme of ['Light','Dark'])test(`${theme}: animated sample uses native Button geometry and presenter states`,async({page},info)=>{
 await page.addInitScript(theme=>localStorage.setItem('winui-gallery.theme',theme),theme);await page.goto('/#items-repeater');const sample=page.locator('#repeater-animated');await sample.scrollIntoViewIfNeeded();const blue=sample.getByRole('button',{name:/^Blue(?: , selected)?$/});await expect(blue).toBeVisible();
 const geometry=await page.evaluate(()=>{const s=window.repeaterScenes.animated.snapshot;return s.nodes.filter(n=>n.kind==='Button').map(n=>({text:n.props.text,rect:n.rect}));});const fixture=native.rows.find(r=>r.theme===theme&&r.state==='AnimatedTemplate')!;
 for(const expected of fixture.items!){const actual=geometry[expected.index];expect(actual).toBeTruthy();expect(Math.abs(actual.rect.width-expected.rect[2])).toBeLessThanOrEqual(0.81);expect(Math.abs(actual.rect.height-expected.rect[3])).toBeLessThanOrEqual(0.81);}
 async function pixel(){return blue.evaluate(b=>{const canvas=b.closest('.winui-scene')!.querySelector('canvas')!;const r=canvas.getBoundingClientRect(),box=b.getBoundingClientRect();const x=(box.x+box.width*.2-r.x)*canvas.width/r.width,y=(box.y+box.height*.5-r.y)*canvas.height/r.height;return Array.from(canvas.getContext('2d')!.getImageData(Math.floor(x),Math.floor(y),1,1).data);});}
 async function color(state:string){const expected=native.rows.find(r=>r.theme===theme&&r.state===state)!.background!;const rgba=[0,2,4,6].map(i=>parseInt(expected.slice(1+i,3+i),16));await expect.poll(async()=>{const actual=await pixel();return Math.max(...actual.map((v,i)=>Math.abs(v-rgba[i])));}).toBeLessThanOrEqual(2);mkdirSync('../out/repeater-performance',{recursive:true});await sample.screenshot({path:`../out/repeater-performance/${info.project.name}-${theme}-${state}.png`});}
 await page.mouse.move(2,2);await color('Normal');await blue.hover();await color('PointerOver');await page.mouse.down();await color('Pressed');await page.mouse.up();await expect.poll(()=>page.evaluate(()=>window.repeaterScenes.animated.snapshot.nodes.find(n=>n.kind==='Rectangle')?.props.fill)).toBe('#0000ff');await page.mouse.move(2,2);await color('Normal');
 expect(await sample.locator('.basic-preview').evaluate(n=>getComputedStyle(n).padding)).toBe('12px');expect(await page.locator('#repeater-basic .options').evaluate(n=>getComputedStyle(n).padding)).toBe('16px');
 mkdirSync('../out/repeater-performance',{recursive:true});await sample.screenshot({path:`../out/repeater-performance/${info.project.name}-${theme}-buttons.png`});
});
