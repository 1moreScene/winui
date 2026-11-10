import { test,expect } from '@playwright/test';
import { readFileSync,writeFileSync } from 'node:fs';
test('sample the Rust indicator using native capture timestamps',async({page})=>{
  const native=JSON.parse(readFileSync('../out/navigation-native/animation-times.json','utf8')) as {name:string;requestedMs:number;actualStartMs:number;actualEndMs:number}[];
  await page.goto('/#navigation-view');await expect(page.locator('#runtime-status')).toHaveText('Ready');
  await page.evaluate(async()=>{
    const path='/@id/winui-wasm';const api=await import(path)as typeof import('winui-wasm');
    let time=0;const sdk=await api.WinUI.create({clock:()=>time});
    const host=document.createElement('div');host.id='animation-fixture';host.style.cssText='position:fixed;left:0;top:0;width:1000px;height:500px;z-index:99999';document.body.append(host);
    const view=sdk.navigationView(host,{paneDisplayMode:api.PaneDisplayMode.Left,selectedId:'page1',items:[1,2,3,4].map(n=>({id:`page${n}`,text:`Menu Item${n}`}))});
    Object.assign(window,{indicatorCapture:{sdk,view,setTime:(value:number)=>{time=value;view.update({});}}});
  });
  type Capture={sdk:import('winui-wasm').WinUI;view:import('winui-wasm').NavigationViewController;setTime:(time:number)=>void};
  await page.evaluate(()=>{const c=(window as unknown as {indicatorCapture:Capture}).indicatorCapture;c.setTime(1000);});
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {indicatorCapture:Capture}).indicatorCapture.view.snapshot.time)).toBe(1000);
  await page.evaluate(()=>{(window as unknown as {indicatorCapture:Capture}).indicatorCapture.view.invoke('page3');});
  const samples=[];
  for(const row of native){
    // RenderTargetBitmap has an interval, not a precisely observed compositor frame.
    const time=1000+(row.actualStartMs+row.actualEndMs)/2;
    await page.evaluate(t=>(window as unknown as {indicatorCapture:Capture}).indicatorCapture.setTime(t),time);
    await expect.poll(()=>page.evaluate(()=>(window as unknown as {indicatorCapture:Capture}).indicatorCapture.view.snapshot.time)).toBe(time);
    samples.push({...row,browserTimeMs:time-1000,visuals:await page.evaluate(()=>(window as unknown as {indicatorCapture:Capture}).indicatorCapture.view.snapshot.indicatorVisuals)});
    await page.locator('#animation-fixture').screenshot({path:`../out/navigation-browser/${row.name}.png`});
  }
  writeFileSync('../out/navigation-browser/animation-samples.json',JSON.stringify(samples,null,2));
  await page.evaluate(()=>{const c=(window as unknown as {indicatorCapture:Capture}).indicatorCapture;c.setTime(2000);});
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {indicatorCapture:Capture}).indicatorCapture.view.snapshot.indicatorVisuals.at(-1)?.rect.height)).toBe(16);
  await page.evaluate(()=>{(window as unknown as {indicatorCapture:Capture}).indicatorCapture.sdk.dispose();document.querySelector('#animation-fixture')?.remove();});
});
