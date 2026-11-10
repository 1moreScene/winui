import { LocalizedText } from "./GalleryLanguage";
import { SourceCode } from './SourceCode';
import { GalleryButton, GalleryComboBox, GalleryExpander, GalleryExpanderHeader, GalleryOption } from './GalleryControls';
import {useRef,useState,type ReactNode} from 'react';
import {useGalleryTheme} from './gallery-theme';
import {Header} from './ButtonPage';
import {SceneView,AppBarButton,AppBarToggleButton,DropDownButton,SelectorBar,CommandBar,StackPanel,Grid,TextBlock,TextBox,FontIcon,Viewbox,PathIcon,Flyout,MenuFlyout,ScrollViewer,Ellipse} from 'winui-wasm/react';
import {RendererBackend,Orientation,HorizontalAlignment,VerticalAlignment,IconSourceKind,Symbol,OverlayPlacement,CommandBarDefaultLabelPosition,CommandBarItemKind,KeyboardAcceleratorModifier,GridUnit,AnimationEasing,AnimationResult,ScrollMode,ScrollBarVisibility,type SceneEvent,type Scene,type CommandBarController,type CommandBarItem,type AppBarButtonController as AppBarController,type AppBarToggleButtonController as AppBarToggleController,type DropDownButtonController as DropDownController,type SelectorBarController as SelectorController} from 'winui-wasm';
import official from './official-command-controls.json';
import source from './CommandControlsPage.tsx?raw';
import {extractSampleSource} from './sample-source';
import {TabContent} from './NavigationControlsPage';
type Kind=keyof typeof official.controls;
declare global{interface Window{commandScenes:Record<string,Scene>;commandControls:Record<string,AppBarController|AppBarToggleController|DropDownController|CommandBarController|SelectorController<any>>;}}
function remember(id:string,scene:Scene){window.commandScenes??={};window.commandScenes[id]=scene;}
function keep(id:string,node:AppBarController|AppBarToggleController|DropDownController|CommandBarController|SelectorController<any>){window.commandControls??={};window.commandControls[id]=node;}
const symbol=(symbol:Symbol)=>({kind:IconSourceKind.Symbol,symbol});
const ctrl=(key:string)=>[{key,modifiers:[KeyboardAcceleratorModifier.Control]}];
const lorem='Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';
const auto={unit:GridUnit.Auto,value:1},star={unit:GridUnit.Star,value:1};
function Example({kind,index,id,children,options}:{kind:Kind;index:number;id:string;children:ReactNode;options?:ReactNode}){const[native,setNative]=useState(false);const sample=official.controls[kind].samples[index];return <section id={id} className="example basic-example"><h2><LocalizedText>{sample.title}</LocalizedText></h2><div className="example-card"><div className={`basic-live ${options?'with-options':''}`}><div className="basic-preview">{children}</div>{options&&<div className="options">{options}</div>}</div><GalleryExpander className="source"><GalleryExpanderHeader>Source code</GalleryExpanderHeader><div className="source-tabs"><GalleryButton className={!native?'active':''} onClick={()=>setNative(false)}>TypeScript / React</GalleryButton><GalleryButton className={native?'active':''} onClick={()=>setNative(true)}>Official XAML</GalleryButton></div><SourceCode language={native ? 'xaml' : 'tsx'}>{native?sample.xaml:extractSampleSource(source,id)}</SourceCode></GalleryExpander></div></section>;}
function AppExample({index,kind,backend,theme}:{index:number;kind:'AppBarButton'|'AppBarToggleButton';backend:RendererBackend;theme:Parameters<typeof SceneView>[0]['theme']}){
 const toggle=kind==='AppBarToggleButton',id=`${toggle?'toggle':'appbar'}-${index}`;const[message,setMessage]=useState('');
 const clicked=(event:SceneEvent)=>{const checked=(event.target as AppBarToggleController).properties.isChecked;setMessage(toggle?`IsChecked = ${checked===null?'':checked?'True':'False'}`:`You clicked: Button${index+1}`);};
 return <Example kind={kind} index={index} id={id}><SceneView autoHeight theme={theme} backend={backend} onReady={s=>remember(id,s)}><StackPanel orientation={Orientation.Horizontal}>
 {toggle?<>
 {index===0&&<>
    {/* @sample:toggle-0:start */}

<AppBarToggleButton label="SymbolIcon" iconSource={symbol(Symbol.Shuffle)} onClick={clicked} onReady={n=>keep(id,n)}/>
    
{/* @sample:toggle-0:end */}
</>}
 {index===1&&<>
    {/* @sample:toggle-1:start */}

<AppBarToggleButton label="BitmapIcon" iconSource={{kind:IconSourceKind.Bitmap,uriSource:'/official/command-slices2.png'}} onClick={clicked} onReady={n=>keep(id,n)}/>
    
{/* @sample:toggle-1:end */}
</>}
 {index===2&&<>
    {/* @sample:toggle-2:start */}

<AppBarToggleButton label="FontIcon" iconSource={{kind:IconSourceKind.Font,fontFamily:'Candara',glyph:'Σ'}} onClick={clicked} onReady={n=>keep(id,n)}/>
    
{/* @sample:toggle-2:end */}
</>}
 {index===3&&<>
    {/* @sample:toggle-3:start */}

<AppBarToggleButton label="PathIcon" isThreeState onClick={clicked} onReady={n=>keep(id,n)}><Viewbox><PathIcon data="F1 M 20,20L 24,10L 24,24L 5,24"/></Viewbox></AppBarToggleButton>
    
{/* @sample:toggle-3:end */}
</>}
 </>:<>
 {index===0&&<>
    {/* @sample:appbar-0:start */}

<AppBarButton label="SymbolIcon" iconSource={symbol(Symbol.Like)} onClick={clicked} onReady={n=>keep(id,n)}/>
    
{/* @sample:appbar-0:end */}
</>}
 {index===1&&<>
    {/* @sample:appbar-1:start */}

<AppBarButton label="BitmapIcon" iconSource={{kind:IconSourceKind.Bitmap,uriSource:'/official/command-slices2.png'}} onClick={clicked} onReady={n=>keep(id,n)}/>
    
{/* @sample:appbar-1:end */}
</>}
 {index===2&&<>
    {/* @sample:appbar-2:start */}

<AppBarButton label="FontIcon" iconSource={{kind:IconSourceKind.Font,fontFamily:'Candara',glyph:'Σ'}} onClick={clicked} onReady={n=>keep(id,n)}/>
    
{/* @sample:appbar-2:end */}
</>}
 {index===3&&<>
    {/* @sample:appbar-3:start */}

<AppBarButton label="PathIcon" onClick={clicked} onReady={n=>keep(id,n)}><Viewbox><PathIcon data="F1 M 20,20L 24,10L 24,24L 5,24"/></Viewbox></AppBarButton>
    
{/* @sample:appbar-3:end */}
</>}
 {index===4&&<>
    {/* @sample:appbar-4:start */}

<AppBarButton label="Save" iconSource={symbol(Symbol.Save)} keyboardAccelerators={ctrl('S')} onClick={clicked} onReady={n=>keep(id,n)}/>
    
{/* @sample:appbar-4:end */}
</>}
 {index===5&&<>
    {/* @sample:appbar-5:start */}

<AppBarButton label="Edit" iconSource={symbol(Symbol.Edit)} onReady={n=>keep(id,n)}><AppBarButton.Flyout><Flyout><TextBox minWidth={240} placeholderText="Input text here"/></Flyout></AppBarButton.Flyout></AppBarButton>
    
{/* @sample:appbar-5:end */}
</>}
 </>}
 <TextBlock text={message} margin={[8,0,0,0]} verticalAlignment={VerticalAlignment.Center}/></StackPanel></SceneView></Example>;
}
function DropExample({index,theme,backend}:{index:number;theme:Parameters<typeof SceneView>[0]['theme'];backend:RendererBackend}){const[message,setMessage]=useState('');const id=`dropdown-${index}`;return <Example kind="DropDownButton" index={index} id={id}><SceneView autoHeight theme={theme} backend={backend} onReady={s=>remember(id,s)}>
 {index===0?<>
    {/* @sample:dropdown-0:start */}

<DropDownButton text="Email" onReady={n=>keep(id,n)}><DropDownButton.Flyout><MenuFlyout placement={OverlayPlacement.BottomEdgeAlignedLeft} menuItems={[{id:'send',text:'Send'},{id:'reply',text:'Reply'},{id:'reply-all',text:'Reply All'}]} onItemInvoked={e=>setMessage(e.itemId??'')}/></DropDownButton.Flyout></DropDownButton>
    
{/* @sample:dropdown-0:end */}
</>:<>
    {/* @sample:dropdown-1:start */}

<DropDownButton accessibleName="Email" onReady={n=>keep(id,n)}><FontIcon glyph={"\uE715"}/><DropDownButton.Flyout><MenuFlyout placement={OverlayPlacement.BottomEdgeAlignedLeft} menuItems={[{id:'send',text:'Send',icon:'\uE725'},{id:'reply',text:'Reply',icon:'\uE8CA'},{id:'reply-all',text:'Reply All',icon:'\uE8C2'}]} onItemInvoked={e=>setMessage(e.itemId??'')}/></DropDownButton.Flyout></DropDownButton>
    
{/* @sample:dropdown-1:end */}
</>}
 </SceneView>{message&&<output>{message}</output>}</Example>;}
function SelectorPages({index}:{index:number}){if(index<3)return <TabContent page={index}/>;if(index===3)return <ScrollViewer horizontalAlignment={HorizontalAlignment.Stretch} verticalAlignment={VerticalAlignment.Stretch}><StackPanel><Grid columns={[{...star,value:2},star,star]}>{['#e9967a','#8b0000','#f08080'].map((background,column)=><Grid key={column} column={column} minHeight={150} margin={[5,5,5,5]} background={background}/>)}</Grid><Grid columns={[star,star,{...star,value:2}]} rows={[auto,auto]}>{['#f08080','#8b0000','#cd5c5c'].map((background,column)=><Grid key={column} column={column} minHeight={150} margin={[5,5,5,5]} background={background}/>)}<TextBlock row={1} columnSpan={3} margin={[5,5,5,5]} text={lorem} wrap/></Grid></StackPanel></ScrollViewer>;return <ScrollViewer horizontalAlignment={HorizontalAlignment.Stretch} verticalAlignment={VerticalAlignment.Stretch}><Grid columns={[star,star,{...star,value:4}]} rows={[auto,auto,auto,auto]}><Grid minHeight={150} margin={[5,5,5,5]} background="#f0e68c"/><Grid column={1} minHeight={150} margin={[5,5,5,5]} background="#bdb76b"/><Ellipse column={2} width={150} height={150} background="#8fbc8f"/><Ellipse row={1} columnSpan={2} width={75} height={75} background="#3cb371"/><Grid row={1} column={2} minHeight={150} margin={[5,5,5,5]} background="#556b2f"/><TextBlock row={3} columnSpan={3} margin={[5,5,5,5]} text={lorem} wrap/></Grid></ScrollViewer>;}
export function CommandControlsPage({kind}:{kind:Kind}){const[theme,setTheme]=useGalleryTheme(),[backend,setBackend]=useState(RendererBackend.Canvas2D),[page,setPage]=useState(0),[contentPage,setContentPage]=useState(0),[color,setColor]=useState(0),[message,setMessage]=useState(''),[multiple,setMultiple]=useState(false);const bar=useRef<CommandBarController|null>(null),content=useRef<import('winui-wasm').Panel|null>(null),previous=useRef(0),pageRequest=useRef(0);
 const primary:CommandBarItem[]=[{id:'add',label:'Add',iconSource:symbol(Symbol.Add),keyboardAccelerators:ctrl('N')},{id:'edit',label:'Edit',iconSource:symbol(Symbol.Edit),keyboardAccelerators:ctrl('E')},{id:'share',label:'Share',iconSource:symbol(Symbol.Share),keyboardAccelerators:[{key:'F4'}]}];const secondary:CommandBarItem[]=[{id:'settings',label:'Settings',iconSource:symbol(Symbol.Setting),keyboardAccelerators:ctrl('I')},...multiple?[{id:'b1',label:'Button 1',iconSource:symbol(Symbol.Add),keyboardAccelerators:ctrl('N')},{id:'b2',label:'Button 2',iconSource:symbol(Symbol.Delete),keyboardAccelerators:[{key:'Delete'}]},{id:'separator',kind:CommandBarItemKind.Separator},{id:'b3',label:'Button 3',iconSource:symbol(Symbol.FontDecrease),keyboardAccelerators:ctrl('Subtract')},{id:'b4',label:'Button 4',iconSource:symbol(Symbol.FontIncrease),keyboardAccelerators:ctrl('Add')}]:[]];
 return <div className="collections-shell"><Header title={kind} theme={theme} onTheme={setTheme}/><main className="stage-main collections-gallery"><nav className="collection-docs"><a href={`https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.${kind.toLowerCase()}`}>Documentation</a><a href={`https://github.com/microsoft/WinUI-Gallery/tree/${official.commit}/WinUIGallery/Samples/${kind}`}>Source</a><div className="collection-renderer"><GalleryComboBox aria-label="Command renderer" value={backend} onValueChanged={e=>setBackend(e as RendererBackend)}>{Object.values(RendererBackend).map(v=><GalleryOption key={v}>{v}</GalleryOption>)}</GalleryComboBox></div></nav>
 {(kind==='AppBarButton'||kind==='AppBarToggleButton')&&Array.from({length:kind==='AppBarButton'?6:4},(_,index)=><AppExample key={index} index={index} kind={kind} theme={theme} backend={backend}/>)}
 {kind==='DropDownButton'&&[0,1].map(index=><DropExample key={index} index={index} theme={theme} backend={backend}/>)}
 {kind==='SelectorBar'&&<>
 <Example kind={kind} index={0} id="selector-0"><SceneView autoHeight theme={theme} backend={backend} onReady={s=>remember('selector-0',s)}>
 
    {/* @sample:selector-0:start */}


 <SelectorBar items={[{id:'recent',text:'Recent',icon:'\uE823'},{id:'shared',text:'Shared',icon:'\uE72D'},{id:'favorites',text:'Favorites',icon:'\uE734'}]} onReady={n=>keep('selector-0',n)}/>
 
    
{/* @sample:selector-0:end */}

 </SceneView></Example>
 <Example kind={kind} index={1} id="selector-1"><SceneView autoHeight theme={theme} backend={backend} onReady={s=>remember('selector-1',s)}><StackPanel horizontalAlignment={HorizontalAlignment.Stretch}>
 
    {/* @sample:selector-1:start */}


 <SelectorBar items={['Page1','Page2','Page3','Page4','Page5']} selectedIndex={page} onReady={n=>keep('selector-1',n)} onSelectionChanged={e=>{if(e.index<0)return;const direction=e.index>previous.current?1:-1;previous.current=e.index;setPage(e.index);const request=++pageRequest.current;const frame=content.current;if(!frame){setContentPage(e.index);return;}frame.animate({opacity:0},{duration:150,easing:AnimationEasing.Discrete});frame.animate({translationX:-direction*150},{duration:150,curve:[0.7,0,1,0.5]}).finished.then(result=>{if(result!==AnimationResult.Completed||request!==pageRequest.current||frame.isDisposed)return;setContentPage(e.index);frame.update({translationX:direction*200,opacity:1});frame.animate({translationX:0},{duration:300,curve:[0.1,0.9,0.2,1]});});}}/>
 <Grid horizontalAlignment={HorizontalAlignment.Stretch} onReady={n=>{content.current=n;}}><SelectorPages index={contentPage}/></Grid>
 
    
{/* @sample:selector-1:end */}

 </StackPanel></SceneView></Example>
 <Example kind={kind} index={2} id="selector-2"><SceneView autoHeight theme={theme} backend={backend} onReady={s=>remember('selector-2',s)}><StackPanel>
 
    {/* @sample:selector-2:start */}


 <SelectorBar items={['Pink','Plum','PowderBlue']} selectedIndex={color} onReady={n=>keep('selector-2',n)} onSelectionChanged={e=>{if(e.index>=0)setColor(e.index);}}/>
 <ScrollViewer horizontalScrollMode={ScrollMode.Enabled} horizontalScrollBarVisibility={ScrollBarVisibility.Auto} verticalScrollMode={ScrollMode.Disabled} verticalScrollBarVisibility={ScrollBarVisibility.Disabled}><StackPanel orientation={Orientation.Horizontal}>{Array.from({length:[5,7,4][color]},(_,i)=><Grid key={`${color}:${i}`} width={112} height={82} margin={[4,4,4,4]} background={['#ffc0cb','#dda0dd','#b0e0e6'][color]}/>)}</StackPanel></ScrollViewer>
 
    
{/* @sample:selector-2:end */}

 </StackPanel></SceneView></Example></>}
 {kind==='CommandBar'&&<Example kind={kind} index={0} id="command-0" options={<><span>Show or hide</span><GalleryButton onClick={()=>bar.current?.update({isOpen:true,isSticky:true})}>Open command bar</GalleryButton><GalleryButton onClick={()=>bar.current?.update({isOpen:false,isSticky:false})}>Close command bar</GalleryButton><span>Modify content</span><GalleryButton onClick={()=>setMultiple(true)}>Add secondary commands</GalleryButton><GalleryButton onClick={()=>setMultiple(false)}>Remove secondary commands</GalleryButton></>}><SceneView autoHeight theme={theme} backend={backend} onReady={s=>remember('command-0',s)}><StackPanel horizontalAlignment={HorizontalAlignment.Stretch}>
 
    {/* @sample:command-0:start */}


 <CommandBar defaultLabelPosition={CommandBarDefaultLabelPosition.Right} primaryCommands={primary} secondaryCommands={secondary} onReady={n=>{bar.current=n;keep('command-0',n);}} onCommandInvoked={e=>setMessage(`You clicked: ${e.item?.label??e.command.id}`)}/>
 <TextBlock text={message} padding={[0,8,0,0]}/>
 
    
{/* @sample:command-0:end */}

 </StackPanel></SceneView></Example>}
 </main></div>;
}
