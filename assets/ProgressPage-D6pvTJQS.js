import{At as e,Fr as t,Mt as n,Wt as r,a as i,c as a,cr as o,g as s,hn as c,i as l,jt as u,l as d,li as f,n as p,pi as m,r as h,t as g,v as _,wn as v}from"./GalleryControls-jbXHT3zS.js";import{t as y}from"./SourceCode-C2xz3uBh.js";import{i as b,r as x}from"./ButtonPage-Cv9H35SX.js";var S=m(),C={galleryCommit:`7360ac322414e118eadfb0c7c2f4ecc31a218f59`,controls:{ProgressBar:{description:`The ProgressBar has two different visual representations:
Indeterminate - shows that a task is ongoing, but doesn't block user interaction.
Determinate - shows how much progress has been made on a known amount of work.`,samples:[{title:`An indeterminate progress bar.`,file:`IndeterminateProgressBar.txt`,xaml:`<ProgressBar Width="130" IsIndeterminate="True" />`},{title:`A determinate progress bar.`,file:`DeterminateProgressBar.txt`,xaml:`<ProgressBar Width="130" />`}]},ProgressRing:{description:`The ProgressRing has two different visual representations:
Indeterminate - shows that a task is ongoing, but blocks user interaction.
Determinate - shows how much progress has been made on a known amount of work.`,samples:[{title:`An indeterminate progress ring.`,file:`IndeterminateProgressRing.txt`,xaml:`<ProgressRing IsActive="True" Background="LightGray"/>`},{title:`A determinate progress ring.`,file:`DeterminateProgressRing.txt`,xaml:`<ProgressRing Width="60" Height="60"
              IsIndeterminate="False"
              Background="LightGray"/>`}]}},sources:[{path:`references/gallery-input/ProgressBar/DeterminateProgressBar.txt`,source:`WinUIGallery/Samples/ProgressBar/DeterminateProgressBar.txt`,sha256:`8fb6ca689d99f926a5fd15365827ad93c51e53102a9bb46aee155cbd8cc57dec`},{path:`references/gallery-input/ProgressBar/IndeterminateProgressBar.txt`,source:`WinUIGallery/Samples/ProgressBar/IndeterminateProgressBar.txt`,sha256:`97943ced609d2b2b39e6bd48f9f82fd3b046d0d9c1169cbc9164b38d41e0bc88`},{path:`references/gallery-input/ProgressBar/ProgressBarPage.xaml`,source:`WinUIGallery/Samples/ProgressBar/ProgressBarPage.xaml`,sha256:`ced3307341a830f5a960c6a6ac990a8e3b9035a3814271f445e4785b62d458ab`},{path:`references/gallery-input/ProgressBar/ProgressBarPage.xaml.cs`,source:`WinUIGallery/Samples/ProgressBar/ProgressBarPage.xaml.cs`,sha256:`f6f8b3b36e8e903a2de01e2ae90819799e93bc83b908c1a93ad5599ef068ba70`},{path:`references/gallery-input/ProgressRing/DeterminateProgressRing.txt`,source:`WinUIGallery/Samples/ProgressRing/DeterminateProgressRing.txt`,sha256:`853eaf9110054fdbe686d8042d684ab2e991ec60a6780b2a16ea1a889ff80608`},{path:`references/gallery-input/ProgressRing/IndeterminateProgressRing.txt`,source:`WinUIGallery/Samples/ProgressRing/IndeterminateProgressRing.txt`,sha256:`9c4f1fd055773c4edf613c6a92e62151c16c8202521fa0f1871904755484aca4`},{path:`references/gallery-input/ProgressRing/ProgressRingPage.xaml`,source:`WinUIGallery/Samples/ProgressRing/ProgressRingPage.xaml`,sha256:`e8de449dddb972f7c43681c51168b34908543eb41e73aeba0c59e4e5f2a54ac7`},{path:`references/gallery-input/ProgressRing/ProgressRingPage.xaml.cs`,source:`WinUIGallery/Samples/ProgressRing/ProgressRingPage.xaml.cs`,sha256:`833ac910bf048b9c156e5094f61085ba31141c81f3dfa7daa1c7ef90113e81d4`}]},w=`import { LocalizedText } from "./GalleryLanguage";
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
`,T=v();function E(e,t){window.progressScenes??={},window.progressScenes[e]=t}function D({page:e,index:t,name:n,children:r,options:a}){let[o,s]=(0,S.useState)(!1),c=C.controls[e].samples[t];return(0,T.jsxs)(`section`,{className:`example basic-example`,id:n,children:[(0,T.jsx)(`h2`,{children:(0,T.jsx)(_,{children:c.title})}),(0,T.jsxs)(`div`,{className:`example-card`,children:[(0,T.jsxs)(`div`,{className:a?`basic-live with-options`:`basic-live`,children:[(0,T.jsx)(`div`,{className:`basic-preview`,children:r}),a&&(0,T.jsx)(`div`,{className:`options`,children:a})]}),(0,T.jsxs)(l,{className:`source`,children:[(0,T.jsx)(i,{children:`Source code`}),(0,T.jsxs)(`div`,{className:`source-tabs`,children:[(0,T.jsx)(g,{className:o?``:`active`,onClick:()=>s(!1),children:`TypeScript / React`}),(0,T.jsx)(g,{className:o?`active`:``,onClick:()=>s(!0),children:`Official XAML`})]}),(0,T.jsx)(y,{language:o?`xaml`:`tsx`,children:o?c.xaml:b(w,n)})]})]})]})}function O({page:i}){let[l,m]=s(),[g,_]=(0,S.useState)(t.Canvas2D),[v,y]=(0,S.useState)(!0),[b,C]=(0,S.useState)(0),[w,O]=(0,S.useState)(0),[k,A]=(0,S.useState)(0),[j,M]=(0,S.useState)(`#ffffff00`),[N,P]=(0,S.useState)(`#ffffff00`),[F,I]=(0,S.useState)(matchMedia(`(prefers-reduced-motion: reduce)`).matches);(0,S.useEffect)(()=>{document.documentElement.dataset.theme=l},[l]);let L={theme:l,backend:g,reducedMotion:F},R=(e,t)=>(0,T.jsxs)(`label`,{children:[`Background color`,` `,(0,T.jsxs)(h,{"aria-label":`Background color`,value:e,onValueChanged:e=>t(e),children:[(0,T.jsx)(d,{value:`#ffffff00`,children:`Transparent`}),(0,T.jsx)(d,{value:`#d3d3d3`,children:`LightGray`})]})]});return(0,T.jsxs)(T.Fragment,{children:[(0,T.jsx)(x,{title:i,theme:l,onTheme:m}),(0,T.jsxs)(`main`,{className:`stage-main official-motion`,children:[(0,T.jsxs)(`div`,{className:`effects-options material-policies`,children:[(0,T.jsxs)(`label`,{children:[`Renderer`,` `,(0,T.jsx)(h,{"aria-label":`Progress renderer`,value:g,onValueChanged:e=>_(e),children:Object.values(t).map(e=>(0,T.jsx)(d,{children:e},e))})]}),(0,T.jsx)(p,{checked:F,onValueChanged:e=>I(e),label:(0,T.jsxs)(T.Fragment,{children:[` `,`Reduced motion`]})})]}),i===`ProgressBar`?(0,T.jsxs)(T.Fragment,{children:[(0,T.jsx)(D,{page:i,index:0,name:`bar-indeterminate`,options:(0,T.jsx)(r,{...L,autoHeight:!0,onReady:e=>E(`bar-options`,e),children:(0,T.jsx)(n,{header:`Progress state`,items:[`Running`,`Paused`,`Error`],selectedIndex:b,onSelectionChanged:e=>C(e.selectedIndex??0)})}),children:(0,T.jsx)(r,{...L,style:{height:100},onReady:e=>E(`bar-indeterminate`,e),children:(0,T.jsx)(e,{width:130,margin:[10,10,0,0],verticalAlignment:f.Top,isIndeterminate:!0,showPaused:b===1,showError:b===2,accessibleName:`Indeterminate progress example`})})}),(0,T.jsxs)(D,{page:i,index:1,name:`bar-determinate`,children:[(0,T.jsx)(r,{...L,style:{height:52},onReady:e=>E(`bar-determinate`,e),children:(0,T.jsx)(e,{width:130,horizontalAlignment:o.Left,value:w,accessibleName:`Determinate progress example`})}),(0,T.jsxs)(`label`,{children:[`Progress`,` `,(0,T.jsx)(a,{"aria-label":`Bar progress`,min:0,max:100,value:w,onValueChanged:e=>{let t=e;Number.isFinite(t)&&O(Math.max(0,Math.min(100,t)))}})]}),(0,T.jsxs)(`output`,{"aria-live":`polite`,children:[w,`%`]})]})]}):(0,T.jsxs)(T.Fragment,{children:[(0,T.jsx)(D,{page:i,index:0,name:`ring-indeterminate`,options:(0,T.jsxs)(T.Fragment,{children:[(0,T.jsx)(r,{...L,autoHeight:!0,onReady:e=>E(`ring-options`,e),children:(0,T.jsx)(c,{header:`Progress Options`,isOn:v,onContent:`Working`,offContent:`Do work`,onToggled:e=>y(e.isOn??!1),accessibleName:`Progress Options`})}),R(j,M)]}),children:(0,T.jsx)(r,{...L,style:{height:100},onReady:e=>E(`ring-indeterminate`,e),children:(0,T.jsx)(u,{width:60,height:60,margin:[10,10,0,0],verticalAlignment:f.Top,isActive:v,background:j,accessibleName:`Progress image`})})}),(0,T.jsxs)(D,{page:i,index:1,name:`ring-determinate`,options:R(N,P),children:[(0,T.jsx)(r,{...L,style:{height:80},onReady:e=>E(`ring-determinate`,e),children:(0,T.jsx)(u,{width:60,height:60,horizontalAlignment:o.Left,isIndeterminate:!1,value:k,background:N,accessibleName:`Determinate progress image`})}),(0,T.jsxs)(`label`,{children:[`Progress`,` `,(0,T.jsx)(a,{"aria-label":`Ring progress`,min:0,max:100,value:k,onValueChanged:e=>{let t=e;Number.isFinite(t)&&A(Math.max(0,Math.min(100,t)))}})]})]})]})]})]})}export{O as ProgressPage};