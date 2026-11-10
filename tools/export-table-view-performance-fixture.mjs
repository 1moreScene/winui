// Read public SDK data and Rust geometry; this does not change the Gallery.
import {chromium} from '../gallery/node_modules/@playwright/test/index.mjs';
import {writeFileSync,mkdirSync} from 'node:fs';
const browser=await chromium.launch({headless:true,channel:'chrome'});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1.25});
 await page.goto('http://127.0.0.1:5173/#table-view');
 await page.waitForFunction(()=>window.tableViewControls?.large?.tableSnapshot?.totalCount===10000);
 const fixtures=await page.evaluate(()=>['editing','large'].map(name=>{
  const table=window.tableViewControls[name],p=table.properties,s=table.tableSnapshot;
  const node=window.tableViewScenes[name].snapshot.nodes.find(n=>n.kind==='TableView');
  return {name,items:table.items,columns:s.columns,width:node.rect.width,height:node.rect.height,
   gridLinesVisibility:p.gridLinesVisibility,rowHeight:p.rowHeight,headerRowHeight:p.headerRowHeight,
   frozenColumnCount:p.frozenColumnCount,dpr:devicePixelRatio};
 }));
 mkdirSync('out/table-view-120',{recursive:true});writeFileSync('out/table-view-120/fixtures.json',JSON.stringify(fixtures));
 console.log(JSON.stringify(fixtures.map(({items,columns,...p})=>({...p,count:items.length,columns:columns.length}))));
} finally {await browser.close();}
