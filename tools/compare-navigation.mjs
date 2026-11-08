import { createRequire } from 'node:module';
import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
const require=createRequire(new URL('../gallery/package.json',import.meta.url));const{PNG}=require('pngjs');
const native=JSON.parse(readFileSync(new URL('../out/navigation-native/metrics.json',import.meta.url),'utf8'));
const browser=JSON.parse(readFileSync(new URL('../out/navigation-browser/metrics.json',import.meta.url),'utf8'));
const comparisons=[];
for(const observed of browser){
  const expected=native.find(n=>n.name===observed.name);if(!expected)throw Error(`Missing native case ${observed.name}`);
  const a=PNG.sync.read(readFileSync(new URL(`../out/navigation-native/${observed.name}.png`,import.meta.url)));
  const b=PNG.sync.read(readFileSync(new URL(`../out/navigation-browser/${observed.name}.png`,import.meta.url)));
  if(a.width!==b.width||a.height!==b.height)throw Error('Capture dimensions differ');
  let sum=0,over8=0,max=0;const diff=new PNG({width:a.width,height:a.height});
  for(let i=0;i<a.data.length;i+=4){let pixel=0;for(let c=0;c<3;c++){const delta=Math.abs(a.data[i+c]-b.data[i+c]);sum+=delta;pixel=Math.max(pixel,delta);diff.data[i+c]=Math.min(255,delta*5);}max=Math.max(max,pixel);if(pixel>8)over8++;diff.data[i+3]=255;}
  writeFileSync(new URL(`../out/navigation-browser/${observed.name}-difference.png`,import.meta.url),PNG.sync.write(diff));
  const nativeContent=expected.parts.find(p=>p.name==='ContentGrid'&&p.bounds.height>100)?.bounds;
  const contentError=nativeContent?Math.max(...['x','y','width','height'].map(k=>Math.abs(nativeContent[k]-observed.content[k]))):null;
  const nativeItems=expected.parts.filter(p=>p.type==='NavigationViewItem'&&p.text?.startsWith('Menu Item'));
  const rows=nativeItems.flatMap(item=>{
    const actual=observed.parts.find(p=>p.text===item.text);if(!actual)return[];
    const root=expected.parts.slice(expected.parts.indexOf(item)+1).find(p=>p.name==='LayoutRoot');
    return root?[{item:item.text,errorDip:Math.max(...['x','y','width','height'].map(k=>Math.abs(root.bounds[k]-actual.rect[k])))}]:[];
  });
  comparisons.push({name:observed.name,width:a.width,height:a.height,meanAbsoluteChannelError:sum/(a.width*a.height*3),pixelsAbove8Percent:over8/(a.width*a.height)*100,maxChannelError:max,contentBoundsErrorDip:contentError,itemBounds:rows});
}
const result={date:'2026-11-07',sdk:'2.5.4-experimental / WinUI 2.3.10-experimental',conditions:{width:1000,height:500,dpr:1,theme:'per-case',font:'Segoe UI',staticAnimations:'settled',nativeCapture:'RenderTargetBitmap (WGC inspection tracked separately)'},comparisons,acceptedPixelParity:false};
mkdirSync(new URL('../references/validation/',import.meta.url),{recursive:true});writeFileSync(new URL('../references/validation/navigation-comparison.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(comparisons.map(c=>`${c.name}: geometry=${c.contentBoundsErrorDip} DIP, MAE=${c.meanAbsoluteChannelError.toFixed(3)}, pixels>8=${c.pixelsAbove8Percent.toFixed(2)}%, items=${c.itemBounds.map(b=>b.errorDip).join(',')}`).join('\n'));
