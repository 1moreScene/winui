using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Markup;
using Microsoft.UI.Xaml.Media;
using System.Text.Json;
using System.Xml.Linq;
using Windows.Foundation;
namespace MotionGalleryProbe;
static class Program {
 public static string Repo="",Output="";
 [STAThread] static void Main(string[] args){Repo=Path.GetFullPath(args[0]);Output=Path.GetFullPath(args[1]);Directory.CreateDirectory(Output);Application.Start(_=>{SynchronizationContext.SetSynchronizationContext(new Microsoft.UI.Dispatching.DispatcherQueueSynchronizationContext(Microsoft.UI.Dispatching.DispatcherQueue.GetForCurrentThread()));new ProbeApplication();});}
}
public partial class ProbeApplication:Application {
 readonly Grid root=new();Window window=null!;readonly List<object> cases=[];
 static readonly XNamespace P="http://schemas.microsoft.com/winfx/2006/xaml/presentation",X="http://schemas.microsoft.com/winfx/2006/xaml";
 public ProbeApplication(){InitializeComponent();UnhandledException+=(_,e)=>{File.WriteAllText(Path.Combine(Program.Output,"error.txt"),e.Exception.ToString());e.Handled=true;Exit();};}
 protected override void OnLaunched(LaunchActivatedEventArgs e){window=new Window{Content=root,Title="Pinned motion Gallery geometry probe"};root.Loaded+=async(_,_)=>await Run();window.Activate();}
 static IEnumerable<FrameworkElement> Tree(DependencyObject root){if(root is FrameworkElement f)yield return f;for(int i=0;i<VisualTreeHelper.GetChildrenCount(root);i++)foreach(var child in Tree(VisualTreeHelper.GetChild(root,i)))yield return child;}
 static XElement Clean(XElement element){var copy=new XElement(element);foreach(var n in copy.DescendantsAndSelf())foreach(var a in n.Attributes().ToArray()){
  if(a.IsNamespaceDeclaration)continue;
  if(new[]{"Loaded","ValueChanged","PointerEntered","PointerExited","Click","ItemClick","IsTextTrimmedChanged"}.Contains(a.Name.LocalName)){a.Remove();continue;}
  if(a.Value.StartsWith("{x:Bind"))a.Value=a.Name.LocalName=="FontSize"?"12":"0";
 }return copy;}
 static FrameworkElement Load(XElement node){var wrap=new XElement(P+"Grid",new XAttribute(XNamespace.Xmlns+"x",X.NamespaceName),Clean(node));var g=(Grid)XamlReader.Load(wrap.ToString());var child=(FrameworkElement)g.Children[0];g.Children.Clear();return child;}
 object Bounds(FrameworkElement f){var point=f.TransformToVisual(root).TransformPoint(new(0,0));return new{x=point.X,y=point.Y,width=f.ActualWidth,height=f.ActualHeight};}
 async Task Run(){try{
  var page=XElement.Load(Path.Combine(Program.Repo,"references/gallery-motion/XamlCompInterop/XamlCompInteropPage.xaml"));var examples=page.Descendants().Where(n=>n.Name.LocalName=="ControlExample").ToArray();
  foreach(var width in new[]{640d,1143d})for(int index=0;index<examples.Length;index++){
   root.Children.Clear();root.Width=width;root.Height=800;root.RequestedTheme=ElementTheme.Light;
   var example=examples[index];var live=example.Elements().First(n=>!n.Name.LocalName.Contains('.'));var content=Load(live);
   var optionsNode=example.Elements().FirstOrDefault(n=>n.Name.LocalName=="ControlExample.Options");var shell=new Grid{Width=width,HorizontalAlignment=HorizontalAlignment.Left,VerticalAlignment=VerticalAlignment.Top};shell.ColumnDefinitions.Add(new ColumnDefinition());shell.ColumnDefinitions.Add(new ColumnDefinition{Width=GridLength.Auto,MaxWidth=320});
   var preview=new ContentPresenter{Content=content,Padding=new Thickness(12),HorizontalContentAlignment=HorizontalAlignment.Left,VerticalContentAlignment=VerticalAlignment.Top};shell.Children.Add(preview);
   if(optionsNode!=null){var options=Load(optionsNode.Elements().Single());var presenter=new ContentPresenter{Content=options,Padding=new Thickness(16),BorderThickness=new Thickness(1,0,0,0)};Grid.SetColumn(presenter,1);shell.Children.Add(presenter);}
   root.Children.Add(shell);root.UpdateLayout();await Task.Delay(80);root.UpdateLayout();
   var slider=new Slider();slider.Measure(new Size(double.PositiveInfinity,double.PositiveInfinity));
   cases.Add(new{width,index,body=Bounds(shell),preview=Bounds(preview),defaultSlider=new{minWidth=slider.MinWidth,desired=slider.DesiredSize,tickPlacement=slider.TickPlacement.ToString()},nodes=Tree(shell).Where(f=>f==content||f is TextBlock or Button or Slider or RadioButtons||!string.IsNullOrEmpty(f.Name)).Select(f=>new{kind=f.GetType().Name,name=f.Name,bounds=Bounds(f),desired=f.DesiredSize,text=(f as TextBlock)?.Text,fontSize=(f as TextBlock)?.FontSize,fontWeight=(f as TextBlock)?.FontWeight.Weight}).ToArray()});
  }
  File.WriteAllText(Path.Combine(Program.Output,"metrics.json"),JsonSerializer.Serialize(new{sdk="2.3.10-experimental",dpi=root.XamlRoot.RasterizationScale,cases},new JsonSerializerOptions{WriteIndented=true}));
 }catch(Exception error){File.WriteAllText(Path.Combine(Program.Output,"error.txt"),error.ToString());}window.Close();Exit();}
}
