//! Public, independently owned menu item controls. Rendering and navigation use
//! the same Rust menu presenter as the data API. Sources are pinned in
//! references/menu-item-controls-sources.json.
use super::*;
use serde_json::json;

pub(super) fn radio_template() -> &'static serde_json::Value {
    static V: std::sync::OnceLock<serde_json::Value> = std::sync::OnceLock::new();
    V.get_or_init(|| {
        serde_json::from_str(include_str!("../../references/menu-item-template.json")).unwrap()
    })
}
pub fn is_item(k: NodeKind) -> bool {
    matches!(
        k,
        NodeKind::MenuFlyoutItem
            | NodeKind::ToggleMenuFlyoutItem
            | NodeKind::RadioMenuFlyoutItem
            | NodeKind::MenuFlyoutSubItem
            | NodeKind::MenuFlyoutSeparator
    )
}
pub fn is_check(k: NodeKind) -> bool {
    matches!(
        k,
        NodeKind::ToggleMenuFlyoutItem | NodeKind::RadioMenuFlyoutItem
    )
}
pub fn entry_kind(k: NodeKind) -> MenuEntryKind {
    match k {
        NodeKind::ToggleMenuFlyoutItem => MenuEntryKind::Toggle,
        NodeKind::RadioMenuFlyoutItem => MenuEntryKind::Radio,
        NodeKind::MenuFlyoutSubItem => MenuEntryKind::Submenu,
        NodeKind::MenuFlyoutSeparator => MenuEntryKind::Separator,
        _ => MenuEntryKind::Command,
    }
}
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct MenuItemProperties {
    pub icon: String,
    pub keyboard_accelerators: Vec<command_controls::Accelerator>,
    pub are_check_states_enabled: bool,
}
#[derive(Default)]
pub struct MenuItemState {
    /// A menu permanently chooses either child controls or the data API.
    pub children_mode: bool,
}
pub fn defaults(k: NodeKind, p: &mut NodeProperties) {
    if !is_item(k) {
        return;
    }
    p.menu_item = Some(Box::default());
    p.is_tab_stop = false; // the presenter owns the single keyboard entry point
    p.padding = [0.; 4];
    if is_check(k) {
        p.is_checked = Some(false);
    }
}
pub fn validate(k: NodeKind, p: &NodeProperties) -> Result<(), String> {
    if !is_item(k) {
        return Ok(());
    }
    let q = p
        .menu_item
        .as_deref()
        .ok_or("Missing menu item properties")?;
    if is_check(k) && p.is_checked.is_none() {
        return Err("Menu items have two checked states".into());
    }
    if q.icon.len() > 4096 || q.keyboard_accelerators.len() > 32 {
        return Err("Menu item metadata exceeds limits".into());
    }
    for a in &q.keyboard_accelerators {
        if a.key.is_empty() || a.key.len() > 64 {
            return Err("Invalid menu item accelerator".into());
        }
    }
    Ok(())
}
impl Scene {
    pub(super) fn menu_item_logical_enabled(&self, id: u32) -> bool {
        let mut at = Some(id);
        while let Some(id) = at {
            let n = &self.nodes[&id];
            if !n.props.enabled
                || !n.props.visible
                || n.parent.is_some_and(|p| !self.view_child_enabled(p, id))
            {
                return false;
            }
            at = n.parent;
        }
        true
    }
    pub(super) fn preflight_menu_item(&self, parent: u32, k: NodeKind) -> Result<(), String> {
        let p = self.get(parent)?;
        if is_item(k) {
            if !matches!(
                p.kind,
                NodeKind::MenuFlyout | NodeKind::MenuBarItem | NodeKind::MenuFlyoutSubItem
            ) {
                return Err(
                    "Menu item controls require MenuFlyout, MenuBarItem or MenuFlyoutSubItem"
                        .into(),
                );
            }
            if !p.menu_item.children_mode && !p.props.menu_items.is_empty() {
                return Err("Use menu item children or menuItems, not both".into());
            }
            // The presenter supports eight submenu levels, including the root.
            let mut at = Some(parent);
            let mut depth = 0;
            while let Some(id) = at {
                if self.nodes[&id].kind == NodeKind::MenuFlyoutSubItem {
                    depth += 1;
                }
                at = self.nodes[&id].parent;
            }
            if depth > 7 {
                return Err("Menu depth limit exceeded".into());
            }
        }
        Ok(())
    }
    pub(super) fn validate_menu_item_patch(
        &self,
        id: u32,
        p: &NodeProperties,
    ) -> Result<(), String> {
        if self.nodes[&id].menu_item.children_mode
            && serde_json::to_value(&p.menu_items).unwrap()
                != serde_json::to_value(&self.nodes[&id].props.menu_items).unwrap()
        {
            return Err("menuItems is owned by menu item children".into());
        }
        Ok(())
    }
    pub(super) fn stage_menu_radio_updates(
        &self,
        staged: &mut BTreeMap<u32, NodeProperties>,
        order: &[u32],
    ) {
        let requests = order
            .iter()
            .filter(|id| self.nodes[id].kind == NodeKind::RadioMenuFlyoutItem)
            .filter_map(|id| {
                let p = staged.get(id).unwrap_or(&self.nodes[id].props);
                (p.is_checked == Some(true)).then(|| (*id, p.group_name.clone()))
            })
            .collect::<Vec<_>>();
        for (id, group) in requests {
            staged.get_mut(&id).unwrap().is_checked = Some(true);
            let peers = self
                .nodes
                .values()
                .filter(|n| n.id != id && n.kind == NodeKind::RadioMenuFlyoutItem)
                .filter(|n| {
                    let p = staged.get(&n.id).unwrap_or(&n.props);
                    p.group_name == group && p.is_checked == Some(true)
                })
                .map(|n| n.id)
                .collect::<Vec<_>>();
            for peer in peers {
                staged
                    .entry(peer)
                    .or_insert_with(|| self.nodes[&peer].props.clone())
                    .is_checked = Some(false);
            }
        }
    }
    fn menu_node_entry(&self, id: u32) -> overlays::MenuEntry {
        let n = &self.nodes[&id];
        let p = &n.props;
        let q = p.menu_item.as_deref().unwrap();
        let v = view_controls::props(n);
        let mut entry = overlays::MenuEntry {
            source_node: Some(id),
            id: format!("menu-node-{id}"),
            accessible_name: p.accessible_name.clone().unwrap_or_default(),
            text: p.text.clone(),
            icon: q.icon.clone(),
            enabled: self.menu_item_logical_enabled(id),
            checked: p.is_checked == Some(true),
            kind: entry_kind(n.kind),
            group_name: p.group_name.clone(),
            keyboard_accelerators: q.keyboard_accelerators.clone(),
            command: v.command,
            command_parameter: v.command_parameter.clone(),
            items: n
                .children
                .iter()
                .filter(|c| is_item(self.nodes[c].kind) && self.nodes[c].props.visible)
                .map(|c| self.menu_node_entry(*c))
                .collect(),
            ..Default::default()
        };
        if let Some(meta) = v.command.and_then(|c| self.command_metadata(c).ok()) {
            if entry.text.is_empty() {
                entry.text = meta.label.clone();
            }
            if entry.icon.is_empty() {
                entry.icon = meta
                    .icon_symbol
                    .map(crate::icons::symbol_glyph)
                    .unwrap_or("")
                    .into();
            }
            if entry.keyboard_accelerators.is_empty() {
                entry.keyboard_accelerators = meta.accelerators.clone();
            }
            entry.command_base_enabled = Some(entry.enabled);
            entry.enabled &= meta.can_execute;
            entry.command_metadata = Some(meta);
        }
        if n.kind == NodeKind::MenuFlyoutSubItem && q.are_check_states_enabled {
            entry.checked = entry
                .items
                .iter()
                .any(|e| e.kind == MenuEntryKind::Radio && e.checked);
        }
        entry
    }
    pub(super) fn sync_menu_item_nodes(&mut self) {
        let ids = self
            .nodes
            .values()
            .filter(|n| {
                n.menu_item.children_mode
                    && matches!(n.kind, NodeKind::MenuFlyout | NodeKind::MenuBarItem)
            })
            .map(|n| n.id)
            .collect::<Vec<_>>();
        for id in ids {
            let entries = self.nodes[&id]
                .children
                .iter()
                .filter(|c| is_item(self.nodes[c].kind) && self.nodes[c].props.visible)
                .map(|c| self.menu_node_entry(*c))
                .collect::<Vec<_>>();
            if serde_json::to_value(&entries).unwrap()
                != serde_json::to_value(&self.nodes[&id].props.menu_items).unwrap()
            {
                self.nodes.get_mut(&id).unwrap().props.menu_items = entries;
                self.invalidate(id, true);
            }
        }
    }
    /// Write presenter state back into stable Rust controls before delivering events.
    pub(super) fn commit_menu_item_entry(&mut self, entry: &overlays::MenuEntry) {
        let Some(id) = entry
            .source_node
            .filter(|id| self.nodes.get(id).is_some_and(|n| is_item(n.kind)))
        else {
            return;
        };
        if is_check(self.nodes[&id].kind) {
            let _ = self.update(vec![Update {
                id,
                patch: json!({"isChecked":entry.checked}),
            }]);
        }
        self.emit(id, EventKind::Click);
        let e = self.events.last_mut().unwrap();
        e.item_id = Some(entry.id.clone());
        e.is_checked = is_check(self.nodes[&id].kind).then_some(Some(entry.checked));
    }
    pub(super) fn arrange_menu_item_nodes(&mut self) {
        for n in self.nodes.values_mut().filter(|n| is_item(n.kind)) {
            n.rect = Rect::default();
            n.visible = false;
        }
        let rows = self
            .nodes
            .values()
            .filter(|n| n.kind == NodeKind::MenuFlyout && n.overlay.open)
            .flat_map(|n| {
                n.props
                    .menu_items
                    .iter()
                    .zip(&n.overlay.rows)
                    .filter_map(|(e, r)| {
                        e.source_node
                            .map(|id| (id, *r, n.world, n.theme, e.enabled))
                    })
            })
            .collect::<Vec<_>>();
        for (id, r, world, theme, enabled) in rows {
            if let Some(n) = self.nodes.get_mut(&id).filter(|n| is_item(n.kind)) {
                n.rect = r;
                n.desired = [r.width, r.height];
                n.world = world.multiply(Matrix([1., 0., 0., 1., r.x, r.y]));
                n.theme = theme;
                n.visible = true;
                n.enabled = enabled;
            }
        }
    }
    pub(super) fn focus_menu_item(&mut self, id: u32) -> bool {
        if !self.nodes.get(&id).is_some_and(|n| is_item(n.kind)) {
            return false;
        }
        let row = self
            .nodes
            .values()
            .filter(|n| n.kind == NodeKind::MenuFlyout && n.overlay.open)
            .find_map(|n| {
                n.props
                    .menu_items
                    .iter()
                    .position(|e| {
                        e.source_node == Some(id) && e.enabled && e.kind != MenuEntryKind::Separator
                    })
                    .map(|i| (n.id, i))
            });
        if let Some((menu, index)) = row {
            self.nodes.get_mut(&menu).unwrap().overlay.selected = Some(index);
            self.menu_ensure_visible(menu, index);
            self.focus(Some(menu));
        }
        true
    }
    /// Typed Rust factory; menu behavior is supplied by the SDK, not the caller.
    pub fn menu_flyout_item(
        &mut self,
        parent: u32,
        text: impl Into<String>,
    ) -> Result<u32, String> {
        self.create(
            parent,
            NodeKind::MenuFlyoutItem,
            json!({"text":text.into()}),
        )
    }
    pub fn toggle_menu_flyout_item(
        &mut self,
        parent: u32,
        text: impl Into<String>,
        checked: bool,
    ) -> Result<u32, String> {
        self.create(
            parent,
            NodeKind::ToggleMenuFlyoutItem,
            json!({"text":text.into(),"isChecked":checked}),
        )
    }
    pub fn radio_menu_flyout_item(
        &mut self,
        parent: u32,
        text: impl Into<String>,
        group: impl Into<String>,
        checked: bool,
    ) -> Result<u32, String> {
        self.create(
            parent,
            NodeKind::RadioMenuFlyoutItem,
            json!({"text":text.into(),"groupName":group.into(),"isChecked":checked}),
        )
    }
    pub fn menu_flyout_sub_item(
        &mut self,
        parent: u32,
        text: impl Into<String>,
    ) -> Result<u32, String> {
        self.create(
            parent,
            NodeKind::MenuFlyoutSubItem,
            json!({"text":text.into()}),
        )
    }
    pub fn menu_flyout_separator(&mut self, parent: u32) -> Result<u32, String> {
        self.create(parent, NodeKind::MenuFlyoutSeparator, json!({}))
    }
}
