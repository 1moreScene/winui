//! Source contracts for the next five controls, sharing the scene layout/input.
use super::*;
use crate::{animation::Motion, button::ButtonStyle, render::Draw, resources::Resources};
use serde_json::Value;
use std::sync::OnceLock;
pub(super) fn contract() -> &'static Value {
    static IR: OnceLock<Value> = OnceLock::new();
    IR.get_or_init(|| {
        serde_json::from_str(include_str!("../../references/five-controls-template.json")).unwrap()
    })
}
pub(super) fn hyperlink_style() -> &'static ButtonStyle {
    static STYLE: OnceLock<ButtonStyle> = OnceLock::new();
    STYLE.get_or_init(|| serde_json::from_value(contract()["hyperlinkStyle"].clone()).unwrap())
}
pub(super) fn scalar(key: &str) -> f64 {
    let v = contract()["metrics"]
        .get(key)
        .unwrap_or(&contract()["metrics"]["Light"][key]);
    v.as_str().unwrap().parse().unwrap()
}
pub(super) fn native_scalar(key: &str) -> f64 {
    contract()["nativeDefaults"][key].as_f64().unwrap()
}
#[derive(Default)]
pub(super) struct ExpanderVisual {
    pub motion: Motion,
    initialized: bool,
    expanded: bool,
    pub content_height: f64,
    pub header_height: f64,
    pub size: [f64; 2],
    pub chevron: ChevronVisual,
    hide_at: f64,
}
#[derive(Default)]
pub(super) struct ChevronVisual {
    state: String,
    pending: Option<String>,
    start: f64,
    from: f64,
    to: f64,
}
impl ChevronVisual {
    pub fn active(&self, now: f64) -> bool {
        now < self.start
            + (self.to - self.from).abs() * contract()["chevron"]["durationMs"].as_f64().unwrap()
    }
    fn play(&mut self, next: String, now: f64) {
        let markers = &contract()["chevron"]["markers"];
        let key = format!("{}To{}", self.state, next);
        let end = markers[format!("{key}_End")]
            .as_f64()
            .or_else(|| {
                markers
                    .as_object()
                    .unwrap()
                    .iter()
                    .find(|(k, _)| k.ends_with(&format!("To{next}_End")))
                    .and_then(|(_, v)| v.as_f64())
            })
            .unwrap_or(0.);
        self.from = markers[format!("{key}_Start")].as_f64().unwrap_or(end);
        self.to = end;
        self.start = now;
        self.state = next;
    }
    fn sync(&mut self, next: String, now: f64, reduced: bool) {
        if self.state.is_empty() {
            self.play(next, now);
            self.from = self.to;
            return;
        }
        if reduced {
            self.play(next, now);
            self.from = self.to;
            self.pending = None;
            return;
        }
        if self.active(now) {
            self.pending = (next != self.state).then_some(next);
        } else if next != self.state {
            self.pending = None;
            self.play(next, now);
        } else if let Some(next) = self.pending.take() {
            if next != self.state {
                self.play(next, now);
            }
        }
    }
    fn progress(&self, now: f64) -> f64 {
        let duration =
            (self.to - self.from).abs() * contract()["chevron"]["durationMs"].as_f64().unwrap();
        self.from
            + (self.to - self.from)
                * if duration > 0. {
                    ((now - self.start) / duration).clamp(0., 1.)
                } else {
                    1.
                }
    }
    fn track(&self, key: &str, now: f64, axis: Option<usize>) -> f64 {
        let frames = contract()["chevron"][key].as_array().unwrap();
        let p = self.progress(now);
        let val = |v: &Value| {
            if let Some(i) = axis {
                v["value"][i].as_f64().unwrap()
            } else {
                v["value"].as_f64().unwrap()
            }
        };
        if p <= frames[0]["progress"].as_f64().unwrap() {
            return val(&frames[0]);
        }
        for pair in frames.windows(2) {
            let a = pair[0]["progress"].as_f64().unwrap();
            let b = pair[1]["progress"].as_f64().unwrap();
            if p <= b {
                let t = ((p - a) / (b - a)).clamp(0., 1.);
                let eased = match pair[1]["curve"].as_str().unwrap_or("cubic") {
                    "step" => {
                        if t >= 1. {
                            1.
                        } else {
                            0.
                        }
                    }
                    "start" => 1.,
                    _ => crate::animation::bezier(
                        t,
                        serde_json::from_value(pair[1]["curve"].clone()).unwrap(),
                    ),
                };
                return val(&pair[0]) + (val(&pair[1]) - val(&pair[0])) * eased;
            }
        }
        val(frames.last().unwrap())
    }
}
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExpanderSnapshot {
    pub header: Rect,
    pub clip: Rect,
    pub offset: f64,
    pub progress: f64,
}
impl ExpanderVisual {
    pub fn shown(&self, now: f64, p: &NodeProperties) -> bool {
        p.is_expanded || self.motion.active(now) || now < self.hide_at
    }
    pub fn active(&self, now: f64) -> bool {
        self.motion.active(now) || self.chevron.active(now) || now < self.hide_at
    }
    pub fn snapshot(&self, now: f64, p: &NodeProperties) -> ExpanderSnapshot {
        let shown = self.shown(now, p);
        let h = if shown {
            (self.size[1] - self.header_height).max(0.)
        } else {
            0.
        };
        let up = p.expand_direction == ExpandDirection::Up;
        ExpanderSnapshot {
            header: Rect::new(
                0.,
                if up { h } else { 0. },
                self.size[0],
                self.header_height,
            ),
            clip: Rect::new(
                0.,
                if up { 0. } else { self.header_height },
                self.size[0],
                h,
            ),
            offset: (1. - self.motion.value(now)) * h * if up { 1. } else { -1. },
            progress: self.motion.value(now),
        }
    }
}
impl Scene {
    pub(super) fn ordered_children(&self, id: u32) -> Vec<u32> {
        let n = &self.nodes[&id];
        let mut ids: Vec<_> = n
            .children
            .iter()
            .copied()
            .filter(|id| !super::overlays::is_overlay(self.nodes[id].kind) && !view_controls::is_command(self.nodes[id].kind) && !menu_item_controls::is_item(self.nodes[id].kind))
            .collect();
        if n.kind == NodeKind::SplitView {ids.sort_by_key(|c|view_controls::props(&self.nodes[c]).slot==ViewControlSlot::Pane);}
        if n.kind==NodeKind::SwipeControl {ids.sort_by_key(|id|view_controls::props(&self.nodes[id]).slot!=ViewControlSlot::SwipeAction);}
        if n.kind==NodeKind::Frame{ids.sort_by_key(|c|self.frame_visual(id,*c).map_or(0,|v|v.z_index));}
        if n.kind == NodeKind::Canvas {
            ids.sort_by_key(|c| self.nodes[c].props.z_index);
        }
        ids
    }
    pub(super) fn sync_expanders(&mut self) {
        for n in self
            .nodes
            .values_mut()
            .filter(|n| n.kind == NodeKind::Expander)
        {
            let p = &n.props;
            let v = &mut n.expander;
            let reduced = self.reduced_motion || n.theme == Theme::HighContrast || !n.visible;
            let state = match n.button.state(n.enabled) {
                ControlState::PointerOver => "PointerOver",
                ControlState::Pressed => "Pressed",
                _ => "Normal",
            };
            let on = if p.expand_direction == ExpandDirection::Down {
                p.is_expanded
            } else {
                !p.is_expanded
            };
            v.chevron.sync(
                format!("{state}{}", if on { "On" } else { "Off" }),
                self.time,
                reduced,
            );
            if !v.initialized {
                v.motion.snap(if p.is_expanded { 1. } else { 0. });
                v.initialized = true;
                v.expanded = p.is_expanded;
            } else if v.expanded != p.is_expanded {
                let name = match (p.expand_direction, p.is_expanded) {
                    (ExpandDirection::Down, true) => "ExpandDown",
                    (ExpandDirection::Up, true) => "ExpandUp",
                    (ExpandDirection::Down, false) => "CollapseUp",
                    (ExpandDirection::Up, false) => "CollapseDown",
                };
                let frame = &contract()["expanderTransitions"][name][0];
                let duration = frame["KeyTime"]
                    .as_str()
                    .unwrap()
                    .split(':')
                    .next_back()
                    .unwrap()
                    .parse::<f64>()
                    .unwrap()
                    * 1000.;
                let curve: Vec<f64> = frame["KeySpline"]
                    .as_str()
                    .unwrap()
                    .split(',')
                    .map(|x| x.trim().parse().unwrap())
                    .collect();
                v.motion
                    .retarget(if p.is_expanded { 1. } else { 0. }, self.time, duration);
                v.motion.curve = curve.try_into().unwrap();
                v.hide_at = if p.is_expanded {
                    0.
                } else {
                    self.time + contract()["expanderVisibility"][name].as_f64().unwrap()
                };
                v.expanded = p.is_expanded;
            }
            if reduced {
                v.motion.snap(if p.is_expanded { 1. } else { 0. });
                v.hide_at = 0.;
            }
            // Invalidate at the closing visibility boundary as well as while moving.
            if v.motion.active(self.time)
                || (!p.is_expanded && n.rect.height > v.header_height + 1e-6)
            {
                self.dirty = true;
            }
        }
    }
    pub(super) fn paint_five(&self, id: u32, out: &mut Vec<Draw>) {
        let n = &self.nodes[&id];
        let p = &n.props;
        let r = Rect::new(0., 0., n.rect.width, n.rect.height);
        let res = Resources::current();
        let c = |key: &str| res.color(n.theme, key).to_string();
        match n.kind {
            NodeKind::Border | NodeKind::LayoutPanel | NodeKind::RelativePanel if self.paint_gradient_border(id,out)=>{},
            NodeKind::Border | NodeKind::LayoutPanel | NodeKind::RelativePanel => out.push(Draw::Border {
                rect: r,
                thickness: p.border_thickness,
                radius: p.corner_radii.unwrap_or([p.corner_radius; 4]),
                color: p
                    .border_brush
                    .as_ref()
                    .map(|b| Self::color(b, n.theme))
                    .unwrap_or("#00000000".into()),
                background: p.background.as_ref().map(|b| n.effects.background(self.time).unwrap_or_else(||Self::color(b, n.theme))),
            }),
            NodeKind::InfoBadge => {
                // RootGrid's CornerRadius clips both its background and content.
                // Keeping the clip separate reproduces the native small-dot edge.
                out.push(Draw::RoundedClip {
                    rect: r,
                    radius: if p.badge_auto_radius {
                        r.height / 2.
                    } else {
                        p.corner_radius
                    },
                });
                let key = match p.badge_style {
                    InfoBadgeStyle::Default => "InfoBadgeBackground",
                    InfoBadgeStyle::Attention => "SystemFillColorAttentionBrush",
                    InfoBadgeStyle::Informational => "SystemFillColorSolidNeutralBrush",
                    InfoBadgeStyle::Success => "SystemFillColorSuccessBrush",
                    InfoBadgeStyle::Caution => "SystemFillColorCautionBrush",
                    InfoBadgeStyle::Critical => "SystemFillColorCriticalBrush",
                };
                out.push(Draw::Fill {
                    rect: r,
                    radius: if p.badge_auto_radius {
                        r.height / 2.
                    } else {
                        p.corner_radius
                    },
                    color: p
                        .background
                        .as_ref()
                        .map(|b| n.effects.background(self.time).unwrap_or_else(||Self::color(b, n.theme)))
                        .unwrap_or_else(|| c(key)),
                });
                let fg = p
                    .foreground
                    .as_ref()
                    .map(|b| Self::color(b, n.theme))
                    .unwrap_or_else(|| c("InfoBadgeForeground"));
                let margin = crate::icons::badge_margin(p);
                let glyph_size =
                    (r.height - p.padding[1] - p.padding[3] - margin[1] - margin[3]).max(1.);
                let pixel = |v: f64| (v * self.dpr).round() / self.dpr;
                for line in &n.text.lines {
                    out.push(Draw::Text {
                        style: p.font_style,
                        x: p.padding[0]
                            + margin[0]
                            + pixel(
                                (r.width
                                    - p.padding[0]
                                    - p.padding[2]
                                    - margin[0]
                                    - margin[2]
                                    - n.text.width)
                                    / 2.,
                            ),
                        y: p.padding[1]
                            + margin[1]
                            + pixel(
                                (r.height
                                    - p.padding[1]
                                    - p.padding[3]
                                    - margin[1]
                                    - margin[3]
                                    - if p.value >= 0. {
                                        n.text.height
                                    } else {
                                        glyph_size
                                    })
                                    / 2.,
                            )
                            + line.baseline,
                        text: line.text.clone(),
                        color: fg.clone(),
                        size: if p.value >= 0. {
                            p.font_size
                        } else {
                            glyph_size
                        },
                        font: if p.value >= 0. {
                            p.font_family.clone()
                        } else {
                            "Segoe Fluent Icons".into()
                        },
                        max_width: r.width,
                        weight: p.font_weight,
                    });
                }
                out.push(Draw::Restore);
            }
            NodeKind::Expander => {
                let v = n.expander.snapshot(self.time, p);
                let state = n.button.state(n.enabled);
                let suf = match state {
                    ControlState::Disabled => "Disabled",
                    ControlState::PointerOver => "PointerOver",
                    ControlState::Pressed => "Pressed",
                    _ => "",
                };
                let fgkey = match state {
                    ControlState::Disabled => "ExpanderHeaderDisabledForeground",
                    ControlState::PointerOver => "ExpanderHeaderForegroundPointerOver",
                    ControlState::Pressed => "ExpanderHeaderForegroundPressed",
                    _ => "ExpanderHeaderForeground",
                };
                out.push(Draw::Border {
                    rect: v.header,
                    thickness: [1.; 4],
                    radius: if v.clip.height <= 0. {
                        [p.corner_radius; 4]
                    } else if p.expand_direction == ExpandDirection::Down {
                        [p.corner_radius, p.corner_radius, 0., 0.]
                    } else {
                        [0., 0., p.corner_radius, p.corner_radius]
                    },
                    color: c("ExpanderHeaderBorderBrush"),
                    background: Some(c("ExpanderHeaderBackground")),
                });
                let text = &n.header_text;
                for line in &text.lines {
                    out.push(Draw::Text {
                        style: p.font_style,
                        x: 17.,
                        y: v.header.y + (v.header.height - text.height) / 2. + line.baseline,
                        text: line.text.clone(),
                        color: c(fgkey),
                        size: p.font_size,
                        font: p.font_family.clone(),
                        max_width: (r.width - 78.).max(0.),
                        weight: p.font_weight,
                    });
                }
                let chevron = Rect::new(
                    r.width - 41.,
                    v.header.y + (v.header.height - 32.) / 2.,
                    32.,
                    32.,
                );
                let bg = if suf == "PointerOver" {
                    "ExpanderChevronPointerOverBackground"
                } else if suf == "Pressed" {
                    "ExpanderChevronPressedBackground"
                } else {
                    "ExpanderChevronBackground"
                };
                out.push(Draw::Fill {
                    rect: chevron,
                    radius: 4.,
                    color: c(bg),
                });
                let a = n
                    .expander
                    .chevron
                    .track("rotation", self.time, None)
                    .to_radians();
                let (sin, cos) = a.sin_cos();
                let center = [
                    chevron.x + 10. + n.expander.chevron.track("offset", self.time, Some(0)) / 4.,
                    chevron.y + 10. + n.expander.chevron.track("offset", self.time, Some(1)) / 4.,
                ];
                let points = [
                    [-3.54299998, -1.79299998],
                    [0.0199999996, 1.70700002],
                    [3.48900008, -1.71500003],
                ]
                .map(|[x, y]| [center[0] + cos * x - sin * y, center[1] + sin * x + cos * y])
                .to_vec();
                out.push(Draw::Polyline {
                    points,
                    color: c(if !n.enabled {
                        "ExpanderHeaderDisabledForeground"
                    } else {
                        "ExpanderChevronForeground"
                    }),
                    width: 1.,
                });
                // Content lives under the header, clipped before its render translation.
                if v.clip.height > 0. {
                    out.push(Draw::Clip { rect: v.clip });
                    out.push(Draw::Save);
                    out.push(Draw::Transform {
                        matrix: [1., 0., 0., 1., 0., v.offset],
                    });
                    out.push(Draw::Border {
                        rect: v.clip,
                        thickness: if p.expand_direction == ExpandDirection::Down {
                            [1., 0., 1., 1.]
                        } else {
                            [1., 1., 1., 0.]
                        },
                        radius: if p.expand_direction == ExpandDirection::Down {
                            [0., 0., p.corner_radius, p.corner_radius]
                        } else {
                            [p.corner_radius, p.corner_radius, 0., 0.]
                        },
                        color: p
                            .border_brush
                            .as_ref()
                            .map(|b| Self::color(b, n.theme))
                            .unwrap_or_else(|| c("ExpanderContentBorderBrush")),
                        background: Some(
                            p.background
                                .as_ref()
                                .map(|b| n.effects.background(self.time).unwrap_or_else(||Self::color(b, n.theme)))
                                .unwrap_or_else(|| c("ExpanderContentBackground")),
                        ),
                    });
                    out.push(Draw::Restore);
                    out.push(Draw::Restore);
                }
            }
            _ => {}
        }
    }
    /// A resource can resolve to a gradient too. Execute that brush through the
    /// shared path renderer instead of flattening it through solid_color().
    pub(super) fn paint_gradient_border(&self,id:u32,out:&mut Vec<Draw>)->bool {
        use kurbo::Shape;
        let n=&self.nodes[&id];let p=&n.props;
        let gradient=|value:&BrushValue|match value {
            BrushValue::Gradient(brush)=>Some(brush.as_ref().clone()),
            BrushValue::Resource{resource}=>{let brush=Resources::current().resolve(n.theme,resource).unwrap();matches!(brush.kind.as_str(),"linearGradient"|"radialGradient").then(||brush.clone())},
            _=>None,
        };
        let background=p.background.as_ref().and_then(gradient);let stroke=p.border_brush.as_ref().and_then(gradient);
        if background.is_none()&&stroke.is_none(){return false;}
        let r=Rect::new(0.,0.,n.rect.width,n.rect.height);let corners=p.corner_radii.unwrap_or([p.corner_radius;4]);
        let shape=|r:Rect,c:[f64;4]|kurbo::RoundedRect::from_rect(kurbo::Rect::new(r.x,r.y,r.x+r.width,r.y+r.height),kurbo::RoundedRectRadii::new(c[0],c[1],c[2],c[3])).to_path(0.01);
        let outer=shape(r,corners);
        if let Some(brush)=background {out.push(Draw::PathBrush{rect:r,geometry:crate::icons::PathGeometry::from_bez(&outer,false),brush:Box::new(brush)});}else if let Some(background)=&p.background {out.push(Draw::Border{rect:r,thickness:[0.;4],radius:corners,color:"#00000000".into(),background:Some(n.effects.background(self.time).unwrap_or_else(||Self::color(background,n.theme)))});}
        if let Some(brush)=stroke {
            let [left,top,right,bottom]=if collections::is_view(n.kind){overlays::border_thickness(p.border_thickness,self.dpr)}else{p.border_thickness};
            if left+top+right+bottom>0. {let mut ring=outer;let inner=Rect::new(left.min(r.width),top.min(r.height),(r.width-left-right).max(0.),(r.height-top-bottom).max(0.));if inner.width>0.&&inner.height>0. {let c=[(corners[0]-left.max(top)).max(0.),(corners[1]-right.max(top)).max(0.),(corners[2]-right.max(bottom)).max(0.),(corners[3]-left.max(bottom)).max(0.)];ring.extend(shape(inner,c).elements().iter().copied());}out.push(Draw::PathBrush{rect:r,geometry:crate::icons::PathGeometry::from_bez(&ring,true),brush:Box::new(brush)});}
        }else if let Some(stroke)=&p.border_brush {out.push(Draw::Border{rect:r,thickness:p.border_thickness,radius:corners,color:Self::color(stroke,n.theme),background:None});}
        true
    }
}
