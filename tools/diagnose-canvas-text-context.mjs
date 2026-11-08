import {chromium} from '../gallery/node_modules/@playwright/test/index.mjs';
import {PNG} from '../gallery/node_modules/pngjs/lib/png.js';
import {readFileSync,writeFileSync} from 'node:fs';
const native=PNG.sync.read(readFileSync('out/overlay-controls-native/Light-Plain-MenuFlyout-Top.png'));
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage();
const rows=[];
try{
 await page.setContent('<body></body>');
 for(const alpha of [true,false])for(const willReadFrequently of [false,true])for(const smoothing of ['auto','antialiased','subpixel-antialiased'])for(const attached of [false,true]){
  const r=await page.evaluate(({alpha,willReadFrequently,smoothing,attached})=>{
   const canvas=document.createElement('canvas');canvas.width=100;canvas.height=50;canvas.style.webkitFontSmoothing=smoothing;if(attached)document.body.append(canvas);
   const ctx=canvas.getContext('2d',{alpha,willReadFrequently});ctx.fillStyle='#fbfbfb';ctx.fillRect(0,0,100,50);ctx.font='400 17.5px "Segoe UI"';ctx.fillStyle='rgba(0,0,0,0.8941176470588236)';ctx.fillText('Open',10,30);
   const pixels=[...ctx.getImageData(0,0,100,50).data];const supported=CSS.supports('-webkit-font-smoothing',smoothing);canvas.remove();return {pixels,supported};
  },{alpha,willReadFrequently,smoothing,attached});
  let error=0,count=0,colors=0;
  for(let y=10;y<40;y++)for(let x=5;x<60;x++){
   const at=(y*100+x)*4,ref=((y+200)*native.width+x+520)*4;
   if(r.pixels[at]<245||native.data[ref]<245){error+=Math.abs(r.pixels[at+1]-native.data[ref+1]);count++;}
   colors+=(Math.max(...r.pixels.slice(at,at+3))-Math.min(...r.pixels.slice(at,at+3)))>0;
  }
  rows.push({alpha,willReadFrequently,smoothing,attached,cssSupported:r.supported,inkMAE:error/count,coloredPixels:colors});
 }
 writeFileSync('references/validation/overlay-canvas-context-diagnostic.json',JSON.stringify({rows,browser:await browser.version(),boundary:'24 Canvas context/storage/smoothing candidates over the same native MenuFlyout text crop; diagnostic only.'},null,2)+'\n');console.log(rows);
}finally{await browser.close();}
