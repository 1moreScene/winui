import { LocalizedText } from "./GalleryLanguage";
import { SourceCode } from './SourceCode';
import {useState,type ReactNode} from 'react';
import {Header} from './ButtonPage';
import {useGalleryTheme} from './gallery-theme';
import {SceneView,MenuBar,MenuBarItem,CommandBarFlyout,RelativePanel,WrapPanel,Border,TextBlock,Button,Image,ToggleSwitch,StackPanel} from 'winui-wasm/react';
import {GalleryButton,GalleryRadioButton,GalleryCheckBox,GalleryComboBox,GalleryOption,GallerySlider,GalleryExpander,GalleryExpanderHeader} from './GalleryControls';
import {OverlayPlacement,Orientation,WrapPanelItemsStretch,FlyoutShowMode,KeyboardAcceleratorModifier,MenuEntryKind,IconSourceKind,Symbol,HorizontalAlignment,RendererBackend,type MenuBarItemData,type Scene,type MenuEntry} from 'winui-wasm';
import official from './official-menu-layout.json';
import source from './MenuLayoutPage.tsx?raw';
import {extractSampleSource} from './sample-source';
declare global{interface Window{menuLayoutScenes:Record<string,Scene>;}}
type Kind='MenuBar'|'MenuBarItem'|'CommandBarFlyout'|'RelativePanel'|'WrapPanel';
const entries=(names:readonly string[],accelerators=false):MenuEntry[]=>names.map(text=>({id:text,text,...accelerators?{keyboardAccelerators:[{key:({New:'N','Open...':'O',Save:'S',Exit:'E',Undo:'Z',Cut:'X',Copy:'C',Paste:'V',About:'I'}as Record<string,string>)[text]!,modifiers:[KeyboardAcceleratorModifier.Control]}]}:{}}));
const basicItems=(accelerators=false):MenuBarItemData[]=>[{id:'file',title:'File',items:entries(['New','Open...','Save','Exit'],accelerators)},{id:'edit',title:'Edit',items:entries(['Undo','Cut','Copy','Paste'],accelerators)},{id:'help',title:'Help',items:entries(['About'],accelerators)}];
const advancedItems:MenuBarItemData[]=[{id:'file',title:'File',items:[{id:'new',text:'New',kind:MenuEntryKind.Submenu,items:entries(['Plain Text Document','Rich Text Document','Other Formats...'])},...entries(['Open...','Save']),{kind:MenuEntryKind.Separator},...entries(['Exit'])]},{id:'edit',title:'Edit',items:entries(['Undo','Cut','Copy','Paste'])},{id:'view',title:'View',items:[...entries(['Output']),{kind:MenuEntryKind.Separator},{id:'landscape',text:'Landscape',kind:MenuEntryKind.Radio,groupName:'orientation'},{id:'portrait',text:'Portrait',kind:MenuEntryKind.Radio,groupName:'orientation',checked:true},{kind:MenuEntryKind.Separator},{id:'small',text:'Small icons',kind:MenuEntryKind.Radio,groupName:'size'},{id:'medium',text:'Medium icons',kind:MenuEntryKind.Radio,groupName:'size',checked:true},{id:'large',text:'Large icons',kind:MenuEntryKind.Radio,groupName:'size'}]},{id:'help',title:'Help',items:entries(['About'])}];

export function MenuLayoutPage({filter='MenuBar'}:{filter?:Kind}){
 const[theme,setTheme]=useGalleryTheme();const[backend,setBackend]=useState(RendererBackend.Canvas2D);const[output,setOutput]=useState('');const[disabled,setDisabled]=useState(false);const[itemSpacing,setItemSpacing]=useState(8);const[lineSpacing,setLineSpacing]=useState(8);const[padding,setPadding]=useState(12);const[orientation,setOrientation]=useState(Orientation.Horizontal);const[stretch,setStretch]=useState(WrapPanelItemsStretch.Last);
 const officialKind=filter==='MenuBarItem'?'MenuBar':filter;const samples=official.controls[officialKind].samples;
 const ready=(key:string)=>(scene:Scene)=>{window.menuLayoutScenes??={};window.menuLayoutScenes[key]=scene;};
 function sample(key:string,title:string,child:ReactNode,xaml:string,options?:ReactNode){return <section id={key} className="example basic-example"><h2><LocalizedText>{title}</LocalizedText></h2><div className="example-card"><div className={`basic-live ${options?'with-options':''}`}><div className="basic-preview">{child}</div>{options&&<aside className="options">{options}</aside>}{filter!=='WrapPanel'&&filter!=='RelativePanel'&&<aside className="basic-output"><h3><LocalizedText>Output</LocalizedText></h3><output>{output}</output></aside>}</div><Source sampleKey={key} xaml={xaml}/></div></section>;}
 const scene=(key:string,child:ReactNode)=><SceneView key={backend+key} autoHeight theme={theme} backend={backend} onReady={ready(key)}>{child}</SceneView>;
 return <div className="collections-shell"><Header title={filter} theme={theme} onTheme={setTheme}/><main className="stage-main collections-gallery"><div className="stage-toolbar"><label>Renderer <GalleryComboBox value={backend} onValueChanged={value=>{setBackend(value as RendererBackend);}}>{Object.values(RendererBackend).map(value=><GalleryOption key={value} value={value}>{value}</GalleryOption>)}</GalleryComboBox></label>{filter==='MenuBar'&&<a href="#menu-bar-item">MenuBarItem example</a>}</div>
 {filter==='MenuBar'&&<>
 {sample('menu-basic',samples[0].title,scene('menu-basic',
 /* @sample:menu-basic:start */
 <MenuBar items={basicItems()} enabled={!disabled} onItemInvoked={event=>setOutput(event.itemId??'')}/>
 /* @sample:menu-basic:end */
 ),samples[0].xaml,<GalleryCheckBox checked={disabled} onValueChanged={setDisabled} label="Disable menu"/>)}
 {sample('menu-accelerators',samples[1].title,scene('menu-accelerators',
 /* @sample:menu-accelerators:start */
 <MenuBar items={basicItems(true)} onItemInvoked={event=>setOutput(event.itemId??'')}/>
 /* @sample:menu-accelerators:end */
 ),samples[1].xaml)}
 {sample('menu-submenus',samples[2].title,scene('menu-submenus',
 /* @sample:menu-submenus:start */
 <MenuBar items={advancedItems} onItemInvoked={event=>setOutput(event.itemId??'')}/>
 /* @sample:menu-submenus:end */
 ),samples[2].xaml)}
 </>}
 {filter==='MenuBarItem'&&sample('menu-item','Compose individual MenuBarItem controls (SDK supplementary example)',scene('menu-item',
 /* @sample:menu-item:start */
 <MenuBar><MenuBarItem title="File" items={entries(['New','Open...','Save','Exit'])} onItemInvoked={event=>setOutput(event.itemId??'')}/><MenuBarItem title="Edit" items={entries(['Undo','Cut','Copy','Paste'])}/><MenuBarItem title="Help" items={entries(['About'])}/></MenuBar>
 /* @sample:menu-item:end */
 ),samples[0].xaml)}
 {filter==='CommandBarFlyout'&&sample('command-flyout',samples[0].title,scene('command-flyout',
 /* @sample:command-flyout:start */
 <StackPanel spacing={0}>
    <TextBlock text="Click or right click the image to open a CommandBarFlyout"/>
    <Button padding={[0,0,0,0]} margin={[0,12,0,12]} accessibleName="mountain">
      <Image source="/official/rainier.jpg" height={300}/>
      <Button.Flyout><CommandBarFlyout showMode={FlyoutShowMode.Transient} placement={OverlayPlacement.RightEdgeAlignedTop}
     primaryCommands={[{id:'share',label:'Share',iconSource:{kind:IconSourceKind.Symbol,symbol:Symbol.Share}},{id:'save',label:'Save',iconSource:{kind:IconSourceKind.Symbol,symbol:Symbol.Save}},{id:'delete',label:'Delete',iconSource:{kind:IconSourceKind.Symbol,symbol:Symbol.Delete}}]}
     secondaryCommands={[{id:'resize',label:'Resize'},{id:'move',label:'Move'}]}
     onCommandInvoked={event=>setOutput('You clicked: '+({share:'Share',save:'Save',delete:'Delete',resize:'Resize',move:'Move'}[event.command.id]??event.command.id))}/></Button.Flyout>
      <Button.ContextFlyout><CommandBarFlyout showMode={FlyoutShowMode.Standard}
     primaryCommands={[{id:'share',label:'Share',iconSource:{kind:IconSourceKind.Symbol,symbol:Symbol.Share}},{id:'save',label:'Save',iconSource:{kind:IconSourceKind.Symbol,symbol:Symbol.Save}},{id:'delete',label:'Delete',iconSource:{kind:IconSourceKind.Symbol,symbol:Symbol.Delete}}]}
     secondaryCommands={[{id:'resize',label:'Resize'},{id:'move',label:'Move'}]}
     onCommandInvoked={event=>setOutput('You clicked: '+({share:'Share',save:'Save',delete:'Delete',resize:'Resize',move:'Move'}[event.command.id]??event.command.id))}/></Button.ContextFlyout>
    </Button>
  </StackPanel>
  /* @sample:command-flyout:end */
 ),samples[0].xaml)}
 {filter==='RelativePanel'&&sample('relative',samples[0].title,scene('relative',
 /* @sample:relative:start */
 <RelativePanel width={300} horizontalAlignment={HorizontalAlignment.Left}><Border layoutKey="red" width={50} height={50} background="#ff0000"/><Border width={50} height={50} background="#0000ff" margin={[8,0,0,0]} relative={{rightOf:'red'}}/><Border layoutKey="green" width={50} height={50} background="#008000" relative={{alignRightWithPanel:true}}/><Border width={50} height={50} background="#ffff00" margin={[0,8,0,0]} relative={{below:'green',alignHorizontalCenterWith:'green'}}/></RelativePanel>
 /* @sample:relative:end */
 ),samples[0].xaml)}
 {filter==='WrapPanel'&&<>
 {sample('wrap-basic',samples[0].title,scene('wrap-basic',
 /* @sample:wrap-basic:start */
 <Border width={360} height={orientation===Orientation.Horizontal?200:360} horizontalAlignment={HorizontalAlignment.Left} background={{resource:'CardBackgroundFillColorSecondaryBrush'}} borderBrush={{resource:'CardStrokeColorDefaultBrush'}} borderThickness={[1,1,1,1]} cornerRadius={4}>
   <WrapPanel orientation={orientation} itemSpacing={itemSpacing} lineSpacing={lineSpacing} padding={[padding,padding,padding,padding]}>
     {([['Alpha',72],['Beta item',112],['Gamma',88],['Delta item',128],['Epsilon',80],['Zeta item',104],['Eta',76],['Theta item',120],['Iota',92],['Kappa item',132]] as const).map(([text,minWidth])=>
       <Border key={text} minWidth={minWidth} padding={[12,8,12,8]} background={{resource:'ControlFillColorDefaultBrush'}} borderBrush={{resource:'ControlStrokeColorDefaultBrush'}} borderThickness={[1,1,1,1]} cornerRadius={4}><TextBlock text={text}/></Border>)}
   </WrapPanel>
 </Border>
 /* @sample:wrap-basic:end */
 ),samples[0].xaml,<><div>Orientation</div>{[Orientation.Horizontal,Orientation.Vertical].map(value=><div key={value}><GalleryRadioButton name="wrap-orientation" label={value} checked={orientation===value} onValueChanged={()=>setOrientation(value)}/></div>)}<label>Item spacing <GallerySlider min={0} max={24} step={2} value={itemSpacing} onValueChanged={setItemSpacing}/></label><label>Line spacing <GallerySlider min={0} max={24} step={2} value={lineSpacing} onValueChanged={setLineSpacing}/></label><label>Padding <GallerySlider min={0} max={24} step={2} value={padding} onValueChanged={setPadding}/></label></>)}
 {sample('wrap-stretch',samples[1].title,scene('wrap-stretch',
 /* @sample:wrap-stretch:start */
 <Border width={360} horizontalAlignment={HorizontalAlignment.Left} background={{resource:'CardBackgroundFillColorSecondaryBrush'}} borderBrush={{resource:'CardStrokeColorDefaultBrush'}} borderThickness={[1,1,1,1]} cornerRadius={4}>
   <WrapPanel itemSpacing={8} padding={[12,12,12,12]} itemsStretch={stretch}>
     {['One','Two','Three','Four','Five'].map(text=><Border key={text} width={72} padding={[12,8,12,8]} background={{resource:'ControlFillColorDefaultBrush'}} borderBrush={{resource:'ControlStrokeColorDefaultBrush'}} borderThickness={[1,1,1,1]} cornerRadius={4}><TextBlock text={text}/></Border>)}
     <Border padding={[12,8,12,8]} background={{resource:'AccentFillColorDefaultBrush'}} borderBrush={{resource:'ControlStrokeColorDefaultBrush'}} borderThickness={[1,1,1,1]} cornerRadius={4}><TextBlock text="Final item" foreground={{resource:'TextOnAccentFillColorPrimaryBrush'}}/></Border>
   </WrapPanel>
 </Border>
 /* @sample:wrap-stretch:end */
 ),samples[1].xaml,<SceneView theme={theme} autoHeight><ToggleSwitch header="ItemsStretch" accessibleName="Stretch final item" isOn={stretch===WrapPanelItemsStretch.Last} onContent="Last" offContent="None" onToggled={event=>setStretch(event.isOn?WrapPanelItemsStretch.Last:WrapPanelItemsStretch.None)}/></SceneView>)}
 </>}
 </main></div>;
}
function Source({sampleKey,xaml}:{sampleKey:string;xaml:string}){const[native,setNative]=useState(false);return <GalleryExpander className="source"><GalleryExpanderHeader>Source code</GalleryExpanderHeader><div className="source-tabs"><GalleryButton className={!native?'active':''} onClick={()=>setNative(false)}>TypeScript / React</GalleryButton><GalleryButton className={native?'active':''} onClick={()=>setNative(true)}>Official XAML</GalleryButton></div><SourceCode language={native ? 'xaml' : 'tsx'}>{native?xaml:(sampleKey.startsWith('menu-')?source.slice(source.indexOf('const entries='),source.indexOf('export function MenuLayoutPage'))+'\n':'')+extractSampleSource(source,sampleKey)}</SourceCode></GalleryExpander>;}
