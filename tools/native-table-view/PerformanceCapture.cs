// Same-process sampling of the original community controls. No desktop input.
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Data;
using Microsoft.UI.Xaml.Markup;
using Microsoft.UI.Xaml.Media;
using System.Diagnostics;
using System.Text.Json;

namespace WinUI.TableView.SampleApp;
internal static partial class ParityCapture
{
    public sealed class PerformanceRow
    {
        public string id { get; set; }="";
        public string name { get; set; }="";
        public double age { get; set; }
        public bool active { get; set; }
        public bool notifications { get; set; }
        public string department { get; set; }="";
        public DateTimeOffset joined { get; set; }
        public TimeSpan start { get; set; }
        public string website { get; set; }="";
        public string notes { get; set; }="";
    }
    static async Task PerformanceCapture()
    {
        var fixtures=JsonDocument.Parse(File.ReadAllText(Environment.GetEnvironmentVariable("WINUI_TABLEVIEW_PERFORMANCE_FIXTURE")!));
        var results=new List<object>();
        var window=App.Current.MainWindow;
        foreach(var spec in fixtures.RootElement.EnumerateArray())
        {
            string name=spec.GetProperty("name").GetString()!;
            var rows=spec.GetProperty("items").EnumerateArray().Select(r=>new PerformanceRow {
                id=r.GetProperty("id").GetString()!,name=r.GetProperty("name").GetString()!,age=r.GetProperty("age").GetDouble(),active=r.GetProperty("active").GetBoolean(),notifications=r.GetProperty("notifications").GetBoolean(),department=r.GetProperty("department").GetString()!,joined=DateTimeOffset.Parse(r.GetProperty("joined").GetString()!),start=TimeSpan.FromMinutes(r.GetProperty("start").GetDouble()),website=r.GetProperty("website").GetString()!,notes=r.GetProperty("notes").GetString()!
            }).ToArray();
            double width=spec.GetProperty("width").GetDouble(),height=spec.GetProperty("height").GetDouble();
            var root=new Grid{Width=width,Height=height,RequestedTheme=ElementTheme.Light,Background=new SolidColorBrush(Microsoft.UI.ColorHelper.FromArgb(255,243,243,243))};
            var accent=new SolidColorBrush(Microsoft.UI.ColorHelper.FromArgb(255,0,103,192));
            root.Resources["SystemAccentColor"]=accent.Color;App.Current.Resources["SystemAccentColor"]=accent.Color;
            foreach(var resource in new[]{"AccentFillColorDefaultBrush","AccentFillColorSelectedTextBackgroundBrush","TextControlSelectionHighlightColor","SystemControlHighlightAccentBrush","CheckBoxCheckBackgroundFillChecked","CheckBoxCheckBackgroundStrokeChecked","CheckBoxCheckBackgroundFillIndeterminate","CheckBoxCheckBackgroundStrokeIndeterminate","ToggleSwitchFillOn","TableViewRowSelectionIndicatorBrush"}){root.Resources[resource]=accent;App.Current.Resources[resource]=accent;}
            var table=new global::WinUI.TableView.TableView{AutoGenerateColumns=false,ItemsSource=rows,
                RowHeight=spec.GetProperty("rowHeight").GetDouble(),HeaderRowHeight=spec.GetProperty("headerRowHeight").GetDouble(),
                FrozenColumnCount=spec.GetProperty("frozenColumnCount").GetInt32(),
                GridLinesVisibility=Enum.Parse<global::WinUI.TableView.TableViewGridLinesVisibility>(spec.GetProperty("gridLinesVisibility").GetString()!)};
            foreach(var c in spec.GetProperty("columns").EnumerateArray())
            {
                string field=c.GetProperty("field").GetString()!,kind=c.GetProperty("kind").GetString()!;
                TableViewColumn column=kind switch {
                    "Number"=>new TableViewNumberColumn(),"CheckBox"=>new TableViewCheckBoxColumn(),"ToggleSwitch"=>new TableViewToggleSwitchColumn(),
                    "ComboBox"=>new TableViewComboBoxColumn{ItemsSource=new[]{"Engineering","Design","Operations","Research"}},
                    "Date"=>new TableViewDateColumn{DateFormat="{year.full}-{month.integer(2)}-{day.integer(2)}"},
                    "Time"=>new TableViewTimeColumn{ClockIdentifier="24HourClock"},"Hyperlink"=>new TableViewHyperlinkColumn(),
                    "Template"=>new TableViewTemplateColumn{CellTemplate=(DataTemplate)XamlReader.Load("<DataTemplate xmlns='http://schemas.microsoft.com/winfx/2006/xaml/presentation'><TextBlock Text='{Binding notes}' VerticalAlignment='Center'/></DataTemplate>")},
                    _=>new TableViewTextColumn()
                };
                column.Header=c.GetProperty("header").GetString();column.Width=new GridLength(c.GetProperty("width").GetProperty("value").GetDouble());
                if(column is TableViewBoundColumn bound)bound.Binding=new Binding{Path=new PropertyPath(field)};
                table.Columns.Add(column);
            }
            root.Children.Add(table);window.Content=root;
            window.AppWindow.ResizeClient(new Windows.Graphics.SizeInt32((int)Math.Round(width*1.25),(int)Math.Round(height*1.25)));
            await Task.Delay(1100);root.UpdateLayout();
            var viewer=Tree(table).OfType<ScrollViewer>().OrderByDescending(v=>v.ViewportWidth*v.ViewportHeight).First();
            await Capture(name+"-default",root);
            async Task Sample(string action,Action start)
            {
                var frames=new List<object>();var clock=Stopwatch.StartNew();
                void Frame(object? sender,object args) {frames.Add(new{timeMs=clock.Elapsed.TotalMilliseconds,verticalOffset=viewer.VerticalOffset,horizontalOffset=viewer.HorizontalOffset});}
                CompositionTarget.Rendering+=Frame;
                double begin=clock.Elapsed.TotalMilliseconds;start();double actionMs=clock.Elapsed.TotalMilliseconds-begin;
                await Task.Delay(1100);CompositionTarget.Rendering-=Frame;
                results.Add(new{name,action,count=rows.Length,actionMs,frames,realizedRows=Tree(table).OfType<TableViewRow>().Count(),viewport=new[]{viewer.ViewportWidth,viewer.ViewportHeight},extent=new[]{viewer.ExtentWidth,viewer.ExtentHeight},scale=root.XamlRoot.RasterizationScale});
            }
            var header=Tree(table).OfType<TableViewColumnHeader>().Single(h=>Equals(h.Column?.Header,"Age"));
            await Sample("sort",()=>Invoke(header,"DoSort",global::WinUI.TableView.SortDirection.Descending,true));
            for(int attempt=0;attempt<10;attempt++){viewer.ChangeView(null,0,null,true);await Task.Delay(100);if(Math.Abs(viewer.VerticalOffset)<0.01)break;}
            await Sample("scroll",()=>viewer.ChangeView(null,300,null,false));
            await Capture(name+"-scrolled",root);
            viewer.ChangeView(null,0,null,true);await Task.Delay(100);
            // Readback is isolated from the cadence pass above; its cost must
            // never be counted as native UI frame time.
            var samples=new List<object>();var clock=Stopwatch.StartNew();viewer.ChangeView(null,300,null,false);
            foreach(var target in new[]{0,8,17,33,67,125,250,400,667})
            {
                int delay=target-(int)clock.ElapsedMilliseconds;if(delay>0)await Task.Delay(delay);
                double begin=clock.Elapsed.TotalMilliseconds;var capture=$"{name}-scroll-{target}";await SaveOwn(capture);
                samples.Add(new{targetMs=target,actualStartMs=begin,actualEndMs=clock.Elapsed.TotalMilliseconds,verticalOffset=viewer.VerticalOffset,capture});
            }
            results.Add(new{name,action="scroll-readback",samples,boundary="Own-window PrintWindow costs are excluded from the separate Rendering-event cadence pass"});
            if(name=="editing")
            {
                for(int attempt=0;attempt<10;attempt++){viewer.ChangeView(null,0,null,true);await Task.Delay(100);if(Math.Abs(viewer.VerticalOffset)<0.01)break;}
                var cell=Tree(table).OfType<TableViewCell>().Single(c=>c.Slot.Row==5 && Equals(c.Column?.Header,"Age"));
                table.CurrentCellSlot=cell.Slot;
                Invoke(cell,"BeginCellEditing",new RoutedEventArgs());await Task.Delay(300);
                await Capture("editing-editor-default",root);
                await Sample("active-editor-scroll",()=>viewer.ChangeView(null,180,null,false));
                await Capture("editing-editor-scrolled",root);
                if(!Tree(table).OfType<NumberBox>().Any())throw new InvalidOperationException("Native editor was recycled; invalid comparison");
            }
        }
        File.WriteAllText(Path.Combine(Output,"performance.json"),JsonSerializer.Serialize(new{source="Pinned original community SampleApp and controls; programmatic source actions, no computer use or OS input injection",requestedBrowserBudgetHz=120,records=results,boundary="Rendering callbacks are native UI-thread cadence on the available display; they do not certify 120Hz physical presentation. Readback samples are a separate pass."},Json));
        File.WriteAllText(Path.Combine(Output,"geometry.json"),JsonSerializer.Serialize(Records,Json));
        File.WriteAllText(Path.Combine(Output,"complete.json"),JsonSerializer.Serialize(new{completedAt=DateTimeOffset.Now,records=results.Count}));
    }
}
