import {chromium} from '../gallery/node_modules/@playwright/test/index.mjs';
import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const directory='out/table-view-native-performance';mkdirSync(directory,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1.25});
 await page.routeWebSocket(/^ws:\/\/127\.0\.0\.1:\d+\//,()=>{});
 if(process.env.TABLE_VIEW_ARTIFACT){
  const dir=resolve(process.env.TABLE_VIEW_ARTIFACT);
  await page.route('**/src/wasm/winui.js*',route=>route.fulfill({body:readFileSync(resolve(dir,'winui.js')),contentType:'text/javascript'}));
  await page.route('**/src/wasm/winui_bg.wasm*',route=>new URL(route.request().url()).searchParams.has('url')?route.continue():route.fulfill({body:readFileSync(resolve(dir,'winui_bg.wasm')),contentType:'application/wasm'}));
 }
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const wasm=page.waitForResponse(r=>r.headers()['content-type']?.startsWith('application/wasm'));
 await page.goto('http://127.0.0.1:5173/#table-view');await page.waitForFunction(()=>window.tableViewControls?.large?.tableSnapshot?.totalCount===10000);
 const wasmSha256=createHash('sha256').update(await (await wasm).body()).digest('hex');
 const geometry=[];
 for(const key of ['editing','large']){
  await page.locator('#table-'+key).scrollIntoViewIfNeeded();await page.mouse.move(5,5);await page.waitForTimeout(900);
  for(const state of key==='editing'?['default','scrolled','editor-default','editor-scrolled']:['default','scrolled']){
   if(state==='scrolled'){
    await page.evaluate(key=>window.tableViewControls[key].sort('age','Descending'),key);await page.waitForTimeout(900);
    await page.evaluate(key=>{const s=window.tableViewScenes[key],body=s.snapshot.nodes.find(n=>n.kind==='ScrollViewer'&&n.props.accessibleName==='Table rows');s.raw.scene_input(s.handle,JSON.stringify({kind:'scroll',id:body.id,x:0,y:300,zoom:null,animated:false}),s.clock());s.draw();},key);
    await page.waitForTimeout(300);
   }
   if(state==='editor-default'){
    await page.evaluate(()=>{const s=window.tableViewScenes.editing,body=s.snapshot.nodes.find(n=>n.kind==='ScrollViewer'&&n.props.accessibleName==='Table rows');s.raw.scene_input(s.handle,JSON.stringify({kind:'scroll',id:body.id,x:0,y:0,zoom:null,animated:false}),s.clock());s.draw();const table=window.tableViewControls.editing;table.beginEdit({row:table.tableSnapshot.viewKeys[5],column:'age'});});await page.waitForTimeout(300);
   }
   if(state==='editor-scrolled'){
    await page.evaluate(()=>{const s=window.tableViewScenes.editing,body=s.snapshot.nodes.find(n=>n.kind==='ScrollViewer'&&n.props.accessibleName==='Table rows');s.raw.scene_input(s.handle,JSON.stringify({kind:'scroll',id:body.id,x:0,y:180,zoom:null,animated:false}),s.clock());s.draw();});await page.waitForTimeout(300);
   }
   const data=await page.locator('#table-'+key+' canvas').first().evaluate(c=>c.toDataURL('image/png').split(',')[1]);
   writeFileSync(`${directory}/rust-${key}-${state}.png`,Buffer.from(data,'base64'));
   geometry.push(await page.evaluate(({key,state})=>{
    const s=window.tableViewScenes[key].snapshot;
    return {key,state,time:s.time,dpr:devicePixelRatio,table:window.tableViewControls[key].tableSnapshot,
     parts:s.nodes.filter(n=>['TableView','ScrollViewer','CheckBox','ToggleSwitch'].includes(n.kind)||n.props.accessibleName?.match(/^\d+,/)).map(({kind,rect,world,props})=>({kind,rect,world,name:props.accessibleName}))};
   },{key,state}));
  }
 }
 writeFileSync(`${directory}/rust-geometry.json`,JSON.stringify({wasmSha256,geometry,errors}));
 console.log(JSON.stringify({captures:geometry.length,errors}));
}finally{await browser.close();}
