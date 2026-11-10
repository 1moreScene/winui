import{Ct as e,Dt as t,Fr as n,Ft as r,Ot as i,Wt as a,a as o,cr as s,f as c,g as l,i as u,l as d,li as f,pi as p,r as m,st as h,t as g,v as _,wn as v}from"./GalleryControls-jbXHT3zS.js";import{t as y}from"./SourceCode-C2xz3uBh.js";import{i as b,r as x}from"./ButtonPage-Cv9H35SX.js";var S=p(),C={controls:{Shape:{description:`Basic shapes are intended for decorative rendering or for compositing non-interactive parts of controls.`,samples:[{title:`Ellipse`,xaml:`<Ellipse Fill="SteelBlue" Stroke="Black"/>`},{title:`Rectangle`,xaml:`<Rectangle Fill="SteelBlue"
           Stroke="Black"/>`},{title:`Polygon`,xaml:`<Polygon Fill="SteelBlue" Points="10,100 60,40 200,40 250,100" Stroke="Black"/>`}],sliders:{slider1:{minimum:100,maximum:150,value:100},slider2:{minimum:100,maximum:150,value:100},slider3:{minimum:2,maximum:10,value:2},recSlider1:{minimum:100,maximum:150,value:100},recSlider2:{minimum:100,maximum:150,value:100},recSlider3:{minimum:2,maximum:10,value:2},recSlider4:{minimum:0,maximum:100,value:0},recSlider5:{minimum:0,maximum:100,value:0},polySlider1:{minimum:2,maximum:10,value:2}}},Line:{description:`Draws a straight line between two points.`,samples:[{title:`Line`,xaml:`<Line Stroke="SteelBlue"/>`},{title:`Polyline`,xaml:`<Polyline Stroke="Black"
          Points="10,100 60,40 200,40 250,100"/>`},{title:`Path`,xaml:`<!-- The first segment is a cubic Bezier curve that begins at Point #1 and ends at Point #4, which is drawn by using Point #2 and 3 as the two control points. This segment is indicated by the "C" command in the Data attribute string. -->
<!-- The second segment begins with an absolute horizontal line command "H", which specifies a line drawn from the preceding subpath endpoint (Point #4) to a new endpoint (Point #5). Because it's a horizontal line command, the value specified is an x-coordinate. -->
                    
<Path Stroke="DarkGoldenRod"
      Data="M 10,100 C 100,25 300,250 400,75 H 200"/>`},{title:`GeometryGroup`,xaml:`<Path Stroke="Black" StrokeThickness="4" Fill="#CCCCFF">
    <Path.Data>
                    
        <!-- Creates a composite shape from three geometries. -->
        <GeometryGroup FillRule="EvenOdd">
            <LineGeometry StartPoint="10,10" EndPoint="50,30" />
            <EllipseGeometry Center="40,70" />
            <RectangleGeometry Rect="30,55 100 30" />
        </GeometryGroup>
    </Path.Data>
</Path>`}],sliders:{lineSlider1:{minimum:0,maximum:100,value:0},lineSlider2:{minimum:0,maximum:100,value:0},lineSlider3:{minimum:200,maximum:300,value:200},lineSlider4:{minimum:0,maximum:100,value:0},lineSlider5:{minimum:5,maximum:10,value:5},polyLineSlider1:{minimum:2,maximum:10,value:2},pathSlider1:{minimum:2,maximum:10,value:2},geogroupslider1:{minimum:30,maximum:40,value:30},geogroupslider2:{minimum:30,maximum:50,value:30}}}},sources:[{path:`references/gallery-input/Shape/ShapeEllipse.txt`,sha256:`31ccf8a3e47aaccf9312593539ab04897fc81e0973bd231faa869e8b133d3023`},{path:`references/gallery-input/Shape/ShapePage.xaml`,sha256:`4c50313a1b8165a91ebfb9ac8d0ec29f7ebae007ca664e53b532d5d415ac6c10`},{path:`references/gallery-input/Shape/ShapePage.xaml.cs`,sha256:`243369108a4422145cc9c4656b37d7078a44eb2790b3f3d52b725249f67c188f`},{path:`references/gallery-input/Shape/ShapePolygon.txt`,sha256:`9f95681a37980ff40457bf44bcd7f8dcdf760eacf0d0d7884063a1ff2cd0a684`},{path:`references/gallery-input/Shape/ShapeRectangle.txt`,sha256:`de90d7720533572d390e2a75b840a23dc856b26722d085ff94e69b86619c4fde`},{path:`references/gallery-input/Line/Line.txt`,sha256:`9a2ee5fcf48aed1ca91ed07c8f0e33c139c43d01a12f510e78bbb49dd5a75339`},{path:`references/gallery-input/Line/LineGeometrygroup.txt`,sha256:`87f5a261fda6d9223e2d483b413d613497e4d2312de5aeb22a0eb9b8a1f4f9d7`},{path:`references/gallery-input/Line/LinePage.xaml`,sha256:`2627a4fc18e022534699dc85cb4bd015049a432d64a2bce867b9cf405a5ca161`},{path:`references/gallery-input/Line/LinePage.xaml.cs`,sha256:`880afd9a1d5cf7566e01e7eb1092ce8d74cc725a4b47b3b92ca168d7a3d18ca0`},{path:`references/gallery-input/Line/LinePath.txt`,sha256:`1ce52012593f7105174df7951d055bd0a2f72b1284e7253ffce92f10fd4502e7`},{path:`references/gallery-input/Line/Polyline.txt`,sha256:`541dc8432ae9e1fa306c8dbf6b1c7bf110d24cbc4a825d8dd57f34202e46f166`}]},w=`import { LocalizedText } from "./GalleryLanguage";\r
import { SourceCode } from './SourceCode';\r
import { GalleryButton, GalleryComboBox, GalleryExpander, GalleryExpanderHeader, GalleryOption, GallerySlider } from './GalleryControls';\r
import { useGalleryTheme } from './gallery-theme';\r
import {useEffect,useState,type ReactNode} from 'react';\r
import {Header} from './ButtonPage';\r
import {SceneView,Rectangle,Line,Path,Polygon,Polyline} from 'winui-wasm/react';\r
import {ThemeMode,RendererBackend,HorizontalAlignment,VerticalAlignment,type Scene} from 'winui-wasm';\r
import official from './official-vectors.json';\r
import source from './ShapesPage.tsx?raw';\r
import {extractSampleSource} from './sample-source';\r
declare global{interface Window{shapeScenes:Record<string,Scene>;}}\r
function remember(name:string,scene:Scene){window.shapeScenes??={};window.shapeScenes[name]=scene;}\r
function Range({name,value,onChange,min=0,max=100}:{name:string;value:number;onChange:(n:number)=>void;min?:number;max?:number}){return <label>{name}<GallerySlider  aria-label={name} min={min} max={max} step={.5} value={value} onValueChanged={e=>onChange(e)}/>{value}</label>;}\r
function Example({name,page,index,children,options,filter}:{name:string;page:'Shape'|'Line';index:number;children:ReactNode;options:ReactNode;filter?:'Shape'|'Line'}){\r
 const[native,setNative]=useState(false);if(filter&&filter!==page)return null;const sample=official.controls[page].samples[index];\r
 return <section id={name} className="example basic-example"><h2><LocalizedText>{sample.title}</LocalizedText></h2><div className="example-card"><div className="basic-live with-options"><div className="basic-preview">{children}</div><div className="options">{options}</div></div><GalleryExpander className="source"><GalleryExpanderHeader>Source code</GalleryExpanderHeader><div className="source-tabs"><GalleryButton className={!native?'active':''} onClick={()=>setNative(false)}>TypeScript / React</GalleryButton><GalleryButton className={native?'active':''} onClick={()=>setNative(true)}>Official XAML</GalleryButton></div><SourceCode language={native ? 'xaml' : 'tsx'}>{native?sample.xaml:extractSampleSource(source,name)}</SourceCode></GalleryExpander></div></section>;\r
}\r
export function ShapesPage({filter}:{filter?:'Shape'|'Line'}){\r
 const[theme,setTheme]=useGalleryTheme(),[backend,setBackend]=useState(RendererBackend.Canvas2D);\r
 const[w,setW]=useState(100),[h,setH]=useState(100),[rx,setRx]=useState(0),[ry,setRy]=useState(0),[rs,setRs]=useState(2);\r
 const[x1,setX1]=useState(0),[y1,setY1]=useState(0),[x2,setX2]=useState(200),[y2,setY2]=useState(0),[ls,setLs]=useState(5);\r
 const[ps,setPs]=useState(2),[cs,setCs]=useState(2),[pls,setPls]=useState(2);\r
 useEffect(()=>{document.documentElement.dataset.theme=theme;},[theme]);const shared={theme,backend};\r
 return <><Header title="Shapes" theme={theme} onTheme={setTheme}/><main className="stage-main official-motion shape-gallery"><div className="effects-options"><label>Renderer <GalleryComboBox aria-label="Renderer" value={backend} onValueChanged={e=>setBackend(e as RendererBackend)}>{Object.values(RendererBackend).map(v=><GalleryOption key={v}>{v}</GalleryOption>)}</GalleryComboBox></label></div>\r
 <Example filter={filter} name="shape-rectangle" page="Shape" index={1} options={<><Range name="Rectangle width" min={100} max={150} value={w} onChange={setW}/><Range name="Rectangle height" min={100} max={150} value={h} onChange={setH}/><Range name="Radius X" value={rx} onChange={setRx}/><Range name="Radius Y" value={ry} onChange={setRy}/><Range name="Rectangle stroke" min={2} max={10} value={rs} onChange={setRs}/></>}>\r
 <SceneView {...shared} style={{height:210}} onReady={s=>remember('rectangle',s)}>\r
  {/* @sample:shape-rectangle:start */}\r
  <Rectangle width={w} height={h} fill="#4682b4" stroke="#000000" strokeThickness={rs}\r
    radiusX={rx} radiusY={ry} horizontalAlignment={HorizontalAlignment.Left}/>\r
  {/* @sample:shape-rectangle:end */}\r
 </SceneView></Example>\r
 <Example filter={filter} name="shape-line" page="Line" index={0} options={<><Range name="Start point X" value={x1} onChange={setX1}/><Range name="Start point Y" value={y1} onChange={setY1}/><Range name="End point X" min={200} max={300} value={x2} onChange={setX2}/><Range name="End point Y" value={y2} onChange={setY2}/><Range name="Line stroke" min={5} max={10} value={ls} onChange={setLs}/></>}>\r
 <SceneView {...shared} style={{height:210}} onReady={s=>remember('line',s)}>\r
  {/* @sample:shape-line:start */}\r
\r
    <Line x1={x1} y1={y1} x2={x2} y2={y2} horizontalAlignment={HorizontalAlignment.Left} verticalAlignment={VerticalAlignment.Top} margin={[0,50,0,0]} stroke="#4682b4" strokeThickness={ls}/>\r
\r
  {/* @sample:shape-line:end */}\r
 </SceneView></Example>\r
\r
 <Example filter={filter} name="shape-polygon" page="Shape" index={2} options={<Range name="Polygon stroke" min={2} max={10} value={ps} onChange={setPs}/>}>\r
 <SceneView {...shared} style={{height:170}} onReady={s=>remember('polygon',s)}>\r
  {/* @sample:shape-polygon:start */}\r
  <Polygon points={[[10,100],[60,40],[200,40],[250,100]]} fill="#4682b4" stroke="#000000" strokeThickness={ps}/>\r
  {/* @sample:shape-polygon:end */}\r
 </SceneView></Example>\r
 <Example filter={filter} name="shape-polyline" page="Line" index={1} options={<Range name="Polyline stroke" min={2} max={10} value={pls} onChange={setPls}/>}>\r
 <SceneView {...shared} style={{height:170}} onReady={s=>remember('polyline',s)}>\r
  {/* @sample:shape-polyline:start */}\r
  <Polyline points={[[10,100],[60,40],[200,40],[250,100]]} stroke="#000000" strokeThickness={pls}/>\r
  {/* @sample:shape-polyline:end */}\r
 </SceneView></Example>\r
 <Example filter={filter} name="shape-path" page="Line" index={2} options={<Range name="Path stroke" min={2} max={10} value={cs} onChange={setCs}/>}>\r
 <SceneView {...shared} style={{height:230}} onReady={s=>remember('path',s)}>\r
  {/* @sample:shape-path:start */}\r
  <Path data="M 10,100 C 100,25 300,250 400,75 H 200" stroke="#b8860b" strokeThickness={cs}/>\r
  {/* @sample:shape-path:end */}\r
 </SceneView></Example></main></>;\r
}\r
`,T=v();function E(e,t){window.shapeScenes??={},window.shapeScenes[e]=t}function D({name:e,value:t,onChange:n,min:r=0,max:i=100}){return(0,T.jsxs)(`label`,{children:[e,(0,T.jsx)(c,{"aria-label":e,min:r,max:i,step:.5,value:t,onValueChanged:e=>n(e)}),t]})}function O({name:e,page:t,index:n,children:r,options:i,filter:a}){let[s,c]=(0,S.useState)(!1);if(a&&a!==t)return null;let l=C.controls[t].samples[n];return(0,T.jsxs)(`section`,{id:e,className:`example basic-example`,children:[(0,T.jsx)(`h2`,{children:(0,T.jsx)(_,{children:l.title})}),(0,T.jsxs)(`div`,{className:`example-card`,children:[(0,T.jsxs)(`div`,{className:`basic-live with-options`,children:[(0,T.jsx)(`div`,{className:`basic-preview`,children:r}),(0,T.jsx)(`div`,{className:`options`,children:i})]}),(0,T.jsxs)(u,{className:`source`,children:[(0,T.jsx)(o,{children:`Source code`}),(0,T.jsxs)(`div`,{className:`source-tabs`,children:[(0,T.jsx)(g,{className:s?``:`active`,onClick:()=>c(!1),children:`TypeScript / React`}),(0,T.jsx)(g,{className:s?`active`:``,onClick:()=>c(!0),children:`Official XAML`})]}),(0,T.jsx)(y,{language:s?`xaml`:`tsx`,children:s?l.xaml:b(w,e)})]})]})]})}function k({filter:o}){let[c,u]=l(),[p,g]=(0,S.useState)(n.Canvas2D),[_,v]=(0,S.useState)(100),[y,b]=(0,S.useState)(100),[C,w]=(0,S.useState)(0),[k,A]=(0,S.useState)(0),[j,M]=(0,S.useState)(2),[N,P]=(0,S.useState)(0),[F,I]=(0,S.useState)(0),[L,R]=(0,S.useState)(200),[z,B]=(0,S.useState)(0),[V,H]=(0,S.useState)(5),[U,W]=(0,S.useState)(2),[G,K]=(0,S.useState)(2),[q,J]=(0,S.useState)(2);(0,S.useEffect)(()=>{document.documentElement.dataset.theme=c},[c]);let Y={theme:c,backend:p};return(0,T.jsxs)(T.Fragment,{children:[(0,T.jsx)(x,{title:`Shapes`,theme:c,onTheme:u}),(0,T.jsxs)(`main`,{className:`stage-main official-motion shape-gallery`,children:[(0,T.jsx)(`div`,{className:`effects-options`,children:(0,T.jsxs)(`label`,{children:[`Renderer `,(0,T.jsx)(m,{"aria-label":`Renderer`,value:p,onValueChanged:e=>g(e),children:Object.values(n).map(e=>(0,T.jsx)(d,{children:e},e))})]})}),(0,T.jsx)(O,{filter:o,name:`shape-rectangle`,page:`Shape`,index:1,options:(0,T.jsxs)(T.Fragment,{children:[(0,T.jsx)(D,{name:`Rectangle width`,min:100,max:150,value:_,onChange:v}),(0,T.jsx)(D,{name:`Rectangle height`,min:100,max:150,value:y,onChange:b}),(0,T.jsx)(D,{name:`Radius X`,value:C,onChange:w}),(0,T.jsx)(D,{name:`Radius Y`,value:k,onChange:A}),(0,T.jsx)(D,{name:`Rectangle stroke`,min:2,max:10,value:j,onChange:M})]}),children:(0,T.jsx)(a,{...Y,style:{height:210},onReady:e=>E(`rectangle`,e),children:(0,T.jsx)(r,{width:_,height:y,fill:`#4682b4`,stroke:`#000000`,strokeThickness:j,radiusX:C,radiusY:k,horizontalAlignment:s.Left})})}),(0,T.jsx)(O,{filter:o,name:`shape-line`,page:`Line`,index:0,options:(0,T.jsxs)(T.Fragment,{children:[(0,T.jsx)(D,{name:`Start point X`,value:N,onChange:P}),(0,T.jsx)(D,{name:`Start point Y`,value:F,onChange:I}),(0,T.jsx)(D,{name:`End point X`,min:200,max:300,value:L,onChange:R}),(0,T.jsx)(D,{name:`End point Y`,value:z,onChange:B}),(0,T.jsx)(D,{name:`Line stroke`,min:5,max:10,value:V,onChange:H})]}),children:(0,T.jsx)(a,{...Y,style:{height:210},onReady:e=>E(`line`,e),children:(0,T.jsx)(h,{x1:N,y1:F,x2:L,y2:z,horizontalAlignment:s.Left,verticalAlignment:f.Top,margin:[0,50,0,0],stroke:`#4682b4`,strokeThickness:V})})}),(0,T.jsx)(O,{filter:o,name:`shape-polygon`,page:`Shape`,index:2,options:(0,T.jsx)(D,{name:`Polygon stroke`,min:2,max:10,value:U,onChange:W}),children:(0,T.jsx)(a,{...Y,style:{height:170},onReady:e=>E(`polygon`,e),children:(0,T.jsx)(t,{points:[[10,100],[60,40],[200,40],[250,100]],fill:`#4682b4`,stroke:`#000000`,strokeThickness:U})})}),(0,T.jsx)(O,{filter:o,name:`shape-polyline`,page:`Line`,index:1,options:(0,T.jsx)(D,{name:`Polyline stroke`,min:2,max:10,value:q,onChange:J}),children:(0,T.jsx)(a,{...Y,style:{height:170},onReady:e=>E(`polyline`,e),children:(0,T.jsx)(i,{points:[[10,100],[60,40],[200,40],[250,100]],stroke:`#000000`,strokeThickness:q})})}),(0,T.jsx)(O,{filter:o,name:`shape-path`,page:`Line`,index:2,options:(0,T.jsx)(D,{name:`Path stroke`,min:2,max:10,value:G,onChange:K}),children:(0,T.jsx)(a,{...Y,style:{height:230},onReady:e=>E(`path`,e),children:(0,T.jsx)(e,{data:`M 10,100 C 100,25 300,250 400,75 H 200`,stroke:`#b8860b`,strokeThickness:G})})})]})]})}export{k as ShapesPage};