using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.AnimatedVisuals;
using Microsoft.UI.Xaml.Hosting;
using Microsoft.UI.Xaml.Media;
using Windows.Graphics;
using System.Text.Json;

namespace NavigationProbe;
public sealed partial class ProbeApplication {
    async Task RunAcceptTiming() {
        try {
            root.Width=240; root.Height=96;
            root.Background=Brush(243,243,243); root.RequestedTheme=ElementTheme.Light;
            window!.AppWindow.ResizeClient(new SizeInt32(240,96));
            var canvas=new Canvas(); root.Children.Add(canvas);
            var check=new CheckBox { Content="CheckBox", IsChecked=false, Width=220, Height=32 };
            Canvas.SetLeft(check,12); Canvas.SetTop(check,12); canvas.Children.Add(check);
            await Task.Delay(500);
            var glyph=Tree(check).OfType<AnimatedIcon>().Single();
            var source=(AnimatedAcceptVisualSource)glyph.Source;
            var compositor=ElementCompositionPreview.GetElementVisual(root).Compositor;
            var visual=source.TryCreateAnimatedVisual(compositor,out var diagnostics);
            var markers=source.Markers.ToDictionary(p=>p.Key,p=>p.Value);
            var segments=markers.Where(p=>p.Key.EndsWith("_Start")).ToDictionary(
                p=>p.Key[..^6],p=>new {
                    start=p.Value,end=markers[p.Key[..^6]+"_End"],
                    durationMs=(markers[p.Key[..^6]+"_End"]-p.Value)*visual.Duration.TotalMilliseconds
                });
            var images=new List<(string Name,byte[] Pixels,uint Width,uint Height)>();
            var cases=new Dictionary<string,object>();
            async Task Capture(string name,Action action) {
                var frames=new List<object>();
                var completion=new TaskCompletionSource();
                var clock=new System.Diagnostics.Stopwatch();
                EventHandler<object>? handler=null;
                handler=(_,_)=>{
                    var start=clock.Elapsed.TotalMilliseconds;
                    var image=ScreenPixels();
                    var end=clock.Elapsed.TotalMilliseconds;
                    // Win32 pixels can differ from XAML's reported scale in a DPI-
                    // virtualized host. Record both; derive crop scale from this capture.
                    var scale=image.Width/root.Width;
                    double red=0;
                    for(int y=(int)Math.Ceiling(20*scale);y<36*scale;y++)
                        for(int x=(int)Math.Ceiling(14*scale);x<30*scale;x++)
                            red+=image.Pixels[(y*image.Width+x)*4+2];
                    var frameName=$"{name}-{frames.Count:D3}";
                    frames.Add(new {name=frameName,startMs=start,endMs=end,red,captureScale=scale,
                        foreground=image.Foreground,capture=image.CaptureMode,state=AnimatedIcon.GetState(glyph)});
                    images.Add((frameName,image.Pixels,image.Width,image.Height));
                    if(start>=450) {CompositionTarget.Rendering-=handler;completion.SetResult();}
                };
                CompositionTarget.Rendering+=handler;
                clock.Start();action();await completion.Task;
                cases[name]=frames;
            }
            await Capture("normal",()=>check.IsChecked=true);
            check.IsChecked=false;await Task.Delay(500);
            await Capture("coalesced",()=>{
                AnimatedIcon.SetState(glyph,"PointerOverOff");
                AnimatedIcon.SetState(glyph,"PressedOff");
                check.IsChecked=true;
                AnimatedIcon.SetState(glyph,"PointerOverOn");
            });
            foreach(var image in images)
                await SaveEffectImage(image.Name,image.Pixels,image.Width,image.Height);
            File.WriteAllText(Path.Combine(Program.Output,"accept-timing.json"),JsonSerializer.Serialize(new {
                sdk="Microsoft.WindowsAppSDK 2.5.4-experimental / WinUI 2.3.10-experimental",
                source="Runtime CheckBox template AnimatedIcon / IAnimatedVisual.Duration / Markers",
                durationTicks=visual.Duration.Ticks,durationMs=visual.Duration.TotalMilliseconds,
                markers,segments,animationsEnabled=new Windows.UI.ViewManagement.UISettings().AnimationsEnabled,
                glyphType=glyph.GetType().FullName,sourceType=source.GetType().FullName,
                xamlDpi=root.XamlRoot.RasterizationScale,cases,
                actions=new {normal=new[]{"IsChecked=true"},coalesced=new[]{"PointerOverOff","PressedOff","IsChecked=true","PointerOverOn"}},
                boundary="Own-window runtime probe using the same WinUI DLLs as the Store Gallery. Coalesced case sets AnimatedIcon states synchronously, not OS pointer input. Foreground capture brackets include compositor latency; exact present-time/pixel parity is not accepted.",
            },new JsonSerializerOptions {WriteIndented=true}));
            visual.Dispose();
        } catch(Exception e) {
            File.WriteAllText(Path.Combine(Program.Output,"accept-error.txt"),e.ToString());
        }
        Exit();
    }
}
