import {selectGalleryOption} from './gallery-control-helper';
import {test,expect} from '@playwright/test';
for(const backend of ['Canvas2D','WebGL2']){
 test(`${backend} calendar keyboard, blackout and mode navigation`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#calendar-view');await page.getByRole('group',{name:'Calendar',exact:true}).waitFor();
  await page.evaluate(async backend=>{const {WinUI}=await import('/@id/winui-wasm' as string);const w=window as any;document.querySelector('#app')?.setAttribute('style','display:none');const h=document.createElement('div');h.id='picker-test';h.style.cssText='position:fixed;inset:0;width:1000px;height:800px';document.body.append(h);w.testSdk=await WinUI.create({globalScrollbars:false});w.testScene=w.testSdk.scene(h,{backend});w.testCalendar=w.testScene.root.canvas().calendarView({today:'2026-11-08',minDate:'2020-01-01',maxDate:'2030-12-31',blackoutDates:['2026-11-10'],canvasLeft:24,canvasTop:24});},backend);
  const day=page.getByRole('button',{name:'2026-11-08',exact:true});await day.click();await expect.poll(()=>page.evaluate(()=>(window as any).testCalendar.properties.selectedDates)).toEqual(['2026-11-08']);
  await day.press('ArrowRight');await page.keyboard.press('Enter');await expect.poll(()=>page.evaluate(()=>(window as any).testCalendar.properties.selectedDates)).toEqual(['2026-11-09']);
  await expect(page.getByRole('button',{name:'2026-11-10',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'November 2026',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).testCalendar.properties.displayMode)).toBe('Year');
  await page.getByRole('button',{name:'2026-02-01',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).testCalendar.properties.displayMode)).toBe('Month');expect(errors).toEqual([]);
  await page.evaluate(()=>(window as any).testSdk.dispose());
 });
 for(const kind of ['DatePicker','TimePicker','CalendarDatePicker'])test(`${backend} ${kind} popup commit, dismiss and scroll scope`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#'+({DatePicker:'date-picker',TimePicker:'time-picker',CalendarDatePicker:'calendar-date-picker'} as Record<string,string>)[kind]);const sampleFace=page.locator('#'+({DatePicker:'picker-date',TimePicker:'picker-time',CalendarDatePicker:'picker-calendar-date'} as Record<string,string>)[kind]).getByRole('button',{name:kind==='TimePicker'?'TimePicker':kind==='CalendarDatePicker'?'Calendar':'Pick a date',exact:true}).first();await sampleFace.waitFor();await selectGalleryOption(page.getByRole('combobox',{name:'Renderer',exact:true}),backend);await sampleFace.click();if(kind==='CalendarDatePicker'){await page.getByRole('button',{name:/^\d{4}-\d{2}-\d{2}$/}).first().click();}else{const accept=page.getByRole('button',{name:'Accept',exact:true});await expect(accept).toBeVisible();await accept.click();}
  await page.evaluate(async({kind,backend})=>{const {WinUI}=await import('/@id/winui-wasm' as string);const w=window as any;document.querySelector('#app')?.setAttribute('style','display:none');const h=document.createElement('div');h.id='picker-test';h.style.cssText='position:fixed;inset:0;width:1000px;height:800px';document.body.append(h);w.testSdk=await WinUI.create({globalScrollbars:false});w.testScene=w.testSdk.scene(h,{backend});const factory=kind[0].toLowerCase()+kind.slice(1);w.testPicker=w.testScene.root.canvas()[factory]({today:'2026-11-08',date:kind==='TimePicker'?undefined:'2026-11-08',time:kind==='TimePicker'?875:undefined,canvasLeft:160,canvasTop:200,accessibleName:'Test picker'});}, {kind,backend});
  const face=page.getByRole('button',{name:'Test picker',exact:true});await face.click();await expect.poll(()=>page.evaluate(()=>(window as any).testScene.snapshot.backgroundScrollRoot)).not.toBeNull();
  if(kind==='CalendarDatePicker'){
   if(backend==='Canvas2D'){
    // ResizeObserver may report zero while a selected-date popup is closing
    // on an unloaded page. Empty surfaces must never become drawImage inputs.
    const hidden=await page.evaluate(()=>{const s=(window as any).testScene;const frame=JSON.parse(s.raw.scene_frame(s.handle,s.clock(),0,0,devicePixelRatio));s.draw();return frame;});
    expect(hidden.floatingSurface.visible).toBe(false);
   }
   await page.getByRole('button',{name:'2026-11-12',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).testPicker.properties.date)).toBe('2026-11-12');
  }else{
   await page.getByRole('button',{name:'Dismiss',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).testScene.snapshot.backgroundScrollRoot)).toBeNull();
   await face.click();await page.getByRole('button',{name:'Accept',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).testPicker.properties.isOpen)).toBe(false);
   const value=await page.evaluate(kind=>{const p=(window as any).testPicker.properties;return kind==='TimePicker'?p.time:p.date;},kind);expect(value).toBe(kind==='TimePicker'?875:'2026-11-08');
  }
  await expect.poll(()=>page.evaluate(()=>(window as any).testScene.snapshot.backgroundScrollRoot)).toBeNull();await face.click();await page.keyboard.press('Escape');await expect.poll(()=>page.evaluate(()=>(window as any).testScene.snapshot.backgroundScrollRoot)).toBeNull();expect(errors).toEqual([]);await page.evaluate(()=>(window as any).testSdk.dispose());
 });
 test(`${backend} color spectrum, RGB/hex synchronization and More toggle`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#color-picker');await page.getByRole('button',{name:'Color spectrum',exact:true}).waitFor();await selectGalleryOption(page.getByRole('combobox',{name:'Renderer',exact:true}),backend);
  const scene=()=>page.evaluate(()=>(window as any).pickerScenes.ColorPicker.snapshot);
  const spectrum=page.getByRole('button',{name:'Color spectrum',exact:true});await spectrum.click({position:{x:100,y:80}});await spectrum.press('ArrowRight');
  expect((await scene()).backend.kind).toBe(backend);
  const red=page.getByRole('textbox',{name:'Red',exact:true});await red.fill('255');await red.press('Tab');await expect.poll(()=>page.getByRole('textbox',{name:'Hex',exact:true}).inputValue()).toMatch(/^#FF/i);
  const hex=page.getByRole('textbox',{name:'Hex',exact:true});await hex.fill('#008000');await hex.press('Tab');await expect.poll(()=>page.getByRole('textbox',{name:'Green',exact:true}).inputValue()).toBe('128');
  const checkbox=page.getByRole('checkbox',{name:'IsMoreButtonVisible',exact:true});await checkbox.click();await expect(red).toBeHidden();await page.getByRole('button',{name:'More',exact:true}).click();await expect(red).toBeVisible();expect(errors).toEqual([]);
 });
}
