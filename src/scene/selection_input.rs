use super::*;
use crate::{animation::Motion, resources::Resources};
use serde_json::{json, Value};
use std::sync::OnceLock;
fn template() -> &'static Value {
    static V: OnceLock<Value> = OnceLock::new();
    V.get_or_init(|| {
        serde_json::from_str(include_str!(
            "../../references/selection-input-template.json"
        ))
        .unwrap()
    })
}
pub fn duration(key: &str) -> f64 {
    static V: OnceLock<Value> = OnceLock::new();
    V.get_or_init(|| {
        serde_json::from_str(include_str!("../../references/input-timing.json")).unwrap()
    })[key]
        .as_f64()
        .expect("native animation resource")
}
fn curve() -> [f64; 4] {
    static V: OnceLock<[f64; 4]> = OnceLock::new();
    *V.get_or_init(|| {
        serde_json::from_str(include_str!("../../references/input-easing.json")).unwrap()
    })
}
fn reposition() -> &'static Value {
    static V: OnceLock<Value> = OnceLock::new();
    V.get_or_init(|| {
        serde_json::from_str(include_str!("../../references/input-reposition.json")).unwrap()
    })
}
pub fn color(kind: NodeKind, state: ControlState, part: &str, theme: Theme) -> String {
    let style = &template()["styles"][kind.as_str()]["states"];
    let key = style[state.as_str()][part]
        .as_str()
        .or_else(|| style["Normal"][part].as_str())
        .expect("source template brush");
    Resources::current()
        .resolve(theme, key)
        .expect("native-resolved input resource")
        .solid_color()
}
#[derive(Default)]
pub struct SelectionVisual {
    pub position: Motion,
    pub width: Motion,
    pub height: Motion,
    pub blend: Motion,
    pub pressed_width: Motion,
    pub off_fill: ColorTrack,
    pub off_stroke: ColorTrack,
    pub drag: Option<(f64, f64, bool)>,
    pub drag_offset: Option<f64>,
    initialized: bool,
}
impl SelectionVisual {
    fn target(m: &mut Motion, value: f64, time: f64, ms: f64, snap: bool) {
        if snap {
            m.snap(value);
        } else if m.to != value {
            m.retarget(value, time, ms);
        }
        m.curve = curve();
    }
    pub fn sync(&mut self, kind: NodeKind, state: ControlState, on: bool, now: f64, reduced: bool) {
        let snap = !self.initialized || reduced;
        let (w, h) = if kind == NodeKind::RadioButton {
            let d = match state {
                ControlState::PointerOver | ControlState::Disabled => 14.,
                ControlState::Pressed => 10.,
                _ => 12.,
            };
            (d, d)
        } else {
            match state {
                ControlState::PointerOver => (14., 14.),
                ControlState::Pressed => (17., 14.),
                _ => (12., 12.),
            }
        };
        let key = if kind == NodeKind::RadioButton {
            if state == ControlState::Disabled {
                "ControlFastAnimationDuration"
            } else {
                "ControlNormalAnimationDuration"
            }
        } else if state == ControlState::Disabled {
            "ControlNormalAnimationDuration"
        } else {
            "ControlFasterAnimationDuration"
        };
        let snap_size = snap || (kind == NodeKind::RadioButton && state == ControlState::Normal);
        Self::target(&mut self.width, w, now, duration(key), snap_size);
        Self::target(&mut self.height, h, now, duration(key), snap_size);
        if !self.initialized {
            self.pressed_width.snap(4.);
        }
        Self::target(
            &mut self.pressed_width,
            if state == ControlState::Pressed {
                10.
            } else {
                4.
            },
            now,
            duration("ControlFastAnimationDuration"),
            reduced || state != ControlState::Pressed,
        );
        if kind == NodeKind::ToggleSwitch {
            Self::target(
                &mut self.blend,
                f64::from(on),
                now,
                duration("ControlFasterAnimationDuration"),
                snap,
            );
            self.blend.curve = [0., 0., 1., 1.];
            // Reposition is a separate source theme animation; keep its track isolated
            // from hover/press resize and foreground/background opacity transitions.
            let track = &reposition()[0];
            Self::target(
                &mut self.position,
                if on { 20. } else { 0. },
                now,
                track["durationMs"].as_f64().unwrap(),
                snap,
            );
            self.position.curve = serde_json::from_value(track["curve"].clone()).unwrap();
        }
        self.initialized = true;
    }
    pub fn active(&self, now: f64) -> bool {
        self.position.active(now)
            || self.width.active(now)
            || self.height.active(now)
            || self.blend.active(now)
            || self.pressed_width.active(now)
            || self.off_fill.active(now)
            || self.off_stroke.active(now)
    }
}
impl Scene {
    pub(super) fn same_radio_group(
        &self,
        a: u32,
        b: u32,
        staged: &BTreeMap<u32, NodeProperties>,
    ) -> bool {
        let an = &self.nodes[&a];
        let bn = &self.nodes[&b];
        let ap = staged.get(&a).unwrap_or(&an.props);
        let bp = staged.get(&b).unwrap_or(&bn.props);
        if an
            .parent
            .is_some_and(|p| self.nodes[&p].kind == NodeKind::RadioButtons)
            || bn
                .parent
                .is_some_and(|p| self.nodes[&p].kind == NodeKind::RadioButtons)
        {
            return an.parent == bn.parent;
        }
        if ap.group_name.is_empty() {
            an.parent == bn.parent && bp.group_name.is_empty()
        } else {
            ap.group_name == bp.group_name
        }
    }
    pub(super) fn stage_radio_updates(
        &self,
        staged: &mut BTreeMap<u32, NodeProperties>,
        order: &[u32],
    ) {
        let groups: Vec<_> = staged
            .iter()
            .filter(|(id, _)| self.nodes[id].kind == NodeKind::RadioButtons)
            .map(|(id, p)| (*id, p.clone()))
            .collect();
        for (id, p) in groups {
            if serde_json::to_value(&p.items).unwrap()
                != serde_json::to_value(&self.nodes[&id].props.items).unwrap()
            {
                continue;
            }
            for (index, child) in self.nodes[&id].children.iter().enumerate() {
                let mut cp = staged
                    .get(child)
                    .unwrap_or(&self.nodes[child].props)
                    .clone();
                cp.is_checked = Some(index as i32 == p.selected_index);
                cp.font_size = p.font_size;
                cp.font_family = p.font_family.clone();
                cp.font_weight = p.font_weight;
                cp.font_style = p.font_style;
                staged.insert(*child, cp);
            }
        }
        for id in order {
            if self.nodes[id].kind != NodeKind::RadioButton
                || staged.get(id).is_none_or(|p| p.is_checked != Some(true))
            {
                continue;
            }
            for (&peer, node) in &self.nodes {
                if peer != *id
                    && node.kind == NodeKind::RadioButton
                    && self.same_radio_group(*id, peer, staged)
                {
                    let mut props = staged.get(&peer).unwrap_or(&node.props).clone();
                    props.is_checked = Some(false);
                    staged.insert(peer, props);
                }
            }
        }
    }
    pub(super) fn rebuild_radio_items(&mut self, id: u32) -> Result<(), String> {
        let props = self.nodes[&id].props.clone();
        if self.nodes.len() + props.items.len() > 5000 + self.nodes[&id].children.len() {
            return Err("scene node limit reached".into());
        }
        for child in self.nodes[&id].children.clone() {
            self.destroy(child)?;
        }
        for (index, item) in props.items.iter().enumerate() {
            self.create(id,NodeKind::RadioButton,json!({"text":item.text(),"enabled":item.enabled(),"isChecked":index as i32==props.selected_index,"fontSize":props.font_size,"fontFamily":props.font_family,"fontWeight":props.font_weight,"fontStyle":props.font_style}))?;
        }
        self.nodes.get_mut(&id).unwrap().props.selected_index = props.selected_index;
        Ok(())
    }
    pub(super) fn reconcile_radio_groups(&mut self, before: &[(u32, i32)]) {
        for &(id, old) in before {
            if !self.nodes.contains_key(&id) {
                continue;
            }
            let selected = self.nodes[&id]
                .children
                .iter()
                .position(|child| self.nodes[child].props.is_checked == Some(true))
                .map_or(-1, |i| i as i32);
            self.nodes.get_mut(&id).unwrap().props.selected_index = selected;
            if selected != old {
                self.emit(id, EventKind::SelectionChanged);
            }
        }
    }
    fn radio_peers(&self, id: u32) -> Vec<u32> {
        // Walk the actual tree so reordering and reparenting also change keyboard order.
        let mut pending = vec![self.root];
        let mut peers = Vec::new();
        while let Some(at) = pending.pop() {
            let node = &self.nodes[&at];
            pending.extend(node.children.iter().rev().copied());
            if node.kind == NodeKind::RadioButton
                && self.effective_enabled(at)
                && self.same_radio_group(id, at, &BTreeMap::new())
            {
                peers.push(at);
            }
        }
        peers
    }
    pub(super) fn radio_tab_stop(&self, id: u32) -> bool {
        let peers = self.radio_peers(id);
        peers
            .iter()
            .find(|p| self.nodes[p].props.is_checked == Some(true))
            .or_else(|| peers.first())
            .is_some_and(|p| *p == id)
    }
    pub(super) fn radio_arrow(&mut self, id: u32, key: &str) -> Result<(), String> {
        let peers = self.radio_peers(id);
        if peers.is_empty() {
            return Ok(());
        }
        let index = peers.iter().position(|p| *p == id).unwrap_or(0);
        let step = if matches!(key, "ArrowUp" | "ArrowLeft") {
            -1
        } else {
            1
        };
        let grouped = self.nodes[&id]
            .parent
            .is_some_and(|p| self.nodes[&p].kind == NodeKind::RadioButtons);
        let next = if grouped && matches!(key, "ArrowLeft" | "ArrowRight") {
            // Native RadioButtons uses spatial focus for horizontal navigation.
            // Column-major balancing produces unequal columns, so an index stride
            // is incorrect for e.g. four items in three columns.
            let origin = self.nodes[&id].rect;
            peers
                .iter()
                .enumerate()
                .filter(|(_, p)| {
                    let dx = self.nodes[p].rect.x - origin.x;
                    if step < 0 {
                        dx < -0.5
                    } else {
                        dx > 0.5
                    }
                })
                .min_by(|(_, a), (_, b)| {
                    let distance = |p: &u32| {
                        let rect = self.nodes[p].rect;
                        ((rect.x - origin.x).abs(), (rect.y - origin.y).abs())
                    };
                    let a = distance(a);
                    let b = distance(b);
                    a.0.total_cmp(&b.0).then(a.1.total_cmp(&b.1))
                })
                .map_or(index, |(i, _)| i)
        } else if grouped {
            (index as i32 + step).clamp(0, peers.len() as i32 - 1) as usize
        } else {
            (index as i32 + step).rem_euclid(peers.len() as i32) as usize
        };
        self.focus(Some(peers[next]));
        self.update(vec![Update {
            id: peers[next],
            patch: json!({"isChecked":true}),
        }])
    }
    pub(super) fn sync_selection_visuals(&mut self) {
        for n in self.nodes.values_mut() {
            if matches!(n.kind, NodeKind::RadioButton | NodeKind::ToggleSwitch) {
                if n.kind == NodeKind::ToggleSwitch {
                    let state = n.button.state(n.enabled);
                    n.selection_visual.off_fill.update(
                        &color(n.kind, state, "OuterBorder.Fill", n.theme),
                        self.time,
                        self.reduced_motion,
                    );
                    n.selection_visual.off_stroke.update(
                        &color(n.kind, state, "OuterBorder.Stroke", n.theme),
                        self.time,
                        self.reduced_motion,
                    );
                }
                n.selection_visual.sync(
                    n.kind,
                    n.button.state(n.enabled),
                    if n.kind == NodeKind::ToggleSwitch {
                        n.props.is_on
                    } else {
                        n.props.is_checked == Some(true)
                    },
                    self.time,
                    self.reduced_motion,
                );
            }
        }
    }
}
impl Scene {
    pub(super) fn paint_input_header(&self, id: u32, out: &mut Vec<crate::render::Draw>) {
        let n = &self.nodes[&id];
        if n.props.header.is_empty() {
            return;
        }
        let color = Resources::current()
            .resolve(
                n.theme,
                if n.enabled {
                    "TextFillColorPrimaryBrush"
                } else {
                    "TextFillColorDisabledBrush"
                },
            )
            .unwrap()
            .solid_color();
        for line in &n.header_text.lines {
            out.push(crate::render::Draw::Text {
                style: n.props.font_style,
                x: 0.,
                y: line.baseline,
                text: line.text.clone(),
                color: color.clone(),
                size: n.props.font_size,
                font: n.props.font_family.clone(),
                max_width: n.rect.width,
                weight: n.props.font_weight,
            });
        }
    }
    pub(super) fn paint_input_selection(
        &self,
        id: u32,
        out: &mut Vec<crate::render::Draw>,
    ) -> String {
        use crate::render::Draw;
        let n = &self.nodes[&id];
        let p = &n.props;
        let kind = n.kind;
        let state = n.button.state(n.enabled);
        let theme = n.theme;
        let brush = |part: &str| color(kind, state, part, theme);
        if kind == NodeKind::RadioButton {
            out.push(Draw::VectorLayer {
                bounds: Rect::new(0., 6., 20., 20.),
            });
            let checked = p.is_checked == Some(true);
            let outer = if checked {
                "CheckOuterEllipse"
            } else {
                "OuterEllipse"
            };
            out.push(Draw::Fill {
                rect: Rect::new(0.5, 6.5, 19., 19.),
                radius: 9.5,
                color: brush(&format!("{outer}.Fill")),
            });
            out.push(Draw::Stroke {
                rect: Rect::new(0.5, 6.5, 19., 19.),
                radius: 9.5,
                width: 1.,
                color: brush(&format!("{outer}.Stroke")),
            });
            if checked || state == ControlState::Pressed {
                let d = if checked {
                    n.selection_visual.width.value(self.time)
                } else {
                    n.selection_visual.pressed_width.value(self.time)
                };
                let rect = Rect::new(10. - d / 2., 16. - d / 2., d, d);
                out.push(Draw::Fill {
                    rect: if checked {
                        Rect::new(rect.x + 0.5, rect.y + 0.5, d - 1., d - 1.)
                    } else {
                        rect
                    },
                    radius: if checked { (d - 1.) / 2. } else { d / 2. },
                    color: brush("CheckGlyph.Fill"),
                });
                if checked {
                    Self::brush_command(
                        out,
                        Rect::new(rect.x + 0.5, rect.y + 0.5, d - 1., d - 1.),
                        (d - 1.) / 2.,
                        1.,
                        Resources::current()
                            .resolve(theme, "RadioButtonCheckGlyphStrokeChecked")
                            .unwrap(),
                    );
                }
            }
            out.push(Draw::EndLayer);
            brush("ContentPresenter.Foreground")
        } else {
            self.paint_input_header(id, out);
            let top = self.input_header_height(id) + 10.;
            out.push(Draw::VectorLayer {
                bounds: Rect::new(0., top, 40., 20.),
            });
            let blend = n.selection_visual.blend.value(self.time);
            // Independent off/on layers preserve the source opacity cross-fade.
            for (part, opacity) in [("OuterBorder", 1. - blend), ("SwitchKnobBounds", blend)] {
                if opacity <= 0. {
                    continue;
                }
                out.push(Draw::Layer { opacity });
                let stroked = part == "OuterBorder" || theme == Theme::HighContrast;
                out.push(Draw::Fill {
                    rect: if stroked {
                        Rect::new(0.5, top + 0.5, 39., 19.)
                    } else {
                        Rect::new(0., top, 40., 20.)
                    },
                    radius: if stroked { 9.5 } else { 10. },
                    color: if part == "OuterBorder" {
                        n.selection_visual.off_fill.value(self.time)
                    } else {
                        brush("SwitchKnobBounds.Fill")
                    },
                });
                if part == "OuterBorder" {
                    out.push(Draw::Stroke {
                        rect: Rect::new(0.5, top + 0.5, 39., 19.),
                        radius: 9.5,
                        width: 1.,
                        color: n.selection_visual.off_stroke.value(self.time),
                    });
                }
                if part == "SwitchKnobBounds" && theme == Theme::HighContrast {
                    out.push(Draw::Stroke {
                        rect: Rect::new(0.5, top + 0.5, 39., 19.),
                        radius: 9.5,
                        width: 1.,
                        color: brush("SwitchKnobBounds.Stroke"),
                    });
                }
                out.push(Draw::EndLayer);
            }
            let position = n
                .selection_visual
                .drag_offset
                .unwrap_or_else(|| n.selection_visual.position.value(self.time));
            let w = n.selection_visual.width.value(self.time);
            let h = n.selection_visual.height.value(self.time);
            for (part, opacity) in [
                ("SwitchKnobOff.Fill", 1. - blend),
                ("SwitchKnobOn.Background", blend),
            ] {
                if opacity <= 0. {
                    continue;
                }
                out.push(Draw::Layer { opacity });
                // Pressed stretch anchors at the source's 3-DIP inner margin.
                let x = if state == ControlState::Pressed {
                    if p.is_on {
                        20. - 3. - w
                    } else {
                        3.
                    }
                } else {
                    9.5 - w / 2.
                };
                out.push(Draw::Fill {
                    rect: Rect::new(position + x, top + (20. - h) / 2., w, h),
                    radius: 7.,
                    color: brush(part),
                });
                out.push(Draw::EndLayer);
            }
            out.push(Draw::EndLayer);
            let foreground = if let Some(b) = &p.foreground {
                Self::color(b, theme)
            } else {
                Resources::current()
                    .resolve(
                        theme,
                        if n.enabled {
                            "TextFillColorPrimaryBrush"
                        } else {
                            "TextFillColorDisabledBrush"
                        },
                    )
                    .unwrap()
                    .solid_color()
            };
            for line in &n.text.lines {
                out.push(Draw::Text {
                    style: p.font_style,
                    x: 52.,
                    y: top + line.baseline + (20. - n.text.height).max(0.) / 2.,
                    text: line.text.clone(),
                    color: foreground.clone(),
                    size: p.font_size,
                    font: p.font_family.clone(),
                    max_width: (n.rect.width - 52.).max(0.),
                    weight: p.font_weight,
                });
            }
            foreground
        }
    }
}
impl SelectionVisual {
    pub fn cancel_drag(&mut self) {
        self.drag = None;
        if let Some(offset) = self.drag_offset.take() {
            self.position.snap(offset);
        }
    }
}
impl Scene {
    pub(super) fn update_switch_drag(&mut self, x: f64, y: f64) {
        let Some((_, id)) = self.captured else {
            return;
        };
        let n = self.nodes.get_mut(&id).unwrap();
        if n.kind != NodeKind::ToggleSwitch {
            return;
        }
        if let Some((start, base, _)) = n.selection_visual.drag {
            let current = n.world.inverse().map(|m| m.point(x, y).0).unwrap_or(start);
            if n.selection_visual.drag_offset.is_some() || (current - start).abs() > 3. {
                n.selection_visual.drag_offset = Some((base + current - start).clamp(0., 20.));
            }
        }
    }
}

pub fn group_spacing() -> [f64; 2] {
    static V: OnceLock<[f64; 2]> = OnceLock::new();
    *V.get_or_init(|| {
        let m: Value =
            serde_json::from_str(include_str!("../../references/radio-group-metrics.json"))
                .unwrap();
        [
            m["columns"][1]["x"].as_f64().unwrap()
                - m["columns"][0]["width"].as_f64().unwrap()
                - m["columns"][0]["x"].as_f64().unwrap(),
            m["vertical"]["items"][1]["bounds"]["y"].as_f64().unwrap()
                - m["vertical"]["items"][0]["bounds"]["y"].as_f64().unwrap()
                - m["vertical"]["items"][0]["bounds"]["height"]
                    .as_f64()
                    .unwrap(),
        ]
    })
}
impl Scene {
    pub(super) fn input_header_height(&self, id: u32) -> f64 {
        let n = &self.nodes[&id];
        if n.props.header.is_empty() {
            0.
        } else {
            n.header_text.height.ceil()
                + if n.kind == NodeKind::RadioButtons || super::text_edit::is_editor(n.kind) {
                    8.
                } else {
                    6.
                }
        }
    }
}
#[derive(Default)]
pub struct ColorTrack {
    from: [f64; 4],
    to: [f64; 4],
    start: f64,
    duration: f64,
    initialized: bool,
}
impl ColorTrack {
    fn sample(&self, now: f64) -> [f64; 4] {
        let t = if self.duration == 0. {
            1.
        } else {
            ((now - self.start) / self.duration).clamp(0., 1.)
        };
        std::array::from_fn(|i| self.from[i] + (self.to[i] - self.from[i]) * t)
    }
    fn update(&mut self, color: &str, now: f64, reduced: bool) {
        self.update_duration(color, now, reduced, duration("ControlFasterAnimationDuration"));
    }
    pub(super) fn update_duration(&mut self, color: &str, now: f64, reduced: bool, duration: f64) {
        let next = crate::material::rgba(color);
        if reduced || !self.initialized {
            self.from = next;
            self.to = next;
            self.duration = 0.;
        } else if next != self.to {
            self.from = self.sample(now);
            self.to = next;
            self.start = now;
            self.duration = duration;
        }
        self.initialized = true;
    }
    pub(super) fn value(&self, now: f64) -> String {
        crate::material::css(self.sample(now))
    }
    pub(super) fn active(&self, now: f64) -> bool {
        self.duration > 0. && now < self.start + self.duration && self.from != self.to
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn reposition_reversals_preserve_presentation_and_native_duration() {
        let mut v = SelectionVisual::default();
        v.sync(
            NodeKind::ToggleSwitch,
            ControlState::Normal,
            false,
            0.,
            false,
        );
        v.sync(
            NodeKind::ToggleSwitch,
            ControlState::Normal,
            true,
            10.,
            false,
        );
        assert_eq!(v.position.duration, 367.);
        for (time, on) in [(40., false), (55., true), (63., false), (80., true)] {
            let before = v.position.value(time);
            let blend = v.blend.value(time);
            v.sync(
                NodeKind::ToggleSwitch,
                ControlState::PointerOver,
                on,
                time,
                false,
            );
            assert!((v.position.value(time) - before).abs() < 1e-9);
            assert!((v.blend.value(time) - blend).abs() < 1e-9);
        }
        assert_eq!(v.position.value(447.), 20.);
        v.sync(
            NodeKind::ToggleSwitch,
            ControlState::Normal,
            false,
            449.,
            true,
        );
        assert_eq!(v.position.value(449.), 0.);
        assert!(!v.active(449.));
        let mut radio = SelectionVisual::default();
        radio.sync(
            NodeKind::RadioButton,
            ControlState::Normal,
            false,
            0.,
            false,
        );
        radio.sync(
            NodeKind::RadioButton,
            ControlState::Normal,
            true,
            10.,
            false,
        );
        assert!(!radio.active(10.)); // Checked opacity is immediate in the radio template.
    }
}
