import { LocalizedText } from "./GalleryLanguage";
import { SourceCode } from './SourceCode';
import {useRef,useState} from 'react';
import {Frame,NavigationView} from 'winui-wasm/react';
import {GalleryButton,GalleryComboBox,GalleryOption,GalleryTextBox} from './GalleryControls';
import {NavigationCacheMode,NavigationTransition,PaneDisplayMode,EventKind,
  type FrameController,type PageStackEntry,type NavigationSnapshot,type ThemeMode} from 'winui-wasm';
import {galleryPaneMaterial} from './examples';

function SamplePage({page}:{page:string}){
  const [text,setText]=useState('');const [created]=useState(()=>new Date().toLocaleTimeString());
  return <div className="frame-sample-page"><h3><LocalizedText>{page}</LocalizedText></h3><p><LocalizedText>Created at {created}. Navigate away and return to compare the cache modes.</LocalizedText></p>
    <GalleryTextBox aria-label={`${page} note`} placeholder="Type a note to test page state" value={text} onValueChanged={setText}/>
    <p><LocalizedText>The page keeps its input and scroll position while its instance is cached.</LocalizedText></p>
    <div style={{height:420}}/><p><LocalizedText>End of {page}</LocalizedText></p></div>;
}
/** Uses exactly the public NavigationView + Frame composition available to apps. */
export function NavigationFrameExample({theme,reducedMotion,reducedTransparency}:{theme:ThemeMode;reducedMotion:boolean;reducedTransparency:boolean}){
  const frame=useRef<FrameController<PageStackEntry>|null>(null);
  const [snapshot,setSnapshot]=useState<Readonly<NavigationSnapshot>|null>(null);
  const [selected,setSelected]=useState('Library');
  const [cache,setCache]=useState(NavigationCacheMode.Enabled);
  const [transition,setTransition]=useState(NavigationTransition.Entrance);
  const [history,setHistory]=useState({back:false,forward:false});
  const [events,setEvents]=useState('Ready');
  const content=snapshot?.content;
  return <section className="example" id="navigation-frame-example"><h2><LocalizedText>Page navigation, transitions and caching</LocalizedText></h2>
    <div className="example-card"><div className="example-live">
      <div className="navigation-frame-preview">
        <NavigationView items={['Library','Downloads','Account'].map((id,index)=>({id,text:id,icon:['\uE8F1','\uE896','\uE77B'][index]}))}
          selectedId={selected} theme={theme} paneDisplayMode={PaneDisplayMode.Auto} openPaneLength={200} compactModeThresholdWidth={400} expandedModeThresholdWidth={600}
          content="" header="" alwaysShowHeader={false} isSettingsVisible={false} isBackEnabled={history.back}
          hasExternalContent expandedPaneMaterial={galleryPaneMaterial(theme)} reducedMotion={reducedMotion} reducedTransparency={reducedTransparency} isBackdropAvailable={false}
          onSnapshot={setSnapshot} style={{height:380,position:'absolute',inset:0,zIndex:2}}
          onEvent={event=>{
            if(event.kind===EventKind.BackRequested)frame.current?.goBack();
            if(event.kind===EventKind.ItemInvoked&&event.itemId&&frame.current?.snapshot.current?.page!==event.itemId)
              frame.current?.navigate(event.itemId,{transition});
          }}/>
        <Frame cacheMode={cache} reducedMotion={reducedMotion} style={{position:'absolute',left:content?.x??200,top:content?.y??0,right:0,bottom:0}}
          onReady={value=>{frame.current=value;value.onSnapshot(state=>setHistory({back:!!state.backStack.length,forward:!!state.forwardStack.length}));value.navigate('Library');}}
          onNavigating={event=>setEvents(`${event.mode}: ${event.from?.page??'Start'} → ${event.to.page}`)}
          onNavigated={event=>{setSelected(event.entry.page);setEvents(`${event.mode}: ${event.entry.page}`);}}
          renderPage={entry=><SamplePage page={entry.page}/>}/>
      </div>
    <aside className="options"><h3><LocalizedText>Options</LocalizedText></h3>
      <label className="field">NavigationCacheMode<GalleryComboBox aria-label="Page cache mode" value={cache} onValueChanged={v=>setCache(v as NavigationCacheMode)}>{Object.values(NavigationCacheMode).map(v=><GalleryOption key={v}>{v}</GalleryOption>)}</GalleryComboBox></label>
      <label className="field">Transition<GalleryComboBox aria-label="Page transition" value={transition} onValueChanged={v=>setTransition(v as NavigationTransition)}>{Object.values(NavigationTransition).map(v=><GalleryOption key={v}>{v}</GalleryOption>)}</GalleryComboBox></label>
      <GalleryButton disabled={!history.back} onClick={()=>frame.current?.goBack()}>Back</GalleryButton>
      <GalleryButton disabled={!history.forward} onClick={()=>frame.current?.goForward()}>Forward</GalleryButton>
      <p className="output" role="status"><LocalizedText>{events}</LocalizedText></p>
    </aside></div></div>
    <SourceCode className="frame-api-source">{`<NavigationView hasExternalContent onEvent={e => {
  if (e.kind === EventKind.ItemInvoked && e.itemId &&
      frame.snapshot.current?.page !== e.itemId)
    frame.navigate(e.itemId, { transition });
}} />
<Frame cacheMode={NavigationCacheMode.Enabled} cacheSize={10}
  onReady={setFrame} renderPage={entry => <MyPage page={entry.page} />} />`}</SourceCode>
  </section>;
}
