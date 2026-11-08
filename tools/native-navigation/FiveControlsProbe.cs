using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Markup;
using Microsoft.UI.Xaml.Media.Imaging;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Text.Json;
namespace NavigationProbe;
public sealed partial class ProbeApplication {
 async Task RunFiveControls(){try{
  var ir=JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"five-controls-template.json")));
  var palettes=new Dictionary<string,object>();var matrix=new List<object>();var galleryBadges=new List<object>();
  foreach(var theme in new[]{"Light","Dark"}){
   root.Children.Clear();root.Resources.Clear();root.RequestedTheme=theme=="Dark"?ElementTheme.Dark:ElementTheme.Light;root.Background=theme=="Dark"?Brush(32,32,32):Brush(243,243,243);
   var colors=new Dictionary<string,object>();
   foreach(var p in ir.RootElement.GetProperty("requiredBrushes").EnumerateObject()){
    var b=(Border)XamlReader.Load($"<Border xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\" Background=\"{{ThemeResource {p.Name}}}\"/>");root.Children.Add(b);root.UpdateLayout();colors[p.Name]=DescribeButtonBrush(b.Background)??throw new Exception("Missing brush "+p.Name);root.Children.Remove(b);
   }palettes[theme]=colors;
   foreach(var kind in new[]{"Border","Canvas","HyperlinkButton","Expander","InfoBadge"}){
    root.Children.Clear();var canvas=new Canvas();root.Children.Add(canvas);int i=0;
    async Task Add(FrameworkElement e,object props,object? extra=null){Canvas.SetLeft(e,24+i%4*240);Canvas.SetTop(e,24+i/4*(kind=="Expander"?160:85));canvas.Children.Add(e);i++;root.UpdateLayout();await Task.Delay(20);matrix.Add(new{theme,kind,index=i-1,props,bounds=Rect(e),desired=new[]{e.DesiredSize.Width,e.DesiredSize.Height},extra});}
    if(kind=="Border")foreach(var b in new[]{0d,2d,6d})foreach(var radius in new[]{0d,12d}){var border=new Border{Width=180,Height=65,Padding=new Thickness(8),BorderThickness=new Thickness(b),CornerRadius=new CornerRadius(radius),BorderBrush=Brush(0,103,192),Background=Brush(255,255,255),Child=new Grid{Background=Brush(173,216,230)}};await Add(border,new{width=180,height=65,padding=new[]{8,8,8,8},borderThickness=new[]{b,b,b,b},cornerRadius=radius,borderBrush="#0067c0",background="#ffffff"});}
    if(kind=="Canvas"){
     var c=new Canvas{Width=180,Height=65,Background=Brush(255,255,255)};
     foreach(var left in new[]{10d,50d,90d}){var child=new Border{Width=50,Height=35,Background=Brush(0,(byte)(50+left),192)};Canvas.SetLeft(child,left);Canvas.SetTop(child,10);c.Children.Add(child);}await Add(c,new{width=180,height=65,background="#ffffff"});
    }
    if(kind=="Border"){
     var b=new Border{Width=180,Height=65,Padding=new Thickness(8),BorderThickness=new Thickness(2,4,6,8),CornerRadius=new CornerRadius(12),BorderBrush=Brush(0,103,192),Background=Brush(255,255,255),Child=new Grid{Background=Brush(173,216,230)}};
     await Add(b,new{width=180,height=65,padding=new[]{8,8,8,8},borderThickness=new[]{2,4,6,8},cornerRadius=12,borderBrush="#0067c0",background="#ffffff"});
    }
    if(kind=="HyperlinkButton")foreach(var state in new[]{"Normal","PointerOver","Pressed","Disabled"}){var b=new HyperlinkButton{Content="Hyperlink",IsEnabled=state!="Disabled"};await Add(b,new{text="Hyperlink",state});VisualStateManager.GoToState(b,state,false);root.UpdateLayout();await Task.Delay(100);matrix[^1]=new{theme,kind,index=i-1,props=new{text="Hyperlink",state},bounds=Rect(b),desired=new[]{b.DesiredSize.Width,b.DesiredSize.Height},extra=new{padding=b.Padding,minWidth=b.MinWidth,minHeight=b.MinHeight,radius=b.CornerRadius,textBounds=Rect(Tree(b).OfType<TextBlock>().First()),underline=Tree(b).OfType<TextBlock>().First().TextDecorations.ToString()}};}
    if(kind=="Expander")foreach(var direction in new[]{ExpandDirection.Down,ExpandDirection.Up})foreach(var open in new[]{false,true}){var b=new Expander{Width=200,Header="Header",IsExpanded=open,ExpandDirection=direction,Content=new Grid{Width=100,Height=30,Background=Brush(173,216,230)}};await Add(b,new{width=200,header="Header",isExpanded=open,expandDirection=direction.ToString()});root.UpdateLayout();matrix[^1]=new{theme,kind,index=i-1,props=new{width=200,header="Header",isExpanded=open,expandDirection=direction.ToString()},bounds=Rect(b),desired=new[]{b.DesiredSize.Width,b.DesiredSize.Height},extra=new{minWidth=b.MinWidth,minHeight=b.MinHeight,padding=b.Padding,header=Rect(Tree(b).OfType<ToggleButton>().First()),parts=Tree(b).OfType<FrameworkElement>().Where(x=>x.Name is "ExpanderContent" or "ExpanderContentClip").Select(x=>new{name=x.Name,bounds=Rect(x)}).ToArray()}};}
    if(kind=="InfoBadge"){
     foreach(var style in new[]{"Default","Attention","Informational","Success","Caution","Critical"})foreach(var value in new[]{-1,5,123}){var b=new InfoBadge{Value=value};if(style!="Default")b.Style=(Style)Application.Current.Resources[$"{style}ValueInfoBadgeStyle"];await Add(b,new{value,badgeStyle=style});matrix[^1]=new{theme,kind,index=i-1,props=new{value,badgeStyle=style},bounds=Rect(b),desired=new[]{b.DesiredSize.Width,b.DesiredSize.Height},extra=new{textBounds=value>=0?Rect(Tree(b).OfType<TextBlock>().First()):null}};}
     var icon=new InfoBadge{IconSource=new FontIconSource{Glyph="\uEA38"}};await Add(icon,new{value=-1,badgeStyle="Default",glyph="\uEA38"});
     matrix[^1]=new{theme,kind,index=i-1,props=new{value=-1,badgeStyle="Default",glyph="\uEA38"},bounds=Rect(icon),desired=new[]{icon.DesiredSize.Width,icon.DesiredSize.Height},extra=new{icons=Tree(icon).OfType<FontIcon>().Select(x=>new{bounds=Rect(x),fontSize=x.FontSize}).ToArray(),presenters=Tree(icon).OfType<Viewbox>().Select(x=>Rect(x)).ToArray()}};
    }
    if(kind=="Expander")foreach(var state in new[]{"PointerOver","Pressed","Disabled"}){
     var e=new Expander{Width=200,Header="Header",IsEnabled=state!="Disabled",Content=new Grid{Width=100,Height=30,Background=Brush(173,216,230)}};
     await Add(e,new{width=200,header="Header",state,enabled=state!="Disabled"});
     VisualStateManager.GoToState(Tree(e).OfType<ToggleButton>().First(),state,false);
    }
    await Task.Delay(550);root.UpdateLayout();
    if(kind=="Expander")foreach(var exp in canvas.Children.OfType<Expander>()){
     var groupRoot=Tree(exp).OfType<FrameworkElement>().First(x=>VisualStateManager.GetVisualStateGroups(x).Any(g=>g.Name=="ExpandStates"));
     var story=VisualStateManager.GetVisualStateGroups(groupRoot).First(g=>g.Name=="ExpandStates").CurrentState.Storyboard;
     story.Pause();story.SeekAlignedToLastTick(TimeSpan.FromSeconds(1));
    }
    await Task.Delay(50);root.UpdateLayout();
    if(kind=="Expander")foreach(var exp in canvas.Children.OfType<Expander>().Where(x=>x.IsExpanded)){
     var child=(FrameworkElement)exp.Content;var content=Tree(exp).OfType<Border>().First(x=>x.Name=="ExpanderContent");
     File.WriteAllText(Path.Combine(Program.Output,$"{theme}-Expander-{canvas.Children.IndexOf(exp)}-parts.json"),JsonSerializer.Serialize(new{child=Rect(child),content=Rect(content),childVisibility=child.Visibility.ToString(),childOpacity=child.Opacity,contentOpacity=content.Opacity,contentVisibility=content.Visibility.ToString()},EffectsJson));
     var part=new RenderTargetBitmap();await part.RenderAsync(content);await SaveEffectImage($"{theme}-Expander-{canvas.Children.IndexOf(exp)}-content",(await part.GetPixelsAsync()).ToArray(),(uint)part.PixelWidth,(uint)part.PixelHeight);
    }
    if(kind=="Expander"){
     var hwnd=WinRT.Interop.WindowNative.GetWindowHandle(window!);GetClientRect(hwnd,out var area);int w=area.Right-area.Left,h=area.Bottom-area.Top;
     var dc=GetDC(hwnd);var mem=CreateCompatibleDC(dc);var native=CreateCompatibleBitmap(dc,w,h);var old=SelectObject(mem,native);
     try{if(!PrintWindow(hwnd,mem,3))throw new Exception("Own window capture failed");SelectObject(mem,old);var bytes=new byte[w*h*4];var info=new BitmapInfo{Size=(uint)System.Runtime.InteropServices.Marshal.SizeOf<BitmapInfo>(),Width=w,Height=-h,Planes=1,BitCount=32};if(GetDIBits(mem,native,0,(uint)h,bytes,ref info,0)==0)throw new Exception("Own window pixels missing");for(int p=3;p<bytes.Length;p+=4)bytes[p]=255;await SaveEffectImage($"{theme}-{kind}-own-window",bytes,(uint)w,(uint)h);}
     finally{SelectObject(mem,old);DeleteObject(native);DeleteDC(mem);ReleaseDC(hwnd,dc);}
    }
    var bitmap=new RenderTargetBitmap();await bitmap.RenderAsync(root,1000,500);await SaveEffectImage($"{theme}-{kind}",(await bitmap.GetPixelsAsync()).ToArray(),(uint)bitmap.PixelWidth,(uint)bitmap.PixelHeight);
   }
   foreach(var style in new[]{"Attention","Informational","Success","Critical"}){
    root.Children.Clear();var host=new Canvas();root.Children.Add(host);var panel=new StackPanel{Orientation=Orientation.Horizontal,Spacing=20};Canvas.SetLeft(panel,24);Canvas.SetTop(panel,24);host.Children.Add(panel);
    var icon=new InfoBadge{Style=(Style)Application.Current.Resources[$"{style}IconInfoBadgeStyle"],HorizontalAlignment=HorizontalAlignment.Right};
    var number=new InfoBadge{Style=(Style)Application.Current.Resources[$"{style}ValueInfoBadgeStyle"],Value=10,HorizontalAlignment=HorizontalAlignment.Right};
    var dot=new InfoBadge{Style=(Style)Application.Current.Resources[$"{style}DotInfoBadgeStyle"],VerticalAlignment=VerticalAlignment.Center};
    panel.Children.Add(icon);panel.Children.Add(number);panel.Children.Add(dot);root.UpdateLayout();await Task.Delay(50);
    galleryBadges.Add(new{theme,style,bounds=Rect(panel),nodes=new[]{icon,number,dot}.Select(b=>new{bounds=Rect(b),padding=b.Padding,desired=new[]{b.DesiredSize.Width,b.DesiredSize.Height},iconSource=b.IconSource?.GetType().Name}).ToArray()});
    var image=new RenderTargetBitmap();await image.RenderAsync(root);await SaveEffectImage($"{theme}-BadgeGallery-{style}",(await image.GetPixelsAsync()).ToArray(),(uint)image.PixelWidth,(uint)image.PixelHeight);
   }
  }
  File.WriteAllText(Path.Combine(Program.Output,"sdk-symbols.json"),JsonSerializer.Serialize(Enum.GetNames<Symbol>().ToDictionary(n=>n,n=>(int)Enum.Parse<Symbol>(n)),EffectsJson));
  File.WriteAllText(Path.Combine(Program.Output,"icon-defaults.json"),JsonSerializer.Serialize(new{symbol=new SymbolIcon().Symbol.ToString(),fontSize=new FontIcon().FontSize,fontFamily=new FontIcon().FontFamily.Source,bitmapMonochrome=new BitmapIcon().ShowAsMonochrome},EffectsJson));
  File.WriteAllText(Path.Combine(Program.Output,"five-controls-palettes.json"),JsonSerializer.Serialize(palettes,EffectsJson));
  File.WriteAllText(Path.Combine(Program.Output,"five-controls-metrics.json"),JsonSerializer.Serialize(new{environment=new{dpi=root.XamlRoot.RasterizationScale},matrix,galleryBadges,reference="Own matching-SDK probe; forced states and RTB do not establish Store present-time parity"},EffectsJson));
  File.WriteAllText(Path.Combine(Program.Output,"five-controls-complete.json"),"{\"complete\":true}");
 }catch(Exception e){File.WriteAllText(Path.Combine(Program.Output,"five-controls-error.txt"),e.ToString());}Exit();}
}

