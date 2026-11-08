using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using System.Text.Json;
namespace NavigationProbe;
public sealed partial class ProbeApplication {
 [System.Runtime.InteropServices.DllImport("user32.dll")] static extern uint GetDpiForWindow(IntPtr hwnd);
 async Task RunTextCoverage(){try{
  window!.AppWindow.ResizeClient(new Windows.Graphics.SizeInt32((int)Math.Round(1000*root.XamlRoot.RasterizationScale),(int)Math.Round(500*root.XamlRoot.RasterizationScale)));
  var rows=new List<object>();
  foreach(var theme in new[]{"Light","Dark"}){
   root.Children.Clear();root.RequestedTheme=theme=="Light"?ElementTheme.Light:ElementTheme.Dark;root.Background=theme=="Light"?Brush(251,251,251):Brush(44,44,44);
   var canvas=new Canvas();root.Children.Add(canvas);var entries=new List<(TextBlock Block,string Family,double Size,string Trimming)>();int index=0;
   foreach(var family in new[]{"Segoe UI","Arial","Segoe Fluent Icons"})foreach(var size in new[]{8d,11d,12d,14d,16d,20d,28d})foreach(var trimming in new[]{"None","Clip"}){
    var text=new TextBlock{Text="Open",FontFamily=new FontFamily(family),FontSize=size,TextTrimming=trimming=="Clip"?TextTrimming.Clip:TextTrimming.None,Foreground=theme=="Light"?Brush(0,0,0,228):Brush(255,255,255)};
    Canvas.SetLeft(text,10+index%6*160);Canvas.SetTop(text,10+index/6*65);canvas.Children.Add(text);entries.Add((text,family,size,trimming));index++;
   }
   root.UpdateLayout();await Task.Delay(250);var shot=ScreenPixels();var name="TextCoverage-"+theme;await SaveEffectImage(name,shot.Pixels,shot.Width,shot.Height);
   var captureScale=shot.Width/root.ActualWidth;var dpi=root.XamlRoot.RasterizationScale;
   if(Math.Abs(captureScale-dpi)>.001)throw new Exception($"Capture/XAML DPI disagreement: {captureScale} vs {dpi}");
   rows.Add(new{name,theme,dpi,captureScale,win32Dpi=GetDpiForWindow(WinRT.Interop.WindowNative.GetWindowHandle(window!)),shot.CaptureMode,shot.Foreground,entries=entries.Select(e=>new{family=e.Family,fontSize=e.Size,trimming=e.Trimming,bounds=Rect(e.Block),baseline=e.Block.BaselineOffset,desired=new[]{e.Block.DesiredSize.Width,e.Block.DesiredSize.Height}}).ToArray()});
  }
  File.WriteAllText(Path.Combine(Program.Output,"text-coverage-native.json"),JsonSerializer.Serialize(new{rows,boundary="Actual TextBlock foreground-client screen pixels; same SDK, own window, requested fonts and None/Clip paths."},EffectsJson));
  File.WriteAllText(Path.Combine(Program.Output,"text-coverage-complete.json"),"{}");
 }catch(Exception e){File.WriteAllText(Path.Combine(Program.Output,"text-coverage-error.txt"),e.ToString());}Exit();}
}
