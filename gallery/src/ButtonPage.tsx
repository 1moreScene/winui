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
} from "./react";
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
  type Button as ButtonController,
  type SceneNode,
  type TextOptions,
  type TextBox as TextBoxController,
  type SceneNavigationView,
} from "./index";
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
  extractSampleSource(source, `button-${name}`),
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
        <p className="source-hint">
          当前示例的控件调用。WinUIProvider 和 SceneView
          由页面统一提供；Options、Output 和 Gallery 外壳不属于按钮调用。
        </p>
      )}
      <pre data-sample-source={buttonSampleNames[index]}>
        <code>
          {reference
            ? official.samples[index]?.xaml
            : buttonSampleSources[index]}
        </code>
      </pre>
      {!reference && index < 2 && (
        <section className="source-context">
          <h3>Options / Output 的共享页面状态</h3>
          <pre>
            <code>{buttonStateSource}</code>
          </pre>
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
          <h2>{official.samples[0].header}</h2>
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
                {count ? `You clicked: Button1 (${count})` : ""}
              </code>
            </div>
            </div>
            <Code index={0} />
          </div>
        </section>
        <section className="example" id="button-image">
          <h2>{official.samples[1].header}</h2>
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
                {imageCount ? `You clicked: Button2 (${imageCount})` : ""}
              </code>
            </div>
            </div><Code index={1} />
          </div>
        </section>
        <section className="example" id="button-styles">
          <h2>{official.samples[2].header}</h2>
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
          <h2>{official.samples[3].header}</h2>
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
          <p className="source-hint">
            这是 Gallery
            的入口文件，包含应用挂载和测试诊断；不需要为每个按钮重复编写。
          </p>
          <pre>
            <code>{initializationSource}</code>
          </pre>
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
        isBackButtonVisible: false,
      },
      { height: 220 },
    );
    window.stages.navigation = navigation;
    let count = 0;
    button.onClick(() => {
      scene.batch(() => {
        caption.update({ text: `Updated ${++count} · 中文 / English` });
        navigation.configure({ header: `Update ${count}` });
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
          <h2>Text + Button + NavigationView in one scene</h2>
          <div className="example-card">
            <SharedScene sdk={sdk} theme={theme} />
          </div>
        </section>
        <section className="example" id="rendering-scene">
          <h2>Nested layout and typography</h2>
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
          <h2>TextBox composition host</h2>
          <p>
            The browser owns IME composition and its candidate window. This TextBox
            sample verifies focus, text commits, accessibility naming and anchor
            coordinates.
          </p>
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
          <pre>
            <code>{source}</code>
          </pre>
        </GalleryExpander>
      </main>
    </>
  );
}
