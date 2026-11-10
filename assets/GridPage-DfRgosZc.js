import{Fr as e,Ft as t,J as n,Or as r,Wt as i,Zt as a,a as o,cr as s,g as c,i as l,l as u,li as d,pi as f,r as p,sn as m,sr as h,t as g,v as _,wn as v}from"./GalleryControls-jbXHT3zS.js";import{i as y,r as b}from"./ButtonPage-Cv9H35SX.js";import{t as x}from"./SourceCode-C2xz3uBh.js";import{t as S}from"./official-layout-gallery-BUxbGRya.js";var C=f(),w=`import { LocalizedText } from "./GalleryLanguage";
import { useState } from 'react';
import { Header } from './ButtonPage';
import { useGalleryTheme } from './gallery-theme';
import { SceneView, Grid, Rectangle, Slider, TextBlock } from 'winui-wasm/react';
import { GridUnit, HorizontalAlignment, VerticalAlignment, Orientation, RendererBackend, type Scene } from 'winui-wasm';
import { GalleryButton, GalleryComboBox, GalleryOption, GalleryExpander, GalleryExpanderHeader } from './GalleryControls';
import { SourceCode } from './SourceCode';
import { extractSampleSource } from './sample-source';
import official from './official-layout-gallery.json';
import source from './GridPage.tsx?raw';
import './layout-gallery.css';

declare global { interface Window { gridScene?: Scene } }
const tracks = Array.from({ length: 3 }, () => ({ unit: GridUnit.Pixel, value: 50 }));

export function GridPage() {
  const [theme, setTheme] = useGalleryTheme();
  const [backend, setBackend] = useState(RendererBackend.Canvas2D);
  const [row, setRow] = useState(0), [column, setColumn] = useState(0);
  const [rowSpacing, setRowSpacing] = useState(8), [columnSpacing, setColumnSpacing] = useState(8);
  const [native, setNative] = useState(false);
  const sample = official.controls.Grid.samples[0];
  const nativeSource = sample.xaml
    .replace(/ColumnSpacing="[^"]+"/, \`ColumnSpacing="\${columnSpacing}"\`)
    .replace(/RowSpacing="[^"]+"/, \`RowSpacing="\${rowSpacing}"\`)
    .replace(/Grid.Column="\\{x:Bind [^"]+"/, \`Grid.Column="\${column}"\`)
    .replace(/Grid.Row="\\{x:Bind [^"]+"/, \`Grid.Row="\${row}"\`);
  return <>
    <Header title="Grid" theme={theme} onTheme={setTheme}/>
    <main className="stage-main official-motion">
      <div className="effects-options"><label>Renderer <GalleryComboBox aria-label="Renderer" value={backend} onValueChanged={value => setBackend(value as RendererBackend)}>
        {Object.values(RendererBackend).map(value => <GalleryOption key={value}>{value}</GalleryOption>)}
      </GalleryComboBox></label></div>
      <section id="grid-basic" className="example basic-example">
        <h2><LocalizedText>{sample.title}</LocalizedText></h2>
        <div className="example-card">
          <div className="basic-live with-options grid-gallery-live">
            <div className="basic-preview">
              <SceneView theme={theme} backend={backend} style={{ height: 220 }} onReady={scene => { window.gridScene = scene; }}>
                {/* @sample:grid-basic:start */}
                <Grid width={240} height={160} background="#808080" rows={tracks} columns={tracks}
                  rowSpacing={rowSpacing} columnSpacing={columnSpacing}
                  horizontalAlignment={HorizontalAlignment.Left} verticalAlignment={VerticalAlignment.Center}>
                  <Rectangle width={50} height={50} fill="#ff0000" row={row} column={column} accessibleName="Red block"/>
                  <Rectangle width={50} height={50} fill="#0000ff" row={1} accessibleName="Blue block"/>
                  <Rectangle width={50} height={50} fill="#008000" column={1} accessibleName="Green block"/>
                  <Rectangle width={50} height={50} fill="#ffff00" row={1} column={1} accessibleName="Yellow block"/>
                </Grid>
                {/* @sample:grid-basic:end */}
              </SceneView>
            </div>
            <aside className="options">
              <SceneView theme={theme} autoHeight>
                <Grid columns={[{unit:GridUnit.Star,value:1},{unit:GridUnit.Pixel,value:86}]} rows={Array.from({length:4},()=>({unit:GridUnit.Auto}))} columnSpacing={12} rowSpacing={12}>
                  <TextBlock text="Grid"/>
                  <Slider row={1} margin={[16,0,0,0]} header="ColumnSpacing" accessibleName="ColumnSpacing" minimum={0} maximum={16} stepFrequency={1} tickFrequency={1} value={columnSpacing} onValueChanged={event => { if (event.value !== undefined) setColumnSpacing(Math.round(event.value)); }}/>
                  <Slider row={1} column={1} height={100} verticalAlignment={VerticalAlignment.Top} header="RowSpacing" accessibleName="RowSpacing" orientation={Orientation.Vertical} isDirectionReversed minimum={0} maximum={16} stepFrequency={1} tickFrequency={1} value={rowSpacing} onValueChanged={event => { if (event.value !== undefined) setRowSpacing(Math.round(event.value)); }}/>
                  <TextBlock row={2} text="Red block"/>
                  <Slider row={3} margin={[16,0,0,0]} header="Grid.Column" accessibleName="Grid.Column" minimum={0} maximum={2} stepFrequency={1} tickFrequency={1} value={column} onValueChanged={event => { if (event.value !== undefined) setColumn(Math.round(event.value)); }}/>
                  <Slider row={3} column={1} height={100} verticalAlignment={VerticalAlignment.Top} header="Grid.Row" accessibleName="Grid.Row" orientation={Orientation.Vertical} isDirectionReversed minimum={0} maximum={2} stepFrequency={1} tickFrequency={1} value={row} onValueChanged={event => { if (event.value !== undefined) setRow(Math.round(event.value)); }}/>
                </Grid>
              </SceneView>
            </aside>
          </div>
          <GalleryExpander className="source"><GalleryExpanderHeader>Source code</GalleryExpanderHeader>
            <div className="source-tabs"><GalleryButton className={!native ? 'active' : ''} onClick={() => setNative(false)}>TypeScript / React</GalleryButton><GalleryButton className={native ? 'active' : ''} onClick={() => setNative(true)}>Official XAML</GalleryButton></div>
            <SourceCode language={native ? 'xaml' : 'tsx'}>{native ? nativeSource : \`const tracks = Array.from({ length: 3 }, () => ({ unit: GridUnit.Pixel, value: 50 }));\\n\${extractSampleSource(source,'grid-basic')}\`}</SourceCode>
          </GalleryExpander>
        </div>
      </section>
    </main>
  </>;
}
`,T=v(),E=Array.from({length:3},()=>({unit:h.Pixel,value:50}));function D(){let[f,v]=c(),[D,O]=(0,C.useState)(e.Canvas2D),[k,A]=(0,C.useState)(0),[j,M]=(0,C.useState)(0),[N,P]=(0,C.useState)(8),[F,I]=(0,C.useState)(8),[L,R]=(0,C.useState)(!1),z=S.controls.Grid.samples[0],B=z.xaml.replace(/ColumnSpacing="[^"]+"/,`ColumnSpacing="${F}"`).replace(/RowSpacing="[^"]+"/,`RowSpacing="${N}"`).replace(/Grid.Column="\{x:Bind [^"]+"/,`Grid.Column="${j}"`).replace(/Grid.Row="\{x:Bind [^"]+"/,`Grid.Row="${k}"`);return(0,T.jsxs)(T.Fragment,{children:[(0,T.jsx)(b,{title:`Grid`,theme:f,onTheme:v}),(0,T.jsxs)(`main`,{className:`stage-main official-motion`,children:[(0,T.jsx)(`div`,{className:`effects-options`,children:(0,T.jsxs)(`label`,{children:[`Renderer `,(0,T.jsx)(p,{"aria-label":`Renderer`,value:D,onValueChanged:e=>O(e),children:Object.values(e).map(e=>(0,T.jsx)(u,{children:e},e))})]})}),(0,T.jsxs)(`section`,{id:`grid-basic`,className:`example basic-example`,children:[(0,T.jsx)(`h2`,{children:(0,T.jsx)(_,{children:z.title})}),(0,T.jsxs)(`div`,{className:`example-card`,children:[(0,T.jsxs)(`div`,{className:`basic-live with-options grid-gallery-live`,children:[(0,T.jsx)(`div`,{className:`basic-preview`,children:(0,T.jsx)(i,{theme:f,backend:D,style:{height:220},onReady:e=>{window.gridScene=e},children:(0,T.jsxs)(n,{width:240,height:160,background:`#808080`,rows:E,columns:E,rowSpacing:N,columnSpacing:F,horizontalAlignment:s.Left,verticalAlignment:d.Center,children:[(0,T.jsx)(t,{width:50,height:50,fill:`#ff0000`,row:k,column:j,accessibleName:`Red block`}),(0,T.jsx)(t,{width:50,height:50,fill:`#0000ff`,row:1,accessibleName:`Blue block`}),(0,T.jsx)(t,{width:50,height:50,fill:`#008000`,column:1,accessibleName:`Green block`}),(0,T.jsx)(t,{width:50,height:50,fill:`#ffff00`,row:1,column:1,accessibleName:`Yellow block`})]})})}),(0,T.jsx)(`aside`,{className:`options`,children:(0,T.jsx)(i,{theme:f,autoHeight:!0,children:(0,T.jsxs)(n,{columns:[{unit:h.Star,value:1},{unit:h.Pixel,value:86}],rows:Array.from({length:4},()=>({unit:h.Auto})),columnSpacing:12,rowSpacing:12,children:[(0,T.jsx)(m,{text:`Grid`}),(0,T.jsx)(a,{row:1,margin:[16,0,0,0],header:`ColumnSpacing`,accessibleName:`ColumnSpacing`,minimum:0,maximum:16,stepFrequency:1,tickFrequency:1,value:F,onValueChanged:e=>{e.value!==void 0&&I(Math.round(e.value))}}),(0,T.jsx)(a,{row:1,column:1,height:100,verticalAlignment:d.Top,header:`RowSpacing`,accessibleName:`RowSpacing`,orientation:r.Vertical,isDirectionReversed:!0,minimum:0,maximum:16,stepFrequency:1,tickFrequency:1,value:N,onValueChanged:e=>{e.value!==void 0&&P(Math.round(e.value))}}),(0,T.jsx)(m,{row:2,text:`Red block`}),(0,T.jsx)(a,{row:3,margin:[16,0,0,0],header:`Grid.Column`,accessibleName:`Grid.Column`,minimum:0,maximum:2,stepFrequency:1,tickFrequency:1,value:j,onValueChanged:e=>{e.value!==void 0&&M(Math.round(e.value))}}),(0,T.jsx)(a,{row:3,column:1,height:100,verticalAlignment:d.Top,header:`Grid.Row`,accessibleName:`Grid.Row`,orientation:r.Vertical,isDirectionReversed:!0,minimum:0,maximum:2,stepFrequency:1,tickFrequency:1,value:k,onValueChanged:e=>{e.value!==void 0&&A(Math.round(e.value))}})]})})})]}),(0,T.jsxs)(l,{className:`source`,children:[(0,T.jsx)(o,{children:`Source code`}),(0,T.jsxs)(`div`,{className:`source-tabs`,children:[(0,T.jsx)(g,{className:L?``:`active`,onClick:()=>R(!1),children:`TypeScript / React`}),(0,T.jsx)(g,{className:L?`active`:``,onClick:()=>R(!0),children:`Official XAML`})]}),(0,T.jsx)(x,{language:L?`xaml`:`tsx`,children:L?B:`const tracks = Array.from({ length: 3 }, () => ({ unit: GridUnit.Pixel, value: 50 }));\n${y(w,`grid-basic`)}`})]})]})]})]})]})}export{D as GridPage};