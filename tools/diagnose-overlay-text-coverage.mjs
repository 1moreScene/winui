import {chromium} from '../gallery/node_modules/@playwright/test/index.mjs';
import {PNG} from '../gallery/node_modules/pngjs/lib/png.js';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const native=PNG.sync.read(readFileSync('out/overlay-controls-native/Light-Plain-MenuFlyout-Top.png'));
mkdirSync('out/overlay-text-coverage',{recursive:true});
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage();
const rows=[];let best=Infinity;
try {
  await page.setContent('<canvas width="100" height="50"></canvas>');
  for(const size of [17,17.5,18])for(const textRendering of ['auto','optimizeSpeed','optimizeLegibility','geometricPrecision'])for(const x of [-.5,-.25,0,.25,.5])for(const y of [-.5,0,.5])for(const glyphPosition of ['run','round','floor','quarter']){
    const pixels=await page.evaluate(({size,textRendering,x,y,glyphPosition})=>{
      const c=document.querySelector('canvas'),ctx=c.getContext('2d');c.width=100;
      ctx.fillStyle='#fbfbfb';ctx.fillRect(0,0,100,50);ctx.font=`400 ${size}px "Segoe UI"`;ctx.textRendering=textRendering;ctx.fillStyle='rgba(0,0,0,0.8941176470588236)';if(glyphPosition==='run')ctx.fillText('Open',10+x,30+y);else {let prefix='';for(const ch of 'Open'){const advance=ctx.measureText(prefix).width;const snap=glyphPosition==='round'?Math.round(10+x+advance):glyphPosition==='floor'?Math.floor(10+x+advance):Math.round((10+x+advance)*4)/4;ctx.fillText(ch,snap,30+y);prefix+=ch;}}
      return [...ctx.getImageData(0,0,100,50).data];
    },{size,textRendering,x,y,glyphPosition});
    let sum=0,count=0,ink=0,inkCount=0;
    for(let yy=10;yy<40;yy++)for(let xx=5;xx<60;xx++){
      const a=(yy*100+xx)*4,b=((200+yy)*native.width+520+xx)*4;
      const d=Math.abs(pixels[a]-native.data[b]);sum+=d;count++;
      if(pixels[a]<245||native.data[b]<245){ink+=d;inkCount++;}
    }
    const row={size,textRendering,x,y,glyphPosition,mean:sum/count,ink:ink/inkCount};rows.push(row);
    if(row.ink<best){best=row.ink;const png=new PNG({width:100,height:50});png.data=Buffer.from(pixels);writeFileSync('out/overlay-text-coverage/best.png',PNG.sync.write(png));}
  }
  rows.sort((a,b)=>a.ink-b.ink);
  writeFileSync('references/validation/overlay-text-coverage-diagnostic.json',JSON.stringify({rows,boundary:'Diagnostic candidate rasterization only; no production parameter fitting. Native foreground-client actual MenuFlyout, opaque panel, grayscale glyphs.'},null,2)+'\n');
  console.log(rows.slice(0,12));
} finally {await browser.close();}
