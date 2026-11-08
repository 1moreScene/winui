using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Markup;
using System.Numerics;
using System.Text.Json;
namespace NavigationProbe;
public sealed partial class ProbeApplication {
 async Task RunOverlayPresentation(){try{
  window!.AppWindow.ResizeClient(new Windows.Graphics.SizeInt32((int)Math.Round(1000*root.XamlRoot.RasterizationScale),(int)Math.Round(500*root.XamlRoot.RasterizationScale)));
  var rows=new List<object>();
  foreach(var theme in new[]{"Light","Dark"})foreach(var z in new[]{16f,32f}) {
   root.Children.Clear();root.RequestedTheme=theme=="Light"?ElementTheme.Light:ElementTheme.Dark;
   root.Background=theme=="Light"?Brush(243,243,243):Brush(32,32,32);
   var canvas=new Canvas();root.Children.Add(canvas);
   var caster=(Border)XamlReader.Load("<Border xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\" Width=\"240\" Height=\"120\" CornerRadius=\"8\" BorderThickness=\"1\" BorderBrush=\"{ThemeResource SurfaceStrokeColorFlyoutBrush}\" BackgroundSizing=\"InnerBorderEdge\"/>");caster.Background=theme=="Light"?Brush(249,249,249):Brush(44,44,44);caster.Shadow=new ThemeShadow();caster.Translation=new Vector3(0,0,z);
   Canvas.SetLeft(caster,100);Canvas.SetTop(caster,100);canvas.Children.Add(caster);root.UpdateLayout();await Task.Delay(500);
   var image=ScreenPixels();var name=$"{theme}-Shadow-{z}";await SaveEffectImage(name,image.Pixels,image.Width,image.Height);
   rows.Add(new{name,theme,translationZ=z,bounds=Rect(caster),dpi=root.XamlRoot.RasterizationScale,width=image.Width,height=image.Height,capture=image.CaptureMode,border="SurfaceStrokeColorFlyoutBrush / InnerBorderEdge"});
  }
  File.WriteAllText(Path.Combine(Program.Output,"presentation-native.json"),JsonSerializer.Serialize(new{rows,reference="Pinned WinUI ThemeShadow caster, live Composition own-window pixels; platform kernel differences are measured separately."},EffectsJson));
  File.WriteAllText(Path.Combine(Program.Output,"presentation-complete.json"),"{}");
 }catch(Exception e){File.WriteAllText(Path.Combine(Program.Output,"presentation-error.txt"),e.ToString());}Exit();}
}
