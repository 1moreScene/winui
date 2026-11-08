import {test,expect} from '@playwright/test';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';import {join} from 'node:path';import {createHash} from 'node:crypto';
const repo=process.env.WINUI_PICKER_REPO!;
const baseline=JSON.parse(readFileSync(join(repo,'references/picker-controls-native.json'),'utf8'));
for(const backend of ['Canvas2D','WebGL2'])test(`${backend} native picker matrix`,async({page})=>{
 test.setTimeout(240000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#calendar-view');await page.getByRole('group',{name:'Calendar',exact:true}).waitFor();
 await page.evaluate(async()=>{const {WinUI}=await import('/src/index.ts' as string);const w=window as any;w.pickerSdk=await WinUI.create({globalScrollbars:false});document.querySelector('#app')?.setAttribute('style','display:none');const h=document.createElement('div');h.id='picker-validation';h.style.cssText='position:fixed;inset:0;width:1000px;height:800px';document.body.append(h);});
 const output=join(repo,'out',process.env.WINUI_PICKER_EVIDENCE??'picker-visual',backend);mkdirSync(output,{recursive:true});const rows=[];
 for(const reference of baseline.rows){
  await page.evaluate(({reference,backend})=>{
   const w=window as any;w.pickerScene?.dispose();const s=w.pickerSdk.scene(document.querySelector('#picker-validation'),{theme:reference.theme,backend,reducedMotion:true});w.pickerScene=s;s.root.update({background:reference.theme==='Dark'?'#202020':'#f3f3f3'});
   const root=s.root.canvas();const state=reference.state,p=reference.props;
   const props:any={today:'2026-11-08',language:'en-US',formatLanguage:'zh-CN',canvasLeft:state==='Open'||state.startsWith('Wheel')?160:24,canvasTop:state==='Open'||state.startsWith('Wheel')?200:24,enabled:state!=='Disabled'};
   let c:any;
   if(reference.kind==='CalendarView')c=root.calendarView({...props,...p,selectionMode:state==='Multiple'?'Multiple':'Single'});
   if(reference.kind==='CalendarDatePicker')c=root.calendarDatePicker({...props,...p,header:state==='Header'?'Date':'',placeholderText:'Pick a date',isCalendarOpen:state==='Open'});
   if(reference.kind==='DatePicker'){const {dayFormat,monthFormat,yearFormat,...rest}=p;c=root.datePicker({...props,...rest,header:state==='Header'?'Date':'',isOpen:state==='Open'||state.startsWith('Wheel')});}
   if(reference.kind==='TimePicker')c=root.timePicker({...props,...p,header:state==='Header'?'Time':'',isOpen:state==='Open'||state.startsWith('Wheel')});
   if(reference.kind==='ColorPicker'){const {components,shape,...rest}=p;c=root.colorPicker({...props,...rest,colorSpectrumComponents:components,colorSpectrumShape:shape,isMoreButtonVisible:state==='More'});}
   w.pickerControl=c;
  },{reference,backend});
  await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())))));
  if(reference.state.startsWith('Wheel')){const up=reference.popups.flatMap((p:any)=>p.parts).find((p:any)=>p.name==='UpButton'&&p.visible==='Visible'&&p.bounds.width>0).bounds;await page.evaluate(up=>{const w=window as any;w.wheelPoint={x:up.x+up.width/2,y:up.y+up.height/2};w.pickerScene.input(w.pickerControl,{kind:'move',...w.wheelPoint,pointer:1});},up);await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>r())));await page.evaluate(pressed=>{const w=window as any;w.pickerScene.input(w.pickerControl,{kind:'move',...w.wheelPoint,pointer:1});if(pressed)w.pickerScene.input(w.pickerControl,{kind:'down',...w.wheelPoint,pointer:1});},reference.state==='WheelPressed');await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>r())));}
  const actual=await page.evaluate(()=>{const w=window as any,s=w.pickerScene.snapshot,n=w.pickerControl.snapshot;const bounds=(p:any)=>({x:p.world[4],y:p.world[5],width:p.rect.width,height:p.rect.height});return{backend:s.backend,owner:bounds(n),picker:n.picker,parts:Object.fromEntries(Object.entries(n.picker.parts).map(([k,id])=>{const p=s.nodes.find((n:any)=>n.id===id);return[k,{bounds:bounds(p),text:p.props.text,visible:p.visible,overlay:p.overlay,scroll:p.scroll,desired:p.desired}];})),nodes:s.nodes.length};});
  expect(actual.backend.kind).toBe(backend);expect(actual.backend.lost).toBe(false);if(reference.popups.length){expect(actual.parts.Popup.overlay.isOpen).toBe(true);expect(actual.parts.Popup.bounds.height).toBeGreaterThan(300);}
  await page.screenshot({path:join(output,reference.name+'.png'),clip:{x:0,y:0,width:1000,height:800}});rows.push({name:reference.name,native:reference,actual});
 }
 writeFileSync(join(output,'metrics.json'),JSON.stringify({backend,dpr:1.25,wasmSha256:createHash('sha256').update(readFileSync(join(repo,'out/picker-validation/gallery/src/wasm/winui_bg.wasm'))).digest('hex'),rows,errors},null,2));expect(errors).toEqual([]);
 await page.evaluate(()=>{(window as any).pickerSdk.dispose();});
});
