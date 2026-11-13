// Instrumentation only. The community controls, templates and native input handlers are unchanged.
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Data;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using System.Diagnostics;
using System.Reflection;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Text.Json;
using System.Text.Json.Serialization;
using Windows.Foundation;
using Windows.Graphics.Imaging;
using Windows.Storage;
using WinUI.TableView.SampleApp.Pages;

namespace WinUI.TableView.SampleApp;

internal static partial class ParityCapture
{
    static readonly string Output = Path.GetFullPath(Environment.GetEnvironmentVariable("WINUI_TABLEVIEW_CAPTURE_DIR")!);
    static readonly JsonSerializerOptions Json = new() { WriteIndented = true, NumberHandling = JsonNumberHandling.AllowNamedFloatingPointLiterals };
    static readonly List<object> Records = [];
    static readonly List<object> Events = [];
    static readonly Stopwatch Clock = Stopwatch.StartNew();
    static IEnumerable<DependencyObject> Tree(DependencyObject root)
    {
        yield return root;
        for (int i = 0; i < VisualTreeHelper.GetChildrenCount(root); ++i)
            foreach (var child in Tree(VisualTreeHelper.GetChild(root, i))) yield return child;
    }
    static string? Brush(Brush? brush) => brush is SolidColorBrush b ? $"#{b.Color.R:X2}{b.Color.G:X2}{b.Color.B:X2}{b.Color.A:X2}" : brush?.GetType().Name;
    static object Rect(FrameworkElement element, UIElement root)
    {
        var rect = element.TransformToVisual(root).TransformBounds(new Rect(0, 0, element.ActualWidth, element.ActualHeight));
        return new { x = rect.X, y = rect.Y, width = rect.Width, height = rect.Height };
    }
    static object Part(FrameworkElement element, UIElement root) => new
    {
        type = element.GetType().Name, name = element.Name, bounds = Rect(element, root),
        visible = element.Visibility.ToString(), element.Opacity, margin = element.Margin.ToString(),
        text = element is TextBlock tb ? tb.Text : element is TextBox text ? text.Text : element is ContentControl content ? content.Content as string : null,
        glyph = element is FontIcon icon ? icon.Glyph : null,
        symbol = element is SymbolIcon symbol ? symbol.Symbol.ToString() : null,
        font = element is Control control ? new { family = control.FontFamily.Source, size = control.FontSize, weight = control.FontWeight.Weight } : null,
        background = Brush(element is Control c ? c.Background : element is Panel p ? p.Background : element is Border b ? b.Background : null),
        foreground = Brush(element is Control cc ? cc.Foreground : element is TextBlock t ? t.Foreground : null),
        padding = element is Control cp ? cp.Padding.ToString() : element is Border bp ? bp.Padding.ToString() : null,
        border = element is Control cb ? cb.BorderThickness.ToString() : element is Border bb ? bb.BorderThickness.ToString() : null,
        borderBrush = Brush(element is Control bc ? bc.BorderBrush : element is Border br ? br.BorderBrush : null),
        radius = element is Control cr ? cr.CornerRadius.ToString() : element is Border rb ? rb.CornerRadius.ToString() : null,
    };
    static async Task Image(string name, FrameworkElement element)
    {
        var bitmap = new RenderTargetBitmap();
        double scale = element.XamlRoot.RasterizationScale;
        await bitmap.RenderAsync(element);
        var folder = await StorageFolder.GetFolderFromPathAsync(Output);
        var file = await folder.CreateFileAsync(name + ".png", CreationCollisionOption.ReplaceExisting);
        using var stream = await file.OpenAsync(FileAccessMode.ReadWrite);
        var encoder = await BitmapEncoder.CreateAsync(BitmapEncoder.PngEncoderId, stream);
        encoder.SetPixelData(BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied, (uint)bitmap.PixelWidth, (uint)bitmap.PixelHeight, 96 * scale, 96 * scale, (await bitmap.GetPixelsAsync()).ToArray());
        await encoder.FlushAsync();
    }
    static async Task Capture(string name, FrameworkElement element)
    {
        element.UpdateLayout();
        await Image(name, element);
        Records.Add(new { name, capturedAtMs = Clock.Elapsed.TotalMilliseconds, scale = element.XamlRoot.RasterizationScale, bounds = Rect(element, element), parts = Tree(element).OfType<FrameworkElement>().Select(e => Part(e, element)).ToArray() });
        File.WriteAllText(Path.Combine(Output,"partial.json"),JsonSerializer.Serialize(Records,Json));
    }
    static object? Invoke(object target, string method, params object?[] args) => target.GetType().GetMethod(method, BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic)!.Invoke(target, args);
    public sealed class FixtureRow
    {
        public string id { get; set; } = "";
        public string firstName { get; set; } = "";
        public string lastName { get; set; } = "";
        public string department { get; set; } = "";
        public bool active { get; set; }
    }
    static readonly FixtureRow[] Rows = [
        new() {id="r0", firstName="Ada",lastName="Lovelace",department="Engineering",active=true},
        new() {id="r1", firstName="Grace",lastName="Hopper",department="Research",active=true},
        new() {id="r2", firstName="Alan",lastName="Turing",department="Research",active=false},
        new() {id="r3", firstName="Katherine",lastName="Johnson",department="Operations",active=true},
        new() {id="r4", firstName="Margaret",lastName="Hamilton",department="Engineering",active=false},
        new() {id="r5", firstName="Donald",lastName="Knuth",department="Design",active=true},
    ];
    public static async Task Run()
    {
        Directory.CreateDirectory(Output);
        App.Current.UnhandledException += (_,e) => { File.AppendAllText(Path.Combine(Output,"unhandled.txt"),e.Exception.ToString()+"\n"); e.Handled=true; };
        try
        {
            if(Environment.GetEnvironmentVariable("WINUI_TABLEVIEW_PERFORMANCE_FIXTURE") is not null){await PerformanceCapture();App.Current.Exit();return;}
            SaveAnimationMetrics();
            var window = App.Current.MainWindow;
            var main = App.Current.MainPage;
            await Task.Delay(600);
            await Capture("sample-app-initial", main);
            var frame = Tree(main).OfType<Frame>().Single(f => f.Name == "rootFrame");
            foreach (var page in new[] { typeof(OverviewPage), typeof(SelectionPage), typeof(EditingPage), typeof(FilteringPage), typeof(ColumnSizingPage) })
            {
                frame.Navigate(page);
                await Task.Delay(350);
                await Capture("sample-" + page.Name, main);
            }
            File.WriteAllText(Path.Combine(Output, "fixture.json"), JsonSerializer.Serialize(Rows, Json));
            // Normalize this comparison fixture to the browser's declared language and accent.
            // The earlier whole-SampleApp captures retain the machine's actual settings.
            var strings=typeof(global::WinUI.TableView.TableView).Assembly.GetType("WinUI.TableView.TableViewLocalizedStrings")!;
            var english=JsonSerializer.Deserialize<Dictionary<string,string>>(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"table-view-english.json")))!;
            foreach(var pair in english) strings.GetProperty(pair.Key,BindingFlags.Public|BindingFlags.Static)?.SetValue(null,pair.Value);
            foreach (var theme in new[] { ElementTheme.Light, ElementTheme.Dark })
            {
                var root = new Grid { Width = 800, Height = 320, RequestedTheme = theme, Background = new SolidColorBrush(theme == ElementTheme.Light ? Microsoft.UI.ColorHelper.FromArgb(255,243,243,243) : Microsoft.UI.ColorHelper.FromArgb(255,32,32,32)) };
                var accent=new SolidColorBrush(theme==ElementTheme.Light ? Microsoft.UI.ColorHelper.FromArgb(255,0,103,192) : Microsoft.UI.ColorHelper.FromArgb(255,76,194,255));
                foreach(var key in new[]{"AccentFillColorDefaultBrush","SystemControlHighlightAccentBrush","TextControlBorderBrushFocused","TableViewRowSelectionIndicatorBrush","TableViewRowSelectionIndicatorPointerOverBrush","TableViewRowSelectionIndicatorPressedBrush","CheckBoxCheckBackgroundFillChecked","CheckBoxCheckBackgroundStrokeChecked","CheckBoxCheckBackgroundFillIndeterminate","CheckBoxCheckBackgroundStrokeIndeterminate"}) {root.Resources[key]=accent;App.Current.Resources[key]=accent;}
                var table = new global::WinUI.TableView.TableView { AutoGenerateColumns = false, ItemsSource = Rows };
                foreach (var spec in new[] { ("firstName", "First Name",160d), ("lastName", "Last Name",160d), ("department", "Department",180d) })
                    table.Columns.Add(new TableViewTextColumn { Header = spec.Item2, Binding = new Binding { Path = new PropertyPath(spec.Item1) }, Width = new GridLength(spec.Item3) });
                table.Columns.Add(new TableViewCheckBoxColumn { Header = "Active", Binding = new Binding { Path = new PropertyPath("active") }, Width = new GridLength(110) });
                table.SelectionChanged += (_,e) => Events.Add(new { kind="SelectionChanged",atMs=Clock.Elapsed.TotalMilliseconds,selected=table.SelectedIndex });
                table.CellSelectionChanged += (_,e) => Events.Add(new {kind="CellSelectionChanged",atMs=Clock.Elapsed.TotalMilliseconds,current=table.CurrentCellSlot});
                root.Children.Add(table);window.Content=root;
                window.AppWindow.ResizeClient(new Windows.Graphics.SizeInt32(1000,400));
                await Task.Delay(850);root.UpdateLayout();
                Records.Add(new {name=$"{theme}-defaults", table.HeaderRowMinHeight,table.RowMinHeight,table.RowHeaderActualWidth,table.RowHeaderMinWidth,table.CellsHorizontalOffset,table.ShowFilterItemsCount,table.AreRowDetailsFrozen,details=table.RowDetailsVisibilityMode.ToString(),grid=table.GridLinesVisibility.ToString(),headerGrid=table.HeaderGridLinesVisibility.ToString(),root.XamlRoot.RasterizationScale});
                await Capture($"{theme}-default",root);
                Invoke(table,"MakeSelection",new TableViewCellSlot(1,0),false,false);
                await Task.Delay(100);await Capture($"{theme}-cell-selected",root);
                table.DeselectAll();table.SelectedItem=Rows[2];await Task.Delay(250);await Capture($"{theme}-row-selected",root);
                table.DeselectAll();var cell=Tree(table).OfType<TableViewCell>().First(c=>c.Slot.Row==0&&c.Slot.Column==0);
                Invoke(cell,"BeginCellEditing",new RoutedEventArgs());await Task.Delay(150);await Capture($"{theme}-editing",root);
                Invoke(table,"EndCellEditing",TableViewEditAction.Cancel,cell);
                Invoke(table,"SetIsEditing",false);
                var header=Tree(table).OfType<TableViewColumnHeader>().First();
                Invoke(header,"DoSort",SortDirection.Ascending,true);await Task.Delay(850);await Capture($"{theme}-sorted",root);
                var options=Tree(header).OfType<Button>().Single(b=>b.Name=="OptionsButton");
                window.AppWindow.ResizeClient(new Windows.Graphics.SizeInt32(1000,900));await Task.Delay(150);
                options.Flyout.ShowAt(options);await Task.Delay(350);
                var popups=VisualTreeHelper.GetOpenPopupsForXamlRoot(root.XamlRoot);
                File.WriteAllText(Path.Combine(Output,$"{theme}-popup-tree.json"),JsonSerializer.Serialize(popups.SelectMany(p=>Tree(p.Child)).OfType<FrameworkElement>().Select(e=>Part(e,e)).ToArray(),Json));
                var presenter=popups.SelectMany(p=>Tree(p.Child)).OfType<FrameworkElement>().Where(e=>e.ActualWidth>10&&e.ActualHeight>10).OrderByDescending(e=>e.ActualWidth*e.ActualHeight).First();
                Records.Add(new{name=$"{theme}-filter",capture="Popup RTB is unsupported; current popup geometry plus own-client PrintWindow",parts=Tree(presenter).OfType<FrameworkElement>().Select(e=>Part(e,presenter)).ToArray()});
                await SaveOwn($"{theme}-filter");options.Flyout.Hide();await Task.Delay(150);
                table.ShowExportOptions=true;
                var corner=Tree(table).OfType<Button>().Single(b=>b.Name=="optionsButton");
                corner.Flyout.ShowAt(corner);await Task.Delay(350);
                popups=VisualTreeHelper.GetOpenPopupsForXamlRoot(root.XamlRoot);
                presenter=popups.SelectMany(p=>Tree(p.Child)).OfType<FrameworkElement>().Where(e=>e.ActualWidth>10&&e.ActualHeight>10).OrderByDescending(e=>e.ActualWidth*e.ActualHeight).First();
                Records.Add(new{name=$"{theme}-corner-menu",capture="Original MenuFlyout visual tree after programmatic ShowAt. Main-client PrintWindow excludes the separate menu HWND and is not a menu pixel reference. No OS input injection",parts=Tree(presenter).OfType<FrameworkElement>().Select(e=>Part(e,presenter)).ToArray()});
                await SaveOwn($"{theme}-corner-menu");corner.Flyout.Hide();table.ShowExportOptions=false;
                window.AppWindow.ResizeClient(new Windows.Graphics.SizeInt32(1000,400));await Task.Delay(150);
                await NativeAnimation(theme.ToString(),table,root);
                table.SelectedIndex=-1;await Task.Delay(100);
                var row=Tree(table).OfType<TableViewRow>().First();
                foreach(var state in new[]{"Normal","PointerOver","Pressed","Selected","PointerOverSelected","PressedSelected"})
                {
                    bool found=VisualStateManager.GoToState(row,state,true);
                    await Task.Delay(200);Records.Add(new{name=$"{theme}-row-state-{state}",stateFound=found});await Capture($"{theme}-row-state-{state}",root);
                }
            }
            File.WriteAllText(Path.Combine(Output,"native.json"),JsonSerializer.Serialize(new{source="Instrumented pinned community SampleApp; original controls and themes unchanged",capture="RenderTargetBitmap static template/geometry captures; explicit VSM states labelled, no OS UI automation. These do not certify Composition present-time animation or physical input parity.",records=Records,events=Events},Json));
            File.WriteAllText(Path.Combine(Output,"complete.json"),JsonSerializer.Serialize(new{completedAt=DateTimeOffset.Now,records=Records.Count}));
        }
        catch(Exception error) { File.WriteAllText(Path.Combine(Output,"error.txt"),error.ToString()); }
        App.Current.Exit();
    }
}
