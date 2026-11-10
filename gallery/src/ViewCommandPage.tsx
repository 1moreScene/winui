import { LocalizedText } from "./GalleryLanguage";
import { SourceCode } from './SourceCode';
import {useRef,useState,type ReactNode} from 'react';
import {Header} from './ButtonPage';
import {useGalleryTheme} from './gallery-theme';
import {GalleryButton,GalleryComboBox,GalleryOption,GalleryExpander,GalleryExpanderHeader} from './GalleryControls';
import {SceneView,SplitView,SemanticZoom,ParallaxView,UICommand,StandardCommand,StackPanel,Grid,TextBlock,ListView,GridView,ScrollView,Rectangle,Image,SymbolIcon,AppBarButton,MenuBar,MenuBarItem,MenuFlyout,SwipeControl,ToggleButton,ToggleSwitch,ComboBox,Slider} from 'winui-wasm/react';
import {RendererBackend,SplitViewDisplayMode,SplitViewPanePlacement,StandardCommandKind,KeyboardAcceleratorModifier,HorizontalAlignment,VerticalAlignment,ListViewSelectionMode,GridUnit,Symbol,SwipeMode,NodeKind,ThemeMode,type Scene,type UICommandController as CommandController,type CollectionView,type AppBarButtonController as AppButton} from 'winui-wasm';
import official from './official-view-command.json';
import source from './ViewCommandPage.tsx?raw';
import {extractSampleSource} from './sample-source';
type Kind=keyof typeof official.controls;
type Shared={theme:ThemeMode;backend:RendererBackend};
declare global {interface Window{viewCommandScenes:Record<string,Scene>;}}
function remember(name:string,scene:Scene){window.viewCommandScenes??={};window.viewCommandScenes[name]=scene;}
function Example({kind,index=0,name,children,options}:{kind:Kind;index?:number;name:string;children:ReactNode;options?:ReactNode}){
 const [native,setNative]=useState(false),sample=official.controls[kind].samples[index];
 return <section className="example basic-example" id={name}><h2><LocalizedText>{sample.title}</LocalizedText></h2><div className="example-card"><div className={`basic-live${options?' with-options':''}`}><div className="basic-preview">{children}</div>{options&&<div className="options">{options}</div>}</div><GalleryExpander className="source"><GalleryExpanderHeader>Source code</GalleryExpanderHeader><div className="source-tabs"><GalleryButton onClick={()=>setNative(false)}>TypeScript / React</GalleryButton><GalleryButton onClick={()=>setNative(true)}>Official XAML</GalleryButton></div><SourceCode language={native ? 'xaml' : 'tsx'}>{native?sample.runtimeXaml:extractSampleSource(source,name)}</SourceCode></GalleryExpander></div></section>;
}
const groups=official.data.Groups.map(group=>({id:group.UniqueId,header:group.Title,items:group.Items.map(item=>({id:item.UniqueId,text:item.Title,subtitle:item.Subtitle}))}));
const allItems=groups.flatMap(group=>group.items).sort((a,b)=>a.text.localeCompare(b.text,'en'));
const links=[{id:'People',text:'People',symbol:Symbol.People},{id:'Globe',text:'Globe',symbol:Symbol.Globe},{id:'Message',text:'Message',symbol:Symbol.Message},{id:'Mail',text:'Mail',symbol:Symbol.Mail}];
const trackAuto={unit:GridUnit.Auto},trackStar={unit:GridUnit.Star,value:1};
function SplitExample({shared}:{shared:Shared}){
 const [open,setOpen]=useState(true),[mode,setMode]=useState(SplitViewDisplayMode.Inline),[side,setSide]=useState(SplitViewPanePlacement.Left),[background,setBackground]=useState(0),[length,setLength]=useState(256),[compact,setCompact]=useState(48),[content,setContent]=useState('');
 const colors=['SystemControlBackgroundChromeMediumLowBrush','Red','Blue','Green'];const modes=[SplitViewDisplayMode.Inline,SplitViewDisplayMode.CompactInline,SplitViewDisplayMode.Overlay,SplitViewDisplayMode.CompactOverlay];
 const paneBackground=background===0?{resource:colors[0]}:['','#FF0000','#0000FF','#008000'][background];
 return <Example kind="SplitView" name="split-view-basic" options={<SceneView {...shared} autoHeight style={{width:196}}><StackPanel spacing={0}>
 <ToggleButton text="IsPaneOpen" isChecked={open} onChecked={()=>setOpen(true)} onUnchecked={()=>setOpen(false)}/>
 <ToggleSwitch header="Placement" offContent="Left" onContent="Right" isOn={side===SplitViewPanePlacement.Right} minWidth={120} margin={[0,12,0,0]} onToggled={e=>setSide(e.isOn?SplitViewPanePlacement.Right:SplitViewPanePlacement.Left)}/>
 <ComboBox header="DisplayMode" width={196} margin={[0,4,0,0]} items={modes} selectedIndex={modes.indexOf(mode)} onSelectionChanged={e=>setMode(modes[e.selectedIndex??0])}/>
 <ComboBox header="PaneBackground" width={196} margin={[0,12,0,0]} items={colors} selectedIndex={background} onSelectionChanged={e=>setBackground(e.selectedIndex??0)}/>
 <Slider header="OpenPaneLength" width={196} margin={[0,12,0,0]} minimum={128} maximum={500} stepFrequency={8} value={length} onValueChanged={e=>setLength(e.value??256)}/>
 <Slider header="CompactPaneLength" width={196} minimum={24} maximum={128} stepFrequency={8} value={compact} onValueChanged={e=>setCompact(e.value??48)}/>
 </StackPanel></SceneView>}><SceneView {...shared} style={{height:300,width:400,maxWidth:'100%'}} onReady={s=>remember('split-view-basic',s)}>
 {/* @sample:split-view-basic:start */}
 <SplitView displayMode={mode} panePlacement={side} isPaneOpen={open} openPaneLength={length} compactPaneLength={compact} paneBackground={paneBackground} onEvent={e=>{if(e.kind==='paneClosed')setOpen(false);}} >
 <SplitView.Pane><Grid rows={[trackAuto,trackStar,trackAuto]}>
  <TextBlock text="PANE CONTENT" margin={[60,12,0,0]} fontSize={14} fontWeight={600}/>
  <ListView row={1} margin={[0,12,0,0]} items={links} isItemClickEnabled selectionMode={ListViewSelectionMode.Single} onItemClick={e=>setContent(e.item.text+' Page')} renderItem={link=><Grid columns={side===SplitViewPanePlacement.Left?[trackAuto,trackStar]:[trackStar,trackAuto]} margin={side===SplitViewPanePlacement.Left?[2,0,0,0]:[0,0,2,0]}><SymbolIcon symbol={link.symbol} column={side===SplitViewPanePlacement.Left?0:1}/><TextBlock text={link.text} column={side===SplitViewPanePlacement.Left?1:0} verticalAlignment={VerticalAlignment.Center} margin={side===SplitViewPanePlacement.Left?[24,0,0,0]:[0,0,24,0]}/></Grid>}/>
 </Grid></SplitView.Pane><Grid rows={[trackAuto,trackStar]}><TextBlock text="SPLITVIEW CONTENT" fontWeight={600} margin={[12,12,0,0]}/><TextBlock text={content} row={1} margin={[12,12,0,0]}/></Grid></SplitView>
 {/* @sample:split-view-basic:end */}
 </SceneView></Example>;
}
function ZoomExample({shared}:{shared:Shared}){
 return <Example kind="SemanticZoom" name="semantic-zoom-basic"><SceneView {...shared} style={{height:500}} onReady={s=>remember('semantic-zoom-basic',s)}>
 {/* @sample:semantic-zoom-basic:start */}
 <SemanticZoom height={500} zoomedInView={<GridView groups={groups} selectionMode={ListViewSelectionMode.None} isHorizontalScrollChainingEnabled={false} renderItem={item=><StackPanel minWidth={200} margin={[12,6,12,6]}><TextBlock text={item.text} fontWeight={600}/><TextBlock text={item.subtitle} width={300} horizontalAlignment={HorizontalAlignment.Left} wrap/></StackPanel>} renderGroupHeader={group=><TextBlock text={group.header} fontSize={20} foreground={{resource:'TextFillColorPrimaryBrush'}}/>}/>} zoomedOutView={<ListView items={groups.map(group=>({id:group.id,text:group.header}))} selectionMode={ListViewSelectionMode.None} renderItem={item=><TextBlock text={item.text} fontSize={20} wrap/>}/>}/>
 {/* @sample:semantic-zoom-basic:end */}
 </SceneView></Example>;
}
const rectangleColors=['#F0F8FF','#FAEBD7','#00FFFF','#7FFFD4','#F0FFFF','#F5F5DC','#FFE4C4','#FFEBCD','#8A2BE2','#A52A2A','#DEB887','#5F9EA0','#7FFF00','#D2691E','#FF7F50','#6495ED','#FFF8DC','#DC143C','#00FFFF'];
function ParallaxExamples({shared}:{shared:Shared}){
 return <>{[0,1].map(index=><Example key={index} kind="ParallaxView" index={index} name={index?'parallax-scroll':'parallax-list'}><SceneView {...shared} style={{height:600}} onReady={s=>remember(index?'parallax-scroll':'parallax-list',s)}>
 {index===0?<>
 {/* @sample:parallax-list:start */}
 <ParallaxView source="parallax-list-source" verticalShift={500} horizontalAlignment={HorizontalAlignment.Left} verticalAlignment={VerticalAlignment.Top}><Image source="/official/parallax-cliff.jpg"/></ParallaxView>
 <ListView horizontalAlignment={HorizontalAlignment.Stretch} verticalAlignment={VerticalAlignment.Top} accessibleName="all samples" background="#00000080" items={allItems} name="parallax-list-source" renderHeader={<TextBlock text="Scroll the list to see parallaxing of image" maxWidth={280} horizontalAlignment={HorizontalAlignment.Center} verticalAlignment={VerticalAlignment.Center} fontSize={28} foreground="#FFFFFF" wrap/>} renderItem={item=><TextBlock text={item.text} foreground={{resource:'SystemControlForegroundAltHighBrush'}}/>}/>
 {/* @sample:parallax-list:end */}
 </>:<>
 {/* @sample:parallax-scroll:start */}
 <ParallaxView source="parallax-scroll-source" verticalShift={500} horizontalAlignment={HorizontalAlignment.Left} verticalAlignment={VerticalAlignment.Top}><Image source="/official/parallax-cliff.jpg"/></ParallaxView>
 <TextBlock text="Scroll the rectangles to see parallaxing of image" maxWidth={280} horizontalAlignment={HorizontalAlignment.Center} verticalAlignment={VerticalAlignment.Top} fontSize={28} foreground="#FFFFFF" wrap/>
 <ScrollView width={150} horizontalAlignment={HorizontalAlignment.Left} name="parallax-scroll-source"><StackPanel>{rectangleColors.map((fill,i)=><Rectangle key={i} fill={fill} height={150}/>)}</StackPanel></ScrollView>
 {/* @sample:parallax-scroll:end */}
 </>}
 </SceneView></Example>)}</>;
}
function CustomCommandExample({shared}:{shared:Shared}){
 const [output,setOutput]=useState('');
 return <Example kind="XamlUICommand" name="ui-command-basic"><SceneView {...shared} autoHeight onReady={s=>remember('ui-command-basic',s)}>
 {/* @sample:ui-command-basic:start */}
 <UICommand label="Custom XamlUICommand" description="This is a custom command" iconSymbol={Symbol.Favorite} accelerators={[{key:'D',modifiers:[KeyboardAcceleratorModifier.Control]}]} name="custom-command" onExecuteRequested={()=>setOutput('You fired the custom command')}/>
 <Grid rows={[trackAuto,trackAuto,trackStar]}><TextBlock text={official.controls.XamlUICommand.samples[0].description} wrap margin={[0,0,0,12]}/><Grid row={1} columns={[trackAuto,trackStar]}><AppBarButton command="custom-command"/><TextBlock text={output} column={1} margin={[8,0,0,0]} verticalAlignment={VerticalAlignment.Center}/></Grid></Grid>
 {/* @sample:ui-command-basic:end */}
 </SceneView></Example>;
}
type DeleteItem={id:string;text:string};
function DeleteRow({item,command}:{item:DeleteItem;command:CommandController|undefined}){
 const button=useRef<AppButton|null>(null);
 return <Grid onPointerEntered={()=>button.current?.update({visible:true})} onPointerExited={()=>button.current?.update({visible:false})}>
  <SwipeControl rightItems={{mode:SwipeMode.Execute,items:[{id:'delete',command,commandParameter:item.text,background:'#FF0000'}]}}><Grid verticalAlignment={VerticalAlignment.Center}><TextBlock text={item.text} fontSize={18} margin={[10,10,10,10]} horizontalAlignment={HorizontalAlignment.Left} verticalAlignment={VerticalAlignment.Center}/><AppBarButton command={command} commandParameter={item.text} visible={false} isTabStop={false} horizontalAlignment={HorizontalAlignment.Right} onReady={n=>button.current=n}/></Grid></SwipeControl>
 </Grid>;
}
function StandardCommandExample({shared}:{shared:Shared}){
 const [command,setCommand]=useState<CommandController>(),[items,setItems]=useState<DeleteItem[]>(Array.from({length:15},(_,i)=>({id:String(i),text:'List item '+i}))),list=useRef<CollectionView<DeleteItem>|null>(null);
 function remove(parameter:unknown){const chosen=typeof parameter==='string'?parameter:list.current?.selectedItems[0]?.text;if(chosen)setItems(current=>current.filter(item=>item.text!==chosen));}
 return <Example kind="StandardUICommand" name="standard-command-basic"><SceneView {...shared} autoHeight onReady={s=>remember('standard-command-basic',s)}>
 {/* @sample:standard-command-basic:start */}
 <StandardCommand standardKind={StandardCommandKind.Delete} onReady={setCommand} onExecuteRequested={event=>remove(event.parameter)}/>
 <Grid rows={[trackAuto,trackAuto,trackStar]}><TextBlock text={official.controls.StandardUICommand.samples[0].description} wrap margin={[0,0,0,12]}/>
 <MenuBar row={1}><MenuBarItem title="File" items={[{id:'new',text:'New'},{id:'open',text:'Open...'},{id:'save',text:'Save'},{id:'exit',text:'Exit'}]}/><MenuBarItem title="Edit" items={[{id:'delete',command}]}/><MenuBarItem title="Help" items={[{id:'about',text:'About'}]}/></MenuBar>
 <ListView row={2} height={500} items={items} selectionMode={ListViewSelectionMode.Single} isItemClickEnabled itemContainerStyle={{minHeight:60,padding:[0,0,0,0],borderThickness:[0,0,0,0],horizontalContentAlignment:HorizontalAlignment.Stretch,verticalContentAlignment:VerticalAlignment.Stretch}} itemHeight={60} contextFlyout={<MenuFlyout menuItems={[{id:'delete',command}]}/>} onReady={n=>list.current=n} renderItem={item=><DeleteRow item={item} command={command}/>} onContextRequested={e=>{list.current?.update({selectedKeys:[e.item.id]});}}/>
 </Grid>
 {/* @sample:standard-command-basic:end */}
 </SceneView></Example>;
}
export function ViewCommandPage({kind}:{kind:Kind}){
 const [theme,setTheme]=useGalleryTheme(),[backend,setBackend]=useState(RendererBackend.Canvas2D);const shared={theme,backend};
 return <><Header title={kind} theme={theme} onTheme={setTheme}/><div className="toolbar"><GalleryComboBox aria-label="Renderer" value={backend} onValueChanged={v=>setBackend(v as RendererBackend)}>{Object.values(RendererBackend).map(v=><GalleryOption key={v} value={v}>{v}</GalleryOption>)}</GalleryComboBox></div>{kind==='SplitView'?<SplitExample shared={shared}/>:kind==='SemanticZoom'?<ZoomExample shared={shared}/>:kind==='ParallaxView'?<ParallaxExamples shared={shared}/>:kind==='XamlUICommand'?<CustomCommandExample shared={shared}/>:<StandardCommandExample shared={shared}/>}</>;
}
