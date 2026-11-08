import {chromium} from '../gallery/node_modules/playwright/index.mjs';
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import pngjs from '../gallery/node_modules/pngjs/lib/png.js';
const {PNG}=pngjs;
const base=process.env.WINUI_MENU_ITEMS_URL??'http://127.0.0.1:5351';
const artifact=new URL('../out/menu-item-tested-dist-v3/assets/',import.meta.url);
const wasm=readFileSync(new URL(readdirSync(artifact).find(name=>name.endsWith('.wasm')),artifact));
const expectedWasm=createHash('sha256').update(wasm).digest('hex');
const output=new URL('../out/menu-item-comparison/',import.meta.url);mkdirSync(output,{recursive:true});
const native=JSON.parse(readFileSync(new URL('../references/menu-item-native.json',import.meta.url),'utf8'));
const rows=[];let browser;
try{
 for(const backend of ['Canvas2D','WebGL2'])for(const ref of native.rows.filter(r=>r.state==='Normal'||r.state==='Narrow')){
  const {theme,kind,state}=ref;
  const caseName=`${backend}-${theme}-${kind}-${state}`;if(process.env.WINUI_MENU_ITEMS_CASE&&process.env.WINUI_MENU_ITEMS_CASE!==caseName)continue;
  console.log('Comparing '+caseName);browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:ref.dpr});
  page.on('pageerror',e=>console.log('PAGE ERROR '+caseName+': '+e.message));
  try{
   const loaded=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('.wasm'));
   await page.goto(base+'/#menu-items');
   const served=createHash('sha256').update(await(await loaded).body()).digest('hex');if(served!==expectedWasm)throw new Error('Comparison server does not serve the frozen artifact');await page.locator('#menu-item-command .basic-preview canvas').first().waitFor();
   await page.evaluate(async({backend,theme,kind})=>{
    const ui=window.gallery.sdk;const host=document.createElement('div');host.style.cssText=`position:fixed;left:0;top:0;width:800px;height:600px;z-index:100000;background:${theme==='Dark'?'#202020':'#fafafa'};`;document.body.append(host);
    const scene=ui.scene(host,{theme,backend,reducedMotion:true}),menu=scene.root.menuFlyout({placementPosition:[20,20],...(kind==='Rtl'?{flowDirection:'RightToLeft'}:{}),...(kind==='LongText'?{width:260}:{} )});
    if(kind==='MenuItems'){
     menu.menuFlyoutItem({text:'Open'});menu.toggleMenuFlyoutItem({text:'Toolbar',isChecked:true});menu.radioMenuFlyoutItem({text:'Portrait',groupName:'orientation',isChecked:true});menu.radioMenuFlyoutItem({text:'Landscape',groupName:'orientation'});menu.menuFlyoutSubItem({text:'Share'}).menuFlyoutItem({text:'Email'});menu.menuFlyoutSeparator();menu.menuFlyoutItem({text:'Unavailable',enabled:false});
    }else{
     menu.menuFlyoutItem({text:kind==='LongText'?'A long document label which must not overlap its accelerator':'Open',icon:'\uE8E5',keyboardAccelerators:[{key:'o',modifiers:['Control']}]});
     menu.toggleMenuFlyoutItem({text:'Toolbar',isChecked:true,icon:'\uE74E',keyboardAccelerators:[{key:'s',modifiers:['Control','Shift']}]});
     menu.radioMenuFlyoutItem({text:'Portrait',groupName:'extra-'+kind,isChecked:true});menu.menuFlyoutSubItem({text:'Share'}).menuFlyoutItem({text:'Email'});menu.menuFlyoutSeparator();menu.menuFlyoutItem({text:'Unavailable',enabled:false});
    }
    window.__menuComparison={ui,scene,menu};await new Promise(r=>setTimeout(r,30));
   },{backend,theme,kind});
   if(state==='Narrow')await page.mouse.move(10,10);
   const result=await page.evaluate(async()=>{
    const {scene,menu}=window.__menuComparison;menu.show();await new Promise(r=>setTimeout(r,100));const n=menu.snapshot;return{rect:n.rect,desired:n.desired,rows:n.overlay.rows,parts:n.overlay.menuParts,clip:{x:n.world[4],y:n.world[5],width:n.rect.width,height:n.rect.height}};
   });
   const items=ref.parts.filter(p=>['MenuFlyoutItem','ToggleMenuFlyoutItem','RadioMenuFlyoutItem','MenuFlyoutSubItem','MenuFlyoutSeparator'].includes(p.type));
   const rowErrors=result.rows.flatMap((r,i)=>[r.x-items[i].rect[0],r.y-items[i].rect[1],r.width-items[i].rect[2],r.height-items[i].rect[3]].map(Math.abs));
   const geometryError=Math.max(...rowErrors,Math.abs(result.rect.width-ref.rect[0]),Math.abs(result.rect.height-ref.rect[1]));
   // Quantize the capture rectangle in device pixels, keeping the final edge.
   const clip={...result.clip,width:Math.round(result.clip.width*ref.dpr)/ref.dpr+1e-6,height:Math.round(result.clip.height*ref.dpr)/ref.dpr+1e-6};
   const name=kind==='MenuItems'?`${backend}-${theme}`:`${backend}-${theme}-${kind}-${state}`;
   const frame=PNG.sync.read(await page.screenshot());
   const left=Math.round(clip.x*ref.dpr),top=Math.round(clip.y*ref.dpr),width=Math.round(result.clip.width*ref.dpr),height=Math.round(result.clip.height*ref.dpr);
   const crop=new PNG({width,height});
   for(let y=0;y<height;y++)frame.data.copy(crop.data,y*width*4,((top+y)*frame.width+left)*4,((top+y)*frame.width+left+width)*4);
   writeFileSync(new URL(name+'.png',output),PNG.sync.write(crop));
   const nativeLabels=ref.parts.filter(p=>p.type==='TextBlock'&&p.name==='TextBlock');
   const browserLabels=result.parts.filter((p,i)=>items[i].type!=='MenuFlyoutSeparator');
   const labelPositions=browserLabels.map((p,i)=>({text:nativeLabels[i].text,native:nativeLabels[i].rect,browser:p.label,errorX:Math.abs(p.label.x-nativeLabels[i].rect[0]),errorY:Math.abs(p.label.y-nativeLabels[i].rect[1])}));
   rows.push({backend,theme,kind,state,dpr:ref.dpr,nativePanel:ref.rect,panel:result.rect,rowCount:result.rows.length,maxGeometryErrorDip:geometryError,accepted:geometryError<=0.81,labelPositions,detail:result});
  }finally{await page.close();await browser.close();}
 }
}finally{await browser?.close();}
writeFileSync(new URL('../references/menu-item-comparison.json',import.meta.url),JSON.stringify({scope:'Rust-owned menu item controls, default/narrow density, icons, captions, long labels and RTL compared with same-SDK template geometry.',wasmSha256:createHash('sha256').update(wasm).digest('hex'),rows},null,2)+'\n');
console.log(JSON.stringify(rows.map(({backend,theme,kind,state,maxGeometryErrorDip,accepted})=>({backend,theme,kind,state,maxGeometryErrorDip,accepted})),null,2));
if(rows.some(r=>!r.accepted))process.exitCode=1;
