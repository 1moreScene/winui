using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Documents;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using Microsoft.UI.Xaml.Markup;
using Windows.Graphics;
using Windows.Graphics.Imaging;
using Windows.Storage;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Text.Json;
using System.Xml.Linq;
namespace ReadingGalleryProbe;
static class Program{public static string Output="",Repo="";[STAThread]static void Main(string[]args){Output=Path.GetFullPath(args[0]);Repo=Path.GetFullPath(args[1]);Directory.CreateDirectory(Output);WinRT.ComWrappersSupport.InitializeComWrappers();Application.Start(_=>{SynchronizationContext.SetSynchronizationContext(new Microsoft.UI.Dispatching.DispatcherQueueSynchronizationContext(Microsoft.UI.Dispatching.DispatcherQueue.GetForCurrentThread()));new ProbeApplication();});}}
public sealed class Item{public string Title{get;set;}="";public string ImageLocation{get;set;}="";public string Description{get;set;}="";public string Likes{get;set;}="";}
public sealed partial class ProbeApplication:Application{
 readonly Grid root=new(){Width=688,Height=1000};readonly Canvas canvas=new();readonly Button focusSink=new(){Width=1,Height=1,Opacity=0,IsTabStop=true};Window window=null!;readonly List<object>cases=[];
 readonly JsonDocument source=JsonDocument.Parse(File.ReadAllText(Path.Combine(Program.Repo,"gallery/src/official-reading-controls.json")));
 static readonly XNamespace P="http://schemas.microsoft.com/winfx/2006/xaml/presentation",X="http://schemas.microsoft.com/winfx/2006/xaml";
 public ProbeApplication(){InitializeComponent();root.Children.Add(canvas);root.Children.Add(focusSink);UnhandledException+=(_,e)=>{File.WriteAllText(Path.Combine(Program.Output,"error.txt"),e.Exception.ToString());e.Handled=true;Exit();};}
 protected override void OnLaunched(LaunchActivatedEventArgs a){window=new Window{Content=root,Title="Fixed Gallery reading controls validation"};window.AppWindow.ResizeClient(new SizeInt32(688,1000));root.Loaded+=async(_,_)=>await Run();window.Activate();}
 static IEnumerable<DependencyObject>Tree(DependencyObject o){yield return o;for(int i=0;i<VisualTreeHelper.GetChildrenCount(o);i++)foreach(var c in Tree(VisualTreeHelper.GetChild(o,i)))yield return c;}
 object Bounds(FrameworkElement e){var p=e.TransformToVisual(root).TransformPoint(new(0,0));return new{x=p.X,y=p.Y,width=e.ActualWidth,height=e.ActualHeight};}
 XElement Clean(XElement input){var copy=new XElement(input);foreach(var n in copy.DescendantsAndSelf().ToArray()){
  if(n.Name.LocalName=="LayoutPanel.Layout"){n.Remove();continue;}
  foreach(var a in n.Attributes().ToArray()){
   if(a.IsNamespaceDeclaration)continue;
   if(a.Name==X+"DataType"||a.Name==X+"Class"||new[]{"ItemInvoked","SelectionChanged","SizeChanged","ValueChanged","Checked","Unchecked","DetailLabelRequested","Loaded"}.Contains(a.Name.LocalName)){a.Remove();continue;}
   if(a.Value.StartsWith("{x:Bind")){if(a.Name.LocalName=="OverflowContentTarget"){a.Remove();continue;}var key=a.Value[7..].Trim().TrimEnd('}').Split(',')[0].Trim();a.Value="{Binding "+key+"}";}
  }
 }return copy;}
 FrameworkElement Create(string kind,int index){var sample=source.RootElement.GetProperty("controls").GetProperty(kind).GetProperty("samples")[index];var live=Clean(XElement.Parse(sample.GetProperty("runtimeXaml").GetString()!));var page=XElement.Load(Path.Combine(Program.Repo,$"references/gallery-input/{kind}/{kind}Page.xaml"));var resources=page.Elements().FirstOrDefault(n=>n.Name.LocalName.EndsWith(".Resources"));var wrapper=new XElement(P+"Grid",new XAttribute("Width",640),new XAttribute(XNamespace.Xmlns+"x",X.NamespaceName));var res=new XElement(P+"Grid.Resources");if(resources!=null)foreach(var child in resources.Elements())res.Add(Clean(child));res.Add(new XElement(P+"Style",new XAttribute(X+"Key","OutputTextBlockStyle"),new XAttribute("TargetType","TextBlock")));wrapper.Add(res);wrapper.Add(live);return (FrameworkElement)XamlReader.Load(wrapper.ToString());}
 async Task Capture(string id,FrameworkElement control,string kind,int index,string variant="default"){
  focusSink.Focus(FocusState.Programmatic);canvas.Children.Clear();canvas.Children.Add(control);Canvas.SetLeft(control,24);Canvas.SetTop(control,24);root.UpdateLayout();await Task.Delay(60);
  var data=source.RootElement.GetProperty("items").EnumerateArray().Select(i=>new Item{Title=i.GetProperty("text").GetString()!,ImageLocation=new Uri(Path.Combine(Program.Repo,"gallery/public"+i.GetProperty("image").GetString()!.Replace('/','\\'))).AbsoluteUri,Description=i.GetProperty("description").GetString()!,Likes=i.GetProperty("likes").GetString()!}).ToArray();
  foreach(var view in Tree(control).OfType<ItemsView>()){view.ItemsSource=data;if(index==1){if(variant=="stack"){view.Layout=new StackLayout{Spacing=5};view.ItemTemplate=(DataTemplate)((Grid)control).Resources["StackLayoutItemTemplate"];}else if(variant=="uniform"){view.Layout=new UniformGridLayout{MinRowSpacing=5,MinColumnSpacing=5,MaximumRowsOrColumns=3};view.ItemTemplate=(DataTemplate)((Grid)control).Resources["UniformGridLayoutItemTemplate"];}else if(view.Layout is LinedFlowLayout l){l.LineHeight=variant=="small"?80:160;l.LineSpacing=5;l.MinItemSpacing=5;}}
   if(index==2){view.SelectionMode=variant=="extended"?ItemsViewSelectionMode.Extended:ItemsViewSelectionMode.Multiple;view.Select(1);view.Select(3);}}
  foreach(var panel in Tree(control).OfType<LayoutPanel>())panel.Layout=variant=="stack"?new StackLayout{Spacing=8}:new FeaturedTileLayout{Spacing=8};
  var rich=Tree(control).OfType<RichTextBlock>().FirstOrDefault();if(rich!=null&&kind=="RichTextBlock"){
   if(index==2){var over=Tree(control).OfType<RichTextBlockOverflow>().ToArray();rich.OverflowContentTarget=over[0];over[0].OverflowContentTarget=over[1];}
   if(index==3){var h=new TextHighlighter{Background=new SolidColorBrush(variant=="blue"?Microsoft.UI.Colors.Blue:Microsoft.UI.Colors.Yellow)};h.Ranges.Add(new TextRange{StartIndex=28,Length=11});rich.TextHighlighters.Add(h);}
   if(index==1&&variant=="selection"){rich.IsTabStop=true;window.Activate();rich.Focus(FocusState.Keyboard);rich.Select(rich.ContentStart,rich.ContentEnd);}
  }
  if(kind=="AnnotatedScrollBar"){
   var scroll=Tree(control).OfType<ScrollView>().Single();var repeater=Tree(control).OfType<ItemsRepeater>().Single();var bar=Tree(control).OfType<AnnotatedScrollBar>().Single();var colors=new[]{(Microsoft.UI.Colors.Azure,32,"Azure"),(Microsoft.UI.Colors.Crimson,50,"Crimson"),(Microsoft.UI.Colors.Cyan,8,"Cyan"),(Microsoft.UI.Colors.Fuchsia,70,"Fuchsia"),(Microsoft.UI.Colors.Gold,90,"Gold")};repeater.ItemsSource=colors.SelectMany(c=>Enumerable.Repeat(new SolidColorBrush(c.Item1),c.Item2)).ToArray();root.UpdateLayout();await Task.Delay(80);var per=Math.Max(1,(int)(repeater.ActualWidth/120));int item=0;foreach(var color in colors){bar.Labels.Add(new AnnotatedScrollBarLabel(color.Item3,90*(item/per)));item+=color.Item2;}scroll.ScrollPresenter.VerticalScrollController=bar.ScrollController;if(variant=="short")bar.MaxHeight=150;
  }
  root.UpdateLayout();await Task.Delay(250);root.UpdateLayout();
  var b=new RenderTargetBitmap();await b.RenderAsync(root,688,1000);var folder=await StorageFolder.GetFolderFromPathAsync(Program.Output);var file=await folder.CreateFileAsync(id+".png",CreationCollisionOption.ReplaceExisting);using(var stream=await file.OpenAsync(FileAccessMode.ReadWrite)){var enc=await BitmapEncoder.CreateAsync(BitmapEncoder.PngEncoderId,stream);enc.SetPixelData(BitmapPixelFormat.Bgra8,BitmapAlphaMode.Premultiplied,(uint)b.PixelWidth,(uint)b.PixelHeight,96,96,(await b.GetPixelsAsync()).ToArray());await enc.FlushAsync();}
  cases.Add(new{id,kind,index,variant,rect=Bounds(control),parts=Tree(control).OfType<FrameworkElement>().Select(e=>new{type=e.GetType().Name,name=e.Name,rect=Bounds(e),text=(e as TextBlock)?.Text,selected=(e as ItemContainer)?.IsSelected,visible=e.Visibility.ToString()}).ToArray(),selection=rich?.SelectedText,richFocus=rich?.FocusState.ToString()});
 }
 async Task Run(){try{foreach(var theme in new[]{ElementTheme.Light,ElementTheme.Dark}){root.RequestedTheme=theme;root.Background=new SolidColorBrush(theme==ElementTheme.Light?Microsoft.UI.Colors.White:Windows.UI.Color.FromArgb(255,32,32,32));foreach(var kind in new[]{"ItemsView","AnnotatedScrollBar","PagerControl","LayoutPanel","RichTextBlock"}){var count=source.RootElement.GetProperty("controls").GetProperty(kind).GetProperty("samples").GetArrayLength();for(int i=0;i<count;i++){await Capture($"{theme}-{kind}-{i}",Create(kind,i),kind,i);if(kind=="ItemsView"&&i==1)foreach(var v in new[]{"small","uniform","stack"})await Capture($"{theme}-{kind}-{i}-{v}",Create(kind,i),kind,i,v);if(kind=="LayoutPanel")await Capture($"{theme}-{kind}-{i}-stack",Create(kind,i),kind,i,"stack");if(kind=="RichTextBlock"&&i==1)await Capture($"{theme}-{kind}-{i}-selection",Create(kind,i),kind,i,"selection");if(kind=="RichTextBlock"&&i==3)await Capture($"{theme}-{kind}-{i}-blue",Create(kind,i),kind,i,"blue");if(kind=="AnnotatedScrollBar")await Capture($"{theme}-{kind}-{i}-short",Create(kind,i),kind,i,"short");}}}
  File.WriteAllText(Path.Combine(Program.Output,"complete.json"),JsonSerializer.Serialize(new{cases,runtime=typeof(ItemsView).Assembly.FullName,sourceCommit=source.RootElement.GetProperty("commit").GetString()},new JsonSerializerOptions{WriteIndented=true}));Exit();}catch(Exception e){File.WriteAllText(Path.Combine(Program.Output,"error.txt"),e.ToString());Exit();}}
}
