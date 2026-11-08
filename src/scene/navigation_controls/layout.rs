use super::*;
use crate::typography;
fn round(value: f64, dpr: f64) -> f64 {
    (value * dpr + 0.5 + 1e-9).floor() / dpr
}
fn ceil(value: f64, dpr: f64) -> f64 {
    (value * dpr - 1e-9).ceil() / dpr
}
fn breadcrumb_button_width(text_width: f64, dpr: f64) -> f64 {
    // UIElement.DesiredSize is a WinRT float Size. Preserve that intermediate
    // rounding before Button adds its two 1 DIP padding values and rounds again.
    let child = ceil(text_width, dpr) as f32;
    round((child + 2.) as f64, dpr)
}
// These templates use the symbol font's em-square baseline. Measuring Latin H
// falls back to Segoe UI and shifts every close/pip glyph upward.
fn symbol_layout(
    text: &str,
    font: &Font,
    measure: &mut impl TextMeasurer,
) -> crate::typography::TextLayout {
    let mut layout = typography::layout_tight(text, font, measure);
    layout.height = font.size;
    layout.line_height = font.size;
    for line in &mut layout.lines {
        line.baseline = font.size;
    }
    layout
}
fn text_part(
    key: impl Into<String>,
    role: &str,
    index: i32,
    label: impl Into<String>,
    rect: Rect,
    font: Font,
    measure: &mut impl TextMeasurer,
) -> Part {
    let mut part = Part::new(key, role, index, label, rect);
    part.text = typography::layout(
        &part.label,
        &font,
        rect.width,
        false,
        TextTrimming::Clip,
        None,
        measure,
    );
    part.font = font;
    part
}
impl Scene {
    pub(in crate::scene) fn prepare_navigation_glyphs(
        &mut self,
        id: u32,
        measure: &mut impl TextMeasurer,
    ) {
        let mut glyphs = vec![
            ("treeExpanded".into(), "\u{e70d}".into(), 8.),
            ("treeCollapsed".into(), "\u{e76c}".into(), 8.),
            ("treeChecked".into(), "\u{e73e}".into(), 12.),
        ];
        if self.nodes[&id].kind == NodeKind::TabView {
            glyphs.extend(
                self.nodes[&id]
                    .props
                    .nav_controls
                    .items
                    .iter()
                    .filter(|i| !i.icon.is_empty())
                    .map(|i| (i.icon.clone(), i.icon.clone(), 16.)),
            );
        }
        for (key, glyph, size) in glyphs {
            if !self.nodes[&id].nav_controls.glyphs.contains_key(&key) {
                let font = Font {
                    family: "Segoe Fluent Icons".into(),
                    size,
                    ..Default::default()
                };
                let text = symbol_layout(&glyph, &font, measure);
                self.nodes
                    .get_mut(&id)
                    .unwrap()
                    .nav_controls
                    .glyphs
                    .insert(key, text);
            }
        }
    }
    pub(in crate::scene) fn measure_navigation_control(
        &mut self,
        id: u32,
        available: [f64; 2],
        measure: &mut impl TextMeasurer,
    ) -> [f64; 2] {
        let n = &self.nodes[&id];
        let p = &n.props;
        let q = &p.nav_controls;
        let font = p.font();
        let count = q.items.len();
        match n.kind {
            NodeKind::SelectorBar => self.measure_selector(id,measure),
            NodeKind::FlipView => {
                let mut size = [0_f64, 0_f64];
                for child in n.nav_controls.slots.values().copied().collect::<Vec<_>>() {
                    let d = self.measure_node(child, available, measure);
                    size[0] = size[0].max(d[0]);
                    size[1] = size[1].max(d[1]);
                }
                [size[0].min(available[0]), size[1].min(available[1])]
            }
            NodeKind::PipsPager => {
                let count = if q.number_of_pages < 0 {
                    q.max_visible_pips as usize
                } else {
                    (q.number_of_pages as usize).min(q.max_visible_pips as usize)
                };
                let buttons = usize::from(
                    q.previous_button_visibility != PipsPagerButtonVisibility::Collapsed,
                ) + usize::from(
                    q.next_button_visibility != PipsPagerButtonVisibility::Collapsed,
                );
                let along = if count == 0 {
                    0.
                } else {
                    count as f64 * scalar("PipsPagerHorizontalOrientationButtonWidth")
                        + buttons as f64 * scalar("PipsPagerNavigationButtonWidth")
                };
                if p.orientation == Orientation::Vertical {
                    [24., along]
                } else {
                    [along, 24.]
                }
            }
            NodeKind::BreadcrumbBar => {
                let height = ceil(
                    (scalar("BreadcrumbBarCaptionHeight") * font.size / 14.) + 6.,
                    self.dpr,
                );
                let total = q
                    .items
                    .iter()
                    .enumerate()
                    .map(|(i, item)| {
                        breadcrumb_button_width(measure.measure(&item.text, &font).width, self.dpr)
                            + if i + 1 < count { 16. } else { 0. }
                    })
                    .sum::<f64>();
                [total.min(available[0]), height.min(available[1])]
            }
            NodeKind::TabView => {
                let total = q
                    .items
                    .iter()
                    .map(|i| {
                        measure
                            .measure(
                                &i.text,
                                &Font {
                                    size: 12.,
                                    ..font.clone()
                                },
                            )
                            .width
                            + if i.icon.is_empty() { 0. } else { 26. }
                            + if i.is_closable { 36. } else { 0. }
                            + 16.
                    })
                    .sum::<f64>();
                let mut height = 40_f64;
                for child in n.nav_controls.slots.values().copied().collect::<Vec<_>>() {
                    let d = self.measure_node(
                        child,
                        [available[0], (available[1] - 40.).max(0.)],
                        measure,
                    );
                    height = height.max(d[1] + 40.);
                }
                [total.min(available[0]), height.min(available[1])]
            }
            _ => [0.; 2],
        }
    }
    pub(in crate::scene) fn arrange_navigation_control(
        &mut self,
        id: u32,
        inner: Rect,
        measure: &mut impl TextMeasurer,
    ) {
        let kind = self.nodes[&id].kind;
        let mut parts = match kind {
            NodeKind::SelectorBar => self.layout_selector(id,inner,measure),
            NodeKind::FlipView => self.layout_navigation_flip(id, inner, measure),
            NodeKind::PipsPager => self.layout_navigation_pips(id, inner, measure),
            NodeKind::BreadcrumbBar => self.layout_navigation_breadcrumb(id, inner, measure),
            NodeKind::TabView => self.layout_navigation_tabs(id, inner, measure),
            _ => vec![],
        };
        let n = &self.nodes[&id];
        if n.props.flow_direction == FlowDirection::RightToLeft {
            for part in &mut parts {
                part.rect.x = inner.x + inner.width - (part.rect.x - inner.x) - part.rect.width;
            }
        }
        self.nodes.get_mut(&id).unwrap().nav_controls.parts = parts;
        self.arrange_navigation_slots(id, inner, measure);
    }
    fn layout_navigation_flip(
        &mut self,
        id: u32,
        r: Rect,
        measure: &mut impl TextMeasurer,
    ) -> Vec<Part> {
        let n = &self.nodes[&id];
        let vertical = n.props.orientation == Orientation::Vertical;
        let page = n.nav_controls.page.value(self.time);
        let size = if vertical { r.height } else { r.width };
        let selected = n.props.selected_index;
        let mut parts = vec![];
        let start = (page.floor() as i32 - 1).max(0);
        let end = (page.ceil() as i32 + 1).min(n.props.nav_controls.items.len() as i32 - 1);
        for index in start..=end {
            let item = &n.props.nav_controls.items[index as usize];
            let offset = (index as f64 - page) * size;
            let rect = if vertical {
                Rect::new(r.x, r.y + offset, r.width, r.height)
            } else {
                Rect::new(r.x + offset, r.y, r.width, r.height)
            };
            let mut part = text_part(
                &item.id,
                "page",
                index,
                &item.text,
                rect,
                n.props.font(),
                measure,
            );
            part.selected = index == selected;
            part.enabled = item.enabled;
            parts.push(part);
        }
        let visible = n
            .nav_controls
            .hovered
            .as_deref()
            .is_some_and(|key| key == "previous" || key == "next")
            || n.nav_controls.last_activity > 0.
                && self.time - n.nav_controls.last_activity < 3000.;
        // FrameworkElement measures the fixed button and 1 DIP margin upward
        // to the physical grid before centering/right/bottom alignment.
        let bw = ceil(if vertical { 38. } else { 16. }, self.dpr);
        let bh = ceil(if vertical { 16. } else { 38. }, self.dpr);
        let inset = ceil(1., self.dpr);
        for (previous, index) in [(true, selected - 1), (false, selected + 1)] {
            let rect = if vertical {
                Rect::new(
                    r.x + (r.width - bw) / 2.,
                    if previous {
                        r.y + inset
                    } else {
                        r.y + r.height - inset - bh
                    },
                    bw,
                    bh,
                )
            } else {
                Rect::new(
                    if previous {
                        r.x + inset
                    } else {
                        r.x + r.width - inset - bw
                    },
                    r.y + (r.height - bh) / 2.,
                    bw,
                    bh,
                )
            };
            let mut part = Part::new(
                if previous { "previous" } else { "next" },
                "flipButton",
                index,
                if previous {
                    "Previous item"
                } else {
                    "Next item"
                },
                rect,
            );
            part.visible =
                visible && index >= 0 && (index as usize) < n.props.nav_controls.items.len();
            part.enabled = n.enabled;
            part.font = Font {
                family: "Segoe Fluent Icons".into(),
                size: scalar("FlipViewButtonFontSize"),
                ..Default::default()
            };
            // Original template uses solid navigation triangles (EDD9/EDDA/EDDB/EDDC).
            let arrow = if vertical {
                if previous {
                    "\u{eddb}"
                } else {
                    "\u{eddc}"
                }
            } else if previous {
                "\u{edd9}"
            } else {
                "\u{edda}"
            };
            part.text = symbol_layout(arrow, &part.font, measure);
            parts.push(part);
        }
        parts
    }
    fn layout_navigation_pips(
        &mut self,
        id: u32,
        r: Rect,
        measure: &mut impl TextMeasurer,
    ) -> Vec<Part> {
        let n = &self.nodes[&id];
        let q = n.props.nav_controls.clone();
        let vertical = n.props.orientation == Orientation::Vertical;
        let selected = q.selected_page_index;
        let visible = q.max_visible_pips as i32;
        let total = if q.number_of_pages < 0 {
            selected.saturating_add(visible).max(visible)
        } else {
            q.number_of_pages
        };
        if total == 0 || visible == 0 {
            return vec![];
        }
        let count = total.min(visible);
        let first = (selected - count / 2).clamp(0, (total - count).max(0));
        let has_previous = q.previous_button_visibility != PipsPagerButtonVisibility::Collapsed;
        let has_next = q.next_button_visibility != PipsPagerButtonVisibility::Collapsed;
        let hovered = n.nav_controls.hovered.is_some() || self.focused == Some(id);
        let c = &mut self.nodes.get_mut(&id).unwrap().nav_controls;
        if c.first_visible != first {
            c.pips_scroll.set(
                first as f64 * 12.,
                self.time,
                !self.reduced_motion && self.theme != Theme::HighContrast,
            );
            c.first_visible = first;
        }
        let offset = c.pips_scroll.value(self.time);
        let base = if has_previous { 24. } else { 0. };
        let begin = (offset / 12.).floor().max(0.) as i32;
        let end = (((offset / 12.).ceil() as i32).saturating_add(count)).min(total - 1);
        let mut parts = vec![];
        for index in begin..=end {
            let at = base + index as f64 * 12. - offset;
            let rect = if vertical {
                Rect::new(r.x, r.y + at, 24., 12.)
            } else {
                Rect::new(r.x + at, r.y, 12., 24.)
            };
            let mut part = Part::new(
                format!("page-{index}"),
                "pip",
                index,
                format!("Page {}", index + 1),
                rect,
            );
            part.selected = index == selected;
            let pressed = c.pressed.as_ref().is_some_and(|(_, key)| key == &part.key);
            part.font = Font {
                family: "Segoe Fluent Icons".into(),
                size: if part.selected && !pressed { 6. } else { 4. },
                ..Default::default()
            };
            part.text = symbol_layout("\u{ea3b}", &part.font, measure);
            parts.push(part);
        }
        for (previous, has, policy) in [
            (true, has_previous, q.previous_button_visibility),
            (false, has_next, q.next_button_visibility),
        ] {
            if !has {
                continue;
            }
            let at = if previous {
                0.
            } else {
                base + count as f64 * 12.
            };
            let rect = if vertical {
                Rect::new(r.x, r.y + at, 24., 24.)
            } else {
                Rect::new(r.x + at, r.y, 24., 24.)
            };
            let mut part = Part::new(
                if previous { "previous" } else { "next" },
                "pipButton",
                selected.saturating_add(if previous { -1 } else { 1 }),
                if previous {
                    "Previous page"
                } else {
                    "Next page"
                },
                rect,
            );
            let edge = if previous {
                selected == 0
            } else {
                q.number_of_pages >= 0 && selected.saturating_add(1) >= total
            };
            part.visible = (!edge || q.wrap_mode == PipsPagerWrapMode::Wrap && total > 1)
                && (policy != PipsPagerButtonVisibility::VisibleOnPointerOver || hovered);
            part.enabled = part.visible;
            part.font = Font {
                family: "Segoe Fluent Icons".into(),
                size: 8.,
                ..Default::default()
            };
            let g = if previous { "\u{eddb}" } else { "\u{eddc}" };
            part.text = symbol_layout(g, &part.font, measure);
            parts.push(part);
        }
        parts
    }
    fn layout_navigation_breadcrumb(
        &mut self,
        id: u32,
        r: Rect,
        measure: &mut impl TextMeasurer,
    ) -> Vec<Part> {
        let n = &self.nodes[&id];
        let font = n.props.font();
        let q = &n.props.nav_controls;
        let len = q.items.len();
        let dpr = self.dpr;
        let mut widths = vec![];
        for (i, item) in q.items.iter().enumerate() {
            let font = font.clone();
            widths.push(
                breadcrumb_button_width(measure.measure(&item.text, &font).width, dpr)
                    + if i + 1 < len { 16. } else { 0. },
            );
        }
        let ellipsis = ceil(22., dpr) + 16.;
        let overflow = widths.iter().sum::<f64>() > r.width;
        let mut first = 0;
        if overflow && len > 0 {
            let mut taken = widths[len - 1] + ellipsis;
            first = len - 1;
            while first > 0 && taken + widths[first - 1] <= r.width {
                first -= 1;
                taken += widths[first];
            }
        }
        let mut parts = vec![];
        let mut at = r.x;
        if overflow && len > 0 {
            let mut part = Part::new(
                "ellipsis",
                "ellipsis",
                -1,
                "Show hidden breadcrumbs",
                Rect::new(at, r.y, ellipsis, r.height),
            );
            part.font = Font {
                family: "Segoe Fluent Icons".into(),
                size: 14.,
                ..Default::default()
            };
            part.text = symbol_layout("\u{e712}", &part.font, measure);
            parts.push(part);
            at += ellipsis;
        }
        for (i, width) in widths.into_iter().enumerate().skip(first) {
            let item = &q.items[i];
            let font = font.clone();
            let mut part = text_part(
                &item.id,
                "breadcrumb",
                i as i32,
                &item.text,
                Rect::new(at, r.y, width, r.height),
                font,
                measure,
            );
            part.selected = i + 1 == len;
            part.enabled = item.enabled;
            parts.push(part);
            at += width;
        }
        let chevron = glyph(if n.props.flow_direction == FlowDirection::RightToLeft {
            "BreadcrumbBarChevronRightToLeft"
        } else {
            "BreadcrumbBarChevronLeftToRight"
        });
        self.nodes.get_mut(&id).unwrap().nav_controls.first_visible = first as i32;
        self.nodes.get_mut(&id).unwrap().nav_controls.glyphs.insert(
            "breadcrumbChevron".into(),
            symbol_layout(
                &chevron,
                &Font {
                    family: "Segoe Fluent Icons".into(),
                    size: 12.,
                    ..Default::default()
                },
                measure,
            ),
        );
        parts
    }
    fn layout_navigation_tabs(
        &mut self,
        id: u32,
        r: Rect,
        measure: &mut impl TextMeasurer,
    ) -> Vec<Part> {
        let n = &self.nodes[&id];
        let p = &n.props;
        let q = &p.nav_controls;
        let count = q.items.len();
        let dpr = self.dpr;
        let selected = p.selected_index;
        let add_width = if q.is_add_tab_button_visible {
            scalar("TabViewItemAddButtonWidth") + 3.
        } else {
            0.
        };
        let header = q.tab_strip_header_width;
        let footer = q.tab_strip_footer_width;
        let equal = ((r.width - 2. - add_width - header - footer - 8.) / count.max(1) as f64)
            .clamp(scalar("TabViewItemMinWidth"), scalar("TabViewItemMaxWidth"));
        let mut parts = vec![];
        let mut at = r.x + round(2., dpr) * 2. + 4. + header;
        let mut widths = vec![];
        for (i, item) in q.items.iter().enumerate() {
            let compact = q.tab_width_mode == TabViewWidthMode::Compact && selected != i as i32;
            let font = Font {
                size: 12.,
                weight: if selected == i as i32 { 600 } else { 400 },
                ..p.font()
            };
            widths.push(round(
                match q.tab_width_mode {
                    TabViewWidthMode::Equal => equal,
                    _ if compact => 48.,
                    _ => (measure.measure(&item.text, &font).width
                        + if item.icon.is_empty() && item.image_source.is_empty() {
                            0.
                        } else {
                            26.
                        }
                        + if item.is_closable { 36. } else { 0. }
                        + 16.)
                        .clamp(48., scalar("TabViewItemMaxWidth")),
                },
                dpr,
            ));
        }
        let mut order = (0..count).collect::<Vec<_>>();
        let offer = n.nav_controls.tab_offer.clone();
        if let Some((Some(key), index, _)) = &offer {
            if let Some(from) = q.items.iter().position(|i| &i.id == key) {
                order.retain(|i| *i != from);
                let to = index
                    .saturating_sub(usize::from(from < *index))
                    .min(order.len());
                order.insert(to, from);
            }
        }
        let mut desired = vec![0.; count];
        for i in order {
            if let Some((None, index, width)) = &offer {
                if i == *index {
                    at += width;
                }
            }
            desired[i] = at;
            at += widths[i];
        }
        if let Some((None, index, width)) = &offer {
            if *index >= count {
                at += width;
            }
        }
        let max_scroll = (at - (r.x + r.width - add_width - footer)).max(0.);
        let selected_bounds = usize::try_from(selected)
            .ok()
            .and_then(|i| widths.get(i).map(|w| (desired[i] - r.x, *w)));
        let reduce = self.reduced_motion || n.theme == Theme::HighContrast;
        let q = q.clone();
        let font_base = p.font();
        let hovering = n.nav_controls.hovered.clone();
        let c = &mut self.nodes.get_mut(&id).unwrap().nav_controls;
        let mut target = c.pips_scroll.target().clamp(0., max_scroll);
        if c.bring_tab {
            if let Some((x, width)) = selected_bounds {
                let view = (r.width - add_width - header - footer - 64.).max(32.);
                if x < target + 32. {
                    target = (x - 32.).max(0.);
                } else if x + width > target + view {
                    target = (x + width - view).min(max_scroll);
                }
            }
            c.bring_tab = false;
        }
        if (target - c.pips_scroll.target()).abs() > 0.01 {
            c.pips_scroll.set(target, self.time, !reduce);
        }
        let scroll = c.pips_scroll.value(self.time);
        let live_keys = &c.item_indices;
        c.tab_positions.retain(|key, _| live_keys.contains_key(key));
        for (i, item) in q.items.iter().enumerate() {
            let compact = q.tab_width_mode == TabViewWidthMode::Compact && selected != i as i32;
            let font = Font {
                size: 12.,
                weight: if selected == i as i32 { 600 } else { 400 },
                ..font_base.clone()
            };
            let width = round(
                match q.tab_width_mode {
                    TabViewWidthMode::Equal => equal,
                    _ if compact => 48.,
                    _ => (measure.measure(&item.text, &font).width
                        + if item.icon.is_empty() && item.image_source.is_empty() {
                            0.
                        } else {
                            26.
                        }
                        + if item.is_closable { 36. } else { 0. }
                        + 16.)
                        .clamp(48., scalar("TabViewItemMaxWidth")),
                },
                dpr,
            );
            let position = c.tab_positions.entry(item.id.clone()).or_insert_with(|| {
                let mut m = Motion::default();
                m.snap(desired[i]);
                m
            });
            if reduce {
                position.snap(desired[i]);
            } else if (position.to - desired[i]).abs() > 0.01 {
                position.curve = [0.1, 0.9, 0.2, 1.];
                let (start, duration) = c
                    .tab_shift
                    .filter(|(start, delay, duration)| self.time < start + delay + duration)
                    .map(|(start, delay, duration)| {
                        (
                            (start + delay).max(self.time),
                            (start + delay + duration - (start + delay).max(self.time)).max(0.),
                        )
                    })
                    .unwrap_or((self.time, 367.));
                // Preserve the presented coordinate when retargeting a delayed track.
                let current = position.value(self.time);
                position.snap(current);
                position.retarget(desired[i], start, duration);
            }
            let rect = Rect::new(position.value(self.time) - scroll, r.y + 8., width, 32.);
            let mut part = text_part(&item.id, "tab", i as i32, &item.text, rect, font, measure);
            part.selected = selected == i as i32;
            part.enabled = item.enabled;
            parts.push(part);
            if item.is_closable {
                let mut close = Part::new(
                    format!("close:{}", item.id),
                    "closeTab",
                    i as i32,
                    format!("Close {}", item.text),
                    Rect::new(
                        rect.x + width - 36. - if selected == i as i32 { 0. } else { 1. },
                        rect.y + 4.,
                        32.,
                        24.,
                    ),
                );
                let hovering = hovering
                    .as_deref()
                    .is_some_and(|k| k == item.id || k == format!("close:{}", item.id));
                close.visible = match q.close_button_overlay_mode {
                    TabViewCloseButtonOverlayMode::Always => true,
                    TabViewCloseButtonOverlayMode::OnPointerOver => {
                        part_selected(selected, i) || hovering
                    }
                    TabViewCloseButtonOverlayMode::Auto => true,
                };
                close.enabled = item.enabled;
                close.font = Font {
                    family: "Segoe Fluent Icons".into(),
                    size: 12.,
                    ..Default::default()
                };
                close.text = symbol_layout("\u{e711}", &close.font, measure);
                parts.push(close);
            }
        }
        let strip_end = r.x + r.width - add_width - footer;
        if at - scroll > strip_end && count > 0 {
            for (previous, x) in [(true, r.x), (false, strip_end - 32.)] {
                let mut button = Part::new(
                    if previous {
                        "scrollPrevious"
                    } else {
                        "scrollNext"
                    },
                    "tabScroll",
                    -1,
                    if previous {
                        "Scroll tabs left"
                    } else {
                        "Scroll tabs right"
                    },
                    Rect::new(x, r.y + 12., 32., 24.),
                );
                button.font = Font {
                    family: "Segoe Fluent Icons".into(),
                    size: 8.,
                    ..Default::default()
                };
                button.text = symbol_layout(
                    if previous { "\u{e76b}" } else { "\u{e76c}" },
                    &button.font,
                    measure,
                );
                parts.push(button);
            }
        }
        if q.is_add_tab_button_visible {
            let mut add = Part::new(
                "add",
                "addTab",
                -1,
                "Add a tab",
                Rect::new(
                    (at + 4. + round(3., dpr)).min(r.x + r.width - 32. + round(3., dpr)),
                    r.y + 12.8,
                    32.,
                    24.,
                ),
            );
            add.font = Font {
                family: "Segoe Fluent Icons".into(),
                size: 12.,
                ..Default::default()
            };
            add.text = symbol_layout("\u{e710}", &add.font, measure);
            parts.push(add);
        }
        if let Ok(index) = usize::try_from(selected) {
            if let Some(item) = q.items.get(index) {
                if !item.content_text.is_empty()
                    && !c.slots.contains_key(&(item.id.clone(), "content".into()))
                {
                    parts.push(text_part(
                        format!("content:{}", item.id),
                        "content",
                        selected,
                        &item.content_text,
                        Rect::new(
                            r.x + 16.,
                            r.y + 40.,
                            (r.width - 32.).max(0.),
                            (r.height - 40.).max(0.),
                        ),
                        font_base,
                        measure,
                    ));
                }
            }
        }
        parts
    }
    fn arrange_navigation_slots(&mut self, id: u32, r: Rect, measure: &mut impl TextMeasurer) {
        if self.nodes[&id].kind == NodeKind::FlipView {
            let n = &self.nodes[&id];
            let active = n
                .nav_controls
                .parts
                .iter()
                .filter(|p| p.role == "page")
                .map(|p| p.key.as_str())
                .collect::<HashSet<_>>();
            let stale = n
                .nav_controls
                .slots
                .iter()
                .filter(|((key, role), _)| role == "content" && !active.contains(key.as_str()))
                .map(|(_, slot)| *slot)
                .collect::<Vec<_>>();
            for slot in stale {
                if self.nodes.contains_key(&slot) {
                    let _ = self.destroy(slot);
                }
            }
        }
        let n = &self.nodes[&id];
        let slots = n
            .nav_controls
            .slots
            .iter()
            .map(|((key, role), child)| (key.clone(), role.clone(), *child))
            .collect::<Vec<_>>();
        let kind = n.kind;
        for (key, role, child) in slots {
            let n = &self.nodes[&id];
            let selected = n.props.selected_index;
            let index = n.nav_controls.item_indices.get(&key).copied();
            let part = n.nav_controls.parts.iter().find(|p| {
                p.key == key && (p.role == "tab" || p.role == "page" || p.role == "breadcrumb")
            });
            let (rect, shown) = match role.as_str() {
                "stripHeader" => (
                    Rect::new(r.x, r.y, n.props.nav_controls.tab_strip_header_width, 40.),
                    true,
                ),
                "stripFooter" => (
                    Rect::new(
                        r.x + r.width - n.props.nav_controls.tab_strip_footer_width,
                        r.y,
                        n.props.nav_controls.tab_strip_footer_width,
                        40.,
                    ),
                    true,
                ),
                "header" => {
                    let rect = part
                        .map(|part| {
                            let r = part.rect;
                            if kind == NodeKind::TabView {
                                Rect::new(
                                    r.x + if part.selected { 8. } else { 9. },
                                    r.y,
                                    (r.width
                                        - 16.
                                        - if n.props.nav_controls.items[part.index as usize]
                                            .is_closable
                                        {
                                            36.
                                        } else {
                                            0.
                                        })
                                    .max(0.),
                                    r.height,
                                )
                            } else {
                                Rect::new(
                                    r.x + 1.,
                                    r.y,
                                    (r.width - 2. - if part.selected { 0. } else { 16. }).max(0.),
                                    r.height,
                                )
                            }
                        })
                        .unwrap_or_default();
                    (rect, part.is_some())
                }
                _ if kind == NodeKind::FlipView => {
                    (part.map(|p| p.rect).unwrap_or_default(), part.is_some())
                }
                _ => (
                    Rect::new(r.x, r.y + 40., r.width, (r.height - 40.).max(0.)),
                    index.is_some_and(|i| i as i32 == selected),
                ),
            };
            let inherited = (n.theme, n.enabled, n.visible && shown);
            let world = n.world;
            self.nodes.get_mut(&child).unwrap().props.visible = shown;
            self.measure_node(child, [rect.width, rect.height], measure);
            self.arrange_node(child, rect, world, inherited, measure);
        }
    }
}
fn part_selected(selected: i32, index: usize) -> bool {
    selected == index as i32
}
