using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using Microsoft.UI.Xaml.Shapes;
using Microsoft.UI.Xaml.Markup;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Text.Json;
using Windows.Foundation;
using Path = System.IO.Path;
namespace NavigationProbe;
public sealed partial class ProbeApplication {
 async Task RunVectors(){try{
  window!.AppWindow.ResizeClient(new Windows.Graphics.SizeInt32((int)Math.Round(1000*root.XamlRoot.RasterizationScale),(int)Math.Round(500*root.XamlRoot.RasterizationScale)));
  var rows=new List<object>();var unsupported=new List<object>();var defaults=new{lineStretch=new Line().Stretch.ToString(),pathStretch=new Microsoft.UI.Xaml.Shapes.Path().Stretch.ToString(),polygonStretch=new Polygon().Stretch.ToString(),polylineStretch=new Polyline().Stretch.ToString(),rectangleStretch=new Rectangle().Stretch.ToString()};var asset=Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"..","..","gallery/public/official/Slices.png"));
  foreach(var theme in new[]{"Light","Dark"})foreach(var kind in new[]{"Rectangle","Line","Path","Polygon","Polyline","FontIcon","PathIcon","BitmapIcon","ImageIcon","IconSourceElement","AnimatedIcon"}){
   root.Children.Clear();root.RequestedTheme=theme=="Light"?ElementTheme.Light:ElementTheme.Dark;root.Background=theme=="Light"?Brush(243,243,243):Brush(32,32,32);var panel=new Canvas();root.Children.Add(panel);var nodes=new List<object>();int index=0;
   async Task Add(FrameworkElement element,object props,Action? initialize=null){if(element is Shape && double.IsNaN(element.Width)&&double.IsNaN(element.Height)){element.Width=180;element.Height=64;var fields=JsonSerializer.Deserialize<Dictionary<string,JsonElement>>(JsonSerializer.Serialize(props))!;fields["width"]=JsonSerializer.SerializeToElement(180);fields["height"]=JsonSerializer.SerializeToElement(64);props=fields;}Canvas.SetLeft(element,24+index%4*240);Canvas.SetTop(element,24+index/4*100);panel.Children.Add(element);root.UpdateLayout();initialize?.Invoke();root.UpdateLayout();await Task.Delay(80);root.UpdateLayout();nodes.Add(new{index=index++,props,bounds=Rect(element),desired=new[]{element.DesiredSize.Width,element.DesiredSize.Height}});}
   var blue=Brush(70,130,180);var black=Brush(0,0,0);
   if(kind=="Rectangle")foreach(var radius in new[]{new[]{0d,0d},new[]{12d,12d},new[]{20d,5d},new[]{0d,24d}})await Add(new Rectangle{Width=120,Height=56,RadiusX=radius[0],RadiusY=radius[1],Fill=blue,Stroke=black,StrokeThickness=4},new{width=120,height=56,radiusX=radius[0],radiusY=radius[1],fill="#4682b4",stroke="#000000",strokeThickness=4});
   if(kind=="Line"){
    foreach(var cap in new[]{PenLineCap.Flat,PenLineCap.Round,PenLineCap.Square,PenLineCap.Triangle})await Add(new Line{X1=4,Y1=6,X2=140,Y2=44,Stroke=black,StrokeThickness=4,StrokeStartLineCap=cap,StrokeEndLineCap=cap},new{x1=4,y1=6,x2=140,y2=44,stroke="#000000",strokeThickness=4,strokeStartLineCap=cap.ToString(),strokeEndLineCap=cap.ToString()});
    foreach(var cap in new[]{PenLineCap.Flat,PenLineCap.Round,PenLineCap.Square})await Add(new Line{X1=4,Y1=6,X2=140,Y2=44,Stroke=black,StrokeThickness=4,StrokeDashArray=new DoubleCollection{2,2},StrokeDashOffset=1,StrokeDashCap=cap},new{x1=4,y1=6,x2=140,y2=44,stroke="#000000",strokeThickness=4,strokeDashArray=new[]{2,2},strokeDashOffset=1,strokeDashCap=cap.ToString()});
   }
   if(kind=="Path"){
    foreach(var stretch in new[]{Stretch.None,Stretch.Fill,Stretch.Uniform,Stretch.UniformToFill}){var path=(Microsoft.UI.Xaml.Shapes.Path)XamlReader.Load("<Path xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\" Data=\"F1 M10 6 L60 6 40 26 Z\"/>");path.Width=120;path.Height=56;path.Fill=blue;path.Stroke=black;path.StrokeThickness=4;path.Stretch=stretch;await Add(path,new{width=120,height=56,data="F1 M10 6 L60 6 40 26 Z",fill="#4682b4",stroke="#000000",strokeThickness=4,stretch=stretch.ToString()});}
    foreach(var rule in new[]{"F0","F1"}){string data=rule+" M0 0 L90 0 90 60 0 60Z M20 15 L70 15 70 45 20 45Z";var path=(Microsoft.UI.Xaml.Shapes.Path)XamlReader.Load($"<Path xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\" Data=\"{data}\"/>");path.Fill=blue;await Add(path,new{data,fill="#4682b4"});}
   }
   if(kind is "Polygon" or "Polyline"){
    var pts=new[]{new Point(5,5),new Point(140,5),new Point(5,45),new Point(75,0),new Point(140,45)};
    foreach(var rule in new[]{FillRule.EvenOdd,FillRule.Nonzero})foreach(var join in new[]{PenLineJoin.Miter,PenLineJoin.Bevel,PenLineJoin.Round}){
     Shape shape=kind=="Polygon"?new Polygon{Points=new PointCollection(),FillRule=rule}:new Polyline{Points=new PointCollection(),FillRule=rule};foreach(var pt in pts){if(shape is Polygon pg)pg.Points.Add(pt);else ((Polyline)shape).Points.Add(pt);}shape.Fill=blue;shape.Stroke=black;shape.StrokeThickness=4;shape.StrokeLineJoin=join;await Add(shape,new{points=pts.Select(p=>new[]{p.X,p.Y}).ToArray(),fill="#4682b4",stroke="#000000",strokeThickness=4,fillRule=rule.ToString(),strokeLineJoin=join.ToString()});
    }
   }
   if(kind is "BitmapIcon" or "ImageIcon")foreach(var wide in new[]{false,true})foreach(var tall in new[]{false,true}){double width=wide?180:50;IconElement icon=kind=="BitmapIcon"?new BitmapIcon{UriSource=new Uri(asset),ShowAsMonochrome=false}:new ImageIcon{Source=new BitmapImage(new Uri(asset))};icon.Width=width;if(tall)icon.Height=120;await Add(icon,kind=="BitmapIcon"?(object)new{width,height=tall?(double?)120:null,uriSource="/official/Slices.png",showAsMonochrome=false}:new{width,height=tall?(double?)120:null,source="/official/Slices.png"});}
   if(kind=="FontIcon")foreach(var rtl in new[]{false,true})foreach(var mirror in new[]{false,true})await Add(new FontIcon{Width=40,Height=40,Glyph="\uE72B",FontFamily=new FontFamily("Segoe MDL2 Assets"),FlowDirection=rtl?FlowDirection.RightToLeft:FlowDirection.LeftToRight,MirroredWhenRightToLeft=mirror,Foreground=Brush(0,103,192)},new{width=40,height=40,glyph="\uE72B",fontFamily="Segoe MDL2 Assets",flowDirection=rtl?"RightToLeft":"LeftToRight",mirroredWhenRightToLeft=mirror,foreground="#0067c0"});
   if(kind=="PathIcon")foreach(var width in new[]{20d,40d,80d}){const string data="F1 M16,12 20,2 L20,16 1,16";var icon=(PathIcon)XamlReader.Load($"<PathIcon xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\" Data=\"{data}\"/>");icon.Width=width;icon.Height=40;icon.Foreground=Brush(0,103,192);await Add(icon,new{width,height=40,data,foreground="#0067c0"});}
   if(kind is "IconSourceElement" or "AnimatedIcon"){
    var pathGeometry=new PathGeometry();var figure=new PathFigure{StartPoint=new Point(0,0),IsClosed=true};foreach(var point in new[]{new Point(20,0),new Point(20,20),new Point(0,20)})figure.Segments.Add(new LineSegment{Point=point});pathGeometry.Figures.Add(figure);
    var sources=new (IconSource Source,object Props)[]{
     (new FontIconSource{Glyph="\uE790",FontFamily=new FontFamily("Segoe MDL2 Assets"),Foreground=Brush(192,0,0)},new{kind="Font",glyph="\uE790",fontFamily="Segoe MDL2 Assets",foreground="#c00000"}),
     (new SymbolIconSource{Symbol=Symbol.Accept},new{kind="Symbol",symbol="Accept"}),
     (new PathIconSource{Data=pathGeometry},new{kind="Path",data="M0 0L20 0 20 20 0 20Z"}),
     (new BitmapIconSource{UriSource=new Uri(asset)},new{kind="Bitmap",uriSource="/official/Slices.png"}),
     (new ImageIconSource{ImageSource=new BitmapImage(new Uri(asset))},new{kind="Image",source="/official/Slices.png"}),
    };
    foreach(var src in sources){if(kind=="IconSourceElement"&&src.Source is ImageIconSource)continue;try {IconElement icon=kind=="IconSourceElement"?new IconSourceElement():new AnimatedIcon{FallbackIconSource=src.Source};icon.Width=48;icon.Height=48;icon.Foreground=Brush(0,103,192);await Add(icon,kind=="IconSourceElement"?(object)new{width=48,height=48,foreground="#0067c0",iconSource=src.Props}:new{width=48,height=48,foreground="#0067c0",fallbackIconSource=src.Props},kind=="IconSourceElement"?()=>((IconSourceElement)icon).IconSource=src.Source:null);} catch(Exception e){unsupported.Add(new{theme,kind,sourceType=src.Source.GetType().Name,props=src.Props,error=e.Message,hresult=e.HResult});}}

   }
   root.UpdateLayout();await Task.Delay(150);var bitmap=new RenderTargetBitmap();uint w=(uint)Math.Round(1000*root.XamlRoot.RasterizationScale),h=(uint)Math.Round(500*root.XamlRoot.RasterizationScale);await bitmap.RenderAsync(root,1000,500);w=(uint)bitmap.PixelWidth;h=(uint)bitmap.PixelHeight;await SaveEffectImage($"{theme}-{kind}",(await bitmap.GetPixelsAsync()).ToArray(),w,h);rows.Add(new{theme,kind,nodes,pixelWidth=w,pixelHeight=h});File.WriteAllText(Path.Combine(Program.Output,"vectors-progress.json"),JsonSerializer.Serialize(new{dpi=root.XamlRoot.RasterizationScale,defaults,rows,unsupported},EffectsJson));
  }
  File.WriteAllText(Path.Combine(Program.Output,"vectors-metrics.json"),JsonSerializer.Serialize(new{dpi=root.XamlRoot.RasterizationScale,defaults,rows,unsupported,reference="Own per-monitor matching-SDK RTB natural/explicit vector and icon-source matrix, not release-window pixel acceptance"},EffectsJson));File.WriteAllText(Path.Combine(Program.Output,"vectors-complete.json"),"{}");
 }catch(Exception e){File.WriteAllText(Path.Combine(Program.Output,"vectors-error.txt"),e.ToString());}Exit();}
}
