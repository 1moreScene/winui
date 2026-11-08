use super::*;
use crate::typography::{self, TextLayout};
fn ceil(v: f64, d: f64) -> f64 {
    (v * d - 1e-8).ceil() / d
}
impl Scene {
    pub(in crate::scene) fn measure_selector(
        &mut self,
        id: u32,
        m: &mut impl TextMeasurer,
    ) -> [f64; 2] {
        let n = &self.nodes[&id];
        let font = n.props.font();
        [
            n.props
                .nav_controls
                .items
                .iter()
                .map(|i| {
                    ceil(m.measure(&i.text, &font).width, self.dpr)
                        + if i.icon.is_empty() { 24. } else { 48. }
                })
                .sum(),
            40.,
        ]
    }
    pub(in crate::scene) fn layout_selector(
        &mut self,
        id: u32,
        _r: Rect,
        m: &mut impl TextMeasurer,
    ) -> Vec<Part> {
        let n = &self.nodes[&id];
        let p = &n.props;
        let r = Rect::new(
            p.padding[0],
            p.padding[1],
            (n.rect.width - p.padding[0] - p.padding[2]).max(0.),
            (n.rect.height - p.padding[1] - p.padding[3]).max(0.),
        );
        let items = n.props.nav_controls.items.clone();
        let font = n.props.font();
        let selected = n.props.selected_index;
        let enabled = n.enabled;
        let mut parts = vec![];
        let widths = items
            .iter()
            .map(|i| {
                ceil(m.measure(&i.text, &font).width, self.dpr)
                    + if i.icon.is_empty() { 24. } else { 48. }
            })
            .collect::<Vec<_>>();
        let total = widths.iter().sum::<f64>();
        let mut offset = n
            .nav_controls
            .pips_scroll
            .value(self.time)
            .clamp(0., (total - r.width).max(0.));
        if let Ok(index) = usize::try_from(selected) {
            if index < widths.len() {
                let start = widths[..index].iter().sum::<f64>();
                if start < offset {
                    offset = start;
                }
                if start + widths[index] > offset + r.width {
                    offset = (start + widths[index] - r.width).max(0.);
                }
            }
        }
        self.nodes
            .get_mut(&id)
            .unwrap()
            .nav_controls
            .pips_scroll
            .set(offset, self.time, false);
        let mut x = r.x - offset;
        for (i, item) in items.iter().enumerate() {
            let rect = Rect::new(x, r.y, widths[i], 40.);
            let mut part = Part::new(&item.id, "selector", i as i32, &item.text, rect);
            part.font = font.clone();
            part.text = typography::layout(
                &item.text,
                &font,
                f64::INFINITY,
                false,
                TextTrimming::Clip,
                None,
                m,
            );
            part.enabled = enabled && item.enabled;
            part.selected = i as i32 == selected;
            let reduce = self.reduced_motion || self.theme == Theme::HighContrast;
            let c = &mut self.nodes.get_mut(&id).unwrap().nav_controls;
            let motion = c.selector_pills.entry(item.id.clone()).or_default();
            let target = if part.selected { 1. } else { 0. };
            if reduce || target == 0. {
                motion.snap(target);
            }
            if motion.to != target {
                motion.curve = [0., 0., 0., 1.];
                if reduce {
                    motion.snap(target);
                } else {
                    motion.retarget(
                        target,
                        self.time,
                        super::super::command_controls::motion()["selectorPillMs"]
                            .as_f64()
                            .unwrap(),
                    );
                }
            }
            if !item.icon.is_empty() && !c.glyphs.contains_key(&item.icon) {
                let glyphfont = Font {
                    family: "Segoe Fluent Icons".into(),
                    size: 16.,
                    ..Default::default()
                };
                let mut glyph: TextLayout = typography::layout_tight(&item.icon, &glyphfont, m);
                glyph.height = 16.;
                glyph.line_height = 16.;
                for line in &mut glyph.lines {
                    line.baseline = 16.;
                }
                c.glyphs.insert(item.icon.clone(), glyph);
            }
            parts.push(part);
            x += widths[i];
        }
        self.nodes
            .get_mut(&id)
            .unwrap()
            .nav_controls
            .selector_pills
            .retain(|key, _| items.iter().any(|i| &i.id == key));
        parts
    }
    pub(in crate::scene) fn paint_selector(&mut self, id: u32, out: &mut Vec<Draw>) {
        let n = &self.nodes[&id];
        let c = &n.nav_controls;
        let theme = n.theme;
        let resource = |key: &str| super::super::command_controls::color(theme, key);
        for part in &c.parts {
            let hover = c.hovered.as_ref() == Some(&part.key);
            let pressed = c.pressed.as_ref().is_some_and(|(_, key)| key == &part.key) && hover;
            let suffix = if !part.enabled {
                "Disabled"
            } else if pressed && !part.selected {
                "Pressed"
            } else if hover {
                "PointerOver"
            } else if part.selected {
                "Selected"
            } else {
                ""
            };
            let bg_suffix = if part.selected {
                "Selected"
            } else if pressed {
                "Pressed"
            } else if hover {
                "PointerOver"
            } else {
                ""
            };
            let bg = resource(&format!("SelectorBarItemBackground{bg_suffix}"));
            out.push(Draw::Fill {
                rect: part.rect,
                color: bg,
                radius: 4.,
            });
            let fg = resource(&format!("SelectorBarItemForeground{suffix}"));
            let item = &n.props.nav_controls.items[part.index as usize];
            let icon = !item.icon.is_empty();
            if icon {
                if let Some(glyph) = c.glyphs.get(&item.icon) {
                    let f = Font {
                        family: "Segoe Fluent Icons".into(),
                        size: 16.,
                        ..Default::default()
                    };
                    paint::text(
                        out,
                        glyph,
                        &f,
                        &fg,
                        Rect::new(
                            part.rect.x + ceil(12., self.dpr),
                            part.rect.y + ceil(12., self.dpr),
                            16.,
                            16.,
                        ),
                        false,
                    );
                }
            }
            paint::text(
                out,
                &part.text,
                &part.font,
                &fg,
                Rect::new(
                    part.rect.x + if icon { 36. } else { 12. },
                    part.rect.y + ceil(10., self.dpr),
                    part.rect.width - if icon { 48. } else { 24. },
                    part.text.height,
                ),
                false,
            );
            let progress = c
                .selector_pills
                .get(&part.key)
                .map_or(0., |m| m.value(self.time));
            if progress > 0. {
                let w = 4. + 12. * progress;
                let brush = super::super::command_controls::brush(
                    theme,
                    if part.enabled {
                        "SelectorBarItemPillFill"
                    } else {
                        "SelectorBarItemDisabledPillFill"
                    },
                );
                let mut rgba = crate::material::rgba(&brush.solid_color());
                rgba[3] *= progress;
                let pill = Rect::new(
                    part.rect.x + (part.rect.width - w) / 2.,
                    part.rect.y + 40. - ceil(3., self.dpr),
                    w,
                    ceil(3., self.dpr),
                );
                // XAML Rectangle RadiusX=.5, RadiusY=1 followed by ScaleX 1..4.
                // CornerClip already saves the drawing state.
                out.push(Draw::CornerClip {
                    rect: pill,
                    radii: [[0.5 * (1. + 3. * progress), 1.]; 4],
                });
                out.push(Draw::Fill {
                    rect: pill,
                    color: crate::material::css(rgba),
                    radius: 0.,
                });
                out.push(Draw::Restore);
            }
        }
    }
}
