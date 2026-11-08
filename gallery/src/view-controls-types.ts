import {NodeKind,SplitViewDisplayMode,SplitViewPanePlacement,LightDismissOverlayMode,ParallaxSourceOffsetKind,StandardCommandKind,Symbol} from './enums';
import type {LayoutOptions,BrushValue,SceneEvent,ScrollViewer,CollectionView,UICommand} from './scene';
import type {KeyboardAccelerator} from './command-controls-types';
/** WinUI SplitView, with Rust-owned pane layout, transition and dismissal. */
export interface SplitViewOptions extends LayoutOptions {
 /** Default false. Use closePane() for a cancellable dismissal. */ isPaneOpen?:boolean;
 /** Default Overlay. */ displayMode?:SplitViewDisplayMode;
 /** Default Left (physical placement). */ panePlacement?:SplitViewPanePlacement;
 /** Expanded pane width in DIP; default 320. */ openPaneLength?:number;
 /** Collapsed rail width in DIP; default 48. */ compactPaneLength?:number;
 /** Defaults to the native theme pane background. */ paneBackground?:BrushValue;
 /** Default Auto, no overlay tint. */ lightDismissOverlayMode?:LightDismissOverlayMode;
}
/** WinUI SemanticZoom switches two semantic representations in the Rust tree. */
export interface SemanticZoomOptions extends LayoutOptions {
 /** Default true. */ isZoomedInViewActive?:boolean;
 /** Default true; false prevents user-driven view changes. */ canChangeViews?:boolean;
 /** Default false (SDK style); the zoom-out button is a Rust Button. */ isZoomOutButtonEnabled?:boolean;
}
/** WinUI ParallaxView; Rust samples the source's scroll state, without JS animation. */
export interface ParallaxViewOptions extends LayoutOptions {
 /** A scrolling node in this scene; detached/disposed sources produce no shift. */ source?:ScrollViewer|CollectionView|null;
 /** Extra child width and signed horizontal travel; default 0 DIP. */ horizontalShift?:number;
 /** Extra child height and signed vertical travel; default 0 DIP. */ verticalShift?:number;
 /** Default 1; cap on horizontal parallax/scroll ratio; nonpositive values disable travel. */ maxHorizontalShiftRatio?:number;
 /** Default 1; cap on vertical parallax/scroll ratio; nonpositive values disable travel. */ maxVerticalShiftRatio?:number;
 /** Default true. */ isHorizontalShiftClamped?:boolean;
 /** Default true. */ isVerticalShiftClamped?:boolean;
 /** Default Relative. */ horizontalSourceOffsetKind?:ParallaxSourceOffsetKind;
 /** Default Relative. */ verticalSourceOffsetKind?:ParallaxSourceOffsetKind;
 /** Default 0 DIP. */ horizontalSourceStartOffset?:number;
 /** Default 0 DIP. */ horizontalSourceEndOffset?:number;
 /** Default 0 DIP. */ verticalSourceStartOffset?:number;
 /** Default 0 DIP. */ verticalSourceEndOffset?:number;
}
/** Implements WinUI XamlUICommand. Rust owns executability, execution requests,
 * child-command forwarding and accelerator metadata. Business effects run in callbacks.
 * The public name UICommand does not require an XAML parser. */
export interface UICommandOptions {
 /** Default true. */ enabled?:boolean;
 /** Default true; propagated to bound controls. */ canExecute?:boolean;
 /** Default empty; StandardCommand uses the native preset when omitted. */ label?:string|null;
 /** Default empty; StandardCommand uses the native preset when omitted. */ description?:string|null;
 /** Default unset; StandardCommand uses the native preset when omitted. */ iconSymbol?:Symbol|null;
 /** Omit for native presets; [] explicitly removes accelerators. */ accelerators?:readonly KeyboardAccelerator[]|null;
 /** Optional child command; cycles and cross-scene references are rejected. */ command?:UICommand|null;
}
/** Implements WinUI StandardUICommand; extends the XamlUICommand model with
 * native standard metadata. Save/Copy/etc. request a business callback. */
export interface StandardCommandOptions extends UICommandOptions {
 /** Default None. Set a preset, e.g. StandardCommandKind.Save. */ standardKind?:StandardCommandKind;
}
/** Metadata and effective executability returned directly by Rust. */
export interface UICommandMetadata {label:string;description:string;iconSymbol:Symbol|null;accelerators:KeyboardAccelerator[];canExecute:boolean;}
/** Implements XamlUICommand's CanExecuteRequested/ExecuteRequested arguments. */
export interface UICommandEvent extends SceneEvent {
 /** JSON-compatible application parameter. */ parameter:unknown;
 /** Set false in CanExecuteRequested to cancel this execution. */ canExecute:boolean;
}
/** Rust-specific diagnostic geometry; application layout never depends on it. */
export interface ViewControlSnapshot {progress:number;pane:{x:number;y:number;width:number;height:number};translation:[number,number];}
export const viewControlKinds=[NodeKind.SplitView,NodeKind.SemanticZoom,NodeKind.ParallaxView,NodeKind.UICommand,NodeKind.StandardCommand,NodeKind.SwipeControl];
/** @internal Public property names mapped to the Rust-owned property group. */
export const viewControlKeys=['isPaneOpen','displayMode','panePlacement','openPaneLength','compactPaneLength','paneBackground','lightDismissOverlayMode','isZoomedInViewActive','canChangeViews','isZoomOutButtonEnabled','source','horizontalShift','verticalShift','maxHorizontalShiftRatio','maxVerticalShiftRatio','isHorizontalShiftClamped','isVerticalShiftClamped','horizontalSourceOffsetKind','verticalSourceOffsetKind','horizontalSourceStartOffset','horizontalSourceEndOffset','verticalSourceStartOffset','verticalSourceEndOffset','command','commandParameter','canExecute','label','description','iconSymbol','accelerators','standardKind','leftItems','rightItems','topItems','bottomItems'] as const;

/** Rust-owned modern scrolling host used by the Gallery ScrollView example. */
export type ScrollViewOptions = import('./scene').ScrollViewerOptions;
/** Command metadata is inherited in Rust when text/icon are omitted. */
export interface SwipeItem {id:string;text?:string;iconSymbol?:Symbol;command?:UICommand|null;commandParameter?:unknown;background?:BrushValue;foreground?:BrushValue;}
/** A native directional SwipeItems collection. Execute accepts one action. */
export interface SwipeItems {mode?:import('./enums').SwipeMode;items:readonly SwipeItem[];}
export interface SwipeControlOptions extends LayoutOptions {leftItems?:SwipeItems|null;rightItems?:SwipeItems|null;topItems?:SwipeItems|null;bottomItems?:SwipeItems|null;}
