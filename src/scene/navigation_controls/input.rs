use super::*;
#[derive(Deserialize)]
#[serde(tag = "action", rename_all = "camelCase", deny_unknown_fields)]
pub enum Command {
    Choose {
        index: i32,
    },
    Step {
        direction: i32,
    },
    FocusPart {
        key: String,
    },
    Close {
        index: i32,
    },
    Add,
    OpenOverflow,
    ChooseOverflow {
        index: i32,
    },
    Expand {
        key: String,
        expanded: bool,
    },
    SelectNode {
        key: String,
    },
    Reparent {
        keys: Vec<String>,
        parent: Option<String>,
        before: Option<String>,
    },
    DragStart {
        index: usize,
    },
    DragOver {
        index: usize,
        #[serde(default)]
        key: Option<String>,
        #[serde(default = "default_tab_drag_width")]
        width: f64,
        #[serde(default)]
        external: bool,
    },
    ClearOffer,
    Drop {
        source: Option<u32>,
        items: Vec<NavigationItem>,
        index: usize,
    },
    DragEnd {
        #[serde(default)]
        outside: bool,
    },
    FocusNode {
        key: String,
    },
    RemoveTransferred {
        keys: Vec<String>,
    },
}
fn default_tab_drag_width() -> f64 {
    100.
}
impl Scene {
    fn navigation_control_at(&self, x: f64, y: f64) -> Option<u32> {
        let hit = self.hit(x, y)?;
        let mut at = Some(hit);
        while let Some(id) = at {
            let n = &self.nodes[&id];
            if is_control(n.kind) {
                return (hit == id || n.kind == NodeKind::TreeView).then_some(id);
            }
            at = n.parent;
        }
        None
    }
    fn navigation_part_at(&self, id: u32, x: f64, y: f64) -> Option<String> {
        let n = &self.nodes[&id];
        let (x, y) = n.world.inverse()?.point(x, y);
        n.nav_controls
            .parts
            .iter()
            .rev()
            .find(|p| p.visible && p.enabled && p.rect.contains(x, y))
            .map(|p| p.key.clone())
    }
    fn choose_navigation_index(&mut self, id: u32, index: i32) -> Result<(), String> {
        let n = self.get(id)?;
        if !self.effective_enabled(id) {
            return Ok(());
        }
        if n.kind == NodeKind::PipsPager {
            let q = &n.props.nav_controls;
            let pages = q.number_of_pages;
            let index = if pages == 0 {
                return Ok(());
            } else if pages > 0 && q.wrap_mode == PipsPagerWrapMode::Wrap {
                index.rem_euclid(pages)
            } else {
                index
                    .max(0)
                    .min(if pages < 0 { i32::MAX } else { pages - 1 })
            };
            if index != q.selected_page_index {
                self.nodes
                    .get_mut(&id)
                    .unwrap()
                    .props
                    .nav_controls
                    .selected_page_index = index;
            }
        } else if matches!(n.kind, NodeKind::TabView | NodeKind::FlipView | NodeKind::SelectorBar) {
            if n.kind==NodeKind::SelectorBar && index == -1 { self.nodes.get_mut(&id).unwrap().props.selected_index = -1; self.sync_navigation_controls();self.invalidate(id,false);return Ok(());}
            if index < 0
                || index as usize >= n.props.nav_controls.items.len()
                || !n.props.nav_controls.items[index as usize].enabled
            {
                return Ok(());
            }
            let node = self.nodes.get_mut(&id).unwrap();
            node.props.selected_index = index;
            node.nav_controls.selection_explicit=true;
            if matches!(node.kind,NodeKind::TabView|NodeKind::SelectorBar) {
                node.nav_controls.focused_part =
                    Some(node.props.nav_controls.items[index as usize].id.clone());
            }
        } else if n.kind == NodeKind::BreadcrumbBar
            && index >= 0
            && (index as usize) < n.props.nav_controls.items.len()
        {
            self.emit_navigation(id, EventKind::ItemClick, index, "itemClicked");
        }
        self.nodes.get_mut(&id).unwrap().nav_controls.last_activity = self.time;
        self.sync_navigation_controls();
        self.invalidate(id, false);
        Ok(())
    }
    fn navigation_step(&mut self, id: u32, direction: i32) -> Result<(), String> {
        let n = self.get(id)?;
        let mut index = if n.kind == NodeKind::PipsPager {
            n.props.nav_controls.selected_page_index
        } else {
            n.props.selected_index
        };
        let step = direction.signum();
        if step == 0 {
            return Ok(());
        }
        index = index.saturating_add(step);
        if n.kind != NodeKind::PipsPager {
            while index >= 0
                && (index as usize) < n.props.nav_controls.items.len()
                && !n.props.nav_controls.items[index as usize].enabled
            {
                index += step;
            }
        }
        self.choose_navigation_index(id, index)
    }
    fn invoke_navigation_part(&mut self, id: u32, key: &str) -> Result<(), String> {
        let Some(part) = self.nodes[&id]
            .nav_controls
            .parts
            .iter()
            .find(|p| p.key == key)
            .cloned()
        else {
            return Ok(());
        };
        if !part.enabled || !part.visible {
            return Ok(());
        }
        match part.role.as_str() {
            "flipButton" | "pip" | "pipButton" | "tab" | "selector" | "breadcrumb" => {
                self.choose_navigation_index(id, part.index)?
            }
            "ellipsis" => self.open_navigation_overflow(id)?,
            "closeTab" => self.emit_navigation(
                id,
                EventKind::TabCloseRequested,
                part.index,
                "closeRequested",
            ),
            "addTab" => self.emit_navigation(id, EventKind::AddTabButtonClick, -1, "add"),
            "tabScroll" => {
                let c = &mut self.nodes.get_mut(&id).unwrap().nav_controls;
                let direction = if key == "scrollPrevious" { -1. } else { 1. };
                let offset = (c.pips_scroll.value(self.time) + direction * 120.).max(0.);
                c.pips_scroll.set(offset, self.time, !self.reduced_motion);
            }
            _ => {}
        }
        self.invalidate(id, false);
        Ok(())
    }
    pub fn navigation_control_command(&mut self, id: u32, value: Value) -> Result<(), String> {
        if !is_control(self.get(id)?.kind) {
            return Err("Not a navigation control".into());
        }
        let command: Command = serde_json::from_value(value).map_err(|e| e.to_string())?;
        if !self.effective_enabled(id) {
            return Ok(());
        }
        self.nodes.get_mut(&id).unwrap().nav_controls.drop_committed = false;
        match command {
            Command::Choose { index } | Command::ChooseOverflow { index } => {
                self.choose_navigation_index(id, index)?;
                if let Some(popup) = self.nodes[&id].nav_controls.popup {
                    self.update(vec![Update {
                        id: popup,
                        patch: json!({"isOpen":false}),
                    }])?;
                }
            }
            Command::Step { direction } => self.navigation_step(id, direction)?,
            Command::FocusPart { key } => {
                if self.nodes[&id].kind==NodeKind::SelectorBar {if let Some(index)=self.nodes[&id].props.nav_controls.items.iter().position(|i|i.id==key&&i.enabled){self.choose_navigation_index(id,index as i32)?;}}
                self.nodes.get_mut(&id).unwrap().nav_controls.focused_part = Some(key);
                self.focus(Some(id));
            }
            Command::Close { index } => {
                let n = &self.nodes[&id];
                if n.kind == NodeKind::TabView
                    && index >= 0
                    && n.props
                        .nav_controls
                        .items
                        .get(index as usize)
                        .is_some_and(|i| i.enabled && i.is_closable)
                {
                    self.emit_navigation(id, EventKind::TabCloseRequested, index, "closeRequested");
                }
            }
            Command::Add => self.emit_navigation(id, EventKind::AddTabButtonClick, -1, "add"),
            Command::OpenOverflow => self.open_navigation_overflow(id)?,
            Command::Expand { key, expanded } => self.tree_expand(id, &key, expanded)?,
            Command::SelectNode { key } => self.tree_select(id, &key, true)?,
            Command::Reparent {
                keys,
                parent,
                before,
            } => self.tree_reparent(id, &keys, parent.as_deref(), before.as_deref())?,
            Command::RemoveTransferred { keys } => {
                if self.nodes[&id].kind != NodeKind::TabView {
                    return Err("Tab transfer source required".into());
                }
                let active = self.nodes[&id]
                    .nav_controls
                    .drag
                    .as_ref()
                    .map(|d| d.0.as_str());
                if keys.len() != 1 || active != keys.first().map(String::as_str) {
                    return Err("No matching source tab drag".into());
                }
                let items = self.nodes[&id]
                    .props
                    .nav_controls
                    .items
                    .iter()
                    .filter(|i| !keys.contains(&i.id))
                    .cloned()
                    .collect();
                self.nodes.get_mut(&id).unwrap().props.nav_controls.items = Arc::new(items);
                self.emit_tab_source_changed(id);
            }
            Command::FocusNode { key } => {
                let mut parent = self.nodes[&id]
                    .nav_controls
                    .tree_indices
                    .get(&key)
                    .and_then(|index| {
                        self.nodes[&id].props.nav_controls.items[*index]
                            .parent
                            .clone()
                    });
                let mut ancestors = vec![];
                while let Some(key) = parent {
                    ancestors.push(key.clone());
                    parent = self.nodes[&id].props.nav_controls.items
                        [self.nodes[&id].nav_controls.tree_indices[&key]]
                        .parent
                        .clone();
                }
                for parent in ancestors.into_iter().rev() {
                    self.tree_expand(id, &parent, true)?;
                }
                self.focus(Some(id));
                self.nodes.get_mut(&id).unwrap().collection.focus = Some(key.clone());
                if let Some(index) = self.nodes[&id].collection.indices.get(&key).copied() {
                    self.collection_bring(id, index)?;
                }
            }
            Command::DragStart { index } => {
                let n = &self.nodes[&id];
                if n.kind != NodeKind::TabView
                    || (!n.props.nav_controls.can_drag_tabs
                        && !n.props.nav_controls.can_reorder_tabs)
                    || index >= n.props.nav_controls.items.len()
                {
                    return Ok(());
                }
                let key = n.props.nav_controls.items[index].id.clone();
                self.nodes.get_mut(&id).unwrap().nav_controls.drag = Some((key, index, index));
                self.emit_navigation(id, EventKind::DragItemsStarting, index as i32, "dragStart");
            }
            Command::DragOver {
                index,
                key,
                width,
                external,
            } => {
                if !width.is_finite() || !(0. ..=10000.).contains(&width) {
                    return Err("Invalid tab drag width".into());
                }
                let n = self.nodes.get_mut(&id).unwrap();
                let allowed = if external {
                    n.props.nav_controls.allow_drop_tabs
                } else {
                    n.props.nav_controls.can_reorder_tabs
                };
                if allowed {
                    n.nav_controls.tab_offer =
                        Some((if external { None } else { key }, index, width));
                    if let Some(drag) = &mut n.nav_controls.drag {
                        drag.2 = index;
                    }
                }
            }
            Command::ClearOffer => {
                self.nodes.get_mut(&id).unwrap().nav_controls.tab_offer = None;
            }
            Command::Drop {
                source,
                items,
                index,
            } => self.navigation_tab_drop(id, source, items, index)?,
            Command::DragEnd { outside } => {
                self.nodes.get_mut(&id).unwrap().nav_controls.tab_offer = None;
                let drag = self.nodes.get_mut(&id).unwrap().nav_controls.drag.take();
                if let Some((key, index, _)) = drag {
                    let outside=outside&&self.nodes[&id].props.nav_controls.can_drag_tabs;
                    self.emit_navigation(
                        id,
                        if outside {
                            EventKind::TabDroppedOutside
                        } else {
                            EventKind::DragItemsCompleted
                        },
                        index as i32,
                        if outside {
                            "droppedOutside"
                        } else {
                            "dragCompleted"
                        },
                    );
                    let event=self.events.last_mut().unwrap();event.item_id=Some(key.clone());event.payload.as_mut().unwrap()["navigation"]["key"]=Value::String(key);
                }
            }
        }
        self.sync_navigation_controls();
        self.invalidate(id, false);
        Ok(())
    }
    pub fn navigation_control_host_input(
        &mut self,
        id: u32,
        value: Value,
        time: f64,
    ) -> Result<Value, String> {
        self.advance(time);
        self.sync_navigation_controls();
        self.navigation_control_command(id, value)?;
        Ok(
            json!({"events":std::mem::take(&mut self.events),"selectedIndex":self.nodes[&id].props.selected_index,"selectedPageIndex":self.nodes[&id].props.nav_controls.selected_page_index,"dragging":self.nodes[&id].nav_controls.drag.is_some(),"committed":self.nodes[&id].nav_controls.drop_committed}),
        )
    }
    fn open_navigation_overflow(&mut self, id: u32) -> Result<(), String> {
        let n = self.get(id)?;
        if n.kind != NodeKind::BreadcrumbBar {
            return Err("Overflow is only supported by BreadcrumbBar".into());
        }
        let first = n.nav_controls.first_visible as usize;
        if first == 0 {
            return Ok(());
        }
        let old = n.nav_controls.popup;
        if let Some(old) = old {
            if self.nodes.contains_key(&old) {
                self.destroy(old)?;
            }
            self.nodes.get_mut(&id).unwrap().nav_controls.popup = None;
        }
        let popup=self.create(id,NodeKind::Flyout,json!({"placementTarget":id,"placement":"BottomEdgeAlignedLeft","padding":[0,0,0,0],"minWidth":0,"isOpen":true}))?;
        let panel = self.create(popup, NodeKind::StackPanel, json!({"padding":[4,4,4,4]}))?;
        let items = self.nodes[&id].props.nav_controls.items.clone();
        for (index, item) in items.iter().take(first).enumerate().rev() {
            let button=self.create(panel,NodeKind::Button,json!({"text":item.text,"accessibleName":item.text,"variant":"Subtle","horizontalAlignment":"Stretch","horizontalContentAlignment":"Left","padding":[12,8,12,8],"minHeight":32}))?;
            let c = &mut self.nodes.get_mut(&button).unwrap().nav_controls;
            c.owner = Some(id);
            c.slot_key = index.to_string();
            c.slot_role = "overflowItem".into();
        }
        self.nodes.get_mut(&id).unwrap().nav_controls.popup = Some(popup);
        Ok(())
    }
    fn navigation_tab_drop(
        &mut self,
        id: u32,
        source: Option<u32>,
        incoming: Vec<NavigationItem>,
        index: usize,
    ) -> Result<(), String> {
        let n = self.get(id)?;
        if n.kind != NodeKind::TabView {
            return Err("Tab drop requires TabView".into());
        }
        let same = source == Some(id);
        let keys = if let Some(source) = source {
            let c = &self.get(source)?.nav_controls;
            vec![c
                .drag
                .as_ref()
                .ok_or("No active source tab drag")?
                .0
                .clone()]
        } else {
            incoming.iter().map(|i| i.id.clone()).collect()
        };
        if same && !n.props.nav_controls.can_reorder_tabs {
            return Ok(());
        }
        if !same && !n.props.nav_controls.allow_drop_tabs {
            return Ok(());
        }
        if !same
            && source.is_some_and(|source| {
                !self.effective_enabled(source)
                    || !self.nodes[&source].props.nav_controls.can_drag_tabs
            })
        {
            return Ok(());
        }
        let source_items = source.map(|s| self.nodes[&s].props.nav_controls.items.clone());
        let incoming = source_items
            .as_ref()
            .map(|items| {
                items
                    .iter()
                    .filter(|i| keys.contains(&i.id))
                    .cloned()
                    .collect::<Vec<_>>()
            })
            .unwrap_or(incoming);
        if incoming.is_empty() {
            return Ok(());
        }
        if !same
            && incoming
                .iter()
                .any(|i| n.props.nav_controls.items.iter().any(|v| v.id == i.id))
        {
            return Ok(());
        }
        let old = n.props.nav_controls.items.clone();
        let before = if same {
            old[..index.min(old.len())]
                .iter()
                .filter(|i| keys.contains(&i.id))
                .count()
        } else {
            0
        };
        let mut next = old
            .iter()
            .filter(|i| !same || !keys.contains(&i.id))
            .cloned()
            .collect::<Vec<_>>();
        let insertion = index.saturating_sub(before).min(next.len());
        next.splice(insertion..insertion, incoming);
        let mut candidate = n.props.clone();
        candidate.nav_controls.items = Arc::new(next);
        validate(
            NodeKind::TabView,
            &mut candidate,
            &serde_json::Map::from_iter([("navControls".into(), json!({"items":true}))]),
        )?;
        let selected_key = keys.first().cloned();
        self.nodes.get_mut(&id).unwrap().props.nav_controls.items = candidate.nav_controls.items;
        if let Some(source) = source.filter(|s| *s != id) {
            let remaining = source_items
                .unwrap()
                .iter()
                .filter(|i| !keys.contains(&i.id))
                .cloned()
                .collect();
            self.nodes
                .get_mut(&source)
                .unwrap()
                .props
                .nav_controls
                .items = Arc::new(remaining);
            self.emit_tab_source_changed(source);
        }
        if let Some(key) = selected_key {
            self.nodes.get_mut(&id).unwrap().nav_controls.selection_explicit=true;
            self.nodes.get_mut(&id).unwrap().props.selected_index = self.nodes[&id]
                .props
                .nav_controls
                .items
                .iter()
                .position(|i| i.id == key)
                .unwrap_or(0)
                as i32;
        }
        self.nodes.get_mut(&id).unwrap().nav_controls.drop_committed = true;
        self.emit_tab_source_changed(id);
        self.sync_navigation_controls();
        self.invalidate(id, true);
        Ok(())
    }
    fn emit_tab_source_changed(&mut self, id: u32) {
        let order = self.nodes[&id]
            .props
            .nav_controls
            .items
            .iter()
            .map(|i| i.id.clone())
            .collect::<Vec<_>>();
        self.emit(id, EventKind::ItemsChanged);
        self.events.last_mut().unwrap().payload =
            Some(json!({"navigation":{"action":"itemsChanged","order":order}}));
    }
    pub(in crate::scene) fn pump_navigation_control_events(&mut self) {
        let pending = self
            .events
            .iter()
            .filter_map(|e| {
                let n = self.nodes.get(&e.target)?;
                (e.kind == EventKind::Click
                    && matches!(
                        n.nav_controls.slot_role.as_str(),
                        "overflowItem" | "treeCheck"
                    ))
                .then(|| {
                    (
                        n.nav_controls.owner.unwrap(),
                        n.nav_controls.slot_key.clone(),
                        n.nav_controls.slot_role.clone(),
                    )
                })
            })
            .collect::<Vec<_>>();
        // Consume the generated click so a second pump in the same frame does not invoke it twice.
        self.events.retain(|e| {
            !self.nodes.get(&e.target).is_some_and(|n| {
                e.kind == EventKind::Click
                    && matches!(
                        n.nav_controls.slot_role.as_str(),
                        "overflowItem" | "treeCheck"
                    )
            })
        });
        for (id, key, role) in pending {
            if role == "treeCheck" {
                let _ = self.tree_select(id, &key, true);
                self.focus(Some(id));
            } else {
                let _ = self.navigation_control_command(
                    id,
                    json!({"action":"chooseOverflow","index":key.parse::<i32>().unwrap()}),
                );
            }
        }
    }
    pub(in crate::scene) fn navigation_control_input(
        &mut self,
        input: &Input,
    ) -> Result<bool, String> {
        match input {
            Input::Navigation { id, input }
                if self.nodes.get(id).is_some_and(|n| is_control(n.kind)) =>
            {
                self.navigation_control_command(*id, input.clone())?;
                return Ok(true);
            }
            Input::Focus { id }
                if self
                    .nodes
                    .get(id)
                    .is_some_and(|n| n.kind == NodeKind::FlipView) =>
            {
                self.nodes.get_mut(id).unwrap().nav_controls.last_activity = self.time;
                return Ok(false);
            }
            Input::Modifiers { ctrl, shift } => {
                for n in self.nodes.values_mut().filter(|n| is_control(n.kind)) {
                    n.nav_controls.modifiers = (*ctrl, *shift);
                }
                return Ok(false);
            }
            Input::Move { x, y, .. } => {
                let owner = self.navigation_control_at(*x, *y);
                let ids = self
                    .nodes
                    .values()
                    .filter(|n| is_control(n.kind) && n.kind != NodeKind::TreeView)
                    .map(|n| n.id)
                    .collect::<Vec<_>>();
                for id in ids {
                    let hit = if owner == Some(id) {
                        self.navigation_part_at(id, *x, *y)
                            .or_else(|| Some("surface".into()))
                    } else {
                        None
                    };
                    let c = &mut self.nodes.get_mut(&id).unwrap().nav_controls;
                    c.hovered = hit;
                    if owner == Some(id) {
                        c.last_activity = self.time;
                    }
                }
                return Ok(false);
            }
            Input::Down { x, y, pointer } => {
                let Some(id) = self.navigation_control_at(*x, *y) else {
                    return Ok(false);
                };
                if self.nodes[&id].kind == NodeKind::TreeView {
                    let n = &self.nodes[&id];
                    let (x, y) = n.world.inverse().unwrap_or_default().point(*x, *y);
                    let offset = n.scroll.offsets(self.time)[1];
                    let index = n
                        .collection
                        .realized
                        .values()
                        .find_map(|child| {
                            let n = &self.nodes[child];
                            (y + offset >= n.rect.y && y + offset < n.rect.y + n.rect.height)
                                .then_some(n.props.collection_index)
                        })
                        .unwrap_or(usize::MAX);
                    if let Some(item) = n.props.collection_items.get(index) {
                        if let Some(row) = n.nav_controls.tree_rows.get(&item.id) {
                            let local = if n.props.flow_direction == FlowDirection::RightToLeft {
                                n.rect.width - x
                            } else {
                                x
                            };
                            if row.has_children && {
                                let (_, left, right) = tree_columns(
                                    self.dpr,
                                    n.props.nav_controls.tree_selection_mode
                                        == TreeViewSelectionMode::Multiple,
                                );
                                (left + row.depth as f64 * 16. ..right + row.depth as f64 * 16.)
                                    .contains(&local)
                            } {
                                let key = row.key.clone();
                                let expanded = !row.expanded;
                                self.focus(Some(id));
                                self.tree_expand(id, &key, expanded)?;
                                return Ok(true);
                            }
                        }
                    }
                    return Ok(false);
                }
                let key = self
                    .navigation_part_at(id, *x, *y)
                    .unwrap_or_else(|| "surface".into());
                self.focus(Some(id));
                self.captured = Some((*pointer, id));
                let c = &mut self.nodes.get_mut(&id).unwrap().nav_controls;
                c.pressed = Some((*pointer, key));
                c.drag_position = Some([*x, *y]);
                c.last_activity = self.time;
                self.invalidate(id, false);
                return Ok(true);
            }
            Input::Touch {
                pointer,
                x,
                y,
                phase,
            } => {
                let active = self
                    .nodes
                    .values()
                    .find(|n| n.nav_controls.touch.is_some_and(|t| t.0 == *pointer))
                    .map(|n| n.id);
                let owner = active.or_else(|| {
                    self.navigation_control_at(*x, *y)
                        .filter(|id| self.nodes[id].kind == NodeKind::FlipView)
                });
                let Some(id) = owner else {
                    return Ok(false);
                };
                match phase.as_str() {
                    "down" => {
                        let page = self.nodes[&id].nav_controls.page.value(self.time);
                        self.focus(Some(id));
                        let c = &mut self.nodes.get_mut(&id).unwrap().nav_controls;
                        c.touch = Some((*pointer, [*x, *y], page));
                        c.hovered = None;
                        c.last_activity = 0.;
                    }
                    "move" => {
                        if let Some((_, start, initial)) = self.nodes[&id].nav_controls.touch {
                            let n = &self.nodes[&id];
                            let vertical = n.props.orientation == Orientation::Vertical;
                            let size = if vertical {
                                n.rect.height
                            } else {
                                n.rect.width
                            };
                            let delta = if vertical {
                                *y - start[1]
                            } else {
                                (*x - start[0])
                                    * if n.props.flow_direction == FlowDirection::RightToLeft {
                                        -1.
                                    } else {
                                        1.
                                    }
                            };
                            let value = (initial - delta / size.max(1.)).clamp(
                                (initial - 1.).max(0.),
                                (initial + 1.)
                                    .min(n.props.nav_controls.items.len().saturating_sub(1) as f64),
                            );
                            self.nodes
                                .get_mut(&id)
                                .unwrap()
                                .nav_controls
                                .page
                                .set(value, self.time, false);
                        }
                    }
                    "up" | "cancel" => {
                        let n = self.nodes.get_mut(&id).unwrap();
                        if let Some((_, _, initial)) = n.nav_controls.touch.take() {
                            let value = n.nav_controls.page.value(self.time);
                            let index = if phase == "cancel" {
                                n.props.selected_index
                            } else if (value - initial).abs() > 0.15 {
                                n.props.selected_index + if value > initial { 1 } else { -1 }
                            } else {
                                n.props.selected_index
                            };
                            self.choose_navigation_index(id, index)?;
                            let target = self.nodes[&id].props.selected_index.max(0) as f64;
                            let c = &mut self.nodes.get_mut(&id).unwrap().nav_controls;
                            c.page.set(target, self.time, !self.reduced_motion);
                            c.last_activity = 0.;
                        }
                    }
                    _ => return Err("Unknown touch phase".into()),
                }
                self.invalidate(id, false);
                return Ok(true);
            }
            Input::Up { x, y, pointer } => {
                let Some((capture, id)) = self.captured else {
                    return Ok(false);
                };
                if capture != *pointer
                    || !is_control(self.nodes[&id].kind)
                    || self.nodes[&id].kind == NodeKind::TreeView
                {
                    return Ok(false);
                }
                let pressed = self.nodes.get_mut(&id).unwrap().nav_controls.pressed.take();
                let position = self
                    .nodes
                    .get_mut(&id)
                    .unwrap()
                    .nav_controls
                    .drag_position
                    .take();
                self.captured = None;
                if self.nodes[&id].kind == NodeKind::FlipView {
                    if let Some(start) = position {
                        let delta = if self.nodes[&id].props.orientation == Orientation::Vertical {
                            *y - start[1]
                        } else {
                            *x - start[0]
                        };
                        if delta.abs() > 32. {
                            self.navigation_step(id, if delta < 0. { 1 } else { -1 })?;
                            return Ok(true);
                        }
                    }
                }
                if let Some((_, key)) = pressed {
                    if self.navigation_part_at(id, *x, *y).as_deref() == Some(&key) {
                        self.invoke_navigation_part(id, &key)?;
                    }
                }
                self.invalidate(id, false);
                return Ok(true);
            }
            Input::Cancel { .. } | Input::Leave => {
                for n in self.nodes.values_mut().filter(|n| is_control(n.kind)) {
                    n.nav_controls.hovered = None;
                    if matches!(input, Input::Cancel { .. }) {
                        n.nav_controls.pressed = None;
                        n.nav_controls.drag_position = None;
                    }
                }
            }
            Input::KeyDown { key, repeat } => {
                let Some(id) = self
                    .focused
                    .filter(|id| self.nodes.get(id).is_some_and(|n| is_control(n.kind)))
                else {
                    return Ok(false);
                };
                let n = &self.nodes[&id];
                let kind = n.kind;
                let (ctrl, shift) = n.nav_controls.modifiers;
                let rtl = n.props.flow_direction == FlowDirection::RightToLeft;
                if kind == NodeKind::TreeView {
                    let focused = n
                        .collection
                        .focus
                        .clone()
                        .or_else(|| n.props.collection_items.first().map(|i| i.id.clone()));
                    let Some(focused) = focused else {
                        return Ok(false);
                    };
                    let row = n.nav_controls.tree_rows.get(&focused).cloned();
                    if let Some(row) = row {
                        let right = if rtl { "ArrowLeft" } else { "ArrowRight" };
                        let left = if rtl { "ArrowRight" } else { "ArrowLeft" };
                        if key == right {
                            if row.has_children && !row.expanded {
                                self.tree_expand(id, &focused, true)?;
                            } else if let Some(child) = self.nodes[&id]
                                .nav_controls
                                .tree_children
                                .get(&Some(focused))
                                .and_then(|c| c.first())
                                .copied()
                            {
                                let key =
                                    self.nodes[&id].props.nav_controls.items[child].id.clone();
                                self.nodes.get_mut(&id).unwrap().collection.focus =
                                    Some(key.clone());
                                if self.nodes[&id].props.nav_controls.tree_selection_mode
                                    == TreeViewSelectionMode::Single
                                {
                                    self.tree_select(id, &key, false)?;
                                }
                            }
                            return Ok(true);
                        }
                        if key == left {
                            if row.expanded {
                                self.tree_expand(id, &focused, false)?;
                            } else if let Some(parent) = row.parent {
                                self.nodes.get_mut(&id).unwrap().collection.focus =
                                    Some(parent.clone());
                                if self.nodes[&id].props.nav_controls.tree_selection_mode
                                    == TreeViewSelectionMode::Single
                                {
                                    self.tree_select(id, &parent, false)?;
                                }
                            }
                            return Ok(true);
                        }
                    }
                    return Ok(false);
                }
                if kind == NodeKind::TabView && ctrl {
                    if key == "Tab" {
                        let len = n.props.nav_controls.items.len() as i32;
                        if len > 0 {
                            self.choose_navigation_index(
                                id,
                                (n.props.selected_index + if shift { -1 } else { 1 })
                                    .rem_euclid(len),
                            )?;
                        }
                        return Ok(true);
                    }
                    if key == "F4" {
                        if !repeat {
                            let index = n.props.selected_index;
                            self.navigation_control_command(
                                id,
                                json!({"action":"close","index":index}),
                            )?;
                        }
                        return Ok(true);
                    }
                }
                if kind == NodeKind::BreadcrumbBar {
                    let parts = n
                        .nav_controls
                        .parts
                        .iter()
                        .filter(|p| p.visible)
                        .collect::<Vec<_>>();
                    if parts.is_empty() {
                        return Ok(true);
                    }
                    let current = n
                        .nav_controls
                        .focused_part
                        .as_ref()
                        .and_then(|k| parts.iter().position(|p| &p.key == k))
                        .unwrap_or(0);
                    if key == "ArrowLeft" || key == "ArrowRight" {
                        let next = (current as i32
                            + if (key == "ArrowRight") != rtl { 1 } else { -1 })
                        .clamp(0, parts.len() as i32 - 1)
                            as usize;
                        let key = parts[next].key.clone();
                        self.nodes.get_mut(&id).unwrap().nav_controls.focused_part = Some(key);
                        return Ok(true);
                    }
                }
                let direction = match key.as_str() {
                    "ArrowRight" => {
                        if rtl {
                            -1
                        } else {
                            1
                        }
                    }
                    "ArrowLeft" => {
                        if rtl {
                            1
                        } else {
                            -1
                        }
                    }
                    "ArrowDown" | "PageDown" => 1,
                    "ArrowUp" | "PageUp" => -1,
                    _ => 0,
                };
                if direction != 0 && kind != NodeKind::BreadcrumbBar {
                    self.navigation_step(id, direction)?;
                    return Ok(true);
                }
                if key == "Home" {
                    self.choose_navigation_index(id, 0)?;
                    return Ok(true);
                }
                if key == "End" {
                    let index = if kind == NodeKind::PipsPager {
                        n.props.nav_controls.number_of_pages - 1
                    } else {
                        n.props.nav_controls.items.len() as i32 - 1
                    };
                    if index >= 0 {
                        self.choose_navigation_index(id, index)?;
                    }
                    return Ok(true);
                }
                if (key == " " || key == "Enter") && !repeat {
                    if let Some(key) = n.nav_controls.focused_part.clone() {
                        self.invoke_navigation_part(id, &key)?;
                    }
                    return Ok(true);
                }
            }
            _ => {}
        }
        Ok(false)
    }
    pub(in crate::scene) fn navigation_control_wheel(
        &mut self,
        x: f64,
        y: f64,
        dx: f64,
        dy: f64,
    ) -> Result<bool, String> {
        let Some(id) = self.navigation_control_at(x, y) else {
            return Ok(false);
        };
        if self.nodes[&id].kind != NodeKind::FlipView {
            return Ok(false);
        }
        let n = &self.nodes[&id];
        let delta = if n.props.orientation == Orientation::Vertical {
            dy
        } else if dx != 0. {
            dx
        } else {
            dy
        };
        if delta == 0. {
            return Ok(false);
        }
        if n.nav_controls
            .last_wheel
            .is_some_and(|t| self.time - t < 200.)
        {
            return Ok(true);
        }
        let old = n.props.selected_index;
        self.navigation_step(id, if delta > 0. { 1 } else { -1 })?;
        let changed = self.nodes[&id].props.selected_index != old;
        if changed {
            self.nodes.get_mut(&id).unwrap().nav_controls.last_wheel = Some(self.time);
        }
        Ok(changed)
    }
}
