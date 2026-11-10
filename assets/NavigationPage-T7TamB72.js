import{Cr as e,Kr as t,Or as n,Sr as r,Ut as i,Wt as a,X as o,Zn as s,_t as c,a as l,en as ee,f as u,g as d,gt as f,ht as p,i as m,jr as h,l as g,lr as _,n as v,p as y,pi as b,q as x,r as S,t as C,u as w,v as T,w as te,wn as E,xr as D,yr as O}from"./GalleryControls-jbXHT3zS.js";import{t as k}from"./SourceCode-C2xz3uBh.js";import{n as ne,r as re,t as ie}from"./examples-C6H3GZaC.js";var A=b(),ae={id:`navigationview`,name:`NavigationView`,description:`Common vertical layout for top-level areas of your app via a collapsible navigation menu.`,details:`The NavigationView control provides a common vertical layout for top-level areas of your app via a collapsible navigation menu.`,apiNamespace:`Microsoft.UI.Xaml.Controls`,relatedControls:[`SplitView`,`Pivot`],usings:[`Microsoft.UI.Xaml`,`Microsoft.UI.Xaml.Automation`,`Microsoft.UI.Xaml.Controls`,`System`,`System.Collections.ObjectModel`,`System.Diagnostics`,`System.Linq`,`Windows.System`],keywords:[`Object`,`DependencyObject`,`UIElement`,`FrameworkElement`,`Control`,`ContentControl`],curatedKeywords:[`hamburger menu`,`side nav`,`nav pane`],docs:[{title:`NavigationView - API`,uri:`https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.Controls.NavigationView`},{title:`Guidelines`,uri:`https://learn.microsoft.com/windows/apps/design/controls/navigationview`}],gallery:{uniqueId:`NavigationView`,group:{id:`Navigation`,title:`Navigation`},page:`WinUIGallery/Samples/NavigationView/NavigationViewPage.xaml`,codeBehind:`WinUIGallery/Samples/NavigationView/NavigationViewPage.xaml.cs`,baseClasses:[`Object`,`DependencyObject`,`UIElement`,`FrameworkElement`,`Control`,`ContentControl`],relatedSamples:[`microsoft/WinUI-Gallery#Pivot`,`microsoft/WinUI-Gallery#SplitView`]},samples:[{header:`NavigationView with default PaneDisplayMode`,xaml:`<NavigationView x:Name="nvSample">
    <NavigationView.MenuItems>
        <NavigationViewItem Icon="Play" Content="Menu Item1" Tag="SamplePage1" />
        <NavigationViewItem Icon="Save" Content="Menu Item2" Tag="SamplePage2" />
        <NavigationViewItem Icon="Refresh" Content="Menu Item3" Tag="SamplePage3" />
        <NavigationViewItem Icon="Download" Content="Menu Item4" Tag="SamplePage4" />
    </NavigationView.MenuItems>
    <Frame x:Name="contentFrame"/>
</NavigationView>`,gallery:{snippet:`NavigationviewDefaultPanedisplaymode.txt`,source:`WinUIGallery/Samples/NavigationView/NavigationviewDefaultPanedisplaymode.txt`,name:`Default Panedisplaymode`}},{header:`NavigationView with PaneDisplayMode set to Top`,xaml:`<NavigationView x:Name="nvSample" Header="This is Header Text" PaneDisplayMode="Top">
    <NavigationView.MenuItems>
        <NavigationViewItem  Content="Menu Item1" Tag="SamplePage1" />
        <NavigationViewItem  Content="Menu Item2" Tag="SamplePage2" />
        <NavigationViewItem  Content="Menu Item3" Tag="SamplePage3" />
        <NavigationViewItem  Content="Menu Item4" Tag="SamplePage4" />
    </NavigationView.MenuItems>
    <Frame x:Name="contentFrame"/>
</NavigationView>`,gallery:{snippet:`NavigationviewPanedisplaymodeTop.txt`,source:`WinUIGallery/Samples/NavigationView/NavigationviewPanedisplaymodeTop.txt`,name:`Panedisplaymode Top`}},{header:`NavigationView that switches pane orientation based on window width`,xaml:`<!-- Put the following VisualStateGroup(s) inside the first component of your Page -->
<VisualStateManager.VisualStateGroups>
    <VisualStateGroup>
        <VisualState>
            <VisualState.StateTriggers>
                <AdaptiveTrigger MinWindowWidth="{x:Bind nvSample.CompactModeThresholdWidth}" />
            </VisualState.StateTriggers>
            <VisualState.Setters>
                <Setter Target="nvSample.PaneDisplayMode" Value="Top" />
            </VisualState.Setters>
        </VisualState>
    </VisualStateGroup>
</VisualStateManager.VisualStateGroups >

<NavigationView x:Name="nvSample">
    <NavigationView.MenuItems>
        <NavigationViewItem Content="Menu Item1" Tag="SamplePage1" />
        <NavigationViewItem Content="Menu Item2" Tag="SamplePage2" />
        <NavigationViewItem Content="Menu Item3" Tag="SamplePage3" />
        <NavigationViewItem Content="Menu Item4" Tag="SamplePage4" />
    </NavigationView.MenuItems>
    <Frame x:Name="contentFrame"/>
</NavigationView>`,gallery:{snippet:`NavigationviewSwitchesPaneOrientation.txt`,source:`WinUIGallery/Samples/NavigationView/NavigationviewSwitchesPaneOrientation.txt`,name:`Switches Pane Orientation`}},{header:`Tying selection and focus - Tabs`,xaml:`<NavigationView x:Name="nvSample" PaneDisplayMode="Top" 
    SelectionFollowsFocus="Enabled" IsBackButtonVisible="Collapsed">
    <NavigationView.MenuItems>
        <NavigationViewItem Icon="Play" Content="Item1" x:Name="SamplePage1Item" />
        <NavigationViewItem Icon="Save" Content="Item2" x:Name="SamplePage2Item" />
        <NavigationViewItem Icon="Refresh" Content="Item3" x:Name="SamplePage3Item" />
        <NavigationViewItem Icon="Download" Content="Item4" x:Name="SamplePage4Item" />
    </NavigationView.MenuItems>
    <Frame x:Name="contentFrame"/>
</NavigationView>`,code:`//C# code behind
private void NavView_ItemInvoked(NavigationView sender, NavigationViewItemInvokedEventArgs args)
{
    FrameNavigationOptions navOptions = new FrameNavigationOptions();
    navOptions.TransitionInfoOverride = args.RecommendedNavigationTransitionInfo;
    if (sender.PaneDisplayMode == NavigationViewPaneDisplayMode.Top)
    {
        navOptions.IsNavigationStackEnabled = False;
    }
    Type pageType;
    if (args.InvokedItem == SamplePage1Item) 
    {
        pageType = typeof(SamplePage1);
    }
    else if (args.InvokedItem == SamplePage2Item) 
    {
        pageType = typeof(SamplePage2);
    }
    else if (args.InvokedItem == SamplePage3Item) 
    {
        pageType = typeof(SamplePage3);
    }
    else if (args.InvokedItem == SamplePage4Item) 
    {
        pageType = typeof(SamplePage4);
    }
    ContentFrame.NavigateToType(pageType, null, navOptions);
}`,language:`csharp`,gallery:{snippet:`NavigationViewTyingSelectionFocusTabs.txt`,source:`WinUIGallery/Samples/NavigationView/NavigationViewTyingSelectionFocusTabs.txt`,name:`Tying Selection Focus Tabs`}},{header:`Data binding`,xaml:`<NavigationView x:Name="nvSample" 
                MenuItemTemplateSelector="{StaticResource selector}" 
                MenuItemsSource="{x:Bind Categories, Mode=OneWay}" />
 
<local:MenuItemTemplateSelector x:Key="selector"> 
    <local:MenuItemTemplateSelector.ItemTemplate> 
        <DataTemplate x:DataType="local:Category" > 
            <NavigationViewItem Content="{x:Bind Name}" ToolTipService.ToolTip="{x:Bind Tooltip}"> 
                <NavigationViewItem.Icon> 
                    <SymbolIcon Symbol="{x:Bind Glyph}" /> 
                </NavigationViewItem.Icon> 
            </NavigationViewItem>
        </DataTemplate> 
    </local:MenuItemTemplateSelector.ItemTemplate > 
</local:MenuItemTemplateSelector>`,code:`//C# code behind
Categories = new ObservableCollection<CategoryBase>(); 
Categories.Add(new Category { Name = "Category 1", Glyph = Symbol.Home, Tooltip = "This is category 1" }); 
Categories.Add(new Category { Name = "Category 2", Glyph = Symbol.Keyboard, Tooltip = "This is category 2" }); 
Categories.Add(new Separator()); 
Categories.Add(new Header { Name = "More categories" }); 
Categories.Add(new Category { Name = "Category 3", Glyph = Symbol.Library, Tooltip = "This is category 3" }); 
Categories.Add(new Category { Name = "Category 4", Glyph = Symbol.Mail, Tooltip = "This is category 4" }); 

public class CategoryBase { } 

public class Category : CategoryBase
{
    public string Name { get; set; } = string.Empty;
    public string Tooltip { get; set; } = string.Empty;
    public Symbol Glyph { get; set; }
}

public class Separator : CategoryBase { }

[WinRT.GeneratedBindableCustomProperty]
public partial class Header : CategoryBase
{
    public string Name { get; set; } = string.Empty;
}

[ContentProperty(Name = "ItemTemplate")]
class MenuItemTemplateSelector : DataTemplateSelector
{
    public DataTemplate? ItemTemplate { get; set; }

    protected override DataTemplate? SelectTemplateCore(object item)
    {
        return item is Separator ? SeparatorTemplate : item is Header ? HeaderTemplate : ItemTemplate;
    }

    // Header and separator templates are created in code with the DataTemplate(DataTemplateElementFactory) constructor.
    private readonly DataTemplate HeaderTemplate = new DataTemplate(() =>
    {
        NavigationViewItemHeader header = new NavigationViewItemHeader();
        header.SetBinding(ContentControl.ContentProperty, new Binding { Path = new PropertyPath(nameof(Header.Name)) });
        return header;
    });

    private readonly DataTemplate SeparatorTemplate = new DataTemplate(() => new NavigationViewItemSeparator());
}`,language:`csharp`,xmlnsImports:[`xmlns:local="using:YourNamespace"`],gallery:{snippet:`NavigationViewDataBinding.txt`,source:`WinUIGallery/Samples/NavigationView/NavigationViewDataBinding.txt`,name:`Data Binding`}},{header:`NavigationView with Footer Menu Items`,xaml:`<NavigationView x:Name="nvSample9" 
                            Header="This is Header Text" 
                            PaneDisplayMode="Left" 
                            SelectionChanged="NavigationView_SelectionChanged9"
                            IsSettingsVisible="False">
        <NavigationView.MenuItems>
            <NavigationViewItem Content="Browse" Tag="SamplePage1" Icon="Library" />
            <NavigationViewItem Content="Track an Order" Tag="SamplePage2" Icon="Map" />
            <NavigationViewItem Content="Order History" Tag="SamplePage3" Icon="Tag" />
        </NavigationView.MenuItems>
        <NavigationView.FooterMenuItems>
            <NavigationViewItem Content="Account" Tag="SamplePage4" Icon="Contact" />
            <NavigationViewItem Content="Your Cart" Tag="SamplePage5" Icon="Shop" />
            <NavigationViewItem Content="Help" Tag="SamplePage5" Icon="Help" />
        </NavigationView.FooterMenuItems>
    <Frame x:Name="contentFrame9" />
</NavigationView>`,gallery:{snippet:`NavigationviewFooterMenuItems.txt`,source:`WinUIGallery/Samples/NavigationView/NavigationviewFooterMenuItems.txt`,name:`Footer Menu Items`}},{header:`Hierarchical NavigationView`,xaml:`<NavigationView x:Name="nvSample8" Grid.Row="1" Height="460"
                        PaneDisplayMode="Left" 
                        IsTabStop="False" 
                        SelectionChanged="NavigationView_SelectionChanged8">
    <NavigationView.MenuItems>
        <NavigationViewItem Content="Home" Icon="Home" ToolTipService.ToolTip="Home" Tag="SamplePage1"/>
        <NavigationViewItem Content="Account" Icon="Contact" ToolTipService.ToolTip="Account" Tag="SamplePage2">
            <NavigationViewItem.MenuItems>
                <NavigationViewItem Content="Mail" Icon="Mail" ToolTipService.ToolTip="Mail" Tag="SamplePage3"/>
                <NavigationViewItem Content="Calendar" Icon="Calendar" ToolTipService.ToolTip="Calendar" Tag="SamplePage4"/>
            </NavigationViewItem.MenuItems>
        </NavigationViewItem>
        <NavigationViewItem Content="Document options" Icon="Page2" ToolTipService.ToolTip="Document options" SelectsOnInvoked="False">
            <NavigationViewItem.MenuItems>
                <NavigationViewItem Content="Create new" Icon="NewFolder" ToolTipService.ToolTip="Create new" Tag="SamplePage5"/>
                <NavigationViewItem Content="Upload file" Icon="OpenLocal" ToolTipService.ToolTip="Upload file" Tag="SamplePage6"/>
            </NavigationViewItem.MenuItems>
        </NavigationViewItem>
    </NavigationView.MenuItems>
    <Frame x:Name="contentFrame8" />
</NavigationView>`,gallery:{snippet:`HierarchicalNavigationview.txt`,source:`WinUIGallery/Samples/NavigationView/HierarchicalNavigationview.txt`,name:`Hierarchical Navigationview`}},{header:`API in action`,xaml:`<NavigationView x:Name="nvSample"
    IsSettingsVisible="True"
    IsBackEnabled="False"
    SelectionChanged="NavigationView_SelectionChanged"
    Header="Header"
    AlwaysShowHeader="True"
    PaneTitle="Pane Title"
    PaneDisplayMode="Left" 
    ExpandedModeThresholdWidth="500"
    IsTabStop="False">
                    
    <NavigationView.MenuItems>
        <NavigationViewItem Content="Menu Item1" Tag="SamplePage1" x:Name="SamplePage1Item">
            <NavigationViewItem.Icon>
                <SymbolIcon Symbol="Play" />
            </NavigationViewItem.Icon>
        </NavigationViewItem>
        <NavigationViewItemHeader Content="Actions"/>
        <NavigationViewItem Content="Menu Item2" Tag="SamplePage2" x:Name="SamplePage2Item" SelectsOnInvoked="True">
            <NavigationViewItem.Icon>
                <SymbolIcon Symbol="Save" />
            </NavigationViewItem.Icon>
        </NavigationViewItem>
        <NavigationViewItem Content="Menu Item3" Tag="SamplePage3" x:Name="SamplePage3Item">
            <NavigationViewItem.Icon>
                <SymbolIcon Symbol="Refresh" />
            </NavigationViewItem.Icon>
        </NavigationViewItem>
    </NavigationView.MenuItems>
                    
    <NavigationView.PaneCustomContent>
        <HyperlinkButton x:Name="PaneHyperlink" Content="More info" Margin="12,0" Visibility="Collapsed" />
    </NavigationView.PaneCustomContent>
    <NavigationView.PaneFooter>
        <StackPanel x:Name="FooterStackPanel" Orientation="Vertical" Visibility="Collapsed">
            <NavigationViewItem Icon="Download" AutomationProperties.Name="download" />
            <NavigationViewItem Icon="Favorite" AutomationProperties.Name="favorite" />
        </StackPanel>
    </NavigationView.PaneFooter>

    <Frame x:Name="contentFrame" />
</NavigationView>`,gallery:{snippet:`NavigationViewApiAction.txt`,source:`WinUIGallery/Samples/NavigationView/NavigationViewApiAction.txt`,name:`Api Action`,xamlPlaceholdersDropped:[`BackButtonVis`,`SelectionFollowsFocus`,`NavViewASB`]}}]},oe=`import { LocalizedText } from "./GalleryLanguage";
import {useEffect,useMemo,useRef,useState} from 'react';
import {SceneView,SceneNavigationView,Frame,NavigationViewContent,AutoSuggestBox,StackPanel,HyperlinkButton,Button,NavigationViewItem} from 'winui-wasm/react';
import {GalleryButton,GalleryCheckBox,GalleryComboBox,GalleryExpander,GalleryExpanderHeader,GalleryOption,GalleryRadioButton,GallerySlider,GalleryTextBox} from './GalleryControls';
import {SourceCode} from './SourceCode';
import {exampleNames,exampleOptions,galleryPaneMaterial} from './examples';
import {EventKind,NavigationViewBackButtonVisible,NavigationViewSlot,PaneDisplayMode,Orientation,HorizontalAlignment,Symbol,NodeKind,IconSourceKind,
 type ThemeMode,type WinUI,type NavigationViewOptions,type SceneNavigationViewController as NavigationController,type SceneFrameController as FrameController,type SceneEvent,type ScenePageDefinition} from 'winui-wasm';
import official from './official-navigation.json';
import source from './NavigationGalleryExample.tsx?raw';

const pages:ScenePageDefinition[]=[...Array.from({length:7},(_,i)=>\`SamplePage\${i+1}\`),'SampleSettingsPage'].map(key=>({key,contentResource:\`gallery/\${key}\`}));
function destination(index:number,itemId:string){
 if(itemId==='$settings')return 'SampleSettingsPage';
 let page=Number(itemId.replace('page',''))||1;
 if(index===1&&page===4)page=3;
 if(index===5&&page===6)page=5;
 return \`SamplePage\${index===4?1:page}\`;
}
/** Application data and event wiring. Every visual control, slot, Page and
 * template part in the live sample belongs to the shared Rust scene. */
export function NavigationGalleryExample({index,theme,reducedMotion,reducedTransparency,sdk,hidden=false}:{index:number;theme:ThemeMode;reducedMotion:boolean;reducedTransparency:boolean;sdk:WinUI;hidden?:boolean}){
 const initial=useMemo(()=>exampleOptions(index,theme),[index]);
 const [mode,setMode]=useState(initial.paneDisplayMode??PaneDisplayMode.Auto);
 const [width,setWidth]=useState<number>();
 const [reset,setReset]=useState(0),[extra,setExtra]=useState(0);
 const [settings,setSettings]=useState(initial.isSettingsVisible??true);
 const [back,setBack]=useState(initial.isBackButtonVisible!==NavigationViewBackButtonVisible.Collapsed);
 const [backEnabled,setBackEnabled]=useState(false),[searchVisible,setSearchVisible]=useState(true);
 const [header,setHeader]=useState<string|null>(index===7?'Header':initial.header??null);
 const [paneTitle,setPaneTitle]=useState('Pane Title');
 const [alwaysHeader,setAlwaysHeader]=useState(true),[custom,setCustom]=useState(false),[footer,setFooter]=useState(false);
 const [follows,setFollows]=useState(initial.selectionFollowsFocus??false),[suppress,setSuppress]=useState(false),[cancelClosing,setCancelClosing]=useState(false);
 const [eventText,setEventText]=useState('Ready'),[displayMode,setDisplayMode]=useState('');
 const [history,setHistory]=useState({back:false,forward:false});
 const [sourceKind,setSourceKind]=useState<'tsx'|'xaml'>('tsx');
 const frame=useRef<FrameController|null>(null),navigation=useRef<NavigationController|null>(null),count=useRef(0);
 const viewport=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(index!==2)return;
  const observer=new ResizeObserver(([entry])=>setMode(entry.contentRect.width>=641?PaneDisplayMode.Top:PaneDisplayMode.LeftMinimal));
  observer.observe(viewport.current!);return()=>observer.disconnect();
 },[index]);
 const items=useMemo(()=>[...(initial.items??[]).map(item=>item.id==='page2'?{...item,selectsOnInvoked:!suppress}:item),...Array.from({length:extra},(_,i)=>({id:\`added\${i}\`,text:\`New category \${i+1}\`,icon:'\\uE710'}))],[initial,extra,suppress]);
 const {content:_,contentNode:__,...base}=initial;
 const options:NavigationViewOptions={...base,items,theme,header,paneDisplayMode:mode,isSettingsVisible:settings,
  isBackButtonVisible:back?NavigationViewBackButtonVisible.Visible:NavigationViewBackButtonVisible.Collapsed,isBackEnabled:backEnabled,
  selectionFollowsFocus:follows,alwaysShowHeader:alwaysHeader,paneTitle:index===7?paneTitle:'',expandedPaneMaterial:galleryPaneMaterial(theme),reducedMotion,reducedTransparency};
 function onEvent(event:SceneEvent){
  setEventText(\`\${++count.current} · \${event.kind}\${event.itemId?\` → \${event.itemId}\`:''}\`);
  if(event.kind!==EventKind.SelectionChanged||!event.itemId)return;
  const target=destination(index,event.itemId);
  if([0,4,6].includes(index)&&event.itemId!=='$settings')setHeader(\`Sample Page \${Number(event.itemId.replace('page',''))||1}\`);
  frame.current?.navigate(target,{transition:event.recommendedNavigationTransition});
 }
 function restore(){setMode(initial.paneDisplayMode??PaneDisplayMode.Auto);setWidth(undefined);setExtra(0);setSettings(initial.isSettingsVisible??true);setBack(initial.isBackButtonVisible!==NavigationViewBackButtonVisible.Collapsed);setBackEnabled(false);setSearchVisible(true);setHeader(index===7?'Header':initial.header??null);setPaneTitle('Pane Title');setAlwaysHeader(true);setCustom(false);setFooter(false);setFollows(initial.selectionFollowsFocus??false);setSuppress(false);setCancelClosing(false);setEventText('Ready');count.current=0;setReset(v=>v+1);}
 const chooseMode=(next:PaneDisplayMode)=>{setMode(next);navigation.current?.configure({isPaneOpen:next!==PaneDisplayMode.Top});};
 return <section className="example" id={\`example-\${index}\`} hidden={hidden}>
  <h2><LocalizedText>{exampleNames[index]}</LocalizedText></h2><div className="example-card"><div className="example-live">
   <div className="viewport-scroll"><div ref={viewport} className="sample-viewport" style={{width:width??'100%'}}>
    <SceneView key={reset} className="control-host" theme={theme} reducedMotion={reducedMotion} reducedTransparency={reducedTransparency} style={{height:index===7?540:460}}>
     <SceneNavigationView {...options}
      onReady={control=>{navigation.current=control;window.gallery.views[index]=control.asView();}}
      onSnapshot={state=>setDisplayMode(state.displayMode)}
      onEvent={onEvent} onPaneClosing={event=>{event.cancel=cancelClosing;}}>
      <Frame pages={pages} onReady={control=>{frame.current=control;window.gallery.sampleFrames??=[];window.gallery.sampleFrames[index]=control;control.onSnapshot(state=>setHistory(previous=>previous.back===!!state.backStack.length&&previous.forward===!!state.forwardStack.length?previous:{back:!!state.backStack.length,forward:!!state.forwardStack.length}));if(index!==7)control.navigate('SamplePage1');}}/>
      {index===7&&<>
       <NavigationViewContent slot={NavigationViewSlot.AutoSuggestBox}><AutoSuggestBox queryIcon accessibleName="Search" visible={searchVisible}/></NavigationViewContent>
       <NavigationViewContent slot={NavigationViewSlot.PaneCustomContent}><HyperlinkButton text="More info" margin={[12,0,12,0]} visible={custom}/></NavigationViewContent>
       <NavigationViewContent slot={NavigationViewSlot.PaneFooter}><StackPanel orientation={mode===PaneDisplayMode.Top?Orientation.Horizontal:Orientation.Vertical} visible={footer}>
        <NavigationViewItem accessibleName="download" iconSource={{kind:IconSourceKind.Symbol,symbol:Symbol.Download}}/>
        <NavigationViewItem accessibleName="favorite" iconSource={{kind:IconSourceKind.Symbol,symbol:Symbol.Favorite}}/>
       </StackPanel></NavigationViewContent>
      </>}
     </SceneNavigationView>
    </SceneView>
   </div></div>
   {index>=5&&<aside className="options"><h3><LocalizedText>Options</LocalizedText></h3>
    {index<7?<><span>{index===5?'Pane position:':'PanePosition:'}</span>{(index===6?[PaneDisplayMode.Left,PaneDisplayMode.Top,PaneDisplayMode.LeftCompact]:[PaneDisplayMode.Left,PaneDisplayMode.Top]).map(value=><GalleryRadioButton key={value} name={\`navigation-mode-\${index}\`} label={\`\${value} mode\`} checked={mode===value} onValueChanged={()=>chooseMode(value)}/>)}</>:<>
     <GalleryCheckBox label="Settings item visible" checked={settings} onValueChanged={setSettings}/>
     <GalleryCheckBox label="Back button visible" checked={back} onValueChanged={setBack}/>
     <GalleryCheckBox label="Back button enabled" checked={backEnabled} onValueChanged={setBackEnabled}/>
     <GalleryCheckBox label="AutoSuggestBox visible" checked={searchVisible} onValueChanged={setSearchVisible}/>
     <label className="field">Header:<GalleryTextBox aria-label="Header property" value={header??''} onValueChanged={setHeader}/></label>
     <GalleryCheckBox label="Always show header" checked={alwaysHeader} onValueChanged={setAlwaysHeader}/>
     <label className="field">PaneTitle:<GalleryTextBox aria-label="PaneTitle property" value={paneTitle} onValueChanged={setPaneTitle}/></label>
     <GalleryCheckBox label="PaneCustomContent visible" checked={custom} onValueChanged={setCustom}/>
     <GalleryCheckBox label="PaneFooter visible" checked={footer} onValueChanged={setFooter}/>
     <span>PanePosition:</span><GalleryRadioButton name="navigation-api-position" label="Left" checked={mode===PaneDisplayMode.Left} onValueChanged={()=>chooseMode(PaneDisplayMode.Left)}/><GalleryRadioButton name="navigation-api-position" label="Top" checked={mode===PaneDisplayMode.Top} onValueChanged={()=>chooseMode(PaneDisplayMode.Top)}/>
     <GalleryCheckBox label="Keyboard SelectionFollowsFocus" checked={follows} onValueChanged={setFollows}/>
     <GalleryCheckBox label="Selection of Menu Item2 suppressed" checked={suppress} onValueChanged={setSuppress}/>
    </>}
   </aside>}
  </div><div className="output"><span>Output</span><code className="event-output" aria-live="polite">{eventText}</code><span className="mode-output">{displayMode}</span></div>
  <GalleryExpander className="navigation-diagnostics"><GalleryExpanderHeader>SDK diagnostics</GalleryExpanderHeader><div className="navigation-diagnostics-content">
   <label className="field">PaneDisplayMode<GalleryComboBox aria-label={\`PaneDisplayMode \${index}\`} value={mode} onValueChanged={value=>chooseMode(value as PaneDisplayMode)}>{Object.values(PaneDisplayMode).map(value=><GalleryOption key={value}>{value}</GalleryOption>)}</GalleryComboBox></label>
   <GalleryCheckBox label="Cancel pane closing" checked={cancelClosing} onValueChanged={setCancelClosing}/>
   <label className="field">Sample width <span className="width-value">{width?\`\${width}px\`:'Auto'}</span><GallerySlider aria-label={\`Sample width \${index}\`} min={360} max={1120} value={width??800} onValueChanged={setWidth}/></label>
   {index===4&&<GalleryButton onClick={()=>setExtra(v=>v+1)}>Add category</GalleryButton>}
   <GalleryButton disabled={!history.back} onClick={()=>frame.current?.goBack()}>Frame Back</GalleryButton><GalleryButton disabled={!history.forward} onClick={()=>frame.current?.goForward()}>Frame Forward</GalleryButton>
   <GalleryButton className="reset" onClick={restore}>Reset sample</GalleryButton>
  </div></GalleryExpander>
  <GalleryExpander className="source"><GalleryExpanderHeader>Source code <span>React + TypeScript · Rust SDK</span></GalleryExpanderHeader>
   <div className="source-tabs"><GalleryButton onClick={()=>setSourceKind('tsx')}>TypeScript / React</GalleryButton><GalleryButton onClick={()=>setSourceKind('xaml')}>Official XAML reference</GalleryButton></div>
   <SourceCode language={sourceKind}>{sourceKind==='tsx'?source:official.samples[index].xaml}</SourceCode>
  </GalleryExpander></div>
 </section>;
}
`,j=E(),se=[...Array.from({length:7},(e,t)=>`SamplePage${t+1}`),`SampleSettingsPage`].map(e=>({key:e,contentResource:`gallery/${e}`}));function ce(e,t){if(t===`$settings`)return`SampleSettingsPage`;let n=Number(t.replace(`page`,``))||1;return e===1&&n===4&&(n=3),e===5&&n===6&&(n=5),`SamplePage${e===4?1:n}`}function M({index:d,theme:p,reducedMotion:b,reducedTransparency:E,sdk:D,hidden:O=!1}){let M=(0,A.useMemo)(()=>ne(d,p),[d]),[N,P]=(0,A.useState)(M.paneDisplayMode??h.Auto),[F,I]=(0,A.useState)(),[le,ue]=(0,A.useState)(0),[L,R]=(0,A.useState)(0),[z,B]=(0,A.useState)(M.isSettingsVisible??!0),[V,H]=(0,A.useState)(M.isBackButtonVisible!==r.Collapsed),[U,W]=(0,A.useState)(!1),[G,K]=(0,A.useState)(!0),[de,q]=(0,A.useState)(d===7?`Header`:M.header??null),[J,fe]=(0,A.useState)(`Pane Title`),[pe,me]=(0,A.useState)(!0),[he,ge]=(0,A.useState)(!1),[_e,ve]=(0,A.useState)(!1),[ye,be]=(0,A.useState)(M.selectionFollowsFocus??!1),[Y,xe]=(0,A.useState)(!1),[Se,Ce]=(0,A.useState)(!1),[we,Te]=(0,A.useState)(`Ready`),[Ee,De]=(0,A.useState)(``),[Oe,ke]=(0,A.useState)({back:!1,forward:!1}),[Ae,X]=(0,A.useState)(`tsx`),Z=(0,A.useRef)(null),je=(0,A.useRef)(null),Me=(0,A.useRef)(0),Q=(0,A.useRef)(null);(0,A.useEffect)(()=>{if(d!==2)return;let e=new ResizeObserver(([e])=>P(e.contentRect.width>=641?h.Top:h.LeftMinimal));return e.observe(Q.current),()=>e.disconnect()},[d]);let Ne=(0,A.useMemo)(()=>[...(M.items??[]).map(e=>e.id===`page2`?{...e,selectsOnInvoked:!Y}:e),...Array.from({length:L},(e,t)=>({id:`added${t}`,text:`New category ${t+1}`,icon:``}))],[M,L,Y]),{content:Pe,contentNode:Fe,...Ie}=M,Le={...Ie,items:Ne,theme:p,header:de,paneDisplayMode:N,isSettingsVisible:z,isBackButtonVisible:V?r.Visible:r.Collapsed,isBackEnabled:U,selectionFollowsFocus:ye,alwaysShowHeader:pe,paneTitle:d===7?J:``,expandedPaneMaterial:re(p),reducedMotion:b,reducedTransparency:E};function Re(e){if(Te(`${++Me.current} · ${e.kind}${e.itemId?` → ${e.itemId}`:``}`),e.kind!==s.SelectionChanged||!e.itemId)return;let t=ce(d,e.itemId);[0,4,6].includes(d)&&e.itemId!==`$settings`&&q(`Sample Page ${Number(e.itemId.replace(`page`,``))||1}`),Z.current?.navigate(t,{transition:e.recommendedNavigationTransition})}function ze(){P(M.paneDisplayMode??h.Auto),I(void 0),R(0),B(M.isSettingsVisible??!0),H(M.isBackButtonVisible!==r.Collapsed),W(!1),K(!0),q(d===7?`Header`:M.header??null),fe(`Pane Title`),me(!0),ge(!1),ve(!1),be(M.selectionFollowsFocus??!1),xe(!1),Ce(!1),Te(`Ready`),Me.current=0,ue(e=>e+1)}let $=e=>{P(e),je.current?.configure({isPaneOpen:e!==h.Top})};return(0,j.jsxs)(`section`,{className:`example`,id:`example-${d}`,hidden:O,children:[(0,j.jsx)(`h2`,{children:(0,j.jsx)(T,{children:ie[d]})}),(0,j.jsxs)(`div`,{className:`example-card`,children:[(0,j.jsxs)(`div`,{className:`example-live`,children:[(0,j.jsx)(`div`,{className:`viewport-scroll`,children:(0,j.jsx)(`div`,{ref:Q,className:`sample-viewport`,style:{width:F??`100%`},children:(0,j.jsx)(a,{className:`control-host`,theme:p,reducedMotion:b,reducedTransparency:E,style:{height:d===7?540:460},children:(0,j.jsxs)(i,{...Le,onReady:e=>{je.current=e,window.gallery.views[d]=e.asView()},onSnapshot:e=>De(e.displayMode),onEvent:Re,onPaneClosing:e=>{e.cancel=Se},children:[(0,j.jsx)(x,{pages:se,onReady:e=>{Z.current=e,window.gallery.sampleFrames??=[],window.gallery.sampleFrames[d]=e,e.onSnapshot(e=>ke(t=>t.back===!!e.backStack.length&&t.forward===!!e.forwardStack.length?t:{back:!!e.backStack.length,forward:!!e.forwardStack.length})),d!==7&&e.navigate(`SamplePage1`)}}),d===7&&(0,j.jsxs)(j.Fragment,{children:[(0,j.jsx)(f,{slot:e.AutoSuggestBox,children:(0,j.jsx)(te,{queryIcon:!0,accessibleName:`Search`,visible:G})}),(0,j.jsx)(f,{slot:e.PaneCustomContent,children:(0,j.jsx)(o,{text:`More info`,margin:[12,0,12,0],visible:he})}),(0,j.jsx)(f,{slot:e.PaneFooter,children:(0,j.jsxs)(ee,{orientation:N===h.Top?n.Horizontal:n.Vertical,visible:_e,children:[(0,j.jsx)(c,{accessibleName:`download`,iconSource:{kind:_.Symbol,symbol:t.Download}}),(0,j.jsx)(c,{accessibleName:`favorite`,iconSource:{kind:_.Symbol,symbol:t.Favorite}})]})})]})]})},le)})}),d>=5&&(0,j.jsxs)(`aside`,{className:`options`,children:[(0,j.jsx)(`h3`,{children:(0,j.jsx)(T,{children:`Options`})}),d<7?(0,j.jsxs)(j.Fragment,{children:[(0,j.jsx)(`span`,{children:d===5?`Pane position:`:`PanePosition:`}),(d===6?[h.Left,h.Top,h.LeftCompact]:[h.Left,h.Top]).map(e=>(0,j.jsx)(w,{name:`navigation-mode-${d}`,label:`${e} mode`,checked:N===e,onValueChanged:()=>$(e)},e))]}):(0,j.jsxs)(j.Fragment,{children:[(0,j.jsx)(v,{label:`Settings item visible`,checked:z,onValueChanged:B}),(0,j.jsx)(v,{label:`Back button visible`,checked:V,onValueChanged:H}),(0,j.jsx)(v,{label:`Back button enabled`,checked:U,onValueChanged:W}),(0,j.jsx)(v,{label:`AutoSuggestBox visible`,checked:G,onValueChanged:K}),(0,j.jsxs)(`label`,{className:`field`,children:[`Header:`,(0,j.jsx)(y,{"aria-label":`Header property`,value:de??``,onValueChanged:q})]}),(0,j.jsx)(v,{label:`Always show header`,checked:pe,onValueChanged:me}),(0,j.jsxs)(`label`,{className:`field`,children:[`PaneTitle:`,(0,j.jsx)(y,{"aria-label":`PaneTitle property`,value:J,onValueChanged:fe})]}),(0,j.jsx)(v,{label:`PaneCustomContent visible`,checked:he,onValueChanged:ge}),(0,j.jsx)(v,{label:`PaneFooter visible`,checked:_e,onValueChanged:ve}),(0,j.jsx)(`span`,{children:`PanePosition:`}),(0,j.jsx)(w,{name:`navigation-api-position`,label:`Left`,checked:N===h.Left,onValueChanged:()=>$(h.Left)}),(0,j.jsx)(w,{name:`navigation-api-position`,label:`Top`,checked:N===h.Top,onValueChanged:()=>$(h.Top)}),(0,j.jsx)(v,{label:`Keyboard SelectionFollowsFocus`,checked:ye,onValueChanged:be}),(0,j.jsx)(v,{label:`Selection of Menu Item2 suppressed`,checked:Y,onValueChanged:xe})]})]})]}),(0,j.jsxs)(`div`,{className:`output`,children:[(0,j.jsx)(`span`,{children:`Output`}),(0,j.jsx)(`code`,{className:`event-output`,"aria-live":`polite`,children:we}),(0,j.jsx)(`span`,{className:`mode-output`,children:Ee})]}),(0,j.jsxs)(m,{className:`navigation-diagnostics`,children:[(0,j.jsx)(l,{children:`SDK diagnostics`}),(0,j.jsxs)(`div`,{className:`navigation-diagnostics-content`,children:[(0,j.jsxs)(`label`,{className:`field`,children:[`PaneDisplayMode`,(0,j.jsx)(S,{"aria-label":`PaneDisplayMode ${d}`,value:N,onValueChanged:e=>$(e),children:Object.values(h).map(e=>(0,j.jsx)(g,{children:e},e))})]}),(0,j.jsx)(v,{label:`Cancel pane closing`,checked:Se,onValueChanged:Ce}),(0,j.jsxs)(`label`,{className:`field`,children:[`Sample width `,(0,j.jsx)(`span`,{className:`width-value`,children:F?`${F}px`:`Auto`}),(0,j.jsx)(u,{"aria-label":`Sample width ${d}`,min:360,max:1120,value:F??800,onValueChanged:I})]}),d===4&&(0,j.jsx)(C,{onClick:()=>R(e=>e+1),children:`Add category`}),(0,j.jsx)(C,{disabled:!Oe.back,onClick:()=>Z.current?.goBack(),children:`Frame Back`}),(0,j.jsx)(C,{disabled:!Oe.forward,onClick:()=>Z.current?.goForward(),children:`Frame Forward`}),(0,j.jsx)(C,{className:`reset`,onClick:ze,children:`Reset sample`})]})]}),(0,j.jsxs)(m,{className:`source`,children:[(0,j.jsxs)(l,{children:[`Source code `,(0,j.jsx)(`span`,{children:`React + TypeScript · Rust SDK`})]}),(0,j.jsxs)(`div`,{className:`source-tabs`,children:[(0,j.jsx)(C,{onClick:()=>X(`tsx`),children:`TypeScript / React`}),(0,j.jsx)(C,{onClick:()=>X(`xaml`),children:`Official XAML reference`})]}),(0,j.jsx)(k,{language:Ae,children:Ae===`tsx`?oe:ae.samples[d].xaml})]})]})]})}function N({page:e}){let[t,n]=(0,A.useState)(``),[r]=(0,A.useState)(()=>new Date().toLocaleTimeString());return(0,j.jsxs)(`div`,{className:`frame-sample-page`,children:[(0,j.jsx)(`h3`,{children:(0,j.jsx)(T,{children:e})}),(0,j.jsx)(`p`,{children:(0,j.jsxs)(T,{children:[`Created at `,r,`. Navigate away and return to compare the cache modes.`]})}),(0,j.jsx)(y,{"aria-label":`${e} note`,placeholder:`Type a note to test page state`,value:t,onValueChanged:n}),(0,j.jsx)(`p`,{children:(0,j.jsx)(T,{children:`The page keeps its input and scroll position while its instance is cached.`})}),(0,j.jsx)(`div`,{style:{height:420}}),(0,j.jsx)(`p`,{children:(0,j.jsxs)(T,{children:[`End of `,e]})})]})}function P({theme:e,reducedMotion:t,reducedTransparency:n}){let r=(0,A.useRef)(null),[i,a]=(0,A.useState)(null),[o,c]=(0,A.useState)(`Library`),[l,ee]=(0,A.useState)(O.Enabled),[u,d]=(0,A.useState)(D.Entrance),[f,m]=(0,A.useState)({back:!1,forward:!1}),[_,v]=(0,A.useState)(`Ready`),y=i?.content;return(0,j.jsxs)(`section`,{className:`example`,id:`navigation-frame-example`,children:[(0,j.jsx)(`h2`,{children:(0,j.jsx)(T,{children:`Page navigation, transitions and caching`})}),(0,j.jsx)(`div`,{className:`example-card`,children:(0,j.jsxs)(`div`,{className:`example-live`,children:[(0,j.jsxs)(`div`,{className:`navigation-frame-preview`,children:[(0,j.jsx)(p,{items:[`Library`,`Downloads`,`Account`].map((e,t)=>({id:e,text:e,icon:[``,``,``][t]})),selectedId:o,theme:e,paneDisplayMode:h.Auto,openPaneLength:200,compactModeThresholdWidth:400,expandedModeThresholdWidth:600,content:``,header:``,alwaysShowHeader:!1,isSettingsVisible:!1,isBackEnabled:f.back,hasExternalContent:!0,expandedPaneMaterial:re(e),reducedMotion:t,reducedTransparency:n,isBackdropAvailable:!1,onSnapshot:a,style:{height:380,position:`absolute`,inset:0,zIndex:2},onEvent:e=>{e.kind===s.BackRequested&&r.current?.goBack(),e.kind===s.ItemInvoked&&e.itemId&&r.current?.snapshot.current?.page!==e.itemId&&r.current?.navigate(e.itemId,{transition:u})}}),(0,j.jsx)(x,{cacheMode:l,reducedMotion:t,style:{position:`absolute`,left:y?.x??200,top:y?.y??0,right:0,bottom:0},onReady:e=>{r.current=e,e.onSnapshot(e=>m({back:!!e.backStack.length,forward:!!e.forwardStack.length})),e.navigate(`Library`)},onNavigating:e=>v(`${e.mode}: ${e.from?.page??`Start`} → ${e.to.page}`),onNavigated:e=>{c(e.entry.page),v(`${e.mode}: ${e.entry.page}`)},renderPage:e=>(0,j.jsx)(N,{page:e.page})})]}),(0,j.jsxs)(`aside`,{className:`options`,children:[(0,j.jsx)(`h3`,{children:(0,j.jsx)(T,{children:`Options`})}),(0,j.jsxs)(`label`,{className:`field`,children:[`NavigationCacheMode`,(0,j.jsx)(S,{"aria-label":`Page cache mode`,value:l,onValueChanged:e=>ee(e),children:Object.values(O).map(e=>(0,j.jsx)(g,{children:e},e))})]}),(0,j.jsxs)(`label`,{className:`field`,children:[`Transition`,(0,j.jsx)(S,{"aria-label":`Page transition`,value:u,onValueChanged:e=>d(e),children:Object.values(D).map(e=>(0,j.jsx)(g,{children:e},e))})]}),(0,j.jsx)(C,{disabled:!f.back,onClick:()=>r.current?.goBack(),children:`Back`}),(0,j.jsx)(C,{disabled:!f.forward,onClick:()=>r.current?.goForward(),children:`Forward`}),(0,j.jsx)(`p`,{className:`output`,role:`status`,children:(0,j.jsx)(T,{children:_})})]})]})}),(0,j.jsx)(k,{className:`frame-api-source`,children:`<NavigationView hasExternalContent onEvent={e => {
  if (e.kind === EventKind.ItemInvoked && e.itemId &&
      frame.snapshot.current?.page !== e.itemId)
    frame.navigate(e.itemId, { transition });
}} />
<Frame cacheMode={NavigationCacheMode.Enabled} cacheSize={10}
  onReady={setFrame} renderPage={entry => <MyPage page={entry.page} />} />`})]})}function F({sdk:e}){let[t,n]=(0,A.useState)(0),[r,i]=d(),[a,o]=(0,A.useState)(matchMedia(`(prefers-reduced-motion: reduce)`).matches),[s,c]=(0,A.useState)(matchMedia(`(prefers-reduced-transparency: reduce)`).matches);return(0,A.useEffect)(()=>{n(e.liveCount),window.gallery.appReadyMs=performance.now()},[e]),(0,A.useEffect)(()=>{document.documentElement.dataset.theme=r},[r]),(0,j.jsx)(j.Fragment,{children:(0,j.jsxs)(`main`,{id:`overview`,children:[(0,j.jsxs)(`div`,{className:`page-toolbar`,children:[(0,j.jsxs)(`span`,{className:`implementation-badge`,children:[(0,j.jsx)(`span`,{className:`status-dot`}),`Rust-owned controls`]}),(0,j.jsxs)(`div`,{className:`preferences`,children:[(0,j.jsx)(v,{id:`motion`,checked:a,onValueChanged:e=>o(e),label:(0,j.jsx)(j.Fragment,{children:`Reduce motion`})}),(0,j.jsx)(v,{id:`transparency`,checked:s,onValueChanged:e=>c(e),label:(0,j.jsx)(j.Fragment,{children:`Reduce transparency`})})]})]}),(0,j.jsxs)(`div`,{id:`samples`,children:[ie.map((t,n)=>(0,j.jsx)(M,{sdk:e,index:n,theme:r,reducedMotion:a,reducedTransparency:s,hidden:!1},t)),(0,j.jsx)(P,{theme:r,reducedMotion:a,reducedTransparency:s})]}),(0,j.jsxs)(`section`,{id:`baseline`,className:`baseline`,children:[(0,j.jsx)(`h2`,{children:(0,j.jsx)(T,{children:`Implementation baseline`})}),(0,j.jsx)(`p`,{children:(0,j.jsxs)(T,{children:[`Official Gallery`,` `,(0,j.jsx)(`code`,{children:`7360ac322414e118eadfb0c7c2f4ecc31a218f59`}),(0,j.jsx)(`br`,{}),`Windows App SDK `,(0,j.jsx)(`code`,{children:`2.5.4-experimental`}),` → WinUI`,` `,(0,j.jsx)(`code`,{children:`2.3.10-experimental`}),(0,j.jsx)(`br`,{}),`WinUI source tag `,(0,j.jsx)(`code`,{children:`winui3/release/2.5.4-experimental`}),` · `,(0,j.jsx)(`code`,{children:`7b127093`})]})}),(0,j.jsx)(`p`,{children:(0,j.jsxs)(T,{children:[`React mounts `,t,` real Rust controls through the public SDK. Native template composition, acrylic, top overflow measurement and full accessibility parity are tracked separately in the repository documentation. Button and shared-scene foundations are available in the sidebar. Other full Gallery controls, Charts and community TableView remain outside this batch.`]})})]}),(0,j.jsxs)(`footer`,{children:[`WinUI Rust Gallery`,(0,j.jsx)(`span`,{children:`NavigationView · v0.1.0`})]})]})})}export{F as NavigationPage};