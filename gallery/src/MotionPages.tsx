import {useRef,useState} from 'react';
import {SceneView,Grid,StackPanel,Rectangle,TextBlock,Button,Ellipse,Popup,Border,RadioButtons,Slider} from 'winui-wasm/react';
import {GalleryButton,GalleryComboBox,GalleryOption,GallerySlider,GalleryCheckBox} from './GalleryControls';
import {Header} from './ButtonPage';
import {useGalleryTheme} from './gallery-theme';
import {RendererBackend,ThemeTransition,ScalarExpression as Expr,ExpressionProperty as Property,AnimatedProperty as Channel,HorizontalAlignment as H,VerticalAlignment as V,Orientation,GridUnit,type Panel,type SceneNode} from 'winui-wasm';

import {MotionExample as Example,MotionPreview as Preview,rememberMotion as remember,type MotionShared as Shared} from './MotionExample';
import {ConnectedCollection,ConnectedCards,ConnectedConfiguration} from './ConnectedAnimationSamples';
import './motion-gallery.css';
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
type Spring={period:number;dampingRatio:number};
function NaturalMotion({shared,spring,setDamping,setPeriod}:{shared:Shared;spring:Spring;setDamping:(value:number)=>void;setPeriod:(value:number)=>void}){
  return <Example name="composition-spring" kind="XamlCompInterop" index={0} options={<SceneView {...shared} autoHeight autoWidth><StackPanel><RadioButtons header="Damping Ratio" items={['0.2','0.4','0.6','0.8']} selectedIndex={[0.2,0.4,0.6,0.8].indexOf(spring.dampingRatio)} onSelectionChanged={e=>setDamping([0.2,0.4,0.6,0.8][e.selectedIndex??2])}/><Slider header="Period (in ms)" minimum={25} maximum={200} stepFrequency={25} tickFrequency={25} value={spring.period} onValueChanged={e=>setPeriod(e.value??50)}/></StackPanel></SceneView>}>
    {/* @sample:composition-spring:start */}
    <Preview {...shared} onReady={scene=>remember('spring',scene)}><StackPanel><TextBlock text="Hover over the button to animate its scale." margin={[0,0,0,12]}/><Button text="Item" width={100} height={50} motion={{hoverSpring:spring}}/></StackPanel></Preview>
    {/* @sample:composition-spring:end */}
  </Example>;
}
function Inverse({shared,spring}:{shared:Shared;spring:Spring}){
  const square=useRef<SceneNode|undefined>(undefined);
  return <Example name="composition-inverse" kind="XamlCompInterop" index={1}>
    {/* @sample:composition-inverse:start */}
    <Preview {...shared} onReady={scene=>remember('inverse',scene)}><StackPanel height={200}><TextBlock text="Hover over the square to animate its scale. Notice that the ellipse also animates."/><TextBlock text="The scale of the circle is inversely related to the scale of the square." margin={[0,0,0,12]}/><Grid verticalAlignment={V.Top} columns={[{unit:GridUnit.Star},{unit:GridUnit.Star}]}><Rectangle width={50} height={50} fill={{resource:'SystemAccentColor'}} motion={{hoverSpring:spring}} onReady={node=>{square.current=node;}}/><Ellipse column={1} width={50} height={50} margin={[55,0,55,0]} background={{resource:'SystemAccentColor'}} onReady={node=>{const source=square.current;if(source&&!source.isDisposed)node.bindExpressions({[Channel.ScaleX]:Expr.constant(1).divide(Expr.reference(source,Property.ScaleX)),[Channel.ScaleY]:Expr.constant(1).divide(Expr.reference(source,Property.ScaleY))});}}/></Grid></StackPanel></Preview>
    {/* @sample:composition-inverse:end */}
  </Example>;
}
function Follow({shared,spring}:{shared:Shared;spring:Spring}){
  const above=useRef<SceneNode[]>([]);
  return <Example name="composition-follow" kind="XamlCompInterop" index={2}>
    {/* @sample:composition-follow:start */}
    <Preview {...shared} onReady={scene=>remember('follow',scene)}><StackPanel margin={[0,0,0,50]}><TextBlock text="Hover over any button to animate its scale. Notice that the other buttons move out of the way."/><TextBlock text="Each button animates as a function of the previous button's scale and translation." margin={[0,0,0,12]}/>{[0,1,2,3].map(i=><Button key={i} text={`Item ${i+1}`} width={100} height={50} margin={[5,5,5,5]} motion={{hoverSpring:spring}} onReady={node=>{above.current[i]=node;const source=above.current[i-1];if(source&&!source.isDisposed)node.bindExpressions({[Channel.TranslationY]:Expr.reference(source,Property.ScaleY).subtract(1).multiply(50).add(Expr.reference(source,Property.TranslationY).modulo(50*i))});}}/>)}</StackPanel></Preview>
    {/* @sample:composition-follow:end */}
  </Example>;
}
function Orbit({shared}:{shared:Shared}){
  const [size,setSize]=useState(200);const parent=useRef<Panel|undefined>(undefined);
  return <Example name="composition-size" kind="XamlCompInterop" index={3} options={<SceneView {...shared} autoHeight autoWidth><Slider header="Change radius" minWidth={150} minimum={200} maximum={400} value={size} onValueChanged={e=>setSize(e.value??200)}/></SceneView>}>
    {/* @sample:composition-size:start */}
    <Preview {...shared} onReady={scene=>remember('orbit',scene)}><Grid width={size} height={size} margin={[12,12,12,12]} onReady={node=>{parent.current=node;}}>{Array.from({length:8},(_,i)=><Button key={i} text="Button" accessibleName={`Button ${i}`} onReady={node=>{const source=parent.current;if(!source||source.isDisposed)return;const radius=Expr.reference(source,Property.ActualWidth).divide(2),theta=radius.multiply(0.02).add(2*Math.PI*(i+1)/8);node.bindExpressions({[Channel.TranslationX]:radius.multiply(theta.cos()).add(radius),[Channel.TranslationY]:radius.multiply(theta.sin())});}}/>)}</Grid></Preview>
    {/* @sample:composition-size:end */}
  </Example>;
}
function Offset({shared}:{shared:Shared}){
  const [fontSize,setFontSize]=useState(12),[margin,setMargin]=useState(0);const target=useRef<SceneNode|undefined>(undefined);
  return <Example name="composition-offset" kind="XamlCompInterop" index={4} options={<SceneView {...shared} autoHeight autoWidth><StackPanel minWidth={150}><Slider header="Change font size" minimum={12} maximum={24} value={fontSize} onValueChanged={e=>setFontSize(e.value??12)}/><Slider header="Change text margin" minimum={0} maximum={100} value={margin} onValueChanged={e=>setMargin(e.value??0)}/></StackPanel></SceneView>}>
    {/* @sample:composition-offset:start */}
    <Preview {...shared} onReady={scene=>remember('offset',scene)}><StackPanel><TextBlock text="This sample positions a popup relative to a block of text that has variable layout size based on font size. Use the sliders to move and resize the text." wrap/><Grid margin={[0,12,0,0]} horizontalAlignment={H.Left}><TextBlock width={300} fontSize={fontSize} margin={[margin,margin,margin,margin]} text="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum." wrap onReady={node=>{target.current=node;}}/><Popup isOpen margin={[5,5,5,5]} onReady={node=>{const source=target.current;if(!source||source.isDisposed)return;node.bindExpressions({[Channel.TranslationX]:Expr.reference(source,Property.ActualOffsetX).add(Expr.reference(source,Property.ActualWidth)),[Channel.TranslationY]:Expr.reference(source,Property.ActualOffsetY).add(Expr.reference(source,Property.ActualHeight).divide(2)).subtract(25)});}}><Border minWidth={50} minHeight={50} maxWidth={200} background={{resource:'FlyoutBackgroundThemeBrush'}} borderBrush={{resource:'SystemControlForegroundChromeGrayBrush'}} borderThickness={[2,2,2,2]}><TextBlock text="I am always right aligned center to the target." fontSize={12} verticalAlignment={V.Center} wrap margin={[6,6,6,6]}/></Border></Popup></Grid></StackPanel></Preview>
    {/* @sample:composition-offset:end */}
  </Example>;
}
export function MotionPages({kind}:{kind:'ConnectedAnimation'|'ThemeTransition'|'XamlCompInterop'}){
  const [theme,setTheme]=useGalleryTheme(),[backend,setBackend]=useState(RendererBackend.Canvas2D),[reducedMotion,setReducedMotion]=useState(false);
  const [dampingRatio,setDamping]=useState(0.6),[period,setPeriod]=useState(50);
  const shared={theme,backend,reducedMotion},spring={dampingRatio,period};
  return <><Header title={{ConnectedAnimation:'Connected Animation',ThemeTransition:'Theme transitions',XamlCompInterop:'Animation interop'}[kind]} theme={theme} onTheme={setTheme}/><main className={`stage-main official-motion${kind==='ThemeTransition'?'':' motion-parity'}`}>{(kind==='ThemeTransition'||new URLSearchParams(location.search).has('motionDiagnostics'))&&<div className="effects-options"><label>Renderer<GalleryComboBox aria-label="Renderer" value={backend} onValueChanged={v=>setBackend(v as RendererBackend)}>{Object.values(RendererBackend).map(v=><GalleryOption key={v} value={v}>{v}</GalleryOption>)}</GalleryComboBox></label><GalleryCheckBox checked={reducedMotion} onValueChanged={setReducedMotion} label="Reduce motion"/></div>}{kind==='ThemeTransition'?<><Entrance shared={shared}/><Reposition shared={shared}/><Content shared={shared}/><AddDelete shared={shared}/><PopupExample shared={shared}/></>:kind==='ConnectedAnimation'?<><ConnectedCollection shared={shared}/><ConnectedCards shared={shared}/><ConnectedConfiguration shared={shared}/><ConnectedCollection shared={shared} repeater/></>:<><NaturalMotion shared={shared} spring={spring} setDamping={setDamping} setPeriod={setPeriod}/><Inverse shared={shared} spring={spring}/><Follow shared={shared} spring={spring}/><Orbit shared={shared}/><Offset shared={shared}/></>}</main></>;
}
