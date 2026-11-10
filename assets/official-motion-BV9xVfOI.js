var e={galleryCommit:`7360ac322414e118eadfb0c7c2f4ecc31a218f59`,acrylic:[{title:`Default in-app acrylic brush.`,xaml:`<Rectangle Fill="{ThemeResource AcrylicInAppFillColorDefaultBrush}" />`,name:`Example1`,minWidth:320,baseHeight:200,shapes:[{kind:`Rectangle`,width:100,height:200,horizontal:`Left`,vertical:`Top`,fill:`#00ffff`},{kind:`Ellipse`,width:152,height:152,horizontal:`Center`,vertical:`Center`,fill:`#ff00ff`},{kind:`Rectangle`,width:80,height:100,horizontal:`Right`,vertical:`Bottom`,fill:`#ffff00`}],layouts:{WideLayout:{Width:400,Height:252},WiderLayout:{Width:400,Height:252}},columns:[]},{title:`Custom acrylic in-app brush.`,xaml:`<Rectangle Fill="{ThemeResource CustomAcrylicInAppBrush}" />

<ResourceDictionary x:Key="Default">
    <media:AcrylicBrush x:Key="CustomAcrylicBrush" 
            TintOpacity="$(OpacitySlider)" TintColor="$(TintColor)" FallbackColor="$(FallbackColor)" />
</ResourceDictionary>`,name:`Example3`,minWidth:320,baseHeight:200,shapes:[{kind:`Rectangle`,width:100,height:200,horizontal:`Left`,vertical:`Top`,fill:`#00ffff`},{kind:`Ellipse`,width:152,height:152,horizontal:`Center`,vertical:`Center`,fill:`#ff00ff`},{kind:`Rectangle`,width:80,height:100,horizontal:`Right`,vertical:`Bottom`,fill:`#ffff00`}],layouts:{WideLayout:{Width:500,MinHeight:252},WiderLayout:{Width:652,MinHeight:252}},columns:[`*`,`252`]},{title:`Luminosity with in-app Acrylic.`,xaml:`<Rectangle Fill="{ThemeResource CustomAcrylicInAppLuminosity}" />

<ResourceDictionary x:Key="Default">
    <media:AcrylicBrush x:Key="CustomAcrylicInAppLuminosity" 
            TintOpacity="$(OpacitySlider)" TintLuminosityOpacity="$(TintLuminositySlider)" TintColor="SkyBlue" FallbackColor="SkyBlue" />
</ResourceDictionary>`,name:`Example4`,minWidth:652,baseHeight:200,shapes:[{kind:`Rectangle`,width:100,height:200,horizontal:`Left`,vertical:`Top`,fill:`#00ffff`},{kind:`Ellipse`,width:152,height:152,horizontal:`Center`,vertical:`Center`,fill:`#ff00ff`},{kind:`Rectangle`,width:80,height:100,horizontal:`Right`,vertical:`Bottom`,fill:`#ffff00`}],layouts:{WideLayout:{Width:500,MinHeight:252},WiderLayout:{Width:652,MinHeight:252}},columns:[`*`,`252`]}],easing:[{title:`Standard Easing Function`,xaml:`<Storyboard x:Name="Storyboard1">
    <DoubleAnimation Storyboard.TargetName="Translation" Storyboard.TargetProperty="X" From="0" To="200" >
        <DoubleAnimation.EasingFunction>
            <CircleEase EasingMode="EaseInOut" />
        </DoubleAnimation.EasingFunction>
    </DoubleAnimation>
</Storyboard>`,duration:500,easing:`CircleEase`,mode:`EaseInOut`,exponent:null},{title:`Accelerate Easing Function`,xaml:`<Storyboard x:Name="Storyboard2">
    <DoubleAnimation Storyboard.TargetName="Translation" Storyboard.TargetProperty="X" From="0" To="200" >
        <DoubleAnimation.EasingFunction>
            <ExponentialEase Exponent="$(AccelerateEasingExponent)" EasingMode="EaseIn" />
        </DoubleAnimation.EasingFunction>
    </DoubleAnimation>
</Storyboard>`,duration:150,easing:`ExponentialEase`,mode:`EaseIn`,exponent:4.5},{title:`Decelerate Easing Function`,xaml:`<Storyboard x:Name="Storyboard3">
    <DoubleAnimation Storyboard.TargetName="Translation" Storyboard.TargetProperty="X" From="0" To="200" >
        <DoubleAnimation.EasingFunction>
            <ExponentialEase Exponent="$(DecelerateEasingExponent)" EasingMode="EaseOut" />
        </DoubleAnimation.EasingFunction>
    </DoubleAnimation>
</Storyboard>`,duration:300,easing:`ExponentialEase`,mode:`EaseOut`,exponent:7},{title:`Other XAML Easing Functions`,xaml:`<Storyboard x:Name="Storyboard3">
    <DoubleAnimation Storyboard.TargetName="Translation" Storyboard.TargetProperty="X" From="0" To="200" >
        <DoubleAnimation.EasingFunction>
            <$(EasingFunction)/>
        </DoubleAnimation.EasingFunction>
    </DoubleAnimation>
</Storyboard>`,duration:500,easing:null,mode:null,exponent:null}],propertyTransition:{curve:[.8,0,.2,1],duration:300,vectorDuration:300},catalog:[{name:`Acrylic`,samples:[{title:`Custom acrylic in-app brush.`,xaml:`<Rectangle Fill="{ThemeResource CustomAcrylicInAppBrush}" />

<ResourceDictionary x:Key="Default">
    <media:AcrylicBrush x:Key="CustomAcrylicBrush" 
            TintOpacity="$(OpacitySlider)" TintColor="$(TintColor)" FallbackColor="$(FallbackColor)" />
</ResourceDictionary>`},{title:`Default in-app acrylic brush.`,xaml:`<Rectangle Fill="{ThemeResource AcrylicInAppFillColorDefaultBrush}" />`},{title:`Luminosity with in-app Acrylic.`,xaml:`<Rectangle Fill="{ThemeResource CustomAcrylicInAppLuminosity}" />

<ResourceDictionary x:Key="Default">
    <media:AcrylicBrush x:Key="CustomAcrylicInAppLuminosity" 
            TintOpacity="$(OpacitySlider)" TintLuminosityOpacity="$(TintLuminositySlider)" TintColor="SkyBlue" FallbackColor="SkyBlue" />
</ResourceDictionary>`}]},{name:`ConnectedAnimation`,samples:[{title:`A connected animation between a list page and a detail page`,xaml:`<!-- COLLECTION PAGE BELOW-->
<ListView x:Name="collection"
            IsItemClickEnabled="True"
            SelectionMode="None"
            Loaded="collection_Loaded"
            ItemClick="collection_ItemClick"
            Grid.Row="2" >
    <ListView.ItemTemplate>
        <DataTemplate x:DataType="local:CustomDataObject">
            <Grid Margin="0,12,0,12" AutomationProperties.Name="{x:Bind Title}">
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="Auto" MinWidth="150"/>
                    <ColumnDefinition Width="*" />
                </Grid.ColumnDefinitions>

                <!-- The image to connect between pages. -->
                <Image x:Name="connectedElement" Source="{x:Bind ImageLocation}" MaxHeight="100" Stretch="Fill"/>

                <StackPanel Margin="12,0,0,0" Grid.Column="1" >
                    <TextBlock Text="{x:Bind Title}" Style="{ThemeResource SubtitleTextBlockStyle}" HorizontalAlignment="Left" Margin="0,0,0,6"/>
                    <StackPanel Orientation="Horizontal">
                        <TextBlock Text="Views: " Style="{ThemeResource CaptionTextBlockStyle}" FontWeight="Bold"/>
                        <TextBlock Text="{x:Bind Views}" Style="{ThemeResource CaptionTextBlockStyle}" Margin="5,0,0,0"/>
                    </StackPanel>
                    <StackPanel Orientation="Horizontal">
                        <TextBlock Text="Likes: " Style="{ThemeResource CaptionTextBlockStyle}" FontWeight="Bold"/>
                        <TextBlock Text="{x:Bind Likes}" Style="{ThemeResource CaptionTextBlockStyle}" Margin="5,0,0,0"/>
                    </StackPanel>
                    <StackPanel Orientation="Horizontal">
                        <TextBlock Text="{x:Bind Description}" Style="{ThemeResource BodyTextBlockStyle}" FontStyle="Italic" Margin="0,12,0,0" TextTrimming="CharacterEllipsis" MaxWidth="500" MaxLines="1"/>
                    </StackPanel>

                </StackPanel>
            </Grid>
        </DataTemplate>
    </ListView.ItemTemplate>
</ListView>

<!-- DETAIL PAGE BELOW-->
<Grid>
    <Grid.RowDefinitions>
        <RowDefinition Height="Auto" />
        <RowDefinition Height="*" />
    </Grid.RowDefinitions>

    <Grid x:Name="headerBackground" HorizontalAlignment="Stretch" VerticalAlignment="Stretch" Background="{ThemeResource SystemControlAcrylicElementBrush}">
        <Button x:Name="GoBackButton" Content="Go Back" HorizontalAlignment="Left" VerticalAlignment="Top" Background="{ThemeResource SystemAccentColor}" Click="BackButton_Click" />
    </Grid>

    <Grid x:Name="headerContent" Margin="20,52,20,20">
        <Grid.ColumnDefinitions>
            <ColumnDefinition Width="Auto" />
            <ColumnDefinition Width="*" />
        </Grid.ColumnDefinitions>

        <!-- Connected image -->
        <Image x:Name="detailedImage" MaxHeight="400" Source="{x:Bind DetailedObject.ImageLocation}" VerticalAlignment="Top" Stretch="Uniform" />

        <!-- Panel to be coordinated with connected animation -->
        <StackPanel x:Name="coordinatedPanel" Grid.Column="1" VerticalAlignment="Top" Margin="20,0">
            <TextBlock Text="{x:Bind DetailedObject.Title}" Style="{ThemeResource SubheaderTextBlockStyle}" Margin="0,0,0,10"  />
            <StackPanel Orientation="Horizontal">
                <TextBlock Text="Views: " Style="{ThemeResource SubtitleTextBlockStyle}" FontWeight="Bold"/>
                <TextBlock Text="{x:Bind DetailedObject.Views}" Style="{ThemeResource SubtitleTextBlockStyle}" Margin="5,0,0,0"/>
            </StackPanel>
            <StackPanel Orientation="Horizontal">
                <TextBlock Text="Likes: " Style="{ThemeResource SubtitleTextBlockStyle}" FontWeight="Bold" />
                <TextBlock Text="{x:Bind DetailedObject.Likes}" Style="{ThemeResource SubtitleTextBlockStyle}"  Margin="5,0,0,0"/>
            </StackPanel>
        </StackPanel>
    </Grid>

    <!-- Panel containing more info, to be shown after the connected animation. -->
    <Grid x:Name="moreInfoPanel" Grid.Row="1" Margin="10">
        <TextBlock Text="{x:Bind DetailedObject.Description}" Style="{ThemeResource SubtitleTextBlockStyle}"  />
    </Grid>
</Grid>
--- c#
// To see the source code: 
// https://github.com/microsoft/WinUI-Gallery/blob/main/WinUIGallery/ConnectedAnimationPages/CollectionPage.xaml.cs
// https://github.com/microsoft/WinUI-Gallery/blob/main/WinUIGallery/ConnectedAnimationPages/DetailedInfoPage.xaml.cs

// COLLECTION PAGE
public sealed partial class CollectionPage : Page
{
    CustomDataObject? _storeditem;

    public CollectionPage()
    {
        this.InitializeComponent();

        // Ensure that the MainPage is only created once, and cached during navigation.
        this.NavigationCacheMode = NavigationCacheMode.Enabled;

        collection.ItemsSource = WinUIGallery.ControlPages.CustomDataObject.GetDataObjects();
    }

    private async void collection_Loaded(object sender, RoutedEventArgs e)
    {
        if (_storeditem != null)
        {
            // If the connected item appears outside the viewport, scroll it into view.
            collection.ScrollIntoView(_storeditem, ScrollIntoViewAlignment.Default);
            collection.UpdateLayout();

            // Play the second connected animation. 
            ConnectedAnimation animation = ConnectedAnimationService.GetForCurrentView().GetAnimation("BackConnectedAnimation");
            if (animation != null)
            {
                // Setup the "back" configuration if the API is present. 
                if (ApiInformation.IsApiContractPresent("Windows.Foundation.UniversalApiContract", 7))
                {
                    animation.Configuration = new DirectConnectedAnimationConfiguration();
                }

                await collection.TryStartConnectedAnimationAsync(animation, _storeditem, "connectedElement");
            }

            // Set focus on the list
            collection.Focus(FocusState.Programmatic);
        }
    }

    private void collection_ItemClick(object sender, ItemClickEventArgs e)
    {
        // Get the collection item corresponding to the clicked item.
        if (collection.ContainerFromItem(e.ClickedItem) is ListViewItem container)
        {
            // Stash the clicked item for use later. We'll need it when we connect back from the detailpage.
            _storeditem = container.Content as CustomDataObject;

            // Prepare the connected animation.
            // Notice that the stored item is passed in, as well as the name of the connected element. 
            // The animation will actually start on the Detailed info page.
            collection.PrepareConnectedAnimation("ForwardConnectedAnimation", _storeditem, "connectedElement");
        }

        // Navigate to the DetailedInfoPage.
        // Note that we suppress the default animation. 
        Frame.Navigate(typeof(DetailedInfoPage), _storeditem, new SuppressNavigationTransitionInfo());
    }
}

// DETAILED PAGE
public sealed partial class DetailedInfoPage : Page
{
    public CustomDataObject? DetailedObject { get; set; }

    public DetailedInfoPage()
    {
        this.InitializeComponent();
        GoBackButton.Loaded += GoBackButton_Loaded;
    }

    private void GoBackButton_Loaded(object sender, RoutedEventArgs e)
    {
        // When we land in page, put focus on the back button
        GoBackButton.Focus(FocusState.Programmatic);

        // Scroll the back button into view so keyboard focus is not left off-screen behind
        // the surrounding scroll viewer (MAS 2.4.11 - Focus Not Obscured).
        GoBackButton.StartBringIntoView();
    }

    protected override void OnNavigatedTo(NavigationEventArgs e)
    {
        base.OnNavigatedTo(e);

        // Store the item to be used in binding to UI
        DetailedObject = e.Parameter as CustomDataObject;

        ConnectedAnimation imageAnimation = ConnectedAnimationService.GetForCurrentView().GetAnimation("ForwardConnectedAnimation");
        if (imageAnimation != null)
        {
            // Connected animation + coordinated animation
            imageAnimation.TryStart(detailedImage, new UIElement[] { coordinatedPanel });

        }
    }

    // Create connected animation back to collection page.
    protected override void OnNavigatingFrom(NavigatingCancelEventArgs e)
    {
        base.OnNavigatingFrom(e);

        ConnectedAnimationService.GetForCurrentView().PrepareToAnimate("BackConnectedAnimation", detailedImage);
    }

    private void BackButton_Click(object sender, RoutedEventArgs e)
    {
        Frame.GoBack();
    }
}`},{title:`A connected animation between elements on the same page`,xaml:`<GridView x:Name="collection" IsItemClickEnabled="True" ItemClick="TipsGrid_ItemClick"
          HorizontalAlignment="Center" MaxWidth="1400">
    <GridView.ItemContainerStyle>
        <Style BasedOn="{StaticResource GridViewItemRevealStyle}" TargetType="GridViewItem">
            <Style.Setters>
                <Setter Property="Margin" Value="4" />
            </Style.Setters>
        </Style>
    </GridView.ItemContainerStyle>
    <GridView.ItemTemplate>
        <DataTemplate>
            <Grid x:Name="connectedElement" Width="150" Height="110"
                  AutomationProperties.Name="{Binding Title}" CornerRadius="4">
                <Image Source="{Binding ImageLocation}" Stretch="UniformToFill" />
                <Border Padding="8,4" VerticalAlignment="Bottom"
                        Background="{ThemeResource AcrylicBackgroundFillColorBaseBrush}">
                    <TextBlock Style="{ThemeResource CaptionTextBlockStyle}" Text="{Binding Title}" />
                </Border>
            </Grid>
        </DataTemplate>
    </GridView.ItemTemplate>
</GridView>

<Grid x:Name="SmokeGrid" HorizontalAlignment="Stretch" VerticalAlignment="Stretch"
      Background="{ThemeResource SmokeFillColorDefaultBrush}" Visibility="Collapsed">
    <Grid x:Name="destinationElement" Width="400" Height="320"
          HorizontalAlignment="Center" VerticalAlignment="Center"
          BorderBrush="{ThemeResource CardStrokeColorDefaultBrush}" BorderThickness="1"
          CornerRadius="8">
        <Grid.RowDefinitions>
            <RowDefinition Height="*" />
            <RowDefinition Height="Auto" />
        </Grid.RowDefinitions>
        <Image x:Name="detailImage" Grid.Row="0" Stretch="UniformToFill" />
        <Button Width="36" Height="36" Margin="8"
                HorizontalAlignment="Right" VerticalAlignment="Top"
                AutomationProperties.Name="Close" Click="BackButton_Click"
                ToolTipService.ToolTip="Close">
            <Button.Content>
                <FontIcon FontSize="14" Glyph="&#xE711;" />
            </Button.Content>
        </Button>
        <StackPanel Grid.Row="1" Padding="16,12"
                    Background="{ThemeResource CardBackgroundFillColorDefaultBrush}">
            <TextBlock x:Name="detailTitle" Style="{ThemeResource SubtitleTextBlockStyle}" />
            <TextBlock x:Name="detailDescription" Margin="0,4,0,0"
                       Foreground="{ThemeResource TextFillColorSecondaryBrush}"
                       MaxLines="3" Style="{ThemeResource BodyTextBlockStyle}"
                       TextWrapping="Wrap" />
        </StackPanel>
    </Grid>
</Grid>
--- c#
public sealed partial class CardPage : Page
{
    CustomDataObject? _storedItem;

    public CardPage()
    {
        this.InitializeComponent();
        collection.ItemsSource = CustomDataObject.GetDataObjects(includeAllItems: true);
    }

    private async void BackButton_Click(object sender, RoutedEventArgs e)
    {
        ConnectedAnimation animation = ConnectedAnimationService.GetForCurrentView()
            .PrepareToAnimate("backwardsAnimation", destinationElement);
        SmokeGrid.Children.Remove(destinationElement);

        // Collapse the smoke when the animation completes.
        animation.Completed += Animation_Completed;

        // If the connected item appears outside the viewport, scroll it into view.
        collection.ScrollIntoView(_storedItem, ScrollIntoViewAlignment.Default);
        collection.UpdateLayout();

        animation.Configuration = new DirectConnectedAnimationConfiguration();

        // Play the connected animation back to the collection.
        await collection.TryStartConnectedAnimationAsync(animation, _storedItem, "connectedElement");
    }

    private void Animation_Completed(ConnectedAnimation sender, object args)
    {
        SmokeGrid.Visibility = Visibility.Collapsed;
        SmokeGrid.Children.Add(destinationElement);
    }

    private void TipsGrid_ItemClick(object sender, ItemClickEventArgs e)
    {
        ConnectedAnimation? animation = null;

        if (collection.ContainerFromItem(e.ClickedItem) is GridViewItem container)
        {
            _storedItem = container.Content as CustomDataObject;
            animation = collection.PrepareConnectedAnimation("forwardAnimation", _storedItem, "connectedElement");
        }

        // Update the detail view with the clicked item's data.
        if (_storedItem != null)
        {
            detailImage.Source = new BitmapImage(new Uri("ms-appx://" + _storedItem.ImageLocation));
            detailTitle.Text = _storedItem.Title;
            detailDescription.Text = _storedItem.Description;
        }

        SmokeGrid.Visibility = Visibility.Visible;
        animation?.TryStart(destinationElement);
    }
}`},{title:`A simple connected animation`,xaml:`// Prepare animation on Source page
private void NavigateButton_Click(object sender, RoutedEventArgs e)
{
    ConnectedAnimationService.GetForCurrentView().PrepareToAnimate("ForwardConnectedAnimation", SourceElement);
    Frame.Navigate(typeof(DestinationPage), null, new SuppressNavigationTransitionInfo());
}

// Start animation on Destination page
protected override void OnNavigatedTo(NavigationEventArgs e)
{
    base.OnNavigatedTo(e);

    var anim = ConnectedAnimationService.GetForCurrentView().GetAnimation("ForwardConnectedAnimation");
    if (anim != null)
    {
        anim.TryStart(DestinationElement);
    }
}`},{title:`Connected animation with ItemsRepeater`,xaml:`<!-- Unlike ListView/GridView, ItemsRepeater does not have built-in
     ConnectedAnimation methods. Use ConnectedAnimationService directly. -->

<!-- TabFocusNavigation="Once" makes the repeater a single tab stop, so Tab enters the group
     once instead of stepping through every item. Arrow keys move between items via the
     ItemsRepeater's XYFocusKeyboardNavigation="Enabled". -->
<ScrollViewer
    x:Name="scrollViewer"
    TabFocusNavigation="Once">
    <ItemsRepeater
        x:Name="repeater"
        ItemsSource="{x:Bind Items}"
        XYFocusKeyboardNavigation="Enabled">
        <ItemsRepeater.Layout>
            <UniformGridLayout
                MinColumnSpacing="8"
                MinItemHeight="120"
                MinItemWidth="150"
                MinRowSpacing="8" />
        </ItemsRepeater.Layout>
        <ItemsRepeater.ItemTemplate>
            <DataTemplate x:DataType="local:CustomDataObject">
                <Grid AutomationProperties.Name="{x:Bind Title}"
                      CornerRadius="4"
                      IsTabStop="True"
                      UseSystemFocusVisuals="True">
                    <!-- The element named "connectedElement" will be animated -->
                    <Image x:Name="connectedElement"
                           Source="{x:Bind ImageLocation}"
                           Stretch="UniformToFill" />
                    <Border VerticalAlignment="Bottom"
                            Background="{ThemeResource AcrylicBackgroundFillColorBaseBrush}"
                            Padding="8,4">
                        <TextBlock Text="{x:Bind Title}"
                                   Style="{ThemeResource CaptionTextBlockStyle}" />
                    </Border>
                </Grid>
            </DataTemplate>
        </ItemsRepeater.ItemTemplate>
    </ItemsRepeater>
</ScrollViewer>
--- c#
// ItemsRepeater does not have PrepareConnectedAnimation() or
// TryStartConnectedAnimationAsync() like ListView/GridView.
// Use ConnectedAnimationService.PrepareToAnimate() directly instead.

private CustomDataObject _storedItem;
private double _persistedScrollPosition;

private void Repeater_ElementPrepared(ItemsRepeater sender, ItemsRepeaterElementPreparedEventArgs args)
{
    args.Element.Tapped -= Item_Tapped;
    args.Element.Tapped += Item_Tapped;
    args.Element.KeyDown -= Item_KeyDown;
    args.Element.KeyDown += Item_KeyDown;
}

private void Item_Tapped(object sender, TappedRoutedEventArgs e)
{
    NavigateToItem(sender as FrameworkElement);
}

private void Item_KeyDown(object sender, KeyRoutedEventArgs e)
{
    // Activate the focused item with Enter or Space, matching list-style keyboard behavior.
    if (e.Key == VirtualKey.Enter || e.Key == VirtualKey.Space)
    {
        NavigateToItem(sender as FrameworkElement);
        e.Handled = true;
    }
}

private void NavigateToItem(FrameworkElement element)
{
    if (element == null) return;

    _storedItem = repeater.ItemsSourceView.GetAt(
        repeater.GetElementIndex(element)) as CustomDataObject;

    // Find the named element in the DataTemplate and prepare the animation.
    if (FindChildByName(element, "connectedElement") is UIElement source)
    {
        ConnectedAnimationService.GetForCurrentView()
            .PrepareToAnimate("ForwardConnectedAnimation", source);
    }

    // Save scroll position for back navigation.
    _persistedScrollPosition = scrollViewer.VerticalOffset;

    Frame.Navigate(typeof(DetailPage), _storedItem,
        new SuppressNavigationTransitionInfo());
}

protected override void OnNavigatedTo(NavigationEventArgs e)
{
    base.OnNavigatedTo(e);
    if (_storedItem == null) return;

    // Restore scroll position so the target element is visible.
    scrollViewer.ChangeView(null, _persistedScrollPosition, null, true);
    UpdateLayout();

    int index = repeater.ItemsSourceView.IndexOf(_storedItem);
    var container = repeater.TryGetElement(index) as FrameworkElement;

    var animation = ConnectedAnimationService.GetForCurrentView()
        .GetAnimation("BackConnectedAnimation");
    if (animation != null)
    {
        animation.Configuration = new DirectConnectedAnimationConfiguration();

        if (container != null
            && FindChildByName(container, "connectedElement") is UIElement target)
        {
            animation.TryStart(target);
        }
    }

    // Return keyboard focus to the activated item for keyboard/Narrator users.
    // Focus() is available because the Grid is a UIElement with IsTabStop set.
    if (container != null)
        container.Focus(FocusState.Programmatic);
    else
        repeater.Focus(FocusState.Programmatic);
}

// Helper to find a named element within a DataTemplate.
private static UIElement FindChildByName(DependencyObject parent, string name)
{
    for (int i = 0; i < VisualTreeHelper.GetChildrenCount(parent); i++)
    {
        var child = VisualTreeHelper.GetChild(parent, i);
        if (child is FrameworkElement fe && fe.Name == name)
            return fe;
        var result = FindChildByName(child, name);
        if (result != null)
            return result;
    }
    return null;
}`}]},{name:`EasingFunction`,samples:[{title:`Accelerate Easing Function`,xaml:`<Storyboard x:Name="Storyboard2">
    <DoubleAnimation Storyboard.TargetName="Translation" Storyboard.TargetProperty="X" From="0" To="200" >
        <DoubleAnimation.EasingFunction>
            <ExponentialEase Exponent="$(AccelerateEasingExponent)" EasingMode="EaseIn" />
        </DoubleAnimation.EasingFunction>
    </DoubleAnimation>
</Storyboard>`},{title:`Decelerate Easing Function`,xaml:`<Storyboard x:Name="Storyboard3">
    <DoubleAnimation Storyboard.TargetName="Translation" Storyboard.TargetProperty="X" From="0" To="200" >
        <DoubleAnimation.EasingFunction>
            <ExponentialEase Exponent="$(DecelerateEasingExponent)" EasingMode="EaseOut" />
        </DoubleAnimation.EasingFunction>
    </DoubleAnimation>
</Storyboard>`},{title:`Other XAML Easing Functions`,xaml:`<Storyboard x:Name="Storyboard3">
    <DoubleAnimation Storyboard.TargetName="Translation" Storyboard.TargetProperty="X" From="0" To="200" >
        <DoubleAnimation.EasingFunction>
            <$(EasingFunction)/>
        </DoubleAnimation.EasingFunction>
    </DoubleAnimation>
</Storyboard>`},{title:`Standard Easing Function`,xaml:`<Storyboard x:Name="Storyboard1">
    <DoubleAnimation Storyboard.TargetName="Translation" Storyboard.TargetProperty="X" From="0" To="200" >
        <DoubleAnimation.EasingFunction>
            <CircleEase EasingMode="EaseInOut" />
        </DoubleAnimation.EasingFunction>
    </DoubleAnimation>
</Storyboard>`}]},{name:`ImplicitTransition`,samples:[{title:`Automatically animate changes to Opacity`,xaml:`<!-- Automatically animate changes to Opacity -->
<Rectangle x:Name="rectangle" Width="50" Height="50" Opacity="0.5">
    <Rectangle.OpacityTransition>
        <ScalarTransition />
    </Rectangle.OpacityTransition>
</Rectangle>
--- c#
private void button_Click(object sender, RoutedEventArgs e)
{
    rectangle.Opacity = $(Opacity);
}`},{title:`Automatically animate changes to Rotation`,xaml:`<!-- Automatically animate changes to Rotation -->
<Rectangle x:Name="rectangle" Width="50" Height="50" Rotation="0" >
    <Rectangle.RotationTransition>
        <ScalarTransition />
    </Rectangle.RotationTransition>
</Rectangle>
--- c#
private void button_Click(object sender, RoutedEventArgs e)
{
    rectangle.Rotation = $(Rotation);  // Clockwise, in degrees
}`},{title:`Automatically animate changes to Scale`,xaml:`<!-- Automatically animate changes to Scale -->
<Rectangle x:Name="rectangle" Width="50" Height="50" Scale="1,1,1" >
    <Rectangle.ScaleTransition>
        <Vector3Transition />
    </Rectangle.ScaleTransition>
</Rectangle>
--- c#
using System.Numerics;
private void button_Click(object sender, RoutedEventArgs e)
{
    rectangle.Scale = new Vector3($(Scale), $(Scale), $(Scale));
}`},{title:`Automatically animate changes to Translation`,xaml:`<!-- Automatically animate changes to Translation -->
<Rectangle x:Name="rectangle" Width="50" Height="50" Translation="0,0,0" >
    <Rectangle.TranslationTransition>
        <Vector3Transition />
    </Rectangle.TranslationTransition>
</Rectangle>
--- c#
using System.Numerics;
private void button_Click(object sender, RoutedEventArgs e)
{
    rectangle.Translation = new Vector3($(Translation), $(Translation), $(Translation));
}`},{title:`Implicitly animate when the Background changes`,xaml:`<ContentPresenter x:Name="BrushPresenter" Background="Blue" Width="50" Height="50">
    <ContentPresenter.BackgroundTransition>
        <BrushTransition />
    </ContentPresenter.BackgroundTransition>
</ContentPresenter>
--- c#
private void button_Click(object sender, RoutedEventArgs e)
{
    // Note that this is a new brush instance, not a new color on the same brush.
    if (HasBlueBackground(BrushPresenter))
    {
        BrushPresenter.Background = new SolidColorBrush(Yellow);
    }
    else
    {
        BrushPresenter.Background = new SolidColorBrush(Blue);
    }
}`},{title:`Implicitly animate when the Grid's theme changes`,xaml:`<Grid x:Name="ThemeExampleGrid" Background="{ThemeResource SolidBackgroundFillColorBaseBrush}" >
    <Grid.BackgroundTransition>
        <BrushTransition />
    </Grid.BackgroundTransition>
    <StackPanel Margin="12" Spacing="6">
        <TextBlock Text="Lorem Ipsum" Style="{ThemeResource SubtitleTextBlockStyle}" />
        <TextBlock Text="The background of this grid animates when the theme changes." TextWrapping="WrapWholeWords" />
        <Button Content="Action" />
        <CheckBox Content="Option" />
    </StackPanel>
</Grid>
--- c#
private void ThemeButton_Click(object sender, RoutedEventArgs e)
{
    ThemeExampleGrid.RequestedTheme = ThemeExampleGrid.RequestedTheme == ElementTheme.Dark ? ElementTheme.Light : ElementTheme.Dark;
}`}]},{name:`PageTransition`,samples:[{title:`Page transitions`,xaml:`<Frame x:Name="ContentFrame">
    <Frame.ContentTransitions>
        <TransitionCollection>
            <NavigationThemeTransition  />
        </TransitionCollection>
    </Frame.ContentTransitions>
</Frame>
--- c#
ContentFrame.Navigate(typeof(SamplePage), null$(TransitionParameter));`}]},{name:`RadialGradientBrush`,samples:[{title:`RadialGradientBrush Sample`,xaml:`<Rectangle Width="200" Height="200">
    <Rectangle.Fill>
        <media:RadialGradientBrush
                MappingMode="$(MappingMode)"
                Center="$(CenterX),$(CenterY)"
                RadiusX="$(RadiusX)"
                RadiusY="$(RadiusY)"
                GradientOrigin="$(OriginX),$(OriginY)"
                SpreadMethod="$(SpreadMethod)">
            <GradientStop Color="Yellow" Offset="0.0" />
            <GradientStop Color="Blue" Offset="1" />
        </media:RadialGradientBrush>
    </Rectangle.Fill>
</Rectangle>`}]},{name:`SystemBackdrops`,samples:[{title:`Backdrop types`,xaml:`<!-- Mica -->
<Window.SystemBackdrop>
    <MicaBackdrop/>
</Window.SystemBackdrop>
                    
<!-- Mica Alt -->
<Window.SystemBackdrop>
    <MicaBackdrop Kind="BaseAlt"/>
</Window.SystemBackdrop>

<!-- Acrylic -->
<Window.SystemBackdrop>
    <DesktopAcrylicBackdrop/>
</Window.SystemBackdrop>
--- c#
bool TrySetMicaBackdrop(bool useMicaAlt)
{
    if (SystemBackdrops.MicaController.IsSupported())
    {
        MicaBackdrop micaBackdrop = new MicaBackdrop();
        micaBackdrop.Kind = useMicaAlt ? MicaKind.BaseAlt : MicaKind.Base;
        SystemBackdrop = micaBackdrop;

        return true; // Succeeded.
    }

    return false; // Mica is not supported on this system.
}

bool TrySetDesktopAcrylicBackdrop()
{
    if (DesktopAcrylicController.IsSupported())
    {
        DesktopAcrylicBackdrop DesktopAcrylicBackdrop = new DesktopAcrylicBackdrop();
        SystemBackdrop = DesktopAcrylicBackdrop;

        return true; // Succeeded.
    }

    return false; // DesktopAcrylic is not supported on this system.
}`}]},{name:`ThemeTransition`,samples:[{title:`Use the EntranceThemeTransition when adding items to your page.`,xaml:`<StackPanel x:Name="EntranceStackPanel" Orientation="Horizontal">
    <StackPanel.ChildrenTransitions>
        <TransitionCollection>
            <EntranceThemeTransition IsStaggeringEnabled="True" />
        </TransitionCollection>
    </StackPanel.ChildrenTransitions>
    <Rectangle Width="50" Height="50" Margin="5" Fill="LightBlue" />
    <Rectangle Width="50" Height="50" Margin="5" Fill="LightBlue" />
    <Rectangle Width="50" Height="50" Margin="5" Fill="LightBlue" />
    <Rectangle Width="50" Height="50" Margin="5" Fill="LightBlue" />
    <Rectangle Width="50" Height="50" Margin="5" Fill="LightBlue" />
</StackPanel>`},{title:`Use the RepositionThemeTransition to react to layout changes.`,xaml:`<Rectangle x:Name="RightRectangle" Fill="Blue" >
    <Rectangle.Transitions>
        <TransitionCollection>
            <RepositionThemeTransition />
        </TransitionCollection>
    </Rectangle.Transitions>
</Rectangle>`},{title:`Use ContentThemeTransition to animate content refreshes.`,xaml:`<ListView>
    <ListView.ItemContainerTransitions>
        <TransitionCollection>
            <ContentThemeTransition />
        </TransitionCollection>
    </ListView.ItemContainerTransitions>
</ListView>`},{title:`Use AddDeleteThemeTransition to animate adding and removing items from a collection.`,xaml:`<ListView>
    <ListView.ItemContainerTransitions>
        <TransitionCollection>
            <AddDeleteThemeTransition />
        </TransitionCollection>
    </ListView.ItemContainerTransitions>
</ListView>`},{title:`Use PopupThemeTransition to animate opening and closing a popup.`,xaml:`<Popup x:Name="ExamplePopup">
    <Popup.ChildTransitions>
        <TransitionCollection>
            <PopupThemeTransition />
        </TransitionCollection>
    </Popup.ChildTransitions>
    <Border Background="{ThemeResource FlyoutBackgroundThemeBrush}" BorderThickness="2" BorderBrush="{ThemeResource SystemControlForegroundChromeGrayBrush}">
        <StackPanel Margin="10">
            <TextBlock Text="This is a popup using PopupThemeTransition" />
            <Button Content="Close Popup" Click="ClosePopupButton_Click" />
        </StackPanel>
    </Border>
</Popup>`}]},{name:`XamlCompInterop`,samples:[{title:`Use a natural motion composition animation on a UIElement`,xaml:`Compositor _compositor = Microsoft.UI.Xaml.Media.CompositionTarget.GetCompositorForCurrentThread();
SpringVector3NaturalMotionAnimation? _springAnimation;

private void CreateOrUpdateSpringAnimation(float finalValue)
{
    if (_springAnimation == null)
    {
        _springAnimation = _compositor.CreateSpringVector3Animation();
        _springAnimation.Target = "Scale";
    }

    _springAnimation.FinalValue = new Vector3(finalValue);
}

private void element_PointerEntered(object sender, PointerRoutedEventArgs e)
{
    // Scale up to 1.5
    CreateOrUpdateSpringAnimation(1.5f);

    (sender as UIElement)?.StartAnimation(_springAnimation);
}

private void element_PointerExited(object sender, PointerRoutedEventArgs e)
{
    // Scale back down to 1.0
    CreateOrUpdateSpringAnimation(1.0f);

    (sender as UIElement)?.StartAnimation(_springAnimation);
}`},{title:`ExpressionAnimation on an Ellipse element`,xaml:`<StackPanel Height="200">
    <Grid VerticalAlignment="Top">
        <Grid.ColumnDefinitions>
            <ColumnDefinition Width="*" />
            <ColumnDefinition Width="*" />
        </Grid.ColumnDefinitions>
        <Rectangle x:Name="rectangle" Width="50" Height="50" Fill="{ThemeResource SystemAccentColor}" PointerEntered="element_PointerEntered" PointerExited="element_PointerExited" />
        <Ellipse x:Name="ellipse" Grid.Column="1" Width="50" Height="50" Margin="55,0" Fill="{ThemeResource SystemAccentColor}"/>
    </Grid>
</StackPanel>
--- c#
// NOTE: The rectangle scales up and down using the same element_PointerEntered/Exited events as the prior sample.

Compositor _compositor = Microsoft.UI.Xaml.Media.CompositionTarget.GetCompositorForCurrentThread();

// Set up the relationship between the rectangle and the ellipse.
private void ExpressionSample_Loaded(object sender, RoutedEventArgs e)
{
    var expressionAnim = _compositor.CreateExpressionAnimation();

    // The ellipse's scale is inversely proportional to the rectangle's scale
    expressionAnim.Expression = "Vector3(1/scaleElement.Scale.X, 1/scaleElement.Scale.Y, 1)";
    expressionAnim.Target = "Scale";

    // Use SetExpressionReferenceParameter to alias a UIElement into the expression string
    expressionAnim.SetExpressionReferenceParameter("scaleElement", rectangle);

    // Start the animation on the ellipse
    ellipse.StartAnimation(expressionAnim);
}`},{title:`Driving several related animations together using ExpressionAnimation`,xaml:`// NOTE: Each of the buttons scale up and down using the same element_PointerEntered/Exited events as the prior samples.

private void StackedButtonsExample_Loaded(object sender, RoutedEventArgs e)
{
    // Animate the translation of each button relative to the scale and translation of the button above.
    var anim = _compositor.CreateExpressionAnimation();
    anim.Expression = "(above.Scale.Y - 1) * 50 + above.Translation.Y % (50 * index)";
    anim.Target = "Translation.Y";

    // Animate the second button relative to the first.
    anim.SetExpressionReferenceParameter("above", ExpressionButton1);
    anim.SetScalarParameter("index", 1);
    ExpressionButton2.StartAnimation(anim);

    // Animate the third button relative to the second.
    anim.SetExpressionReferenceParameter("above", ExpressionButton2);
    anim.SetScalarParameter("index", 2);
    ExpressionButton3.StartAnimation(anim);

    // Animate the fourth button relative to the third.
    anim.SetExpressionReferenceParameter("above", ExpressionButton3);
    anim.SetScalarParameter("index", 3);
    ExpressionButton4.StartAnimation(anim);
}`},{title:`Reference ActualSize in ExpressionAnimations to make novel layouts based on size`,xaml:`private void ActualSizeExample_Loaded(object sender, RoutedEventArgs e)
{
    // We will lay out some buttons in a circle.
    // The formulas we will use are:
    //   X = radius * cos(theta) + xOffset
    //   Y = radius * sin(theta) + yOffset
    //   radius = 1/2 the width and height of the parent container
    //   theta = the angle for each element. The starting value of theta depends on both the number of elements and the relative index of each element.
    //   xOffset = The starting horizontal offset for the element. 
    //   yOffset = The starting vertical offset for the element.

    String radius = "(source.ActualSize.X / 2)"; // Since the layout is a circle, width and height are equivalent meaning we could use X or Y. We'll use X.
    String theta = ".02 * " + radius + " + ((2 * Pi)/total)*index"; // The first value is the rate of angular change based on radius. The last value spaces the buttons equally.
    String xOffset = radius; // We offset x by radius because the buttons naturally layout along the left edge. We need to move them to center of the circle first.
    String yOffset = "0"; // We don't need to offset y because the buttons naturally layout vertically centered.

    // We combine X, Y, and Z subchannels into a single animation because we can only start a single animation on Translation.
    String expression = String.Format("Vector3({0}*cos({1})+{2}, {0}*sin({1})+{3},0)", radius, theta, xOffset, yOffset);

    int totalElements = 8;
    for (int i = 0; i < totalElements; i++)
    {
        Button element = new Button() { Content = "Button" + i };
        LayoutPanel.Children.Add(element);

        var anim = _compositor.CreateExpressionAnimation();

        anim.Expression = expression;
        anim.SetScalarParameter("index", i + 1);
        anim.SetScalarParameter("total", totalElements);
        anim.Target = "Translation";
        anim.SetExpressionReferenceParameter("source", LayoutPanel);

        element.StartAnimation(anim);
    }
}`},{title:`Reference ActualOffset and ActualSize in ExpressionAnimations to position elements relative to each other`,xaml:`<Grid HorizontalAlignment="Left" Margin="0,12,0,0">
    <TextBlock x:Name="PopupTarget" 
                Width="300" 
                TextWrapping="WrapWholeWords" 
                Margin="{x:Bind MarginSlider.Value, Converter={StaticResource doubleToThicknessConverter}, Mode=OneWay}" 
                FontSize="{x:Bind FontSizeSlider.Value, Mode=OneWay}" 
                Text="... lorem ipsum ..." />

    <!-- Notice that the popup is a sibling to the target, not an ancestor. -->
    <Popup x:Name="Popup" Margin="5">
        <Grid MinWidth="50" MaxWidth="200" MinHeight="50" BorderBrush="LightGray" BorderThickness="2" Background="{ThemeResource FlyoutBackgroundThemeBrush}">
            <TextBlock Text="I am always right aligned center to the target." TextWrapping="WrapWholeWords" Margin="6" FontSize="12" VerticalAlignment="Center" />
        </Grid>
    </Popup>
</Grid>
--- c#
private void ActualOffsetExample_Loaded(object sender, RoutedEventArgs e)
{
    // This sample positions a popup relative to a block of text that has variable layout size based on font size.
    var anim = _compositor.CreateExpressionAnimation();

    anim.Expression = "Vector3(source.ActualOffset.X + source.ActualSize.X, source.ActualOffset.Y + source.ActualSize.Y / 2 - 25, 0)";
    anim.Target = "Translation";
    anim.SetExpressionReferenceParameter("source", PopupTarget);

    Popup.StartAnimation(anim);

    Popup.IsOpen = true;
}`}]}],sources:[{path:`references/gallery-motion/ControlExample.xaml`,sha256:`da58d94fc4d57c06032c96104b033caf9361e55400fefe0179cd2d48d62df0dd`},{path:`references/gallery-motion/ControlExample.xaml.cs`,sha256:`67c5390704f6d415f01811729ac9a330a5024f990c12c15e58ef5ac19cbefbfc`},{path:`references/gallery-motion/Acrylic/AcrylicPage.xaml`,sha256:`5bc3e2e6238becb7e5aba727341d0661b3c03a3456d4de1edd44da178734fb65`},{path:`references/gallery-motion/Acrylic/AcrylicPage.xaml.cs`,sha256:`3c306578015ac0d92d87576abac2b3df7a361017840674c9d7c2338a2b1b9f6d`},{path:`references/gallery-motion/Acrylic/CustomAcrylicAppBrush.txt`,sha256:`9060e2e85127697c2d74f139eb6fb87205ea2863bf7fc5f786645aca6363a05e`},{path:`references/gallery-motion/Acrylic/DefaultAppAcrylicBrush.txt`,sha256:`f1ee4e6ec816c2e3f04223d7b4570b7e6792b926e8b644e18409ee38405d9586`},{path:`references/gallery-motion/Acrylic/LuminosityAppAcrylic.txt`,sha256:`b00dcddc13a034e5031167982f139ebca2a45c254b22994f40fbe4138f7b85f6`},{path:`references/gallery-motion/ConnectedAnimation/ConnectedAnimationElementsSame.txt`,sha256:`55e1583f1c971f48d90daea8dc17e8c24398d4aebd0a4cd69a2a98f6e85f47c3`},{path:`references/gallery-motion/ConnectedAnimation/ConnectedAnimationItemsrepeater.txt`,sha256:`b8be61529833f9f26e7fc884792f94eb9f9745f5ce4abbfb9e6b4c4525d03b09`},{path:`references/gallery-motion/ConnectedAnimation/ConnectedAnimationListPage.txt`,sha256:`0546b74a0a348ef11c3ccbcd4a5051d3f641d05877d1bfb5a473dc8c19d09822`},{path:`references/gallery-motion/ConnectedAnimation/ConnectedAnimationPage.xaml`,sha256:`001900e418d2b94c79981cb97e74543a9d2dafe7e11b07173c4b9fc32a94fdb3`},{path:`references/gallery-motion/ConnectedAnimation/ConnectedAnimationPage.xaml.cs`,sha256:`0d3c4a3d1e17027b2e6ba7c0566326c107b0a1bebd4831ae0141656b2f72c169`},{path:`references/gallery-motion/ConnectedAnimation/SimpleConnectedAnimation.txt`,sha256:`dfbd4ca6e6ed3602938c5a2570b5fbd004ed549ebbd352ea10b9a14accddb15d`},{path:`references/gallery-motion/EasingFunction/AccelerateEasingFunction.txt`,sha256:`450834e7ac94a89038303207d4682346d6d57a071b651e194f9e626694e3bd9f`},{path:`references/gallery-motion/EasingFunction/DecelerateEasingFunction.txt`,sha256:`f906880617c78af2021159f3c94f9823374ad1104b9dc8e036c7c7241cc375c7`},{path:`references/gallery-motion/EasingFunction/EasingFunctionPage.xaml`,sha256:`425d49374f2f19bce881a8b476a0929432f99836aae44a6e023e2c7d1792e6a7`},{path:`references/gallery-motion/EasingFunction/EasingFunctionPage.xaml.cs`,sha256:`8321c54de590222caff101afb1bb99ff56661e5afc52c961ff17a6a0b03739b1`},{path:`references/gallery-motion/EasingFunction/OtherXamlEasingFunctions.txt`,sha256:`6c34b1298418087fa8460d21295c90238d6a581e4449ec3cc24879f6c5177142`},{path:`references/gallery-motion/EasingFunction/StandardEasingFunction.txt`,sha256:`8dcd53671222bb3794f6284cbe7b95ab919afb33782a3828052a6d14c493a04a`},{path:`references/gallery-motion/ImplicitTransition/ImplicitTransitionAutomaticallyAnimateChangesOpacity.txt`,sha256:`40d0e345c8f11db6c28cff0d39d3a01eaaf88cba9a068546ece4d12966b706d5`},{path:`references/gallery-motion/ImplicitTransition/ImplicitTransitionAutomaticallyAnimateChangesRotation.txt`,sha256:`451df820cf1683171f34504b0f012fa94a90fc3f0075abe00369185631e920e8`},{path:`references/gallery-motion/ImplicitTransition/ImplicitTransitionAutomaticallyAnimateChangesScale.txt`,sha256:`4be4496fb4e0d68b276ab9d7a3365f32397a741bd41639235a3144ca5b1a1246`},{path:`references/gallery-motion/ImplicitTransition/ImplicitTransitionAutomaticallyAnimateChangesTranslation.txt`,sha256:`78055a43fbd11f4d3655c8340b20866979f7d37179ac331d6e0016fca41003da`},{path:`references/gallery-motion/ImplicitTransition/ImplicitTransitionImplicitlyAnimateBackgroundChanges.txt`,sha256:`0fa416d4c15743e976261ef3675c948e5aca5ba68e3f56bf9bb0ebf6fac5f659`},{path:`references/gallery-motion/ImplicitTransition/ImplicitTransitionImplicitlyAnimateGridTheme.txt`,sha256:`9ba0557a85800aa287bd69ba3c4c53513c1b86739f03da32db669cb3e2c10021`},{path:`references/gallery-motion/ImplicitTransition/ImplicitTransitionPage.xaml`,sha256:`60a8ced1c61a94ac98fd1a060b124174b689b007723f5c71796d022ebbc7fb79`},{path:`references/gallery-motion/ImplicitTransition/ImplicitTransitionPage.xaml.cs`,sha256:`17a3bce7d669f80f05d7a3b10a67aea5ff9bd9e1d170f6b4b04eb56028b78b22`},{path:`references/gallery-motion/PageTransition/PageTransitionPage.xaml`,sha256:`852650d418c93eebfa7a7a2d52dade9dc51fdfcc8b65fd2ed0bf586a7c62dfbc`},{path:`references/gallery-motion/PageTransition/PageTransitionPage.xaml.cs`,sha256:`770f6f1daec2100d7c08a6a07f2c758c52731d5d78e6969675b60d85ca8d0997`},{path:`references/gallery-motion/PageTransition/PageTransitions.txt`,sha256:`c174de53636f3fa2943c062c973d273a80a563777221787ea68cfccd2e0187b9`},{path:`references/gallery-motion/RadialGradientBrush/RadialGradientBrushPage.xaml`,sha256:`58217614d19d36d395b8eb97b073c58b142ca8c9da5e9e22e498e31009745b9f`},{path:`references/gallery-motion/RadialGradientBrush/RadialGradientBrushPage.xaml.cs`,sha256:`288722e830271674d5d17f524a16aa99c38c85be4098982a1fbd13efede26709`},{path:`references/gallery-motion/RadialGradientBrush/RadialgradientbrushSample.txt`,sha256:`3d317ef2d64b76f648b09c58a49d7ff05f2cf86f94070efafb0161d007e52cf0`},{path:`references/gallery-motion/SystemBackdrops/SystemBackdropsBackdropTypes.txt`,sha256:`912cdd12c3ff0d4f8217ec25df90955f028a3265db433fec65057427935b9e73`},{path:`references/gallery-motion/SystemBackdrops/SystemBackdropsDesktopacryliccontroller.txt`,sha256:`9afc470b36cb2cef5207652a3741e6ea7a75c66e330f036694afd16c40c90391`},{path:`references/gallery-motion/SystemBackdrops/SystemBackdropsMicacontroller.txt`,sha256:`cfc75563f9a29dbd800d3c1982a841a26a5f9f045fe3e7ff46165d2ee6dd2d32`},{path:`references/gallery-motion/SystemBackdrops/SystemBackdropsPage.xaml`,sha256:`6e3719b8449c10e82f7e01575b1d79c7ddebedbedc0c47ba26c2214551197e10`},{path:`references/gallery-motion/SystemBackdrops/SystemBackdropsPage.xaml.cs`,sha256:`a8afada727727ec914a55cc0597bfb51cb7e0410cc6417d1878951443a519ea9`},{path:`references/gallery-motion/ThemeTransition/AdddeletethemetransitionAnimateAddingRemoving.txt`,sha256:`4d53c55b4b372a36792a4c7e1fe7d0946bcd1ae0f6b6e50b7c978cd3764643bb`},{path:`references/gallery-motion/ThemeTransition/ContentthemetransitionAnimateContentRefreshes.txt`,sha256:`347b00c7fe10c4bb3afa0ecff7e95f2ace7ed44071aea97bd405755978cc7ba6`},{path:`references/gallery-motion/ThemeTransition/EntrancethemetransitionAddingItemsYour.txt`,sha256:`3d501fc5db09852b3d7d93224cd851e7c881955c1b43654e231f4a311f51ed75`},{path:`references/gallery-motion/ThemeTransition/PopupthemetransitionAnimateOpeningClosing.txt`,sha256:`69c5f27a3a8fb5b08763778b8e747a06120697d202851b0a3a95130006e8db81`},{path:`references/gallery-motion/ThemeTransition/RepositionthemetransitionReactLayoutChanges.txt`,sha256:`0ffb4a9e1d6a36651bedd91f1c33e20d24fd52933a3169312e965c5a234d59a7`},{path:`references/gallery-motion/ThemeTransition/ThemeTransitionPage.xaml`,sha256:`8776cecb7545f964a2c7e3c04d6e404198b4269e20a680588ac5f447b97cec1b`},{path:`references/gallery-motion/ThemeTransition/ThemeTransitionPage.xaml.cs`,sha256:`7d95af2dfc9404a28aae6280363b1d7002adb9dd1fed2ba0e6b9bca69f7bbc2c`},{path:`references/gallery-motion/XamlCompInterop/XamlCompInteropDrivingSeveralRelatedAnimations.txt`,sha256:`58ac538f13d843b3ec5c850f5e787125ee67d0a66fb17e14900fc4bd5354d3a4`},{path:`references/gallery-motion/XamlCompInterop/XamlCompInteropExpressionanimationEllipseElement.txt`,sha256:`ef342c864cf5a5b8f43f0bef0c59b1df329ecd73d3de781a01bb5b82170a2711`},{path:`references/gallery-motion/XamlCompInterop/XamlCompInteropNaturalMotionCompositionAnimation.txt`,sha256:`dc6af5378f91a5846c7a550e27970256147818029769f417c8cc93dd6b0d4351`},{path:`references/gallery-motion/XamlCompInterop/XamlCompInteropPage.xaml`,sha256:`808676137a0eb235dc56846cd44d104a5c8d9e0d8bb4a0a585061a56d7763a30`},{path:`references/gallery-motion/XamlCompInterop/XamlCompInteropPage.xaml.cs`,sha256:`005f8950e88c7470e04cefce06ceec9d20a61faa53ce1458a5d9cc5f6a732770`},{path:`references/gallery-motion/XamlCompInterop/XamlCompInteropReferenceActualoffsetActualsizeExpressionanimations.txt`,sha256:`92aad9d0bf9031be05668fd057b8d19ddb85853fc43d4e0dac473f10c04278e1`},{path:`references/gallery-motion/XamlCompInterop/XamlCompInteropReferenceActualsizeExpressionanimationsMake.txt`,sha256:`464d8cc06cae1c0d5c33cf9bd4b44f41990aab861e741cb5125132a5eab0c9c6`},{path:`references/gallery-motion/ConnectedAnimation/support/CardPage.xaml`,sha256:`72f6d8e39c5a450c472190d7b0b750d2288a51f9d934f2f88af1f4356ff32edc`},{path:`references/gallery-motion/ConnectedAnimation/support/CardPage.xaml.cs`,sha256:`802763b2631b9315f2d9069c07058a218285018d9d687e86ca09d2bf663feec9`},{path:`references/gallery-motion/ConnectedAnimation/support/CollectionPage.xaml`,sha256:`4bf9bc35e3e850eac2596cb19ba0f2969ede746e979f52aee277ead1ea93f3f1`},{path:`references/gallery-motion/ConnectedAnimation/support/CollectionPage.xaml.cs`,sha256:`b607631675f00ecb5f8eea91aef6712d7a68e35f0ccafc246d1d54c876eda14a`},{path:`references/gallery-motion/ConnectedAnimation/support/DetailedInfoPage.xaml`,sha256:`ef193b5e527b7854f87290851d42c49fca4c7b335a8961ff1c3804d18d1a8879`},{path:`references/gallery-motion/ConnectedAnimation/support/DetailedInfoPage.xaml.cs`,sha256:`2528ee6fff63f79ef319daedc9bb75d3670a2a7619f66e7c89fc3583f461da1e`},{path:`references/gallery-motion/ConnectedAnimation/support/ItemsRepeaterCollectionPage.xaml`,sha256:`f4eda74b4d2e41269f3f78330ab0385d8efa13139c1fa424fbb50cdb5e998679`},{path:`references/gallery-motion/ConnectedAnimation/support/ItemsRepeaterCollectionPage.xaml.cs`,sha256:`b418ed2d5d59bcac53688d99d2e77ab31db0c16368bf5b8de044182d434cbb96`},{path:`references/gallery-motion/ConnectedAnimation/support/SamplePage1.xaml`,sha256:`3953193fd676445a2b94be3ce8127105bce0582cade32e769b390bd886993e49`},{path:`references/gallery-motion/ConnectedAnimation/support/SamplePage1.xaml.cs`,sha256:`3427c914c6ae0eb69baa495fe2191f9913d345c40955199939dc1cb12f100219`},{path:`references/gallery-motion/ConnectedAnimation/support/SamplePage2.xaml`,sha256:`f86d4c2b55cb392b37e5da300ed625aa788d6eb26900d96b9db2a6ab56d377f1`},{path:`references/gallery-motion/ConnectedAnimation/support/SamplePage2.xaml.cs`,sha256:`53ab535c11464b3a0980b50f2644a2daf334d93faa44ccde93f98ae12fbc1d59`}],connectedItems:[{id:`0`,text:`Item 1`,image:`/winui/official/reading/LandscapeImage1.jpg`,views:`237`,likes:`17`,description:`Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer id facilisis lectus. Cras nec convallis ante, quis pulvinar tellus. Integer dictum accumsan pulvinar. Pellentesque eget enim sodales sapien vestibulum consequat.`},{id:`1`,text:`Item 2`,image:`/winui/official/reading/LandscapeImage2.jpg`,views:`374`,likes:`24`,description:`Nullam eget mattis metus. Donec pharetra, tellus in mattis tincidunt, magna ipsum gravida nibh, vitae lobortis ante odio vel quam.`},{id:`2`,text:`Item 3`,image:`/winui/official/reading/LandscapeImage3.jpg`,views:`511`,likes:`31`,description:`Quisque accumsan pretium ligula in faucibus. Mauris sollicitudin augue vitae lorem cursus condimentum quis ac mauris. Pellentesque quis turpis non nunc pretium sagittis. Nulla facilisi. Maecenas eu lectus ante. Proin eleifend vel lectus non tincidunt. Fusce condimentum luctus nisi, in elementum ante tincidunt nec.`},{id:`3`,text:`Item 4`,image:`/winui/official/reading/LandscapeImage4.jpg`,views:`648`,likes:`38`,description:`Aenean in nisl at elit venenatis blandit ut vitae lectus. Praesent in sollicitudin nunc. Pellentesque justo augue, pretium at sem lacinia, scelerisque semper erat. Ut cursus tortor at metus lacinia dapibus.`},{id:`4`,text:`Item 5`,image:`/winui/official/reading/LandscapeImage5.jpg`,views:`785`,likes:`45`,description:`Ut consequat magna luctus justo egestas vehicula. Integer pharetra risus libero, et posuere justo mattis et.`},{id:`5`,text:`Item 6`,image:`/winui/official/reading/LandscapeImage6.jpg`,views:`922`,likes:`52`,description:`Proin malesuada, libero vitae aliquam venenatis, diam est faucibus felis, vitae efficitur erat nunc non mauris. Suspendisse at sodales erat.`},{id:`6`,text:`Item 7`,image:`/winui/official/reading/LandscapeImage7.jpg`,views:`160`,likes:`59`,description:`Aenean vulputate, turpis non tincidunt ornare, metus est sagittis erat, id lobortis orci odio eget quam. Suspendisse ex purus, lobortis quis suscipit a, volutpat vitae turpis.`},{id:`7`,text:`Item 8`,image:`/winui/official/reading/LandscapeImage8.jpg`,views:`297`,likes:`66`,description:`Duis facilisis, quam ut laoreet commodo, elit ex aliquet massa, non varius tellus lectus et nunc. Donec vitae risus ut ante pretium semper. Phasellus consectetur volutpat orci, eu dapibus turpis. Fusce varius sapien eu mattis pharetra.`},{id:`8`,text:`Item 9`,image:`/winui/official/reading/LandscapeImage9.jpg`,views:`434`,likes:`73`,description:`Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer id facilisis lectus. Cras nec convallis ante, quis pulvinar tellus. Integer dictum accumsan pulvinar. Pellentesque eget enim sodales sapien vestibulum consequat.`},{id:`9`,text:`Item 10`,image:`/winui/official/reading/LandscapeImage10.jpg`,views:`571`,likes:`80`,description:`Nullam eget mattis metus. Donec pharetra, tellus in mattis tincidunt, magna ipsum gravida nibh, vitae lobortis ante odio vel quam.`},{id:`10`,text:`Item 11`,image:`/winui/official/reading/LandscapeImage11.jpg`,views:`708`,likes:`87`,description:`Quisque accumsan pretium ligula in faucibus. Mauris sollicitudin augue vitae lorem cursus condimentum quis ac mauris. Pellentesque quis turpis non nunc pretium sagittis. Nulla facilisi. Maecenas eu lectus ante. Proin eleifend vel lectus non tincidunt. Fusce condimentum luctus nisi, in elementum ante tincidunt nec.`},{id:`11`,text:`Item 12`,image:`/winui/official/reading/LandscapeImage12.jpg`,views:`845`,likes:`94`,description:`Aenean in nisl at elit venenatis blandit ut vitae lectus. Praesent in sollicitudin nunc. Pellentesque justo augue, pretium at sem lacinia, scelerisque semper erat. Ut cursus tortor at metus lacinia dapibus.`},{id:`12`,text:`Item 13`,image:`/winui/official/reading/LandscapeImage13.jpg`,views:`982`,likes:`12`,description:`Ut consequat magna luctus justo egestas vehicula. Integer pharetra risus libero, et posuere justo mattis et.`}],connectedDataNote:`Original titles, images and descriptions; Views/Likes frozen within upstream Random ranges for repeatable comparisons.`,textStyles:{SubtitleTextBlockStyle:{fontSize:20,fontWeight:600,trimming:`CharacterEllipsis`,wrap:!0,opticalMarginAlignment:`TrimSideBearings`},SubheaderTextBlockStyle:{fontSize:34,fontWeight:300,trimming:`CharacterEllipsis`,wrap:!0,opticalMarginAlignment:`TrimSideBearings`},TitleTextBlockStyle:{fontSize:28,fontWeight:600,trimming:`CharacterEllipsis`,wrap:!0,opticalMarginAlignment:`TrimSideBearings`},BodyTextBlockStyle:{fontSize:14,fontWeight:400,trimming:`CharacterEllipsis`,wrap:!0},CaptionTextBlockStyle:{fontSize:12,fontWeight:400,trimming:`CharacterEllipsis`,wrap:!0}},textStyleSdkSha256:`0fdca24b6807557325ce279e1e9b80361537f1093fa049530d34684208791160`};export{e as t};