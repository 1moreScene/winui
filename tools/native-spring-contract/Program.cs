using Microsoft.UI.Xaml;
using Microsoft.UI.Composition;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Hosting;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Windowing;
using System.Numerics;
using System.Diagnostics;
using System.Text.Json;
using System.Runtime.InteropServices;
namespace SpringContract;
static class Capture {
 [DllImport("SpringCapture.dll",CallingConvention=CallingConvention.Cdecl)] public static extern int BeginCapture(IntPtr window);
 [DllImport("SpringCapture.dll",CallingConvention=CallingConvention.Cdecl)] public static extern int PollCapture(out double time,out int blue);
 [DllImport("SpringCapture.dll",CallingConvention=CallingConvention.Cdecl)] public static extern void EndCapture();
}
static class Program {
 public static string Output="";
 [STAThread] static void Main(string[] args){Output=Path.GetFullPath(args[0]);Directory.CreateDirectory(Path.GetDirectoryName(Output)!);Application.Start(_=>{SynchronizationContext.SetSynchronizationContext(new Microsoft.UI.Dispatching.DispatcherQueueSynchronizationContext(Microsoft.UI.Dispatching.DispatcherQueue.GetForCurrentThread()));new ProbeApplication();});}
}
public partial class ProbeApplication:Application {
 public ProbeApplication(){InitializeComponent();}
 protected override async void OnLaunched(LaunchActivatedEventArgs e){Window? window=null;
  try{
   window=new Window{Content=new Grid{Width=128,Height=128}};var presenter=OverlappedPresenter.Create();presenter.SetBorderAndTitleBar(false,false);presenter.IsResizable=false;window.AppWindow.SetPresenter(presenter);window.AppWindow.Move(new Windows.Graphics.PointInt32(-20000,-20000));window.AppWindow.Resize(new Windows.Graphics.SizeInt32(128,128));window.AppWindow.Show(false);
   await Task.Delay(200);
   var compositor=CompositionTarget.GetCompositorForCurrentThread();var visualRoot=compositor.CreateContainerVisual();ElementCompositionPreview.SetElementChildVisual((UIElement)window.Content,visualRoot);
   Marshal.ThrowExceptionForHR(Capture.BeginCapture(WinRT.Interop.WindowNative.GetWindowHandle(window)));
   async Task<object> Run(float damping,int period,bool reverse=false){
    var visual=compositor.CreateSpriteVisual();visualRoot.Children.InsertAtTop(visual);visual.Scale=new Vector3(1);visual.Size=new Vector2(10);
    var receiver=compositor.CreateSpriteVisual();receiver.Size=new Vector2(128);visualRoot.Children.InsertAtTop(receiver);var brush=compositor.CreateColorBrush(Windows.UI.Color.FromArgb(255,0,0,64));receiver.Brush=brush;
    var expr=compositor.CreateExpressionAnimation("ColorRgb(255, 0, 0, Clamp((source.Scale.X - 0.5) * 128, 0, 255))");expr.SetReferenceParameter("source",visual);brush.StartAnimation("Color",expr);
    await Task.Delay(160);while(Capture.PollCapture(out _,out _)>0){}
    var animation=compositor.CreateSpringVector3Animation();animation.FinalValue=new Vector3(1.5f);animation.DampingRatio=damping;animation.Period=TimeSpan.FromMilliseconds(period);
    var initialVelocityType=typeof(SpringVector3NaturalMotionAnimation).GetProperty("InitialVelocity")!.PropertyType.FullName;var defaultVelocity=animation.InitialVelocity;double? reversedAt=null;
    var completion=new TaskCompletionSource<double>();var clock=Stopwatch.StartNew();double startMs=Stopwatch.GetTimestamp()*1000.0/Stopwatch.Frequency;var samples=new List<object>();
    var batch=compositor.CreateScopedBatch(CompositionBatchTypes.Animation);batch.Completed+=(_,_)=>completion.TrySetResult(clock.Elapsed.TotalMilliseconds);
    visual.StartAnimation("Scale",animation);batch.End();
    while(clock.Elapsed.TotalSeconds<8){if(reverse&&reversedAt==null&&clock.Elapsed.TotalMilliseconds>=250){reversedAt=clock.Elapsed.TotalMilliseconds;animation.FinalValue=new Vector3(1);visual.StartAnimation("Scale",animation);}
     while(Capture.PollCapture(out double time,out int blue)>0)samples.Add(new{timeMs=time-startMs,blue,scale=.5+blue/128.0});if(reverse ? clock.Elapsed.TotalMilliseconds>1500 : completion.Task.IsCompleted&&clock.Elapsed.TotalMilliseconds>completion.Task.Result+150)break;await Task.Delay(10);}
    double? elapsed=completion.Task.IsCompleted?completion.Task.Result:null;
    visual.StopAnimation("Scale");brush.StopAnimation("Color");visualRoot.Children.Remove(visual);visualRoot.Children.Remove(receiver);visual.Dispose();receiver.Dispose();batch.Dispose();return new{damping,period,reverse,reversedAt,initialVelocityType,defaultVelocity,elapsedMs=elapsed,samples};
   }
   var result=new[]{await Run(.6f,50),await Run(.2f,200),await Run(.8f,200),await Run(.2f,200,true)};
   async Task<int> DepthProbe(bool xaml){
    visualRoot.Children.RemoveAll();var root=(Grid)window.Content;root.Children.Clear();
    if(xaml){root.Children.Add(new Microsoft.UI.Xaml.Shapes.Rectangle{Width=128,Height=128,Fill=new SolidColorBrush(Windows.UI.Color.FromArgb(255,255,0,0)),Translation=new Vector3(0,0,32)});root.Children.Add(new Microsoft.UI.Xaml.Shapes.Rectangle{Width=128,Height=128,Fill=new SolidColorBrush(Windows.UI.Color.FromArgb(255,0,0,255))});}
    else{var red=compositor.CreateSpriteVisual();red.Size=new Vector2(128);red.Brush=compositor.CreateColorBrush(Windows.UI.Color.FromArgb(255,255,0,0));red.Offset=new Vector3(0,0,32);visualRoot.Children.InsertAtTop(red);var blue=compositor.CreateSpriteVisual();blue.Size=new Vector2(128);blue.Brush=compositor.CreateColorBrush(Windows.UI.Color.FromArgb(255,0,0,255));visualRoot.Children.InsertAtTop(blue);}
    await Task.Delay(240);int last=-1;while(Capture.PollCapture(out _,out int blue)>0)last=blue;return last;
   }
   var depth=new{composition=await DepthProbe(false),xaml=await DepthProbe(true)};
   File.WriteAllText(Program.Output,JsonSerializer.Serialize(new{sdk="2.3.10-experimental",windowCreated=true,activated=false,offscreen=true,capture="WGC owned probe HWND; scale encoded into blue channel",cases=result,depth},new JsonSerializerOptions{WriteIndented=true}));
  }catch(Exception error){File.WriteAllText(Program.Output,JsonSerializer.Serialize(new{error=error.ToString()}));}finally{Process.GetCurrentProcess().Kill();}
 }
}
