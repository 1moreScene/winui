using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Media;
using System.Diagnostics;
namespace NavigationProbe;
public sealed partial class ProbeApplication {
 async Task CaptureActualToolTips(List<object> rows,List<object> motion){
  foreach(var theme in new[]{"Light","Dark"})foreach(var backdrop in new[]{"Plain","Stripes"})foreach(var side in new[]{"Top","Bottom"}){
   root.Children.Clear();root.RequestedTheme=theme=="Light"?ElementTheme.Light:ElementTheme.Dark;root.Background=theme=="Light"?Brush(243,243,243):Brush(32,32,32);
   var canvas=new Canvas();root.Children.Add(canvas);
   if(backdrop=="Stripes")for(int x=0;x<1000;x+=40){var stripe=new Border{Width=40,Height=500,Background=x%80==0?Brush(255,115,92):Brush(36,122,187)};Canvas.SetLeft(stripe,x);canvas.Children.Add(stripe);}
   var owner=new Button{Content="Anchor",Width=100,Height=32};Canvas.SetLeft(owner,440);Canvas.SetTop(owner,side=="Top"?300:80);canvas.Children.Add(owner);root.UpdateLayout();await Task.Delay(100);
   var tip=new ToolTip{Content="A ToolTip with content",PlacementTarget=owner,Placement=side=="Top"?PlacementMode.Top:PlacementMode.Bottom};ToolTipService.SetToolTip(owner,tip);tip.XamlRoot=root.XamlRoot;
   var name=$"{theme}-{backdrop}-ToolTip-{side}";var clock=Stopwatch.StartNew();var events=new List<object>();
   tip.Opened+=(_,_)=>events.Add(new{kind="opened",time=clock.Elapsed.TotalMilliseconds});tip.Closed+=(_,_)=>events.Add(new{kind="closed",time=clock.Elapsed.TotalMilliseconds});
   var hwnd=WinRT.Interop.WindowNative.GetWindowHandle(window!);tip.IsOpen=true;
   if(theme=="Light"&&backdrop=="Plain")await CaptureTipTrack(hwnd,name,"open",clock,0,events,motion);else await Task.Delay(650);
   root.UpdateLayout();var shot=ScreenPixels();await SaveEffectImage(name,shot.Pixels,shot.Width,shot.Height);
   rows.Add(new{name,theme,backdrop,kind="ToolTip",side,input="IsOpen on actual owned ToolTip",owner=Rect(owner),bounds=Rect(tip),tip.Padding,tip.BorderThickness,tip.CornerRadius,tip.FontSize,font=tip.FontFamily.Source,background=DescribeButtonBrush(tip.Background),border=DescribeButtonBrush(tip.BorderBrush),translationZ=tip.Translation.Z,shadow=tip.Shadow?.GetType().Name,parts=Tree(tip).OfType<TextBlock>().Select(e=>new{type="TextBlock",e.Name,text=e.Text,bounds=Rect(e),margin=e.Margin,fontSize=e.FontSize,fontWeight=e.FontWeight.Weight,baseline=e.BaselineOffset}).ToArray(),width=shot.Width,height=shot.Height,dpi=root.XamlRoot.RasterizationScale,shot.CaptureMode});
   var closeAt=clock.Elapsed.TotalMilliseconds;var closeClock=Stopwatch.StartNew();events.Add(new{kind="hide-request",time=closeAt});tip.IsOpen=false;
   if(theme=="Light"&&backdrop=="Plain")await CaptureTipTrack(hwnd,name,"close",closeClock,closeAt,events,motion);else await Task.Delay(220);
   ToolTipService.SetToolTip(owner,null);
  }
 }
 async Task CaptureTipTrack(IntPtr hwnd,string name,string phase,Stopwatch clock,double closeAt,List<object> events,List<object> motion){
  var images=new List<(string Name,byte[] Bytes,uint W,uint H)>();var frames=new List<object>();
  await Task.Run(async()=>{foreach(var requested in new[]{0,16,33,50,83,100,133,167,200,250,300,400,550}){
   var delay=requested-clock.Elapsed.TotalMilliseconds;if(delay>0)await Task.Delay(TimeSpan.FromMilliseconds(delay));var start=clock.Elapsed.TotalMilliseconds;var image=CaptureClientPixels(hwnd,false);var end=clock.Elapsed.TotalMilliseconds;var frame=$"{name}{(phase=="close"?"-Close":"")}-{requested}";images.Add((frame,image.Pixels,image.Width,image.Height));frames.Add(new{name=frame,requested,captureStartMs=start,captureEndMs=end,image.CaptureMode,image.Foreground,samplingThread="worker"});
  }});
  foreach(var image in images)await SaveEffectImage(image.Name,image.Bytes,image.W,image.H);motion.Add(new{name,phase,requestedCloseAtMs=closeAt,frames,events});
 }
}
