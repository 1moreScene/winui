using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Data;
using Microsoft.UI.Xaml.Markup;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Text.Json;
using Windows.UI.Core.AnimationMetrics;
namespace NavigationProbe;
public sealed class CollectionProbeGroup:List<CollectionProbeItem>{public string Key{get;set;}="";}
public sealed partial class ProbeApplication{
 async Task RunCollectionsAdvanced(){try{
  var data=JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"collections-data.json"))).RootElement;
  var ir=JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"collections-template.json"))).RootElement;
  var contacts=data.GetProperty("contacts").EnumerateArray().Select(c=>new CollectionProbeItem{Name=c.GetProperty("text").GetString()!,Company=c.GetProperty("company").GetString()!}).ToArray();
  var cases=new List<object>();var palettes=new Dictionary<string,object>();
  var animations=new Dictionary<string,object>();
  foreach(var effect in Enum.GetValues<AnimationEffect>().Where(e=>e.ToString().Contains("Drag")||e.ToString().Contains("Fade")||e.ToString().Contains("List")||e==AnimationEffect.Reposition))foreach(var target in Enum.GetValues<AnimationEffectTarget>()){
   try{var description=new AnimationDescription(effect,target);animations[$"{effect}-{target}"]=description.Animations.Select(a=>new{durationMs=a.Duration.TotalMilliseconds,delayMs=a.Delay.TotalMilliseconds,curve=new[]{a.Control1.X,a.Control1.Y,a.Control2.X,a.Control2.Y},type=a.Type.ToString(),opacity=a is OpacityAnimation o?new{initial=o.InitialOpacity,final=o.FinalOpacity}:null,values=a.GetType().GetProperties().Where(p=>p.Name.StartsWith("Initial")||p.Name.StartsWith("Final")||p.Name=="NormalizedOrigin").ToDictionary(p=>p.Name,p=>p.GetValue(a))}).ToArray();}catch(Exception e){animations[$"{effect}-{target}"]=new{unsupported=e.GetType().Name};}
  }
  File.WriteAllText(Path.Combine(Program.Output,"collections-animation-metrics.json"),JsonSerializer.Serialize(animations,EffectsJson));
  object Bounds(FrameworkElement e){var b=e.TransformToVisual(root).TransformBounds(new Windows.Foundation.Rect(0,0,e.ActualWidth,e.ActualHeight));return new{x=b.X,y=b.Y,width=b.Width,height=b.Height};}
  foreach(var theme in new[]{"Light","Dark"})foreach(var sticky in new[]{false,true})foreach(var offset in new[]{0.0,80.0,220.0}){
   root.Children.Clear();root.RequestedTheme=theme=="Light"?ElementTheme.Light:ElementTheme.Dark;root.Background=theme=="Light"?Brush(243,243,243):Brush(32,32,32);root.Width=1000;root.Height=500;root.Clip=new RectangleGeometry{Rect=new Windows.Foundation.Rect(0,0,1000,500)};
   var swatch=(Border)XamlReader.Load("<Border xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\" Background=\"{ThemeResource ListViewHeaderItemDividerStroke}\"/>");root.Children.Add(swatch);root.UpdateLayout();palettes[theme]=new Dictionary<string,object>{{"ListViewHeaderItemDividerStroke",DescribeButtonBrush(swatch.Background)!},{"GridViewHeaderItemDividerStroke",DescribeButtonBrush(swatch.Background)!}};root.Children.Remove(swatch);
   var groups=new List<CollectionProbeGroup>();foreach(var key in new[]{"A","B","C"}){var g=new CollectionProbeGroup{Key=key};g.AddRange(contacts.Skip(groups.Count*4).Take(4));groups.Add(g);}
   var cvs=new CollectionViewSource{IsSourceGrouped=true,Source=groups};
   var list=(ListView)XamlReader.Load("<ListView xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\" Width=\"400\" Height=\"400\" BorderThickness=\"1\" BorderBrush=\"{ThemeResource ControlStrongStrokeColorDefaultBrush}\"/>");
   list.ItemsSource=cvs.View;list.ItemTemplate=(DataTemplate)XamlReader.Load(ir.GetProperty("sampleTemplates").GetProperty("ContactListViewTemplate").GetString()!);
   list.ItemsPanel=(ItemsPanelTemplate)XamlReader.Load($"<ItemsPanelTemplate xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\"><ItemsStackPanel AreStickyGroupHeadersEnabled=\"{sticky}\"/></ItemsPanelTemplate>");
   list.GroupStyle.Add(new GroupStyle{HeaderTemplate=(DataTemplate)XamlReader.Load("<DataTemplate xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\"><Border><TextBlock Text=\"{Binding Key}\" Style=\"{ThemeResource TitleTextBlockStyle}\"/></Border></DataTemplate>")});
   var canvas=new Canvas();root.Children.Add(canvas);canvas.Children.Add(list);Canvas.SetLeft(list,24);Canvas.SetTop(list,24);root.UpdateLayout();await Task.Delay(300);
   var viewer=Tree(list).OfType<ScrollViewer>().First();viewer.ChangeView(null,offset,null,true);root.UpdateLayout();await Task.Delay(200);
   var name=$"{theme}-Groups-{sticky}-{offset}";var image=new RenderTargetBitmap();await image.RenderAsync(root,1000,500);await SaveEffectImage(name,(await image.GetPixelsAsync()).ToArray(),(uint)image.PixelWidth,(uint)image.PixelHeight);
   var parts=Tree(list).OfType<FrameworkElement>().Select(e=>new{type=e.GetType().Name,name=e.Name,bounds=Bounds(e),margin=new[]{e.Margin.Left,e.Margin.Top,e.Margin.Right,e.Margin.Bottom},text=e is TextBlock t?t.Text:null,baseline=e is TextBlock tb?tb.BaselineOffset:0,fontSize=e is TextBlock ft?ft.FontSize:0,fontFamily=e is TextBlock ff?ff.FontFamily.Source:null}).ToArray();var panel=(ItemsStackPanel)list.ItemsPanelRoot;
   cases.Add(new{theme,sticky,offset,actualOffset=viewer.VerticalOffset,extent=viewer.ExtentHeight,bounds=Bounds(list),panelPadding=new[]{panel.GroupPadding.Left,panel.GroupPadding.Top,panel.GroupPadding.Right,panel.GroupPadding.Bottom},parts});
  }
  File.WriteAllText(Path.Combine(Program.Output,"collections-advanced-metrics.json"),JsonSerializer.Serialize(new{dpi=root.XamlRoot.RasterizationScale,cases},EffectsJson));File.WriteAllText(Path.Combine(Program.Output,"collections-advanced-palettes.json"),JsonSerializer.Serialize(palettes,EffectsJson));File.WriteAllText(Path.Combine(Program.Output,"collections-advanced-complete.json"),"{}");
 }catch(Exception e){File.WriteAllText(Path.Combine(Program.Output,"collections-advanced-error.txt"),e.ToString());}Exit();}
}
