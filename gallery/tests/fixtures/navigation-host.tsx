import {StrictMode,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Frame,WinUIProvider} from '../../src/react';
import {WinUI,NavigationCacheMode,type Frame as Controller,type PageStackEntry} from '../../src/index';
declare global{interface Window{externalFrame:Controller<PageStackEntry>}}
const sdk=await WinUI.create();
function Pages(){
 const [visits,setVisits]=useState(0);
 return <Frame className="independent-frame" page="red" cacheMode={NavigationCacheMode.Enabled} style={{width:640,height:400}}
  onReady={frame=>{window.externalFrame=frame;}} onNavigated={()=>setVisits(n=>n+1)}
  renderPage={entry=><article style={{flex:1,minHeight:0,overflow:'auto',padding:24,background:entry.page==='red'?'#ffdddd':'#ddddff'}}>
   <h1>{entry.page}</h1><p>Visits {visits}</p><div style={{height:900}}>Application content</div>
  </article>}/>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><WinUIProvider runtime={sdk}>
 <Frame page="shell" cacheMode={NavigationCacheMode.Enabled} style={{width:640,height:400}} renderPage={()=> <Pages/>}/>
</WinUIProvider></StrictMode>);
