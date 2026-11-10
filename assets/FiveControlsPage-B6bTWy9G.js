import{$ as e,E as t,Fr as n,J as r,Kr as i,O as a,Or as o,Qn as s,U as c,Wt as l,X as u,a as d,cr as f,dr as p,en as m,f as h,g,i as _,j as v,l as y,li as b,n as x,pi as S,r as C,sn as w,t as T,v as E,wn as D}from"./GalleryControls-jbXHT3zS.js";import{t as O}from"./SourceCode-C2xz3uBh.js";import{i as k,r as A}from"./ButtonPage-Cv9H35SX.js";import{t as j}from"./official-layout-gallery-BUxbGRya.js";var M=S(),N={galleryCommit:`7360ac322414e118eadfb0c7c2f4ecc31a218f59`,controls:{Border:{description:`Use a Border control to draw a boundary line, background, or both, around another object. A Border can contain only one child object.`,samples:[{title:`A Border around a TextBlock.`,file:`BorderAroundTextblock.txt`,xaml:`<Border>
    <TextBlock Text="Text inside a border" FontSize="18" Foreground="Black" />
</Border>`}]},Canvas:{description:`The Canvas provides absolute positioning of controls or content. Content is positioned relative to the Canvas using the Canvas.Top and Canvas.Left attached properties.`,samples:[{title:`A Canvas control.`,file:`CanvasControl.txt`,xaml:`<Canvas Width="120" Height="120" Background="Gray">
    <Rectangle Fill="Red" />
    <Rectangle Fill="Blue" Canvas.Left="20" Canvas.Top="20" Canvas.ZIndex="1" />
    <Rectangle Fill="Green" Canvas.Left="40" Canvas.Top="40" Canvas.ZIndex="2" />
    <Rectangle Fill="Yellow" Canvas.Left="60" Canvas.Top="60" Canvas.ZIndex="3" />
</Canvas>`}]},Expander:{description:`The Expander has a header and can expand to show a body with more content. Use an Expander when some content is only relevant some of the time (for example to read more information or access additional options for an item).`,samples:[{title:`An Expander with text in the header and content areas`,file:`ExpanderTextHeaderContent.txt`,xaml:`<Expander
     IsExpanded="False"
     VerticalAlignment="Top"
     Header="This text is in the header"
     Content="This is in the content"/>`},{title:`Modifying Expanders content alignment`,file:`ModifyingExpandersContentAlignment.txt`,xaml:`<Expander Width="500" HorizontalContentAlignment="Left" Padding="0">
    <Expander.Header>
        <ToggleButton Content="This ToggleButton is centered" HorizontalAlignment="Center"/>
    </Expander.Header>
    <Expander.Content>
        <Button Margin="4" Content="This Button is left aligned"/>
    </Expander.Content>
</Expander>`}]},HyperlinkButton:{description:`A HyperlinkButton appears as a text hyperlink. When a user clicks it, it opens the page you specify in the NavigateUri property in the default browser. Or you can handle its Click event, typically to navigate within your app.`,samples:[{title:`A hyperlink button that navigates to a URI.`,file:`HyperlinkButtonNavigate.txt`,xaml:`<HyperlinkButton Content="Microsoft home page" NavigateUri="https://www.microsoft.com" />`},{title:`A hyperlink button that handles a Click event.`,file:`HyperlinkButtonClick.txt`,xaml:`<HyperlinkButton Content="ToggleButton" Click="HyperlinkButton_Click"/>`}]},InfoBadge:{description:`Badging is a non-intrusive and intuitive way to display notifications or bring focus to an area within an app - whether that be for notifications, indicating new content, or showing an alert.`,samples:[{title:`InfoBadge embedded in NavigationView`,file:`InfobadgeEmbeddedNavigationview.txt`,xaml:`<NavigationViewItem x:Name="InboxPage" Content="Inbox" Icon="Mail" AutomationProperties.Name="Inbox, 5 notifications">
    <NavigationViewItem.InfoBadge>
        <InfoBadge x:Name="infoBadge1" Value="5" Opacity="{x:Bind InfoBadgeOpacity, Mode=OneWay}"/>
    </NavigationViewItem.InfoBadge>
</NavigationViewItem>`},{title:`Different InfoBadge Styles`,file:`DifferentInfobadgeStyles.txt`,xaml:`<StackPanel Orientation="Horizontal" Spacing="20" HorizontalAlignment="Center">
    <InfoBadge x:Name="infoBadge2" HorizontalAlignment="Right"/>
    <InfoBadge x:Name="infoBadge3" HorizontalAlignment="Right" Value="10" />
    <InfoBadge x:Name="infoBadge4" VerticalAlignment="Center"/>
</StackPanel>`},{title:`Placing an InfoBadge Inside Another Control`,file:`PlacingInfobadgeInsideAnother.txt`,xaml:`<Button Padding="0" Width="200" Height="60" ToolTipService.ToolTip="Refresh required"
        HorizontalAlignment="Center" HorizontalContentAlignment="Stretch" VerticalContentAlignment="Stretch">
    <Grid HorizontalAlignment="Stretch" VerticalAlignment="Stretch" Width="Auto" Height="Auto">
        <SymbolIcon Symbol="Sync" HorizontalAlignment="Center"/>
        <InfoBadge Background="#C42B1C" HorizontalAlignment="Right" VerticalAlignment="Top">
            <InfoBadge.IconSource>
                <FontIconSource FontFamily="{StaticResource SymbolThemeFontFamily}" Glyph="&#xF13C;" />
            </InfoBadge.IconSource>
        </InfoBadge>
    </Grid>
</Button>`},{title:`InfoBadge with Dynamic Value`,file:`InfobadgeDynamicValue.txt`,xaml:`<InfoBadge Value="{Binding ElementName=ValueNumberBox, Path=Value, Mode=TwoWay}" />
<NumberBox x:Name="ValueNumberBox" Header="InfoBadge Value" Value="1" Minimum="-1"
    SpinButtonPlacementMode="Inline" ValueChanged="ValueNumberBox_ValueChanged" />`}]}},sources:[{path:`references/gallery-input/Border/BorderAroundTextblock.txt`,source:`WinUIGallery/Samples/Border/BorderAroundTextblock.txt`,sha256:`6dfbaf2c3045c28194c490ec4a8acc815affaeeff2be7514d498fbf1fa95fafe`},{path:`references/gallery-input/Border/BorderPage.xaml`,source:`WinUIGallery/Samples/Border/BorderPage.xaml`,sha256:`d9da8df2b2e7ac0e715648090087220ea60d5db92315ce27a17f85ac33de70e8`},{path:`references/gallery-input/Border/BorderPage.xaml.cs`,source:`WinUIGallery/Samples/Border/BorderPage.xaml.cs`,sha256:`24cda5ecf7ab1663730eeec6afb282a50aded6e292528ca3edf91ff6bc35a4a1`},{path:`references/gallery-input/Canvas/CanvasControl.txt`,source:`WinUIGallery/Samples/Canvas/CanvasControl.txt`,sha256:`0debb2c2f1a589603eb91896e36efea7e4e6e3a86186ffe393ec818119f7c3b7`},{path:`references/gallery-input/Canvas/CanvasPage.xaml`,source:`WinUIGallery/Samples/Canvas/CanvasPage.xaml`,sha256:`81d71026a92029bec14f744228f1547c0c7845482700de8bbfe80730c7425b4d`},{path:`references/gallery-input/Canvas/CanvasPage.xaml.cs`,source:`WinUIGallery/Samples/Canvas/CanvasPage.xaml.cs`,sha256:`cfa9d7c8e4208f5d05f166500d7c4aeb8d2b95d5b9d69b46ea631ac63c281042`},{path:`references/gallery-input/Expander/ExpanderPage.xaml`,source:`WinUIGallery/Samples/Expander/ExpanderPage.xaml`,sha256:`3b778344b284724b7e568050410a0614db5ba19857574f50965bd8da765bf989`},{path:`references/gallery-input/Expander/ExpanderPage.xaml.cs`,source:`WinUIGallery/Samples/Expander/ExpanderPage.xaml.cs`,sha256:`38ca4aa95d58ad9554d78157906ba5d50eb6092f975ab01750223c4c9b441f96`},{path:`references/gallery-input/Expander/ExpanderTextHeaderContent.txt`,source:`WinUIGallery/Samples/Expander/ExpanderTextHeaderContent.txt`,sha256:`7edf892afb91281598b816c97d34979072d1acfaf20e868f5ca47f4c3bb587ce`},{path:`references/gallery-input/Expander/ModifyingExpandersContentAlignment.txt`,source:`WinUIGallery/Samples/Expander/ModifyingExpandersContentAlignment.txt`,sha256:`23b119bfc029793a9f21c1b09f7e90e04f71e8c7a437b9d3b56bd6d12440609f`},{path:`references/gallery-input/HyperlinkButton/HyperlinkButtonClick.txt`,source:`WinUIGallery/Samples/HyperlinkButton/HyperlinkButtonClick.txt`,sha256:`ff4c2f546491b23742641ca24f79d6d7ec3cecc42aa7c4a410c88453b708e232`},{path:`references/gallery-input/HyperlinkButton/HyperlinkButtonNavigate.txt`,source:`WinUIGallery/Samples/HyperlinkButton/HyperlinkButtonNavigate.txt`,sha256:`7bef9b1a2478fd7255a7c52564b13b09380b7b4b5c9cc1332d74295bb2ba5e71`},{path:`references/gallery-input/HyperlinkButton/HyperlinkButtonPage.xaml`,source:`WinUIGallery/Samples/HyperlinkButton/HyperlinkButtonPage.xaml`,sha256:`fecf6772c6bb98235aa622b951b03eb528bb7073e7549c9bef911b5521980885`},{path:`references/gallery-input/HyperlinkButton/HyperlinkButtonPage.xaml.cs`,source:`WinUIGallery/Samples/HyperlinkButton/HyperlinkButtonPage.xaml.cs`,sha256:`e4f1695170db4ef7442246c44748a1e2c5e84c01b33f22786be6d49d1282ce5d`},{path:`references/gallery-input/InfoBadge/DifferentInfobadgeStyles.txt`,source:`WinUIGallery/Samples/InfoBadge/DifferentInfobadgeStyles.txt`,sha256:`4291c4161073249dd2f59fa879fc8d1e2ccd4769daaf477077375872ed2cdd1c`},{path:`references/gallery-input/InfoBadge/InfobadgeDynamicValue.txt`,source:`WinUIGallery/Samples/InfoBadge/InfobadgeDynamicValue.txt`,sha256:`3058d49f6ba26e6a0f61ca8177f3795e944f256dea01ae44ad3141496e0cadc5`},{path:`references/gallery-input/InfoBadge/InfobadgeEmbeddedNavigationview.txt`,source:`WinUIGallery/Samples/InfoBadge/InfobadgeEmbeddedNavigationview.txt`,sha256:`522611df549a876ea1f4869f4f7ef6c3cee68ca12006433f6080b86afd86df5d`},{path:`references/gallery-input/InfoBadge/InfoBadgePage.xaml`,source:`WinUIGallery/Samples/InfoBadge/InfoBadgePage.xaml`,sha256:`034b189efd776da542ce2acb36429332a9260e2099e51714ecbd7916dd370873`},{path:`references/gallery-input/InfoBadge/InfoBadgePage.xaml.cs`,source:`WinUIGallery/Samples/InfoBadge/InfoBadgePage.xaml.cs`,sha256:`664b2e236a87e0c0a6904eb203298acacda40a3b24169f9c3a85006a72c9d33b`},{path:`references/gallery-input/InfoBadge/PlacingInfobadgeInsideAnother.txt`,source:`WinUIGallery/Samples/InfoBadge/PlacingInfobadgeInsideAnother.txt`,sha256:`c9cd9db7786cb06c37271caf0e242738eb0fb5c5942b2d0499614d0cb0ac2a93`}]},P=`import { LocalizedText } from "./GalleryLanguage";
import { SourceCode } from './SourceCode';
import { GalleryButton, GalleryCheckBox, GalleryComboBox, GalleryExpander, GalleryExpanderHeader, GalleryOption, GallerySlider } from './GalleryControls';
import { useGalleryTheme } from './gallery-theme';
import { useEffect, useState, type ReactNode } from "react";
import { Header } from "./ButtonPage";
import {
  SceneView,
  Border,
  Canvas,
  HyperlinkButton,
  Expander,
  InfoBadge,
  Grid,
  StackPanel,
  TextBlock,
  Button,
} from "winui-wasm/react";
import {
  ThemeMode,
  RendererBackend,
  ExpandDirection,
  InfoBadgeStyle,
  Symbol,
  Orientation,
  HorizontalAlignment,
  VerticalAlignment,
  type Scene,
} from "winui-wasm";
import official from "./official-five-controls.json";
import layoutOfficial from './official-layout-gallery.json';
import source from "./FiveControlsPage.tsx?raw";
import { extractSampleSource } from "./sample-source";
export type FivePage = keyof typeof official.controls;
declare global {
  interface Window {
    fiveScenes: Record<string, Scene>;
  }
}
function remember(name: string, s: Scene) {
  window.fiveScenes ??= {};
  window.fiveScenes[name] = s;
}
function Example({
  name,
  page,
  index = 0,
  children,
  options,
  nativeXaml,
}: {
  name: string;
  page: FivePage;
  index?: number;
  children: ReactNode;
  options?: ReactNode;
  nativeXaml?: string;
}) {
  const [native, setNative] = useState(false);
  const sample = page === 'Expander' ? layoutOfficial.controls.Expander.samples[index] : official.controls[page].samples[index];
  return (
    <section id={name} className="example basic-example">
      <h2><LocalizedText>{sample.title}</LocalizedText></h2>
      <div className="example-card">
        <div className={\`basic-live \${options ? "with-options" : ""}\`}>
          <div className="basic-preview">{children}</div>
          {options && <div className="options">{options}</div>}
        </div>
        <GalleryExpander className="source">
          <GalleryExpanderHeader>Source code</GalleryExpanderHeader>
          <div className="source-tabs">
            <GalleryButton
              className={!native ? "active" : ""}
              onClick={() => setNative(false)}
            >
              TypeScript / React
            </GalleryButton>
            <GalleryButton
              className={native ? "active" : ""}
              onClick={() => setNative(true)}
            >
              Official XAML
            </GalleryButton>
          </div>
          <SourceCode language={native ? 'xaml' : 'tsx'}>{native ? nativeXaml ?? sample.xaml : extractSampleSource(source, name)}</SourceCode>
        </GalleryExpander>
      </div>
    </section>
  );
}
export function FiveControlsPage({ page }: { page: FivePage }) {
  const [theme, setTheme] = useGalleryTheme(),
    [backend, setBackend] = useState(RendererBackend.Canvas2D);
  const [radius, setRadius] = useState(8),
    [thickness, setThickness] = useState(2),
    [reversed, setReversed] = useState(false),
    [count, setCount] = useState(0),
    [disabled, setDisabled] = useState(false),
    [direction, setDirection] = useState(ExpandDirection.Down),
    [badgeStyle, setBadgeStyle] = useState(InfoBadgeStyle.Attention),
    [expanded, setExpanded] = useState(false);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  const shared = { theme, backend };
  const glyphs: Record<InfoBadgeStyle, string> = {
    Default: "\\uEA38",
    Attention: "\\uEA38",
    Informational: "\\uF13F",
    Success: "\\uE8FB",
    Caution: "\\uE814",
    Critical: "\\uE711",
  };
  return (
    <>
      <Header title={page} theme={theme} onTheme={setTheme} />
      <main className="stage-main official-motion">
        
        <div className="effects-options">
          <label>
            Renderer{" "}
            <GalleryComboBox
              aria-label="Renderer"
              value={backend}
              onValueChanged={(e) => setBackend(e as RendererBackend)}
            >
              {Object.values(RendererBackend).map((v) => (
                <GalleryOption key={v}>{v}</GalleryOption>
              ))}
            </GalleryComboBox>
          </label>
        </div>
        {page === "Border" && (
          <Example
            name="border-text"
            page={page}
            options={
              <>
                <label>
                  Corner radius{" "}
                  <GallerySlider
                    aria-label="Corner radius"
                    
                    min="0"
                    max="30"
                    value={radius}
                    onValueChanged={(e) => setRadius(e)}
                  />
                  {radius}
                </label>
                <label>
                  Border thickness{" "}
                  <GallerySlider
                    aria-label="Border thickness"
                    
                    min="0"
                    max="12"
                    value={thickness}
                    onValueChanged={(e) => setThickness(e)}
                  />
                  {thickness}
                </label>
              </>
            }
          >
            <SceneView
              {...shared}
              style={{ height: 170 }}
              onReady={(s) => remember("border-text", s)}
            >
              {/* @sample:border-text:start */}
              <Border
                borderBrush="#000000"
                borderThickness={[thickness, thickness, thickness, thickness]}
                cornerRadius={radius}
                background="#ffffff"
                padding={[20, 20, 20, 20]}
                horizontalAlignment={HorizontalAlignment.Left}
                verticalAlignment={VerticalAlignment.Top}
              >
                <TextBlock
                  text="Text inside a border"
                  fontSize={18}
                  foreground="#000000"
                />
              </Border>
              {/* @sample:border-text:end */}
            </SceneView>
          </Example>
        )}
        {page === "Canvas" && (
          <Example
            name="canvas-position"
            page={page}
            options={
              <GalleryButton onClick={() => setReversed((v) => !v)}>
                Reverse stacking order
              </GalleryButton>
            }
          >
            <SceneView
              {...shared}
              style={{ height: 170 }}
              onReady={(s) => remember("canvas-position", s)}
            >
              {/* @sample:canvas-position:start */}
              <Canvas
                width={120}
                height={120}
                background="#808080"
                horizontalAlignment={HorizontalAlignment.Left}
                verticalAlignment={VerticalAlignment.Top}
              >
                <Grid
                  width={60}
                  height={60}
                  background="#ff0000"
                  zIndex={reversed ? 3 : 0}
                />
                <Grid
                  width={60}
                  height={60}
                  background="#0000ff"
                  canvasLeft={20}
                  canvasTop={20}
                  zIndex={reversed ? 2 : 1}
                />
                <Grid
                  width={60}
                  height={60}
                  background="#008000"
                  canvasLeft={40}
                  canvasTop={40}
                  zIndex={reversed ? 1 : 2}
                />
                <Grid
                  width={60}
                  height={60}
                  background="#ffff00"
                  canvasLeft={60}
                  canvasTop={60}
                  zIndex={reversed ? 0 : 3}
                />
              </Canvas>
              {/* @sample:canvas-position:end */}
            </SceneView>
          </Example>
        )}
        {page === "HyperlinkButton" && (
          <>
            <Example name="hyperlink-uri" page={page}>
              <SceneView
                {...shared}
                style={{ height: 80 }}
                onReady={(s) => remember("hyperlink-uri", s)}
              >
                {/* @sample:hyperlink-uri:start */}
                <HyperlinkButton
                  text="Microsoft home page"
                  navigateUri="https://www.microsoft.com"
                />
                {/* @sample:hyperlink-uri:end */}
              </SceneView>
            </Example>
            <Example
              name="hyperlink-click"
              page={page}
              index={1}
              options={
                <GalleryCheckBox
                    
                    checked={disabled}
                    onValueChanged={(e) => setDisabled(e)}  label={<>
                  
                  Disable hyperlink
                </>}/>
              }
            >
              <SceneView
                {...shared}
                style={{ height: 80 }}
                onReady={(s) => remember("hyperlink-click", s)}
              >
                {/* @sample:hyperlink-click:start */}
                <HyperlinkButton
                  text="Click me"
                  enabled={!disabled}
                  onClick={() => setCount((v) => v + 1)}
                />
                {/* @sample:hyperlink-click:end */}
              </SceneView>
              <output aria-live="polite">Clicked {count} times</output>
            </Example>
          </>
        )}
        {page === "Expander" && (
          <>
          <Example
            name="expander-text"
            page={page}
            nativeXaml={layoutOfficial.controls.Expander.samples[0].xaml
              .replace(/ExpandDirection="[^"]+"/, \`ExpandDirection="\${direction}"\`)
              .replace(/VerticalAlignment="[^"]+"/, \`VerticalAlignment="\${direction === ExpandDirection.Up ? 'Bottom' : 'Top'}"\`)
              .replace(/IsExpanded="[^"]+"/, \`IsExpanded="\${expanded ? 'True' : 'False'}"\`)}
            options={
              <>
                <label>
                  ExpandDirection{" "}
                  <GalleryComboBox
                    aria-label="ExpandDirection"
                    value={direction}
                    onValueChanged={(e) =>
                      setDirection(e as ExpandDirection)
                    }
                  >
                    {Object.values(ExpandDirection).map((v) => (
                      <GalleryOption key={v}>{v}</GalleryOption>
                    ))}
                  </GalleryComboBox>
                </label>
              </>
            }
          >
            <SceneView
              {...shared}
              style={{ height: 250 }}
              onReady={(s) => remember("expander-text", s)}
            >
              {/* @sample:expander-text:start */}
              <Expander
                header="This text is in the header"
                expandDirection={direction}
                verticalAlignment={direction === ExpandDirection.Up ? VerticalAlignment.Bottom : VerticalAlignment.Top}
                onExpanding={() => setExpanded(true)}
                onCollapsed={() => setExpanded(false)}
              >
                <TextBlock text="This is in the content" />
              </Expander>
              {/* @sample:expander-text:end */}
            </SceneView>
          </Example>
          <Example name="expander-alignment" page={page} index={1}>
            <SceneView {...shared} autoHeight onReady={s => remember('expander-alignment', s)}>
              {/* @sample:expander-alignment:start */}
              <Expander width={500} padding={[0,0,0,0]} horizontalContentAlignment={HorizontalAlignment.Left}
                header={<TextBlock text="This text is centered" horizontalAlignment={HorizontalAlignment.Center} verticalAlignment={VerticalAlignment.Center}/> }>
                <TextBlock text="And this text is left aligned" margin={[4,4,4,4]}/>
              </Expander>
              {/* @sample:expander-alignment:end */}
            </SceneView>
          </Example>
          </>
        )}
        {page === "InfoBadge" && (
          <>
            <Example
              name="badge-styles"
              page={page}
              index={1}
              options={
                <label>
                  Styles{" "}
                  <GalleryComboBox
                    aria-label="Badge style"
                    value={badgeStyle}
                    onValueChanged={(e) =>
                      setBadgeStyle(e as InfoBadgeStyle)
                    }
                  >
                    {[InfoBadgeStyle.Attention,InfoBadgeStyle.Informational,InfoBadgeStyle.Success,InfoBadgeStyle.Critical].map((v) => (
                      <GalleryOption key={v}>{v}</GalleryOption>
                    ))}
                  </GalleryComboBox>
                </label>
              }
            >
              <SceneView
                {...shared}
                style={{ height: 90 }}
                onReady={(s) => remember("badge-styles", s)}
              >
                {/* @sample:badge-styles:start */}
                <StackPanel
                  orientation={Orientation.Horizontal}
                  spacing={20}
                  horizontalAlignment={HorizontalAlignment.Center}
                  verticalAlignment={VerticalAlignment.Center}
                >
                  <InfoBadge
                    glyph={badgeStyle===InfoBadgeStyle.Success||badgeStyle===InfoBadgeStyle.Critical?"":glyphs[badgeStyle]}
                    symbol={badgeStyle===InfoBadgeStyle.Success?Symbol.Accept:badgeStyle===InfoBadgeStyle.Critical?Symbol.Cancel:null}
                    badgeStyle={badgeStyle}
                    accessibleName="Icon notification"
                  />
                  <InfoBadge
                    value={10}
                    badgeStyle={badgeStyle}
                    accessibleName="10 notifications"
                  />
                  <InfoBadge
                    badgeStyle={badgeStyle}
                    accessibleName="Unread notification"
                    verticalAlignment={VerticalAlignment.Center}
                  />
                </StackPanel>
                {/* @sample:badge-styles:end */}
              </SceneView>
            </Example>
            <Example name="badge-button" page={page} index={2}>
              <SceneView
                {...shared}
                style={{ height: 90 }}
                onReady={(s) => remember("badge-button", s)}
              >
                {/* @sample:badge-button:start */}
                <Button onClick={() => setCount((v) => v + 1)}>
                  <StackPanel orientation={Orientation.Horizontal} spacing={8}>
                    <TextBlock text="Notifications" />
                    <InfoBadge value={count} />
                  </StackPanel>
                </Button>
                {/* @sample:badge-button:end */}
              </SceneView>
            </Example>
          </>
        )}
      </main>
    </>
  );
}
`,F=D();function I(e,t){window.fiveScenes??={},window.fiveScenes[e]=t}function L({name:e,page:t,index:n=0,children:r,options:i,nativeXaml:a}){let[o,s]=(0,M.useState)(!1),c=t===`Expander`?j.controls.Expander.samples[n]:N.controls[t].samples[n];return(0,F.jsxs)(`section`,{id:e,className:`example basic-example`,children:[(0,F.jsx)(`h2`,{children:(0,F.jsx)(E,{children:c.title})}),(0,F.jsxs)(`div`,{className:`example-card`,children:[(0,F.jsxs)(`div`,{className:`basic-live ${i?`with-options`:``}`,children:[(0,F.jsx)(`div`,{className:`basic-preview`,children:r}),i&&(0,F.jsx)(`div`,{className:`options`,children:i})]}),(0,F.jsxs)(_,{className:`source`,children:[(0,F.jsx)(d,{children:`Source code`}),(0,F.jsxs)(`div`,{className:`source-tabs`,children:[(0,F.jsx)(T,{className:o?``:`active`,onClick:()=>s(!1),children:`TypeScript / React`}),(0,F.jsx)(T,{className:o?`active`:``,onClick:()=>s(!0),children:`Official XAML`})]}),(0,F.jsx)(O,{language:o?`xaml`:`tsx`,children:o?a??c.xaml:k(P,e)})]})]})]})}function R({page:d}){let[_,S]=g(),[E,D]=(0,M.useState)(n.Canvas2D),[O,k]=(0,M.useState)(8),[N,P]=(0,M.useState)(2),[R,z]=(0,M.useState)(!1),[B,V]=(0,M.useState)(0),[H,U]=(0,M.useState)(!1),[W,G]=(0,M.useState)(s.Down),[K,q]=(0,M.useState)(p.Attention),[J,Y]=(0,M.useState)(!1);(0,M.useEffect)(()=>{document.documentElement.dataset.theme=_},[_]);let X={theme:_,backend:E},Z={Default:``,Attention:``,Informational:``,Success:``,Caution:``,Critical:``};return(0,F.jsxs)(F.Fragment,{children:[(0,F.jsx)(A,{title:d,theme:_,onTheme:S}),(0,F.jsxs)(`main`,{className:`stage-main official-motion`,children:[(0,F.jsx)(`div`,{className:`effects-options`,children:(0,F.jsxs)(`label`,{children:[`Renderer`,` `,(0,F.jsx)(C,{"aria-label":`Renderer`,value:E,onValueChanged:e=>D(e),children:Object.values(n).map(e=>(0,F.jsx)(y,{children:e},e))})]})}),d===`Border`&&(0,F.jsx)(L,{name:`border-text`,page:d,options:(0,F.jsxs)(F.Fragment,{children:[(0,F.jsxs)(`label`,{children:[`Corner radius`,` `,(0,F.jsx)(h,{"aria-label":`Corner radius`,min:`0`,max:`30`,value:O,onValueChanged:e=>k(e)}),O]}),(0,F.jsxs)(`label`,{children:[`Border thickness`,` `,(0,F.jsx)(h,{"aria-label":`Border thickness`,min:`0`,max:`12`,value:N,onValueChanged:e=>P(e)}),N]})]}),children:(0,F.jsx)(l,{...X,style:{height:170},onReady:e=>I(`border-text`,e),children:(0,F.jsx)(t,{borderBrush:`#000000`,borderThickness:[N,N,N,N],cornerRadius:O,background:`#ffffff`,padding:[20,20,20,20],horizontalAlignment:f.Left,verticalAlignment:b.Top,children:(0,F.jsx)(w,{text:`Text inside a border`,fontSize:18,foreground:`#000000`})})})}),d===`Canvas`&&(0,F.jsx)(L,{name:`canvas-position`,page:d,options:(0,F.jsx)(T,{onClick:()=>z(e=>!e),children:`Reverse stacking order`}),children:(0,F.jsx)(l,{...X,style:{height:170},onReady:e=>I(`canvas-position`,e),children:(0,F.jsxs)(v,{width:120,height:120,background:`#808080`,horizontalAlignment:f.Left,verticalAlignment:b.Top,children:[(0,F.jsx)(r,{width:60,height:60,background:`#ff0000`,zIndex:R?3:0}),(0,F.jsx)(r,{width:60,height:60,background:`#0000ff`,canvasLeft:20,canvasTop:20,zIndex:R?2:1}),(0,F.jsx)(r,{width:60,height:60,background:`#008000`,canvasLeft:40,canvasTop:40,zIndex:R?1:2}),(0,F.jsx)(r,{width:60,height:60,background:`#ffff00`,canvasLeft:60,canvasTop:60,zIndex:R?0:3})]})})}),d===`HyperlinkButton`&&(0,F.jsxs)(F.Fragment,{children:[(0,F.jsx)(L,{name:`hyperlink-uri`,page:d,children:(0,F.jsx)(l,{...X,style:{height:80},onReady:e=>I(`hyperlink-uri`,e),children:(0,F.jsx)(u,{text:`Microsoft home page`,navigateUri:`https://www.microsoft.com`})})}),(0,F.jsxs)(L,{name:`hyperlink-click`,page:d,index:1,options:(0,F.jsx)(x,{checked:H,onValueChanged:e=>U(e),label:(0,F.jsx)(F.Fragment,{children:`Disable hyperlink`})}),children:[(0,F.jsx)(l,{...X,style:{height:80},onReady:e=>I(`hyperlink-click`,e),children:(0,F.jsx)(u,{text:`Click me`,enabled:!H,onClick:()=>V(e=>e+1)})}),(0,F.jsxs)(`output`,{"aria-live":`polite`,children:[`Clicked `,B,` times`]})]})]}),d===`Expander`&&(0,F.jsxs)(F.Fragment,{children:[(0,F.jsx)(L,{name:`expander-text`,page:d,nativeXaml:j.controls.Expander.samples[0].xaml.replace(/ExpandDirection="[^"]+"/,`ExpandDirection="${W}"`).replace(/VerticalAlignment="[^"]+"/,`VerticalAlignment="${W===s.Up?`Bottom`:`Top`}"`).replace(/IsExpanded="[^"]+"/,`IsExpanded="${J?`True`:`False`}"`),options:(0,F.jsx)(F.Fragment,{children:(0,F.jsxs)(`label`,{children:[`ExpandDirection`,` `,(0,F.jsx)(C,{"aria-label":`ExpandDirection`,value:W,onValueChanged:e=>G(e),children:Object.values(s).map(e=>(0,F.jsx)(y,{children:e},e))})]})}),children:(0,F.jsx)(l,{...X,style:{height:250},onReady:e=>I(`expander-text`,e),children:(0,F.jsx)(c,{header:`This text is in the header`,expandDirection:W,verticalAlignment:W===s.Up?b.Bottom:b.Top,onExpanding:()=>Y(!0),onCollapsed:()=>Y(!1),children:(0,F.jsx)(w,{text:`This is in the content`})})})}),(0,F.jsx)(L,{name:`expander-alignment`,page:d,index:1,children:(0,F.jsx)(l,{...X,autoHeight:!0,onReady:e=>I(`expander-alignment`,e),children:(0,F.jsx)(c,{width:500,padding:[0,0,0,0],horizontalContentAlignment:f.Left,header:(0,F.jsx)(w,{text:`This text is centered`,horizontalAlignment:f.Center,verticalAlignment:b.Center}),children:(0,F.jsx)(w,{text:`And this text is left aligned`,margin:[4,4,4,4]})})})})]}),d===`InfoBadge`&&(0,F.jsxs)(F.Fragment,{children:[(0,F.jsx)(L,{name:`badge-styles`,page:d,index:1,options:(0,F.jsxs)(`label`,{children:[`Styles`,` `,(0,F.jsx)(C,{"aria-label":`Badge style`,value:K,onValueChanged:e=>q(e),children:[p.Attention,p.Informational,p.Success,p.Critical].map(e=>(0,F.jsx)(y,{children:e},e))})]}),children:(0,F.jsx)(l,{...X,style:{height:90},onReady:e=>I(`badge-styles`,e),children:(0,F.jsxs)(m,{orientation:o.Horizontal,spacing:20,horizontalAlignment:f.Center,verticalAlignment:b.Center,children:[(0,F.jsx)(e,{glyph:K===p.Success||K===p.Critical?``:Z[K],symbol:K===p.Success?i.Accept:K===p.Critical?i.Cancel:null,badgeStyle:K,accessibleName:`Icon notification`}),(0,F.jsx)(e,{value:10,badgeStyle:K,accessibleName:`10 notifications`}),(0,F.jsx)(e,{badgeStyle:K,accessibleName:`Unread notification`,verticalAlignment:b.Center})]})})}),(0,F.jsx)(L,{name:`badge-button`,page:d,index:2,children:(0,F.jsx)(l,{...X,style:{height:90},onReady:e=>I(`badge-button`,e),children:(0,F.jsx)(a,{onClick:()=>V(e=>e+1),children:(0,F.jsxs)(m,{orientation:o.Horizontal,spacing:8,children:[(0,F.jsx)(w,{text:`Notifications`}),(0,F.jsx)(e,{value:B})]})})})})]})]})]})}export{R as FiveControlsPage};