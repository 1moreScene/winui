import {StrictMode,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {WinUIProvider,SceneView,Canvas,Button,Flyout,MenuFlyout,MenuFlyoutItem,TextBlock,StackPanel,OverlayPlacement,type Scene} from 'winui-wasm/react';

declare global {interface Window {buttonFlyoutFixture:{scene?:Scene;cancel:boolean;closing:number;setSurface?:(value:boolean)=>void;remount?:()=>void;unmount?:()=>void;invoked:number;clicks:number;};}}
const state=window.buttonFlyoutFixture={cancel:false,closing:0,invoked:0,clicks:0} as Window['buttonFlyoutFixture'];
function App(){
  const[show,setShow]=useState(true),[generation,setGeneration]=useState(0);
  state.setSurface=setShow;state.remount=()=>setGeneration(value=>value+1);
  return <WinUIProvider><SceneView reducedMotion style={{height:400,width:700}} onReady={scene=>{state.scene=scene;}}>
    <Canvas>
      <Button text="Owned surface" canvasLeft={100} canvasTop={140} onClick={()=>{state.clicks++;}} flyout={show?<Flyout key={generation} placement={OverlayPlacement.Top} width={240} onClosing={event=>{state.closing++;event.cancel=state.cancel;}}>
        {surface=><StackPanel spacing={8}><TextBlock text="Owned content"/><Button text="Confirm close" onClick={()=>surface.hide()}/></StackPanel>}
      </Flyout>:null}/>
      <Button text="Owned menu" canvasLeft={400} canvasTop={140}>
        <Button.Flyout><MenuFlyout>
          <MenuFlyoutItem text="Open document" onClick={()=>{state.invoked++;}}/>
          <MenuFlyoutItem text="Disabled command" enabled={false}/>
        </MenuFlyout></Button.Flyout>
      </Button>
    </Canvas>
  </SceneView></WinUIProvider>;
}
const root=createRoot(document.getElementById('root')!);
state.unmount=()=>root.unmount();
root.render(<StrictMode><App/></StrictMode>);
