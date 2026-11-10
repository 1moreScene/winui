import {chromium,expect as baseExpect} from '../gallery/node_modules/@playwright/test/index.mjs';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const expect=baseExpect.configure({timeout:15000});
const base=process.env.WINUI_MOTION_VERIFY_URL??'http://127.0.0.1:5211';
const out=(process.env.WINUI_MOTION_VERIFY_OUTPUT??fileURLToPath(new URL('../out/motion-production/',import.meta.url))).replace(/[\\/]?$/,'/');mkdirSync(out,{recursive:true});
const stamp=JSON.parse(readFileSync(new URL('../packages/winui-wasm/src/wasm/build-stamp.json',import.meta.url),'utf8'));
const browser=await chromium.launch({channel:process.env.PW_CHANNEL??'chrome'});
const evidence={base,wasmSha256:stamp.sha256,cases:[],assets:[],pageErrors:[]};
const requests=[];
try{
 for(const theme of ['Light','Dark','HighContrast']){
  const context=await browser.newContext({viewport:{width:1536,height:1000},deviceScaleFactor:theme==='Light'?1:1.25});
  await context.addInitScript(theme=>localStorage.setItem('winui-gallery.theme',theme),theme);
  for(const [route,count] of [['xaml-comp-interop',5],['connected-animation',4]]){
   const page=await context.newPage();page.on('pageerror',e=>evidence.pageErrors.push(e.message));
   page.on('response',response=>{if(response.headers()['content-type']?.startsWith('application/wasm'))requests.push((async()=>{const sha256=createHash('sha256').update(await response.body()).digest('hex');expect(sha256).toBe(stamp.sha256);evidence.assets.push({url:response.url(),sha256});})());});
   await page.goto(base+'/#'+route);await expect(page.locator('.basic-example')).toHaveCount(count);
   await expect.poll(()=>page.evaluate(()=>Object.values(window.motionScenes??{}).filter(s=>!s.isDisposed).length)).toBe(count);
   await expect(page.getByRole('combobox',{name:'Renderer',exact:true})).toHaveCount(0);
   const layout=await page.evaluate(()=>[...document.querySelectorAll('.basic-live')].map(x=>({width:x.clientWidth,height:x.clientHeight,optionsWidth:x.querySelector('.options')?.getBoundingClientRect().width??0})));
   evidence.cases.push({theme,route,layout});
   await page.screenshot({path:out+theme+'-'+route+'.png',fullPage:true});
   if(route==='connected-animation'){
    const list=page.locator('#connected-animation-0');await list.getByRole('option',{name:'Item 2',exact:true}).click();
    await expect(list.getByRole('button',{name:'Go Back',exact:true})).toBeFocused();
    const fonts=await page.evaluate(()=>window.motionScenes['connected-0'].snapshot.nodes.filter(n=>n.kind==='TextBlock').map(n=>({text:n.props.text,size:n.props.fontSize,weight:n.props.fontWeight})));
    expect(fonts.some(n=>n.text==='Item 2'&&n.size===34&&n.weight===300)).toBe(true);
    expect(fonts.some(n=>n.text==='374'&&n.size===20&&n.weight===600)).toBe(true);
    const outline=await list.getByRole('button',{name:'Go Back',exact:true}).evaluate(n=>getComputedStyle(n).outlineStyle);expect(outline).toBe('none');
    await list.locator('.basic-preview').screenshot({path:out+theme+'-detail.png'});
    await list.getByRole('button',{name:'Go Back',exact:true}).click();
    const cards=page.locator('#connected-animation-1');await cards.getByRole('option',{name:'Item 3',exact:true}).click();await expect(cards.getByRole('button',{name:'Close',exact:true})).toBeVisible();
    await expect.poll(()=>page.evaluate(()=>window.motionScenes['connected-1'].snapshot.nodes.some(n=>n.kind==='TextBlock'&&n.props.maxLines===3&&n.text.lines.length===3))).toBe(true);
    await cards.locator('.basic-preview').screenshot({path:out+theme+'-card.png'});
    await cards.getByRole('button',{name:'Close',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.motionScenes['connected-1'].snapshot.nodes.find(n=>n.kind==='GridView')?.props.isHitTestVisible)).toBe(true);
   }else{
    const period=page.locator('#composition-spring').getByRole('slider',{name:'Period (in ms)',exact:true});await period.focus();await page.keyboard.press('End');await expect(period).toHaveAttribute('aria-valuenow','200');
   }
   await page.close();
  }
  await context.close();
 }
 await Promise.all(requests);expect(evidence.assets.length).toBeGreaterThan(0);expect(evidence.pageErrors).toEqual([]);
 writeFileSync(out+'results.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify({cases:evidence.cases.length,assets:evidence.assets.length,pageErrors:evidence.pageErrors.length,sha256:stamp.sha256}));
}finally{await browser.close();}
