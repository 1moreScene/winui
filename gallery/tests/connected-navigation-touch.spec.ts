import {test,expect,type Page} from '@playwright/test';
import {PNG} from 'pngjs';
test.use({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2});
test.beforeEach(async({page})=>{await page.routeWebSocket(/^ws:\/\/127\.0\.0\.1:\d+\//,()=>{});});
async function gesture(page:Page,x:number,y:number,dy=0,cancel=false){
 const cdp=await page.context().newCDPSession(page);
 try{
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let step=1;step<=8;step++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+dy*step/8}]});
  await cdp.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});
 }finally{await cdp.detach();}
}
test('all four Connected Animation samples support touch navigation and returning',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('./#connected-animation');await page.waitForFunction(()=>window.motionScenes?.['connected-3']);
 for(const [index,role,name,back] of [[0,'option','Item 1','Go Back'],[1,'option','Item 1','Close'],[3,'button','Item 1','Go Back']] as const){
  const section=page.locator(`#connected-animation-${index}`);
  await section.getByRole(role,{name,exact:true}).tap();
  const close=section.getByRole('button',{name:back,exact:true});await expect(close).toBeVisible();
  const bounds=(await close.boundingBox())!;expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(390);
  await close.tap();await expect(section.getByRole(role,{name,exact:true})).toBeVisible();
 }
 const section=page.locator('#connected-animation-2');
 for(let i=0;i<2;i++){
  await section.getByRole('button',{name:'Navigate',exact:true}).tap();
  await expect.poll(()=>page.evaluate(()=>window.motionScenes['connected-2'].snapshot.nodes.some(n=>n.props.width===150&&n.props.height===200))).toBe(i===0);
 }
 expect(errors).toEqual([]);
});
test('ItemsRepeater touch scrolling and cancelled taps do not activate a connected card',async({page})=>{
 await page.goto('./#connected-animation');await page.waitForFunction(()=>window.motionScenes?.['connected-3']);
 const section=page.locator('#connected-animation-3');await section.scrollIntoViewIfNeeded();
 const tile=section.getByRole('button',{name:'Item 1',exact:true}),box=(await tile.boundingBox())!;
 await gesture(page,box.x+box.width/2,box.y+box.height/2,0,true);
 await expect(section.getByRole('button',{name:'Go Back',exact:true})).toHaveCount(0);
 await gesture(page,box.x+box.width/2,box.y+box.height/2,-70);
 const offset=()=>page.evaluate(()=>window.motionScenes['connected-3'].snapshot.nodes.find(n=>n.kind==='ScrollViewer')!.scroll!.verticalOffset);
 await expect.poll(offset).toBeGreaterThan(50);const before=await offset();
 await expect(section.getByRole('button',{name:'Go Back',exact:true})).toHaveCount(0);
 await section.getByRole('button',{name:'Item 4',exact:true}).tap();
 await section.getByRole('button',{name:'Go Back',exact:true}).tap();
 await expect.poll(offset).toBeCloseTo(before,0);
});
test('connected navigation stays usable before its destination image has loaded',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 let release!:()=>void;const images=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/official/**',async route=>{await images;await route.continue();});
 try{
  await page.goto('./#connected-animation',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.motionScenes?.['connected-3']);
  const section=page.locator('#connected-animation-0');
  await section.getByRole('option',{name:'Item 1',exact:true}).tap();
  await expect(section.getByRole('button',{name:'Go Back',exact:true})).toBeVisible();
  await section.getByRole('button',{name:'Go Back',exact:true}).tap();
  await expect(section.getByRole('option',{name:'Item 1',exact:true})).toBeVisible();
  await section.getByRole('option',{name:'Item 1',exact:true}).tap();
  await expect(section.getByRole('button',{name:'Go Back',exact:true})).toBeVisible();
  release();
  await expect.poll(()=>page.evaluate(()=>window.motionScenes['connected-0'].snapshot.nodes.some(n=>n.kind==='Image'&&n.visible&&n.rect.width>0&&n.rect.height>0))).toBe(true);
  await section.getByRole('button',{name:'Go Back',exact:true}).tap();
  await expect(section.getByRole('option',{name:'Item 1',exact:true})).toBeVisible();
  expect(errors).toEqual([]);
 }finally{release();}
});
test('Top NavigationView overflow paints over content, accepts taps and dismisses',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('./#navigation-view');await page.waitForFunction(()=>window.gallery?.views?.[3]);
 for(const index of [1,3]){
  const section=page.locator(`#example-${index}`),more=section.getByRole('button',{name:'More',exact:true});
  await more.scrollIntoViewIfNeeded();const canvas=section.locator('canvas').first();
  const before=PNG.sync.read(await canvas.screenshot());await more.tap();
  await expect.poll(()=>page.evaluate(i=>window.gallery.views[i].snapshot.overflowOpen,index)).toBe(true);
  const item=await page.evaluate(i=>window.gallery.views[i].snapshot.parts.find(p=>p.clip&&!p.id.startsWith('$'))!,index);
  const after=PNG.sync.read(await canvas.screenshot()),bounds=(await canvas.boundingBox())!,scale=after.width/bounds.width;
  let changed=0;
  for(let y=Math.ceil(item.rect.y*scale);y<Math.floor((item.rect.y+item.rect.height)*scale);y++)for(let x=Math.ceil(item.rect.x*scale);x<Math.floor((item.rect.x+item.rect.width)*scale);x++){
   const p=(y*after.width+x)*4;if(Math.abs(after.data[p]-before.data[p])+Math.abs(after.data[p+1]-before.data[p+1])+Math.abs(after.data[p+2]-before.data[p+2])>30)changed++;
  }
  expect(changed,'Overflow rows must actually paint above the sample page').toBeGreaterThan(100);
  await section.getByRole('button',{name:item.text,exact:true}).tap();
  await expect.poll(()=>page.evaluate(i=>window.gallery.views[i].snapshot.selectedId,index)).toBe(item.id);
  await expect.poll(()=>page.evaluate(i=>window.gallery.views[i].snapshot.overflowOpen,index)).toBe(false);
  await more.tap();await expect.poll(()=>page.evaluate(i=>window.gallery.views[i].snapshot.overflowOpen,index)).toBe(true);
  const box=(await canvas.boundingBox())!;await page.touchscreen.tap(box.x+20,box.y+200);
  await expect.poll(()=>page.evaluate(i=>window.gallery.views[i].snapshot.overflowOpen,index)).toBe(false);
 }
 expect(errors).toEqual([]);
});
test('NavigationView hierarchy groups expand and collapse with touch',async({page})=>{
 await page.goto('./#navigation-view');await page.waitForFunction(()=>window.gallery?.views?.[6]);
 const section=page.locator('#example-6'),account=section.getByRole('button',{name:'Account',exact:true});
 await account.tap();await expect.poll(()=>page.evaluate(()=>window.gallery.views[6].snapshot.expandedIds.includes('page2'))).toBe(true);
 await expect(section.getByRole('button',{name:'Mail',exact:true})).toBeVisible();
 await account.tap();await expect.poll(()=>page.evaluate(()=>window.gallery.views[6].snapshot.expandedIds.includes('page2'))).toBe(false);
 await expect(section.getByRole('button',{name:'Mail',exact:true})).toHaveCount(0);
});
