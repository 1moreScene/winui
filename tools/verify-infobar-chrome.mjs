import {readFileSync,writeFileSync} from 'node:fs';
import {PNG} from '../gallery/node_modules/pngjs/lib/png.js';
const metrics=JSON.parse(readFileSync('out/compact-details-native/compact-controls-metrics.json','utf8')),d=metrics.dpi,rows=[];
const pixel=(p,x,y)=>Array.from(p.data.subarray((Math.floor(y)*p.width+Math.floor(x))*4,(Math.floor(y)*p.width+Math.floor(x))*4+3));
const delta=(a,b)=>Math.max(...a.map((v,i)=>Math.abs(v-b[i])));
for(const backend of ['Canvas2D','WebGL2'])for(const theme of ['Light','Dark']){
 const load=(index,browser)=>PNG.sync.read(readFileSync(browser?`out/compact-controls-browser/compact-details-native-${theme}-InfoBar-${index}-${backend}.png`:`out/compact-details-native/${theme}-InfoBar-${index}.png`));
 const baseN=load(0,false),baseA=load(0,true);
 for(const index of [0,1,2]){
  const row=metrics.matrix.find(r=>r.theme===theme&&r.kind==='InfoBar'&&r.index===index),close=row.parts.find(p=>p.name==='CloseButton').bounds,glyph=row.parts.find(p=>p.type==='Viewbox'&&p.bounds.width>0).bounds;
  const n=load(index,false),a=load(index,true),bgN=pixel(n,(close.x+4)*d,(close.y+4)*d),bgA=pixel(a,(close.x+4)*d,(close.y+4)*d);
  let nativeInk=0,actualInk=0,nativeMask=0,actualMask=0,mismatch=0;
  for(let y=Math.floor(glyph.y*d);y<Math.ceil((glyph.y+glyph.height)*d);y++)for(let x=Math.floor(glyph.x*d);x<Math.ceil((glyph.x+glyph.width)*d);x++){
   nativeInk+=Number(delta(pixel(n,x,y),bgN)>60);actualInk+=Number(delta(pixel(a,x,y),bgA)>60);
  }
  if(index>0)for(let y=Math.floor((close.y-3)*d);y<Math.ceil((close.y+close.height+3)*d);y++)for(let x=Math.floor((close.x-3)*d);x<Math.ceil((close.x+close.width+3)*d);x++){
   // Exclude the pre-existing glyph, compare the background mask itself.
   if(delta(pixel(baseN,x,y),pixel(baseN,(close.x+4)*d,(close.y+4)*d))>2||delta(pixel(baseA,x,y),pixel(baseA,(close.x+4)*d,(close.y+4)*d))>2)continue;
   const nv=delta(pixel(n,x,y),pixel(baseN,x,y))>2,av=delta(pixel(a,x,y),pixel(baseA,x,y))>2;
   nativeMask+=Number(nv);actualMask+=Number(av);mismatch+=Number(nv!==av);
  }
  rows.push({backend,theme,state:row.props.state,nativeInk,actualInk,inkRatio:actualInk/nativeInk,nativeMask,actualMask,maskMismatchRatio:index?mismatch/Math.max(nativeMask,1):0});
 }
}
writeFileSync('references/validation/infobar-close-chrome.json',JSON.stringify({dpi:d,acceptedFullParity:false,rows},null,2)+'\n');
console.log(rows);
if(rows.some(r=>r.nativeInk<8||r.actualInk<8||r.inkRatio<.6||r.inkRatio>1.4||r.maskMismatchRatio>.2))throw Error('InfoBar close glyph or isolated background mask regression');
