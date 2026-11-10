import {test,expect} from '@playwright/test';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {PNG} from 'pngjs';
import {createHash} from 'node:crypto';
for(const [route,count]of [['split-view',1],['semantic-zoom',1],['parallax-view',2],['ui-command',1],['standard-command',1]] as const){
 test(`${route}: public React API, live examples and matching source`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#'+route);await expect(page.locator('.basic-example')).toHaveCount(count);await expect.poll(()=>page.evaluate(()=>Object.keys(window.viewCommandScenes??{}).length)).toBe(count);
  const official=JSON.parse(readFileSync('src/official-view-command.json','utf8')),kind={'split-view':'SplitView','semantic-zoom':'SemanticZoom','parallax-view':'ParallaxView','ui-command':'XamlUICommand','standard-command':'StandardUICommand'}[route];
  for(let index=0;index<count;index++){const sample=page.locator('.basic-example').nth(index);await sample.getByRole('button',{name:'Source code',exact:true}).click();await expect(sample.locator('pre')).toBeVisible();expect(await sample.locator('pre').textContent()).not.toContain('options={{');await sample.getByRole('button',{name:'Official XAML',exact:true}).click();await expect(sample.locator('pre')).toHaveAttribute('data-source-status','formatted');expect((await sample.locator('pre').textContent())!.replace(/\s+/g,'')).toBe(official.controls[kind].samples[index].runtimeXaml.replace(/\s+/g,''));}expect(errors).toEqual([]);
 });
}
test('XamlUICommand Gallery label, description, Favorite, Ctrl+D and output',async({page})=>{
 await page.goto('/#ui-command');const sample=page.locator('#ui-command-basic'),button=sample.getByRole('button',{name:'Custom XamlUICommand',exact:true});
 await button.click();await expect.poll(()=>page.evaluate(()=>window.viewCommandScenes['ui-command-basic'].snapshot.nodes.some(n=>n.props.text==='You fired the custom command'))).toBe(true);
 await page.reload();await expect(button).toBeVisible();await button.focus();await page.keyboard.press('Control+d');await expect.poll(()=>page.evaluate(()=>window.viewCommandScenes['ui-command-basic'].snapshot.nodes.some(n=>n.props.text==='You fired the custom command'))).toBe(true);
 const metadata=await page.evaluate(()=>window.viewCommandScenes['ui-command-basic'].snapshot.nodes.find(n=>n.kind==='UICommand')?.props.viewControls);expect(metadata).toMatchObject({label:'Custom XamlUICommand',description:'This is a custom command',iconSymbol:'Favorite',accelerators:[{key:'D',modifiers:['Control']}]});expect(await button.evaluate(e=>getComputedStyle(e).outlineStyle)).toBe('none');
});
test('SplitView Gallery defaults, navigation, placement, display modes and pane lengths',async({page})=>{
 await page.goto('/#split-view');const sample=page.locator('#split-view-basic');await expect.poll(()=>page.evaluate(()=>window.viewCommandScenes?.['split-view-basic']?.snapshot.nodes.find(n=>n.kind==='SplitView')?.viewControl?.progress)).toBe(1);
 expect(await page.evaluate(()=>window.viewCommandScenes['split-view-basic'].snapshot.nodes.find(n=>n.kind==='SplitView')?.props.viewControls)).toMatchObject({isPaneOpen:true,displayMode:'Inline',panePlacement:'Left',openPaneLength:256,compactPaneLength:48});
 await sample.getByRole('option',{name:'People',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.viewCommandScenes['split-view-basic'].snapshot.nodes.some(n=>n.props.text==='People Page'))).toBe(true);
 await sample.getByRole('button',{name:'IsPaneOpen',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.viewCommandScenes['split-view-basic'].snapshot.nodes.find(n=>n.kind==='SplitView')?.viewControl?.progress)).toBe(0);await sample.getByRole('button',{name:'IsPaneOpen',exact:true}).click();
 await sample.getByRole('switch').click();await expect.poll(()=>page.evaluate(()=>window.viewCommandScenes['split-view-basic'].snapshot.nodes.find(n=>n.kind==='SplitView')?.props.viewControls?.panePlacement)).toBe('Right');
 await sample.getByRole('combobox',{name:'DisplayMode',exact:true}).click();await sample.getByRole('option',{name:'CompactOverlay',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.viewCommandScenes['split-view-basic'].snapshot.nodes.find(n=>n.kind==='SplitView')?.props.viewControls?.displayMode)).toBe('CompactOverlay');
 const sliders=sample.getByRole('slider');await sliders.first().focus();await page.keyboard.press('End');await expect.poll(()=>page.evaluate(()=>window.viewCommandScenes['split-view-basic'].snapshot.nodes.find(n=>n.kind==='SplitView')?.props.viewControls?.openPaneLength)).toBe(500);
});
test('SemanticZoom group navigation and inactive accessibility subtree',async({page})=>{
 await page.goto('/#semantic-zoom');const sample=page.locator('#semantic-zoom-basic');await expect.poll(()=>page.evaluate(()=>window.viewCommandScenes?.['semantic-zoom-basic']?.snapshot.nodes.find(n=>n.kind==='GridView')?.collection?.totalCount)).toBeGreaterThan(100);
 const zoomBox=await sample.locator('.basic-preview canvas').first().boundingBox();await page.mouse.click(zoomBox!.x+65,zoomBox!.y+25);await expect.poll(()=>page.evaluate(()=>window.viewCommandScenes['semantic-zoom-basic'].snapshot.nodes.find(n=>n.kind==='SemanticZoom')?.props.viewControls?.isZoomedInViewActive)).toBe(false);
 const group=sample.getByRole('option',{name:'Collections',exact:true});await expect(group).toBeVisible();await group.click();await expect(group).not.toBeVisible();await expect.poll(()=>page.evaluate(()=>window.viewCommandScenes['semantic-zoom-basic'].snapshot.nodes.find(n=>n.kind==='GridView')?.scroll?.verticalOffset??0)).toBeGreaterThan(0);
});
test('ParallaxView follows Rust scrolling without React scroll callbacks',async({page})=>{
 await page.goto('/#parallax-view');const sample=page.locator('#parallax-scroll .basic-preview');await sample.scrollIntoViewIfNeeded();await expect.poll(()=>page.evaluate(()=>window.viewCommandScenes?.['parallax-scroll']?.snapshot.nodes.find(n=>n.kind==='ParallaxView')?.viewControl?.translation[1])).not.toBeUndefined();const before=await page.evaluate(()=>window.viewCommandScenes['parallax-scroll'].snapshot.nodes.find(n=>n.kind==='ParallaxView')!.viewControl!.translation[1]);const r=await sample.boundingBox();await page.mouse.move(r!.x+80,r!.y+100);await page.mouse.wheel(0,400);await expect.poll(()=>page.evaluate(()=>window.viewCommandScenes['parallax-scroll'].snapshot.nodes.find(n=>n.kind==='ParallaxView')!.viewControl!.translation[1])).toBeLessThan(before);
});
test('Gallery parallax uses complete sorted catalog, scrolling header, ScrollView and 19 original colors',async({page})=>{
 const official=JSON.parse(readFileSync('src/official-view-command.json','utf8'));const count=official.data.Groups.flatMap((g:any)=>g.Items).length;await page.goto('/#parallax-view');
 await expect.poll(()=>page.evaluate(()=>window.viewCommandScenes?.['parallax-list']?.snapshot.nodes.find(n=>n.kind==='ListView')?.collection?.totalCount)).toBe(count);
 const data=await page.evaluate(()=>{const s=window.viewCommandScenes;return{first:s['parallax-list'].snapshot.nodes.filter(n=>n.kind==='CollectionItem').slice(0,3).map(n=>s['parallax-list'].snapshot.nodes.find(child=>child.parent===n.id&&child.kind==='TextBlock')?.props.text),header:s['parallax-list'].snapshot.nodes.some(n=>n.props.text==='Scroll the list to see parallaxing of image'),scroll:s['parallax-scroll'].snapshot.nodes.find(n=>n.kind==='ScrollView')?.rect,colors:s['parallax-scroll'].snapshot.nodes.filter(n=>n.kind==='Rectangle').map(n=>n.props.fill)}});
 expect(data.first).toEqual(['AcrylicBrush','AnimatedIcon','AnimatedVisualPlayer']);expect(data.header).toBe(true);expect(data.scroll?.width).toBe(150);expect(data.colors).toHaveLength(19);expect(data.colors.slice(0,3)).toEqual(['#F0F8FF','#FAEBD7','#00FFFF']);
});
test('StandardUICommand Gallery hover, Edit menu and keyboard delete share one command',async({page})=>{
 await page.goto('/#standard-command');const sample=page.locator('#standard-command-basic');const total=()=>page.evaluate(()=>window.viewCommandScenes?.['standard-command-basic']?.snapshot.nodes.find(n=>n.kind==='ListView')?.collection?.totalCount);await expect.poll(total).toBe(15);
 const row=sample.getByRole('option',{name:'List item 0',exact:true});await row.hover();await row.getByRole('button').click();await expect.poll(total).toBe(14);
 await sample.getByRole('option',{name:'List item 1',exact:true}).click();await sample.getByRole('menuitem',{name:'Edit',exact:true}).click();await sample.getByRole('menuitem',{name:/删除|Delete/}).click();await expect.poll(total).toBe(13);
 await sample.getByRole('option',{name:'List item 2',exact:true}).click();await page.keyboard.press('Delete');await expect.poll(total).toBe(12);
});
test('StandardUICommand Gallery context menu and touch Execute swipe delete the target item',async({page})=>{
 await page.goto('/#standard-command');const sample=page.locator('#standard-command-basic');const total=()=>page.evaluate(()=>window.viewCommandScenes?.['standard-command-basic']?.snapshot.nodes.find(n=>n.kind==='ListView')?.collection?.totalCount);await expect.poll(total).toBe(15);
 await sample.getByRole('option',{name:'List item 1',exact:true}).click({button:'right'});await sample.getByRole('menuitem',{name:/删除|Delete/}).click();await expect.poll(total).toBe(14);
 const row=sample.getByRole('option',{name:'List item 2',exact:true}),box=await row.boundingBox();const cdp=await page.context().newCDPSession(page);const x=box!.x+box!.width-40,y=box!.y+box!.height/2;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let delta=25;delta<=200;delta+=25)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-delta,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect.poll(total).toBe(13);await expect(sample.getByRole('option',{name:'List item 2',exact:true})).toHaveCount(0);
});
test('public SDK lifecycle, child command, metadata overrides and invalid ownership',async({page})=>{
 test.skip(process.env.VIEW_COMMAND_PRODUCTION==='1','Module fixture runs against the development SDK; page interactions also run on production.');
 await page.goto('/#ui-command');const result=await page.evaluate(async()=>{
  const m=await import('/@id/winui-wasm' as string),sdk=await m.WinUI.create({globalScrollbars:false}),host=document.createElement('div');host.style.cssText='width:500px;height:300px';document.body.append(host);const scene=sdk.scene(host),child=scene.root.uiCommand(),parent=scene.root.standardCommand({standardKind:m.StandardCommandKind.Save,command:child});
  let count=0;const off=child.onExecuteRequested(()=>count++);parent.execute({document:7});await new Promise(r=>setTimeout(r,100));const first=count;off();parent.execute();await new Promise(r=>setTimeout(r,100));parent.update({label:'Custom',standardKind:m.StandardCommandKind.Copy});const label=parent.metadata.label;
  let cycle=false;try{child.update({command:parent});}catch{cycle=true;}
  const other=sdk.scene(document.createElement('div'));let cross=false;try{other.root.button({command:parent});}catch{cross=true;}
  const menu=scene.root.menuFlyout({menuItems:[{id:'copy',command:parent}]}),swipe=scene.root.swipeControl({rightItems:{mode:m.SwipeMode.Execute,items:[{id:'copy',command:parent}]}});const nestedHandles=menu.properties.menuItems![0].command===parent&&swipe.properties.rightItems!.items[0].command===parent;
  const button=scene.root.button({command:parent});parent.dispose();await new Promise(r=>setTimeout(r,50));const detached=button.properties.command===null,nestedDetached=menu.properties.menuItems![0].command===null&&swipe.properties.rightItems!.items[0].command===null;scene.dispose();other.dispose();sdk.dispose();host.remove();return{first,count,label,cycle,cross,detached,nestedHandles,nestedDetached};
 });expect(result).toEqual({first:1,count:1,label:'Custom',cycle:true,cross:true,detached:true,nestedHandles:true,nestedDetached:true});
});
test('32 native SplitView states: both Rust rendering backends and themes',async({page},testInfo)=>{
 test.skip(process.env.VIEW_COMMAND_PRODUCTION==='1','Native fixture imports the public development SDK.');test.setTimeout(120000);
 const native=JSON.parse(readFileSync('../references/validation/view-command-native.json','utf8'));await page.goto('/#split-view');const results:unknown[]=[];
 for(const backend of ['Canvas2D','WebGL2'])for(const row of native.cases.filter((c:any)=>c.kind==='SplitView')){
  const geometry=await page.evaluate(async({row,backend})=>{
   const w=window as any;if(w.viewFixture){w.viewFixture.sdk.dispose();w.viewFixture.host.remove();}
   const m=await import('/@id/winui-wasm' as string),sdk=await m.WinUI.create({globalScrollbars:false}),host=document.createElement('div');host.id='view-native-fixture';host.style.cssText='position:fixed;inset:0;width:640px;height:360px;z-index:999999';document.body.append(host);
   const scene=sdk.scene(host,{backend,theme:row.theme,reducedMotion:true,root:{background:row.theme==='Light'?'#FFFFFF':'#202020'}}),canvas=scene.root.canvas(),split=canvas.splitView({...row.props,canvasLeft:24,canvasTop:24});split.pane({background:'#DCE6F0'}).text({text:'Pane',margin:[12,12,12,12]});const content=split.content({background:'#F0E6DC'});content.text({text:'Content',margin:[12,12,12,12]});w.viewFixture={sdk,scene,host};await new Promise(r=>setTimeout(r,45));return{rect:split.snapshot.rect,content:content.snapshot.rect,backend:scene.diagnostics,wasmSha256:m.WinUI.buildVersion};
  },{row,backend});
  expect(geometry.backend.kind).toBe(backend);expect(geometry.backend.lost).toBe(false);
  const expected=row.parts.find((p:any)=>p.name==='ContentRoot').rect;expect(Math.abs(geometry.content.x+24-expected.x)).toBeLessThanOrEqual(1.01);expect(Math.abs(geometry.content.width-expected.width)).toBeLessThanOrEqual(1.01);
  const actual=PNG.sync.read(await page.locator('#view-native-fixture').screenshot()),reference=PNG.sync.read(readFileSync(`../out/view-command-native/${row.id}.png`));let error=0,n=0;for(let y=24;y<264;y++)for(let x=24;x<504;x++)for(let c=0;c<3;c++){error+=Math.abs(actual.data[(y*actual.width+x)*4+c]-reference.data[(y*reference.width+x)*4+c]);n++;}const mean=error/n;expect(mean).toBeLessThan(2);results.push({id:row.id,backend,geometry,meanPixelError:mean});
 }
 mkdirSync('../references/validation',{recursive:true});writeFileSync('../references/validation/view-command-browser-native.json',JSON.stringify({cases:results,native:'references/validation/view-command-native.json'},null,2));await testInfo.attach('native-comparison',{body:JSON.stringify(results),contentType:'application/json'});
});

for(const route of ['ui-command','semantic-zoom','parallax-view'])test(`${route}: React renderer remount retains valid references`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#'+route);await page.getByRole('combobox',{name:'Renderer',exact:true}).click();await page.getByRole('option',{name:'WebGL2',exact:true}).click();await expect.poll(()=>page.evaluate(()=>Object.values(window.viewCommandScenes??{}).length)).toBeGreaterThan(0);await page.waitForTimeout(100);
 if(route==='ui-command'){await page.getByRole('button',{name:'Custom XamlUICommand',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.viewCommandScenes['ui-command-basic'].snapshot.nodes.some(n=>n.props.text==='You fired the custom command'))).toBe(true);}
 else if(route==='semantic-zoom'){const box=await page.locator('#semantic-zoom-basic .basic-preview canvas').first().boundingBox();await page.mouse.click(box!.x+65,box!.y+25);await expect(page.locator('.basic-preview').getByRole('option',{name:'Collections',exact:true})).toBeVisible();}
 expect(errors).toEqual([]);
});

test('six Gallery examples retain native dimensions, item data and text in both themes',async({page},testInfo)=>{
 test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));const native=JSON.parse(readFileSync('../references/validation/view-gallery-native.json','utf8'));const cases:any[]=[];
 const samples=[['split-view','split-view-basic','SplitView','SplitView',0],['semantic-zoom','semantic-zoom-basic','SemanticZoom','SemanticZoom',0],['parallax-view','parallax-list','ParallaxView','ParallaxView',0],['parallax-view','parallax-scroll','ParallaxView','ParallaxView',1],['ui-command','ui-command-basic','XamlUICommand','AppBarButton',0],['standard-command','standard-command-basic','StandardUICommand','ListView',0]] as const;
 for(const theme of ['Light','Dark'])for(const [route,name,kind,nodeKind,index]of samples){
  await page.goto('/#'+route);await page.evaluate(theme=>localStorage.setItem('winui-gallery.theme',theme),theme);await page.reload();await expect(page.locator('#'+name+' .basic-preview canvas').first()).toBeVisible();
  await page.addStyleTag({content:`.basic-preview{width:640px!important;box-sizing:content-box!important;flex:none!important;background:${theme==='Light'?'#FFFFFF':'#202020'}}`});
  await expect.poll(()=>page.evaluate(({name,nodeKind})=>window.viewCommandScenes?.[name]?.snapshot.nodes.find(n=>n.kind===nodeKind)?.theme,{name,nodeKind})).toBe(theme);
  await page.evaluate(async name=>{const scene=window.viewCommandScenes[name];scene.configure({reducedMotion:true});await new Promise(r=>setTimeout(r,100));},name);
  const row=native.cases.find((c:any)=>c.id===`${theme}-${kind}-${index}`),expected=row.parts.find((p:any)=>p.type===nodeKind);
  const actual=await page.evaluate(({name,nodeKind})=>{const scene=window.viewCommandScenes[name];return{node:scene.snapshot.nodes.find(n=>n.kind===nodeKind),visibleTexts:scene.snapshot.nodes.filter(n=>n.visible&&n.kind==='TextBlock'&&n.rect.width>0&&n.rect.height>0).map(n=>n.props.text)}} ,{name,nodeKind});
  expect(actual.node?.theme).toBe(theme);expect(actual.node?.rect.width).toBeCloseTo(expected.rect.width,0);expect(actual.node?.rect.height).toBeCloseTo(expected.rect.height,0);
  const screenshot=await page.locator('#'+name+' .basic-preview canvas').first().screenshot();const pixels=PNG.sync.read(screenshot);let darkest=765,lightest=0;for(let i=0;i<pixels.data.length;i+=4){const luma=pixels.data[i]+pixels.data[i+1]+pixels.data[i+2];darkest=Math.min(darkest,luma);lightest=Math.max(lightest,luma);}expect(lightest-darkest,'rendered example must contain visible content').toBeGreaterThan(64);await testInfo.attach(`${theme}-${kind}-${index}`,{body:screenshot,contentType:'image/png'});
  mkdirSync('../out/view-gallery-browser',{recursive:true});writeFileSync(`../out/view-gallery-browser/${row.id}.png`,screenshot);
  cases.push({id:row.id,node:actual.node?.rect,native:expected.rect,visibleTexts:actual.visibleTexts,theme,actualTheme:actual.node?.theme,screenshot:`out/view-gallery-browser/${row.id}.png`,screenshotSha256:createHash('sha256').update(screenshot).digest('hex')});
 }
 expect(errors).toEqual([]);mkdirSync('../references/validation',{recursive:true});writeFileSync('../references/validation/view-gallery-browser.json',JSON.stringify({cases,native:'references/validation/view-gallery-native.json'},null,2));
});
