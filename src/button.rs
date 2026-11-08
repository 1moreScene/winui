use crate::{enums::*, material, resources::Brush};
use serde::{Deserialize, Serialize};
#[derive(Clone, Debug, Default)]
pub struct ButtonState {
    pub pointer_inside: bool,
    pub captured: Option<i32>,
    pub key: Option<String>,
    pub pressed: bool,
    transition: ColorTransition,
    visual: ControlState,
}
#[derive(Clone, Debug, Default)]
struct ColorTransition {
    from: [f64; 4],
    to: [f64; 4],
    start: f64,
    duration: f64,
    initialized: bool,
}
impl ColorTransition {
    fn value(&self, time: f64) -> [f64; 4] {
        let t = if self.duration == 0. {
            1.
        } else {
            ((time - self.start) / self.duration).clamp(0., 1.)
        };
        std::array::from_fn(|i| self.from[i] + (self.to[i] - self.from[i]) * t)
    }
    fn retarget(&mut self, color: [f64; 4], time: f64, animate: bool, duration: f64) {
        let from = self.value(time);
        self.from = if self.initialized { from } else { color };
        self.to = color;
        self.start = time;
        self.duration = if animate && self.initialized {
            duration
        } else {
            0.
        };
        self.initialized = true;
    }
}
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct ButtonStyle {
    pub key: String,
    pub states: std::collections::HashMap<String, std::collections::HashMap<String, String>>,
    #[serde(rename = "backgroundSizing")]
    pub background_sizing: String,
    #[serde(rename = "backgroundTransitionMs")]
    pub duration: f64,
    pub part: String,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Defaults {
    pub padding: [f64; 4],
    pub font_size: f64,
    pub font_family: String,
    pub corner_radius: f64,
    pub border_thickness: f64,
}
pub fn defaults() -> &'static Defaults {
    static VALUE: std::sync::OnceLock<Defaults> = std::sync::OnceLock::new();
    VALUE.get_or_init(|| serde_json::from_value(template()["defaults"].clone()).unwrap())
}
fn template() -> &'static serde_json::Value {
    static VALUE: std::sync::OnceLock<serde_json::Value> = std::sync::OnceLock::new();
    VALUE.get_or_init(|| {
        serde_json::from_str(include_str!(concat!(
            env!("OUT_DIR"),
            "/button-template.json"
        )))
        .unwrap()
    })
}
pub fn style(variant: ButtonVariant) -> &'static ButtonStyle {
    static VALUE: std::sync::OnceLock<std::collections::HashMap<String, ButtonStyle>> =
        std::sync::OnceLock::new();
    let values =
        VALUE.get_or_init(|| serde_json::from_value(template()["styles"].clone()).unwrap());
    &values[variant.as_str()]
}
impl ButtonState {
    pub fn state(&self, enabled: bool) -> ControlState {
        if !enabled {
            ControlState::Disabled
        } else if self.pressed {
            ControlState::Pressed
        } else if self.pointer_inside {
            ControlState::PointerOver
        } else {
            ControlState::Normal
        }
    }
    pub fn cancel(&mut self) {
        self.captured = None;
        self.key = None;
        self.pressed = false;
    }
    pub fn color(
        &mut self,
        enabled: bool,
        target: &Brush,
        time: f64,
        reduced: bool,
        duration: f64,
    ) -> String {
        self.color_value(enabled, &target.solid_color(), time, reduced, duration)
    }
    pub fn color_value(
        &mut self,
        enabled: bool,
        target: &str,
        time: f64,
        reduced: bool,
        duration: f64,
    ) -> String {
        let state = self.state(enabled);
        let color = material::rgba(target);
        if !self.transition.initialized || state != self.visual || color != self.transition.to {
            self.transition.retarget(color, time, !reduced, duration);
            self.visual = state;
        }
        material::css(self.transition.value(time))
    }
    pub fn animating(&self, time: f64) -> bool {
        self.transition.initialized
            && time < self.transition.start + self.transition.duration
            && self.transition.from != self.transition.to
    }
}
