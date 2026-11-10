import {StrictMode,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {WinUIProvider,SceneView,Canvas,StackPanel,Grid,Button,SplitButton,ToggleSplitButton,AppBarButton,AppBarToggleButton,DropDownButton,Flyout,MenuFlyout,ToolTip,CommandBarFlyout,MenuFlyoutItem,TextBlock,TextBox,ToggleSwitch,Expander,InfoBar,SplitView,TeachingTip,ItemsPresenter,RefreshContainer,ScrollViewer,ContentControl,Rectangle,TickBar,Slider,UICommand,GridView,type Scene} from 'winui-wasm/react';
declare global {interface Window {declarativeFixture:{scene?:Scene;actions:number;};}}
const state=window.declarativeFixture={actions:0} as Window['declarativeFixture'];
const action=()=>{state.actions++;};
const item=(name:string)=><MenuFlyout menuItems={[{id:'run',text:name}]} onItemInvoked={action}/>;
function FlyoutOwners(){return <Canvas>
  <SplitButton accessibleName="Split declaration" canvasLeft={40} canvasTop={80}><SplitButton.Flyout>{item('Split command')}</SplitButton.Flyout></SplitButton>
  <ToggleSplitButton accessibleName="Toggle split declaration" canvasLeft={260} canvasTop={80}><ToggleSplitButton.Flyout>{item('Toggle split command')}</ToggleSplitButton.Flyout></ToggleSplitButton>
  <AppBarButton label="App action" canvasLeft={40} canvasTop={180}><AppBarButton.Flyout>{item('App command')}</AppBarButton.Flyout></AppBarButton>
  <AppBarToggleButton label="Toggle action" canvasLeft={260} canvasTop={180} flyout={item('Toggle command')}/>
  <DropDownButton text="Dropdown declaration" canvasLeft={440} canvasTop={180}><DropDownButton.Flyout>{item('Dropdown command')}</DropDownButton.Flyout></DropDownButton>
  <Button text="Command declaration" canvasLeft={40} canvasTop={300}><Button.Flyout><CommandBarFlyout primaryCommands={[{id:'run',label:'Owned command'}]} onCommandInvoked={action}/></Button.Flyout></Button>
  <Button text="Simple close" canvasLeft={260} canvasTop={300}><Button.Flyout><Flyout><Button text="Declarative confirm" closeFlyout onClick={action}/></Flyout></Button.Flyout></Button>
</Canvas>;}
function ToolTips(){return <StackPanel spacing={24} width={340}>
  <TextBox accessibleName="Attached input"><TextBox.ToolTip><ToolTip text="Input help"/></TextBox.ToolTip></TextBox>
  <ToggleSwitch accessibleName="Attached switch" toolTip={<ToolTip text="Switch help"/>}/>
  <Button text="Attached button"><Button.ToolTip><ToolTip text="Button help"/></Button.ToolTip></Button>
</StackPanel>;}
function Contexts(){return <Canvas>
  <Button text="Context owner" canvasLeft={40} canvasTop={40}><Button.ContextFlyout><MenuFlyout><MenuFlyoutItem text="Context action" onClick={action}/></MenuFlyout></Button.ContextFlyout></Button>
  <TextBox accessibleName="Context input" width={260} canvasLeft={40} canvasTop={120} contextFlyout={<MenuFlyout><MenuFlyoutItem text="Input context action" onClick={action}/></MenuFlyout>}/>
  <Rectangle width={120} height={60} canvasLeft={40} canvasTop={220} fill="#00aa00" contextFlyout={<MenuFlyout><MenuFlyoutItem text="Shape context action" onClick={action}/></MenuFlyout>}/>
</Canvas>;}
function Slots(){return <StackPanel spacing={8} width={600}>
  <Expander isExpanded><Expander.Header><TextBlock text="Declared header"/></Expander.Header><Expander.Content><Button text="Expanded content"/></Expander.Content></Expander>
  <InfoBar isOpen title="Declared InfoBar"><InfoBar.ActionButton><Button text="Declared action" onClick={action}/></InfoBar.ActionButton></InfoBar>
  <SplitView isPaneOpen openPaneLength={160} height={100}><SplitView.Pane><Button text="Declared pane"/></SplitView.Pane><SplitView.Content><Button text="Declared content"/></SplitView.Content></SplitView>
  <ItemsPresenter><ItemsPresenter.Header>Declared items header</ItemsPresenter.Header><StackPanel><Button text="Declared item"/></StackPanel><ItemsPresenter.Footer>Declared items footer</ItemsPresenter.Footer></ItemsPresenter>
  <TeachingTip><TeachingTip.HeroContent><TextBlock text="Declared hero"/></TeachingTip.HeroContent></TeachingTip>
  <ContentControl><ContentControl.Content><Button text="Declared control content"/></ContentControl.Content></ContentControl>
  <RefreshContainer height={100}><RefreshContainer.VisualizerContent><TextBlock text="Declared refresh visual"/></RefreshContainer.VisualizerContent><ScrollViewer><StackPanel><TextBlock text="Refresh body"/></StackPanel></ScrollViewer></RefreshContainer>
</StackPanel>;}
function NamedReferences(){
 const [mounted,setMounted]=useState(true),[revision,setRevision]=useState(0);
 return <StackPanel spacing={12} width={400}>
  <TickBar name="named-ticks" source="named-slider" width={320} height={4}/>
  {mounted&&<Slider name="named-slider" value={30+revision} width={320}/>}
  <Button text="Toggle named target" onClick={()=>setMounted(value=>!value)}/>
  <Button text="Refresh declaration" onClick={()=>setRevision(value=>value+1)}/>
  <Button text="Named anchor" name="named-anchor"/>
  <TeachingTip target="named-anchor" title="Named teaching tip"/>
  <UICommand name="named-command" label="Named action" onExecuteRequested={action}/>
  <AppBarButton command="named-command"/>
  <TextBlock text={`Revision ${revision}`}/>
 </StackPanel>;
}
function CollectionFlyout(){return <Button text="Choose item"><Button.Flyout><Flyout>
 <GridView closeFlyout width={240} height={120} items={['First','Second']} isItemClickEnabled onItemClick={action}/>
</Flyout></Button.Flyout></Button>;}
const mode=new URLSearchParams(location.search).get('mode');
createRoot(document.getElementById('root')!).render(<StrictMode><WinUIProvider><SceneView reducedMotion style={{width:900,height:800}} onReady={scene=>{state.scene=scene;}}>{mode==='names'?<NamedReferences/>:mode==='collection'?<CollectionFlyout/>:mode==='tips'?<ToolTips/>:mode==='context'?<Contexts/>:mode==='slots'?<Slots/>:<FlyoutOwners/>}</SceneView></WinUIProvider></StrictMode>);
