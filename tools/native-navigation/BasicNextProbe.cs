using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Markup;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using Rectangle = Microsoft.UI.Xaml.Shapes.Rectangle;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Text.Json;
using Windows.Foundation;
namespace NavigationProbe;
public sealed partial class ProbeApplication {
    [DllImport("user32.dll")] static extern bool PostMessage(IntPtr hwnd,uint message,IntPtr wParam,IntPtr lParam);
    [DllImport("user32.dll")] static extern IntPtr GetFocus();
    [DllImport("user32.dll")] static extern IntPtr FindWindowEx(IntPtr parent,IntPtr after,string? className,string? name);
    async Task RunBasicNext(){
        try{
            var ir=JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"basic-next-template.json")));
            var palettes=new Dictionary<string,object>();var repeat=new List<object>();var boxes=new List<object>();var measurements=new List<object>();var keyRuns=new List<object>();object? galleryContent=null;
            var defaults=new RepeatButton();var boxDefaults=new Viewbox();
            File.WriteAllText(Path.Combine(Program.Output,"basic-next-defaults.json"),JsonSerializer.Serialize(new{delay=defaults.Delay,interval=defaults.Interval,clickMode=defaults.ClickMode.ToString(),horizontalContentAlignment=defaults.HorizontalContentAlignment.ToString(),verticalContentAlignment=defaults.VerticalContentAlignment.ToString(),stretch=boxDefaults.Stretch.ToString(),stretchDirection=boxDefaults.StretchDirection.ToString()},EffectsJson));
            const string ns="xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\"";
            foreach(var theme in new[]{"Light","Dark","HighContrast"}){
                root.Children.Clear();root.Resources.Clear();root.RequestedTheme=theme=="Dark"?ElementTheme.Dark:ElementTheme.Light;root.Background=theme=="Light"?Brush(243,243,243):theme=="Dark"?Brush(32,32,32):Brush(0,0,0);
                var palette=new Dictionary<string,object>();
                foreach(var p in ir.RootElement.GetProperty("requiredBrushes").EnumerateObject()){
                    if(theme=="HighContrast"){
                        var leaf=ir.RootElement.GetProperty("sourceAliases").GetProperty(theme).GetProperty(p.Name).GetString()!;
                        var value=leaf.Contains("Transparent")?Brush(0,0,0,0):leaf.Contains("BaseMediumLow")?Brush(128,128,128):leaf.Contains("BackgroundBaseLow")?Brush(0,0,0):Brush(255,255,255);
                        root.Resources[p.Name]=value;palette[p.Name]=DescribeButtonBrush(value)!;
                    }else{
                        var border=(Border)XamlReader.Load($"<Border {ns} Background=\"{{ThemeResource {p.Name}}}\"/>");root.Children.Add(border);root.UpdateLayout();palette[p.Name]=DescribeButtonBrush(border.Background)??throw new Exception("Unresolved "+p.Name);root.Children.Remove(border);
                    }
                }
                palettes[theme]=palette;
                var canvas=new Canvas();root.Children.Add(canvas);var controls=new List<(RepeatButton Control,string State)>();int index=0;
                foreach(var state in new[]{"Normal","PointerOver","Pressed","Disabled"}){
                    var button=new RepeatButton{Content="Click and hold",IsEnabled=state!="Disabled"};Canvas.SetLeft(button,24+index*220);Canvas.SetTop(button,24);canvas.Children.Add(button);controls.Add((button,state));index++;
                }
                await Task.Delay(100);root.UpdateLayout();foreach(var entry in controls){VisualStateManager.GoToState(entry.Control,entry.State,false);repeat.Add(new{theme,state=entry.State,bounds=Rect(entry.Control),padding=entry.Control.Padding,fontSize=entry.Control.FontSize,fontFamily=entry.Control.FontFamily.Source,textBounds=Tree(entry.Control).OfType<TextBlock>().Select(x=>Rect(x)).FirstOrDefault(),radius=entry.Control.CornerRadius,delay=entry.Control.Delay,interval=entry.Control.Interval,clickMode=entry.Control.ClickMode.ToString()});}
                await Task.Delay(100);var bitmap=new RenderTargetBitmap();await bitmap.RenderAsync(root,1000,500);await SaveEffectImage($"{theme}-RepeatButton",(await bitmap.GetPixelsAsync()).ToArray(),(uint)bitmap.PixelWidth,(uint)bitmap.PixelHeight);
                if(theme=="HighContrast")continue;
                foreach(var size in new[]{"Large","Small","SmallExplicit"}){
                    root.Children.Clear();var panel=new Canvas();root.Children.Add(panel);index=0;
                    foreach(var stretch in new[]{Stretch.None,Stretch.Fill,Stretch.Uniform,Stretch.UniformToFill})foreach(var direction in new[]{StretchDirection.UpOnly,StretchDirection.DownOnly,StretchDirection.Both}){
                        double width=size=="Small"?60:180,height=size=="Small"?40:100;
                        var content=new Grid{Width=100,Height=50,Background=Brush(169,169,169)};
                        foreach(var (left,color) in new[]{(0,Brush(0,0,255)),(25,Brush(0,128,0)),(50,Brush(255,0,0)),(75,Brush(255,255,0))}){var rectangle=new Rectangle{Width=25,Height=10,Fill=color,HorizontalAlignment=HorizontalAlignment.Left,VerticalAlignment=VerticalAlignment.Top,Margin=new Thickness(left,0,0,0)};content.Children.Add(rectangle);}
                        var vb=new Viewbox{Stretch=stretch,StretchDirection=direction,Child=content};if(size=="SmallExplicit"){vb.Width=60;vb.Height=40;}var slot=new Grid{Width=width,Height=height};slot.Children.Add(vb);Canvas.SetLeft(slot,24+index%4*240);Canvas.SetTop(slot,24+index/4*150);panel.Children.Add(slot);index++;
                        await Task.Delay(3);root.UpdateLayout();var transform=content.TransformToVisual(root);var origin=transform.TransformPoint(new Point(0,0));var end=transform.TransformPoint(new Point(100,50));
                        boxes.Add(new{theme,size,explicitWidth=size=="SmallExplicit"?(double?)60:null,explicitHeight=size=="SmallExplicit"?(double?)40:null,stretch=stretch.ToString(),direction=direction.ToString(),slot=Rect(slot),bounds=Rect(vb),child=Rect(content),desired=new[]{vb.DesiredSize.Width,vb.DesiredSize.Height},scale=new[]{(end.X-origin.X)/100,(end.Y-origin.Y)/50}});
                    }
                    await Task.Delay(50);var image=new RenderTargetBitmap();await image.RenderAsync(root,1000,500);await SaveEffectImage($"{theme}-Viewbox-{size}",(await image.GetPixelsAsync()).ToArray(),(uint)image.PixelWidth,(uint)image.PixelHeight);
                }
            }
            foreach(var stretch in new[]{Stretch.None,Stretch.Fill,Stretch.Uniform,Stretch.UniformToFill})foreach(var constraint in new[]{new Size(double.PositiveInfinity,75),new Size(200,double.PositiveInfinity),new Size(double.PositiveInfinity,double.PositiveInfinity),new Size(0,100)}){
                var vb=new Viewbox{Stretch=stretch,Child=new Grid{Width=100,Height=50}};vb.Measure(constraint);measurements.Add(new{stretch=stretch.ToString(),available=new double?[]{double.IsInfinity(constraint.Width)?null:constraint.Width,double.IsInfinity(constraint.Height)?null:constraint.Height},desired=new[]{vb.DesiredSize.Width,vb.DesiredSize.Height}});
            }
            root.Children.Clear();root.Resources.Clear();root.RequestedTheme=ElementTheme.Light;root.Background=Brush(243,243,243);
            var contentStack=new StackPanel{Background=Brush(169,169,169)};var stripe=new StackPanel{Orientation=Orientation.Horizontal};
            foreach(var fill in new[]{Brush(0,0,255),Brush(0,128,0),Brush(255,0,0),Brush(255,255,0)})stripe.Children.Add(new Rectangle{Width=40,Height=10,Fill=fill});contentStack.Children.Add(stripe);
            var bitmapSource=new Microsoft.UI.Xaml.Media.Imaging.BitmapImage(new Uri(Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"..","..","gallery","public","official","Slices.png"))));
            var picture=new Image{Source=bitmapSource};contentStack.Children.Add(picture);contentStack.Children.Add(new TextBlock{Text="This is text.",HorizontalAlignment=HorizontalAlignment.Center});
            var borderContent=new Border{BorderBrush=Brush(128,128,128),BorderThickness=new Thickness(15),Child=contentStack};var galleryBox=new Viewbox{Width=200,Height=200,HorizontalAlignment=HorizontalAlignment.Left,VerticalAlignment=VerticalAlignment.Top,Child=borderContent};root.Children.Add(galleryBox);
            for(int wait=0;bitmapSource.PixelWidth==0&&wait<50;wait++)await Task.Delay(30);if(bitmapSource.PixelWidth==0)throw new Exception("Gallery image did not decode");root.UpdateLayout();await Task.Delay(50);
            galleryContent=new{bounds=Rect(galleryBox),content=Rect(borderContent),picture=Rect(picture),desired=new[]{galleryBox.DesiredSize.Width,galleryBox.DesiredSize.Height},pixelWidth=bitmapSource.PixelWidth,pixelHeight=bitmapSource.PixelHeight};
            var galleryBitmap=new RenderTargetBitmap();await galleryBitmap.RenderAsync(root,1000,500);await SaveEffectImage("Light-Viewbox-Gallery",(await galleryBitmap.GetPixelsAsync()).ToArray(),(uint)galleryBitmap.PixelWidth,(uint)galleryBitmap.PixelHeight);
            root.Children.Clear();root.Resources.Clear();root.RequestedTheme=ElementTheme.Light;var held=new RepeatButton{Content="Own-window key timer",Delay=120,Interval=60};root.Children.Add(held);await Task.Delay(100);held.Focus(FocusState.Keyboard);var hwnd=WinRT.Interop.WindowNative.GetWindowHandle(window!);var keyTarget=GetFocus();if(keyTarget==IntPtr.Zero)keyTarget=FindWindowEx(hwnd,IntPtr.Zero,"Microsoft.UI.Content.DesktopChildSiteBridge",null);if(keyTarget==IntPtr.Zero)keyTarget=hwnd;
            foreach(var key in new[]{32,13}){
                var clicks=new List<double>();var clock=System.Diagnostics.Stopwatch.StartNew();RoutedEventHandler handler=(_,_)=>clicks.Add(clock.Elapsed.TotalMilliseconds);held.Click+=handler;
                PostMessage(keyTarget,0x100,new IntPtr(key),new IntPtr(key==32?0x00390001:0x001C0001));await Task.Delay(430);PostMessage(keyTarget,0x101,new IntPtr(key),new IntPtr(unchecked((int)(key==32?0xC0390001:0xC01C0001))));await Task.Delay(150);held.Click-=handler;keyRuns.Add(new{key,delay=held.Delay,interval=held.Interval,clicks});
            }
            File.WriteAllText(Path.Combine(Program.Output,"basic-next-palettes.json"),JsonSerializer.Serialize(palettes,EffectsJson));
            File.WriteAllText(Path.Combine(Program.Output,"basic-next-metrics.json"),JsonSerializer.Serialize(new{environment=new{sdk="Microsoft.WindowsAppSDK 2.5.4-experimental",dpi=root.XamlRoot.RasterizationScale,os=Environment.OSVersion.ToString()},repeat,boxes,measurements,keyRuns,galleryContent,reference="Own matching-SDK forced-state/own-window-message probe; not Store release present-time acceptance"},EffectsJson));
            File.WriteAllText(Path.Combine(Program.Output,"basic-next-complete.json"),"{\"complete\":true}");
        }catch(Exception e){File.WriteAllText(Path.Combine(Program.Output,"basic-next-error.txt"),e.ToString());}
        Exit();
    }
}
