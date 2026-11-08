using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using System.Text.Json;
namespace NavigationProbe;
public sealed partial class ProbeApplication {
 async Task RunComboFaceplate(){try{
  var scale=root.XamlRoot.RasterizationScale;window!.AppWindow.ResizeClient(new Windows.Graphics.SizeInt32((int)Math.Round(1000*scale),(int)Math.Round(500*scale)));
  var rows=new List<object>();
  foreach(var theme in new[]{"Light","Dark"})foreach(var editable in new[]{false,true})foreach(var state in new[]{"Normal","HoverText","HoverArrow","Keyboard","KeyboardHover","KeyboardHoverArrow","Disabled"}){
   root.Children.Clear();root.RequestedTheme=theme=="Light"?ElementTheme.Light:ElementTheme.Dark;root.Background=theme=="Light"?Brush(243,243,243):Brush(32,32,32);
   var origin=new NativePoint();ClientToScreen(WinRT.Interop.WindowNative.GetWindowHandle(window!),ref origin);SetCursorPos(origin.X+(int)(600*scale),origin.Y+(int)(400*scale));
   var canvas=new Canvas();root.Children.Add(canvas);var box=new ComboBox{Width=240,ItemsSource=new[]{"Blue","Green","Red","Yellow"},SelectedIndex=1,IsEditable=editable,IsEnabled=state!="Disabled"};Canvas.SetLeft(box,24);Canvas.SetTop(box,24);canvas.Children.Add(box);root.UpdateLayout();_=ScreenPixels();
   if(state.StartsWith("Keyboard")){box.Focus(FocusState.Keyboard);if(editable)Tree(box).OfType<TextBox>().First(e=>e.Name=="EditableText").Focus(FocusState.Keyboard);}
   if(state.Contains("Hover")){
    VisualStateManager.GoToState(box,"PointerOver",false);
    if(editable&&state.EndsWith("Arrow"))VisualStateManager.GoToState(box,"TextBoxOverlayPointerOver",false);
   }
   await Task.Delay(180);
   if(state.Contains("Hover"))VisualStateManager.GoToState(box,"PointerOver",false);
   if(state.StartsWith("Keyboard")&&!editable)VisualStateManager.GoToState(box,"Focused",false);
   if(editable&&state.EndsWith("Arrow"))VisualStateManager.GoToState(box,"TextBoxOverlayPointerOver",false);
   await Task.Delay(80);var shot=ScreenPixels();var name=$"faceplate-{theme}-{(editable?"Editable":"ReadOnly")}-{state}";
   var record=new{name,theme,editable,state,bounds=Rect(box),parts=CompactParts(box),shot.Foreground,shot.CaptureMode};
   await SaveEffectImage(name,shot.Pixels,shot.Width,shot.Height);rows.Add(record);
  }
  File.WriteAllText(Path.Combine(Program.Output,"combo-faceplate.json"),JsonSerializer.Serialize(new{rows,scope="Same-SDK closed ComboBox templates. CommonStates and FocusStates are applied independently; hover fixtures explicitly select VSM states."},EffectsJson));
 }catch(Exception error){File.WriteAllText(Path.Combine(Program.Output,"combo-faceplate-error.txt"),error.ToString());}Exit();}
}
