import type {LayoutOptions,TextOptions,PanelOptions,BorderOptions,ButtonOptions,TextBoxOptions,ImageOptions,RectangleOptions,SymbolIconOptions,ToggleOptions,ScrollViewerOptions,SceneEvent} from './scene';
import type {FrameSnapshot,PageStackEntry} from './frame';
import {NodeKind,HorizontalAlignment,VerticalAlignment,NavigationCacheMode,NavigationMode,NavigationTransition} from './enums';

/** A public scene description. Rust creates, lays out, paints and owns these nodes.
 * Unsupported containers fail validation before a content/page change commits. */
export interface ContentTemplate {
  /** A supported primitive or content host; nested Frame definitions are rejected. */
  kind:NodeKind.Grid|NodeKind.StackPanel|NodeKind.Canvas|NodeKind.Border|NodeKind.Viewbox|NodeKind.WrapPanel|NodeKind.RelativePanel|NodeKind.ScrollViewer|NodeKind.ScrollView|NodeKind.ContentControl|NodeKind.ContentPresenter|NodeKind.Page|NodeKind.UserControl|NodeKind.TextBlock|NodeKind.Image|NodeKind.Rectangle|NodeKind.Ellipse|NodeKind.Line|NodeKind.Path|NodeKind.Polygon|NodeKind.Polyline|NodeKind.FontIcon|NodeKind.SymbolIcon|NodeKind.PathIcon|NodeKind.Button|NodeKind.ToggleButton|NodeKind.CheckBox|NodeKind.RadioButton|NodeKind.ToggleSwitch|NodeKind.TextBox|NodeKind.PasswordBox;
  /** Optional name scoped to this template/page, used by findName. */ name?:string;
  /** Ordinary typed control properties. No rendering or interaction callbacks. */
  properties?:LayoutOptions & Partial<TextOptions & PanelOptions & BorderOptions & ButtonOptions & TextBoxOptions & ImageOptions & RectangleOptions & SymbolIconOptions & ToggleOptions & ScrollViewerOptions>;
  /** A host accepts one child; layout panels accept multiple children. */ children?:readonly ContentTemplate[];
}
export interface ContentControlOptions extends TextOptions,BorderOptions {
  /** String content rendered by a Rust TextBlock; null removes it. Default null. */ content?:string|null;
  /** Rust-instantiated content tree; mutually exclusive with content and JSX children. Default null. */ contentTemplate?:ContentTemplate|null;
  /** Default Left for ContentControl, Stretch for ContentPresenter. Page/UserControl always arrange their root at full size. */ horizontalContentAlignment?:HorizontalAlignment;
  /** Default Top for ContentControl, Stretch for ContentPresenter. Page/UserControl always arrange their root at full size. */ verticalContentAlignment?:VerticalAlignment;
}
/** Same combined border/padding and content alignment contract as native ContentPresenter. */
export interface ContentPresenterOptions extends ContentControlOptions {}
/** A reusable composition with one root; default content alignment Stretch. */
export interface UserControlOptions extends ContentControlOptions {}
/** A standalone or Frame-owned single-root page. System AppBars are outside this slice. */
export interface PageOptions extends ContentControlOptions {/** Default empty. */ title?:string;}
export interface ScenePageDefinition {
  /** Stable page type key, unique inside a Frame. */ key:string;
  /** Page title, default empty. */ title?:string;
  /** Native default Disabled; Enabled follows LRU capacity, Required is retained separately. */ cacheMode?:NavigationCacheMode;
  /** Declarative content instantiated entirely in Rust, only when needed. */ content:ContentTemplate;
}
export interface SceneFrameOptions extends LayoutOptions {
  /** Immutable while pages are retained. Default empty. */ pages?:readonly ScenePageDefinition[];
  /** Native default 10. Required pages do not consume the ordinary LRU capacity. */ cacheSize?:number;
}
export interface SceneNavigateOptions {
  /** JSON-free business identity; the host may associate its own object with this number. Default 0. */ parameter?:number;
  /** Native-derived transition, default Entrance. Motion executes in Rust. */ transition?:NavigationTransition;
}
export interface SceneFrameSnapshot {
  frame:FrameSnapshot;
  /** Diagnostic mapping from Rust page-instance identity to scene-node identity. */ pageNodes:Record<string,number>;
  pending:number|null;
}
export interface SceneFrameNavigationEvent extends SceneEvent {
  /** Captured before cancellation/commit. Setting cancel on FrameNavigating preserves journal/cache/content. */
  frameNavigation:{from:PageStackEntry|null;to:PageStackEntry;mode:NavigationMode};
}
