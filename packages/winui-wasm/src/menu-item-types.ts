import type {LayoutOptions, UICommand} from './scene';
import type {KeyboardAccelerator} from './command-controls-types';
/** Shared metadata. Rust supplies presentation, navigation, command execution and lifetime. */
export interface MenuFlyoutItemOptions extends Pick<LayoutOptions,'enabled'|'visible'|'accessibleName'> {
  /** Menu label. Default empty; an attached command supplies its label. */ text?:string;
  /** Segoe Fluent Icons glyph. Default empty; an attached command may supply it. */ icon?:string;
  /** Default empty. Keyboard accelerators execute through the Rust presenter. */ keyboardAccelerators?:readonly KeyboardAccelerator[];
  /** Optional Rust UICommand; null detaches it. */ command?:UICommand|string|null;
  /** JSON-compatible business parameter. Default null. */ commandParameter?:unknown;
}
/** Two-state menu toggle; activation changes state before Click. */
export interface ToggleMenuFlyoutItemOptions extends MenuFlyoutItemOptions {
  /** Rust-owned checked state. Default false. */ isChecked?:boolean;
}
/** Radio items with the same group in one Scene are mutually exclusive. */
export interface RadioMenuFlyoutItemOptions extends ToggleMenuFlyoutItemOptions {
  /** Default empty; all unnamed radio menu items share a group. */ groupName?:string;
}
/** A nested menu containing other menu item controls. */
export interface MenuFlyoutSubItemOptions extends Pick<MenuFlyoutItemOptions,'text'|'icon'|'enabled'|'visible'|'accessibleName'> {
  /** Display a check when a direct radio child is selected. Native default false. */ areCheckStatesEnabled?:boolean;
}
/** Noninteractive rule; the presenter determines its dimensions. */
export interface MenuFlyoutSeparatorOptions extends Pick<LayoutOptions,'visible'> {}
