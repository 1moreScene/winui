import {test,expect} from '@playwright/test';
import {PNG} from 'pngjs';
test('floating material cache follows live backdrop, palette, policy, size and DPR; disposal releases surfaces',async({page})=>{
 await page.goto('/#command-bar');await page.locator('#command-0 button[data-control-id]').first().waitFor();
 for(const kind of ['Flyout','MenuFlyout'] as const){
  const results=await page.evaluate(async kind=>{
   const a=await import('/@id/winui-wasm' as string) as typeof import('winui-wasm');
   async function create(){
    const host=document.createElement('div');host.style.cssText='position:fixed;inset:0;width:720px;height:480px';document.body.append(host);
    let time=1000,dpr=1.25;const ui=await a.WinUI.create({clock:()=>time,globalScrollbars:false});
    const scene=ui.scene(host,{root:{background:'#f3f3f3'}});scene.setHostActive(false);
    const root=scene.root.canvas({width:720,height:480});const backdrop=root.rectangle({width:720,height:480,fill:'#ff735c'});
    const anchor=root.button({canvasLeft:240,canvasTop:80,text:'Anchor'});
    const popup=kind==='Flyout'?root.flyout({width:280,height:180}):root.menuFlyout({width:280,menuItems:[{id:'one',text:'Command'},{id:'two',text:'Toggle',kind:a.MenuEntryKind.Toggle}]});
    if(kind==='Flyout')popup.text({text:'Live backdrop material'});
    const internals=scene as any;
    const frame=()=>JSON.parse(internals.raw.scene_frame(internals.handle,time,720,480,dpr));
    frame();popup.showAt(anchor);frame();time=1500;frame();
    return{ui,scene,host,backdrop,popup,internals,frame,setTime:(v:number)=>{time=v;},setDpr:(v:number)=>{dpr=v;},image:()=>internals.floatingCanvas.toDataURL() as string};
   }
   const warm=await create();const outputs=[];
   for(const step of ['source','theme','policy','size','dpr'] as const){
    const cold=await create();
    for(const f of [warm,cold]){
     f.backdrop.update({fill:'#247abb'});
     if(step!=='source')f.scene.configure({theme:a.ThemeMode.Dark});
     if(['policy','size','dpr'].includes(step))f.scene.configure({reducedTransparency:true});
     if(['size','dpr'].includes(step))f.popup.update({width:320});
     if(step==='dpr')f.setDpr(2);
     f.setTime(2500);f.frame();f.setTime(3000);f.frame();f.frame();
    }
    const beforeDispose=cold.internals.floatingCanvas;
    outputs.push({step,warm:warm.image(),cold:cold.image(),diagnostics:warm.frame().backend});
    cold.scene.dispose();cold.ui.dispose();cold.host.remove();
    if(beforeDispose.width!==0||beforeDispose.height!==0)throw Error('floating surface retained after disposal');
   }
   warm.scene.dispose();warm.ui.dispose();warm.host.remove();return outputs;
  },kind);
  for(const row of results){
   const warm=PNG.sync.read(Buffer.from(row.warm.split(',')[1],'base64')),cold=PNG.sync.read(Buffer.from(row.cold.split(',')[1],'base64'));
   expect([warm.width,warm.height]).toEqual([cold.width,cold.height]);
   let maximum=0;for(let i=0;i<warm.data.length;i++)maximum=Math.max(maximum,Math.abs(warm.data[i]-cold.data[i]));
   expect(maximum,kind+' '+row.step+' stale cache').toBeLessThanOrEqual(1);
   expect((row.diagnostics as any).baseReuses).toBeGreaterThan(0);
  }
 }
});
