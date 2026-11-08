using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Markup;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Animation;
using Microsoft.UI.Xaml.Media.Imaging;
using System.Text.Json;
using Windows.UI;
using System.Runtime.InteropServices.WindowsRuntime;
using Windows.UI.Core.AnimationMetrics;
namespace NavigationProbe;
public sealed partial class ProbeApplication {
    async Task RunSelectionInput() {
        try {
            var ir=JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"selection-input-template.json")));
            var palettes=new Dictionary<string,object>();var matrix=new List<object>();
            var timing=new Dictionary<string,double>();
            var reposition=new AnimationDescription(AnimationEffect.Reposition,AnimationEffectTarget.Primary);
            File.WriteAllText(Path.Combine(Program.Output,"input-reposition.json"),JsonSerializer.Serialize(reposition.Animations.Select(a=>new{durationMs=a.Duration.TotalMilliseconds,delayMs=a.Delay.TotalMilliseconds,curve=new[]{a.Control1.X,a.Control1.Y,a.Control2.X,a.Control2.Y},type=a.Type.ToString()}).ToArray(),EffectsJson));
            const string ns="xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\"";
            foreach(var key in new[]{"ControlFasterAnimationDuration","ControlFastAnimationDuration","ControlNormalAnimationDuration"}){
                var animation=(DoubleAnimationUsingKeyFrames)XamlReader.Load($"<DoubleAnimationUsingKeyFrames {ns}><SplineDoubleKeyFrame KeyTime=\"{{StaticResource {key}}}\" KeySpline=\"{{StaticResource ControlFastOutSlowInKeySpline}}\" Value=\"1\"/></DoubleAnimationUsingKeyFrames>");
                timing[key]=animation.KeyFrames[0].KeyTime.TimeSpan.TotalMilliseconds;
                var spline=((SplineDoubleKeyFrame)animation.KeyFrames[0]).KeySpline;
                File.WriteAllText(Path.Combine(Program.Output,"input-easing.json"),JsonSerializer.Serialize(new[]{spline.ControlPoint1.X,spline.ControlPoint1.Y,spline.ControlPoint2.X,spline.ControlPoint2.Y}));
            }
            foreach(var theme in new[]{"Light","Dark","HighContrast"}){
                root.Children.Clear();root.Resources.Clear();root.RequestedTheme=theme=="Dark"?ElementTheme.Dark:ElementTheme.Light;
                root.Background=theme=="Dark"?Brush(32,32,32):theme=="Light"?Brush(243,243,243):Brush(0,0,0);
                var leaves=ir.RootElement.GetProperty("aliases").GetProperty(theme).EnumerateObject().Select(p=>p.Value.GetString()!).Distinct();
                var palette=new Dictionary<string,object>();
                foreach(var leaf in leaves){
                    if(theme=="HighContrast"){
                        var color=leaf.Contains("Transparent")?"#00000000":leaf.Contains("HighlightText")||leaf.Contains("WindowColor")||leaf.Contains("ButtonFace")?"#000000":leaf.Contains("Highlight")?"#FFFF00":leaf.Contains("GrayText")?"#808080":"#FFFFFF";
                        palette[leaf]=new{kind="solid",color,opacity=1};continue;
                    }
                    // Some ToggleSwitch aliases target Color resources, others Brush.
                    var colorLeaf=!leaf.EndsWith("Brush");
                    var markup=colorLeaf?$"<Border {ns}><Border.Background><SolidColorBrush Color=\"{{ThemeResource {leaf}}}\"/></Border.Background></Border>":$"<Border {ns} Background=\"{{ThemeResource {leaf}}}\"/>";
                    var border=(Border)XamlReader.Load(markup);root.Children.Add(border);root.UpdateLayout();
                    palette[leaf]=DescribeButtonBrush(border.Background)??throw new Exception("Null theme brush "+leaf);root.Children.Remove(border);
                }
                palettes[theme]=palette;
                if(theme=="HighContrast")continue;
                foreach(var kind in new[]{"RadioButton","ToggleSwitch"}){
                    var canvas=new Canvas();root.Children.Add(canvas);var entries=new List<(Control Control,string State,bool Checked)>();
                    for(int column=0;column<2;column++)for(int row=0;row<4;row++){
                        Control control=kind=="RadioButton"?new RadioButton{Content="RadioButton",GroupName=$"{column}-{row}",IsChecked=column==1}:new ToggleSwitch{IsOn=column==1,OnContent="On",OffContent="Off"};
                        control.Width=220;control.IsEnabled=row!=3;Canvas.SetLeft(control,24+column*320);Canvas.SetTop(control,24+row*100);canvas.Children.Add(control);
                        entries.Add((control,new[]{"Normal","PointerOver","Pressed","Disabled"}[row],column==1));
                    }
                    await Task.Delay(250);foreach(var e in entries){VisualStateManager.GoToState(e.Control,e.State,false);if(e.Control is RadioButton)VisualStateManager.GoToState(e.Control,e.Checked?"Checked":"Unchecked",false);}
                    await Task.Delay(350);root.UpdateLayout();
                    foreach(var e in entries)matrix.Add(new{theme,kind,state=e.State,isChecked=e.Checked,bounds=Rect(e.Control),minWidth=e.Control.MinWidth,minHeight=e.Control.MinHeight,fontSize=e.Control.FontSize,padding=e.Control.Padding,
                        parts=Tree(e.Control).OfType<FrameworkElement>().Where(n=>n.Name is "OuterEllipse" or "CheckGlyph" or "OuterBorder" or "SwitchKnobOn" or "SwitchKnobOff" or "SwitchKnob" or "ContentPresenter").Select(n=>new{name=n.Name,bounds=Rect(n)}).ToArray()});
                    var bitmap=new RenderTargetBitmap();await bitmap.RenderAsync(root,1000,500);await SaveEffectImage($"{theme}-{kind}",(await bitmap.GetPixelsAsync()).ToArray(),(uint)bitmap.PixelWidth,(uint)bitmap.PixelHeight);root.Children.Remove(canvas);
                }
            }
            root.Children.Clear();root.Resources.Clear();root.RequestedTheme=ElementTheme.Light;
            var host=new StackPanel();root.Children.Add(host);var group=new RadioButtons{Header="Options:"};foreach(var text in new[]{"Option 1","Option 2","Option 3"})group.Items.Add(text);host.Children.Add(group);await Task.Delay(250);root.UpdateLayout();
            var header=Tree(group).OfType<ContentPresenter>().First(e=>e.Name=="HeaderContentPresenter");
            var buttons=Tree(group).OfType<RadioButton>().ToArray();
            var groupMetrics=new{height=group.ActualHeight,header=Rect(header),headerMargin=header.Margin,items=buttons.Select(b=>new{bounds=Rect(b),minWidth=b.MinWidth}).ToArray()};
            group.MaxColumns=3;root.UpdateLayout();await Task.Delay(100);var columnRects=buttons.Select(b=>Rect(b)).ToArray();
            File.WriteAllText(Path.Combine(Program.Output,"radio-group-metrics.json"),JsonSerializer.Serialize(new{vertical=groupMetrics,columns=columnRects},EffectsJson));
            File.WriteAllText(Path.Combine(Program.Output,"input-palettes.json"),JsonSerializer.Serialize(palettes,EffectsJson));
            File.WriteAllText(Path.Combine(Program.Output,"input-timing.json"),JsonSerializer.Serialize(timing,EffectsJson));
            File.WriteAllText(Path.Combine(Program.Output,"input-metrics.json"),JsonSerializer.Serialize(new{matrix,timing,dpi=root.XamlRoot.RasterizationScale,boundary="Own forced-state static template matrix. Not a Store Gallery screenshot or animation present-time acceptance; high contrast uses deterministic palette values."},EffectsJson));
            File.WriteAllText(Path.Combine(Program.Output,"selection-input-complete.json"),"{\"complete\":true}");
        }catch(Exception e){File.WriteAllText(Path.Combine(Program.Output,"selection-input-error.txt"),e.ToString());}
        Exit();
    }
}
