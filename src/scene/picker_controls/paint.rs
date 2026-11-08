use super::*;
use crate::{
    picker_spectrum::Spectrum,
    resources::GradientStop,
    typography::{Font, TextLayout},
};
fn text(out: &mut Vec<Draw>, layout: &TextLayout, font: &Font, color: &str, r: Rect, center: bool) {
    for line in &layout.lines {
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
            max_width: r.width,
            weight: font.weight,
        });
    }
}
impl Scene {
    pub(in crate::scene) fn picker_icon_foreground(&self, id: u32) -> Option<String> {
        let n = &self.nodes[&id];
        let owner = n.picker.owner?;
        let root = &self.nodes[&owner];
        if n.picker.role == "CalendarGlyph" {
            let q = root.props.picker_controls.as_deref()?;
            let state = self.nodes[&root.picker.parts["InputButton"]]
                .button
                .state(root.enabled);
            let key = if state == ControlState::Normal && q.date.is_some() {
                "CalendarDatePickerTextForegroundSelected".into()
            } else {
                format!(
                    "CalendarDatePickerCalendarGlyphForeground{}",
                    if state == ControlState::Normal {
                        ""
                    } else {
                        state.as_str()
                    }
                )
            };
            return Some(color(n.theme, &key));
        }
        if n.picker.role == "MoreGlyph" {
            let more = &self.nodes[&root.picker.parts["MoreButton"]];
            return Some(color(
                n.theme,
                if !more.enabled || more.button.pressed {
                    "SystemBaseMediumLowColor"
                } else if more.button.pointer_inside {
                    "SystemBaseMediumColor"
                } else {
                    "SystemBaseHighColor"
                },
            ));
        }
        None
    }
    pub(in crate::scene) fn picker_custom_part(&self, id: u32) -> bool {
        let n = &self.nodes[&id];
        n.picker.owner.is_some()
            && (n.picker.role.starts_with("Day")
                || n.picker.role.starts_with("WeekDay")
                || n.picker.role.starts_with("GroupLabel")
                || matches!(
                    n.picker.role.as_str(),
                    "Spectrum"
                        | "PreviousColor"
                        | "InputButton"
                        | "ThirdDimensionSlider"
                        | "AlphaSlider"
                        | "MoreButton"
                ))
    }
    pub(in crate::scene) fn paint_picker_wheel_navigation(
        &self,
        id: u32,
        out: &mut Vec<Draw>,
    ) -> bool {
        let n = &self.nodes[&id];
        if !(n.picker.role.ends_with("WheelUpButton") || n.picker.role.ends_with("WheelDownButton"))
        {
            return false;
        }
        if !n.visible {
            return true;
        }
        let r = n.rect;
        let state = n.button.state(n.enabled);
        let suffix = if state == ControlState::Pressed {
            "Pressed"
        } else if state == ControlState::PointerOver {
            "PointerOver"
        } else {
            ""
        };
        out.push(Draw::Save);
        out.push(Draw::Transform {
            matrix: [1., 0., 0., 1., r.x, r.y],
        });
        let background = brush(n.theme, "LoopingSelectorUpDownButtonBackground");
        let area = Rect::new(0., 0., r.width, r.height);
        if background.kind == "acrylic" {
            out.push(Draw::Acrylic {
                rect: area,
                recipe: crate::material::AcrylicOptions {
                    tint_color: background.tint,
                    tint_opacity: background.tint_opacity,
                    luminosity_opacity: background.luminosity_opacity,
                    fallback_color: background.fallback,
                },
                colors: None,
                weight: if self.reduced_transparency || n.theme == Theme::HighContrast {
                    0.
                } else {
                    1.
                },
            });
        } else {
            Self::brush_command(out, area, 0., 0., &background);
        }
        if !suffix.is_empty() {
            Self::brush_command(
                out,
                area,
                0.,
                0.,
                &brush(
                    n.theme,
                    &format!("LoopingSelectorUpDownButtonBackground{suffix}"),
                ),
            );
        }
        let scale = if state == ControlState::Pressed {
            scalar("LoopingSelectorUpDownButtonScalePressed")
        } else {
            1.
        };
        out.push(Draw::Save);
        out.push(Draw::Transform {
            matrix: [
                scale,
                0.,
                0.,
                scale,
                r.width * (1. - scale) / 2.,
                r.height * (1. - scale) / 2.,
            ],
        });
        let start = out.len();
        text(
            out,
            &n.text,
            &n.props.font(),
            &color(
                n.theme,
                &format!("LoopingSelectorUpDownButtonForeground{suffix}"),
            ),
            Rect::new(0., (r.height - n.text.height) / 2., r.width, n.text.height),
            true,
        );
        self.snap_text_commands(id, start, out);
        out.push(Draw::Restore);
        out.push(Draw::Restore);
        true
    }
    pub(in crate::scene) fn paint_picker_wheel_item(&self, id: u32, out: &mut Vec<Draw>) -> bool {
        let n = &self.nodes[&id];
        let Some(parent) = n.parent else { return false };
        let wheel = &self.nodes[&parent];
        if n.kind != NodeKind::CollectionItem || !wheel.picker.role.ends_with("Wheel") {
            return false;
        }
        let Some(owner) = wheel.picker.owner else {
            return false;
        };
        if n.props.text.is_empty() || !n.visible {
            return true;
        }
        let r = n.rect;
        let offset = wheel.scroll.offsets(self.time)[1];
        let selected = (r.y + r.height / 2. - offset - wheel.scroll.viewport[1] / 2.).abs() < 20.;
        let prefix = if self.nodes[&owner].kind == NodeKind::DatePicker {
            "DatePickerFlyoutPresenter"
        } else {
            "TimePickerFlyoutPresenter"
        };
        let foreground = color(
            n.theme,
            &if selected {
                format!("{prefix}HighlightForegroundColor")
            } else {
                "LoopingSelectorItemForeground".into()
            },
        );
        out.push(Draw::Save);
        out.push(Draw::Transform {
            matrix: [1., 0., 0., 1., r.x, r.y],
        });
        if n.button.pointer_inside && !selected {
            out.push(Draw::Fill {
                rect: Rect::new(4., 2., (r.width - 8.).max(0.), (r.height - 4.).max(0.)),
                radius: 4.,
                color: color(n.theme, "LoopingSelectorItemBackgroundPointerOver"),
            });
        }
        let p = &n.props;
        let height = n.text.height;
        let inset = if p.horizontal_content_alignment == HorizontalAlignment::Left {
            6.
        } else {
            0.
        };
        let target = Rect::new(
            p.padding[0] + inset,
            p.padding[1] + (r.height - p.padding[1] - p.padding[3] - height) / 2.,
            (r.width - p.padding[0] - p.padding[2] - inset).max(0.),
            height,
        );
        let start = out.len();
        text(
            out,
            &n.text,
            &p.font(),
            &foreground,
            target,
            p.horizontal_content_alignment != HorizontalAlignment::Left,
        );
        self.snap_text_commands(id, start, out);
        out.push(Draw::Restore);
        true
    }
    pub(in crate::scene) fn paint_picker(
        &mut self,
        id: u32,
        out: &mut Vec<Draw>,
    ) -> Option<String> {
        if self.is_picker_surface(id) {
            self.paint_picker_wheel_surface(id, out);
            return None;
        }
        let n = &self.nodes[&id];
        let p = n.props.clone();
        let q = p.picker_controls.as_deref().unwrap().clone();
        let kind = n.kind;
        let theme = n.theme;
        let enabled = n.enabled;
        if kind == NodeKind::CalendarView {
            let r = Rect::new(0., 0., n.rect.width, n.rect.height);
            let b = overlays::border_thickness([1.; 4], self.dpr)[0];
            out.push(Draw::Layer {
                opacity: self.calendar_background_opacity(id),
            });
            if p.background.is_none() {
                out.push(Draw::Fill {
                    rect: r,
                    radius: p.corner_radius,
                    color: color(theme, "CalendarViewBackground"),
                });
            }
            Self::brush_command(
                out,
                r,
                p.corner_radius,
                b,
                &brush(theme, "CalendarViewBorderBrush"),
            );
            out.push(Draw::EndLayer);
            let header_bottom = self.nodes[&n.picker.parts["HeaderButton"]].rect.height
                + (6. * self.dpr).round_ties_even() / self.dpr
                + (7. * self.dpr).round_ties_even() / self.dpr;
            Self::brush_command(
                out,
                Rect::new(b, header_bottom, (r.width - 2. * b).max(0.), b),
                0.,
                0.,
                &brush(theme, "CalendarViewBorderBrush"),
            );
            let view_start = out.len();
            let cells = n.picker.cells.clone();
            let grid = n.picker.calendar_grid;

            for cell in cells {
                let child = &self.nodes[&cell.node];
                if !child.visible {
                    continue;
                }
                let state = child.button.state(enabled && !cell.blackout);
                let suffix = if !enabled {
                    "Disabled"
                } else if state == ControlState::Pressed {
                    "Pressed"
                } else if state == ControlState::PointerOver {
                    "Hover"
                } else {
                    ""
                };
                let (background, foreground, border) = if cell.today {
                    (
                        format!(
                            "CalendarViewToday{}Background",
                            if cell.blackout { "Blackout" } else { suffix }
                        ),
                        format!(
                            "CalendarViewToday{}Foreground",
                            if cell.blackout { "Blackout" } else { "" }
                        ),
                        if cell.selected {
                            Some("CalendarViewTodaySelectedInnerBorderBrush".into())
                        } else {
                            None
                        },
                    )
                } else if cell.blackout {
                    (
                        "CalendarViewBlackoutBackground".into(),
                        "CalendarViewBlackoutForeground".into(),
                        None,
                    )
                } else if cell.selected {
                    (
                        format!(
                            "CalendarViewCalendarItem{}Background",
                            if !enabled {
                                "Disabled"
                            } else if suffix == "Hover" {
                                "Hover"
                            } else if suffix == "Pressed" {
                                "Pressed"
                            } else {
                                ""
                            }
                        ),
                        format!("CalendarViewSelected{suffix}Foreground"),
                        Some(format!("CalendarViewSelected{suffix}BorderBrush")),
                    )
                } else if cell.out_of_scope && q.is_out_of_scope_enabled {
                    (
                        "CalendarViewOutOfScopeBackground".into(),
                        format!("CalendarViewOutOfScope{suffix}Foreground"),
                        None,
                    )
                } else {
                    (
                        format!(
                            "CalendarViewCalendarItem{}Background",
                            if suffix == "Hover" {
                                "Hover"
                            } else if suffix == "Pressed" {
                                "Pressed"
                            } else if !enabled {
                                "Disabled"
                            } else {
                                ""
                            }
                        ),
                        if !enabled {
                            "CalendarViewDisabledForeground".into()
                        } else if suffix == "Pressed" {
                            "CalendarViewPressedForeground".into()
                        } else {
                            "CalendarViewCalendarItemForeground".into()
                        },
                        None,
                    )
                };
                let radius = if q.display_mode == CalendarViewDisplayMode::Month {
                    cell.bounds.width / 2.
                } else {
                    4.
                };
                let background = contract()["palettes"][theme.as_str()]
                    .get(&background)
                    .map(|_| color(theme, &background))
                    .unwrap_or_else(|| color(theme, "CalendarViewCalendarItemBackground"));
                out.push(Draw::Fill {
                    rect: cell.bounds,
                    radius,
                    color: background,
                });
                if let Some(border) = border {
                    Self::brush_command(
                        out,
                        cell.bounds,
                        radius,
                        if cell.today { 1. } else { 2. },
                        &brush(theme, &border),
                    );
                }
                let foreground = contract()["palettes"][theme.as_str()]
                    .get(&foreground)
                    .map(|_| color(theme, &foreground))
                    .unwrap_or_else(|| {
                        color(
                            theme,
                            if enabled {
                                "CalendarViewCalendarItemForeground"
                            } else {
                                "CalendarViewDisabledForeground"
                            },
                        )
                    });
                let target = Rect::new(
                    cell.bounds.x,
                    cell.bounds.y
                        + if q.display_mode == CalendarViewDisplayMode::Month {
                            (cell.bounds.height - 4. + 3. - child.text.height) / 2.
                        } else {
                            (cell.bounds.height - child.text.height) / 2.
                        },
                    cell.bounds.width,
                    child.text.height,
                );
                text(
                    out,
                    &child.text,
                    &child.props.font(),
                    &foreground,
                    target,
                    true,
                );
                if cell.blackout {
                    let y = cell.bounds.y + cell.bounds.height / 2.;
                    out.push(Draw::Polyline {
                        points: vec![
                            [cell.bounds.x + cell.bounds.width * 0.3, y],
                            [cell.bounds.x + cell.bounds.width * 0.7, y],
                        ],
                        color: color(theme, "CalendarViewBlackoutStrikethroughBrush"),
                        width: 1.,
                    });
                }
                if let Some(colors) = q.density_colors.get(&cell.date) {
                    let count = colors.len().min(10);
                    for (i, c) in colors.iter().take(count).enumerate() {
                        out.push(Draw::Fill {
                            rect: Rect::new(
                                cell.bounds.x + 4.,
                                cell.bounds.y + cell.bounds.height - 4. - (count - i) as f64 * 2.,
                                (cell.bounds.width - 8.).max(0.),
                                2.,
                            ),
                            radius: 0.,
                            color: c.clone(),
                        });
                    }
                }
            }
            // Group labels scroll with their day cells; weekday headings stay fixed.
            let label_foreground = color(
                theme,
                if enabled {
                    "CalendarViewForeground"
                } else {
                    "CalendarViewWeekDayForegroundDisabled"
                },
            );
            for (role, part) in &n.picker.parts {
                if !role.starts_with("GroupLabel") {
                    continue;
                }
                let label = &self.nodes[part];
                if label.visible {
                    let r = label.rect;
                    text(
                        out,
                        &label.text,
                        &label.props.font(),
                        &label_foreground,
                        Rect::new(r.x, r.y, r.width, label.text.height),
                        false,
                    );
                }
            }
            let days = out.split_off(view_start);
            out.extend(self.calendar_day_commands(id, days, grid));
            let n = &self.nodes[&id];
            let foreground = color(
                theme,
                if enabled {
                    "CalendarViewForeground"
                } else {
                    "CalendarViewWeekDayForegroundDisabled"
                },
            );
            for (role, part) in &n.picker.parts {
                if !role.starts_with("WeekDay") {
                    continue;
                }
                let label = &self.nodes[part];
                if !label.visible {
                    continue;
                }
                let r = label.rect;
                let pad = label.props.padding;
                let target = Rect::new(
                    r.x + pad[0],
                    r.y + pad[1],
                    (r.width - pad[0] - pad[2]).max(0.),
                    label.text.height,
                );
                text(
                    out,
                    &label.text,
                    &label.props.font(),
                    &foreground,
                    target,
                    false,
                );
            }
            let view = out.split_off(view_start);
            out.extend(self.calendar_view_commands(id, view));
            return Some(color(
                theme,
                if enabled {
                    "CalendarViewForeground"
                } else {
                    "CalendarViewWeekDayForegroundDisabled"
                },
            ));
        }
        if matches!(
            kind,
            NodeKind::DatePicker | NodeKind::TimePicker | NodeKind::CalendarDatePicker
        ) {
            let body = n.picker.body;
            let input = n.picker.parts["InputButton"];
            let state = self.nodes[&input].button.state(enabled);
            let suffix = if state == ControlState::Normal {
                ""
            } else {
                state.as_str()
            };
            let prefix = if kind == NodeKind::CalendarDatePicker {
                "CalendarDatePicker"
            } else if kind == NodeKind::DatePicker {
                "DatePickerButton"
            } else {
                "TimePickerButton"
            };
            let b = overlays::border_thickness([1.; 4], self.dpr)[0];
            let inner = Rect::new(
                body.x + b,
                body.y + b,
                (body.width - 2. * b).max(0.),
                (body.height - 2. * b).max(0.),
            );
            Self::brush_command(
                out,
                inner,
                (p.corner_radius - b).max(0.),
                0.,
                &brush(theme, &format!("{prefix}Background{suffix}")),
            );
            Self::brush_command(
                out,
                body,
                p.corner_radius,
                b,
                &brush(theme, &format!("{prefix}BorderBrush{suffix}")),
            );
            if kind != NodeKind::CalendarDatePicker {
                let spacer = color(
                    theme,
                    &format!(
                        "{}SpacerFill{}",
                        if kind == NodeKind::DatePicker {
                            "DatePicker"
                        } else {
                            "TimePicker"
                        },
                        if enabled { "" } else { "Disabled" }
                    ),
                );
                for x in &self.nodes[&id].picker.face_dividers {
                    out.push(Draw::Fill {
                        rect: Rect::new(*x, body.y + b, b, body.height - 2. * b),
                        radius: 0.,
                        color: spacer.clone(),
                    });
                }
            }
            let unset = if kind == NodeKind::TimePicker {
                q.time.is_none()
            } else {
                q.date.is_none()
            };
            let field_suffix = if kind != NodeKind::CalendarDatePicker && enabled && unset {
                "Default"
            } else {
                suffix
            };

            return Some(color(
                theme,
                &format!(
                    "{}{}{}",
                    prefix,
                    if kind == NodeKind::CalendarDatePicker {
                        "TextForeground"
                    } else {
                        "Foreground"
                    },
                    field_suffix
                ),
            ));
        }
        self.paint_color_picker(id, out);
        None
    }
    fn paint_picker_wheel_surface(&self, id: u32, out: &mut Vec<Draw>) {
        let n = &self.nodes[&id];
        let owner = n.picker.owner.unwrap();
        let prefix = if self.nodes[&owner].kind == NodeKind::DatePicker {
            "DatePickerFlyoutPresenter"
        } else {
            "TimePickerFlyoutPresenter"
        };
        let host = n.rect.height - (41. * self.dpr).round_ties_even() / self.dpr;
        out.push(Draw::Fill {
            rect: Rect::new(4., (host - 40.) / 2., (n.rect.width - 8.).max(0.), 40.),
            radius: 4.,
            color: color(n.theme, &format!("{prefix}HighlightFill")),
        });
        let b = overlays::border_thickness([1.; 4], self.dpr)[0];
        out.push(Draw::Fill {
            rect: Rect::new(0., host, n.rect.width, b),
            radius: 0.,
            color: color(n.theme, &format!("{prefix}SpacerFill")),
        });
        let fields = self.nodes[&owner].picker.wheel_fields.len();
        for i in 1..fields {
            let key = ["FirstWheel", "SecondWheel", "ThirdWheel"][i];
            let child = &self.nodes[&self.nodes[&owner].picker.parts[key]];
            out.push(Draw::Fill {
                rect: Rect::new(child.rect.x - b, 0., b, host),
                radius: 0.,
                color: color(n.theme, &format!("{prefix}SpacerFill")),
            });
        }
    }
    pub(super) fn picker_spectrum_definition(&self, id: u32) -> Spectrum {
        let q = self.nodes[&id].props.picker_controls.as_deref().unwrap();
        Spectrum {
            shape: q.color_spectrum_shape,
            components: q.color_spectrum_components,
            hue: [q.min_hue, q.max_hue],
            saturation: [q.min_saturation / 100., q.max_saturation / 100.],
            value: [q.min_value / 100., q.max_value / 100.],
        }
    }
    fn picker_raster(
        &mut self,
        id: u32,
        local: u64,
        key: String,
        width: u32,
        height: u32,
        build: impl FnOnce() -> Vec<u8>,
        rect: Rect,
    ) -> Draw {
        let state = &mut self.nodes.get_mut(&id).unwrap().picker;
        if state.raster_keys.get(&local) != Some(&key) {
            let revision = state.rasters.get(&local).map_or(1, |r| r.revision + 1);
            state.rasters.insert(
                local,
                SpectrumImage {
                    revision,
                    width,
                    height,
                    pixels: Arc::new(build()),
                },
            );
            state.raster_keys.insert(local, key);
        }
        let image = &state.rasters[&local];
        Draw::Raster {
            rect,
            slot: (u64::from(id) << 8) | local,
            revision: image.revision,
            width: image.width,
            height: image.height,
            rgba: image.pixels.clone(),
        }
    }
    fn picker_checker(&mut self, id: u32, slot: u64, r: Rect, theme: Theme) -> Draw {
        let width = r.width.round().max(1.) as u32;
        let height = r.height.round().max(1.) as u32;
        let c = crate::material::rgba(&color(theme, "SystemListLowColor"))
            .map(|v| (v * 255.).round() as u8);
        let key = format!("{width}|{height}|{c:?}");
        self.picker_raster(
            id,
            slot,
            key,
            width,
            height,
            || {
                let mut pixels = vec![0; width as usize * height as usize * 4];
                for y in 0..height {
                    for x in 0..width {
                        if (x / 4 + y / 4) % 2 == 1 {
                            let i = (y as usize * width as usize + x as usize) * 4;
                            pixels[i..i + 4].copy_from_slice(&c);
                        }
                    }
                }
                pixels
            },
            r,
        )
    }
    fn paint_color_picker(&mut self, id: u32, out: &mut Vec<Draw>) {
        let n = &self.nodes[&id];
        let q = n.props.picker_controls.as_deref().unwrap().clone();
        let r = n.picker.spectrum;
        let preview = n.picker.preview;
        let hsv = n.picker.hsv.unwrap();
        let theme = n.theme;
        let spectrum_part = n.picker.parts["Spectrum"];
        let spectrum_state = self.nodes[&spectrum_part].button.state(n.enabled);
        let touch = n.picker.spectrum_touch;
        if q.is_color_spectrum_visible && r.width > 0. {
            let spectrum = self.picker_spectrum_definition(id);
            let side = r.width.round().max(1.) as u32;
            let shared = format!(
                "{side}|{:?}|{:?}|{:?}|{:?}|{:?}",
                spectrum.shape,
                spectrum.components,
                spectrum.hue,
                spectrum.saturation,
                spectrum.value
            );
            let (a, b, weight) = match q.color_spectrum_components {
                ColorSpectrumComponents::HueSaturation | ColorSpectrumComponents::SaturationHue => {
                    (0, 0, 0.)
                }
                ColorSpectrumComponents::HueValue | ColorSpectrumComponents::ValueHue => {
                    (0, 1, hsv.s)
                }
                _ => {
                    let sector = hsv.h.rem_euclid(360.) / 60.;
                    (
                        sector.floor() as u64,
                        (sector.floor() as u64 + 1) % 6,
                        sector.fract(),
                    )
                }
            };
            out.push(Draw::RoundedClip {
                rect: r,
                radius: if q.color_spectrum_shape == ColorSpectrumShape::Ring {
                    r.width / 2.
                } else {
                    self.nodes[&id].props.corner_radius
                },
            });
            let plane = |index: u64| {
                let mut base = hsv;
                base.a = 1.;
                match q.color_spectrum_components {
                    ColorSpectrumComponents::HueValue | ColorSpectrumComponents::ValueHue => {
                        base.s = index as f64
                    }
                    ColorSpectrumComponents::SaturationValue
                    | ColorSpectrumComponents::ValueSaturation => base.h = index as f64 * 60.,
                    _ => base.v = 1.,
                };
                base
            };
            let rtl = self.effective_flow_direction(id) == FlowDirection::RightToLeft;
            if rtl {
                out.push(Draw::Save);
                out.push(Draw::Transform {
                    matrix: [-1., 0., 0., 1., 2. * r.x + r.width, 0.],
                });
            }
            let base = plane(a);
            out.push(self.picker_raster(
                id,
                a,
                format!("{shared}|{a}"),
                side,
                side,
                || spectrum.bitmap(side, base).expect("validated spectrum"),
                r,
            ));
            if b != a && weight > 0. {
                let base = plane(b);
                out.push(Draw::Layer { opacity: weight });
                out.push(self.picker_raster(
                    id,
                    b,
                    format!("{shared}|{b}"),
                    side,
                    side,
                    || spectrum.bitmap(side, base).expect("validated spectrum"),
                    r,
                ));
                out.push(Draw::EndLayer);
            }
            if rtl {
                out.push(Draw::Restore);
            }
            let mut point = spectrum.position(r.width, hsv);
            if rtl {
                point[0] = r.width - point[0];
            }
            let size = if spectrum_state == ControlState::Pressed && touch {
                48.
            } else {
                16.
            };
            let mut displayed = hsv;
            if matches!(
                q.color_spectrum_components,
                ColorSpectrumComponents::HueSaturation | ColorSpectrumComponents::SaturationHue
            ) {
                displayed.v = 1.;
            }
            let rgb = displayed.rgba().map(|v| (v * 255.).round());
            let linear = |v: f64| {
                if v <= 10. {
                    v / 3294.
                } else {
                    (v / 269. + 0.0513).powf(2.4)
                }
            };
            let light =
                0.2126 * linear(rgb[0]) + 0.7152 * linear(rgb[1]) + 0.0722 * linear(rgb[2]) <= 0.5;
            if spectrum_state == ControlState::PointerOver {
                out.push(Draw::Layer { opacity: 0.8 });
            }
            out.push(Draw::Stroke {
                rect: Rect::new(
                    r.x + point[0] - size / 2. + 1.,
                    r.y + point[1] - size / 2. + 1.,
                    size - 2.,
                    size - 2.,
                ),
                radius: (size - 2.) / 2.,
                width: 2.,
                color: if light { "#ffffff" } else { "#000000" }.into(),
            });
            if spectrum_state == ControlState::PointerOver {
                out.push(Draw::EndLayer);
            }
            out.push(Draw::Restore);
            let border = color(theme, "ColorPickerBorderBrush");
            out.push(Draw::Stroke {
                rect: Rect::new(
                    r.x + 1.,
                    r.y + 1.,
                    (r.width - 2.).max(0.),
                    (r.height - 2.).max(0.),
                ),
                radius: if q.color_spectrum_shape == ColorSpectrumShape::Ring {
                    r.width / 2.
                } else {
                    self.nodes[&id].props.corner_radius
                },
                width: 2.,
                color: border,
            });
        }
        if q.is_color_preview_visible && preview.width > 0. {
            out.push(Draw::RoundedClip {
                rect: preview,
                radius: self.nodes[&id].props.corner_radius,
            });
            out.push(self.picker_checker(id, 10, preview, theme));
            out.push(Draw::Fill {
                rect: preview,
                radius: 0.,
                color: q.color.clone(),
            });
            if let Some(previous) = q.previous_color.clone() {
                out.push(Draw::Fill {
                    rect: if q.is_color_spectrum_visible {
                        Rect::new(
                            preview.x,
                            preview.y + preview.height / 2.,
                            preview.width,
                            preview.height / 2.,
                        )
                    } else {
                        Rect::new(
                            preview.x + preview.width / 2.,
                            preview.y,
                            preview.width / 2.,
                            preview.height,
                        )
                    },
                    radius: 0.,
                    color: previous,
                });
            }
            out.push(Draw::Restore);
            out.push(Draw::Stroke {
                rect: Rect::new(
                    preview.x + 0.5,
                    preview.y + 0.5,
                    preview.width - 1.,
                    preview.height - 1.,
                ),
                radius: self.nodes[&id].props.corner_radius,
                width: 1.,
                color: color(theme, "ColorPickerBorderBrush"),
            });
        }
        for (role, visible) in [
            ("ThirdDimensionSlider", q.is_color_slider_visible),
            (
                "AlphaSlider",
                q.is_alpha_enabled && q.is_alpha_slider_visible,
            ),
        ] {
            if !visible {
                continue;
            }
            let slider = self.nodes[&id].picker.parts[role];
            let n = &self.nodes[&slider];
            let rect = n.rect;
            let vertical = n.props.orientation == Orientation::Vertical;
            let geometry = self.slider_geometry(slider);
            let key = if !n.enabled {
                "Disabled"
            } else if n.button.pressed {
                "Pressed"
            } else if n.button.pointer_inside {
                "PointerOver"
            } else {
                ""
            };
            let key = key.to_string();
            let channel = Self::third_dimension(&q, hsv).0;
            let gradient_rect = if vertical {
                Rect::new(rect.x + (rect.width - 12.) / 2., rect.y, 12., rect.height)
            } else {
                Rect::new(rect.x, rect.y + (rect.height - 12.) / 2., rect.width, 12.)
            };
            let mut stops = vec![];
            let stop = |offset: f64, c: Hsv| GradientStop {
                offset,
                color: c.css(),
            };
            if role == "AlphaSlider" {
                out.push(Draw::RoundedClip {
                    rect: gradient_rect,
                    radius: 6.,
                });
                out.push(self.picker_checker(id, 11, gradient_rect, theme));
                out.push(Draw::Restore);
                stops.push(stop(0., Hsv { a: 0., ..hsv }));
                stops.push(stop(1., Hsv { a: 1., ..hsv }));
            } else if channel == "hue" {
                stops.push(stop(
                    0.,
                    Hsv {
                        h: q.min_hue,
                        s: 1.,
                        v: 1.,
                        a: 1.,
                    },
                ));
                if q.max_hue > q.min_hue {
                    let min = q.min_hue / 359.;
                    let max = q.max_hue / 359.;
                    for sextant in 1..=5 {
                        let at = sextant as f64 / 6.;
                        if at > min && at < max {
                            stops.push(stop(
                                (at - min) / (max - min),
                                Hsv {
                                    h: sextant as f64 * 60.,
                                    s: 1.,
                                    v: 1.,
                                    a: 1.,
                                },
                            ));
                        }
                    }
                }
                stops.push(stop(
                    1.,
                    Hsv {
                        h: q.max_hue,
                        s: 1.,
                        v: 1.,
                        a: 1.,
                    },
                ));
            } else {
                let a = if channel == "saturation" {
                    Hsv {
                        s: q.min_saturation / 100.,
                        v: 1.,
                        a: 1.,
                        ..hsv
                    }
                } else {
                    Hsv {
                        v: q.min_value / 100.,
                        a: 1.,
                        ..hsv
                    }
                };
                let b = if channel == "saturation" {
                    Hsv {
                        s: q.max_saturation / 100.,
                        v: 1.,
                        a: 1.,
                        ..hsv
                    }
                } else {
                    Hsv {
                        v: q.max_value / 100.,
                        a: 1.,
                        ..hsv
                    }
                };
                stops.push(stop(0., a));
                stops.push(stop(1., b));
            }
            let gradient:Brush=serde_json::from_value(json!({"kind":"linearGradient","from":if vertical{[0,1]}else{[0,0]},"to":if vertical{[0,0]}else{[1,0]},"opacity":1,"stops":stops})).unwrap();
            Self::brush_command(out, gradient_rect, 6., 0., &gradient);
            let thumb = Rect::new(
                rect.x + geometry.thumb.x,
                rect.y + geometry.thumb.y,
                geometry.thumb.width,
                geometry.thumb.height,
            );
            out.push(Draw::Fill {
                rect: thumb,
                radius: 8.,
                color: overlays::brush(theme, "SliderOuterThumbBackground").solid_color(),
            });
            Self::brush_command(
                out,
                thumb,
                8.,
                overlays::border_thickness([1.; 4], self.dpr)[0],
                &overlays::brush(theme, "SliderThumbBorderBrush"),
            );
            let inner = (scalar("ColorPickerSliderInnerThumbWidth") * self.dpr).ceil() / self.dpr;
            out.push(Draw::Ellipse {
                rect: Rect::new(
                    thumb.x + (thumb.width - inner) / 2.,
                    thumb.y + (thumb.height - inner) / 2.,
                    inner,
                    inner,
                ),
                color: color(theme, &format!("ColorPickerSliderThumbBackground{key}")),
            });
        }
        if q.is_more_button_visible && self.nodes[&id].props.orientation == Orientation::Vertical {
            let part = self.nodes[&id].picker.parts["MoreButton"];
            let n = &self.nodes[&part];
            let r = n.rect;
            let foreground = color(
                theme,
                if !n.enabled || n.button.pressed {
                    "SystemBaseMediumLowColor"
                } else if n.button.pointer_inside {
                    "SystemBaseMediumColor"
                } else {
                    "SystemBaseHighColor"
                },
            );
            text(
                out,
                &n.text,
                &n.props.font(),
                &foreground,
                Rect::new(
                    r.x + r.width - 21. - n.text.width,
                    r.y + 5.6,
                    n.text.width,
                    n.text.height,
                ),
                false,
            );
        }
    }
}
