//! Source-owned collection mutation and drag negotiation. The host only brokers
//! platform DataTransfer payloads; insertion geometry and commits are Rust state.
use super::*;
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectionEvent {
    pub position: Option<[f64; 2]>,
    pub source: Option<u32>,
    pub keys: Vec<String>,
    pub order: Vec<String>,
    pub index: usize,
    pub operation: DataPackageOperation,
    pub reason: CollectionChangeReason,
    pub count: usize,
}
#[derive(Clone)]
struct Offer {
    source: Option<u32>,
    items: Vec<CollectionData>,
    index: usize,
    operation: DataPackageOperation,
    point: [f64; 2],
}
#[derive(Clone)]
enum Pending {
    Start(Vec<String>),
    Over(Offer),
    Drop(Offer),
}
#[derive(Default)]
pub(super) struct DragState {
    pub active: bool,
    pub keys: Vec<String>,
    pub origin: Option<String>,
    offer: Option<Offer>,
    pending: Option<(u32, Pending)>,
    serial: u32,
    pub insertion: Option<usize>,
    pub operation: DataPackageOperation,
    pub last_tick: f64,
    pub changed_at: f64,
    pub preview: Option<usize>,
    pub committed: bool,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DragSnapshot {
    pub active: bool,
    pub keys: Vec<String>,
    pub insertion_index: Option<usize>,
    pub operation: DataPackageOperation,
    pub committed: bool,
    pub preview_index: Option<usize>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectionHostResponse {
    pub drag: Option<DragSnapshot>,
    pub events: Vec<SceneEvent>,
}
impl DragState {
    pub(super) fn hovering(&self) -> bool {
        self.offer
            .as_ref()
            .is_some_and(|o| o.operation != DataPackageOperation::None)
    }
}
impl Scene {
    /// Native drag negotiation must not paint or rebuild the accessibility DOM
    /// inside a platform drag/drop callback. Drain only collection notifications;
    /// normal layout and other events remain on the scheduled scene frame.
    pub fn collection_host_input(
        &mut self,
        owner: u32,
        input: Option<Input>,
        time: f64,
    ) -> Result<CollectionHostResponse, String> {
        if !self.nodes.get(&owner).is_some_and(|n| is_view(n.kind)) {
            return if input.is_none() {
                Ok(CollectionHostResponse {
                    drag: None,
                    events: vec![],
                })
            } else {
                Err("invalid collection host target".into())
            };
        }
        if let Some(input) = input {
            self.input(input, time)?;
        }
        self.sync_collections();
        let (mut events, mut remaining) = (vec![], vec![]);
        for event in std::mem::take(&mut self.events) {
            if event.collection.is_some() {
                events.push(event);
            } else {
                remaining.push(event);
            }
        }
        self.events = remaining;
        Ok(CollectionHostResponse {
            drag: Some(self.collection_drag_snapshot(owner)),
            events,
        })
    }
    pub(super) fn collection_drag_snapshot(&self, id: u32) -> DragSnapshot {
        let d = &self.nodes[&id].collection.drag;
        DragSnapshot {
            active: d.active,
            keys: d.keys.clone(),
            insertion_index: d.insertion,
            operation: d.operation,
            committed: d.committed,
            preview_index: d.preview,
        }
    }
    fn emit_collection(&mut self, id: u32, kind: EventKind, data: CollectionEvent) {
        self.emit(id, kind);
        if kind==EventKind::ContextRequested {
            if let Some((_,surface))=self.context_flyout_owner(id) {
                // CollectionEvent.position is expressed in the realized item's
                // coordinates, matching the public item-container contract.
                let target=data.keys.first().and_then(|key|self.nodes[&id].collection.realized.get(key)).copied().unwrap_or(id);
                let popup=self.nodes.get_mut(&surface).unwrap();
                popup.props.placement_target=Some(target);
                popup.props.placement_position=data.position;
            }
        }
        self.events.last_mut().unwrap().collection = Some(data);
    }
    fn collection_change_event(
        &mut self,
        id: u32,
        reason: CollectionChangeReason,
        source: Option<u32>,
        keys: Vec<String>,
        index: usize,
        operation: DataPackageOperation,
    ) {
        let order = self.nodes[&id]
            .props
            .collection_items
            .iter()
            .map(|d| d.id.clone())
            .collect();
        self.emit_collection(
            id,
            EventKind::ItemsChanged,
            CollectionEvent {
                source,
                keys,
                order,
                index,
                operation,
                reason,
                position: None,
                count: 0,
            },
        );
    }
    fn drag_request(&mut self, id: u32, pending: Pending, kind: EventKind) {
        let data = match &pending {
            Pending::Start(keys) => CollectionEvent {
                source: Some(id),
                keys: keys.clone(),
                order: vec![],
                index: 0,
                operation: DataPackageOperation::Move,
                reason: CollectionChangeReason::Reorder,
                position: None,
                count: keys.len(),
            },
            Pending::Over(o) | Pending::Drop(o) => CollectionEvent {
                source: o.source,
                keys: o.items.iter().map(|d| d.id.clone()).collect(),
                order: vec![],
                index: o.index,
                operation: o.operation,
                reason: if o.source == Some(id) {
                    CollectionChangeReason::Reorder
                } else if o.operation == DataPackageOperation::Copy {
                    CollectionChangeReason::Copy
                } else {
                    CollectionChangeReason::Move
                },
                position: None,
                count: o.items.len(),
            },
        };
        let d = &mut self.nodes.get_mut(&id).unwrap().collection.drag;
        d.serial = d.serial.wrapping_add(1);
        let request = d.serial;
        d.pending = Some((request, pending));
        self.emit_collection(id, kind, data);
        self.events.last_mut().unwrap().request_id = Some(request);
    }
    pub(super) fn collection_insertion(&self, id: u32, x: f64, y: f64) -> usize {
        let n = &self.nodes[&id];
        let len = n.props.collection_items.len();
        if len == 0 {
            return 0;
        }
        let world = n.world.multiply(n.scroll.matrix(self.time));
        let (mut x, y) = world.inverse().unwrap_or_default().point(x, y);
        let b = overlays::border_thickness(n.props.border_thickness, self.dpr);
        x -= n.props.padding[0] + b[0];
        let y = y - n.props.padding[1] - b[1];
        if self.effective_flow_direction(id) == FlowDirection::RightToLeft {
            x = n.scroll.extent[0].max(n.scroll.viewport[0]) - x;
        }
        let g = n.collection.geometry;
        let mut index;
        if n.collection.adaptive.enabled {
            let layout = &n.collection.adaptive;
            let main = if layout.horizontal { x } else { y };
            let band = layout.window(main, main).start;
            match layout.bands.get(band).map(|b| b.kind) {
                Some(adaptive::BandKind::Items { start, count }) => {
                    let cross = if layout.horizontal { y } else { x };
                    let slot = if g.stack {
                        0
                    } else {
                        (cross / g.cell[usize::from(layout.horizontal)])
                            .floor()
                            .max(0.) as usize
                    };
                    index = (start + slot.min(count.saturating_sub(1))).min(len - 1);
                }
                Some(adaptive::BandKind::Header(group)) => {
                    return n
                        .props
                        .collection_items
                        .iter()
                        .position(|d| {
                            d.group.as_deref() == Some(n.props.collection_groups[group].id.as_str())
                        })
                        .unwrap_or(len);
                }
                None => return len,
            }
        } else if g.stack {
            index = ((if g.horizontal {
                x / g.cell[0]
            } else {
                y / g.cell[1]
            })
            .floor()
            .max(0.) as usize)
                .min(len - 1);
        } else {
            let (a, b) = if g.horizontal {
                (
                    (x / g.cell[0]).floor().max(0.) as usize,
                    (y / g.cell[1]).floor().max(0.) as usize,
                )
            } else {
                (
                    (y / g.cell[1]).floor().max(0.) as usize,
                    (x / g.cell[0]).floor().max(0.) as usize,
                )
            };
            index = (b * g.per_line + a.min(g.per_line.saturating_sub(1))).min(len - 1);
        }
        let r = self.collection_item_rect(id, index, n.scroll.viewport[0]);
        let after = if g.stack && !g.horizontal {
            y > r.y + r.height / 2.
        } else if g.stack || g.horizontal {
            x > r.x + r.width / 2.
        } else {
            y > r.y + r.height / 2.
        };
        if after {
            index += 1;
        }
        index.min(len)
    }
    fn collection_apply_drop(&mut self, target: u32, offer: Offer) -> Result<(), String> {
        if !self.nodes.contains_key(&target)
            || !self.nodes[&target].enabled
            || !self.nodes[&target].props.allow_drop
            || offer.operation == DataPackageOperation::None
        {
            return Ok(());
        }
        let same = offer.source == Some(target);
        if same && offer.operation != DataPackageOperation::Move {
            return Ok(());
        }
        if same
            && (!self.nodes[&target].props.can_reorder_items
                || !self.nodes[&target].props.collection_groups.is_empty())
        {
            return Ok(());
        }
        if offer.operation == DataPackageOperation::Link {
            return Ok(());
        }
        let keys = offer.items.iter().map(|d| d.id.clone()).collect::<Vec<_>>();
        if let Some(committed)=self.navigation_tree_drop(target,offer.source,&keys,offer.index,offer.point,offer.operation)? {
            let drag=&mut self.nodes.get_mut(&target).unwrap().collection.drag;
            drag.committed=committed;drag.operation=if committed{offer.operation}else{DataPackageOperation::None};
            drag.offer=None;drag.pending=None;drag.insertion=None;drag.preview=None;
            return Ok(());
        }
        let keyset = keys.iter().collect::<HashSet<_>>();
        if let Some(source) = offer.source {
            let Some(n) = self.nodes.get(&source) else {
                return Ok(());
            };
            if !n.enabled
                || keys
                    .iter()
                    .any(|key| !n.collection.indices.contains_key(key))
            {
                return Ok(());
            }
        }
        let old = self.nodes[&target].props.collection_items.clone();
        let index = offer.index.min(old.len());
        if !same
            && offer
                .items
                .iter()
                .any(|item| old.iter().any(|old| old.id == item.id))
        {
            return Err("drop would duplicate a stable item ID".into());
        }
        let before = if same {
            old[..index]
                .iter()
                .filter(|d| keyset.contains(&d.id))
                .count()
        } else {
            0
        };
        let mut items = old
            .iter()
            .filter(|d| !same || !keyset.contains(&d.id))
            .cloned()
            .collect::<Vec<_>>();
        let insertion = index.saturating_sub(before).min(items.len());
        let group = items
            .get(insertion)
            .or_else(|| items.last())
            .and_then(|d| d.group.clone())
            .or_else(|| {
                self.nodes[&target]
                    .props
                    .collection_groups
                    .first()
                    .map(|g| g.id.clone())
            });
        let mut incoming = if let Some(source) = offer.source {
            offer
                .items
                .iter()
                .map(|item| {
                    self.nodes[&source].props.collection_items
                        [self.nodes[&source].collection.indices[&item.id]]
                        .clone()
                })
                .collect::<Vec<_>>()
        } else {
            offer.items.clone()
        };
        for item in &mut incoming {
            item.group = group.clone();
        }
        items.splice(insertion..insertion, incoming);
        let mut updates = vec![Update {
            id: target,
            patch: serde_json::json!({"collectionItems":items}),
        }];
        if offer.operation == DataPackageOperation::Move {
            if let Some(source) = offer.source.filter(|s| *s != target) {
                let remaining = self.nodes[&source]
                    .props
                    .collection_items
                    .iter()
                    .filter(|d| !keyset.contains(&d.id))
                    .cloned()
                    .collect::<Vec<_>>();
                updates.push(Update {
                    id: source,
                    patch: serde_json::json!({"collectionItems":remaining}),
                });
            }
        }
        self.update(updates)?;
        let reason = if same {
            CollectionChangeReason::Reorder
        } else if offer.operation == DataPackageOperation::Copy {
            CollectionChangeReason::Copy
        } else {
            CollectionChangeReason::Move
        };
        self.collection_change_event(
            target,
            reason,
            offer.source,
            keys.clone(),
            insertion,
            offer.operation,
        );
        if offer.operation == DataPackageOperation::Move {
            if let Some(source) = offer.source.filter(|s| *s != target) {
                self.collection_change_event(
                    source,
                    CollectionChangeReason::Move,
                    Some(source),
                    keys.clone(),
                    insertion,
                    offer.operation,
                );
            }
        }
        if let Some(source) = offer.source {
            if let Some(n) = self.nodes.get_mut(&source) {
                n.collection.drag.operation = offer.operation;
            }
        }
        self.nodes
            .get_mut(&target)
            .unwrap()
            .collection
            .drag
            .committed = true;
        self.nodes.get_mut(&target).unwrap().collection.drag.preview = None;
        self.nodes
            .get_mut(&target)
            .unwrap()
            .collection
            .drag
            .insertion = None;
        self.nodes.get_mut(&target).unwrap().collection.drag.offer = None;
        self.invalidate(target, true);
        Ok(())
    }
    pub(super) fn advanced_collection_input(&mut self, input: &Input) -> Result<bool, String> {
        match input {
            Input::CollectionRestore { id, key, offset } => {
                if !offset.is_finite() {
                    return Err("invalid collection anchor offset".into());
                }
                let n = self.get(*id)?;
                if !is_view(n.kind) {
                    return Err("not a collection".into());
                }
                let axis = usize::from(if n.collection.geometry.stack {
                    !n.collection.geometry.horizontal
                } else {
                    n.collection.geometry.horizontal
                });
                self.nodes
                    .get_mut(id)
                    .unwrap()
                    .collection
                    .pending_scroll_anchor = Some((key.clone(), *offset, axis, false));
                self.restore_collection_anchor(*id);
            }
            Input::CollectionReorder { id, keys, index } => {
                let n = self.get(*id)?;
                if !is_view(n.kind) {
                    return Err("not a collection".into());
                }
                let items = keys
                    .iter()
                    .map(|key| {
                        n.props
                            .collection_items
                            .iter()
                            .find(|d| &d.id == key)
                            .cloned()
                            .ok_or("unknown reorder key")
                    })
                    .collect::<Result<Vec<_>, _>>()?;
                if items.len() != keys.iter().collect::<HashSet<_>>().len() {
                    return Err("duplicate reorder key".into());
                }
                let enabled = n.props.can_reorder_items;
                let allow = n.props.allow_drop;
                self.nodes.get_mut(id).unwrap().props.can_reorder_items = true;
                self.nodes.get_mut(id).unwrap().props.allow_drop = true;
                let result = self.collection_apply_drop(
                    *id,
                    Offer {
                        source: Some(*id),
                        items,
                        index: *index,
                        operation: DataPackageOperation::Move,
                        point: [0.; 2],
                    },
                );
                if let Some(n) = self.nodes.get_mut(id) {
                    n.props.can_reorder_items = enabled;
                    n.props.allow_drop = allow;
                }
                result?;
            }
            Input::CollectionRemove { id, keys } => {
                let n = self.get(*id)?;
                if !is_view(n.kind) {
                    return Err("not a collection".into());
                }
                let items = n
                    .props
                    .collection_items
                    .iter()
                    .filter(|d| !keys.contains(&d.id))
                    .cloned()
                    .collect::<Vec<_>>();
                self.update(vec![Update {
                    id: *id,
                    patch: serde_json::json!({"collectionItems":items}),
                }])?;
                self.collection_change_event(
                    *id,
                    CollectionChangeReason::Remove,
                    Some(*id),
                    keys.clone(),
                    0,
                    DataPackageOperation::Move,
                );
            }
            Input::CollectionDragStart { id, index } => {
                let n = self.get(*id)?;
                if !is_view(n.kind)
                    || !n.enabled
                    || !(n.props.can_drag_items
                        || n.props.can_reorder_items && n.props.collection_groups.is_empty())
                    || *index >= n.props.collection_items.len()
                    || !n.props.collection_items[*index].enabled
                {
                    return Ok(true);
                }
                let key = n.props.collection_items[*index].id.clone();
                let origin = key.clone();
                let keys = if n.collection.selected.contains(&key) {
                    n.props
                        .collection_items
                        .iter()
                        .filter(|d| d.enabled && n.collection.selected.contains(&d.id))
                        .map(|d| d.id.clone())
                        .collect()
                } else {
                    vec![key]
                };
                self.captured = None;
                self.nodes.get_mut(id).unwrap().collection.pressed = None;
                self.nodes.get_mut(id).unwrap().collection.drag.origin = Some(origin);
                self.drag_request(*id, Pending::Start(keys), EventKind::DragItemsStarting);
            }
            Input::CollectionDragOver {
                id,
                source,
                items,
                x,
                y,
                operation,
            } => {
                let n = self.get(*id)?;
                if !is_view(n.kind) || !n.enabled || !n.props.allow_drop {
                    return Ok(true);
                }
                if *source == Some(*id)
                    && (!n.props.can_reorder_items || !n.props.collection_groups.is_empty())
                {
                    return Ok(true);
                }
                if items.is_empty()
                    || items.len() > 100000
                    || items.iter().any(|d| d.id.is_empty() || !d.enabled)
                    || items.iter().map(|d| &d.id).collect::<HashSet<_>>().len() != items.len()
                {
                    return Ok(true);
                }
                let offer = Offer {
                    source: *source,
                    items: items.clone(),
                    index: self.collection_insertion(*id, *x, *y),
                    operation: *operation,
                    point: [*x, *y],
                };
                self.drag_request(*id, Pending::Over(offer), EventKind::DragOver);
            }
            Input::CollectionDrop { id } => {
                let n = self.get(*id)?;
                if let Some(offer) = n.collection.drag.offer.clone() {
                    self.drag_request(*id, Pending::Drop(offer), EventKind::Drop);
                }
            }
            Input::CollectionDragResolve {
                id,
                request,
                cancel,
                operation,
            } => {
                if self
                    .nodes
                    .get(id)
                    .and_then(|n| n.collection.drag.pending.as_ref())
                    .is_none_or(|(serial, _)| serial != request)
                {
                    return Ok(true);
                }
                let pending = self
                    .nodes
                    .get_mut(id)
                    .and_then(|n| n.collection.drag.pending.take());
                if let Some((serial, pending)) = pending {
                    if serial != *request {
                        return Ok(true);
                    }
                    match pending {
                        Pending::Start(keys) => {
                            let d = &mut self.nodes.get_mut(id).unwrap().collection.drag;
                            d.operation = DataPackageOperation::None;
                            d.active = !*cancel;
                            d.keys = if *cancel { vec![] } else { keys };
                        }
                        Pending::Over(mut offer) => {
                            let d = &mut self.nodes.get_mut(id).unwrap().collection.drag;
                            d.committed = false;
                            offer.operation = if *cancel {
                                DataPackageOperation::None
                            } else {
                                *operation
                            };
                            if d.insertion != Some(offer.index) {
                                d.changed_at = self.time;
                                d.last_tick = self.time;
                            }
                            d.operation = offer.operation;
                            d.insertion = (offer.operation != DataPackageOperation::None)
                                .then_some(offer.index);
                            d.offer = Some(offer);
                        }
                        Pending::Drop(mut offer) => {
                            if !*cancel {
                                offer.operation = *operation;
                                self.collection_apply_drop(*id, offer)?;
                            }
                            let d = &mut self.nodes.get_mut(id).unwrap().collection.drag;
                            d.offer = None;
                            d.insertion = None;
                            d.preview = None;
                        }
                    }
                }
            }
            Input::CollectionDragLeave { id } => {
                let n = self.nodes.get_mut(id).ok_or("unknown collection")?;
                n.collection.drag.offer = None;
                n.collection.drag.pending = None;
                n.collection.drag.insertion = None;
                n.collection.drag.preview = None;
                n.collection.drag.operation = DataPackageOperation::None;
            }
            Input::CollectionDragEnd { id, operation } => {
                let n = self.get(*id)?;
                let keys = n.collection.drag.keys.clone();
                let operation = *operation;
                self.nodes.get_mut(id).unwrap().collection.drag = Default::default();
                self.emit_collection(
                    *id,
                    EventKind::DragItemsCompleted,
                    CollectionEvent {
                        source: Some(*id),
                        keys,
                        order: vec![],
                        index: 0,
                        operation,
                        reason: CollectionChangeReason::Move,
                        position: None,
                        count: 0,
                    },
                );
            }
            Input::CollectionContext { id, index, x, y } => {
                let n = self.get(*id)?;
                if *index < n.props.collection_items.len() {
                    let key = n.props.collection_items[*index].id.clone();
                    let position = n
                        .collection
                        .realized
                        .get(&key)
                        .map(|child| {
                            self.nodes[child]
                                .world
                                .inverse()
                                .unwrap_or_default()
                                .point(*x, *y)
                        })
                        .map(|(x, y)| [x, y]);
                    self.emit_collection(
                        *id,
                        EventKind::ContextRequested,
                        CollectionEvent {
                            source: Some(*id),
                            keys: vec![key],
                            order: vec![],
                            index: *index,
                            operation: DataPackageOperation::None,
                            reason: CollectionChangeReason::Insert,
                            position,
                            count: 1,
                        },
                    );
                }
            }
            _ => return Ok(false),
        }
        self.invalidate(self.root, false);
        Ok(true)
    }
    pub(super) fn collection_drag_rect(&self, id: u32, index: usize, rect: Rect) -> Rect {
        let n = &self.nodes[&id];
        let d = &n.collection.drag;
        let Some(gap) = d.preview else {
            return rect;
        };
        let Some(offer) = &d.offer else {
            return rect;
        };
        if !n.props.can_reorder_items || !n.props.collection_groups.is_empty() {
            return rect;
        }
        if offer.source != Some(id) {
            if index < gap {
                return rect;
            }
            // Native LiveReorderHelper uses a virtual source at Items.Count.
            // A variable stack estimates the incoming slot from its measured cell.
            let g = n.collection.geometry;
            if g.stack {
                let mut rect = rect;
                if g.horizontal {
                    rect.x += g.cell[0];
                } else {
                    rect.y += g.cell[1];
                }
                return rect;
            }
            return g.rect(index + 1, n.scroll.viewport[0]);
        }
        let moving = offer
            .items
            .iter()
            .map(|i| i.id.as_str())
            .collect::<HashSet<_>>();
        let key = &n.props.collection_items[index].id;
        if moving.contains(key.as_str()) {
            return rect;
        }
        let before = n.props.collection_items[..gap.min(n.props.collection_items.len())]
            .iter()
            .filter(|i| moving.contains(i.id.as_str()))
            .count();
        let rank = n.props.collection_items[..index]
            .iter()
            .filter(|i| !moving.contains(i.id.as_str()))
            .count();
        let insert = gap.saturating_sub(before);
        let destination = rank + if rank >= insert { moving.len() } else { 0 };
        self.collection_item_rect(id, destination, n.scroll.viewport[0])
    }
    pub(in crate::scene) fn collection_drag_tick(&mut self) {
        for n in self.nodes.values_mut() {
            if n.collection
                .source_transition
                .as_ref()
                .is_some_and(|v| self.reduced_motion || v.end <= self.time)
            {
                n.collection.source_transition = None;
            }
        }
        let ids = self
            .nodes
            .values()
            .filter(|n| is_view(n.kind) && n.collection.drag.offer.is_some())
            .map(|n| n.id)
            .collect::<Vec<_>>();
        for id in ids {
            let offer = self.nodes[&id].collection.drag.offer.clone().unwrap();
            if offer.operation == DataPackageOperation::None {
                continue;
            }
            let n = &self.nodes[&id];
            let delay = if n.kind == NodeKind::GridView {
                300.
            } else {
                200.
            };
            let now = self.time;
            if n.props.can_reorder_items
                && n.props.collection_groups.is_empty()
                && now - n.collection.drag.changed_at >= delay
            {
                let insertion = n.collection.drag.insertion;
                self.nodes.get_mut(&id).unwrap().collection.drag.preview = insertion;
            }
            let n = &self.nodes[&id];
            let axis = usize::from(if n.collection.geometry.stack {
                !n.collection.geometry.horizontal
            } else {
                n.collection.geometry.horizontal
            });
            let (local_x, local_y) = n
                .world
                .inverse()
                .unwrap_or_default()
                .point(offer.point[0], offer.point[1]);
            let b = overlays::border_thickness(n.props.border_thickness, self.dpr);
            let local = [
                local_x - n.props.padding[0] - b[0],
                local_y - n.props.padding[1] - b[1],
            ][axis];
            let viewport = n.scroll.viewport[axis];
            let edge = (100. / self.dpr).min(viewport / 2.);
            let factor = if local < edge {
                -((edge - local) / edge).clamp(0., 1.)
            } else if local > viewport - edge {
                ((local - viewport + edge) / edge).clamp(0., 1.)
            } else {
                0.
            };
            let delta = (now - n.collection.drag.last_tick).clamp(0., 50.);
            let since = now - n.collection.drag.changed_at;
            self.nodes.get_mut(&id).unwrap().collection.drag.last_tick = now;
            if factor != 0. && since >= 50. {
                let old = self.nodes[&id].scroll.offsets(now);
                let mut next = old;
                next[axis] +=
                    factor.signum() * (150. + 1350. * factor.abs()) / self.dpr * delta / 1000.;
                self.scroll_change(id, Some(next[0]), Some(next[1]), None, false)
                    .ok();
                let index = self.collection_insertion(id, offer.point[0], offer.point[1]);
                let d = &mut self.nodes.get_mut(&id).unwrap().collection.drag;
                d.insertion = Some(index);
                if let Some(o) = &mut d.offer {
                    o.index = index;
                }
            }
            self.invalidate(id, true);
        }
    }
    pub(super) fn collection_loading(&mut self, id: u32) {
        let n = &self.nodes[&id];
        if !n.props.has_more_items || n.props.is_loading || !n.enabled {
            return;
        }
        let g = n.collection.geometry;
        let axis = usize::from(if g.stack { !g.horizontal } else { g.horizontal });
        let near = n.scroll.offsets(self.time)[axis]
            + n.scroll.viewport[axis] * (1. + n.props.incremental_loading_threshold)
            >= n.scroll.extent[axis] - 1.;
        let key = (n.props.collection_items.len(), false);
        if near && n.collection.loading_request != Some(key) {
            let count = ((n.scroll.viewport[axis] / g.cell[axis].max(1.)).ceil() as usize
                * g.per_line.max(1))
            .max(1);
            self.nodes.get_mut(&id).unwrap().collection.loading_request = Some(key);
            self.emit_collection(
                id,
                EventKind::IncrementalLoadRequested,
                CollectionEvent {
                    source: None,
                    keys: vec![],
                    order: vec![],
                    index: key.0,
                    operation: DataPackageOperation::None,
                    reason: CollectionChangeReason::Insert,
                    position: None,
                    count,
                },
            );
        }
    }
}

