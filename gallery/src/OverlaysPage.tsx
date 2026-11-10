import { LocalizedText } from "./GalleryLanguage";
import { SourceCode } from './SourceCode';
import { GalleryButton, GalleryCheckBox, GalleryComboBox, GalleryExpander, GalleryExpanderHeader, GalleryNumberBox, GalleryOption } from './GalleryControls';
import { useGalleryTheme } from './gallery-theme';
import {useState,useEffect,type ReactNode} from 'react';
import {Header} from './ButtonPage';
import {SceneView,StackPanel,Button,TextBlock,Popup,ToolTip,Flyout,MenuFlyout,Slider,Border} from 'winui-wasm/react';
import {ThemeMode,RendererBackend,OverlayPlacement,MenuEntryKind,Orientation,HorizontalAlignment,VerticalAlignment,type Scene} from 'winui-wasm';
import official from './official-overlays.json';
import pageSource from './OverlaysPage.tsx?raw';
import {extractSampleSource} from './sample-source';

declare global {interface Window {overlayScenes:Record<string,Scene>;}}
const remember=(name:string,scene:Scene)=>{window.overlayScenes??={};window.overlayScenes[name]=scene;};
function Example({name,control,children,options,output,activePage}:{name:string;control:keyof typeof official.controls;children:ReactNode;options?:ReactNode;output?:string;activePage?:keyof typeof official.controls}) {
 const[native,setNative]=useState(false);if(activePage&&activePage!==control)return null;const sample=official.controls[control].samples[0];
 return <section id={name} className="example basic-example"><h2><LocalizedText>{sample?.title ?? control}</LocalizedText></h2><div className="example-card"><div className={`basic-live ${options?'with-options':''}`}><div className="basic-preview">{children}</div>{output!==undefined&&<div className="basic-output"><span>Output:</span><output aria-label={`${control} output`}>{output}</output></div>}{options&&<div className="options">{options}</div>}</div><GalleryExpander className="source"><GalleryExpanderHeader>Source code</GalleryExpanderHeader><div className="source-tabs"><GalleryButton className={!native?'active':''} onClick={()=>setNative(false)}>TypeScript / React</GalleryButton><GalleryButton className={native?'active':''} onClick={()=>setNative(true)}>Official XAML</GalleryButton></div><SourceCode language={native ? 'xaml' : 'tsx'}>{native?sample?.xaml:extractSampleSource(pageSource,name)}</SourceCode></GalleryExpander></div></section>;
}
export function OverlaysPage({page}:{page?:keyof typeof official.controls}) {
 const[theme,setTheme]=useGalleryTheme(),[backend,setBackend]=useState(RendererBackend.Canvas2D);
 const[popup,setPopup]=useState(false),[lightDismiss,setLightDismiss]=useState(true),[offset,setOffset]=useState(200);
 const[cancel,setCancel]=useState(false);
 const[placement,setPlacement]=useState(OverlayPlacement.Top);
 const[command,setCommand]=useState('No command invoked');
 const[value,setValue]=useState(40),[vertical,setVertical]=useState(false),[reverse,setReverse]=useState(false),[enabled,setEnabled]=useState(true);
 const[tip,setTip]=useState(true);
 useEffect(()=>{document.documentElement.dataset.theme=theme;},[theme]);const shared={theme,backend};
 return <><Header title="Popups, flyouts and Slider" theme={theme} onTheme={setTheme}/><main className="stage-main official-motion overlay-gallery"><div className="effects-options"><label>Renderer <GalleryComboBox aria-label="Renderer" value={backend} onValueChanged={e=>setBackend(e as RendererBackend)}>{Object.values(RendererBackend).map(v=><GalleryOption key={v}>{v}</GalleryOption>)}</GalleryComboBox></label></div>
 <Example activePage={page} name="overlay-popup" control="Popup" output={popup?'Open':'Closed'} options={<><GalleryCheckBox  checked={lightDismiss} onValueChanged={e=>setLightDismiss(e)}  label={<>Light dismiss</>}/><label>Horizontal offset<GalleryNumberBox aria-label="Horizontal offset"  min={-100} max={500} value={offset} onValueChanged={e=>setOffset(e||0)}/></label></>}>
 <SceneView {...shared} style={{height:260}} onReady={s=>remember('popup',s)}>
  {/* @sample:overlay-popup:start */}
  <Button text="Show Popup (using Offset)" horizontalAlignment={HorizontalAlignment.Left} verticalAlignment={VerticalAlignment.Top} margin={[0,16,0,0]} onClick={()=>setPopup(true)}/>
   <Popup isOpen={popup} horizontalOffset={offset} verticalOffset={40} isLightDismissEnabled={lightDismiss} onClosed={()=>setPopup(false)}>
    <Border width={240} padding={[16,16,16,16]} acrylicResource="FlyoutPresenterBackground" borderThickness={[1,1,1,1]} borderBrush={{resource:'FlyoutBorderThemeBrush'}} cornerRadius={8}>
     <StackPanel spacing={8}><TextBlock text="Simple Popup" fontSize={16}/><Button text="Close Popup" horizontalAlignment={HorizontalAlignment.Left} onClick={()=>setPopup(false)}/></StackPanel>
    </Border>
   </Popup>

  {/* @sample:overlay-popup:end */}
 </SceneView></Example>
 <Example activePage={page} name="overlay-tooltip" control="ToolTip" output="Hover or focus the button; pointer delay is 400 ms.">
 <SceneView {...shared} style={{height:220}} onReady={s=>remember('tooltip',s)}>
  {/* @sample:overlay-tooltip:start */}
  <Button text="Button with ToolTip" horizontalAlignment={HorizontalAlignment.Left} verticalAlignment={VerticalAlignment.Top} margin={[140,100,0,0]}>
   <Button.ToolTip><ToolTip text="A ToolTip with content" placement={OverlayPlacement.Top}/></Button.ToolTip>
   </Button>

  {/* @sample:overlay-tooltip:end */}
 </SceneView></Example>
 <Example activePage={page} name="overlay-flyout" control="Flyout" options={<><label>Placement<GalleryComboBox aria-label="Placement" value={placement} onValueChanged={e=>setPlacement(e as OverlayPlacement)}>{Object.values(OverlayPlacement).map(v=><GalleryOption key={v}>{v}</GalleryOption>)}</GalleryComboBox></label><GalleryCheckBox  aria-label="Cancel closing" checked={cancel} onValueChanged={e=>setCancel(e)}  label={<>Cancel closing</>}/></>}>
 <SceneView {...shared} style={{height:320}} onReady={s=>remember('flyout',s)}>
  {/* @sample:overlay-flyout:start */}
   <Button text="Empty cart" horizontalAlignment={HorizontalAlignment.Left} verticalAlignment={VerticalAlignment.Top} margin={[120,160,0,0]}>
    <Button.Flyout><Flyout placement={placement} width={260} onClosing={e=>{e.cancel=cancel;}}>
     <StackPanel spacing={12}><TextBlock text="All items will be removed. Do you want to continue?" wrap/>
      <Button text="Confirm empty cart" horizontalAlignment={HorizontalAlignment.Left} closeFlyout/>
     </StackPanel>
    </Flyout></Button.Flyout>
   </Button>
  {/* @sample:overlay-flyout:end */}
 </SceneView></Example>
 <Example activePage={page} name="overlay-menu" control="MenuFlyout" output={command} options={<p><LocalizedText>Use arrows, Home/End, Enter or Space. Escape restores focus.</LocalizedText></p>}>
 <SceneView {...shared} style={{height:320}} onReady={s=>remember('menu',s)}>
  {/* @sample:overlay-menu:start */}
  <Button text="Show menu" horizontalAlignment={HorizontalAlignment.Left} verticalAlignment={VerticalAlignment.Top} margin={[170,200,0,0]}>
   <Button.Flyout><MenuFlyout placement={OverlayPlacement.Top} width={220}
    menuItems={[{id:'open',text:'Open'},{id:'save',text:'Save'},{id:'separator',kind:MenuEntryKind.Separator},{id:'option',text:'Enable option',kind:MenuEntryKind.Toggle,checked:true},{id:'disabled',text:'Unavailable',enabled:false}]}
    onItemInvoked={e=>setCommand(`${e.itemId}${e.isChecked==null?'':`: ${e.isChecked}`}`)}/></Button.Flyout>
   </Button>

  {/* @sample:overlay-menu:end */}
 </SceneView></Example>
 <Example activePage={page} name="overlay-slider" control="Slider" output={`Value: ${value}`} options={<><GalleryCheckBox  checked={vertical} onValueChanged={e=>setVertical(e)}  label={<>Vertical</>}/><GalleryCheckBox  checked={reverse} onValueChanged={e=>setReverse(e)}  label={<>Reverse direction</>}/><GalleryCheckBox  checked={enabled} onValueChanged={e=>setEnabled(e)}  label={<>Enabled</>}/><GalleryCheckBox  checked={tip} onValueChanged={e=>setTip(e)}  label={<>Thumb ToolTip</>}/><GalleryButton onClick={()=>setValue(50)}>Set value to 50</GalleryButton></>}>
 <SceneView {...shared} style={{height:280}} onReady={s=>remember('slider',s)}>
  {/* @sample:overlay-slider:start */}
  <Slider horizontalAlignment={HorizontalAlignment.Left} verticalAlignment={VerticalAlignment.Top} margin={[60,60,0,0]} width={vertical?70:320} height={vertical?190:60}
   header="Volume" value={value} minimum={0} maximum={100} stepFrequency={1} orientation={vertical?Orientation.Vertical:Orientation.Horizontal}
   isDirectionReversed={reverse} enabled={enabled} isThumbToolTipEnabled={tip} onValueChanged={e=>setValue(e.value??0)}/>

  {/* @sample:overlay-slider:end */}
 </SceneView></Example></main></>;
}
