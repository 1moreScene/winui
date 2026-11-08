//! Shared menu template layout, including the child TextBlock rounding budget.
use super::*;
use crate::{
    render::Draw,
    typography::{self, Font},
};

#[derive(Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MenuRowParts {
    pub label: Rect,
    pub shortcut: Rect,
    pub icon: Rect,
    pub check: Rect,
    pub chevron: Rect,
}
fn template_kind(kind: MenuEntryKind) -> &'static str {
    match kind {
        MenuEntryKind::Toggle => "toggle",
        MenuEntryKind::Radio => "radio",
        MenuEntryKind::Submenu => "submenu",
        _ => "command",
    }
}
fn part_resource(kind: MenuEntryKind, part: &str, state: &str) -> String {
    let v = &menu_item_controls::radio_template()["parts"][if kind == MenuEntryKind::Submenu
        && part == "CheckGlyph"
    {
        "radio"
    } else {
        template_kind(kind)
    }][part];
    v[state]
        .as_str()
        .or_else(|| v["Normal"].as_str())
        .unwrap_or("MenuFlyoutItemForeground")
        .into()
}
fn shortcut_margin(kind: MenuEntryKind) -> [f64; 4] {
    let template = menu_item_controls::radio_template();
    let values = template["parts"][template_kind(kind)]["KeyboardAcceleratorTextBlock"]["margin"]
        .as_str()
        .unwrap_or("24,0,0,0")
        .split(',')
        .map(|v| v.parse().unwrap())
        .collect::<Vec<f64>>();
    std::array::from_fn(|i| values[i])
}
fn chevron_size() -> f64 {
    menu_item_controls::radio_template()["parts"]["submenu"]["SubItemChevron"]["size"]
        .as_f64()
        .unwrap()
}
fn chevron_gap() -> f64 {
    menu_item_controls::radio_template()["chevronGap"]
        .as_f64()
        .unwrap()
}
fn icon_layout(text: &str, size: f64, m: &mut impl TextMeasurer) -> TextLayout {
    let font = Font {
        family: "Segoe Fluent Icons".into(),
        size,
        ..Default::default()
    };
    let metrics = m.measure(text, &font);
    typography::layout(
        text,
        &font,
        f64::INFINITY,
        false,
        TextTrimming::Clip,
        Some(metrics.ascent + metrics.descent),
        m,
    )
}
impl Scene {
    pub(super) fn measure_menu_presenter(
        &mut self,
        id: u32,
        width: f64,
        m: &mut impl TextMeasurer,
    ) -> [f64; 2] {
        let p = self.nodes[&id].props.clone();
        let narrow = self.nodes[&id].overlay.narrow;
        let padding = overlays::menu_padding(narrow);
        let margin = overlays::menu_thickness("itemMargin");
        let leading = overlays::menu_placeholder(&p.menu_items);
        let extra = margin[0] + margin[2] + padding[0] + padding[2] + leading;
        let ceil = |v: f64| (v * self.dpr - 1e-9).ceil() / self.dpr;
        let caption_font = Font {
            size: menu_item_controls::radio_template()["shortcutSize"]
                .as_f64()
                .unwrap(),
            ..p.font()
        };
        let shortcuts = p
            .menu_items
            .iter()
            .map(|e| {
                let mut label = typography::layout(
                    &super::menu_entries::shortcut(e),
                    &caption_font,
                    f64::INFINITY,
                    false,
                    TextTrimming::Clip,
                    None,
                    m,
                );
                typography::line_services_rounding(&mut label, self.dpr);
                label.width = ceil(label.width);
                label
            })
            .collect::<Vec<_>>();
        let shortcut_width = shortcuts.iter().map(|s| s.width).fold(0., f64::max);
        let mut labels = vec![];
        let mut icons = vec![];
        let mut row_heights = vec![];
        let mut natural_width = 0f64;
        let mut height = 0.;
        for (index, entry) in p.menu_items.iter().enumerate() {
            let trailing = if entry.kind == MenuEntryKind::Submenu {
                chevron_size() + chevron_gap()
            } else if shortcut_width > 0. {
                shortcuts[index].width + shortcut_margin(entry.kind)[0]
            } else {
                0.
            };
            let mut label = typography::layout(
                &entry.text,
                &p.font(),
                (width - extra - trailing).max(0.),
                false,
                p.trimming,
                p.line_height,
                m,
            );
            typography::line_services_rounding(&mut label, self.dpr);
            // Menu templates have real child TextBlocks. Their DesiredSize is
            // rounded before Grid/Border/presenter measure combines it with margins.
            label.width = ceil(label.width);
            if entry.kind != MenuEntryKind::Separator {
                natural_width = natural_width.max(label.width + extra + trailing);
            }
            let row_height = if entry.kind == MenuEntryKind::Separator {
                overlays::menu_row_height(true, &label, narrow, self.dpr)
            } else {
                let sm = shortcut_margin(entry.kind);
                let child_height = ceil(label.height).max(
                    if shortcut_width > 0. && entry.kind != MenuEntryKind::Submenu {
                        ceil(shortcuts[index].height + sm[1] + sm[3])
                    } else {
                        0.
                    },
                );
                ((child_height + padding[1] + padding[3] + margin[1] + margin[3]) * self.dpr)
                    .round_ties_even()
                    / self.dpr
            };
            height += row_height;
            row_heights.push(row_height);
            labels.push(label);
            icons.push(icon_layout(&entry.icon, 16., m));
            debug_assert!(index < shortcuts.len());
        }
        let template = menu_item_controls::radio_template();
        let chevron = icon_layout(
            template["parts"]["submenu"]["SubItemChevron"]["glyph"]
                .as_str()
                .unwrap(),
            chevron_size(),
            m,
        );
        let check = icon_layout(
            overlays::contract()["menuLayout"]["checkGlyph"]
                .as_str()
                .unwrap(),
            12.,
            m,
        );
        let radio = icon_layout(template["radioGlyph"].as_str().unwrap(), 12., m);
        let state = &mut self.nodes.get_mut(&id).unwrap().overlay;
        state.row_heights = row_heights;
        state.labels = labels;
        state.shortcuts = shortcuts;
        state.shortcut_width = shortcut_width;
        state.icons = icons;
        state.chevron_label = chevron;
        state.check_label = check;
        state.radio_label = radio;
        [natural_width, height]
    }
    pub(super) fn arrange_menu_parts(&mut self, id: u32) {
        let n = &self.nodes[&id];
        let padding = overlays::menu_padding(n.overlay.narrow);
        let margin = overlays::menu_thickness("itemMargin");
        let leading = overlays::menu_placeholder(&n.props.menu_items);
        let checks =
            n.props.menu_items.iter().any(|e| {
                matches!(e.kind, MenuEntryKind::Toggle | MenuEntryKind::Radio) || e.checked
            });
        let rtl = self.effective_flow_direction(id) == FlowDirection::RightToLeft;
        let round_x = |v: f64| ((n.rect.x + v) * self.dpr).round_ties_even() / self.dpr - n.rect.x;
        let round_y = |v: f64| ((n.rect.y + v) * self.dpr).round_ties_even() / self.dpr - n.rect.y;
        let mirror = |r: Rect| {
            if rtl {
                Rect::new(n.rect.width - r.x - r.width, r.y, r.width, r.height)
            } else {
                r
            }
        };
        let parts = n
            .props
            .menu_items
            .iter()
            .enumerate()
            .map(|(i, e)| {
                let row = n.overlay.rows[i];
                let base = round_x(row.x + margin[0] + padding[0]);
                let center = row.y
                    + margin[1]
                    + padding[1]
                    + (row.height - margin[1] - margin[3] - padding[1] - padding[3]) / 2.;
                let trailing = if e.kind == MenuEntryKind::Submenu {
                    chevron_size() + chevron_gap()
                } else if n.overlay.shortcut_width > 0. {
                    n.overlay.shortcuts[i].width + shortcut_margin(e.kind)[0]
                } else {
                    0.
                };
                let label = &n.overlay.labels[i];
                let shortcut = &n.overlay.shortcuts[i];
                let sm = shortcut_margin(e.kind);
                let check = if e.kind == MenuEntryKind::Radio || e.kind == MenuEntryKind::Submenu {
                    &n.overlay.radio_label
                } else {
                    &n.overlay.check_label
                };
                MenuRowParts {
                    label: mirror(Rect::new(
                        round_x(base + leading),
                        round_y(center - label.height / 2.),
                        (round_x(row.x + row.width - margin[2] - padding[2] - trailing)
                            - round_x(base + leading))
                        .max(0.),
                        (label.height * self.dpr - 1e-9).ceil() / self.dpr,
                    )),
                    shortcut: mirror(Rect::new(
                        round_x(row.x + row.width - margin[2] - padding[2] - shortcut.width),
                        round_y(row.y + margin[1] + padding[1])
                            + sm[1]
                            + (((label.height * self.dpr - 1e-9).ceil() / self.dpr).max(
                                ((shortcut.height + sm[1] + sm[3]) * self.dpr - 1e-9).ceil()
                                    / self.dpr,
                            ) - sm[1]
                                - sm[3]
                                - (shortcut.height * self.dpr - 1e-9).ceil() / self.dpr)
                                / 2.,
                        shortcut.width,
                        (shortcut.height * self.dpr - 1e-9).ceil() / self.dpr,
                    )),
                    icon: mirror(Rect::new(
                        round_x(base + if checks { 28. } else { 0. }),
                        round_y(center - 8.),
                        16.,
                        16.,
                    )),
                    check: mirror(Rect::new(
                        base,
                        round_y(center - check.height / 2.),
                        12.,
                        check.height,
                    )),
                    chevron: mirror(Rect::new(
                        round_x(row.x + row.width - margin[2] - padding[2] - chevron_size()),
                        round_y(center - n.overlay.chevron_label.height / 2. + 0.5),
                        chevron_size(),
                        n.overlay.chevron_label.height,
                    )),
                }
            })
            .collect();
        self.nodes.get_mut(&id).unwrap().overlay.parts = parts;
    }
    pub(super) fn paint_menu_presenter(&self, id: u32, out: &mut Vec<Draw>) {
        let n = &self.nodes[&id];
        let border = overlays::border_thickness(n.props.border_thickness, self.dpr);
        let margin = overlays::menu_thickness("itemMargin");
        let rtl = self.effective_flow_direction(id) == FlowDirection::RightToLeft;
        let round_x = |v: f64| ((n.rect.x + v) * self.dpr).round_ties_even() / self.dpr - n.rect.x;
        let round_y = |v: f64| ((n.rect.y + v) * self.dpr).round_ties_even() / self.dpr - n.rect.y;
        out.push(Draw::Clip {
            rect: Rect::new(
                border[0],
                border[1] + n.props.padding[1],
                (n.rect.width - border[0] - border[2]).max(0.),
                (n.rect.height - border[1] - border[3] - n.props.padding[1] - n.props.padding[3])
                    .max(0.),
            ),
        });
        for (i, e) in n.props.menu_items.iter().enumerate() {
            let row = n.overlay.rows[i];
            let Some(parts) = n.overlay.parts.get(i) else {
                continue;
            };
            if e.kind == MenuEntryKind::Separator {
                let padding = overlays::menu_thickness("separatorPadding");
                out.push(Draw::Fill {
                    rect: Rect::new(
                        row.x + padding[0],
                        round_y(row.y + padding[1]),
                        (row.width - padding[0] - padding[2]).max(0.),
                        (overlays::contract()["menuLayout"]["separatorHeight"]
                            .as_f64()
                            .unwrap()
                            * self.dpr)
                            .round_ties_even()
                            / self.dpr,
                    ),
                    color: overlays::brush(n.theme, "MenuFlyoutSeparatorBackground").solid_color(),
                    radius: 0.,
                });
                continue;
            }
            let selected = n.overlay.selected == Some(i);
            let opened = n
                .overlay
                .submenus
                .get(&i)
                .is_some_and(|child| self.nodes.get(child).is_some_and(|n| n.props.is_open));
            let state = if !e.enabled {
                "Disabled"
            } else if selected
                && n.overlay.pressed == Some(i)
                && self.captured.is_some_and(|c| c.1 == id)
            {
                "Pressed"
            } else if opened {
                "SubMenuOpened"
            } else if selected {
                "PointerOver"
            } else {
                "Normal"
            };
            let color = |part: &str| {
                if state == "Normal" && matches!(part, "TextBlock" | "IconContent") {
                    if let Some(fg) = &n.props.foreground {
                        return Self::color(fg, n.theme);
                    }
                }
                overlays::brush(n.theme, &part_resource(e.kind, part, state)).solid_color()
            };
            if selected || opened {
                out.push(Draw::Fill {
                    rect: Rect::new(
                        round_x(row.x + margin[0]),
                        round_y(row.y + margin[1]),
                        (row.width - margin[0] - margin[2]).max(0.),
                        (row.height - margin[1] - margin[3]).max(0.),
                    ),
                    color: color("LayoutRoot"),
                    radius: 4.,
                });
            }
            let draw_text = |out: &mut Vec<Draw>,
                             layout: &TextLayout,
                             slot: Rect,
                             size: f64,
                             family: &str,
                             foreground: String,
                             weight: u16,
                             style: FontStyle,
                             rtl_text: bool| {
                out.push(Draw::Clip { rect: slot });
                for line in &layout.lines {
                    let x = if rtl_text {
                        slot.x + slot.width - line.width
                    } else {
                        slot.x
                    };
                    out.push(Draw::Text {
                        style,
                        x,
                        y: slot.y + line.baseline,
                        text: line.text.clone(),
                        color: foreground.clone(),
                        size,
                        font: family.into(),
                        max_width: if rtl_text { line.width } else { slot.width },
                        weight,
                    });
                }
                out.push(Draw::Restore);
            };
            draw_text(
                out,
                &n.overlay.labels[i],
                parts.label,
                n.props.font_size,
                &n.props.font_family,
                color("TextBlock"),
                n.props.font_weight,
                n.props.font_style,
                rtl,
            );
            if !e.icon.is_empty() {
                draw_text(
                    out,
                    &n.overlay.icons[i],
                    parts.icon,
                    16.,
                    "Segoe Fluent Icons",
                    color("IconContent"),
                    400,
                    FontStyle::Normal,
                    false,
                );
            }
            if e.checked {
                let layout = if e.kind == MenuEntryKind::Toggle {
                    &n.overlay.check_label
                } else {
                    &n.overlay.radio_label
                };
                draw_text(
                    out,
                    layout,
                    parts.check,
                    12.,
                    "Segoe Fluent Icons",
                    color("CheckGlyph"),
                    400,
                    FontStyle::Normal,
                    false,
                );
            }
            draw_text(
                out,
                &n.overlay.shortcuts[i],
                parts.shortcut,
                menu_item_controls::radio_template()["shortcutSize"]
                    .as_f64()
                    .unwrap(),
                &n.props.font_family,
                color("KeyboardAcceleratorTextBlock"),
                400,
                FontStyle::Normal,
                rtl,
            );
            if e.kind == MenuEntryKind::Submenu {
                if rtl {
                    out.push(Draw::Save);
                    out.push(Draw::Transform {
                        matrix: [
                            -1.,
                            0.,
                            0.,
                            1.,
                            parts.chevron.x * 2. + parts.chevron.width,
                            0.,
                        ],
                    });
                }
                draw_text(
                    out,
                    &n.overlay.chevron_label,
                    parts.chevron,
                    chevron_size(),
                    "Segoe Fluent Icons",
                    color("SubItemChevron"),
                    400,
                    FontStyle::Normal,
                    false,
                );
                if rtl {
                    out.push(Draw::Restore);
                }
            }
        }
        out.push(Draw::Restore);
    }
}
