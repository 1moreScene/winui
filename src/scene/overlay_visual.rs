//! Shared presentation for floating controls. Parameters come from pinned XAML/C++ and UxTheme.
use super::*;
use crate::animation::Motion;

#[derive(Default)]
pub(super) struct OverlayVisual {
    pub profile: Option<NodeKind>,
    pub command_overflow: bool,
    pub closing_with_owner: bool,
    pub scale_bounds: [f64; 2],
    pub scale_center: [f64; 2],
    pub opacity: Motion,
    pub shadow: Motion,
    pub entrance: Motion,
    notify_opened: bool,
    notify_closed: bool,
    pending_start: Option<f64>,
    presented: bool,
}
fn config() -> &'static serde_json::Value {
    &overlays::contract()["presentation"]
}
fn track(name: &str, kind: i64) -> &'static serde_json::Value {
    config()["nativeTiming"]["records"][name]
        .as_array()
        .unwrap()
        .iter()
        .find(|v| v["kind"].as_i64() == Some(kind))
        .expect("required native floating animation track")
}
fn set_track(motion: &mut Motion, target: f64, record: &serde_json::Value, time: f64, delay: bool) {
    motion.curve = std::array::from_fn(|i| record["curve"][i].as_f64().unwrap());
    let current = motion.value(time);
    motion.from = current;
    motion.to = target;
    motion.start = time
        + if delay {
            record["delayMs"].as_f64().unwrap()
        } else {
            0.
        };
    motion.duration = record["durationMs"].as_f64().unwrap();
}
impl OverlayVisual {
    pub fn active(&self, time: f64) -> bool {
        self.pending_start.is_some()
            || self.opacity.active(time)
            || self.entrance.active(time)
            || (self.profile == Some(NodeKind::ComboBox) && self.shadow.active(time))
    }
    pub fn shown(&self, time: f64) -> bool {
        self.opacity.value(time) > 0.00001 || self.active(time)
    }
    pub fn transition(&mut self, kind: NodeKind, open: bool, time: f64, reduced: bool) {
        let kind = self.profile.unwrap_or(kind);
        self.notify_opened = open;
        self.notify_closed = !open;
        self.pending_start = None;
        if open {
            self.presented = false;
        }
        let resuming = self.opacity.value(time) > 0.00001;
        if reduced
            || matches!(
                kind,
                NodeKind::Popup | NodeKind::AutoSuggestBox | NodeKind::NumberBox
            )
        {
            self.opacity.snap(if open { 1. } else { 0. });
            self.entrance.snap(1.);
            self.shadow.snap(if open { 1. } else { 0. });
            return;
        }
        if open {
            if !resuming {
                self.opacity.snap(0.);
                self.entrance.snap(0.);
                self.pending_start = Some(time);
            }
            match kind {
                NodeKind::CommandBarFlyout => {
                    let m=&super::command_menus::contract()["motion"];
                    if self.command_overflow {
                        self.opacity.snap(1.);
                        self.entrance.curve=std::array::from_fn(|i|m["expandCurve"][i].as_f64().unwrap());
                        self.entrance.retarget(1.,time,m["expandMs"].as_f64().unwrap());
                    } else {
                        self.opacity.curve = [0., 0., 1., 1.];
                        self.opacity.retarget(1., time, m["opacityMs"].as_f64().unwrap());
                        self.entrance.snap(1.);
                    }
                }
                NodeKind::ComboBox => {
                    let m = &super::composed::motion()["comboBox"];
                    self.shadow.snap(0.);
                    self.shadow.curve =
                        std::array::from_fn(|i| m["shadowCurve"][i].as_f64().unwrap());
                    self.shadow.retarget(
                        1.,
                        time + m["shadowDelayMs"].as_f64().unwrap(),
                        m["shadowFadeMs"].as_f64().unwrap(),
                    );
                    self.opacity.snap(1.);
                    self.entrance.curve = [0., 0., 0., 1.];
                    self.entrance
                        .retarget(1., time, m["openMs"].as_f64().unwrap());
                }
                NodeKind::ContentDialog => {
                    let m = &super::composed::motion()["contentDialog"];
                    self.opacity.curve = [0., 0., 1., 1.];
                    self.opacity
                        .retarget(1., time, m["fadeMs"].as_f64().unwrap());
                    self.entrance.curve = std::array::from_fn(|i| m["curve"][i].as_f64().unwrap());
                    self.entrance
                        .retarget(1., time, m["openMs"].as_f64().unwrap());
                }
                NodeKind::TeachingTip => {
                    let m = &super::composed::motion()["teachingTip"];
                    self.opacity.snap(1.);
                    self.entrance.curve =
                        std::array::from_fn(|i| m["openCurve"][i].as_f64().unwrap());
                    if !resuming {
                        self.entrance.snap(0.);
                    }
                    self.entrance
                        .retarget(1., time, m["openMs"].as_f64().unwrap());
                }
                NodeKind::CommandBar=>{self.opacity.snap(1.);self.entrance.curve=[0.,0.,0.,1.];self.entrance.retarget(1.,time,super::command_controls::motion()["barOpenMs"].as_f64().unwrap());}
                NodeKind::Flyout => {
                    set_track(
                        &mut self.opacity,
                        1.,
                        track("flyoutOpen", 2),
                        time,
                        !resuming,
                    );
                    set_track(&mut self.entrance, 1., track("flyoutOpen", 0), time, false);
                }
                NodeKind::MenuFlyout => {
                    if resuming {
                        self.opacity.curve = [0., 0., 1., 1.];
                        self.opacity
                            .retarget(1., time, config()["menuCloseMs"].as_f64().unwrap());
                    } else {
                        self.opacity.snap(1.);
                    }
                    self.entrance.curve = [0., 0., 0., 1.];
                    self.entrance
                        .retarget(1., time, config()["menuOpenMs"].as_f64().unwrap());
                }
                _ => {
                    set_track(&mut self.opacity, 1., track("toolTipOpen", 2), time, false);
                    self.entrance.snap(1.);
                }
            }
        } else {
            if kind == NodeKind::CommandBarFlyout {
                if self.command_overflow && !self.closing_with_owner {
                    self.entrance.retarget(0.,time,super::command_menus::contract()["motion"]["collapseMs"].as_f64().unwrap());
                    self.opacity.snap(1.);return;
                }
                self.opacity.curve = [0., 0., 1., 1.];
                self.opacity.retarget(0., time, super::command_menus::contract()["motion"]["opacityMs"].as_f64().unwrap());
                self.entrance.snap(self.entrance.value(time));
                return;
            }
            if kind==NodeKind::CommandBar{self.entrance.curve=[0.,0.,0.,1.];self.entrance.retarget(0.,time,super::command_controls::motion()["barCloseMs"].as_f64().unwrap());self.opacity.snap(1.);return;}
            if kind == NodeKind::ComboBox {
                self.shadow.snap(0.);
                // CPopup::Close cancels unload transitions for the native
                // windowed ComboBox popup. The XAML SplitClose timeline does
                // not remain visible after that window is removed.
                self.entrance.snap(0.);
                self.opacity.snap(0.);
                return;
            }
            if kind == NodeKind::ContentDialog {
                let m = &super::composed::motion()["contentDialog"];
                self.entrance.curve = std::array::from_fn(|i| m["curve"][i].as_f64().unwrap());
                self.entrance
                    .retarget(0., time, m["closeMs"].as_f64().unwrap());
                self.opacity.curve = [0., 0., 1., 1.];
                self.opacity
                    .retarget(0., time, m["fadeMs"].as_f64().unwrap());
                return;
            }
            if kind == NodeKind::TeachingTip {
                let m = &super::composed::motion()["teachingTip"];
                self.entrance.curve = std::array::from_fn(|i| m["closeCurve"][i].as_f64().unwrap());
                self.entrance
                    .retarget(0., time, m["closeMs"].as_f64().unwrap());
                self.opacity.snap(1.);
                return;
            }
            self.entrance.snap(self.entrance.value(time));
            if kind == NodeKind::MenuFlyout {
                // SystemBackdrop menus use a windowed popup. Popup::Close
                // cancels the unloading transition when that window closes.
                self.opacity.snap(0.);
            } else {
                set_track(
                    &mut self.opacity,
                    0.,
                    track(
                        if kind == NodeKind::Flyout {
                            "flyoutClose"
                        } else {
                            "toolTipClose"
                        },
                        2,
                    ),
                    time,
                    false,
                );
            }
        }
    }
    pub fn settle(&mut self, open: bool) {
        self.pending_start = None;
        self.opacity.snap(if open { 1. } else { 0. });
        self.entrance.snap(1.);
        self.shadow.snap(if open { 1. } else { 0. });
    }
    /// Loading transitions begin with the first arranged/presentable frame,
    /// rather than consuming time while the host waits to create the surface.
    pub fn begin_frame(&mut self, time: f64) {
        self.presented = true;
        if let Some(queued) = self.pending_start.take() {
            let delay = (time - queued).max(0.);
            self.opacity.start += delay;
            self.entrance.start += delay;
            self.shadow.start += delay;
        }
    }
    pub fn terminal(&mut self, open: bool, time: f64) -> Option<EventKind> {
        if open && self.notify_opened && self.presented {
            self.notify_opened = false;
            Some(EventKind::Opened)
        } else if !open && self.notify_closed && !self.active(time) {
            self.notify_closed = false;
            if self.command_overflow || matches!(self.profile,Some(NodeKind::TeachingTip|NodeKind::CommandBar)) {
                self.opacity.snap(0.);
            }
            Some(EventKind::Closed)
        } else {
            None
        }
    }
    pub fn offset(
        &self,
        kind: NodeKind,
        side: OverlayPlacement,
        height: f64,
        time: f64,
    ) -> [f64; 2] {
        if matches!(
            self.profile,
            Some(
                NodeKind::TeachingTip
                    | NodeKind::ContentDialog
                    | NodeKind::ComboBox
                    | NodeKind::AutoSuggestBox
                    | NodeKind::NumberBox
            )
        ) {
            return [0., 0.];
        }
        let remaining = 1. - self.entrance.value(time);
        if self.profile==Some(NodeKind::CommandBar){return [0.,remaining*height*if side==OverlayPlacement::Top{1.}else{-1.}];}
        let distance = if kind == NodeKind::MenuFlyout {
            height * config()["menuClosedRatio"].as_f64().unwrap()
        } else if kind == NodeKind::Flyout {
            config()["entranceOffset"].as_f64().unwrap()
        } else {
            0.
        };
        if kind == NodeKind::MenuFlyout {
            // MenuFlyout::PreparePopupTheme: menus always reveal vertically;
            // only a Top placement uses AnimationDirection_Bottom.
            return [
                0.,
                remaining
                    * distance
                    * if side == OverlayPlacement::Top {
                        1.
                    } else {
                        -1.
                    },
            ];
        }
        match side {
            OverlayPlacement::Bottom => [0., -remaining * distance],
            OverlayPlacement::Left => [remaining * distance, 0.],
            OverlayPlacement::Right => [-remaining * distance, 0.],
            _ => [0., remaining * distance],
        }
    }
    pub fn shadow_opacity(&self, time: f64) -> f64 {
        if self.profile == Some(NodeKind::ComboBox) {
            self.shadow.value(time)
        } else {
            1.
        }
    }
    pub fn split_clip(&self, rect: Rect, time: f64) -> Option<Rect> {
        if self.command_overflow {
            return Some(Rect::new(0.,0.,rect.width,rect.height*self.entrance.value(time)));
        }
        if self.profile != Some(NodeKind::ComboBox) {
            return None;
        }
        let h = rect.height.max(1.);
        let offset = self.scale_center[1];
        let ratio = if self.entrance.to == 0. { 0.15 } else { 0.5 };
        let closed = if offset.abs() > h * (1. - ratio) / 2. {
            2. * offset.abs() / h + 2. * ratio - 1.
        } else {
            ratio
        };
        let opened = 1. + 2. * offset.abs() / h;
        let length = h * (closed + (opened - closed) * self.entrance.value(time));
        Some(Rect::new(
            0.,
            h / 2. + offset - length / 2.,
            rect.width,
            length,
        ))
    }
    pub fn matrix(&self, kind: NodeKind, side: OverlayPlacement, height: f64, time: f64) -> Matrix {
        if self.profile == Some(NodeKind::TeachingTip) {
            let t = self.entrance.value(time);
            let scale = self.scale_bounds.map(|v| {
                let min = if self.entrance.to == 0. {
                    20. / v.max(1.)
                } else {
                    0.01f64.min(20. / v.max(1.))
                };
                min + (1. - min) * t
            });
            let [cx, cy] = self.scale_center;
            return Matrix([
                scale[0],
                0.,
                0.,
                scale[1],
                cx * (1. - scale[0]),
                cy * (1. - scale[1]),
            ]);
        }
        let [x, y] = self.offset(kind, side, height, time);
        Matrix([1., 0., 0., 1., x, y])
    }
}
impl Scene {
    pub(super) fn finish_overlay_visuals(&mut self) {
        let mut events = vec![];
        for n in self
            .nodes
            .values_mut()
            .filter(|n| overlays::is_overlay(n.kind))
        {
            if self.reduced_motion || n.theme == Theme::HighContrast {
                n.overlay.visual.settle(n.overlay.open);
            }
            if let Some(event) = n.overlay.visual.terminal(n.overlay.open, self.time) {
                events.push((n.id, event));
            }
        }
        for (id, event) in events {
            self.emit(id, event);
        }
    }
}
/// DropShadowRecipe.h: the caster is hollow, with ambient and directional layers.
pub(super) fn shadow_commands(
    kind: NodeKind,
    theme: Theme,
    width: f64,
    height: f64,
    radius: f64,
) -> Vec<crate::render::Draw> {
    if kind == NodeKind::Popup || theme == Theme::HighContrast {
        return vec![];
    }
    let z = config()["shadow"][if kind == NodeKind::ToolTip {
        "toolTipTranslationZ"
    } else {
        "flyoutTranslationZ"
    }]
    .as_f64()
    .unwrap();
    shadow_at_depth(z, theme, width, height, radius)
}
pub(super) fn shadow_at_depth(
    z: f64,
    theme: Theme,
    width: f64,
    height: f64,
    radius: f64,
) -> Vec<crate::render::Draw> {
    if z <= 0. || theme == Theme::HighContrast {
        return vec![];
    }
    let elevation = (z / 2.).min(64.);
    let dark = theme == Theme::Dark;
    let (ambient_blur, ambient_opacity, directional_opacity) = if elevation <= 16. {
        (
            2.,
            0.,
            if dark {
                0.26
            } else {
                (elevation / 100. + 0.06).min(0.14)
            },
        )
    } else {
        (
            elevation / 3.,
            if dark { 0.37 } else { 0.15 },
            if dark { 0.37 } else { 0.19 },
        )
    };
    [
        (ambient_blur, 2., ambient_opacity),
        (elevation, elevation / 2., directional_opacity),
    ]
    .into_iter()
    .filter(|v| v.2 > 0.)
    .map(|(blur, offset, opacity)| {
        let pad = blur * 2. + 2.;
        crate::render::Draw::Shadow {
            rect: Rect::new(-pad, -pad, width + 2. * pad, height + 2. * pad + offset),
            caster: Rect::new(0., 0., width, height),
            radius,
            blur,
            offset_y: offset,
            opacity: (opacity * 255f64).floor() / 255.,
        }
    })
    .collect()
}

/// A windowed native popup clips moving content and its shadow to its final island.
pub(super) fn window_bounds(kind: NodeKind, rect: Rect) -> Rect {
    let values = &config()["windowInsets"][kind.as_str()];
    if !values.is_array() {
        return rect;
    }
    let p: [f64; 4] = std::array::from_fn(|i| values[i].as_f64().unwrap());
    Rect::new(
        rect.x - p[0],
        rect.y - p[1],
        rect.width + p[0] + p[2],
        rect.height + p[1] + p[3],
    )
}
