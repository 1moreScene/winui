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
namespace MenuItemProbe;
static class Program {
 public static string Output="";
 [System.Runtime.InteropServices.DllImport("user32.dll")]static extern bool SetProcessDpiAwarenessContext(IntPtr value);
 [STAThread]static void Main(string[] args){Output=Path.GetFullPath(args[0]);Directory.CreateDirectory(Output);SetProcessDpiAwarenessContext(new(-4));WinRT.ComWrappersSupport.InitializeComWrappers();try{Application.Start(_=>{SynchronizationContext.SetSynchronizationContext(new Microsoft.UI.Dispatching.DispatcherQueueSynchronizationContext(Microsoft.UI.Dispatching.DispatcherQueue.GetForCurrentThread()));new ProbeApplication();});}catch(Exception e){File.WriteAllText(Path.Combine(Output,"error.txt"),e.ToString());}}
}
public sealed partial class ProbeApplication:Application {
 Window window=null!;readonly Grid root=new(){Width=800,Height=600};readonly List<object> rows=[];
 public ProbeApplication(){InitializeComponent();UnhandledException+=(_,e)=>{File.WriteAllText(Path.Combine(Program.Output,"error.txt"),e.Exception.ToString());e.Handled=true;Exit();};}
 protected override void OnLaunched(LaunchActivatedEventArgs args){window=new Window{Title="Fixed-SDK menu item probe",Content=root};window.AppWindow.ResizeClient(new SizeInt32(1000,750));window.AppWindow.Move(new PointInt32(80,80));root.Loaded+=async(_,_)=>await Run();window.Activate();}
 static IEnumerable<DependencyObject> Tree(DependencyObject e){yield return e;for(int i=0;i<VisualTreeHelper.GetChildrenCount(e);i++)foreach(var c in Tree(VisualTreeHelper.GetChild(e,i)))yield return c;}
 static SolidColorBrush Solid(byte r,byte g,byte b)=>new(Color.FromArgb(255,r,g,b));
 object Part(FrameworkElement e,FrameworkElement origin){var r=e.TransformToVisual(origin).TransformBounds(new(0,0,e.ActualWidth,e.ActualHeight));var c=e as Control;var t=e as TextBlock;return new{type=e.GetType().Name,name=e.Name,rect=new[]{r.X,r.Y,r.Width,r.Height},desired=new[]{e.DesiredSize.Width,e.DesiredSize.Height},text=t?.Text??(e as MenuBarItem)?.Title??(e as AppBarButton)?.Label,enabled=c?.IsEnabled,fontSize=c?.FontSize??t?.FontSize,baseline=t?.BaselineOffset,fontFamily=c?.FontFamily.Source??t?.FontFamily.Source};}
 async Task Image(FrameworkElement target,string name){var bmp=new RenderTargetBitmap();await bmp.RenderAsync(target);var folder=await StorageFolder.GetFolderFromPathAsync(Program.Output);var file=await folder.CreateFileAsync(name+".png",CreationCollisionOption.ReplaceExisting);using var stream=await file.OpenAsync(FileAccessMode.ReadWrite);var encoder=await BitmapEncoder.CreateAsync(BitmapEncoder.PngEncoderId,stream);encoder.SetPixelData(BitmapPixelFormat.Bgra8,BitmapAlphaMode.Premultiplied,(uint)bmp.PixelWidth,(uint)bmp.PixelHeight,96,96,(await bmp.GetPixelsAsync()).ToArray());await encoder.FlushAsync();}
 async Task Capture(FrameworkElement target,string theme,string kind,string state){await Task.Delay(180);root.UpdateLayout();await Image(target,$"{theme}-{kind}-{state}");var shot=ScreenPixels();await SaveEffectImage($"{theme}-{kind}-{state}-composed",shot.Pixels,shot.Width,shot.Height);var bounds=target.TransformToVisual(root).TransformBounds(new(0,0,target.ActualWidth,target.ActualHeight));rows.Add(new{theme,kind,state,shot.CaptureMode,shot.Foreground,clientBounds=new[]{bounds.X,bounds.Y,bounds.Width,bounds.Height},dpr=root.XamlRoot.RasterizationScale,rect=new[]{target.ActualWidth,target.ActualHeight},parts=Tree(target).OfType<FrameworkElement>().Select(e=>Part(e,target)).ToArray()});}
 FrameworkElement Box(string name,double w,double h)=>new Border{Name=name,Width=w,Height=h,Background=Solid(0,120,215)};
 async Task<MenuFlyoutPresenter> OpenMenu(MenuFlyout menu,FrameworkElement target){
  for(var attempt=0;attempt<4;attempt++){
   window.Activate();await Task.Delay(150);_ = ScreenPixels();menu.ShowAt(target);await Task.Delay(200);root.UpdateLayout();
   var presenter=VisualTreeHelper.GetOpenPopupsForXamlRoot(root.XamlRoot).SelectMany(p=>Tree(p.Child)).OfType<MenuFlyoutPresenter>().FirstOrDefault();
   if(presenter is not null)return presenter;menu.Hide();await Task.Delay(100);
  }
  throw new InvalidOperationException("Own-window menu did not acquire a live presenter");
 }
 async Task Run(){try{
 var behavior=new List<object>();
 foreach(var theme in new[]{ElementTheme.Light,ElementTheme.Dark}){
  root.RequestedTheme=theme;root.Background=theme==ElementTheme.Light?Solid(250,250,250):Solid(32,32,32);
  var target=new Button{Content="Open",Width=120,Height=32,Margin=new(240,160,0,0),HorizontalAlignment=HorizontalAlignment.Left,VerticalAlignment=VerticalAlignment.Top};root.Children.Clear();root.Children.Add(target);
  var menu=new MenuFlyout{Placement=Microsoft.UI.Xaml.Controls.Primitives.FlyoutPlacementMode.Bottom};
  var command=new MenuFlyoutItem{Text="Open"};
  var toggle=new ToggleMenuFlyoutItem{Text="Toolbar",IsChecked=true};
  var radio1=new RadioMenuFlyoutItem{Text="Portrait",GroupName="orientation",IsChecked=true};
  var radio2=new RadioMenuFlyoutItem{Text="Landscape",GroupName="orientation"};
  var sub=new MenuFlyoutSubItem{Text="Share"};sub.Items.Add(new MenuFlyoutItem{Text="Email"});
  var separator=new MenuFlyoutSeparator();
  foreach(var item in new MenuFlyoutItemBase[]{command,toggle,radio1,radio2,sub,separator,new MenuFlyoutItem{Text="Unavailable",IsEnabled=false}})menu.Items.Add(item);
  var presenter=await OpenMenu(menu,target);
  foreach(var item in menu.Items.OfType<Control>())VisualStateManager.GoToState(item,"DefaultPadding",false);
  foreach(var state in new[]{"Normal","PointerOver","Pressed","Disabled"}){
   foreach(var item in menu.Items.OfType<Control>())if(item is not MenuFlyoutSeparator)VisualStateManager.GoToState(item,state,false);
   await Capture(presenter,theme.ToString(),"MenuItems",state);
  }
  // DP updates exercise the original cross-submenu selection map.
  var nestedRadio=new RadioMenuFlyoutItem{Text="Nested",GroupName="orientation"};sub.Items.Add(nestedRadio);
  nestedRadio.IsChecked=true;behavior.Add(new{theme=theme.ToString(),caseName="cross-submenu-radio",first=radio1.IsChecked,second=radio2.IsChecked,nested=nestedRadio.IsChecked});
  radio2.IsChecked=true;behavior.Add(new{theme=theme.ToString(),caseName="programmatic-radio",first=radio1.IsChecked,second=radio2.IsChecked,nested=nestedRadio.IsChecked});
  menu.Hide();await Task.Delay(250);
  foreach(var variant in new[]{"IconsShortcuts","Rtl","LongText"}){
   var extra=new MenuFlyout{Placement=Microsoft.UI.Xaml.Controls.Primitives.FlyoutPlacementMode.Bottom};var rtl=variant=="Rtl";
   var style=new Style{TargetType=typeof(MenuFlyoutPresenter),BasedOn=(Style)Application.Current.Resources["DefaultMenuFlyoutPresenterStyle"]};
   if(rtl)style.Setters.Add(new Setter(FrameworkElement.FlowDirectionProperty,FlowDirection.RightToLeft));
   if(variant=="LongText"){style.Setters.Add(new Setter(FrameworkElement.MinWidthProperty,260d));style.Setters.Add(new Setter(FrameworkElement.MaxWidthProperty,260d));}
   extra.MenuFlyoutPresenterStyle=style;
   var first=new MenuFlyoutItem{Text=variant=="LongText"?"A long document label which must not overlap its accelerator":"Open",Icon=new FontIcon{Glyph="\uE8E5",FontFamily=new FontFamily("Segoe Fluent Icons")}};
   first.KeyboardAccelerators.Add(new Microsoft.UI.Xaml.Input.KeyboardAccelerator{Key=Windows.System.VirtualKey.O,Modifiers=Windows.System.VirtualKeyModifiers.Control});
   var flag=new ToggleMenuFlyoutItem{Text="Toolbar",IsChecked=true,Icon=new FontIcon{Glyph="\uE74E",FontFamily=new FontFamily("Segoe Fluent Icons")}};
   flag.KeyboardAccelerators.Add(new Microsoft.UI.Xaml.Input.KeyboardAccelerator{Key=Windows.System.VirtualKey.S,Modifiers=Windows.System.VirtualKeyModifiers.Control|Windows.System.VirtualKeyModifiers.Shift});
   var option=new RadioMenuFlyoutItem{Text="Portrait",GroupName="extra-"+variant,IsChecked=true};
   var branch=new MenuFlyoutSubItem{Text="Share"};branch.Items.Add(new MenuFlyoutItem{Text="Email"});
   foreach(var item in new MenuFlyoutItemBase[]{first,flag,option,branch,new MenuFlyoutSeparator(),new MenuFlyoutItem{Text="Unavailable",IsEnabled=false}}){if(rtl)item.FlowDirection=FlowDirection.RightToLeft;extra.Items.Add(item);}
   var view=await OpenMenu(extra,target);
   foreach(var item in extra.Items.OfType<Control>())VisualStateManager.GoToState(item,"DefaultPadding",false);
   await Capture(view,theme.ToString(),variant,"Normal");
   foreach(var item in extra.Items.OfType<Control>())VisualStateManager.GoToState(item,"NarrowPadding",false);
   await Capture(view,theme.ToString(),variant,"Narrow");extra.Hide();await Task.Delay(180);
  }
 }
 File.WriteAllText(Path.Combine(Program.Output,"results.json"),JsonSerializer.Serialize(new{sdk="Microsoft.WindowsAppSDK.WinUI/2.3.10-experimental",scope="Independent same-SDK forced VSM static geometry and RenderTargetBitmap; not Store Gallery Composition or animation acceptance.",behavior,rows},new JsonSerializerOptions{WriteIndented=true}));Exit();
 }catch(Exception e){File.WriteAllText(Path.Combine(Program.Output,"error.txt"),e.ToString());Exit();}}
}
