import {test,expect} from '@playwright/test';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {PNG} from 'pngjs';
const matrix=JSON.parse(readFileSync('../references/navigation-controls-metrics.json','utf8').replace(/^\uFEFF/,''));
test('fixed SDK 60 states, two renderers, native geometry and visible output',async({page})=>{
 test.setTimeout(180000);await page.goto('/#pips-pager');await page.getByRole('button',{name:'Page 1',exact:true}).first().waitFor();const results=[];
 for(const backend of ['Canvas2D','WebGL2']){
  const folder=`../out/navigation-controls-${backend}`;mkdirSync(folder,{recursive:true});
  for(const row of matrix.cases){
   const result=await page.evaluate(async({row,backend})=>{
    const a=await import('/src/index.ts' as string) as typeof import('../src/index');const sdk=await a.WinUI.create({globalScrollbars:false});const host=document.createElement('div');host.id='navigation-matrix';host.style.cssText='position:fixed;left:0;top:0;width:800px;height:450px;z-index:99999';document.body.append(host);const scene=sdk.scene(host,{theme:row.theme,backend:backend as import('../src/index').RendererBackend});const canvas=scene.root.canvas({width:800,height:450});const props={...row.props,canvasLeft:24,canvasTop:24};let node:any;
    if(row.kind==='FlipView'){node=canvas.flipView({...props,fontSize:24,items:['Page 1','Page 2','Page 3'].map((text,i)=>({id:String(i),text,background:['#D9EAF7','#FFE5B4','#D5E8D4'][i]}))});}
    if(row.kind==='PipsPager'){node=canvas.pipsPager(props);}
    if(row.kind==='BreadcrumbBar'){node=canvas.breadcrumbBar({...props,items:['Home','Documents','Design','Northwind','Images','Folder1','Folder2','Folder3']});}
    if(row.kind==='TreeView'){const {expanded,multi,selected,...layout}=props;node=canvas.treeView({...layout,selectionMode:multi?a.TreeViewSelectionMode.Multiple:a.TreeViewSelectionMode.Single,items:[{id:'docs',text:'Documents',isExpanded:expanded,children:[{id:'proposal',text:'ProjectProposal'},{id:'budget',text:'BudgetReport'}]},{id:'pictures',text:'Pictures',children:[{id:'photo',text:'Photo'}]}]});if(selected)node.selectNode('proposal');}
    if(row.kind==='TabView'){const {state,...layout}=props;node=canvas.tabView({...layout,items:['Document 0','Long document 1','Document 2'].map((text,i)=>({id:String(i),text,icon:'\uE8A5',enabled:!(i===0&&state==='Disabled')}))});node.setItemTemplate((_:unknown,slot:any)=>slot.container.grid({background:'#ffffff'}).text({text:`Content ${slot.index}`,fontSize:24,horizontalAlignment:a.HorizontalAlignment.Center,verticalAlignment:a.VerticalAlignment.Center}));}
    await new Promise(r=>setTimeout(r,row.kind==='TabView'?800:400));const state=scene.snapshot;(window as any).__navMatrix={scene,sdk,host,node};return {rect:node.snapshot.rect,parts:node.snapshot.navigationControl.parts,rows:node.snapshot.navigationControl.treeRows,nodes:state.nodes.map(n=>({kind:n.kind,rect:n.rect,world:n.world,props:n.props}))};
   },{row,backend});
   if(row.state==='PointerOver'||row.state==='Pressed'){
    const part=result.parts.find((p:any)=>p.role===(row.kind==='TabView'?'tab':'pip'));if(part){await page.mouse.move(24+part.rect.x+part.rect.width/2,24+part.rect.y+part.rect.height/2);if(row.state==='Pressed')await page.mouse.down();await page.waitForTimeout(30);}
   }
   const image=Buffer.from(await page.locator('#navigation-matrix canvas').first().evaluate((c:HTMLCanvasElement)=>{(window as any).__navMatrix.scene.draw();return c.toDataURL('image/png').split(',')[1];}),'base64');writeFileSync(`${folder}/${row.id}.png`,image);const native=PNG.sync.read(readFileSync(`../out/navigation-controls-native/${row.id}.png`)),actual=PNG.sync.read(image);expect(actual.width).toBe(native.width);expect(Math.abs(actual.height-native.height)).toBeLessThanOrEqual(1);
   const [x,y,w,h]=row.rect,px=Math.floor(x*1.25),py=Math.floor(y*1.25),right=Math.ceil((x+w+4)*1.25),bottom=Math.min(actual.height,native.height,Math.ceil((y+h+4)*1.25));let sum=0,samples=0,different=0;
   for(let j=py;j<bottom;j++)for(let i=px;i<Math.min(right,actual.width);i++){let max=0;for(let c=0;c<3;c++){const delta=Math.abs(actual.data[(j*actual.width+i)*4+c]-native.data[(j*native.width+i)*4+c]);sum+=delta;samples++;max=Math.max(max,delta);}if(max>25)different++;}
   expect(actual.data[(Math.floor((y+8)*1.25)*actual.width+Math.floor((x+8)*1.25))*4+3],`${row.id}: rendered alpha`).toBe(255);expect(sum/samples,`${row.id}: native image error`).toBeLessThan(40);let partGeometryError:number|undefined;
   if(row.kind==='BreadcrumbBar'){partGeometryError=0;const nativeParts=row.parts.filter((p:any)=>p.type==='BreadcrumbBarItem'&&Math.abs(p.rect[1]-y)<0.1);for(const p of result.parts){const expected=nativeParts.find((n:any)=>p.role==='ellipsis'?n.text===null:n.text===p.label);expect(expected,`${row.id}: ${p.key}`).toBeTruthy();for(const [at,value] of [[0,p.rect.x],[2,p.rect.width]] as const)partGeometryError=Math.max(partGeometryError,Math.abs(value-(expected.rect[at]-(at===0?x:0))));}expect(partGeometryError,`${row.id}: native breadcrumb part geometry`).toBeLessThanOrEqual(0.81);}
   const dimensions=[result.rect.width-w,result.rect.height-h];expect(Math.max(...dimensions.map(Math.abs)),row.id).toBeLessThanOrEqual(0.81);results.push({id:row.id,backend,dimensions,partGeometryError,meanAbsoluteColorError:sum/samples,differentPixelsOver25:different,rect:result.rect,parts:result.parts,rows:result.rows});
   if(row.state==='Pressed')await page.mouse.up();await page.mouse.move(799,449);await page.evaluate(()=>{const m=(window as any).__navMatrix;m.scene.dispose();m.sdk.dispose();m.host.remove();delete (window as any).__navMatrix;});
  }
 }
 writeFileSync('../references/navigation-controls-visual.json',JSON.stringify({nativeKind:'same-SDK RenderTargetBitmap probe; not Store Composition acceptance',dpi:1.25,cases:results},null,2));
});
