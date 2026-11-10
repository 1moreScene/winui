import {selectGalleryOption,setGalleryChecked} from './gallery-control-helper';
import{test,expect}from'@playwright/test';
import{readFileSync,writeFileSync,mkdirSync}from'node:fs';
import{PNG}from'pngjs';
import type{Scene,WinUI,InfoBarController as InfoBar}from'winui-wasm';
declare global{interface Window{compactFixture:{sdk:WinUI;scene:Scene};}}
for(const backend of ['Canvas2D','WebGL2'] as const)test(`${backend} compact controls compare with actual SDK templates`,async({browser})=>{
 test.setTimeout(120000);const metrics=JSON.parse(readFileSync('../references/compact-controls-metrics.json','utf8'));const context=await browser.newContext({deviceScaleFactor:metrics.dpi,viewport:{width:1100,height:600}});const page=await context.newPage();await page.goto('/#info-bar');await expect(page.getByRole('heading',{name:'InfoBar',exact:true})).toBeVisible();const results:object[]=[];
 const details=JSON.parse(readFileSync('../out/compact-details-native/compact-controls-metrics.json','utf8'));
 for(const row of [...metrics.matrix.map((r:any)=>({...r,folder:'compact-controls-native'})),...details.matrix.map((r:any)=>({...r,folder:'compact-details-native'}))]){
  await page.evaluate(async({row,backend})=>{
   window.compactFixture?.sdk.dispose();document.getElementById('compact-fixture')?.remove();const a=await import('/@id/winui-wasm' as string) as typeof import('winui-wasm');const sdk=await a.WinUI.create({globalScrollbars:false});const host=document.createElement('div');host.id='compact-fixture';host.style.cssText='position:fixed;inset:0;width:1000px;height:500px;z-index:99999';host.style.background=row.theme==='Dark'?'#202020':'#f3f3f3';document.body.append(host);const scene=sdk.scene(host,{theme:row.theme,reducedMotion:true,backend:a.RendererBackend[backend]});const canvas=scene.root.canvas();const props={...row.props,canvasLeft:24,canvasTop:24};delete props.state;delete props.action;
   const node=scene.create(canvas,a.NodeKind[row.kind as keyof typeof a.NodeKind],props);if(row.props.action)(node as InfoBar).actionButton({text:'Action'});window.compactFixture={sdk,scene};
  },{row,backend});
  await expect.poll(()=>page.evaluate(kind=>window.compactFixture.scene.snapshot.nodes.filter(n=>n.kind===kind).length,row.kind)).toBe(1);
  const actualNode=await page.evaluate(kind=>window.compactFixture.scene.snapshot.nodes.find(n=>n.kind===kind)!,row.kind);
  if(row.props.state&&!['Normal','Disabled','CloseNormal','CloseDisabled'].includes(row.props.state)){
   const secondary=row.props.state.startsWith('Secondary');const close=row.props.state.startsWith('Close');const rect=close?await page.evaluate(()=>window.compactFixture.scene.snapshot.nodes.find(n=>n.kind==='Button'&&n.props.accessibleName==='Close')!.rect):actualNode.rect;const x=close?24+rect.x+rect.width/2:24+(secondary?rect.width-15:15),y=24+(close?rect.y:0)+rect.height/2;await page.mouse.move(x,y);if(row.props.state.endsWith('Pressed'))await page.mouse.down();
  }else await page.mouse.move(990,490);
  await page.waitForTimeout(35);
  await expect.poll(()=>page.evaluate(()=>window.compactFixture.scene.snapshot.imageRequests.length)).toBe(0);
  const actual=PNG.sync.read(await page.locator('#compact-fixture').screenshot());if(row.props.state?.endsWith('Pressed'))await page.mouse.up();const native=PNG.sync.read(readFileSync(`../out/${row.folder}/${row.theme}-${row.kind}-${row.index}.png`));const r=row.bounds,d=metrics.dpi;
  const geometry={width:actualNode.rect.width,height:actualNode.rect.height};let error=0,count=0;for(let y=Math.floor((r.y-5)*d);y<Math.ceil((r.y+r.height+5)*d);y++)for(let x=Math.floor((r.x-5)*d);x<Math.ceil((r.x+r.width+5)*d);x++)for(let c=0;c<3;c++){error+=Math.abs(actual.data[(y*actual.width+x)*4+c]-native.data[(y*native.width+x)*4+c]);count++;}
  const itemErrors:number[]=[];
  if(row.kind==='InfoBar'&&row.props.isClosable!==false){
   const close=row.parts.find((p:any)=>p.name==='CloseButton').bounds;let sum=0,n=0;for(let y=Math.floor(close.y*d);y<Math.ceil((close.y+close.height)*d);y++)for(let x=Math.floor(close.x*d);x<Math.ceil((close.x+close.width)*d);x++)for(let c=0;c<3;c++){sum+=Math.abs(actual.data[(y*actual.width+x)*4+c]-native.data[(y*native.width+x)*4+c]);n++;}itemErrors.push(sum/n);
  }
  if(row.kind==='RatingControl')for(let i=0;i<(row.props.maxRating??5);i++){
   let sum=0,n=0;for(let y=Math.floor((r.y+(r.height-16)/2)*d);y<Math.ceil((r.y+(r.height+16)/2)*d);y++)for(let x=Math.floor((r.x+i*24)*d);x<Math.ceil((r.x+i*24+16)*d);x++)for(let c=0;c<3;c++){sum+=Math.abs(actual.data[(y*actual.width+x)*4+c]-native.data[(y*native.width+x)*4+c]);n++;}itemErrors.push(sum/n);
  }
  const mean=error/count;results.push({theme:row.theme,kind:row.kind,index:row.index,folder:row.folder,geometry,native:r,mean,itemErrors});mkdirSync('../out/compact-controls-browser',{recursive:true});writeFileSync(`../out/compact-controls-browser/${row.folder}-${row.theme}-${row.kind}-${row.index}-${backend}.png`,PNG.sync.write(actual));
 }
 writeFileSync(`../references/validation/compact-controls-${backend}.json`,JSON.stringify({acceptedPixelParity:false,reference:metrics.reference,rows:results},null,2)+'\n');await context.close();
 const bad=(results as any[]).filter(r=>Math.abs(r.geometry.width-r.native.width)>1||Math.abs(r.geometry.height-r.native.height)>1||r.mean>12||r.itemErrors.some((v:number)=>v>12));expect(bad.slice(0,10)).toEqual([]);
});

test('InfoBar Gallery closes with cancellation, reopens and projects severity semantics',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#info-bar');
 const sample=page.locator('#info-severity'),close=sample.getByRole('button',{name:'Close',exact:true});await expect(close).toBeVisible();
 await setGalleryChecked(sample.getByRole('checkbox',{name:'Cancel close'}),true);await close.click();await expect(close).toBeVisible();
 await setGalleryChecked(sample.getByRole('checkbox',{name:'Cancel close'}),false);await close.click();await expect(close).toBeHidden();
 await setGalleryChecked(sample.getByRole('checkbox',{name:'Is Open',exact:true}),true);await expect(close).toBeVisible();
 await selectGalleryOption(sample.getByRole('combobox',{name:'Severity'}),'Error');await expect(sample.getByRole('alert')).toHaveAttribute('aria-live','assertive');
 await selectGalleryOption(page.getByRole('combobox',{name:'Action Button',exact:true}),'Button');await page.locator('#info-action').getByRole('button',{name:'Action',exact:true}).click();await expect(page.locator('#info-action output')).toHaveText('Action count: 1');
 await sample.locator("[aria-label=\"Source code\"][aria-expanded]").click();await expect(sample.locator('pre')).toContainText('<InfoBar title=');expect(await sample.locator('pre').innerText()).not.toContain('options={{');expect(errors).toEqual([]);
});

test('InfoBar close glyph is really painted at three DPRs on both backends',async({browser})=>{
 for(const dpr of [1,1.25,1.5])for(const backend of ['Canvas2D','WebGL2'] as const){
  const context=await browser.newContext({deviceScaleFactor:dpr,viewport:{width:1100,height:600}}),page=await context.newPage();await page.goto('/#info-bar');await expect(page.getByRole('heading',{name:'InfoBar',exact:true})).toBeVisible();
  await page.evaluate(async backend=>{const path='/@id/winui-wasm';const a=await import(/* @vite-ignore */path) as typeof import('winui-wasm');const sdk=await a.WinUI.create({globalScrollbars:false}),host=document.createElement('div');host.id='compact-fixture';host.style.cssText='position:fixed;inset:0;width:1000px;height:500px;z-index:99999';document.body.append(host);const scene=sdk.scene(host,{reducedMotion:true,backend:a.RendererBackend[backend]});scene.root.canvas().infoBar({isOpen:true,title:'Title',message:'Message',width:400,canvasLeft:24,canvasTop:24});window.compactFixture={sdk,scene};},backend);
  const close=page.locator('#compact-fixture').getByRole('button',{name:'Close',exact:true});await expect(close).toBeVisible();const box=(await close.boundingBox())!;expect(Math.abs(box.width-38)).toBeLessThan(1);
  const png=PNG.sync.read(await page.locator('#compact-fixture').screenshot());let ink=0;const x=(box.x+box.width/2)*dpr,y=(box.y+box.height/2)*dpr;for(let yy=Math.floor(y-8*dpr);yy<Math.ceil(y+8*dpr);yy++)for(let xx=Math.floor(x-8*dpr);xx<Math.ceil(x+8*dpr);xx++){const o=(yy*png.width+xx)*4;if(png.data[o]<140&&png.data[o+1]<140&&png.data[o+2]<140)ink++;}expect(ink,`${backend} DPR ${dpr} close glyph ink`).toBeGreaterThan(8);await context.close();
 }
});

test('PersonPicture uses decoded image, generated initials, group and capped badge',async({page})=>{
 await page.goto('/#person-picture');await expect(page.getByRole('img',{name:'Person',exact:true})).toBeVisible();
 await selectGalleryOption(page.getByRole('combobox',{name:'Profile type'}),'Display Name');await expect(page.getByRole('img',{name:'Jane Doe',exact:true})).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>window.compactScenes['person-picture'].snapshot.nodes.find(n=>n.kind==='PersonPicture')?.compact?.actualInitials)).toBe('JD');
 await page.getByRole('spinbutton',{name:'Badge number'}).fill('100');await page.getByRole('spinbutton',{name:'Badge number'}).press('Enter');await expect(page.getByRole('img',{name:/Jane Doe.*100/})).toBeVisible();
 await selectGalleryOption(page.getByRole('combobox',{name:'Profile type'}),'Group');await expect(page.getByRole('img',{name:/Group/})).toBeVisible();
});

for(const backend of ['Canvas2D','WebGL2'])test(`${backend} RatingControl Gallery pointer, keyboard, clear and readonly`,async({page})=>{
 await page.goto('/#rating-control');await selectGalleryOption(page.getByRole('combobox',{name:'Compact renderer'}),backend);const rating=page.getByRole('slider',{name:'Simple RatingControl',exact:true});await expect(rating).toBeVisible();
 await rating.focus();await page.keyboard.press('End');await expect(rating).toHaveAttribute('aria-valuenow','5');await page.keyboard.press('ArrowLeft');await expect(rating).toHaveAttribute('aria-valuenow','4');
 const b=(await rating.boundingBox())!;await page.mouse.click(b.x+56,b.y+b.height/2);await expect(rating).toHaveAttribute('aria-valuenow','3');
 await setGalleryChecked(page.getByRole('checkbox',{name:'IsClearEnabled',exact:true}),true);await page.mouse.click(b.x+56,b.y+b.height/2);await expect(rating).toHaveAttribute('aria-valuetext','Not rated');
 await setGalleryChecked(page.getByRole('checkbox',{name:'IsReadOnly',exact:true}),true);await rating.focus();await page.keyboard.press('End');await expect(rating).toHaveAttribute('aria-valuetext','Not rated');await expect(rating).toHaveAttribute('aria-readonly','true');
 expect(await rating.evaluate(e=>getComputedStyle(e).outlineStyle)).toBe('none');
});

test('SplitButton Gallery secondary opens a real Flyout and keyboard restores primary focus',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#split-button');const primary=page.getByRole('button',{name:'Font color',exact:true}),secondary=page.getByRole('button',{name:'Font color options',exact:true});
 await secondary.click();await expect(secondary).toHaveAttribute('aria-expanded','true');await page.getByRole('option',{name:'Red',exact:true}).click();await expect(secondary).toHaveAttribute('aria-expanded','false');
 await primary.focus();await page.keyboard.press('F4');await expect(secondary).toHaveAttribute('aria-expanded','true');await page.keyboard.press('Escape');await expect(secondary).toHaveAttribute('aria-expanded','false');
 await primary.focus();await page.keyboard.press('Space');await expect(secondary).toHaveAttribute('aria-expanded','false');expect(await primary.evaluate(e=>getComputedStyle(e).outlineStyle)).toBe('none');expect(errors).toEqual([]);
});

test('ToggleSplitButton uses the official ordinary Flyout and horizontal SymbolIcon buttons',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#toggle-split-button');const primary=page.getByRole('button',{name:'Bullets',exact:true}),secondary=page.getByRole('button',{name:'Bullets options',exact:true});
 await primary.click();await expect(primary).toHaveAttribute('aria-pressed','true');await expect(secondary).toHaveAttribute('aria-haspopup','dialog');await secondary.click();await expect(primary).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('button',{name:'Roman numerals list',exact:true})).toBeVisible();
 const dependency=await page.evaluate(()=>window.compactScenes['toggle-split'].snapshot.nodes.filter(n=>n.kind==='Flyout'||n.kind==='MenuFlyout').map(n=>({kind:n.kind,active:n.overlay?.isOpen})));expect(dependency).toEqual([{kind:'Flyout',active:true}]);
 await expect.poll(()=>page.evaluate(()=>{const overlay=window.compactScenes['toggle-split'].snapshot.nodes.find(n=>n.kind==='Flyout')?.overlay;return !!overlay&&overlay.opacity>=.999&&overlay.offset.every(value=>Math.abs(value)<.1);})).toBe(true);
 await page.getByRole('button',{name:'Roman numerals list',exact:true}).click();await expect(page.getByLabel('List selection')).toHaveText('Roman numerals list');await expect(secondary).toHaveAttribute('aria-expanded','false');
 await primary.focus();await page.keyboard.press('Space');await expect(primary).toHaveAttribute('aria-pressed','false');expect(errors).toEqual([]);
});

test('compact public SDK validates foreign Flyouts and releases nested handles on unmount',async({page})=>{
 await page.goto('/#split-button');await expect(page.getByRole('heading',{name:'SplitButton',exact:true})).toBeVisible();
 const result=await page.evaluate(async()=>{const path='/@id/winui-wasm';const a=await import(/* @vite-ignore */path) as typeof import('winui-wasm');const ui=await a.WinUI.create({globalScrollbars:false});const host=document.createElement('div'),otherHost=document.createElement('div');host.style.cssText='width:400px;height:300px';document.body.append(host,otherHost);const scene=ui.scene(host),other=ui.scene(otherHost);const split=scene.root.splitButton({text:'Owner'}),flyout=scene.root.flyout();flyout.button({text:'Content'});split.setFlyout(flyout);let rejected=false;try{split.setFlyout(other.root.flyout());}catch{rejected=true;}flyout.dispose();split.openFlyout();split.dispose();scene.dispose();other.dispose();ui.dispose();const detached=host.childElementCount===0;host.remove();otherHost.remove();return{rejected,detached};});expect(result).toEqual({rejected:true,detached:true});
 for(const [route,title] of [['info-bar','InfoBar'],['person-picture','PersonPicture'],['rating-control','RatingControl'],['split-button','SplitButton'],['toggle-split-button','ToggleSplitButton'],['button','Button']]){await page.goto('/#'+route);await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();}
});

test('SplitButton clips oversized color content, preserves chrome and left-aligns the shared Flyout',async({page})=>{
 await page.goto('/#split-button');await expect(page.getByRole('heading',{name:'SplitButton',exact:true})).toBeVisible();
 for(const backend of ['Canvas2D','WebGL2'] as const){
  await page.evaluate(async backend=>{window.compactFixture?.sdk.dispose();document.getElementById('compact-fixture')?.remove();const path='/@id/winui-wasm',a=await import(/* @vite-ignore */path) as typeof import('winui-wasm');const sdk=await a.WinUI.create({globalScrollbars:false}),host=document.createElement('div');host.id='compact-fixture';host.style.cssText='position:fixed;inset:0;width:900px;height:400px;z-index:99999';document.body.append(host);const scene=sdk.scene(host,{reducedMotion:true,backend:a.RendererBackend[backend]}),split=scene.root.canvas().splitButton({text:'',width:100,height:32,canvasLeft:180,canvasTop:80,padding:[0,0,0,0]});split.border({width:400,height:80,background:'#ff0000',cornerRadii:[4,0,0,4]});split.flyout({width:200}).text({text:'Content'});split.openFlyout();window.compactFixture={sdk,scene};},backend);
  await expect.poll(()=>page.evaluate(()=>window.compactFixture.scene.snapshot.nodes.find(n=>n.kind==='Flyout')?.overlay?.isOpen)).toBe(true);
  const state=await page.evaluate(()=>{const nodes=window.compactFixture.scene.snapshot.nodes;return{split:nodes.find(n=>n.kind==='SplitButton')!,flyout:nodes.find(n=>n.kind==='Flyout')!};});expect(Math.abs(state.flyout.rect.x-state.split.world[4])).toBeLessThan(1);
  const png=PNG.sync.read(await page.locator('#compact-fixture').screenshot());let red=0;const sx=state.split.world[4],sy=state.split.world[5],part=state.split.compact!.secondary;
  for(let y=sy+1;y<sy+31;y++)for(let x=Math.ceil(sx+part.x);x<sx+state.split.rect.width;x++){const o=(y*png.width+x)*4;if(png.data[o]>200&&png.data[o+1]<80&&png.data[o+2]<80)red++;}expect(red,backend+' color must not cover the arrow region').toBe(0);
  const center=((sy+16)*png.width+sx+20)*4,top=(sy*png.width+sx+20)*4;expect(Array.from(png.data.subarray(top,top+3))).not.toEqual(Array.from(png.data.subarray(center,center+3)));
 }
});
