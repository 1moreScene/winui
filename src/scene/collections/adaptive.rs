//! Prefix-sum virtual layout. Measured variable item sizes remain keyed by stable
//! identity; offscreen bands are estimates, not eagerly instantiated controls.
use super::*;
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectionScrollPosition {
    pub key: String,
    pub offset: f64,
}
#[derive(Clone, Copy)]
pub(super) enum BandKind {
    Header(usize),
    Items { start: usize, count: usize },
}
pub(super) struct Band {
    pub kind: BandKind,
    pub size: f64,
}
#[derive(Default)]
struct Prefix {
    values: Vec<f64>,
    tree: Vec<f64>,
}
impl Prefix {
    fn reset(&mut self, values: Vec<f64>) {
        self.tree = vec![0.; values.len() + 1];
        self.values = vec![0.; values.len()];
        for (i, v) in values.into_iter().enumerate() {
            self.set(i, v);
        }
    }
    fn set(&mut self, index: usize, value: f64) {
        let delta = value - self.values[index];
        self.values[index] = value;
        let mut i = index + 1;
        while i < self.tree.len() {
            self.tree[i] += delta;
            i += i & (!i + 1);
        }
    }
    fn sum(&self, index: usize) -> f64 {
        let mut i = index.min(self.values.len());
        let mut total = 0.;
        while i > 0 {
            total += self.tree[i];
            i &= i - 1;
        }
        total
    }
    fn find(&self, position: f64) -> usize {
        let mut index = 0;
        let mut total = 0.;
        let mut bit = self.tree.len().next_power_of_two();
        while bit > 0 {
            let next = index + bit;
            if next < self.tree.len() && total + self.tree[next] <= position {
                index = next;
                total += self.tree[next];
            }
            bit >>= 1;
        }
        index.min(self.values.len().saturating_sub(1))
    }
}
#[derive(Default)]
pub(super) struct AdaptiveLayout {
    pub enabled: bool,
    pub dirty: bool,
    pub horizontal: bool,
    pub bands: Vec<Band>,
    pub header_bands: Vec<(usize, usize)>,
    pub item_band: Vec<usize>,
    pub item_cross: Vec<usize>,
    pub group_band: Vec<Option<usize>>,
    pub sizes: HashMap<String, f64>,
    pub header_sizes: HashMap<String, f64>,
    prefix: Prefix,
    signature: Option<([f64; 2], usize, bool, bool, f64)>,
    groups: Arc<Vec<CollectionGroup>>,
}
impl AdaptiveLayout {
    pub fn ensure(&mut self, p: &NodeProperties, g: Geometry, cross: f64) {
        self.enabled = !p.collection_groups.is_empty()
            || (g.stack
                && p.has_item_template
                && if g.horizontal {
                    p.item_width.is_none()
                } else {
                    p.item_height.is_none()
                });
        if !self.enabled {
            return;
        }
        let horizontal = if g.stack { g.horizontal } else { !g.horizontal };
        let sig = (g.cell, g.per_line, g.stack, horizontal, cross);
        if !self.dirty
            && self.signature == Some(sig)
            && Arc::ptr_eq(&self.groups, &p.collection_groups)
        {
            return;
        }
        if self.signature.is_some_and(|s| s.4 != cross) {
            self.sizes.clear();
            self.header_sizes.clear();
        }
        self.horizontal = horizontal;
        self.signature = Some(sig);
        self.groups = p.collection_groups.clone();
        self.dirty = false;
        self.bands.clear();
        self.header_bands.clear();
        self.item_band = vec![0; g.count];
        self.item_cross = vec![0; g.count];
        self.group_band = vec![None; p.collection_groups.len()];
        let mut start = 0;
        if p.collection_groups.is_empty() {
            self.add_items(p, g, 0, g.count);
        } else {
            for (group, descriptor) in p.collection_groups.iter().enumerate() {
                let end = start
                    + p.collection_items[start..]
                        .iter()
                        .take_while(|item| item.group.as_deref() == Some(descriptor.id.as_str()))
                        .count();
                if !p.hides_empty_groups || end > start {
                    self.group_band[group] = Some(self.bands.len());
                    self.header_bands.push((self.bands.len(), group));
                    self.bands.push(Band {
                        kind: BandKind::Header(group),
                        size: self
                            .header_sizes
                            .get(&descriptor.id)
                            .copied()
                            .unwrap_or(p.group_header_height.map(|h| h + 4.).unwrap_or(59.)),
                    });
                }
                self.add_items(p, g, start, end);
                start = end;
            }
        }
        self.prefix
            .reset(self.bands.iter().map(|b| b.size).collect());
    }
    fn add_items(&mut self, p: &NodeProperties, g: Geometry, start: usize, end: usize) {
        let per = if g.stack { 1 } else { g.per_line.max(1) };
        let axis = usize::from(!self.horizontal);
        for first in (start..end).step_by(per) {
            let count = (end - first).min(per);
            let size = if g.stack {
                self.sizes
                    .get(&p.collection_items[first].id)
                    .copied()
                    .unwrap_or(g.cell[axis])
            } else {
                g.cell[axis]
            };
            let band = self.bands.len();
            self.bands.push(Band {
                kind: BandKind::Items {
                    start: first,
                    count,
                },
                size: size.max(1.),
            });
            for i in first..first + count {
                self.item_band[i] = band;
                self.item_cross[i] = i - first;
            }
        }
    }
    pub fn total(&self) -> f64 {
        self.prefix.sum(self.bands.len())
    }
    pub fn position(&self, band: usize) -> f64 {
        self.prefix.sum(band)
    }
    pub fn window(&self, start: f64, end: f64) -> std::ops::Range<usize> {
        if self.bands.is_empty() {
            return 0..0;
        }
        self.prefix.find(start.max(0.))..(self.prefix.find(end.max(0.)) + 1).min(self.bands.len())
    }
    pub fn item_rect(&self, index: usize, g: Geometry, width: f64) -> Rect {
        let band = self.item_band[index];
        let main = self.position(band);
        let size = self.bands[band].size;
        let cross = if g.stack {
            0.
        } else {
            self.item_cross[index] as f64 * g.cell[usize::from(self.horizontal)]
        };
        let cross_size = if g.stack {
            width
        } else {
            g.cell[usize::from(self.horizontal)]
        };
        if self.horizontal {
            Rect::new(main, cross, size, cross_size)
        } else {
            Rect::new(cross, main, cross_size, size)
        }
    }
    pub fn measure_item(&mut self, key: &str, index: usize, size: f64, g: Geometry) -> bool {
        if !g.stack || !self.enabled || index >= self.item_band.len() {
            return false;
        }
        self.sizes.insert(key.into(), size);
        self.set_band(self.item_band[index], size)
    }
    pub fn measure_header(&mut self, key: &str, index: usize, size: f64) -> bool {
        self.header_sizes.insert(key.into(), size);
        self.group_band
            .get(index)
            .copied()
            .flatten()
            .is_some_and(|b| self.set_band(b, size))
    }
    fn set_band(&mut self, index: usize, size: f64) -> bool {
        let size = size.max(1.);
        if (self.bands[index].size - size).abs() < 1e-6 {
            return false;
        }
        self.bands[index].size = size;
        self.prefix.set(index, size);
        true
    }
}

impl Scene {
    fn collection_anchor_at(
        &self,
        id: u32,
        end: bool,
    ) -> Option<(CollectionScrollPosition, usize)> {
        let n = &self.nodes[&id];
        if n.props.collection_items.is_empty() {
            return None;
        }
        let g = n.collection.geometry;
        let axis = usize::from(if g.stack { !g.horizontal } else { g.horizontal });
        let offset = n.scroll.offsets(self.time)[axis];
        let point = offset
            + if end {
                n.scroll.viewport[axis] - 0.01
            } else {
                0.
            };
        let index = if n.collection.adaptive.enabled {
            let a = &n.collection.adaptive;
            let range = a.window(point, point);
            a.bands[range.start..]
                .iter()
                .find_map(|b| match b.kind {
                    BandKind::Items { start, count } => {
                        Some(if end { start + count - 1 } else { start })
                    }
                    _ => None,
                })
                .unwrap_or(n.props.collection_items.len() - 1)
        } else {
            ((point / g.cell[axis].max(1.)).floor().max(0.) as usize
                * if g.stack { 1 } else { g.per_line.max(1) })
            .min(n.props.collection_items.len() - 1)
        };
        let r = self.collection_item_rect(id, index, n.scroll.viewport[0]);
        Some((
            CollectionScrollPosition {
                key: n.props.collection_items[index].id.clone(),
                offset: offset - if axis == 0 { r.x } else { r.y },
            },
            axis,
        ))
    }
    pub(in crate::scene) fn collection_scroll_position(
        &self,
        id: u32,
    ) -> Option<CollectionScrollPosition> {
        self.collection_anchor_at(id, false).map(|(p, _)| p)
    }
    pub(in crate::scene) fn capture_collection_anchor(&mut self, id: u32, next: &NodeProperties) {
        let n = &self.nodes[&id];
        if !is_view(n.kind)
            || Arc::ptr_eq(&n.props.collection_items, &next.collection_items)
            || n.collection.geometry.count == 0
            || next.items_updating_scroll_mode == ItemsUpdatingScrollMode::KeepScrollOffset
        {
            return;
        }
        let last = next.items_updating_scroll_mode == ItemsUpdatingScrollMode::KeepLastItemInView;
        let Some((mut anchor, axis)) = self.collection_anchor_at(id, last) else {
            return;
        };
        let end =
            last && (n.scroll.offsets(self.time)[axis] - n.scroll.max(self.time)[axis]).abs() < 1.;
        if !next.collection_items.iter().any(|d| d.id == anchor.key) {
            let old_index = n.collection.indices.get(&anchor.key).copied().unwrap_or(0);
            if let Some(item) = next
                .collection_items
                .get(old_index.min(next.collection_items.len().saturating_sub(1)))
            {
                anchor.key = item.id.clone();
            } else {
                return;
            }
        }
        self.nodes
            .get_mut(&id)
            .unwrap()
            .collection
            .pending_scroll_anchor = Some((anchor.key, anchor.offset, axis, end));
    }
    pub(super) fn restore_collection_anchor(&mut self, id: u32) {
        let Some((key, relative, axis, end)) = self
            .nodes
            .get_mut(&id)
            .unwrap()
            .collection
            .pending_scroll_anchor
            .take()
        else {
            return;
        };
        let n = &self.nodes[&id];
        let Some(index) = n.collection.indices.get(&key).copied() else {
            return;
        };
        let r = self.collection_item_rect(id, index, n.scroll.viewport[0]);
        let mut offset = n.scroll.offsets(self.time);
        offset[axis] = if end {
            n.scroll.max(self.time)[axis]
        } else {
            (if axis == 0 { r.x } else { r.y }) + relative
        };
        self.scroll_change(id, Some(offset[0]), Some(offset[1]), None, false)
            .ok();
        self.nodes.get_mut(&id).unwrap().collection.layout_unsettled = true;
        self.invalidate(id, true);
    }
    pub(super) fn collection_sticky_group(&self, id: u32) -> Option<String> {
        let n = &self.nodes[&id];
        if !n.props.are_sticky_group_headers_enabled || !n.collection.adaptive.enabled {
            return None;
        }
        let layout = &n.collection.adaptive;
        let offset = n.scroll.offsets(self.time)[usize::from(!layout.horizontal)];
        let band = layout.window(offset, offset).start;
        let index = layout
            .header_bands
            .partition_point(|(b, _)| *b <= band)
            .checked_sub(1)?;
        let group = layout.header_bands[index].1;
        Some(n.props.collection_groups[group].id.clone())
    }
    fn prepare_collection_header(&mut self, owner: u32, index: usize) -> Option<u32> {
        let n = &self.nodes[&owner];
        let group = n.props.collection_groups[index].clone();
        let templated = n.props.has_group_header_template;
        if let Some(child) = n.collection.headers.get(&group.id).copied() {
            let header = self.nodes.get_mut(&child).unwrap();
            header.props.text = if templated {
                String::new()
            } else {
                group.header
            };
            header.props.collection_index = index;
            return Some(child);
        }
        let props = serde_json::json!({"collectionOwner":owner,"collectionKey":group.id,"collectionIndex":index,"text":if n.props.has_group_header_template{String::new()}else{group.header.clone()},"accessibleName":group.header,"fontFamily":n.props.font_family,"height":n.props.group_header_height});
        self.realizing_collection = Some(owner);
        let result = self.create(owner, NodeKind::CollectionHeader, props);
        self.realizing_collection = None;
        match result {
            Ok(child) => {
                self.nodes
                    .get_mut(&owner)
                    .unwrap()
                    .collection
                    .headers
                    .insert(group.id, child);
                self.nodes
                    .get_mut(&owner)
                    .unwrap()
                    .collection
                    .realization_dirty = true;
                Some(child)
            }
            Err(error) => {
                self.nodes
                    .get_mut(&owner)
                    .unwrap()
                    .collection
                    .realization_error = Some(error);
                None
            }
        }
    }
    pub(super) fn arrange_collection_headers(
        &mut self,
        owner: u32,
        inner: Rect,
        measure: &mut impl TextMeasurer,
    ) {
        let n = &self.nodes[&owner];
        let layout = &n.collection.adaptive;
        if !layout.enabled {
            let remove = n.collection.headers.values().copied().collect::<Vec<_>>();
            for child in remove {
                self.destroy(child).expect("live group header");
            }
            let n = self.nodes.get_mut(&owner).unwrap();
            if !n.collection.headers.is_empty() {
                n.collection.realization_dirty = true;
                n.collection.headers.clear();
            }
            return;
        }
        let axis = usize::from(!layout.horizontal);
        let offset = n.scroll.offsets(self.time)[axis];
        let viewport = n.scroll.viewport[axis];
        let cache = n.props.cache_length / 2.;
        let range = layout.window(
            (offset - viewport * cache).max(0.),
            offset + viewport * (1. + cache),
        );
        let sticky = self.collection_sticky_group(owner);
        let mut wanted = layout.bands[range]
            .iter()
            .filter_map(|b| match b.kind {
                adaptive::BandKind::Header(group) => Some(group),
                _ => None,
            })
            .collect::<BTreeSet<_>>();
        if let Some(key) = &sticky {
            if let Some(index) = n.props.collection_groups.iter().position(|g| &g.id == key) {
                wanted.insert(index);
            }
        }
        let keep = wanted
            .iter()
            .map(|i| n.props.collection_groups[*i].id.clone())
            .collect::<HashSet<_>>();
        let remove = n
            .collection
            .headers
            .iter()
            .filter(|(key, _)| !keep.contains(*key))
            .map(|(key, id)| (key.clone(), *id))
            .collect::<Vec<_>>();
        for (key, id) in remove {
            self.destroy(id).expect("live group header");
            self.nodes
                .get_mut(&owner)
                .unwrap()
                .collection
                .headers
                .remove(&key);
            self.nodes
                .get_mut(&owner)
                .unwrap()
                .collection
                .realization_dirty = true;
        }
        for index in wanted {
            let Some(child) = self.prepare_collection_header(owner, index) else {
                break;
            };
            let horizontal = self.nodes[&owner].collection.adaptive.horizontal;
            let available = if horizontal {
                [f64::INFINITY, inner.height]
            } else {
                [inner.width, f64::INFINITY]
            };
            let size = self.measure_collection_child(child, available, measure);
            let key = self.nodes[&owner].props.collection_groups[index].id.clone();
            let changed = self
                .nodes
                .get_mut(&owner)
                .unwrap()
                .collection
                .adaptive
                .measure_header(&key, index, size[axis]);
            if changed {
                self.nodes
                    .get_mut(&owner)
                    .unwrap()
                    .collection
                    .layout_unsettled = true;
            }
            let n = &self.nodes[&owner];
            let layout = &n.collection.adaptive;
            let band = layout.group_band[index].unwrap();
            let mut position = layout.position(band);
            let height = layout.bands[band].size;
            if sticky.as_ref() == Some(&key) {
                let next = layout
                    .header_bands
                    .iter()
                    .find(|(b, _)| *b > band)
                    .map(|(b, _)| layout.position(*b))
                    .unwrap_or(f64::INFINITY);
                position = position.max(offset).min(next - height);
            }
            let r = if horizontal {
                Rect::new(position, 0., height, inner.height)
            } else {
                Rect::new(0., position, inner.width, height)
            };
            let inherited = (n.theme, n.enabled, n.visible);
            let world = n.world.multiply(n.scroll.matrix(self.time));
            self.arrange_node(
                child,
                Rect::new(inner.x + r.x, inner.y + r.y, r.width, r.height),
                world,
                inherited,
                measure,
            );
        }
    }
    pub(in crate::scene) fn collection_item_rect(&self, owner: u32, index: usize, width: f64) -> Rect {
        let n = &self.nodes[&owner];
        if n.kind==NodeKind::ItemsView {if let Some(r)=n.reading.item_slots.get(index){return *r;}}
        let mut rect=if n.collection.adaptive.enabled {
            n.collection.adaptive.item_rect(index,n.collection.geometry,width)
        }else{n.collection.geometry.rect(index,width)};
        let gap=reading_controls::item_gaps(&n.props);rect.width=(rect.width-gap[0]).max(0.);rect.height=(rect.height-gap[1]).max(0.);rect.y+=n.collection.header_size[1];rect
    }
    pub(in crate::scene) fn collection_sticky_clip(&self, owner: u32) -> Option<Rect> {
        let key = self.collection_sticky_group(owner)?;
        let n = &self.nodes[&owner];
        let child = *n.collection.headers.get(&key)?;
        let header = &self.nodes[&child];
        let offsets = n.scroll.offsets(self.time);
        let horizontal = n.collection.adaptive.horizontal;
        let edge = if horizontal {
            header.rect.x + header.rect.width + 4.
        } else {
            header.rect.y + header.rect.height + 4.
        };
        let b = overlays::border_thickness(n.props.border_thickness, self.dpr);
        let x = n.props.padding[0] + b[0] + offsets[0];
        let y = n.props.padding[1] + b[1] + offsets[1];
        Some(if horizontal {
            Rect::new(
                edge,
                y,
                (x + n.scroll.viewport[0] - edge).max(0.),
                n.scroll.viewport[1],
            )
        } else {
            Rect::new(
                x,
                edge,
                n.scroll.viewport[0],
                (y + n.scroll.viewport[1] - edge).max(0.),
            )
        })
    }
}
