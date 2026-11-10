import { LocalizedText } from "./GalleryLanguage";
import { SourceCode } from './SourceCode';
import {useState,type ReactNode} from 'react';
import {Header} from './ButtonPage';
import {useGalleryTheme} from './gallery-theme';
import {GalleryButton,GalleryComboBox,GalleryOption,GalleryExpander,GalleryExpanderHeader} from './GalleryControls';
import {SceneView,StackPanel,Grid,Border,TextBlock,Button,ScrollBar,Thumb,TickBar,ItemsPresenter,ScrollContentPresenter,Slider} from 'winui-wasm/react';
import {RendererBackend,Orientation,HorizontalAlignment,VerticalAlignment,ScrollingIndicatorMode,GridUnit,type Scene,type ScrollContentPresenterController as PresenterController} from 'winui-wasm';
import {extractSampleSource} from './sample-source';
import source from './ScrollPrimitivesPage.tsx?raw';

type Kind='ScrollBar'|'Thumb'|'TickBar'|'ItemsPresenter'|'ScrollContentPresenter';
declare global{interface Window{scrollPrimitiveScenes:Record<string,Scene>;}}
function remember(key:string,scene:Scene){window.scrollPrimitiveScenes??={};window.scrollPrimitiveScenes[key]=scene;}
function Example({name,title,children,options}:{name:string;title:string;children:ReactNode;options?:ReactNode}){return <section className="example basic-example" id={name}><h2><LocalizedText>{title}</LocalizedText></h2><div className="example-card"><div className={`basic-live${options?' with-options':''}`}><div className="basic-preview">{children}</div>{options&&<div className="options">{options}</div>}</div><GalleryExpander className="source"><GalleryExpanderHeader>Source code</GalleryExpanderHeader><SourceCode>{extractSampleSource(source,name)}</SourceCode></GalleryExpander></div></section>;}
const colors=['#DFF6DD','#DDEBFF','#FFF4CE','#FDE7E9','#EDE7F6','#CDEAF0'];
export function ScrollPrimitivesPage({kind='ScrollBar'}:{kind?:Kind}){
 const [theme,setTheme]=useGalleryTheme(),[backend,setBackend]=useState(RendererBackend.Canvas2D),[output,setOutput]=useState(''),[presenter,setPresenter]=useState<PresenterController>(),[frequency,setFrequency]=useState(20),[orientation,setOrientation]=useState(Orientation.Vertical),[header,setHeader]=useState(true),[position,setPosition]=useState({x:0,y:0});
 const shared={theme,backend};
 return <><Header title={kind} theme={theme} onTheme={setTheme}/><p className="description"><LocalizedText>WinUI SDK primitive, implemented and rendered by Rust.</LocalizedText></p><div className="toolbar"><GalleryComboBox aria-label="Renderer" value={backend} onValueChanged={v=>setBackend(v as RendererBackend)}>{Object.values(RendererBackend).map(v=><GalleryOption key={v} value={v}>{v}</GalleryOption>)}</GalleryComboBox></div>
 {kind==='ScrollBar'&&<Example title="Range, viewport and native scroll notifications" name="scroll-bar-basic" options={<><p><LocalizedText>Drag the thumb, press the arrows, or use the focused bar's arrow/Page/Home/End keys.</LocalizedText></p><output>{output}</output></>}><SceneView {...shared} style={{height:240}} onReady={s=>remember('scroll-bar-basic',s)}>
 {/* @sample:scroll-bar-basic:start */}
 <StackPanel orientation={Orientation.Horizontal} spacing={32}>
  <ScrollBar height={220} minimum={0} maximum={100} value={25} viewportSize={25} smallChange={2} largeChange={20} indicatorMode={ScrollingIndicatorMode.MouseIndicator} isTabStop accessibleName="Vertical scroll bar" onScroll={e=>setOutput(`${e.scroll.eventType}: ${e.scroll.newValue.toFixed(1)}`)}/>
  <ScrollBar width={320} height={12} orientation={Orientation.Horizontal} minimum={0} maximum={100} value={25} viewportSize={25} smallChange={2} largeChange={20} indicatorMode={ScrollingIndicatorMode.MouseIndicator} isTabStop accessibleName="Horizontal scroll bar" onScroll={e=>setOutput(`${e.scroll.eventType}: ${e.scroll.newValue.toFixed(1)}`)}/>
 </StackPanel>
 {/* @sample:scroll-bar-basic:end */}
 </SceneView></Example>}
 {kind==='Thumb'&&<Example title="Original-coordinate drag deltas and cancellation" name="thumb-basic" options={<><GalleryButton onClick={()=>setPosition({x:0,y:0})}>Reset position</GalleryButton><output>{output}</output></>}><SceneView {...shared} style={{height:200}} onReady={s=>remember('thumb-basic',s)}>
 {/* @sample:thumb-basic:start */}
 <Thumb width={100} height={48} horizontalAlignment={HorizontalAlignment.Left} verticalAlignment={VerticalAlignment.Top} background="#0078D4" cornerRadius={4} translationX={position.x} translationY={position.y} accessibleName="Drag handle" onDragStarted={()=>setOutput('Drag started')} onDragDelta={e=>setPosition(p=>({x:p.x+e.horizontalChange,y:p.y+e.verticalChange}))} onDragCompleted={e=>setOutput(`${e.canceled?'Cancelled':'Completed'}: ${e.horizontalChange.toFixed(1)}, ${e.verticalChange.toFixed(1)}`)}/>
 {/* @sample:thumb-basic:end */}
 </SceneView></Example>}
 {kind==='TickBar'&&<Example title="Slider-linked tick marks and dense frequency decimation" name="tick-bar-basic" options={<GalleryComboBox aria-label="Tick frequency" value={frequency} onValueChanged={v=>setFrequency(Number(v))}>{[0,1,5,20,30].map(v=><GalleryOption key={v} value={v}>{v}</GalleryOption>)}</GalleryComboBox>}><SceneView {...shared} style={{height:120}} onReady={s=>remember('tick-bar-basic',s)}>
 {/* @sample:tick-bar-basic:start */}
 <StackPanel spacing={4} horizontalAlignment={HorizontalAlignment.Left}>
  <TickBar source="tick-source" width={320} height={4}/>
  <Slider minimum={0} maximum={100} value={40} width={320} tickFrequency={frequency} name="tick-source"/>
  <TickBar source="tick-source" width={320} height={4}/>
 </StackPanel>
 {/* @sample:tick-bar-basic:end */}
 </SceneView></Example>}
 {kind==='ItemsPresenter'&&<Example title="Header, one items panel and footer" name="items-presenter-basic" options={<><GalleryButton onClick={()=>setHeader(!header)}>Toggle header</GalleryButton><GalleryComboBox aria-label="Items orientation" value={orientation} onValueChanged={v=>setOrientation(v as Orientation)}>{Object.values(Orientation).map(v=><GalleryOption key={v} value={v}>{v}</GalleryOption>)}</GalleryComboBox><output>{output}</output></>}><SceneView {...shared} autoHeight onReady={s=>remember('items-presenter-basic',s)}>
 {/* @sample:items-presenter-basic:start */}
 <ItemsPresenter   orientation={orientation}>
 <ItemsPresenter.Header>{header?'Items header':''}</ItemsPresenter.Header>
 <ItemsPresenter.Footer>{"Items footer"}</ItemsPresenter.Footer>
  <StackPanel orientation={orientation} spacing={8}>{['One','Two','Three'].map(text=><Button key={text} text={text} margin={[0,4,0,4]} onClick={()=>setOutput(`Clicked ${text}`)}/>)}</StackPanel>
 </ItemsPresenter>
 {/* @sample:items-presenter-basic:end */}
 </SceneView></Example>}
 {kind==='ScrollContentPresenter'&&<Example title="Scrollable content with a linked Rust ScrollBar" name="scroll-content-presenter-basic" options={<><GalleryButton onClick={()=>presenter?.changeView({verticalOffset:0,disableAnimation:true})}>Scroll to top</GalleryButton><GalleryButton onClick={()=>presenter?.changeView({verticalOffset:10000,disableAnimation:true})}>Scroll to bottom</GalleryButton><output>{output}</output></>}><SceneView {...shared} style={{height:240}} onReady={s=>remember('scroll-content-presenter-basic',s)}>
 {/* @sample:scroll-content-presenter-basic:start */}
 <Grid columns={[{unit:GridUnit.Star,value:1},{unit:GridUnit.Pixel,value:12}]} spacing={8}>
  <ScrollContentPresenter name="scroll-content" height={220} onReady={setPresenter} onViewChanged={e=>setOutput(`Offset: ${(e.view?.verticalOffset??0).toFixed(1)}`)}><ItemsPresenter  >
 <ItemsPresenter.Header>{"Scrollable items"}</ItemsPresenter.Header>
 <ItemsPresenter.Footer>{"End of items"}</ItemsPresenter.Footer><StackPanel>{colors.map((color,i)=><Border key={color} height={80} background={color} padding={[12,12,12,12]}><TextBlock text={`Item ${i+1}`}/></Border>)}</StackPanel></ItemsPresenter></ScrollContentPresenter>
  <ScrollBar column={1} height={220} scrollTarget="scroll-content" smallChange={16} largeChange={120} indicatorMode={ScrollingIndicatorMode.MouseIndicator} accessibleName="Content scroll bar"/>
 </Grid>
 {/* @sample:scroll-content-presenter-basic:end */}
 </SceneView></Example>}
 </>;
}
