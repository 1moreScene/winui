import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import type {Scene, NavigationView} from '../src/index';

declare global {interface Window {aaSurfaces:{scene:Scene;nav:NavigationView;gpu:Scene}}}

async function fixture(page: import('@playwright/test').Page) {
  await page.goto('/#navigation-view');
  await expect(page.locator('#runtime-status')).toHaveText('Ready');
  await page.evaluate(async()=>{
    const a=await import('/src/index.ts' as string) as typeof import('../src/index');
    for(const [id,left] of [['aa-scene',0],['aa-nav',500],['aa-gpu',0]] as const){
      const host=document.createElement('div');host.id=id;
      host.style.cssText=`position:fixed;left:${left}px;top:0;width:419.375px;height:131.625px;z-index:99999`;
      if(id==='aa-gpu')host.style.top='200px';
      document.body.append(host);
    }
    const scene=window.gallery.sdk.scene(document.getElementById('aa-scene')!,{reducedMotion:true});
    scene.root.radioButton({text:'First',isChecked:true,margin:[24.375,16.625,0,0],verticalAlignment:a.VerticalAlignment.Top});
    scene.root.radioButton({text:'Second',margin:[250.75,16.625,0,0],verticalAlignment:a.VerticalAlignment.Top});
    const nav=window.gallery.sdk.navigationView(document.getElementById('aa-nav')!,{reducedMotion:true,items:[{id:'home',text:'Home'}]});
    const gpu=window.gallery.sdk.scene(document.getElementById('aa-gpu')!,{backend:a.RendererBackend.WebGL2,reducedMotion:true});
    gpu.root.radioButton({text:'GPU',isChecked:true,margin:[24.375,16.625,0,0],verticalAlignment:a.VerticalAlignment.Top});
    window.aaSurfaces={scene,nav,gpu};
  });
}

async function expectMapping(page: import('@playwright/test').Page,dpr:number,width:number,height:number) {
  for(const id of ['aa-scene','aa-nav','aa-gpu']) {
    const canvas=page.locator(`#${id} canvas`);
    await expect.poll(()=>canvas.evaluate(c=>(c as HTMLCanvasElement).width)).toBe(Math.ceil(width*dpr));
    await expect.poll(()=>canvas.evaluate(c=>(c as HTMLCanvasElement).height)).toBe(Math.ceil(height*dpr));
    const r=await canvas.evaluate(c=>({width:c.getBoundingClientRect().width,height:c.getBoundingClientRect().height,pixels:(c as HTMLCanvasElement).width,rows:(c as HTMLCanvasElement).height}));
    expect(Math.abs(r.width*dpr-r.pixels)).toBeLessThan(.02);
    expect(Math.abs(r.height*dpr-r.rows)).toBeLessThan(.02);
  }
}

test('fractional Scene and NavigationView surfaces map backing pixels without stretching',async({browser})=>{
  for(const dpr of [1,1.25,1.5,2]) {
    const context=await browser.newContext({deviceScaleFactor:dpr,viewport:{width:1200,height:800}});
    try {
      const page=await context.newPage();await fixture(page);
      await expectMapping(page,dpr,419.375,131.625);
      await page.getByRole('radio',{name:'Second',exact:true}).click();
      await expect(page.getByRole('radio',{name:'Second',exact:true})).toBeChecked();
      await expect(page.getByRole('radio',{name:'First',exact:true})).not.toBeChecked();
      await page.evaluate(()=>{for(const id of ['aa-scene','aa-nav','aa-gpu']){const host=document.getElementById(id)!;host.style.width='337.875px';host.style.height='93.125px';}});
      await expectMapping(page,dpr,337.875,93.125);
    } finally {await context.close();}
  }
});

test('idle surfaces repaint on display scale and viewport changes and release listeners',async({browser})=>{
  const context=await browser.newContext({deviceScaleFactor:1,viewport:{width:1200,height:800}});
  try {
    const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await fixture(page);const cdp=await context.newCDPSession(page);
    for(const dpr of [1.5,1.25,2,1]) {
      // CDP's scale-factor override alone changes computed resolution without
      // delivering native media-query events. Include the corresponding CSS
      // viewport resize; real displays also have the physical-box/media paths.
      await cdp.send('Emulation.setDeviceMetricsOverride',{width:Math.round(1200/dpr),height:Math.round(800/dpr),deviceScaleFactor:dpr,mobile:false});
      await expectMapping(page,dpr,419.375,131.625);
    }
    await page.evaluate(()=>{window.aaSurfaces.scene.dispose();window.aaSurfaces.nav.dispose();window.aaSurfaces.gpu.dispose();});
    await cdp.send('Emulation.setDeviceMetricsOverride',{width:800,height:533,deviceScaleFactor:1.5,mobile:false});
    await expect(page.locator('#aa-scene canvas,#aa-nav canvas,#aa-gpu canvas')).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally {await context.close();}
});

test('circle and toggle-thumb edge coverage meets an independent numerical reference',()=>{
  // Own isolated browser contexts, not the user's browser. 32x32 numerical
  // integration defines expected circle coverage independently of Canvas paths.
  execFileSync(process.execPath,['../tools/diagnose-antialias.mjs','regression'],{timeout:30000});
  execFileSync(process.execPath,['../tools/diagnose-antialias.mjs','fractional','--fractional-transform'],{timeout:30000});
});
