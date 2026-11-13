use super::*;
use crate::{animation::Motion, render::Draw};

#[derive(Default)]
pub struct ScrollTrack {
    from: f64,
    to: f64,
    start: f64,
    duration: f64,
}
fn profile() -> &'static [(f64, f64)] {
    static P: std::sync::OnceLock<Vec<(f64, f64)>> = std::sync::OnceLock::new();
    P.get_or_init(|| {
        let samples = text_edit::metrics()["scrollAnimation"].as_array().unwrap();
        let begin = samples[0]["time"].as_f64().unwrap();
        let mut p = vec![(0., 0.)];
        for s in samples {
            let value = s["offset"].as_f64().unwrap() / 400.;
            // The probe polls faster than Composition presents. Repeated
            // offsets are the same presented frame, not pauses in the easing
            // curve. Keep its first timestamp and interpolate distinct frames.
            if value <= p.last().unwrap().1 {
                continue;
            }
            p.push((s["time"].as_f64().unwrap() - begin, value));
            if value >= 1. - 1e-9 {
                break;
            }
        }
        p
    })
}
impl ScrollTrack {
    pub(crate) fn target(&self) -> f64 {
        self.to
    }
    pub fn value(&self, now: f64) -> f64 {
        if self.duration == 0. {
            return self.to;
        }
        let t = (now - self.start).max(0.);
        let p = profile();
        let mut a = p[0];
        for &b in p.iter().skip(1) {
            if t <= b.0 {
                let f = if b.0 > a.0 {
                    (t - a.0) / (b.0 - a.0)
                } else {
                    1.
                };
                return self.from + (self.to - self.from) * (a.1 + (b.1 - a.1) * f);
            }
            a = b;
        }
        self.to
    }
    pub(crate) fn set(&mut self, to: f64, now: f64, animated: bool) {
        let current = self.value(now);
        self.from = current;
        self.to = to;
        self.start = now;
        self.duration = if animated {
            profile().last().unwrap().0
        } else {
            0.
        };
    }
    pub fn active(&self, now: f64) -> bool {
        (self.from - self.to).abs() > 1e-6 && now < self.start + self.duration
    }
}
/// Platform scroll surface measurements in scene DIP. No DOM or renderer dependency.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct HostScrollMetrics {
    pub viewport_width: f64,
    pub viewport_height: f64,
    pub extent_width: f64,
    pub extent_height: f64,
    pub horizontal_offset: f64,
    pub vertical_offset: f64,
    #[serde(default)]
    pub occlusions: Vec<Rect>,
}
impl HostScrollMetrics {
    fn validate(&self) -> Result<(), String> {
        if [
            self.viewport_width,
            self.viewport_height,
            self.extent_width,
            self.extent_height,
            self.horizontal_offset,
            self.vertical_offset,
        ]
        .into_iter()
        .any(|v| !v.is_finite() || !(0. ..=10_000_000.).contains(&v))
        {
            return Err("invalid host scroll metrics".into());
        }
        if self.occlusions.len() > 128
            || self.occlusions.iter().any(|r| {
                [r.x, r.y, r.width, r.height]
                    .into_iter()
                    .any(|v| !v.is_finite() || v.abs() > 10_000_000.)
                    || r.width < 0.
                    || r.height < 0.
            })
        {
            return Err("invalid host occlusions".into());
        }
        Ok(())
    }
}
#[derive(Default)]
pub struct ScrollState {
    pub host: Option<HostScrollMetrics>,
    pub extent: [f64; 2],
    pub viewport: [f64; 2],
    pub x: ScrollTrack,
    pub y: ScrollTrack,
    pub zoom: ScrollTrack,
    pub indicator: Motion,
    pub expansion: Motion,
    pub hover: bool,
    pub bar_hover: bool,
    pub last_activity: f64,
    pub drag: Option<(bool, f64, f64)>,
    pub repeat: Option<(bool, f64, f64)>,
    pub pan: Option<(i32, f64, f64, f64, f64, f64)>,
    pub pinch: Option<(f64, f64)>,
    pub touches: BTreeMap<i32, (f64, f64)>,
    pub(super) touch_tap: Option<(i32, u32, f64, f64)>,
    pub initialized: bool,
    pub was_active: bool,
}
/// A scrollbar gesture requests an offset; its owner applies it to its content.
pub(crate) struct ScrollAction {
    pub vertical: bool,
    pub offset: f64,
    pub animated: bool,
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScrollSnapshot {
    pub hosted: bool,
    /// Wheel ownership depends on scrollable extent, never on the current offset.
    pub horizontal_wheel_contained: bool,
    pub vertical_wheel_contained: bool,
    pub visible_regions: Vec<Rect>,
    pub horizontal_offset: f64,
    pub vertical_offset: f64,
    pub zoom_factor: f64,
    pub extent_width: f64,
    pub extent_height: f64,
    pub viewport_width: f64,
    pub viewport_height: f64,
    pub scrollable_width: f64,
    pub scrollable_height: f64,
    pub vertical_thumb: Option<Rect>,
    pub horizontal_thumb: Option<Rect>,
    pub vertical_bar: Option<Rect>,
    pub horizontal_bar: Option<Rect>,
    pub is_intermediate: bool,
}
fn scalar(key: &str) -> f64 {
    text_edit::contract()["scalars"][key]
        .as_str()
        .unwrap()
        .parse()
        .unwrap()
}
pub fn milliseconds(key: &str) -> f64 {
    let s = text_edit::contract()["scalars"][key].as_str().unwrap();
    let values: Vec<f64> = s.split(':').map(|v| v.parse::<f64>().unwrap()).collect();
    (values[0] * 3600. + values[1] * 60. + values[2]) * 1000.
}
impl ScrollState {
    pub(crate) fn pointer_down(
        &mut self,
        p: &NodeProperties,
        x: f64,
        y: f64,
        time: f64,
        bounds: [f64; 2],
    ) -> (bool, Option<ScrollAction>) {
        for vertical in [true, false] {
            if let Some(r) = self.thumb(p, vertical, time) {
                let over = if vertical {
                    x >= bounds[0] - 14. && x <= bounds[0] && y >= 0. && y <= bounds[1]
                } else {
                    y >= bounds[1] - 14. && y <= bounds[1] && x >= 0. && x <= bounds[0]
                };
                if !over {
                    continue;
                }
                let pos = if vertical { y } else { x };
                let offset = self.offsets(time)[usize::from(vertical)];
                let hit = if vertical {
                    Rect::new(r.x - 3., r.y, r.width + 6., r.height)
                } else {
                    Rect::new(r.x, r.y - 3., r.width, r.height + 6.)
                };
                if hit.contains(x, y) {
                    self.drag = Some((vertical, pos, offset));
                    return (true, None);
                }
                let small = pos < 13. || pos > 1. + self.bar_length(p, vertical, time) - 12.;
                let delta = if pos < if vertical { r.y } else { r.x } {
                    -1.
                } else {
                    1.
                } * if small {
                    16.
                } else {
                    self.viewport[usize::from(vertical)]
                };
                self.repeat = Some((vertical, delta, time + 250.));
                return (
                    true,
                    Some(ScrollAction {
                        vertical,
                        offset: offset + delta,
                        animated: true,
                    }),
                );
            }
        }
        (false, None)
    }
    pub(crate) fn pointer_move(
        &self,
        p: &NodeProperties,
        x: f64,
        y: f64,
        time: f64,
    ) -> Option<ScrollAction> {
        let (vertical, start, offset) = self.drag?;
        let r = self.thumb(p, vertical, time)?;
        let track =
            (self.bar_length(p, vertical, time) - 24. - if vertical { r.height } else { r.width })
                .max(1.);
        Some(ScrollAction {
            vertical,
            offset: offset
                + ((if vertical { y } else { x }) - start) * self.max(time)[usize::from(vertical)]
                    / track,
            animated: false,
        })
    }
    pub(crate) fn repeat_action(&mut self, time: f64) -> Option<ScrollAction> {
        let (vertical, delta, at) = self.repeat?;
        if at > time {
            return None;
        }
        self.repeat = Some((vertical, delta, time + 50.));
        Some(ScrollAction {
            vertical,
            offset: if vertical {
                self.y.target()
            } else {
                self.x.target()
            } + delta,
            animated: true,
        })
    }
    pub(crate) fn key_action(&self, key: &str, time: f64) -> Option<ScrollAction> {
        let offset = self.offsets(time)[1];
        let page = self.viewport[1];
        let offset = match key {
            "ArrowUp" => offset - 16.,
            "ArrowDown" => offset + 16.,
            "PageUp" => offset - page,
            "PageDown" | " " => offset + page,
            "Home" => 0.,
            "End" => self.max(time)[1],
            _ => return None,
        };
        Some(ScrollAction {
            vertical: true,
            offset,
            animated: true,
        })
    }
    pub fn zoom(&self, time: f64) -> f64 {
        if self.initialized {
            self.zoom.value(time)
        } else {
            1.
        }
    }
    pub fn max(&self, time: f64) -> [f64; 2] {
        let z = self.zoom(time);
        std::array::from_fn(|axis| {
            let extent = self.extent[axis] * z;
            let viewport = self.viewport[axis];
            // Measure/Arrange can reach the same physical boundary through
            // different sums at fractional DPI. Ignore arithmetic roundoff,
            // not a pixel (or any meaningful fraction of one) of real overflow.
            let roundoff = 16. * f64::EPSILON * extent.abs().max(viewport.abs()).max(1.);
            let delta = extent - viewport;
            if delta <= roundoff {
                0.
            } else {
                delta
            }
        })
    }
    pub fn offsets(&self, time: f64) -> [f64; 2] {
        let m = self.max(time);
        [
            self.x.value(time).clamp(0., m[0]),
            self.y.value(time).clamp(0., m[1]),
        ]
    }
    pub fn wheel_axes(&self, p: &NodeProperties, time: f64) -> [bool; 2] {
        let max = self.max(time);
        [
            max[0] > 0. && p.horizontal_scroll_mode != ScrollMode::Disabled
                && p.horizontal_scroll_bar_visibility != ScrollBarVisibility::Disabled,
            max[1] > 0. && p.vertical_scroll_mode != ScrollMode::Disabled
                && p.vertical_scroll_bar_visibility != ScrollBarVisibility::Disabled,
        ]
    }
    pub fn matrix(&self, time: f64) -> Matrix {
        let o = self.offsets(time);
        let z = self.zoom(time);
        Matrix([z, 0., 0., z, -o[0], -o[1]])
    }
    pub fn active(&self, time: f64) -> bool {
        self.x.active(time) || self.y.active(time) || self.zoom.active(time)
    }
    pub fn thumb(&self, p: &NodeProperties, vertical: bool, time: f64) -> Option<Rect> {
        let axis = usize::from(vertical);
        let visibility = if vertical {
            p.vertical_scroll_bar_visibility
        } else {
            p.horizontal_scroll_bar_visibility
        };
        if (if vertical { p.vertical_scroll_mode } else { p.horizontal_scroll_mode }) == ScrollMode::Disabled
            || visibility == ScrollBarVisibility::Hidden
            || visibility == ScrollBarVisibility::Disabled
            || self.viewport[axis] <= 0.
        {
            return None;
        }
        let max = self.max(time)[axis];
        if visibility == ScrollBarVisibility::Auto && max <= 0. {
            return None;
        }
        let size = scalar("ScrollBarSize");
        let expanded = self.expansion.value(time);
        let rail = (self.bar_length(p, vertical, time) - 2. * size).max(0.);
        let length = (rail * self.viewport[axis]
            / (self.extent[axis] * self.zoom(time)).max(self.viewport[axis]))
        .max(30.)
        .min(rail);
        let pos = 1.
            + size
            + if max > 0. {
                self.offsets(time)[axis] / max * (rail - length)
            } else {
                0.
            };
        let width = 2. + 4. * expanded;
        Some(if vertical {
            Rect::new(self.viewport[0] - 4. - width, pos, width, length)
        } else {
            Rect::new(pos, self.viewport[1] - 4. - width, length, width)
        })
    }
    pub(super) fn bar_hit_rect(&self, p: &NodeProperties, vertical: bool, time: f64) -> Option<Rect> {
        self.thumb(p, vertical, time)?;
        let width = scalar("ScrollBarSize") + 2.;
        Some(if vertical {
            Rect::new((self.viewport[0] - width).max(0.), 0., width.min(self.viewport[0]), self.viewport[1])
        } else {
            Rect::new(0., (self.viewport[1] - width).max(0.), self.viewport[0], width.min(self.viewport[1]))
        })
    }
    pub fn bar_length(&self, p: &NodeProperties, vertical: bool, time: f64) -> f64 {
        let other = if vertical {
            p.horizontal_scroll_bar_visibility
        } else {
            p.vertical_scroll_bar_visibility
        };
        let present = other == ScrollBarVisibility::Visible
            || (other == ScrollBarVisibility::Auto && self.max(time)[usize::from(!vertical)] > 0.);
        (self.viewport[usize::from(vertical)] - 2. - if present { 14. } else { 0. }).max(0.)
    }
    pub fn visible_regions(&self) -> Vec<Rect> {
        let mut regions = vec![Rect::new(0., 0., self.viewport[0], self.viewport[1])];
        if let Some(host) = &self.host {
            for cut in &host.occlusions {
                let mut next = vec![];
                for r in regions {
                    let l = r.x.max(cut.x);
                    let t = r.y.max(cut.y);
                    let right = (r.x + r.width).min(cut.x + cut.width);
                    let bottom = (r.y + r.height).min(cut.y + cut.height);
                    if right <= l || bottom <= t {
                        next.push(r);
                        continue;
                    }
                    for p in [
                        Rect::new(r.x, r.y, r.width, t - r.y),
                        Rect::new(r.x, bottom, r.width, r.y + r.height - bottom),
                        Rect::new(r.x, t, l - r.x, bottom - t),
                        Rect::new(right, t, r.x + r.width - right, bottom - t),
                    ] {
                        if p.width > 0. && p.height > 0. {
                            next.push(p);
                        }
                    }
                }
                regions = next;
                if regions.len() > 512 {
                    return vec![];
                }
            }
        }
        regions
    }
    pub fn snapshot(&self, p: &NodeProperties, time: f64) -> ScrollSnapshot {
        let o = self.offsets(time);
        let m = self.max(time);
        ScrollSnapshot {
            hosted: self.host.is_some(),
            horizontal_wheel_contained: self.wheel_axes(p, time)[0],
            vertical_wheel_contained: self.wheel_axes(p, time)[1],
            visible_regions: self.visible_regions(),
            horizontal_offset: o[0],
            vertical_offset: o[1],
            zoom_factor: self.zoom(time),
            extent_width: self.extent[0] * self.zoom(time),
            extent_height: self.extent[1] * self.zoom(time),
            viewport_width: self.viewport[0],
            viewport_height: self.viewport[1],
            scrollable_width: m[0],
            scrollable_height: m[1],
            vertical_thumb: self.thumb(p, true, time),
            horizontal_thumb: self.thumb(p, false, time),
            vertical_bar: self.bar_hit_rect(p, true, time),
            horizontal_bar: self.bar_hit_rect(p, false, time),
            is_intermediate: self.active(time) || self.drag.is_some() || !self.touches.is_empty(),
        }
    }
    /// Shared native ScrollBar paint recipe for Scene and NavigationView.
    pub(crate) fn paint(
        &self,
        p: &NodeProperties,
        bounds: [f64; 2],
        theme: Theme,
        reduced_transparency: bool,
        enabled: bool,
        time: f64,
        out: &mut Vec<Draw>,
    ) {
        let opacity = self.indicator.value(time);
        if opacity <= 0. {
            return;
        }
        out.push(Draw::Layer { opacity });
        for vertical in [true, false] {
            if let Some(r) = self.thumb(p, vertical, time) {
                let expanded = self.expansion.value(time);
                if expanded > 0. {
                    out.push(Draw::Layer { opacity: expanded });
                    let track_rect = if vertical {
                        Rect::new(bounds[0] - 13., 1., 12., self.bar_length(p, true, time))
                    } else {
                        Rect::new(1., bounds[1] - 13., self.bar_length(p, false, time), 12.)
                    };
                    let brush = text_edit::resource(theme, "ScrollBarTrackFill");
                    out.push(Draw::RoundedClip {
                        rect: track_rect,
                        radius: 6.,
                    });
                    if brush.kind == "acrylic" {
                        out.push(Draw::Acrylic {
                            rect: track_rect,
                            recipe: crate::material::AcrylicOptions {
                                tint_color: brush.tint.clone(),
                                tint_opacity: brush.tint_opacity,
                                luminosity_opacity: brush.luminosity_opacity,
                                fallback_color: brush.fallback.clone(),
                            },
                            colors: None,
                            weight: if reduced_transparency || theme == Theme::HighContrast {
                                0.
                            } else {
                                1.
                            },
                        });
                    } else {
                        Scene::brush_command(out, track_rect, 6., 0., brush);
                    }
                    out.push(Draw::Restore);
                    for increase in [false, true] {
                        let pos = if increase {
                            1. + self.bar_length(p, vertical, time) - 12.
                        } else {
                            1.
                        };
                        out.push(Draw::Text {
                            style: FontStyle::Normal,
                            x: if vertical { bounds[0] - 11. } else { pos + 2. },
                            y: if vertical { pos + 9. } else { bounds[1] - 3. },
                            text: match (vertical, increase) {
                                (true, false) => "\u{eddb}",
                                (true, true) => "\u{eddc}",
                                (false, false) => "\u{edd9}",
                                (false, true) => "\u{edda}",
                            }
                            .into(),
                            color: text_edit::resource(theme, "ScrollBarButtonArrowForeground")
                                .solid_color(),
                            size: 8.,
                            font: "Segoe Fluent Icons".into(),
                            max_width: 8.,
                            weight: 400,
                        });
                    }
                    out.push(Draw::EndLayer);
                }
                out.push(Draw::VectorLayer { bounds: r });
                out.push(Draw::Fill {
                    rect: r,
                    radius: r.width.min(r.height) / 2.,
                    color: text_edit::resource(
                        theme,
                        if !enabled {
                            "ScrollBarThumbFillDisabled"
                        } else if self.drag.is_some() {
                            "ScrollBarThumbFillPressed"
                        } else {
                            "ScrollBarPanningThumbBackground"
                        },
                    )
                    .solid_color(),
                });
                out.push(Draw::EndLayer);
            }
        }
        out.push(Draw::EndLayer);
    }
    pub fn activity(&mut self, now: f64, reduced: bool) {
        self.last_activity = now;
        if reduced {
            self.indicator.snap(1.);
        } else if self.indicator.to != 1. {
            self.indicator
                .retarget(1., now, milliseconds("ScrollBarOpacityChangeDuration"));
        }
    }
    pub fn tick(&mut self, now: f64, reduced: bool) {
        let target = if self.bar_hover { 1. } else { 0. };
        if self.expansion.to != target {
            if reduced {
                self.expansion.snap(target);
            } else {
                self.expansion.curve = [0., 0., 0., 1.];
                self.expansion.retarget(
                    target,
                    now,
                    if target == 1. {
                        milliseconds("ScrollBarExpandDuration")
                    } else {
                        milliseconds("ScrollBarContractDuration")
                    },
                );
                self.expansion.start += milliseconds(if target == 1. {
                    "ScrollBarExpandBeginTime"
                } else {
                    "ScrollBarContractBeginTime"
                });
            }
        }
        if !self.hover
            && self.drag.is_none()
            && self.pan.is_none()
            && now >= self.last_activity + milliseconds("ScrollBarContractDelay")
            && self.indicator.to != 0.
        {
            if reduced {
                self.indicator.snap(0.);
            } else {
                self.indicator.retarget(
                    0.,
                    self.last_activity + milliseconds("ScrollBarContractDelay"),
                    milliseconds("ScrollBarOpacityChangeDuration"),
                );
            }
        }
    }
}
impl Scene {
    /// Attach a platform-owned surface. Rust retains scrollbar state, hit testing,
    /// animation and rendering; the platform applies ViewChanged offsets to its content.
    /// Feeding host measurements never emits a write-back event.
    pub fn set_scroll_host(&mut self, id: u32, metrics: HostScrollMetrics) -> Result<(), String> {
        metrics.validate()?;
        let n = self.get(id)?;
        if !matches!(n.kind,NodeKind::ScrollViewer|NodeKind::ScrollView) || !n.children.is_empty() {
            return Err("host scroll requires an empty ScrollViewer".into());
        }
        let n = self.nodes.get_mut(&id).unwrap();
        let old = n.scroll.offsets(self.time);
        n.scroll.extent = [
            metrics.extent_width.max(metrics.viewport_width),
            metrics.extent_height.max(metrics.viewport_height),
        ];
        n.scroll.viewport = [metrics.viewport_width, metrics.viewport_height];
        n.scroll.zoom.set(1., self.time, false);
        n.props.zoom_factor = 1.;
        n.scroll.initialized = true;
        let max = n.scroll.max(self.time);
        let next = [
            metrics.horizontal_offset.min(max[0]),
            metrics.vertical_offset.min(max[1]),
        ];
        n.scroll.x.set(next[0], self.time, false);
        n.scroll.y.set(next[1], self.time, false);
        n.props.horizontal_offset = next[0];
        n.props.vertical_offset = next[1];
        if next != old {
            n.scroll.activity(self.time, self.reduced_motion);
        }
        n.scroll.host = Some(metrics);
        self.invalidate(id, true);
        Ok(())
    }
    pub(super) fn scroll_touch(
        &mut self,
        pointer: i32,
        x: f64,
        y: f64,
        phase: &str,
    ) -> Result<(), String> {
        if !x.is_finite() || !y.is_finite() {
            return Err("invalid touch position".into());
        }
        let owner = self
            .nodes
            .values()
            .find(|n| n.scroll.touches.contains_key(&pointer))
            .map(|n| n.id);
        let scope = self.background_scroll_root();
        let Some(id) = owner.or_else(|| {
            if phase == "down" {
                self.scroll_at(scope.unwrap_or(self.root), x, y)
            } else {
                None
            }
        }) else {
            return Ok(());
        };
        if scope.is_some_and(|root| !self.descendant_of(id, root)) {
            let scroll = &mut self.nodes.get_mut(&id).unwrap().scroll;
            scroll.touches.remove(&pointer);
            scroll.pan = None;
            scroll.pinch = None;
            return Ok(());
        }
        let n = &self.nodes[&id];
        let local = n.world.inverse().unwrap_or_default().point(x, y);
        let old = n.scroll.touches.get(&pointer).copied().unwrap_or(local);
        let offsets = n.scroll.offsets(self.time);
        let z = n.scroll.zoom(self.time);
        let zoom_allowed = n.props.zoom_mode == ZoomMode::Enabled;
        if !matches!(phase, "down" | "move" | "up" | "cancel") {
            return Err("unknown touch phase".into());
        }
        if phase == "up" || phase == "cancel" {
            let s = &mut self.nodes.get_mut(&id).unwrap().scroll;
            let tap = s.touch_tap.take().filter(|tap| tap.0 == pointer);
            s.touches.remove(&pointer);
            s.pinch = None;
            if s.touches.is_empty() {
                s.pan = None;
            }
            self.emit(id, EventKind::ViewChanged);
            if phase == "up" {
                if tap.filter(|(_,target,sx,sy)|
                    (x-sx).hypot(y-sy)<=10. && self.nodes.contains_key(target)
                    && self.effective_enabled(*target) && self.hit(x,y)==Some(*target)).is_some() {
                    self.input(Input::Down {pointer,x,y},self.time)?;
                    self.input(Input::Up {pointer,x,y},self.time)?;
                }
            }
            return Ok(());
        }
        let tap_target = if phase == "down" && self.nodes[&id].scroll.touches.is_empty() {
            self.hit(x,y).filter(|target| {
                let n=&self.nodes[target];
                let button=crate::selection::is_button(n.kind);
                if !button && (n.kind!=NodeKind::Grid || !n.props.is_tab_stop) {return false;}
                if self.table_cell_owns_touch(*target) {return false;}
                // CollectionView owns item taps. Focusable ItemsRepeater
                // templates and other panels keep their own Click semantics.
                let mut at=n.parent;
                while let Some(parent)=at {
                    if !button && self.nodes[&parent].kind==NodeKind::CollectionItem {return false;}
                    if parent==id {break;}
                    at=self.nodes[&parent].parent;
                }
                true
            })
        } else {None};
        let s = &mut self.nodes.get_mut(&id).unwrap().scroll;
        if phase=="down" {s.touch_tap=tap_target.map(|target|(pointer,target,x,y));}
        else if s.touch_tap.is_some_and(|(pid,_,sx,sy)|pid==pointer&&(x-sx).hypot(y-sy)>10.) {s.touch_tap=None;}
        s.touches.insert(pointer, local);
        s.pan = Some((pointer, local.0, local.1, offsets[0], offsets[1], self.time));
        if s.touches.len() == 2 && zoom_allowed {
            let pair: Vec<_> = s.touches.values().copied().collect();
            let distance = (pair[0].0 - pair[1].0).hypot(pair[0].1 - pair[1].1).max(1.);
            let previous = s.pinch.replace((distance, z));
            if phase == "move" {
                if let Some((before, _)) = previous {
                    let factor = distance / before;
                    let cx = (pair[0].0 + pair[1].0) / 2.;
                    let cy = (pair[0].1 + pair[1].1) / 2.;
                    self.scroll_change(
                        id,
                        Some((offsets[0] + cx) * factor - cx),
                        Some((offsets[1] + cy) * factor - cy),
                        Some(z * factor),
                        false,
                    )?;
                }
            }
        } else if phase == "move" && self.nodes[&id].scroll.touches.len() == 1 {
            self.scroll_change(
                id,
                Some(offsets[0] + old.0 - local.0),
                Some(offsets[1] + old.1 - local.1),
                None,
                false,
            )?;
        } else if phase == "down" {
            self.scroll_change(id, Some(offsets[0]), Some(offsets[1]), None, false)?;
        }
        Ok(())
    }
    pub(super) fn scroll_change(
        &mut self,
        id: u32,
        x: Option<f64>,
        y: Option<f64>,
        zoom: Option<f64>,
        animated: bool,
    ) -> Result<(), String> {
        let n = self.get(id)?;
        if !super::collections::is_scroll_owner(n.kind) {
            return Err("changeView requires ScrollViewer".into());
        }
        if n.scroll.host.is_some() && zoom.is_some_and(|v| v != 1.) {
            return Err(
                "host-owned content supplies its scale; ChangeView zoom is unavailable".into(),
            );
        }
        if x.into_iter().chain(y).chain(zoom).any(|v| !v.is_finite()) {
            return Err("nonfinite scroll/zoom request".into());
        }
        let n = self.nodes.get_mut(&id).unwrap();
        let z = zoom
            .unwrap_or(n.props.zoom_factor)
            .clamp(n.props.min_zoom_factor, n.props.max_zoom_factor);
        let max = [
            (n.scroll.extent[0] * z - n.scroll.viewport[0]).max(0.),
            (n.scroll.extent[1] * z - n.scroll.viewport[1]).max(0.),
        ];
        let nx = if n.props.horizontal_scroll_mode == ScrollMode::Disabled
            || n.props.horizontal_scroll_bar_visibility == ScrollBarVisibility::Disabled
        {
            0.
        } else {
            x.unwrap_or(n.props.horizontal_offset).clamp(0., max[0])
        };
        let ny = if n.props.vertical_scroll_mode == ScrollMode::Disabled
            || n.props.vertical_scroll_bar_visibility == ScrollBarVisibility::Disabled
        {
            0.
        } else {
            y.unwrap_or(n.props.vertical_offset).clamp(0., max[1])
        };
        let changed = (nx, ny, z)
            != (
                n.props.horizontal_offset,
                n.props.vertical_offset,
                n.props.zoom_factor,
            );
        n.props.horizontal_offset = nx;
        n.props.vertical_offset = ny;
        n.props.zoom_factor = z;
        let animated = animated && !self.reduced_motion;
        n.scroll.x.set(nx, self.time, animated);
        n.scroll.y.set(ny, self.time, animated);
        n.scroll.zoom.set(z, self.time, animated);
        n.scroll.initialized = true;
        n.scroll.activity(self.time, self.reduced_motion);
        n.scroll.was_active = animated && changed;
        self.invalidate(id, zoom.is_some());
        if changed {
            self.emit(id, EventKind::ViewChanged);
        }
        Ok(())
    }
    pub(super) fn scroll_at(&self, id: u32, x: f64, y: f64) -> Option<u32> {
        let n = &self.nodes[&id];
        if !n.visible || !n.enabled {
            return None;
        }
        let inside = n.world.inverse().is_some_and(|m| {
            let (x, y) = m.point(x, y);
            Rect::new(0., 0., n.rect.width, n.rect.height).contains(x, y)
        });
        if (n.props.clip || id == self.root || super::collections::is_scroll_owner(n.kind))
            && !inside
        {
            return None;
        }
        for c in n.children.iter().rev() {
            if let Some(id) = self.scroll_at(*c, x, y) {
                return Some(id);
            }
        }
        (inside && super::collections::is_scroll_owner(n.kind)).then_some(id)
    }
    pub fn wheel(&mut self, x: f64, y: f64, dx: f64, dy: f64, ctrl: bool) -> Result<bool, String> {
        if [x, y, dx, dy].iter().any(|v| !v.is_finite()) {
            return Err("nonfinite wheel input".into());
        }
        if !ctrl && self.menu_wheel(x,y,dy) { return Ok(true); }
        if self.view_wheel(x,y,dy,ctrl)?{return Ok(true);}
        let scope = self.background_scroll_root();
        if scope.is_some_and(|id| ctrl || !self.inside(id, x, y)) {
            return Ok(true);
        }
        if scope.is_none() && !ctrl && self.navigation_control_wheel(x, y, dx, dy)? {
            return Ok(true);
        }
        if scope.is_none() && self.composed_wheel(x, y, dy, ctrl) {
            return Ok(true);
        }
        if !ctrl {
            if let Some(id) = self.hit(x, y).filter(|id| {
                self.nodes[id].kind == NodeKind::RichEditBox
                    && scope.is_none_or(|root| self.descendant_of(*id, root))
            }) {
                let n = &self.nodes[&id];
                let [horizontal, vertical] = n.scroll.wheel_axes(&n.props, self.time);
                if (dx != 0. && horizontal) || (dy != 0. && vertical) {
                    self.rich_editor_scroll_to(id, n.editor.scroll_x + dx, n.editor.scroll_y + dy);
                    return Ok(true);
                }
            }
        }
        let mut at = self.scroll_at(scope.unwrap_or(self.root), x, y);
        while let Some(id) = at {
            if scope.is_some_and(|root| !self.descendant_of(id, root)) {
                break;
            }
            let n = &self.nodes[&id];
            if ctrl && n.props.zoom_mode == ZoomMode::Enabled {
                let z = (n.props.zoom_factor * (-dy / 500.).exp())
                    .clamp(n.props.min_zoom_factor, n.props.max_zoom_factor);
                self.scroll_change(id, None, None, Some(z), false)?;
                return Ok(true);
            }
            if !ctrl {
                let axes = n.scroll.wheel_axes(&n.props, self.time);
                // A vertical mouse wheel pans a horizontal-only ScrollViewer,
                // including Gallery's Hidden/Disabled horizontal card rows.
                // Keep this decision in Rust so Canvas and hosted DOM agree.
                let horizontal_delta = if dx == 0. && axes[0] && !axes[1] { dy } else { dx };
                if (horizontal_delta != 0. && axes[0]) || (dy != 0. && axes[1]) {
                    let old = [n.props.horizontal_offset, n.props.vertical_offset];
                    let max = n.scroll.max(self.time);
                    let x = if axes[0] { (old[0] + horizontal_delta).clamp(0., max[0]) } else { old[0] };
                    let y = if axes[1] { (old[1] + dy).clamp(0., max[1]) } else { old[1] };
                    if [x, y] != old {
                        let immediate = n.composed.role == "ItemsPresenter" && n.composed.owner
                            .is_some_and(|owner| self.nodes[&owner].kind == NodeKind::ComboBox)
                            && n.props.collection_items.len() > 100;
                        self.scroll_change(id, Some(x), Some(y), None, !immediate)?;
                    } else {
                        self.nodes.get_mut(&id).unwrap().scroll.activity(self.time, self.reduced_motion);
                        self.invalidate(id, false);
                    }
                    // ScrollViewer::OnPointerWheelChanged handles scrollable content
                    // even at its limits. Chaining flags govern manipulation, not
                    // whether an exhausted mouse wheel escapes to another owner.
                    return Ok(true);
                }
                if (dx != 0. && !n.props.is_horizontal_scroll_chaining_enabled)
                    || (dy != 0. && !n.props.is_vertical_scroll_chaining_enabled)
                {
                    return Ok(true);
                }
            }
            at = n.parent;
            while at.is_some_and(|p| !super::collections::is_scroll_owner(self.nodes[&p].kind)) {
                at = self.nodes[&at.unwrap()].parent;
            }
        }
        Ok(scope.is_some())
    }
    pub(super) fn scroll_hover(&mut self, x: f64, y: f64) {
        let route = self.pointer_route(x, y);
        for n in self
            .nodes
            .values_mut()
            .filter(|n| super::collections::is_scroll_owner(n.kind) || n.kind == NodeKind::RichEditBox)
        {
            let local = n.world.inverse().map(|m| m.point(x, y));
            let inside = route.contains(&n.id) && local.is_some_and(|(x, y)| {
                Rect::new(0., 0., n.rect.width, n.rect.height).contains(x, y)
            });
            n.scroll.hover = inside;
            n.scroll.bar_hover = inside && local.is_some_and(|(x, y)| {
                if n.kind == NodeKind::RichEditBox {
                    [true, false].into_iter().any(|vertical| {
                        n.scroll.bar_hit_rect(&n.props, vertical, self.time)
                            .is_some_and(|r| r.contains(x - n.editor.view.x, y - n.editor.view.y))
                    })
                } else {
                    x >= n.rect.width - 14. || y >= n.rect.height - 14.
                }
            });
            if inside {
                n.scroll.activity(self.time, self.reduced_motion);
            }
            n.scroll.tick(self.time, self.reduced_motion);
        }
    }
    pub(super) fn scroll_pointer_down(&mut self, id: u32, x: f64, y: f64) -> Result<bool, String> {
        let n = self.nodes.get_mut(&id).unwrap();
        let (x, y) = n.world.inverse().map(|m| m.point(x, y)).unwrap_or_default();
        if n.kind == NodeKind::RichEditBox {
            let x = x - n.editor.view.x;
            let y = y - n.editor.view.y;
            if ![true, false].into_iter().any(|vertical| {
                n.scroll.bar_hit_rect(&n.props, vertical, self.time).is_some_and(|r| r.contains(x, y))
            }) {
                return Ok(false);
            }
            let viewport = n.scroll.viewport;
            let (hit, action) = n.scroll.pointer_down(&n.props, x, y, self.time, viewport);
            if let Some(action) = action {
                self.apply_scroll_action(id, action)?;
            }
            return Ok(hit);
        }
        let (hit, action) =
            n.scroll
                .pointer_down(&n.props, x, y, self.time, [n.rect.width, n.rect.height]);
        if let Some(a) = action {
            self.scroll_change(
                id,
                (!a.vertical).then_some(a.offset),
                a.vertical.then_some(a.offset),
                None,
                a.animated,
            )?;
        }
        Ok(hit)
    }
    pub(super) fn scroll_pointer_move(&mut self, id: u32, x: f64, y: f64) -> Result<(), String> {
        let n = &self.nodes[&id];
        let (x, y) = n.world.inverse().map(|m| m.point(x, y)).unwrap_or_default();
        let (x, y) = if n.kind == NodeKind::RichEditBox {
            (x - n.editor.view.x, y - n.editor.view.y)
        } else { (x, y) };
        if let Some(a) = n.scroll.pointer_move(&n.props, x, y, self.time) {
            self.apply_scroll_action(id, a)?;
        }
        Ok(())
    }
    fn apply_scroll_action(&mut self, id: u32, action: ScrollAction) -> Result<(), String> {
        let x = (!action.vertical).then_some(action.offset);
        let y = action.vertical.then_some(action.offset);
        let n = &self.nodes[&id];
        if n.kind == NodeKind::RichEditBox {
            self.rich_editor_scroll_to(id, x.unwrap_or(n.editor.scroll_x), y.unwrap_or(n.editor.scroll_y));
            Ok(())
        } else {
            self.scroll_change(id, x, y, None, action.animated)
        }
    }
    pub(super) fn bring_into_view(&mut self, id: u32) {
        if super::overlays::is_overlay(self.nodes[&id].kind) {
            return;
        }
        let mut child = id;
        let mut at = self.nodes[&id].parent;
        while let Some(parent) = at {
            if super::overlays::is_overlay(self.nodes[&parent].kind) {
                break;
            }
            if super::collections::is_scroll_owner(self.nodes[&parent].kind) {
                let table_target=self.table_scroll_target(parent,id);
                let target=table_target.map(|(target,_,_)|target).unwrap_or(child);
                let (fixed_x,left)=table_target.map(|(_,fixed,left)|(fixed,left)).unwrap_or((false,0.));
                let n = &self.nodes[&parent];
                let rect =
                    n.world
                        .inverse()
                        .unwrap_or_default()
                        .bounds(self.nodes[&target].world.bounds(Rect::new(
                            0.,
                            0.,
                            self.nodes[&target].rect.width,
                            self.nodes[&target].rect.height,
                        )));
                let o = n.scroll.offsets(self.time);
                let nx = if fixed_x {o[0]
                } else if rect.x < left {
                    o[0] + rect.x-left
                } else if rect.x + rect.width > n.rect.width {
                    o[0] + rect.x + rect.width - n.rect.width
                } else {
                    o[0]
                };
                let ny = if rect.y < 0. {
                    o[1] + rect.y
                } else if rect.y + rect.height > n.rect.height {
                    o[1] + rect.y + rect.height - n.rect.height
                } else {
                    o[1]
                };
                let _ = self.scroll_change(parent, Some(nx.max(0.)), Some(ny.max(0.)), None, false);
                child = parent;
            }
            at = self.nodes[&parent].parent;
        }
    }
    pub(super) fn paint_scrollbars(&self, id: u32, out: &mut Vec<Draw>) {
        let n = &self.nodes[&id];
        if n.scroll
            .host
            .as_ref()
            .is_some_and(|h| !h.occlusions.is_empty())
        {
            for rect in n.scroll.visible_regions() {
                out.push(Draw::Clip { rect });
                self.paint_scrollbar_parts(id, out);
                out.push(Draw::Restore);
            }
        } else {
            self.paint_scrollbar_parts(id, out);
        }
    }
    fn paint_scrollbar_parts(&self, id: u32, out: &mut Vec<Draw>) {
        let n = &self.nodes[&id];
        n.scroll.paint(
            &n.props,
            [n.rect.width, n.rect.height],
            n.theme,
            self.reduced_transparency,
            n.enabled,
            self.time,
            out,
        );
    }
    pub(super) fn scroll_tick(&mut self) {
        let repeats: Vec<_> = self
            .nodes
            .values_mut()
            .filter_map(|n| n.scroll.repeat_action(self.time).map(|a| (n.id, a)))
            .collect();
        for (id, a) in repeats {
            let _ = self.apply_scroll_action(id, a);
        }
        let mut changed = Vec::new();
        for n in self
            .nodes
            .values_mut()
            .filter(|n| super::collections::is_scroll_owner(n.kind))
        {
            n.scroll.tick(self.time, self.reduced_motion);
            let active = n.scroll.active(self.time);
            if active || n.scroll.was_active {
                changed.push(n.id);
            }
            n.scroll.was_active = active;
        }
        for id in changed {
            self.emit(id, EventKind::ViewChanged);
        }
        for n in self.nodes.values_mut().filter(|n| n.kind == NodeKind::RichEditBox) {
            n.scroll.tick(self.time, self.reduced_motion);
        }
    }
}
