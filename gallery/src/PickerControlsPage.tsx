import { LocalizedText } from "./GalleryLanguage";
import { SourceCode } from './SourceCode';
import {useState,type ReactNode} from 'react';
import {Header} from './ButtonPage';
import {useGalleryTheme} from './gallery-theme';
import {GalleryButton,GalleryCheckBox,GalleryComboBox,GalleryOption,GalleryRadioButton,GalleryExpander,GalleryExpanderHeader} from './GalleryControls';
import {SceneView,StackPanel,CalendarView,CalendarDatePicker,DatePicker,TimePicker,ColorPicker,Rectangle} from 'winui-wasm/react';
import {RendererBackend,HorizontalAlignment,CalendarIdentifier,CalendarViewSelectionMode,ClockIdentifier,ColorSpectrumShape,type Scene} from 'winui-wasm';
import official from './official-picker-controls.json';
import pageSource from './PickerControlsPage.tsx?raw';
import {extractSampleSource} from './sample-source';
import './picker-gallery.css';

type Kind=keyof typeof official.controls;
declare global {interface Window {pickerScenes:Record<string,Scene>;}}
const remember=(id:string,s:Scene)=>{window.pickerScenes??={};window.pickerScenes[id]=s;};
const civil=(d:Date)=>`${d.getFullYear().toString().padStart(4,'0')}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
function exampleDate(now:Date){const target=new Date(now);target.setDate(1);target.setMonth(target.getMonth()+2);const last=new Date(target.getFullYear(),target.getMonth()+1,0).getDate();target.setDate(Math.min(now.getDate(),last));return civil(target);}
function Example({id,kind,sample=0,children,options,substitutions={}}:{id:string;kind:Kind;sample?:number;children:ReactNode;options?:ReactNode;substitutions?:Record<string,string|boolean>}){
 const [native,setNative]=useState(false),definition=official.controls[kind].samples[sample];
 const xaml=definition.xaml.replace(/\$\((\w+)\)/g,(_,key:string)=>typeof substitutions[key]==='boolean'?(substitutions[key]?'True':'False'):String(substitutions[key]??''));
 return <section id={id} className="example basic-example"><h2><LocalizedText>{definition.title}</LocalizedText></h2><div className="example-card"><div className={`basic-live${options?' with-options':''}`}><div className="basic-preview">{children}</div>{options&&<div className="options">{options}</div>}</div><GalleryExpander className="source"><GalleryExpanderHeader>Source code</GalleryExpanderHeader><div className="source-tabs"><GalleryButton className={!native?'active':''} onClick={()=>setNative(false)}>TypeScript / React</GalleryButton><GalleryButton className={native?'active':''} onClick={()=>setNative(true)}>Official XAML</GalleryButton></div><SourceCode language={native ? 'xaml' : 'tsx'}>{native?xaml:extractSampleSource(pageSource,id)}</SourceCode></GalleryExpander></div></section>;
}
export function PickerControlsPage({kind}:{kind:Kind}){
 const [theme,setTheme]=useGalleryTheme(),[backend,setBackend]=useState(RendererBackend.Canvas2D);
 const [groupLabels,setGroupLabels]=useState(true),[outOfScope,setOutOfScope]=useState(true),[selectionMode,setSelectionMode]=useState(CalendarViewSelectionMode.Single),[language,setLanguage]=useState(official.languages[0].code);
 const [calendarIdentifier,setCalendarIdentifier]=useState(CalendarIdentifier.Gregorian);
 const [alpha,setAlpha]=useState(false),[alphaSlider,setAlphaSlider]=useState(true),[alphaInput,setAlphaInput]=useState(true),[colorSlider,setColorSlider]=useState(true),[channelInput,setChannelInput]=useState(true),[hexInput,setHexInput]=useState(true),[more,setMore]=useState(false),[shape,setShape]=useState(ColorSpectrumShape.Box),[color,setColor]=useState('#ffffff');
 const [now]=useState(()=>new Date()),shared={theme,backend};
 const currentTime=now.getHours()*60+now.getMinutes(),formattedDate=exampleDate(now),minYear=`${now.getFullYear()}-01-01`,maxYear=`${now.getFullYear()+5}-12-31`;
 const calendarOptions=<div className="picker-calendar-options">
  <GalleryCheckBox horizontalAlignment={HorizontalAlignment.Stretch} checked={groupLabels} onValueChanged={setGroupLabels} label="IsGroupLabelVisible"/>
  <GalleryCheckBox horizontalAlignment={HorizontalAlignment.Stretch} checked={outOfScope} onValueChanged={setOutOfScope} label="IsOutOfScopeEnabled"/>
  <label>SelectionMode<GalleryComboBox fitWidth aria-label="SelectionMode" value={selectionMode} onValueChanged={v=>setSelectionMode(v as CalendarViewSelectionMode)}>{Object.values(CalendarViewSelectionMode).map(v=><GalleryOption key={v}>{v}</GalleryOption>)}</GalleryComboBox></label>
  <label>CalendarIdentifier<GalleryComboBox aria-label="CalendarIdentifier" value={calendarIdentifier} onValueChanged={v=>setCalendarIdentifier(v as CalendarIdentifier)}>{[...official.calendarIdentifiers,CalendarIdentifier.Chinese].map(v=><GalleryOption key={v}>{v}</GalleryOption>)}</GalleryComboBox></label>
  <label>Language<GalleryComboBox aria-label="Language" value={language} onValueChanged={setLanguage}>{official.languages.map(v=><GalleryOption key={v.code} value={v.code} disabled={!Intl.DateTimeFormat.supportedLocalesOf([v.code]).length}>{v.name}</GalleryOption>)}</GalleryComboBox></label>
 </div>;
 const colorOptions=<div className="picker-color-options">
  <GalleryCheckBox horizontalAlignment={HorizontalAlignment.Stretch} checked={more} onValueChanged={setMore} label="IsMoreButtonVisible"/>
  <GalleryCheckBox horizontalAlignment={HorizontalAlignment.Stretch} checked={colorSlider} onValueChanged={setColorSlider} label="IsColorSliderVisible"/>
  <GalleryCheckBox horizontalAlignment={HorizontalAlignment.Stretch} checked={channelInput} onValueChanged={setChannelInput} label="IsColorChannelTextInputVisible"/>
  <GalleryCheckBox horizontalAlignment={HorizontalAlignment.Stretch} checked={hexInput} onValueChanged={setHexInput} label="IsHexInputVisible"/>
  <GalleryCheckBox horizontalAlignment={HorizontalAlignment.Stretch} checked={alpha} onValueChanged={setAlpha} label="Alpha Enabled"/>
  <GalleryCheckBox horizontalAlignment={HorizontalAlignment.Stretch} checked={alphaSlider} onValueChanged={setAlphaSlider} disabled={!alpha} label="IsAlphaSliderVisible"/>
  <GalleryCheckBox horizontalAlignment={HorizontalAlignment.Stretch} checked={alphaInput} onValueChanged={setAlphaInput} disabled={!alpha} label="IsAlphaTextInputVisible"/>
  <div role="group" aria-label="Colorspectrum shape" className="picker-shape"><span>Colorspectrum shape</span>{Object.values(ColorSpectrumShape).map(v=><GalleryRadioButton key={v} name="picker-shape" checked={shape===v} onValueChanged={checked=>{if(checked)setShape(v);}} label={v}/>)}</div>
  <div className="picker-rectangle"><span>ColorPicker applied on a Rectangle</span><SceneView {...shared} autoHeight style={{height:100}} onReady={s=>remember('ColorPickerPreview',s)}><Rectangle height={100} fill={color} stroke={{resource:'TextControlBorderBrush'}} strokeThickness={1}/></SceneView></div>
 </div>;
 return <><Header title={kind} theme={theme} onTheme={setTheme}/><main className="stage-main official-motion picker-gallery"><div className="effects-options"><label>Renderer <GalleryComboBox aria-label="Renderer" value={backend} onValueChanged={v=>setBackend(v as RendererBackend)}>{Object.values(RendererBackend).map(v=><GalleryOption key={v}>{v}</GalleryOption>)}</GalleryComboBox></label></div>
 {kind==='CalendarView'&&<Example id="picker-calendar" kind={kind} options={calendarOptions} substitutions={{SelectionMode:selectionMode,IsGroupLabelVisible:groupLabels,IsOutOfScopeEnabled:outOfScope,Language:language,CalendarIdentifier:calendarIdentifier}}><SceneView {...shared} autoHeight onReady={s=>remember(kind,s)}>
 {/* @sample:picker-calendar:start */}
 <CalendarView language={language} isGroupLabelVisible={groupLabels} isOutOfScopeEnabled={outOfScope} calendarIdentifier={calendarIdentifier} selectionMode={selectionMode}/>
 {/* @sample:picker-calendar:end */}
 </SceneView></Example>}
 {kind==='CalendarDatePicker'&&<Example id="picker-calendar-date" kind={kind}><SceneView {...shared} autoHeight onReady={s=>remember(kind,s)}>
 {/* @sample:picker-calendar-date:start */}
 <CalendarDatePicker header="Calendar" placeholderText="Pick a date"/>
 {/* @sample:picker-calendar-date:end */}
 </SceneView></Example>}
 {kind==='DatePicker'&&<><Example id="picker-date" kind={kind}><SceneView {...shared} autoHeight onReady={s=>remember(kind,s)}>
 {/* @sample:picker-date:start */}
 <DatePicker header="Pick a date"/>
 {/* @sample:picker-date:end */}
 </SceneView></Example><Example id="picker-date-no-year" kind={kind} sample={1}><SceneView {...shared} autoHeight onReady={s=>remember('DatePickerFormatted',s)}>
 {/* @sample:picker-date-no-year:start */}
 <DatePicker dayFormat="{day.integer} ({dayofweek.abbreviated})" yearVisible={false} date={formattedDate} minDate={minYear} maxDate={maxYear}/>
 {/* @sample:picker-date-no-year:end */}
 </SceneView></Example></>}
 {kind==='TimePicker'&&<><Example id="picker-time" kind={kind}><SceneView {...shared} autoHeight onReady={s=>remember(kind,s)}>
 {/* @sample:picker-time:start */}
 <TimePicker/>
 {/* @sample:picker-time:end */}
 </SceneView></Example><Example id="picker-time-increments" kind={kind} sample={1}><SceneView {...shared} autoHeight onReady={s=>remember('TimePickerIncrements',s)}>
 {/* @sample:picker-time-increments:start */}
 <TimePicker header="Arrival time" minuteIncrement={15}/>
 {/* @sample:picker-time-increments:end */}
 </SceneView></Example><Example id="picker-time-24" kind={kind} sample={2}><SceneView {...shared} autoHeight onReady={s=>remember('TimePickerClocks',s)}>
 {/* @sample:picker-time-24:start */}
 <StackPanel spacing={8}><TimePicker clockIdentifier={ClockIdentifier.TwelveHour} header="12-hour clock" time={currentTime}/><TimePicker clockIdentifier={ClockIdentifier.TwentyFourHour} header="24-hour clock" time={currentTime}/></StackPanel>
 {/* @sample:picker-time-24:end */}
 </SceneView></Example></>}
 {kind==='ColorPicker'&&<Example id="picker-color" kind={kind} options={colorOptions} substitutions={{ColorSpectrumShape:shape,IsMoreButtonVisible:more,IsColorSliderVisible:colorSlider,IsColorChannelTextInputVisible:channelInput,IsHexInputVisible:hexInput,IsAlphaEnabled:alpha,IsAlphaSliderVisible:alphaSlider,IsAlphaTextInputVisible:alphaInput}}><SceneView {...shared} autoHeight onReady={s=>remember(kind,s)}>
 {/* @sample:picker-color:start */}
 <ColorPicker color={color} isMoreButtonVisible={more} isColorSliderVisible={colorSlider} isColorChannelTextInputVisible={channelInput} isHexInputVisible={hexInput} isAlphaEnabled={alpha} isAlphaSliderVisible={alphaSlider} isAlphaTextInputVisible={alphaInput} colorSpectrumShape={shape} onColorChanged={e=>{if(e.newColor)setColor(e.newColor);}}/>
 {/* @sample:picker-color:end */}
 </SceneView></Example>}
 </main></>;
}
