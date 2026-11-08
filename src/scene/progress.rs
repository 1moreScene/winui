//! ProgressBar.xaml/ProgressBar.cpp and the two pinned built-in ProgressRing visuals.
//! All geometry, keyframes, interruption and scheduling live on the Rust side.
use super::*;
use crate::{
    animation::{bezier, Motion},
    render::Draw,
    resources::Resources,
};
use serde_json::Value;
use std::sync::OnceLock;

pub(super) fn contract() -> &'static Value {
    static IR: OnceLock<Value> = OnceLock::new();
    IR.get_or_init(|| {
        serde_json::from_str(include_str!("../../references/progress-template.json")).unwrap()
    })
}
pub(super) fn scalar(key: &str) -> f64 {
    contract()["scalars"][key].as_f64().unwrap()
}
fn number(group: &str, key: &str) -> f64 {
    contract()[group][key].as_f64().unwrap()
}
pub(super) fn is_progress(kind: NodeKind) -> bool {
    matches!(kind, NodeKind::ProgressBar | NodeKind::ProgressRing)
}
fn fraction(p: &NodeProperties) -> f64 {
    if p.maximum - p.minimum > f64::EPSILON {
        ((p.value - p.minimum) / (p.maximum - p.minimum)).clamp(0., 1.)
    } else {
        0.
    }
}
fn state(p: &NodeProperties) -> u8 {
    if p.show_error {
        2
    } else if p.show_paused {
        1
    } else {
        0
    }
}
fn color(p: &NodeProperties, theme: Theme, kind: NodeKind) -> String {
    let key = if kind == NodeKind::ProgressRing {
        "ProgressRingForegroundThemeBrush"
    } else {
        match state(p) {
            2 => "ProgressBarErrorForegroundColor",
            1 => "ProgressBarPausedForegroundColor",
            _ => "ProgressBarForeground",
        }
    };
    if kind == NodeKind::ProgressRing || state(p) == 0 {
        if let Some(b) = &p.foreground {
            return Scene::color(b, theme);
        }
    }
    Resources::current().color(theme, key).into()
}
#[derive(Default)]
pub(super) struct ProgressVisual {
    initialized: bool,
    visible: bool,
    indeterminate: bool,
    state: u8,
    start: f64,
    transition: f64,
    transition_position: f64,
    resuming: bool,
    value: f64,
    value_motion: Motion,
    color_motion: Motion,
    from_color: [f64; 4],
    to_color: [f64; 4],
    running: bool,
    settling: bool,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressSnapshot {
    pub fraction: f64,
    pub phase: f64,
    pub trim_start: f64,
    pub trim_end: f64,
    pub rotation: f64,
    pub indicator_offset: f64,
    pub color: String,
    pub active: bool,
}
impl ProgressVisual {
    fn second_position(&self, now: f64, reduced: bool) -> f64 {
        let ir = &contract()["bar"];
        let curve = |key: &str| serde_json::from_value(ir[key].clone()).unwrap();
        if self.state != 0 {
            let elapsed = if reduced {
                number("bar", "settleMs")
            } else {
                (now - self.transition).max(0.)
            };
            let reset = number("bar", "settleResetMs");
            if elapsed < reset {
                return self.transition_position
                    + (number("bar", "secondStart") - self.transition_position)
                        * bezier(elapsed / reset, [1., 1., 0., 1.]);
            }
            return number("bar", "secondStart")
                * (1.
                    - bezier(
                        ((elapsed - reset) / (number("bar", "settleMs") - reset)).clamp(0., 1.),
                        curve("settleCurve"),
                    ));
        }
        if self.resuming && now < self.start {
            return self.transition_position
                + (number("bar", "firstEnd") - self.transition_position)
                    * bezier(
                        ((now - self.transition) / number("bar", "resumeFirstMs")).clamp(0., 1.),
                        [1., 0., 1., 1.],
                    );
        }
        let cycle = (now - self.start).max(0.) % number("bar", "durationMs");
        number("bar", "secondStart")
            + (number("bar", "secondEnd") - number("bar", "secondStart"))
                * bezier(
                    ((cycle - number("bar", "secondDelayMs"))
                        / (number("bar", "durationMs") - number("bar", "secondDelayMs")))
                    .clamp(0., 1.),
                    curve("curve"),
                )
    }
    fn sampled_color(&self, now: f64) -> String {
        let t = self.color_motion.value(now);
        let rgba = std::array::from_fn::<_, 4, _>(|i| {
            self.from_color[i] + (self.to_color[i] - self.from_color[i]) * t
        });
        format!(
            "#{:02x}{:02x}{:02x}{:02x}",
            (rgba[0] * 255.).round() as u8,
            (rgba[1] * 255.).round() as u8,
            (rgba[2] * 255.).round() as u8,
            (rgba[3] * 255.).round() as u8
        )
    }
    fn sync(
        &mut self,
        p: &NodeProperties,
        kind: NodeKind,
        theme: Theme,
        visible: bool,
        now: f64,
        reduced: bool,
    ) {
        let shown = visible && (kind != NodeKind::ProgressRing || p.is_active);
        let mode_changed = self.indeterminate != p.is_indeterminate;
        let state_changed = self.state != state(p);
        let restart = !self.initialized || mode_changed || (!self.visible && shown);
        if restart {
            self.start = now;
        }
        if kind == NodeKind::ProgressBar && state_changed {
            self.transition_position = self.second_position(now, reduced);
            self.transition = now;
            self.resuming =
                self.initialized && self.state != 0 && state(p) == 0 && p.is_indeterminate;
            if self.resuming {
                self.start = now + number("bar", "resumeTrackMs");
            }
        }
        let target = fraction(p);
        if !self.initialized || mode_changed || target != self.value {
            if kind == NodeKind::ProgressRing {
                // ProgressRing::UpdateLottieProgress plays increases over the source duration;
                // a decrease is set immediately. Retarget an increase from the current frame.
                let from = self.value_motion.value(now);
                self.value_motion.snap(target);
                if !reduced && shown && !p.is_indeterminate && target > from {
                    self.value_motion.from = from;
                    self.value_motion.start = now;
                    self.value_motion.duration =
                        (target - from) * number("ringDeterminate", "durationMs");
                    self.value_motion.curve = [0., 0., 1., 1.];
                }
            } else {
                let old = self.value;
                let current = self.value_motion.value(now);
                self.value_motion.snap(0.);
                if self.initialized && !mode_changed && !reduced && !p.is_indeterminate {
                    let reposition: Value = serde_json::from_str(include_str!(
                        "../../references/input-reposition.json"
                    ))
                    .unwrap();
                    self.value_motion.from = current + old - target;
                    self.value_motion.start = now;
                    self.value_motion.duration = reposition[0]["durationMs"].as_f64().unwrap();
                    self.value_motion.curve =
                        serde_json::from_value(reposition[0]["curve"].clone()).unwrap();
                }
            }
            self.value = target;
        }
        let target_color = crate::material::rgba(&color(p, theme, kind));
        if !self.initialized || target_color != self.to_color {
            self.from_color = if self.initialized {
                crate::material::rgba(&self.sampled_color(now))
            } else {
                target_color
            };
            self.to_color = target_color;
            self.color_motion.snap(1.);
            if self.initialized && kind == NodeKind::ProgressBar && !reduced {
                self.color_motion.from = 0.;
                self.color_motion.start = now;
                self.color_motion.duration = number("bar", "colorDurationMs");
                self.color_motion.curve = [0., 0., 1., 1.];
            }
        }
        self.indeterminate = p.is_indeterminate;
        self.state = state(p);
        self.visible = shown;
        self.initialized = true;
        self.settling = shown
            && !reduced
            && kind == NodeKind::ProgressBar
            && p.is_indeterminate
            && self.state != 0;
        self.running = shown
            && !reduced
            && (kind == NodeKind::ProgressRing || self.state == 0)
            && p.is_indeterminate;
        if reduced || !shown {
            self.value_motion.snap(if kind == NodeKind::ProgressRing {
                target
            } else {
                0.
            });
            self.color_motion.snap(1.);
            self.resuming = false;
        }
    }
    pub(super) fn active(&self, now: f64) -> bool {
        self.visible
            && (self.running
                || self.value_motion.active(now)
                || self.color_motion.active(now)
                || (self.settling && now < self.transition + number("bar", "settleMs")))
    }
    fn snapshot(&self, now: f64, kind: NodeKind, reduced: bool) -> ProgressSnapshot {
        let phase = if reduced {
            0.5
        } else {
            ((now - self.start).max(0.) / number("ringIndeterminate", "durationMs")).fract()
        };
        let (start, end, rotation) = if kind == NodeKind::ProgressRing && self.indeterminate {
            if phase < 0.5 {
                (
                    0.,
                    number("ringIndeterminate", "minimumTrim")
                        + (0.5 - number("ringIndeterminate", "minimumTrim")) * phase * 2.,
                    phase * number("ringIndeterminate", "rotation"),
                )
            } else {
                (
                    (phase - 0.5),
                    0.5,
                    phase * number("ringIndeterminate", "rotation"),
                )
            }
        } else {
            let value = self.value_motion.value(now);
            let mut end = 0.;
            let keys = contract()["ringDeterminate"]["trimKeys"]
                .as_array()
                .unwrap();
            if value >= number("ringDeterminate", "visibleAfter") {
                end = 1.;
                for pair in keys.windows(2) {
                    let a = [pair[0][0].as_f64().unwrap(), pair[0][1].as_f64().unwrap()];
                    let b = [pair[1][0].as_f64().unwrap(), pair[1][1].as_f64().unwrap()];
                    if value <= b[0] {
                        end = a[1] + (b[1] - a[1]) * ((value - a[0]) / (b[0] - a[0])).clamp(0., 1.);
                        break;
                    }
                }
            }
            (0., end, 0.)
        };
        ProgressSnapshot {
            fraction: self.value,
            phase,
            trim_start: start,
            trim_end: end,
            rotation,
            indicator_offset: if kind == NodeKind::ProgressBar {
                self.value_motion.value(now)
            } else {
                0.
            },
            color: self.sampled_color(now),
            active: self.visible,
        }
    }
}
impl Scene {
    pub(super) fn sync_progress(&mut self) {
        for n in self.nodes.values_mut().filter(|n| is_progress(n.kind)) {
            n.progress.sync(
                &n.props,
                n.kind,
                n.theme,
                n.visible,
                self.time,
                self.reduced_motion || n.theme == Theme::HighContrast,
            );
        }
    }
    pub(super) fn paint_progress(&self, id: u32, out: &mut Vec<Draw>) {
        let n = &self.nodes[&id];
        let p = &n.props;
        let reduced = self.reduced_motion || n.theme == Theme::HighContrast;
        let visual = n.progress.snapshot(self.time, n.kind, reduced);
        if !visual.active {
            return;
        }
        let r = Rect::new(0., 0., n.rect.width, n.rect.height);
        if n.kind == NodeKind::ProgressRing {
            out.push(Draw::VectorLayer { bounds: r });
            let mode = if p.is_indeterminate {
                "ringIndeterminate"
            } else {
                "ringDeterminate"
            };
            let base = number(mode, "size");
            let background = p
                .background
                .as_ref()
                .map(|b| Self::color(b, n.theme))
                .unwrap_or_else(|| {
                    Resources::current()
                        .color(n.theme, "ProgressRingBackgroundThemeBrush")
                        .into()
                });
            // The source uses Stretch.Fill. Apply the unequal X/Y scale to the
            // entire stroked circle, including caps, instead of just its vertices.
            out.push(Draw::Save);
            out.push(Draw::Transform {
                matrix: [r.width / base, 0., 0., r.height / base, 0., 0.],
            });
            let radius = number(mode, "radius");
            let width = number(mode, "stroke");
            let mut arc = |start: f64, end: f64, rotation: f64, color: String| {
                if end <= start {
                    return;
                }
                out.push(Draw::Arc {
                    center: [base / 2.; 2],
                    radius,
                    start: start * std::f64::consts::TAU + (rotation - 90.).to_radians(),
                    end: end * std::f64::consts::TAU + (rotation - 90.).to_radians(),
                    color,
                    width,
                });
            };
            arc(0., 1., 0., background);
            arc(
                visual.trim_start,
                visual.trim_end,
                visual.rotation,
                visual.color,
            );
            out.push(Draw::Restore);
            out.push(Draw::EndLayer);
        } else {
            let border = if n.theme == Theme::HighContrast {
                (self.dpr).round() / self.dpr
            } else {
                0.
            };
            let w = (r.width - p.padding[0] - p.padding[2] - 2. * border).max(0.);
            let h = (p.min_height * self.dpr).round() / self.dpr;
            let y = ((r.height - h) / 2. * self.dpr).round() / self.dpr;
            let x = p.padding[0] + border;
            out.push(Draw::Save);
            // Trim moving segments before stroking their circular ends. A
            // rectangular stencil alone cuts caps flat; a second rounded mask
            // multiplies fractional edge coverage (and GPU stencil is binary).
            out.push(Draw::Clip { rect: r });
            let track_h = (scalar("ProgressBarTrackHeight") * self.dpr).round() / self.dpr;
            let track_y = y + ((h - track_h) / 2. * self.dpr).round() / self.dpr;
            let track_x = x;
            let mut segments = vec![];
            if p.is_indeterminate {
                let t = (self.time - n.progress.start).max(0.);
                let cycle = t % number("bar", "durationMs");
                let ease = |t: f64, curve: &str| {
                    bezier(
                        t.clamp(0., 1.),
                        serde_json::from_value(contract()["bar"][curve].clone()).unwrap(),
                    )
                };
                if state(p) != 0 {
                    segments.push((
                        x + n.progress.second_position(self.time, reduced) * r.width,
                        w,
                    ));
                } else if reduced {
                    segments.push((x + w * 0.2, w * 0.6));
                } else if n.progress.resuming && self.time < n.progress.start {
                    segments.push((
                        x + n.progress.second_position(self.time, false) * r.width,
                        w * number("bar", "secondWidth"),
                    ));
                } else {
                    for (width, a, b, t) in [
                        (
                            "firstWidth",
                            "firstStart",
                            "firstEnd",
                            cycle / number("bar", "firstDurationMs"),
                        ),
                        (
                            "secondWidth",
                            "secondStart",
                            "secondEnd",
                            (cycle - number("bar", "secondDelayMs"))
                                / (number("bar", "durationMs") - number("bar", "secondDelayMs")),
                        ),
                    ] {
                        let pos = number("bar", a)
                            + (number("bar", b) - number("bar", a)) * ease(t, "curve");
                        segments.push((x + pos * r.width, w * number("bar", width)));
                    }
                }
            } else {
                segments.push((
                    x + visual.indicator_offset * w,
                    (visual.fraction * w * self.dpr).round() / self.dpr,
                ));
            }
            if !p.is_indeterminate {
                if let Some(BrushValue::Gradient(b)) = &p.background {
                    Self::brush_command(
                        out,
                        Rect::new(track_x, track_y, w, track_h),
                        scalar("ProgressBarTrackCornerRadius"),
                        0.,
                        b,
                    );
                } else {
                    out.push(Draw::Fill {
                        rect: Rect::new(track_x, track_y, w, track_h),
                        radius: scalar("ProgressBarTrackCornerRadius"),
                        color: p
                            .background
                            .as_ref()
                            .map(|b| Self::color(b, n.theme))
                            .unwrap_or_else(|| {
                                Resources::current()
                                    .color(n.theme, "ProgressBarBackground")
                                    .into()
                            }),
                    });
                }
            }
            for (left, width) in segments {
                let right = (left + width).min(x + w);
                let left = left.max(x);
                let width = (right - left).max(0.);
                if width > 0. {
                    out.push(Draw::Fill {
                        rect: Rect::new(left, y, width, h),
                        color: visual.color.clone(),
                        radius: p.corner_radius,
                    });
                }
            }
            if border > 0. {
                out.push(Draw::Stroke {
                    rect: Rect::new(
                        border / 2.,
                        border / 2.,
                        (r.width - border).max(0.),
                        (r.height - border).max(0.),
                    ),
                    color: Resources::current()
                        .color(n.theme, "ProgressBarBorderBrush")
                        .into(),
                    radius: p.corner_radius,
                    width: border,
                });
            }
            out.push(Draw::Restore);
            out.push(Draw::Restore);
        }
    }
}
pub(super) fn snapshot(n: &Node, now: f64, reduced: bool) -> Option<ProgressSnapshot> {
    is_progress(n.kind).then(|| {
        n.progress
            .snapshot(now, n.kind, reduced || n.theme == Theme::HighContrast)
    })
}
