using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Markup;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Animation;
using Microsoft.UI.Xaml.Media.Imaging;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Text.Json;
namespace NavigationProbe;
public sealed partial class ProbeApplication {
    async Task RunProgress() {
        try {
            var ir=JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"progress-template.json")));
            var palettes=new Dictionary<string,object>();var matrix=new List<object>();var timing=new List<object>();var animations=new List<object>();
            const string ns="xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\"";
            foreach(var theme in new[]{"Light","Dark","HighContrast"}) {
                root.Children.Clear();root.Resources.Clear();root.RequestedTheme=theme=="Dark"?ElementTheme.Dark:ElementTheme.Light;
                root.Background=theme=="Dark"?Brush(32,32,32):theme=="Light"?Brush(243,243,243):Brush(0,0,0);
                var palette=new Dictionary<string,object>();
                foreach(var p in ir.RootElement.GetProperty("requiredBrushes").EnumerateObject()) {
                    if(theme=="HighContrast") {palette[p.Name]=new{kind="solid",color=p.Name.Contains("Background")?"#000000":p.Name.Contains("Foreground")&&!p.Name.Contains("Paused")?"#FFFF00":"#FFFFFF",opacity=1};continue;}
                    var markup=p.Value.GetProperty("colorResource").GetBoolean()?$"<Border {ns}><Border.Background><SolidColorBrush Color=\"{{ThemeResource {p.Name}}}\"/></Border.Background></Border>":$"<Border {ns} Background=\"{{ThemeResource {p.Name}}}\"/>";
                    var border=(Border)XamlReader.Load(markup);root.Children.Add(border);root.UpdateLayout();palette[p.Name]=DescribeButtonBrush(border.Background)??throw new Exception("Missing brush "+p.Name);root.Children.Remove(border);
                }
                palettes[theme]=palette;if(theme=="HighContrast")continue;
                var canvas=new Canvas();root.Children.Add(canvas);int i=0;
                foreach(var value in new[]{0d,25d,50d,100d})foreach(var state in new[]{"Running","Paused","Error"}) {
                    var bar=new ProgressBar{Width=130,Value=value,ShowPaused=state=="Paused",ShowError=state=="Error"};Canvas.SetLeft(bar,24+i%4*240);Canvas.SetTop(bar,24+i/4*32);canvas.Children.Add(bar);i++;
                    await Task.Delay(5);root.UpdateLayout();matrix.Add(new{theme,kind="ProgressBar",value,state,bounds=Rect(bar),minHeight=bar.MinHeight,radius=bar.CornerRadius,parts=Tree(bar).OfType<FrameworkElement>().Where(x=>x.Name is "ProgressBarTrack" or "DeterminateProgressBarIndicator").Select(x=>new{name=x.Name,bounds=Rect(x)}).ToArray()});
                }
                foreach(var mode in new[]{"Determinate","Indeterminate"})foreach(var value in new[]{0d,.25,.5,.75,1d}) {
                    var ring=new ProgressRing{Width=60,Height=60,IsIndeterminate=mode=="Indeterminate",Value=value*100};Canvas.SetLeft(ring,24+(i-12)%5*180);Canvas.SetTop(ring,150+(i-12)/5*100);canvas.Children.Add(ring);i++;
                    await Task.Delay(40);root.UpdateLayout();var player=Tree(ring).OfType<AnimatedVisualPlayer>().Single();player.Stop();player.SetProgress(value);
                    matrix.Add(new{theme,kind="ProgressRing",mode,value,bounds=Rect(ring),player=Rect(player),duration=player.Duration.TotalMilliseconds,isActive=ring.IsActive});
                }
                await Task.Delay(450);root.UpdateLayout();
                var bitmap=new RenderTargetBitmap();await bitmap.RenderAsync(root,1000,500);await SaveEffectImage($"{theme}-Progress",(await bitmap.GetPixelsAsync()).ToArray(),(uint)bitmap.PixelWidth,(uint)bitmap.PixelHeight);
                // Capture only this probe's window. Do not activate, raise or sample other apps.
                var hwnd=WinRT.Interop.WindowNative.GetWindowHandle(window!);GetClientRect(hwnd,out var area);int w=area.Right-area.Left,h=area.Bottom-area.Top;
                var dc=GetDC(hwnd);var mem=CreateCompatibleDC(dc);var native=CreateCompatibleBitmap(dc,w,h);var old=SelectObject(mem,native);
                try {if(!PrintWindow(hwnd,mem,3))throw new Exception("Own-window PrintWindow failed");SelectObject(mem,old);var bytes=new byte[w*h*4];var info=new BitmapInfo{Size=(uint)System.Runtime.InteropServices.Marshal.SizeOf<BitmapInfo>(),Width=w,Height=-h,Planes=1,BitCount=32};if(GetDIBits(mem,native,0,(uint)h,bytes,ref info,0)==0)throw new Exception("Own-window pixels unavailable");for(int p=3;p<bytes.Length;p+=4)bytes[p]=255;await SaveEffectImage($"{theme}-Progress-own-window",bytes,(uint)w,(uint)h);}
                finally {SelectObject(mem,old);DeleteObject(native);DeleteDC(mem);ReleaseDC(hwnd,dc);}
                root.Children.Clear();var motionCanvas=new Canvas();root.Children.Add(motionCanvas);int motionIndex=0;
                foreach(var time in new[]{0,375,750,1125,1500,1750}) {
                    var bar=new ProgressBar{Width=130,IsIndeterminate=true};Canvas.SetLeft(bar,24+motionIndex%3*240);Canvas.SetTop(bar,24+motionIndex/3*40);motionCanvas.Children.Add(bar);motionIndex++;
                    await Task.Delay(30);root.UpdateLayout();VisualStateManager.GoToState(bar,"Determinate",false);VisualStateManager.GoToState(bar,"Indeterminate",false);
                    var groupRoot=Tree(bar).OfType<FrameworkElement>().First(x=>VisualStateManager.GetVisualStateGroups(x).Count>0);
                    var group=VisualStateManager.GetVisualStateGroups(groupRoot).Single(x=>x.Name=="CommonStates");var story=group.States.Single(x=>x.Name=="Indeterminate").Storyboard;
                    story.Pause();story.SeekAlignedToLastTick(TimeSpan.FromMilliseconds(time));await Task.Delay(30);root.UpdateLayout();
                    animations.Add(new{theme,kind="ProgressBar",state="Running",time,bounds=Rect(bar),parts=Tree(bar).OfType<FrameworkElement>().Where(x=>x.Name is "IndeterminateProgressBarIndicator" or "IndeterminateProgressBarIndicator2").Select(x=>new{name=x.Name,bounds=Rect(x)}).ToArray()});
                }
                foreach(var state in new[]{"Paused","Error"}) {
                    var bar=new ProgressBar{Width=130,IsIndeterminate=true,ShowPaused=state=="Paused",ShowError=state=="Error"};Canvas.SetLeft(bar,24+motionIndex%3*240);Canvas.SetTop(bar,24+motionIndex/3*40);motionCanvas.Children.Add(bar);motionIndex++;await Task.Delay(800);root.UpdateLayout();animations.Add(new{theme,kind="ProgressBar",state,time=2500,bounds=Rect(bar),parts=Tree(bar).OfType<FrameworkElement>().Where(x=>x.Name is "IndeterminateProgressBarIndicator" or "IndeterminateProgressBarIndicator2").Select(x=>new{name=x.Name,bounds=Rect(x)}).ToArray()});
                }
                var motionBitmap=new RenderTargetBitmap();await motionBitmap.RenderAsync(root,1000,500);await SaveEffectImage($"{theme}-ProgressBarAnimation",(await motionBitmap.GetPixelsAsync()).ToArray(),(uint)motionBitmap.PixelWidth,(uint)motionBitmap.PixelHeight);
                root.Children.Clear();var animatedBar=new ProgressBar{Width=130,Value=0};root.Children.Add(animatedBar);await Task.Delay(100);root.UpdateLayout();var indicator=Tree(animatedBar).OfType<FrameworkElement>().First(x=>x.Name=="DeterminateProgressBarIndicator");
                var clock=System.Diagnostics.Stopwatch.StartNew();animatedBar.Value=75;
                foreach(var t in new[]{0,40,100,200,367,450}){var delay=t-(int)clock.ElapsedMilliseconds;if(delay>0)await Task.Delay(delay);timing.Add(new{theme,requestedMs=t,actualMs=clock.Elapsed.TotalMilliseconds,indicator=Rect(indicator)});}
            }
            File.WriteAllText(Path.Combine(Program.Output,"progress-palettes.json"),JsonSerializer.Serialize(palettes,EffectsJson));
            File.WriteAllText(Path.Combine(Program.Output,"progress-metrics.json"),JsonSerializer.Serialize(new{environment=new{sdk="Microsoft.WindowsAppSDK 2.5.4-experimental / WinUI 2.3.10-experimental",os=Environment.OSVersion.ToString(),rasterizationScale=root.XamlRoot.RasterizationScale,rootWidth=root.ActualWidth,rootHeight=root.ActualHeight,dllSha256=Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(File.ReadAllBytes(Path.Combine(AppContext.BaseDirectory,"Microsoft.UI.Xaml.dll"))))},matrix,animations,timing,reference="Own matching-SDK probe. Frozen player progress and PrintWindow/RTB are not Store release present-time animation acceptance."},EffectsJson));
            File.WriteAllText(Path.Combine(Program.Output,"progress-complete.json"),"{\"complete\":true}");
        } catch(Exception e){File.WriteAllText(Path.Combine(Program.Output,"progress-error.txt"),e.ToString());}
        Exit();
    }
}
