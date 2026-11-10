import{Fr as e,H as t,J as n,M as r,O as i,Pn as a,Rn as o,Wt as s,Xn as c,Yn as l,a as u,ar as d,c as f,cr as p,f as m,g as h,i as g,l as _,li as v,n as y,oi as b,or as x,pi as S,r as C,sn as w,sr as T,t as E,u as D,v as O,wn as k}from"./GalleryControls-jbXHT3zS.js";import{t as A}from"./SourceCode-C2xz3uBh.js";import{i as j,r as M}from"./ButtonPage-Cv9H35SX.js";import{t as N}from"./official-motion-BV9xVfOI.js";var P=S(),F=`import { LocalizedText } from "./GalleryLanguage";
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
    <section className="example" id={\`acrylic-\${index}\`}>
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
                  aria-label={\`Tint opacity \${index}\`}
                  
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
                        >{\`#FF\${color.slice(1).toUpperCase()}\`}</GalleryOption>
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
                        >{\`#FF\${color.slice(1).toUpperCase()}\`}</GalleryOption>
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
            .replaceAll("$(TintColor)", \`#FF\${tint.slice(1).toUpperCase()}\`)
            .replaceAll(
              "$(FallbackColor)",
              \`#FF\${fallback.slice(1).toUpperCase()}\`,
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
    <section className="example" id={\`easing-\${index}\`}>
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
                accessibleName={\`Animate easing \${index}\`}
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
                    aria-label={\`Easing exponent \${index}\`}
                    
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
    <section className="example" id={\`property-transition-\${index}\`}>
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
                
                aria-label={\`\${name} target\`}
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
              Set {index < 2 ? name : \`custom \${name}\`}
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
  return <section className="example" id={\`property-transition-\${index}\`}><h2><LocalizedText>{sample.title}</LocalizedText></h2><div className="example-card"><div className="official-acrylic-row">
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
`,I={sdk:`WinUI 2.3.10-experimental`,accentColor:`#0078d4`,scalarMs:300,vectorMs:300,brushMs:150},L=k();function R({name:e,xaml:t}){let[n,r]=(0,P.useState)(!1);return(0,L.jsxs)(g,{className:`source`,children:[(0,L.jsx)(u,{children:`Source code`}),(0,L.jsxs)(`div`,{className:`source-tabs`,children:[(0,L.jsx)(E,{className:n?``:`active`,onClick:()=>r(!1),children:`TypeScript / React`}),(0,L.jsx)(E,{className:n?`active`:``,onClick:()=>r(!0),children:`Official XAML`})]}),(0,L.jsx)(A,{language:n?`xaml`:`tsx`,children:n?t:j(F,e)})]})}function z({index:e,theme:r,backend:i,windowWidth:a,reducedMotion:o,reducedTransparency:c}){let l=N.acrylic[e],[d,f]=(0,P.useState)(.8),[h,y]=(0,P.useState)(.8),[b,x]=(0,P.useState)(`#000000`),[S,w]=(0,P.useState)(`#008000`),E=a>=800?l.layouts.WiderLayout:a>=500?l.layouts.WideLayout:null,D=Math.max(l.minWidth,E?.Width??l.minWidth),k=E?.Height??E?.MinHeight??l.baseHeight,M=e===0?{acrylicResource:`AcrylicInAppFillColorDefaultBrush`}:{acrylic:{tintColor:e===1?b:`#87ceeb`,tintOpacity:d,luminosityOpacity:e===2?h:void 0,fallbackColor:e===1?S:`#87ceeb`}};return(0,L.jsxs)(`section`,{className:`example`,id:`acrylic-${e}`,children:[(0,L.jsx)(`h2`,{children:(0,L.jsx)(O,{children:l.title})}),(0,L.jsxs)(`div`,{className:`example-card`,children:[(0,L.jsxs)(`div`,{className:e?`official-acrylic-row`:`official-acrylic-default`,children:[(0,L.jsx)(`div`,{className:`official-acrylic-display`,children:(0,L.jsx)(s,{theme:r,backend:i,reducedMotion:o,reducedTransparency:c,style:{width:D,height:k},onReady:t=>{window.materialScenes??=[],window.materialScenes[e]=t},children:(0,L.jsxs)(n,{columns:l.columns.map(e=>e===`*`?{unit:T.Star,value:1}:{unit:T.Pixel,value:Number(e)}),children:[(0,L.jsx)(n,{children:l.shapes.map((e,r)=>{let i={width:e.width,height:e.height,background:e.fill,horizontalAlignment:p[e.horizontal],verticalAlignment:v[e.vertical]};return e.kind===`Ellipse`?(0,L.jsx)(t,{...i},r):(0,L.jsx)(n,{...i},r)})}),(0,L.jsx)(n,{margin:[12,12,12,12],...M})]})})}),e>0&&(0,L.jsxs)(`aside`,{className:`options acrylic-options`,children:[(0,L.jsxs)(`label`,{className:`field`,children:[`Tint Opacity :`,(0,L.jsx)(m,{"aria-label":`Tint opacity ${e}`,min:`0`,max:`1`,step:`0.001`,value:d,onValueChanged:e=>f(Number(e))})]}),e===1?(0,L.jsxs)(L.Fragment,{children:[(0,L.jsxs)(`label`,{className:`field`,children:[`Tint Color :`,(0,L.jsx)(C,{"aria-label":`Tint color`,value:b,onValueChanged:e=>x(e),children:[`#000000`,`#ff0000`,`#0000ff`].map(e=>(0,L.jsx)(_,{value:e,children:`#FF${e.slice(1).toUpperCase()}`},e))})]}),(0,L.jsxs)(`label`,{className:`field`,children:[`Fallback Color :`,(0,L.jsx)(C,{"aria-label":`Fallback color`,value:S,onValueChanged:e=>w(e),children:[`#008000`,`#ffff00`].map(e=>(0,L.jsx)(_,{value:e,children:`#FF${e.slice(1).toUpperCase()}`},e))})]})]}):(0,L.jsxs)(`label`,{className:`field`,children:[`Tint Luminosity Opacity :`,(0,L.jsx)(m,{"aria-label":`Tint luminosity`,min:`0`,max:`1`,step:`0.001`,value:h,onValueChanged:e=>y(Number(e))})]})]})]}),(0,L.jsx)(R,{name:`official-acrylic-options`,xaml:l.xaml.replaceAll(`$(OpacitySlider)`,String(d)).replaceAll(`$(TintLuminositySlider)`,String(h)).replaceAll(`$(TintColor)`,`#FF${b.slice(1).toUpperCase()}`).replaceAll(`$(FallbackColor)`,`#FF${S.slice(1).toUpperCase()}`)}),(0,L.jsxs)(g,{className:`source`,children:[(0,L.jsx)(u,{children:`背景与材质的组合代码`}),(0,L.jsx)(A,{children:j(F,`official-acrylic-scene`)})]})]})]})}function B(){let[t,n]=h(),[r,i]=(0,P.useState)(e.Canvas2D),[a,o]=(0,P.useState)(!1),[s,c]=(0,P.useState)(!1),[l,u]=(0,P.useState)(innerWidth);return(0,P.useEffect)(()=>{document.documentElement.dataset.theme=t},[t]),(0,P.useEffect)(()=>{let e=()=>u(innerWidth);return addEventListener(`resize`,e),()=>removeEventListener(`resize`,e)},[]),(0,L.jsxs)(L.Fragment,{children:[(0,L.jsx)(M,{title:`Acrylic`,theme:t,onTheme:n}),(0,L.jsxs)(`main`,{className:`stage-main official-motion`,children:[(0,L.jsxs)(`div`,{className:`effects-options material-policies`,children:[(0,L.jsxs)(`label`,{children:[`Renderer`,(0,L.jsx)(C,{"aria-label":`Renderer`,value:r,onValueChanged:e=>i(e),children:Object.values(e).map(e=>(0,L.jsx)(_,{children:e},e))})]}),(0,L.jsx)(y,{checked:a,onValueChanged:e=>o(e),label:(0,L.jsx)(L.Fragment,{children:`Reduce motion`})}),(0,L.jsx)(y,{checked:s,onValueChanged:e=>c(e),label:(0,L.jsx)(L.Fragment,{children:`Reduce transparency`})})]}),N.acrylic.map((e,n)=>(0,L.jsx)(z,{index:n,theme:t,backend:r,windowWidth:l,reducedMotion:a,reducedTransparency:s},e.name))]})]})}function V({index:e,theme:t}){let r=N.easing[e],a=(0,P.useRef)(null),[o,u]=(0,P.useState)(l.Back),[d,m]=(0,P.useState)(c.EaseOut),[h,g]=(0,P.useState)(r.exponent??2),y={duration:r.duration,easingFunction:e===0?l.Circle:e<3?l.Exponential:o,easingMode:e===0?c.EaseInOut:e===1?c.EaseIn:e===2?c.EaseOut:d,easingParameters:{exponent:h}};function b(){let e=a.current;if(!e||e.isDisposed)return;let t=e.snapshot.presentation.translationX;e.animate({translationX:t>0?0:200},y)}return(0,L.jsxs)(`section`,{className:`example`,id:`easing-${e}`,children:[(0,L.jsx)(`h2`,{children:(0,L.jsx)(O,{children:r.title})}),(0,L.jsxs)(`div`,{className:`example-card`,children:[(0,L.jsxs)(`div`,{className:e?`easing-live with-options`:`easing-live`,children:[(0,L.jsx)(s,{theme:t,style:{height:74},children:(0,L.jsxs)(n,{padding:[12,12,12,12],columns:[{unit:T.Auto},{unit:T.Star}],children:[(0,L.jsx)(i,{text:`Animate`,accessibleName:`Animate easing ${e}`,onClick:b}),(0,L.jsx)(n,{column:1,width:50,height:50,horizontalAlignment:p.Center,verticalAlignment:v.Center,background:I.accentColor,onReady:e=>{a.current=e}})]})}),e>0&&(0,L.jsx)(`aside`,{className:`options`,children:e<3?(0,L.jsxs)(`label`,{className:`field`,children:[`Exponent`,(0,L.jsx)(f,{"aria-label":`Easing exponent ${e}`,step:`0.1`,value:h,onValueChanged:e=>{let t=e;Number.isFinite(t)&&Math.abs(t)<=50&&g(t)}})]}):(0,L.jsxs)(L.Fragment,{children:[(0,L.jsxs)(`label`,{className:`field`,children:[`Easing type`,(0,L.jsx)(C,{"aria-label":`Easing type`,value:o,onValueChanged:e=>u(e),children:Object.values(l).map(e=>(0,L.jsxs)(_,{value:e,children:[e,`Ease`]},e))})]}),Object.values(c).map(e=>(0,L.jsx)(D,{name:`easing-mode`,value:e,checked:d===e,onValueChanged:()=>m(e),className:`check-option`,label:(0,L.jsx)(L.Fragment,{children:e})},e))]})})]}),(0,L.jsx)(R,{name:`official-easing-call`,xaml:r.xaml})]})]})}function H(){let[e,t]=h();return(0,P.useEffect)(()=>{document.documentElement.dataset.theme=e},[e]),(0,L.jsxs)(L.Fragment,{children:[(0,L.jsx)(M,{title:`Easing Functions`,theme:e,onTheme:t}),(0,L.jsx)(`main`,{className:`stage-main official-motion`,children:N.easing.map((t,n)=>(0,L.jsx)(V,{index:n,theme:e},t.title))})]})}function U({index:e,theme:t}){let r=(0,P.useRef)(null),[i,o]=(0,P.useState)([.5,45,1,1][e]),[c,l]=(0,P.useState)([!0,!0]),u=[`Opacity`,`Rotation`,`Scale`,`Translation`][e],m=N.catalog.find(e=>e.name===`ImplicitTransition`).samples.find(e=>e.title.toLowerCase().includes(u.toLowerCase()));function h(t){let n=r.current;if(!n||n.isDisposed)return;let i=e===0?{opacity:t}:e===1?{rotation:t}:e===2?{scaleX:t,scaleY:t}:{translationX:t,translationY:t},a=Object.fromEntries(Object.keys(i).filter((t,n)=>e<2||c[n]).map(e=>[e,I.scalarMs]));n.update({motion:{implicit:a},...i})}return(0,L.jsxs)(`section`,{className:`example`,id:`property-transition-${e}`,children:[(0,L.jsx)(`h2`,{children:(0,L.jsx)(O,{children:m.title})}),(0,L.jsxs)(`div`,{className:`example-card`,children:[(0,L.jsxs)(`div`,{className:`official-acrylic-row`,children:[(0,L.jsx)(s,{theme:t,style:{height:`100%`,minHeight:e<2?84:e===2?350:380},onReady:t=>{window.propertyScenes??=[],window.propertyScenes[e]=t},children:(0,L.jsx)(n,{padding:[12,12,12,12],children:(0,L.jsx)(n,{width:50,height:50,margin:[45,5,5,5],horizontalAlignment:p.Left,verticalAlignment:e<2?v.Center:v.Top,motion:{implicit:{[e===0?a.Opacity:e===1?a.Rotation:a.ScaleX]:I.scalarMs}},opacity:e===0?.5:1,centerPoint:e===1?[25,25]:[0,0],background:e===1?{kind:d.Linear,from:[.5,0],to:[.5,1],stops:[{offset:0,color:`#d3d3d3`},{offset:1,color:I.accentColor}]}:I.accentColor,onReady:e=>{r.current=e}})})}),(0,L.jsxs)(`aside`,{className:`options`,children:[e>=2&&(0,L.jsxs)(L.Fragment,{children:[(e===2?[.5,1,2]:[0,100,200]).map(e=>(0,L.jsxs)(E,{className:`transition-action`,onClick:()=>h(e),children:[`Set `,u,` to (`,e,`, `,e,`)`]},e)),(0,L.jsx)(`p`,{children:(0,L.jsx)(O,{children:`Components (X/Y)`})}),[`X`,`Y`].map((e,t)=>(0,L.jsx)(y,{checked:c[t],onValueChanged:e=>l(n=>n.map((n,r)=>r===t?e:n)),className:`check-option`,label:(0,L.jsxs)(L.Fragment,{children:[`Animate `,e]})},e))]}),(0,L.jsxs)(`label`,{className:`field`,children:[u,(0,L.jsx)(f,{"aria-label":`${u} target`,min:`0`,max:[1,360,5,200][e],step:e===0?.1:1,value:i,onValueChanged:t=>{let n=t;Number.isFinite(n)&&n>=0&&n<=[1,360,5,200][e]&&(o(n),h(n))}})]}),(0,L.jsxs)(E,{className:`transition-action`,onClick:()=>h(i),children:[`Set `,e<2?u:`custom ${u}`]})]})]}),(0,L.jsx)(R,{name:`property-transition`,xaml:m.xaml})]})]})}function W({theme:e,index:t}){let[a,o]=(0,P.useState)(!0),[c,l]=(0,P.useState)(b.Light),u=N.catalog.find(e=>e.name===`ImplicitTransition`).samples[t];return(0,L.jsxs)(`section`,{className:`example`,id:`property-transition-${t}`,children:[(0,L.jsx)(`h2`,{children:(0,L.jsx)(O,{children:u.title})}),(0,L.jsxs)(`div`,{className:`example-card`,children:[(0,L.jsxs)(`div`,{className:`official-acrylic-row`,children:[(0,L.jsx)(s,{theme:e,style:{height:t===4?110:240},onReady:e=>{window.propertyScenes??=[],window.propertyScenes[t]=e},children:(0,L.jsx)(n,{width:t===4?50:440,height:t===4?50:216,horizontalAlignment:p.Center,verticalAlignment:v.Center,theme:t===5?c:void 0,background:t===4?a?`#0000ff`:`#ffff00`:{resource:`SolidBackgroundFillColorBaseBrush`},motion:{backgroundDuration:150},children:t===5&&(0,L.jsxs)(n,{padding:[12,12,12,12],children:[(0,L.jsx)(w,{text:`Lorem Ipsum`,fontSize:24}),(0,L.jsx)(w,{text:`The background of this grid animates when the theme changes.`,margin:[0,42,0,0],wrap:!0}),(0,L.jsx)(i,{text:`Action`,width:90,height:32,margin:[0,95,0,0],horizontalAlignment:p.Left,verticalAlignment:v.Top}),(0,L.jsx)(r,{text:`Option`,margin:[0,140,0,0],horizontalAlignment:p.Left,verticalAlignment:v.Top})]})})}),(0,L.jsx)(`aside`,{className:`options`,children:(0,L.jsx)(E,{onClick:()=>t===4?o(!a):l(c===b.Light?b.Dark:b.Light),children:t===4?`Change color`:`Change local theme`})})]}),(0,L.jsx)(R,{name:`background-transition`,xaml:u.xaml})]})]})}function G(){let[e,t]=h();return(0,P.useEffect)(()=>{document.documentElement.dataset.theme=e},[e]),(0,L.jsxs)(L.Fragment,{children:[(0,L.jsx)(M,{title:`Property transitions`,theme:e,onTheme:t}),(0,L.jsxs)(`main`,{className:`stage-main official-motion`,children:[[0,1,2,3].map(t=>(0,L.jsx)(U,{index:t,theme:e},t)),[4,5].map(t=>(0,L.jsx)(W,{index:t,theme:e},t))]})]})}function K(){let[t,r]=h(),[i,a]=(0,P.useState)(e.Canvas2D),[c,l]=(0,P.useState)(o.RelativeToBoundingBox),[u,f]=(0,P.useState)(x.Pad),[g,y]=(0,P.useState)([.5,.5,.5,.5,.5,.5]);(0,P.useEffect)(()=>{document.documentElement.dataset.theme=t},[t]);let b=N.catalog.find(e=>e.name===`RadialGradientBrush`).samples[0],S=c===o.Absolute?200:1;return(0,L.jsxs)(L.Fragment,{children:[(0,L.jsx)(M,{title:`RadialGradientBrush`,theme:t,onTheme:r}),(0,L.jsxs)(`main`,{className:`stage-main official-motion`,children:[(0,L.jsxs)(`section`,{className:`example`,id:`radial-gradient`,children:[(0,L.jsx)(`h2`,{children:(0,L.jsx)(O,{children:b.title})}),(0,L.jsxs)(`div`,{className:`example-card`,children:[(0,L.jsxs)(`div`,{className:`official-acrylic-row`,children:[(0,L.jsx)(s,{theme:t,backend:i,style:{height:`100%`,minHeight:224},children:(0,L.jsx)(n,{width:200,height:200,horizontalAlignment:p.Center,verticalAlignment:v.Center,background:{kind:d.Radial,mappingMode:c,spreadMethod:u,center:[g[0],g[1]],radius:[g[2],g[3]],origin:[g[4],g[5]],stops:[{offset:0,color:`#ffff00`},{offset:1,color:`#0000ff`}]}})}),(0,L.jsxs)(`aside`,{className:`options`,children:[(0,L.jsxs)(`label`,{className:`field`,children:[`Renderer`,(0,L.jsx)(C,{"aria-label":`Gradient renderer`,value:i,onValueChanged:e=>a(e),children:Object.values(e).map(e=>(0,L.jsx)(_,{children:e},e))})]}),(0,L.jsxs)(`label`,{className:`field`,children:[`MappingMode`,(0,L.jsx)(C,{"aria-label":`MappingMode`,value:c,onValueChanged:e=>{let t=e;l(t),y([,,,,,,].fill(t===o.Absolute?100:.5))},children:Object.values(o).map(e=>(0,L.jsx)(_,{children:e},e))})]}),(0,L.jsx)(`div`,{className:`gradient-sliders`,children:[`Center.X`,`Center.Y`,`RadiusX`,`RadiusY`,`GradientOrigin.X`,`GradientOrigin.Y`].map((e,t)=>(0,L.jsxs)(`label`,{className:`field`,children:[e,(0,L.jsx)(m,{"aria-label":e,min:`0`,max:S,step:S/50,value:g[t],onValueChanged:e=>y(n=>n.map((n,r)=>r===t?Number(e):n))})]},e))}),(0,L.jsxs)(`label`,{className:`field`,children:[`SpreadMethod`,(0,L.jsx)(C,{"aria-label":`SpreadMethod`,value:u,onValueChanged:e=>f(e),children:Object.values(x).map(e=>(0,L.jsx)(_,{children:e},e))})]})]})]}),(0,L.jsx)(R,{name:`radial-gradient`,xaml:b.xaml})]})]}),(0,L.jsxs)(`section`,{className:`example`,id:`linear-gradient`,children:[(0,L.jsx)(`h2`,{children:(0,L.jsx)(O,{children:`LinearGradientBrush`})}),(0,L.jsxs)(`div`,{className:`example-card`,children:[(0,L.jsx)(s,{theme:t,backend:i,style:{height:224},children:(0,L.jsx)(n,{width:200,height:200,horizontalAlignment:p.Center,verticalAlignment:v.Center,background:{kind:d.Linear,from:[.5,0],to:[.5,1],stops:[{offset:0,color:`#d3d3d3`},{offset:1,color:I.accentColor}]}})}),(0,L.jsx)(R,{name:`linear-gradient`,xaml:N.catalog.find(e=>e.name===`ImplicitTransition`).samples.find(e=>e.title.includes(`Rotation`)).xaml})]})]})]})]})}function q(){let[e,t]=h();return(0,P.useEffect)(()=>{document.documentElement.dataset.theme=e},[e]),(0,L.jsxs)(L.Fragment,{children:[(0,L.jsx)(M,{title:`System Backdrops (Mica/Acrylic)`,theme:e,onTheme:t}),(0,L.jsxs)(`main`,{className:`stage-main official-motion`,children:[(0,L.jsx)(`p`,{children:(0,L.jsxs)(O,{children:[(0,L.jsx)(`a`,{href:`#acrylic`,children:`可运行的应用内 Acrylic`}),` ·`,` `,(0,L.jsx)(`a`,{href:`#gradients`,children:`线性与径向渐变`})]})}),N.catalog.find(e=>e.name===`SystemBackdrops`).samples.map(e=>(0,L.jsxs)(g,{className:`source`,children:[(0,L.jsxs)(u,{children:[e.title,` · 官方宿主调用`]}),(0,L.jsx)(A,{language:`xaml`,children:e.xaml})]},e.title))]})]})}export{B as AcrylicPage,H as EasingPage,K as GradientPage,G as PropertyTransitionsPage,q as SystemBackdropsPage};