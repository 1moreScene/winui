import {test,expect} from '@playwright/test';
import {selectGalleryOption} from './gallery-control-helper';
import {writeFileSync,readFileSync} from 'node:fs';
import {PNG} from 'pngjs';
import {resolve} from 'node:path';
import {RendererBackend,ThemeMode,EventKind} from 'winui-wasm';
test.beforeEach(async({page})=>{
 // A shared dev server can hot-replace unrelated React modules during a
 // native comparison. Freeze only this test session's Vite HMR connection.
 await page.routeWebSocket(/^ws:\/\/127\.0\.0\.1:\d+\//,()=>{});
 const artifact=process.env.WINUI_TABLE_VIEW_ARTIFACT;
 if(artifact){
  await page.route('**/src/wasm/winui.js*',route=>route.fulfill({body:readFileSync(resolve(artifact,'winui.js')),contentType:'text/javascript'}));
  await page.route('**/src/wasm/winui_bg.wasm*',route=>new URL(route.request().url()).searchParams.has('url')?route.continue():route.fulfill({body:readFileSync(resolve(artifact,'winui_bg.wasm')),contentType:'application/wasm'}));
 }
 await page.goto('/#table-view');await expect.poll(()=>page.evaluate(()=>window.tableViewControls?.large?.tableSnapshot?.totalCount)).toBe(10000);
});
test('all examples use Rust tables; large source realizes only viewport cells and recycles',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await expect(page.locator('section.example[id^="table-"]')).toHaveCount(10);
 const initial=await page.evaluate(()=>({nodes:window.tableViewScenes.large.snapshot.nodes.length,slots:window.tableViewControls.large.tableSnapshot!.realized.length}));expect(initial.nodes).toBeLessThan(180);expect(initial.slots).toBeLessThan(60);
 await page.locator('#table-large').scrollIntoViewIfNeeded();await page.evaluate(()=>window.tableViewControls.large.scrollIntoView('person-9999'));await expect.poll(()=>page.evaluate(()=>window.tableViewControls.large.tableSnapshot!.realized.some(s=>s.row==='person-9999'))).toBe(true);
 const nativeNodes=await page.evaluate(()=>window.tableViewScenes.large.snapshot.nodes.length);expect(nativeNodes).toBeLessThan(180);expect(errors).toEqual([]);
});
test('pointer sorting, searched filter flyout and reset execute in Rust',async({page})=>{
 const host=page.locator('#table-shaping');await host.getByRole('button',{name:'Sort Age',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.tableViewControls.shaping.tableSnapshot!.sorts.length)).toBe(1);
 await host.getByRole('button',{name:'Filter Department',exact:true}).click();await page.getByRole('textbox',{name:'Search filter values',exact:true}).fill('Research');await page.getByRole('button',{name:'Ok',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.tableViewControls.shaping.tableSnapshot!.filteredCount)).toBe(6);
 await host.getByRole('button',{name:'Reset view',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.tableViewControls.shaping.tableSnapshot!.filteredCount)).toBe(24);
});
test('filter light dismiss consumes table cell, header and empty-area presses',async({page})=>{
 const host=page.locator('#table-shaping');await host.scrollIntoViewIfNeeded();
 for(const target of [host.getByRole('gridcell',{name:'1, Name: Adele Vance',exact:true}),host.getByRole('button',{name:'Sort Name',exact:true})]){
  await host.getByRole('button',{name:'Filter Department',exact:true}).click();
  const search=page.getByRole('textbox',{name:'Search filter values',exact:true});await expect(search).toBeVisible();
  await target.click();await expect(search).not.toBeVisible();
  expect(await page.evaluate(()=>window.tableViewControls.shaping.tableSnapshot!.currentCell)).toBeNull();
  expect(await page.evaluate(()=>window.tableViewControls.shaping.tableSnapshot!.sorts)).toEqual([]);
 }
 const native=page.locator('#table-native');await native.scrollIntoViewIfNeeded();
 await native.getByRole('button',{name:'Filter First Name',exact:true}).click();
 const box=await native.locator('canvas').first().boundingBox();if(!box)throw new Error('Missing table canvas');
 await page.mouse.click(box.x+700,box.y+300);
 await expect(page.getByRole('textbox',{name:'Search filter values',exact:true})).not.toBeVisible();
});

test('filter chrome blocks table hover through disabled commands, separators and gaps',async({page},testInfo)=>{
 const host=page.locator('#table-shaping');await host.scrollIntoViewIfNeeded();
 await host.getByRole('button',{name:'Filter Department',exact:true}).click();
 await page.mouse.move(5,5);await page.waitForTimeout(700);
 const canvas=host.locator('canvas').first(),box=await canvas.boundingBox();if(!box)throw new Error('Missing canvas');
 const backing=async()=>{const data=await canvas.evaluate(c=>(c as HTMLCanvasElement).toDataURL('image/png').split(',')[1]),png=PNG.sync.read(Buffer.from(data,'base64')),rows:Buffer[]=[];for(let y=50;y<png.height-20;y++)rows.push(png.data.subarray((y*png.width+20)*4,(y*png.width+png.width-20)*4));return Buffer.concat(rows).toString('base64');};
 const before=await backing();
 const neighbour=page.locator('#table-selection canvas').first();const neighbourBefore=await neighbour.evaluate(c=>(c as HTMLCanvasElement).toDataURL('image/png'));
 const points=await page.evaluate(()=>{
  const s=window.tableViewScenes.shaping.snapshot,popup=s.nodes.find(n=>n.kind==='Flyout'&&n.props.isOpen)!;
  const center=(n:typeof popup)=>({x:n.world[4]+n.rect.width/2,y:n.world[5]+n.rect.height/2});
  const points=[{name:'top padding',x:popup.world[4]+100,y:popup.world[5]+1},{name:'left margin',x:popup.world[4]+2,y:popup.world[5]+160}];
  for(const key of ['table-filter-unsort','table-filter-clear']){const n=s.nodes.find(n=>n.props.layoutKey===key)!;if(n.enabled)throw new Error('Expected a disabled command');points.push({name:key,...center(n)});}
  const panel=s.nodes.find(n=>n.id===popup.children[0])!,separator=s.nodes.find(n=>panel.children.includes(n.id)&&n.kind==='Border')!;points.push({name:'separator',...center(separator)});
  const ok=s.nodes.find(n=>n.props.layoutKey==='table-filter-apply')!;points.push({name:'button gap',x:ok.world[4]+ok.rect.width+8,y:ok.world[5]+ok.rect.height/2});
  return points;
 });
 const samples=[];
 for(const point of points){await host.getByRole('gridcell',{name:'1, Name: Adele Vance',exact:true}).hover();await page.waitForTimeout(70);expect(await backing()).not.toBe(before);const screen={x:box.x+point.x,y:box.y+point.y};await page.mouse.move(screen.x,screen.y);await page.waitForTimeout(70);const unchanged=await backing()===before;const neighbourUnchanged=await neighbour.evaluate(c=>(c as HTMLCanvasElement).toDataURL('image/png'))===neighbourBefore;const ownerReceivesPointer=await page.evaluate(({x,y})=>document.querySelector('#table-shaping')!.contains(document.elementFromPoint(x,y)),screen);samples.push({...point,backingPixelsUnchanged:unchanged,neighbourPixelsUnchanged:neighbourUnchanged,ownerReceivesPointer});expect(unchanged,`${point.name} must clear the previous row hover`).toBe(true);expect(neighbourUnchanged,`${point.name} must not change a neighbouring table's pixels`).toBe(true);expect(ownerReceivesPointer,`${point.name} must not route to a different Gallery scene`).toBe(true);}
 await page.mouse.click(box.x+points[0].x,box.y+points[0].y);
 await expect(page.getByRole('textbox',{name:'Search filter values',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>window.tableViewControls.shaping.tableSnapshot!.currentCell)).toBeNull();
 await page.screenshot({path:'../out/table-view-filter-chrome-hover-fixed.png'});
 await host.getByRole('gridcell',{name:'1, Name: Adele Vance',exact:true}).hover();await page.waitForTimeout(100);
 expect(await backing()).not.toBe(before);
 writeFileSync('../out/table-view-filter-chrome-hover.json',JSON.stringify({recordedAt:new Date().toISOString(),wasmSha256:testInfo.config.metadata.wasmSha256,scope:'Actual default Gallery pointer moves, table body backing pixels excluding scrollbar animations, neighbouring table pixels and platform event ownership; no native parity claim',samples,insideChromeKeepsFilterOpen:true,insideChromeDoesNotSelectCell:true,outsideTableHoverRestored:true},null,2));
});

test('popup input islands preserve controls and clean up with reduced motion',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();
 await expect.poll(()=>page.evaluate(()=>window.tableViewControls?.large?.tableSnapshot?.totalCount)).toBe(10000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const host=page.locator('#table-shaping');await host.scrollIntoViewIfNeeded();
 const islands=page.locator('[data-winui-popup-input]');
 for(let i=0;i<2;i++){
  await host.getByRole('button',{name:'Filter Department',exact:true}).click();await expect(islands).toHaveCount(1);
  const engineering=page.getByRole('checkbox',{name:'Engineering',exact:true});await expect(engineering).toBeChecked();await engineering.click();await expect(engineering).not.toBeChecked();
  const search=page.getByRole('textbox',{name:'Search filter values',exact:true});await search.fill('Research');await expect(search).toHaveValue('Research');
  if(i===0)await page.getByRole('button',{name:'Cancel',exact:true}).click();else await search.press('Escape');
  await expect(search).not.toBeVisible();await expect(islands).toHaveCount(0);
 }
 expect(errors).toEqual([]);
});

test('filter value scrollbar drags with capture beyond the floating surface',async({page})=>{
 const host=page.locator('#table-large');await host.scrollIntoViewIfNeeded();
 await host.getByRole('button',{name:'Filter Name',exact:true}).click();
 // ARIA geometry and the scrollbar thumb are projections of Rust's snapshot.
 const geometry=await page.evaluate(()=>{const s=window.tableViewScenes.large.snapshot;const n=s.nodes.find(n=>n.kind==='ListView'&&n.props.accessibleName==='Filter values')!;return {world:n.world,thumb:n.scroll!.verticalThumb!};});
 const scene=await host.locator('canvas').first().boundingBox();if(!scene)throw new Error('Missing table canvas');
 const x=scene.x+geometry.world[4]+geometry.thumb.x+geometry.thumb.width/2;
 const y=scene.y+geometry.world[5]+geometry.thumb.y+geometry.thumb.height/2;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+50,y+110,{steps:10});
 await expect.poll(()=>page.evaluate(()=>window.tableViewScenes.large.snapshot.nodes.find(n=>n.kind==='ListView'&&n.props.accessibleName==='Filter values')!.scroll!.verticalOffset)).toBeGreaterThan(10000);
 await page.mouse.up();const offset=await page.evaluate(()=>window.tableViewScenes.large.snapshot.nodes.find(n=>n.kind==='ListView'&&n.props.accessibleName==='Filter values')!.scroll!.verticalOffset);
 await page.mouse.move(x+50,y+150);await page.waitForTimeout(100);
 expect(await page.evaluate(()=>window.tableViewScenes.large.snapshot.nodes.find(n=>n.kind==='ListView'&&n.props.accessibleName==='Filter values')!.scroll!.verticalOffset)).toBe(offset);
 await expect(page.getByRole('textbox',{name:'Search filter values',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>window.tableViewScenes.large.snapshot.nodes.length)).toBeLessThan(400);
 const label=await page.evaluate(()=>{const s=window.tableViewScenes.large.snapshot,list=s.nodes.find(n=>n.kind==='ListView'&&n.props.accessibleName==='Filter values')!;return s.nodes.find(n=>n.kind==='CheckBox'&&n.props.layoutKey?.startsWith('table-filter-value:')&&n.world[5]>=list.world[5]&&n.world[5]+n.rect.height<=list.world[5]+list.rect.height)!.props.text;});
 const value=page.getByRole('checkbox',{name:label,exact:true});await value.click();await expect(value).not.toBeChecked();
 await page.screenshot({path:'../out/table-view-filter-thumb-drag-fixed.png'});
});
test('Rust raster caches reuse table switches while retaining their exact pixels',async({page})=>{
 const host=page.locator('#table-editing');await host.scrollIntoViewIfNeeded();
 const name=host.getByRole('gridcell',{name:'1, Name: Adele Vance',exact:true});
 const age=host.getByRole('gridcell',{name:'1, Age: 22',exact:true});
 await expect.poll(()=>page.evaluate(()=>window.tableViewControls.editing.tableSnapshot!.motion?.bodyOpacity)).toBe(1);
 await name.hover();await page.waitForTimeout(300);
 const control=host.getByRole('switch').first();
 const before=PNG.sync.read(await control.screenshot());
 const hits=()=>page.evaluate(()=>{const b=(window.tableViewScenes.editing.snapshot as unknown as {backend:{vectorRasterHits:number,retainedRasterHits:number}}).backend;return b.vectorRasterHits+b.retainedRasterHits;});
 const initial=await hits();
 for(let i=0;i<4;i++){await age.hover();await name.hover();}
 await expect.poll(hits).toBeGreaterThan(initial);
 const after=PNG.sync.read(await control.screenshot());
 expect(after.data.equals(before.data)).toBe(true);
});

test('cell checkboxes paint pressed state, cancel outside and bind only on release',async({page})=>{
 const host=page.locator('#table-editing');await host.scrollIntoViewIfNeeded();
 const cell=host.getByRole('gridcell',{name:/^1, Active:/});
 const checkbox=cell.getByRole('checkbox');await expect(checkbox).not.toBeChecked();
 const box=await checkbox.boundingBox();if(!box)throw new Error('Missing checkbox geometry');
 const state=()=>page.evaluate(()=>{const s=window.tableViewScenes.editing.snapshot,t=window.tableViewControls.editing.tableSnapshot!,slot=t.realized.find(v=>v.row==='person-0'&&v.column==='active')!;return s.nodes.find(n=>n.parent===slot.id&&n.kind==='CheckBox')!.state;});
 const value=()=>page.evaluate(()=>window.tableViewControls.editing.items[0].active);
 const glyph=async(label:string)=>{const snapshot=await checkbox.screenshot(),png=PNG.sync.read(snapshot);writeFileSync(`../out/table-view-checkbox-${label}.png`,snapshot);const bytes:number[]=[];const dpr=1.25,cx=Math.floor(10*dpr),cy=Math.floor(png.height/2);for(let y=cy-5;y<=cy+5;y++)for(let x=cx-5;x<=cx+5;x++){const i=(y*png.width+x)*4;bytes.push(...png.data.subarray(i,i+4));}return Buffer.from(bytes);};
 await page.mouse.move(box.x+10,box.y+box.height/2);await expect.poll(state).toBe('PointerOver');await page.waitForTimeout(250);
 const hover=await glyph('unchecked-hover');
 await page.mouse.down();await expect.poll(state).toBe('Pressed');expect(await value()).toBe(false);
 const pressed=await glyph('unchecked-pressed');expect(pressed.equals(hover)).toBe(false);
 await page.screenshot({path:'../out/table-view-checkbox-pressed.png'});
 await page.mouse.move(box.x+100,box.y+60);await expect.poll(state).not.toBe('Pressed');await page.mouse.up();
 expect(await value()).toBe(false);await expect(checkbox).not.toBeChecked();
 await checkbox.hover();await page.mouse.down();await expect.poll(state).toBe('Pressed');expect(await value()).toBe(false);await page.mouse.up();
 await expect.poll(value).toBe(true);await expect(checkbox).toBeChecked();
 await checkbox.hover();await expect.poll(state).toBe('PointerOver');await page.waitForTimeout(250);const checkedHover=await glyph('checked-hover');
 await page.mouse.down();await expect.poll(state).toBe('Pressed');expect(await value()).toBe(true);
 expect((await glyph('checked-pressed')).equals(checkedHover)).toBe(false);await page.mouse.up();await expect.poll(value).toBe(false);
 await checkbox.focus();await page.keyboard.down('Space');await expect.poll(state).toBe('Pressed');expect(await value()).toBe(false);
 await page.keyboard.up('Space');await expect.poll(value).toBe(true);await expect(checkbox).toBeChecked();
});

test('dragging to the right edge then editing preserves the frozen table scroll and focus',async({page})=>{
 const host=page.locator('#table-editing');await host.scrollIntoViewIfNeeded();
 const canvas=await host.locator('canvas').first().boundingBox();if(!canvas)throw new Error('Missing canvas');
 await page.mouse.move(canvas.x+400,canvas.y+350);await page.waitForTimeout(250);
 const geometry=await page.evaluate(()=>{const n=window.tableViewScenes.editing.snapshot.nodes.find(n=>n.kind==='ScrollViewer'&&n.props.accessibleName==='Table rows')!;return{world:n.world,thumb:n.scroll!.horizontalThumb!,width:n.rect.width};});
 const x=canvas.x+geometry.world[4]+geometry.thumb.x+geometry.thumb.width/2,y=canvas.y+geometry.world[5]+geometry.thumb.y+geometry.thumb.height/2;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(canvas.x+geometry.world[4]+geometry.width-3,y,{steps:12});await page.mouse.up();
 await expect.poll(()=>page.evaluate(()=>{const q=window.tableViewControls.editing.tableSnapshot!.scroll!;return q.extentWidth-q.viewportWidth-q.horizontalOffset;})).toBeLessThan(1);
 const before=await page.evaluate(()=>window.tableViewControls.editing.tableSnapshot!.scroll!.horizontalOffset);
 await host.getByRole('gridcell',{name:/^1, Notes:/}).dblclick();
 await expect.poll(()=>page.evaluate(()=>window.tableViewControls.editing.tableSnapshot!.editingCell?.column)).toBe('notes');
 const input=host.getByRole('textbox').first();await expect(input).toBeFocused();await input.fill('Editing at the right edge');
 expect(await page.evaluate(()=>window.tableViewControls.editing.tableSnapshot!.scroll!.horizontalOffset)).toBeCloseTo(before,3);
 await page.screenshot({path:'../out/table-view-frozen-right-editor.png'});
 await input.press('Escape');
 expect(await page.evaluate(()=>window.tableViewControls.editing.tableSnapshot!.scroll!.horizontalOffset)).toBeCloseTo(before,3);
});

test('a frozen-table ComboBox displays its selection and paints options beyond the clipped body',async({page})=>{
 const host=page.locator('#table-editing');await host.scrollIntoViewIfNeeded();
 await page.evaluate(()=>{const s=window.tableViewScenes.editing,n=s.snapshot.nodes.find(n=>n.kind==='ScrollViewer'&&n.props.accessibleName==='Table rows')!;s.input(window.tableViewControls.editing,{kind:'scroll',id:n.id,x:380,y:40.8,zoom:null,animated:false});s.render();});
 await host.getByRole('gridcell',{name:'9, Department: Engineering',exact:true}).dblclick();
 await expect.poll(()=>page.evaluate(()=>window.tableViewControls.editing.tableSnapshot!.editingCell?.column)).toBe('department');
 const input=host.getByRole('combobox').first();await expect(input).toHaveValue('Engineering');
 const offset=await page.evaluate(()=>window.tableViewControls.editing.tableSnapshot!.scroll!.horizontalOffset);expect(offset).toBeGreaterThan(300);expect(offset).toBeLessThanOrEqual(380.1);
 await host.getByRole('button',{name:'Open drop-down',exact:true}).click();
 const research=page.getByRole('option',{name:'Research',exact:true});await expect(research).toBeVisible();await page.mouse.move(5,5);await page.waitForTimeout(350);
 const canvas=await host.locator('canvas').first().boundingBox(),option=await research.boundingBox();if(!canvas||!option)throw new Error('Missing popup geometry');
 expect(option.y+option.height).toBeGreaterThan(canvas.y+canvas.height);
 const pixels=PNG.sync.read(await research.screenshot());let ink=0;for(let i=0;i<pixels.data.length;i+=4)if(pixels.data[i]<120&&pixels.data[i+1]<120&&pixels.data[i+2]<120&&pixels.data[i+3]>128)ink++;
 expect(ink).toBeGreaterThan(20);
 await page.screenshot({path:'../out/table-view-frozen-combo-popup.png'});
 await research.click();await expect(input).toHaveValue('Research');
 expect(await page.evaluate(()=>window.tableViewControls.editing.tableSnapshot!.scroll!.horizontalOffset)).toBeCloseTo(offset,3);
 await input.press('Enter');
 await expect(host.getByRole('gridcell',{name:'9, Department: Research',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>window.tableViewControls.editing.tableSnapshot!.scroll!.horizontalOffset)).toBeCloseTo(offset,3);
});
test('filter checkboxes toggle by pointer and keyboard without table hover bleeding through',async({page})=>{
 const host=page.locator('#table-shaping');await host.scrollIntoViewIfNeeded();
 await host.getByRole('button',{name:'Filter Department',exact:true}).click();
 const engineering=page.getByRole('checkbox',{name:'Engineering',exact:true});
 const all=page.getByRole('checkbox',{name:'(Select All)',exact:true});
 await expect(engineering).toBeChecked();await page.mouse.move(5,5);await page.waitForTimeout(300);
 const canvas=host.locator('canvas').first();
 const pixels=async()=>PNG.sync.read(Buffer.from(await canvas.evaluate(element=>(element as HTMLCanvasElement).toDataURL('image/png').split(',')[1]),'base64'));
 const before=await pixels();await engineering.hover();await page.waitForTimeout(150);const after=await pixels();
 // The exposed Name column must stay unchanged while the popup covers cells
 // further right. Inspect real backing pixels, separately from checked state.
 const region=(image:PNG)=>{const bytes:number[]=[];for(let y=50;y<Math.min(390,image.height-16);y++)for(let x=24;x<180;x++){const i=(y*image.width+x)*4;bytes.push(...image.data.subarray(i,i+4));}return Buffer.from(bytes);};
 expect(region(after).equals(region(before))).toBe(true);
 await page.screenshot({path:'../out/table-view-filter-hover-fixed.png'});
 await engineering.click();await expect(engineering).not.toBeChecked();await expect(all).toHaveAttribute('aria-checked','mixed');
 await engineering.press('Space');await expect(engineering).toBeChecked();await expect(all).toBeChecked();
 const research=page.getByRole('checkbox',{name:'Research',exact:true});
 // This row lies below the owning table's 320 DIP scene. Floating controls
 // must remain interactive outside their logical owner's clipped viewport.
 await research.click();await expect(research).not.toBeChecked();await expect(all).toHaveAttribute('aria-checked','mixed');
 await research.press('Space');await expect(research).toBeChecked();await expect(all).toBeChecked();
 await all.click();await expect(engineering).not.toBeChecked();await expect(all).not.toBeChecked();
 await engineering.click();await expect(engineering).toBeChecked();
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 expect(await page.evaluate(()=>window.tableViewControls.shaping.tableSnapshot!.filteredCount)).toBe(24);
 await host.getByRole('button',{name:'Filter Department',exact:true}).click();await expect(all).toBeChecked();
 await all.click();await engineering.click();await page.getByRole('button',{name:'Ok',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>window.tableViewControls.shaping.tableSnapshot!.filteredCount)).toBe(6);
 expect(await page.evaluate(()=>window.tableViewControls.shaping.tableSnapshot!.filters)).toEqual([{column:'department',values:['Engineering'],search:''}]);
});

test('corner menu draws source icons, exposes both CSV commands and supports clipboard actions',async({page,context})=>{
 const host=page.locator('#table-clipboard');await host.scrollIntoViewIfNeeded();
 await context.grantPermissions(['clipboard-read','clipboard-write']);
 await host.getByRole('gridcell',{name:/^1, Name:/}).click();
 await host.getByRole('button',{name:'Table options',exact:true}).click();
 const menu=page.getByRole('menu');await expect(menu.getByRole('menuitem')).toHaveCount(10);
 const icons=await page.evaluate(()=>(window.tableViewScenes.clipboard.snapshot.nodes.find(n=>n.kind==='MenuFlyout'&&n.props.isOpen)!.props.menuItems??[]).flatMap(i=>'icon' in i&&i.icon?[[i.id,i.icon]]:[]));
 expect(icons).toEqual([['selectAll','\ue8b3'],['clearSelection','\ue8e6'],['copy','\ue8c8'],['paste','\ue77f'],['export','\uede1'],['exportSelected','\uede1']]);
 await expect(menu.getByRole('menuitem',{name:'Clear Sorting',exact:true})).toBeDisabled();
 const painted=PNG.sync.read(await page.screenshot({path:'../out/table-view-corner-menu-icons-fixed.png'}));
 const iconRows=await menu.getByRole('menuitem').evaluateAll(elements=>elements.map(element=>({label:element.getAttribute('aria-label')??element.textContent??'',box:element.getBoundingClientRect().toJSON() as {x:number;y:number;width:number;height:number}})));
 await menu.screenshot({path:'../out/table-view-corner-menu-fixed.png'});
 for(const label of ['Select All','Deselect All','Copy','Paste','Export All to CSV','Export Selected to CSV']){
  const box=iconRows.find(row=>row.label===label)?.box;if(!box)throw new Error(`Missing ${label}`);
  const scale=painted.width/page.viewportSize()!.width;let ink=0;
  for(let y=Math.ceil((box.y+5)*scale);y<Math.floor((box.y+box.height-5)*scale);y++)for(let x=Math.ceil((box.x+12)*scale);x<Math.floor((box.x+34)*scale);x++){
   const i=(y*painted.width+x)*4;if(painted.data[i]<120&&painted.data[i+1]<120&&painted.data[i+2]<120)ink++;
  }
  expect(ink,`${label} must paint its icon in the leading icon column`).toBeGreaterThan(15);
 }
 await menu.getByRole('menuitem',{name:'Copy with Headers',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>navigator.clipboard.readText())).toContain('Name');
 await page.evaluate(()=>navigator.clipboard.writeText('Menu pasted name'));
 await host.getByRole('button',{name:'Table options',exact:true}).click();await menu.getByRole('menuitem',{name:'Paste',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>window.tableViewControls.clipboard.items[0].name)).toBe('Menu pasted name');
});
test('editing commits to React rows, validation cancels and Escape preserves values',async({page})=>{
 const host=page.locator('#table-editing');await host.scrollIntoViewIfNeeded();const cell=host.getByRole('gridcell',{name:'1, Name: Adele Vance',exact:true});await cell.dblclick();await expect.poll(()=>page.evaluate(()=>window.tableViewControls.editing.tableSnapshot!.editingCell?.column)).toBe('name');
 const editor=host.getByRole('textbox').first();await editor.fill('Edited employee');await editor.press('Enter');await expect.poll(()=>page.evaluate(()=>window.tableViewControls.editing.items[0].name)).toBe('Edited employee');
 await page.evaluate(()=>window.tableViewControls.editing.beginEdit({row:'person-0',column:'age'}));await expect.poll(()=>page.evaluate(()=>window.tableViewControls.editing.tableSnapshot!.editingCell?.column)).toBe('age');await host.getByRole('spinbutton').fill('37');await host.getByRole('spinbutton').press('Enter');await expect.poll(()=>page.evaluate(()=>window.tableViewControls.editing.items[0].age)).toBe(37);await page.evaluate(()=>window.tableViewControls.editing.beginEdit({row:'person-0',column:'age'}));await expect.poll(()=>page.evaluate(()=>window.tableViewControls.editing.tableSnapshot!.editingCell?.column)).toBe('age');await page.evaluate(()=>window.tableViewControls.editing.commitEdit(10));await page.waitForTimeout(150);expect(await page.evaluate(()=>window.tableViewControls.editing.tableSnapshot!.editingCell?.column)).toBe('age');expect(await page.evaluate(()=>window.tableViewControls.editing.items[0].age)).toBe(37);
 await page.keyboard.press('Escape');await expect.poll(()=>page.evaluate(()=>window.tableViewControls.editing.tableSnapshot!.editingCell)).toBeNull();
});
test('templates, conditional colors, row details and context menus use native slots',async({page})=>{
 const host=page.locator('#table-templates');await host.scrollIntoViewIfNeeded();await page.evaluate(()=>window.tableViewControls.templates.select({row:'person-0',column:'name'}));await expect.poll(()=>page.evaluate(()=>window.tableViewControls.templates.tableSnapshot!.realized.some(s=>s.role==='details'&&s.row==='person-0'))).toBe(true);await expect(host.getByText('Engineering · Joined 2024-01-01',{exact:true})).toBeAttached();
 const clip=page.locator('#table-clipboard');await clip.scrollIntoViewIfNeeded();await clip.getByRole('gridcell',{name:/^1, Name:/}).click({button:'right'});await expect(page.getByRole('menuitem',{name:'Inspect cell',exact:true})).toBeVisible();await page.keyboard.press('Escape');
});
test('CSV bindings, atomic paste, column and source-row reorder use public SDK',async({page})=>{
 const result=await page.evaluate(async()=>{const t=window.tableViewControls.clipboard;t.select({row:'person-0',column:'name'});await t.paste('Pasted name\tResearch\t35\ttrue');return t.exportCsv();});expect(result).toContain('PASTED NAME');await expect.poll(()=>page.evaluate(()=>window.tableViewControls.clipboard.items[0].age)).toBe(35);
 await page.evaluate(()=>window.tableViewControls.clipboard.reorderRow('person-0',5));await expect.poll(()=>page.evaluate(()=>window.tableViewControls.clipboard.items[5].id)).toBe('person-0');
 await page.evaluate(()=>window.tableViewControls.columns.reorderColumn(0,2));await expect.poll(()=>page.evaluate(()=>window.tableViewControls.columns.tableSnapshot!.columns[2].key)).toBe('name');
});
test('wheel scrolling retains frozen columns, keyboard selection and no focus outline',async({page})=>{
 const host=page.locator('#table-columns');await host.scrollIntoViewIfNeeded();const before=await page.evaluate(()=>{const s=window.tableViewScenes.columns.snapshot;const t=window.tableViewControls.columns.tableSnapshot!;const cell=t.realized.find(c=>c.column==='name')!;return s.nodes.find(n=>n.id===cell.id)!.world[4];});
 await host.getByRole('gridcell',{name:'1, Name: Adele Vance',exact:true}).hover();await page.mouse.wheel(180,120);await expect.poll(()=>page.evaluate(()=>window.tableViewControls.columns.tableSnapshot!.scroll!.horizontalOffset)).toBeGreaterThan(0);const after=await page.evaluate(()=>{const s=window.tableViewScenes.columns.snapshot;const t=window.tableViewControls.columns.tableSnapshot!;const cell=t.realized.find(c=>c.column==='name')!;return s.nodes.find(n=>n.id===cell.id)!.world[4];});expect(Math.abs(after-before)).toBeLessThan(1);
 await page.locator('#table-selection').getByRole('gridcell',{name:'1, Name: Adele Vance',exact:true}).click();await page.keyboard.press('ArrowDown');await expect.poll(()=>page.evaluate(()=>window.tableViewControls.selection.tableSnapshot!.currentCell?.row)).toBe('person-1');expect(await page.locator(':focus').evaluate(e=>getComputedStyle(e).outlineStyle)).toBe('none');await host.screenshot({path:'../out/table-view-columns.png'});
});
test('both renderers present all themes; source code and license ship with the page',async({page})=>{
 test.setTimeout(120000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const records:object[]=[];
 for(const backend of Object.values(RendererBackend)){
  for(const theme of Object.values(ThemeMode)){
   await page.evaluate(theme=>localStorage.setItem('winui-gallery.theme',theme),theme);await page.reload();
   await expect.poll(()=>page.evaluate(()=>window.tableViewControls?.large?.isDisposed?null:window.tableViewControls?.large?.tableSnapshot?.totalCount)).toBe(10000);
   if(backend!==RendererBackend.Canvas2D)await selectGalleryOption(page.getByRole('combobox',{name:'Renderer',exact:true}),backend);
   await expect.poll(()=>page.evaluate(()=>window.tableViewScenes.large.isDisposed?null:window.tableViewScenes.large.diagnostics.kind)).toBe(backend);
   await page.locator('#table-selection').scrollIntoViewIfNeeded();await page.evaluate(()=>window.tableViewControls.selection.select({row:'person-0',column:'name'}));
   await expect.poll(()=>page.evaluate(()=>window.tableViewScenes.selection.snapshot.nodes.find(n=>n.kind==='TableView')?.theme)).toBe(theme);
   await page.locator('#table-selection').screenshot({path:`../out/table-view-${backend}-${theme}.png`});
   records.push(await page.evaluate(()=>({renderer:window.tableViewScenes.large.diagnostics.kind,theme:window.tableViewScenes.selection.snapshot.nodes.find(n=>n.kind==='TableView')?.theme,nodes:window.tableViewScenes.large.snapshot.nodes.length,realized:window.tableViewControls.large.tableSnapshot!.realized.length,diagnostics:window.tableViewScenes.large.diagnostics})));
  }
 }
 const license=await page.request.get('/licenses/WinUI.TableView/LICENSE.md');expect(license.ok()).toBe(true);expect(await license.text()).toContain('Copyright (c) [2024] [w-ahmad');
 await page.locator('#table-auto').getByRole('button',{name:'Source code',exact:true}).click();await expect(page.locator('#table-auto pre')).toContainText('<TableView');writeFileSync('../out/table-view-renderers.json',JSON.stringify(records,null,2));expect(errors).toEqual([]);
});
test('10,000 distinct filter values stay virtualized and Escape dismisses the flyout',async({page})=>{
 const host=page.locator('#table-large');await host.scrollIntoViewIfNeeded();await host.getByRole('button',{name:'Filter Name',exact:true}).click();await expect(page.getByRole('textbox',{name:'Search filter values',exact:true})).toBeVisible();expect(await page.evaluate(()=>window.tableViewScenes.large.snapshot.nodes.length)).toBeLessThan(400);
 await page.getByRole('textbox',{name:'Search filter values',exact:true}).fill('10000');await page.getByRole('button',{name:'Ok',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.tableViewControls.large.tableSnapshot!.filteredCount)).toBe(1);expect(await page.evaluate(()=>window.tableViewControls.large.tableSnapshot!.viewKeys)).toEqual(['person-9999']);
 await page.evaluate(()=>window.tableViewControls.large.clearFilters());await host.getByRole('button',{name:'Filter Name',exact:true}).click();await page.keyboard.press('Escape');await expect(page.getByRole('textbox',{name:'Search filter values',exact:true})).not.toBeVisible();
});
test('overlapping paste/export promises remain separate; cancellation and type errors preserve data',async({page})=>{
 const result=await page.evaluate(async()=>{const t=window.tableViewControls.clipboard;t.select({row:'person-0',column:'name'});await Promise.all([t.paste('First'),t.paste('Second')]);const [selected,all]=await Promise.all([t.exportCsv({selected:true,includeHeaders:false}),t.exportCsv()]);let error='';try{await t.paste('Invalid\tEngineering\tnot-a-number');}catch(e){error=(e as Error).message;}return{name:t.items[0].name,selected,all,error};});expect(result.name).toBe('Second');expect(result.selected).toBe('SECOND');expect(result.all).toMatch(/^Name,Department,Age,Active/);expect(result.error).toContain('Invalid number');
 const cancelled=await page.evaluate(async(kind)=>{const t=window.tableViewControls.clipboard;const off=t.onTableEvent(e=>{if(e.kind===kind&&!e.table.ready)e.cancel=true;});let error='';try{await t.paste('Cancelled');}catch(e){error=(e as Error).message;}finally{off();}return{error,name:t.items[0].name};},EventKind.PasteFromClipboard);expect(cancelled.error).toContain('cancelled');expect(cancelled.name).toBe('Second');
});

test('items-only API preserves object keys and business callbacks after editing',async({page})=>{
 const result=await page.evaluate(async()=>{const row={name:'Ada',age:32,greet:()=>'hello'};const t=window.tableViewScenes.auto.root.tableView({items:[row],visible:false});try{const key=t.keyForItem(row);t.select({row:key,column:'age'});await t.paste('35');const updated=t.items[0];const csv=await t.exportCsv();return{age:updated.age,keyStable:t.keyForItem(updated)===key,hasId:Object.hasOwn(updated,'id'),greeting:updated.greet(),originalAge:row.age,csv};}finally{t.dispose();}});
 expect(result).toMatchObject({age:35,keyStable:true,hasId:false,greeting:'hello',originalAge:32});expect(result.csv).toContain('Ada,35');
});

test('filter search Enter applies and unchanged Ok leaves the column unfiltered',async({page})=>{
 const host=page.locator('#table-native');await host.scrollIntoViewIfNeeded();
 await host.getByRole('button',{name:'Filter First Name',exact:true}).click();
 await page.getByRole('button',{name:'Ok',exact:true}).click();
 expect(await page.evaluate(()=>window.tableViewParity!.table!.tableSnapshot!.filters)).toEqual([]);
 await host.getByRole('button',{name:'Filter First Name',exact:true}).click();
 const search=page.getByRole('textbox',{name:'Search filter values',exact:true});await search.fill('Ada');await search.press('Enter');
 await expect.poll(()=>page.evaluate(()=>window.tableViewParity!.table!.tableSnapshot!.viewKeys)).toEqual(['r0']);
 await expect(search).not.toBeVisible();
});

test('column pointer drop uses the target half and retains source header preview',async({page})=>{
 const host=page.locator('#table-native');await host.scrollIntoViewIfNeeded();
 const from=await host.getByRole('button',{name:'Sort First Name',exact:true}).boundingBox();const to=await host.getByRole('button',{name:'Sort Department',exact:true}).boundingBox();
 if(!from||!to)throw new Error('Native fixture headers are missing');
 await page.mouse.move(from.x+from.width/2,from.y+6);await page.mouse.down();
 await page.mouse.move(to.x+to.width-12,to.y+6,{steps:8});
 await page.locator('#table-native-runtime canvas').first().screenshot({path:'../out/table-view-browser-column-drag.png'});
 await page.mouse.up();
 await expect.poll(()=>page.evaluate(()=>window.tableViewParity!.table!.tableSnapshot!.columns.map(c=>c.key))).toEqual(['lastName','department','firstName','active']);
});

test('native fixture captures matching geometry and paired static references',async({page})=>{
 const host=page.locator('#table-native');await host.scrollIntoViewIfNeeded();
 await expect.poll(()=>page.evaluate(()=>window.tableViewParity?.table?.tableSnapshot?.realized.length)).toBeGreaterThan(0);
 await expect.poll(()=>page.evaluate(()=>window.tableViewParity!.table!.tableSnapshot!.motion?.bodyOpacity)).toBe(1);
 const geometry=await page.evaluate(()=>{const {scene,table}=window.tableViewParity!;const cells=table!.tableSnapshot!.realized;const root=scene!.snapshot.nodes.find(n=>n.kind==='TableView')!;return cells.filter(s=>s.column==='firstName').slice(0,3).map(cell=>{const n=scene!.snapshot.nodes.find(n=>n.id===cell.id)!;return{x:n.world[4]-root.world[4],y:n.world[5]-root.world[5],width:n.rect.width,height:n.rect.height};});});
 writeFileSync('../out/table-view-parity-layout.json',JSON.stringify(await page.evaluate(()=>window.tableViewParity!.scene!.snapshot),null,2));await page.locator('#table-native-runtime canvas').first().screenshot({path:'../out/table-view-browser-Light-default.png'});
 expect(geometry[0].x).toBeCloseTo(17.6,1);expect(geometry[0].y).toBeCloseTo(32.8,1);expect(geometry[1].y-geometry[0].y).toBeCloseTo(40.8,1);
 await page.locator('#table-native-runtime canvas').first().screenshot({path:'../out/table-view-browser-Light-default.png'});
 await host.getByRole('button',{name:'Row selection',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.tableViewParity!.table!.tableSnapshot!.selectedKeys)).toEqual(['r2']);await page.waitForTimeout(250);await page.locator('#table-native-runtime canvas').first().screenshot({path:'../out/table-view-browser-Light-row-selected.png'});
 await host.getByRole('button',{name:'Default',exact:true}).click();await host.getByRole('button',{name:'Filter First Name',exact:true}).click();await expect(page.getByRole('textbox',{name:'Search filter values',exact:true})).toBeVisible();await page.screenshot({path:'../out/table-view-browser-filter.png'});await expect(page.getByRole('button',{name:'Sort Descending',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Cancel',exact:true})).toBeVisible();
});

test('paired native light and dark state matrix records visual differences separately',async({page})=>{
 test.setTimeout(120000);const results:object[]=[];
 for(const theme of [ThemeMode.Light,ThemeMode.Dark]){
  await page.evaluate(theme=>localStorage.setItem('winui-gallery.theme',theme),theme);await page.reload();
  await expect.poll(()=>page.evaluate(()=>window.tableViewParity?.table?.tableSnapshot?.totalCount)).toBe(6);
  const host=page.locator('#table-native');await host.scrollIntoViewIfNeeded();
  for(const [state,label] of [['default','Default'],['cell-selected','Cell selection'],['row-selected','Row selection'],['editing','Editing'],['sorted','Sorting']]){
   await host.getByRole('button',{name:label,exact:true}).click();
   await expect.poll(()=>page.evaluate(()=>window.tableViewParity!.table!.tableSnapshot!.motion?.bodyOpacity)).toBe(1);
   if(state==='editing')await expect.poll(()=>page.evaluate(()=>window.tableViewParity!.table!.tableSnapshot!.editingCell?.column)).toBe('firstName');
   await page.waitForTimeout(250);
   const canvas=page.locator('#table-native-runtime canvas').first();
   await canvas.screenshot({path:`../out/table-view-browser-${theme}-${state}.png`});
   // RTB captures an element's backing pixels. Compare the browser backing
   // surface on the same basis, retaining the separately composited screenshot.
   // CSS page offsets can round that screenshot outward by one physical pixel.
   const bytes=Buffer.from(await canvas.evaluate(element=>(element as HTMLCanvasElement).toDataURL('image/png').split(',')[1]),'base64');writeFileSync(`../out/table-view-browser-${theme}-${state}-canvas.png`,bytes);
   const actual=PNG.sync.read(bytes),native=PNG.sync.read(readFileSync(`public/community-table-view/${theme}-${state}.png`));
   expect([actual.width,actual.height]).toEqual([native.width,native.height]);
   const regions=[['all',0,0,1000,400],['header',0,0,1000,41],['body',0,41,1000,347],['empty',0,348,1000,400]] as const;
   const differences=regions.map(([part,left,top,right,bottom])=>{let changed=0,total=0,absolute=0;for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){const i=(y*actual.width+x)*4;const error=Math.max(...[0,1,2].map(c=>Math.abs(actual.data[i+c]-native.data[i+c])));total++;if(error>3)changed++;absolute+=error;}return{part,changedFraction:changed/total,meanMaximumChannelError:absolute/total};});
   results.push({theme,state,differences});
  }
 }
 // Raw visual evidence only. These numbers are not a full-fidelity acceptance
 // threshold; native focus outlines are a deliberate project exception.
 writeFileSync('../out/table-view-visual-differences.json',JSON.stringify({acceptedAsFullParity:false,scope:'Native RTB versus browser canvas backing pixels; composited screenshots retained separately. No physical-input or Composition acceptance',results},null,2));
});


test('released grouping: native menu, cancellation, typed keys, collapse, custom slots and 10k virtualization',async({page})=>{
 const host=page.locator('#table-grouping');await host.scrollIntoViewIfNeeded();
 const setCheck=async(name:string,value:boolean)=>{const checkbox=host.getByRole('checkbox',{name,exact:true});if(await checkbox.getAttribute('aria-checked')!==String(value))await checkbox.click();await expect(checkbox).toHaveAttribute('aria-checked',String(value));};
 await expect(host.getByRole('button',{name:'Collapse department: Design',exact:true})).toBeVisible();
 await host.getByRole('button',{name:'Collapse department: Design',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>window.tableViewControls.grouping.tableSnapshot!.viewKeys.length)).toBe(18);
 await expect(host.getByRole('button',{name:'Expand department: Design',exact:true})).toBeVisible();
 await host.getByRole('button',{name:'Expand all groups',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>window.tableViewControls.grouping.tableSnapshot!.viewKeys.length)).toBe(24);
 await host.getByRole('button',{name:'Filter Department',exact:true}).click();
 await page.getByRole('button',{name:'Ungroup',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>window.tableViewControls.grouping.tableSnapshot!.isGrouped)).toBe(false);
 await page.evaluate(kind=>{const t=window.tableViewControls.grouping;const off=t.onTableEvent(e=>{if(e.kind===kind){e.cancel=true;(window as unknown as {groupingCancelled:boolean}).groupingCancelled=true;}});(window as unknown as {stopGrouping:()=>void}).stopGrouping=off;},EventKind.Grouping);
 await host.getByRole('button',{name:'Filter Department',exact:true}).click();await page.getByRole('button',{name:'Group',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {groupingCancelled:boolean}).groupingCancelled)).toBe(true);await expect.poll(()=>page.evaluate(()=>window.tableViewControls.grouping.tableSnapshot!.isGrouped)).toBe(false);
 await page.evaluate(()=>{(window as unknown as {stopGrouping:()=>void}).stopGrouping();window.tableViewControls.grouping.group('department');});
 await expect.poll(()=>page.evaluate(()=>window.tableViewControls.grouping.tableSnapshot!.isGrouped)).toBe(true);
 await setCheck('Group by Department then Active',true);
 await expect.poll(()=>page.evaluate(()=>window.tableViewControls.grouping.tableSnapshot!.groups.length)).toBe(2);
 await expect(host.getByRole('button',{name:'Collapse active: false',exact:true}).first()).toBeVisible();
 await page.evaluate(()=>window.tableViewControls.grouping.collapseGroup(['Design',false]));
 await expect.poll(()=>page.evaluate(()=>window.tableViewControls.grouping.tableSnapshot!.viewKeys.length)).toBe(22);
 await setCheck('Custom group header',true);
 await expect(host.getByText('department: Design',{exact:true})).toBeVisible();
 await setCheck('10,000 grouped rows',true);
 await expect.poll(()=>page.evaluate(()=>window.tableViewControls.grouping.tableSnapshot!.totalCount)).toBe(10000);
 expect(await page.evaluate(()=>window.tableViewScenes.grouping.snapshot.nodes.length)).toBeLessThan(190);
 await page.evaluate(()=>window.tableViewControls.grouping.scrollIntoView('person-9998'));
 await expect.poll(()=>page.evaluate(()=>window.tableViewControls.grouping.tableSnapshot!.realized.some(s=>s.row==='person-9998'))).toBe(true);
 expect(await page.evaluate(()=>window.tableViewScenes.grouping.snapshot.nodes.length)).toBeLessThan(190);
 await setCheck('Custom group header',false);
 await page.evaluate(()=>{const t=window.tableViewControls.grouping;t.update({groups:[{column:'age',value:p=>Math.floor(p.age/10)*10,compare:(a,b)=>Number(b)-Number(a)}]});t.collapseAllGroups();});
 await expect.poll(()=>page.evaluate(()=>window.tableViewControls.grouping.tableSnapshot!.realizedGroups[0]?.key)).toBe(50);
});


test('group chevrons actually rotate for single and all-group collapse',async({page},testInfo)=>{
 test.setTimeout(120000);
 const native=JSON.parse(readFileSync('../out/table-view-grouping-native/native.json','utf8')) as {records:{name:string;headers:{key:unknown;parts:{Name:string;rect:{x:number;y:number;width:number;height:number}}[]}[]}[]};
 const records:object[]=[];
 const inkBounds=(png:PNG,cx:number,cy:number,light:boolean)=>{
  const left=Math.round(cx*1.25)-9,top=Math.round(cy*1.25)-9;
  const points:number[][]=[];
  for(let y=0;y<18;y++)for(let x=0;x<18;x++){
   const index=((top+y)*png.width+left+x)*4,alpha=png.data[index+3]/255,bg=light?243:32;
   const luma=(png.data[index]+png.data[index+1]+png.data[index+2])/3*alpha+bg*(1-alpha);
   if(light?luma<180:luma>110)points.push([x,y]);
  }
  if(!points.length)throw new Error('No painted chevron pixels');
  return{width:Math.max(...points.map(p=>p[0]))-Math.min(...points.map(p=>p[0]))+1,height:Math.max(...points.map(p=>p[1]))-Math.min(...points.map(p=>p[1]))+1};
 };
 for(const backend of Object.values(RendererBackend))for(const theme of [ThemeMode.Light,ThemeMode.Dark]){
  await page.evaluate(theme=>localStorage.setItem('winui-gallery.theme',theme),theme);await page.reload();
  await expect.poll(()=>page.evaluate(()=>window.tableViewControls?.grouping?.tableSnapshot?.totalCount)).toBe(24);
  if(backend!==RendererBackend.Canvas2D)await selectGalleryOption(page.getByRole('combobox',{name:'Renderer',exact:true}),backend);
  await expect.poll(()=>page.evaluate(()=>window.tableViewScenes.grouping.diagnostics.kind)).toBe(backend);
  const host=page.locator('#table-grouping');await host.scrollIntoViewIfNeeded();
  const capture=async(state:string)=>{
   await page.mouse.move(5,5);await page.waitForTimeout(750);
   const groups=await page.evaluate(()=>{
    const table=window.tableViewControls.grouping.tableSnapshot!,nodes=window.tableViewScenes.grouping.snapshot.nodes;
    return table.realizedGroups.map(group=>{
     const header=nodes.find(n=>n.children.includes(group.container!))!,button=nodes.find(n=>header.children.includes(n.id)&&n.kind==='Button')!,icon=nodes.find(n=>n.id===button.children[0])!;
     return{key:group.key,expanded:group.isExpanded,cx:button.world[4]+button.rect.width/2,cy:button.world[5]+button.rect.height/2,axis:[icon.world[2]*12,icon.world[3]*12]};
    });
   });
   const bytes=Buffer.from(await page.locator('#table-grouping-runtime canvas').first().evaluate(c=>{window.tableViewScenes.grouping.render();return(c as HTMLCanvasElement).toDataURL('image/png').split(',')[1];}),'base64'),png=PNG.sync.read(bytes);
   writeFileSync(`../out/table-view-chevron-${backend}-${theme}-${state}.png`,bytes);
   const samples=groups.filter(group=>(group.cx-7)*1.25>=0&&(group.cy-7)*1.25>=0&&(group.cx+7)*1.25<png.width&&(group.cy+7)*1.25<png.height).map(group=>({...group,ink:inkBounds(png,group.cx,group.cy,theme===ThemeMode.Light)}));
   records.push({backend,theme,state,samples});
   for(const group of samples){
    expect(group.ink.width>group.ink.height,`${state}: painted ${String(group.key)} arrow`).toBe(group.expanded);
    expect(group.axis[0]).toBeCloseTo(group.expanded?0:12,6);expect(group.axis[1]).toBeCloseTo(group.expanded?12:0,6);
   }
   return samples;
  };
  await capture('expanded');
  await host.getByRole('button',{name:'Collapse department: Design',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.tableViewControls.grouping.tableSnapshot!.viewKeys.length)).toBe(18);
  await capture('single-collapsed');
  await host.getByRole('button',{name:'Expand department: Design',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.tableViewControls.grouping.tableSnapshot!.viewKeys.length)).toBe(24);
  await capture('reexpanded');
  await host.getByRole('button',{name:'Collapse all groups',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.tableViewControls.grouping.tableSnapshot!.viewKeys.length)).toBe(0);
  const collapsed=await capture('all-collapsed');expect(collapsed).toHaveLength(4);
  const reference=PNG.sync.read(readFileSync(`../out/table-view-grouping-native/${theme}-collapsed.png`)),expected=native.records.find(r=>r.name===`${theme}-collapsed`)!;
  for(const group of collapsed){const button=expected.headers.find(h=>h.key===group.key)!.parts.find(p=>p.Name==='ExpandCollapseButton')!.rect;const ink=inkBounds(reference,button.x+button.width/2,button.y+button.height/2,theme===ThemeMode.Light);expect(ink.height).toBeGreaterThan(ink.width);}
 }
 writeFileSync('../out/table-view-chevron-visual.json',JSON.stringify({wasmSha256:testInfo.config.metadata.wasmSha256,computerUse:false,scope:'Actual painted glyph orientation and world transform, single/all collapse and re-expand, two renderers, light/dark; collapsed native release glyph pixels checked independently',records},null,2));
});

test('grouping release visual matrix records matching geometry and actual canvas differences',async({page},testInfo)=>{
 test.setTimeout(120000);const results:object[]=[];
 const native=JSON.parse(readFileSync('../out/table-view-grouping-native/native.json','utf8')) as {records:{name:string;visibleItems:string[];headers:{key:unknown;rect:{x:number;y:number;width:number;height:number}}[]}[]};
 for(const theme of [ThemeMode.Light,ThemeMode.Dark]){
  await page.evaluate(theme=>localStorage.setItem('winui-gallery.theme',theme),theme);await page.reload();
  await expect.poll(()=>page.evaluate(()=>window.tableViewControls?.grouping?.tableSnapshot?.totalCount)).toBe(24);
  const host=page.locator('#table-grouping');await host.scrollIntoViewIfNeeded();await page.mouse.move(5,5);
  const scroll=async(y:number)=>page.evaluate(y=>{const scene=window.tableViewScenes.grouping;const body=scene.snapshot.nodes.find(n=>n.kind==='ScrollViewer'&&n.props.accessibleName==='Table rows')!;scene.input(window.tableViewControls.grouping,{kind:'scroll',id:body.id,y,animated:false});},y);
  const states=['collapsed','expanded','sticky','multi','multi-collapsed','count-order'];
  for(const state of states){
   await page.evaluate(state=>{const t=window.tableViewControls.grouping;if(state==='collapsed')t.update({groups:['department'],defaultGroupState:'Collapsed' as import('winui-wasm').TableViewGroupState,areStickyGroupHeadersEnabled:false});if(state==='expanded')t.expandAllGroups();if(state==='sticky')t.update({areStickyGroupHeadersEnabled:true});if(state==='multi')t.update({groups:['department','active']});if(state==='multi-collapsed')t.collapseGroup(['Design']);if(state==='count-order'){t.ungroupAll();t.update({groups:[{column:'department',sortMode:'Count' as import('winui-wasm').TableViewGroupSortMode,direction:'Descending' as import('winui-wasm').TableViewSortDirection}]});}},state);
   await scroll(state==='sticky'?90:0);await page.waitForTimeout(850);
   const data=await page.locator('#table-grouping-runtime canvas').first().evaluate(c=>(c as HTMLCanvasElement).toDataURL('image/png').split(',')[1]);const bytes=Buffer.from(data,'base64');writeFileSync(`../out/table-view-grouping-${theme}-${state}.png`,bytes);
   const actual=PNG.sync.read(bytes),reference=PNG.sync.read(readFileSync(`../out/table-view-grouping-native/${theme}-${state}.png`));expect([actual.width,actual.height]).toEqual([reference.width,reference.height]);
   const expected=native.records.find(r=>r.name===`${theme}-${state}`)!;
   const geometry=await page.evaluate(()=>{const t=window.tableViewControls.grouping.tableSnapshot!,s=window.tableViewScenes.grouping.snapshot;return{viewKeys:t.viewKeys,groups:t.realizedGroups.map(g=>{const n=s.nodes.find(n=>n.children.includes(g.container!))!;return{key:g.key,rect:{x:n.world[4],y:n.world[5],width:n.rect.width,height:n.rect.height}};})};});
   expect(geometry.viewKeys).toEqual(expected.visibleItems);
   const groupGeometry=geometry.groups.map(g=>{const r=expected.headers.find(n=>JSON.stringify(n.key)===JSON.stringify(g.key)&&Math.abs(n.rect.y-g.rect.y)<1.1);return{key:g.key,actual:g.rect,native:r?.rect};});
   for(const g of groupGeometry){expect(g.native,`Native group geometry for ${String(g.key)}`).toBeDefined();expect(Math.abs(g.actual.height-g.native!.height)).toBeLessThan(.01);}
   // RTB includes the SampleApp backdrop; the Rust canvas keeps transparent
   // pixels for its host. Composite the identical fixture backdrop before comparing.
   const bg=theme===ThemeMode.Light?243:32;for(let i=0;i<actual.data.length;i+=4){const alpha=actual.data[i+3]/255;for(let c=0;c<3;c++)actual.data[i+c]=Math.round(actual.data[i+c]*alpha+bg*(1-alpha));actual.data[i+3]=255;}
   writeFileSync(`../out/table-view-grouping-${theme}-${state}-composited.png`,PNG.sync.write(actual));
   let changed=0,sum=0,max=0,total=0;const first=expected.headers[0].rect;for(let y=Math.ceil(first.y*1.25);y<Math.floor((first.y+first.height)*1.25);y++)for(let x=2;x<actual.width-3;x++){const i=(y*actual.width+x)*4,e=Math.max(...[0,1,2].map(c=>Math.abs(actual.data[i+c]-reference.data[i+c])));total++;if(e>3)changed++;sum+=e;max=Math.max(max,e);}
   results.push({theme,state,groupGeometry,firstHeaderPixels:{changedFraction:changed/total,meanMaximumChannelError:sum/total,max},matchingVisibleItems:true});
  }
 }
 writeFileSync('../out/table-view-grouping-visual.json',JSON.stringify({wasmSha256:testInfo.config.metadata.wasmSha256,native:'NuGet 1.5.1 unmodified DLL in community SampleApp',computerUse:false,acceptedAsFullParity:false,scope:'12 static states, actual geometry and backing pixels; Composition and physical 120Hz require separate acceptance',results},null,2));
});
