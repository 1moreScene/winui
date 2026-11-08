//! NavigationView's template ScrollViewers use the same Rust ScrollState as Scene.
use crate::{
    enums::ScrollBarVisibility,
    model::{Rect, Theme},
    render::Draw,
    scene::{
        scroll::{milliseconds, ScrollAction, ScrollState},
        NodeProperties,
    },
};
use serde::Serialize;
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Visual {
    pub content: bool,
    pub rect: Rect,
    pub thumb: Rect,
    pub offset: f64,
    pub maximum: f64,
    pub opacity: f64,
    pub expansion: f64,
}
pub struct Scrollbar {
    pub state: ScrollState,
    props: NodeProperties,
    pub rect: Rect,
}
impl Default for Scrollbar {
    fn default() -> Self {
        Self {
            state: Default::default(),
            rect: Rect::default(),
            props: NodeProperties {
                horizontal_scroll_bar_visibility: ScrollBarVisibility::Disabled,
                vertical_scroll_bar_visibility: ScrollBarVisibility::Auto,
                ..Default::default()
            },
        }
    }
}
impl Scrollbar {
    pub fn sync(&mut self, rect: Rect, maximum: f64, offset: f64, time: f64, reduced: bool) {
        self.rect = rect;
        let s = &mut self.state;
        s.viewport = [rect.width.max(0.), rect.height.max(0.)];
        s.extent = [s.viewport[0], s.viewport[1] + maximum.max(0.)];
        s.zoom.set(1., time, false);
        s.initialized = true;
        if (s.offsets(time)[1] - offset).abs() > 1e-6 {
            s.y.set(offset, time, false);
            s.activity(time, reduced);
        }
        if maximum <= 0. || rect.height <= 0. {
            s.drag = None;
            s.repeat = None;
            s.indicator.snap(0.);
            s.hover = false;
            s.bar_hover = false;
        }
        s.tick(time, reduced);
    }
    fn apply(&mut self, action: ScrollAction, time: f64, reduced: bool) {
        self.state.y.set(
            action.offset.clamp(0., self.state.max(time)[1]),
            time,
            action.animated && !reduced,
        );
        self.state.activity(time, reduced);
    }
    pub fn tick(&mut self, time: f64, reduced: bool) -> f64 {
        if let Some(a) = self.state.repeat_action(time) {
            self.apply(a, time, reduced);
        }
        self.state.tick(time, reduced);
        self.state.offsets(time)[1]
    }
    pub fn active(&self, time: f64) -> bool {
        let s = &self.state;
        s.active(time) || s.indicator.active(time) || s.expansion.active(time) || s.repeat.is_some()
    }
    pub fn next_frame_at(&self, time: f64) -> Option<f64> {
        (!self.state.hover && self.state.indicator.to > 0.)
            .then_some(self.state.last_activity + milliseconds("ScrollBarContractDelay"))
            .filter(|at| *at > time)
    }
    pub fn captured(&self) -> bool {
        self.state.drag.is_some() || self.state.repeat.is_some()
    }
    pub fn release(&mut self) {
        self.state.drag = None;
        self.state.repeat = None;
    }
    pub fn hover(&mut self, x: f64, y: f64, time: f64, reduced: bool) {
        let s = &mut self.state;
        s.hover = self.rect.contains(x, y) && s.max(time)[1] > 0.;
        s.bar_hover = s.hover && x >= self.rect.x + self.rect.width - 14.;
        if s.hover {
            s.activity(time, reduced);
        }
        s.tick(time, reduced);
    }
    pub fn down(&mut self, x: f64, y: f64, time: f64, reduced: bool) -> bool {
        if !self.rect.contains(x, y) {
            return false;
        }
        let (hit, action) = self.state.pointer_down(
            &self.props,
            x - self.rect.x,
            y - self.rect.y,
            time,
            [self.rect.width, self.rect.height],
        );
        if let Some(a) = action {
            self.apply(a, time, reduced);
        }
        hit
    }
    pub fn drag(&mut self, x: f64, y: f64, time: f64, reduced: bool) {
        if let Some(a) =
            self.state
                .pointer_move(&self.props, x - self.rect.x, y - self.rect.y, time)
        {
            self.apply(a, time, reduced);
        }
    }
    pub fn key(&mut self, key: &str, time: f64, reduced: bool) {
        if let Some(a) = self.state.key_action(key, time) {
            self.apply(a, time, reduced);
        }
    }
    pub fn paint(&self, theme: Theme, transparency: bool, time: f64, out: &mut Vec<Draw>) {
        if self.rect.width <= 0. || self.rect.height <= 0. {
            return;
        }
        out.push(Draw::Clip { rect: self.rect });
        out.push(Draw::Save);
        out.push(Draw::Transform {
            matrix: [1., 0., 0., 1., self.rect.x, self.rect.y],
        });
        self.state.paint(
            &self.props,
            [self.rect.width, self.rect.height],
            theme,
            transparency,
            true,
            time,
            out,
        );
        out.push(Draw::Restore);
        out.push(Draw::Restore);
    }
    pub fn visual(&self, content: bool, time: f64) -> Option<Visual> {
        let mut thumb = self.state.thumb(&self.props, true, time)?;
        thumb.x += self.rect.x;
        thumb.y += self.rect.y;
        Some(Visual {
            content,
            rect: Rect::new(
                self.rect.x + self.rect.width - 14.,
                self.rect.y,
                14.,
                self.rect.height,
            ),
            thumb,
            offset: self.state.offsets(time)[1],
            maximum: self.state.max(time)[1],
            opacity: self.state.indicator.value(time),
            expansion: self.state.expansion.value(time),
        })
    }
}
