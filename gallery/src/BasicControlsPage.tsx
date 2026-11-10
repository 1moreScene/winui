import { LocalizedText } from "./GalleryLanguage";
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
                text={`Option ${index + 1}`}
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
