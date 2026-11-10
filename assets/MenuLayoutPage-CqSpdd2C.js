import{Cn as e,E as t,Fr as n,I as r,Kr as i,Lt as a,O as o,Or as s,Wt as c,Z as l,a as u,cr as d,en as ee,f,g as p,hn as m,hr as h,i as g,kr as te,l as _,lr as v,lt as y,n as b,pi as x,r as S,rr as C,sn as w,t as T,u as E,ui as D,ut as O,v as k,vr as A,wn as j}from"./GalleryControls-jbXHT3zS.js";import{t as M}from"./SourceCode-C2xz3uBh.js";import{i as N,r as P}from"./ButtonPage-Cv9H35SX.js";var F=x(),ne={commit:`7360ac322414e118eadfb0c7c2f4ecc31a218f59`,controls:{CommandBarFlyout:{description:`A mini-toolbar which displays a set of proactive commands, as well as a secondary menu of commands if desired.`,samples:[{title:`CommandBarFlyout for commands on an in-app object`,xaml:`<Page.Resources>
    <CommandBarFlyout Placement="Right" x:Name="CommandBarFlyout1">
        <AppBarButton Label="Share" Icon="Share" ToolTipService.ToolTip="Share" Click="OnElementClicked" />
        <AppBarButton Label="Save" Icon="Save" ToolTipService.ToolTip="Save" Click="OnElementClicked" />
        <AppBarButton Label="Delete" Icon="Delete" ToolTipService.ToolTip="Delete" Click="OnElementClicked" />
        <CommandBarFlyout.SecondaryCommands>
            <AppBarButton x:Name="ResizeButton1" Label="Resize" Click="OnElementClicked" />
            <AppBarButton x:Name="MoveButton1" Label="Move" Click="OnElementClicked" />
        </CommandBarFlyout.SecondaryCommands>
    </CommandBarFlyout>
</Page.Resources>

<Button x:Name="myImageButton" AutomationProperties.Name="mountain" Padding="0"
    Click="MyImageButton_Click" ContextRequested="MyImageButton_ContextRequested" >
    <Image x:Name="Image1" Height="300" Source="/Assets/SampleMedia/rainier.jpg"/>
</Button>`,code:`private void ShowMenu(bool isTransient)
{
    FlyoutShowOptions myOption = new FlyoutShowOptions();
    myOption.ShowMode = isTransient ? FlyoutShowMode.Transient : FlyoutShowMode.Standard;
    CommandBarFlyout1.ShowAt(Image1, myOption);
}

private void MyImageButton_ContextRequested(Microsoft.UI.Xaml.UIElement sender, ContextRequestedEventArgs args)
{
    // Show a context menu in standard mode
    // Focus will move to the menu
    ShowMenu(false);
}

private void MyImageButton_Click(object sender, Microsoft.UI.Xaml.RoutedEventArgs e)
{
    // Show a context menu in transient mode
    // Focus will not move to the menu
    ShowMenu(true);
}`}]},MenuBar:{description:`The Menubar simplifies the creation of basic applications by providing a set of menus at the top of the app or window.`,samples:[{title:`A simple MenuBar`,xaml:`<MenuBar>
    <MenuBarItem Title="File">
        <MenuFlyoutItem Text="New"/>
        <MenuFlyoutItem Text="Open..."/>
        <MenuFlyoutItem Text="Save"/>
        <MenuFlyoutItem Text="Exit"/>
    </MenuBarItem>

    <MenuBarItem Title="Edit">
        <MenuFlyoutItem Text="Undo"/>
        <MenuFlyoutItem Text="Cut"/>
        <MenuFlyoutItem Text="Copy"/>
        <MenuFlyoutItem Text="Paste"/>
    </MenuBarItem>

    <MenuBarItem Title="Help">
        <MenuFlyoutItem Text="About"/>
    </MenuBarItem>
</MenuBar>`,code:``},{title:`MenuBar with keyboard accelerators`,xaml:`<MenuBar>
  <MenuBarItem Title="File">
    <MenuFlyoutItem Text="New">
      <MenuFlyoutItem.KeyboardAccelerators>
        <KeyboardAccelerator Modifiers="Control" Key="N"/>
      </MenuFlyoutItem.KeyboardAccelerators>
    </MenuFlyoutItem>
    <MenuFlyoutItem Text="Open...">
      <MenuFlyoutItem.KeyboardAccelerators>
        <KeyboardAccelerator Modifiers="Control" Key="O"/>
      </MenuFlyoutItem.KeyboardAccelerators>
    </MenuFlyoutItem>
    <MenuFlyoutItem Text="Save">
      <MenuFlyoutItem.KeyboardAccelerators>
        <KeyboardAccelerator Modifiers="Control" Key="S"/>
      </MenuFlyoutItem.KeyboardAccelerators>
    </MenuFlyoutItem>
    <MenuFlyoutItem Text="Exit">
      <MenuFlyoutItem.KeyboardAccelerators>
        <KeyboardAccelerator Modifiers="Control" Key="E"/>
      </MenuFlyoutItem.KeyboardAccelerators>
    </MenuFlyoutItem>
  </MenuBarItem>

  <MenuBarItem Title="Edit">
    <MenuFlyoutItem Text="Undo">
      <MenuFlyoutItem.KeyboardAccelerators>
        <KeyboardAccelerator Modifiers="Control" Key="Z"/>
      </MenuFlyoutItem.KeyboardAccelerators>
    </MenuFlyoutItem>
    <MenuFlyoutItem Text="Cut">
      <MenuFlyoutItem.KeyboardAccelerators>
        <KeyboardAccelerator Modifiers="Control" Key="X"/>
      </MenuFlyoutItem.KeyboardAccelerators>
    </MenuFlyoutItem>
    <MenuFlyoutItem Text="Copy">
      <MenuFlyoutItem.KeyboardAccelerators>
        <KeyboardAccelerator Modifiers="Control" Key="C"/>
      </MenuFlyoutItem.KeyboardAccelerators>
    </MenuFlyoutItem>
    <MenuFlyoutItem Text="Paste">
      <MenuFlyoutItem.KeyboardAccelerators>
        <KeyboardAccelerator Modifiers="Control" Key="V"/>
      </MenuFlyoutItem.KeyboardAccelerators>
    </MenuFlyoutItem>
  </MenuBarItem>

  <MenuBarItem Title="Help">
    <MenuFlyoutItem Text="About">
      <MenuFlyoutItem.KeyboardAccelerators>
        <KeyboardAccelerator Modifiers="Control" Key="I"/>
      </MenuFlyoutItem.KeyboardAccelerators>
    </MenuFlyoutItem>
  </MenuBarItem>
</MenuBar>`,code:``},{title:`MenuBar with submenus, separators, and radio items`,xaml:`<MenuBar>
    <MenuBarItem Title="File">
        <MenuFlyoutSubItem Text="New">
            <MenuFlyoutItem Text="Plain Text Document"/>
            <MenuFlyoutItem Text="Rich Text Document"/>
            <MenuFlyoutItem Text="Other Formats..."/>
        </MenuFlyoutSubItem>
        <MenuFlyoutItem Text="Open..."/>
        <MenuFlyoutItem Text="Save"/>
        <MenuFlyoutSeparator />
        <MenuFlyoutItem Text="Exit"/>
    </MenuBarItem>

    <MenuBarItem Title="Edit">
        <MenuFlyoutItem Text="Undo"/>
        <MenuFlyoutItem Text="Cut"/>
        <MenuFlyoutItem Text="Copy"/>
        <MenuFlyoutItem Text="Paste"/>
    </MenuBarItem>

    <MenuBarItem Title="View">
        <MenuFlyoutItem Text="Output"/>
        <MenuFlyoutSeparator/>
        <RadioMenuFlyoutItem Text="Landscape" GroupName="OrientationGroup"/>
        <RadioMenuFlyoutItem Text="Portrait" GroupName="OrientationGroup" IsChecked="True"/>
        <MenuFlyoutSeparator/>
        <RadioMenuFlyoutItem Text="Small icons" GroupName="SizeGroup"/>
        <RadioMenuFlyoutItem Text="Medium icons" IsChecked="True" GroupName="SizeGroup"/>
        <RadioMenuFlyoutItem Text="Large icons" GroupName="SizeGroup"/>
    </MenuBarItem>
                    
    <MenuBarItem Title="Help">
        <MenuFlyoutItem Text="About"/>
    </MenuBarItem>
</MenuBar>`,code:``}]},RelativePanel:{description:`Use a RelativePanel to layout elements by defining the relationships between elements and in relation to the panel.`,samples:[{title:`A RelativePanel control.`,xaml:`<RelativePanel  Width="300">
    <Rectangle x:Name="Rectangle1" Fill="Red" Height="50" Width="50"/>
    <Rectangle x:Name="Rectangle2" Fill="Blue" Height="50" Width="50" RelativePanel.RightOf="Rectangle1" Margin="8,0,0,0"/>
    <Rectangle x:Name="Rectangle3" Fill="Green" Height="50" Width="50" RelativePanel.AlignRightWithPanel="True"/>
    <Rectangle x:Name="Rectangle4" Fill="Yellow" Height="50" Width="50" RelativePanel.Below="Rectangle3" RelativePanel.AlignHorizontalCenterWith="Rectangle3" Margin="0,8,0,0"/>
</RelativePanel>`,code:``}]},WrapPanel:{description:`Use a WrapPanel to arrange child elements sequentially and move overflowing items to a new row or column. You can configure its orientation, spacing, padding, and whether the final item stretches to fill the remaining space.`,samples:[{title:`A WrapPanel that automatically wraps items when they reach the panel boundary.`,xaml:`<WrapPanel
    Width="360"
    Height="200"
    ItemSpacing="8"
    LineSpacing="8"
    Padding="12">
    <Border MinWidth="72" Padding="12,8">
        <TextBlock Text="Alpha"/>
    </Border>
    <Border MinWidth="112" Padding="12,8">
        <TextBlock Text="Beta item"/>
    </Border>
    <Border MinWidth="88" Padding="12,8">
        <TextBlock Text="Gamma"/>
    </Border>
    <Border MinWidth="128" Padding="12,8">
        <TextBlock Text="Delta item"/>
    </Border>
    <Border MinWidth="80" Padding="12,8">
        <TextBlock Text="Epsilon"/>
    </Border>
    <Border MinWidth="104" Padding="12,8">
        <TextBlock Text="Zeta item"/>
    </Border>
    <Border MinWidth="76" Padding="12,8">
        <TextBlock Text="Eta"/>
    </Border>
    <Border MinWidth="120" Padding="12,8">
        <TextBlock Text="Theta item"/>
    </Border>
    <Border MinWidth="92" Padding="12,8">
        <TextBlock Text="Iota"/>
    </Border>
    <Border MinWidth="132" Padding="12,8">
        <TextBlock Text="Kappa item"/>
    </Border>
</WrapPanel>`,code:``},{title:`A WrapPanel that can stretch its final item to fill the remaining space.`,xaml:`<WrapPanel
    Width="360"
    ItemSpacing="8"
    ItemsStretch="Last"
    Padding="12">
    <Border Width="72" Padding="12,8">
        <TextBlock Text="One"/>
    </Border>
    <Border Width="72" Padding="12,8">
        <TextBlock Text="Two"/>
    </Border>
    <Border Width="72" Padding="12,8">
        <TextBlock Text="Three"/>
    </Border>
    <Border Width="72" Padding="12,8">
        <TextBlock Text="Four"/>
    </Border>
    <Border Width="72" Padding="12,8">
        <TextBlock Text="Five"/>
    </Border>
    <Border Padding="12,8">
        <TextBlock Text="Final item"/>
    </Border>
</WrapPanel>`,code:``}]}},sources:[{local:`references/gallery-input/CommandBarFlyout/CommandBarFlyoutPage.xaml`,upstream:`WinUIGallery/Samples/CommandBarFlyout/CommandBarFlyoutPage.xaml`,sha256:`f6828d1d9fcfc1a78498b217dde57b4690fb41cd6f4e5573f7d985363813ccc4`},{local:`references/gallery-input/CommandBarFlyout/CommandBarFlyoutPage.xaml.cs`,upstream:`WinUIGallery/Samples/CommandBarFlyout/CommandBarFlyoutPage.xaml.cs`,sha256:`955594f0512024c13a6952c6160823c856a3f6123d9b5296e87e97d25a211b8a`},{local:`references/gallery-input/CommandBarFlyout/CommandbarflyoutCommandsAppObject.txt`,upstream:`WinUIGallery/Samples/CommandBarFlyout/CommandbarflyoutCommandsAppObject.txt`,sha256:`f99a12c1e03ec99a228d0c91bae57d925218ec0b0c40f26416e78e20bf647051`},{local:`references/gallery-input/MenuBar/MenuBarPage.xaml`,upstream:`WinUIGallery/Samples/MenuBar/MenuBarPage.xaml`,sha256:`0b0567adfc658b3cedf5efa102e1f19ff01e10efd128b69563da030ffecb7407`},{local:`references/gallery-input/MenuBar/MenuBarPage.xaml.cs`,upstream:`WinUIGallery/Samples/MenuBar/MenuBarPage.xaml.cs`,sha256:`5f5ae93d33a4c538abb938fc37c72a2fc643e05d1dd936e9d1574bf84610fb34`},{local:`references/gallery-input/MenuBar/MenubarKeyboardAccelerators.txt`,upstream:`WinUIGallery/Samples/MenuBar/MenubarKeyboardAccelerators.txt`,sha256:`6dcc471459081171b0cc5becd9d9dea9d0188d00724f2c2efe64887f9ea2b5b0`},{local:`references/gallery-input/MenuBar/MenubarSubmenusSeparatorsRadio.txt`,upstream:`WinUIGallery/Samples/MenuBar/MenubarSubmenusSeparatorsRadio.txt`,sha256:`a3dd0c5aa62dcae7148900072061a720b17d9b45dea7961be1ba0f24812cf1ae`},{local:`references/gallery-input/MenuBar/SimpleMenubar.txt`,upstream:`WinUIGallery/Samples/MenuBar/SimpleMenubar.txt`,sha256:`ff2a186721a127947d22d967914617a3ce1c49ce215fdb0de4577cdaac69939e`},{local:`references/gallery-input/RelativePanel/RelativePanelPage.xaml`,upstream:`WinUIGallery/Samples/RelativePanel/RelativePanelPage.xaml`,sha256:`fc40cde99d2bb9be3d5594acc3045e34dd47f684334c8a40fdb75f5932787394`},{local:`references/gallery-input/RelativePanel/RelativePanelPage.xaml.cs`,upstream:`WinUIGallery/Samples/RelativePanel/RelativePanelPage.xaml.cs`,sha256:`2e67c80a21f60b92b5ea7593528ef7ce8c7bc78e4b71452030ec289078c0ce8a`},{local:`references/gallery-input/RelativePanel/RelativepanelControl.txt`,upstream:`WinUIGallery/Samples/RelativePanel/RelativepanelControl.txt`,sha256:`100f34191b06e5d1dd21014718f4bb0bc4757d5d60b855a980ce94f5fb8ba1b9`},{local:`references/gallery-input/WrapPanel/WrapPanelBasic.txt`,upstream:`WinUIGallery/Samples/WrapPanel/WrapPanelBasic.txt`,sha256:`47c012e1fa63301253b0ba6df8b7203a61e62c5acf2f2a0aa1331ffb90e24c01`},{local:`references/gallery-input/WrapPanel/WrapPanelItemsStretch.txt`,upstream:`WinUIGallery/Samples/WrapPanel/WrapPanelItemsStretch.txt`,sha256:`d30b4e017f6976ad319839507e6abd8d82c29ea2b799d783ac6899110546ef0b`},{local:`references/gallery-input/WrapPanel/WrapPanelPage.xaml`,upstream:`WinUIGallery/Samples/WrapPanel/WrapPanelPage.xaml`,sha256:`379e0791fdd6e950b556cfc6e696db7bc2731fe4be3b01b7f67ff1e37d4f0cef`},{local:`references/gallery-input/WrapPanel/WrapPanelPage.xaml.cs`,upstream:`WinUIGallery/Samples/WrapPanel/WrapPanelPage.xaml.cs`,sha256:`85818a966778e7990dfaa408984637d4ea2531666191af7db7f5d4fe1ee835ef`}]},I=`import { LocalizedText } from "./GalleryLanguage";
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
 function sample(key:string,title:string,child:ReactNode,xaml:string,options?:ReactNode){return <section id={key} className="example basic-example"><h2><LocalizedText>{title}</LocalizedText></h2><div className="example-card"><div className={\`basic-live \${options?'with-options':''}\`}><div className="basic-preview">{child}</div>{options&&<aside className="options">{options}</aside>}{filter!=='WrapPanel'&&filter!=='RelativePanel'&&<aside className="basic-output"><h3><LocalizedText>Output</LocalizedText></h3><output>{output}</output></aside>}</div><Source sampleKey={key} xaml={xaml}/></div></section>;}
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
function Source({sampleKey,xaml}:{sampleKey:string;xaml:string}){const[native,setNative]=useState(false);return <GalleryExpander className="source"><GalleryExpanderHeader>Source code</GalleryExpanderHeader><div className="source-tabs"><GalleryButton className={!native?'active':''} onClick={()=>setNative(false)}>TypeScript / React</GalleryButton><GalleryButton className={native?'active':''} onClick={()=>setNative(true)}>Official XAML</GalleryButton></div><SourceCode language={native ? 'xaml' : 'tsx'}>{native?xaml:(sampleKey.startsWith('menu-')?source.slice(source.indexOf('const entries='),source.indexOf('export function MenuLayoutPage'))+'\\n':'')+extractSampleSource(source,sampleKey)}</SourceCode></GalleryExpander>;}
`,L=j(),R=(e,t=!1)=>e.map(e=>({id:e,text:e,...t?{keyboardAccelerators:[{key:{New:`N`,"Open...":`O`,Save:`S`,Exit:`E`,Undo:`Z`,Cut:`X`,Copy:`C`,Paste:`V`,About:`I`}[e],modifiers:[h.Control]}]}:{}})),z=(e=!1)=>[{id:`file`,title:`File`,items:R([`New`,`Open...`,`Save`,`Exit`],e)},{id:`edit`,title:`Edit`,items:R([`Undo`,`Cut`,`Copy`,`Paste`],e)},{id:`help`,title:`Help`,items:R([`About`],e)}],B=[{id:`file`,title:`File`,items:[{id:`new`,text:`New`,kind:A.Submenu,items:R([`Plain Text Document`,`Rich Text Document`,`Other Formats...`])},...R([`Open...`,`Save`]),{kind:A.Separator},...R([`Exit`])]},{id:`edit`,title:`Edit`,items:R([`Undo`,`Cut`,`Copy`,`Paste`])},{id:`view`,title:`View`,items:[...R([`Output`]),{kind:A.Separator},{id:`landscape`,text:`Landscape`,kind:A.Radio,groupName:`orientation`},{id:`portrait`,text:`Portrait`,kind:A.Radio,groupName:`orientation`,checked:!0},{kind:A.Separator},{id:`small`,text:`Small icons`,kind:A.Radio,groupName:`size`},{id:`medium`,text:`Medium icons`,kind:A.Radio,groupName:`size`,checked:!0},{id:`large`,text:`Large icons`,kind:A.Radio,groupName:`size`}]},{id:`help`,title:`Help`,items:R([`About`])}];function V({filter:u=`MenuBar`}){let[h,g]=p(),[x,T]=(0,F.useState)(n.Canvas2D),[A,j]=(0,F.useState)(``),[M,N]=(0,F.useState)(!1),[I,V]=(0,F.useState)(8),[U,W]=(0,F.useState)(8),[G,K]=(0,F.useState)(12),[q,J]=(0,F.useState)(s.Horizontal),[Y,X]=(0,F.useState)(D.Last),re=u===`MenuBarItem`?`MenuBar`:u,Z=ne.controls[re].samples,ie=e=>t=>{window.menuLayoutScenes??={},window.menuLayoutScenes[e]=t};function Q(e,t,n,r,i){return(0,L.jsxs)(`section`,{id:e,className:`example basic-example`,children:[(0,L.jsx)(`h2`,{children:(0,L.jsx)(k,{children:t})}),(0,L.jsxs)(`div`,{className:`example-card`,children:[(0,L.jsxs)(`div`,{className:`basic-live ${i?`with-options`:``}`,children:[(0,L.jsx)(`div`,{className:`basic-preview`,children:n}),i&&(0,L.jsx)(`aside`,{className:`options`,children:i}),u!==`WrapPanel`&&u!==`RelativePanel`&&(0,L.jsxs)(`aside`,{className:`basic-output`,children:[(0,L.jsx)(`h3`,{children:(0,L.jsx)(k,{children:`Output`})}),(0,L.jsx)(`output`,{children:A})]})]}),(0,L.jsx)(H,{sampleKey:e,xaml:r})]})]})}let $=(e,t)=>(0,L.jsx)(c,{autoHeight:!0,theme:h,backend:x,onReady:ie(e),children:t},x+e);return(0,L.jsxs)(`div`,{className:`collections-shell`,children:[(0,L.jsx)(P,{title:u,theme:h,onTheme:g}),(0,L.jsxs)(`main`,{className:`stage-main collections-gallery`,children:[(0,L.jsxs)(`div`,{className:`stage-toolbar`,children:[(0,L.jsxs)(`label`,{children:[`Renderer `,(0,L.jsx)(S,{value:x,onValueChanged:e=>{T(e)},children:Object.values(n).map(e=>(0,L.jsx)(_,{value:e,children:e},e))})]}),u===`MenuBar`&&(0,L.jsx)(`a`,{href:`#menu-bar-item`,children:`MenuBarItem example`})]}),u===`MenuBar`&&(0,L.jsxs)(L.Fragment,{children:[Q(`menu-basic`,Z[0].title,$(`menu-basic`,(0,L.jsx)(y,{items:z(),enabled:!M,onItemInvoked:e=>j(e.itemId??``)})),Z[0].xaml,(0,L.jsx)(b,{checked:M,onValueChanged:N,label:`Disable menu`})),Q(`menu-accelerators`,Z[1].title,$(`menu-accelerators`,(0,L.jsx)(y,{items:z(!0),onItemInvoked:e=>j(e.itemId??``)})),Z[1].xaml),Q(`menu-submenus`,Z[2].title,$(`menu-submenus`,(0,L.jsx)(y,{items:B,onItemInvoked:e=>j(e.itemId??``)})),Z[2].xaml)]}),u===`MenuBarItem`&&Q(`menu-item`,`Compose individual MenuBarItem controls (SDK supplementary example)`,$(`menu-item`,(0,L.jsxs)(y,{children:[(0,L.jsx)(O,{title:`File`,items:R([`New`,`Open...`,`Save`,`Exit`]),onItemInvoked:e=>j(e.itemId??``)}),(0,L.jsx)(O,{title:`Edit`,items:R([`Undo`,`Cut`,`Copy`,`Paste`])}),(0,L.jsx)(O,{title:`Help`,items:R([`About`])})]})),Z[0].xaml),u===`CommandBarFlyout`&&Q(`command-flyout`,Z[0].title,$(`command-flyout`,(0,L.jsxs)(ee,{spacing:0,children:[(0,L.jsx)(w,{text:`Click or right click the image to open a CommandBarFlyout`}),(0,L.jsxs)(o,{padding:[0,0,0,0],margin:[0,12,0,12],accessibleName:`mountain`,children:[(0,L.jsx)(l,{source:`/winui/official/rainier.jpg`,height:300}),(0,L.jsx)(o.Flyout,{children:(0,L.jsx)(r,{showMode:C.Transient,placement:te.RightEdgeAlignedTop,primaryCommands:[{id:`share`,label:`Share`,iconSource:{kind:v.Symbol,symbol:i.Share}},{id:`save`,label:`Save`,iconSource:{kind:v.Symbol,symbol:i.Save}},{id:`delete`,label:`Delete`,iconSource:{kind:v.Symbol,symbol:i.Delete}}],secondaryCommands:[{id:`resize`,label:`Resize`},{id:`move`,label:`Move`}],onCommandInvoked:e=>j(`You clicked: `+({share:`Share`,save:`Save`,delete:`Delete`,resize:`Resize`,move:`Move`}[e.command.id]??e.command.id))})}),(0,L.jsx)(o.ContextFlyout,{children:(0,L.jsx)(r,{showMode:C.Standard,primaryCommands:[{id:`share`,label:`Share`,iconSource:{kind:v.Symbol,symbol:i.Share}},{id:`save`,label:`Save`,iconSource:{kind:v.Symbol,symbol:i.Save}},{id:`delete`,label:`Delete`,iconSource:{kind:v.Symbol,symbol:i.Delete}}],secondaryCommands:[{id:`resize`,label:`Resize`},{id:`move`,label:`Move`}],onCommandInvoked:e=>j(`You clicked: `+({share:`Share`,save:`Save`,delete:`Delete`,resize:`Resize`,move:`Move`}[e.command.id]??e.command.id))})})]})]})),Z[0].xaml),u===`RelativePanel`&&Q(`relative`,Z[0].title,$(`relative`,(0,L.jsxs)(a,{width:300,horizontalAlignment:d.Left,children:[(0,L.jsx)(t,{layoutKey:`red`,width:50,height:50,background:`#ff0000`}),(0,L.jsx)(t,{width:50,height:50,background:`#0000ff`,margin:[8,0,0,0],relative:{rightOf:`red`}}),(0,L.jsx)(t,{layoutKey:`green`,width:50,height:50,background:`#008000`,relative:{alignRightWithPanel:!0}}),(0,L.jsx)(t,{width:50,height:50,background:`#ffff00`,margin:[0,8,0,0],relative:{below:`green`,alignHorizontalCenterWith:`green`}})]})),Z[0].xaml),u===`WrapPanel`&&(0,L.jsxs)(L.Fragment,{children:[Q(`wrap-basic`,Z[0].title,$(`wrap-basic`,(0,L.jsx)(t,{width:360,height:q===s.Horizontal?200:360,horizontalAlignment:d.Left,background:{resource:`CardBackgroundFillColorSecondaryBrush`},borderBrush:{resource:`CardStrokeColorDefaultBrush`},borderThickness:[1,1,1,1],cornerRadius:4,children:(0,L.jsx)(e,{orientation:q,itemSpacing:I,lineSpacing:U,padding:[G,G,G,G],children:[[`Alpha`,72],[`Beta item`,112],[`Gamma`,88],[`Delta item`,128],[`Epsilon`,80],[`Zeta item`,104],[`Eta`,76],[`Theta item`,120],[`Iota`,92],[`Kappa item`,132]].map(([e,n])=>(0,L.jsx)(t,{minWidth:n,padding:[12,8,12,8],background:{resource:`ControlFillColorDefaultBrush`},borderBrush:{resource:`ControlStrokeColorDefaultBrush`},borderThickness:[1,1,1,1],cornerRadius:4,children:(0,L.jsx)(w,{text:e})},e))})})),Z[0].xaml,(0,L.jsxs)(L.Fragment,{children:[(0,L.jsx)(`div`,{children:`Orientation`}),[s.Horizontal,s.Vertical].map(e=>(0,L.jsx)(`div`,{children:(0,L.jsx)(E,{name:`wrap-orientation`,label:e,checked:q===e,onValueChanged:()=>J(e)})},e)),(0,L.jsxs)(`label`,{children:[`Item spacing `,(0,L.jsx)(f,{min:0,max:24,step:2,value:I,onValueChanged:V})]}),(0,L.jsxs)(`label`,{children:[`Line spacing `,(0,L.jsx)(f,{min:0,max:24,step:2,value:U,onValueChanged:W})]}),(0,L.jsxs)(`label`,{children:[`Padding `,(0,L.jsx)(f,{min:0,max:24,step:2,value:G,onValueChanged:K})]})]})),Q(`wrap-stretch`,Z[1].title,$(`wrap-stretch`,(0,L.jsx)(t,{width:360,horizontalAlignment:d.Left,background:{resource:`CardBackgroundFillColorSecondaryBrush`},borderBrush:{resource:`CardStrokeColorDefaultBrush`},borderThickness:[1,1,1,1],cornerRadius:4,children:(0,L.jsxs)(e,{itemSpacing:8,padding:[12,12,12,12],itemsStretch:Y,children:[[`One`,`Two`,`Three`,`Four`,`Five`].map(e=>(0,L.jsx)(t,{width:72,padding:[12,8,12,8],background:{resource:`ControlFillColorDefaultBrush`},borderBrush:{resource:`ControlStrokeColorDefaultBrush`},borderThickness:[1,1,1,1],cornerRadius:4,children:(0,L.jsx)(w,{text:e})},e)),(0,L.jsx)(t,{padding:[12,8,12,8],background:{resource:`AccentFillColorDefaultBrush`},borderBrush:{resource:`ControlStrokeColorDefaultBrush`},borderThickness:[1,1,1,1],cornerRadius:4,children:(0,L.jsx)(w,{text:`Final item`,foreground:{resource:`TextOnAccentFillColorPrimaryBrush`}})})]})})),Z[1].xaml,(0,L.jsx)(c,{theme:h,autoHeight:!0,children:(0,L.jsx)(m,{header:`ItemsStretch`,accessibleName:`Stretch final item`,isOn:Y===D.Last,onContent:`Last`,offContent:`None`,onToggled:e=>X(e.isOn?D.Last:D.None)})}))]})]})]})}function H({sampleKey:e,xaml:t}){let[n,r]=(0,F.useState)(!1);return(0,L.jsxs)(g,{className:`source`,children:[(0,L.jsx)(u,{children:`Source code`}),(0,L.jsxs)(`div`,{className:`source-tabs`,children:[(0,L.jsx)(T,{className:n?``:`active`,onClick:()=>r(!1),children:`TypeScript / React`}),(0,L.jsx)(T,{className:n?`active`:``,onClick:()=>r(!0),children:`Official XAML`})]}),(0,L.jsx)(M,{language:n?`xaml`:`tsx`,children:n?t:(e.startsWith(`menu-`)?I.slice(I.indexOf(`const entries=`),I.indexOf(`export function MenuLayoutPage`))+`
`:``)+N(I,e)})]})}export{V as MenuLayoutPage};