using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using Microsoft.UI.Xaml.Markup;
using System.Text.Json;
using System.Runtime.InteropServices.WindowsRuntime;
namespace NavigationProbe;
public sealed partial class ProbeApplication{
 async Task RunIcons(){try{
  var rows=new List<object>();var file=Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"..","..","gallery","public","official","Slices.png"));
  foreach(var theme in new[]{"Light","Dark"})foreach(var kind in new[]{"FontIcon","SymbolIcon","PathIcon","BitmapIcon","ImageIcon"}){
   root.Children.Clear();root.Resources.Clear();root.RequestedTheme=theme=="Dark"?ElementTheme.Dark:ElementTheme.Light;root.Background=theme=="Dark"?Brush(32,32,32):Brush(243,243,243);var panel=new Canvas();root.Children.Add(panel);int index=0;
   async Task Add(IconElement icon,object props){icon.Foreground=Brush(0,103,192);Canvas.SetLeft(icon,24+index%4*240);Canvas.SetTop(icon,24+index/4*100);panel.Children.Add(icon);root.UpdateLayout();await Task.Delay(160);root.UpdateLayout();rows.Add(new{theme,kind,index=index++,props,bounds=Rect(icon),desired=new[]{icon.DesiredSize.Width,icon.DesiredSize.Height}});}
   if(kind=="FontIcon")foreach(var size in new[]{12d,20d,32d})await Add(new FontIcon{Glyph="\uE790",FontFamily=new FontFamily("Segoe MDL2 Assets"),FontSize=size},new{glyph="\uE790",fontFamily="Segoe MDL2 Assets",fontSize=size});
   if(kind=="SymbolIcon")foreach(var symbol in new[]{Symbol.Accept,Symbol.Emoji,Symbol.Back,Symbol.Important})await Add(new SymbolIcon{Symbol=symbol},new{symbol=symbol.ToString()});
   if(kind=="PathIcon")foreach(var data in new[]{"F1 M16,12 20,2 L20,16 1,16","M0 0 L20 0 20 20 0 20 Z","M0 0 C20 0 0 20 20 20 L0 20 Z","M10 0 A10 10 0 1 1 9.999 0 Z"}){var icon=(PathIcon)XamlReader.Load($"<PathIcon xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\" Data=\"{data}\"/>");await Add(icon,new{data});}
   if(kind=="BitmapIcon")foreach(var mono in new[]{true,false})foreach(var width in new[]{30d,50d})await Add(new BitmapIcon{UriSource=new Uri(file),ShowAsMonochrome=mono,Width=width},new{uriSource="/official/Slices.png",showAsMonochrome=mono,width});
   if(kind=="ImageIcon")foreach(var width in new[]{30d,50d})await Add(new ImageIcon{Source=new BitmapImage(new Uri(file)),Width=width},new{source="/official/Slices.png",width});
   await Task.Delay(100);root.UpdateLayout();var bitmap=new RenderTargetBitmap();await bitmap.RenderAsync(root,1000,500);await SaveEffectImage($"{theme}-{kind}",(await bitmap.GetPixelsAsync()).ToArray(),(uint)bitmap.PixelWidth,(uint)bitmap.PixelHeight);
  }
  var dllHash=Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(File.ReadAllBytes(Path.Combine(AppContext.BaseDirectory,"Microsoft.UI.Xaml.dll"))));
  File.WriteAllText(Path.Combine(Program.Output,"icons-metrics.json"),JsonSerializer.Serialize(new{environment=new{dpi=root.XamlRoot.RasterizationScale,dllSha256=dllHash},rows,reference="Own fixed-SDK IconElement RTB probe, not Store release pixel acceptance"},EffectsJson));
  File.WriteAllText(Path.Combine(Program.Output,"icons-complete.json"),"{}");
 }catch(Exception e){File.WriteAllText(Path.Combine(Program.Output,"icons-error.txt"),e.ToString());}Exit();}
}
