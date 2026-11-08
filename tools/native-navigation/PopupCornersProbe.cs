using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Markup;
using Microsoft.UI.Xaml.Media;
using System.Text.Json;
namespace NavigationProbe;
public sealed partial class ProbeApplication {
 async Task CapturePopupCornerMaterials(){
  var cases=new (string Name,double[] Radii,double[] Stroke)[]{
   ("Different",new[]{24d,8,20,4},new[]{1d,2,3,4}),
   ("LargeTopLeft",new[]{80d,0,0,0},new[]{0d,0,0,0}),
   ("SquareAndRound",new[]{0d,24,0,40},new[]{1d,1,1,1}),
   ("Normalized",new[]{160d,120,80,40},new[]{2d,2,2,2}),
  };
  var records=new List<object>();
  foreach(var theme in new[]{"Light","Dark"})foreach(var item in cases)foreach(var fallback in new[]{false,true}){
   root.Children.Clear();root.RequestedTheme=theme=="Light"?ElementTheme.Light:ElementTheme.Dark;root.Background=theme=="Light"?Brush(243,243,243):Brush(32,32,32);
   var border=(Border)XamlReader.Load("<Border xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\" Width=\"200\" Height=\"120\" Background=\"{ThemeResource FlyoutPresenterBackground}\" BorderBrush=\"{ThemeResource FlyoutBorderThemeBrush}\"/>");
   border.RequestedTheme=root.RequestedTheme;border.CornerRadius=new CornerRadius(item.Radii[0],item.Radii[1],item.Radii[2],item.Radii[3]);border.BorderThickness=new Thickness(item.Stroke[0],item.Stroke[1],item.Stroke[2],item.Stroke[3]);
   var popup=new Popup{Child=border,HorizontalOffset=40,VerticalOffset=40};root.Children.Add(popup);popup.IsOpen=true;root.UpdateLayout();
   var original=(AcrylicBrush)border.Background;
   border.Background=new AcrylicBrush{TintColor=original.TintColor,TintOpacity=original.TintOpacity,TintLuminosityOpacity=original.TintLuminosityOpacity,FallbackColor=original.FallbackColor,AlwaysUseFallback=fallback};
   await Task.Delay(300);root.UpdateLayout();
   var name=$"PopupCorners-{theme}-{item.Name}-{fallback}";var shot=ScreenPixels();await SaveEffectImage(name,shot.Pixels,shot.Width,shot.Height);
   records.Add(new{name,theme,fallback,radii=item.Radii,stroke=item.Stroke,bounds=Rect(border),brush=DescribeButtonBrush(border.Background),dpi=root.XamlRoot.RasterizationScale,shot.CaptureMode,shot.Foreground});
   popup.IsOpen=false;await Task.Delay(30);
  }
  File.WriteAllText(Path.Combine(Program.Output,"popup-corner-materials.json"),JsonSerializer.Serialize(records,EffectsJson));
 }
}
