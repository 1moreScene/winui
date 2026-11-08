import type {LayoutOptions,BorderOptions,TextOptions,ScrollViewerOptions,SceneEvent,BrushValue,ScrollViewer,ScrollContentPresenter,Slider,CollectionView,TreeView} from './scene';
import type {Rect} from './sdk';
import type {ScrollView} from './scene';
import {Orientation,FlowDirection,ScrollingIndicatorMode,ScrollEventType} from './enums';

export interface ScrollBarOptions extends LayoutOptions {
 /** Native default 0. */ minimum?:number;
 /** Native default 1. */ maximum?:number;
 /** Range value, default 0; coerced to minimum..maximum by Rust. */ value?:number;
 /** Native default Vertical. */ orientation?:Orientation;
 /** Native default 0.1. */ smallChange?:number;
 /** Native default 1. */ largeChange?:number;
 /** Visible extent in the same units as value; default 0. */ viewportSize?:number;
 /** Default None; pointer hover expands the native indicator. */ indicatorMode?:ScrollingIndicatorMode;
 /** Default false; horizontal RTL also reverses the logical axis. */ isDirectionReversed?:boolean;
 /** Default LeftToRight; finite enum shared with the scene. */ flowDirection?:FlowDirection;
 /** Optional scrolling source. Rust synchronizes range, viewport and offset; null detaches. */ scrollTarget?:ScrollViewer|ScrollView|ScrollContentPresenter|CollectionView|TreeView|null;
}
/** A draggable Control; its default native template has no visible content.
 * Set background/border or compose a separate visual for a visible handle. */
export interface ThumbOptions extends BorderOptions {}
/** Native TickBar reads its templated Slider. The SDK uses a typed source reference. */
export interface TickBarOptions extends LayoutOptions {
 /** Slider supplies minimum, maximum, orientation, direction and tickFrequency. Default null draws no ticks. */ source?:Slider|null;
 /** Native tick brush; default follows SliderTickBarFill/Disabled. */ fill?:BrushValue|null;
}
export interface ScrollContentPresenterOptions extends ScrollViewerOptions {}
/** Rust-owned header/items/footer layout. The single content child is the items panel. */
export interface ItemsPresenterOptions extends BorderOptions {
 /** String header; default empty. HeaderContent supports a rich SDK subtree. */ header?:string;
 /** String footer; default empty. FooterContent supports a rich SDK subtree. */ footer?:string;
 /** Major items axis; default Vertical. */ orientation?:Orientation;
}
export interface ThumbDragStartedEvent extends SceneEvent {horizontalOffset:number;verticalOffset:number;}
export interface ThumbDragDeltaEvent extends SceneEvent {horizontalChange:number;verticalChange:number;}
export interface ThumbDragCompletedEvent extends ThumbDragDeltaEvent {canceled:boolean;}
export interface ScrollBarEvent extends SceneEvent {scroll:{eventType:ScrollEventType;newValue:number};}
export interface ScrollPrimitiveSnapshot {
 isDragging:boolean;
 bar:null|{thumb:Rect|null;smallDecrease:Rect;smallIncrease:Rect;largeDecrease:Rect;largeIncrease:Rect;travel:number;reversed:boolean};
 ticks:Rect[]|null;
 header:number|null;items:number|null;footer:number|null;
 hovered:string|null;expansion:number;
}
