import {chromium, expect} from '../gallery/node_modules/@playwright/test/index.mjs';
import {readFileSync,writeFileSync} from 'node:fs';

const browser = await chromium.launch({channel:'chrome'});
const results=[];
const expectedWasm=JSON.parse(readFileSync('out/overlay-validation/packages/winui-wasm/src/wasm/build-stamp.json','utf8')).sha256;
try {
  for(let repeat=0;repeat<10;repeat++) {
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>{
      window.glCallErrors=[];
      const create=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(...args){
        const context=create.apply(this,args);
        if(args[0]!=='webgl2'||!context||context.__diagnosed)return context;
        context.__diagnosed=true;
        const getError=context.getError.bind(context),pending=[];
        const names=new Set();
        for(let proto=Object.getPrototypeOf(context);proto&&proto!==Object.prototype;proto=Object.getPrototypeOf(proto))
          for(const name of Object.getOwnPropertyNames(proto))names.add(name);
        for(const name of names){
          if(name==='getError'||name==='constructor')continue;
          let method;try{method=context[name];}catch{continue;}
          if(typeof method!=='function')continue;
          context[name]=function(...parameters){
            const value=method.apply(this,parameters),error=getError();
            if(error&&error!==context.CONTEXT_LOST_WEBGL){
              pending.push(error);
              window.glCallErrors.push({name,error,example:this.canvas.closest('.example')?.id,stack:new Error().stack,canvas:[this.canvas.width,this.canvas.height],parameters:parameters.map(v=>typeof v==='object'&&v!==null?{type:v.constructor.name,width:v.width,height:v.height,naturalWidth:v.naturalWidth,naturalHeight:v.naturalHeight}:v)});
            }
            return value;
          };
        }
        context.getError=()=>pending.length?pending.shift():getError();
        return context;
      };
    });
    await page.goto((process.env.OVERLAY_URL??'http://127.0.0.1:5185')+'/#icon-element');
    await expect(page.locator('.example')).toHaveCount(6);
    await expect.poll(()=>page.evaluate(()=>window.iconScenes?.['bitmap-icon']?.snapshot.nodes.find(n=>n.kind==='BitmapIcon')?.rect.width)).toBe(50);
    await page.getByLabel('Monochrome',{exact:true}).check();
    await expect.poll(()=>page.evaluate(()=>window.iconScenes['bitmap-icon'].snapshot.nodes.find(n=>n.kind==='BitmapIcon')?.props.showAsMonochrome)).toBe(true);
    await page.getByLabel('Monochrome',{exact:true}).uncheck();
    await page.getByRole('button',{name:'Accept',exact:true}).click();
    await page.locator('#symbol-icon summary').click();
    await page.getByRole('combobox',{name:'Renderer',exact:true}).selectOption('WebGL2');
    await expect.poll(()=>page.evaluate(()=>window.iconScenes['symbol-icon'].snapshot.backend.kind)).toBe('WebGL2');
    await page.getByRole('button',{name:'Font icon button',exact:true}).click();
    await expect(page.getByLabel('Icon output')).toHaveText('FontIcon clicked');
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const wasm=await page.evaluate(async()=>(await import('/src/index.ts')).WinUI.buildVersion);
    if(wasm!==expectedWasm)throw Error('Diagnostic loaded an unexpected WASM build');
    results.push({repeat,wasm,errors,calls:await page.evaluate(()=>window.glCallErrors)});
    await page.close();
  }
} finally {
  writeFileSync('out/overlay-webgl-icon-diagnostics.json',JSON.stringify(results,null,2)+'\n');
  await browser.close();
}
console.log(JSON.stringify(results));
if(results.some(r=>r.errors.length||r.calls.length))process.exitCode=1;
