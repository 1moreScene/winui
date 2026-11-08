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
} from "./react";
import {
  ThemeMode,
  RendererBackend,
  HorizontalAlignment,
  Orientation,
  type Scene,
} from "./index";
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
      <h2>{sample.title}</h2>
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
                  : `You selected Option ${selected + 1}`
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
