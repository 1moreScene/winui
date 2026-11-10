import {chromium} from '../gallery/node_modules/@playwright/test/index.mjs';
import {spawn} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const desktop=process.argv[2]??'C:/Users/weixiaoxiao/Desktop/react-template';
const browser=await chromium.launch({channel:'chrome'});
const servers=[],rows=[];
async function start(cwd,args,port){
  const child=spawn(process.execPath,['node_modules/vite/bin/vite.js',...args,'--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd,windowsHide:true,stdio:'ignore'});
  servers.push(child);
  for(let i=0;i<80;i++){
    if(child.exitCode!==null)throw Error(`Server ${port} exited`);
    try{if((await fetch(`http://127.0.0.1:${port}/`)).ok)return;}catch{}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw Error(`Server ${port} failed`);
}
async function verify(url,kind,mode){
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  const errors=[],messages=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>messages.push(message.text()));
  try{
    await page.goto(url);
    if(kind==='desktop'){
      await page.getByRole('heading',{name:'Get started',exact:true}).waitFor();
      await page.getByRole('button',{name:'Count is 0',exact:true}).click();
      await page.getByRole('button',{name:'Count is 1',exact:true}).waitFor();
      await page.getByRole('button',{name:'Open menu',exact:true}).click();
      const invoked=page.waitForEvent('console',{predicate:message=>message.text().includes('已触发 Open 菜单项')});
      await page.getByRole('menuitem',{name:'Open',exact:true}).click();
      await invoked;
      await page.getByRole('button',{name:'Attach Camera',exact:true}).waitFor();
      await page.getByRole('button',{name:'Like',exact:true}).click();
      await page.getByRole('combobox').click();
      await page.getByRole('option',{name:'2',exact:true}).click();
    }else{
      await page.getByRole('heading',{name:'Expander',exact:true}).waitFor();
      await page.getByRole('button',{name:'This text is in the header',exact:true}).first().click();
    }
    const fonts=await page.evaluate(()=>[...document.fonts].filter(face=>face.status==='loaded').map(face=>face.family.replaceAll('"','')));
    if(!fonts.includes('WinUI Native Fluent Icons'))throw Error(`Native Fluent not selected: ${fonts}`);
    if(!fonts.includes('WinUI Portable Icons'))throw Error('Missing portable fallback');
    if(fonts.includes('Segoe Fluent Icons')||fonts.includes('Segoe MDL2 Assets'))throw Error('Native font names were overridden');
    if(errors.length)throw Error(errors.join('\n'));
    await page.screenshot({path:`${root}/out/icon-font-policy-${kind}-${mode}.png`});
    rows.push({kind,mode,url,fonts,pageErrors:errors,interactions:'passed'});
    console.log(`${kind}/${mode}: native fonts and real interactions passed.`);
  }catch(error){
    await page.screenshot({path:`${root}/out/icon-font-policy-${kind}-${mode}-failure.png`});
    throw Error(`${kind}/${mode}: ${error.message}\nPage errors: ${errors.join('\n')}`);
  }finally{await page.close();}
}
try{
  await start(desktop,['preview'],5451);
  await start(`${root}/gallery`,[],5464);
  await start(`${root}/gallery`,['preview'],5465);
  await verify('http://127.0.0.1:5174/','desktop','development');
  await verify('http://127.0.0.1:5451/','desktop','production');
  await verify('http://127.0.0.1:5464/#expander','gallery','development');
  await verify('http://127.0.0.1:5465/#expander','gallery','production');
  writeFileSync(`${root}/out/icon-font-policy-applications.json`,JSON.stringify(rows,null,2)+'\n');
}finally{servers.forEach(server=>server.kill());await browser.close();}
