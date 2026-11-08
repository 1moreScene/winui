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
namespace MenuLayoutProbe;
static class Program {
 public static string Output="";
 [System.Runtime.InteropServices.DllImport("user32.dll")]static extern bool SetProcessDpiAwarenessContext(IntPtr value);
 [STAThread]static void Main(string[] args){Output=Path.GetFullPath(args[0]);Directory.CreateDirectory(Output);SetProcessDpiAwarenessContext(new(-4));WinRT.ComWrappersSupport.InitializeComWrappers();try{Application.Start(_=>{SynchronizationContext.SetSynchronizationContext(new Microsoft.UI.Dispatching.DispatcherQueueSynchronizationContext(Microsoft.UI.Dispatching.DispatcherQueue.GetForCurrentThread()));new ProbeApplication();});}catch(Exception e){File.WriteAllText(Path.Combine(Output,"error.txt"),e.ToString());}}
}
public sealed partial class ProbeApplication:Application {
 Window window=null!;readonly Grid root=new(){Width=800,Height=600};readonly List<object> rows=[];
 public ProbeApplication(){InitializeComponent();UnhandledException+=(_,e)=>{File.WriteAllText(Path.Combine(Program.Output,"error.txt"),e.Exception.ToString());e.Handled=true;Exit();};}
 protected override void OnLaunched(LaunchActivatedEventArgs args){window=new Window{Title="Fixed-SDK menu and layout probe",Content=root};window.AppWindow.ResizeClient(new SizeInt32(800,600));root.Loaded+=async(_,_)=>await Run();window.Activate();}
 static IEnumerable<DependencyObject> Tree(DependencyObject e){yield return e;for(int i=0;i<VisualTreeHelper.GetChildrenCount(e);i++)foreach(var c in Tree(VisualTreeHelper.GetChild(e,i)))yield return c;}
 static SolidColorBrush Solid(byte r,byte g,byte b)=>new(Color.FromArgb(255,r,g,b));
 object Part(FrameworkElement e,FrameworkElement origin){var r=e.TransformToVisual(origin).TransformBounds(new(0,0,e.ActualWidth,e.ActualHeight));var c=e as Control;var t=e as TextBlock;return new{type=e.GetType().Name,name=e.Name,rect=new[]{r.X,r.Y,r.Width,r.Height},desired=new[]{e.DesiredSize.Width,e.DesiredSize.Height},text=t?.Text??(e as MenuBarItem)?.Title??(e as AppBarButton)?.Label,enabled=c?.IsEnabled};}
 async Task Image(FrameworkElement target,string name){var bmp=new RenderTargetBitmap();await bmp.RenderAsync(target);var folder=await StorageFolder.GetFolderFromPathAsync(Program.Output);var file=await folder.CreateFileAsync(name+".png",CreationCollisionOption.ReplaceExisting);using var stream=await file.OpenAsync(FileAccessMode.ReadWrite);var encoder=await BitmapEncoder.CreateAsync(BitmapEncoder.PngEncoderId,stream);encoder.SetPixelData(BitmapPixelFormat.Bgra8,BitmapAlphaMode.Premultiplied,(uint)bmp.PixelWidth,(uint)bmp.PixelHeight,96,96,(await bmp.GetPixelsAsync()).ToArray());await encoder.FlushAsync();}
 async Task Capture(FrameworkElement target,string theme,string kind,string state){await Task.Delay(180);root.UpdateLayout();await Image(target,$"{theme}-{kind}-{state}");rows.Add(new{theme,kind,state,dpr=root.XamlRoot.RasterizationScale,rect=new[]{target.ActualWidth,target.ActualHeight},parts=Tree(target).OfType<FrameworkElement>().Select(e=>Part(e,target)).ToArray()});}
 FrameworkElement Box(string name,double w,double h)=>new Border{Name=name,Width=w,Height=h,Background=Solid(0,120,215)};
 async Task Run(){try{
 foreach(var theme in new[]{ElementTheme.Light,ElementTheme.Dark}){
  var name=theme.ToString();root.RequestedTheme=theme;root.Background=theme==ElementTheme.Light?Solid(250,250,250):Solid(32,32,32);
  var menu=new MenuBar{HorizontalAlignment=HorizontalAlignment.Left,VerticalAlignment=VerticalAlignment.Top};foreach(var title in new[]{"File","Edit","Help"}){var item=new MenuBarItem{Title=title};item.Items.Add(new MenuFlyoutItem{Text=title=="File"?"New":"Copy"});menu.Items.Add(item);}root.Children.Clear();root.Children.Add(menu);await Capture(menu,name,"MenuBar","Normal");menu.Items[1].IsEnabled=false;await Capture(menu,name,"MenuBar","Disabled");menu.Items[1].IsEnabled=true;
  var content=Tree(menu.Items[0]).OfType<Button>().First();var popup=content.ContextFlyout;popup.ShowAt(content);await Task.Delay(200);var presenter=VisualTreeHelper.GetOpenPopupsForXamlRoot(root.XamlRoot).Select(p=>p.Child).OfType<FrameworkElement>().First();await Capture(presenter,name,"MenuBarItem","Open");popup.Hide();await Task.Delay(100);
  foreach(var width in new[]{300d,400d}){var panel=new RelativePanel{Width=width,HorizontalAlignment=HorizontalAlignment.Left,VerticalAlignment=VerticalAlignment.Top};var a=Box("a",50,50);var b=Box("b",50,50);b.Margin=new(8,0,0,0);RelativePanel.SetRightOf(b,a);var c=Box("c",50,50);RelativePanel.SetAlignRightWithPanel(c,true);var d=Box("d",50,50);d.Margin=new(0,8,0,0);RelativePanel.SetBelow(d,c);RelativePanel.SetAlignHorizontalCenterWith(d,c);foreach(var e in new[]{a,b,c,d})panel.Children.Add(e);root.Children.Clear();root.Children.Add(panel);await Capture(panel,name,"RelativePanel",$"Width{width}");}
  foreach(var orient in new[]{Orientation.Horizontal,Orientation.Vertical})foreach(var last in new[]{false,true}){var panel=new WrapPanel{Width=200,Height=120,HorizontalAlignment=HorizontalAlignment.Left,VerticalAlignment=VerticalAlignment.Top,Padding=new(10),Orientation=orient,ItemSpacing=8,LineSpacing=12,ItemsStretch=last?WrapPanelItemsStretch.Last:WrapPanelItemsStretch.None};for(var i=0;i<3;i++)panel.Children.Add(new Border{Name=$"item{i}",MinWidth=80,Height=30,Background=Solid(0,120,215)});root.Children.Clear();root.Children.Add(panel);await Capture(panel,name,"WrapPanel",orient+(last?"Last":"None"));}
  var target=new Button{Content="Open",HorizontalAlignment=HorizontalAlignment.Left,VerticalAlignment=VerticalAlignment.Top};root.Children.Clear();root.Children.Add(target);
  foreach(var transient in new[]{false,true}){var flyout=new CommandBarFlyout{ShowMode=transient?Microsoft.UI.Xaml.Controls.Primitives.FlyoutShowMode.Transient:Microsoft.UI.Xaml.Controls.Primitives.FlyoutShowMode.Standard};foreach(var symbol in new[]{Symbol.Share,Symbol.Save,Symbol.Delete})flyout.PrimaryCommands.Add(new AppBarButton{Label=symbol.ToString(),Icon=new SymbolIcon(symbol)});flyout.SecondaryCommands.Add(new AppBarButton{Label="Resize"});flyout.SecondaryCommands.Add(new AppBarButton{Label="Move"});flyout.ShowAt(target);await Task.Delay(200);var popups=VisualTreeHelper.GetOpenPopupsForXamlRoot(root.XamlRoot).Select(p=>p.Child).OfType<FrameworkElement>().ToArray();foreach(var p in popups)await Capture(p,name,"CommandBarFlyout",(transient?"Transient":"Standard")+"-"+p.GetType().Name);flyout.Hide();await Task.Delay(200);}
 }
 File.WriteAllText(Path.Combine(Program.Output,"results.json"),JsonSerializer.Serialize(new{sdk="Microsoft.WindowsAppSDK.WinUI/2.3.10-experimental",scope="Independent same-SDK static geometry and RenderTargetBitmap; not Store Gallery Composition parity.",rows},new JsonSerializerOptions{WriteIndented=true}));Exit();
 }catch(Exception e){File.WriteAllText(Path.Combine(Program.Output,"error.txt"),e.ToString());Exit();}}
}
