//! Fixed-SDK navigation controls. Rust owns parts, selection, layout, input and motion.
//! The browser projects these parts and retains business objects/template callbacks.
use super::*;
use crate::{
    animation::Motion,
    render::Draw,
    resources::Brush,
    typography::{Font, TextMeasurer},
};
use serde_json::{json, Value};
use std::collections::HashSet;
use std::sync::{Arc, OnceLock};
mod input;
mod layout;
mod paint;
mod transitions;
mod tree;
mod selector;

pub fn is_control(kind: NodeKind) -> bool {
    matches!(
        kind,
        NodeKind::FlipView
            | NodeKind::PipsPager
            | NodeKind::BreadcrumbBar
            | NodeKind::TreeView
            | NodeKind::TabView | NodeKind::SelectorBar
    )
}
/// MUX_TreeViewItemStyle: 4 DIP presenter inset; checkbox 32+10,
/// expander glyph 12 and trailing padding 14 in multi-select mode.
pub(in crate::scene) fn tree_columns(dpr: f64, multiple: bool) -> (f64, f64, f64) {
    if multiple {
        let check = 4. + (10. * dpr).ceil() / dpr;
        let chevron = check + 32.;
        let content = chevron + (26. * dpr).ceil() / dpr;
        (check, chevron, content)
    } else {
        (0., 4., 44.)
    }
}
pub fn contract() -> &'static Value {
    static DATA: OnceLock<Value> = OnceLock::new();
    DATA.get_or_init(|| {
        serde_json::from_str(include_str!(
            "../../references/navigation-controls-template.json"
        ))
        .unwrap()
    })
}
fn scalar(key: &str) -> f64 {
    contract()["metrics"][key]["value"]
        .as_str()
        .unwrap_or_else(|| panic!("Missing native metric {key}"))
        .parse()
        .unwrap()
}
fn glyph(key: &str) -> String {
    contract()["metrics"][key]["value"].as_str().unwrap().into()
}
fn brush(theme: Theme, key: &str) -> Brush {
    if theme == Theme::HighContrast {
        return serde_json::from_value(json!({"kind":"solid","color":if key.contains("Background")||key.contains("Fill") {"#000000"}else{"#ffffff"}})).unwrap();
    }
    let Some(value) = contract()["palettes"][theme.as_str()].get(key) else {
        return crate::resources::Resources::current()
            .resolve(
                theme,
                if key == "TabViewItemSeparator" {
                    "DividerStrokeColorDefaultBrush"
                } else {
                    key
                },
            )
            .unwrap_or_else(|_| panic!("Unmapped navigation brush {key}"))
            .clone();
    };
    if value.is_null() {
        return serde_json::from_value(json!({"kind":"solid","color":"#00000000"})).unwrap();
    }
    serde_json::from_value(value.clone())
        .unwrap_or_else(|e| panic!("Invalid native navigation brush {key}: {e}"))
}
fn color(theme: Theme, key: &str) -> String {
    brush(theme, key).solid_color()
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct NavigationItem {
    pub id: String,
    pub text: String,
    pub icon: String,
    pub image_source: String,
    pub background: Option<String>,
    pub content_text: String,
    pub parent: Option<String>,
    pub is_expanded: bool,
    pub has_unrealized_children: bool,
    pub is_closable: bool,
    pub enabled: bool,
}
impl Default for NavigationItem {
    fn default() -> Self {
        Self {
            id: String::new(),
            text: String::new(),
            icon: String::new(),
            image_source: String::new(),
            background: None,
            content_text: String::new(),
            parent: None,
            is_expanded: false,
            has_unrealized_children: false,
            is_closable: true,
            enabled: true,
        }
    }
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct NavigationProperties {
    pub items: Arc<Vec<NavigationItem>>,
    pub number_of_pages: i32,
    pub selected_page_index: i32,
    pub max_visible_pips: u32,
    pub previous_button_visibility: PipsPagerButtonVisibility,
    pub next_button_visibility: PipsPagerButtonVisibility,
    pub wrap_mode: PipsPagerWrapMode,
    pub tree_selection_mode: TreeViewSelectionMode,
    pub expanded_keys: Arc<Vec<String>>,
    pub tab_width_mode: TabViewWidthMode,
    pub close_button_overlay_mode: TabViewCloseButtonOverlayMode,
    pub is_add_tab_button_visible: bool,
    pub can_drag_tabs: bool,
    pub can_reorder_tabs: bool,
    pub allow_drop_tabs: bool,
    pub tab_strip_header_width: f64,
    pub tab_strip_footer_width: f64,
    pub tab_strip_background: Option<String>,
}
impl Default for NavigationProperties {
    fn default() -> Self {
        Self {
            items: Default::default(),
            number_of_pages: -1,
            selected_page_index: 0,
            max_visible_pips: 5,
            previous_button_visibility: Default::default(),
            next_button_visibility: Default::default(),
            wrap_mode: Default::default(),
            tree_selection_mode: Default::default(),
            expanded_keys: Default::default(),
            tab_width_mode: Default::default(),
            close_button_overlay_mode: Default::default(),
            is_add_tab_button_visible: true,
            can_drag_tabs: false,
            can_reorder_tabs: true,
            allow_drop_tabs: false,
            tab_strip_header_width: 0.,
            tab_strip_footer_width: 0.,
            tab_strip_background: None,
        }
    }
}
impl NavigationProperties {
    pub fn is_default(&self) -> bool {
        self.items.is_empty()
            && self.number_of_pages == -1
            && self.selected_page_index == 0
            && self.max_visible_pips == 5
            && self.previous_button_visibility == PipsPagerButtonVisibility::Collapsed
            && self.next_button_visibility == PipsPagerButtonVisibility::Collapsed
            && self.wrap_mode == PipsPagerWrapMode::None
            && self.tree_selection_mode == TreeViewSelectionMode::Single
            && self.expanded_keys.is_empty()
            && self.tab_width_mode == TabViewWidthMode::Equal
            && self.close_button_overlay_mode == TabViewCloseButtonOverlayMode::Auto
            && self.is_add_tab_button_visible
            && !self.can_drag_tabs
            && self.can_reorder_tabs
            && !self.allow_drop_tabs
            && self.tab_strip_header_width == 0.
            && self.tab_strip_footer_width == 0.
            && self.tab_strip_background.is_none()
    }
}
pub fn defaults(kind: NodeKind, p: &mut NodeProperties) {
    if !is_control(kind) {
        return;
    }
    p.is_tab_stop = true;
    p.horizontal_alignment = HorizontalAlignment::Left;
    p.vertical_alignment = VerticalAlignment::Top;
    if !matches!(kind, NodeKind::TreeView | NodeKind::TabView) {
        p.clip = true;
    }
    if matches!(kind, NodeKind::FlipView | NodeKind::PipsPager) {
        p.orientation = Orientation::Horizontal;
    }
    if kind == NodeKind::SelectorBar { p.padding=[0.,4.,0.,4.];p.selected_index = -1; }
    if kind == NodeKind::FlipView {
        p.corner_radius = 4.;
    }
    if matches!(kind, NodeKind::FlipView | NodeKind::TabView) {
        p.selected_index = 0;
    }
    if kind == NodeKind::TreeView {
        p.can_drag_items = true;
        p.can_reorder_items = true;
        p.allow_drop = true;
    }
}
pub fn validate(
    kind: NodeKind,
    p: &mut NodeProperties,
    patch: &serde_json::Map<String, Value>,
) -> Result<(), String> {
    if !is_control(kind) {
        return Ok(());
    }
    let nav = &mut p.nav_controls;
    if nav.number_of_pages < -1
        || nav.selected_page_index < 0
        || nav.max_visible_pips > 1000
        || nav.items.len() > 100000
    {
        return Err("Navigation page/source limits exceeded".into());
    }
    if [nav.tab_strip_header_width, nav.tab_strip_footer_width]
        .iter()
        .any(|v| !v.is_finite() || !(0. ..=100000.).contains(v))
    {
        return Err("Invalid tab strip template width".into());
    }
    for c in nav
        .tab_strip_background
        .iter()
        .chain(nav.items.iter().filter_map(|i| i.background.as_ref()))
    {
        if !crate::material::valid_color(c) {
            return Err("Invalid navigation background color".into());
        }
    }
    if patch
        .get("navControls")
        .and_then(|v| v.get("items"))
        .is_some()
    {
        let mut ids = HashMap::new();
        for (index, item) in nav.items.iter().enumerate() {
            if item.id.is_empty()
                || item.id.len() > 10000
                || item.text.len() > 1000000
                || item.image_source.len() > 1000000
                || ids.insert(item.id.as_str(), index).is_some()
            {
                return Err("Navigation items require unique bounded IDs/text".into());
            }
        }
        if kind == NodeKind::TreeView {
            for item in nav.items.iter() {
                let mut parent = item.parent.as_deref();
                let mut depth = 0;
                while let Some(key) = parent {
                    if key == item.id {
                        return Err("TreeView node cycle".into());
                    }
                    let Some(index) = ids.get(key) else {
                        return Err("TreeView parent is not in this source".into());
                    };
                    parent = nav.items[*index].parent.as_deref();
                    depth += 1;
                    if depth > 60 {
                        return Err("TreeView hierarchy exceeds depth budget".into());
                    }
                }
            }
        }
    }
    if kind == NodeKind::PipsPager && nav.number_of_pages >= 0 {
        nav.selected_page_index = nav
            .selected_page_index
            .min((nav.number_of_pages - 1).max(0));
    }
    if matches!(kind, NodeKind::FlipView | NodeKind::TabView) {
        p.selected_index = if nav.items.is_empty() {
            -1
        } else {
            p.selected_index.clamp(0, nav.items.len() as i32 - 1)
        };
    }
    Ok(())
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Part {
    pub key: String,
    pub role: String,
    pub index: i32,
    pub label: String,
    pub rect: Rect,
    pub visible: bool,
    pub enabled: bool,
    pub selected: bool,
    #[serde(skip)]
    text: crate::typography::TextLayout,
    #[serde(skip)]
    font: Font,
}
impl Part {
    fn new(
        key: impl Into<String>,
        role: &str,
        index: i32,
        label: impl Into<String>,
        rect: Rect,
    ) -> Self {
        Self {
            key: key.into(),
            role: role.into(),
            index,
            label: label.into(),
            rect,
            visible: true,
            enabled: true,
            selected: false,
            text: Default::default(),
            font: Default::default(),
        }
    }
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Slot {
    pub id: u32,
    pub key: String,
    pub role: String,
    pub index: usize,
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TreeRow {
    pub key: String,
    pub parent: Option<String>,
    pub depth: usize,
    pub index: usize,
    pub expanded: bool,
    pub has_children: bool,
    pub selected: bool,
    pub partial: bool,
    pub position_in_set: usize,
    pub set_size: usize,
}
#[derive(Default)]
pub struct NavigationState {
    pub owner: Option<u32>,
    pub slot_key: String,
    pub slot_role: String,
    pub(super) parts: Vec<Part>,
    slots: HashMap<(String, String), u32>,
    source: Arc<Vec<NavigationItem>>,
    initialized: bool,
    item_indices: HashMap<String, usize>,
    pub focused_part: Option<String>,
    hovered: Option<String>,
    pressed: Option<(i32, String)>,
    page: super::scroll::ScrollTrack,
    pips_scroll: super::scroll::ScrollTrack,
    last_selected: i32,
    last_selected_key: Option<String>,
    pub(super) selection_explicit: bool,
    first_visible: i32,
    last_page_index: i32,
    tree_indices: HashMap<String, usize>,
    tree_children: HashMap<Option<String>, Vec<usize>>,
    pub tree_rows: HashMap<String, TreeRow>,
    tree_visible: Vec<usize>,
    tree_expanded_source: Arc<Vec<String>>,
    tree_selected_source: Arc<Vec<String>>,
    tree_declared_expanded: HashMap<String, bool>,
    tree_dirty: bool,
    popup: Option<u32>,
    last_activity: f64,
    last_wheel: Option<f64>,
    modifiers: (bool, bool),
    touch: Option<(i32, [f64; 2], f64)>,
    fade: Motion,
    drag: Option<(String, usize, usize)>,
    drop_committed: bool,
    tab_offer: Option<(Option<String>, usize, f64)>,
    tab_positions: HashMap<String, Motion>,
    selector_pills: HashMap<String, Motion>,
    tab_entries: HashMap<String, transitions::TabEntry>,
    pub(super) tab_cache: HashMap<String, Vec<Draw>>,
    tab_ghosts: Vec<transitions::TabGhost>,
    tab_shift: Option<(f64, f64, f64)>,
    bring_tab: bool,
    drag_position: Option<[f64; 2]>,
    glyphs: HashMap<String, crate::typography::TextLayout>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NavigationSnapshot {
    pub parts: Vec<Part>,
    pub slots: Vec<Slot>,
    pub selected_index: i32,
    pub selected_page_index: i32,
    pub first_visible_index: i32,
    pub focused_part: Option<String>,
    pub hovered_part: Option<String>,
    pub pressed_part: Option<String>,
    pub tree_rows: Vec<TreeRow>,
    pub dragging: bool,
    pub drag_index: Option<usize>,
    pub drag_target: Option<usize>,
    pub tab_visuals: Vec<transitions::TabVisual>,
}
impl NavigationState {
    pub fn animating(&self, time: f64) -> bool {
        self.page.active(time)
            || self.pips_scroll.active(time)
            || self.fade.active(time)
            || self.selector_pills.values().any(|m| m.active(time))
            || self.tab_positions.values().any(|m| m.active(time))
            || self.tab_entries.values().any(|m| m.active(time))
            || self.tab_ghosts.iter().any(|m| m.entry.active(time))
    }
}
impl Scene {
    pub fn invalidate_navigation_fonts(&mut self) {
        for n in self.nodes.values_mut() {
            n.nav_controls.glyphs.clear();
        }
        self.invalidate(self.root, true);
    }
    pub(super) fn forget_navigation_slot(&mut self, id: u32) {
        let owner = self.nodes.get(&id).and_then(|n| n.nav_controls.owner);
        if let Some(owner) = owner {
            if let Some(n) = self.nodes.get_mut(&owner) {
                n.nav_controls.slots.retain(|_, slot| *slot != id);
            }
        }
    }
    pub(super) fn navigation_control_deadline(&self) -> Option<f64> {
        self.nodes
            .values()
            .filter(|n| {
                n.kind == NodeKind::FlipView && n.visible && n.nav_controls.last_activity > 0.
            })
            .map(|n| n.nav_controls.last_activity + 3000.)
            .filter(|t| *t > self.time)
            .min_by(f64::total_cmp)
    }
    pub(super) fn navigation_control_snapshot(&self, id: u32) -> Option<NavigationSnapshot> {
        let n = &self.nodes[&id];
        if !is_control(n.kind) {
            return None;
        }
        let c = &n.nav_controls;
        Some(NavigationSnapshot {
            tab_visuals: c.tab_visuals(self.time),
            parts: c.parts.clone(),
            slots: c
                .slots
                .iter()
                .filter(|(_, slot)| self.nodes.contains_key(slot))
                .map(|((key, role), slot)| Slot {
                    id: *slot,
                    key: key.clone(),
                    role: role.clone(),
                    index: c.item_indices.get(key).copied().unwrap_or(0),
                })
                .collect(),
            selected_index: n.props.selected_index,
            selected_page_index: n.props.nav_controls.selected_page_index,
            first_visible_index: c.first_visible,
            focused_part: c.focused_part.clone(),
            hovered_part: c.hovered.clone(),
            pressed_part: c.pressed.as_ref().map(|(_, k)| k.clone()),
            tree_rows: n
                .collection
                .realized
                .keys()
                .filter_map(|k| c.tree_rows.get(k).cloned())
                .collect(),
            dragging: c.drag.is_some(),
            drag_index: c.drag.as_ref().map(|d| d.1),
            drag_target: c.drag.as_ref().map(|d| d.2),
        })
    }
    pub fn navigation_slot(&mut self, id: u32, key: &str, role: &str) -> Result<u32, String> {
        let n = self.get(id)?;
        if !matches!(
            n.kind,
            NodeKind::FlipView | NodeKind::TabView | NodeKind::BreadcrumbBar
        ) {
            return Err("This control does not expose navigation template slots".into());
        }
        if !matches!(role, "content" | "header" | "stripHeader" | "stripFooter") {
            return Err("Unknown navigation template role".into());
        }
        if !matches!(role, "stripHeader" | "stripFooter")
            && !n.props.nav_controls.items.iter().any(|i| i.id == key)
        {
            return Err("Unknown navigation template item".into());
        }
        let token = (key.to_owned(), role.to_owned());
        if let Some(slot) = n
            .nav_controls
            .slots
            .get(&token)
            .filter(|slot| self.nodes.contains_key(slot))
        {
            return Ok(*slot);
        }
        let child = self.create(id, NodeKind::Grid, json!({"clip":true}))?;
        let c = &mut self.nodes.get_mut(&child).unwrap().nav_controls;
        c.owner = Some(id);
        c.slot_key = key.into();
        c.slot_role = role.into();
        self.nodes
            .get_mut(&id)
            .unwrap()
            .nav_controls
            .slots
            .insert(token, child);
        self.invalidate(id, true);
        Ok(child)
    }
    fn emit_navigation(&mut self, id: u32, kind: EventKind, index: i32, action: &str) {
        let n = &self.nodes[&id];
        let key = usize::try_from(index)
            .ok()
            .and_then(|i| n.props.nav_controls.items.get(i))
            .map(|v| v.id.clone());
        self.emit(id, kind);
        let e = self.events.last_mut().unwrap();
        e.item_id = key.clone();
        e.payload = Some(json!({"navigation":{"index":index,"key":key,"action":action}}));
    }
    pub(super) fn sync_navigation_controls(&mut self) {
        let ids = self
            .nodes
            .values()
            .filter(|n| is_control(n.kind))
            .map(|n| n.id)
            .collect::<Vec<_>>();
        for id in ids {
            let n = &self.nodes[&id];
            let source_changed = !Arc::ptr_eq(&n.nav_controls.source, &n.props.nav_controls.items);
            if self.nodes[&id].kind == NodeKind::TabView {
                self.sync_tab_transitions(id, source_changed);
            }
            let n = &self.nodes[&id];
            if source_changed {
                let old_key = usize::try_from(n.nav_controls.last_selected)
                    .ok()
                    .and_then(|i| n.nav_controls.source.get(i))
                    .map(|i| i.id.clone());
                let items = n.props.nav_controls.items.clone();
                let stale = n
                    .nav_controls
                    .slots
                    .iter()
                    .filter(|((key, role), _)| {
                        !role.starts_with("strip") && !items.iter().any(|i| &i.id == key)
                    })
                    .map(|(k, id)| (k.clone(), *id))
                    .collect::<Vec<_>>();
                for (token, slot) in stale {
                    if self.nodes.contains_key(&slot) {
                        let _ = self.destroy(slot);
                    }
                    self.nodes
                        .get_mut(&id)
                        .unwrap()
                        .nav_controls
                        .slots
                        .remove(&token);
                }
                let n = self.nodes.get_mut(&id).unwrap();
                if n.kind != NodeKind::TreeView {
                    n.nav_controls.item_indices = items
                        .iter()
                        .enumerate()
                        .map(|(i, item)| (item.id.clone(), i))
                        .collect();
                }
                if n.nav_controls.initialized
                    && matches!(n.kind, NodeKind::TabView | NodeKind::FlipView | NodeKind::SelectorBar)
                    && !n.nav_controls.selection_explicit
                {
                    if let Some(key) = old_key {
                        if let Some(index) = items.iter().position(|i| i.id == key) {
                            if n.props.selected_index == n.nav_controls.last_selected {
                                n.props.selected_index = index as i32;
                            }
                        }
                    }
                }
                if n.kind == NodeKind::TreeView {
                    self.rebuild_navigation_tree(id);
                }
                self.nodes.get_mut(&id).unwrap().nav_controls.source = items;
            }
            if self.nodes[&id].kind == NodeKind::TreeView {
                self.sync_navigation_tree(id);
            }
            let n = self.nodes.get_mut(&id).unwrap();
            if matches!(n.kind, NodeKind::FlipView | NodeKind::TabView | NodeKind::SelectorBar) {
                n.props.selected_index = if n.props.nav_controls.items.is_empty() {
                    -1
                } else {
                    n.props
                        .selected_index
                        .clamp(if n.kind==NodeKind::SelectorBar{-1}else{0}, n.props.nav_controls.items.len() as i32 - 1)
                };
            }
            let selected = n.props.selected_index;
            let selected_key = usize::try_from(selected)
                .ok()
                .and_then(|i| n.props.nav_controls.items.get(i))
                .map(|i| i.id.clone());
            let selection_changed = n.nav_controls.initialized
                && matches!(n.kind, NodeKind::FlipView | NodeKind::TabView | NodeKind::SelectorBar)
                && (selected != n.nav_controls.last_selected
                    || selected_key != n.nav_controls.last_selected_key);
            if !n.nav_controls.initialized {
                n.nav_controls
                    .page
                    .set(selected.max(0) as f64, self.time, false);
                n.nav_controls.fade.snap(0.);
            } else if matches!(n.kind, NodeKind::FlipView | NodeKind::TabView | NodeKind::SelectorBar)
                && selected != n.nav_controls.last_selected
            {
                n.nav_controls.page.set(
                    selected.max(0) as f64,
                    self.time,
                    !self.reduced_motion
                        && self.theme != Theme::HighContrast
                        && n.kind == NodeKind::FlipView,
                );
                n.nav_controls.bring_tab = true;
            }
            let page_changed = n.nav_controls.initialized
                && n.kind == NodeKind::PipsPager
                && n.props.nav_controls.selected_page_index != n.nav_controls.last_page_index;
            n.nav_controls.last_page_index = n.props.nav_controls.selected_page_index;
            n.nav_controls.last_selected = selected;
            n.nav_controls.last_selected_key = selected_key;
            n.nav_controls.selection_explicit = false;
            n.nav_controls.initialized = true;
            if selection_changed {
                self.emit_navigation(id, EventKind::SelectionChanged, selected, "selection");
            }
            if page_changed {
                let index = self.nodes[&id].props.nav_controls.selected_page_index;
                self.emit_navigation(id, EventKind::SelectedIndexChanged, index, "selection");
            }
        }
    }
}
