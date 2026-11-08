import { GalleryButton, GalleryComboBox, GalleryExpander, GalleryExpanderHeader, GalleryOption, GallerySlider } from './GalleryControls';
import { useGalleryTheme } from './gallery-theme';
import {useEffect,useState,type ReactNode} from 'react';
import {Header} from './ButtonPage';
import {SceneView,Canvas,Rectangle,Line,Path,Polygon,Polyline} from './react';
import {ThemeMode,RendererBackend,HorizontalAlignment,type Scene} from './index';
import official from './official-vectors.json';
import source from './ShapesPage.tsx?raw';
import {extractSampleSource} from './sample-source';
declare global{interface Window{shapeScenes:Record<string,Scene>;}}
function remember(name:string,scene:Scene){window.shapeScenes??={};window.shapeScenes[name]=scene;}
function Range({name,value,onChange,min=0,max=100}:{name:string;value:number;onChange:(n:number)=>void;min?:number;max?:number}){return <label>{name}<GallerySlider  aria-label={name} min={min} max={max} step={.5} value={value} onValueChanged={e=>onChange(e)}/>{value}</label>;}
function Example({name,page,index,children,options,filter}:{name:string;page:'Shape'|'Line';index:number;children:ReactNode;options:ReactNode;filter?:'Shape'|'Line'}){
 const[native,setNative]=useState(false);if(filter&&filter!==page)return null;const sample=official.controls[page].samples[index];
 return <section id={name} className="example basic-example"><h2>{sample.title}</h2><div className="example-card"><div className="basic-live with-options"><div className="basic-preview">{children}</div><div className="options">{options}</div></div><GalleryExpander className="source"><GalleryExpanderHeader>Source code</GalleryExpanderHeader><div className="source-tabs"><GalleryButton className={!native?'active':''} onClick={()=>setNative(false)}>TypeScript / React</GalleryButton><GalleryButton className={native?'active':''} onClick={()=>setNative(true)}>Official XAML</GalleryButton></div><pre><code>{native?sample.xaml:extractSampleSource(source,name)}</code></pre></GalleryExpander></div></section>;
}
export function ShapesPage({filter}:{filter?:'Shape'|'Line'}){
 const[theme,setTheme]=useGalleryTheme(),[backend,setBackend]=useState(RendererBackend.Canvas2D);
 const[w,setW]=useState(100),[h,setH]=useState(100),[rx,setRx]=useState(0),[ry,setRy]=useState(0),[rs,setRs]=useState(2);
 const[x1,setX1]=useState(0),[y1,setY1]=useState(0),[x2,setX2]=useState(200),[y2,setY2]=useState(0),[ls,setLs]=useState(5);
 const[ps,setPs]=useState(2),[cs,setCs]=useState(2),[pls,setPls]=useState(2);
 useEffect(()=>{document.documentElement.dataset.theme=theme;},[theme]);const shared={theme,backend};
 return <><Header title="Shapes" theme={theme} onTheme={setTheme}/><main className="stage-main official-motion shape-gallery"><div className="effects-options"><label>Renderer <GalleryComboBox aria-label="Renderer" value={backend} onValueChanged={e=>setBackend(e as RendererBackend)}>{Object.values(RendererBackend).map(v=><GalleryOption key={v}>{v}</GalleryOption>)}</GalleryComboBox></label></div>
 <Example filter={filter} name="shape-rectangle" page="Shape" index={1} options={<><Range name="Rectangle width" min={100} max={150} value={w} onChange={setW}/><Range name="Rectangle height" min={100} max={150} value={h} onChange={setH}/><Range name="Radius X" value={rx} onChange={setRx}/><Range name="Radius Y" value={ry} onChange={setRy}/><Range name="Rectangle stroke" min={2} max={10} value={rs} onChange={setRs}/></>}>
 <SceneView {...shared} style={{height:210}} onReady={s=>remember('rectangle',s)}>
  {/* @sample:shape-rectangle:start */}
  <Rectangle width={w} height={h} fill="#4682b4" stroke="#000000" strokeThickness={rs}
    radiusX={rx} radiusY={ry} horizontalAlignment={HorizontalAlignment.Left}/>
  {/* @sample:shape-rectangle:end */}
 </SceneView></Example>
 <Example filter={filter} name="shape-line" page="Line" index={0} options={<><Range name="Start point X" value={x1} onChange={setX1}/><Range name="Start point Y" value={y1} onChange={setY1}/><Range name="End point X" min={200} max={300} value={x2} onChange={setX2}/><Range name="End point Y" value={y2} onChange={setY2}/><Range name="Line stroke" min={5} max={10} value={ls} onChange={setLs}/></>}>
 <SceneView {...shared} style={{height:210}} onReady={s=>remember('line',s)}>
  {/* @sample:shape-line:start */}
  <Canvas width={100} height={200} horizontalAlignment={HorizontalAlignment.Left}>
    <Line x1={x1} y1={y1} x2={x2} y2={y2} canvasTop={50} stroke="#4682b4" strokeThickness={ls}/>
  </Canvas>
  {/* @sample:shape-line:end */}
 </SceneView></Example>

 <Example filter={filter} name="shape-polygon" page="Shape" index={2} options={<Range name="Polygon stroke" min={2} max={10} value={ps} onChange={setPs}/>}>
 <SceneView {...shared} style={{height:170}} onReady={s=>remember('polygon',s)}>
  {/* @sample:shape-polygon:start */}
  <Polygon points={[[10,100],[60,40],[200,40],[250,100]]} fill="#4682b4" stroke="#000000" strokeThickness={ps}/>
  {/* @sample:shape-polygon:end */}
 </SceneView></Example>
 <Example filter={filter} name="shape-polyline" page="Line" index={1} options={<Range name="Polyline stroke" min={2} max={10} value={pls} onChange={setPls}/>}>
 <SceneView {...shared} style={{height:170}} onReady={s=>remember('polyline',s)}>
  {/* @sample:shape-polyline:start */}
  <Polyline points={[[10,100],[60,40],[200,40],[250,100]]} stroke="#000000" strokeThickness={pls}/>
  {/* @sample:shape-polyline:end */}
 </SceneView></Example>
 <Example filter={filter} name="shape-path" page="Line" index={2} options={<Range name="Path stroke" min={2} max={10} value={cs} onChange={setCs}/>}>
 <SceneView {...shared} style={{height:230}} onReady={s=>remember('path',s)}>
  {/* @sample:shape-path:start */}
  <Path data="M 10,100 C 100,25 300,250 400,75 H 200" stroke="#b8860b" strokeThickness={cs}/>
  {/* @sample:shape-path:end */}
 </SceneView></Example></main></>;
}
