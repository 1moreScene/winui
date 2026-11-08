using Microsoft.UI.Xaml;
using Windows.Graphics.Imaging;
using Windows.Storage;
using System.Runtime.InteropServices;
namespace MenuItemProbe;
public sealed partial class ProbeApplication {
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

    (byte[] Pixels,uint Width,uint Height,bool Foreground,string CaptureMode) ScreenPixels()=>CaptureClientPixels(WinRT.Interop.WindowNative.GetWindowHandle(window!),true,true);
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

}
