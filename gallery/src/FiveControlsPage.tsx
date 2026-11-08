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
} from "./react";
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
} from "./index";
import official from "./official-five-controls.json";
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
}: {
  name: string;
  page: FivePage;
  index?: number;
  children: ReactNode;
  options?: ReactNode;
}) {
  const [native, setNative] = useState(false);
  const sample = official.controls[page].samples[index];
  return (
    <section id={name} className="example basic-example">
      <h2>{sample.title}</h2>
      <div className="example-card">
        <div className={`basic-live ${options ? "with-options" : ""}`}>
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
          <pre>
            <code>
              {native ? sample.xaml : extractSampleSource(source, name)}
            </code>
          </pre>
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
    Default: "\uEA38",
    Attention: "\uEA38",
    Informational: "\uF13F",
    Success: "\uE8FB",
    Caution: "\uE814",
    Critical: "\uE711",
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
          <Example
            name="expander-text"
            page={page}
            options={
              <>
                <label>
                  Expand direction{" "}
                  <GalleryComboBox
                    aria-label="Expand direction"
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
                <GalleryCheckBox
                    
                    checked={disabled}
                    onValueChanged={(e) => setDisabled(e)}  label={<>
                  
                  Disable Expander
                </>}/>
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
                enabled={!disabled}
                expandDirection={direction}
                verticalAlignment={VerticalAlignment.Top}
                onExpanding={() => setExpanded(true)}
                onCollapsed={() => setExpanded(false)}
              >
                <TextBlock text="This is in the content" />
              </Expander>
              {/* @sample:expander-text:end */}
            </SceneView>
            <output aria-live="polite">
              {expanded ? "Expanded" : "Collapsed"}
            </output>
          </Example>
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
