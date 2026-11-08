import {test,expect} from '@playwright/test';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
const repo=process.env.WINUI_COMPOSED_REPO!;
const reference=JSON.parse(readFileSync(join(repo,'out/faceplate-native/combo-faceplate.json'),'utf8'));
for(const backend of ['Canvas2D','WebGL2'])test(`${backend} closed ComboBox common and keyboard focus states`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#combo-box');await page.getByRole('combobox',{name:'Colors',exact:true}).waitFor();
 await page.evaluate(async()=>{const {WinUI}=await import('/src/index.ts' as string),w=window as any;w.faceSdk=await WinUI.create({globalScrollbars:false});document.querySelector('#app')?.setAttribute('style','display:none');const h=document.createElement('div');h.id='faceplate';h.style.cssText='position:fixed;inset:0;width:1000px;height:500px';document.body.append(h);});
 const output=join(repo,'out',process.env.WINUI_COMPOSED_EVIDENCE?process.env.WINUI_COMPOSED_EVIDENCE+'/faceplate':'combo-faceplate',backend);mkdirSync(output,{recursive:true});const rows=[];
 for(const row of reference.rows){
  await page.evaluate(({row,backend})=>{const w=window as any;w.faceScene?.dispose();w.faceScene=w.faceSdk.scene(document.querySelector('#faceplate'),{theme:row.theme,backend});w.faceScene.root.update({background:row.theme==='Dark'?'#202020':'#f3f3f3'});w.faceControl=w.faceScene.root.canvas().comboBox({width:240,items:['Blue','Green','Red','Yellow'],selectedIndex:1,isEditable:row.editable,enabled:row.state!=='Disabled',canvasLeft:24,canvasTop:24});if(row.state.startsWith('Keyboard'))w.faceControl.focus();},{row,backend});
  await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));
  if(row.state.includes('Hover')){
   const part=row.state.endsWith('Arrow')?'DropDownButton':'InputBox';
   const point=await page.evaluate(part=>{const w=window as any,s=w.faceScene.snapshot,n=s.nodes.find((n:any)=>n.id===w.faceControl.snapshot.id),p=s.nodes.find((p:any)=>p.id===n.composed.parts[part]);return{x:p.world[4]+p.rect.width/2,y:p.world[5]+p.rect.height/2};},part);await page.mouse.move(point.x,point.y);
  }else await page.mouse.move(600,400);
  await page.waitForTimeout(180);const actual=await page.evaluate(()=>{const w=window as any,s=w.faceScene.snapshot,n=s.nodes.find((n:any)=>n.id===w.faceControl.snapshot.id);return{owner:n.rect,focused:s.focused,parts:Object.fromEntries(Object.entries(n.composed.parts).map(([k,id])=>[k,s.nodes.find((n:any)=>n.id===id)])),scope:s.backgroundScrollRoot};});
  expect(actual.scope).toBeNull();await page.screenshot({path:join(output,row.name+'.png'),clip:{x:0,y:0,width:1000,height:500}});rows.push({native:row,actual});
 }
 writeFileSync(join(output,'metrics.json'),JSON.stringify({backend,rows,errors}));expect(errors).toEqual([]);
 await page.evaluate(()=>{const w=window as any;w.faceScene.dispose();w.faceSdk.dispose();document.querySelector('#faceplate')?.remove();});
});
