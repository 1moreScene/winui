import type {FlowDirection, ListViewSelectionMode, Orientation, SegmentedStyle} from './enums';
import type {LayoutOptions, SceneEvent, SegmentedItem} from './scene';

/** CommunityToolkit Segmented. Declare SegmentedItem children or supply itemsSource. */
export interface SegmentedOptions extends LayoutOptions {
  /** Default Default: equal sizes. Pivot and Button use content-sized items. */ segmentedStyle?: SegmentedStyle;
  /** Default Horizontal. The Default style stacks its icon above content in Vertical. */ orientation?: Orientation;
  /** Default Single. None, Multiple and Extended follow ListView selection semantics. */ selectionMode?: ListViewSelectionMode;
  /** Default -1 (no selection). The first selected item in multiple selection modes. */ selectedIndex?: number;
  /** Default false: arrows move focus; Space/Enter selects. */ singleSelectionFollowsFocus?: boolean;
  /** Inherits from the parent; left/right arrows mirror in RightToLeft. */ flowDirection?: FlowDirection;
  /** Optional Rust-generated item containers. Do not combine with declared item children. */ itemsSource?: readonly (string | SegmentedItemData)[] | null;
}
/** Serializable item data; name is the stable identity when updating or reordering the source. */
export interface SegmentedItemData {
  /** Stable source identity; default is the source index. */ name?: string;
  /** Text content; default empty. */ content?: string;
  /** Segoe Fluent Icons glyph; default empty. */ icon?: string;
  /** Default true. */ enabled?: boolean;
  /** Default true. Collapsed items do not consume layout space. */ visible?: boolean;
  /** Initial or explicitly updated selection; default false. */ isSelected?: boolean;
}
/** A Segmented content container. React children can supply arbitrary SDK content. */
export interface SegmentedItemOptions extends LayoutOptions {
  /** XAML Content equivalent for text; default empty. */ content?: string;
  /** Segoe Fluent Icons glyph; default empty. */ icon?: string;
  /** Default false; synchronized by the parent selection model. */ isSelected?: boolean;
  /** Default Segoe UI. */ fontFamily?: string;
  /** Default 14 DIP. */ fontSize?: number;
  /** Default 400. */ fontWeight?: number;
}
/** Selection is committed in Rust before this event is delivered. */
export interface SegmentedSelectionChangedEvent extends SceneEvent {
  /** First selected index, or -1 when the selection is empty. */ selectedIndex: number;
  /** Current selected item indices in declaration/source order. */ selectedIndices: readonly number[];
  /** Selected Rust item containers; source containers are adopted automatically. */ selectedItems: readonly SegmentedItem[];
}
