import { LocalizedText } from "./GalleryLanguage";
import { SourceCode } from './SourceCode';
import {useState,type ReactNode} from 'react';
import {Header} from './ButtonPage';
import {useGalleryTheme} from './gallery-theme';
import {GalleryButton,GalleryComboBox,GalleryOption,GalleryExpander,GalleryExpanderHeader} from './GalleryControls';
import {SceneView,ContentControl,ContentPresenter,UserControl,Page,SceneFrame,StackPanel,TextBlock,NumberBox,Button,Border} from 'winui-wasm/react';
import {ThemeMode,RendererBackend,NodeKind,HorizontalAlignment,VerticalAlignment,NavigationCacheMode,NavigationTransition,type Scene,type SceneFrameController as FrameController,type ScenePageDefinition} from 'winui-wasm';
import source from './ContentHostsPage.tsx?raw';
import {extractSampleSource} from './sample-source';
import official from './official-content-hosts.json';

type Kind='ContentControl'|'ContentPresenter'|'UserControl'|'Page'|'Frame';
declare global{interface Window{contentHostScenes:Record<string,Scene>;contentHostFrame?:FrameController;}}
function remember(key:string,scene:Scene){window.contentHostScenes??={};window.contentHostScenes[key]=scene;}
function Example({title,name,children,options}:{title:string;name:string;children:ReactNode;options?:ReactNode}){return <section className="example basic-example" id={name}><h2><LocalizedText>{title}</LocalizedText></h2><div className="example-card"><div className={`basic-live${options?' with-options':''}`}><div className="basic-preview">{children}</div>{options&&<div className="options">{options}</div>}</div><GalleryExpander className="source"><GalleryExpanderHeader>Source code</GalleryExpanderHeader><SourceCode>{(name==='scene-frame'?extractSampleSource(source,'scene-frame-pages')+'\n\n':'')+extractSampleSource(source,name)}</SourceCode></GalleryExpander></div></section>;}
const alignments=[HorizontalAlignment.Left,HorizontalAlignment.Center,HorizontalAlignment.Right,HorizontalAlignment.Stretch];
const vertical=[VerticalAlignment.Top,VerticalAlignment.Center,VerticalAlignment.Bottom,VerticalAlignment.Stretch];
// @sample:scene-frame-pages:start
const pages:readonly ScenePageDefinition[]=[
 {key:'first',title:'First page',cacheMode:NavigationCacheMode.Enabled,content:{kind:NodeKind.StackPanel,properties:{spacing:12,padding:[20,20,20,20],background:'#DFF6DD'},children:[{kind:NodeKind.TextBlock,properties:{text:'First page',fontSize:24}},{kind:NodeKind.TextBox,name:'editor',properties:{text:'This text is retained in the Rust page cache.',width:340}},{kind:NodeKind.TextBlock,properties:{text:'Navigate to the next page, then go back.',wrap:true}}]}},
 {key:'second',title:'Second page',content:{kind:NodeKind.StackPanel,properties:{spacing:12,padding:[20,20,20,20],background:'#DDEBFF'},children:[{kind:NodeKind.TextBlock,properties:{text:'Second page',fontSize:24}},{kind:NodeKind.TextBlock,properties:{text:'The same Canvas renders the page and its navigation transition.',wrap:true}}]}},
];
// @sample:scene-frame-pages:end
export function ContentHostsPage({kind='Frame'}:{kind?:Kind}){
 const [theme,setTheme]=useGalleryTheme(),[backend,setBackend]=useState(RendererBackend.Canvas2D),[alignment,setAlignment]=useState(0),[label,setLabel]=useState('Hello from Rust'),[celsius,setCelsius]=useState(20),[fahrenheit,setFahrenheit]=useState('Fahrenheit: 68.00 °F'),[frame,setFrame]=useState<FrameController>(),[status,setStatus]=useState(''),[transition,setTransition]=useState(NavigationTransition.Entrance),[cancel,setCancel]=useState(false);
 const shared={theme,backend};
 return <><Header title={kind==='Frame'?'Frame / Page transitions':kind} theme={theme} onTheme={setTheme}/><div className="page-toolbar"><GalleryComboBox aria-label="Renderer" value={backend} onValueChanged={v=>setBackend(v as RendererBackend)}>{Object.values(RendererBackend).map(value=><GalleryOption key={value} value={value}>{value}</GalleryOption>)}</GalleryComboBox></div>
 {kind==='ContentControl'&&<Example title="String content and live replacement" name="content-control" options={<><GalleryButton onClick={()=>setLabel(label==='Hello from Rust'?'Content updated':'Hello from Rust')}>Change content</GalleryButton><GalleryComboBox aria-label="Content alignment" value={alignment} onValueChanged={v=>setAlignment(Number(v))}>{alignments.map((v,i)=><GalleryOption key={v} value={i}>{v}</GalleryOption>)}</GalleryComboBox></>}><SceneView {...shared} style={{height:140}} onReady={s=>remember('content-control',s)}>
 {/* @sample:content-control:start */}
 <ContentControl content={label} width={360} height={120} padding={[12,8,12,8]} borderThickness={[1,1,1,1]} borderBrush="#808080" horizontalContentAlignment={alignments[alignment]} verticalContentAlignment={VerticalAlignment.Center}/>
 {/* @sample:content-control:end */}
 </SceneView></Example>}
 {kind==='ContentPresenter'&&<Example title="Content alignment, border and padding" name="content-presenter" options={<GalleryComboBox aria-label="Content alignment" value={alignment} onValueChanged={v=>setAlignment(Number(v))}>{alignments.map((v,i)=><GalleryOption key={v} value={i}>{v} / {vertical[i]}</GalleryOption>)}</GalleryComboBox>}><SceneView {...shared} style={{height:160}} onReady={s=>remember('content-presenter',s)}>
 {/* @sample:content-presenter:start */}
 <ContentPresenter width={360} height={140} padding={[16,12,16,12]} borderThickness={[2,2,2,2]} borderBrush="#808080" horizontalContentAlignment={alignments[alignment]} verticalContentAlignment={vertical[alignment]}><Border width={100} height={36} background="#0078D4"><TextBlock text="Content" foreground="#FFFFFF" horizontalAlignment={HorizontalAlignment.Center} verticalAlignment={VerticalAlignment.Center}/></Border></ContentPresenter>
 {/* @sample:content-presenter:end */}
 </SceneView></Example>}
 {kind==='UserControl'&&<Example title="Temperature Converter UserControl example" name="user-control"><SceneView {...shared} autoHeight onReady={s=>remember('user-control',s)}>
 {/* @sample:user-control:start */}
 <UserControl><StackPanel spacing={12}><TextBlock text="Temperature Converter" fontSize={20}/><NumberBox header="Celsius" value={celsius} width={240} onValueChanged={e=>setCelsius(e.newValue??0)}/><Button text="Convert" onClick={()=>setFahrenheit(`Fahrenheit: ${(celsius*9/5+32).toFixed(2)} °F`)}/><TextBlock text={fahrenheit}/></StackPanel></UserControl>
 {/* @sample:user-control:end */}
 </SceneView></Example>}
 {kind==='Page'&&<Example title="A Page containing reusable controls" name="content-page"><SceneView {...shared} autoHeight onReady={s=>remember('content-page',s)}>
 {/* @sample:content-page:start */}
 <Page title="Account"><Border padding={[16,16,16,16]} borderThickness={[1,1,1,1]} borderBrush="#808080"><StackPanel spacing={12}><TextBlock text="Account" fontSize={24}/><UserControl content="A reusable UserControl inside a Page."/><Button text="Update content" onClick={()=>setLabel('Page action invoked')}/><ContentPresenter content={label}/></StackPanel></Border></Page>
 {/* @sample:content-page:end */}
 </SceneView></Example>}
 {kind==='Frame'&&<Example title="Page transitions" name="scene-frame" options={<><GalleryComboBox aria-label="Transition" value={transition} onValueChanged={v=>setTransition(v as NavigationTransition)}>{Object.values(NavigationTransition).map(v=><GalleryOption key={v} value={v}>{v}</GalleryOption>)}</GalleryComboBox><GalleryButton onClick={()=>frame?.navigate('second',{transition})}>Next page</GalleryButton><GalleryButton onClick={()=>frame?.goBack()}>Back</GalleryButton><GalleryButton onClick={()=>frame?.goForward()}>Forward</GalleryButton><GalleryButton onClick={()=>setCancel(!cancel)}>{cancel?'Allow navigation':'Cancel navigation'}</GalleryButton><output>{status}</output></>}><SceneView {...shared} style={{height:230}} onReady={s=>remember('scene-frame',s)}>
 {/* @sample:scene-frame:start */}
 <SceneFrame pages={pages} cacheSize={2} onReady={node=>{setFrame(node);window.contentHostFrame=node;node.navigate('first');}} onNavigating={e=>{e.cancel=cancel;}} onNavigated={e=>setStatus(`${e.frameNavigation.mode}: ${e.frameNavigation.to.page}`)} onNavigationStopped={()=>setStatus('Navigation cancelled')}/>
 {/* @sample:scene-frame:end */}
 </SceneView></Example>}
 </>;
}
