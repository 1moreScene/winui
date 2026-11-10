import{C as e,F as t,Fn as n,Fr as r,G as i,Gn as a,H as o,In as s,J as c,Jt as l,K as u,Kn as d,Kr as f,Or as p,Rr as m,S as h,V as g,Wt as _,Yt as v,a as y,cn as b,cr as x,dt as S,en as C,g as ee,hr as w,i as T,kr as E,l as te,li as D,lr as O,pi as k,r as ne,sn as A,sr as j,t as M,v as N,wn as P,wt as F,xn as I,zr as L}from"./GalleryControls-jbXHT3zS.js";import{t as R}from"./SourceCode-C2xz3uBh.js";import{i as z,r as B}from"./ButtonPage-Cv9H35SX.js";import{n as V}from"./NavigationControlsPage-DeLLI79r.js";var H=k(),U={commit:`7360ac322414e118eadfb0c7c2f4ecc31a218f59`,controls:{AppBarButton:{description:`AppBarButton differs from standard buttons in several ways:
- Their default appearance is a transparent background with a smaller size.
- You use the Label and Icon properties to set the content instead of the Content property. The Content property is ignored.
- The button's IsCompact property controls its size.`,samples:[{title:`An AppBarButton with a symbol icon.`,xaml:`<AppBarButton Icon="Like" Label="SymbolIcon" Click="AppBarButton_Click"/>`,code:``},{title:`An AppBarButton with a bitmap icon.`,xaml:`<AppBarButton Label="BitmapIcon" Click="AppBarButton_Click">
    <AppBarButton.Icon>
        <BitmapIcon UriSource="ms-appx:///Assets/SampleMedia/Slices2.png"/>
    </AppBarButton.Icon>
</AppBarButton>`,code:``},{title:`An AppBarButton with a font icon.`,xaml:`<AppBarButton Label="FontIcon" Click="AppBarButton_Click">
    <AppBarButton.Icon>
        <FontIcon FontFamily="Candara" Glyph="&#x03A3;"/>
    </AppBarButton.Icon>
</AppBarButton>`,code:``},{title:`An AppBarButton with a path icon.`,xaml:`<AppBarButton Label="PathIcon" Click="AppBarButton_Click">
    <AppBarButton.Content>
        <Viewbox Stretch="Uniform">
            <PathIcon Data="F1 M 20,20L 24,10L 24,24L 5,24"/>
        </Viewbox>
    </AppBarButton.Content>
</AppBarButton>`,code:``},{title:`An AppBarButton with a KeyboardAccelerator`,xaml:`<AppBarButton Icon="Save" Label="Save" Click="AppBarButton_Click">
    <AppBarButton.KeyboardAccelerators>
        <KeyboardAccelerator Modifiers="Control" Key="S"/>
    </AppBarButton.KeyboardAccelerators>
</AppBarButton>`,code:``},{title:`An AppBarButton that opens a Flyout containing an input control.`,xaml:`<AppBarButton
    AllowFocusOnInteraction="True"
    Icon="Edit"
    Label="Edit">
    <AppBarButton.Flyout>
        <Flyout>
            <TextBox MinWidth="240" PlaceholderText="Input text here" />
        </Flyout>
    </AppBarButton.Flyout>
</AppBarButton>`,code:``}]},AppBarToggleButton:{description:`An AppBarToggleButton looks like an AppBarButton, but works like a CheckBox. It typically has two states, checked (on) or unchecked (off), but can be indeterminate if the IsThreeState property is true. You can determine it's state by checking the IsChecked property.`,samples:[{title:`An AppBarToggleButton with a symbol icon.`,xaml:`<AppBarToggleButton Icon="Shuffle" Label="SymbolIcon" Click="AppBarButton_Click"/>`,code:``},{title:`An AppBarToggleButton with a bitmap icon.`,xaml:`<AppBarToggleButton Label="BitmapIcon" Click="AppBarButton_Click">
    <AppBarToggleButton.Icon>
        <BitmapIcon UriSource="ms-appx:///Assets/SampleMedia/Slices2.png"/>
    </AppBarToggleButton.Icon>
</AppBarToggleButton>`,code:``},{title:`An AppBarToggleButton with a font icon.`,xaml:`<AppBarToggleButton Label="FontIcon" Click="AppBarButton_Click">
    <AppBarToggleButton.Icon>
        <FontIcon FontFamily="Candara" Glyph="&#x03A3;"/>
    </AppBarToggleButton.Icon>
</AppBarToggleButton>`,code:``},{title:`A three-state AppBarToggleButton with a path icon.`,xaml:`<AppBarToggleButton Label="PathIcon" Click="AppBarButton_Click" IsThreeState="True">
    <AppBarToggleButton.Icon>
        <PathIcon Data="F1 M 20,20L 24,10L 24,24L 5,24"/>
    </AppBarToggleButton.Icon>
</AppBarToggleButton>`,code:``}]},CommandBar:{description:`Command bars provide users with easy access to your app's most common tasks. Command bars can provide access to app-level or page-specific commands and can be used with any navigation pattern. By default, the command bar shows a row of icon buttons and an optional "see more" button, which is represented by an ellipsis [...].`,samples:[{title:`A command bar with labels on the side free floating in a page`,xaml:`<CommandBar Background="Transparent" IsOpen="False" DefaultLabelPosition="Right">
    <AppBarButton Icon="Add" Label="Add"/>
    <AppBarButton Icon="Edit" Label="Edit"/>
    <AppBarButton Icon="Share" Label="Share"/>
    <CommandBar.SecondaryCommands>
        <AppBarButton Icon="Setting" Label="Settings">
            <AppBarButton.KeyboardAccelerators>
                    <KeyboardAccelerator Modifiers="Control" Key="I" />
            </AppBarButton.KeyboardAccelerators>
        </AppBarButton>
    </CommandBar.SecondaryCommands>
</CommandBar>`,code:``}]},DropDownButton:{description:`A control that drops down a flyout of choices from which one can be chosen.`,samples:[{title:`Simple DropDownButton`,xaml:`<DropDownButton Content="Email">
    <DropDownButton.Flyout>
        <MenuFlyout Placement="Bottom">
            <MenuFlyoutItem Text="Send"/>
            <MenuFlyoutItem Text="Reply"/>
            <MenuFlyoutItem Text="Reply All"/>
        </MenuFlyout>
    </DropDownButton.Flyout>
</DropDownButton>`,code:``},{title:`DropDownButton with Icons`,xaml:`<DropDownButton AutomationProperties.Name="Email">
    <DropDownButton.Content>
        <FontIcon Glyph="&#xE715;"/>
    </DropDownButton.Content>
    <DropDownButton.Flyout>
        <MenuFlyout Placement="Bottom">
            <MenuFlyoutItem Text="Send">
                <MenuFlyoutItem.Icon>
                    <FontIcon Glyph="&#xE725;"/>
                </MenuFlyoutItem.Icon>
            </MenuFlyoutItem>
            <MenuFlyoutItem Text="Reply">
                <MenuFlyoutItem.Icon>
                    <FontIcon Glyph="&#xE8CA;"/>
                </MenuFlyoutItem.Icon>
            </MenuFlyoutItem>
            <MenuFlyoutItem Text="Reply All">
                <MenuFlyoutItem.Icon>
                    <FontIcon Glyph="&#xE8C2;"/>
                </MenuFlyoutItem.Icon>
            </MenuFlyoutItem>
        </MenuFlyout>
    </DropDownButton.Flyout>
</DropDownButton>`,code:``}]},SelectorBar:{description:`SelectorBar is used to modify the content shown by allowing users to select and switch between a small, finite set of data.`,samples:[{title:`A Basic SelectorBar`,xaml:`<SelectorBar x:Name="SelectorBar1">
    <SelectorBarItem x:Name="SelectorBarItemRecent" Text="Recent" Icon="Clock" />
    <SelectorBarItem x:Name="SelectorBarItemShared" Text="Shared" Icon="Share" />
    <SelectorBarItem x:Name="SelectorBarItemFavorites" Text="Favorites" Icon="Favorite" />
</SelectorBar>`,code:``},{title:`SelectorBar with Frame Slide Transitions`,xaml:`<SelectorBar x:Name="SelectorBar2" SelectionChanged="SelectorBar2_SelectionChanged">
    <SelectorBarItem x:Name="SelectorBarItemPage1" Text="Page1" IsSelected="True" />
    <SelectorBarItem x:Name="SelectorBarItemPage2" Text="Page2" />
    <SelectorBarItem x:Name="SelectorBarItemPage3" Text="Page3" />
    <SelectorBarItem x:Name="SelectorBarItemPage4" Text="Page4" />
    <SelectorBarItem x:Name="SelectorBarItemPage5" Text="Page5" />
</SelectorBar>

<Frame x:Name="ContentFrame" IsNavigationStackEnabled="False" />`,code:`private void SelectorBar2_SelectionChanged(SelectorBar sender, SelectorBarSelectionChangedEventArgs args)
        {
            SelectorBarItem selectedItem = sender.SelectedItem;
            int currentSelectedIndex = sender.Items.IndexOf(selectedItem);
            System.Type pageType;

            switch (currentSelectedIndex)
            {
                case 0:
                    pageType = typeof(SamplePage1);
                    break;
                case 1:
                    pageType = typeof(SamplePage2);
                    break;
                case 2:
                    pageType = typeof(SamplePage3);
                    break;
                case 3:
                    pageType = typeof(SamplePage4);
                    break;
                default:
                    pageType = typeof(SamplePage5);
                    break;
            }

            var slideNavigationTransitionEffect = currentSelectedIndex - previousSelectedIndex > 0 ? SlideNavigationTransitionEffect.FromRight : SlideNavigationTransitionEffect.FromLeft;

            ContentFrame.Navigate(pageType, null, new SlideNavigationTransitionInfo() { Effect = slideNavigationTransitionEffect });

            previousSelectedIndex = currentSelectedIndex;
        }`},{title:`SelectorBar Displaying Different Collections Using ItemsView`,xaml:`<SelectorBar x:Name="SelectorBar3" SelectionChanged="SelectorBar3_SelectionChanged" >
    <SelectorBarItem x:Name="SelectorBarItemPink" Text="Pink" IsSelected="True" />
    <SelectorBarItem x:Name="SelectorBarItemPlum" Text="Plum" />
    <SelectorBarItem x:Name="SelectorBarItemPowderBlue" Text="PowderBlue" />
</SelectorBar>

<ItemsView x:Name="ItemsView3" ItemTemplate="{StaticResource ColorsTemplate}">
    <ItemsView.Layout>
        <UniformGridLayout />
    </ItemsView.Layout>
</ItemsView>`,code:`private void SelectorBar3_SelectionChanged(SelectorBar sender, SelectorBarSelectionChangedEventArgs args)
{
    if (sender.SelectedItem == SelectorBarItemPink)
    {
        ItemsView3.ItemsSource = PinkColorCollection;
    }
    else if (sender.SelectedItem == SelectorBarItemPlum)
    {
        ItemsView3.ItemsSource = PlumColorCollection;
    }
    else
    {
        ItemsView3.ItemsSource = PowderBlueColorCollection;
    }
}`}]}},sources:[{local:`references/gallery-input/AppBarButton/AppbarbuttonBitmapIcon.txt`,upstream:`WinUIGallery/Samples/AppBarButton/AppbarbuttonBitmapIcon.txt`,sha256:`847d2d69649f150cbe340656821c8a3fe04ae573a4a3bac19b7309e4c691c49f`},{local:`references/gallery-input/AppBarButton/AppbarbuttonFontIcon.txt`,upstream:`WinUIGallery/Samples/AppBarButton/AppbarbuttonFontIcon.txt`,sha256:`46607cd5819ee407c0ae3b546e97db19268a53a1b172f3af64b305952c107f77`},{local:`references/gallery-input/AppBarButton/AppbarbuttonKeyboardaccelerator.txt`,upstream:`WinUIGallery/Samples/AppBarButton/AppbarbuttonKeyboardaccelerator.txt`,sha256:`731865cd471c4f613e8f43a46c0a9aa40c47802f5da3fe94595fbfde3748a9b8`},{local:`references/gallery-input/AppBarButton/AppbarbuttonOpensFlyoutContaining.txt`,upstream:`WinUIGallery/Samples/AppBarButton/AppbarbuttonOpensFlyoutContaining.txt`,sha256:`fc242ea7c8d9590375170a838c14f1380038f450ee5528a4056021758fd9a49b`},{local:`references/gallery-input/AppBarButton/AppBarButtonPage.xaml`,upstream:`WinUIGallery/Samples/AppBarButton/AppBarButtonPage.xaml`,sha256:`839d621c7510dbd8fd2f7952f882ca7fd101bbbfbcd1dc1054cbd352d892ee92`},{local:`references/gallery-input/AppBarButton/AppBarButtonPage.xaml.cs`,upstream:`WinUIGallery/Samples/AppBarButton/AppBarButtonPage.xaml.cs`,sha256:`ae87bc1bc37eb860413561b2b65f17104440bc1e8bc96c1c28120a7632601ac6`},{local:`references/gallery-input/AppBarButton/AppbarbuttonPathIcon.txt`,upstream:`WinUIGallery/Samples/AppBarButton/AppbarbuttonPathIcon.txt`,sha256:`f622185434ea6a824b7758a4cd457087be865146aaa6935c50df6ed4548a78b1`},{local:`references/gallery-input/AppBarButton/AppbarbuttonSymbolIcon.txt`,upstream:`WinUIGallery/Samples/AppBarButton/AppbarbuttonSymbolIcon.txt`,sha256:`707376e2028f41d3acad71bdeb5ba3d929430694906a09600c6f3c09e5a5e789`},{local:`references/gallery-input/AppBarToggleButton/AppbartogglebuttonBitmapIcon.txt`,upstream:`WinUIGallery/Samples/AppBarToggleButton/AppbartogglebuttonBitmapIcon.txt`,sha256:`e300dbd6785778e233ba5f56aa364526d5d9a3c8b4ad4e23b9814024e7f8b1a2`},{local:`references/gallery-input/AppBarToggleButton/AppbartogglebuttonFontIcon.txt`,upstream:`WinUIGallery/Samples/AppBarToggleButton/AppbartogglebuttonFontIcon.txt`,sha256:`b3b3c508cb19373de52a5bb020a63df26aced62769f4c4cfff747cb38ffc2c26`},{local:`references/gallery-input/AppBarToggleButton/AppBarToggleButtonPage.xaml`,upstream:`WinUIGallery/Samples/AppBarToggleButton/AppBarToggleButtonPage.xaml`,sha256:`d5caacc463c1915ed6cab9cce2937116f2956d6bdf6a90cc70a7a3dbe97ca97e`},{local:`references/gallery-input/AppBarToggleButton/AppBarToggleButtonPage.xaml.cs`,upstream:`WinUIGallery/Samples/AppBarToggleButton/AppBarToggleButtonPage.xaml.cs`,sha256:`069e4500270d204e531908f7b8e37c5fd803a135bb7bc1e1cfcc7ea5ca003994`},{local:`references/gallery-input/AppBarToggleButton/AppbartogglebuttonSymbolIcon.txt`,upstream:`WinUIGallery/Samples/AppBarToggleButton/AppbartogglebuttonSymbolIcon.txt`,sha256:`5cdbe41528a9a17f21350c7e37275b1a6a99eb6904e96f7ea1922a45548cfec6`},{local:`references/gallery-input/AppBarToggleButton/ThreeStateAppbartogglebuttonPath.txt`,upstream:`WinUIGallery/Samples/AppBarToggleButton/ThreeStateAppbartogglebuttonPath.txt`,sha256:`d07e986796bdd5725f12fd4b234047ba72150d6ccfe0b39ef2fa2322be9b83bc`},{local:`references/gallery-input/CommandBar/CommandBarLabelsSide.txt`,upstream:`WinUIGallery/Samples/CommandBar/CommandBarLabelsSide.txt`,sha256:`538d33fdc980c18cdcf167e9722d42195f659fcab12565c27d340c80b69a1c44`},{local:`references/gallery-input/CommandBar/CommandBarPage.xaml`,upstream:`WinUIGallery/Samples/CommandBar/CommandBarPage.xaml`,sha256:`c72068878b4abfc0c41f352fbf3424e15fbf59a480b096f2dd7ff026181e56ed`},{local:`references/gallery-input/CommandBar/CommandBarPage.xaml.cs`,upstream:`WinUIGallery/Samples/CommandBar/CommandBarPage.xaml.cs`,sha256:`9233735e1f68ada6b6e6a1f51cc55eaa2103724f45de49f3be7c29355c4b3ee9`},{local:`references/gallery-input/DropDownButton/DropDownButtonIcon.txt`,upstream:`WinUIGallery/Samples/DropDownButton/DropDownButtonIcon.txt`,sha256:`a8a490c938b80377d46a7a002bc753ec478f8434e6250f7f5e47cdb1f6535e2f`},{local:`references/gallery-input/DropDownButton/DropDownButtonPage.xaml`,upstream:`WinUIGallery/Samples/DropDownButton/DropDownButtonPage.xaml`,sha256:`80fda64707995da4c438d59152caac5edcb0947f1aaebcd14f068a14f25de7ae`},{local:`references/gallery-input/DropDownButton/DropDownButtonPage.xaml.cs`,upstream:`WinUIGallery/Samples/DropDownButton/DropDownButtonPage.xaml.cs`,sha256:`6d542ede32db94d5d8a7f161295a16cd375bdee9d4d86ca9b527a1046838f514`},{local:`references/gallery-input/DropDownButton/DropDownButtonSimple.txt`,upstream:`WinUIGallery/Samples/DropDownButton/DropDownButtonSimple.txt`,sha256:`497c39332ba6c7299b1a2be7323218ade286a2a75e375c0ee0582029f2f19fe1`},{local:`references/gallery-input/SelectorBar/BasicSelectorbar.txt`,upstream:`WinUIGallery/Samples/SelectorBar/BasicSelectorbar.txt`,sha256:`cf8472c72f11d5cb878f8409bb43654f6c5059c327f14a1b917071b5673955bd`},{local:`references/gallery-input/SelectorBar/SelectorbarDisplayingDifferentCollections.txt`,upstream:`WinUIGallery/Samples/SelectorBar/SelectorbarDisplayingDifferentCollections.txt`,sha256:`de6e4e76db440874b7186bff898006726fca59bf5ca249076752259ec810b681`},{local:`references/gallery-input/SelectorBar/SelectorbarFrameSlideTransitions.txt`,upstream:`WinUIGallery/Samples/SelectorBar/SelectorbarFrameSlideTransitions.txt`,sha256:`610a41fb24d4160c38b0503795ef7d2207271791895e2fb0b8864819fb109027`},{local:`references/gallery-input/SelectorBar/SelectorBarPage.xaml`,upstream:`WinUIGallery/Samples/SelectorBar/SelectorBarPage.xaml`,sha256:`67ddcf85ebdea7c19a461c013150cbf1bc4f679632fa223566e766eab7f322f4`},{local:`references/gallery-input/SelectorBar/SelectorBarPage.xaml.cs`,upstream:`WinUIGallery/Samples/SelectorBar/SelectorBarPage.xaml.cs`,sha256:`90e414e9b03e4ab58d8abebf83361f64dfb1e5fbe4f454d53538fb17d230fde5`},{local:`references/gallery-input/SelectorBar/SamplePage1.xaml`,upstream:`WinUIGallery/SampleSupport/SamplePages/SamplePage1.xaml`,sha256:`3953193fd676445a2b94be3ce8127105bce0582cade32e769b390bd886993e49`},{local:`references/gallery-input/SelectorBar/SamplePage2.xaml`,upstream:`WinUIGallery/SampleSupport/SamplePages/SamplePage2.xaml`,sha256:`f86d4c2b55cb392b37e5da300ed625aa788d6eb26900d96b9db2a6ab56d377f1`},{local:`references/gallery-input/SelectorBar/SamplePage3.xaml`,upstream:`WinUIGallery/SampleSupport/SamplePages/SamplePage3.xaml`,sha256:`51d963c5cf15419feff872d9780fb79e769ce15bf67b318eec0ab2b95ba392fd`},{local:`references/gallery-input/SelectorBar/SamplePage4.xaml`,upstream:`WinUIGallery/SampleSupport/SamplePages/SamplePage4.xaml`,sha256:`d9d2e44d624667beb98c9a6a0397d0c1551569186732aac0f089c44a873edfa1`},{local:`references/gallery-input/SelectorBar/SamplePage5.xaml`,upstream:`WinUIGallery/SampleSupport/SamplePages/SamplePage5.xaml`,sha256:`b3d89b3701f069d6b7e4ef7971cf3bfcc82a7143b59eba18d316bd3e56e18305`},{local:`gallery/public/official/command-slices2.png`,upstream:`WinUIGallery/Assets/SampleMedia/Slices2.png`,sha256:`862c3215a417489cf28d384759a15e302a97e862e151dafeedbdc4893a9b9d6e`}]},W=`import { LocalizedText } from "./GalleryLanguage";
import { SourceCode } from './SourceCode';
import { GalleryButton, GalleryComboBox, GalleryExpander, GalleryExpanderHeader, GalleryOption } from './GalleryControls';
import {useRef,useState,type ReactNode} from 'react';
import {useGalleryTheme} from './gallery-theme';
import {Header} from './ButtonPage';
import {SceneView,AppBarButton,AppBarToggleButton,DropDownButton,SelectorBar,CommandBar,StackPanel,Grid,TextBlock,TextBox,FontIcon,Viewbox,PathIcon,Flyout,MenuFlyout,ScrollViewer,Ellipse} from 'winui-wasm/react';
import {RendererBackend,Orientation,HorizontalAlignment,VerticalAlignment,IconSourceKind,Symbol,OverlayPlacement,CommandBarDefaultLabelPosition,CommandBarItemKind,KeyboardAcceleratorModifier,GridUnit,AnimationEasing,AnimationResult,ScrollMode,ScrollBarVisibility,type SceneEvent,type Scene,type CommandBarController,type CommandBarItem,type AppBarButtonController as AppBarController,type AppBarToggleButtonController as AppBarToggleController,type DropDownButtonController as DropDownController,type SelectorBarController as SelectorController} from 'winui-wasm';
import official from './official-command-controls.json';
import source from './CommandControlsPage.tsx?raw';
import {extractSampleSource} from './sample-source';
import {TabContent} from './NavigationControlsPage';
type Kind=keyof typeof official.controls;
declare global{interface Window{commandScenes:Record<string,Scene>;commandControls:Record<string,AppBarController|AppBarToggleController|DropDownController|CommandBarController|SelectorController<any>>;}}
function remember(id:string,scene:Scene){window.commandScenes??={};window.commandScenes[id]=scene;}
function keep(id:string,node:AppBarController|AppBarToggleController|DropDownController|CommandBarController|SelectorController<any>){window.commandControls??={};window.commandControls[id]=node;}
const symbol=(symbol:Symbol)=>({kind:IconSourceKind.Symbol,symbol});
const ctrl=(key:string)=>[{key,modifiers:[KeyboardAcceleratorModifier.Control]}];
const lorem='Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';
const auto={unit:GridUnit.Auto,value:1},star={unit:GridUnit.Star,value:1};
function Example({kind,index,id,children,options}:{kind:Kind;index:number;id:string;children:ReactNode;options?:ReactNode}){const[native,setNative]=useState(false);const sample=official.controls[kind].samples[index];return <section id={id} className="example basic-example"><h2><LocalizedText>{sample.title}</LocalizedText></h2><div className="example-card"><div className={\`basic-live \${options?'with-options':''}\`}><div className="basic-preview">{children}</div>{options&&<div className="options">{options}</div>}</div><GalleryExpander className="source"><GalleryExpanderHeader>Source code</GalleryExpanderHeader><div className="source-tabs"><GalleryButton className={!native?'active':''} onClick={()=>setNative(false)}>TypeScript / React</GalleryButton><GalleryButton className={native?'active':''} onClick={()=>setNative(true)}>Official XAML</GalleryButton></div><SourceCode language={native ? 'xaml' : 'tsx'}>{native?sample.xaml:extractSampleSource(source,id)}</SourceCode></GalleryExpander></div></section>;}
function AppExample({index,kind,backend,theme}:{index:number;kind:'AppBarButton'|'AppBarToggleButton';backend:RendererBackend;theme:Parameters<typeof SceneView>[0]['theme']}){
 const toggle=kind==='AppBarToggleButton',id=\`\${toggle?'toggle':'appbar'}-\${index}\`;const[message,setMessage]=useState('');
 const clicked=(event:SceneEvent)=>{const checked=(event.target as AppBarToggleController).properties.isChecked;setMessage(toggle?\`IsChecked = \${checked===null?'':checked?'True':'False'}\`:\`You clicked: Button\${index+1}\`);};
 return <Example kind={kind} index={index} id={id}><SceneView autoHeight theme={theme} backend={backend} onReady={s=>remember(id,s)}><StackPanel orientation={Orientation.Horizontal}>
 {toggle?<>
 {index===0&&<>
    {/* @sample:toggle-0:start */}

<AppBarToggleButton label="SymbolIcon" iconSource={symbol(Symbol.Shuffle)} onClick={clicked} onReady={n=>keep(id,n)}/>
    
{/* @sample:toggle-0:end */}
</>}
 {index===1&&<>
    {/* @sample:toggle-1:start */}

<AppBarToggleButton label="BitmapIcon" iconSource={{kind:IconSourceKind.Bitmap,uriSource:'/official/command-slices2.png'}} onClick={clicked} onReady={n=>keep(id,n)}/>
    
{/* @sample:toggle-1:end */}
</>}
 {index===2&&<>
    {/* @sample:toggle-2:start */}

<AppBarToggleButton label="FontIcon" iconSource={{kind:IconSourceKind.Font,fontFamily:'Candara',glyph:'Σ'}} onClick={clicked} onReady={n=>keep(id,n)}/>
    
{/* @sample:toggle-2:end */}
</>}
 {index===3&&<>
    {/* @sample:toggle-3:start */}

<AppBarToggleButton label="PathIcon" isThreeState onClick={clicked} onReady={n=>keep(id,n)}><Viewbox><PathIcon data="F1 M 20,20L 24,10L 24,24L 5,24"/></Viewbox></AppBarToggleButton>
    
{/* @sample:toggle-3:end */}
</>}
 </>:<>
 {index===0&&<>
    {/* @sample:appbar-0:start */}

<AppBarButton label="SymbolIcon" iconSource={symbol(Symbol.Like)} onClick={clicked} onReady={n=>keep(id,n)}/>
    
{/* @sample:appbar-0:end */}
</>}
 {index===1&&<>
    {/* @sample:appbar-1:start */}

<AppBarButton label="BitmapIcon" iconSource={{kind:IconSourceKind.Bitmap,uriSource:'/official/command-slices2.png'}} onClick={clicked} onReady={n=>keep(id,n)}/>
    
{/* @sample:appbar-1:end */}
</>}
 {index===2&&<>
    {/* @sample:appbar-2:start */}

<AppBarButton label="FontIcon" iconSource={{kind:IconSourceKind.Font,fontFamily:'Candara',glyph:'Σ'}} onClick={clicked} onReady={n=>keep(id,n)}/>
    
{/* @sample:appbar-2:end */}
</>}
 {index===3&&<>
    {/* @sample:appbar-3:start */}

<AppBarButton label="PathIcon" onClick={clicked} onReady={n=>keep(id,n)}><Viewbox><PathIcon data="F1 M 20,20L 24,10L 24,24L 5,24"/></Viewbox></AppBarButton>
    
{/* @sample:appbar-3:end */}
</>}
 {index===4&&<>
    {/* @sample:appbar-4:start */}

<AppBarButton label="Save" iconSource={symbol(Symbol.Save)} keyboardAccelerators={ctrl('S')} onClick={clicked} onReady={n=>keep(id,n)}/>
    
{/* @sample:appbar-4:end */}
</>}
 {index===5&&<>
    {/* @sample:appbar-5:start */}

<AppBarButton label="Edit" iconSource={symbol(Symbol.Edit)} onReady={n=>keep(id,n)}><AppBarButton.Flyout><Flyout><TextBox minWidth={240} placeholderText="Input text here"/></Flyout></AppBarButton.Flyout></AppBarButton>
    
{/* @sample:appbar-5:end */}
</>}
 </>}
 <TextBlock text={message} margin={[8,0,0,0]} verticalAlignment={VerticalAlignment.Center}/></StackPanel></SceneView></Example>;
}
function DropExample({index,theme,backend}:{index:number;theme:Parameters<typeof SceneView>[0]['theme'];backend:RendererBackend}){const[message,setMessage]=useState('');const id=\`dropdown-\${index}\`;return <Example kind="DropDownButton" index={index} id={id}><SceneView autoHeight theme={theme} backend={backend} onReady={s=>remember(id,s)}>
 {index===0?<>
    {/* @sample:dropdown-0:start */}

<DropDownButton text="Email" onReady={n=>keep(id,n)}><DropDownButton.Flyout><MenuFlyout placement={OverlayPlacement.BottomEdgeAlignedLeft} menuItems={[{id:'send',text:'Send'},{id:'reply',text:'Reply'},{id:'reply-all',text:'Reply All'}]} onItemInvoked={e=>setMessage(e.itemId??'')}/></DropDownButton.Flyout></DropDownButton>
    
{/* @sample:dropdown-0:end */}
</>:<>
    {/* @sample:dropdown-1:start */}

<DropDownButton accessibleName="Email" onReady={n=>keep(id,n)}><FontIcon glyph={"\\uE715"}/><DropDownButton.Flyout><MenuFlyout placement={OverlayPlacement.BottomEdgeAlignedLeft} menuItems={[{id:'send',text:'Send',icon:'\\uE725'},{id:'reply',text:'Reply',icon:'\\uE8CA'},{id:'reply-all',text:'Reply All',icon:'\\uE8C2'}]} onItemInvoked={e=>setMessage(e.itemId??'')}/></DropDownButton.Flyout></DropDownButton>
    
{/* @sample:dropdown-1:end */}
</>}
 </SceneView>{message&&<output>{message}</output>}</Example>;}
function SelectorPages({index}:{index:number}){if(index<3)return <TabContent page={index}/>;if(index===3)return <ScrollViewer horizontalAlignment={HorizontalAlignment.Stretch} verticalAlignment={VerticalAlignment.Stretch}><StackPanel><Grid columns={[{...star,value:2},star,star]}>{['#e9967a','#8b0000','#f08080'].map((background,column)=><Grid key={column} column={column} minHeight={150} margin={[5,5,5,5]} background={background}/>)}</Grid><Grid columns={[star,star,{...star,value:2}]} rows={[auto,auto]}>{['#f08080','#8b0000','#cd5c5c'].map((background,column)=><Grid key={column} column={column} minHeight={150} margin={[5,5,5,5]} background={background}/>)}<TextBlock row={1} columnSpan={3} margin={[5,5,5,5]} text={lorem} wrap/></Grid></StackPanel></ScrollViewer>;return <ScrollViewer horizontalAlignment={HorizontalAlignment.Stretch} verticalAlignment={VerticalAlignment.Stretch}><Grid columns={[star,star,{...star,value:4}]} rows={[auto,auto,auto,auto]}><Grid minHeight={150} margin={[5,5,5,5]} background="#f0e68c"/><Grid column={1} minHeight={150} margin={[5,5,5,5]} background="#bdb76b"/><Ellipse column={2} width={150} height={150} background="#8fbc8f"/><Ellipse row={1} columnSpan={2} width={75} height={75} background="#3cb371"/><Grid row={1} column={2} minHeight={150} margin={[5,5,5,5]} background="#556b2f"/><TextBlock row={3} columnSpan={3} margin={[5,5,5,5]} text={lorem} wrap/></Grid></ScrollViewer>;}
export function CommandControlsPage({kind}:{kind:Kind}){const[theme,setTheme]=useGalleryTheme(),[backend,setBackend]=useState(RendererBackend.Canvas2D),[page,setPage]=useState(0),[contentPage,setContentPage]=useState(0),[color,setColor]=useState(0),[message,setMessage]=useState(''),[multiple,setMultiple]=useState(false);const bar=useRef<CommandBarController|null>(null),content=useRef<import('winui-wasm').Panel|null>(null),previous=useRef(0),pageRequest=useRef(0);
 const primary:CommandBarItem[]=[{id:'add',label:'Add',iconSource:symbol(Symbol.Add),keyboardAccelerators:ctrl('N')},{id:'edit',label:'Edit',iconSource:symbol(Symbol.Edit),keyboardAccelerators:ctrl('E')},{id:'share',label:'Share',iconSource:symbol(Symbol.Share),keyboardAccelerators:[{key:'F4'}]}];const secondary:CommandBarItem[]=[{id:'settings',label:'Settings',iconSource:symbol(Symbol.Setting),keyboardAccelerators:ctrl('I')},...multiple?[{id:'b1',label:'Button 1',iconSource:symbol(Symbol.Add),keyboardAccelerators:ctrl('N')},{id:'b2',label:'Button 2',iconSource:symbol(Symbol.Delete),keyboardAccelerators:[{key:'Delete'}]},{id:'separator',kind:CommandBarItemKind.Separator},{id:'b3',label:'Button 3',iconSource:symbol(Symbol.FontDecrease),keyboardAccelerators:ctrl('Subtract')},{id:'b4',label:'Button 4',iconSource:symbol(Symbol.FontIncrease),keyboardAccelerators:ctrl('Add')}]:[]];
 return <div className="collections-shell"><Header title={kind} theme={theme} onTheme={setTheme}/><main className="stage-main collections-gallery"><nav className="collection-docs"><a href={\`https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.\${kind.toLowerCase()}\`}>Documentation</a><a href={\`https://github.com/microsoft/WinUI-Gallery/tree/\${official.commit}/WinUIGallery/Samples/\${kind}\`}>Source</a><div className="collection-renderer"><GalleryComboBox aria-label="Command renderer" value={backend} onValueChanged={e=>setBackend(e as RendererBackend)}>{Object.values(RendererBackend).map(v=><GalleryOption key={v}>{v}</GalleryOption>)}</GalleryComboBox></div></nav>
 {(kind==='AppBarButton'||kind==='AppBarToggleButton')&&Array.from({length:kind==='AppBarButton'?6:4},(_,index)=><AppExample key={index} index={index} kind={kind} theme={theme} backend={backend}/>)}
 {kind==='DropDownButton'&&[0,1].map(index=><DropExample key={index} index={index} theme={theme} backend={backend}/>)}
 {kind==='SelectorBar'&&<>
 <Example kind={kind} index={0} id="selector-0"><SceneView autoHeight theme={theme} backend={backend} onReady={s=>remember('selector-0',s)}>
 
    {/* @sample:selector-0:start */}


 <SelectorBar items={[{id:'recent',text:'Recent',icon:'\\uE823'},{id:'shared',text:'Shared',icon:'\\uE72D'},{id:'favorites',text:'Favorites',icon:'\\uE734'}]} onReady={n=>keep('selector-0',n)}/>
 
    
{/* @sample:selector-0:end */}

 </SceneView></Example>
 <Example kind={kind} index={1} id="selector-1"><SceneView autoHeight theme={theme} backend={backend} onReady={s=>remember('selector-1',s)}><StackPanel horizontalAlignment={HorizontalAlignment.Stretch}>
 
    {/* @sample:selector-1:start */}


 <SelectorBar items={['Page1','Page2','Page3','Page4','Page5']} selectedIndex={page} onReady={n=>keep('selector-1',n)} onSelectionChanged={e=>{if(e.index<0)return;const direction=e.index>previous.current?1:-1;previous.current=e.index;setPage(e.index);const request=++pageRequest.current;const frame=content.current;if(!frame){setContentPage(e.index);return;}frame.animate({opacity:0},{duration:150,easing:AnimationEasing.Discrete});frame.animate({translationX:-direction*150},{duration:150,curve:[0.7,0,1,0.5]}).finished.then(result=>{if(result!==AnimationResult.Completed||request!==pageRequest.current||frame.isDisposed)return;setContentPage(e.index);frame.update({translationX:direction*200,opacity:1});frame.animate({translationX:0},{duration:300,curve:[0.1,0.9,0.2,1]});});}}/>
 <Grid horizontalAlignment={HorizontalAlignment.Stretch} onReady={n=>{content.current=n;}}><SelectorPages index={contentPage}/></Grid>
 
    
{/* @sample:selector-1:end */}

 </StackPanel></SceneView></Example>
 <Example kind={kind} index={2} id="selector-2"><SceneView autoHeight theme={theme} backend={backend} onReady={s=>remember('selector-2',s)}><StackPanel>
 
    {/* @sample:selector-2:start */}


 <SelectorBar items={['Pink','Plum','PowderBlue']} selectedIndex={color} onReady={n=>keep('selector-2',n)} onSelectionChanged={e=>{if(e.index>=0)setColor(e.index);}}/>
 <ScrollViewer horizontalScrollMode={ScrollMode.Enabled} horizontalScrollBarVisibility={ScrollBarVisibility.Auto} verticalScrollMode={ScrollMode.Disabled} verticalScrollBarVisibility={ScrollBarVisibility.Disabled}><StackPanel orientation={Orientation.Horizontal}>{Array.from({length:[5,7,4][color]},(_,i)=><Grid key={\`\${color}:\${i}\`} width={112} height={82} margin={[4,4,4,4]} background={['#ffc0cb','#dda0dd','#b0e0e6'][color]}/>)}</StackPanel></ScrollViewer>
 
    
{/* @sample:selector-2:end */}

 </StackPanel></SceneView></Example></>}
 {kind==='CommandBar'&&<Example kind={kind} index={0} id="command-0" options={<><span>Show or hide</span><GalleryButton onClick={()=>bar.current?.update({isOpen:true,isSticky:true})}>Open command bar</GalleryButton><GalleryButton onClick={()=>bar.current?.update({isOpen:false,isSticky:false})}>Close command bar</GalleryButton><span>Modify content</span><GalleryButton onClick={()=>setMultiple(true)}>Add secondary commands</GalleryButton><GalleryButton onClick={()=>setMultiple(false)}>Remove secondary commands</GalleryButton></>}><SceneView autoHeight theme={theme} backend={backend} onReady={s=>remember('command-0',s)}><StackPanel horizontalAlignment={HorizontalAlignment.Stretch}>
 
    {/* @sample:command-0:start */}


 <CommandBar defaultLabelPosition={CommandBarDefaultLabelPosition.Right} primaryCommands={primary} secondaryCommands={secondary} onReady={n=>{bar.current=n;keep('command-0',n);}} onCommandInvoked={e=>setMessage(\`You clicked: \${e.item?.label??e.command.id}\`)}/>
 <TextBlock text={message} padding={[0,8,0,0]}/>
 
    
{/* @sample:command-0:end */}

 </StackPanel></SceneView></Example>}
 </main></div>;
}
`,G=P();function K(e,t){window.commandScenes??={},window.commandScenes[e]=t}function q(e,t){window.commandControls??={},window.commandControls[e]=t}var J=e=>({kind:O.Symbol,symbol:e}),Y=e=>[{key:e,modifiers:[w.Control]}],X=`Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`,Z={unit:j.Auto,value:1},Q={unit:j.Star,value:1};function $({kind:e,index:t,id:n,children:r,options:i}){let[a,o]=(0,H.useState)(!1),s=U.controls[e].samples[t];return(0,G.jsxs)(`section`,{id:n,className:`example basic-example`,children:[(0,G.jsx)(`h2`,{children:(0,G.jsx)(N,{children:s.title})}),(0,G.jsxs)(`div`,{className:`example-card`,children:[(0,G.jsxs)(`div`,{className:`basic-live ${i?`with-options`:``}`,children:[(0,G.jsx)(`div`,{className:`basic-preview`,children:r}),i&&(0,G.jsx)(`div`,{className:`options`,children:i})]}),(0,G.jsxs)(T,{className:`source`,children:[(0,G.jsx)(y,{children:`Source code`}),(0,G.jsxs)(`div`,{className:`source-tabs`,children:[(0,G.jsx)(M,{className:a?``:`active`,onClick:()=>o(!1),children:`TypeScript / React`}),(0,G.jsx)(M,{className:a?`active`:``,onClick:()=>o(!0),children:`Official XAML`})]}),(0,G.jsx)(R,{language:a?`xaml`:`tsx`,children:a?s.xaml:z(W,n)})]})]})]})}function re({index:t,kind:n,backend:r,theme:a}){let o=n===`AppBarToggleButton`,s=`${o?`toggle`:`appbar`}-${t}`,[c,l]=(0,H.useState)(``),u=e=>{let n=e.target.properties.isChecked;l(o?`IsChecked = ${n===null?``:n?`True`:`False`}`:`You clicked: Button${t+1}`)};return(0,G.jsx)($,{kind:n,index:t,id:s,children:(0,G.jsx)(_,{autoHeight:!0,theme:a,backend:r,onReady:e=>K(s,e),children:(0,G.jsxs)(C,{orientation:p.Horizontal,children:[o?(0,G.jsxs)(G.Fragment,{children:[t===0&&(0,G.jsx)(G.Fragment,{children:(0,G.jsx)(e,{label:`SymbolIcon`,iconSource:J(f.Shuffle),onClick:u,onReady:e=>q(s,e)})}),t===1&&(0,G.jsx)(G.Fragment,{children:(0,G.jsx)(e,{label:`BitmapIcon`,iconSource:{kind:O.Bitmap,uriSource:`/winui/official/command-slices2.png`},onClick:u,onReady:e=>q(s,e)})}),t===2&&(0,G.jsx)(G.Fragment,{children:(0,G.jsx)(e,{label:`FontIcon`,iconSource:{kind:O.Font,fontFamily:`Candara`,glyph:`Σ`},onClick:u,onReady:e=>q(s,e)})}),t===3&&(0,G.jsx)(G.Fragment,{children:(0,G.jsx)(e,{label:`PathIcon`,isThreeState:!0,onClick:u,onReady:e=>q(s,e),children:(0,G.jsx)(I,{children:(0,G.jsx)(F,{data:`F1 M 20,20L 24,10L 24,24L 5,24`})})})})]}):(0,G.jsxs)(G.Fragment,{children:[t===0&&(0,G.jsx)(G.Fragment,{children:(0,G.jsx)(h,{label:`SymbolIcon`,iconSource:J(f.Like),onClick:u,onReady:e=>q(s,e)})}),t===1&&(0,G.jsx)(G.Fragment,{children:(0,G.jsx)(h,{label:`BitmapIcon`,iconSource:{kind:O.Bitmap,uriSource:`/winui/official/command-slices2.png`},onClick:u,onReady:e=>q(s,e)})}),t===2&&(0,G.jsx)(G.Fragment,{children:(0,G.jsx)(h,{label:`FontIcon`,iconSource:{kind:O.Font,fontFamily:`Candara`,glyph:`Σ`},onClick:u,onReady:e=>q(s,e)})}),t===3&&(0,G.jsx)(G.Fragment,{children:(0,G.jsx)(h,{label:`PathIcon`,onClick:u,onReady:e=>q(s,e),children:(0,G.jsx)(I,{children:(0,G.jsx)(F,{data:`F1 M 20,20L 24,10L 24,24L 5,24`})})})}),t===4&&(0,G.jsx)(G.Fragment,{children:(0,G.jsx)(h,{label:`Save`,iconSource:J(f.Save),keyboardAccelerators:Y(`S`),onClick:u,onReady:e=>q(s,e)})}),t===5&&(0,G.jsx)(G.Fragment,{children:(0,G.jsx)(h,{label:`Edit`,iconSource:J(f.Edit),onReady:e=>q(s,e),children:(0,G.jsx)(h.Flyout,{children:(0,G.jsx)(i,{children:(0,G.jsx)(b,{minWidth:240,placeholderText:`Input text here`})})})})})]}),(0,G.jsx)(A,{text:c,margin:[8,0,0,0],verticalAlignment:D.Center})]})})})}function ie({index:e,theme:t,backend:n}){let[r,i]=(0,H.useState)(``),a=`dropdown-${e}`;return(0,G.jsxs)($,{kind:`DropDownButton`,index:e,id:a,children:[(0,G.jsx)(_,{autoHeight:!0,theme:t,backend:n,onReady:e=>K(a,e),children:e===0?(0,G.jsx)(G.Fragment,{children:(0,G.jsx)(g,{text:`Email`,onReady:e=>q(a,e),children:(0,G.jsx)(g.Flyout,{children:(0,G.jsx)(S,{placement:E.BottomEdgeAlignedLeft,menuItems:[{id:`send`,text:`Send`},{id:`reply`,text:`Reply`},{id:`reply-all`,text:`Reply All`}],onItemInvoked:e=>i(e.itemId??``)})})})}):(0,G.jsx)(G.Fragment,{children:(0,G.jsxs)(g,{accessibleName:`Email`,onReady:e=>q(a,e),children:[(0,G.jsx)(u,{glyph:``}),(0,G.jsx)(g.Flyout,{children:(0,G.jsx)(S,{placement:E.BottomEdgeAlignedLeft,menuItems:[{id:`send`,text:`Send`,icon:``},{id:`reply`,text:`Reply`,icon:``},{id:`reply-all`,text:`Reply All`,icon:``}],onItemInvoked:e=>i(e.itemId??``)})})]})})}),r&&(0,G.jsx)(`output`,{children:r})]})}function ae({index:e}){return e<3?(0,G.jsx)(V,{page:e}):e===3?(0,G.jsx)(l,{horizontalAlignment:x.Stretch,verticalAlignment:D.Stretch,children:(0,G.jsxs)(C,{children:[(0,G.jsx)(c,{columns:[{...Q,value:2},Q,Q],children:[`#e9967a`,`#8b0000`,`#f08080`].map((e,t)=>(0,G.jsx)(c,{column:t,minHeight:150,margin:[5,5,5,5],background:e},t))}),(0,G.jsxs)(c,{columns:[Q,Q,{...Q,value:2}],rows:[Z,Z],children:[[`#f08080`,`#8b0000`,`#cd5c5c`].map((e,t)=>(0,G.jsx)(c,{column:t,minHeight:150,margin:[5,5,5,5],background:e},t)),(0,G.jsx)(A,{row:1,columnSpan:3,margin:[5,5,5,5],text:X,wrap:!0})]})]})}):(0,G.jsx)(l,{horizontalAlignment:x.Stretch,verticalAlignment:D.Stretch,children:(0,G.jsxs)(c,{columns:[Q,Q,{...Q,value:4}],rows:[Z,Z,Z,Z],children:[(0,G.jsx)(c,{minHeight:150,margin:[5,5,5,5],background:`#f0e68c`}),(0,G.jsx)(c,{column:1,minHeight:150,margin:[5,5,5,5],background:`#bdb76b`}),(0,G.jsx)(o,{column:2,width:150,height:150,background:`#8fbc8f`}),(0,G.jsx)(o,{row:1,columnSpan:2,width:75,height:75,background:`#3cb371`}),(0,G.jsx)(c,{row:1,column:2,minHeight:150,margin:[5,5,5,5],background:`#556b2f`}),(0,G.jsx)(A,{row:3,columnSpan:3,margin:[5,5,5,5],text:X,wrap:!0})]})})}function oe({kind:e}){let[i,o]=ee(),[u,h]=(0,H.useState)(r.Canvas2D),[g,y]=(0,H.useState)(0),[b,S]=(0,H.useState)(0),[w,T]=(0,H.useState)(0),[E,D]=(0,H.useState)(``),[O,k]=(0,H.useState)(!1),j=(0,H.useRef)(null),N=(0,H.useRef)(null),P=(0,H.useRef)(0),F=(0,H.useRef)(0),I=[{id:`add`,label:`Add`,iconSource:J(f.Add),keyboardAccelerators:Y(`N`)},{id:`edit`,label:`Edit`,iconSource:J(f.Edit),keyboardAccelerators:Y(`E`)},{id:`share`,label:`Share`,iconSource:J(f.Share),keyboardAccelerators:[{key:`F4`}]}],R=[{id:`settings`,label:`Settings`,iconSource:J(f.Setting),keyboardAccelerators:Y(`I`)},...O?[{id:`b1`,label:`Button 1`,iconSource:J(f.Add),keyboardAccelerators:Y(`N`)},{id:`b2`,label:`Button 2`,iconSource:J(f.Delete),keyboardAccelerators:[{key:`Delete`}]},{id:`separator`,kind:d.Separator},{id:`b3`,label:`Button 3`,iconSource:J(f.FontDecrease),keyboardAccelerators:Y(`Subtract`)},{id:`b4`,label:`Button 4`,iconSource:J(f.FontIncrease),keyboardAccelerators:Y(`Add`)}]:[]];return(0,G.jsxs)(`div`,{className:`collections-shell`,children:[(0,G.jsx)(B,{title:e,theme:i,onTheme:o}),(0,G.jsxs)(`main`,{className:`stage-main collections-gallery`,children:[(0,G.jsxs)(`nav`,{className:`collection-docs`,children:[(0,G.jsx)(`a`,{href:`https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.${e.toLowerCase()}`,children:`Documentation`}),(0,G.jsx)(`a`,{href:`https://github.com/microsoft/WinUI-Gallery/tree/${U.commit}/WinUIGallery/Samples/${e}`,children:`Source`}),(0,G.jsx)(`div`,{className:`collection-renderer`,children:(0,G.jsx)(ne,{"aria-label":`Command renderer`,value:u,onValueChanged:e=>h(e),children:Object.values(r).map(e=>(0,G.jsx)(te,{children:e},e))})})]}),(e===`AppBarButton`||e===`AppBarToggleButton`)&&Array.from({length:e===`AppBarButton`?6:4},(t,n)=>(0,G.jsx)(re,{index:n,kind:e,theme:i,backend:u},n)),e===`DropDownButton`&&[0,1].map(e=>(0,G.jsx)(ie,{index:e,theme:i,backend:u},e)),e===`SelectorBar`&&(0,G.jsxs)(G.Fragment,{children:[(0,G.jsx)($,{kind:e,index:0,id:`selector-0`,children:(0,G.jsx)(_,{autoHeight:!0,theme:i,backend:u,onReady:e=>K(`selector-0`,e),children:(0,G.jsx)(v,{items:[{id:`recent`,text:`Recent`,icon:``},{id:`shared`,text:`Shared`,icon:``},{id:`favorites`,text:`Favorites`,icon:``}],onReady:e=>q(`selector-0`,e)})})}),(0,G.jsx)($,{kind:e,index:1,id:`selector-1`,children:(0,G.jsx)(_,{autoHeight:!0,theme:i,backend:u,onReady:e=>K(`selector-1`,e),children:(0,G.jsxs)(C,{horizontalAlignment:x.Stretch,children:[(0,G.jsx)(v,{items:[`Page1`,`Page2`,`Page3`,`Page4`,`Page5`],selectedIndex:g,onReady:e=>q(`selector-1`,e),onSelectionChanged:e=>{if(e.index<0)return;let t=e.index>P.current?1:-1;P.current=e.index,y(e.index);let r=++F.current,i=N.current;i?(i.animate({opacity:0},{duration:150,easing:n.Discrete}),i.animate({translationX:-t*150},{duration:150,curve:[.7,0,1,.5]}).finished.then(n=>{n!==s.Completed||r!==F.current||i.isDisposed||(S(e.index),i.update({translationX:t*200,opacity:1}),i.animate({translationX:0},{duration:300,curve:[.1,.9,.2,1]}))})):S(e.index)}}),(0,G.jsx)(c,{horizontalAlignment:x.Stretch,onReady:e=>{N.current=e},children:(0,G.jsx)(ae,{index:b})})]})})}),(0,G.jsx)($,{kind:e,index:2,id:`selector-2`,children:(0,G.jsx)(_,{autoHeight:!0,theme:i,backend:u,onReady:e=>K(`selector-2`,e),children:(0,G.jsxs)(C,{children:[(0,G.jsx)(v,{items:[`Pink`,`Plum`,`PowderBlue`],selectedIndex:w,onReady:e=>q(`selector-2`,e),onSelectionChanged:e=>{e.index>=0&&T(e.index)}}),(0,G.jsx)(l,{horizontalScrollMode:L.Enabled,horizontalScrollBarVisibility:m.Auto,verticalScrollMode:L.Disabled,verticalScrollBarVisibility:m.Disabled,children:(0,G.jsx)(C,{orientation:p.Horizontal,children:Array.from({length:[5,7,4][w]},(e,t)=>(0,G.jsx)(c,{width:112,height:82,margin:[4,4,4,4],background:[`#ffc0cb`,`#dda0dd`,`#b0e0e6`][w]},`${w}:${t}`))})})]})})})]}),e===`CommandBar`&&(0,G.jsx)($,{kind:e,index:0,id:`command-0`,options:(0,G.jsxs)(G.Fragment,{children:[(0,G.jsx)(`span`,{children:`Show or hide`}),(0,G.jsx)(M,{onClick:()=>j.current?.update({isOpen:!0,isSticky:!0}),children:`Open command bar`}),(0,G.jsx)(M,{onClick:()=>j.current?.update({isOpen:!1,isSticky:!1}),children:`Close command bar`}),(0,G.jsx)(`span`,{children:`Modify content`}),(0,G.jsx)(M,{onClick:()=>k(!0),children:`Add secondary commands`}),(0,G.jsx)(M,{onClick:()=>k(!1),children:`Remove secondary commands`})]}),children:(0,G.jsx)(_,{autoHeight:!0,theme:i,backend:u,onReady:e=>K(`command-0`,e),children:(0,G.jsxs)(C,{horizontalAlignment:x.Stretch,children:[(0,G.jsx)(t,{defaultLabelPosition:a.Right,primaryCommands:I,secondaryCommands:R,onReady:e=>{j.current=e,q(`command-0`,e)},onCommandInvoked:e=>D(`You clicked: ${e.item?.label??e.command.id}`)}),(0,G.jsx)(A,{text:E,padding:[0,8,0,0]})]})})})]})]})}export{oe as CommandControlsPage};