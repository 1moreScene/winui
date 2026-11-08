using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using System.Text.Json;
namespace NavigationProbe;
public sealed partial class ProbeApplication {
 async Task CaptureRawAppBackdrop(){
  var records=new List<object>();
  foreach(var pattern in new[]{"Edge","Stripes"}){
   root.Children.Clear();root.RequestedTheme=ElementTheme.Light;root.Background=Brush(0,0,0);
   var canvas=new Canvas();root.Children.Add(canvas);
   if(pattern=="Edge"){
    var white=new Border{Width=500,Height=500,Background=Brush(255,255,255)};Canvas.SetLeft(white,500);canvas.Children.Add(white);
   }else for(int x=0;x<1000;x+=40){var stripe=new Border{Width=40,Height=500,Background=x%80==0?Brush(255,255,255):Brush(0,0,0)};Canvas.SetLeft(stripe,x);canvas.Children.Add(stripe);}
   var acrylic=new AcrylicBrush{TintColor=Windows.UI.Color.FromArgb(255,0,0,0),TintOpacity=0,TintLuminosityOpacity=0,FallbackColor=Windows.UI.Color.FromArgb(255,0,0,0)};
   var panel=new Border{Width=800,Height=300,Background=acrylic};Canvas.SetLeft(panel,100);Canvas.SetTop(panel,100);canvas.Children.Add(panel);
   root.UpdateLayout();await Task.Delay(400);
   var shot=ScreenPixels();var name="RawAppBackdrop-"+pattern;await SaveEffectImage(name,shot.Pixels,shot.Width,shot.Height);
   records.Add(new{name,pattern,bounds=Rect(panel),dpi=root.XamlRoot.RasterizationScale,brush=DescribeButtonBrush(acrylic),shot.CaptureMode,shot.Foreground});
  }
  File.WriteAllText(Path.Combine(Program.Output,"app-backdrop-kernel.json"),JsonSerializer.Serialize(records,EffectsJson));
 }
}
