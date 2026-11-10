import{Fn as e,Fr as t,J as n,O as r,Wt as i,a,cr as o,en as s,g as c,i as l,l as u,li as d,n as f,oi as p,pi as m,r as h,sn as g,v as _,wn as v,zn as y}from"./GalleryControls-jbXHT3zS.js";import{t as b}from"./SourceCode-C2xz3uBh.js";import{i as x,r as S}from"./ButtonPage-Cv9H35SX.js";var C=m(),w=`import { LocalizedText } from "./GalleryLanguage";
import { SourceCode } from './SourceCode';
import { GalleryCheckBox, GalleryComboBox, GalleryExpander, GalleryExpanderHeader, GalleryOption } from './GalleryControls';
import { useGalleryTheme } from './gallery-theme';
import { useEffect, useRef, useState } from "react";
import { SceneView, Grid, StackPanel, TextBlock, Button } from "winui-wasm/react";
import { Header } from "./ButtonPage";
import {
  ThemeMode,
  RendererBackend,
  HorizontalAlignment,
  VerticalAlignment,
  ButtonVariant,
  AnimationEasing,
  type Panel,
  type Animation,
  type AnimationOptions,
} from "winui-wasm";
import source from "./EffectsPage.tsx?raw";
import { extractSampleSource } from "./sample-source";

export function EffectsPage() {
  const [theme, setTheme] = useGalleryTheme();
  const [backend, setBackend] = useState(RendererBackend.Canvas2D);
  const [reducedMotion, setReducedMotion] = useState(
    matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [reducedTransparency, setReducedTransparency] = useState(
    matchMedia("(prefers-reduced-transparency: reduce)").matches,
  );
  const [output, setOutput] = useState("Ready");
  const panel = useRef<Panel | null>(null);
  const background = useRef<Panel | null>(null);
  const animation = useRef<Animation | null>(null);
  const backgroundAnimation = useRef<Animation | null>(null);
  const reverse = useRef(false);
  const moving = useRef(false);
  const scroll = useRef(0);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    return () => {
      moving.current = false;
    };
  }, [theme]);

  // @sample:effects-animation:start
  function play() {
    const target = panel.current;
    if (!target || target.isDisposed) return;
    reverse.current = !reverse.current;
    const running = target.animate(
      {
        translationX: reverse.current ? -160 : 0,
        opacity: reverse.current ? 0.72 : 1,
      },
      { duration: 600, easing: AnimationEasing.EaseOut },
    );
    animation.current = running;
    setOutput("Running — click again to reverse");
    void running.finished.then((result) => {
      if (!target.isDisposed && animation.current === running)
        setOutput(result);
    });
  }
  // @sample:effects-animation:end
  function moveBackground() {
    const target = background.current;
    if (!target || target.isDisposed) return;
    moving.current = !moving.current;
    if (!moving.current) {
      backgroundAnimation.current?.cancel();
      return;
    }
    let forward = true;
    const options: AnimationOptions = {
      duration: 2400,
      easing: AnimationEasing.Linear,
    };
    function next() {
      if (!moving.current || !target || target.isDisposed) return;
      backgroundAnimation.current = target.animate(
        { translationX: forward ? -400 : 0 },
        options,
      );
      forward = !forward;
      void backgroundAnimation.current.finished.then(() => {
        if (moving.current && !reducedMotion) next();
      });
    }
    next();
  }
  return (
    <>
      <Header title="Animation and Acrylic" theme={theme} onTheme={setTheme} />
      <main className="stage-main">
        
        <section className="example" id="effects-example">
          <h2><LocalizedText>Interruptible animation over an in-app backdrop</LocalizedText></h2>
          <div className="example-card">
            <div className="effects-options">
              <label>
                Renderer{" "}
                <GalleryComboBox
                  aria-label="Renderer"
                  value={backend}
                  onValueChanged={(e) => {
                    moving.current = false;
                    reverse.current = false;
                    setBackend(e as RendererBackend);
                  }}
                >
                  {Object.values(RendererBackend).map((v) => (
                    <GalleryOption key={v}>{v}</GalleryOption>
                  ))}
                </GalleryComboBox>
              </label>
              <GalleryCheckBox
                  
                  checked={reducedMotion}
                  onValueChanged={(e) => {
                    moving.current = false;
                    setReducedMotion(e);
                  }}  label={<>
                
                Reduce motion
              </>}/>
              <GalleryCheckBox
                  
                  checked={reducedTransparency}
                  onValueChanged={(e) => setReducedTransparency(e)}  label={<>
                
                Reduce transparency
              </>}/>
            </div>
            <div
              onWheel={(event) => {
                const target = background.current;
                if (!target || target.isDisposed) return;
                scroll.current = Math.max(
                  -100,
                  Math.min(0, scroll.current - event.deltaY * 0.2),
                );
                target.update({ translationY: scroll.current });
              }}
            >
              <SceneView
                backend={backend}
                theme={theme}
                reducedMotion={reducedMotion}
                reducedTransparency={reducedTransparency}
                style={{ height: 460 }}
              >
                <Grid clip={true}>
                  <Grid
                    width={1600}
                    height={560}
                    horizontalAlignment={HorizontalAlignment.Left}
                    verticalAlignment={VerticalAlignment.Top}
                    background="#31578b"
                    onReady={(value) => {
                      background.current = value;
                    }}
                  >
                    {[
                      "#df7467",
                      "#edbd59",
                      "#46a6a2",
                      "#6684cf",
                      "#bb73a9",
                    ].map((color, index) => (
                      <Grid
                        key={color}
                        width={260}
                        height={560}
                        margin={[index * 300, 0, 0, 0]}
                        horizontalAlignment={HorizontalAlignment.Left}
                        background={color}
                      >
                        <TextBlock
                          text={\`\${index + 1} · 背景\`}
                          fontSize={64}
                          foreground="#ffffff"
                          margin={[20, 220, 0, 0]}
                        />
                      </Grid>
                    ))}
                  </Grid>
                  <StackPanel
                    margin={[24, 20, 0, 0]}
                    horizontalAlignment={HorizontalAlignment.Left}
                    verticalAlignment={VerticalAlignment.Top}
                    spacing={12}
                  >
                    <TextBlock
                      text="Shared scene / 共享场景"
                      fontSize={24}
                      fontWeight={600}
                      foreground="#ffffff"
                    />
                    <Button
                      text="Move / pause background"
                      onClick={moveBackground}
                    />
                  </StackPanel>
                  {/* @sample:effects-acrylic:start */}
                  <Grid
                    width={360}
                    height={260}
                    margin={[320, 140, 0, 0]}
                    clip={true}
                    horizontalAlignment={HorizontalAlignment.Left}
                    verticalAlignment={VerticalAlignment.Top}
                    acrylic={{
                      tintColor:
                        theme === ThemeMode.Light ? "#ffffff" : "#202020",
                      tintOpacity: 0.2,
                      luminosityOpacity: 0.65,
                      fallbackColor:
                        theme === ThemeMode.Light ? "#f3f3f3" : "#202020",
                    }}
                    onReady={(value) => {
                      panel.current = value;
                    }}
                  >
                    <StackPanel padding={[24, 24, 24, 24]} spacing={16}>
                      <TextBlock
                        text="Acrylic / 应用内背景"
                        fontSize={22}
                        fontWeight={600}
                      />
                      <TextBlock
                        text="背景实时采样，前景文字和按钮保持清晰。"
                        wrap={true}
                      />
                      <Button
                        text="Play / reverse"
                        variant={ButtonVariant.Accent}
                        onClick={play}
                      />
                      <Button
                        text="Cancel animation"
                        onClick={() => animation.current?.cancel()}
                      />
                    </StackPanel>
                  </Grid>
                  {/* @sample:effects-acrylic:end */}
                </Grid>
              </SceneView>
            </div>
            <div className="output" aria-live="polite">
              Output: <code id="effects-output">{output}</code>
            </div>
            <GalleryExpander className="source">
              <GalleryExpanderHeader>Source code</GalleryExpanderHeader>
              <p className="source-hint"><LocalizedText>
                当前运行的动画调用；共享初始化沿用整个应用的 WinUIProvider。
              </LocalizedText></p>
              <SourceCode>{extractSampleSource(source, "effects-animation")}</SourceCode>
              <section>
                <h3><LocalizedText>Acrylic 面板与内容</LocalizedText></h3>
                <SourceCode>{extractSampleSource(source, "effects-acrylic")}</SourceCode>
              </section>
            </GalleryExpander>
          </div>
        </section>
        
      </main>
    </>
  );
}
`,T=v();function E(){let[m,v]=c(),[E,D]=(0,C.useState)(t.Canvas2D),[O,k]=(0,C.useState)(matchMedia(`(prefers-reduced-motion: reduce)`).matches),[A,j]=(0,C.useState)(matchMedia(`(prefers-reduced-transparency: reduce)`).matches),[M,N]=(0,C.useState)(`Ready`),P=(0,C.useRef)(null),F=(0,C.useRef)(null),I=(0,C.useRef)(null),L=(0,C.useRef)(null),R=(0,C.useRef)(!1),z=(0,C.useRef)(!1),B=(0,C.useRef)(0);(0,C.useEffect)(()=>(document.documentElement.dataset.theme=m,()=>{z.current=!1}),[m]);function V(){let t=P.current;if(!t||t.isDisposed)return;R.current=!R.current;let n=t.animate({translationX:R.current?-160:0,opacity:R.current?.72:1},{duration:600,easing:e.EaseOut});I.current=n,N(`Running — click again to reverse`),n.finished.then(e=>{!t.isDisposed&&I.current===n&&N(e)})}function H(){let t=F.current;if(!t||t.isDisposed)return;if(z.current=!z.current,!z.current){L.current?.cancel();return}let n=!0,r={duration:2400,easing:e.Linear};function i(){z.current&&t&&!t.isDisposed&&(L.current=t.animate({translationX:n?-400:0},r),n=!n,L.current.finished.then(()=>{z.current&&!O&&i()}))}i()}return(0,T.jsxs)(T.Fragment,{children:[(0,T.jsx)(S,{title:`Animation and Acrylic`,theme:m,onTheme:v}),(0,T.jsx)(`main`,{className:`stage-main`,children:(0,T.jsxs)(`section`,{className:`example`,id:`effects-example`,children:[(0,T.jsx)(`h2`,{children:(0,T.jsx)(_,{children:`Interruptible animation over an in-app backdrop`})}),(0,T.jsxs)(`div`,{className:`example-card`,children:[(0,T.jsxs)(`div`,{className:`effects-options`,children:[(0,T.jsxs)(`label`,{children:[`Renderer`,` `,(0,T.jsx)(h,{"aria-label":`Renderer`,value:E,onValueChanged:e=>{z.current=!1,R.current=!1,D(e)},children:Object.values(t).map(e=>(0,T.jsx)(u,{children:e},e))})]}),(0,T.jsx)(f,{checked:O,onValueChanged:e=>{z.current=!1,k(e)},label:(0,T.jsx)(T.Fragment,{children:`Reduce motion`})}),(0,T.jsx)(f,{checked:A,onValueChanged:e=>j(e),label:(0,T.jsx)(T.Fragment,{children:`Reduce transparency`})})]}),(0,T.jsx)(`div`,{onWheel:e=>{let t=F.current;t&&!t.isDisposed&&(B.current=Math.max(-100,Math.min(0,B.current-e.deltaY*.2)),t.update({translationY:B.current}))},children:(0,T.jsx)(i,{backend:E,theme:m,reducedMotion:O,reducedTransparency:A,style:{height:460},children:(0,T.jsxs)(n,{clip:!0,children:[(0,T.jsx)(n,{width:1600,height:560,horizontalAlignment:o.Left,verticalAlignment:d.Top,background:`#31578b`,onReady:e=>{F.current=e},children:[`#df7467`,`#edbd59`,`#46a6a2`,`#6684cf`,`#bb73a9`].map((e,t)=>(0,T.jsx)(n,{width:260,height:560,margin:[t*300,0,0,0],horizontalAlignment:o.Left,background:e,children:(0,T.jsx)(g,{text:`${t+1} · 背景`,fontSize:64,foreground:`#ffffff`,margin:[20,220,0,0]})},e))}),(0,T.jsxs)(s,{margin:[24,20,0,0],horizontalAlignment:o.Left,verticalAlignment:d.Top,spacing:12,children:[(0,T.jsx)(g,{text:`Shared scene / 共享场景`,fontSize:24,fontWeight:600,foreground:`#ffffff`}),(0,T.jsx)(r,{text:`Move / pause background`,onClick:H})]}),(0,T.jsx)(n,{width:360,height:260,margin:[320,140,0,0],clip:!0,horizontalAlignment:o.Left,verticalAlignment:d.Top,acrylic:{tintColor:m===p.Light?`#ffffff`:`#202020`,tintOpacity:.2,luminosityOpacity:.65,fallbackColor:m===p.Light?`#f3f3f3`:`#202020`},onReady:e=>{P.current=e},children:(0,T.jsxs)(s,{padding:[24,24,24,24],spacing:16,children:[(0,T.jsx)(g,{text:`Acrylic / 应用内背景`,fontSize:22,fontWeight:600}),(0,T.jsx)(g,{text:`背景实时采样，前景文字和按钮保持清晰。`,wrap:!0}),(0,T.jsx)(r,{text:`Play / reverse`,variant:y.Accent,onClick:V}),(0,T.jsx)(r,{text:`Cancel animation`,onClick:()=>I.current?.cancel()})]})})]})})}),(0,T.jsxs)(`div`,{className:`output`,"aria-live":`polite`,children:[`Output: `,(0,T.jsx)(`code`,{id:`effects-output`,children:M})]}),(0,T.jsxs)(l,{className:`source`,children:[(0,T.jsx)(a,{children:`Source code`}),(0,T.jsx)(`p`,{className:`source-hint`,children:(0,T.jsx)(_,{children:`当前运行的动画调用；共享初始化沿用整个应用的 WinUIProvider。`})}),(0,T.jsx)(b,{children:x(w,`effects-animation`)}),(0,T.jsxs)(`section`,{children:[(0,T.jsx)(`h3`,{children:(0,T.jsx)(_,{children:`Acrylic 面板与内容`})}),(0,T.jsx)(b,{children:x(w,`effects-acrylic`)})]})]})]})]})})]})}export{E as EffectsPage};