using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Input;
using Microsoft.UI.Xaml.Data;
using Microsoft.UI.Xaml.Markup;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using System.Collections.ObjectModel;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Xml.Linq;
using Windows.Graphics;
using Windows.Graphics.Imaging;
using Windows.Storage;
namespace ViewGalleryProbe;
static class Program {
 public static string Output="",Repo="";
 [STAThread]static void Main(string[]args){Output=Path.GetFullPath(args[0]);Repo=Path.GetFullPath(args[1]);Directory.CreateDirectory(Output);WinRT.ComWrappersSupport.InitializeComWrappers();try{Application.Start(_=>{SynchronizationContext.SetSynchronizationContext(new Microsoft.UI.Dispatching.DispatcherQueueSynchronizationContext(Microsoft.UI.Dispatching.DispatcherQueue.GetForCurrentThread()));new ProbeApplication();});}catch(Exception e){File.WriteAllText(Path.Combine(Output,"error.txt"),e.ToString());}}
}
public sealed class Item {public string UniqueId{get;set;}="";public string Title{get;set;}="";public string Subtitle{get;set;}="";public string Text{get;set;}="";public string Label{get;set;}="";public Symbol Symbol{get;set;}public System.Windows.Input.ICommand? Command{get;set;}}
public sealed class Group {public string UniqueId{get;set;}="";public string Title{get;set;}="";public ObservableCollection<Item> Items{get;set;}=[];}
public sealed partial class ProbeApplication:Application {
 readonly Grid root=new(){Width=688,Height=848};Window window=null!;readonly List<object>cases=[];
 static readonly XNamespace P="http://schemas.microsoft.com/winfx/2006/xaml/presentation",X="http://schemas.microsoft.com/winfx/2006/xaml";
 readonly JsonDocument source=JsonDocument.Parse(File.ReadAllText(Path.Combine(Program.Repo,"gallery/src/official-view-command.json")));
 public ProbeApplication(){InitializeComponent();UnhandledException+=(_,e)=>{File.WriteAllText(Path.Combine(Program.Output,"error.txt"),e.Exception.ToString());e.Handled=true;Exit();};}
 protected override void OnLaunched(LaunchActivatedEventArgs args){window=new Window{Title="Fixed Gallery view/command examples",Content=root};window.AppWindow.ResizeClient(new SizeInt32(688,848));root.Loaded+=async(_,_)=>await Run();window.Activate();}
 static IEnumerable<DependencyObject> Tree(DependencyObject o){yield return o;for(int i=0;i<VisualTreeHelper.GetChildrenCount(o);i++)foreach(var c in Tree(VisualTreeHelper.GetChild(o,i)))yield return c;}
 object Bounds(FrameworkElement e){var p=e.TransformToVisual(root).TransformPoint(new(0,0));return new{x=p.X,y=p.Y,width=e.ActualWidth,height=e.ActualHeight};}
 XElement Clean(XElement source){var node=new XElement(source);foreach(var n in node.DescendantsAndSelf())foreach(var a in n.Attributes().ToArray()){
  if(a.IsNamespaceDeclaration)continue;
  if(a.Name==X+"DataType"||a.Name==X+"Class"||a.Name.LocalName=="Ignorable"||a.Name.NamespaceName.Contains("blend")||new[]{"Loaded","GotFocus","ItemClick","ContainerContentChanging","PointerEntered","PointerExited","ExecuteRequested","SelectionChanged","Checked","Unchecked","Toggled"}.Contains(a.Name.LocalName)){a.Remove();continue;}
  if(a.Value.StartsWith("{x:Bind")){var path=a.Value[7..].Trim().TrimEnd('}').Split(',')[0].Trim();if(new[]{"ItemsSource","Source"}.Contains(a.Name.LocalName)){a.Remove();continue;}if(path.Contains("Group").ToString()=="True")path="Group.Title";a.Value="{Binding "+path+"}";}
 }return node;}
 FrameworkElement Create(string kind,int index){
  var live=Clean(XElement.Parse(source.RootElement.GetProperty("controls").GetProperty(kind).GetProperty("samples")[index].GetProperty("runtimeXaml").GetString()!));
  var page=XElement.Load(Path.Combine(Program.Repo,$"references/gallery-input/{kind}/{kind}Page.xaml"));
  var resources=page.Element(P+"Page.Resources");var wrapper=new XElement(P+"Grid",new XAttribute("Width",640),new XAttribute(XNamespace.Xmlns+"x",X.NamespaceName));
  if(resources!=null){var values=resources.Elements().Where(n=>n.Name.LocalName!="CollectionViewSource").Select(Clean);wrapper.Add(new XElement(P+"Grid.Resources",values));}wrapper.Add(live);
  if(kind=="ParallaxView")wrapper.SetAttributeValue("Height",600);
  return (FrameworkElement)XamlReader.Load(wrapper.ToString());
 }
 async Task Capture(string id,FrameworkElement control){root.Children.Clear();var c=new Canvas();root.Children.Add(c);c.Children.Add(control);Canvas.SetLeft(control,24);Canvas.SetTop(control,24);root.UpdateLayout();await Task.Delay(550);
  var bitmap=new RenderTargetBitmap();await bitmap.RenderAsync(root,688,848);var folder=await StorageFolder.GetFolderFromPathAsync(Program.Output);var file=await folder.CreateFileAsync(id+".png",CreationCollisionOption.ReplaceExisting);using(var stream=await file.OpenAsync(FileAccessMode.ReadWrite)){var enc=await BitmapEncoder.CreateAsync(BitmapEncoder.PngEncoderId,stream);enc.SetPixelData(BitmapPixelFormat.Bgra8,BitmapAlphaMode.Premultiplied,(uint)bitmap.PixelWidth,(uint)bitmap.PixelHeight,96,96,(await bitmap.GetPixelsAsync()).ToArray());await enc.FlushAsync();}
  cases.Add(new{id,rect=Bounds(control),parts=Tree(control).OfType<FrameworkElement>().Select(e=>new{type=e.GetType().Name,name=e.Name,rect=Bounds(e),text=(e as TextBlock)?.Text,visible=e.Visibility.ToString()}).ToArray()});
 }
 async Task Run(){try{
  var groups=new ObservableCollection<Group>(source.RootElement.GetProperty("data").GetProperty("Groups").EnumerateArray().Select(g=>new Group{UniqueId=g.GetProperty("UniqueId").GetString()!,Title=g.GetProperty("Title").GetString()!,Items=new(g.GetProperty("Items").EnumerateArray().Select(i=>new Item{UniqueId=i.GetProperty("UniqueId").GetString()!,Title=i.GetProperty("Title").GetString()!,Subtitle=i.GetProperty("Subtitle").GetString()!}))}));
  foreach(var theme in new[]{ElementTheme.Light,ElementTheme.Dark}){
   root.RequestedTheme=theme;root.Background=new SolidColorBrush(theme==ElementTheme.Light?Windows.UI.Color.FromArgb(255,255,255,255):Windows.UI.Color.FromArgb(255,32,32,32));
   foreach(var kind in new[]{"SplitView","SemanticZoom","ParallaxView","XamlUICommand","StandardUICommand"})for(int index=0;index<(kind=="ParallaxView"?2:1);index++){
    var control=Create(kind,index);var tree=Tree(control).ToArray();
    if(kind=="SplitView"){
     var split=tree.OfType<SplitView>().Single();split.DisplayMode=SplitViewDisplayMode.Inline;split.IsPaneOpen=true;split.OpenPaneLength=256;split.CompactPaneLength=48;
     var nav=((Grid)split.Pane).Children.OfType<ListView>().Single();nav.ItemsSource=new[]{new Item{Label="People",Symbol=Symbol.People},new Item{Label="Globe",Symbol=Symbol.Globe},new Item{Label="Message",Symbol=Symbol.Message},new Item{Label="Mail",Symbol=Symbol.Mail}};nav.ItemTemplate=(DataTemplate)((Grid)control).Resources["LeftIconNavLinkItemTemplate"];
    }else if(kind=="SemanticZoom"){
     var zoom=tree.OfType<SemanticZoom>().Single();var cvs=new CollectionViewSource{Source=groups,IsSourceGrouped=true,ItemsPath=new PropertyPath("Items")};((GridView)zoom.ZoomedInView).ItemsSource=cvs.View;((ListView)zoom.ZoomedOutView).ItemsSource=cvs.View.CollectionGroups;
    }else if(kind=="ParallaxView"){
     foreach(var image in tree.OfType<Image>())image.Source=new BitmapImage(new Uri(Path.Combine(Program.Repo,"gallery/public/official/parallax-cliff.jpg")));
     var list=tree.OfType<ListView>().FirstOrDefault();if(list!=null)list.ItemsSource=groups.SelectMany(g=>g.Items).OrderBy(i=>i.Title).ToArray();
    }else if(kind=="XamlUICommand"){
     var cmd=new XamlUICommand{Label="Custom XamlUICommand",Description="This is a custom command",IconSource=new SymbolIconSource{Symbol=Symbol.Favorite}};cmd.KeyboardAccelerators.Add(new KeyboardAccelerator{Key=Windows.System.VirtualKey.D,Modifiers=Windows.System.VirtualKeyModifiers.Control});tree.OfType<AppBarButton>().Single().Command=cmd;
    }else{
     var cmd=new StandardUICommand(StandardUICommandKind.Delete);var list=tree.OfType<ListView>().Single();list.ItemsSource=new ObservableCollection<Item>(Enumerable.Range(0,15).Select(i=>new Item{Text="List item "+i,Command=cmd}));
     var bar=tree.OfType<MenuBar>().Single();((MenuFlyoutItem)bar.Items[1].Items[0]).Command=cmd;
    }
    await Capture($"{theme}-{kind}-{index}",control);
   }
  }
  File.WriteAllText(Path.Combine(Program.Output,"complete.json"),JsonSerializer.Serialize(new{cases,sourceCommit=source.RootElement.GetProperty("commit").GetString(),runtime=typeof(SplitView).Assembly.FullName},new JsonSerializerOptions{WriteIndented=true}));Exit();
 }catch(Exception e){File.WriteAllText(Path.Combine(Program.Output,"error.txt"),e.ToString());Exit();}}
}
