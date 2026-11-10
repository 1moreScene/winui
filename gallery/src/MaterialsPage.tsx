import { LocalizedText } from "./GalleryLanguage";
import { SourceCode } from './SourceCode';
import { GalleryButton, GalleryCheckBox, GalleryComboBox, GalleryExpander, GalleryExpanderHeader, GalleryNumberBox, GalleryOption, GalleryRadioButton, GallerySlider } from './GalleryControls';
import { useGalleryTheme } from './gallery-theme';
import { useEffect, useRef, useState } from "react";
import { SceneView, Grid, Ellipse, Button, TextBlock, CheckBox } from "winui-wasm/react";
import { Header } from "./ButtonPage";
import {
  ThemeMode,
  RendererBackend,
  HorizontalAlignment,
  VerticalAlignment,
  GridUnit,
  AnimatedProperty,
  EasingFunction,
  EasingMode,
  type LayoutOptions,
  type Panel,
  type AnimationOptions,
  type AnimationTargets,
} from "winui-wasm";
import { GradientKind, BrushMappingMode, GradientSpread } from "winui-wasm";
import official from "./official-motion.json";
import source from "./MaterialsPage.tsx?raw";
import nativeDefaults from "../../references/motion-native-defaults.json";
import { extractSampleSource } from "./sample-source";
declare global {
  interface Window {
    materialScenes: import("winui-wasm").Scene[];
    propertyScenes: import("winui-wasm").Scene[];
  }
}

function SampleCode({ name, xaml }: { name: string; xaml: string }) {
  const [native, setNative] = useState(false);
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
      <SourceCode language={native ? 'xaml' : 'tsx'}>{native ? xaml : extractSampleSource(source, name)}</SourceCode>
    </GalleryExpander>
  );
}
function AcrylicSample({
  index,
  theme,
  backend,
  windowWidth,
  reducedMotion,
  reducedTransparency,
}: {
  index: number;
  theme: ThemeMode;
  backend: RendererBackend;
  windowWidth: number;
  reducedMotion: boolean;
  reducedTransparency: boolean;
}) {
  const example = official.acrylic[index];
  const [opacity, setOpacity] = useState(0.8),
    [luminosity, setLuminosity] = useState(0.8);
  const [tint, setTint] = useState("#000000"),
    [fallback, setFallback] = useState("#008000");
  const layout =
    windowWidth >= 800
      ? example.layouts.WiderLayout
      : windowWidth >= 500
        ? example.layouts.WideLayout
        : null;
  const width = Math.max(example.minWidth, layout?.Width ?? example.minWidth);
  const height = layout?.Height ?? layout?.MinHeight ?? example.baseHeight;
  // @sample:official-acrylic-options:start
  const material: LayoutOptions =
    index === 0
      ? { acrylicResource: "AcrylicInAppFillColorDefaultBrush" }
      : {
          acrylic: {
            tintColor: index === 1 ? tint : "#87ceeb",
            tintOpacity: opacity,
            luminosityOpacity: index === 2 ? luminosity : undefined,
            fallbackColor: index === 1 ? fallback : "#87ceeb",
          },
        };
  // @sample:official-acrylic-options:end
  return (
    <section className="example" id={`acrylic-${index}`}>
      <h2><LocalizedText>{example.title}</LocalizedText></h2>
      <div className="example-card">
        <div
          className={
            index ? "official-acrylic-row" : "official-acrylic-default"
          }
        >
          <div className="official-acrylic-display">
            {/* @sample:official-acrylic-scene:start */}
            <SceneView
              theme={theme}
              backend={backend}
              reducedMotion={reducedMotion}
              reducedTransparency={reducedTransparency}
              style={{ width, height }}
              onReady={(scene) => {
                window.materialScenes ??= [];
                window.materialScenes[index] = scene;
              }}
            >
              <Grid
                columns={example.columns.map((value) =>
                  value === "*"
                    ? { unit: GridUnit.Star, value: 1 }
                    : { unit: GridUnit.Pixel, value: Number(value) },
                )}
              >
                <Grid>
                  {example.shapes.map((shape, i) => {
                    const options: LayoutOptions = {
                      width: shape.width,
                      height: shape.height,
                      background: shape.fill,
                      horizontalAlignment:
                        HorizontalAlignment[
                          shape.horizontal as keyof typeof HorizontalAlignment
                        ],
                      verticalAlignment:
                        VerticalAlignment[
                          shape.vertical as keyof typeof VerticalAlignment
                        ],
                    };
                    return shape.kind === "Ellipse" ? (
                      <Ellipse key={i} {...options} />
                    ) : (
                      <Grid key={i} {...options} />
                    );
                  })}
                </Grid>
                <Grid margin={[12, 12, 12, 12]} {...material} />
              </Grid>
            </SceneView>
            {/* @sample:official-acrylic-scene:end */}
          </div>
          {index > 0 && (
            <aside className="options acrylic-options">
              <label className="field">
                Tint Opacity :
                <GallerySlider
                  aria-label={`Tint opacity ${index}`}
                  
                  min="0"
                  max="1"
                  step="0.001"
                  value={opacity}
                  onValueChanged={(e) => setOpacity(Number(e))}
                />
              </label>
              {index === 1 ? (
                <>
                  <label className="field">
                    Tint Color :
                    <GalleryComboBox
                      aria-label="Tint color"
                      value={tint}
                      onValueChanged={(e) => setTint(e)}
                    >
                      {["#000000", "#ff0000", "#0000ff"].map((color) => (
                        <GalleryOption
                          key={color}
                          value={color}
                        >{`#FF${color.slice(1).toUpperCase()}`}</GalleryOption>
                      ))}
                    </GalleryComboBox>
                  </label>
                  <label className="field">
                    Fallback Color :
                    <GalleryComboBox
                      aria-label="Fallback color"
                      value={fallback}
                      onValueChanged={(e) => setFallback(e)}
                    >
                      {["#008000", "#ffff00"].map((color) => (
                        <GalleryOption
                          key={color}
                          value={color}
                        >{`#FF${color.slice(1).toUpperCase()}`}</GalleryOption>
                      ))}
                    </GalleryComboBox>
                  </label>
                </>
              ) : (
                <label className="field">
                  Tint Luminosity Opacity :
                  <GallerySlider
                    aria-label="Tint luminosity"
                    
                    min="0"
                    max="1"
                    step="0.001"
                    value={luminosity}
                    onValueChanged={(e) => setLuminosity(Number(e))}
                  />
                </label>
              )}
            </aside>
          )}
        </div>
        <SampleCode
          name="official-acrylic-options"
          xaml={example.xaml
            .replaceAll("$(OpacitySlider)", String(opacity))
            .replaceAll("$(TintLuminositySlider)", String(luminosity))
            .replaceAll("$(TintColor)", `#FF${tint.slice(1).toUpperCase()}`)
            .replaceAll(
              "$(FallbackColor)",
              `#FF${fallback.slice(1).toUpperCase()}`,
            )}
        />
        <GalleryExpander className="source">
          <GalleryExpanderHeader>背景与材质的组合代码</GalleryExpanderHeader>
          <SourceCode>{extractSampleSource(source, "official-acrylic-scene")}</SourceCode>
        </GalleryExpander>
      </div>
    </section>
  );
}
export function AcrylicPage() {
  const [theme, setTheme] = useGalleryTheme(),
    [backend, setBackend] = useState(RendererBackend.Canvas2D);
  const [reducedMotion, setReducedMotion] = useState(false),
    [reducedTransparency, setReducedTransparency] = useState(false);
  const [windowWidth, setWindowWidth] = useState(innerWidth);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    const resized = () => setWindowWidth(innerWidth);
    addEventListener("resize", resized);
    return () => removeEventListener("resize", resized);
  }, []);
  return (
    <>
      <Header title="Acrylic" theme={theme} onTheme={setTheme} />
      <main className="stage-main official-motion">
        
        <div className="effects-options material-policies">
          <label>
            Renderer
            <GalleryComboBox
              aria-label="Renderer"
              value={backend}
              onValueChanged={(e) => setBackend(e as RendererBackend)}
            >
              {Object.values(RendererBackend).map((value) => (
                <GalleryOption key={value}>{value}</GalleryOption>
              ))}
            </GalleryComboBox>
          </label>
          <GalleryCheckBox
              
              checked={reducedMotion}
              onValueChanged={(e) => setReducedMotion(e)}  label={<>
            
            Reduce motion
          </>}/>
          <GalleryCheckBox
              
              checked={reducedTransparency}
              onValueChanged={(e) => setReducedTransparency(e)}  label={<>
            
            Reduce transparency
          </>}/>
        </div>
        {official.acrylic.map((sample, index) => (
          <AcrylicSample
            key={sample.name}
            {...{
              index,
              theme,
              backend,
              windowWidth,
              reducedMotion,
              reducedTransparency,
            }}
          />
        ))}
      </main>
    </>
  );
}
function EasingSample({ index, theme }: { index: number; theme: ThemeMode }) {
  const sample = official.easing[index];
  const rectangle = useRef<Panel | null>(null);
  const [functionType, setFunctionType] = useState(EasingFunction.Back),
    [mode, setMode] = useState(EasingMode.EaseOut);
  const [exponent, setExponent] = useState(sample.exponent ?? 2);
  const options: AnimationOptions = {
    duration: sample.duration,
    easingFunction:
      index === 0
        ? EasingFunction.Circle
        : index < 3
          ? EasingFunction.Exponential
          : functionType,
    easingMode:
      index === 0
        ? EasingMode.EaseInOut
        : index === 1
          ? EasingMode.EaseIn
          : index === 2
            ? EasingMode.EaseOut
            : mode,
    easingParameters: { exponent },
  };
  // @sample:official-easing-call:start
  function animate() {
    const target = rectangle.current;
    if (!target || target.isDisposed) return;
    // Gallery chooses direction using the current value, including during a run.
    const x = target.snapshot.presentation.translationX;
    target.animate({ translationX: x > 0 ? 0 : 200 }, options);
  }
  // @sample:official-easing-call:end
  return (
    <section className="example" id={`easing-${index}`}>
      <h2><LocalizedText>{sample.title}</LocalizedText></h2>
      <div className="example-card">
        <div className={index ? "easing-live with-options" : "easing-live"}>
          <SceneView theme={theme} style={{ height: 74 }}>
            <Grid
              padding={[12, 12, 12, 12]}
              columns={[{ unit: GridUnit.Auto }, { unit: GridUnit.Star }]}
            >
              <Button
                text="Animate"
                accessibleName={`Animate easing ${index}`}
                onClick={animate}
              />
              <Grid
                column={1}
                width={50}
                height={50}
                horizontalAlignment={HorizontalAlignment.Center}
                verticalAlignment={VerticalAlignment.Center}
                background={nativeDefaults.accentColor}
                onReady={(value) => {
                  rectangle.current = value;
                }}
              />
            </Grid>
          </SceneView>
          {index > 0 && (
            <aside className="options">
              {index < 3 ? (
                <label className="field">
                  Exponent
                  <GalleryNumberBox
                    aria-label={`Easing exponent ${index}`}
                    
                    step="0.1"
                    value={exponent}
                    onValueChanged={(e) => {
                      const value = e;
                      if (Number.isFinite(value) && Math.abs(value) <= 50)
                        setExponent(value);
                    }}
                  />
                </label>
              ) : (
                <>
                  <label className="field">
                    Easing type
                    <GalleryComboBox
                      aria-label="Easing type"
                      value={functionType}
                      onValueChanged={(e) =>
                        setFunctionType(e as EasingFunction)
                      }
                    >
                      {Object.values(EasingFunction).map((type) => (
                        <GalleryOption key={type} value={type}>
                          {type}Ease
                        </GalleryOption>
                      ))}
                    </GalleryComboBox>
                  </label>
                  {Object.values(EasingMode).map((value) => (
                    <GalleryRadioButton
                        
                        name="easing-mode"
                        value={value}
                        checked={mode === value}
                        onValueChanged={() => setMode(value)} key={value} className="check-option" label={<>
                      
                      {value}
                    </>}/>
                  ))}
                </>
              )}
            </aside>
          )}
        </div>
        <SampleCode name="official-easing-call" xaml={sample.xaml} />
      </div>
    </section>
  );
}
export function EasingPage() {
  const [theme, setTheme] = useGalleryTheme();
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return (
    <>
      <Header title="Easing Functions" theme={theme} onTheme={setTheme} />
      <main className="stage-main official-motion">
        
        {official.easing.map((sample, index) => (
          <EasingSample key={sample.title} {...{ index, theme }} />
        ))}
      </main>
    </>
  );
}

function PropertyTransitionSample({
  index,
  theme,
}: {
  index: number;
  theme: ThemeMode;
}) {
  const rectangle = useRef<Panel | null>(null);
  const [value, setValue] = useState([0.5, 45, 1, 1][index]);
  const [axes, setAxes] = useState([true, true]);
  const names = ["Opacity", "Rotation", "Scale", "Translation"];
  const name = names[index];
  const sample = official.catalog
    .find((entry) => entry.name === "ImplicitTransition")!
    .samples.find((entry) =>
      entry.title.toLowerCase().includes(name.toLowerCase()),
    )!;
  // @sample:property-transition:start
  function apply(value: number) {
    const target = rectangle.current;
    if (!target || target.isDisposed) return;
    const tracks: Partial<Record<AnimatedProperty,number>> =
      index === 0
        ? { opacity: value }
        : index === 1
          ? { rotation: value }
          : index === 2
            ? { scaleX: value, scaleY: value }
            : { translationX: value, translationY: value };
    const implicit = Object.fromEntries(Object.keys(tracks).filter((_, axis) => index < 2 || axes[axis]).map(key => [key, nativeDefaults.scalarMs]));
    // Configure once per interaction; assigning properties starts the Rust transition.
    target.update({motion:{implicit}, ...tracks});
  }
  // @sample:property-transition:end
  return (
    <section className="example" id={`property-transition-${index}`}>
      <h2><LocalizedText>{sample.title}</LocalizedText></h2>
      <div className="example-card">
        <div className="official-acrylic-row">
          <SceneView
            theme={theme}
            style={{
              height: "100%",
              minHeight: index < 2 ? 84 : index === 2 ? 350 : 380,
            }}
            onReady={(scene) => {
              window.propertyScenes ??= [];
              window.propertyScenes[index] = scene;
            }}
          >
            <Grid padding={[12, 12, 12, 12]}>
              <Grid
                width={50}
                height={50}
                margin={[45, 5, 5, 5]}
                horizontalAlignment={HorizontalAlignment.Left}
                verticalAlignment={
                  index < 2 ? VerticalAlignment.Center : VerticalAlignment.Top
                }
                motion={{implicit:{[index===0?AnimatedProperty.Opacity:index===1?AnimatedProperty.Rotation:AnimatedProperty.ScaleX]:nativeDefaults.scalarMs}}}
                opacity={index === 0 ? 0.5 : 1}
                centerPoint={index === 1 ? [25, 25] : [0, 0]}
                background={
                  index === 1
                    ? {
                        kind: GradientKind.Linear,
                        from: [0.5, 0],
                        to: [0.5, 1],
                        stops: [
                          { offset: 0, color: "#d3d3d3" },
                          { offset: 1, color: nativeDefaults.accentColor },
                        ],
                      }
                    : nativeDefaults.accentColor
                }
                onReady={(node) => {
                  rectangle.current = node;
                }}
              />
            </Grid>
          </SceneView>
          <aside className="options">
            {index >= 2 && (
              <>
                {(index === 2 ? [0.5, 1, 2] : [0, 100, 200]).map((preset) => (
                  <GalleryButton
                    className="transition-action"
                    key={preset}
                    onClick={() => apply(preset)}
                  >
                    Set {name} to ({preset}, {preset})
                  </GalleryButton>
                ))}
                <p><LocalizedText>Components (X/Y)</LocalizedText></p>
                {["X", "Y"].map((axis, i) => (
                  <GalleryCheckBox
                      
                      checked={axes[i]}
                      onValueChanged={(e) =>
                        setAxes((previous) =>
                          previous.map((v, n) =>
                            n === i ? e : v,
                          ),
                        )
                      } className="check-option" key={axis} label={<>
                    
                    Animate {axis}
                  </>}/>
                ))}
              </>
            )}
            <label className="field">
              {name}
              <GalleryNumberBox
                
                aria-label={`${name} target`}
                min="0"
                max={[1, 360, 5, 200][index]}
                step={index === 0 ? 0.1 : 1}
                value={value}
                onValueChanged={(e) => {
                  const n = e;
                  if (
                    Number.isFinite(n) &&
                    n >= 0 &&
                    n <= [1, 360, 5, 200][index]
                  ) {
                    setValue(n);
                    // NumberBox commits Enter/spin/blur in Rust before this notification.
                    apply(n);
                  }
                }}
              />
            </label>
            <GalleryButton className="transition-action" onClick={() => apply(value)}>
              Set {index < 2 ? name : `custom ${name}`}
            </GalleryButton>
          </aside>
        </div>
        <SampleCode name="property-transition" xaml={sample.xaml} />
      </div>
    </section>
  );
}
function BackgroundTransitionSample({theme,index}:{theme:ThemeMode;index:number}) {
  const [blue,setBlue]=useState(true),[localTheme,setLocalTheme]=useState(ThemeMode.Light);
  const sample=official.catalog.find(entry=>entry.name==='ImplicitTransition')!.samples[index];
  return <section className="example" id={`property-transition-${index}`}><h2><LocalizedText>{sample.title}</LocalizedText></h2><div className="example-card"><div className="official-acrylic-row">
    {/* @sample:background-transition:start */}
    <SceneView theme={theme} style={{height:index===4?110:240}} onReady={scene=>{window.propertyScenes??=[];window.propertyScenes[index]=scene;}}>
      <Grid width={index===4?50:440} height={index===4?50:216} horizontalAlignment={HorizontalAlignment.Center} verticalAlignment={VerticalAlignment.Center}
        theme={index===5?localTheme:undefined} background={index===4?(blue?'#0000ff':'#ffff00'):{resource:'SolidBackgroundFillColorBaseBrush'}} motion={{backgroundDuration:150}}>
        {index===5&&<Grid padding={[12,12,12,12]}><TextBlock text="Lorem Ipsum" fontSize={24}/><TextBlock text="The background of this grid animates when the theme changes." margin={[0,42,0,0]} wrap/><Button text="Action" width={90} height={32} margin={[0,95,0,0]} horizontalAlignment={HorizontalAlignment.Left} verticalAlignment={VerticalAlignment.Top}/><CheckBox text="Option" margin={[0,140,0,0]} horizontalAlignment={HorizontalAlignment.Left} verticalAlignment={VerticalAlignment.Top}/></Grid>}
      </Grid>
    </SceneView>
    {/* @sample:background-transition:end */}
    <aside className="options"><GalleryButton onClick={()=>index===4?setBlue(!blue):setLocalTheme(localTheme===ThemeMode.Light?ThemeMode.Dark:ThemeMode.Light)}>{index===4?'Change color':'Change local theme'}</GalleryButton></aside></div><SampleCode name="background-transition" xaml={sample.xaml}/></div></section>;
}
export function PropertyTransitionsPage() {
  const [theme, setTheme] = useGalleryTheme();
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return (
    <>
      <Header title="Property transitions" theme={theme} onTheme={setTheme} />
      <main className="stage-main official-motion">
        
        {[0, 1, 2, 3].map((index) => (
          <PropertyTransitionSample key={index} index={index} theme={theme} />
        ))}
        {[4,5].map(index=><BackgroundTransitionSample key={index} index={index} theme={theme}/>)}
      </main>
    </>
  );
}

export function GradientPage() {
  const [theme, setTheme] = useGalleryTheme(),
    [backend, setBackend] = useState(RendererBackend.Canvas2D);
  const [mapping, setMapping] = useState(
      BrushMappingMode.RelativeToBoundingBox,
    ),
    [spread, setSpread] = useState(GradientSpread.Pad);
  const [values, setValues] = useState([0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  const sample = official.catalog.find(
    (entry) => entry.name === "RadialGradientBrush",
  )!.samples[0];
  const maximum = mapping === BrushMappingMode.Absolute ? 200 : 1;
  return (
    <>
      <Header title="RadialGradientBrush" theme={theme} onTheme={setTheme} />
      <main className="stage-main official-motion">
        <section className="example" id="radial-gradient">
          <h2><LocalizedText>{sample.title}</LocalizedText></h2>
          <div className="example-card">
            <div className="official-acrylic-row">
              {/* @sample:radial-gradient:start */}
              <SceneView
                theme={theme}
                backend={backend}
                style={{ height: "100%", minHeight: 224 }}
              >
                <Grid
                  width={200}
                  height={200}
                  horizontalAlignment={HorizontalAlignment.Center}
                  verticalAlignment={VerticalAlignment.Center}
                  background={{
                    kind: GradientKind.Radial,
                    mappingMode: mapping,
                    spreadMethod: spread,
                    center: [values[0], values[1]],
                    radius: [values[2], values[3]],
                    origin: [values[4], values[5]],
                    stops: [
                      { offset: 0, color: "#ffff00" },
                      { offset: 1, color: "#0000ff" },
                    ],
                  }}
                />
              </SceneView>
              {/* @sample:radial-gradient:end */}
              <aside className="options">
                <label className="field">
                  Renderer
                  <GalleryComboBox
                    aria-label="Gradient renderer"
                    value={backend}
                    onValueChanged={(e) =>
                      setBackend(e as RendererBackend)
                    }
                  >
                    {Object.values(RendererBackend).map((v) => (
                      <GalleryOption key={v}>{v}</GalleryOption>
                    ))}
                  </GalleryComboBox>
                </label>
                <label className="field">
                  MappingMode
                  <GalleryComboBox
                    aria-label="MappingMode"
                    value={mapping}
                    onValueChanged={(e) => {
                      const next = e as BrushMappingMode;
                      setMapping(next);
                      setValues(
                        Array(6).fill(
                          next === BrushMappingMode.Absolute ? 100 : 0.5,
                        ),
                      );
                    }}
                  >
                    {Object.values(BrushMappingMode).map((v) => (
                      <GalleryOption key={v}>{v}</GalleryOption>
                    ))}
                  </GalleryComboBox>
                </label>
                <div className="gradient-sliders">
                  {[
                    "Center.X",
                    "Center.Y",
                    "RadiusX",
                    "RadiusY",
                    "GradientOrigin.X",
                    "GradientOrigin.Y",
                  ].map((label, i) => (
                    <label className="field" key={label}>
                      {label}
                      <GallerySlider
                        aria-label={label}
                        
                        min="0"
                        max={maximum}
                        step={maximum / 50}
                        value={values[i]}
                        onValueChanged={(e) =>
                          setValues((previous) =>
                            previous.map((v, n) =>
                              n === i ? Number(e) : v,
                            ),
                          )
                        }
                      />
                    </label>
                  ))}
                </div>
                <label className="field">
                  SpreadMethod
                  <GalleryComboBox
                    aria-label="SpreadMethod"
                    value={spread}
                    onValueChanged={(e) =>
                      setSpread(e as GradientSpread)
                    }
                  >
                    {Object.values(GradientSpread).map((v) => (
                      <GalleryOption key={v}>{v}</GalleryOption>
                    ))}
                  </GalleryComboBox>
                </label>
              </aside>
            </div>
            <SampleCode name="radial-gradient" xaml={sample.xaml} />
          </div>
        </section>
        <section className="example" id="linear-gradient">
          <h2><LocalizedText>LinearGradientBrush</LocalizedText></h2>
          <div className="example-card">
            {/* @sample:linear-gradient:start */}
            <SceneView theme={theme} backend={backend} style={{ height: 224 }}>
              <Grid
                width={200}
                height={200}
                horizontalAlignment={HorizontalAlignment.Center}
                verticalAlignment={VerticalAlignment.Center}
                background={{
                  kind: GradientKind.Linear,
                  from: [0.5, 0],
                  to: [0.5, 1],
                  stops: [
                    { offset: 0, color: "#d3d3d3" },
                    { offset: 1, color: nativeDefaults.accentColor },
                  ],
                }}
              />
            </SceneView>
            {/* @sample:linear-gradient:end */}
            <SampleCode
              name="linear-gradient"
              xaml={
                official.catalog
                  .find((entry) => entry.name === "ImplicitTransition")!
                  .samples.find((sample) => sample.title.includes("Rotation"))!
                  .xaml
              }
            />
          </div>
        </section>
      </main>
    </>
  );
}

export function SystemBackdropsPage() {
  const [theme, setTheme] = useGalleryTheme();
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return (
    <>
      <Header
        title="System Backdrops (Mica/Acrylic)"
        theme={theme}
        onTheme={setTheme}
      />
      <main className="stage-main official-motion">
        
        <p><LocalizedText>
          <a href="#acrylic">可运行的应用内 Acrylic</a> ·{" "}
          <a href="#gradients">线性与径向渐变</a>
        </LocalizedText></p>
        {official.catalog
          .find((entry) => entry.name === "SystemBackdrops")!
          .samples.map((sample) => (
            <GalleryExpander className="source" key={sample.title}>
              <GalleryExpanderHeader>{sample.title} · 官方宿主调用</GalleryExpanderHeader>
              <SourceCode language="xaml">{sample.xaml}</SourceCode>
            </GalleryExpander>
          ))}
      </main>
    </>
  );
}
