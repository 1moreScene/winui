import {test,expect,type Page} from '@playwright/test';

test.use({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2});

async function gesture(page:Page,x:number,y:number,dx=0,dy=0,cancel=false){
 const cdp=await page.context().newCDPSession(page);
 try{
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/8,y:y+dy*i/8}]});
  await cdp.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});
 }finally{await cdp.detach();}
}
async function reveal(page:Page,column:string){
 const scene=page.locator('#table-editing .winui-scene').first();
 await scene.scrollIntoViewIfNeeded();
 const box=(await scene.boundingBox())!;
 const desired=await page.evaluate(column=>{
  const s=window.tableViewControls.editing.tableSnapshot!;
  const index=s.columns.findIndex(c=>c.key===column);
  return s.columnWidths.slice(1,index).reduce((a,b)=>a+b,0);
 },column);
 for(let i=0;i<12;i++){
  const offset=await page.evaluate(()=>window.tableViewControls.editing.tableSnapshot!.scroll!.horizontalOffset);
  if(Math.abs(desired-offset)<1)return;
  await gesture(page,box.x+box.width-25,box.y+80,Math.max(-140,Math.min(140,offset-desired)));
 }
 throw new Error(`Could not reveal ${column} by touch scrolling`);
}
async function edit(page:Page,column:string,label:string){
 await reveal(page,column);
 const cell=page.locator('#table-editing').getByRole('gridcell',{name:label,exact:true});
 await cell.tap();await cell.tap();
 await expect.poll(()=>page.evaluate(()=>window.tableViewControls.editing.tableSnapshot!.editingCell?.column)).toBe(column);
}
async function picker(page:Page){
 return page.evaluate(()=>window.tableViewScenes.editing.snapshot.nodes.find(n=>n.kind==='CalendarDatePicker')!);
}
test.beforeEach(async({page})=>{
 await page.routeWebSocket(/^ws:\/\/127\.0\.0\.1:\d+\//,()=>{});
 await page.goto('./#table-view');
 await expect.poll(()=>page.evaluate(()=>window.tableViewControls?.editing?.tableSnapshot?.totalCount)).toBe(24);
});

test('touch opens the date editor, navigates its calendar and commits to React rows',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await edit(page,'joined','1, Joined: 2024-01-01');
 const id=(await picker(page)).id;
 await page.locator('#table-editing').getByRole('button',{name:'CalendarDatePicker',exact:true}).tap();
 await expect.poll(async()=>(await picker(page)).props.isOpen).toBe(true);
 await page.locator('#table-editing').getByRole('button',{name:'Next',exact:true}).tap();
 const day=()=>page.evaluate(()=>window.tableViewScenes.editing.snapshot.nodes.find(n=>n.kind==='CalendarView')!.picker!.cells.find(c=>c.date==='2024-02-15')?.node);
 await expect.poll(day).toBeTruthy();
 await page.locator(`#table-editing [data-scene-node="${await day()}"]`).tap();
 await expect.poll(async()=>(await picker(page)).props.isOpen).toBe(false);
 expect((await picker(page)).id).toBe(id);
 await page.locator('#table-editing').getByRole('button',{name:'Commit edit',exact:true}).tap();
 await expect.poll(()=>page.evaluate(()=>window.tableViewControls.editing.items[0].joined)).toBe('2024-02-15');
 await expect.poll(()=>page.evaluate(()=>window.tableViewControls.editing.tableSnapshot!.editingCell)).toBeNull();
 expect(errors).toEqual([]);
});

test('a pan or cancelled touch on the date editor does not open or restart editing',async({page})=>{
 await edit(page,'joined','1, Joined: 2024-01-01');
 const id=(await picker(page)).id;
 const input=page.locator('#table-editing').getByRole('button',{name:'CalendarDatePicker',exact:true});
 const box=(await input.boundingBox())!;
 await gesture(page,box.x+box.width/2,box.y+box.height/2,0,0,true);
 expect((await picker(page)).props.isOpen).toBe(false);
 await gesture(page,box.x+box.width/2,box.y+box.height/2,-30);
 expect((await picker(page)).props.isOpen).toBe(false);
 expect((await picker(page)).id).toBe(id);
 await reveal(page,'joined');await input.tap();
 await expect.poll(async()=>(await picker(page)).props.isOpen).toBe(true);
 const day=await page.evaluate(()=>window.tableViewScenes.editing.snapshot.nodes.find(n=>n.kind==='CalendarView')!.picker!.cells.find(c=>c.date==='2024-01-15')!.node);
 const dateBox=(await page.locator(`#table-editing [data-scene-node="${day}"]`).boundingBox())!;
 await gesture(page,dateBox.x+dateBox.width/2,dateBox.y+dateBox.height/2,0,0,true);
 expect((await picker(page)).props.pickerControls?.date).toBe('2024-01-01');
 await page.locator('#table-editing h2').tap();
 await expect.poll(async()=>(await picker(page)).props.isOpen).toBe(false);
 await page.locator('#table-editing').getByRole('button',{name:'Cancel edit',exact:true}).tap();
 await expect.poll(()=>page.evaluate(()=>window.tableViewControls.editing.tableSnapshot!.editingCell)).toBeNull();
 expect(await page.evaluate(()=>window.tableViewControls.editing.items[0].joined)).toBe('2024-01-01');
});

test('the same touch path opens a combo editor and scrolls a time picker wheel',async({page})=>{
 await edit(page,'department','1, Department: Engineering');
 const dropdown=await page.evaluate(()=>window.tableViewScenes.editing.snapshot.nodes.find(n=>n.kind==='ComboBox')!.composed!.parts.DropDownButton);
 await page.locator(`#table-editing [data-scene-node="${dropdown}"]`).tap();
 await page.locator('#table-editing').getByRole('option',{name:'Design',exact:true}).tap();
 await page.locator('#table-editing').getByRole('button',{name:'Commit edit',exact:true}).tap();
 await expect.poll(()=>page.evaluate(()=>window.tableViewControls.editing.items[0].department)).toBe('Design');
 await edit(page,'start','1, Start time: 480');
 await page.locator('#table-editing').getByRole('button',{name:'TimePicker',exact:true}).tap();
 await expect.poll(()=>page.evaluate(()=>window.tableViewScenes.editing.snapshot.nodes.find(n=>n.kind==='TimePicker')!.props.isOpen)).toBe(true);
 const wheel=await page.evaluate(()=>window.tableViewScenes.editing.snapshot.nodes.find(n=>n.kind==='TimePicker')!.picker!.parts.SecondWheel);
 const box=(await page.locator(`#table-editing [data-scene-node="${wheel}"]`).boundingBox())!;
 await gesture(page,box.x+box.width/2,box.y+box.height/2,0,-40);
 await page.locator('#table-editing').getByRole('button',{name:'Accept',exact:true}).tap();
 await page.locator('#table-editing').getByRole('button',{name:'Commit edit',exact:true}).tap();
 await expect.poll(()=>page.evaluate(()=>window.tableViewControls.editing.items[0].start)).toBe(481);
});
test('touch expands and collapses TableView groups without treating a pan as a toggle',async({page})=>{
 const section=page.locator('#table-grouping');
 const collapse=section.getByRole('button',{name:'Collapse department: Design',exact:true});
 await collapse.scrollIntoViewIfNeeded();const box=(await collapse.boundingBox())!;
 await gesture(page,box.x+box.width/2,box.y+box.height/2,0,0,true);
 await expect.poll(()=>page.evaluate(()=>window.tableViewControls.grouping.tableSnapshot!.viewKeys.length)).toBe(24);
 await collapse.tap();await expect.poll(()=>page.evaluate(()=>window.tableViewControls.grouping.tableSnapshot!.viewKeys.length)).toBe(18);
 await section.getByRole('button',{name:'Expand department: Design',exact:true}).tap();
 await expect.poll(()=>page.evaluate(()=>window.tableViewControls.grouping.tableSnapshot!.viewKeys.length)).toBe(24);
 await section.getByRole('button',{name:'Collapse all groups',exact:true}).tap();
 await expect.poll(()=>page.evaluate(()=>window.tableViewControls.grouping.tableSnapshot!.viewKeys.length)).toBe(0);
 await section.getByRole('button',{name:'Expand department: Design',exact:true}).tap();
 await expect.poll(()=>page.evaluate(()=>window.tableViewControls.grouping.tableSnapshot!.viewKeys.length)).toBe(6);
 await section.getByRole('button',{name:'Expand all groups',exact:true}).tap();
 await expect.poll(()=>page.evaluate(()=>window.tableViewControls.grouping.tableSnapshot!.viewKeys.length)).toBe(24);
});
