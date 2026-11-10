import{Fr as e,Hn as t,J as n,O as r,Or as i,Sr as a,Wt as o,Z as s,a as c,ai as l,cn as u,cr as d,en as f,g as p,i as m,jr as h,l as g,li as _,n as v,pi as y,r as b,sn as x,sr as S,t as C,v as w,wn as T,zn as E}from"./GalleryControls-jbXHT3zS.js";import{t as D}from"./SourceCode-C2xz3uBh.js";var O=y(),k={id:`button`,name:`Button`,description:`A control that responds to user input and raises a Click event.`,details:`The Button control provides a Click event to respond to user input from a touch, mouse, keyboard, stylus, or other input device. You can put different kinds of content in a button, such as text or an image, or you can restyle a button to give it a new look.`,apiNamespace:`Microsoft.UI.Xaml.Controls`,relatedControls:[`ToggleButton`,`RepeatButton`,`HyperlinkButton`,`AppBarButton`],usings:[`Microsoft.UI.Xaml`,`Microsoft.UI.Xaml.Controls`],keywords:[`Object`,`DependencyObject`,`UIElement`,`FrameworkElement`,`Control`,`ContentControl`,`ButtonBase`],curatedKeywords:[`click`,`push button`,`command`,`cta`,`call to action`],docs:[{title:`Button - API`,uri:`https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.button`},{title:`Guidelines`,uri:`https://learn.microsoft.com/windows/apps/design/controls/buttons`}],gallery:{uniqueId:`Button`,group:{id:`BasicInput`,title:`Basic input`},page:`WinUIGallery/Samples/Button/ButtonPage.xaml`,codeBehind:`WinUIGallery/Samples/Button/ButtonPage.xaml.cs`,baseClasses:[`Object`,`DependencyObject`,`UIElement`,`FrameworkElement`,`Control`,`ContentControl`,`ButtonBase`],relatedSamples:[`microsoft/WinUI-Gallery#AppBarButton`,`microsoft/WinUI-Gallery#HyperlinkButton`,`microsoft/WinUI-Gallery#RepeatButton`,`microsoft/WinUI-Gallery#ToggleButton`]},samples:[{header:`A simple Button with text content.`,xaml:`<Button Content="Standard XAML button" Click="Button_Click" />`,code:`private void Button_Click(object sender, RoutedEventArgs e)
{
    // Handle button click
}`,language:`csharp`,gallery:{snippet:`ButtonSimple.txt`,source:`WinUIGallery/Samples/Button/ButtonSimple.txt`,name:`Simple`}},{header:`A Button with graphical content.`,xaml:`<Button Content="Button" Click="Button_Click" AutomationProperties.Name="Pie">
    <Image Source="/Assets/SampleMedia/Slices.png" AutomationProperties.Name="Slice"/>
</Button>`,gallery:{snippet:`ButtonWithImage.txt`,source:`WinUIGallery/Samples/Button/ButtonWithImage.txt`,name:`With Image`}},{header:`Built-in styles applied to Button.`,xaml:`<Button Style="{StaticResource AccentButtonStyle}" Content="Accent style button"/>
<Button Style="{StaticResource SubtleButtonStyle}" Content="Subtle style button"/>`,gallery:{snippet:`ButtonBuiltInStyles.txt`,source:`WinUIGallery/Samples/Button/ButtonBuiltInStyles.txt`,name:`Built In Styles`}},{header:`Wrapping Buttons with large content`,xaml:`<StackPanel>
    <TextBlock Text="The following buttons' content may get clipped if we don't pay careful attention to their layout containers." Margin="0,0,0,8" TextWrapping="Wrap"/>
    <TextBlock Text="One option to mitigate clipped content is to place Buttons underneath each other, allowing for more space to grow horizontally:" Margin="0,0,0,8" TextWrapping="Wrap"/>
    <Button HorizontalAlignment="Stretch" Margin="0,0,0,5">This is some text that is too long and will get cut off</Button>
    <Button HorizontalAlignment="Stretch">This is another text that would result in being cut off</Button>

    <TextBlock Text="Another option is to explicitly wrap the Button's content" Margin="0,8,0,8"/>
    <StackPanel Orientation="Horizontal" HorizontalAlignment="Center">
        <Button MaxWidth="240" Margin="0,0,8,0">
            <TextBlock Text="This is some text that is too long and will get cut off" TextWrapping="WrapWholeWords"/>
        </Button>
        <Button MaxWidth="240">
            <TextBlock Text="This is another text that would result in being cut off" TextWrapping="WrapWholeWords"/>
        </Button>
    </StackPanel>
</StackPanel>`,gallery:{snippet:`ButtonWrapping.txt`,source:`WinUIGallery/Samples/Button/ButtonWrapping.txt`,name:`Wrapping`}}]},A=`import { LocalizedText } from "./GalleryLanguage";
import {NavigationViewBackButtonVisible} from "winui-wasm";
import { SourceCode } from './SourceCode';
import { GalleryButton, GalleryCheckBox, GalleryComboBox, GalleryExpander, GalleryExpanderHeader, GalleryOption } from './GalleryControls';
import { useGalleryTheme } from './gallery-theme';
import { useEffect, useRef, useState } from "react";
import {
  SceneView,
  StackPanel,
  Grid,
  TextBlock,
  Button,
  Image,
  TextBox,
} from "winui-wasm/react";
import {
  WinUI,
  ThemeMode,
  ButtonVariant,
  ClickMode,
  Orientation,
  HorizontalAlignment,
  VerticalAlignment,
  RendererBackend,
  TextTrimming,
  GridUnit,
  PaneDisplayMode,
  type Scene,
  type ButtonController,
  type SceneNode,
  type TextOptions,
  type TextBoxController,
  type SceneNavigationViewController as SceneNavigationView,
} from "winui-wasm";
import official from "./official-button.json";
import source from "./ButtonPage.tsx?raw";
import initializationSource from "./main.tsx?raw";
import { extractSampleSource } from "./sample-source";
declare global {
  interface Window {
    stages: {
      scenes: Scene[];
      buttons: ButtonController[];
      caption?: SceneNode<TextOptions>;
      navigation?: SceneNavigationView;
      input?: TextBoxController;
      setMounted?: (mounted: boolean) => void;
    };
  }
}
function useStages() {
  window.stages ??= { scenes: [], buttons: [] };
}
/** Page chrome is owned by the persistent Gallery shell. */
export function Header(_props: { theme: ThemeMode; onTheme: (theme: ThemeMode) => void; title: string }) { return null; }
const buttonSampleNames = ["standard", "image", "styles", "wrapping"];
const buttonSampleSources = buttonSampleNames.map((name) =>
  extractSampleSource(source, \`button-\${name}\`),
);
const buttonStateSource = extractSampleSource(source, "button-state");
function Code({ index }: { index: number }) {
  const [reference, setReference] = useState(false);
  return (
    <GalleryExpander className="source">
      <GalleryExpanderHeader>Source code</GalleryExpanderHeader>
      <div className="source-tabs">
        <GalleryButton
          className={!reference ? "active" : ""}
          aria-pressed={!reference}
          onClick={() => setReference(false)}
        >
          TypeScript / React
        </GalleryButton>
        <GalleryButton
          className={reference ? "active" : ""}
          aria-pressed={reference}
          onClick={() => setReference(true)}
        >
          Official XAML
        </GalleryButton>
      </div>
      {!reference && (
        <p className="source-hint"><LocalizedText>
          当前示例的控件调用。WinUIProvider 和 SceneView
          由页面统一提供；Options、Output 和 Gallery 外壳不属于按钮调用。
        </LocalizedText></p>
      )}
      <SourceCode data-sample-source={buttonSampleNames[index]} language={reference ? 'xaml' : 'tsx'}>{reference
            ? official.samples[index]?.xaml
            : buttonSampleSources[index]}</SourceCode>
      {!reference && index < 2 && (
        <section className="source-context">
          <h3><LocalizedText>Options / Output 的共享页面状态</LocalizedText></h3>
          <SourceCode>{buttonStateSource}</SourceCode>
        </section>
      )}
    </GalleryExpander>
  );
}
export function ButtonPage({ sdk }: { sdk: WinUI }) {
  // @sample:button-state:start
  const [theme, setTheme] = useGalleryTheme(),
    [disabled, setDisabled] = useState(false),
    [count, setCount] = useState(0),
    [imageCount, setImageCount] = useState(0),
    [mode, setMode] = useState(ClickMode.Release);
  // @sample:button-state:end
  useStages();
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return (
    <>
      <Header title="Button" theme={theme} onTheme={setTheme} />
      <main className="stage-main">
        
        <section className="example" id="button-standard">
          <h2><LocalizedText>{official.samples[0].header}</LocalizedText></h2>
          <div className="example-card">
            <div className="basic-live with-options">
              <SceneView
                theme={theme}
                autoHeight
                onReady={(scene) => (window.stages.scenes[0] = scene)}
              >
                <StackPanel
                  padding={[12, 12, 12, 12]}
                  verticalAlignment={VerticalAlignment.Center}
                >
                  {/* @sample:button-standard:start */}
                  <Button
                    text="Standard XAML button"
                    accessibleName="Standard XAML"
                    enabled={!disabled}
                    clickMode={mode}
                    onClick={() => setCount((c) => c + 1)}
                  />
                  {/* @sample:button-standard:end */}
                </StackPanel>
              </SceneView>
              <aside className="options">
                <GalleryCheckBox
                    aria-label="Disable button"
                    
                    checked={disabled}
                    onValueChanged={(e) => setDisabled(e)} className="check-option" label={<>
                  
                  Disable button
                </>}/>

              </aside>
            <div className="basic-output output" aria-live="polite">
              Output:{" "}
              <code id="button-click-output">
                {count ? \`You clicked: Button1 (\${count})\` : ""}
              </code>
            </div>
            </div>
            <Code index={0} />
          </div>
        </section>
        <section className="example" id="button-image">
          <h2><LocalizedText>{official.samples[1].header}</LocalizedText></h2>
          <div className="example-card"><div className="basic-live">
            <SceneView
              theme={theme}
              autoHeight
              onReady={(scene) => (window.stages.scenes[1] = scene)}
            >
              <StackPanel
                padding={[12, 12, 12, 12]}
                verticalAlignment={VerticalAlignment.Center}
              >
                {/* @sample:button-image:start */}
                <Button
                  width={50}
                  height={50}
                  accessibleName="Pie"
                  onClick={() => setImageCount((n) => n + 1)}
                >
                  <Image source="/official/Slices.png" accessibleName="Slice" />
                </Button>
                {/* @sample:button-image:end */}
              </StackPanel>
            </SceneView>
            <div className="basic-output output" aria-live="polite">
              Output:{" "}
              <code>
                {imageCount ? \`You clicked: Button2 (\${imageCount})\` : ""}
              </code>
            </div>
            </div><Code index={1} />
          </div>
        </section>
        <section className="example" id="button-styles">
          <h2><LocalizedText>{official.samples[2].header}</LocalizedText></h2>
          <div className="example-card">
            <SceneView
              theme={theme}
              autoHeight
              onReady={(scene) => (window.stages.scenes[2] = scene)}
            >
              {/* @sample:button-styles:start */}
              <StackPanel
                orientation={Orientation.Horizontal}
                spacing={16}
                padding={[12, 12, 12, 12]}
              >
                <Button
                  text="Accent style button"
                  variant={ButtonVariant.Accent}
                />
                <Button
                  text="Subtle style button"
                  variant={ButtonVariant.Subtle}
                />
              </StackPanel>
              {/* @sample:button-styles:end */}
            </SceneView>
            <Code index={2} />
          </div>
        </section>
        <section className="example" id="button-wrapping">
          <h2><LocalizedText>{official.samples[3].header}</LocalizedText></h2>
          <div className="example-card">
            <SceneView
              theme={theme}
              autoHeight
              onReady={(scene) => (window.stages.scenes[3] = scene)}
            >
              {/* @sample:button-wrapping:start */}
              <StackPanel padding={[12, 12, 12, 12]} spacing={8}>
                <TextBlock
                  text="One option to avoid clipped content is to place Buttons underneath each other, allowing more space to grow horizontally:"
                  wrap={true}
                />
                <Button
                  text="This is some text that is too long and will get cut off"
                  horizontalAlignment={HorizontalAlignment.Stretch}
                />
                <Button
                  text="This is another text that would result in being cut off"
                  horizontalAlignment={HorizontalAlignment.Stretch}
                />
                <TextBlock
                  text="Another option is to explicitly wrap the Button's content"
                  margin={[0, 8, 0, 8]}
                />
                <StackPanel
                  orientation={Orientation.Horizontal}
                  horizontalAlignment={HorizontalAlignment.Center}
                  spacing={8}
                >
                  <Button maxWidth={240}>
                    <TextBlock
                      text="This is some text that is too long and will get cut off without wrapping"
                      wrap={true}
                    />
                  </Button>
                  <Button maxWidth={240}>
                    <TextBlock
                      text="This is another text that would result in being cut off without wrapping"
                      wrap={true}
                    />
                  </Button>
                </StackPanel>
              </StackPanel>
              {/* @sample:button-wrapping:end */}
            </SceneView>
            <Code index={3} />
          </div>
        </section>
        <GalleryExpander className="source" id="button-extra-options"><GalleryExpanderHeader>Additional Button options</GalleryExpanderHeader>                <label className="field">
                  ClickMode
                  <GalleryComboBox
                    aria-label="ClickMode"
                    value={mode}
                    onValueChanged={(e) =>
                      setMode(e as ClickMode)
                    }
                  >
                    {Object.values(ClickMode).map((value) => (
                      <GalleryOption key={value}>{value}</GalleryOption>
                    ))}
                  </GalleryComboBox>
                </label></GalleryExpander>
        <GalleryExpander className="source" id="button-initialization">
          <GalleryExpanderHeader>共享初始化（整个应用只执行一次）</GalleryExpanderHeader>
          <p className="source-hint"><LocalizedText>
            这是 Gallery
            的入口文件，包含应用挂载和测试诊断；不需要为每个按钮重复编写。
          </LocalizedText></p>
          <SourceCode>{initializationSource}</SourceCode>
        </GalleryExpander>
        <footer>
          Gallery 7360ac3 · matched SDK 2.3.10-experimental<span>Button</span>
        </footer>
      </main>
    </>
  );
}
function SharedScene({ sdk, theme }: { sdk: WinUI; theme: ThemeMode }) {
  const host = useRef<HTMLDivElement>(null),
    view = useRef<Scene | null>(null);
  useEffect(() => {
    const scene = sdk.scene(host.current!, { theme });
    view.current = scene;
    window.stages.scenes[0] = scene;
    const stack = scene.root.stack({ padding: [20, 20, 20, 20], spacing: 12 });
    const caption = stack.text({
      text: "Shared scene · 中文 / English",
      fontSize: 20,
      fontWeight: 600,
    });
    window.stages.caption = caption;
    const button = stack.button({
      text: "Update both controls",
      variant: ButtonVariant.Accent,
    });
    window.stages.buttons[0] = button;
    const navigation = stack.navigationView(
      {
        paneDisplayMode: PaneDisplayMode.Left,
        items: [
          { id: "home", text: "Home" },
          { id: "files", text: "Files" },
        ],
        selectedId: "home",
        header: "Shared content",
        isBackButtonVisible: NavigationViewBackButtonVisible.Collapsed,
      },
      { height: 220 },
    );
    window.stages.navigation = navigation;
    let count = 0;
    button.onClick(() => {
      scene.batch(() => {
        caption.update({ text: \`Updated \${++count} · 中文 / English\` });
        navigation.configure({ header: \`Update \${count}\` });
      });
    });
    return () => scene.dispose();
  }, [sdk]);
  useEffect(() => view.current?.configure({ theme }), [theme]);
  return <div ref={host} style={{ height: 370 }} />;
}
export function FoundationPage({ sdk }: { sdk: WinUI }) {
  const [theme, setTheme] = useGalleryTheme(),
    [backend, setBackend] = useState(RendererBackend.Canvas2D),
    [mounted, setMounted] = useState(true);
  useStages();
  useEffect(() => {
    window.stages.setMounted = setMounted;
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return (
    <>
      <Header
        title="Composition and rendering"
        theme={theme}
        onTheme={setTheme}
      />
      <main className="stage-main">
        <section className="example" id="shared-scene">
          <h2><LocalizedText>Text + Button + NavigationView in one scene</LocalizedText></h2>
          <div className="example-card">
            <SharedScene sdk={sdk} theme={theme} />
          </div>
        </section>
        <section className="example" id="rendering-scene">
          <h2><LocalizedText>Nested layout and typography</LocalizedText></h2>
          <div className="page-toolbar">
            <label>
              Renderer{" "}
              <GalleryComboBox
                aria-label="Renderer"
                value={backend}
                onValueChanged={(e) =>
                  setBackend(e as RendererBackend)
                }
              >
                {Object.values(RendererBackend).map((value) => (
                  <GalleryOption key={value}>{value}</GalleryOption>
                ))}
              </GalleryComboBox>
            </label>
            <GalleryButton onClick={() => setMounted((v) => !v)}>
              {mounted ? "Unmount scene" : "Mount scene"}
            </GalleryButton>
          </div>
          {mounted && (
            <SceneView
              key={backend}
              theme={theme}
              backend={backend}
              style={{ height: 340 }}
              onReady={(scene) => (window.stages.scenes[1] = scene)}
            >
              <Grid
                padding={[20, 20, 20, 20]}
                columns={[
                  { unit: GridUnit.Star, value: 1 },
                  { unit: GridUnit.Star, value: 1 },
                ]}
                spacing={16}
                clip={true}
              >
                <StackPanel spacing={12}>
                  <TextBlock
                    text="中文布局、混合字体与换行"
                    fontSize={24}
                    fontWeight={600}
                    wrap={true}
                  />
                  <TextBlock
                    text="Rust measures the exact text runs drawn by both backends. 中文文本随容器宽度变化换行，字重和基线保持一致。"
                    wrap={true}
                  />
                  <TextBlock
                    text="👩‍💻 é / 中文 / An overflowing line with an ellipsis"
                    trimming={TextTrimming.CharacterEllipsis}
                  />
                  <Button
                    text="Focusable without a black ring"
                    variant={ButtonVariant.Accent}
                  />
                </StackPanel>
                <Grid
                  column={1}
                  background="#e8efff"
                  cornerRadius={8}
                  opacity={0.7}
                  clip={true}
                >
                  <StackPanel
                    padding={[16, 16, 16, 16]}
                    spacing={8}
                    transform={[1, 0.05, 0, 1, 0, 0]}
                  >
                    <TextBlock
                      text="Shared clips and isolated opacity"
                      wrap={true}
                      fontWeight={600}
                    />
                    <Button
                      text="Subtle content"
                      variant={ButtonVariant.Subtle}
                    />
                  </StackPanel>
                </Grid>
              </Grid>
            </SceneView>
          )}
        </section>
        <section className="example" id="input-host">
          <h2><LocalizedText>TextBox composition host</LocalizedText></h2>
          <p><LocalizedText>
            The browser owns IME composition and its candidate window. This TextBox
            sample verifies focus, text commits, accessibility naming and anchor
            coordinates.
          </LocalizedText></p>
          <div className="example-card">
            <SceneView
              theme={theme}
              style={{ height: 112 }}
              onReady={(scene) => (window.stages.scenes[2] = scene)}
            >
              <StackPanel padding={[24, 24, 24, 24]}>
                <TextBox
                  accessibleName="中文组合输入验证"
                  height={40}
                  onReady={(input) => (window.stages.input = input)}
                />
              </StackPanel>
            </SceneView>
          </div>
        </section>
        <GalleryExpander className="source">
          <GalleryExpanderHeader>Running public SDK / React source</GalleryExpanderHeader>
          <SourceCode>{source}</SourceCode>
        </GalleryExpander>
      </main>
    </>
  );
}
`,j=`import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { WinUI } from 'winui-wasm';
import { WinUIProvider } from 'winui-wasm/react';
import { App } from './App';
import './style.css';

const started = performance.now();
const sdk = await WinUI.create();
Object.assign(window, { gallery: { sdk, views: [], readyMs: performance.now() - started,
  create: sdk.navigationView.bind(sdk) } });
createRoot(document.getElementById('app')!).render(<StrictMode><WinUIProvider runtime={sdk}><App sdk={sdk} /></WinUIProvider></StrictMode>);
window.addEventListener('pagehide', () => sdk.dispose(), { once: true });
`;function M(e,t){let n=`@sample:${t}:start`,r=`@sample:${t}:end`,i=e.split(/\r?\n/),a=i.findIndex(e=>e.includes(n)),o=i.findIndex((e,t)=>t>a&&e.includes(r));if(a<0||o<0)throw Error(`Missing source range: ${t}`);let s=i.slice(a+1,o),c=Math.min(...s.filter(e=>e.trim()).map(e=>e.match(/^\s*/)[0].length));return s.map(e=>e.slice(c)).join(`
`).trim()}var N=T();function P(){window.stages??={scenes:[],buttons:[]}}function F(e){return null}var I=[`standard`,`image`,`styles`,`wrapping`],L=I.map(e=>M(A,`button-${e}`)),R=M(A,`button-state`);function z({index:e}){let[t,n]=(0,O.useState)(!1);return(0,N.jsxs)(m,{className:`source`,children:[(0,N.jsx)(c,{children:`Source code`}),(0,N.jsxs)(`div`,{className:`source-tabs`,children:[(0,N.jsx)(C,{className:t?``:`active`,"aria-pressed":!t,onClick:()=>n(!1),children:`TypeScript / React`}),(0,N.jsx)(C,{className:t?`active`:``,"aria-pressed":t,onClick:()=>n(!0),children:`Official XAML`})]}),!t&&(0,N.jsx)(`p`,{className:`source-hint`,children:(0,N.jsx)(w,{children:`当前示例的控件调用。WinUIProvider 和 SceneView 由页面统一提供；Options、Output 和 Gallery 外壳不属于按钮调用。`})}),(0,N.jsx)(D,{"data-sample-source":I[e],language:t?`xaml`:`tsx`,children:t?k.samples[e]?.xaml:L[e]}),!t&&e<2&&(0,N.jsxs)(`section`,{className:`source-context`,children:[(0,N.jsx)(`h3`,{children:(0,N.jsx)(w,{children:`Options / Output 的共享页面状态`})}),(0,N.jsx)(D,{children:R})]})]})}function B({sdk:e}){let[n,a]=p(),[l,u]=(0,O.useState)(!1),[h,y]=(0,O.useState)(0),[S,C]=(0,O.useState)(0),[T,A]=(0,O.useState)(t.Release);return P(),(0,O.useEffect)(()=>{document.documentElement.dataset.theme=n},[n]),(0,N.jsxs)(N.Fragment,{children:[(0,N.jsx)(F,{title:`Button`,theme:n,onTheme:a}),(0,N.jsxs)(`main`,{className:`stage-main`,children:[(0,N.jsxs)(`section`,{className:`example`,id:`button-standard`,children:[(0,N.jsx)(`h2`,{children:(0,N.jsx)(w,{children:k.samples[0].header})}),(0,N.jsxs)(`div`,{className:`example-card`,children:[(0,N.jsxs)(`div`,{className:`basic-live with-options`,children:[(0,N.jsx)(o,{theme:n,autoHeight:!0,onReady:e=>window.stages.scenes[0]=e,children:(0,N.jsx)(f,{padding:[12,12,12,12],verticalAlignment:_.Center,children:(0,N.jsx)(r,{text:`Standard XAML button`,accessibleName:`Standard XAML`,enabled:!l,clickMode:T,onClick:()=>y(e=>e+1)})})}),(0,N.jsx)(`aside`,{className:`options`,children:(0,N.jsx)(v,{"aria-label":`Disable button`,checked:l,onValueChanged:e=>u(e),className:`check-option`,label:(0,N.jsx)(N.Fragment,{children:`Disable button`})})}),(0,N.jsxs)(`div`,{className:`basic-output output`,"aria-live":`polite`,children:[`Output:`,` `,(0,N.jsx)(`code`,{id:`button-click-output`,children:h?`You clicked: Button1 (${h})`:``})]})]}),(0,N.jsx)(z,{index:0})]})]}),(0,N.jsxs)(`section`,{className:`example`,id:`button-image`,children:[(0,N.jsx)(`h2`,{children:(0,N.jsx)(w,{children:k.samples[1].header})}),(0,N.jsxs)(`div`,{className:`example-card`,children:[(0,N.jsxs)(`div`,{className:`basic-live`,children:[(0,N.jsx)(o,{theme:n,autoHeight:!0,onReady:e=>window.stages.scenes[1]=e,children:(0,N.jsx)(f,{padding:[12,12,12,12],verticalAlignment:_.Center,children:(0,N.jsx)(r,{width:50,height:50,accessibleName:`Pie`,onClick:()=>C(e=>e+1),children:(0,N.jsx)(s,{source:`/winui/official/Slices.png`,accessibleName:`Slice`})})})}),(0,N.jsxs)(`div`,{className:`basic-output output`,"aria-live":`polite`,children:[`Output:`,` `,(0,N.jsx)(`code`,{children:S?`You clicked: Button2 (${S})`:``})]})]}),(0,N.jsx)(z,{index:1})]})]}),(0,N.jsxs)(`section`,{className:`example`,id:`button-styles`,children:[(0,N.jsx)(`h2`,{children:(0,N.jsx)(w,{children:k.samples[2].header})}),(0,N.jsxs)(`div`,{className:`example-card`,children:[(0,N.jsx)(o,{theme:n,autoHeight:!0,onReady:e=>window.stages.scenes[2]=e,children:(0,N.jsxs)(f,{orientation:i.Horizontal,spacing:16,padding:[12,12,12,12],children:[(0,N.jsx)(r,{text:`Accent style button`,variant:E.Accent}),(0,N.jsx)(r,{text:`Subtle style button`,variant:E.Subtle})]})}),(0,N.jsx)(z,{index:2})]})]}),(0,N.jsxs)(`section`,{className:`example`,id:`button-wrapping`,children:[(0,N.jsx)(`h2`,{children:(0,N.jsx)(w,{children:k.samples[3].header})}),(0,N.jsxs)(`div`,{className:`example-card`,children:[(0,N.jsx)(o,{theme:n,autoHeight:!0,onReady:e=>window.stages.scenes[3]=e,children:(0,N.jsxs)(f,{padding:[12,12,12,12],spacing:8,children:[(0,N.jsx)(x,{text:`One option to avoid clipped content is to place Buttons underneath each other, allowing more space to grow horizontally:`,wrap:!0}),(0,N.jsx)(r,{text:`This is some text that is too long and will get cut off`,horizontalAlignment:d.Stretch}),(0,N.jsx)(r,{text:`This is another text that would result in being cut off`,horizontalAlignment:d.Stretch}),(0,N.jsx)(x,{text:`Another option is to explicitly wrap the Button's content`,margin:[0,8,0,8]}),(0,N.jsxs)(f,{orientation:i.Horizontal,horizontalAlignment:d.Center,spacing:8,children:[(0,N.jsx)(r,{maxWidth:240,children:(0,N.jsx)(x,{text:`This is some text that is too long and will get cut off without wrapping`,wrap:!0})}),(0,N.jsx)(r,{maxWidth:240,children:(0,N.jsx)(x,{text:`This is another text that would result in being cut off without wrapping`,wrap:!0})})]})]})}),(0,N.jsx)(z,{index:3})]})]}),(0,N.jsxs)(m,{className:`source`,id:`button-extra-options`,children:[(0,N.jsx)(c,{children:`Additional Button options`}),`                `,(0,N.jsxs)(`label`,{className:`field`,children:[`ClickMode`,(0,N.jsx)(b,{"aria-label":`ClickMode`,value:T,onValueChanged:e=>A(e),children:Object.values(t).map(e=>(0,N.jsx)(g,{children:e},e))})]})]}),(0,N.jsxs)(m,{className:`source`,id:`button-initialization`,children:[(0,N.jsx)(c,{children:`共享初始化（整个应用只执行一次）`}),(0,N.jsx)(`p`,{className:`source-hint`,children:(0,N.jsx)(w,{children:`这是 Gallery 的入口文件，包含应用挂载和测试诊断；不需要为每个按钮重复编写。`})}),(0,N.jsx)(D,{children:j})]}),(0,N.jsxs)(`footer`,{children:[`Gallery 7360ac3 · matched SDK 2.3.10-experimental`,(0,N.jsx)(`span`,{children:`Button`})]})]})]})}function V({sdk:e,theme:t}){let n=(0,O.useRef)(null),r=(0,O.useRef)(null);return(0,O.useEffect)(()=>{let i=e.scene(n.current,{theme:t});r.current=i,window.stages.scenes[0]=i;let o=i.root.stack({padding:[20,20,20,20],spacing:12}),s=o.text({text:`Shared scene · 中文 / English`,fontSize:20,fontWeight:600});window.stages.caption=s;let c=o.button({text:`Update both controls`,variant:E.Accent});window.stages.buttons[0]=c;let l=o.navigationView({paneDisplayMode:h.Left,items:[{id:`home`,text:`Home`},{id:`files`,text:`Files`}],selectedId:`home`,header:`Shared content`,isBackButtonVisible:a.Collapsed},{height:220});window.stages.navigation=l;let u=0;return c.onClick(()=>{i.batch(()=>{s.update({text:`Updated ${++u} · 中文 / English`}),l.configure({header:`Update ${u}`})})}),()=>i.dispose()},[e]),(0,O.useEffect)(()=>r.current?.configure({theme:t}),[t]),(0,N.jsx)(`div`,{ref:n,style:{height:370}})}function H({sdk:t}){let[i,a]=p(),[s,d]=(0,O.useState)(e.Canvas2D),[h,_]=(0,O.useState)(!0);return P(),(0,O.useEffect)(()=>{window.stages.setMounted=_,document.documentElement.dataset.theme=i},[i]),(0,N.jsxs)(N.Fragment,{children:[(0,N.jsx)(F,{title:`Composition and rendering`,theme:i,onTheme:a}),(0,N.jsxs)(`main`,{className:`stage-main`,children:[(0,N.jsxs)(`section`,{className:`example`,id:`shared-scene`,children:[(0,N.jsx)(`h2`,{children:(0,N.jsx)(w,{children:`Text + Button + NavigationView in one scene`})}),(0,N.jsx)(`div`,{className:`example-card`,children:(0,N.jsx)(V,{sdk:t,theme:i})})]}),(0,N.jsxs)(`section`,{className:`example`,id:`rendering-scene`,children:[(0,N.jsx)(`h2`,{children:(0,N.jsx)(w,{children:`Nested layout and typography`})}),(0,N.jsxs)(`div`,{className:`page-toolbar`,children:[(0,N.jsxs)(`label`,{children:[`Renderer`,` `,(0,N.jsx)(b,{"aria-label":`Renderer`,value:s,onValueChanged:e=>d(e),children:Object.values(e).map(e=>(0,N.jsx)(g,{children:e},e))})]}),(0,N.jsx)(C,{onClick:()=>_(e=>!e),children:h?`Unmount scene`:`Mount scene`})]}),h&&(0,N.jsx)(o,{theme:i,backend:s,style:{height:340},onReady:e=>window.stages.scenes[1]=e,children:(0,N.jsxs)(n,{padding:[20,20,20,20],columns:[{unit:S.Star,value:1},{unit:S.Star,value:1}],spacing:16,clip:!0,children:[(0,N.jsxs)(f,{spacing:12,children:[(0,N.jsx)(x,{text:`中文布局、混合字体与换行`,fontSize:24,fontWeight:600,wrap:!0}),(0,N.jsx)(x,{text:`Rust measures the exact text runs drawn by both backends. 中文文本随容器宽度变化换行，字重和基线保持一致。`,wrap:!0}),(0,N.jsx)(x,{text:`👩‍💻 é / 中文 / An overflowing line with an ellipsis`,trimming:l.CharacterEllipsis}),(0,N.jsx)(r,{text:`Focusable without a black ring`,variant:E.Accent})]}),(0,N.jsx)(n,{column:1,background:`#e8efff`,cornerRadius:8,opacity:.7,clip:!0,children:(0,N.jsxs)(f,{padding:[16,16,16,16],spacing:8,transform:[1,.05,0,1,0,0],children:[(0,N.jsx)(x,{text:`Shared clips and isolated opacity`,wrap:!0,fontWeight:600}),(0,N.jsx)(r,{text:`Subtle content`,variant:E.Subtle})]})})]})},s)]}),(0,N.jsxs)(`section`,{className:`example`,id:`input-host`,children:[(0,N.jsx)(`h2`,{children:(0,N.jsx)(w,{children:`TextBox composition host`})}),(0,N.jsx)(`p`,{children:(0,N.jsx)(w,{children:`The browser owns IME composition and its candidate window. This TextBox sample verifies focus, text commits, accessibility naming and anchor coordinates.`})}),(0,N.jsx)(`div`,{className:`example-card`,children:(0,N.jsx)(o,{theme:i,style:{height:112},onReady:e=>window.stages.scenes[2]=e,children:(0,N.jsx)(f,{padding:[24,24,24,24],children:(0,N.jsx)(u,{accessibleName:`中文组合输入验证`,height:40,onReady:e=>window.stages.input=e})})})})]}),(0,N.jsxs)(m,{className:`source`,children:[(0,N.jsx)(c,{children:`Running public SDK / React source`}),(0,N.jsx)(D,{children:A})]})]})]})}export{M as i,H as n,F as r,B as t};