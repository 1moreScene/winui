// Runs in the community SampleApp against the unmodified NuGet release DLL.
// Programmatic control actions and own-window readback; no desktop automation.
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Data;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using System.Reflection;
using System.Security.Cryptography;
using System.Text.Json;
using Windows.Graphics.Imaging;
using Windows.Storage;

namespace WinUI.TableView.SampleApp;
internal static class GroupingCapture
{
    public sealed class Person
    {
        public string id {get;set;}="";
        public string name {get;set;}="";
        public string department {get;set;}="";
        public double age {get;set;}
        public bool active {get;set;}
    }
    static readonly JsonSerializerOptions Json=new(){WriteIndented=true};
    static readonly List<object> Records=[];
    static string Output=Environment.GetEnvironmentVariable("WINUI_TABLEVIEW_GROUPING_CAPTURE")!;
    static IEnumerable<DependencyObject> Tree(DependencyObject root)
    {
        yield return root;
        for(int i=0;i<VisualTreeHelper.GetChildrenCount(root);i++)foreach(var item in Tree(VisualTreeHelper.GetChild(root,i)))yield return item;
    }
    static object? Invoke(object target,string name,params object[] args)=>target.GetType().GetMethod(name,BindingFlags.Instance|BindingFlags.NonPublic|BindingFlags.Public)!.Invoke(target,args);
    static object Rect(FrameworkElement n,UIElement root)
    {
        var p=n.TransformToVisual(root).TransformPoint(new Windows.Foundation.Point());
        return new{x=p.X,y=p.Y,width=n.ActualWidth,height=n.ActualHeight};
    }
    static async Task Capture(string name,Grid root,global::WinUI.TableView.TableView table)
    {
        root.UpdateLayout();await Task.Delay(350);
        var image=new RenderTargetBitmap();await image.RenderAsync(root);
        var bytes=await image.GetPixelsAsync();
        var folder=await StorageFolder.GetFolderFromPathAsync(Output);
        var file=await folder.CreateFileAsync(name+".png",CreationCollisionOption.ReplaceExisting);
        using(var stream=await file.OpenAsync(FileAccessMode.ReadWrite)){
            var encoder=await BitmapEncoder.CreateAsync(BitmapEncoder.PngEncoderId,stream);
            var data=new byte[bytes.Length];using(var reader=Windows.Storage.Streams.DataReader.FromBuffer(bytes))reader.ReadBytes(data);
            encoder.SetPixelData(BitmapPixelFormat.Bgra8,BitmapAlphaMode.Premultiplied,(uint)image.PixelWidth,(uint)image.PixelHeight,96,96,data);await encoder.FlushAsync();
        }
        var viewer=Tree(table).OfType<ScrollViewer>().OrderByDescending(v=>v.ViewportWidth*v.ViewportHeight).First();
        var groups=table.CollectionView.CollectionGroups?.Select(g=>(TableViewGroupInfo)((ICollectionViewGroup)g).Group).ToArray()??[];
        Records.Add(new{name,scale=root.XamlRoot.RasterizationScale,sizeDip=new[]{root.ActualWidth,root.ActualHeight},pixels=new[]{image.PixelWidth,image.PixelHeight},
            offset=new[]{viewer.HorizontalOffset,viewer.VerticalOffset},visibleItems=table.Items.Cast<Person>().Select(p=>p.id).ToArray(),
            groups=groups.Select(g=>new{g.Key,g.Count,g.IsExpanded,level=g.GetType().GetProperty("Level",BindingFlags.Instance|BindingFlags.NonPublic)!.GetValue(g)}).ToArray(),
            headers=Tree(table).OfType<TableViewGroupHeaderRow>().Select(n=>new{rect=Rect(n,root),key=(n.Content as TableViewGroupInfo)?.Key,parts=Tree(n).OfType<FrameworkElement>().Where(p=>p.Name is "ExpandCollapseButton" or "ContentPresenter" or "IndentPlaceholder").Select(p=>new{p.Name,rect=Rect(p,root)}).ToArray()}).ToArray(),
            cells=Tree(table).OfType<TableViewCell>().Select(n=>new{rect=Rect(n,root),column=n.Column?.Header,content=(n.Row?.Content as Person)?.id}).ToArray()});
    }
    static IEnumerable<TableViewGroupInfo> Groups(global::WinUI.TableView.TableView table)=>table.CollectionView.CollectionGroups?.Select(g=>(TableViewGroupInfo)((ICollectionViewGroup)g).Group)??[];
    static void Group(global::WinUI.TableView.TableView table,string header)
    {
        var column=Tree(table).OfType<TableViewColumnHeader>().Single(h=>Equals(h.Column?.Header,header));Invoke(column,"Group");
    }
    public static async Task Run(MainWindow window)
    {
        Directory.CreateDirectory(Output);
        try{
            await ExampleViewModel.InitializeItemsAsync();
            var original=new Pages.GroupingPage();window.Content=original;await Task.Delay(1200);
            File.WriteAllText(Path.Combine(Output,"sample-page.json"),JsonSerializer.Serialize(new{page=original.GetType().FullName,tableCount=Tree(original).OfType<global::WinUI.TableView.TableView>().Count()},Json));
            string[] names=["Adele Vance","Alex Wilber","Megan Bowen","Diego Siciliani","李明","王芳"],departments=["Engineering","Design","Operations","Research"];
            var rows=Enumerable.Range(0,24).Select(i=>new Person{id=$"person-{i}",name=names[i%6]+(i<6?"":$" {i+1}"),department=departments[i%4],age=22+i%37,active=i%3!=0}).ToArray();
            foreach(var theme in new[]{ElementTheme.Light,ElementTheme.Dark}){
                var root=new Grid{Width=776.8,Height=360,RequestedTheme=theme,Background=new SolidColorBrush(theme==ElementTheme.Light?Microsoft.UI.ColorHelper.FromArgb(255,243,243,243):Microsoft.UI.ColorHelper.FromArgb(255,32,32,32))};
                var accent=new SolidColorBrush(theme==ElementTheme.Light ? Microsoft.UI.ColorHelper.FromArgb(255,0,103,192) : Microsoft.UI.ColorHelper.FromArgb(255,76,194,255));
                foreach(var key in new[]{"AccentFillColorDefaultBrush","SystemControlHighlightAccentBrush","TextControlBorderBrushFocused","TableViewRowSelectionIndicatorBrush","TableViewRowSelectionIndicatorPointerOverBrush","TableViewRowSelectionIndicatorPressedBrush","CheckBoxCheckBackgroundFillChecked","CheckBoxCheckBackgroundStrokeChecked","CheckBoxCheckBackgroundFillIndeterminate","CheckBoxCheckBackgroundStrokeIndeterminate"}) {root.Resources[key]=accent;App.Current.Resources[key]=accent;}
                var table=new global::WinUI.TableView.TableView{AutoGenerateColumns=false,ItemsSource=rows,RowHeight=40,HeaderRowHeight=32,FrozenColumnCount=1};
                foreach(var (field,header,width,kind) in new[]{("name","Name",180.0,0),("department","Department",150.0,0),("age","Age",90.0,1),("active","Active",95.0,2)}){
                    TableViewBoundColumn c=kind==1?new TableViewNumberColumn():kind==2?new TableViewCheckBoxColumn():new TableViewTextColumn();c.Header=header;c.Width=new GridLength(width);c.Binding=new Binding{Path=new PropertyPath(field)};table.Columns.Add(c);
                }
                root.Children.Add(table);window.Content=root;window.AppWindow.ResizeClient(new Windows.Graphics.SizeInt32(971,450));await Task.Delay(900);
                Invoke(Tree(table).OfType<TableViewColumnHeader>().Single(h=>Equals(h.Column?.Header,"Age")),"DoSort",SortDirection.Ascending,true);
                Group(table,"Department");await Capture(theme+"-collapsed",root,table);
                table.DefaultGroupState=TableViewGroupState.Expanded;await Capture(theme+"-expanded",root,table);
                table.AreStickyGroupHeadersEnabled=true;
                var viewer=Tree(table).OfType<ScrollViewer>().OrderByDescending(v=>v.ViewportWidth*v.ViewportHeight).First();viewer.ChangeView(null,90,null,true);await Capture(theme+"-sticky",root,table);
                viewer.ChangeView(null,0,null,true);await Task.Delay(100);Group(table,"Active");await Capture(theme+"-multi",root,table);
                Groups(table).First().IsExpanded=false;await Capture(theme+"-multi-collapsed",root,table);
                table.UngroupAll();await Task.Delay(100);Group(table,"Department");
                var description=table.GroupDescriptions.First();description.SortMode=GroupSortMode.Count;description.Direction=SortDirection.Descending;table.RefreshGrouping();await Capture(theme+"-count-order",root,table);
            }
            var assembly=typeof(global::WinUI.TableView.TableView).Assembly;
            var winui=typeof(Grid).Assembly;
            File.WriteAllText(Path.Combine(Output,"native.json"),JsonSerializer.Serialize(new{kind="Community SampleApp consuming published NuGet WinUI.TableView 1.5.1",assembly=assembly.Location,assemblySha256=Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(assembly.Location))).ToLowerInvariant(),winui=winui.Location,winuiSha256=Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(winui.Location))).ToLowerInvariant(),records=Records},Json));
            File.WriteAllText(Path.Combine(Output,"complete.json"),JsonSerializer.Serialize(new{count=Records.Count,completedAt=DateTimeOffset.Now}));
        }catch(Exception e){File.WriteAllText(Path.Combine(Output,"error.txt"),e.ToString());}
        App.Current.Exit();
    }
}

