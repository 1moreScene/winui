using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Hosting;
using Microsoft.UI.Xaml.Media;
using System.Diagnostics;
using WinRT;
using System.Text.Json;
namespace NavigationProbe;
public sealed partial class ProbeApplication {
 async Task RunOverlayControls(){try{
  window!.AppWindow.ResizeClient(new Windows.Graphics.SizeInt32((int)Math.Round(1000*root.XamlRoot.RasterizationScale),(int)Math.Round(500*root.XamlRoot.RasterizationScale)));
  var rows=new List<object>();var motion=new List<object>();
  foreach(var theme in new[]{"Light","Dark"})foreach(var backdrop in new[]{"Plain","Stripes"})foreach(var kind in new[]{"Flyout","MenuFlyout"})foreach(var side in new[]{"Top","Bottom"}){
   root.Children.Clear();root.RequestedTheme=theme=="Light"?ElementTheme.Light:ElementTheme.Dark;root.Background=theme=="Light"?Brush(243,243,243):Brush(32,32,32);
   var canvas=new Canvas();root.Children.Add(canvas);
   if(backdrop=="Stripes")for(int x=0;x<1000;x+=40){var stripe=new Border{Width=40,Height=500,Background=x%80==0?Brush(255,115,92):Brush(36,122,187)};Canvas.SetLeft(stripe,x);canvas.Children.Add(stripe);}
   var owner=new Button{Content="Anchor",Width=100,Height=32};Canvas.SetLeft(owner,440);Canvas.SetTop(owner,side=="Top"?300:80);canvas.Children.Add(owner);root.UpdateLayout();
   FlyoutBase surface;
   if(kind=="Flyout"){
    var style=new Style{TargetType=typeof(FlyoutPresenter),BasedOn=(Style)Application.Current.Resources["DefaultFlyoutPresenterStyle"]};style.Setters.Add(new Setter(FrameworkElement.MinWidthProperty,260d));style.Setters.Add(new Setter(FrameworkElement.MaxWidthProperty,260d));
    var content=new StackPanel{Spacing=12,Width=226};content.Children.Add(new TextBlock{Text="All items will be removed. Do you want to continue?",TextWrapping=TextWrapping.Wrap});content.Children.Add(new Button{Content="Confirm empty cart",HorizontalAlignment=HorizontalAlignment.Left});
    surface=new Flyout{Content=content,FlyoutPresenterStyle=style};
   }else{
    var style=new Style{TargetType=typeof(MenuFlyoutPresenter),BasedOn=(Style)Application.Current.Resources["DefaultMenuFlyoutPresenterStyle"]};style.Setters.Add(new Setter(FrameworkElement.MinWidthProperty,220d));style.Setters.Add(new Setter(FrameworkElement.MaxWidthProperty,220d));
    var menu=new MenuFlyout{MenuFlyoutPresenterStyle=style};menu.Items.Add(new MenuFlyoutItem{Text="Open"});menu.Items.Add(new MenuFlyoutItem{Text="Save"});menu.Items.Add(new MenuFlyoutSeparator());menu.Items.Add(new ToggleMenuFlyoutItem{Text="Enable option",IsChecked=true});menu.Items.Add(new MenuFlyoutItem{Text="Unavailable",IsEnabled=false});surface=menu;
   }
   surface.Placement=side=="Top"?FlyoutPlacementMode.Top:FlyoutPlacementMode.Bottom;
   await Task.Delay(150);owner.Focus(FocusState.Programmatic);var hwnd=WinRT.Interop.WindowNative.GetWindowHandle(window!);var target=GetFocus();if(target==IntPtr.Zero)target=FindWindowEx(hwnd,IntPtr.Zero,"Microsoft.UI.Content.DesktopChildSiteBridge",null);if(target==IntPtr.Zero)target=hwnd;
   var name=$"{theme}-{backdrop}-{kind}-{side}";var clock=new Stopwatch();var trigger=new TaskCompletionSource();var closed=new TaskCompletionSource();var events=new List<object>();
   surface.Opening+=(_,_)=>events.Add(new{kind="opening",time=clock.Elapsed.TotalMilliseconds});surface.Opened+=(_,_)=>events.Add(new{kind="opened",time=clock.Elapsed.TotalMilliseconds});surface.Closing+=(_,_)=>events.Add(new{kind="closing",time=clock.Elapsed.TotalMilliseconds});surface.Closed+=(_,_)=>{events.Add(new{kind="closed",time=clock.Elapsed.TotalMilliseconds});closed.TrySetResult();};
   owner.Click+=(_,_)=>{clock.Restart();surface.ShowAt(owner);trigger.TrySetResult();};
   PostMessage(target,0x100,new IntPtr(32),new IntPtr(0x00390001));PostMessage(target,0x101,new IntPtr(32),new IntPtr(unchecked((int)0xC0390001)));
   if(await Task.WhenAny(trigger.Task,Task.Delay(2500))!=trigger.Task)throw new Exception("Own-window keyboard invocation failed");
   if(theme=="Light"&&backdrop=="Plain"){
    var images=new List<(string Name,byte[] Bytes,uint W,uint H)>();var frames=new List<object>();
    // GDI capture can take a whole refresh interval. Keep it off the XAML
    // dispatcher so sampling does not postpone animation startup/completion.
    await Task.Run(async()=>{foreach(var requested in new[]{0,16,33,50,83,100,133,167,200,250,300,400,550}){
     var delay=requested-clock.Elapsed.TotalMilliseconds;if(delay>0)await Task.Delay(TimeSpan.FromMilliseconds(delay));var start=clock.Elapsed.TotalMilliseconds;var image=CaptureClientPixels(hwnd,false);var end=clock.Elapsed.TotalMilliseconds;var frame=$"{name}-{requested}";images.Add((frame,image.Pixels,image.Width,image.Height));frames.Add(new{name=frame,requested,captureStartMs=start,captureEndMs=end,image.CaptureMode,image.Foreground,samplingThread="worker"});
    }});
    foreach(var image in images)await SaveEffectImage(image.Name,image.Bytes,image.W,image.H);motion.Add(new{name,frames,events});
   }else await Task.Delay(650);
   root.UpdateLayout();var presenter=VisualTreeHelper.GetOpenPopupsForXamlRoot(root.XamlRoot).SelectMany(p=>Tree(p.Child)).OfType<Control>().First(c=>kind=="Flyout"?c is FlyoutPresenter:c is MenuFlyoutPresenter);
   var shot=ScreenPixels();await SaveEffectImage(name,shot.Pixels,shot.Width,shot.Height);
   if(name=="Dark-Stripes-Flyout-Bottom"){
    var casters=Tree(presenter).OfType<UIElement>().Select(e=>(Element:e,Shadow:e.Shadow,Translation:e.Translation)).ToArray();
    File.WriteAllText(Path.Combine(Program.Output,"flyout-shadow-casters.json"),JsonSerializer.Serialize(casters.Select(e=>new{type=e.Element.GetType().Name,name=(e.Element as FrameworkElement)?.Name,shadow=e.Shadow?.GetType().Name,z=e.Translation.Z}),EffectsJson));
    foreach(var caster in casters){caster.Element.Shadow=null;caster.Element.Translation=new System.Numerics.Vector3(caster.Translation.X,caster.Translation.Y,0);}
    await Task.Delay(200);
    var withoutShadow=ScreenPixels();await SaveEffectImage(name+"-NoShadow",withoutShadow.Pixels,withoutShadow.Width,withoutShadow.Height);
    foreach(var caster in casters){caster.Element.Shadow=caster.Shadow;caster.Element.Translation=caster.Translation;}
    await Task.Delay(200);
    var restoredShadow=ScreenPixels();await SaveEffectImage(name+"-RestoredShadow",restoredShadow.Pixels,restoredShadow.Width,restoredShadow.Height);
   }
   rows.Add(new{name,theme,backdrop,kind,side,input="own-window keyboard messages",owner=Rect(owner),bounds=Rect(presenter),presenter.Padding,presenter.BorderThickness,presenter.CornerRadius,presenter.FontSize,font=presenter.FontFamily.Source,background=DescribeButtonBrush(presenter.Background),border=DescribeButtonBrush(presenter.BorderBrush),translationZ=presenter.Translation.Z,shadow=presenter.Shadow?.GetType().Name,parts=Tree(presenter).OfType<FrameworkElement>().Where(e=>e is TextBlock||e is MenuFlyoutItem||e is ToggleMenuFlyoutItem||e is MenuFlyoutSeparator||e is Button||e.Name=="MenuFlyoutPresenterBorder").Select(e=>new{type=e.GetType().Name,e.Name,text=(e as TextBlock)?.Text??(e as MenuFlyoutItem)?.Text??(e as Button)?.Content?.ToString(),bounds=Rect(e),margin=e.Margin,padding=(e as Control)?.Padding,fontSize=(e as Control)?.FontSize??(e as TextBlock)?.FontSize,fontWeight=(e as Control)?.FontWeight.Weight??(e as TextBlock)?.FontWeight.Weight,baseline=(e as TextBlock)?.BaselineOffset}).ToArray(),width=shot.Width,height=shot.Height,dpi=root.XamlRoot.RasterizationScale,shot.CaptureMode});
   events.Add(new{kind="hide-request",time=clock.Elapsed.TotalMilliseconds});var closeAt=clock.Elapsed.TotalMilliseconds;var closeClock=Stopwatch.StartNew();surface.Hide();
   if(theme=="Light"&&backdrop=="Plain"){
    var closeImages=new List<(string Name,byte[] Bytes,uint W,uint H)>();var closeFrames=new List<object>();
    await Task.Run(async()=>{foreach(var requested in new[]{0,16,33,50,83,100,133,167,200,250,300,400,550}){
     var delay=requested-closeClock.Elapsed.TotalMilliseconds;if(delay>0)await Task.Delay(TimeSpan.FromMilliseconds(delay));var start=closeClock.Elapsed.TotalMilliseconds;var image=CaptureClientPixels(hwnd,false);var end=closeClock.Elapsed.TotalMilliseconds;var frame=$"{name}-Close-{requested}";closeImages.Add((frame,image.Pixels,image.Width,image.Height));closeFrames.Add(new{name=frame,requested,captureStartMs=start,captureEndMs=end,image.CaptureMode,image.Foreground,samplingThread="worker"});
    }});
    foreach(var image in closeImages)await SaveEffectImage(image.Name,image.Bytes,image.W,image.H);motion.Add(new{name,phase="close",requestedCloseAtMs=closeAt,frames=closeFrames,events});
   }
   if(await Task.WhenAny(closed.Task,Task.Delay(2000))!=closed.Task)throw new Exception("Native floating close did not complete");await Task.Delay(40);
  }
  await CaptureActualToolTips(rows,motion);
  CaptureOverlayTextMetrics();
  await CaptureRawAppBackdrop();
  await CapturePopupCornerMaterials();
  await CaptureRawHostBackdrop();
  var backdropPalettes=new Dictionary<string,object>();
  foreach(var mode in new[]{"Light","Dark"}){
   using var controller=new Microsoft.UI.Composition.SystemBackdrops.DesktopAcrylicController();
   var config=new Microsoft.UI.Composition.SystemBackdrops.SystemBackdropConfiguration{IsInputActive=true,Theme=mode=="Light"?Microsoft.UI.Composition.SystemBackdrops.SystemBackdropTheme.Light:Microsoft.UI.Composition.SystemBackdrops.SystemBackdropTheme.Dark};controller.AddSystemBackdropTarget(window.As<Microsoft.UI.Composition.ICompositionSupportsSystemBackdrop>());controller.SetSystemBackdropConfiguration(config);await Task.Delay(100);
   var backdropBrush=window.As<Microsoft.UI.Composition.ICompositionSupportsSystemBackdrop>().SystemBackdrop;
   var scalars=new Dictionary<string,float>();var colors=new Dictionary<string,Windows.UI.Color>();var sources=new Dictionary<string,string>();
   if(backdropBrush!=null){
    foreach(var key in new[]{"NoiseOpacity","NoiseOpacity.Opacity","Noise.Opacity","Blur.BlurAmount","Blur.BlurRadius","BlurAmount","TintOpacity","TintOpacity.Opacity","LuminosityOpacity","LuminosityOpacity.Opacity","FallbackCrossFade.CrossFade","Acrylic.NoiseOpacity"})try{if(backdropBrush.Properties.TryGetScalar(key,out var value)==Windows.UI.Composition.CompositionGetValueStatus.Succeeded)scalars[key]=value;}catch{}
    foreach(var key in new[]{"TintColor.Color","LuminosityColor.Color","FallbackColor.Color","Tint.Color","Luminosity.Color"})try{if(backdropBrush.Properties.TryGetColor(key,out var value)==Windows.UI.Composition.CompositionGetValueStatus.Succeeded)colors[key]=value;}catch{}
    if(backdropBrush is Windows.UI.Composition.CompositionEffectBrush effect)foreach(var key in new[]{"Noise","NoiseBrush","Backdrop","BackdropSource","HostBackdrop","BlurredBackdrop"})try{var source=effect.GetSourceParameter(key);sources[key]=source?.GetType().Name??"null";}catch{}
   }
   backdropPalettes[mode]=new{tint=controller.TintColor,tintOpacity=controller.TintOpacity,luminosityOpacity=controller.LuminosityOpacity,fallback=controller.FallbackColor,brushType=backdropBrush?.GetType().Name,comment=backdropBrush?.Comment,scalars,colors,sources};
  }
  File.WriteAllText(Path.Combine(Program.Output,"desktop-acrylic-defaults.json"),JsonSerializer.Serialize(backdropPalettes,EffectsJson));
  File.WriteAllText(Path.Combine(Program.Output,"controls-native.json"),JsonSerializer.Serialize(new{rows,motion,boundary="Live actual Flyout/MenuFlyout, own-window keyboard invocation and Composition screen pixels; capture brackets are wall-clock observations, not compositor presentation timestamps."},EffectsJson));File.WriteAllText(Path.Combine(Program.Output,"controls-complete.json"),"{}");
 }catch(Exception e){File.WriteAllText(Path.Combine(Program.Output,"controls-error.txt"),e.ToString());}Exit();}
 void CaptureOverlayTextMetrics(){
  root.Children.Clear();var panel=new StackPanel();root.Children.Add(panel);
  var entries=new List<(TextBlock Block,string Family,double Size,string Trimming)>();
  foreach(var family in new[]{"Segoe UI","Arial","Segoe Fluent Icons"})foreach(var size in new[]{8d,11d,12d,14d,16d,20d,28d})foreach(var trimming in new[]{"None","Clip"}){
   var text=new TextBlock{Text="Open",FontFamily=new FontFamily(family),FontSize=size,TextTrimming=trimming=="Clip"?TextTrimming.Clip:TextTrimming.None};panel.Children.Add(text);entries.Add((text,family,size,trimming));
  }
  root.UpdateLayout();
  File.WriteAllText(Path.Combine(Program.Output,"text-line-metrics.json"),JsonSerializer.Serialize(entries.Select(e=>new{family=e.Family,fontSize=e.Size,trimming=e.Trimming,baseline=e.Block.BaselineOffset,height=e.Block.DesiredSize.Height,width=e.Block.DesiredSize.Width,lineHeight=e.Block.LineHeight,actualHeight=e.Block.ActualHeight}).ToArray(),EffectsJson));
 }
}
