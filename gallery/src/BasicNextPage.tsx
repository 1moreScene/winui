import { LocalizedText } from "./GalleryLanguage";
import { SourceCode } from './SourceCode';
import { GalleryButton, GalleryComboBox, GalleryExpander, GalleryExpanderHeader, GalleryOption, GallerySlider } from './GalleryControls';
import { useGalleryTheme } from './gallery-theme';
import { useEffect, useState, type ReactNode } from "react";
import { Header } from "./ButtonPage";
import {
  SceneView,
  RepeatButton,
  Viewbox,
  Grid,
  StackPanel,
  TextBlock,
  Image,
  CheckBox,
  RadioButtons,
} from "winui-wasm/react";
import {
  ThemeMode,
  RendererBackend,
  Stretch,
  StretchDirection,
  Orientation,
  HorizontalAlignment,
  VerticalAlignment,
  type Scene,
} from "winui-wasm";
import official from "./official-basic-next.json";
import source from "./BasicNextPage.tsx?raw";
import { extractSampleSource } from "./sample-source";
declare global {
  interface Window {
    basicNextScenes: Record<string, Scene>;
  }
}
function remember(name: string, scene: Scene) {
  window.basicNextScenes ??= {};
  window.basicNextScenes[name] = scene;
}
function Example({
  page,
  name,
  children,
  options,
}: {
  page: keyof typeof official.controls;
  name: string;
  children: ReactNode;
  options: ReactNode;
}) {
  const [native, setNative] = useState(false);
  const sample = official.controls[page].samples[0];
  return (
    <section className="example basic-example" id={name}>
      <h2><LocalizedText>{sample.title}</LocalizedText></h2>
      <div className="example-card">
        <div className="basic-live with-options">
          <div className="basic-preview">{children}</div>
          <div className="options">{options}</div>
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
export function BasicNextPage({
  page,
}: {
  page: keyof typeof official.controls;
}) {
  const [theme, setTheme] = useGalleryTheme(),
    [backend, setBackend] = useState(RendererBackend.Canvas2D);
  const [count, setCount] = useState(0),
    [disabled, setDisabled] = useState(false);
  const [size, setSize] = useState(200),
    [stretch, setStretch] = useState(Stretch.Uniform),
    [direction, setDirection] = useState(StretchDirection.Both);
  const stretches = [
      Stretch.None,
      Stretch.Fill,
      Stretch.Uniform,
      Stretch.UniformToFill,
    ],
    directions = Object.values(StretchDirection);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  const shared = { theme, backend };
  return (
    <>
      <Header title={page} theme={theme} onTheme={setTheme} />
      <main className="stage-main official-motion">
        
        <div className="effects-options material-policies">
          <label>
            Renderer{" "}
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
        {page === "RepeatButton" ? (
          <Example
            page={page}
            name="repeat-simple"
            options={
              <SceneView {...shared} autoHeight>
                <CheckBox
                  text="Disable RepeatButton"
                  isChecked={disabled}
                  onChecked={() => setDisabled(true)}
                  onUnchecked={() => setDisabled(false)}
                />
              </SceneView>
            }
          >
            <SceneView
              {...shared}
              autoHeight
              onReady={(s) => remember("repeat-simple", s)}
            >
              {/* @sample:repeat-simple:start */}
              <StackPanel orientation={Orientation.Horizontal}>
                <RepeatButton
                  text="Click and hold"
                  enabled={!disabled}
                  onClick={() => setCount((c) => c + 1)}
                />
                <TextBlock
                  text={count ? `Number of clicks: ${count}` : ""}
                  margin={[8, 0, 0, 0]}
                  verticalAlignment={VerticalAlignment.Center}
                />
              </StackPanel>
              {/* @sample:repeat-simple:end */}
            </SceneView>
            <output aria-live="polite" className="sr-only">
              {count ? `Number of clicks: ${count}` : ""}
            </output>
          </Example>
        ) : (
          <Example
            page={page}
            name="viewbox-content"
            options={
              <>
                <label>
                  Width/Height{" "}
                  <GallerySlider
                    aria-label="Width/Height"
                    
                    min={20}
                    max={300}
                    value={size}
                    onValueChanged={(e) => setSize(e)}
                  />
                  <output>{size}</output>
                </label>
                <SceneView
                  {...shared}
                  autoHeight
                  onReady={(s) => remember("viewbox-options", s)}
                >
                  <StackPanel spacing={12}>
                    <RadioButtons
                      header="Stretch"
                      items={stretches}
                      selectedIndex={stretches.indexOf(stretch)}
                      onSelectionChanged={(e) =>
                        setStretch(stretches[e.selectedIndex ?? 0])
                      }
                    />
                    <RadioButtons
                      header="StretchDirection"
                      items={directions}
                      selectedIndex={directions.indexOf(direction)}
                      onSelectionChanged={(e) =>
                        setDirection(directions[e.selectedIndex ?? 0])
                      }
                    />
                  </StackPanel>
                </SceneView>
              </>
            }
          >
            <SceneView
              {...shared}
              style={{ height: 380 }}
              onReady={(s) => remember("viewbox-content", s)}
            >
              {/* @sample:viewbox-content:start */}
              <Viewbox
                width={size}
                height={size}
                stretch={stretch}
                stretchDirection={direction}
                verticalAlignment={VerticalAlignment.Top}
              >
                <Grid padding={[15, 15, 15, 15]} background="#808080">
                  <StackPanel background="#a9a9a9">
                    <StackPanel orientation={Orientation.Horizontal}>
                      <Grid width={40} height={10} background="#0000ff" />
                      <Grid width={40} height={10} background="#008000" />
                      <Grid width={40} height={10} background="#ff0000" />
                      <Grid width={40} height={10} background="#ffff00" />
                    </StackPanel>
                    <Image source="/official/Slices.png" />
                    <TextBlock
                      text="This is text."
                      horizontalAlignment={HorizontalAlignment.Center}
                    />
                  </StackPanel>
                </Grid>
              </Viewbox>
              {/* @sample:viewbox-content:end */}
            </SceneView>
          </Example>
        )}
      </main>
    </>
  );
}
