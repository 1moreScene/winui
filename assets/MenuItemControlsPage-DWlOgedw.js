import{Fr as e,Nt as t,V as n,Wt as r,a as i,dt as a,ft as o,g as s,hr as c,i as l,l as u,mt as d,pi as f,pn as p,pt as m,r as h,tr as g,v as _,wn as v}from"./GalleryControls-jbXHT3zS.js";import{t as y}from"./SourceCode-C2xz3uBh.js";import{i as b,r as x}from"./ButtonPage-Cv9H35SX.js";var S=f(),C=`import { LocalizedText } from "./GalleryLanguage";
import { SourceCode } from './SourceCode';
import {useState,type ReactNode} from 'react';
import {Header} from './ButtonPage';
import {useGalleryTheme} from './gallery-theme';
import {GalleryComboBox,GalleryOption,GalleryExpander,GalleryExpanderHeader} from './GalleryControls';
import {SceneView,DropDownButton,MenuFlyout,MenuFlyoutItem,ToggleMenuFlyoutItem,RadioMenuFlyoutItem,MenuFlyoutSubItem,MenuFlyoutSeparator} from 'winui-wasm/react';
import {FlowDirection,RendererBackend,KeyboardAcceleratorModifier,type Scene,type ToggleMenuFlyoutItemController as ToggleController} from 'winui-wasm';
import source from './MenuItemControlsPage.tsx?raw';
import {extractSampleSource} from './sample-source';
declare global {interface Window {menuItemScenes:Record<string,Scene>;menuItemToggle?:ToggleController;}}
function remember(key:string,s:Scene){window.menuItemScenes??={};window.menuItemScenes[key]=s;}
function Example({id,title,children,status}:{id:string;title:string;children:ReactNode;status:string}){return <section id={id} className="example basic-example"><h2><LocalizedText>{title}</LocalizedText></h2><div className="example-card"><div className="basic-live"><div className="basic-preview">{children}</div></div><output aria-label={\`\${title} output\`}>{status||'Choose a menu item.'}</output><GalleryExpander className="source"><GalleryExpanderHeader>Source code</GalleryExpanderHeader><SourceCode>{extractSampleSource(source,id)}</SourceCode></GalleryExpander></div></section>;}
export function MenuItemControlsPage({title='Menu item controls'}:{title?:string}){
 const [theme,setTheme]=useGalleryTheme(),[backend,setBackend]=useState(RendererBackend.Canvas2D),[direction,setDirection]=useState(FlowDirection.LeftToRight),[command,setCommand]=useState(''),[toggle,setToggle]=useState(''),[radio,setRadio]=useState(''),[nested,setNested]=useState(''),[separated,setSeparated]=useState('');
 const shared={theme,backend,style:{height:100}};
 return <><Header title={title} theme={theme} onTheme={setTheme}/><div className="page-toolbar"><GalleryComboBox aria-label="Renderer" value={backend} onValueChanged={v=>setBackend(v as RendererBackend)}>{Object.values(RendererBackend).map(v=><GalleryOption key={v} value={v}>{v}</GalleryOption>)}</GalleryComboBox><GalleryComboBox aria-label="Menu direction" value={direction} onValueChanged={v=>setDirection(v as FlowDirection)}>{Object.values(FlowDirection).map(v=><GalleryOption key={v} value={v}>{v}</GalleryOption>)}</GalleryComboBox></div>
 <Example id="menu-item-command" title="MenuFlyoutItem" status={command}><SceneView {...shared} onReady={s=>remember('command',s)}>
 {/* @sample:menu-item-command:start */}
 <DropDownButton text="File commands"><MenuFlyout flowDirection={direction}>
   <MenuFlyoutItem text="Open" icon="&#xE8E5;" keyboardAccelerators={[{key:'o',modifiers:[KeyboardAcceleratorModifier.Control]}]} onClick={()=>setCommand('Open invoked')}/>
   <MenuFlyoutItem text="Save" icon="&#xE74E;" onClick={()=>setCommand('Save invoked')}/>
   <MenuFlyoutItem text="Unavailable" enabled={false}/>
 </MenuFlyout></DropDownButton>
 {/* @sample:menu-item-command:end */}
 </SceneView></Example>
 <Example id="menu-item-toggle" title="ToggleMenuFlyoutItem" status={toggle}><SceneView {...shared} onReady={s=>remember('toggle',s)}>
 {/* @sample:menu-item-toggle:start */}
 <DropDownButton text="View options"><MenuFlyout flowDirection={direction}>
   <ToggleMenuFlyoutItem text="Show toolbar" onReady={n=>{window.menuItemToggle=n;}} onIsCheckedChanged={e=>setToggle(\`Toolbar: \${e.isChecked}\`)}/>
   <ToggleMenuFlyoutItem text="Show status bar" isChecked onIsCheckedChanged={e=>setToggle(\`Status bar: \${e.isChecked}\`)}/>
 </MenuFlyout></DropDownButton>
 {/* @sample:menu-item-toggle:end */}
 </SceneView></Example>
 <Example id="menu-item-radio" title="RadioMenuFlyoutItem" status={radio}><SceneView {...shared} onReady={s=>remember('radio',s)}>
 {/* @sample:menu-item-radio:start */}
 <DropDownButton text="Page orientation"><MenuFlyout flowDirection={direction}>
   <RadioMenuFlyoutItem text="Portrait" groupName="orientation" isChecked onClick={()=>setRadio('Portrait selected')}/>
   <RadioMenuFlyoutItem text="Landscape" groupName="orientation" onClick={()=>setRadio('Landscape selected')}/>
   <MenuFlyoutSeparator/>
   <RadioMenuFlyoutItem text="Small icons" groupName="size" isChecked/>
   <RadioMenuFlyoutItem text="Large icons" groupName="size"/>
 </MenuFlyout></DropDownButton>
 {/* @sample:menu-item-radio:end */}
 </SceneView></Example>
 <Example id="menu-item-submenu" title="MenuFlyoutSubItem" status={nested}><SceneView {...shared} onReady={s=>remember('submenu',s)}>
 {/* @sample:menu-item-submenu:start */}
 <DropDownButton text="Share menu"><MenuFlyout flowDirection={direction}>
   <MenuFlyoutSubItem text="Share"><MenuFlyoutItem text="Email" onClick={()=>setNested('Email invoked')}/><MenuFlyoutItem text="Copy link" onClick={()=>setNested('Copy link invoked')}/><MenuFlyoutSubItem text="Advanced"><MenuFlyoutItem text="Export" onClick={()=>setNested('Export invoked')}/></MenuFlyoutSubItem></MenuFlyoutSubItem>
   <MenuFlyoutSubItem text="Display" areCheckStatesEnabled><RadioMenuFlyoutItem text="Compact" groupName="density" isChecked/><RadioMenuFlyoutItem text="Comfortable" groupName="density"/></MenuFlyoutSubItem>
 </MenuFlyout></DropDownButton>
 {/* @sample:menu-item-submenu:end */}
 </SceneView></Example>
 <Example id="menu-item-separator" title="MenuFlyoutSeparator" status={separated}><SceneView {...shared} onReady={s=>remember('separator',s)}>
 {/* @sample:menu-item-separator:start */}
 <DropDownButton text="Document menu"><MenuFlyout flowDirection={direction}>
   <MenuFlyoutItem text="New" onClick={()=>setSeparated('New invoked')}/><MenuFlyoutSeparator/>
   <MenuFlyoutItem text="Print" onClick={()=>setSeparated('Print invoked')}/><MenuFlyoutSeparator/>
   <MenuFlyoutItem text="Close" onClick={()=>setSeparated('Close invoked')}/>
 </MenuFlyout></DropDownButton>
 {/* @sample:menu-item-separator:end */}
 </SceneView></Example>
 </>;
}
`,w=v();function T(e,t){window.menuItemScenes??={},window.menuItemScenes[e]=t}function E({id:e,title:t,children:n,status:r}){return(0,w.jsxs)(`section`,{id:e,className:`example basic-example`,children:[(0,w.jsx)(`h2`,{children:(0,w.jsx)(_,{children:t})}),(0,w.jsxs)(`div`,{className:`example-card`,children:[(0,w.jsx)(`div`,{className:`basic-live`,children:(0,w.jsx)(`div`,{className:`basic-preview`,children:n})}),(0,w.jsx)(`output`,{"aria-label":`${t} output`,children:r||`Choose a menu item.`}),(0,w.jsxs)(l,{className:`source`,children:[(0,w.jsx)(i,{children:`Source code`}),(0,w.jsx)(y,{children:b(C,e)})]})]})]})}function D({title:i=`Menu item controls`}){let[l,f]=s(),[_,v]=(0,S.useState)(e.Canvas2D),[y,b]=(0,S.useState)(g.LeftToRight),[C,D]=(0,S.useState)(``),[O,k]=(0,S.useState)(``),[A,j]=(0,S.useState)(``),[M,N]=(0,S.useState)(``),[P,F]=(0,S.useState)(``),I={theme:l,backend:_,style:{height:100}};return(0,w.jsxs)(w.Fragment,{children:[(0,w.jsx)(x,{title:i,theme:l,onTheme:f}),(0,w.jsxs)(`div`,{className:`page-toolbar`,children:[(0,w.jsx)(h,{"aria-label":`Renderer`,value:_,onValueChanged:e=>v(e),children:Object.values(e).map(e=>(0,w.jsx)(u,{value:e,children:e},e))}),(0,w.jsx)(h,{"aria-label":`Menu direction`,value:y,onValueChanged:e=>b(e),children:Object.values(g).map(e=>(0,w.jsx)(u,{value:e,children:e},e))})]}),(0,w.jsx)(E,{id:`menu-item-command`,title:`MenuFlyoutItem`,status:C,children:(0,w.jsx)(r,{...I,onReady:e=>T(`command`,e),children:(0,w.jsx)(n,{text:`File commands`,children:(0,w.jsxs)(a,{flowDirection:y,children:[(0,w.jsx)(o,{text:`Open`,icon:``,keyboardAccelerators:[{key:`o`,modifiers:[c.Control]}],onClick:()=>D(`Open invoked`)}),(0,w.jsx)(o,{text:`Save`,icon:``,onClick:()=>D(`Save invoked`)}),(0,w.jsx)(o,{text:`Unavailable`,enabled:!1})]})})})}),(0,w.jsx)(E,{id:`menu-item-toggle`,title:`ToggleMenuFlyoutItem`,status:O,children:(0,w.jsx)(r,{...I,onReady:e=>T(`toggle`,e),children:(0,w.jsx)(n,{text:`View options`,children:(0,w.jsxs)(a,{flowDirection:y,children:[(0,w.jsx)(p,{text:`Show toolbar`,onReady:e=>{window.menuItemToggle=e},onIsCheckedChanged:e=>k(`Toolbar: ${e.isChecked}`)}),(0,w.jsx)(p,{text:`Show status bar`,isChecked:!0,onIsCheckedChanged:e=>k(`Status bar: ${e.isChecked}`)})]})})})}),(0,w.jsx)(E,{id:`menu-item-radio`,title:`RadioMenuFlyoutItem`,status:A,children:(0,w.jsx)(r,{...I,onReady:e=>T(`radio`,e),children:(0,w.jsx)(n,{text:`Page orientation`,children:(0,w.jsxs)(a,{flowDirection:y,children:[(0,w.jsx)(t,{text:`Portrait`,groupName:`orientation`,isChecked:!0,onClick:()=>j(`Portrait selected`)}),(0,w.jsx)(t,{text:`Landscape`,groupName:`orientation`,onClick:()=>j(`Landscape selected`)}),(0,w.jsx)(m,{}),(0,w.jsx)(t,{text:`Small icons`,groupName:`size`,isChecked:!0}),(0,w.jsx)(t,{text:`Large icons`,groupName:`size`})]})})})}),(0,w.jsx)(E,{id:`menu-item-submenu`,title:`MenuFlyoutSubItem`,status:M,children:(0,w.jsx)(r,{...I,onReady:e=>T(`submenu`,e),children:(0,w.jsx)(n,{text:`Share menu`,children:(0,w.jsxs)(a,{flowDirection:y,children:[(0,w.jsxs)(d,{text:`Share`,children:[(0,w.jsx)(o,{text:`Email`,onClick:()=>N(`Email invoked`)}),(0,w.jsx)(o,{text:`Copy link`,onClick:()=>N(`Copy link invoked`)}),(0,w.jsx)(d,{text:`Advanced`,children:(0,w.jsx)(o,{text:`Export`,onClick:()=>N(`Export invoked`)})})]}),(0,w.jsxs)(d,{text:`Display`,areCheckStatesEnabled:!0,children:[(0,w.jsx)(t,{text:`Compact`,groupName:`density`,isChecked:!0}),(0,w.jsx)(t,{text:`Comfortable`,groupName:`density`})]})]})})})}),(0,w.jsx)(E,{id:`menu-item-separator`,title:`MenuFlyoutSeparator`,status:P,children:(0,w.jsx)(r,{...I,onReady:e=>T(`separator`,e),children:(0,w.jsx)(n,{text:`Document menu`,children:(0,w.jsxs)(a,{flowDirection:y,children:[(0,w.jsx)(o,{text:`New`,onClick:()=>F(`New invoked`)}),(0,w.jsx)(m,{}),(0,w.jsx)(o,{text:`Print`,onClick:()=>F(`Print invoked`)}),(0,w.jsx)(m,{}),(0,w.jsx)(o,{text:`Close`,onClick:()=>F(`Close invoked`)})]})})})})]})}export{D as MenuItemControlsPage};