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
namespace RepeaterStyleProbe;
static class Program {
 public static string Output="";
 [System.Runtime.InteropServices.DllImport("user32.dll")]static extern bool SetProcessDpiAwarenessContext(IntPtr value);
 [STAThread]static void Main(string[] args){Output=Path.GetFullPath(args[0]);Directory.CreateDirectory(Output);SetProcessDpiAwarenessContext(new(-4));WinRT.ComWrappersSupport.InitializeComWrappers();Application.Start(_=>{SynchronizationContext.SetSynchronizationContext(new Microsoft.UI.Dispatching.DispatcherQueueSynchronizationContext(Microsoft.UI.Dispatching.DispatcherQueue.GetForCurrentThread()));new ProbeApplication();});}
}
public sealed partial class ProbeApplication:Application {
 Window window=null!;readonly Grid root=new(){Width=640,Height=480};readonly List<object> rows=[];
 public ProbeApplication(){InitializeComponent();UnhandledException+=(_,e)=>{File.WriteAllText(Path.Combine(Program.Output,"error.txt"),e.Exception.ToString());e.Handled=true;Exit();};}
 protected override void OnLaunched(LaunchActivatedEventArgs args){window=new Window{Title="Gallery color Button source probe",Content=root};window.AppWindow.ResizeClient(new SizeInt32(640,480));root.Loaded+=async(_,_)=>await Run();window.Activate();}
 static string ColorValue(Brush? b)=>b is SolidColorBrush s?$"#{s.Color.R:X2}{s.Color.G:X2}{s.Color.B:X2}{s.Color.A:X2}":b?.GetType().Name??"null";
 static T? Find<T>(DependencyObject parent,string name) where T:FrameworkElement {for(int i=0;i<VisualTreeHelper.GetChildrenCount(parent);i++){var child=VisualTreeHelper.GetChild(parent,i);if(child is T match&&match.Name==name)return match;var nested=Find<T>(child,name);if(nested!=null)return nested;}return null;}
 async Task Image(FrameworkElement target,string name){var bmp=new RenderTargetBitmap();await bmp.RenderAsync(target);var folder=await StorageFolder.GetFolderFromPathAsync(Program.Output);var file=await folder.CreateFileAsync(name+".png",CreationCollisionOption.ReplaceExisting);using var stream=await file.OpenAsync(FileAccessMode.ReadWrite);var encoder=await BitmapEncoder.CreateAsync(BitmapEncoder.PngEncoderId,stream);encoder.SetPixelData(BitmapPixelFormat.Bgra8,BitmapAlphaMode.Premultiplied,(uint)bmp.PixelWidth,(uint)bmp.PixelHeight,96,96,(await bmp.GetPixelsAsync()).ToArray());await encoder.FlushAsync();}
 async Task Run(){try{foreach(var theme in new[]{ElementTheme.Light,ElementTheme.Dark}){
  root.RequestedTheme=theme;root.Background=new SolidColorBrush(theme==ElementTheme.Light?Color.FromArgb(255,243,243,243):Color.FromArgb(255,32,32,32));
  var button=(Button)XamlReader.Load("<Button xmlns='http://schemas.microsoft.com/winfx/2006/xaml/presentation' HorizontalAlignment='Stretch' Background='Blue' Content='Blue' Foreground='{ThemeResource TextFillColorInverseBrush}' Width='250'/>");root.Children.Clear();root.Children.Add(button);await Task.Delay(120);button.ApplyTemplate();root.UpdateLayout();
  foreach(var state in new[]{"Normal","PointerOver","Pressed","Disabled"}){VisualStateManager.GoToState(button,state,false);await Task.Delay(150);root.UpdateLayout();var presenter=Find<ContentPresenter>(button,"ContentPresenter")!;rows.Add(new{theme=theme.ToString(),state,dpr=root.XamlRoot.RasterizationScale,size=new[]{button.ActualWidth,button.ActualHeight},desired=new[]{button.DesiredSize.Width,button.DesiredSize.Height},padding=new[]{button.Padding.Left,button.Padding.Top,button.Padding.Right,button.Padding.Bottom},fontSize=button.FontSize,fontFamily=button.FontFamily.Source,borderThickness=button.BorderThickness.Left,cornerRadius=button.CornerRadius.TopLeft,background=ColorValue(presenter.Background),foreground=ColorValue(presenter.Foreground),border=ColorValue(presenter.BorderBrush)});await Image(button,$"{theme}-{state}");}
  var repeater=new ItemsRepeater{ItemsSource=new[]{"Blue","BlueViolet","Crimson","DarkCyan","DarkGoldenrod","DarkMagenta"},ItemTemplate=(DataTemplate)XamlReader.Load("<DataTemplate xmlns='http://schemas.microsoft.com/winfx/2006/xaml/presentation'><Button HorizontalAlignment='Stretch' Background='{Binding}' Content='{Binding}' Foreground='{ThemeResource TextFillColorInverseBrush}'/></DataTemplate>")};var host=new ScrollViewer{Width=250,Height=175,Content=repeater};root.Children.Clear();root.Children.Add(host);await Task.Delay(120);root.UpdateLayout();var items=new List<object>();for(int i=0;i<6;i++)if(repeater.TryGetElement(i)is Button b){var p=b.TransformToVisual(repeater).TransformPoint(new(0,0));items.Add(new{index=i,kind="Button",rect=new[]{p.X,p.Y,b.ActualWidth,b.ActualHeight}});}rows.Add(new{theme=theme.ToString(),state="AnimatedTemplate",items});await Image(host,$"{theme}-AnimatedTemplate");
 }File.WriteAllText(Path.Combine(Program.Output,"results.json"),JsonSerializer.Serialize(new{scope="Same-SDK Button VSM and template geometry, without Composition scaling acceptance",rows},new JsonSerializerOptions{WriteIndented=true}));Exit();}catch(Exception e){File.WriteAllText(Path.Combine(Program.Output,"error.txt"),e.ToString());Exit();}}
}
