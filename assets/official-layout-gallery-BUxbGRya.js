var e={galleryCommit:`7360ac322414e118eadfb0c7c2f4ecc31a218f59`,controls:{Expander:{description:`The Expander has a header and can expand to show a body with more content. Use an Expander when some content is only relevant some of the time (for example to read more information or access additional options for an item).`,samples:[{title:`An Expander with text in the header and content areas`,xaml:`<Expander VerticalAlignment="Top" Content="This is in the content" ExpandDirection="Down" Header="This text is in the header" IsExpanded="False" />`,referenceXaml:`<Expander
     IsExpanded="False"
     VerticalAlignment="Top"
     Header="This text is in the header"
     Content="This is in the content"/>`,file:`ExpanderTextHeaderContent.txt`},{title:`Modifying Expanders content alignment`,xaml:`<Expander Width="500" Padding="0" HorizontalContentAlignment="Left">
                    <Expander.Header>
                        <TextBlock HorizontalAlignment="Center" Text="This text is centered" />
                    </Expander.Header>
                    <Expander.Content>
                        <TextBlock Margin="4" Text="And this text is left aligned" />
                    </Expander.Content>
                </Expander>`,referenceXaml:`<Expander Width="500" HorizontalContentAlignment="Left" Padding="0">
    <Expander.Header>
        <ToggleButton Content="This ToggleButton is centered" HorizontalAlignment="Center"/>
    </Expander.Header>
    <Expander.Content>
        <Button Margin="4" Content="This Button is left aligned"/>
    </Expander.Content>
</Expander>`,file:`ModifyingExpandersContentAlignment.txt`}]},Grid:{description:`The Grid is used to arrange controls and content in rows and columns. Content is positioned in the grid using Grid.Row and Grid.Column attached properties.`,samples:[{title:`A 3x3 Grid control.`,xaml:`<Grid Width="240" Height="160" Background="Gray" ColumnDefinitions="50, 50, 50" RowDefinitions="50, 50, 50" ColumnSpacing="{x:Bind (x:Int32)ColumnSpacingSlider.Value, Mode=OneWay}" RowSpacing="{x:Bind (x:Int32)RowSpacingSlider.Value, Mode=OneWay}">
                <Grid.Resources>
                    <Style TargetType="Rectangle">
                        <Setter Property="Height" Value="40" />
                        <Setter Property="Width" Value="40" />
                    </Style>
                </Grid.Resources>
                <Rectangle Grid.Column="{x:Bind (x:Int32)ColumnSlider.Value, Mode=OneWay}" Grid.Row="{x:Bind (x:Int32)RowSlider.Value, Mode=OneWay}" Width="50" Height="50" Fill="Red" />
                <Rectangle Grid.Row="1" Fill="Blue" Width="50" Height="50" />
                <Rectangle Grid.Column="1" Fill="Green" Width="50" Height="50" />
                <Rectangle Grid.Column="1" Grid.Row="1" Fill="Yellow" Width="50" Height="50" />
            </Grid>`,referenceXaml:`<Grid
    Width="240"
    Height="120"
    Background="Gray"
    ColumnDefinitions="50, 50, 50"
    RowDefinitions ="50, 50, 50"
    ColumnSpacing="8"
    RowSpacing="8">
    <Rectangle Fill="Red" />
    <Rectangle Fill="Blue" Grid.Row="1" />
    <Rectangle Fill="Green" Grid.Column="1" />
    <Rectangle Fill="Yellow" Grid.Column="1" Grid.Row="1" />
</Grid>`,file:`3x3GridControl.txt`}]}},sources:[{path:`references/gallery-input/Expander/ExpanderPage.xaml`,source:`WinUIGallery/Samples/Expander/ExpanderPage.xaml`,sha256:`e4ab3b0980cdb2656f71576e6b8c6ac10ebc1c96f9b963d195b845b4b656106a`},{path:`references/gallery-input/Expander/ExpanderPage.xaml.cs`,source:`WinUIGallery/Samples/Expander/ExpanderPage.xaml.cs`,sha256:`cf7af025c5db87db1d47ca44730953d241847c31241074411030f7d579081220`},{path:`references/gallery-input/Expander/ExpanderTextHeaderContent.txt`,source:`WinUIGallery/Samples/Expander/ExpanderTextHeaderContent.txt`,sha256:`4dd1fa480816e873342011d6adcc01d54663d4db53026c036ca28d77097e813a`},{path:`references/gallery-input/Expander/ModifyingExpandersContentAlignment.txt`,source:`WinUIGallery/Samples/Expander/ModifyingExpandersContentAlignment.txt`,sha256:`86048807337a51397acc0e44bfec947c2aa84c0f704e43749cda4b2ef3cf4a53`},{path:`references/gallery-input/Grid/3x3GridControl.txt`,source:`WinUIGallery/Samples/Grid/3x3GridControl.txt`,sha256:`5233e1ba560e622f13e784465010f1a03e095d25a42f18735700edce8ba55c9b`},{path:`references/gallery-input/Grid/GridPage.xaml`,source:`WinUIGallery/Samples/Grid/GridPage.xaml`,sha256:`5bb69e9dde11012d6ca3f51f0a333d73e66a2d3f97d813062d823514afbc3ac6`},{path:`references/gallery-input/Grid/GridPage.xaml.cs`,source:`WinUIGallery/Samples/Grid/GridPage.xaml.cs`,sha256:`d830daeb9aa364bd6012c0e5b60f4ea4350bf1c8a93777d4f5a00ca26cb5bcc5`}],differences:[`Expander second runtime header/content are TextBlocks; its catalog snippet uses ToggleButton/Button.`,`Grid runtime height is 160 and rectangles are 50x50; its catalog snippet says height 120 and omits rectangle sizes.`]};export{e as t};