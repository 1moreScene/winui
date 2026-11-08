using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using Microsoft.UI.Xaml.Markup;
using System.Runtime.InteropServices;
using System.Text.Json;
using Windows.Graphics.Imaging;
using Windows.Storage;
namespace NavigationControlsProbe;
public sealed partial class ProbeApplication {
 [StructLayout(LayoutKind.Sequential)]struct ClientRect {public int left,top,right,bottom;}
 [StructLayout(LayoutKind.Sequential)]struct BitmapInfo {public uint size;public int width,height;public ushort planes,bits;public uint compression,imageSize;public int x,y;public uint used,important;}
 [DllImport("user32.dll")]static extern bool GetClientRect(IntPtr window,out ClientRect rect);
 [DllImport("user32.dll")]static extern IntPtr GetDC(IntPtr window);
 [DllImport("user32.dll")]static extern int ReleaseDC(IntPtr window,IntPtr dc);
 [DllImport("user32.dll")]static extern bool PrintWindow(IntPtr window,IntPtr dc,uint flags);
 [DllImport("gdi32.dll")]static extern IntPtr CreateCompatibleDC(IntPtr dc);
 [DllImport("gdi32.dll")]static extern IntPtr CreateCompatibleBitmap(IntPtr dc,int width,int height);
 [DllImport("gdi32.dll")]static extern IntPtr SelectObject(IntPtr dc,IntPtr value);
 [DllImport("gdi32.dll")]static extern bool DeleteObject(IntPtr value);
 [DllImport("gdi32.dll")]static extern bool DeleteDC(IntPtr dc);
 [DllImport("gdi32.dll")]static extern int GetDIBits(IntPtr dc,IntPtr bitmap,uint start,uint lines,byte[] bytes,ref BitmapInfo info,uint usage);
 async Task OwnCompositorImage(string name){
  var hwnd=WinRT.Interop.WindowNative.GetWindowHandle(window);GetClientRect(hwnd,out var rect);int width=rect.right,height=rect.bottom;var source=GetDC(hwnd);var dc=CreateCompatibleDC(source);var bitmap=CreateCompatibleBitmap(source,width,height);var old=SelectObject(dc,bitmap);
  try{
   if(!PrintWindow(hwnd,dc,3))throw new Exception("Own-client PrintWindow failed; no desktop capture fallback");SelectObject(dc,old);var bytes=new byte[width*height*4];var info=new BitmapInfo{size=(uint)Marshal.SizeOf<BitmapInfo>(),width=width,height=-height,planes=1,bits=32};if(GetDIBits(dc,bitmap,0,(uint)height,bytes,ref info,0)==0)throw new Exception("Own-client bitmap read failed");for(int i=3;i<bytes.Length;i+=4)bytes[i]=255;
   var folder=await StorageFolder.GetFolderFromPathAsync(Program.Output);var file=await folder.CreateFileAsync(name+"-compositor.png",CreationCollisionOption.ReplaceExisting);using var stream=await file.OpenAsync(FileAccessMode.ReadWrite);stream.Size=0;var encoder=await BitmapEncoder.CreateAsync(BitmapEncoder.PngEncoderId,stream);encoder.SetPixelData(BitmapPixelFormat.Bgra8,BitmapAlphaMode.Premultiplied,(uint)width,(uint)height,96,96,bytes);await encoder.FlushAsync();
  }finally{SelectObject(dc,old);DeleteObject(bitmap);DeleteDC(dc);ReleaseDC(hwnd,source);}
 }
 static Grid PagingPattern(string pattern){var grid=new Grid{Background=Solid("2050A0")};if(pattern=="Stripes"){for(int i=0;i<40;i++){var stripe=new Border{Width=10,Background=Solid(i%2==0?"F03020":"2050A0"),HorizontalAlignment=HorizontalAlignment.Left,Margin=new Thickness(i*10,0,0,0)};grid.Children.Add(stripe);}}if(pattern=="ButtonIsland"){grid.Background=Solid("F03020");var island=new Canvas();grid.Children.Add(island);foreach(var x in new[]{1d,383d}){var tile=new Border{Width=16,Height=38,Background=Solid("2050A0")};island.Children.Add(tile);Canvas.SetLeft(tile,x);Canvas.SetTop(tile,116);}}return grid;}
 async Task RefinePagingButtons(){
  var rows=new List<object>();var dpr=root.XamlRoot.RasterizationScale;window.AppWindow.ResizeClient(new Windows.Graphics.SizeInt32((int)Math.Ceiling(800*dpr),(int)Math.Ceiling(450*dpr)));var settings=new Windows.UI.ViewManagement.UISettings();
  foreach(var theme in new[]{"Light","Dark"})foreach(var spec in new[]{("FlipView","Horizontal","Flat"),("FlipView","Horizontal","ButtonIsland"),("FlipView","Horizontal","Stripes"),("FlipView","Vertical","Stripes"),("PipsPager","Horizontal","Flat"),("PipsPager","Horizontal","Stripes"),("PipsPager","Vertical","Stripes")})foreach(var state in new[]{"Normal","PointerOver","Pressed"}){
   var(kind,axis,pattern)=spec;root.Children.Clear();root.RequestedTheme=Enum.Parse<ElementTheme>(theme);root.Background=Solid(theme=="Light"?"F3F3F3":"202020");var canvas=new Canvas();root.Children.Add(canvas);Control control;
   if(kind=="FlipView"){var flip=new FlipView{Width=400,Height=270,ItemsPanel=(ItemsPanelTemplate)XamlReader.Load($"<ItemsPanelTemplate xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\"><VirtualizingStackPanel Orientation=\"{axis}\"/></ItemsPanelTemplate>")};for(int i=0;i<3;i++)flip.Items.Add(PagingPattern(pattern));flip.SelectedIndex=1;control=flip;}
   else{var backdrop=PagingPattern(pattern);backdrop.Width=300;backdrop.Height=220;canvas.Children.Add(backdrop);Canvas.SetLeft(backdrop,24);Canvas.SetTop(backdrop,24);control=new PipsPager{NumberOfPages=10,SelectedPageIndex=4,Orientation=Enum.Parse<Orientation>(axis),PreviousButtonVisibility=PipsPagerButtonVisibility.Visible,NextButtonVisibility=PipsPagerButtonVisibility.Visible};}
   canvas.Children.Add(control);Canvas.SetLeft(control,24);Canvas.SetTop(control,24);root.UpdateLayout();await Task.Delay(750);
   var buttons=Tree(control).OfType<Button>().Where(b=>kind=="FlipView"?b.Name==(axis=="Horizontal"?"NextButtonHorizontal":"NextButtonVertical"):b.Name=="NextPageButton").ToArray();var target=buttons.Single();if(kind=="FlipView")foreach(var b in Tree(control).OfType<Button>().Where(b=>b.Name.Contains(axis))){b.Opacity=1;b.Visibility=Visibility.Visible;}
   VisualStateManager.GoToState(target,state,false);root.UpdateLayout();await Task.Delay(60);var name=$"{theme}-{kind}-{axis}-{pattern}-{state}";await Image(name);await OwnCompositorImage(name);
   if(state=="Normal"){foreach(var button in Tree(control).OfType<Button>().Where(b=>kind=="FlipView"?b.Name.Contains(axis):b.Name is "NextPageButton" or "PreviousPageButton"))button.Opacity=0;root.UpdateLayout();await Task.Delay(60);await OwnCompositorImage($"{theme}-{kind}-{axis}-{pattern}-Source");}
   rows.Add(new{id=name,theme,kind,axis,pattern,state,dpi=dpr,control=Rect(control),button=Rect(target),parts=Tree(target).OfType<FrameworkElement>().Select(Part).ToArray(),capture="PrintWindow own client and RenderTargetBitmap separately"});
  }
  File.WriteAllText(Path.Combine(Program.Output,"navigation-controls-paging-buttons.json"),JsonSerializer.Serialize(new{advancedEffects=settings.AdvancedEffectsEnabled,capture="PrintWindow own client only; no foreground manipulation",cases=rows},Options));
 }
}
