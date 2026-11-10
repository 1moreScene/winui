import type {LayoutOptions,SceneEvent} from './scene';
import {NodeKind,ClockIdentifier} from './enums';
type Rect={x:number;y:number;width:number;height:number};
import type {CalendarIdentifier,CalendarViewDisplayMode,CalendarViewSelectionMode,DayOfWeek,ColorSpectrumShape,ColorSpectrumComponents,ColorRepresentation,Orientation} from './enums';

/** Gregorian civil date in YYYY-MM-DD format. No timezone conversion or time-of-day truncation is performed. */
export type CalendarDate = string;
/** Minutes since local midnight, in [0,1439]. Null means no selection. */
export type PickerTime = number;
export interface CalendarOptions extends LayoutOptions {
  language?:string; formatLanguage?:string;
  today?:CalendarDate; displayDate?:CalendarDate; minDate?:CalendarDate; maxDate?:CalendarDate;
  /** Calendar for display, navigation and date wheels. Default Gregorian. Chinese includes lunar dates, festivals and solar terms for 1901–2100 (UTC+8), with no workday/leave schedules. Values and events remain Gregorian YYYY-MM-DD. */
  calendarIdentifier?:CalendarIdentifier;
  /** Override the first weekday. Omit or pass null to follow the calendar language: Chinese starts on Monday; other languages retain Sunday. */
  firstDayOfWeek?:DayOfWeek|null;
  numberOfWeeks?:number;
  isGroupLabelVisible?:boolean; isOutOfScopeEnabled?:boolean; isTodayHighlighted?:boolean;
  fontSize?:number; fontFamily?:string; fontWeight?:number;
}
export interface CalendarViewOptions extends CalendarOptions {
  selectedDates?:readonly CalendarDate[]; blackoutDates?:readonly CalendarDate[];
  densityColors?:Readonly<Record<CalendarDate,readonly string[]>>;
  displayMode?:CalendarViewDisplayMode; selectionMode?:CalendarViewSelectionMode;
  yearColumns?:number; yearRows?:number;
}
export interface CalendarDatePickerOptions extends CalendarOptions {
  date?:CalendarDate|null; header?:string; placeholderText?:string; isCalendarOpen?:boolean;
}
export interface DatePickerOptions extends CalendarOptions {
  date?:CalendarDate|null; header?:string; isOpen?:boolean;
  /** Day field pattern. Default `day`; supports `{day.integer}` and `{dayofweek.abbreviated}` with literal text. Unsupported brace tokens throw. */
  dayFormat?:string;
  dayVisible?:boolean; monthVisible?:boolean; yearVisible?:boolean;
}
export interface TimePickerOptions extends LayoutOptions {
  time?:PickerTime|null; header?:string; isOpen?:boolean; language?:string; formatLanguage?:string;
  clockIdentifier?:ClockIdentifier; minuteIncrement?:number; nowMinutes?:number;
  fontSize?:number; fontFamily?:string; fontWeight?:number;
}
export interface ColorPickerOptions extends LayoutOptions {
  /** CSS #RRGGBB / #RRGGBBAA. The native hex editor displays #AARRGGBB when alpha is enabled. */
  color?:string; previousColor?:string|null; orientation?:Orientation;
  language?:string; formatLanguage?:string;
  isAlphaEnabled?:boolean; isColorSpectrumVisible?:boolean; isColorPreviewVisible?:boolean;
  isColorSliderVisible?:boolean; isAlphaSliderVisible?:boolean; isMoreButtonVisible?:boolean;
  isColorChannelTextInputVisible?:boolean; isAlphaTextInputVisible?:boolean; isHexInputVisible?:boolean;
  minHue?:number; maxHue?:number; minSaturation?:number; maxSaturation?:number; minValue?:number; maxValue?:number;
  colorSpectrumShape?:ColorSpectrumShape; colorSpectrumComponents?:ColorSpectrumComponents; colorRepresentation?:ColorRepresentation;
}
export interface PickerEvent extends SceneEvent {
  oldDate?:CalendarDate|null; newDate?:CalendarDate|null; date?:CalendarDate|null;
  oldTime?:PickerTime|null; newTime?:PickerTime|null; time?:PickerTime|null;
  addedDates?:CalendarDate[]; removedDates?:CalendarDate[]; selectedDates?:CalendarDate[];
  oldColor?:string; newColor?:string; color?:string;
  oldMode?:CalendarViewDisplayMode; newMode?:CalendarViewDisplayMode;
}
export interface PickerSnapshot {
  /** Rust ChangeView trajectory, present during calendar paging. */
  pageTransition?:{progress:number;distance:number;offset:number};
  parts:Record<string,number>;
  cells:{node:number;date:CalendarDate;text:string;calendarDay:{year:number;month:number;monthNumber:number;day:number;leapMonth:boolean;daysInMonth:number;monthsInYear:number;era:string;eraYear:number};annotation:string;festivals:string[];solarTerm:string|null;bounds:Rect;outOfScope:boolean;blackout:boolean;selected:boolean;today:boolean}[];
  spectrum:Rect;preview:Rect;hsv:[number,number,number,number]|null;moreExpanded:boolean;
}
export const pickerKinds:readonly NodeKind[]=[NodeKind.CalendarView,NodeKind.CalendarDatePicker,NodeKind.DatePicker,NodeKind.TimePicker,NodeKind.ColorPicker];
const pickerKeys=new Set('date time today nowMinutes displayDate minDate maxDate selectedDates blackoutDates densityColors calendarIdentifier displayMode calendarSelectionMode firstDayOfWeek numberOfWeeks yearColumns yearRows isGroupLabelVisible isOutOfScopeEnabled isTodayHighlighted dayVisible dayFormat monthVisible yearVisible clockIdentifier minuteIncrement color previousColor isAlphaEnabled isColorSpectrumVisible isColorPreviewVisible isColorSliderVisible isAlphaSliderVisible isMoreButtonVisible isColorChannelTextInputVisible isAlphaTextInputVisible isHexInputVisible minHue maxHue minSaturation maxSaturation minValue maxValue colorSpectrumShape colorSpectrumComponents colorRepresentation'.split(' '));

/** Intl supplies platform strings only. Rust owns dates, selection, rendering and interaction. */
export function pickerLocale(language?:string,format=false){
  const date=(year:number,month:number,day:number)=>new Date(Date.UTC(year,month-1,day,12));
  const formatter=(options:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat(language,{calendar:'gregory',timeZone:'UTC',...options});
  const lang=formatter({}).resolvedOptions().locale,zh=lang.startsWith('zh'),ja=lang.startsWith('ja'),ko=lang.startsWith('ko');
  const digits=Array.from({length:10},(_,i)=>new Intl.NumberFormat(language,{useGrouping:false}).format(i));
  const months=Array.from({length:12},(_,i)=>format&&(zh||ja||ko)?`${i+1}${ko?'월':'月'}`:formatter({month:'long'}).format(date(2026,i+1,1)));
  const shortMonths=Array.from({length:12},(_,i)=>formatter({month:'short'}).format(date(2026,i+1,1)));
  const weekdays=Array.from({length:7},(_,i)=>formatter({weekday:'short'}).format(date(2026,11,1+i)).replace(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/,s=>s.slice(0,2)));
  const dateParts=formatter({year:'numeric',month:'numeric',day:'numeric'}).formatToParts(date(2026,11,8));
  const dateOrder=dateParts.filter(p=>['year','month','day'].includes(p.type)).map(p=>p.type);
  const timeParts=formatter({hour:'numeric',minute:'numeric',hour12:true}).formatToParts(date(2026,11,8));
  const timeOrder=timeParts.filter(p=>['hour','minute','dayPeriod'].includes(p.type)).map(p=>p.type==='dayPeriod'?'period':p.type);
  const monthYear=formatter({year:'numeric',month:'long'}).formatToParts(date(2026,11,8));
  const labels=zh?{year:'年',month:'月',day:'天',hour:'小时',minute:'分钟',red:'红色',green:'绿色',blue:'蓝色',hue:'色调',saturation:'饱和度',value:'明度',alpha:'透明度',more:'更多',less:'更少',accept:'接受',dismiss:'取消'}:undefined;
  const abbreviatedWeekdays=Array.from({length:7},(_,i)=>formatter({weekday:'short'}).format(date(2026,11,1+i)));
  return {language:lang,digits,months,shortMonths,weekdays,abbreviatedWeekdays,dateOrder,timeOrder,
    monthYearOrder:monthYear.filter(p=>p.type==='year'||p.type==='month').map(p=>p.type),monthYearSeparator:zh||ja||ko?'':' ',
    yearSuffix:zh||ja?'年':ko?'년':'',daySuffix:zh||ja?'日':ko?'일':'',dateSeparator:dateParts.find(p=>p.type==='literal')?.value.trim()||'/',
    periods:[0,13].map(h=>{const d=date(2026,11,8);d.setUTCHours(h);return formatter({hour:'numeric',hour12:true}).formatToParts(d).find(p=>p.type==='dayPeriod')?.value??(h?'PM':'AM');}),...(labels?{labels}:{})};
}
export function normalizePicker(kind:NodeKind,options:object,initial=false):object {
  if(!pickerKinds.includes(kind))return options;
  const p={...options} as Record<string,unknown>,q={...(p.pickerControls as object??{})} as Record<string,unknown>;
  if(initial){const now=new Date();q.today=`${now.getFullYear().toString().padStart(4,'0')}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}`;q.nowMinutes=now.getHours()*60+now.getMinutes();}
  if(initial||Object.hasOwn(p,'language')||Object.hasOwn(p,'formatLanguage')){
    if(initial||Object.hasOwn(p,'language'))q.calendarLocale=pickerLocale(p.language as string|undefined);
    q.formatLocale=pickerLocale((p.formatLanguage??p.language) as string|undefined,true);
    if(initial&&kind===NodeKind.TimePicker&&!Object.hasOwn(p,'clockIdentifier'))q.clockIdentifier=new Intl.DateTimeFormat((p.formatLanguage??p.language) as string|undefined,{hour:'numeric'}).resolvedOptions().hour12?ClockIdentifier.TwelveHour:ClockIdentifier.TwentyFourHour;
  }
  delete p.language;delete p.formatLanguage;
  if(kind===NodeKind.CalendarView&&Object.hasOwn(p,'selectionMode')){q.calendarSelectionMode=p.selectionMode;delete p.selectionMode;}
  if(Object.hasOwn(p,'isCalendarOpen')){p.isOpen=p.isCalendarOpen;delete p.isCalendarOpen;}
  for(const key of pickerKeys)if(Object.hasOwn(p,key)){q[key]=p[key];delete p[key];}
  p.pickerControls=q;return p;
}
