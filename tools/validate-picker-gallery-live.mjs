import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const require=createRequire(new URL('../gallery/package.json',import.meta.url));
const {chromium,expect}=require('@playwright/test');
const official=JSON.parse(readFileSync(new URL('../gallery/src/official-picker-controls.json',import.meta.url),'utf8'));
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1.25,locale:'en-US',timezoneId:'UTC'});
 // This private page should not reload its DOM during a concurrent source save.
 // The SDK loader still accesses the live server; hash every actual WASM body.
 await page.routeWebSocket('**/*',socket=>socket.close());
 await page.clock.setFixedTime(new Date('2026-11-08T12:00:00Z'));
 const pending=[],hashes=new Set(),errors=[],rows=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',response=>{if(new URL(response.url()).pathname.endsWith('/winui_bg.wasm'))pending.push(response.body().then(bytes=>hashes.add(createHash('sha256').update(bytes).digest('hex'))));});
 const routes={CalendarView:'calendar-view',CalendarDatePicker:'calendar-date-picker',DatePicker:'date-picker',TimePicker:'time-picker',ColorPicker:'color-picker'};
 await page.goto('http://127.0.0.1:5173/#calendar-view');
 for(const [kind,route] of Object.entries(routes)){
  await page.evaluate(route=>{location.hash=route;},route);
  const samples=page.locator('.picker-gallery:visible section.example');
  await expect(samples.locator(':scope > h2')).toHaveText(official.controls[kind].samples.map(s=>s.title));
  for(const backend of ['Canvas2D','WebGL2']){
   const renderer=page.locator('.picker-gallery:visible').getByRole('combobox',{name:'Renderer',exact:true});
   if(await renderer.inputValue()!==backend){await renderer.click();await page.locator(`[id="${await renderer.getAttribute('aria-controls')}"]`).getByRole('option',{name:backend,exact:true}).click();}
   await expect.poll(()=>page.evaluate(({kind,backend})=>{const scene=window.pickerScenes?.[kind];if(!scene||scene.isDisposed)return false;const s=scene.snapshot;return s.backend?.kind===backend&&s.nodes.some(n=>n.kind===kind&&n.rect.height>0);},{kind,backend})).toBe(true);
   if(kind==='DatePicker')await expect.poll(()=>page.evaluate(()=>{const scene=window.pickerScenes.DatePickerFormatted;if(!scene||scene.isDisposed)return '';const s=scene.snapshot,n=s.nodes.find(n=>n.kind==='DatePicker');return n?s.nodes.find(p=>p.id===n.picker.parts.Field1)?.props.text:'';})).toBe('8 (Fri)');
   if(kind==='TimePicker')await expect.poll(()=>page.evaluate(()=>{const scene=window.pickerScenes.TimePickerClocks;if(!scene||scene.isDisposed)return 0;return scene.snapshot.nodes.filter(n=>n.kind==='TimePicker'&&n.rect.height>0).length;})).toBe(2);
   if(kind==='ColorPicker'){
    await expect(samples.getByRole('checkbox')).toHaveCount(7);
    await expect.poll(()=>page.evaluate(()=>{const scene=window.pickerScenes.ColorPickerPreview;if(!scene||scene.isDisposed)return false;return scene.snapshot.nodes.some(n=>n.kind==='Rectangle'&&n.rect.height===100);})).toBe(true);
   }
   rows.push({kind,backend,examples:official.controls[kind].samples.length});
  }
 }
 await Promise.all(pending);expect(errors).toEqual([]);expect(hashes.size).toBeGreaterThan(0);
 const result={recordedAt:new Date().toISOString(),url:'http://127.0.0.1:5173/',wasmResponseSha256:[...hashes],rows,errors,
  scope:'One private QA page visits all five real routes on both backends. Vite websocket reloads are disabled only in this page; actual SDK requests still use the live server. Concurrent builds can produce multiple recorded response hashes; this does not certify each binary against the entire frozen browser suite.'};
 writeFileSync(new URL('../out/picker-gallery-live-route-sweep.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({states:rows.length,wasmResponseSha256:[...hashes],errors}));
} finally {await browser.close();}
