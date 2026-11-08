using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Markup;
using Microsoft.UI.Xaml.Media.Imaging;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Text.Json;
namespace NavigationProbe;
public sealed partial class ProbeApplication {
 async Task RunOverlays(){try{
  window!.AppWindow.ResizeClient(new Windows.Graphics.SizeInt32((int)Math.Round(1000*root.XamlRoot.RasterizationScale),(int)Math.Round(500*root.XamlRoot.RasterizationScale)));
  var palettes=new Dictionary<string,object>();var matrix=new List<object>();var surfaces=new List<object>();
  var aliases=JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"overlay-template.json"))).RootElement.GetProperty("aliases").GetProperty("Light");
  foreach(var theme in new[]{"Light","Dark"}){
   root.Children.Clear();root.RequestedTheme=theme=="Light"?ElementTheme.Light:ElementTheme.Dark;root.Background=theme=="Light"?Brush(243,243,243):Brush(32,32,32);
   var colors=new Dictionary<string,object>();
   foreach(var property in aliases.EnumerateObject().Where(p=>p.Name.StartsWith("Slider")||p.Name.StartsWith("ToolTip")||p.Name.StartsWith("Flyout")||p.Name.StartsWith("MenuFlyout"))){
    try{var b=(Border)XamlReader.Load($"<Border xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\" Background=\"{{ThemeResource {property.Name}}}\"/>");root.Children.Add(b);root.UpdateLayout();var value=DescribeButtonBrush(b.Background);if(value!=null)colors[property.Name]=value;root.Children.Remove(b);}catch{ /* Some legacy aliases are not brushes in this SDK. */ }
   }palettes[theme]=colors;File.WriteAllText(Path.Combine(Program.Output,"overlay-palettes.json"),JsonSerializer.Serialize(palettes,EffectsJson));
   root.Children.Clear();var canvas=new Canvas();root.Children.Add(canvas);int index=0;
   foreach(var orientation in new[]{Orientation.Horizontal,Orientation.Vertical})foreach(var value in new[]{0d,50d,100d})foreach(var state in new[]{"Normal","PointerOver","Pressed","Disabled"}){
    var slider=new Slider{Minimum=0,Maximum=100,Value=value,Orientation=orientation,Width=orientation==Orientation.Horizontal?180:32,Height=orientation==Orientation.Horizontal?32:140,IsEnabled=state!="Disabled",IsThumbToolTipEnabled=false};
    canvas.Children.Clear();var x=24;var y=24;Canvas.SetLeft(slider,x);Canvas.SetTop(slider,y);canvas.Children.Add(slider);root.UpdateLayout();
    VisualStateManager.GoToState(slider,state,false);var thumb=Tree(slider).OfType<Thumb>().First(e=>e.Name==(orientation==Orientation.Horizontal?"HorizontalThumb":"VerticalThumb"));VisualStateManager.GoToState(thumb,state,false);root.UpdateLayout();
    root.UpdateLayout();await Task.Delay(280);var isolated=new RenderTargetBitmap();await isolated.RenderAsync(root);await SaveEffectImage($"{theme}-Slider-{index}",(await isolated.GetPixelsAsync()).ToArray(),(uint)isolated.PixelWidth,(uint)isolated.PixelHeight);
    matrix.Add(new{theme,index,props=new{width=slider.Width,height=slider.Height,value,minimum=0,maximum=100,orientation=orientation.ToString(),state,enabled=slider.IsEnabled},bounds=Rect(slider),thumb=Rect(thumb),track=Rect(Tree(slider).OfType<FrameworkElement>().First(e=>e.Name==(orientation==Orientation.Horizontal?"HorizontalTrackRect":"VerticalTrackRect"))),desired=new[]{slider.DesiredSize.Width,slider.DesiredSize.Height}});index++;
   }
   await Task.Delay(600);var image=new RenderTargetBitmap();await image.RenderAsync(root);await SaveEffectImage($"{theme}-Sliders",(await image.GetPixelsAsync()).ToArray(),(uint)image.PixelWidth,(uint)image.PixelHeight);
   root.Children.Clear();var owner=new Grid{Width=120,Height=32,HorizontalAlignment=HorizontalAlignment.Left,VerticalAlignment=VerticalAlignment.Top,Margin=new Thickness(300,220,0,0)};root.Children.Add(owner);
   var popup=new Popup{Child=new Border{Width=240,Height=90,Background=Brush(255,255,255)},HorizontalOffset=200,VerticalOffset=20};owner.Children.Add(popup);popup.IsOpen=true;root.UpdateLayout();await Task.Delay(400);
   surfaces.Add(new{theme,kind="Popup",bounds=Rect((FrameworkElement)popup.Child),owner=Rect(owner)});popup.IsOpen=false;
   var tip=new ToolTip{Content="ToolTip content",PlacementTarget=owner,Placement=PlacementMode.Top};ToolTipService.SetToolTip(owner,tip);tip.XamlRoot=root.XamlRoot;root.UpdateLayout();tip.IsOpen=true;root.UpdateLayout();await Task.Delay(550);
   surfaces.Add(new{theme,kind="ToolTip",bounds=Rect(tip),padding=tip.Padding,fontSize=tip.FontSize,cornerRadius=tip.CornerRadius});tip.IsOpen=false;ToolTipService.SetToolTip(owner,null);
   var flyout=new Flyout{Content=new TextBlock{Text="Flyout content"},Placement=FlyoutPlacementMode.Top};flyout.ShowAt(owner);root.UpdateLayout();await Task.Delay(550);
   var presenter=VisualTreeHelper.GetOpenPopupsForXamlRoot(root.XamlRoot).SelectMany(p=>Tree(p.Child)).OfType<FlyoutPresenter>().First();surfaces.Add(new{theme,kind="Flyout",bounds=Rect(presenter),padding=presenter.Padding,minWidth=presenter.MinWidth,maxWidth=presenter.MaxWidth,cornerRadius=presenter.CornerRadius});flyout.Hide();
   var menu=new MenuFlyout();menu.Items.Add(new MenuFlyoutItem{Text="Open"});menu.Items.Add(new ToggleMenuFlyoutItem{Text="Option",IsChecked=true});menu.Items.Add(new MenuFlyoutSeparator());menu.Items.Add(new MenuFlyoutItem{Text="Disabled",IsEnabled=false});menu.ShowAt(owner);root.UpdateLayout();await Task.Delay(550);
   var mp=VisualTreeHelper.GetOpenPopupsForXamlRoot(root.XamlRoot).SelectMany(p=>Tree(p.Child)).OfType<MenuFlyoutPresenter>().First();surfaces.Add(new{theme,kind="MenuFlyout",bounds=Rect(mp),padding=mp.Padding,items=menu.Items.Select(e=>new{kind=e.GetType().Name,bounds=Rect(e),desired=new[]{e.DesiredSize.Width,e.DesiredSize.Height}}).ToArray()});menu.Hide();
  }
  File.WriteAllText(Path.Combine(Program.Output,"overlay-palettes.json"),JsonSerializer.Serialize(palettes,EffectsJson));
  File.WriteAllText(Path.Combine(Program.Output,"overlay-metrics.json"),JsonSerializer.Serialize(new{dpi=root.XamlRoot.RasterizationScale,matrix,surfaces,reference="Pinned SDK probe; static forced states and geometry. Popup Composition and Store release timing remain separate acceptance."},EffectsJson));
  File.WriteAllText(Path.Combine(Program.Output,"overlays-complete.json"),"{}");
 }catch(Exception e){File.WriteAllText(Path.Combine(Program.Output,"overlays-error.txt"),e.ToString());}Exit();}
}
