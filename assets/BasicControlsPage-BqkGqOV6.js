import{Fr as e,M as t,Wt as n,Z as r,Zn as i,a,en as o,fn as s,g as c,i as l,ir as u,l as d,n as f,pi as p,r as m,sn as h,t as g,u as _,ur as v,v as y,wn as b}from"./GalleryControls-jbXHT3zS.js";import{t as x}from"./SourceCode-C2xz3uBh.js";import{i as S,r as C}from"./ButtonPage-Cv9H35SX.js";var w=p(),T={galleryCommit:`7360ac322414e118eadfb0c7c2f4ecc31a218f59`,descriptions:{CheckBox:`CheckBox controls let the user select a combination of binary options. In contrast, RadioButton controls allow the user to select from mutually exclusive options. The indeterminate state is used to indicate that an option is set for some, but not all, child options. Don't allow users to set an indeterminate state directly to indicate a third option.`,Image:`You can use an Image control to show and scale images.`,TextBlock:`TextBlock is the primary control for displaying read-only text in your app. You typically display text by setting the Text property to a simple string. You can also display a series of strings in Run elements and give each different formatting.`,ToggleButton:`A ToggleButton looks like a Button, but works like a CheckBox. It typically has two states, checked (on) or unchecked (off), but can be indeterminate if the IsThreeState property is true. You can determine it's state by checking the IsChecked property.`},samples:{CheckBox:[{file:`CheckBoxSelectAll.txt`,title:`Using a 3-state CheckBox.`,xaml:`<StackPanel>
    <CheckBox x:Name="OptionsAllCheckBox" Content="Select all" IsThreeState="True"
              Checked="SelectAll_Checked" Unchecked="SelectAll_Unchecked"
              Indeterminate="SelectAll_Indeterminate" />
    <CheckBox x:Name="Option1CheckBox" Content="Option 1" Margin="24,0,0,0" Checked="Option_Checked" Unchecked="Option_Unchecked" />
    <CheckBox x:Name="Option2CheckBox" Content="Option 2" Margin="24,0,0,0" Checked="Option_Checked" Unchecked="Option_Unchecked" IsChecked="True" />
    <CheckBox x:Name="Option3CheckBox" Content="Option 3" Margin="24,0,0,0" Checked="Option_Checked" Unchecked="Option_Unchecked" />
</StackPanel>`},{file:`CheckBoxThreeState.txt`,title:`A 3-state CheckBox.`,xaml:`<CheckBox Content="Three-state CheckBox"
          IsThreeState="True"
          Checked="ThreeState_Checked"
          Unchecked="ThreeState_Unchecked"
          Indeterminate="ThreeState_Indeterminate" />`},{file:`CheckBoxTwoState.txt`,title:`A 2-state CheckBox.`,xaml:`<CheckBox Content="Two-state CheckBox"
          Checked="TwoState_Checked"
          Unchecked="TwoState_Unchecked" />`}],Image:[{file:`AnimatedGif.txt`,title:`Animated GIF playback.`,xaml:`<StackPanel Spacing="12">
    <TextBlock Text="An Image element automatically plays an animated GIF source." TextWrapping="Wrap"/>
    <Image Height="40" HorizontalAlignment="Left" Source="/Assets/SampleMedia/animated.gif"/>

    <TextBlock Text="Set AutoPlay to False to prevent the GIF from playing automatically." TextWrapping="Wrap"/>
    <Image Height="40" HorizontalAlignment="Left">
        <Image.Source>
            <BitmapImage AutoPlay="False" UriSource="/Assets/SampleMedia/animated.gif"/>
        </Image.Source>
    </Image>

    <TextBlock Text="Control playback manually using BitmapImage.Play() and Stop()." TextWrapping="Wrap"/>
    <Image Height="40" HorizontalAlignment="Left">
        <Image.Source>
            <BitmapImage x:Name="ClickToPlaySource" AutoPlay="False"
                         UriSource="/Assets/SampleMedia/animated.gif"
                         ImageOpened="ClickToPlaySource_ImageOpened"/>
        </Image.Source>
    </Image>
</StackPanel>

<!-- The Play/Stop buttons live in ControlExample.Options so they appear in the side panel. -->
<StackPanel x:Name="PlaybackButtons" Spacing="8" Visibility="Collapsed">
    <Button Content="Play" Click="{x:Bind ClickToPlaySource.Play}"/>
    <Button Content="Stop" Click="{x:Bind ClickToPlaySource.Stop}"/>
</StackPanel>
--- c#
private void ClickToPlaySource_ImageOpened(object sender, RoutedEventArgs e)
{
    // BitmapImage.IsAnimatedBitmap is only valid after ImageOpened has been raised.
    if (ClickToPlaySource.IsAnimatedBitmap)
    {
        PlaybackButtons.Visibility = Visibility.Visible;
    }
}`},{file:`BasicImageLocalFile.txt`,title:`A basic image from a local file.`,xaml:`<Image Source="/Assets/SampleMedia/treetops.jpg" Height="100" />`},{file:`ImageDecodedRenderingSize.txt`,title:`An image decoded to the rendering size`,xaml:`<Image Height="100">
    <Image.Source>
        <BitmapImage UriSource="/Assets/SampleMedia/treetops.jpg"
            DecodePixelHeight="100" />
    </Image.Source>
</Image>`},{file:`ImageStretching.txt`,title:`Image stretching.`,xaml:`<Image Stretch="$(Stretch)" Height="100" Width="100" Source="/Assets/SampleMedia/valley.jpg" />`},{file:`NineGridImages.txt`,title:`Nine grid images.`,xaml:`<Image Source="/Assets/SampleMedia/ninegrid.gif" Height="82" />
<Image Source="/Assets/SampleMedia/ninegrid.gif" NineGrid="3,3,3,3" Height="164" />
<Image Source="/Assets/SampleMedia/ninegrid.gif" NineGrid="30,20,30,20" Height="164" />`},{file:`SvgImage.txt`,title:`An SVG image.`,xaml:`<Image Source="/Assets/SampleMedia/MirrorPCConsent.svg" Height="100" />`}],TextBlock:[{file:`SelectableTextblock.txt`,title:`A selectable TextBlock`,xaml:`<TextBlock IsTextSelectionEnabled="$(IsTextSelectionEnabled)"
           Text="I am a selectable TextBlock with custom SelectionHighlightColor."
           SelectionHighlightColor="DarkOrange" />`},{file:`SimpleTextblock.txt`,title:`A simple TextBlock.`,xaml:`<TextBlock Text="I am a TextBlock"/>`},{file:`TextblockInlineTextElements.txt`,title:`A TextBlock with inline text elements.`,xaml:`<TextBlock>
    <Run FontFamily="Times New Roman" Foreground="DarkGray">Text in a TextBlock doesn't have to be a simple string.</Run>
    <LineBreak />
    <Span>
        Text can be <Bold>bold</Bold>, <Italic>italic</Italic>, or <Underline>underlined</Underline>.
    </Span>
</TextBlock>`},{file:`TextblockStyleApplied.txt`,title:`A TextBlock with a style applied.`,xaml:`<Page.Resources>
    <Style TargetType="TextBlock" x:Key="CustomTextBlockStyle">
        <Setter Property="FontFamily" Value="Comic Sans MS"/>
        <Setter Property="FontStyle" Value="Italic"/>
    </Style>
</Page.Resources>

<TextBlock Text="I am a styled TextBlock" Style="{StaticResource CustomTextBlockStyle}"/>`},{file:`TextblockVariousProperties.txt`,title:`A TextBlock with various properties set.`,xaml:`<TextBlock Text="I am super excited to be here!" FontFamily="Arial"
    FontSize="24" FontStyle="Italic" TextWrapping="WrapWholeWords"
    CharacterSpacing="200" Foreground="CornflowerBlue" />`}],ToggleButton:[{file:`ToggleButtonSimple.txt`,title:`A simple ToggleButton with text content.`,xaml:`<ToggleButton Content="ToggleButton" Click="Button_Click" $(IsEnabled)/>`}]},sources:[{path:`references/gallery-foundation/CheckBox/CheckBoxPage.xaml`,sha256:`18f8d1becf4bf01af1070e9d68204f33abb49aca2b849fbeca0baeba324ee36c`},{path:`references/gallery-foundation/CheckBox/CheckBoxPage.xaml.cs`,sha256:`6d9422e276dc73d5f6a20505ed22ce5dbbceec91b433f68414dff405f672ab78`},{path:`references/gallery-foundation/CheckBox/CheckBoxSelectAll.txt`,sha256:`49151e331a2f44f61474f8975304bbc3d510894f41b605590777078ffe2c6c3e`},{path:`references/gallery-foundation/CheckBox/CheckBoxThreeState.txt`,sha256:`396c1db0163eafc630ed8cab26a509f15eefa0167b8653bfd4e486fc741fe0fb`},{path:`references/gallery-foundation/CheckBox/CheckBoxTwoState.txt`,sha256:`05b9e8cd42a8805527ff4e60c59f122fc455fab949b844ea5bd9bd6a214ebb0e`},{path:`references/gallery-foundation/Image/AnimatedGif.txt`,sha256:`0041a94938a0716d2a420be5c0612cb146aa0b3f13287bc3d7b9697a37aa2c22`},{path:`references/gallery-foundation/Image/BasicImageLocalFile.txt`,sha256:`9d1e5b8781e53413b0bd22c75bc5c6686d775019f1e9de989c60a33cb8f70c4b`},{path:`references/gallery-foundation/Image/ImageDecodedRenderingSize.txt`,sha256:`169c000c56533213f6e43538d8c924b65add762905d0adf2389d56a1afe7617d`},{path:`references/gallery-foundation/Image/ImagePage.xaml`,sha256:`d0997a310e862aae57c19c8c09fea11c54ea9f91c45003cd84a9fe868d317b0f`},{path:`references/gallery-foundation/Image/ImagePage.xaml.cs`,sha256:`e215e8d6e6ee7ba37f2f6b7a41b86a32bad1e4e680bd07b2d5f6c1824e93fe00`},{path:`references/gallery-foundation/Image/ImageStretching.txt`,sha256:`0d2c4371c2a5fc094bf0ab632a658103fcb4dc593bf302b3bb57657e0fdca45a`},{path:`references/gallery-foundation/Image/NineGridImages.txt`,sha256:`a7b8f09f85315fb242d6e647798fd6f6821889cc2a971931032d8a1e765de0a5`},{path:`references/gallery-foundation/Image/SvgImage.txt`,sha256:`db60168af9cb6fc84ac39c26e9b31280cb20726dfab6c7716beeece7ea9ab4cc`},{path:`references/gallery-foundation/TextBlock/SelectableTextblock.txt`,sha256:`dcc0774bfe64c2aefbf3617e97aea237a4b67fe63f0c1c9cad3984022b384c8a`},{path:`references/gallery-foundation/TextBlock/SimpleTextblock.txt`,sha256:`6e1d6f392af0e726b353eecbd25f0e687af01b088be0e5d1853bf6d974ee6306`},{path:`references/gallery-foundation/TextBlock/TextblockInlineTextElements.txt`,sha256:`12d65819f7d80a56baab026e98c7c0ba73243b14586257bca9ef19541ef989f5`},{path:`references/gallery-foundation/TextBlock/TextBlockPage.xaml`,sha256:`a2d1f5b91363fd29c2b6f6e66d2063ebfe4df9fa0398f1a75761b5423c7cc032`},{path:`references/gallery-foundation/TextBlock/TextBlockPage.xaml.cs`,sha256:`d5bf11f3c91861c65715029276d44a84905d471a67e40501a0ee3521a06dc00a`},{path:`references/gallery-foundation/TextBlock/TextblockStyleApplied.txt`,sha256:`408c4de2046fe652c0d1dc953aa611700642fe4ff876b4800f6c12454623f61c`},{path:`references/gallery-foundation/TextBlock/TextblockVariousProperties.txt`,sha256:`1fb09552d1a0e714d827cf37fe4518401a5590579bf1023a3c301b2dca074858`},{path:`references/gallery-foundation/ToggleButton/ToggleButtonPage.xaml`,sha256:`5fc247cef8469f01cd3fb038798c3874d583d58c64080aab01d58f2a1f54bccd`},{path:`references/gallery-foundation/ToggleButton/ToggleButtonPage.xaml.cs`,sha256:`3aac9e88f31c495a42af0e552ec206178dd4c5c583a22e38d58119a9d166614b`},{path:`references/gallery-foundation/ToggleButton/ToggleButtonSimple.txt`,sha256:`a96191f42e81e4c5fe21d1839d8f3176eba74a8e1d9df38a893818e31111ca80`},{path:`references/gallery-shared/ControlExample.xaml`,sha256:`da58d94fc4d57c06032c96104b033caf9361e55400fefe0179cd2d48d62df0dd`},{path:`references/gallery-shared/Grid.xaml`,sha256:`3b7b3ef1bb2390628379943e08078246c044c6f307b2f72d8cd5719ec6780d25`}]},E=`import { LocalizedText } from "./GalleryLanguage";
import { SourceCode } from './SourceCode';
import { GalleryButton, GalleryCheckBox, GalleryComboBox, GalleryExpander, GalleryExpanderHeader, GalleryOption, GalleryRadioButton } from './GalleryControls';
import { useGalleryTheme } from './gallery-theme';
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Header } from "./ButtonPage";
import {
  SceneView,
  StackPanel,
  TextBlock,
  Image,
  ToggleButton,
  CheckBox,
} from "winui-wasm/react";
import {
  ThemeMode,
  RendererBackend,
  FontStyle,
  ImageStretch,
  EventKind,
  type Scene,
  type ToggleButtonController as ToggleController,
  type SceneEvent,
} from "winui-wasm";
import official from "./official-foundation.json";
import source from "./BasicControlsPage.tsx?raw";
import { extractSampleSource } from "./sample-source";
type PageName = "TextBlock" | "Image" | "ToggleButton" | "CheckBox";
function Code({
  name,
  page,
  file,
}: {
  name: string;
  page: PageName;
  file: string;
}) {
  const [native, setNative] = useState(false);
  const sample = official.samples[page].find((s) => s.file === file)!;
  return (
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
      <SourceCode language={native ? 'xaml' : 'tsx'}>{native ? sample.xaml : extractSampleSource(source, name)}</SourceCode>
    </GalleryExpander>
  );
}
function Example({
  page,
  file,
  name,
  children,
  options,
  output,
}: {
  page: PageName;
  file: string;
  name: string;
  children: ReactNode;
  options?: ReactNode;
  output?: string;
}) {
  const sample = official.samples[page].find((s) => s.file === file)!;
  return (
    <section className="example basic-example">
      <h2><LocalizedText>{sample.title}</LocalizedText></h2>
      <div className="example-card">
        <div className={options ? "basic-live with-options" : "basic-live"}>
          <div className="basic-preview">{children}</div>
          {output !== undefined && (
            <div className="basic-output">
              <span>Output:</span>
              <span role="status">{output}</span>
            </div>
          )}
          {options && <aside className="options">{options}</aside>}
        </div>
        <Code {...{ page, file, name }} />
      </div>
    </section>
  );
}
const isStateEvent = (e: SceneEvent) =>
  [EventKind.Checked, EventKind.Unchecked, EventKind.Indeterminate].includes(
    e.kind,
  );
function CheckBoxExamples({
  theme,
  backend,
}: {
  theme: ThemeMode;
  backend: RendererBackend;
}) {
  const [two, setTwo] = useState(""),
    [three, setThree] = useState("");
  const parent = useRef<ToggleController | null>(null),
    children = useRef<ToggleController[]>([]);
  const selectAllScene = useRef<Scene | null>(null);
  function recompute() {
    if (
      !parent.current ||
      parent.current.isDisposed ||
      children.current.filter((c) => c && !c.isDisposed).length !== 3
    )
      return;
    const values = children.current.map((c) => c.properties.isChecked);
    parent.current.update({
      isChecked: values.every((v) => v === true)
        ? true
        : values.every((v) => v === false)
          ? false
          : null,
    });
  }
  // @sample:select-all:start
  function selectAll(event: SceneEvent) {
    if (
      !isStateEvent(event) ||
      !parent.current ||
      parent.current.isDisposed ||
      children.current.filter((c) => c && !c.isDisposed).length !== 3
    )
      return;
    const checked = event.isChecked;
    if (checked === undefined) return;
    if (checked === null) {
      if (children.current.every((c) => c.properties.isChecked === true))
        parent.current!.update({ isChecked: false });
    } else {
      selectAllScene.current?.batch(() =>
        children.current.forEach((c) => c.update({ isChecked: checked })),
      );
    }
  }
  // @sample:select-all:end
  return (
    <>
      <Example
        page="CheckBox"
        file="CheckBoxTwoState.txt"
        name="two-state"
        output={two}
      >
        {/* @sample:two-state:start */}
        <SceneView theme={theme} backend={backend} style={{ height: 32 }}>
          <CheckBox
            text="Two-state CheckBox"
            accessibleName="Two-state"
            onEvent={(e) => {
              if (e.kind === EventKind.Checked) setTwo("You checked the box.");
              if (e.kind === EventKind.Unchecked)
                setTwo("You unchecked the box.");
            }}
          />
        </SceneView>
        {/* @sample:two-state:end */}
      </Example>
      <Example
        page="CheckBox"
        file="CheckBoxThreeState.txt"
        name="three-state"
        output={three}
      >
        {/* @sample:three-state:start */}
        <SceneView theme={theme} backend={backend} style={{ height: 32 }}>
          <CheckBox
            text="Three-state CheckBox"
            accessibleName="Three-state"
            isThreeState={true}
            onEvent={(e) => {
              if (isStateEvent(e))
                setThree(
                  e.kind === EventKind.Checked
                    ? "CheckBox is checked."
                    : e.kind === EventKind.Unchecked
                      ? "CheckBox is unchecked."
                      : "CheckBox state is indeterminate.",
                );
            }}
          />
        </SceneView>
        {/* @sample:three-state:end */}
      </Example>
      <Example
        page="CheckBox"
        file="CheckBoxSelectAll.txt"
        name="select-all-scene"
      >
        {/* @sample:select-all-scene:start */}
        <SceneView
          theme={theme}
          backend={backend}
          style={{ height: 128 }}
          onReady={(scene) => {
            selectAllScene.current = scene;
          }}
        >
          <StackPanel>
            <CheckBox
              text="Select all"
              accessibleName="Select all"
              isThreeState={true}
              onReady={(control) => {
                parent.current = control;
                recompute();
              }}
              onEvent={selectAll}
            />
            {[0, 1, 2].map((index) => (
              <CheckBox
                key={index}
                text={\`Option \${index + 1}\`}
                isChecked={index === 1}
                margin={[24, 0, 0, 0]}
                onReady={(control) => {
                  children.current[index] = control;
                  recompute();
                }}
                onEvent={(e) => {
                  if (isStateEvent(e)) recompute();
                }}
              />
            ))}
          </StackPanel>
        </SceneView>
        {/* @sample:select-all-scene:end */}
        <GalleryExpander className="source">
          <GalleryExpanderHeader>Select all callback</GalleryExpanderHeader>
          <SourceCode>{extractSampleSource(source, "select-all")}</SourceCode>
        </GalleryExpander>
      </Example>
    </>
  );
}
export function BasicControlsPage({ page }: { page: PageName }) {
  const [theme, setTheme] = useGalleryTheme(),
    [backend, setBackend] = useState(RendererBackend.Canvas2D);
  const [disabled, setDisabled] = useState(false),
    [output, setOutput] = useState("Off"),
    [stretch, setStretch] = useState(ImageStretch.None);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return (
    <>
      <Header title={page} theme={theme} onTheme={setTheme} />
      <main className="stage-main official-motion">
        
        <div className="effects-options material-policies">
          <label>
            Renderer
            <GalleryComboBox
              aria-label="Basic renderer"
              value={backend}
              onValueChanged={(e) => setBackend(e as RendererBackend)}
            >
              {Object.values(RendererBackend).map((v) => (
                <GalleryOption key={v}>{v}</GalleryOption>
              ))}
            </GalleryComboBox>
          </label>
        </div>
        {page === "CheckBox" && (
          <CheckBoxExamples key={backend} {...{ theme, backend }} />
        )}
        {page === "ToggleButton" && (
          <Example
            page={page}
            file="ToggleButtonSimple.txt"
            name="toggle"
            output={output}
            options={
              <GalleryCheckBox
                  
                  checked={disabled}
                  onValueChanged={(e) => setDisabled(e)}  label={<>
                
                Disable ToggleButton
              </>}/>
            }
          >
            {/* @sample:toggle:start */}
            <SceneView theme={theme} backend={backend} style={{ height: 32 }}>
              <ToggleButton
                text="ToggleButton"
                enabled={!disabled}
                onChecked={() => setOutput("On")}
                onUnchecked={() => setOutput("Off")}
              />
            </SceneView>
            {/* @sample:toggle:end */}
          </Example>
        )}
        {page === "TextBlock" && (
          <>
            <Example page={page} file="SimpleTextblock.txt" name="text-simple">
              {/* @sample:text-simple:start */}
              <SceneView theme={theme} backend={backend} style={{ height: 20 }}>
                <TextBlock text="I am a TextBlock." />
              </SceneView>
              {/* @sample:text-simple:end */}
            </Example>
            <Example
              page={page}
              file="TextblockStyleApplied.txt"
              name="text-style"
            >
              {/* @sample:text-style:start */}
              <SceneView theme={theme} backend={backend} style={{ height: 24 }}>
                <TextBlock
                  text="I am a styled TextBlock."
                  fontFamily="Comic Sans MS"
                  fontStyle={FontStyle.Italic}
                />
              </SceneView>
              {/* @sample:text-style:end */}
            </Example>
          </>
        )}
        {page === "Image" && (
          <>
            <Example
              page={page}
              file="BasicImageLocalFile.txt"
              name="image-local"
            >
              {/* @sample:image-local:start */}
              <SceneView
                theme={theme}
                backend={backend}
                style={{ height: 100 }}
              >
                <Image
                  height={100}
                  source="/official/treetops.jpg"
                  accessibleName="Treetops"
                />
              </SceneView>
              {/* @sample:image-local:end */}
            </Example>
            <Example
              page={page}
              file="ImageStretching.txt"
              name="image-stretch"
              options={
                <fieldset className="stretch-options">
                  <legend>Image stretch mode</legend>
                  {[
                    ImageStretch.None,
                    ImageStretch.Fill,
                    ImageStretch.Uniform,
                    ImageStretch.UniformToFill,
                  ].map((value) => (
                    <GalleryRadioButton
                        
                        name="stretch"
                        value={value}
                        checked={stretch === value}
                        onValueChanged={() => setStretch(value)} className="check-option" key={value} label={<>
                      
                      {value}
                    </>}/>
                  ))}
                </fieldset>
              }
            >
              {/* @sample:image-stretch:start */}
              <SceneView
                theme={theme}
                backend={backend}
                style={{ height: 100 }}
              >
                <Image
                  width={100}
                  height={100}
                  source="/official/valley.jpg"
                  stretch={stretch}
                  accessibleName="Valley"
                />
              </SceneView>
              {/* @sample:image-stretch:end */}
            </Example>
          </>
        )}
      </main>
    </>
  );
}
`,D=b();function O({name:e,page:t,file:n}){let[r,i]=(0,w.useState)(!1),o=T.samples[t].find(e=>e.file===n);return(0,D.jsxs)(l,{className:`source`,children:[(0,D.jsx)(a,{children:`Source code`}),(0,D.jsxs)(`div`,{className:`source-tabs`,children:[(0,D.jsx)(g,{className:r?``:`active`,onClick:()=>i(!1),children:`TypeScript / React`}),(0,D.jsx)(g,{className:r?`active`:``,onClick:()=>i(!0),children:`Official XAML`})]}),(0,D.jsx)(x,{language:r?`xaml`:`tsx`,children:r?o.xaml:S(E,e)})]})}function k({page:e,file:t,name:n,children:r,options:i,output:a}){let o=T.samples[e].find(e=>e.file===t);return(0,D.jsxs)(`section`,{className:`example basic-example`,children:[(0,D.jsx)(`h2`,{children:(0,D.jsx)(y,{children:o.title})}),(0,D.jsxs)(`div`,{className:`example-card`,children:[(0,D.jsxs)(`div`,{className:i?`basic-live with-options`:`basic-live`,children:[(0,D.jsx)(`div`,{className:`basic-preview`,children:r}),a!==void 0&&(0,D.jsxs)(`div`,{className:`basic-output`,children:[(0,D.jsx)(`span`,{children:`Output:`}),(0,D.jsx)(`span`,{role:`status`,children:a})]}),i&&(0,D.jsx)(`aside`,{className:`options`,children:i})]}),(0,D.jsx)(O,{page:e,file:t,name:n})]})]})}var A=e=>[i.Checked,i.Unchecked,i.Indeterminate].includes(e.kind);function j({theme:e,backend:r}){let[s,c]=(0,w.useState)(``),[u,d]=(0,w.useState)(``),f=(0,w.useRef)(null),p=(0,w.useRef)([]),m=(0,w.useRef)(null);function h(){if(!f.current||f.current.isDisposed||p.current.filter(e=>e&&!e.isDisposed).length!==3)return;let e=p.current.map(e=>e.properties.isChecked);f.current.update({isChecked:e.every(e=>e===!0)?!0:!e.every(e=>e===!1)&&null})}function g(e){if(!A(e)||!f.current||f.current.isDisposed||p.current.filter(e=>e&&!e.isDisposed).length!==3)return;let t=e.isChecked;t!==void 0&&(t===null?p.current.every(e=>e.properties.isChecked===!0)&&f.current.update({isChecked:!1}):m.current?.batch(()=>p.current.forEach(e=>e.update({isChecked:t}))))}return(0,D.jsxs)(D.Fragment,{children:[(0,D.jsx)(k,{page:`CheckBox`,file:`CheckBoxTwoState.txt`,name:`two-state`,output:s,children:(0,D.jsx)(n,{theme:e,backend:r,style:{height:32},children:(0,D.jsx)(t,{text:`Two-state CheckBox`,accessibleName:`Two-state`,onEvent:e=>{e.kind===i.Checked&&c(`You checked the box.`),e.kind===i.Unchecked&&c(`You unchecked the box.`)}})})}),(0,D.jsx)(k,{page:`CheckBox`,file:`CheckBoxThreeState.txt`,name:`three-state`,output:u,children:(0,D.jsx)(n,{theme:e,backend:r,style:{height:32},children:(0,D.jsx)(t,{text:`Three-state CheckBox`,accessibleName:`Three-state`,isThreeState:!0,onEvent:e=>{A(e)&&d(e.kind===i.Checked?`CheckBox is checked.`:e.kind===i.Unchecked?`CheckBox is unchecked.`:`CheckBox state is indeterminate.`)}})})}),(0,D.jsxs)(k,{page:`CheckBox`,file:`CheckBoxSelectAll.txt`,name:`select-all-scene`,children:[(0,D.jsx)(n,{theme:e,backend:r,style:{height:128},onReady:e=>{m.current=e},children:(0,D.jsxs)(o,{children:[(0,D.jsx)(t,{text:`Select all`,accessibleName:`Select all`,isThreeState:!0,onReady:e=>{f.current=e,h()},onEvent:g}),[0,1,2].map(e=>(0,D.jsx)(t,{text:`Option ${e+1}`,isChecked:e===1,margin:[24,0,0,0],onReady:t=>{p.current[e]=t,h()},onEvent:e=>{A(e)&&h()}},e))]})}),(0,D.jsxs)(l,{className:`source`,children:[(0,D.jsx)(a,{children:`Select all callback`}),(0,D.jsx)(x,{children:S(E,`select-all`)})]})]})]})}function M({page:t}){let[i,a]=c(),[o,l]=(0,w.useState)(e.Canvas2D),[p,g]=(0,w.useState)(!1),[y,b]=(0,w.useState)(`Off`),[x,S]=(0,w.useState)(v.None);return(0,w.useEffect)(()=>{document.documentElement.dataset.theme=i},[i]),(0,D.jsxs)(D.Fragment,{children:[(0,D.jsx)(C,{title:t,theme:i,onTheme:a}),(0,D.jsxs)(`main`,{className:`stage-main official-motion`,children:[(0,D.jsx)(`div`,{className:`effects-options material-policies`,children:(0,D.jsxs)(`label`,{children:[`Renderer`,(0,D.jsx)(m,{"aria-label":`Basic renderer`,value:o,onValueChanged:e=>l(e),children:Object.values(e).map(e=>(0,D.jsx)(d,{children:e},e))})]})}),t===`CheckBox`&&(0,D.jsx)(j,{theme:i,backend:o},o),t===`ToggleButton`&&(0,D.jsx)(k,{page:t,file:`ToggleButtonSimple.txt`,name:`toggle`,output:y,options:(0,D.jsx)(f,{checked:p,onValueChanged:e=>g(e),label:(0,D.jsx)(D.Fragment,{children:`Disable ToggleButton`})}),children:(0,D.jsx)(n,{theme:i,backend:o,style:{height:32},children:(0,D.jsx)(s,{text:`ToggleButton`,enabled:!p,onChecked:()=>b(`On`),onUnchecked:()=>b(`Off`)})})}),t===`TextBlock`&&(0,D.jsxs)(D.Fragment,{children:[(0,D.jsx)(k,{page:t,file:`SimpleTextblock.txt`,name:`text-simple`,children:(0,D.jsx)(n,{theme:i,backend:o,style:{height:20},children:(0,D.jsx)(h,{text:`I am a TextBlock.`})})}),(0,D.jsx)(k,{page:t,file:`TextblockStyleApplied.txt`,name:`text-style`,children:(0,D.jsx)(n,{theme:i,backend:o,style:{height:24},children:(0,D.jsx)(h,{text:`I am a styled TextBlock.`,fontFamily:`Comic Sans MS`,fontStyle:u.Italic})})})]}),t===`Image`&&(0,D.jsxs)(D.Fragment,{children:[(0,D.jsx)(k,{page:t,file:`BasicImageLocalFile.txt`,name:`image-local`,children:(0,D.jsx)(n,{theme:i,backend:o,style:{height:100},children:(0,D.jsx)(r,{height:100,source:`/winui/official/treetops.jpg`,accessibleName:`Treetops`})})}),(0,D.jsx)(k,{page:t,file:`ImageStretching.txt`,name:`image-stretch`,options:(0,D.jsxs)(`fieldset`,{className:`stretch-options`,children:[(0,D.jsx)(`legend`,{children:`Image stretch mode`}),[v.None,v.Fill,v.Uniform,v.UniformToFill].map(e=>(0,D.jsx)(_,{name:`stretch`,value:e,checked:x===e,onValueChanged:()=>S(e),className:`check-option`,label:(0,D.jsx)(D.Fragment,{children:e})},e))]}),children:(0,D.jsx)(n,{theme:i,backend:o,style:{height:100},children:(0,D.jsx)(r,{width:100,height:100,source:`/winui/official/valley.jpg`,stretch:x,accessibleName:`Valley`})})})]})]})]})}export{M as BasicControlsPage};