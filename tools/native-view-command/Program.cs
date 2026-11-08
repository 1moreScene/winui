using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Input;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Text.Json;
using Windows.Graphics;
using Windows.Graphics.Imaging;
using Windows.Storage;
using Windows.UI;
namespace ViewCommandProbe;
static class Program {
 public static string Output="";
 [STAThread] static void Main(string[] args) {
  Output=Path.GetFullPath(args[0]);Directory.CreateDirectory(Output);
  WinRT.ComWrappersSupport.InitializeComWrappers();
  try {Application.Start(_=>{SynchronizationContext.SetSynchronizationContext(new Microsoft.UI.Dispatching.DispatcherQueueSynchronizationContext(Microsoft.UI.Dispatching.DispatcherQueue.GetForCurrentThread()));new ProbeApplication();});}
  catch(Exception e){File.WriteAllText(Path.Combine(Output,"error.txt"),e.ToString());}
 }
}
public sealed partial class ProbeApplication:Application {
 Window window=null!; readonly Grid root=new(){Width=640,Height=360}; readonly List<object> cases=[];
 public ProbeApplication(){InitializeComponent();UnhandledException+=(_,e)=>{File.WriteAllText(Path.Combine(Program.Output,"error.txt"),e.Exception.ToString());e.Handled=true;Exit();};}
 protected override void OnLaunched(LaunchActivatedEventArgs args){window=new Window{Title="Fixed SDK view / command probe",Content=root};window.AppWindow.ResizeClient(new SizeInt32(640,360));root.Loaded+=async(_,_)=>await Run();window.Activate();}
 static IEnumerable<DependencyObject> Tree(DependencyObject o){yield return o;for(int i=0;i<VisualTreeHelper.GetChildrenCount(o);i++)foreach(var c in Tree(VisualTreeHelper.GetChild(o,i)))yield return c;}
 object Rect(FrameworkElement e){var p=e.TransformToVisual(root).TransformPoint(new(0,0));return new{x=p.X,y=p.Y,width=e.ActualWidth,height=e.ActualHeight};}
 static SolidColorBrush Solid(byte r,byte g,byte b)=>new(Color.FromArgb(255,r,g,b));
 static Grid Page(string text,byte r,byte g,byte b){var p=new Grid{Background=Solid(r,g,b)};p.Children.Add(new TextBlock{Text=text,Margin=new Thickness(12)});return p;}
 async Task Add(string theme,string kind,string name,FrameworkElement control,object props){
  root.Children.Clear();var canvas=new Canvas();root.Children.Add(canvas);canvas.Children.Add(control);Canvas.SetLeft(control,24);Canvas.SetTop(control,24);root.UpdateLayout();await Task.Delay(230);
  var id=$"{theme}-{kind}-{name}";var parts=Tree(control).OfType<FrameworkElement>().Select(e=>new{type=e.GetType().Name,name=e.Name,rect=Rect(e),visible=e.Visibility.ToString(),opacity=e.Opacity}).ToArray();
  var bitmap=new RenderTargetBitmap();await bitmap.RenderAsync(root,640,360);var folder=await StorageFolder.GetFolderFromPathAsync(Program.Output);var file=await folder.CreateFileAsync(id+".png",CreationCollisionOption.ReplaceExisting);using(var stream=await file.OpenAsync(FileAccessMode.ReadWrite)){var enc=await BitmapEncoder.CreateAsync(BitmapEncoder.PngEncoderId,stream);enc.SetPixelData(BitmapPixelFormat.Bgra8,BitmapAlphaMode.Premultiplied,(uint)bitmap.PixelWidth,(uint)bitmap.PixelHeight,96,96,(await bitmap.GetPixelsAsync()).ToArray());await enc.FlushAsync();}
  cases.Add(new{id,theme,kind,props,rect=Rect(control),parts});
 }
 async Task Run(){try{
  var themeAnimations=new Dictionary<string,object>();
  foreach(var effect in new[]{Windows.UI.Core.AnimationMetrics.AnimationEffect.FadeIn,Windows.UI.Core.AnimationMetrics.AnimationEffect.FadeOut})foreach(var target in Enum.GetValues<Windows.UI.Core.AnimationMetrics.AnimationEffectTarget>()){
   try {var desc=new Windows.UI.Core.AnimationMetrics.AnimationDescription(effect,target);
   themeAnimations[effect+"-"+target]=desc.Animations.Select(a=>new{type=a.Type.ToString(),durationMs=a.Duration.TotalMilliseconds,delayMs=a.Delay.TotalMilliseconds,curve=new[]{a.Control1.X,a.Control1.Y,a.Control2.X,a.Control2.Y},initial=(a as Windows.UI.Core.AnimationMetrics.OpacityAnimation)?.InitialOpacity,final=(a as Windows.UI.Core.AnimationMetrics.OpacityAnimation)?.FinalOpacity}).ToArray();}catch(ArgumentException){}
  }
  File.WriteAllText(Path.Combine(Program.Output,"theme-animations.json"),JsonSerializer.Serialize(themeAnimations,new JsonSerializerOptions{WriteIndented=true}));
  var presets=new Dictionary<string,object>();
  foreach(var kind in Enum.GetValues<StandardUICommandKind>()) {var c=new StandardUICommand(kind);presets[kind.ToString()]=new{label=c.Label,description=c.Description,symbol=(c.IconSource as SymbolIconSource)?.Symbol.ToString(),accelerators=c.KeyboardAccelerators.Select(a=>new{key=a.Key.ToString(),modifiers=a.Modifiers.ToString().Split(", ").Where(m=>m!="None").Select(m=>m=="Menu"?"Alt":m).ToArray()}).ToArray()};}
  var x=new XamlUICommand();bool executed=false;x.ExecuteRequested+=(_,_)=>executed=true;var initial=x.CanExecute(null);x.Execute(null);
  var overridden=new StandardUICommand(StandardUICommandKind.Save){Label="Custom"};overridden.Kind=StandardUICommandKind.Copy;
  File.WriteAllText(Path.Combine(Program.Output,"command-defaults.json"),JsonSerializer.Serialize(new{standardCommands=presets,xamlUICommand=new{canExecute=initial,executed},overrideAfterKindChange=overridden.Label},new JsonSerializerOptions{WriteIndented=true}));
  foreach(var theme in new[]{"Light","Dark"}){
   root.RequestedTheme=theme=="Light"?ElementTheme.Light:ElementTheme.Dark;root.Background=theme=="Light"?Solid(255,255,255):Solid(32,32,32);
   foreach(var mode in Enum.GetValues<SplitViewDisplayMode>())foreach(var side in Enum.GetValues<SplitViewPanePlacement>())foreach(var open in new[]{false,true}){
    var c=new SplitView{Width=480,Height=240,DisplayMode=mode,PanePlacement=side,IsPaneOpen=open,OpenPaneLength=160,CompactPaneLength=40,Pane=Page("Pane",220,230,240),Content=Page("Content",240,230,220)};
    await Add(theme,"SplitView",$"{mode}-{side}-{open}",c,new{width=480,height=240,displayMode=mode.ToString(),panePlacement=side.ToString(),isPaneOpen=open,openPaneLength=160,compactPaneLength=40});
   }
   foreach(var active in new[]{false,true}){var c=new SemanticZoom{Width=480,Height=240,IsZoomedInViewActive=active,ZoomedInView=new GridView{ItemsSource=new[]{"A1","A2","B1"}},ZoomedOutView=new GridView{ItemsSource=new[]{"A","B"}}};await Add(theme,"SemanticZoom",active.ToString(),c,new{isZoomedInViewActive=active});}
   foreach(var shift in new[]{-80d,0d,80d}){var c=new ParallaxView{Width=240,Height=160,HorizontalShift=shift,VerticalShift=40,Child=Page("Background",200,220,240)};await Add(theme,"ParallaxView",shift.ToString(),c,new{horizontalShift=shift,verticalShift=40});}
  }
  File.WriteAllText(Path.Combine(Program.Output,"complete.json"),JsonSerializer.Serialize(new{cases,framework=typeof(SplitView).Assembly.FullName},new JsonSerializerOptions{WriteIndented=true}));Exit();
 }catch(Exception e){File.WriteAllText(Path.Combine(Program.Output,"error.txt"),e.ToString());Exit();}}
}

