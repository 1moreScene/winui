using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Hosting;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Animation;
using System.Diagnostics;
using System.Text.Json;
namespace NavigationProbe;
public sealed partial class ProbeApplication {
 async Task RunNavigationMotion(){try{
  root.Width=800;root.Height=600;
  window!.AppWindow.ResizeClient(new Windows.Graphics.SizeInt32((int)(800*root.XamlRoot.RasterizationScale),(int)(600*root.XamlRoot.RasterizationScale)));
  var records=new List<object>();
  foreach(var theme in new[]{ElementTheme.Light,ElementTheme.Dark}){
   root.Children.Clear();root.RequestedTheme=theme;root.Background=theme==ElementTheme.Light?Brush(243,243,243):Brush(32,32,32);
   var view=new NavigationView{PaneDisplayMode=NavigationViewPaneDisplayMode.Left,IsPaneOpen=true,OpenPaneLength=280,IsBackButtonVisible=NavigationViewBackButtonVisible.Collapsed,IsSettingsVisible=false};root.Children.Add(view);
   NavigationViewItem Item(string name,Windows.UI.Color? marker=null){var content=new StackPanel{Orientation=Orientation.Horizontal,Spacing=8};if(marker is Windows.UI.Color c)content.Children.Add(new Border{Width=12,Height=12,Background=new SolidColorBrush(c)});content.Children.Add(new TextBlock{Text=name});return new NavigationViewItem{Content=content,Tag=name,SelectsOnInvoked=false};}
   var parent=Item("Parent");var child=Item("Child",Windows.UI.Color.FromArgb(255,0,210,220));var nested=Item("Nested");nested.MenuItems.Add(Item("Leaf"));parent.MenuItems.Add(child);parent.MenuItems.Add(nested);view.MenuItems.Add(parent);
   var follower=Item("Follower",Windows.UI.Color.FromArgb(255,233,0,168));view.MenuItems.Add(follower);view.MenuItems.Add(Item("Last"));
   await Task.Delay(600);
   async Task Sample(string action,Action trigger,int duration=340,Action? reverse=null){
    var clock=Stopwatch.StartNew();var images=new List<(string,byte[],uint,uint)>();var samples=new List<object>();bool reversed=false;
    trigger();var done=new TaskCompletionSource();EventHandler<object>? handler=null;
    handler=(_,_)=>{var start=clock.Elapsed.TotalMilliseconds;if(reverse!=null&&!reversed&&start>=70){reverse();reversed=true;}
     var shot=ScreenPixels();var end=clock.Elapsed.TotalMilliseconds;var scale=shot.Width/root.ActualWidth;
     int minY=int.MaxValue,maxY=-1;for(int y=0;y<shot.Height;y++)for(int x=0;x<Math.Min(280*scale,shot.Width);x++){int i=(y*(int)shot.Width+x)*4;if(shot.Pixels[i]>130&&shot.Pixels[i]<195&&shot.Pixels[i+1]<20&&shot.Pixels[i+2]>210){minY=Math.Min(minY,y);maxY=Math.Max(maxY,y);}}
     var point=follower.TransformToVisual(root).TransformPoint(new Windows.Foundation.Point());
     var name=$"{theme}-{action}-{samples.Count:D3}";images.Add((name,shot.Pixels,shot.Width,shot.Height));
     samples.Add(new{name,startMs=start,endMs=end,layoutY=point.Y,markerTop=maxY>=0?minY/scale:(double?)null,markerBottom=maxY>=0?(maxY+1)/scale:(double?)null,capture=shot.CaptureMode,foreground=shot.Foreground,isExpanded=parent.IsExpanded});
     if(start>=duration){CompositionTarget.Rendering-=handler;done.SetResult();}
    };CompositionTarget.Rendering+=handler;await done.Task.WaitAsync(TimeSpan.FromSeconds(8));
    foreach(var (name,pixels,w,h) in images)await SaveEffectImage(name,pixels,w,h);
    records.Add(new{theme=theme.ToString(),action,samples});
   }
   await Sample("expand",()=>parent.IsExpanded=true);await Task.Delay(150);
   await Sample("collapse",()=>parent.IsExpanded=false);await Task.Delay(150);
   await Sample("reverse",()=>parent.IsExpanded=true,420,()=>parent.IsExpanded=false);
   view.IsPaneOpen=false;await Task.Delay(450);
   records.Add(new{theme=theme.ToString(),action="paneBrush",brush=view.Resources.TryGetValue("NavigationViewExpandedPaneBackground",out var brush)?brush?.GetType().Name:"native theme resource"});
  }
  IEnumerable<DependencyObject> Descendants(DependencyObject parent){for(int i=0;i<VisualTreeHelper.GetChildrenCount(parent);i++){var child=VisualTreeHelper.GetChild(parent,i);yield return child;foreach(var nested in Descendants(child))yield return nested;}}
  object Describe(Brush? brush)=>brush switch{AcrylicBrush a=>new{kind="acrylic",tint=a.TintColor.ToString(),tintOpacity=a.TintOpacity,luminosityOpacity=a.TintLuminosityOpacity,fallback=a.FallbackColor.ToString(),alwaysUseFallback=a.AlwaysUseFallback},SolidColorBrush s=>new{kind="solid",color=s.Color.ToString()},_=>new{kind=brush?.GetType().Name??"null"}};
  foreach(var theme in new[]{ElementTheme.Light,ElementTheme.Dark}){
   root.Children.Clear();root.RequestedTheme=theme;root.Background=Brush(66,103,134);
   var view=new NavigationView{PaneDisplayMode=NavigationViewPaneDisplayMode.Left,OpenPaneLength=280,IsPaneOpen=true,IsSettingsVisible=false};root.Children.Add(view);view.MenuItems.Add(new NavigationViewItem{Content="Materials"});
   await Task.Delay(450);var split=Descendants(view).OfType<SplitView>().First();var expanded=Describe(split.PaneBackground);
   var shot=ScreenPixels();await SaveEffectImage($"Material-{theme}-expanded",shot.Pixels,shot.Width,shot.Height);
   view.PaneDisplayMode=NavigationViewPaneDisplayMode.LeftCompact;view.IsPaneOpen=true;await Task.Delay(450);var overlay=Describe(split.PaneBackground);
   shot=ScreenPixels();await SaveEffectImage($"Material-{theme}-overlay",shot.Pixels,shot.Width,shot.Height);
   if(split.PaneBackground is AcrylicBrush brush){brush.AlwaysUseFallback=true;await Task.Delay(240);shot=ScreenPixels();await SaveEffectImage($"Material-{theme}-fallback",shot.Pixels,shot.Width,shot.Height);}
   records.Add(new{theme=theme.ToString(),action="native-materials",expanded,overlay});
  }
  var frame=new Frame{ContentTransitions=new TransitionCollection{new NavigationThemeTransition()}};
  frame.NavigationFailed+=(_,e)=>{File.WriteAllText(Path.Combine(Program.Output,"navigation-frame-failure.txt"),e.Exception.ToString());e.Handled=true;};
  root.Children.Clear();root.RequestedTheme=ElementTheme.Light;root.Background=Brush(255,255,255);root.Children.Add(frame);
  foreach(var transitionName in new[]{"Entrance","SlideFromLeft","SlideFromRight","EntranceBack","RapidEntrance"}){
   File.WriteAllText(Path.Combine(Program.Output,"navigation-motion-progress.txt"),transitionName);
   if(!frame.Navigate(typeof(NativeMotionRedPage),null,new SuppressNavigationTransitionInfo()))throw new Exception("Native Frame could not activate marker page");await Task.Delay(500);
   NavigationTransitionInfo transition=transitionName.Contains("Slide")?new SlideNavigationTransitionInfo{Effect=transitionName=="SlideFromLeft"?SlideNavigationTransitionEffect.FromLeft:SlideNavigationTransitionEffect.FromRight}:new EntranceNavigationTransitionInfo();
   if(transitionName=="EntranceBack"){frame.Navigate(typeof(NativeMotionBluePage),null,transition);await Task.Delay(550);}
   var clock=Stopwatch.StartNew();var frames=new List<object>();var pictures=new List<(string,byte[],uint,uint)>();var done=new TaskCompletionSource();bool rapid=false;
   if(transitionName=="EntranceBack")frame.GoBack();else frame.Navigate(typeof(NativeMotionBluePage),null,transition);
   EventHandler<object>? handler=null;handler=(_,_)=>{
    var start=clock.Elapsed.TotalMilliseconds;if(transitionName=="RapidEntrance"&&!rapid&&start>=80){frame.Navigate(typeof(NativeMotionRedPage),null,new EntranceNavigationTransitionInfo());rapid=true;}
    var shot=ScreenPixels();var scale=shot.Width/root.ActualWidth;
    object? Bounds(bool blue){int left=int.MaxValue,top=int.MaxValue,right=-1,bottom=-1;for(int y=0;y<shot.Height;y++)for(int x=0;x<shot.Width;x++){int i=(y*(int)shot.Width+x)*4;var b=shot.Pixels[i];var g=shot.Pixels[i+1];var r=shot.Pixels[i+2];if(blue?b>150&&g>80&&r<100:r>160&&g<130&&b<150){left=Math.Min(left,x);right=Math.Max(right,x);top=Math.Min(top,y);bottom=Math.Max(bottom,y);}}return right<0?null:new{x=left/scale,y=top/scale,width=(right-left+1)/scale,height=(bottom-top+1)/scale};}
    var name=$"Page-{transitionName}-{frames.Count:D3}";var red=Bounds(false);var blue=Bounds(true);var end=clock.Elapsed.TotalMilliseconds;
    pictures.Add((name,shot.Pixels,shot.Width,shot.Height));frames.Add(new{name,startMs=start,endMs=end,red,blue,capture=shot.CaptureMode,foreground=shot.Foreground});
    if(start>=650){CompositionTarget.Rendering-=handler;done.SetResult();}
   };CompositionTarget.Rendering+=handler;await done.Task.WaitAsync(TimeSpan.FromSeconds(10));
   foreach(var (name,pixels,w,h) in pictures)await SaveEffectImage(name,pixels,w,h);
   records.Add(new{theme="Light",action="page-"+transitionName,samples=frames});
  }
  File.WriteAllText(Path.Combine(Program.Output,"navigation-motion-native.json"),JsonSerializer.Serialize(new{sdk="Microsoft.WindowsAppSDK 2.5.4-experimental / WinUI 2.3.10-experimental",dpi=root.XamlRoot.RasterizationScale,records,boundary="Live same-SDK standalone window; GDI own-client captures bracket UI Rendering callbacks, not Store release or compositor present timestamps."},EffectsJson));
  File.WriteAllText(Path.Combine(Program.Output,"navigation-motion-complete.json"),"{}");
 }catch(Exception e){File.WriteAllText(Path.Combine(Program.Output,"navigation-motion-error.txt"),e.ToString());}Exit();}
}
public sealed partial class NativeMotionRedPage:Page {public NativeMotionRedPage(){InitializeComponent();}}
public sealed partial class NativeMotionBluePage:Page {public NativeMotionBluePage(){InitializeComponent();}}
