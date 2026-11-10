import{An as e,Dn as t,E as n,En as r,Fr as i,Ft as a,H as o,It as s,J as c,Jt as l,O as u,Or as d,Rr as f,Wt as p,Z as m,a as h,cn as g,cr as _,ct as v,en as y,f as b,g as x,i as S,jn as C,kn as w,l as T,li as E,nr as D,nt as O,oi as k,pi as ee,r as A,sn as j,sr as te,t as M,u as ne,v as N,wn as re,zr as P}from"./GalleryControls-jbXHT3zS.js";import{t as F}from"./SourceCode-C2xz3uBh.js";import{i as I,r as L}from"./ButtonPage-Cv9H35SX.js";var R=ee(),z={FlowLayoutVirtualization:{title:`Virtualize a wrapping collection with FlowLayout`,xaml:`<ScrollViewer Width="520" Height="320"
              HorizontalScrollMode="Disabled"
              VerticalScrollMode="Enabled">
    <ItemsRepeater ItemsSource="{x:Bind FlowLayoutItems}"
                   ItemTemplate="{StaticResource FlowItemTemplate}">
        <ItemsRepeater.Layout>
            <FlowLayout
                Orientation="$(Orientation)"
                LineAlignment="$(LineAlignment)"
                MinItemSpacing="$(MinItemSpacing)"
                LineSpacing="$(LineSpacing)"/>
        </ItemsRepeater.Layout>
    </ItemsRepeater>
</ScrollViewer>

<DataTemplate x:Key="FlowItemTemplate" x:DataType="local:FlowLayoutItem">
    <Border Width="96" Height="64">
        <TextBlock Text="{x:Bind Label}"/>
    </Border>
</DataTemplate>`,csharp:`public IReadOnlyList<FlowLayoutItem> FlowLayoutItems { get; } = Enumerable.Range(1, 500)
    .Select(index => new FlowLayoutItem($"Item {index}"))
    .ToList();

public sealed record FlowLayoutItem(string Label);`,source:`WinUIGallery/Samples/ItemsRepeater/FlowLayoutVirtualization.txt`,runtimeXaml:`<StackPanel xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:ns1="http://schemas.microsoft.com/winfx/2006/xaml" Spacing="8">
                <TextBlock Text="Scroll through 500 items. ItemsRepeater creates and recycles only the elements needed near the viewport." TextWrapping="Wrap" />
                <ScrollViewer ns1:Name="FlowScrollViewer" Width="520" Height="320" HorizontalAlignment="Left" HorizontalScrollBarVisibility="Disabled" HorizontalScrollMode="Disabled" IsHorizontalScrollChainingEnabled="False" IsVerticalScrollChainingEnabled="False" VerticalScrollBarVisibility="Auto" VerticalScrollMode="Enabled">
                    <ItemsRepeater ns1:Name="FlowRepeater" ElementClearing="FlowRepeater_ElementClearing" ElementPrepared="FlowRepeater_ElementPrepared" HorizontalCacheLength="0" ItemTemplate="{StaticResource FlowItemTemplate}" ItemsSource="{x:Bind FlowLayoutItems}" VerticalCacheLength="0">
                        <ItemsRepeater.Layout>
                            <FlowLayout ns1:Name="FlowLayout1" LineAlignment="Start" LineSpacing="8" MinItemSpacing="8" />
                        </ItemsRepeater.Layout>
                    </ItemsRepeater>
                </ScrollViewer>
                <TextBlock ns1:Name="RealizedCountText" AutomationProperties.LiveSetting="Polite" Text="Realized elements: 0 of 500" />
            </StackPanel>

            `,optionsXaml:`<ControlExample.Options xmlns="using:WinUIGallery.Controls" xmlns:ns1="http://schemas.microsoft.com/winfx/2006/xaml/presentation">
                <ns1:StackPanel Spacing="12">
                    <ns1:RadioButtons AutomationProperties.AutomationId="FlowLayoutOrientation" AutomationProperties.Name="FlowLayout orientation" Header="Orientation" SelectionChanged="OrientationButtons_SelectionChanged">
                        <ns1:RadioButton AutomationProperties.AutomationId="FlowLayoutHorizontal" AutomationProperties.Name="Horizontal flow" Content="Horizontal" IsChecked="True" Tag="Horizontal" />
                        <ns1:RadioButton AutomationProperties.AutomationId="FlowLayoutVertical" AutomationProperties.Name="Vertical flow" Content="Vertical" Tag="Vertical" />
                    </ns1:RadioButtons>
                    <ns1:ComboBox AutomationProperties.AutomationId="FlowLayoutLineAlignment" AutomationProperties.Name="Line alignment" Header="LineAlignment" SelectedIndex="0" SelectionChanged="LineAlignmentComboBox_SelectionChanged">
                        <ns1:ComboBoxItem Content="Start" Tag="Start" />
                        <ns1:ComboBoxItem Content="Center" Tag="Center" />
                        <ns1:ComboBoxItem Content="Space between" Tag="SpaceBetween" />
                        <ns1:ComboBoxItem Content="Space evenly" Tag="SpaceEvenly" />
                    </ns1:ComboBox>
                    <ns1:Slider AutomationProperties.AutomationId="FlowLayoutItemSpacing" AutomationProperties.Name="Minimum item spacing" Header="MinItemSpacing" Maximum="32" SnapsTo="Ticks" StepFrequency="2" TickFrequency="2" Value="8" ValueChanged="ItemSpacingSlider_ValueChanged" />
                    <ns1:Slider AutomationProperties.AutomationId="FlowLayoutLineSpacing" AutomationProperties.Name="Line spacing" Header="LineSpacing" Maximum="32" SnapsTo="Ticks" StepFrequency="2" TickFrequency="2" Value="8" ValueChanged="LineSpacingSlider_ValueChanged" />
                </ns1:StackPanel>
            </ControlExample.Options>

            `,pageSource:`WinUIGallery/Samples/ItemsRepeater/ItemsRepeaterPage.xaml`},ItemsRepeaterAnimatedScrollingContentDisplay:{title:`Animated Scrolling and Content Display`,xaml:`<!-- XAML Code -->

<!-- The below code shows the XAML for the ItemsRepeater as well as the
color-changing rectangle besides it. -->

<Grid>
    <Grid.ColumnDefinitions>
        <ColumnDefinition Width="1*"/>
        <ColumnDefinition Width="1*"/>
    </Grid.ColumnDefinitions>

    <ScrollViewer x:Name="Animated_ScrollViewer" 
                    Grid.Column="0"
                    Height="175"
                    Width="250"
                    ViewChanging="Animated_ScrollViewer_ViewChanging">
        <ItemsRepeater x:Name="animatedScrollRepeater" >
            <ItemsRepeater.ItemTemplate>
                <DataTemplate x:DataType="x:String">
                    <Button Content="{x:Bind}"
                            Background="{x:Bind}"
                            Click="Animated_GotItem" 
                            GotFocus="Animated_GotItem" 
                            HorizontalAlignment="Stretch"
                            Foreground="{ThemeResource ButtonForeground}"/>
                </DataTemplate>
            </ItemsRepeater.ItemTemplate>
        </ItemsRepeater>
    </ScrollViewer>

    <Rectangle x:Name="colorRectangle"
                Grid.Column="1"
                Stroke="Black"
                Height="150"
                Width="150"
                Margin="10,0,0,0"/>
</Grid>`,csharp:`// C# Code

// Initialization code

private double AnimatedBtnHeight;
private Microsoft.UI.Xaml.Thickness AnimatedBtnMargin;

private void InitializeData()
{

    IList<string> colors = new List<String>()
    {
        "Blue",
        "BlueViolet",
        "Crimson",
        "DarkCyan",
        "DarkGoldenrod",
        "DarkMagenta",
        "DarkOliveGreen",
        "DarkRed",
        "DarkSlateBlue",
        "DeepPink",
        "IndianRed",
        "MediumSlateBlue",
        "Maroon",
        "MidnightBlue",
        "Peru",
        "SaddleBrown",
        "SteelBlue",
        "OrangeRed",
        "Firebrick",
        "DarkKhaki"
    };

    animatedScrollRepeater.ItemsSource = colors;
    animatedScrollRepeater.ElementPrepared += OnElementPrepared;
}

// Animation code

private void Animated_GotItem(object sender, RoutedEventArgs e)
{
    if (sender is not Button senderBtn)
    {
        return;
    }

    // When the clicked item has been recieved, bring it to the middle of the viewport.
    senderBtn.StartBringIntoView(new BringIntoViewOptions()
    {
        VerticalAlignmentRatio = 0.5,
        AnimationDesired = true,
    });

    // Update corresponding rectangle with selected color
    colorRectangle.Fill = senderBtn.Background;
}

/* This function occurs each time an element is made ready for use.
* This is necessary for virtualization. */
private void OnElementPrepared(Microsoft.UI.Xaml.Controls.ItemsRepeater sender, 
                               Microsoft.UI.Xaml.Controls.ItemsRepeaterElementPreparedEventArgs args)
{
    var item = ElementCompositionPreview.GetElementVisual(args.Element);
    var svVisual = ElementCompositionPreview.GetElementVisual(Animated_ScrollViewer);
    var scrollProperties = ElementCompositionPreview.GetScrollViewerManipulationPropertySet(Animated_ScrollViewer);

    var scaleExpresion = scrollProperties.Compositor.CreateExpressionAnimation();
    scaleExpresion.SetReferenceParameter("svVisual", svVisual);
    scaleExpresion.SetReferenceParameter("scrollProperties", scrollProperties);
    scaleExpresion.SetReferenceParameter("item", item);

    // Scale the item based on the distance of the item relative to the center of the viewport.
    scaleExpresion.Expression = "1 - abs((svVisual.Size.Y/2 - scrollProperties.Translation.Y) 
                                   - (item.Offset.Y + item.Size.Y/2))*(.25/(svVisual.Size.Y/2))";

    // Animate the item based on its distance to the center of the viewport.
    item.StartAnimation("Scale.X", scaleExpresion);
    item.StartAnimation("Scale.Y", scaleExpresion);
    var centerPointExpression = scrollProperties.Compositor.CreateExpressionAnimation();
    centerPointExpression.SetReferenceParameter("item", item);
    centerPointExpression.Expression = "Vector3(item.Size.X/2, item.Size.Y/2, 0)";
    item.StartAnimation("CenterPoint", centerPointExpression);
}

/* This function identifies the item that's currently in the middle of the viewport,
and sets the rectangle to match its color. */
private void Animated_ScrollViewer_ViewChanging(object sender, ScrollViewerViewChangingEventArgs e)
{
     if (GetSelectedItemFromViewport() is not Button selectedItem)
     {
         return;
     }

     // Update corresponding rectangle with selected color
     colorRectangle.Fill = selectedItem.Background;
}

// The remainder of these functions are helper functions for the ViewChanging function:

// Find centerpoint of ScrollViewer
private double CenterPointOfViewportInExtent()
{
    return Animated_ScrollViewer.VerticalOffset + Animated_ScrollViewer.ViewportHeight / 2;
}

// Find index of the item that's at the center of the viewport
private int GetSelectedIndexFromViewport()
{
    int selectedItemIndex = (int)Math.Floor(CenterPointOfViewportInExtent() 
                              / ((double)AnimatedBtnMargin.Top + AnimatedBtnHeight));
    selectedItemIndex %= animatedScrollRepeater.ItemsSourceView.Count;
    return selectedItemIndex;
}

// Return item that's at the center of the viewport.
private object? GetSelectedItemFromViewport()
{
    var selectedIndex = GetSelectedIndexFromViewport();
    var selectedElement = animatedScrollRepeater.TryGetElement(selectedIndex) as Button;
    return selectedElement;
}`,source:`WinUIGallery/Samples/ItemsRepeater/ItemsRepeaterAnimatedScrollingContentDisplay.txt`,runtimeXaml:`<Grid xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:ns1="http://schemas.microsoft.com/winfx/2006/xaml">
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="1*" />
                    <ColumnDefinition Width="1*" />
                </Grid.ColumnDefinitions>

                <ScrollViewer ns1:Name="Animated_ScrollViewer" Grid.Column="0" Width="250" Height="175">
                    <ItemsRepeater ns1:Name="animatedScrollRepeater" GettingFocus="OnAnimatedScrollRepeaterGettingFocus" KeyDown="OnAnimatedScrollRepeaterKeyDown">
                        <DataTemplate ns1:DataType="x:String">
                            <Button HorizontalAlignment="Stretch" Background="{x:Bind}" Click="OnAnimatedItemClicked" Content="{x:Bind}" Foreground="{ThemeResource TextFillColorInverseBrush}" GotFocus="OnAnimatedItemGotFocus" />
                        </DataTemplate>
                    </ItemsRepeater>
                </ScrollViewer>

                <Rectangle ns1:Name="colorRectangle" Grid.Column="1" Width="150" Height="150" Margin="10,0,0,0" AutomationProperties.Name="ColorRectangle" Stroke="{ThemeResource SystemControlForegroundBaseHighBrush}" />
            </Grid>
        `,optionsXaml:``,pageSource:`WinUIGallery/Samples/ItemsRepeater/ItemsRepeaterPage.xaml`},ItemsRepeaterBasicNonInteractiveItems:{title:`Basic, non-interactive items laid out by ItemsRepeater`,xaml:`<!-- The ItemsRepeater and ScrollViewer used: -->
<ScrollViewer HorizontalScrollBarVisibility="Auto" 
              HorizontalScrollMode="Auto" 
              IsVerticalScrollChainingEnabled="False"
              MaxHeight="500">
    <ItemsRepeater
               ItemsSource="{x:Bind BarItems}"
               Layout="{StaticResource $(Layout)}"
               ItemTemplate="{StaticResource $(ElementGenerator)}" />
</ScrollViewer>
                    
<!-- The Layout specifications used: -->
                    
$(SampleCodeLayout)     
                    
<!-- The DataTemplate used: $(ElementGenerator)-->
                    
$(SampleCodeDT)`,csharp:`// The ItemsSource used is a list of custom-class Bar objects called BarItems

public class Bar
{
    public Bar(double length, int max)
    {
        Length = length;
        MaxLength = max;

        Height = length / 4;
        MaxHeight = max / 4;

        Diameter = length / 6;
        MaxDiameter = max / 6;
    }
    public double Length { get; set; }
    public int MaxLength { get; set; }

    public double Height { get; set; }
    public double MaxHeight { get; set; }

    public double Diameter { get; set; }
    public double MaxDiameter { get; set; }
}

public ObservableCollection<Bar> BarItems;
private int MaxLength = 425;

private void InitializeData()
{
    if (BarItems == null)
    {
        BarItems = new ObservableCollection<Bar>();
    }
    BarItems.Add(new Bar(300, this.MaxLength));
    BarItems.Add(new Bar(25, this.MaxLength));
    BarItems.Add(new Bar(175, this.MaxLength));
}`,source:`WinUIGallery/Samples/ItemsRepeater/ItemsRepeaterBasicNonInteractiveItems.txt`,runtimeXaml:`<ScrollViewer xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:ns1="http://schemas.microsoft.com/winfx/2006/xaml" MaxHeight="500" HorizontalScrollBarVisibility="Auto" HorizontalScrollMode="Auto" IsVerticalScrollChainingEnabled="False" VerticalScrollBarVisibility="Auto">
                <ItemsRepeater ns1:Name="repeater" ItemTemplate="{StaticResource HorizontalBarTemplate}" ItemsSource="{x:Bind BarItems}" Layout="{StaticResource VerticalStackLayout}" />
            </ScrollViewer>
            `,optionsXaml:`<ControlExample.Options xmlns="using:WinUIGallery.Controls" xmlns:ns1="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:ns2="http://schemas.microsoft.com/winfx/2006/xaml">
                <ns1:StackPanel Spacing="12">
                    <ns1:Button ns2:Name="AddBtn" MinWidth="150" Click="AddBtn_Click" Content="Add Item" />
                    <ns1:Button ns2:Name="DeleteBtn" MinWidth="150" Click="DeleteBtn_Click" Content="Remove Item" />

                    <ns1:RadioButtons Header="Layout" SelectionChanged="RadioBtn_Click">
                        <ns1:RadioButton ns2:Name="VStackBtn" Content="StackLayout - Vertical" IsChecked="True" Tag="VerticalStackLayout" />
                        <ns1:RadioButton ns2:Name="HStackBtn" Content="StackLayout - Horizontal" Tag="HorizontalStackLayout" />
                        <ns1:RadioButton ns2:Name="HGridBtn" Content="UniformGridLayout" Tag="UniformGridLayout" />
                    </ns1:RadioButtons>
                </ns1:StackPanel>
            </ControlExample.Options>




            `,pageSource:`WinUIGallery/Samples/ItemsRepeater/ItemsRepeaterPage.xaml`},ItemsRepeaterVirtualizedContentHeavyLayout:JSON.parse(`{"title":"Virtualized, Content-Heavy Layout with Filtering and Sorting","xaml":"<!-- XAML Code: -->\\n<ItemsRepeaterScrollHost>\\n    <ScrollViewer>\\n        <ItemsRepeater x:Name=\\"VariedImageSizeRepeater\\" \\n\\t\\t\\t    ItemTemplate=\\"{StaticResource RecipeTemplate}\\">\\n\\t    \\n           <!-- IMPORTANT: This ItemsRepeater uses a custom-created layout \\n\\t\\tcalled VariedImageSize Layout (referenced below).You can find \\n  \\t\\tthe full source code for this layout in the file \\n\\t\\tVariedImageSizeLayout.cs in the WinUI Gallery repo. -->\\n\\n            <ItemsRepeater.Layout>\\n                <common:VariedImageSizeLayout Width=\\"200\\" />\\n            </ItemsRepeater.Layout>\\n        </ItemsRepeater>\\n    </ScrollViewer>\\n</ItemsRepeaterScrollHost>\\n\\n<!-- DataTemplate used: -->\\n<!-- This repeater holds Recipe objects, which is a custom class defined in \\n     the code-behind, and shown below. -->\\n<DataTemplate x:DataType=\\"l:Recipe\\" x:Key=\\"RecipeTemplate\\">\\n    <StackPanel BorderThickness=\\"1\\" Background=\\"LightGray\\" Margin=\\"5\\">\\n        <StackPanel Background=\\"{x:Bind Color}\\" Margin=\\"8\\" Height=\\"75\\" Opacity=\\".8\\">\\n            <TextBlock Text=\\"{x:Bind Num.ToString()}\\" FontSize=\\"35\\" TextAlignment=\\"Center\\" \\n                        Padding=\\"12\\"  Foreground=\\"{ThemeResource SystemControlForegroundAltHighBrush}\\"/>\\n        </StackPanel>\\n        <TextBlock \\n            x:Name=\\"recipeName\\" \\n            Text=\\"{x:Bind Name}\\"\\n            TextWrapping=\\"Wrap\\"\\n            Margin=\\"15,0,10,0\\" \\n            Style=\\"{StaticResource TitleTextBlockStyle}\\"/>\\n        <TextBlock Text=\\"{x:Bind Ingredients}\\" Style=\\"{StaticResource BodyTextBlockStyle}\\" Margin=\\"15,0,15,15\\"/>\\n    </StackPanel>\\n</DataTemplate>","csharp":"// C# Code\\n\\n// ==========================  Recipe class used for items ========================== \\npublic class Recipe\\n{\\n    public int Num { get; set; }\\n    public string Ingredients { get; set; } = string.Empty;\\n    public List<string> IngList { get; set; } = [];\\n    public string Name { get; set; } = string.Empty;\\n    public string Color { get; set; } = string.Empty;\\n    public int numIngredients\\n    {\\n        get\\n        {\\n            return IngList.Count();\\n        }\\n    }\\n\\n    public void RandomizeIngredients()\\n    {\\n        // To give the items different heights for visual variety, give recipes \\n        // random numbers of random \\"extra\\" ingredients\\n        Random rndNum = new Random();\\n        Random rndIng = new Random();\\n\\n        ObservableCollection<string> extras = new ObservableCollection<string>{\\n                                                        \\"Garlic\\",\\n                                                        \\"Lemon\\",\\n                                                        \\"Butter\\",\\n                                                        \\"Lime\\",\\n                                                        \\"Feta Cheese\\",\\n                                                        \\"Parmesan Cheese\\",\\n                                                        \\"Breadcrumbs\\"};\\n        for (int i =0; i < rndNum.Next(0,4); i++)\\n        {\\n            string newIng = extras[rndIng.Next(0, 6)];\\n            // If the ingredient is not already present in the recipe, add it\\n            if (!IngList.Contains(newIng))\\n            {\\n                Ingredients += \\"\\\\n\\" + newIng;\\n                IngList.Add(newIng);\\n            }\\n        }\\n\\n    }\\n}\\n\\n// ==========================  Data source class ========================== \\n/* To hold the recipe items, a data source class was created called MyItemsSource. The class\\n   inherits from IList and IKeyIndexMapping interfaces, basically creating a collection class \\n   that can easily filter and sort its items. Important methods are shown below, but full source\\n   code can be found in WinUI Gallery repo. See the linked ItemsRepeater guidance documentation as\\n   well for a full tutorial on how to implement this type of class. */\\n\\npublic class MyItemsSource : IList, \\n                             Microsoft.UI.Xaml.Controls.IKeyIndexMapping, \\n                             INotifyCollectionChanged\\n{\\n    private List<Recipe> inner = new List<Recipe>();\\n\\n    public MyItemsSource(IEnumerable<Recipe> collection)\\n    {\\n        InitializeCollection(collection);\\n    }\\n\\n    public void InitializeCollection(IEnumerable<Recipe> collection)\\n    {\\n        inner.Clear();\\n        if (collection != null)\\n        {\\n            inner.AddRange(collection);  \\n        }\\n\\n        if (CollectionChanged != null)\\n        {\\n            CollectionChanged?.Invoke(\\n                this, \\n                new NotifyCollectionChangedEventArgs(NotifyCollectionChangedAction.Reset));\\n        }\\n    }\\n\\n    //...\\n\\n    public string KeyFromIndex(int index)\\n    {\\n        return inner[index].Num.ToString();\\n    }\\n\\n    public int IndexFromKey(string key)\\n    {\\n        foreach (Recipe item in inner)\\n        {\\n            if (item.Num.ToString() == key)\\n            {\\n                return inner.IndexOf(item);\\n            }\\n        }\\n        return -1;\\n    }\\n    // ...\\n\\n}\\n\\n// ========================== Initialization code ==========================\\n\\npublic MyItemsSource filteredRecipeData = new MyItemsSource(null);\\npublic List<Recipe> staticRecipeData;\\n\\nprivate void InitializeData()\\n{\\n    // ...\\n    // Create a list of Recipe objects, initializing each of them with a random number,\\n    // correlating name, and random color to associate with it.\\n    var rnd = new Random();\\n    List<Recipe> tempList = new List<Recipe>(\\n                              Enumerable.Range(0, 1000).Select(k =>\\n                                new Recipe\\n                                  {\\n                                    Num = k,\\n                                    Name = \\"Recipe \\" + k.ToString(),\\n                                    Color = colors[k % 15 + 1]\\n                                }));\\n\\n    // The lists fruits, vegetables, grains, and proteins were all populated with strings. \\n    // This loop goes through each Recipe item and populates its ingredients list with one \\n    // string from each list/category, then randomizes the ingredients list by adding extras.            \\n    foreach (Recipe rec in tempList)\\n    {\\n        string fruitOption = fruits[rnd.Next(0, 6)];\\n        string vegOption = vegetables[rnd.Next(0, 6)];\\n        string grainOption = grains[rnd.Next(0, 6)];\\n        string proteinOption = proteins[rnd.Next(0, 6)];\\n        rec.Ingredients = \\"\\\\n\\" + fruitOption + \\"\\\\n\\" + vegOption + \\"\\\\n\\" + \\n        grainOption + \\"\\\\n\\" + proteinOption;\\n        rec.IngList = new List<string>() { fruitOption, vegOption, grainOption, proteinOption };\\n        rec.RandomizeIngredients();\\n    }\\n\\n    // The custom MyItemsSource object, filteredRecipeData, is initialized.\\n    filteredRecipeData.InitializeCollection(tempList);\\n    // A static list of the original recipe data is saved to use for filtering.\\n    staticRecipeData = new List<Recipe>(tempList);\\n    // The ItemsSource is set for the ItemsRepeater created in the XAML file.\\n    VariedImageSizeRepeater.ItemsSource = filteredRecipeData;\\n\\n    // ...\\n}\\n\\n// ========================== Filtering, sorting, animating ========================== \\npublic void FilterRecipes_FilterChanged(object sender, RoutedEventArgs e)\\n{\\n    UpdateSortAndFilter();\\n}\\n\\nprivate void OnSortAscClick(object sender, RoutedEventArgs e)\\n{\\n    if (IsSortDescending == true)\\n    {\\n        IsSortDescending = false;\\n        UpdateSortAndFilter();\\n    }\\n}\\n\\nprivate void OnSortDesClick(object sender, RoutedEventArgs e)\\n{\\n    if (!IsSortDescending == true)\\n    {\\n        IsSortDescending = true;\\n        UpdateSortAndFilter();\\n    }\\n}\\n\\nprivate void UpdateSortAndFilter()\\n{\\n    // This is a Linq query that fetches all Recipes containing the ingredient \\n    // typed into the filter text box.\\n    var filteredTypes = staticRecipeData\\n        .Where(i => i.Ingredients.Contains(\\n            FilterRecipes.Text,\\n            StringComparison.InvariantCultureIgnoreCase));\\n    // After filtering, sort the collection    \\n    var sortedFilteredTypes = IsSortDescending ?\\n        filteredTypes.OrderByDescending(i => i.numIngredients) :\\n        filteredTypes.OrderBy(i => i.numIngredients);\\n    // Re-initialize the collection with this newly filtered data\\n    filteredRecipeData.InitializeCollection(sortedFilteredTypes);\\n}","source":"WinUIGallery/Samples/ItemsRepeater/ItemsRepeaterVirtualizedContentHeavyLayout.txt","runtimeXaml":"<Grid xmlns=\\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\\" xmlns:ns1=\\"http://schemas.microsoft.com/winfx/2006/xaml\\" xmlns:ns2=\\"using:WinUIGallery.Layouts\\" Height=\\"600\\">\\n                <Grid.ColumnDefinitions>\\n                    <ColumnDefinition Width=\\"1*\\" />\\n                    <ColumnDefinition Width=\\"1*\\" />\\n                </Grid.ColumnDefinitions>\\n                <ItemsRepeaterScrollHost ns1:Name=\\"tracker\\" Grid.Column=\\"0\\">\\n                    <ScrollViewer>\\n                        <ItemsRepeater ns1:Name=\\"VariedImageSizeRepeater\\" ItemTemplate=\\"{StaticResource RecipeTemplate}\\">\\n                            <ItemsRepeater.Layout>\\n                                <ns2:VariedImageSizeLayout Width=\\"200\\" />\\n                            </ItemsRepeater.Layout>\\n                        </ItemsRepeater>\\n                    </ScrollViewer>\\n                </ItemsRepeaterScrollHost>\\n\\n                <StackPanel Grid.Column=\\"1\\" Margin=\\"10,0,0,0\\">\\n                    <TextBox ns1:Name=\\"FilterRecipes\\" Width=\\"200\\" Margin=\\"0,0,0,20\\" HorizontalAlignment=\\"Left\\" VerticalAlignment=\\"Top\\" Header=\\"Filter by ingredient...\\" TextChanged=\\"FilterRecipes_FilterChanged\\" />\\n                    <TextBlock Margin=\\"0,0,0,10\\" Text=\\"Sort by number of ingredients\\" />\\n                    <Button Margin=\\"0,0,0,5\\" Click=\\"OnSortAscClick\\" Content=\\"Least to most\\" />\\n                    <Button Click=\\"OnSortDesClick\\" Content=\\"Most to least\\" />\\n                </StackPanel>\\n            </Grid>\\n        ","optionsXaml":"","pageSource":"WinUIGallery/Samples/ItemsRepeater/ItemsRepeaterPage.xaml"}`),ItemsRepeaterVirtualizingScrollableListItems:{title:`Virtualizing, scrollable list of items laid out by ItemsRepeater`,xaml:`<!-- XAML Code -->

<!-- The ItemsRepeater and ScrollViewer used: -->
<ScrollViewer x:Name="scrollViewer"
                Height="400"
                IsVerticalScrollChainingEnabled="False"
                Padding="0,0,16,0">
    <ItemsRepeater
            ItemsSource="{x:Bind NumberedItems}"
            Layout="{StaticResource $(Layout)}"
            ItemTemplate="{StaticResource $(ItemTemplate)}" />
</ScrollViewer> 
                    
<!-- The Layout specifications used: -->
                    
$(SampleCodeLayout2)     
                    
<!-- The ItemTemplate is bound to a DataTemplateSelector called MyDataTemplateSelector. 
MyDataTemplateSelector is defined in the code-behind to return the Accent DataTemplate 
for odd-numbered-items, and returns the Normal DataTemplate for even-numbered-items 
(shown in C# code-behind section below). The two data templates and the XAML declaration
of MyDataTemplateSelector are below: -->

<MyDataTemplateSelector x:Key="MyDataTemplateSelector"
                            Normal="{StaticResource NormalItemTemplate}"
                            Accent="{StaticResource AccentItemTemplate}"/>    
                    
<DataTemplate x:Key="NormalItemTemplate" x:DataType="x:Int32">
    <Button HorizontalAlignment="Stretch" VerticalAlignment="Stretch" 
	    Background="{ThemeResource SystemChromeLowColor}">
        <TextBlock Text="{x:Bind}" />
    </Button>
</DataTemplate>

<DataTemplate x:Key="AccentItemTemplate" x:DataType="x:Int32">
    <Button HorizontalAlignment="Stretch" VerticalAlignment="Stretch" 
	    Background="{ThemeResource SystemAccentColor}">
        <TextBlock Text="{x:Bind}" />
    </Button>
</DataTemplate>
                    
<!-- The ItemsSource for this ItemsRepeater is a list of integers called NumberedItems.-->
                    
<!-- ActivityFeedLayout is a custom designed virtualizing layout that loads images only as you come 
accross them, defined in the code-behind. View the WinUI Gallery source code to see more
details about this custom layout. -->`,csharp:`// C# Code-behind

public class MyDataTemplateSelector : DataTemplateSelector
{
    public DataTemplate? Normal { get; set; }
    public DataTemplate? Accent { get; set; }

    protected override DataTemplate? SelectTemplateCore(object item)
    {
        if ((int)item % 2 == 0)
        {
            return Normal;
        }
        else
        {
            return Accent;
        }
    }
}`,source:`WinUIGallery/Samples/ItemsRepeater/ItemsRepeaterVirtualizingScrollableListItems.txt`,runtimeXaml:`<ItemsRepeaterScrollHost xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:ns1="http://schemas.microsoft.com/winfx/2006/xaml">
                <ScrollViewer ns1:Name="scrollViewer" Height="400" Padding="0,0,16,0" IsVerticalScrollChainingEnabled="False">
                    <ItemsRepeater ns1:Name="repeater2" Margin="0,0,12,0" ItemsSource="{x:Bind Numbers}" HorizontalAlignment="Stretch" ItemTemplate="{StaticResource MyDataTemplateSelector}" Layout="{StaticResource MyFeedLayout}" />
                </ScrollViewer>
            </ItemsRepeaterScrollHost>

            `,optionsXaml:`<ControlExample.Options xmlns="using:WinUIGallery.Controls" xmlns:ns1="http://schemas.microsoft.com/winfx/2006/xaml/presentation">
                <ns1:StackPanel Spacing="12">
                    <ns1:RadioButtons SelectedIndex="1" SelectionChanged="LayoutBtn_SelectionChanged">
                        <ns1:RadioButton Content="Uniform grid" Tag="UniformGridLayout2" />
                        <ns1:RadioButton Content="Custom virtualizing layout" Tag="MyFeedLayout" />
                    </ns1:RadioButtons>
                </ns1:StackPanel>
            </ControlExample.Options>

            `,pageSource:`WinUIGallery/Samples/ItemsRepeater/ItemsRepeaterPage.xaml`},ItemsrepeaterMixedTypeCollection:{title:`ItemsRepeater with mixed-type collection`,xaml:`<!-- XAML Code -->

<!-- This is the ItemsRepeater used in this example: -->
<ItemsRepeater x:Name="MixedTypeRepeater" 
               Margin="0,0,12,0"
               HorizontalAlignment="Stretch"
               ItemTemplate="{StaticResource StringOrIntTemplateSelector}">

    <ItemsRepeater.Layout>
        <UniformGridLayout MinItemWidth="200" MinItemHeight="200"/>
    </ItemsRepeater.Layout>
</ItemsRepeater>

<!-- The ItemsSource is bound in the C# code-behind to an ObservableCollection called 
StringsAndInts. StringsAndInts has both string objects and integer objects. The ItemTemplate
is a DataTemplateSelector called StringOrIntTemplateSelector, and is defined in the 
code-behind and shown in the C# code-behind section below. The layout is a simple 
UniformGridLayout where each item is a 200x200 square. -->
                        
<!-- StringOrIntTemplateSelector assesses the type of an item, and returns StringDataTemplate if 
the item is a string, and IntDataTemplate if the item is an integer. 
The XAML code directly below binds the DataTemplateSelector to those two data templates, and 
defines each of them: -->
                        
<StringOrIntTemplateSelector x:Key="StringOrIntTemplateSelector"
                             StringTemplate="{StaticResource StringDataTemplate}"
                             IntTemplate="{StaticResource IntDataTemplate}"/>         
                        
<DataTemplate x:Key="StringDataTemplate" x:DataType="x:String">
    <Grid Background="{ThemeResource SystemControlBackgroundAccentBrush}" Margin="10">
        <TextBlock Padding="10" Text="{x:Bind}" 
                   Foreground="{ThemeResource SystemControlForegroundChromeWhiteBrush}"
                   HorizontalAlignment="Center" TextWrapping="Wrap" 
                   VerticalAlignment="Center"/>
     </Grid>
</DataTemplate>

<DataTemplate x:Key="IntDataTemplate" x:DataType="x:Int32">
    <Grid Background="{ThemeResource SystemControlBackgroundChromeMediumBrush}" Margin="10">
        <TextBlock Padding="10" Text="{x:Bind}" 
                   Style="{StaticResource HeaderTextBlockStyle}"
                   HorizontalAlignment="Center" VerticalAlignment="Center"/>
    </Grid>
</DataTemplate>`,csharp:`// C# code-behind

public class StringOrIntTemplateSelector : DataTemplateSelector
{
    // Define the (currently empty) data templates to return
    // These will be "filled-in" in the XAML code.
    public DataTemplate? StringTemplate { get; set; }

    public DataTemplate? IntTemplate { get; set; }

    protected override DataTemplate? SelectTemplateCore(object item)
    {
        // Return the correct data template based on the item's type.
        if (item.GetType() == typeof(String))
        {
            return StringTemplate;
        }
        else if (item.GetType() == typeof(int))
        {
            return IntTemplate;
        }
        else
        {
            return null;
        }
    }
}`,source:`WinUIGallery/Samples/ItemsRepeater/ItemsrepeaterMixedTypeCollection.txt`,runtimeXaml:`<StackPanel xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:ns1="http://schemas.microsoft.com/winfx/2006/xaml">
                <TextBlock Text="This is an ItemsRepeater that displays both integer and string items. It uses a DataTemplateSelector to choose the correct layout for each of its items." TextWrapping="Wrap" />
                <ItemsRepeater ns1:Name="MixedTypeRepeater" Margin="0,0,12,0" HorizontalAlignment="Stretch" ItemTemplate="{StaticResource StringOrIntTemplateSelector}">

                    <ItemsRepeater.Layout>
                        <UniformGridLayout MinItemHeight="200" MinItemWidth="200" />
                    </ItemsRepeater.Layout>
                </ItemsRepeater>
            </StackPanel>
        `,optionsXaml:``,pageSource:`WinUIGallery/Samples/ItemsRepeater/ItemsRepeaterPage.xaml`},LayingOutNestedItemsrepeaters:{title:`Laying out nested ItemsRepeaters`,xaml:`<!-- The nested ItemsRepeater experience is achieved by creating one ItemsRepeater (outerRepeater below) 
and creating another ItemsRepeater (innerRepeater below) inside the outer one's DataTemplate. Below is 
the outer ItemsRepeater definition and the DataTemplate it uses. -->
                    
<ScrollViewer HorizontalScrollMode="Auto" HorizontalScrollBarVisibility="Auto">
    <ItemsRepeater 
        x:Name="outerRepeater"
        VerticalAlignment="Top"
        ItemTemplate ="{StaticResource CategoryTemplate}">
        <ItemsRepeater.Layout>
           <StackLayout Orientation="Vertical" />
        </ItemsRepeater.Layout>
    </ItemsRepeater>
</ScrollViewer>
                    
<DataTemplate x:Key="CategoryTemplate" x:DataType="l:NestedCategory">
    <StackPanel>
        <TextBlock Text="{x:Bind CategoryName}" Padding="8" Style="{StaticResource TitleTextBlockStyle}"/>
        <ItemsRepeater x:Name="innerRepeater"
                            ItemsSource="{x:Bind CategoryItems}"
                            ItemTemplate="{StaticResource StringDataTemplateColor}">
            <ItemsRepeater.Layout>
                <StackLayout Orientation="Horizontal" />
            </ItemsRepeater.Layout>
        </ItemsRepeater>
    </StackPanel>
</DataTemplate>
                    
<!-- The DataTemplate shown above is bound to a custom-class type called NestedCategory, 
which is defined in the code-behind. NestedCategory objects have the following two attributes: 
a CategoryName (string), and a collection of strings called CategoryItems. -->
                    
<!-- The inner ItemsRepeater is bound to its own, separate DataTemplate called StringDataTemplateColor: -->
                    
<DataTemplate x:Key="StringDataTemplateColor" x:DataType="x:String">
    <Grid Background="{StaticResource SystemControlBackgroundAccentBrush}" Margin="10, 0, 10 10">
        <TextBlock Padding="10" Text="{x:Bind}" 
                   Foreground="{StaticResource SystemControlForegroundAltHighBrush}" 
                   HorizontalAlignment="Center" TextWrapping="Wrap" VerticalAlignment="Center"/>
    </Grid>
</DataTemplate>`,csharp:``,source:`WinUIGallery/Samples/ItemsRepeater/LayingOutNestedItemsrepeaters.txt`,runtimeXaml:`<ScrollViewer xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:ns1="http://schemas.microsoft.com/winfx/2006/xaml" HorizontalScrollBarVisibility="Auto" HorizontalScrollMode="Auto">
                <ItemsRepeater ns1:Name="outerRepeater" VerticalAlignment="Top" ItemTemplate="{StaticResource CategoryTemplate}">
                    <ItemsRepeater.Layout>
                        <StackLayout Orientation="Vertical" />
                    </ItemsRepeater.Layout>
                </ItemsRepeater>
            </ScrollViewer>
        `,optionsXaml:``,pageSource:`WinUIGallery/Samples/ItemsRepeater/ItemsRepeaterPage.xaml`},BasicPulltorefresh:{title:`Basic PullToRefresh`,xaml:`<RefreshContainer x:Name="rc" RefreshRequested="rc_RefreshRequested">
    <ListView x:Name="lv" Width="300" Height="300" BorderThickness="1" BorderBrush="Black"/>
</RefreshContainer>`,csharp:`ObservableCollection<string> items = new ObservableCollection<string>();
listview.ItemsSource = items;

private void rc_RefreshRequested(RefreshContainer sender, RefreshRequestedEventArgs args)
{
    //Do some work to show new Content! Once the work is done, call RefreshCompletionDeferral.Complete()
    this.RefreshCompletionDeferral = args.GetDeferral();
    this.DoWork();
}

private void WorkCompleted()
{
    items.Insert(0, "NewControl");
    if (this.RefreshCompletionDeferral != null)
    {
        this.RefreshCompletionDeferral.Complete();
        this.RefreshCompletionDeferral.Dispose();
        this.RefreshCompletionDeferral = null;
    }
}`,source:`WinUIGallery/Samples/PullToRefresh/BasicPulltorefresh.txt`,runtimeXaml:`<Grid xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:ns1="http://schemas.microsoft.com/winfx/2006/xaml">
                    <RefreshContainer ns1:Name="rc" HorizontalAlignment="Center" VerticalAlignment="Center" RefreshRequested="rc_RefreshRequested">
                        <ListView ns1:Name="lv" Height="200" MinWidth="200" BorderBrush="{ThemeResource TextControlBorderBrush}" BorderThickness="1" />
                    </RefreshContainer>
                </Grid>
            `,optionsXaml:``,pageSource:`WinUIGallery/Samples/PullToRefresh/PullToRefreshPage.xaml`},CustomIconPulltorefresh:{title:`Custom Icon PullToRefresh`,xaml:`<RefreshContainer x:Name="rc" RefreshRequested="rc_RefreshRequested">
    <RefreshContainer.Visualizer>
        <RefreshVisualizer RefreshStateChanged="rv2_RefreshStateChanged">
            <RefreshVisualizer.Content>
                <SymbolIcon Symbol="AddFriend"/>
            </RefreshVisualizer.Content>
        </RefreshVisualizer>
    </RefreshContainer.Visualizer>
    <ListView x:Name="lv" Width="300" Height="300" BorderThickness="1" BorderBrush="Black"/>
</RefreshContainer>`,csharp:`ObservableCollection<string> items = new ObservableCollection<string>();
listview.ItemsSource = items;

private void rc_RefreshRequested(RefreshContainer sender, RefreshRequestedEventArgs args)
{
    //Do some work to show new Content! Once the work is done, call RefreshCompletionDeferral.Complete()
    this.RefreshCompletionDeferral = args.GetDeferral();
    this.DoWork();
}

private void WorkCompleted()
{
    items.Insert(0, "NewControl");
    if (this.RefreshCompletionDeferral != null)
    {
        this.RefreshCompletionDeferral.Complete();
        this.RefreshCompletionDeferral.Dispose();
        this.RefreshCompletionDeferral = null;
    }
}
private void rv2_RefreshStateChanged()
{
    var visualizerContentVisual = ElementCompositionPreview.GetElementVisual(rv2.Content);
    visualizerContentVisual.StopAnimation("RotationAngle");
}`,source:`WinUIGallery/Samples/PullToRefresh/CustomIconPulltorefresh.txt`,runtimeXaml:`<Grid xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:ns1="http://schemas.microsoft.com/winfx/2006/xaml" ns1:Name="Ex2Grid">
                    <Grid.RowDefinitions>
                        <RowDefinition Height="Auto" />
                        <RowDefinition />
                    </Grid.RowDefinitions>
                </Grid>
            `,optionsXaml:``,pageSource:`WinUIGallery/Samples/PullToRefresh/PullToRefreshPage.xaml`},_repository:JSON.parse(`{"commit":"7360ac322414e118eadfb0c7c2f4ecc31a218f59","pages":{"ItemsRepeater":["ItemsRepeaterBasicNonInteractiveItems","ItemsRepeaterVirtualizingScrollableListItems","FlowLayoutVirtualization","ItemsrepeaterMixedTypeCollection","LayingOutNestedItemsrepeaters","ItemsRepeaterAnimatedScrollingContentDisplay","ItemsRepeaterVirtualizedContentHeavyLayout"],"PullToRefresh":["BasicPulltorefresh","CustomIconPulltorefresh"]},"resources":{"HorizontalBarTemplate":"<DataTemplate xmlns=\\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\\" xmlns:ns1=\\"http://schemas.microsoft.com/winfx/2006/xaml\\" ns1:Key=\\"HorizontalBarTemplate\\" ns1:DataType=\\"local:Bar\\">\\n            <Border Width=\\"{x:Bind MaxLength}\\" Background=\\"{ThemeResource SystemChromeLowColor}\\">\\n                <Rectangle Width=\\"{x:Bind Length}\\" Height=\\"24\\" HorizontalAlignment=\\"Left\\" Fill=\\"{ThemeResource SystemAccentColor}\\" />\\n            </Border>\\n        </DataTemplate>\\n\\n        ","VerticalBarTemplate":"<DataTemplate xmlns=\\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\\" xmlns:ns1=\\"http://schemas.microsoft.com/winfx/2006/xaml\\" ns1:Key=\\"VerticalBarTemplate\\" ns1:DataType=\\"local:Bar\\">\\n            <Border Height=\\"{x:Bind MaxHeight}\\" Background=\\"{ThemeResource SystemChromeLowColor}\\">\\n                <Rectangle Width=\\"48\\" Height=\\"{x:Bind Height}\\" VerticalAlignment=\\"Top\\" Fill=\\"{ThemeResource SystemAccentColor}\\" />\\n            </Border>\\n        </DataTemplate>\\n\\n        ","CircularTemplate":"<DataTemplate xmlns=\\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\\" xmlns:ns1=\\"http://schemas.microsoft.com/winfx/2006/xaml\\" ns1:Key=\\"CircularTemplate\\" ns1:DataType=\\"local:Bar\\">\\n            <Grid>\\n                <Ellipse Width=\\"{x:Bind MaxDiameter}\\" Height=\\"{x:Bind MaxDiameter}\\" HorizontalAlignment=\\"Center\\" VerticalAlignment=\\"Center\\" Fill=\\"{ThemeResource SystemChromeLowColor}\\" />\\n                <Ellipse Width=\\"{x:Bind Diameter}\\" Height=\\"{x:Bind Diameter}\\" HorizontalAlignment=\\"Center\\" VerticalAlignment=\\"Center\\" Fill=\\"{ThemeResource SystemAccentColor}\\" />\\n            </Grid>\\n        </DataTemplate>\\n\\n        ","NormalItemTemplate":"<DataTemplate xmlns=\\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\\" xmlns:ns1=\\"http://schemas.microsoft.com/winfx/2006/xaml\\" ns1:Key=\\"NormalItemTemplate\\" ns1:DataType=\\"x:Int32\\">\\n            <Border Background=\\"{ThemeResource SystemControlBackgroundChromeMediumBrush}\\">\\n                <TextBlock HorizontalAlignment=\\"Center\\" VerticalAlignment=\\"Center\\" Text=\\"{x:Bind}\\" />\\n            </Border>\\n        </DataTemplate>\\n\\n        ","AccentItemTemplate":"<DataTemplate xmlns=\\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\\" xmlns:ns1=\\"http://schemas.microsoft.com/winfx/2006/xaml\\" ns1:Key=\\"AccentItemTemplate\\" ns1:DataType=\\"x:Int32\\">\\n            <Border Background=\\"{ThemeResource SystemControlBackgroundAccentBrush}\\">\\n                <TextBlock HorizontalAlignment=\\"Center\\" VerticalAlignment=\\"Center\\" Foreground=\\"{ThemeResource SystemControlForegroundChromeWhiteBrush}\\" Text=\\"{x:Bind}\\" />\\n            </Border>\\n        </DataTemplate>\\n\\n        ","StringDataTemplate":"<DataTemplate xmlns=\\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\\" xmlns:ns1=\\"http://schemas.microsoft.com/winfx/2006/xaml\\" ns1:Key=\\"StringDataTemplate\\" ns1:DataType=\\"x:String\\">\\n            <Grid Margin=\\"10\\" Background=\\"{ThemeResource SystemControlBackgroundAccentBrush}\\">\\n                <TextBlock Padding=\\"10\\" HorizontalAlignment=\\"Center\\" VerticalAlignment=\\"Center\\" Foreground=\\"{ThemeResource SystemControlForegroundChromeWhiteBrush}\\" Text=\\"{x:Bind}\\" TextWrapping=\\"Wrap\\" />\\n            </Grid>\\n        </DataTemplate>\\n\\n        ","IntDataTemplate":"<DataTemplate xmlns=\\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\\" xmlns:ns1=\\"http://schemas.microsoft.com/winfx/2006/xaml\\" ns1:Key=\\"IntDataTemplate\\" ns1:DataType=\\"x:Int32\\">\\n            <Grid Margin=\\"10\\" Background=\\"{ThemeResource SystemControlBackgroundChromeMediumBrush}\\">\\n                <TextBlock Padding=\\"10\\" HorizontalAlignment=\\"Center\\" VerticalAlignment=\\"Center\\" Style=\\"{StaticResource HeaderTextBlockStyle}\\" Text=\\"{x:Bind}\\" />\\n            </Grid>\\n        </DataTemplate>\\n\\n        ","CategoryTemplate":"<DataTemplate xmlns=\\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\\" xmlns:ns1=\\"http://schemas.microsoft.com/winfx/2006/xaml\\" ns1:Key=\\"CategoryTemplate\\" ns1:DataType=\\"local:NestedCategory\\">\\n            <StackPanel>\\n                <TextBlock Padding=\\"8\\" Style=\\"{StaticResource TitleTextBlockStyle}\\" Text=\\"{x:Bind CategoryName}\\" />\\n                <ItemsRepeater ns1:Name=\\"innerRepeater\\" ItemTemplate=\\"{StaticResource StringDataTemplate}\\" ItemsSource=\\"{x:Bind CategoryItems}\\">\\n                    <ItemsRepeater.Layout>\\n                        <StackLayout Orientation=\\"Horizontal\\" />\\n                    </ItemsRepeater.Layout>\\n                </ItemsRepeater>\\n            </StackPanel>\\n        </DataTemplate>\\n\\n        ","FlowItemTemplate":"<DataTemplate xmlns=\\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\\" xmlns:ns1=\\"http://schemas.microsoft.com/winfx/2006/xaml\\" ns1:Key=\\"FlowItemTemplate\\" ns1:DataType=\\"local:FlowLayoutItem\\">\\n            <Border Width=\\"96\\" Height=\\"64\\" Background=\\"{ThemeResource ControlFillColorDefaultBrush}\\" BorderBrush=\\"{ThemeResource ControlStrokeColorDefaultBrush}\\" BorderThickness=\\"1\\" CornerRadius=\\"{StaticResource ControlCornerRadius}\\">\\n                <TextBlock HorizontalAlignment=\\"Center\\" VerticalAlignment=\\"Center\\" Text=\\"{x:Bind Label}\\" />\\n            </Border>\\n        </DataTemplate>\\n\\n        ","VerticalStackLayout":"<StackLayout xmlns=\\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\\" xmlns:ns1=\\"http://schemas.microsoft.com/winfx/2006/xaml\\" ns1:Name=\\"VerticalStackLayout\\" Orientation=\\"Vertical\\" Spacing=\\"8\\" />\\n        ","HorizontalStackLayout":"<StackLayout xmlns=\\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\\" xmlns:ns1=\\"http://schemas.microsoft.com/winfx/2006/xaml\\" ns1:Name=\\"HorizontalStackLayout\\" Orientation=\\"Horizontal\\" Spacing=\\"8\\" />\\n        ","UniformGridLayout":"<UniformGridLayout xmlns=\\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\\" xmlns:ns1=\\"http://schemas.microsoft.com/winfx/2006/xaml\\" ns1:Name=\\"UniformGridLayout\\" MinColumnSpacing=\\"8\\" MinRowSpacing=\\"8\\" />\\n\\n        ","MyFeedLayout":"<ActivityFeedLayout xmlns=\\"using:WinUIGallery.Layouts\\" xmlns:ns1=\\"http://schemas.microsoft.com/winfx/2006/xaml\\" ns1:Key=\\"MyFeedLayout\\" ColumnSpacing=\\"12\\" MinItemSize=\\"80, 108\\" RowSpacing=\\"12\\" />\\n        ","UniformGridLayout2":"<UniformGridLayout xmlns=\\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\\" xmlns:ns1=\\"http://schemas.microsoft.com/winfx/2006/xaml\\" ns1:Key=\\"UniformGridLayout2\\" MinColumnSpacing=\\"12\\" MinItemHeight=\\"108\\" MinItemWidth=\\"108\\" MinRowSpacing=\\"12\\" />\\n\\n        ","RecipeTemplate":"<DataTemplate xmlns=\\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\\" xmlns:ns1=\\"http://schemas.microsoft.com/winfx/2006/xaml\\" ns1:Key=\\"RecipeTemplate\\" ns1:DataType=\\"local:Recipe\\">\\n            <StackPanel Margin=\\"5\\" Background=\\"{ThemeResource SystemControlBackgroundBaseLowBrush}\\" BorderThickness=\\"1\\">\\n                <StackPanel Height=\\"75\\" Margin=\\"8\\" Background=\\"{x:Bind Color}\\" Opacity=\\".8\\">\\n                    <TextBlock Padding=\\"12\\" FontSize=\\"35\\" Foreground=\\"{ThemeResource SystemControlForegroundAltHighBrush}\\" Text=\\"{x:Bind Num.ToString()}\\" TextAlignment=\\"Center\\" />\\n                </StackPanel>\\n                <TextBlock ns1:Name=\\"recipeName\\" Margin=\\"15,0,10,0\\" Style=\\"{StaticResource TitleTextBlockStyle}\\" Text=\\"{x:Bind Name}\\" TextWrapping=\\"Wrap\\" />\\n                <TextBlock Margin=\\"15,0,15,15\\" Style=\\"{StaticResource BodyTextBlockStyle}\\" Text=\\"{x:Bind Ingredients}\\" />\\n            </StackPanel>\\n        </DataTemplate>\\n\\n        ","MyDataTemplateSelector":"<MyDataTemplateSelector xmlns=\\"using:WinUIGallery.ControlPages\\" xmlns:ns1=\\"http://schemas.microsoft.com/winfx/2006/xaml\\" ns1:Key=\\"MyDataTemplateSelector\\" Accent=\\"{StaticResource AccentItemTemplate}\\" Normal=\\"{StaticResource NormalItemTemplate}\\" />\\n\\n        ","StringOrIntTemplateSelector":"<StringOrIntTemplateSelector xmlns=\\"using:WinUIGallery.ControlPages\\" xmlns:ns1=\\"http://schemas.microsoft.com/winfx/2006/xaml\\" ns1:Key=\\"StringOrIntTemplateSelector\\" IntTemplate=\\"{StaticResource IntDataTemplate}\\" StringTemplate=\\"{StaticResource StringDataTemplate}\\" />\\n    "},"pageCodeBehind":{"ItemsRepeater":"// Copyright (c) Microsoft Corporation. All rights reserved.\\n// Licensed under the MIT License.\\n\\nusing Microsoft.UI.Xaml;\\nusing Microsoft.UI.Xaml.Automation;\\nusing Microsoft.UI.Xaml.Automation.Peers;\\nusing Microsoft.UI.Xaml.Controls;\\nusing Microsoft.UI.Xaml.Controls.Primitives;\\nusing Microsoft.UI.Xaml.Hosting;\\nusing Microsoft.UI.Xaml.Input;\\nusing System;\\nusing System.Collections;\\nusing System.Collections.Generic;\\nusing System.Collections.ObjectModel;\\nusing System.Collections.Specialized;\\nusing System.Linq;\\nusing WinUIGallery.Helpers;\\nusing WinUIGallery.Pages;\\n\\nnamespace WinUIGallery.ControlPages;\\n\\npublic sealed partial class ItemsRepeaterPage : ItemsPageBase\\n{\\n    private Random random = new Random();\\n    private int MaxLength = 425;\\n\\n    public ObservableCollection<int> Numbers { get; } = new ObservableCollection<int>(Enumerable.Range(0, 500));\\n    public ObservableCollection<Bar>? BarItems;\\n    public MyItemsSource filteredRecipeData = new MyItemsSource([]);\\n    public List<Recipe> staticRecipeData = [];\\n    private bool IsSortDescending = false;\\n\\n    private Button? LastSelectedColorButton;\\n    private int PreviouslyFocusedAnimatedScrollRepeaterIndex = -1;\\n    private readonly HashSet<UIElement> _realizedFlowLayoutElements = [];\\n    private bool _realizedFlowLayoutCountUpdateQueued;\\n\\n    public IReadOnlyList<FlowLayoutItem> FlowLayoutItems { get; } = Enumerable.Range(1, 500)\\n        .Select(index => new FlowLayoutItem($\\"Item {index}\\"))\\n        .ToList();\\n\\n    public ItemsRepeaterPage()\\n    {\\n        this.InitializeComponent();\\n        InitializeData();\\n    }\\n\\n    public List<String> ColorList = new List<String>()\\n    {\\n            \\"Blue\\",\\n            \\"BlueViolet\\",\\n            \\"Crimson\\",\\n            \\"DarkCyan\\",\\n            \\"DarkGoldenrod\\",\\n            \\"DarkMagenta\\",\\n            \\"DarkOliveGreen\\",\\n            \\"DarkRed\\",\\n            \\"DarkSlateBlue\\",\\n            \\"DeepPink\\",\\n            \\"IndianRed\\",\\n            \\"MediumSlateBlue\\",\\n            \\"Maroon\\",\\n            \\"MidnightBlue\\",\\n            \\"Peru\\",\\n            \\"SaddleBrown\\",\\n            \\"SteelBlue\\",\\n            \\"OrangeRed\\",\\n            \\"Firebrick\\",\\n            \\"DarkKhaki\\"\\n    };\\n    private void InitializeData()\\n    {\\n        if (BarItems == null)\\n        {\\n            BarItems = new ObservableCollection<Bar>();\\n        }\\n        BarItems.Add(new Bar(300, this.MaxLength));\\n        BarItems.Add(new Bar(25, this.MaxLength));\\n        BarItems.Add(new Bar(175, this.MaxLength));\\n\\n        List<object> basicData = new List<object>\\n        {\\n            64,\\n            \\"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\\",\\n            128,\\n            \\"Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\\",\\n            256,\\n            \\"Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.\\",\\n            512,\\n            \\"Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\\",\\n            1024\\n        };\\n        MixedTypeRepeater.ItemsSource = basicData;\\n\\n        List<NestedCategory> nestedCategories = new List<NestedCategory>\\n        {\\n            new NestedCategory(\\"Fruits\\", GetFruits()),\\n            new NestedCategory(\\"Vegetables\\", GetVegetables()),\\n            new NestedCategory(\\"Grains\\", GetGrains()),\\n            new NestedCategory(\\"Proteins\\", GetProteins())\\n        };\\n\\n\\n        outerRepeater.ItemsSource = nestedCategories;\\n\\n        // Set sample code to display on page's initial load\\n        SampleCodeLayout.Value = @\\"<StackLayout x:Name=\\"\\"VerticalStackLayout\\"\\" Orientation=\\"\\"Vertical\\"\\" Spacing=\\"\\"8\\"\\"/>\\";\\n\\n        SampleCodeDT.Value = @\\"<DataTemplate x:Key=\\"\\"HorizontalBarTemplate\\"\\" x:DataType=\\"\\"l:Bar\\"\\">\\n    <Border Background=\\"\\"{ThemeResource SystemChromeLowColor}\\"\\" Width=\\"\\"{x:Bind MaxLength}\\"\\" >\\n        <Rectangle Fill=\\"\\"{ThemeResource SystemAccentColor}\\"\\" Width=\\"\\"{x:Bind Length}\\"\\" \\n                   Height=\\"\\"24\\"\\" HorizontalAlignment=\\"\\"Left\\"\\"/> \\n    </Border>\\n</DataTemplate>\\";\\n\\n        SampleCodeLayout2.Value = @\\"<common:ActivityFeedLayout x:Key=\\"\\"MyFeedLayout\\"\\" ColumnSpacing=\\"\\"12\\"\\"\\n                          RowSpacing=\\"\\"12\\"\\" MinItemSize=\\"\\"80, 108\\"\\"/>\\";\\n\\n\\n        animatedScrollRepeater.ItemsSource = ColorList;\\n\\n        animatedScrollRepeater.ElementPrepared += OnElementPrepared;\\n\\n        // Initialize custom MyItemsSource object with new recipe data\\n        List<Recipe> RecipeList = GetRecipeList();\\n        filteredRecipeData.InitializeCollection(RecipeList);\\n        // Save a static copy to compare to while filtering\\n        staticRecipeData = RecipeList;\\n        VariedImageSizeRepeater.ItemsSource = filteredRecipeData;\\n\\n    }\\n\\n    private ObservableCollection<string> GetFruits()\\n    {\\n        return new ObservableCollection<string> { \\"Apricots\\", \\"Bananas\\", \\"Grapes\\", \\"Strawberries\\", \\"Watermelon\\", \\"Plums\\", \\"Blueberries\\" };\\n    }\\n\\n    private ObservableCollection<string> GetVegetables()\\n    {\\n        return new ObservableCollection<string> { \\"Broccoli\\", \\"Spinach\\", \\"Sweet potato\\", \\"Cauliflower\\", \\"Onion\\", \\"Brussels sprouts\\", \\"Carrots\\" };\\n    }\\n    private ObservableCollection<string> GetGrains()\\n    {\\n        return new ObservableCollection<string> { \\"Rice\\", \\"Quinoa\\", \\"Pasta\\", \\"Bread\\", \\"Farro\\", \\"Oats\\", \\"Barley\\" };\\n    }\\n    private ObservableCollection<string> GetProteins()\\n    {\\n        return new ObservableCollection<string> { \\"Steak\\", \\"Chicken\\", \\"Tofu\\", \\"Salmon\\", \\"Pork\\", \\"Chickpeas\\", \\"Eggs\\" };\\n    }\\n\\n    // ==========================================================================\\n    // Basic, non-interactive ItemsRepeater\\n    // ==========================================================================\\n    private void AddBtn_Click(object sender, RoutedEventArgs e)\\n    {\\n        BarItems?.Add(new Bar(random.Next(this.MaxLength), this.MaxLength));\\n        DeleteBtn.IsEnabled = true;\\n    }\\n\\n    private void DeleteBtn_Click(object sender, RoutedEventArgs e)\\n    {\\n        if (BarItems?.Count > 0)\\n        {\\n            BarItems.RemoveAt(0);\\n            if (BarItems.Count == 0)\\n            {\\n                DeleteBtn.IsEnabled = false;\\n            }\\n        }\\n    }\\n\\n    private void RadioBtn_Click(object sender, SelectionChangedEventArgs e)\\n    {\\n        if (((sender as RadioButtons)?.SelectedItem as FrameworkElement)?.Tag is not string layoutKey)\\n        {\\n            // No point in continuing if selected element is null\\n            return;\\n        }\\n\\n        string itemTemplateKey = string.Empty;\\n\\n        if (layoutKey.Equals(nameof(this.VerticalStackLayout))) // we used x:Name in the resources which both acts as the x:Key value and creates a member field by the same name\\n        {\\n            layout.Value = layoutKey;\\n            itemTemplateKey = \\"HorizontalBarTemplate\\";\\n\\n            repeater.MaxWidth = MaxLength + 12;\\n\\n            SampleCodeLayout.Value = @\\"<StackLayout x:Name=\\"\\"VerticalStackLayout\\"\\" Orientation=\\"\\"Vertical\\"\\" Spacing=\\"\\"8\\"\\"/>\\";\\n            SampleCodeDT.Value = @\\"<DataTemplate x:Key=\\"\\"HorizontalBarTemplate\\"\\" x:DataType=\\"\\"l:Bar\\"\\">\\n    <Border Background=\\"\\"{ThemeResource SystemChromeLowColor}\\"\\" Width=\\"\\"{x:Bind MaxLength}\\"\\" >\\n        <Rectangle Fill=\\"\\"{ThemeResource SystemAccentColor}\\"\\" Width=\\"\\"{x:Bind Length}\\"\\"\\n                   Height=\\"\\"24\\"\\" HorizontalAlignment=\\"\\"Left\\"\\"/> \\n    </Border>\\n</DataTemplate>\\";\\n        }\\n        else if (layoutKey.Equals(nameof(this.HorizontalStackLayout)))\\n        {\\n            layout.Value = layoutKey;\\n            itemTemplateKey = \\"VerticalBarTemplate\\";\\n\\n            repeater.MaxWidth = 6000;\\n\\n            SampleCodeLayout.Value = @\\"<StackLayout x:Name=\\"\\"HorizontalStackLayout\\"\\" Orientation=\\"\\"Horizontal\\"\\" Spacing=\\"\\"8\\"\\"/> \\";\\n            SampleCodeDT.Value = @\\"<DataTemplate x:Key=\\"\\"VerticalBarTemplate\\"\\" x:DataType=\\"\\"l:Bar\\"\\">\\n    <Border Background=\\"\\"{ThemeResource SystemChromeLowColor}\\"\\" Height=\\"\\"{x:Bind MaxHeight}\\"\\">\\n        <Rectangle Fill=\\"\\"{ThemeResource SystemAccentColor}\\"\\" Height=\\"\\"{x:Bind Height}\\"\\" \\n                   Width=\\"\\"48\\"\\" VerticalAlignment=\\"\\"Top\\"\\"/>\\n    </Border>\\n</DataTemplate>\\";\\n        }\\n        else if (layoutKey.Equals(nameof(this.UniformGridLayout)))\\n        {\\n            layout.Value = layoutKey;\\n            itemTemplateKey = \\"CircularTemplate\\";\\n\\n            repeater.MaxWidth = 540;\\n\\n            SampleCodeLayout.Value = @\\"<UniformGridLayout x:Name=\\"\\"UniformGridLayout\\"\\" MinRowSpacing=\\"\\"8\\"\\" MinColumnSpacing=\\"\\"8\\"\\"/>\\";\\n            SampleCodeDT.Value = @\\"<DataTemplate x:Key=\\"\\"CircularTemplate\\"\\" x:DataType=\\"\\"l:Bar\\"\\">\\n    <Grid>\\n        <Ellipse Fill=\\"\\"{ThemeResource SystemChromeLowColor}\\"\\" Height=\\"\\"{x:Bind MaxDiameter}\\"\\" \\n                 Width=\\"\\"{x:Bind MaxDiameter}\\"\\" VerticalAlignment=\\"\\"Center\\"\\" HorizontalAlignment=\\"\\"Center\\"\\"/>\\n        <Ellipse Fill=\\"\\"{ThemeResource SystemAccentColor}\\"\\" Height=\\"\\"{x:Bind Diameter}\\"\\" \\n                 Width=\\"\\"{x:Bind Diameter}\\"\\" VerticalAlignment=\\"\\"Center\\"\\" HorizontalAlignment=\\"\\"Center\\"\\"/>\\n    </Grid>\\n</DataTemplate>\\";\\n        }\\n        repeater.Layout = Resources[layoutKey] as Microsoft.UI.Xaml.Controls.VirtualizingLayout;\\n        repeater.ItemTemplate = Resources[itemTemplateKey] as DataTemplate;\\n        repeater.ItemsSource = BarItems;\\n\\n        elementGenerator.Value = itemTemplateKey;\\n    }\\n\\n    // ==========================================================================\\n    // Virtualizing, scrollable list of items laid out by ItemsRepeater\\n    // ==========================================================================\\n    private void LayoutBtn_SelectionChanged(object sender, SelectionChangedEventArgs e)\\n    {\\n        if (((sender as RadioButtons)?.SelectedItem as RadioButton)?.Tag is string layoutKey)\\n        {\\n            repeater2.Layout = Resources[layoutKey] as Microsoft.UI.Xaml.Controls.VirtualizingLayout;\\n\\n            layout2.Value = layoutKey;\\n\\n            if (layoutKey == \\"UniformGridLayout2\\")\\n            {\\n                SampleCodeLayout2.Value = @\\"<UniformGridLayout x:Key=\\"\\"UniformGridLayout2\\"\\" MinItemWidth=\\"\\"108\\"\\" MinItemHeight=\\"\\"108\\"\\"\\n                       MinRowSpacing=\\"\\"12\\"\\" MinColumnSpacing=\\"\\"12\\"\\"/>\\";\\n            }\\n            else if (layoutKey == \\"MyFeedLayout\\")\\n            {\\n                SampleCodeLayout2.Value = @\\"<common:ActivityFeedLayout x:Key=\\"\\"MyFeedLayout\\"\\" ColumnSpacing=\\"\\"12\\"\\"\\n                              RowSpacing=\\"\\"12\\"\\" MinItemSize=\\"\\"80, 108\\"\\"/>\\";\\n            }\\n        }\\n    }\\n\\n    // ==========================================================================\\n    // Virtualized wrapping collection with FlowLayout\\n    // ==========================================================================\\n    private void OrientationButtons_SelectionChanged(object sender, SelectionChangedEventArgs e)\\n    {\\n        if ((sender as RadioButtons)?.SelectedItem is RadioButton selectedItem &&\\n            Enum.TryParse(selectedItem.Tag?.ToString(), out Orientation orientation) &&\\n            FlowLayout1 is not null)\\n        {\\n            FlowLayout1.Orientation = orientation;\\n\\n            if (FlowScrollViewer is not null)\\n            {\\n                bool isHorizontal = orientation == Orientation.Horizontal;\\n                FlowScrollViewer.HorizontalScrollMode = isHorizontal ? ScrollMode.Disabled : ScrollMode.Enabled;\\n                FlowScrollViewer.HorizontalScrollBarVisibility = isHorizontal\\n                    ? ScrollBarVisibility.Disabled\\n                    : ScrollBarVisibility.Auto;\\n                FlowScrollViewer.VerticalScrollMode = isHorizontal ? ScrollMode.Enabled : ScrollMode.Disabled;\\n                FlowScrollViewer.VerticalScrollBarVisibility = isHorizontal\\n                    ? ScrollBarVisibility.Auto\\n                    : ScrollBarVisibility.Disabled;\\n            }\\n        }\\n    }\\n\\n    private void LineAlignmentComboBox_SelectionChanged(object sender, SelectionChangedEventArgs e)\\n    {\\n        if ((sender as ComboBox)?.SelectedItem is ComboBoxItem selectedItem &&\\n            Enum.TryParse(selectedItem.Tag?.ToString(), out FlowLayoutLineAlignment alignment) &&\\n            FlowLayout1 is not null)\\n        {\\n            FlowLayout1.LineAlignment = alignment;\\n        }\\n    }\\n\\n    private void ItemSpacingSlider_ValueChanged(object sender, RangeBaseValueChangedEventArgs e)\\n    {\\n        if (FlowLayout1 is not null)\\n        {\\n            FlowLayout1.MinItemSpacing = e.NewValue;\\n        }\\n    }\\n\\n    private void LineSpacingSlider_ValueChanged(object sender, RangeBaseValueChangedEventArgs e)\\n    {\\n        if (FlowLayout1 is not null)\\n        {\\n            FlowLayout1.LineSpacing = e.NewValue;\\n        }\\n    }\\n\\n    private void FlowRepeater_ElementPrepared(ItemsRepeater sender, ItemsRepeaterElementPreparedEventArgs args)\\n    {\\n        _realizedFlowLayoutElements.Add(args.Element);\\n        QueueRealizedFlowLayoutCountUpdate();\\n    }\\n\\n    private void FlowRepeater_ElementClearing(ItemsRepeater sender, ItemsRepeaterElementClearingEventArgs args)\\n    {\\n        _realizedFlowLayoutElements.Remove(args.Element);\\n        QueueRealizedFlowLayoutCountUpdate();\\n    }\\n\\n    private void QueueRealizedFlowLayoutCountUpdate()\\n    {\\n        if (_realizedFlowLayoutCountUpdateQueued)\\n        {\\n            return;\\n        }\\n\\n        _realizedFlowLayoutCountUpdateQueued = DispatcherQueue.TryEnqueue(() =>\\n        {\\n            _realizedFlowLayoutCountUpdateQueued = false;\\n            RealizedCountText.Text = $\\"Realized elements: {_realizedFlowLayoutElements.Count} of {FlowLayoutItems.Count}\\";\\n        });\\n    }\\n\\n    // ==========================================================================\\n    // Animated Scrolling ItemsRepeater with Content Sample\\n    // ==========================================================================\\n\\n    private void OnAnimatedItemGotFocus(object sender, RoutedEventArgs e)\\n    {\\n        if (sender is not FrameworkElement item)\\n        {\\n            return;\\n        }\\n\\n        // Store the last focused Index so we can land back on it when focus leaves\\n        // and comes back to the repeater.\\n        PreviouslyFocusedAnimatedScrollRepeaterIndex = animatedScrollRepeater.GetElementIndex(sender as UIElement);\\n\\n        item.StartBringIntoView(new BringIntoViewOptions()\\n        {\\n            VerticalAlignmentRatio = 0.5,\\n            AnimationDesired = true,\\n        });\\n    }\\n    private void OnAnimatedScrollRepeaterGettingFocus(UIElement sender, GettingFocusEventArgs args)\\n    {\\n        // If we have a previously focused index and focus moving from outside the repeater to inside,\\n        // then we can pick the previously focused index and land on that item again.\\n        var lastFocus = args.OldFocusedElement as UIElement;\\n        if (PreviouslyFocusedAnimatedScrollRepeaterIndex != -1 &&\\n            lastFocus != null && animatedScrollRepeater.GetElementIndex(lastFocus) == -1)\\n        {\\n            var item = animatedScrollRepeater.TryGetElement(PreviouslyFocusedAnimatedScrollRepeaterIndex);\\n            args.NewFocusedElement = item;\\n        }\\n    }\\n\\n    private void OnAnimatedItemClicked(object sender, RoutedEventArgs e)\\n    {\\n        if (sender is not Button senderBtn)\\n        {\\n            return;\\n        }\\n\\n        // Update corresponding rectangle with selected color\\n        colorRectangle.Fill = senderBtn.Background;\\n        // announce visual change to automation\\n        UIHelper.AnnounceActionForAccessibility(senderBtn, $\\"Rectangle color set to {senderBtn.Content}\\", \\"RectangleChangedNotificationActivityId\\");\\n        SetUIANamesForSelectedEntry(senderBtn);\\n    }\\n\\n\\n    /* This function occurs each time an element is made ready for use.\\n     * This is necessary for virtualization. */\\n    private void OnElementPrepared(Microsoft.UI.Xaml.Controls.ItemsRepeater sender, Microsoft.UI.Xaml.Controls.ItemsRepeaterElementPreparedEventArgs args)\\n    {\\n        var item = ElementCompositionPreview.GetElementVisual(args.Element);\\n        var svVisual = ElementCompositionPreview.GetElementVisual(Animated_ScrollViewer);\\n        var scrollProperties = ElementCompositionPreview.GetScrollViewerManipulationPropertySet(Animated_ScrollViewer);\\n\\n        var scaleExpresion = scrollProperties.Compositor.CreateExpressionAnimation();\\n        scaleExpresion.SetReferenceParameter(\\"svVisual\\", svVisual);\\n        scaleExpresion.SetReferenceParameter(\\"scrollProperties\\", scrollProperties);\\n        scaleExpresion.SetReferenceParameter(\\"item\\", item);\\n\\n        // Scale the item based on the distance of the item relative to the center of the viewport.\\n        scaleExpresion.Expression = \\"1 - abs((svVisual.Size.Y/2 - scrollProperties.Translation.Y) - (item.Offset.Y + item.Size.Y/2))*(.25/(svVisual.Size.Y/2))\\";\\n\\n        // Animate the item to change size based on distance from center of viewpoint\\n        item.StartAnimation(\\"Scale.X\\", scaleExpresion);\\n        item.StartAnimation(\\"Scale.Y\\", scaleExpresion);\\n        var centerPointExpression = scrollProperties.Compositor.CreateExpressionAnimation();\\n        centerPointExpression.SetReferenceParameter(\\"item\\", item);\\n        centerPointExpression.Expression = \\"Vector3(item.Size.X/2, item.Size.Y/2, 0)\\";\\n        item.StartAnimation(\\"CenterPoint\\", centerPointExpression);\\n    }\\n\\n    private void SetUIANamesForSelectedEntry(Button selectedItem)\\n    {\\n        if (LastSelectedColorButton != null && LastSelectedColorButton.Content is string content)\\n        {\\n            AutomationProperties.SetName(LastSelectedColorButton, content);\\n        }\\n\\n        AutomationProperties.SetName(selectedItem, (string)selectedItem.Content + \\" , selected\\");\\n        LastSelectedColorButton = selectedItem;\\n    }\\n\\n\\n    // ==========================================================================\\n    // VariedImageSize Layout with Filtering/Sorting\\n    // ==========================================================================\\n    private List<Recipe> GetRecipeList()\\n    {\\n        // Initialize list of recipes for varied image size layout sample\\n        var rnd = new Random();\\n        List<Recipe> tempList = new List<Recipe>(\\n                                    Enumerable.Range(0, 1000).Select(k =>\\n                                        new Recipe\\n                                        {\\n                                            Num = k,\\n                                            Name = \\"Recipe \\" + k.ToString(),\\n                                            Color = ColorList[rnd.Next(0, 19)]\\n                                        }));\\n\\n        foreach (Recipe rec in tempList)\\n        {\\n            // Add one food from each option into the recipe's ingredient list and ingredient string\\n            string fruitOption = GetFruits()[rnd.Next(0, 6)];\\n            string vegOption = GetVegetables()[rnd.Next(0, 6)];\\n            string grainOption = GetGrains()[rnd.Next(0, 6)];\\n            string proteinOption = GetProteins()[rnd.Next(0, 6)];\\n            rec.Ingredients = \\"\\\\n\\" + fruitOption + \\"\\\\n\\" + vegOption + \\"\\\\n\\" + grainOption + \\"\\\\n\\" + proteinOption;\\n            rec.IngList = new List<string>() { fruitOption, vegOption, grainOption, proteinOption };\\n\\n            // Add extra ingredients so items have varied heights in the layout\\n            rec.RandomizeIngredients();\\n        }\\n\\n        return tempList;\\n    }\\n\\n    public void FilterRecipes_FilterChanged(object sender, RoutedEventArgs e)\\n    {\\n        UpdateSortAndFilter();\\n    }\\n\\n    private void OnSortAscClick(object sender, RoutedEventArgs e)\\n    {\\n        if (IsSortDescending == true)\\n        {\\n            IsSortDescending = false;\\n            UpdateSortAndFilter();\\n        }\\n    }\\n\\n    private void OnSortDesClick(object sender, RoutedEventArgs e)\\n    {\\n        if (!IsSortDescending == true)\\n        {\\n            IsSortDescending = true;\\n            UpdateSortAndFilter();\\n        }\\n    }\\n\\n    private void UpdateSortAndFilter()\\n    {\\n        // Find all recipes that ingredients include what was typed into the filtering text box\\n        var filteredTypes = staticRecipeData.Where(i => i.Ingredients.Contains(FilterRecipes.Text, StringComparison.InvariantCultureIgnoreCase));\\n        // Sort the recipes by whichever sorting mode was last selected (least to most ingredients by default)\\n        var sortedFilteredTypes = IsSortDescending ?\\n            filteredTypes.OrderByDescending(i => i.IngList.Count()) :\\n            filteredTypes.OrderBy(i => i.IngList.Count());\\n        // Re-initialize MyItemsSource object with this newly filtered data\\n        filteredRecipeData.InitializeCollection(sortedFilteredTypes);\\n\\n        var peer = FrameworkElementAutomationPeer.FromElement(VariedImageSizeRepeater);\\n\\n        peer.RaiseNotificationEvent(AutomationNotificationKind.Other, AutomationNotificationProcessing.ImportantMostRecent, $\\"Filtered recipes, {sortedFilteredTypes.Count()} results.\\", \\"RecipesFilteredNotificationActivityId\\");\\n    }\\n\\n    private void OnAnimatedScrollRepeaterKeyDown(object sender, KeyRoutedEventArgs e)\\n    {\\n        if (e.Handled != true)\\n        {\\n            var targetIndex = -1;\\n            if (e.Key == Windows.System.VirtualKey.Home)\\n            {\\n                targetIndex = PreviouslyFocusedAnimatedScrollRepeaterIndex != 0 ? 0 : -1;\\n            }\\n            else if (e.Key == Windows.System.VirtualKey.End)\\n            {\\n                targetIndex = PreviouslyFocusedAnimatedScrollRepeaterIndex != animatedScrollRepeater.ItemsSourceView.Count - 1 ?\\n                    animatedScrollRepeater.ItemsSourceView.Count - 1 : -1;\\n            }\\n\\n            if (targetIndex != -1)\\n            {\\n                var element = animatedScrollRepeater.GetOrCreateElement(targetIndex);\\n                element.StartBringIntoView();\\n                (element as Control)?.Focus(FocusState.Programmatic);\\n                e.Handled = true;\\n            }\\n        }\\n    }\\n}\\n\\npublic class NestedCategory\\n{\\n    public string CategoryName { get; set; }\\n    public ObservableCollection<string> CategoryItems { get; set; }\\n    public NestedCategory(string catName, ObservableCollection<string> catItems)\\n    {\\n        CategoryName = catName;\\n        CategoryItems = catItems;\\n    }\\n}\\n\\npublic sealed record FlowLayoutItem(string Label);\\n\\n\\npublic partial class MyDataTemplateSelector : DataTemplateSelector\\n{\\n    public DataTemplate? Normal { get; set; }\\n    public DataTemplate? Accent { get; set; }\\n\\n    protected override DataTemplate? SelectTemplateCore(object item)\\n    {\\n        if ((int)item % 2 == 0)\\n        {\\n            return Normal;\\n        }\\n        else\\n        {\\n            return Accent;\\n        }\\n    }\\n}\\n\\npublic partial class StringOrIntTemplateSelector : DataTemplateSelector\\n{\\n    // Define the (currently empty) data templates to return\\n    // These will be \\"filled-in\\" in the XAML code.\\n    public DataTemplate? StringTemplate { get; set; }\\n\\n    public DataTemplate? IntTemplate { get; set; }\\n\\n    protected override DataTemplate? SelectTemplateCore(object item)\\n    {\\n        // Return the correct data template based on the item's type.\\n        if (item.GetType() == typeof(string))\\n        {\\n            return StringTemplate;\\n        }\\n        else if (item.GetType() == typeof(int))\\n        {\\n            return IntTemplate;\\n        }\\n        else\\n        {\\n            return null;\\n        }\\n    }\\n}\\n\\npublic class Bar\\n{\\n    public Bar(double length, int max)\\n    {\\n        Length = length;\\n        MaxLength = max;\\n\\n        Height = length / 4;\\n        MaxHeight = max / 4;\\n\\n        Diameter = length / 6;\\n        MaxDiameter = max / 6;\\n    }\\n    public double Length { get; set; }\\n    public int MaxLength { get; set; }\\n\\n    public double Height { get; set; }\\n    public double MaxHeight { get; set; }\\n\\n    public double Diameter { get; set; }\\n    public double MaxDiameter { get; set; }\\n}\\n\\npublic class Recipe\\n{\\n    public int Num { get; set; }\\n    public string Ingredients { get; set; } = string.Empty;\\n    public List<string> IngList { get; set; } = [];\\n    public string Name { get; set; } = string.Empty;\\n    public string Color { get; set; } = string.Empty;\\n    public int NumIngredients\\n    {\\n        get\\n        {\\n            return IngList.Count();\\n        }\\n    }\\n\\n    public void RandomizeIngredients()\\n    {\\n        // To give the items different heights, give recipes random numbers of random ingredients\\n        Random rndNum = new Random();\\n        Random rndIng = new Random();\\n\\n        ObservableCollection<string> extras = new ObservableCollection<string>{\\n                                                     \\"Garlic\\",\\n                                                     \\"Lemon\\",\\n                                                     \\"Butter\\",\\n                                                     \\"Lime\\",\\n                                                     \\"Feta Cheese\\",\\n                                                     \\"Parmesan Cheese\\",\\n                                                     \\"Breadcrumbs\\"};\\n        for (int i = 0; i < rndNum.Next(0, 4); i++)\\n        {\\n            string newIng = extras[rndIng.Next(0, 6)];\\n            if (!IngList.Contains(newIng))\\n            {\\n                Ingredients += \\"\\\\n\\" + newIng;\\n                IngList.Add(newIng);\\n            }\\n        }\\n\\n    }\\n}\\n\\n// Custom data source class that assigns elements unique IDs, making filtering easier\\npublic partial class MyItemsSource : IList, IKeyIndexMapping, INotifyCollectionChanged\\n{\\n    private List<Recipe> inner = new List<Recipe>();\\n\\n    public MyItemsSource(IEnumerable<Recipe> collection)\\n    {\\n        InitializeCollection(collection);\\n    }\\n\\n    public void InitializeCollection(IEnumerable<Recipe> collection)\\n    {\\n        inner.Clear();\\n        if (collection != null)\\n        {\\n            inner.AddRange(collection);\\n        }\\n\\n        CollectionChanged?.Invoke(this, new NotifyCollectionChangedEventArgs(NotifyCollectionChangedAction.Reset));\\n    }\\n\\n    #region IReadOnlyList<T>\\n    public int Count => this.inner != null ? this.inner.Count : 0;\\n\\n    public object? this[int index]\\n    {\\n        get\\n        {\\n            return inner[index] as Recipe;\\n        }\\n\\n        set\\n        {\\n            if (value is not Recipe recipe)\\n            {\\n                throw new ArgumentException(\\"Value must be of type Recipe.\\", nameof(value));\\n            }\\n\\n            inner[index] = recipe;\\n        }\\n    }\\n\\n    public IEnumerator<Recipe> GetEnumerator() => this.inner.GetEnumerator();\\n\\n    #endregion\\n\\n    #region INotifyCollectionChanged\\n    public event NotifyCollectionChangedEventHandler? CollectionChanged;\\n\\n    #endregion\\n\\n    #region IKeyIndexMapping\\n    public string KeyFromIndex(int index)\\n    {\\n        return inner[index].Num.ToString();\\n    }\\n\\n    public int IndexFromKey(string key)\\n    {\\n        foreach (Recipe item in inner)\\n        {\\n            if (item.Num.ToString() == key)\\n            {\\n                return inner.IndexOf(item);\\n            }\\n        }\\n        return -1;\\n    }\\n\\n    #endregion\\n\\n    #region Unused List methods\\n    IEnumerator IEnumerable.GetEnumerator()\\n    {\\n        throw new NotImplementedException();\\n    }\\n\\n    public int Add(object? value)\\n    {\\n        throw new NotImplementedException();\\n    }\\n\\n    public void Clear()\\n    {\\n        throw new NotImplementedException();\\n    }\\n\\n    public bool Contains(object? value)\\n    {\\n        throw new NotImplementedException();\\n    }\\n\\n    public int IndexOf(object? value)\\n    {\\n        throw new NotImplementedException();\\n    }\\n\\n    public void Insert(int index, object? value)\\n    {\\n        throw new NotImplementedException();\\n    }\\n\\n    public void Remove(object? value)\\n    {\\n        throw new NotImplementedException();\\n    }\\n\\n    public void RemoveAt(int index)\\n    {\\n        throw new NotImplementedException();\\n    }\\n\\n    public void CopyTo(Array array, int index)\\n    {\\n        throw new NotImplementedException();\\n    }\\n\\n    public bool IsFixedSize => throw new NotImplementedException();\\n\\n    public bool IsReadOnly => throw new NotImplementedException();\\n\\n    public bool IsSynchronized => throw new NotImplementedException();\\n\\n    public object SyncRoot => throw new NotImplementedException();\\n\\n    #endregion\\n}\\n","PullToRefresh":"// Copyright (c) Microsoft Corporation. All rights reserved.\\n// Licensed under the MIT License.\\n\\nusing Microsoft.UI.Composition;\\nusing Microsoft.UI.Dispatching;\\nusing Microsoft.UI.Xaml;\\nusing Microsoft.UI.Xaml.Controls;\\nusing Microsoft.UI.Xaml.Hosting;\\nusing Microsoft.UI.Xaml.Media.Imaging;\\nusing Microsoft.UI.Xaml.Navigation;\\nusing System;\\nusing System.Collections.ObjectModel;\\nusing Windows.Foundation;\\nusing Windows.Foundation.Metadata;\\nusing Windows.UI.ViewManagement;\\nusing WinUIGallery.Helpers;\\n\\nnamespace WinUIGallery.ControlPages;\\n\\npublic sealed partial class PullToRefreshPage : Page\\n{\\n    private ObservableCollection<string> items1 = new ObservableCollection<string>();\\n    private ObservableCollection<string> items2 = new ObservableCollection<string>();\\n    private DispatcherTimer timer1 = new DispatcherTimer();\\n    private DispatcherTimer timer2 = new DispatcherTimer();\\n    private Visual? visualizerContentVisual;\\n    private static RefreshContainer? rc2;\\n    private RefreshVisualizer? rv2;\\n\\n    private int items1AddedCount = 0;\\n    private int items2AddedCount = 0;\\n\\n    private Deferral? RefreshCompletionDeferral1\\n    {\\n        get;\\n        set;\\n    }\\n    private Deferral? RefreshCompletionDeferral2\\n    {\\n        get;\\n        set;\\n    }\\n\\n    public PullToRefreshPage()\\n    {\\n        this.InitializeComponent();\\n\\n        if (ApiInformation.IsApiContractPresent(\\"Windows.Foundation.UniversalApiContract\\", 6))\\n        {\\n            rc2 = new RefreshContainer();\\n            rc2.RefreshRequested +=\\n                new TypedEventHandler<RefreshContainer, RefreshRequestedEventArgs>(rc2_RefreshRequested);\\n\\n            rv2 = new RefreshVisualizer();\\n            rv2.RefreshStateChanged +=\\n                new TypedEventHandler<RefreshVisualizer, RefreshStateChangedEventArgs>(rv2_RefreshStateChanged);\\n\\n            Image ptrImage = new Image();\\n            AccessibilitySettings accessibilitySettings = new AccessibilitySettings();\\n            // Checking light theme\\n            if ((ThemeHelper.RootTheme == ElementTheme.Light || Application.Current.RequestedTheme == ApplicationTheme.Light)\\n                && !accessibilitySettings.HighContrast)\\n            {\\n                ptrImage.Source = new BitmapImage(new Uri(\\"ms-appx:///Assets/SampleMedia/SunBlack.png\\"));\\n            }\\n            // Checking high contrast theme\\n            else if (accessibilitySettings.HighContrast\\n                      && accessibilitySettings.HighContrastScheme.Equals(\\"High Contrast Black\\"))\\n            {\\n                ptrImage.Source = new BitmapImage(new Uri(\\"ms-appx:///Assets/SampleMedia/SunBlack.png\\"));\\n            }\\n            else\\n            {\\n                ptrImage.Source = new BitmapImage(new Uri(\\"ms-appx:///Assets/SampleMedia/SunWhite.png\\"));\\n\\n            }\\n\\n            ptrImage.Width = 35;\\n            ptrImage.Height = 35;\\n\\n            rv2.Content = ptrImage;\\n            rc2.Visualizer = rv2;\\n\\n            ListView lv2 = new ListView\\n            {\\n                Width = 200,\\n                Height = 200,\\n                BorderThickness = new Thickness() { Left = 1, Top = 1, Right = 1, Bottom = 1 },\\n                HorizontalAlignment = HorizontalAlignment.Center\\n            };\\n\\n            // Equivalent to BorderBrush=\\"{ThemeResource TextControlBorderBrush}\\", so the brush updates when the theme changes.\\n            lv2.SetThemeResourceBinding(Control.BorderBrushProperty, \\"TextControlBorderBrush\\");\\n\\n\\n            rc2.Content = lv2;\\n\\n            Ex2Grid.Children.Add(rc2);\\n            Grid.SetRow(rc2, 1);\\n            Grid.SetRow(lv2, 1);\\n\\n            timer1.Interval = new TimeSpan(0, 0, 0, 0, 500);\\n            timer1.Tick += Timer1_Tick;\\n\\n            timer2.Interval = new TimeSpan(0, 0, 0, 0, 800);\\n            timer2.Tick += Timer2_Tick;\\n\\n            foreach (var c in @\\"AcrylicBrush ColorPicker NavigationView ParallaxView PersonPicture PullToRefreshPage RatingsControl RevealBrush TreeView\\".Split(' '))\\n                items1.Add(c);\\n            lv.ItemsSource = items1;\\n\\n            foreach (var c in @\\"Mike Ben Barbra Claire Justin Shawn Drew Lili\\".Split(' '))\\n                items2.Add(c);\\n            lv2.ItemsSource = items2;\\n\\n            this.Loaded += PullToRefreshPage_Loaded;\\n        }\\n    }\\n\\n    private void PullToRefreshPage_Loaded(object sender, RoutedEventArgs e)\\n    {\\n        if (rv2 is null)\\n        {\\n            return;\\n        }\\n\\n        visualizerContentVisual = ElementCompositionPreview.GetElementVisual(rv2.Content);\\n        this.Loaded -= PullToRefreshPage_Loaded;\\n    }\\n\\n    private void Timer1_Tick(object? sender, object e)\\n    {\\n        DispatcherQueue disp = rc.DispatcherQueue;\\n        if (disp.HasThreadAccess)\\n        {\\n            Timer1_TickImpl();\\n        }\\n        else\\n        {\\n            disp.TryEnqueue(DispatcherQueuePriority.Normal, () =>\\n            {\\n                Timer1_TickImpl();\\n            });\\n        }\\n    }\\n\\n    private void Timer2_Tick(object? sender, object e)\\n    {\\n        if (rc2 is null)\\n        {\\n            return;\\n        }\\n\\n        DispatcherQueue disp = rc2.DispatcherQueue;\\n        if (disp.HasThreadAccess)\\n        {\\n            Timer2_TickImpl();\\n        }\\n        else\\n        {\\n            disp.TryEnqueue(DispatcherQueuePriority.Normal, () =>\\n            {\\n                Timer2_TickImpl();\\n            });\\n        }\\n    }\\n\\n    private void Timer1_TickImpl()\\n    {\\n        items1.Insert(0, \\"NewControl \\" + items1AddedCount++);\\n        timer1.Stop();\\n        if (this.RefreshCompletionDeferral1 != null)\\n        {\\n            this.RefreshCompletionDeferral1.Complete();\\n            this.RefreshCompletionDeferral1.Dispose();\\n            this.RefreshCompletionDeferral1 = null;\\n        }\\n    }\\n\\n    private void Timer2_TickImpl()\\n    {\\n        items2.Insert(0, \\"New Friend \\" + items2AddedCount++);\\n        timer2.Stop();\\n        if (this.RefreshCompletionDeferral2 != null)\\n        {\\n            this.RefreshCompletionDeferral2.Complete();\\n            this.RefreshCompletionDeferral2.Dispose();\\n            this.RefreshCompletionDeferral2 = null;\\n        }\\n    }\\n\\n    protected override void OnNavigatedFrom(NavigationEventArgs e)\\n    {\\n        base.OnNavigatedFrom(e);\\n        timer1.Stop();\\n        timer2.Stop();\\n    }\\n\\n    private void rc_RefreshRequested(RefreshContainer sender, RefreshRequestedEventArgs args)\\n    {\\n        this.RefreshCompletionDeferral1 = args.GetDeferral();\\n        //Do some work to show new content!\\n        timer1.Start();\\n    }\\n    private void rc2_RefreshRequested(RefreshContainer sender, RefreshRequestedEventArgs args)\\n    {\\n        this.RefreshCompletionDeferral2 = args.GetDeferral();\\n        //Do some work to show new content!\\n        timer2.Start();\\n    }\\n\\n    private void rv2_RefreshStateChanged(RefreshVisualizer sender, RefreshStateChangedEventArgs args)\\n    {\\n        visualizerContentVisual?.StopAnimation(\\"RotationAngle\\");\\n    }\\n}\\n"},"customLayoutSources":["WinUIGallery/Layouts/ActivityFeedLayout.cs","WinUIGallery/Layouts/VariedImageSizeLayout.cs"],"data":{"bars":[300,25,175],"maxLength":425,"numberCount":500,"flowCount":500,"colors":["Blue","BlueViolet","Crimson","DarkCyan","DarkGoldenrod","DarkMagenta","DarkOliveGreen","DarkRed","DarkSlateBlue","DeepPink","IndianRed","MediumSlateBlue","Maroon","MidnightBlue","Peru","SaddleBrown","SteelBlue","OrangeRed","Firebrick","DarkKhaki"],"mixed":[64,"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",128,"Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",256,"Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",512,"Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",1024],"categories":[{"id":"Fruits","items":["Apricots","Bananas","Grapes","Strawberries","Watermelon","Plums","Blueberries"]},{"id":"Vegetables","items":["Broccoli","Spinach","Sweet potato","Cauliflower","Onion","Brussels sprouts","Carrots"]},{"id":"Grains","items":["Rice","Quinoa","Pasta","Bread","Farro","Oats","Barley"]},{"id":"Proteins","items":["Steak","Chicken","Tofu","Salmon","Pork","Chickpeas","Eggs"]}],"recipeCount":1000,"extras":["Garlic","Lemon","Butter","Lime","Feta Cheese","Parmesan Cheese","Breadcrumbs"],"refreshControls":["AcrylicBrush","ColorPicker","NavigationView","ParallaxView","PersonPicture","PullToRefreshPage","RatingsControl","RevealBrush","TreeView"],"refreshFriends":["Mike","Ben","Barbra","Claire","Justin","Shawn","Drew","Lili"],"refreshDelays":[500,800]},"palettes":{"Light":{"SystemChromeLowColor":"#F2F2F2FF","SystemControlBackgroundChromeMediumBrush":"#E6E6E6FF","SystemControlBackgroundBaseLowBrush":"#00000033","SystemControlBackgroundAccentBrush":"#0078D4FF","SystemControlForegroundChromeWhiteBrush":"#FFFFFFFF","SystemControlForegroundAltHighBrush":"#FFFFFFFF","TextFillColorInverseBrush":"#FFFFFFFF","SystemControlForegroundBaseHighBrush":"#000000FF","ControlFillColorDefaultBrush":"#FFFFFFB3","ControlStrokeColorDefaultBrush":"#0000000F"},"Dark":{"SystemChromeLowColor":"#171717FF","SystemControlBackgroundChromeMediumBrush":"#1F1F1FFF","SystemControlBackgroundBaseLowBrush":"#FFFFFF33","SystemControlBackgroundAccentBrush":"#0078D4FF","SystemControlForegroundChromeWhiteBrush":"#FFFFFFFF","SystemControlForegroundAltHighBrush":"#000000FF","TextFillColorInverseBrush":"#000000E4","SystemControlForegroundBaseHighBrush":"#FFFFFFFF","ControlFillColorDefaultBrush":"#FFFFFF0F","ControlStrokeColorDefaultBrush":"#FFFFFF12"},"HighContrast":{"SystemChromeLowColor":"#1F1F1FFF","SystemControlBackgroundChromeMediumBrush":"#000000FF","SystemControlBackgroundBaseLowBrush":"#000000FF","SystemControlBackgroundAccentBrush":"#000000FF","SystemControlForegroundChromeWhiteBrush":"#FFFFFFFF","SystemControlForegroundAltHighBrush":"#FFFFFFFF","TextFillColorInverseBrush":"#FFFFFFFF","TextControlBorderBrush":"#FFFFFFFF","SystemControlForegroundBaseHighBrush":"#FFFFFFFF","ControlFillColorDefaultBrush":"#000000FF","ControlStrokeColorDefaultBrush":"#FFFFFFFF"}},"sdkResources":{"path":"references/mit-xaml-generated/generic.xaml","sha256":"0fdca24b6807557325ce279e1e9b80361537f1093fa049530d34684208791160"}}`)},B=z._repository.data,V={Blue:`#0000ff`,BlueViolet:`#8a2be2`,Crimson:`#dc143c`,DarkCyan:`#008b8b`,DarkGoldenrod:`#b8860b`,DarkMagenta:`#8b008b`,DarkOliveGreen:`#556b2f`,DarkRed:`#8b0000`,DarkSlateBlue:`#483d8b`,DeepPink:`#ff1493`,IndianRed:`#cd5c5c`,MediumSlateBlue:`#7b68ee`,Maroon:`#800000`,MidnightBlue:`#191970`,Peru:`#cd853f`,SaddleBrown:`#8b4513`,SteelBlue:`#4682b4`,OrangeRed:`#ff4500`,Firebrick:`#b22222`,DarkKhaki:`#bdb76b`};function H(e=Math.random){let t=(t,n=t.length)=>t[Math.floor(e()*n)];return Array.from({length:B.recipeCount},(n,r)=>{let i=B.categories.map(e=>t(e.items,6));for(let n=0;n<Math.floor(e()*4);n++){let e=t(B.extras,6);i.includes(e)||i.push(e)}return{id:String(r),text:`Recipe ${r}`,num:r,name:`Recipe ${r}`,color:V[t(B.colors,19)],ingredients:`
`+i.join(`
`),ingredientList:i}})}var ie=`import { LocalizedText } from "./GalleryLanguage";
import { SourceCode } from './SourceCode';
import {createContext,useContext,useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {Header} from './ButtonPage';
import {useGalleryTheme} from './gallery-theme';
import {GalleryButton,GalleryComboBox,GalleryOption,GalleryExpander,GalleryExpanderHeader,GalleryRadioButton,GallerySlider} from './GalleryControls';
import {SceneView,StackPanel,ScrollViewer,ItemsRepeater,RefreshContainer,Border,TextBlock,Button,Grid,Ellipse,Rectangle,ListView,Image,TextBox} from 'winui-wasm/react';
import {StackLayout,UniformGridLayout,FlowLayout,ActivityFeedLayout,VariedImageSizeLayout,FlowLayoutLineAlignment,Orientation,RendererBackend,HorizontalAlignment,VerticalAlignment,ScrollMode,ScrollBarVisibility,GridUnit,ThemeMode,EventKind,type Scene,type RefreshContainerController as RefreshControl,type RefreshVisualizerController as VisualizerControl,type ItemsRepeaterController as RepeaterControl,type ScrollViewerController as ScrollControl,type SceneEvent} from 'winui-wasm';
import official from './official-repeater-refresh.json';
import {galleryData,galleryColors,createGalleryRecipes} from './repeater-gallery-data';
import pageSource from './RepeaterRefreshPage.tsx?raw';
import {extractSampleSource} from './sample-source';
import './repeater-gallery.css';
type Kind='ItemsRepeater'|'StackLayout'|'UniformGridLayout'|'RefreshContainer'|'RefreshVisualizer';
type RepeaterDebug=Pick<RepeaterControl,'snapshot'|'scrollIntoView'|'focusItem'|'isDisposed'|'items'|'realizedItems'|'properties'>;
type SampleName=Exclude<keyof typeof official,'_repository'>;
const Context=createContext({theme:ThemeMode.Light,backend:RendererBackend.Canvas2D});
const accent={resource:'SystemControlBackgroundAccentBrush'};
const star={unit:GridUnit.Star,value:1};
const centered={horizontalAlignment:HorizontalAlignment.Center,verticalAlignment:VerticalAlignment.Center};
declare global{interface Window{repeaterScenes:Record<string,Scene>;refreshControls:Record<string,RefreshControl|VisualizerControl>;repeaterGalleryViews:Record<string,RepeaterDebug>;}}
function remember(id:string,scene:Scene){window.repeaterScenes??={};window.repeaterScenes[id]=scene;}
function rememberView(id:string,view:RepeaterDebug){window.repeaterGalleryViews??={};window.repeaterGalleryViews[id]=view;}
function palette(key:string){const {theme}=useContext(Context);return (official._repository.palettes[theme]as Record<string,string>)[key]??'#000000';}
function nativeDependencies(source:string){const seen=new Set<string>();let result=source;for(let pass=0;pass<4;pass++){const keys=Array.from(result.matchAll(/\\{StaticResource ([^}]+)\\}/g),match=>match[1]);let added=false;for(const key of keys){if(seen.has(key))continue;seen.add(key);const resource=(official._repository.resources as Record<string,string>)[key];if(resource&&!result.includes(resource)){result+='\\n\\n'+resource;added=true;}}if(!added)break;}return result;}
function Example({id,name,children,native}:{id:string;name:SampleName;children:ReactNode;native?:string}){
 const[tab,setTab]=useState(false);const sample=official[name];return <section id={id} className="example basic-example" data-official-sample={name}><h2><LocalizedText>{sample.title}</LocalizedText></h2><div className="example-card">{children}<GalleryExpander className="source"><GalleryExpanderHeader>Source code</GalleryExpanderHeader><div className="source-tabs"><GalleryButton className={!tab?'active':''} onClick={()=>setTab(false)}>TypeScript / React</GalleryButton><GalleryButton className={tab?'active':''} onClick={()=>setTab(true)}>Official repository</GalleryButton></div><SourceCode language={tab ? 'xaml' : 'tsx'}>{tab?nativeDependencies(native??sample.runtimeXaml):extractSampleSource(pageSource,id)}</SourceCode></GalleryExpander></div></section>;
}
function Live({children,options}:{children:ReactNode;options?:ReactNode}){return <div className={\`basic-live \${options?'with-options':''}\`}><div className="basic-preview repeater-gallery-preview">{children}</div>{options&&<aside className="options repeater-gallery-options">{options}</aside>}</div>;}
function RadioOptions({label,choices,value,onChange}:{label:string;choices:readonly string[];value:number;onChange:(index:number)=>void}){return <div role="group" aria-label={label}><p><LocalizedText>{label}</LocalizedText></p>{choices.map((choice,index)=><GalleryRadioButton key={choice} horizontalAlignment={HorizontalAlignment.Stretch} label={choice} checked={value===index} onValueChanged={checked=>{if(checked)onChange(index);}}/>)}</div>;}

// @sample:repeater-basic:start
function BasicSample(){
 const shared=useContext(Context),[layout,setLayout]=useState(0),[bars,setBars]=useState(()=>galleryData.bars.map((length,i)=>({id:String(i),length}))),serial=useRef(3);
 const chrome=palette('SystemChromeLowColor');
 const layouts=[new StackLayout({spacing:8}),new StackLayout({orientation:Orientation.Horizontal,spacing:8}),new UniformGridLayout({minColumnSpacing:8,minRowSpacing:8})];
 const keys=['VerticalStackLayout','HorizontalStackLayout','UniformGridLayout'],templates=['HorizontalBarTemplate','VerticalBarTemplate','CircularTemplate'];
 const native=[official.ItemsRepeaterBasicNonInteractiveItems.runtimeXaml.replace('HorizontalBarTemplate',templates[layout]).replace('VerticalStackLayout',keys[layout]),official._repository.resources[keys[layout]as keyof typeof official._repository.resources],official._repository.resources[templates[layout]as keyof typeof official._repository.resources]].join('\\n\\n');
 return <Example id="repeater-basic" name="ItemsRepeaterBasicNonInteractiveItems" native={native}><Live options={<><GalleryButton minWidth={150} disabled={false} onClick={()=>setBars(items=>[...items,{id:String(serial.current++),length:Math.floor(Math.random()*galleryData.maxLength)}])}>Add Item</GalleryButton><GalleryButton minWidth={150} disabled={!bars.length} onClick={()=>setBars(items=>items.slice(1))}>Remove Item</GalleryButton><RadioOptions label="Layout" choices={['StackLayout - Vertical','StackLayout - Horizontal','UniformGridLayout']} value={layout} onChange={setLayout}/></>}>
 <SceneView {...shared} autoHeight onReady={s=>remember('basic',s)}><ScrollViewer maxHeight={500} horizontalScrollMode={ScrollMode.Auto} horizontalScrollBarVisibility={ScrollBarVisibility.Auto} isVerticalScrollChainingEnabled={false}><ItemsRepeater maxWidth={[437,6000,540][layout]} items={bars} layout={layouts[layout]} onReady={n=>rememberView('basic',n)} renderItem={item=>layout===0?<Border width={425} background={chrome}><Rectangle width={item.length} height={24} fill={accent} horizontalAlignment={HorizontalAlignment.Left}/></Border>:layout===1?<Border height={Math.trunc(425/4)} background={chrome}><Rectangle width={48} height={item.length/4} fill={accent} verticalAlignment={VerticalAlignment.Top}/></Border>:<Grid><Ellipse width={Math.trunc(425/6)} height={Math.trunc(425/6)} background={chrome} {...centered}/><Ellipse width={item.length/6} height={item.length/6} background={accent} {...centered}/></Grid>}/></ScrollViewer></SceneView>
 </Live></Example>;
}
// @sample:repeater-basic:end

// @sample:repeater-virtual:start
function NumberedSample(){
 const shared=useContext(Context),[layout,setLayout]=useState(1);const chrome=palette('SystemControlBackgroundChromeMediumBrush');
 const items=useMemo(()=>Array.from({length:galleryData.numberCount},(_,value)=>({id:String(value),text:String(value),value})),[]);
 const name=layout===0?'UniformGridLayout2':'MyFeedLayout';
 return <Example id="repeater-virtual" name="ItemsRepeaterVirtualizingScrollableListItems" native={official.ItemsRepeaterVirtualizingScrollableListItems.runtimeXaml.replace('MyFeedLayout',name)+'\\n\\n'+official._repository.resources[name]}><Live options={<RadioOptions label="Layout" choices={['Uniform grid','Custom virtualizing layout']} value={layout} onChange={setLayout}/>}>
 <SceneView {...shared} autoHeight onReady={s=>remember('virtual',s)}><ScrollViewer height={400} padding={[0,0,16,0]} isVerticalScrollChainingEnabled={false}><ItemsRepeater margin={[0,0,12,0]} items={items} layout={layout===0?new UniformGridLayout({minItemWidth:108,minItemHeight:108,minColumnSpacing:12,minRowSpacing:12}):new ActivityFeedLayout({minItemSize:[80,108],columnSpacing:12,rowSpacing:12})} onReady={n=>rememberView('virtual',n)} renderItem={item=><Border background={item.value%2?accent:chrome}><TextBlock text={item.text} {...centered}/></Border>}/></ScrollViewer></SceneView>
 </Live></Example>;
}
// @sample:repeater-virtual:end

// @sample:repeater-flow:start
function FlowSample(){
 const shared=useContext(Context),[orientation,setOrientation]=useState(0),[alignment,setAlignment]=useState(FlowLayoutLineAlignment.Start),[itemSpacing,setItemSpacing]=useState(8),[lineSpacing,setLineSpacing]=useState(8),[realized,setRealized]=useState(0);
 const fill=palette('ControlFillColorDefaultBrush'),stroke=palette('ControlStrokeColorDefaultBrush');
 const items=useMemo(()=>Array.from({length:galleryData.flowCount},(_,i)=>({id:String(i+1),text:\`Item \${i+1}\`})),[]),control=useRef<RepeaterDebug|null>(null);
 const update=()=>{const view=control.current;if(view&&!view.isDisposed)setRealized(view.realizedItems().length);};
 const native=official.FlowLayoutVirtualization.runtimeXaml.replace('LineAlignment="Start"',\`LineAlignment="\${alignment}"\`).replace('LineSpacing="8"',\`LineSpacing="\${lineSpacing}"\`).replace('MinItemSpacing="8"',\`MinItemSpacing="\${itemSpacing}"\`).replace('<FlowLayout','<FlowLayout Orientation="'+(orientation===0?'Horizontal':'Vertical')+'"');
 return <Example id="repeater-flow" name="FlowLayoutVirtualization" native={native}><Live options={<><RadioOptions label="Orientation" choices={['Horizontal','Vertical']} value={orientation} onChange={setOrientation}/><label>LineAlignment<GalleryComboBox aria-label="Line alignment" value={alignment} onValueChanged={value=>setAlignment(value as FlowLayoutLineAlignment)}>{[FlowLayoutLineAlignment.Start,FlowLayoutLineAlignment.Center,FlowLayoutLineAlignment.SpaceBetween,FlowLayoutLineAlignment.SpaceEvenly].map(v=><GalleryOption key={v} value={v}>{v===FlowLayoutLineAlignment.SpaceBetween?'Space between':v===FlowLayoutLineAlignment.SpaceEvenly?'Space evenly':v}</GalleryOption>)}</GalleryComboBox></label><label>MinItemSpacing<GallerySlider aria-label="Minimum item spacing" min={0} max={32} step={2} value={itemSpacing} onValueChanged={setItemSpacing}/></label><label>LineSpacing<GallerySlider aria-label="Line spacing" min={0} max={32} step={2} value={lineSpacing} onValueChanged={setLineSpacing}/></label></>}>
 <p><LocalizedText>Scroll through 500 items. ItemsRepeater creates and recycles only the elements needed near the viewport.</LocalizedText></p>
 <SceneView {...shared} autoHeight onReady={s=>remember('flow',s)}><ScrollViewer width={520} height={320} horizontalAlignment={HorizontalAlignment.Left} horizontalScrollMode={orientation===0?ScrollMode.Disabled:ScrollMode.Enabled} horizontalScrollBarVisibility={orientation===0?ScrollBarVisibility.Disabled:ScrollBarVisibility.Auto} verticalScrollMode={orientation===0?ScrollMode.Enabled:ScrollMode.Disabled} verticalScrollBarVisibility={orientation===0?ScrollBarVisibility.Auto:ScrollBarVisibility.Disabled} isHorizontalScrollChainingEnabled={false} isVerticalScrollChainingEnabled={false}><ItemsRepeater items={items} horizontalCacheLength={0} verticalCacheLength={0} layout={new FlowLayout({orientation:orientation===0?Orientation.Horizontal:Orientation.Vertical,lineAlignment:alignment,minItemSpacing:itemSpacing,lineSpacing})} onReady={n=>{control.current=n;rememberView('flow',n);update();}} onElementPrepared={update} onElementClearing={update} renderItem={item=><Border width={96} height={64} background={fill} borderBrush={stroke} borderThickness={[1,1,1,1]} cornerRadius={4}><TextBlock text={item.text} {...centered}/></Border>}/></ScrollViewer></SceneView>
 <output aria-live="polite">Realized elements: {realized} of 500</output>
 </Live></Example>;
}
// @sample:repeater-flow:end

// @sample:repeater-mixed:start
function MixedSample(){
 const shared=useContext(Context),chrome=palette('SystemControlBackgroundChromeMediumBrush'),white=palette('SystemControlForegroundChromeWhiteBrush');
 const items=useMemo(()=>galleryData.mixed.map((value,i)=>({id:String(i),text:String(value),value})),[]);
 return <Example id="repeater-mixed" name="ItemsrepeaterMixedTypeCollection"><Live><p><LocalizedText>This is an ItemsRepeater that displays both integer and string items. It uses a DataTemplateSelector to choose the correct layout for each of its items.</LocalizedText></p>
 <SceneView {...shared} autoHeight onReady={s=>remember('mixed',s)}><ItemsRepeater margin={[0,0,12,0]} items={items} layout={new UniformGridLayout({minItemWidth:200,minItemHeight:200})} onReady={n=>rememberView('mixed',n)} renderItem={item=><Grid margin={[10,10,10,10]} background={typeof item.value==='string'?accent:chrome}><TextBlock text={item.text} padding={[10,10,10,10]} wrap={typeof item.value==='string'} fontSize={typeof item.value==='number'?46:14} fontWeight={typeof item.value==='number'?300:400} foreground={typeof item.value==='string'?white:undefined} {...centered}/></Grid>}/></SceneView>
 </Live></Example>;
}
// @sample:repeater-mixed:end

// @sample:repeater-nested:start
function NestedSample(){
 const shared=useContext(Context),white=palette('SystemControlForegroundChromeWhiteBrush');const categories=useMemo(()=>galleryData.categories.map(c=>({...c,text:c.id})),[]);
 return <Example id="repeater-nested" name="LayingOutNestedItemsrepeaters"><Live><SceneView {...shared} autoHeight onReady={s=>remember('nested',s)}><ScrollViewer horizontalScrollMode={ScrollMode.Auto} horizontalScrollBarVisibility={ScrollBarVisibility.Auto}><ItemsRepeater items={categories} verticalAlignment={VerticalAlignment.Top} layout={new StackLayout()} onReady={n=>rememberView('nested',n)} renderItem={category=><StackPanel><TextBlock text={category.id} padding={[8,8,8,8]} fontSize={28}/><ItemsRepeater items={category.items} layout={new StackLayout({orientation:Orientation.Horizontal})} renderItem={item=><Grid margin={[10,10,10,10]} background={accent}><TextBlock text={item} padding={[10,10,10,10]} foreground={white} wrap {...centered}/></Grid>}/></StackPanel>}/></ScrollViewer></SceneView></Live></Example>;
}
// @sample:repeater-nested:end

// @sample:repeater-animated:start
function AnimatedSample(){
 const shared=useContext(Context),inverse=palette('TextFillColorInverseBrush'),[color,setColor]=useState<string|null>(null),selected=useRef<string|null>(null);
 const items=useMemo(()=>galleryData.colors.map(text=>({id:text,text})),[]);
 return <Example id="repeater-animated" name="ItemsRepeaterAnimatedScrollingContentDisplay"><Live><SceneView {...shared} autoHeight onReady={s=>remember('animated',s)}><Grid columns={[star,star]}><ScrollViewer width={250} height={175}><ItemsRepeater items={items} isScrollCenterScaleEnabled isFocusCenteringEnabled isKeyboardNavigationEnabled onReady={n=>rememberView('animated',n)} renderItem={item=><Button text={item.text} background={galleryColors[item.text]} foreground={inverse} horizontalAlignment={HorizontalAlignment.Stretch} onClick={()=>{setColor(galleryColors[item.text]);selected.current=item.text;}} accessibleName={item.text+(selected.current===item.text?' , selected':'')}/>}/></ScrollViewer><Rectangle column={1} width={150} height={150} margin={[10,0,0,0]} fill={color} stroke={{resource:'SystemControlForegroundBaseHighBrush'}} strokeThickness={1} accessibleName="ColorRectangle"/></Grid></SceneView></Live></Example>;
}
// @sample:repeater-animated:end

// @sample:repeater-recipes:start
function RecipeSample(){
 const shared=useContext(Context),background=palette('SystemControlBackgroundBaseLowBrush'),inverse=palette('SystemControlForegroundAltHighBrush'),[filter,setFilter]=useState(''),[descending,setDescending]=useState(false),[changed,setChanged]=useState(false);
 const source=useMemo(()=>createGalleryRecipes(),[]);
 const items=useMemo(()=>!changed?source:source.filter(r=>r.ingredients.toLowerCase().includes(filter.toLowerCase())).sort((a,b)=>(a.ingredientList.length-b.ingredientList.length)*(descending?-1:1)),[source,filter,descending,changed]);
 return <Example id="repeater-recipes" name="ItemsRepeaterVirtualizedContentHeavyLayout"><Live><SceneView {...shared} autoHeight onReady={s=>remember('recipes',s)}><Grid height={600} columns={[star,star]}><ScrollViewer><ItemsRepeater items={items} layout={new VariedImageSizeLayout({width:200})} onReady={n=>rememberView('recipes',n)} renderItem={recipe=><Border margin={[5,5,5,5]} borderThickness={[1,1,1,1]} background={background}><StackPanel><StackPanel height={75} margin={[8,8,8,8]} background={recipe.color} opacity={0.8}><TextBlock text={String(recipe.num)} fontSize={35} padding={[12,12,12,12]} foreground={inverse} horizontalAlignment={HorizontalAlignment.Center}/></StackPanel><TextBlock text={recipe.name} margin={[15,0,10,0]} fontSize={28} wrap/><TextBlock text={recipe.ingredients} margin={[15,0,15,15]}/></StackPanel></Border>}/></ScrollViewer><StackPanel column={1} margin={[10,0,0,0]}><TextBox width={200} header="Filter by ingredient..." accessibleName="Filter by ingredient..." margin={[0,0,0,20]} text={filter} onTextChanged={event=>{setFilter(event.text??'');setChanged(true);}}/><TextBlock text="Sort by number of ingredients" margin={[0,0,0,10]}/><Button text="Least to most" margin={[0,0,0,5]} onClick={()=>{if(descending){setDescending(false);setChanged(true);}}}/><Button text="Most to least" onClick={()=>{if(!descending){setDescending(true);setChanged(true);}}}/></StackPanel></Grid></SceneView><span className="repeater-screenreader" aria-live="polite">{changed?\`Filtered recipes, \${items.length} results.\`:''}</span></Live></Example>;
}
// @sample:repeater-recipes:end

// @sample:refresh-basic:start
function BasicRefreshSample(){
 const shared=useContext(Context),[items,setItems]=useState(()=>galleryData.refreshControls),counter=useRef(0),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const refresh=async()=>{await new Promise<void>(resolve=>setTimeout(resolve,500));if(alive.current)setItems(values=>[\`NewControl \${counter.current++}\`,...values]);};
 return <Example id="refresh-basic" name="BasicPulltorefresh" native={official.BasicPulltorefresh.runtimeXaml}><Live><SceneView {...shared} autoHeight onReady={s=>remember('refresh',s)}><RefreshContainer horizontalAlignment={HorizontalAlignment.Center} verticalAlignment={VerticalAlignment.Center} onReady={control=>{window.refreshControls??={};window.refreshControls.basic=control;}} onRefresh={refresh}><ListView minWidth={200} height={200} items={items} borderBrush={{resource:'TextControlBorderBrush'}} borderThickness={[1,1,1,1]}/></RefreshContainer></SceneView></Live></Example>;
}
// @sample:refresh-basic:end

// @sample:refresh-custom:start
function CustomRefreshSample(){
 const shared=useContext(Context),[items,setItems]=useState(()=>galleryData.refreshFriends),counter=useRef(0),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const refresh=async()=>{await new Promise<void>(resolve=>setTimeout(resolve,800));if(alive.current)setItems(values=>[\`New Friend \${counter.current++}\`,...values]);};
 return <Example id="refresh-custom" name="CustomIconPulltorefresh" native={official.CustomIconPulltorefresh.runtimeXaml+'\\n\\n'+official._repository.pageCodeBehind.PullToRefresh}><Live><SceneView {...shared} autoHeight onReady={s=>remember('refresh-custom',s)}><RefreshContainer horizontalAlignment={HorizontalAlignment.Center} verticalAlignment={VerticalAlignment.Center} visualizerOptions={{isRotationEnabled:false}} visualizerContent={<Image source={'/official/repeater/'+(shared.theme===ThemeMode.Dark?'SunWhite.png':'SunBlack.png')} width={35} height={35}/>} onReady={control=>{window.refreshControls??={};window.refreshControls.custom=control;}} onRefresh={refresh}><ListView width={200} height={200} items={items} borderBrush={{resource:'TextControlBorderBrush'}} borderThickness={[1,1,1,1]}/></RefreshContainer></SceneView></Live></Example>;
}
// @sample:refresh-custom:end

export function RepeaterRefreshPage({kind}:{kind:Kind}){
 const[theme,setTheme]=useGalleryTheme(),[backend,setBackend]=useState(RendererBackend.Canvas2D);
 const repeaters=['ItemsRepeater','StackLayout','UniformGridLayout'].includes(kind);
 return <Context.Provider value={{theme,backend}}><Header title={repeaters?'ItemsRepeater':'PullToRefresh'} theme={theme} onTheme={setTheme}/><main className="stage-main official-motion"><div className="effects-options"><label>Renderer <GalleryComboBox aria-label="Renderer" value={backend} onValueChanged={value=>setBackend(value as RendererBackend)}>{Object.values(RendererBackend).map(value=><GalleryOption key={value}>{value}</GalleryOption>)}</GalleryComboBox></label></div>{repeaters?<><BasicSample/><NumberedSample/><FlowSample/><MixedSample/><NestedSample/><AnimatedSample/><RecipeSample/></>:<><BasicRefreshSample/><CustomRefreshSample/></>}</main></Context.Provider>;
}
`,U=re(),W=(0,R.createContext)({theme:k.Light,backend:i.Canvas2D}),G={resource:`SystemControlBackgroundAccentBrush`},K={unit:te.Star,value:1},q={horizontalAlignment:_.Center,verticalAlignment:E.Center};function J(e,t){window.repeaterScenes??={},window.repeaterScenes[e]=t}function Y(e,t){window.repeaterGalleryViews??={},window.repeaterGalleryViews[e]=t}function X(e){let{theme:t}=(0,R.useContext)(W);return z._repository.palettes[t][e]??`#000000`}function ae(e){let t=new Set,n=e;for(let e=0;e<4;e++){let e=Array.from(n.matchAll(/\{StaticResource ([^}]+)\}/g),e=>e[1]),r=!1;for(let i of e){if(t.has(i))continue;t.add(i);let e=z._repository.resources[i];e&&!n.includes(e)&&(n+=`

`+e,r=!0)}if(!r)break}return n}function Z({id:e,name:t,children:n,native:r}){let[i,a]=(0,R.useState)(!1),o=z[t];return(0,U.jsxs)(`section`,{id:e,className:`example basic-example`,"data-official-sample":t,children:[(0,U.jsx)(`h2`,{children:(0,U.jsx)(N,{children:o.title})}),(0,U.jsxs)(`div`,{className:`example-card`,children:[n,(0,U.jsxs)(S,{className:`source`,children:[(0,U.jsx)(h,{children:`Source code`}),(0,U.jsxs)(`div`,{className:`source-tabs`,children:[(0,U.jsx)(M,{className:i?``:`active`,onClick:()=>a(!1),children:`TypeScript / React`}),(0,U.jsx)(M,{className:i?`active`:``,onClick:()=>a(!0),children:`Official repository`})]}),(0,U.jsx)(F,{language:i?`xaml`:`tsx`,children:i?ae(r??o.runtimeXaml):I(ie,e)})]})]})]})}function Q({children:e,options:t}){return(0,U.jsxs)(`div`,{className:`basic-live ${t?`with-options`:``}`,children:[(0,U.jsx)(`div`,{className:`basic-preview repeater-gallery-preview`,children:e}),t&&(0,U.jsx)(`aside`,{className:`options repeater-gallery-options`,children:t})]})}function $({label:e,choices:t,value:n,onChange:r}){return(0,U.jsxs)(`div`,{role:`group`,"aria-label":e,children:[(0,U.jsx)(`p`,{children:(0,U.jsx)(N,{children:e})}),t.map((e,t)=>(0,U.jsx)(ne,{horizontalAlignment:_.Stretch,label:e,checked:n===t,onValueChanged:e=>{e&&r(t)}},e))]})}function oe(){let t=(0,R.useContext)(W),[r,i]=(0,R.useState)(0),[s,u]=(0,R.useState)(()=>B.bars.map((e,t)=>({id:String(t),length:e}))),m=(0,R.useRef)(3),h=X(`SystemChromeLowColor`),g=[new w({spacing:8}),new w({orientation:d.Horizontal,spacing:8}),new e({minColumnSpacing:8,minRowSpacing:8})],v=[`VerticalStackLayout`,`HorizontalStackLayout`,`UniformGridLayout`],y=[`HorizontalBarTemplate`,`VerticalBarTemplate`,`CircularTemplate`],b=[z.ItemsRepeaterBasicNonInteractiveItems.runtimeXaml.replace(`HorizontalBarTemplate`,y[r]).replace(`VerticalStackLayout`,v[r]),z._repository.resources[v[r]],z._repository.resources[y[r]]].join(`

`);return(0,U.jsx)(Z,{id:`repeater-basic`,name:`ItemsRepeaterBasicNonInteractiveItems`,native:b,children:(0,U.jsx)(Q,{options:(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(M,{minWidth:150,disabled:!1,onClick:()=>u(e=>[...e,{id:String(m.current++),length:Math.floor(Math.random()*B.maxLength)}]),children:`Add Item`}),(0,U.jsx)(M,{minWidth:150,disabled:!s.length,onClick:()=>u(e=>e.slice(1)),children:`Remove Item`}),(0,U.jsx)($,{label:`Layout`,choices:[`StackLayout - Vertical`,`StackLayout - Horizontal`,`UniformGridLayout`],value:r,onChange:i})]}),children:(0,U.jsx)(p,{...t,autoHeight:!0,onReady:e=>J(`basic`,e),children:(0,U.jsx)(l,{maxHeight:500,horizontalScrollMode:P.Auto,horizontalScrollBarVisibility:f.Auto,isVerticalScrollChainingEnabled:!1,children:(0,U.jsx)(O,{maxWidth:[437,6e3,540][r],items:s,layout:g[r],onReady:e=>Y(`basic`,e),renderItem:e=>r===0?(0,U.jsx)(n,{width:425,background:h,children:(0,U.jsx)(a,{width:e.length,height:24,fill:G,horizontalAlignment:_.Left})}):r===1?(0,U.jsx)(n,{height:106,background:h,children:(0,U.jsx)(a,{width:48,height:e.length/4,fill:G,verticalAlignment:E.Top})}):(0,U.jsxs)(c,{children:[(0,U.jsx)(o,{width:70,height:70,background:h,...q}),(0,U.jsx)(o,{width:e.length/6,height:e.length/6,background:G,...q})]})})})})})})}function se(){let t=(0,R.useContext)(W),[i,a]=(0,R.useState)(1),o=X(`SystemControlBackgroundChromeMediumBrush`),s=(0,R.useMemo)(()=>Array.from({length:B.numberCount},(e,t)=>({id:String(t),text:String(t),value:t})),[]),c=i===0?`UniformGridLayout2`:`MyFeedLayout`;return(0,U.jsx)(Z,{id:`repeater-virtual`,name:`ItemsRepeaterVirtualizingScrollableListItems`,native:z.ItemsRepeaterVirtualizingScrollableListItems.runtimeXaml.replace(`MyFeedLayout`,c)+`

`+z._repository.resources[c],children:(0,U.jsx)(Q,{options:(0,U.jsx)($,{label:`Layout`,choices:[`Uniform grid`,`Custom virtualizing layout`],value:i,onChange:a}),children:(0,U.jsx)(p,{...t,autoHeight:!0,onReady:e=>J(`virtual`,e),children:(0,U.jsx)(l,{height:400,padding:[0,0,16,0],isVerticalScrollChainingEnabled:!1,children:(0,U.jsx)(O,{margin:[0,0,12,0],items:s,layout:i===0?new e({minItemWidth:108,minItemHeight:108,minColumnSpacing:12,minRowSpacing:12}):new r({minItemSize:[80,108],columnSpacing:12,rowSpacing:12}),onReady:e=>Y(`virtual`,e),renderItem:e=>(0,U.jsx)(n,{background:e.value%2?G:o,children:(0,U.jsx)(j,{text:e.text,...q})})})})})})})}function ce(){let e=(0,R.useContext)(W),[r,i]=(0,R.useState)(0),[a,o]=(0,R.useState)(D.Start),[s,c]=(0,R.useState)(8),[u,m]=(0,R.useState)(8),[h,g]=(0,R.useState)(0),v=X(`ControlFillColorDefaultBrush`),y=X(`ControlStrokeColorDefaultBrush`),x=(0,R.useMemo)(()=>Array.from({length:B.flowCount},(e,t)=>({id:String(t+1),text:`Item ${t+1}`})),[]),S=(0,R.useRef)(null),C=()=>{let e=S.current;e&&!e.isDisposed&&g(e.realizedItems().length)},w=z.FlowLayoutVirtualization.runtimeXaml.replace(`LineAlignment="Start"`,`LineAlignment="${a}"`).replace(`LineSpacing="8"`,`LineSpacing="${u}"`).replace(`MinItemSpacing="8"`,`MinItemSpacing="${s}"`).replace(`<FlowLayout`,`<FlowLayout Orientation="`+(r===0?`Horizontal`:`Vertical`)+`"`);return(0,U.jsx)(Z,{id:`repeater-flow`,name:`FlowLayoutVirtualization`,native:w,children:(0,U.jsxs)(Q,{options:(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)($,{label:`Orientation`,choices:[`Horizontal`,`Vertical`],value:r,onChange:i}),(0,U.jsxs)(`label`,{children:[`LineAlignment`,(0,U.jsx)(A,{"aria-label":`Line alignment`,value:a,onValueChanged:e=>o(e),children:[D.Start,D.Center,D.SpaceBetween,D.SpaceEvenly].map(e=>(0,U.jsx)(T,{value:e,children:e===D.SpaceBetween?`Space between`:e===D.SpaceEvenly?`Space evenly`:e},e))})]}),(0,U.jsxs)(`label`,{children:[`MinItemSpacing`,(0,U.jsx)(b,{"aria-label":`Minimum item spacing`,min:0,max:32,step:2,value:s,onValueChanged:c})]}),(0,U.jsxs)(`label`,{children:[`LineSpacing`,(0,U.jsx)(b,{"aria-label":`Line spacing`,min:0,max:32,step:2,value:u,onValueChanged:m})]})]}),children:[(0,U.jsx)(`p`,{children:(0,U.jsx)(N,{children:`Scroll through 500 items. ItemsRepeater creates and recycles only the elements needed near the viewport.`})}),(0,U.jsx)(p,{...e,autoHeight:!0,onReady:e=>J(`flow`,e),children:(0,U.jsx)(l,{width:520,height:320,horizontalAlignment:_.Left,horizontalScrollMode:r===0?P.Disabled:P.Enabled,horizontalScrollBarVisibility:r===0?f.Disabled:f.Auto,verticalScrollMode:r===0?P.Enabled:P.Disabled,verticalScrollBarVisibility:r===0?f.Auto:f.Disabled,isHorizontalScrollChainingEnabled:!1,isVerticalScrollChainingEnabled:!1,children:(0,U.jsx)(O,{items:x,horizontalCacheLength:0,verticalCacheLength:0,layout:new t({orientation:r===0?d.Horizontal:d.Vertical,lineAlignment:a,minItemSpacing:s,lineSpacing:u}),onReady:e=>{S.current=e,Y(`flow`,e),C()},onElementPrepared:C,onElementClearing:C,renderItem:e=>(0,U.jsx)(n,{width:96,height:64,background:v,borderBrush:y,borderThickness:[1,1,1,1],cornerRadius:4,children:(0,U.jsx)(j,{text:e.text,...q})})})})}),(0,U.jsxs)(`output`,{"aria-live":`polite`,children:[`Realized elements: `,h,` of 500`]})]})})}function le(){let t=(0,R.useContext)(W),n=X(`SystemControlBackgroundChromeMediumBrush`),r=X(`SystemControlForegroundChromeWhiteBrush`),i=(0,R.useMemo)(()=>B.mixed.map((e,t)=>({id:String(t),text:String(e),value:e})),[]);return(0,U.jsx)(Z,{id:`repeater-mixed`,name:`ItemsrepeaterMixedTypeCollection`,children:(0,U.jsxs)(Q,{children:[(0,U.jsx)(`p`,{children:(0,U.jsx)(N,{children:`This is an ItemsRepeater that displays both integer and string items. It uses a DataTemplateSelector to choose the correct layout for each of its items.`})}),(0,U.jsx)(p,{...t,autoHeight:!0,onReady:e=>J(`mixed`,e),children:(0,U.jsx)(O,{margin:[0,0,12,0],items:i,layout:new e({minItemWidth:200,minItemHeight:200}),onReady:e=>Y(`mixed`,e),renderItem:e=>(0,U.jsx)(c,{margin:[10,10,10,10],background:typeof e.value==`string`?G:n,children:(0,U.jsx)(j,{text:e.text,padding:[10,10,10,10],wrap:typeof e.value==`string`,fontSize:typeof e.value==`number`?46:14,fontWeight:typeof e.value==`number`?300:400,foreground:typeof e.value==`string`?r:void 0,...q})})})})]})})}function ue(){let e=(0,R.useContext)(W),t=X(`SystemControlForegroundChromeWhiteBrush`),n=(0,R.useMemo)(()=>B.categories.map(e=>({...e,text:e.id})),[]);return(0,U.jsx)(Z,{id:`repeater-nested`,name:`LayingOutNestedItemsrepeaters`,children:(0,U.jsx)(Q,{children:(0,U.jsx)(p,{...e,autoHeight:!0,onReady:e=>J(`nested`,e),children:(0,U.jsx)(l,{horizontalScrollMode:P.Auto,horizontalScrollBarVisibility:f.Auto,children:(0,U.jsx)(O,{items:n,verticalAlignment:E.Top,layout:new w,onReady:e=>Y(`nested`,e),renderItem:e=>(0,U.jsxs)(y,{children:[(0,U.jsx)(j,{text:e.id,padding:[8,8,8,8],fontSize:28}),(0,U.jsx)(O,{items:e.items,layout:new w({orientation:d.Horizontal}),renderItem:e=>(0,U.jsx)(c,{margin:[10,10,10,10],background:G,children:(0,U.jsx)(j,{text:e,padding:[10,10,10,10],foreground:t,wrap:!0,...q})})})]})})})})})})}function de(){let e=(0,R.useContext)(W),t=X(`TextFillColorInverseBrush`),[n,r]=(0,R.useState)(null),i=(0,R.useRef)(null),o=(0,R.useMemo)(()=>B.colors.map(e=>({id:e,text:e})),[]);return(0,U.jsx)(Z,{id:`repeater-animated`,name:`ItemsRepeaterAnimatedScrollingContentDisplay`,children:(0,U.jsx)(Q,{children:(0,U.jsx)(p,{...e,autoHeight:!0,onReady:e=>J(`animated`,e),children:(0,U.jsxs)(c,{columns:[K,K],children:[(0,U.jsx)(l,{width:250,height:175,children:(0,U.jsx)(O,{items:o,isScrollCenterScaleEnabled:!0,isFocusCenteringEnabled:!0,isKeyboardNavigationEnabled:!0,onReady:e=>Y(`animated`,e),renderItem:e=>(0,U.jsx)(u,{text:e.text,background:V[e.text],foreground:t,horizontalAlignment:_.Stretch,onClick:()=>{r(V[e.text]),i.current=e.text},accessibleName:e.text+(i.current===e.text?` , selected`:``)})})}),(0,U.jsx)(a,{column:1,width:150,height:150,margin:[10,0,0,0],fill:n,stroke:{resource:`SystemControlForegroundBaseHighBrush`},strokeThickness:1,accessibleName:`ColorRectangle`})]})})})})}function fe(){let e=(0,R.useContext)(W),t=X(`SystemControlBackgroundBaseLowBrush`),r=X(`SystemControlForegroundAltHighBrush`),[i,a]=(0,R.useState)(``),[o,s]=(0,R.useState)(!1),[d,f]=(0,R.useState)(!1),m=(0,R.useMemo)(()=>H(),[]),h=(0,R.useMemo)(()=>d?m.filter(e=>e.ingredients.toLowerCase().includes(i.toLowerCase())).sort((e,t)=>(e.ingredientList.length-t.ingredientList.length)*(o?-1:1)):m,[m,i,o,d]);return(0,U.jsx)(Z,{id:`repeater-recipes`,name:`ItemsRepeaterVirtualizedContentHeavyLayout`,children:(0,U.jsxs)(Q,{children:[(0,U.jsx)(p,{...e,autoHeight:!0,onReady:e=>J(`recipes`,e),children:(0,U.jsxs)(c,{height:600,columns:[K,K],children:[(0,U.jsx)(l,{children:(0,U.jsx)(O,{items:h,layout:new C({width:200}),onReady:e=>Y(`recipes`,e),renderItem:e=>(0,U.jsx)(n,{margin:[5,5,5,5],borderThickness:[1,1,1,1],background:t,children:(0,U.jsxs)(y,{children:[(0,U.jsx)(y,{height:75,margin:[8,8,8,8],background:e.color,opacity:.8,children:(0,U.jsx)(j,{text:String(e.num),fontSize:35,padding:[12,12,12,12],foreground:r,horizontalAlignment:_.Center})}),(0,U.jsx)(j,{text:e.name,margin:[15,0,10,0],fontSize:28,wrap:!0}),(0,U.jsx)(j,{text:e.ingredients,margin:[15,0,15,15]})]})})})}),(0,U.jsxs)(y,{column:1,margin:[10,0,0,0],children:[(0,U.jsx)(g,{width:200,header:`Filter by ingredient...`,accessibleName:`Filter by ingredient...`,margin:[0,0,0,20],text:i,onTextChanged:e=>{a(e.text??``),f(!0)}}),(0,U.jsx)(j,{text:`Sort by number of ingredients`,margin:[0,0,0,10]}),(0,U.jsx)(u,{text:`Least to most`,margin:[0,0,0,5],onClick:()=>{o&&(s(!1),f(!0))}}),(0,U.jsx)(u,{text:`Most to least`,onClick:()=>{o||(s(!0),f(!0))}})]})]})}),(0,U.jsx)(`span`,{className:`repeater-screenreader`,"aria-live":`polite`,children:d?`Filtered recipes, ${h.length} results.`:``})]})})}function pe(){let e=(0,R.useContext)(W),[t,n]=(0,R.useState)(()=>B.refreshControls),r=(0,R.useRef)(0),i=(0,R.useRef)(!0);(0,R.useEffect)(()=>(i.current=!0,()=>{i.current=!1}),[]);let a=async()=>{await new Promise(e=>setTimeout(e,500)),i.current&&n(e=>[`NewControl ${r.current++}`,...e])};return(0,U.jsx)(Z,{id:`refresh-basic`,name:`BasicPulltorefresh`,native:z.BasicPulltorefresh.runtimeXaml,children:(0,U.jsx)(Q,{children:(0,U.jsx)(p,{...e,autoHeight:!0,onReady:e=>J(`refresh`,e),children:(0,U.jsx)(s,{horizontalAlignment:_.Center,verticalAlignment:E.Center,onReady:e=>{window.refreshControls??={},window.refreshControls.basic=e},onRefresh:a,children:(0,U.jsx)(v,{minWidth:200,height:200,items:t,borderBrush:{resource:`TextControlBorderBrush`},borderThickness:[1,1,1,1]})})})})})}function me(){let e=(0,R.useContext)(W),[t,n]=(0,R.useState)(()=>B.refreshFriends),r=(0,R.useRef)(0),i=(0,R.useRef)(!0);(0,R.useEffect)(()=>(i.current=!0,()=>{i.current=!1}),[]);let a=async()=>{await new Promise(e=>setTimeout(e,800)),i.current&&n(e=>[`New Friend ${r.current++}`,...e])};return(0,U.jsx)(Z,{id:`refresh-custom`,name:`CustomIconPulltorefresh`,native:z.CustomIconPulltorefresh.runtimeXaml+`

`+z._repository.pageCodeBehind.PullToRefresh,children:(0,U.jsx)(Q,{children:(0,U.jsx)(p,{...e,autoHeight:!0,onReady:e=>J(`refresh-custom`,e),children:(0,U.jsx)(s,{horizontalAlignment:_.Center,verticalAlignment:E.Center,visualizerOptions:{isRotationEnabled:!1},visualizerContent:(0,U.jsx)(m,{source:`/winui/official/repeater/`+(e.theme===k.Dark?`SunWhite.png`:`SunBlack.png`),width:35,height:35}),onReady:e=>{window.refreshControls??={},window.refreshControls.custom=e},onRefresh:a,children:(0,U.jsx)(v,{width:200,height:200,items:t,borderBrush:{resource:`TextControlBorderBrush`},borderThickness:[1,1,1,1]})})})})})}function he({kind:e}){let[t,n]=x(),[r,a]=(0,R.useState)(i.Canvas2D),o=[`ItemsRepeater`,`StackLayout`,`UniformGridLayout`].includes(e);return(0,U.jsxs)(W.Provider,{value:{theme:t,backend:r},children:[(0,U.jsx)(L,{title:o?`ItemsRepeater`:`PullToRefresh`,theme:t,onTheme:n}),(0,U.jsxs)(`main`,{className:`stage-main official-motion`,children:[(0,U.jsx)(`div`,{className:`effects-options`,children:(0,U.jsxs)(`label`,{children:[`Renderer `,(0,U.jsx)(A,{"aria-label":`Renderer`,value:r,onValueChanged:e=>a(e),children:Object.values(i).map(e=>(0,U.jsx)(T,{children:e},e))})]})}),o?(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(oe,{}),(0,U.jsx)(se,{}),(0,U.jsx)(ce,{}),(0,U.jsx)(le,{}),(0,U.jsx)(ue,{}),(0,U.jsx)(de,{}),(0,U.jsx)(fe,{})]}):(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(pe,{}),(0,U.jsx)(me,{})]})]})]})}export{he as RepeaterRefreshPage};