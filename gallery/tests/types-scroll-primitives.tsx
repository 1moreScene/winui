import {ScrollBar,Thumb,TickBar,ItemsPresenter,ScrollContentPresenter,StackPanel,Button} from '../src/react';
import {Orientation,ScrollingIndicatorMode,ScrollEventType,type Slider,type ScrollViewer,type ScrollBar as Bar} from '../src/index';
export function Valid({slider,target}:{slider:Slider;target:ScrollViewer}){return <><ScrollBar orientation={Orientation.Vertical} viewportSize={40} indicatorMode={ScrollingIndicatorMode.MouseIndicator} scrollTarget={target} onScroll={e=>{const event:ScrollEventType=e.scroll.eventType;void event;}}/><Thumb background="#0078D4" onDragDelta={e=>{const x:number=e.horizontalChange;void x;}}/><TickBar source={slider}/><ItemsPresenter header="Header" footer={<Button text="Footer action"/>}><StackPanel/></ItemsPresenter><ScrollContentPresenter><StackPanel/></ScrollContentPresenter></>;}
// @ts-expect-error Closed choices require runtime enum values.
export const bare=<ScrollBar orientation="Vertical"/>;
// @ts-expect-error Wrong enum family.
export const incompatible=<ScrollBar indicatorMode={Orientation.Vertical}/>;
// @ts-expect-error Misspelled runtime member.
export const typo=<ScrollBar indicatorMode={ScrollingIndicatorMode.MuoseIndicator}/>;
// @ts-expect-error Plain numeric IDs are not public control references.
export const raw=<TickBar source={5}/>;
export function Lifecycle(bar:Bar){bar.update({maximum:200,viewportSize:40});bar.scrollTo(80);const release=bar.onScroll(event=>{const value:number=event.scroll.newValue;void value;});release();bar.dispose();}
