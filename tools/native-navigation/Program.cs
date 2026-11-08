using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using Microsoft.UI.Xaml.Hosting;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Text.Json;
using Windows.Graphics;
using Windows.Graphics.Imaging;
using Windows.Storage;
using Windows.UI;

namespace NavigationProbe;
class Program {
    public static bool Buttons;
    public static bool NavigationMotion;
    public static bool Effects;
    public static bool Materials;
    public static bool Foundation;
    public static bool AcceptTiming;
    public static bool SelectionInput;
    public static bool TextScroll;
    public static bool Progress;
    public static bool BasicNext;
    public static bool FiveControls;
    public static bool IconControls;
    public static bool AnimatedIcons;
    public static bool Vectors;
    public static bool Overlays;
    public static bool OverlayPresentation;
    public static bool OverlayControls;
    public static bool TextCoverage;
    public static bool CompactControls;
    public static bool CompactDetails;
    public static bool Collections;
    public static bool AdvancedCollections;
    public static bool ComposedControls;
    public static bool ComposedFormatting;
    public static bool ChoiceInteraction;
    public static bool ComboFaceplate;
    public static bool PickerControls;
    public static bool PickerDefaults;
    public static string Output = Path.GetFullPath("out/navigation-native");
    [System.Runtime.InteropServices.DllImport("user32.dll")] static extern bool SetProcessDpiAwarenessContext(IntPtr value);
    [STAThread] static void Main(string[] args) {
        Buttons=args.Contains("--buttons");
        NavigationMotion=args.Contains("--navigation-motion");
        if(NavigationMotion)SetProcessDpiAwarenessContext(new IntPtr(-4));
        Effects=args.Contains("--effects");
        Materials=args.Contains("--materials");
        Foundation=args.Contains("--foundation");
        AcceptTiming=args.Contains("--accept-timing");
        SelectionInput=args.Contains("--selection-input");
        TextScroll=args.Contains("--text-scroll");
        Progress=args.Contains("--progress");
        BasicNext=args.Contains("--basic-next");
        FiveControls=args.Contains("--five-controls");
        IconControls=args.Contains("--icons");
        AnimatedIcons=args.Contains("--animated-icons");
        Vectors=args.Contains("--vectors");
        Overlays=args.Contains("--overlays");
        OverlayPresentation=args.Contains("--overlay-presentation");
        OverlayControls=args.Contains("--overlay-controls");
        TextCoverage=args.Contains("--text-coverage");
        CompactDetails=args.Contains("--compact-details");
        Collections=args.Contains("--collections");
        AdvancedCollections=args.Contains("--collections-advanced");
        ChoiceInteraction=args.Contains("--choice-interaction");
        ComboFaceplate=args.Contains("--combo-faceplate");
        PickerControls=args.Contains("--picker-controls");
        PickerDefaults=args.Contains("--picker-defaults");
        ComposedControls=args.Contains("--composed-controls")||ChoiceInteraction||ComboFaceplate||PickerControls||PickerDefaults;
        ComposedFormatting=args.Contains("--composed-format");
        CompactControls=args.Contains("--compact-controls")||CompactDetails;
        if(ComposedFormatting||ComposedControls||Collections||OverlayControls||TextCoverage||OverlayPresentation||CompactControls||Overlays||Effects||Materials||Progress||AnimatedIcons||Vectors||((BasicNext||FiveControls)&&args.Contains("--per-monitor-dpi")))SetProcessDpiAwarenessContext(new IntPtr(-4));
        if(args.Length>0) Output=Path.GetFullPath(args[0]);
        Directory.CreateDirectory(Output);
        WinRT.ComWrappersSupport.InitializeComWrappers();
        try{Application.Start(_=> { SynchronizationContext.SetSynchronizationContext(new Microsoft.UI.Dispatching.DispatcherQueueSynchronizationContext(Microsoft.UI.Dispatching.DispatcherQueue.GetForCurrentThread())); new ProbeApplication(); });}catch(Exception e){File.WriteAllText(Path.Combine(Output,"startup-error.txt"),e.ToString());}
    }
}
public sealed partial class ProbeApplication:Application {
    Window? window;
    Grid root=new(){ Width=1000,Height=500 };
    NavigationView nav=null!;
    readonly List<object> records=[];
    readonly List<object> events=[];
    readonly Dictionary<string,object> palettes=[];
    readonly List<object> animationSamples=[];
    async Task Animation(){
        Create(ElementTheme.Light,NavigationViewPaneDisplayMode.Left);await Task.Delay(650);
        var captured=new List<(string Name,byte[] Pixels,uint Width,uint Height)>();
        var clock=System.Diagnostics.Stopwatch.StartNew();nav.SelectedItem=nav.MenuItems[2];
        foreach(var target in new[]{0,50,100,160,200,260,400,600,750}){
            var delay=target-(int)clock.ElapsedMilliseconds;if(delay>0)await Task.Delay(delay);
            var at=clock.Elapsed.TotalMilliseconds;var bitmap=new RenderTargetBitmap();
            await bitmap.RenderAsync(root,1000,500);var bytes=(await bitmap.GetPixelsAsync()).ToArray();
            var name=$"Light-indicator-{target}";
            animationSamples.Add(new{name,requestedMs=target,actualStartMs=at,actualEndMs=clock.Elapsed.TotalMilliseconds});
            captured.Add((name,bytes,(uint)bitmap.PixelWidth,(uint)bitmap.PixelHeight));
        }
        // Encode only after sampling; visual-tree traversal/PNG encoding distorted timestamps.
        var folder=await StorageFolder.GetFolderFromPathAsync(Program.Output);
        foreach(var sample in captured){
            var file=await folder.CreateFileAsync(sample.Name+".png",CreationCollisionOption.ReplaceExisting);
            using var stream=await file.OpenAsync(FileAccessMode.ReadWrite);
            var encoder=await BitmapEncoder.CreateAsync(BitmapEncoder.PngEncoderId,stream);
            encoder.SetPixelData(BitmapPixelFormat.Bgra8,BitmapAlphaMode.Premultiplied,sample.Width,sample.Height,96,96,sample.Pixels);await encoder.FlushAsync();
        }
    }
    public ProbeApplication(){InitializeComponent();UnhandledException+=(_,e)=>{File.WriteAllText(Path.Combine(Program.Output,"error.txt"),e.Exception.ToString());e.Handled=true;Exit();};}
    protected override void OnLaunched(LaunchActivatedEventArgs args){
        window=new Window{Title="WinUI NavigationView parity probe"};window.Content=root;
        window.AppWindow.ResizeClient(new SizeInt32(1000,500));
        root.Loaded+=async(_,_)=>await Run();window.Activate();
    }
    static SolidColorBrush Brush(byte r,byte g,byte b,byte a=255)=>new(Color.FromArgb(a,r,g,b));
    NavigationView Create(ElementTheme theme,NavigationViewPaneDisplayMode mode,bool hierarchy=false,bool footer=false){
        root.Children.Clear();root.RequestedTheme=theme;root.Background=theme==ElementTheme.Light?Brush(243,243,243):Brush(32,32,32);
        nav=new NavigationView{PaneDisplayMode=mode,Header="Sample Page 1",IsBackButtonVisible=NavigationViewBackButtonVisible.Visible,IsBackEnabled=false};
        root.Children.Add(nav);
        nav.Resources["NavigationViewExpandedPaneBackground"]=new AcrylicBrush{TintColor=theme==ElementTheme.Light?Color.FromArgb(255,255,255,255):Color.FromArgb(255,31,31,31),TintOpacity=.8,FallbackColor=theme==ElementTheme.Light?Color.FromArgb(255,242,242,242):Color.FromArgb(255,31,31,31)};
        var labels=hierarchy?new[]{"Home","Account","Document options"}:footer?new[]{"Browse","Track an Order","Order History"}:new[]{"Menu Item1","Menu Item2","Menu Item3","Menu Item4"};
        var symbols=hierarchy?new[]{Symbol.Home,Symbol.Contact,Symbol.Page2}:footer?new[]{Symbol.Library,Symbol.Map,Symbol.Tag}:new[]{Symbol.Play,Symbol.Save,Symbol.Refresh,Symbol.Download};
        for(int i=0;i<labels.Length;i++)nav.MenuItems.Add(new NavigationViewItem{Content=labels[i],Tag=$"page{i+1}",Icon=new SymbolIcon(symbols[i])});
        if(hierarchy){
            var account=(NavigationViewItem)nav.MenuItems[1];account.MenuItems.Add(new NavigationViewItem{Content="Mail",Tag="page3",Icon=new SymbolIcon(Symbol.Mail)});account.MenuItems.Add(new NavigationViewItem{Content="Calendar",Tag="page4",Icon=new SymbolIcon(Symbol.Calendar)});
            var documents=(NavigationViewItem)nav.MenuItems[2];documents.SelectsOnInvoked=false;documents.MenuItems.Add(new NavigationViewItem{Content="Create new",Tag="page5",Icon=new SymbolIcon(Symbol.NewFolder)});documents.MenuItems.Add(new NavigationViewItem{Content="Upload file",Tag="page6",Icon=new SymbolIcon(Symbol.OpenLocal)});
        }
        if(footer){nav.IsSettingsVisible=false;foreach(var pair in new[]{("Account",Symbol.Contact),("Your Cart",Symbol.Shop),("Help",Symbol.Help)})nav.FooterMenuItems.Add(new NavigationViewItem{Content=pair.Item1,Icon=new SymbolIcon(pair.Item2)});}
        nav.SelectedItem=nav.MenuItems[0];
        nav.Content=new TextBlock{Text="This is the content for Sample Page 1.",FontSize=14};
        nav.ItemInvoked+=(_,e)=>events.Add(new{kind="itemInvoked",text=e.InvokedItem?.ToString(),time=Environment.TickCount64});
        nav.SelectionChanged+=(_,e)=>events.Add(new{kind="selectionChanged",text=(e.SelectedItem as NavigationViewItem)?.Content?.ToString(),time=Environment.TickCount64});
        nav.PaneOpening+=(_,_)=>events.Add(new{kind="paneOpening",time=Environment.TickCount64});nav.PaneOpened+=(_,_)=>events.Add(new{kind="paneOpened",time=Environment.TickCount64});
        nav.PaneClosing+=(_,_)=>events.Add(new{kind="paneClosing",time=Environment.TickCount64});nav.PaneClosed+=(_,_)=>events.Add(new{kind="paneClosed",time=Environment.TickCount64});
        return nav;
    }
    async Task Run(){
        if(Program.NavigationMotion){await RunNavigationMotion();return;}
        if(Program.PickerDefaults){RunPickerDefaults();return;}
        if(Program.PickerControls){await RunPickerControls();return;}
        if(Program.ComboFaceplate){await RunComboFaceplate();return;}
        if(Program.ChoiceInteraction){await RunChoiceInteraction();return;}
        if(Program.ComposedFormatting){await RunComposedFormatting();return;}
        if(Program.ComposedControls){await RunComposedControls();return;}
        if(Program.Collections){await RunCollections();return;}
        if(Program.AdvancedCollections){await RunCollectionsAdvanced();return;}
        if(Program.OverlayControls){await RunOverlayControls();return;}
        if(Program.TextCoverage){await RunTextCoverage();return;}
        if(Program.CompactControls){await RunCompactControls();return;}
        if(Program.OverlayPresentation){await RunOverlayPresentation();return;}
        if(Program.Overlays){await RunOverlays();return;}
        if(Program.AcceptTiming){await RunAcceptTiming();return;}
        if(Program.Vectors){await RunVectors();return;}
        if(Program.AnimatedIcons){await RunAnimatedIcons();return;}
        if(Program.IconControls){await RunIcons();return;}
        if(Program.FiveControls){await RunFiveControls();return;}
        if(Program.BasicNext){await RunBasicNext();return;}
        if(Program.Progress){await RunProgress();return;}
        if(Program.TextScroll){await RunTextScroll();return;}
        if(Program.SelectionInput){await RunSelectionInput();return;}
        if(Program.Foundation){await RunFoundation();return;}
        if(Program.Materials){await RunMaterials();return;}
        if(Program.Effects){await RunEffects();return;}
        if(Program.Buttons){await RunButtons();return;}
        try{
            File.WriteAllText(Path.Combine(Program.Output,"environment.json"),JsonSerializer.Serialize(new{sdk="Microsoft.WindowsAppSDK 2.5.4-experimental / WinUI 2.3.10-experimental",os=Environment.OSVersion.ToString(),dpi=root.XamlRoot.RasterizationScale,font="Segoe UI",width=1000,height=500,assembly=typeof(NavigationView).Assembly.Location},new JsonSerializerOptions{WriteIndented=true}));
            foreach(var theme in new[]{ElementTheme.Light,ElementTheme.Dark}){
                foreach(var mode in new[]{NavigationViewPaneDisplayMode.Left,NavigationViewPaneDisplayMode.Top,NavigationViewPaneDisplayMode.LeftCompact,NavigationViewPaneDisplayMode.LeftMinimal}){
                    Create(theme,mode);await Task.Delay(650);if(mode==NavigationViewPaneDisplayMode.Left)await Palette(theme);await Capture($"{theme}-{mode}");
                    if(mode==NavigationViewPaneDisplayMode.LeftCompact||mode==NavigationViewPaneDisplayMode.LeftMinimal){nav.IsPaneOpen=true;await Task.Delay(450);await Capture($"{theme}-{mode}-open");}
                }
            }
            Create(ElementTheme.Light,NavigationViewPaneDisplayMode.Left,true);await Task.Delay(650);((NavigationViewItem)nav.MenuItems[1]).IsExpanded=true;await Task.Delay(400);await Capture("Light-hierarchy");
            Create(ElementTheme.Light,NavigationViewPaneDisplayMode.Top,false,true);await Task.Delay(650);await Capture("Light-footer-top");
            Create(ElementTheme.Light,NavigationViewPaneDisplayMode.Top);nav.Width=360;nav.HorizontalAlignment=HorizontalAlignment.Left;await Task.Delay(650);await Capture("Light-top-overflow");
            foreach(var number in Enumerable.Range(1,7)){
                Create(ElementTheme.Light,NavigationViewPaneDisplayMode.Left);nav.Header="Sample Page "+number;
                var source=System.Xml.Linq.XDocument.Load(Path.Combine(AppContext.BaseDirectory,"GalleryPages",$"SamplePage{number}.xaml"));
                source.Root!.Attribute(System.Xml.Linq.XName.Get("Class","http://schemas.microsoft.com/winfx/2006/xaml"))?.Remove();
                nav.Content=Microsoft.UI.Xaml.Markup.XamlReader.Load(source.ToString());await Task.Delay(650);await Capture($"Light-content-{number}");
            }
            await Animation();
            File.WriteAllText(Path.Combine(Program.Output,"metrics.json"),JsonSerializer.Serialize(records,new JsonSerializerOptions{WriteIndented=true}));
            File.WriteAllText(Path.Combine(Program.Output,"events.json"),JsonSerializer.Serialize(events,new JsonSerializerOptions{WriteIndented=true}));
            File.WriteAllText(Path.Combine(Program.Output,"palettes.json"),JsonSerializer.Serialize(palettes,new JsonSerializerOptions{WriteIndented=true}));
            File.WriteAllText(Path.Combine(Program.Output,"animation-times.json"),JsonSerializer.Serialize(animationSamples,new JsonSerializerOptions{WriteIndented=true}));
            File.WriteAllText(Path.Combine(Program.Output,"complete.json"),"{\"complete\":true}");
            // Keep a representative native window available for real input and WGC inspection.
            Create(ElementTheme.Light,NavigationViewPaneDisplayMode.Left);
        }catch(Exception e){File.WriteAllText(Path.Combine(Program.Output,"error.txt"),e.ToString());}
    }
    object Rect(FrameworkElement e){var p=e.TransformToVisual(root).TransformPoint(new Windows.Foundation.Point());return new{x=p.X,y=p.Y,width=e.ActualWidth,height=e.ActualHeight};}
    object? Describe(Brush? brush)=>brush switch{
        SolidColorBrush s=>new{kind="solid",color=$"#{s.Color.R:X2}{s.Color.G:X2}{s.Color.B:X2}{s.Color.A:X2}",opacity=s.Opacity},
        AcrylicBrush a=>new{kind="acrylic",tint=$"#{a.TintColor.R:X2}{a.TintColor.G:X2}{a.TintColor.B:X2}",tintOpacity=a.TintOpacity,luminosityOpacity=a.TintLuminosityOpacity,fallback=$"#{a.FallbackColor.R:X2}{a.FallbackColor.G:X2}{a.FallbackColor.B:X2}"},_=>null};
    async Task Palette(ElementTheme theme){
        var panel=new StackPanel{Width=0,Height=0};root.Children.Add(panel);var brushes=new Dictionary<string,Border>();
        foreach(var key in new[]{"TextFillColorPrimaryBrush","TextFillColorSecondaryBrush","TextFillColorDisabledBrush","SubtleFillColorSecondaryBrush","SubtleFillColorTertiaryBrush","DividerStrokeColorDefaultBrush","CardStrokeColorDefaultBrush","LayerFillColorDefaultBrush","AcrylicInAppFillColorDefaultBrush","AccentFillColorDefaultBrush"}){
            var border=(Border)Microsoft.UI.Xaml.Markup.XamlReader.Load("<Border xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\" Background=\"{ThemeResource "+key+"}\" />");panel.Children.Add(border);brushes[key]=border;
        }
        await Task.Delay(60);palettes[theme.ToString()]=brushes.ToDictionary(pair=>pair.Key,pair=>Describe(pair.Value.Background));root.Children.Remove(panel);
    }
    IEnumerable<FrameworkElement> Tree(DependencyObject node){if(node is FrameworkElement f)yield return f;for(int i=0;i<VisualTreeHelper.GetChildrenCount(node);i++)foreach(var child in Tree(VisualTreeHelper.GetChild(node,i)))yield return child;}
    async Task Capture(string name){
        if(nav.SettingsItem is NavigationViewItem settings)settings.Content="Settings";
        root.UpdateLayout();var parts=Tree(nav).Where(e=>e.Visibility==Visibility.Visible&&e.ActualWidth>0&&e.ActualHeight>0).Select(e=>new{name=e.Name,type=e.GetType().Name,text=(e as TextBlock)?.Text??(e as ContentPresenter)?.Content?.ToString()??(e as NavigationViewItem)?.Content?.ToString(),bounds=Rect(e),background=Describe((e as Panel)?.Background??(e as Border)?.Background??(e as Control)?.Background),foreground=Describe((e as TextBlock)?.Foreground??(e as Control)?.Foreground),font=(e as TextBlock)?.FontFamily.Source,fontSize=(e as TextBlock)?.FontSize}).ToArray();
        records.Add(new{name,displayMode=nav.DisplayMode.ToString(),isPaneOpen=nav.IsPaneOpen,parts});
        var bitmap=new RenderTargetBitmap();await bitmap.RenderAsync(root,1000,500);var bytes=(await bitmap.GetPixelsAsync()).ToArray();
        var folder=await StorageFolder.GetFolderFromPathAsync(Program.Output);var file=await folder.CreateFileAsync(name+".png",CreationCollisionOption.ReplaceExisting);
        using var stream=await file.OpenAsync(FileAccessMode.ReadWrite);var encoder=await BitmapEncoder.CreateAsync(BitmapEncoder.PngEncoderId,stream);encoder.SetPixelData(BitmapPixelFormat.Bgra8,BitmapAlphaMode.Premultiplied,(uint)bitmap.PixelWidth,(uint)bitmap.PixelHeight,96,96,bytes);await encoder.FlushAsync();
    }
}
