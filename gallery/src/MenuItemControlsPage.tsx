import { LocalizedText } from "./GalleryLanguage";
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
function Example({id,title,children,status}:{id:string;title:string;children:ReactNode;status:string}){return <section id={id} className="example basic-example"><h2><LocalizedText>{title}</LocalizedText></h2><div className="example-card"><div className="basic-live"><div className="basic-preview">{children}</div></div><output aria-label={`${title} output`}>{status||'Choose a menu item.'}</output><GalleryExpander className="source"><GalleryExpanderHeader>Source code</GalleryExpanderHeader><SourceCode>{extractSampleSource(source,id)}</SourceCode></GalleryExpander></div></section>;}
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
   <ToggleMenuFlyoutItem text="Show toolbar" onReady={n=>{window.menuItemToggle=n;}} onIsCheckedChanged={e=>setToggle(`Toolbar: ${e.isChecked}`)}/>
   <ToggleMenuFlyoutItem text="Show status bar" isChecked onIsCheckedChanged={e=>setToggle(`Status bar: ${e.isChecked}`)}/>
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
