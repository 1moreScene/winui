import { PageBackdrop } from './page-backdrop';
import type {RichEditBoxOptions,RichEditDocument,RichCharacterFormat,RichParagraphFormat,RichEmbeddedImage,RichImageSource} from "./rich-edit-types";
import {NavigationView as NavigationViewHost} from "./navigation-view";
import {NavigationViewSlot} from "./enums";
import {normalizeTable,tableRowKey,retainTableRowKey,type TableViewGroupInfo,type TableViewGroupSlot,type TableViewGroupDescription,type TableViewOptions,type TableViewCell,type TableViewColumn,type TableViewFilter,type TableViewSort,type TableViewSlot,type TableViewEvent,type TableViewEventData,type TableViewSnapshot} from './table-view-types';
import {TableViewSortDirection} from './enums';
import type {MotionOptions,SpringOptions,ExpressionBindings} from './motion';
import {ConnectedAnimationConfiguration} from './enums';
import type {MenuFlyoutItemOptions,ToggleMenuFlyoutItemOptions,RadioMenuFlyoutItemOptions,MenuFlyoutSubItemOptions,MenuFlyoutSeparatorOptions} from './menu-item-types';
import {FeaturedTileLayout} from './reading-controls-types';
import type {ScrollBarOptions,ThumbOptions,TickBarOptions,ItemsPresenterOptions,ScrollContentPresenterOptions,ThumbDragStartedEvent,ThumbDragDeltaEvent,ThumbDragCompletedEvent,ScrollBarEvent,ScrollPrimitiveSnapshot} from './scroll-primitives-types';
import type {ContentControlOptions,ContentPresenterOptions,UserControlOptions,PageOptions,SceneFrameOptions,SceneNavigateOptions,SceneFrameSnapshot,SceneFrameNavigationEvent} from './content-host-types';
import type {ItemsViewOptions,PagerControlOptions,AnnotatedScrollBarOptions,RichTextBlockOptions,RichTextBlockOverflowOptions,LayoutPanelOptions,AnnotatedScrollingEvent,PagerIndexChangedEvent,DetailLabelRequestedEvent,RichTextSelectionEvent} from './reading-controls-types';
import type {MenuBarOptions,MenuBarItemOptions,CommandBarFlyoutOptions,RelativePanelOptions,WrapPanelOptions,RelativeConstraints} from './menu-layout-types';
import {normalizeRepeaterRefresh} from './repeater-refresh-types';
import type {ItemsRepeaterOptions,RefreshContainerOptions,RefreshVisualizerOptions,RepeaterSnapshot,RefreshSnapshot,RefreshRequestedEvent} from './repeater-refresh-types';
import {viewControlKinds,viewControlKeys} from './view-controls-types';
import type {SwipeControlOptions,SwipeItems,ScrollViewOptions,SplitViewOptions,SemanticZoomOptions,ParallaxViewOptions,UICommandOptions,StandardCommandOptions,UICommandMetadata,UICommandEvent,ViewControlSnapshot} from './view-controls-types';
import {NavigationTransition,ViewControlSlot} from './enums';
import {normalizePicker,pickerKinds} from './picker-controls-types';
import type {CalendarViewOptions,CalendarDatePickerOptions,DatePickerOptions,TimePickerOptions,ColorPickerOptions,PickerEvent,PickerSnapshot} from './picker-controls-types';
import type {AppBarSeparatorOptions,AppBarButtonOptions,AppBarToggleButtonOptions,DropDownButtonOptions,CommandBarOptions,CommandBarItem,CommandBarEvent,CommandSnapshot} from './command-controls-types';
import type {SelectorBarOptions} from './navigation-controls-types';
import {ContentDialogResult,ContentDialogButton} from './enums';
import type {NumberBoxOptions,AutoSuggestBoxOptions,ComboBoxOptions,ContentDialogOptions,TeachingTipOptions,ComposedEvent,ComposedSnapshot} from './composed-types';
import {normalizeNavigationDataItems,type NavigationData,type NavigationMetadata,type NavigationDataItem as NavigationItem,type TreeItem,type TabItem,type FlipViewOptions,type PipsPagerOptions,type BreadcrumbBarOptions,type TreeViewOptions,type TabViewOptions,type NavigationControlSnapshot,type NavigationControlEvent,type NavigationEventData,type NavigationItemsChangedEvent,type NavigationTemplateSlot} from './navigation-controls-types';
import {PipsPagerButtonVisibility,PipsPagerWrapMode,TreeViewSelectionMode,TabViewWidthMode,TabViewCloseButtonOverlayMode} from './enums';
import { EditorHost } from "./editor-host";
import { registerScrollInputScope } from "./scroll-input-scope";
import {projectNavigationScrollbars} from './navigation-scrollbars';
import { SurfaceMetrics } from "./surface-metrics";
import type { WinUiRuntime } from "./wasm/winui";
import {
  KeyboardAcceleratorModifier, NodeKind, ItemsUpdatingScrollMode, DataPackageOperation, CollectionChangeReason, OverlayPlacement, MenuEntryKind,InfoBarSeverity,InfoBarCloseReason,RatingItemKind,ListViewSelectionMode,
  ThemeMode,
  RendererBackend,
  ButtonVariant,
  ClickMode,
  ControlState,
  HorizontalAlignment,
  VerticalAlignment,
  Orientation,
  GridUnit,
  TextTrimming,
  OpticalMarginAlignment,
  ImageStretch,
  StretchDirection,
  Symbol,
  ExpandDirection,
  InfoBadgeStyle,
  FlowDirection, IconSourceKind, AnimatedIconSource, FillRule, PenLineCap, PenLineJoin,
  EventKind,
  AnimationEasing,
  AnimationResult,
  EasingFunction,
  EasingMode,
  GradientKind,
  BrushMappingMode,
  GradientSpread,
  FontStyle,
  ScrollMode,
  ScrollBarVisibility,
  ZoomMode,
  PasswordRevealMode,
} from "./enums";
import type {
  NavigationViewOptions,
  NavigationSnapshot,
  Rect,
  GridTrack,
  AcrylicOptions,
} from "./sdk";
const menuItemKinds=[NodeKind.MenuFlyoutItem,NodeKind.ToggleMenuFlyoutItem,NodeKind.RadioMenuFlyoutItem,NodeKind.MenuFlyoutSubItem,NodeKind.MenuFlyoutSeparator];
type ReferenceProperty='placementTarget'|'flyoutTarget'|'contextFlyoutTarget'|'primitiveSource'|'primitiveScrollTarget'|'readingScrollTarget'|'labelItemSource'|'overflowContentTarget'|'viewSource'|'command';
function normalizeNodeReference(patch:Record<string,unknown>,property:ReferenceProperty,value:SceneNode|string|null|undefined,scene:Scene){
 patch.elementReferences={...patch.elementReferences as object,[property]:typeof value==='string'?value:null};
 if(typeof value==='string')return null;
 value?.assertOwned(scene);return value?identity(value):null;
}
function nodeReferencePatch(scene:Scene,key:'placementTarget'|'flyoutTarget'|'contextFlyoutTarget',value:SceneNode|string|null|undefined){
 const patch:Record<string,unknown>={};patch[key]=normalizeNodeReference(patch,key,value,scene);return patch;
}
function normalizeSurfaceTarget(kind:NodeKind,options:object,scene:Scene){
 if(![NodeKind.Popup,NodeKind.ToolTip,NodeKind.Flyout,NodeKind.MenuFlyout,NodeKind.CommandBarFlyout,NodeKind.TeachingTip].includes(kind)||!Object.hasOwn(options,'target'))return options;
 const patch={...options} as Record<string,unknown>;patch.placementTarget=normalizeNodeReference(patch,'placementTarget',patch.target as SceneNode|string|null,scene);delete patch.target;return patch;
}
function normalizeMenuItem(kind:NodeKind,options:object){
 if(!menuItemKinds.includes(kind))return options;
 const patch={...options} as Record<string,unknown>,item:Record<string,unknown>={};
 for(const key of ['icon','keyboardAccelerators','areCheckStatesEnabled'])if(Object.hasOwn(patch,key)){item[key]=patch[key];delete patch[key];}
 if(Object.keys(item).length)patch.menuItem=item;return patch;
}
function normalizeViews(kind:NodeKind,options:object,scene:Scene){
 if(!viewControlKinds.includes(kind)&&!Object.hasOwn(options,'command')&&!Object.hasOwn(options,'commandParameter'))return options;
 const patch={...options} as Record<string,unknown>,view:Record<string,unknown>={};
 for(const key of (viewControlKinds.includes(kind)?viewControlKeys:['command','commandParameter'] as const))if(Object.hasOwn(patch,key)){
  let value=patch[key];if(key==='source'||key==='command')value=normalizeNodeReference(patch,key==='source'?'viewSource':'command',value as SceneNode|string|null,scene);
  if(['leftItems','rightItems','topItems','bottomItems'].includes(key)&&value){const group=value as SwipeItems;value={...group,items:group.items.map(item=>{item.command?.assertOwned(scene);return{...item,command:item.command?identity(item.command):null};})};}
  view[key]=value;delete patch[key];
 }
 if(Object.keys(view).length)patch.viewControls=view;return patch;
}
const primitiveKinds=[NodeKind.ScrollBar,NodeKind.Thumb,NodeKind.TickBar,NodeKind.ItemsPresenter,NodeKind.ScrollContentPresenter];
function normalizePrimitives(kind:NodeKind,options:object,scene:Scene){if(!primitiveKinds.includes(kind))return options;const patch={...options} as Record<string,unknown>,primitive:Record<string,unknown>={};for(const key of ['viewportSize','indicatorMode','scrollTarget','source','footer'])if(Object.hasOwn(patch,key)&&(key!=='source'||kind===NodeKind.TickBar)){let value=patch[key];if(key==='scrollTarget'||key==='source')value=normalizeNodeReference(patch,key==='source'?'primitiveSource':'primitiveScrollTarget',value as SceneNode|string|null,scene);primitive[key]=value;delete patch[key];}if(Object.keys(primitive).length)patch.primitives=primitive;return patch;}
const contentHostKinds=[NodeKind.ContentControl,NodeKind.ContentPresenter,NodeKind.UserControl,NodeKind.Page,NodeKind.Frame];
function normalizeContentHosts(kind:NodeKind,options:object){if(!contentHostKinds.includes(kind))return options;const patch={...options} as Record<string,unknown>,host:Record<string,unknown>={};for(const key of ['content','contentTemplate','pages','cacheSize'])if(Object.hasOwn(patch,key)){host[key]=patch[key];delete patch[key];}if(Object.keys(host).length)patch.contentHost=host;return patch;}
const readingKinds=[NodeKind.RichTextBlockOverflow,NodeKind.ItemsView,NodeKind.PagerControl,NodeKind.AnnotatedScrollBar,NodeKind.RichTextBlock,NodeKind.LayoutPanel];
const readingKeys=['displayMode','numberOfPages','selectedPageIndex','firstButtonVisibility','previousButtonVisibility','nextButtonVisibility','lastButtonVisibility','buttonPanelAlwaysShowFirstLastPageIndex','prefixText','suffixText','labels','minimum','maximum','viewportSize','value','smallChange','scrollTarget','paragraphs','layout','textAlignment','isTextSelectionEnabled','textHighlighters','overflowContentTarget','firstButtonCommand','previousButtonCommand','nextButtonCommand','lastButtonCommand','pagerInputCommand','firstButtonStyle','previousButtonStyle','nextButtonStyle','lastButtonStyle','numberButtonStyle','labelStyle','itemAspectRatios','hasLabelTemplate','hasDetailTemplate','labelItemSource'];
function normalizeReading(kind:NodeKind,options:object,scene:Scene){
 if(!readingKinds.includes(kind))return options;
 const patch={...options}as Record<string,unknown>,reading:Record<string,unknown>={};
 for(const key of readingKeys)if(Object.hasOwn(patch,key)){
  let value=patch[key];if(['labelItemSource','scrollTarget','overflowContentTarget'].includes(key)){value=normalizeNodeReference(patch,key==='scrollTarget'?'readingScrollTarget':key as ReferenceProperty,value as SceneNode|string|null,scene);}else if(['firstButtonCommand','previousButtonCommand','nextButtonCommand','lastButtonCommand','pagerInputCommand'].includes(key)){const node=value as SceneNode|null;node?.assertOwned(scene);value=node?identity(node):null;}
  if(key==='layout'&&value&&(value as {kind?:string}).kind==='FeaturedTileLayout'){reading.featuredSpacing=(value as {spacing:number}).spacing;reading.layout=null;}else {reading[key]=value;if(key==='layout')reading.featuredSpacing=null;}delete patch[key];
 }
 if(kind===NodeKind.ItemsView&&Object.hasOwn(patch,'isItemInvokedEnabled')){patch.isItemClickEnabled=patch.isItemInvokedEnabled;delete patch.isItemInvokedEnabled;}
 if(Object.keys(reading).length)patch.reading=reading;return patch;
}
/** Literal color or open resource key. Colors use #RRGGBB[AA]. */
export type BrushValue = string | { resource: string } | GradientBrush;
/** A typed group. IDs are stable; the original business objects remain in TS. */
export interface CollectionGroup<T extends CollectionItem=CollectionItem>{id:string;header:string;items:readonly T[];}
/** Stable item identity; business fields may extend the object in TypeScript. */
export type CollectionItem=string|{id:string;text?:string;enabled?:boolean};
export interface ItemsPanelOptions extends LayoutOptions {
 /** Native default Vertical; GridView's default panel uses Horizontal. */ orientation?:Orientation;
 /** Cell dimensions; null derives from the first item. */ itemWidth?:number|null;itemHeight?:number|null;
 /** Default -1, no explicit limit. */ maximumRowsOrColumns?:number;
 /** Total extra viewports to realize, default 4, subject to the live node budget. */ cacheLength?:number;
}
export type ItemContainerStyle=Pick<BorderOptions,'margin'|'padding'|'borderThickness'|'minWidth'|'minHeight'|'width'|'height'|'horizontalAlignment'|'verticalAlignment'>&{horizontalContentAlignment?:HorizontalAlignment;verticalContentAlignment?:VerticalAlignment};
export interface CollectionViewOptions<T extends CollectionItem=CollectionItem> extends ItemsPanelOptions, Pick<BorderOptions,'borderBrush'|'borderThickness'>, Pick<ScrollViewerOptions,'horizontalScrollMode'|'verticalScrollMode'|'horizontalScrollBarVisibility'|'verticalScrollBarVisibility'|'isHorizontalScrollChainingEnabled'|'isVerticalScrollChainingEnabled'|'isTabStop'> {
 /** Close the enclosing flyout after a completed item invocation. Default false; Closing remains cancellable. */ closeFlyout?:boolean;
 /** Typed item-container style, applied to current and future realized items. */ itemContainerStyle?:ItemContainerStyle;
 /** Strings or view models with stable unique IDs; default empty. */ items?:readonly T[];
 /** Default Single. */ selectionMode?:ListViewSelectionMode;
 /** Stable selected IDs, default empty. */ selectedKeys?:readonly string[];
 /** Grouped source; use groups or items, not both. */ groups?:readonly CollectionGroup<T>[];
 /** Native ItemsStackPanel default true. */ areStickyGroupHeadersEnabled?:boolean;
 /** Native GroupStyle default false. */ hidesEmptyGroups?:boolean;
 /** Optional explicit main-axis header size; otherwise measured. */ groupHeaderHeight?:number;
 /** Native defaults false. Drag/drop and reordering are independent capabilities. */ canDragItems?:boolean;canReorderItems?:boolean;allowDrop?:boolean;
 /** Default false; loading notifications are coalesced until data changes or loading ends. */ hasMoreItems?:boolean;isLoading?:boolean;
 /** Distance from the end in viewports, native default 3. */ incrementalLoadingThreshold?:number;
 /** Default Top. Align a short items panel within the viewport. */ itemsPanelVerticalAlignment?:VerticalAlignment;
 /** Default KeepItemsInView; stack-panel source mutation anchoring. */ itemsUpdatingScrollMode?:ItemsUpdatingScrollMode;
 /** Native default false; primary notification precedes selection. */ isItemClickEnabled?:boolean;
 /** Default stack for ListView, wrap for GridView. */ itemsPanel?:NodeKind.ItemsStackPanel|NodeKind.ItemsWrapGrid;
 /** Default 14 DIP / Segoe UI / 400. */ fontSize?:number;fontFamily?:string;fontWeight?:number;
 /** Default LeftToRight. */ flowDirection?:FlowDirection;
 /** Rust viewport offsets, normally changed via scrolling or scrollIntoView. */ horizontalOffset?:number;verticalOffset?:number;
}
export interface CollectionScrollPosition {key:string;offset:number;}
export interface CollectionSnapshot {scrollPosition:CollectionScrollPosition|null;drag:{active:boolean;keys:string[];insertionIndex:number|null;previewIndex:number|null;operation:DataPackageOperation;committed:boolean};headers:{id:number;key:string;index:number;selected:boolean}[];stickyHeader:string|null;totalCount:number;selectedCount:number;focusedKey:string|null;realized:{id:number;key:string;index:number;selected:boolean}[];panel:NodeKind;cell:[number,number];perLine:number;realizationError:string|null;}
/** Source-owned notification metadata; IDs refer to stable business objects. */
export interface CollectionEventData {position:[number,number]|null;source:number|null;keys:string[];order:string[];index:number;operation:DataPackageOperation;reason:CollectionChangeReason;count:number;}
/** Synchronous drag negotiation. Set cancel or acceptedOperation before returning. */
export interface CollectionDragEvent<T extends CollectionItem=CollectionItem> extends SceneEvent {items:readonly T[];insertIndex:number;acceptedOperation:DataPackageOperation;}
/** Fired after an atomic Rust mutation; use items/groups for controlled React sources. */
export interface CollectionItemsChangedEvent<T extends CollectionItem=CollectionItem> extends SceneEvent {items:readonly T[];groups:readonly CollectionGroup<T>[];reason:CollectionChangeReason;}
let collectionTransfer:{scene:Scene;source:CollectionView;keys:string[];pool:Map<string,CollectionItem>;target?:CollectionView;operation:DataPackageOperation;dropping?:boolean;finishing?:boolean;metadata:ReturnType<typeof normalizeCollection>}|undefined;
let collectionCompletionPool:Map<string,CollectionItem>|undefined;
let navigationTransfer:{scene:Scene;source:TabView;key:string;pool:Map<string,NavigationData>;metadata:NavigationMetadata[];target?:TabView;dropping:boolean;finishing:boolean}|undefined;
export interface CollectionRealization<T extends CollectionItem=CollectionItem> {key:string;index:number;item:T;selected:boolean;container:CollectionItemContainer;}
function normalizeCollection(items:readonly CollectionItem[]){const seen=new Map<string,number>();return items.map(item=>{if(typeof item!=='string')return{id:item.id,text:item.text??item.id,enabled:item.enabled??true};const count=seen.get(item)??0;seen.set(item,count+1);return{id:`text:${item}:${count}`,text:item,enabled:true};});}
function collectionSource(options:CollectionViewOptions){
 const {items,groups,...rest}=options;
 if(items!==undefined&&groups!==undefined)throw new TypeError('Use either items or groups');
 const source=groups?groups.flatMap(group=>group.items):items??[];
 const normalized=normalizeCollection(source);let cursor=0;const metadata=groups?groups.flatMap(group=>group.items.map(()=>({...normalized[cursor++],group:group.id}))):normalized;
 return {items:source,groups:groups??[],options:{...rest,collectionItems:metadata,collectionGroups:(groups??[]).map(({id,header})=>({id,header}))}};
}
function collectionKind(kind:NodeKind){return kind===NodeKind.ItemsView||kind===NodeKind.ListView||kind===NodeKind.GridView||kind===NodeKind.ItemsRepeater;}
function navigationControlKind(kind:NodeKind){return [NodeKind.FlipView,NodeKind.PipsPager,NodeKind.BreadcrumbBar,NodeKind.TreeView,NodeKind.TabView,NodeKind.SelectorBar].includes(kind);}
const commandKinds=[NodeKind.CommandBarFlyout,NodeKind.AppBarSeparator,NodeKind.AppBarButton,NodeKind.AppBarToggleButton,NodeKind.DropDownButton,NodeKind.CommandBar];
const commandKeys=['label','isCompact','labelPosition','dynamicOverflowOrder','keyboardAccelerators','primaryCommands','secondaryCommands','defaultLabelPosition','closedDisplayMode','overflowButtonVisibility','isDynamicOverflowEnabled','isSticky'] as const;
function normalizeCommands(kind:NodeKind,options:object,scene:Scene){if(!commandKinds.includes(kind))return options;const patch={...options} as Record<string,unknown>,commands:Record<string,unknown>={};for(const key of commandKeys)if(Object.hasOwn(patch,key)){const value=patch[key];commands[key]=key==='primaryCommands'||key==='secondaryCommands'?(value as readonly CommandBarItem[]|undefined??[]).map(item=>{const {flyout}=item;flyout?.assertOwned(scene);if(flyout&&![NodeKind.CommandBarFlyout,NodeKind.Flyout,NodeKind.MenuFlyout].includes(flyout.kind))throw new TypeError("Commands require Flyout or MenuFlyout");const meta=Object.fromEntries(['id','label','kind','iconSource','enabled','visible','isChecked','isThreeState','dynamicOverflowOrder','keyboardAccelerators'].filter(key=>Object.hasOwn(item,key)).map(key=>[key,(item as unknown as Record<string,unknown>)[key]]));return {...meta,flyoutTarget:flyout?identity(flyout):null};}):value;delete patch[key];}if(Object.keys(commands).length)patch.commandControls=commands;return patch;}
function normalizeBoundMenus(kind:NodeKind,options:object,scene:Scene){
 const patch={...options} as Record<string,unknown>;
 function entries(items:readonly MenuEntry[]):unknown[]{return items.map(entry=>{const e=entry as Exclude<MenuEntry,{kind:MenuEntryKind.Separator}>;e.command?.assertOwned(scene);return{...entry,...(e.command!==undefined?{command:e.command?identity(e.command):null}:{}),...(e.items?{items:entries(e.items)}:{})};});}
 if(patch.menuItems)patch.menuItems=entries(patch.menuItems as MenuEntry[]);
 if(kind===NodeKind.MenuBarItem&&patch.items)patch.items=entries(patch.items as MenuEntry[]);
 if(kind===NodeKind.MenuBar&&patch.items)patch.items=(patch.items as import('./menu-layout-types').MenuBarItemData[]).map(item=>({...item,items:entries(item.items??[])}));
 return patch;
}
function normalizeMenuLayout(kind:NodeKind,options:object){
 const patch={...options} as Record<string,unknown>;
 if(kind===NodeKind.MenuBar||kind===NodeKind.CommandBarFlyout){const q:Record<string,unknown>={};for(const key of kind===NodeKind.MenuBar?['items']:['alwaysExpanded','showMode'])if(Object.hasOwn(patch,key)){q[key]=patch[key];delete patch[key];}if(Object.keys(q).length)patch.menuControls=q;}
 if(kind===NodeKind.MenuBarItem){if(Object.hasOwn(patch,'title')){patch.text=patch.title;delete patch.title;}if(Object.hasOwn(patch,'items')){patch.menuItems=patch.items;delete patch.items;}}
 if(kind===NodeKind.WrapPanel){const q:Record<string,unknown>={};for(const key of ['itemSpacing','lineSpacing','itemsStretch'])if(Object.hasOwn(patch,key)){q[key]=patch[key];delete patch[key];}if(Object.keys(q).length)patch.panelControls=q;}
 return patch;
}
const navigationOptionKeys=['numberOfPages','selectedPageIndex','maxVisiblePips','previousButtonVisibility','nextButtonVisibility','wrapMode','expandedKeys','tabWidthMode','closeButtonOverlayMode','isAddTabButtonVisible','canDragTabs','canReorderTabs','allowDropTabs','tabStripHeaderWidth','tabStripFooterWidth','tabStripBackground'] as const;
function navigationSource(kind:NodeKind,options:object){
 const input=options as Record<string,unknown>,patch={...input},nav:Record<string,unknown>={};
 for(const key of navigationOptionKeys)if(Object.hasOwn(patch,key)){nav[key]=patch[key];delete patch[key];}
 if(kind===NodeKind.TreeView&&Object.hasOwn(patch,'selectionMode')){nav.treeSelectionMode=patch.selectionMode;delete patch.selectionMode;}
 const items=Object.hasOwn(input,'items')?(input.items??[]) as readonly NavigationData[]:undefined;
 const source=items?normalizeNavigationDataItems(items,kind===NodeKind.TreeView):undefined;
 if(source){nav.items=source.metadata;delete patch.items;}
 if(Object.keys(nav).length)patch.navControls=nav;
 return{patch,items,source};
}
/** Inline notification. Default closed; explicit isOpen shows it. */
export interface InfoBarOptions extends LayoutOptions {
  /** Default empty. */ title?:string;
  /** Default empty; wraps according to the native horizontal/vertical panel rule. */ message?:string;
  /** Default Informational. */ severity?:InfoBarSeverity;
  /** Default false. */ isOpen?:boolean;
  /** Default true. */ isClosable?:boolean;
  /** Default true. */ isIconVisible?:boolean;
  /** Default 14 DIP. */ fontSize?:number;
  /** Default Segoe UI. */ fontFamily?:string;
}
export interface PersonPictureOptions extends LayoutOptions {
  /** Name used to derive initials. Default empty. */ displayName?:string;
  /** Overrides derived initials. Default empty. */ initials?:string;
  /** Profile image URL. Default empty; supports the shared image decoder. */ profilePicture?:string;
  /** Display the group glyph instead of person-specific data. Default false. */ isGroup?:boolean;
  /** Positive counts show a badge, capped visually at 99+. Default 0. */ badgeNumber?:number;
  /** Badge glyph, used when badgeNumber is 0. Default empty. */ badgeGlyph?:string;
  /** Badge image has priority over number/glyph. Default empty. */ badgeImageSource?:string;
  /** Accessible badge description. Default empty. */ badgeText?:string;
  /** Initials font, default Segoe UI. */ fontFamily?:string;
}
export type RatingItemInfo = {kind:RatingItemKind.Font;glyph:string;unsetGlyph?:string;placeholderGlyph?:string;pointerOverGlyph?:string;pointerOverPlaceholderGlyph?:string;disabledGlyph?:string} | {kind:RatingItemKind.Image;image:string;unsetImage?:string;placeholderImage?:string;pointerOverImage?:string;pointerOverPlaceholderImage?:string;disabledImage?:string};
export interface RatingControlOptions extends LayoutOptions {
  /** -1 means unset (default); positive values may be fractional. */ value?:number;
  /** Unset display value; default -1. Matched SDK coerces 0..1 to 1. */ placeholderValue?:number;
  /** Number of items, default 5; minimum 1 and SDK resource budget 100. */ maxRating?:number;
  /** First arrow-key value when unset, default 1. */ initialSetValue?:number;
  /** Click current value or drag left to clear. Default true. */ isClearEnabled?:boolean;
  /** Disable value editing while retaining focus. Default false. */ isReadOnly?:boolean;
  /** Text after the items. Default empty. */ caption?:string;
  /** Font or image descriptor. Default native filled/outlined stars. */ ratingItemInfo?:RatingItemInfo|null;
  /** Default Segoe Fluent Icons; applies to font descriptors. */ fontFamily?:string;
  /** Default LeftToRight. */ flowDirection?:FlowDirection;
}
export interface SplitButtonOptions extends LayoutOptions {
  /** Primary string content; compose children for rich content. Default empty. */ text?:string;
  /** Default Segoe UI. */ fontFamily?:string;
  /** Default 14 DIP. */ fontSize?:number;
  /** Default 400. */ fontWeight?:number;
  /** Default Normal. */ fontStyle?:FontStyle;
}
export interface ToggleSplitButtonOptions extends SplitButtonOptions {/** Default false; only primary invocation toggles. */ isChecked?:boolean;}
export interface CompactSnapshot {primary:Rect;secondary:Rect;flyoutOpen:boolean;pendingClose:number|null;actualInitials:string;ratingHover:number|null;vertical:boolean;}
export interface GradientBrush {
  /** Linear or Radial. */ kind: GradientKind;
  /** 2..32 ordered stops; colors are #RRGGBB[AA]. */ stops: {
    offset: number;
    color: string;
  }[];
  /** Default relative coordinates. */ mappingMode?: BrushMappingMode;
  /** Default Pad. */ spreadMethod?: GradientSpread;
  /** Linear endpoints; explicit values are recommended. */ from?: [
    number,
    number,
  ];
  to?: [number, number];
  /** Radial center, origin and x/y radii; default [0.5,0.5]. */ center?: [
    number,
    number,
  ];
  origin?: [number, number];
  radius?: [number, number];
  /** Brush alpha, default 1. */ opacity?: number;
}
/** Logically owned content rendered at Scene-root level. */
export interface PopupOptions extends LayoutOptions {
 /** Same-Scene control or declarative element name. Forward references are resolved by Rust before layout. */ target?:SceneNode|string|null;
  /** Logical content direction. Default inherits the owning control; Rust mirrors menu columns and submenu navigation. */ flowDirection?:FlowDirection;
  /** Optional point relative to the placement target for Flyout/MenuFlyout, clamped to the viewport. Default null. */ placementPosition?:[number,number]|null;
  /** Default false. */ isOpen?:boolean;
  /** Preferred anchored side, default Auto. */ placement?:OverlayPlacement;
  /** Parent-relative horizontal DIP offset, default 0; may be negative. */ horizontalOffset?:number;
  /** Parent-relative vertical DIP offset, default 0; may be negative. */ verticalOffset?:number;
  /** Default false for Popup, true for Flyout/MenuFlyout. */ isLightDismissEnabled?:boolean;
  /** Default false for Popup, true for Flyout/MenuFlyout. */ autoFocus?:boolean;
  /** Restore previous live focus on close, default true. */ restoreFocus?:boolean;
}
export interface FlyoutOptions extends PopupOptions {}
export interface ToolTipOptions extends Omit<PopupOptions,'autoFocus'|'isLightDismissEnabled'> {
  /** Content label when no child is provided, default empty. */ text?:string;
  /** Default 12 DIP. */ fontSize?:number;
}
/** Typed command/toggle identity, or an identity-free separator. */
export type MenuEntry = {
  /** Screen reader name, defaults to text. */ accessibleName?:string;
  /** Bind to the Rust XamlUICommand model, inheriting unset metadata. */ command?:UICommand|null;commandParameter?:unknown;
  /** Unique, nonempty business identity. */ id:string;
  /** Label, default empty. */ text?:string;
  /** Command by default; Toggle retains checked state. */ kind?:MenuEntryKind.Command|MenuEntryKind.Toggle|MenuEntryKind.Radio|MenuEntryKind.Submenu;
  /** Nested entries; only valid with Submenu. */ items?:readonly MenuEntry[];
  /** Radio group identity, default empty. */ groupName?:string;
  /** Rust matches shortcuts and supplies their display text. */ keyboardAccelerators?:readonly import("./command-controls-types").KeyboardAccelerator[];
  /** Default true. */ enabled?:boolean;
  /** Toggle state, default false. */ checked?:boolean;
  /** Optional Segoe Fluent Icons glyph, sharing the native leading-icon column. */ icon?:string;
} | {
  /** Noninteractive separator. */ kind:MenuEntryKind.Separator;
  /** Optional diagnostic identity. */ id?:string;
  text?:never;enabled?:never;checked?:never;
};
export interface MenuFlyoutOptions extends PopupOptions {
  /** Flat commands, toggles and separators; default empty. */ menuItems?:MenuEntry[];
  /** Label size, default 14. */ fontSize?:number;
}
export interface SliderOptions extends LayoutOptions {
  /** Native logical tick interval, default 0; source-linked TickBar renders the marks. */ tickFrequency?:number;
  /** Range lower bound, default 0. */ minimum?:number;
  /** Range upper bound, default 100. */ maximum?:number;
  /** Clamped logical value, default 0. */ value?:number;
  /** Positive pointer snap interval, default 1. */ stepFrequency?:number;
  /** Positive arrow-key interval, default 1. */ smallChange?:number;
  /** Positive PageUp/PageDown interval, default 10. */ largeChange?:number;
  /** Default Horizontal. */ orientation?:Orientation;
  /** Default false. */ isDirectionReversed?:boolean;
  /** Default LeftToRight. */ flowDirection?:FlowDirection;
  /** Shared Rust ToolTip feedback; default true. */ isThumbToolTipEnabled?:boolean;
  /** Optional label above the track. */ header?:string;
  /** Label size, default 14. */ fontSize?:number;
}
export interface OverlaySnapshot {clip:Rect;opacity:number;offset:[number,number];active:boolean;isOpen:boolean;actualPlacement:OverlayPlacement;pendingClose:number|null;selectedIndex:number|null;rows:Rect[];menuParts:{label:Rect;shortcut:Rect;icon:Rect;check:Rect;chevron:Rect}[];order:number;}
export interface SliderSnapshot {track:Rect;thumb:Rect;fraction:number;innerScale:number;tooltip:number|null;}
export interface BorderOptions extends LayoutOptions {
  /** Background/border decoration radii, clockwise from top-left; overrides cornerRadius. Default null. */ cornerRadii?:[number,number,number,number]|null;
  /** Left, top, right, bottom widths in DIP; default zero. */ borderThickness?: [
    number,
    number,
    number,
    number,
  ];
  /** Solid border brush; default transparent. */ borderBrush?: BrushValue | null;
}
/** Canvas exposes only absolute positioning; no Grid tracks or panel padding. */
export interface CanvasOptions extends Omit<LayoutOptions, "padding"> {}
export interface HyperlinkButtonOptions extends ButtonOptions {
  /** Absolute http(s)/mailto URI launched after Click. Browser popup policy applies. */ navigateUri?:
    string | null;
}
export interface ExpanderOptions extends LayoutOptions {
  /** Default Center; Stretch fills the content width. */ horizontalContentAlignment?: HorizontalAlignment;
  /** Default Center. */ verticalContentAlignment?: VerticalAlignment;
  /** Header label; default empty. */ header?: string;
  /** Default false. */ isExpanded?: boolean;
  /** Default Down. */ expandDirection?: ExpandDirection;
  /** Header/content font. */ fontSize?: number;
}
/** Noninteractive icon; inherits foreground from its content parent. */
export interface ShapeOptions extends Omit<LayoutOptions,'padding'|'background'|'foreground'|'cornerRadius'> {
  /** Interior brush; default null. Supports solid and gradients. */ fill?:BrushValue|null;
  /** Outline brush; default null. */ stroke?:BrushValue|null;
  /** DIP width, default 1; ignored without stroke. */ strokeThickness?:number;
  /** Default None except Rectangle defaults Fill. */ stretch?:ImageStretch;
  /** Default Flat. */ strokeStartLineCap?:PenLineCap;
  /** Default Flat. */ strokeEndLineCap?:PenLineCap;
  /** Default Flat. */ strokeDashCap?:PenLineCap;
  /** Default Miter. */ strokeLineJoin?:PenLineJoin;
  /** Default 10. */ strokeMiterLimit?:number;
  /** Alternating lengths in multiples of strokeThickness. Default empty. */ strokeDashArray?:number[];
  /** Offset in multiples of strokeThickness; default 0. */ strokeDashOffset?:number;
}
export interface RectangleOptions extends ShapeOptions { /** Corner x radius, default 0. */ radiusX?:number; /** Corner y radius, default 0. */ radiusY?:number; }
export interface LineOptions extends Omit<ShapeOptions,'fill'> {x1?:number;y1?:number;x2?:number;y2?:number;}
export interface PathOptions extends ShapeOptions { /** Abbreviated WinUI geometry. Default empty. */ data?:string; }
export interface PolygonOptions extends ShapeOptions { /** Vertices in DIP, default empty. */ points?:[number,number][]; /** Default EvenOdd. */ fillRule?:FillRule; }
export interface PolylineOptions extends PolygonOptions {}
export interface IconOptions extends LayoutOptions {
  /** Local icon direction. Default LeftToRight; this does not change other controls' layout. */ flowDirection?: FlowDirection;
}
/** Reusable source description; foreground inherits unless explicitly supplied. */
export type IconSource = (
  | ({kind: IconSourceKind.Font} & Omit<FontIconOptions, keyof LayoutOptions | 'flowDirection'>)
  | {kind: IconSourceKind.Symbol; symbol?:Symbol}
  | {kind: IconSourceKind.Path; data?:string}
  | {kind: IconSourceKind.Bitmap; uriSource?:string; showAsMonochrome?:boolean}
  | {kind: IconSourceKind.Image; source?:string}
) & { foreground?: BrushValue | null };
export interface IconSourceElementOptions extends IconOptions {
  /** Null (default) displays no icon. The pinned native control supports Font/Symbol/Path/Bitmap sources. */ iconSource?: Exclude<IconSource,{kind:IconSourceKind.Image}> | null;
}
export interface AnimatedIconOptions extends IconOptions {
  /** Default None; the seven pinned built-in sources are supported. */ source?: AnimatedIconSource;
  /** Open marker state, e.g. Normal/PointerOver, or a numeric progress string. Default empty/inherited. */ state?: string;
  /** SDK convenience: derive Normal/PointerOver/Pressed/Disabled from the nearest button in Rust. Default false; explicit state or attached animatedIconState wins. */ useParentState?:boolean;
  /** Used only when source is None. Default null. */ fallbackIconSource?: IconSource | null;
  /** Native visual mirroring flag; default false. */ mirroredWhenRightToLeft?: boolean;
}
export interface AnimatedIconSnapshot { state:string; progress:number; active:boolean; queuedStates:string[]; segmentStart:string; segmentEnd:string; }
export interface FontIconOptions extends IconOptions {
  /** Mirror the glyph in RightToLeft. Default false. */ mirroredWhenRightToLeft?: boolean;
  /** Open Unicode glyph string, default empty. */ glyph?: string;
  /** Default Segoe Fluent Icons with Segoe MDL2 Assets fallback. */ fontFamily?: string;
  /** Em size in DIP; default 20. */ fontSize?: number;
  /** CSS numeric font weight; default 400. */ fontWeight?: number;
  /** Default Normal. */ fontStyle?: FontStyle;
}
export interface SymbolIconOptions extends IconOptions {
  /** WinUI Symbol mapped to its Fluent glyph. Default Emoji. */ symbol?: Symbol;
}
export interface PathIconOptions extends IconOptions {
  /** WinUI abbreviated geometry (M/L/H/V/C/S/Q/T/A/Z, F0/F1). Default empty. Native Stretch=None preserves coordinates. */ data?: string;
}
export interface BitmapIconOptions extends IconOptions {
  /** Image URL, decoded and shared by the SDK host. Default empty. */ uriSource?: string;
  /** Use the image alpha mask with inherited foreground. Default true. */ showAsMonochrome?: boolean;
}
export interface ImageIconOptions extends IconOptions {
  /** PNG/JPEG/SVG URL; preserves original image colors. Default empty. */ source?: string;
}
export interface InfoBadgeOptions extends LayoutOptions {
  /** Native SymbolIconSource; mutually exclusive with glyph. */ symbol?:Symbol|null;
  /** Integer >= -1; -1 shows glyph, or a dot when no glyph. Default -1. */ value?: number;
  /** Source palette, default Default. */ badgeStyle?: InfoBadgeStyle;
  /** Segoe Fluent Icons glyph; value >= 0 takes precedence. */ glyph?: string;
}
export interface ExpanderSnapshot {
  header: Rect;
  clip: Rect;
  offset: number;
  progress: number;
}
export interface LayoutOptions {
  /** Unique, case-sensitive element name within this Scene. Empty clears the name. */ name?:string;
  /** Rust-owned implicit, layout and hover motion. Default disabled. */ motion?:MotionOptions|null;
 /** Whether the native control participates in Tab navigation; control-specific default. */ isTabStop?:boolean;
 /** Stable sibling name for RelativePanel; default empty. */ layoutKey?:string;
 /** RelativePanel attached constraints; only used by a RelativePanel parent. */ relative?:RelativeConstraints|null;
  /** Attached state inherited by descendant AnimatedIcon nodes without their own state. */ animatedIconState?: string;
  /** Canvas attached offsets; null clears the attached value. */ canvasLeft?:
    number | null;
  canvasTop?: number | null;
  /** Canvas stacking order; equal values keep insertion order. */ zIndex?: number;
  /** Explicit width in DIP; null restores automatic measurement. */ width?:
    number | null;
  /** Explicit height in DIP; null restores automatic measurement. */ height?:
    number | null;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number | null;
  maxHeight?: number | null;
  /** Left, top, right, bottom. Negative margin is supported. */ margin?: [
    number,
    number,
    number,
    number,
  ];
  /** Content inset; nonnegative. Default zero except source-traced Button padding. */ padding?: [
    number,
    number,
    number,
    number,
  ];
  /** Default Stretch; Button defaults Left. */ horizontalAlignment?: HorizontalAlignment;
  /** Default Stretch; Button defaults Center. */ verticalAlignment?: VerticalAlignment;
  row?: number;
  column?: number;
  rowSpan?: number;
  columnSpan?: number;
  /** False collapses this subtree. Default true. */ visible?: boolean;
  /** Exclude this subtree from pointer hit tests without changing its visuals or keyboard focus. Default true. */ isHitTestVisible?:boolean;
  /** Inherited enabled policy; false cancels capture and keyboard activation. */ enabled?: boolean;
  /** Presentation translation in DIP; default 0. Animate without relayout. */ translationX?: number;
  /** Vertical presentation translation in DIP; default 0. */ translationY?: number;
  /** Composition depth in DIP; default 0. Does not invent perspective scaling. */ translationZ?:number;
  /** Cast a native-recipe ThemeShadow from translationZ. Default false. */ themeShadow?:boolean;
  /** Presentation scale around the local origin; default 1. */ scaleX?: number;
  /** Vertical scale around the local origin; default 1. */ scaleY?: number;
  /** Application-local Acrylic backdrop; null removes the effect. */ acrylic?: AcrylicOptions | null;
  /** Open theme resource key, e.g. AcrylicInAppFillColorDefaultBrush. Exclusive with acrylic. */ acrylicResource?:
    string | null;
  /** Rotation in degrees, default 0. */ rotation?: number;
  /** Local transform center in DIP, default [0,0]. */ centerPoint?: [
    number,
    number,
  ];
  /** Isolated group opacity in [0,1]. Default 1. */ opacity?: number;
  /** Local affine transform [a,b,c,d,e,f], after layout translation. Default identity. */ transform?: [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  /** Clip descendants to this node's arranged bounds. Default false. */ clip?: boolean;
  /** Null/omission inherits the scene/ancestor theme. */ theme?: ThemeMode | null;
  background?: BrushValue | null;
  foreground?: BrushValue | null;
  cornerRadius?: number;
  accessibleName?: string | null;
}
/** Rust-owned presentation tracks. Transforms are applied after layout without relayout. */
export interface AnimationTargets {
  translationX?: number | readonly ScalarKeyFrame[];
  translationY?: number | readonly ScalarKeyFrame[];
  translationZ?:number | readonly ScalarKeyFrame[];
  scaleX?: number | readonly ScalarKeyFrame[];
  scaleY?: number | readonly ScalarKeyFrame[];
  rotation?: number | readonly ScalarKeyFrame[];
  opacity?: number | readonly ScalarKeyFrame[];
}
/** Offset is normalized to [0,1], strictly increasing; last offset must be 1.
 * Omit offset 0 to continue from the current presentation value. */
export interface ScalarKeyFrame {
  offset: number;
  value: number;
  /** Easing of the interval ending at this keyframe; inherits the animation. */ easing?: AnimationEasing;
  curve?: [number, number, number, number];
}
export interface EasingParameters {
  /** Exponential default 2. */ exponent?: number;
  /** Back default 1. */ amplitude?: number;
  /** Power default 2. */ power?: number;
  /** Elastic default 3. */ oscillations?: number;
  /** Elastic default 3. */ springiness?: number;
  /** Bounce default 3. */ bounces?: number;
  /** Bounce default 2; native clamps values <=1.0001 to 1.01. */ bounciness?: number;
}
export interface AnimationOptions {
  /** Exact damped spring; overrides duration/curve and accepts endpoints only. Default disabled. */ spring?:SpringOptions;
  /** Optional WinUI XAML curve family; otherwise use the cubic easing. */ easingFunction?: EasingFunction;
  /** XAML curve direction; default EaseOut. */ easingMode?: EasingMode;
  easingParameters?: EasingParameters;
  /** Milliseconds. Default 600, from NavigationView indicator duration. */ duration?: number;
  /** Milliseconds before presentation starts. Default 0. */ delay?: number;
  /** Default AnimationEasing.EaseOut. */ easing?: AnimationEasing;
  /** Optional cubic [x1,y1,x2,y2]; overrides easing, x values in [0,1]. */ curve?: [
    number,
    number,
    number,
    number,
  ];
}
export interface Animation {
  /** Exactly one terminal result. Disposal and cancellation resolve rather than reject. */
  readonly finished: Promise<AnimationResult>;
  /** Freeze current presentation; logical targets remain available in properties. Idempotent. */
  cancel(): void;
}
export interface PresentationValues {
  rotation: number;
  translationX: number;
  translationY: number;
  translationZ: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
}
export interface TextOptions extends LayoutOptions {
  /** Maximum visible text lines; 0 (default) leaves the line count unlimited. */ maxLines?:number;
  /** Default FontStyle.Normal. */ fontStyle?: FontStyle;
  text?: string;
  /** Font stack used identically by measurement and rasterization. */ fontFamily?: string;
  /** Default 14 DIP. */ fontSize?: number;
  /** CSS numeric weight, default 400. */ fontWeight?: number;
  /** Unicode line-break wrapping. Default false. */ wrap?: boolean;
  /** Default TextTrimming.None; Clip uses native LineServices rounding; ellipsis preserves grapheme clusters. */ trimming?: TextTrimming;
  /** Default OpticalMarginAlignment.None; Title/Subtitle styles use TrimSideBearings. */ opticalMarginAlignment?:OpticalMarginAlignment;
  /** Explicit baseline spacing; null derives it from the active font. */ lineHeight?:
    number | null;
}
export interface ViewboxOptions extends Omit<LayoutOptions, "padding"> {
  /** Default Stretch.Uniform; Stretch aliases the shared ImageStretch enum. */ stretch?: ImageStretch;
  /** Default StretchDirection.Both. */ stretchDirection?: StretchDirection;
}
export interface ViewboxSnapshot {
  contentSize: [number, number];
  scale: [number, number];
  clip: Rect | null;
}
export interface RepeatSnapshot {
  nextTickAt: number | null;
}
export interface ButtonOptions extends TextOptions {
  /** Request closure of the nearest enclosing Flyout/MenuFlyout/CommandBarFlyout on activation.
   * Defaults false. Uses the normal cancellable Closing event; harmless outside a flyout. */
  closeFlyout?:boolean;
  /** WinUI XamlUICommand object or same-Scene element name; Rust links metadata and executability. */ command?:UICommand|string|null;
  /** JSON-compatible application parameter; default null. */ commandParameter?:unknown;
  /** Default ButtonVariant.Standard. */ variant?: ButtonVariant;
  /** Default ClickMode.Release. Repeated keydown does not repeat Click. */ clickMode?: ClickMode;
}
/** Press starts immediately; timer-owned Click events stop on release, blur or disable. */
export interface RepeatButtonOptions extends ButtonOptions {
  /** First timer tick in integer milliseconds; default 500, minimum 0. */ delay?: number;
  /** Subsequent ticks in integer milliseconds; default 33, minimum 1. */ interval?: number;
}
/** Toggle state is owned by Rust. Null is indeterminate, including in two-state mode.
 * isThreeState changes the user cycle; it never prevents explicit null assignment. */
export interface ToggleOptions extends TextOptions {
  /** Default false. */ isChecked?: boolean | null;
  /** Default false. True cycles false -> true -> null -> false. */ isThreeState?: boolean;
  /** Default Release. */ clickMode?: ClickMode;
}
/** Native exclusive radio semantics. Unnamed groups share a parent; names share a scene root. */
export interface RadioOptions extends TextOptions {
  isChecked?: boolean | null;
  groupName?: string;
}
export interface RadioItem {
  text: string;
  enabled?: boolean;
}
export interface RadioButtonsOptions extends Omit<TextOptions, "text"> {
  header?: string;
  items?: (string | RadioItem)[];
  /** -1 clears selection; default -1. */ selectedIndex?: number;
  /** Maximum column-major columns; default 1. */ maxColumns?: number;
}
export interface ToggleSwitchOptions extends Omit<TextOptions, "text"> {
  /** Default false. */ isOn?: boolean;
  header?: string;
  /** Default On. */ onContent?: string;
  /** Default Off. */ offContent?: string;
}
/** Read-only progress range. Values outside the finite range are clamped by Rust. */
export interface ProgressOptions extends LayoutOptions {
  /** Logical value; default 0. */ value?: number;
  /** Lower bound; default 0. Raising it past maximum also raises maximum. */ minimum?: number;
  /** Upper bound; default 100. Lowering it past minimum also lowers minimum. */ maximum?: number;
  /** Ring defaults true; Bar defaults false. */ isIndeterminate?: boolean;
}
export interface ProgressRingOptions extends ProgressOptions {
  /** False hides the visual and stops its timeline; default true. */ isActive?: boolean;
}
export interface ProgressBarOptions extends ProgressOptions {
  /** Error takes priority over paused; default false. */ showError?: boolean;
  /** Paused foreground and settling indicator; default false. */ showPaused?: boolean;
}
export interface ProgressSnapshot {
  fraction: number;
  phase: number;
  trimStart: number;
  trimEnd: number;
  rotation: number;
  indicatorOffset: number;
  color: string;
  active: boolean;
}
export interface TextBoxOptions extends TextOptions {
  header?: string;
  placeholderText?: string;
  isReadOnly?: boolean;
  acceptsReturn?: boolean;
  /** UTF-16 code units; 0 means no user-input limit. */ maxLength?: number;
  selectionStart?: number;
  selectionLength?: number;
  /** Open #RRGGBB[AA] selection color. */ selectionHighlightColor?:
    string | null;
  /** Tracking in thousandths of an em; default 0. */ characterSpacing?: number;
  isSpellCheckEnabled?: boolean;
}
export interface PasswordBoxOptions extends Omit<
  TextOptions,
  "text" | "wrap" | "trimming" | "lineHeight"
> {
  header?: string;
  placeholderText?: string;
  password?: string;
  /** One BMP character. Default ●. */ passwordChar?: string;
  /** Default PasswordRevealMode.Peek. */ passwordRevealMode?: PasswordRevealMode;
  maxLength?: number;
}
export interface ScrollViewerOptions extends LayoutOptions {
  /** Default ScrollMode.Auto. */ horizontalScrollMode?: ScrollMode;
  /** Default ScrollMode.Auto. */ verticalScrollMode?: ScrollMode;
  /** Default ScrollBarVisibility.Disabled. */ horizontalScrollBarVisibility?: ScrollBarVisibility;
  /** Default ScrollBarVisibility.Visible. */ verticalScrollBarVisibility?: ScrollBarVisibility;
  /** Default ZoomMode.Disabled; programmatic changeView remains available. */ zoomMode?: ZoomMode;
  /** Initial/controlled zoom target. Default 1. */ zoomFactor?: number;
  minZoomFactor?: number;
  maxZoomFactor?: number;
  horizontalOffset?: number;
  verticalOffset?: number;
  isHorizontalScrollChainingEnabled?: boolean;
  isVerticalScrollChainingEnabled?: boolean;
  /** Default false. */ isTabStop?: boolean;
}
/** Browser/native host supplies content measurements; Rust owns bar geometry and input. */
export interface HostScrollMetrics {
  occlusions?: Rect[];
  viewportWidth: number;
  viewportHeight: number;
  extentWidth: number;
  extentHeight: number;
  horizontalOffset: number;
  verticalOffset: number;
}
export interface ViewChange {
  horizontalOffset?: number;
  verticalOffset?: number;
  zoomFactor?: number;
  disableAnimation?: boolean;
}
export interface ScrollSnapshot {
  hosted: boolean;
  /** Rust wheel ownership, including attempts beyond either end of an axis. */
  horizontalWheelContained: boolean;
  verticalWheelContained: boolean;
  visibleRegions: Rect[];
  horizontalOffset: number;
  verticalOffset: number;
  zoomFactor: number;
  extentWidth: number;
  extentHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  scrollableWidth: number;
  scrollableHeight: number;
  verticalThumb: Rect | null;
  horizontalThumb: Rect | null;
  isIntermediate: boolean;
}
export interface EditorSnapshot {
  characterFormat: RichCharacterFormat;
  scrollableX: number;
  scrollableY: number;
  helperButton: Rect | null;
  helperMask: Rect | null;
  backward: boolean;
  generation: number;
  view: Rect;
  caret: Rect;
  scrollX: number;
  scrollY: number;
  revealed: boolean;
  clearVisible: boolean;
  revealVisible: boolean;
  canUndo: boolean;
  canRedo: boolean;
}
export interface PanelOptions extends LayoutOptions {
  /** Default Orientation.Vertical for StackPanel. */ orientation?: Orientation;
  spacing?: number;
  /** Grid row gap in DIP; defaults to spacing (0 when omitted). */ rowSpacing?: number;
  /** Grid column gap in DIP; defaults to spacing (0 when omitted). */ columnSpacing?: number;
  rows?: GridTrack[];
  columns?: GridTrack[];
}
export interface ImageOptions extends LayoutOptions {
  source?: string;
  /** Default ImageStretch.Uniform. */ stretch?: ImageStretch;
}
export interface SceneOptions {
  /** Fit an inline host width to the Rust root's measured content. Default false. */ autoWidth?: boolean;
  /** Fit the host height to Rust's measured root content. Default false. */ autoHeight?: boolean;
  /** Default RendererBackend.Canvas2D. WebGL2 initialization failures are reported. */ backend?: RendererBackend;
  /** Default ThemeMode.Light. */ theme?: ThemeMode;
  /** Omission follows prefers-reduced-motion, including live policy changes. */ reducedMotion?: boolean;
  /** Omission follows prefers-reduced-transparency, including live policy changes. */ reducedTransparency?: boolean;
  /** Properties of the shared root Grid. */ root?: PanelOptions;
}
export interface SceneEvent {
  /** Recommended transition emitted by the Rust NavigationView. */ recommendedNavigationTransition?:NavigationTransition;
  table?:TableViewEventData;
  frameNavigation?:SceneFrameNavigationEvent["frameNavigation"];
  navigation?:NavigationEventData;
  collection?:CollectionEventData;
  acceptedOperation?:DataPackageOperation;
  /** InfoBar close cause, present on close notifications. */ closeReason?:InfoBarCloseReason;
  /** Coerced ProgressBar value captured at notification time. */ value?: number;
  text?: string;
  selectionStart?: number;
  selectionLength?: number;
  view?: ScrollSnapshot;
  kind: EventKind;
  target: SceneNode;
  isOn?: boolean;
  isExpanded?: boolean;
  selectedIndex?: number;
  itemId?: string;
  /** Value captured when a checked-state notification was raised. */ isChecked?:
    boolean | null;
  /** PaneClosing and floating-surface Closing support synchronous cancellation. */ cancel: boolean;
}
export interface TextLine {
  text: string;
  width: number;
  baseline: number;
  /** Signed Canvas ink bound to the left of the run origin, in DIP. */ inkLeft:number;
  /** Ink right edge from the run origin, in DIP. */ inkRight:number;
}
export interface NodeSnapshot {
  /** Local composition depth, including connected-animation Z. */ compositionDepth?:number;
  table?:TableViewSnapshot|null;
  /** Rust-owned cursor and selection semantics for the projected control. */
  pointer: { cursor: string; textSelection: string; editorCursor: string; editorTextSelection: string };
  primitive:ScrollPrimitiveSnapshot|null;
  contentHost:SceneFrameSnapshot|{contentNode:number|null;owner:number|null}|null;
  reading?:ReadingSnapshot|null;
  uiCommand?:UICommandMetadata|null;
  viewControl?:ViewControlSnapshot|null;
  repeater?:RepeaterSnapshot|null;
  refresh?:RefreshSnapshot|null;
  command?:CommandSnapshot|null;
  navigationControl?:NavigationControlSnapshot|null;
 collectionItemVisual?:{opacity:number;scale:number}|null;
 collectionIndicator?:{layoutHeight:number;scale:number;opacity:number}|null;
  picker?:PickerSnapshot|null;
  composed?:ComposedSnapshot|null;
  composedOwner?:number|null;
  composedKind?:NodeKind|null;
  collection?:CollectionSnapshot|null;
  compact?:CompactSnapshot|null;
  desired: [number, number];
  editor: EditorSnapshot | null;
  progress: ProgressSnapshot | null;
  repeat: RepeatSnapshot | null;
  viewbox: ViewboxSnapshot | null;
  expander: ExpanderSnapshot | null;
  animatedIcon: AnimatedIconSnapshot | null;
  overlay: OverlaySnapshot | null;
  slider: SliderSnapshot | null;
  scroll: ScrollSnapshot | null;
  /** Diagnostic identity. Business code uses the returned node object. */ id: number;
  parent: number | null;
  children: number[];
  kind: NodeKind;
  rect: Rect;
  world: [number, number, number, number, number, number];
  state: ControlState;
  theme: ThemeMode;
  enabled: boolean;
  visible: boolean;
  focused: boolean;
  tabStop: boolean;
  props: {isExpanderHeader?:boolean;primitives?:Record<string,unknown>;reading?:Record<string,unknown>;pickerControls?:Record<string,unknown>;viewControls?:Record<string,unknown>} & Omit<NumberBoxOptions,"value"> & AutoSuggestBoxOptions & ComboBoxOptions & ContentDialogOptions & TeachingTipOptions & TextOptions &
    PanelOptions & ItemsPanelOptions & Omit<CollectionViewOptions,'items'> & {collectionOwner?:number|null;collectionKey?:string;collectionIndex?:number} &
    ToggleOptions &
    ButtonOptions &
    RepeatButtonOptions &
    ViewboxOptions &
    ImageOptions &
    RadioOptions &
    RadioButtonsOptions &
    ToggleSwitchOptions &
    PopupOptions & ToolTipOptions & MenuFlyoutOptions & SliderOptions & {placementTarget?:number|null} & BorderOptions &
    HyperlinkButtonOptions &
    ExpanderOptions &
    InfoBarOptions & PersonPictureOptions & RatingControlOptions & SplitButtonOptions & ToggleSplitButtonOptions & RectangleOptions & LineOptions & PathOptions & PolygonOptions & PolylineOptions & InfoBadgeOptions & IconSourceElementOptions & Omit<AnimatedIconOptions,"source"> & FontIconOptions & SymbolIconOptions & PathIconOptions & BitmapIconOptions & ImageIconOptions &
    ProgressBarOptions &
    ProgressRingOptions &
    RichEditBoxOptions & TextBoxOptions & Pick<ComboBoxOptions,'isDropDownOpen'> &
    PasswordBoxOptions &
    ScrollViewerOptions & { navigation?: NavigationViewOptions;flyoutTarget?:number|null;contextFlyoutTarget?:number|null };
  text: {
    lines: TextLine[];
    width: number;
    height: number;
    lineHeight?: number;
    line_height: number;
  };
  templatePart: string | null;
  layoutVersion: number;
  paintVersion: number;
  navigation: NavigationSnapshot | null;
  navigationOwner?:number|null;
  presentation: PresentationValues;
  localTransform: [number, number, number, number, number, number];
  materialWeight: number;
  /** Currently presented Acrylic effect colors, including native color transitions. */ materialColors: {
    tint: string;
    luminosity: string;
    fallback: string;
  } | null;
}
export interface SceneSnapshot {
  /** Pending forward references, including names that have not been declared or were removed. */
  unresolvedElementReferences?:readonly {source:number;property:string;targetName:string}[];
  /** Rust template visual overflow used by auto-sized hosts. */ presentationHeight?:number;
  /** Rust-computed raster overflow; never changes the logical layout size. */ surfaceBounds?:Rect;
  /** Rust-owned popup input root; null allows normal background scrolling. */
  backgroundScrollRoot: number | null;
  floatingSurface?:{visible:boolean;bounds:Rect;backend:unknown};
  time: number;
  root: number;
  nodes: NodeSnapshot[];
  events: {
    target: number;
    kind: EventKind;
    itemId?: string;
    /** Value captured when a checked-state notification was raised. */ isChecked?:
      boolean | null;
    requestId?: number;
    value?: number;
    text?: string;
    selectionStart?: number;
    selectionLength?: number;
    view?: ScrollSnapshot;
  }[];
  focused: number | null;
  captured: number | null;
  animating: boolean;
  layoutPasses: number;
  revision: number;
  animationCompletions: { id: number; result: AnimationResult }[];
  imageRequests: string[];
  imageSources: string[];
  nextFrameAt: number | null;
  backend: {
    kind: RendererBackend;
    lost: boolean;
    generation: number;
    draws?: number;
    uploads?: number;
    effectPasses?: number;
    cachedSurfaces?: number;
    basePaints?: number;
  };
}
const nodeIds = new WeakMap<SceneNode, number>();
function identity(node: SceneNode): number {
  const id = nodeIds.get(node);
  if (id === undefined) throw new Error("Unknown node wrapper");
  return id;
}
type Patch = { id: number; patch: object; clientItems?:readonly CollectionItem[];clientGroups?:readonly CollectionGroup[];navigationItems?:readonly NavigationData[];commandSource?:Partial<CommandBarOptions> };
type Disposable = { dispose(): void };
/** One Rust tree and compositor; floating surfaces have a separate platform popup island. */
export class Scene implements Disposable {
  readonly element = document.createElement("div");
  readonly root: Panel;
  private canvas = document.createElement("canvas");
  private projection = document.createElement("div");
  private floating = document.createElement("div");
  private floatingCanvas = document.createElement("canvas");
  private pageBackdrop = new PageBackdrop(this.element, (canvas, r) => {
    if (this.disposed) return;
    this.raw.scene_floating_backdrop(this.handle, canvas ?? undefined, r.x, r.y, r.width, r.height);
    this.schedule();
  });
  private groups = new Map<number, HTMLDivElement>();
  private snapshotProperties=new Map<number,NodeSnapshot["props"]>();
  private semantics = new Map<string, HTMLElement>();
  private nodes = new Map<number, SceneNode>();
  private parents = new Map<number, number>();
  private abort = new AbortController();
  private viewport: SurfaceMetrics;
  private pendingSurfaceResize=false;
  private surfaceVisibility?:IntersectionObserver;
  private frame = 0;
  private disposed = false;
  private snapshotListeners=new Set<(snapshot:Readonly<SceneSnapshot>)=>void>();
  private nodeSnapshotListeners=new Map<number,Set<(snapshot:NodeSnapshot)=>void>>();
  private hostActive = true;
  private dispatching = false;
  private jobs: (() => void)[] = [];
  private transaction: Patch[] | null = null;
  private state!: SceneSnapshot;
  private _theme: ThemeMode;
  private reduced: boolean;
  private transparency: boolean;
  private automaticMotion: boolean;
  private automaticTransparency: boolean;
  private animations = new Map<
    number,
    { node: SceneNode; resolve: (result: AnimationResult) => void }
  >();
  private pendingImages = new Map<string, HTMLImageElement>();
  private restoreKeyboardFocus = false;
  private pendingFocus: number | null = null;
  private editorHosts = new Map<number, EditorHost>();
  private contentGroups = new Map<number, HTMLDivElement>();
  private scrollHostTargets = new Map<number, string>();
  private scrollTouches = new Set<number>();
  private wakeTimer: ReturnType<typeof setTimeout> | undefined;
  private drawing = false;
  private autoHeight = false;
  private autoWidth = false;
  private contentHosts = new Map<number, {element:HTMLElement;observer:ResizeObserver;measure:()=>void}>();
  private groupStyles = new WeakMap<HTMLElement,string>();
  private navigationPartStyles=new WeakMap<HTMLElement,string>();
  private projectedChildren=new Map<number,{content:HTMLElement;children:number[]}>();
  private projectedHostClip='';
  private stats = { frames: 0, totalMs: 0, maxMs: 0, samples: [] as number[] };
  private readonly handle: number;
  constructor(
    private raw: WinUiRuntime,
    host: HTMLElement,
    options: SceneOptions,
    private clock: () => number,
    private released: () => void,
  ) {
    this._theme = options.theme ?? ThemeMode.Light;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const transparency = matchMedia("(prefers-reduced-transparency: reduce)");
    this.automaticMotion = options.reducedMotion === undefined;
    this.automaticTransparency = options.reducedTransparency === undefined;
    this.reduced = options.reducedMotion ?? motion.matches;
    this.transparency = options.reducedTransparency ?? transparency.matches;
    motion.addEventListener(
      "change",
      () => {
        if (this.automaticMotion) {
          this.reduced = motion.matches;
          this.applyPolicies();
        }
      },
      { signal: this.abort.signal },
    );
    transparency.addEventListener(
      "change",
      () => {
        if (this.automaticTransparency) {
          this.transparency = transparency.matches;
          this.applyPolicies();
        }
      },
      { signal: this.abort.signal },
    );
    this.element.className = "winui-surface winui-scene";
    this.element.dataset.backend = options.backend ?? RendererBackend.Canvas2D;
    this.element.style.cssText =
      "position:relative;width:100%;height:100%;overflow:visible;touch-action:pan-y;cursor:default;user-select:none;";
    this.canvas.style.cssText =
      "position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;";
    this.canvas.setAttribute("aria-hidden", "true");
    this.projection.style.cssText =
      "position:absolute;inset:0;pointer-events:none;";
    this.floating.setAttribute('popover','manual');
    this.floating.dataset.winuiFloating='';
    this.floating.style.cssText='position:fixed;inset:auto;margin:0;padding:0;border:0;background:transparent;overflow:visible;pointer-events:none;max-width:none;max-height:none;transform-origin:0 0;';
    this.floatingCanvas.style.cssText='position:absolute;pointer-events:none;';
    this.floatingCanvas.setAttribute('aria-hidden','true');
    this.floating.append(this.floatingCanvas);
    this.element.append(this.canvas, this.projection, this.floating);
    const { autoHeight, autoWidth, ...runtimeOptions } = options;
    this.autoHeight = !!autoHeight;
    this.autoWidth = !!autoWidth;
    this.handle = raw.scene_create(
      JSON.stringify({
        ...runtimeOptions,
        autoHeight:this.autoHeight,
        reducedMotion: this.reduced,
        reducedTransparency: this.transparency,
      }),
      this.canvas,
    );
    raw.scene_floating_surface(this.handle,this.floatingCanvas);
    this.root = new Panel(this, raw.scene_root(this.handle), NodeKind.Grid);
    this.nodes.set(identity(this.root), this.root);
    host.append(this.element);
    this.element.addEventListener('dblclick',e=>{if(e.target instanceof HTMLTextAreaElement||e.target instanceof HTMLInputElement)return;e.preventDefault();this.send({kind:'richPointerSelection',id:0,...this.point(e),paragraph:false});},{signal:this.abort.signal});
    this.element.addEventListener('click',e=>{if(e.detail===3&&!(e.target instanceof HTMLTextAreaElement)&&!(e.target instanceof HTMLInputElement)){e.preventDefault();this.send({kind:'richPointerSelection',id:0,...this.point(e),paragraph:true});}},{signal:this.abort.signal});

    const releaseScrollScope = registerScrollInputScope(host.ownerDocument, {
      root: () => this.disposed || !this.hostActive || !host.isConnected ? 0 : this.raw.scene_scroll_scope(this.handle),
      contains: target => {
        if (!(target instanceof Node)) return false;
        const root=this.raw.scene_scroll_scope(this.handle),owner=this.state?.nodes.find(n=>n.id===root)?.composedOwner;
        return !!this.groups.get(root)?.contains(target) || !!this.groups.get(owner??0)?.contains(target);
      },
      wheel: event => {
        const scale=event.deltaMode===1?16:event.deltaMode===2?this.viewport.height:1;
        this.raw.scene_wheel(this.handle,JSON.stringify({...this.point(event),dx:(event.shiftKey&&event.deltaX===0?event.deltaY:event.deltaX)*scale,dy:(event.shiftKey&&event.deltaX===0?0:event.deltaY)*scale,ctrl:event.ctrlKey}),this.clock());
        this.schedule();
      },
      dismiss: id => this.send({kind:'closeOverlay',id}),
    });
    this.abort.signal.addEventListener('abort',releaseScrollScope,{once:true});
    const signal = this.abort.signal;
    this.element.addEventListener('paste',event=>{let n=this.state.nodes.find(n=>n.id===this.state.focused);while(n&&n.kind!==NodeKind.TableView)n=this.state.nodes.find(parent=>parent.id===n!.parent);if(n&&!n.table?.editingCell){event.preventDefault();this.send({kind:'table',id:n.id,action:'requestPaste',data:{text:event.clipboardData?.getData('text/plain')??''}});}},{signal});
    this.element.addEventListener('contextmenu',event=>{
      const target=(event.target as Element).closest<HTMLElement>('[data-scene-node]');
      let node=this.state.nodes.find(n=>n.id===Number(target?.dataset.sceneNode));
      const original=node;while(node&&!node.props.contextFlyoutTarget&&node.kind!==NodeKind.Button&&node.kind!==NodeKind.TableView)node=this.state.nodes.find(n=>n.id===node!.parent);
      if(node){event.preventDefault();this.send(node.kind===NodeKind.TableView?{kind:'table',id:node.id,action:'context',data:{target:original?.id}}:{kind:'contextRequest',id:node.id});}
      else if(this.state.nodes.some(node=>node.props.contextFlyoutTarget)){event.preventDefault();this.send({kind:'contextRequestAt',...this.point(event)});}
    },{signal});
    document.addEventListener("scroll",()=>{if(this.state?.floatingSurface?.visible)this.schedule();},{signal,capture:true,passive:true});
    let lastPointerTouch=false;
    const pointerDevice=(event:PointerEvent)=>{const touch=event.pointerType==='touch';if(touch!==lastPointerTouch){lastPointerTouch=touch;this.send({kind:'pointerDevice',touch});}};
    this.element.addEventListener(
      "pointermove",
      (e) => {
        pointerDevice(e);
        if (this.scrollTouches.has(e.pointerId)) {
          this.send({
            kind: "touch",
            phase: "move",
            ...this.point(e),
            pointer: e.pointerId,
          });
          return;
        }
        this.send({ kind: "move", ...this.point(e), pointer: e.pointerId });
      },
      { signal },
    );
    this.element.addEventListener(
      "pointerdown",
      (e) => {
        pointerDevice(e);
        this.send({kind:'modifiers',ctrl:e.ctrlKey,shift:e.shiftKey});
        if (
          e.pointerType === "touch" &&
          !(e.target as Element).closest('[role="slider"]') &&
          (e.target as Element).closest(
            "[data-scroll-viewer]:not([data-hosted-scroll]),[data-flip-viewer],[data-navigation-touch]",
          )
        ) {
          this.scrollTouches.add(e.pointerId);
          this.element.setPointerCapture(e.pointerId);
          this.send({
            kind: "touch",
            phase: "down",
            ...this.point(e),
            pointer: e.pointerId,
          });
          return;
        }
        if (e.button !== 0) return;
        const partId=Number((e.target as HTMLElement).closest<HTMLElement>('[data-scene-node]')?.dataset.sceneNode);
        const part=this.state.nodes.find(n=>n.id===partId),list=this.state.nodes.find(n=>n.id===part?.props.collectionOwner),owner=this.state.nodes.find(n=>n.id===(part?.composedOwner??list?.composedOwner));
        if(owner?.composed?.parts.InputBox!==undefined&&(part?.kind===NodeKind.Button||part?.kind===NodeKind.RepeatButton||part?.kind===NodeKind.CollectionItem&&(owner.kind===NodeKind.AutoSuggestBox||owner.props.isEditable)))e.preventDefault();
        this.restoreKeyboardFocus = true;
        this.send({ kind: "down", ...this.point(e), pointer: e.pointerId });
        if (!(e.target instanceof HTMLTextAreaElement))
          this.element.setPointerCapture(e.pointerId);
      },
      { signal },
    );
    this.element.addEventListener(
      "pointerup",
      (e) => {
        if (e.button !== 0) return;
        if (this.scrollTouches.delete(e.pointerId)) {
          this.send({
            kind: "touch",
            phase: "up",
            ...this.point(e),
            pointer: e.pointerId,
          });
          if (this.element.hasPointerCapture(e.pointerId))
            this.element.releasePointerCapture(e.pointerId);
          return;
        }
        this.send({ kind: "up", ...this.point(e), pointer: e.pointerId });
        if (this.element.hasPointerCapture(e.pointerId))
          this.element.releasePointerCapture(e.pointerId);
      },
      { signal },
    );
    for (const name of ["pointercancel", "lostpointercapture"] as const)
      this.element.addEventListener(
        name,
        (e) => {
          if (this.scrollTouches.delete(e.pointerId))
            this.send({
              kind: "touch",
              phase: "cancel",
              ...this.point(e),
              pointer: e.pointerId,
            });
          else this.send({ kind: "cancel", pointer: e.pointerId });
        },
        { signal },
      );
    window.addEventListener('scroll',()=>{if(this.state?.nodes.some(n=>n.overlay?.isOpen))this.schedule();},{signal,capture:true,passive:true});
    window.addEventListener('resize',()=>{if(this.state?.nodes.some(n=>n.overlay?.isOpen))this.schedule();},{signal,passive:true});
    this.element.addEventListener(
      "pointerleave",
      () => this.send({ kind: "leave" }),
      { signal },
    );
    this.element.addEventListener(
      "focusout",
      (e) => {
        if (!this.element.contains(e.relatedTarget as Node | null))
          this.send({ kind: "blur" });
      },
      { signal },
    );
    document.addEventListener('pointerdown',e=>{
      if(!this.element.contains(e.target as Node)) {
        const surface=this.state.nodes.filter(n=>n.overlay?.isOpen&&n.kind!==NodeKind.ToolTip&&n.props.isLightDismissEnabled).sort((a,b)=>b.overlay!.order-a.overlay!.order)[0];
        if(surface)this.send({kind:'closeOverlay',id:surface.id});
        else if(this.state.nodes.some(n=>n.kind===NodeKind.CommandBar&&n.props.isOpen))this.send({kind:'dismissCommandBars'});
      }
    },{signal});
    this.element.addEventListener(
      "keydown",
      (e) => {
        const commandKey=e.code==='NumpadAdd'?'Add':e.code==='NumpadSubtract'?'Subtract':e.key;
        if(e.ctrlKey&&['+','-','=','Add','Subtract'].includes(commandKey)&&this.state.nodes.some(n=>n.kind===NodeKind.SemanticZoom&&n.visible)){e.preventDefault();if(!e.repeat)this.send({kind:'commandAccelerator',key:commandKey,control:e.ctrlKey,shift:e.shiftKey,alt:e.altKey});return;}
        if(this.state.nodes.some(n=>n.uiCommand?.canExecute&&n.uiCommand.accelerators.some(a=>a.key.toLowerCase()===commandKey.toLowerCase()&&(a.modifiers?.includes('Control' as never)??false)===e.ctrlKey&&(a.modifiers?.includes('Shift' as never)??false)===e.shiftKey&&(a.modifiers?.includes('Alt' as never)??false)===e.altKey))){e.preventDefault();if(!e.repeat)this.send({kind:'commandAccelerator',key:commandKey,control:e.ctrlKey,shift:e.shiftKey,alt:e.altKey});return;}
        const menuShortcut=(entries:readonly MenuEntry[]):boolean=>entries.some(item=>item.kind!==MenuEntryKind.Separator&&item.enabled!==false&&((item.keyboardAccelerators??[]).some(a=>a.key.toLowerCase()===commandKey.toLowerCase()&&(a.modifiers?.includes(KeyboardAcceleratorModifier.Control)??false)===e.ctrlKey&&(a.modifiers?.includes(KeyboardAcceleratorModifier.Shift)??false)===e.shiftKey&&(a.modifiers?.includes(KeyboardAcceleratorModifier.Alt)??false)===e.altKey)||menuShortcut(item.items??[])));
        if(this.state.nodes.some(n=>(n.kind===NodeKind.MenuBarItem||n.kind===NodeKind.MenuFlyout)&&n.enabled&&n.visible&&menuShortcut((n.props as unknown as {menuItems:MenuEntry[]}).menuItems))){e.preventDefault();if(!e.repeat)this.send({kind:'commandAccelerator',key:commandKey,control:e.ctrlKey,shift:e.shiftKey,alt:e.altKey});return;}
        if(this.state.nodes.some(n=>n.enabled&&(n.command?.owner?this.state.nodes.some(owner=>owner.id===n.command!.owner&&owner.visible):n.visible)&&n.props.visible!==false&&(n.props as unknown as {commandControls?:{keyboardAccelerators?:{key:string;modifiers?:readonly string[]}[]}}).commandControls?.keyboardAccelerators?.some(a=>a.key.toLowerCase()===commandKey.toLowerCase()&&(a.modifiers?.includes('Control')??false)===e.ctrlKey&&(a.modifiers?.includes('Shift')??false)===e.shiftKey&&(a.modifiers?.includes('Alt')??false)===e.altKey))){e.preventDefault();if(!e.repeat)this.send({kind:'commandAccelerator',key:commandKey,control:e.ctrlKey,shift:e.shiftKey,alt:e.altKey});return;}
        if((e.ctrlKey||e.metaKey)&&e.target instanceof HTMLElement&&e.target.closest('[role="tablist"]')&&(e.key==='Tab'||e.key==='F4')){e.preventDefault();this.restoreKeyboardFocus=true;this.send({kind:'modifiers',ctrl:true,shift:e.shiftKey});this.send({kind:'keyDown',key:e.key,repeat:e.repeat});return;}
        if(e.key==='Tab'&&this.state.nodes.some(n=>n.kind===NodeKind.ContentDialog&&n.composed?.modalActive)){e.preventDefault();this.send({kind:'modifiers',ctrl:e.ctrlKey||e.metaKey,shift:e.shiftKey});this.send({kind:'keyDown',key:'Tab',repeat:e.repeat});return;}
        if(e.key==='Escape'&&this.state.nodes.some(n=>n.overlay?.isOpen&&n.kind!==NodeKind.ToolTip||n.kind===NodeKind.CommandBar&&n.props.isOpen)) {
          e.preventDefault();this.send({kind:'keyDown',key:'Escape',repeat:e.repeat});return;
        }
        if (
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLInputElement
        )
          return;
        if (
          [
            " ",
            "Enter",
            "F4",
            "ArrowUp",
            "ArrowDown",
            "ArrowLeft",
            "ArrowRight",
            "Home",
            "End",
            "PageUp",
            "PageDown",
          ].includes(e.key)
        ) {
          e.preventDefault();
          this.restoreKeyboardFocus = true;
        }
        const tableFocus=this.state?.nodes.find(n=>n.id===this.state.focused&&n.kind===NodeKind.TableView);if(tableFocus&&((e.ctrlKey||e.metaKey)&&["a","c"].includes(e.key.toLowerCase())||e.key==="F2"))e.preventDefault();
        // Focus has reached Rust before the next snapshot arrives. A key in
        // that frame must retain modifiers from the actual rich-text target.
        const eventTargetId=e.target instanceof Element?Number(e.target.closest('[data-scene-node]')?.getAttribute('data-scene-node')):NaN;
        const richFocus=this.state?.nodes.find(n=>(n.id===eventTargetId||n.id===this.state.focused)&&[NodeKind.RichTextBlock,NodeKind.RichTextBlockOverflow].includes(n.kind));
        if(richFocus&&(e.ctrlKey||e.metaKey)&&['a','c'].includes(e.key.toLowerCase()))e.preventDefault();
        const collectionFocus=this.state?.nodes.find(n=>n.id===this.state.focused&&(collectionKind(n.kind)||n.kind===NodeKind.TreeView));
        if(!collectionFocus&&(e.key==='ContextMenu'||e.shiftKey&&e.key==='F10')){
          e.preventDefault();this.send({kind:'keyDown',key:'ContextMenu',repeat:e.repeat});return;
        }
        if(collectionFocus&&((e.ctrlKey&&e.key.toLowerCase()==='a')||e.key==='ContextMenu'||e.shiftKey&&e.key==='F10'))e.preventDefault();
        this.send({
          kind: "keyDown",
          key:
            (collectionFocus||richFocus) ? `${e.ctrlKey?'Ctrl+':''}${e.altKey?'Alt+':''}${e.shiftKey?'Shift+':''}${e.key}` :
            e.altKey&&e.key==='ArrowDown'?'Alt+ArrowDown':
            e.code === "NumpadAdd"
              ? "Add"
              : e.code === "NumpadSubtract"
                ? "Subtract"
                : e.key,
          repeat: e.repeat,
        });
      },
      { signal },
    );
    this.element.addEventListener(
      "keyup",
      (e) => {
        if (
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLInputElement
        )
          return;
        if (e.key === " " || e.key === "Enter") e.preventDefault();
        this.send({ kind: "keyUp", key: e.key });
      },
      { signal },
    );
    this.element.addEventListener(
      "wheel",
      (e) => {
        const point = this.point(e);
        const scale =
          e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.viewport.height : 1;
        if (
          this.raw.scene_wheel(
            this.handle,
            JSON.stringify({
              ...point,
              dx: (e.shiftKey && e.deltaX === 0 ? e.deltaY : e.deltaX) * scale,
              dy: (e.shiftKey && e.deltaX === 0 ? 0 : e.deltaY) * scale,
              ctrl: e.ctrlKey,
            }),
            this.clock(),
          )
        ) {
          e.preventDefault();
          this.schedule();
          return;
        }
        const n = this.state?.nodes
          .slice()
          .reverse()
          .find(
            (n) =>
              n.kind === NodeKind.NavigationView &&
              n.navigation &&
              this.inWorld(n, point),
          );
        if (!n?.navigation) return;
        const x = (point.x - n.world[4]) / n.world[0];
        const nav = n.navigation;
        const kind = x < nav.pane.width ? "wheel" : "contentWheel";
        if ((kind === "wheel" ? nav.maxScroll : nav.maxContentScroll) > 0) {
          e.preventDefault();
          this.send({
            kind: "navigation",
            id: n.id,
            input: {
              kind,
              delta:
                e.deltaY *
                (e.deltaMode === 1
                  ? 16
                  : e.deltaMode === 2
                    ? this.element.clientHeight
                    : 1),
            },
          });
        }
      },
      { signal, passive: false },
    );
    this.floatingCanvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.schedule();},{signal});
    this.floatingCanvas.addEventListener('webglcontextrestored',()=>{if(!this.disposed){this.raw.scene_restore(this.handle);this.schedule();}},{signal});
    this.canvas.addEventListener(
      "webglcontextlost",
      (e) => {
        e.preventDefault();
        this.schedule();
      },
      { signal },
    );
    this.canvas.addEventListener(
      "webglcontextrestored",
      () => {
        if (!this.disposed) {
          this.raw.scene_restore(this.handle);
          this.schedule();
        }
      },
      { signal },
    );
    const fontsChanged = () => {
      if (!this.disposed) {
        this.raw.scene_fonts_changed(this.handle);
        this.schedule();
      }
    };
    document.fonts.addEventListener("loadingdone", fontsChanged, { signal });
    void document.fonts.ready.then(fontsChanged);
    this.viewport = new SurfaceMetrics(
      this.element,
      () => this.surfaceSizeChanged(),
      signal,
    );
    if(!this.autoHeight&&!this.autoWidth){
      this.surfaceVisibility=new IntersectionObserver(entries=>{if(this.pendingSurfaceResize&&entries.some(entry=>entry.isIntersecting))this.schedule();});
      this.surfaceVisibility.observe(this.element);
      document.addEventListener('scroll',()=>{if(this.pendingSurfaceResize&&this.surfaceOnScreen())this.schedule();},{signal,capture:true,passive:true});
    }
    try {
      this.draw();
    } catch (error) {
      this.dispose();
      throw error;
    }
  }
  private get projectedHeight(){return this.autoHeight?(this.state?.presentationHeight??this.viewport.height):this.viewport.height;}
  private surfaceOnScreen(){const r=this.element.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth;}
  private surfaceSizeChanged(){
    // Intrinsic-size hosts still measure immediately for their parent's layout.
    // Fixed-size offscreen surfaces retain pixels through repeated resizes.
    if(this.autoHeight||this.autoWidth||this.state?.floatingSurface?.visible||this.surfaceOnScreen())this.schedule();
    else this.pendingSurfaceResize=true;
  }
  private flushSurfaceResize(){if(this.pendingSurfaceResize&&!this.drawing)this.draw();}
  private updatePopupViewport(r=this.element.getBoundingClientRect()){
    if(!this.hostActive||r.width<=0||r.height<=0||this.viewport.width<=0||this.projectedHeight<=0)return;
    const sx=this.viewport.width/r.width,sy=this.projectedHeight/r.height;
    if(!Number.isFinite(sx)||!Number.isFinite(sy))return;
    this.raw.scene_popup_viewport(this.handle,-r.left*sx,-r.top*sy,Math.min(16384,window.innerWidth*sx),Math.min(16384,window.innerHeight*sy));
  }
  private point(e: { clientX: number; clientY: number }) {
    const r = this.element.getBoundingClientRect();
    this.updatePopupViewport(r);
    return {
      x: ((e.clientX - r.left) * this.viewport.width) / Math.max(1, r.width),
      y: ((e.clientY - r.top) * this.projectedHeight) / Math.max(1, r.height),
    };
  }
  private inWorld(n: NodeSnapshot, p: { x: number; y: number }) {
    const [a, b, c, d, e, f] = n.world;
    const det = a * d - b * c;
    if (!det) return false;
    const x = (d * (p.x - e) - c * (p.y - f)) / det,
      y = (-b * (p.x - e) + a * (p.y - f)) / det;
    return x >= 0 && x < n.rect.width && y >= 0 && y < n.rect.height;
  }
  private assertAlive() {
    if (this.disposed) throw new Error("Scene is disposed");
  }
  get isDisposed():boolean{return this.disposed;}
  /** Suspend presentation for an unloaded/cached page without destroying its Rust controls or input state. */
  setHostActive(active:boolean):void {
    this.assertAlive();if(this.hostActive===active)return;this.hostActive=active;
    if(!active){this.pageBackdrop.stop();cancelAnimationFrame(this.frame);this.frame=0;clearTimeout(this.wakeTimer);if(this.floating.matches(':popover-open'))this.floating.hidePopover();}
    else this.schedule();
  }
  /** Present pending Rust state synchronously, for initial host composition. */
  render(){this.assertAlive();this.draw();}
  private schedule() {
    if (!this.frame && !this.disposed && this.hostActive)
      this.frame = requestAnimationFrame(() => {
        this.frame = 0;
        this.draw();
      });
  }
  private send(input: object) {
    if (this.disposed) return;
    this.flushSurfaceResize();
    if((input as {kind?:string}).kind==='keyDown')this.updatePopupViewport();
    this.raw.scene_input(this.handle, JSON.stringify(input), this.clock());
    this.schedule();
  }
  /** @internal Platform drag host; state transitions and geometry stay in Rust. */
  collectionInput(node:CollectionView,input:object){
    node.assertOwned(this);
    if(this.dispatching){this.send(input);return this.state.nodes.find(n=>n.id===identity(node))?.collection?.drag;}
    let command:object|null=input;let drag:CollectionSnapshot['drag']|undefined;
    try{
      // Negotiate synchronously without presenting Canvas or reparenting DOM.
      // Callbacks can enqueue a resolution; drain those notifications in this
      // bounded loop, and leave any user-triggered event chain for the next frame.
      for(let pass=0;pass<4&&!node.isDisposed&&!this.disposed;pass++){
        const result=JSON.parse(this.raw.scene_collection_input(this.handle,identity(node),JSON.stringify(command),this.clock())) as {drag:CollectionSnapshot['drag']|null;events:Parameters<Scene['dispatch']>[0]};
        command=null;drag=result.drag??undefined;
        if(!result.events.length)break;
        this.dispatch(result.events);
      }
      return drag;
    }finally{this.schedule();}
  }
  private finishCollectionTransfer(transfer:NonNullable<typeof collectionTransfer>,operation:DataPackageOperation){
    if(transfer.finishing)return;transfer.finishing=true;
    if(collectionTransfer===transfer)collectionTransfer=undefined;
    const oldPool=collectionCompletionPool;collectionCompletionPool=transfer.pool;
    try{if(transfer.target&&!transfer.target.isDisposed)transfer.target.driveDrag({kind:'collectionDragLeave',id:identity(transfer.target)});}
    finally{try{if(!transfer.source.isDisposed)transfer.source.driveDrag({kind:'collectionDragEnd',id:identity(transfer.source),operation});}finally{collectionCompletionPool=oldPool;}}
  }
  private attachCollectionDrop(group:HTMLElement,id:number){
    if(group.dataset.collectionDrop!==undefined)return;group.dataset.collectionDrop='';
    const options={signal:this.abort.signal};
    group.addEventListener('dragover',event=>{
      const transfer=collectionTransfer,node=this.collectionController(this.nodes.get(id));if(!transfer||!node||node.isDisposed||transfer.source.isDisposed)return;
      event.stopPropagation();if(transfer.target&&transfer.target!==node&&!transfer.target.isDisposed)transfer.target.driveDrag({kind:'collectionDragLeave',id:identity(transfer.target)});
      transfer.target=node;const metadata=transfer.metadata;
      const drag=this.collectionInput(node,{kind:'collectionDragOver',id,source:transfer.scene===this?identity(transfer.source):null,items:metadata,...this.point(event),operation:event.ctrlKey?DataPackageOperation.Copy:DataPackageOperation.Move});
      if(drag&&drag.operation!==DataPackageOperation.None){event.preventDefault();if(event.dataTransfer)event.dataTransfer.dropEffect=drag.operation===DataPackageOperation.Copy?'copy':drag.operation===DataPackageOperation.Link?'link':'move';}
    },options);
    group.addEventListener('dragleave',event=>{if(event.relatedTarget instanceof Node&&group.contains(event.relatedTarget))return;const rect=group.getBoundingClientRect();if(event.clientX>=rect.left&&event.clientX<rect.right&&event.clientY>=rect.top&&event.clientY<rect.bottom)return;const node=this.collectionController(this.nodes.get(id));if(node&&!node.isDisposed)this.collectionInput(node,{kind:'collectionDragLeave',id});},options);
    group.addEventListener('drop',event=>{
      const transfer=collectionTransfer,node=this.collectionController(this.nodes.get(id));if(!transfer||!node||transfer.target!==node)return;
      event.stopPropagation();event.preventDefault();transfer.dropping=true;
      let operation=DataPackageOperation.None;
      try{
        const offer=this.collectionInput(node,{kind:'collectionDragOver',id,source:transfer.scene===this?identity(transfer.source):null,items:transfer.metadata,...this.point(event),operation:event.ctrlKey?DataPackageOperation.Copy:DataPackageOperation.Move});
        const drag=offer&&offer.operation!==DataPackageOperation.None?this.collectionInput(node,{kind:'collectionDrop',id}):undefined;operation=drag?.committed?drag.operation:DataPackageOperation.None;transfer.operation=operation;
        if(drag?.committed&&transfer.scene!==this&&operation===DataPackageOperation.Move&&!transfer.source.isDisposed)transfer.scene.collectionInput(transfer.source,{kind:'collectionRemove',id:identity(transfer.source),keys:transfer.keys});
      }finally{
        // A successful move recycles the source option. Browsers may omit its
        // dragend event once that element is detached; drop must own completion.
        transfer.dropping=false;this.finishCollectionTransfer(transfer,operation);
      }
    },options);
  }
  private attachCollectionDrag(group:HTMLElement,id:number,owner:number,properties:NodeSnapshot['props']|undefined){
    const view=this.collectionController(this.nodes.get(owner));group.draggable=!!view&&!!(properties?.canDragItems||properties?.canReorderItems&&!view.clientGroups.length);
    if(group.dataset.collectionDrag!==undefined)return;group.dataset.collectionDrag='';
    group.addEventListener('contextmenu',event=>{const current=this.state.nodes.find(n=>n.id===id),view=this.collectionController(this.nodes.get(owner));if(!current||!view)return;event.preventDefault();this.collectionInput(view,{kind:'collectionContext',id:owner,index:current.props.collectionIndex,...this.point(event)});},{signal:this.abort.signal});
    group.addEventListener('dragstart',event=>{const current=this.state.nodes.find(n=>n.id===id),source=this.collectionController(this.nodes.get(owner));if(!current||!source){event.preventDefault();return;}
      const rect=group.getBoundingClientRect(),canvasRect=this.canvas.getBoundingClientRect(),image=document.createElement('canvas');const scale=this.canvas.width/Math.max(1,canvasRect.width);image.width=Math.max(1,Math.round(rect.width*scale));image.height=Math.max(1,Math.round(rect.height*scale));image.getContext('2d')?.drawImage(this.canvas,(rect.left-canvasRect.left)*scale,(rect.top-canvasRect.top)*scale,image.width,image.height,0,0,image.width,image.height);event.stopPropagation();const drag=this.collectionInput(source,{kind:'collectionDragStart',id:owner,index:current.props.collectionIndex});if(!drag?.active){event.preventDefault();return;}
      collectionTransfer={scene:this,source,keys:drag.keys,pool:new Map(drag.keys.flatMap(key=>{const item=source.itemForKey(key);return item===undefined?[]:[[key,item] as const];})),operation:DataPackageOperation.None,metadata:drag.keys.flatMap(key=>{const item=source.itemForKey(key);return item===undefined?[]:[{id:key,text:typeof item==='string'?item:item.text??item.id,enabled:typeof item==='string'?true:item.enabled??true}];})};
      if(event.dataTransfer){event.dataTransfer.effectAllowed='copyMove';event.dataTransfer.setData('application/x-winui-collection','internal');event.dataTransfer.setData('text/plain',drag.keys.map(k=>source.itemForKey(k)).map(i=>typeof i==='string'?i:i?.text??i?.id).join('\n'));
        event.dataTransfer.setDragImage(image,Math.min(rect.width/2,48),Math.min(rect.height/2,24));
      }
    },{signal:this.abort.signal});
    group.addEventListener('dragend',()=>{const transfer=collectionTransfer;if(transfer&&!transfer.dropping)this.finishCollectionTransfer(transfer,transfer.operation);},{signal:this.abort.signal});
  }
  private draw() {
    if (this.disposed || this.drawing || !this.hostActive) return;
    this.pendingSurfaceResize=false;
    this.drawing = true;
    try {
      const start = performance.now();
      if(!this.state||this.state.nodes.some(n=>n.overlay?.isOpen))this.updatePopupViewport();
      this.state = JSON.parse(
        this.raw.scene_frame(
          this.handle,
          this.clock(),
          this.viewport.width,
          this.viewport.height,
          this.viewport.dpr,
        ),
      ) as SceneSnapshot;
      for(const node of this.state.nodes){if(node.props)this.snapshotProperties.set(node.id,node.props);else{const cached=this.snapshotProperties.get(node.id);if(!cached)throw new Error("Missing initial Rust node properties");node.props=cached;}}
      const live=new Set(this.state.nodes.map(n=>n.id));
      for(const id of this.snapshotProperties.keys())if(!live.has(id))this.snapshotProperties.delete(id);
      for(const snapshot of this.state.nodes){const node=this.nodes.get(snapshot.id);if(node instanceof NavigationControl&&snapshot.navigationControl)node.setClientNavigationSelection(snapshot.navigationControl.selectedIndex,snapshot.navigationControl.selectedPageIndex);}
      for(const [id,node] of this.nodes)if(!live.has(id)){this.settleDisposed(node);node.markDisposed();this.nodes.delete(id);this.parents.delete(id);this.nodeSnapshotListeners.delete(id);}
      for(const n of this.state.nodes)if(n.table)for(const slot of n.table.realized){if(!this.nodes.has(slot.id))this.nodes.set(slot.id,new Panel(this,slot.id,NodeKind.Grid));const parent=this.state.nodes.find(n=>n.id===slot.id)?.parent;if(parent)this.parents.set(slot.id,parent);}
      for(const n of this.state.nodes)if((n.kind===NodeKind.CollectionItem||n.kind===NodeKind.CollectionHeader)&&!this.nodes.has(n.id))this.nodes.set(n.id,new CollectionItemContainer(this,n.id,n.kind));
      for(const n of this.state.nodes){if(n.repeater)for(const slot of n.repeater.realized){if(!this.nodes.has(slot.id))this.nodes.set(slot.id,new RepeaterItemContainer(this,slot.id,NodeKind.Grid));this.parents.set(slot.id,n.id);}if(n.refresh?.visualizer&&!this.nodes.has(n.refresh.visualizer)){this.nodes.set(n.refresh.visualizer,new RefreshVisualizer(this,n.refresh.visualizer,NodeKind.RefreshVisualizer));this.parents.set(n.refresh.visualizer,n.id);}}
      this.viewport.present(this.canvas);
      const surface=this.state.surfaceBounds;
      this.canvas.style.left=`${surface?.x??0}px`;this.canvas.style.top=`${surface?.y??0}px`;
      this.presentFloatingSurface();
      if (this.autoHeight) {
        const height =
          this.state.presentationHeight ?? this.state.nodes.find((n) => n.id === this.state.root)?.desired[1] ?? 0;
        const host = this.element.parentElement;
        if (host && height > 0 && host.style.height !== `${height}px`)
          host.style.height = `${height}px`;
      }
      if (this.autoWidth) {
        const width = this.state.nodes.find(n => n.id === this.state.root)?.desired[0] ?? 0;
        const host = this.element.parentElement;
        if (host && width > 0 && host.style.width !== `${width}px`) host.style.width = `${width}px`;
      }
      const external=this.state.nodes.find(n=>n.navigation?.hostClip!==null&&n.props.navigation?.hasExternalContent);
      const clip=external?.navigation?.hostClip;
      const hostClip=clip?`path('${clip.map(r=>`M ${r.x} ${r.y} h ${r.width} v ${r.height} h ${-r.width} Z`).join(' ')||'M 0 0 Z'}')`:'none';
      if(this.projectedHostClip!==hostClip){this.element.style.clipPath=hostClip;this.projectedHostClip=hostClip;}
      this.element.style.pointerEvents=external?'auto':'';
      this.project();
      for(const n of this.state.nodes){const node=this.nodes.get(n.id);if(node instanceof TableView)this.jobs.push(()=>{if(!node.isDisposed)node.syncTemplates();});}
      for(const n of this.state.nodes){const controller=this.nodes.get(n.id);if(controller instanceof ItemsRepeater)this.jobs.push(()=>{if(!controller.isDisposed)controller.syncTemplate();});}
      for(const snapshot of this.state.nodes){const node=this.nodes.get(snapshot.id);if(node instanceof NavigationControl&&snapshot.navigationControl)this.jobs.push(()=>{if(!node.isDisposed)node.syncNavigationTemplates(snapshot.navigationControl!);});}
      for (const completion of this.state.animationCompletions) {
        this.animations.get(completion.id)?.resolve(completion.result);
        this.animations.delete(completion.id);
      }
      const duration = performance.now() - start;
      this.stats.samples.push(duration);
      if (this.stats.samples.length > 512) this.stats.samples.shift();
      this.stats.frames++;
      this.stats.totalMs += performance.now() - start;
      this.stats.maxMs = Math.max(this.stats.maxMs, performance.now() - start);
      const sources = new Set(this.state.imageSources);
      for (const [source, image] of this.pendingImages)
        if (!sources.has(source)) {
          this.pendingImages.delete(source);
          image.removeAttribute("src");
        }
      for (const source of this.state.imageRequests) this.loadImage(source);
      if (this.state.animating && !this.state.backend.lost) this.schedule();
      this.dispatch(
        this.state.events as unknown as {
          target: number;
          kind: EventKind;
          itemId?: string;
          /** Value captured when a checked-state notification was raised. */ isChecked?:
            boolean | null;
          collection?:CollectionEventData;
      payload?:Partial<ComposedEvent>;
      requestId?: number;
      closeReason?:InfoBarCloseReason;
          value?: number;
          text?: string;
          selectionStart?: number;
          selectionLength?: number;
          view?: ScrollSnapshot;
        }[],
      );
      for(const listener of this.snapshotListeners){try{listener(this.snapshot);}catch(error){reportError(error);}}
      for(const node of this.state.nodes)for(const listener of this.nodeSnapshotListeners.get(node.id)??[]){try{listener(node);}catch(error){reportError(error);}}
      clearTimeout(this.wakeTimer);
      if (!this.state.animating && this.state.nextFrameAt !== null)
        this.wakeTimer = setTimeout(
          () => this.schedule(),
          Math.max(1, this.state.nextFrameAt - this.clock()),
        );
    } finally {
      this.drawing = false;
    }
  }
  private presentFloatingSurface(){
    const surface=this.state.floatingSurface;
    if(!surface?.visible||!this.hostActive){this.pageBackdrop.stop();if(this.floating.matches(':popover-open'))this.floating.hidePopover();return;}
    const r=this.element.getBoundingClientRect(),b=surface.bounds;
    Object.assign(this.floating.style,{left:`${r.left}px`,top:`${r.top}px`,width:`${this.viewport.width}px`,height:`${this.viewport.height}px`,transform:`scale(${r.width/Math.max(1,this.viewport.width)},${r.height/Math.max(1,this.projectedHeight)})`});
    Object.assign(this.floatingCanvas.style,{left:`${b.x}px`,top:`${b.y}px`});
    this.viewport.present(this.floatingCanvas);
    const samplePage = !this.transparency && this._theme !== ThemeMode.HighContrast &&
      this.state.nodes.some(n => n.kind === NodeKind.ComboBox && n.props.isDropDownOpen);
    const sx = r.width / Math.max(1, this.viewport.width), sy = r.height / Math.max(1, this.projectedHeight);
    this.pageBackdrop.sync(samplePage ? { x:r.left+b.x*sx, y:r.top+b.y*sy, width:b.width*sx, height:b.height*sy } : null,
      b, this.viewport.dpr / sx, this.state.backend.kind === RendererBackend.Canvas2D
        ? this.state.backend.basePaints ?? this.state.revision : this.state.revision);
    if(!this.floating.matches(':popover-open'))this.floating.showPopover();
  }
  private projectNavigationControl(n:NodeSnapshot,group:HTMLElement,keys:Set<string>){
    const snapshot=n.navigationControl!,controller=this.nodes.get(n.id);if(!(controller instanceof NavigationControl))return;
    group.setAttribute('role',n.kind===NodeKind.BreadcrumbBar?'navigation':'group');group.setAttribute('aria-label',n.props.accessibleName??n.kind);group.style.pointerEvents='auto';
    let strip=group;
    if(n.kind===NodeKind.SelectorBar)group.setAttribute('role','tablist');
    if(n.kind===NodeKind.TabView){let element=group.querySelector<HTMLElement>(':scope > [data-navigation-strip]');if(!element){element=document.createElement('div');element.dataset.navigationStrip='';element.setAttribute('role','tablist');element.style.cssText='position:absolute;inset:0 0 auto;height:40px;pointer-events:none';group.prepend(element);}strip=element;strip.setAttribute('aria-label',n.props.accessibleName??'Tabs');}
    const options=(n.props as unknown as {navControls?:TabViewOptions}).navControls;
    let preferred:HTMLElement|undefined;
    for(const part of snapshot.parts){
      if(part.role==='content')continue;
      if(part.role==='page'&&snapshot.slots.some(s=>s.key===part.key&&s.role==='content'))continue;
      const key=`${n.id}/nav/${part.key}`;keys.add(key);let element=this.semantics.get(key);
      const isPage=part.role==='page',currentCrumb=part.role==='breadcrumb'&&part.selected;
      if(!element){element=document.createElement(isPage||currentCrumb?'div':'button');if(element instanceof HTMLButtonElement)element.type='button';element.dataset.navigationPart=part.key;this.semantics.set(key,element);strip.append(element);
        element.addEventListener('focus',()=>{if(!controller.isDisposed)controller.driveNavigation({action:'focusPart',key:part.key});},{signal:this.abort.signal});
        element.addEventListener('click',event=>{if(event.detail===0&&!controller.isDisposed){const p=this.state.nodes.find(v=>v.id===n.id)?.navigationControl?.parts.find(v=>v.key===part.key);if(!p)return;const action=p.role==='ellipsis'?{action:'openOverflow'}:p.role==='closeTab'?{action:'close',index:p.index}:p.role==='addTab'?{action:'add'}:{action:'choose',index:p.index};controller.driveNavigation(action);}},{signal:this.abort.signal});
        if(part.role==='tab'){
          element.addEventListener('auxclick',event=>{if(event.button===1){event.preventDefault();const p=this.state.nodes.find(v=>v.id===n.id)?.navigationControl?.parts.find(v=>v.key===part.key);if(p)controller.driveNavigation({action:'close',index:p.index});}},{signal:this.abort.signal});
          element.addEventListener('dragstart',event=>{if(!(controller instanceof TabView)){event.preventDefault();return;}const p=this.state.nodes.find(v=>v.id===n.id)?.navigationControl?.parts.find(v=>v.key===part.key);if(!p)return;controller.driveNavigation({action:'dragStart',index:p.index});navigationTransfer={scene:this,source:controller,key:p.key,pool:new Map(controller.navigationEntries()),metadata:controller.metadataForKeys([p.key]),dropping:false,finishing:false};if(event.dataTransfer){event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('application/x-winui-tab',p.key);const rect=element!.getBoundingClientRect(),canvasRect=this.canvas.getBoundingClientRect(),scale=this.canvas.width/Math.max(1,canvasRect.width),image=document.createElement('canvas');image.width=Math.max(1,Math.round(rect.width*scale));image.height=Math.max(1,Math.round(rect.height*scale));image.getContext('2d')?.drawImage(this.canvas,(rect.left-canvasRect.left)*scale,(rect.top-canvasRect.top)*scale,image.width,image.height,0,0,image.width,image.height);event.dataTransfer.setDragImage(image,Math.min(rect.width/2,48),16);}},{signal:this.abort.signal});
          element.addEventListener('dragend',()=>{const transfer=navigationTransfer;if(transfer&&!transfer.dropping)this.finishNavigationTransfer(transfer,true);},{signal:this.abort.signal});
        }
      }
      element.id=`winui-nav-${this.handle}-${n.id}-${encodeURIComponent(part.key)}`;
      const r=part.rect;element.style.cssText=`position:absolute;z-index:${Math.round((n.compositionDepth??0)*1024)+(n.props.zIndex??0)};left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px;margin:0;padding:0;border:0;opacity:0;pointer-events:${isPage||currentCrumb?'none':'auto'};display:${part.visible?'block':'none'}`;
      element.setAttribute('aria-label',part.label);if(element instanceof HTMLButtonElement)element.disabled=!n.enabled||!part.enabled;
      element.tabIndex=(part.role==='addTab'||part.role==='tab'&&part.selected||part.role==='selector'&&(part.selected||snapshot.selectedIndex<0&&part.index===snapshot.parts.find(p=>p.enabled)?.index)||part.role==='pip'&&part.selected||n.kind===NodeKind.BreadcrumbBar&&!currentCrumb&&part.key===(snapshot.focusedPart??snapshot.parts[0]?.key))?0:-1;
      if(isPage){element.setAttribute('role','option');element.setAttribute('aria-selected',String(part.selected));element.setAttribute('aria-hidden',String(!part.selected));}
      if(part.role==='selector'){element.setAttribute('role','tab');element.setAttribute('aria-selected',String(part.selected));}
      if(part.role==='tab'){element.setAttribute('role','tab');element.setAttribute('aria-selected',String(part.selected));const slot=snapshot.slots.find(s=>s.key===part.key&&s.role==='content');if(slot)element.setAttribute('aria-controls',`winui-nav-slot-${this.handle}-${slot.id}`);(element as HTMLButtonElement).draggable=!!(options?.canDragTabs||(options?.canReorderTabs??true));}
      if(part.role==='pip'){element.setAttribute('aria-pressed',String(part.selected));element.setAttribute('aria-current',part.selected?'page':'false');}
      if(n.kind===NodeKind.BreadcrumbBar){if(currentCrumb)element.setAttribute('aria-current','page');else if(part.role==='breadcrumb')element.setAttribute('role','link');}
      if(part.key===snapshot.focusedPart||!preferred&&element.tabIndex===0)preferred=element;
    }
    const rootKey=String(n.id);keys.add(rootKey);this.semantics.set(rootKey,preferred??group);
    if(n.kind===NodeKind.FlipView){group.setAttribute('role','listbox');group.dataset.flipViewer='';group.style.touchAction=n.props.orientation===Orientation.Vertical?'pan-x':'pan-y';group.tabIndex=n.enabled?0:-1;this.semantics.set(rootKey,group);if(!group.dataset.flipFocus){group.dataset.flipFocus='';group.addEventListener('focus',()=>this.send({kind:'focus',id:n.id}),{signal:this.abort.signal});}}
    if(n.kind===NodeKind.TabView&&!group.dataset.tabDrop){group.dataset.tabDrop='';
      const target=controller as TabView;
      const insertion=(event:DragEvent)=>{const root=this.state.nodes.find(v=>v.id===n.id)!;const point=this.point(event);const [a,b,c,d,tx,ty]=root.world;const determinant=a*d-b*c;const x=(d*(point.x-tx)-c*(point.y-ty))/determinant;const tabs=root.navigationControl!.parts.filter(p=>p.role==='tab');for(const part of tabs)if(x<part.rect.x+part.rect.width/2.)return part.index;return target.items.length;};
      group.addEventListener('dragover',event=>{const transfer=navigationTransfer;if(!transfer||target.isDisposed)return;if(transfer.source!==target&&!transfer.scene.navigationSnapshot(transfer.source))return;if(transfer.source!==target&&!transfer.scene.navigationSettings(transfer.source)?.canDragTabs)return;if(transfer.source!==target&&!((this.state.nodes.find(v=>v.id===n.id)?.props as unknown as {navControls?:TabViewOptions})?.navControls?.allowDropTabs))return;event.preventDefault();event.stopPropagation();if(transfer.target&&transfer.target!==target&&!transfer.target.isDisposed)transfer.target.driveNavigation({action:'clearOffer'});transfer.target=target;const width=transfer.scene.navigationSnapshot(transfer.source)?.parts.find(p=>p.key===transfer.key&&p.role==='tab')?.rect.width??100;target.driveNavigation({action:'dragOver',index:insertion(event),key:transfer.key,width,external:transfer.source!==target});if(event.dataTransfer)event.dataTransfer.dropEffect='move';},{signal:this.abort.signal});
      group.addEventListener('dragleave',event=>{if(event.relatedTarget instanceof Node&&group.contains(event.relatedTarget))return;const transfer=navigationTransfer;if(transfer?.target===target){transfer.target=undefined;if(!target.isDisposed)target.driveNavigation({action:'clearOffer'});}},{signal:this.abort.signal});
      group.addEventListener('drop',event=>{const transfer=navigationTransfer;if(!transfer||transfer.target!==target)return;event.preventDefault();event.stopPropagation();transfer.dropping=true;let committed=false;try{const reply=target.driveNavigation({action:'drop',source:transfer.scene===this?identity(transfer.source):null,items:transfer.metadata,index:insertion(event)});committed=reply.committed;if(committed&&transfer.scene!==this&&!transfer.source.isDisposed)transfer.source.driveNavigation({action:'removeTransferred',keys:[transfer.key]});}finally{transfer.dropping=false;this.finishNavigationTransfer(transfer,!committed);}},{signal:this.abort.signal});
    }
  }
  private finishNavigationTransfer(transfer:NonNullable<typeof navigationTransfer>,outside:boolean){
    if(transfer.finishing)return;transfer.finishing=true;
    try{try{if(transfer.target&&transfer.target!==transfer.source&&!transfer.target.isDisposed)transfer.target.driveNavigation({action:'dragEnd'});}finally{if(!transfer.source.isDisposed)transfer.source.driveNavigation({action:'dragEnd',outside:outside&&!!transfer.scene.navigationSettings(transfer.source)?.canDragTabs});}}finally{if(navigationTransfer===transfer)navigationTransfer=undefined;}
  }
  private project() {
    if (this.state.events.some((e) => e.kind === EventKind.GotFocus))
      this.restoreKeyboardFocus = true;
    const snapshotById=new Map(this.state.nodes.map(n=>[n.id,n]));
    // Rust renders template parts. DOM is needed for public controls, content
    // hosts, accessibility and their ancestor clips, not empty template grids.
    const publicNodes=this.state.nodes.filter(n=>!n.navigationOwner||n.overlay||this.contentHosts.has(n.id)||this.editorHosts.has(n.id));
    const ids=new Set(publicNodes.map(n=>n.id));
    for(const node of publicNodes){if(node.overlay)continue;let parent=node.parent;while(parent!==null&&!ids.has(parent)){ids.add(parent);const ancestor=snapshotById.get(parent);if(!ancestor||ancestor.overlay)break;parent=ancestor.parent;}}
    const projectedNodes=this.state.nodes.filter(n=>ids.has(n.id));
    const repeaterSlots=new Map(this.state.nodes.flatMap(owner=>(owner.repeater?.realized??[]).map(slot=>[slot.id,{slot,owner}] as const)));
    const navigationSlots=new Map(this.state.nodes.flatMap(owner=>(owner.navigationControl?.slots??[]).map(slot=>[slot.id,{slot,owner}] as const)));
    for (const [id, group] of this.groups)
      if (!ids.has(id)) {
        group.remove();
        this.groups.delete(id);
        this.projectedChildren.delete(id);
      }
    const keys = new Set<string>();
    for (const n of projectedNodes) {
      let group = this.groups.get(n.id);
      if (!group) {
        group = document.createElement("div");
        group.dataset.sceneNode = String(n.id);
        this.groups.set(n.id, group);
      }
      const p = n.props,
        r = n.rect;
      const groupStyle = `position:absolute;left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${n.id===this.state.root&&this.autoHeight?(this.state.presentationHeight??r.height):r.height}px;transform:matrix(${n.localTransform.join(",")});transform-origin:0 0;border-radius:${n.kind === NodeKind.Border ? (p.cornerRadius ?? 0) : 0}px;overflow:${p.clip || (n.kind === NodeKind.Border && (p.cornerRadius ?? 0) > 0) ? "hidden" : "visible"};pointer-events:none;display:${n.visible ? "block" : "none"}`;
      if(this.groupStyles.get(group)!==groupStyle){group.style.cssText=groupStyle;this.groupStyles.set(group,groupStyle);}
      group.style.cursor = n.pointer.cursor;
      group.style.userSelect = n.pointer.textSelection;
      if(n.navigationOwner&&!n.overlay){continue;}
      if(n.table){const metadata=(p as unknown as {table?:TableViewOptions}).table;const current=n.table.currentCell;const active=current?n.table.realized.find(s=>s.role==="cell"&&s.row===current.row&&s.column===current.column):undefined;if(active)group.setAttribute("aria-activedescendant",`winui-table-cell-${this.handle}-${active.id}`);else group.removeAttribute("aria-activedescendant");group.setAttribute("aria-multiselectable",String(metadata?.selectionMode===ListViewSelectionMode.Multiple||metadata?.selectionMode===ListViewSelectionMode.Extended));group.setAttribute("aria-readonly",String(metadata?.isReadOnly??false));group.setAttribute("aria-disabled",String(!n.enabled));group.setAttribute("role","grid");group.setAttribute("aria-label",p.accessibleName??"TableView");group.setAttribute("aria-rowcount",String(n.table.filteredCount+1));group.setAttribute("aria-colcount",String(n.table.columns.length));group.tabIndex=n.enabled?0:-1;keys.add(String(n.id));this.semantics.set(String(n.id),group);if(!group.dataset.tableFocus){group.dataset.tableFocus="";group.addEventListener("focus",()=>this.send({kind:"focus",id:n.id}),{signal:this.abort.signal});}}
      const tableOwner=this.state.nodes.find(owner=>owner.table?.realized.some(s=>s.id===n.id));const tableSlot=tableOwner?.table?.realized.find(s=>s.id===n.id);if(tableSlot){group.id=`winui-table-cell-${this.handle}-${n.id}`;group.style.pointerEvents="auto";group.style.zIndex=String(p.zIndex??0);group.setAttribute("role",tableSlot.role==="rowHeader"?"rowheader":tableSlot.role==="details"?"group":"gridcell");group.setAttribute("aria-label",p.accessibleName??tableSlot.row);group.setAttribute("aria-rowindex",String((tableOwner!.table!.viewKeys.indexOf(tableSlot.row))+2));if(tableSlot.role==="cell")group.setAttribute("aria-colindex",String(tableOwner!.table!.columns.findIndex(c=>c.key===tableSlot.column)+1));else group.removeAttribute("aria-colindex");group.setAttribute("aria-selected",String(tableOwner!.table!.selectedKeys.includes(tableSlot.row)||tableOwner!.table!.selectedCells.some(c=>c.row===tableSlot.row&&c.column===tableSlot.column)));}
      if(n.repeater){group.setAttribute('role','list');group.setAttribute('aria-label',p.accessibleName??'Items');}
      const repeaterSlot=repeaterSlots.get(n.id);if(repeaterSlot){group.setAttribute('role','listitem');group.setAttribute('aria-posinset',String(repeaterSlot.slot.index+1));group.setAttribute('aria-setsize',String(repeaterSlot.owner.repeater!.totalCount));}
      if(n.refresh){group.setAttribute('role','group');group.setAttribute('aria-label',p.accessibleName??'Refresh');group.setAttribute('aria-busy',String(n.refresh.state==='Refreshing'));}
      const navigationSlot=navigationSlots.get(n.id);if(navigationSlot){const {slot,owner}=navigationSlot;group.id=`winui-nav-slot-${this.handle}-${n.id}`;if(slot.role==='content'){const selected=slot.index===owner.navigationControl!.selectedIndex;group.setAttribute('role',owner.kind===NodeKind.TabView?'tabpanel':'option');group.setAttribute('aria-hidden',String(!selected));group.inert=!selected;if(owner.kind===NodeKind.TabView)group.setAttribute('aria-labelledby',`winui-nav-${this.handle}-${owner.id}-${encodeURIComponent(slot.key)}`);}}
      if(n.kind===NodeKind.CommandBar&&n.command?.primaryClip){
        const body=n.command.body,clip=n.command.primaryClip;
        group.style.height=`${body.height}px`;
        group.style.clipPath=`inset(${clip.y}px ${Math.max(0,body.width-clip.width-clip.x)}px ${Math.max(0,body.height-clip.height-clip.y)}px ${clip.x}px)`;
      }
      if(n.overlay){group.style.opacity=String(n.overlay.opacity);group.inert=!n.overlay.isOpen;
        const owner=snapshotById.get(n.composedOwner??-1);if(owner?.kind===NodeKind.ContentDialog){group.setAttribute('role','dialog');group.setAttribute('aria-modal','true');group.setAttribute('aria-label',owner.props.title??'');}else if(owner?.kind===NodeKind.TeachingTip){group.setAttribute('role','note');group.setAttribute('aria-label',owner.props.title??'');}
        const c=n.overlay.clip;group.style.clipPath=`inset(${c.y}px ${r.width-c.x-c.width}px ${r.height-c.y-c.height}px ${c.x}px)`;
      }
      if (n.viewbox?.clip) {
        const c = n.viewbox.clip;
        group.style.clipPath = `inset(${c.y}px ${Math.max(0, r.width - c.x - c.width)}px ${Math.max(0, r.height - c.y - c.height)}px ${c.x}px)`;
      }
      if(n.kind===NodeKind.CalendarView){group.setAttribute('role','group');group.setAttribute('aria-label',p.accessibleName??'Calendar');}
      if(n.kind===NodeKind.InfoBar){
        group.setAttribute('role',p.severity===InfoBarSeverity.Error||p.severity===InfoBarSeverity.Warning?'alert':'status');
        group.setAttribute('aria-label',p.accessibleName??[p.title,p.message].filter(Boolean).join(' '));
        group.setAttribute('aria-live',p.severity===InfoBarSeverity.Error?'assertive':'polite');
      }
      if(n.kind===NodeKind.SplitButton||n.kind===NodeKind.ToggleSplitButton){
        const parts=n.compact!;
        for(const secondary of [false,true]){
          const key=`${n.id}/split-${secondary?'secondary':'primary'}`;keys.add(key);let b=this.semantics.get(key) as HTMLButtonElement|undefined;
          if(!b){b=this.button(n,key);b.addEventListener('focus',()=>this.send({kind:'focus',id:n.id}),{signal:this.abort.signal});b.addEventListener('click',e=>{if(e.detail===0)this.send({kind:'splitInvoke',id:n.id,secondary});},{signal:this.abort.signal});group.prepend(b);}
          const rect=secondary?parts.secondary:parts.primary;b.style.cssText=`position:absolute;left:${rect.x}px;top:0;width:${rect.width}px;height:${rect.height}px;opacity:0;pointer-events:auto;outline:none`;
          b.setAttribute('aria-label',secondary?`${p.accessibleName??p.text??'SplitButton'} options`:p.accessibleName??p.text??'SplitButton');b.disabled=!n.enabled;b.tabIndex=secondary?-1:n.tabStop?0:-1;
          if(secondary){const target=snapshotById.get(p.flyoutTarget??0);if(target)b.setAttribute('aria-haspopup',target.kind===NodeKind.MenuFlyout?'menu':'dialog');else b.removeAttribute('aria-haspopup');b.setAttribute('aria-expanded',String(parts.flyoutOpen));}
          else if(n.kind===NodeKind.ToggleSplitButton)b.setAttribute('aria-pressed',String(p.isChecked===true));
        }
      }else if(n.kind===NodeKind.RatingControl){
        const key=String(n.id);keys.add(key);let b=this.semantics.get(key) as HTMLButtonElement|undefined;
        if(!b){b=this.button(n,key);b.addEventListener('focus',()=>this.send({kind:'focus',id:n.id}),{signal:this.abort.signal});group.prepend(b);}
        b.setAttribute('role','slider');b.setAttribute('aria-label',p.accessibleName??'RatingControl');b.setAttribute('aria-valuemin','0');b.setAttribute('aria-valuemax',String(p.maxRating));b.setAttribute('aria-valuenow',String(Math.max(0,p.value??-1)));b.setAttribute('aria-valuetext',(p.value??-1)<0?'Not rated':`${p.value} of ${p.maxRating}`);b.setAttribute('aria-readonly',String(!!p.isReadOnly));b.disabled=!n.enabled;b.tabIndex=n.tabStop?0:-1;
      }else if (
        [
          NodeKind.NavigationViewItem, NodeKind.MenuBarItem, NodeKind.Button, NodeKind.AppBarButton,NodeKind.AppBarToggleButton,NodeKind.DropDownButton,
          NodeKind.RepeatButton,
          NodeKind.HyperlinkButton,
          NodeKind.Expander,
          NodeKind.ToggleButton,
          NodeKind.CheckBox,
          NodeKind.RadioButton,
          NodeKind.ToggleSwitch,
        ].includes(n.kind) || (n.kind===NodeKind.Grid && p.isTabStop)
      ) {
        const key = String(n.id);
        keys.add(key);
        let b = this.semantics.get(key) as HTMLButtonElement | undefined;
        if (!b) {
          b = this.button(n, key);
          b.addEventListener(
            "focus",
            () => this.send({ kind: "focus", id: n.id }),
            { signal: this.abort.signal },
          );
          b.addEventListener(
            "click",
            (e) => {
              if (e.detail === 0) this.send({ kind: "invoke", id: n.id });
            },
            { signal: this.abort.signal },
          );
          group.prepend(b);
        }
        if (
          n.kind === NodeKind.RadioButton ||
          n.kind === NodeKind.ToggleSwitch
        ) {
          b.setAttribute(
            "role",
            n.kind === NodeKind.RadioButton ? "radio" : "switch",
          );
          b.setAttribute(
            "aria-checked",
            String(
              n.kind === NodeKind.RadioButton ? p.isChecked === true : p.isOn,
            ),
          );
          b.tabIndex = n.tabStop ? 0 : -1;
        } else if (n.kind === NodeKind.CheckBox) {
          b.setAttribute("role", "checkbox");
          b.setAttribute(
            "aria-checked",
            p.isChecked === null ? "mixed" : String(p.isChecked),
          );
        } else if (n.kind === NodeKind.ToggleButton || n.kind===NodeKind.AppBarToggleButton)
          b.setAttribute(
            "aria-pressed",
            p.isChecked === null ? "mixed" : String(p.isChecked),
          );
        if(n.command&&n.kind!==NodeKind.CommandBar){const owner=this.state.nodes.find(owner=>owner.id===n.command!.owner),more=owner?.command?.moreButton===n.id;const target=(p as unknown as {flyoutTarget?:number}).flyoutTarget;if(target||more){b.setAttribute('aria-haspopup','menu');b.setAttribute('aria-expanded',String(more?owner!.props.isOpen:n.command.flyoutOpen));}else{b.removeAttribute('aria-haspopup');b.removeAttribute('aria-expanded');}}
        if(n.kind===NodeKind.Button){
          const surface=snapshotById.get(p.flyoutTarget??0);
          if(surface){b.setAttribute('aria-haspopup',surface.kind===NodeKind.MenuFlyout?'menu':'dialog');b.setAttribute('aria-expanded',String(surface.overlay?.isOpen??false));}
          else{b.removeAttribute('aria-haspopup');b.removeAttribute('aria-expanded');}
        }
        if (n.kind === NodeKind.MenuBarItem){b.setAttribute("role","menuitem");b.setAttribute("aria-haspopup","menu");b.setAttribute("aria-expanded",String((p as unknown as MenuBarItemOptions).isOpen));}
        if (n.kind === NodeKind.HyperlinkButton) b.setAttribute("role", "link");
        if (n.kind === NodeKind.Expander && n.expander) {
          const v = n.expander;
          b.setAttribute("aria-expanded", String(p.isExpanded));
          b.style.top = `${v.header.y}px`;
          b.style.height = `${v.header.height}px`;
          b.style.bottom = "auto";
          let content = this.contentGroups.get(n.id);
          if (!content) {
            content = document.createElement("div");
            this.contentGroups.set(n.id, content);
            group.append(content);
          }
          content.id = `winui-expander-${this.handle}-${n.id}`;
          b.setAttribute("aria-controls", content.id);
          content.style.cssText = `position:absolute;inset:0;pointer-events:none;transform:translateY(${v.offset}px);clip-path:inset(${v.clip.y - v.offset}px 0 ${Math.max(0, r.height - v.clip.y - v.clip.height + v.offset)}px 0)`;
        }
        b.disabled = !n.enabled;
        const pickerOwner=snapshotById.get(n.composedOwner??-1);const calendarCell=pickerOwner?.picker?.cells.find(c=>c.node===n.id);if(calendarCell)b.setAttribute('aria-pressed',String(calendarCell.selected));
        b.tabIndex = n.tabStop ? 0 : -1;
        b.textContent =
          p.accessibleName ??
          (p.text ||
            p.header ||
            (n.kind === NodeKind.ToggleSwitch
              ? p.isOn
                ? p.onContent
                : p.offContent
              : "") ||
            "");
        if (!b.textContent) {
          const header = n.kind === NodeKind.Expander ? n.children.find(id => snapshotById.get(id)?.props.isExpanderHeader) : undefined;
          b.textContent = this.contentName(header ?? n.id);
        }
        b.dataset.state = n.state;
        b.setAttribute("aria-label", b.textContent);
      } else if (
        n.kind === NodeKind.TextBox ||
        n.kind === NodeKind.RichEditBox ||
        n.kind === NodeKind.PasswordBox
      ) {
        const key = String(n.id);
        keys.add(key);
        let host = this.editorHosts.get(n.id);
        if (host && !host.matches(n)) {
          host.dispose();
          this.editorHosts.delete(n.id);
          host = undefined;
        }
        if (!host) {
          host = new EditorHost(n, group, this.abort.signal, {
            key:(node,event,up)=>{
              const owner=this.state.nodes.find(n=>n.id===node.composedOwner),kind=owner?.kind;
              const modal=this.state.nodes.some(n=>n.kind===NodeKind.ContentDialog&&n.composed?.modalActive);
              const number=kind===NodeKind.NumberBox&&['ArrowUp','ArrowDown','PageUp','PageDown','Enter','Escape'].includes(event.key);
              const choice=(kind===NodeKind.AutoSuggestBox||kind===NodeKind.ComboBox)&&(['ArrowDown','ArrowUp','Enter','Escape','F4'].includes(event.key)||(['Home','End'].includes(event.key)&&(owner?.props as ComboBoxOptions).isDropDownOpen)||(kind===NodeKind.ComboBox&&!(owner?.props as ComboBoxOptions).isEditable&&(event.key.length===1||['Home','End'].includes(event.key))));
              let tableOwner=this.state.nodes.find(n=>n.id===node.id);while(tableOwner&&tableOwner.kind!==NodeKind.TableView)tableOwner=this.state.nodes.find(n=>n.id===tableOwner!.parent);const tableKey=!!tableOwner&&['Enter','Escape','Tab'].includes(event.key);
              const handled=tableKey||number||choice||modal&&(['Tab','Escape'].includes(event.key)||event.key==='Enter'&&!node.props.acceptsReturn);
              if(handled){this.send({kind:'modifiers',ctrl:event.ctrlKey||event.metaKey,shift:event.shiftKey});this.send(up?{kind:'keyUp',key:event.key}:{kind:'keyDown',key:event.altKey&&['ArrowDown','ArrowUp'].includes(event.key)?`Alt+${event.key}`:event.key,repeat:event.repeat});}
              return handled;
            },
            pointer:node=>{if(node.composedKind===NodeKind.ComboBox&&node.props.isReadOnly)this.send({kind:'composed',id:node.composedOwner,action:'toggle'});},
            richClipboard:node=>{
              const {document,text}=JSON.parse(this.raw.scene_rich_edit_selection(this.handle,node.id)) as {document:RichEditDocument;text:string};
              let rtf:string|undefined;try{rtf=this.raw.scene_rich_edit_export(this.handle,node.id,false,true);}catch{/* The SDK document MIME preserves MathML outside OfficeMath RTF's subset. */}
              return {document,rtf,text};
            },
            send: (input) => this.send(input),
            flush: () => this.draw(),
            point: (node, event) => {
              const point = this.point(event);
              const [a, b, c, d, e, f] = node.world,
                det = a * d - b * c;
              return {
                x: (d * (point.x - e) - c * (point.y - f)) / det,
                y: (-b * (point.x - e) + a * (point.y - f)) / det,
              };
            },
          });
          this.editorHosts.set(n.id, host);
          this.semantics.set(key, host.input);
        }
        host.update(n);
        const owner=snapshotById.get(n.composedOwner??-1);
        if(owner?.kind===NodeKind.NumberBox){host.input.setAttribute('role','spinbutton');const value=owner.composed?.value;if(value!==null&&value!==undefined)host.input.setAttribute('aria-valuenow',String(value));else host.input.removeAttribute('aria-valuenow');host.input.setAttribute('aria-valuemin',String(owner.props.minimum));host.input.setAttribute('aria-valuemax',String(owner.props.maximum));}
        else if(owner?.kind===NodeKind.ComboBox||owner?.kind===NodeKind.AutoSuggestBox){host.input.setAttribute('role','combobox');host.input.setAttribute('aria-autocomplete',owner.kind===NodeKind.AutoSuggestBox?'list':'none');host.input.setAttribute('aria-expanded',String(snapshotById.get(owner.composed?.parts.Popup??-1)?.overlay?.isOpen??false));host.input.setAttribute('aria-controls',`winui-options-${this.handle}-${owner.id}`);}

      } else if (n.kind === NodeKind.Viewbox && n.viewbox) {
        let content = this.contentGroups.get(n.id);
        if (!content) {
          content = document.createElement("div");
          content.dataset.viewboxContent = String(n.id);
          this.contentGroups.set(n.id, content);
          group.append(content);
        }
        const v = n.viewbox;
        content.style.cssText = `position:absolute;left:0;top:0;width:${v.contentSize[0]}px;height:${v.contentSize[1]}px;transform:scale(${v.scale[0]},${v.scale[1]});transform-origin:0 0;pointer-events:none`;
      } else if (n.kind === NodeKind.InfoBadge) {
        const key = String(n.id);
        keys.add(key);
        let badge = this.semantics.get(key);
        if (!badge) {
          badge = document.createElement("span");
          badge.style.cssText =
            "position:absolute;inset:0;opacity:0;pointer-events:none";
          this.semantics.set(key, badge);
          group.append(badge);
        }
        badge.textContent =
          p.accessibleName ??
          ((p.value ?? -1) >= 0 ? String(p.value) : "Notification");
        badge.setAttribute("role", "img");
        badge.setAttribute("aria-label", badge.textContent);
      } else if (
        n.kind === NodeKind.ProgressBar ||
        n.kind === NodeKind.ProgressRing
      ) {
        const key = String(n.id);
        keys.add(key);
        let element = this.semantics.get(key);
        if (!element) {
          element = document.createElement("div");
          this.semantics.set(key, element);
        }
        element.style.cssText = "position:absolute;inset:0;pointer-events:none";
        element.setAttribute("role", "progressbar");
        element.setAttribute("aria-label", p.accessibleName ?? n.kind);
        element.setAttribute("aria-valuemin", String(p.minimum ?? 0));
        element.setAttribute("aria-valuemax", String(p.maximum ?? 100));
        if (p.isIndeterminate) {
          element.removeAttribute("aria-valuenow");
          element.setAttribute("aria-busy", "true");
        } else {
          element.setAttribute("aria-valuenow", String(p.value ?? 0));
          element.removeAttribute("aria-busy");
        }
        element.setAttribute("aria-disabled", String(!n.enabled));
        element.setAttribute(
          "aria-hidden",
          String(n.kind === NodeKind.ProgressRing && !p.isActive),
        );
        group.append(element);
      } else if(n.kind===NodeKind.PagerControl){group.setAttribute('role','navigation');group.setAttribute('aria-label',p.accessibleName??'Page selector');
      } else if([NodeKind.RichTextBlock,NodeKind.RichTextBlockOverflow].includes(n.kind)&&n.reading){
        keys.add(String(n.id));this.semantics.set(String(n.id),group);
        group.style.pointerEvents='auto';group.setAttribute('role','document');group.tabIndex=(p.reading?.isTextSelectionEnabled??true)?0:-1;if(!group.dataset.richFocus){group.dataset.richFocus='';group.addEventListener('focus',()=>this.send({kind:'focus',id:n.id}),{signal:this.abort.signal});}
        const key='rich:'+n.id;keys.add(key);let text=this.semantics.get(key);
        if(!text){text=document.createElement('span');this.semantics.set(key,text);group.append(text);}text.style.cssText='position:absolute;inset:0;opacity:0;pointer-events:none';text.textContent=n.reading.text||p.text||'';
        const links=n.reading.links??[];const seen=new Set<string>();
        for(let i=0;i<links.length;i++){
          const link=links[i];if(seen.has(link.link))continue;seen.add(link.link);const key=`rich:${n.id}:link:${link.link}`;keys.add(key);let element=this.semantics.get(key)as HTMLButtonElement|undefined;
          if(!element){element=document.createElement('button');element.setAttribute('role','link');this.semantics.set(key,element);group.append(element);element.addEventListener('click',e=>{if(e.detail===0)this.send({kind:'reading',id:n.id,action:'link',index:Number(element!.dataset.linkIndex)});},{signal:this.abort.signal});element.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();if(!e.repeat)this.send({kind:'reading',id:n.id,action:'link',index:Number(element!.dataset.linkIndex)});}},{signal:this.abort.signal});}
          element.dataset.linkIndex=String(i);element.textContent=links.filter(l=>l.link===link.link).map(l=>l.text).join('');element.disabled=!n.enabled;element.style.cssText=`position:absolute;left:${link.rect.x}px;top:${link.rect.y}px;width:${link.rect.width}px;height:${link.rect.height}px;opacity:0;pointer-events:none`;
        }
      } else if(n.kind===NodeKind.AnnotatedScrollBar){
        const key='annotation:'+n.id;keys.add(key);let element=this.semantics.get(key);
        if(!element){element=document.createElement('div');this.semantics.set(key,element);group.append(element);}element.style.cssText='position:absolute;inset:0;pointer-events:none';element.setAttribute('role','scrollbar');element.setAttribute('aria-orientation','vertical');element.setAttribute('aria-label',p.accessibleName??'Annotated scroll');const reading=p.reading as Record<string,number>|undefined;element.setAttribute('aria-valuemin',String(reading?.minimum??0));element.setAttribute('aria-valuemax',String(reading?.maximum??0));element.setAttribute('aria-valuenow',String(reading?.value??0));
      } else if(n.kind===NodeKind.AppBarSeparator){group.setAttribute('role','separator');group.setAttribute('aria-orientation',n.command?.inOverflow?'horizontal':'vertical');
      } else if(n.kind===NodeKind.MenuBar){group.setAttribute("role","menubar");group.setAttribute("aria-label",p.accessibleName??"MenuBar");
      } else if(n.kind===NodeKind.CommandBar){group.setAttribute('role','toolbar');group.setAttribute('aria-label',p.accessibleName??'CommandBar');
      } else if (navigationControlKind(n.kind)&&n.kind!==NodeKind.TreeView&&n.navigationControl) {
        this.projectNavigationControl(n,group,keys);
      } else if (([NodeKind.ScrollViewer,NodeKind.ScrollView,NodeKind.ScrollContentPresenter].includes(n.kind) || collectionKind(n.kind)||n.kind===NodeKind.TreeView) && n.scroll) {
        const key = String(n.id);
        keys.add(key);
        group.dataset.scrollViewer = key;
        if (n.scroll.hosted) group.dataset.hostedScroll = "";
        else delete group.dataset.hostedScroll;
        group.style.pointerEvents = n.scroll.hosted ? "none" : "auto";
        group.style.touchAction = n.scroll.hosted ? "auto" : "none";
        group.setAttribute("role", n.kind===NodeKind.TreeView?"tree":collectionKind(n.kind)?"listbox":"region");
        if(n.composedOwner)group.id=`winui-options-${this.handle}-${n.composedOwner}`;
        group.setAttribute("aria-label", p.accessibleName ?? (collectionKind(n.kind)||n.kind===NodeKind.TreeView?n.kind:"ScrollViewer"));
        if(n.collection)this.attachCollectionDrop(group,n.id);
        if(n.collection){const mode=p.selectionMode;group.setAttribute('aria-multiselectable',String(mode===ListViewSelectionMode.Multiple||mode===ListViewSelectionMode.Extended));const active=n.collection.realized.find(i=>i.key===n.collection!.focusedKey);if(active)group.setAttribute('aria-activedescendant',`winui-option-${this.handle}-${active.id}`);else group.removeAttribute('aria-activedescendant');}
        group.tabIndex = n.tabStop ? 0 : -1;
        if (!this.contentGroups.has(n.id)) {
          const content = document.createElement("div");
          content.dataset.scrollContent = key;
          content.id = `winui-scroll-${this.handle}-${n.id}`;
          this.contentGroups.set(n.id, content);
          group.prepend(content);
          group.addEventListener(
            "focus",
            () => this.send({ kind: "focus", id: n.id }),
            { signal: this.abort.signal },
          );
        }
        const content = this.contentGroups.get(n.id)!;
        const view = n.scroll;
        if (view.hosted)
          group.style.clipPath = `path("${view.visibleRegions.map((r) => `M${r.x} ${r.y}h${r.width}v${r.height}h${-r.width}Z`).join(" ")}")`;

        content.style.cssText = `position:absolute;inset:0;transform-origin:0 0;transform:matrix(${view.zoomFactor},0,0,${view.zoomFactor},${-view.horizontalOffset},${-view.verticalOffset});pointer-events:none`;
        group.scrollLeft = 0;
        group.scrollTop = 0;
        this.semantics.set(key, group);
        for (const vertical of [false, true]) {
          const axis = vertical ? "vertical" : "horizontal";
          let bar = group.querySelector<HTMLElement>(
            `:scope > [data-scroll-axis="${axis}"]`,
          );
          if (!bar) {
            bar = document.createElement("div");
            bar.dataset.scrollAxis = axis;
            bar.setAttribute("role", "scrollbar");
            bar.setAttribute("aria-orientation", axis);
            bar.setAttribute(
              "aria-controls",
              this.scrollHostTargets.get(n.id) ?? content.id,
            );
            bar.setAttribute("aria-label", `${axis} scroll`);
            bar.tabIndex = -1;
            group.append(bar);
            bar.addEventListener(
              "focus",
              () => this.send({ kind: "focus", id: n.id }),
              { signal: this.abort.signal },
            );
          }
          const thumb = vertical ? view.verticalThumb : view.horizontalThumb;
          bar.style.cssText = `position:absolute;${vertical ? "right:1px;top:1px;width:12px;height:calc(100% - 2px)" : "left:1px;bottom:1px;height:12px;width:calc(100% - 2px)"};pointer-events:${view.hosted ? "auto" : "none"};touch-action:none;display:${thumb ? "block" : "none"}`;
          bar.tabIndex = view.hosted ? 0 : -1;
          bar.setAttribute(
            "aria-controls",
            this.scrollHostTargets.get(n.id) ?? content.id,
          );
          bar.setAttribute("aria-valuemin", "0");
          bar.setAttribute(
            "aria-valuemax",
            String(vertical ? view.scrollableHeight : view.scrollableWidth),
          );
          bar.setAttribute(
            "aria-valuenow",
            String(vertical ? view.verticalOffset : view.horizontalOffset),
          );
          bar.setAttribute("aria-disabled", String(!n.enabled));
        }
       } else if(n.kind===NodeKind.CollectionHeader){group.setAttribute('role','heading');group.setAttribute('aria-level','2');group.setAttribute('aria-label',p.accessibleName??p.text??'');
      } else if(n.kind===NodeKind.CollectionItem){
        const owner=snapshotById.get(p.collectionOwner!);const item=owner?.collection?.realized.find(i=>i.id===n.id);group.id=`winui-option-${this.handle}-${n.id}`;group.setAttribute('role','option');group.setAttribute('aria-label',p.accessibleName??p.text??'');group.setAttribute('aria-selected',String(item?.selected??false));group.setAttribute('aria-disabled',String(!n.enabled));group.setAttribute('aria-posinset',String((p.collectionIndex??0)+1));group.setAttribute('aria-setsize',String(owner?.collection?.totalCount??0));group.style.pointerEvents='auto';
        this.attachCollectionDrag(group,n.id,p.collectionOwner!,snapshotById.get(p.collectionOwner!)?.props);
        if(owner?.kind===NodeKind.TreeView){const row=owner.navigationControl?.treeRows.find(r=>r.key===p.collectionKey);group.setAttribute('role','treeitem');if(row){group.setAttribute('aria-level',String(row.depth+1));group.setAttribute('aria-posinset',String(row.positionInSet));group.setAttribute('aria-setsize',String(row.setSize));if(row.hasChildren)group.setAttribute('aria-expanded',String(row.expanded));else group.removeAttribute('aria-expanded');if(p.selectionMode===ListViewSelectionMode.Multiple||owner.props.selectionMode===ListViewSelectionMode.Multiple)group.setAttribute('aria-checked',row.partial?'mixed':String(row.selected));else group.removeAttribute('aria-checked');}if(!group.dataset.treeExpansion){group.dataset.treeExpansion='';group.addEventListener('dblclick',()=>{const root=this.nodes.get(p.collectionOwner!);const row=this.state.nodes.find(n=>n.id===p.collectionOwner)?.navigationControl?.treeRows.find(r=>r.key===p.collectionKey);if(root instanceof TreeView&&row?.hasChildren)root.driveNavigation({action:'expand',key:row.key,expanded:!row.expanded});},{signal:this.abort.signal});}}
        if(!group.dataset.collectionOption){group.dataset.collectionOption='';group.addEventListener('click',e=>{const current=this.state.nodes.find(node=>node.id===n.id);if(e.detail===0&&current)this.send({kind:'collectionInvoke',id:current.props.collectionOwner,index:current.props.collectionIndex,ctrl:e.ctrlKey,shift:e.shiftKey});},{signal:this.abort.signal});}
      } else if (n.kind === NodeKind.RadioButtons) {
        group.setAttribute("role", "radiogroup");
        group.setAttribute("aria-label", p.accessibleName ?? p.header ?? "");
        group.setAttribute("aria-disabled", String(!n.enabled));
      } else if(n.kind===NodeKind.PersonPicture){
        group.setAttribute('role','img');group.setAttribute('aria-label',p.accessibleName??[p.isGroup?'Group':p.displayName||p.initials||'Person',p.badgeText||((p.badgeNumber??0)>0?`${p.badgeNumber} items`:p.badgeGlyph||p.badgeImageSource?'icon':'')].filter(Boolean).join(', '));
      } else if (n.kind === NodeKind.TextBlock) {
        const key = String(n.id);
        keys.add(key);
        let text = this.semantics.get(key);
        if (!text) {
          text = document.createElement("span");
          text.style.cssText =
            "opacity:0;position:absolute;inset:0;pointer-events:none";
          this.semantics.set(key, text);
          group.prepend(text);
        }
        // Scrolling changes the parent transform, not this accessible label.
        // Replacing its text node every frame creates needless DOM/observer work.
        const label = p.text ?? "";
        if (text.textContent !== label) text.textContent = label;
      } else if (([NodeKind.Image, NodeKind.Rectangle, NodeKind.Line, NodeKind.Path, NodeKind.Polygon, NodeKind.Polyline, NodeKind.AnimatedIcon, NodeKind.IconSourceElement, NodeKind.FontIcon, NodeKind.SymbolIcon, NodeKind.PathIcon, NodeKind.BitmapIcon, NodeKind.ImageIcon] as NodeKind[]).includes(n.kind)) {
        const key = String(n.id);
        keys.add(key);
        let image = this.semantics.get(key);
        if (!image) {
          image = document.createElement("span");
          image.style.cssText =
            "position:absolute;inset:0;opacity:0;pointer-events:none";
          this.semantics.set(key, image);
          group.prepend(image);
        }
        image.setAttribute("role", p.accessibleName ? "img" : "presentation");
        if (p.accessibleName)
          image.setAttribute("aria-label", p.accessibleName);
        else image.removeAttribute("aria-label");
      } else if (n.kind===NodeKind.Slider || n.kind===NodeKind.ScrollBar || n.kind===NodeKind.Thumb || n.kind===NodeKind.MenuFlyout) {
        const key=String(n.id);keys.add(key);
        let element=this.semantics.get(key);
        if(!element) {
          element=document.createElement('div');element.style.cssText='position:absolute;inset:0;pointer-events:auto;outline:none;color:transparent;background:transparent;';
          element.dataset.controlId=String(n.id);this.semantics.set(key,element);group.prepend(element);
          element.addEventListener('focus',()=>this.send({kind:'focus',id:n.id}),{signal:this.abort.signal});
        }
        element.tabIndex=n.enabled&&n.tabStop?0:-1;element.setAttribute('aria-disabled',String(!n.enabled));
        element.setAttribute('aria-label',p.accessibleName||p.header||(n.kind===NodeKind.Slider?'Slider':n.kind===NodeKind.ScrollBar?'ScrollBar':n.kind===NodeKind.Thumb?'Thumb':'Menu'));
        if(n.kind===NodeKind.Slider||n.kind===NodeKind.ScrollBar) {
          element.style.touchAction='none';element.setAttribute('role',n.kind===NodeKind.ScrollBar?'scrollbar':'slider');element.setAttribute('aria-valuemin',String(p.minimum));element.setAttribute('aria-valuemax',String(p.maximum));element.setAttribute('aria-valuenow',String(p.value));
          element.setAttribute('aria-orientation',(p.orientation??Orientation.Horizontal).toLowerCase());
        } else if(n.kind===NodeKind.Thumb){element.setAttribute('role','group');element.setAttribute('aria-roledescription','drag handle');element.style.touchAction='none';
        } else {
          element.setAttribute('role','menu');element.replaceChildren();
          for(const [i,item] of (p.menuItems??[]).entries()) {
            const row=document.createElement('div');row.id=`winui-menu-${this.handle}-${n.id}-${i}`;row.textContent=item.text??'';
            if(item.kind!==MenuEntryKind.Separator)row.setAttribute('aria-label',('accessibleName' in item&&item.accessibleName as string)||item.text||'');
            row.setAttribute('role',item.kind===MenuEntryKind.Separator?'separator':item.kind===MenuEntryKind.Toggle?'menuitemcheckbox':item.kind===MenuEntryKind.Radio?'menuitemradio':'menuitem');
            if(item.kind===MenuEntryKind.Submenu)row.setAttribute("aria-haspopup","menu");if(item.kind===MenuEntryKind.Toggle||item.kind===MenuEntryKind.Radio)row.setAttribute('aria-checked',String(item.checked??false));row.setAttribute('aria-disabled',String(item.enabled===false));
            const r=n.overlay?.rows[i];if(r)row.style.cssText=`position:absolute;left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px;opacity:0;`;
            element.append(row);
          }
          if(n.overlay?.selectedIndex!=null)element.setAttribute('aria-activedescendant',`winui-menu-${this.handle}-${n.id}-${n.overlay.selectedIndex}`);else element.removeAttribute('aria-activedescendant');
        }
      } else if(n.kind===NodeKind.ToolTip) {
        const key=String(n.id);keys.add(key);let element=this.semantics.get(key);
        if(!element) {element=document.createElement('div');element.style.cssText='position:absolute;inset:0;opacity:0;pointer-events:none;';element.id=`winui-tip-${this.handle}-${n.id}`;element.setAttribute('role','tooltip');this.semantics.set(key,element);group.prepend(element);}
        element.textContent=p.text??this.contentName(n.id);
      } else if (n.kind === NodeKind.NavigationView && n.navigation) {
        projectNavigationScrollbars(group,n.navigation.scrollbars??[],n.navigation.scrollViewports??[],(content,key)=>this.send({kind:'navigation',id:n.id,input:{kind:'scrollKey',content,key}}),this.abort.signal);
        for (const part of n.navigation.parts) {
          if (part.kind !== "Item" || part.id.startsWith("$expand:")) continue;
          const key = `${n.id}/${part.id}`;
          keys.add(key);
          let b = this.semantics.get(key) as HTMLButtonElement | undefined;
          if (!b) {
            b = this.button(n, key);
            b.dataset.itemId = part.id;
            b.dataset.navigationTouch='';b.style.touchAction='none';b.style.zIndex='1';
            b.addEventListener(
              "focus",
              () => {
                this.send({ kind: "focus", id: n.id });
                this.send({
                  kind: "navigation",
                  id: n.id,
                  input: { kind: "focus", id: part.id },
                });
              },
              { signal: this.abort.signal },
            );
            b.addEventListener(
              "click",
              (e) => {
                if (e.detail === 0)
                  this.send({
                    kind: "navigation",
                    id: n.id,
                    input: { kind: "invoke", id: part.id },
                  });
              },
              { signal: this.abort.signal },
            );
            // Rust orders the dismiss surface before its popup items. Keep
            // that order so the transparent dismiss button stays underneath.
            group.append(b);
          }
          b.textContent = part.text;
          b.disabled = !n.enabled || !part.enabled;
          if (part.selected) b.setAttribute("aria-current", "page");
          else b.removeAttribute("aria-current");
          if (part.expanded !== null)
            b.setAttribute("aria-expanded", String(part.expanded));
          else b.removeAttribute("aria-expanded");
          const r = part.rect,
            c = part.clip;
          const clipPath = c
            ? `inset(${Math.max(0, c.y - r.y)}px ${Math.max(0, r.x + r.width - c.x - c.width)}px ${Math.max(0, r.y + r.height - c.y - c.height)}px ${Math.max(0, c.x - r.x)}px)`
            : "none";
          const style=`${r.x},${r.y},${r.width},${r.height},${clipPath}`;
          if(this.navigationPartStyles.get(b)!==style){Object.assign(b.style,{left:`${r.x}px`,top:`${r.y}px`,width:`${r.width}px`,height:`${r.height}px`,clipPath});this.navigationPartStyles.set(b,style);}
        }
      }
    }
    const root = this.groups.get(this.state.root)!;
    if (root.parentNode !== this.projection) this.projection.append(root);
    for (const n of projectedNodes) {
      const children=n.children.filter(child=>ids.has(child)&&!snapshotById.get(child)?.overlay);
      if(!children.length){this.projectedChildren.delete(n.id);continue;}
      const group = this.groups.get(n.id)!;
      const content = this.contentGroups.get(n.id) ?? group;
      const previous=this.projectedChildren.get(n.id);
      if(n.kind!==NodeKind.Expander&&previous?.content===content&&previous.children.length===children.length&&previous.children.every((id,i)=>id===children[i]))continue;
      this.projectedChildren.set(n.id,{content,children});
      let cursor = content.querySelector(":scope > [data-scene-node]");
      for (const child of children) {
        const target = this.groups.get(child);
        if (!target) continue;
        if (n.kind === NodeKind.Expander && snapshotById.get(child)?.props.isExpanderHeader) {
          if (target.parentNode !== group) group.append(target);
          continue;
        }
        target.inert=n.kind===NodeKind.ToolTip;
        if (target === cursor) {
          cursor = cursor.nextElementSibling;
        } else {
          content.insertBefore(target, cursor);
        }
      }
    }
    root.inert=this.state.nodes.some(n=>n.kind===NodeKind.ContentDialog&&n.composed?.modalActive);
    let floatingCursor=this.floatingCanvas.nextElementSibling;
    for(const n of this.state.nodes.filter(n=>n.overlay).sort((a,b)=>a.overlay!.order-b.overlay!.order)) {
      const target=this.groups.get(n.id)!;
      if(target===floatingCursor)floatingCursor=floatingCursor.nextElementSibling;
      else this.floating.insertBefore(target,floatingCursor);
    }
    for (const [id, host] of this.editorHosts)
      if (!ids.has(id)) {
        host.dispose();
        this.editorHosts.delete(id);
      }
    for (const [id, host] of this.contentHosts) {
      const group=this.groups.get(id);
      if (!ids.has(id) || !group) {host.observer.disconnect();host.element.remove();this.contentHosts.delete(id);continue;}
      if(host.element.parentElement!==group)group.append(host.element);
      group.style.pointerEvents='auto';
      host.measure();
    }
    for (const id of this.contentGroups.keys())
      if (!ids.has(id)) {
        this.contentGroups.delete(id);
        this.scrollHostTargets.delete(id);
      }
    for (const [key, element] of this.semantics)
      if (!keys.has(key)) {
        element.remove();
        this.semantics.delete(key);
      } else if (!element.hasAttribute('data-scene-node') && !element.classList.contains('winui-editor')) {
        // Native button/select rules must inherit the owning Rust control's
        // presentation, including headers, template labels and floating parts.
        element.style.cursor = 'inherit';
        element.style.userSelect = 'inherit';
      }
    const descriptionsByTarget=new Map<number,string[]>();
    for(const tip of this.state.nodes)if(tip.kind===NodeKind.ToolTip&&tip.visible&&tip.props.placementTarget!=null) {
      const list=descriptionsByTarget.get(tip.props.placementTarget)??[];list.push(`winui-tip-${this.handle}-${tip.id}`);descriptionsByTarget.set(tip.props.placementTarget,list);
    }
    for(const n of this.state.nodes) {
      const target=this.semantics.get(String(n.id));if(!target)continue;
      const descriptions=descriptionsByTarget.get(n.id)??[];
      if(descriptions.length)target.setAttribute('aria-describedby',descriptions.join(' '));else target.removeAttribute('aria-describedby');
    }
    if (this.pendingFocus !== null) {
      const target = this.semantics.get(String(this.pendingFocus));
      if (target) {
        this.pendingFocus = null;
        target.focus({ preventScroll: true });
      }
    }
    if (this.restoreKeyboardFocus) {
      this.restoreKeyboardFocus = false;
      const node = this.state.nodes.find((n) => n.id === this.state.focused);
      if (node?.navigation?.focusedId)
        this.semantics
          .get(`${node.id}/${node.navigation.focusedId}`)
          ?.focus({ preventScroll: true });
      else if (
        node &&
        !(
          node.scroll?.hosted &&
          this.groups.get(node.id)?.contains(document.activeElement)
        )
      )
        this.semantics.get(String(node.id))?.focus({ preventScroll: true });
    }
  }
  private button(n: NodeSnapshot, key: string) {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.controlId = String(n.id);
    b.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;opacity:0;margin:0;padding:0;border:0;pointer-events:auto;cursor:default;";
    this.semantics.set(key, b);
    return b;
  }
  private contentName(id: number): string {
    const n = this.state.nodes.find((n) => n.id === id)!;
    return n.children
      .map((id) => {
        const c = this.state.nodes.find((n) => n.id === id)!;
        return (
          c.props.accessibleName ?? (c.props.text || this.contentName(c.id))
        );
      })
      .join(" ");
  }
  private loadImage(source: string) {
    if (this.pendingImages.has(source)) return;
    const image = new Image();
    image.crossOrigin = "anonymous";
    this.pendingImages.set(source, image);
    image.src = source;
    void image
      .decode()
      .then(() => {
        if (!this.disposed && this.pendingImages.get(source) === image) {
          this.raw.scene_image(this.handle, source, image);
          this.schedule();
        }
      })
      .catch((error) => {
        if (!this.disposed && this.pendingImages.get(source) === image)
          reportError(
            new Error(`Cannot decode image ${source}`, { cause: error }),
          );
      });
  }
  private dispatch(
    events: {
      target: number;
      kind: EventKind;
      itemId?: string;
      /** Value captured when a checked-state notification was raised. */ isChecked?:
        boolean | null;
      collection?:CollectionEventData;
      payload?:Partial<ComposedEvent>;
      requestId?: number;
      closeReason?:InfoBarCloseReason;
      value?: number;
      text?: string;
      selectionStart?: number;
      selectionLength?: number;
      view?: ScrollSnapshot;
      isOn?: boolean;
      isExpanded?: boolean;
      selectedIndex?: number;
      selectedKeys?:string[];
    }[],
  ) {
    this.dispatching = true;
    const sourcePools=new Map<number,Map<string,CollectionItem>>();
    for(const e of events){const data=e.collection;if(!data||data.source===null)continue;const source=this.collectionController(this.nodes.get(data.source));if(!source)continue;let pool=sourcePools.get(data.source);if(!pool){pool=new Map();sourcePools.set(data.source,pool);}for(const key of data.keys){const item=source.itemForKey(key);if(item!==undefined)pool.set(key,item);}}
    try {
      for (const raw of events) {
        if (this.disposed) break;
        const node = this.nodes.get(raw.target);
        if (!node || node.isDisposed) {
          // Rust-created menu presenters have no public controller/listeners.
          // Complete their default close negotiation through the same Rust protocol.
          if(!node&&raw.kind===EventKind.Closing&&raw.requestId!==undefined&&this.state.nodes.some(n=>n.id===raw.target&&n.kind===NodeKind.MenuFlyout))this.send({kind:'resolveOverlay',id:raw.target,request:raw.requestId,cancel:false});
          if(!node&&raw.kind===EventKind.Closing&&raw.requestId!==undefined&&this.state.nodes.some(n=>n.id===raw.target&&n.kind===NodeKind.ComboBox))this.send({kind:'composed',id:raw.target,action:'resolve',request:raw.requestId,cancel:false});
          continue;
        }
        const event: SceneEvent = {
          kind: raw.kind,
          closeReason:raw.closeReason,
          target: node,
          itemId: raw.itemId,
          isChecked: raw.isChecked,
          isOn: raw.isOn,
          selectedIndex: raw.selectedIndex,
          isExpanded: raw.isExpanded,
          value: raw.value,
          text: raw.text,
          selectionStart: raw.selectionStart,
          selectionLength: raw.selectionLength,
          view: raw.view,
          collection:raw.collection,
          acceptedOperation:raw.collection?.operation,
          ...raw.payload,
          cancel: false,
        };
        const collection=this.collectionController(node);if(raw.selectedKeys&&collection)collection.setClientSelection(raw.selectedKeys);
        if(node instanceof NavigationControl&&event.navigation){if(raw.kind===EventKind.ItemsChanged)node.applyNavigationItems(event.navigation,navigationTransfer?.pool??new Map());node.navigationEvent(event);}
        let deferrals=1,complete:()=>void=()=>{};
        const composedRequest=(node.kind===NodeKind.ContentDialog||node.kind===NodeKind.TeachingTip||node.kind===NodeKind.ComboBox)&&raw.requestId!==undefined;
        if(composedRequest){
          complete=()=>{if(--deferrals===0&&!this.disposed&&!node.isDisposed)this.send({kind:'composed',id:raw.target,action:'resolve',request:raw.requestId,cancel:event.cancel||(event as ComposedEvent).handled===true});};
          (event as ComposedEvent).getDeferral=()=>{deferrals++;let done=false;return{complete:()=>{if(!done){done=true;complete();}}};};
        }
        const pool=new Map<string,CollectionItem>(collectionCompletionPool??collectionTransfer?.pool);const sourcePool=raw.collection?.source!==null?sourcePools.get(raw.collection?.source??-1):undefined;if(sourcePool)for(const[key,item]of sourcePool)pool.set(key,item);
        if(raw.kind===EventKind.ItemsChanged&&node instanceof CollectionView&&raw.collection)node.applyRustItems(pool);
        if(raw.collection)Object.assign(event,{items:raw.collection.keys.flatMap(key=>{const item=pool.get(key);return item===undefined?[]:[item];}),insertIndex:raw.collection.index});
        if(node instanceof AutoSuggestBox||node instanceof ComboBox){const e=event as ComposedEvent;if(e.selectedIndex!==undefined&&e.selectedIndex>=0)e.selectedItem=node.items[e.selectedIndex];if(e.chosenSuggestion!==undefined){const index=normalizeCollection(node.items).findIndex(i=>i.id===e.chosenSuggestion);e.chosenItem=index>=0?node.items[index]:null;}}
        const refreshRequest=raw.kind===EventKind.RefreshRequested&&raw.requestId!==undefined;
        if(refreshRequest){complete=()=>{if(--deferrals===0&&!this.disposed&&!node.isDisposed)this.send({kind:'refresh',id:raw.target,action:'complete',request:raw.requestId});};(event as RefreshRequestedEvent).getDeferral=()=>{deferrals++;let done=false;return{complete:()=>{if(!done){done=true;complete();}}};};}
        if(node instanceof TableView)node.enrichEvent(event);
        node.dispatch(event);
        if(node instanceof TableView&&event.kind===EventKind.Click&&event.table?.uri&&!event.cancel)window.open(event.table.uri,"_blank","noopener,noreferrer");
        if(!this.disposed&&!node.isDisposed&&node instanceof TableView&&raw.requestId!==undefined)this.jobs.push(()=>{if(!this.disposed&&!node.isDisposed)this.send({kind:"table",id:raw.target,action:"resolve",request:raw.requestId,cancel:event.cancel,data:event.table??{}});});
        if(!this.disposed&&!node.isDisposed&&raw.kind===EventKind.DetailLabelRequested&&raw.requestId!==undefined)this.send({kind:'readingDetail',id:raw.target,request:raw.requestId,content:(event as DetailLabelRequestedEvent).content??(event as DetailLabelRequestedEvent).label??''});
        if(!this.disposed&&!event.cancel&&raw.kind===EventKind.CopyRequested&&raw.text!==undefined)void navigator.clipboard.writeText(raw.text).catch(error=>reportError(error));
        if(!this.disposed&&!node.isDisposed&&!event.cancel&&node instanceof TableView&&raw.kind===EventKind.PasteFromClipboard&&event.table?.readClipboard)void node.paste().catch(error=>reportError(error));
        if(!this.disposed&&!node.isDisposed&&raw.kind===EventKind.FrameNavigating&&raw.requestId!==undefined)this.send({kind:'contentHost',id:raw.target,action:'resolve',request:raw.requestId,cancel:event.cancel});
        if(!this.disposed&&!node.isDisposed&&raw.kind===EventKind.Scrolling&&raw.requestId!==undefined)this.send({kind:'reading',id:raw.target,action:'resolveScroll',request:raw.requestId,cancel:event.cancel});
        if(!this.disposed&&!node.isDisposed&&event.kind===EventKind.CanExecuteRequested&&raw.requestId!==undefined&&(node.kind===NodeKind.UICommand||node.kind===NodeKind.StandardCommand))this.send({kind:"viewControl",id:raw.target,action:"resolveExecute",request:raw.requestId,cancel:event.cancel||(event as UICommandEvent).canExecute===false});
        if(raw.collection&&raw.requestId!==undefined&&[EventKind.DragItemsStarting,EventKind.DragOver,EventKind.Drop].includes(raw.kind)){
          this.send({kind:'collectionDragResolve',id:raw.target,request:raw.requestId,cancel:event.cancel,operation:event.acceptedOperation??raw.collection.operation});
        }
        if(composedRequest||refreshRequest)complete();
        if(event.kind===EventKind.ItemClick&&raw.requestId!==undefined)this.jobs.push(()=>{if(!this.disposed&&!node.isDisposed)this.send({kind:'collectionCommit',id:raw.target,request:raw.requestId});});
        if(!this.disposed&&!node.isDisposed&&event.kind===EventKind.Closing&&raw.requestId!==undefined&&!composedRequest)
          this.send({kind:'resolveOverlay',id:raw.target,request:raw.requestId,cancel:event.cancel});
        if (
          raw.kind === EventKind.Click &&
          node.kind === NodeKind.HyperlinkButton
        )
          this.jobs.push(() => {
            if (this.disposed || node.isDisposed) return;
            const uri = (node.properties as HyperlinkButtonOptions).navigateUri;
            if (uri) window.open(uri, "_blank", "noopener,noreferrer");
          });
        if (
          !this.disposed &&
          !node.isDisposed &&
          event.kind === EventKind.PaneClosing && raw.requestId!==undefined
        )
          node.kind===NodeKind.SplitView?this.send({kind:"viewControl",id:raw.target,action:"resolvePane",request:raw.requestId,cancel:event.cancel}):this.send({
            kind: "navigation",
            id: raw.target,
            input: {
              kind: "resolveClosing",
              request: raw.requestId,
              cancel: event.cancel,
            },
          });
      }
    } finally {
      this.dispatching = false;
      const jobs = this.jobs.splice(0);
      if (!this.disposed) for (const job of jobs) job();
    }
  }
  /** Only property updates participate; creation/reparent/removal are rejected during a transaction. */
  batch(callback: () => void) {
    this.assertAlive();
    if (this.transaction) {
      callback();
      return;
    }
    this.transaction = [];
    try {
      callback();
      const updates = this.transaction;
      this.transaction = null;
      if (updates.length) this.submit(updates);
    } catch (error) {
      this.transaction = null;
      throw error;
    }
  }
  configure(options: {
    theme?: ThemeMode;
    reducedMotion?: boolean;
    reducedTransparency?: boolean;
  }) {
    this.assertAlive();
    const previous=[this._theme,this.reduced,this.transparency] as const;
    if (options.theme !== undefined) this._theme = options.theme;
    if (options.reducedMotion !== undefined) {
      this.automaticMotion = false;
      this.reduced = options.reducedMotion;
    }
    if (options.reducedTransparency !== undefined) {
      this.automaticTransparency = false;
      this.transparency = options.reducedTransparency;
    }
    if(previous[0]!==this._theme||previous[1]!==this.reduced||previous[2]!==this.transparency)this.applyPolicies();
  }
  private applyPolicies() {
    if (this.disposed) return;
    this.raw.scene_configure(
      this.handle,
      JSON.stringify(this._theme),
      this.reduced,
      this.transparency,
      this.clock(),
    );
    this.schedule();
  }
  /** Diagnostic snapshots are detached; properties are read from Rust on demand. */
  /** Subscribe to the Rust scene frame, including template-owned nodes. */
  onSnapshot(listener:(snapshot:Readonly<SceneSnapshot>)=>void){this.assertAlive();this.flushSurfaceResize();this.snapshotListeners.add(listener);if(this.state)listener(this.snapshot);return()=>this.snapshotListeners.delete(listener);}
  /** @internal Select before detaching so control subscriptions do not copy
   * unrelated nodes, templates, properties and Frame page resources. */
  observeNodeSnapshot<T>(node:SceneNode,select:(snapshot:NodeSnapshot)=>T,callback:(snapshot:T)=>void){
    node.assertOwned(this);const id=identity(node),listener=(snapshot:NodeSnapshot)=>callback(structuredClone(select(snapshot)));
    let listeners=this.nodeSnapshotListeners.get(id);if(!listeners)this.nodeSnapshotListeners.set(id,listeners=new Set());
    this.flushSurfaceResize();
    listeners.add(listener);const current=this.state?.nodes.find(n=>n.id===id);if(current)listener(current);
    return()=>{listeners.delete(listener);if(!listeners.size)this.nodeSnapshotListeners.delete(id);};
  }
  /** @internal */ selectNodeSnapshot<T>(node:SceneNode,select:(snapshot:NodeSnapshot)=>T):T{
    node.assertOwned(this);this.flushSurfaceResize();const current=this.state.nodes.find(n=>n.id===identity(node));
    if(!current)throw new Error('Node has not been arranged yet');return structuredClone(select(current));
  }
  get snapshot(): Readonly<SceneSnapshot> {
    this.assertAlive();
    this.flushSurfaceResize();
    return structuredClone(this.state);
  }
  get diagnostics() {
    this.assertAlive();
    return {
      frameP50Ms:
        [...this.stats.samples].sort((a, b) => a - b)[
          Math.floor(this.stats.samples.length * 0.5)
        ] ?? 0,
      frameP95Ms:
        [...this.stats.samples].sort((a, b) => a - b)[
          Math.floor(this.stats.samples.length * 0.95)
        ] ?? 0,
      frames: this.stats.frames,
      averageFrameMs: this.stats.totalMs / Math.max(1, this.stats.frames),
      maxFrameMs: this.stats.maxMs,
      ...this.state.backend,
    };
  }
  /** @internal */ motionCommand(node:SceneNode,command:object):boolean {
    this.assertAlive();node.assertOwned(this);
    if(this.transaction)throw new Error('Motion commands are not allowed inside Scene.batch');
    const result=this.raw.scene_motion(this.handle,identity(node),JSON.stringify(command),this.clock());
    this.schedule();return result;
  }
  /** @internal */ bindExpressions(node:SceneNode,expressions:ExpressionBindings){
    const wire=Object.fromEntries(Object.entries(expressions).map(([key,expr])=>[key,expr!.toWire(source=>{source.assertOwned(this);return identity(source);})]));
    this.motionCommand(node,{command:'bind',expressions:wire});
  }
  /** @internal */ animate(
    node: SceneNode,
    targets: AnimationTargets,
    options: AnimationOptions,
  ): Animation {
    this.assertAlive();
    node.assertOwned(this);
    if (this.transaction)
      throw new Error("Animation creation is not allowed inside Scene.batch");
    const id = this.raw.scene_animate(
      this.handle,
      identity(node),
      JSON.stringify(targets),
      JSON.stringify(options),
      this.clock(),
    );
    const finished = new Promise<AnimationResult>((resolve) =>
      this.animations.set(id, { node, resolve }),
    );
    this.schedule();
    return {
      finished,
      cancel: () => {
        if (this.disposed || !this.animations.has(id)) return;
        this.raw.scene_cancel_animation(this.handle, id, this.clock());
        this.schedule();
      },
    };
  }
  private settleDisposed(node?: SceneNode) {
    for (const [id, pending] of this.animations) {
      if (!node || pending.node === node) {
        pending.resolve(AnimationResult.Disposed);
        this.animations.delete(id);
      }
    }
  }
  /** Focus using the shared Rust tree and the accessible browser projection. */
  /** @internal */ setScrollHost(
    node: ScrollViewer,
    metrics: HostScrollMetrics,
    contentId?: string,
  ) {
    node.assertOwned(this);
    if (contentId) this.scrollHostTargets.set(identity(node), contentId);
    const view: ScrollSnapshot = JSON.parse(this.raw.scene_scroll_host(
      this.handle,
      identity(node),
      JSON.stringify(metrics),
      this.clock(),
    ));
    this.schedule();
    return view;
  }
  /** @internal */ hostPointer(x?: number, y?: number) {
    this.send(
      x === undefined ? { kind: "leave" } : { kind: "move", x, y, pointer: 1 },
    );
  }
  /** @internal Forward platform wheel input without a second scrolling implementation. */
  hostWheel(event: WheelEvent) {
    const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? this.viewport.height : 1;
    const handled = this.raw.scene_wheel(this.handle, JSON.stringify({
      ...this.point(event),
      dx: (event.shiftKey && event.deltaX === 0 ? event.deltaY : event.deltaX) * scale,
      dy: (event.shiftKey && event.deltaX === 0 ? 0 : event.deltaY) * scale,
      ctrl: event.ctrlKey,
    }), this.clock());
    if (handled) this.schedule();
    return handled;
  }
  focusNode(node: SceneNode) {
    node.assertOwned(this);
    this.pendingFocus = identity(node);
    this.send({ kind: "focus", id: identity(node) });
  }
  /** @internal Stable wrapper identity map, not an independent control tree. */
  create(parent: SceneNode, kind: NodeKind, options: object): SceneNode {
    this.assertAlive();
    if (this.transaction)
      throw new Error("Creation is not allowed inside Scene.batch");
    parent.assertOwned(this);
    const commandSource=kind===NodeKind.CommandBar?options as CommandBarOptions:undefined;
    const navigation=navigationControlKind(kind)?navigationSource(kind,options):undefined;
    if(navigation)options=navigation.patch;
    const collection=collectionKind(kind)?collectionSource(options as CollectionViewOptions):undefined;const clientItems=collection?.items??((kind===NodeKind.AutoSuggestBox||kind===NodeKind.ComboBox)?(options as AutoSuggestBoxOptions).items:undefined);
    if(collection)options=collection.options;
    options=normalizeBoundMenus(kind,options,this);
    options=normalizeMenuLayout(kind,options);
    options=normalizeMenuItem(kind,options);
    const tableOptions=options;
    options=normalizeTable(kind,options);
    options=normalizeSurfaceTarget(kind,options,this);
    options=normalizePrimitives(kind,options,this);
    options=normalizeContentHosts(kind,options);
    options=normalizeReading(kind,options,this);
    options=normalizeViews(kind,options,this);
    options=normalizeCommands(kind,options,this);
    options=normalizeComposed(kind,options);
    options=normalizeRepeaterRefresh(kind,options);
    options=normalizePicker(kind,options,true);
    const id = this.raw.scene_node(
      this.handle,
      identity(parent),
      JSON.stringify(kind),
      JSON.stringify(options),
    );
    let node: SceneNode;
    switch (kind) {
      case NodeKind.MenuFlyoutItem:node=new MenuFlyoutItem(this,id,kind);break;
      case NodeKind.ToggleMenuFlyoutItem:node=new ToggleMenuFlyoutItem(this,id,kind);break;
      case NodeKind.RadioMenuFlyoutItem:node=new RadioMenuFlyoutItem(this,id,kind);break;
      case NodeKind.MenuFlyoutSubItem:node=new MenuFlyoutSubItem(this,id,kind);break;
      case NodeKind.MenuFlyoutSeparator:node=new MenuFlyoutSeparator(this,id,kind);break;
      case NodeKind.TableView:node=new TableView(this,id,kind,tableOptions as TableViewOptions);break;
      case NodeKind.ScrollBar:node=new ScrollBar(this,id,kind);break;
      case NodeKind.Thumb:node=new Thumb(this,id,kind);break;
      case NodeKind.TickBar:node=new TickBar(this,id,kind);break;
      case NodeKind.ItemsPresenter:node=new ItemsPresenter(this,id,kind);break;
      case NodeKind.ScrollContentPresenter:node=new ScrollContentPresenter(this,id,kind);break;
      case NodeKind.ContentControl:node=new ContentControl(this,id,kind);break;
      case NodeKind.ContentPresenter:node=new ContentPresenter(this,id,kind);break;
      case NodeKind.UserControl:node=new UserControl(this,id,kind);break;
      case NodeKind.Page:node=new Page(this,id,kind);break;
      case NodeKind.Frame:node=new SceneFrame(this,id,kind);break;
      case NodeKind.PagerControl:node=new PagerControl(this,id,kind);break;
      case NodeKind.AnnotatedScrollBar:node=new AnnotatedScrollBar(this,id,kind);break;
      case NodeKind.LayoutPanel:node=new Panel<LayoutPanelOptions>(this,id,kind);break;
      case NodeKind.RichTextBlockOverflow:node=new RichTextBlockOverflow(this,id,kind);break;
      case NodeKind.RichTextBlock:node=new RichTextBlock(this,id,kind);break;
      case NodeKind.ItemsView:node=new ItemsView(this,id,kind);(node as ItemsView).setClientItems(clientItems??[]);(node as ItemsView).setClientSelection((options as CollectionViewOptions).selectedKeys??[]);break;
      case NodeKind.ItemsRepeater:node=new ItemsRepeater(this,id,kind);(node as ItemsRepeater).setClientItems(clientItems??[]);break;
      case NodeKind.RefreshContainer:node=new RefreshContainer(this,id,kind);break;
      case NodeKind.RefreshVisualizer:node=new RefreshVisualizer(this,id,kind);break;
      case NodeKind.MenuBar:node=new MenuBar(this,id,kind);break;
      case NodeKind.MenuBarItem:node=new MenuBarItem(this,id,kind);break;
      case NodeKind.CommandBarFlyout:node=new CommandBarFlyout(this,id,kind);break;
      case NodeKind.RelativePanel:node=new Panel<RelativePanelOptions>(this,id,kind);break;
      case NodeKind.WrapPanel:node=new Panel<WrapPanelOptions>(this,id,kind);break;
      case NodeKind.SplitView:node=new SplitView(this,id,kind);break;
      case NodeKind.SemanticZoom:node=new SemanticZoom(this,id,kind);break;
      case NodeKind.ParallaxView:node=new ParallaxView(this,id,kind);break;
      case NodeKind.UICommand:node=new UICommand(this,id,kind);break;
      case NodeKind.StandardCommand:node=new StandardCommand(this,id,kind);break;
      case NodeKind.AppBarButton:node=new AppBarButton(this,id,kind);break;
      case NodeKind.AppBarToggleButton:node=new AppBarToggleButton(this,id,kind);break;
      case NodeKind.DropDownButton:node=new DropDownButton(this,id,kind);break;
      case NodeKind.CommandBar:node=new CommandBar(this,id,kind);break;
      case NodeKind.AppBarSeparator:node=new AppBarSeparator(this,id,kind);break;
      case NodeKind.SelectorBar:node=new SelectorBar(this,id,kind);break;
      case NodeKind.FlipView:node=new FlipView(this,id,kind);break;
      case NodeKind.PipsPager:node=new PipsPager(this,id,kind);break;
      case NodeKind.BreadcrumbBar:node=new BreadcrumbBar(this,id,kind);break;
      case NodeKind.TreeView:node=new TreeView(this,id,kind);break;
      case NodeKind.TabView:node=new TabView(this,id,kind);break;
      case NodeKind.CalendarView:node=new CalendarView(this,id,kind);break;
case NodeKind.CalendarDatePicker:node=new CalendarDatePicker(this,id,kind);break;
case NodeKind.DatePicker:node=new DatePicker(this,id,kind);break;
case NodeKind.TimePicker:node=new TimePicker(this,id,kind);break;
case NodeKind.ColorPicker:node=new ColorPicker(this,id,kind);break;
      case NodeKind.NumberBox:node=new NumberBox(this,id,kind);break;
      case NodeKind.AutoSuggestBox:node=new AutoSuggestBox(this,id,kind);(node as AutoSuggestBox).setClientItems(clientItems??[]);break;
      case NodeKind.ComboBox:node=new ComboBox(this,id,kind);(node as ComboBox).setClientItems(clientItems??[]);break;
      case NodeKind.ContentDialog:node=new ContentDialog(this,id,kind);break;
      case NodeKind.TeachingTip:node=new TeachingTip(this,id,kind);break;
      case NodeKind.ListView:case NodeKind.GridView:node=new CollectionView(this,id,kind);(node as CollectionView).setClientItems(clientItems??[]);(node as CollectionView).setClientGroups(collection?.groups??[]);(node as CollectionView).setClientSelection((options as CollectionViewOptions).selectedKeys??[]);break;
      case NodeKind.ItemsStackPanel:case NodeKind.ItemsWrapGrid:case NodeKind.VariableSizedWrapGrid:node=new Panel<ItemsPanelOptions>(this,id,kind);break;
      case NodeKind.InfoBar:node=new InfoBar(this,id,kind);break;
      case NodeKind.PersonPicture:node=new SceneNode<PersonPictureOptions>(this,id,kind);break;
      case NodeKind.RatingControl:node=new RatingControl(this,id,kind);break;
      case NodeKind.SplitButton:node=new SplitButton(this,id,kind);break;
      case NodeKind.ToggleSplitButton:node=new ToggleSplitButton(this,id,kind);break;
      case NodeKind.Popup:case NodeKind.ToolTip:case NodeKind.Flyout:case NodeKind.MenuFlyout:
        node=new FloatingSurface(this,id,kind);break;
      case NodeKind.Slider:node=new Slider(this,id,kind);break;
      case NodeKind.Border:
        node = new Border(this, id, kind);
        break;
      case NodeKind.Canvas:
        node = new Canvas(this, id, kind);
        break;
      case NodeKind.Expander:
        node = new Expander(this, id, kind);
        break;
      case NodeKind.HyperlinkButton:
        node = new HyperlinkButton(this, id, kind);
        break;
      case NodeKind.AnimatedIcon: node=new AnimatedIcon(this,id,kind);break;
      case NodeKind.IconSourceElement:node=new SceneNode<IconSourceElementOptions>(this,id,kind);break;
      case NodeKind.Rectangle:node=new SceneNode<RectangleOptions>(this,id,kind);break;
      case NodeKind.Line:node=new SceneNode<LineOptions>(this,id,kind);break;
      case NodeKind.Path:node=new SceneNode<PathOptions>(this,id,kind);break;
      case NodeKind.Polygon:node=new SceneNode<PolygonOptions>(this,id,kind);break;
      case NodeKind.Polyline:node=new SceneNode<PolylineOptions>(this,id,kind);break;
      case NodeKind.FontIcon:
        node = new SceneNode<FontIconOptions>(this, id, kind);
        break;
      case NodeKind.SymbolIcon:
        node = new SceneNode<SymbolIconOptions>(this, id, kind);
        break;
      case NodeKind.PathIcon:
        node = new SceneNode<PathIconOptions>(this, id, kind);
        break;
      case NodeKind.BitmapIcon:
        node = new SceneNode<BitmapIconOptions>(this, id, kind);
        break;
      case NodeKind.ImageIcon:
        node = new SceneNode<ImageIconOptions>(this, id, kind);
        break;
      case NodeKind.InfoBadge:
        node = new SceneNode<InfoBadgeOptions>(this, id, kind);
        break;
      case NodeKind.RepeatButton:
        node = new RepeatButton(this, id, kind);
        break;
      case NodeKind.Viewbox:
        node = new Viewbox(this, id, kind);
        break;
      case NodeKind.ProgressBar:
        node = new ProgressBar(this, id, kind);
        break;
      case NodeKind.ProgressRing:
        node = new ProgressRing(this, id, kind);
        break;
      case NodeKind.RichEditBox:
        node = new RichEditBox(this,id,kind);
        break;
      case NodeKind.TextBox:
        node = new TextBox(this, id, kind);
        break;
      case NodeKind.PasswordBox:
        node = new PasswordBox(this, id, kind);
        break;
      case NodeKind.ScrollView:node=new ScrollView(this,id,kind);break;
      case NodeKind.SwipeControl:node=new SwipeControl(this,id,kind);break;
      case NodeKind.ScrollViewer:
        node = new ScrollViewer(this, id, kind);
        break;
      case NodeKind.Grid:
      case NodeKind.StackPanel:
        node = new Panel(this, id, kind);
        break;
      case NodeKind.RadioButton:
        node = new RadioButton(this, id, kind);
        break;
      case NodeKind.RadioButtons:
        node = new RadioButtons(this, id, kind);
        break;
      case NodeKind.ToggleSwitch:
        node = new ToggleSwitch(this, id, kind);
        break;
      case NodeKind.ToggleButton:
      case NodeKind.CheckBox:
        node =
          kind === NodeKind.CheckBox
            ? new CheckBox(this, id, kind)
            : new ToggleButton(this, id, kind);
        break;
      case NodeKind.Button:
        node = new Button(this, id, kind);
        break;
      case NodeKind.NavigationViewItem:node=new NavigationViewItem(this,id,kind);break;
      case NodeKind.NavigationView:
        node = new SceneNavigationView(this, id, kind);
        break;
      default:
        node = new SceneNode(this, id, kind);
    }
    if(node instanceof NavigationControl){
      node.setClientNavigationItems(navigation?.items??[]);
      const initial=options as {selectedIndex?:number;navControls?:{selectedPageIndex?:number;numberOfPages?:number}};
      const count=navigation?.items?.length??0,requested=initial.navControls?.selectedPageIndex??0,pages=initial.navControls?.numberOfPages??-1;
      node.setClientNavigationSelection((kind===NodeKind.SelectorBar)&&count?Math.max(-1,Math.min(count-1,initial.selectedIndex??-1)):(kind===NodeKind.FlipView||kind===NodeKind.TabView)&&count?Math.max(0,Math.min(count-1,initial.selectedIndex??0)):-1,Math.max(0,pages>=0?Math.min(requested,Math.max(0,pages-1)):requested));
    }
    if(node instanceof CommandBar&&commandSource)node.setClientCommands(commandSource);
    this.nodes.set(id, node);
    this.parents.set(id,identity(parent));
    this.schedule();
    return node;
  }
  /** @internal */ patch(node: SceneNode, properties: object) {
    node.assertOwned(this);
    if((properties as {isOpen?:boolean;isCalendarOpen?:boolean}).isOpen||(properties as {isCalendarOpen?:boolean}).isCalendarOpen)this.updatePopupViewport();
    const commandSource=node.kind===NodeKind.CommandBar?properties as Partial<CommandBarOptions>:undefined;
    const navigation=navigationControlKind(node.kind)?navigationSource(node.kind,properties):undefined;
    if(navigation)properties=navigation.patch;
    let clientItems:readonly CollectionItem[]|undefined;let clientGroups:readonly CollectionGroup[]|undefined;
    if(collectionKind(node.kind)&&(Object.hasOwn(properties,'items')||Object.hasOwn(properties,'groups'))){const source=collectionSource(properties as CollectionViewOptions);clientItems=source.items;clientGroups=source.groups;properties=source.options;}
    if((node.kind===NodeKind.AutoSuggestBox||node.kind===NodeKind.ComboBox)&&Object.hasOwn(properties,"items"))clientItems=(properties as AutoSuggestBoxOptions).items;
    properties=normalizeBoundMenus(node.kind,properties,this);
    properties=normalizeMenuLayout(node.kind,properties);
    properties=normalizeMenuItem(node.kind,properties);
    if(node instanceof TableView)properties=node.preparePatch(properties);
    properties=normalizeTable(node.kind,properties);
    properties=normalizeSurfaceTarget(node.kind,properties,this);
    properties=normalizePrimitives(node.kind,properties,this);
    properties=normalizeContentHosts(node.kind,properties);
    properties=normalizeReading(node.kind,properties,this);
    properties=normalizeViews(node.kind,properties,this);
    properties=normalizeCommands(node.kind,properties,this);
    properties=normalizeComposed(node.kind,properties);
    properties=normalizeRepeaterRefresh(node.kind,properties);
    properties=normalizePicker(node.kind,properties);
    const update:Patch={id:identity(node),patch:properties,clientItems,clientGroups,navigationItems:navigation?.items,commandSource};
    if (this.transaction)
      this.transaction.push(update);
    else this.submit([update]);
  }
  private submit(updates: Patch[]) {
    const json = JSON.stringify(updates.map(({id,patch})=>({id,patch})));
    const job = () => {
      if (this.disposed || updates.some((u) => !this.nodes.has(u.id))) return;
      this.raw.scene_update(this.handle, json, this.clock());
      for(const update of updates){const node=this.nodes.get(update.id);if(node instanceof CommandBar&&update.commandSource)node.setClientCommands(update.commandSource);if(node instanceof NavigationControl&&update.navigationItems)node.setClientNavigationItems(update.navigationItems);}
      for(const u of updates){const node=this.nodes.get(u.id);if(node instanceof ItemsRepeater&&u.clientItems)node.setClientItems(u.clientItems);if((node instanceof AutoSuggestBox||node instanceof ComboBox)&&u.clientItems)node.setClientItems(u.clientItems);if(node instanceof CollectionView){if(u.clientItems){node.setClientItems(u.clientItems);node.setClientGroups(u.clientGroups??[]);}if(u.clientItems||Object.hasOwn(u.patch,'selectedKeys')||Object.hasOwn(u.patch,'selectionMode'))node.setClientSelection((JSON.parse(this.raw.scene_properties(this.handle,u.id)) as CollectionViewOptions).selectedKeys??[]);}}
      this.schedule();
    };
    if (this.dispatching) this.jobs.push(job);
    else job();
  }
  /** @internal */ composedItems<T extends CollectionItem>(node:SceneNode,items:readonly T[]):CollectionView<T>{
    node.assertOwned(this);const id=this.raw.scene_content_slot(this.handle,identity(node),'itemsPresenter');let view=this.nodes.get(id) as CollectionView<T>|undefined;
    if(!view){view=new CollectionView<T>(this,id,NodeKind.ListView);this.nodes.set(id,view);this.parents.set(id,identity(node));}
    if(view.clientItems!==items)view.setClientItems(items);return view;
  }
  /** @internal */ composedItemsChanged(node:SceneNode,items:readonly CollectionItem[]){const id=this.raw.scene_content_slot(this.handle,identity(node),'itemsPresenter');const view=this.nodes.get(id);if(view instanceof CollectionView)view.setClientItems(items);}
  /** @internal */ composedContent(node:SceneNode,slot:'content'|'heroContent'):Panel{
    node.assertOwned(this);const id=this.raw.scene_content_slot(this.handle,identity(node),slot);const old=this.nodes.get(id);if(old)return old as Panel;
    const part=new TemplateContentSlot(this,id,NodeKind.StackPanel);this.nodes.set(id,part);this.parents.set(id,identity(node));return part;
  }
  /** @internal */ navigationInput(node:SceneNode,input:object){
    node.assertOwned(this);if((input as {action?:string}).action==='openOverflow')this.updatePopupViewport();const reply=JSON.parse(this.raw.scene_navigation_input(this.handle,identity(node),JSON.stringify(input),this.clock())) as {events:SceneEvent[];selectedIndex:number;selectedPageIndex:number;dragging:boolean;committed:boolean};
    if(node instanceof NavigationControl)node.setClientNavigationSelection(reply.selectedIndex,reply.selectedPageIndex);
    this.dispatch(reply.events as unknown as Parameters<Scene['dispatch']>[0]);this.schedule();return reply;
  }
  /** @internal */ navigationSnapshot(node:SceneNode){return this.state?.nodes.find(n=>n.id===identity(node))?.navigationControl??undefined;}
  /** @internal */ navigationSettings(node:SceneNode){return (this.state?.nodes.find(n=>n.id===identity(node))?.props as unknown as {navControls?:TabViewOptions}|undefined)?.navControls;}
  /** @internal */ teardownNavigation(node:SceneNode,input:object){if(!this.disposed&&!node.isDisposed&&this.nodes.has(identity(node)))this.navigationInput(node,input);}
  /** @internal */ requestNavigationTemplates(){this.schedule();}
  /** @internal */ navigationSlot(node:SceneNode,key:string,role:NavigationRole){
    node.assertOwned(this);const id=this.raw.scene_navigation_slot(this.handle,identity(node),key,role);let child=this.nodes.get(id);
    if(!child){child=new Panel(this,id,NodeKind.Grid);this.nodes.set(id,child);this.parents.set(id,identity(node));this.schedule();}
    return child as Panel;
  }
  /** @internal */ clearNavigationContent(node:Panel){for(const [id,parent] of this.parents)if(parent===identity(node)){const child=this.nodes.get(id);if(child&&!child.isDisposed)child.dispose();}}
  private collectionController(node:SceneNode|undefined){return node instanceof TreeView?node.itemsView:node instanceof CollectionView?node:undefined;}
  /** @internal */ itemsViewIndex(node:ItemsView,horizontal:number,vertical:number){node.assertOwned(this);const index=this.raw.scene_items_view_index(this.handle,identity(node),horizontal,vertical);return index<0?null:index;}
  /** @internal */ collectionHeader(node:CollectionView):Panel{node.assertOwned(this);const id=this.raw.scene_collection_header(this.handle,identity(node));let header=this.nodes.get(id);if(!header){header=new Panel(this,id,NodeKind.CollectionHeader);this.nodes.set(id,header);this.parents.set(id,identity(node));this.schedule();}return header as Panel;}
  /** @internal */ commandMetadata(node:UICommand):UICommandMetadata{node.assertOwned(this);return JSON.parse(this.raw.scene_ui_command(this.handle,identity(node)));}
  /** @internal */ richExport(node:RichEditBox,mathml:boolean,selection=false):string {node.assertOwned(this);return this.raw.scene_rich_edit_export(this.handle,identity(node),mathml,selection);}
  /** @internal */ richSelection(node:RichEditBox):RichEditDocument {node.assertOwned(this);return JSON.parse(this.raw.scene_rich_edit_selection(this.handle,identity(node))).document;}
  /** @internal */ read(node: SceneNode): object {
    node.assertOwned(this);
    const properties=JSON.parse(this.raw.scene_properties(this.handle, identity(node)));
    if([NodeKind.MenuBar,NodeKind.CommandBarFlyout].includes(node.kind)){Object.assign(properties,properties.menuControls);delete properties.menuControls;}
    if(node.kind===NodeKind.MenuBarItem){properties.title=properties.text;properties.items=properties.menuItems;}
    if(menuItemKinds.includes(node.kind)){Object.assign(properties,properties.menuItem);delete properties.menuItem;}
    if(primitiveKinds.includes(node.kind)){Object.assign(properties,properties.primitives);delete properties.primitives;for(const key of ["source","scrollTarget"])if(typeof properties[key]==='number')properties[key]=this.nodes.get(properties[key])??null;}
    if(contentHostKinds.includes(node.kind)){Object.assign(properties,properties.contentHost);delete properties.contentHost;}
    if(readingKinds.includes(node.kind)){Object.assign(properties,properties.reading);if(properties.featuredSpacing!=null)properties.layout=new FeaturedTileLayout({spacing:properties.featuredSpacing});delete properties.reading;delete properties.featuredSpacing;for(const key of ['labelItemSource','scrollTarget','overflowContentTarget','firstButtonCommand','previousButtonCommand','nextButtonCommand','lastButtonCommand','pagerInputCommand'])if(typeof properties[key]==='number')properties[key]=this.nodes.get(properties[key])??null;if(node.kind===NodeKind.ItemsView)properties.isItemInvokedEnabled=properties.isItemClickEnabled;}
    if(node.kind===NodeKind.WrapPanel){Object.assign(properties,properties.panelControls);delete properties.panelControls;}
    if(commandKinds.includes(node.kind)){Object.assign(properties,properties.commandControls);delete properties.commandControls;}
    if(navigationControlKind(node.kind)){
      const nav={numberOfPages:-1,selectedPageIndex:0,maxVisiblePips:5,previousButtonVisibility:PipsPagerButtonVisibility.Collapsed,nextButtonVisibility:PipsPagerButtonVisibility.Collapsed,wrapMode:PipsPagerWrapMode.None,treeSelectionMode:TreeViewSelectionMode.Single,expandedKeys:[],tabWidthMode:TabViewWidthMode.Equal,closeButtonOverlayMode:TabViewCloseButtonOverlayMode.Auto,isAddTabButtonVisible:true,canDragTabs:false,canReorderTabs:true,allowDropTabs:false,tabStripHeaderWidth:0,tabStripFooterWidth:0,...properties.navControls};delete properties.navControls;Object.assign(properties,nav);if(node.kind===NodeKind.TreeView)properties.selectionMode=nav.treeSelectionMode;
    }
    if(node.kind===NodeKind.ItemsRepeater){Object.assign(properties,properties.repeater);delete properties.repeater;}
    if(node.kind===NodeKind.RefreshContainer||node.kind===NodeKind.RefreshVisualizer){Object.assign(properties,properties.refresh);delete properties.refresh;}
    if(properties.viewControls?.command!==undefined){properties.command=this.nodes.get(properties.viewControls.command)??null;properties.commandParameter=properties.viewControls.commandParameter;}
    if(viewControlKinds.includes(node.kind)){Object.assign(properties,properties.viewControls);delete properties.viewControls;for(const key of ['source','command'])if(typeof properties[key]==='number')properties[key]=this.nodes.get(properties[key])??null;}
    const boundItems=(items:any[])=>{for(const item of items){if(typeof item.command==='number')item.command=this.nodes.get(item.command)??null;delete item.commandMetadata;delete item.commandBaseEnabled;if(item.items)boundItems(item.items);}};
    if(properties.menuItems)boundItems(properties.menuItems);
    if([NodeKind.MenuBar,NodeKind.MenuBarItem].includes(node.kind)&&properties.items)for(const item of properties.items){if(item.items)boundItems(item.items);}
    if(node.kind===NodeKind.MenuBarItem&&properties.items)boundItems(properties.items);
    for(const key of ['leftItems','rightItems','topItems','bottomItems'])if(properties[key]?.items)boundItems(properties[key].items);
    if(pickerKinds.includes(node.kind)){Object.assign(properties,properties.pickerControls);delete properties.pickerControls;if(node.kind===NodeKind.CalendarView){properties.selectionMode=properties.calendarSelectionMode;delete properties.calendarSelectionMode;}if(node.kind===NodeKind.CalendarDatePicker)properties.isCalendarOpen=properties.isOpen;}
    if(node.kind===NodeKind.NumberBox){properties.value=properties.numberValue;properties.numberFormat={locale:properties.numberLocale||undefined,useGrouping:properties.numberUseGrouping,minimumFractionDigits:properties.numberMinFractionDigits,roundingIncrement:properties.numberRoundingIncrement??undefined};}
    if(node instanceof AutoSuggestBox||node instanceof ComboBox)properties.items=node.items;
    if([NodeKind.Popup,NodeKind.ToolTip,NodeKind.Flyout,NodeKind.MenuFlyout,NodeKind.CommandBarFlyout,NodeKind.TeachingTip].includes(node.kind))properties.target=this.nodes.get(properties.placementTarget)??null;
    const referenceKeys:Partial<Record<ReferenceProperty,string>>={placementTarget:'target',primitiveSource:'source',viewSource:'source',primitiveScrollTarget:'scrollTarget',readingScrollTarget:'scrollTarget',labelItemSource:'labelItemSource',overflowContentTarget:'overflowContentTarget',command:'command'};
    for(const [property,name] of Object.entries(properties.elementReferences??{})){
      const key=referenceKeys[property as ReferenceProperty];if(key&&typeof name==='string')properties[key]=name;
    }
    delete properties.elementReferences;
    return properties;
  }
  /** @internal */ nodeSnapshot(node: SceneNode): NodeSnapshot {
    node.assertOwned(this);
    this.flushSurfaceResize();
    const state = this.state.nodes.find((n) => n.id === identity(node));
    if (!state) throw new Error("Node has not been arranged yet");
    return structuredClone(state);
  }
  /** @internal */ tableState(node:SceneNode):Readonly<TableViewSnapshot>|null{node.assertOwned(this);return this.state.nodes.find(n=>n.id===identity(node))?.table??null;}
  /** @internal */ tableSlots<T extends object>(node:TableView<T>):TableViewSlot<T>[] {return this.state.nodes.find(n=>n.id===identity(node))?.table?.realized.flatMap(slot=>{const item=node.itemForKey(slot.row),container=this.nodes.get(slot.id);return item&&container instanceof Panel?[{...slot,role:slot.role as TableViewSlot<T>["role"],item,container}]:[];})??[];}
  /** @internal */ readingSlot(owner:SceneNode,id:number):Panel{owner.assertOwned(this);let slot=this.nodes.get(id);if(!slot){slot=new Panel(this,id,NodeKind.Grid);this.nodes.set(id,slot);this.parents.set(id,identity(owner));}return slot as Panel;}
  /** @internal */ navigationViewSlot(owner:SceneNavigationView,slot:import('./enums').NavigationViewSlot):Panel {
    owner.assertOwned(this);const id=this.raw.scene_content_slot(this.handle,identity(owner),slot);let child=this.nodes.get(id);
    if(!child){child=new Panel(this,id,NodeKind.Grid);this.nodes.set(id,child);this.parents.set(id,identity(owner));}return child as Panel;
  }
  /** @internal */ presenterPart(node:ItemsPresenter,slot:string):Panel {node.assertOwned(this);const id=this.raw.scene_content_slot(this.handle,identity(node),slot);let child=this.nodes.get(id);if(!child){child=new Panel(this,id,slot==='items'?NodeKind.Grid:NodeKind.ContentControl);this.nodes.set(id,child);this.parents.set(id,identity(node));}return child as Panel;}
  /** @internal */ findContentName(host:SceneNode,name:string):SceneNode|undefined {
    host.assertOwned(this);const id=this.raw.scene_content_find(this.handle,identity(host),name);if(!id)return undefined;let child=this.nodes.get(id);if(child)return child;
    const kind=this.state.nodes.find(n=>n.id===id)?.kind;if(!kind)return undefined;
    switch(kind){case NodeKind.RichEditBox:child=new RichEditBox(this,id,kind);break;case NodeKind.TextBox:child=new TextBox(this,id,kind);break;case NodeKind.PasswordBox:child=new PasswordBox(this,id,kind);break;case NodeKind.Button:child=new Button(this,id,kind);break;case NodeKind.ToggleButton:child=new ToggleButton(this,id,kind);break;case NodeKind.TextBlock:child=new SceneNode<TextOptions>(this,id,kind);break;default:child=new SceneNode(this,id,kind);}
    this.nodes.set(id,child);const parent=this.state.nodes.find(n=>n.id===id)?.parent;if(parent)this.parents.set(id,parent);return child;
  }
  /** @internal */ collectionRealization<T extends CollectionItem>(node:CollectionView<T>):CollectionRealization<T>[] {
    const snapshot=this.state?.nodes.find(n=>n.id===identity(node))?.collection;
    return snapshot?.realized.flatMap(r=>{const container=this.nodes.get(r.id),item=node.itemForKey(r.key);return container instanceof CollectionItemContainer&&item!==undefined?[{...r,item,container}]:[];})??[];
  }
  /** @internal */ repeaterRealization<T extends CollectionItem>(node:ItemsRepeater<T>){const snapshot=this.state?.nodes.find(n=>n.id===identity(node))?.repeater;return snapshot?.realized.flatMap(r=>{const container=this.nodes.get(r.id),item=node.itemForKey(r.key);return container instanceof RepeaterItemContainer&&item!==undefined?[{...r,item,container}]:[];})??[];}
  /** @internal */ refreshVisualizer(node:RefreshContainer){node.assertOwned(this);const id=this.raw.scene_content_slot(this.handle,identity(node),'refreshVisualizer');let child=this.nodes.get(id);if(!child){child=new RefreshVisualizer(this,id,NodeKind.RefreshVisualizer);this.nodes.set(id,child);this.parents.set(id,identity(node));}return child as RefreshVisualizer;}
  /** @internal */ collectionGroupRealization<T extends CollectionItem>(node:CollectionView<T>){const snapshot=this.state?.nodes.find(n=>n.id===identity(node))?.collection;return snapshot?.headers.flatMap(header=>{const container=this.nodes.get(header.id),group=node.clientGroups.find(group=>group.id===header.key);return container instanceof CollectionItemContainer&&group?[{key:header.key,index:header.index,container,group}]:[];})??[];}
  /** @internal */ clearCollectionContent(node:Panel){if(this.disposed||node.isDisposed)return;for(const [id,parent] of this.parents)if(parent===identity(node)){const child=this.nodes.get(id);if(child&&!child.isDisposed)child.dispose();}}
  /** @internal */ move(
    node: SceneNode,
    parent: Panel | Button | ToggleButton | Viewbox,
    index?: number,
  ) {
    this.assertAlive();
    if (this.transaction)
      throw new Error("Reparent is not allowed inside Scene.batch");
    node.assertOwned(this);
    parent.assertOwned(this);
    this.raw.scene_reparent(
      this.handle,
      identity(node),
      identity(parent),
      index,
    );
    this.parents.set(identity(node),identity(parent));
    this.schedule();
  }
  /** @internal Browser-hosted content occupies a real Rust child layout slot. */
  attachContentHost(slot:Border,element:HTMLElement):()=>void {
    slot.assertOwned(this);
    const id=identity(slot),abort=new AbortController();
    element.dataset.winuiContentHost='';
    element.style.cssText='position:relative;width:100%;min-width:0;pointer-events:auto;';
    const measure=()=>{
      if(this.disposed||slot.isDisposed||!element.isConnected||!slot.snapshot.visible||element.getBoundingClientRect().width<=0)return;
      const height=element.getBoundingClientRect().height;
      if(Math.abs((slot.properties.height??0)-height)>0.1)slot.update({height});
    };
    const observer=new ResizeObserver(measure);
    observer.observe(element);
    for(const type of ['pointerdown','pointermove','pointerup','click','keydown','keyup'])element.addEventListener(type,event=>event.stopPropagation(),{signal:abort.signal});
    this.contentHosts.set(id,{element,observer,measure});this.schedule();
    return ()=>{
      observer.disconnect();abort.abort();element.remove();this.contentHosts.delete(id);
      if(!this.disposed&&!slot.isDisposed)slot.dispose();
    };
  }
  /** @internal */ remove(node: SceneNode) {
    this.assertAlive();
    if (this.transaction)
      throw new Error("Removal is not allowed inside Scene.batch");
    node.assertOwned(this);
    const removed = JSON.parse(
      this.raw.scene_remove(this.handle, identity(node)),
    ) as number[];
    for (const id of removed) {
      const removedNode = this.nodes.get(id);
      if (removedNode) this.settleDisposed(removedNode);
      removedNode?.markDisposed();
      this.nodes.delete(id);
      this.parents.delete(id);
      this.nodeSnapshotListeners.delete(id);
      // Tear down native editing listeners synchronously with the Rust handle.
      // Selectionchange can run before the next projection/animation frame.
      this.editorHosts.get(id)?.dispose();
      this.editorHosts.delete(id);
      this.groups.get(id)?.remove();
      this.groups.delete(id);
      this.contentGroups.delete(id);
      this.scrollHostTargets.delete(id);
      for (const key of this.semantics.keys())
        if (key === String(id) || key.startsWith(`${id}/`))
          this.semantics.delete(key);
    }
    this.schedule();
  }
  /** @internal */ input(node: SceneNode, input: object) {
    node.assertOwned(this);
    this.send(input);
  }
  /** @internal */ focus(node: SceneNode) {
    this.focusNode(node);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.settleDisposed();
    cancelAnimationFrame(this.frame);
    this.abort.abort();
    clearTimeout(this.wakeTimer);
    for (const host of this.editorHosts.values()) host.dispose();
    this.editorHosts.clear();
    for(const host of this.contentHosts.values()){host.observer.disconnect();host.element.remove();}
    this.contentHosts.clear();
    this.contentGroups.clear();
    this.viewport.dispose();
    this.surfaceVisibility?.disconnect();
    for (const node of this.nodes.values()) node.markDisposed();
    this.nodes.clear();
    this.parents.clear();
    this.jobs = [];
    this.snapshotListeners.clear();
    this.nodeSnapshotListeners.clear();
    for (const image of this.pendingImages.values())
      image.removeAttribute("src");
    this.pendingImages.clear();
    if(this.floating.matches(":popover-open"))this.floating.hidePopover();
    this.pageBackdrop.stop();
    this.raw.scene_destroy(this.handle);
    if(this.element.dataset.backend===RendererBackend.WebGL2)this.floatingCanvas.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();
    if (this.element.dataset.backend === RendererBackend.WebGL2)
      this.canvas
        .getContext("webgl2")
        ?.getExtension("WEBGL_lose_context")
        ?.loseContext();
    this.groups.clear();
    this.projectedChildren.clear();
    this.semantics.clear();
    this.state = undefined!;
    this.element.replaceChildren();
    this.element.remove();
    this.released();
  }
}
export class SceneNode<
  T extends LayoutOptions = LayoutOptions,
> implements Disposable {
  private disposed = false;
  private listeners = new Map<EventKind, Set<(event: SceneEvent) => void>>();
  /** @internal */ constructor(
    protected scene: Scene,
    /** @internal */ id: number,
    readonly kind: NodeKind,
  ) {
    nodeIds.set(this, id);
  }
  get isDisposed() {
    return this.disposed;
  }
  /** Associate a context menu; Rust opens it for right click and ContextMenu key requests. */
  setContextFlyout(surface:FloatingSurface<PopupOptions>|null){
    surface?.assertOwned(this.scene);
    if(surface&&![NodeKind.Flyout,NodeKind.MenuFlyout,NodeKind.CommandBarFlyout].includes(surface.kind))throw new TypeError('ContextFlyout needs a Flyout or MenuFlyout');
    this.scene.patch(this,{contextFlyoutTarget:surface?identity(surface):null});
  }
  /** @internal */ assertOwned(scene: Scene) {
    if (this.disposed) throw new Error("Scene node is disposed");
    if (this.scene !== scene)
      throw new Error("Nodes cannot cross scene ownership");
  }
  /** @internal */ markDisposed() {
    this.disposed = true;
    this.listeners.clear();
  }
  /** Bind this control to the Rust implementation of WinUI XamlUICommand.
   * The optional parameter must be JSON-compatible; null unbinds the command. */
  bindCommand(command:UICommand|null,parameter:unknown=null){command?.assertOwned(this.scene);this.scene.patch(this,{viewControls:{command:command?identity(command):null,commandParameter:parameter}});return this;}
  update(properties: Partial<T>) {
    this.scene.patch(this, properties);
  }
  /** Atomic property batch using the same shared scene transaction. */ batch(
    properties: readonly Partial<T>[],
  ) {
    this.scene.batch(() => {
      for (const patch of properties) this.update(patch);
    });
  }
  /** Animate one or more presentation properties from their current rendered values.
   * Overlapping tracks interrupt the entire previous group; finished reports why.
   */
  animate(
    targets: AnimationTargets,
    options: AnimationOptions = {},
  ): Animation {
    return this.scene.animate(this, targets, options);
  }
  /** Bind visual channels to Rust expressions. Replaces this node's previous bindings. */
  bindExpressions(expressions:ExpressionBindings){this.scene.bindExpressions(this,expressions);}
  /** Remove bindings and restore their logical property values. */
  clearExpressions(){this.scene.motionCommand(this,{command:'clearExpressions'});}
  /** Capture the current Rust visual. The prepared connection expires after 2000ms. */
  prepareConnectedAnimation(key:string){
    this.scene.motionCommand(this,{command:'prepareConnected',key});
    const scene=this.scene;
    return {
      /** Start on a laid-out target in the same scene. Optional coordinated elements
       * share the connection's scale, offset, fade and timing. Completion emits
       * EventKind.ConnectedAnimationCompleted on the target with payload.key.
       * Returns false when expired or consumed. */
      tryStart(target:SceneNode,configuration:ConnectedAnimationConfiguration=ConnectedAnimationConfiguration.Gravity,coordinated:readonly SceneNode[]=[]){target.assertOwned(scene);for(const node of coordinated)node.assertOwned(scene);return scene.motionCommand(target,{command:'startConnected',key,configuration,coordinated:coordinated.map(identity)});},
      /** Cancel the prepared or active connection under this key. */
      cancel(){if(!scene.isDisposed)scene.motionCommand(scene.root,{command:'cancelConnected',key});},
    };
  }
  get properties(): Readonly<T> {
    return this.scene.read(this) as T;
  }
  get snapshot(): Readonly<NodeSnapshot> {
    return this.scene.nodeSnapshot(this);
  }
  on(kind: EventKind, callback: (event: SceneEvent) => void) {
    this.assertOwned(this.scene);
    const pointer=kind===EventKind.PointerEntered||kind===EventKind.PointerExited;
    const hadPointer=(this.listeners.get(EventKind.PointerEntered)?.size??0)+(this.listeners.get(EventKind.PointerExited)?.size??0);
    if(pointer&&!hadPointer)this.scene.patch(this,{pointerNotifications:true});
    const set = this.listeners.get(kind) ?? new Set();
    set.add(callback);
    this.listeners.set(kind, set);
    return () => {
      const removed=set.delete(callback);
      if(removed&&pointer&&!this.disposed&&!(this.listeners.get(EventKind.PointerEntered)?.size??0)&&!(this.listeners.get(EventKind.PointerExited)?.size??0))this.scene.patch(this,{pointerNotifications:false});
    };
  }
  /** @internal */ dispatch(event: SceneEvent) {
    for (const callback of [...(this.listeners.get(event.kind) ?? [])]) {
      if (this.disposed) break;
      try {
        callback(event);
      } catch (error) {
        reportError(error);
      }
    }
  }
  moveTo(parent: Panel | Button | ToggleButton | Viewbox, index?: number) {
    this.scene.move(this, parent, index);
  }
  focus() {
    this.scene.focus(this);
  }
  dispose() {
    if (!this.disposed) this.scene.remove(this);
  }
}
class Container<T extends LayoutOptions> extends SceneNode<T> {
  tableView<T extends object=Record<string,unknown>>(options:TableViewOptions<T>={}){return this.scene.create(this,NodeKind.TableView,options) as TableView<T>;}
  scrollBar(options:ScrollBarOptions={}){return this.scene.create(this,NodeKind.ScrollBar,options) as ScrollBar;}
  thumb(options:ThumbOptions={}){return this.scene.create(this,NodeKind.Thumb,options) as Thumb;}
  tickBar(options:TickBarOptions={}){return this.scene.create(this,NodeKind.TickBar,options) as TickBar;}
  itemsPresenter(options:ItemsPresenterOptions={}){return this.scene.create(this,NodeKind.ItemsPresenter,options) as ItemsPresenter;}
  scrollContentPresenter(options:ScrollContentPresenterOptions={}){return this.scene.create(this,NodeKind.ScrollContentPresenter,options) as ScrollContentPresenter;}
  contentControl(options:ContentControlOptions={}){return this.scene.create(this,NodeKind.ContentControl,options) as ContentControl;}
  contentPresenter(options:ContentPresenterOptions={}){return this.scene.create(this,NodeKind.ContentPresenter,options) as ContentPresenter;}
  userControl(options:UserControlOptions={}){return this.scene.create(this,NodeKind.UserControl,options) as UserControl;}
  page(options:PageOptions={}){return this.scene.create(this,NodeKind.Page,options) as Page;}
  sceneFrame(options:SceneFrameOptions={}){return this.scene.create(this,NodeKind.Frame,options) as SceneFrame;}
  itemsView<T extends CollectionItem=CollectionItem>(options:ItemsViewOptions<T>={}){return this.scene.create(this,NodeKind.ItemsView,options) as ItemsView<T>;}
  pagerControl(options:PagerControlOptions={}){return this.scene.create(this,NodeKind.PagerControl,options) as PagerControl;}
  annotatedScrollBar(options:AnnotatedScrollBarOptions={}){return this.scene.create(this,NodeKind.AnnotatedScrollBar,options) as AnnotatedScrollBar;}
  layoutPanel(options:LayoutPanelOptions={}){return this.scene.create(this,NodeKind.LayoutPanel,options) as Panel<LayoutPanelOptions>;}
  richTextBlockOverflow(options:RichTextBlockOverflowOptions={}){return this.scene.create(this,NodeKind.RichTextBlockOverflow,options) as RichTextBlockOverflow;}
  richTextBlock(options:RichTextBlockOptions={}){return this.scene.create(this,NodeKind.RichTextBlock,options) as RichTextBlock;}
  splitView(options:SplitViewOptions={}){return this.scene.create(this,NodeKind.SplitView,options) as SplitView;}
  semanticZoom(options:SemanticZoomOptions={}){return this.scene.create(this,NodeKind.SemanticZoom,options) as SemanticZoom;}
  parallaxView(options:ParallaxViewOptions={}){return this.scene.create(this,NodeKind.ParallaxView,options) as ParallaxView;}
  /** Implements WinUI XamlUICommand; Rust owns command state and execution notifications. */
  uiCommand(options:UICommandOptions={}){return this.scene.create(this,NodeKind.UICommand,options) as UICommand;}
  /** Implements WinUI StandardUICommand with native preset metadata. */
  standardCommand(options:StandardCommandOptions={}){return this.scene.create(this,NodeKind.StandardCommand,options) as StandardCommand;}

  calendarView(options:CalendarViewOptions={}){return this.scene.create(this,NodeKind.CalendarView,options) as CalendarView;}
  calendarDatePicker(options:CalendarDatePickerOptions={}){return this.scene.create(this,NodeKind.CalendarDatePicker,options) as CalendarDatePicker;}
  datePicker(options:DatePickerOptions={}){return this.scene.create(this,NodeKind.DatePicker,options) as DatePicker;}
  timePicker(options:TimePickerOptions={}){return this.scene.create(this,NodeKind.TimePicker,options) as TimePicker;}
  colorPicker(options:ColorPickerOptions={}){return this.scene.create(this,NodeKind.ColorPicker,options) as ColorPicker;}
  numberBox(options:NumberBoxOptions={}){return this.scene.create(this,NodeKind.NumberBox,options) as NumberBox;}
  flipView<T extends NavigationData=NavigationData>(options:FlipViewOptions<T>={}){return this.scene.create(this,NodeKind.FlipView,options) as FlipView<T>;}
  pipsPager(options:PipsPagerOptions={}){return this.scene.create(this,NodeKind.PipsPager,options) as PipsPager;}
  breadcrumbBar<T extends NavigationData=NavigationData>(options:BreadcrumbBarOptions<T>={}){return this.scene.create(this,NodeKind.BreadcrumbBar,options) as BreadcrumbBar<T>;}
  treeView<T extends TreeItem=TreeItem>(options:TreeViewOptions<T>={}){return this.scene.create(this,NodeKind.TreeView,options) as TreeView<T>;}
  appBarButton(options:AppBarButtonOptions={}){return this.scene.create(this,NodeKind.AppBarButton,options) as AppBarButton;}
  appBarToggleButton(options:AppBarToggleButtonOptions={}){return this.scene.create(this,NodeKind.AppBarToggleButton,options) as AppBarToggleButton;}
  dropDownButton(options:DropDownButtonOptions={}){return this.scene.create(this,NodeKind.DropDownButton,options) as DropDownButton;}
  menuBar(options:MenuBarOptions={}){return this.scene.create(this,NodeKind.MenuBar,options) as MenuBar;}
  menuBarItem(options:MenuBarItemOptions={}){return this.scene.create(this,NodeKind.MenuBarItem,options) as MenuBarItem;}
  commandBarFlyout(options:CommandBarFlyoutOptions={}){return this.scene.create(this,NodeKind.CommandBarFlyout,options) as CommandBarFlyout;}
  relativePanel(options:RelativePanelOptions={}){return this.scene.create(this,NodeKind.RelativePanel,options) as Panel<RelativePanelOptions>;}
  wrapPanel(options:WrapPanelOptions={}){return this.scene.create(this,NodeKind.WrapPanel,options) as Panel<WrapPanelOptions>;}
  appBarSeparator(options:AppBarSeparatorOptions={}){return this.scene.create(this,NodeKind.AppBarSeparator,options) as AppBarSeparator;}
  commandBar<T extends CommandBarItem=CommandBarItem>(options:CommandBarOptions<T>={}){return this.scene.create(this,NodeKind.CommandBar,options) as CommandBar<T>;}
  selectorBar<T extends NavigationData=NavigationData>(options:SelectorBarOptions<T>={}){return this.scene.create(this,NodeKind.SelectorBar,options) as SelectorBar<T>;}
  tabView<T extends TabItem=TabItem>(options:TabViewOptions<T>={}){return this.scene.create(this,NodeKind.TabView,options) as TabView<T>;}
  autoSuggestBox<T extends CollectionItem=CollectionItem>(options:AutoSuggestBoxOptions<T>={}){return this.scene.create(this,NodeKind.AutoSuggestBox,options) as AutoSuggestBox<T>;}
  comboBox<T extends CollectionItem=CollectionItem>(options:ComboBoxOptions<T>={}){return this.scene.create(this,NodeKind.ComboBox,options) as ComboBox<T>;}
  contentDialog(options:ContentDialogOptions={}){return this.scene.create(this,NodeKind.ContentDialog,options) as ContentDialog;}
  teachingTip(options:TeachingTipOptions={}){return this.scene.create(this,NodeKind.TeachingTip,options) as TeachingTip;}
  itemsStackPanel(options:ItemsPanelOptions={}){return this.scene.create(this,NodeKind.ItemsStackPanel,options) as Panel<ItemsPanelOptions>;}
  itemsWrapGrid(options:ItemsPanelOptions={}){return this.scene.create(this,NodeKind.ItemsWrapGrid,options) as Panel<ItemsPanelOptions>;}
  variableSizedWrapGrid(options:ItemsPanelOptions={}){return this.scene.create(this,NodeKind.VariableSizedWrapGrid,options) as Panel<ItemsPanelOptions>;}
  itemsRepeater<I extends CollectionItem=CollectionItem>(options:ItemsRepeaterOptions<I>={}){return this.scene.create(this,NodeKind.ItemsRepeater,options) as ItemsRepeater<I>;}
  refreshContainer(options:RefreshContainerOptions={}){return this.scene.create(this,NodeKind.RefreshContainer,options) as RefreshContainer;}
  refreshVisualizer(options:RefreshVisualizerOptions={}){return this.scene.create(this,NodeKind.RefreshVisualizer,options) as RefreshVisualizer;}
  listView<I extends CollectionItem=CollectionItem>(options:CollectionViewOptions<I>={}){return this.scene.create(this,NodeKind.ListView,options) as CollectionView<I>;}
  gridView<I extends CollectionItem=CollectionItem>(options:CollectionViewOptions<I>={}){return this.scene.create(this,NodeKind.GridView,options) as CollectionView<I>;}
  infoBar(options:InfoBarOptions={}){return this.scene.create(this,NodeKind.InfoBar,options) as InfoBar;}
  personPicture(options:PersonPictureOptions={}){return this.scene.create(this,NodeKind.PersonPicture,options) as SceneNode<PersonPictureOptions>;}
  ratingControl(options:RatingControlOptions={}){return this.scene.create(this,NodeKind.RatingControl,options) as RatingControl;}
  splitButton(options:SplitButtonOptions={}){return this.scene.create(this,NodeKind.SplitButton,options) as SplitButton;}
  toggleSplitButton(options:ToggleSplitButtonOptions={}){return this.scene.create(this,NodeKind.ToggleSplitButton,options) as ToggleSplitButton;}
  popup(options:PopupOptions={}) {return this.scene.create(this,NodeKind.Popup,options) as FloatingSurface<PopupOptions>;}
  toolTip(options:ToolTipOptions={}) {return this.scene.create(this,NodeKind.ToolTip,options) as FloatingSurface<ToolTipOptions>;}
  flyout(options:FlyoutOptions={}) {return this.scene.create(this,NodeKind.Flyout,options) as FloatingSurface<FlyoutOptions>;}
  /** Create a stable Rust menu command in this MenuFlyout, MenuBarItem or submenu. */
  menuFlyoutItem(options:MenuFlyoutItemOptions={}){return this.scene.create(this,NodeKind.MenuFlyoutItem,options) as MenuFlyoutItem;}
  toggleMenuFlyoutItem(options:ToggleMenuFlyoutItemOptions={}){return this.scene.create(this,NodeKind.ToggleMenuFlyoutItem,options) as ToggleMenuFlyoutItem;}
  radioMenuFlyoutItem(options:RadioMenuFlyoutItemOptions={}){return this.scene.create(this,NodeKind.RadioMenuFlyoutItem,options) as RadioMenuFlyoutItem;}
  menuFlyoutSubItem(options:MenuFlyoutSubItemOptions={}){return this.scene.create(this,NodeKind.MenuFlyoutSubItem,options) as MenuFlyoutSubItem;}
  menuFlyoutSeparator(options:MenuFlyoutSeparatorOptions={}){return this.scene.create(this,NodeKind.MenuFlyoutSeparator,options) as MenuFlyoutSeparator;}
  menuFlyout(options:MenuFlyoutOptions={}) {return this.scene.create(this,NodeKind.MenuFlyout,options) as FloatingSurface<MenuFlyoutOptions>;}
  slider(options:SliderOptions={}) {return this.scene.create(this,NodeKind.Slider,options) as Slider;}
  border(options: BorderOptions = {}) {
    return this.scene.create(this, NodeKind.Border, options) as Border;
  }
  canvas(options: CanvasOptions = {}) {
    return this.scene.create(this, NodeKind.Canvas, options) as Canvas;
  }
  iconSourceElement(options:IconSourceElementOptions={}) {return this.scene.create(this,NodeKind.IconSourceElement,options) as SceneNode<IconSourceElementOptions>;}
  animatedIcon(options:AnimatedIconOptions={}) {return this.scene.create(this,NodeKind.AnimatedIcon,options) as AnimatedIcon;}
  rectangle(options:RectangleOptions={}){return this.scene.create(this,NodeKind.Rectangle,options) as SceneNode<RectangleOptions>;}
  line(options:LineOptions={}){return this.scene.create(this,NodeKind.Line,options) as SceneNode<LineOptions>;}
  path(options:PathOptions={}){return this.scene.create(this,NodeKind.Path,options) as SceneNode<PathOptions>;}
  polygon(options:PolygonOptions={}){return this.scene.create(this,NodeKind.Polygon,options) as SceneNode<PolygonOptions>;}
  polyline(options:PolylineOptions={}){return this.scene.create(this,NodeKind.Polyline,options) as SceneNode<PolylineOptions>;}
  fontIcon(options: FontIconOptions = {}) { return this.scene.create(this, NodeKind.FontIcon, options) as SceneNode<FontIconOptions>; }
  symbolIcon(options: SymbolIconOptions = {}) { return this.scene.create(this, NodeKind.SymbolIcon, options) as SceneNode<SymbolIconOptions>; }
  pathIcon(options: PathIconOptions = {}) { return this.scene.create(this, NodeKind.PathIcon, options) as SceneNode<PathIconOptions>; }
  bitmapIcon(options: BitmapIconOptions = {}) { return this.scene.create(this, NodeKind.BitmapIcon, options) as SceneNode<BitmapIconOptions>; }
  imageIcon(options: ImageIconOptions = {}) { return this.scene.create(this, NodeKind.ImageIcon, options) as SceneNode<ImageIconOptions>; }
  infoBadge(options: InfoBadgeOptions = {}) {
    return this.scene.create(
      this,
      NodeKind.InfoBadge,
      options,
    ) as SceneNode<InfoBadgeOptions>;
  }
  viewbox(options: ViewboxOptions = {}) {
    return this.scene.create(this, NodeKind.Viewbox, options) as Viewbox;
  }
  grid(options: PanelOptions = {}) {
    return this.scene.create(this, NodeKind.Grid, options) as Panel;
  }
  stack(options: PanelOptions = {}) {
    return this.scene.create(this, NodeKind.StackPanel, options) as Panel;
  }
  text(options: TextOptions = {}) {
    return this.scene.create(
      this,
      NodeKind.TextBlock,
      options,
    ) as SceneNode<TextOptions>;
  }
  progressBar(options: ProgressBarOptions = {}) {
    return this.scene.create(
      this,
      NodeKind.ProgressBar,
      options,
    ) as ProgressBar;
  }
  progressRing(options: ProgressRingOptions = {}) {
    return this.scene.create(
      this,
      NodeKind.ProgressRing,
      options,
    ) as ProgressRing;
  }
  ellipse(options: LayoutOptions = {}) {
    return this.scene.create(this, NodeKind.Ellipse, options);
  }
  image(options: ImageOptions) {
    return this.scene.create(
      this,
      NodeKind.Image,
      options,
    ) as SceneNode<ImageOptions>;
  }
}
export class Viewbox extends Container<ViewboxOptions> {}
export class Panel<T extends PanelOptions = PanelOptions> extends Container<T> {
  expander(options: ExpanderOptions = {}) {
    return this.scene.create(this, NodeKind.Expander, options) as Expander;
  }
  hyperlinkButton(options: HyperlinkButtonOptions = {}) {
    return this.scene.create(
      this,
      NodeKind.HyperlinkButton,
      options,
    ) as HyperlinkButton;
  }
  repeatButton(options: RepeatButtonOptions = {}) {
    return this.scene.create(
      this,
      NodeKind.RepeatButton,
      options,
    ) as RepeatButton;
  }
  toggleButton(options: ToggleOptions = {}) {
    return this.scene.create(
      this,
      NodeKind.ToggleButton,
      options,
    ) as ToggleButton;
  }
  richEditBox(options: RichEditBoxOptions = {}) {
    return this.scene.create(this,NodeKind.RichEditBox,options) as RichEditBox;
  }
  textBox(options: TextBoxOptions = {}) {
    return this.scene.create(this, NodeKind.TextBox, options) as TextBox;
  }
  passwordBox(options: PasswordBoxOptions = {}) {
    return this.scene.create(
      this,
      NodeKind.PasswordBox,
      options,
    ) as PasswordBox;
  }
  scrollView(options:ScrollViewOptions={}){return this.scene.create(this,NodeKind.ScrollView,options) as ScrollView;}
  swipeControl(options:SwipeControlOptions={}){return this.scene.create(this,NodeKind.SwipeControl,options) as SwipeControl;}
  scrollViewer(options: ScrollViewerOptions = {}) {
    return this.scene.create(
      this,
      NodeKind.ScrollViewer,
      options,
    ) as ScrollViewer;
  }
  radioButton(options: RadioOptions = {}) {
    return this.scene.create(
      this,
      NodeKind.RadioButton,
      options,
    ) as RadioButton;
  }
  radioButtons(options: RadioButtonsOptions = {}) {
    return this.scene.create(
      this,
      NodeKind.RadioButtons,
      options,
    ) as RadioButtons;
  }
  toggleSwitch(options: ToggleSwitchOptions = {}) {
    return this.scene.create(
      this,
      NodeKind.ToggleSwitch,
      options,
    ) as ToggleSwitch;
  }
  checkBox(options: ToggleOptions = {}) {
    return this.scene.create(this, NodeKind.CheckBox, options) as CheckBox;
  }
  button(options: ButtonOptions = {}) {
    return this.scene.create(this, NodeKind.Button, options) as Button;
  }
  /** Create a real NavigationViewItem, for example in a PaneFooter slot. */
  navigationViewItem(options:NavigationViewItemOptions={}){return this.scene.create(this,NodeKind.NavigationViewItem,options) as NavigationViewItem;}
  navigationView(
    options: NavigationViewOptions = {},
    layout: LayoutOptions = {},
  ) {
    return this.scene.create(this, NodeKind.NavigationView, {
      ...layout,
      navigation: options,
    }) as SceneNavigationView;
  }

}
export class Button<
  T extends ButtonOptions = ButtonOptions,
> extends Container<T> {
  /** Associate a Flyout/MenuFlyout. Rust opens it on pointer, keyboard or invoke(). */
  setFlyout(flyout:FloatingSurface<PopupOptions>|string|null) {
    if(typeof flyout!=='string')flyout?.assertOwned(this.scene);
    if(flyout&&typeof flyout!=='string'&&![NodeKind.Flyout,NodeKind.MenuFlyout,NodeKind.CommandBarFlyout].includes(flyout.kind))throw new TypeError('Button needs a Flyout or MenuFlyout');
    this.scene.patch(this,nodeReferencePatch(this.scene,'flyoutTarget',flyout));
  }
  /** Receive a pointer or keyboard context request from the Rust input tree. */
  onContextRequested(callback: (event: SceneEvent) => void) { return this.on(EventKind.ContextRequested, callback); }
  onClick(callback: (event: SceneEvent) => void) {
    return this.on(EventKind.Click, callback);
  }
  invoke() {
    this.scene.input(this, { kind: "invoke", id: identity(this) });
  }
}
export class RepeatButton extends Button<RepeatButtonOptions> {}
/** Typed template slot. Rust owns creation/recycling; descendants use normal SDK factories. */
export class CollectionItemContainer extends Panel {
  clearContent(){if(!this.isDisposed)this.scene.clearCollectionContent(this);}
  override dispose(){if(!this.isDisposed)throw new Error('The collection owns item containers; dispose its content or the collection instead');}
}
export class CollectionView<T extends CollectionItem=CollectionItem> extends SceneNode<CollectionViewOptions<T>> {
  /** Native nonselectable header, measured and scrolled by Rust. */ header(){return this.scene.collectionHeader(this);}
  /** @internal */ clientItems:readonly T[]=[];
  private clientSelection:readonly string[]=[];
  /** @internal */ clientGroups:readonly CollectionGroup<T>[]=[];
  /** @internal */ setClientGroups(groups:readonly CollectionGroup[]){this.clientGroups=groups as readonly CollectionGroup<T>[];}
  private itemMap=new Map<string,T>();
  private releaseTemplate:(()=>void)|undefined;
  /** @internal */ setClientItems(items:readonly CollectionItem[]){this.clientItems=items as readonly T[];this.itemMap=new Map(normalizeCollection(items).map((d,i)=>[d.id,this.clientItems[i]]));}
  /** @internal */ setClientSelection(keys:readonly string[]){this.clientSelection=keys;}
  /** @internal */ itemForKey(key:string){return this.itemMap.get(key);}
  override get properties():Readonly<CollectionViewOptions<T>> {return this.clientGroups.length?{...super.properties,groups:this.clientGroups}:{...super.properties,items:this.clientItems};}
  /** @internal */ driveDrag(input:object){return this.scene.collectionInput(this,input);}
  /** @internal */ businessEntries(){return this.itemMap.entries();}
  /** @internal */ applyRustItems(pool:Map<string,CollectionItem>){const p=this.scene.read(this) as {collectionItems:{id:string;group?:string}[];selectedKeys:string[]};this.setClientSelection(p.selectedKeys);const items=p.collectionItems.map(d=>{const item=this.itemMap.get(d.id)??pool.get(d.id);if(item===undefined)throw new Error('Missing collection business object '+d.id);return item as T;});this.clientItems=items;this.itemMap=new Map(p.collectionItems.map((d,i)=>[d.id,items[i]]));if(this.clientGroups.length)this.clientGroups=this.clientGroups.map(g=>({...g,items:p.collectionItems.flatMap((d,i)=>d.group===g.id?[items[i]]:[])}));}
  /** Atomic stable-ID reorder; insertionIndex refers to a gap in the original source. */
  reorder(keys:readonly string[],insertionIndex:number){this.scene.collectionInput(this,{kind:'collectionReorder',id:identity(this),keys,index:insertionIndex});}
  /** Request incremental pages while Rust reports that more data is needed. */
  onLoadMore(load:(request:{startIndex:number;count:number;signal:AbortSignal})=>Promise<{items:readonly T[];hasMoreItems:boolean}>){
    let pending:AbortController|undefined;const off=this.on(EventKind.IncrementalLoadRequested,e=>{if(pending)return;const request=new AbortController();pending=request;const source=this.clientItems;this.update({isLoading:true});Promise.resolve().then(()=>load({startIndex:e.collection!.index,count:e.collection!.count,signal:request.signal})).then(page=>{if(!request.signal.aborted&&!this.isDisposed&&this.clientItems===source)this.update({items:[...source,...page.items],hasMoreItems:page.hasMoreItems,isLoading:false});}).catch(error=>{if(!request.signal.aborted)reportError(error);}).finally(()=>{if(pending===request)pending=undefined;if(!request.signal.aborted&&!this.isDisposed&&this.properties.isLoading)this.update({isLoading:false});});});const release=()=>{off();pending?.abort();pending=undefined;};this.loadReleases.add(release);return()=>{this.loadReleases.delete(release);release();};
  }
  private loadReleases=new Set<()=>void>();
  remove(keys:readonly string[]){this.scene.collectionInput(this,{kind:'collectionRemove',id:identity(this),keys});}
  onItemsChanged(callback:(event:CollectionItemsChangedEvent<T>)=>void){return this.on(EventKind.ItemsChanged,e=>callback({...e,items:this.clientItems,groups:this.clientGroups,reason:e.collection!.reason}));}
  /** Use for starting, over, drop and completed notifications. */
  onDrag(kind:EventKind.DragItemsStarting|EventKind.DragOver|EventKind.Drop|EventKind.DragItemsCompleted,callback:(event:CollectionDragEvent<T>)=>void){return this.on(kind,e=>{const pool=collectionTransfer?.pool??this.itemMap;const event=Object.assign(e,{items:(e as Partial<CollectionDragEvent<T>>).items??e.collection!.keys.flatMap(k=>{const item=pool.get(k);return item===undefined?[]:[item as T];}),insertIndex:e.collection!.index,acceptedOperation:e.collection!.operation});callback(event);});}
  get selectedKeys():readonly string[]{return this.clientSelection;}
  get selectedItems():readonly T[]{return this.selectedKeys.flatMap(k=>{const item=this.itemMap.get(k);return item===undefined?[]:[item];});}
  get view(){return this.snapshot.scroll!;}
  changeView(view:Omit<ViewChange,'zoomFactor'>){this.scene.input(this,{kind:'scroll',id:identity(this),x:view.horizontalOffset??null,y:view.verticalOffset??null,zoom:null,animated:!view.disableAnimation});}
  saveScrollPosition(){return this.snapshot.collection?.scrollPosition??null;}
  restoreScrollPosition(position:CollectionScrollPosition){this.scene.collectionInput(this,{kind:"collectionRestore",id:identity(this),...position});}
  onViewChanged(callback:(event:SceneEvent)=>void){return this.on(EventKind.ViewChanged,callback);}
  realizedItems(){return this.scene.collectionRealization(this);}
  realizedGroups(){return this.scene.collectionGroupRealization(this);}

  onRealizedChanged(callback:(items:readonly CollectionRealization<T>[])=>void){return this.on(EventKind.RealizationChanged,()=>callback(this.realizedItems()));}
  onSelectionChanged(callback:(event:SceneEvent&{selectedKeys:readonly string[];selectedItems:readonly T[]})=>void){return this.on(EventKind.SelectionChanged,e=>callback({...e,selectedKeys:this.selectedKeys,selectedItems:this.selectedItems}));}
  onItemClick(callback:(event:SceneEvent&{item:T})=>void){return this.on(EventKind.ItemClick,e=>{const item=this.clientItems[e.selectedIndex??-1];if(item!==undefined)callback({...e,item});});}
  /** SDK template callback runs for Rust-realized slots; Rust releases descendants on recycle. */
  setItemTemplate(renderer:(item:T,container:CollectionItemContainer)=>void){
    this.releaseTemplate?.();this.scene.patch(this,{hasItemTemplate:true});const prepared=new Map<CollectionItemContainer,T>();
    const sync=()=>{if(this.isDisposed)return;const slots=this.realizedItems();const live=new Set(slots.map(s=>s.container));for(const c of prepared.keys())if(!live.has(c))prepared.delete(c);for(const s of slots)if(!prepared.has(s.container)||prepared.get(s.container)!==s.item){s.container.clearContent();renderer(s.item,s.container);prepared.set(s.container,s.item);}};
    const off=this.onRealizedChanged(sync);sync();const release=()=>{off();if(!this.isDisposed)for(const c of prepared.keys())if(!c.isDisposed)c.clearContent();prepared.clear();if(!this.isDisposed)this.scene.patch(this,{hasItemTemplate:false});};this.releaseTemplate=release;return()=>{if(this.releaseTemplate===release){this.releaseTemplate=undefined;release();}};
  }
  onContextRequested(callback:(event:SceneEvent&{item:T;container:CollectionItemContainer})=>void){return this.on(EventKind.ContextRequested,e=>{const slot=this.realizedItems().find(s=>s.key===e.collection?.keys[0]);if(slot)callback(Object.assign(e,{item:slot.item,container:slot.container}));});}
  /** @internal */ override markDisposed(){if(collectionTransfer?.source===this||collectionTransfer?.target===this){const transfer=collectionTransfer;collectionTransfer=undefined;if(transfer.target&&transfer.target!==this&&!transfer.target.isDisposed)transfer.target.driveDrag({kind:'collectionDragLeave',id:identity(transfer.target)});}super.markDisposed();for(const release of this.loadReleases)release();this.loadReleases.clear();this.releaseTemplate?.();this.releaseTemplate=undefined;this.clientItems=[];this.clientSelection=[];this.itemMap.clear();}
  scrollIntoView(key:string){const index=normalizeCollection(this.clientItems).findIndex(i=>i.id===key);if(index<0)throw new Error('Unknown collection item');this.scene.input(this,{kind:'collectionScroll',id:identity(this),index});}
}
type NavigationRole='content'|'header'|'stripHeader'|'stripFooter';
type NavigationTemplateRecord<T>={render?:((item:T,slot:NavigationTemplateSlot)=>void);prepared:Map<string,{item:T;slot:NavigationTemplateSlot}>};
/** Shared data/template bridge; state and geometry remain in Rust. */
export class NavigationControl<O extends LayoutOptions=LayoutOptions,T extends NavigationData=NavigationData> extends SceneNode<O> {
 private selectedIndexValue=-1;
 protected selectedPageIndexValue=0;
 protected clientNavigationItems:readonly T[]=[];
 protected navigationMetadata:readonly NavigationMetadata[]=[];
 protected navigationMap=new Map<string,T>();
 private templates=new Map<NavigationRole,NavigationTemplateRecord<T>>();
 private templateListeners=new Set<()=>void>();
 private sourceRevision=0;
 private templateSignature='';
 get items():readonly T[]{return this.clientNavigationItems;}
 /** @internal */ setClientNavigationItems(items:readonly NavigationData[]){
  const source=normalizeNavigationDataItems(items,this.kind===NodeKind.TreeView);this.clientNavigationItems=items as readonly T[];this.navigationMetadata=source.metadata;this.navigationMap=new Map(source.metadata.map((m,i)=>[m.id,source.flat[i] as T]));this.sourceRevision++;
  this.selectedIndexValue=items.length?Math.max(0,Math.min(items.length-1,this.selectedIndexValue)):-1;
 }
 /** @internal */ itemForNavigationKey(key:string){return this.navigationMap.get(key);}
 /** @internal */ navigationEntries(){return this.navigationMap.entries();}
 /** @internal */ metadataForKeys(keys:readonly string[]){return this.navigationMetadata.filter(m=>keys.includes(m.id));}
 override get properties():Readonly<O>{return{...super.properties,items:this.clientNavigationItems};}
 protected command(input:object){return this.scene.navigationInput(this,input);}
 /** @internal */ driveNavigation(input:object){return this.command(input);}
 /** @internal */ teardownNavigation(input:object){this.scene.teardownNavigation(this,input);}
 /** @internal */ applyNavigationItems(data:NavigationEventData,pool:ReadonlyMap<string,NavigationData>){
  if(!data.order)return;const items=data.order.map(key=>{const item=this.navigationMap.get(key)??pool.get(key);if(item===undefined)throw new Error('Missing navigation business object '+key);return item as T;});this.setClientNavigationItems(items);
 }
 /** @internal */ navigationEvent(event:SceneEvent):NavigationControlEvent<T>{const data=(event as NavigationControlEvent<T>).navigation??{action:'notification'};const item=data.key?(this.navigationMap.get(data.key)??navigationTransfer?.pool.get(data.key) as T|undefined):undefined;return Object.assign(event,{navigation:data,index:data.index??-1,item});}
 onSelectionChanged(callback:(event:NavigationControlEvent<T>)=>void){return this.on(EventKind.SelectionChanged,e=>callback(this.navigationEvent(e)));}
 onItemsChanged(callback:(event:NavigationItemsChangedEvent<T>)=>void){return this.on(EventKind.ItemsChanged,e=>callback(Object.assign(this.navigationEvent(e),{items:this.items})));}
 /** @internal */ setClientNavigationSelection(index:number,page:number){this.selectedIndexValue=index;this.selectedPageIndexValue=page;}
 get selectedIndex(){return this.selectedIndexValue;}
 get selectedItem():T|undefined{return this.clientNavigationItems[this.selectedIndex];}
 select(index:number){this.command({action:'choose',index});}
 next(){this.command({action:'step',direction:1});}
 previous(){this.command({action:'step',direction:-1});}
 private registerTemplate(role:NavigationRole,render?:((item:T,slot:NavigationTemplateSlot)=>void)){
  this.releaseTemplate(role);const record:NavigationTemplateRecord<T>={render,prepared:new Map()};this.templates.set(role,record);this.scene.requestNavigationTemplates();
  return()=>{if(this.templates.get(role)===record)this.releaseTemplate(role);};
 }
 private releaseTemplate(role:NavigationRole){
  const record=this.templates.get(role);if(!record)return;this.templates.delete(role);
  if(!this.isDisposed)for(const {slot} of record.prepared.values())if(!slot.container.isDisposed)this.scene.remove(slot.container);
  record.prepared.clear();this.templateSignature='';
 }
 /** SDK template with ordinary factories and automatic slot recycling. */
 setItemTemplate(renderer:(item:T,slot:NavigationTemplateSlot)=>void){return this.registerTemplate(this.kind===NodeKind.BreadcrumbBar?'header':'content',renderer);}
 setHeaderTemplate(renderer:(item:T,slot:NavigationTemplateSlot)=>void){return this.registerTemplate('header',renderer);}
 setStripHeader(renderer:(slot:NavigationTemplateSlot)=>void){return this.registerTemplate('stripHeader',(_,slot)=>renderer(slot));}
 setStripFooter(renderer:(slot:NavigationTemplateSlot)=>void){return this.registerTemplate('stripFooter',(_,slot)=>renderer(slot));}
 /** @internal */ attachReactTemplate(role:NavigationRole){return this.registerTemplate(role);}
 /** @internal */ templateSlots(role:NavigationRole){return[...this.templates.get(role)?.prepared.values()??[]];}
 /** @internal */ onTemplateSlotsChanged(callback:()=>void){this.templateListeners.add(callback);return()=>this.templateListeners.delete(callback);}
 /** @internal */ syncNavigationTemplates(snapshot:NavigationControlSnapshot){
  if(this.isDisposed)return;
  let changed=false;
  for(const [role,record] of this.templates){
   const candidates=role==='stripHeader'||role==='stripFooter'?[{key:`__${role}`,index:0}]:role==='content'&&this.kind===NodeKind.TabView?this.navigationMetadata[snapshot.selectedIndex]?[{key:this.navigationMetadata[snapshot.selectedIndex].id,index:snapshot.selectedIndex}]:[]:snapshot.parts.filter(p=>role==='header'?p.role===(this.kind===NodeKind.TabView?'tab':'breadcrumb'):p.role==='page').map(p=>({key:p.key,index:p.index}));
   const live=new Set(candidates.map(p=>p.key));for(const [key,entry] of record.prepared)if(entry.slot.container.isDisposed||!live.has(key)&&this.kind===NodeKind.FlipView){record.prepared.delete(key);changed=true;}
   for(const {key,index} of candidates){const item=this.navigationMap.get(key)??this.clientNavigationItems[index];const old=record.prepared.get(key);if(old&&!old.slot.container.isDisposed&&old.item===item)continue;
    const container=this.scene.navigationSlot(this,key,role);const slot={id:identity(container),itemKey:key,index,container};if(old&&record.render)this.scene.clearNavigationContent(container);record.render?.(item!,slot);record.prepared.set(key,{item:item!,slot});changed=true;
   }
  }
  const signature=`${this.sourceRevision}:${snapshot.selectedIndex}:`+[...this.templates].flatMap(([role,r])=>[...r.prepared].map(([key,e])=>`${role}:${key}:${identity(e.slot.container)}`)).join('|');
  if(changed||signature!==this.templateSignature){this.templateSignature=signature;for(const listener of this.templateListeners)listener();}
 }
 override markDisposed(){const transfer=navigationTransfer;const owner=this as SceneNode;if(transfer&&(transfer.source as SceneNode===owner||transfer.target as SceneNode|undefined===owner)){navigationTransfer=undefined;if(transfer.target&&transfer.target as SceneNode!==owner&&!transfer.target.isDisposed)transfer.target.teardownNavigation({action:'clearOffer'});if(transfer.source as SceneNode!==owner&&!transfer.source.isDisposed)transfer.source.teardownNavigation({action:'dragEnd'});}super.markDisposed();for(const role of [...this.templates.keys()])this.releaseTemplate(role);this.templateListeners.clear();this.navigationMap.clear();this.clientNavigationItems=[];}
}
export class FlipView<T extends NavigationData=NavigationData> extends NavigationControl<FlipViewOptions<T>,T>{}
export class BreadcrumbBar<T extends NavigationData=NavigationData> extends NavigationControl<BreadcrumbBarOptions<T>,T>{
 onItemClicked(callback:(event:NavigationControlEvent<T>)=>void){return this.on(EventKind.ItemClick,e=>callback(this.navigationEvent(e)));}
 openOverflow(){this.command({action:'openOverflow'});}
}
export class PipsPager extends NavigationControl<PipsPagerOptions>{
 onSelectedIndexChanged(callback:(event:NavigationControlEvent)=>void){return this.on(EventKind.SelectedIndexChanged,e=>callback(this.navigationEvent(e)));}
 get selectedPageIndex(){return this.selectedPageIndexValue;}
}
export class TabView<T extends TabItem=TabItem> extends NavigationControl<TabViewOptions<T>,T>{
 onTabCloseRequested(callback:(event:NavigationControlEvent<T>)=>void){return this.on(EventKind.TabCloseRequested,e=>callback(this.navigationEvent(e)));}
 onAddTabButtonClick(callback:(event:NavigationControlEvent<T>)=>void){return this.on(EventKind.AddTabButtonClick,e=>callback(this.navigationEvent(e)));}
 onTabDroppedOutside(callback:(event:NavigationControlEvent<T>)=>void){return this.on(EventKind.TabDroppedOutside,e=>callback(this.navigationEvent(e)));}
 requestClose(index=this.selectedIndex){this.command({action:'close',index});}
}
export class TreeView<T extends TreeItem=TreeItem> extends NavigationControl<TreeViewOptions<T>,T>{
 /** Current realized row metadata; empty before the initial layout. */ treeRows(){return this.scene.navigationSnapshot(this)?.treeRows??[];}
 /** A borrowed collection facade uses the same Rust handle and realized containers. */
 readonly itemsView:CollectionView<T>;
 constructor(scene:Scene,id:number,kind:NodeKind){super(scene,id,kind);this.itemsView=new CollectionView<T>(scene,id,kind);}
 override setClientNavigationItems(items:readonly NavigationData[]){super.setClientNavigationItems(items);this.itemsView.setClientItems(normalizeNavigationDataItems(items,true).flat);}
 override applyNavigationItems(data:NavigationEventData,pool:ReadonlyMap<string,NavigationData>){
  if(!data.order||!data.parents)return;const parents=data.parents;const children=new Map<string|null,string[]>();
  for(const key of data.order){const parent=parents[key]??null;let list=children.get(parent);if(!list)children.set(parent,list=[]);list.push(key);}
  const build=(key:string):T=>{const item=this.navigationMap.get(key)??pool.get(key);if(!item||typeof item==='string')throw new Error('Missing tree business object '+key);const next=(children.get(key)??[]).map(build);const old=(item as TreeItem).children??[];return next.length===old.length&&next.every((v,i)=>v===old[i])?item as T:Object.assign(Object.create(Object.getPrototypeOf(item)),item,{children:next}) as T;};
  this.setClientNavigationItems((children.get(null)??[]).map(build));
 }
 expand(key:string){this.command({action:'expand',key,expanded:true});}
 collapse(key:string){this.command({action:'expand',key,expanded:false});}
 selectNode(key:string){this.command({action:'selectNode',key});}
 scrollIntoView(key:string){this.command({action:'focusNode',key});}
 reparent(keys:readonly string[],parent:string|null,before:string|null=null){this.command({action:'reparent',keys,parent,before});}
 override get selectedItem(){return this.selectedItems[0];}
 get selectedKeys(){return this.itemsView.selectedKeys;}
 get selectedItems(){return this.itemsView.selectedItems;}
 realizedItems(){return this.itemsView.realizedItems();}
 override setItemTemplate(renderer:(item:T,slot:NavigationTemplateSlot)=>void){return this.itemsView.setItemTemplate((item,container)=>renderer(item,{id:identity(container),container,itemKey:container.snapshot.props.collectionKey!,index:container.snapshot.props.collectionIndex!}));}
 onItemInvoked(callback:(event:NavigationControlEvent<T>)=>void){return this.on(EventKind.ItemInvoked,e=>callback(this.navigationEvent(e)));}
 onExpanding(callback:(event:NavigationControlEvent<T>)=>void){return this.on(EventKind.Expanding,e=>callback(this.navigationEvent(e)));}
 onCollapsed(callback:(event:NavigationControlEvent<T>)=>void){return this.on(EventKind.Collapsed,e=>callback(this.navigationEvent(e)));}
 override markDisposed(){super.markDisposed();this.itemsView.markDisposed();}
}
export class InfoBar extends Panel<InfoBarOptions> {
  close(){this.scene.input(this,{kind:'infoBarClose',id:identity(this)});}
  /** Create the native action slot with the compact action-button defaults. */
  actionButton(options:ButtonOptions={}){return this.scene.create(this,NodeKind.Button,{minWidth:96,minHeight:24,padding:[8,0,8,1],...options,isInfoBarAction:true}) as Button;}
}
export class RatingControl extends SceneNode<RatingControlOptions> {
  onValueChanged(callback:(event:SceneEvent)=>void){return this.on(EventKind.ValueChanged,callback);}
}
export class SplitButton<T extends SplitButtonOptions=SplitButtonOptions> extends Button<T> {
  /** Bind an existing same-scene flyout. A nested Flyout/MenuFlyout binds automatically. */
  setFlyout(flyout:FloatingSurface<PopupOptions>|string|null){if(typeof flyout!=='string')flyout?.assertOwned(this.scene);if(flyout&&typeof flyout!=='string'&&flyout.kind!==NodeKind.Flyout&&flyout.kind!==NodeKind.MenuFlyout)throw new TypeError('SplitButton needs a Flyout or MenuFlyout');this.scene.patch(this,nodeReferencePatch(this.scene,'flyoutTarget',flyout));}
  openFlyout(){this.scene.input(this,{kind:'splitInvoke',id:identity(this),secondary:true});}
}
export class ToggleSplitButton extends SplitButton<ToggleSplitButtonOptions> {
  onIsCheckedChanged(callback:(event:SceneEvent)=>void){return this.on(EventKind.IsCheckedChanged,callback);}
}
export class ToggleButton<
  T extends ToggleOptions = ToggleOptions,
> extends Container<T> {
  onClick(callback: (event: SceneEvent) => void) {
    return this.on(EventKind.Click, callback);
  }
  /** All three state notifications; programmatic state changes also notify. */
  onCheckedChanged(callback: (event: SceneEvent) => void) {
    const offs = [
      EventKind.Checked,
      EventKind.Unchecked,
      EventKind.Indeterminate,
    ].map((kind) => this.on(kind, callback));
    return () => offs.forEach((off) => off());
  }
  invoke() {
    this.scene.input(this, { kind: "invoke", id: identity(this) });
  }
}
export class CheckBox extends ToggleButton {}
export interface NavigationViewItemOptions extends TextOptions {
 /** Optional native icon source. */ iconSource?:IconSource;
 /** Default false. Selection is normally controlled by the owning NavigationView. */ isSelected?:boolean;
}
export class NavigationViewItem extends Button<NavigationViewItemOptions>{}
export class SceneNavigationView extends Panel<
  LayoutOptions & { navigation?: NavigationViewOptions }
> {
  /** A common public controller shape for standalone and composed navigation. */
  asView(){return NavigationViewHost.fromScene(this.scene,this);}
  /** The current source-traced Rust navigation state. */
  get navigation():Readonly<NavigationSnapshot>{return this.scene.selectNodeSnapshot(this,n=>n.navigation!);}
  onSnapshot(callback:(snapshot:Readonly<NavigationSnapshot>)=>void){return this.scene.observeNodeSnapshot(this,n=>n.navigation!,callback);}
  /** Stable Rust-owned content slot. Content moves between Top/Left presenters. */
  slot(slot:import('./enums').NavigationViewSlot):Panel{return this.scene.navigationViewSlot(this,slot);}
  get content(){return this.slot(NavigationViewSlot.Content);}
  configure(options: NavigationViewOptions) {
    this.update({ navigation: options });
  }
  invoke(id: string) {
    this.scene.input(this, {
      kind: "navigation",
      id: identity(this),
      input: { kind: "invoke", id },
    });
  }
  setExpanded(id: string, expanded: boolean) {
    this.scene.input(this, {
      kind: "navigation",
      id: identity(this),
      input: { kind: "expand", id, expanded },
    });
  }
}

export class RadioButton extends ToggleButton<RadioOptions> {}
export class RadioButtons extends SceneNode<RadioButtonsOptions> {
  onSelectionChanged(callback: (event: SceneEvent) => void) {
    return this.on(EventKind.SelectionChanged, callback);
  }
  get selectedItem() {
    return this.properties.items?.[this.properties.selectedIndex ?? -1] ?? null;
  }
}
/** Shared floating-surface controller; target methods validate Scene ownership. */
/** Rust-owned menu command. Click follows any checked-state notification. */
export class MenuFlyoutItem<T extends MenuFlyoutItemOptions=MenuFlyoutItemOptions> extends SceneNode<T> {
 onClick(callback:(event:SceneEvent)=>void){return this.on(EventKind.Click,callback);}
}
export class ToggleMenuFlyoutItem<T extends ToggleMenuFlyoutItemOptions=ToggleMenuFlyoutItemOptions> extends MenuFlyoutItem<T> {
 onIsCheckedChanged(callback:(event:SceneEvent)=>void){return this.on(EventKind.IsCheckedChanged,callback);}
}
export class RadioMenuFlyoutItem extends ToggleMenuFlyoutItem<RadioMenuFlyoutItemOptions> {}
export class MenuFlyoutSubItem extends Panel<MenuFlyoutSubItemOptions> {}
export class MenuFlyoutSeparator extends SceneNode<MenuFlyoutSeparatorOptions> {}
export class FloatingSurface<T extends PopupOptions=PopupOptions> extends Panel<T> {
  /** Attach to a live control; null restores parent-relative coordinates. */
  attachTo(target:SceneNode|string|null) {this.scene.patch(this,nodeReferencePatch(this.scene,'placementTarget',target));}
  /** Attach and show. */
  showAt(target:SceneNode,position?:{x:number;y:number}) {target.assertOwned(this.scene);this.scene.patch(this,{placementTarget:identity(target),placementPosition:position?[position.x,position.y]:null,isOpen:true});}
  show() {this.scene.patch(this,{isOpen:true});}
  /** Cancellable for Flyout/MenuFlyout. Popup/ToolTip close immediately. */
  hide() {this.scene.input(this,{kind:'closeOverlay',id:identity(this)});}
}
export class Slider extends SceneNode<SliderOptions> {
  onValueChanged(callback:(event:SceneEvent)=>void) {return this.on(EventKind.ValueChanged,callback);}
}
export class Border extends Panel<BorderOptions> {}
export class Canvas extends Panel<CanvasOptions> {}
export class Expander extends Panel<ExpanderOptions> {
  private headerSlot?: Panel;
  /** Rust-arranged Header content. The body remains a separate single content child. */
  get headerContent(): Panel {
    if (!this.headerSlot || this.headerSlot.isDisposed)
      this.headerSlot = this.scene.create(this, NodeKind.Grid, { isExpanderHeader: true }) as Panel;
    return this.headerSlot;
  }
  /** Mount browser content inside the existing Expander's Rust-arranged content
   * slot. The host reports natural height; Rust owns expansion, geometry and clip.
   * Dispose the returned binding before mounting a replacement. */
  setContentHost(element:HTMLElement):()=>void {
    const slot=this.border({height:0,horizontalAlignment:HorizontalAlignment.Stretch});
    return this.scene.attachContentHost(slot,element);
  }
  onExpanding(callback: (e: SceneEvent) => void) {
    return this.on(EventKind.Expanding, callback);
  }
  onCollapsed(callback: (e: SceneEvent) => void) {
    return this.on(EventKind.Collapsed, callback);
  }
}
export class HyperlinkButton extends Button<HyperlinkButtonOptions> {}
export class ProgressBar extends SceneNode<ProgressBarOptions> {
  onValueChanged(callback: (event: SceneEvent) => void) {
    return this.on(EventKind.ValueChanged, callback);
  }
}
export class ProgressRing extends SceneNode<ProgressRingOptions> {}
export class ToggleSwitch extends SceneNode<ToggleSwitchOptions> {
  onToggled(callback: (event: SceneEvent) => void) {
    return this.on(EventKind.Toggled, callback);
  }
  toggle() {
    this.scene.input(this, { kind: "invoke", id: identity(this) });
  }
}

export class TextBox<O extends TextBoxOptions=TextBoxOptions> extends SceneNode<O> {
  onTextChanged(callback: (event: SceneEvent) => void) {
    return this.on(EventKind.TextChanged, callback);
  }
  onSelectionChanged(callback: (event: SceneEvent) => void) {
    return this.on(EventKind.SelectionChanged, callback);
  }
  select(start: number, length: number) {
    this.scene.input(this, {
      kind: "select",
      id: identity(this),
      start,
      length,
    });
  }
  selectAll() {
    this.scene.input(this, {
      kind: "editCommand",
      id: identity(this),
      command: "selectAll",
    });
  }
  undo() {
    this.scene.input(this, {
      kind: "editCommand",
      id: identity(this),
      command: "undo",
    });
  }
  redo() {
    this.scene.input(this, {
      kind: "editCommand",
      id: identity(this),
      command: "redo",
    });
  }
  get canUndo() {
    return this.snapshot.editor?.canUndo ?? false;
  }
  get canRedo() {
    return this.snapshot.editor?.canRedo ?? false;
  }
}
/** Editable rich document. Every mutation is executed by the Rust scene. */
export class RichEditBox extends TextBox<RichEditBoxOptions> {
  /** A detached, serializable document snapshot; LF separates paragraphs. */
  get document(): RichEditDocument { return this.properties.document ?? {runs:[]}; }
  get text(): string { return this.properties.text ?? ''; }
  get characterFormat(): RichCharacterFormat { return this.snapshot.editor!.characterFormat; }
  setDocument(document: RichEditDocument) { this.update({document}); }
  setText(text:string) { this.update({text}); }
  /** Import an RTF string or original file bytes. Parsing is atomic and undoable. */
  loadRtf(rtf:string|Uint8Array) {this.scene.input(this,{kind:'richEdit',id:identity(this),command:typeof rtf==='string'?{action:'loadRtf',rtf}:{action:'loadRtfBytes',bytes:Array.from(rtf)}});}
  /** Serialize character/paragraph formats, PNG/JPEG images and supported OfficeMath. */
  getRtf():string {return this.scene.richExport(this,false);}
  getSelectedDocument():RichEditDocument {return this.scene.richSelection(this);}
  getSelectedRtf():string {return this.scene.richExport(this,false,true);}
  replaceSelectedDocument(document:RichEditDocument) {this.scene.input(this,{kind:"richEdit",id:identity(this),command:{action:"replaceDocument",document}});}
  insertRtf(rtf:string) {this.scene.input(this,{kind:'richEdit',id:identity(this),command:{action:'insertRtf',rtf}});}
  insertImage(image:RichImageSource) {this.scene.input(this,{kind:'richEdit',id:identity(this),command:{action:'insertImage',image}});}
  setMathML(mathml:string) {this.scene.input(this,{kind:'richEdit',id:identity(this),command:{action:'setMathML',mathml}});}
  insertMathML(mathml:string) {this.scene.input(this,{kind:'richEdit',id:identity(this),command:{action:'insertMathML',mathml}});}
  getMathML():string {return this.scene.richExport(this,true);}

  formatSelection(format:RichCharacterFormat) { this.scene.input(this,{kind:'richEdit',id:identity(this),command:{action:'format',format}}); }
  formatParagraph(format:RichParagraphFormat) { this.scene.input(this,{kind:'richEdit',id:identity(this),command:{action:'paragraph',format}}); }
  replaceSelection(text:string) { this.scene.input(this,{kind:'richEdit',id:identity(this),command:{action:'replace',text}}); }
  toggleBold() { this.scene.input(this,{kind:'richEdit',id:identity(this),command:{action:'toggleBold'}}); }
  toggleItalic() { this.scene.input(this,{kind:'richEdit',id:identity(this),command:{action:'toggleItalic'}}); }
  toggleUnderline() { this.scene.input(this,{kind:'richEdit',id:identity(this),command:{action:'toggleUnderline'}}); }
}
export class PasswordBox extends SceneNode<PasswordBoxOptions> {
  onPasswordChanged(callback: (event: SceneEvent) => void) {
    return this.on(EventKind.PasswordChanged, callback);
  }
  selectAll() {
    this.scene.input(this, {
      kind: "editCommand",
      id: identity(this),
      command: "selectAll",
    });
  }
}
export class ScrollViewer extends Panel<ScrollViewerOptions> {
  /** Bind an empty viewer to platform-owned content. Host feeds do not emit write-back events. */
  setHostMetrics(metrics: HostScrollMetrics, contentId?: string) {
    return this.scene.setScrollHost(this, metrics, contentId);
  }

  changeView(view: ViewChange) {
    this.scene.input(this, {
      kind: "scroll",
      id: identity(this),
      x: view.horizontalOffset ?? null,
      y: view.verticalOffset ?? null,
      zoom: view.zoomFactor ?? null,
      animated: !view.disableAnimation,
    });
  }
  onViewChanged(callback: (event: SceneEvent) => void) {
    return this.on(EventKind.ViewChanged, callback);
  }
  get view() {
    return this.snapshot.scroll!;
  }
}

/** Native marker-driven icon; playback and the bounded queue live in Rust. */
export class AnimatedIcon extends SceneNode<AnimatedIconOptions> {
  setState(state:string) { this.update({state}); }
}

function normalizeComposed(kind:NodeKind,options:object):object{
 const p={...options} as Record<string,unknown>;
 if(kind===NodeKind.NumberBox&&Object.hasOwn(p,'numberFormat')){
   const f=p.numberFormat as import('./composed-types').NumberFormatOptions;
   const formatter=new Intl.NumberFormat(f.locale,{useGrouping:true,maximumFractionDigits:6});
   const parts=formatter.formatToParts(-123456789.5),groups=parts.filter(p=>p.type==='integer').map(p=>p.value.length).reverse();
   p.numberDecimalSeparator=parts.find(p=>p.type==='decimal')?.value??'.';p.numberGroupSeparator=parts.find(p=>p.type==='group')?.value??',';p.numberMinusSign=parts.find(p=>p.type==='minusSign')?.value??'-';
   p.numberGroupSizes=[groups[0]??3,groups[1]??3];p.numberUseGrouping=f.useGrouping??false;p.numberMinFractionDigits=f.minimumFractionDigits??0;p.numberRoundingIncrement=f.roundingIncrement??null;p.numberLocale=formatter.resolvedOptions().locale;
   const digits=new Intl.NumberFormat(f.locale,{useGrouping:false,maximumFractionDigits:0});p.numberDigits=Array.from({length:10},(_,i)=>digits.formatToParts(i).filter(p=>p.type==='integer').map(p=>p.value).join(''));delete p.numberFormat;
 }
 if(kind===NodeKind.NumberBox&&Object.hasOwn(p,'value')){p.numberValue=p.value;delete p.value;}
 if((kind===NodeKind.AutoSuggestBox||kind===NodeKind.ComboBox)&&Object.hasOwn(p,'items')){p.collectionItems=normalizeCollection(p.items as readonly CollectionItem[]);delete p.items;}
 return p;
}
/** Number editor backed by the native source parser and Rust coercion rules. */
export class NumberBox extends SceneNode<NumberBoxOptions>{
 override focus(){this.command('focus');}
 private command(action:string){this.scene.input(this,{kind:'composed',id:identity(this),action});}
 commit(){this.command('submit');} increment(){this.command('increment');} decrement(){this.command('decrement');}
 onValueChanged(callback:(event:ComposedEvent)=>void){return this.on(EventKind.ValueChanged,callback);}
}
export class AutoSuggestBox<T extends CollectionItem=CollectionItem> extends SceneNode<AutoSuggestBoxOptions<T>>{
 private clientItems:readonly T[]=[];
 /** Business source, retaining object identity. */ get items():readonly T[]{return this.clientItems;}
 /** @internal */ setClientItems(items:readonly CollectionItem[]){this.clientItems=items as readonly T[];this.scene.composedItemsChanged(this,items);}
 /** Virtualized template view; its lifetime belongs to the control. */ get itemsView():SuggestionItemsView<T>{return this.scene.composedItems(this,this.clientItems);}

 override focus(){this.scene.input(this,{kind:'composed',id:identity(this),action:'focus'});}
 submit(){this.scene.input(this,{kind:'composed',id:identity(this),action:'submit'});}
 choose(index:number){this.scene.input(this,{kind:'composed',id:identity(this),action:'select',index});}
 onTextChanged(callback:(event:ComposedEvent<T>)=>void){return this.on(EventKind.TextChanged,callback);}
 onSuggestionChosen(callback:(event:ComposedEvent<T>)=>void){return this.on(EventKind.SuggestionChosen,callback);}
 onQuerySubmitted(callback:(event:ComposedEvent<T>)=>void){return this.on(EventKind.QuerySubmitted,callback);}
}
export class ComboBox<T extends CollectionItem=CollectionItem> extends SceneNode<ComboBoxOptions<T>>{
 private clientItems:readonly T[]=[];
 /** Business source, retaining object identity. */ get items():readonly T[]{return this.clientItems;}
 /** @internal */ setClientItems(items:readonly CollectionItem[]){this.clientItems=items as readonly T[];this.scene.composedItemsChanged(this,items);}
 /** Virtualized template view; its lifetime belongs to the control. */ get itemsView():SuggestionItemsView<T>{return this.scene.composedItems(this,this.clientItems);}

 override focus(){this.scene.input(this,{kind:'composed',id:identity(this),action:'focus'});}
 open(){this.scene.input(this,{kind:'composed',id:identity(this),action:'open'});}
 close(){this.scene.input(this,{kind:'composed',id:identity(this),action:'close'});}
 choose(index:number){this.scene.input(this,{kind:'composed',id:identity(this),action:'select',index});}
 submit(){this.scene.input(this,{kind:'composed',id:identity(this),action:'submit'});}
 onSelectionChanged(callback:(event:ComposedEvent<T>)=>void){return this.on(EventKind.SelectionChanged,callback);}
 onTextSubmitted(callback:(event:ComposedEvent<T>)=>void){return this.on(EventKind.TextSubmitted,callback);}
}
/** One active dialog per Scene root. Closing and button clicks support cancellation/deferrals. */
export class ContentDialog extends Panel<ContentDialogOptions>{
 onPrimaryButtonClick(callback:(event:import('./composed-types').ComposedDeferrableEvent)=>void){return this.on(EventKind.PrimaryButtonClick,e=>callback(e as import('./composed-types').ComposedDeferrableEvent));}
 onSecondaryButtonClick(callback:(event:import('./composed-types').ComposedDeferrableEvent)=>void){return this.on(EventKind.SecondaryButtonClick,e=>callback(e as import('./composed-types').ComposedDeferrableEvent));}
 onCloseButtonClick(callback:(event:import('./composed-types').ComposedDeferrableEvent)=>void){return this.on(EventKind.CloseButtonClick,e=>callback(e as import('./composed-types').ComposedDeferrableEvent));}
 onClosing(callback:(event:import('./composed-types').ComposedDeferrableEvent)=>void){return this.on(EventKind.Closing,e=>callback(e as import('./composed-types').ComposedDeferrableEvent));}
 onClosed(callback:(event:ComposedEvent)=>void){return this.on(EventKind.Closed,callback);}
 private completion:((result:ContentDialogResult)=>void)|undefined;
 showAsync():Promise<ContentDialogResult>{
   this.assertOwned(this.scene);if(this.completion)throw new Error('ContentDialog is already showing');
   this.scene.input(this,{kind:'composed',id:identity(this),action:'open'});
   return new Promise(resolve=>{this.completion=resolve;const off=this.on(EventKind.Closed,event=>{off();this.completion=undefined;resolve((event as ComposedEvent).dialogResult??ContentDialogResult.None);});});
 }
 hide(){this.scene.input(this,{kind:'composed',id:identity(this),action:'close'});}
 invoke(button:ContentDialogButton){if(button===ContentDialogButton.None)return;this.scene.input(this,{kind:'composed',id:identity(this),action:button===ContentDialogButton.Primary?'primary':button===ContentDialogButton.Secondary?'secondary':'closeButton'});}
 override markDisposed(){this.completion?.(ContentDialogResult.None);this.completion=undefined;super.markDisposed();}
}
export class TeachingTip extends Panel<TeachingTipOptions>{
 onClosing(callback:(event:import('./composed-types').ComposedDeferrableEvent)=>void){return this.on(EventKind.Closing,e=>callback(e as import('./composed-types').ComposedDeferrableEvent));}
 onActionButtonClick(callback:(event:ComposedEvent)=>void){return this.on(EventKind.ActionButtonClick,callback);}
 onClosed(callback:(event:ComposedEvent)=>void){return this.on(EventKind.Closed,callback);}
 /** Rich hero visual. Its lifetime belongs to this tip. */ get heroContent():Panel{return this.scene.composedContent(this,"heroContent");}
 attachTo(target:SceneNode|string|null){this.scene.patch(this,nodeReferencePatch(this.scene,'placementTarget',target));}
 show(){this.scene.input(this,{kind:'composed',id:identity(this),action:'open'});}
 hide(){this.scene.input(this,{kind:'composed',id:identity(this),action:'close'});}
}

class TemplateContentSlot extends Panel{
 override dispose():void{throw new Error('Content slots are disposed with their owning control');}
 override moveTo():void{throw new Error('Content slots cannot be reparented');}
}

/** Shared collection template/scroll APIs without exposing item-source ownership. */
export type SuggestionItemsView<T extends CollectionItem=CollectionItem>=Pick<CollectionView<T>,'setItemTemplate'|'realizedItems'|'onRealizedChanged'|'onSelectionChanged'|'scrollIntoView'|'onViewChanged'|'changeView'>;

export class AppBarButton<O extends AppBarButtonOptions=AppBarButtonOptions> extends Button<O>{setFlyout(flyout:FloatingSurface<PopupOptions>|string|null){if(typeof flyout!=='string')flyout?.assertOwned(this.scene);this.scene.patch(this,nodeReferencePatch(this.scene,'flyoutTarget',flyout));}openFlyout(){this.invoke();}}
export class AppBarToggleButton extends AppBarButton<AppBarToggleButtonOptions>{onCheckedChanged(callback:(event:SceneEvent)=>void){const releases=[EventKind.Checked,EventKind.Unchecked,EventKind.Indeterminate].map(kind=>this.on(kind,callback));return()=>releases.forEach(off=>off());}}
export class DropDownButton extends Button<DropDownButtonOptions>{setFlyout(flyout:FloatingSurface<PopupOptions>|string|null){if(typeof flyout!=='string')flyout?.assertOwned(this.scene);this.scene.patch(this,nodeReferencePatch(this.scene,'flyoutTarget',flyout));}openFlyout(){this.invoke();}}
export class CommandBar<T extends CommandBarItem=CommandBarItem> extends Panel<CommandBarOptions<T>>{private primary:readonly T[]=[];private secondary:readonly T[]=[];/** @internal */setClientCommands(options:Partial<CommandBarOptions>){if(options.primaryCommands)this.primary=options.primaryCommands as readonly T[];if(options.secondaryCommands)this.secondary=options.secondaryCommands as readonly T[];}open(){this.update({isOpen:true});}close(){this.update({isOpen:false});}onCommandInvoked(callback:(event:CommandBarEvent<T>)=>void){return this.on(EventKind.ItemClick,e=>callback({...e as CommandBarEvent,item:[...this.primary,...this.secondary].find(item=>item.id===(e as CommandBarEvent).command.id)}));}}
export class SelectorBar<T extends NavigationData=NavigationData> extends NavigationControl<SelectorBarOptions<T>,T>{}

/** @internal Comparison retains node identities without serializing the owning Scene. */
export function controlPropertyJSON(value:unknown){return JSON.stringify(value,(_key,v:unknown)=>v instanceof SceneNode?{node:identity(v)}:v);}

/** Native AppBarSeparator template; input and focus are intentionally absent. */
export class AppBarSeparator extends SceneNode<AppBarSeparatorOptions>{}

/** Rust template-owned controls. Civil dates and local-minute times avoid implicit JS timezone conversion. */
export class CalendarView extends SceneNode<CalendarViewOptions>{
 onSelectedDatesChanged(callback:(event:PickerEvent)=>void){return this.on(EventKind.SelectedDatesChanged,callback);}
 onDisplayModeChanged(callback:(event:PickerEvent)=>void){return this.on(EventKind.DisplayModeChanged,callback);}
 setDisplayDate(date:string){this.update({displayDate:date});}
}
export class CalendarDatePicker extends SceneNode<CalendarDatePickerOptions>{
 onDateChanged(callback:(event:PickerEvent)=>void){return this.on(EventKind.DateChanged,callback);}
 open(){this.update({isCalendarOpen:true});} close(){this.update({isCalendarOpen:false});}
}
export class DatePicker extends SceneNode<DatePickerOptions>{
 onDateChanged(callback:(event:PickerEvent)=>void){return this.on(EventKind.DateChanged,callback);}
 onSelectedDateChanged(callback:(event:PickerEvent)=>void){return this.on(EventKind.SelectedDateChanged,callback);}
 open(){this.update({isOpen:true});} close(){this.update({isOpen:false});}
}
export class TimePicker extends SceneNode<TimePickerOptions>{
 onTimeChanged(callback:(event:PickerEvent)=>void){return this.on(EventKind.TimeChanged,callback);}
 onSelectedTimeChanged(callback:(event:PickerEvent)=>void){return this.on(EventKind.SelectedTimeChanged,callback);}
 open(){this.update({isOpen:true});} close(){this.update({isOpen:false});}
}
export class ColorPicker extends SceneNode<ColorPickerOptions>{onColorChanged(callback:(event:PickerEvent)=>void){return this.on(EventKind.ColorChanged,callback);}}

/** Rust owns header switching and the attached MenuFlyout. */
export class MenuBar extends Panel<MenuBarOptions>{onItemInvoked(callback:(event:SceneEvent)=>void){return this.on(EventKind.MenuItemInvoked,callback);}}
export class MenuBarItem extends Panel<MenuBarItemOptions>{open(){this.update({isOpen:true});}close(){this.update({isOpen:false});}invoke(){this.scene.input(this,{kind:'invoke',id:identity(this)});}onItemInvoked(callback:(event:SceneEvent)=>void){return this.on(EventKind.MenuItemInvoked,callback);}}
export class CommandBarFlyout extends FloatingSurface<CommandBarFlyoutOptions>{
 /** Show at a live target. Rust atomically applies mode and placement before opening. */
 override showAt(target:SceneNode,options?:{x:number;y:number}|{showMode?:import('./enums').FlyoutShowMode;placement?:import('./enums').OverlayPlacement}){
  target.assertOwned(this.scene);
  const position=options&&'x' in options?[options.x,options.y]:null;
  const settings=options&&!('x' in options)?options:{};
  this.scene.patch(this,{...settings,placementTarget:identity(target),placementPosition:position,isOpen:true});
 }
 onCommandInvoked(callback:(event:CommandBarEvent)=>void){return this.on(EventKind.ItemClick,event=>callback(event as CommandBarEvent));}
}

/** A Rust-owned realized item slot; all descendants recycle with it. */
export class RepeaterItemContainer extends Panel {
 clearContent(){this.scene.clearCollectionContent(this);}
}
export interface RepeaterRealization<T extends CollectionItem=CollectionItem>{key:string;index:number;item:T;container:RepeaterItemContainer;}
export class ItemsRepeater<T extends CollectionItem=CollectionItem> extends SceneNode<ItemsRepeaterOptions<T>> {
 private clientItems:readonly T[]=[];
 private itemMap=new Map<string,T>();
 private template:((item:T,container:RepeaterItemContainer,index:number)=>void)|undefined;
 private prepared=new Map<RepeaterItemContainer,{item:T;index:number}>();
 /** @internal */ setClientItems(items:readonly CollectionItem[]){this.clientItems=items as readonly T[];this.itemMap=new Map(normalizeCollection(items).map((v,i)=>[v.id,this.clientItems[i]]));}
 /** @internal */ itemForKey(key:string){return this.itemMap.get(key);}
 override get properties():Readonly<ItemsRepeaterOptions<T>>{return {...super.properties,items:this.clientItems};}
 get items(){return this.clientItems;}
 realizedItems():RepeaterRealization<T>[]{return this.scene.repeaterRealization(this);}
 scrollIntoView(index:number){this.scene.input(this,{kind:'repeaterScroll',id:identity(this),index,focus:false});}
 focusItem(index:number){this.scene.input(this,{kind:'repeaterScroll',id:identity(this),index,focus:true});}
 tryGetElement(index:number){return this.realizedItems().find(s=>s.index===index)?.container??null;}
 getElementIndex(element:RepeaterItemContainer){element.assertOwned(this.scene);return this.realizedItems().find(s=>s.container===element)?.index??-1;}
 onRealizedChanged(callback:(items:readonly RepeaterRealization<T>[])=>void){return this.on(EventKind.RealizationChanged,()=>callback(this.realizedItems()));}
 setItemTemplate(renderer:(item:T,container:RepeaterItemContainer,index:number)=>void){this.template=renderer;this.prepared.clear();this.update({hasItemTemplate:true} as ItemsRepeaterOptions<T>);this.syncTemplate();return()=>{if(this.template===renderer){this.template=undefined;this.prepared.clear();if(!this.isDisposed)this.update({hasItemTemplate:false} as ItemsRepeaterOptions<T>);}};}
 /** @internal */ syncTemplate(){if(!this.template)return;const slots=this.realizedItems(),live=new Set(slots.map(s=>s.container));for(const c of this.prepared.keys())if(!live.has(c))this.prepared.delete(c);for(const slot of slots){const prior=this.prepared.get(slot.container);if(!prior||prior.item!==slot.item||prior.index!==slot.index){slot.container.clearContent();this.template(slot.item,slot.container,slot.index);this.prepared.set(slot.container,{item:slot.item,index:slot.index});}}}
 override markDisposed(){this.template=undefined;this.prepared.clear();this.clientItems=[];this.itemMap.clear();super.markDisposed();}
 override dispose(){this.template=undefined;this.prepared.clear();super.dispose();}
}
export class RefreshVisualizer<T extends RefreshVisualizerOptions=RefreshVisualizerOptions> extends Panel<T> {
 get state(){return this.snapshot.refresh?.state;}
 requestRefresh(){this.scene.input(this,{kind:'refresh',id:identity(this),action:'request'});}
 onRefreshRequested(callback:(event:RefreshRequestedEvent)=>void){return this.on(EventKind.RefreshRequested,e=>callback(e as RefreshRequestedEvent));}
 /** Asynchronous convenience; Rust remains Refreshing until the deferral completes. */
 onRefresh(callback:()=>Promise<void>){return this.onRefreshRequested(event=>{const deferral=event.getDeferral();Promise.resolve().then(callback).catch(reportError).finally(()=>deferral.complete());});}
 onRefreshStateChanged(callback:(event:SceneEvent)=>void){return this.on(EventKind.RefreshStateChanged,callback);}
}
export class RefreshContainer extends RefreshVisualizer<RefreshContainerOptions> {
 get visualizer(){return this.scene.refreshVisualizer(this);}
}

/** WinUI SplitView: pane layout, lifecycle, cancellation and light dismiss live in Rust. */
export class SplitView extends Panel<SplitViewOptions>{
 pane(options:PanelOptions={}){return this.scene.create(this,NodeKind.Grid,{...options,viewControls:{slot:ViewControlSlot.Pane}}) as Panel;}
 content(options:PanelOptions={}){return this.scene.create(this,NodeKind.Grid,{...options,viewControls:{slot:ViewControlSlot.Content}}) as Panel;}
 openPane(){this.scene.input(this,{kind:'viewControl',id:identity(this),action:'openPane'});}
 closePane(){this.scene.input(this,{kind:'viewControl',id:identity(this),action:'closePane'});}
 onPaneClosing(callback:(event:SceneEvent)=>void){return this.on(EventKind.PaneClosing,callback);}
}
/** WinUI SemanticZoom: the active subtree and zoom button are Rust-owned. */
export class SemanticZoom extends Panel<SemanticZoomOptions>{
 zoomedInView(options:PanelOptions={}){return this.scene.create(this,NodeKind.Grid,{...options,viewControls:{slot:ViewControlSlot.ZoomedIn}}) as Panel;}
 zoomedOutView(options:PanelOptions={}){return this.scene.create(this,NodeKind.Grid,{...options,viewControls:{slot:ViewControlSlot.ZoomedOut}}) as Panel;}
 toggle(){this.scene.input(this,{kind:'viewControl',id:identity(this),action:'toggleZoom'});}
 /** Switch to details and scroll to a stable collection group key, entirely in Rust. */
 navigateToGroup(key:string){this.scene.input(this,{kind:'viewControl',id:identity(this),action:'navigateToGroup',parameter:key});}
 onViewChangeCompleted(callback:(event:SceneEvent)=>void){return this.on(EventKind.ViewChangeCompleted,callback);}
}
/** WinUI ParallaxView: Rust arranges the child from its scrolling source. */
export class ParallaxView extends Panel<ParallaxViewOptions>{}
/** Implements WinUI XamlUICommand. Public UICommand is platform independent;
 * business actions execute in onExecuteRequested, after Rust's executability check. */
export class UICommand<T extends UICommandOptions=UICommandOptions> extends SceneNode<T>{
 get metadata():Readonly<UICommandMetadata>{return this.scene.commandMetadata(this);}
 /** Read the Rust shared gate. Per-invocation CanExecuteRequested callbacks run during execute(). */
 canExecute(){return this.metadata.canExecute;}
 execute(parameter:unknown=null){this.scene.input(this,{kind:'viewControl',id:identity(this),action:'execute',parameter});}
 notifyCanExecuteChanged(){this.scene.input(this,{kind:'viewControl',id:identity(this),action:'notifyCanExecuteChanged'});}
 onExecuteRequested(callback:(event:UICommandEvent)=>void){return this.on(EventKind.ExecuteRequested,event=>callback(event as UICommandEvent));}
 onCanExecuteRequested(callback:(event:UICommandEvent)=>void){return this.on(EventKind.CanExecuteRequested,event=>callback(event as UICommandEvent));}
 onCanExecuteChanged(callback:(event:SceneEvent)=>void){return this.on(EventKind.CanExecuteChanged,callback);}
}
/** Implements WinUI StandardUICommand, retaining caller metadata overrides when
 * standardKind changes. Presets never perform Save/Copy operations themselves. */
export class StandardCommand extends UICommand<StandardCommandOptions>{}

/** ScrollView's Rust node uses the shared platform-neutral scroll engine. */
export class ScrollView extends ScrollViewer{}
/** Source-traced Rust swipe input and directional command actions. */
export class SwipeControl extends Panel<SwipeControlOptions>{}

export interface ReadingSnapshot {selectionStart?:number;selectionLength?:number;selectedText?:string;start?:number;end?:number;hasOverflowContent?:boolean;labelSlots?:{id:number;index:number}[];detailSlot?:number|null;slots?:Rect[];templateError?:string|null;displayMode?:import('./enums').PagerControlDisplayMode;selectedPageIndex?:number;parts?:{id:number;role:string;index:number}[];thumb?:Rect;rail?:Rect;labels?:[string,Rect][];hoverOffset?:number|null;text?:string;links?:{link:string;text:string;rect:Rect}[];}
/** Shared Rust virtualization and selection engine, with native ItemsView actions. */
export class ItemsView<T extends CollectionItem=CollectionItem> extends CollectionView<T> {
 /** Find the closest item to viewport ratios in 0..1; Rust resolves the layout. */
 tryGetItemIndex(horizontalViewportRatio:number,verticalViewportRatio:number){return this.scene.itemsViewIndex(this,horizontalViewportRatio,verticalViewportRatio);}
 /** Realize and reveal an item using the Rust scroll/layout engine. */
 startBringItemIntoView(index:number){this.scene.input(this,{kind:'collectionScroll',id:identity(this),index});}
 override update(options:Partial<ItemsViewOptions<T>>){super.update(options);}
 override get properties():Readonly<ItemsViewOptions<T>>{return super.properties;}
 private action(action:string,index=0){this.scene.input(this,{kind:'reading',id:identity(this),action,index});}
 select(index:number){this.action('select',index);}deselect(index:number){this.action('deselect',index);}
 selectAll(){this.action('selectAll');}deselectAll(){this.action('deselectAll');}invertSelection(){this.action('invert');}
 isSelected(index:number){const item=this.clientItems[index];if(item===undefined)return false;return this.selectedKeys.includes(normalizeCollection(this.clientItems)[index].id);}
 get currentItemIndex(){const key=this.snapshot.collection?.focusedKey;return normalizeCollection(this.clientItems).findIndex(i=>i.id===key);}
 onItemInvoked(callback:(event:SceneEvent&{item:T})=>void){return this.onItemClick(callback);}
}
/** Rust creates and owns its buttons, NumberBox/ComboBox, page window and coercion. */
export class PagerControl extends SceneNode<PagerControlOptions>{
 get selectedPageIndex(){return this.snapshot.reading?.selectedPageIndex??0;}
 selectPage(index:number){this.scene.input(this,{kind:'reading',id:identity(this),action:'page',index});}
 onSelectedIndexChanged(callback:(event:PagerIndexChangedEvent)=>void){return this.on(EventKind.SelectedIndexChanged,e=>callback(e as PagerIndexChangedEvent));}
}
export class AnnotatedScrollBar extends SceneNode<AnnotatedScrollBarOptions>{
 labelSlots(){const labels=this.properties.labels??[];return (this.snapshot.reading?.labelSlots??[]).flatMap(p=>labels[p.index]?[{...p,label:labels[p.index],slot:this.scene.readingSlot(this,p.id)}]:[]);}
 onDetailLabelRequested(callback:(event:DetailLabelRequestedEvent)=>void){return this.on(EventKind.DetailLabelRequested,e=>callback(e as DetailLabelRequestedEvent));}
 setLabelTemplate(render:(label:import('./reading-controls-types').AnnotatedScrollBarLabel,slot:Panel,index:number)=>void){
  this.update({hasLabelTemplate:true} as object);const prepared=new Map<number,string>();const sync=()=>{if(this.isDisposed)return;const labels=this.properties.labels??[];for(const part of this.scene.snapshot.nodes.find(n=>n.id===identity(this))?.reading?.labelSlots??[]){const label=labels[part.index];if(!label)continue;const key=JSON.stringify(label);if(prepared.get(part.id)===key)continue;const slot=this.scene.readingSlot(this,part.id);this.scene.clearCollectionContent(slot);render(label,slot,part.index);prepared.set(part.id,key);}};const off=this.on(EventKind.RealizationChanged,sync);sync();return()=>{off();prepared.clear();if(!this.isDisposed)this.update({hasLabelTemplate:false} as object);};
 }
 detailContent(){this.update({hasDetailTemplate:true} as object);const id=this.snapshot.reading?.detailSlot;if(!id)throw new Error('Wait for the first scene snapshot before attaching detail content');return this.scene.readingSlot(this,id);}

 scrollTo(offset:number){this.scene.input(this,{kind:'reading',id:identity(this),action:'seek',offset});}
 onScrolling(callback:(event:AnnotatedScrollingEvent)=>void){return this.on(EventKind.Scrolling,e=>callback(e as AnnotatedScrollingEvent));}
}
export class RichTextBlockOverflow extends Panel<RichTextBlockOverflowOptions>{
 get hasOverflowContent(){return this.snapshot.reading?.hasOverflowContent??false;}
 get selectedText(){return this.snapshot.reading?.selectedText??'';}
 select(start:number,length:number){this.scene.input(this,{kind:'richSelect',id:identity(this),start,length});}
 onSelectionChanged(callback:(event:RichTextSelectionEvent)=>void){return this.on(EventKind.TextSelectionChanged,e=>callback(e as RichTextSelectionEvent));}
}
export class RichTextBlock extends Panel<RichTextBlockOptions>{
 inline(name:string){return this.grid({layoutKey:name});}
 get selectedText(){return this.snapshot.reading?.selectedText??'';}
 get hasOverflowContent(){return this.snapshot.reading?.hasOverflowContent??false;}
 select(start:number,length:number){this.scene.input(this,{kind:'richSelect',id:identity(this),start,length});}
 onSelectionChanged(callback:(event:RichTextSelectionEvent)=>void){return this.on(EventKind.TextSelectionChanged,e=>callback(e as RichTextSelectionEvent));}

 onHyperlinkClick(callback:(event:SceneEvent)=>void){return this.on(EventKind.HyperlinkClick,callback);}
}

/** Single-root content composition. All content layout is performed in Rust. */
export class ContentControl<T extends ContentControlOptions=ContentControlOptions> extends Panel<T>{
  /** Find a named descendant without crossing nested UserControl/Page scopes. */
  findName(name:string){return this.scene.findContentName(this,name);}
}
export class ContentPresenter extends ContentControl<ContentPresenterOptions>{}
export class UserControl extends ContentControl<UserControlOptions>{}
export class Page extends ContentControl<PageOptions>{}
/** A Frame in the shared Rust scene; standalone Frame remains available. */
export class SceneFrame extends SceneNode<SceneFrameOptions>{
  get navigation():Readonly<SceneFrameSnapshot>{return this.scene.selectNodeSnapshot(this,n=>n.contentHost as SceneFrameSnapshot);}
  onSnapshot(callback:(snapshot:Readonly<import('./frame').FrameSnapshot>)=>void){return this.scene.observeNodeSnapshot(this,n=>(n.contentHost as SceneFrameSnapshot).frame,callback);}
  get canGoBack(){return this.navigation.frame.backStack.length>0;}
  get canGoForward(){return this.navigation.frame.forwardStack.length>0;}
  navigate(page:string,options:SceneNavigateOptions={}){this.scene.input(this,{kind:'contentHost',id:identity(this),action:'navigate',page,parameter:options.parameter??0,transition:options.transition??NavigationTransition.Entrance});}
  goBack(){this.scene.input(this,{kind:'contentHost',id:identity(this),action:'back'});}
  goForward(){this.scene.input(this,{kind:'contentHost',id:identity(this),action:'forward'});}
  refresh(){this.scene.input(this,{kind:'contentHost',id:identity(this),action:'refresh'});}
  clearHistory(){this.scene.input(this,{kind:'contentHost',id:identity(this),action:'clearHistory'});}
  findName(name:string){return this.scene.findContentName(this,name);}
  onNavigating(callback:(event:SceneFrameNavigationEvent)=>void){return this.on(EventKind.FrameNavigating,e=>callback(e as SceneFrameNavigationEvent));}
  onNavigated(callback:(event:SceneFrameNavigationEvent)=>void){return this.on(EventKind.FrameNavigated,e=>callback(e as SceneFrameNavigationEvent));}
}


/** Rust-owned native ScrollBar range and pointer/keyboard behavior. */
export class ScrollBar extends SceneNode<ScrollBarOptions>{
  get isDragging(){return this.snapshot.primitive!.isDragging;}
  scrollTo(value:number){this.scene.input(this,{kind:'primitive',id:identity(this),action:'setValue',value});}
  scrollToStart(){this.scene.input(this,{kind:'primitive',id:identity(this),action:'first'});}
  scrollToEnd(){this.scene.input(this,{kind:'primitive',id:identity(this),action:'last'});}
  onScroll(callback:(event:ScrollBarEvent)=>void){return this.on(EventKind.Scroll,e=>callback(e as ScrollBarEvent));}
}
/** Drag deltas remain in the coordinate system captured by Rust at pointer-down. */
export class Thumb extends SceneNode<ThumbOptions>{
  get isDragging(){return this.snapshot.primitive!.isDragging;}
  cancelDrag(){this.scene.input(this,{kind:'primitive',id:identity(this),action:'cancelDrag'});}
  onDragStarted(callback:(event:ThumbDragStartedEvent)=>void){return this.on(EventKind.DragStarted,e=>callback(e as ThumbDragStartedEvent));}
  onDragDelta(callback:(event:ThumbDragDeltaEvent)=>void){return this.on(EventKind.DragDelta,e=>callback(e as ThumbDragDeltaEvent));}
  onDragCompleted(callback:(event:ThumbDragCompletedEvent)=>void){return this.on(EventKind.DragCompleted,e=>callback(e as ThumbDragCompletedEvent));}
}
export class TickBar extends SceneNode<TickBarOptions>{}
export class ScrollContentPresenter extends ScrollViewer{}

/** Community WinUI.TableView controller. All control state and geometry live in Rust. */
export class TableView<T extends object=Record<string,unknown>> extends SceneNode<TableViewOptions<T>> {
 private configuration:TableViewOptions<T>;
 private nextOperation=0;
 private pendingOperations=new Set<(error:Error)=>void>();
 private groupTemplate:((group:TableViewGroupInfo,slot:Panel)=>void)|undefined;
 private preparedGroups=new Map<Panel,string>();
 private headerTemplates=new Map<string,(column:TableViewColumn<T>,slot:Panel)=>void>();
 private preparedHeaders=new Map<Panel,unknown>();
 private templates=new Map<string,(item:T,slot:Panel,context:TableViewSlot<T>)=>void>();
 private prepared=new Map<Panel,{item:T;render:unknown}>();
 /** @internal */ constructor(scene:Scene,id:number,kind:NodeKind,options:TableViewOptions<T>){super(scene,id,kind);this.configuration={...options};}
 get items():readonly T[]{return this.configuration.items??[];}
 itemForKey(key:string):T|undefined{return this.items.find(item=>this.keyOf(item)===key);}
 private keyOf(item:T){return this.configuration.getRowKey?.(item)??tableRowKey(item);}
 /** Stable business identity, also available for rows without an id property. */ keyForItem(item:T){this.assertOwned(this.scene);return this.keyOf(item);}
 /** @internal */ preparePatch(patch:object):object{const p=patch as Partial<TableViewOptions<T>>;this.configuration={...this.configuration,...p};return Object.hasOwn(p,'items')||Object.hasOwn(p,'columns')||Object.hasOwn(p,'getRowKey')||Object.hasOwn(p,'groups')?{...p,items:this.items,columns:this.configuration.columns,groups:this.configuration.groups,getRowKey:this.configuration.getRowKey}:p;}
 /** @internal */ enrichEvent(event:SceneEvent){const data=event.table??(event.table={});if(event.kind===EventKind.CopyRequested&&event.text!==undefined){data.text=event.text;data.ready=true;}if(data.groups){const pool=new Map((this.configuration.groups??[]).map(g=>[typeof g==='string'?g:g.column,g]));this.configuration.groups=data.groups.map(g=>({...((typeof pool.get(g.column)==='object'?pool.get(g.column):{}) as TableViewGroupDescription<T>),...g}));}if(data.columns){const pool=new Map((this.configuration.columns??[]).map(c=>[c.key??c.path??c.field,c]));this.configuration.columns=data.columns.map(c=>({...pool.get(c.key),...c,field:pool.get(c.key)?.field??c.field as Extract<keyof T,string>,path:pool.get(c.key)?.path})) as TableViewColumn<T>[];}if(data.items){const pool=new Map(this.items.map(item=>[this.keyOf(item),item]));this.configuration.items=data.items.map((item,index)=>{const key=data.itemKeys?.[index]??this.keyOf(item as T);const merged={...pool.get(key),...item} as T;retainTableRowKey(merged,key);return merged;});this.update({items:this.items});}
  const selected=new Set(data.selectedKeys??this.tableSnapshot?.selectedKeys??[]);Object.assign(event,{item:data.cell?this.itemForKey(data.cell.row):undefined,items:this.items,selectedItems:selected.size?this.items.filter(item=>selected.has(this.keyOf(item))):[]});
 }
 /** Rust snapshot, including the realized subset and complete filtered count. */
 get tableSnapshot():Readonly<TableViewSnapshot>|null{return this.scene.tableState(this);}
 /** Read public properties using the same flat shape accepted by update(). */
 override get properties():Readonly<TableViewOptions<T>>{const native=super.properties as TableViewOptions<T>&{table?:object};const {table,...layout}=native;return {...layout,...table,items:this.items,columns:this.configuration.columns};}
 private drive(action:string,data:object={}){this.scene.input(this,{kind:'table',id:identity(this),action,data});}
 /** Select a stable cell. Set row=true for row-header selection. */
 select(cell:TableViewCell,row=false){this.drive('select',{cell,row});}
 selectAll(){this.drive('selectAll');}
 clearSelection(){this.drive('clearSelection');}
 /** Omit direction to toggle; additive=true preserves earlier sort descriptions. */
 sort(column:string,direction?:TableViewSortDirection,additive=false){this.drive('sort',{column,direction,additive});}
 /** Request cancellable native column grouping. */
 group(column:string){this.drive('group',{column});}
 ungroup(column:string){this.drive('ungroup',{column});}
 ungroupAll(){this.drive('ungroupAll');}
 /** Accept a returned group or a typed key path, e.g. ['Engineering',true]. */
 toggleGroup(group:TableViewGroupInfo|readonly unknown[]){this.drive('toggleGroup',Array.isArray(group)?{path:group}:{id:(group as TableViewGroupInfo).id});}
 expandGroup(group:TableViewGroupInfo|readonly unknown[]){this.drive('expandGroup',Array.isArray(group)?{path:group}:{id:(group as TableViewGroupInfo).id});}
 collapseGroup(group:TableViewGroupInfo|readonly unknown[]){this.drive('collapseGroup',Array.isArray(group)?{path:group}:{id:(group as TableViewGroupInfo).id});}
 expandAllGroups(){this.drive('expandAllGroups');}
 collapseAllGroups(){this.drive('collapseAllGroups');}
 /** Set the native group's key/count ordering. */
 sortGroups(column:string,sortMode:NonNullable<TableViewGroupDescription['sortMode']>,direction?:TableViewSortDirection){this.drive('groupSort',{column,sortMode,direction});}
 clearSorting(){this.drive('clearSorting');}
 filter(filter:TableViewFilter){this.drive('filter',filter);}
 clearFilters(){this.drive('clearFilters');}
 openFilter(column:string){this.drive('openFilter',{column});}
 beginEdit(cell:TableViewCell){this.drive('beginEdit',{cell});}
 commitEdit(value?:unknown){this.drive('commitEdit',value===undefined?{}:{value});}
 cancelEdit(){this.drive('cancelEdit');}
 /** Programmatic write; read-only cells reject writes in Rust. */
 setValue(cell:TableViewCell,value:unknown){this.drive('setValue',{cell,value});}
 resizeColumn(column:string,width:number){this.drive('resizeColumn',{column,width});}
 reorderColumn(from:number,to:number){this.drive('reorderColumn',{from,to});}
 reorderRow(row:string,index:number){this.drive('reorderRow',{row,index});}
 toggleRowDetails(row:string){this.drive('toggleRowDetails',{row});}
 scrollIntoView(row:string){this.drive('scrollIntoView',{row});}
 copy(options:{includeHeaders?:boolean;selected?:boolean}={}){this.drive('copy',{includeHeaders:options.includeHeaders??false,selected:options.selected??true});}
 /** Browser clipboard read is a host capability; explicit text also works without clipboard permission. */
 async paste(text?:string):Promise<void>{if(this.isDisposed)throw new Error("TableView disposed");const clientOperation=++this.nextOperation;const content=text??await navigator.clipboard.readText();return new Promise((resolve,reject)=>{let off:()=>void=()=>{};const abort=(error:Error)=>{off();this.pendingOperations.delete(abort);reject(error);};this.pendingOperations.add(abort);off=this.on(EventKind.PasteFromClipboard,event=>{if(event.table?.clientOperation!==clientOperation)return;if(event.table?.ready){if(event.table.error)abort(new Error(event.table.error));else{off();this.pendingOperations.delete(abort);resolve();}}else queueMicrotask(()=>{if(event.cancel)abort(new Error('TableView paste cancelled'));});});try{this.drive('requestPaste',{text:content,clientOperation});}catch(error){abort(error instanceof Error?error:new Error(String(error)));}});}
 /** Returns RFC-style CSV text. Saving is left to the application host. */
 exportCsv(options:{selected?:boolean;includeHeaders?:boolean}={}):Promise<string>{if(this.isDisposed)return Promise.reject(new Error("TableView disposed"));const clientOperation=++this.nextOperation;return new Promise((resolve,reject)=>{let off:()=>void=()=>{};const abort=(error:Error)=>{off();this.pendingOperations.delete(abort);reject(error);};this.pendingOperations.add(abort);off=this.on(EventKind.TableViewExport,event=>{if(event.table?.clientOperation!==clientOperation)return;if(event.table?.ready){off();this.pendingOperations.delete(abort);resolve(event.table.text??'');}else queueMicrotask(()=>{if(event.cancel){abort(new Error('TableView export cancelled'));}});});try{this.drive('export',{selected:options.selected??false,includeHeaders:options.includeHeaders??true,clientOperation});}catch(error){abort(error instanceof Error?error:new Error(String(error)));}});}
 /** @internal */ override markDisposed(){for(const abort of this.pendingOperations)abort(new Error("TableView disposed"));this.pendingOperations.clear();this.groupTemplate=undefined;this.preparedGroups.clear();this.templates.clear();this.headerTemplates.clear();this.prepared.clear();this.preparedHeaders.clear();super.markDisposed();}
 realizedGroups():TableViewGroupSlot[]{return this.tableSnapshot?.realizedGroups.filter(g=>g.container!==null).map(g=>({...g,container:this.scene.readingSlot(this,g.container!)}))??[];}
 /** Business content in a Rust-owned, virtualized native header slot. */
 setGroupHeaderTemplate(render:(group:TableViewGroupInfo,slot:Panel)=>void){this.groupTemplate=render;this.preparedGroups.clear();this.update({hasGroupHeaderTemplate:true});return()=>{this.groupTemplate=undefined;this.preparedGroups.clear();this.update({hasGroupHeaderTemplate:false});};}
 realizedHeaders(){return this.tableSnapshot?.headerSlots.map(h=>({column:h.column,container:this.scene.readingSlot(this,h.id)}))??[];}
 setColumnHeaderTemplate(column:string,render:(column:TableViewColumn<T>,slot:Panel)=>void){this.headerTemplates.set(column,render);const source=[...(this.configuration.columns??[])];if(!source.some(c=>(c.key??c.path??c.field)===column))source.push({field:column as Extract<keyof T,string>,key:column});this.update({columns:source.map(c=>(c.key??c.path??c.field)===column?{...c,hasHeaderTemplate:true}:c)});return()=>{this.headerTemplates.delete(column);this.update({columns:(this.configuration.columns??[]).map(c=>(c.key??c.path??c.field)===column?{...c,hasHeaderTemplate:false}:c)});};}
 realizedCells():TableViewSlot<T>[]{return this.scene.tableSlots(this);}
 onTableEvent(callback:(event:TableViewEvent<T>)=>void){const kinds=[EventKind.TableViewChanged,EventKind.Grouping,EventKind.Sorting,EventKind.ClearSorting,EventKind.CurrentCellChanged,EventKind.CellSelectionChanged,EventKind.SelectionChanged,EventKind.BeginningEdit,EventKind.PreparingCellForEdit,EventKind.CellEditEnding,EventKind.CellEditEnded,EventKind.CellDoubleTapped,EventKind.RowDoubleTapped,EventKind.ColumnReordering,EventKind.ColumnReordered,EventKind.CopyRequested,EventKind.PasteFromClipboard,EventKind.TableViewExport,EventKind.ContextRequested];const offs=kinds.map(k=>this.on(k,e=>callback(e as TableViewEvent<T>)));return()=>offs.forEach(off=>off());}
 /** Framework-independent SDK templates use ordinary native child controls. */
 setCellTemplate(column:string,render:(item:T,slot:Panel,context:TableViewSlot<T>)=>void,editing=false){const key=`${editing?'edit':'cell'}:${column}`;this.templates.set(key,render);const source=[...(this.configuration.columns??[])];if(!source.some(c=>(c.key??c.path??c.field)===column))source.push({field:column as Extract<keyof T,string>,key:column});const columns=source.map(c=>(c.key??c.path??c.field)===column?{...c,...(editing?{hasEditTemplate:true}:{hasTemplate:true})}:c);this.update({columns});this.syncTemplates();return()=>{this.templates.delete(key);this.update({columns:(this.configuration.columns??[]).map(c=>(c.key??c.path??c.field)===column?{...c,...(editing?{hasEditTemplate:false}:{hasTemplate:false})}:c)});};}
 setRowDetailsTemplate(render:(item:T,slot:Panel,context:TableViewSlot<T>)=>void){this.templates.set('details',render);this.update({hasRowDetailsTemplate:true});return()=>{this.templates.delete('details');this.update({hasRowDetailsTemplate:false});};}
 setRowHeaderTemplate(render:(item:T,slot:Panel,context:TableViewSlot<T>)=>void){this.templates.set('rowHeader',render);this.update({hasRowHeaderTemplate:true});return()=>{this.templates.delete('rowHeader');this.update({hasRowHeaderTemplate:false});};}
 /** @internal */ syncTemplates(){for(const slot of this.preparedGroups.keys())if(slot.isDisposed)this.preparedGroups.delete(slot);if(this.groupTemplate)for(const group of this.realizedGroups()){const signature=JSON.stringify([group.id,group.count,group.isExpanded]);if(this.preparedGroups.get(group.container)!==signature){this.scene.clearCollectionContent(group.container);this.groupTemplate(group,group.container);this.preparedGroups.set(group.container,signature);}}for(const slot of this.preparedHeaders.keys())if(slot.isDisposed)this.preparedHeaders.delete(slot);for(const h of this.realizedHeaders()){const render=this.headerTemplates.get(h.column),column=this.configuration.columns?.find(c=>(c.key??c.path??c.field)===h.column);if(render&&column&&this.preparedHeaders.get(h.container)!==render){this.scene.clearCollectionContent(h.container);render(column,h.container);this.preparedHeaders.set(h.container,render);}}const slots=this.realizedCells(),live=new Set(slots.map(s=>s.container));for(const slot of this.prepared.keys())if(!live.has(slot))this.prepared.delete(slot);for(const slot of slots){const render=this.templates.get(slot.role==='cell'?`${slot.editing?'edit':'cell'}:${slot.column}`:slot.role);if(!render)continue;const old=this.prepared.get(slot.container);if(old?.item===slot.item&&old.render===render)continue;this.scene.clearCollectionContent(slot.container);render(slot.item,slot.container,slot);this.prepared.set(slot.container,{item:slot.item,render});}}
}
export class ItemsPresenter extends Panel<ItemsPresenterOptions>{
  /** Stable Rust-owned slots; their subtrees use the same public SDK. */
  get headerContent(){return this.scene.presenterPart(this,'header');}
  get footerContent(){return this.scene.presenterPart(this,'footer');}
  get itemsContent(){return this.scene.presenterPart(this,'items');}
}
