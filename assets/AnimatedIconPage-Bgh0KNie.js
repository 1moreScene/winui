import{Fr as e,Kr as t,Nn as n,O as r,Sr as i,Ut as a,Wt as o,a as s,b as c,fn as l,g as u,i as d,l as f,lr as p,n as m,pi as h,r as g,t as _,v,wn as y}from"./GalleryControls-jbXHT3zS.js";import{t as b}from"./SourceCode-C2xz3uBh.js";import{i as x,r as S}from"./ButtonPage-Cv9H35SX.js";var C=h(),w={description:`An element that displays and controls an icon that animates when the user interacts with the control.`,samples:[{title:`Adding AnimatedIcon to a button`,xaml:`<Button PointerEntered="Button_PointerEntered" PointerExited="Button_PointerExited" Width="75">
    <AnimatedIcon x:Name="SearchAnimatedIcon">
        <AnimatedIcon.Source>
            <animatedvisuals:AnimatedFindVisualSource/>
        </AnimatedIcon.Source>
        <AnimatedIcon.FallbackIconSource>
            <SymbolIconSource Symbol="Find"/>
        </AnimatedIcon.FallbackIconSource>
    </AnimatedIcon>
</Button>`},{title:`Adding AnimatedIcon to a NavigationView`,xaml:`<NavigationView>
    <NavigationView.MenuItems>
        <NavigationViewItem Content = "Game Settings">
            <NavigationViewItem.Icon>
                <AnimatedIcon x:Name='AnimatedIcon'>
                    <AnimatedIcon.Source>
                        <animatedvisuals:AnimatedSettingsVisualSource/>
                    </AnimatedIcon.Source>
                    <AnimatedIcon.FallbackIconSource>
                        <FontIconSource Glyph="&#xE713;"/>
                    </AnimatedIcon.FallbackIconSource>
                </AnimatedIcon>
            </NavigationViewItem.Icon>
        </NavigationViewItem>
    </NavigationView.MenuItems>
</NavigationView>`}]},T=`import { LocalizedText } from "./GalleryLanguage";
import {NavigationViewBackButtonVisible} from "winui-wasm";
import { SourceCode } from './SourceCode';
import { GalleryButton, GalleryCheckBox, GalleryComboBox, GalleryExpander, GalleryExpanderHeader, GalleryOption } from './GalleryControls';
import { useGalleryTheme } from './gallery-theme';
import {useEffect,useState,type ReactNode} from 'react';
import {Header} from './ButtonPage';
import {SceneView,Button,ToggleButton,AnimatedIcon,SceneNavigationView} from 'winui-wasm/react';
import {AnimatedIconSource,IconSourceKind,Symbol,ThemeMode,RendererBackend,type Scene} from 'winui-wasm';
import official from './official-animated-icons.json';
import source from './AnimatedIconPage.tsx?raw';
import {extractSampleSource} from './sample-source';
declare global{interface Window{animatedGallery:Record<string,Scene>;}}
function remember(name:string,scene:Scene){window.animatedGallery??={};window.animatedGallery[name]=scene;}
function Example({index,name,children,options}:{index:number;name:string;children:ReactNode;options?:ReactNode}){
 const [native,setNative]=useState(false);
 return <section className="example basic-example" id={name}><h2><LocalizedText>{official.samples[index].title}</LocalizedText></h2><div className="example-card"><div className={\`basic-live \${options?'with-options':''}\`}><div className="basic-preview">{children}</div>{options&&<div className="options">{options}</div>}</div><GalleryExpander className="source"><GalleryExpanderHeader>Source code</GalleryExpanderHeader><div className="source-tabs"><GalleryButton className={!native?'active':''} onClick={()=>setNative(false)}>TypeScript / React</GalleryButton><GalleryButton className={native?'active':''} onClick={()=>setNative(true)}>Official XAML</GalleryButton></div><SourceCode language={native ? 'xaml' : 'tsx'}>{native?official.samples[index].xaml:extractSampleSource(source,name)}</SourceCode></GalleryExpander></div></section>;
}
export function AnimatedIconPage(){
 const [theme,setTheme]=useGalleryTheme(),[backend,setBackend]=useState(RendererBackend.Canvas2D),[kind,setKind]=useState(AnimatedIconSource.Find),[reduced,setReduced]=useState(false),[fallback,setFallback]=useState(false);
 useEffect(()=>{document.documentElement.dataset.theme=theme;},[theme]);
 const toggle=kind===AnimatedIconSource.ChevronRightDownSmall||kind===AnimatedIconSource.ChevronUpDownSmall;
 const AnimatedButton=toggle?ToggleButton:Button;
 const shared={theme,backend,reducedMotion:reduced};
 return <><Header title="AnimatedIcon" theme={theme} onTheme={setTheme}/><main className="stage-main official-motion"><div className="effects-options"><label>Renderer <GalleryComboBox aria-label="Renderer" value={backend} onValueChanged={e=>setBackend(e as RendererBackend)}>{Object.values(RendererBackend).map(v=><GalleryOption key={v}>{v}</GalleryOption>)}</GalleryComboBox></label><GalleryCheckBox  checked={reduced} onValueChanged={e=>setReduced(e)}  label={<>Reduce motion</>}/></div>
 <Example index={0} name="animated-button" options={<><label>Kind <GalleryComboBox aria-label="Animation kind" value={kind} onValueChanged={e=>setKind(e as AnimatedIconSource)}>{Object.values(AnimatedIconSource).filter(v=>v!==AnimatedIconSource.None).map(v=><GalleryOption key={v} value={v}>Animated{v}VisualSource</GalleryOption>)}</GalleryComboBox></label><GalleryCheckBox  checked={fallback} onValueChanged={e=>setFallback(e)}  label={<>Show fallback</>}/></>}>
 <p><LocalizedText>{kind===AnimatedIconSource.Find?'Press and release the button to animate Find. Its native PointerOver transition has no shape change.':toggle?'Click to toggle the chevron. The source uses NormalOn/NormalOff and their pointer/pressed states.':'Move the pointer over the button, then press and release it to play its native state transitions.'}</LocalizedText></p>
 <SceneView {...shared} style={{height:120}} onReady={s=>remember('button',s)}>
  {/* @sample:animated-button:start */}
  <AnimatedButton width={75} accessibleName="AnimatedIcon Example">
    <AnimatedIcon source={fallback?AnimatedIconSource.None:kind} useParentState
      fallbackIconSource={{kind:IconSourceKind.Symbol,symbol:Symbol.Find}}/>
  </AnimatedButton>
  {/* @sample:animated-button:end */}
 </SceneView></Example>
 <Example index={1} name="animated-navigation"><SceneView {...shared} style={{height:320}} onReady={s=>remember('navigation',s)}>
  {/* @sample:animated-navigation:start */}
  <SceneNavigationView layout={{height:320}} isSettingsVisible={false} isBackButtonVisible={NavigationViewBackButtonVisible.Collapsed}
    theme={theme} reducedMotion={reduced} items={[
      {id:'game-settings',text:'Game Settings',animatedIconSource:AnimatedIconSource.Settings,icon:'\\uE713'},
    ]}/>
  {/* @sample:animated-navigation:end */}
 </SceneView></Example></main></>;
}
`,E=y();function D(e,t){window.animatedGallery??={},window.animatedGallery[e]=t}function O({index:e,name:t,children:n,options:r}){let[i,a]=(0,C.useState)(!1);return(0,E.jsxs)(`section`,{className:`example basic-example`,id:t,children:[(0,E.jsx)(`h2`,{children:(0,E.jsx)(v,{children:w.samples[e].title})}),(0,E.jsxs)(`div`,{className:`example-card`,children:[(0,E.jsxs)(`div`,{className:`basic-live ${r?`with-options`:``}`,children:[(0,E.jsx)(`div`,{className:`basic-preview`,children:n}),r&&(0,E.jsx)(`div`,{className:`options`,children:r})]}),(0,E.jsxs)(d,{className:`source`,children:[(0,E.jsx)(s,{children:`Source code`}),(0,E.jsxs)(`div`,{className:`source-tabs`,children:[(0,E.jsx)(_,{className:i?``:`active`,onClick:()=>a(!1),children:`TypeScript / React`}),(0,E.jsx)(_,{className:i?`active`:``,onClick:()=>a(!0),children:`Official XAML`})]}),(0,E.jsx)(b,{language:i?`xaml`:`tsx`,children:i?w.samples[e].xaml:x(T,t)})]})]})]})}function k(){let[s,d]=u(),[h,_]=(0,C.useState)(e.Canvas2D),[y,b]=(0,C.useState)(n.Find),[x,w]=(0,C.useState)(!1),[T,k]=(0,C.useState)(!1);(0,C.useEffect)(()=>{document.documentElement.dataset.theme=s},[s]);let A=y===n.ChevronRightDownSmall||y===n.ChevronUpDownSmall,j=A?l:r,M={theme:s,backend:h,reducedMotion:x};return(0,E.jsxs)(E.Fragment,{children:[(0,E.jsx)(S,{title:`AnimatedIcon`,theme:s,onTheme:d}),(0,E.jsxs)(`main`,{className:`stage-main official-motion`,children:[(0,E.jsxs)(`div`,{className:`effects-options`,children:[(0,E.jsxs)(`label`,{children:[`Renderer `,(0,E.jsx)(g,{"aria-label":`Renderer`,value:h,onValueChanged:e=>_(e),children:Object.values(e).map(e=>(0,E.jsx)(f,{children:e},e))})]}),(0,E.jsx)(m,{checked:x,onValueChanged:e=>w(e),label:(0,E.jsx)(E.Fragment,{children:`Reduce motion`})})]}),(0,E.jsxs)(O,{index:0,name:`animated-button`,options:(0,E.jsxs)(E.Fragment,{children:[(0,E.jsxs)(`label`,{children:[`Kind `,(0,E.jsx)(g,{"aria-label":`Animation kind`,value:y,onValueChanged:e=>b(e),children:Object.values(n).filter(e=>e!==n.None).map(e=>(0,E.jsxs)(f,{value:e,children:[`Animated`,e,`VisualSource`]},e))})]}),(0,E.jsx)(m,{checked:T,onValueChanged:e=>k(e),label:(0,E.jsx)(E.Fragment,{children:`Show fallback`})})]}),children:[(0,E.jsx)(`p`,{children:(0,E.jsx)(v,{children:y===n.Find?`Press and release the button to animate Find. Its native PointerOver transition has no shape change.`:A?`Click to toggle the chevron. The source uses NormalOn/NormalOff and their pointer/pressed states.`:`Move the pointer over the button, then press and release it to play its native state transitions.`})}),(0,E.jsx)(o,{...M,style:{height:120},onReady:e=>D(`button`,e),children:(0,E.jsx)(j,{width:75,accessibleName:`AnimatedIcon Example`,children:(0,E.jsx)(c,{source:T?n.None:y,useParentState:!0,fallbackIconSource:{kind:p.Symbol,symbol:t.Find}})})})]}),(0,E.jsx)(O,{index:1,name:`animated-navigation`,children:(0,E.jsx)(o,{...M,style:{height:320},onReady:e=>D(`navigation`,e),children:(0,E.jsx)(a,{layout:{height:320},isSettingsVisible:!1,isBackButtonVisible:i.Collapsed,theme:s,reducedMotion:x,items:[{id:`game-settings`,text:`Game Settings`,animatedIconSource:n.Settings,icon:``}]})})})]})]})}export{k as AnimatedIconPage};