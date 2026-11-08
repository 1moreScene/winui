import {test,expect} from '@playwright/test';import{readFileSync,writeFileSync,mkdirSync}from'node:fs';import{join}from'node:path';
const repo=process.env.WINUI_COMPOSED_REPO!;const reference=JSON.parse(readFileSync(join(repo,'references/composed-controls-motion.json'),'utf8'));
for(const backend of ['Canvas2D','WebGL2'])test(`${backend} replays the live same-SDK composed motion sample times`,async({page})=>{
 test.setTimeout(600000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#number-box');await page.getByRole('spinbutton',{name:'Quantity',exact:true}).waitFor();
 await page.evaluate(async()=>{const path='/src/index.ts';const api=await import(path),w=window as any;w.motionTime=0;w.motionSdk=await api.WinUI.create({clock:()=>w.motionTime,globalScrollbars:false});document.querySelector('#app')?.setAttribute('style','display:none');const host=document.createElement('div');host.id='composed-motion';host.style.cssText='position:fixed;left:0;top:0;width:1000px;height:500px;z-index:99999';document.body.append(host);});
 const output=join(repo,'out',process.env.WINUI_COMPOSED_EVIDENCE?process.env.WINUI_COMPOSED_EVIDENCE+'/motion':'composed-motion',backend);mkdirSync(output,{recursive:true});const results:any[]=[];
 for(const before of reference.rows.filter((r:any)=>r.phase==='Before')){
  const open=reference.rows.find((r:any)=>r.name===before.name&&r.phase==='Open'),close=reference.rows.find((r:any)=>r.name===before.name&&r.phase==='Close');const closeDelay=(close.absoluteStartedMs-close.captureStartedMs)-(open.absoluteStartedMs-open.captureStartedMs);
  await page.evaluate(({before,backend,closeDelay})=>{const w=window as any;w.motionScene?.dispose();w.motionTime=0;w.motionCloseStart=1000+closeDelay;const scene=w.motionSdk.scene(document.querySelector('#composed-motion'),{backend,theme:before.theme,reducedMotion:false});w.motionScene=scene;scene.root.update({background:before.theme==='Dark'?'#202020':'#f3f3f3'});const root=scene.root.canvas(),props=before.props;let control:any;w.motionOutside=undefined;
   if(before.kind==='NumberBox'){control=root.numberBox(props);w.motionOutside=root.button({text:'Outside',canvasLeft:450,canvasTop:400});}
   if(before.kind==='AutoSuggestBox')control=root.autoSuggestBox({...props,items:['Blue','Green','Red','Yellow']});
   if(before.kind==='ComboBox')control=root.comboBox({...props,items:['Blue','Green','Red','Yellow']});
   if(before.kind==='ContentDialog'){control=root.contentDialog(props);control.text({text:'Your changes will be saved to the cloud.',wrap:true});}
   if(before.kind==='TeachingTip'){const target=root.button({text:'Target',width:100,height:32,canvasLeft:450,canvasTop:230});control=root.teachingTip(props);control.attachTo(target);}
   w.motionControl=control;
  },{before,backend,closeDelay});
  const settle=()=>page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));await settle();
  for(const phase of ['Before','Open','Close']){
   if(phase!=='Before'){await page.evaluate(({phase,kind,select})=>{const w=window as any,c=w.motionControl;w.motionTime=phase==='Open'?1000:w.motionCloseStart;if(phase==='Open'){if(kind==='NumberBox')c.focus();else if(kind==='AutoSuggestBox'){c.focus();c.update({isSuggestionListOpen:true});}else if(kind==='ComboBox'){c.focus();c.open();}else if(kind==='ContentDialog')void c.showAsync();else c.show();}else{if(kind==='NumberBox')w.motionOutside.focus();else if(kind==='AutoSuggestBox')c.update({isSuggestionListOpen:false});else if(kind==='ComboBox'){if(select)c.choose(0);c.close();}else c.hide();}}, {phase,kind:before.kind,select:before.name.includes('Select')});await settle();}
   for(const sample of reference.rows.filter((r:any)=>r.name===before.name&&r.phase===phase)){
    await page.evaluate(({phase,time})=>{(window as any).motionTime=(phase==='Before'?0:phase==='Open'?1000:(window as any).motionCloseStart)+time;(window as any).motionScene.configure({});},{phase,time:sample.captureStartedMs});
    // An unchanged policy still schedules a platform frame without altering Rust state.
    await settle();const state=await page.evaluate(()=>{const w=window as any,s=w.motionScene.snapshot,n=s.nodes.find((n:any)=>n.id===w.motionControl.snapshot.id),p=s.nodes.find((p:any)=>p.id===n.composed.parts.Popup);return{time:s.time,overlay:p?.overlay,transform:p?.localTransform,bounds:p?.rect,errors:[]};});
    await page.screenshot({path:join(output,sample.image),clip:{x:0,y:0,width:1000,height:500}});results.push({...sample,actual:state});
    if(phase==='Close'&&sample.requestedMs>=500)expect(state.overlay?.isOpen).toBe(false);if(phase==='Close'&&before.kind==='ComboBox'){expect(state.overlay?.opacity).toBe(0);expect(state.overlay?.active).toBe(false);}
   }
  }
 }
 writeFileSync(join(output,'metrics.json'),JSON.stringify({backend,rows:results,errors,scope:'Virtual Rust clock replay at the native pre-capture wall times; raw images retain compositor latency and font differences.'},null,2));expect(errors).toEqual([]);
 await page.evaluate(()=>{const w=window as any;w.motionScene.dispose();w.motionSdk.dispose();document.querySelector('#composed-motion')?.remove();});
});
