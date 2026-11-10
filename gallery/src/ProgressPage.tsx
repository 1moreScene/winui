import { LocalizedText } from "./GalleryLanguage";
import { SourceCode } from './SourceCode';
import { GalleryButton, GalleryCheckBox, GalleryComboBox, GalleryExpander, GalleryExpanderHeader, GalleryNumberBox, GalleryOption } from './GalleryControls';
import { useGalleryTheme } from './gallery-theme';
import { useEffect, useState, type ReactNode } from "react";
import { Header } from "./ButtonPage";
import {
  SceneView,
  ProgressBar,
  ProgressRing,
  ToggleSwitch,
  RadioButtons,
} from "winui-wasm/react";
import {
  RendererBackend,
  ThemeMode,
  HorizontalAlignment,
  VerticalAlignment,
  type Scene,
} from "winui-wasm";
import official from "./official-progress.json";
import source from "./ProgressPage.tsx?raw";
import { extractSampleSource } from "./sample-source";

declare global {
  interface Window {
    progressScenes: Record<string, Scene>;
  }
}
function remember(name: string, scene: Scene) {
  window.progressScenes ??= {};
  window.progressScenes[name] = scene;
}
function Example({
  page,
  index,
  name,
  children,
  options,
}: {
  page: keyof typeof official.controls;
  index: number;
  name: string;
  children: ReactNode;
  options?: ReactNode;
}) {
  const [native, setNative] = useState(false);
  const sample = official.controls[page].samples[index];
  return (
    <section className="example basic-example" id={name}>
      <h2><LocalizedText>{sample.title}</LocalizedText></h2>
      <div className="example-card">
        <div className={options ? "basic-live with-options" : "basic-live"}>
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
          <SourceCode language={native ? 'xaml' : 'tsx'}>{native ? sample.xaml : extractSampleSource(source, name)}</SourceCode>
        </GalleryExpander>
      </div>
    </section>
  );
}
export function ProgressPage({
  page,
}: {
  page: keyof typeof official.controls;
}) {
  const [theme, setTheme] = useGalleryTheme(),
    [backend, setBackend] = useState(RendererBackend.Canvas2D);
  const [active, setActive] = useState(true),
    [state, setState] = useState(0),
    [barValue, setBarValue] = useState(0),
    [ringValue, setRingValue] = useState(0);
  const [background1, setBackground1] = useState("#ffffff00"),
    [background2, setBackground2] = useState("#ffffff00");
  const [reducedMotion, setReducedMotion] = useState(
    matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  const shared = { theme, backend, reducedMotion };
  const color = (value: string, update: (v: string) => void) => (
    <label>
      Background color{" "}
      <GalleryComboBox
        aria-label="Background color"
        value={value}
        onValueChanged={(e) => update(e)}
      >
        <GalleryOption value="#ffffff00">Transparent</GalleryOption>
        <GalleryOption value="#d3d3d3">LightGray</GalleryOption>
      </GalleryComboBox>
    </label>
  );
  return (
    <>
      <Header title={page} theme={theme} onTheme={setTheme} />
      <main className="stage-main official-motion">
        
        <div className="effects-options material-policies">
          <label>
            Renderer{" "}
            <GalleryComboBox
              aria-label="Progress renderer"
              value={backend}
              onValueChanged={(e) => setBackend(e as RendererBackend)}
            >
              {Object.values(RendererBackend).map((v) => (
                <GalleryOption key={v}>{v}</GalleryOption>
              ))}
            </GalleryComboBox>
          </label>
          <GalleryCheckBox
              
              checked={reducedMotion}
              onValueChanged={(e) => setReducedMotion(e)}  label={<>
            {" "}
            Reduced motion
          </>}/>
        </div>
        {page === "ProgressBar" ? (
          <>
            <Example
              page={page}
              index={0}
              name="bar-indeterminate"
              options={
                <SceneView
                  {...shared}
                  autoHeight
                  onReady={(s) => remember("bar-options", s)}
                >
                  <RadioButtons
                    header="Progress state"
                    items={["Running", "Paused", "Error"]}
                    selectedIndex={state}
                    onSelectionChanged={(e) => setState(e.selectedIndex ?? 0)}
                  />
                </SceneView>
              }
            >
              <SceneView
                {...shared}
                style={{ height: 100 }}
                onReady={(s) => remember("bar-indeterminate", s)}
              >
                {/* @sample:bar-indeterminate:start */}
                <ProgressBar
                  width={130}
                  margin={[10, 10, 0, 0]}
                  verticalAlignment={VerticalAlignment.Top}
                  isIndeterminate
                  showPaused={state === 1}
                  showError={state === 2}
                  accessibleName="Indeterminate progress example"
                />
                {/* @sample:bar-indeterminate:end */}
              </SceneView>
            </Example>
            <Example page={page} index={1} name="bar-determinate">
              <SceneView
                {...shared}
                style={{ height: 52 }}
                onReady={(s) => remember("bar-determinate", s)}
              >
                {/* @sample:bar-determinate:start */}
                <ProgressBar
                  width={130}
                  horizontalAlignment={HorizontalAlignment.Left}
                  value={barValue}
                  accessibleName="Determinate progress example"
                />
                {/* @sample:bar-determinate:end */}
              </SceneView>
              <label>
                Progress{" "}
                <GalleryNumberBox
                  aria-label="Bar progress"
                  
                  min={0}
                  max={100}
                  value={barValue}
                  onValueChanged={(e) => {
                    const v = e;
                    if (Number.isFinite(v))
                      setBarValue(Math.max(0, Math.min(100, v)));
                  }}
                />
              </label>
              <output aria-live="polite">{barValue}%</output>
            </Example>
          </>
        ) : (
          <>
            <Example
              page={page}
              index={0}
              name="ring-indeterminate"
              options={
                <>
                  <SceneView
                    {...shared}
                    autoHeight
                    onReady={(s) => remember("ring-options", s)}
                  >
                    <ToggleSwitch
                      header="Progress Options"
                      isOn={active}
                      onContent="Working"
                      offContent="Do work"
                      onToggled={(e) => setActive(e.isOn ?? false)}
                      accessibleName="Progress Options"
                    />
                  </SceneView>
                  {color(background1, setBackground1)}
                </>
              }
            >
              <SceneView
                {...shared}
                style={{ height: 100 }}
                onReady={(s) => remember("ring-indeterminate", s)}
              >
                {/* @sample:ring-indeterminate:start */}
                <ProgressRing
                  width={60}
                  height={60}
                  margin={[10, 10, 0, 0]}
                  verticalAlignment={VerticalAlignment.Top}
                  isActive={active}
                  background={background1}
                  accessibleName="Progress image"
                />
                {/* @sample:ring-indeterminate:end */}
              </SceneView>
            </Example>
            <Example
              page={page}
              index={1}
              name="ring-determinate"
              options={color(background2, setBackground2)}
            >
              <SceneView
                {...shared}
                style={{ height: 80 }}
                onReady={(s) => remember("ring-determinate", s)}
              >
                {/* @sample:ring-determinate:start */}
                <ProgressRing
                  width={60}
                  height={60}
                  horizontalAlignment={HorizontalAlignment.Left}
                  isIndeterminate={false}
                  value={ringValue}
                  background={background2}
                  accessibleName="Determinate progress image"
                />
                {/* @sample:ring-determinate:end */}
              </SceneView>
              <label>
                Progress{" "}
                <GalleryNumberBox
                  aria-label="Ring progress"
                  
                  min={0}
                  max={100}
                  value={ringValue}
                  onValueChanged={(e) => {
                    const v = e;
                    if (Number.isFinite(v))
                      setRingValue(Math.max(0, Math.min(100, v)));
                  }}
                />
              </label>
            </Example>
          </>
        )}
      </main>
    </>
  );
}
