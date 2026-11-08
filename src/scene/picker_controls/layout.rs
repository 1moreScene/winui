use super::*;
use crate::typography::{self, Font};
fn ceil(v: f64, dpr: f64) -> f64 {
    (v * dpr - 1e-8).ceil() / dpr
}
fn round(v: f64, dpr: f64) -> f64 {
    (v * dpr).round_ties_even() / dpr
}

impl Scene {
    pub(in crate::scene) fn picker_popup_placement(
        &self,
        id: u32,
        size: [f64; 2],
    ) -> Option<(Rect, OverlayPlacement)> {
        let popup = &self.nodes[&id];
        if popup.picker.role != "Popup" {
            return None;
        }
        let owner = popup.picker.owner?;
        let root = &self.nodes[&owner];
        let input = &self.nodes[&root.picker.parts["InputButton"]];
        let target = input
            .world
            .bounds(Rect::new(0., 0., input.rect.width, input.rect.height));
        let bounds = self
            .popup_viewport
            .unwrap_or(Rect::new(0., 0., self.width, self.height));
        let width = size[0].min(bounds.width);
        let height = size[1].min(bounds.height);
        let (x, y) = if root.kind == NodeKind::CalendarDatePicker {
            let y = target.y + target.height + 4.;
            (
                target.x + (target.width - width) / 2.,
                if y + height <= bounds.y + bounds.height {
                    y
                } else {
                    target.y - height - 4.
                },
            )
        } else {
            let b = overlays::border_thickness([1.; 4], self.dpr)[0];
            let host = height - 2. * b - round(41., self.dpr);
            (
                target.x,
                ((target.y + target.height / 2. - b - host / 2.) * self.dpr).floor() / self.dpr,
            )
        };
        Some((
            Rect::new(
                x.clamp(bounds.x, (bounds.x + bounds.width - width).max(bounds.x)),
                y.clamp(bounds.y, (bounds.y + bounds.height - height).max(bounds.y)),
                width,
                height,
            ),
            OverlayPlacement::Bottom,
        ))
    }
    fn picker_text_part(&mut self, id: u32, key: &str, text: String, font: &Font, visible: bool) {
        self.patch_part(id,key,json!({"text":text,"fontFamily":font.family,"fontSize":font.size,"fontWeight":font.weight,"visible":visible}));
    }
    fn measure_picker_parts(&mut self, id: u32, measure: &mut impl TextMeasurer) {
        for child in self.nodes[&id].children.clone() {
            if !overlays::is_overlay(self.nodes[&child].kind) {
                self.measure_node(child, [f64::INFINITY; 2], measure);
            }
        }
    }
    fn picker_header_height(&self, id: u32) -> f64 {
        let n = &self.nodes[&id];
        if n.props.header.is_empty() {
            0.
        } else {
            ceil(n.header_text.height, self.dpr)
                + if n.kind == NodeKind::CalendarDatePicker {
                    8.
                } else {
                    4.
                }
        }
    }
    fn picker_editor_height(&mut self, id: u32, measure: &mut impl TextMeasurer) -> f64 {
        let part = self.nodes[&id].picker.parts["HexTextBox"];
        let mut p = self.nodes[&part].props.clone();
        p.height = None;
        p.min_height = super::text_edit::native_defaults().min_height;
        self.nodes.get_mut(&part).unwrap().editor.layout(
            NodeKind::TextBox,
            &p,
            (120., None),
            false,
            0.,
            self.dpr,
            measure,
        )[1]
    }
    fn color_slider_thickness(&self) -> f64 {
        round(scalar("SliderPreContentMargin"), self.dpr)
            + round(scalar("SliderTrackThemeHeight"), self.dpr)
            + round(scalar("SliderPostContentMargin"), self.dpr)
    }
    pub(in crate::scene) fn measure_picker(
        &mut self,
        id: u32,
        available: [f64; 2],
        measure: &mut impl TextMeasurer,
    ) -> [f64; 2] {
        if self.is_picker_surface(id) {
            self.measure_picker_parts(id, measure);
            return [
                available[0],
                (398. * self.dpr).floor() / self.dpr
                    - 2. * overlays::border_thickness([1.; 4], self.dpr)[0],
            ];
        }
        let p = self.nodes[&id].props.clone();
        let kind = self.nodes[&id].kind;
        let q = p.picker_controls.as_deref().unwrap().clone();
        let font = p.font();
        if kind != NodeKind::CalendarView {
            self.picker_text_part(id, "Header", p.header.clone(), &font, !p.header.is_empty());
        }
        if kind == NodeKind::CalendarView {
            for i in 0..7 {
                self.patch_part(id,&format!("WeekDay{i}"),json!({"text":q.calendar_locale.weekdays[(i+q.first_day_of_week as usize)%7],"visible":q.display_mode==CalendarViewDisplayMode::Month}));
            }
            self.measure_picker_parts(id, measure);
            let day = style_number("CalendarViewDayItem", "MinHeight");
            let cell = ceil(day + 2., self.dpr);
            let b = overlays::border_thickness([1.; 4], self.dpr)[0];
            let header = self.nodes[&self.nodes[&id].picker.parts["HeaderButton"]].desired[1]
                + round(6., self.dpr)
                + round(7., self.dpr);
            self.nodes.get_mut(&id).unwrap().picker.cell = cell;
            return [
                ceil(cell * 7. + 4. + 2. * b, self.dpr),
                ceil(
                    2. * b + header + cell * (q.number_of_weeks + 1) as f64 + 6.,
                    self.dpr,
                ),
            ];
        }
        if matches!(
            kind,
            NodeKind::DatePicker | NodeKind::TimePicker | NodeKind::CalendarDatePicker
        ) {
            let texts = self.picker_face_texts(id);
            let fields = texts.len();
            for i in 0..3 {
                self.picker_text_part(
                    id,
                    &format!("Field{i}"),
                    texts.get(i).cloned().unwrap_or_default(),
                    &font,
                    i < fields,
                );
            }
            self.measure_picker_parts(id, measure);
            let header = self.picker_header_height(id);
            if kind == NodeKind::CalendarDatePicker {
                let width = typography::layout(
                    &texts[0],
                    &font,
                    f64::INFINITY,
                    false,
                    TextTrimming::None,
                    None,
                    measure,
                )
                .width;
                return [ceil(width + 12. + 32., self.dpr), header + 32.];
            }
            let b = overlays::border_thickness([1.; 4], self.dpr)[0];
            let text = typography::layout(
                "0123456789",
                &font,
                f64::INFINITY,
                false,
                TextTrimming::None,
                None,
                measure,
            );
            let body = ceil(text.height + 3. + 6. + 2. * b, self.dpr);
            return [
                ceil(
                    scalar(if kind == NodeKind::DatePicker {
                        "DatePickerThemeMinWidth"
                    } else {
                        "TimePickerThemeMinWidth"
                    }),
                    self.dpr,
                ),
                header + body,
            ];
        }
        self.measure_picker_parts(id, measure);
        let horizontal = p.orientation == Orientation::Horizontal;
        let fields = p.orientation == Orientation::Horizontal
            || !q.is_more_button_visible
            || self.nodes[&id].picker.more_expanded;
        let editor = self.picker_editor_height(id, measure);
        let slider = self.color_slider_thickness();
        let gap = round(12., self.dpr);
        let small = round(6., self.dpr);
        let rows = usize::from(q.is_color_channel_text_input_visible) * 3
            + usize::from(q.is_alpha_enabled && q.is_alpha_text_input_visible);
        if horizontal {
            let labels = ceil(
                scalar("ColorPickerTextInputHorizontalOrientationMargin"),
                self.dpr,
            );
            let entries = if fields
                && (q.is_hex_input_visible
                    || q.is_color_channel_text_input_visible
                    || q.is_alpha_enabled && q.is_alpha_text_input_visible)
            {
                120. + round(8., self.dpr) + labels
            } else if q.is_more_button_visible && !horizontal {
                120.
            } else {
                0.
            };
            let mut width = 256.
                + if q.is_color_preview_visible {
                    gap + 44.
                } else {
                    0.
                };
            if entries > 0.
                || q.is_color_slider_visible
                || q.is_alpha_enabled && q.is_alpha_slider_visible
            {
                width += round(16., self.dpr);
            }
            if q.is_color_slider_visible {
                width += slider + small;
            }
            if q.is_alpha_enabled && q.is_alpha_slider_visible {
                width += slider + round(16., self.dpr);
            }
            width += entries;
            return [
                ceil(width, self.dpr),
                scalar("ColorPickerVerticalOrientationMinHeight"),
            ];
        }
        let width = p
            .width
            .unwrap_or(scalar("ColorPickerVerticalOrientationMinWidth"))
            .min(scalar("ColorPickerVerticalOrientationMaxWidth"))
            .max(scalar("ColorPickerVerticalOrientationMinWidth"));
        let spectrum = if q.is_color_spectrum_visible {
            width
                - if q.is_color_preview_visible {
                    gap + 44.
                } else {
                    0.
                }
        } else {
            0.
        };
        let mut height = round(4., self.dpr);
        if q.is_color_spectrum_visible || q.is_color_preview_visible {
            height += spectrum.max(if q.is_color_preview_visible { 44. } else { 0. })
                + round(16., self.dpr);
        }
        if q.is_color_slider_visible {
            height += slider + small;
        }
        if q.is_alpha_enabled && q.is_alpha_slider_visible {
            height += slider + round(16., self.dpr);
        }
        if fields {
            let top = q.is_color_channel_text_input_visible || q.is_hex_input_visible;
            if top {
                height += editor.max(if q.is_color_channel_text_input_visible {
                    32.
                } else {
                    0.
                });
            }
            if rows > 0 {
                height += rows as f64 * (gap + editor);
            }
        }
        if q.is_more_button_visible && !horizontal {
            height += editor;
        }
        height += gap + round(4., self.dpr);
        [width, ceil(height, self.dpr)]
    }
    fn arrange_picker_part(
        &mut self,
        owner: u32,
        key: &str,
        r: Rect,
        measure: &mut impl TextMeasurer,
    ) {
        let Some(&child) = self.nodes[&owner].picker.parts.get(key) else {
            return;
        };
        let n = self.nodes.get_mut(&child).unwrap();
        let constraints = (
            n.props.width,
            n.props.height,
            n.props.min_width,
            n.props.min_height,
            n.props.margin,
            n.props.horizontal_alignment,
            n.props.vertical_alignment,
        );
        n.props.width = Some(r.width.max(0.));
        n.props.height = Some(r.height.max(0.));
        n.props.min_width = 0.;
        n.props.min_height = 0.;
        n.props.margin = [0.; 4];
        n.props.horizontal_alignment = HorizontalAlignment::Left;
        n.props.vertical_alignment = VerticalAlignment::Top;
        let parent = n.parent.unwrap();
        let n = &self.nodes[&parent];
        let inherited = (n.theme, n.enabled, n.visible);
        let world = n.world;
        self.arrange_node(child, r, world, inherited, measure);
        let p = &mut self.nodes.get_mut(&child).unwrap().props;
        (
            p.width,
            p.height,
            p.min_width,
            p.min_height,
            p.margin,
            p.horizontal_alignment,
            p.vertical_alignment,
        ) = constraints;
    }
    pub(in crate::scene) fn arrange_picker(&mut self, id: u32, measure: &mut impl TextMeasurer) {
        if self.is_picker_surface(id) {
            self.arrange_picker_wheels(id, measure);
            return;
        }
        let node = &self.nodes[&id];
        let kind = node.kind;
        let p = node.props.clone();
        let q = p.picker_controls.as_deref().unwrap().clone();
        let r = Rect::new(0., 0., node.rect.width, node.rect.height);
        if kind == NodeKind::CalendarView {
            self.arrange_calendar(id, measure);
            return;
        }
        let header = self.picker_header_height(id);
        if header > 0. {
            self.arrange_picker_part(
                id,
                "Header",
                Rect::new(
                    0.,
                    0.,
                    r.width,
                    header
                        - if kind == NodeKind::CalendarDatePicker {
                            8.
                        } else {
                            4.
                        },
                ),
                measure,
            );
        }
        if matches!(
            kind,
            NodeKind::CalendarDatePicker | NodeKind::DatePicker | NodeKind::TimePicker
        ) {
            let body = Rect::new(0., header, r.width, (r.height - header).max(0.));
            self.nodes.get_mut(&id).unwrap().picker.body = body;
            self.arrange_picker_part(id, "InputButton", body, measure);
            let b = overlays::border_thickness([1.; 4], self.dpr)[0];
            if kind == NodeKind::CalendarDatePicker {
                self.patch_part(
                    id,
                    "Field0",
                    json!({"verticalAlignment":"Center","padding":[0,0,0,0]}),
                );
                let h = self.nodes[&self.nodes[&id].picker.parts["Field0"]]
                    .text
                    .height;
                self.arrange_picker_part(
                    id,
                    "Field0",
                    Rect::new(
                        12.,
                        body.y + round((body.height - h - 2.) / 2., self.dpr),
                        (body.width - 44.).max(0.),
                        ceil(h, self.dpr),
                    ),
                    measure,
                );
                self.arrange_picker_part(
                    id,
                    "CalendarGlyph",
                    Rect::new(body.width - 32., body.y, 32., body.height),
                    measure,
                );
            } else {
                let labels = self.picker_face_texts(id);
                let fields = labels.len();
                let mut x = b;
                let mut dividers = Vec::new();
                let widths = if kind == NodeKind::DatePicker {
                    let order = self.date_fields(&q);
                    let fixed = 80. - b;
                    order
                        .iter()
                        .map(|v| {
                            if v == "month" {
                                (body.width
                                    - b * (fields + 1) as f64
                                    - fixed * fields.saturating_sub(1) as f64)
                                    .max(0.)
                            } else {
                                fixed
                            }
                        })
                        .collect::<Vec<_>>()
                } else {
                    let inner = body.width - b * (fields + 1) as f64;
                    (0..fields)
                        .map(|i| {
                            round(inner * (i + 1) as f64 / fields as f64, self.dpr)
                                - round(inner * i as f64 / fields as f64, self.dpr)
                        })
                        .collect::<Vec<_>>()
                };
                for (i, width) in widths.iter().enumerate() {
                    if i > 0 {
                        dividers.push(x - b);
                    }
                    let key = format!("Field{i}");
                    let month = kind == NodeKind::DatePicker && self.date_fields(&q)[i] == "month";
                    self.patch_part(id, &key, json!({"padding":[0,0,0,0]}));
                    let h = self.nodes[&self.nodes[&id].picker.parts[&key]].text.height;
                    let natural = ceil(
                        self.nodes[&self.nodes[&id].picker.parts[&key]].text.width,
                        self.dpr,
                    );
                    let left = if month {
                        round(9., self.dpr) + round(1., self.dpr)
                    } else {
                        round((width - natural) / 2., self.dpr)
                    };
                    self.arrange_picker_part(
                        id,
                        &key,
                        Rect::new(
                            x + left,
                            body.y + b + round(3., self.dpr),
                            natural.min((width - left).max(0.)),
                            ceil(h, self.dpr),
                        ),
                        measure,
                    );
                    x += width + b;
                }
                self.nodes.get_mut(&id).unwrap().picker.face_dividers = dividers;
            }
            return;
        }
        self.arrange_color_picker(id, measure);
    }
    pub(super) fn date_fields(&self, q: &PickerProperties) -> Vec<String> {
        q.format_locale
            .date_order
            .iter()
            .filter(|v| match v.as_str() {
                "year" => q.year_visible,
                "month" => q.month_visible,
                "day" => q.day_visible,
                _ => false,
            })
            .cloned()
            .collect()
    }
    pub(super) fn time_fields(&self, q: &PickerProperties) -> Vec<String> {
        q.format_locale
            .time_order
            .iter()
            .filter(|v| v.as_str() != "period" || q.clock_identifier == ClockIdentifier::TwelveHour)
            .cloned()
            .collect()
    }
    fn picker_face_texts(&self, id: u32) -> Vec<String> {
        let n = &self.nodes[&id];
        let q = n.props.picker_controls.as_deref().unwrap();
        if n.kind == NodeKind::CalendarDatePicker {
            return vec![q
                .date
                .as_deref()
                .map(|v| {
                    let d = Date::parse(v).unwrap();
                    q.format_locale
                        .date_order
                        .iter()
                        .map(|part| {
                            q.format_locale.number(match part.as_str() {
                                "year" => d.year,
                                "month" => d.month as i32,
                                _ => d.day as i32,
                            })
                        })
                        .collect::<Vec<_>>()
                        .join(&q.format_locale.date_separator)
                })
                .unwrap_or_else(|| n.props.placeholder_text.clone())];
        }
        if n.kind == NodeKind::DatePicker {
            return self
                .date_fields(q)
                .iter()
                .map(|part| {
                    let Some(d) = q.date.as_deref().and_then(|v| Date::parse(v).ok()) else {
                        return q.format_locale.label(part);
                    };
                    match part.as_str() {
                        "year" => format!(
                            "{}{}",
                            q.format_locale.number(d.year),
                            q.format_locale.year_suffix
                        ),
                        "month" => q.format_locale.months[d.month as usize - 1].clone(),
                        _ => q.format_day(d),
                    }
                })
                .collect();
        }
        self.time_fields(q)
            .iter()
            .map(|part| {
                let Some(time) = q.time else {
                    return if part == "period" {
                        q.format_locale.periods[0].clone()
                    } else {
                        q.format_locale.label(part)
                    };
                };
                match part.as_str() {
                    "period" => q.format_locale.periods[usize::from(time >= 720)].clone(),
                    "hour" => q.format_locale.number(if q.clock_identifier
                        == ClockIdentifier::TwelveHour
                    {
                        let h = time / 60 % 12;
                        if h == 0 {
                            12
                        } else {
                            h
                        }
                    } else {
                        time / 60
                    } as i32),
                    _ => {
                        let value = time % 60;
                        let text = q.format_locale.number(value as i32);
                        if value < 10 {
                            format!("{}{text}", q.format_locale.digits[0])
                        } else {
                            text
                        }
                    }
                }
            })
            .collect()
    }
    fn arrange_calendar(&mut self, id: u32, measure: &mut impl TextMeasurer) {
        let n = &self.nodes[&id];
        let p = n.props.clone();
        let q = p.picker_controls.as_deref().unwrap().clone();
        let width = n.rect.width;
        let height = n.rect.height;
        let b = overlays::border_thickness([1.; 4], self.dpr)[0];
        let parts = n.picker.parts.clone();
        let date = n
            .picker
            .date
            .unwrap_or_else(|| q.day())
            .clamp(q.bounds().0, q.bounds().1);
        let focus_date = self.nodes[&id].picker.focus_date.unwrap_or(date);
        let header_h = self.nodes[&parts["HeaderButton"]].desired[1];
        let header_band = header_h + round(6., self.dpr) + round(7., self.dpr);
        let button_w = ceil(32., self.dpr) + 2. * b;
        let prev_total = button_w + 2. * round(3., self.dpr);
        let next_total = button_w + round(3., self.dpr) + round(7., self.dpr);
        let header_total = (width - 2. * b - prev_total - next_total).max(0.);
        self.arrange_picker_part(
            id,
            "HeaderButton",
            Rect::new(
                b + round(7., self.dpr),
                b + round(6., self.dpr),
                (header_total - round(7., self.dpr) - round(3., self.dpr)).max(0.),
                header_h,
            ),
            measure,
        );
        self.arrange_picker_part(
            id,
            "PreviousButton",
            Rect::new(
                b + header_total + round(3., self.dpr),
                b + round(6., self.dpr),
                button_w,
                header_h,
            ),
            measure,
        );
        self.arrange_picker_part(
            id,
            "NextButton",
            Rect::new(
                b + header_total + prev_total + round(3., self.dpr),
                b + round(6., self.dpr),
                button_w,
                header_h,
            ),
            measure,
        );
        let month = q.display_mode == CalendarViewDisplayMode::Month;
        let columns = if month { 7 } else { q.year_columns };
        let rows = if month {
            q.number_of_weeks
        } else {
            q.year_rows
        };
        let cell = self.nodes[&id].picker.cell;
        let x = b + ceil(2., self.dpr);
        let y = if month {
            b + header_band + cell + 4.
        } else {
            b + header_band + 2.
        };
        let grid_width = (width - 2. * b - 4.).max(0.);
        let grid_height = if month {
            rows as f64 * cell
        } else {
            (height - y - b - 2.).max(0.)
        };
        let cw = grid_width / columns as f64;
        let ch = grid_height / rows as f64;
        let grid = Rect::new(x, y, grid_width, grid_height);
        self.nodes.get_mut(&id).unwrap().picker.calendar_grid = grid;
        for i in 0..7 {
            if month {
                let key = format!("WeekDay{i}");
                let part = &self.nodes[&self.nodes[&id].picker.parts[&key]];
                let natural = part.text.width + 24.;
                let offset = if natural > grid_width / 7. - 2. {
                    round(1., self.dpr)
                } else {
                    round((grid_width / 7. - natural) / 2., self.dpr)
                };
                self.arrange_picker_part(
                    id,
                    &key,
                    Rect::new(
                        x + i as f64 * grid_width / 7. + offset,
                        b + header_band + ceil(2., self.dpr) + round(1., self.dpr),
                        natural,
                        part.text.height + 24.,
                    ),
                    measure,
                );
            }
        }
        let count = columns * rows;
        let current_count = self.nodes[&id]
            .picker
            .parts
            .keys()
            .filter(|k| k.starts_with("Day"))
            .count();
        for i in current_count..count {
            self.picker_part(
                id,
                id,
                &format!("GroupLabel{i}"),
                NodeKind::TextBlock,
                json!({"fontSize":8,"isTabStop":false,"visible":false}),
            )
            .expect("calendar capacity checked");
            self.picker_part(id,id,&format!("Day{i}"),NodeKind::Button,json!({"padding":[0,0,0,0],"minWidth":0,"minHeight":0,"background":"#00000000","foreground":"#00000000","borderBrush":"#00000000","isTabStop":false})).expect("calendar capacity checked");
        }
        let start = Self::calendar_first_date(&q, date);
        let first = start.ordinal();
        let today = q.today();
        let (min, max) = q.bounds();
        let mut cells = Vec::new();
        for i in 0..count {
            let (d, text, out) = if month {
                let d = Date::from_ordinal(first + i as i32);
                (
                    d,
                    q.calendar_locale.number(d.day as i32),
                    d.month != date.month,
                )
            } else if q.display_mode == CalendarViewDisplayMode::Year {
                let d = start.add_months(i as i32);
                (
                    d,
                    q.calendar_locale.short_months[d.month as usize - 1].clone(),
                    d.year != date.year,
                )
            } else {
                let y = (start.year + i as i32).max(1);
                let d = Date {
                    year: y.min(9999),
                    month: 1,
                    day: 1,
                };
                (
                    d,
                    q.calendar_locale.number(d.year),
                    d.year / 10 != date.year / 10,
                )
            };
            let is_today = if month {
                d == today
            } else if q.display_mode == CalendarViewDisplayMode::Year {
                d.year == today.year && d.month == today.month
            } else {
                d.year == today.year
            };
            let blackout = q.blackout_dates.contains(&d.iso());
            let selected = month && q.selected_dates.contains(&d.iso());
            let visible =
                d >= min && d <= max || !month && d.year >= min.year && d.year <= max.year;
            let key = format!("Day{i}");
            let child = self.nodes[&id].picker.parts[&key];
            let focused_item = if month {
                d == focus_date
            } else if q.display_mode == CalendarViewDisplayMode::Year {
                d.year == focus_date.year && d.month == focus_date.month
            } else {
                d.year == focus_date.year
            };
            self.patch_part(id,&key,json!({"text":text,"fontSize":14,"fontFamily":p.font_family,"visible":visible,"enabled":!blackout&&visible,"isTabStop":focused_item,"accessibleName":d.iso()}));
            self.measure_node(child, [cw, ch], measure);
            let rect = if month {
                Rect::new(
                    x + (i % columns) as f64 * cw + round(1., self.dpr),
                    y + (i / columns) as f64 * ch + round(1., self.dpr),
                    round((cw - 2.).max(0.), self.dpr),
                    round((ch - 2.).max(0.), self.dpr),
                )
            } else {
                Rect::new(
                    x + (i % columns) as f64 * cw + 1.,
                    y + (i / columns) as f64 * ch + 1.,
                    (cw - 2.).max(0.),
                    (ch - 2.).max(0.),
                )
            };
            self.arrange_picker_part(id, &key, rect, measure);
            let group_key = format!("GroupLabel{i}");
            let group_visible = visible
                && q.is_group_label_visible
                && if month {
                    d.day == 1
                } else {
                    q.display_mode == CalendarViewDisplayMode::Year && d.month == 1
                };
            let label = if month {
                q.calendar_locale.short_months[d.month as usize - 1].clone()
            } else {
                q.calendar_locale.number(d.year)
            };
            self.patch_part(id,&group_key,json!({"text":label,"visible":group_visible,"fontFamily":p.font_family,"fontSize":8}));
            if group_visible {
                let label_id = self.nodes[&id].picker.parts[&group_key];
                self.measure_node(label_id, [f64::INFINITY; 2], measure);
                let layout = &self.nodes[&label_id].text;
                let label_rect = Rect::new(
                    rect.x + (rect.width - layout.width) / 2.,
                    rect.y + round(if month { 2. } else { 9. }, self.dpr),
                    layout.width,
                    ceil(layout.height, self.dpr),
                );
                self.arrange_picker_part(id, &group_key, label_rect, measure);
            }
            if self.nodes[&id].picker.pending_focus == Some(d) {
                self.focus(Some(child));
                self.nodes.get_mut(&id).unwrap().picker.pending_focus = None;
            }
            cells.push(CalendarCell {
                node: child,
                date: d.iso(),
                text,
                bounds: rect,
                out_of_scope: out,
                blackout,
                selected,
                today: is_today && q.is_today_highlighted,
            });
        }
        for i in count..current_count {
            self.patch_part(id, &format!("Day{i}"), json!({"visible":false}));
            self.patch_part(id, &format!("GroupLabel{i}"), json!({"visible":false}));
        }
        let old_dates = self.nodes[&id]
            .picker
            .cells
            .iter()
            .map(|c| c.date.clone())
            .collect::<Vec<_>>();
        self.nodes.get_mut(&id).unwrap().picker.cells = cells;
        for c in self.nodes[&id].picker.cells.clone() {
            if !old_dates.contains(&c.date) {
                self.emit_composed(
                    id,
                    EventKind::CalendarDayItemChanging,
                    json!({"date":c.date,"phase":0,"isBlackout":c.blackout,"inRecycleQueue":false}),
                );
            }
        }
    }
    fn arrange_color_picker(&mut self, id: u32, measure: &mut impl TextMeasurer) {
        let n = &self.nodes[&id];
        let p = n.props.clone();
        let q = p.picker_controls.as_deref().unwrap().clone();
        let horizontal = p.orientation == Orientation::Horizontal;
        let fields = horizontal || !q.is_more_button_visible || n.picker.more_expanded;
        let width = n.rect.width;
        let editor = self.picker_editor_height(id, measure);
        let slider = self.color_slider_thickness();
        let gap = round(12., self.dpr);
        let small = round(6., self.dpr);
        let padding = round(4., self.dpr);
        let body_width = if horizontal {
            width
        } else {
            width.min(scalar("ColorPickerVerticalOrientationMaxWidth"))
        };
        let origin = (width - body_width) / 2.;
        let side = if horizontal {
            256.
        } else {
            (body_width
                - if q.is_color_preview_visible {
                    gap + 44.
                } else {
                    0.
                })
            .clamp(0., 392.)
        };
        let spectrum = Rect::new(
            origin,
            padding,
            if q.is_color_spectrum_visible {
                side
            } else {
                0.
            },
            if q.is_color_spectrum_visible {
                side
            } else {
                0.
            },
        );
        let preview = if q.is_color_spectrum_visible {
            Rect::new(origin + side + gap, padding, 44., side)
        } else {
            Rect::new(origin, padding, body_width, 44.)
        };
        {
            let state = &mut self.nodes.get_mut(&id).unwrap().picker;
            state.spectrum = spectrum;
            state.preview = preview;
        }
        self.arrange_picker_part(id, "Spectrum", spectrum, measure);
        if q.previous_color.is_some() {
            self.arrange_picker_part(
                id,
                "PreviousColor",
                if q.is_color_spectrum_visible {
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
                measure,
            );
        }
        let mut x = origin;
        let mut y = padding;
        if horizontal {
            x +=
                side + if q.is_color_preview_visible {
                    gap + 44.
                } else {
                    0.
                } + round(16., self.dpr);
        } else if q.is_color_spectrum_visible || q.is_color_preview_visible {
            y += if q.is_color_spectrum_visible {
                side
            } else {
                44.
            } + round(16., self.dpr);
        }
        for (role, visible, margin) in [
            ("ThirdDimensionSlider", q.is_color_slider_visible, small),
            (
                "AlphaSlider",
                q.is_alpha_enabled && q.is_alpha_slider_visible,
                round(16., self.dpr),
            ),
        ] {
            if visible {
                let rect = if horizontal {
                    Rect::new(x, y, slider, side)
                } else {
                    Rect::new(x, y, body_width, slider)
                };
                self.arrange_picker_part(id, role, rect, measure);
                if horizontal {
                    x += slider + margin;
                } else {
                    y += slider + margin;
                }
            }
        }
        if fields {
            if horizontal {
                if q.is_hex_input_visible {
                    self.arrange_picker_part(
                        id,
                        "HexTextBox",
                        Rect::new(x, y, 120., editor),
                        measure,
                    );
                    y += editor + gap;
                }
                if q.is_color_channel_text_input_visible {
                    self.arrange_picker_part(
                        id,
                        "Representation",
                        Rect::new(x, y, 120., 32.),
                        measure,
                    );
                    y += 32. + gap;
                }
            } else {
                if q.is_hex_input_visible {
                    self.arrange_picker_part(
                        id,
                        "HexTextBox",
                        Rect::new(origin + body_width - 132., y, 132., editor),
                        measure,
                    );
                }
                if q.is_color_channel_text_input_visible {
                    self.arrange_picker_part(
                        id,
                        "Representation",
                        Rect::new(origin, y, 120., 32.),
                        measure,
                    );
                }
                if q.is_hex_input_visible || q.is_color_channel_text_input_visible {
                    y += editor + gap;
                }
            }
            let rgba = q.color_representation == ColorRepresentation::Rgb;
            for i in 0..4 {
                let visible = if i < 3 {
                    q.is_color_channel_text_input_visible
                } else {
                    q.is_alpha_enabled && q.is_alpha_text_input_visible
                };
                let label = if i < 3 {
                    if rgba {
                        ["red", "green", "blue"][i]
                    } else {
                        ["hue", "saturation", "value"][i]
                    }
                } else {
                    "alpha"
                };
                let label_key = if i < 3 {
                    format!("ChannelLabel{i}")
                } else {
                    "AlphaLabel".into()
                };
                self.picker_text_part(
                    id,
                    &label_key,
                    q.format_locale.label(label),
                    &p.font(),
                    visible && fields,
                );
                if visible {
                    let input_key = if i < 3 {
                        format!("Channel{i}")
                    } else {
                        "AlphaTextBox".into()
                    };
                    self.arrange_picker_part(
                        id,
                        &input_key,
                        Rect::new(x, y, 120., editor),
                        measure,
                    );
                    let label_id = self.nodes[&id].picker.parts[&label_key];
                    self.measure_node(label_id, [f64::INFINITY; 2], measure);
                    let h = self.nodes[&label_id].text.height;
                    self.arrange_picker_part(
                        id,
                        &label_key,
                        Rect::new(
                            x + 120. + round(8., self.dpr),
                            y + round((editor - ceil(h, self.dpr)) / 2., self.dpr),
                            if horizontal {
                                ceil(
                                    scalar("ColorPickerTextInputHorizontalOrientationMargin"),
                                    self.dpr,
                                )
                            } else {
                                (body_width - 128.).max(0.)
                            },
                            ceil(h, self.dpr),
                        ),
                        measure,
                    );
                    y += editor + gap;
                }
            }
        } else {
            for i in 0..3 {
                self.patch_part(id, &format!("ChannelLabel{i}"), json!({"visible":false}));
            }
            self.patch_part(id, "AlphaLabel", json!({"visible":false}));
        }
        if q.is_more_button_visible && !horizontal {
            self.arrange_picker_part(
                id,
                "MoreButton",
                Rect::new(
                    if horizontal {
                        x
                    } else {
                        origin + body_width - 120.
                    },
                    if fields {
                        y
                    } else {
                        padding
                            + side
                            + round(16., self.dpr)
                            + if q.is_color_slider_visible {
                                slider + small
                            } else {
                                0.
                            }
                            + if q.is_alpha_enabled && q.is_alpha_slider_visible {
                                slider + round(16., self.dpr)
                            } else {
                                0.
                            }
                    },
                    120.,
                    editor,
                ),
                measure,
            );
        }
        if q.is_more_button_visible && !horizontal {
            let r = self.nodes[&self.nodes[&id].picker.parts["MoreButton"]].rect;
            self.arrange_picker_part(
                id,
                "MoreGlyph",
                Rect::new(
                    r.x + r.width - round(13., self.dpr),
                    r.y + round(5.6, self.dpr),
                    12.,
                    round(19., self.dpr),
                ),
                measure,
            );
        }
    }
    fn arrange_picker_wheels(&mut self, surface: u32, measure: &mut impl TextMeasurer) {
        let owner = self.nodes[&surface].picker.owner.unwrap();
        let n = &self.nodes[&surface];
        let r = Rect::new(0., 0., n.rect.width, n.rect.height);
        let host = r.height - round(41., self.dpr);
        let fields = self.nodes[&owner].picker.wheel_fields.clone();
        let count = fields.len().max(1);
        let b = overlays::border_thickness([1.; 4], self.dpr)[0];
        let inner = r.width - b * (count - 1) as f64;
        let mut x = 0.;
        for i in 0..3 {
            let key = ["FirstWheel", "SecondWheel", "ThirdWheel"][i];
            self.patch_part(owner, key, json!({"visible":i<count}));
            if i >= count {
                for direction in ["Up", "Down"] {
                    self.patch_part(
                        owner,
                        &format!("{key}{direction}Button"),
                        json!({"visible":false}),
                    );
                }
            }
            if i < count {
                let width = if self.nodes[&owner].kind == NodeKind::DatePicker && count > 1 {
                    if fields[i] == "month" {
                        inner - round(79., self.dpr) * (count - 1) as f64
                    } else {
                        round(79., self.dpr)
                    }
                } else {
                    round(inner * (i + 1) as f64 / count as f64, self.dpr)
                        - round(inner * i as f64 / count as f64, self.dpr)
                };
                self.arrange_picker_part(owner, key, Rect::new(x, 0., width, host), measure);
                for direction in ["Up", "Down"] {
                    let nav = format!("{key}{direction}Button");
                    let hover = self.pointer.is_some_and(|(x, y)| {
                        self.inside(self.nodes[&owner].picker.parts[key], x, y)
                    });
                    self.patch_part(owner, &nav, json!({"visible":hover}));
                    let height = ceil(scalar("LoopingSelectorUpDownButtonHeight"), self.dpr);
                    self.arrange_picker_part(
                        owner,
                        &nav,
                        Rect::new(
                            x,
                            if direction == "Up" { 0. } else { host - height },
                            width,
                            height,
                        ),
                        measure,
                    );
                }
                x += width + b;
            }
        }
        let gap = round(4., self.dpr);
        let half = (r.width - gap * 2.) / 2.;
        self.arrange_picker_part(
            owner,
            "AcceptButton",
            Rect::new(
                gap,
                host + gap,
                half - round(2., self.dpr),
                (r.height - host - gap * 2.).max(0.),
            ),
            measure,
        );
        self.arrange_picker_part(
            owner,
            "DismissButton",
            Rect::new(
                gap + half + round(2., self.dpr),
                host + gap,
                half - round(2., self.dpr),
                (r.height - host - gap * 2.).max(0.),
            ),
            measure,
        );
        self.initialize_picker_wheel_offsets(owner);
    }
}
