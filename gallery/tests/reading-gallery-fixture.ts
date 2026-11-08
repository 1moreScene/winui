import * as m from '../src/index';
import official from '../src/official-reading-controls.json';

/** Recreates the pinned native probe through the public SDK, with no layout code. */
export async function createReadingGalleryFixture(row:{kind:string;index:number;variant:string;id:string},backend:m.RendererBackend){
 const w=window as unknown as {readingGalleryFixture?:{sdk:m.WinUI;host:HTMLElement}};
 w.readingGalleryFixture?.sdk.dispose();w.readingGalleryFixture?.host.remove();
 const sdk=await m.WinUI.create({globalScrollbars:false}),host=document.createElement('div');
 host.id='reading-gallery-fixture';host.style.cssText='position:fixed;inset:0;width:688px;height:1000px;z-index:999999';document.body.append(host);
 const theme=row.id.startsWith('Light')?m.ThemeMode.Light:m.ThemeMode.Dark;
 const scene=sdk.scene(host,{backend,theme,reducedMotion:true,root:{background:theme===m.ThemeMode.Light?'#ffffff':'#202020'}});
 w.readingGalleryFixture={sdk,host};
 const wrapper=scene.root.canvas().grid({width:640,canvasLeft:24,canvasTop:24});
 const panels:m.SceneNode[]=[];
 const text=(p:m.Panel,value:string,options:object={})=>p.text({text:value,...options});
 const photo=(item:typeof official.items[number],slot:m.Panel,stack=false,uniform=false)=>{
  if(stack){const r=slot.relativePanel({width:480,minHeight:80,maxHeight:100});r.image({source:item.image,width:24,height:16,layoutKey:'image',margin:[0,4,0,0],relative:{alignLeftWithPanel:true,alignTopWithPanel:true}});r.text({text:item.text,layoutKey:'title',margin:[8,0,0,0],relative:{alignTopWithPanel:true,rightOf:'image'}});r.text({text:item.description,fontSize:12,wrap:true,margin:[0,4,8,4],relative:{below:'title'}});return;}
  const grid=slot.grid({width:uniform?150:undefined});grid.image({source:item.image,minWidth:uniform?undefined:70,horizontalAlignment:m.HorizontalAlignment.Center,verticalAlignment:m.VerticalAlignment.Center,stretch:m.ImageStretch.UniformToFill});
  const caption=grid.stack({height:40,padding:[5,1,5,1],verticalAlignment:m.VerticalAlignment.Bottom,background:{resource:'SystemControlBackgroundBaseMediumBrush'},opacity:.75});text(caption,item.text,{foreground:{resource:'SystemControlForegroundAltHighBrush'}});const likes=caption.stack({orientation:m.Orientation.Horizontal});text(likes,item.likes,{fontSize:12,foreground:{resource:'SystemControlForegroundAltHighBrush'}});text(likes,' Likes',{fontSize:12,foreground:{resource:'SystemControlForegroundAltHighBrush'}});
 };
 if(row.kind==='RichTextBlock'){
  const paragraphs=official.controls.RichTextBlock.samples[row.index].paragraphs as m.RichTextParagraph[];
  if(row.index===2){const grid=wrapper.grid({height:300,columns:[{unit:m.GridUnit.Star},{unit:m.GridUnit.Star},{unit:m.GridUnit.Star}]});const second=grid.richTextBlockOverflow({column:2,margin:[12,0,12,0]});const first=grid.richTextBlockOverflow({column:1,margin:[12,0,12,0],overflowContentTarget:second});const rich=grid.richTextBlock({margin:[12,0,12,0],paragraphs,textAlignment:m.TextAlignment.Justify,overflowContentTarget:first});panels.push(rich,first,second);}
  else{const rich=wrapper.richTextBlock({paragraphs,selectionHighlightColor:row.index===1?'#008000':undefined,textHighlighters:row.index===3?[{background:row.variant==='blue'?'#0000ff':'#ffff00',ranges:[{startIndex:28,length:11}]}]:undefined});panels.push(rich);if(row.variant==='selection'){await new Promise(r=>setTimeout(r,40));rich.focus();rich.select(0,100000);}}
 }
 if(row.kind==='LayoutPanel'){
  const panel=wrapper.layoutPanel({maxWidth:560,padding:[12,12,12,12],borderThickness:[1,1,1,1],borderBrush:{resource:'CardStrokeColorDefaultBrush'},cornerRadius:4,layout:row.variant==='stack'?new m.StackLayout({spacing:8}):new m.FeaturedTileLayout({spacing:8})});panels.push(panel);
  const feature=panel.border({height:96,padding:[16,16,16,16],background:{resource:'AccentFillColorDefaultBrush'},cornerRadius:4}).stack({verticalAlignment:m.VerticalAlignment.Center});text(feature,'Featured item',{fontWeight:600,foreground:{resource:'TextOnAccentFillColorPrimaryBrush'}});text(feature,'The first child spans the available width.',{foreground:{resource:'TextOnAccentFillColorSecondaryBrush'}});
  for(const [name,height]of [['Second',72],['Third (taller)',92],['Fourth',80],['Fifth',64],['Sixth (taller)',88],['Seventh',68],['Eighth',76],['Ninth (taller)',96]]as const)text(panel.border({height,padding:[12,12,12,12],background:{resource:'ControlFillColorDefaultBrush'},cornerRadius:4}),name,{verticalAlignment:m.VerticalAlignment.Center});
 }
 if(row.kind==='ItemsView'){
  const stack=wrapper.stack();
  if(row.index===0){text(stack,'This is a basic ItemsView which uses its default StackLayout layout and a simple ItemTemplate.\nHit the Enter key, double-click or double-tap an item to invoke it.',{wrap:true,margin:[0,0,0,15]});const view=stack.itemsView({width:220,height:400,horizontalAlignment:m.HorizontalAlignment.Left,items:official.items,itemWidth:200,itemHeight:140,itemContainerStyle:{width:200,height:140,horizontalAlignment:m.HorizontalAlignment.Left},isItemInvokedEnabled:true});view.setItemTemplate((item,slot)=>slot.image({source:item.image,margin:[4,4,4,4],horizontalAlignment:m.HorizontalAlignment.Center,verticalAlignment:m.VerticalAlignment.Center,stretch:m.ImageStretch.UniformToFill}));panels.push(view);}
  else{if(row.index===1)text(stack,'Use the options on the right to control different layout customizations to the ItemsView below.',{wrap:true,margin:[0,0,0,15]});else stack.richTextBlock({paragraphs:official.controls.ItemsView.samples[2].paragraphs as m.RichTextParagraph[],margin:[0,0,0,15]});const view=stack.itemsView({maxWidth:500,height:400,items:official.items,itemAspectRatios:row.index===1?official.items.map(i=>i.aspectRatio):undefined,selectionMode:row.index===2?m.ItemsViewSelectionMode.Multiple:m.ItemsViewSelectionMode.Single,layout:row.index===2?new m.UniformGridLayout({minItemWidth:150,maximumRowsOrColumns:3,minColumnSpacing:5,minRowSpacing:5}):row.variant==='stack'?new m.StackLayout({spacing:5}):row.variant==='uniform'?new m.UniformGridLayout({minItemWidth:150,minRowSpacing:5,minColumnSpacing:5,maximumRowsOrColumns:3}):new m.LinedFlowLayout({lineHeight:row.variant==='small'?80:160,lineSpacing:5,minItemSpacing:5,itemsStretch:m.LinedFlowLayoutItemsStretch.Fill})});view.setItemTemplate((item,slot)=>photo(item,slot,row.variant==='stack',row.variant==='uniform'||row.index===2));panels.push(view);if(row.index===2){view.select(1);view.select(3);}}
 }
 if(row.kind==='AnnotatedScrollBar'){
  const grid=wrapper.grid({height:500,columns:[{unit:m.GridUnit.Star},{unit:m.GridUnit.Auto}]});
  const scroll=grid.scrollView({maxWidth:800,height:500,verticalScrollBarVisibility:m.ScrollBarVisibility.Hidden,background:'#d3d3d3'});
  const sections=[{text:'Azure',color:'#f0ffff',count:32},{text:'Crimson',color:'#dc143c',count:50},{text:'Cyan',color:'#00ffff',count:8},{text:'Fuchsia',color:'#ff00ff',count:70},{text:'Gold',color:'#ffd700',count:90}];const data=sections.flatMap(s=>Array.from({length:s.count},(_,i)=>({id:s.text+i,text:s.color}))),labels=sections.map((s,i)=>({text:s.text,itemIndex:sections.slice(0,i).reduce((n,s)=>n+s.count,0)}));
  const repeater=scroll.itemsRepeater({items:data,margin:[2,2,2,2],layout:new m.UniformGridLayout()});repeater.setItemTemplate((item,slot)=>slot.border({width:112,height:82,margin:[4,4,4,4],background:item.text,cornerRadius:4}));
  panels.push(grid.annotatedScrollBar({column:1,maxHeight:row.variant==='short'?150:500,margin:[4,0,48,0],horizontalAlignment:m.HorizontalAlignment.Right,scrollTarget:scroll,labelItemSource:repeater,labels}));
 }
 if(row.kind==='PagerControl'){
  const stack=wrapper.stack({spacing:row.index===0?0:20});
  if(row.index===0)panels.push(stack.pagerControl({numberOfPages:12,selectedPageIndex:2}));
  else{if(row.index===2)text(stack,'Set NumberOfPages to -1 when the final page is not known. Unbounded pagers omit the total-page count and last-page navigation.',{wrap:true});for(const [title,displayMode]of [['Number box',m.PagerControlDisplayMode.NumberBox],['Button panel',m.PagerControlDisplayMode.ButtonPanel]]as const){const group=stack.stack({spacing:8});text(group,title,{fontWeight:600});panels.push(group.pagerControl({displayMode,numberOfPages:row.index===1?(displayMode===m.PagerControlDisplayMode.NumberBox?50:20):-1,selectedPageIndex:row.index===1?(displayMode===m.PagerControlDisplayMode.NumberBox?9:4):99}));}}
 }
 await new Promise(r=>setTimeout(r,160));
 return{rect:wrapper.snapshot.rect,parts:panels.map(p=>({kind:p.snapshot.kind,rect:p.snapshot.rect,world:p.snapshot.world,reading:p.snapshot.reading,collection:p.snapshot.collection})),nodes:scene.snapshot.nodes,backend:scene.diagnostics,buildVersion:m.WinUI.buildVersion};
}
