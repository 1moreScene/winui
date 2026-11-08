import { GalleryCheckBox, GalleryComboBox, GalleryExpander, GalleryExpanderHeader, GalleryOption } from './GalleryControls';
import { useGalleryTheme } from './gallery-theme';
import { useEffect, useRef, useState } from "react";
import { SceneView, Grid, StackPanel, TextBlock, Button } from "./react";
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
} from "./index";
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
          <h2>Interruptible animation over an in-app backdrop</h2>
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
                          text={`${index + 1} · 背景`}
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
              <p className="source-hint">
                当前运行的动画调用；共享初始化沿用整个应用的 WinUIProvider。
              </p>
              <pre>
                <code>{extractSampleSource(source, "effects-animation")}</code>
              </pre>
              <section>
                <h3>Acrylic 面板与内容</h3>
                <pre>
                  <code>{extractSampleSource(source, "effects-acrylic")}</code>
                </pre>
              </section>
            </GalleryExpander>
          </div>
        </section>
        
      </main>
    </>
  );
}
