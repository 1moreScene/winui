//! CommunityToolkit Segmented, pinned source and extracted templates in references/segmented-*.
//! Item nodes are real Rust content containers; the host only projects their semantics.
use super::*;
use crate::{
    animation::Motion,
    render::Draw,
    resources::Resources,
    typography::{self, TextMeasurer},
};
use serde_json::{json, Value};
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, OnceLock};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum SourceItem {
    Text(String),
    Item(ItemData),
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default, deny_unknown_fields)]
pub struct ItemData {
    name: Option<String>,
    content: String,
    icon: String,
    enabled: bool,
    visible: bool,
    is_selected: bool,
}
impl Default for ItemData {
    fn default() -> Self {
        Self {
            name: None,
            content: String::new(),
            icon: String::new(),
            enabled: true,
            visible: true,
            is_selected: false,
        }
    }
}
impl SourceItem {
    fn key(&self, index: usize) -> (Option<&str>, usize) {
        match self {
            Self::Item(item) if item.name.is_some() => (item.name.as_deref(), 0),
            _ => (None, index),
        }
    }
    fn data(&self) -> ItemData {
        match self {
            Self::Text(content) => ItemData {
                content: content.clone(),
                ..Default::default()
            },
            Self::Item(data) => data.clone(),
        }
    }
}
pub(super) fn validate_source(kind: NodeKind, p: &NodeProperties) -> Result<(), String> {
    let Some(source) = &p.segmented_source else {
        return Ok(());
    };
    if kind != NodeKind::Segmented || source.len() > 1000 {
        return Err(
            "Segmented itemsSource requires a Segmented control and at most 1000 items".into(),
        );
    }
    let mut keys = HashSet::new();
    for (index, item) in source.iter().enumerate() {
        if !keys.insert(item.key(index)) {
            return Err("Duplicate Segmented itemsSource name".into());
        }
        let data = item.data();
        let props = NodeProperties {
            text: data.content,
            glyph: data.icon,
            ..NodeProperties::defaults(NodeKind::SegmentedItem)
        };
        props.validate(NodeKind::SegmentedItem)?;
    }
    Ok(())
}

fn contract() -> &'static Value {
    static DATA: OnceLock<Value> = OnceLock::new();
    DATA.get_or_init(|| {
        serde_json::from_str(include_str!("../../references/segmented-template.json")).unwrap()
    })
}
fn metric(key: &str) -> f64 {
    contract()["metrics"][key].as_f64().unwrap()
}
fn thickness(value: &Value, dpr: f64) -> [f64; 4] {
    overlays::border_thickness(std::array::from_fn(|i| value[i].as_f64().unwrap()), dpr)
}
fn inset(rect: Rect, inset: [f64; 4]) -> Rect {
    Rect::new(
        rect.x + inset[0],
        rect.y + inset[1],
        (rect.width - inset[0] - inset[2]).max(0.),
        (rect.height - inset[1] - inset[3]).max(0.),
    )
}

#[derive(Clone, Copy, Default)]
struct ItemTemplate {
    holder: [f64; 4],
    icon_margin: [f64; 4],
    content_margin: [f64; 4],
    icon_size: f64,
    gap: f64,
    max_width: f64,
    icon_top: bool,
    stacked: bool,
    border: f64,
}
impl ItemTemplate {
    fn new(style: SegmentedStyle, vertical: bool, icon: bool, content: bool, dpr: f64) -> Self {
        // Pivot has a vertical indicator state, but only Default defines IconTop.
        let icon_top = style == SegmentedStyle::Default && vertical && icon && content;
        let data = &contract()["layouts"][if icon_top { "IconTop" } else { style.as_str() }];
        let border = (data["border"].as_f64().unwrap() * dpr).round_ties_even() / dpr;
        Self {
            holder: thickness(&data["holderMargin"], dpr).map(|side| side + border),
            icon_margin: if icon {
                thickness(&data["iconMargin"], dpr)
            } else {
                [0.; 4]
            },
            content_margin: if content {
                thickness(&data["contentMargin"], dpr)
            } else {
                [0.; 4]
            },
            icon_size: if icon {
                data["iconWidth"].as_f64().unwrap()
            } else {
                0.
            },
            gap: if icon && content {
                data["spacing"].as_f64().unwrap()
            } else {
                0.
            },
            max_width: data["maxWidth"].as_f64().unwrap_or(f64::INFINITY),
            icon_top,
            stacked: icon_top || style == SegmentedStyle::Pivot,
            border,
        }
    }
    fn icon_space(self) -> [f64; 2] {
        [
            self.icon_size + self.icon_margin[0] + self.icon_margin[2],
            self.icon_size + self.icon_margin[1] + self.icon_margin[3],
        ]
    }
    fn content_constraint(self, size: [f64; 2]) -> [f64; 2] {
        let icon = self.icon_space();
        let width = size[0]
            - self.holder[0]
            - self.holder[2]
            - self.content_margin[0]
            - self.content_margin[2];
        let height = size[1]
            - self.holder[1]
            - self.holder[3]
            - self.content_margin[1]
            - self.content_margin[3];
        [
            (width - if self.stacked { 0. } else { icon[0] + self.gap })
                .max(0.)
                .min(self.max_width),
            (height - if self.stacked { icon[1] + self.gap } else { 0. }).max(0.),
        ]
    }
    fn desired(self, content: [f64; 2]) -> [f64; 2] {
        let icon = self.icon_space();
        let width = content[0] + self.content_margin[0] + self.content_margin[2];
        let height = content[1] + self.content_margin[1] + self.content_margin[3];
        let size = if self.stacked {
            [icon[0].max(width), icon[1] + height + self.gap]
        } else {
            [icon[0] + width + self.gap, icon[1].max(height)]
        };
        [
            size[0] + self.holder[0] + self.holder[2],
            size[1] + self.holder[1] + self.holder[3],
        ]
    }
    fn arrange(self, rect: Rect, desired: [f64; 2], rtl: bool) -> (Rect, Rect) {
        let holder = inset(rect, self.holder);
        let icon = self.icon_space();
        let available = self.content_constraint([rect.width, rect.height]);
        let width = desired[0].min(available[0]);
        let height = desired[1].min(available[1]);
        if self.stacked {
            let icon_rect = Rect::new(
                holder.x + (holder.width - icon[0]) / 2.,
                holder.y,
                icon[0],
                icon[1],
            );
            let content_width = width + self.content_margin[0] + self.content_margin[2];
            let content_rect = Rect::new(
                holder.x + (holder.width - content_width) / 2.,
                holder.y + icon[1] + self.gap,
                content_width,
                height + self.content_margin[1] + self.content_margin[3],
            );
            return (
                inset(content_rect, self.content_margin),
                inset(icon_rect, self.icon_margin),
            );
        }
        let content_width = width + self.content_margin[0] + self.content_margin[2];
        let content_height = height + self.content_margin[1] + self.content_margin[3];
        let x = holder.x + (holder.width - content_width - icon[0] - self.gap) / 2.;
        let content = Rect::new(
            x + if rtl { 0. } else { icon[0] + self.gap },
            holder.y + (holder.height - content_height) / 2.,
            content_width,
            content_height,
        );
        let glyph = Rect::new(
            x + if rtl { content_width + self.gap } else { 0. },
            holder.y + (holder.height - icon[1]) / 2.,
            icon[0],
            icon[1],
        );
        (
            inset(content, self.content_margin),
            inset(glyph, self.icon_margin),
        )
    }
}
fn resource_key(theme: Theme, key: &str) -> &str {
    let palette = if theme == Theme::Light {
        "Light"
    } else if theme == Theme::HighContrast {
        "HighContrast"
    } else {
        "Default"
    };
    let alias = contract()["palettes"][palette][key].as_str().unwrap_or(key);
    // The upstream ButtonItemBackgroundPressed alias omits the Brush suffix.
    if alias == "SubtleFillColorTertiary" {
        "SubtleFillColorTertiaryBrush"
    } else {
        alias
    }
}
fn brush(theme: Theme, key: &str) -> String {
    let alias = resource_key(theme, key);
    if matches!(
        alias,
        "ControlFillColorTransparentBrush" | "SystemControlTransparentBrush"
    ) {
        return "#00000000".into();
    }
    if theme == Theme::HighContrast {
        let system_color = alias.strip_suffix("Brush").unwrap_or(alias);
        if let Some(color) = contract()["systemColors"][system_color].as_str() {
            return color.into();
        }
        let compatibility = match alias {
            "SystemControlHighlightAccentBrush" => Some("SystemColorHighlightColor"),
            "SystemControlHighlightAltChromeWhiteBrush" => Some("SystemColorHighlightTextColor"),
            "SystemControlDisabledBaseMediumLowBrush" => Some("SystemColorGrayTextColor"),
            "SystemControlBackgroundBaseLowBrush" => Some("SystemColorButtonFaceColor"),
            _ => None,
        };
        if let Some(key) = compatibility {
            return contract()["systemColors"][key].as_str().unwrap().into();
        }
    }
    Resources::current()
        .resolve(theme, alias)
        .unwrap_or_else(|_| panic!("Unmapped Segmented resource {key}: {alias}"))
        .solid_color()
}
#[derive(Default)]
pub(super) struct State {
    source: Option<Arc<Vec<SourceItem>>>,
    generated: Vec<u32>,
    generating: bool,
    pub(super) requested_index: Option<i32>,
    initialized: bool,
    last_index: i32,
    selected: Vec<u32>,
    anchor: Option<u32>,
    pub(super) tab_stop: bool,
    pill: Motion,
    pill_opacity: Motion,
    scale: Motion,
    opacity: Motion,
    background: selection_input::ColorTrack,
    hover_background: selection_input::ColorTrack,
    visual_initialized: bool,
    foreground: String,
    icon: typography::TextLayout,
    template: ItemTemplate,
    icon_slot: Rect,
    content_slot: Rect,
    content_desired: [f64; 2],
}
impl State {
    pub fn active(&self, time: f64) -> bool {
        self.pill.active(time)
            || self.pill_opacity.active(time)
            || self.scale.active(time)
            || self.opacity.active(time)
            || self.background.active(time)
            || self.hover_background.active(time)
    }
}
pub(super) fn defaults(kind: NodeKind, p: &mut NodeProperties) {
    if !matches!(kind, NodeKind::Segmented | NodeKind::SegmentedItem) {
        return;
    }
    p.padding = [0.; 4];
    p.corner_radius = 4.;
    p.clip = true;
    p.horizontal_alignment = if kind == NodeKind::Segmented {
        HorizontalAlignment::Left
    } else {
        HorizontalAlignment::Stretch
    };
    p.vertical_alignment = if kind == NodeKind::Segmented {
        VerticalAlignment::Center
    } else {
        VerticalAlignment::Stretch
    };
    p.orientation = Orientation::Horizontal;
    p.is_tab_stop = kind == NodeKind::SegmentedItem;
}
impl Scene {
    pub(super) fn can_add_segmented_item(&self, parent: u32) -> bool {
        let node = &self.nodes[&parent];
        node.props.segmented_source.is_none() || node.segmented.generating
    }
    pub(super) fn validate_segmented_source_update(
        &self,
        id: u32,
        p: &NodeProperties,
    ) -> Result<(), String> {
        let node = &self.nodes[&id];
        if p.segmented_source.is_some()
            && node.children.iter().any(|child| {
                !node.segmented.generated.contains(child)
                    && self.nodes[child].kind == NodeKind::SegmentedItem
            })
        {
            return Err("Use SegmentedItem children or itemsSource".into());
        }
        Ok(())
    }
    fn sync_segmented_source(&mut self, id: u32) {
        let node = &self.nodes[&id];
        let next = node.props.segmented_source.clone();
        if next == node.segmented.source {
            return;
        }
        let old = node.segmented.source.clone();
        let generated = node.segmented.generated.clone();
        let mut existing = HashMap::new();
        if let Some(old) = &old {
            for (index, (item, child)) in old.iter().zip(&generated).enumerate() {
                if self.nodes.contains_key(child) {
                    existing.insert(item.key(index), (*child, item));
                }
            }
        }
        let mut children = Vec::new();
        self.nodes.get_mut(&id).unwrap().segmented.generating = true;
        if let Some(source) = &next {
            for (index, item) in source.iter().enumerate() {
                let data = item.data();
                let mut patch = json!({"text":data.content,"glyph":data.icon,"enabled":data.enabled,"visible":data.visible});
                if let Some((child, previous)) = existing.remove(&item.key(index)) {
                    if previous.data().is_selected != data.is_selected {
                        patch["isSelected"] = json!(data.is_selected);
                    }
                    if previous != item {
                        let _ = self.update(vec![Update { id: child, patch }]);
                    }
                    children.push(child);
                } else {
                    patch["isSelected"] = json!(data.is_selected);
                    if let Ok(child) = self.create(id, NodeKind::SegmentedItem, patch) {
                        children.push(child);
                    }
                }
            }
        }
        for (child, _) in existing.into_values() {
            let _ = self.destroy(child);
        }
        let n = self.nodes.get_mut(&id).unwrap();
        n.children
            .retain(|child| !generated.contains(child) && !children.contains(child));
        n.children.extend(&children);
        n.segmented.generated = children;
        n.segmented.source = next;
        n.segmented.generating = false;
        self.invalidate(id, true);
    }
    fn segmented_items(&self, id: u32) -> Vec<u32> {
        self.ordered_children(id)
            .into_iter()
            .filter(|c| self.nodes[c].kind == NodeKind::SegmentedItem)
            .collect()
    }
    fn segmented_style(&self, id: u32) -> SegmentedStyle {
        let n = &self.nodes[&id];
        if n.kind == NodeKind::Segmented {
            n.props.segmented_style
        } else {
            n.parent
                .map(|p| self.nodes[&p].props.segmented_style)
                .unwrap_or_default()
        }
    }
    fn segmented_vertical(&self, id: u32) -> bool {
        let n = &self.nodes[&id];
        (if n.kind == NodeKind::Segmented {
            n.props.orientation
        } else {
            n.parent
                .map(|p| self.nodes[&p].props.orientation)
                .unwrap_or_default()
        }) == Orientation::Vertical
    }
    fn set_segmented_selection(&mut self, id: u32, selected: Vec<u32>) {
        let items = self.segmented_items(id);
        let old = self.nodes[&id].segmented.selected.clone();
        let mode = self.nodes[&id].props.selection_mode;
        let mut selected: Vec<_> = selected.into_iter().filter(|i| items.contains(i)).collect();
        selected.sort_by_key(|i| items.iter().position(|c| c == i));
        selected.dedup();
        if mode == ListViewSelectionMode::None {
            selected.clear();
        }
        if mode == ListViewSelectionMode::Single {
            selected.truncate(1);
        }
        let index = selected
            .first()
            .and_then(|i| items.iter().position(|c| c == i))
            .map_or(-1, |i| i as i32);
        for child in &items {
            self.nodes.get_mut(child).unwrap().props.is_selected = selected.contains(child);
        }
        let keys: Vec<_> = selected
            .iter()
            .map(|i| {
                if self.nodes[i].props.name.is_empty() {
                    i.to_string()
                } else {
                    self.nodes[i].props.name.clone()
                }
            })
            .collect();
        let n = self.nodes.get_mut(&id).unwrap();
        n.props.selected_index = index;
        n.props.selected_keys = Arc::new(keys.clone());
        n.segmented.last_index = index;
        n.segmented.initialized = true;
        n.segmented.selected = selected.clone();
        if old.len() != selected.len() || old.iter().any(|item| !selected.contains(item)) {
            self.emit(id, EventKind::SelectionChanged);
            let event = self.events.last_mut().unwrap();
            event.selected_index = Some(index);
            event.selected_keys = Some(keys);
            event.payload = Some(
                json!({"selectedIndices": selected.iter().filter_map(|i| items.iter().position(|c| c==i)).collect::<Vec<_>>(),
                "addedItems": selected.iter().filter(|i| !old.contains(i)).collect::<Vec<_>>(),
                "removedItems": old.iter().filter(|i| !selected.contains(i)).collect::<Vec<_>>() }),
            );
            self.invalidate(id, false);
        }
    }
    pub(super) fn sync_segmented(&mut self) {
        let controls: Vec<_> = self
            .nodes
            .values()
            .filter(|n| n.kind == NodeKind::Segmented)
            .map(|n| n.id)
            .collect();
        for id in controls {
            self.sync_segmented_source(id);
            let items = self.segmented_items(id);
            if items.is_empty() && !self.nodes[&id].segmented.initialized {
                continue;
            }
            let requested = self
                .nodes
                .get_mut(&id)
                .unwrap()
                .segmented
                .requested_index
                .take();
            let n = &self.nodes[&id];
            let index = requested.unwrap_or(n.props.selected_index);
            let mut selected = n.segmented.selected.clone();
            let declared: Vec<_> = items
                .iter()
                .filter(|i| self.nodes[i].props.is_selected)
                .copied()
                .collect();
            if requested.is_some() || !n.segmented.initialized || index != n.segmented.last_index {
                if index >= 0 {
                    selected = items.get(index as usize).copied().into_iter().collect();
                } else {
                    selected = if n.segmented.initialized {
                        vec![]
                    } else {
                        declared
                    };
                }
            } else if declared
                != selected
                    .iter()
                    .filter(|i| items.contains(i))
                    .copied()
                    .collect::<Vec<_>>()
            {
                selected = declared;
                if n.props.selection_mode == ListViewSelectionMode::Single {
                    if let Some(new) = selected
                        .iter()
                        .find(|i| !n.segmented.selected.contains(i))
                        .copied()
                    {
                        selected = vec![new];
                    }
                }
            }
            self.set_segmented_selection(id, selected);
            let focusable = |item: &u32| {
                self.effective_enabled(*item)
                    && self.nodes[item].props.visible
                    && self.nodes[item].props.is_tab_stop
            };
            let preferred = self
                .focused
                .filter(|item| items.contains(item) && focusable(item))
                .or_else(|| {
                    self.nodes[&id]
                        .segmented
                        .selected
                        .iter()
                        .find(|item| focusable(item))
                        .copied()
                })
                .or_else(|| items.iter().find(|item| focusable(item)).copied());
            for child in items {
                self.nodes.get_mut(&child).unwrap().segmented.tab_stop = Some(child) == preferred;
            }
        }
    }
    pub(super) fn activate_segmented(&mut self, item: u32) -> Result<(), String> {
        let Some(id) = self.nodes[&item].parent else {
            return Ok(());
        };
        if !self.effective_enabled(item) {
            return Ok(());
        }
        let items = self.segmented_items(id);
        let index = items.iter().position(|c| *c == item).unwrap();
        let mode = self.nodes[&id].props.selection_mode;
        let mut selected = self.nodes[&id].segmented.selected.clone();
        if mode == ListViewSelectionMode::None {
            return Ok(());
        }
        if mode == ListViewSelectionMode::Extended && self.segmented_modifiers.1 {
            let anchor = self.nodes[&id]
                .segmented
                .anchor
                .and_then(|anchor| items.iter().position(|item| *item == anchor))
                .unwrap_or(index);
            if !self.segmented_modifiers.0 {
                selected.clear();
            }
            selected.extend(
                items[anchor.min(index)..=anchor.max(index)]
                    .iter()
                    .filter(|i| self.effective_enabled(**i) && self.nodes[i].props.visible)
                    .copied(),
            );
        } else if mode == ListViewSelectionMode::Multiple
            || (mode == ListViewSelectionMode::Extended && self.segmented_modifiers.0)
        {
            if selected.contains(&item) {
                selected.retain(|c| *c != item);
            } else {
                selected.push(item);
            }
            self.nodes.get_mut(&id).unwrap().segmented.anchor = Some(item);
        } else {
            selected = vec![item];
            self.nodes.get_mut(&id).unwrap().segmented.anchor = Some(item);
        }
        self.set_segmented_selection(id, selected);
        self.sync_segmented();
        Ok(())
    }
    pub(super) fn segmented_focus_changed(&mut self, item: u32) {
        if self.nodes[&item].kind != NodeKind::SegmentedItem {
            return;
        }
        if let Some(id) = self.nodes[&item].parent {
            if self.nodes[&id].props.single_selection_follows_focus
                && self.nodes[&id].props.selection_mode == ListViewSelectionMode::Single
            {
                self.set_segmented_selection(id, vec![item]);
            }
        }
    }
    pub(super) fn segmented_input(&mut self, input: &Input) -> Result<bool, String> {
        if let Input::Modifiers { ctrl, shift } = input {
            self.segmented_modifiers = (*ctrl, *shift);
            return Ok(false);
        }
        let Input::KeyDown { key, .. } = input else {
            return Ok(false);
        };
        let Some(item) = self
            .focused
            .filter(|i| self.nodes[i].kind == NodeKind::SegmentedItem)
        else {
            return Ok(false);
        };
        let id = self.nodes[&item].parent.unwrap();
        if !self.effective_enabled(item) {
            return Ok(false);
        }
        let items = self.segmented_items(id);
        let index = items.iter().position(|c| *c == item).unwrap() as i32;
        let rtl = self.effective_flow_direction(id) == FlowDirection::RightToLeft;
        let step = match key.as_str() {
            "ArrowLeft" => {
                if rtl {
                    1
                } else {
                    -1
                }
            }
            "ArrowRight" => {
                if rtl {
                    -1
                } else {
                    1
                }
            }
            "ArrowUp" => -1,
            "ArrowDown" => 1,
            "Home" => -1,
            "End" => 1,
            _ => return Ok(false),
        };
        let mut next = if key == "Home" {
            0
        } else if key == "End" {
            items.len() as i32 - 1
        } else {
            index + step
        };
        while next >= 0 && next < items.len() as i32 {
            let target = items[next as usize];
            if self.effective_enabled(target) && self.nodes[&target].props.visible {
                self.focus(Some(target));
                break;
            }
            next += step;
        }
        self.invalidate(id, false);
        Ok(true)
    }
    pub(super) fn measure_segmented(
        &mut self,
        id: u32,
        available: [f64; 2],
        m: &mut impl TextMeasurer,
    ) -> [f64; 2] {
        let vertical = self.segmented_vertical(id);
        let style = self.segmented_style(id);
        let axis = usize::from(vertical);
        if self.nodes[&id].kind == NodeKind::Segmented {
            let items: Vec<_> = self
                .segmented_items(id)
                .into_iter()
                .filter(|i| self.nodes[i].props.visible)
                .collect();
            if items.is_empty() {
                return [0.; 2];
            }
            let gap = metric(if style == SegmentedStyle::Button {
                "buttonSpacing"
            } else {
                "spacing"
            });
            let mut result: [f64; 2] = [0.; 2];
            let mut largest: f64 = 0.;
            for child in &items {
                let d = self.measure_node(*child, available, m);
                result[axis] += d[axis];
                largest = largest.max(d[axis]);
                result[1 - axis] = result[1 - axis].max(d[1 - axis]);
            }
            if style == SegmentedStyle::Default {
                let stretch = if vertical {
                    self.nodes[&id].props.vertical_alignment == VerticalAlignment::Stretch
                } else {
                    self.nodes[&id].props.horizontal_alignment == HorizontalAlignment::Stretch
                };
                result[axis] = if stretch && available[axis].is_finite() {
                    available[axis]
                } else {
                    largest * items.len() as f64 + gap * (items.len() - 1) as f64
                };
            } else {
                result[axis] += gap * (items.len() - 1) as f64;
            }
            return result;
        }
        let p = self.nodes[&id].props.clone();
        let children = self.ordered_children(id);
        let has_content =
            !p.text.is_empty() || children.iter().any(|child| self.nodes[child].props.visible);
        let template =
            ItemTemplate::new(style, vertical, !p.glyph.is_empty(), has_content, self.dpr);
        let constraint = template.content_constraint(available);
        let text = typography::layout(
            &p.text,
            &p.font(),
            constraint[0],
            false,
            p.trimming,
            p.line_height,
            m,
        );
        let mut content = if p.text.is_empty() {
            [0.; 2]
        } else {
            [text.width, text.height]
        };
        for child in children {
            let desired = self.measure_node(child, constraint, m);
            content[0] = content[0].max(desired[0]);
            content[1] = content[1].max(desired[1]);
        }
        let glyph = if template.icon_size > 0. {
            let mut font = p.font();
            font.family = "Segoe Fluent Icons".into();
            font.size = template.icon_size;
            let metrics = m.measure(&p.glyph, &font);
            typography::layout(
                &p.glyph,
                &font,
                f64::INFINITY,
                false,
                TextTrimming::Clip,
                Some(metrics.ascent + metrics.descent),
                m,
            )
        } else {
            Default::default()
        };
        let n = self.nodes.get_mut(&id).unwrap();
        n.text = text;
        n.segmented.icon = glyph;
        n.segmented.template = template;
        n.segmented.content_desired = content;
        template.desired(content)
    }
    pub(super) fn arrange_segmented(&mut self, id: u32, r: Rect, m: &mut impl TextMeasurer) {
        let n = &self.nodes[&id];
        let world = n.world;
        let state = (n.theme, n.enabled, n.visible);
        if n.kind == NodeKind::SegmentedItem {
            let rtl = self.effective_flow_direction(id) == FlowDirection::RightToLeft;
            let (content, icon) = n
                .segmented
                .template
                .arrange(r, n.segmented.content_desired, rtl);
            let visual = &mut self.nodes.get_mut(&id).unwrap().segmented;
            visual.content_slot = content;
            visual.icon_slot = icon;
            for child in self.ordered_children(id) {
                self.arrange_node(child, content, world, state, m);
            }
            return;
        }
        let vertical = self.segmented_vertical(id);
        let style = self.segmented_style(id);
        let axis = usize::from(vertical);
        let items: Vec<_> = self
            .segmented_items(id)
            .into_iter()
            .filter(|i| self.nodes[i].props.visible)
            .collect();
        if items.is_empty() {
            return;
        }
        let gap = metric(if style == SegmentedStyle::Button {
            "buttonSpacing"
        } else {
            "spacing"
        });
        let extent = if vertical { r.height } else { r.width };
        let equal = ((extent - gap * (items.len() - 1) as f64) / items.len() as f64).max(0.);
        let rtl = !vertical && self.effective_flow_direction(id) == FlowDirection::RightToLeft;
        let mut position = 0.;
        for child in items {
            let desired = self.nodes[&child].desired;
            let length = if style == SegmentedStyle::Default {
                equal
            } else {
                desired[axis]
            };
            let offset = if rtl {
                extent - position - length
            } else {
                position
            };
            let slot = if vertical {
                Rect::new(r.x, r.y + offset, r.width, length)
            } else {
                Rect::new(r.x + offset, r.y, length, r.height)
            };
            self.arrange_node(child, slot, world, state, m);
            position += length + gap;
        }
    }
    pub(super) fn sync_segmented_visual(&mut self, id: u32) -> f64 {
        let style = self.segmented_style(id);
        let node = &self.nodes[&id];
        let theme = node.theme;
        let time = self.time;
        let selected = node.props.is_selected;
        let enabled = node.enabled;
        let pressed = enabled && node.button.pressed;
        let hovered = enabled && node.button.pointer_inside;
        let state = if pressed {
            "Pressed"
        } else if hovered {
            "PointerOver"
        } else {
            ""
        };
        let prefix = match style {
            SegmentedStyle::Default => "SegmentedItem",
            SegmentedStyle::Pivot => "PivotItem",
            SegmentedStyle::Button => "ButtonItem",
        };
        let selected_state = if !selected {
            state
        } else if style != SegmentedStyle::Button {
            "Selected"
        } else if pressed {
            "SelectedPressed"
        } else if hovered {
            "SelectedPointerOver"
        } else {
            "Selected"
        };
        let root_state = if style == SegmentedStyle::Default && !selected {
            ""
        } else {
            selected_state
        };
        let fg_state = if style == SegmentedStyle::Pivot && selected && !state.is_empty() {
            state
        } else {
            selected_state
        };
        let foreground = node
            .props
            .foreground
            .as_ref()
            .map(|value| Self::color(value, theme))
            .unwrap_or_else(|| brush(theme, &format!("{prefix}Foreground{fg_state}")));
        let background = brush(theme, &format!("{prefix}Background{root_state}"));
        let hover = if style == SegmentedStyle::Default && !selected && !state.is_empty() {
            brush(theme, &format!("SegmentedItemBackground{state}"))
        } else {
            "#00000000".into()
        };
        let snap = self.reduced_motion
            || theme == Theme::HighContrast
            || !node.segmented.visual_initialized;
        let visual = &mut self.nodes.get_mut(&id).unwrap().segmented;
        visual.foreground = foreground;
        visual.background.update_duration(
            &background,
            time,
            snap || style == SegmentedStyle::Pivot,
            metric("brushMs"),
        );
        visual
            .hover_background
            .update_duration(&hover, time, snap, metric("brushMs"));
        let curve = std::array::from_fn(|i| contract()["metrics"]["curve"][i].as_f64().unwrap());
        let has_pill = selected && style != SegmentedStyle::Button;
        let pill_scale = if has_pill {
            metric(if pressed {
                "pressedPillScale"
            } else {
                "pillScale"
            })
        } else {
            1.
        };
        // Leaving the selected states removes their storyboard and restores the base rectangle.
        retarget(
            &mut visual.pill,
            pill_scale,
            time,
            metric("scaleMs"),
            curve,
            snap || !has_pill,
        );
        retarget(
            &mut visual.pill_opacity,
            if has_pill { 1. } else { 0. },
            time,
            metric("scaleMs"),
            curve,
            snap || !has_pill,
        );
        let scale = if pressed && !selected && style == SegmentedStyle::Default {
            metric("pressScale")
        } else {
            1.
        };
        retarget(
            &mut visual.scale,
            scale,
            time,
            metric("scaleMs"),
            curve,
            snap,
        );
        retarget(
            &mut visual.opacity,
            if enabled {
                1.
            } else {
                metric("disabledOpacity")
            },
            time,
            metric("disabledMs"),
            [0., 0., 1., 1.],
            snap,
        );
        visual.visual_initialized = true;
        visual.opacity.value(time)
    }
    pub(super) fn paint_segmented(&self, id: u32, out: &mut Vec<Draw>) -> String {
        let style = self.segmented_style(id);
        let node = &self.nodes[&id];
        let p = &node.props;
        let theme = node.theme;
        let rect = Rect::new(0., 0., node.rect.width, node.rect.height);
        if node.kind == NodeKind::Segmented {
            if style == SegmentedStyle::Default {
                let width = overlays::border_thickness([metric("border"); 4], self.dpr)[0];
                if p.background.is_none() {
                    fill_inside(
                        out,
                        rect,
                        p.corner_radius,
                        width,
                        brush(theme, "SegmentedBackground"),
                    );
                }
                let border = Resources::current()
                    .resolve(theme, resource_key(theme, "SegmentedBorderBrush"))
                    .unwrap();
                paint_border(out, rect, p.corner_radius, width, border);
            }
            return p
                .foreground
                .as_ref()
                .map(|v| Self::color(v, theme))
                .unwrap_or_else(|| brush(theme, "TextFillColorPrimaryBrush"));
        }
        let visual = &node.segmented;
        let fg = &visual.foreground;
        let border_width = visual.template.border;
        if p.background.is_none() || p.is_selected {
            fill_inside(
                out,
                rect,
                p.corner_radius,
                border_width,
                visual.background.value(self.time),
            );
        }
        if style == SegmentedStyle::Default {
            if p.is_selected {
                let key = resource_key(theme, "SegmentedItemBorderBrushSelected");
                let border = Resources::current().resolve(theme, key).unwrap();
                paint_border(out, rect, p.corner_radius, border_width, border);
            }
            let color = visual.hover_background.value(self.time);
            if crate::material::rgba(&color)[3] > 0. {
                let siblings = self.segmented_items(node.parent.unwrap());
                let position = if siblings.first() == Some(&id) {
                    0
                } else if siblings.last() == Some(&id) {
                    2
                } else {
                    1
                };
                let margin_value = if visual.template.icon_top {
                    &contract()["layouts"]["IconTop"]["hoverMargin"]
                } else {
                    &contract()["metrics"]["hoverMargins"][position]
                };
                let mut margin = thickness(margin_value, self.dpr).map(|v| v + border_width);
                if self.effective_flow_direction(id) == FlowDirection::RightToLeft {
                    margin.swap(0, 2);
                }
                let surface = inset(rect, margin);
                let scale = visual.scale.value(self.time);
                out.push(Draw::Save);
                out.push(Draw::Transform {
                    matrix: [
                        scale,
                        0.,
                        0.,
                        scale,
                        (surface.x + surface.width / 2.) * (1. - scale),
                        (surface.y + surface.height / 2.) * (1. - scale),
                    ],
                });
                out.push(Draw::Fill {
                    rect: surface,
                    color,
                    radius: p.corner_radius,
                });
                out.push(Draw::Restore);
            }
        }
        if !p.glyph.is_empty() {
            let slot = visual.icon_slot;
            let mut font = p.font();
            font.family = "Segoe Fluent Icons".into();
            font.size = slot.height;
            let glyph = &visual.icon;
            let bounds = Rect::new(
                slot.x + (slot.width - glyph.width) / 2.,
                slot.y + (slot.height - glyph.height) / 2.,
                slot.width,
                slot.height,
            );
            draw_text(out, glyph, &font, fg, bounds);
        }
        if !p.text.is_empty() {
            draw_text(out, &node.text, &p.font(), fg, visual.content_slot);
        }
        let opacity = visual.pill_opacity.value(self.time);
        if opacity > 0. {
            let scale = visual.pill.value(self.time);
            let width = metric("pillWidth");
            let height = metric("pillHeight");
            let length = width * scale;
            let radius = &contract()["metrics"]["pillRadius"];
            let (rx, ry) = (
                radius[0].as_f64().unwrap() * scale,
                radius[1].as_f64().unwrap(),
            );
            let (pill, radii) = if self.segmented_vertical(id) {
                // The XAML transform origin is top center for Default and bottom center for Pivot.
                let origin = if style == SegmentedStyle::Pivot {
                    height
                } else {
                    0.
                };
                let offset = border_width + width / 2. + origin - height;
                let rtl = self.effective_flow_direction(id) == FlowDirection::RightToLeft;
                let x = if rtl {
                    rect.width - offset - height
                } else {
                    offset
                };
                (
                    Rect::new(
                        x,
                        (rect.height - height) / 2. + origin - length / 2.,
                        height,
                        length,
                    ),
                    [ry, rx],
                )
            } else {
                (
                    Rect::new(
                        (rect.width - length) / 2.,
                        rect.height - border_width - height,
                        length,
                        height,
                    ),
                    [rx, ry],
                )
            };
            let state = if style == SegmentedStyle::Default && node.enabled && node.button.pressed {
                "Pressed"
            } else if style == SegmentedStyle::Default && node.enabled && node.button.pointer_inside
            {
                "PointerOver"
            } else {
                ""
            };
            let key = if style == SegmentedStyle::Pivot {
                "PivotItemPillBackground"
            } else {
                "SegmentedPillBackground"
            };
            let mut color = crate::material::rgba(&brush(theme, &format!("{key}{state}")));
            color[3] *= opacity;
            out.push(Draw::CornerClip {
                rect: pill,
                radii: [radii; 4],
            });
            out.push(Draw::Fill {
                rect: pill,
                color: crate::material::css(color),
                radius: 0.,
            });
            out.push(Draw::Restore);
        }
        fg.clone()
    }
}
fn retarget(
    motion: &mut Motion,
    value: f64,
    time: f64,
    duration: f64,
    curve: [f64; 4],
    snap: bool,
) {
    motion.curve = curve;
    if snap {
        motion.snap(value);
    } else if motion.to != value {
        motion.retarget(value, time, duration);
    }
}
fn fill_inside(out: &mut Vec<Draw>, rect: Rect, radius: f64, width: f64, color: String) {
    out.push(Draw::Fill {
        rect: inset(rect, [width; 4]),
        color,
        radius: (radius - width).max(0.),
    });
}
fn paint_border(
    out: &mut Vec<Draw>,
    rect: Rect,
    radius: f64,
    width: f64,
    brush: &crate::resources::Brush,
) {
    if width <= 0. {
        return;
    }
    if brush.kind == "solid" {
        out.push(Draw::Border {
            rect,
            thickness: [width; 4],
            radius: [radius; 4],
            color: brush.solid_color(),
            background: None,
        });
        return;
    }
    use kurbo::Shape;
    // Fill the border ring inside the bounds. A centered stroke would lose half its width to the item clip.
    let shape = |r: Rect, radius: f64| {
        kurbo::RoundedRect::new(r.x, r.y, r.x + r.width, r.y + r.height, radius).to_path(0.01)
    };
    let mut ring = shape(rect, radius);
    let inner = inset(rect, [width; 4]);
    if inner.width > 0. && inner.height > 0. {
        ring.extend(
            shape(inner, (radius - width).max(0.))
                .elements()
                .iter()
                .copied(),
        );
    }
    out.push(Draw::PathBrush {
        rect,
        geometry: crate::icons::PathGeometry::from_bez(&ring, true),
        brush: Box::new(brush.clone()),
    });
}
fn draw_text(
    out: &mut Vec<Draw>,
    layout: &typography::TextLayout,
    font: &typography::Font,
    color: &str,
    r: Rect,
) {
    for line in &layout.lines {
        out.push(Draw::Text {
            style: font.style,
            x: r.x,
            y: r.y + line.baseline,
            text: line.text.clone(),
            color: color.into(),
            size: font.size,
            font: font.family.clone(),
            weight: font.weight,
            max_width: r.width,
        });
    }
}
