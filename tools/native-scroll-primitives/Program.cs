using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Text.Json;
using Windows.Graphics;
using Windows.Graphics.Imaging;
using Windows.Storage;
using Windows.UI;
namespace ScrollPrimitivesProbe;
static class Program {
 public static string Output=""; public static bool DefaultsOnly;
 [System.Runtime.InteropServices.DllImport("user32.dll")]static extern bool SetProcessDpiAwarenessContext(IntPtr value);
 [STAThread]static void Main(string[] args){DefaultsOnly=args.Contains("--defaults-only");Output=Path.GetFullPath(args[0]);Directory.CreateDirectory(Output);SetProcessDpiAwarenessContext(new(-4));WinRT.ComWrappersSupport.InitializeComWrappers();try{Application.Start(_=>{SynchronizationContext.SetSynchronizationContext(new Microsoft.UI.Dispatching.DispatcherQueueSynchronizationContext(Microsoft.UI.Dispatching.DispatcherQueue.GetForCurrentThread()));new ProbeApplication();});}catch(Exception e){File.WriteAllText(Path.Combine(Output,"error.txt"),e.ToString());}}
}
public sealed partial class ProbeApplication:Application {
 Window window=null!;readonly Grid root=new(){Width=800,Height=600};readonly List<object> rows=[];
 public ProbeApplication(){InitializeComponent();UnhandledException+=(_,e)=>{File.WriteAllText(Path.Combine(Program.Output,"error.txt"),e.Exception.ToString());e.Handled=true;Exit();};}
 protected override void OnLaunched(LaunchActivatedEventArgs args){window=new Window{Title="Fixed-SDK content host probe",Content=root};window.AppWindow.ResizeClient(new SizeInt32(800,600));root.Loaded+=async(_,_)=>await Run();window.Activate();}
 static IEnumerable<DependencyObject> Tree(DependencyObject e){yield return e;for(int i=0;i<VisualTreeHelper.GetChildrenCount(e);i++)foreach(var c in Tree(VisualTreeHelper.GetChild(e,i)))yield return c;}
 static SolidColorBrush Solid(byte r,byte g,byte b)=>new(Color.FromArgb(255,r,g,b));
 object Part(FrameworkElement e,FrameworkElement origin){var r=e.TransformToVisual(origin).TransformBounds(new(0,0,e.ActualWidth,e.ActualHeight));var c=e as Control;var t=e as TextBlock;return new{type=e.GetType().Name,name=e.Name,rect=new[]{r.X,r.Y,r.Width,r.Height},desired=new[]{e.DesiredSize.Width,e.DesiredSize.Height},text=t?.Text??(e as MenuBarItem)?.Title??(e as AppBarButton)?.Label,enabled=c?.IsEnabled};}
 async Task Image(FrameworkElement target,string name){var bmp=new RenderTargetBitmap();await bmp.RenderAsync(target);var folder=await StorageFolder.GetFolderFromPathAsync(Program.Output);var file=await folder.CreateFileAsync(name+".png",CreationCollisionOption.ReplaceExisting);using var stream=await file.OpenAsync(FileAccessMode.ReadWrite);var encoder=await BitmapEncoder.CreateAsync(BitmapEncoder.PngEncoderId,stream);encoder.SetPixelData(BitmapPixelFormat.Bgra8,BitmapAlphaMode.Premultiplied,(uint)bmp.PixelWidth,(uint)bmp.PixelHeight,96,96,(await bmp.GetPixelsAsync()).ToArray());await encoder.FlushAsync();}
 async Task Capture(FrameworkElement target,string theme,string kind,string state){await Task.Delay(180);root.UpdateLayout();await Image(target,$"{theme}-{kind}-{state}");rows.Add(new{theme,kind,state,dpr=root.XamlRoot.RasterizationScale,rect=new[]{target.ActualWidth,target.ActualHeight},parts=Tree(target).OfType<FrameworkElement>().Select(e=>Part(e,target)).ToArray()});}
 FrameworkElement Box(string name,double w,double h)=>new Border{Name=name,Width=w,Height=h,Background=Solid(0,120,215)};
 async Task Run(){try{
 var defaultBar=new ScrollBar();var defaultThumb=new Thumb();var defaultSlider=new Slider();var defaultPresenter=new ScrollContentPresenter();
 File.WriteAllText(Path.Combine(Program.Output,"defaults.json"),JsonSerializer.Serialize(new{scrollBar=new{minimum=defaultBar.Minimum,maximum=defaultBar.Maximum,smallChange=defaultBar.SmallChange,largeChange=defaultBar.LargeChange,viewportSize=defaultBar.ViewportSize,orientation=defaultBar.Orientation.ToString(),indicatorMode=defaultBar.IndicatorMode.ToString(),isTabStop=defaultBar.IsTabStop},thumb=new{isTabStop=defaultThumb.IsTabStop},slider=new{tickFrequency=defaultSlider.TickFrequency,tickPlacement=defaultSlider.TickPlacement.ToString()},scrollContentPresenter=new{horizontalContentAlignment=defaultPresenter.HorizontalContentAlignment.ToString(),verticalContentAlignment=defaultPresenter.VerticalContentAlignment.ToString()}},new JsonSerializerOptions{WriteIndented=true}));
 if(Program.DefaultsOnly){Exit();return;}

 foreach(var theme in new[]{ElementTheme.Light,ElementTheme.Dark}){
  root.RequestedTheme=theme;
  foreach(var orientation in new[]{Orientation.Vertical,Orientation.Horizontal})foreach(var value in new[]{0d,25d,100d})foreach(var disabled in new[]{false,true}){
   var bar=new ScrollBar{Orientation=orientation,Minimum=0,Maximum=100,Value=value,ViewportSize=25,IndicatorMode=ScrollingIndicatorMode.MouseIndicator,IsEnabled=!disabled,HorizontalAlignment=HorizontalAlignment.Left,VerticalAlignment=VerticalAlignment.Top};if(orientation==Orientation.Vertical){bar.Height=200;}else{bar.Width=200;}
   root.Children.Clear();root.Children.Add(bar);await Capture(bar,theme.ToString(),"ScrollBar",orientation+"-"+value+(disabled?"-Disabled":"-Normal"));
  }
  foreach(var state in new[]{"Normal","PointerOver","Pressed","Disabled"}){var thumb=new Thumb{Width=40,Height=24,IsEnabled=state!="Disabled",HorizontalAlignment=HorizontalAlignment.Left,VerticalAlignment=VerticalAlignment.Top};root.Children.Clear();root.Children.Add(thumb);await Task.Delay(80);VisualStateManager.GoToState(thumb,state,false);await Capture(thumb,theme.ToString(),"Thumb",state);}
  foreach(var orientation in new[]{Orientation.Horizontal,Orientation.Vertical})foreach(var frequency in new[]{0d,20d,1d}){var slider=new Slider{Orientation=orientation,Minimum=0,Maximum=100,TickFrequency=frequency,TickPlacement=TickPlacement.Outside,HorizontalAlignment=HorizontalAlignment.Left,VerticalAlignment=VerticalAlignment.Top};if(orientation==Orientation.Horizontal){slider.Width=200;}else{slider.Height=200;}root.Children.Clear();root.Children.Add(slider);await Capture(slider,theme.ToString(),"TickBar",orientation+"-"+frequency);}
  var list=new ListView{Header="Header",Footer="Footer",Width=200,HorizontalAlignment=HorizontalAlignment.Left,VerticalAlignment=VerticalAlignment.Top};list.Items.Add("One");list.Items.Add("Two");root.Children.Clear();root.Children.Add(list);await Task.Delay(100);var ip=Tree(list).OfType<ItemsPresenter>().First();await Capture(ip,theme.ToString(),"ItemsPresenter","HeaderFooter");
  var scroll=new ScrollViewer{Width=200,Height=120,HorizontalScrollBarVisibility=ScrollBarVisibility.Hidden,VerticalScrollBarVisibility=ScrollBarVisibility.Hidden,HorizontalScrollMode=ScrollMode.Enabled,VerticalScrollMode=ScrollMode.Enabled,HorizontalAlignment=HorizontalAlignment.Left,VerticalAlignment=VerticalAlignment.Top,Content=new Border{Width=400,Height=300,Background=Solid(0,120,215)}};root.Children.Clear();root.Children.Add(scroll);await Task.Delay(150);scroll.ChangeView(50,80,1,true);await Task.Delay(80);var presenter=Tree(scroll).OfType<ScrollContentPresenter>().First();await Capture(presenter,theme.ToString(),"ScrollContentPresenter","Offset50-80");
 }
 File.WriteAllText(Path.Combine(Program.Output,"results.json"),JsonSerializer.Serialize(new{sdk="Microsoft.WindowsAppSDK.WinUI/2.3.10-experimental",scope="Independent same-SDK static parts; not Store Gallery Composition equivalence",rows},new JsonSerializerOptions{WriteIndented=true}));Exit();
 }catch(Exception e){File.WriteAllText(Path.Combine(Program.Output,"error.txt"),e.ToString());Exit();}}
}
