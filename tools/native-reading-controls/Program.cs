using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Documents;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using Windows.Graphics;
using Windows.Graphics.Imaging;
using Windows.Storage;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Text.Json;
namespace ReadingProbe;
static class Program{public static string Output="";[STAThread]static void Main(string[]args){Output=Path.GetFullPath(args[0]);Directory.CreateDirectory(Output);WinRT.ComWrappersSupport.InitializeComWrappers();Application.Start(_=>{SynchronizationContext.SetSynchronizationContext(new Microsoft.UI.Dispatching.DispatcherQueueSynchronizationContext(Microsoft.UI.Dispatching.DispatcherQueue.GetForCurrentThread()));new ProbeApplication();});}}
public sealed partial class ProbeApplication:Application{
 readonly Grid root=new(){Width=688,Height=528};Window window=null!;readonly List<object>cases=[];
 public ProbeApplication(){InitializeComponent();UnhandledException+=(_,e)=>{File.WriteAllText(Path.Combine(Program.Output,"error.txt"),e.Exception.ToString());e.Handled=true;Exit();};}
 protected override void OnLaunched(LaunchActivatedEventArgs a){window=new Window{Content=root,Title="Five Rust SDK controls native baseline"};window.AppWindow.ResizeClient(new SizeInt32(688,528));root.Loaded+=async(_,_)=>await Run();window.Activate();}
 static IEnumerable<DependencyObject>Tree(DependencyObject o){yield return o;for(int i=0;i<VisualTreeHelper.GetChildrenCount(o);i++)foreach(var c in Tree(VisualTreeHelper.GetChild(o,i)))yield return c;}
 object Bounds(FrameworkElement e){var p=e.TransformToVisual(root).TransformPoint(new(0,0));return new{x=p.X,y=p.Y,width=e.ActualWidth,height=e.ActualHeight};}
 async Task Capture(string id,FrameworkElement control,object props){root.Children.Clear();var c=new Canvas();root.Children.Add(c);c.Children.Add(control);Canvas.SetLeft(control,24);Canvas.SetTop(control,24);root.UpdateLayout();if(control is AnnotatedScrollBar annotated){annotated.ScrollController.SetValues(0,1000,400,100);}await Task.Delay(180);root.UpdateLayout();var b=new RenderTargetBitmap();await b.RenderAsync(root,688,528);var folder=await StorageFolder.GetFolderFromPathAsync(Program.Output);var file=await folder.CreateFileAsync(id+".png",CreationCollisionOption.ReplaceExisting);using(var stream=await file.OpenAsync(FileAccessMode.ReadWrite)){var enc=await BitmapEncoder.CreateAsync(BitmapEncoder.PngEncoderId,stream);enc.SetPixelData(BitmapPixelFormat.Bgra8,BitmapAlphaMode.Premultiplied,(uint)b.PixelWidth,(uint)b.PixelHeight,96,96,(await b.GetPixelsAsync()).ToArray());await enc.FlushAsync();}cases.Add(new{id,kind=control.GetType().Name,props,rect=Bounds(control),parts=Tree(control).OfType<FrameworkElement>().Select(e=>new{type=e.GetType().Name,name=e.Name,rect=Bounds(e),text=(e as TextBlock)?.Text,visible=e.Visibility.ToString()}).ToArray()});}
 async Task Run(){try{foreach(var theme in new[]{ElementTheme.Light,ElementTheme.Dark}){root.RequestedTheme=theme;root.Background=new SolidColorBrush(theme==ElementTheme.Light?Windows.UI.Color.FromArgb(255,255,255,255):Windows.UI.Color.FromArgb(255,32,32,32));
 foreach(var mode in new[]{PagerControlDisplayMode.Auto,PagerControlDisplayMode.ComboBox,PagerControlDisplayMode.NumberBox,PagerControlDisplayMode.ButtonPanel}){var p=new PagerControl{NumberOfPages=12,SelectedPageIndex=2,DisplayMode=mode,PrefixText="Page",SuffixText="of"};await Capture($"{theme}-Pager-{mode}",p,new{numberOfPages=12,selectedPageIndex=2,displayMode=mode.ToString()});}
 foreach(int width in new[]{140,400}){var rich=new RichTextBlock{Width=width};var par=new Paragraph();par.Inlines.Add(new Run{Text="Hello "});par.Inlines.Add(new Run{Text="World",FontSize=24,FontWeight=Microsoft.UI.Text.FontWeights.Bold});par.Inlines.Add(new Run{Text=" 中文 link"});rich.Blocks.Add(par);await Capture($"{theme}-Rich-{width}",rich,new{width});}
 var panel=new LayoutPanel{Width=300,Padding=new Thickness(8),BorderThickness=new Thickness(1),BorderBrush=new SolidColorBrush(Microsoft.UI.Colors.Gray),Layout=new StackLayout{Spacing=5}};panel.Children.Add(new TextBlock{Text="First"});panel.Children.Add(new Button{Content="Save"});await Capture($"{theme}-LayoutPanel",panel,new{width=300});
 var items=new ItemsView{Width=240,Height=160,ItemsSource=Enumerable.Range(0,100).Select(i=>"Item "+i).ToArray(),SelectionMode=ItemsViewSelectionMode.Multiple};items.Select(2);await Capture($"{theme}-ItemsView",items,new{width=240,height=160,count=100});
 var bar=new AnnotatedScrollBar{Width=60,Height=300};bar.ScrollController.SetValues(0,1000,400,100);bar.Labels.Add(new AnnotatedScrollBarLabel("A",0));bar.Labels.Add(new AnnotatedScrollBarLabel("M",500));bar.Labels.Add(new AnnotatedScrollBarLabel("Z",1000));await Capture($"{theme}-Annotated",bar,new{width=60,height=300,maximum=1000,value=400,viewportSize=100});
 }File.WriteAllText(Path.Combine(Program.Output,"complete.json"),JsonSerializer.Serialize(new{cases,runtime=typeof(ItemsView).Assembly.FullName},new JsonSerializerOptions{WriteIndented=true}));Exit();}catch(Exception e){File.WriteAllText(Path.Combine(Program.Output,"error.txt"),e.ToString());Exit();}}
}

