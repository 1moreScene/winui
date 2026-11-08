//! Source-owned RepeatButton timer and Viewbox child-space transform.
use super::*;
use crate::button::ButtonStyle;
use serde_json::Value;
use std::sync::OnceLock;
pub(super) fn contract() -> &'static Value {
    static IR: OnceLock<Value> = OnceLock::new();
    IR.get_or_init(|| {
        serde_json::from_str(include_str!("../../references/basic-next-template.json")).unwrap()
    })
}
pub(super) fn repeat_style() -> &'static ButtonStyle {
    static STYLE: OnceLock<ButtonStyle> = OnceLock::new();
    STYLE.get_or_init(|| serde_json::from_value(contract()["repeatStyle"].clone()).unwrap())
}
#[derive(Default)]
pub(super) struct RepeatState {
    pub next: Option<f64>,
    mode: Option<ClickMode>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RepeatSnapshot {
    pub next_tick_at: Option<f64>,
}
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ViewboxSnapshot {
    pub content_size: [f64; 2],
    pub scale: [f64; 2],
    pub clip: Option<Rect>,
}
impl Default for ViewboxSnapshot {
    fn default() -> Self {
        Self {
            content_size: [0.; 2],
            scale: [1.; 2],
            clip: None,
        }
    }
}
impl ViewboxSnapshot {
    pub fn matrix(&self) -> Matrix {
        Matrix([self.scale[0], 0., 0., self.scale[1], 0., 0.])
    }
}
/// CViewbox::ComputeScaleFactor: unconstrained axes borrow the constrained
/// axis before StretchDirection is applied; both infinite axes stay unscaled.
pub fn viewbox_scale(
    available: [f64; 2],
    content: [f64; 2],
    stretch: ImageStretch,
    direction: StretchDirection,
) -> [f64; 2] {
    if stretch == ImageStretch::None || available.iter().all(|v| v.is_infinite()) {
        return [1.; 2];
    }
    let mut scale = std::array::from_fn(|i| {
        if content[i].abs() < 1e-6 {
            0.
        } else {
            available[i] / content[i]
        }
    });
    if available[0].is_infinite() {
        scale[0] = scale[1];
    } else if available[1].is_infinite() {
        scale[1] = scale[0];
    } else if matches!(stretch, ImageStretch::Uniform | ImageStretch::UniformToFill) {
        let s = if stretch == ImageStretch::Uniform {
            scale[0].min(scale[1])
        } else {
            scale[0].max(scale[1])
        };
        scale = [s; 2];
    }
    match direction {
        StretchDirection::UpOnly => scale.map(|s| s.max(1.)),
        StretchDirection::DownOnly => scale.map(|s| s.min(1.)),
        StretchDirection::Both => scale,
    }
}
impl Scene {
    pub(super) fn sync_repeats(&mut self) {
        let ids: Vec<_> = self
            .nodes
            .values()
            .filter(|n| n.kind == NodeKind::RepeatButton)
            .map(|n| n.id)
            .collect();
        for id in ids {
            let enabled = self.effective_enabled(id);
            let n = self.nodes.get_mut(&id).unwrap();
            let p = &n.props;
            let hover = p.click_mode == ClickMode::Hover;
            if hover {
                n.button.pressed = enabled && n.button.pointer_inside;
            }
            let repeat = enabled
                && n.button.pressed
                && if hover {
                    n.button.pointer_inside
                } else {
                    (n.button.captured.is_some() && n.button.pointer_inside)
                        || n.button.key.as_deref() == Some(" ")
                };
            if n.repeat.mode != Some(p.click_mode) {
                n.repeat.next = None;
                n.repeat.mode = Some(p.click_mode);
            }
            if !repeat {
                n.repeat.next = None;
            } else if n.repeat.next.is_none() {
                n.repeat.next = Some(self.time + p.delay as f64);
            }
        }
    }
    pub(super) fn repeat_tick(&mut self) {
        self.sync_repeats();
        let ready: Vec<_> = self
            .nodes
            .values()
            .filter(|n| {
                n.kind == NodeKind::RepeatButton && n.repeat.next.is_some_and(|t| t <= self.time)
            })
            .map(|n| n.id)
            .collect();
        for id in ready {
            let n = self.nodes.get_mut(&id).unwrap();
            // TimelineTimer does not replay missed ticks after a blocked UI thread.
            // Schedule from the current tick, including live Interval changes.
            n.repeat.next = Some(self.time + n.props.interval as f64);
            if n.button.pressed && (n.button.pointer_inside || n.button.key.as_deref() == Some(" "))
            {
                self.emit(id, EventKind::Click);
            } else {
                self.nodes.get_mut(&id).unwrap().repeat.next = None;
            }
        }
    }
}
