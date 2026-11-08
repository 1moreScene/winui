using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.AnimatedVisuals;
using Microsoft.UI.Xaml.Hosting;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Composition;
using System.Text.Json;
namespace NavigationProbe;
public sealed partial class ProbeApplication {
 IAnimatedVisualSource2 AnimatedSource(string name)=>name switch {
  "Back"=>new AnimatedBackVisualSource(),"ChevronDownSmall"=>new AnimatedChevronDownSmallVisualSource(),"ChevronRightDownSmall"=>new AnimatedChevronRightDownSmallVisualSource(),"ChevronUpDownSmall"=>new AnimatedChevronUpDownSmallVisualSource(),"Find"=>new AnimatedFindVisualSource(),"GlobalNavigationButton"=>new AnimatedGlobalNavigationButtonVisualSource(),"Settings"=>new AnimatedSettingsVisualSource(),_=>throw new Exception("Unknown source")
 };
 async Task RunAnimatedIcons(){try{
  window!.AppWindow.ResizeClient(new Windows.Graphics.SizeInt32((int)Math.Round(1000*root.XamlRoot.RasterizationScale),(int)Math.Round(500*root.XamlRoot.RasterizationScale)));
  var rows=new List<object>();var defaults=new {mirroredWhenRightToLeft=new AnimatedIcon().MirroredWhenRightToLeft,fontMirror=new FontIcon().MirroredWhenRightToLeft,fontScale=new FontIcon().IsTextScaleFactorEnabled};
  foreach(var theme in new[]{"Light","Dark"}){
   root.Children.Clear();root.RequestedTheme=theme=="Light"?ElementTheme.Light:ElementTheme.Dark;root.Background=theme=="Light"?Brush(243,243,243):Brush(32,32,32);var canvas=new Canvas();root.Children.Add(canvas);
   var live=new List<IAnimatedVisual>();var positions=new List<object>();int row=0;
   foreach(var name in new[]{"Back","ChevronDownSmall","ChevronRightDownSmall","ChevronUpDownSmall","Find","GlobalNavigationButton","Settings"}){
    var source=AnimatedSource(name);source.SetColorProperty("Foreground",Windows.UI.Color.FromArgb(255,0,103,192));int column=0;
    foreach(var progress in new[]{0d,.06,.18,.31,.43,.56,.69,.82,.95}){
     var host=new Grid{Width=48,Height=48};Canvas.SetLeft(host,24+column*72);Canvas.SetTop(host,24+row*64);canvas.Children.Add(host);
     var compositor=ElementCompositionPreview.GetElementVisual(host).Compositor;var visual=source.TryCreateAnimatedVisual(compositor,out var diagnostics);visual.RootVisual.Size=visual.Size;ElementCompositionPreview.SetElementChildVisual(host,visual.RootVisual);visual.RootVisual.Properties.InsertScalar("Progress",(float)progress);live.Add(visual);
     positions.Add(new {name,progress,column,row,bounds=new{x=24+column*72,y=24+row*64,width=48,height=48},duration=visual.Duration.TotalMilliseconds,size=new[]{visual.Size.X,visual.Size.Y},markers=source.Markers.ToDictionary(p=>p.Key,p=>p.Value)});column++;
    }row++;
   }
   root.UpdateLayout();await Task.Delay(1200);var image=ScreenPixels();await SaveEffectImage($"{theme}-AnimatedIcons",image.Pixels,image.Width,image.Height);
   rows.Add(new{theme,width=image.Width,height=image.Height,captureScale=image.Width/root.ActualWidth,xamlDpi=root.XamlRoot.RasterizationScale,capture=image.CaptureMode,foreground=image.Foreground,nodes=positions});foreach(var visual in live)visual.Dispose();
  }
  File.WriteAllText(Path.Combine(Program.Output,"animated-icons-metrics.json"),JsonSerializer.Serialize(new{defaults,rows,reference="Pinned SDK direct Composition visuals at frozen source progress, own-window capture; not Store animation present-time acceptance"},EffectsJson));
  File.WriteAllText(Path.Combine(Program.Output,"animated-icons-complete.json"),"{}");
 }catch(Exception e){File.WriteAllText(Path.Combine(Program.Output,"animated-icons-error.txt"),e.ToString());}Exit();}
}
