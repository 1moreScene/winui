import { LocalizedText } from "./GalleryLanguage";
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {Header} from './ButtonPage';
import {useGalleryTheme} from './gallery-theme';
import {SceneView,RichEditBox,StackPanel,Button,CommandBarFlyout,TextBox} from 'winui-wasm/react';
import {GalleryCheckBox,GalleryComboBox,GalleryOption,GalleryExpander,GalleryExpanderHeader,GalleryButton} from './GalleryControls';
import {ThemeMode,Orientation,RichEditAlignment,RichEditListStyle,IconSourceKind,Symbol,type RichEditBoxController as Editor,type RichEditDocument,type Scene} from 'winui-wasm';
import {SourceCode} from './SourceCode';
import {extractSampleSource} from './sample-source';
import source from './RichEditBoxPage.tsx?raw';
import official from './official-rich-edit.json';
import fixtures from './rich-edit-fixtures.json';
declare global {interface Window {richEditScenes:Record<string,Scene>;richEditors:Record<string,Editor>;}}
const initial:RichEditDocument={runs:[{text:'Select some text, then format it.\n'},{text:'RichEditBox',format:{bold:true,fontSize:24}},{text:' supports 中文 and 🙂.\nTry editing this paragraph.'}]};
function remember(name:string,s:Scene){window.richEditScenes??={};window.richEditScenes[name]=s;}
function editor(name:string,n:Editor){window.richEditors??={};window.richEditors[name]=n;}
function Example({index,title,name,children,options}:{index?:number;title?:string;name:string;children:ReactNode;options?:ReactNode}){
 const[native,setNative]=useState(false);
 return <section className="example basic-example" id={name}><h2><LocalizedText>{title??official.samples[index??0].title}</LocalizedText></h2><div className="example-card"><div className={`basic-live ${options?'with-options':''}`}><div className="basic-preview">{children}</div>{options&&<div className="options">{options}</div>}</div><GalleryExpander className="source"><GalleryExpanderHeader>Source code</GalleryExpanderHeader><div className="source-tabs"><GalleryButton onClick={()=>setNative(false)}>TypeScript / React</GalleryButton>{index!==undefined&&<GalleryButton onClick={()=>setNative(true)}>Official XAML</GalleryButton>}</div><SourceCode language={native&&index!==undefined?'xaml':'tsx'}>{native&&index!==undefined?official.samples[index].xaml:extractSampleSource(source,name)}</SourceCode></GalleryExpander></div></section>;
}
export function RichEditBoxPage(){
 const[theme,setTheme]=useGalleryTheme(),[readOnly,setReadOnly]=useState(false),[enabled,setEnabled]=useState(true),[wrap,setWrap]=useState(true),[output,setOutput]=useState(''),[saved,setSaved]=useState<RichEditDocument|null>(null);
 const custom=useRef<Editor|null>(null);const[context,setContext]=useState<Editor|null>(null);
 const rtfEditor=useRef<Editor|null>(null),mathEditor=useRef<Editor|null>(null),xmlEditor=useRef<Editor|null>(null);
 const[rtfSource,setRtfSource]=useState(fixtures.rtf),[mathSource,setMathSource]=useState(fixtures.officialMathML),[formatStatus,setFormatStatus]=useState('');
 const themedMath=theme===ThemeMode.Dark?fixtures.officialMathML.replaceAll('#000000','#FFFFFF'):fixtures.officialMathML;
 useEffect(()=>setMathSource(themedMath),[themedMath]);
 const act=(action:()=>void)=>{try{action();setFormatStatus('Done');}catch(error){setFormatStatus(String(error));}};
 const format=()=>custom.current;
 return <><Header title="RichEditBox" theme={theme} onTheme={setTheme}/><main className="stage-main official-motion compact-gallery">
 <Example index={0} name="rich-edit-simple" options={<><GalleryCheckBox label="Read only" checked={readOnly} onValueChanged={setReadOnly}/><GalleryCheckBox label="Enabled" checked={enabled} onValueChanged={setEnabled}/><GalleryCheckBox label="Wrap" checked={wrap} onValueChanged={setWrap}/></>}>
 <SceneView theme={theme} autoHeight onReady={s=>remember('simple',s)}>
 {/* @sample:rich-edit-simple:start */}
 <RichEditBox accessibleName="Simple rich editor" header="Enter rich text" placeholderText="Type something here" height={120} maxWidth={600} isReadOnly={readOnly} enabled={enabled} wrap={wrap} onReady={n=>editor('simple',n)}/>
 {/* @sample:rich-edit-simple:end */}
 </SceneView></Example>
 <Example index={1} name="rich-edit-menu">
 <SceneView theme={theme} autoHeight onReady={s=>remember('menu',s)}>
 {/* @sample:rich-edit-menu:start */}
 <StackPanel spacing={12}>
   <RichEditBox accessibleName="Editor with custom menu" height={120} maxWidth={800} text="Select text and open the formatting menu." onReady={n=>{setContext(n);editor('menu',n);}}>
     {editor=><RichEditBox.ContextFlyout><CommandBarFlyout  primaryCommands={[{id:'bold',label:'Bold',iconSource:{kind:IconSourceKind.Symbol,symbol:Symbol.Bold}},{id:'italic',label:'Italic',iconSource:{kind:IconSourceKind.Symbol,symbol:Symbol.Italic}},{id:'underline',label:'Underline',iconSource:{kind:IconSourceKind.Symbol,symbol:Symbol.Underline}}]} onCommandInvoked={e=>{if(e.command.id==='bold')editor.toggleBold();if(e.command.id==='italic')editor.toggleItalic();if(e.command.id==='underline')editor.toggleUnderline();}}/></RichEditBox.ContextFlyout>}
   </RichEditBox>
   <Button text="Formatting menu"><Button.Flyout><CommandBarFlyout  primaryCommands={[{id:'bold',label:'Bold',iconSource:{kind:IconSourceKind.Symbol,symbol:Symbol.Bold}},{id:'italic',label:'Italic',iconSource:{kind:IconSourceKind.Symbol,symbol:Symbol.Italic}},{id:'underline',label:'Underline',iconSource:{kind:IconSourceKind.Symbol,symbol:Symbol.Underline}}]} onCommandInvoked={e=>{if(e.command.id==='bold')context?.toggleBold();if(e.command.id==='italic')context?.toggleItalic();if(e.command.id==='underline')context?.toggleUnderline();}}/></Button.Flyout></Button>
 </StackPanel>
 {/* @sample:rich-edit-menu:end */}
 </SceneView>
 <p><LocalizedText>The custom flyout uses the shared Rust CommandBarFlyout. The Gallery's Windows Share command is outside this sample.</LocalizedText></p>
 </Example>
 <Example index={2} name="rich-edit-custom" options={<><label>Paragraph alignment<GalleryComboBox aria-label="Paragraph alignment" value={RichEditAlignment.Left} onValueChanged={v=>format()?.formatParagraph({alignment:v as RichEditAlignment})}>{Object.values(RichEditAlignment).map(v=><GalleryOption key={v}>{v}</GalleryOption>)}</GalleryComboBox></label><label>List style<GalleryComboBox aria-label="List style" value={RichEditListStyle.None} onValueChanged={v=>format()?.formatParagraph({listStyle:v as RichEditListStyle})}>{Object.values(RichEditListStyle).map(v=><GalleryOption key={v}>{v}</GalleryOption>)}</GalleryComboBox></label><output aria-label="Rich edit output">{output}</output></>}>
 <SceneView theme={theme} autoHeight onReady={s=>remember('custom',s)}>
 {/* @sample:rich-edit-custom:start */}
 <StackPanel spacing={12}>
   <StackPanel orientation={Orientation.Horizontal} spacing={8}>
     <Button text="Bold" onClick={()=>format()?.toggleBold()}/>
     <Button text="Italic" onClick={()=>format()?.toggleItalic()}/>
     <Button text="Underline" onClick={()=>format()?.toggleUnderline()}/>
     <Button text="Red" onClick={()=>format()?.formatSelection({foreground:'#ff0000'})}/>
     <Button text="Undo" onClick={()=>format()?.undo()}/>
     <Button text="Redo" onClick={()=>format()?.redo()}/>
   </StackPanel>
   <RichEditBox accessibleName="Custom rich editor" maxWidth={800} height={220} document={initial} onReady={n=>{custom.current=n;editor('custom',n);}} onTextChanged={e=>setOutput(e.text??'')}/>
   <StackPanel orientation={Orientation.Horizontal} spacing={8}>
     <Button text="Save document" onClick={()=>{const n=format();if(n){setSaved(n.document);setOutput('Document saved in memory');}}}/>
     <Button text="Restore document" enabled={saved!==null} onClick={()=>{if(saved)format()?.setDocument(saved);}}/>
   </StackPanel>
 </StackPanel>
 {/* @sample:rich-edit-custom:end */}
 </SceneView></Example>
 <Example title="RTF documents and embedded images" name="rich-edit-rtf">
 <SceneView theme={theme} autoHeight onReady={s=>remember('rtf',s)}>
 {/* @sample:rich-edit-rtf:start */}
 <StackPanel spacing={12}>
   <StackPanel orientation={Orientation.Horizontal} spacing={8}>
     <Button text="Load RTF" onClick={()=>act(()=>rtfEditor.current?.loadRtf(rtfSource))}/>
     <Button text="Export RTF" onClick={()=>act(()=>{if(rtfEditor.current)setRtfSource(rtfEditor.current.getRtf());})}/>
     <Button text="Insert image" onClick={()=>act(()=>rtfEditor.current?.insertImage({source:fixtures.image,width:96,altText:'Red and blue sample'}))}/>
     <Button text="Insert formula" onClick={()=>act(()=>rtfEditor.current?.insertMathML(fixtures.fraction))}/>
     <Button text="Undo import" onClick={()=>rtfEditor.current?.undo()}/>
   </StackPanel>
   <RichEditBox accessibleName="RTF rich editor" rtf={fixtures.rtf} height={200} maxWidth={800} onReady={n=>{rtfEditor.current=n;editor('rtf',n);}}/>
   <TextBox accessibleName="RTF source" header="RTF source" text={rtfSource} acceptsReturn wrap fontFamily="Consolas" height={140} maxWidth={800} onTextChanged={e=>setRtfSource(e.text??'')}/>
 </StackPanel>
 {/* @sample:rich-edit-rtf:end */}
 </SceneView></Example>
 <Example index={3} title="MathML formula objects" name="rich-edit-math">
 <SceneView theme={theme} autoHeight onReady={s=>remember('math',s)}>
 {/* @sample:rich-edit-math:start */}
 <StackPanel spacing={12}>
   <StackPanel orientation={Orientation.Horizontal} spacing={8}>
     <Button text="Fraction" onClick={()=>act(()=>mathEditor.current?.setMathML(fixtures.fraction))}/>
     <Button text="Root" onClick={()=>act(()=>mathEditor.current?.setMathML(fixtures.root))}/>
     <Button text="Matrix" onClick={()=>act(()=>mathEditor.current?.setMathML(fixtures.matrix))}/>
   </StackPanel>
   <RichEditBox accessibleName="Math formula editor" mathML={fixtures.fraction} fontSize={24} height={170} maxWidth={800} onReady={n=>{mathEditor.current=n;editor('math',n);}}/>
 </StackPanel>
 {/* @sample:rich-edit-math:end */}
 </SceneView>
 <p><LocalizedText>Each formula is one editable document object. Use MathML to change its internal structure; selection, replacement and undo share the rich editor.</LocalizedText></p>
 </Example>
 <Example index={4} name="rich-edit-mathml">
 <SceneView theme={theme} autoHeight onReady={s=>remember('mathml',s)}>
 {/* @sample:rich-edit-mathml:start */}
 <StackPanel spacing={12}>
   <RichEditBox accessibleName="MathML rich editor" mathML={themedMath} height={140} fontSize={24} maxWidth={800} onReady={n=>{xmlEditor.current=n;editor('mathml',n);}}/>
   <StackPanel orientation={Orientation.Horizontal} spacing={8}>
     <Button text="Apply MathML" onClick={()=>act(()=>xmlEditor.current?.setMathML(mathSource))}/>
     <Button text="Read MathML" onClick={()=>act(()=>{if(xmlEditor.current)setMathSource(xmlEditor.current.getMathML());})}/>
   </StackPanel>
   <TextBox accessibleName="MathML source" header="MathML source" text={mathSource} acceptsReturn wrap fontFamily="Consolas" height={180} maxWidth={800} onTextChanged={e=>setMathSource(e.text??'')}/>
 </StackPanel>
 {/* @sample:rich-edit-mathml:end */}
 </SceneView></Example>
 <output aria-label="Rich document status">{formatStatus}</output>
 <p><LocalizedText>RTF supports the SDK's character and paragraph formats, PNG/JPEG pictures and common OfficeMath structures. MathML is laid out and painted by Rust. Automatic selection flyouts, native two-dimensional formula editing and full Word document features remain outside this implementation.</LocalizedText></p>
 </main></>;
}
