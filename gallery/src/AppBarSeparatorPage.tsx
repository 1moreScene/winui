import { LocalizedText } from "./GalleryLanguage";
import { SourceCode } from './SourceCode';
import {useState} from 'react';
import {Header} from './ButtonPage';
import {useGalleryTheme} from './gallery-theme';
import {SceneView,CommandBar} from 'winui-wasm/react';
import {CommandBarItemKind,IconSourceKind,Symbol,RendererBackend,type Scene} from 'winui-wasm';
import {GalleryButton,GalleryExpander,GalleryExpanderHeader} from './GalleryControls';
import official from './official-command-menus.json';
import source from './AppBarSeparatorPage.tsx?raw';
import {extractSampleSource} from './sample-source';
declare global{interface Window{commandMenuScene:Scene;}}
export function AppBarSeparatorPage(){
 const [theme,setTheme]=useGalleryTheme();const backend=RendererBackend.Canvas2D;const [native,setNative]=useState(false);const sample=official.controls.AppBarSeparator.samples[0];
 return <div className="collections-shell"><Header title="AppBarSeparator" theme={theme} onTheme={setTheme}/><main className="stage-main collections-gallery"><section id="separator-0" className="example basic-example"><h2><LocalizedText>{sample.title}</LocalizedText></h2><div className="example-card"><div className="basic-live"><div className="basic-preview"><SceneView autoHeight theme={theme} backend={backend} onReady={scene=>{window.commandMenuScene=scene;}}>
 {/* @sample:separator-0:start */}
 <CommandBar primaryCommands={[
  {id:'camera',label:'Attach Camera',iconSource:{kind:IconSourceKind.Symbol,symbol:Symbol.AttachCamera}},
  {id:'separator-1',kind:CommandBarItemKind.Separator},
  {id:'like',label:'Like',iconSource:{kind:IconSourceKind.Symbol,symbol:Symbol.Like}},
  {id:'dislike',label:'Dislike',iconSource:{kind:IconSourceKind.Symbol,symbol:Symbol.Dislike}},
  {id:'separator-2',kind:CommandBarItemKind.Separator},
  {id:'orientation',label:'Orientation',iconSource:{kind:IconSourceKind.Symbol,symbol:Symbol.Orientation}},
 ]}/>
 {/* @sample:separator-0:end */}
 </SceneView></div></div><GalleryExpander className="source"><GalleryExpanderHeader>Source code</GalleryExpanderHeader><div className="source-tabs"><GalleryButton className={!native?'active':''} onClick={()=>setNative(false)}>TypeScript / React</GalleryButton><GalleryButton className={native?'active':''} onClick={()=>setNative(true)}>Official XAML</GalleryButton></div><SourceCode language={native ? 'xaml' : 'tsx'}>{native?sample.xaml:extractSampleSource(source,'separator-0')}</SourceCode></GalleryExpander></div></section></main></div>;
}
