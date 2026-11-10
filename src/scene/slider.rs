//! Slider_Partial.cpp stepping and shared ToolTip-backed thumb feedback.
use super::*;
use crate::{animation::Motion, render::Draw};
pub(super) struct SliderState {
    pub scale: Motion,
    pub tooltip: Option<u32>,
    pub tooltip_dismissed: bool,
}
impl Default for SliderState {
    fn default() -> Self {
        let mut scale = Motion::default();
        scale.snap(0.86);
        Self {
            scale,
            tooltip: None,
            tooltip_dismissed: false,
        }
    }
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SliderSnapshot {
    pub track: Rect,
    pub thumb: Rect,
    pub fraction: f64,
    pub inner_scale: f64,
    pub tooltip: Option<u32>,
}
/// Native ties select the preceding step. Step multiples are relative to zero.
pub fn closest_step(value: f64, min: f64, max: f64, step: f64) -> f64 {
    let value = value.clamp(min, max);
    let next = ((value / step).ceil() * step).min(max);
    let prev = ((value / step).floor() * step).max(min);
    if next - value < value - prev {
        next
    } else {
        prev
    }
}
impl Scene {
    pub(super) fn slider_geometry(&self, id: u32) -> SliderSnapshot {
        let n = &self.nodes[&id];
        let p = &n.props;
        let vertical = p.orientation == Orientation::Vertical;
        let header = if p.header.is_empty() {
            0.
        } else {
            n.header_text.height + 4.
        };
        let f = if p.maximum == p.minimum {
            0.
        } else {
            (p.value - p.minimum) / (p.maximum - p.minimum)
        };
        let reversed =
            p.is_direction_reversed ^ (!vertical && p.flow_direction == FlowDirection::RightToLeft);
        let f = if reversed { 1. - f } else { f };
        let thickness = if n.theme == Theme::HighContrast {
            2.
        } else {
            4.
        };
        let round = |v: f64| (v * self.dpr + 0.5 + 1e-9).floor() / self.dpr;
        let size = round(overlays::metric("SliderHorizontalThumbWidth", 18.));

        let (track, thumb) = if vertical {
            let length = (n.rect.height - header - size).max(0.);
            let y = round(header + (1. - f) * length);
            (
                Rect::new(
                    round((n.rect.width - thickness) / 2.),
                    header,
                    round(thickness),
                    (n.rect.height - header).max(0.),
                ),
                Rect::new(round((n.rect.width - size) / 2.), y, size, size),
            )
        } else {
            let length = (n.rect.width - size).max(0.);
            let x = round(f * length);
            // HorizontalTemplate places its 32-DIP track row at the top, even
            // when the Slider itself stretches (native radius option: H=216).
            let row_height = overlays::metric("SliderHorizontalHeight", 32.).min((n.rect.height-header).max(0.));
            let y = round(header + (row_height - thickness) / 2.);
            (
                Rect::new(0., y, n.rect.width, round(thickness)),
                Rect::new(
                    x,
                    round(header + (row_height - size) / 2.),
                    size,
                    size,
                ),
            )
        };
        SliderSnapshot {
            track,
            thumb,
            fraction: f,
            inner_scale: n.slider.scale.value(self.time),
            tooltip: n.slider.tooltip,
        }
    }
    pub(super) fn slider_pointer(&mut self, id: u32, x: f64, y: f64) -> Result<(), String> {
        self.nodes.get_mut(&id).unwrap().slider.tooltip_dismissed = false;
        let n = &self.nodes[&id];
        let p = &n.props;
        let (x, y) = n.world.inverse().unwrap_or_default().point(x, y);
        let v = self.slider_geometry(id);
        let vertical = p.orientation == Orientation::Vertical;
        let mut fraction = if vertical {
            1. - (y - v.track.y - v.thumb.height / 2.) / (v.track.height - v.thumb.height).max(1e-9)
        } else {
            (x - v.thumb.width / 2.) / (n.rect.width - v.thumb.width).max(1e-9)
        };
        if p.is_direction_reversed ^ (!vertical && p.flow_direction == FlowDirection::RightToLeft) {
            fraction = 1. - fraction;
        }
        let value = closest_step(
            p.minimum + fraction.clamp(0., 1.) * (p.maximum - p.minimum),
            p.minimum,
            p.maximum,
            p.step_frequency,
        );
        self.update(vec![Update {
            id,
            patch: serde_json::json!({"value":value}),
        }])
    }
    pub(super) fn slider_key(&mut self, id: u32, key: &str) -> Result<bool, String> {
        let p = &self.nodes[&id].props;
        let invert = (p.flow_direction == FlowDirection::RightToLeft) ^ p.is_direction_reversed;
        let forward = match key {
            "ArrowRight" => !invert,
            "ArrowLeft" => invert,
            "ArrowUp" => !p.is_direction_reversed,
            "ArrowDown" => p.is_direction_reversed,
            "PageUp" => true,
            "PageDown" => false,
            "Home" | "End" => true,
            _ => return Ok(false),
        };
        let step = if key.starts_with("Page") {
            p.large_change
        } else {
            p.small_change
        };
        let value = match key {
            "Home" => p.minimum,
            "End" => p.maximum,
            _ => {
                if !forward && p.value == p.maximum && (p.value / step).fract().abs() > 1e-9 {
                    ((p.value / step).floor() * step).max(p.minimum)
                } else {
                    closest_step(
                        p.value + if forward { step } else { -step },
                        p.minimum,
                        p.maximum,
                        step,
                    )
                }
            }
        };
        self.update(vec![Update {
            id,
            patch: serde_json::json!({"value":value}),
        }])?;
        self.nodes.get_mut(&id).unwrap().slider.tooltip_dismissed = false;
        Ok(true)
    }
    pub(super) fn sync_sliders(&mut self) {
        for n in self
            .nodes
            .values_mut()
            .filter(|n| n.kind == NodeKind::Slider)
        {
            let target = if n.button.pressed {
                0.71
            } else if n.button.pointer_inside {
                1.167
            } else {
                0.86
            };
            if self.reduced_motion || n.theme == Theme::HighContrast || !n.enabled {
                n.slider.scale.snap(target);
            } else if n.slider.scale.to != target {
                n.slider.scale.retarget(
                    target,
                    self.time,
                    if target == 0.86 { 167. } else { 250. },
                );
            }
        }
        let ids: Vec<_> = self
            .nodes
            .values()
            .filter(|n| n.kind == NodeKind::Slider)
            .map(|n| n.id)
            .collect();
        for id in ids {
            if let Some(tip) = self.nodes[&id].slider.tooltip {
                let n = &self.nodes[&id];
                let value = n.props.value;
                let open = n.props.is_thumb_tool_tip_enabled
                    && !n.slider.tooltip_dismissed
                    && n.visible
                    && n.enabled
                    && (n.button.pointer_inside || n.button.pressed || self.focused == Some(id));
                let t = self.nodes.get_mut(&tip).unwrap();
                let text = if value.fract() == 0. {
                    format!("{value:.0}")
                } else {
                    format!("{value:.3}")
                        .trim_end_matches('0')
                        .trim_end_matches('.')
                        .into()
                };
                if t.props.text != text || t.props.is_open != open {
                    t.props.text = text;
                    t.props.is_open = open;
                    self.dirty = true;
                }
            }
        }
    }
    pub(super) fn paint_slider(&self, id: u32, out: &mut Vec<Draw>) {
        let n = &self.nodes[&id];
        let p = &n.props;
        let v = self.slider_geometry(id);
        let suffix = if !n.enabled {
            "Disabled"
        } else if n.button.pressed {
            "Pressed"
        } else if n.button.pointer_inside {
            "PointerOver"
        } else {
            ""
        };
        let background = overlays::brush(n.theme, &format!("SliderTrackFill{suffix}"));
        let foreground = overlays::brush(n.theme, &format!("SliderTrackValueFill{suffix}"));
        let color = |custom: &Option<BrushValue>, brush: &crate::resources::Brush| {
            custom
                .as_ref()
                .map(|b| Self::color(b, n.theme))
                .unwrap_or_else(|| brush.solid_color())
        };
        out.push(Draw::VectorLayer {
            bounds: Rect::new(-3., -3., n.rect.width + 6., n.rect.height + 6.),
        });
        out.push(Draw::Fill {
            rect: v.track,
            color: color(&p.background, &background),
            radius: 2.,
        });
        let vertical = p.orientation == Orientation::Vertical;
        let reverse =
            p.is_direction_reversed ^ (!vertical && p.flow_direction == FlowDirection::RightToLeft);
        let t = v.thumb;
        let track = v.track;
        let value_rect = if vertical {
            let y = t.y + t.height / 2.;
            if reverse {
                Rect::new(track.x, track.y, track.width, y - track.y)
            } else {
                Rect::new(track.x, y, track.width, track.y + track.height - y)
            }
        } else {
            let x = t.x + t.width / 2.;
            if reverse {
                Rect::new(x, track.y, track.x + track.width - x, track.height)
            } else {
                Rect::new(track.x, track.y, x - track.x, track.height)
            }
        };
        out.push(Draw::Fill {
            rect: value_rect,
            color: color(&p.foreground, &foreground),
            radius: 2.,
        });
        // Slider's default TickPlacement is Inline. The same source-traced
        // TickBar algorithm supplies physical-pixel spacing and decimation.
        let ticks=super::scroll_primitives::tick_marks(
            if vertical {n.rect.height - if p.header.is_empty(){0.}else{n.header_text.height+4.}} else {n.rect.width},
            if vertical {v.track.width} else {v.track.height},
            if vertical {t.height} else {t.width},p.minimum,p.maximum,p.tick_frequency,
            vertical,reverse,self.dpr,
        );
        for mut tick in ticks {
            tick.x+=v.track.x;tick.y+=v.track.y;
            out.push(Draw::Fill{rect:tick,color:overlays::brush(n.theme,"SliderInlineTickBarFill").solid_color(),radius:0.});
        }
        // Template Border Margin=-2 extends the 18-DIP hit thumb to 22 DIPs.
        let outer = Rect::new(t.x - 2., t.y - 2., t.width + 4., t.height + 4.);
        out.push(Draw::Fill {
            rect: outer,
            color: overlays::brush(n.theme, "SliderOuterThumbBackground").solid_color(),
            radius: 10.,
        });
        Self::brush_command(
            out,
            Rect::new(
                outer.x + 0.5,
                outer.y + 0.5,
                outer.width - 1.,
                outer.height - 1.,
            ),
            9.5,
            1.,
            &overlays::brush(n.theme, "SliderThumbBorderBrush"),
        );
        let size = overlays::metric("SliderInnerThumbWidth", 12.) * v.inner_scale;
        out.push(Draw::Ellipse {
            rect: Rect::new(
                t.x + (t.width - size) / 2.,
                t.y + (t.height - size) / 2.,
                size,
                size,
            ),
            color: overlays::brush(n.theme, &format!("SliderThumbBackground{suffix}"))
                .solid_color(),
        });
        out.push(Draw::EndLayer);
        if !p.header.is_empty() {
            for line in &n.header_text.lines {
                out.push(Draw::Text {
                    style: p.font_style,
                    x: 0.,
                    y: line.baseline,
                    text: line.text.clone(),
                    color: overlays::brush(
                        n.theme,
                        if n.enabled {
                            "SliderHeaderForeground"
                        } else {
                            "SliderHeaderForegroundDisabled"
                        },
                    )
                    .solid_color(),
                    size: p.font_size,
                    font: p.font_family.clone(),
                    max_width: n.rect.width,
                    weight: p.font_weight,
                });
            }
        }
    }
}
