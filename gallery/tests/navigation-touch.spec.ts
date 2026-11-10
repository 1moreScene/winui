import {test,expect,type Page} from '@playwright/test';

test.use({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
async function swipe(page:Page,x:number,y:number,dy:number,cancel=false){
 const cdp=await page.context().newCDPSession(page);
 try{
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let step=1;step<=8;step++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+dy*step/8}]});
  await cdp.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});
 }finally{await cdp.detach();}
}
async function openMenu(page:Page){
 await page.goto('/#home');
 await page.getByRole('button',{name:'Toggle navigation pane',exact:true}).tap();
 await expect.poll(()=>page.evaluate(()=>window.gallery?.navigation?.snapshot.isPaneOpen)).toBe(true);
 await expect.poll(()=>page.evaluate(()=>window.gallery.navigation!.snapshot.animating)).toBe(false);
 await page.locator('.gallery-navigation').getByRole('button',{name:'Basic input',exact:true}).tap();
 await expect.poll(()=>page.evaluate(()=>window.gallery.navigation!.snapshot.maxScroll)).toBeGreaterThan(200);
}

test('mobile Gallery menu pans in Rust without selecting an item, then supports tapping a route',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await openMenu(page);
 const before=await page.evaluate(()=>({selected:window.gallery.navigation!.snapshot.selectedId,route:location.hash,body:document.querySelector('.gallery-scroll-content')!.scrollTop}));
 const box=await page.locator('.gallery-navigation .winui-scene').boundingBox();
 const region=await page.evaluate(()=>window.gallery.navigation!.snapshot.scrollViewports.find(v=>!v.content)!.rect);
 await swipe(page,box!.x+region.x+region.width/2,box!.y+region.y+Math.min(region.height-35,450),-250);
 await expect.poll(()=>page.evaluate(()=>window.gallery.navigation!.snapshot.scrollOffset)).toBeGreaterThan(180);
 expect(await page.evaluate(()=>({selected:window.gallery.navigation!.snapshot.selectedId,route:location.hash,body:document.querySelector('.gallery-scroll-content')!.scrollTop}))).toEqual(before);
 await page.locator('.gallery-navigation').getByRole('scrollbar',{name:'Navigation menu scroll'}).press('Home');
 await expect.poll(()=>page.evaluate(()=>window.gallery.navigation!.snapshot.scrollOffset)).toBeLessThan(1);
 await page.locator('.gallery-navigation').getByRole('button',{name:'Button',exact:true}).tap();
 await expect(page).toHaveURL(/#button$/);
 await expect.poll(()=>page.evaluate(()=>window.gallery.navigation!.snapshot.isPaneOpen)).toBe(false);
 expect(errors).toEqual([]);
});

test('mobile Gallery scrollbar accepts a finger drag and cancellation releases the gesture',async({page})=>{
 await openMenu(page);
 const box=await page.locator('.gallery-navigation .winui-scene').boundingBox();
 const thumb=await page.evaluate(()=>window.gallery.navigation!.snapshot.scrollbars.find(v=>!v.content)!.thumb);
 await swipe(page,box!.x+thumb.x+thumb.width/2,box!.y+thumb.y+Math.min(thumb.height/2,30),180,true);
 await expect.poll(()=>page.evaluate(()=>window.gallery.navigation!.snapshot.scrollOffset)).toBeGreaterThan(200);
 expect(await page.evaluate(()=>location.hash)).toBe('#home');
});

test('mobile Gallery page content keeps native browser touch scrolling outside the closed pane',async({page})=>{
 await page.goto('/#home');await page.waitForFunction(()=>!!window.gallery?.navigation);
 await expect.poll(()=>page.evaluate(()=>window.gallery.navigation!.snapshot.isPaneOpen)).toBe(false);
 const main=page.locator('.gallery-scroll-content');await expect(main).toBeVisible();
 await expect.poll(()=>main.evaluate(element=>element.scrollHeight-element.clientHeight)).toBeGreaterThan(200);
 await swipe(page,300,700,-350);
 await expect.poll(()=>main.evaluate(element=>element.scrollTop)).toBeGreaterThan(100);
});
