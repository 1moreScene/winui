//! AddDelete/Reposition theme tracks, resolved from AnimationMetrics on the
//! pinned SDK host. Stable identities preserve currently presented positions.
use super::*;
#[derive(Clone)]
pub(super) struct SourceTransition {
    pub serial: u64,
    pub start: f64,
    pub end: f64,
    pub delay: f64,
    pub duration: f64,
    pub added: HashSet<String>,
    pub positions: HashMap<String, [f64; 2]>,
    pub source: Arc<Vec<CollectionData>>,
}
#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectionItemVisual {
    pub opacity: f64,
    pub scale: f64,
}
impl CollectionState {
    pub fn item_visual(&self, time: f64) -> CollectionItemVisual {
        CollectionItemVisual {
            opacity: self.entry_opacity.value(time) * self.drag_opacity.value(time),
            scale: self.entry_scale.value(time),
        }
    }
    pub fn entry_matrix(&self, rect: Rect, time: f64) -> Matrix {
        let scale = self.entry_scale.value(time);
        Matrix([
            scale,
            0.,
            0.,
            scale,
            rect.width * (1. - scale) / 2.,
            rect.height * (1. - scale) / 2.,
        ])
    }
}
impl Scene {
    pub(super) fn collection_source_transition(&self, id: u32) -> Option<SourceTransition> {
        let n = &self.nodes[&id];
        let c = &n.collection;
        if n.composed.owner.is_some()
            || self.reduced_motion
            || n.rect.width <= 0.
            || n.rect.height <= 0.
            || n.theme == Theme::HighContrast
            || !c.source_initialized
            || Arc::ptr_eq(&c.source, &n.props.collection_items)
            || c.source_transition
                .as_ref()
                .is_some_and(|v| Arc::ptr_eq(&v.source, &n.props.collection_items))
        {
            return None;
        }
        if c.source.len() == n.props.collection_items.len()
            && c.source
                .iter()
                .zip(n.props.collection_items.iter())
                .all(|(a, b)| a.id == b.id)
        {
            return None;
        }
        let old = c
            .source
            .iter()
            .map(|d| d.id.as_str())
            .collect::<HashSet<_>>();
        let next = n
            .props
            .collection_items
            .iter()
            .map(|d| d.id.as_str())
            .collect::<HashSet<_>>();
        let added = next
            .difference(&old)
            .map(|k| k.to_string())
            .collect::<HashSet<_>>();
        let removed = old.difference(&next).next().is_some();
        let a = &contract()["animations"];
        let duration = if added.is_empty() && !removed {
            a["repositionMs"].as_f64().unwrap()
        } else {
            a["listAffectedMs"].as_f64().unwrap()
        };
        let delay = if removed {
            a["listRemainingDelayMs"].as_f64().unwrap()
        } else {
            0.
        };
        let positions = c
            .realized
            .iter()
            .filter_map(|(key, child)| {
                let c = &self.nodes[child].collection;
                c.reorder_position.map(|_| {
                    (
                        key.clone(),
                        [c.reorder_x.value(self.time), c.reorder_y.value(self.time)],
                    )
                })
            })
            .collect();
        Some(SourceTransition {
            serial: c.transition_serial.wrapping_add(1),
            start: self.time,
            end: self.time + duration + delay,
            delay,
            duration,
            added,
            positions,
            source: n.props.collection_items.clone(),
        })
    }
    pub(super) fn collection_transition_arrange(&mut self, id: u32, mut rect: Rect) -> Rect {
        let n = &self.nodes[&id];
        let owner = n.props.collection_owner.unwrap();
        let preview = self.nodes[&owner].collection.drag.preview.is_some();
        let reduce = self.reduced_motion || n.theme == Theme::HighContrast;
        let transition = self.nodes[&owner]
            .collection
            .source_transition
            .as_ref()
            .filter(|v| v.end > self.time)
            .map(|v| {
                (
                    v.serial,
                    v.start,
                    v.end,
                    v.delay,
                    v.duration,
                    v.added.contains(&n.props.collection_key),
                    v.positions.get(&n.props.collection_key).copied(),
                )
            });
        let c = &mut self.nodes.get_mut(&id).unwrap().collection;
        let now = self.time;
        let a = &contract()["animations"];
        if reduce {
            c.entry_opacity.snap(1.);
            c.entry_scale.snap(1.);
        } else if let Some((serial, start, _, _, _, added, _)) = transition {
            if c.entry_token != Some(serial) {
                c.entry_token = Some(serial);
                if c.entry_token.is_none() || !c.entry_opacity.active(now) {
                    c.entry_opacity.snap(1.);
                }
                if c.entry_token.is_none() || !c.entry_scale.active(now) {
                    c.entry_scale.snap(1.);
                }
                if added {
                    let delay = a["listAddedDelayMs"].as_f64().unwrap();
                    let duration = a["listAddedMs"].as_f64().unwrap();
                    let scale = a["listAddedInitialScale"].as_f64().unwrap();
                    c.entry_opacity.snap(0.);
                    c.entry_opacity.curve = [0., 0., 1., 1.];
                    c.entry_opacity.retarget(1., start + delay, duration);
                    c.entry_scale.snap(scale);
                    let curve = a["repositionCurve"].as_array().unwrap();
                    c.entry_scale.curve = std::array::from_fn(|i| curve[i].as_f64().unwrap());
                    c.entry_scale.retarget(1., start + delay, duration);
                }
            }
        } else if c.entry_token.is_none() {
            c.entry_opacity.snap(1.);
            c.entry_scale.snap(1.);
        }
        if let Some((serial, _, _, _, _, _, position)) = transition {
            if c.position_token != Some(serial) {
                c.position_token = Some(serial);
                if let Some([x, y]) = position {
                    c.reorder_x.snap(x);
                    c.reorder_y.snap(y);
                    c.reorder_position = Some([x, y]);
                }
            }
        }
        let target = [rect.x, rect.y];
        if c.reorder_position != Some(target) {
            if c.reorder_position.is_none()
                || reduce
                || !(preview || c.reorder_preview || transition.is_some())
            {
                c.reorder_x.snap(rect.x);
                c.reorder_y.snap(rect.y);
            } else {
                let curve = a["repositionCurve"].as_array().unwrap();
                let curve = std::array::from_fn(|i| curve[i].as_f64().unwrap());
                c.reorder_x.curve = curve;
                c.reorder_y.curve = curve;
                let (start, duration) = transition
                    .map(|(_, start, end, delay, _, _, _)| {
                        let start = (start + delay).max(now);
                        (start, (end - start).max(0.))
                    })
                    .unwrap_or((now, a["repositionMs"].as_f64().unwrap()));
                let current = [c.reorder_x.value(now), c.reorder_y.value(now)];
                c.reorder_x.snap(current[0]);
                c.reorder_y.snap(current[1]);
                c.reorder_x.retarget(rect.x, start, duration);
                c.reorder_y.retarget(rect.y, start, duration);
            }
            c.reorder_position = Some(target);
        }
        c.reorder_preview = preview;
        rect.x = c.reorder_x.value(now);
        rect.y = c.reorder_y.value(now);
        rect
    }
}
