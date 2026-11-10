//! Native WrapPanel row packing and RelativePanel dependency layout.
use super::*;
use crate::typography::TextMeasurer;
use std::collections::{HashMap, HashSet};

#[derive(Clone, Debug, Serialize, Deserialize, Default)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
#[derive(PartialEq)]
pub struct PanelProperties {
    pub item_spacing: f64,
    pub line_spacing: f64,
    pub items_stretch: WrapPanelItemsStretch,
}
/// Sibling names are stable layout keys, independent of browser DOM names.
#[derive(Clone, Debug, Serialize, Deserialize, Default)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
#[derive(PartialEq)]
pub struct RelativeConstraints {
    pub left_of: Option<String>,
    pub right_of: Option<String>,
    pub above: Option<String>,
    pub below: Option<String>,
    pub align_left_with: Option<String>,
    pub align_right_with: Option<String>,
    pub align_top_with: Option<String>,
    pub align_bottom_with: Option<String>,
    pub align_horizontal_center_with: Option<String>,
    pub align_vertical_center_with: Option<String>,
    pub align_left_with_panel: bool,
    pub align_right_with_panel: bool,
    pub align_top_with_panel: bool,
    pub align_bottom_with_panel: bool,
    pub align_horizontal_center_with_panel: bool,
    pub align_vertical_center_with_panel: bool,
}
impl RelativeConstraints {
    fn references(&self) -> impl Iterator<Item = &String> {
        [
            &self.left_of,
            &self.right_of,
            &self.above,
            &self.below,
            &self.align_left_with,
            &self.align_right_with,
            &self.align_top_with,
            &self.align_bottom_with,
            &self.align_horizontal_center_with,
            &self.align_vertical_center_with,
        ]
        .into_iter()
        .filter_map(|s| s.as_ref())
    }
    fn axis(&self, axis: usize) -> AxisConstraints<'_> {
        if axis == 0 {
            AxisConstraints {
                before: self.left_of.as_ref(),
                after: self.right_of.as_ref(),
                start: self.align_left_with.as_ref(),
                end: self.align_right_with.as_ref(),
                center: self.align_horizontal_center_with.as_ref(),
                panel_start: self.align_left_with_panel,
                panel_end: self.align_right_with_panel,
                panel_center: self.align_horizontal_center_with_panel,
            }
        } else {
            AxisConstraints {
                before: self.above.as_ref(),
                after: self.below.as_ref(),
                start: self.align_top_with.as_ref(),
                end: self.align_bottom_with.as_ref(),
                center: self.align_vertical_center_with.as_ref(),
                panel_start: self.align_top_with_panel,
                panel_end: self.align_bottom_with_panel,
                panel_center: self.align_vertical_center_with_panel,
            }
        }
    }
}
struct AxisConstraints<'a> {
    before: Option<&'a String>,
    after: Option<&'a String>,
    start: Option<&'a String>,
    end: Option<&'a String>,
    center: Option<&'a String>,
    panel_start: bool,
    panel_end: bool,
    panel_center: bool,
}
#[derive(Default)]
pub struct PanelState {
    pub error: Option<String>,
    slots: Vec<(u32, Rect)>,
    wrap_desired: [f64; 2],
}
pub fn defaults(k: NodeKind, p: &mut NodeProperties) {
    if matches!(k, NodeKind::WrapPanel | NodeKind::RelativePanel) {
        p.is_tab_stop = false;
        p.panel_controls = Some(Box::default());
        if k == NodeKind::WrapPanel {
            p.orientation = Orientation::Horizontal;
        }
    }
}
pub fn validate(p: &NodeProperties) -> Result<(), String> {
    if let Some(q) = &p.panel_controls {
        if [q.item_spacing, q.line_spacing]
            .iter()
            .any(|v| !v.is_finite() || *v < 0. || *v > 1e6)
        {
            return Err("Panel spacing must be finite and nonnegative".into());
        }
    }
    if p.layout_key.len() > 4096
        || p.relative
            .as_ref()
            .is_some_and(|r| r.references().any(|v| v.is_empty() || v.len() > 4096))
    {
        return Err("Invalid RelativePanel layout key".into());
    }
    Ok(())
}

// Each symbolic edge is a * panel extent + b. This lets desired size include
// right/center anchored chains without feeding the available width back as desired.
#[derive(Clone, Copy, Default, Debug)]
struct Edge(f64, f64);
impl Edge {
    fn add(self, v: f64) -> Self {
        Self(self.0, self.1 + v)
    }
    fn minus(self, r: Self) -> Self {
        Self(self.0 - r.0, self.1 - r.1)
    }
    fn middle(self, r: Self) -> Self {
        Self((self.0 + r.0) / 2., (self.1 + r.1) / 2.)
    }
}
fn lower_bound(value: Edge, min: f64) -> f64 {
    if value.0 > 1e-9 {
        ((min - value.1) / value.0).max(0.)
    } else {
        0.
    }
}
impl Scene {
    pub fn validate_panel_layouts(&self) -> Result<(), String> {
        for n in self.nodes.values() {
            if n.props.visible {
                if let Some(error) = &n.panel.error {
                    return Err(format!("RelativePanel {}: {error}", n.id));
                }
            }
        }
        Ok(())
    }
    fn relative_order(&self, id: u32) -> Result<Vec<u32>, String> {
        let children = self.nodes[&id].children.clone();
        let mut keys = HashMap::new();
        for child in &children {
            let key = &self.nodes[child].props.layout_key;
            if !key.is_empty() && keys.insert(key.clone(), *child).is_some() {
                return Err(format!("Duplicate layout key: {key}"));
            }
        }
        fn visit(
            scene: &Scene,
            id: u32,
            keys: &HashMap<String, u32>,
            pending: &mut HashSet<u32>,
            done: &mut HashSet<u32>,
            order: &mut Vec<u32>,
        ) -> Result<(), String> {
            if done.contains(&id) {
                return Ok(());
            }
            if !pending.insert(id) {
                return Err("Circular dependency in relative constraints".into());
            }
            if let Some(r) = &scene.nodes[&id].props.relative {
                for key in r.references() {
                    let target = keys
                        .get(key)
                        .ok_or_else(|| format!("Sibling layout key not found: {key}"))?;
                    visit(scene, *target, keys, pending, done, order)?;
                }
            }
            pending.remove(&id);
            done.insert(id);
            order.push(id);
            Ok(())
        }
        let (mut pending, mut done, mut order) = (HashSet::new(), HashSet::new(), vec![]);
        for child in children {
            visit(self, child, &keys, &mut pending, &mut done, &mut order)?;
        }
        Ok(order)
    }
    fn symbolic_axis(&self, order: &[u32], axis: usize) -> (HashMap<u32, (Edge, Edge)>, f64) {
        let mut edges = HashMap::new();
        let mut desired = 0_f64;
        let keys = order
            .iter()
            .filter(|id| !self.nodes[id].props.layout_key.is_empty())
            .map(|id| (self.nodes[id].props.layout_key.clone(), *id))
            .collect::<HashMap<_, _>>();
        for id in order {
            let empty = RelativeConstraints::default();
            let p = &self.nodes[id].props;
            let r = p.relative.as_deref().unwrap_or(&empty).axis(axis);
            let size = self.nodes[id].desired[axis];
            let get = |key: &String| {
                *edges
                    .get(&keys[key])
                    .unwrap_or(&(Edge(0., 0.), Edge(0., 0.)))
            };
            let left =
                r.panel_start || r.start.is_some() || (r.after.is_some() && r.center.is_none());
            let right =
                r.panel_end || r.end.is_some() || (r.before.is_some() && r.center.is_none());
            let start = if r.panel_start {
                Edge(0., 0.)
            } else if let Some(key) = r.start {
                get(key).0
            } else if r.center.is_none() {
                r.after.map(|k| get(k).1).unwrap_or_default()
            } else {
                Edge(0., 0.)
            };
            let end = if r.panel_end {
                Edge(1., 0.)
            } else if let Some(key) = r.end {
                get(key).1
            } else if r.center.is_none() {
                r.before.map(|k| get(k).0).unwrap_or(Edge(1., 0.))
            } else {
                Edge(1., 0.)
            };
            let (a, b) = if left && right {
                desired = desired.max(lower_bound(end.minus(start), size));
                (start, end)
            } else if left {
                (start, start.add(size))
            } else if right {
                (end.add(-size), end)
            } else if let Some(key) = r.center {
                let center = get(key).0.middle(get(key).1);
                (center.add(-size / 2.), center.add(size / 2.))
            } else if r.panel_center {
                (Edge(0.5, -size / 2.), Edge(0.5, size / 2.))
            } else {
                (Edge(0., 0.), Edge(0., size))
            };
            desired = desired
                .max(size)
                .max(lower_bound(a, 0.))
                .max(lower_bound(Edge(1. - b.0, -b.1), 0.));
            edges.insert(*id, (a, b));
        }
        (edges, desired)
    }
    /// RPGraph precedence: panel edge > sibling edge > sibling center > positional.
    fn relative_axis(
        &self,
        order: &[u32],
        axis: usize,
        extent: f64,
    ) -> HashMap<u32, (f64, f64, f64)> {
        let mut rects: HashMap<u32, (f64, f64, f64)> = HashMap::new();
        let keys = order
            .iter()
            .filter(|id| !self.nodes[id].props.layout_key.is_empty())
            .map(|id| (self.nodes[id].props.layout_key.clone(), *id))
            .collect::<HashMap<_, _>>();
        for id in order {
            let empty = RelativeConstraints::default();
            let r = self.nodes[id]
                .props
                .relative
                .as_deref()
                .unwrap_or(&empty)
                .axis(axis);
            let d = self.nodes[id].desired[axis];
            let get = |key: &String| rects[&keys[key]];
            let mut a = 0.;
            let mut b = extent;
            let mut cl = false;
            let mut cr = false;
            if !r.panel_start {
                if let Some(k) = r.start {
                    a = get(k).0;
                } else if r.center.is_some() {
                    cl = true;
                } else if let Some(k) = r.after {
                    let q = get(k);
                    a = q.0 + q.1;
                }
            }
            if !r.panel_end {
                if let Some(k) = r.end {
                    let q = get(k);
                    b = q.0 + q.1;
                } else if r.center.is_some() {
                    cr = true;
                } else if let Some(k) = r.before {
                    b = get(k).0;
                }
            }
            if cl && cr {
                let q = get(r.center.unwrap());
                let center = q.0 + q.1 / 2.;
                let half = center.min(extent - center);
                a = center - half;
                b = center + half;
            }
            let space = (b - a).max(0.);
            let d = d.min(space);
            let left =
                r.panel_start || r.start.is_some() || (r.after.is_some() && r.center.is_none());
            let right =
                r.panel_end || r.end.is_some() || (r.before.is_some() && r.center.is_none());
            let (start, size) = if left {
                if right {
                    (a, space)
                } else {
                    (a, d)
                }
            } else if right {
                (b - d, d)
            } else if (r.panel_center
                && r.before.is_none()
                && r.after.is_none()
                && r.start.is_none()
                && r.end.is_none())
                || (r.center.is_some() && r.start.is_none() && r.end.is_none())
            {
                (a + (space - d) / 2., d)
            } else {
                (a, d)
            };
            rects.insert(*id, (start, size, space));
        }
        rects
    }
    fn wrap_slots(&self, id: u32, available: [f64; 2]) -> (Vec<(u32, Rect)>, [f64; 2]) {
        let n = &self.nodes[&id];
        let q = n.props.panel_controls.as_deref().unwrap();
        let vertical = n.props.orientation == Orientation::Vertical;
        let axis = usize::from(vertical);
        let extent = available[axis];
        let mut slots = vec![];
        let mut row: Vec<(u32, f64, f64)> = vec![];
        let (mut u, mut v, mut row_height, mut width) = (0_f64, 0_f64, 0_f64, 0_f64);
        let finish =
            |row: &mut Vec<(u32, f64, f64)>, slots: &mut Vec<(u32, Rect)>, v: f64, height: f64| {
                for (child, pos, size) in row.drain(..) {
                    slots.push((
                        child,
                        if vertical {
                            Rect::new(v, pos, height, size)
                        } else {
                            Rect::new(pos, v, size, height)
                        },
                    ));
                }
            };
        for (index, child) in n.children.iter().enumerate() {
            let c = &self.nodes[child];
            if !c.props.visible {
                continue;
            }
            let d = c.desired;
            let mut size = d[axis];
            if size + u > extent + 1e-8 {
                finish(&mut row, &mut slots, v, row_height);
                u = 0.;
                v += row_height + q.line_spacing;
                row_height = 0.;
            }
            if index + 1 == n.children.len()
                && q.items_stretch == WrapPanelItemsStretch::Last
                && extent.is_finite()
            {
                size = (extent - u
                    + if vertical {
                        n.props.padding[3]
                    } else {
                        n.props.padding[2]
                    })
                .max(0.);
            }
            row_height = row_height.max(d[1 - axis]);
            row.push((*child, u, size));
            u += size + q.item_spacing;
            width = width.max(u);
        }
        let height = if row.is_empty() { v } else { v + row_height };
        finish(&mut row, &mut slots, v, row_height);
        let size = if vertical {
            [height, width]
        } else {
            [width, height]
        };
        (slots, size)
    }
    pub(super) fn measure_layout_panel(
        &mut self,
        id: u32,
        available: [f64; 2],
        measure: &mut impl TextMeasurer,
    ) -> [f64; 2] {
        let children = self.nodes[&id].children.clone();
        for child in children {
            self.measure_node(child, available, measure);
        }
        if self.nodes[&id].kind == NodeKind::WrapPanel {
            let (slots, size) = self.wrap_slots(id, available);
            self.nodes.get_mut(&id).unwrap().panel.wrap_desired = size;
            self.nodes.get_mut(&id).unwrap().panel.slots = slots;
            return size;
        }
        let order = match self.relative_order(id) {
            Ok(order) => {
                self.nodes.get_mut(&id).unwrap().panel.error = None;
                order
            }
            Err(error) => {
                self.nodes.get_mut(&id).unwrap().panel.error = Some(error);
                return [0.; 2];
            }
        };
        // Measure in dependency order with the width actually available after siblings.
        for child in &order {
            let x = self.relative_axis(
                &order[..=order.iter().position(|i| i == child).unwrap()],
                0,
                if available[0].is_finite() {
                    available[0]
                } else {
                    self.symbolic_axis(&order, 0).1
                },
            );
            let w = if available[0].is_finite() {
                x[child].2
            } else {
                available[0]
            };
            let prefix = &order[..=order.iter().position(|i| i == child).unwrap()];
            let h = if available[1].is_finite() {
                self.relative_axis(prefix, 1, available[1])[child].2
            } else {
                available[1]
            };
            self.measure_node(*child, [w, h], measure);
        }
        [
            self.symbolic_axis(&order, 0).1,
            self.symbolic_axis(&order, 1).1,
        ]
    }
    pub(super) fn arrange_layout_panel(
        &mut self,
        id: u32,
        inner: Rect,
        measure: &mut impl TextMeasurer,
    ) {
        let n = &self.nodes[&id];
        let world = n.world;
        let state = (n.theme, n.enabled, n.visible);
        let wrap = n.kind == NodeKind::WrapPanel;
        let slots = if wrap {
            let axis = usize::from(n.props.orientation == Orientation::Vertical);
            if [inner.width, inner.height][axis] + 1e-8 < n.panel.wrap_desired[axis] {
                self.wrap_slots(id, [inner.width, inner.height]).0
            } else {
                n.panel.slots.clone()
            }
        } else {
            let Ok(order) = self.relative_order(id) else {
                return;
            };
            let x = self.relative_axis(&order, 0, inner.width);
            let y = self.relative_axis(&order, 1, inner.height);
            order
                .into_iter()
                .map(|child| {
                    (
                        child,
                        Rect::new(x[&child].0, y[&child].0, x[&child].1, y[&child].1),
                    )
                })
                .collect()
        };
        self.nodes.get_mut(&id).unwrap().panel.slots = slots.clone();
        let rtl = self.effective_flow_direction(id) == FlowDirection::RightToLeft;
        for (child, mut slot) in slots {
            if rtl {
                slot.x = inner.width - slot.x - slot.width;
            }
            slot.x += inner.x;
            slot.y += inner.y;
            self.arrange_node(child, slot, world, state, measure);
        }
    }
}
