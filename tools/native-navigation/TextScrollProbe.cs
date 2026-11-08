using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Markup;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Text.Json;
namespace NavigationProbe;
public sealed partial class ProbeApplication {
    [DllImport("user32.dll")] static extern uint GetCaretBlinkTime();
    async Task RunTextScroll() {
        try {
            var ir=JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"text-scroll-template.json")));
            var palettes=new Dictionary<string,object>();var matrix=new List<object>();
            const string ns="xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\"";
            foreach(var theme in new[]{"Light","Dark","HighContrast"}) {
                root.Children.Clear();root.Resources.Clear();root.RequestedTheme=theme=="Dark"?ElementTheme.Dark:ElementTheme.Light;
                root.Background=theme=="Dark"?Brush(32,32,32):theme=="Light"?Brush(243,243,243):Brush(0,0,0);
                var palette=new Dictionary<string,object>();
                foreach(var p in ir.RootElement.GetProperty("requiredBrushes").EnumerateObject()) {
                    if(theme=="HighContrast") {
                        var color=p.Name.Contains("Background")||p.Name=="ScrollBarTrackFill"?"#000000":p.Name.Contains("Disabled")?"#808080":p.Name.Contains("Focused")||p.Name.Contains("Selection")?"#FFFF00":"#FFFFFF";
                        palette[p.Name]=new{kind="solid",color,opacity=1};continue;
                    }
                    var key=p.Name;var colorResource=p.Value.GetProperty("colorResource").GetBoolean();
                    var markup=colorResource?$"<Border {ns}><Border.Background><SolidColorBrush Color=\"{{ThemeResource {key}}}\"/></Border.Background></Border>":$"<Border {ns} Background=\"{{ThemeResource {key}}}\"/>";
                    var border=(Border)XamlReader.Load(markup);root.Children.Add(border);root.UpdateLayout();
                    palette[key]=DescribeButtonBrush(border.Background)??throw new Exception("Missing brush "+key);root.Children.Remove(border);
                }
                palettes[theme]=palette;if(theme=="HighContrast")continue;
                foreach(var kind in new[]{"TextBox","PasswordBox"}) {
                    var canvas=new Canvas();root.Children.Add(canvas);var entries=new List<(Control Control,string State)>();
                    foreach(var (state,index) in new[]{("Normal",0),("PointerOver",1),("Focused",2),("Disabled",3)}) {
                        Control c=kind=="TextBox"?new TextBox{Text="Sample text",Header="Header",PlaceholderText="Placeholder"}:new PasswordBox{Password="password",Header="Header",PlaceholderText="Placeholder"};
                        c.Width=250;c.IsEnabled=state!="Disabled";Canvas.SetLeft(c,24+index%2*450);Canvas.SetTop(c,24+index/2*150);canvas.Children.Add(c);entries.Add((c,state));
                    }
                    await Task.Delay(180);root.UpdateLayout();
                    foreach(var e in entries)VisualStateManager.GoToState(e.Control,e.State,false);
                    foreach(var e in entries) {
                        var body=Tree(e.Control).OfType<Border>().First(x=>x.Name=="BorderElement");
                        matrix.Add(new{kind,theme,state=e.State,bounds=Rect(e.Control),body=Rect(body),padding=e.Control.Padding,minWidth=e.Control.MinWidth,minHeight=e.Control.MinHeight,fontSize=e.Control.FontSize,borderThickness=body.BorderThickness,cornerRadius=body.CornerRadius,
                            parts=Tree(e.Control).OfType<FrameworkElement>().Where(x=>x.Name is "HeaderContentPresenter" or "ContentElement" or "PlaceholderTextContentPresenter" or "DeleteButton" or "RevealButton").Select(x=>new{name=x.Name,bounds=Rect(x)}).ToArray()});
                    }
                    var bitmap=new RenderTargetBitmap();await bitmap.RenderAsync(root,1000,500);await SaveEffectImage($"{theme}-{kind}",(await bitmap.GetPixelsAsync()).ToArray(),(uint)bitmap.PixelWidth,(uint)bitmap.PixelHeight);root.Children.Remove(canvas);
                }
            }
            var helperMatrix=new List<object>();
            foreach(var theme in new[]{"Light","Dark"}) {
                root.Children.Clear();root.RequestedTheme=theme=="Light"?ElementTheme.Light:ElementTheme.Dark;root.Background=theme=="Light"?Brush(243,243,243):Brush(32,32,32);
                var canvas=new Canvas();root.Children.Add(canvas);var entries=new List<(Control Control,string Kind,string State,int Height)>();int index=0;
                foreach(var kind in new[]{"TextBox","PasswordBox"})foreach(var height in new[]{32,80})foreach(var state in new[]{"Normal","PointerOver","Pressed"}){
                    Control c=kind=="TextBox"?new TextBox{Text="Sample text"}:new PasswordBox{Password="password"};c.Width=250;c.Height=height;Canvas.SetLeft(c,24+index%3*320);Canvas.SetTop(c,24+index/3*110);canvas.Children.Add(c);entries.Add((c,kind,state,height));index++;
                }
                await Task.Delay(180);root.UpdateLayout();
                foreach(var entry in entries){VisualStateManager.GoToState(entry.Control,"Focused",false);VisualStateManager.GoToState(entry.Control,"ButtonVisible",false);root.UpdateLayout();var button=Tree(entry.Control).OfType<Control>().First(x=>x.Name is "DeleteButton" or "RevealButton");VisualStateManager.GoToState(button,entry.State,false);root.UpdateLayout();var mask=Tree(button).OfType<Grid>().First(x=>x.Name=="ButtonLayoutGrid");var glyph=Tree(button).OfType<TextBlock>().First(x=>x.Name=="GlyphElement");helperMatrix.Add(new{theme,kind=entry.Kind,state=entry.State,height=entry.Height,bounds=Rect(entry.Control),button=Rect(button),mask=Rect(mask),glyph=Rect(glyph),margin=mask.Margin,border=mask.BorderThickness,radius=mask.CornerRadius,fontSize=glyph.FontSize,baseline=glyph.BaselineOffset});}
                var bitmap=new RenderTargetBitmap();await bitmap.RenderAsync(root,1000,500);await SaveEffectImage($"{theme}-EditorHelpers",(await bitmap.GetPixelsAsync()).ToArray(),(uint)bitmap.PixelWidth,(uint)bitmap.PixelHeight);
            }
            File.WriteAllText(Path.Combine(Program.Output,"text-helper-metrics.json"),JsonSerializer.Serialize(new{matrix=helperMatrix,reference="Own fixed-SDK forced-state template probe, not Store release acceptance"},EffectsJson));
            root.Children.Clear();root.RequestedTheme=ElementTheme.Light;
            var scroll=new ScrollViewer{Width=400,Height=266,HorizontalAlignment=HorizontalAlignment.Left,VerticalAlignment=VerticalAlignment.Top,HorizontalScrollBarVisibility=ScrollBarVisibility.Auto,VerticalScrollBarVisibility=ScrollBarVisibility.Auto,HorizontalScrollMode=ScrollMode.Enabled,VerticalScrollMode=ScrollMode.Enabled,ZoomMode=ZoomMode.Enabled,Content=new Grid{Width=1000,Height=800,Background=Brush(100,140,200)}};root.Children.Add(scroll);await Task.Delay(200);root.UpdateLayout();
            var scrollbar=Tree(scroll).OfType<ScrollBar>().First(x=>x.Orientation==Orientation.Vertical);
            var scrollMetrics=new{width=scroll.ActualWidth,height=scroll.ActualHeight,extentWidth=scroll.ExtentWidth,extentHeight=scroll.ExtentHeight,viewportWidth=scroll.ViewportWidth,viewportHeight=scroll.ViewportHeight,minZoom=scroll.MinZoomFactor,maxZoom=scroll.MaxZoomFactor,smallChange=scrollbar.SmallChange,largeChange=scrollbar.LargeChange,scrollBarWidth=scrollbar.ActualWidth};
            var barParts=new List<object>();
            foreach(var expanded in new[]{false,true}) {
                VisualStateManager.GoToState(scrollbar,"MouseIndicator",false);
                VisualStateManager.GoToState(scrollbar,expanded?"Expanded":"Collapsed",false);
                root.UpdateLayout();await Task.Delay(700);
                barParts.Add(new{expanded,bounds=Rect(scrollbar),parts=Tree(scrollbar).OfType<FrameworkElement>().Where(x=>x.Name is "VerticalThumb" or "ThumbVisual" or "VerticalTrackRect" or "VerticalSmallDecrease" or "VerticalSmallIncrease").Select(x=>new{name=x.Name,bounds=Rect(x),opacity=x.Opacity}).ToArray()});
            }
            scroll.ChangeView(0,0,2f,true);root.UpdateLayout();await Task.Delay(200);
            var zoomed=new{zoomFactor=scroll.ZoomFactor,extentWidth=scroll.ExtentWidth,extentHeight=scroll.ExtentHeight,viewportWidth=scroll.ViewportWidth,viewportHeight=scroll.ViewportHeight,scrollableWidth=scroll.ScrollableWidth,scrollableHeight=scroll.ScrollableHeight};
            scroll.ChangeView(0,0,1f,true);root.UpdateLayout();await Task.Delay(200);
            var samples=new List<object>();var clock=System.Diagnostics.Stopwatch.StartNew();
            EventHandler<object> handler=(_,_)=>samples.Add(new{time=clock.Elapsed.TotalMilliseconds,offset=scroll.VerticalOffset});
            CompositionTarget.Rendering+=handler;scroll.ChangeView(null,400,null);await Task.Delay(1000);CompositionTarget.Rendering-=handler;
            File.WriteAllText(Path.Combine(Program.Output,"text-scroll-metrics.json"),JsonSerializer.Serialize(new{matrix,scroll=scrollMetrics,zoomed,barParts,caretBlinkMs=GetCaretBlinkTime(),scrollAnimation=samples,reference="Own fixed-SDK forced-state probe; not a Store release or present-time acceptance"},EffectsJson));
            File.WriteAllText(Path.Combine(Program.Output,"text-scroll-palettes.json"),JsonSerializer.Serialize(palettes,EffectsJson));
            File.WriteAllText(Path.Combine(Program.Output,"text-scroll-complete.json"),"{\"complete\":true}");
        } catch(Exception e){File.WriteAllText(Path.Combine(Program.Output,"text-scroll-error.txt"),e.ToString());}
        Exit();
    }
}
