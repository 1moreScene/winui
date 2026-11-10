import {test, expect} from '@playwright/test';
import {selectGalleryOption} from './gallery-control-helper';

test.use({locale:'en-US',timezoneId:'America/New_York'});
test.beforeEach(async({page})=>{await page.clock.setFixedTime(new Date('2026-02-17T12:00:00Z'));});

for (const backend of ['Canvas2D','WebGL2']) {
 test(`${backend} calendar identifiers and Chinese annotations stay in Rust`, async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/#calendar-view');
  const example=page.locator('#picker-calendar');
  await example.getByRole('group',{name:'Calendar',exact:true}).waitFor();
  await selectGalleryOption(page.getByRole('combobox',{name:'Renderer',exact:true}),backend);
  const picker=example.getByRole('combobox',{name:'CalendarIdentifier',exact:true});
  const snapshot=()=>page.evaluate(()=>{const s=window.pickerScenes.CalendarView.snapshot;return s.nodes.find(n=>n.kind==='CalendarView')!;});
  for(const calendar of ['JapaneseCalendar','JulianCalendar','KoreanCalendar','TaiwanCalendar','ThaiCalendar','HebrewCalendar','HijriCalendar','UmAlQuraCalendar','PersianCalendar','ChineseCalendar']) {
   await selectGalleryOption(picker,calendar);
   await expect.poll(async()=>(await snapshot()).props.pickerControls?.calendarIdentifier).toBe(calendar);
   expect((await snapshot()).picker!.cells.length).toBe(42);
  }
  const spring=(await snapshot()).picker!.cells.find(c=>c.date==='2026-02-17')!;
  expect(spring.calendarDay.day).toBe(1);expect(spring.annotation).toBe('春节');expect(spring.calendarDay.year).toBe(2026);
  const selected=example.getByRole('button',{name:/^2026-02-17 .*春节/});await selected.click();
  await expect.poll(async()=>(await snapshot()).props.pickerControls?.selectedDates).toEqual(['2026-02-17']);
  await selected.press('PageDown');await page.keyboard.press('Enter');
  await expect.poll(async()=>(await snapshot()).props.pickerControls?.selectedDates).toEqual(['2026-03-19']);
  await example.locator('.basic-preview .winui-scene').screenshot({path:test.info().outputPath(`chinese-${backend}.png`)});
  expect(errors).toEqual([]);
 });
 test(`${backend} Chinese CalendarDatePicker and DatePicker commit Gregorian dates`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await page.goto('/#date-picker');await page.getByRole('button',{name:'Pick a date',exact:true}).waitFor();
  await page.evaluate(async backend=>{
   const {WinUI,CalendarIdentifier,RendererBackend}=await import('/@id/winui-wasm' as string);
   document.querySelector('#app')?.setAttribute('style','display:none');const host=document.createElement('div');host.id='calendar-regression';host.style.cssText='position:fixed;inset:0;width:1000px;height:900px';document.body.append(host);
   const w=window as any;w.calendarSdk=await WinUI.create({globalScrollbars:false});w.calendarScene=w.calendarSdk.scene(host,{backend:backend as typeof RendererBackend.Canvas2D});
   const root=w.calendarScene.root.canvas();w.calendarDate=root.calendarDatePicker({calendarIdentifier:CalendarIdentifier.Chinese,date:'2026-02-17',today:'2026-02-17',language:'zh-CN',canvasLeft:30,canvasTop:40,accessibleName:'Chinese calendar picker'});
   w.lunarDate=root.datePicker({calendarIdentifier:CalendarIdentifier.Chinese,date:'2025-07-25',today:'2026-02-17',language:'zh-CN',canvasLeft:460,canvasTop:200,accessibleName:'Chinese date picker'});
   w.lunarCalendar=root.calendarView({calendarIdentifier:CalendarIdentifier.Chinese,displayDate:'2025-06-25',today:'2026-02-17',canvasLeft:30,canvasTop:400});
  },backend);
  await page.getByRole('button',{name:'Chinese calendar picker',exact:true}).click();
  await page.getByRole('button',{name:/^2026-02-18 .*雨水/}).click();
  await expect.poll(()=>page.evaluate(()=>(window as any).calendarDate.properties.date)).toBe('2026-02-18');
  await page.getByRole('button',{name:'Chinese date picker',exact:true}).click();
  await expect(page.getByRole('option',{name:'闰六月',exact:true}).nth(1)).toBeVisible();
  await page.getByRole('button',{name:'Accept',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>(window as any).lunarDate.properties.date)).toBe('2025-07-25');
  await page.getByRole('button',{name:'Chinese date picker',exact:true}).click();
  await page.getByRole('option',{name:'七月',exact:true}).nth(1).click();
  await expect.poll(()=>page.evaluate(()=>{const s=(window as any).calendarScene.snapshot,n=(window as any).lunarDate.snapshot,wheel=s.nodes.find((p:any)=>p.id===n.picker.parts.SecondWheel),index=Math.round((wheel.scroll.verticalOffset+wheel.scroll.viewportHeight/2-20)/40);return !wheel.scroll.isIntermediate&&wheel.collection.realized.some((item:any)=>item.index===index&&/^month-\d+-7$/.test(item.key));})).toBe(true);
  await page.getByRole('button',{name:'Accept',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>(window as any).lunarDate.properties.date)).toBe('2025-08-23');
  await page.getByRole('button',{name:'Next',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>(window as any).calendarScene.snapshot.nodes.find((n:any)=>n.kind==='CalendarView'&&!n.composedOwner).picker.cells.some((c:any)=>c.date==='2025-07-25'&&c.calendarDay.leapMonth&&c.annotation==='闰六月'))).toBe(true);
  await page.evaluate(()=>(window as any).lunarCalendar.setDisplayDate('2026-11-07'));
  await expect.poll(()=>page.evaluate(()=>(window as any).calendarScene.snapshot.nodes.find((n:any)=>n.kind==='CalendarView'&&!n.composedOwner).picker.cells.find((c:any)=>c.date==='2026-11-07')?.solarTerm)).toBe('立冬');
  await page.locator('#calendar-regression').screenshot({path:test.info().outputPath(`chinese-${backend}.png`)});
  expect(errors).toEqual([]);await page.evaluate(()=>(window as any).calendarSdk.dispose());
 });
}
