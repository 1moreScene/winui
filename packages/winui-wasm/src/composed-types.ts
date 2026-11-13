import type {LayoutOptions,TextBoxOptions,CollectionItem,IconSource,SceneEvent} from './scene';
import type {FlowDirection,ListViewSelectionMode,NumberBoxSpinButtonPlacementMode,NumberBoxValidationMode,AutoSuggestionBoxTextChangeReason,ContentDialogButton,ContentDialogResult,TeachingTipPlacementMode,TeachingTipTailVisibility,TeachingTipHeroContentPlacementMode,TeachingTipCloseReason} from './enums';
import type {TreeItem} from './navigation-controls-types';
/** Browser Intl descriptor for the native number-parser/formatter boundary. Arithmetic stays in Rust. */
export interface NumberFormatOptions {/** BCP 47 locale; default host locale. */ locale?:string;/** Default false. */ useGrouping?:boolean;/** Default 0; maximum 100. */ minimumFractionDigits?:number;/** Optional display increment, using RoundHalfUp, e.g. 0.25. */ roundingIncrement?:number;}
/** Empty NumberBox values are represented by null; default empty. */
export interface NumberBoxOptions extends Pick<TextBoxOptions,'text'|'header'|'placeholderText'|'isReadOnly'|'fontSize'|'fontFamily'|'fontWeight'|'fontStyle'>,LayoutOptions {
 /** Default inherited flow direction. */ flowDirection?:FlowDirection;
 /** Optional supporting text below the editor. */ description?:string;
 /** Optional localized decimal parser/formatter. */ numberFormat?:NumberFormatOptions;
 /** Finite number or null (native NaN/empty). */ value?:number|null;
 /** Native finite double bounds by default. Setting one bound coerces the other. */ minimum?:number;maximum?:number;
 /** Native defaults 1 and 10. Zero and negative changes are supported. */ smallChange?:number;largeChange?:number;
 /** Default Hidden. */ spinButtonPlacementMode?:NumberBoxSpinButtonPlacementMode;
 /** Default InvalidInputOverwritten. */ validationMode?:NumberBoxValidationMode;
 /** Default false. */ isWrapEnabled?:boolean;
 /** Default false; enables the source expression grammar. */ acceptsExpression?:boolean;
}
export interface AutoSuggestBoxOptions<T extends CollectionItem=CollectionItem> extends Pick<TextBoxOptions,'text'|'header'|'placeholderText'|'isReadOnly'|'fontSize'|'fontFamily'|'fontWeight'|'fontStyle'>,LayoutOptions {
 /** Default inherited flow direction. */ flowDirection?:FlowDirection;
 /** Optional supporting text below the editor. */ description?:string;
 /** Business data stays in TypeScript; stable IDs cross the Rust boundary. */ items?:readonly T[];
 /** Default -1. */ selectedIndex?:number;
 /** Default true. */ updateTextOnSelect?:boolean;
 /** Default false; business callbacks supply filtered items. */ isSuggestionListOpen?:boolean;
 /** Default 504 DIP. */ maxDropDownHeight?:number;
 /** Show the standard search glyph; default false. */ queryIcon?:boolean;
}
export interface ComboBoxOptions<T extends CollectionItem=CollectionItem> extends Omit<AutoSuggestBoxOptions<T>,'queryIcon'|'isSuggestionListOpen'|'updateTextOnSelect'> {
 /** Default false. */ isEditable?:boolean;
 /** Native default true. */ isTextSearchEnabled?:boolean;
 /** Native default false. */ isDropDownOpen?:boolean;
 /** Show the WinUI clear button when a selection or editable text is present. Default false. */ clearable?:boolean;
 /** Default Single. Multiple keeps the popup open and uses WinUI checkboxes. */ selectionMode?:ListViewSelectionMode.Single|ListViewSelectionMode.Multiple;
 /** Stable IDs of the selected items. Takes precedence over selectedIndex when both are supplied. */ selectedKeys?:readonly string[];
}
export type TreeComboBoxOptions<T extends TreeItem=TreeItem> = Omit<ComboBoxOptions<T>,'isEditable'|'isTextSearchEnabled'>;
export interface ContentDialogOptions extends LayoutOptions {
 /** Default empty. Rich content is composed as children. */ title?:string;
 primaryButtonText?:string;secondaryButtonText?:string;closeButtonText?:string;
 /** Defaults true. */ isPrimaryButtonEnabled?:boolean;isSecondaryButtonEnabled?:boolean;
 /** Default None. */ defaultButton?:ContentDialogButton;
}
export interface TeachingTipOptions extends LayoutOptions {
  /** Same-Scene target or element name; Rust resolves forward declarations before layout. */ target?:import('./scene').SceneNode|string|null;
 /** Default closed. */ isOpen?:boolean;
 title?:string;subtitle?:string;actionButtonContent?:string;closeButtonText?:string;
 iconSource?:IconSource|null;
 /** Additional [left,top,right,bottom] target/window placement margins; default zero. */ placementMargin?:[number,number,number,number];
 /** Default Auto. */ preferredPlacement?:TeachingTipPlacementMode;
 /** Default Auto. */ tailVisibility?:TeachingTipTailVisibility;
 /** Default Auto. */ heroContentPlacement?:TeachingTipHeroContentPlacementMode;
 /** Native default false. */ isLightDismissEnabled?:boolean;
}
/** Call complete exactly once after asynchronous work; repeated completion is harmless. */
export interface Deferral {complete():void;}
export interface ComposedEvent<T extends CollectionItem=CollectionItem> extends SceneEvent {
 reason?:AutoSuggestionBoxTextChangeReason|TeachingTipCloseReason;
 oldValue?:number|null;newValue?:number|null;
 queryText?:string;chosenSuggestion?:string|null;
 dialogResult?:ContentDialogResult;
 /** Original JS business object for selection/suggestion notifications. */ selectedItem?:T;
 /** Stable IDs and original objects in source order for ComboBox selection notifications. */
 selectedKeys?:readonly string[];
 selectedItems?:readonly T[];
 /** Original business object for a submitted chosen suggestion. */ chosenItem?:T|null;
 /** Setting handled suppresses ComboBox's default TextSubmitted commit. */ handled?:boolean;
 /** Available on dialog button/closing and TeachingTip closing events. */ getDeferral?:()=>Deferral;
}
export interface ComposedSnapshot {parts:Record<string,number>;value:number|null;selectedIndex:number;selectedKeys:readonly string[];pendingRequest:number|null;result:ContentDialogResult;modalActive:boolean;}

/** Cancellable notifications that support explicit asynchronous deferrals. */
export interface ComposedDeferrableEvent extends ComposedEvent {getDeferral:()=>Deferral;}
