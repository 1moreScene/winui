import { LocalizedText } from "./GalleryLanguage";
import {useState,type ReactNode} from 'react';
import {SourceCode} from './SourceCode';
import {GalleryButton,GalleryExpander,GalleryExpanderHeader} from './GalleryControls';
import {extractSampleSource} from './sample-source';
import official from './official-motion.json';
import defaultSource from './MotionPages.tsx?raw';
import type {ThemeMode,RendererBackend,Scene} from 'winui-wasm';
import {HorizontalAlignment,VerticalAlignment} from 'winui-wasm';
import {SceneView,ContentPresenter,type SceneViewProps} from 'winui-wasm/react';

export type MotionShared={theme:ThemeMode;backend:RendererBackend;reducedMotion:boolean};
declare global {interface Window {motionScenes:Record<string,Scene>;}}
export function rememberMotion(key:string,scene:Scene){window.motionScenes??={};window.motionScenes[key]=scene;}
/** The official ControlPresenter, including natural child width and native padding.
 * Rust owns its measure/arrange; the surrounding page only mounts the surface. */
export function MotionPreview({children,...props}:SceneViewProps){
  return <SceneView {...props} autoHeight autoWidth={false}>
    <ContentPresenter padding={[12,12,12,12]} horizontalContentAlignment={HorizontalAlignment.Left} verticalContentAlignment={VerticalAlignment.Top}>{children}</ContentPresenter>
  </SceneView>;
}
export function MotionExample({name,id,kind,index,children,options,source=defaultSource}:{name:string;id?:string;kind:string;index:number;children:ReactNode;options?:ReactNode;source?:string}){
  const sample=official.catalog.find(entry=>entry.name===kind)!.samples[index];
  const [native,setNative]=useState(false);
  return <section id={id??name} className="example basic-example"><h2><LocalizedText>{sample.title}</LocalizedText></h2><div className="example-card">
    <div className={`basic-live${options?' with-options':''}`}><div className="basic-preview">{children}</div>{options&&<aside className="options">{options}</aside>}</div>
    <GalleryExpander className="source"><GalleryExpanderHeader>Source code</GalleryExpanderHeader><div className="source-tabs"><GalleryButton onClick={()=>setNative(false)}>TypeScript / React</GalleryButton><GalleryButton onClick={()=>setNative(true)}>Official source</GalleryButton></div><SourceCode language={native?(sample.xaml.trimStart().startsWith('<')?'xaml':'csharp'):'tsx'}>{native?sample.xaml:extractSampleSource(source,name)}</SourceCode></GalleryExpander>
  </div></section>;
}
