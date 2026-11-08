import { GalleryButton, GalleryCheckBox, GalleryComboBox, GalleryExpander, GalleryExpanderHeader, GalleryNumberBox, GalleryOption } from './GalleryControls';
import { useGalleryTheme } from './gallery-theme';
import {useEffect,useState,type ReactNode} from 'react';
import {Header} from './ButtonPage';
import {SceneView,InfoBar,PersonPicture,RatingControl,SplitButton,ToggleSplitButton,Flyout,Button,HyperlinkButton,TextBlock,StackPanel,GridView,VariableSizedWrapGrid,Rectangle,Border,SymbolIcon,Slider} from './react';
import {ThemeMode,RendererBackend,InfoBarSeverity,Orientation,HorizontalAlignment,VerticalAlignment,Symbol,GridUnit,OverlayPlacement,type Scene,type FloatingSurface,type FlyoutOptions} from './index';
import official from './official-compact-controls.json';
import source from './CompactControlsPage.tsx?raw';
import {extractSampleSource} from './sample-source';
type Kind=keyof typeof official.controls;
declare global{interface Window{compactScenes:Record<string,Scene>;}}
function remember(name:string,scene:Scene){window.compactScenes??={};window.compactScenes[name]=scene;}
function Example({kind,index,name,children,options}:{kind:Kind;index:number;name:string;children:ReactNode;options?:ReactNode}){const[native,setNative]=useState(false);return <section className="example basic-example" id={name}><h2>{official.controls[kind].samples[index].title}</h2><div className="example-card"><div className={`basic-live ${options?'with-options':''}`}><div className="basic-preview">{children}</div>{options&&<div className="options">{options}</div>}</div><GalleryExpander className="source"><GalleryExpanderHeader>Source code</GalleryExpanderHeader><div className="source-tabs"><GalleryButton className={!native?'active':''} onClick={()=>setNative(false)}>TypeScript / React</GalleryButton><GalleryButton className={native?'active':''} onClick={()=>setNative(true)}>Official XAML</GalleryButton></div><pre><code>{native?official.controls[kind].samples[index].xaml:extractSampleSource(source,name)}</code></pre></GalleryExpander></div></section>;}
const message='Essential app message for your users to be informed of, acknowledge, or take action on.';
const longMessage='A long essential app message for your users to be informed of, acknowledge, or take action on. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin dapibus dolor vitae justo rutrum, ut lobortis nibh mattis. Aenean id elit commodo, semper felis nec.';
const swatches=[['Red','#ff0000'],['Orange','#ffa500'],['Yellow','#ffff00'],['Green','#008000'],['Blue','#0000ff'],['Indigo','#4b0082'],['Violet','#ee82ee'],['Gray','#808080'],['Black','#000000']] as const;
const swatchItems=swatches.slice(0,8).map(([name,fill])=>({id:name,text:name,fill}));
export function CompactControlsPage({kind}:{kind:Kind}){
 const[theme,setTheme]=useGalleryTheme(),[backend,setBackend]=useState(RendererBackend.Canvas2D);
 const[severity,setSeverity]=useState(InfoBarSeverity.Informational),[open,setOpen]=useState(true),[open2,setOpen2]=useState(true),[open3,setOpen3]=useState(true),[closable,setClosable]=useState(true),[icon,setIcon]=useState(true),[long,setLong]=useState(true),[action,setAction]=useState('None'),[actions,setActions]=useState(0),[cancel,setCancel]=useState(false);
 const[profile,setProfile]=useState('Profile Image'),[badge,setBadge]=useState(0);
 const[value,setValue]=useState(-1),[clear,setClear]=useState(false),[readOnly,setReadOnly]=useState(false),[placeholder,setPlaceholder]=useState(0);
 const[color,setColor]=useState('#008000'),[applied,setApplied]=useState('#008000'),[palette,setPalette]=useState<FloatingSurface<FlyoutOptions>|null>(null),[palette2,setPalette2]=useState<FloatingSurface<FlyoutOptions>|null>(null),[listFlyout,setListFlyout]=useState<FloatingSurface<FlyoutOptions>|null>(null),[checked,setChecked]=useState(false),[listStyle,setListStyle]=useState('Bulleted list');
 useEffect(()=>{document.documentElement.dataset.theme=theme;},[theme]);const shared={theme,backend};
 return <><Header title={kind} theme={theme} onTheme={setTheme}/><main className="stage-main official-motion compact-gallery"><div className="effects-options"><label>Renderer <GalleryComboBox aria-label="Compact renderer" value={backend} onValueChanged={e=>setBackend(e as RendererBackend)}>{Object.values(RendererBackend).map(v=><GalleryOption key={v}>{v}</GalleryOption>)}</GalleryComboBox></label></div>
 {kind==='InfoBar'&&<>
 <Example kind={kind} index={0} name="info-severity" options={<><GalleryCheckBox  checked={open} onValueChanged={e=>setOpen(e)}  label={<>Is Open</>}/><label>Severity<GalleryComboBox aria-label="Severity" value={severity} onValueChanged={e=>setSeverity(e as InfoBarSeverity)}>{Object.values(InfoBarSeverity).map(v=><GalleryOption key={v}>{v}</GalleryOption>)}</GalleryComboBox></label><GalleryCheckBox  checked={cancel} onValueChanged={e=>setCancel(e)}  label={<>Cancel close</>}/></>}>
 <SceneView {...shared} style={{height:180}} onReady={s=>remember('info-severity',s)}>
  {/* @sample:info-severity:start */}
  <InfoBar title="Title" message={message} severity={severity} isOpen={open}
    onClosing={e=>{e.cancel=cancel;}} onClosed={()=>setOpen(false)}/>
  {/* @sample:info-severity:end */}
 </SceneView></Example>
 <Example kind={kind} index={1} name="info-action" options={<><GalleryCheckBox  checked={open2} onValueChanged={e=>setOpen2(e)}  label={<>Action InfoBar open</>}/><label>Message Length<GalleryComboBox aria-label="Message Length" value={long?'Long':'Short'} onValueChanged={e=>setLong(e==='Long')}><GalleryOption>Short</GalleryOption><GalleryOption>Long</GalleryOption></GalleryComboBox></label><label>Action Button<GalleryComboBox aria-label="Action Button" value={action} onValueChanged={e=>setAction(e)}>{['None','Button','Hyperlink'].map(v=><GalleryOption key={v}>{v}</GalleryOption>)}</GalleryComboBox></label><output>Action count: {actions}</output></>}>
 <SceneView {...shared} style={{height:320}} onReady={s=>remember('info-action',s)}>
  {/* @sample:info-action:start */}
  <InfoBar title="Title" message={long?longMessage:message} isOpen={open2} onClosed={()=>setOpen2(false)}
    action={action==='None'?undefined:action==='Hyperlink'?<HyperlinkButton text="Informational link" navigateUri="https://www.microsoft.com/" minHeight={24}/>:<Button text="Action" minWidth={96} minHeight={24} padding={[8,0,8,1]} onClick={()=>setActions(c=>c+1)}/>}/>
  {/* @sample:info-action:end */}
 </SceneView></Example>
 <Example kind={kind} index={2} name="info-options" options={<><GalleryCheckBox  checked={open3} onValueChanged={e=>setOpen3(e)}  label={<>Options InfoBar open</>}/><GalleryCheckBox  checked={icon} onValueChanged={e=>setIcon(e)}  label={<>Is Icon Visible</>}/><GalleryCheckBox  checked={closable} onValueChanged={e=>setClosable(e)}  label={<>Is Closable</>}/></>}>
 <SceneView {...shared} style={{height:180}} onReady={s=>remember('info-options',s)}>
  {/* @sample:info-options:start */}
  <InfoBar title="Title" message={message} isOpen={open3} isClosable={closable}
    isIconVisible={icon} onClosed={()=>setOpen3(false)}/>
  {/* @sample:info-options:end */}
 </SceneView></Example></>}
 {kind==='PersonPicture'&&<Example kind={kind} index={0} name="person-picture" options={<><label>Profile type<GalleryComboBox aria-label="Profile type" value={profile} onValueChanged={e=>setProfile(e)}>{['Profile Image','Display Name','Initials','Default','Group'].map(v=><GalleryOption key={v}>{v}</GalleryOption>)}</GalleryComboBox></label><label>Badge number<GalleryNumberBox  aria-label="Badge number" value={badge} onValueChanged={e=>setBadge(e||0)}/></label></>}>
 <SceneView {...shared} style={{height:340}} onReady={s=>remember('person-picture',s)}>
  {/* @sample:person-picture:start */}
  <PersonPicture height={300} horizontalAlignment={HorizontalAlignment.Left} verticalAlignment={VerticalAlignment.Top}
    profilePicture={profile==='Profile Image'?'/official/person-profile.png':''}
    displayName={profile==='Display Name'?'Jane Doe':''} initials={profile==='Initials'?'SB':''}
    isGroup={profile==='Group'} badgeNumber={badge}/>
  {/* @sample:person-picture:end */}
 </SceneView></Example>}
 {kind==='RatingControl'&&<>
 <Example kind={kind} index={0} name="rating-simple" options={<><GalleryCheckBox  checked={clear} onValueChanged={e=>setClear(e)}  label={<>IsClearEnabled</>}/><p>Swipe left or click again to clear your rating.</p><GalleryCheckBox  checked={readOnly} onValueChanged={e=>setReadOnly(e)}  label={<>IsReadOnly</>}/><output aria-label="Rating value">{value}</output></>}>
 <SceneView {...shared} style={{height:100}} onReady={s=>remember('rating-simple',s)}>
  {/* @sample:rating-simple:start */}
  <RatingControl accessibleName="Simple RatingControl" caption="312 ratings" value={value}
    isClearEnabled={clear} isReadOnly={readOnly} onValueChanged={e=>setValue(e.value!)}/>
  {/* @sample:rating-simple:end */}
 </SceneView></Example>
 <Example kind={kind} index={1} name="rating-placeholder" options={<SceneView {...shared} style={{height:100}}><Slider header="PlaceholderValue" accessibleName="PlaceholderValue" minimum={0} maximum={5} value={placeholder} stepFrequency={.5} smallChange={.5} width={180} onValueChanged={e=>setPlaceholder(e.value!)}/></SceneView>}>
 <SceneView {...shared} style={{height:100}} onReady={s=>remember('rating-placeholder',s)}>
  {/* @sample:rating-placeholder:start */}
  <RatingControl accessibleName="RatingControl with placeholder" placeholderValue={placeholder}/>
  {/* @sample:rating-placeholder:end */}
 </SceneView></Example></>}
 {kind==='SplitButton'&&<>
 <p>The palettes now use the shared GridView/ItemsWrapGrid and VariableSizedWrapGrid controls. RichEditBox remains pending; TextBlock previews the chosen color.</p>
 <Example kind={kind} index={0} name="split-color" options={<SceneView {...shared} style={{height:120}}><TextBlock text="Type something here" foreground={applied}/></SceneView>}>
 <SceneView {...shared} style={{height:300}} onReady={s=>remember('split-color',s)}>
  {/* @sample:split-color:start */}
  <SplitButton accessibleName="Font color" padding={[0,0,0,0]} verticalAlignment={VerticalAlignment.Top} onClick={()=>setApplied(color)}>
    <Border width={32} height={32} background={color} cornerRadii={[4,0,0,4]}/>
    <Flyout placement={OverlayPlacement.Bottom} onReady={setPalette}>
      <GridView items={swatchItems} orientation={Orientation.Horizontal} maximumRowsOrColumns={3} isItemClickEnabled accessibleName="Color swatches"
        onItemClick={e=>{setColor(e.item.fill);setApplied(e.item.fill);palette?.hide();}}
        renderItem={item=><Rectangle width={32} height={32} fill={item.fill} radiusX={4} radiusY={4}/>}/>
    </Flyout>
  </SplitButton>
  {/* @sample:split-color:end */}
 </SceneView></Example>
 <Example kind={kind} index={1} name="split-text">
 <SceneView {...shared} style={{height:300}} onReady={s=>remember('split-text',s)}>
  {/* @sample:split-text:start */}
  <SplitButton text="Choose color" padding={[5,5,5,5]} accessibleName="Font color with text" verticalAlignment={VerticalAlignment.Top}>
    <Flyout placement={OverlayPlacement.Bottom} onReady={setPalette2}>
      <VariableSizedWrapGrid maximumRowsOrColumns={3} orientation={Orientation.Horizontal}>
        {swatches.map(([name,fill])=><Button key={name} accessibleName={name} margin={[6,6,6,6]} minWidth={0} minHeight={0} padding={[0,0,0,0]} onClick={()=>palette2?.hide()}><Rectangle width={32} height={32} fill={fill} radiusX={4} radiusY={4}/></Button>)}
      </VariableSizedWrapGrid>
    </Flyout>
  </SplitButton>
  {/* @sample:split-text:end */}
 </SceneView></Example></>}
 {kind==='ToggleSplitButton'&&<Example kind={kind} index={0} name="toggle-split" options={<><p>RichEditBox is pending; TextBlock previews the list selection.</p><output aria-label="List selection">{checked?listStyle:'Off'}</output></>}>
 <SceneView {...shared} style={{height:260}} onReady={s=>remember('toggle-split',s)}>
  {/* @sample:toggle-split:start */}
  <StackPanel spacing={24}>
    <ToggleSplitButton accessibleName="Bullets" isChecked={checked} onIsCheckedChanged={e=>setChecked(e.isChecked===true)}>
      <SymbolIcon symbol={listStyle==='Bulleted list'?Symbol.List:Symbol.Bullets}/>
      <Flyout placement={OverlayPlacement.Bottom} onReady={setListFlyout}>
        <StackPanel orientation={Orientation.Horizontal}>
          <Button accessibleName="Bulleted list" padding={[4,4,4,4]} margin={[6,6,6,6]} minWidth={0} minHeight={0} onClick={()=>{setListStyle('Bulleted list');setChecked(true);listFlyout?.hide();}}><SymbolIcon symbol={Symbol.List}/></Button>
          <Button accessibleName="Roman numerals list" padding={[4,4,4,4]} margin={[6,6,6,6]} minWidth={0} minHeight={0} onClick={()=>{setListStyle('Roman numerals list');setChecked(true);listFlyout?.hide();}}><SymbolIcon symbol={Symbol.Bullets}/></Button>
        </StackPanel>
      </Flyout>
    </ToggleSplitButton>
    <TextBlock text={checked?(listStyle==='Bulleted list'?'• First item\n• Second item':'I. First item\nII. Second item'):'First item\nSecond item'}/>
  </StackPanel>
  {/* @sample:toggle-split:end */}
 </SceneView></Example>}
 </main></>;
}
