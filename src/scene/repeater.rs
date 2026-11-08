//! ItemsRepeater has no selection chrome and delegates scrolling to ancestors.
//! Algorithms follow the pinned StackLayout/UniformGridLayout sources.
use super::*;
use std::{
    collections::{HashMap, HashSet},
    sync::Arc,
};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct StackLayout {
    pub orientation: Orientation,
    pub spacing: f64,
    pub disable_virtualization: bool,
}
impl Default for StackLayout {
    fn default() -> Self {
        Self {
            orientation: Orientation::Vertical,
            spacing: 0.,
            disable_virtualization: false,
        }
    }
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct UniformGridLayout {
    pub orientation: Orientation,
    pub min_item_width: Option<f64>,
    pub min_item_height: Option<f64>,
    pub min_row_spacing: f64,
    pub min_column_spacing: f64,
    pub maximum_rows_or_columns: usize,
    pub items_stretch: UniformGridLayoutItemsStretch,
    pub items_justification: UniformGridLayoutItemsJustification,
}
impl Default for UniformGridLayout {
    fn default() -> Self {
        Self {
            orientation: Orientation::Horizontal,
            min_item_width: None,
            min_item_height: None,
            min_row_spacing: 0.,
            min_column_spacing: 0.,
            maximum_rows_or_columns: usize::MAX,
            items_stretch: Default::default(),
            items_justification: Default::default(),
        }
    }
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "kind")]
pub enum RepeaterLayout {
    LinedFlowLayout(LinedFlowLayout),
    StackLayout(StackLayout),
    UniformGridLayout(UniformGridLayout),
    FlowLayout(FlowLayout),
    ActivityFeedLayout(ActivityFeedLayout),
    VariedImageSizeLayout(VariedImageSizeLayout),
}
#[derive(Clone,Debug,Serialize,Deserialize,Default)]
#[serde(default,rename_all="camelCase",deny_unknown_fields)]
pub struct LinedFlowLayout {
 pub line_height:Option<f64>,pub line_spacing:f64,pub min_item_spacing:f64,
 pub items_stretch:LinedFlowLayoutItemsStretch,pub items_justification:LinedFlowLayoutItemsJustification,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct FlowLayout {
    pub orientation: Orientation,
    pub min_item_spacing: f64,
    pub line_spacing: f64,
    pub line_alignment: FlowLayoutLineAlignment,
}
impl Default for FlowLayout {
    fn default() -> Self {
        Self {
            orientation: Orientation::Horizontal,
            min_item_spacing: 0.,
            line_spacing: 0.,
            line_alignment: Default::default(),
        }
    }
}
/// Port of the fixed Gallery ActivityFeedLayout, not a browser packing helper.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct ActivityFeedLayout {
    pub min_item_size: [f64; 2],
    pub row_spacing: f64,
    pub column_spacing: f64,
}
impl Default for ActivityFeedLayout {
    fn default() -> Self {
        Self {
            min_item_size: [80., 108.],
            row_spacing: 0.,
            column_spacing: 0.,
        }
    }
}
/// Port of the fixed Gallery lowest-column placement strategy.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct VariedImageSizeLayout {
    pub width: f64,
}
impl Default for VariedImageSizeLayout {
    fn default() -> Self {
        Self { width: 150. }
    }
}
impl Default for RepeaterLayout {
    fn default() -> Self {
        Self::StackLayout(Default::default())
    }
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct RepeaterProperties {
    pub layout: RepeaterLayout,
    pub horizontal_cache_length: f64,
    pub vertical_cache_length: f64,
    pub is_scroll_center_scale_enabled: bool,
    pub is_focus_centering_enabled: bool,
    pub is_keyboard_navigation_enabled: bool,
}
impl Default for RepeaterProperties {
    fn default() -> Self {
        Self {
            layout: Default::default(),
            horizontal_cache_length: 2.,
            vertical_cache_length: 2.,
            is_scroll_center_scale_enabled: false,
            is_focus_centering_enabled: false,
            is_keyboard_navigation_enabled: false,
        }
    }
}
impl RepeaterProperties {
    pub fn validate(&self) -> Result<(), String> {
        let mut values = vec![self.horizontal_cache_length, self.vertical_cache_length];
        match &self.layout {
            RepeaterLayout::LinedFlowLayout(l)=>{values.extend([l.line_spacing,l.min_item_spacing]);if let Some(h)=l.line_height{if !h.is_finite()||h<=0.||h>1e6{return Err("Invalid line height".into())}}}
            RepeaterLayout::StackLayout(l) => values.push(l.spacing),
            RepeaterLayout::UniformGridLayout(l) => {
                values.extend([l.min_row_spacing, l.min_column_spacing]);
                for v in [l.min_item_width, l.min_item_height].into_iter().flatten() {
                    if !v.is_finite() || v <= 0. || v > 1e6 {
                        return Err("Invalid repeater cell size".into());
                    }
                }
            }
            RepeaterLayout::FlowLayout(l) => values.extend([l.min_item_spacing, l.line_spacing]),
            RepeaterLayout::ActivityFeedLayout(l) => {
                values.extend([l.row_spacing, l.column_spacing]);
                if l.min_item_size
                    .iter()
                    .any(|v| !v.is_finite() || *v <= 0. || *v > 1e6)
                {
                    return Err("Invalid activity feed cell size".into());
                }
            }
            RepeaterLayout::VariedImageSizeLayout(l) => {
                if !l.width.is_finite() || l.width <= 0. || l.width > 1e6 {
                    return Err("Invalid varied image column width".into());
                }
            }
        }
        if values.iter().any(|v| !v.is_finite() || *v < 0. || *v > 1e4)
            || self.horizontal_cache_length > 20.
            || self.vertical_cache_length > 20.
        {
            return Err("Invalid repeater spacing or cache length".into());
        }
        Ok(())
    }
}
#[derive(Default)]
pub struct RepeaterState {
    pending_focus: Option<usize>,
    pub unsettled: bool,
    pub creating: bool,
    pub realization_error: Option<String>,
    pub realized: HashMap<String, u32>,
    source: Arc<Vec<collections::CollectionData>>,
    measured: HashMap<String, [f64; 2]>,
    slots: Vec<Rect>,
    extent: [f64; 2],
    constraint: Option<[f64; 2]>,
    layout_signature: String,
    template: bool,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RepeaterElement {
    pub id: u32,
    pub key: String,
    pub index: usize,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RepeaterSnapshot {
    pub realization_error: Option<String>,
    pub realized: Vec<RepeaterElement>,
    pub total_count: usize,
    pub extent: [f64; 2],
    pub layout: RepeaterLayoutKind,
}
impl RepeaterState {
    pub fn snapshot(&self, p: &NodeProperties) -> RepeaterSnapshot {
        RepeaterSnapshot {
            realization_error: self.realization_error.clone(),
            realized: p
                .collection_items
                .iter()
                .enumerate()
                .filter_map(|(index, item)| {
                    self.realized.get(&item.id).map(|id| RepeaterElement {
                        id: *id,
                        key: item.id.clone(),
                        index,
                    })
                })
                .collect(),
            total_count: p.collection_items.len(),
            extent: self.extent,
            layout: match p.repeater.as_ref().map(|p| &p.layout) {
                Some(RepeaterLayout::LinedFlowLayout(_))=>RepeaterLayoutKind::LinedFlowLayout,
                Some(RepeaterLayout::UniformGridLayout(_)) => RepeaterLayoutKind::UniformGridLayout,
                Some(RepeaterLayout::FlowLayout(_)) => RepeaterLayoutKind::FlowLayout,
                Some(RepeaterLayout::ActivityFeedLayout(_)) => {
                    RepeaterLayoutKind::ActivityFeedLayout
                }
                Some(RepeaterLayout::VariedImageSizeLayout(_)) => {
                    RepeaterLayoutKind::VariedImageSizeLayout
                }
                _ => RepeaterLayoutKind::StackLayout,
            },
        }
    }
}
pub fn defaults(kind: NodeKind, p: &mut NodeProperties) {
    if kind == NodeKind::ItemsRepeater {
        p.repeater = Some(Box::default());
        p.is_tab_stop = false;
    }
}
pub fn validate(kind: NodeKind, p: &NodeProperties) -> Result<(), String> {
    if kind != NodeKind::ItemsRepeater {
        return Ok(());
    }
    p.repeater
        .as_deref()
        .ok_or("Missing repeater layout")?
        .validate()?;
    let mut keys = HashSet::new();
    let mut bytes = 0;
    if p.collection_items.len() > 100000 {
        return Err("ItemsRepeater item budget exceeded".into());
    }
    for item in p.collection_items.iter() {
        bytes += item.id.len() + item.text.len();
        if item.id.is_empty()
            || item.id.len() > 4096
            || !keys.insert(&item.id)
            || bytes > 32 * 1024 * 1024
        {
            return Err("ItemsRepeater requires unique stable IDs and bounded text".into());
        }
    }
    Ok(())
}
pub(super) fn slots(
    layout: &RepeaterLayout,
    items: &[collections::CollectionData],
    sizes: &HashMap<String, [f64; 2]>,
    available: [f64; 2],
) -> (Vec<Rect>, [f64; 2]) {
    if items.is_empty() {
        return (vec![], [0.; 2]);
    }
    let sample = sizes
        .get(&items[0].id)
        .copied()
        .or_else(|| sizes.values().next().copied())
        .unwrap_or([80., 32.]);
    let mut result = Vec::with_capacity(items.len());
    let mut extent = [0_f64; 2];
    match layout {
        RepeaterLayout::LinedFlowLayout(l)=>return lined_slots(l,items,sizes,available),
        RepeaterLayout::ActivityFeedLayout(l) => {
            let width = if available[0].is_finite() {
                available[0]
            } else {
                l.min_item_size[0] * 4. + l.column_spacing * 3.
            };
            let unit = l.min_item_size[0].max((width - l.column_spacing * 3.) / 4.);
            for i in 0..items.len() {
                let row = i / 3;
                let column = i % 3;
                let wide = if row % 2 == 0 { 2 } else { 0 };
                let w = if column == wide {
                    unit * 2. + l.column_spacing
                } else {
                    unit
                };
                let x = if row % 2 == 0 {
                    column as f64 * (unit + l.column_spacing)
                } else if column == 0 {
                    0.
                } else {
                    (column + 1) as f64 * (unit + l.column_spacing)
                };
                result.push(Rect::new(
                    x,
                    row as f64 * (l.min_item_size[1] + l.row_spacing),
                    w,
                    l.min_item_size[1],
                ));
            }
            extent = [
                unit * 4. + l.column_spacing * 2.,
                items.len().div_ceil(3) as f64 * (l.min_item_size[1] + l.row_spacing)
                    - l.row_spacing,
            ];
        }
        RepeaterLayout::VariedImageSizeLayout(l) => {
            let columns = if available[0].is_finite() {
                (available[0] / l.width).floor().max(1.) as usize
            } else {
                1
            };
            let mut offsets = vec![0_f64; columns];
            for item in items {
                let column = (0..columns)
                    .min_by(|a, b| offsets[*a].total_cmp(&offsets[*b]))
                    .unwrap();
                let height = sizes.get(&item.id).unwrap_or(&sample)[1].max(1.);
                result.push(Rect::new(
                    column as f64 * l.width,
                    offsets[column],
                    l.width,
                    height,
                ));
                offsets[column] += height;
            }
            extent = [
                if available[0].is_finite() {
                    available[0]
                } else {
                    l.width
                },
                offsets.into_iter().fold(0., f64::max),
            ];
        }
        RepeaterLayout::FlowLayout(l) => {
            let minor = usize::from(l.orientation == Orientation::Vertical);
            let major = 1 - minor;
            let mut line: Vec<(usize, [f64; 2])> = vec![];
            let (mut used, mut position, mut height) = (0_f64, 0_f64, 0_f64);
            let finish = |line: &mut Vec<(usize, [f64; 2])>,
                          used: f64,
                          position: f64,
                          height: f64,
                          result: &mut Vec<Rect>,
                          extent: &mut [f64; 2]| {
                let count = line.len();
                if count == 0 {
                    return;
                }
                let free = if available[minor].is_finite() {
                    (available[minor] - used).max(0.)
                } else {
                    0.
                };
                let (offset, extra) = match l.line_alignment {
                    FlowLayoutLineAlignment::Start => (0., 0.),
                    FlowLayoutLineAlignment::Center => (free / 2., 0.),
                    FlowLayoutLineAlignment::End => (free, 0.),
                    FlowLayoutLineAlignment::SpaceAround => {
                        (free / count as f64 / 2., free / count as f64)
                    }
                    FlowLayoutLineAlignment::SpaceBetween => (
                        0.,
                        if count > 1 {
                            free / (count - 1) as f64
                        } else {
                            0.
                        },
                    ),
                    FlowLayoutLineAlignment::SpaceEvenly => {
                        (free / (count + 1) as f64, free / (count + 1) as f64)
                    }
                };
                let mut x = offset;
                for (_, size) in line.drain(..) {
                    let r = if minor == 0 {
                        Rect::new(x, position, size[0], height)
                    } else {
                        Rect::new(position, x, height, size[1])
                    };
                    extent[0] = extent[0].max(r.x + r.width);
                    extent[1] = extent[1].max(r.y + r.height);
                    result.push(r);
                    x += size[minor] + l.min_item_spacing + extra;
                }
            };
            for (i, item) in items.iter().enumerate() {
                let size = sizes.get(&item.id).copied().unwrap_or(sample);
                let next =
                    used + if line.is_empty() {
                        0.
                    } else {
                        l.min_item_spacing
                    } + size[minor];
                if !line.is_empty() && next > available[minor] + 1e-6 {
                    finish(&mut line, used, position, height, &mut result, &mut extent);
                    position += height + l.line_spacing;
                    used = 0.;
                    height = 0.;
                }
                if !line.is_empty() {
                    used += l.min_item_spacing;
                }
                used += size[minor];
                height = height.max(size[major]);
                line.push((i, size));
            }
            finish(&mut line, used, position, height, &mut result, &mut extent);
        }
        RepeaterLayout::StackLayout(l) => {
            let axis = usize::from(l.orientation == Orientation::Vertical);
            let mut pos = 0.;
            let estimate = if sizes.is_empty() {
                sample[axis]
            } else {
                sizes.values().map(|d| d[axis]).sum::<f64>() / sizes.len() as f64
            };
            for item in items {
                let size = sizes.get(&item.id).copied().unwrap_or_else(|| {
                    let mut s = sample;
                    s[axis] = estimate;
                    s
                });
                let cross = if available[1 - axis].is_finite() {
                    available[1 - axis]
                } else {
                    size[1 - axis]
                };
                let rect = if axis == 1 {
                    Rect::new(0., pos, cross, size[1])
                } else {
                    Rect::new(pos, 0., size[0], cross)
                };
                result.push(rect);
                pos += size[axis] + l.spacing;
                extent[1 - axis] = extent[1 - axis].max(size[1 - axis]);
            }
            extent[axis] = (pos - l.spacing).max(0.);
        }
        RepeaterLayout::UniformGridLayout(l) => {
            let minor = usize::from(l.orientation == Orientation::Vertical);
            let major = 1 - minor;
            let spacing = [l.min_column_spacing, l.min_row_spacing];
            let mut cell = [
                l.min_item_width.unwrap_or(sample[0]).max(1.),
                l.min_item_height.unwrap_or(sample[1]).max(1.),
            ];
            let per = if available[minor].is_finite() {
                ((available[minor] + spacing[minor]) / (cell[minor] + spacing[minor]))
                    .floor()
                    .max(1.) as usize
            } else {
                items.len()
            }
            .min(l.maximum_rows_or_columns.max(1))
            .max(1);
            if l.items_stretch != UniformGridLayoutItemsStretch::None
                && available[minor].is_finite()
            {
                let extra = ((available[minor]
                    - (per as f64 * (cell[minor] + spacing[minor]) - spacing[minor]))
                    as i64
                    / per as i64) as f64;
                let old = cell[minor];
                cell[minor] = (old + extra).max(1.);
                if l.items_stretch == UniformGridLayoutItemsStretch::Uniform {
                    cell[major] *= cell[minor] / old;
                }
            }
            for i in 0..items.len() {
                let line = i / per;
                let count = per.min(items.len() - line * per);
                let remainder = if available[minor].is_finite() {
                    (available[minor]
                        - (count as f64 * cell[minor]
                            + count.saturating_sub(1) as f64 * spacing[minor]))
                        .max(0.)
                } else {
                    0.
                };
                let (offset, gap) = match l.items_justification {
                    UniformGridLayoutItemsJustification::Start => (0., 0.),
                    UniformGridLayoutItemsJustification::Center => (remainder / 2., 0.),
                    UniformGridLayoutItemsJustification::End => (remainder, 0.),
                    UniformGridLayoutItemsJustification::SpaceAround => {
                        (remainder / count as f64 / 2., remainder / count as f64)
                    }
                    UniformGridLayoutItemsJustification::SpaceBetween => (
                        0.,
                        if count > 1 {
                            remainder / (count - 1) as f64
                        } else {
                            0.
                        },
                    ),
                    UniformGridLayoutItemsJustification::SpaceEvenly => (
                        remainder / (count + 1) as f64,
                        remainder / (count + 1) as f64,
                    ),
                };
                let a = offset + (i % per) as f64 * (cell[minor] + spacing[minor] + gap);
                let b = line as f64 * (cell[major] + spacing[major]);
                let rect = if minor == 0 {
                    Rect::new(a, b, cell[0], cell[1])
                } else {
                    Rect::new(b, a, cell[0], cell[1])
                };
                extent[0] = extent[0].max(rect.x + rect.width);
                extent[1] = extent[1].max(rect.y + rect.height);
                result.push(rect);
            }
        }
    }
    (result, extent)
}
impl Scene {
    fn repeater_parent(&self, mut child: u32) -> Option<(u32, usize)> {
        while let Some(parent) = self.nodes.get(&child)?.parent {
            if self.nodes[&parent].kind == NodeKind::ItemsRepeater {
                let n = &self.nodes[&parent];
                let key = n.repeater.realized.iter().find(|(_, id)| **id == child)?.0;
                return Some((
                    parent,
                    n.props.collection_items.iter().position(|v| &v.id == key)?,
                ));
            }
            child = parent;
        }
        None
    }
    pub(super) fn repeater_focus_changed(&mut self, child: u32) {
        if let Some((id, index)) = self.repeater_parent(child) {
            if self.nodes[&id]
                .props
                .repeater
                .as_ref()
                .unwrap()
                .is_focus_centering_enabled
            {
                let _ = self.repeater_scroll_to(id, index, false, true);
            }
        }
    }
    pub fn repeater_scroll_to(
        &mut self,
        id: u32,
        index: usize,
        focus: bool,
        center: bool,
    ) -> Result<(), String> {
        let n = self.get(id)?;
        if n.kind != NodeKind::ItemsRepeater || index >= n.props.collection_items.len() {
            return Err("Invalid ItemsRepeater index".into());
        }
        let slot = n.repeater.slots.get(index).copied().unwrap_or(Rect::new(
            0.,
            index as f64 * 32.,
            80.,
            32.,
        ));
        let mut parent = n.parent;
        while let Some(host) = parent {
            let h = &self.nodes[&host];
            if collections::is_scroll_owner(h.kind) {
                let target = slot.y
                    - if center {
                        (h.scroll.viewport[1] - slot.height) / 2.
                    } else {
                        0.
                    };
                self.scroll_change(host, None, Some(target.max(0.)), None, center)?;
                break;
            }
            parent = h.parent;
        }
        if focus {
            self.nodes.get_mut(&id).unwrap().repeater.pending_focus = Some(index);
        }
        self.invalidate(id, true);
        Ok(())
    }
    pub(super) fn repeater_input(&mut self, input: &Input) -> Result<bool, String> {
        if let Input::RepeaterScroll { id, index, focus } = input {
            self.repeater_scroll_to(*id, *index, *focus, *focus)?;
            return Ok(true);
        }
        if let Input::KeyDown { key, .. } = input {
            if let Some((id, index)) = self.focused.and_then(|f| self.repeater_parent(f)) {
                let n = &self.nodes[&id];
                if n.props
                    .repeater
                    .as_ref()
                    .unwrap()
                    .is_keyboard_navigation_enabled
                {
                    let last = n.props.collection_items.len().saturating_sub(1);
                    let target = match key.as_str() {
                        "Home" => Some(0),
                        "End" => Some(last),
                        "ArrowDown" => Some((index + 1).min(last)),
                        "ArrowUp" => Some(index.saturating_sub(1)),
                        _ => None,
                    };
                    if let Some(target) = target {
                        self.repeater_scroll_to(id, target, true, true)?;
                        return Ok(true);
                    }
                }
            }
        }
        Ok(false)
    }
    /// Create a nonselecting repeater using a typed Rust layout description.
    pub fn items_repeater(
        &mut self,
        parent: u32,
        items: Vec<collections::CollectionData>,
        layout: RepeaterLayout,
    ) -> Result<u32, String> {
        self.create(
            parent,
            NodeKind::ItemsRepeater,
            serde_json::json!({"collectionItems":items,"repeater":{"layout":layout}}),
        )
    }
    /// A borrowed realized element; returns None when its index is outside cache.
    pub fn try_get_repeater_element(&self, id: u32, index: usize) -> Result<Option<u32>, String> {
        let n = self.get(id)?;
        if n.kind != NodeKind::ItemsRepeater {
            return Err("Node is not an ItemsRepeater".into());
        }
        Ok(n.props
            .collection_items
            .get(index)
            .and_then(|item| n.repeater.realized.get(&item.id))
            .copied())
    }
    fn repeater_event(
        &mut self,
        id: u32,
        kind: EventKind,
        child: u32,
        key: &str,
        index: usize,
        old: Option<usize>,
    ) {
        self.emit(id, kind);
        if let Some(e) = self.events.last_mut() {
            e.payload =
                Some(serde_json::json!({"element":child,"key":key,"index":index,"oldIndex":old}));
        }
    }
    fn repeater_create(&mut self, id: u32, index: usize) -> Option<u32> {
        let item = self.nodes[&id].props.collection_items[index].clone();
        self.nodes.get_mut(&id)?.repeater.creating = true;
        let result = self.create(
            id,
            NodeKind::Grid,
            serde_json::json!({"enabled":item.enabled,"isTabStop":false}),
        );
        self.nodes.get_mut(&id)?.repeater.creating = false;
        let child = match result {
            Ok(c) => c,
            Err(error) => {
                self.nodes.get_mut(&id)?.repeater.realization_error = Some(error);
                return None;
            }
        };
        if !self.nodes[&id].props.has_item_template {
            let _ = self.create(
                child,
                NodeKind::TextBlock,
                serde_json::json!({"text":item.text,"verticalAlignment":"Center"}),
            );
        }
        self.nodes
            .get_mut(&id)?
            .repeater
            .realized
            .insert(item.id.clone(), child);
        self.repeater_event(id, EventKind::ElementPrepared, child, &item.id, index, None);
        Some(child)
    }
    fn repeater_measure_constraint(&mut self, id: u32, available: [f64; 2]) {
        let available = available.map(|v| v as f32 as f64);
        let n = &self.nodes[&id];
        let q = n.props.repeater.as_deref().unwrap();
        let signature = serde_json::to_string(&q.layout).unwrap();
        let mut cache_constraint = available;
        match &q.layout {
            RepeaterLayout::LinedFlowLayout(_)=>{},
            RepeaterLayout::StackLayout(l) => {
                cache_constraint[usize::from(l.orientation == Orientation::Vertical)] = 0.
            }
            RepeaterLayout::UniformGridLayout(l) => {
                cache_constraint[usize::from(l.orientation == Orientation::Horizontal)] = 0.
            }
            RepeaterLayout::FlowLayout(l) => {
                cache_constraint[usize::from(l.orientation == Orientation::Horizontal)] = 0.
            }
            RepeaterLayout::ActivityFeedLayout(_) | RepeaterLayout::VariedImageSizeLayout(_) => {
                cache_constraint[1] = 0.
            }
        };
        if n.repeater.layout_signature != signature {
            let n = self.nodes.get_mut(&id).unwrap();
            n.repeater.measured.clear();
            n.repeater.layout_signature = signature;
        }
        // Grid may measure a star column first at the full available width and
        // then at its final share. Keep offscreen estimates across those passes;
        // realized elements are remeasured below at each actual constraint.
        self.nodes.get_mut(&id).unwrap().repeater.constraint = Some(cache_constraint);
    }
    fn repeater_geometry(&mut self, id: u32, available: [f64; 2]) {
        let available = available.map(|v| v as f32 as f64);
        let n = &self.nodes[&id];
        let (s, e) = slots(
            &n.props.repeater.as_ref().unwrap().layout,
            &n.props.collection_items,
            &n.repeater.measured,
            available,
        );
        let n = self.nodes.get_mut(&id).unwrap();
        n.repeater.slots = s;
        n.repeater.extent = e;
    }
    fn sync_repeater_source(&mut self, id: u32) {
        if self.nodes[&id].repeater.template != self.nodes[&id].props.has_item_template {
            let old = self.nodes[&id].repeater.realized.clone();
            for (key, child) in old {
                self.repeater_event(id, EventKind::ElementClearing, child, &key, 0, None);
                let _ = self.destroy(child);
            }
            let n = self.nodes.get_mut(&id).unwrap();
            n.repeater.realized.clear();
            n.repeater.measured.clear();
            n.repeater.template = n.props.has_item_template;
        }
        if Arc::ptr_eq(
            &self.nodes[&id].props.collection_items,
            &self.nodes[&id].repeater.source,
        ) {
            return;
        }
        let old = self.nodes[&id].repeater.source.clone();
        let new = self.nodes[&id].props.collection_items.clone();
        let keys = new.iter().map(|v| v.id.clone()).collect::<HashSet<_>>();
        let realized = self.nodes[&id].repeater.realized.clone();
        for (key, child) in realized {
            let old_index = old.iter().position(|v| v.id == key).unwrap_or(0);
            if !keys.contains(key.as_str()) {
                self.repeater_event(id, EventKind::ElementClearing, child, &key, old_index, None);
                let _ = self.destroy(child);
                self.nodes
                    .get_mut(&id)
                    .unwrap()
                    .repeater
                    .realized
                    .remove(&key);
            } else {
                let index = new.iter().position(|v| v.id == key).unwrap();
                if index != old_index {
                    self.repeater_event(
                        id,
                        EventKind::ElementIndexChanged,
                        child,
                        &key,
                        index,
                        Some(old_index),
                    );
                }
                let n = self.nodes.get_mut(&child).unwrap();
                n.props.enabled = new[index].enabled;
                if !self.nodes[&id].props.has_item_template {
                    let children = self.nodes[&child].children.clone();
                    for c in children {
                        self.nodes.get_mut(&c).unwrap().props.text = new[index].text.clone();
                    }
                }
            }
        }
        let state = &mut self.nodes.get_mut(&id).unwrap().repeater;
        state.source = new;
        state.measured.retain(|k, _| keys.contains(k.as_str()));
        self.emit(id, EventKind::RealizationChanged);
    }
    pub(super) fn measure_repeater(
        &mut self,
        id: u32,
        available: [f64; 2],
        m: &mut impl TextMeasurer,
    ) -> [f64; 2] {
        self.sync_repeater_source(id);
        // Arrange may receive a finite cross-axis size after an unbounded
        // Measure. It must not discard the measurements that produced that size.
        self.repeater_measure_constraint(id, available);
        if !self.nodes[&id].props.collection_items.is_empty()
            && self.nodes[&id].repeater.realized.is_empty()
        {
            self.repeater_create(id, 0);
        }
        self.repeater_geometry(id, available);
        let realized = self.nodes[&id].repeater.realized.clone();
        let layout = self.nodes[&id]
            .props
            .repeater
            .as_ref()
            .unwrap()
            .layout
            .clone();
        for (key, child) in realized {
            let constraint = match &layout {
                RepeaterLayout::StackLayout(l) => {
                    if l.orientation == Orientation::Vertical {
                        [available[0], f64::INFINITY]
                    } else {
                        [f64::INFINITY, available[1]]
                    }
                }
                _ => self.nodes[&id]
                    .props
                    .collection_items
                    .iter()
                    .position(|v| v.id == key)
                    .map(|i| {
                        let r = self.nodes[&id].repeater.slots[i];
                        [r.width, r.height]
                    })
                    .unwrap_or(available),
            };
            let constraint = match &layout {
                RepeaterLayout::FlowLayout(l) => {
                    if l.orientation == Orientation::Horizontal {
                        [f64::INFINITY, available[1]]
                    } else {
                        [available[0], f64::INFINITY]
                    }
                }
                RepeaterLayout::VariedImageSizeLayout(l) => [l.width, f64::INFINITY],
                _ => constraint,
            };
            let size = self.measure_node(child, constraint, m);
            if self.nodes[&id].props.has_item_template && self.nodes[&child].children.is_empty() {
                continue;
            }
            self.nodes
                .get_mut(&id)
                .unwrap()
                .repeater
                .measured
                .insert(key, size);
        }
        self.repeater_geometry(id, available);
        self.nodes[&id].repeater.extent
    }
    pub(super) fn arrange_repeater(&mut self, id: u32, inner: Rect, m: &mut impl TextMeasurer) {
        self.sync_repeater_source(id);
        let available = [inner.width, inner.height];
        self.repeater_geometry(id, available);
        let n = &self.nodes[&id];
        let world = n.world;
        let inherited = (n.theme, n.enabled, n.visible);
        let q = n.props.repeater.as_ref().unwrap().clone();
        let mut viewport = Rect::new(0., 0., self.width, self.height);
        let mut parent = n.parent;
        let mut scroll_parent = None;
        while let Some(p) = parent {
            let pn = &self.nodes[&p];
            if collections::is_scroll_owner(pn.kind) {
                viewport = pn.world.bounds(Rect::new(
                    0.,
                    0.,
                    pn.scroll.viewport[0],
                    pn.scroll.viewport[1],
                ));
                scroll_parent = Some(p);
                break;
            }
            parent = pn.parent;
        }
        let mut local = world.inverse().unwrap_or_default().bounds(viewport);
        local.x -= inner.x;
        local.y -= inner.y;
        let cache = [
            local.width * q.horizontal_cache_length / 2.,
            local.height * q.vertical_cache_length / 2.,
        ];
        local = Rect::new(
            local.x - cache[0],
            local.y - cache[1],
            local.width + 2. * cache[0],
            local.height + 2. * cache[1],
        );
        let all = matches!(
            q.layout,
            RepeaterLayout::StackLayout(StackLayout {
                disable_virtualization: true,
                ..
            })
        );
        let waiting_for_template = self.nodes[&id].props.has_item_template
            && self.nodes[&id].repeater.measured.is_empty()
            && !matches!(&q.layout,
                RepeaterLayout::ActivityFeedLayout(_)
                | RepeaterLayout::UniformGridLayout(UniformGridLayout {
                    min_item_width: Some(_), min_item_height: Some(_), ..
                }));
        let targets = self.nodes[&id]
            .repeater
            .slots
            .iter()
            .enumerate()
            .filter(|(index, r)| {
                self.nodes[&id].repeater.pending_focus == Some(*index)
                    || if waiting_for_template { *index == 0 } else { all
                    || r.x + r.width >= local.x
                        && r.x <= local.x + local.width
                        && r.y + r.height >= local.y
                        && r.y <= local.y + local.height }
            })
            .map(|(i, r)| (i, *r))
            .collect::<Vec<_>>();
        let keys = targets
            .iter()
            .map(|(i, _)| self.nodes[&id].props.collection_items[*i].id.clone())
            .collect::<HashSet<_>>();
        let old = self.nodes[&id].repeater.realized.clone();
        let mut changed = false;
        for (key, child) in old {
            let pinned = self.focused.is_some_and(|f| {
                let mut at = Some(f);
                while let Some(p) = at {
                    if p == child {
                        return true;
                    }
                    at = self.nodes.get(&p).and_then(|n| n.parent);
                }
                false
            });
            if !keys.contains(&key) && !pinned {
                let index = self.nodes[&id]
                    .props
                    .collection_items
                    .iter()
                    .position(|v| v.id == key)
                    .unwrap_or(0);
                self.repeater_event(id, EventKind::ElementClearing, child, &key, index, None);
                let _ = self.destroy(child);
                self.nodes
                    .get_mut(&id)
                    .unwrap()
                    .repeater
                    .realized
                    .remove(&key);
                changed = true;
            }
        }
        let rtl = self.effective_flow_direction(id) == FlowDirection::RightToLeft;
        for (index, mut slot) in targets {
            let key = self.nodes[&id].props.collection_items[index].id.clone();
            let child = match self.nodes[&id].repeater.realized.get(&key).copied() {
                Some(c) => c,
                None => {
                    changed = true;
                    match self.repeater_create(id, index) {
                        Some(c) => c,
                        None => continue,
                    }
                }
            };
            let constraint = match &q.layout {
                RepeaterLayout::StackLayout(l) => {
                    if l.orientation == Orientation::Vertical {
                        [slot.width, f64::INFINITY]
                    } else {
                        [f64::INFINITY, slot.height]
                    }
                }
                _ => [slot.width, slot.height],
            };
            let constraint = match &q.layout {
                RepeaterLayout::FlowLayout(l) => {
                    if l.orientation == Orientation::Horizontal {
                        [f64::INFINITY, inner.height]
                    } else {
                        [inner.width, f64::INFINITY]
                    }
                }
                RepeaterLayout::VariedImageSizeLayout(l) => [l.width, f64::INFINITY],
                _ => constraint,
            };
            let size = self.measure_node(child, constraint, m);
            let awaiting_content = self.nodes[&id].props.has_item_template && self.nodes[&child].children.is_empty();
            if !awaiting_content {
            let prior = self
                .nodes
                .get_mut(&id)
                .unwrap()
                .repeater
                .measured
                .insert(key, size);
            if prior != Some(size) {
                self.dirty = true;
                self.nodes.get_mut(&id).unwrap().repeater.unsettled = true;
            }
            }
            if rtl {
                slot.x = inner.width - slot.x - slot.width;
            }
            slot.x += inner.x;
            slot.y += inner.y;
            self.arrange_node(child, slot, world, inherited, m);
            let scale = if q.is_scroll_center_scale_enabled {
                let viewport_center = viewport.y + viewport.height / 2.;
                let item_center = world
                    .point(slot.x + slot.width / 2., slot.y + slot.height / 2.)
                    .1;
                1. - (viewport_center - item_center).abs() * (0.25 / (viewport.height / 2.).max(1.))
            } else {
                1.
            };
            let n = self.nodes.get_mut(&child).unwrap();
            n.presentation.scale_x = scale;
            n.presentation.scale_y = scale;
            n.props.center_point = [slot.width / 2., slot.height / 2.];
            if q.is_scroll_center_scale_enabled {
                self.refresh_visual_tree(child, world, inherited.0, inherited.1, inherited.2);
            }
        }
        if let Some(index) = self.nodes[&id].repeater.pending_focus {
            if let Ok(Some(child)) = self.try_get_repeater_element(id, index) {
                let mut pending = vec![child];
                while let Some(c) = pending.pop() {
                    let n = &self.nodes[&c];
                    if n.props.is_tab_stop && n.enabled {
                        self.nodes.get_mut(&id).unwrap().repeater.pending_focus = None;
                        self.focus(Some(c));
                        break;
                    }
                    pending.extend(n.children.iter().rev().copied());
                }
            }
        }
        if changed {
            self.emit(id, EventKind::RealizationChanged);
        }
        // The host owns offsets. The repeater never draws a second scrollbar.
        let _ = scroll_parent;
    }
}

// Aspect-ratio line packing. Native-style public inputs are applied in Rust;
// the same slots drive realization, hit tests, bring-into-view and rendering.
fn lined_slots(l:&LinedFlowLayout,items:&[collections::CollectionData],sizes:&HashMap<String,[f64;2]>,available:[f64;2])->(Vec<Rect>,[f64;2]){
 let sample=items.first().and_then(|i|sizes.get(&i.id)).copied().unwrap_or([80.,80.]);let h=l.line_height.unwrap_or(sample[1]).max(1.);let width=if available[0].is_finite(){available[0].max(1.)}else{sample[0].max(1.)};
 let ratios=items.iter().map(|i|{let s=sizes.get(&i.id).copied().unwrap_or(sample);(s[0]/s[1].max(1.)).clamp(0.01,100.)}).collect::<Vec<_>>();
 // Balance contiguous lines by the proportional width adjustment. A final short
 // line keeps its natural widths; an overfull final line still shrinks to fit.
 let mut best=vec![(0usize,f64::INFINITY);items.len()+1];best[items.len()]=(0,0.);
 if l.items_stretch==LinedFlowLayoutItemsStretch::Fill{for start in (0..items.len()).rev(){let mut natural=0.;for end in start..items.len().min(start+256){natural+=ratios[end]*h;let count=end-start+1;let usable=(width-l.min_item_spacing*(count-1)as f64).max(1.);let adjustment=(natural/usable-1.).max(if end+1==items.len(){0.}else{-1.});let cost=adjustment*adjustment+best[end+1].1;if cost<best[start].1{best[start]=(count,cost)}if natural>width*2.&&count>1{break}}}}
 let mut slots=vec![];let mut index=0;let mut y=0.;let mut extent=0_f64;
 while index<items.len(){let count=if l.items_stretch==LinedFlowLayoutItemsStretch::Fill{best[index].0.max(1)}else{let mut natural=0.;let mut best=(1,f64::INFINITY);for i in index..items.len().min(index+256){natural+=ratios[i]*h;let used=natural+l.min_item_spacing*(i-index)as f64;let cost=(used-width).abs();if cost<best.1{best=(i-index+1,cost)}if used>width&&i>index{break}}best.0};let line=&ratios[index..index+count];let natural=line.iter().sum::<f64>()*h;let usable=(width-l.min_item_spacing*count.saturating_sub(1)as f64).max(0.);let free=(usable-natural).max(0.);let fill=l.items_stretch==LinedFlowLayoutItemsStretch::Fill&&(index+count<items.len()||natural>usable);let scale=if fill{usable/natural.max(1.)}else{1.};
 let(offset,gap)=if fill{(0.,0.)}else{match l.items_justification{LinedFlowLayoutItemsJustification::Start=>(0.,0.),LinedFlowLayoutItemsJustification::Center=>(free/2.,0.),LinedFlowLayoutItemsJustification::End=>(free,0.),LinedFlowLayoutItemsJustification::SpaceBetween=>(0.,if count>1{free/(count-1)as f64}else{0.}),LinedFlowLayoutItemsJustification::SpaceAround=>(free/count as f64/2.,free/count as f64),LinedFlowLayoutItemsJustification::SpaceEvenly=>(free/(count+1)as f64,free/(count+1)as f64)}};
 let mut x=offset;for ratio in line{let w=ratio*h*scale;slots.push(Rect::new(x,y,w,h));x+=w+l.min_item_spacing+gap;}extent=extent.max(x-l.min_item_spacing-gap);y+=h+l.line_spacing;index+=count;
 }
 (slots,[extent,(y-l.line_spacing).max(0.)])
}

impl Scene {pub fn repeater_item_bounds(&self,id:u32,index:usize)->Option<Rect>{self.nodes.get(&id)?.repeater.slots.get(index).copied()}}
