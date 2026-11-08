import {chromium} from '../gallery/node_modules/playwright/index.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.argv[2]??'http://127.0.0.1:5296',label=base.includes('5173')?'live':'frozen';
const browser=await chromium.launch({channel:process.env.PW_CHANNEL??'chrome'}),rows=[];
try{
for(const dpr of [1.25]){
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:dpr});
 await page.goto(base+'/#combo-box');
 const box=page.getByRole('combobox',{name:'Font',exact:true});await box.waitFor();await box.scrollIntoViewIfNeeded();
 await box.click();
for(const delay of [50,250,1000]){await page.waitForTimeout(delay);const initial=await page.evaluate(()=>{const s=window.composedScenes.ComboBoxFonts.snapshot;return {nodes:s.nodes.filter(n=>['ComboBox','ListView','CollectionItem','Flyout'].includes(n.kind)).map(n=>({id:n.id,kind:n.kind,rect:n.rect,scroll:n.scroll,text:n.props.text,collection:n.collection}))};});rows.push({dpr,name:'INITIAL',delay,...initial});}
await page.getByRole('option',{name:'Segoe UI',exact:true}).hover();await page.waitForTimeout(500);await page.screenshot({path:`out/combo-overflow-${label}-initial.png`});await box.press('Escape');
for(const name of ['Comic Sans MS','Segoe UI','Times New Roman','Arial']){
  await box.click();await page.getByRole('option',{name,exact:true}).click();await box.click();
  for(const delay of [0,250,1000]){await page.waitForTimeout(delay);rows.push(await page.evaluate(({dpr,name,delay})=>{const s=window.composedScenes.ComboBoxFonts.snapshot;return{dpr,name,delay,scene:{width:s.width,height:s.height},nodes:s.nodes.filter(n=>['ComboBox','ListView','CollectionItem','Flyout'].includes(n.kind)).map(n=>({id:n.id,kind:n.kind,role:n.composedRole,rect:n.rect,scroll:n.scroll,text:n.props.text,desired:n.desired,collection:n.collection}))};},{dpr,name,delay}));}
  await page.mouse.move(900,100);await page.screenshot({path:`out/combo-overflow-${label}-${dpr}-${name.replaceAll(' ','')}.png`});await box.press('Escape');
 }
 await page.close();
}
}finally{await browser.close();}
mkdirSync('out',{recursive:true});writeFileSync(`out/combo-overflow-${label}-reproduction.json`,JSON.stringify(rows,null,2));
console.log(JSON.stringify(rows.map(r=>({dpr:r.dpr,name:r.name,delay:r.delay,list:r.nodes.find(n=>n.kind==='ListView')})).map(r=>({...r,list:{rect:r.list.rect,extent:r.list.scroll.extentHeight,viewport:r.list.scroll.viewportHeight,max:r.list.scroll.scrollableHeight,thumb:r.list.scroll.verticalThumb}})),null,2));
