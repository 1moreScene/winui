import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const require=createRequire(new URL('../gallery/package.json',import.meta.url));
const {chromium}=require('@playwright/test');
const url=process.env.WINUI_COLLECTION_TEST_URL??'http://127.0.0.1:5194';
const label=process.env.SCROLL_PROFILE_LABEL??'before';
const browser=await chromium.launch({channel:process.env.PW_CHANNEL??'msedge'});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.goto(url+'/#list-view');await page.getByRole('listbox',{name:'Contacts',exact:true}).waitFor();
 const wasmSha256=await page.evaluate(async()=>(await import('/src/index.ts')).WinUI.buildVersion);
 const cdp=await page.context().newCDPSession(page);await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:500});await cdp.send('Profiler.start');
 const results=await page.evaluate(async()=>{
  const a=await import('/src/index.ts');const sdk=await a.WinUI.create({globalScrollbars:false});
  const results=[];
  for(const mode of ['plain','template','grouped','large']){
   const host=document.createElement('div');host.style.cssText='position:fixed;inset:0;width:400px;height:300px;z-index:99999';document.body.append(host);
   const scene=sdk.scene(host);const count=mode==='large'?100000:200;
   const items=Array.from({length:count},(_,i)=>({id:String(i),text:`Item ${i}`}));
   const list=scene.root.listView({width:360,height:280,...(mode==='grouped'?{groups:Array.from({length:10},(_,i)=>({id:String(i),header:`Group ${i}`,items:items.slice(i*20,i*20+20)}))}:{items})});
   if(mode==='template')list.setItemTemplate((item,slot)=>slot.text({text:item.text}));
   await new Promise(r=>setTimeout(r,200));
   const samples={frame:[],project:[],present:[],wheel:[],raf:[]};const restore=[];
   for(const [object,name,key] of [[scene.raw,'scene_frame','frame'],[scene.raw,'scene_wheel','wheel'],[scene,'project','project'],[scene.viewport,'present','present']]){
    const fn=object[name];object[name]=function(...args){const start=performance.now();try{return fn.apply(this,args);}finally{samples[key].push(performance.now()-start);}};restore.push(()=>object[name]=fn);
   }
   let last=performance.now();const started=last;
   const positions=[];
   await new Promise(resolve=>{const tick=()=>{const now=performance.now();samples.raf.push(now-last);last=now;const snap=scene.state.nodes.find(n=>n.kind===a.NodeKind.ListView);positions.push(snap.scroll?.verticalOffset??0);scene.canvas.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,clientX:80,clientY:100,deltaY:12}));if(now-started<1400)requestAnimationFrame(tick);else resolve();};requestAnimationFrame(tick);});
   for(const undo of restore)undo();const summary=Object.fromEntries(Object.entries(samples).map(([k,v])=>{v.sort((a,b)=>a-b);return[k,{count:v.length,p50:v[Math.floor(v.length*.5)]??0,p95:v[Math.floor(v.length*.95)]??0,max:v.at(-1)??0,total:v.reduce((a,b)=>a+b,0)}];}));
   results.push({mode,count,summary,nodes:scene.snapshot.nodes.length,positions});scene.dispose();host.remove();
  }
  sdk.dispose();return results;
 });
 const {profile}=await cdp.send('Profiler.stop');mkdirSync('out',{recursive:true});writeFileSync(`out/collection-scroll-${label}.cpuprofile`,JSON.stringify(profile));writeFileSync(`out/collection-scroll-${label}.json`,JSON.stringify({url,wasmSha256,channel:process.env.PW_CHANNEL??'msedge',samplingIntervalUs:500,results},null,2));
 console.log(JSON.stringify(results.map(({positions,...r})=>r),null,2));
}finally{await browser.close();}
