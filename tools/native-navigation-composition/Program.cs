using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using Microsoft.UI.Xaml.Media.Animation;
using Microsoft.UI.Xaml.Navigation;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Text.Json;
using Windows.Graphics;
using Windows.Graphics.Imaging;
using Windows.Storage;
namespace NavigationCompositionProbe;
static class Program {
 public static string Output="";
 [System.Runtime.InteropServices.DllImport("user32.dll")]static extern bool SetProcessDpiAwarenessContext(IntPtr value);
 [STAThread]static void Main(string[] args){Output=Path.GetFullPath(args[0]);Directory.CreateDirectory(Output);SetProcessDpiAwarenessContext(new(-4));WinRT.ComWrappersSupport.InitializeComWrappers();Application.Start(_=>{SynchronizationContext.SetSynchronizationContext(new Microsoft.UI.Dispatching.DispatcherQueueSynchronizationContext(Microsoft.UI.Dispatching.DispatcherQueue.GetForCurrentThread()));new ProbeApplication();});}
}
public sealed partial class ProbeApplication:Application {
 Window window=null!;readonly Grid root=new(){Width=800,Height=540,Background=new SolidColorBrush(Windows.UI.Color.FromArgb(255,243,243,243))};readonly List<object> rows=[];
 public ProbeApplication(){InitializeComponent();UnhandledException+=(_,e)=>{File.WriteAllText(Path.Combine(Program.Output,"error.txt"),e.Exception.ToString());e.Handled=true;Exit();};}
 protected override void OnLaunched(LaunchActivatedEventArgs args){window=new Window{Title="Fixed-SDK NavigationView composition probe",Content=root};window.AppWindow.ResizeClient(new SizeInt32(800,600));root.Loaded+=async(_,_)=>await Run();window.Activate();}
 static IEnumerable<DependencyObject> Tree(DependencyObject e){yield return e;for(int i=0;i<VisualTreeHelper.GetChildrenCount(e);i++)foreach(var c in Tree(VisualTreeHelper.GetChild(e,i)))yield return c;}
 static bool Visible(FrameworkElement e){for(DependencyObject? at=e;at is not null;at=VisualTreeHelper.GetParent(at)){if(at is FrameworkElement f){if(f.Visibility!=Visibility.Visible||f.ActualWidth<=0||f.ActualHeight<=0)return false;var bounds=e.TransformToVisual(f).TransformBounds(new(0,0,e.ActualWidth,e.ActualHeight));if(bounds.Right<=0||bounds.Bottom<=0||bounds.X>=f.ActualWidth-0.0001||bounds.Y>=f.ActualHeight-0.0001)return false;}}return true;}
 object Part(FrameworkElement e,FrameworkElement origin){var r=e.TransformToVisual(origin).TransformBounds(new(0,0,e.ActualWidth,e.ActualHeight));return new{type=e.GetType().Name,name=e.Name,rect=new[]{r.X,r.Y,r.Width,r.Height},desired=new[]{e.DesiredSize.Width,e.DesiredSize.Height},visible=Visible(e),visibility=e.Visibility.ToString(),enabled=(e as Control)?.IsEnabled,text=(e as TextBlock)?.Text};}
 async Task Image(FrameworkElement target,string name){var bmp=new RenderTargetBitmap();await bmp.RenderAsync(target);var folder=await StorageFolder.GetFolderFromPathAsync(Program.Output);var file=await folder.CreateFileAsync(name+".png",CreationCollisionOption.ReplaceExisting);using var stream=await file.OpenAsync(FileAccessMode.ReadWrite);var encoder=await BitmapEncoder.CreateAsync(BitmapEncoder.PngEncoderId,stream);encoder.SetPixelData(BitmapPixelFormat.Bgra8,BitmapAlphaMode.Premultiplied,(uint)bmp.PixelWidth,(uint)bmp.PixelHeight,96,96,(await bmp.GetPixelsAsync()).ToArray());await encoder.FlushAsync();}
 async Task Capture(NavigationView nav,string theme,string state){await Task.Delay(750);root.UpdateLayout();await Image(root,$"{theme}-{state}");rows.Add(new{theme,state,dpr=root.XamlRoot.RasterizationScale,displayMode=nav.DisplayMode.ToString(),paneOpen=nav.IsPaneOpen,parts=Tree(nav).OfType<FrameworkElement>().Select(e=>Part(e,nav)).ToArray()});}
 NavigationView Make(NavigationViewPaneDisplayMode mode,bool slots){
  var nav=new NavigationView{Width=800,Height=540,PaneDisplayMode=mode,IsBackButtonVisible=NavigationViewBackButtonVisible.Visible,Header="Header",PaneTitle="Pane Title"};
  nav.MenuItems.Add(new NavigationViewItem{Content="Menu Item1",Icon=new SymbolIcon(Symbol.Play),Tag="a"});nav.MenuItems.Add(new NavigationViewItemHeader{Content="Actions"});nav.MenuItems.Add(new NavigationViewItem{Content="Menu Item2",Icon=new SymbolIcon(Symbol.Save),Tag="b"});nav.MenuItems.Add(new NavigationViewItem{Content="Menu Item3",Icon=new SymbolIcon(Symbol.Refresh),Tag="c"});
  nav.Content=new Frame();
  if(slots){nav.AutoSuggestBox=new AutoSuggestBox{Name="SearchBox",QueryIcon=new SymbolIcon(Symbol.Find)};nav.PaneCustomContent=new HyperlinkButton{Name="CustomContent",Content="More info",Margin=new(12,0,12,0)};var footer=new StackPanel{Name="CustomFooter",Orientation=mode==NavigationViewPaneDisplayMode.Top?Orientation.Horizontal:Orientation.Vertical};footer.Children.Add(new NavigationViewItem{Icon=new SymbolIcon(Symbol.Download)});footer.Children.Add(new NavigationViewItem{Icon=new SymbolIcon(Symbol.Favorite)});nav.PaneFooter=footer;}
  nav.SelectedItem=nav.MenuItems[0];return nav;
 }
 async Task Run(){try{
  var defaults=new NavigationView();var nativeDefaults=new{header=defaults.Header,content=defaults.Content,back=defaults.IsBackButtonVisible.ToString(),openLength=defaults.OpenPaneLength,compactLength=defaults.CompactPaneLength};
  foreach(var theme in new[]{ElementTheme.Light,ElementTheme.Dark}){root.RequestedTheme=theme;
   foreach(var mode in new[]{NavigationViewPaneDisplayMode.Left,NavigationViewPaneDisplayMode.Top,NavigationViewPaneDisplayMode.LeftCompact,NavigationViewPaneDisplayMode.LeftMinimal,NavigationViewPaneDisplayMode.Auto})foreach(var slots in new[]{false,true}){
    var nav=Make(mode,slots);root.Children.Clear();root.Children.Add(nav);await Capture(nav,theme.ToString(),$"{mode}-{(slots?"slots":"empty")}");
    if(slots&&mode!=NavigationViewPaneDisplayMode.Top){nav.IsPaneOpen=true;await Capture(nav,theme.ToString(),$"{mode}-open-slots");}
   }
  }
  root.RequestedTheme=ElementTheme.Light;
  foreach(string? header in new string?[]{null,""}){var nav=Make(NavigationViewPaneDisplayMode.Left,false);nav.Header=header;root.Children.Clear();root.Children.Add(nav);await Capture(nav,"Light",header is null?"Left-null-header-empty":"Left-empty-header-empty");}
  File.WriteAllText(Path.Combine(Program.Output,"geometry.json"),JsonSerializer.Serialize(new{nativeDefaults,rows},new JsonSerializerOptions{WriteIndented=true}));
  var journal=new Frame();root.Children.Clear();root.Children.Add(journal);await Task.Delay(50);var events=new List<string>();journal.Navigating+=(_,e)=>events.Add("Navigating:"+e.NavigationMode);journal.Navigated+=(_,e)=>events.Add("Navigated:"+e.NavigationMode);
  journal.Navigate(typeof(FirstPage),"first",new SuppressNavigationTransitionInfo());journal.Navigate(typeof(SecondPage),"second",new SuppressNavigationTransitionInfo());journal.GoBack(new SuppressNavigationTransitionInfo());
  File.WriteAllText(Path.Combine(Program.Output,"results.json"),JsonSerializer.Serialize(new{sdk="Microsoft.WindowsAppSDK.WinUI/2.3.10-experimental",scope="Independent same-SDK template geometry and observable navigation, not Store Composition pixel parity",nativeDefaults,events,rows},new JsonSerializerOptions{WriteIndented=true}));Exit();
 }catch(Exception e){File.WriteAllText(Path.Combine(Program.Output,"error.txt"),e.ToString());Exit();}}
}
public sealed partial class FirstPage:Page{public FirstPage(){InitializeComponent();NavigationCacheMode=NavigationCacheMode.Enabled;}}
public sealed partial class SecondPage:Page{public SecondPage(){InitializeComponent();}}
