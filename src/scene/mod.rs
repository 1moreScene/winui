//! One root owns layout, input, ordering, composition and lifetime for all node types.
pub mod table_view;
pub mod scroll_primitives;
pub mod menu_item_controls;
mod menu_presenter;
pub use menu_presenter::MenuRowParts;
pub mod content_hosts;
pub mod navigation_view;
pub mod reading_controls;
pub mod view_controls;
mod basic_next;
pub mod collections;
pub mod repeater;
pub mod refresh;
mod compact_controls;
pub mod command_controls;
pub mod command_menus;
mod menu_entries;
pub mod layout_panels;
pub mod composed;
pub mod picker_controls;
pub mod navigation_controls;
mod segmented;
pub use compact_controls::RatingItemInfo;
mod five_controls;
mod input;
mod overlay_visual;
pub mod overlays;
mod slider;
pub use basic_next::viewbox_scale;
mod layout;
mod properties;
mod element_names;
pub use element_names::{ElementReferenceProperty,UnresolvedElementReference};
pub use input::Input;
pub use input::PointerPresentation;
mod motion;
pub mod motion_effects;
mod paint;
mod visual_surface;
mod progress;
pub(crate) mod scroll;
pub use scroll::HostScrollMetrics;
mod selection_input;
mod text_edit;
pub mod rich_edit;
use crate::{
    button::ButtonState,
    enums::*,
    model::Rect,
    navigation::NavigationView,
    typography::{TextLayout, TextMeasurer},
};
pub use motion::{AnimationCompletion, AnimationOptions, VisualValues};
pub use properties::*;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashMap};
use std::ops::{Deref, DerefMut};
use std::sync::LazyLock;

/// Most nodes only read the default of these control-specific states.
/// Realized template parts can acquire state independently of their node kind.
pub struct ControlStateStorage<T: 'static> {
    value: Option<Box<T>>,
    default: &'static LazyLock<T>,
}
impl<T: Default> ControlStateStorage<T> {
    fn new(default: &'static LazyLock<T>) -> Self {
        Self { value: None, default }
    }
    fn allocated_mut(&mut self) -> Option<&mut T> {
        self.value.as_deref_mut()
    }
}
impl<T> Deref for ControlStateStorage<T> {
    type Target = T;
    fn deref(&self) -> &T {
        self.value.as_deref().unwrap_or_else(|| LazyLock::force(self.default))
    }
}
impl<T: Default> DerefMut for ControlStateStorage<T> {
    fn deref_mut(&mut self) -> &mut T {
        self.value.get_or_insert_with(Box::default)
    }
}

static TABLE_STATE: LazyLock<table_view::TableState> = LazyLock::new(Default::default);
static PICKER_STATE: LazyLock<picker_controls::PickerState> = LazyLock::new(Default::default);
static NAVIGATION_STATE: LazyLock<navigation_controls::NavigationState> = LazyLock::new(Default::default);
static COLLECTION_STATE: LazyLock<collections::CollectionState> = LazyLock::new(Default::default);
static REPEATER_STATE: LazyLock<repeater::RepeaterState> = LazyLock::new(Default::default);
static READING_STATE: LazyLock<reading_controls::ReadingState> = LazyLock::new(Default::default);
static EDITOR_STATE: LazyLock<text_edit::EditorState> = LazyLock::new(Default::default);
static SCROLL_STATE: LazyLock<scroll::ScrollState> = LazyLock::new(Default::default);
static CONTENT_HOST_STATE: LazyLock<content_hosts::HostState> = LazyLock::new(Default::default);
static EFFECT_STATE: LazyLock<motion_effects::EffectState> = LazyLock::new(Default::default);
static VIEW_STATE: LazyLock<view_controls::ViewState> = LazyLock::new(Default::default);
static PROGRESS_STATE: LazyLock<progress::ProgressVisual> = LazyLock::new(Default::default);
static EXPANDER_STATE: LazyLock<five_controls::ExpanderVisual> = LazyLock::new(Default::default);
static SLIDER_STATE: LazyLock<slider::SliderState> = LazyLock::new(Default::default);
static SELECTION_STATE: LazyLock<selection_input::SelectionVisual> = LazyLock::new(Default::default);
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq)]
pub struct Matrix(pub [f64; 6]);
impl Default for Matrix {
    fn default() -> Self {
        Self([1., 0., 0., 1., 0., 0.])
    }
}
impl Matrix {
    pub fn multiply(self, rhs: Self) -> Self {
        let [a, b, c, d, e, f] = self.0;
        let [g, h, i, j, k, l] = rhs.0;
        Self([
            a * g + c * h,
            b * g + d * h,
            a * i + c * j,
            b * i + d * j,
            a * k + c * l + e,
            b * k + d * l + f,
        ])
    }
    pub fn point(self, x: f64, y: f64) -> (f64, f64) {
        let [a, b, c, d, e, f] = self.0;
        (a * x + c * y + e, b * x + d * y + f)
    }
    pub fn inverse(self) -> Option<Self> {
        let [a, b, c, d, e, f] = self.0;
        let det = a * d - b * c;
        if det.abs() < 1e-12 {
            return None;
        }
        Some(Self([
            d / det,
            -b / det,
            -c / det,
            a / det,
            (c * f - d * e) / det,
            (b * e - a * f) / det,
        ]))
    }
    pub fn bounds(self, r: Rect) -> Rect {
        let points = [
            self.point(r.x, r.y),
            self.point(r.x + r.width, r.y),
            self.point(r.x, r.y + r.height),
            self.point(r.x + r.width, r.y + r.height),
        ];
        let x = points.iter().map(|v| v.0).fold(f64::INFINITY, f64::min);
        let y = points.iter().map(|v| v.1).fold(f64::INFINITY, f64::min);
        Rect::new(
            x,
            y,
            points.iter().map(|v| v.0).fold(f64::NEG_INFINITY, f64::max) - x,
            points.iter().map(|v| v.1).fold(f64::NEG_INFINITY, f64::max) - y,
        )
    }
}
pub struct Node {
    segmented: segmented::State,
    pub navigation_template: navigation_view::TemplateState,
    pub table: ControlStateStorage<table_view::TableState>,
    pub(super) effects: ControlStateStorage<motion_effects::EffectState>,
    pub primitive:scroll_primitives::PrimitiveState,
    pub menu_item:menu_item_controls::MenuItemState,
    pub content_host: ControlStateStorage<content_hosts::HostState>,
    pub reading: ControlStateStorage<reading_controls::ReadingState>,
    pub repeater: ControlStateStorage<repeater::RepeaterState>,
    pub refresh:refresh::RefreshState,
    view_control: ControlStateStorage<view_controls::ViewState>,
    pub menu: command_menus::MenuState,
    pub panel: layout_panels::PanelState,
    pub picker: ControlStateStorage<picker_controls::PickerState>,
    pub nav_controls: ControlStateStorage<navigation_controls::NavigationState>,
    pub composed: composed::ComposedState,
    collection: ControlStateStorage<collections::CollectionState>,
    compact: compact_controls::CompactState,
    pub id: u32,
    pub parent: Option<u32>,
    pub children: Vec<u32>,
    pub kind: NodeKind,
    pub props: NodeProperties,
    pub command: command_controls::CommandState,
    pub rect: Rect,
    pub world: Matrix,
    pub desired: [f64; 2],
    pub desired_without_margin: [f64; 2],
    pub theme: Theme,
    pub enabled: bool,
    pub visible: bool,
    pub text: TextLayout,
    pub button: ButtonState,
    pub selection_visual: ControlStateStorage<selection_input::SelectionVisual>,
    pub editor: ControlStateStorage<text_edit::EditorState>,
    pub scroll: ControlStateStorage<scroll::ScrollState>,
    progress: ControlStateStorage<progress::ProgressVisual>,
    repeat: basic_next::RepeatState,
    viewbox: basic_next::ViewboxSnapshot,
    expander: ControlStateStorage<five_controls::ExpanderVisual>,
    pub header_text: TextLayout,
    overlay: overlays::OverlayState,
    slider: ControlStateStorage<slider::SliderState>,
    pub animated_icon: crate::animated_icon::Player,
    pub shape_path: Option<crate::icons::PathGeometry>,
    pub icon_path: Option<crate::icons::PathGeometry>,
    pub(crate) accept: crate::accept::AcceptVisual,
    pub nav: Option<Box<NavigationView>>,
    pub layout_version: u64,
    pub paint_version: u64,
    pub presentation: VisualValues,
    pub material_motion: crate::animation::Motion,
    pub material_colors: crate::material::AcrylicTransition,
}
impl Node {
    pub(crate) fn snapshot_properties(&self) -> std::borrow::Cow<'_, NodeProperties> {
        let strip_collection = collections::is_view(self.kind)
            || matches!(self.kind, NodeKind::ItemsRepeater | NodeKind::ComboBox | NodeKind::AutoSuggestBox);
        if self.props.nav_controls.items.is_empty() && self.props.segmented_source.is_none()
            && self.props.table.is_none() && !strip_collection
        {
            return std::borrow::Cow::Borrowed(&self.props);
        }
        let mut properties = self.props.clone();
        properties.nav_controls.items = Default::default();
        properties.segmented_source = None;
        if let Some(table) = properties.table.as_mut() {
            table.items = Default::default();
            table.selected_keys.clear();
            table.selected_cells.clear();
        }
        if strip_collection {
            properties.collection_items = Default::default();
            properties.selected_keys = Default::default();
        }
        std::borrow::Cow::Owned(properties)
    }
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SceneEvent {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub collection: Option<collections::CollectionEvent>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub payload: Option<serde_json::Value>,
    #[serde(skip)]
    pub(crate) composed_processed: bool,
    #[serde(skip)] pub(crate) command_processed:bool,
    #[serde(skip)] pub(crate) menu_processed:bool,
    #[serde(skip)] pub(crate) reading_processed:bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub selected_keys: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub close_reason: Option<InfoBarCloseReason>,
    pub target: u32,
    pub kind: EventKind,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub item_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_checked: Option<Option<bool>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_on: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub selected_index: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub selection_start: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub selection_length: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub view: Option<scroll::ScrollSnapshot>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_expanded: Option<bool>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeSnapshot<P = Box<NodeProperties>> {
    pub table:Option<table_view::TableSnapshot>,
    pub pointer: PointerPresentation,
    pub primitive:Option<serde_json::Value>,
    pub content_host:Option<serde_json::Value>,
    pub reading:Option<serde_json::Value>,
    pub repeater:Option<repeater::RepeaterSnapshot>,
    pub refresh:Option<refresh::RefreshSnapshot>,
    pub ui_command: Option<view_controls::CommandMetadata>,
    pub view_control: Option<serde_json::Value>,
    #[serde(skip_serializing_if="Option::is_none")]
    pub command:Option<command_controls::CommandSnapshot>,
    pub navigation_control: Option<navigation_controls::NavigationSnapshot>,
    pub collection_item_visual: Option<collections::CollectionItemVisual>,
    pub collection_indicator: Option<collections::CollectionIndicatorVisual>,
    pub composed: Option<composed::ComposedSnapshot>,
    #[serde(skip_serializing_if="Option::is_none")]
    pub picker: Option<picker_controls::PickerSnapshot>,
    pub composed_owner: Option<u32>,
    pub composed_kind: Option<NodeKind>,
    pub collection: Option<collections::CollectionSnapshot>,
    pub compact: Option<compact_controls::CompactSnapshot>,
    pub id: u32,
    pub parent: Option<u32>,
    pub children: Vec<u32>,
    pub kind: NodeKind,
    pub rect: Rect,
    pub desired: [f64; 2],
    pub world: Matrix,
    pub state: ControlState,
    pub theme: Theme,
    pub enabled: bool,
    pub visible: bool,
    pub focused: bool,
    pub composition_depth:f64,
    pub tab_stop: bool,
    pub props: P,
    pub text: TextLayout,
    pub template_part: Option<String>,
    pub navigation_owner: Option<u32>,
    pub layout_version: u64,
    pub paint_version: u64,
    pub navigation: Option<crate::navigation::Snapshot>,
    pub presentation: VisualValues,
    pub material_weight: f64,
    pub material_colors: Option<crate::material::AcrylicColors>,
    pub local_transform: [f64; 6],
    pub editor: Option<text_edit::EditorSnapshot>,
    pub scroll: Option<scroll::ScrollSnapshot>,
    pub progress: Option<progress::ProgressSnapshot>,
    pub repeat: Option<basic_next::RepeatSnapshot>,
    pub viewbox: Option<basic_next::ViewboxSnapshot>,
    pub expander: Option<five_controls::ExpanderSnapshot>,
    pub overlay: Option<overlays::OverlaySnapshot>,
    pub slider: Option<slider::SliderSnapshot>,
    pub animated_icon: Option<crate::animated_icon::Snapshot>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot<P = Box<NodeProperties>> {
    #[serde(skip_serializing_if="Vec::is_empty")]
    pub unresolved_element_references:Vec<UnresolvedElementReference>,
    /// Rust-owned input root while a windowed choice popup blocks background scrolling.
    pub background_scroll_root: Option<u32>,
    /// Auto-sized host extent, including native template presentation overflow.
    pub presentation_height: f64,
    pub surface_bounds: Rect,
    pub time: f64,
    pub root: u32,
    pub nodes: Vec<NodeSnapshot<P>>,
    pub events: Vec<SceneEvent>,
    pub focused: Option<u32>,
    pub captured: Option<i32>,
    pub animating: bool,
    pub layout_passes: u64,
    pub revision: u64,
    pub animation_completions: Vec<AnimationCompletion>,
    pub image_requests: Vec<String>,
    pub image_sources: Vec<String>,
    pub next_frame_at: Option<f64>,
}
#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Update {
    pub id: u32,
    pub patch: serde_json::Value,
}
pub struct Scene {
    motion_runtime:motion_effects::MotionRuntime,
    composed_syncing: bool,
    composed_shift: bool,
    segmented_modifiers: (bool,bool),
    next_composed_request: u32,
    pub nodes: BTreeMap<u32, Box<Node>>,
    pub root: u32,
    next: u32,
    pub width: f64,
    pub height: f64,
    pub auto_height: bool,
    /// Host window bounds in scene coordinates; standalone scenes default to their own surface.
    pub popup_viewport: Option<Rect>,
    pub dpr: f64,
    pub theme: Theme,
    pub reduced_motion: bool,
    pub reduced_transparency: bool,
    animations: BTreeMap<u32, motion::Animation>,
    animation_completions: Vec<AnimationCompletion>,
    next_animation: u32,
    pub time: f64,
    pub focused: Option<u32>,
    pub captured: Option<(i32, u32)>,
    pub events: Vec<SceneEvent>,
    dirty: bool,
    revision: u64,
    pub layout_passes: u64,
    pub images: HashMap<String, [f64; 2]>,
    pub pointer: Option<(f64, f64)>,
    menu_input_narrow: bool,
    menu_pointer_touch: bool,
    pending_bring_into_view: Option<u32>,
    realizing_collection: Option<u32>,
    picker_template_depth:usize,
    element_references_dirty:bool,
    unresolved_element_references:Vec<UnresolvedElementReference>,
}
impl Scene {
    pub fn new(theme: Theme, reduced_motion: bool) -> Self {
        let mut s = Self {
            motion_runtime:Default::default(),
            composed_syncing: false,
            composed_shift: false,
            segmented_modifiers: (false,false),
            next_composed_request: 0,
            realizing_collection: None,
            picker_template_depth:0,
            element_references_dirty:true,
            unresolved_element_references:vec![],
            nodes: BTreeMap::new(),
            root: 1,
            next: 1,
            width: 0.,
            height: 0.,
            auto_height: false,
            popup_viewport: None,
            dpr: 1.,
            theme,
            reduced_motion,
            reduced_transparency: false,
            animations: BTreeMap::new(),
            animation_completions: vec![],
            next_animation: 0,
            time: 0.,
            focused: None,
            captured: None,
            events: vec![],
            dirty: true,
            revision: 1,
            layout_passes: 0,
            images: HashMap::new(),
            pointer: None,
            menu_input_narrow: false,
            menu_pointer_touch: false,
            pending_bring_into_view: None,
        };
        s.nodes.insert(
            1,
            Box::new(Self::node(1, None, NodeKind::Grid, NodeProperties::defaults(NodeKind::Grid)).unwrap()),
        );
        s
    }
    fn node(
        id: u32,
        parent: Option<u32>,
        kind: NodeKind,
        props: NodeProperties,
    ) -> Result<Node, String> {
        let nav = if kind == NodeKind::NavigationView {
            Some(Box::new(NavigationView::new(*props.navigation.clone().unwrap())?))
        } else {
            None
        };
        let icon_path = crate::icon_source::path(kind, &props)?;
        let shape_path = if crate::shapes::is_shape(kind) {
            Some(crate::shapes::geometry(kind, &props)?)
        } else {
            None
        };
        let mut editor = ControlStateStorage::new(&EDITOR_STATE);
        if let Some(doc)=&props.document {editor.typing_format=doc.format_at(props.selection_start.saturating_sub(1));}
        Ok(Node {
            segmented: Default::default(),
            navigation_template:Default::default(),
            table: ControlStateStorage::new(&TABLE_STATE),
            primitive:Default::default(),
            menu_item:Default::default(),
            content_host: ControlStateStorage::new(&CONTENT_HOST_STATE),
            reading: ControlStateStorage::new(&READING_STATE),
            repeater: ControlStateStorage::new(&REPEATER_STATE),
            refresh: Default::default(),
            view_control: ControlStateStorage::new(&VIEW_STATE),
            command:Default::default(),
            menu:Default::default(),panel:Default::default(),
            nav_controls: ControlStateStorage::new(&NAVIGATION_STATE),
            composed: Default::default(),
            picker: ControlStateStorage::new(&PICKER_STATE),
            collection: ControlStateStorage::new(&COLLECTION_STATE),
            compact: Default::default(),
            id,
            parent,
            children: vec![],
            kind,
            effects: ControlStateStorage::new(&EFFECT_STATE),
            presentation: VisualValues::from_props(&props),
            material_motion: motion::material_motion(),
            material_colors: Default::default(),
            props,
            rect: Rect::default(),
            world: Matrix::default(),
            desired: [0.; 2],
            desired_without_margin: [0.; 2],
            theme: Theme::Light,
            enabled: true,
            visible: true,
            text: TextLayout::default(),
            button: ButtonState::default(),
            selection_visual: ControlStateStorage::new(&SELECTION_STATE),
            editor,
            scroll: ControlStateStorage::new(&SCROLL_STATE),
            progress: ControlStateStorage::new(&PROGRESS_STATE),
            repeat: Default::default(),
            viewbox: Default::default(),
            expander: ControlStateStorage::new(&EXPANDER_STATE),
            header_text: Default::default(),
            overlay: Default::default(),
            slider: ControlStateStorage::new(&SLIDER_STATE),
            shape_path,
            icon_path,
            animated_icon: Default::default(),
            accept: Default::default(),
            nav,
            layout_version: 0,
            paint_version: 0,
        })
    }
    pub fn get(&self, id: u32) -> Result<&Node, String> {
        self.nodes
            .get(&id)
            .map(Box::as_ref)
            .ok_or_else(|| format!("invalid or destroyed scene node {id}"))
    }
    pub fn properties(&self, id: u32) -> Result<NodeProperties, String> {
        let node = self.get(id)?;
        let mut p = node.props.clone();
        if let Some(nav) = &node.nav {
            p.navigation = Some(Box::new(nav.props.clone()));
        }
        Ok(p)
    }
    pub fn create(
        &mut self,
        parent: u32,
        kind: NodeKind,
        patch: serde_json::Value,
    ) -> Result<u32, String> {
        self.create_with_table_items(parent, kind, patch, None)
    }
    pub(crate) fn create_with_table_items(
        &mut self,
        parent: u32,
        kind: NodeKind,
        mut patch: serde_json::Value,
        table_items: Option<std::sync::Arc<Vec<table_view::Row>>>,
    ) -> Result<u32, String> {
        let parent = self.navigation_content_parent(parent)?;
        let parent = self.primitive_content_parent(parent)?;
        if ((navigation_view::is_item(kind)&&kind!=NodeKind::NavigationViewItem)||kind==NodeKind::ItemsRepeaterScrollHost)
            && self.nodes[&parent].navigation_template.owner.is_none()
            && !self.nodes[&parent].navigation_template.building{
            return Err("NavigationView template containers are owned by NavigationView".into());
        }
        let parent = self.composed_content_parent(parent, kind)?;
        self.can_parent(parent, kind)?;
        self.preflight_menu_item(parent,kind)?;
        if composed::is_control(kind) || picker_controls::is_control(kind) {
            let mut depth = 0;
            let mut at = Some(parent);
            while let Some(id) = at {
                depth += 1;
                at = self.nodes[&id].parent;
            }
            if depth > 54 {
                return Err("Composed template would exceed the scene depth limit".into());
            }
            if self.next.checked_add(40).is_none() {
                return Err("Composed template handle limit reached".into());
            }
        }
        if matches!(kind, NodeKind::CollectionItem | NodeKind::CollectionHeader)
            && self.realizing_collection != Some(parent)
        {
            return Err("CollectionItem lifetime is owned by ListView/GridView".into());
        }
        if collections::is_view(self.nodes[&parent].kind)
            && !matches!(kind, NodeKind::CollectionItem | NodeKind::CollectionHeader)
        {
            return Err("ListView/GridView content comes from items and item templates".into());
        }
        if self.nodes.len()
            + if picker_controls::is_control(kind) {
                600
            } else if composed::is_control(kind) {
                40
            } else if kind == NodeKind::ItemsPresenter {
                6
            } else if kind == NodeKind::InfoBar {
                4
            } else if kind == NodeKind::Slider {
                2
            } else {
                1
            }
            > 5000
        {
            return Err("scene node limit reached".into());
        }
        if matches!(
            self.nodes[&parent].kind,
            NodeKind::Viewbox | NodeKind::Border | NodeKind::ParallaxView
        ) && !view_controls::is_command(kind) && !self.ordered_children(parent).is_empty()
        {
            return Err(format!(
                "{} accepts exactly one child; use a panel to combine content",
                self.nodes[&parent].kind.as_str()
            ));
        }
        if matches!(self.nodes[&parent].kind,NodeKind::ScrollViewer|NodeKind::ScrollView|NodeKind::ScrollContentPresenter)
            && !view_controls::is_command(kind)
            && (!self.ordered_children(parent).is_empty()
                || self.nodes[&parent].scroll.host.is_some())
        {
            return Err("ScrollViewer accepts one content child; use a layout panel".into());
        }
        if overlays::is_overlay(self.nodes[&parent].kind)
            && !overlays::is_overlay(kind)
            && !menu_item_controls::is_item(kind)
            && self.nodes[&parent]
                .children
                .iter()
                .any(|c| !overlays::is_overlay(self.nodes[c].kind))
        {
            return Err(
                "Floating content accepts one child; use a panel to combine content".into(),
            );
        }
        let mut props = properties::create(&mut patch, kind, table_items)?;
        if props.is_expander_header && (kind != NodeKind::Grid || self.nodes[&parent].kind != NodeKind::Expander) {
            return Err("Expander header slot must be a Grid directly owned by an Expander".into());
        }
        if !view_controls::is_command(kind) && self.nodes[&parent].kind == NodeKind::Expander && self.nodes[&parent].children.iter().any(|child| !view_controls::is_command(self.nodes[child].kind) && self.nodes[child].props.is_expander_header == props.is_expander_header) {
            return Err("Expander accepts one header slot and one content child; combine content in a panel".into());
        }
        self.preflight_content_host(parent,kind,&props)?;
        self.validate_primitive_references(self.next.saturating_add(1),kind,&props)?;
        self.validate_view_references(self.next.saturating_add(1), &props,None)?;
        if !view_controls::is_command(kind)&&matches!(self.nodes[&parent].kind,NodeKind::SplitView|NodeKind::SemanticZoom){
            let slot=props.view_controls.as_deref().cloned().unwrap_or_default().slot;
            if self.nodes[&parent].children.iter().any(|c|view_controls::props(&self.nodes[c]).slot==slot){return Err("view content slot already exists; compose a panel inside it".into());}
        }
        // On its initial SizeChanged both dimensions differ from zero. The
        // native PersonPicture chooses the smaller styled/local dimension.
        if kind == NodeKind::PersonPicture {
            let size = patch
                .get("width")
                .and_then(serde_json::Value::as_f64)
                .unwrap_or(96.)
                .min(
                    patch
                        .get("height")
                        .and_then(serde_json::Value::as_f64)
                        .unwrap_or(96.),
                );
            props.width = Some(size);
            props.height = Some(size);
        }
        self.validate_compact_target(&props)?;
        if self.nodes[&parent].kind == NodeKind::InfoBar && !overlays::is_overlay(kind) {
            let close = self.nodes[&parent].compact.close_button;
            if self.nodes[&parent].children.iter().any(|c| {
                Some(*c) != close
                    && self.nodes[c].props.is_info_bar_action == props.is_info_bar_action
            }) {
                return Err("InfoBar accepts one content child and one action child; combine content in a panel".into());
            }
        }
        if let Some(target) = props.placement_target {
            if !self.nodes.contains_key(&target) {
                return Err("invalid placement target".into());
            }
        }
        if kind == NodeKind::RadioButtons && !props.items.is_empty() {
            let mut depth = 0;
            let mut at = Some(parent);
            while let Some(id) = at {
                depth += 1;
                at = self.nodes[&id].parent;
            }
            if depth >= 63 {
                return Err("scene depth limit reached".into());
            }
        }
        if kind == NodeKind::RadioButtons && self.nodes.len() + props.items.len() + 1 > 5000 {
            return Err("scene node limit reached".into());
        }
        let id = self
            .next
            .checked_add(1)
            .ok_or("scene handle space exhausted")?;
        let mut node = Self::node(id, Some(parent), kind, props)?;
        if kind == NodeKind::ToolTip {
            node.overlay.manual_tooltip = patch.get("isOpen").is_some();
            node.overlay.local_horizontal_offset = patch.get("horizontalOffset").is_some();
            node.overlay.local_vertical_offset = patch.get("verticalOffset").is_some();
        }
        if !node.props.name.is_empty()||!node.props.element_references.is_empty(){self.validate_element_names(&[(id,kind,&node.props)])?;self.element_references_dirty=true;}
        if !node.props.name.is_empty() && self.nodes.values().any(|source|source.props.element_references.get(&ElementReferenceProperty::PlacementTarget).and_then(|n|n.as_ref())==Some(&node.props.name)&&self.descendant_of(parent,source.id)) {
            return Err("placement target must be outside its content subtree".into());
        }
        self.nodes.insert(id, Box::new(node));
        self.nodes.get_mut(&parent).unwrap().children.push(id);
        self.next = id;
        if menu_item_controls::is_item(kind) {
            self.nodes.get_mut(&parent).unwrap().menu_item.children_mode=true;
            if kind==NodeKind::RadioMenuFlyoutItem && self.nodes[&id].props.is_checked==Some(true) { self.update(vec![Update{id,patch:serde_json::json!({"isChecked":true})}])?; }
        }
        if composed::is_control(kind) {
            self.init_composed(id)?;
        }
        if kind==NodeKind::SemanticZoom{self.init_view_control(id)?;}
        if refresh::is_control(kind){self.init_refresh(id)?;}
        if picker_controls::is_control(kind) { self.init_picker(id)?; }
        if command_controls::is_control(kind){self.init_command(id)?;}
        if command_menus::is_control(kind){self.init_command_menu(id)?;}
        if (self.nodes[&parent].kind==NodeKind::Button||compact_controls::is_split(self.nodes[&parent].kind)||command_controls::is_action(self.nodes[&parent].kind))
            && matches!(kind, NodeKind::Flyout | NodeKind::MenuFlyout | NodeKind::CommandBarFlyout)
        {
            self.nodes.get_mut(&parent).unwrap().props.flyout_target = Some(id);
            self.nodes.get_mut(&id).unwrap().props.placement_target = Some(parent);
        }
        if kind == NodeKind::InfoBar {
            let size =
                (compact_controls::metric("InfoBarCloseButtonSize") * self.dpr).round() / self.dpr;
            let close=self.create(id,NodeKind::Button,serde_json::json!({"width":size,"height":size,"padding":compact_controls::contract()["infoBarCloseButton"]["padding"],"horizontalAlignment":"Left","verticalAlignment":"Top","accessibleName":"Close","visible":self.nodes[&id].props.is_open&&self.nodes[&id].props.is_closable}))?;
            self.nodes.get_mut(&id).unwrap().compact.close_button = Some(close);
            let glyph_size = compact_controls::metric("InfoBarCloseButtonGlyphSize");
            let viewbox=self.create(close,NodeKind::Viewbox,serde_json::json!({"width":glyph_size,"height":glyph_size,"horizontalAlignment":"Center","verticalAlignment":"Center"}))?;
            self.create(viewbox,NodeKind::SymbolIcon,serde_json::json!({"symbol":"Cancel","fontSize":20,"horizontalAlignment":"Center","verticalAlignment":"Center"}))?;
        }
        if kind == NodeKind::Slider {
            let tip = self.create(
                id,
                NodeKind::ToolTip,
                serde_json::json!({"placementTarget":id,"fontSize":15,"padding":[8,3,8,5]}),
            )?;
            self.nodes.get_mut(&id).unwrap().slider.tooltip = Some(tip);
        }
        self.init_primitive(id)?;
        self.init_navigation_template(id,&patch)?;
        if content_hosts::is_host(kind){self.sync_content_host(id)?;}
        self.invalidate(parent, true);
        if kind == NodeKind::RadioButtons {
            self.rebuild_radio_items(id)?;
        }
        if kind == NodeKind::RadioButton && self.nodes[&id].props.is_checked == Some(true) {
            self.update(vec![Update {
                id,
                patch: serde_json::json!({"isChecked":true}),
            }])?;
        }
        Ok(id)
    }
    fn can_parent(&self, parent: u32, child_kind: NodeKind) -> Result<(), String> {
        let p = self.get(parent)?;
        if p.navigation_template.slot&&!p.children.is_empty(){return Err("NavigationView content slots accept one root; use a panel".into());}
        if p.kind==NodeKind::ItemsPresenter&&!p.primitive.building{return Err("ItemsPresenter owns its template parts".into())}
        if p.primitive.owner.is_some_and(|owner|self.nodes[&owner].primitive.items==Some(parent)){
            if !p.children.is_empty(){return Err("ItemsPresenter accepts one items panel; combine children in a panel".into())}
            if !collections::is_panel(child_kind)&&!matches!(child_kind,NodeKind::Grid|NodeKind::StackPanel|NodeKind::Canvas|NodeKind::RelativePanel|NodeKind::WrapPanel|NodeKind::LayoutPanel){return Err("ItemsPresenter content must be a layout panel".into())}
        }
        if p.kind==NodeKind::ScrollContentPresenter&&!self.ordered_children(parent).is_empty(){return Err("ScrollContentPresenter accepts one child".into())}
        if menu_item_controls::is_item(child_kind) {return self.preflight_menu_item(parent,child_kind);}
        if content_hosts::is_host(p.kind) {
            if p.kind==NodeKind::Frame&&!p.content_host.creating{return Err("Frame owns its Page children; register pages and navigate".into())}
            if p.kind!=NodeKind::Frame&&!p.content_host.creating&&!overlays::is_overlay(child_kind)&&(!self.ordered_children(parent).is_empty()||content_hosts::props(&p.props).content.is_some()||content_hosts::props(&p.props).content_template.is_some()){return Err("Content host accepts one child; use a panel".into())}
        }
        if p.kind==NodeKind::ItemsRepeater&&!p.repeater.creating{return Err("ItemsRepeater owns its realized children; use an item template".into());}
        if p.kind==NodeKind::RefreshContainer&&child_kind!=NodeKind::RefreshVisualizer&&p.children.iter().any(|c|Some(*c)!=p.refresh.visualizer){return Err("RefreshContainer accepts one content child".into());}
        if picker_controls::is_control(p.kind){return if self.picker_template_depth>0{Ok(())}else{Err("Picker template children are owned by the control".into())};}
        if p.kind == NodeKind::Slider && child_kind == NodeKind::ToolTip {
            return Ok(());
        }
        if p.kind == NodeKind::Segmented && !overlays::is_overlay(child_kind) {
            if child_kind != NodeKind::SegmentedItem { return Err("Segmented accepts SegmentedItem children".into()); }
            if !self.can_add_segmented_item(parent) {return Err("Use SegmentedItem children or itemsSource".into());}
        }
        if child_kind == NodeKind::SegmentedItem && p.kind != NodeKind::Segmented { return Err("SegmentedItem requires a Segmented parent".into()); }
        if p.kind == NodeKind::MenuBar && child_kind!=NodeKind::MenuBarItem{return Err("MenuBar accepts MenuBarItem children".into());}
        if p.kind == NodeKind::MenuBarItem && child_kind!=NodeKind::MenuFlyout{return Err("MenuBarItem uses items; content is Rust-owned".into());}
        if p.kind == NodeKind::MenuFlyout && child_kind==NodeKind::MenuFlyout{return Ok(());}
        if p.kind == NodeKind::MenuFlyout {
            return Err("MenuFlyout uses menuItems; content children are not supported".into());
        }
        if !matches!(
            p.kind,
            NodeKind::Segmented|NodeKind::SegmentedItem|NodeKind::NavigationView|NodeKind::NavigationViewItem|NodeKind::NavigationViewItemHeader|NodeKind::NavigationViewItemSeparator|NodeKind::NavigationViewItemPresenter|NodeKind::ItemsRepeaterScrollHost|NodeKind::TableView|NodeKind::ItemsPresenter|NodeKind::ContentControl|NodeKind::ContentPresenter|NodeKind::UserControl|NodeKind::Page|NodeKind::Frame|NodeKind::FlipView
                | NodeKind::PipsPager
                | NodeKind::BreadcrumbBar
                | NodeKind::TreeView
                | NodeKind::TabView
                |
            NodeKind::ItemsView | NodeKind::ListView
                | NodeKind::AutoSuggestBox
                | NodeKind::NumberBox
                | NodeKind::ComboBox
                | NodeKind::ContentDialog
                | NodeKind::TeachingTip
                | NodeKind::GridView
                | NodeKind::CollectionItem | NodeKind::CollectionHeader
                | NodeKind::ItemsStackPanel
                | NodeKind::ItemsWrapGrid
                | NodeKind::VariableSizedWrapGrid
                | NodeKind::Popup
                | NodeKind::InfoBar
                | NodeKind::AppBarButton | NodeKind::AppBarToggleButton | NodeKind::DropDownButton | NodeKind::CommandBar | NodeKind::SelectorBar | NodeKind::SplitButton
                | NodeKind::ToggleSplitButton
                | NodeKind::ToolTip
                | NodeKind::MenuBar | NodeKind::MenuBarItem | NodeKind::CommandBarFlyout | NodeKind::RelativePanel | NodeKind::WrapPanel
                | NodeKind::Flyout
                | NodeKind::MenuFlyout
                | NodeKind::Grid
                | NodeKind::RichTextBlock | NodeKind::RichTextBlockOverflow | NodeKind::AnnotatedScrollBar | NodeKind::PagerControl | NodeKind::LayoutPanel | NodeKind::StackPanel | NodeKind::ItemsRepeater | NodeKind::RefreshContainer | NodeKind::RefreshVisualizer
                | NodeKind::Button
                | NodeKind::RepeatButton
                | NodeKind::HyperlinkButton
                | NodeKind::ToggleButton
                | NodeKind::CheckBox
                | NodeKind::RadioButton
                | NodeKind::RadioButtons
                | NodeKind::ScrollViewer | NodeKind::ScrollView | NodeKind::ScrollContentPresenter
                | NodeKind::Viewbox
                | NodeKind::Border
                | NodeKind::Canvas
                | NodeKind::SplitView | NodeKind::SemanticZoom | NodeKind::ParallaxView | NodeKind::SwipeControl
                | NodeKind::Expander
        ) {
            return Err("node cannot contain children".into());
        }
        let mut id = Some(parent);
        let mut depth = 0;
        let mut floating_content = false;
        while let Some(n) = id {
            depth += 1;
            if depth >= 64 {
                return Err("scene depth limit reached".into());
            }
            let node = self.get(n)?;
            floating_content |= overlays::is_overlay(node.kind);
            if !floating_content
                && crate::selection::is_button(node.kind)
                && !matches!(node.kind,NodeKind::Expander|NodeKind::NavigationViewItem)
                && matches!(
                    child_kind,
                    NodeKind::Button
                        | NodeKind::ItemsView | NodeKind::ListView
                        | NodeKind::GridView
                        | NodeKind::SplitButton
                        | NodeKind::ToggleSplitButton
                        | NodeKind::RatingControl
                        | NodeKind::RepeatButton
                        | NodeKind::HyperlinkButton
                        | NodeKind::ToggleButton
                        | NodeKind::CheckBox
                        | NodeKind::RadioButton
                        | NodeKind::RadioButtons
                        | NodeKind::TextBox
                        | NodeKind::RichEditBox
                        | NodeKind::NumberBox
                        | NodeKind::AutoSuggestBox
                        | NodeKind::ComboBox
                        | NodeKind::PasswordBox
                        | NodeKind::ScrollViewer | NodeKind::ScrollView | NodeKind::ScrollContentPresenter
                        | NodeKind::ToggleSwitch
                        | NodeKind::NavigationView

                        | NodeKind::Expander
                )
            {
                return Err("interactive controls cannot be nested inside Button content".into());
            }
            id = node.parent;
        }
        Ok(())
    }
    pub fn update(&mut self, updates: Vec<Update>) -> Result<(), String> {
        let mut staged: BTreeMap<u32, NodeProperties> = BTreeMap::new();
        let mut layout = false;
        for update in &updates {
            let node = self.get(update.id)?;
            if matches!(
                node.kind,
                NodeKind::CollectionItem | NodeKind::CollectionHeader
            ) && update.patch.as_object().is_some_and(|p| {
                ["collectionOwner", "collectionKey", "collectionIndex"]
                    .iter()
                    .any(|k| p.contains_key(*k))
            }) {
                return Err("collection item identity is owned by ListView/GridView".into());
            }
            let base = if let Some(p) = staged.get(&update.id) {
                p.clone()
            } else {
                self.properties(update.id)?
            };
            let properties = properties::patch(&base, &update.patch, node.kind)?;
            if node.kind == NodeKind::Segmented { self.validate_segmented_source_update(update.id, &properties)?; }
            staged.insert(update.id, properties);
            let object = update.patch.as_object().unwrap();
            layout |= object.keys().any(|k| {
                !matches!(
                    k.as_str(),
                    "background"
                        | "isChecked"
                        | "isThreeState"
                        | "foreground"
                        | "opacity"
                        | "transform"
                        | "translationX"
                        | "translationY"
                        | "translationZ"
                        | "scaleX"
                        | "scaleY"
                        | "rotation"
                        | "centerPoint"
                        | "acrylic"
                        | "acrylicResource"
                        | "variant"
                        | "clickMode"
                        | "accessibleName"
                )
            });
        }
        for (&id,props) in &staged {
            if props.is_expander_header != self.nodes[&id].props.is_expander_header {return Err("Expander slot identity cannot be changed".into());}
            if self.nodes[&id].kind == NodeKind::ComboBox && props.is_tree_combo != self.nodes[&id].props.is_tree_combo {
                return Err("ComboBox presenter type cannot change after creation".into());
            }
            if self.nodes[&id].kind==NodeKind::NavigationView {self.validate_navigation_slots(id,props)?;}
            self.validate_view_references(id,props,Some(&staged))?;self.validate_menu_item_patch(id,props)?;
        }
        self.stage_menu_radio_updates(&mut staged,&updates.iter().map(|u|u.id).collect::<Vec<_>>());
        let before: Vec<_> = self
            .nodes
            .values()
            .filter(|n| n.kind == NodeKind::RadioButtons)
            .map(|n| (n.id, n.props.selected_index))
            .collect();
        self.stage_radio_updates(
            &mut staged,
            &updates.iter().map(|u| u.id).collect::<Vec<_>>(),
        );
        let range_changed: Vec<u32> = staged
            .iter()
            .filter(|(id, p)| {
                matches!(
                    self.nodes[id].kind,
                    NodeKind::ProgressBar | NodeKind::Slider | NodeKind::ScrollBar
                ) && self.nodes[id].props.value != p.value
            })
            .map(|(id, _)| *id)
            .collect();
        for (id,p) in &staged {self.validate_primitive_references(*id,self.nodes[id].kind,p)?;self.validate_host_patch(*id,p)?;}
        for (id, p) in &staged {
            self.validate_compact_target(p)?;
            if let Some(target) = p.placement_target {
                if !self.nodes.contains_key(&target) || self.descendant_of(target, *id) {
                    return Err(
                        "placement target must be live and outside the floating content subtree"
                            .into(),
                    );
                }
            }
        }
        for (id, p) in &staged {
            if self.nodes[id].kind == NodeKind::RadioButtons && !p.items.is_empty() {
                self.can_parent(*id, NodeKind::RadioButton)?;
            }
        }
        let item_delta: i64 = staged
            .iter()
            .filter(|(id, _)| self.nodes[id].kind == NodeKind::RadioButtons)
            .map(|(id, p)| p.items.len() as i64 - self.nodes[id].children.len() as i64)
            .sum();
        if self.nodes.len() as i64 + item_delta > 5000 {
            return Err("scene node limit reached".into());
        }
        if staged.iter().any(|(id,p)|p.name!=self.nodes[id].props.name||p.element_references!=self.nodes[id].props.element_references){
            let changed:Vec<_>=staged.iter().map(|(id,p)|(*id,self.nodes[id].kind,p)).collect();self.validate_element_names(&changed)?;self.element_references_dirty=true;
        }
        // Hosts may submit the same named declaration again with an empty numeric
        // handle. Reassert bindings after all staged updates, including batches.
        if staged.values().any(|p|p.element_references.values().any(Option::is_some)){self.element_references_dirty=true;}
        let mut staged: Vec<_> = staged.into_iter().collect();
        staged.sort_by_key(|(id, p)| {
            u8::from(self.nodes[id].kind == NodeKind::RadioButton && p.is_checked == Some(true))
        });
        let mut rebuild = vec![];
        let mut picker_changes=Vec::new();
        for (id, props) in staged {
            if let (Some(old),Some(new))=(&self.nodes[&id].props.picker_controls,&props.picker_controls){picker_changes.push((id,(**old).clone(),(**new).clone()));}
            let keys: Vec<_> = updates
                .iter()
                .filter(|u| u.id == id)
                .flat_map(|u| u.patch.as_object().unwrap().keys())
                .filter(|k| {
                    matches!(
                        k.as_str(),
                        "opacity"
                            | "translationX"
                            | "translationY"
                        | "translationZ"
                            | "scaleX"
                            | "scaleY"
                            | "rotation"
                            | "centerPoint"
                    )
                })
                .map(String::as_str)
                .collect();
            if !keys.is_empty() {
                self.interrupt(id, keys.clone(), AnimationResult::Interrupted);
            }
            if self.nodes[&id].props.text!=props.text {self.capture_motion_exit(id);}
            self.capture_collection_anchor(id, &props);
            let implicit = self.implicit_updates(id,&props,&keys);
            let node = self.nodes.get_mut(&id).unwrap();
            if node.kind==NodeKind::NavigationView{for update in updates.iter().filter(|u|u.id==id){if let Some(p)=update.patch.get("navigation"){if let Some(v)=p.get("reducedMotion").and_then(serde_json::Value::as_bool){node.navigation_template.motion_override=Some(v);}if let Some(v)=p.get("reducedTransparency").and_then(serde_json::Value::as_bool){node.navigation_template.transparency_override=Some(v);}}}}
            let implicit_from=node.presentation;
            for key in &keys {node.effects.bindings.remove(*key);}
            if node.kind == NodeKind::ToolTip {
                node.overlay.local_horizontal_offset |= updates
                    .iter()
                    .any(|u| u.id == id && u.patch.get("horizontalOffset").is_some());
                node.overlay.local_vertical_offset |= updates
                    .iter()
                    .any(|u| u.id == id && u.patch.get("verticalOffset").is_some());
            }
            if node.kind == NodeKind::ToolTip
                && updates
                    .iter()
                    .any(|u| u.id == id && u.patch.get("isOpen").is_some())
            {
                node.overlay.manual_tooltip = true;
            }
            let checked_changed =
                (crate::selection::is_toggle(node.kind)||menu_item_controls::is_check(node.kind)) && node.props.is_checked != props.is_checked;
            let split_checked_changed = node.kind == NodeKind::ToggleSplitButton
                && node.props.is_checked != props.is_checked;
            let checked = props.is_checked;
            let on_changed = node.kind == NodeKind::ToggleSwitch && node.props.is_on != props.is_on;
            if node.kind == NodeKind::RadioButtons
                && serde_json::to_value(&node.props.items).unwrap()
                    != serde_json::to_value(&props.items).unwrap()
            {
                rebuild.push(id);
            }
            if let Some(nav) = &mut node.nav {
                nav.advance(self.time);
                nav.update(serde_json::json!([props.navigation]))
                    .expect("validated NavigationView properties");
            }
            for key in keys {
                match key {
                    "opacity" => node.presentation.opacity = props.opacity,
                    "rotation" => node.presentation.rotation = props.rotation,
                    "translationX" => node.presentation.translation_x = props.translation_x,
                    "translationY" => node.presentation.translation_y = props.translation_y,
                    "translationZ" => node.presentation.translation_z = props.translation_z,
                    "scaleX" => node.presentation.scale_x = props.scale_x,
                    "scaleY" => node.presentation.scale_y = props.scale_y,
                    _ => {}
                }
            }
            let text_changed = text_edit::is_editor(node.kind)
                && (text_edit::EditorState::logical(node.kind, &node.props)
                    != text_edit::EditorState::logical(node.kind, &props) || node.props.document != props.document);
            let selection_changed = text_edit::is_editor(node.kind)
                && (node.props.selection_start, node.props.selection_length)
                    != (props.selection_start, props.selection_length);
            if text_edit::is_editor(node.kind) && props.is_read_only && node.editor.draft.is_some()
            {
                node.editor.draft = None;
                node.editor.generation = node.editor.generation.wrapping_add(1);
            }
            if text_changed {
                node.editor.reset_programmatic();
                node.editor.blink_start = self.time;
            }
            let editor_kind = node.kind;
            let scroll_changed = collections::is_scroll_owner(node.kind)
                && (
                    node.props.horizontal_offset,
                    node.props.vertical_offset,
                    node.props.zoom_factor,
                    node.props.horizontal_scroll_mode,
                    node.props.vertical_scroll_mode,
                    node.props.horizontal_scroll_bar_visibility,
                    node.props.vertical_scroll_bar_visibility,
                ) != (
                    props.horizontal_offset,
                    props.vertical_offset,
                    props.zoom_factor,
                    props.horizontal_scroll_mode,
                    props.vertical_scroll_mode,
                    props.horizontal_scroll_bar_visibility,
                    props.vertical_scroll_bar_visibility,
                );
            let expansion_changed =
                node.kind == NodeKind::Expander && node.props.is_expanded != props.is_expanded;
            if crate::shapes::is_shape(node.kind) {
                node.shape_path =
                    Some(crate::shapes::geometry(node.kind, &props).expect("validated shape"));
            }
            if crate::icons::is_icon(node.kind) {
                node.icon_path =
                    crate::icon_source::path(node.kind, &props).expect("validated icon source");
            }
            if matches!(node.kind,NodeKind::FlipView|NodeKind::TabView)&&updates.iter().any(|u|u.id==id&&u.patch.get("selectedIndex").is_some()){node.nav_controls.selection_explicit=true;}
            node.props = props;
            if text_changed {if let Some(doc)=&node.props.document {node.editor.typing_format=doc.format_at(node.props.selection_start.saturating_sub(1));}}
            if scroll_changed {
                let p = &node.props;
                let (x, y, z) = (p.horizontal_offset, p.vertical_offset, p.zoom_factor);
                self.scroll_change(id, Some(x), Some(y), Some(z), false)?;
            }
            if expansion_changed {
                self.emit(
                    id,
                    if self.nodes[&id].props.is_expanded {
                        EventKind::Expanding
                    } else {
                        EventKind::Collapsed
                    },
                );
            }
            if text_changed {
                self.emit(
                    id,
                    if editor_kind == NodeKind::PasswordBox {
                        EventKind::PasswordChanged
                    } else {
                        EventKind::TextChanged
                    },
                );
            }
            if selection_changed {
                self.emit(id, EventKind::SelectionChanged);
            }
            if split_checked_changed {
                self.emit(id, EventKind::IsCheckedChanged);
                self.events.last_mut().unwrap().is_checked = Some(checked);
            }
            if checked_changed {
                if menu_item_controls::is_check(self.nodes[&id].kind){self.emit(id,EventKind::IsCheckedChanged);self.events.last_mut().unwrap().is_checked=Some(checked);}
                self.emit(
                    id,
                    match checked {
                        Some(true) => EventKind::Checked,
                        Some(false) => EventKind::Unchecked,
                        None => EventKind::Indeterminate,
                    },
                );
            }
            if on_changed {
                self.emit(id, EventKind::Toggled);
            }
            self.invalidate(id, layout);
            for (key,value,duration) in implicit {
                self.nodes.get_mut(&id).unwrap().presentation.set(&key,implicit_from.get(&key));
                self.animate(id,serde_json::json!({key:value}),AnimationOptions{duration,curve:Some([0.8,0.,0.2,1.]),..Default::default()}).expect("validated implicit transition");
            }
        }
        for update in &updates {
            if self.nodes[&update.id].kind == NodeKind::Segmented && update.patch.get("selectedIndex").is_some() {
                let node = self.nodes.get_mut(&update.id).unwrap();
                node.segmented.requested_index = Some(node.props.selected_index);
            }
        }
        for(id,old,new)in picker_changes{self.picker_value_events(id,&old,&new);}
        rebuild.sort_by_key(|id| {
            self.nodes[id].props.items.len() as i64 - self.nodes[id].children.len() as i64
        });
        for id in rebuild {
            self.rebuild_radio_items(id)?;
        }
        self.reconcile_radio_groups(&before);
        self.sync_menu_item_nodes();
        self.sync_sliders();
        self.sync_overlays();
        self.reconcile_input();
        self.sync_accept_visuals();
        self.sync_repeats();
        self.sync_expanders();
        for id in range_changed {
            self.emit(id, EventKind::ValueChanged);
        }
        Ok(())
    }
    pub(super) fn sync_accept_visuals(&mut self) {
        for n in self.nodes.values_mut() {
            if n.kind == NodeKind::CheckBox {
                n.accept.sync(
                    n.button.state(n.enabled),
                    n.props.is_checked,
                    self.time,
                    self.reduced_motion,
                );
            }
        }
        self.sync_selection_visuals();
    }
    pub fn reparent(&mut self, id: u32, parent: u32, index: Option<usize>) -> Result<(), String> {
        let parent=self.navigation_content_parent(parent)?;
        let parent=self.primitive_content_parent(parent)?;
        if self.get(id)?.parent==Some(parent)&&(self.get(parent)?.kind==NodeKind::ScrollContentPresenter||self.get(parent)?.primitive.owner.is_some()){return Ok(())}
        let kind = self.get(id)?.kind;
        if self.nodes[&id].navigation_template.owner.is_some(){return Err("NavigationView owns its template parts".into());}
        if self.nodes[&id].props.is_expander_header { return Err("Expander header slot cannot be reparented".into()); }
        if self.nodes[&id].primitive.owner.is_some(){return Err("Presenter template parts cannot be reparented".into())}
        if self.nodes[&id].content_host.owner.is_some(){return Err("Content host owns this template/page".into())}
        if self.nodes[&id].composed.owner.is_some()||self.nodes[&id].refresh.owner.is_some()||self.nodes[&id].parent.is_some_and(|p|self.nodes[&p].kind==NodeKind::ItemsRepeater) {
            return Err("Control template parts cannot be reparented".into());
        }
        let parent = self.composed_content_parent(parent, kind)?;
        if matches!(kind, NodeKind::CollectionItem | NodeKind::CollectionHeader) {
            return Err("CollectionItem parent is owned by its collection".into());
        }
        self.can_parent(parent, kind)?;
        if matches!(self.nodes[&parent].kind,NodeKind::ScrollViewer|NodeKind::ScrollView|NodeKind::ScrollContentPresenter)
            && (self.nodes[&parent].children.iter().any(|c| *c != id)
                || self.nodes[&parent].scroll.host.is_some())
        {
            return Err("ScrollViewer accepts one content child; use a layout panel".into());
        }
        if matches!(
            self.nodes[&parent].kind,
            NodeKind::Viewbox | NodeKind::Border
        ) && self.nodes[&parent]
            .children
            .iter()
            .any(|child| *child != id)
        {
            return Err(format!(
                "{} accepts exactly one child",
                self.nodes[&parent].kind.as_str()
            ));
        }
        if id == self.root {
            return Err("cannot reparent scene root".into());
        }
        self.validate_named_reparent(id,parent)?;
        if self.nodes[&parent].kind == NodeKind::Expander && self.nodes[&parent].children.iter().any(|child| *child != id && !self.nodes[child].props.is_expander_header) {
            return Err("Expander accepts one content child; combine content in a panel".into());
        }
        let mut p = Some(parent);
        while let Some(n) = p {
            if n == id {
                return Err("parent cycle rejected".into());
            }
            p = self.get(n)?.parent;
        }
        let mut ancestors = 0;
        let mut at = Some(parent);
        let mut inside_button = false;
        let mut floating_content = false;
        while let Some(a) = at {
            ancestors += 1;
            let n = self.get(a)?;
            floating_content |= overlays::is_overlay(n.kind);
            inside_button |= !floating_content
                && crate::selection::is_button(n.kind)
                && n.kind != NodeKind::Expander;
            at = n.parent;
        }
        let mut pending = vec![(id, 1, inside_button)];
        while let Some((node, depth, inside_button)) = pending.pop() {
            if ancestors + depth > 64 {
                return Err("scene depth limit reached".into());
            }
            let n = self.get(node)?;
            let inside_button = inside_button && !overlays::is_overlay(n.kind);
            if inside_button
                && matches!(
                    n.kind,
                    NodeKind::Button
                        | NodeKind::ItemsView | NodeKind::ListView
                        | NodeKind::GridView
                        | NodeKind::SplitButton
                        | NodeKind::ToggleSplitButton
                        | NodeKind::RatingControl
                        | NodeKind::RepeatButton
                        | NodeKind::HyperlinkButton
                        | NodeKind::ToggleButton
                        | NodeKind::CheckBox
                        | NodeKind::RadioButton
                        | NodeKind::RadioButtons
                        | NodeKind::TextBox
                        | NodeKind::RichEditBox
                        | NodeKind::NumberBox
                        | NodeKind::AutoSuggestBox
                        | NodeKind::ComboBox
                        | NodeKind::PasswordBox
                        | NodeKind::ScrollViewer | NodeKind::ScrollView | NodeKind::ScrollContentPresenter
                        | NodeKind::ToggleSwitch
                        | NodeKind::NavigationView

                        | NodeKind::Expander
                )
            {
                return Err("interactive controls cannot be nested inside Button content".into());
            }
            let child_inside = inside_button
                || (crate::selection::is_button(n.kind) && n.kind != NodeKind::Expander);
            pending.extend(n.children.iter().map(|id| (*id, depth + 1, child_inside)));
        }
        if self.nodes[&parent].kind == NodeKind::InfoBar {
            let close = self.nodes[&parent].compact.close_button;
            if self.nodes[&parent].children.iter().any(|c| {
                *c != id
                    && Some(*c) != close
                    && self.nodes[c].props.is_info_bar_action
                        == self.nodes[&id].props.is_info_bar_action
            }) {
                return Err("InfoBar accepts one content child and one action child".into());
            }
        }
        let old = self.get(id)?.parent.unwrap();
        self.nodes
            .get_mut(&old)
            .unwrap()
            .children
            .retain(|n| *n != id);
        let target = self.nodes.get_mut(&parent).unwrap();
        let index = index
            .unwrap_or(target.children.len())
            .min(target.children.len());
        target.children.insert(index, id);
        self.nodes.get_mut(&id).unwrap().parent = Some(parent);
        if menu_item_controls::is_item(kind){self.nodes.get_mut(&parent).unwrap().menu_item.children_mode=true;}
        if self.nodes[&old].props.flyout_target == Some(id) {
            self.nodes.get_mut(&old).unwrap().props.flyout_target = None;
            if self.nodes[&id].props.placement_target == Some(old) {
                self.nodes.get_mut(&id).unwrap().props.placement_target = None;
            }
        }
        if (self.nodes[&parent].kind==NodeKind::Button||compact_controls::is_split(self.nodes[&parent].kind)||command_controls::is_action(self.nodes[&parent].kind))
            && matches!(kind, NodeKind::Flyout | NodeKind::MenuFlyout | NodeKind::CommandBarFlyout)
        {
            self.nodes.get_mut(&parent).unwrap().props.flyout_target = Some(id);
            self.nodes.get_mut(&id).unwrap().props.placement_target = Some(parent);
        }
        self.invalidate(old, true);
        self.invalidate(parent, true);
        if kind == NodeKind::RadioButton && self.nodes[&id].props.is_checked == Some(true) {
            self.update(vec![Update {
                id,
                patch: serde_json::json!({"isChecked":true}),
            }])?;
        }
        Ok(())
    }
    pub fn destroy(&mut self, id: u32) -> Result<Vec<u32>, String> {
        self.element_references_dirty=true;
        if let Some(owner)=self.get(id)?.navigation_template.owner {
            if !self.nodes[&owner].navigation_template.building{return Err("NavigationView owns its template parts; dispose the control or update its content".into());}
        }
        if self.nodes.get(&id).is_some_and(|n|n.kind==NodeKind::RichTextBlock){let inlines=self.nodes[&id].reading.inline_nodes.values().copied().filter(|c|self.nodes.get(c).is_some_and(|n|n.parent!=Some(id))).collect::<Vec<_>>();for child in inlines{self.destroy(child)?;}}

        self.forget_navigation_slot(id);
        if id == self.root {
            return Err("dispose the Scene to destroy its root".into());
        }
        if self.get(id)?.primitive.owner.is_some(){return Err("Presenter template part is owned by ItemsPresenter".into())}
        if self.get(id)?.content_host.owner.is_some(){return Err("Content host owns this template/page; dispose the host".into())}
        if self.get(id)?.composed.owner.is_some()||self.get(id)?.refresh.owner.is_some() {
            return Err("Control template parts are owned by their control".into());
        }
        let parent = self.get(id)?.parent.unwrap();
        self.capture_motion_exit(id);
        let mut pending = vec![id];
        let mut removed = vec![];
        while let Some(id) = pending.pop() {
            self.interrupt(id, vec![], AnimationResult::Disposed);
            let node = self.nodes.remove(&id).unwrap();
            pending.extend(node.children);
            removed.push(id);
        }
        self.nodes
            .get_mut(&parent)
            .unwrap()
            .children
            .retain(|n| *n != id);
        self.events.retain(|e| !removed.contains(&e.target));
        self.detach_motion_sources(&removed);
        fn detach_menu_commands(items: &mut [overlays::MenuEntry], removed: &[u32]) {
            for item in items {
                if item.command.is_some_and(|c| removed.contains(&c)) {
                    item.command = None;
                    item.command_metadata = None;
                    item.enabled = item.command_base_enabled.take().unwrap_or(item.enabled);
                }
                detach_menu_commands(&mut item.items, removed);
            }
        }
        for node in self.nodes.values_mut() {
            detach_menu_commands(&mut node.props.menu_items, &removed);
            if let Some(menu) = &mut node.props.menu_controls { for item in &mut menu.items { detach_menu_commands(&mut item.items, &removed); } }
            if let Some(q)=&mut node.props.primitives{if q.source.is_some_and(|s|removed.contains(&s)){q.source=None;}if q.scroll_target.is_some_and(|s|removed.contains(&s)){q.scroll_target=None;}}
            if let Some(repeater) = node.repeater.allocated_mut() {
                repeater.realized.retain(|_, id| !removed.contains(id));
            }
            if let Some(q)=&mut node.props.reading {if q.label_item_source.is_some_and(|t|removed.contains(&t)){q.label_item_source=None;}if q.scroll_target.is_some_and(|t|removed.contains(&t)){q.scroll_target=None;}if q.overflow_content_target.is_some_and(|t|removed.contains(&t)){q.overflow_content_target=None;}for c in [&mut q.first_button_command,&mut q.previous_button_command,&mut q.next_button_command,&mut q.last_button_command,&mut q.pager_input_command]{if c.is_some_and(|id|removed.contains(&id)){*c=None;}}}
            if let Some(v)=&mut node.props.view_controls {if v.command.is_some_and(|c|removed.contains(&c)){v.command=None;}if v.source.is_some_and(|c|removed.contains(&c)){v.source=None;}for side in [&mut v.left_items,&mut v.right_items,&mut v.top_items,&mut v.bottom_items].into_iter().flatten(){for item in &mut side.items{if item.command.is_some_and(|c|removed.contains(&c)){item.command=None;}}}}
            if let Some(collection) = node.collection.allocated_mut() {
                collection.realized.retain(|_, id| !removed.contains(id));
            }
            if node
                .props
                .flyout_target
                .is_some_and(|target| removed.contains(&target))
            {
                node.props.flyout_target = None;
            }
            if node.props.context_flyout_target.is_some_and(|target|removed.contains(&target)) {
                node.props.context_flyout_target=None;
            }
        }
        if self.focused.is_some_and(|n| removed.contains(&n)) {
            self.focused = None;
        }
        if self.captured.is_some_and(|(_, n)| removed.contains(&n)) {
            self.captured = None;
        }
        self.invalidate(parent, true);
        self.sync_menu_item_nodes();
        Ok(removed)
    }
    pub fn invalidate(&mut self, id: u32, layout: bool) {
        self.revision += 1;
        self.dirty |= layout;
        let mut at = Some(id);
        while let Some(id) = at {
            let node = self.nodes.get_mut(&id).unwrap();
            node.paint_version = self.revision;
            if layout {
                node.layout_version = self.revision;
            }
            at = node.parent;
        }
    }
    pub fn resize(&mut self, width: f64, height: f64, dpr: f64) -> Result<(), String> {
        if [width, height, dpr].iter().any(|v| !v.is_finite())
            || width < 0.
            || height < 0.
            || !(0.1..=8.).contains(&dpr)
        {
            return Err("invalid viewport/DPR".into());
        }
        if (self.width, self.height, self.dpr) != (width, height, dpr) {
            self.width = width;
            self.height = height;
            self.dpr = dpr;
            self.invalidate(self.root, true);
        }
        Ok(())
    }
    pub fn advance(&mut self, time: f64) {
        self.resolve_element_names();
        if time.is_finite() {
            self.time = self.time.max(time);
        }
        self.reading_tick();
        self.primitive_tick();
        self.sync_expanders();
        self.advance_animations();
        self.scroll_tick();
        self.collection_drag_tick();
        self.table_drag_tick();
        self.repeat_tick();
        self.sync_sliders();
        self.tooltip_tick();
        self.menu_entry_tick();
        for n in self.nodes.values_mut() {
            if let Some(nav) = &mut n.nav {
                let geometry=nav.pane_motion.active(nav.now)||nav.hierarchy_motion.active(nav.now);
                let scroll=(nav.scroll,nav.content_scroll);
                nav.advance(self.time);
                let geometry=geometry||nav.pane_motion.active(nav.now)||nav.hierarchy_motion.active(nav.now)||scroll!=(nav.scroll,nav.content_scroll);
                if geometry{nav.layout();}
                // Indicator, Acrylic, icon and scrollbar opacity timelines paint
                // from the Rust sample; they do not change the page's layout.
                self.dirty |=geometry;
            }
        }
    }
    pub fn layout(&mut self, measure: &mut impl TextMeasurer) {
        self.resolve_element_names();
        self.pump_table_events();
        self.sync_primitives();
        self.sync_content_hosts();
        self.sync_navigation_templates();
        self.sync_navigation_item_visuals();
        self.sync_reading();
        self.sync_menu_item_nodes();
        self.sync_view_controls();
        if self.nodes.values().any(|n|n.view_control.motion.active(self.time)){self.dirty=true;}
        self.sync_pickers();
        self.pump_command_menu_events();
        self.sync_command_menus();
        self.sync_menu_commands();
        self.sync_menu_entries();
        self.sync_commands();
        self.pump_command_menu_events();
        self.pump_command_events();
        self.sync_segmented();
        self.sync_navigation_controls();
        self.pump_navigation_control_events();
        self.pump_composed_events();
        self.sync_pickers();
        self.sync_composed();
        self.pump_composed_events();
        for n in self.nodes.values_mut() {
            if let Some(collection) = n.collection.allocated_mut() {
                collection.layout_unsettled = false;
            }
            if let Some(repeater) = n.repeater.allocated_mut() {
                repeater.unsettled = false;
            }
        }
        self.sync_collections();
        self.sync_compact();
        self.sync_expanders();
        self.sync_overlays();
        if self.dirty {
            self.measure_node(
                self.root,
                [
                    self.width,
                    if self.auto_height {
                        f64::INFINITY
                    } else {
                        self.height
                    },
                ],
                measure,
            );
            self.arrange_node(
                self.root,
                Rect::new(0., 0., self.width, if self.auto_height{self.nodes[&self.root].desired[1]}else{self.height}),
                Matrix::default(),
                (self.theme, true, true),
                measure,
            );
            self.dirty = false;
            self.layout_passes += 1;
        }
        let tables=self.nodes.values().filter(|n|n.kind==NodeKind::TableView&&n.visible).map(|n|n.id).collect::<Vec<_>>();
        for id in tables{let n=&self.nodes[&id];let p=n.props.padding;let inner=n.table.layout_bounds.unwrap_or_else(||Rect::new(p[0],p[1],(n.rect.width-p[0]-p[2]).max(0.),(n.rect.height-p[1]-p[3]).max(0.)));self.arrange_table(id,inner,measure);}
        let navigation_items=self.nodes.values().filter(|n|n.kind==NodeKind::NavigationViewItem&&n.navigation_template.owner.is_none()&&n.visible).map(|n|n.id).collect::<Vec<_>>();
        for id in navigation_items{self.arrange_standalone_navigation_item(id,measure);}
        self.refresh_parallax(measure);
        self.sync_motion_effects();
        self.refresh_visual_tree(self.root, Matrix::default(), self.theme, true, true);
        let views = self
            .nodes
            .values()
            .filter(|n| collections::is_view(n.kind) && n.visible && n.composed.role != "ItemsPresenter")
            .map(|n| n.id)
            .collect::<Vec<_>>();
        for id in views {
            let n = &self.nodes[&id];
            let b = overlays::border_thickness(n.props.border_thickness, self.dpr);
            let p = std::array::from_fn::<_, 4, _>(|i| {
                (n.props.padding[i] * self.dpr).round() / self.dpr + b[i]
            });
            let inner = Rect::new(
                p[0],
                p[1],
                (n.rect.width - p[0] - p[2]).max(0.),
                (n.rect.height - p[1] - p[3]).max(0.),
            );
            self.arrange_collection(id, inner, measure);
        }
        let navigation_controls = self.nodes.values().filter(|n|navigation_controls::is_control(n.kind)&&n.kind!=NodeKind::TreeView&&n.visible).map(|n|n.id).collect::<Vec<_>>();
        for id in navigation_controls {
            let n=&self.nodes[&id];
            let rect=Rect::new(0.,0.,n.rect.width,n.rect.height);
            self.prepare_navigation_glyphs(id,measure);
            self.arrange_navigation_control(id,rect,measure);
        }
        let repeaters=self.nodes.values().filter(|n|n.kind==NodeKind::ItemsRepeater&&n.visible&&n.navigation_template.owner.is_none()).map(|n|n.id).collect::<Vec<_>>();
        for id in repeaters{let n=&self.nodes[&id];let p=n.props.padding;let inner=Rect::new(p[0],p[1],(n.rect.width-p[0]-p[2]).max(0.),(n.rect.height-p[1]-p[3]).max(0.));self.arrange_repeater(id,inner,measure);}
        self.finish_rich_flow(measure);
        // Focus requested while realizing Canvas/template children must use
        // their final Left/Top and world geometry, before placing any popup.
        if let Some(id)=self.pending_bring_into_view.take().filter(|id|self.nodes.contains_key(id)) {
            self.refresh_visual_tree(self.root, Matrix::default(), self.theme, true, true);
            self.bring_into_view(id);
            let tables=self.nodes.values().filter(|n|n.kind==NodeKind::TableView&&n.visible).map(|n|n.id).collect::<Vec<_>>();
            for table in tables {if let Some(inner)=self.nodes[&table].table.layout_bounds {self.arrange_table(table,inner,measure);}}
            self.refresh_visual_tree(self.root, Matrix::default(), self.theme, true, true);
        }
        self.sync_sliders();
        self.sync_composed();
        self.sync_overlays();
        self.layout_overlays(measure);
        self.finish_overlay_visuals();
        self.arrange_menu_item_nodes();
        self.reconcile_input();
        self.sync_accept_visuals();
        self.sync_progress();
        self.sync_repeats();
        self.sync_animated_icons();
        self.sync_collection_visuals();
        self.pump_composed_events();
        self.restore_composed_focus();
        self.pump_navigation_control_events();
    }
    pub fn snapshot(&mut self) -> Snapshot {
        self.snapshot_with_properties(|node| Box::new(node.snapshot_properties().into_owned()))
    }
    pub(crate) fn snapshot_with_properties<P>(&mut self, mut properties: impl FnMut(&Node) -> P) -> Snapshot<P> {
        self.resolve_element_names();
        let (command_managed,command_stops)=self.command_tab_stops();
        let(menu_managed,menu_stops)=self.menu_tab_stops();
        let radio_stops: std::collections::HashSet<_> = self
            .nodes
            .values()
            .filter(|n| n.kind == NodeKind::RadioButton && self.radio_tab_stop(n.id))
            .map(|n| n.id)
            .collect();
        let mut animating = !self.animations.is_empty() || !self.motion_runtime.ghosts.is_empty();
        let z_order: HashMap<_, _> = self
            .nodes
            .iter()
            .map(|(id, n)| (*id, n.props.z_index))
            .collect();
        let slider_snapshots: HashMap<_, _> = self
            .nodes
            .values()
            .filter(|n| n.kind == NodeKind::Slider)
            .map(|n| (n.id, self.slider_geometry(n.id)))
            .collect();
        let mut compact_snapshots: HashMap<_, _> = self
            .nodes
            .values()
            .filter(|n| compact_controls::is_compact(n.kind))
            .map(|n| (n.id, self.compact_snapshot(n.id)))
            .collect();
        let mut collection_snapshots = self
            .nodes
            .keys()
            .filter_map(|id| self.collection_snapshot(*id).map(|s| (*id, s)))
            .collect::<HashMap<_, _>>();
        let composed_kinds: BTreeMap<_, _> = self
            .nodes
            .values()
            .filter(|n| composed::is_control(n.kind))
            .map(|n| (n.id, n.kind))
            .collect();
        let mut navigation_control_snapshots=self.nodes.values().filter(|n|navigation_controls::is_control(n.kind)).filter_map(|n|self.navigation_control_snapshot(n.id).map(|snapshot|(n.id,snapshot))).collect::<HashMap<_,_>>();
        let mut command_snapshots: HashMap<_, _> = self.nodes.values()
            .filter(|n| command_controls::is_control(n.kind)||n.command.owner.is_some())
            .map(|n| (n.id, n.command.snapshot(n.props.is_open || n.command.owner.filter(|_|n.command.role=="more").and_then(|id|self.nodes.get(&id)).is_some_and(|owner|owner.props.is_open) || n.props.flyout_target
                .and_then(|id| self.nodes.get(&id)).is_some_and(|target| target.props.is_open))))
            .collect();
        for (id,snapshot) in &mut command_snapshots {
            let n=&self.nodes[id];snapshot.expansion_progress=n.command.expansion.value(self.time);
            if n.kind==NodeKind::CommandBar{snapshot.primary_clip=self.command_primary_clip(*id);}
        }
        let mut ui_commands=self.nodes.values().filter(|n|view_controls::is_command(n.kind)).filter_map(|n|self.command_metadata(n.id).ok().map(|m|(n.id,m))).collect::<HashMap<_,_>>();
        let mut tables=self.nodes.keys().filter_map(|id|self.table_snapshot(*id).map(|s|(*id,s))).collect::<HashMap<_,_>>();
        let mut primitives=self.nodes.keys().filter_map(|id|self.primitive_snapshot(*id).map(|s|(*id,s))).collect::<HashMap<_,_>>();
        let mut content_hosts=self.nodes.keys().filter_map(|id|self.content_host_snapshot(*id).map(|s|(*id,s))).collect::<HashMap<_,_>>();
        let mut reading=self.nodes.keys().filter_map(|id|self.reading_snapshot(*id).map(|s|(*id,s))).collect::<HashMap<_,_>>();
        let pointers: Vec<_> = self.nodes.keys().map(|id| self.pointer_presentation(*id)).collect();
        let nodes = self
            .nodes
            .values_mut()
            .zip(pointers)
            .map(|(n, pointer)| {
                let nav = n.nav.as_mut().map(|v| {
                    let mut s = v.snapshot();
                    for e in s.events.drain(..) {
                        self.events.push(SceneEvent {
                            payload: Some(serde_json::json!({"recommendedNavigationTransition":e.recommended_navigation_transition})),
                            composed_processed: false, command_processed:false, menu_processed:false, reading_processed:false,
                            collection: None,
                            selected_keys: None,
                            close_reason: None,
                            target: n.id,
                            kind: e.kind,
                            item_id: e.item_id,
                            request_id: e.request_id,
                            is_checked: None,
                            is_on: None,
                            selected_index: None,
                            text: None,
                            selection_start: None,
                            selection_length: None,
                            view: None,
                            value: None,
                            is_expanded: None,
                        });
                    }
                    animating |= s.animating;
                    s
                });
                animating |= n.effects.active(self.time) || n.button.animating(self.time)
                    || n.scroll.active(self.time)
                    || n.scroll.indicator.active(self.time)
                    || n.scroll.expansion.active(self.time);
                animating |= n.scroll.repeat.is_some();
                animating |= n.segmented.active(self.time);
                animating |= navigation_controls::is_control(n.kind) && n.nav_controls.animating(self.time);
                animating |= overlays::is_overlay(n.kind) && n.overlay.visual.active(self.time);
                animating |= picker_controls::is_control(n.kind) && n.picker.animating(self.time)
                    || (command_controls::is_control(n.kind) || n.command.role=="more") && n.command.animating(self.time)
                    || view_controls::is_view(n.kind) && n.view_control.motion.active(self.time);
                animating |= n.kind == NodeKind::MenuFlyout && n.overlay.open && (n.overlay.submenu_open_at.is_some() || n.overlay.submenu_close_at.is_some());
                animating |= n.kind == NodeKind::Slider && n.slider.scale.active(self.time);
                animating |= n.kind == NodeKind::Expander && n.expander.active(self.time);
                animating |= progress::is_progress(n.kind) && n.progress.active(self.time);
                animating |= n.primitive.expansion.active(self.time);
                animating |= n.kind == NodeKind::Frame && n.content_host.frame.animating(self.time);
                animating |= n.kind == NodeKind::AnimatedIcon && n.animated_icon.active();
                animating |=
                    compact_controls::is_split(n.kind) && n.compact.secondary_animation.active();
                animating |= n.kind == NodeKind::CheckBox && n.accept.active(self.time);
                animating |= matches!(n.kind, NodeKind::RadioButton | NodeKind::ToggleSwitch)
                    && n.selection_visual.active(self.time);
                animating |= n.kind == NodeKind::ItemsRepeater && n.repeater.unsettled;
                animating |= refresh::is_control(n.kind) && !self.reduced_motion && (n.refresh.state==RefreshVisualizerState::Refreshing || n.refresh.state==RefreshVisualizerState::Pending&&self.time-n.refresh.started<300.);
                animating |= n.table.row_indicator_opacity.active(self.time)||n.table.row_indicator_scale.active(self.time);
                animating |= n.table.body_opacity.active(self.time)||n.table.body_offset_y.active(self.time);
                animating |= n.table.auto_scroll_next.is_some();
                animating |= n.collection.indicator_opacity.active(self.time)
                    || n.collection.indicator_scale.active(self.time)
                    || n.collection.layout_unsettled
                    || n.collection.drag_animating(self.time);
                animating |= (n.props.acrylic.is_some() || n.props.acrylic_resource.is_some())
                    && (n.material_motion.active(self.time) || n.material_colors.active(self.time));
                NodeSnapshot {
                    table:tables.remove(&n.id),
                    pointer,
                    ui_command:ui_commands.remove(&n.id),
                    primitive:primitives.remove(&n.id),
                    content_host:content_hosts.remove(&n.id),
                    reading:reading.remove(&n.id),
                    view_control:view_controls::is_view(n.kind).then(||serde_json::json!({"progress":n.view_control.motion.value(self.time),"pane":n.view_control.pane,"translation":n.view_control.translation})),
                    command: command_snapshots.remove(&n.id),
                    navigation_control: navigation_control_snapshots.remove(&n.id),
                    collection_item_visual: (n.kind == NodeKind::CollectionItem)
                        .then(|| n.collection.item_visual(self.time)),
                    collection_indicator: if n.kind == NodeKind::CollectionItem {
                        Some(collections::CollectionIndicatorVisual {
                            layout_height: n.collection.indicator_layout_height,
                            scale: n.collection.indicator_scale.value(self.time),
                            opacity: n.collection.indicator_opacity.value(self.time),
                        })
                    } else {
                        None
                    },
                    composed: composed::is_control(n.kind).then(|| n.composed.snapshot(&n.props)),
                    repeater:(n.kind==NodeKind::ItemsRepeater).then(||n.repeater.snapshot(&n.props)),
                    refresh:refresh::is_control(n.kind).then(||n.refresh.snapshot()),
                    picker: picker_controls::is_control(n.kind).then(|| n.picker.snapshot(self.time)),
                    composed_owner: n.composed.owner,
                    composed_kind: n
                        .composed
                        .owner
                        .and_then(|id| composed_kinds.get(&id))
                        .copied(),
                    collection: collection_snapshots.remove(&n.id),
                    compact: compact_snapshots.remove(&n.id),
                    id: n.id,
                    parent: n.parent,
                    children: {
                        let mut children = n.children.clone();
                        if n.kind == NodeKind::Canvas {
                            children.sort_by_key(|c| z_order[c]);
                        }
                        children
                    },
                    kind: n.kind,
                    rect: n.rect,
                    desired: n.desired,
                    world: n.world,
                    state: n.button.state(n.enabled),
                    theme: n.theme,
                    enabled: n.enabled,
                    visible: n.visible,
                    focused: self.focused == Some(n.id),
                    composition_depth:n.presentation.translation_z+n.effects.depth(self.time),
                    tab_stop: n.props.is_tab_stop
                        && (n.kind != NodeKind::SegmentedItem || n.segmented.tab_stop)
                        &&(!command_managed.contains(&n.id)||command_stops.contains(&n.id))
                        &&(!menu_managed.contains(&n.id)||menu_stops.contains(&n.id))
                        && (n.kind != NodeKind::RadioButton || radio_stops.contains(&n.id)),
                    props: properties(n),
                    text: n.text.clone(),
                    template_part: if !n.navigation_template.name.is_empty(){Some(n.navigation_template.name.clone())}else{crate::selection::is_button(n.kind).then_some("ContentPresenter".into())},
                    navigation_owner:n.navigation_template.owner,
                    layout_version: n.layout_version,
                    paint_version: n.paint_version,
                    navigation: nav,
                    local_transform: n
                        .presentation
                        .matrix(n.props.transform, n.props.center_point)
                        .multiply(n.effects.matrix(self.time,n.rect))
                        .multiply(if n.kind == NodeKind::CollectionItem {
                            n.collection.entry_matrix(n.rect, self.time)
                        } else {
                            Matrix::default()
                        })
                        .multiply(if overlays::is_overlay(n.kind) && (n.navigation_template.owner.is_none() || n.kind==NodeKind::ToolTip) {
                            n.overlay.visual.matrix(
                                n.kind,
                                n.overlay.actual,
                                n.rect.height,
                                self.time,
                            )
                        } else {
                            Matrix::default()
                        })
                        .0,
                    presentation: n.presentation,
                    material_weight: n.material_motion.value(self.time),
                    material_colors: n.material_colors.current(self.time),
                    editor: text_edit::is_editor(n.kind).then(|| {
                        n.editor
                            .snapshot(n.kind, &n.props, self.focused == Some(n.id))
                    }),
                    repeat: (n.kind == NodeKind::RepeatButton).then_some(
                        basic_next::RepeatSnapshot {
                            next_tick_at: n.repeat.next,
                        },
                    ),
                    viewbox: (n.kind == NodeKind::Viewbox).then(|| n.viewbox.clone()),
                    overlay: (overlays::is_overlay(n.kind)&&(n.navigation_template.owner.is_none()||n.kind==NodeKind::ToolTip))
                        .then(|| n.overlay.snapshot(n.kind, n.rect, self.time)),
                    slider: slider_snapshots.get(&n.id).map(|s| slider::SliderSnapshot {
                        track: s.track,
                        thumb: s.thumb,
                        fraction: s.fraction,
                        inner_scale: s.inner_scale,
                        tooltip: s.tooltip,
                    }),
                    expander: (n.kind == NodeKind::Expander)
                        .then(|| n.expander.snapshot(self.time, &n.props)),
                    animated_icon: (n.kind == NodeKind::AnimatedIcon)
                        .then(|| n.animated_icon.snapshot(self.time)),
                    progress: progress::snapshot(n, self.time, self.reduced_motion),
                    scroll: (collections::is_scroll_owner(n.kind) || n.kind == NodeKind::RichEditBox)
                        .then(|| n.scroll.snapshot(&n.props, self.time)),
                }
            })
            .collect();
        let image_sources = self.image_sources();
        let image_requests = image_sources
            .iter()
            .filter(|s| !self.images.contains_key(*s))
            .cloned()
            .collect();
        let next_frame_at = self
            .nodes
            .values()
            .filter_map(|n| {
                if n.reading.next_wake.is_some(){n.reading.next_wake
                }else if n.kind == NodeKind::RepeatButton {
                    n.repeat.next
                } else if text_edit::is_editor(n.kind)
                    && n.visible
                    && n.enabled
                    && self.focused == Some(n.id)
                    && n.props.selection_length == 0
                    && !n.props.is_read_only
                {
                    n.editor.next_blink(self.time)
                } else if collections::is_scroll_owner(n.kind)
                    && !n.scroll.hover
                    && n.scroll.indicator.to > 0.
                {
                    Some(n.scroll.last_activity + scroll::milliseconds("ScrollBarContractDelay"))
                        .filter(|t| *t > self.time)
                } else {
                    None
                }
            })
            .chain(self.nodes.values().filter_map(|n| {
                (n.kind == NodeKind::RichEditBox && !n.scroll.hover && n.scroll.indicator.to > 0.)
                    .then(|| n.scroll.last_activity + scroll::milliseconds("ScrollBarContractDelay"))
                    .filter(|t| *t > self.time)
            }))
            .min_by(f64::total_cmp);
        Snapshot {
            unresolved_element_references:self.unresolved_element_references.clone(),
            background_scroll_root: self.background_scroll_root(),
            presentation_height: self.presentation_height(),
            surface_bounds: self.surface_bounds(),
            next_frame_at: next_frame_at
                .into_iter()
                .chain(self.nodes.values().filter_map(|n|n.nav.as_ref().and_then(|nav|nav.next_frame_at())))
                .chain(self.primitive_deadline())
                .chain(self.motion_deadline())
                .chain(self.view_control_deadline())
                .chain(self.overlay_deadline())
                .chain(self.navigation_control_deadline())
                .min_by(f64::total_cmp),
            time: self.time,
            root: self.root,
            nodes,
            events: std::mem::take(&mut self.events),
            focused: self.focused,
            captured: self.captured.map(|v| v.0),
            animating,
            layout_passes: self.layout_passes,
            revision: self.revision,
            animation_completions: std::mem::take(&mut self.animation_completions),
            image_requests,
            image_sources: image_sources.into_iter().collect(),
        }
    }
    pub fn image_sources(&self) -> std::collections::HashSet<String> {
        self.nodes
            .values()
            .flat_map(|n| {
                let mut urls = compact_controls::image_sources(n);
                if let Some(doc)=&n.props.document {urls.extend(doc.runs.iter().filter_map(|r|r.image.as_ref().map(|i|i.source.clone())));}
                if matches!(n.kind,NodeKind::FlipView|NodeKind::TabView) {
                    urls.extend(n.nav_controls.parts.iter().filter(|p|p.role=="page"||p.role=="tab").filter_map(|p|usize::try_from(p.index).ok().and_then(|i|n.props.nav_controls.items.get(i))).filter(|i|!i.image_source.is_empty()).map(|i|i.image_source.clone()));
                }
                if crate::icons::is_image(n.kind)
                    && !crate::icons::source(&n.props, n.kind).is_empty()
                {
                    urls.push(crate::icons::source(&n.props, n.kind).into());
                }
                urls
            })
            .collect()
    }
    pub fn image_ready(&mut self, source: String, size: [f64; 2]) -> Result<(), String> {
        if size.iter().any(|n| !n.is_finite() || *n <= 0.) {
            return Err("invalid decoded image size".into());
        }
        self.images.insert(source, size);
        self.invalidate(self.root, true);
        Ok(())
    }
    fn context_flyout_owner(&self, id:u32)->Option<(u32,u32)> {
        let mut at=Some(id);
        while let Some(owner)=at {
            let node=self.nodes.get(&owner)?;
            if let Some(surface)=node.props.context_flyout_target.filter(|id|self.nodes.contains_key(id)){return Some((owner,surface));}
            at=node.parent;
        }
        None
    }
    fn emit(&mut self, id: u32, kind: EventKind) {
        self.events.push(SceneEvent {
            collection: None,
            payload: (self.nodes[&id].kind==NodeKind::RichEditBox && kind==EventKind::TextChanged).then(||serde_json::json!({"document":self.nodes[&id].props.document})),
            composed_processed: false, command_processed:false, menu_processed:false, reading_processed:false,
            selected_keys: (collections::is_view(self.nodes[&id].kind)
                && kind == EventKind::SelectionChanged)
                .then(|| self.nodes[&id].props.selected_keys.as_ref().clone()),
            close_reason: None,
            target: id,
            kind,
            value: (kind == EventKind::ValueChanged).then_some(self.nodes[&id].props.value),
            is_expanded: matches!(kind, EventKind::Expanding | EventKind::Collapsed)
                .then_some(self.nodes[&id].props.is_expanded),
            item_id: None,
            request_id: None,
            is_checked: match kind {
                EventKind::Checked => Some(Some(true)),
                EventKind::Unchecked => Some(Some(false)),
                EventKind::Indeterminate => Some(None),
                _ => None,
            },
            is_on: (kind == EventKind::Toggled).then_some(self.nodes[&id].props.is_on),
            selected_index: (kind == EventKind::SelectionChanged
                && self.nodes[&id].kind == NodeKind::RadioButtons)
                .then_some(self.nodes[&id].props.selected_index),
            text: (matches!(self.nodes[&id].kind, NodeKind::TextBox | NodeKind::RichEditBox) && kind == EventKind::TextChanged)
                .then(|| self.nodes[&id].props.text.clone()),
            selection_start: text_edit::is_editor(self.nodes[&id].kind)
                .then_some(self.nodes[&id].props.selection_start),
            selection_length: text_edit::is_editor(self.nodes[&id].kind)
                .then_some(self.nodes[&id].props.selection_length),
            view: collections::is_scroll_owner(self.nodes[&id].kind).then(|| {
                self.nodes[&id]
                    .scroll
                    .snapshot(&self.nodes[&id].props, self.time)
            }),
        });
        // UIElement.ContextFlyout: opening belongs to the Rust input tree,
        // including routed requests from descendants and keyboard invocation.
        // Do not emit another event here: callers enrich the just-added event.
        if kind==EventKind::ContextRequested && self.effective_enabled(id) {
            if let Some((owner,surface))=self.context_flyout_owner(id) {
                let point=(!self.menu_input_narrow).then(||self.pointer.and_then(|(x,y)|self.nodes[&owner].world.inverse().map(|m|{let (x,y)=m.point(x,y);[x,y]}))).flatten();
                let node=self.nodes.get_mut(&surface).unwrap();
                node.props.placement_target=Some(owner);
                node.props.placement_position=point;
                node.props.is_open=true;
                self.invalidate(surface,true);
            }
        }
    }
    fn effective_enabled(&self, id: u32) -> bool {
        let mut at = Some(id);
        while let Some(id) = at {
            let Some(n) = self.nodes.get(&id) else {
                return false;
            };
            if n.parent.is_some_and(|p|!self.content_child_enabled(p,id)){return false;}
            if n.props.view_controls.as_ref().and_then(|p|p.command).is_some_and(|c|!self.command_can_execute(c,&mut vec![]).unwrap_or(false)) || n.parent.is_some_and(|parent|!self.view_child_enabled(parent,id)) {return false;}
            if !n.props.enabled
                || !n.props.visible
                || n.kind == NodeKind::ToolTip
                || (overlays::is_overlay(n.kind) && (n.navigation_template.owner.is_none() || n.kind==NodeKind::ToolTip) && !n.overlay.open)
            {
                return false;
            }
            at = n.parent;
        }
        true
    }
    fn reconcile_input(&mut self) {
        let restore_header = self.focused.and_then(|id| {
            if self.nodes.get(&id).is_some_and(|n| n.visible) {
                return None;
            }
            let mut parent = self.nodes.get(&id).and_then(|n| n.parent);
            while let Some(id) = parent {
                let n = &self.nodes[&id];
                if n.kind == NodeKind::Expander && !n.props.is_expanded && n.enabled && n.visible {
                    return Some(id);
                }
                parent = n.parent;
            }
            None
        });
        if let Some(header) = restore_header {
            self.focus(Some(header));
        }
        let disabled: Vec<_> = self
            .nodes
            .keys()
            .copied()
            .filter(|id| !self.effective_enabled(*id))
            .collect();
        for id in disabled {
            if let Some(n) = self.nodes.get_mut(&id) {
                n.button.cancel();
                if let Some(selection) = n.selection_visual.allocated_mut() {
                    selection.cancel_drag();
                }
                if let Some(editor) = n.editor.allocated_mut() {
                    editor.peek = false;
                    editor.draft = None;
                }
                if let Some(scroll) = n.scroll.allocated_mut() {
                    scroll.drag = None;
                    scroll.pan = None;
                    scroll.repeat = None;
                    scroll.pinch = None;
                    scroll.touches.clear();
                }
                if let Some(nav) = &mut n.nav {
                    let _ = nav.input(crate::model::Input::Cancel, self.time);
                    let _ = nav.input(crate::model::Input::Blur, self.time);
                }
            }
            if self.captured.is_some_and(|v| v.1 == id) {
                self.captured = None;
            }
            if self.focused == Some(id) {
                self.focused = None;
                self.emit(id, EventKind::LostFocus);
            }
        }
    }
}

impl Scene {
    fn sync_animated_icons(&mut self) {
        let ids: Vec<_> = self
            .nodes
            .values()
            .filter(|n| n.kind == NodeKind::AnimatedIcon)
            .map(|n| n.id)
            .collect();
        for id in ids {
            let mut owner = Some(id);
            let mut state = String::new();
            while let Some(next) = owner {
                let n = &self.nodes[&next];
                if next == id && !n.props.state.is_empty() {
                    state = n.props.state.clone();
                    break;
                }
                if !n.props.animated_icon_state.is_empty() {
                    state = n.props.animated_icon_state.clone();
                    break;
                }
                if next != id
                    && self.nodes[&id].props.use_parent_state
                    && crate::selection::is_button(n.kind)
                {
                    state = n.button.state(n.enabled).as_str().into();
                    if n.kind == NodeKind::ToggleButton
                        && matches!(
                            self.nodes[&id].props.source.as_str(),
                            "ChevronRightDownSmall" | "ChevronUpDownSmall"
                        )
                    {
                        state.push_str(if n.props.is_checked == Some(true) {
                            "On"
                        } else {
                            "Off"
                        });
                    }
                    break;
                }
                owner = n.parent;
            }
            let n = self.nodes.get_mut(&id).unwrap();
            let kind: AnimatedIconSource = serde_json::from_value(n.props.source.clone().into())
                .expect("validated visual source");
            n.animated_icon
                .sync(kind, &state, self.time, self.reduced_motion, n.visible);
        }
    }
}
