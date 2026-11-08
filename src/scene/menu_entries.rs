//! Nested menu ownership and command activation, shared with MenuFlyout.
use super::*;
use serde_json::json;
pub(super) fn shortcut(entry:&overlays::MenuEntry)->String {
    let Some(a)=entry.keyboard_accelerators.first()else{return String::new();};
    let mut pieces=[(KeyboardAcceleratorModifier::Control,"Ctrl"),(KeyboardAcceleratorModifier::Alt,"Alt"),(KeyboardAcceleratorModifier::Shift,"Shift")]
        .into_iter().filter(|(m,_)|a.modifiers.contains(m)).map(|(_,name)|name.to_string()).collect::<Vec<_>>();
    pieces.push(if a.key.chars().count()==1{a.key.to_uppercase()}else{a.key.clone()});pieces.join("+")
}
pub(super) fn validate_entries(items: &[overlays::MenuEntry], depth: usize) -> Result<(), String> {
    if depth > 8 || items.len() > 4096 {
        return Err("Menu depth or entry limit exceeded".into());
    }
    let mut ids = std::collections::HashSet::new();
    for item in items {
        if item.kind != MenuEntryKind::Separator && (item.id.is_empty() || !ids.insert(&item.id)) {
            return Err("Menu commands need unique nonempty IDs".into());
        }
        if item.kind != MenuEntryKind::Submenu && !item.items.is_empty() {
            return Err("Only Submenu entries can own items".into());
        }
        if item.text.len() > 1_000_000 || item.id.len() > 4096 {
            return Err("Menu metadata exceeds limits".into());
        }
        validate_entries(&item.items, depth + 1)?;
    }
    Ok(())
}
impl Scene {
    pub(super) fn menu_ensure_visible(&mut self, id: u32, index: usize) {
        let n = &self.nodes[&id];
        let Some(row) = n.overlay.rows.get(index).copied() else {
            return;
        };
        let top = n.props.padding[1];
        let delta = if row.y < top {
            row.y - top
        } else {
            (row.y + row.height - top - n.overlay.menu_viewport).max(0.)
        };
        if delta.abs() > 1e-8 {
            self.menu_scroll(id, delta);
        }
    }
    fn menu_scroll(&mut self, id: u32, delta: f64) {
        let state = &mut self.nodes.get_mut(&id).unwrap().overlay;
        let old = state.menu_offset;
        state.menu_offset =
            (old + delta).clamp(0., (state.menu_extent - state.menu_viewport).max(0.));
        let shift = state.menu_offset - old;
        for row in &mut state.rows {
            row.y -= shift;
        }
        self.invalidate(id, true);
    }
    pub(super) fn menu_wheel(&mut self, x: f64, y: f64, delta: f64) -> bool {
        let id = self
            .nodes
            .values()
            .filter(|n| n.kind == NodeKind::MenuFlyout && n.overlay.open && self.inside(n.id, x, y))
            .max_by_key(|n| n.overlay.order)
            .map(|n| n.id);
        if let Some(id) = id {
            self.menu_scroll(id, delta);
            true
        } else {
            false
        }
    }
    fn open_submenu(&mut self, id: u32, index: usize, keyboard: bool) -> Result<(), String> {
        let entry = self
            .get(id)?
            .props
            .menu_items
            .get(index)
            .ok_or("invalid submenu index")?
            .clone();
        if entry.kind != MenuEntryKind::Submenu || !entry.enabled || entry.items.is_empty() {
            return Ok(());
        }
        let child = if let Some(child) = self.nodes[&id]
            .overlay
            .submenus
            .get(&index)
            .copied()
            .filter(|i| self.nodes.contains_key(i))
        {
            child
        } else {
            let child = self.create(
                id,
                NodeKind::MenuFlyout,
                json!({"placementTarget":id,"menuItems":entry.items,"isOpen":false}),
            )?;
            self.nodes.get_mut(&child).unwrap().overlay.parent_menu = Some((id, index));
            self.nodes
                .get_mut(&id)
                .unwrap()
                .overlay
                .submenus
                .insert(index, child);
            child
        };
        for other in self.nodes[&id]
            .overlay
            .submenus
            .values()
            .copied()
            .collect::<Vec<_>>()
        {
            if other != child && self.nodes[&other].props.is_open {
                self.nodes.get_mut(&other).unwrap().props.is_open = false;
            }
        }
        self.nodes.get_mut(&id).unwrap().overlay.submenu_ids.insert(index,entry.id.clone());
        let row = self.nodes[&id]
            .overlay
            .rows
            .get(index)
            .copied()
            .unwrap_or_default();
        let right = self.nodes[&id].rect.width;
        let width = self.nodes[&child].desired[0].max(100.);
        let bounds = self
            .popup_viewport
            .unwrap_or(Rect::new(0., 0., self.width, self.height));
        let x = if self.nodes[&id].world.point(right, 0.).0 + width > bounds.x + bounds.width {
            -width
        } else {
            right
        };
        self.update(vec![Update {
            id: child,
            patch: json!({"menuItems":entry.items,"placementPosition":[x,row.y],"isOpen":true}),
        }])?;
        self.sync_overlays();
        if keyboard {
            let first = self.nodes[&child]
                .props
                .menu_items
                .iter()
                .position(|e| e.enabled && e.kind != MenuEntryKind::Separator);
            self.nodes.get_mut(&child).unwrap().overlay.selected = first;
            self.focus(Some(child));
        }
        Ok(())
    }
    pub(super) fn invoke_menu_entry(&mut self, id: u32, index: usize) -> Result<(), String> {
        let n = self.get(id)?;
        let entry = n.props.menu_items.get(index).ok_or("invalid menu index")?;
        if !n.overlay.open || !entry.enabled || entry.kind == MenuEntryKind::Separator
            || entry.source_node.is_some_and(|source|!self.nodes.get(&source).is_some_and(|n|menu_item_controls::is_item(n.kind)) || !self.menu_item_logical_enabled(source)) {
            return Ok(());
        }
        if entry.kind == MenuEntryKind::Submenu {
            return self.open_submenu(id, index, true);
        }
        let source_node=entry.source_node;
        let command=entry.command;let parameter=entry.command_parameter.clone();
        let item_id = entry.id.clone();
        let kind = entry.kind;
        let group = entry.group_name.clone();
        if kind == MenuEntryKind::Radio {
            for item in &mut self.nodes.get_mut(&id).unwrap().props.menu_items {
                if item.kind == MenuEntryKind::Radio && item.group_name == group {
                    item.checked = item.id == item_id;
                }
            }
        } else if kind == MenuEntryKind::Toggle {
            let entry = &mut self.nodes.get_mut(&id).unwrap().props.menu_items[index];
            entry.checked = !entry.checked;
        }
        let checked = matches!(kind, MenuEntryKind::Toggle | MenuEntryKind::Radio)
            .then_some(Some(self.nodes[&id].props.menu_items[index].checked));
        let activated=self.nodes[&id].props.menu_items[index].clone();
        if source_node.is_some(){self.commit_menu_item_entry(&activated);}
        let mut at = id;
        loop {
            self.emit(at, EventKind::MenuItemInvoked);
            let event = self.events.last_mut().unwrap();
            event.item_id = Some(item_id.clone());
            event.is_checked = checked;
            if let Some((parent, index)) = self.nodes[&at].overlay.parent_menu {
                let items = self.nodes[&at].props.menu_items.clone();
                if let Some(entry) = self
                    .nodes
                    .get_mut(&parent)
                    .unwrap()
                    .props
                    .menu_items
                    .get_mut(index)
                {
                    entry.items = items;
                }
                at = parent;
            } else {
                break;
            }
        }
        if let Some(command)=command{self.request_execute(command,parameter)?;}
        self.request_overlay_close(at)
    }
    pub(super) fn menu_entry_tick(&mut self) {
        let mut closed=false;
        let ids = self
            .nodes
            .values()
            .filter(|n| n.kind == NodeKind::MenuFlyout)
            .map(|n| n.id)
            .collect::<Vec<_>>();
        for id in ids {
            if !self.nodes[&id].overlay.open {
                let state = &mut self.nodes.get_mut(&id).unwrap().overlay;
                state.submenu_hover = None;
                state.submenu_open_at = None;
                state.submenu_close_at = None;
                continue;
            }
            if self.nodes[&id]
                .overlay
                .submenu_close_at
                .is_some_and(|at| self.time >= at)
            {
                let children = self.nodes[&id]
                    .overlay
                    .submenus
                    .values()
                    .copied()
                    .collect::<Vec<_>>();
                self.nodes.get_mut(&id).unwrap().overlay.submenu_close_at = None;
                closed=true;
                for child in children {
                    if let Some(n) = self.nodes.get_mut(&child) {
                        n.props.is_open = false;
                    }
                }
                self.invalidate(id, true);
            }
            if self.nodes[&id]
                .overlay
                .submenu_open_at
                .is_some_and(|at| self.time >= at)
            {
                let index = self.nodes[&id].overlay.submenu_hover;
                self.nodes.get_mut(&id).unwrap().overlay.submenu_open_at = None;
                if let Some(index) = index {
                    let _ = self.open_submenu(id, index, false);
                }
                self.invalidate(id, true);
            }
        }
        if closed {self.sync_overlays();}
    }
    pub(super) fn sync_menu_entries(&mut self) {
        let ids = self
            .nodes
            .values()
            .filter(|n| n.kind == NodeKind::MenuFlyout)
            .map(|n| n.id)
            .collect::<Vec<_>>();
        for id in ids {
            if !self.nodes.contains_key(&id) {
                continue;
            }
            let children = self.nodes[&id].overlay.submenus.clone();
            for (index, child) in children {
                let keep = self.nodes[&id]
                    .props
                    .menu_items
                    .get(index)
                    .is_some_and(|e| e.kind == MenuEntryKind::Submenu && self.nodes[&id].overlay.submenu_ids.get(&index)==Some(&e.id));
                if !keep {
                    let _ = self.destroy(child);
                    self.nodes
                        .get_mut(&id)
                        .unwrap()
                        .overlay
                        .submenus
                        .remove(&index);
                } else {
                    let items = self.nodes[&id].props.menu_items[index].items.clone();
                    if serde_json::to_value(&items).unwrap()
                        != serde_json::to_value(&self.nodes[&child].props.menu_items).unwrap()
                    {
                        let _ = self.update(vec![Update {
                            id: child,
                            patch: json!({"menuItems":items}),
                        }]);
                    }
                }
            }
        }
    }
    pub(super) fn menu_entry_input(&mut self, input: &Input) -> Result<bool, String> {
        if let Input::KeyDown { key, .. } = input {
            if let Some(id) = self
                .focused
                .filter(|id| self.nodes[id].kind == NodeKind::MenuFlyout)
            {
                let rtl = self.effective_flow_direction(id) == FlowDirection::RightToLeft;
                if key == if rtl { "ArrowLeft" } else { "ArrowRight" } {
                    if let Some(index) = self.nodes[&id].overlay.selected.filter(|i| {
                        self.nodes[&id].props.menu_items[*i].kind == MenuEntryKind::Submenu
                    }) {
                        self.open_submenu(id, index, true)?;
                        return Ok(true);
                    }
                }
                if key == if rtl { "ArrowRight" } else { "ArrowLeft" } {
                    if let Some((parent, _)) = self.nodes[&id].overlay.parent_menu {
                        self.update(vec![Update {
                            id,
                            patch: json!({"isOpen":false}),
                        }])?;
                        self.sync_overlays();
                        self.focus(Some(parent));
                        return Ok(true);
                    }
                }
            }
        }
        if matches!(input, Input::Move { .. } | Input::Leave) {
            let point = if let Input::Move { x, y, .. } = input {
                Some((*x, *y))
            } else {
                None
            };
            let ids = self
                .nodes
                .values()
                .filter(|n| n.kind == NodeKind::MenuFlyout && n.overlay.open)
                .map(|n| n.id)
                .collect::<Vec<_>>();
            let delay = super::command_menus::contract()["motion"]["submenuDelayMs"]
                .as_f64()
                .unwrap();
            for id in ids {
                let index = point
                    .filter(|(x, y)| self.inside(id, *x, *y))
                    .and_then(|(x, y)| {
                        let (x, y) = self.nodes[&id]
                            .world
                            .inverse()
                            .unwrap_or_default()
                            .point(x, y);
                        self.nodes[&id]
                            .overlay
                            .rows
                            .iter()
                            .position(|r| r.contains(x, y))
                    });
                // Crossing into a descendant cancels its parent's delayed close.
                let in_child = point.is_some_and(|(x, y)| {
                    self.nodes.values().any(|n| {
                        n.kind == NodeKind::MenuFlyout
                            && n.overlay.open
                            && n.id != id
                            && self.descendant_of(n.id, id)
                            && self.inside(n.id, x, y)
                    })
                });
                let over_open = index
                    .and_then(|i| self.nodes[&id].overlay.submenus.get(&i))
                    .is_some_and(|child| self.nodes.get(child).is_some_and(|c| c.props.is_open));
                let has_open = self.nodes[&id]
                    .overlay
                    .submenus
                    .values()
                    .any(|child| self.nodes.get(child).is_some_and(|c| c.props.is_open));
                let n = self.nodes.get_mut(&id).unwrap();
                if index != n.overlay.submenu_hover {
                    n.overlay.submenu_hover = index;
                    n.overlay.submenu_open_at = index
                        .filter(|i| {
                            n.props.menu_items[*i].enabled
                                && n.props.menu_items[*i].kind == MenuEntryKind::Submenu
                        })
                        .map(|_| self.time + delay);
                }
                if in_child || over_open {
                    n.overlay.submenu_close_at = None;
                } else if n.overlay.submenu_close_at.is_none() && has_open {
                    n.overlay.submenu_close_at = Some(self.time + delay);
                }
            }
        }
        if let Input::CommandAccelerator {
            key,
            control,
            shift,
            alt,
        } = input
        {
            fn find(
                items: &[overlays::MenuEntry],
                key: &str,
                c: bool,
                s: bool,
                a: bool,
                path: &mut Vec<usize>,
            ) -> Option<Vec<usize>> {
                for (index, item) in items.iter().enumerate() {
                    if !item.enabled {
                        continue;
                    }
                    path.push(index);
                    if item.keyboard_accelerators.iter().any(|acc| {
                        acc.key.eq_ignore_ascii_case(key)
                            && acc
                                .modifiers
                                .contains(&KeyboardAcceleratorModifier::Control)
                                == c
                            && acc.modifiers.contains(&KeyboardAcceleratorModifier::Shift) == s
                            && acc.modifiers.contains(&KeyboardAcceleratorModifier::Alt) == a
                    }) {
                        return Some(path.clone());
                    }
                    if let Some(found) = find(&item.items, key, c, s, a, path) {
                        return Some(found);
                    }
                    path.pop();
                }
                None
            }
            let found = self
                .nodes
                .values()
                .filter(|n| (n.kind == NodeKind::MenuBarItem || (n.kind==NodeKind::MenuFlyout && n.overlay.parent_menu.is_none() && n.menu.owner.is_none())) && self.menu_item_logical_enabled(n.id))
                .find_map(|n| {
                    find(
                        &n.props.menu_items,
                        key,
                        *control,
                        *shift,
                        *alt,
                        &mut vec![],
                    )
                    .map(|path| (n.id, path))
                });
            if let Some((owner, path)) = found {
                let mut items = &mut self.nodes.get_mut(&owner).unwrap().props.menu_items;
                for index in &path[..path.len() - 1] {
                    items = &mut items[*index].items;
                }
                let index = *path.last().unwrap();
                let item_id = items[index].id.clone();
                let kind = items[index].kind;
                if kind == MenuEntryKind::Toggle {
                    items[index].checked = !items[index].checked;
                } else if kind == MenuEntryKind::Radio {
                    let group = items[index].group_name.clone();
                    for item in items.iter_mut() {
                        if item.kind == MenuEntryKind::Radio && item.group_name == group {
                            item.checked = item.id == item_id;
                        }
                    }
                }
                let checked = matches!(kind, MenuEntryKind::Toggle | MenuEntryKind::Radio)
                    .then_some(Some(items[index].checked));
                let activated=items[index].clone();
                self.commit_menu_item_entry(&activated);
                if let Some(command)=activated.command{self.request_execute(command,activated.command_parameter.clone())?;}
                self.sync_menu_bar_source(owner);
                self.emit(owner, EventKind::MenuItemInvoked);
                let e = self.events.last_mut().unwrap();
                e.item_id = Some(item_id);
                e.is_checked = checked;
                if let Some(bar) = self.menu_item_bar(owner) {
                    let mut e = self.events.last().unwrap().clone();
                    e.target = bar;
                    self.events.push(e);
                }
                return Ok(true);
            }
        }
        Ok(false)
    }
}

impl Scene {
 pub(super) fn sync_menu_commands(&mut self){
  let metadata=self.nodes.values().filter(|n|view_controls::is_command(n.kind)).filter_map(|n|self.command_metadata(n.id).ok().map(|m|(n.id,m))).collect::<std::collections::HashMap<_,_>>();
  fn apply(entries:&mut[overlays::MenuEntry],metadata:&std::collections::HashMap<u32,view_controls::CommandMetadata>){for entry in entries{
   if let Some(command)=entry.command {let previous=entry.command_metadata.take();let base=*entry.command_base_enabled.get_or_insert(entry.enabled);if let Some(meta)=metadata.get(&command){
    if entry.text.is_empty()||previous.as_ref().is_some_and(|m|m.label==entry.text){entry.text=meta.label.clone();}
    if entry.icon.is_empty()||previous.as_ref().and_then(|m|m.icon_symbol).is_some_and(|s|crate::icons::symbol_glyph(s)==entry.icon){entry.icon=meta.icon_symbol.map(crate::icons::symbol_glyph).unwrap_or("").into();}
    if entry.keyboard_accelerators.is_empty()||previous.as_ref().is_some_and(|m|serde_json::to_string(&m.accelerators).unwrap()==serde_json::to_string(&entry.keyboard_accelerators).unwrap()){entry.keyboard_accelerators=meta.accelerators.clone();}
    entry.enabled=base&&meta.can_execute;entry.command_metadata=Some(meta.clone());
   }else{entry.enabled=false;}}
   apply(&mut entry.items,metadata);
  }}
  for n in self.nodes.values_mut(){apply(&mut n.props.menu_items,&metadata);if let Some(menu)=&mut n.props.menu_controls{for entry in &mut menu.items {apply(&mut entry.items,&metadata);}}}
 }
}
