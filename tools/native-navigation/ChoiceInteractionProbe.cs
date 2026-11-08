using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Input;
using System.Runtime.InteropServices;
using System.Text.Json;
namespace NavigationProbe;
public sealed partial class ProbeApplication {
    [DllImport("user32.dll")] static extern bool SetCursorPos(int x,int y);
    [DllImport("user32.dll")] static extern void mouse_event(uint flags,uint x,uint y,uint data,UIntPtr extra);
    async Task RunChoiceInteraction(){try{
        (byte[] Pixels,uint Width,uint Height,bool Foreground,string CaptureMode) ChoicePixels()=>CaptureClientPixels(WinRT.Interop.WindowNative.GetWindowHandle(window!),true,true);
        var scale=root.XamlRoot.RasterizationScale;
        window!.AppWindow.ResizeClient(new Windows.Graphics.SizeInt32((int)Math.Round(1000*scale),(int)Math.Round(500*scale)));
        var rows=new List<object>();
        async Task PresentPointer(){
            var ready=new TaskCompletionSource();var frames=0;
            EventHandler<object>? render=null;render=(_,_)=>{if(++frames>=3)ready.TrySetResult();};
            CompositionTarget.Rendering+=render;
            try{root.InvalidateMeasure();if(await Task.WhenAny(ready.Task,Task.Delay(1500))!=ready.Task)throw new TimeoutException("Pointer presentation did not render");}
            finally{CompositionTarget.Rendering-=render;}
        }
        foreach(var theme in new[]{"Light","Dark"})foreach(var editable in new[]{false,true}){
            root.Children.Clear();root.RequestedTheme=theme=="Light"?ElementTheme.Light:ElementTheme.Dark;root.Background=theme=="Light"?Brush(243,243,243):Brush(32,32,32);
            var canvas=new Canvas();root.Children.Add(canvas);var box=new ComboBox{Width=240,ItemsSource=new[]{"Blue","Green","Red","Yellow"},SelectedIndex=2,IsEditable=editable};Canvas.SetLeft(box,24);Canvas.SetTop(box,140);canvas.Children.Add(box);root.UpdateLayout();
            await PresentPointer();await Task.Delay(80);
            Move(editable?Tree(box).OfType<FrameworkElement>().First(e=>e.Name=="DropDownOverlay"):box);mouse_event(2,0,0,0,UIntPtr.Zero);await Task.Delay(33);mouse_event(4,0,0,0,UIntPtr.Zero);await Task.Delay(900);
            if(!box.IsDropDownOpen)throw new InvalidOperationException("Real pointer did not open ComboBox");
            var label=$"{theme}-{(editable?"Editable":"ReadOnly")}";
            var pointerEvents=new List<object>();
            foreach(var index in new[]{0,2}){
                var item=(ComboBoxItem)box.ContainerFromIndex(index);
                void Trace(string kind,PointerRoutedEventArgs e){var point=e.GetCurrentPoint(root);pointerEvents.Add(new{index,kind,x=point.Position.X,y=point.Position.Y,pressed=point.Properties.IsLeftButtonPressed});}
                item.AddHandler(UIElement.PointerEnteredEvent,new PointerEventHandler((_,e)=>Trace("enter",e)),true);
                item.AddHandler(UIElement.PointerExitedEvent,new PointerEventHandler((_,e)=>Trace("exit",e)),true);
            }
            void Move(FrameworkElement element){
                _=ChoicePixels();var p=element.TransformToVisual(root).TransformPoint(new Windows.Foundation.Point(element.ActualWidth/2,element.ActualHeight/2));
                var origin=new NativePoint();ClientToScreen(WinRT.Interop.WindowNative.GetWindowHandle(window!),ref origin);SetCursorPos(origin.X+(int)Math.Round(p.X*scale),origin.Y+(int)Math.Round(p.Y*scale));
                // A cursor warp alone does not update the WinUI input site's
                // cached pointer. Deliver a real mouse-move input packet too.
                mouse_event(1,1,0,0,UIntPtr.Zero);
            }
            async Task Capture(string state,double requested=0,System.Diagnostics.Stopwatch? timer=null){
                var before=timer?.Elapsed.TotalMilliseconds??0;var shot=ChoicePixels();var image=$"choice-{label}-{state}.png";await SaveEffectImage(Path.GetFileNameWithoutExtension(image),shot.Pixels,shot.Width,shot.Height);
                var states=Enumerable.Range(0,4).Select(index=>{var item=box.ContainerFromIndex(index);var layout=item==null?null:Tree(item).OfType<FrameworkElement>().FirstOrDefault(e=>e.Name=="LayoutRoot");return new{index,states=layout==null?Array.Empty<string>():VisualStateManager.GetVisualStateGroups(layout).Select(g=>g.CurrentState?.Name??"").ToArray()};}).ToArray();
                var popups=VisualTreeHelper.GetOpenPopupsForXamlRoot(root.XamlRoot);rows.Add(new{theme,editable,state,requestedMs=requested,captureStartedMs=before,image,box.SelectedIndex,box.IsDropDownOpen,popupCount=popups.Count,pointerEvents=pointerEvents.ToArray(),visualStates=states,parts=popups.Select(p=>CompactParts((FrameworkElement)p.Child)).ToArray(),shot.Foreground,shot.CaptureMode});
            }
            Move(box);await Task.Delay(80);await PresentPointer();await Capture("Open");
            var first=(ComboBoxItem)box.ContainerFromIndex(0);var selected=(ComboBoxItem)box.ContainerFromIndex(2);int entered=0,released=0;
            first.PointerEntered+=(_,_)=>entered++;first.AddHandler(UIElement.PointerReleasedEvent,new PointerEventHandler((_,_)=>released++),true);
            Move(first);await Task.Delay(100);await PresentPointer();await Capture("Hover");
            VisualStateManager.GoToState(first,"PointerOver",false);VisualStateManager.GoToState(selected,"Selected",false);await PresentPointer();await Capture("HoverTemplate");
            Move(selected);await Task.Delay(100);await PresentPointer();await Capture("SelectedHover");
            VisualStateManager.GoToState(first,"Normal",false);VisualStateManager.GoToState(selected,"SelectedPointerOver",false);await PresentPointer();await Capture("SelectedHoverTemplate");
            Move(first);await Task.Delay(80);await PresentPointer();
            var timer=System.Diagnostics.Stopwatch.StartNew();mouse_event(2,0,0,0,UIntPtr.Zero);mouse_event(4,0,0,0,UIntPtr.Zero);
            foreach(var time in new[]{0,16,33,67,100,167,250}){var delay=time-timer.Elapsed.TotalMilliseconds;if(delay>0)await Task.Delay((int)Math.Ceiling(delay));await Capture("Close-"+time,time,timer);}
            if(box.IsDropDownOpen||box.SelectedIndex!=0||entered==0||released==0)throw new InvalidOperationException($"Real pointer selection failed: {label}, selected={box.SelectedIndex}, open={box.IsDropDownOpen}, entered={entered}, released={released}");
        }
        File.WriteAllText(Path.Combine(Program.Output,"choice-interaction.json"),JsonSerializer.Serialize(new{rows,scope="Real Win32 pointer open and selection/close without a selected-index setter. Raw pointer hover observations are retained. States ending Template explicitly force SDK VSM for matched visual comparison and do not establish real-pointer frame parity."},EffectsJson));
    }catch(Exception error){File.WriteAllText(Path.Combine(Program.Output,"choice-interaction-error.txt"),error.ToString());}Exit();}
}
