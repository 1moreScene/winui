import {test,expect} from '@playwright/test';
import {PNG} from 'pngjs';
declare global {interface Window {svgUpload: {ui:import('winui-wasm').WinUI;scene:import('winui-wasm').Scene;source:string;blob:boolean};}}

for(const backend of ['Canvas2D','WebGL2'] as const)test(`${backend} SVG without intrinsic dimensions paints through data and blob sources`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/#icon-element');
  for(const blob of [false,true]){
    await page.evaluate(async({backend,blob})=>{
      const a=await import('/@id/winui-wasm' as string) as typeof import('winui-wasm');
      const host=document.createElement('div');host.id='svg-upload';host.style.cssText='position:fixed;inset:0;width:128px;height:80px;z-index:999999';document.body.append(host);
      const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#ff0000" d="M0 0H24V24H0Z"/><circle cx="12" cy="12" r="6" fill="#0000ff"/></svg>';
      const source=blob?URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})):'data:image/svg+xml,'+encodeURIComponent(svg);
      const ui=await a.WinUI.create({globalScrollbars:false});
      const scene=ui.scene(host,{backend:a.RendererBackend[backend],reducedMotion:true});
      scene.root.canvas({background:'#ffffff'}).imageIcon({source,width:48,height:48,canvasLeft:8,canvasTop:8});
      window.svgUpload={ui,scene,source,blob};
    },{backend,blob});
    await expect.poll(()=>page.evaluate(()=>window.svgUpload.scene.snapshot.imageRequests.length)).toBe(0);
    await expect.poll(()=>page.evaluate(()=>window.svgUpload.scene.snapshot.imageSources.length)).toBe(1);
    const pixels=PNG.sync.read(await page.locator('#svg-upload canvas').screenshot());
    for(const [x,y,color] of [[12,12,[255,0,0]],[32,32,[0,0,255]],[70,32,[255,255,255]]] as const){
      const at=(y*pixels.width+x)*4;expect([...pixels.data.subarray(at,at+3)]).toEqual(color);
    }
    await page.evaluate(()=>{const s=window.svgUpload;s.ui.dispose();if(s.blob)URL.revokeObjectURL(s.source);document.querySelector('#svg-upload')?.remove();});
  }
  expect(errors).toEqual([]);
});
