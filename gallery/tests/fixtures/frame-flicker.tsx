import {StrictMode,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Frame,SceneView,WinUIProvider} from '../../src/react';
import {WinUI,NavigationCacheMode,NavigationTransition,RendererBackend} from '../../src/index';
import type {Frame as Controller,PageStackEntry} from '../../src/frame';

declare global{interface Window{frameFixture:{frame:Controller<PageStackEntry>;rerender():void}}}
const backend=(new URL(location.href).searchParams.get('backend')??RendererBackend.Canvas2D) as RendererBackend;
const sdk=await WinUI.create({globalScrollbars:false});
function App(){
 const [revision,setRevision]=useState(0);
 return <WinUIProvider runtime={sdk}><Frame className="fixture-frame" page="red" cacheMode={NavigationCacheMode.Enabled}
  style={{width:640,height:480,background:'#ffffff'}} transition={NavigationTransition.Entrance}
  onReady={frame=>{window.frameFixture={frame,rerender:()=>setRevision(n=>n+1)};}}
  renderPage={entry=><SceneView key={entry.page} backend={backend} style={{width:'100%',height:'100%'}}
   root={{background:entry.page==='red'?'#ff0000':entry.page==='blue'?'#0000ff':'#008000'}}
   className={`revision-${revision}`}/>}/></WinUIProvider>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
