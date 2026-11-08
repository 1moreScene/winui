import { GalleryButton, GalleryCheckBox, GalleryComboBox, GalleryExpander, GalleryExpanderHeader, GalleryOption } from './GalleryControls';
import { useGalleryTheme } from './gallery-theme';
import { useEffect, useState, type ReactNode } from "react";
import { Header } from "./ButtonPage";
import { SceneView, FontIcon, SymbolIcon, PathIcon, BitmapIcon, ImageIcon, Button, StackPanel, TextBlock } from "./react";
import { ThemeMode, RendererBackend, Symbol, HorizontalAlignment, VerticalAlignment, type Scene } from "./index";
import official from "./official-icons.json";
import source from "./IconsPage.tsx?raw";
import { extractSampleSource } from "./sample-source";
declare global { interface Window { iconScenes: Record<string, Scene>; } }
function remember(name: string, scene: Scene) { window.iconScenes ??= {}; window.iconScenes[name] = scene; }
function Example({ index, name, children, options }: { index: number; name: string; children: ReactNode; options?: ReactNode }) {
  const [native, setNative] = useState(false);
  return <section id={name} className="example basic-example">
    <h2>{official.samples[index].title}</h2>
    <div className="example-card">
      <div className={`basic-live ${options ? "with-options" : ""}`}><div className="basic-preview">{children}</div>{options && <div className="options">{options}</div>}</div>
      <GalleryExpander className="source"><GalleryExpanderHeader>Source code</GalleryExpanderHeader><div className="source-tabs"><GalleryButton className={!native ? "active" : ""} onClick={() => setNative(false)}>TypeScript / React</GalleryButton><GalleryButton className={native ? "active" : ""} onClick={() => setNative(true)}>Official XAML</GalleryButton></div><pre><code>{native ? official.samples[index].xaml : extractSampleSource(source, name)}</code></pre></GalleryExpander>
    </div>
  </section>;
}
export function IconsPage() {
  const [theme, setTheme] = useGalleryTheme(), [backend, setBackend] = useState(RendererBackend.Canvas2D), [monochrome, setMonochrome] = useState(false), [output, setOutput] = useState("Ready");
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  const shared = { theme, backend, style: { height: 140 } };
  return <><Header title="IconElement" theme={theme} onTheme={setTheme} /><main className="stage-main official-motion">
    
    <div className="effects-options"><label>Renderer <GalleryComboBox aria-label="Renderer" value={backend} onValueChanged={e => setBackend(e as RendererBackend)}>{Object.values(RendererBackend).map(v => <GalleryOption key={v}>{v}</GalleryOption>)}</GalleryComboBox></label></div>
    <Example index={0} name="bitmap-icon" options={<GalleryCheckBox  checked={monochrome} onValueChanged={e => setMonochrome(e)}  label={<>Monochrome</>}/>}>
      <p>{official.bitmapDescription}</p>
      <SceneView {...shared} onReady={s => remember("bitmap-icon", s)}>
        {/* @sample:bitmap-icon:start */}
        <BitmapIcon uriSource="/official/Slices.png" width={50} showAsMonochrome={monochrome} horizontalAlignment={HorizontalAlignment.Left} verticalAlignment={VerticalAlignment.Center} accessibleName="Slices bitmap icon" />
        {/* @sample:bitmap-icon:end */}
      </SceneView>
    </Example>
    <Example index={1} name="font-icon"><SceneView {...shared} onReady={s => remember("font-icon", s)}>
      {/* @sample:font-icon:start */}
      <Button accessibleName="Font icon button" onClick={() => setOutput("FontIcon clicked")}><FontIcon fontFamily="Segoe MDL2 Assets" glyph={"\uE790"} /></Button>
      {/* @sample:font-icon:end */}
    </SceneView></Example>
    <Example index={2} name="image-icon"><SceneView {...shared} onReady={s => remember("image-icon", s)}>
      {/* @sample:image-icon:start */}
      <Button width={100} accessibleName="Image icon button" onClick={() => setOutput("ImageIcon clicked")}><ImageIcon source="/official/Slices.png" /></Button>
      {/* @sample:image-icon:end */}
    </SceneView></Example>
    <Example index={3} name="svg-icon"><SceneView {...shared} onReady={s => remember("svg-icon", s)}>
      {/* @sample:svg-icon:start */}
      <Button accessibleName="SVG icon button" onClick={() => setOutput("SVG ImageIcon clicked")}><ImageIcon source="/official/libre-camera-panorama.svg" width={50} /></Button>
      {/* @sample:svg-icon:end */}
    </SceneView></Example>
    <Example index={4} name="path-icon"><SceneView {...shared} onReady={s => remember("path-icon", s)}>
      {/* @sample:path-icon:start */}
      <Button accessibleName="Path icon button" onClick={() => setOutput("PathIcon clicked")}><PathIcon data="F1 M 16,12 20,2L 20,16 1,16" horizontalAlignment={HorizontalAlignment.Center} /></Button>
      {/* @sample:path-icon:end */}
    </SceneView></Example>
    <Example index={5} name="symbol-icon"><SceneView {...shared} onReady={s => remember("symbol-icon", s)}>
      {/* @sample:symbol-icon:start */}
      <Button accessibleName="Accept" onClick={() => setOutput("Accepted")}><StackPanel><SymbolIcon symbol={Symbol.Accept} /><TextBlock text="Accept" /></StackPanel></Button>
      {/* @sample:symbol-icon:end */}
    </SceneView></Example>
    <output aria-label="Icon output">{output}</output>
  </main></>;
}
