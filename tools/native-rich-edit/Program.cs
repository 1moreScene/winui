using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using Microsoft.UI.Text;
using Windows.Graphics;
using Windows.Graphics.Imaging;
using Windows.Storage;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Text.Json;
namespace RichEditProbe;
static class Program {
 public static string Output="";
 [STAThread] static void Main(string[] args) {
  Output=Path.GetFullPath(args[0]);Directory.CreateDirectory(Output);
  WinRT.ComWrappersSupport.InitializeComWrappers();
  Application.Start(_=>{SynchronizationContext.SetSynchronizationContext(new Microsoft.UI.Dispatching.DispatcherQueueSynchronizationContext(Microsoft.UI.Dispatching.DispatcherQueue.GetForCurrentThread()));new ProbeApplication();});
 }
}
public sealed partial class ProbeApplication:Application {
 readonly Grid root=new(){Width=420,Height=320};Window window=null!;readonly List<object> cases=[];
 public ProbeApplication(){InitializeComponent();UnhandledException+=(_,e)=>{File.WriteAllText(Path.Combine(Program.Output,"error.txt"),e.Exception.ToString());e.Handled=true;Exit();};}
 protected override void OnLaunched(LaunchActivatedEventArgs a){window=new Window{Content=root,Title="Pinned RichEditBox probe"};window.AppWindow.ResizeClient(new SizeInt32(420,320));root.Loaded+=async(_,_)=>await Run();window.Activate();}
 static IEnumerable<DependencyObject> Tree(DependencyObject o){yield return o;for(int i=0;i<VisualTreeHelper.GetChildrenCount(o);i++)foreach(var c in Tree(VisualTreeHelper.GetChild(o,i)))yield return c;}
 object Bounds(FrameworkElement e){var p=e.TransformToVisual(root).TransformPoint(new(0,0));return new{x=p.X,y=p.Y,width=e.ActualWidth,height=e.ActualHeight};}
 async Task Capture(string name,RichEditBox e,bool focus=false){
  if(e.Parent is Panel previous)previous.Children.Remove(e);root.Children.Clear();var canvas=new Canvas();root.Children.Add(canvas);canvas.Children.Add(e);Canvas.SetLeft(e,24);Canvas.SetTop(e,24);root.UpdateLayout();if(focus)e.Focus(FocusState.Programmatic);await Task.Delay(150);root.UpdateLayout();
  var bitmap=new RenderTargetBitmap();await bitmap.RenderAsync(root,420,320);var folder=await StorageFolder.GetFolderFromPathAsync(Program.Output);var file=await folder.CreateFileAsync(name+".png",CreationCollisionOption.ReplaceExisting);
  using(var stream=await file.OpenAsync(FileAccessMode.ReadWrite)){var enc=await BitmapEncoder.CreateAsync(BitmapEncoder.PngEncoderId,stream);enc.SetPixelData(BitmapPixelFormat.Bgra8,BitmapAlphaMode.Premultiplied,(uint)bitmap.PixelWidth,(uint)bitmap.PixelHeight,96,96,(await bitmap.GetPixelsAsync()).ToArray());await enc.FlushAsync();}
  string text="";string? mathml=null;try{e.Document.GetText(TextGetOptions.UseCrlf,out text);}catch(ArgumentException){e.Document.GetMathML(out mathml);}
  string? nativeRtf=null;try{e.Document.GetText(TextGetOptions.FormatRtf,out nativeRtf);}catch(ArgumentException){}
  cases.Add(new{name,rect=Bounds(e),e.MinWidth,e.MinHeight,e.Padding,e.FontSize,font=e.FontFamily.Source,e.AcceptsReturn,wrap=e.TextWrapping.ToString(),e.IsSpellCheckEnabled,focus=e.FocusState.ToString(),rasterizationScale=root.XamlRoot.RasterizationScale,cornerRadius=e.CornerRadius,selection=new{e.Document.Selection.StartPosition,e.Document.Selection.EndPosition},text,mathml,nativeRtf,
   parts=Tree(e).OfType<FrameworkElement>().Where(v=>!string.IsNullOrEmpty(v.Name)).Select(v=>new{type=v.GetType().Name,name=v.Name,rect=Bounds(v)}).ToArray()});
  File.WriteAllText(Path.Combine(Program.Output,"partial-results.json"),JsonSerializer.Serialize(new{cases},new JsonSerializerOptions{WriteIndented=true}));
 }
 async Task Run(){try {
  foreach(var theme in new[]{ElementTheme.Light,ElementTheme.Dark}){
   root.RequestedTheme=theme;root.Background=new SolidColorBrush(theme==ElementTheme.Light?Microsoft.UI.Colors.White:Windows.UI.Color.FromArgb(255,32,32,32));
   await Capture($"{theme}-default",new RichEditBox{Width=300,PlaceholderText="Type something here"});
   var repo=Path.GetFullPath(Path.Combine(Program.Output,"..",".."));
   var imported=new RichEditBox{Width=300,Height=160};imported.Document.SetText(TextSetOptions.FormatRtf,File.ReadAllText(Path.Combine(repo,"references/rich-edit/basic.rtf")));await Capture($"{theme}-rtf",imported);
   var interopPath=Path.Combine(repo,"out/rich-edit-formats/interop.rtf");if(File.Exists(interopPath)){var embedded=new RichEditBox{Width=300,Height=180};embedded.Document.SetText(TextSetOptions.FormatRtf,File.ReadAllText(interopPath));await Capture($"{theme}-interop",embedded);}
   var mathRtfPath=Path.Combine(repo,"out/rich-edit-formats/math.rtf");if(File.Exists(mathRtfPath)){var fromRtf=new RichEditBox{Width=300,Height=180,FontSize=24};fromRtf.TextDocument.SetMathMode(RichEditMathMode.MathOnly);fromRtf.Document.SetText(TextSetOptions.FormatRtf,File.ReadAllText(mathRtfPath));await Capture($"{theme}-math-rtf",fromRtf);}
   var equation=new RichEditBox{Width=300,Height=180,FontSize=24};equation.TextDocument.SetMathMode(RichEditMathMode.MathOnly);equation.Document.SetMathML("<math xmlns=\"http://www.w3.org/1998/Math/MathML\"><mfrac><msup><mi>x</mi><mn>2</mn></msup><msqrt><mi>y</mi></msqrt></mfrac></math>");await Capture($"{theme}-mathml",equation);

   var rich=new RichEditBox{Width=300,Height=160,Header="Editor"};rich.Document.SetText(TextSetOptions.None,"Hello bold\nSecond paragraph");rich.Document.Selection.SetRange(6,10);rich.Document.Selection.CharacterFormat.Bold=FormatEffect.On;rich.Document.Selection.CharacterFormat.ForegroundColor=Microsoft.UI.Colors.Red;rich.Document.Selection.CharacterFormat.Size=24;
   await Capture($"{theme}-rich",rich);await Capture($"{theme}-focused",rich,true);rich.IsReadOnly=true;await Capture($"{theme}-readonly",rich);rich.IsEnabled=false;await Capture($"{theme}-disabled",rich);
  }
  File.WriteAllText(Path.Combine(Program.Output,"results.json"),JsonSerializer.Serialize(new{sdk="2.3.10-experimental",runtime=typeof(RichEditBox).Assembly.FullName,cases},new JsonSerializerOptions{WriteIndented=true}));Exit();
 }catch(Exception e){File.WriteAllText(Path.Combine(Program.Output,"error.txt"),e.ToString());Exit();}}
}
