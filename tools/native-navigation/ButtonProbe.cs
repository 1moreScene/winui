using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Text.Json;
using System.Xml.Linq;
using Windows.Graphics.Imaging;
using Windows.Storage;
using Windows.UI;
namespace NavigationProbe;
public sealed partial class ProbeApplication {
    async Task RunButtons(){
        try {
            var xml=XDocument.Load(Path.Combine(AppContext.BaseDirectory,"Button_themeresources.xaml"));XNamespace x="http://schemas.microsoft.com/winfx/2006/xaml";
            var aliases=xml.Descendants().Where(n=>n.Name.LocalName=="StaticResource"&&((string?)n.Attribute(x+"Key"))?.Contains("Button")==true).Select(n=>(Key:(string)n.Attribute(x+"Key")!,Leaf:(string)n.Attribute("ResourceKey")!)).ToArray();
            var hc=xml.Descendants().First(n=>n.Name.LocalName=="ResourceDictionary"&&(string?)n.Attribute(x+"Key")=="HighContrast").Elements().Where(n=>n.Name.LocalName=="StaticResource").ToDictionary(n=>(string)n.Attribute(x+"Key")!,n=>(string)n.Attribute("ResourceKey")!);
            var hcLeaves=new Dictionary<string,string>{["SystemControlHighlightAccentBrush"]="#FFFF00",["SystemControlForegroundAccentBrush"]="#FFFF00",["SystemControlBackgroundBaseMediumLowBrush"]="#808080",["SystemControlBackgroundBaseLowBrush"]="#000000",["SystemControlHighlightAltAccentBrush"]="#000000",["SystemControlBackgroundChromeWhiteBrush"]="#000000",["SystemControlHighlightBaseHighBrush"]="#FFFFFF",["SystemControlDisabledBaseMediumLowBrush"]="#808080",["SystemControlHighlightBaseMediumLowBrush"]="#808080",["SystemControlHighlightTransparentBrush"]="#00000000",["SystemControlDisabledTransparentBrush"]="#00000000",["SystemControlForegroundTransparentBrush"]="#00000000",["SystemColorHighlightTextColorBrush"]="#000000",["SystemColorButtonTextColorBrush"]="#FFFFFF",["SystemColorHighlightColorBrush"]="#FFFF00"};
            var nativeClicks=0;
            var all=new List<object>();var palettes=new Dictionary<string,object>();
            foreach(var name in new[]{"Light","Dark","HighContrast"}){
                root.Children.Clear();root.Resources.Clear();root.RequestedTheme=name=="Dark"?ElementTheme.Dark:ElementTheme.Light;
                root.Background=name=="Light"?Brush(243,243,243):name=="Dark"?Brush(32,32,32):Brush(0,0,0);
                if(name=="HighContrast")foreach(var pair in hc){var c=hcLeaves[pair.Value];root.Resources[pair.Key]=ParseBrush(c);}
                var palette=new Dictionary<string,object?>();var hidden=new StackPanel{Width=0,Height=0};root.Children.Add(hidden);
                foreach(var key in aliases.Select(a=>a.Leaf).Distinct()){
                    if(name=="HighContrast")continue;
                    var border=(Border)Microsoft.UI.Xaml.Markup.XamlReader.Load("<Border xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\" Background=\"{ThemeResource "+key+"}\"/>");hidden.Children.Add(border);root.UpdateLayout();palette[key]=DescribeButtonBrush(border.Background);
                }
                if(name=="HighContrast")foreach(var pair in hcLeaves)palette[pair.Key]=DescribeButtonBrush(ParseBrush(pair.Value));
                palettes[name]=palette;root.Children.Remove(hidden);
                var canvas=new Canvas();root.Children.Add(canvas);var status=new TextBlock{Text="Native clicks: "+nativeClicks,Foreground=name=="HighContrast"?Brush(255,255,255):name=="Dark"?Brush(255,255,255):Brush(0,0,0)};Canvas.SetLeft(status,24);Canvas.SetTop(status,450);canvas.Children.Add(status);var buttons=new List<(Button Button,string Variant,string State)>();
                foreach(var (variant,col) in new[]{("Standard",0),("Accent",1),("Subtle",2)})foreach(var(state,row)in new[]{("Normal",0),("PointerOver",1),("Pressed",2),("Disabled",3)}){
                    var b=new Button{Content=variant=="Standard"?"Standard XAML button":variant=="Accent"?"Accent style button":"Subtle style button",Width=220,Height=36,IsEnabled=state!="Disabled"};
                    if(variant!="Standard")b.Style=(Style)Application.Current.Resources[variant+"ButtonStyle"];
                    b.Click+=(_,_)=>{status.Text="Native clicks: "+(++nativeClicks);File.AppendAllText(Path.Combine(Program.Output,"live-events.jsonl"),JsonSerializer.Serialize(new{kind="click",variant,state,count=nativeClicks,time=Environment.TickCount64})+Environment.NewLine);};
                    Canvas.SetLeft(b,24+col*320);Canvas.SetTop(b,24+row*100);canvas.Children.Add(b);buttons.Add((b,variant,state));
                }
                await Task.Delay(200);foreach(var entry in buttons)VisualStateManager.GoToState(entry.Button,entry.State,false);await Task.Delay(150);root.UpdateLayout();
                foreach(var entry in buttons){var presenter=Tree(entry.Button).OfType<ContentPresenter>().First();var block=Tree(entry.Button).OfType<TextBlock>().FirstOrDefault();all.Add(new{theme=name,variant=entry.Variant,state=entry.State,bounds=Rect(entry.Button),presenter=Rect(presenter),textBounds=block is null?null:Rect(block),background=DescribeButtonBrush(presenter.Background),foreground=DescribeButtonBrush(presenter.Foreground),border=DescribeButtonBrush(presenter.BorderBrush),padding=entry.Button.Padding,fontSize=entry.Button.FontSize,fontFamily=entry.Button.FontFamily.Source,cornerRadius=entry.Button.CornerRadius,borderThickness=entry.Button.BorderThickness});}
                var bitmap=new RenderTargetBitmap();await bitmap.RenderAsync(root,1000,500);var bytes=(await bitmap.GetPixelsAsync()).ToArray();
                var folder=await StorageFolder.GetFolderFromPathAsync(Program.Output);var file=await folder.CreateFileAsync(name+"-buttons.png",CreationCollisionOption.ReplaceExisting);using var stream=await file.OpenAsync(FileAccessMode.ReadWrite);var encoder=await BitmapEncoder.CreateAsync(BitmapEncoder.PngEncoderId,stream);encoder.SetPixelData(BitmapPixelFormat.Bgra8,BitmapAlphaMode.Premultiplied,(uint)bitmap.PixelWidth,(uint)bitmap.PixelHeight,96,96,bytes);await encoder.FlushAsync();
            }
            File.WriteAllText(Path.Combine(Program.Output,"button-metrics.json"),JsonSerializer.Serialize(all,new JsonSerializerOptions{WriteIndented=true}));File.WriteAllText(Path.Combine(Program.Output,"button-palettes.json"),JsonSerializer.Serialize(palettes,new JsonSerializerOptions{WriteIndented=true}));
            File.WriteAllText(Path.Combine(Program.Output,"button-environment.json"),JsonSerializer.Serialize(new{sdk="2.5.4-experimental / WinUI 2.3.10-experimental",dpi=root.XamlRoot.RasterizationScale,width=1000,height=500,highContrast="explicit deterministic black/white/yellow resource fixture, not OS forced-colors",states="VisualStateManager states after template load; real input verified separately"},new JsonSerializerOptions{WriteIndented=true}));
        }catch(Exception e){File.WriteAllText(Path.Combine(Program.Output,"button-error.txt"),e.ToString());}
    }
    SolidColorBrush ParseBrush(string value){byte c(int i)=>Convert.ToByte(value.Substring(i,2),16);return new SolidColorBrush(Color.FromArgb(value.Length==9?c(7):(byte)255,c(1),c(3),c(5)));}
    double[] BrushMatrix(Transform? transform){if(transform is null)return new double[]{1,0,0,1,0,0};var p=transform.TransformPoint(new Windows.Foundation.Point(0,0));var x=transform.TransformPoint(new Windows.Foundation.Point(1,0));var y=transform.TransformPoint(new Windows.Foundation.Point(0,1));return new[]{x.X-p.X,x.Y-p.Y,y.X-p.X,y.Y-p.Y,p.X,p.Y};}
    object? DescribeButtonBrush(Brush? brush)=>brush switch {
        LinearGradientBrush l=>new{kind="linearGradient",mappingMode=l.MappingMode.ToString(),spreadMethod=l.SpreadMethod.ToString(),relativeTransform=BrushMatrix(l.RelativeTransform),transform=BrushMatrix(l.Transform),from=new[]{l.StartPoint.X,l.StartPoint.Y},to=new[]{l.EndPoint.X,l.EndPoint.Y},stops=l.GradientStops.Select(s=>new{offset=s.Offset,color=$"#{s.Color.R:X2}{s.Color.G:X2}{s.Color.B:X2}{s.Color.A:X2}"}).ToArray(),opacity=l.Opacity},
        _=>Describe(brush)
    };
}
