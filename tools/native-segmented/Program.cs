using System.Diagnostics;
using System.Text.Json;
using CommunityToolkit.WinUI.Controls;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using Windows.Graphics.Imaging;
using Windows.Storage;

namespace SegmentedProbe;

static class Program
{
    public static string Output = "";

    [STAThread]
    static void Main(string[] args)
    {
        Output = Path.GetFullPath(args[0]);
        Directory.CreateDirectory(Output);
        WinRT.ComWrappersSupport.InitializeComWrappers();
        Application.Start(_ =>
        {
            SynchronizationContext.SetSynchronizationContext(
                new Microsoft.UI.Dispatching.DispatcherQueueSynchronizationContext(
                    Microsoft.UI.Dispatching.DispatcherQueue.GetForCurrentThread()));
            new ProbeApplication();
        });
    }
}

public sealed partial class ProbeApplication : Application
{
    readonly StackPanel root = new() { Width = 500, Height = 420, Padding = new Thickness(12), Spacing = 12 };
    Window window = null!;

    public ProbeApplication() => InitializeComponent();

    protected override void OnLaunched(LaunchActivatedEventArgs args)
    {
        window = new Window { Title = "Toolkit Segmented probe", Content = root };
        window.AppWindow.ResizeClient(new(500, 420));
        root.Loaded += async (_, _) => await Run();
        window.Activate();
    }

    static IEnumerable<FrameworkElement> Parts(DependencyObject node)
    {
        if (node is FrameworkElement element) yield return element;
        for (var index = 0; index < VisualTreeHelper.GetChildrenCount(node); index++)
            foreach (var part in Parts(VisualTreeHelper.GetChild(node, index))) yield return part;
    }

    static object Geometry(FrameworkElement element, FrameworkElement relativeTo)
    {
        var point = element.TransformToVisual(relativeTo).TransformPoint(new(0, 0));
        return new { element.Name, point.X, point.Y, element.ActualWidth, element.ActualHeight };
    }

    async Task Capture(StorageFolder folder, string name, FrameworkElement element)
    {
        var bitmap = new RenderTargetBitmap();
        await bitmap.RenderAsync(element);
        var file = await folder.CreateFileAsync(name + ".png", CreationCollisionOption.ReplaceExisting);
        using var stream = await file.OpenAsync(FileAccessMode.ReadWrite);
        var encoder = await BitmapEncoder.CreateAsync(BitmapEncoder.PngEncoderId, stream);
        var pixels = await bitmap.GetPixelsAsync();
        using var reader = Windows.Storage.Streams.DataReader.FromBuffer(pixels);
        var bytes = new byte[pixels.Length];
        reader.ReadBytes(bytes);
        var dpi = 96 * root.XamlRoot.RasterizationScale;
        encoder.SetPixelData(BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied,
            (uint)bitmap.PixelWidth, (uint)bitmap.PixelHeight, dpi, dpi, bytes);
        await encoder.FlushAsync();
    }

    async Task Run()
    {
        try
        {
            root.Resources.MergedDictionaries.Add(new ResourceDictionary {
                Source = new Uri("ms-appx:///CommunityToolkit.WinUI.Controls.Segmented/Segmented/Segmented.xaml")
            });
            var cases = new List<object>();
            var states = new List<object>();
            var folder = await StorageFolder.GetFolderFromPathAsync(Program.Output);
            foreach (var theme in new[] { ElementTheme.Light, ElementTheme.Dark })
            {
                root.RequestedTheme = theme;
                var channel = theme == ElementTheme.Light ? (byte)240 : (byte)32;
                root.Background = new SolidColorBrush(Windows.UI.Color.FromArgb(255, channel, channel, channel));
                root.Children.Clear();
                var controls = new List<(string, Segmented)>();
                foreach (var (style, orientation) in new[] {
                    ("Default", Orientation.Horizontal), ("Pivot", Orientation.Horizontal),
                    ("Button", Orientation.Horizontal), ("Default", Orientation.Vertical)
                })
                {
                    var control = new Segmented { Orientation = orientation, SelectedIndex = 0 };
                    if (style != "Default") control.Style = (Style)root.Resources[style + "SegmentedStyle"];
                    foreach (var (label, glyph) in new[] { ("Day", "\uE8BF"), ("Week", "\uE8C0"), ("Month", "\uE787") })
                        control.Items.Add(new SegmentedItem { Content = label, Icon = new FontIcon { Glyph = glyph } });
                    root.Children.Add(control);
                    controls.Add((style, control));
                }
                root.UpdateLayout();
                await Task.Delay(250);
                foreach (var (style, control) in controls)
                    cases.Add(new {
                        theme = theme.ToString(), style, orientation = control.Orientation.ToString(),
                        control.SelectedIndex, geometry = Geometry(control, root),
                        items = control.Items.Cast<SegmentedItem>().Select(item => new {
                            item.IsSelected, geometry = Geometry(item, control),
                            parts = Parts(item).Where(part => part.Name.Length != 0).Select(part => Geometry(part, item)).ToArray()
                        }).ToArray()
                    });
                await Capture(folder, theme.ToString(), root);

                // Force the source VSM states and sample their actual template transforms.
                // This measures the storyboard, independently of the window's pointer routing.
                var first = (SegmentedItem)controls[0].Item2.Items[0];
                var pill = Parts(first).Single(part => part.Name == "PART_Pill");
                foreach (var state in new[] { "PressedSelected", "PointerOverSelected" })
                {
                    var clock = Stopwatch.StartNew();
                    if (!VisualStateManager.GoToState(first, state, true)) throw new Exception("Missing state " + state);
                    foreach (var wait in new[] { 16, 32, 48, 120 })
                    {
                        await Task.Delay(wait);
                        var transform = (CompositeTransform)pill.RenderTransform;
                        states.Add(new { theme = theme.ToString(), state, elapsedMs = clock.Elapsed.TotalMilliseconds,
                            transform.ScaleX, pill.Opacity });
                    }
                    await Capture(folder, theme + "-" + state, root);
                }
            }
            var result = new { toolkit = typeof(Segmented).Assembly.FullName, winui = typeof(Grid).Assembly.FullName,
                dpr = root.XamlRoot.RasterizationScale, cases, states };
            File.WriteAllText(Path.Combine(Program.Output, "native.json"),
                JsonSerializer.Serialize(result, new JsonSerializerOptions { WriteIndented = true }));
        }
        catch (Exception error)
        {
            File.WriteAllText(Path.Combine(Program.Output, "error.txt"), error.ToString());
        }
        finally { Exit(); }
    }
}
