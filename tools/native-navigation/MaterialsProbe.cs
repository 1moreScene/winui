using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Animation;
using Microsoft.UI.Xaml.Shapes;
using System.Text.Json;
using System.Xml.Linq;
using Windows.Graphics;
using Windows.UI;
namespace NavigationProbe;
public sealed partial class ProbeApplication {
    async Task RunMaterials(){
        try{
            var source=XDocument.Load(System.IO.Path.Combine(AppContext.BaseDirectory,"MotionSources/Acrylic/AcrylicPage.xaml"));
            XNamespace x="http://schemas.microsoft.com/winfx/2006/xaml";
            var records=new List<object>();
            var cases=new[]{(Index:0,Tint:"#000000",Opacity:.8,Luminosity:(double?)null),(Index:1,Tint:"#000000",Opacity:.8,Luminosity:(double?)null),
                (Index:1,Tint:"#ff0000",Opacity:.8,Luminosity:(double?)null),(Index:1,Tint:"#0000ff",Opacity:.25,Luminosity:(double?)null),
                (Index:2,Tint:"#87ceeb",Opacity:.8,Luminosity:(double?).8),(Index:2,Tint:"#87ceeb",Opacity:.4,Luminosity:(double?).2)};
            int caseId=0;
            foreach(var theme in new[]{ElementTheme.Light,ElementTheme.Dark})foreach(var fixture in cases){
                root.Children.Clear();root.Resources.Clear();root.RequestedTheme=theme;
                root.Background=theme==ElementTheme.Light?Brush(243,243,243):Brush(32,32,32);
                var recipe=new AcrylicBrush{TintColor=ParseBrush(fixture.Tint).Color,TintOpacity=fixture.Opacity,FallbackColor=fixture.Index==1?Color.FromArgb(255,0,128,0):Color.FromArgb(255,135,206,235),TintLuminosityOpacity=fixture.Luminosity};
                root.Resources["CustomAcrylicInAppBrush"]=recipe;root.Resources["CustomAcrylicInAppLuminosity"]=recipe;
                var name=new[]{"Example1Grid","Example3Grid","Example4Grid"}[fixture.Index];
                var element=new XElement(source.Descendants().First(n=>(string?)n.Attribute(x+"Name")==name));
                foreach(var n in element.DescendantsAndSelf())n.Attribute(x+"Name")?.Remove();
                foreach(var fill in element.DescendantsAndSelf().Attributes("Fill").Where(a=>a.Value.Contains("CustomAcrylic")))fill.Value="#00000000";
                var grid=(Grid)Microsoft.UI.Xaml.Markup.XamlReader.Load(element.ToString());
                if(fixture.Index>0)grid.Children.OfType<Rectangle>().Last().Fill=recipe;
                var w=fixture.Index==0?400:652;grid.Width=w;grid.MinHeight=252;if(fixture.Index==0)grid.Height=252;
                root.Width=w;root.Height=252;window!.AppWindow.ResizeClient(new SizeInt32((int)Math.Ceiling(w*root.XamlRoot.RasterizationScale),(int)Math.Ceiling(252*root.XamlRoot.RasterizationScale)));
                root.Children.Add(grid);await Task.Delay(650);root.UpdateLayout();
                var nameCase=$"material-{caseId++:D2}";var shot=ScreenPixels();await SaveEffectImage(nameCase,shot.Pixels,shot.Width,shot.Height);
                var check=((int)(100*root.XamlRoot.RasterizationScale)*(int)shot.Width+(int)(5*root.XamlRoot.RasterizationScale))*4;
                if(shot.Pixels[check+1]<200 || shot.Pixels[check]<200)throw new Exception("Native capture omitted the known cyan background; refusing invalid evidence");
                records.Add(new{name=nameCase,index=fixture.Index,theme=theme.ToString(),tint=fixture.Tint,opacity=fixture.Opacity,luminosity=fixture.Luminosity,width=w,height=252,screenForeground=shot.Foreground,captureMode=shot.CaptureMode});
            }
            var curves=new List<object>();
            foreach(var name in new[]{"Back","Bounce","Circle","Cubic","Elastic","Exponential","Power","Quadratic","Quartic","Quintic","Sine"})foreach(var mode in new[]{EasingMode.EaseIn,EasingMode.EaseOut,EasingMode.EaseInOut}){
                EasingFunctionBase function=name switch{
                    "Back"=>new BackEase(),"Bounce"=>new BounceEase(),"Circle"=>new CircleEase(),"Cubic"=>new CubicEase(),"Elastic"=>new ElasticEase(),
                    "Exponential"=>new ExponentialEase(),"Power"=>new PowerEase(),"Quadratic"=>new QuadraticEase(),"Quartic"=>new QuarticEase(),"Quintic"=>new QuinticEase(),_=>new SineEase()};
                function.EasingMode=mode;
                curves.Add(new{name,mode=mode.ToString(),values=Enumerable.Range(0,257).Select(i=>function.Ease(i/256.0)).ToArray()});
            }
            root.Children.Clear();root.RequestedTheme=ElementTheme.Light;root.Background=Brush(243,243,243);root.Width=652;root.Height=252;
            var colorGrid=new Grid{Width=652,Height=252};colorGrid.ColumnDefinitions.Add(new ColumnDefinition());colorGrid.ColumnDefinitions.Add(new ColumnDefinition{Width=new GridLength(252)});root.Children.Add(colorGrid);
            var bg=new Grid();colorGrid.Children.Add(bg);
            bg.Children.Add(new Rectangle{Width=100,Height=200,HorizontalAlignment=HorizontalAlignment.Left,VerticalAlignment=VerticalAlignment.Top,Fill=Brush(0,255,255)});
            bg.Children.Add(new Ellipse{Width=152,Height=152,Fill=Brush(255,0,255)});
            bg.Children.Add(new Rectangle{Width=80,Height=100,HorizontalAlignment=HorizontalAlignment.Right,VerticalAlignment=VerticalAlignment.Bottom,Fill=Brush(255,255,0)});
            var tintBrush=new AcrylicBrush{TintColor=Color.FromArgb(255,0,0,0),TintOpacity=.8,FallbackColor=Color.FromArgb(255,0,128,0)};
            colorGrid.Children.Add(new Rectangle{Margin=new Thickness(12),Fill=tintBrush});
            var reference=new Grid{Width=32,Height=32,HorizontalAlignment=HorizontalAlignment.Left,VerticalAlignment=VerticalAlignment.Top,Margin=new Thickness(440,0,0,0)};root.Children.Add(reference);
            var compositor=Microsoft.UI.Xaml.Hosting.ElementCompositionPreview.GetElementVisual(reference).Compositor;
            var referenceBrush=compositor.CreateColorBrush(Color.FromArgb(255,0,0,0));var visual=compositor.CreateSpriteVisual();visual.Brush=referenceBrush;visual.Size=new System.Numerics.Vector2(32,32);
            Microsoft.UI.Xaml.Hosting.ElementCompositionPreview.SetElementChildVisual(reference,visual);await Task.Delay(650);
            var clock=System.Diagnostics.Stopwatch.StartNew();var colorActions=new List<object>();var colorFrames=new List<object>();
            var colorImages=new List<(string Name,byte[] Pixels,uint Width,uint Height)>();var done=new TaskCompletionSource();bool reversed=false;string colorSpace="";
            void ColorTo(Color color){
                colorActions.Add(new{timeMs=clock.Elapsed.TotalMilliseconds,tint=$"#{color.R:x2}{color.G:x2}{color.B:x2}"});
                tintBrush.TintColor=color;
                var animation=compositor.CreateColorKeyFrameAnimation();animation.Duration=TimeSpan.FromMilliseconds(500);animation.InsertKeyFrame(1,color);colorSpace=animation.InterpolationColorSpace.ToString();referenceBrush.StartAnimation("Color",animation);
            }
            ColorTo(Color.FromArgb(255,255,0,0));EventHandler<object>? handler=null;
            handler=(_,_)=>{
                var at=clock.Elapsed.TotalMilliseconds;if(!reversed && at>=260){ColorTo(Color.FromArgb(255,0,0,255));reversed=true;}
                var shot=ScreenPixels();var name=$"tint-{colorFrames.Count:D3}";var i=((int)(16*root.XamlRoot.RasterizationScale)*(int)shot.Width+(int)(456*root.XamlRoot.RasterizationScale))*4;
                colorFrames.Add(new{name,timeMs=at,endMs=clock.Elapsed.TotalMilliseconds,screenForeground=shot.Foreground,reference=new[]{shot.Pixels[i+2],shot.Pixels[i+1],shot.Pixels[i]}});
                colorImages.Add((name,shot.Pixels,shot.Width,shot.Height));
                if(at>=900){CompositionTarget.Rendering-=handler;done.SetResult();}
            };CompositionTarget.Rendering+=handler;await done.Task.WaitAsync(TimeSpan.FromSeconds(8));
            foreach(var shot in colorImages)await SaveEffectImage(shot.Name,shot.Pixels,shot.Width,shot.Height);
            var colorProgress=new List<object>();
            foreach(var pair in new[]{(From:Color.FromArgb(255,0,0,0),To:Color.FromArgb(255,255,0,0),Name:"black-red"),(From:Color.FromArgb(255,255,0,0),To:Color.FromArgb(255,0,0,255),Name:"red-blue")}){
                referenceBrush.StopAnimation("Color");referenceBrush.Color=pair.From;
                var tween=compositor.CreateColorKeyFrameAnimation();tween.Duration=TimeSpan.FromMilliseconds(500);tween.InsertKeyFrame(0,pair.From);tween.InsertKeyFrame(1,pair.To);
                referenceBrush.StartAnimation("Color",tween);await Task.Delay(20);
                var controller=referenceBrush.TryGetAnimationController("Color");controller.Pause();
                var steps=pair.Name=="red-blue"?128:32;
                controller.Progress=.00001f;await Task.Delay(20);
                for(int step=0;step<=steps;step++){
                    controller.Progress=(float)step/steps;await Task.Delay(80);
                    var shot=ScreenPixels();var i=((int)(16*root.XamlRoot.RasterizationScale)*(int)shot.Width+(int)(456*root.XamlRoot.RasterizationScale))*4;
                    colorProgress.Add(new{pair=pair.Name,progress=(double)step/steps,rgb=new int[]{shot.Pixels[i+2],shot.Pixels[i+1],shot.Pixels[i]}});
                }
            }
            // Compare the actual Acrylic effect at fixed progress, independently
            // of desktop present latency. Reflection observes the protected brush
            // only in this native test fixture; the SDK/Gallery never uses it.
            var effect=(Microsoft.UI.Composition.CompositionEffectBrush)typeof(XamlCompositionBrushBase).GetProperty("CompositionBrush",System.Reflection.BindingFlags.Instance|System.Reflection.BindingFlags.NonPublic)!.GetValue(tintBrush)!;
            var tintFixed=new List<object>();
            foreach(var pair in new[]{(Name:"black-red",From:Color.FromArgb(255,0,0,0),To:Color.FromArgb(255,255,0,0)),(Name:"red-blue",From:Color.FromArgb(255,255,0,0),To:Color.FromArgb(255,0,0,255))}){
                tintBrush.TintColor=pair.From;await Task.Delay(550);tintBrush.TintColor=pair.To;await Task.Delay(20);
                var tintController=effect.TryGetAnimationController("TintColor.Color");var lumController=effect.TryGetAnimationController("LuminosityColor.Color");
                tintController.Pause();lumController.Pause();tintController.Progress=.00001f;lumController.Progress=.00001f;await Task.Delay(20);
                for(int step=0;step<=16;step++){
                    tintController.Progress=step/16f;lumController.Progress=step/16f;await Task.Delay(60);
                    var shot=ScreenPixels();var name=$"fixed-{pair.Name}-{step:D2}";await SaveEffectImage(name,shot.Pixels,shot.Width,shot.Height);
                    tintFixed.Add(new{name,pair=pair.Name,progress=step/16.0,to=$"#{pair.To.R:x2}{pair.To.G:x2}{pair.To.B:x2}",captureMode=shot.CaptureMode});
                }
                tintController.Resume();lumController.Resume();
            }
            var gradients=new List<object>();
            foreach(var originX in new[]{.6,.9})foreach(var spread in new[]{GradientSpreadMethod.Pad,GradientSpreadMethod.Reflect,GradientSpreadMethod.Repeat}){
                root.Children.Clear();root.Width=200;root.Height=200;window!.AppWindow.ResizeClient(new SizeInt32((int)(200*root.XamlRoot.RasterizationScale),(int)(200*root.XamlRoot.RasterizationScale)));
                var brush=new RadialGradientBrush{Center=new Windows.Foundation.Point(.5,.5),GradientOrigin=new Windows.Foundation.Point(originX,.5),RadiusX=.25,RadiusY=.4,SpreadMethod=spread};
                brush.GradientStops.Add(new GradientStop{Offset=0,Color=Color.FromArgb(255,255,255,0)});brush.GradientStops.Add(new GradientStop{Offset=1,Color=Color.FromArgb(255,0,0,255)});
                root.Children.Add(new Rectangle{Width=200,Height=200,Fill=brush});await Task.Delay(100);
                var shot=ScreenPixels();var name="gradient-"+spread+"-"+(originX==.6?"inside":"outside");await SaveEffectImage(name,shot.Pixels,shot.Width,shot.Height);
                gradients.Add(new{name,originX,spread=spread.ToString(),screenForeground=shot.Foreground,captureMode=shot.CaptureMode});
            }
            var accent=(SolidColorBrush)Microsoft.UI.Xaml.Markup.XamlReader.Load("<SolidColorBrush xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\" Color=\"{ThemeResource SystemAccentColor}\" />");
            var accentColor=$"#{accent.Color.R:x2}{accent.Color.G:x2}{accent.Color.B:x2}";
            var transitionDefaults=new{scalarMs=new ScalarTransition().Duration.TotalMilliseconds,vectorMs=new Vector3Transition().Duration.TotalMilliseconds,brushMs=new BrushTransition().Duration.TotalMilliseconds};
            File.WriteAllText(System.IO.Path.Combine(Program.Output,"materials.json"),JsonSerializer.Serialize(new{dpi=root.XamlRoot.RasterizationScale,records,curves,colorActions,colorFrames,colorSpace,colorProgress,tintFixed,gradients,transitionDefaults,accentColor},EffectsJson));
            File.WriteAllText(System.IO.Path.Combine(Program.Output,"materials-complete.json"),"{\"complete\":true}");
        }catch(Exception e){File.WriteAllText(System.IO.Path.Combine(Program.Output,"materials-error.txt"),e.ToString());}
    }
}
