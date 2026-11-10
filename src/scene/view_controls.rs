//! Cross-platform view and commanding models. Sources are pinned in
//! references/view-command-sources.json; public UICommand/StandardCommand
//! implement WinUI XamlUICommand/StandardUICommand without an XAML dependency.
use super::*;
use crate::animation::Motion;
use serde_json::{json, Value};

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
#[derive(PartialEq)]
pub struct SwipeItems {
    pub mode: SwipeMode,
    pub items: Vec<SwipeItem>,
}
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
#[derive(PartialEq)]
pub struct SwipeItem {
    pub id: String,
    pub text: String,
    pub icon_symbol: Option<Symbol>,
    pub background: Option<BrushValue>,
    pub foreground: Option<BrushValue>,
    pub command: Option<u32>,
    pub command_parameter: Value,
}

pub(super) fn contract() -> &'static Value {
    static IR: std::sync::OnceLock<Value> = std::sync::OnceLock::new();
    IR.get_or_init(|| {
        serde_json::from_str(include_str!("../../references/view-command-template.json")).unwrap()
    })
}
pub(crate) fn pane_color(theme: Theme, key: &str) -> String {
    contract()["palettes"][theme.as_str()][key]["color"]
        .as_str()
        .unwrap()
        .into()
}

pub fn is_view(kind: NodeKind) -> bool {
    matches!(
        kind,
        NodeKind::SplitView
            | NodeKind::SemanticZoom
            | NodeKind::ParallaxView
            | NodeKind::SwipeControl
    )
}
pub fn is_command(kind: NodeKind) -> bool {
    matches!(kind, NodeKind::UICommand | NodeKind::StandardCommand)
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
#[derive(PartialEq)]
pub struct ViewProperties {
    pub left_items: Option<SwipeItems>,
    pub right_items: Option<SwipeItems>,
    pub top_items: Option<SwipeItems>,
    pub bottom_items: Option<SwipeItems>,
    pub slot: ViewControlSlot,
    pub is_pane_open: bool,
    pub display_mode: SplitViewDisplayMode,
    pub pane_placement: SplitViewPanePlacement,
    pub open_pane_length: f64,
    pub compact_pane_length: f64,
    pub pane_background: Option<BrushValue>,
    pub light_dismiss_overlay_mode: LightDismissOverlayMode,
    pub is_zoomed_in_view_active: bool,
    pub can_change_views: bool,
    pub is_zoom_out_button_enabled: bool,
    pub source: Option<u32>,
    pub horizontal_shift: f64,
    pub vertical_shift: f64,
    pub max_horizontal_shift_ratio: f64,
    pub max_vertical_shift_ratio: f64,
    pub is_horizontal_shift_clamped: bool,
    pub is_vertical_shift_clamped: bool,
    pub horizontal_source_offset_kind: ParallaxSourceOffsetKind,
    pub vertical_source_offset_kind: ParallaxSourceOffsetKind,
    pub horizontal_source_start_offset: f64,
    pub horizontal_source_end_offset: f64,
    pub vertical_source_start_offset: f64,
    pub vertical_source_end_offset: f64,
    pub command: Option<u32>,
    pub command_parameter: Value,
    pub can_execute: bool,
    pub label: Option<String>,
    pub description: Option<String>,
    pub icon_symbol: Option<Symbol>,
    pub accelerators: Option<Vec<super::command_controls::Accelerator>>,
    pub standard_kind: StandardCommandKind,
}
impl Default for ViewProperties {
    fn default() -> Self {
        Self {
            left_items: None,
            right_items: None,
            top_items: None,
            bottom_items: None,
            slot: ViewControlSlot::Content,
            is_pane_open: false,
            display_mode: SplitViewDisplayMode::Overlay,
            pane_placement: SplitViewPanePlacement::Left,
            open_pane_length: contract()["metrics"]["SplitViewOpenPaneThemeLength"]
                .as_str()
                .unwrap()
                .parse()
                .unwrap(),
            compact_pane_length: contract()["metrics"]["SplitViewCompactPaneThemeLength"]
                .as_str()
                .unwrap()
                .parse()
                .unwrap(),
            pane_background: None,
            light_dismiss_overlay_mode: LightDismissOverlayMode::Auto,
            is_zoomed_in_view_active: true,
            can_change_views: true,
            is_zoom_out_button_enabled: false,
            source: None,
            horizontal_shift: 0.,
            vertical_shift: 0.,
            max_horizontal_shift_ratio: 1.,
            max_vertical_shift_ratio: 1.,
            is_horizontal_shift_clamped: true,
            is_vertical_shift_clamped: true,
            horizontal_source_offset_kind: ParallaxSourceOffsetKind::Relative,
            vertical_source_offset_kind: ParallaxSourceOffsetKind::Relative,
            horizontal_source_start_offset: 0.,
            horizontal_source_end_offset: 0.,
            vertical_source_start_offset: 0.,
            vertical_source_end_offset: 0.,
            command: None,
            command_parameter: Value::Null,
            can_execute: true,
            label: None,
            description: None,
            icon_symbol: None,
            accelerators: None,
            standard_kind: StandardCommandKind::None,
        }
    }
}
pub(super) fn props(n: &Node) -> ViewProperties {
    n.props
        .view_controls
        .as_deref()
        .cloned()
        .unwrap_or_default()
}
pub(super) fn validate(p: &NodeProperties) -> Result<(), String> {
    if let Some(v) = &p.view_controls {
        let values = [
            v.open_pane_length,
            v.compact_pane_length,
            v.horizontal_shift,
            v.vertical_shift,
            v.max_horizontal_shift_ratio,
            v.max_vertical_shift_ratio,
            v.horizontal_source_start_offset,
            v.horizontal_source_end_offset,
            v.vertical_source_start_offset,
            v.vertical_source_end_offset,
        ];
        if values.iter().any(|v| !v.is_finite() || v.abs() > 1e7)
            || v.open_pane_length < 0.
            || v.compact_pane_length < 0.
        {
            return Err("invalid view control geometry or shift ratio".into());
        }
        for side in [&v.left_items, &v.right_items, &v.top_items, &v.bottom_items]
            .into_iter()
            .flatten()
        {
            if side.items.len() > 16 || side.mode == SwipeMode::Execute && side.items.len() != 1 {
                return Err(
                    "Execute swipe requires exactly one item; Reveal accepts at most 16".into(),
                );
            }
            let mut keys = std::collections::HashSet::new();
            for item in &side.items {
                if item.id.is_empty() || !keys.insert(&item.id) {
                    return Err("swipe item IDs must be unique and nonempty".into());
                }
                if let Some(b) = &item.background {
                    b.validate()?;
                }
                if let Some(b) = &item.foreground {
                    b.validate()?;
                }
            }
        }
        if let Some(b) = &v.pane_background {
            b.validate()?;
        }
        if v.accelerators
            .as_ref()
            .is_some_and(|a| a.len() > 32 || a.iter().any(|a| a.key.is_empty() || a.key.len() > 64))
        {
            return Err("invalid command accelerators".into());
        }
    }
    Ok(())
}
#[derive(Default)]
pub(super) struct ViewState {
    zoom_touches: BTreeMap<i32, [f64; 2]>,
    zoom_start: Option<(f64, bool)>,
    zoom_factor: f64,
    zoom_center: [f64; 2],
    pub(super) zoom_button_motion: Motion,
    pub(super) zoom_button_deadline: Option<f64>,
    zoom_button_was_active: bool,
    swipe_parts: Vec<(usize, String, u32)>,
    swipe_signature: String,
    swipe_drag: Option<(i32, [f64; 2], bool)>,
    swipe_side: usize,
    swipe_was_active: bool,
    initialized: bool,
    last: bool,
    pub motion: Motion,
    completing: bool,
    request: u32,
    pending: BTreeMap<u32, PendingExecution>,
    closing: Option<u32>,
    close_approved: bool,
    command_tooltip: Option<u32>,
    restore_focus: Option<u32>,
    applied_label: Option<String>,
    applied_appbar_label: Option<String>,
    applied_icon: Option<Symbol>,
    pub pane: Rect,
    pub translation: [f64; 2],
    pub command_enabled: Option<bool>,
}
struct PendingExecution {
    parameter: Value,
    chain: Vec<u32>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[derive(PartialEq)]
pub struct CommandMetadata {
    pub label: String,
    pub description: String,
    pub icon_symbol: Option<Symbol>,
    pub accelerators: Vec<super::command_controls::Accelerator>,
    pub can_execute: bool,
}
/// Source expression, including negative shifts, unclamped overscroll, and max-ratio limiting.
pub fn parallax_offset(
    offset: f64,
    start: f64,
    end: f64,
    shift: f64,
    max_ratio: f64,
    clamped: bool,
) -> f64 {
    let range = end - start;
    if range <= 0. || shift == 0. {
        return 0.;
    }
    let x = if clamped {
        offset.clamp(start, end)
    } else {
        offset
    };
    let ratio = max_ratio.max(0.).min(shift.abs() / range);
    if shift > 0. {
        -ratio * (x - start)
    } else {
        ratio * (x - end)
    }
}
impl Scene {
    pub(super) fn view_control_deadline(&self) -> Option<f64> {
        self.nodes
            .values()
            .filter_map(|n| n.view_control.zoom_button_deadline)
            .filter(|t| *t > self.time)
            .min_by(f64::total_cmp)
    }
    pub(super) fn semantic_child_matrix(&self, parent: u32, child: u32) -> Matrix {
        let n = &self.nodes[&parent];
        if n.kind != NodeKind::SemanticZoom || n.view_control.zoom_start.is_none() {
            return Matrix::default();
        }
        let slot = props(&self.nodes[&child]).slot;
        let scale = match slot {
            ViewControlSlot::ZoomedIn => n.view_control.zoom_factor,
            ViewControlSlot::ZoomedOut => {
                n.view_control.zoom_factor
                    / contract()["semanticPinch"]["minimum"].as_f64().unwrap()
            }
            _ => 1.,
        };
        let [cx, cy] = n.view_control.zoom_center;
        Matrix([scale, 0., 0., scale, cx * (1. - scale), cy * (1. - scale)])
    }
    fn semantic_touch(&mut self, input: &Input) -> Result<bool, String> {
        let Input::Touch {
            pointer,
            x,
            y,
            phase,
        } = input
        else {
            return Ok(false);
        };
        let id = self
            .nodes
            .values()
            .find(|n| {
                n.kind == NodeKind::SemanticZoom
                    && (n.view_control.zoom_touches.contains_key(pointer)
                        || (phase == "down"
                            && n.visible
                            && self.inside(n.id, *x, *y)
                            && props(n).can_change_views))
            })
            .map(|n| n.id);
        let Some(id) = id else { return Ok(false) };
        let local = self.nodes[&id]
            .world
            .inverse()
            .unwrap_or_default()
            .point(*x, *y);
        let active = props(&self.nodes[&id]).is_zoomed_in_view_active;
        if phase == "up" || phase == "cancel" {
            let n = self.nodes.get_mut(&id).unwrap();
            let claimed = n.view_control.zoom_start.is_some();
            n.view_control.zoom_touches.remove(pointer);
            if n.view_control.zoom_touches.len() < 2 {
                n.view_control.zoom_start = None;
            }
            if claimed {
                self.invalidate(id, true);
            }
            return Ok(claimed);
        }
        self.nodes
            .get_mut(&id)
            .unwrap()
            .view_control
            .zoom_touches
            .insert(*pointer, [local.0, local.1]);
        if self.nodes[&id].view_control.zoom_touches.len() < 2 {
            return Ok(false);
        }
        let pair = self.nodes[&id]
            .view_control
            .zoom_touches
            .values()
            .take(2)
            .copied()
            .collect::<Vec<_>>();
        let distance = (pair[0][0] - pair[1][0])
            .hypot(pair[0][1] - pair[1][1])
            .max(1.);
        if self.nodes[&id].view_control.zoom_start.is_none() {
            let pointers = self.nodes[&id]
                .view_control
                .zoom_touches
                .keys()
                .copied()
                .collect::<Vec<_>>();
            for pointer in pointers {
                self.scroll_touch(pointer, *x, *y, "cancel")?;
            }
            let n = self.nodes.get_mut(&id).unwrap();
            n.view_control.zoom_start = Some((distance, active));
        }
        let (start, origin) = self.nodes[&id].view_control.zoom_start.unwrap();
        let c = &contract()["semanticPinch"];
        let min = c["minimum"].as_f64().unwrap();
        let max = c["maximum"].as_f64().unwrap();
        let factor = ((if origin { max } else { min }) * distance / start).clamp(min, max);
        let s = &mut self.nodes.get_mut(&id).unwrap().view_control;
        s.zoom_factor = factor;
        s.zoom_center = [
            (pair[0][0] + pair[1][0]) / 2.,
            (pair[0][1] + pair[1][1]) / 2.,
        ];
        let next = if origin {
            if active && factor < c["upperLow"].as_f64().unwrap() {
                false
            } else if !active && factor > c["upperHigh"].as_f64().unwrap() {
                true
            } else {
                active
            }
        } else if !active && factor > c["lowerHigh"].as_f64().unwrap() {
            true
        } else if active && factor < c["lowerLow"].as_f64().unwrap() {
            false
        } else {
            active
        };
        if next != active {
            self.update(vec![Update {
                id,
                patch: json!({"viewControls":{"isZoomedInViewActive":next}}),
            }])?;
        }
        self.invalidate(id, true);
        Ok(true)
    }
    fn sync_command_tooltips(&mut self) {
        let ids = self
            .nodes
            .values()
            .filter(|n| {
                matches!(
                    n.kind,
                    NodeKind::AppBarButton | NodeKind::AppBarToggleButton | NodeKind::Button
                )
            })
            .map(|n| (n.id, props(n).command))
            .collect::<Vec<_>>();
        for (id, command) in ids {
            let meta = command.and_then(|command| self.command_metadata(command).ok());
            if meta.as_ref().is_none_or(|m| m.description.is_empty()) {
                if let Some(tip) = self
                    .nodes
                    .get_mut(&id)
                    .unwrap()
                    .view_control
                    .command_tooltip
                    .take()
                {
                    if self.nodes.contains_key(&tip) {
                        let _ = self.destroy(tip);
                    }
                }
                continue;
            }
            let meta = meta.unwrap();
            let current = self.nodes[&id]
                .view_control
                .command_tooltip
                .filter(|p| self.nodes.contains_key(p));
            if let Some(tip) = current {
                if self.nodes[&tip].props.text != meta.description {
                    self.nodes.get_mut(&tip).unwrap().props.text = meta.description;
                    self.invalidate(tip, true);
                }
            } else if !self.nodes[&id]
                .children
                .iter()
                .any(|c| self.nodes[c].kind == NodeKind::ToolTip)
            {
                if let Ok(tip) = self.create(
                    id,
                    NodeKind::ToolTip,
                    json!({"text":meta.description,"placementTarget":id}),
                ) {
                    self.nodes
                        .get_mut(&id)
                        .unwrap()
                        .view_control
                        .command_tooltip = Some(tip);
                }
            }
        }
    }
    fn swipe_sides(&self, id: u32) -> [Option<SwipeItems>; 4] {
        let p = props(&self.nodes[&id]);
        [p.left_items, p.right_items, p.top_items, p.bottom_items]
    }
    fn sync_swipes(&mut self) {
        let ids = self
            .nodes
            .values()
            .filter(|n| n.kind == NodeKind::SwipeControl)
            .map(|n| n.id)
            .collect::<Vec<_>>();
        for id in ids {
            let sides = self.swipe_sides(id);
            let signature = serde_json::to_string(&sides).unwrap();
            if self.nodes[&id].view_control.swipe_signature != signature {
                let old =
                    std::mem::take(&mut self.nodes.get_mut(&id).unwrap().view_control.swipe_parts);
                for (_, _, part) in old {
                    if self.nodes.contains_key(&part) {
                        let _ = self.destroy(part);
                    }
                }
                for (side, group) in sides.iter().enumerate() {
                    if let Some(group) = group {
                        for item in &group.items {
                            let part=self.create(id,NodeKind::AppBarButton,json!({"horizontalAlignment":"Stretch","verticalAlignment":"Stretch","minWidth":0,"minHeight":0,"background":item.background,"foreground":item.foreground,"commandControls":{"label":item.text,"isCompact":false},"iconSource":item.icon_symbol.map(|symbol|crate::icon_source::IconSource{symbol,..Default::default()}),"viewControls":{"slot":"SwipeAction","command":item.command,"commandParameter":item.command_parameter}})).expect("validated swipe template");
                            self.nodes
                                .get_mut(&id)
                                .unwrap()
                                .view_control
                                .swipe_parts
                                .push((side, item.id.clone(), part));
                        }
                    }
                }
                self.nodes
                    .get_mut(&id)
                    .unwrap()
                    .view_control
                    .swipe_signature = signature;
                self.invalidate(id, true);
            }
            let extent = if self.nodes[&id].view_control.swipe_side < 2 {
                self.nodes[&id].rect.width
            } else {
                self.nodes[&id].rect.height
            };
            let reached = self.nodes[&id].view_control.motion.value(self.time).abs()
                > contract()["swipeThreshold"].as_f64().unwrap().min(extent);
            for (side, key, part) in self.nodes[&id].view_control.swipe_parts.clone() {
                let Some(group) = &sides[side] else { continue };
                let item = group.items.iter().find(|i| i.id == key).unwrap();
                let prefix = if group.mode == SwipeMode::Reveal {
                    "SwipeItem"
                } else if reached {
                    "SwipeItemPostThresholdExecute"
                } else {
                    "SwipeItemPreThresholdExecute"
                };
                let part_node = self.nodes.get_mut(&part).unwrap();
                if item.foreground.is_none() {
                    part_node.props.foreground = Some(BrushValue::Resource {
                        resource: format!("{prefix}Foreground"),
                    });
                }
                if item.background.is_none() {
                    part_node.props.background = Some(BrushValue::Resource {
                        resource: if group.mode == SwipeMode::Execute && reached {
                            "AccentFillColorDefaultBrush".into()
                        } else {
                            format!("{prefix}Background")
                        },
                    });
                }
            }
            let n = self.nodes.get_mut(&id).unwrap();
            let active = n.view_control.motion.active(self.time);
            let changed = active || n.view_control.swipe_was_active;
            n.view_control.swipe_was_active = active;
            if changed {
                self.invalidate(id, true);
            }
        }
    }
    fn swipe_input(&mut self, input: &Input) -> Result<bool, String> {
        let Input::Touch {
            pointer,
            x,
            y,
            phase,
        } = input
        else {
            return Ok(false);
        };
        if phase == "down" {
            let candidate = self
                .nodes
                .values()
                .rev()
                .find(|n| {
                    n.kind == NodeKind::SwipeControl
                        && n.visible
                        && n.enabled
                        && self.inside(n.id, *x, *y)
                        && self.swipe_ancestors_contain(n.id, *x, *y)
                })
                .map(|n| n.id);
            if let Some(id) = candidate {
                self.nodes.get_mut(&id).unwrap().view_control.swipe_drag =
                    Some((*pointer, [*x, *y], false));
            }
            return Ok(false);
        }
        let candidate = self
            .nodes
            .values()
            .find(|n| n.view_control.swipe_drag.is_some_and(|p| p.0 == *pointer))
            .map(|n| n.id);
        let Some(id) = candidate else {
            return Ok(false);
        };
        let (_, start, mut claimed) = self.nodes[&id].view_control.swipe_drag.unwrap();
        let delta = [*x - start[0], *y - start[1]];
        let side = if claimed {
            self.nodes[&id].view_control.swipe_side
        } else if delta[0].abs() >= delta[1].abs() {
            if delta[0] >= 0. {
                0
            } else {
                1
            }
        } else if delta[1] >= 0. {
            2
        } else {
            3
        };
        let sides = self.swipe_sides(id);
        let Some(items) = &sides[side] else {
            self.nodes.get_mut(&id).unwrap().view_control.swipe_drag = None;
            return Ok(false);
        };
        let distance = delta[usize::from(side >= 2)];
        if phase == "move" {
            if !claimed && distance.abs() > 8. {
                self.scroll_touch(*pointer, *x, *y, "cancel")?;
                claimed = true;
            }
            let limit = if side < 2 {
                self.nodes[&id].rect.width
            } else {
                self.nodes[&id].rect.height
            };
            let n = self.nodes.get_mut(&id).unwrap();
            n.view_control.swipe_side = side;
            n.view_control.swipe_drag = Some((*pointer, start, claimed));
            if claimed {
                n.view_control.motion.snap(distance.clamp(-limit, limit));
                self.invalidate(id, true);
            }
            return Ok(claimed);
        }
        self.nodes.get_mut(&id).unwrap().view_control.swipe_drag = None;
        if claimed {
            let amount = self.nodes[&id].view_control.motion.value(self.time).abs();
            let extent = if side < 2 {
                self.nodes[&id].rect.width
            } else {
                self.nodes[&id].rect.height
            };
            let threshold = contract()["swipeThreshold"].as_f64().unwrap().min(extent);
            let execute = phase == "up" && items.mode == SwipeMode::Execute && amount > threshold;
            if execute {
                if let Some(item) = items.items.first() {
                    if let Some(command) = item.command {
                        self.request_execute(command, item.command_parameter.clone())?;
                    }
                }
            }
            let target =
                if phase == "up" && items.mode == SwipeMode::Reveal && amount > threshold / 2. {
                    100. * items.items.len() as f64 * if side == 0 || side == 2 { 1. } else { -1. }
                } else {
                    0.
                };
            self.nodes
                .get_mut(&id)
                .unwrap()
                .view_control
                .motion
                .retarget(
                    target,
                    self.time,
                    if self.reduced_motion { 0. } else { 167. },
                );
            self.invalidate(id, true);
        }
        Ok(claimed)
    }
    fn swipe_ancestors_contain(&self, id: u32, x: f64, y: f64) -> bool {
        let mut at = Some(id);
        while let Some(id) = at {
            let n = &self.nodes[&id];
            if !n.visible
                || ((n.props.clip || collections::is_scroll_owner(n.kind))
                    && !self.inside(id, x, y))
            {
                return false;
            }
            at = n.parent;
        }
        true
    }
    pub fn command_metadata(&self, id: u32) -> Result<CommandMetadata, String> {
        let n = self.get(id)?;
        if !is_command(n.kind) {
            return Err("target is not a UICommand".into());
        }
        let p = props(n);
        let defaults = contract();
        let preset = &defaults["standardCommands"][p.standard_kind.as_str()];
        let accelerators = p.accelerators.clone().unwrap_or_else(|| {
            serde_json::from_value(preset["accelerators"].clone()).unwrap_or_default()
        });
        Ok(CommandMetadata {
            label: p
                .label
                .unwrap_or_else(|| preset["label"].as_str().unwrap_or("").into()),
            description: p
                .description
                .unwrap_or_else(|| preset["description"].as_str().unwrap_or("").into()),
            icon_symbol: p
                .icon_symbol
                .or_else(|| serde_json::from_value(preset["symbol"].clone()).ok()),
            accelerators,
            can_execute: self.command_can_execute(id, &mut vec![])?,
        })
    }
    pub(super) fn command_can_execute(
        &self,
        id: u32,
        visited: &mut Vec<u32>,
    ) -> Result<bool, String> {
        if visited.contains(&id) {
            return Err("command cycle".into());
        }
        visited.push(id);
        let n = self.get(id)?;
        if !is_command(n.kind) {
            return Err("target is not a UICommand".into());
        }
        let p = props(n);
        let result = p.can_execute
            && n.props.enabled
            && match p.command {
                Some(c) => self.command_can_execute(c, visited)?,
                None => true,
            };
        visited.pop();
        Ok(result)
    }
    fn view_emit(&mut self, id: u32, kind: EventKind, request: Option<u32>, payload: Value) {
        self.emit(id, kind);
        let e = self.events.last_mut().unwrap();
        e.request_id = request;
        e.payload = Some(payload);
    }
    pub(super) fn validate_view_references(
        &self,
        id: u32,
        p: &NodeProperties,
        staged: Option<&BTreeMap<u32, NodeProperties>>,
    ) -> Result<(), String> {
        if let Some(target)=p.reading.as_deref().and_then(|q|q.scroll_target){
            if target==id||!collections::is_scroll_owner(self.get(target)?.kind){return Err("AnnotatedScrollBar requires a different live scroll control in this scene".into());}
        }
        if let Some(q)=p.reading.as_deref(){
         if let Some(source)=q.label_item_source{if self.get(source)?.kind!=NodeKind::ItemsRepeater{return Err("Label item source requires ItemsRepeater".into())}}
         for command in [q.first_button_command,q.previous_button_command,q.next_button_command,q.last_button_command,q.pager_input_command].into_iter().flatten(){if !is_command(self.get(command)?.kind){return Err("Pager commands require live UICommand nodes".into());}}
         if let Some(target)=q.overflow_content_target{for (&other,node) in &self.nodes{if other!=id{let candidate=staged.and_then(|s|s.get(&other)).unwrap_or(&node.props);if candidate.reading.as_deref().and_then(|q|q.overflow_content_target)==Some(target){return Err("An overflow container can have only one source".into())}}}}
         let mut seen=vec![id];let mut next=q.overflow_content_target;
         while let Some(target)=next {if seen.contains(&target){return Err("RichTextBlock overflow cycle".into())}seen.push(target);if self.get(target)?.kind!=NodeKind::RichTextBlockOverflow{return Err("Overflow target must be a live RichTextBlockOverflow".into())}let props=staged.and_then(|s|s.get(&target)).unwrap_or(&self.nodes[&target].props);next=props.reading.as_deref().and_then(|q|q.overflow_content_target);}
        }
        fn menu_commands(
            scene: &Scene,
            items: &[super::overlays::MenuEntry],
        ) -> Result<(), String> {
            for item in items {
                if let Some(command) = item.command {
                    if !is_command(scene.get(command)?.kind) {
                        return Err(
                            "menu command must reference a live UICommand in this scene".into()
                        );
                    }
                }
                menu_commands(scene, &item.items)?;
            }
            Ok(())
        }
        menu_commands(self, &p.menu_items)?;
        if let Some(menu) = &p.menu_controls {
            for item in &menu.items {
                menu_commands(self, &item.items)?;
            }
        }
        if let Some(v) = &p.view_controls {
            let mut action_count = 0;
            for side in [&v.left_items, &v.right_items, &v.top_items, &v.bottom_items]
                .into_iter()
                .flatten()
            {
                action_count += side.items.len();
                for item in &side.items {
                    if let Some(command) = item.command {
                        if !is_command(self.get(command)?.kind) {
                            return Err("swipe command must be a UICommand".into());
                        }
                    }
                }
            }
            if self.nodes.len() + action_count * 8 > 5000 {
                return Err("swipe template exceeds scene node budget".into());
            }
            if let Some(source) = v.source {
                if source == id || !collections::is_scroll_owner(self.get(source)?.kind) {
                    return Err(
                        "ParallaxView source must be a live scrolling control in this scene".into(),
                    );
                }
            }
            if let Some(command) = v.command {
                let mut at = Some(command);
                let mut visited = vec![id];
                while let Some(c) = at {
                    if visited.contains(&c) {
                        return Err("command cycle".into());
                    }
                    visited.push(c);
                    let n = self.get(c)?;
                    if !is_command(n.kind) {
                        return Err("command must reference a live UICommand in this scene".into());
                    }
                    at = staged
                        .and_then(|updates| updates.get(&c))
                        .unwrap_or(&n.props)
                        .view_controls
                        .as_deref()
                        .and_then(|v| v.command);
                }
            }
        }
        Ok(())
    }
    pub(super) fn sync_view_controls(&mut self) {
        self.sync_command_tooltips();
        self.sync_menu_commands();
        self.sync_swipes();
        let ids = self.nodes.keys().copied().collect::<Vec<_>>();
        for id in ids {
            let kind = self.nodes[&id].kind;
            let p = props(&self.nodes[&id]);
            if kind == NodeKind::SemanticZoom {
                let n = self.nodes.get_mut(&id).unwrap();
                let s = &mut n.view_control;
                if !p.is_zoomed_in_view_active || !p.is_zoom_out_button_enabled {
                    s.zoom_button_motion.snap(0.);
                    s.zoom_button_deadline = None;
                }
                if s.zoom_button_deadline.is_some_and(|t| self.time >= t) {
                    s.zoom_button_deadline = None;
                    s.zoom_button_motion.retarget(
                        0.,
                        self.time,
                        if self.reduced_motion {
                            0.
                        } else {
                            contract()["themeAnimations"]["FadeOut-Hidden"][0]["durationMs"]
                                .as_f64()
                                .unwrap()
                        },
                    );
                    s.zoom_button_motion.curve = [0., 0., 1., 1.];
                }
                let active = s.zoom_button_motion.active(self.time);
                let dirty = active || s.zoom_button_was_active;
                s.zoom_button_was_active = active;
                if dirty {
                    self.invalidate(id, true);
                }
            }
            if matches!(kind, NodeKind::SplitView | NodeKind::SemanticZoom) {
                let target = if kind == NodeKind::SplitView {
                    p.is_pane_open
                } else {
                    p.is_zoomed_in_view_active
                };
                let n = self.nodes.get_mut(&id).unwrap();
                let s = &mut n.view_control;
                if !s.initialized {
                    s.initialized = true;
                    s.last = target;
                    s.motion.snap(if target { 1. } else { 0. });
                } else if s.last != target {
                    s.last = target;
                    s.completing = true;
                    let profile = if kind == NodeKind::SemanticZoom {
                        &contract()["themeAnimations"]["FadeIn-Shown"][0]
                    } else {
                        let prefix = if matches!(
                            p.display_mode,
                            SplitViewDisplayMode::Inline | SplitViewDisplayMode::CompactInline
                        ) {
                            "inline"
                        } else if p.display_mode == SplitViewDisplayMode::CompactOverlay {
                            "compact"
                        } else {
                            "overlay"
                        };
                        &contract()["motion"]
                            [format!("{}{}", prefix, if target { "Open" } else { "Close" })]
                    };
                    let duration = if self.reduced_motion {
                        0.
                    } else {
                        profile["durationMs"].as_f64().unwrap()
                    };
                    let curve: [f64; 4] = serde_json::from_value(profile["curve"].clone()).unwrap();
                    s.motion
                        .retarget(if target { 1. } else { 0. }, self.time, duration);
                    s.motion.curve = curve;
                    let event = if kind == NodeKind::SplitView {
                        if target {
                            EventKind::PaneOpening
                        } else {
                            EventKind::PaneClosing
                        }
                    } else {
                        EventKind::ViewChangeStarted
                    };
                    let skip = kind == NodeKind::SplitView
                        && !target
                        && self.nodes[&id].view_control.close_approved;
                    self.nodes.get_mut(&id).unwrap().view_control.close_approved = false;
                    if !skip {
                        self.view_emit(id, event, None, json!({"isZoomedInViewActive":target}));
                    }
                    if kind == NodeKind::SplitView {
                        if target {
                            self.nodes.get_mut(&id).unwrap().view_control.restore_focus =
                                self.focused;
                        } else if let Some(focus) = self
                            .nodes
                            .get_mut(&id)
                            .unwrap()
                            .view_control
                            .restore_focus
                            .take()
                            .filter(|f| self.nodes.contains_key(f))
                        {
                            self.focus(Some(focus));
                        }
                    } else {
                        // Never retain keyboard focus inside an inactive representation.
                        if self.focused.is_some_and(|f| self.is_view_descendant(id, f)) {
                            self.focus(None);
                        }
                    }
                }
                let s = &mut self.nodes.get_mut(&id).unwrap().view_control;
                if s.completing && !s.motion.active(self.time) {
                    s.completing = false;
                    self.invalidate(id, true);
                    self.view_emit(
                        id,
                        if kind == NodeKind::SplitView {
                            if target {
                                EventKind::PaneOpened
                            } else {
                                EventKind::PaneClosed
                            }
                        } else {
                            EventKind::ViewChangeCompleted
                        },
                        None,
                        json!({"isZoomedInViewActive":target}),
                    );
                }
            }
            if is_command(kind) {
                let value = self.command_can_execute(id, &mut vec![]).unwrap_or(false);
                let state = &mut self.nodes.get_mut(&id).unwrap().view_control;
                let previous = state.command_enabled.replace(value);
                if previous.is_some_and(|v| v != value) {
                    self.emit(id, EventKind::CanExecuteChanged);
                }
            }
            if !is_command(kind) {
                let enabled = p
                    .command
                    .map(|c| self.command_can_execute(c, &mut vec![]).unwrap_or(false));
                self.nodes
                    .get_mut(&id)
                    .unwrap()
                    .view_control
                    .command_enabled = enabled;
                if let Some(meta) = p.command.and_then(|c| self.command_metadata(c).ok()) {
                    let n = self.nodes.get_mut(&id).unwrap();
                    if n.props.text.is_empty()
                        || n.view_control.applied_label.as_ref() == Some(&n.props.text)
                    {
                        n.props.text = meta.label.clone();
                        n.view_control.applied_label = Some(meta.label.clone());
                    }
                    if matches!(kind, NodeKind::AppBarButton | NodeKind::AppBarToggleButton) {
                        if n.props.command_controls.label.is_empty()
                            || n.view_control.applied_appbar_label.as_ref()
                                == Some(&n.props.command_controls.label)
                        {
                            n.props.command_controls.label = meta.label.clone();
                            n.view_control.applied_appbar_label = Some(meta.label);
                        }
                        if n.props.icon_source.is_none()
                            || n.props.icon_source.as_ref().is_some_and(|icon| {
                                icon.kind == IconSourceKind::Symbol
                                    && Some(icon.symbol) == n.view_control.applied_icon
                            })
                        {
                            n.props.icon_source =
                                meta.icon_symbol
                                    .map(|symbol| crate::icon_source::IconSource {
                                        symbol,
                                        ..Default::default()
                                    });
                            n.view_control.applied_icon = meta.icon_symbol;
                        }
                    }
                }
            }
        }
    }
    pub(super) fn init_view_control(&mut self, id: u32) -> Result<(), String> {
        if self.nodes[&id].kind == NodeKind::SemanticZoom {
            let b = &contract()["zoomButton"];
            self.create(id,NodeKind::Button,json!({"text":b["Content"],"fontFamily":"Segoe MDL2 Assets","fontSize":b["FontSize"].as_str().unwrap().parse::<f64>().unwrap(),"accessibleName":"Zoom out","isTabStop":false,"padding":[0,0,0,0],"minWidth":0,"minHeight":0,"viewControls":{"slot":"ZoomButton"},"width":b["Width"].as_str().unwrap().parse::<f64>().unwrap(),"height":b["Height"].as_str().unwrap().parse::<f64>().unwrap()}))?;
        }
        Ok(())
    }
    fn is_view_descendant(&self, parent: u32, child: u32) -> bool {
        let mut at = Some(child);
        while let Some(id) = at {
            if id == parent {
                return true;
            }
            at = self.nodes.get(&id).and_then(|n| n.parent);
        }
        false
    }
    pub(super) fn view_child_visible(&self, parent: u32, child: u32) -> bool {
        let n = &self.nodes[&parent];
        if !matches!(n.kind,NodeKind::SwipeControl|NodeKind::SplitView|NodeKind::SemanticZoom){return !is_command(self.nodes[&child].kind);}
        let p = props(n);
        let slot = self.nodes[&child].props.view_controls.as_ref().map_or(ViewControlSlot::Content,|p|p.slot);
        match n.kind {
            NodeKind::SwipeControl if slot == ViewControlSlot::SwipeAction => {
                n.view_control.motion.value(self.time).abs() > 0.01
                    && n.view_control
                        .swipe_parts
                        .iter()
                        .any(|p| p.0 == n.view_control.swipe_side && p.2 == child)
            }
            NodeKind::SplitView if slot == ViewControlSlot::Pane => {
                n.view_control.motion.value(self.time) > 0.
                    || compact_mode(p.display_mode) && p.compact_pane_length > 0.
            }
            NodeKind::SemanticZoom => match slot {
                ViewControlSlot::ZoomedIn => {
                    p.is_zoomed_in_view_active || n.view_control.motion.active(self.time)
                }
                ViewControlSlot::ZoomedOut => {
                    !p.is_zoomed_in_view_active || n.view_control.motion.active(self.time)
                }
                ViewControlSlot::ZoomButton => {
                    p.is_zoomed_in_view_active
                        && p.can_change_views
                        && p.is_zoom_out_button_enabled
                        && n.view_control.zoom_button_motion.value(self.time) > 0.
                }
                _ => true,
            },
            _ => !is_command(self.nodes[&child].kind),
        }
    }
    pub(super) fn view_child_enabled(&self, parent: u32, child: u32) -> bool {
        let n = &self.nodes[&parent];
        if n.kind == NodeKind::SemanticZoom {
            let slot=self.nodes[&child].props.view_controls.as_ref().map_or(ViewControlSlot::Content,|p|p.slot);
            let p = props(n);
            if slot == ViewControlSlot::ZoomedIn {
                return p.is_zoomed_in_view_active;
            }
            if slot == ViewControlSlot::ZoomedOut {
                return !p.is_zoomed_in_view_active;
            }
        }
        self.view_child_visible(parent, child)
    }
    pub(super) fn measure_view(
        &mut self,
        id: u32,
        inner: [f64; 2],
        measure: &mut impl TextMeasurer,
    ) -> [f64; 2] {
        let n = &self.nodes[&id];
        let kind = n.kind;
        let p = props(n);
        let children = n.children.clone();
        let mut size = [0f64; 2];
        for child in children {
            let slot = props(&self.nodes[&child]).slot;
            if matches!(
                slot,
                ViewControlSlot::ZoomButton | ViewControlSlot::SwipeAction
            ) || is_command(self.nodes[&child].kind)
            {
                continue;
            }
            let mut available = inner;
            if kind == NodeKind::SplitView {
                if slot == ViewControlSlot::Pane {
                    available[0] = p.open_pane_length;
                } else {
                    available[0] =
                        (available[0] - reserved(&p, if p.is_pane_open { 1. } else { 0. })).max(0.);
                }
            }
            if kind == NodeKind::ParallaxView {
                available = [
                    inner[0] + p.horizontal_shift.abs(),
                    inner[1] + p.vertical_shift.abs(),
                ];
            }
            let d = self.measure_node(child, available, measure);
            if kind == NodeKind::SplitView && slot == ViewControlSlot::Pane {
                size[1] = size[1].max(d[1]);
            } else {
                size = [size[0].max(d[0]), size[1].max(d[1])];
            }
        }
        if kind == NodeKind::SplitView {
            size[0] += reserved(&p, if p.is_pane_open { 1. } else { 0. });
        }
        if kind == NodeKind::ParallaxView {
            size = std::array::from_fn(|i| {
                if inner[i].is_finite() {
                    inner[i]
                } else {
                    size[i]
                }
            });
        }
        size
    }
    pub(super) fn arrange_view(&mut self, id: u32, inner: Rect, measure: &mut impl TextMeasurer) {
        let n = &self.nodes[&id];
        let kind = n.kind;
        let p = props(n);
        let world = n.world;
        let inherited = (n.theme, n.enabled, n.visible);
        let progress = n.view_control.motion.value(self.time);
        let children = n.children.clone();
        let rail = if compact_mode(p.display_mode) {
            p.compact_pane_length.min(p.open_pane_length)
        } else {
            0.
        };
        let pane_width = rail + (p.open_pane_length - rail) * progress;
        let right = p.pane_placement == SplitViewPanePlacement::Right;
        let pane = Rect::new(
            if right {
                inner.x + inner.width - pane_width
            } else {
                inner.x
            },
            inner.y,
            pane_width,
            inner.height,
        );
        self.nodes.get_mut(&id).unwrap().view_control.pane = pane;
        let translation = if kind == NodeKind::ParallaxView {
            self.parallax_translation(id)
        } else {
            [0.; 2]
        };
        self.nodes.get_mut(&id).unwrap().view_control.translation = translation;
        for child in children {
            let slot = props(&self.nodes[&child]).slot;
            let mut rect = inner;
            let inherited = (
                inherited.0,
                inherited.1 && self.view_child_enabled(id, child),
                inherited.2 && self.view_child_visible(id, child),
            );
            if kind == NodeKind::SwipeControl {
                if slot == ViewControlSlot::SwipeAction {
                    let parts = &self.nodes[&id].view_control.swipe_parts;
                    let side = self.nodes[&id].view_control.swipe_side;
                    let index = parts
                        .iter()
                        .filter(|p| p.0 == side)
                        .position(|p| p.2 == child)
                        .unwrap_or(0) as f64;
                    let count = parts.iter().filter(|p| p.0 == side).count().max(1) as f64;
                    rect = match side {
                        0 => Rect::new(inner.x + index * 100., inner.y, 100., inner.height),
                        1 => Rect::new(
                            inner.x + inner.width - 100. * count + index * 100.,
                            inner.y,
                            100.,
                            inner.height,
                        ),
                        2 => Rect::new(inner.x, inner.y + index * 100., inner.width, 100.),
                        _ => Rect::new(
                            inner.x,
                            inner.y + inner.height - 100. * count + index * 100.,
                            inner.width,
                            100.,
                        ),
                    };
                } else {
                    let offset = self.nodes[&id].view_control.motion.value(self.time);
                    if self.nodes[&id].view_control.swipe_side < 2 {
                        rect.x += offset;
                    } else {
                        rect.y += offset;
                    }
                }
                self.arrange_node(child, rect, world, inherited, measure);
                continue;
            }
            if kind == NodeKind::SplitView {
                if slot == ViewControlSlot::Pane {
                    rect = Rect::new(
                        if compact_mode(p.display_mode) {
                            if right {
                                inner.x + inner.width - p.open_pane_length
                            } else {
                                inner.x
                            }
                        } else if right {
                            inner.x + inner.width - pane_width
                        } else {
                            inner.x - (p.open_pane_length - pane_width)
                        },
                        inner.y,
                        p.open_pane_length,
                        inner.height,
                    );
                } else {
                    let reserve = reserved(&p, progress).min(inner.width);
                    rect = Rect::new(
                        inner.x + if right { 0. } else { reserve },
                        inner.y,
                        (inner.width - reserve).max(0.),
                        inner.height,
                    );
                }
            } else if kind == NodeKind::SemanticZoom && slot == ViewControlSlot::ZoomButton {
                rect = Rect::new(
                    (inner.x + inner.width - 31.).max(inner.x),
                    (inner.y + inner.height - 31.).max(inner.y),
                    12.,
                    12.,
                );
            } else if kind == NodeKind::ParallaxView {
                let child_node = &self.nodes[&child];
                let cp = &child_node.props;
                let mut size = child_node.desired;
                if p.horizontal_shift != 0. && size[0] < inner.width + p.horizontal_shift.abs() {
                    let ratio = if size[0] > 0. {
                        (inner.width + p.horizontal_shift.abs()) / size[0]
                    } else {
                        0.
                    };
                    size[0] = inner.width + p.horizontal_shift.abs();
                    if ratio != 0.
                        && cp.height.is_none()
                        && cp.vertical_alignment == VerticalAlignment::Stretch
                    {
                        size[1] *= ratio;
                    }
                }
                if p.vertical_shift != 0. && size[1] < inner.height + p.vertical_shift.abs() {
                    let ratio = if size[1] > 0. {
                        (inner.height + p.vertical_shift.abs()) / size[1]
                    } else {
                        0.
                    };
                    size[1] = inner.height + p.vertical_shift.abs();
                    if ratio != 0.
                        && cp.width.is_none()
                        && cp.horizontal_alignment == HorizontalAlignment::Stretch
                    {
                        size[0] *= ratio;
                    }
                }
                let x = match cp.horizontal_alignment {
                    HorizontalAlignment::Right => inner.width - size[0],
                    HorizontalAlignment::Center => (inner.width - size[0]) / 2.,
                    HorizontalAlignment::Stretch if size[0] < inner.width => {
                        (inner.width - size[0]) / 2.
                    }
                    _ => 0.,
                };
                let y = match cp.vertical_alignment {
                    VerticalAlignment::Bottom => inner.height - size[1],
                    VerticalAlignment::Center => (inner.height - size[1]) / 2.,
                    VerticalAlignment::Stretch if size[1] < inner.height => {
                        (inner.height - size[1]) / 2.
                    }
                    _ => 0.,
                };
                rect = Rect::new(
                    inner.x + x + translation[0],
                    inner.y + y + translation[1],
                    size[0],
                    size[1],
                );
            }
            self.arrange_node(child, rect, world, inherited, measure);
        }
    }
    fn parallax_translation(&self, id: u32) -> [f64; 2] {
        let n = &self.nodes[&id];
        let p = props(n);
        let Some(source) = p.source.and_then(|s| self.nodes.get(&s)) else {
            return [0.; 2];
        };
        let ss = source.scroll.snapshot(&source.props, self.time);
        let offset = [ss.horizontal_offset, ss.vertical_offset];
        let extent = [ss.extent_width, ss.extent_height];
        let viewport = [ss.viewport_width, ss.viewport_height];
        let shift = [p.horizontal_shift, p.vertical_shift];
        let ratio = [p.max_horizontal_shift_ratio, p.max_vertical_shift_ratio];
        let clamp = [p.is_horizontal_shift_clamped, p.is_vertical_shift_clamped];
        let kinds = [
            p.horizontal_source_offset_kind,
            p.vertical_source_offset_kind,
        ];
        let starts = [
            p.horizontal_source_start_offset,
            p.vertical_source_start_offset,
        ];
        let ends = [p.horizontal_source_end_offset, p.vertical_source_end_offset];
        let zoom = ss.zoom_factor;
        let target_inside = self.is_view_descendant(source.id, id);
        let local = source
            .world
            .inverse()
            .unwrap_or_default()
            .multiply(n.world)
            .point(0., 0.);
        let position = [
            (local.0 + offset[0]) / zoom.max(1e-9),
            (local.1 + offset[1]) / zoom.max(1e-9),
        ];
        let target_size = [n.rect.width, n.rect.height];
        std::array::from_fn(|i| {
            let content = if zoom > 0. { extent[i] / zoom } else { 0. };
            let (start, end) = if kinds[i] == ParallaxSourceOffsetKind::Absolute {
                let start = if starts[i] > 0. {
                    starts[i] * zoom
                } else {
                    starts[i]
                };
                let end = if content > viewport[i] {
                    if ends[i] <= content - viewport[i] {
                        (ends[i] * zoom).max(0.)
                    } else {
                        ((content - viewport[i]) * zoom).max(0.) + ends[i] - content + viewport[i]
                    }
                } else if ends[i] <= 0. {
                    ((content + ends[i]) * zoom - viewport[i]).max(0.)
                } else {
                    (content * zoom - viewport[i]).max(0.) + ends[i]
                };
                (start, end)
            } else {
                let overpan = viewport[i]
                    * if source.kind != NodeKind::ScrollView
                        && source.props.zoom_mode == ZoomMode::Disabled
                    {
                        0.1
                    } else {
                        1.
                    };
                if target_inside {
                    (
                        (position[i] + starts[i]) * zoom - viewport[i] - overpan,
                        (position[i] + target_size[i] + ends[i]) * zoom + overpan,
                    )
                } else {
                    (
                        starts[i] * zoom - overpan,
                        ((content + ends[i]) * zoom - viewport[i]).max(0.) + overpan,
                    )
                }
            };
            parallax_offset(offset[i], start, end, shift[i], ratio[i], clamp[i])
        })
    }
    pub(super) fn refresh_parallax(&mut self, measure: &mut impl TextMeasurer) {
        let ids = self
            .nodes
            .values()
            .filter(|n| n.kind == NodeKind::ParallaxView)
            .map(|n| n.id)
            .collect::<Vec<_>>();
        for id in ids {
            let n = &self.nodes[&id];
            let r = Rect::new(0., 0., n.rect.width, n.rect.height);
            self.arrange_view(id, r, measure);
        }
    }
    pub(super) fn view_activate(&mut self, id: u32) -> Result<bool, String> {
        let n = self.get(id)?;
        if let Some(parent) = n
            .parent
            .filter(|p| self.nodes[p].kind == NodeKind::SwipeControl)
        {
            if props(n).slot == ViewControlSlot::SwipeAction {
                self.nodes
                    .get_mut(&parent)
                    .unwrap()
                    .view_control
                    .motion
                    .retarget(0., self.time, if self.reduced_motion { 0. } else { 167. });
            }
        }
        let n = self.get(id)?;
        if let Some(parent) = n
            .parent
            .filter(|p| self.nodes[p].kind == NodeKind::SemanticZoom)
        {
            let p = props(&self.nodes[&parent]);
            if props(n).slot == ViewControlSlot::ZoomButton {
                if p.can_change_views {
                    self.update(vec![Update {
                        id: parent,
                        patch: json!({"viewControls":{"isZoomedInViewActive":false}}),
                    }])?;
                }
                return Ok(true);
            }
        }
        if let Some(command) = props(n).command {
            if !self
                .command_can_execute(command, &mut vec![])
                .unwrap_or(false)
            {
                return Ok(true);
            }
            let parameter = props(n).command_parameter;
            self.request_execute(command, parameter)?;
        }
        Ok(false)
    }
    pub(super) fn request_execute(&mut self, id: u32, parameter: Value) -> Result<(), String> {
        self.request_execute_chain(id, parameter, vec![])
    }
    fn request_execute_chain(
        &mut self,
        id: u32,
        parameter: Value,
        mut chain: Vec<u32>,
    ) -> Result<(), String> {
        if !self.command_can_execute(id, &mut vec![])? {
            return Ok(());
        }
        if chain.contains(&id) {
            return Err("command cycle during execution".into());
        }
        chain.push(id);
        let s = &mut self.nodes.get_mut(&id).unwrap().view_control;
        if s.pending.len() >= 64 {
            return Err("command execution queue limit reached".into());
        }
        s.request = s
            .request
            .checked_add(1)
            .ok_or("command request limit reached")?;
        let request = s.request;
        s.pending.insert(
            request,
            PendingExecution {
                parameter: parameter.clone(),
                chain,
            },
        );
        self.view_emit(
            id,
            EventKind::CanExecuteRequested,
            Some(request),
            json!({"parameter":parameter,"canExecute":true}),
        );
        Ok(())
    }
    fn close_pane_request(&mut self, id: u32) {
        let n = self.nodes.get_mut(&id).unwrap();
        if !props(n).is_pane_open || n.view_control.closing.is_some() {
            return;
        }
        n.view_control.request += 1;
        let request = n.view_control.request;
        n.view_control.closing = Some(request);
        self.view_emit(id, EventKind::PaneClosing, Some(request), json!({}));
    }
    pub(super) fn view_wheel(
        &mut self,
        x: f64,
        y: f64,
        dy: f64,
        ctrl: bool,
    ) -> Result<bool, String> {
        if !ctrl || dy == 0. {
            return Ok(false);
        }
        let zoom = self
            .nodes
            .values()
            .rev()
            .find(|n| {
                n.kind == NodeKind::SemanticZoom
                    && n.visible
                    && n.enabled
                    && self.inside(n.id, x, y)
                    && props(n).can_change_views
            })
            .map(|n| n.id);
        if let Some(id) = zoom {
            self.update(vec![Update {
                id,
                patch: json!({"viewControls":{"isZoomedInViewActive":dy<0.}}),
            }])?;
            return Ok(true);
        }
        Ok(false)
    }
    fn semantic_slot(&self, owner: u32, id: u32) -> Option<ViewControlSlot> {
        let mut at = id;
        loop {
            let n = self.nodes.get(&at)?;
            if n.parent == Some(owner) {
                return Some(props(n).slot);
            }
            at = n.parent?;
        }
    }
    pub(super) fn semantic_collection_activate(
        &mut self,
        owner: u32,
        index: usize,
    ) -> Result<bool, String> {
        let zoom = self
            .nodes
            .values()
            .find(|n| {
                n.kind == NodeKind::SemanticZoom
                    && self.semantic_slot(n.id, owner) == Some(ViewControlSlot::ZoomedOut)
            })
            .map(|n| n.id);
        if let Some(zoom) = zoom {
            let key = self
                .get(owner)?
                .props
                .collection_items
                .get(index)
                .ok_or("invalid semantic group")?
                .id
                .clone();
            self.view_input(&Input::ViewControl {
                id: zoom,
                action: "navigateToGroup".into(),
                request: None,
                cancel: false,
                parameter: json!(key),
            })?;
            return Ok(true);
        }
        Ok(false)
    }
    pub(super) fn view_input(&mut self, input: &Input) -> Result<bool, String> {
        if self.semantic_touch(input)? {
            return Ok(true);
        }
        if let Input::Move { x, y, .. } = input {
            let ids = self
                .nodes
                .values()
                .filter(|n| {
                    n.kind == NodeKind::SemanticZoom
                        && n.visible
                        && props(n).is_zoomed_in_view_active
                        && props(n).is_zoom_out_button_enabled
                        && !n.view_control.motion.active(self.time)
                        && self.inside(n.id, *x, *y)
                        && !self.menu_pointer_touch
                })
                .map(|n| n.id)
                .collect::<Vec<_>>();
            for id in ids {
                let s = &mut self.nodes.get_mut(&id).unwrap().view_control;
                if s.zoom_button_motion.to != 1. {
                    s.zoom_button_motion.retarget(
                        1.,
                        self.time,
                        if self.reduced_motion { 0. } else { 167. },
                    );
                    s.zoom_button_motion.curve = [0., 0., 1., 1.];
                }
                s.zoom_button_deadline =
                    Some(self.time + contract()["zoomButtonHideDelayMs"].as_f64().unwrap() + 167.);
                self.invalidate(id, true);
            }
        }
        if self.swipe_input(input)? {
            return Ok(true);
        }
        if let Input::Down { x, y, .. } = input {
            let zoom = self
                .nodes
                .values()
                .filter(|n| {
                    n.kind == NodeKind::CollectionHeader
                        && n.visible
                        && self.inside(n.id, *x, *y)
                        && self.swipe_ancestors_contain(n.id, *x, *y)
                })
                .find_map(|header| {
                    self.nodes
                        .values()
                        .find(|n| {
                            n.kind == NodeKind::SemanticZoom
                                && props(n).can_change_views
                                && self.semantic_slot(n.id, header.id)
                                    == Some(ViewControlSlot::ZoomedIn)
                        })
                        .map(|n| n.id)
                });
            if let Some(id) = zoom {
                self.update(vec![Update {
                    id,
                    patch: json!({"viewControls":{"isZoomedInViewActive":false}}),
                }])?;
                return Ok(true);
            }
        }
        if let Input::ViewControl {
            id,
            action,
            request,
            cancel,
            parameter,
        } = input
        {
            let n = self.get(*id)?;
            let kind = n.kind;
            let p = props(n);
            match action.as_str() {
                "execute" => self.request_execute(*id, parameter.clone())?,
                "resolveExecute" => {
                    let pending = self
                        .nodes
                        .get_mut(id)
                        .unwrap()
                        .view_control
                        .pending
                        .remove(&request.unwrap_or(0));
                    if let Some(pending) = pending {
                        if !cancel
                            && pending.chain.iter().all(|id| {
                                self.command_can_execute(*id, &mut vec![]).unwrap_or(false)
                            })
                        {
                            if let Some(child) = p.command {
                                self.request_execute_chain(
                                    child,
                                    pending.parameter,
                                    pending.chain,
                                )?;
                            } else {
                                for target in pending.chain {
                                    self.view_emit(
                                        target,
                                        EventKind::ExecuteRequested,
                                        None,
                                        json!({"parameter":pending.parameter}),
                                    );
                                }
                            }
                        }
                    }
                }
                "notifyCanExecuteChanged" => {
                    if !is_command(kind) {
                        return Err("target is not a UICommand".into());
                    }
                    self.emit(*id, EventKind::CanExecuteChanged);
                }
                "openPane" if kind == NodeKind::SplitView => self.update(vec![Update {
                    id: *id,
                    patch: json!({"viewControls":{"isPaneOpen":true}}),
                }])?,
                "closePane" if kind == NodeKind::SplitView => self.close_pane_request(*id),
                "resolvePane" if kind == NodeKind::SplitView => {
                    let s = &mut self.nodes.get_mut(id).unwrap().view_control;
                    if request.is_some() && s.closing == *request {
                        s.closing = None;
                        if !cancel {
                            s.close_approved = true;
                            self.update(vec![Update {
                                id: *id,
                                patch: json!({"viewControls":{"isPaneOpen":false}}),
                            }])?;
                        }
                    }
                }
                "toggleZoom" if kind == NodeKind::SemanticZoom => {
                    if p.can_change_views {
                        self.update(vec![Update{id:*id,patch:json!({"viewControls":{"isZoomedInViewActive":!p.is_zoomed_in_view_active}})}])?;
                    }
                }
                "navigateToGroup" if kind == NodeKind::SemanticZoom => {
                    if p.can_change_views {
                        let group = parameter.as_str().ok_or("group key must be a string")?;
                        let target = self
                            .nodes
                            .values()
                            .filter(|n| {
                                collections::is_view(n.kind)
                                    && self.semantic_slot(*id, n.id)
                                        == Some(ViewControlSlot::ZoomedIn)
                            })
                            .find_map(|n| {
                                n.props
                                    .collection_items
                                    .iter()
                                    .position(|item| item.group.as_deref() == Some(group))
                                    .map(|index| (n.id, index))
                            });
                        let (target, index) =
                            target.ok_or("group not present in the semantic view")?;
                        self.update(vec![Update {
                            id: *id,
                            patch: json!({"viewControls":{"isZoomedInViewActive":true}}),
                        }])?;
                        self.collection_input(&Input::CollectionScroll { id: target, index })?;
                    }
                }
                _ => return Err("unsupported view/command action".into()),
            }
            return Ok(true);
        }
        if let Input::CommandAccelerator {
            key,
            control,
            shift,
            alt,
        } = input
        {
            let command = self
                .nodes
                .values()
                .filter(|n| is_command(n.kind))
                .find_map(|n| {
                    self.command_metadata(n.id)
                        .ok()
                        .filter(|m| {
                            m.can_execute
                                && m.accelerators.iter().any(|a| {
                                    a.key.eq_ignore_ascii_case(key)
                                        && a.modifiers
                                            .contains(&KeyboardAcceleratorModifier::Control)
                                            == *control
                                        && a.modifiers.contains(&KeyboardAcceleratorModifier::Shift)
                                            == *shift
                                        && a.modifiers.contains(&KeyboardAcceleratorModifier::Alt)
                                            == *alt
                                })
                        })
                        .map(|_| n.id)
                });
            if let Some(id) = command {
                self.request_execute(id, Value::Null)?;
                return Ok(true);
            }
            if *control
                && !shift
                && !alt
                && ["+", "-", "Add", "Subtract", "="].contains(&key.as_str())
            {
                let zoom = self.focused.and_then(|focus| {
                    self.nodes
                        .values()
                        .rev()
                        .find(|n| {
                            n.kind == NodeKind::SemanticZoom
                                && n.visible
                                && props(n).can_change_views
                                && self.is_view_descendant(n.id, focus)
                        })
                        .map(|n| n.id)
                });
                if let Some(id) = zoom {
                    self.update(vec![Update{id,patch:json!({"viewControls":{"isZoomedInViewActive":!["-","Subtract"].contains(&key.as_str())}})}])?;
                    return Ok(true);
                }
            }
        }
        let panes = self
            .nodes
            .values()
            .filter(|n| n.kind == NodeKind::SplitView && n.visible)
            .filter(|n| {
                let p = props(n);
                p.is_pane_open && overlay_mode(p.display_mode)
            })
            .map(|n| n.id)
            .collect::<Vec<_>>();
        for id in panes.into_iter().rev() {
            let n = &self.nodes[&id];
            match input {
                Input::KeyDown { key, .. } if key == "Escape" => {
                    self.close_pane_request(id);
                    return Ok(true);
                }
                Input::Down { x, y, .. } => {
                    let (x, y) = n.world.inverse().unwrap_or_default().point(*x, *y);
                    if Rect::new(0., 0., n.rect.width, n.rect.height).contains(x, y)
                        && !n.view_control.pane.contains(x, y)
                    {
                        self.close_pane_request(id);
                        return Ok(true);
                    }
                }
                _ => {}
            }
        }
        Ok(false)
    }
}
pub(super) fn compact_mode(mode: SplitViewDisplayMode) -> bool {
    matches!(
        mode,
        SplitViewDisplayMode::CompactOverlay | SplitViewDisplayMode::CompactInline
    )
}
pub(super) fn overlay_mode(mode: SplitViewDisplayMode) -> bool {
    matches!(
        mode,
        SplitViewDisplayMode::Overlay | SplitViewDisplayMode::CompactOverlay
    )
}
fn reserved(p: &ViewProperties, progress: f64) -> f64 {
    match p.display_mode {
        SplitViewDisplayMode::Overlay => 0.,
        SplitViewDisplayMode::CompactOverlay => p.compact_pane_length,
        SplitViewDisplayMode::Inline => p.open_pane_length * progress,
        SplitViewDisplayMode::CompactInline => {
            p.compact_pane_length + (p.open_pane_length - p.compact_pane_length) * progress
        }
    }
}
