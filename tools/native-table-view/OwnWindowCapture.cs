// Same-process graphics readback of this instrumented SampleApp only. No input injection or desktop automation.
using System.Runtime.InteropServices;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Windows.Graphics.Imaging;
using Windows.Storage;
namespace WinUI.TableView.SampleApp;
internal static partial class ParityCapture
{
    [StructLayout(LayoutKind.Sequential)] struct ClientRect { public int left,top,right,bottom; }
    [StructLayout(LayoutKind.Sequential)] struct BitmapInfo { public uint size;public int width,height;public ushort planes,bits;public uint compression,imageSize;public int x,y;public uint used,important; }
    [DllImport("user32.dll")] static extern bool GetClientRect(IntPtr window,out ClientRect rect);
    [DllImport("user32.dll")] static extern IntPtr GetDC(IntPtr window);
    [DllImport("user32.dll")] static extern int ReleaseDC(IntPtr window,IntPtr dc);
    [DllImport("user32.dll")] static extern bool PrintWindow(IntPtr window,IntPtr dc,uint flags);
    [DllImport("gdi32.dll")] static extern IntPtr CreateCompatibleDC(IntPtr dc);
    [DllImport("gdi32.dll")] static extern IntPtr CreateCompatibleBitmap(IntPtr dc,int width,int height);
    [DllImport("gdi32.dll")] static extern IntPtr SelectObject(IntPtr dc,IntPtr value);
    [DllImport("gdi32.dll")] static extern bool DeleteObject(IntPtr value);
    [DllImport("gdi32.dll")] static extern bool DeleteDC(IntPtr dc);
    [DllImport("gdi32.dll")] static extern int GetDIBits(IntPtr dc,IntPtr bitmap,uint start,uint lines,byte[] bytes,ref BitmapInfo info,uint usage);
    static (byte[] bytes,int width,int height) OwnFrame()
    {
        var hwnd=WinRT.Interop.WindowNative.GetWindowHandle(App.Current.MainWindow);GetClientRect(hwnd,out var rect);
        int width=rect.right,height=rect.bottom;var source=GetDC(hwnd);var dc=CreateCompatibleDC(source);var bitmap=CreateCompatibleBitmap(source,width,height);var old=SelectObject(dc,bitmap);
        try {
            if(!PrintWindow(hwnd,dc,3))throw new Exception("Own-client capture failed; no desktop fallback.");
            SelectObject(dc,old);var bytes=new byte[width*height*4];var info=new BitmapInfo{size=(uint)Marshal.SizeOf<BitmapInfo>(),width=width,height=-height,planes=1,bits=32};
            if(GetDIBits(dc,bitmap,0,(uint)height,bytes,ref info,0)==0)throw new Exception("Own-client readback failed.");for(int i=3;i<bytes.Length;i+=4)bytes[i]=255;
            return(bytes,width,height);
        }finally{SelectObject(dc,old);DeleteObject(bitmap);DeleteDC(dc);ReleaseDC(hwnd,source);}
    }
    static async Task NativeAnimation(string theme,global::WinUI.TableView.TableView table,Grid root)
    {
        table.DeselectAll();await Task.Delay(300);var samples=new List<object>();var images=new List<(string name,byte[] bytes,int width,int height)>();
        var clock=System.Diagnostics.Stopwatch.StartNew();table.SelectedIndex=2;
        foreach(var target in new[]{0,40,83,125,167,250}) {
            int wait=target-(int)clock.ElapsedMilliseconds;if(wait>0)await Task.Delay(wait);
            double start=clock.Elapsed.TotalMilliseconds;var frame=OwnFrame();var name=$"{theme}-selection-{target}";
            samples.Add(new{targetMs=target,actualStartMs=start,actualEndMs=clock.Elapsed.TotalMilliseconds,name});images.Add((name,frame.bytes,frame.width,frame.height));
        }
        foreach(var frame in images){var folder=await StorageFolder.GetFolderFromPathAsync(Output);var file=await folder.CreateFileAsync(frame.name+"-own-window.png",CreationCollisionOption.ReplaceExisting);using var stream=await file.OpenAsync(FileAccessMode.ReadWrite);var encoder=await BitmapEncoder.CreateAsync(BitmapEncoder.PngEncoderId,stream);encoder.SetPixelData(BitmapPixelFormat.Bgra8,BitmapAlphaMode.Premultiplied,(uint)frame.width,(uint)frame.height,96,96,frame.bytes);await encoder.FlushAsync();}
        Records.Add(new{name=$"{theme}-selection-animation",capture="Same-process PrintWindow client readback after programmatic SelectedIndex; actual times recorded. No physical-input or Store release acceptance.",samples});
        table.DeselectAll();await Task.Delay(200);
        var header=Tree(table).OfType<global::WinUI.TableView.TableViewColumnHeader>().First();
        clock.Restart();Invoke(header,"DoSort",global::WinUI.TableView.SortDirection.Descending,true);
        var sortingSamples=new List<object>();
        foreach(var target in new[]{0,40,83,125,167,250,367,500}) {
            int wait=target-(int)clock.ElapsedMilliseconds;if(wait>0)await Task.Delay(wait);
            var name=$"{theme}-sorting-{target}";double start=clock.Elapsed.TotalMilliseconds;
            await SaveOwn(name);sortingSamples.Add(new{targetMs=target,actualStartMs=start,actualEndMs=clock.Elapsed.TotalMilliseconds,name});
        }
        Records.Add(new{name=$"{theme}-sorting-animation",capture="Programmatic original DoSort; own-client samples include encoding time and record actual sampling times.",samples=sortingSamples});
    }
    static async Task SaveOwn(string name)
    {
        var frame=OwnFrame();var folder=await StorageFolder.GetFolderFromPathAsync(Output);var file=await folder.CreateFileAsync(name+"-own-window.png",CreationCollisionOption.ReplaceExisting);using var stream=await file.OpenAsync(FileAccessMode.ReadWrite);var encoder=await BitmapEncoder.CreateAsync(BitmapEncoder.PngEncoderId,stream);encoder.SetPixelData(BitmapPixelFormat.Bgra8,BitmapAlphaMode.Premultiplied,(uint)frame.width,(uint)frame.height,96,96,frame.bytes);await encoder.FlushAsync();
    }
}
