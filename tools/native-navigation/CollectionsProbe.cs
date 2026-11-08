using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Shapes;
using Microsoft.UI.Xaml.Markup;
using Microsoft.UI.Xaml.Media.Imaging;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Text.Json;
using Path = System.IO.Path;
namespace NavigationProbe;
public sealed class CollectionProbeItem { public string Name {get;set;}=""; public string Company {get;set;}=""; public string Title {get;set;}=""; public string ImageLocation {get;set;}=""; public string Views {get;set;}=""; public string Likes {get;set;}=""; public string Description {get;set;}=""; }
public sealed partial class ProbeApplication {
 async Task CaptureCollectionIndicatorMotion(string theme){
  root.Children.Clear();root.Height=500;root.Clip=new RectangleGeometry{Rect=new Windows.Foundation.Rect(0,0,1000,500)};
  var canvas=new Canvas();root.Children.Add(canvas);var list=new ListView{Width=240,Height=200,ItemsSource=new[]{"One","Two","Three"},SelectedIndex=1};canvas.Children.Add(list);Canvas.SetLeft(list,24);Canvas.SetTop(list,24);root.UpdateLayout();await Task.Delay(300);
  var item=(Control)list.ContainerFromIndex(1);var records=new List<object>();var clock=System.Diagnostics.Stopwatch.StartNew();var done=new TaskCompletionSource();var stage=-1;
  EventHandler<object>? handler=null;handler=(_,_)=>{
   try{var t=clock.Elapsed.TotalMilliseconds;var next=t<70?0:t<130?1:t<250?2:3;if(next!=stage){stage=next;VisualStateManager.GoToState(item,stage%2==0?"PressedSelected":"Selected",true);root.UpdateLayout();}
    var indicator=Tree(item).OfType<Border>().FirstOrDefault(b=>b.ActualWidth>2&&b.ActualWidth<4.5&&b.ActualHeight>0&&b.ActualHeight<24);if(indicator!=null){var bounds=indicator.TransformToVisual(root).TransformBounds(new Windows.Foundation.Rect(0,0,indicator.ActualWidth,indicator.ActualHeight));records.Add(new{elapsedMs=t,stage,layoutHeight=indicator.ActualHeight,bounds=new{x=bounds.X,y=bounds.Y,width=bounds.Width,height=bounds.Height},opacity=indicator.Opacity});}if(t>=700){CompositionTarget.Rendering-=handler;done.SetResult();}
   }catch(Exception e){CompositionTarget.Rendering-=handler;done.SetException(e);}
  };CompositionTarget.Rendering+=handler;await done.Task;
  File.WriteAllText(Path.Combine(Program.Output,$"{theme}-collection-indicator-motion.json"),JsonSerializer.Serialize(new{theme,dpi=root.XamlRoot.RasterizationScale,animationsEnabled=new Windows.UI.ViewManagement.UISettings().AnimationsEnabled,actions=new[]{new{timeMs=0,state="PressedSelected"},new{timeMs=70,state="Selected"},new{timeMs=130,state="PressedSelected"},new{timeMs=250,state="Selected"}},records,boundary="Same-SDK VSM input and UI-thread animated geometry; not Store compositor present timestamps"},EffectsJson));
 }
 async Task RunCollections(){try{
  root.Clip=new RectangleGeometry{Rect=new Windows.Foundation.Rect(0,0,1000,500)};
  window!.AppWindow.ResizeClient(new Windows.Graphics.SizeInt32((int)Math.Round(1000*root.XamlRoot.RasterizationScale),(int)Math.Round(500*root.XamlRoot.RasterizationScale)));
  object Bounds(FrameworkElement element){var b=element.TransformToVisual(root).TransformBounds(new Windows.Foundation.Rect(0,0,element.ActualWidth,element.ActualHeight));return new{x=b.X,y=b.Y,width=b.Width,height=b.Height};}
  var ir=JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"collections-template.json"))).RootElement;var palettes=new Dictionary<string,object>();var cases=new List<object>();
  var defaults=new {list=new{selectionMode=new ListView().SelectionMode.ToString(),isItemClickEnabled=new ListView().IsItemClickEnabled},grid=new{selectionMode=new GridView().SelectionMode.ToString(),isItemClickEnabled=new GridView().IsItemClickEnabled},stack=new{orientation=new ItemsStackPanel().Orientation.ToString(),cacheLength=new ItemsStackPanel().CacheLength},wrap=new{orientation=new ItemsWrapGrid().Orientation.ToString(),max=new ItemsWrapGrid().MaximumRowsOrColumns,cacheLength=new ItemsWrapGrid().CacheLength},variable=new{orientation=new VariableSizedWrapGrid().Orientation.ToString(),max=new VariableSizedWrapGrid().MaximumRowsOrColumns}};
  foreach(var theme in new[]{"Light","Dark"}){
   root.Children.Clear();root.RequestedTheme=theme=="Light"?ElementTheme.Light:ElementTheme.Dark;root.Background=theme=="Light"?Brush(243,243,243):Brush(32,32,32);
   var colors=new Dictionary<string,object>();foreach(var key in ir.GetProperty("brushes").EnumerateArray().Select(x=>x.GetString()!).Concat(new[]{"ListViewItemBackground","ListViewItemForeground","GridViewItemBackground","GridViewItemForeground"}).Distinct()){
    var b=(Border)XamlReader.Load($"<Border xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\" Background=\"{{ThemeResource {key}}}\"/>");root.Children.Add(b);root.UpdateLayout();colors[key]=DescribeButtonBrush(b.Background)??throw new Exception("Missing brush "+key);root.Children.Remove(b);
   }palettes[theme]=colors;
   async Task Add(string kind,int index,FrameworkElement e,object input,string? state=null){
    root.Children.Clear();var canvas=new Canvas();root.Children.Add(canvas);Canvas.SetLeft(e,24);Canvas.SetTop(e,24);canvas.Children.Add(e);root.UpdateLayout();await Task.Delay(120);
    if(e is ListViewBase list){if(index%2==1)list.SelectedIndex=1;list.UpdateLayout();if(!list.IsEnabled){list.IsEnabled=true;list.UpdateLayout();list.IsEnabled=false;list.UpdateLayout();}if(state!=null){var item=(Control)list.ContainerFromIndex(index%2==1?1:0);VisualStateManager.GoToState(item,state,false);}if(!list.IsEnabled)foreach(var container in Tree(list).OfType<SelectorItem>()){VisualStateManager.GoToState(container,"Enabled",false);VisualStateManager.GoToState(container,"Disabled",false);}root.UpdateLayout();}
    var captureHeight=Math.Max(500,(int)Math.Ceiling(48+e.ActualHeight));root.Height=captureHeight;root.Clip=new RectangleGeometry{Rect=new Windows.Foundation.Rect(0,0,1000,captureHeight)};window!.AppWindow.ResizeClient(new Windows.Graphics.SizeInt32((int)Math.Round(1000*root.XamlRoot.RasterizationScale),(int)Math.Round(captureHeight*root.XamlRoot.RasterizationScale)));root.UpdateLayout();
    await Task.Delay(500);var image=new RenderTargetBitmap();await image.RenderAsync(root,1000,captureHeight);await SaveEffectImage($"{theme}-{kind}-{index}",(await image.GetPixelsAsync()).ToArray(),(uint)image.PixelWidth,(uint)image.PixelHeight);
    var parts=Tree(e).OfType<FrameworkElement>().Select(p=>new{name=p.Name,type=p.GetType().Name,bounds=Bounds(p),opacity=p.Opacity,text=p is TextBlock t?t.Text:null,fontSize=p is TextBlock ft?ft.FontSize:0,padding=p is Control c?new[]{c.Padding.Left,c.Padding.Top,c.Padding.Right,c.Padding.Bottom}:null,margin=new[]{p.Margin.Left,p.Margin.Top,p.Margin.Right,p.Margin.Bottom},borderThickness=p is Border b?new[]{b.BorderThickness.Left,b.BorderThickness.Top,b.BorderThickness.Right,b.BorderThickness.Bottom}:null,minWidth=p.MinWidth,minHeight=p.MinHeight}).ToArray();
    cases.Add(new{theme,kind,index,input,bounds=Bounds(e),desired=new[]{e.DesiredSize.Width,e.DesiredSize.Height},capture=new{rootWidth=root.ActualWidth,rootHeight=root.ActualHeight,pixelWidth=image.PixelWidth,pixelHeight=image.PixelHeight,viewportClipped=true},parts,selectedIndex=e is ListViewBase l?l.SelectedIndex:-1});
   }
   foreach(var grid in new[]{false,true})for(int i=0;i<10;i++){
    ListViewBase list=grid?new GridView():new ListView();list.Width=grid?260:240;list.Height=200;list.IsItemClickEnabled=true;list.IsEnabled=i<8;list.SelectionMode=i>=6?ListViewSelectionMode.Multiple:ListViewSelectionMode.Single;
    list.ItemsSource=Enumerable.Range(0,20).Select(j=>$"Item {j+1}").ToArray();string state=i switch{2=>"PointerOver",3=>"PointerOverSelected",4=>"Pressed",5=>"PressedSelected",_=>i%2==1?"Selected":"Normal"};
    await Add(grid?"GridView":"ListView",i,list,new{width=list.Width,height=200,state,enabled=list.IsEnabled,selectionMode=list.SelectionMode.ToString(),selectedIndex=i%2==1?1:-1},state);
   }
   var templated=new ListView{Width=240,Height=200,ItemsSource=Enumerable.Range(0,20).Select(j=>$"Item {j+1}").ToArray(),ItemTemplate=(DataTemplate)XamlReader.Load("<DataTemplate xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\"><TextBlock Text=\"{Binding}\" Margin=\"0,5,0,5\"/></DataTemplate>")};await Add("ListTemplate",0,templated,new{width=240,height=200});
   foreach(var orientation in new[]{Orientation.Horizontal,Orientation.Vertical})for(int max=0;max<=3;max+=3){
    var p=new VariableSizedWrapGrid{Width=220,Orientation=orientation,MaximumRowsOrColumns=max,ItemWidth=40,ItemHeight=30};for(int j=0;j<7;j++){var b=new Border{Background=j%2==0?Brush(0,120,212):Brush(255,165,0),Margin=new Thickness(2)};if(j==1)VariableSizedWrapGrid.SetColumnSpan(b,2);if(j==3)VariableSizedWrapGrid.SetRowSpan(b,2);p.Children.Add(b);}await Add("VariableSizedWrapGrid",(orientation==Orientation.Horizontal?0:2)+(max==0?0:1),p,new{orientation=orientation.ToString(),maximumRowsOrColumns=max,itemWidth=40,itemHeight=30,width=220});
   }
   var data=JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"collections-data.json"))).RootElement;
   var contacts=data.GetProperty("contacts").EnumerateArray().Select(c=>new CollectionProbeItem{Name=c.GetProperty("text").GetString()!,Company=c.GetProperty("company").GetString()!}).ToArray();
   var photos=data.GetProperty("photos").EnumerateArray().Select(c=>new CollectionProbeItem{Title=c.GetProperty("text").GetString()!,ImageLocation=new Uri(Path.Combine(AppContext.BaseDirectory,"FoundationAssets",Path.GetFileName(c.GetProperty("image").GetString()!))).AbsoluteUri,Views=c.GetProperty("views").GetString()!,Likes=c.GetProperty("likes").GetString()!,Description=c.GetProperty("description").GetString()!}).ToArray();
   DataTemplate Template(string key)=>(DataTemplate)XamlReader.Load(ir.GetProperty("sampleTemplates").GetProperty(key).GetString()!);
   for(int j=0;j<3;j++){
    var list=(ListView)XamlReader.Load("<ListView xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\" Width=\"400\" Height=\"400\" BorderThickness=\"1\" BorderBrush=\"{ThemeResource ControlStrongStrokeColorDefaultBrush}\"/>");list.ItemsSource=contacts;list.ItemTemplate=Template("ContactListViewTemplate");list.SelectionMode=j==1?ListViewSelectionMode.Multiple:ListViewSelectionMode.Single;list.FlowDirection=j==2?FlowDirection.RightToLeft:FlowDirection.LeftToRight;await Add("GalleryContacts",j,list,new{width=400,height=400,template="ContactListViewTemplate",selectionMode=list.SelectionMode.ToString(),selectedIndex=j==1?1:-1,flowDirection=list.FlowDirection.ToString()});
   }
   foreach(var key in new[]{"ImageTemplate","IconTextTemplate","ImageTextTemplate","TextTemplate"}){
    var grid=new GridView{Width=780,ItemsSource=photos,ItemTemplate=Template(key)};await Add("GalleryGrid-"+key,0,grid,new{width=780,template=key});
   }
   for(int j=1;j<10;j++){
    var grid=new GridView{Width=780,ItemsSource=photos,ItemTemplate=Template("ImageTemplate"),IsEnabled=j!=6&&j!=7,SelectionMode=j>=8?ListViewSelectionMode.Multiple:ListViewSelectionMode.Single};string state=j switch{2=>"PointerOver",3=>"PointerOverSelected",4=>"Pressed",5=>"PressedSelected",_=>j%2==1?"Selected":"Normal"};await Add("GalleryGrid-ImageTemplate",j,grid,new{width=780,template="ImageTemplate",state,enabled=grid.IsEnabled,selectionMode=grid.SelectionMode.ToString(),selectedIndex=j%2==1?1:-1},state);
   }
   for(int j=0;j<3;j++){
    int gap=j==0?5:j==1?0:12,max=j==2?2:3;var grid=new GridView{Width=500,ItemsSource=photos,ItemTemplate=Template("ImageOverlayTemplate")};grid.ItemContainerStyle=(Style)XamlReader.Load($"<Style xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\" TargetType=\"GridViewItem\" BasedOn=\"{{StaticResource DefaultGridViewItemStyle}}\"><Setter Property=\"Margin\" Value=\"{gap}\"/></Style>");grid.ItemsPanel=(ItemsPanelTemplate)XamlReader.Load($"<ItemsPanelTemplate xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\"><ItemsWrapGrid Orientation=\"Horizontal\" MaximumRowsOrColumns=\"{max}\"/></ItemsPanelTemplate>");await Add("GalleryStyledGrid",j,grid,new{width=500,template="ImageOverlayTemplate",gap,maximumRowsOrColumns=max,selectedIndex=j==1?1:-1});
   }
   await CaptureCollectionIndicatorMotion(theme);
   foreach(var wrap in new[]{false,true}){
    var list=new ListView{Width=220,Height=160,ItemsSource=Enumerable.Range(0,12).Select(j=>$"Item {j+1}").ToArray()};list.ItemsPanel=(ItemsPanelTemplate)XamlReader.Load(wrap?"<ItemsPanelTemplate xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\"><ItemsWrapGrid Orientation=\"Horizontal\" ItemWidth=\"60\" ItemHeight=\"40\" MaximumRowsOrColumns=\"3\"/></ItemsPanelTemplate>":"<ItemsPanelTemplate xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\"><ItemsStackPanel Orientation=\"Vertical\"/></ItemsPanelTemplate>");await Add(wrap?"ItemsWrapGrid":"ItemsStackPanel",0,list,new{width=220,height=160});
   }
   var swatches=new GridView{IsItemClickEnabled=true,SelectionMode=ListViewSelectionMode.Single};swatches.ItemsPanel=(ItemsPanelTemplate)XamlReader.Load("<ItemsPanelTemplate xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\"><ItemsWrapGrid MaximumRowsOrColumns=\"3\" Orientation=\"Horizontal\"/></ItemsPanelTemplate>");foreach(var color in new[]{Windows.UI.Color.FromArgb(255,255,0,0),Windows.UI.Color.FromArgb(255,255,165,0),Windows.UI.Color.FromArgb(255,255,255,0),Windows.UI.Color.FromArgb(255,0,128,0),Windows.UI.Color.FromArgb(255,0,0,255),Windows.UI.Color.FromArgb(255,75,0,130),Windows.UI.Color.FromArgb(255,238,130,238),Windows.UI.Color.FromArgb(255,128,128,128)})swatches.Items.Add(new Rectangle{Width=32,Height=32,RadiusX=4,RadiusY=4,Fill=new SolidColorBrush(color)});await Add("SwatchGrid",1,swatches,new{selectedIndex=1});
  }
  File.WriteAllText(Path.Combine(Program.Output,"collections-palettes.json"),JsonSerializer.Serialize(palettes,EffectsJson));File.WriteAllText(Path.Combine(Program.Output,"collections-metrics.json"),JsonSerializer.Serialize(new{dpi=root.XamlRoot.RasterizationScale,defaults,cases,reference="Actual resolved SDK controls/virtual panels and settled forced presenter states; not Store present-time parity"},EffectsJson));File.WriteAllText(Path.Combine(Program.Output,"collections-complete.json"),"{}");
 }catch(Exception e){File.WriteAllText(Path.Combine(Program.Output,"collections-error.txt"),e.ToString());}Exit();}
}
