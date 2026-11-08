import { GalleryButton, GalleryComboBox, GalleryExpander, GalleryExpanderHeader, GalleryOption } from './GalleryControls';
import { useGalleryTheme } from './gallery-theme';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {Header} from './ButtonPage';
import {SceneView,FlipView,PipsPager,BreadcrumbBar,TreeView,TabView,Grid,StackPanel,Border,Image,TextBlock,Button,ScrollViewer} from './react';
import {ThemeMode,RendererBackend,Orientation,HorizontalAlignment,VerticalAlignment,GridUnit,ImageStretch,PipsPagerButtonVisibility,PipsPagerWrapMode,TreeViewSelectionMode,TabViewWidthMode,TabViewCloseButtonOverlayMode,type Scene,type NavigationControl,type TabView as TabController,type TreeItem,type TabItem} from './index';
import official from './official-navigation-controls.json';
import data from './navigation-controls-data.json';
import source from './NavigationControlsPage.tsx?raw';
import {extractSampleSource} from './sample-source';
type Kind=keyof typeof official.controls;
declare global {interface Window {navigationScenes:Record<string,Scene>;navigationControls:Record<string,NavigationControl<any,any>>;}}
function remember(id:string,s:Scene){window.navigationScenes??={};window.navigationScenes[id]=s;}
function control(id:string,n:NavigationControl<any,any>){window.navigationControls??={};window.navigationControls[id]=n;}
function Example({id,kind,index,children,options,title}:{id:string;kind:Kind;index:number;children:ReactNode;options?:ReactNode;title?:string}){
 const[native,setNative]=useState(false);const sample=official.controls[kind].samples[index];return <section className="example basic-example" id={id}><h2>{title??sample.title}</h2><div className="example-card"><div className={`basic-live ${options?'with-options':''}`}><div className="basic-preview">{children}</div>{options&&<div className="options">{options}</div>}</div><GalleryExpander className="source"><GalleryExpanderHeader>Source code</GalleryExpanderHeader><div className="source-tabs"><GalleryButton className={!native?'active':''} onClick={()=>setNative(false)}>TypeScript / React</GalleryButton><GalleryButton className={native?'active':''} onClick={()=>setNative(true)}>Official XAML</GalleryButton></div><pre><code>{native?sample.xaml:extractSampleSource(source,id.startsWith("tab-")&&id!=="tab-9"?"tab-0":id)}</code></pre></GalleryExpander></div></section>;
}
const images=['cliff','grapes','rainier','sunset','valley'].map(name=>({id:name,text:name[0].toUpperCase()+name.slice(1),imageSource:`/official/${name}.jpg`}));
const landscape=Array.from({length:8},(_,i)=>({id:`landscape-${i}`,text:`Landscape ${i+1}`,imageSource:`/official/LandscapeImage${i+1}.jpg`}));
const trail=['Home','Documents','Design','Northwind','Images','Folder1','Folder2','Folder3'];
const folders=['Home','Folder1','Folder2','Folder3'].map(text=>({id:text,text}));
const initialTree:TreeItem[]=[{id:'work',text:'Work Documents',isExpanded:true,children:[{id:'spec',text:'XYZ Functional Spec'},{id:'schedule',text:'Feature Schedule'}]},{id:'personal',text:'Personal Documents',isExpanded:true,children:[{id:'remodel',text:'Home Remodel',isExpanded:true,children:[{id:'contractor',text:'Contractor Contact Info'},{id:'paint',text:'Paint Color Scheme'}]}]}];
const boundTree:TreeItem[]=[{id:'documents',text:'Documents',isExpanded:true,children:[{id:'proposal',text:'ProjectProposal.docx'},{id:'budget',text:'BudgetReport.xlsx'}]},{id:'projects',text:'Projects',isExpanded:true,children:[{id:'plan',text:'Project Plan.docx'}]}];
const lorem='Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';
const auto={unit:GridUnit.Auto,value:1},star={unit:GridUnit.Star,value:1};
/** The pinned Gallery SamplePage1/2/3 content, shared by its TabView samples. */
export function TabContent({page}:{page:number}){
 if(page===1)return <ScrollViewer horizontalAlignment={HorizontalAlignment.Stretch} verticalAlignment={VerticalAlignment.Stretch}><Grid columns={[auto,star]}><Grid column={0} width={150} height={200} margin={[12,12,12,12]} background="#0078d4" verticalAlignment={VerticalAlignment.Top}/><StackPanel column={1} margin={[12,12,12,12]}><TextBlock text="Lorem ipsum dolor sit amet, consectetur adipiscing elit" fontSize={28} fontWeight={600} wrap margin={[0,0,0,12]}/><TextBlock text={lorem} wrap/></StackPanel></Grid></ScrollViewer>;
 const third=page===2;return <ScrollViewer horizontalAlignment={HorizontalAlignment.Stretch} verticalAlignment={VerticalAlignment.Stretch}><Grid columns={[third?{unit:GridUnit.Star,value:2}:auto,star,star]} rows={[auto,auto,auto,star]}><Grid row={1} rowSpan={2} minWidth={third?0:250} minHeight={150} margin={[5,5,5,5]} background={third?'#d3d3d3':'#0078d4'}/>{[[1,1],[1,2],[2,1],[2,2]].map(([row,column])=><Grid key={`${row}:${column}`} row={row} column={column} minHeight={150} margin={third?[5,5,5,5]:[6,6,6,6]} background={third?(row===2&&column===1?'#808080':row===column?'#a9a9a9':'#d3d3d3'):(row===column?'#a9a9a9':'#d3d3d3')}/>)}<Grid row={3} columnSpan={3} margin={third?[5,5,5,5]:[6,12,6,12]}><TextBlock text={lorem} wrap/></Grid></Grid></ScrollViewer>;
}
function TabSample({index,shared}:{index:number;shared:{theme:ThemeMode;backend:RendererBackend}}){
 const[items,setItems]=useState<TabItem[]>(()=>(index===5||index===6?['Home','Tab 2 Has Longer Text','Third Tab']:index===2?['MyData Doc 0','MyData Doc 1','MyData Doc 2']:['Document 0','Document 1','Document 2']).map((text,i)=>({id:`tab-${i}`,text,icon:index===5||index===6?['\uE80F','\uE90B','\uE18A'][i]:index===1||index===2?'\uE18A':'\uE8A5'})));
 const[widthMode,setWidthMode]=useState(index===4||index===5||index===7?TabViewWidthMode.SizeToContent:TabViewWidthMode.Equal),[closeMode,setCloseMode]=useState(index===6?TabViewCloseButtonOverlayMode.Always:TabViewCloseButtonOverlayMode.Auto),[message,setMessage]=useState('');
 const count=useRef(3),node=useRef<TabController<TabItem>|null>(null),id=`tab-${index}`;
 const add=()=>{const i=count.current++;setItems(old=>[...old,{id:`tab-${i}`,text:`${index===2?'MyData Doc':'Document'} ${i}`,icon:index===2?'\uE18A':'\uE8A5'}]);requestAnimationFrame(()=>node.current?.select(items.length));};
 const colorItems=items.map((item,i)=>({...item,text:['CMD Prompt','PowerShell','Windows Subsystem for Linux'][i%3],isClosable:false,icon:'',imageSource:`/official/${['cmd','powershell','linux'][i%3]}.png`}));
 if(index===9)return <Example id={id} kind="TabView" index={index}><SceneView {...shared} autoHeight>
 {/* @sample:tab-9:start */}
 <Button text="Open Windowing Sample" onClick={()=>window.open(`${location.pathname}#tab-view-window`,'_blank','width=900,height=600')}/>
 {/* @sample:tab-9:end */}
 </SceneView><p>The web host opens a separate browser window for this sample.</p></Example>;
 return <Example id={id} kind="TabView" index={index} options={index===5?<label>TabWidthBehavior<GalleryComboBox value={widthMode} onValueChanged={e=>setWidthMode(e as TabViewWidthMode)}>{Object.values(TabViewWidthMode).map(v=><GalleryOption key={v}>{v}</GalleryOption>)}</GalleryComboBox></label>:index===6?<label>TabViewItem CloseButtonOverlayMode<GalleryComboBox value={closeMode} onValueChanged={e=>setCloseMode(e as TabViewCloseButtonOverlayMode)}>{Object.values(TabViewCloseButtonOverlayMode).map(v=><GalleryOption key={v}>{v}</GalleryOption>)}</GalleryComboBox></label>:undefined}>
 <div onKeyDownCapture={e=>{if(index!==3||!(e.ctrlKey||e.metaKey))return;const key=e.key.toLowerCase();if(key==='t'){e.preventDefault();e.stopPropagation();add();}else if(key==='w'){e.preventDefault();e.stopPropagation();const item=node.current?.selectedItem;if(item)setItems(old=>old.filter(i=>i.id!==item.id));}else if(/^[1-9]$/.test(key)){e.preventDefault();e.stopPropagation();node.current?.select(key==='9'?items.length-1:Math.min(Number(key)-1,items.length-1));}}}>
 <SceneView {...shared} autoHeight onReady={s=>remember(id,s)}>
 {/* @sample:tab-0:start */}
 <TabView items={index===7?colorItems:items} height={index===7?40:475} isAddTabButtonVisible={index!==5&&index!==6&&index!==7} horizontalAlignment={HorizontalAlignment.Stretch} accessibleName={`Tabs ${index+1}`} tabWidthMode={widthMode} closeButtonOverlayMode={closeMode} canReorderTabs onReady={n=>{node.current=n;control(id,n);}} onAddTabButtonClick={add} onTabCloseRequested={e=>setItems(old=>old.filter(item=>item.id!==e.item?.id))} onItemsChanged={e=>setItems([...e.items])} onTabDroppedOutside={e=>setMessage(`Dropped outside: ${e.item?.text}`)} tabStripBackground={index===8?data.accentStrip[shared.theme]:undefined} tabStripHeaderWidth={index===4?185:0} tabStripFooterWidth={index===4?185:0} tabStripHeader={index===4?<TextBlock text="TabStripHeader Content" margin={[8,6,8,6]} verticalAlignment={VerticalAlignment.Center} fontWeight={600}/>:undefined} tabStripFooter={index===4?<TextBlock text="TabStripFooter Content" margin={[6,6,6,6]} verticalAlignment={VerticalAlignment.Center} horizontalAlignment={HorizontalAlignment.Right} fontWeight={600}/>:undefined} renderContent={index===7?undefined:(_,context)=><TabContent page={context.index%3}/>}/>
 {/* @sample:tab-0:end */}
 </SceneView></div>{index===3&&<p>Ctrl+T: add · Ctrl+W / Ctrl+F4: close · Ctrl+Tab: next · Ctrl+1…9: select</p>}{message&&<output>{message}</output>}
 </Example>;
}
export function NavigationControlsPage({kind,windowed=false}:{kind:Kind;windowed?:boolean}){
 const[theme,setTheme]=useGalleryTheme(),[backend,setBackend]=useState(RendererBackend.Canvas2D),[page,setPage]=useState(0),[orientation,setOrientation]=useState(Orientation.Horizontal),[previous,setPrevious]=useState(PipsPagerButtonVisibility.Visible),[next,setNext]=useState(PipsPagerButtonVisibility.Visible),[wrap,setWrap]=useState(PipsPagerWrapMode.None),[customCrumbs,setCustomCrumbs]=useState(folders),[tree,setTree]=useState(initialTree),[selected,setSelected]=useState('');
 useEffect(()=>{document.documentElement.dataset.theme=theme;},[theme]);const shared={theme,backend};
 if(windowed)return <TabSample index={0} shared={shared}/>;
 return <div className="collections-shell"><Header title={kind} theme={theme} onTheme={setTheme}/><main className="stage-main collections-gallery"><nav className="collection-docs"><a href={`https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.${kind.toLowerCase()}`}>Documentation</a><a href={`https://github.com/microsoft/WinUI-Gallery/tree/7360ac322414e118eadfb0c7c2f4ecc31a218f59/WinUIGallery/Samples/${kind}`}>Source</a><div className="collection-renderer"><GalleryComboBox aria-label="Navigation renderer" value={backend} onValueChanged={e=>setBackend(e as RendererBackend)}>{Object.values(RendererBackend).map(v=><GalleryOption key={v}>{v}</GalleryOption>)}</GalleryComboBox></div></nav>
 {kind==='FlipView'&&<>
 <Example id="flip-basic" kind={kind} index={0}><SceneView {...shared} autoHeight onReady={s=>remember('flip-basic',s)}>
 {/* @sample:flip-basic:start */}
 <FlipView width={400} height={270} items={images} accessibleName="Photo gallery" onReady={n=>control('flip-basic',n)}/>
 {/* @sample:flip-basic:end */}
 </SceneView></Example>
 <Example id="flip-bound" kind={kind} index={1}><SceneView {...shared} autoHeight onReady={s=>remember('flip-bound',s)}>
 {/* @sample:flip-bound:start */}
 <FlipView width={400} height={180} items={data.boundFlipItems} accessibleName="Gallery topics" onReady={n=>control('flip-bound',n)} renderItem={item=><Border borderBrush="#000000" borderThickness={[1,1,1,1]}><Grid rows={[star,auto]}><Image source={item.imageSource} width={36} height={36} horizontalAlignment={HorizontalAlignment.Center} verticalAlignment={VerticalAlignment.Center}/><Border row={1} height={60} background="#ffffffa5"><TextBlock text={item.text} foreground="#000000" fontSize={28} fontWeight={600} padding={[12,12,12,12]} horizontalAlignment={HorizontalAlignment.Center}/></Border></Grid></Border>}/>
 {/* @sample:flip-bound:end */}
 </SceneView></Example>
 <Example id="flip-vertical" kind={kind} index={2}><SceneView {...shared} autoHeight onReady={s=>remember('flip-vertical',s)}>
 {/* @sample:flip-vertical:start */}
 <FlipView width={400} height={270} orientation={Orientation.Vertical} items={images} accessibleName="Vertical photo gallery" onReady={n=>control('flip-vertical',n)}/>
 {/* @sample:flip-vertical:end */}
 </SceneView></Example></>}
 {kind==='PipsPager'&&<>
 <Example id="pips-flip" kind={kind} index={0}><SceneView {...shared} autoHeight onReady={s=>remember('pips-flip',s)}>
 {/* @sample:pips-flip:start */}
 <StackPanel width={400}><FlipView height={270} width={400} items={landscape} selectedIndex={page} onSelectionChanged={e=>setPage(e.index)} onReady={n=>control('pips-flip-view',n)}/><PipsPager numberOfPages={8} selectedPageIndex={page} margin={[0,12,0,0]} horizontalAlignment={HorizontalAlignment.Center} onSelectedIndexChanged={e=>setPage(e.index)} onReady={n=>control('pips-flip',n)}/></StackPanel>
 {/* @sample:pips-flip:end */}
 </SceneView></Example>
 <Example id="pips-options" kind={kind} index={1} options={<>{[["Orientation",orientation,Object.values(Orientation),setOrientation],["Previous Button Visibility",previous,Object.values(PipsPagerButtonVisibility),setPrevious],["Next Button Visibility",next,Object.values(PipsPagerButtonVisibility),setNext],["Wrap Mode",wrap,Object.values(PipsPagerWrapMode),setWrap]].map(([label,value,values,change])=><label key={String(label)}>{String(label)}<GalleryComboBox aria-label={String(label)} value={String(value)} onValueChanged={e=>(change as (v:string)=>void)(e)}>{(values as string[]).map(v=><GalleryOption key={v}>{v}</GalleryOption>)}</GalleryComboBox></label>)}</>}><SceneView {...shared} autoHeight onReady={s=>remember('pips-options',s)}>
 {/* @sample:pips-options:start */}
 <PipsPager numberOfPages={10} orientation={orientation} previousButtonVisibility={previous} nextButtonVisibility={next} wrapMode={wrap} onReady={n=>control('pips-options',n)}/>
 {/* @sample:pips-options:end */}
 </SceneView></Example></>}
 {kind==='BreadcrumbBar'&&<>
 <Example id="breadcrumb-basic" kind={kind} index={0}><SceneView {...shared} autoHeight onReady={s=>remember('breadcrumb-basic',s)}>
 {/* @sample:breadcrumb-basic:start */}
 <BreadcrumbBar items={trail} horizontalAlignment={HorizontalAlignment.Stretch} accessibleName="Current path" onReady={n=>control('breadcrumb-basic',n)}/>
 {/* @sample:breadcrumb-basic:end */}
 </SceneView></Example>
 <Example id="breadcrumb-template" kind={kind} index={1} options={<GalleryButton onClick={()=>setCustomCrumbs(folders)}>Reset sample</GalleryButton>}><SceneView {...shared} autoHeight onReady={s=>remember('breadcrumb-template',s)}>
 {/* @sample:breadcrumb-template:start */}
 <BreadcrumbBar items={customCrumbs} horizontalAlignment={HorizontalAlignment.Stretch} accessibleName="Custom folder path" onItemClicked={e=>setCustomCrumbs(old=>old.slice(0,e.index+1))} onReady={n=>control('breadcrumb-template',n)} renderItem={item=><TextBlock text={item.text} verticalAlignment={VerticalAlignment.Center}/>}/>
 {/* @sample:breadcrumb-template:end */}
 </SceneView></Example></>}
 {kind==='TreeView'&&<>
 <Example id="tree-basic" kind={kind} index={0}><SceneView {...shared} autoHeight onReady={s=>remember('tree-basic',s)}>
 {/* @sample:tree-basic:start */}
 <Border width={347} height={280} borderBrush={{resource:"TextControlBorderBrush"}} borderThickness={[1,1,1,1]}><TreeView items={tree} minWidth={345} maxHeight={400} margin={[0,12,0,0]} horizontalAlignment={HorizontalAlignment.Center} accessibleName="Documents" onItemsChanged={e=>setTree([...e.items])} onItemInvoked={e=>setSelected(e.item?.text??'')} onReady={n=>control('tree-basic',n)}/></Border>
 {/* @sample:tree-basic:end */}
 </SceneView><output>{selected}</output></Example>
 <Example id="tree-multi" kind={kind} index={1}><SceneView {...shared} autoHeight onReady={s=>remember('tree-multi',s)}>
 {/* @sample:tree-multi:start */}
 <Border width={347} height={280} borderBrush={{resource:"TextControlBorderBrush"}} borderThickness={[1,1,1,1]}><TreeView items={initialTree} minWidth={345} maxHeight={400} margin={[0,12,0,0]} horizontalAlignment={HorizontalAlignment.Center} selectionMode={TreeViewSelectionMode.Multiple} accessibleName="Select documents" onReady={n=>control('tree-multi',n)}/></Border>
 {/* @sample:tree-multi:end */}
 </SceneView></Example>
 <Example id="tree-bound" kind={kind} index={2}><SceneView {...shared} autoHeight onReady={s=>remember('tree-bound',s)}>
 {/* @sample:tree-bound:start */}
 <Border width={347} height={200} borderBrush={{resource:"TextControlBorderBrush"}} borderThickness={[1,1,1,1]}><TreeView items={boundTree} minWidth={345} maxHeight={400} margin={[0,12,0,0]} horizontalAlignment={HorizontalAlignment.Center} accessibleName="Project files" onReady={n=>control('tree-bound',n)}/></Border>
 {/* @sample:tree-bound:end */}
 </SceneView></Example>
 <Example id="tree-template" kind={kind} index={3}><SceneView {...shared} autoHeight onReady={s=>remember('tree-template',s)}>
 {/* @sample:tree-template:start */}
 <Border width={347} height={200} borderBrush={{resource:"TextControlBorderBrush"}} borderThickness={[1,1,1,1]}><TreeView items={boundTree} minWidth={345} maxHeight={400} margin={[0,12,0,0]} horizontalAlignment={HorizontalAlignment.Center} accessibleName="File templates" onReady={n=>control('tree-template',n)} renderItem={item=><StackPanel orientation={Orientation.Horizontal} spacing={10}>{item.children?<Image source="/official/folder.png" width={20} height={20} stretch={ImageStretch.Uniform}/>:<TextBlock text="\uE8A5" fontFamily="Segoe Fluent Icons" width={20} height={20}/>}<TextBlock text={item.text} verticalAlignment={VerticalAlignment.Center}/></StackPanel>}/></Border>
 {/* @sample:tree-template:end */}
 </SceneView></Example></>}
 {kind==='TabView'&&official.controls.TabView.samples.map((_,i)=><TabSample key={i} index={i} shared={shared}/>)}
 </main></div>;
}
