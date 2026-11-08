import {chromium} from '../gallery/node_modules/@playwright/test/index.mjs';
import {PNG} from '../gallery/node_modules/pngjs/lib/png.js';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const native=JSON.parse(readFileSync('out/overlay-controls-native/popup-corner-materials.json','utf8'));const browser=await chromium.launch({channel:'chrome'});const page=await browser.newPage({viewport:{width:1200,height:700},deviceScaleFactor:1.25});const errors=[];page.on('pageerror',e=>errors.push(e.message));const rows=[];mkdirSync('out/popup-corner-materials',{recursive:true});
try{
 await page.goto((process.env.OVERLAY_URL??'http://127.0.0.1:5185')+'/#popup');
 for(const backend of ['Canvas2D','WebGL2'])for(const row of native){
  await page.evaluate(async({backend,row})=>{window.cornerUI?.dispose();document.querySelector('#corner-fixture')?.remove();const a=await import('/src/index.ts');const host=document.createElement('div');host.id='corner-fixture';host.style.cssText='position:fixed;left:0;top:0;width:1000px;height:500px;z-index:2147483640';document.body.append(host);const ui=await a.WinUI.create({globalScrollbars:false,clock:()=>1000});window.cornerUI=ui;const scene=ui.scene(host,{theme:a.ThemeMode[row.theme],backend:a.RendererBackend[backend],reducedMotion:true,reducedTransparency:row.fallback});window.cornerScene=scene;const c=scene.root.canvas();const p=c.popup({isOpen:true,horizontalOffset:40,verticalOffset:40,autoFocus:false});window.cornerBorder=p.border({width:200,height:120,cornerRadii:row.radii,borderThickness:row.stroke,borderBrush:{resource:'FlyoutBorderThemeBrush'},acrylicResource:'FlyoutPresenterBackground'});},{backend,row});
  await page.waitForFunction(()=>window.cornerScene.snapshot.nodes.length===4);
  const bounds=await page.evaluate(()=>{const n=window.cornerBorder.snapshot;return{x:n.world[4],y:n.world[5],width:n.rect.width,height:n.rect.height};});
  const a=PNG.sync.read(await page.locator('#corner-fixture canvas').screenshot({path:`out/popup-corner-materials/${backend}-${row.name}.png`})),b=PNG.sync.read(readFileSync(`out/overlay-controls-native/${row.name}.png`));const r=row.bounds,d=row.dpi,bg=row.theme==='Dark'?32:243;
  const rgb=(p,x,y)=>{const at=(Math.floor(y*d)*p.width+Math.floor(x*d))*4;return [...p.data.subarray(at,at+3)];};
  const probes=[[.25,.25],[r.width-.25,.25],[r.width-.25,r.height-.25],[.25,r.height-.25]];
  if(row.name.includes('LargeTopLeft'))probes.push([.25,65]);
  const points=probes.map(([x,y],i)=>({local:[x,y],native:rgb(b,r.x+x,r.y+y),browser:rgb(a,r.x+x,r.y+y),mustBeBackground:i===4||row.radii[i]>0}));
  let err=0,mat=0,count=0,mc=0;for(let y=Math.floor((r.y-2)*d);y<Math.ceil((r.y+r.height+2)*d);y++)for(let x=Math.floor((r.x-2)*d);x<Math.ceil((r.x+r.width+2)*d);x++)for(let k=0;k<3;k++){const at=(y*a.width+x)*4+k;err+=Math.abs(a.data[at]-b.data[at]);count++;if(x>(r.x+80)*d&&x<(r.x+120)*d&&y>(r.y+45)*d&&y<(r.y+70)*d){mat+=Math.abs(a.data[at]-b.data[at]);mc++;}}
  rows.push({backend,name:row.name,theme:row.theme,fallback:row.fallback,radii:row.radii,stroke:row.stroke,native:r,browser:bounds,geometryError:Math.max(...['x','y','width','height'].map(k=>Math.abs(r[k]-bounds[k]))),mean:err/count,materialMAE:mat/mc,points,cornerBackgroundError:Math.max(...points.filter(p=>p.mustBeBackground).flatMap(p=>p.browser.map(v=>Math.abs(v-bg)))),nativeCornerBackgroundError:Math.max(...points.filter(p=>p.mustBeBackground).flatMap(p=>p.native.map(v=>Math.abs(v-bg))))});
 }
 writeFileSync('references/validation/popup-corner-materials.json',JSON.stringify({rows,errors,boundary:'Real Popup containing Border with asymmetric/large/zero/normalized corners and asymmetric border thickness. Same SDK own foreground client; both browser renderers, light/dark, Acrylic/fallback. Whole-region RGB diagnostics retain border AA and sampling residuals.'},null,2)+'\n');
 console.log(rows.map(({backend,name,mean,materialMAE,cornerBackgroundError,nativeCornerBackgroundError})=>({backend,name,mean,materialMAE,cornerBackgroundError,nativeCornerBackgroundError})));
 if(errors.length||rows.some(r=>r.geometryError>.81||r.cornerBackgroundError>1||r.nativeCornerBackgroundError>1))throw Error('Popup corner/material geometry mismatch');
}finally{await browser.close();}
