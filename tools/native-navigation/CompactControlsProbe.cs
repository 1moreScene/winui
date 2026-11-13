using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using Microsoft.UI.Xaml.Markup;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Text.Json;
namespace NavigationProbe;
public sealed partial class ProbeApplication {
 object CompactParts(FrameworkElement element)=>Tree(element).OfType<FrameworkElement>().Select(e=>new{name=e.Name,type=e.GetType().Name,bounds=Rect(e),visible=e.Visibility.ToString(),opacity=e.Opacity,text=e is TextBlock t?t.Text:null,fontSize=e is TextBlock ft?ft.FontSize:e is Control c?c.FontSize:0,fontFamily=e is TextBlock ff?ff.FontFamily.Source:e is Control cf?cf.FontFamily.Source:null,weight=e is TextBlock wt?wt.FontWeight.Weight:0,padding=e is Control pc?new[]{pc.Padding.Left,pc.Padding.Top,pc.Padding.Right,pc.Padding.Bottom}:e is Border pb?new[]{pb.Padding.Left,pb.Padding.Top,pb.Padding.Right,pb.Padding.Bottom}:null,foreground=e is TextBlock tx?DescribeButtonBrush(tx.Foreground):e is Control cc?DescribeButtonBrush(cc.Foreground):null,background=e is Panel p?DescribeButtonBrush(p.Background):e is Border b?DescribeButtonBrush(b.Background):e is Control bc?DescribeButtonBrush(bc.Background):null}).ToArray();
 async Task RunCompactControls(){try{
  window!.AppWindow.ResizeClient(new Windows.Graphics.SizeInt32((int)Math.Round(1000*root.XamlRoot.RasterizationScale),(int)Math.Round(500*root.XamlRoot.RasterizationScale)));
  var ir=JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"compact-controls-template.json"))).RootElement;
  var palettes=new Dictionary<string,object>();var matrix=new List<object>();
  var defaults=new{personPicture=new{width=double.IsFinite(new PersonPicture().Width)?(double?)new PersonPicture().Width:null,height=double.IsFinite(new PersonPicture().Height)?(double?)new PersonPicture().Height:null,isGroup=new PersonPicture().IsGroup},rating=new{value=new RatingControl().Value,placeholderValue=new RatingControl().PlaceholderValue,maxRating=new RatingControl().MaxRating,initialSetValue=new RatingControl().InitialSetValue,isClearEnabled=new RatingControl().IsClearEnabled},infoBar=new{isOpen=new InfoBar().IsOpen,isClosable=new InfoBar().IsClosable,isIconVisible=new InfoBar().IsIconVisible},splitButton=new{padding=new SplitButton().Padding,minWidth=new SplitButton().MinWidth,minHeight=new SplitButton().MinHeight}};
  foreach(var theme in new[]{"Light","Dark"}){
   root.Children.Clear();root.RequestedTheme=theme=="Light"?ElementTheme.Light:ElementTheme.Dark;root.Background=theme=="Light"?Brush(243,243,243):Brush(32,32,32);
   var colors=new Dictionary<string,object>();
   foreach(var key in ir.GetProperty("requiredBrushes").EnumerateArray().Select(k=>k.GetString()!)){
    var b=(Border)XamlReader.Load($"<Border xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\" Background=\"{{ThemeResource {key}}}\"/>");root.Children.Add(b);root.UpdateLayout();colors[key]=DescribeButtonBrush(b.Background)??throw new Exception("Missing brush "+key);root.Children.Remove(b);
   }palettes[theme]=colors;File.WriteAllText(Path.Combine(Program.Output,"compact-controls-palettes.json"),JsonSerializer.Serialize(palettes,EffectsJson));
   foreach(var kind in new[]{"InfoBar","PersonPicture","RatingControl","SplitButton","ToggleSplitButton"}){
    if(Program.CompactDetails&&kind!="PersonPicture"&&kind!="InfoBar")continue;
    root.Children.Clear();var canvas=new Canvas();root.Children.Add(canvas);int index=0;
    async Task Add(FrameworkElement e,object props,string? state=null){
     canvas.Children.Clear();Canvas.SetLeft(e,24);Canvas.SetTop(e,24);canvas.Children.Add(e);root.UpdateLayout();await Task.Delay(90);
     if(state!=null&&e is Control control){
      if(state.StartsWith("Close"))control=Tree(e).OfType<Button>().Single(b=>b.Name=="CloseButton");
      VisualStateManager.GoToState(control,state.StartsWith("Close")?state.Substring(5):state,false);root.UpdateLayout();
     }
     await Task.Delay(160);var image=new RenderTargetBitmap();await image.RenderAsync(root,1000,500);await SaveEffectImage($"{theme}-{kind}-{index}",(await image.GetPixelsAsync()).ToArray(),(uint)image.PixelWidth,(uint)image.PixelHeight);
     object? observed=e is RatingControl rating?new{value=rating.Value,placeholderValue=rating.PlaceholderValue,maxRating=rating.MaxRating}:null;
     matrix.Add(new{theme,kind,index,props,observed,bounds=Rect(e),desired=new[]{e.DesiredSize.Width,e.DesiredSize.Height},parts=CompactParts(e)});index++;
    }
    if(kind=="InfoBar"){
     if(Program.CompactDetails){foreach(var state in new[]{"Normal","PointerOver","Pressed","Disabled"}){var b=new InfoBar{Width=400,IsOpen=true,Title="Title",Message="Message",IsEnabled=state!="Disabled"};await Add(b,new{width=400,isOpen=true,title="Title",message="Message",enabled=b.IsEnabled,state="Close"+state},"Close"+state);}continue;}
     foreach(var severity in new[]{InfoBarSeverity.Informational,InfoBarSeverity.Success,InfoBarSeverity.Warning,InfoBarSeverity.Error})foreach(var width in new[]{680d,260d}){
      var b=new InfoBar{Width=width,IsOpen=true,Title="Title",Message="Essential app message for your users.",Severity=severity};await Add(b,new{width,isOpen=true,title=b.Title,message=b.Message,severity=severity.ToString()});
     }
     await Add(new InfoBar{Width=400,IsOpen=true,IsClosable=false,IsIconVisible=false,Title="Title",Message="Message"},new{width=400,isOpen=true,isClosable=false,isIconVisible=false,title="Title",message="Message"});
     await Add(new InfoBar{Width=400,IsOpen=true,Title="Title",Message="Message",ActionButton=new Button{Content="Action"}},new{width=400,isOpen=true,title="Title",message="Message",action=true});
    }
    if(kind=="PersonPicture"){
     if(Program.CompactDetails){await Add(new PersonPicture{Height=300},new{height=300});await Add(new PersonPicture{Width=150},new{width=150});await Add(new PersonPicture{Width=96,Height=96,ProfilePicture=new BitmapImage(new Uri("ms-appx:///CompactAssets/person-profile.png"))},new{width=96,height=96,profilePicture="/project/person-profile.png"});await Add(new PersonPicture{Width=64,Height=64,Initials="JD",BadgeImageSource=new BitmapImage(new Uri("ms-appx:///CompactAssets/person-profile.png"))},new{width=64,height=64,initials="JD",badgeImageSource="/project/person-profile.png"});continue;}
     foreach(var size in new[]{32d,64d,96d})foreach(var name in new[]{"","Jane Doe","Ada Lovelace"})await Add(new PersonPicture{Width=size,Height=size,DisplayName=name},new{width=size,height=size,displayName=name});
     await Add(new PersonPicture{Width=96,Height=96,Initials="SB"},new{width=96,height=96,initials="SB"});
     await Add(new PersonPicture{Width=96,Height=96,IsGroup=true},new{width=96,height=96,isGroup=true});
     foreach(var n in new[]{1,99,100})await Add(new PersonPicture{Width=64,Height=64,Initials="JD",BadgeNumber=n},new{width=64,height=64,initials="JD",badgeNumber=n});
     await Add(new PersonPicture{Width=96,Height=64,Initials="JD",BadgeGlyph="\uE715"},new{width=96,height=64,initials="JD",badgeGlyph="\uE715"});
    }
    if(kind=="RatingControl"){
     foreach(var value in new[]{-1d,1d,3.5d,5d})foreach(var enabled in new[]{true,false})await Add(new RatingControl{Value=value,IsEnabled=enabled},new{value,enabled});
     foreach(var value in new[]{0d,.5d,2.5d,5d})await Add(new RatingControl{PlaceholderValue=value,Caption="312 ratings"},new{placeholderValue=value,caption="312 ratings"});
     await Add(new RatingControl{Value=3,MaxRating=7,IsReadOnly=true},new{value=3,maxRating=7,isReadOnly=true});
    }
    if(kind is "SplitButton" or "ToggleSplitButton")foreach(var check in kind=="ToggleSplitButton"?new[]{false,true}:new[]{false})foreach(var state in new[]{"Normal","PrimaryPointerOver","PrimaryPressed","SecondaryPointerOver","SecondaryPressed","Disabled"}){
     SplitButton b=kind=="SplitButton"?new SplitButton():new ToggleSplitButton{IsChecked=check};b.Content="Choose";b.IsEnabled=state!="Disabled";
     await Add(b,new{text="Choose",isChecked=check,enabled=b.IsEnabled,state},state=="Disabled"?state:check?state=="Normal"?"Checked":"Checked"+state:state);
    }
   }
  }
  File.WriteAllText(Path.Combine(Program.Output,"compact-controls-metrics.json"),JsonSerializer.Serialize(new{dpi=root.XamlRoot.RasterizationScale,defaults,matrix,reference="Same-SDK static controls and forced template states; not Store live/present-time acceptance"},EffectsJson));
  File.WriteAllText(Path.Combine(Program.Output,"compact-controls-complete.json"),"{}");
 }catch(Exception e){File.WriteAllText(Path.Combine(Program.Output,"compact-controls-error.txt"),e.ToString());}Exit();}
}
