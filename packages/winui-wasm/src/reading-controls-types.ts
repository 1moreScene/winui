import type {LayoutOptions,TextOptions,BorderOptions,CollectionViewOptions,CollectionItem,SceneEvent,ScrollViewer,CollectionView} from './scene';
import type {StackLayout,UniformGridLayout,FlowLayout,LinedFlowLayout} from './repeater-refresh-types';
import {PagerControlDisplayMode,PagerControlButtonVisibility,AnnotatedScrollBarScrollingEventKind} from './enums';
/** Native ItemsView selection maps to the SDK's shared selection enum. */
export interface ItemsViewOptions<T extends CollectionItem=CollectionItem> extends CollectionViewOptions<T> {
 /** Default StackLayout. Rust executes the layout; supports StackLayout, UniformGridLayout and LinedFlowLayout. */ layout?:StackLayout|UniformGridLayout|LinedFlowLayout;
 /** Optional intrinsic aspect-ratio data. If omitted, Rust estimates from the first measured template. */ itemAspectRatios?:readonly number[];
 /** Native default false. Invokes an item independently of selection. */ isItemInvokedEnabled?:boolean;
}
export type PagerButtonStyle=Pick<import('./scene').ButtonOptions,'width'|'height'|'minWidth'|'minHeight'|'padding'|'margin'|'background'|'foreground'|'fontSize'|'fontFamily'|'fontWeight'|'variant'>;
export interface PagerControlOptions extends LayoutOptions {
 /** Native navigation/input commands. Default null. Business execution remains in callbacks. */ firstButtonCommand?:import('./scene').UICommand|null;previousButtonCommand?:import('./scene').UICommand|null;nextButtonCommand?:import('./scene').UICommand|null;lastButtonCommand?:import('./scene').UICommand|null;pagerInputCommand?:import('./scene').UICommand|null;
 /** Rust applies styles to owned template parts. Default native styles. */ firstButtonStyle?:PagerButtonStyle;previousButtonStyle?:PagerButtonStyle;nextButtonStyle?:PagerButtonStyle;lastButtonStyle?:PagerButtonStyle;numberButtonStyle?:PagerButtonStyle;

 /** Default Auto: ComboBox for fewer than 10 pages, NumberBox otherwise. */ displayMode?:PagerControlDisplayMode;
 /** Default 0. -1 means an unknown page count. */ numberOfPages?:number;
 /** Zero-based, default 0; Rust coerces to the known range. */ selectedPageIndex?:number;
 /** Default Visible; HiddenOnEdge retains its layout space. */ firstButtonVisibility?:PagerControlButtonVisibility;
 /** Default Visible. */ previousButtonVisibility?:PagerControlButtonVisibility;
 /** Default Visible. */ nextButtonVisibility?:PagerControlButtonVisibility;
 /** Default Visible. */ lastButtonVisibility?:PagerControlButtonVisibility;
 /** Default true. Retain the first and last page buttons in ButtonPanel. */ buttonPanelAlwaysShowFirstLastPageIndex?:boolean;
 /** Default Page. Open localized text supplied by the application. */ prefixText?:string;
 /** Default empty: show the known total. */ suffixText?:string;
}
export interface AnnotatedScrollBarLabel {text:string;scrollOffset?:number;/** Optional source item anchor; Rust resolves it after layout. */itemIndex?:number;}
export interface AnnotatedScrollBarOptions extends LayoutOptions {
 /** Optional item source for itemIndex anchors and row-aware previews. */ labelItemSource?:import('./scene').ItemsRepeater<any>|string|null;
 /** Default empty. Labels are positioned and deconflicted by Rust. */ labels?:readonly AnnotatedScrollBarLabel[];
 /** Optional same-scene scroll controller. Rust follows its range/offset directly. */ scrollTarget?:ScrollViewer|CollectionView|string|null;
 /** Standalone range, default 0..0. Ignored while a target is attached. */ minimum?:number;maximum?:number;
 /** Standalone viewport and offset, default 0. */ viewportSize?:number;value?:number;
 /** Default 0: derive from viewport / 8. */ smallChange?:number;
 /** Default null. Styles a default label in Rust. */ labelStyle?:Pick<TextOptions,'fontSize'|'fontFamily'|'fontWeight'|'foreground'|'margin'>;
 /** Default Segoe UI, 14 DIP. */ fontFamily?:string;fontSize?:number;
}
export interface AnnotatedScrollingEvent extends SceneEvent {scrollOffset:number;scrollingEventKind:AnnotatedScrollBarScrollingEventKind;}
export interface PagerIndexChangedEvent extends SceneEvent {previousPageIndex:number;newPageIndex:number;}
/** Native runs flattened into typed data; layout, glyph metrics and hit regions live in Rust. */
export interface RichTextRun {
 text:string;
 /** Stable name of an SDK inline slot created with rich.inline(name), or RichInline. */ inline?:string;
 /** Defaults inherit the RichTextBlock font. */ fontSize?:number;fontWeight?:number;fontStyle?:import('./enums').FontStyle;
 /** Default inherited foreground. */ foreground?:import('./scene').BrushValue;
 /** Default false. */ underline?:boolean;strikethrough?:boolean;
 /** Open business link ID or URI. Rust emits HyperlinkClick; the caller handles navigation. */ link?:string;
}
export interface RichTextParagraph {runs:readonly RichTextRun[];/** Default zero, [left,top,right,bottom] DIP. */margin?:[number,number,number,number];}
export interface TextRange {startIndex:number;length:number;}
export interface TextHighlighter {ranges:readonly TextRange[];/** Default SDK TextControlHighlighterBackground. */background?:string|{readonly resource:string};/** Default SDK TextControlHighlighterForeground. */foreground?:string|{readonly resource:string};}
export interface RichTextBlockOverflowOptions extends LayoutOptions {
 /** Next linked container, default null. Rust validates ownership and rejects cycles. */ overflowContentTarget?:import('./scene').RichTextBlockOverflow|string|null;
}
export interface RichTextBlockOptions extends TextOptions,RichTextBlockOverflowOptions {
 /** Default Left. */ textAlignment?:import('./enums').TextAlignment;
 /** Default true. Selection and UTF-16 positions are owned by Rust. */ isTextSelectionEnabled?:boolean;
 /** Default accent resource. */ selectionHighlightColor?:string;
 /** Default empty. Logical UTF-16 ranges, like native TextHighlighter. */ textHighlighters?:readonly TextHighlighter[];

 /** Structured paragraphs; default empty uses text. Rust wraps across style boundaries. */ paragraphs?:readonly RichTextParagraph[];
}
export interface LayoutPanelOptions extends BorderOptions {
 /** Default null: overlay children like the native no-layout panel. Rust owns layout context. */ layout?:StackLayout|UniformGridLayout|FlowLayout|LinedFlowLayout|FeaturedTileLayout|null;
}

/** Port of the fixed Gallery LayoutPanel example. The object carries data; Rust performs measure/arrange. */
export class FeaturedTileLayout {readonly kind='FeaturedTileLayout';readonly spacing:number;constructor(options:{spacing?:number}={}){this.spacing=options.spacing??0;}}

export interface DetailLabelRequestedEvent extends SceneEvent {scrollOffset:number;label?:string;/** Assign synchronously; the Rust ToolTip owns its layout and lifetime. */content?:string;}
export interface RichTextSelectionEvent extends SceneEvent {selectionStart:number;selectionLength:number;text:string;}
