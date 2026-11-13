//! Pinned moco stacking/wrapping and VariableSizedWrapGrid occupancy semantics.
//! Collection identity, selection, realization and scroll all belong to Rust.
use super::*;
use crate::{
    render::Draw,
    resources::{Brush, Resources},
};
use std::{
    collections::{BTreeSet, HashSet},
    sync::{Arc, OnceLock},
};
mod adaptive;
mod transitions;
pub use transitions::CollectionItemVisual;
mod interaction;
pub use interaction::{CollectionEvent, DragSnapshot};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
#[derive(PartialEq)]
pub struct CollectionData {
    pub id: String,
    #[serde(default)]
    pub text: String,
    #[serde(default = "enabled")]
    pub enabled: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub group: Option<String>,
}
#[derive(Clone, Debug, Default, Deserialize, Serialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
#[derive(PartialEq)]
pub struct CollectionGroup {
    pub id: String,
    pub header: String,
}
fn enabled() -> bool {
    true
}
/// Typed subset of the item-container style, applied by the Rust item generator.
#[derive(Clone, Debug, Default, Deserialize, Serialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
#[derive(PartialEq)]
pub struct ItemContainerStyle {
    pub width:Option<f64>,pub height:Option<f64>,pub horizontal_alignment:Option<HorizontalAlignment>,pub vertical_alignment:Option<VerticalAlignment>,
    pub margin: Option<[f64; 4]>,
    pub padding: Option<[f64; 4]>,
    pub border_thickness: Option<[f64; 4]>,
    pub min_width: Option<f64>,
    pub min_height: Option<f64>,
    pub horizontal_content_alignment: Option<HorizontalAlignment>,
    pub vertical_content_alignment: Option<VerticalAlignment>,
}
pub fn contract() -> &'static serde_json::Value {
    static IR: OnceLock<serde_json::Value> = OnceLock::new();
    IR.get_or_init(|| {
        serde_json::from_str(include_str!("../../references/collections-template.json")).unwrap()
    })
}
fn scalar(key: &str) -> f64 {
    contract()["metrics"][key]["value"]
        .as_str()
        .unwrap()
        .parse()
        .unwrap()
}
pub(super) fn is_view(k: NodeKind) -> bool {
    matches!(
        k,
        NodeKind::ItemsView | NodeKind::ListView | NodeKind::GridView | NodeKind::TreeView
    )
}
pub(super) fn is_panel(k: NodeKind) -> bool {
    matches!(
        k,
        NodeKind::ItemsStackPanel | NodeKind::ItemsWrapGrid | NodeKind::VariableSizedWrapGrid
    )
}
pub(super) fn is_scroll_owner(k: NodeKind) -> bool {
    matches!(k,NodeKind::ScrollViewer|NodeKind::ScrollView|NodeKind::ScrollContentPresenter) || is_view(k)
}
fn prefix(grid: bool) -> &'static str {
    if grid {
        "GridViewItem"
    } else {
        "ListViewItem"
    }
}
fn brush(theme: Theme, key: &str) -> Brush {
    if theme == Theme::HighContrast {
        if let Ok(b) = Resources::current().resolve(theme, key) {
            return b.clone();
        }
        let color = if key.contains("Selected") || key.contains("Indicator") {
            "#ffff00"
        } else if key.contains("Foreground") || key.contains("CheckBrush") {
            "#ffffff"
        } else {
            "#00000000"
        };
        return serde_json::from_value(serde_json::json!({"kind":"solid","color":color})).unwrap();
    }
    serde_json::from_value(contract()["palettes"][theme.as_str()][key].clone())
        .unwrap_or_else(|_| panic!("Missing collection brush {key}"))
}
pub(super) fn header_divider(theme: Theme) -> String {
    if theme == Theme::HighContrast {
        "#ffffff".into()
    } else {
        brush(theme, "ListViewHeaderItemDividerStroke").solid_color()
    }
}
pub(super) fn defaults(kind: NodeKind, p: &mut NodeProperties) {
    if is_view(kind) {
        p.clip = true;
        p.is_tab_stop = true;
        p.vertical_alignment = VerticalAlignment::Top;
        p.horizontal_scroll_mode = ScrollMode::Disabled;
        p.horizontal_scroll_bar_visibility = ScrollBarVisibility::Disabled;
        p.vertical_scroll_mode = ScrollMode::Enabled;
        p.vertical_scroll_bar_visibility = ScrollBarVisibility::Auto;
        p.orientation = if kind == NodeKind::GridView {
            Orientation::Horizontal
        } else {
            Orientation::Vertical
        };
        if kind == NodeKind::GridView {
            p.padding = [0., 0., 0., 10.];
        }
    } else if is_panel(kind) {
        p.orientation = Orientation::Vertical;
        p.is_tab_stop = false;
    } else if kind == NodeKind::CollectionHeader {
        p.is_tab_stop = false;
        p.font_size = 28.;
        p.font_weight = 600;
        p.padding = [12., 8., 12., 9.];
        p.margin = [0., 0., 0., 4.];
        p.min_height = 44.;
        p.horizontal_content_alignment = HorizontalAlignment::Left;
        p.vertical_content_alignment = VerticalAlignment::Top;
        p.optical_margin_alignment = OpticalMarginAlignment::TrimSideBearings;
        p.z_index = 1;
    } else if kind == NodeKind::CollectionItem {
        p.is_tab_stop = false;
        p.corner_radius = 4.;
        p.font_size = 14.;
    }
}
pub(super) fn validate(kind: NodeKind, p: &NodeProperties) -> Result<(), String> {
    let style = &p.item_container_style;
    if style
        .margin
        .into_iter()
        .flatten()
        .chain(style.padding.into_iter().flatten())
        .chain(style.border_thickness.into_iter().flatten())
        .chain(style.min_width)
        .chain(style.min_height)
        .chain(style.width)
        .chain(style.height)
        .any(|v| !v.is_finite() || !(0. ..=1e6).contains(&v))
    {
        return Err("invalid collection container style".into());
    }
    if (is_view(kind) || is_panel(kind))
        && (p
            .item_width
            .is_some_and(|v| !v.is_finite() || v <= 0. || v > 1e6)
            || p.item_height
                .is_some_and(|v| !v.is_finite() || v <= 0. || v > 1e6)
            || !p.cache_length.is_finite()
            || p.cache_length < 0.
            || p.cache_length > 20.
            || p.maximum_rows_or_columns < -1
            || p.maximum_rows_or_columns > 4096)
    {
        return Err("invalid collection cell, cache or maximumRowsOrColumns".into());
    }
    if is_view(kind) {
        let mut group_keys = HashMap::new();
        for (index, group) in p.collection_groups.iter().enumerate() {
            if group.id.is_empty()
                || group.id.len() > 4096
                || group.header.len() > 100000
                || group_keys.insert(group.id.as_str(), index).is_some()
            {
                return Err("groups need unique nonempty IDs and bounded headers".into());
            }
        }
        let mut last_group = 0;
        for item in p.collection_items.iter() {
            if !group_keys.is_empty() {
                let index = item
                    .group
                    .as_deref()
                    .and_then(|key| group_keys.get(key))
                    .copied()
                    .ok_or("item references an unknown group")?;
                if index < last_group {
                    return Err("grouped items must be contiguous and ordered by groups".into());
                }
                last_group = index;
            }
        }
        if p.group_header_height
            .is_some_and(|v| !v.is_finite() || v <= 0. || v > 1e6)
            || !p.incremental_loading_threshold.is_finite()
            || !(0. ..=20.).contains(&p.incremental_loading_threshold)
        {
            return Err("invalid group header size or loading threshold".into());
        }
        if p.collection_items.len() > 100000 {
            return Err("collection item budget exceeded (100000)".into());
        }
        let mut keys = HashSet::new();
        let mut bytes = 0usize;
        for item in p.collection_items.iter() {
            bytes = bytes
                .saturating_add(item.id.len())
                .saturating_add(item.text.len());
            if item.id.is_empty()
                || item.id.len() > 4096
                || item.text.len() > 1_000_000
                || !keys.insert(&item.id)
                || bytes > 32 * 1024 * 1024
            {
                return Err("collection items need unique nonempty IDs and bounded text".into());
            }
        }
        let tree_keys;
        let selection_keys = if kind == NodeKind::TreeView {
            tree_keys = p.nav_controls.items.iter().map(|item| &item.id).collect::<HashSet<_>>();
            &tree_keys
        } else {
            &keys
        };
        if p.selected_keys.len() > selection_keys.len()
            || p.selected_keys.iter().any(|k| !selection_keys.contains(k))
            || p.selected_keys.iter().collect::<HashSet<_>>().len() != p.selected_keys.len()
        {
            return Err("selectedKeys references an unknown item".into());
        }
        let selection_mode = if kind == NodeKind::TreeView {
            match p.nav_controls.tree_selection_mode {
                TreeViewSelectionMode::None => ListViewSelectionMode::None,
                TreeViewSelectionMode::Single => ListViewSelectionMode::Single,
                TreeViewSelectionMode::Multiple => ListViewSelectionMode::Multiple,
            }
        } else {
            p.selection_mode
        };
        if selection_mode == ListViewSelectionMode::None && !p.selected_keys.is_empty()
            || selection_mode == ListViewSelectionMode::Single && p.selected_keys.len() > 1
        {
            return Err("selectedKeys does not match selectionMode".into());
        }
        if p.items_panel
            .is_some_and(|k| !matches!(k, NodeKind::ItemsStackPanel | NodeKind::ItemsWrapGrid))
        {
            return Err("collection itemsPanel must be ItemsStackPanel or ItemsWrapGrid".into());
        }
    }
    Ok(())
}
pub(super) fn coerce(
    kind: NodeKind,
    p: &mut NodeProperties,
    patch: &serde_json::Map<String, serde_json::Value>,
) {
    if !is_view(kind) || patch.contains_key("selectedKeys") {
        return;
    }
    if kind == NodeKind::TreeView {
        if let Some(nav) = patch.get("navControls") {
            if nav.get("items").is_some() {
                let keys = p.nav_controls.items.iter().map(|item| &item.id).collect::<HashSet<_>>();
                Arc::make_mut(&mut p.selected_keys).retain(|key| keys.contains(key));
            }
            match p.nav_controls.tree_selection_mode {
                TreeViewSelectionMode::None => p.selected_keys = Default::default(),
                TreeViewSelectionMode::Single => Arc::make_mut(&mut p.selected_keys).truncate(1),
                TreeViewSelectionMode::Multiple => {}
            }
        }
        return;
    }
    if patch.contains_key("collectionItems") {
        let keys = p
            .collection_items
            .iter()
            .map(|d| &d.id)
            .collect::<HashSet<_>>();
        Arc::make_mut(&mut p.selected_keys).retain(|k| keys.contains(k));
    }
    if p.selection_mode == ListViewSelectionMode::None {
        p.selected_keys = Default::default();
    } else if p.selection_mode == ListViewSelectionMode::Single {
        Arc::make_mut(&mut p.selected_keys).truncate(1);
    }
}
#[derive(Clone, Copy, Default, Debug)]
pub(super) struct Geometry {
    pub cell: [f64; 2],
    pub per_line: usize,
    pub horizontal: bool,
    pub stack: bool,
    pub count: usize,
}
impl Geometry {
    fn rect(self, index: usize, width: f64) -> Rect {
        if self.stack {
            if self.horizontal {
                Rect::new(index as f64 * self.cell[0], 0., self.cell[0], self.cell[1])
            } else {
                Rect::new(0., index as f64 * self.cell[1], width, self.cell[1])
            }
        } else {
            let a = index % self.per_line.max(1);
            let b = index / self.per_line.max(1);
            if self.horizontal {
                Rect::new(
                    a as f64 * self.cell[0],
                    b as f64 * self.cell[1],
                    self.cell[0],
                    self.cell[1],
                )
            } else {
                Rect::new(
                    b as f64 * self.cell[0],
                    a as f64 * self.cell[1],
                    self.cell[0],
                    self.cell[1],
                )
            }
        }
    }
    fn extent(self, width: f64) -> [f64; 2] {
        if self.count == 0 {
            return [0., 0.];
        }
        if self.stack {
            if self.horizontal {
                [self.count as f64 * self.cell[0], self.cell[1]]
            } else {
                [width, self.count as f64 * self.cell[1]]
            }
        } else {
            let n = self.count.min(self.per_line.max(1)) as f64;
            let lines = self.count.div_ceil(self.per_line.max(1)) as f64;
            if self.horizontal {
                [n * self.cell[0], lines * self.cell[1]]
            } else {
                [lines * self.cell[0], n * self.cell[1]]
            }
        }
    }
}
fn geometry(
    kind: NodeKind,
    p: &NodeProperties,
    count: usize,
    cell: [f64; 2],
    available: [f64; 2],
) -> Geometry {
    let gap=reading_controls::item_gaps(p);let cell=[cell[0]+gap[0],cell[1]+gap[1]];
    let horizontal = p.orientation == Orientation::Horizontal;
    let direct = usize::from(!horizontal);
    let cap = if p.maximum_rows_or_columns > 0 {
        p.maximum_rows_or_columns as usize
    } else {
        count.max(1)
    };
    let per = if available[direct].is_finite() {
        (((available[direct]+gap[direct]) / cell[direct].max(1e-9) + 1e-8).floor() as usize)
            .max(1)
            .min(cap)
    } else {
        cap
    };
    Geometry {
        cell,
        per_line: if kind == NodeKind::ItemsStackPanel {
            1
        } else {
            per
        },
        horizontal,
        stack: kind == NodeKind::ItemsStackPanel,
        count,
    }
}
#[derive(Clone, Copy)]
struct ItemMeasureCache {
    version: u64,
    available: [f64; 2],
    dpr: f64,
    result: [f64; 2],
}
#[derive(Default)]
pub(super) struct CollectionState {
    header:Option<u32>,header_size:[f64;2],
    // Scroll transforms do not invalidate intrinsic measurement. Cache only
    // within the current layout revision; template/data/font/viewport changes
    // invalidate it through the existing ancestor layout-version chain.
    measure_cache: Option<ItemMeasureCache>,
    adaptive: adaptive::AdaptiveLayout,
    headers: HashMap<String, u32>,
    pub layout_unsettled: bool,
    drag: interaction::DragState,
    loading_request: Option<(usize, bool)>,
    pending_scroll_anchor: Option<(String, f64, usize, bool)>,
    content_size: [f64; 2],
    pub check_label: crate::typography::TextLayout,
    source_initialized: bool,
    transition_serial: u64,
    source_transition: Option<transitions::SourceTransition>,
    position_token: Option<u64>,
    entry_token: Option<u64>,
    entry_opacity: crate::animation::Motion,
    entry_scale: crate::animation::Motion,
    pub drag_opacity: crate::animation::Motion,
    reorder_position: Option<[f64; 2]>,
    reorder_x: crate::animation::Motion,
    reorder_y: crate::animation::Motion,
    reorder_preview: bool,
    pub indicator_opacity: crate::animation::Motion,
    pub indicator_scale: crate::animation::Motion,
    pub indicator_layout_height: f64,
    indicator_selected: bool,
    indicator_pressed: bool,
    visual_initialized: bool,
    pub placements: HashMap<u32, Rect>,
    pub geometry: Geometry,
    pub realized: HashMap<String, u32>,
    pub source: Arc<Vec<CollectionData>>,
    pub indices: HashMap<String, usize>,
    pub selected: HashSet<String>,
    pub focus: Option<String>,
    pub anchor: Option<String>,
    pub selected_source: Arc<Vec<String>>,
    pub pressed: Option<String>,
    pub modifiers: (bool, bool),
    pub selection_revision: u64,
    pub realization_dirty: bool,
    pub realization_error: Option<String>,
    touch_tap: Option<(i32, String, f64, f64)>,
    pending_click: Option<(u32, String, bool, bool)>,
    request_counter: u32,
}
impl CollectionState {
    pub fn drag_animating(&self, time: f64) -> bool {
        self.drag.hovering()
            || self
                .source_transition
                .as_ref()
                .is_some_and(|v| v.end > time)
            || self.entry_opacity.active(time)
            || self.entry_scale.active(time)
            || self.drag_opacity.active(time)
            || self.reorder_x.active(time)
            || self.reorder_y.active(time)
    }
}
#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectionIndicatorVisual {
    pub layout_height: f64,
    pub scale: f64,
    pub opacity: f64,
}
impl Scene {
    pub fn collection_indicator(&self, id: u32) -> Option<CollectionIndicatorVisual> {
        let n = self.nodes.get(&id)?;
        if n.kind != NodeKind::CollectionItem {
            return None;
        }
        let c = &n.collection;
        Some(CollectionIndicatorVisual {
            layout_height: c.indicator_layout_height,
            scale: c.indicator_scale.value(self.time),
            opacity: c.indicator_opacity.value(self.time),
        })
    }
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RealizedItem {
    pub id: u32,
    pub key: String,
    pub index: usize,
    pub selected: bool,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectionSnapshot {
    pub drag: DragSnapshot,
    pub scroll_position: Option<adaptive::CollectionScrollPosition>,
    pub headers: Vec<RealizedItem>,
    pub sticky_header: Option<String>,
    pub total_count: usize,
    pub selected_count: usize,
    pub focused_key: Option<String>,
    pub realized: Vec<RealizedItem>,
    pub panel: NodeKind,
    pub cell: [f64; 2],
    pub per_line: usize,
    pub realization_error: Option<String>,
}
impl Scene {
    pub(super) fn collection_snapshot(&self, id: u32) -> Option<CollectionSnapshot> {
        let n = &self.nodes[&id];
        if !is_view(n.kind) {
            return None;
        }
        let mut realized = n
            .collection
            .realized
            .iter()
            .filter_map(|(key, c)| {
                n.collection.indices.get(key).map(|index| RealizedItem {
                    id: *c,
                    key: key.clone(),
                    index: *index,
                    selected: n.collection.selected.contains(key),
                })
            })
            .collect::<Vec<_>>();
        realized.sort_by_key(|r| r.index);
        Some(CollectionSnapshot {
            drag: self.collection_drag_snapshot(id),
            scroll_position: self.collection_scroll_position(id),
            headers: n
                .collection
                .headers
                .iter()
                .filter_map(|(key, id)| {
                    n.props
                        .collection_groups
                        .iter()
                        .position(|g| &g.id == key)
                        .map(|index| RealizedItem {
                            id: *id,
                            key: key.clone(),
                            index,
                            selected: false,
                        })
                })
                .collect(),
            sticky_header: self.collection_sticky_group(id),
            total_count: n.props.collection_items.len(),
            selected_count: n.collection.selected.len(),
            focused_key: n.collection.focus.clone(),
            realized,
            panel: n
                .props
                .items_panel
                .unwrap_or(if n.kind == NodeKind::GridView {
                    NodeKind::ItemsWrapGrid
                } else {
                    NodeKind::ItemsStackPanel
                }),
            cell: n.collection.geometry.cell,
            per_line: n.collection.geometry.per_line,
            realization_error: n.collection.realization_error.clone(),
        })
    }
    pub(super) fn sync_collections(&mut self) {
        let ids = self
            .nodes
            .values()
            .filter(|n| is_view(n.kind))
            .map(|n| n.id)
            .collect::<Vec<_>>();
        for id in ids {
            let transition = self.collection_source_transition(id);
            let n = self.nodes.get_mut(&id).unwrap();
            n.collection.source_initialized = true;
            if let Some(v) = transition {
                n.collection.transition_serial = v.serial;
                n.collection.source_transition = Some(v);
            }
            let changed = !Arc::ptr_eq(&n.collection.source, &n.props.collection_items);
            if changed {
                n.collection.adaptive.dirty = true;
                let keys = n
                    .props
                    .collection_items
                    .iter()
                    .map(|d| d.id.as_str())
                    .collect::<HashSet<_>>();
                n.collection
                    .adaptive
                    .sizes
                    .retain(|key, _| keys.contains(key.as_str()));
                n.collection.realization_dirty = true;
                n.collection.source = n.props.collection_items.clone();
                n.collection.indices = n
                    .collection
                    .source
                    .iter()
                    .enumerate()
                    .map(|(i, d)| (d.id.clone(), i))
                    .collect();
                if n.collection
                    .focus
                    .as_ref()
                    .is_some_and(|k| !n.collection.indices.contains_key(k))
                {
                    n.collection.focus = None;
                }
                if n.collection
                    .anchor
                    .as_ref()
                    .is_some_and(|k| !n.collection.indices.contains_key(k))
                {
                    n.collection.anchor = None;
                }
            }
            if changed || !Arc::ptr_eq(&n.collection.selected_source, &n.props.selected_keys) {
                let old = n.collection.selected.clone();
                n.collection.selected = n.props.selected_keys.iter().cloned().collect();
                n.collection.selected_source = n.props.selected_keys.clone();
                if old != n.collection.selected {
                    n.collection.selection_revision += 1;
                    self.emit(id, EventKind::SelectionChanged);
                }
            }
        }
    }
    fn prepare_collection_item(&mut self, owner: u32, index: usize) -> Option<u32> {
        let n = &self.nodes[&owner];
        let d = &n.props.collection_items[index];
        let key = d.id.clone();
        let grid = n.kind == NodeKind::GridView;
        if let Some(id) = n.collection.realized.get(&key) {
            let id = *id;
            self.configure_collection_item(owner, id, index);
            self.ensure_navigation_tree_parts(owner, id, index);
            self.ensure_combo_checkbox(owner, id);
            return Some(id);
        }
        let text = if n.props.has_item_template {
            String::new()
        } else {
            d.text.clone()
        };
        let props = serde_json::json!({"collectionOwner":owner,"collectionKey":key,"collectionIndex":index,"text":text,"accessibleName":d.text,"fontFamily":n.props.font_family,"fontSize":n.props.font_size,"fontWeight":n.props.font_weight,"enabled":d.enabled,"padding":if grid {[0.,0.,0.,0.]}else{[16.,0.,12.,0.]},"margin":if grid {[0.,0.,4.,4.]}else{[0.;4]},"minWidth":scalar(&format!("{}MinWidth",prefix(grid))),"minHeight":scalar(&format!("{}MinHeight",prefix(grid)))});
        self.realizing_collection = Some(owner);
        let created = self.create(owner, NodeKind::CollectionItem, props);
        self.realizing_collection = None;
        let item = match created {
            Ok(item) => item,
            Err(error) => {
                self.nodes
                    .get_mut(&owner)
                    .unwrap()
                    .collection
                    .realization_error = Some(error);
                return None;
            }
        };
        let c = &mut self.nodes.get_mut(&owner).unwrap().collection;
        c.realized.insert(key, item);
        c.realization_dirty = true;
        self.configure_collection_item(owner, item, index);
        self.ensure_navigation_tree_parts(owner, item, index);
        self.ensure_combo_checkbox(owner, item);
        Some(item)
    }
    fn configure_collection_item(&mut self, owner: u32, id: u32, index: usize) {
        let root = &self.nodes[&owner];
        let grid = root.kind == NodeKind::GridView;
        let multiple = root.props.selection_mode == ListViewSelectionMode::Multiple;
        let data = root.props.collection_items[index].clone();
        let font = root.props.font();
        let templated = root.props.has_item_template;
        let style = root.props.item_container_style.clone();
        let tree_depth = (root.kind == NodeKind::TreeView).then(|| {
            root.nav_controls
                .tree_rows
                .get(&data.id)
                .map(|r| r.depth)
                .unwrap_or(0)
        });
        let rtl = self.effective_flow_direction(owner) == FlowDirection::RightToLeft;
        let items_view=root.kind==NodeKind::ItemsView;
        let n = self.nodes.get_mut(&id).unwrap();
        n.props.padding = if grid {
            [0.; 4]
        } else {
            [if multiple { 44. } else { 16. }, 0., 12., 0.]
        };
        n.props.font_family = font.family;
        n.props.font_size = font.size;
        n.props.font_weight = font.weight;
        n.props.font_style = font.style;
        n.props.margin = style
            .margin
            .unwrap_or(if grid { [0., 0., 4., 4.] } else { [0.; 4] });
        if let Some(padding) = style.padding {
            n.props.padding = padding;
        }
        n.props.border_thickness = style.border_thickness.unwrap_or([0.; 4]);
        if rtl {
            n.props.padding.swap(0, 2);
        }
        n.props.min_width = style
            .min_width
            .unwrap_or(scalar(&format!("{}MinWidth", prefix(grid))));
        n.props.min_height = style
            .min_height
            .unwrap_or(scalar(&format!("{}MinHeight", prefix(grid))));
        n.props.horizontal_content_alignment =
            style.horizontal_content_alignment.unwrap_or(if grid {
                HorizontalAlignment::Center
            } else {
                HorizontalAlignment::Stretch
            });
        n.props.vertical_content_alignment = style
            .vertical_content_alignment
            .unwrap_or(VerticalAlignment::Center);
        n.props.enabled = data.enabled;
        n.props.accessible_name = Some(data.text.clone());
        n.props.text = if templated { String::new() } else { data.text };
        n.props.collection_index = index;
        if let Some(depth) = tree_depth {
            n.props.margin = [0.; 4];
            n.props.min_width = 0.;
            n.props.min_height = 32.;
            n.props.padding = [
                navigation_controls::tree_columns(self.dpr,multiple).2 + depth as f64 * 16.,
                3.,
                4.,
                5.,
            ];
            if rtl {
                n.props.padding.swap(0, 2);
            }
        }
        if items_view{let n=self.nodes.get_mut(&id).unwrap();n.props.width=style.width;n.props.height=style.height;n.props.horizontal_alignment=style.horizontal_alignment.unwrap_or(HorizontalAlignment::Stretch);n.props.vertical_alignment=style.vertical_alignment.unwrap_or(VerticalAlignment::Stretch);n.props.padding=style.padding.unwrap_or([0.;4]);n.props.margin=style.margin.unwrap_or([0.;4]);n.props.min_width=style.min_width.unwrap_or(0.);n.props.min_height=style.min_height.unwrap_or(0.);}
    }
    pub(super) fn uses_default_collection_label(&self, id: u32, children: &[u32]) -> bool {
        let node = &self.nodes[&id];
        node.kind == NodeKind::CollectionItem
            && !children.is_empty()
            && children.iter().all(|child| self.nodes[child].composed.role == "ComboItemCheckBox")
            && !self.nodes[&node.props.collection_owner.unwrap()].props.has_item_template
    }
    pub(super) fn sync_collection_visuals(&mut self) {
        let ids = self
            .nodes
            .values()
            .filter(|n| n.kind == NodeKind::CollectionItem)
            .map(|n| n.id)
            .collect::<Vec<_>>();
        for id in ids {
            let n = &self.nodes[&id];
            let root = &self.nodes[&n.props.collection_owner.unwrap()];
            let selected = root.collection.selected.contains(&n.props.collection_key)
                && root.props.selection_mode != ListViewSelectionMode::Multiple;
            let ghost = root.collection.drag.active
                && root.collection.drag.keys.contains(&n.props.collection_key);
            let now = self.time;
            let reduce = self.reduced_motion || n.theme == Theme::HighContrast || !n.enabled;
            let pressed = root.collection.pressed.as_ref() == Some(&n.props.collection_key);
            let height =
                (n.rect.height - 40.).max(16.).min(n.rect.height) - if pressed { 6. } else { 0. };
            let c = &mut self.nodes.get_mut(&id).unwrap().collection;
            let drag_target = if ghost { 0. } else { 1. };
            if !c.visual_initialized || reduce || !ghost {
                c.drag_opacity.snap(drag_target);
            } else if c.drag_opacity.to != drag_target {
                c.drag_opacity.curve = [0., 0., 1., 1.];
                c.drag_opacity.retarget(
                    drag_target,
                    now,
                    contract()["animations"]["dragPlaceholderFadeMs"]
                        .as_f64()
                        .unwrap(),
                );
            }
            let target = if selected { 1. } else { 0. };
            let changed = c.indicator_selected != selected || c.indicator_pressed != pressed;
            let layout_height = (height * self.dpr).round() / self.dpr;
            if !c.visual_initialized || reduce {
                c.indicator_opacity.snap(target);
                c.indicator_scale.snap(1.);
            } else if changed {
                // ListViewBaseItemPresenter: an already running storyboard is
                // sampled on replacement; a resting selected visual fades from 0.
                let running = c.indicator_opacity.active(now) || c.indicator_scale.active(now);
                if selected && !running {
                    c.indicator_opacity.snap(0.);
                }
                c.indicator_opacity.curve = [0., 0., 1., 1.];
                c.indicator_opacity.retarget(target, now, 83.);
                if selected {
                    let from_scale = if c.indicator_selected {
                        let old = c.indicator_layout_height;
                        old / (old + if pressed { -6. } else { 6. }).max(1.)
                    } else {
                        0.
                    };
                    if !running {
                        c.indicator_scale.snap(from_scale);
                    }
                    c.indicator_scale.curve = if from_scale == 0. {
                        [0.167, 0.167, 0., 1.]
                    } else {
                        [0., 0., 0., 1.]
                    };
                    c.indicator_scale.retarget(1., now, 167.);
                } else {
                    c.indicator_scale.snap(1.);
                }
            }
            c.indicator_layout_height = layout_height;
            c.indicator_selected = selected;
            c.indicator_pressed = pressed;
            c.visual_initialized = true;
        }
    }
    fn measure_collection_child(
        &mut self,
        id: u32,
        available: [f64; 2],
        measure: &mut impl TextMeasurer,
    ) -> [f64; 2] {
        let version = self.nodes[&self.root].layout_version;
        if let Some(cache) = self.nodes[&id].collection.measure_cache {
            if cache.version == version && cache.available == available && cache.dpr == self.dpr {
                return cache.result;
            }
        }
        let result = self.measure_node(id, available, measure);
        self.nodes.get_mut(&id).unwrap().collection.measure_cache = Some(ItemMeasureCache {
            version,
            available,
            dpr: self.dpr,
            result,
        });
        result
    }
    pub(super) fn measure_collection(
        &mut self,
        id: u32,
        available: [f64; 2],
        measure: &mut impl TextMeasurer,
    ) -> [f64; 2] {
        if self.nodes[&id].kind == NodeKind::TreeView {
            self.prepare_navigation_glyphs(id, measure);
        }
        let p = self.nodes[&id].props.clone();
        let header=self.nodes[&id].collection.header.filter(|h|self.nodes.contains_key(h));
        let header_size=header.map(|h|self.measure_node(h,[available[0],f64::INFINITY],measure)).unwrap_or([0.;2]);
        self.nodes.get_mut(&id).unwrap().collection.header_size=header_size;
        let grid = self.nodes[&id].kind == NodeKind::GridView;
        let first = if p.collection_items.is_empty() {
            [
                scalar(&format!("{}MinWidth", prefix(grid))) + if grid { 4. } else { 0. },
                scalar(&format!("{}MinHeight", prefix(grid))) + if grid { 4. } else { 0. },
            ]
        } else {
            self.prepare_collection_item(id, 0)
                .map(|child| {
                    self.measure_collection_child(
                        child,
                        if grid {
                            [f64::INFINITY, f64::INFINITY]
                        } else {
                            [available[0], f64::INFINITY]
                        },
                        measure,
                    )
                })
                .unwrap_or([88., 40.])
        };
        if let Some(child) = p
            .collection_items
            .first()
            .and_then(|d| self.nodes[&id].collection.realized.get(&d.id))
            .copied()
        {
            self.nodes.get_mut(&id).unwrap().collection.content_size =
                self.nodes[&child].desired_without_margin;
        }
        let panel = p.items_panel.unwrap_or(if grid {
            NodeKind::ItemsWrapGrid
        } else {
            NodeKind::ItemsStackPanel
        });
        let cell = [
            p.item_width.unwrap_or(first[0]).max(1.),
            p.item_height.unwrap_or(first[1]).max(1.),
        ];
        let g = geometry(panel, &p, p.collection_items.len(), cell, available);
        let custom_extent=self.items_view_layout(id,available,cell);
        let mut extent = g.extent(if available[0].is_finite() {
            available[0]
        } else {
            cell[0]
        });
        let gap=reading_controls::item_gaps(&p);if !p.collection_items.is_empty(){extent=[(extent[0]-gap[0]).max(0.),(extent[1]-gap[1]).max(0.)];}
        // Measure and Arrange may express the same physical width with slightly
        // different floating point values. Keep adaptive measurements keyed to
        // the actual pixel constraint instead of clearing them every pass.
        let cross = available[usize::from(if g.stack { g.horizontal } else { !g.horizontal })];
        let cross = if cross.is_finite() { (cross * self.dpr + 1e-9).floor() / self.dpr } else { cross };
        let state = &mut self.nodes.get_mut(&id).unwrap().collection;
        state.geometry = g;
        state.adaptive.ensure(&p,g,cross);
        if custom_extent.is_some(){state.adaptive.enabled=false;}
        let mut extent = extent;
        if state.adaptive.enabled {
            extent[usize::from(!state.adaptive.horizontal)] = state.adaptive.total();
        }
        extent[1]+=header_size[1];extent[0]=extent[0].max(header_size[0]);
        self.nodes.get_mut(&id).unwrap().scroll.extent = extent;
        // A stacking panel stretches its item slots during Arrange. That viewport
        // width is not its natural DesiredSize (e.g. an auto-sized, centered
        // ListView inside RefreshContainer). Keep the scroll extent stretched,
        // but report the measured content on the non-scrolling axis.
        if let Some(custom)=custom_extent{extent=custom;self.nodes.get_mut(&id).unwrap().scroll.extent=extent;}
        let mut desired = extent;
        if g.stack && custom_extent.is_none(){
            let cross = usize::from(g.horizontal);
            desired[cross] = cell[cross].max(header_size[cross]);
            for child in self.nodes[&id].collection.realized.values() {
                desired[cross] = desired[cross].max(self.nodes[child].desired[cross]);
            }
        }
        [desired[0].min(available[0]), desired[1].min(available[1])]
    }
    pub(super) fn arrange_collection(
        &mut self,
        id: u32,
        inner: Rect,
        measure: &mut impl TextMeasurer,
    ) {
        self.nodes
            .get_mut(&id)
            .unwrap()
            .collection
            .realization_error = None;
        self.measure_collection(id, [inner.width, inner.height], measure);
        let awaiting_template=self.nodes[&id].kind==NodeKind::ItemsView&&self.nodes[&id].props.has_item_template&&self.nodes[&id].props.collection_items.first().and_then(|d|self.nodes[&id].collection.realized.get(&d.id)).is_some_and(|c|self.nodes[c].children.is_empty());
        let n = self.nodes.get_mut(&id).unwrap();
        n.scroll.viewport = [inner.width, inner.height];
        if !n.scroll.initialized {
            n.scroll.initialized = true;
            n.scroll.zoom.set(1., self.time, false);
            n.scroll.x.set(n.props.horizontal_offset, self.time, false);
            n.scroll.y.set(n.props.vertical_offset, self.time, false);
        }
        let max = n.scroll.max(self.time);
        if n.props.horizontal_offset > max[0] {
            n.props.horizontal_offset = max[0];
            n.scroll.x.set(max[0], self.time, false);
        }
        if n.props.vertical_offset > max[1] {
            n.props.vertical_offset = max[1];
            n.scroll.y.set(max[1], self.time, false);
        }
        let g = n.collection.geometry;
        let mut offset = n.scroll.offsets(self.time);
        offset[1]=(offset[1]-n.collection.header_size[1]).max(0.);
        let cache = n.props.cache_length / 2.;
        let vertical = g.stack && !g.horizontal || !g.stack && g.horizontal;
        let axis = usize::from(vertical);
        let line = g.cell[axis].max(1.);
        // Realize the presented viewport, not the entire interval between it
        // and the animation destination. A continuous wheel stream otherwise
        // expands the live subtree with its lag and can exhaust the budget.
        let begin = ((offset[axis] - n.scroll.viewport[axis] * cache) / line)
            .floor()
            .max(0.) as usize;
        let end = ((offset[axis] + n.scroll.viewport[axis] * (1. + cache)) / line)
            .ceil()
            .max(0.) as usize;
        let per = if g.stack { 1 } else { g.per_line };
        let start = begin.saturating_mul(per).min(g.count);
        let requested_finish = end.saturating_mul(per).min(g.count);
        let finish = requested_finish.min(start + 512);
        if requested_finish > finish {
            n.collection.realization_error = Some("collection realization window exceeds the 512-container budget; reduce cache or cell density".into());
        }
        let mut wanted = if n.collection.adaptive.enabled {
            let layout = &n.collection.adaptive;
            let range = layout.window(
                (offset[axis] - n.scroll.viewport[axis] * cache).max(0.),
                offset[axis] + n.scroll.viewport[axis] * (1. + cache),
            );
            layout.bands[range]
                .iter()
                .filter_map(|band| match band.kind {
                    adaptive::BandKind::Items { start, count } => Some(start..start + count),
                    _ => None,
                })
                .flatten()
                .take(512)
                .collect::<BTreeSet<_>>()
        } else {
            (start..finish).collect::<BTreeSet<_>>()
        };
        if n.kind==NodeKind::ItemsView&&!n.reading.item_slots.is_empty(){let lo=offset[axis]-n.scroll.viewport[axis]*cache;let hi=offset[axis]+n.scroll.viewport[axis]*(1.+cache);wanted=n.reading.item_slots.iter().enumerate().filter(|(_,r)|if axis==1{r.y+r.height>=lo&&r.y<=hi}else{r.x+r.width>=lo&&r.x<=hi}).map(|(i,_)|i).take(512).collect();}
        if n.kind==NodeKind::ItemsView&&matches!(n.props.reading.as_deref().and_then(|q|q.layout.as_ref()),Some(repeater::RepeaterLayout::StackLayout(l))if l.disable_virtualization){wanted=(0..g.count).take(4096).collect();}
        if awaiting_template {wanted=if g.count>0{[0].into_iter().collect()}else{BTreeSet::new()};}
        if n.collection.drag.active {
            if let Some(index) = n
                .collection
                .drag
                .origin
                .as_ref()
                .and_then(|key| n.collection.indices.get(key))
            {
                wanted.insert(*index);
            }
        }
        if g.count > 0 {
            wanted.insert(0);
        } // first-container measurement anchor
        let keys = wanted
            .iter()
            .map(|i| self.nodes[&id].props.collection_items[*i].id.clone())
            .collect::<HashSet<_>>();
        let remove = self.nodes[&id]
            .collection
            .realized
            .iter()
            .filter(|(k, _)| !keys.contains(*k))
            .map(|(k, c)| (k.clone(), *c))
            .collect::<Vec<_>>();
        let mut changed = !remove.is_empty();
        for (key, child) in remove {
            self.destroy(child).expect("live realized container");
            self.nodes
                .get_mut(&id)
                .unwrap()
                .collection
                .realized
                .remove(&key);
        }
        for i in wanted {
            let before = self.nodes[&id].collection.realized.len();
            let Some(child) = self.prepare_collection_item(id, i) else {
                break;
            };
            changed |= self.nodes[&id].collection.realized.len() != before;
            let d = self.nodes[&id].props.collection_items[i].clone();
            if self.nodes[&id].table.owner.is_some() {
                // Internal TableView templates must exist before measuring the
                // newly realized container, even without another animation RAF.
                self.prepare_table_filter_item(id,child,&d.id,&d.text);
            }
            let templated = self.nodes[&id].props.has_item_template;
            {
                let n = self.nodes.get_mut(&child).unwrap();
                n.props.collection_index = i;
                n.props.enabled = d.enabled;
                if !templated {
                    n.props.text = d.text;
                }
            }
            let adaptive = self.nodes[&id].collection.adaptive.enabled;
            let available = if adaptive && g.stack {
                if g.horizontal {
                    [f64::INFINITY, inner.height]
                } else {
                    [inner.width, f64::INFINITY]
                }
            } else {
                self.nodes[&id].reading.item_slots.get(i).map(|r|[r.width,r.height]).unwrap_or(g.cell)
            };
            let size = self.measure_collection_child(child, available, measure);
            if adaptive {
                let key = self.nodes[&id].props.collection_items[i].id.clone();
                let gap=reading_controls::item_gaps(&self.nodes[&id].props);
                let axis = usize::from(!g.horizontal);
                let changed = self
                    .nodes
                    .get_mut(&id)
                    .unwrap()
                    .collection
                    .adaptive
                    .measure_item(&key, i, size[axis]+gap[axis], g);
                if changed {
                    self.nodes.get_mut(&id).unwrap().collection.layout_unsettled = true;
                    self.invalidate(id, true);
                }
            }
            let mut rect = self.collection_item_rect(id, i, inner.width);
            let n = &self.nodes[&id];
            let extra = (inner.height - n.scroll.extent[1]).max(0.);
            rect.y += match n.props.items_panel_vertical_alignment {
                VerticalAlignment::Bottom => extra,
                VerticalAlignment::Center => extra / 2.,
                _ => 0.,
            };
            let mut rect = self.collection_drag_rect(id, i, rect);
            if self.nodes[&id].kind == NodeKind::GridView {
                let margin = self.nodes[&child]
                    .props
                    .margin
                    .map(|v| (v * self.dpr).round() / self.dpr);
                let content = self.nodes[&id].collection.content_size;
                rect.width = rect.width.min(content[0] + margin[0] + margin[2]);
                rect.height = rect.height.min(content[1] + margin[1] + margin[3]);
            }
            if self.nodes[&id].props.flow_direction == FlowDirection::RightToLeft {
                rect.x = self.nodes[&id].scroll.extent[0].max(inner.width) - rect.x - rect.width;
            }
            rect = self.collection_transition_arrange(child, rect);
            let n = &self.nodes[&id];
            let world = n.world.multiply(n.scroll.matrix(self.time));
            let inherited = (n.theme, n.enabled, n.visible);
            self.arrange_node(
                child,
                Rect::new(inner.x + rect.x, inner.y + rect.y, rect.width, rect.height),
                world,
                inherited,
                measure,
            );
        }
        if let Some(header)=self.nodes[&id].collection.header.filter(|h|self.nodes.contains_key(h)){
            let n=&self.nodes[&id];let world=n.world.multiply(n.scroll.matrix(self.time));let inherited=(n.theme,n.enabled,n.visible);let height=n.collection.header_size[1];self.arrange_node(header,Rect::new(inner.x,inner.y,inner.width,height),world,inherited,measure);
        }
        self.arrange_collection_headers(id, inner, measure);
        self.collection_loading(id);
        if self.nodes[&id].collection.adaptive.enabled {
            let axis = usize::from(!self.nodes[&id].collection.adaptive.horizontal);
            let total = self.nodes[&id].collection.adaptive.total();
            self.nodes.get_mut(&id).unwrap().scroll.extent[axis] = total+if axis==1{self.nodes[&id].collection.header_size[1]}else{0.};
        }
        self.restore_collection_anchor(id);
        if changed || self.nodes[&id].collection.realization_dirty {
            self.nodes
                .get_mut(&id)
                .unwrap()
                .collection
                .realization_dirty = false;
            self.emit(id, EventKind::RealizationChanged);
        }
    }
    pub(super) fn measure_items_panel(
        &mut self,
        id: u32,
        available: [f64; 2],
        measure: &mut impl TextMeasurer,
    ) -> [f64; 2] {
        let n = &self.nodes[&id];
        let kind = n.kind;
        let p = n.props.clone();
        let children = self.ordered_children(id);
        let mut sizes = Vec::new();
        for &child in &children {
            sizes.push(self.measure_node(
                child,
                [
                    p.item_width.unwrap_or(available[0]),
                    p.item_height.unwrap_or(available[1]),
                ],
                measure,
            ));
        }
        let first = sizes.first().copied().unwrap_or([0., 0.]);
        let cell = [
            p.item_width.unwrap_or(first[0]),
            p.item_height.unwrap_or(first[1]),
        ];
        let mut positions = HashMap::new();
        let mut extent = [0f64; 2];
        if kind == NodeKind::ItemsStackPanel {
            let horizontal = p.orientation == Orientation::Horizontal;
            let mut offset = 0.;
            for (&child, d) in children.iter().zip(&sizes) {
                let r = if horizontal {
                    Rect::new(offset, 0., d[0], available[1].min(d[1]))
                } else {
                    Rect::new(0., offset, available[0].min(d[0]), d[1])
                };
                positions.insert(child, r);
                offset += d[usize::from(!horizontal)];
                extent[0] = extent[0].max(r.x + r.width);
                extent[1] = extent[1].max(r.y + r.height);
            }
        } else if cell[0] > 0. && cell[1] > 0. {
            let count = if kind == NodeKind::VariableSizedWrapGrid {
                children
                    .iter()
                    .map(|c| {
                        if p.orientation == Orientation::Horizontal {
                            self.nodes[c].props.column_span
                        } else {
                            self.nodes[c].props.row_span
                        }
                    })
                    .sum()
            } else {
                children.len()
            };
            let g = geometry(kind, &p, count, cell, available);
            if kind == NodeKind::ItemsWrapGrid {
                for (i, &child) in children.iter().enumerate() {
                    let r = g.rect(i, available[0]);
                    positions.insert(child, r);
                }
                extent = g.extent(available[0]);
            } else {
                let direct = usize::from(!g.horizontal);
                let indirect = 1 - direct;
                let lines = if available[indirect].is_finite() {
                    (available[indirect] / cell[indirect]).floor().max(1.) as usize
                } else {
                    children
                        .iter()
                        .map(|c| {
                            if g.horizontal {
                                self.nodes[c].props.row_span
                            } else {
                                self.nodes[c].props.column_span
                            }
                        })
                        .sum::<usize>()
                        .max(1)
                };
                let mut occupied = HashSet::new();
                let mut cursor = 0usize;
                for &child in &children {
                    let cp = &self.nodes[&child].props;
                    let span_direct = if g.horizontal {
                        cp.column_span
                    } else {
                        cp.row_span
                    };
                    let span_indirect = if g.horizontal {
                        cp.row_span
                    } else {
                        cp.column_span
                    };
                    let a = span_direct.min(g.per_line);
                    let mut found = None;
                    while cursor < lines.saturating_mul(g.per_line) {
                        let x = cursor % g.per_line;
                        let y = cursor / g.per_line;
                        let b = span_indirect.min(lines - y);
                        if x + a <= g.per_line
                            && (0..a)
                                .all(|dx| (0..b).all(|dy| !occupied.contains(&(x + dx, y + dy))))
                        {
                            found = Some((x, y, b));
                            break;
                        }
                        cursor += 1;
                    }
                    if let Some((x, y, b)) = found {
                        for dx in 0..a {
                            for dy in 0..b {
                                occupied.insert((x + dx, y + dy));
                            }
                        }
                        let r = if g.horizontal {
                            Rect::new(
                                x as f64 * cell[0],
                                y as f64 * cell[1],
                                a as f64 * cell[0],
                                b as f64 * cell[1],
                            )
                        } else {
                            Rect::new(
                                y as f64 * cell[0],
                                x as f64 * cell[1],
                                b as f64 * cell[0],
                                a as f64 * cell[1],
                            )
                        };
                        positions.insert(child, r);
                        extent[0] = extent[0].max(r.x + r.width);
                        extent[1] = extent[1].max(r.y + r.height);
                    }
                }
            }
        }
        self.nodes.get_mut(&id).unwrap().collection.placements = positions;
        extent
    }
    pub(super) fn arrange_items_panel(
        &mut self,
        id: u32,
        inner: Rect,
        measure: &mut impl TextMeasurer,
    ) {
        self.measure_items_panel(id, [inner.width, inner.height], measure);
        let n = &self.nodes[&id];
        let world = n.world;
        let inherited = (n.theme, n.enabled, n.visible);
        let positions = n.collection.placements.clone();
        for child in self.ordered_children(id) {
            let mut r = positions.get(&child).copied().unwrap_or_default();
            if self.nodes[&id].props.flow_direction == FlowDirection::RightToLeft {
                r.x = inner.width - r.x - r.width;
            }
            self.arrange_node(
                child,
                Rect::new(inner.x + r.x, inner.y + r.y, r.width, r.height),
                world,
                inherited,
                measure,
            );
        }
    }
    pub(super) fn collection_activate(
        &mut self,
        owner: u32,
        index: usize,
        ctrl: bool,
        shift: bool,
        invoke: bool,
    ) -> Result<(), String> {
        if invoke&&self.semantic_collection_activate(owner,index)?{return Ok(());}
        if self.activate_navigation_tree(owner, index, invoke)? {
            return Ok(());
        }
        let n = self.get(owner)?;
        if !is_view(n.kind) || index >= n.props.collection_items.len() {
            return Err("invalid collection item".into());
        }
        let item = n.props.collection_items[index].clone();
        if !n.enabled || !item.enabled {
            return Ok(());
        }
        if invoke && n.props.is_item_click_enabled {
            let c = &mut self.nodes.get_mut(&owner).unwrap().collection;
            c.focus = Some(item.id.clone());
            c.request_counter = c.request_counter.wrapping_add(1);
            let request = c.request_counter;
            c.pending_click = Some((request, item.id.clone(), ctrl, shift));
            self.emit(owner, EventKind::ItemClick);
            let e = self.events.last_mut().unwrap();
            e.item_id = Some(item.id.clone());
            e.selected_index = Some(index as i32);
            e.request_id = Some(request);
            self.invalidate(owner, false);
            return Ok(());
        }
        let n = self.nodes.get_mut(&owner).unwrap();
        let old = n.collection.selected.clone();
        let mode = n.props.selection_mode;
        if mode != ListViewSelectionMode::None {
            if shift && mode == ListViewSelectionMode::Extended {
                let a = n
                    .collection
                    .anchor
                    .as_ref()
                    .and_then(|k| n.collection.indices.get(k))
                    .copied()
                    .unwrap_or(index);
                if !ctrl {
                    n.collection.selected.clear();
                }
                for i in a.min(index)..=a.max(index) {
                    if n.props.collection_items[i].enabled {
                        n.collection
                            .selected
                            .insert(n.props.collection_items[i].id.clone());
                    }
                }
            } else if mode == ListViewSelectionMode::Multiple || ctrl {
                if !n.collection.selected.remove(&item.id) {
                    if mode == ListViewSelectionMode::Single {
                        n.collection.selected.clear();
                    }
                    n.collection.selected.insert(item.id.clone());
                }
                n.collection.anchor = Some(item.id.clone());
            } else {
                n.collection.selected.clear();
                n.collection.selected.insert(item.id.clone());
                n.collection.anchor = Some(item.id.clone());
            }
        }
        n.collection.focus = Some(item.id.clone());
        let mut keys = n.collection.selected.iter().cloned().collect::<Vec<_>>();
        keys.sort_by_key(|key| n.collection.indices.get(key).copied().unwrap_or(usize::MAX));
        n.props.selected_keys = keys.into();
        n.collection.selected_source = n.props.selected_keys.clone();
        let changed = old != n.collection.selected;
        if changed {
            n.collection.selection_revision += 1;
            self.emit(owner, EventKind::SelectionChanged);
            let e = self.events.last_mut().unwrap();
            e.item_id = Some(item.id);
            e.selected_index = Some(index as i32);
        }
        self.invalidate(owner, false);
        Ok(())
    }
    // Pointer-notification panels are hit-testable for hover, but selection
    // still bubbles to the item container. Embedded interactive controls keep
    // their own input and must not activate the surrounding item.
    fn collection_hit_item(&self,x:f64,y:f64)->Option<u32>{
        let mut at=self.hit(x,y)?;
        loop {
            let n=&self.nodes[&at];
            if n.kind==NodeKind::CollectionItem{return Some(at);}
            if !matches!(n.kind,NodeKind::Grid|NodeKind::StackPanel|NodeKind::Border|NodeKind::Canvas|NodeKind::RelativePanel|NodeKind::WrapPanel|NodeKind::VariableSizedWrapGrid|NodeKind::TextBlock|NodeKind::Image|NodeKind::Rectangle|NodeKind::Line|NodeKind::Path|NodeKind::Polygon|NodeKind::Polyline|NodeKind::SwipeControl){return None;}
            at=n.parent?;
        }
    }
    pub(super) fn collection_input(&mut self, input: &Input) -> Result<bool, String> {
        if self.advanced_collection_input(input)? {
            return Ok(true);
        }
        match input {
            Input::Focus { id } if is_view(self.get(*id)?.kind) => {
                let n = self.nodes.get_mut(id).unwrap();
                if n.enabled {
                    if n.collection.focus.is_none() {
                        n.collection.focus = n
                            .props
                            .collection_items
                            .iter()
                            .find(|d| d.enabled && n.collection.selected.contains(&d.id))
                            .or_else(|| n.props.collection_items.iter().find(|d| d.enabled))
                            .map(|d| d.id.clone());
                    }
                    self.focus(Some(*id));
                }
                return Ok(true);
            }
            Input::Touch {
                pointer,
                x,
                y,
                phase,
            } => {
                if phase == "down" {
                    let hit = self.collection_hit_item(*x,*y);
                    let multiple = self
                        .nodes
                        .values()
                        .any(|n| is_view(n.kind) && n.collection.touch_tap.is_some());
                    for n in self.nodes.values_mut().filter(|n| is_view(n.kind)) {
                        n.collection.touch_tap = None;
                    }
                    if !multiple {
                        if let Some(child) = hit {
                            let n = &self.nodes[&child];
                            let (owner, key) = (
                                n.props.collection_owner.unwrap(),
                                n.props.collection_key.clone(),
                            );
                            self.nodes.get_mut(&owner).unwrap().collection.touch_tap =
                                Some((*pointer, key, *x, *y));
                        }
                    }
                } else {
                    let taps = self
                        .nodes
                        .values()
                        .filter(|n| is_view(n.kind))
                        .filter_map(|n| n.collection.touch_tap.clone().map(|t| (n.id, t)))
                        .collect::<Vec<_>>();
                    for (owner, (p, key, sx, sy)) in taps {
                        if p != *pointer {
                            continue;
                        }
                        if phase == "cancel" || (*x - sx).hypot(*y - sy) > 10. {
                            self.nodes.get_mut(&owner).unwrap().collection.touch_tap = None;
                        } else if phase == "up" {
                            self.nodes.get_mut(&owner).unwrap().collection.touch_tap = None;
                            if let Some((id, row, expanded)) = self.tree_expander_at(*x, *y) {
                                if id == owner && row == key {
                                    self.focus(Some(id));
                                    self.nodes.get_mut(&id).unwrap().collection.focus = Some(row.clone());
                                    self.tree_expand(id, &row, expanded)?;
                                    continue;
                                }
                            }
                            if let Some(index) =
                                self.nodes[&owner].collection.indices.get(&key).copied()
                            {
                                self.focus(Some(owner));
                                let invoke=self.items_view_tap(owner,index);self.collection_activate(owner, index, false, false, invoke)?;
                            }
                        }
                    }
                }
            }
            Input::CollectionScroll { id, index } => {
                let n = self.get(*id)?;
                if !is_view(n.kind) || *index >= n.props.collection_items.len() {
                    return Err("invalid collection scroll item".into());
                }
                self.collection_bring(*id, *index)?;
                return Ok(true);
            }
            Input::CollectionCommit { id, request } => {
                if !is_view(self.get(*id)?.kind) {
                    return Err("not a collection".into());
                }
                let pending = self.nodes[id].collection.pending_click.clone();
                if let Some((r, key, ctrl, shift)) = pending {
                    if r == *request {
                        self.nodes.get_mut(id).unwrap().collection.pending_click = None;
                        let index = self.nodes[id]
                            .props
                            .collection_items
                            .iter()
                            .position(|d| d.id == key);
                        if let Some(index) = index.filter(|index|self.nodes[id].enabled&&self.nodes[id].props.collection_items[*index].enabled) {
                            self.collection_activate(*id, index, ctrl, shift, false)?;
                            if self.nodes[id].props.close_flyout {self.close_owner_flyout(*id)?;}
                        }
                    }
                }
                return Ok(true);
            }
            Input::CollectionInvoke {
                id,
                index,
                ctrl,
                shift,
            } => {
                let n = self.get(*id)?;
                if !is_view(n.kind) || *index >= n.props.collection_items.len() {
                    return Err("invalid collection item".into());
                }
                if !n.enabled || !n.props.collection_items[*index].enabled {
                    return Ok(true);
                }
                self.focus(Some(*id));
                self.collection_activate(*id, *index, *ctrl, *shift, true)?;
                self.collection_bring(*id, *index)?;
                return Ok(true);
            }
            Input::CollectionFocus { id, index } => {
                let n = self.get(*id)?;
                if !is_view(n.kind) || *index >= n.props.collection_items.len() {
                    return Err("invalid collection focus".into());
                }
                self.nodes.get_mut(id).unwrap().collection.focus =
                    Some(self.nodes[id].props.collection_items[*index].id.clone());
                self.focus(Some(*id));
                self.collection_bring(*id, *index)?;
                return Ok(true);
            }
            Input::Modifiers { ctrl, shift } => {
                for n in self.nodes.values_mut().filter(|n| is_view(n.kind)) {
                    n.collection.modifiers = (*ctrl, *shift);
                }
                return Ok(true);
            }
            Input::Down { x, y, pointer } => {
                if let Some(child) = self.collection_hit_item(*x,*y)
                {
                    let n = &self.nodes[&child];
                    let owner = n.props.collection_owner.unwrap();
                    let key = n.props.collection_key.clone();
                    self.nodes.get_mut(&owner).unwrap().collection.pressed = Some(key);
                    self.captured = Some((*pointer, child));
                    let input_owner = self.nodes[&owner].composed.owner.filter(|control| {
                        self.nodes[control].kind == NodeKind::AutoSuggestBox
                            || self.nodes[control].kind == NodeKind::ComboBox
                                && self.nodes[control].props.is_editable
                    });
                    let focus = input_owner.map_or(owner, |control| {
                        self.nodes[&control].composed.parts["InputBox"]
                    });
                    self.focus(Some(focus));
                    self.invalidate(owner, false);
                    return Ok(true);
                }
            }
            Input::Up { x, y, pointer } => {
                if let Some((p, child)) = self
                    .captured
                    .filter(|(_, id)| self.nodes[id].kind == NodeKind::CollectionItem)
                {
                    if p == *pointer {
                        let n = &self.nodes[&child];
                        let owner = n.props.collection_owner.unwrap();
                        let index = n.props.collection_index;
                        let inside = self.inside(child, *x, *y);
                        let (ctrl, shift) = self.nodes[&owner].collection.modifiers;
                        self.nodes.get_mut(&owner).unwrap().collection.pressed = None;
                        self.captured = None;
                        if inside {
                            let invoke=self.items_view_tap(owner,index);
                            self.collection_activate(owner, index, ctrl, shift, invoke)?;
                        }
                        return Ok(true);
                    }
                }
            }
            Input::Cancel { .. } => {
                for n in self.nodes.values_mut().filter(|n| is_view(n.kind)) {
                    n.collection.pressed = None;
                }
            }
            Input::Move { x, y, .. } => {
                self.pointer = Some((*x, *y));
            }
            Input::KeyDown { key, repeat } => {
                if let Some(owner) = self.focused.filter(|id| is_view(self.nodes[id].kind)) {
                    if *repeat && matches!(key.rsplit('+').next(), Some(" " | "Space" | "Enter")) {
                        return Ok(true);
                    }
                    return self.collection_key(owner, key);
                }
            }
            _ => {}
        }
        Ok(false)
    }
    fn collection_key(&mut self, owner: u32, key: &str) -> Result<bool, String> {
        let n = &self.nodes[&owner];
        if n.props.collection_items.is_empty() || !n.enabled {
            return Ok(false);
        }
        let ctrl = key.contains("Ctrl+");
        let shift = key.contains("Shift+");
        let base = key.rsplit('+').next().unwrap_or(key);
        let index = n
            .collection
            .focus
            .as_ref()
            .and_then(|k| n.collection.indices.get(k))
            .copied()
            .unwrap_or(0);
        let len = n.props.collection_items.len();
        if key.contains("Alt+")
            && shift
            && !ctrl
            && matches!(base, "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight")
        {
            if n.props.can_reorder_items
                && n.props.allow_drop
                && n.props.collection_groups.is_empty()
            {
                let focused = &n.props.collection_items[index].id;
                let indices = n
                    .props
                    .collection_items
                    .iter()
                    .enumerate()
                    .filter(|(_, d)| {
                        d.enabled
                            && if n.collection.selected.contains(focused) {
                                n.collection.selected.contains(&d.id)
                            } else {
                                &d.id == focused
                            }
                    })
                    .map(|(i, _)| i)
                    .collect::<Vec<_>>();
                let mut higher = matches!(base, "ArrowRight" | "ArrowDown");
                if self.effective_flow_direction(owner) == FlowDirection::RightToLeft
                    && n.props.orientation == Orientation::Horizontal
                {
                    higher = !higher;
                }
                if let (Some(first), Some(last)) = (indices.first(), indices.last()) {
                    let gap = if higher {
                        last.checked_add(2).filter(|i| *i <= len)
                    } else {
                        first.checked_sub(1)
                    };
                    if let Some(gap) = gap {
                        let focused = focused.clone();
                        let keys = indices
                            .iter()
                            .map(|i| n.props.collection_items[*i].id.clone())
                            .collect();
                        self.advanced_collection_input(&Input::CollectionReorder {
                            id: owner,
                            keys,
                            index: gap,
                        })?;
                        if let Some(index) = self.nodes[&owner]
                            .props
                            .collection_items
                            .iter()
                            .position(|d| d.id == focused)
                        {
                            self.collection_bring(owner, index)?;
                        }
                    }
                }
            }
            return Ok(true);
        }
        if base == "ContextMenu" || (shift && base == "F10") {
            let r = self.collection_item_rect(owner, index, n.scroll.viewport[0]);
            let (x, y) = n
                .world
                .multiply(n.scroll.matrix(self.time))
                .point(r.x + 16., r.y + r.height / 2.);
            self.advanced_collection_input(&Input::CollectionContext {
                id: owner,
                index,
                x,
                y,
            })?;
            return Ok(true);
        }
        if ctrl
            && base.eq_ignore_ascii_case("a")
            && matches!(
                n.props.selection_mode,
                ListViewSelectionMode::Extended | ListViewSelectionMode::Multiple
            )
        {
            let n = self.nodes.get_mut(&owner).unwrap();
            n.props.selected_keys = n
                .props
                .collection_items
                .iter()
                .filter(|d| d.enabled)
                .map(|d| d.id.clone())
                .collect::<Vec<_>>()
                .into();
            n.collection.selected = n.props.selected_keys.iter().cloned().collect();
            n.collection.selected_source = n.props.selected_keys.clone();
            self.emit(owner, EventKind::SelectionChanged);
            self.invalidate(owner, false);
            return Ok(true);
        }
        if matches!(base, " " | "Space" | "Enter") {
            self.collection_activate(owner, index, ctrl, shift, true)?;
            return Ok(true);
        }
        let g = n.collection.geometry;
        let rtl = n.props.flow_direction == FlowDirection::RightToLeft;
        let step = if g.stack { 1 } else { g.per_line };
        if g.stack
            && ((!g.horizontal && matches!(base, "ArrowLeft" | "ArrowRight"))
                || (g.horizontal && matches!(base, "ArrowUp" | "ArrowDown")))
        {
            return Ok(false);
        }
        let delta = match base {
            "ArrowDown" => {
                if g.horizontal && !g.stack {
                    step as i64
                } else {
                    1
                }
            }
            "ArrowUp" => {
                if g.horizontal && !g.stack {
                    -(step as i64)
                } else {
                    -1
                }
            }
            "ArrowRight" => {
                if rtl {
                    -if !g.stack && !g.horizontal {
                        step as i64
                    } else {
                        1
                    }
                } else {
                    if !g.stack && !g.horizontal {
                        step as i64
                    } else {
                        1
                    }
                }
            }
            "ArrowLeft" => {
                if rtl {
                    if !g.stack && !g.horizontal {
                        step as i64
                    } else {
                        1
                    }
                } else {
                    -if !g.stack && !g.horizontal {
                        step as i64
                    } else {
                        1
                    }
                }
            }
            "PageDown" => (n.scroll.viewport[1] / g.cell[1]).floor().max(1.) as i64 * step as i64,
            "PageUp" => -((n.scroll.viewport[1] / g.cell[1]).floor().max(1.) as i64) * step as i64,
            "Home" => -(len as i64),
            "End" => len as i64,
            _ => return Ok(false),
        };
        let mut next = (index as i64 + delta).clamp(0, len as i64 - 1) as usize;
        if n.kind==NodeKind::ItemsView&&!n.reading.item_slots.is_empty()&&matches!(base,"ArrowUp"|"ArrowDown"|"ArrowLeft"|"ArrowRight"){
            let slots=&n.reading.item_slots;let r=slots[index];let cx=r.x+r.width/2.;let cy=r.y+r.height/2.;
            let right=(base=="ArrowRight")!=rtl;
            let candidate=slots.iter().enumerate().filter(|(i,s)|*i!=index&&n.props.collection_items[*i].enabled&&match base{"ArrowUp"=>s.y+s.height/2.<cy-1.,"ArrowDown"=>s.y+s.height/2.>cy+1.,_=>if right{s.x+s.width/2.>cx+1.}else{s.x+s.width/2.<cx-1.}}).min_by(|(_,a),(_,b)|{
                let distance=|s:&Rect|{let dx=(s.x+s.width/2.-cx).abs();let dy=(s.y+s.height/2.-cy).abs();if matches!(base,"ArrowUp"|"ArrowDown"){dy*10000.+dx}else{dy*10000.+dx}};distance(a).total_cmp(&distance(b))
            });if let Some((i,_))=candidate{next=i}else{next=index}
        }
        let direction = if delta < 0 { -1 } else { 1 };
        while !self.nodes[&owner].props.collection_items[next].enabled {
            let i = next as i64 + direction;
            if i < 0 || i >= len as i64 {
                return Ok(true);
            }
            next = i as usize;
        }
        if ctrl || self.nodes[&owner].props.selection_mode == ListViewSelectionMode::Multiple {
            let key = self.nodes[&owner].props.collection_items[next].id.clone();
            self.nodes.get_mut(&owner).unwrap().collection.focus = Some(key);
        } else {
            self.collection_activate(owner, next, false, shift, false)?;
        }
        self.collection_bring(owner, next)?;
        Ok(true)
    }
    pub(super) fn collection_bring(&mut self, owner: u32, index: usize) -> Result<(), String> {
        let n = &self.nodes[&owner];
        let mut r = self.collection_item_rect(owner, index, n.scroll.viewport[0]);
        if n.props.flow_direction == FlowDirection::RightToLeft {
            r.x = n.scroll.extent[0].max(n.scroll.viewport[0]) - r.x - r.width;
        }
        let [x, y] = n.scroll.offsets(self.time);
        let [w, h] = n.scroll.viewport;
        let nx = if r.x < x {
            r.x
        } else if r.x + r.width > x + w {
            r.x + r.width - w
        } else {
            x
        };
        let ny = if r.y < y {
            r.y
        } else if r.y + r.height > y + h {
            r.y + r.height - h
        } else {
            y
        };
        self.scroll_change(owner, Some(nx), Some(ny), None, false)?;
        self.invalidate(owner, true);
        Ok(())
    }
    pub(super) fn paint_collection_item(&self, id: u32, out: &mut Vec<Draw>) -> String {
        if let Some(color)=self.paint_items_view(id,out){return color;}
        if let Some(color) = self.paint_navigation_tree_item(id, out) {
            return color;
        }
        if let Some(foreground) = self.paint_combo_item(id, out) {
            return foreground;
        }
        let n = &self.nodes[&id];
        let owner = n.props.collection_owner.unwrap();
        let root = &self.nodes[&owner];
        let grid = root.kind == NodeKind::GridView;
        let key = &n.props.collection_key;
        let selected = root.collection.selected.contains(key);
        let hovered = self.pointer.is_some_and(|(x, y)| self.inside(id, x, y));
        let pressed = root.collection.pressed.as_ref() == Some(key);
        let prefix = prefix(grid);
        let state = if pressed {
            "Pressed"
        } else if hovered {
            "PointerOver"
        } else {
            ""
        };
        let bg_key = if !n.enabled && selected {
            format!("{prefix}BackgroundSelectedDisabled")
        } else if !n.enabled {
            format!("{prefix}Background")
        } else if selected {
            format!("{prefix}BackgroundSelected{state}")
        } else {
            format!("{prefix}Background{state}")
        };
        let r = Rect::new(0., 0., n.rect.width, n.rect.height);
        let round = |v: f64| (v * self.dpr).round() / self.dpr;
        let bg = brush(n.theme, &bg_key);
        Self::brush_command(
            out,
            if grid {
                r
            } else {
                Rect::new(
                    round(4.),
                    round(2.),
                    (r.width - round(4.) * 2.).max(0.),
                    (r.height - round(2.) * 2.).max(0.),
                )
            },
            scalar(&format!("{prefix}CornerRadius")),
            0.,
            &bg,
        );
        if !grid
            && root.props.selection_mode != ListViewSelectionMode::Multiple
            && n.collection.indicator_opacity.value(self.time) > 0.
        {
            let h = n.collection.indicator_layout_height;
            let scale = n.collection.indicator_scale.value(self.time);
            let top = round((r.height - h) / 2.);
            let center = top + h / 2.;
            out.push(Draw::Save);
            out.push(Draw::Transform {
                matrix: [1., 0., 0., scale, 0., center * (1. - scale)],
            });
            out.push(Draw::Layer {
                opacity: n.collection.indicator_opacity.value(self.time),
            });
            out.push(Draw::Fill {
                rect: Rect::new(
                    if self.effective_flow_direction(owner) == FlowDirection::RightToLeft {
                        r.width - round(4.) - round(3.)
                    } else {
                        round(4.)
                    },
                    top,
                    round(3.),
                    round(h),
                ),
                color: brush(
                    n.theme,
                    if !n.enabled {
                        "ListViewItemSelectionIndicatorDisabledBrush"
                    } else if pressed {
                        "ListViewItemSelectionIndicatorPressedBrush"
                    } else if hovered {
                        "ListViewItemSelectionIndicatorPointerOverBrush"
                    } else {
                        "ListViewItemSelectionIndicatorBrush"
                    },
                )
                .solid_color(),
                radius: 1.5,
            });
            out.push(Draw::EndLayer);
            out.push(Draw::Restore);
        }
        let fg_key = if selected {
            format!("{prefix}ForegroundSelected")
        } else if hovered {
            format!("{prefix}ForegroundPointerOver")
        } else {
            format!("{prefix}Foreground")
        };
        brush(n.theme, &fg_key).solid_color()
    }
    pub(super) fn paint_collection_item_border(&self, id: u32, out: &mut Vec<Draw>) {
        if self.paint_items_view_border(id,out){return;}
        if self.nodes[&id]
            .props
            .collection_owner
            .is_some_and(|owner| self.nodes[&owner].kind == NodeKind::TreeView)
        {
            return;
        }
        if self.is_combo_item(id) {
            return;
        }
        let n = &self.nodes[&id];
        let root = &self.nodes[&n.props.collection_owner.unwrap()];
        let selected = root.collection.selected.contains(&n.props.collection_key);
        let hovered = self.pointer.is_some_and(|(x, y)| self.inside(id, x, y));
        let pressed = root.collection.pressed.as_ref() == Some(&n.props.collection_key);
        if root.kind == NodeKind::GridView && (selected || n.enabled && hovered && !pressed) {
            let key = if !selected {
                "GridViewItemPointerOverBorderBrush"
            } else if !n.enabled {
                "GridViewItemSelectedDisabledBorderBrush"
            } else if root.collection.pressed.as_ref() == Some(&n.props.collection_key) {
                "GridViewItemSelectedPressedBorderBrush"
            } else if self.pointer.is_some_and(|(x, y)| self.inside(id, x, y)) {
                "GridViewItemSelectedPointerOverBorderBrush"
            } else {
                "GridViewItemSelectedBorderBrush"
            };
            let outer_brush = brush(n.theme, key);
            let outer = outer_brush.solid_color();
            let round = |v: f64| (v * self.dpr).round() / self.dpr;
            let thickness = round(if selected { 2. } else { 1. });
            let outer_border = Draw::Border {
                rect: Rect::new(0., 0., n.rect.width, n.rect.height),
                thickness: [thickness; 4],
                radius: [4.; 4],
                color: outer,
                background: None,
            };
            // IsOpaqueBrush checks the stored color alpha, not Brush.Opacity.
            let nested = crate::material::rgba(&outer_brush.color)[3] >= 1.;
            if !selected || !nested {
                out.push(outer_border.clone());
            }
            if selected {
                // Native chrome nests a bloated inner border for opaque outer brushes.
                // Alpha outer brushes instead overlap a full-sized inner border.
                let inset = if nested { thickness - round(1.) } else { 0. };
                out.push(Draw::Border {
                    rect: Rect::new(
                        inset,
                        inset,
                        (n.rect.width - 2. * inset).max(0.),
                        (n.rect.height - 2. * inset).max(0.),
                    ),
                    thickness: [round(if nested { 2. } else { 3. }); 4],
                    radius: [if nested { 2. } else { 4. }; 4],
                    color: brush(n.theme, "GridViewItemSelectedInnerBorderBrush").solid_color(),
                    background: None,
                });
            }
            if selected && nested {
                out.push(outer_border);
            }
        }
        if root.props.selection_mode == ListViewSelectionMode::Multiple
            && !self.is_multi_combo_presenter(root.id)
        {
            let grid = root.kind == NodeKind::GridView;
            let selected = root.collection.selected.contains(&n.props.collection_key);
            let prefix = prefix(grid);
            let hovered = self.pointer.is_some_and(|(x, y)| self.inside(id, x, y));
            let pressed = root.collection.pressed.as_ref() == Some(&n.props.collection_key);
            let state = if !n.enabled {
                "Disabled"
            } else if pressed {
                "Pressed"
            } else if hovered {
                "PointerOver"
            } else {
                ""
            };
            let r = if grid {
                Rect::new(n.rect.width - 24., 4., 20., 20.)
            } else {
                Rect::new(
                    if self.effective_flow_direction(root.id) == FlowDirection::RightToLeft {
                        n.rect.width - 34.
                    } else {
                        14.
                    },
                    (n.rect.height - 20.) / 2.,
                    20.,
                    20.,
                )
            };
            let fill = brush(
                n.theme,
                &format!(
                    "{prefix}CheckBox{}{state}Brush",
                    if selected { "Selected" } else { "" }
                ),
            );
            let border = if selected {
                fill.clone()
            } else {
                brush(n.theme, &format!("{prefix}CheckBox{state}BorderBrush"))
            };
            out.push(Draw::Border {
                rect: r,
                thickness: [1.; 4],
                radius: [3.; 4],
                color: border.solid_color(),
                background: Some(fill.solid_color()),
            });
            if selected {
                let font = crate::typography::Font {
                    family: "Segoe Fluent Icons".into(),
                    size: 16.,
                    ..Default::default()
                };
                let text = &n.collection.check_label;
                let color = brush(
                    n.theme,
                    &format!(
                        "{prefix}Check{}Brush",
                        if !n.enabled {
                            "Disabled"
                        } else if pressed {
                            "Pressed"
                        } else {
                            ""
                        }
                    ),
                )
                .solid_color();
                for line in &text.lines {
                    out.push(Draw::Text {
                        style: font.style,
                        x: r.x + (20. - text.width) / 2.,
                        y: r.y + 2. + line.baseline,
                        text: line.text.clone(),
                        color: color.clone(),
                        size: 16.,
                        font: font.family.clone(),
                        max_width: 20.,
                        weight: 400,
                    });
                }
            }
        }
    }
}

impl Scene {
 pub fn collection_header_slot(&mut self,owner:u32)->Result<u32,String>{
  if !is_view(self.get(owner)?.kind){return Err("header requires a collection view".into());}
  if let Some(header)=self.nodes[&owner].collection.header.filter(|h|self.nodes.contains_key(h)){return Ok(header);}
  self.realizing_collection=Some(owner);let created=self.create(owner,NodeKind::CollectionHeader,serde_json::json!({"collectionOwner":owner,"collectionKey":"$header","padding":[0,0,0,0],"margin":[0,0,0,0],"minHeight":0,"fontSize":14,"fontWeight":400,"zIndex":0}));self.realizing_collection=None;let header=created?;self.nodes.get_mut(&owner).unwrap().collection.header=Some(header);self.invalidate(owner,true);Ok(header)
 }
}
