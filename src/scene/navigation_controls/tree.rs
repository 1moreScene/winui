use super::*;
impl Scene {
    pub(in crate::scene) fn ensure_navigation_tree_parts(
        &mut self,
        owner: u32,
        id: u32,
        index: usize,
    ) {
        let root = &self.nodes[&owner];
        if root.kind != NodeKind::TreeView {
            return;
        }
        let font = root.props.font();
        let multiple =
            root.props.nav_controls.tree_selection_mode == TreeViewSelectionMode::Multiple;
        let templated = root.props.has_item_template;
        let key = root.props.collection_items[index].id.clone();
        let label = root.props.collection_items[index].text.clone();
        let row = root.nav_controls.tree_rows[&key].clone();
        let existing = self.nodes[&id]
            .children
            .iter()
            .filter_map(|id| {
                self.nodes
                    .get(id)
                    .map(|n| (n.nav_controls.slot_role.clone(), *id))
            })
            .collect::<HashMap<_, _>>();
        if !multiple {
            for role in ["treeCheck", "treeLabel"] {
                if let Some(child) = existing.get(role) {
                    let _ = self.destroy(*child);
                }
            }
            return;
        }
        let checked = if row.partial {
            None
        } else {
            Some(row.selected)
        };
        let (check, _, content) = tree_columns(self.dpr, true);
        let y = (2. * self.dpr).ceil() / self.dpr + 4. - 5.;
        let rtl = self.effective_flow_direction(owner) == FlowDirection::RightToLeft;
        let margin = if rtl {
            [0., y, check - content, -y]
        } else {
            [check - content, y, 0., -y]
        };
        let align = if rtl {
            HorizontalAlignment::Right
        } else {
            HorizontalAlignment::Left
        };
        if let Some(child)=existing.get("treeCheck") {
            if self.nodes[child].props.is_checked!=checked||self.nodes[child].props.accessible_name.as_deref()!=Some(label.as_str())||self.nodes[child].props.margin!=margin||self.nodes[child].props.horizontal_alignment!=align {let _=self.update(vec![Update{id:*child,patch:json!({"isChecked":checked,"accessibleName":label,"margin":margin,"horizontalAlignment":align})}]);}
        }else if let Ok(child)=self.create(id,NodeKind::CheckBox,json!({"isChecked":checked,"accessibleName":label,"width":20,"height":20,"minWidth":0,"minHeight":0,"isTabStop":false,"horizontalAlignment":align,"verticalAlignment":"Center","margin":margin})) {
            let c=&mut self.nodes.get_mut(&child).unwrap().nav_controls;c.owner=Some(owner);c.slot_key=key.clone();c.slot_role="treeCheck".into();
        }
        if templated {if let Some(child)=existing.get("treeLabel"){let _=self.destroy(*child);}}
        else if let Some(child)=existing.get("treeLabel") {if self.nodes[child].props.text!=label||self.nodes[child].props.font_size!=font.size||self.nodes[child].props.font_family!=font.family||self.nodes[child].props.font_weight!=font.weight||self.nodes[child].props.font_style!=font.style{let _=self.update(vec![Update{id:*child,patch:json!({"text":label,"fontSize":font.size,"fontFamily":font.family,"fontWeight":font.weight,"fontStyle":font.style})}]);}}
        else if let Ok(child)=self.create(id,NodeKind::TextBlock,json!({"text":label,"fontSize":font.size,"fontFamily":font.family,"fontWeight":font.weight,"fontStyle":font.style,"verticalAlignment":"Center"})) {
            let c=&mut self.nodes.get_mut(&child).unwrap().nav_controls;c.owner=Some(owner);c.slot_key=key;c.slot_role="treeLabel".into();
        }
    }
    pub(in crate::scene) fn rebuild_navigation_tree(&mut self, id: u32) {
        let n = self.nodes.get_mut(&id).unwrap();
        let c = &mut n.nav_controls;
        let items = &n.props.nav_controls.items;
        let mut expanded = n
            .props
            .nav_controls
            .expanded_keys
            .iter()
            .cloned()
            .collect::<HashSet<_>>();
        c.tree_indices.clear();
        c.tree_children.clear();
        for (index, item) in items.iter().enumerate() {
            c.tree_indices.insert(item.id.clone(), index);
            c.tree_children
                .entry(item.parent.clone())
                .or_default()
                .push(index);
            if c.tree_declared_expanded.get(&item.id).copied() != Some(item.is_expanded) {
                if item.is_expanded {
                    expanded.insert(item.id.clone());
                } else {
                    expanded.remove(&item.id);
                }
            }
        }
        c.tree_declared_expanded = items
            .iter()
            .map(|i| (i.id.clone(), i.is_expanded))
            .collect();
        expanded.retain(|k| c.tree_indices.contains_key(k));
        let mut expanded = expanded.into_iter().collect::<Vec<_>>();
        expanded.sort();
        n.props.nav_controls.expanded_keys = Arc::new(expanded);
        c.tree_dirty = true;
    }
    pub(in crate::scene) fn sync_navigation_tree(&mut self, id: u32) {
        let n = &self.nodes[&id];
        if !n.nav_controls.tree_dirty
            && Arc::ptr_eq(
                &n.nav_controls.tree_expanded_source,
                &n.props.nav_controls.expanded_keys,
            )
            && Arc::ptr_eq(&n.nav_controls.tree_selected_source, &n.props.selected_keys)
        {
            return;
        }
        let items = n.props.nav_controls.items.clone();
        let c = &n.nav_controls;
        let selected = n
            .props
            .selected_keys
            .iter()
            .cloned()
            .collect::<HashSet<_>>();
        let expanded = n
            .props
            .nav_controls
            .expanded_keys
            .iter()
            .map(String::as_str)
            .collect::<HashSet<_>>();
        // Postorder counts also cover selected descendants of collapsed nodes.
        let mut counts = vec![(0usize, 0usize); items.len()];
        let mut traversal = c.tree_children.get(&None).cloned().unwrap_or_default();
        let mut order = vec![];
        while let Some(index) = traversal.pop() {
            order.push(index);
            if let Some(children) = c.tree_children.get(&Some(items[index].id.clone())) {
                traversal.extend(children.iter().copied());
            }
        }
        for &index in order.iter().rev() {
            let mut total = usize::from(items[index].enabled);
            let mut checked =
                usize::from(items[index].enabled && selected.contains(&items[index].id));
            for &child in c
                .tree_children
                .get(&Some(items[index].id.clone()))
                .into_iter()
                .flatten()
            {
                total += counts[child].0;
                checked += counts[child].1;
            }
            counts[index] = (total, checked);
        }
        let sets = c
            .tree_children
            .values()
            .flat_map(|siblings| {
                siblings
                    .iter()
                    .enumerate()
                    .map(|(position, index)| (*index, (position + 1, siblings.len())))
            })
            .collect::<HashMap<_, _>>();
        let mut stack = c
            .tree_children
            .get(&None)
            .into_iter()
            .flatten()
            .rev()
            .map(|i| (*i, 0usize))
            .collect::<Vec<_>>();
        let mut rows = HashMap::new();
        let mut visible = vec![];
        let mut metadata = vec![];
        while let Some((index, depth)) = stack.pop() {
            let item = &items[index];
            let children = c.tree_children.get(&Some(item.id.clone()));
            let has = children.is_some_and(|v| !v.is_empty()) || item.has_unrealized_children;
            let (position_in_set, set_size) = sets[&index];
            let (total, checked) = counts[index];
            rows.insert(
                item.id.clone(),
                TreeRow {
                    key: item.id.clone(),
                    parent: item.parent.clone(),
                    depth,
                    index,
                    expanded: expanded.contains(item.id.as_str()),
                    has_children: has,
                    selected: selected.contains(&item.id),
                    partial: checked > 0 && checked < total,
                    position_in_set,
                    set_size,
                },
            );
            visible.push(index);
            metadata.push(collections::CollectionData {
                id: item.id.clone(),
                text: item.text.clone(),
                enabled: item.enabled,
                group: None,
            });
            if expanded.contains(item.id.as_str()) {
                if let Some(children) = children {
                    stack.extend(children.iter().rev().map(|i| (*i, depth + 1)));
                }
            }
        }
        let n = self.nodes.get_mut(&id).unwrap();
        let c = &mut n.nav_controls;
        n.props.collection_items = Arc::new(metadata);
        n.props.selection_mode = match n.props.nav_controls.tree_selection_mode {
            TreeViewSelectionMode::None => ListViewSelectionMode::None,
            TreeViewSelectionMode::Single => ListViewSelectionMode::Single,
            TreeViewSelectionMode::Multiple => ListViewSelectionMode::Multiple,
        };
        c.tree_rows = rows;
        c.tree_visible = visible;
        c.tree_expanded_source = n.props.nav_controls.expanded_keys.clone();
        c.tree_selected_source = n.props.selected_keys.clone();
        c.tree_dirty = false;
        self.invalidate(id, true);
    }
    pub(in crate::scene) fn tree_expand(
        &mut self,
        id: u32,
        key: &str,
        open: bool,
    ) -> Result<(), String> {
        let n = self.get(id)?;
        let Some(index) = n.nav_controls.tree_indices.get(key).copied() else {
            return Err("Unknown TreeView node".into());
        };
        if !self.effective_enabled(id) || !n.props.nav_controls.items[index].enabled {
            return Ok(());
        }
        let mut keys = n
            .props
            .nav_controls
            .expanded_keys
            .iter()
            .cloned()
            .collect::<HashSet<_>>();
        let changed = if open {
            keys.insert(key.into())
        } else {
            keys.remove(key)
        };
        if !changed {
            return Ok(());
        }
        if open {
            self.emit_navigation(id, EventKind::Expanding, index as i32, "expand");
        } else if self.nodes[&id]
            .collection
            .focus
            .as_ref()
            .is_some_and(|focus| {
                focus != key
                    && self
                        .tree_descendants(id, key)
                        .iter()
                        .any(|i| &self.nodes[&id].props.nav_controls.items[*i].id == focus)
            })
        {
            self.nodes.get_mut(&id).unwrap().collection.focus = Some(key.into());
        }
        let mut keys = keys.into_iter().collect::<Vec<_>>();
        keys.sort();
        self.nodes
            .get_mut(&id)
            .unwrap()
            .props
            .nav_controls
            .expanded_keys = Arc::new(keys);
        if !open {
            self.emit_navigation(id, EventKind::Collapsed, index as i32, "collapse");
        }
        self.sync_navigation_tree(id);
        self.sync_collections();
        Ok(())
    }
    fn tree_descendants(&self, id: u32, key: &str) -> Vec<usize> {
        let c = &self.nodes[&id].nav_controls;
        let items = &self.nodes[&id].props.nav_controls.items;
        let Some(first) = c.tree_indices.get(key).copied() else {
            return vec![];
        };
        let mut queue = vec![first];
        let mut result = vec![];
        while let Some(index) = queue.pop() {
            result.push(index);
            if let Some(children) = c.tree_children.get(&Some(items[index].id.clone())) {
                queue.extend(children.iter().rev());
            }
        }
        result
    }
    pub(in crate::scene) fn activate_navigation_tree(
        &mut self,
        id: u32,
        index: usize,
        invoke: bool,
    ) -> Result<bool, String> {
        if self.nodes[&id].kind != NodeKind::TreeView {
            return Ok(false);
        }
        let Some(meta) = self.nodes[&id].props.collection_items.get(index) else {
            return Err("Unknown TreeView visible index".into());
        };
        let key = meta.id.clone();
        self.tree_select(id, &key, invoke)?;
        Ok(true)
    }
    pub(in crate::scene) fn tree_select(
        &mut self,
        id: u32,
        key: &str,
        invoke: bool,
    ) -> Result<(), String> {
        let n = self.get(id)?;
        let Some(index) = n.nav_controls.tree_indices.get(key).copied() else {
            return Err("Unknown TreeView node".into());
        };
        let item = &n.props.nav_controls.items[index];
        if !n.enabled || !item.enabled {
            return Ok(());
        }
        let mode = n.props.nav_controls.tree_selection_mode;
        let old = n
            .props
            .selected_keys
            .iter()
            .cloned()
            .collect::<HashSet<_>>();
        let mut selected = old.clone();
        match mode {
            TreeViewSelectionMode::None => {}
            TreeViewSelectionMode::Single => {
                selected.clear();
                selected.insert(key.into());
            }
            TreeViewSelectionMode::Multiple => {
                let check = !selected.contains(key);
                let descendants = self.tree_descendants(id, key);
                for i in descendants {
                    let item = &self.nodes[&id].props.nav_controls.items[i];
                    if item.enabled {
                        if check {
                            selected.insert(item.id.clone());
                        } else {
                            selected.remove(&item.id);
                        }
                    }
                }
                let mut parent = self.nodes[&id].props.nav_controls.items[index]
                    .parent
                    .clone();
                while let Some(key) = parent {
                    let descendants = self.tree_descendants(id, &key);
                    let all = descendants
                        .iter()
                        .skip(1)
                        .filter(|i| self.nodes[&id].props.nav_controls.items[**i].enabled)
                        .all(|i| {
                            selected.contains(&self.nodes[&id].props.nav_controls.items[*i].id)
                        });
                    if all {
                        selected.insert(key.clone());
                    } else {
                        selected.remove(&key);
                    }
                    parent = self.nodes[&id].props.nav_controls.items
                        [self.nodes[&id].nav_controls.tree_indices[&key]]
                        .parent
                        .clone();
                }
            }
        }
        let keys = self.nodes[&id]
            .props
            .nav_controls
            .items
            .iter()
            .filter(|i| selected.contains(&i.id))
            .map(|i| i.id.clone())
            .collect::<Vec<_>>();
        let n = self.nodes.get_mut(&id).unwrap();
        n.props.selected_keys = Arc::new(keys);
        n.collection.selected = selected.clone();
        n.collection.selected_source = n.props.selected_keys.clone();
        n.collection.focus = Some(key.into());
        if invoke {
            self.emit_navigation(id, EventKind::ItemInvoked, index as i32, "invoke");
        }
        if selected != old {
            self.emit_navigation(id, EventKind::SelectionChanged, index as i32, "selection");
        }
        self.sync_navigation_tree(id);
        self.sync_collections();
        Ok(())
    }
    pub(in crate::scene) fn tree_reparent(
        &mut self,
        id: u32,
        keys: &[String],
        parent: Option<&str>,
        before: Option<&str>,
    ) -> Result<(), String> {
        let n = self.get(id)?;
        if n.kind != NodeKind::TreeView {
            return Err("Tree reparent requires TreeView".into());
        }
        let c = &n.nav_controls;
        let source = n.props.nav_controls.items.clone();
        let moving = keys.iter().cloned().collect::<HashSet<_>>();
        if moving.len() != keys.len() || moving.iter().any(|k| !c.tree_indices.contains_key(k)) {
            return Err("Unknown or duplicate tree drag roots".into());
        }
        if parent.is_some_and(|p| !c.tree_indices.contains_key(p)) {
            return Err("Unknown destination parent".into());
        }
        let mut next = parent;
        while let Some(key) = next {
            if moving.contains(key) {
                return Err("A TreeView node cannot move into itself or its descendant".into());
            }
            next = source[c.tree_indices[key]].parent.as_deref();
        }
        let roots = keys
            .iter()
            .filter(|key| {
                let mut at = source[c.tree_indices[*key]].parent.as_deref();
                while let Some(p) = at {
                    if moving.contains(p) {
                        return false;
                    }
                    at = source[c.tree_indices[p]].parent.as_deref();
                }
                true
            })
            .cloned()
            .collect::<HashSet<_>>();
        if let Some(before) = before {
            if !c.tree_indices.contains_key(before)
                || source[c.tree_indices[before]].parent.as_deref() != parent
            {
                return Err("Tree insertion sibling must belong to the destination parent".into());
            }
        }
        let mut block = HashSet::new();
        for root in &roots {
            for i in self.tree_descendants(id, root) {
                block.insert(source[i].id.clone());
            }
        }
        let mut ordered = vec![];
        // Source order is stable, independent of selection/hash iteration order.
        for item in source.iter().filter(|i| roots.contains(&i.id)) {
            for i in self.tree_descendants(id, &item.id) {
                let mut item = source[i].clone();
                if roots.contains(&item.id) {
                    item.parent = parent.map(str::to_owned);
                }
                ordered.push(item);
            }
        }
        let mut remaining = source
            .iter()
            .filter(|i| !block.contains(&i.id))
            .cloned()
            .collect::<Vec<_>>();
        let insert = if let Some(before) = before {
            remaining
                .iter()
                .position(|i| i.id == before)
                .unwrap_or(remaining.len())
        } else if let Some(parent) = parent {
            let descendant = self
                .tree_descendants(id, parent)
                .into_iter()
                .map(|i| source[i].id.as_str())
                .collect::<HashSet<_>>();
            remaining
                .iter()
                .rposition(|i| descendant.contains(i.id.as_str()))
                .map(|i| i + 1)
                .unwrap_or(remaining.len())
        } else {
            remaining.len()
        };
        remaining.splice(insert..insert, ordered);
        let navigation = json!({"action":"itemsChanged","order":remaining.iter().map(|i|&i.id).collect::<Vec<_>>(),"parents":remaining.iter().map(|i|(&i.id,&i.parent)).collect::<HashMap<_,_>>()});
        self.nodes.get_mut(&id).unwrap().props.nav_controls.items = Arc::new(remaining);
        self.sync_navigation_controls();
        self.sync_collections();
        self.emit(id, EventKind::ItemsChanged);
        self.events.last_mut().unwrap().payload = Some(json!({"navigation":navigation}));
        self.invalidate(id, true);
        Ok(())
    }
    pub(in crate::scene) fn navigation_tree_drop(
        &mut self,
        target: u32,
        source: Option<u32>,
        keys: &[String],
        index: usize,
        point: [f64; 2],
        operation: DataPackageOperation,
    ) -> Result<Option<bool>, String> {
        if self.nodes[&target].kind != NodeKind::TreeView {
            return Ok(source
                .filter(|s| {
                    self.nodes
                        .get(s)
                        .is_some_and(|n| n.kind == NodeKind::TreeView)
                })
                .map(|_| false));
        }
        // A generic list payload does not contain a hierarchy. Reject rather
        // than silently discarding hidden children or guessing parent identity.
        if source != Some(target) || operation != DataPackageOperation::Move {
            return Ok(Some(false));
        }
        let n = &self.nodes[&target];
        let offset = n.scroll.offsets(self.time)[1];
        let (_, y) = n
            .world
            .inverse()
            .unwrap_or_default()
            .point(point[0], point[1]);
        let row = n.collection.realized.iter().find_map(|(key, id)| {
            let rect = self.nodes[id].rect;
            (y + offset >= rect.y && y + offset < rect.y + rect.height)
                .then(|| (key.clone(), (y + offset - rect.y) / rect.height.max(1.)))
        });
        let (parent, before) = if let Some((key, inside)) = row {
            if (0.25..0.75).contains(&inside) {
                (Some(key), None)
            } else {
                let before = n.props.collection_items.get(index).map(|i| i.id.clone());
                let parent = before.as_ref().and_then(|key| {
                    n.props.nav_controls.items[n.nav_controls.tree_indices[key]]
                        .parent
                        .clone()
                });
                (parent, before)
            }
        } else {
            (None, None)
        };
        match self.tree_reparent(target, keys, parent.as_deref(), before.as_deref()) {
            Ok(()) => Ok(Some(true)),
            Err(_) => Ok(Some(false)),
        }
    }
}
