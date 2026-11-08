//! MenuBar/MenuBarItem and CommandBarFlyout reuse the Rust floating/input tree.
use super::*;
use crate::{render::Draw, resources::Brush, typography::TextMeasurer};
use serde_json::{json, Value};
use std::{collections::HashSet, sync::OnceLock};

pub fn is_control(k: NodeKind) -> bool {
    matches!(
        k,
        NodeKind::MenuBar | NodeKind::MenuBarItem | NodeKind::CommandBarFlyout
    )
}
pub(super) fn contract() -> &'static Value {
    static V: OnceLock<Value> = OnceLock::new();
    V.get_or_init(|| {
        serde_json::from_str(include_str!("../../references/command-menu-template.json")).unwrap()
    })
}
pub(super) fn flyout_metric(key: &str) -> f64 {
    contract()["flyoutGeometry"][key]
        .as_f64()
        .expect("same-SDK flyout geometry")
}
fn metric(key: &str) -> f64 {
    contract()["metrics"][key]
        .as_str()
        .unwrap()
        .parse()
        .unwrap()
}
fn thickness(key: &str) -> [f64; 4] {
    let a = contract()["metrics"][key]
        .as_str()
        .unwrap()
        .split(',')
        .map(|v| v.parse().unwrap())
        .collect::<Vec<f64>>();
    std::array::from_fn(|i| a[if a.len() == 1 { 0 } else { i }])
}
fn color(theme: Theme, key: &str) -> String {
    // SDK dictionaries call the dark theme "Default"; public Scene uses Dark.
    let dictionary = if theme == Theme::Dark { "Default" } else { theme.as_str() };
    serde_json::from_value::<Brush>(contract()["palettes"][dictionary][key].clone())
        .unwrap()
        .solid_color()
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct MenuBarEntry {
    pub id: String,
    pub title: String,
    pub enabled: bool,
    pub visible: bool,
    pub items: Vec<overlays::MenuEntry>,
}
impl Default for MenuBarEntry {
    fn default() -> Self {
        Self {
            id: String::new(),
            title: "Item".into(),
            enabled: true,
            visible: true,
            items: vec![],
        }
    }
}
#[derive(Clone, Debug, Serialize, Deserialize, Default)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct MenuProperties {
    pub items: Vec<MenuBarEntry>,
    pub always_expanded: bool,
    pub show_mode: FlyoutShowMode,
}
#[derive(Default)]
pub struct MenuState {
    pub(super) owner: Option<u32>,
    pub(super) popup: Option<u32>,
    pub(super) bar: Option<u32>,
    items: HashMap<String, u32>,
    signature: String,
    settings_signature: String,
    open: bool,
}
pub fn defaults(k: NodeKind, p: &mut NodeProperties) {
    if !is_control(k) {
        return;
    }
    p.menu_controls = Some(Box::default());
    p.is_tab_stop = false;
    p.padding = [0.; 4];
    if k == NodeKind::MenuBar {
        p.min_height = metric("MenuBarHeight");
        p.vertical_alignment = VerticalAlignment::Top;
    }
    if k == NodeKind::MenuBarItem {
        p.text = "Item".into();
        p.margin = thickness("MenuBarItemMargin");
        p.padding = thickness("MenuBarItemButtonPadding");
        p.horizontal_alignment = HorizontalAlignment::Left;
        p.vertical_alignment = VerticalAlignment::Stretch;
        p.is_tab_stop = true;
        p.corner_radius = 4.;
    }
    if k == NodeKind::CommandBarFlyout {
        p.is_light_dismiss_enabled = true;
        p.auto_focus = true;
        p.border_thickness = [0.; 4];
        p.corner_radius = 8.;
        p.max_width = Some(440.);
        p.min_width = 0.;
        // The flyout template uses DesktopAcrylicTransparentBrush over a
        // SystemBackdrop, rather than CommandBar's in-app acrylic brush.
        p.acrylic_resource = None;
        p.border_brush = Some(BrushValue::Resource {
            resource: "CommandBarFlyoutBorderBrush".into(),
        });
    }
}
pub fn validate(k: NodeKind, p: &NodeProperties) -> Result<(), String> {
    if !is_control(k) {
        return Ok(());
    }
    super::menu_entries::validate_entries(&p.menu_items, 0)?;
    let Some(q) = &p.menu_controls else {
        return Err("Missing Rust menu properties".into());
    };
    let mut ids = HashSet::new();
    if q.items.len() > 256 {
        return Err("MenuBar exceeds 256 headers".into());
    }
    for item in &q.items {
        super::menu_entries::validate_entries(&item.items, 0)?;
        if item.id.is_empty() || !ids.insert(&item.id) {
            return Err("MenuBar IDs must be nonempty and unique".into());
        }
    }
    Ok(())
}
impl Scene {
    pub(super) fn command_flyout_radii(&self, id: u32) -> Option<[f64; 4]> {
        let n = &self.nodes[&id];
        let secondary = n.overlay.visual.command_overflow;
        let bar = if secondary {
            n.command.owner?
        } else if n.kind == NodeKind::CommandBarFlyout {
            n.menu.bar?
        } else {
            return None;
        };
        let popup = self.nodes[&bar].command.popup?;
        if self.nodes[&bar]
            .props
            .command_controls
            .primary_commands
            .is_empty()
        {
            return None;
        }
        if !self.nodes[&popup].overlay.open && !self.nodes[&popup].overlay.visual.active(self.time)
        {
            return None;
        }
        // ExpandedUp/ExpandedDown filter the joining corners in the SDK template.
        let up = self.nodes[&popup].overlay.actual == OverlayPlacement::Top;
        let radius = n.props.corner_radius;
        Some(if secondary == up {
            [radius, radius, 0., 0.]
        } else {
            [0., 0., radius, radius]
        })
    }
    pub(super) fn overlay_auto_focus(&self, id: u32) -> bool {
        let n = &self.nodes[&id];
        n.props.auto_focus
            && !(n.kind == NodeKind::CommandBarFlyout
                && n.props
                    .menu_controls
                    .as_ref()
                    .is_some_and(|q| q.show_mode == FlyoutShowMode::Transient))
    }
    pub(super) fn in_command_bar_flyout(&self, id: u32) -> bool {
        let n = &self.nodes[&id];
        let bar = if n.kind == NodeKind::CommandBar {
            Some(id)
        } else {
            n.command.owner
        };
        bar.and_then(|id| self.nodes.get(&id))
            .and_then(|n| n.menu.owner)
            .and_then(|id| self.nodes.get(&id))
            .is_some_and(|n| n.kind == NodeKind::CommandBarFlyout)
    }
    pub(super) fn init_command_menu(&mut self, id: u32) -> Result<(), String> {
        if self.nodes[&id].kind == NodeKind::MenuBarItem {
            let popup = self.create(
                id,
                NodeKind::MenuFlyout,
                json!({"placementTarget":id,"placement":"BottomEdgeAlignedLeft","isOpen":false}),
            )?;
            self.nodes.get_mut(&popup).unwrap().menu.owner = Some(id);
            self.nodes.get_mut(&id).unwrap().menu.popup = Some(popup);
        } else if self.nodes[&id].kind == NodeKind::CommandBarFlyout {
            let bar=self.create(id,NodeKind::CommandBar,json!({"horizontalAlignment":"Left","minWidth":0,"commandControls":{"defaultLabelPosition":"Bottom"}}))?;
            self.nodes.get_mut(&bar).unwrap().menu.owner = Some(id);
            self.nodes.get_mut(&id).unwrap().menu.bar = Some(bar);
        }
        Ok(())
    }
    fn menu_patch(&mut self, id: u32, patch: Value) {
        let current = serde_json::to_value(&self.nodes[&id].props).unwrap();
        if patch
            .as_object()
            .unwrap()
            .iter()
            .any(|(k, v)| current.get(k) != Some(v))
        {
            let _ = self.update(vec![Update { id, patch }]);
        }
    }
    pub(super) fn sync_command_menus(&mut self) {
        let ids = self
            .nodes
            .values()
            .filter(|n| is_control(n.kind))
            .map(|n| n.id)
            .collect::<Vec<_>>();
        for id in ids {
            if !self.nodes.contains_key(&id) {
                continue;
            }
            let n = &self.nodes[&id];
            let q = n.props.menu_controls.as_deref().unwrap().clone();
            let kind = n.kind;
            if kind == NodeKind::MenuBar {
                let sig = serde_json::to_string(&q.items).unwrap();
                if sig == n.menu.signature {
                    continue;
                }
                let stale = n
                    .menu
                    .items
                    .iter()
                    .filter(|(k, _)| !q.items.iter().any(|item| &item.id == *k))
                    .map(|(_, id)| *id)
                    .collect::<Vec<_>>();
                for child in stale {
                    let _ = self.destroy(child);
                }
                self.nodes
                    .get_mut(&id)
                    .unwrap()
                    .menu
                    .items
                    .retain(|k, _| q.items.iter().any(|item| &item.id == k));
                let mut order = vec![];
                for item in &q.items {
                    let old = self.nodes[&id]
                        .menu
                        .items
                        .get(&item.id)
                        .copied()
                        .filter(|id| self.nodes.contains_key(id));
                    let child = if let Some(old) = old {
                        old
                    } else {
                        match self.create(id, NodeKind::MenuBarItem, json!({})) {
                            Ok(child) => child,
                            Err(_) => continue,
                        }
                    };
                    self.nodes
                        .get_mut(&id)
                        .unwrap()
                        .menu
                        .items
                        .insert(item.id.clone(), child);
                    self.nodes.get_mut(&child).unwrap().menu.owner = Some(id);
                    self.menu_patch(child,json!({"text":item.title,"enabled":item.enabled,"visible":item.visible,"menuItems":item.items}));
                    if let Some(popup) = self.nodes[&child].menu.popup {
                        self.menu_patch(popup, json!({"menuItems":item.items}));
                    }
                    order.push(child);
                }
                // Only reorder generated headers; caller-created children retain ownership.
                let managed = self.nodes[&id]
                    .menu
                    .items
                    .values()
                    .copied()
                    .collect::<HashSet<_>>();
                let children = &mut self.nodes.get_mut(&id).unwrap().children;
                children.retain(|c| !managed.contains(c));
                children.extend(order);
                self.nodes.get_mut(&id).unwrap().menu.signature = sig;
                self.invalidate(id, true);
            } else if kind == NodeKind::MenuBarItem {
                let popup = n.menu.popup.unwrap();
                let items = n.props.menu_items.clone();
                let desired = n.props.is_open;
                let changed = desired != n.menu.open;
                if changed {
                    let _ = self.open_menu_header(id, desired);
                }
                self.menu_patch(popup, json!({"menuItems":items}));
            } else {
                let bar = n.menu.bar.unwrap();
                let open = n.props.is_open;
                let focus = n.props.auto_focus && q.show_mode != FlyoutShowMode::Transient;
                let settings_signature = format!("{:?}-{}", q.show_mode, q.always_expanded);
                let changed =
                    open != n.menu.open || settings_signature != n.menu.settings_signature;
                let sig = serde_json::to_string(&n.props.command_controls).unwrap();
                if sig != n.menu.signature {
                    let mut props = serde_json::to_value(&n.props.command_controls).unwrap();
                    props["defaultLabelPosition"] = json!("Bottom");
                    props["isSticky"] = json!(true);
                    self.menu_patch(bar, json!({"commandControls":props}));
                    self.nodes.get_mut(&id).unwrap().menu.signature = sig;
                }
                if changed || q.always_expanded {
                    self.menu_patch(bar,json!({"isOpen":open&&(q.always_expanded||q.show_mode==FlyoutShowMode::Standard),"commandControls":{"overflowButtonVisibility":if q.always_expanded{"Collapsed"}else{"Auto"}}}));
                    self.nodes.get_mut(&id).unwrap().menu.open = open;
                    self.nodes.get_mut(&id).unwrap().menu.settings_signature = settings_signature;
                }
                if let Some(popup) = self.nodes[&bar].command.popup {
                    self.menu_patch(popup,json!({"acrylicResource":null,"borderBrush":{"resource":"CommandBarFlyoutBorderBrush"},"autoFocus":focus}));
                    self.nodes.get_mut(&popup).unwrap().overlay.visual.profile =
                        Some(NodeKind::CommandBarFlyout);
                    self.nodes
                        .get_mut(&popup)
                        .unwrap()
                        .overlay
                        .visual
                        .command_overflow = true;
                }
            }
        }
    }
    pub(super) fn menu_tab_stops(&self) -> (HashSet<u32>, HashSet<u32>) {
        let mut managed = HashSet::new();
        let mut stops = HashSet::new();
        for bar in self.nodes.values().filter(|n| n.kind == NodeKind::MenuBar) {
            let items = bar
                .children
                .iter()
                .copied()
                .filter(|id| self.nodes[id].kind == NodeKind::MenuBarItem)
                .collect::<Vec<_>>();
            managed.extend(items.iter().copied());
            if let Some(stop) = items
                .iter()
                .copied()
                .find(|id| self.focused == Some(*id))
                .or_else(|| {
                    items
                        .iter()
                        .copied()
                        .find(|id| self.nodes[id].props.is_open)
                })
                .or_else(|| items.iter().copied().find(|id| self.effective_enabled(*id)))
            {
                stops.insert(stop);
            }
        }
        (managed, stops)
    }
    pub(super) fn menu_item_bar(&self, id: u32) -> Option<u32> {
        let n = self.nodes.get(&id)?;
        n.parent
            .filter(|id| self.nodes[id].kind == NodeKind::MenuBar)
    }
    pub(super) fn sync_menu_bar_source(&mut self, header: u32) {
        let Some(bar) = self.menu_item_bar(header) else {
            return;
        };
        let key = self.nodes[&bar]
            .menu
            .items
            .iter()
            .find(|(_, id)| **id == header)
            .map(|(key, _)| key.clone());
        if let Some(key) = key {
            let items = self.nodes[&header].props.menu_items.clone();
            let n = self.nodes.get_mut(&bar).unwrap();
            if let Some(entry) = n
                .props
                .menu_controls
                .as_mut()
                .unwrap()
                .items
                .iter_mut()
                .find(|item| item.id == key)
            {
                entry.items = items;
            }
            n.menu.signature =
                serde_json::to_string(&n.props.menu_controls.as_ref().unwrap().items).unwrap();
        }
    }
    fn open_menu_header(&mut self, id: u32, open: bool) -> Result<(), String> {
        if !self.effective_enabled(id) {
            return Ok(());
        }
        let Some(popup) = self.nodes[&id].menu.popup else {
            return Ok(());
        };
        let bar = self.menu_item_bar(id);
        let siblings = bar
            .map(|id| self.nodes[&id].children.clone())
            .unwrap_or_default();
        for child in siblings {
            if child != id {
                if let Some(other) = self.nodes[&child].menu.popup {
                    self.menu_patch(other, json!({"isOpen":false}));
                    self.nodes.get_mut(&child).unwrap().props.is_open = false;
                    self.nodes.get_mut(&child).unwrap().menu.open = false;
                }
            }
        }
        self.menu_patch(popup,json!({"menuItems":self.nodes[&id].props.menu_items,"isOpen":open&&!self.nodes[&id].props.menu_items.is_empty()}));
        let open = open && !self.nodes[&id].props.menu_items.is_empty();
        self.nodes.get_mut(&id).unwrap().props.is_open = open;
        self.nodes.get_mut(&id).unwrap().menu.open = open;
        self.focus(Some(id));
        self.sync_overlays();
        self.invalidate(id, false);
        Ok(())
    }
    pub(super) fn invoke_menu_header(&mut self, id: u32) -> Result<bool, String> {
        if self.nodes[&id].kind != NodeKind::MenuBarItem {
            return Ok(false);
        }
        let popup = self.nodes[&id].menu.popup.unwrap();
        self.open_menu_header(id, !self.nodes[&popup].props.is_open)?;
        Ok(true)
    }
    pub(super) fn pump_command_menu_events(&mut self) {
        let mut at = 0;
        while at < self.events.len() {
            if self.events[at].menu_processed {
                at += 1;
                continue;
            }
            self.events[at].menu_processed = true;
            let e = self.events[at].clone();
            at += 1;
            let Some(n) = self.nodes.get(&e.target) else {
                continue;
            };
            if let Some(owner) = n.menu.owner.filter(|id| {
                self.nodes
                    .get(id)
                    .is_some_and(|n| n.kind == NodeKind::MenuBarItem)
            }) {
                if matches!(
                    e.kind,
                    EventKind::Opening
                        | EventKind::Opened
                        | EventKind::Closed
                        | EventKind::MenuItemInvoked
                ) {
                    let mut copy = e.clone();
                    copy.target = owner;
                    copy.menu_processed = true;
                    self.events.push(copy);
                    self.invalidate(owner, false);
                }
                if e.kind == EventKind::Closed && !self.nodes[&e.target].props.is_open {
                    self.nodes.get_mut(&owner).unwrap().props.is_open = false;
                    self.nodes.get_mut(&owner).unwrap().menu.open = false;
                }
                if e.kind == EventKind::MenuItemInvoked {
                    let items = self.nodes[&e.target].props.menu_items.clone();
                    self.nodes.get_mut(&owner).unwrap().props.menu_items = items;
                    self.sync_menu_bar_source(owner);
                    if let Some(bar) = self.menu_item_bar(owner) {
                        let mut copy = e;
                        copy.target = bar;
                        copy.menu_processed = true;
                        copy.payload = Some(
                            json!({"menuId":self.nodes[&bar].menu.items.iter().find(|(_,id)|**id==owner).map(|(k,_)|k.clone())}),
                        );
                        self.events.push(copy);
                    }
                }
            } else if let Some(owner) = n.menu.owner.filter(|id| {
                self.nodes
                    .get(id)
                    .is_some_and(|n| n.kind == NodeKind::CommandBarFlyout)
            }) {
                if e.kind == EventKind::ItemClick {
                    let mut copy = e.clone();
                    copy.target = owner;
                    copy.menu_processed = true;
                    self.events.push(copy);
                    let bar = e.target;
                    let secondary = e.item_id.as_ref().is_some_and(|key| {
                        self.nodes[&bar]
                            .props
                            .command_controls
                            .secondary_commands
                            .iter()
                            .any(|i| &i.id == key && i.flyout_target.is_none())
                    });
                    if secondary {
                        let _ = self.request_overlay_close(owner);
                    }
                }
            }
        }
    }
    pub(super) fn command_menu_input(&mut self, input: &Input) -> Result<bool, String> {
        self.pump_command_menu_events();
        let active = self
            .nodes
            .values()
            .find(|n| {
                n.kind == NodeKind::MenuBarItem
                    && n.menu.popup.is_some_and(|id| self.nodes[&id].props.is_open)
            })
            .map(|n| n.id);
        match input {
            Input::Move { x, y, .. } | Input::Down { x, y, .. } => {
                let hit = self
                    .nodes
                    .values()
                    .filter(|n| {
                        n.kind == NodeKind::MenuBarItem
                            && self.effective_enabled(n.id)
                            && n.visible
                            && self.inside(n.id, *x, *y)
                    })
                    .map(|n| n.id)
                    .last();
                if let Some(id) = hit {
                    if matches!(input, Input::Down { .. }) {
                        self.open_menu_header(id, true)?;
                        return Ok(true);
                    }
                    if active
                        .is_some_and(|a| a != id && self.menu_item_bar(a) == self.menu_item_bar(id))
                    {
                        self.open_menu_header(id, true)?;
                        return Ok(true);
                    }
                }
            }
            Input::KeyDown { key, .. } => {
                let header = active.or(self
                    .focused
                    .filter(|id| self.nodes[id].kind == NodeKind::MenuBarItem));
                let Some(id) = header else { return Ok(false) };
                if matches!(key.as_str(), "ArrowLeft" | "ArrowRight" | "Home" | "End") {
                    let Some(bar) = self.menu_item_bar(id) else {
                        return Ok(false);
                    };
                    let ids = self.nodes[&bar]
                        .children
                        .iter()
                        .copied()
                        .filter(|id| {
                            self.nodes[id].kind == NodeKind::MenuBarItem
                                && self.effective_enabled(*id)
                        })
                        .collect::<Vec<_>>();
                    if ids.is_empty() {
                        return Ok(true);
                    }
                    let index = ids.iter().position(|i| *i == id).unwrap_or(0);
                    let rtl = self.effective_flow_direction(bar) == FlowDirection::RightToLeft;
                    let next = match key.as_str() {
                        "Home" => 0,
                        "End" => ids.len() - 1,
                        "ArrowLeft" if !rtl => (index + ids.len() - 1) % ids.len(),
                        "ArrowRight" if rtl => (index + ids.len() - 1) % ids.len(),
                        _ => (index + 1) % ids.len(),
                    };
                    if active.is_some() {
                        self.open_menu_header(ids[next], true)?;
                    } else {
                        self.focus(Some(ids[next]));
                    }
                    return Ok(true);
                }
                if self.focused == Some(id) && matches!(key.as_str(), "ArrowDown" | "Enter" | " ") {
                    self.open_menu_header(id, true)?;
                    let popup = self.nodes[&id].menu.popup.unwrap();
                    self.focus(Some(popup));
                    self.nodes.get_mut(&popup).unwrap().overlay.selected = self.nodes[&popup]
                        .props
                        .menu_items
                        .iter()
                        .position(|item| item.enabled && item.kind != MenuEntryKind::Separator);
                    return Ok(true);
                }
            }
            _ => {}
        }
        Ok(false)
    }
    pub(super) fn measure_command_menu(
        &mut self,
        id: u32,
        available: [f64; 2],
        measure: &mut impl TextMeasurer,
    ) -> [f64; 2] {
        let n = &self.nodes[&id];
        if n.kind == NodeKind::MenuBarItem {
            let mut text = crate::typography::layout(
                &n.props.text,
                &n.props.font(),
                available[0],
                false,
                n.props.trimming,
                n.props.line_height,
                measure,
            );
            crate::typography::line_services_rounding(&mut text, self.dpr);
            let size = [text.width, text.height];
            self.nodes.get_mut(&id).unwrap().text = text;
            return size;
        }
        if n.kind == NodeKind::CommandBarFlyout {
            let bar = n.menu.bar.unwrap();
            let q = n.props.command_controls.clone();
            let width = q
                .primary_commands
                .iter()
                .filter(|item| item.visible)
                .map(|item| {
                    if item.kind == CommandBarItemKind::Separator {
                        5.
                    } else {
                        flyout_metric("primaryWidth")
                    }
                })
                .sum::<f64>()
                + if q.secondary_commands.is_empty()
                    || n.props.menu_controls.as_deref().unwrap().always_expanded
                {
                    8.
                } else {
                    flyout_metric("moreWidth")
                        + flyout_metric("primaryInset")
                        + (self.dpr.round() / self.dpr)
                };
            return self.measure_node(
                bar,
                [width.max(48.).min(available[0]), available[1]],
                measure,
            );
        }
        let children = n.children.clone();
        let mut size = [0_f64; 2];
        for child in children {
            if self.nodes[&child].kind != NodeKind::MenuBarItem {
                continue;
            }
            let d = self.measure_node(child, [f64::INFINITY, available[1]], measure);
            size[0] += d[0];
            size[1] = size[1].max(d[1]);
        }
        size
    }
    pub(super) fn arrange_command_menu(
        &mut self,
        id: u32,
        inner: Rect,
        measure: &mut impl TextMeasurer,
    ) {
        let n = &self.nodes[&id];
        let world = n.world;
        let state = (n.theme, n.enabled, n.visible);
        if n.kind == NodeKind::MenuBarItem {
            return;
        }
        if n.kind == NodeKind::CommandBarFlyout {
            let bar = n.menu.bar.unwrap();
            self.arrange_node(bar, inner, world, state, measure);
            return;
        }
        let rtl = self.effective_flow_direction(id) == FlowDirection::RightToLeft;
        let mut x = if rtl { inner.x + inner.width } else { inner.x };
        let children = n.children.clone();
        for child in children {
            if self.nodes[&child].kind != NodeKind::MenuBarItem {
                continue;
            }
            let width = self.nodes[&child].desired[0];
            if rtl {
                x -= width;
            }
            self.arrange_node(
                child,
                Rect::new(x, inner.y, width, inner.height),
                world,
                state,
                measure,
            );
            if !rtl {
                x += width;
            }
        }
    }
    pub(super) fn paint_command_menu(&self, id: u32, out: &mut Vec<Draw>) {
        let n = &self.nodes[&id];
        if n.kind != NodeKind::MenuBarItem {
            return;
        }
        let p = &n.props;
        let r = Rect::new(0., 0., n.rect.width, n.rect.height);
        let open = n.menu.popup.is_some_and(|id| self.nodes[&id].props.is_open);
        let suffix = if n.button.pressed {
            "Pressed"
        } else if n.button.pointer_inside {
            "PointerOver"
        } else if open {
            "Selected"
        } else {
            ""
        };
        if p.background.is_none() {
            out.push(Draw::Fill {
                rect: r,
                radius: p.corner_radius,
                color: color(n.theme, &format!("MenuBarItemBackground{suffix}")),
            });
        }
        if n.theme == Theme::HighContrast {
            out.push(Draw::Border {
                rect: r,
                thickness: [2.; 4],
                radius: [p.corner_radius; 4],
                color: color(n.theme, &format!("MenuBarItemBorderBrush{suffix}")),
                background: None,
            });
        }
        let foreground = p
            .foreground
            .as_ref()
            .map(|b| Self::color(b, n.theme))
            .unwrap_or_else(|| {
                if n.enabled {
                    color(n.theme, "MenuBarItemForeground")
                } else {
                    crate::resources::Resources::current()
                        .color(n.theme, "TextFillColorDisabledBrush")
                        .into()
                }
            });
        out.push(Draw::Clip { rect: r });
        for line in &n.text.lines {
            out.push(Draw::Text {
                style: p.font_style,
                x: p.padding[0],
                y: (r.height - n.text.height) / 2. + line.baseline,
                text: line.text.clone(),
                color: foreground.clone(),
                size: p.font_size,
                font: p.font_family.clone(),
                max_width: (r.width - p.padding[0] - p.padding[2]).max(0.),
                weight: p.font_weight,
            });
        }
        out.push(Draw::Restore);
    }
}
