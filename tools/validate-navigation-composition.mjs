import {chromium} from '../gallery/node_modules/playwright/index.mjs';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const base=process.env.NAVIGATION_COMPOSITION_URL??'http://127.0.0.1:5410';
const native=JSON.parse(readFileSync('references/navigation-composition-native.json','utf8'));
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={baseline:native.provenance,nativeDefaults:native.nativeDefaults,geometry:[],interactions:[],errors:[],wasmSha256:JSON.parse(readFileSync('out/navigation-composition-dev/src/wasm/build-stamp.json','utf8')).sha256};
mkdirSync('out/navigation-composition-browser',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1000,height:700},deviceScaleFactor:1.25});
 page.on('pageerror',e=>report.errors.push(e.message.slice(0,600)));
 await page.goto(base+'/composition.html');await page.waitForFunction(()=>!!window.composition?.view);
 for(const row of native.rows){
  const [mode]=row.state.split('-'),slots=row.state.includes('slots'),open=row.state.includes('-open-')?true:undefined;
  await page.evaluate(options=>window.composition.make(options),{mode,slots,open,theme:row.theme,...(row.state.includes('-null-header-')?{header:null}:row.state.includes('-empty-header-')?{header:''}:{})});
  await page.waitForTimeout(80);
  const actual=await page.evaluate(()=>{
   const {scene,view}=window.composition,state=scene.snapshot;
   const result=Object.fromEntries(state.nodes.filter(n=>n.templatePart&&n.navigationOwner!=null).map(n=>[n.templatePart,{rect:[n.world[4],n.world[5],n.rect.width,n.rect.height],visible:n.visible}]));
   for(const [name,slot]of[['SearchBox','AutoSuggestBox'],['CustomContent','PaneCustomContent'],['CustomFooter','PaneFooter']]){
    const host=state.nodes.find(n=>n.templatePart===`Slot:${slot}`),node=host&&state.nodes.find(n=>n.id===host.children[0]);
    if(node)result[name]={rect:[node.world[4],node.world[5],node.rect.width,node.rect.height],visible:node.visible};
   }
   return{parts:result,pane:view.snapshot.isPaneOpen,mode:view.snapshot.displayMode};
  });
  const differences=[];
  for(const [name,expected]of Object.entries(row.parts)){
   const found=actual.parts[name];
   if(!expected.visible||expected.rect[2]<=0||expected.rect[3]<=0)continue;
   assert(found?.visible,`${row.theme}/${row.state}/${name} must be a visible real source part`);
   const delta=found.rect.map((v,i)=>v-expected.rect[i]);
   differences.push({name,expected:expected.rect,actual:found.rect,maxPhysicalError:Math.max(...delta.map(Math.abs))*row.dpr});
  }
  assert(differences.length>=3,`${row.state} must compare actual visible native containers`);
  report.geometry.push({theme:row.theme,state:row.state,dpr:row.dpr,mode:actual.mode,paneOpen:actual.pane,differences});
  if(row.theme==='Light'&&['Left-slots','Top-slots','LeftCompact-slots'].includes(row.state))await page.screenshot({path:`out/navigation-composition-browser/${row.state}.png`});
 }
 // Public scene Frame/Page journal, cancellation, retained editor and native event order.
 await page.evaluate(()=>{
  const {frame,SDK}=window.composition;window.composition.events=[];
  frame.update({pages:[{key:'first',cacheMode:SDK.NavigationCacheMode.Required,content:{kind:SDK.NodeKind.TextBox,name:'editor',properties:{text:'initial',accessibleName:'Page editor'}}},{key:'second',content:{kind:SDK.NodeKind.TextBlock,properties:{text:'Second'}}}]});
  frame.onNavigating(e=>{window.composition.events.push(`Navigating:${e.frameNavigation.mode}`);if(e.frameNavigation.to.parameter===99)e.cancel=true;});
  frame.onNavigated(e=>window.composition.events.push(`Navigated:${e.frameNavigation.mode}`));frame.navigate('first',{transition:SDK.NavigationTransition.Suppress});
 });
 await page.waitForFunction(()=>window.composition.frame.navigation.frame.current?.page==='first');
 const firstInstance=await page.evaluate(()=>window.composition.frame.navigation.frame.currentInstance);
 await page.evaluate(()=>window.composition.frame.findName('editor').focus());
 await page.getByRole('textbox',{name:'Page editor',exact:true}).fill('retained editor');
 await page.evaluate(()=>window.composition.frame.navigate('second'));await page.waitForFunction(()=>window.composition.frame.navigation.frame.current?.page==='second');
 await page.evaluate(()=>window.composition.frame.goBack());await page.waitForFunction(()=>window.composition.frame.navigation.frame.current?.page==='first');
 const restored=await page.evaluate(()=>({instance:window.composition.frame.navigation.frame.currentInstance,text:window.composition.frame.findName('editor').properties.text,events:window.composition.events}));
 assert.equal(restored.instance,firstInstance);assert.equal(restored.text,'retained editor');assert.deepEqual(restored.events,native.events);
 await page.evaluate(()=>window.composition.frame.navigate('second',{parameter:99}));await page.waitForTimeout(100);
 assert.equal(await page.evaluate(()=>window.composition.frame.navigation.frame.current.page),'first');
 report.interactions.push({name:'Frame/Page New/New/Back, cancellation, retained editor',passed:true,events:restored.events});
 // Search control state survives moving the same slot between source presenters.
 await page.evaluate(()=>window.composition.make({mode:'Left',slots:true}));
 await page.getByRole('combobox',{name:'Search',exact:true}).fill('persist search');
 const searchId=await page.evaluate(()=>{const state=window.composition.scene.snapshot;const slot=state.nodes.find(n=>n.templatePart==='Slot:AutoSuggestBox');return slot.children[0];});
 await page.evaluate(()=>window.composition.view.update({paneDisplayMode:window.composition.SDK.PaneDisplayMode.Top}));await page.waitForTimeout(100);
 const searchState=await page.evaluate(()=>{const state=window.composition.scene.snapshot;const slot=state.nodes.find(n=>n.templatePart==='Slot:AutoSuggestBox');return{id:slot.children[0],text:window.composition.search.properties.text};});
 assert.equal(searchState.id,searchId);assert.equal(searchState.text,'persist search');report.interactions.push({name:'AutoSuggestBox real editor and stable Left/Top slot',passed:true});
 // Both renderers and fractional DPR execute the same Rust source tree.
 for(const dpr of [1,1.25,2])for(const backend of ['Canvas2D','WebGL2'])for(const theme of ['Light','Dark','HighContrast']){
  const p=await browser.newPage({viewport:{width:1000,height:700},deviceScaleFactor:dpr});p.on('pageerror',e=>report.errors.push(e.message.slice(0,500)));
  await p.goto(base+'/composition.html');await p.waitForFunction(()=>!!window.composition?.view);
  await p.evaluate(({backend,theme})=>window.composition.make({mode:'LeftCompact',slots:true,backend,theme}),{backend,theme});
  await p.evaluate(()=>window.composition.view.invoke('$search'));await p.waitForTimeout(120);
  const state=await p.evaluate(()=>({focused:window.composition.scene.snapshot.nodes.find(n=>n.focused)?.kind,pane:window.composition.view.snapshot.isPaneOpen,backend:window.composition.scene.snapshot.backend.kind,outline:getComputedStyle(document.querySelector('.winui-editor')).outlineStyle}));
  assert.equal(state.focused,'TextBox');assert.equal(state.pane,true);assert.equal(state.backend,backend);assert.equal(state.outline,'none');
  report.interactions.push({name:'Compact search focus',dpr,backend,theme,passed:true});await p.close();
 }
 await page.goto(base+'/#navigation-view');await page.waitForFunction(()=>window.gallery?.sampleFrames?.filter(Boolean).length===8);
 await page.waitForFunction(()=>window.gallery.sampleFrames.slice(0,7).every(f=>f.navigation.frame.current?.page==='SamplePage1'));
 const initial=await page.evaluate(()=>window.gallery.sampleFrames.map(f=>({page:f.navigation.frame.current?.page??null,pageNodes:f.scene.snapshot.nodes.filter(n=>n.kind==='Page').length})));
 assert.deepEqual(initial.map(x=>x.page),[...Array(7).fill('SamplePage1'),null]);assert(initial.slice(0,7).every(x=>x.pageNodes>0));
 for(let index=0;index<8;index++){
  await page.evaluate(index=>window.gallery.views[index].invoke('page2'),index);
  const destination=index===4?'SamplePage1':'SamplePage2';
  await page.waitForFunction(({index,destination})=>window.gallery.sampleFrames[index].navigation.frame.current?.page===destination,{index,destination});
  await page.waitForTimeout(80);assert.equal(await page.evaluate(index=>window.gallery.views[index].snapshot.selectedId,index),'page2');
 }
 report.interactions.push({name:'Eight Gallery examples navigate with real public Frame/Page',passed:true,initial});
 const api=page.locator('#example-7');
 await api.getByRole('checkbox',{name:'PaneCustomContent visible',exact:true}).click();
 await api.getByRole('checkbox',{name:'PaneFooter visible',exact:true}).click();
 await page.waitForFunction(()=>{const state=window.gallery.views[7].scene.snapshot;return ['PaneCustomContent','PaneFooter'].every(slot=>{const host=state.nodes.find(n=>n.templatePart===`Slot:${slot}`);return state.nodes.find(n=>n.id===host.children[0]).visible;});});
 await api.getByRole('checkbox',{name:'Selection of Menu Item2 suppressed',exact:true}).click();
 await page.evaluate(()=>window.gallery.views[7].invoke('page1'));await page.waitForFunction(()=>window.gallery.sampleFrames[7].navigation.frame.current?.page==='SamplePage1');
 await page.evaluate(()=>window.gallery.views[7].invoke('page2'));await page.waitForTimeout(150);
 assert.equal(await page.evaluate(()=>window.gallery.views[7].snapshot.selectedId),'page1');
 assert.equal(await page.evaluate(()=>window.gallery.sampleFrames[7].navigation.frame.current.page),'SamplePage1');
 await api.getByRole('textbox',{name:'Header property',exact:true}).fill('');
 await page.waitForFunction(()=>window.gallery.views[7].properties.header==='');
 const header=await page.evaluate(()=>window.gallery.views[7].scene.snapshot.nodes.find(n=>n.templatePart==='HeaderContent'));
 assert.equal(header.visible,true);assert.equal(header.rect.height,36);
 report.interactions.push({name:'API in action real checkboxes, custom slots, selection suppression',passed:true});
 report.galleryDiagnostics=await page.evaluate(()=>window.gallery.views.map(v=>v.diagnostics));
 await api.screenshot({path:'out/navigation-composition-browser/api-in-action.png'});

 assert.deepEqual(report.errors,[]);
}finally{
 await browser.close();
 writeFileSync('out/navigation-composition-browser/results.json',JSON.stringify(report,null,2)+'\n');
}
const worst=report.geometry.flatMap(row=>row.differences.map(d=>({theme:row.theme,state:row.state,...d}))).sort((a,b)=>b.maxPhysicalError-a.maxPhysicalError);
console.log(JSON.stringify({matrix:report.geometry.length,interactions:report.interactions.length,errors:report.errors,worst:worst.slice(0,12)},null,2));
if(process.argv.includes('--strict'))assert(worst.every(d=>d.maxPhysicalError<=1.05),'Native container geometry must stay within one physical pixel; inspect results.json');
