using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Markup;
using Microsoft.UI.Xaml.Media;
using System.Text.Json;
namespace NavigationProbe;
public sealed partial class ProbeApplication {
 void RunPickerDefaults(){try{
  var calendar=new CalendarView();var date=new DatePicker();var time=new TimePicker();var color=new ColorPicker();
  var host=new Grid{Width=180,Height=450};host.Children.Add(calendar);root.Children.Add(host);root.UpdateLayout();
  var freeHost=new Canvas();root.Children.Add(freeHost);var freeCalendar=new CalendarView{Language="zh-CN"};freeHost.Children.Add(freeCalendar);root.UpdateLayout();
  var data=new{natural=new{freeCalendar.ActualWidth,freeCalendar.ActualHeight,freeCalendar.Language},constrained=new{calendar.ActualWidth,calendar.ActualHeight,DesiredWidth=calendar.DesiredSize.Width,calendar.MinWidth},calendar=new{calendar.IsGroupLabelVisible,calendar.IsOutOfScopeEnabled,calendar.IsTodayHighlighted,calendar.NumberOfWeeksInView,calendar.FirstDayOfWeek,calendar.DayItemFontSize,calendar.TodayFontWeight,calendar.CalendarIdentifier,MinDate=calendar.MinDate.ToString("yyyy-MM-dd"),MaxDate=calendar.MaxDate.ToString("yyyy-MM-dd")},date=new{date.DayFormat,date.MonthFormat,date.YearFormat,date.CalendarIdentifier,date.DayVisible,date.MonthVisible,date.YearVisible},time=new{time.ClockIdentifier,time.MinuteIncrement},color=new{color.IsAlphaEnabled,color.IsMoreButtonVisible,color.ColorSpectrumComponents,color.Orientation}};
  File.WriteAllText(Path.Combine(Program.Output,"picker-defaults.json"),JsonSerializer.Serialize(data,EffectsJson));
 }catch(Exception e){File.WriteAllText(Path.Combine(Program.Output,"picker-defaults-error.txt"),e.ToString());}Exit();}
 async Task RunPickerControls(){try{
  var scale=root.XamlRoot.RasterizationScale;
  root.Height=800;
  window!.AppWindow.ResizeClient(new Windows.Graphics.SizeInt32((int)Math.Round(1000*scale),(int)Math.Round(800*scale)));
  var rows=new List<object>();var palettes=new Dictionary<string,object>();
  var contract=JsonDocument.Parse(File.ReadAllText(Path.Combine(Program.Output,"picker-contract.json")));
  var date=new DateTimeOffset(2026,11,8,12,0,0,TimeSpan.Zero);
  foreach(var theme in new[]{"Light","Dark"}){
   root.Children.Clear();root.RequestedTheme=theme=="Light"?ElementTheme.Light:ElementTheme.Dark;root.Background=theme=="Light"?Brush(243,243,243):Brush(32,32,32);
   var colors=new Dictionary<string,object>();
   foreach(var resource in contract.RootElement.GetProperty("brushKeys").EnumerateArray()){
    var key=resource.GetString()!;
    try{var b=(Border)XamlReader.Load($"<Border xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\" Background=\"{{ThemeResource {key}}}\"/>");root.Children.Add(b);root.UpdateLayout();colors[key]=DescribeButtonBrush(b.Background)!;root.Children.Remove(b);}catch(Exception e){colors[key]=new{error=e.Message};}
   }palettes[theme]=colors;
   foreach(var kind in new[]{"CalendarView","CalendarDatePicker","DatePicker","TimePicker","ColorPicker"}){
    var states=kind switch{
     "CalendarView"=>new[]{"Normal","Selected","Multiple","Year","Decade","Disabled"},
     "CalendarDatePicker"=>new[]{"Normal","Selected","Header","Disabled","Open"},
     "DatePicker"=>new[]{"Normal","Selected","Header","Disabled","Open","WheelHover","WheelPressed"},
     "TimePicker"=>new[]{"Normal","Selected","TwentyFourHour","Header","Disabled","Open","WheelHover","WheelPressed"},
     _=>new[]{"Normal","Selected","Alpha","Ring","More","Horizontal","Disabled"}
    };
    foreach(var state in states){
     root.Children.Clear();var canvas=new Canvas();root.Children.Add(canvas);FrameworkElement control;
     if(kind=="CalendarView"){
      var c=new CalendarView{Language="en-US",MinDate=new DateTimeOffset(2020,1,1,0,0,0,TimeSpan.Zero),MaxDate=new DateTimeOffset(2030,12,31,0,0,0,TimeSpan.Zero),IsEnabled=state!="Disabled"};c.SetDisplayDate(date);
      if(state is "Selected" or "Multiple")c.SelectedDates.Add(date);
      if(state=="Multiple"){c.SelectionMode=CalendarViewSelectionMode.Multiple;c.SelectedDates.Add(date.AddDays(3));}
      c.DisplayMode=state=="Year"?CalendarViewDisplayMode.Year:state=="Decade"?CalendarViewDisplayMode.Decade:CalendarViewDisplayMode.Month;control=c;
     }else if(kind=="CalendarDatePicker"){
      var c=new CalendarDatePicker{Language="en-US",IsEnabled=state!="Disabled",PlaceholderText="Pick a date"};if(state!="Normal"&&state!="Disabled")c.Date=date;if(state=="Header")c.Header="Date";control=c;
     }else if(kind=="DatePicker"){
      var c=new DatePicker{Language="en-US",IsEnabled=state!="Disabled"};if(state!="Normal"&&state!="Disabled")c.SelectedDate=date;if(state=="Header")c.Header="Date";control=c;
     }else if(kind=="TimePicker"){
      var c=new TimePicker{Language="en-US",IsEnabled=state!="Disabled",ClockIdentifier=state=="TwentyFourHour"?"24HourClock":"12HourClock"};if(state!="Normal"&&state!="Disabled")c.SelectedTime=new TimeSpan(14,35,0);if(state=="Header")c.Header="Time";control=c;
     }else{
      var c=new ColorPicker{IsEnabled=state!="Disabled",Color=state=="Normal"?Windows.UI.Color.FromArgb(255,255,255,255):Windows.UI.Color.FromArgb(204,0,120,215),IsAlphaEnabled=state=="Alpha",IsMoreButtonVisible=state=="More",ColorSpectrumShape=state=="Ring"?ColorSpectrumShape.Ring:ColorSpectrumShape.Box,Orientation=state=="Horizontal"?Orientation.Horizontal:Orientation.Vertical};control=c;
     }
     Canvas.SetLeft(control,state=="Open"||state.StartsWith("Wheel")?160:24);Canvas.SetTop(control,state=="Open"||state.StartsWith("Wheel")?200:24);canvas.Children.Add(control);root.UpdateLayout();
     if(control is CalendarView view){view.SetDisplayDate(date);view.DisplayMode=state=="Year"?CalendarViewDisplayMode.Year:state=="Decade"?CalendarViewDisplayMode.Decade:CalendarViewDisplayMode.Month;root.UpdateLayout();}
     FlyoutBase? activeFlyout=null;
     if(state=="Open"||state.StartsWith("Wheel")){
      if(control is CalendarDatePicker calendar)calendar.IsCalendarOpen=true;
      if(control is DatePicker picker){var flyout=new DatePickerFlyout{Date=date,MinYear=picker.MinYear,MaxYear=picker.MaxYear};activeFlyout=flyout;_=flyout.ShowAtAsync(picker);}
      if(control is TimePicker time){var flyout=new TimePickerFlyout{Time=new TimeSpan(14,35,0),ClockIdentifier=time.ClockIdentifier};activeFlyout=flyout;_=flyout.ShowAtAsync(time);}
     }
     await Task.Delay(650);
     if(state.StartsWith("Wheel")){
      IEnumerable<DependencyObject> Walk(DependencyObject element){yield return element;for(int i=0;i<VisualTreeHelper.GetChildrenCount(element);i++)foreach(var child in Walk(VisualTreeHelper.GetChild(element,i)))yield return child;}
      var popup=VisualTreeHelper.GetOpenPopupsForXamlRoot(root.XamlRoot).FirstOrDefault()??throw new Exception($"No popup: {theme}-{kind}-{state}");var wheel=Walk(popup.Child).OfType<LoopingSelector>().FirstOrDefault()??throw new Exception($"No wheel: {theme}-{kind}-{state}");VisualStateManager.GoToState(wheel,"PointerOver",false);root.UpdateLayout();var up=Walk(wheel).OfType<RepeatButton>().First(b=>b.Name=="UpButton");VisualStateManager.GoToState(up,state=="WheelPressed"?"Pressed":"PointerOver",false);root.UpdateLayout();await Task.Delay(80);
     }
     var shot=CaptureClientPixels(WinRT.Interop.WindowNative.GetWindowHandle(window!),true,true);var name=$"picker-{theme}-{kind}-{state}";
     var popups=VisualTreeHelper.GetOpenPopupsForXamlRoot(root.XamlRoot).ToArray();
     var props=new Dictionary<string,object?>();
     if(control is CalendarView cv){props["displayMode"]=cv.DisplayMode.ToString();props["numberOfWeeks"]=cv.NumberOfWeeksInView;props["firstDayOfWeek"]=cv.FirstDayOfWeek.ToString();props["minDate"]=cv.MinDate.ToString("yyyy-MM-dd");props["maxDate"]=cv.MaxDate.ToString("yyyy-MM-dd");props["selectedDates"]=cv.SelectedDates.Select(d=>d.ToString("yyyy-MM-dd")).ToArray();}
     if(control is CalendarDatePicker cd){props["date"]=cd.Date?.ToString("yyyy-MM-dd");props["minDate"]=cd.MinDate.ToString("yyyy-MM-dd");props["maxDate"]=cd.MaxDate.ToString("yyyy-MM-dd");}
     if(control is DatePicker dp){props["date"]=dp.SelectedDate?.ToString("yyyy-MM-dd");props["minDate"]=dp.MinYear.ToString("yyyy-MM-dd");props["maxDate"]=dp.MaxYear.ToString("yyyy-MM-dd");props["dayFormat"]=dp.DayFormat;props["monthFormat"]=dp.MonthFormat;props["yearFormat"]=dp.YearFormat;}
     if(control is TimePicker tp){props["time"]=tp.SelectedTime?.TotalMinutes;props["clockIdentifier"]=tp.ClockIdentifier;props["minuteIncrement"]=tp.MinuteIncrement;}
     if(control is ColorPicker cp){props["color"]=$"#{cp.Color.R:X2}{cp.Color.G:X2}{cp.Color.B:X2}{cp.Color.A:X2}";props["isAlphaEnabled"]=cp.IsAlphaEnabled;props["components"]=cp.ColorSpectrumComponents.ToString();props["shape"]=cp.ColorSpectrumShape.ToString();props["orientation"]=cp.Orientation.ToString();}
     var record=new{name,theme,kind,state,props,bounds=Rect(control),parts=CompactParts(control),popups=popups.Select(p=>new{bounds=Rect((FrameworkElement)p.Child),parts=CompactParts((FrameworkElement)p.Child)}).ToArray(),shot.Foreground,shot.CaptureMode};
     await SaveEffectImage(name,shot.Pixels,shot.Width,shot.Height);rows.Add(record);
     foreach(var p in popups)p.IsOpen=false;GC.KeepAlive(activeFlyout);if(popups.Length>0)await Task.Delay(200);
    }
   }
  }
  File.WriteAllText(Path.Combine(Program.Output,"picker-controls.json"),JsonSerializer.Serialize(new{rows,languages=Windows.Globalization.ApplicationLanguages.Languages,calendarLanguages=new Windows.Globalization.Calendar().Languages,sdk="Microsoft.WindowsAppSDK.WinUI/2.3.10-experimental",scope="Own live SDK window. Explicit API-selected states after template loading; date/time Open fixtures use independent same-SDK flyout instances."},EffectsJson));
  File.WriteAllText(Path.Combine(Program.Output,"picker-palettes.json"),JsonSerializer.Serialize(palettes,EffectsJson));
 }catch(Exception error){File.WriteAllText(Path.Combine(Program.Output,"picker-error.txt"),error.ToString());}Exit();}
}
