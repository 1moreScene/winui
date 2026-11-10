import {CalendarIdentifier, CalendarViewDisplayMode, DayOfWeek} from 'winui-wasm';
import {CalendarView, CalendarDatePicker, DatePicker} from 'winui-wasm/react';

export const calendars = <>
  <CalendarView calendarIdentifier={CalendarIdentifier.Chinese}/>
  <CalendarDatePicker calendarIdentifier={CalendarIdentifier.Hebrew}/>
  <DatePicker calendarIdentifier={CalendarIdentifier.Japanese}/>
  <CalendarView language="zh-CN" firstDayOfWeek={DayOfWeek.Sunday}/>
  <CalendarDatePicker language="zh-CN" firstDayOfWeek={null}/>
</>;
// @ts-expect-error Calendar identifiers require the public enum.
export const raw = <CalendarView calendarIdentifier="ChineseCalendar"/>;
// @ts-expect-error Different enums cannot select a calendar.
export const wrong = <CalendarDatePicker calendarIdentifier={CalendarViewDisplayMode.Month}/>;
// @ts-expect-error Misspelled members are rejected.
export const misspelled = <DatePicker calendarIdentifier={CalendarIdentifier.Chines}/>;
// @ts-expect-error Weekday overrides still require the public enum.
export const rawWeekday = <CalendarView firstDayOfWeek="Monday"/>;
