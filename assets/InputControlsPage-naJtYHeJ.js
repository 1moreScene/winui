import{Fr as e,J as t,Mt as n,Or as r,Wt as i,a,cr as o,en as s,g as c,hn as l,i as u,jt as d,l as f,pi as p,r as m,t as h,v as g,wn as _}from"./GalleryControls-jbXHT3zS.js";import{t as v}from"./SourceCode-C2xz3uBh.js";import{i as y,r as b}from"./ButtonPage-Cv9H35SX.js";var x=p(),S={galleryCommit:`7360ac322414e118eadfb0c7c2f4ecc31a218f59`,controls:{RadioButton:{description:`Use RadioButton controls to let a user choose between mutually exclusive, related options. Generally contained within a RadioButtons group control.`,samples:[{title:`A group of RadioButton controls in a RadioButtons group.`,file:`RadioButtonGroup.txt`,xaml:`<RadioButtons Header="Options:">
    <RadioButton Content="Option 1" Checked="RadioButton_Checked"/>
    <RadioButton Content="Option 2" Checked="RadioButton_Checked"/>
    <RadioButton Content="Option 3" Checked="RadioButton_Checked"/>
</RadioButtons>`},{title:`Two RadioButtons controls with strings as options.`,file:`RadioButtonStrings.txt`,xaml:`<RadioButtons x:Name="BackgroundRadioButtons" SelectedIndex="0"  MaxColumns="3" Header="Background" SelectionChanged="BackgroundColor_SelectionChanged">
    <x:String>Green</x:String>
    <x:String>Yellow</x:String>
    <x:String>White</x:String>
</RadioButtons>
<RadioButtons x:Name="BorderRadioButtons" SelectedIndex="1" MaxColumns="3" Header="Border" SelectionChanged="BorderBrush_SelectionChanged">
    <x:String>Green</x:String>
    <x:String>Yellow</x:String>
    <x:String>White</x:String>
</RadioButtons>

<Border x:Name="ControlOutput" BorderThickness="10" BorderBrush="#FFFFD700" Background="#FFFFFFFF"
        Height="50" Margin="0,10,0,10" />`}]},ScrollViewer:{description:`A ScrollViewer lets a user scroll, pan, and zoom to see content that's larger than the viewable area. Many content controls, like ListView, have ScrollViewers built into their control templates to provide automatic scrolling.`,samples:[{title:`Content inside of a ScrollViewer.`,file:`ContentInsideScrollviewer.txt`,xaml:`<ScrollViewer Height="266" Width="400" ZoomMode="Enabled"
            IsTabStop="True" IsVerticalScrollChainingEnabled="True"
            HorizontalAlignment="Left" VerticalAlignment="Top"
            ViewChanged="ScrollViewerControl_ViewChanged"
            HorizontalScrollMode="Enabled" HorizontalScrollBarVisibility="Auto"
            VerticalScrollMode="Enabled" VerticalScrollBarVisibility="Auto">
    <Image Source="ms-appx:///Assets/SampleMedia/cliff.jpg" AutomationProperties.Name="cliff" Stretch="None"
           HorizontalAlignment="Left" VerticalAlignment="Top"/>
</ScrollViewer>`}]},TextBox:{description:`Use a TextBox to let a user enter simple text input in your app. You can add a header and placeholder text to let the user know what the TextBox is for, and you can customize it in other ways.`,samples:[{title:`A simple TextBox.`,file:`SimpleTextbox.txt`,xaml:`<TextBox AutomationProperties.Name="simple TextBox"/>`},{title:`A TextBox with a header and placeholder text.`,file:`TextboxHeaderPlaceholderText.txt`,xaml:`<TextBox Header="Enter your name:" PlaceholderText="Name" />`},{title:`A read-only TextBox with various properties set.`,file:`ReadOnlyTextboxVarious.txt`,xaml:`<TextBox Text="I am super excited to be here!"
    AutomationProperties.Name="customized TextBox" IsReadOnly="True"
    FontFamily="Arial" FontSize="24" FontStyle="Italic"
    CharacterSpacing="200" Foreground="#5178BE" />`},{title:`A multi-line TextBox with spell checking and custom selection highlight color.`,file:`MultiLineTextboxSpell.txt`,xaml:`<TextBox AutomationProperties.Name="multi-line TextBox"
    TextWrapping="Wrap" AcceptsReturn="True" IsSpellCheckEnabled="True"
    SelectionHighlightColor="Green" MinWidth="400" />`}]},ToggleSwitch:{description:`Use ToggleSwitch controls to present users with exactly two mutually exclusive options (like on/off), where choosing an option results in an immediate commit. A toggle switch should have a single label.`,samples:[{title:`A simple ToggleSwitch.`,file:`ToggleSwitchSimple.txt`,xaml:`<ToggleSwitch AutomationProperties.Name="simple ToggleSwitch"/>`},{title:`A ToggleSwitch with custom header and content.`,file:`ToggleSwitchCustom.txt`,xaml:`<StackPanel Orientation="Horizontal">
    <ToggleSwitch Header="Toggle work" OffContent="Do work" OnContent="Working" />
    <ProgressRing IsActive="{x:Bind ToggleSwitch2.IsOn, Mode=OneWay}" Width="32"/>
</StackPanel>`}]}},sources:[{path:`references/gallery-input/RadioButton/RadioButtonGroup.txt`,source:`WinUIGallery/Samples/RadioButton/RadioButtonGroup.txt`,sha256:`92e27d2a8db875ceb0f13389edc5f4309af5c3c835c59624ca1a0262beaea8fb`},{path:`references/gallery-input/RadioButton/RadioButtonPage.xaml`,source:`WinUIGallery/Samples/RadioButton/RadioButtonPage.xaml`,sha256:`1273eb2b6408c958e3e6d3598fc178caf45fd2bf77967f5372ba27ebd89297d4`},{path:`references/gallery-input/RadioButton/RadioButtonPage.xaml.cs`,source:`WinUIGallery/Samples/RadioButton/RadioButtonPage.xaml.cs`,sha256:`e526e7153aa2257ec81e8590b444ff0b55dd1ce3d00348b14a2624bbae0acb0f`},{path:`references/gallery-input/RadioButton/RadioButtonStrings.txt`,source:`WinUIGallery/Samples/RadioButton/RadioButtonStrings.txt`,sha256:`4a2dfdda37e152f9e73f992ec326bfcb11e9e267a21fd33e77305ef417360b58`},{path:`references/gallery-input/ScrollViewer/ContentInsideScrollviewer.txt`,source:`WinUIGallery/Samples/ScrollViewer/ContentInsideScrollviewer.txt`,sha256:`3547f553556263c89ef16335a8c489b4d109eeca6f852bb587fd625551000300`},{path:`references/gallery-input/ScrollViewer/ScrollViewerPage.xaml`,source:`WinUIGallery/Samples/ScrollViewer/ScrollViewerPage.xaml`,sha256:`edd713c839b8016bcbeb5fb5a798f62ec06953b962e6500fbc626b8c4962c4c5`},{path:`references/gallery-input/ScrollViewer/ScrollViewerPage.xaml.cs`,source:`WinUIGallery/Samples/ScrollViewer/ScrollViewerPage.xaml.cs`,sha256:`3655acb92d659249ea4f79b1d59337ca692d423000f65b5bf540b2365ae7f6df`},{path:`references/gallery-input/TextBox/MultiLineTextboxSpell.txt`,source:`WinUIGallery/Samples/TextBox/MultiLineTextboxSpell.txt`,sha256:`084a3416a1f8350d2bb33b18d03dfa6c33c08441b23d174012a7b17ebb9b1260`},{path:`references/gallery-input/TextBox/ReadOnlyTextboxVarious.txt`,source:`WinUIGallery/Samples/TextBox/ReadOnlyTextboxVarious.txt`,sha256:`226ba594c0b2ba4febf92c53551778982c05e82870d6632ae33a67cb1e8c901a`},{path:`references/gallery-input/TextBox/SimpleTextbox.txt`,source:`WinUIGallery/Samples/TextBox/SimpleTextbox.txt`,sha256:`e58365e32ef0121db7a57c3716b42a4048fd14a559a5a2214fa1a7d1a82f2e96`},{path:`references/gallery-input/TextBox/TextboxHeaderPlaceholderText.txt`,source:`WinUIGallery/Samples/TextBox/TextboxHeaderPlaceholderText.txt`,sha256:`0158a237ccc7ae3d8eeda6cbac9f8821d71c61cb5a3039c50c734a848f7765d9`},{path:`references/gallery-input/TextBox/TextBoxPage.xaml`,source:`WinUIGallery/Samples/TextBox/TextBoxPage.xaml`,sha256:`8a4374e00f8c8af2566278d69cd5126aafe31cfade61b1554115d86e3270bc04`},{path:`references/gallery-input/TextBox/TextBoxPage.xaml.cs`,source:`WinUIGallery/Samples/TextBox/TextBoxPage.xaml.cs`,sha256:`d09b7e4352a57a73e6e3f02c5a54bacf75691159851cd8c05fadcf015e9c5fa8`},{path:`references/gallery-input/ToggleSwitch/ToggleSwitchCustom.txt`,source:`WinUIGallery/Samples/ToggleSwitch/ToggleSwitchCustom.txt`,sha256:`defa1b28ec6c8596b613117516fa20425f64473a6c55296c3956177007b72cc4`},{path:`references/gallery-input/ToggleSwitch/ToggleSwitchPage.xaml`,source:`WinUIGallery/Samples/ToggleSwitch/ToggleSwitchPage.xaml`,sha256:`f89baa31af063a52eb35d099cb4812a96c98d5d45c52f2f84f4e1a70cb252df5`},{path:`references/gallery-input/ToggleSwitch/ToggleSwitchPage.xaml.cs`,source:`WinUIGallery/Samples/ToggleSwitch/ToggleSwitchPage.xaml.cs`,sha256:`d4a64cac7140bb230c07cebfe3bd62ef1c1ffb73b0ba7c03b1e1f492ffec8840`},{path:`references/gallery-input/ToggleSwitch/ToggleSwitchSimple.txt`,source:`WinUIGallery/Samples/ToggleSwitch/ToggleSwitchSimple.txt`,sha256:`3d95d9bed4ba1e66c063fff1cb809bd91af12fcf36c11289ddc6a06f35d4b248`}]},C=`import { LocalizedText } from "./GalleryLanguage";
import { SourceCode } from './SourceCode';
import { GalleryButton, GalleryComboBox, GalleryExpander, GalleryExpanderHeader, GalleryOption } from './GalleryControls';
import { useGalleryTheme } from './gallery-theme';
import { useEffect, useState, type ReactNode } from "react";
import { Header } from "./ButtonPage";
import {
  SceneView,
  StackPanel,
  Grid,
  RadioButton,
  RadioButtons,
  ToggleSwitch,
  ProgressRing,
} from "winui-wasm/react";
import {
  ThemeMode,
  RendererBackend,
  HorizontalAlignment,
  Orientation,
  type Scene,
} from "winui-wasm";
import official from "./official-input.json";
import source from "./InputControlsPage.tsx?raw";
import { extractSampleSource } from "./sample-source";
type InputPage = keyof typeof official.controls;
declare global {
  interface Window {
    inputScenes: Record<string, Scene>;
  }
}
function remember(name: string, scene: Scene) {
  window.inputScenes ??= {};
  window.inputScenes[name] = scene;
}
function InputExample({
  page,
  file,
  name,
  children,
  output,
}: {
  page: InputPage;
  file: string;
  name: string;
  children: ReactNode;
  output?: string;
}) {
  const [native, setNative] = useState(false);
  const sample = official.controls[page].samples.find((s) => s.file === file)!;
  return (
    <section className="example basic-example" id={name}>
      <h2><LocalizedText>{sample.title}</LocalizedText></h2>
      <div className="example-card">
        <div className="basic-live">
          <div className="basic-preview">{children}</div>
          {output !== undefined && (
            <div className="basic-output">
              <span>Output:</span>
              <span role="status">{output}</span>
            </div>
          )}
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
          <SourceCode language={native ? 'xaml' : 'tsx'}>{native ? sample.xaml : extractSampleSource(source, name)}</SourceCode>
        </GalleryExpander>
      </div>
    </section>
  );
}
export function InputControlsPage({ page }: { page: InputPage }) {
  const [theme, setTheme] = useGalleryTheme(),
    [backend, setBackend] = useState(RendererBackend.Canvas2D);
  const [selected, setSelected] = useState(-1),
    [background, setBackground] = useState(0),
    [backgroundColor, setBackgroundColor] = useState("#008000"),
    [border, setBorder] = useState(1),
    [working, setWorking] = useState(true);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return (
    <>
      <Header title={page} theme={theme} onTheme={setTheme} />
      <main className="stage-main official-motion">
        
        <div className="effects-options material-policies">
          <label>
            Renderer{" "}
            <GalleryComboBox
              aria-label="Input renderer"
              value={backend}
              onValueChanged={(e) => setBackend(e as RendererBackend)}
            >
              {Object.values(RendererBackend).map((v) => (
                <GalleryOption key={v}>{v}</GalleryOption>
              ))}
            </GalleryComboBox>
          </label>
        </div>
        {page === "RadioButton" && (
          <>
            <InputExample
              page={page}
              file="RadioButtonGroup.txt"
              name="radio-group"
              output={
                selected < 0
                  ? "Select an option."
                  : \`You selected Option \${selected + 1}\`
              }
            >
              <SceneView
                theme={theme}
                backend={backend}
                style={{ height: 139 }}
                onReady={(s) => remember("radio-group", s)}
              >
                {/* @sample:radio-group:start */}
                <RadioButtons
                  header="Options:"
                  items={["Option 1", "Option 2", "Option 3"]}
                  selectedIndex={selected}
                  onSelectionChanged={(e) => setSelected(e.selectedIndex ?? -1)}
                />
                {/* @sample:radio-group:end */}
              </SceneView>
            </InputExample>
            <InputExample
              page={page}
              file="RadioButtonStrings.txt"
              name="radio-strings"
            >
              <SceneView
                theme={theme}
                backend={backend}
                style={{ height: 188 }}
                onReady={(s) => remember("radio-strings", s)}
              >
                {/* @sample:radio-strings:start */}
                <StackPanel
                  spacing={0}
                  horizontalAlignment={HorizontalAlignment.Left}
                >
                  <RadioButtons
                    header="Background"
                    items={["Green", "Yellow", "White"]}
                    maxColumns={3}
                    selectedIndex={background}
                    onSelectionChanged={(e) => {
                      const index = e.selectedIndex ?? 0;
                      setBackground(index);
                      setBackgroundColor(
                        ["#008000", "#ffff00", "#ffffff"][index],
                      );
                    }}
                  />
                  <RadioButtons
                    header="Border"
                    items={["Green", "Yellow", "White"]}
                    maxColumns={3}
                    selectedIndex={border}
                    onSelectionChanged={(e) => setBorder(e.selectedIndex ?? 0)}
                  />
                  <Grid
                    height={50}
                    margin={[0, 10, 0, 10]}
                    padding={[10, 10, 10, 10]}
                    background={["#006400", "#ffd700", "#ffffff"][border]}
                  >
                    <Grid background={backgroundColor} />
                  </Grid>
                </StackPanel>
                {/* @sample:radio-strings:end */}
              </SceneView>
            </InputExample>
          </>
        )}
        {page === "ToggleSwitch" && (
          <>
            <InputExample
              page={page}
              file="ToggleSwitchSimple.txt"
              name="switch-simple"
            >
              <SceneView
                theme={theme}
                backend={backend}
                style={{ height: 40 }}
                onReady={(s) => remember("switch-simple", s)}
              >
                {/* @sample:switch-simple:start */}
                <ToggleSwitch accessibleName="simple ToggleSwitch" />
                {/* @sample:switch-simple:end */}
              </SceneView>
            </InputExample>
            <InputExample
              page={page}
              file="ToggleSwitchCustom.txt"
              name="switch-custom"
            >
              <SceneView
                theme={theme}
                backend={backend}
                style={{ height: 65 }}
                onReady={(s) => remember("switch-custom", s)}
              >
                {/* @sample:switch-custom:start */}
                <StackPanel orientation={Orientation.Horizontal}>
                  <ToggleSwitch
                    header="Toggle work"
                    isOn={working}
                    onContent="Working"
                    offContent="Do work"
                    onToggled={(e) => setWorking(e.isOn ?? false)}
                  />
                  <ProgressRing width={32} isActive={working} />
                </StackPanel>
                {/* @sample:switch-custom:end */}
              </SceneView>
            </InputExample>
          </>
        )}
      </main>
    </>
  );
}
`,w=_();function T(e,t){window.inputScenes??={},window.inputScenes[e]=t}function E({page:e,file:t,name:n,children:r,output:i}){let[o,s]=(0,x.useState)(!1),c=S.controls[e].samples.find(e=>e.file===t);return(0,w.jsxs)(`section`,{className:`example basic-example`,id:n,children:[(0,w.jsx)(`h2`,{children:(0,w.jsx)(g,{children:c.title})}),(0,w.jsxs)(`div`,{className:`example-card`,children:[(0,w.jsxs)(`div`,{className:`basic-live`,children:[(0,w.jsx)(`div`,{className:`basic-preview`,children:r}),i!==void 0&&(0,w.jsxs)(`div`,{className:`basic-output`,children:[(0,w.jsx)(`span`,{children:`Output:`}),(0,w.jsx)(`span`,{role:`status`,children:i})]})]}),(0,w.jsxs)(u,{className:`source`,children:[(0,w.jsx)(a,{children:`Source code`}),(0,w.jsxs)(`div`,{className:`source-tabs`,children:[(0,w.jsx)(h,{className:o?``:`active`,onClick:()=>s(!1),children:`TypeScript / React`}),(0,w.jsx)(h,{className:o?`active`:``,onClick:()=>s(!0),children:`Official XAML`})]}),(0,w.jsx)(v,{language:o?`xaml`:`tsx`,children:o?c.xaml:y(C,n)})]})]})]})}function D({page:a}){let[u,p]=c(),[h,g]=(0,x.useState)(e.Canvas2D),[_,v]=(0,x.useState)(-1),[y,S]=(0,x.useState)(0),[C,D]=(0,x.useState)(`#008000`),[O,k]=(0,x.useState)(1),[A,j]=(0,x.useState)(!0);return(0,x.useEffect)(()=>{document.documentElement.dataset.theme=u},[u]),(0,w.jsxs)(w.Fragment,{children:[(0,w.jsx)(b,{title:a,theme:u,onTheme:p}),(0,w.jsxs)(`main`,{className:`stage-main official-motion`,children:[(0,w.jsx)(`div`,{className:`effects-options material-policies`,children:(0,w.jsxs)(`label`,{children:[`Renderer`,` `,(0,w.jsx)(m,{"aria-label":`Input renderer`,value:h,onValueChanged:e=>g(e),children:Object.values(e).map(e=>(0,w.jsx)(f,{children:e},e))})]})}),a===`RadioButton`&&(0,w.jsxs)(w.Fragment,{children:[(0,w.jsx)(E,{page:a,file:`RadioButtonGroup.txt`,name:`radio-group`,output:_<0?`Select an option.`:`You selected Option ${_+1}`,children:(0,w.jsx)(i,{theme:u,backend:h,style:{height:139},onReady:e=>T(`radio-group`,e),children:(0,w.jsx)(n,{header:`Options:`,items:[`Option 1`,`Option 2`,`Option 3`],selectedIndex:_,onSelectionChanged:e=>v(e.selectedIndex??-1)})})}),(0,w.jsx)(E,{page:a,file:`RadioButtonStrings.txt`,name:`radio-strings`,children:(0,w.jsx)(i,{theme:u,backend:h,style:{height:188},onReady:e=>T(`radio-strings`,e),children:(0,w.jsxs)(s,{spacing:0,horizontalAlignment:o.Left,children:[(0,w.jsx)(n,{header:`Background`,items:[`Green`,`Yellow`,`White`],maxColumns:3,selectedIndex:y,onSelectionChanged:e=>{let t=e.selectedIndex??0;S(t),D([`#008000`,`#ffff00`,`#ffffff`][t])}}),(0,w.jsx)(n,{header:`Border`,items:[`Green`,`Yellow`,`White`],maxColumns:3,selectedIndex:O,onSelectionChanged:e=>k(e.selectedIndex??0)}),(0,w.jsx)(t,{height:50,margin:[0,10,0,10],padding:[10,10,10,10],background:[`#006400`,`#ffd700`,`#ffffff`][O],children:(0,w.jsx)(t,{background:C})})]})})})]}),a===`ToggleSwitch`&&(0,w.jsxs)(w.Fragment,{children:[(0,w.jsx)(E,{page:a,file:`ToggleSwitchSimple.txt`,name:`switch-simple`,children:(0,w.jsx)(i,{theme:u,backend:h,style:{height:40},onReady:e=>T(`switch-simple`,e),children:(0,w.jsx)(l,{accessibleName:`simple ToggleSwitch`})})}),(0,w.jsx)(E,{page:a,file:`ToggleSwitchCustom.txt`,name:`switch-custom`,children:(0,w.jsx)(i,{theme:u,backend:h,style:{height:65},onReady:e=>T(`switch-custom`,e),children:(0,w.jsxs)(s,{orientation:r.Horizontal,children:[(0,w.jsx)(l,{header:`Toggle work`,isOn:A,onContent:`Working`,offContent:`Do work`,onToggled:e=>j(e.isOn??!1)}),(0,w.jsx)(d,{width:32,isActive:A})]})})})]})]})]})}export{D as InputControlsPage};