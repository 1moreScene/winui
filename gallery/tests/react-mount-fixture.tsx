import {StrictMode,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {WinUI,RendererBackend,type Scene,type SceneNode,type FloatingSurface} from 'winui-wasm';
import {WinUIProvider,SceneView,Canvas,StackPanel,Button,TextBlock,Flyout,MenuFlyout,ToolTip} from 'winui-wasm/react';
declare global {interface Window {mountReactScene:(backend:RendererBackend,strict:boolean)=>Promise<{kinds:string[];helpers:number}>;unmountReactScene:()=>void;}}
const runtime=await WinUI.create({globalScrollbars:false});
let root:ReturnType<typeof createRoot>|undefined;
window.unmountReactScene=()=>{root?.unmount();root=undefined;};
window.mountReactScene=async(backend,strict)=>{
 window.unmountReactScene();root=createRoot(document.getElementById('fixture')!);let scene:Scene|undefined;
 await new Promise<void>(resolve=>{
  const content=<WinUIProvider runtime={runtime}><SceneView backend={backend} reducedMotion style={{width:400,height:240}} onReady={s=>{scene=s;queueMicrotask(resolve);}}><Canvas><StackPanel><Button text="Ready"/><TextBlock text="Mounted"/></StackPanel></Canvas></SceneView></WinUIProvider>;
  root!.render(strict?<StrictMode>{content}</StrictMode>:content);
 });
 await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
 return{kinds:scene!.snapshot.nodes.map(n=>n.kind),helpers:document.querySelectorAll('[data-winui-font-metrics]').length};
};

declare global {interface Window {mountReactFloating:(backend:RendererBackend,strict:boolean,kind:'Flyout'|'MenuFlyout'|'ToolTip')=>Promise<{owner:import('winui-wasm').NodeSnapshot;surface:import('winui-wasm').NodeSnapshot}>;}}
window.mountReactFloating=async(backend,strict,kind)=>{
 window.unmountReactScene();root=createRoot(document.getElementById('fixture')!);let owner:SceneNode|undefined,surface:FloatingSurface|undefined;
 let ready!:()=>void;const mounted=new Promise<void>(resolve=>ready=resolve);
 function Content(){const[anchor,setAnchor]=useState<SceneNode|null>(null);const common={target:anchor,isOpen:true,width:160,height:80,onReady:(s:FloatingSurface)=>surface=s};return <WinUIProvider runtime={runtime}><SceneView backend={backend} reducedMotion style={{width:400,height:240}} onReady={()=>queueMicrotask(ready)}><Canvas><Button text="Anchor" canvasLeft={100} canvasTop={150} width={100} height={32} onReady={n=>{owner=n;setAnchor(n);}}/>{kind==='MenuFlyout'?<MenuFlyout {...common} menuItems={[{id:'open',text:'Open'}]}/>:kind==='ToolTip'?<ToolTip {...common} text="Tip"/>:<Flyout {...common}><TextBlock text="Content"/></Flyout>}</Canvas></SceneView></WinUIProvider>;}
 root.render(strict?<StrictMode><Content/></StrictMode>:<Content/>);await mounted;
 await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
 return{owner:owner!.snapshot,surface:surface!.snapshot};
};
