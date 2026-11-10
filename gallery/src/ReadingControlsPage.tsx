import { LocalizedText } from "./GalleryLanguage";
import { SourceCode } from './SourceCode';
import {useState,type ReactNode} from 'react';
import {Header} from './ButtonPage';
import {useGalleryTheme} from './gallery-theme';
import {SceneView,ItemsView,PagerControl,AnnotatedScrollBar,LayoutPanel,RichTextBlock,RichTextBlockOverflow,Border,TextBlock,StackPanel,Image,Grid,ScrollView,ItemsRepeater,RelativePanel,RadioButtons,Slider,NumberBox,CheckBox,ComboBox} from 'winui-wasm/react';
import {RendererBackend,PagerControlDisplayMode,ItemsViewSelectionMode,StackLayout,UniformGridLayout,LinedFlowLayout,FeaturedTileLayout,GridUnit,HorizontalAlignment,VerticalAlignment,ImageStretch,TextAlignment,TextTrimming,LinedFlowLayoutItemsStretch,type RichTextParagraph,type Scene} from 'winui-wasm';
import {GalleryComboBox,GalleryOption,GalleryExpander,GalleryExpanderHeader,GalleryButton} from './GalleryControls';
import official from './official-reading-controls.json';
import source from './ReadingControlsPage.tsx?raw';
import {extractSampleSource} from './sample-source';
declare global{interface Window{readingScenes:Record<string,Scene>;}}
type Kind=keyof typeof official.controls;
type Item=typeof official.items[number];
const items=official.items;
const sections=[{text:'Azure',color:'#f0ffff',count:32},{text:'Crimson',color:'#dc143c',count:50},{text:'Cyan',color:'#00ffff',count:8},{text:'Fuchsia',color:'#ff00ff',count:70},{text:'Gold',color:'#ffd700',count:90}];
const colorItems=sections.flatMap(s=>Array.from({length:s.count},(_,i)=>({id:s.text+i,text:s.color})));
const labels=sections.map((s,i)=>({text:s.text,itemIndex:sections.slice(0,i).reduce((n,s)=>n+s.count,0)}));
const richParagraphs=(index:number)=>official.controls.RichTextBlock.samples[index].paragraphs as RichTextParagraph[];
function remember(key:string,s:Scene){window.readingScenes??={};window.readingScenes[key]=s;}
function Source({name,xaml}:{name:string;xaml:string}){const[native,setNative]=useState(false);return <GalleryExpander className="sample-source"><GalleryExpanderHeader>Source code</GalleryExpanderHeader><div><GalleryButton onClick={()=>setNative(false)}>React SDK</GalleryButton><GalleryButton onClick={()=>setNative(true)}>Official XAML</GalleryButton><SourceCode language={native ? 'xaml' : 'tsx'}>{native?xaml:extractSampleSource(source,name)}</SourceCode></div></GalleryExpander>;}
function Photo({item,stack=false,uniform=false}:{item:Item;stack?:boolean;uniform?:boolean}){return stack?<RelativePanel width={480} minHeight={80} maxHeight={100}><Image source={item.image} width={24} height={16} margin={[0,4,0,0]} layoutKey="image" stretch={ImageStretch.UniformToFill} relative={{alignLeftWithPanel:true,alignTopWithPanel:true}}/><TextBlock text={item.text} layoutKey="title" margin={[8,0,0,0]} relative={{alignTopWithPanel:true,rightOf:'image'}}/><TextBlock text={item.description} fontSize={12} wrap trimming={TextTrimming.WordEllipsis} margin={[0,4,8,4]} relative={{below:'title'}}/></RelativePanel>:<Grid width={uniform?150:undefined}><Image source={item.image} minWidth={uniform?undefined:70} horizontalAlignment={HorizontalAlignment.Center} verticalAlignment={VerticalAlignment.Center} stretch={ImageStretch.UniformToFill}/><StackPanel height={40} padding={[5,1,5,1]} verticalAlignment={VerticalAlignment.Bottom} background={{resource:'SystemControlBackgroundBaseMediumBrush'}} opacity={0.75}><TextBlock text={item.text} foreground={{resource:'SystemControlForegroundAltHighBrush'}}/><StackPanel orientation={importOrientation.Horizontal}><TextBlock text={item.likes} fontSize={12} foreground={{resource:'SystemControlForegroundAltHighBrush'}}/><TextBlock text=" Likes" fontSize={12} foreground={{resource:'SystemControlForegroundAltHighBrush'}}/></StackPanel></StackPanel></Grid>;}
import {Orientation as importOrientation} from 'winui-wasm';
export function ReadingControlsPage({kind}:{kind:Kind}){
 const[theme,setTheme]=useGalleryTheme(),[backend,setBackend]=useState(RendererBackend.Canvas2D);const[output,setOutput]=useState(''),[invokedOutput,setInvokedOutput]=useState(''),[selectionOutput,setSelectionOutput]=useState('');
 const[layout,setLayout]=useState(0),[spacing,setSpacing]=useState(5),[lineSpacing,setLineSpacing]=useState(5),[itemSpacing,setItemSpacing]=useState(5),[lineHeight,setLineHeight]=useState(160),[columns,setColumns]=useState(3),[rowSpacing,setRowSpacing]=useState(5),[columnSpacing,setColumnSpacing]=useState(5);
 const[selection,setSelection]=useState(ItemsViewSelectionMode.Multiple),[invoke,setInvoke]=useState(false),[height,setHeight]=useState(500);
 const[panelLayout,setPanelLayout]=useState(0),[panelSpacing,setPanelSpacing]=useState(8),[highlight,setHighlight]=useState(0);
 const shared={theme,backend};const samples=official.controls[kind].samples;
 const sample=(name:string,index:number,child:ReactNode,options?:ReactNode)=><section id={name} className="basic-example example"><h2><LocalizedText>{samples[index]?.title||kind}</LocalizedText></h2><div className="example-card"><div className={`basic-live ${options?'with-options':''}`}><div className="basic-preview">{child}</div>{options&&<aside className="options">{options}</aside>}<aside className="basic-output"><h3><LocalizedText>Output</LocalizedText></h3><output>{name==='items-view-selection'?[selectionOutput,invokedOutput].filter(Boolean).join('\n'):output}</output></aside></div><Source name={name} xaml={samples[index]?.runtimeXaml??samples[index]?.xaml??''}/></div></section>;
 return <div className="collections-shell"><Header title={kind} theme={theme} onTheme={setTheme}/><main className="stage-main collections-gallery"><div className="stage-toolbar"><label>Renderer <GalleryComboBox value={backend} onValueChanged={v=>{setBackend(v as RendererBackend);}}>{Object.values(RendererBackend).map(v=><GalleryOption key={v} value={v}>{v}</GalleryOption>)}</GalleryComboBox></label></div>
 {kind==='PagerControl'&&<>
 {sample('pager-basic',0,<SceneView {...shared} autoHeight autoWidth onReady={s=>remember('pager-basic',s)}>
 {/* @sample:pager-basic:start */}
 <PagerControl numberOfPages={12} selectedPageIndex={2} prefixText="Page" suffixText="of" onSelectedIndexChanged={e=>setOutput(`Page ${e.newPageIndex+1}`)}/>
 {/* @sample:pager-basic:end */}
 </SceneView>)}
 {sample('pager-modes',1,<SceneView {...shared} autoHeight autoWidth onReady={s=>remember('pager-modes',s)}>
 {/* @sample:pager-modes:start */}
 <StackPanel spacing={20}><StackPanel spacing={8}><TextBlock text="Number box" fontWeight={600}/><PagerControl displayMode={PagerControlDisplayMode.NumberBox} numberOfPages={50} selectedPageIndex={9} prefixText="Page" suffixText="of"/></StackPanel><StackPanel spacing={8}><TextBlock text="Button panel" fontWeight={600}/><PagerControl displayMode={PagerControlDisplayMode.ButtonPanel} numberOfPages={20} selectedPageIndex={4} onSelectedIndexChanged={e=>setOutput(`Page ${e.newPageIndex+1}`)}/></StackPanel></StackPanel>
 {/* @sample:pager-modes:end */}
 </SceneView>)}
 {sample('pager-unbounded',2,<SceneView {...shared} autoHeight autoWidth onReady={s=>remember('pager-unbounded',s)}>
 {/* @sample:pager-unbounded:start */}
 <StackPanel spacing={20}><TextBlock text="Set NumberOfPages to -1 when the final page is not known. Unbounded pagers omit the total-page count and last-page navigation." wrap/><StackPanel spacing={8}><TextBlock text="Number box" fontWeight={600}/><PagerControl displayMode={PagerControlDisplayMode.NumberBox} numberOfPages={-1} selectedPageIndex={99}/></StackPanel><StackPanel spacing={8}><TextBlock text="Button panel" fontWeight={600}/><PagerControl displayMode={PagerControlDisplayMode.ButtonPanel} numberOfPages={-1} selectedPageIndex={99}/></StackPanel></StackPanel>
 {/* @sample:pager-unbounded:end */}
 </SceneView>)}
 </>}
 {kind==='ItemsView'&&<>
 {sample('items-view-basic',0,<SceneView {...shared} autoHeight onReady={s=>remember('items-view-basic',s)}>
 {/* @sample:items-view-basic:start */}
 <StackPanel><TextBlock text={'This is a basic ItemsView which uses its default StackLayout layout and a simple ItemTemplate.\nHit the Enter key, double-click or double-tap an item to invoke it.'} wrap margin={[0,0,0,15]}/><ItemsView width={220} height={400} horizontalAlignment={HorizontalAlignment.Left} items={items} itemWidth={200} itemHeight={140} itemContainerStyle={{width:200,height:140,horizontalAlignment:HorizontalAlignment.Left}} isItemInvokedEnabled onItemInvoked={e=>setOutput(`You invoked ${e.item.text}.`)} renderItem={item=><Image source={item.image} margin={[4,4,4,4]} horizontalAlignment={HorizontalAlignment.Center} verticalAlignment={VerticalAlignment.Center} stretch={ImageStretch.UniformToFill}/>}/></StackPanel>
 {/* @sample:items-view-basic:end */}
 </SceneView>)}
 {sample('items-view-layout',1,<SceneView {...shared} autoHeight onReady={s=>remember('items-view-layout',s)}>
 {/* @sample:items-view-layout:start */}
 <StackPanel><TextBlock text="Use the options on the right to control different layout customizations to the ItemsView below." wrap margin={[0,0,0,15]}/><ItemsView maxWidth={500} height={400} items={items} itemAspectRatios={items.map(i=>i.aspectRatio)} layout={layout===0?new LinedFlowLayout({lineHeight,lineSpacing,minItemSpacing:itemSpacing,itemsStretch:LinedFlowLayoutItemsStretch.Fill}):layout===1?new UniformGridLayout({minItemWidth:150,minColumnSpacing:columnSpacing,minRowSpacing:rowSpacing,maximumRowsOrColumns:columns}):new StackLayout({spacing})} renderItem={item=><Photo item={item} stack={layout===2} uniform={layout===1}/>}/></StackPanel>
 {/* @sample:items-view-layout:end */}
 </SceneView>,<SceneView {...shared} autoHeight style={{width:200}}><StackPanel><RadioButtons header="Layout" items={['LinedFlowLayout','UniformGridLayout','StackLayout']} selectedIndex={layout} onSelectionChanged={e=>setLayout(e.selectedIndex??0)}/>{layout===0?<StackPanel margin={[0,15,0,0]} spacing={10}><TextBlock text="LinedFlowLayout settings" fontWeight={600}/><NumberBox header="Space between lines" value={lineSpacing} minimum={0} maximum={100} onValueChanged={e=>setLineSpacing(e.newValue??5)}/><NumberBox header="Minimum space between items on a line" value={itemSpacing} minimum={0} maximum={100} onValueChanged={e=>setItemSpacing(e.newValue??5)}/><RadioButtons header="Line height" items={['Small','Large']} selectedIndex={lineHeight===80?0:1} onSelectionChanged={e=>setLineHeight(e.selectedIndex===0?80:160)}/></StackPanel>:layout===1?<StackPanel margin={[0,15,0,0]} spacing={10}><TextBlock text="UniformGridLayout settings" fontWeight={600}/><NumberBox header="Minimum space between columns" value={columnSpacing} minimum={0} maximum={100} onValueChanged={e=>setColumnSpacing(e.newValue??5)}/><NumberBox header="Minimum space between rows" value={rowSpacing} minimum={0} maximum={100} onValueChanged={e=>setRowSpacing(e.newValue??5)}/><NumberBox header="Maximum number of items per row before wrapping" value={columns} minimum={1} maximum={8} onValueChanged={e=>setColumns(e.newValue??3)}/></StackPanel>:<NumberBox header="Space between rows" value={spacing} minimum={0} maximum={100} onValueChanged={e=>setSpacing(e.newValue??5)}/>}</StackPanel></SceneView>)}
 {sample('items-view-selection',2,<SceneView {...shared} autoHeight onReady={s=>remember('items-view-selection',s)}>
 {/* @sample:items-view-selection:start */}
 <StackPanel><RichTextBlock paragraphs={(samples[2] as typeof official.controls.ItemsView.samples[2]).paragraphs as RichTextParagraph[]} margin={[0,0,0,15]}/><ItemsView maxWidth={500} height={400} items={items} layout={new UniformGridLayout({minItemWidth:150,maximumRowsOrColumns:3,minColumnSpacing:5,minRowSpacing:5})} selectionMode={selection} isItemInvokedEnabled={invoke} onItemInvoked={e=>setInvokedOutput(`You invoked ${e.item.text}.`)} onSelectionChanged={e=>setSelectionOutput(`You have selected ${e.selectedItems.map(i=>i.text).join(', ')}.`)} renderItem={item=><Photo item={item} uniform/>}/></StackPanel>
 {/* @sample:items-view-selection:end */}
 </SceneView>,<SceneView {...shared} autoHeight style={{width:200}}><StackPanel spacing={10}><ComboBox header="SelectionMode" items={Object.values(ItemsViewSelectionMode)} selectedIndex={Object.values(ItemsViewSelectionMode).indexOf(selection)} onSelectionChanged={e=>setSelection(Object.values(ItemsViewSelectionMode)[e.selectedIndex??2])}/><CheckBox text="IsItemInvokedEnabled" isChecked={invoke} onChecked={()=>setInvoke(true)} onUnchecked={()=>setInvoke(false)}/></StackPanel></SceneView>)}
 </>}
 {kind==='AnnotatedScrollBar'&&sample('annotated-linked',0,<SceneView {...shared} autoHeight onReady={s=>remember('annotated-linked',s)}>
 {/* @sample:annotated-linked:start */}
 <Grid columns={[{unit:GridUnit.Star},{unit:GridUnit.Auto}]} height={500}><ScrollView maxWidth={800} height={500} verticalScrollBarVisibility={importScroll.Hidden} background="#d3d3d3" name="annotated-scroll"><ItemsRepeater margin={[2,2,2,2]} items={colorItems} name="annotated-items" layout={new UniformGridLayout()} renderItem={item=><Border width={112} height={82} margin={[4,4,4,4]} background={item.text} cornerRadius={4}/>}/></ScrollView><AnnotatedScrollBar column={1} maxHeight={height} margin={[4,0,48,0]} horizontalAlignment={HorizontalAlignment.Right} scrollTarget="annotated-scroll" labelItemSource="annotated-items" labels={labels} onScrolling={e=>setOutput(`${e.scrollingEventKind}: ${Math.round(e.scrollOffset)}`)}/></Grid>
 {/* @sample:annotated-linked:end */}
 </SceneView>,<SceneView {...shared} autoHeight style={{width:200}}><StackPanel><TextBlock text="Changing the AnnotatedScrollBar height refreshes its Labels layout." wrap/><Slider header="AnnotatedScrollBar maximum height:" minimum={100} maximum={500} value={height} margin={[0,10,0,0]} onValueChanged={e=>setHeight(e.value??500)}/></StackPanel></SceneView>)}
 {kind==='LayoutPanel'&&sample('layout-panel-featured',0,<SceneView {...shared} autoHeight autoWidth onReady={s=>remember('layout-panel-featured',s)}>
 {/* @sample:layout-panel-featured:start */}
 <LayoutPanel maxWidth={560} padding={[12,12,12,12]} borderThickness={[1,1,1,1]} borderBrush={{resource:'CardStrokeColorDefaultBrush'}} cornerRadius={4} layout={panelLayout===0?new FeaturedTileLayout({spacing:panelSpacing}):new StackLayout({spacing:panelSpacing})}><Border height={96} padding={[16,16,16,16]} background={{resource:'AccentFillColorDefaultBrush'}} cornerRadius={4}><StackPanel verticalAlignment={VerticalAlignment.Center}><TextBlock text="Featured item" fontWeight={600} foreground={{resource:'TextOnAccentFillColorPrimaryBrush'}}/><TextBlock text="The first child spans the available width." foreground={{resource:'TextOnAccentFillColorSecondaryBrush'}}/></StackPanel></Border>{[{text:'Second',height:72},{text:'Third (taller)',height:92},{text:'Fourth',height:80},{text:'Fifth',height:64},{text:'Sixth (taller)',height:88},{text:'Seventh',height:68},{text:'Eighth',height:76},{text:'Ninth (taller)',height:96}].map(item=><Border key={item.text} height={item.height} padding={[12,12,12,12]} background={{resource:'ControlFillColorDefaultBrush'}} cornerRadius={4}><TextBlock text={item.text} verticalAlignment={VerticalAlignment.Center}/></Border>)}</LayoutPanel>
 {/* @sample:layout-panel-featured:end */}
 </SceneView>,<SceneView {...shared} autoHeight style={{width:220}}><StackPanel spacing={12}><RadioButtons header="Layout" items={['Featured tiles','Vertical stack']} selectedIndex={panelLayout} onSelectionChanged={e=>setPanelLayout(e.selectedIndex??0)}/><Slider header="Spacing" minimum={0} maximum={24} stepFrequency={2} value={panelSpacing} onValueChanged={e=>setPanelSpacing(e.value??8)}/><TextBlock text="LayoutPanel also applies its BorderBrush, BorderThickness, CornerRadius, and Padding around the layout." wrap/></StackPanel></SceneView>)}
 {kind==='RichTextBlock'&&<>
 {sample('rich-text-basic',0,<SceneView {...shared} autoHeight onReady={s=>remember('rich-text-basic',s)}>
 {/* @sample:rich-text-basic:start */}
 <RichTextBlock paragraphs={richParagraphs(0)}/>
 {/* @sample:rich-text-basic:end */}
 </SceneView>)}
 {sample('rich-text-formatted',1,<SceneView {...shared} autoHeight onReady={s=>remember('rich-text-formatted',s)}>
 {/* @sample:rich-text-formatted:start */}
 <RichTextBlock paragraphs={richParagraphs(1)} selectionHighlightColor="#008000" onHyperlinkClick={e=>setOutput(e.text??'')} onSelectionChanged={e=>setOutput(e.text)}/>
 {/* @sample:rich-text-formatted:end */}
 </SceneView>)}
 {sample('rich-text-overflow',2,<SceneView {...shared} autoHeight onReady={s=>remember('rich-text-overflow',s)}>
 {/* @sample:rich-text-overflow:start */}
 <Grid height={300} columns={[{unit:GridUnit.Star},{unit:GridUnit.Star},{unit:GridUnit.Star}]}><RichTextBlock margin={[12,0,12,0]} textAlignment={TextAlignment.Justify} paragraphs={richParagraphs(2)} overflowContentTarget="overflow-first"/><RichTextBlockOverflow margin={[12,0,12,0]} column={1} name="overflow-first" overflowContentTarget="overflow-second"/><RichTextBlockOverflow margin={[12,0,12,0]} column={2} name="overflow-second"/></Grid>
 {/* @sample:rich-text-overflow:end */}
 </SceneView>)}
 {sample('rich-text-highlighting',3,<SceneView {...shared} autoHeight onReady={s=>remember('rich-text-highlighting',s)}>
 {/* @sample:rich-text-highlighting:start */}
 <RichTextBlock paragraphs={richParagraphs(3)} textHighlighters={[{background:['#ffff00','#ff0000','#0000ff'][highlight],ranges:[{startIndex:28,length:11}]}]}/>
 {/* @sample:rich-text-highlighting:end */}
 </SceneView>,<SceneView {...shared} autoHeight style={{width:200}}><ComboBox header="Text highlighting color" items={['Yellow','Red','Blue']} selectedIndex={highlight} onSelectionChanged={e=>setHighlight(e.selectedIndex??0)}/></SceneView>)}
 </>}
 </main></div>;
}
import {ScrollBarVisibility as importScroll} from 'winui-wasm';
