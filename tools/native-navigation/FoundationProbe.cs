using System.Runtime.InteropServices.WindowsRuntime;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Automation.Peers;
using Microsoft.UI.Xaml.Automation.Provider;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using System.Text.Json;
using Windows.UI;
namespace NavigationProbe;
public sealed partial class ProbeApplication {
    async Task RunFoundation(){
        try {
            using var ir=JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"selection-template.json")));
            var palettes=new Dictionary<string,object>();var metrics=new List<object>();
            var hc=new Dictionary<string,string>{["SystemColorWindowColorBrush"]="#000000",["SystemColorButtonFaceColorBrush"]="#000000",["SystemColorButtonTextColorBrush"]="#FFFFFF",["SystemColorGrayTextColorBrush"]="#808080",["SystemColorHighlightTextColorBrush"]="#000000",["SystemColorHighlightColorBrush"]="#FFFF00",["SystemControlHighlightAccentBrush"]="#FFFF00",["SystemControlForegroundAccentBrush"]="#FFFF00",["SystemControlDisabledBaseMediumLowBrush"]="#808080",["SystemControlHighlightAltAccentBrush"]="#000000",["SystemControlBackgroundBaseLowBrush"]="#000000",["SystemControlHighlightBaseHighBrush"]="#FFFFFF",["SystemControlBackgroundBaseMediumLowBrush"]="#808080",["SystemControlForegroundBaseHighBrush"]="#FFFFFF",["SystemControlHighlightAltChromeWhiteBrush"]="#000000",["SystemControlHighlightBaseMediumLowBrush"]="#808080",["SystemColorWindowTextColorBrush"]="#FFFFFF"};
            foreach(var theme in new[]{"Light","Dark","HighContrast"}){
                root.Children.Clear();root.Resources.Clear();root.RequestedTheme=theme=="Dark"?ElementTheme.Dark:ElementTheme.Light;
                root.Background=theme=="Light"?Brush(243,243,243):theme=="Dark"?Brush(32,32,32):Brush(0,0,0);
                var aliases=ir.RootElement.GetProperty("aliases").GetProperty(theme).EnumerateObject().ToArray();
                var leaves=aliases.Select(a=>a.Value.GetString()!).Distinct();var palette=new Dictionary<string,object?>();
                var hidden=new StackPanel{Width=0,Height=0};root.Children.Add(hidden);
                foreach(var leaf in leaves){
                    if(theme=="HighContrast"){
                        SolidColorBrush brush=hc.TryGetValue(leaf,out var color)?ParseBrush(color):leaf.Contains("Transparent")?Brush(0,0,0,0):throw new Exception("Unknown HC leaf "+leaf);
                        palette[leaf]=DescribeButtonBrush(brush);
                        foreach(var alias in aliases.Where(a=>a.Value.GetString()==leaf))root.Resources[alias.Name]=brush;
                    } else {
                        var border=(Border)Microsoft.UI.Xaml.Markup.XamlReader.Load("<Border xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\" Background=\"{ThemeResource "+leaf+"}\"/>");
                        hidden.Children.Add(border);root.UpdateLayout();palette[leaf]=DescribeButtonBrush(border.Background);
                    }
                }
                palettes[theme]=palette;root.Children.Remove(hidden);
                foreach(var kind in new[]{"ToggleButton","CheckBox"}){
                    var canvas=new Canvas();root.Children.Add(canvas);var entries=new List<(ToggleButton Control,int Column,int Row,string State)>();
                    for(int column=0;column<3;column++)for(int row=0;row<4;row++){
                        ToggleButton b=kind=="CheckBox"?new CheckBox():new ToggleButton();
                        b.Content=kind; b.Width=220;b.Height=kind=="CheckBox"?32:36;b.IsThreeState=true;b.IsChecked=column==0?false:column==1?true:null;b.IsEnabled=row!=3;
                        Canvas.SetLeft(b,24+column*320);Canvas.SetTop(b,24+row*100);canvas.Children.Add(b);
                        string state=kind=="CheckBox"?(column==0?"Unchecked":column==1?"Checked":"Indeterminate")+new[]{"Normal","PointerOver","Pressed","Disabled"}[row]
                            :(column==0?new[]{"Normal","PointerOver","Pressed","Disabled"}[row]:(column==1?"Checked":"Indeterminate")+(row==0?"":new[]{"","PointerOver","Pressed","Disabled"}[row]));
                        entries.Add((b,column,row,state));
                    }
                    await Task.Delay(180);foreach(var entry in entries)VisualStateManager.GoToState(entry.Control,entry.State,false);await Task.Delay(450);root.UpdateLayout();
                    foreach(var entry in entries){var b=entry.Control;metrics.Add(new{theme,kind,column=entry.Column,row=entry.Row,state=entry.State,bounds=Rect(b),fontSize=b.FontSize,fontFamily=b.FontFamily.Source,padding=b.Padding,minWidth=b.MinWidth,minHeight=b.MinHeight,cornerRadius=b.CornerRadius,
                        parts=Tree(b).OfType<FrameworkElement>().Where(e=>e.Name is "NormalRectangle" or "ContentPresenter" or "CheckGlyph").Select(e=>new{name=e.Name,bounds=Rect(e)}).ToArray()});}
                    var bitmap=new RenderTargetBitmap();await bitmap.RenderAsync(root,1000,500);
                    await SaveEffectImage(theme+"-"+kind,(await bitmap.GetPixelsAsync()).ToArray(),(uint)bitmap.PixelWidth,(uint)bitmap.PixelHeight);root.Children.Remove(canvas);
                }
            }
            root.Children.Clear();root.Resources.Clear();root.RequestedTheme=ElementTheme.Light;root.Background=Brush(243,243,243);
            var sequence=new List<object>();var toggle=new ToggleButton{IsThreeState=true};root.Children.Add(toggle);var events=new List<string>();
            toggle.Checked+=(_,_)=>events.Add("checked");toggle.Unchecked+=(_,_)=>events.Add("unchecked");toggle.Indeterminate+=(_,_)=>events.Add("indeterminate");toggle.Click+=(_,_)=>events.Add("click");
            var peer=new ToggleButtonAutomationPeer(toggle);var provider=(IToggleProvider)peer;
            for(int i=0;i<4;i++){events.Clear();provider.Toggle();sequence.Add(new{isChecked=toggle.IsChecked,events=events.ToArray()});}
            root.Children.Clear();var imageCanvas=new Canvas();root.Children.Add(imageCanvas);
            var imageRecords=new List<object>();
            foreach(var(mode,index)in new[]{Stretch.None,Stretch.Fill,Stretch.Uniform,Stretch.UniformToFill}.Select((m,i)=>(m,i))){
                var image=new Image{Width=100,Height=100,Stretch=mode,Source=new BitmapImage(new Uri(Path.Combine(AppContext.BaseDirectory,"FoundationAssets/valley.jpg")))};
                Canvas.SetLeft(image,24+index*220);Canvas.SetTop(image,24);imageCanvas.Children.Add(image);imageRecords.Add(new{mode=mode.ToString(),x=24+index*220,y=24,width=100,height=100});
            }
            await Task.Delay(300);var imageBitmap=new RenderTargetBitmap();await imageBitmap.RenderAsync(root,1000,500);await SaveEffectImage("image-stretch",(await imageBitmap.GetPixelsAsync()).ToArray(),(uint)imageBitmap.PixelWidth,(uint)imageBitmap.PixelHeight);
            var textRecords=new List<object>();
            foreach(var (text,y,italic) in new[]{("I am a TextBlock.",180,false),("I am a styled TextBlock.",220,true)}){
                var block=new TextBlock{Text=text,FontSize=14,FontFamily=new FontFamily(italic?"Comic Sans MS":"Segoe UI"),FontStyle=italic?Windows.UI.Text.FontStyle.Italic:Windows.UI.Text.FontStyle.Normal};
                Canvas.SetLeft(block,24);Canvas.SetTop(block,y);imageCanvas.Children.Add(block);textRecords.Add(new{text,y,italic});
            }
            await Task.Delay(100);var textBitmap=new RenderTargetBitmap();await textBitmap.RenderAsync(root,1000,500);await SaveEffectImage("image-and-text",(await textBitmap.GetPixelsAsync()).ToArray(),(uint)textBitmap.PixelWidth,(uint)textBitmap.PixelHeight);
            File.WriteAllText(Path.Combine(Program.Output,"font-details.json"),JsonSerializer.Serialize(Tree(root).OfType<TextBlock>().Select(b=>new{text=b.Text,font=b.FontFamily.Source,fontSize=b.FontSize,fontStyle=b.FontStyle.ToString(),baseline=b.BaselineOffset,bounds=Rect(b)}).ToArray(),EffectsJson));
            File.WriteAllText(Path.Combine(Program.Output,"foundation-palettes.json"),JsonSerializer.Serialize(palettes,EffectsJson));
            File.WriteAllText(Path.Combine(Program.Output,"foundation-metrics.json"),JsonSerializer.Serialize(new{sdk="2.5.4-experimental / WinUI 2.3.10-experimental",dpi=root.XamlRoot.RasterizationScale,metrics,sequence,images=imageRecords,texts=textRecords,highContrast="deterministic explicit theme-resource fixture, not OS forced-colors"},EffectsJson));
            File.WriteAllText(Path.Combine(Program.Output,"foundation-complete.json"),"{\"complete\":true}");
        }catch(Exception e){File.WriteAllText(Path.Combine(Program.Output,"foundation-error.txt"),e.ToString());}
    }
}
