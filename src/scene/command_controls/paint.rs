use super::*;
fn draw_text(
    out: &mut Vec<Draw>,
    text: &TextLayout,
    font: &Font,
    color: &str,
    r: Rect,
    center: bool,
) {
    for line in &text.lines {
        out.push(Draw::Text {
            style: font.style,
            x: r.x
                + if center {
                    (r.width - line.width) / 2.
                } else {
                    0.
                },
            y: r.y + line.baseline,
            text: line.text.clone(),
            color: color.into(),
            size: font.size,
            font: font.family.clone(),
            weight: font.weight,
            max_width: r.width,
        });
    }
}
impl Scene {
    pub(in crate::scene) fn is_command_more(&self, id: u32) -> bool {
        self.nodes[&id].command.role == "more" && self.nodes[&id].command.owner.is_some()
    }
    fn command_keys(&self, id: u32) -> (String, String, String) {
        let n = &self.nodes[&id];
        let state = n.button.state(n.enabled);
        let suffix = if state == ControlState::Normal {
            ""
        } else {
            state.as_str()
        };
        let prefix = if n.kind == NodeKind::DropDownButton {
            "Button"
        } else if n.kind == NodeKind::AppBarToggleButton {
            "AppBarToggleButton"
        } else {
            "AppBarButton"
        };
        let checked = if n.kind == NodeKind::AppBarToggleButton && n.props.is_checked == Some(true)
        {
            "Checked"
        } else {
            ""
        };
        (
            format!("{prefix}Background{checked}{suffix}"),
            format!("{prefix}Foreground{checked}{suffix}"),
            format!("{prefix}BorderBrush{checked}{suffix}"),
        )
    }
    pub(in crate::scene) fn command_foreground(&self, id: u32) -> String {
        let n = &self.nodes[&id];
        if let Some(b) = &n.props.foreground {
            return Self::color(b, n.theme);
        }
        let (_, mut fg, _) = self.command_keys(id);
        if n.command.in_overflow && n.kind == NodeKind::AppBarToggleButton {
            fg = format!(
                "AppBarToggleButtonForeground{}",
                if !n.enabled {
                    "Disabled"
                } else {
                    match n.button.state(true) {
                        ControlState::Pressed => "Pressed",
                        _ => "",
                    }
                }
            );
        }
        color(n.theme, &fg)
    }
    pub(in crate::scene) fn paint_command(&mut self, id: u32, out: &mut Vec<Draw>) {
        let n = &self.nodes[&id];
        let kind = n.kind;
        let theme = n.theme;
        let p = n.props.clone();
        let r = Rect::new(0., 0., n.rect.width, n.rect.height);
        if kind == NodeKind::CommandBar {
            if self.in_command_bar_flyout(id){return;}
            if self.command_expanded_template(id) {
                let mut open_rect = r;
                if p.command_controls.default_label_position
                    == CommandBarDefaultLabelPosition::Bottom
                {
                    open_rect.height = n.command.body.height.max(64.);
                }
                Self::brush_command(
                    out,
                    open_rect,
                    p.corner_radius,
                    1.,
                    &brush(theme, "CommandBarBorderBrushOpen"),
                );
                return;
            }
            out.push(Draw::Fill {
                rect: r,
                color: color(theme, "CommandBarBackground"),
                radius: p.corner_radius,
            });
            return;
        }
        if n.command.separator {
            out.push(Draw::Fill {
                rect: if n.command.in_overflow {
                    Rect::new(0., 4., r.width, self.dpr.round() / self.dpr)
                } else {
                    Rect::new(
                        (r.width - self.dpr.round() / self.dpr) / 2.,
                        if kind==NodeKind::AppBarSeparator {p.padding[1]}else{8.},
                        self.dpr.round() / self.dpr,
                        (r.height-if kind==NodeKind::AppBarSeparator {p.padding[1]+p.padding[3]}else{16.}).max(0.),
                    )
                },
                color: p.foreground.as_ref().map(|b|Self::color(b,theme)).unwrap_or_else(||color(theme,"AppBarSeparatorForeground")),
                radius: 0.5,
            });
            return;
        }
        let (bg, _, border) = self.command_keys(id);
        let bg = if n.command.in_overflow && kind == NodeKind::AppBarToggleButton {
            let state = n.button.state(n.enabled);
            if state == ControlState::Normal || state == ControlState::Disabled {
                "AppBarToggleButtonBackground".to_string()
            } else {
                format!(
                    "AppBarToggleButtonBackgroundHighLightOverlay{}{}",
                    if p.is_checked == Some(true) {
                        "Checked"
                    } else {
                        ""
                    },
                    state.as_str()
                )
            }
        } else {
            bg
        };
        let target = p
            .background
            .as_ref()
            .map(|b| Self::color(b, theme))
            .unwrap_or_else(|| color(theme, &bg));
        let body = if self.is_command_more(id) {
            Rect::new(2., 6., (r.width - 8.).max(0.), (r.height - 12.).max(0.))
        } else {
            n.command.body
        };
        let reduce = self.reduced_motion || theme == Theme::HighContrast;
        let c = &mut self.nodes.get_mut(&id).unwrap().command;
        if c.colors.as_ref().is_none_or(|(_, to)| to != &target) {
            let current = c
                .colors
                .as_ref()
                .map(|(a, b)| {
                    crate::material::css(crate::material::interpolate_color(
                        crate::material::rgba(a),
                        crate::material::rgba(b),
                        c.background.value(self.time),
                    ))
                })
                .unwrap_or_else(|| target.clone());
            let identical=current==target;
            c.colors = Some((current, target));
            c.background.snap(if reduce||identical { 1. } else { 0. });
            c.background.curve = [0., 0., 1., 1.];
            if !reduce&&!identical {
                c.background
                    .retarget(1., self.time, motion()["brushMs"].as_f64().unwrap());
            }
        }
        if reduce{c.background.snap(1.);}
        let (a, b) = c.colors.as_ref().unwrap();
        let background = crate::material::css(crate::material::interpolate_color(
            crate::material::rgba(a),
            crate::material::rgba(b),
            c.background.value(self.time),
        ));
        // Grid.BackgroundSizing=InnerBorderEdge. Keep the translucent fill
        // out of the border, and keep the entire border inside RenderSize.
        let inset_background = kind == NodeKind::DropDownButton;
        let border_brush = brush(theme, &border);
        let width = if kind == NodeKind::DropDownButton
            || kind == NodeKind::AppBarToggleButton
            || theme == Theme::HighContrast
        {
            self.dpr.round_ties_even() / self.dpr
        } else {
            0.
        };
        let background_rect = if inset_background {
            Rect::new(
                body.x + width,
                body.y + width,
                (body.width - width * 2.).max(0.),
                (body.height - width * 2.).max(0.),
            )
        } else {
            body
        };
        out.push(Draw::Fill {
            rect: background_rect,
            color: background,
            radius: (p.corner_radius - if inset_background { width } else { 0. }).max(0.),
        });
        if width > 0. {
            let half = width / 2.;
            Self::brush_command(
                out,
                Rect::new(
                    body.x + half,
                    body.y + half,
                    (body.width - width).max(0.),
                    (body.height - width).max(0.),
                ),
                (p.corner_radius - half).max(0.),
                width,
                &border_brush,
            );
        }
        if !self.is_command_more(id) {
            let c = &self.nodes[&id].command;
            if c.label_rect.width > 0. {
                let font = Font {
                    size: if kind == NodeKind::DropDownButton {
                        p.font_size
                    } else if c.in_overflow {
                        14.
                    } else {
                        12.
                    },
                    ..p.font()
                };
                let label = c.label_rect;
                let center = kind != NodeKind::DropDownButton
                    && !c.in_overflow
                    && !(p.command_controls.inside_bar
                        && p.command_controls.default_label_position
                            == CommandBarDefaultLabelPosition::Right);
                draw_text(
                    out,
                    &c.label,
                    &font,
                    &self.command_foreground(id),
                    label,
                    center,
                );
                if c.in_overflow {
                    if c.shortcut.width > 0. {
                        let font = Font {
                            size: 12.,
                            ..p.font()
                        };
                        draw_text(
                            out,
                            &c.shortcut,
                            &font,
                            &self.command_foreground(id),
                            Rect::new(
                                r.width - 12. - c.shortcut.width,
                                (r.height - c.shortcut.height) / 2.,
                                c.shortcut.width,
                                c.shortcut.height,
                            ),
                            false,
                        );
                    }
                    if kind == NodeKind::AppBarToggleButton && p.is_checked == Some(true) {
                        out.push(Draw::Text {
                            style: FontStyle::Normal,
                            x: 12.,
                            y: (r.height - 16.) / 2. + 16.,
                            text: "\u{e73e}".into(),
                            color: self.command_foreground(id),
                            size: 16.,
                            font: "Segoe Fluent Icons".into(),
                            weight: 400,
                            max_width: 16.,
                        });
                    }
                }
            }
        }
    }
}
