import{Fr as e,J as t,M as n,Mt as r,Or as i,Rt as a,Wr as o,Wt as s,Z as c,a as l,cr as u,en as d,f,g as p,i as m,l as h,li as g,pi as _,r as v,sn as y,t as b,ur as x,v as S,wn as C,xn as w}from"./GalleryControls-jbXHT3zS.js";import{t as T}from"./SourceCode-C2xz3uBh.js";import{i as E,r as D}from"./ButtonPage-Cv9H35SX.js";var O=_(),k={galleryCommit:`7360ac322414e118eadfb0c7c2f4ecc31a218f59`,controls:{RepeatButton:{description:`The RepeatButton control is like a standard Button, except that the Click event occurs continuously while the user presses the RepeatButton.`,samples:[{title:`A simple RepeatButton with text content.`,file:`RepeatButtonSimple.txt`,xaml:`<RepeatButton Content="Click and hold" Click="RepeatButton_Click" />`}]},Viewbox:{description:`Use a Viewbox control scale content up or down to a specified size.`,samples:[{title:`Content inside of a Viewbox.`,file:`ContentInsideViewbox.txt`,xaml:`<Viewbox Height="200" Width="200" StretchDirection="Both">
    <Border BorderBrush="Gray" BorderThickness="15">
        <StackPanel Background="DarkGray">
            <StackPanel Orientation="Horizontal">
                <Rectangle Fill="Blue" Height="10" Width="40"/>
                <Rectangle Fill="Green" Height="10" Width="40"/>
                <Rectangle Fill="Red" Height="10" Width="40"/>
                <Rectangle Fill="Yellow" Height="10" Width="40"/>
            </StackPanel>
            <Image Source="ms-appx:///Assets/SampleMedia/Slices.png"/>
            <TextBlock Text="This is text." HorizontalAlignment="Center"/>
        </StackPanel>
    </Border>
</Viewbox>`}]}},sources:[{path:`references/gallery-input/RepeatButton/RepeatButtonPage.xaml`,source:`WinUIGallery/Samples/RepeatButton/RepeatButtonPage.xaml`,sha256:`3c03177d0034bae69a9b44dfde13e236318fbef8730c2b7ebc1b9c3674a05fcc`},{path:`references/gallery-input/RepeatButton/RepeatButtonPage.xaml.cs`,source:`WinUIGallery/Samples/RepeatButton/RepeatButtonPage.xaml.cs`,sha256:`c67783a3feb2215dbcc5eae99eb4f003535fe0723ff05ffe9876917112905e06`},{path:`references/gallery-input/RepeatButton/RepeatButtonSimple.txt`,source:`WinUIGallery/Samples/RepeatButton/RepeatButtonSimple.txt`,sha256:`f9912b72eedbd9bbe0a799f22c95758c792af5b8ab4c404382b89452aff77d3e`},{path:`references/gallery-input/Viewbox/ContentInsideViewbox.txt`,source:`WinUIGallery/Samples/Viewbox/ContentInsideViewbox.txt`,sha256:`316081d2a2e933b6d829921014812dcbefafce45215d0fe3a90cc379a6b806db`},{path:`references/gallery-input/Viewbox/ViewboxPage.xaml`,source:`WinUIGallery/Samples/Viewbox/ViewboxPage.xaml`,sha256:`a5818d45423e9cdfd0f2a8840337bbadbb113bbdf82781178bcabe6f330d18ed`},{path:`references/gallery-input/Viewbox/ViewboxPage.xaml.cs`,source:`WinUIGallery/Samples/Viewbox/ViewboxPage.xaml.cs`,sha256:`c16fee838ac31f27ffe7bf9ce9da6464cc43799d6451bbca75e88361c879a754`}]},A=`import { LocalizedText } from "./GalleryLanguage";
import { SourceCode } from './SourceCode';
import { GalleryButton, GalleryComboBox, GalleryExpander, GalleryExpanderHeader, GalleryOption, GallerySlider } from './GalleryControls';
import { useGalleryTheme } from './gallery-theme';
import { useEffect, useState, type ReactNode } from "react";
import { Header } from "./ButtonPage";
import {
  SceneView,
  RepeatButton,
  Viewbox,
  Grid,
  StackPanel,
  TextBlock,
  Image,
  CheckBox,
  RadioButtons,
} from "winui-wasm/react";
import {
  ThemeMode,
  RendererBackend,
  Stretch,
  StretchDirection,
  Orientation,
  HorizontalAlignment,
  VerticalAlignment,
  type Scene,
} from "winui-wasm";
import official from "./official-basic-next.json";
import source from "./BasicNextPage.tsx?raw";
import { extractSampleSource } from "./sample-source";
declare global {
  interface Window {
    basicNextScenes: Record<string, Scene>;
  }
}
function remember(name: string, scene: Scene) {
  window.basicNextScenes ??= {};
  window.basicNextScenes[name] = scene;
}
function Example({
  page,
  name,
  children,
  options,
}: {
  page: keyof typeof official.controls;
  name: string;
  children: ReactNode;
  options: ReactNode;
}) {
  const [native, setNative] = useState(false);
  const sample = official.controls[page].samples[0];
  return (
    <section className="example basic-example" id={name}>
      <h2><LocalizedText>{sample.title}</LocalizedText></h2>
      <div className="example-card">
        <div className="basic-live with-options">
          <div className="basic-preview">{children}</div>
          <div className="options">{options}</div>
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
export function BasicNextPage({
  page,
}: {
  page: keyof typeof official.controls;
}) {
  const [theme, setTheme] = useGalleryTheme(),
    [backend, setBackend] = useState(RendererBackend.Canvas2D);
  const [count, setCount] = useState(0),
    [disabled, setDisabled] = useState(false);
  const [size, setSize] = useState(200),
    [stretch, setStretch] = useState(Stretch.Uniform),
    [direction, setDirection] = useState(StretchDirection.Both);
  const stretches = [
      Stretch.None,
      Stretch.Fill,
      Stretch.Uniform,
      Stretch.UniformToFill,
    ],
    directions = Object.values(StretchDirection);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  const shared = { theme, backend };
  return (
    <>
      <Header title={page} theme={theme} onTheme={setTheme} />
      <main className="stage-main official-motion">
        
        <div className="effects-options material-policies">
          <label>
            Renderer{" "}
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
        {page === "RepeatButton" ? (
          <Example
            page={page}
            name="repeat-simple"
            options={
              <SceneView {...shared} autoHeight>
                <CheckBox
                  text="Disable RepeatButton"
                  isChecked={disabled}
                  onChecked={() => setDisabled(true)}
                  onUnchecked={() => setDisabled(false)}
                />
              </SceneView>
            }
          >
            <SceneView
              {...shared}
              autoHeight
              onReady={(s) => remember("repeat-simple", s)}
            >
              {/* @sample:repeat-simple:start */}
              <StackPanel orientation={Orientation.Horizontal}>
                <RepeatButton
                  text="Click and hold"
                  enabled={!disabled}
                  onClick={() => setCount((c) => c + 1)}
                />
                <TextBlock
                  text={count ? \`Number of clicks: \${count}\` : ""}
                  margin={[8, 0, 0, 0]}
                  verticalAlignment={VerticalAlignment.Center}
                />
              </StackPanel>
              {/* @sample:repeat-simple:end */}
            </SceneView>
            <output aria-live="polite" className="sr-only">
              {count ? \`Number of clicks: \${count}\` : ""}
            </output>
          </Example>
        ) : (
          <Example
            page={page}
            name="viewbox-content"
            options={
              <>
                <label>
                  Width/Height{" "}
                  <GallerySlider
                    aria-label="Width/Height"
                    
                    min={20}
                    max={300}
                    value={size}
                    onValueChanged={(e) => setSize(e)}
                  />
                  <output>{size}</output>
                </label>
                <SceneView
                  {...shared}
                  autoHeight
                  onReady={(s) => remember("viewbox-options", s)}
                >
                  <StackPanel spacing={12}>
                    <RadioButtons
                      header="Stretch"
                      items={stretches}
                      selectedIndex={stretches.indexOf(stretch)}
                      onSelectionChanged={(e) =>
                        setStretch(stretches[e.selectedIndex ?? 0])
                      }
                    />
                    <RadioButtons
                      header="StretchDirection"
                      items={directions}
                      selectedIndex={directions.indexOf(direction)}
                      onSelectionChanged={(e) =>
                        setDirection(directions[e.selectedIndex ?? 0])
                      }
                    />
                  </StackPanel>
                </SceneView>
              </>
            }
          >
            <SceneView
              {...shared}
              style={{ height: 380 }}
              onReady={(s) => remember("viewbox-content", s)}
            >
              {/* @sample:viewbox-content:start */}
              <Viewbox
                width={size}
                height={size}
                stretch={stretch}
                stretchDirection={direction}
                verticalAlignment={VerticalAlignment.Top}
              >
                <Grid padding={[15, 15, 15, 15]} background="#808080">
                  <StackPanel background="#a9a9a9">
                    <StackPanel orientation={Orientation.Horizontal}>
                      <Grid width={40} height={10} background="#0000ff" />
                      <Grid width={40} height={10} background="#008000" />
                      <Grid width={40} height={10} background="#ff0000" />
                      <Grid width={40} height={10} background="#ffff00" />
                    </StackPanel>
                    <Image source="/official/Slices.png" />
                    <TextBlock
                      text="This is text."
                      horizontalAlignment={HorizontalAlignment.Center}
                    />
                  </StackPanel>
                </Grid>
              </Viewbox>
              {/* @sample:viewbox-content:end */}
            </SceneView>
          </Example>
        )}
      </main>
    </>
  );
}
`,j=C();function M(e,t){window.basicNextScenes??={},window.basicNextScenes[e]=t}function N({page:e,name:t,children:n,options:r}){let[i,a]=(0,O.useState)(!1),o=k.controls[e].samples[0];return(0,j.jsxs)(`section`,{className:`example basic-example`,id:t,children:[(0,j.jsx)(`h2`,{children:(0,j.jsx)(S,{children:o.title})}),(0,j.jsxs)(`div`,{className:`example-card`,children:[(0,j.jsxs)(`div`,{className:`basic-live with-options`,children:[(0,j.jsx)(`div`,{className:`basic-preview`,children:n}),(0,j.jsx)(`div`,{className:`options`,children:r})]}),(0,j.jsxs)(m,{className:`source`,children:[(0,j.jsx)(l,{children:`Source code`}),(0,j.jsxs)(`div`,{className:`source-tabs`,children:[(0,j.jsx)(b,{className:i?``:`active`,onClick:()=>a(!1),children:`TypeScript / React`}),(0,j.jsx)(b,{className:i?`active`:``,onClick:()=>a(!0),children:`Official XAML`})]}),(0,j.jsx)(T,{language:i?`xaml`:`tsx`,children:i?o.xaml:E(A,t)})]})]})]})}function P({page:l}){let[m,_]=p(),[b,S]=(0,O.useState)(e.Canvas2D),[C,T]=(0,O.useState)(0),[E,k]=(0,O.useState)(!1),[A,P]=(0,O.useState)(200),[F,I]=(0,O.useState)(x.Uniform),[L,R]=(0,O.useState)(o.Both),z=[x.None,x.Fill,x.Uniform,x.UniformToFill],B=Object.values(o);(0,O.useEffect)(()=>{document.documentElement.dataset.theme=m},[m]);let V={theme:m,backend:b};return(0,j.jsxs)(j.Fragment,{children:[(0,j.jsx)(D,{title:l,theme:m,onTheme:_}),(0,j.jsxs)(`main`,{className:`stage-main official-motion`,children:[(0,j.jsx)(`div`,{className:`effects-options material-policies`,children:(0,j.jsxs)(`label`,{children:[`Renderer`,` `,(0,j.jsx)(v,{"aria-label":`Basic renderer`,value:b,onValueChanged:e=>S(e),children:Object.values(e).map(e=>(0,j.jsx)(h,{children:e},e))})]})}),l===`RepeatButton`?(0,j.jsxs)(N,{page:l,name:`repeat-simple`,options:(0,j.jsx)(s,{...V,autoHeight:!0,children:(0,j.jsx)(n,{text:`Disable RepeatButton`,isChecked:E,onChecked:()=>k(!0),onUnchecked:()=>k(!1)})}),children:[(0,j.jsx)(s,{...V,autoHeight:!0,onReady:e=>M(`repeat-simple`,e),children:(0,j.jsxs)(d,{orientation:i.Horizontal,children:[(0,j.jsx)(a,{text:`Click and hold`,enabled:!E,onClick:()=>T(e=>e+1)}),(0,j.jsx)(y,{text:C?`Number of clicks: ${C}`:``,margin:[8,0,0,0],verticalAlignment:g.Center})]})}),(0,j.jsx)(`output`,{"aria-live":`polite`,className:`sr-only`,children:C?`Number of clicks: ${C}`:``})]}):(0,j.jsx)(N,{page:l,name:`viewbox-content`,options:(0,j.jsxs)(j.Fragment,{children:[(0,j.jsxs)(`label`,{children:[`Width/Height`,` `,(0,j.jsx)(f,{"aria-label":`Width/Height`,min:20,max:300,value:A,onValueChanged:e=>P(e)}),(0,j.jsx)(`output`,{children:A})]}),(0,j.jsx)(s,{...V,autoHeight:!0,onReady:e=>M(`viewbox-options`,e),children:(0,j.jsxs)(d,{spacing:12,children:[(0,j.jsx)(r,{header:`Stretch`,items:z,selectedIndex:z.indexOf(F),onSelectionChanged:e=>I(z[e.selectedIndex??0])}),(0,j.jsx)(r,{header:`StretchDirection`,items:B,selectedIndex:B.indexOf(L),onSelectionChanged:e=>R(B[e.selectedIndex??0])})]})})]}),children:(0,j.jsx)(s,{...V,style:{height:380},onReady:e=>M(`viewbox-content`,e),children:(0,j.jsx)(w,{width:A,height:A,stretch:F,stretchDirection:L,verticalAlignment:g.Top,children:(0,j.jsx)(t,{padding:[15,15,15,15],background:`#808080`,children:(0,j.jsxs)(d,{background:`#a9a9a9`,children:[(0,j.jsxs)(d,{orientation:i.Horizontal,children:[(0,j.jsx)(t,{width:40,height:10,background:`#0000ff`}),(0,j.jsx)(t,{width:40,height:10,background:`#008000`}),(0,j.jsx)(t,{width:40,height:10,background:`#ff0000`}),(0,j.jsx)(t,{width:40,height:10,background:`#ffff00`})]}),(0,j.jsx)(c,{source:`/winui/official/Slices.png`}),(0,j.jsx)(y,{text:`This is text.`,horizontalAlignment:u.Center})]})})})})})]})]})}export{P as BasicNextPage};