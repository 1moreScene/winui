import { LocalizedText } from "./GalleryLanguage";
import {useEffect,useMemo,useRef,useState} from 'react';
import {SceneView,SceneNavigationView,Frame,NavigationViewContent,AutoSuggestBox,StackPanel,HyperlinkButton,Button,NavigationViewItem} from 'winui-wasm/react';
import {GalleryButton,GalleryCheckBox,GalleryComboBox,GalleryExpander,GalleryExpanderHeader,GalleryOption,GalleryRadioButton,GallerySlider,GalleryTextBox} from './GalleryControls';
import {SourceCode} from './SourceCode';
import {exampleNames,exampleOptions,galleryPaneMaterial} from './examples';
import {EventKind,NavigationViewBackButtonVisible,NavigationViewSlot,PaneDisplayMode,Orientation,HorizontalAlignment,Symbol,NodeKind,IconSourceKind,
 type ThemeMode,type WinUI,type NavigationViewOptions,type SceneNavigationViewController as NavigationController,type SceneFrameController as FrameController,type SceneEvent,type ScenePageDefinition} from 'winui-wasm';
import official from './official-navigation.json';
import source from './NavigationGalleryExample.tsx?raw';

const pages:ScenePageDefinition[]=[...Array.from({length:7},(_,i)=>`SamplePage${i+1}`),'SampleSettingsPage'].map(key=>({key,contentResource:`gallery/${key}`}));
function destination(index:number,itemId:string){
 if(itemId==='$settings')return 'SampleSettingsPage';
 let page=Number(itemId.replace('page',''))||1;
 if(index===1&&page===4)page=3;
 if(index===5&&page===6)page=5;
 return `SamplePage${index===4?1:page}`;
}
/** Application data and event wiring. Every visual control, slot, Page and
 * template part in the live sample belongs to the shared Rust scene. */
export function NavigationGalleryExample({index,theme,reducedMotion,reducedTransparency,sdk,hidden=false}:{index:number;theme:ThemeMode;reducedMotion:boolean;reducedTransparency:boolean;sdk:WinUI;hidden?:boolean}){
 const initial=useMemo(()=>exampleOptions(index,theme),[index]);
 const [mode,setMode]=useState(initial.paneDisplayMode??PaneDisplayMode.Auto);
 const [width,setWidth]=useState<number>();
 const [reset,setReset]=useState(0),[extra,setExtra]=useState(0);
 const [settings,setSettings]=useState(initial.isSettingsVisible??true);
 const [back,setBack]=useState(initial.isBackButtonVisible!==NavigationViewBackButtonVisible.Collapsed);
 const [backEnabled,setBackEnabled]=useState(false),[searchVisible,setSearchVisible]=useState(true);
 const [header,setHeader]=useState<string|null>(index===7?'Header':initial.header??null);
 const [paneTitle,setPaneTitle]=useState('Pane Title');
 const [alwaysHeader,setAlwaysHeader]=useState(true),[custom,setCustom]=useState(false),[footer,setFooter]=useState(false);
 const [follows,setFollows]=useState(initial.selectionFollowsFocus??false),[suppress,setSuppress]=useState(false),[cancelClosing,setCancelClosing]=useState(false);
 const [eventText,setEventText]=useState('Ready'),[displayMode,setDisplayMode]=useState('');
 const [history,setHistory]=useState({back:false,forward:false});
 const [sourceKind,setSourceKind]=useState<'tsx'|'xaml'>('tsx');
 const frame=useRef<FrameController|null>(null),navigation=useRef<NavigationController|null>(null),count=useRef(0);
 const viewport=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(index!==2)return;
  const observer=new ResizeObserver(([entry])=>setMode(entry.contentRect.width>=641?PaneDisplayMode.Top:PaneDisplayMode.LeftMinimal));
  observer.observe(viewport.current!);return()=>observer.disconnect();
 },[index]);
 const items=useMemo(()=>[...(initial.items??[]).map(item=>item.id==='page2'?{...item,selectsOnInvoked:!suppress}:item),...Array.from({length:extra},(_,i)=>({id:`added${i}`,text:`New category ${i+1}`,icon:'\uE710'}))],[initial,extra,suppress]);
 const {content:_,contentNode:__,...base}=initial;
 const options:NavigationViewOptions={...base,items,theme,header,paneDisplayMode:mode,isSettingsVisible:settings,
  isBackButtonVisible:back?NavigationViewBackButtonVisible.Visible:NavigationViewBackButtonVisible.Collapsed,isBackEnabled:backEnabled,
  selectionFollowsFocus:follows,alwaysShowHeader:alwaysHeader,paneTitle:index===7?paneTitle:'',expandedPaneMaterial:galleryPaneMaterial(theme),reducedMotion,reducedTransparency};
 function onEvent(event:SceneEvent){
  setEventText(`${++count.current} · ${event.kind}${event.itemId?` → ${event.itemId}`:''}`);
  if(event.kind!==EventKind.SelectionChanged||!event.itemId)return;
  const target=destination(index,event.itemId);
  if([0,4,6].includes(index)&&event.itemId!=='$settings')setHeader(`Sample Page ${Number(event.itemId.replace('page',''))||1}`);
  frame.current?.navigate(target,{transition:event.recommendedNavigationTransition});
 }
 function restore(){setMode(initial.paneDisplayMode??PaneDisplayMode.Auto);setWidth(undefined);setExtra(0);setSettings(initial.isSettingsVisible??true);setBack(initial.isBackButtonVisible!==NavigationViewBackButtonVisible.Collapsed);setBackEnabled(false);setSearchVisible(true);setHeader(index===7?'Header':initial.header??null);setPaneTitle('Pane Title');setAlwaysHeader(true);setCustom(false);setFooter(false);setFollows(initial.selectionFollowsFocus??false);setSuppress(false);setCancelClosing(false);setEventText('Ready');count.current=0;setReset(v=>v+1);}
 const chooseMode=(next:PaneDisplayMode)=>{setMode(next);navigation.current?.configure({isPaneOpen:next!==PaneDisplayMode.Top});};
 return <section className="example" id={`example-${index}`} hidden={hidden}>
  <h2><LocalizedText>{exampleNames[index]}</LocalizedText></h2><div className="example-card"><div className="example-live">
   <div className="viewport-scroll"><div ref={viewport} className="sample-viewport" style={{width:width??'100%'}}>
    <SceneView key={reset} className="control-host" theme={theme} reducedMotion={reducedMotion} reducedTransparency={reducedTransparency} style={{height:index===7?540:460}}>
     <SceneNavigationView {...options}
      onReady={control=>{navigation.current=control;window.gallery.views[index]=control.asView();}}
      onSnapshot={state=>setDisplayMode(state.displayMode)}
      onEvent={onEvent} onPaneClosing={event=>{event.cancel=cancelClosing;}}>
      <Frame pages={pages} onReady={control=>{frame.current=control;window.gallery.sampleFrames??=[];window.gallery.sampleFrames[index]=control;control.onSnapshot(state=>setHistory(previous=>previous.back===!!state.backStack.length&&previous.forward===!!state.forwardStack.length?previous:{back:!!state.backStack.length,forward:!!state.forwardStack.length}));if(index!==7)control.navigate('SamplePage1');}}/>
      {index===7&&<>
       <NavigationViewContent slot={NavigationViewSlot.AutoSuggestBox}><AutoSuggestBox queryIcon accessibleName="Search" visible={searchVisible}/></NavigationViewContent>
       <NavigationViewContent slot={NavigationViewSlot.PaneCustomContent}><HyperlinkButton text="More info" margin={[12,0,12,0]} visible={custom}/></NavigationViewContent>
       <NavigationViewContent slot={NavigationViewSlot.PaneFooter}><StackPanel orientation={mode===PaneDisplayMode.Top?Orientation.Horizontal:Orientation.Vertical} visible={footer}>
        <NavigationViewItem accessibleName="download" iconSource={{kind:IconSourceKind.Symbol,symbol:Symbol.Download}}/>
        <NavigationViewItem accessibleName="favorite" iconSource={{kind:IconSourceKind.Symbol,symbol:Symbol.Favorite}}/>
       </StackPanel></NavigationViewContent>
      </>}
     </SceneNavigationView>
    </SceneView>
   </div></div>
   {index>=5&&<aside className="options"><h3><LocalizedText>Options</LocalizedText></h3>
    {index<7?<><span>{index===5?'Pane position:':'PanePosition:'}</span>{(index===6?[PaneDisplayMode.Left,PaneDisplayMode.Top,PaneDisplayMode.LeftCompact]:[PaneDisplayMode.Left,PaneDisplayMode.Top]).map(value=><GalleryRadioButton key={value} name={`navigation-mode-${index}`} label={`${value} mode`} checked={mode===value} onValueChanged={()=>chooseMode(value)}/>)}</>:<>
     <GalleryCheckBox label="Settings item visible" checked={settings} onValueChanged={setSettings}/>
     <GalleryCheckBox label="Back button visible" checked={back} onValueChanged={setBack}/>
     <GalleryCheckBox label="Back button enabled" checked={backEnabled} onValueChanged={setBackEnabled}/>
     <GalleryCheckBox label="AutoSuggestBox visible" checked={searchVisible} onValueChanged={setSearchVisible}/>
     <label className="field">Header:<GalleryTextBox aria-label="Header property" value={header??''} onValueChanged={setHeader}/></label>
     <GalleryCheckBox label="Always show header" checked={alwaysHeader} onValueChanged={setAlwaysHeader}/>
     <label className="field">PaneTitle:<GalleryTextBox aria-label="PaneTitle property" value={paneTitle} onValueChanged={setPaneTitle}/></label>
     <GalleryCheckBox label="PaneCustomContent visible" checked={custom} onValueChanged={setCustom}/>
     <GalleryCheckBox label="PaneFooter visible" checked={footer} onValueChanged={setFooter}/>
     <span>PanePosition:</span><GalleryRadioButton name="navigation-api-position" label="Left" checked={mode===PaneDisplayMode.Left} onValueChanged={()=>chooseMode(PaneDisplayMode.Left)}/><GalleryRadioButton name="navigation-api-position" label="Top" checked={mode===PaneDisplayMode.Top} onValueChanged={()=>chooseMode(PaneDisplayMode.Top)}/>
     <GalleryCheckBox label="Keyboard SelectionFollowsFocus" checked={follows} onValueChanged={setFollows}/>
     <GalleryCheckBox label="Selection of Menu Item2 suppressed" checked={suppress} onValueChanged={setSuppress}/>
    </>}
   </aside>}
  </div><div className="output"><span>Output</span><code className="event-output" aria-live="polite">{eventText}</code><span className="mode-output">{displayMode}</span></div>
  <GalleryExpander className="navigation-diagnostics"><GalleryExpanderHeader>SDK diagnostics</GalleryExpanderHeader><div className="navigation-diagnostics-content">
   <label className="field">PaneDisplayMode<GalleryComboBox aria-label={`PaneDisplayMode ${index}`} value={mode} onValueChanged={value=>chooseMode(value as PaneDisplayMode)}>{Object.values(PaneDisplayMode).map(value=><GalleryOption key={value}>{value}</GalleryOption>)}</GalleryComboBox></label>
   <GalleryCheckBox label="Cancel pane closing" checked={cancelClosing} onValueChanged={setCancelClosing}/>
   <label className="field">Sample width <span className="width-value">{width?`${width}px`:'Auto'}</span><GallerySlider aria-label={`Sample width ${index}`} min={360} max={1120} value={width??800} onValueChanged={setWidth}/></label>
   {index===4&&<GalleryButton onClick={()=>setExtra(v=>v+1)}>Add category</GalleryButton>}
   <GalleryButton disabled={!history.back} onClick={()=>frame.current?.goBack()}>Frame Back</GalleryButton><GalleryButton disabled={!history.forward} onClick={()=>frame.current?.goForward()}>Frame Forward</GalleryButton>
   <GalleryButton className="reset" onClick={restore}>Reset sample</GalleryButton>
  </div></GalleryExpander>
  <GalleryExpander className="source"><GalleryExpanderHeader>Source code <span>React + TypeScript · Rust SDK</span></GalleryExpanderHeader>
   <div className="source-tabs"><GalleryButton onClick={()=>setSourceKind('tsx')}>TypeScript / React</GalleryButton><GalleryButton onClick={()=>setSourceKind('xaml')}>Official XAML reference</GalleryButton></div>
   <SourceCode language={sourceKind}>{sourceKind==='tsx'?source:official.samples[index].xaml}</SourceCode>
  </GalleryExpander></div>
 </section>;
}
