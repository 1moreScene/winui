//! Source-traced scrolling/template primitives. No host-owned interaction state.
use super::*;
use crate::{animation::Motion, render::Draw};
use serde_json::{json, Value};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct PrimitiveProperties {
    pub viewport_size: f64,
    pub indicator_mode: ScrollingIndicatorMode,
    pub scroll_target: Option<u32>,
    pub source: Option<u32>,
    pub footer: String,
}
impl Default for PrimitiveProperties {
    fn default() -> Self {
        Self {
            viewport_size: 0.,
            indicator_mode: Default::default(),
            scroll_target: None,
            source: None,
            footer: String::new(),
        }
    }
}
#[derive(Clone, Copy)]
struct Drag {
    pointer: i32,
    inverse: Matrix,
    origin: [f64; 2],
    previous: [f64; 2],
    value: f64,
}
#[derive(Default)]
pub struct PrimitiveState {
    drag: Option<Drag>,
    repeat: Option<(ScrollEventType, f64)>,
    pub(super) owner: Option<u32>,
    pub(super) building: bool,
    pub(super) header: Option<u32>,
    pub(super) items: Option<u32>,
    pub(super) footer: Option<u32>,
    header_signature: String,
    footer_signature: String,
    hovered: Option<&'static str>,
    pressed: Option<&'static str>,
    pub(super) expansion: Motion,
    last_value: Option<f64>,
}
pub fn props(p: &NodeProperties) -> PrimitiveProperties {
    p.primitives.as_deref().cloned().unwrap_or_default()
}
pub fn is_control(k: NodeKind) -> bool {
    matches!(
        k,
        NodeKind::ScrollBar
            | NodeKind::Thumb
            | NodeKind::TickBar
            | NodeKind::ItemsPresenter
            | NodeKind::ScrollContentPresenter
    )
}
pub fn contract() -> &'static Value {
    static C: std::sync::OnceLock<Value> = std::sync::OnceLock::new();
    C.get_or_init(|| {
        serde_json::from_str(include_str!(
            "../../references/scroll-primitives-template.json"
        ))
        .unwrap()
    })
}
fn primitive_color(theme: Theme, key: &str) -> String {
    text_edit::resource(theme, key).solid_color()
}
fn metric(key: &str) -> f64 {
    contract()["metrics"][key].as_f64().unwrap()
}
pub fn defaults(k: NodeKind, p: &mut NodeProperties) {
    if is_control(k) {
        p.primitives = Some(Box::default());
        p.is_tab_stop = k==NodeKind::Thumb;
    }
    if k == NodeKind::ScrollBar {
        p.orientation = Orientation::Vertical;
        p.maximum = 1.;
        p.value = 0.;
        p.small_change = 0.1;
        p.large_change = 1.;
        p.min_width = metric("ScrollBarSize");
        p.min_height = p.min_width;
        p.corner_radius = 3.;
    }
    if k == NodeKind::ScrollContentPresenter {
        p.clip = true;
        p.horizontal_scroll_bar_visibility = ScrollBarVisibility::Hidden;
        p.vertical_scroll_bar_visibility = ScrollBarVisibility::Hidden;
        p.horizontal_scroll_mode = ScrollMode::Enabled;
        p.vertical_scroll_mode = ScrollMode::Enabled;
    }
    if k == NodeKind::TickBar {
        p.clip = true;
    }
}
pub fn validate(p: &NodeProperties) -> Result<(), String> {
    if !p.tick_frequency.is_finite()
        || p.tick_frequency < 0.
        || p.tick_frequency > 1e12
        || (p.tick_frequency > 0. && (p.maximum - p.minimum) / p.tick_frequency > u32::MAX as f64)
    {
        return Err("Invalid tickFrequency".into());
    }
    if let Some(q) = &p.primitives {
        if !(p.maximum - p.minimum).is_finite()
            || !q.viewport_size.is_finite()
            || q.viewport_size < 0.
            || q.viewport_size > 1e12
            || q.footer.len() > 1_000_000
        {
            return Err("Invalid scrolling primitive property".into());
        }
    }
    Ok(())
}
#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BarGeometry {
    pub thumb: Option<Rect>,
    pub small_decrease: Rect,
    pub small_increase: Rect,
    pub large_decrease: Rect,
    pub large_increase: Rect,
    pub travel: f64,
    pub reversed: bool,
}
impl BarGeometry {
    fn hit(&self, x: f64, y: f64) -> Option<&'static str> {
        if self.thumb.is_some_and(|r| r.contains(x, y)) {
            Some("thumb")
        } else if self.small_decrease.contains(x, y) {
            Some("smallDecrease")
        } else if self.small_increase.contains(x, y) {
            Some("smallIncrease")
        } else if self.large_decrease.contains(x, y) {
            Some("largeDecrease")
        } else if self.large_increase.contains(x, y) {
            Some("largeIncrease")
        } else {
            None
        }
    }
}
/// TickBar_Partial.cpp: logical full intervals, minimum 20 DIP visual gap,
/// partial final intervals, half-thumb offset and one physical pixel thickness.
pub fn tick_marks(
    length: f64,
    cross: f64,
    thumb: f64,
    min: f64,
    max: f64,
    frequency: f64,
    vertical: bool,
    reversed: bool,
    dpr: f64,
) -> Vec<Rect> {
    if [length, cross, thumb, min, max, frequency, dpr, max - min]
        .iter()
        .any(|v| !v.is_finite())
        || frequency <= 0.
        || length <= 0.
        || cross <= 0.
        || max < min
        || dpr <= 0.
    {
        return vec![];
    }
    let range = (length - thumb).max(0.);
    let intervals = ((max - min) / frequency).max(1.);
    if !intervals.is_finite() || intervals > u32::MAX as f64 {
        return vec![];
    }
    let mut interval = (range / intervals).max(1.);
    let stride = (contract()["tickBar"]["minimumGap"].as_f64().unwrap() / interval).ceil().max(1.);
    interval *= stride;
    let count = (intervals.floor() / stride).floor() as usize + 1;
    let pixel = 1. / dpr;
    let offset = ((thumb - pixel) / 2.).max(0.);
    // Scene dimensions are finite. Skip fully clipped marks instead of allocating
    // a rectangle for every logical tick in an oversized business range.
    (0..count.min(16384))
        .filter_map(|i| {
            let pos = if vertical == reversed {
                offset + i as f64 * interval
            } else {
                length - offset - pixel - i as f64 * interval
            };
            let pos = (pos * dpr).round() / dpr;
            if pos < -pixel || pos > length {
                return None;
            }
            Some(if vertical {
                Rect::new(0., pos, cross, pixel)
            } else {
                Rect::new(pos, 0., pixel, cross)
            })
        })
        .collect()
}
impl Scene {
    pub(super) fn validate_primitive_references(
        &self,
        id: u32,
        kind: NodeKind,
        p: &NodeProperties,
    ) -> Result<(), String> {
        let q = props(p);
        if kind == NodeKind::ItemsPresenter {
            let mut at = self.nodes.get(&id).and_then(|n| n.parent);
            let mut depth = 0;
            while let Some(p) = at {
                depth += 1;
                at = self.nodes[&p].parent;
            }
            if depth > 60 {
                return Err("ItemsPresenter template exceeds scene depth".into());
            }
            if let Some(n) = self.nodes.get(&id) {
                for (slot, text) in [
                    (n.primitive.header, p.header.clone()),
                    (n.primitive.footer, q.footer.clone()),
                ] {
                    if let Some(slot) = slot {
                        let mut props = self.nodes[&slot].props.clone();
                        props.content_host.as_mut().unwrap().content =
                            (!text.is_empty()).then_some(text);
                        self.validate_host_patch(slot, &props)?;
                    }
                }
            }
        }
        if let Some(target) = q.scroll_target {
            if kind != NodeKind::ScrollBar
                || target == id
                || !collections::is_scroll_owner(self.get(target)?.kind)
            {
                return Err("scrollTarget requires a live scrolling control in this Scene".into());
            }
        }
        if let Some(source) = q.source {
            if kind != NodeKind::TickBar
                || source == id
                || self.get(source)?.kind != NodeKind::Slider
            {
                return Err("TickBar source requires a live Slider in this Scene".into());
            }
        }
        Ok(())
    }
    pub(super) fn primitive_content_parent(&self, parent: u32) -> Result<u32, String> {
        let n = self.get(parent)?;
        if n.kind == NodeKind::ItemsPresenter && !n.primitive.building {
            return n
                .primitive
                .items
                .ok_or("ItemsPresenter is not initialized".into());
        }
        Ok(parent)
    }
    pub(super) fn init_primitive(&mut self, id: u32) -> Result<(), String> {
        if self.nodes[&id].kind != NodeKind::ItemsPresenter {
            return Ok(());
        }
        self.nodes.get_mut(&id).unwrap().primitive.building = true;
        let result = (|| {
            let h=self.create(id,NodeKind::ContentControl,json!({"horizontalContentAlignment":"Stretch","verticalContentAlignment":"Stretch","isTabStop":false}))?;
            let items = self.create(id, NodeKind::Grid, json!({}))?;
            let f=self.create(id,NodeKind::ContentControl,json!({"horizontalContentAlignment":"Stretch","verticalContentAlignment":"Stretch","isTabStop":false}))?;
            Ok::<_, String>((h, items, f))
        })();
        self.nodes.get_mut(&id).unwrap().primitive.building = false;
        let (h, items, f) = result?;
        for child in [h, items, f] {
            self.nodes.get_mut(&child).unwrap().primitive.owner = Some(id);
        }
        let state = &mut self.nodes.get_mut(&id).unwrap().primitive;
        state.header = Some(h);
        state.items = Some(items);
        state.footer = Some(f);
        Ok(())
    }
    pub fn primitive_slot(&self, id: u32, slot: &str) -> Result<u32, String> {
        let n = self.get(id)?;
        if n.kind != NodeKind::ItemsPresenter {
            return Err("Presenter slots require ItemsPresenter".into());
        }
        match slot {
            "header" => n.primitive.header,
            "items" => n.primitive.items,
            "footer" => n.primitive.footer,
            _ => None,
        }
        .ok_or("Unknown presenter slot".into())
    }
    pub(super) fn bar_geometry(&self, id: u32) -> BarGeometry {
        let n = &self.nodes[&id];
        let p = &n.props;
        let q = props(p);
        let vertical = p.orientation == Orientation::Vertical;
        let length = if vertical {
            n.rect.height
        } else {
            n.rect.width
        };
        let cross = if vertical {
            n.rect.width
        } else {
            n.rect.height
        };
        let round = |v: f64| (v * self.dpr).round() / self.dpr;
        let button = metric("ScrollBarSize").min(length / 2.);
        let rail = (length - 2. * button).max(0.);
        let range = p.maximum - p.minimum;
        let thumb_size = round(
            (rail * q.viewport_size / (q.viewport_size + range).max(1.))
                .max(round(metric("ScrollBarVerticalThumbMinHeight"))),
        );
        let reversed = p.is_direction_reversed
            ^ (!vertical && self.effective_flow_direction(id) == FlowDirection::RightToLeft);
        let frac = if range > 0. {
            ((p.value - p.minimum) / range).clamp(0., 1.)
        } else {
            0.
        };
        let frac = if reversed { 1. - frac } else { frac };
        let travel = (rail - thumb_size).max(0.);
        let start = button + round(frac * travel);
        let rect = |pos: f64, len: f64| {
            if vertical {
                Rect::new(0., pos, cross, len.max(0.))
            } else {
                Rect::new(pos, 0., len.max(0.), cross)
            }
        };
        let mouse = range > 0.
            && rail > round(metric("ScrollBarVerticalThumbMinHeight"))
            && thumb_size <= rail;
        let expanded = n.primitive.expansion.value(self.time);
        let width = 2. + 6. * expanded;
        let axis = round((cross - width) / 2.) + metric("ScrollBarThumbOffset");
        let mut thumb = mouse.then(|| {
            if vertical {
                Rect::new(axis, start, width, thumb_size)
            } else {
                Rect::new(start, axis, thumb_size, width)
            }
        });
        if q.indicator_mode == ScrollingIndicatorMode::TouchIndicator && range > 0. {
            let len =
                round((length * q.viewport_size / (q.viewport_size + range).max(1.)).max(32.))
                    .min(length);
            let pos = round(frac * (length - len));
            thumb = Some(if vertical {
                Rect::new(cross - 4., pos, 2., len)
            } else {
                Rect::new(pos, cross - 4., len, 2.)
            });
        }
        BarGeometry {
            thumb,
            small_decrease: rect(0., button),
            small_increase: rect(length - button, button),
            large_decrease: rect(button, start - button),
            large_increase: rect(start + thumb_size, length - button - start - thumb_size),
            travel,
            reversed,
        }
    }
    pub(super) fn primitive_tick_rects(&self, id: u32) -> Vec<Rect> {
        let n = &self.nodes[&id];
        let Some(source) = props(&n.props).source.and_then(|id| self.nodes.get(&id)) else {
            return vec![];
        };
        let p = &source.props;
        let v = self.slider_geometry(source.id);
        let vertical = p.orientation == Orientation::Vertical;
        tick_marks(
            if vertical {
                n.rect.height
            } else {
                n.rect.width
            },
            if vertical {
                n.rect.width
            } else {
                n.rect.height
            },
            if vertical {
                v.thumb.height
            } else {
                v.thumb.width
            },
            p.minimum,
            p.maximum,
            p.tick_frequency,
            vertical,
            p.is_direction_reversed
                ^ (self.effective_flow_direction(source.id) == FlowDirection::RightToLeft
                    && !vertical),
            self.dpr,
        )
    }
    pub(super) fn measure_primitive(
        &mut self,
        id: u32,
        inner: [f64; 2],
        m: &mut impl TextMeasurer,
    ) -> [f64; 2] {
        let n = &self.nodes[&id];
        if n.kind == NodeKind::ScrollBar {
            return [metric("ScrollBarSize"); 2];
        }
        if n.kind == NodeKind::TickBar || n.kind == NodeKind::Thumb {
            return [0.; 2];
        }
        let axis = usize::from(n.props.orientation == Orientation::Vertical);
        let children = self.nodes[&id].children.clone();
        let mut result = [0.0_f64; 2];
        for child in children {
            let mut available = inner;
            available[axis] = f64::INFINITY;
            let d = self.measure_node(child, available, m);
            result[axis] += d[axis];
            result[1 - axis] = result[1 - axis].max(d[1 - axis]);
        }
        result
    }
    pub(super) fn arrange_items_presenter(
        &mut self,
        id: u32,
        inner: Rect,
        m: &mut impl TextMeasurer,
    ) {
        let n = &self.nodes[&id];
        let axis = usize::from(n.props.orientation == Orientation::Vertical);
        let (world, theme, enabled, visible) = (n.world, n.theme, n.enabled, n.visible);
        let mut at = if axis == 1 { inner.y } else { inner.x };
        for child in [n.primitive.header, n.primitive.items, n.primitive.footer]
            .into_iter()
            .flatten()
            .collect::<Vec<_>>()
        {
            let size = self.nodes[&child].desired[axis];
            let slot = if axis == 1 {
                Rect::new(inner.x, at, inner.width, size)
            } else {
                Rect::new(at, inner.y, size, inner.height)
            };
            self.arrange_node(child, slot, world, (theme, enabled, visible), m);
            at += size;
        }
    }
    pub(super) fn sync_primitives(&mut self) {
        let ids = self
            .nodes
            .values()
            .filter(|n| is_control(n.kind))
            .map(|n| n.id)
            .collect::<Vec<_>>();
        for id in ids {
            let kind = self.nodes[&id].kind;
            if self.nodes[&id].primitive.drag.is_some() && !self.effective_enabled(id) {
                self.end_primitive_drag(id, true);
            }
            if kind == NodeKind::ItemsPresenter {
                let (h, f) = (
                    self.nodes[&id].props.header.clone(),
                    props(&self.nodes[&id].props).footer,
                );
                for (header, text) in [(true, h), (false, f)] {
                    let state = &self.nodes[&id].primitive;
                    let old = if header {
                        &state.header_signature
                    } else {
                        &state.footer_signature
                    };
                    if old == &text {
                        continue;
                    }
                    let child = if header { state.header } else { state.footer }.unwrap();
                    self.nodes
                        .get_mut(&child)
                        .unwrap()
                        .props
                        .content_host
                        .as_mut()
                        .unwrap()
                        .content = (!text.is_empty()).then_some(text.clone());
                    if header {
                        self.nodes.get_mut(&id).unwrap().primitive.header_signature = text;
                    } else {
                        self.nodes.get_mut(&id).unwrap().primitive.footer_signature = text;
                    }
                    self.invalidate(id, true);
                }
            }
            if kind == NodeKind::ScrollBar {
                let q = props(&self.nodes[&id].props);
                if let Some(target) = q.scroll_target.filter(|t| self.nodes.contains_key(t)) {
                    if self.nodes[&id]
                        .primitive
                        .last_value
                        .is_some_and(|v| v != self.nodes[&id].props.value)
                    {
                        let value = self.nodes[&id].props.value;
                        let vertical = self.nodes[&id].props.orientation == Orientation::Vertical;
                        let _ = self.scroll_change(
                            target,
                            (!vertical).then_some(value),
                            vertical.then_some(value),
                            None,
                            false,
                        );
                    }
                    let axis =
                        usize::from(self.nodes[&id].props.orientation == Orientation::Vertical);
                    let t = &self.nodes[&target];
                    let max = t.scroll.max(self.time)[axis];
                    let viewport = t.scroll.viewport[axis];
                    let offset = t.scroll.offsets(self.time)[axis];
                    let n = self.nodes.get_mut(&id).unwrap();
                    n.props.minimum = 0.;
                    n.props.maximum = max;
                    n.props.value = offset;
                    n.props.primitives.as_mut().unwrap().viewport_size = viewport;
                }
                let n = self.nodes.get_mut(&id).unwrap();
                n.props.value = n.props.value.clamp(n.props.minimum, n.props.maximum);
                n.primitive.last_value = Some(n.props.value);
                let target = if n.primitive.hovered.is_some()
                    || n.primitive.drag.is_some()
                    || q.indicator_mode == ScrollingIndicatorMode::MouseIndicator
                {
                    1.
                } else {
                    0.
                };
                if self.reduced_motion {
                    n.primitive.expansion.snap(target)
                } else if n.primitive.expansion.to != target {
                    n.primitive.expansion.retarget(
                        target,
                        self.time,
                        scroll::milliseconds("ScrollBarExpandDuration"),
                    );
                }
                if !self.effective_enabled(id) {
                    self.nodes.get_mut(&id).unwrap().primitive.repeat = None;
                }
            }
        }
    }
    fn primitive_event(&mut self, id: u32, kind: EventKind, payload: Value) {
        self.emit(id, kind);
        self.events.last_mut().unwrap().payload = Some(payload);
    }
    fn set_bar_value(
        &mut self,
        id: u32,
        value: f64,
        event_type: ScrollEventType,
    ) -> Result<(), String> {
        let n = self.get(id)?;
        if n.kind != NodeKind::ScrollBar {
            return Err("Scroll action requires ScrollBar".into());
        }
        let value = value.clamp(n.props.minimum, n.props.maximum);
        let old = n.props.value;
        let target = props(&n.props).scroll_target;
        let vertical = n.props.orientation == Orientation::Vertical;
        self.nodes.get_mut(&id).unwrap().props.value = value;
        if let Some(target) = target {
            self.scroll_change(
                target,
                (!vertical).then_some(value),
                vertical.then_some(value),
                None,
                false,
            )?;
        }
        if old != value {
            self.emit(id, EventKind::ValueChanged);
            self.events.last_mut().unwrap().payload =
                Some(json!({"oldValue":old,"newValue":value}));
        }
        if old == value && event_type != ScrollEventType::EndScroll {
            return Ok(());
        }
        self.primitive_event(
            id,
            EventKind::Scroll,
            json!({"scroll":{"eventType":event_type,"newValue":value}}),
        );
        self.invalidate(id, true);
        Ok(())
    }
    fn bar_action(&mut self, id: u32, event: ScrollEventType) -> Result<(), String> {
        let p = &self.nodes[&id].props;
        let value = match event {
            ScrollEventType::SmallDecrement => p.value - p.small_change,
            ScrollEventType::SmallIncrement => p.value + p.small_change,
            ScrollEventType::LargeDecrement => p.value - p.large_change,
            ScrollEventType::LargeIncrement => p.value + p.large_change,
            ScrollEventType::First => p.minimum,
            ScrollEventType::Last => p.maximum,
            _ => p.value,
        };
        self.set_bar_value(id, value, event)
    }
    fn end_primitive_drag(&mut self, id: u32, canceled: bool) {
        let n = self.nodes.get_mut(&id).unwrap();
        let drag = n.primitive.drag.take();
        let was_pressed = n.primitive.pressed.take().is_some();
        n.primitive.repeat = None;
        if let Some(d) = drag {
            if n.kind == NodeKind::Thumb {
                self.primitive_event(id,EventKind::DragCompleted,json!({"horizontalChange":d.previous[0]-d.origin[0],"verticalChange":d.previous[1]-d.origin[1],"canceled":canceled}));
            } else {
                let _ = self.bar_action(id, ScrollEventType::EndScroll);
            }
        } else if was_pressed && self.nodes[&id].kind == NodeKind::ScrollBar {
            let _ = self.bar_action(id, ScrollEventType::EndScroll);
        }
        if self.captured.is_some_and(|c| c.1 == id) {
            self.captured = None;
        }
        self.invalidate(id, true);
    }
    pub(super) fn primitive_deadline(&self) -> Option<f64> {
        self.nodes
            .values()
            .filter_map(|n| n.primitive.repeat.map(|r| r.1).filter(|t| t.is_finite()))
            .min_by(f64::total_cmp)
    }
    pub(super) fn primitive_tick(&mut self) {
        let ids = self
            .nodes
            .values()
            .filter_map(|n| {
                n.primitive
                    .repeat
                    .filter(|r| r.1 <= self.time)
                    .map(|r| (n.id, r.0))
            })
            .collect::<Vec<_>>();
        for (id, event) in ids {
            if self.effective_enabled(id) {
                let _ = self.bar_action(id, event);
                self.nodes.get_mut(&id).unwrap().primitive.repeat = Some((event, self.time + 50.));
            } else {
                self.end_primitive_drag(id, true);
            }
        }
    }
    pub(super) fn primitive_snapshot(&self, id: u32) -> Option<Value> {
        let n = &self.nodes[&id];
        if !is_control(n.kind) {
            return None;
        }
        Some(
            json!({"isDragging":n.primitive.drag.is_some(),"bar":(n.kind==NodeKind::ScrollBar).then(||self.bar_geometry(id)),"ticks":(n.kind==NodeKind::TickBar).then(||self.primitive_tick_rects(id)),"header":n.primitive.header,"items":n.primitive.items,"footer":n.primitive.footer,"hovered":n.primitive.hovered,"expansion":n.primitive.expansion.value(self.time)}),
        )
    }
    pub(super) fn paint_primitive(&self, id: u32, out: &mut Vec<Draw>) {
        let n = &self.nodes[&id];
        let p = &n.props;
        if n.kind == NodeKind::TickBar {
            let color = p
                .fill
                .as_ref()
                .map(|b| Self::color(b, n.theme))
                .unwrap_or_else(|| {
                    primitive_color(
                        n.theme,
                        if n.enabled {
                            "SliderTickBarFill"
                        } else {
                            "SliderTickBarFillDisabled"
                        },
                    )
                });
            for rect in self.primitive_tick_rects(id) {
                out.push(Draw::Fill {
                    rect,
                    color: color.clone(),
                    radius: 0.,
                });
            }
            return;
        }
        if n.kind != NodeKind::ScrollBar {
            return;
        }
        let g = self.bar_geometry(id);
        let expanded = n.primitive.expansion.value(self.time);
        let q = props(p);
        if expanded > 0. && q.indicator_mode != ScrollingIndicatorMode::TouchIndicator {
            out.push(Draw::Layer { opacity: expanded });
            let rect = Rect::new(0., 0., n.rect.width, n.rect.height);
            let brush = text_edit::resource(n.theme, "ScrollBarTrackFill");
            out.push(Draw::RoundedClip { rect, radius: 6. });
            if brush.kind == "acrylic" {
                out.push(Draw::Acrylic {
                    rect,
                    recipe: crate::material::AcrylicOptions {
                        tint_color: brush.tint.clone(),
                        tint_opacity: brush.tint_opacity,
                        luminosity_opacity: brush.luminosity_opacity,
                        fallback_color: brush.fallback.clone(),
                    },
                    colors: None,
                    weight: if self.reduced_transparency || n.theme == Theme::HighContrast {
                        0.
                    } else {
                        1.
                    },
                });
            } else {
                Self::brush_command(out, rect, 6., 0., brush);
            }
            out.push(Draw::Restore);
            let vertical = p.orientation == Orientation::Vertical;
            for (r, first) in [(g.small_decrease, true), (g.small_increase, false)] {
                let key = if !n.enabled {
                    "ScrollBarButtonArrowForegroundDisabled"
                } else if n.primitive.pressed.is_some() {
                    "ScrollBarButtonArrowForegroundPressed"
                } else {
                    "ScrollBarButtonArrowForeground"
                };
                let color = primitive_color(n.theme, key);
                out.push(Draw::Text {
                    style: FontStyle::Normal,
                    x: r.x
                        + if vertical {
                            2.
                        } else if first {
                            4.
                        } else {
                            0.
                        },
                    y: r.y
                        + if vertical {
                            if first {
                                11.
                            } else {
                                7.
                            }
                        } else {
                            9.
                        },
                    text: match (vertical, first) {
                        (true, true) => "\u{eddb}",
                        (true, false) => "\u{eddc}",
                        (false, true) => "\u{edd9}",
                        (false, false) => "\u{edda}",
                    }
                    .into(),
                    color,
                    size: 8.,
                    font: "Segoe Fluent Icons".into(),
                    max_width: 8.,
                    weight: 400,
                });
            }
            out.push(Draw::EndLayer);
        }
        if let Some(mut rect) = g.thumb {
            let suffix = if !n.enabled {
                "Disabled"
            } else if n.primitive.drag.is_some() {
                "Pressed"
            } else if n.primitive.hovered == Some("thumb") {
                "PointerOver"
            } else {
                ""
            };
            let color = primitive_color(n.theme, &format!("ScrollBarThumbFill{suffix}"));
            if expanded > 0. {
                if p.orientation == Orientation::Vertical {
                    rect.x += 1.;
                    rect.width = (rect.width - 2.).max(0.)
                } else {
                    rect.y += 1.;
                    rect.height = (rect.height - 2.).max(0.)
                }
            }
            out.push(Draw::Fill {
                rect,
                color,
                radius: 3.,
            });
        }
    }
    pub(super) fn primitive_input(&mut self, input: &Input) -> Result<bool, String> {
        if let Input::Primitive { id, action, value } = input {
            self.get(*id)?;
            match action.as_str() {
                "cancelDrag" => {
                    if self.get(*id)?.kind != NodeKind::Thumb {
                        return Err("cancelDrag requires Thumb".into());
                    }
                    self.end_primitive_drag(*id, true)
                }
                "setValue" => {
                    if !value.is_finite() {
                        return Err("Invalid scroll value".into());
                    }
                    self.set_bar_value(*id, *value, ScrollEventType::ThumbPosition)?
                }
                "first" => self.bar_action(*id, ScrollEventType::First)?,
                "last" => self.bar_action(*id, ScrollEventType::Last)?,
                _ => return Err("Unknown primitive action".into()),
            };
            return Ok(true);
        }
        if matches!(input, Input::Blur | Input::Cancel { .. }) {
            let pointer = if let Input::Cancel { pointer } = input {
                *pointer
            } else {
                None
            };
            let ids = self
                .nodes
                .values()
                .filter(|n| {
                    (n.primitive.drag.is_some() || n.primitive.pressed.is_some())
                        && pointer.is_none_or(|p| {
                            n.primitive.drag.is_some_and(|d| d.pointer == p)
                                || self.captured == Some((p, n.id))
                        })
                })
                .map(|n| n.id)
                .collect::<Vec<_>>();
            for id in ids {
                self.end_primitive_drag(id, true);
            }
            return Ok(false);
        }
        if let Input::KeyDown { key, .. } = input {
            if key == "Escape" {
                if let Some((_, id)) = self.captured.filter(|c| {
                    matches!(self.nodes[&c.1].kind, NodeKind::Thumb | NodeKind::ScrollBar)
                }) {
                    self.end_primitive_drag(id, true);
                    return Ok(true);
                }
            }
            if let Some(id) = self.focused.filter(|id| {
                self.nodes[id].kind == NodeKind::ScrollBar && self.effective_enabled(*id)
            }) {
                let g = self.bar_geometry(id);
                let event = match key.as_str() {
                    "Home" => Some(ScrollEventType::First),
                    "End" => Some(ScrollEventType::Last),
                    "PageUp" => Some(ScrollEventType::LargeDecrement),
                    "PageDown" => Some(ScrollEventType::LargeIncrement),
                    "ArrowUp" | "ArrowLeft" => Some(if g.reversed {
                        ScrollEventType::SmallIncrement
                    } else {
                        ScrollEventType::SmallDecrement
                    }),
                    "ArrowDown" | "ArrowRight" => Some(if g.reversed {
                        ScrollEventType::SmallDecrement
                    } else {
                        ScrollEventType::SmallIncrement
                    }),
                    _ => None,
                };
                if let Some(event) = event {
                    self.bar_action(id, event)?;
                    return Ok(true);
                }
            }
        }
        let (pointer, x, y, phase) = match input {
            Input::Down { pointer, x, y } => (*pointer, *x, *y, "down"),
            Input::Move { pointer, x, y } => (*pointer, *x, *y, "move"),
            Input::Up { pointer, x, y } => (*pointer, *x, *y, "up"),
            Input::Touch {
                pointer,
                x,
                y,
                phase,
            } => (*pointer, *x, *y, phase.as_str()),
            _ => return Ok(false),
        };
        if !x.is_finite() || !y.is_finite() {
            return Err("Invalid primitive pointer position".into());
        }
        let captured = self
            .captured
            .filter(|c| {
                c.0 == pointer
                    && matches!(self.nodes[&c.1].kind, NodeKind::Thumb | NodeKind::ScrollBar)
            })
            .map(|c| c.1);
        let hit = captured
            .or_else(|| self.hit(x, y))
            .filter(|id| matches!(self.nodes[id].kind, NodeKind::Thumb | NodeKind::ScrollBar));
        if phase == "move" {
            let bars = self
                .nodes
                .values()
                .filter(|n| n.kind == NodeKind::ScrollBar)
                .map(|n| n.id)
                .collect::<Vec<_>>();
            for id in bars {
                let hovered = (Some(id) == hit)
                    .then(|| {
                        let (lx, ly) = self.nodes[&id]
                            .world
                            .inverse()
                            .unwrap_or_default()
                            .point(x, y);
                        self.bar_geometry(id).hit(lx, ly)
                    })
                    .flatten();
                if self.nodes[&id].primitive.hovered != hovered {
                    self.nodes.get_mut(&id).unwrap().primitive.hovered = hovered;
                    if let Some((event, at)) = self.nodes[&id].primitive.repeat {
                        let over =
                            self.nodes[&id].primitive.pressed == hovered && hovered.is_some();
                        self.nodes.get_mut(&id).unwrap().primitive.repeat = Some((
                            event,
                            if over {
                                if at.is_finite() {
                                    at
                                } else {
                                    self.time + 250.
                                }
                            } else {
                                f64::INFINITY
                            },
                        ));
                    }
                    self.invalidate(id, true);
                }
            }
        }
        let Some(id) = hit else { return Ok(false) };
        if !self.effective_enabled(id) {
            return Ok(false);
        }
        if phase == "cancel" {
            self.end_primitive_drag(id, true);
            return Ok(true);
        }
        let kind = self.nodes[&id].kind;
        let inverse = self.nodes[&id].world.inverse().unwrap_or_default();
        let (lx, ly) = inverse.point(x, y);
        if phase == "down" {
            if self.captured.is_some() {
                return Ok(false);
            }
            let part = if kind == NodeKind::Thumb {
                Some("thumb")
            } else {
                self.bar_geometry(id).hit(lx, ly)
            };
            let Some(part) = part else { return Ok(false) };
            self.captured = Some((pointer, id));
            self.nodes.get_mut(&id).unwrap().primitive.pressed = Some(part);
            self.nodes.get_mut(&id).unwrap().primitive.hovered = Some(part);
            if self.nodes[&id].props.is_tab_stop {
                self.focus(Some(id));
            }
            if part == "thumb" {
                let value = self.nodes[&id].props.value;
                self.nodes.get_mut(&id).unwrap().primitive.drag = Some(Drag {
                    pointer,
                    inverse,
                    origin: [lx, ly],
                    previous: [lx, ly],
                    value,
                });
                if kind == NodeKind::Thumb {
                    self.primitive_event(
                        id,
                        EventKind::DragStarted,
                        json!({"horizontalOffset":lx,"verticalOffset":ly}),
                    );
                }
            } else {
                let reverse = self.bar_geometry(id).reversed;
                let decrease = part.ends_with("Decrease") ^ reverse;
                let small = part.starts_with("small");
                let event = match (small, decrease) {
                    (true, true) => ScrollEventType::SmallDecrement,
                    (true, false) => ScrollEventType::SmallIncrement,
                    (false, true) => ScrollEventType::LargeDecrement,
                    _ => ScrollEventType::LargeIncrement,
                };
                self.bar_action(id, event)?;
                self.nodes.get_mut(&id).unwrap().primitive.repeat = Some((event, self.time + 250.));
            }
            self.invalidate(id, true);
            return Ok(true);
        }
        if phase == "move" && captured.is_some() {
            if let Some(mut drag) = self.nodes[&id].primitive.drag {
                let (x, y) = drag.inverse.point(x, y);
                if kind == NodeKind::Thumb {
                    if [x, y] != drag.previous {
                        self.primitive_event(id,EventKind::DragDelta,json!({"horizontalChange":x-drag.previous[0],"verticalChange":y-drag.previous[1]}));
                    }
                } else {
                    let p = &self.nodes[&id].props;
                    let axis = usize::from(p.orientation == Orientation::Vertical);
                    let g = self.bar_geometry(id);
                    let delta = ([x, y][axis] - drag.origin[axis])
                        * (if g.reversed { -1. } else { 1. })
                        * (p.maximum - p.minimum)
                        / g.travel.max(1e-9);
                    self.set_bar_value(id, drag.value + delta, ScrollEventType::ThumbTrack)?;
                }
                drag.previous = [x, y];
                self.nodes.get_mut(&id).unwrap().primitive.drag = Some(drag);
            }
            self.invalidate(id, true);
            return Ok(true);
        }
        if phase == "up" && captured.is_some() {
            self.end_primitive_drag(id, false);
            return Ok(true);
        }
        Ok(false)
    }
}
