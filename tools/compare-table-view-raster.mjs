import {chromium} from '../gallery/node_modules/@playwright/test/index.mjs';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {PNG} from '../gallery/node_modules/pngjs/lib/png.js';
const baseline=resolve(process.argv[2]??'out/table-view-sdk-final'),candidate=resolve(process.argv[3]??'packages/winui-wasm/src/wasm');
const root='out/table-view-raster-comparison';mkdirSync(root,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'}),results=[];
try{
 for(const dpr of [1,1.25,1.5,2]){
  const snapshots={};
  for(const [version,dir] of [['before',baseline],['after',candidate]]){
   const page=await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:dpr});
   await page.routeWebSocket(/^ws:\/\/127\.0\.0\.1:\d+\//,()=>{});
   page.on('pageerror',e=>console.error(`${dpr} ${version}: ${e.message}`));
   await page.route('**/src/wasm/winui.js*',route=>route.fulfill({body:readFileSync(resolve(dir,'winui.js')),contentType:'text/javascript'}));
   await page.route('**/src/wasm/winui_bg.wasm*',route=>new URL(route.request().url()).searchParams.has('url')?route.continue():route.fulfill({body:readFileSync(resolve(dir,'winui_bg.wasm')),contentType:'application/wasm'}));
   await page.goto('http://127.0.0.1:5173/#table-view');await page.waitForFunction(()=>window.tableViewControls?.large?.tableSnapshot?.totalCount===10000);
   await page.waitForTimeout(800);
   for(const key of ['editing','large','columns']){
    await page.locator('#table-'+key).scrollIntoViewIfNeeded();await page.mouse.move(5,5);await page.waitForTimeout(100);
    for(const state of ['default','scrolled']){
     if(state==='scrolled')await page.evaluate(({key,dpr})=>{const s=window.tableViewScenes[key],body=s.state.nodes.find(n=>n.kind==='ScrollViewer'&&n.props.accessibleName==='Table rows');s.raw.scene_input(s.handle,JSON.stringify({kind:'scroll',id:body.id,x:key==='columns'?120/dpr:0,y:102/dpr,zoom:null,animated:false}),s.clock());s.draw();},{key,dpr});
     const data=await page.locator('#table-'+key+' canvas').first().evaluate(c=>c.toDataURL('image/png').split(',')[1]);
     const bytes=Buffer.from(data,'base64');snapshots[`${version}-${key}-${state}`]=PNG.sync.read(bytes);writeFileSync(`${root}/${dpr}-${version}-${key}-${state}.png`,bytes);
    }
   }
   await page.close();
  }
  for(const key of ['editing','large','columns'])for(const state of ['default','scrolled']){
   const a=snapshots[`before-${key}-${state}`],b=snapshots[`after-${key}-${state}`];let changed=0,max=0,sum=0;
   if(a.width!==b.width||a.height!==b.height)throw new Error('Canvas geometry differs');
   for(let i=0;i<a.data.length;i+=4){let error=0;for(let c=0;c<4;c++)error=Math.max(error,Math.abs(a.data[i+c]-b.data[i+c]));if(error>0)changed++;sum+=error;max=Math.max(max,error);}
   results.push({dpr,key,state,pixels:a.width*a.height,changed,maxError:max,meanMaxChannelError:sum/(a.width*a.height)});
  }
 }
}finally{await browser.close();}
const hash=dir=>createHash('sha256').update(readFileSync(resolve(dir,'winui_bg.wasm'))).digest('hex');
writeFileSync(`${root}/results.json`,JSON.stringify({baseline,candidate,baselineWasmSha256:hash(baseline),candidateWasmSha256:hash(candidate),scope:'Real Rust Canvas2D backing pixels, identical static states at integer physical scroll offsets; continuous motion assessed separately against native. Removing source-incompatible On/Off labels is an intentional candidate difference.',results},null,2));
console.log(JSON.stringify(results,null,2));
