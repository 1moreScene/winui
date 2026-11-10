import {chromium} from '../gallery/node_modules/@playwright/test/index.mjs';
import {mkdirSync, writeFileSync,readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const phase = process.argv[2] ?? 'before';
const folder = resolve(`out/mit-migration-${phase}/controlled-gallery`);
mkdirSync(folder, {recursive:true});
const routes = ['button','expander','combo-box','number-box','content-dialog','info-bar','person-picture','split-button','list-view','grid-view','tab-view','tree-view','calendar-view','date-picker','time-picker','color-picker','items-view','pager-control','annotated-scroll-bar','rich-edit-box','split-view','semantic-zoom'].filter(route=>!process.argv[3]||route===process.argv[3]);
const browser = await chromium.launch({channel:'chrome'});
const rows = [];
try {
  for (const theme of ['Light','Dark']) {
    const context = await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,reducedMotion:'reduce',colorScheme:theme.toLowerCase()});
    // Run the SAME current Gallery and JS bridge against the preserved old
    // runtime, without replacing any files in the user's live workspace.
    const runtime=readFileSync(resolve(phase==='before' ? 'out/mit-migration-before/wasm/winui_bg.wasm' : 'packages/winui-wasm/src/wasm/winui_bg.wasm'));
    if(phase==='before')await context.route(/\.wasm(?:\?.*)?$/,route=>route.fulfill({body:runtime,contentType:'application/wasm'}));
    await context.addInitScript(theme=>localStorage.setItem('winui-gallery.theme',theme),theme);
    const page = await context.newPage();
    await page.clock.setFixedTime(new Date('2026-11-10T04:00:00Z'));
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    for (const route of routes) {
      await page.goto(`http://127.0.0.1:5440/#${route}`);
      await page.waitForFunction(()=>!!window.gallery?.sdk);
      await page.getByRole('button',{name:'Toggle theme',exact:true}).waitFor();
      await page.waitForLoadState('networkidle');
      await page.locator('.gallery-page-loading').waitFor({state:'hidden'});
      await page.waitForFunction(()=>document.querySelectorAll('main canvas').length>0);
      await page.evaluate(()=>document.fonts.ready);
      // Gallery realizes collection/tab content in later React commits. An
      // initial idle canvas may still precede that business-content mount.
      await page.waitForTimeout(1500);
      await page.waitForFunction(()=>[...window.gallery.sdk.controls].filter(scene=>{
        if(!scene.element?.isConnected || !scene.snapshot?.imageRequests)return false;
        const rect=scene.element.getBoundingClientRect();return rect.bottom>0&&rect.top<innerHeight;
      }).every(scene=>scene.snapshot.imageRequests.length===0));
      // Image.decode and font callbacks schedule a later Rust layout frame.
      // Require a stable painted frame, not just an idle network connection.
      let previous=await page.screenshot();let stable=false;
      for(let i=0;i<20;i++){
        await page.waitForTimeout(100);
        const current=await page.screenshot();
        if(current.equals(previous)){stable=true;break;}
        previous=current;
      }
      if(!stable)throw new Error(`Unstable painted page: ${theme}/${route}`);
      await page.screenshot({path:resolve(folder,`${theme}-${route}.png`)});
      rows.push({theme,route,wasmSha256:createHash('sha256').update(runtime).digest('hex'),runtimeSource:phase==='before'?'preserved pre-migration runtime':'MIT-generated runtime',freshRouteContext:!!process.argv[3],errors:[...errors]});
      if(errors.length)throw new Error(errors.join('\n'));
    }
    await context.close();
    console.log(`Captured ${theme}: ${routes.length} Gallery pages.`);
  }
  const file=resolve(folder,'capture.json');
  const retained=process.argv[3]&&existsSync(file)?JSON.parse(readFileSync(file,'utf8')).filter(old=>!rows.some(row=>old.theme===row.theme&&old.route===row.route)):[];
  writeFileSync(file,JSON.stringify([...retained,...rows],null,2)+'\n');
} finally {await browser.close();}
