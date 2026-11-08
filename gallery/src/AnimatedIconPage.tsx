import { GalleryButton, GalleryCheckBox, GalleryComboBox, GalleryExpander, GalleryExpanderHeader, GalleryOption } from './GalleryControls';
import { useGalleryTheme } from './gallery-theme';
import {useEffect,useState,type ReactNode} from 'react';
import {Header} from './ButtonPage';
import {SceneView,Button,ToggleButton,AnimatedIcon,SceneNavigationView} from './react';
import {AnimatedIconSource,IconSourceKind,Symbol,ThemeMode,RendererBackend,type Scene} from './index';
import official from './official-animated-icons.json';
import source from './AnimatedIconPage.tsx?raw';
import {extractSampleSource} from './sample-source';
declare global{interface Window{animatedGallery:Record<string,Scene>;}}
function remember(name:string,scene:Scene){window.animatedGallery??={};window.animatedGallery[name]=scene;}
function Example({index,name,children,options}:{index:number;name:string;children:ReactNode;options?:ReactNode}){
 const [native,setNative]=useState(false);
 return <section className="example basic-example" id={name}><h2>{official.samples[index].title}</h2><div className="example-card"><div className={`basic-live ${options?'with-options':''}`}><div className="basic-preview">{children}</div>{options&&<div className="options">{options}</div>}</div><GalleryExpander className="source"><GalleryExpanderHeader>Source code</GalleryExpanderHeader><div className="source-tabs"><GalleryButton className={!native?'active':''} onClick={()=>setNative(false)}>TypeScript / React</GalleryButton><GalleryButton className={native?'active':''} onClick={()=>setNative(true)}>Official XAML</GalleryButton></div><pre><code>{native?official.samples[index].xaml:extractSampleSource(source,name)}</code></pre></GalleryExpander></div></section>;
}
export function AnimatedIconPage(){
 const [theme,setTheme]=useGalleryTheme(),[backend,setBackend]=useState(RendererBackend.Canvas2D),[kind,setKind]=useState(AnimatedIconSource.Find),[reduced,setReduced]=useState(false),[fallback,setFallback]=useState(false);
 useEffect(()=>{document.documentElement.dataset.theme=theme;},[theme]);
 const toggle=kind===AnimatedIconSource.ChevronRightDownSmall||kind===AnimatedIconSource.ChevronUpDownSmall;
 const AnimatedButton=toggle?ToggleButton:Button;
 const shared={theme,backend,reducedMotion:reduced};
 return <><Header title="AnimatedIcon" theme={theme} onTheme={setTheme}/><main className="stage-main official-motion"><div className="effects-options"><label>Renderer <GalleryComboBox aria-label="Renderer" value={backend} onValueChanged={e=>setBackend(e as RendererBackend)}>{Object.values(RendererBackend).map(v=><GalleryOption key={v}>{v}</GalleryOption>)}</GalleryComboBox></label><GalleryCheckBox  checked={reduced} onValueChanged={e=>setReduced(e)}  label={<>Reduce motion</>}/></div>
 <Example index={0} name="animated-button" options={<><label>Kind <GalleryComboBox aria-label="Animation kind" value={kind} onValueChanged={e=>setKind(e as AnimatedIconSource)}>{Object.values(AnimatedIconSource).filter(v=>v!==AnimatedIconSource.None).map(v=><GalleryOption key={v} value={v}>Animated{v}VisualSource</GalleryOption>)}</GalleryComboBox></label><GalleryCheckBox  checked={fallback} onValueChanged={e=>setFallback(e)}  label={<>Show fallback</>}/></>}>
 <p>{kind===AnimatedIconSource.Find?'Press and release the button to animate Find. Its native PointerOver transition has no shape change.':toggle?'Click to toggle the chevron. The source uses NormalOn/NormalOff and their pointer/pressed states.':'Move the pointer over the button, then press and release it to play its native state transitions.'}</p>
 <SceneView {...shared} style={{height:120}} onReady={s=>remember('button',s)}>
  {/* @sample:animated-button:start */}
  <AnimatedButton width={75} accessibleName="AnimatedIcon Example">
    <AnimatedIcon source={fallback?AnimatedIconSource.None:kind} useParentState
      fallbackIconSource={{kind:IconSourceKind.Symbol,symbol:Symbol.Find}}/>
  </AnimatedButton>
  {/* @sample:animated-button:end */}
 </SceneView></Example>
 <Example index={1} name="animated-navigation"><SceneView {...shared} style={{height:320}} onReady={s=>remember('navigation',s)}>
  {/* @sample:animated-navigation:start */}
  <SceneNavigationView layout={{height:320}} isSettingsVisible={false} isBackButtonVisible={false}
    theme={theme} reducedMotion={reduced} items={[
      {id:'game-settings',text:'Game Settings',animatedIconSource:AnimatedIconSource.Settings,icon:'\uE713'},
    ]}/>
  {/* @sample:animated-navigation:end */}
 </SceneView></Example></main></>;
}
