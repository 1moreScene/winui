import {Orientation,RepeaterLayoutKind,UniformGridLayoutItemsJustification,UniformGridLayoutItemsStretch,RefreshPullDirection,RefreshVisualizerOrientation,RefreshVisualizerState,NodeKind,FlowLayoutLineAlignment,LinedFlowLayoutItemsStretch,LinedFlowLayoutItemsJustification} from './enums';
import type {CollectionItem,LayoutOptions,SceneEvent} from './scene';
/** Rust StackLayout options. Default Vertical, spacing 0, virtualization enabled. */
export interface StackLayoutOptions {
 /** Default Vertical. */ orientation?:Orientation;
 /** Space between items in DIP, default 0. */ spacing?:number;
 /** Realize all items; bounded by the SDK's scene node budget. Default false. */ disableVirtualization?:boolean;
}
/** A reusable description. Rust owns measurement, positions and context state. */
export class StackLayout {
 readonly kind=RepeaterLayoutKind.StackLayout;
 readonly orientation:Orientation;readonly spacing:number;readonly disableVirtualization:boolean;
 constructor(options:StackLayoutOptions={}){this.orientation=options.orientation??Orientation.Vertical;this.spacing=options.spacing??0;this.disableVirtualization=options.disableVirtualization??false;}
}
/** Rust UniformGridLayout options; natural cell size comes from the first item. */
export interface UniformGridLayoutOptions {
 /** Default Horizontal: fill rows, then advance downward. */ orientation?:Orientation;
 /** Default null: measure the first item. */ minItemWidth?:number|null;minItemHeight?:number|null;
 /** Default 0 DIP. */ minRowSpacing?:number;minColumnSpacing?:number;
 /** Default no limit. Zero is coerced to one by the native layout. */ maximumRowsOrColumns?:number;
 /** Default None. */ itemsStretch?:UniformGridLayoutItemsStretch;
 /** Default Start; applies to each line, including the final partial line. */ itemsJustification?:UniformGridLayoutItemsJustification;
}
/** A reusable layout description; no JS measurement or packing algorithm. */
export class UniformGridLayout {
 readonly kind=RepeaterLayoutKind.UniformGridLayout;
 readonly orientation:Orientation;readonly minItemWidth:number|null;readonly minItemHeight:number|null;
 readonly minRowSpacing:number;readonly minColumnSpacing:number;readonly maximumRowsOrColumns:number;
 readonly itemsStretch:UniformGridLayoutItemsStretch;readonly itemsJustification:UniformGridLayoutItemsJustification;
 constructor(options:UniformGridLayoutOptions={}){this.orientation=options.orientation??Orientation.Horizontal;this.minItemWidth=options.minItemWidth??null;this.minItemHeight=options.minItemHeight??null;this.minRowSpacing=options.minRowSpacing??0;this.minColumnSpacing=options.minColumnSpacing??0;this.maximumRowsOrColumns=options.maximumRowsOrColumns??4294967295;this.itemsStretch=options.itemsStretch??UniformGridLayoutItemsStretch.None;this.itemsJustification=options.itemsJustification??UniformGridLayoutItemsJustification.Start;}
}
/** Native FlowLayout description. Rust measures and packs individual items. */
export interface FlowLayoutOptions {
 /** Default Horizontal: fill rows. */ orientation?:Orientation;
 /** Minimum spacing within a line, default 0 DIP. */ minItemSpacing?:number;
 /** Spacing between lines, default 0 DIP. */ lineSpacing?:number;
 /** Default Start. */ lineAlignment?:FlowLayoutLineAlignment;
}
export class FlowLayout {
 readonly kind=RepeaterLayoutKind.FlowLayout;
 readonly orientation:Orientation;readonly minItemSpacing:number;readonly lineSpacing:number;readonly lineAlignment:FlowLayoutLineAlignment;
 constructor(options:FlowLayoutOptions={}){this.orientation=options.orientation??Orientation.Horizontal;this.minItemSpacing=options.minItemSpacing??0;this.lineSpacing=options.lineSpacing??0;this.lineAlignment=options.lineAlignment??FlowLayoutLineAlignment.Start;}
}
/** Port of the fixed Gallery's alternating three-tile row layout. */
export interface ActivityFeedLayoutOptions {
 /** Minimum single-tile size, default [80,108] DIP. */ minItemSize?:[number,number];
 /** Default 0 DIP. */ rowSpacing?:number;
 /** Default 0 DIP. */ columnSpacing?:number;
}
export class ActivityFeedLayout {
 readonly kind=RepeaterLayoutKind.ActivityFeedLayout;
 readonly minItemSize:[number,number];readonly rowSpacing:number;readonly columnSpacing:number;
 constructor(options:ActivityFeedLayoutOptions={}){this.minItemSize=options.minItemSize??[80,108];this.rowSpacing=options.rowSpacing??0;this.columnSpacing=options.columnSpacing??0;}
}
/** Port of the fixed Gallery's measured lowest-column layout. */
export class VariedImageSizeLayout {
 readonly kind=RepeaterLayoutKind.VariedImageSizeLayout;
 /** Column width in DIP, native Gallery class default 150. */ readonly width:number;
 constructor(options:{width?:number}={}){this.width=options.width??150;}
}
export interface ItemsRepeaterOptions<T extends CollectionItem=CollectionItem> extends LayoutOptions {
 /** Stable IDs; no built-in selection. Default empty. */ items?:readonly T[];
 /** Default new StackLayout(). A layout instance may be shared between repeaters. */ layout?:StackLayout|UniformGridLayout|FlowLayout|LinedFlowLayout|ActivityFeedLayout|VariedImageSizeLayout;
 /** Extra viewports to realize in each axis. Native default 2. */ horizontalCacheLength?:number;verticalCacheLength?:number;
 /** Default false; source-backed distance-to-viewport-center scale expression runs in Rust. */ isScrollCenterScaleEnabled?:boolean;
 /** Default false; center newly focused items using the Rust ScrollViewer. */ isFocusCenteringEnabled?:boolean;
 /** Default false; Rust handles Home/End and vertical arrow navigation. */ isKeyboardNavigationEnabled?:boolean;
}
export interface RepeaterSnapshot {realizationError:string|null;realized:{id:number;key:string;index:number}[];totalCount:number;extent:[number,number];layout:RepeaterLayoutKind;}
export interface RefreshContainerOptions extends LayoutOptions {
 /** Default TopToBottom. Touch must start at the corresponding scroll edge. */ pullDirection?:RefreshPullDirection;
}
export interface RefreshVisualizerOptions extends LayoutOptions {
 /** Default Auto: follows its owning container. */ visualizerOrientation?:RefreshVisualizerOrientation;
 /** Default true. False stops the rotation track, including for custom content. */ isRotationEnabled?:boolean;
}
export interface RefreshSnapshot {state:RefreshVisualizerState;interactionRatio:number;requestId:number|null;visualizer:number|null;}
export interface RefreshRequestedEvent extends SceneEvent {
 /** Acquire synchronously; call complete once when asynchronous work finishes. */ getDeferral():{complete():void};
}
/** @internal Transport properties only; control algorithms are exclusively Rust. */
export function normalizeRepeaterRefresh(kind:NodeKind,options:object){
 const patch={...options}as Record<string,unknown>;
 if(kind===NodeKind.ItemsRepeater){const repeater:Record<string,unknown>={};for(const k of ['layout','horizontalCacheLength','verticalCacheLength','isScrollCenterScaleEnabled','isFocusCenteringEnabled','isKeyboardNavigationEnabled'])if(Object.hasOwn(patch,k)){repeater[k]=patch[k];delete patch[k];}if(Object.keys(repeater).length)patch.repeater=repeater;}
 if(kind===NodeKind.RefreshContainer||kind===NodeKind.RefreshVisualizer){const refresh:Record<string,unknown>={};for(const k of ['pullDirection','visualizerOrientation','isRotationEnabled'])if(Object.hasOwn(patch,k)){refresh[k]=patch[k];delete patch[k];}if(Object.keys(refresh).length)patch.refresh=refresh;}
 return patch;
}

/** Native LinedFlowLayout configuration; Rust resolves line breaks and aspect-ratio slots. */
export interface LinedFlowLayoutOptions {
 /** Default null: infer from the first measured item. */ lineHeight?:number|null;
 /** Default 0 DIP. */ lineSpacing?:number;minItemSpacing?:number;
 /** Default None. */ itemsStretch?:LinedFlowLayoutItemsStretch;
 /** Default Start. */ itemsJustification?:LinedFlowLayoutItemsJustification;
}
export class LinedFlowLayout {
 readonly kind=RepeaterLayoutKind.LinedFlowLayout;
 readonly lineHeight:number|null;readonly lineSpacing:number;readonly minItemSpacing:number;
 readonly itemsStretch:LinedFlowLayoutItemsStretch;readonly itemsJustification:LinedFlowLayoutItemsJustification;
 constructor(options:LinedFlowLayoutOptions={}){this.lineHeight=options.lineHeight??null;this.lineSpacing=options.lineSpacing??0;this.minItemSpacing=options.minItemSpacing??0;this.itemsStretch=options.itemsStretch??LinedFlowLayoutItemsStretch.None;this.itemsJustification=options.itemsJustification??LinedFlowLayoutItemsJustification.Start;}
}
