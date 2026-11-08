import type {LayoutOptions,TextOptions,PopupOptions,MenuEntry} from './scene';
import type {CommandBarOptions} from './command-controls-types';
import type {WrapPanelItemsStretch,FlyoutShowMode,Orientation} from './enums';

/** RelativePanel attached constraints. References resolve against sibling layoutKey values. */
export interface RelativeConstraints {
 /** Place before/after a sibling's layout slot, including margins. */ leftOf?:string;rightOf?:string;above?:string;below?:string;
 /** Align matching edges. Panel-edge constraints take precedence. */ alignLeftWith?:string;alignRightWith?:string;alignTopWith?:string;alignBottomWith?:string;
 /** Align centers with a sibling; overrides positional constraints on that axis. */ alignHorizontalCenterWith?:string;alignVerticalCenterWith?:string;
 /** Anchor edges to the panel. Two opposing anchors stretch the layout slot. Default false. */ alignLeftWithPanel?:boolean;alignRightWithPanel?:boolean;alignTopWithPanel?:boolean;alignBottomWithPanel?:boolean;
 /** Center an unanchored child within the panel. Default false. */ alignHorizontalCenterWithPanel?:boolean;alignVerticalCenterWithPanel?:boolean;
}
/** Rust measures and solves named sibling dependencies; cycles and missing names report an error. */
export interface RelativePanelOptions extends LayoutOptions {}
export interface WrapPanelOptions extends LayoutOptions {
 /** Main flow direction, default Horizontal. */ orientation?:Orientation;
 /** Space between items on a row/column, default 0 DIP. */ itemSpacing?:number;
 /** Space between wrapped rows/columns, default 0 DIP. */ lineSpacing?:number;
 /** Default None. Last stretches the final source child. */ itemsStretch?:WrapPanelItemsStretch;
}
export interface MenuBarItemData {
 /** Stable business identity, unique within the bar. */ id:string;
 /** Header text; default Item. */ title?:string;
 /** Default true. */ enabled?:boolean;visible?:boolean;
 /** Commands, toggles and separators in the Rust MenuFlyout. Default empty. */ items?:readonly MenuEntry[];
}
export interface MenuBarOptions extends LayoutOptions {
 /** Optional data API. Omit when composing MenuBarItem children. Default empty. */ items?:readonly MenuBarItemData[];
}
export interface MenuBarItemOptions extends TextOptions {
 /** Header text, default Item. */ title?:string;
 /** Popup entries, default empty. */ items?:readonly MenuEntry[];
 /** Controlled open state, default false. */ isOpen?:boolean;
}
export interface CommandBarFlyoutOptions extends Omit<CommandBarOptions,'isOpen'|'defaultLabelPosition'|'closedDisplayMode'|'overflowButtonVisibility'>,PopupOptions {
 /** Keep secondary commands expanded; hide More. Default false. */ alwaysExpanded?:boolean;
 /** Default Standard. Transient initially displays only primary commands. */ showMode?:FlyoutShowMode;
}
