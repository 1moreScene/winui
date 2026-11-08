using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Composition;
using Microsoft.UI.Composition.SystemBackdrops;
namespace NavigationProbe;
sealed class RawHostBackdrop:SystemBackdrop {
 readonly Dictionary<ICompositionSupportsSystemBackdrop,DesktopAcrylicController> controllers=new();
 protected override void OnTargetConnected(ICompositionSupportsSystemBackdrop target,XamlRoot xamlRoot){base.OnTargetConnected(target,xamlRoot);var c=new DesktopAcrylicController();c.AddSystemBackdropTarget(target);c.SetSystemBackdropConfiguration(GetDefaultSystemBackdropConfiguration(target,xamlRoot));c.TintOpacity=0;c.LuminosityOpacity=0;controllers[target]=c;}
 protected override void OnTargetDisconnected(ICompositionSupportsSystemBackdrop target){if(controllers.Remove(target,out var c)){c.RemoveSystemBackdropTarget(target);c.Dispose();}base.OnTargetDisconnected(target);}
}
public sealed partial class ProbeApplication {
 async Task CaptureRawHostBackdrop(){
  root.Children.Clear();root.RequestedTheme=ElementTheme.Light;root.Background=Brush(243,243,243);var canvas=new Canvas();root.Children.Add(canvas);
  for(int x=0;x<1000;x+=40){var stripe=new Border{Width=40,Height=500,Background=x%80==0?Brush(255,115,92):Brush(36,122,187)};Canvas.SetLeft(stripe,x);canvas.Children.Add(stripe);}
  var owner=new Button{Content="Host backdrop",Width=100,Height=32};Canvas.SetLeft(owner,440);Canvas.SetTop(owner,300);canvas.Children.Add(owner);root.UpdateLayout();
  var style=new Style{TargetType=typeof(MenuFlyoutPresenter),BasedOn=(Style)Application.Current.Resources["DefaultMenuFlyoutPresenterStyle"]};style.Setters.Add(new Setter(FrameworkElement.MinWidthProperty,220d));style.Setters.Add(new Setter(FrameworkElement.MaxWidthProperty,220d));style.Setters.Add(new Setter(FrameworkElement.MinHeightProperty,136.8d));style.Setters.Add(new Setter(MenuFlyoutPresenter.SystemBackdropProperty,new RawHostBackdrop()));
  var menu=new MenuFlyout{MenuFlyoutPresenterStyle=style,Placement=FlyoutPlacementMode.Top};menu.Items.Add(new MenuFlyoutItem{Text="Raw HostBackdrop: tint=0, luminosity=0"});menu.ShowAt(owner);await Task.Delay(700);var shot=ScreenPixels();await SaveEffectImage("Raw-HostBackdrop",shot.Pixels,shot.Width,shot.Height);menu.Hide();await Task.Delay(150);
 }
}
