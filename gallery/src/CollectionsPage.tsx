import { LocalizedText } from "./GalleryLanguage";
import { SourceCode } from './SourceCode';
import { GalleryButton, GalleryCheckBox, GalleryComboBox, GalleryExpander, GalleryExpanderHeader, GalleryNumberBox, GalleryOption } from './GalleryControls';
import { useGalleryTheme } from './gallery-theme';
import{useEffect,useMemo,useState,type ReactNode}from'react';
import{Header}from'./ButtonPage';
import{SceneView,ListView,GridView,ItemsStackPanel,ItemsWrapGrid,VariableSizedWrapGrid,TextBlock,Grid,Image,Button,MenuFlyout,Border,Rectangle,StackPanel,RadioButtons,TextBox,ToggleSwitch}from'winui-wasm/react';
import{ThemeMode,ItemsUpdatingScrollMode,ImageStretch,TextTrimming,GridUnit,RendererBackend,ListViewSelectionMode,Orientation,HorizontalAlignment,VerticalAlignment,FlowDirection,type Scene,type CollectionView,type CollectionScrollPosition}from'winui-wasm';
import{ContactTemplate,PhotoItem,type PhotoTemplate}from'./CollectionTemplates';
import data from'./collections-data.json';import official from'./official-collections.json';import source from'./CollectionsPage.tsx?raw';import templateSource from'./CollectionTemplates.tsx?raw';import{extractSampleSource}from'./sample-source';
type Kind='ListView'|'GridView'|'ItemsStackPanel'|'ItemsWrapGrid'|'VariableSizedWrapGrid';
declare global{interface Window{collectionScenes:Record<string,Scene>;collectionViews:Record<string,CollectionView>;}}
function remember(name:string,scene:Scene){window.collectionScenes??={};window.collectionScenes[name]=scene;}
function view(name:string,node:CollectionView){window.collectionViews??={};window.collectionViews[name]=node;}
function Example({id,title,children,options,kind,index}:{id:string;title:string;children:ReactNode;options?:ReactNode;kind?:keyof typeof official.controls;index?:number}){const[native,setNative]=useState(false);return<section className="example basic-example" id={id}><h2><LocalizedText>{title}</LocalizedText></h2><div className="example-card"><div className={`basic-live ${options?'with-options':''}`}><div className="basic-preview">{children}</div>{options&&<div className="options">{options}</div>}</div><GalleryExpander className="source"><GalleryExpanderHeader>Source code</GalleryExpanderHeader><div className="source-tabs"><GalleryButton className={!native?'active':''} onClick={()=>setNative(false)}>TypeScript / React</GalleryButton>{kind&&<GalleryButton className={native?'active':''} onClick={()=>setNative(true)}>Official XAML</GalleryButton>}</div><SourceCode language={native ? 'xaml' : 'tsx'}>{native&&kind?official.controls[kind].samples[index??0].xaml:extractSampleSource(source,id)}</SourceCode>{!native&&(kind==="ListView"||kind==="GridView")&&<section className="source-context"><h3><LocalizedText>Item template</LocalizedText></h3><SourceCode>{templateSource}</SourceCode></section>}</GalleryExpander></div></section>;}
function Mode({value,onChange}:{value:ListViewSelectionMode;onChange:(mode:ListViewSelectionMode)=>void}){return<label>SelectionMode<GalleryComboBox aria-label="Selection mode" value={value} onValueChanged={e=>onChange(e as ListViewSelectionMode)}>{Object.values(ListViewSelectionMode).map(v=><GalleryOption key={v}>{v}</GalleryOption>)}</GalleryComboBox></label>;}
const frame={borderBrush:{resource:'ControlStrongStrokeColorDefaultBrush'},borderThickness:[1,1,1,1] as[number,number,number,number],horizontalAlignment:HorizontalAlignment.Left};
export function CollectionsPage({kind}:{kind:Kind}){
 const[sticky,setSticky]=useState(false),[canDrag,setCanDrag]=useState(false),[canReorder,setCanReorder]=useState(false),[allowDrop,setAllowDrop]=useState(false);
 const[theme,setTheme]=useGalleryTheme(),[backend,setBackend]=useState(RendererBackend.Canvas2D),[mode,setMode]=useState(ListViewSelectionMode.Single),[orientation,setOrientation]=useState(Orientation.Vertical),[maximum,setMaximum]=useState(3),[columnSpace,setColumnSpace]=useState(5),[rowSpace,setRowSpace]=useState(5),[firstName,setFirstName]=useState(''),[lastName,setLastName]=useState(''),[company,setCompany]=useState(''),[clickEnabled,setClickEnabled]=useState(false),[large,setLarge]=useState(false),[clicked,setClicked]=useState(''),[selected,setSelected]=useState(''),[basicClicked,setBasicClicked]=useState(''),[template,setTemplate]=useState<PhotoTemplate>('ImageTemplate'),[rtl,setRtl]=useState(false);
 const [messages,setMessages]=useState([{id:'message-1',text:'Message 1',date:new Date().toLocaleString(),received:false}]),[imageItems,setImageItems]=useState(data.photos),[contextItems,setContextItems]=useState(data.contacts),[contextKey,setContextKey]=useState(''),[savedPosition,setSavedPosition]=useState<CollectionScrollPosition|null>(null);
 const numbered=useMemo(()=>data.contacts.map((c,i)=>({id:c.id,text:`${i+1}. ${c.text}`})),[]);
 const addMessage=(received:boolean)=>setMessages(old=>[...old,{id:`message-${old.length+1}`,text:`Message ${old.length+1}`,date:new Date().toLocaleString(),received}]);
 const [dragLeft,setDragLeft]=useState(data.contacts),[dragRight,setDragRight]=useState([{id:'john-doe',firstName:'John',lastName:'Doe',company:'ABC Printers',text:'John Doe'},{id:'jane-doe',firstName:'Jane',lastName:'Doe',company:'XYZ Refrigerators',text:'Jane Doe'},{id:'santa-claus',firstName:'Santa',lastName:'Claus',company:'North Pole Toy Factory Inc.',text:'Santa Claus'}]);
 const groups=useMemo(()=>[...new Set(data.contacts.map(c=>c.lastName[0]))].sort().map(key=>({id:key,header:key,items:data.contacts.filter(c=>c.lastName[0]===key)})),[]);
 const contacts=useMemo(()=>data.contacts.filter(x=>x.firstName.toLowerCase().includes(firstName.toLowerCase())&&x.lastName.toLowerCase().includes(lastName.toLowerCase())&&x.company.toLowerCase().includes(company.toLowerCase())),[firstName,lastName,company]);const rows=useMemo(()=>large?Array.from({length:10000},(_,i)=>({id:`row-${i}`,text:`Item ${i+1}`})):data.contacts,[large]);
 useEffect(()=>{document.documentElement.dataset.theme=theme;},[theme]);const shared={theme,backend};
 return <div className="collections-shell"><Header title={kind} theme={theme} onTheme={setTheme}/><main className="stage-main collections-gallery"><nav className="collection-docs"><a href={`https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.${kind.toLowerCase()}`} target="_blank" rel="noreferrer">Documentation</a><a href={kind==='ItemsStackPanel'?'https://github.com/microsoft/microsoft-ui-xaml/blob/7b12709347527238494ca28cb9fed326d513e779/dxaml/xcp/core/core/elements/ItemsStackPanel.cpp':kind==='ItemsWrapGrid'?'https://github.com/microsoft/microsoft-ui-xaml/blob/7b12709347527238494ca28cb9fed326d513e779/dxaml/xcp/dxaml/lib/ItemsWrapGrid_Partial.cpp':`https://github.com/microsoft/WinUI-Gallery/blob/7360ac322414e118eadfb0c7c2f4ecc31a218f59/WinUIGallery/Samples/${kind}/${kind}Page.xaml`} target="_blank" rel="noreferrer">Source</a><div className="collection-renderer"><label>Renderer<GalleryComboBox aria-label="Collection renderer" value={backend} onValueChanged={e=>setBackend(e as RendererBackend)}>{Object.values(RendererBackend).map(v=><GalleryOption key={v}>{v}</GalleryOption>)}</GalleryComboBox></label></div></nav>
 {kind==='ListView'&&<>
 <Example id="list-basic" title={official.controls.ListView.samples[0].title} kind="ListView" index={0}>
 <p className="collection-intro"><LocalizedText>This is a basic ListView that has the full source code below. Other samples on this page display only the additional markup needed to customize a simple ListView like this one.</LocalizedText></p>
 <SceneView {...shared} autoHeight onReady={s=>remember('list-basic',s)}>
 {/* @sample:list-basic:start */}
 <ListView {...frame} width={350} height={400} items={data.contacts} accessibleName="Contacts" renderItem={contact=><TextBlock text={contact.text} margin={[0,5,0,5]}/>}/>
 {/* @sample:list-basic:end */}
 </SceneView></Example>
 <Example id="list-selection" title={official.controls.ListView.samples[1].title} kind="ListView" index={1} options={<Mode value={mode} onChange={setMode}/>}>
 <div className="collection-intro">You can enable four different selection modes on the right.<br/><b>None</b> disables selection all together.<br/><b>Single</b> allows for only one item to be selected in the list.<br/><b>Multiple</b> causes checkboxes to appear next to items, so that multiple items can be chosen from the list.<br/><b>Extended</b> allows the user to select multiple items by using Ctrl+Click to select the individual items they want, or Shift+Click to select a range of contiguous items.</div>
 <SceneView {...shared} autoHeight onReady={s=>remember('list-selection',s)}>
 {/* @sample:list-selection:start */}
 <ListView {...frame} items={data.contacts} width={400} height={400} accessibleName="Contact selection" selectionMode={mode} onReady={n=>view('selection',n)} renderItem={contact=><ContactTemplate contact={contact}/>}/>
 {/* @sample:list-selection:end */}
 </SceneView></Example>
 <Example id="list-drag" title={official.controls.ListView.samples[2].title} kind="ListView" index={2}>
 <p className="collection-intro"><LocalizedText>In these ListView controls, you can drag and drop within a list to reorder items, or drag and drop between lists to move items.</LocalizedText></p>
 <SceneView {...shared} autoHeight onReady={s=>remember('list-drag',s)}>
 {/* @sample:list-drag:start */}
 <Grid columns={[{unit:GridUnit.Star,value:1},{unit:GridUnit.Star,value:1}]}>
 <ListView {...frame} horizontalAlignment={HorizontalAlignment.Stretch} margin={[12,12,12,12]} items={dragLeft} minWidth={350} height={400} accessibleName="Source contacts" canDragItems canReorderItems allowDrop onReady={n=>view('drag-left',n)} onItemsChanged={e=>setDragLeft([...e.items])} renderItem={contact=><ContactTemplate contact={contact}/>}/>
 <ListView {...frame} column={1} horizontalAlignment={HorizontalAlignment.Stretch} items={dragRight} minWidth={350} height={400} accessibleName="Target contacts" canDragItems canReorderItems allowDrop onReady={n=>view('drag-right',n)} onItemsChanged={e=>setDragRight([...e.items])} renderItem={contact=><ContactTemplate contact={contact}/>}/>
 </Grid>
 {/* @sample:list-drag:end */}
 </SceneView></Example>
 <Example id="list-grouped" title={official.controls.ListView.samples[3].title} kind="ListView" index={3} options={<SceneView {...shared} autoHeight><ToggleSwitch header="Sticky Headers" isOn={sticky} onToggled={e=>setSticky(!!e.isOn)}/></SceneView>}>
 <p className="collection-intro"><LocalizedText>Switch the toggle on the right to enable sticky group headers, which makes the headers stay put at the top of the ListView while scrolling.</LocalizedText></p>
 <SceneView {...shared} autoHeight onReady={s=>remember('list-grouped',s)}>
 {/* @sample:list-grouped:start */}
 <ListView {...frame} groups={groups} width={400} height={400} areStickyGroupHeadersEnabled={sticky} accessibleName="Grouped contacts" onReady={n=>view('grouped',n)} renderItem={contact=><ContactTemplate contact={contact}/>}/>
 {/* @sample:list-grouped:end */}
 </SceneView></Example>
 <Example id="list-filter" title={official.controls.ListView.samples[4].title} kind="ListView" index={4} options={<div className="collection-filters"><b>Filter by...</b><SceneView {...shared} autoHeight><StackPanel spacing={16} margin={[8,8,8,8]}><TextBox header="First name" accessibleName="First name" text={firstName} onTextChanged={e=>setFirstName(e.text??'')}/><TextBox header="Last name" accessibleName="Last name" text={lastName} onTextChanged={e=>setLastName(e.text??'')}/><TextBox header="Company" accessibleName="Company" text={company} onTextChanged={e=>setCompany(e.text??'')}/></StackPanel></SceneView></div>}>
 <SceneView {...shared} autoHeight onReady={s=>remember('list-filter',s)}>
 {/* @sample:list-filter:start */}
 <ListView {...frame} items={contacts} height={400} width={400} accessibleName="Filtered contacts" renderItem={contact=><ContactTemplate contact={contact}/>}/>
 {/* @sample:list-filter:end */}
 </SceneView></Example>
 <Example id="list-messages" title={official.controls.ListView.samples[5].title} kind="ListView" index={5} options={<SceneView {...shared} autoHeight><StackPanel spacing={10}><Button text="Send Message" onClick={()=>addMessage(false)}/><Button text="Receive Message" onClick={()=>addMessage(true)}/></StackPanel></SceneView>}>
 <p className="collection-intro"><LocalizedText>This ListView is inverted to grow from the bottom up. It's a good way to display logs or messages, with most recent at the bottom.</LocalizedText></p>
 <SceneView {...shared} autoHeight onReady={s=>remember('list-messages',s)}>
 {/* @sample:list-messages:start */}
 <ListView items={messages} height={400} borderBrush={frame.borderBrush} borderThickness={frame.borderThickness} selectionMode={ListViewSelectionMode.None} itemsPanelVerticalAlignment={VerticalAlignment.Bottom} itemsUpdatingScrollMode={ItemsUpdatingScrollMode.KeepLastItemInView} accessibleName="Messages" onReady={n=>view('messages',n)} renderItem={message=><Border margin={[4,4,4,4]} horizontalAlignment={message.received?HorizontalAlignment.Left:HorizontalAlignment.Right} background="#0078d7" cornerRadius={4}><StackPanel width={350} minHeight={75} padding={[10,0,0,10]}><TextBlock text={message.text} fontSize={20} foreground="#ffffff" padding={[0,10,0,0]}/><TextBlock text={message.date} fontSize={15} foreground="#ffffff" padding={[0,0,0,10]}/></StackPanel></Border>}/>
 {/* @sample:list-messages:end */}
 </SceneView></Example>
 <Example id="list-images" title={official.controls.ListView.samples[6].title} kind="ListView" index={6}>
 <SceneView {...shared} autoHeight onReady={s=>remember('list-images',s)}>
 {/* @sample:list-images:start */}
 <ListView items={imageItems} height={400} minWidth={550} borderBrush={frame.borderBrush} borderThickness={frame.borderThickness} canDragItems canReorderItems allowDrop accessibleName="Image list" onItemsChanged={e=>setImageItems([...e.items])} renderItem={item=><Grid margin={[0,12,0,12]} columns={[{unit:GridUnit.Pixel,value:150},{unit:GridUnit.Star,value:1}]}><Image source={item.image} maxHeight={100} stretch={ImageStretch.Fill}/><StackPanel column={1} margin={[12,0,0,0]}><TextBlock text={item.text} fontWeight={600} lineHeight={20} margin={[0,0,0,6]}/><TextBlock text={item.description} width={350} maxHeight={60} trimming={TextTrimming.CharacterEllipsis} margin={[0,0,0,10]}/><TextBlock text={`${item.views} Views ⋅ ${item.likes} Likes`} fontSize={12}/></StackPanel></Grid>}/>
 {/* @sample:list-images:end */}
 </SceneView></Example>
 <Example id="list-context" title={official.controls.ListView.samples[7].title} kind="ListView" index={7}>
 <SceneView {...shared} autoHeight onReady={s=>remember('list-context',s)}>
 {/* @sample:list-context:start */}
 <ListView {...frame} items={contextItems} width={400} height={400} accessibleName="Contacts with context menu" onReady={n=>view('context',n)} onItemsChanged={e=>setContextItems([...e.items])} onContextRequested={e=>setContextKey(e.item.id)} renderItem={contact=><ContactTemplate contact={contact}/>} contextFlyout={<MenuFlyout menuItems={[{id:'delete',text:'Delete'}]} onItemInvoked={()=>window.collectionViews.context.remove([contextKey])}/>}/>
 {/* @sample:list-context:end */}
 </SceneView></Example>
 <Example id="list-persist" title={official.controls.ListView.samples[8].title} kind="ListView" index={8} options={<><GalleryButton onClick={()=>setSavedPosition(window.collectionViews.persist.saveScrollPosition())}>Save position</GalleryButton><GalleryButton disabled={!savedPosition} onClick={()=>savedPosition&&window.collectionViews.persist.restoreScrollPosition(savedPosition)}>Restore position</GalleryButton></>}>
 <SceneView {...shared} autoHeight onReady={s=>remember('list-persist',s)}>
 {/* @sample:list-persist:start */}
 <ListView {...frame} items={numbered} width={350} height={400} accessibleName="Remember scroll position" onReady={n=>view('persist',n)}/>
 {/* @sample:list-persist:end */}
 </SceneView></Example>
 <Example id="list-virtual" title={official.controls.ListView.samples[9].title} kind="ListView" index={9} options={<><GalleryCheckBox  checked={large} onValueChanged={e=>setLarge(e)}  label={<>10,000 items</>}/><GalleryButton onClick={()=>window.collectionViews.large.scrollIntoView(large?'row-9999':data.contacts.at(-1)!.id)}>Scroll to last item</GalleryButton><GalleryButton onClick={()=>window.collectionViews.large.scrollIntoView(large?'row-0':data.contacts[0].id)}>Scroll to first item</GalleryButton></>}>
 <SceneView {...shared} autoHeight onReady={s=>remember('list-virtual',s)}>
 {/* @sample:list-virtual:start */}
 <ListView {...frame} items={rows} height={400} width={350} accessibleName="Virtualized items" onReady={n=>view('large',n)}/>
 {/* @sample:list-virtual:end */}
 </SceneView></Example></>}
 {kind==='GridView'&&<>
 <Example id="grid-basic" title={official.controls.GridView.samples[0].title} kind="GridView" index={0}>
 <p className="collection-intro"><LocalizedText>This is a basic GridView that has the full source code below.<br/>Other samples on this page display only the additional markup needed to customize the specific GridView.</LocalizedText></p>
 <SceneView {...shared} autoHeight onReady={s=>remember('grid-basic',s)}>
 {/* @sample:grid-basic:start */}
 <GridView items={data.photos} accessibleName="Landscape images" isItemClickEnabled onItemClick={e=>setBasicClicked(`You clicked ${e.item.text}.`)} renderItem={item=><PhotoItem item={item}/>}/>
 {/* @sample:grid-basic:end */}
 </SceneView><p className="collection-output" aria-live="polite"><LocalizedText>{basicClicked}</LocalizedText></p></Example>
 <Example id="grid-layout" title={official.controls.GridView.samples[1].title} kind="GridView" index={1} options={<><label>Space between columns<GalleryNumberBox  min={0} max={100} aria-label="Space between columns" value={columnSpace} onValueChanged={e=>setColumnSpace(Math.max(0,Math.min(100,e||0)))}/></label><label>Space between rows<GalleryNumberBox  min={0} max={100} aria-label="Space between rows" value={rowSpace} onValueChanged={e=>setRowSpace(Math.max(0,Math.min(100,e||0)))}/></label><label>Maximum number of items before wrapping<GalleryNumberBox  min={1} max={8} aria-label="Maximum number of items before wrapping" value={maximum} onValueChanged={e=>setMaximum(Math.max(1,Math.min(8,e||1)))}/></label></>}>
 <p className="collection-intro"><LocalizedText>Use the options on the right to control different layout customizations to the GridView below.</LocalizedText></p>
 <SceneView {...shared} autoHeight onReady={s=>remember('grid-layout',s)}>
 {/* @sample:grid-layout:start */}
 <GridView items={data.photos} accessibleName="Grid layout" orientation={Orientation.Horizontal} maximumRowsOrColumns={maximum} itemContainerStyle={{margin:[columnSpace,rowSpace,columnSpace,rowSpace]}} renderItem={item=><PhotoItem item={item} template="ImageOverlayTemplate"/>}/>
 {/* @sample:grid-layout:end */}
 </SceneView></Example>
 <Example id="grid-content" title={official.controls.GridView.samples[2].title} kind="GridView" index={2} options={<><SceneView {...shared} autoHeight><RadioButtons header="ItemTemplate" items={['Image','Icon/Text','Image/Text','Text']} selectedIndex={(['ImageTemplate','IconTextTemplate','ImageTextTemplate','TextTemplate'] as PhotoTemplate[]).indexOf(template)} onSelectionChanged={e=>setTemplate((['ImageTemplate','IconTextTemplate','ImageTextTemplate','TextTemplate'] as PhotoTemplate[])[e.selectedIndex??0])}/></SceneView><GalleryCheckBox  checked={canDrag} onValueChanged={e=>setCanDrag(e)}  label={<>CanDragItems</>}/><GalleryCheckBox  checked={canReorder} onValueChanged={e=>setCanReorder(e)}  label={<>CanReorderItems</>}/><GalleryCheckBox  checked={allowDrop} onValueChanged={e=>setAllowDrop(e)}  label={<>AllowDrop</>}/><GalleryButton aria-pressed={rtl} onClick={()=>setRtl(!rtl)}>Reverse FlowDirection</GalleryButton><GalleryCheckBox  checked={clickEnabled} onValueChanged={e=>{setClickEnabled(e);setClicked('');}}  label={<>IsItemClickEnabled</>}/><Mode value={mode} onChange={value=>{setMode(value);if(value===ListViewSelectionMode.None)setSelected('');}}/></>}>
 <SceneView {...shared} autoHeight onReady={s=>remember('grid-content',s)}>
 {/* @sample:grid-content:start */}
 <GridView items={data.photos} canDragItems={canDrag} canReorderItems={canReorder} allowDrop={allowDrop} accessibleName="Grid content" onReady={n=>view('grid-content',n)} selectionMode={mode} isItemClickEnabled={clickEnabled} flowDirection={rtl?FlowDirection.RightToLeft:FlowDirection.LeftToRight} renderItem={item=><PhotoItem item={item} template={template}/>} onItemClick={e=>setClicked(`You clicked ${e.item.text}.`)} onSelectionChanged={e=>setSelected(`You have selected ${e.selectedItems.length} item(s).`)}/>
 {/* @sample:grid-content:end */}
 </SceneView><p className="collection-output" aria-live="polite"><LocalizedText>{clicked}<br/>{selected}</LocalizedText></p></Example></>}
 {kind==='VariableSizedWrapGrid'&&<Example id="variable-grid" title={official.controls.VariableSizedWrapGrid.samples[0].title} kind="VariableSizedWrapGrid" index={0} options={<SceneView {...shared} autoHeight><RadioButtons header="Orientation" items={['Horizontal','Vertical']} selectedIndex={orientation===Orientation.Horizontal?0:1} onSelectionChanged={e=>setOrientation(e.selectedIndex===0?Orientation.Horizontal:Orientation.Vertical)}/></SceneView>}>
 <SceneView {...shared} autoHeight onReady={s=>remember('variable-grid',s)}>
 {/* @sample:variable-grid:start */}
 <VariableSizedWrapGrid width={400} horizontalAlignment={HorizontalAlignment.Left} itemWidth={44} itemHeight={44} maximumRowsOrColumns={3} orientation={orientation}><Rectangle fill="#ff0000"/><Rectangle height={80} fill="#0000ff" rowSpan={2}/><Rectangle width={80} fill="#008000" columnSpan={2}/><Rectangle width={80} height={80} fill="#ffff00" columnSpan={2} rowSpan={2}/></VariableSizedWrapGrid>
 {/* @sample:variable-grid:end */}
 </SceneView></Example>}
 {kind==='ItemsStackPanel'&&<Example id="items-stack" title="ItemsStackPanel layout and collection virtualization"><SceneView {...shared} autoHeight onReady={s=>remember('items-stack',s)}>
 {/* @sample:items-stack:start */}
 <ItemsStackPanel orientation={Orientation.Vertical} width={300} horizontalAlignment={HorizontalAlignment.Left}><TextBlock text="First item" margin={[0,8,0,8]}/><TextBlock text="Second item with a larger font" fontSize={20} margin={[0,8,0,8]}/><TextBlock text="Third item" margin={[0,8,0,8]}/></ItemsStackPanel>
 {/* @sample:items-stack:end */}
 </SceneView><p className="collection-note"><LocalizedText>Standalone children are an SDK composition extension. The ListView page demonstrates the native item-host strategy.</LocalizedText></p></Example>}
 {kind==='ItemsWrapGrid'&&<Example id="items-wrap" title="ItemsWrapGrid uniform wrapping" options={<SceneView {...shared} autoHeight><RadioButtons header="Orientation" items={['Horizontal','Vertical']} selectedIndex={orientation===Orientation.Horizontal?0:1} onSelectionChanged={e=>setOrientation(e.selectedIndex===0?Orientation.Horizontal:Orientation.Vertical)}/></SceneView>}><SceneView {...shared} autoHeight onReady={s=>remember('items-wrap',s)}>
 {/* @sample:items-wrap:start */}
 <ItemsWrapGrid width={300} height={240} horizontalAlignment={HorizontalAlignment.Left} itemWidth={80} itemHeight={60} maximumRowsOrColumns={3} orientation={orientation}>{Array.from({length:8},(_,i)=><Border key={i} margin={[3,3,3,3]} background={i%2?'#ffa500':'#0078d4'}><TextBlock text={String(i+1)} foreground="#ffffff" horizontalAlignment={HorizontalAlignment.Center} verticalAlignment={VerticalAlignment.Center}/></Border>)}</ItemsWrapGrid>
 {/* @sample:items-wrap:end */}
 </SceneView><p className="collection-note"><LocalizedText>The GridView page uses the same Rust strategy with native container styling and viewport realization.</LocalizedText></p></Example>}
 </main></div>;
}
