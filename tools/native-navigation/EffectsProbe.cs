using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Animation;
using Microsoft.UI.Xaml.Media.Imaging;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Text.Json;
using Windows.Graphics;
using Windows.Graphics.Imaging;
using Windows.Storage;
using Windows.UI;

namespace NavigationProbe;
public sealed partial class ProbeApplication {
    static readonly JsonSerializerOptions EffectsJson=new(){WriteIndented=true};
    [StructLayout(LayoutKind.Sequential)] struct NativeRect { public int Left,Top,Right,Bottom; }
    [StructLayout(LayoutKind.Sequential)] struct NativePoint {public int X,Y;}
    [StructLayout(LayoutKind.Sequential)] struct BitmapInfo {
        public uint Size; public int Width,Height; public ushort Planes,BitCount;
        public uint Compression,ImageSize; public int Xppm,Yppm;public uint Used,Important;
    }
    [DllImport("user32.dll")] static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
    [DllImport("user32.dll")] static extern IntPtr GetDC(IntPtr h);
    [DllImport("user32.dll")] static extern int ReleaseDC(IntPtr h,IntPtr dc);
    [DllImport("user32.dll")] static extern bool GetClientRect(IntPtr h,out NativeRect r);
    [DllImport("user32.dll")] static extern bool ClientToScreen(IntPtr h,ref NativePoint p);
    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr h,IntPtr after,int x,int y,int w,int height,uint flags);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
    [DllImport("kernel32.dll")] static extern uint GetCurrentThreadId();
    [DllImport("user32.dll")] static extern bool AttachThreadInput(uint a,uint b,bool attach);
    [DllImport("user32.dll")] static extern bool PrintWindow(IntPtr h,IntPtr dc,uint flags);
    [DllImport("gdi32.dll")] static extern IntPtr CreateCompatibleDC(IntPtr dc);
    [DllImport("gdi32.dll")] static extern IntPtr CreateCompatibleBitmap(IntPtr dc,int w,int h);
    [DllImport("gdi32.dll")] static extern IntPtr SelectObject(IntPtr dc,IntPtr o);
    [DllImport("gdi32.dll")] static extern bool BitBlt(IntPtr d,int x,int y,int w,int h,IntPtr s,int sx,int sy,uint op);
    [DllImport("gdi32.dll")] static extern int GetDIBits(IntPtr dc,IntPtr bitmap,uint start,uint lines,byte[] bytes,ref BitmapInfo info,uint usage);
    [DllImport("gdi32.dll")] static extern bool DeleteObject(IntPtr o);
    [DllImport("gdi32.dll")] static extern bool DeleteDC(IntPtr dc);

    (byte[] Pixels,uint Width,uint Height,bool Foreground,string CaptureMode) ScreenPixels()=>CaptureClientPixels(WinRT.Interop.WindowNative.GetWindowHandle(window!),true);
    static (byte[] Pixels,uint Width,uint Height,bool Foreground,string CaptureMode) CaptureClientPixels(IntPtr hwnd,bool ensureForeground,bool allowOwnedForeground=false){
        var previousDpi=SetThreadDpiAwarenessContext(new IntPtr(-4));
        bool OwnForeground(){var active=GetForegroundWindow();GetWindowThreadProcessId(active,out var activePid);GetWindowThreadProcessId(hwnd,out var ownerPid);return active==hwnd||(allowOwnedForeground&&active!=IntPtr.Zero&&activePid==ownerPid);}
        if(ensureForeground && GetForegroundWindow()!=IntPtr.Zero && !OwnForeground()){
            var current=GetCurrentThreadId();var foreground=GetWindowThreadProcessId(GetForegroundWindow(),out _);
            var attached=current!=foreground && AttachThreadInput(current,foreground,true);
            try{SetWindowPos(hwnd,new IntPtr(-1),0,0,0,0,3);SetForegroundWindow(hwnd);}
            finally{if(attached)AttachThreadInput(current,foreground,false);}
        }
        GetClientRect(hwnd,out var r);var p=new NativePoint();ClientToScreen(hwnd,ref p);
        int w=r.Right-r.Left,h=r.Bottom-r.Top;
        var screen=GetDC(IntPtr.Zero);var dc=CreateCompatibleDC(screen);var bitmap=CreateCompatibleBitmap(screen,w,h);
        var old=SelectObject(dc,bitmap);
        try{
            var foreground=OwnForeground();
            if(foreground){if(!BitBlt(dc,0,0,w,h,screen,p.X,p.Y,0x00CC0020))throw new Exception("Desktop client capture failed");}
            else if(!PrintWindow(hwnd,dc,3))throw new Exception("Own-window capture failed; refusing unrelated desktop pixels");
            var bytes=new byte[w*h*4];var info=new BitmapInfo{Size=(uint)Marshal.SizeOf<BitmapInfo>(),Width=w,Height=-h,Planes=1,BitCount=32};
            SelectObject(dc,old);if(GetDIBits(dc,bitmap,0,(uint)h,bytes,ref info,0)==0)throw new Exception("Desktop bitmap read failed");
            for(int i=3;i<bytes.Length;i+=4)bytes[i]=255;
            return(bytes,(uint)w,(uint)h,foreground,foreground?(GetForegroundWindow()==hwnd?"foreground-client":"foreground-client-owned-popup"):"PrintWindow-own-client");
        }finally{SelectObject(dc,old);DeleteObject(bitmap);DeleteDC(dc);ReleaseDC(IntPtr.Zero,screen);SetThreadDpiAwarenessContext(previousDpi);}
    }
    async Task SaveEffectImage(string name,byte[] bytes,uint w,uint h){
        var folder=await StorageFolder.GetFolderFromPathAsync(Program.Output);
        var file=await folder.CreateFileAsync(name+".png",CreationCollisionOption.ReplaceExisting);
        using var stream=await file.OpenAsync(FileAccessMode.ReadWrite);
        var encoder=await BitmapEncoder.CreateAsync(BitmapEncoder.PngEncoderId,stream);
        encoder.SetPixelData(BitmapPixelFormat.Bgra8,BitmapAlphaMode.Premultiplied,w,h,96,96,bytes);await encoder.FlushAsync();
    }
    async Task RunEffects(){
        try{
            root.Width=600;root.Height=400;window!.AppWindow.ResizeClient(new SizeInt32((int)(600*root.XamlRoot.RasterizationScale),(int)(400*root.XamlRoot.RasterizationScale)));
            root.Children.Clear();root.Background=Brush(49,87,139);
            var canvas=new Canvas();root.Children.Add(canvas);
            var background=new Canvas{Width=900,Height=500};canvas.Children.Add(background);
            foreach(var(i,color) in new[]{"#df7467","#edbd59","#46a6a2","#6684cf"}.Select((c,i)=>(i,c))){
                var stripe=new Border{Width=200,Height=500,Background=ParseBrush(color)};Canvas.SetLeft(stripe,i*220);background.Children.Add(stripe);
            }
            var acrylic=new AcrylicBrush{TintColor=Color.FromArgb(255,255,255,255),TintOpacity=.2,TintLuminosityOpacity=.65,FallbackColor=Color.FromArgb(255,243,243,243)};
            var transform=new CompositeTransform();
            var panel=new Grid{Width=320,Height=240,Background=acrylic,RenderTransform=transform};Canvas.SetLeft(panel,140);Canvas.SetTop(panel,80);canvas.Children.Add(panel);
            var stack=new StackPanel{Padding=new Thickness(24),Spacing=16};panel.Children.Add(stack);
            stack.Children.Add(new TextBlock{Text="Acrylic / 中文",FontSize=22,FontFamily=new FontFamily("Segoe UI")});
            var button=new Button{Content="Animate",Style=(Style)Application.Current.Resources["AccentButtonStyle"]};stack.Children.Add(button);
            await Task.Delay(650);
            var staticRecords=new List<object>();
            foreach(var theme in new[]{ElementTheme.Light,ElementTheme.Dark}){
                root.RequestedTheme=theme;
                foreach(var offset in new[]{0,-180}){
                    background.RenderTransform=new TranslateTransform{X=offset};await Task.Delay(180);
                    var bitmap=new RenderTargetBitmap();await bitmap.RenderAsync(root,600,400);
                    await SaveEffectImage($"{theme}-{offset}-rtb",(await bitmap.GetPixelsAsync()).ToArray(),(uint)bitmap.PixelWidth,(uint)bitmap.PixelHeight);
                    var shot=ScreenPixels();await SaveEffectImage($"{theme}-{offset}-screen",shot.Pixels,shot.Width,shot.Height);
                    staticRecords.Add(new{theme=theme.ToString(),offset,screenForeground=shot.Foreground,width=shot.Width,height=shot.Height});
                }
            }
            root.RequestedTheme=ElementTheme.Light;background.RenderTransform=null;await Task.Delay(180);
            // XAML dependent animations expose actual UI-frame values. Screen capture
            // brackets each sample; it is not a compositor timestamp or GPU timer.
            var clock=System.Diagnostics.Stopwatch.StartNew();
            var frames=new List<object>();var images=new List<(string Name,byte[] Pixels,uint W,uint H)>();
            var actions=new List<object>();var completion=new TaskCompletionSource();bool reversed=false;
            Storyboard Start(double x,double alpha,double duration,double delay=0){
                var storyboard=new Storyboard();
                var spline=new KeySpline{ControlPoint1=new Windows.Foundation.Point(.1,.9),ControlPoint2=new Windows.Foundation.Point(.2,1)};
                var tx=new DoubleAnimationUsingKeyFrames{Duration=new Duration(TimeSpan.FromMilliseconds(duration)),BeginTime=TimeSpan.FromMilliseconds(delay),EnableDependentAnimation=true};
                tx.KeyFrames.Add(new SplineDoubleKeyFrame{KeyTime=KeyTime.FromTimeSpan(TimeSpan.FromMilliseconds(duration)),Value=x,KeySpline=spline});
                Storyboard.SetTarget(tx,transform);Storyboard.SetTargetProperty(tx,"TranslateX");storyboard.Children.Add(tx);
                var opacity=new DoubleAnimationUsingKeyFrames{Duration=tx.Duration,BeginTime=tx.BeginTime,EnableDependentAnimation=true};
                opacity.KeyFrames.Add(new SplineDoubleKeyFrame{KeyTime=KeyTime.FromTimeSpan(TimeSpan.FromMilliseconds(duration)),Value=alpha,KeySpline=new KeySpline{ControlPoint1=new Windows.Foundation.Point(.1,.9),ControlPoint2=new Windows.Foundation.Point(.2,1)}});
                Storyboard.SetTarget(opacity,panel);Storyboard.SetTargetProperty(opacity,"Opacity");storyboard.Children.Add(opacity);
                actions.Add(new{timeMs=clock.Elapsed.TotalMilliseconds,targetX=x,targetOpacity=alpha,duration,delay,fromX=transform.TranslateX,fromOpacity=panel.Opacity});
                storyboard.Begin();return storyboard;
            }
            var current=Start(120,.6,600,80);
            EventHandler<object>? handler=null;
            handler=(_,_)=>{
                var start=clock.Elapsed.TotalMilliseconds;
                if(!reversed && start>=260){
                    var x=transform.TranslateX;var alpha=panel.Opacity;current.Stop();transform.TranslateX=x;panel.Opacity=alpha;
                    current=Start(0,1,600);reversed=true;
                }
                var name=$"frame-{frames.Count:D3}";var xNow=transform.TranslateX;var opacityNow=panel.Opacity;
                var image=ScreenPixels();var end=clock.Elapsed.TotalMilliseconds;
                frames.Add(new{name,startMs=start,endMs=end,x=xNow,opacity=opacityNow,screenForeground=image.Foreground});
                images.Add((name,image.Pixels,image.Width,image.Height));
                if(start>=1000){CompositionTarget.Rendering-=handler;completion.SetResult();}
            };
            CompositionTarget.Rendering+=handler;
            await completion.Task.WaitAsync(TimeSpan.FromSeconds(8));
            foreach(var frame in images)await SaveEffectImage(frame.Name,frame.Pixels,frame.W,frame.H);
            File.WriteAllText(Path.Combine(Program.Output,"effects-samples.json"),JsonSerializer.Serialize(new{
                sdk="Microsoft.WindowsAppSDK 2.5.4-experimental / WinUI 2.3.10-experimental",dpi=root.XamlRoot.RasterizationScale,
                width=600,height=400,actualWidth=root.ActualWidth,actualHeight=root.ActualHeight,font="Segoe UI",staticRecords,actions,frames,
                boundary="Rendering callbacks measure UI-thread animated properties. GDI screen read brackets frame pixels; composition present time and occlusion are not proven. Foreground status is recorded per frame. RenderTargetBitmap snapshots are retained separately because composition brushes may be omitted."
            },EffectsJson));
            File.WriteAllText(Path.Combine(Program.Output,"effects-complete.json"),"{\"complete\":true}");
        }catch(Exception e){File.WriteAllText(Path.Combine(Program.Output,"effects-error.txt"),e.ToString());}
    }
}
