import{Fr as e,K as t,Kr as n,O as r,Q as i,T as a,Wt as o,a as s,cr as c,en as l,g as u,i as d,l as f,li as p,n as m,pi as h,r as g,rn as _,sn as v,t as y,v as b,wn as x,wt as S}from"./GalleryControls-jbXHT3zS.js";import{t as C}from"./SourceCode-C2xz3uBh.js";import{i as w,r as T}from"./ButtonPage-Cv9H35SX.js";var E=h(),D={description:`Represents icon controls that use different image types as its content.`,bitmapDescription:`The ShowAsMonochrome property (true by default) will result in a solid block of the foreground color if the property is set to true and the icon is more than one color. This behavior can be ignored by setting the ShowAsMonochrome property to false.`,samples:[{title:`A BitmapIcon with a multicolor bitmap image`,xaml:`<BitmapIcon x:Name="SlicesIcon" UriSource="ms-appx:///Assets/SampleMedia/Slices.png" Width="50"/>`},{title:`A FontIcon using a glyph from a specific font family in a button`,xaml:`<Button Name="ExampleButton1">
    <FontIcon FontFamily="Segoe MDL2 Assets" Glyph="&#xE790;"/>
</Button>`},{title:`A ImageIcon using a bitmap image in a button`,xaml:`<Button Name="ImageExample1" Width="100">
    <ImageIcon Source="/Assets/SampleMedia/slices.png"/>
</Button>`},{title:`A ImageIcon using a SVG image in a button`,xaml:`<Button Name="ImageExample2">
    <ImageIcon Source="https://raw.githubusercontent.com/DiemenDesign/LibreICONS/master/svg-color/libre-camera-panorama.svg" Width="50"/>
</Button>`},{title:`A PathIcon in a button`,xaml:`<Button Name="Example1Button">
    <PathIcon Data="F1 M 16,12 20,2L 20,16 1,16" HorizontalAlignment="Center"/>
</Button>`},{title:`A SymbolIcon in a button`,xaml:`<Button Name="AcceptButton">
    <StackPanel>
        <SymbolIcon Symbol="Accept"/>
        <TextBlock Text="Accept"/>
    </StackPanel>
</Button>`}],sources:[{path:`references/gallery-input/IconElement/IconElementBitmapiconMulticolorBitmapImage.txt`,sha256:`20b6b3f3df8e3a52df8740d0a29bab5d93f0d04d7c4cb50856cf3afe94f6d33b`},{path:`references/gallery-input/IconElement/IconElementFonticonGlyphSpecificFont.txt`,sha256:`5ca45e15e94d4a7756ab5b2e1493d7de7712ac1aa2c22815e86677929ed4f218`},{path:`references/gallery-input/IconElement/IconElementImageiconBitmapImageButton.txt`,sha256:`3f705ec33f4c88e50355d2469b71f31e5cd53119d59a1b5ddbe84fd27c418d42`},{path:`references/gallery-input/IconElement/IconElementImageiconSvgImageButton.txt`,sha256:`e3e2449bf978efec03f340d478cff042da1d9ac9a8931740ffa32228dd274457`},{path:`references/gallery-input/IconElement/IconElementPage.xaml`,sha256:`b0243c3c917cda5218614fe2791f45cf78dc9043769c66d421855a475054f2ba`},{path:`references/gallery-input/IconElement/IconElementPage.xaml.cs`,sha256:`28e6e3ee77ae90c56f6d7de1d7e9e7c4392f2eea7235b9171ca75a5eef47cc9b`},{path:`references/gallery-input/IconElement/IconElementPathiconButton.txt`,sha256:`2de9d0be675699f986818ccb7d018429aa2da1e3b904be5bc9ebce900424de3e`},{path:`references/gallery-input/IconElement/IconElementSymboliconButton.txt`,sha256:`01f516951a4df9d101e20bbff80d435ee859b96620a8934f408b7a021fb653a0`}]},O=`import { LocalizedText } from "./GalleryLanguage";
import { SourceCode } from './SourceCode';
import { GalleryButton, GalleryCheckBox, GalleryComboBox, GalleryExpander, GalleryExpanderHeader, GalleryOption } from './GalleryControls';
import { useGalleryTheme } from './gallery-theme';
import { useEffect, useState, type ReactNode } from "react";
import { Header } from "./ButtonPage";
import { SceneView, FontIcon, SymbolIcon, PathIcon, BitmapIcon, ImageIcon, Button, StackPanel, TextBlock } from "winui-wasm/react";
import { ThemeMode, RendererBackend, Symbol, HorizontalAlignment, VerticalAlignment, type Scene } from "winui-wasm";
import official from "./official-icons.json";
import source from "./IconsPage.tsx?raw";
import { extractSampleSource } from "./sample-source";
declare global { interface Window { iconScenes: Record<string, Scene>; } }
function remember(name: string, scene: Scene) { window.iconScenes ??= {}; window.iconScenes[name] = scene; }
function Example({ index, name, children, options }: { index: number; name: string; children: ReactNode; options?: ReactNode }) {
  const [native, setNative] = useState(false);
  return <section id={name} className="example basic-example">
    <h2><LocalizedText>{official.samples[index].title}</LocalizedText></h2>
    <div className="example-card">
      <div className={\`basic-live \${options ? "with-options" : ""}\`}><div className="basic-preview">{children}</div>{options && <div className="options">{options}</div>}</div>
      <GalleryExpander className="source"><GalleryExpanderHeader>Source code</GalleryExpanderHeader><div className="source-tabs"><GalleryButton className={!native ? "active" : ""} onClick={() => setNative(false)}>TypeScript / React</GalleryButton><GalleryButton className={native ? "active" : ""} onClick={() => setNative(true)}>Official XAML</GalleryButton></div><SourceCode language={native ? 'xaml' : 'tsx'}>{native ? official.samples[index].xaml : extractSampleSource(source, name)}</SourceCode></GalleryExpander>
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
      <p><LocalizedText>{official.bitmapDescription}</LocalizedText></p>
      <SceneView {...shared} onReady={s => remember("bitmap-icon", s)}>
        {/* @sample:bitmap-icon:start */}
        <BitmapIcon uriSource="/official/Slices.png" width={50} showAsMonochrome={monochrome} horizontalAlignment={HorizontalAlignment.Left} verticalAlignment={VerticalAlignment.Center} accessibleName="Slices bitmap icon" />
        {/* @sample:bitmap-icon:end */}
      </SceneView>
    </Example>
    <Example index={1} name="font-icon"><SceneView {...shared} onReady={s => remember("font-icon", s)}>
      {/* @sample:font-icon:start */}
      <Button accessibleName="Font icon button" onClick={() => setOutput("FontIcon clicked")}><FontIcon fontFamily="Segoe MDL2 Assets" glyph={"\\uE790"} /></Button>
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
`,k=x();function A(e,t){window.iconScenes??={},window.iconScenes[e]=t}function j({index:e,name:t,children:n,options:r}){let[i,a]=(0,E.useState)(!1);return(0,k.jsxs)(`section`,{id:t,className:`example basic-example`,children:[(0,k.jsx)(`h2`,{children:(0,k.jsx)(b,{children:D.samples[e].title})}),(0,k.jsxs)(`div`,{className:`example-card`,children:[(0,k.jsxs)(`div`,{className:`basic-live ${r?`with-options`:``}`,children:[(0,k.jsx)(`div`,{className:`basic-preview`,children:n}),r&&(0,k.jsx)(`div`,{className:`options`,children:r})]}),(0,k.jsxs)(d,{className:`source`,children:[(0,k.jsx)(s,{children:`Source code`}),(0,k.jsxs)(`div`,{className:`source-tabs`,children:[(0,k.jsx)(y,{className:i?``:`active`,onClick:()=>a(!1),children:`TypeScript / React`}),(0,k.jsx)(y,{className:i?`active`:``,onClick:()=>a(!0),children:`Official XAML`})]}),(0,k.jsx)(C,{language:i?`xaml`:`tsx`,children:i?D.samples[e].xaml:w(O,t)})]})]})]})}function M(){let[s,d]=u(),[h,y]=(0,E.useState)(e.Canvas2D),[x,C]=(0,E.useState)(!1),[w,O]=(0,E.useState)(`Ready`);(0,E.useEffect)(()=>{document.documentElement.dataset.theme=s},[s]);let M={theme:s,backend:h,style:{height:140}};return(0,k.jsxs)(k.Fragment,{children:[(0,k.jsx)(T,{title:`IconElement`,theme:s,onTheme:d}),(0,k.jsxs)(`main`,{className:`stage-main official-motion`,children:[(0,k.jsx)(`div`,{className:`effects-options`,children:(0,k.jsxs)(`label`,{children:[`Renderer `,(0,k.jsx)(g,{"aria-label":`Renderer`,value:h,onValueChanged:e=>y(e),children:Object.values(e).map(e=>(0,k.jsx)(f,{children:e},e))})]})}),(0,k.jsxs)(j,{index:0,name:`bitmap-icon`,options:(0,k.jsx)(m,{checked:x,onValueChanged:e=>C(e),label:(0,k.jsx)(k.Fragment,{children:`Monochrome`})}),children:[(0,k.jsx)(`p`,{children:(0,k.jsx)(b,{children:D.bitmapDescription})}),(0,k.jsx)(o,{...M,onReady:e=>A(`bitmap-icon`,e),children:(0,k.jsx)(a,{uriSource:`/winui/official/Slices.png`,width:50,showAsMonochrome:x,horizontalAlignment:c.Left,verticalAlignment:p.Center,accessibleName:`Slices bitmap icon`})})]}),(0,k.jsx)(j,{index:1,name:`font-icon`,children:(0,k.jsx)(o,{...M,onReady:e=>A(`font-icon`,e),children:(0,k.jsx)(r,{accessibleName:`Font icon button`,onClick:()=>O(`FontIcon clicked`),children:(0,k.jsx)(t,{fontFamily:`Segoe MDL2 Assets`,glyph:``})})})}),(0,k.jsx)(j,{index:2,name:`image-icon`,children:(0,k.jsx)(o,{...M,onReady:e=>A(`image-icon`,e),children:(0,k.jsx)(r,{width:100,accessibleName:`Image icon button`,onClick:()=>O(`ImageIcon clicked`),children:(0,k.jsx)(i,{source:`/winui/official/Slices.png`})})})}),(0,k.jsx)(j,{index:3,name:`svg-icon`,children:(0,k.jsx)(o,{...M,onReady:e=>A(`svg-icon`,e),children:(0,k.jsx)(r,{accessibleName:`SVG icon button`,onClick:()=>O(`SVG ImageIcon clicked`),children:(0,k.jsx)(i,{source:`/winui/official/libre-camera-panorama.svg`,width:50})})})}),(0,k.jsx)(j,{index:4,name:`path-icon`,children:(0,k.jsx)(o,{...M,onReady:e=>A(`path-icon`,e),children:(0,k.jsx)(r,{accessibleName:`Path icon button`,onClick:()=>O(`PathIcon clicked`),children:(0,k.jsx)(S,{data:`F1 M 16,12 20,2L 20,16 1,16`,horizontalAlignment:c.Center})})})}),(0,k.jsx)(j,{index:5,name:`symbol-icon`,children:(0,k.jsx)(o,{...M,onReady:e=>A(`symbol-icon`,e),children:(0,k.jsx)(r,{accessibleName:`Accept`,onClick:()=>O(`Accepted`),children:(0,k.jsxs)(l,{children:[(0,k.jsx)(_,{symbol:n.Accept}),(0,k.jsx)(v,{text:`Accept`})]})})})}),(0,k.jsx)(`output`,{"aria-label":`Icon output`,children:w})]})]})}export{M as IconsPage};