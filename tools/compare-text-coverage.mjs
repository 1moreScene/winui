import {chromium} from '../gallery/node_modules/@playwright/test/index.mjs';
import {PNG} from '../gallery/node_modules/pngjs/lib/png.js';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const label=process.argv[2]??'current';
const native=JSON.parse(readFileSync('out/overlay-text-native/text-coverage-native.json','utf8'));
const browser=await chromium.launch({channel:'chrome'}),context=await browser.newContext({viewport:{width:1100,height:600},deviceScaleFactor:native.rows[0].dpi}),page=await context.newPage();
const rows=[],errors=[];page.on('pageerror',error=>errors.push(error.message));mkdirSync('out/overlay-text-coverage',{recursive:true});
let wasm;
try {
 await page.goto((process.env.OVERLAY_URL??'http://127.0.0.1:5185')+'/#overlays');
 for(const backend of ['Canvas2D','WebGL2'])for(const scene of native.rows){
  if(Math.abs(scene.captureScale-scene.dpi)>.001||scene.win32Dpi!==scene.dpi*96)throw Error('Invalid native DPI evidence');
  const actual=await page.evaluate(async({scene,backend})=>{
   const a=await import('/src/index.ts');window.coverageUI?.dispose();document.querySelector('#coverage-fixture')?.remove();const host=document.createElement('div');host.id='coverage-fixture';host.style.cssText='position:fixed;inset:0;width:1000px;height:500px;z-index:999999';document.body.append(host);
   const ui=await a.WinUI.create({globalScrollbars:false,clock:()=>1000});window.coverageUI=ui;
   const surface=ui.scene(host,{backend:a.RendererBackend[backend],theme:a.ThemeMode[scene.theme],reducedMotion:true});const c=surface.root.canvas({background:scene.theme==='Light'?'#fbfbfb':'#2c2c2c'});
   const texts=scene.entries.map(e=>c.text({text:'Open',fontFamily:e.family,fontSize:e.fontSize,trimming:a.TextTrimming[e.trimming],foreground:scene.theme==='Light'?'#000000e4':'#ffffff',canvasLeft:e.bounds.x,canvasTop:e.bounds.y}));
   await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
   return {wasm:a.WinUI.buildVersion,nodes:texts.map(t=>t.snapshot)};
  },{scene,backend});
  wasm=actual.wasm;
  const png=PNG.sync.read(await page.locator('#coverage-fixture canvas').screenshot({path:`out/overlay-text-coverage/${label}-${backend}-${scene.name}.png`}));
  const ref=PNG.sync.read(readFileSync(`out/overlay-text-native/${scene.name}.png`));
  for(let i=0;i<scene.entries.length;i++){
   const e=scene.entries[i],node=actual.nodes[i],r=e.bounds,dpi=scene.dpi,bg=scene.theme==='Light'?251:44;let sum=0,count=0,ink=0,ic=0,different=0;
   const w=Math.max(r.width,node.desired[0]),h=Math.max(r.height,node.desired[1]);
   for(let y=Math.max(0,Math.floor(r.y*dpi)-3);y<Math.min(png.height,Math.ceil((r.y+h)*dpi)+3);y++)for(let x=Math.max(0,Math.floor(r.x*dpi)-3);x<Math.min(png.width,Math.ceil((r.x+w)*dpi)+3);x++){
    const at=(y*png.width+x)*4,d=Math.abs(png.data[at]-ref.data[at]);sum+=d;count++;different+=d!==0;
    if(Math.abs(png.data[at]-bg)>1||Math.abs(ref.data[at]-bg)>1){ink+=d;ic++;}
   }
   rows.push({backend,theme:scene.theme,family:e.family,fontSize:e.fontSize,trimming:e.trimming,mean:sum/count,inkMAE:ink/Math.max(1,ic),different,baselineError:node.text.lines[0].baseline-e.baseline,widthError:node.desired[0]-e.desired[0],heightError:node.desired[1]-e.desired[1]});
  }
 }
 writeFileSync(`references/validation/overlay-text-coverage-${label}.json`,JSON.stringify({wasm,rows,errors,native:'out/overlay-text-native/text-coverage-native.json',boundary:'Foreground-client actual TextBlock pixels, 3 fonts x 7 sizes x None/Clip x 2 themes x 2 browser backends. Symbol-font None/Latin cases retain an unresolved mismatch: native missing glyphs versus browser font fallback; no glyph coverage threshold is relaxed.'},null,2)+'\n');
 console.log({cases:rows.length,maximumInkMAE:Math.max(...rows.map(r=>r.inkMAE)),ordinaryMean:rows.filter(r=>r.family!=='Segoe Fluent Icons').reduce((s,r)=>s+r.inkMAE,0)/rows.filter(r=>r.family!=='Segoe Fluent Icons').length,errors});
}finally{await browser.close();}
if(errors.length)throw Error(errors.join('\n'));
