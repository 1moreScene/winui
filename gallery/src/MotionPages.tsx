import {useRef,useState,type ReactNode} from 'react';
import {SceneView,Grid,StackPanel,Rectangle,TextBlock,Button,Ellipse,Popup,Image,GridView,ItemsRepeater,Border} from './react';
import {GalleryButton,GalleryComboBox,GalleryOption,GallerySlider,GalleryCheckBox,GalleryExpander,GalleryExpanderHeader} from './GalleryControls';
import {Header} from './ButtonPage';
import {useGalleryTheme} from './gallery-theme';
import {ThemeMode,RendererBackend,ThemeTransition,ConnectedAnimationConfiguration,ScalarExpression as Expr,ExpressionProperty as Property,AnimatedProperty as Channel,HorizontalAlignment as H,VerticalAlignment as V,Orientation,GridUnit,ImageStretch,UniformGridLayout,ListViewSelectionMode,type ImageOptions,type Scene,type Panel,type SceneNode} from './index';
import official from './official-motion.json';
import source from './MotionPages.tsx?raw';
import {extractSampleSource} from './sample-source';

type Shared={theme:ThemeMode;backend:RendererBackend;reducedMotion:boolean};
declare global {interface Window {motionScenes:Record<string,Scene>;}}
function remember(key:string,scene:Scene){window.motionScenes??={};window.motionScenes[key]=scene;}
function Example({name,kind,index,children,options}:{name:string;kind:string;index:number;children:ReactNode;options?:ReactNode}){
  const sample=official.catalog.find(entry=>entry.name===kind)!.samples[index];
  const [native,setNative]=useState(false);
  return <section id={kind==='ConnectedAnimation'?`${name}-${index}`:name} className="example basic-example"><h2>{sample.title}</h2><div className="example-card"><div className={`basic-live${options?' with-options':''}`}><div className="basic-preview">{children}</div>{options&&<aside className="options">{options}</aside>}</div><GalleryExpander className="source"><GalleryExpanderHeader>Source code</GalleryExpanderHeader><div className="source-tabs"><GalleryButton onClick={()=>setNative(false)}>TypeScript / React</GalleryButton><GalleryButton onClick={()=>setNative(true)}>Official source</GalleryButton></div><pre><code>{native?sample.xaml:extractSampleSource(source,name)}</code></pre></GalleryExpander></div></section>;
}
function Entrance({shared}:{shared:Shared}){
  const [items,setItems]=useState([0,1,2,3,4]);const serial=useRef(5);
  return <Example name="theme-entrance" kind="ThemeTransition" index={0} options={<><GalleryButton onClick={()=>setItems(items=>[...items,serial.current++])}>Add one</GalleryButton><GalleryButton onClick={()=>setItems(items=>[...items,...Array.from({length:5},()=>serial.current++)])}>Add five</GalleryButton><GalleryButton onClick={()=>setItems([])}>Clear all</GalleryButton></>}>
    {/* @sample:theme-entrance:start */}
    <SceneView {...shared} style={{height:100}} onReady={scene=>remember('entrance',scene)}><StackPanel orientation={Orientation.Horizontal} motion={{childrenTransitions:[ThemeTransition.Entrance]}}>{items.map(id=><Rectangle key={id} width={50} height={50} margin={[5,5,5,5]} fill="#add8e6"/>)}</StackPanel></SceneView>
    {/* @sample:theme-entrance:end */}
  </Example>;
}
function Reposition({shared}:{shared:Shared}){
  const [visible,setVisible]=useState(true);
  return <Example name="theme-reposition" kind="ThemeTransition" index={1} options={<GalleryButton onClick={()=>setVisible(!visible)}>Reposition</GalleryButton>}>
    {/* @sample:theme-reposition:start */}
    <SceneView {...shared} style={{height:120}} onReady={scene=>remember('reposition',scene)}><StackPanel orientation={Orientation.Horizontal}><Rectangle width={75} height={75} margin={[5,5,5,5]} fill="#ff0000"/><Rectangle width={75} height={75} margin={[5,5,5,5]} fill="#008000" visible={visible}/><Rectangle width={75} height={75} margin={[5,5,5,5]} fill="#0000ff" motion={{transitions:[ThemeTransition.Reposition]}}/></StackPanel></SceneView>
    {/* @sample:theme-reposition:end */}
  </Example>;
}
function Content({shared}:{shared:Shared}){
  const [updated,setUpdated]=useState(false);
  return <Example name="theme-content" kind="ThemeTransition" index={2} options={<GalleryButton onClick={()=>setUpdated(!updated)}>Refresh data</GalleryButton>}>
    {/* @sample:theme-content:start */}
    <SceneView {...shared} style={{height:200}} onReady={scene=>remember('content',scene)}><StackPanel motion={{childrenTransitions:[ThemeTransition.Content]}}>{Array.from({length:5},(_,i)=><TextBlock key={i} text={`${updated?'Updated content':'Item'} ${i}`} height={36}/>)}</StackPanel></SceneView>
    {/* @sample:theme-content:end */}
  </Example>;
}
function AddDelete({shared}:{shared:Shared}){
  const [items,setItems]=useState(Array.from({length:10},(_,i)=>i));const serial=useRef(10);
  return <Example name="theme-add-delete" kind="ThemeTransition" index={3} options={<><GalleryButton onClick={()=>setItems(items=>[...items,serial.current++])}>Add</GalleryButton><GalleryButton onClick={()=>setItems(items=>items.slice(1))}>Delete</GalleryButton><GalleryButton onClick={()=>setItems(items=>[...items.slice(1),serial.current++])}>Add and Del</GalleryButton></>}>
    {/* @sample:theme-add-delete:start */}
    <SceneView {...shared} style={{height:390}} onReady={scene=>remember('add-delete',scene)}><StackPanel motion={{childrenTransitions:[ThemeTransition.AddDelete]}}>{items.map(id=><TextBlock key={id} text={`${id<10?'Item':'New Item'} ${id}`} height={36}/>)}</StackPanel></SceneView>
    {/* @sample:theme-add-delete:end */}
  </Example>;
}
function PopupExample({shared}:{shared:Shared}){
  const [open,setOpen]=useState(false);
  return <Example name="theme-popup" kind="ThemeTransition" index={4}>
    {/* @sample:theme-popup:start */}
    <SceneView {...shared} style={{height:260}} onReady={scene=>remember('popup',scene)}><Grid><Button text="Show Popup" width={130} height={32} horizontalAlignment={H.Left} verticalAlignment={V.Top} onClick={()=>setOpen(true)}/><Popup isOpen={open} horizontalOffset={40} verticalOffset={30} width={200} height={200}><Grid motion={{transitions:[ThemeTransition.Popup]}}><Ellipse background={{resource:'SolidBackgroundFillColorBaseBrush'}}/><StackPanel width={160} spacing={16} horizontalAlignment={H.Center} verticalAlignment={V.Center}><TextBlock text="This is a popup using PopupThemeTransition" wrap /><Button text="Close Popup" onClick={()=>setOpen(false)}/></StackPanel></Grid></Popup></Grid></SceneView>
    {/* @sample:theme-popup:end */}
  </Example>;
}
// @sample:connected-animation:start
function Connected({shared,index}:{shared:Shared;index:number}){
  const [configuration,setConfiguration]=useState(ConnectedAnimationConfiguration.Gravity);
  const [selected,setSelected]=useState<number|null>(null);
  const images=useRef(new Map<number,SceneNode<ImageOptions>>()),hero=useRef<SceneNode<ImageOptions>|undefined>(undefined);
  const pending=useRef<ReturnType<SceneNode['prepareConnectedAnimation']>|undefined>(undefined),returnTo=useRef(0);
  const data=Array.from({length:index===3?13:8},(_,i)=>({id:String(i),text:`Item ${i+1}`}));
  function navigate(item:number){
    const node=images.current.get(item);if(!node||node.isDisposed)return;
    pending.current=node.prepareConnectedAnimation(`sample-${index}`);returnTo.current=item;setSelected(item);
  }
  function back(){
    const node=hero.current;if(!node||node.isDisposed)return;
    pending.current=node.prepareConnectedAnimation(`sample-${index}`);setSelected(null);
  }
  function thumbnail(item:{id:string;text:string}){
    const i=Number(item.id);
    return <Button text="" accessibleName={`Open ${item.text}`} width={index===1?260:150} height={index===1?160:120} onClick={()=>navigate(i)}><StackPanel><Image source={`/official/reading/LandscapeImage${i+1}.jpg`} width={index===1?250:140} height={index===1?125:90} stretch={ImageStretch.UniformToFill} onReady={node=>{images.current.set(i,node);if(pending.current&&returnTo.current===i){pending.current.tryStart(node,configuration);pending.current=undefined;}}}/><TextBlock text={item.text}/></StackPanel></Button>;
  }
  return <Example name="connected-animation" kind="ConnectedAnimation" index={index} options={<><GalleryButton onClick={()=>selected===null?navigate(0):back()}>{selected===null?'Navigate':'Back'}</GalleryButton>{index===2&&<label>Configurations<GalleryComboBox aria-label="Connected configuration" value={configuration} onValueChanged={value=>setConfiguration(value as ConnectedAnimationConfiguration)}>{Object.values(ConnectedAnimationConfiguration).map(value=><GalleryOption key={value} value={value}>{value}</GalleryOption>)}</GalleryComboBox></label>}</>}>
    <SceneView {...shared} style={{height:index===0?520:400}} onReady={scene=>remember(`connected-${index}`,scene)}>
      {selected===null?(index===3?<ItemsRepeater items={data} layout={new UniformGridLayout({minItemWidth:160,minItemHeight:130})} renderItem={thumbnail}/>:index===1?<Border width={290} height={190} padding={[12,12,12,12]} background={{resource:'SolidBackgroundFillColorBaseBrush'}} horizontalAlignment={H.Left} verticalAlignment={V.Top}>{thumbnail(data[0])}</Border>:index===2?<StackPanel padding={[12,12,12,12]}>{thumbnail(data[0])}<TextBlock text="Choose a configuration, then navigate between the two layouts." wrap/></StackPanel>:<GridView items={data} itemWidth={160} itemHeight={130} selectionMode={ListViewSelectionMode.None} renderItem={thumbnail}/>):<StackPanel key="detail" padding={[24,12,24,12]} spacing={12}><Button text="Back" onClick={back}/><Image source={`/official/reading/LandscapeImage${selected+1}.jpg`} width={360} height={230} stretch={ImageStretch.UniformToFill} onReady={node=>{hero.current=node;pending.current?.tryStart(node,configuration);pending.current=undefined;}}/><TextBlock text={`Item ${selected+1}`} fontSize={24}/><TextBlock text="A connected animation carries the selected image to this detail layout." wrap/></StackPanel>}
    </SceneView>
  </Example>;
}
// @sample:connected-animation:end
function NaturalMotion({shared}:{shared:Shared}){
  const [damping,setDamping]=useState(0.6),[period,setPeriod]=useState(50);
  return <Example name="composition-spring" kind="XamlCompInterop" index={0} options={<><label>Damping Ratio<GalleryComboBox aria-label="Damping Ratio" value={damping} onValueChanged={v=>setDamping(Number(v))}>{[0.2,0.4,0.6,0.8,1].map(v=><GalleryOption key={v} value={v}>{v}</GalleryOption>)}</GalleryComboBox></label><label>Period (in ms)<GallerySlider aria-label="Spring period" min={25} max={200} step={25} value={period} onValueChanged={setPeriod}/></label></>}>
    {/* @sample:composition-spring:start */}
    <SceneView {...shared} style={{height:180}} onReady={scene=>remember('spring',scene)}><StackPanel spacing={24} padding={[20,12,20,12]}><TextBlock text="Hover over the button to animate its scale."/><Button text="Item" width={100} height={50} motion={{hoverSpring:{period,dampingRatio:damping}}}/></StackPanel></SceneView>
    {/* @sample:composition-spring:end */}
  </Example>;
}
function Inverse({shared}:{shared:Shared}){
  const square=useRef<Panel|undefined>(undefined);
  return <Example name="composition-inverse" kind="XamlCompInterop" index={1}>
    {/* @sample:composition-inverse:start */}
    <SceneView {...shared} style={{height:210}} onReady={scene=>remember('inverse',scene)}><StackPanel spacing={12}><TextBlock text="Hover over the square. The circle's scale is inversely related to the square." wrap/><Grid columns={[{unit:GridUnit.Star},{unit:GridUnit.Star}]} height={100}><Grid width={50} height={50} background="#0078d4" motion={{hoverSpring:{}}} onReady={node=>{square.current=node;}}/><Ellipse column={1} width={50} height={50} background="#0078d4" onReady={node=>{const source=square.current;if(source&&!source.isDisposed)node.bindExpressions({[Channel.ScaleX]:Expr.constant(1).divide(Expr.reference(source,Property.ScaleX)),[Channel.ScaleY]:Expr.constant(1).divide(Expr.reference(source,Property.ScaleY))});}}/></Grid></StackPanel></SceneView>
    {/* @sample:composition-inverse:end */}
  </Example>;
}
function Follow({shared}:{shared:Shared}){
  const above=useRef<SceneNode[]>([]);
  return <Example name="composition-follow" kind="XamlCompInterop" index={2}>
    {/* @sample:composition-follow:start */}
    <SceneView {...shared} style={{height:400}} onReady={scene=>remember('follow',scene)}><StackPanel spacing={10} padding={[20,12,20,12]}><TextBlock text="Hover over any button. The following buttons move out of the way." wrap/>{[0,1,2,3].map(i=><Button key={i} text={`Item ${i+1}`} width={100} height={50} motion={{hoverSpring:{}}} onReady={node=>{above.current[i]=node;const source=above.current[i-1];if(source&&!source.isDisposed)node.bindExpressions({[Channel.TranslationY]:Expr.reference(source,Property.ScaleY).subtract(1).multiply(50).add(Expr.reference(source,Property.TranslationY).modulo(50*i))});}}/>)}</StackPanel></SceneView>
    {/* @sample:composition-follow:end */}
  </Example>;
}
function Orbit({shared}:{shared:Shared}){
  const [size,setSize]=useState(200);const parent=useRef<Panel|undefined>(undefined);
  return <Example name="composition-size" kind="XamlCompInterop" index={3} options={<label>Change radius<GallerySlider aria-label="Change radius" min={200} max={400} value={size} onValueChanged={setSize}/></label>}>
    {/* @sample:composition-size:start */}
    <SceneView {...shared} style={{height:500}} onReady={scene=>remember('orbit',scene)}><Grid width={size} height={size} margin={[24,24,100,70]} horizontalAlignment={H.Left} verticalAlignment={V.Top} onReady={node=>{parent.current=node;}}>{Array.from({length:8},(_,i)=><Button key={i} text="Button" accessibleName={`Orbit button ${i+1}`} horizontalAlignment={H.Left} verticalAlignment={V.Center} onReady={node=>{const source=parent.current;if(!source||source.isDisposed)return;const radius=Expr.reference(source,Property.ActualWidth).divide(2),theta=radius.multiply(0.02).add(2*Math.PI*(i+1)/8);node.bindExpressions({[Channel.TranslationX]:radius.multiply(theta.cos()).add(radius),[Channel.TranslationY]:radius.multiply(theta.sin())});}}/>)}</Grid></SceneView>
    {/* @sample:composition-size:end */}
  </Example>;
}
function Offset({shared}:{shared:Shared}){
  const [fontSize,setFontSize]=useState(12),[margin,setMargin]=useState(0);const target=useRef<SceneNode|undefined>(undefined);
  return <Example name="composition-offset" kind="XamlCompInterop" index={4} options={<><label>Change font size<GallerySlider aria-label="Change font size" min={12} max={24} value={fontSize} onValueChanged={setFontSize}/></label><label>Change text margin<GallerySlider aria-label="Change text margin" min={0} max={100} value={margin} onValueChanged={setMargin}/></label></>}>
    {/* @sample:composition-offset:start */}
    <SceneView {...shared} style={{height:520}} onReady={scene=>remember('offset',scene)}><Grid><TextBlock width={300} fontSize={fontSize} margin={[margin,margin,0,0]} horizontalAlignment={H.Left} verticalAlignment={V.Top} text="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat." wrap onReady={node=>{target.current=node;}}/><Grid width={170} height={50} horizontalAlignment={H.Left} verticalAlignment={V.Top} background={{resource:'SolidBackgroundFillColorBaseBrush'}} onReady={node=>{const source=target.current;if(!source||source.isDisposed)return;node.bindExpressions({[Channel.TranslationX]:Expr.reference(source,Property.ActualOffsetX).add(Expr.reference(source,Property.ActualWidth)),[Channel.TranslationY]:Expr.reference(source,Property.ActualOffsetY).add(Expr.reference(source,Property.ActualHeight).divide(2)).subtract(25)});}}><TextBlock text="I am always right aligned center to the target." wrap margin={[6,6,6,6]}/></Grid></Grid></SceneView>
    {/* @sample:composition-offset:end */}
  </Example>;
}
export function MotionPages({kind}:{kind:'ConnectedAnimation'|'ThemeTransition'|'XamlCompInterop'}){
  const [theme,setTheme]=useGalleryTheme(),[backend,setBackend]=useState(RendererBackend.Canvas2D),[reducedMotion,setReducedMotion]=useState(false);
  const shared={theme,backend,reducedMotion};
  return <><Header title={{ConnectedAnimation:'Connected animations',ThemeTransition:'Theme transitions',XamlCompInterop:'XAML and Composition interop'}[kind]} theme={theme} onTheme={setTheme}/><main className="stage-main official-motion"><div className="effects-options"><label>Renderer<GalleryComboBox aria-label="Renderer" value={backend} onValueChanged={v=>setBackend(v as RendererBackend)}>{Object.values(RendererBackend).map(v=><GalleryOption key={v} value={v}>{v}</GalleryOption>)}</GalleryComboBox></label><GalleryCheckBox checked={reducedMotion} onValueChanged={setReducedMotion} label="Reduce motion"/></div>{kind==='ThemeTransition'?<><Entrance shared={shared}/><Reposition shared={shared}/><Content shared={shared}/><AddDelete shared={shared}/><PopupExample shared={shared}/></>:kind==='ConnectedAnimation'?<>{[0,1,2,3].map(index=><Connected key={index} shared={shared} index={index}/>)}</>:<><NaturalMotion shared={shared}/><Inverse shared={shared}/><Follow shared={shared}/><Orbit shared={shared}/><Offset shared={shared}/></>}</main></>;
}
