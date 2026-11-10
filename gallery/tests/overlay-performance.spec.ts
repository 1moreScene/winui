import {test,expect} from '@playwright/test';
import {writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const profiles=['Popup','Flyout','MenuFlyout','ToolTip','CommandBar','AutoSuggestBox','ComboBox','NumberBox','ContentDialog','TeachingTip','SplitButton','ToggleSplitButton','DropDownButton','AppBarButton','NestedFlyouts'] as const;
test('all floating profiles: Rust frame cost and Canvas readback work',async({page})=>{
 test.setTimeout(240000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#command-bar');await page.locator('#command-0 button[data-control-id]').first().waitFor();
 const results=[];
 const runtimeSha256=createHash('sha256').update(await (await page.request.get('/src/wasm/winui_bg.wasm')).body()).digest('hex');
 const imageRoot=process.env.WINUI_OVERLAY_PERF_IMAGES??'../out/overlay-performance-before-images';mkdirSync(imageRoot,{recursive:true});
 for(const backend of ['Canvas2D','WebGL2'] as const)for(const profile of profiles){
  const result=await page.evaluate(async({backend,profile,background})=>{
   const a=await import('/@id/winui-wasm' as string) as typeof import('winui-wasm');
   const host=document.createElement('div');host.style.cssText='position:fixed;inset:0;width:720px;height:480px;z-index:999999';document.body.append(host);
   let time=1000;const ui=await a.WinUI.create({globalScrollbars:false,clock:()=>time});
   const scene=ui.scene(host,{backend:a.RendererBackend[backend],root:{background:'#f3f3f3'}});scene.setHostActive(false);
   const canvas=scene.root.canvas({width:720,height:480});
   if(background==='stripes')for(let x=0;x<720;x+=80)canvas.rectangle({canvasLeft:x,width:80,height:480,fill:x%160?'#247abb':'#ff735c'});
   const anchor=canvas.button({canvasLeft:240,canvasTop:80,width:160,text:'Anchor'});
   const items=Array.from({length:10},(_,i)=>({id:String(i),text:'Command '+i}));
   const place={canvasLeft:220,canvasTop:80,width:280};let open:()=>void;
   if(profile==='Popup'||profile==='Flyout'||profile==='ToolTip'){
    const options={width:280,height:220,placement:a.OverlayPlacement.Bottom,text:profile};
    const popup=profile==='Popup'?canvas.popup(options):profile==='Flyout'?canvas.flyout(options):canvas.toolTip(options);
    if(profile!=='ToolTip')popup.text({text:'A floating content surface'});open=()=>popup.showAt(anchor);
   }else if(profile==='MenuFlyout'){const popup=canvas.menuFlyout({menuItems:items});open=()=>popup.showAt(anchor);
   }else if(profile==='CommandBar'){const bar=canvas.commandBar({...place,width:500,primaryCommands:[{id:'add',label:'Add'},{id:'edit',label:'Edit'}],secondaryCommands:items.map(i=>({id:i.id,label:i.text}))});open=()=>bar.open();
   }else if(profile==='AutoSuggestBox'){const node=canvas.autoSuggestBox({...place,items});open=()=>node.update({isSuggestionListOpen:true});
   }else if(profile==='ComboBox'){const node=canvas.comboBox({...place,items});open=()=>node.update({isDropDownOpen:true});
   }else if(profile==='NumberBox'){const node=canvas.numberBox({...place,value:10,spinButtonPlacementMode:a.NumberBoxSpinButtonPlacementMode.Compact});open=()=>node.focus();
   }else if(profile==='ContentDialog'){const node=canvas.contentDialog({title:'Confirm',closeButtonText:'Close'});node.text({text:'Content dialog content'});open=()=>{void node.showAsync();};
   }else if(profile==='TeachingTip'){const node=canvas.teachingTip({title:'Tip',subtitle:'A shared floating surface',preferredPlacement:a.TeachingTipPlacementMode.Bottom});node.attachTo(anchor);open=()=>node.show();
   }else if(profile==='NestedFlyouts'){
    const first=canvas.flyout({width:280,height:180});const inner=first.button({text:'Nested anchor'});const second=first.menuFlyout({menuItems:items});open=()=>{first.showAt(anchor);second.showAt(inner);};
   }else{const popup=canvas.flyout({width:280,height:220});popup.text({text:'Shared attached flyout'});
    if(profile==='SplitButton'||profile==='ToggleSplitButton'){const node=profile==='SplitButton'?canvas.splitButton({...place,text:'Open'}):canvas.toggleSplitButton({...place,text:'Open'});node.setFlyout(popup);open=()=>node.openFlyout();}
    else{const node=profile==='DropDownButton'?canvas.dropDownButton({...place,text:'Open'}):canvas.appBarButton({...place,label:'Open'});node.setFlyout(popup);open=()=>node.openFlyout();}
   }
   const internal=scene as unknown as {raw:{scene_frame:(id:number,time:number,width:number,height:number,dpr:number)=>string};handle:number};
   const nativeFrame=(t:number)=>{time=t;return JSON.parse(internal.raw.scene_frame(internal.handle,time,720,480,1.25)) as import('winui-wasm').SceneSnapshot;};
   nativeFrame(time);open!();
   const proto=CanvasRenderingContext2D.prototype,read=proto.getImageData;let readbacks=0,readbackMs=0,readPixels=0;
   proto.getImageData=function(...args:Parameters<typeof read>){const t=performance.now();try{readbacks++;readPixels+=args[2]*args[3];return read.apply(this,args);}finally{readbackMs+=performance.now()-t;}};
   const samples:number[]=[];let snapshot:import('winui-wasm').SceneSnapshot;
   try{for(let i=0;i<36;i++){const t=performance.now();snapshot=nativeFrame(1000+i*16.667);samples.push(performance.now()-t);}}
   finally{proto.getImageData=read;}
   const sorted=[...samples].sort((a,b)=>a-b);
   const result={profile,backend,samples,p50Ms:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.floor(sorted.length*.95)],maxMs:sorted.at(-1),readbacks,readbackMs,readPixels,overlayCount:snapshot!.nodes.filter(n=>n.overlay?.isOpen).length,layoutPasses:snapshot!.layoutPasses,diagnostics:snapshot!.floatingSurface?.backend,baseDiagnostics:snapshot!.backend,png:(scene as unknown as {floatingCanvas:HTMLCanvasElement}).floatingCanvas.toDataURL()};
   scene.dispose();ui.dispose();host.remove();return result;
  },{backend,profile,background:process.env.WINUI_OVERLAY_PERF_BACKGROUND??'stripes'});
  const {png,...row}=result;writeFileSync(`${imageRoot}/${backend}-${profile}.png`,Buffer.from(png.split(',')[1],'base64'));
  results.push(row);expect(result.overlayCount,profile+' must open a real surface').toBeGreaterThan(0);
 }
 expect(errors).toEqual([]);
 writeFileSync(process.env.WINUI_OVERLAY_PERF_RECORD??'../references/validation/overlay-performance-before.json',JSON.stringify({runtimeSha256,background:process.env.WINUI_OVERLAY_PERF_BACKGROUND??'stripes',mode:'release WASM, 720x480 DIP, DPR 1.25; 36 deterministic native scene_frame calls, includes layout, paint and snapshot serialization; excludes DOM projection, RAF and GPU completion',results,errors},null,2));
});


test('CommandBar real RAF animation and SDK frame timing',async({page})=>{
 test.setTimeout(90000);await page.goto('/#command-bar');
 const sample=page.locator('#command-0');await sample.getByRole('button',{name:'Add secondary commands',exact:true}).click();
 await page.evaluate(()=>{
  const scene=window.commandScenes['command-0'] as unknown as {raw:{scene_frame:(...args:any[])=>string};handle:number;state:{animating:boolean}};
  const raw=scene.raw,original=raw.scene_frame;
  const frames:number[]=[],intervals:number[]=[];let previous=performance.now(),wasActive=false,id=0;
  raw.scene_frame=function(...args:any[]){const t=performance.now();try{return original.apply(this,args);}finally{if(args[0]===scene.handle)frames.push(performance.now()-t);}};
  const tick=(now:number)=>{const active=scene.state.animating;if(active||wasActive)intervals.push(now-previous);previous=now;wasActive=active;id=requestAnimationFrame(tick);};
  id=requestAnimationFrame(tick);
  (window as any).__overlayRafPerf={frames,intervals,stop:()=>{cancelAnimationFrame(id);raw.scene_frame=original;}};
 });
 for(let i=0;i<5;i++){
  await page.evaluate(()=>window.commandControls['command-0'].update({isOpen:true}));await page.waitForTimeout(450);
  await page.evaluate(()=>window.commandControls['command-0'].update({isOpen:false}));await page.waitForTimeout(300);
 }
 const result=await page.evaluate(()=>{const f=(window as any).__overlayRafPerf;f.stop();const quantile=(a:number[],q:number)=>[...a].sort((a,b)=>a-b)[Math.floor(a.length*q)];return{frames:f.frames,intervals:f.intervals,frameP50Ms:quantile(f.frames,.5),frameP95Ms:quantile(f.frames,.95),rafP50Ms:quantile(f.intervals,.5),rafP95Ms:quantile(f.intervals,.95)};});
 expect(result.frames.length).toBeGreaterThan(5);
 writeFileSync(process.env.WINUI_OVERLAY_RAF_RECORD??'../references/validation/overlay-raf-before.json',JSON.stringify({mode:'real Gallery CommandBar, Canvas2D, 5 open/close cycles; SDK Rust call and host RAF intervals; not GPU completion',...result},null,2));
});
