import{I as e,Ir as t,Kr as n,Lr as r,O as i,Or as a,Wt as o,a as s,cn as c,en as l,g as u,i as d,l as f,lr as p,n as m,oi as h,pi as g,r as _,t as v,v as y,wn as b,zt as x}from"./GalleryControls-jbXHT3zS.js";import{i as S,r as C}from"./ButtonPage-Cv9H35SX.js";import{t as w}from"./SourceCode-C2xz3uBh.js";var T=g(),E=`import { LocalizedText } from "./GalleryLanguage";
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
const initial:RichEditDocument={runs:[{text:'Select some text, then format it.\\n'},{text:'RichEditBox',format:{bold:true,fontSize:24}},{text:' supports 中文 and 🙂.\\nTry editing this paragraph.'}]};
function remember(name:string,s:Scene){window.richEditScenes??={};window.richEditScenes[name]=s;}
function editor(name:string,n:Editor){window.richEditors??={};window.richEditors[name]=n;}
function Example({index,title,name,children,options}:{index?:number;title?:string;name:string;children:ReactNode;options?:ReactNode}){
 const[native,setNative]=useState(false);
 return <section className="example basic-example" id={name}><h2><LocalizedText>{title??official.samples[index??0].title}</LocalizedText></h2><div className="example-card"><div className={\`basic-live \${options?'with-options':''}\`}><div className="basic-preview">{children}</div>{options&&<div className="options">{options}</div>}</div><GalleryExpander className="source"><GalleryExpanderHeader>Source code</GalleryExpanderHeader><div className="source-tabs"><GalleryButton onClick={()=>setNative(false)}>TypeScript / React</GalleryButton>{index!==undefined&&<GalleryButton onClick={()=>setNative(true)}>Official XAML</GalleryButton>}</div><SourceCode language={native&&index!==undefined?'xaml':'tsx'}>{native&&index!==undefined?official.samples[index].xaml:extractSampleSource(source,name)}</SourceCode></GalleryExpander></div></section>;
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
`,D={galleryCommit:`7360ac322414e118eadfb0c7c2f4ecc31a218f59`,sources:[{source:`WinUIGallery/Samples/RichEditBox/CustomEditorRicheditbox.txt`,path:`references/gallery-input/RichEditBox/CustomEditorRicheditbox.txt`,sha256:`b28bd6cfc0b052f4084880dab39556c26e58d05ff08836bf6e89203b1595cea8`},{source:`WinUIGallery/Samples/RichEditBox/CustomizingRicheditboxCommandbarflyoutAdding.txt`,path:`references/gallery-input/RichEditBox/CustomizingRicheditboxCommandbarflyoutAdding.txt`,sha256:`722086b74594b9b3a56662d07ee39504402510b7a99bae86c842aeb3e01202ae`},{source:`WinUIGallery/Samples/RichEditBox/RichEditBoxMath.txt`,path:`references/gallery-input/RichEditBox/RichEditBoxMath.txt`,sha256:`fc8ddedc97b382ffe31f59ae5ccf7636fb2b7ca2782bd048369567566a55c3f7`},{source:`WinUIGallery/Samples/RichEditBox/RichEditBoxPage.xaml`,path:`references/gallery-input/RichEditBox/RichEditBoxPage.xaml`,sha256:`78d54c6f26932aa1c514b42ddaf8b7429b64710dd22c3dc04a07e6b92fb92251`},{source:`WinUIGallery/Samples/RichEditBox/RichEditBoxPage.xaml.cs`,path:`references/gallery-input/RichEditBox/RichEditBoxPage.xaml.cs`,sha256:`2e59638aea781ee653b065f87b19b2d0c403f12c44c28288cd7a0893bea66bf2`},{source:`WinUIGallery/Samples/RichEditBox/SimpleTextEditorRicheditbox.txt`,path:`references/gallery-input/RichEditBox/SimpleTextEditorRicheditbox.txt`,sha256:`bec138808bdc335bd37b8a763e8ba96b4e00bbdc289778682f22e5fe5200ba11`},{source:`WinUIGallery/Samples/RichEditBox/WorkingMathmlRicheditbox.txt`,path:`references/gallery-input/RichEditBox/WorkingMathmlRicheditbox.txt`,sha256:`e53f8c75a92d15b1cc136ebfc09e46e6267ebcc6853a3c3f49f410b441a224d6`}],samples:[{title:`A simple text editor using RichEditBox.`,source:`SimpleTextEditorRicheditbox.txt`,xaml:`<RichEditBox x:Name="editor" AutomationProperties.Name="simple text editor"/>`},{title:`Customizing RichEditBox's CommandBarFlyout - Adding 'Share'`,source:`CustomizingRicheditboxCommandbarflyoutAdding.txt`,xaml:`<RichEditBox x:Name="REBCustom" 
    AutomationProperties.Name="editor with custom menu"
    Width="800" Height="200" 
    Loaded="REBCustom_Loaded" 
    Unloaded="REBCustom_Unloaded"/>`},{title:`A custom editor with RichEditBox.`,source:`CustomEditorRicheditbox.txt`,xaml:`<RelativePanel Margin="0,0,0,20" HorizontalAlignment="Stretch">
    <RelativePanel.Resources>
        <Style TargetType="Button">
            <Setter Property="BorderThickness" Value="0" />
            <Setter Property="Background" Value="Transparent"/>
            <Setter Property="Margin" Value="0,0,8,0" />
        </Style>
    </RelativePanel.Resources>
    <Button x:Name="openFileButton" Click="OpenButton_Click" AutomationProperties.Name="Open file" ToolTipService.ToolTip="Open file">
        <Button.Content>
            <FontIcon Glyph="&#xE8E5;"/>
        </Button.Content>
    </Button>
    <Button Click="SaveButton_Click" AutomationProperties.Name="Save file" ToolTipService.ToolTip="Save file" 
            RelativePanel.RightOf="openFileButton">
        <Button.Content>
            <FontIcon Glyph="&#xE74E;"/>
        </Button.Content>
    </Button>
    <Button AutomationProperties.Name="Bold" ToolTipService.ToolTip="Bold" Click="BoldButton_Click" 
            RelativePanel.LeftOf="italicButton" >
        <Button.Content>
            <FontIcon Glyph="&#xE8DD;"/>
        </Button.Content>
    </Button>
    <Button x:Name="italicButton" Click="ItalicButton_Click" AutomationProperties.Name="Italic" ToolTipService.ToolTip="Italic" 
            RelativePanel.LeftOf="fontColorButton">
        <Button.Content>
            <FontIcon Glyph="&#xE8DB;"/>
        </Button.Content>
    </Button>

    <DropDownButton x:Name="fontColorButton" AutomationProperties.Name="Font color"
                                BorderThickness="0" ToolTipService.ToolTip="Font color"
                                Background="Transparent" 
                                RelativePanel.AlignRightWithPanel="True">
        <SymbolIcon Symbol="FontColor"/>
        <DropDownButton.Flyout>
            <Flyout Placement="Bottom">
                <VariableSizedWrapGrid Orientation="Horizontal" MaximumRowsOrColumns="3">
                    <VariableSizedWrapGrid.Resources>
                        <Style TargetType="Rectangle">
                            <Setter Property="Width" Value="32"/>
                            <Setter Property="Height" Value="32"/>
                        </Style>
                        <Style TargetType="Button">
                            <Setter Property="Padding" Value="0"/>
                            <Setter Property="MinWidth" Value="0"/>
                            <Setter Property="MinHeight" Value="0"/>
                            <Setter Property="Margin" Value="6"/>
                        </Style>
                    </VariableSizedWrapGrid.Resources>
                    <Button Click="ColorButton_Click" AutomationProperties.Name="Red">
                        <Button.Content>
                            <Rectangle Fill="Red"/>
                        </Button.Content>
                    </Button>
                    <Button Click="ColorButton_Click" AutomationProperties.Name="Orange">
                        <Button.Content>
                            <Rectangle Fill="Orange"/>
                        </Button.Content>
                    </Button>
                    <Button Click="ColorButton_Click" AutomationProperties.Name="Yellow">
                        <Button.Content>
                            <Rectangle Fill="Yellow"/>
                        </Button.Content>
                    </Button>
                    <Button Click="ColorButton_Click" AutomationProperties.Name="Green">
                        <Button.Content>
                            <Rectangle Fill="Green"/>
                        </Button.Content>
                    </Button>
                    <Button Click="ColorButton_Click" AutomationProperties.Name="Blue">
                        <Button.Content>
                            <Rectangle Fill="Blue"/>
                        </Button.Content>
                    </Button>
                    <Button Click="ColorButton_Click" AutomationProperties.Name="Indigo">
                        <Button.Content>
                            <Rectangle Fill="Indigo"/>
                        </Button.Content>
                    </Button>
                    <Button Click="ColorButton_Click" AutomationProperties.Name="Violet">
                        <Button.Content>
                            <Rectangle Fill="Violet"/>
                        </Button.Content>
                    </Button>
                    <Button Click="ColorButton_Click" AutomationProperties.Name="Gray">
                        <Button.Content>
                            <Rectangle Fill="Gray"/>
                        </Button.Content>
                    </Button>
                </VariableSizedWrapGrid>
            </Flyout>
        </DropDownButton.Flyout>
    </DropDownButton>

    <RichEditBox x:Name="editor" Height="200" AutomationProperties.Name="Custom editor"
                    RelativePanel.Below="openFileButton" 
                    RelativePanel.AlignLeftWithPanel="True" 
                    RelativePanel.AlignRightWithPanel="True" 
                    TextChanged="Editor_TextChanged"
                    GotFocus="Editor_GotFocus"/>
    <StackPanel Orientation="Horizontal" 
                RelativePanel.Below="editor" 
                RelativePanel.AlignLeftWith="editor" 
                Margin="0,10,0,0">
        <TextBlock x:Name="findBoxLabel" Text="Find:" Height="20"/>
        <TextBox x:Name="findBox" Width="150" PlaceholderText="Enter search text" Margin="10,0,0,0"
                TextChanged="{x:Bind FindBoxHighlightMatches}" 
                GotFocus="{x:Bind FindBoxHighlightMatches}" 
                LostFocus="{x:Bind FindBoxRemoveHighlights}"/>
    </StackPanel>
</RelativePanel>`},{title:`Rich edit box in math mode`,source:`RichEditBoxMath.txt`,xaml:`<RichEditBox x:Name="mathEditor" FontSize="16" />`},{title:`Working with MathML in RichEditBox`,source:`WorkingMathmlRicheditbox.txt`,xaml:`<RichEditBox x:Name="mathEditor2" FontSize="16" />`}]},O={image:`data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAYAAABU1PscAAAAPklEQVR4nO3PIQEAMAgAMEI8BPrpHpYukOECN7EAi8rbm86rVSEgICAgICAgICAgICAgICAgICAgICAg8GsAmLvUxMl5WQMAAAAASUVORK5CYII=`,rtf:`{\\rtf1\\ansi\\ansicpg1252\\deff0{\\fonttbl{\\f0\\fnil Segoe UI;}}{\\colortbl ;\\red210\\green30\\blue40;}\\uc1\\pard\\ql This is {\\b rich text} with {\\i italic} and {\\cf1 color}.\\par Unicode: \\u20013?\\u25991? \\u-10179?\\u-8638?\\par}`,fraction:`<math xmlns="http://www.w3.org/1998/Math/MathML" display="block"><mfrac><mrow><msup><mi>x</mi><mn>2</mn></msup><mo>+</mo><mn>1</mn></mrow><msqrt><mrow><mi>y</mi><mo>+</mo><mn>2</mn></mrow></msqrt></mfrac></math>`,root:`<math xmlns="http://www.w3.org/1998/Math/MathML"><mroot><mrow><mi>x</mi><mo>+</mo><mn>1</mn></mrow><mn>3</mn></mroot></math>`,matrix:`<math xmlns="http://www.w3.org/1998/Math/MathML"><mfenced open="[" close="]"><mtable><mtr><mtd><mi>a</mi></mtd><mtd><mi>b</mi></mtd></mtr><mtr><mtd><mi>c</mi></mtd><mtd><mi>d</mi></mtd></mtr></mtable></mfenced></math>`,officialMathML:`<mml:math xmlns:mml="http://www.w3.org/1998/Math/MathML" display="block"><mml:mi mathcolor="#000000">x</mml:mi><mml:mo mathcolor="#000000">∈</mml:mo><mml:mi mathcolor="#000000">P</mml:mi><mml:mfenced><mml:mrow><mml:mi mathcolor="#000000">A</mml:mi></mml:mrow></mml:mfenced><mml:mo mathcolor="#000000">↔</mml:mo><mml:mi mathcolor="#000000">x</mml:mi><mml:mo mathcolor="#000000">⊆</mml:mo><mml:mi mathcolor="#000000">A</mml:mi></mml:math>`},k=b(),A={runs:[{text:`Select some text, then format it.
`},{text:`RichEditBox`,format:{bold:!0,fontSize:24}},{text:` supports 中文 and 🙂.
Try editing this paragraph.`}]};function j(e,t){window.richEditScenes??={},window.richEditScenes[e]=t}function M(e,t){window.richEditors??={},window.richEditors[e]=t}function N({index:e,title:t,name:n,children:r,options:i}){let[a,o]=(0,T.useState)(!1);return(0,k.jsxs)(`section`,{className:`example basic-example`,id:n,children:[(0,k.jsx)(`h2`,{children:(0,k.jsx)(y,{children:t??D.samples[e??0].title})}),(0,k.jsxs)(`div`,{className:`example-card`,children:[(0,k.jsxs)(`div`,{className:`basic-live ${i?`with-options`:``}`,children:[(0,k.jsx)(`div`,{className:`basic-preview`,children:r}),i&&(0,k.jsx)(`div`,{className:`options`,children:i})]}),(0,k.jsxs)(d,{className:`source`,children:[(0,k.jsx)(s,{children:`Source code`}),(0,k.jsxs)(`div`,{className:`source-tabs`,children:[(0,k.jsx)(v,{onClick:()=>o(!1),children:`TypeScript / React`}),e!==void 0&&(0,k.jsx)(v,{onClick:()=>o(!0),children:`Official XAML`})]}),(0,k.jsx)(w,{language:a&&e!==void 0?`xaml`:`tsx`,children:a&&e!==void 0?D.samples[e].xaml:S(E,n)})]})]})]})}function P(){let[s,d]=u(),[g,v]=(0,T.useState)(!1),[b,S]=(0,T.useState)(!0),[w,E]=(0,T.useState)(!0),[D,P]=(0,T.useState)(``),[F,I]=(0,T.useState)(null),L=(0,T.useRef)(null),[R,z]=(0,T.useState)(null),B=(0,T.useRef)(null),V=(0,T.useRef)(null),H=(0,T.useRef)(null),[U,W]=(0,T.useState)(O.rtf),[G,K]=(0,T.useState)(O.officialMathML),[q,J]=(0,T.useState)(``),Y=s===h.Dark?O.officialMathML.replaceAll(`#000000`,`#FFFFFF`):O.officialMathML;(0,T.useEffect)(()=>K(Y),[Y]);let X=e=>{try{e(),J(`Done`)}catch(e){J(String(e))}},Z=()=>L.current;return(0,k.jsxs)(k.Fragment,{children:[(0,k.jsx)(C,{title:`RichEditBox`,theme:s,onTheme:d}),(0,k.jsxs)(`main`,{className:`stage-main official-motion compact-gallery`,children:[(0,k.jsx)(N,{index:0,name:`rich-edit-simple`,options:(0,k.jsxs)(k.Fragment,{children:[(0,k.jsx)(m,{label:`Read only`,checked:g,onValueChanged:v}),(0,k.jsx)(m,{label:`Enabled`,checked:b,onValueChanged:S}),(0,k.jsx)(m,{label:`Wrap`,checked:w,onValueChanged:E})]}),children:(0,k.jsx)(o,{theme:s,autoHeight:!0,onReady:e=>j(`simple`,e),children:(0,k.jsx)(x,{accessibleName:`Simple rich editor`,header:`Enter rich text`,placeholderText:`Type something here`,height:120,maxWidth:600,isReadOnly:g,enabled:b,wrap:w,onReady:e=>M(`simple`,e)})})}),(0,k.jsxs)(N,{index:1,name:`rich-edit-menu`,children:[(0,k.jsx)(o,{theme:s,autoHeight:!0,onReady:e=>j(`menu`,e),children:(0,k.jsxs)(l,{spacing:12,children:[(0,k.jsx)(x,{accessibleName:`Editor with custom menu`,height:120,maxWidth:800,text:`Select text and open the formatting menu.`,onReady:e=>{z(e),M(`menu`,e)},children:t=>(0,k.jsx)(x.ContextFlyout,{children:(0,k.jsx)(e,{primaryCommands:[{id:`bold`,label:`Bold`,iconSource:{kind:p.Symbol,symbol:n.Bold}},{id:`italic`,label:`Italic`,iconSource:{kind:p.Symbol,symbol:n.Italic}},{id:`underline`,label:`Underline`,iconSource:{kind:p.Symbol,symbol:n.Underline}}],onCommandInvoked:e=>{e.command.id===`bold`&&t.toggleBold(),e.command.id===`italic`&&t.toggleItalic(),e.command.id===`underline`&&t.toggleUnderline()}})})}),(0,k.jsx)(i,{text:`Formatting menu`,children:(0,k.jsx)(i.Flyout,{children:(0,k.jsx)(e,{primaryCommands:[{id:`bold`,label:`Bold`,iconSource:{kind:p.Symbol,symbol:n.Bold}},{id:`italic`,label:`Italic`,iconSource:{kind:p.Symbol,symbol:n.Italic}},{id:`underline`,label:`Underline`,iconSource:{kind:p.Symbol,symbol:n.Underline}}],onCommandInvoked:e=>{e.command.id===`bold`&&R?.toggleBold(),e.command.id===`italic`&&R?.toggleItalic(),e.command.id===`underline`&&R?.toggleUnderline()}})})})]})}),(0,k.jsx)(`p`,{children:(0,k.jsx)(y,{children:`The custom flyout uses the shared Rust CommandBarFlyout. The Gallery's Windows Share command is outside this sample.`})})]}),(0,k.jsx)(N,{index:2,name:`rich-edit-custom`,options:(0,k.jsxs)(k.Fragment,{children:[(0,k.jsxs)(`label`,{children:[`Paragraph alignment`,(0,k.jsx)(_,{"aria-label":`Paragraph alignment`,value:t.Left,onValueChanged:e=>Z()?.formatParagraph({alignment:e}),children:Object.values(t).map(e=>(0,k.jsx)(f,{children:e},e))})]}),(0,k.jsxs)(`label`,{children:[`List style`,(0,k.jsx)(_,{"aria-label":`List style`,value:r.None,onValueChanged:e=>Z()?.formatParagraph({listStyle:e}),children:Object.values(r).map(e=>(0,k.jsx)(f,{children:e},e))})]}),(0,k.jsx)(`output`,{"aria-label":`Rich edit output`,children:D})]}),children:(0,k.jsx)(o,{theme:s,autoHeight:!0,onReady:e=>j(`custom`,e),children:(0,k.jsxs)(l,{spacing:12,children:[(0,k.jsxs)(l,{orientation:a.Horizontal,spacing:8,children:[(0,k.jsx)(i,{text:`Bold`,onClick:()=>Z()?.toggleBold()}),(0,k.jsx)(i,{text:`Italic`,onClick:()=>Z()?.toggleItalic()}),(0,k.jsx)(i,{text:`Underline`,onClick:()=>Z()?.toggleUnderline()}),(0,k.jsx)(i,{text:`Red`,onClick:()=>Z()?.formatSelection({foreground:`#ff0000`})}),(0,k.jsx)(i,{text:`Undo`,onClick:()=>Z()?.undo()}),(0,k.jsx)(i,{text:`Redo`,onClick:()=>Z()?.redo()})]}),(0,k.jsx)(x,{accessibleName:`Custom rich editor`,maxWidth:800,height:220,document:A,onReady:e=>{L.current=e,M(`custom`,e)},onTextChanged:e=>P(e.text??``)}),(0,k.jsxs)(l,{orientation:a.Horizontal,spacing:8,children:[(0,k.jsx)(i,{text:`Save document`,onClick:()=>{let e=Z();e&&(I(e.document),P(`Document saved in memory`))}}),(0,k.jsx)(i,{text:`Restore document`,enabled:F!==null,onClick:()=>{F&&Z()?.setDocument(F)}})]})]})})}),(0,k.jsx)(N,{title:`RTF documents and embedded images`,name:`rich-edit-rtf`,children:(0,k.jsx)(o,{theme:s,autoHeight:!0,onReady:e=>j(`rtf`,e),children:(0,k.jsxs)(l,{spacing:12,children:[(0,k.jsxs)(l,{orientation:a.Horizontal,spacing:8,children:[(0,k.jsx)(i,{text:`Load RTF`,onClick:()=>X(()=>B.current?.loadRtf(U))}),(0,k.jsx)(i,{text:`Export RTF`,onClick:()=>X(()=>{B.current&&W(B.current.getRtf())})}),(0,k.jsx)(i,{text:`Insert image`,onClick:()=>X(()=>B.current?.insertImage({source:O.image,width:96,altText:`Red and blue sample`}))}),(0,k.jsx)(i,{text:`Insert formula`,onClick:()=>X(()=>B.current?.insertMathML(O.fraction))}),(0,k.jsx)(i,{text:`Undo import`,onClick:()=>B.current?.undo()})]}),(0,k.jsx)(x,{accessibleName:`RTF rich editor`,rtf:O.rtf,height:200,maxWidth:800,onReady:e=>{B.current=e,M(`rtf`,e)}}),(0,k.jsx)(c,{accessibleName:`RTF source`,header:`RTF source`,text:U,acceptsReturn:!0,wrap:!0,fontFamily:`Consolas`,height:140,maxWidth:800,onTextChanged:e=>W(e.text??``)})]})})}),(0,k.jsxs)(N,{index:3,title:`MathML formula objects`,name:`rich-edit-math`,children:[(0,k.jsx)(o,{theme:s,autoHeight:!0,onReady:e=>j(`math`,e),children:(0,k.jsxs)(l,{spacing:12,children:[(0,k.jsxs)(l,{orientation:a.Horizontal,spacing:8,children:[(0,k.jsx)(i,{text:`Fraction`,onClick:()=>X(()=>V.current?.setMathML(O.fraction))}),(0,k.jsx)(i,{text:`Root`,onClick:()=>X(()=>V.current?.setMathML(O.root))}),(0,k.jsx)(i,{text:`Matrix`,onClick:()=>X(()=>V.current?.setMathML(O.matrix))})]}),(0,k.jsx)(x,{accessibleName:`Math formula editor`,mathML:O.fraction,fontSize:24,height:170,maxWidth:800,onReady:e=>{V.current=e,M(`math`,e)}})]})}),(0,k.jsx)(`p`,{children:(0,k.jsx)(y,{children:`Each formula is one editable document object. Use MathML to change its internal structure; selection, replacement and undo share the rich editor.`})})]}),(0,k.jsx)(N,{index:4,name:`rich-edit-mathml`,children:(0,k.jsx)(o,{theme:s,autoHeight:!0,onReady:e=>j(`mathml`,e),children:(0,k.jsxs)(l,{spacing:12,children:[(0,k.jsx)(x,{accessibleName:`MathML rich editor`,mathML:Y,height:140,fontSize:24,maxWidth:800,onReady:e=>{H.current=e,M(`mathml`,e)}}),(0,k.jsxs)(l,{orientation:a.Horizontal,spacing:8,children:[(0,k.jsx)(i,{text:`Apply MathML`,onClick:()=>X(()=>H.current?.setMathML(G))}),(0,k.jsx)(i,{text:`Read MathML`,onClick:()=>X(()=>{H.current&&K(H.current.getMathML())})})]}),(0,k.jsx)(c,{accessibleName:`MathML source`,header:`MathML source`,text:G,acceptsReturn:!0,wrap:!0,fontFamily:`Consolas`,height:180,maxWidth:800,onTextChanged:e=>K(e.text??``)})]})})}),(0,k.jsx)(`output`,{"aria-label":`Rich document status`,children:q}),(0,k.jsx)(`p`,{children:(0,k.jsx)(y,{children:`RTF supports the SDK's character and paragraph formats, PNG/JPEG pictures and common OfficeMath structures. MathML is laid out and painted by Rust. Automatic selection flyouts, native two-dimensional formula editing and full Word document features remain outside this implementation.`})})]})]})}export{P as RichEditBoxPage};