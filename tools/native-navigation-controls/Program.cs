using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Markup;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Text.Json;
using Windows.Graphics;
using Windows.Graphics.Imaging;
using Windows.Storage;
using Windows.UI;
namespace NavigationControlsProbe;
static class Program {
 public static string Output=""; public static bool BaselineOnly; public static bool RefinementOnly; public static bool ButtonsOnly; public static bool CommandsOnly;
 [System.Runtime.InteropServices.DllImport("user32.dll")] static extern bool SetProcessDpiAwarenessContext(IntPtr value);
 [STAThread] static void Main(string[] args){
  BaselineOnly=args.Contains("--baseline-only");RefinementOnly=args.Contains("--refinement-only");ButtonsOnly=args.Contains("--buttons-only");CommandsOnly=args.Contains("--commands-only");Output=Path.GetFullPath(args[0]);Directory.CreateDirectory(Output);SetProcessDpiAwarenessContext(new IntPtr(-4));WinRT.ComWrappersSupport.InitializeComWrappers();
  try{Application.Start(_=>{SynchronizationContext.SetSynchronizationContext(new Microsoft.UI.Dispatching.DispatcherQueueSynchronizationContext(Microsoft.UI.Dispatching.DispatcherQueue.GetForCurrentThread()));new ProbeApplication();});}catch(Exception e){File.WriteAllText(Path.Combine(Output,"error.txt"),e.ToString());}
 }
}
public sealed partial class ProbeApplication:Application {
 Window window=null!;readonly Grid root=new(){Width=800,Height=450};readonly List<object> cases=[];
 static readonly JsonSerializerOptions Options=new(){WriteIndented=true};
 public ProbeApplication(){InitializeComponent();UnhandledException+=(_,e)=>{File.WriteAllText(Path.Combine(Program.Output,"error.txt"),e.Exception.ToString());e.Handled=true;Exit();};}
 protected override void OnLaunched(LaunchActivatedEventArgs args){window=new Window{Title="WinUI navigation controls fixed-SDK probe",Content=root};window.AppWindow.ResizeClient(new SizeInt32(800,450));root.Loaded+=async(_,_)=>await Run();window.Activate();}
 static SolidColorBrush Solid(string color){var n=Convert.ToUInt32(color.TrimStart('#'),16);return new(Color.FromArgb(255,(byte)(n>>16),(byte)(n>>8),(byte)n));}
 static IEnumerable<DependencyObject> Tree(DependencyObject e){yield return e;for(int i=0;i<VisualTreeHelper.GetChildrenCount(e);i++)foreach(var child in Tree(VisualTreeHelper.GetChild(e,i)))yield return child;}
 double[] Rect(FrameworkElement e){var r=e.TransformToVisual(root).TransformBounds(new(0,0,e.ActualWidth,e.ActualHeight));return[r.X,r.Y,r.Width,r.Height];}
 static double[] Thickness(Thickness t)=>[t.Left,t.Top,t.Right,t.Bottom];
 static object? Brush(Brush? b)=>b switch {SolidColorBrush s=>new{kind="solid",color=$"#{s.Color.R:X2}{s.Color.G:X2}{s.Color.B:X2}{s.Color.A:X2}",opacity=s.Opacity},LinearGradientBrush g=>new{kind="linearGradient",mappingMode=g.MappingMode.ToString(),spreadMethod=g.SpreadMethod.ToString(),from=new[]{g.StartPoint.X,g.StartPoint.Y},to=new[]{g.EndPoint.X,g.EndPoint.Y},relativeTransform=g.RelativeTransform is ScaleTransform scale?new[]{scale.ScaleX,0d,0d,scale.ScaleY,scale.CenterX*(1-scale.ScaleX),scale.CenterY*(1-scale.ScaleY)}:new[]{1d,0d,0d,1d,0d,0d},opacity=g.Opacity,stops=g.GradientStops.Select(stop=>new{offset=stop.Offset,color=$"#{stop.Color.R:X2}{stop.Color.G:X2}{stop.Color.B:X2}{stop.Color.A:X2}"}).ToArray()},AcrylicBrush a=>new{kind="acrylic",tint=$"#{a.TintColor.R:X2}{a.TintColor.G:X2}{a.TintColor.B:X2}",tintOpacity=a.TintOpacity,luminosityOpacity=a.TintLuminosityOpacity,fallback=$"#{a.FallbackColor.R:X2}{a.FallbackColor.G:X2}{a.FallbackColor.B:X2}",opacity=a.Opacity},_=>null};
 object Part(FrameworkElement e){var c=e as Control;var t=e as TextBlock;var b=e as Border;return new{type=e.GetType().Name,name=e.Name,rect=Rect(e),desired=new[]{e.DesiredSize.Width,e.DesiredSize.Height},margin=Thickness(e.Margin),padding=c!=null?Thickness(c.Padding):b!=null?Thickness(b.Padding):null,opacity=e.Opacity,visible=e.Visibility.ToString(),text=t?.Text??(c is ContentControl content?content.Content as string:null),baselineOffset=t?.BaselineOffset,fontSize=t?.FontSize??c?.FontSize,fontFamily=t?.FontFamily.Source??c?.FontFamily.Source,fontWeight=t?.FontWeight.Weight??c?.FontWeight.Weight,background=Brush(b?.Background??c?.Background??(e as Panel)?.Background),foreground=Brush(t?.Foreground??c?.Foreground),border=Brush(b?.BorderBrush??c?.BorderBrush),borderThickness=b!=null?Thickness(b.BorderThickness):c!=null?Thickness(c.BorderThickness):null};}
 async Task Image(string name){var bitmap=new RenderTargetBitmap();await bitmap.RenderAsync(root,800,450);var file=await StorageFile.GetFileFromPathAsync(Path.Combine(Program.Output,name+".png")).AsTask().ContinueWith(t=>t.IsCompletedSuccessfully?t.Result:null);if(file==null){var folder=await StorageFolder.GetFolderFromPathAsync(Program.Output);file=await folder.CreateFileAsync(name+".png",CreationCollisionOption.ReplaceExisting);}using var stream=await file.OpenAsync(FileAccessMode.ReadWrite);stream.Size=0;var encoder=await BitmapEncoder.CreateAsync(BitmapEncoder.PngEncoderId,stream);encoder.SetPixelData(BitmapPixelFormat.Bgra8,BitmapAlphaMode.Premultiplied,(uint)bitmap.PixelWidth,(uint)bitmap.PixelHeight,96,96,(await bitmap.GetPixelsAsync()).ToArray());await encoder.FlushAsync();}
 async Task Add(string theme,string kind,string name,FrameworkElement control,object props,string? state=null){
  if(Program.BaselineOnly&&kind!="BreadcrumbBar")return;
  root.Children.Clear();var canvas=new Canvas();root.Children.Add(canvas);canvas.Children.Add(control);Canvas.SetLeft(control,24);Canvas.SetTop(control,24);root.UpdateLayout();await Task.Delay(800);
  bool? applied=null;if(state!=null){var target=kind=="TreeView"?Tree(control).OfType<TreeViewItem>().FirstOrDefault() as Control:kind=="TabView"?Tree(control).OfType<TabViewItem>().FirstOrDefault():Tree(control).OfType<Button>().FirstOrDefault();if(target!=null)applied=VisualStateManager.GoToState(target,state,false);root.UpdateLayout();await Task.Delay(100);}
  var id=$"{theme}-{kind}-{name}";var partsBeforeRender=Tree(control).OfType<FrameworkElement>().Select(Part).ToArray();await Image(id);cases.Add(new{partsBeforeRender,id,theme,kind,props,state,stateApplied=applied,rect=Rect(control),desired=new[]{control.DesiredSize.Width,control.DesiredSize.Height},parts=Tree(control).OfType<FrameworkElement>().Select(Part).ToArray()});
 }
 static Grid Page(string text,string color){var g=new Grid{Background=Solid(color)};g.Children.Add(new TextBlock{Text=text,FontSize=24,HorizontalAlignment=HorizontalAlignment.Center,VerticalAlignment=VerticalAlignment.Center});return g;}
 static TreeView TreeControl(bool expanded,bool multi){var tree=new TreeView{Width=360,Height=260,SelectionMode=multi?TreeViewSelectionMode.Multiple:TreeViewSelectionMode.Single};var docs=new TreeViewNode{Content="Documents",IsExpanded=expanded};docs.Children.Add(new TreeViewNode{Content="ProjectProposal"});docs.Children.Add(new TreeViewNode{Content="BudgetReport"});tree.RootNodes.Add(docs);tree.RootNodes.Add(new TreeViewNode{Content="Pictures",IsExpanded=false,Children={new TreeViewNode{Content="Photo"}}});return tree;}
 static TabView Tabs(TabViewWidthMode mode=TabViewWidthMode.Equal,TabViewCloseButtonOverlayMode close=TabViewCloseButtonOverlayMode.Auto){var tabs=new TabView{Width=400,Height=240,TabWidthMode=mode,CloseButtonOverlayMode=close};foreach(var name in new[]{"Document 0","Long document 1","Document 2"})tabs.TabItems.Add(new TabViewItem{Header=name,IconSource=new SymbolIconSource{Symbol=Symbol.Document},Content=Page("Content "+tabs.TabItems.Count,"FFFFFF")});return tabs;}
 async Task RefineCloseButtons(){
  foreach(var theme in new[]{"Light","Dark"})foreach(var selected in new[]{true,false})foreach(var state in new[]{"Normal","ParentHover","CloseHover","ClosePressed","Disabled"}){
   root.RequestedTheme=Enum.Parse<ElementTheme>(theme);root.Background=Solid(theme=="Light"?"F3F3F3":"202020");root.Children.Clear();var canvas=new Canvas();root.Children.Add(canvas);var tabs=Tabs();canvas.Children.Add(tabs);Canvas.SetLeft(tabs,24);Canvas.SetTop(tabs,24);root.UpdateLayout();await Task.Delay(800);
   var target=(TabViewItem)tabs.TabItems[selected?0:1];var close=Tree(target).OfType<Button>().Single(b=>b.Name=="CloseButton");
   if(state=="Disabled"){target.IsEnabled=false;root.UpdateLayout();}
   else if(state!="Normal"){VisualStateManager.GoToState(target,selected?"SelectedPointerOver":"PointerOver",false);if(state!="ParentHover")VisualStateManager.GoToState(close,state=="ClosePressed"?"Pressed":"PointerOver",false);}
   root.UpdateLayout();await Task.Delay(40);var id=$"{theme}-TabClose-{(selected?"Selected":"Unselected")}-{state}";await Image(id);cases.Add(new{id,theme,selected,state,targetIndex=selected?0:1,rect=Rect(close),parts=Tree(target).OfType<FrameworkElement>().Select(Part).ToArray()});
  }
  File.WriteAllText(Path.Combine(Program.Output,"navigation-controls-close-metrics.json"),JsonSerializer.Serialize(new{dpi=root.XamlRoot.RasterizationScale,cases},Options));
 }
 async Task Run(){try{
  var animationMetrics=new Dictionary<string,object>();
  foreach(var effect in Enum.GetValues<Windows.UI.Core.AnimationMetrics.AnimationEffect>().Where(e=>new[]{"EnterPage","TransitionContent","Reposition","AddToList","DeleteFromList"}.Contains(e.ToString())))foreach(var target in Enum.GetValues<Windows.UI.Core.AnimationMetrics.AnimationEffectTarget>()){
   try{var d=new Windows.UI.Core.AnimationMetrics.AnimationDescription(effect,target);animationMetrics[$"{effect}-{target}"]=d.Animations.Select(a=>new{durationMs=a.Duration.TotalMilliseconds,delayMs=a.Delay.TotalMilliseconds,curve=new[]{a.Control1.X,a.Control1.Y,a.Control2.X,a.Control2.Y},type=a.Type.ToString(),values=a.GetType().GetProperties().Where(p=>p.Name.StartsWith("Initial")||p.Name.StartsWith("Final")||p.Name=="NormalizedOrigin").ToDictionary(p=>p.Name,p=>p.GetValue(a))}).ToArray();}catch(ArgumentException){}
  }
  var entrance=new Microsoft.UI.Xaml.Media.Animation.EntranceThemeTransition();
  File.WriteAllText(Path.Combine(Program.Output,"navigation-controls-animation-metrics.json"),JsonSerializer.Serialize(new{entranceDefaults=new{x=entrance.FromHorizontalOffset,y=entrance.FromVerticalOffset},effects=animationMetrics},Options));
  if(Program.CommandsOnly){await CommandControls();File.WriteAllText(Path.Combine(Program.Output,"complete.json"),"{}");Exit();return;}
  if(Program.ButtonsOnly){await RefinePagingButtons();File.WriteAllText(Path.Combine(Program.Output,"complete.json"),"{}");Exit();return;}
  if(Program.RefinementOnly){await RefineCloseButtons();File.WriteAllText(Path.Combine(Program.Output,"complete.json"),"{}");Exit();return;}
  var uiSettings=new Windows.UI.ViewManagement.UISettings();var light2=uiSettings.GetColorValue(Windows.UI.ViewManagement.UIColorType.AccentLight2);var dark2=uiSettings.GetColorValue(Windows.UI.ViewManagement.UIColorType.AccentDark2);
  File.WriteAllText(Path.Combine(Program.Output,"system-colors.json"),JsonSerializer.Serialize(new{recordedAtUtc=DateTime.UtcNow,light2=$"#{light2.R:X2}{light2.G:X2}{light2.B:X2}",dark2=$"#{dark2.R:X2}{dark2.G:X2}{dark2.B:X2}"},Options));
  var ir=JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"navigation-controls-template.json"))).RootElement;var palettes=new Dictionary<string,object>();var unresolved=new List<object>();
  foreach(var theme in new[]{"Light","Dark"}){
   root.RequestedTheme=Enum.Parse<ElementTheme>(theme);root.Background=Solid(theme=="Light"?"F3F3F3":"202020");var palette=new Dictionary<string,object>();
   foreach(var key in ir.GetProperty("brushes").EnumerateArray().Select(v=>v.GetString()!))try{var swatch=(Border)XamlReader.Load($"<Border xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\" Background=\"{{ThemeResource {key}}}\"/>");root.Children.Add(swatch);root.UpdateLayout();var value=Brush(swatch.Background);if(value!=null)palette[key]=value;else unresolved.Add(new{theme,key});root.Children.Remove(swatch);}catch(Exception e){unresolved.Add(new{theme,key,error=e.Message});}
   palettes[theme]=palette;
   foreach(var orientation in new[]{Orientation.Horizontal,Orientation.Vertical})foreach(var selected in new[]{0,1,2}){var f=new FlipView{Width=400,Height=270,SelectedIndex=selected,ItemsPanel=(ItemsPanelTemplate)XamlReader.Load($"<ItemsPanelTemplate xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\"><VirtualizingStackPanel Orientation=\"{orientation}\"/></ItemsPanelTemplate>")};foreach(var (text,color) in new[]{("Page 1","D9EAF7"),("Page 2","FFE5B4"),("Page 3","D5E8D4")})f.Items.Add(Page(text,color));f.SelectedIndex=selected;await Add(theme,"FlipView",$"{orientation}-{selected}",f,new{width=400,height=270,orientation=orientation.ToString(),selectedIndex=selected});}
   foreach(var orientation in new[]{Orientation.Horizontal,Orientation.Vertical})foreach(var selected in new[]{0,4,9}){var p=new PipsPager{NumberOfPages=10,SelectedPageIndex=selected,Orientation=orientation,PreviousButtonVisibility=PipsPagerButtonVisibility.Visible,NextButtonVisibility=PipsPagerButtonVisibility.Visible};await Add(theme,"PipsPager",$"{orientation}-{selected}",p,new{numberOfPages=10,selectedPageIndex=selected,orientation=orientation.ToString(),previousButtonVisibility="Visible",nextButtonVisibility="Visible"});}
   foreach(var state in new[]{"Normal","PointerOver","Pressed","Disabled"}){var p=new PipsPager{NumberOfPages=5,SelectedPageIndex=2,IsEnabled=state!="Disabled"};await Add(theme,"PipsPager",state,p,new{numberOfPages=5,selectedPageIndex=2,enabled=p.IsEnabled},state);}
   foreach(var width in new[]{600d,300d,120d}){var b=new BreadcrumbBar{Width=width,ItemsSource=new[]{"Home","Documents","Design","Northwind","Images","Folder1","Folder2","Folder3"}};await Add(theme,"BreadcrumbBar",$"Width-{width}",b,new{width});}
   foreach(var expanded in new[]{false,true})foreach(var multi in new[]{false,true}){var tree=TreeControl(expanded,multi);await Add(theme,"TreeView",$"{expanded}-{multi}",tree,new{width=360,height=260,expanded,multi});}
   var selectedTree=TreeControl(true,false);selectedTree.SelectedNode=selectedTree.RootNodes[0].Children[0];await Add(theme,"TreeView","Selected",selectedTree,new{width=360,height=260,expanded=true,multi=false,selected="ProjectProposal"});
   foreach(var mode in new[]{TabViewWidthMode.Equal,TabViewWidthMode.SizeToContent,TabViewWidthMode.Compact}){var tabs=Tabs(mode);await Add(theme,"TabView",mode.ToString(),tabs,new{width=400,height=240,tabWidthMode=mode.ToString()});}
   foreach(var state in new[]{"PointerOver","Pressed","Disabled"}){var tabs=Tabs();((TabViewItem)tabs.TabItems[0]).IsEnabled=state!="Disabled";await Add(theme,"TabView",state,tabs,new{width=400,height=240,state},state);}
  }
  File.WriteAllText(Path.Combine(Program.Output,"navigation-controls-palettes.json"),JsonSerializer.Serialize(palettes,Options));File.WriteAllText(Path.Combine(Program.Output,"navigation-controls-metrics.json"),JsonSerializer.Serialize(new{dpi=root.XamlRoot.RasterizationScale,cases,unresolved},Options));File.WriteAllText(Path.Combine(Program.Output,"complete.json"),"{}");
 }catch(Exception e){File.WriteAllText(Path.Combine(Program.Output,"error.txt"),e.ToString());}Exit();}
}
