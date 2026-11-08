import { chromium } from '../gallery/node_modules/playwright/index.mjs';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
const {PNG}=createRequire(import.meta.url)('../gallery/node_modules/pngjs');
const root=new URL('../out/antialias/',import.meta.url);
mkdirSync(root,{recursive:true});
const label=process.argv[2]??'current';
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[];
try {
 for(const dpr of [1,1.25,1.5,2]) {
  const context=await browser.newContext({deviceScaleFactor:dpr,viewport:{width:1200,height:800}});
  const page=await context.newPage();await page.goto('http://127.0.0.1:5173/');
  await page.locator('#runtime-status').filter({hasText:'Ready'}).waitFor();
  const sample=await page.evaluate(async(fractional)=>{
   const a=await import('/src/index.ts');
   const host=document.createElement('div');host.id='aa-fixture';
   host.style.cssText='position:fixed;left:0;top:0;width:419.375px;height:131.625px;z-index:99999';document.body.append(host);
   const scene=window.gallery.sdk.scene(host,{reducedMotion:true});
   const items=[];
   for(const phase of [0,.25,.5,.75]) {
    const x=24+items.length*64+phase,y=16.625;
    const control=scene.root.radioButton({isChecked:true,groupName:String(phase),translationX:fractional ? phase : 0,margin:[x,y,0,0],horizontalAlignment:a.HorizontalAlignment.Left,verticalAlignment:a.VerticalAlignment.Top});
    items.push({x,y,id:control});
   }
   const toggle=scene.root.toggleSwitch({isOn:true,margin:[24.375,70.625,0,0],translationX:fractional ? 0.375 : 0,verticalAlignment:a.VerticalAlignment.Top});
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   for(const item of items) {const world=item.id.snapshot.world;item.x=world[4];item.y=world[5];}
   const canvas=host.querySelector('canvas');const bounds=canvas.getBoundingClientRect();
   // Candidate experiment: supersample only vectors, leaving text at display DPR.
   const candidate=document.createElement('canvas');candidate.width=canvas.width;candidate.height=canvas.height;
   const target=candidate.getContext('2d');target.fillStyle='#f3f3f3';target.fillRect(0,0,candidate.width,candidate.height);
   const scale=devicePixelRatio;
   for(const {x,y} of items) {
    const left=Math.floor(x*scale)-1,top=Math.floor(y*scale)-1;
    const w=Math.ceil((x+20)*scale)-left+1,h=Math.ceil((y+32)*scale)-top+1;
    const raster=document.createElement('canvas');raster.width=w*4;raster.height=h*4;
    const ctx=raster.getContext('2d');ctx.setTransform(scale*4,0,0,scale*4,-left*4,-top*4);
    ctx.fillStyle='#0067c0';ctx.strokeStyle='#0067c0';ctx.lineWidth=1;
    ctx.beginPath();ctx.roundRect(x+.5,y+6.5,19,19,9.5);ctx.fill();ctx.stroke();
    target.imageSmoothingEnabled=true;target.imageSmoothingQuality='high';target.drawImage(raster,left,top,w,h);
   }
   const actual=canvas.toDataURL();
   const toggleWorld=toggle.snapshot.world;
   const textBlock=scene.root.text({text:'Native DPR text',margin:[280,80,0,0]});
   for(let i=0;i<16;i++){items[0].id.update({translationX:Math.sin(i)*.4});await new Promise(resolve=>requestAnimationFrame(resolve));}
   const performance=scene.diagnostics;
   return {performance,surfaceWidth:host.getBoundingClientRect().width,surfaceHeight:host.getBoundingClientRect().height,toggle:{x:toggleWorld[4],y:toggleWorld[5]},width:bounds.width,height:bounds.height,backingWidth:canvas.width,backingHeight:canvas.height,dpr:scale,
    items:items.map(({x,y})=>({x,y})),actual,candidate:candidate.toDataURL()};
  },process.argv.includes('--fractional-transform'));
  const rows=[];
  for(const kind of ['actual','candidate']) {
   const png=Buffer.from(sample[kind].split(',')[1],'base64');
   writeFileSync(new URL(`${label}-${dpr}-${kind}.png`,root),png);
   const image=PNG.sync.read(png);let errors=[];
   for(const {x,y} of sample.items) {
    const cx=(x+10)*dpr,cy=(y+16)*dpr,r=10*dpr;
    for(let py=Math.floor(cy-r);py<Math.ceil(cy+r);py++)for(let px=Math.floor(cx-r);px<Math.ceil(cx+r);px++) {
     if(Math.abs(Math.hypot(px+.5-cx,py+.5-cy)-r)>1)continue;
     let covered=0;const n=32;
     for(let sy=0;sy<n;sy++)for(let sx=0;sx<n;sx++)covered+=((px+(sx+.5)/n-cx)**2+(py+(sy+.5)/n-cy)**2<=r*r);
     const expected=covered/(n*n);if(expected<=0||expected>=1)continue;
     const actual=(243-image.data[(py*image.width+px)*4])/243;
     errors.push(actual-expected);
    }
   }
   rows.push({kind,edgePixels:errors.length,meanAbsoluteCoverageError:errors.reduce((a,e)=>a+Math.abs(e),0)/errors.length,maxAbsoluteCoverageError:Math.max(...errors.map(Math.abs))});
  }
  const image=PNG.sync.read(Buffer.from(sample.actual.split(',')[1],'base64'));
  const cx=(sample.toggle.x+29.5)*dpr,cy=(sample.toggle.y+20)*dpr,r=6*dpr;
  const errors=[];
  for(let py=Math.floor(cy-r);py<Math.ceil(cy+r);py++)for(let px=Math.floor(cx-r);px<Math.ceil(cx+r);px++){
   if(Math.abs(Math.hypot(px+.5-cx,py+.5-cy)-r)>1)continue;
   let covered=0;const n=32;
   for(let sy=0;sy<n;sy++)for(let sx=0;sx<n;sx++)covered+=((px+(sx+.5)/n-cx)**2+(py+(sy+.5)/n-cy)**2<=r*r);
   const expected=covered/(n*n);if(expected<=0||expected>=1)continue;
   errors.push(image.data[(py*image.width+px)*4]/255-expected);
  }
  const thumb={edgePixels:errors.length,meanAbsoluteCoverageError:errors.reduce((a,e)=>a+Math.abs(e),0)/errors.length,maxAbsoluteCoverageError:Math.max(...errors.map(Math.abs))};
  const {actual,candidate,...metrics}=sample;results.push({...metrics,measurements:rows,thumb});await context.close();
 }
} finally {await browser.close();}
writeFileSync(new URL(`${label}.json`,root),JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results.map(({dpr,width,backingWidth,measurements})=>({dpr,width,backingWidth,measurements})),null,2));

if(label!=='before') {
 for(const row of results) {
  if(row.backingWidth!==Math.ceil(row.surfaceWidth*row.dpr)||row.backingHeight!==Math.ceil(row.surfaceHeight*row.dpr))throw Error('Fractional surface dimensions were lost');
  if(Math.abs(row.width*row.dpr-row.backingWidth)>.001||Math.abs(row.height*row.dpr-row.backingHeight)>.001)throw Error('Backing raster is being stretched by CSS');
  for(const measurement of [row.measurements[0],row.thumb])if(measurement.edgePixels===0||measurement.meanAbsoluteCoverageError>.03||measurement.maxAbsoluteCoverageError>.10)throw Error(`Vector edge coverage exceeds budget at DPR ${row.dpr}: ${JSON.stringify(measurement)}`);
 }
}
