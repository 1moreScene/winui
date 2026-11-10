import { LocalizedText } from "./GalleryLanguage";
import { SourceCode } from './SourceCode';
import { GalleryButton, GalleryComboBox, GalleryExpander, GalleryExpanderHeader, GalleryOption, GallerySlider } from './GalleryControls';
import { useGalleryTheme } from './gallery-theme';
import {useEffect,useState,type ReactNode} from 'react';
import {Header} from './ButtonPage';
import {SceneView,StackPanel,TextBox,PasswordBox,ScrollViewer,Image,CheckBox} from 'winui-wasm/react';
import {ThemeMode,FontStyle,PasswordRevealMode,Orientation,HorizontalAlignment,VerticalAlignment,ScrollMode,ScrollBarVisibility,ZoomMode,ImageStretch,type Scene} from 'winui-wasm';
import official from './official-text-scroll.json';
import source from './TextScrollPage.tsx?raw';
import {extractSampleSource} from './sample-source';
type Page=keyof typeof official.controls;
declare global {interface Window {textScrollScenes:Record<string,Scene>}}
function remember(name:string,scene:Scene){window.textScrollScenes??={};window.textScrollScenes[name]=scene;}
function Example({page,name,file,children,options,output}:{page:Page;name:string;file:string;children:ReactNode;options?:ReactNode;output?:string}){
 const [native,setNative]=useState(false);const sample=official.controls[page].samples.find(s=>s.file===file)!;
 return <section className="example basic-example" id={name}><h2><LocalizedText>{sample.title}</LocalizedText></h2><div className="example-card"><div className={`basic-live${options?" with-options":""}`}><div className="basic-preview">{children}</div>{options&&<aside className="options">{options}</aside>}{output!==undefined&&<div className="basic-output"><span>Output:</span><span role="status">{output}</span></div>}</div><GalleryExpander className="source"><GalleryExpanderHeader>Source code</GalleryExpanderHeader><div className="source-tabs"><GalleryButton className={!native?'active':''} onClick={()=>setNative(false)}>TypeScript / React</GalleryButton><GalleryButton className={native?'active':''} onClick={()=>setNative(true)}>Official XAML</GalleryButton></div><SourceCode language={native ? 'xaml' : 'tsx'}>{native?sample.xaml:extractSampleSource(source,name)}</SourceCode></GalleryExpander></div></section>;
}
function EnumOption<T extends string>({label,value,values,onChange}:{label:string;value:T;values:Record<string,T>;onChange:(v:T)=>void}){return <label>{label}<GalleryComboBox aria-label={label} value={value} onValueChanged={e=>onChange(e as T)}>{Object.values(values).map(v=><GalleryOption key={v}>{v}</GalleryOption>)}</GalleryComboBox></label>;}
export function TextScrollPage({page}:{page:Page}){
 const [theme,setTheme]=useGalleryTheme(),[showPassword,setShowPassword]=useState(false),[output,setOutput]=useState('');
 const [zoomMode,setZoomMode]=useState(ZoomMode.Enabled),[zoom,setZoom]=useState(4),[hsm,setHsm]=useState(ScrollMode.Enabled),[vsm,setVsm]=useState(ScrollMode.Enabled),[hsv,setHsv]=useState(ScrollBarVisibility.Auto),[vsv,setVsv]=useState(ScrollBarVisibility.Auto);
 useEffect(()=>{document.documentElement.dataset.theme=theme;},[theme]);
 return <><Header title={page} theme={theme} onTheme={setTheme}/><main className="stage-main official-motion">
 {page==='TextBox'&&<>
 <Example page={page} name="textbox-simple" file="SimpleTextbox.txt"><SceneView autoHeight theme={theme} style={{height:32}} onReady={s=>remember('textbox-simple',s)}>
 {/* @sample:textbox-simple:start */}
 <TextBox accessibleName="simple TextBox" />
 {/* @sample:textbox-simple:end */}
 </SceneView></Example>
 <Example page={page} name="textbox-header" file="TextboxHeaderPlaceholderText.txt"><SceneView autoHeight theme={theme} style={{height:59}} onReady={s=>remember('textbox-header',s)}>
 {/* @sample:textbox-header:start */}
 <TextBox header="Enter your name:" placeholderText="Name" />
 {/* @sample:textbox-header:end */}
 </SceneView></Example>
 <Example page={page} name="textbox-readonly" file="ReadOnlyTextboxVarious.txt"><SceneView autoHeight theme={theme} style={{height:46}} onReady={s=>remember('textbox-readonly',s)}>
 {/* @sample:textbox-readonly:start */}
 <TextBox text="I am super excited to be here!" accessibleName="customized TextBox" isReadOnly fontFamily="Arial" fontSize={24} fontStyle={FontStyle.Italic} characterSpacing={200} foreground="#5178BE" />
 {/* @sample:textbox-readonly:end */}
 </SceneView></Example>
 <Example page={page} name="textbox-multiline" file="MultiLineTextboxSpell.txt"><SceneView autoHeight theme={theme} style={{height:32}} onReady={s=>remember('textbox-multiline',s)}>
 {/* @sample:textbox-multiline:start */}
 <TextBox accessibleName="multi-line TextBox" wrap acceptsReturn isSpellCheckEnabled selectionHighlightColor="#008000" minWidth={400} />
 {/* @sample:textbox-multiline:end */}
 </SceneView></Example>
 </>}
 {page==='PasswordBox'&&<>
 <Example page={page} name="password-simple" file="SimplePasswordbox.txt"><SceneView autoHeight theme={theme} style={{height:32}} onReady={s=>remember('password-simple',s)}>
 {/* @sample:password-simple:start */}
 <PasswordBox width={300} horizontalAlignment={HorizontalAlignment.Left} accessibleName="Simple PasswordBox" />
 {/* @sample:password-simple:end */}
 </SceneView></Example>
 <Example page={page} name="password-header" file="PasswordboxHeaderPlaceholderText.txt"><SceneView autoHeight theme={theme} style={{height:59}} onReady={s=>remember('password-header',s)}>
 {/* @sample:password-header:start */}
 <PasswordBox width={300} horizontalAlignment={HorizontalAlignment.Left} header="Password" placeholderText="Enter your password" passwordChar="#" />
 {/* @sample:password-header:end */}
 </SceneView></Example>
 <Example page={page} name="password-reveal" file="PasswordboxRevealMode.txt"><SceneView autoHeight theme={theme} style={{height:32}} onReady={s=>remember('password-reveal',s)}>
 {/* @sample:password-reveal:start */}
 <StackPanel orientation={Orientation.Horizontal} spacing={8} horizontalAlignment={HorizontalAlignment.Left}>
   <PasswordBox width={250} accessibleName="Sample password box" passwordRevealMode={showPassword?PasswordRevealMode.Visible:PasswordRevealMode.Hidden}/>
   <CheckBox text="Show password" isChecked={showPassword} onChecked={()=>setShowPassword(true)} onUnchecked={()=>setShowPassword(false)}/>
 </StackPanel>
 {/* @sample:password-reveal:end */}
 </SceneView></Example>
 </>}
 {page==='ScrollViewer'&&<Example page={page} name="scrollviewer-content" file="ContentInsideScrollviewer.txt" output={output} options={<div className="effects-options">
 <EnumOption label="Zoom mode" value={zoomMode} values={ZoomMode} onChange={v=>{setZoomMode(v);if(v===ZoomMode.Disabled)setZoom(2);}}/>
 <label>Zoom <GallerySlider aria-label="Zoom"  min={0.1} max={10} step={0.1} value={zoom} disabled={zoomMode===ZoomMode.Disabled} onValueChanged={e=>setZoom(Number(e))}/><output>{zoom.toFixed(1)}</output></label>
 <EnumOption label="Horizontal scroll mode" value={hsm} values={ScrollMode} onChange={setHsm}/><EnumOption label="Vertical scroll mode" value={vsm} values={ScrollMode} onChange={setVsm}/>
 <EnumOption label="Horizontal scroll bar visibility" value={hsv} values={ScrollBarVisibility} onChange={setHsv}/><EnumOption label="Vertical scroll bar visibility" value={vsv} values={ScrollBarVisibility} onChange={setVsv}/>
 </div>}><SceneView theme={theme} style={{height:266,minWidth:400}} onReady={s=>remember('scrollviewer-content',s)}>
 {/* @sample:scrollviewer-content:start */}
 <ScrollViewer width={400} height={266} horizontalAlignment={HorizontalAlignment.Left} verticalAlignment={VerticalAlignment.Top} accessibleName="cliff ScrollViewer" isTabStop zoomMode={zoomMode} zoomFactor={zoom} horizontalScrollMode={hsm} verticalScrollMode={vsm} horizontalScrollBarVisibility={hsv} verticalScrollBarVisibility={vsv} onViewChanged={e=>{if(e.view&&!e.view.isIntermediate){setZoom(e.view.zoomFactor);setOutput(`Horizontal: ${e.view.horizontalOffset.toFixed(0)}, Vertical: ${e.view.verticalOffset.toFixed(0)}`);}}}>
   <Image source="/official/cliff.jpg" accessibleName="cliff" stretch={ImageStretch.None} horizontalAlignment={HorizontalAlignment.Left} verticalAlignment={VerticalAlignment.Top}/>
 </ScrollViewer>
 {/* @sample:scrollviewer-content:end */}
 </SceneView></Example>}
 </main></>;
}
