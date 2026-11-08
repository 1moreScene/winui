import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';

for(const theme of ['Light','Dark'])for(const backend of ['Canvas2D','WebGL2'])test(`${theme} ${backend} populated NumberBox refocus and real ComboBox hover selection`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/#number-box');await page.getByRole('spinbutton',{name:'Quantity',exact:true}).waitFor();
  await page.evaluate(async({theme,backend})=>{
    const {WinUI}=await import('/src/index.ts' as string),w=window as any;
    document.querySelector('#app')?.setAttribute('style','display:none');
    const host=document.createElement('div');host.id='choice-fixture';host.style.cssText='position:fixed;inset:0;width:1000px;height:500px';document.body.append(host);
    w.choiceSdk=await WinUI.create({globalScrollbars:false});
    w.resetChoice=()=>{w.choiceScene?.dispose();w.choiceScene=w.choiceSdk.scene(host,{theme,backend});w.choiceScene.root.update({background:theme==='Dark'?'#202020':'#f3f3f3'});return w.choiceScene.root.canvas();};
    const root=w.resetChoice();w.choiceControl=root.numberBox({width:240,value:42,accessibleName:'Reentry',spinButtonPlacementMode:'Inline',canvasLeft:24,canvasTop:24});root.button({text:'Outside',canvasLeft:450,canvasTop:400});
  },{theme,backend});
  const number=page.getByRole('spinbutton',{name:'Reentry',exact:true}),clear=page.getByRole('button',{name:'Clear text',exact:true}),outside=page.getByRole('button',{name:'Outside',exact:true});
  await number.focus();await expect(clear).toBeVisible();
  const pendingSelection=await number.evaluate(async(element)=>{
    const area=element as HTMLInputElement,block=(event:Event)=>event.stopImmediatePropagation();
    document.addEventListener('selectionchange',block,true);area.addEventListener('select',block,true);
    try{area.setSelectionRange(0,area.value.length);(window as any).choiceScene.configure({});await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));return {start:area.selectionStart,end:area.selectionEnd};}
    finally{document.removeEventListener('selectionchange',block,true);area.removeEventListener('select',block,true);area.dispatchEvent(new Event('select'));}
  });
  expect(pendingSelection).toEqual({start:0,end:2});
  await number.fill('17');await number.press('Enter');await outside.click();await expect(clear).toBeHidden();await number.focus();await expect(clear).toBeVisible();
  await outside.click();await page.evaluate(()=>(window as any).choiceControl.update({value:27}));await number.focus();await expect(number).toHaveValue('27');await expect(clear).toBeVisible();await clear.click();await expect(number).toHaveValue('');await expect(clear).toBeHidden();
  const output=join(process.env.WINUI_COMPOSED_REPO!,'out',process.env.WINUI_COMPOSED_EVIDENCE??'composed-choice',backend);mkdirSync(output,{recursive:true});
  for(const editable of [false,true]){
    await page.evaluate(editable=>{const w=window as any;w.choiceControl=w.resetChoice().comboBox({width:240,items:['Blue','Green','Red','Yellow'],selectedIndex:2,isEditable:editable,canvasLeft:24,canvasTop:140});},editable);
    await page.getByRole('button',{name:'Open drop-down',exact:true}).click();
    const label=`${theme}-${editable?'Editable':'ReadOnly'}`;
    await expect(page.getByRole('option',{name:'Blue',exact:true})).toBeVisible();await page.waitForTimeout(800);
    await page.mouse.move(450,400);
    const capture=async(state:string)=>{await page.screenshot({path:join(output,`choice-${label}-${state}.png`),clip:{x:0,y:0,width:1000,height:500}});};
    await capture('Open');await page.getByRole('option',{name:'Blue',exact:true}).hover();await capture('Hover');await page.getByRole('option',{name:'Red',exact:true}).hover();await capture('SelectedHover');
    await page.getByRole('option',{name:'Blue',exact:true}).click();
    await expect.poll(()=>page.evaluate(()=>{const w=window as any,s=w.choiceScene.snapshot,n=s.nodes.find((n:any)=>n.id===w.choiceControl.snapshot.id),p=s.nodes.find((p:any)=>p.id===n.composed.parts.Popup);return {index:n.props.selectedIndex,open:p.overlay.isOpen,opacity:p.overlay.opacity,visible:s.floatingSurface.visible};})).toEqual({index:0,open:false,opacity:0,visible:false});
    await capture('Closed');
  }
  writeFileSync(join(output,`${theme}-interaction.json`),JSON.stringify({theme,backend,errors}));expect(errors).toEqual([]);
  await page.evaluate(()=>{const w=window as any;w.choiceScene.dispose();w.choiceSdk.dispose();document.querySelector('#choice-fixture')?.remove();});
});
