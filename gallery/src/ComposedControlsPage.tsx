import { LocalizedText } from "./GalleryLanguage";
import { SourceCode } from './SourceCode';
import { GalleryButton, GalleryCheckBox, GalleryComboBox, GalleryExpander, GalleryExpanderHeader, GalleryOption } from './GalleryControls';
import { useGalleryTheme } from './gallery-theme';
import {useEffect,useState,type ReactNode} from 'react';
import {Header} from './ButtonPage';
import {SceneView,StackPanel,Button,TextBlock,CheckBox,AutoSuggestBox,NumberBox,ContentDialog,TeachingTip,Image} from 'winui-wasm/react';
import {ThemeMode,RendererBackend,HorizontalAlignment,VerticalAlignment,NumberBoxSpinButtonPlacementMode,NumberBoxValidationMode,AutoSuggestionBoxTextChangeReason,ContentDialogButton,ContentDialogResult,TeachingTipPlacementMode,ImageStretch,type Scene,type ContentDialogController as DialogController} from 'winui-wasm';
import official from './official-composed-controls.json';
import pageSource from './ComposedControlsPage.tsx?raw';
import {extractSampleSource} from './sample-source';
type Kind=keyof typeof official.controls;
declare global{interface Window{composedScenes:Record<string,Scene>;}}
const remember=(kind:string,scene:Scene)=>{window.composedScenes??={};window.composedScenes[kind]=scene;};
const colors=['Blue','Green','Red','Yellow'];
function Example({name,kind,sample=0,children,options,output}:{name:string;kind:Kind;sample?:number;children:ReactNode;options?:ReactNode;output?:string}){const[native,setNative]=useState(false);return <section id={name} className="example basic-example"><h2><LocalizedText>{official.controls[kind].samples[sample]?.title??kind}</LocalizedText></h2><div className="example-card"><div className="basic-live with-options"><div className="basic-preview">{children}</div><div className="options">{options}<output aria-label={`${name} output`}>{output}</output></div></div><GalleryExpander className="source"><GalleryExpanderHeader>Source code</GalleryExpanderHeader><div className="source-tabs"><GalleryButton className={!native?'active':''} onClick={()=>setNative(false)}>TypeScript / React</GalleryButton><GalleryButton className={native?'active':''} onClick={()=>setNative(true)}>Official XAML</GalleryButton></div><SourceCode language={native ? 'xaml' : 'tsx'}>{native?official.controls[kind].samples[sample]?.xaml:extractSampleSource(pageSource,name)}</SourceCode></GalleryExpander></div></section>;}
export function ComposedControlsPage({kind}:{kind:Kind}){
 const[theme,setTheme]=useGalleryTheme(),[backend,setBackend]=useState(RendererBackend.Canvas2D),[enabled,setEnabled]=useState(true);
 const[output,setOutput]=useState('Ready'),[items,setItems]=useState<readonly string[]>(colors),[numberValue,setNumberValue]=useState<number|null>(42),[spin,setSpin]=useState(NumberBoxSpinButtonPlacementMode.Inline),[expression,setExpression]=useState(true),[wrap,setWrap]=useState(false),[validation,setValidation]=useState(NumberBoxValidationMode.InvalidInputOverwritten);
 const[dialog,setDialog]=useState<DialogController|null>(null),[cancel,setCancel]=useState(false),[defer,setDefer]=useState(false),[defaultButton,setDefaultButton]=useState(ContentDialogButton.Primary);
 const[dialogWithoutDefault,setDialogWithoutDefault]=useState<DialogController|null>(null),[tipUntargeted,setTipUntargeted]=useState(false),[heroOpen,setHeroOpen]=useState(false);
 const[tip,setTip]=useState(false),[placement,setPlacement]=useState(TeachingTipPlacementMode.Top),[lightDismiss,setLightDismiss]=useState(false);
 useEffect(()=>{document.documentElement.dataset.theme=theme;},[theme]);const shared={theme,backend};
 return <><Header title={kind} theme={theme} onTheme={setTheme}/><main className="stage-main official-motion"><div className="effects-options"><label>Renderer <GalleryComboBox aria-label="Renderer" value={backend} onValueChanged={e=>setBackend(e as RendererBackend)}>{Object.values(RendererBackend).map(v=><GalleryOption key={v}>{v}</GalleryOption>)}</GalleryComboBox></label><GalleryCheckBox  checked={enabled} onValueChanged={e=>setEnabled(e)}  label={<>Enabled</>}/></div>
 {kind==='NumberBox'&&<Example name="composed-number" kind={kind} output={output} options={<><label>Spin buttons<GalleryComboBox aria-label="Spin buttons" value={spin} onValueChanged={e=>setSpin(e as NumberBoxSpinButtonPlacementMode)}>{Object.values(NumberBoxSpinButtonPlacementMode).map(v=><GalleryOption key={v}>{v}</GalleryOption>)}</GalleryComboBox></label><GalleryCheckBox  checked={expression} onValueChanged={e=>setExpression(e)}  label={<>Accepts expressions</>}/><GalleryCheckBox  checked={wrap} onValueChanged={e=>setWrap(e)}  label={<>Wrap values</>}/><label>Validation<GalleryComboBox value={validation} onValueChanged={e=>setValidation(e as NumberBoxValidationMode)}>{Object.values(NumberBoxValidationMode).map(v=><GalleryOption key={v}>{v}</GalleryOption>)}</GalleryComboBox></label><GalleryButton onClick={()=>setNumberValue(null)}>Clear value</GalleryButton></>}><SceneView {...shared} style={{height:280}} onReady={s=>remember('NumberBox',s)}>
 {/* @sample:composed-number:start */}
 <StackPanel padding={[24,24,24,24]} spacing={24}><NumberBox width={240} header="Quantity" description="Enter a number or an expression" value={numberValue} minimum={0} maximum={100} smallChange={1} largeChange={10} enabled={enabled} acceptsExpression={expression} spinButtonPlacementMode={spin} validationMode={validation} isWrapEnabled={wrap} onValueChanged={e=>{setNumberValue(e.newValue??null);setOutput(`Value: ${e.newValue??'empty'}`);}}/><NumberBox width={240} placeholderText="Enter a number" enabled={enabled}/></StackPanel>
 {/* @sample:composed-number:end */}
 </SceneView></Example>}
 {kind==='AutoSuggestBox'&&<><Example name="composed-suggest" kind={kind} output={output}><SceneView {...shared} style={{height:280}} onReady={s=>remember('AutoSuggestBox',s)}>
 {/* @sample:composed-suggest:start */}
 <StackPanel padding={[24,24,24,24]}><AutoSuggestBox width={300} header="Colors" placeholderText="Type a color" items={items} enabled={enabled} onTextChanged={e=>{if(e.reason===AutoSuggestionBoxTextChangeReason.UserInput)setItems(colors.filter(c=>c.toLowerCase().includes((e.text??'').toLowerCase())));setOutput(`TextChanged: ${e.reason}`);}} onSuggestionChosen={e=>setOutput(`Chosen: ${e.itemId}`)} onQuerySubmitted={e=>setOutput(`Query: ${e.queryText}`)}/></StackPanel>
 {/* @sample:composed-suggest:end */}
 </SceneView></Example><Example name="composed-search" kind={kind} sample={1} output={output}><SceneView {...shared} style={{height:260}} onReady={s=>remember('SearchBox',s)}>
 {/* @sample:composed-search:start */}
 <StackPanel padding={[24,24,24,24]}><AutoSuggestBox width={300} queryIcon placeholderText="Type a control name" items={['Button','ComboBox','ContentDialog','NumberBox','TeachingTip']} enabled={enabled} onQuerySubmitted={e=>setOutput(`Search: ${e.queryText}`)}/></StackPanel>
 {/* @sample:composed-search:end */}
 </SceneView></Example></>}
 {kind==='ContentDialog'&&<Example name="composed-dialog" kind={kind} output={output} options={<><label>Default button<GalleryComboBox aria-label="Default button" value={defaultButton} onValueChanged={e=>setDefaultButton(e as ContentDialogButton)}>{Object.values(ContentDialogButton).map(v=><GalleryOption key={v}>{v}</GalleryOption>)}</GalleryComboBox></label><GalleryCheckBox  aria-label="Cancel closing" checked={cancel} onValueChanged={e=>setCancel(e)}  label={<>Cancel closing</>}/><GalleryCheckBox  checked={defer} onValueChanged={e=>setDefer(e)}  label={<>Delay primary action</>}/></>}><SceneView {...shared} style={{height:420}} onReady={s=>remember('ContentDialog',s)}>
 {/* @sample:composed-dialog:start */}
 <Button text="Show dialog" horizontalAlignment={HorizontalAlignment.Left} verticalAlignment={VerticalAlignment.Top} margin={[24,24,0,0]} enabled={enabled} onClick={()=>{void dialog?.showAsync().then(result=>setOutput(`Result: ${result}`));}}/><ContentDialog title="Save your work?" primaryButtonText="Save" secondaryButtonText="Don't save" closeButtonText="Cancel" defaultButton={defaultButton} onReady={setDialog} onClosing={e=>{e.cancel=cancel;}} onPrimaryButtonClick={e=>{if(defer){const deferral=e.getDeferral!();setTimeout(()=>deferral.complete(),350);}}}><TextBlock text="Your changes will be saved to the cloud." wrap/><CheckBox text="Upload your content to the cloud."/></ContentDialog>
 {/* @sample:composed-dialog:end */}
 </SceneView></Example>}
 {kind==='TeachingTip'&&<Example name="composed-teaching" kind={kind} output={output} options={<><label>Preferred placement<GalleryComboBox aria-label="Preferred placement" value={placement} onValueChanged={e=>setPlacement(e as TeachingTipPlacementMode)}>{Object.values(TeachingTipPlacementMode).map(v=><GalleryOption key={v}>{v}</GalleryOption>)}</GalleryComboBox></label><GalleryCheckBox  checked={lightDismiss} onValueChanged={e=>setLightDismiss(e)}  label={<>Light dismiss</>}/></>}><SceneView {...shared} style={{height:460}} onReady={s=>remember('TeachingTip',s)}>
 {/* @sample:composed-teaching:start */}
 <Button text="Show teaching tip" horizontalAlignment={HorizontalAlignment.Left} verticalAlignment={VerticalAlignment.Top} margin={[220,240,0,0]} enabled={enabled} name="teaching-target" onClick={()=>setTip(true)}/><TeachingTip target="teaching-target" isOpen={tip} title="Explore this feature" subtitle="Helpful information appears next to the target." preferredPlacement={placement} actionButtonContent="Learn more" closeButtonText="Got it" isLightDismissEnabled={lightDismiss} onActionButtonClick={()=>setOutput('Action invoked')} onClosed={()=>{setTip(false);setOutput('Closed');}}/>
 {/* @sample:composed-teaching:end */}
 </SceneView></Example>}
 {kind==='NumberBox'&&<>
 <Example name="composed-number-spin" kind={kind} sample={1} output={output}><SceneView {...shared} style={{height:160}} onReady={s=>remember('NumberBoxSpin',s)}>
 {/* @sample:composed-number-spin:start */}
 <StackPanel padding={[24,24,24,24]}><NumberBox width={240} header="Enter an integer:" value={1} spinButtonPlacementMode={NumberBoxSpinButtonPlacementMode.Inline} smallChange={10} largeChange={100} enabled={enabled} onValueChanged={e=>setOutput(`Value: ${e.newValue??'empty'}`)}/></StackPanel>
 {/* @sample:composed-number-spin:end */}
 </SceneView></Example>
 <Example name="composed-number-format" kind={kind} sample={2} output={output}><SceneView {...shared} style={{height:160}} onReady={s=>remember('NumberBoxFormat',s)}>
 {/* @sample:composed-number-format:start */}
 <StackPanel padding={[24,24,24,24]}><NumberBox width={240} header="Enter a dollar amount:" placeholderText="0.00" numberFormat={{minimumFractionDigits:2,roundingIncrement:0.25}} enabled={enabled} onValueChanged={e=>setOutput(`Value: ${e.newValue??'empty'}`)}/></StackPanel>
 {/* @sample:composed-number-format:end */}
 </SceneView></Example></>}
 {kind==='ContentDialog'&&<Example name="composed-dialog-no-default" kind={kind} sample={1} output={output}><SceneView {...shared} style={{height:420}} onReady={s=>remember('ContentDialogNoDefault',s)}>
 {/* @sample:composed-dialog-no-default:start */}
 <Button text="Show dialog without default" horizontalAlignment={HorizontalAlignment.Left} verticalAlignment={VerticalAlignment.Top} margin={[24,24,0,0]} enabled={enabled} onClick={()=>{void dialogWithoutDefault?.showAsync().then(result=>setOutput(`Result: ${result}`));}}/><ContentDialog title="Save your work?" primaryButtonText="Save" secondaryButtonText="Don't save" closeButtonText="Cancel" defaultButton={ContentDialogButton.None} onReady={setDialogWithoutDefault}><TextBlock text="Lorem ipsum dolor sit amet, adipisicing elit." wrap/><CheckBox text="Upload your content to the cloud."/></ContentDialog>
 {/* @sample:composed-dialog-no-default:end */}
 </SceneView></Example>}
 {kind==='TeachingTip'&&<>
 <Example name="composed-teaching-untargeted" kind={kind} sample={1} output={output}><SceneView {...shared} style={{height:360}} onReady={s=>remember('TeachingTipUntargeted',s)}>
 {/* @sample:composed-teaching-untargeted:start */}
 <Button text="Show non-targeted teaching tip" horizontalAlignment={HorizontalAlignment.Left} verticalAlignment={VerticalAlignment.Top} margin={[24,24,0,0]} enabled={enabled} onClick={()=>setTipUntargeted(true)}/><TeachingTip isOpen={tipUntargeted} title="This is the title" subtitle="And this is the subtitle" actionButtonContent="Action button" closeButtonText="Close button" isLightDismissEnabled placementMargin={[20,20,20,20]} preferredPlacement={TeachingTipPlacementMode.Auto} onActionButtonClick={()=>setOutput('Action invoked')} onClosed={()=>setTipUntargeted(false)}/>
 {/* @sample:composed-teaching-untargeted:end */}
 </SceneView></Example>
 <Example name="composed-teaching-hero" kind={kind} sample={2} output={output}><SceneView {...shared} style={{height:520}} onReady={s=>remember('TeachingTipHero',s)}>
 {/* @sample:composed-teaching-hero:start */}
 <Button text="Show teaching tip with hero" horizontalAlignment={HorizontalAlignment.Left} verticalAlignment={VerticalAlignment.Top} margin={[220,24,0,0]} enabled={enabled} name="hero-target" onClick={()=>setHeroOpen(true)}/><TeachingTip target="hero-target" isOpen={heroOpen} title="This is the title" subtitle="And this is the subtitle" preferredPlacement={TeachingTipPlacementMode.Bottom}  onClosed={()=>setHeroOpen(false)}>
 <TeachingTip.HeroContent><Image source="/official/sunset.jpg" height={140} stretch={ImageStretch.UniformToFill} accessibleName="Sunset"/></TeachingTip.HeroContent><TextBlock text="Description can go here" margin={[0,16,0,0]} wrap/></TeachingTip>
 {/* @sample:composed-teaching-hero:end */}
 </SceneView></Example></>}
 </main></>;
}
