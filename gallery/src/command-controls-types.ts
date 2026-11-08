import type {LayoutOptions,TextOptions,ButtonOptions,SceneEvent,IconSource,SceneNode,FloatingSurface,PopupOptions} from './scene';
import type {CommandBarLabelPosition,CommandBarDefaultLabelPosition,CommandBarClosedDisplayMode,CommandBarOverflowButtonVisibility,CommandBarItemKind,KeyboardAcceleratorModifier} from './enums';
export interface KeyboardAccelerator {key:string;modifiers?:readonly KeyboardAcceleratorModifier[];}
export interface AppBarButtonOptions extends TextOptions,Pick<ButtonOptions,'command'|'commandParameter'> {label?:string;iconSource?:IconSource;isCompact?:boolean;labelPosition?:CommandBarLabelPosition;dynamicOverflowOrder?:number;keyboardAccelerators?:readonly KeyboardAccelerator[];}
export interface AppBarToggleButtonOptions extends AppBarButtonOptions {isChecked?:boolean|null;isThreeState?:boolean;}
export interface DropDownButtonOptions extends ButtonOptions {keyboardAccelerators?:readonly KeyboardAccelerator[];}
/** Stable IDs preserve focus, toggle state and flyout attachment while commands overflow. */
export interface CommandBarItem {id:string;label?:string;kind?:CommandBarItemKind;iconSource?:IconSource;enabled?:boolean;visible?:boolean;isChecked?:boolean|null;isThreeState?:boolean;dynamicOverflowOrder?:number;keyboardAccelerators?:readonly KeyboardAccelerator[];flyout?:FloatingSurface<PopupOptions>|null;}
export interface CommandBarOptions<T extends CommandBarItem=CommandBarItem> extends LayoutOptions {primaryCommands?:readonly T[];secondaryCommands?:readonly T[];defaultLabelPosition?:CommandBarDefaultLabelPosition;closedDisplayMode?:CommandBarClosedDisplayMode;overflowButtonVisibility?:CommandBarOverflowButtonVisibility;isDynamicOverflowEnabled?:boolean;isSticky?:boolean;isOpen?:boolean;}
export interface CommandBarEvent<T extends CommandBarItem=CommandBarItem> extends SceneEvent {command:{id:string;isChecked:boolean|null};item?:T;}
export interface CommandSnapshot {owner:number|null;inOverflow:boolean;primaryClip:{x:number;y:number;width:number;height:number};expansionProgress:number;body:{x:number;y:number;width:number;height:number};icon:{x:number;y:number;width:number;height:number};label:{x:number;y:number;width:number;height:number};inline:readonly string[];overflow:readonly string[];moreButton:number|null;flyoutOpen:boolean;}
export type CommandAction=SceneNode<AppBarButtonOptions|AppBarToggleButtonOptions|DropDownButtonOptions>;

/** Nonfocusable AppBar separator. Default padding 2,8,2,8; compact template height 48 DIP. */
export interface AppBarSeparatorOptions extends LayoutOptions {/** Default false. */ isCompact?:boolean;}
