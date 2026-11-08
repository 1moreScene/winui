using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Text.Json;
using Windows.Graphics;
using Windows.Graphics.Imaging;
using Windows.Storage;
using Windows.UI;
namespace ContentHostsProbe;
static class Program {
 public static string Output="";
 [System.Runtime.InteropServices.DllImport("user32.dll")]static extern bool SetProcessDpiAwarenessContext(IntPtr value);
 [STAThread]static void Main(string[] args){Output=Path.GetFullPath(args[0]);Directory.CreateDirectory(Output);SetProcessDpiAwarenessContext(new(-4));WinRT.ComWrappersSupport.InitializeComWrappers();try{Application.Start(_=>{SynchronizationContext.SetSynchronizationContext(new Microsoft.UI.Dispatching.DispatcherQueueSynchronizationContext(Microsoft.UI.Dispatching.DispatcherQueue.GetForCurrentThread()));new ProbeApplication();});}catch(Exception e){File.WriteAllText(Path.Combine(Output,"error.txt"),e.ToString());}}
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
 foreach(var theme in new[]{ElementTheme.Light,ElementTheme.Dark}){
  root.RequestedTheme=theme;
  foreach(var kind in new[]{"ContentControl","ContentPresenter","UserControl","Page","Frame"})foreach(var align in new[]{"Default","LeftTop","Center","RightBottom","Stretch"}){
   FrameworkElement host=kind switch{"ContentControl"=>new ContentControl(),"ContentPresenter"=>new ContentPresenter(),"UserControl"=>new UserControl(),"Page"=>new Page(),_=>new Frame()};
   host.Width=200;host.Height=120;host.HorizontalAlignment=HorizontalAlignment.Left;host.VerticalAlignment=VerticalAlignment.Top;
   var child=new Border{Name="ContentChild",Width=40,Height=20,Background=Solid(0,120,215)};
   if(host is ContentPresenter cp){cp.Content=child;cp.Padding=new(6,4,10,8);cp.BorderThickness=new(2);cp.BorderBrush=Solid(90,90,90);if(align!="Default"){cp.HorizontalContentAlignment=align switch{"Center"=>HorizontalAlignment.Center,"RightBottom"=>HorizontalAlignment.Right,"Stretch"=>HorizontalAlignment.Stretch,_=>HorizontalAlignment.Left};cp.VerticalContentAlignment=align switch{"Center"=>VerticalAlignment.Center,"RightBottom"=>VerticalAlignment.Bottom,"Stretch"=>VerticalAlignment.Stretch,_=>VerticalAlignment.Top};}}
   else if(host is ContentControl cc){cc.Content=child;cc.Padding=new(6,4,10,8);cc.BorderThickness=new(2);cc.BorderBrush=Solid(90,90,90);if(align!="Default"){cc.HorizontalContentAlignment=align switch{"Center"=>HorizontalAlignment.Center,"RightBottom"=>HorizontalAlignment.Right,"Stretch"=>HorizontalAlignment.Stretch,_=>HorizontalAlignment.Left};cc.VerticalContentAlignment=align switch{"Center"=>VerticalAlignment.Center,"RightBottom"=>VerticalAlignment.Bottom,"Stretch"=>VerticalAlignment.Stretch,_=>VerticalAlignment.Top};}}
   else if(host is UserControl uc){uc.Content=child;}
   root.Children.Clear();root.Children.Add(host);await Task.Delay(80);root.UpdateLayout();await Capture(host,theme.ToString(),kind,align);
  }
 }
 File.WriteAllText(Path.Combine(Program.Output,"results.json"),JsonSerializer.Serialize(new{sdk="Microsoft.WindowsAppSDK.WinUI/2.3.10-experimental",scope="Independent same-SDK static geometry, not Store Gallery Composition parity",rows},new JsonSerializerOptions{WriteIndented=true}));Exit();
 }catch(Exception e){File.WriteAllText(Path.Combine(Program.Output,"error.txt"),e.ToString());Exit();}}
}
