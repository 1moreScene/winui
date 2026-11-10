use super::*;
pub(super) fn text(
    out: &mut Vec<Draw>,
    layout: &crate::typography::TextLayout,
    font: &Font,
    color: &str,
    r: Rect,
    center: bool,
) {
    for line in &layout.lines {
        out.push(Draw::Text {
            style: font.style,
            x: r.x
                + if center {
                    (r.width - line.width) / 2.
                } else {
                    0.
                },
            y: r.y + (r.height - layout.height) / 2. + line.baseline,
            text: line.text.clone(),
            color: color.into(),
            size: font.size,
            font: font.family.clone(),
            weight: font.weight,
            max_width: r.width,
        });
    }
}
fn fill(out: &mut Vec<Draw>, rect: Rect, color: String, radius: f64) {
    out.push(Draw::Fill {
        rect,
        color,
        radius,
    });
}
impl Scene {
    pub(in crate::scene) fn paint_navigation_control(
        &mut self,
        id: u32,
        out: &mut Vec<Draw>,
        chrome: bool,
    ) {
        if self.nodes[&id].kind==NodeKind::SelectorBar { self.paint_selector(id,out);return; }
        let n = &self.nodes[&id];
        let c = &n.nav_controls;
        let p = &n.props;
        let q = &p.nav_controls;
        let theme = n.theme;
        let is_tabs = n.kind == NodeKind::TabView;
        let mut tab_cache: HashMap<String, Vec<Draw>> = HashMap::new();
        if n.kind == NodeKind::TabView {
            let strip = Rect::new(0., 0., n.rect.width, 40.);
            fill(
                out,
                strip,
                q.tab_strip_background
                    .clone()
                    .unwrap_or_else(|| color(theme, "TabViewBackground")),
                0.,
            );
            if let Some(item) = usize::try_from(p.selected_index)
                .ok()
                .and_then(|i| q.items.get(i))
            {
                if let Some(background) = &item.background {
                    fill(
                        out,
                        Rect::new(0., 40., n.rect.width, (n.rect.height - 40.).max(0.)),
                        background.clone(),
                        0.,
                    );
                }
            }
            fill(
                out,
                Rect::new(0., 40. - 1. / self.dpr, n.rect.width, 1. / self.dpr),
                color(theme, "TabViewBorderBrush"),
                0.,
            );
        }
        for part in &c.parts {
            if !part.visible {
                continue;
            }
            // Template content is painted between page visuals and navigation chrome.
            // In-app Acrylic must see the final page, and must remain above it.
            if n.kind == NodeKind::FlipView && (part.role == "flipButton") != chrome {
                continue;
            }
            let hovered = c.hovered.as_ref() == Some(&part.key)
                || part.role == "tab"
                    && c.hovered.as_deref() == Some(&format!("close:{}", part.key));
            let pressed = c.pressed.as_ref().is_some_and(|(_, key)| key == &part.key);
            let disabled = !n.enabled || !part.enabled;
            let suffix = if disabled {
                "Disabled"
            } else if pressed {
                "Pressed"
            } else if hovered {
                "PointerOver"
            } else {
                ""
            };
            let r = part.rect;
            let tab = if part.role == "tab" {
                Some(part)
            } else if part.role == "closeTab" {
                c.parts
                    .iter()
                    .find(|p| p.role == "tab" && p.index == part.index)
            } else {
                None
            };
            if let Some(tab) = tab {
                Self::tab_visual_commands(&c.tab_visual(&tab.key, self.time), tab.rect, out);
            }
            let cache_start = out.len();
            match part.role.as_str() {
                "content" => text(
                    out,
                    &part.text,
                    &part.font,
                    &color(theme, "TextFillColorPrimaryBrush"),
                    part.rect,
                    false,
                ),
                "page" => {
                    let item = &q.items[part.index as usize];
                    if let Some(background) = &item.background {
                        fill(out, r, background.clone(), 0.);
                    }
                    if c.slots.contains_key(&(item.id.clone(), "content".into())) {
                        continue;
                    }
                    if !item.image_source.is_empty() {
                        if let Some(size) = self.images.get(&item.image_source) {
                            let scale = (r.width / size[0]).min(r.height / size[1]);
                            let w = size[0] * scale;
                            let h = size[1] * scale;
                            out.push(Draw::Image {
                                source: item.image_source.clone(),
                                rect: Rect::new(
                                    r.x + (r.width - w) / 2.,
                                    r.y + (r.height - h) / 2.,
                                    w,
                                    h,
                                ),
                            });
                        }
                    } else {
                        text(
                            out,
                            &part.text,
                            &part.font,
                            &color(theme, "TextFillColorPrimaryBrush"),
                            r,
                            true,
                        );
                    }
                }
                "flipButton" => {
                    let suffix = if disabled { "" } else { suffix };
                    let bg = brush(
                        theme,
                        &format!("FlipViewNextPreviousButtonBackground{suffix}"),
                    );
                    // FlipViewButtonBorderThemeThickness is 0 in Light/Default,
                    // 1 only in HighContrast. The brush existing does not imply a stroke.
                    let border = if theme == Theme::HighContrast {
                        overlays::border_thickness([1.; 4], self.dpr)[0]
                    } else {
                        0.
                    };
                    let radius = p.corner_radius;
                    let inner = Rect::new(
                        r.x + border,
                        r.y + border,
                        (r.width - 2. * border).max(0.),
                        (r.height - 2. * border).max(0.),
                    );
                    out.push(Draw::RoundedClip {
                        rect: inner,
                        radius: (radius - border).max(0.),
                    });
                    if bg.kind == "acrylic" {
                        out.push(Draw::Acrylic {
                            rect: inner,
                            recipe: crate::material::AcrylicOptions {
                                tint_color: bg.tint,
                                tint_opacity: bg.tint_opacity,
                                luminosity_opacity: bg.luminosity_opacity,
                                fallback_color: bg.fallback,
                            },
                            colors: None,
                            weight: if self.reduced_transparency || theme == Theme::HighContrast {
                                0.
                            } else {
                                1.
                            },
                        });
                    } else {
                        Self::brush_command(out, inner, (radius - border).max(0.), 0., &bg);
                    }
                    out.push(Draw::Restore);
                    if border > 0. {
                        out.push(Draw::Border {
                            rect: r,
                            thickness: [border; 4],
                            radius: [radius; 4],
                            color: color(
                                theme,
                                &format!("FlipViewNextPreviousButtonBorderBrush{suffix}"),
                            ),
                            background: None,
                        });
                    }
                    let fg = color(
                        theme,
                        &format!("FlipViewNextPreviousArrowForeground{suffix}"),
                    );
                    let scale = if pressed {
                        scalar("FlipViewButtonScalePressed")
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
                            r.x + r.width * (1. - scale) / 2.,
                            r.y + r.height * (1. - scale) / 2.,
                        ],
                    });
                    text(
                        out,
                        &part.text,
                        &part.font,
                        &fg,
                        Rect::new(0., 0., r.width, r.height),
                        true,
                    );
                    out.push(Draw::Restore);
                }
                "pip" => {
                    let count = if q.number_of_pages < 0 {
                        q.max_visible_pips as i32
                    } else {
                        q.number_of_pages.min(q.max_visible_pips as i32)
                    };
                    let base =
                        if q.previous_button_visibility == PipsPagerButtonVisibility::Collapsed {
                            0.
                        } else {
                            24.
                        };
                    let clip = if p.orientation == Orientation::Vertical {
                        Rect::new(0., base, 24., count as f64 * 12.)
                    } else {
                        Rect::new(base, 0., count as f64 * 12., 24.)
                    };
                    out.push(Draw::Clip { rect: clip });
                    let bg = color(
                        theme,
                        &format!("PipsPagerSelectionIndicatorBackground{suffix}"),
                    );
                    fill(out, r, bg, 4.);
                    let key = if disabled {
                        "PipsPagerSelectionIndicatorForegroundDisabled"
                    } else if pressed {
                        "PipsPagerSelectionIndicatorForegroundPressed"
                    } else if hovered {
                        "PipsPagerSelectionIndicatorForegroundPointerOver"
                    } else if part.selected {
                        "PipsPagerSelectionIndicatorForegroundSelected"
                    } else {
                        "PipsPagerSelectionIndicatorForeground"
                    };
                    out.push(Draw::Stroke {
                        rect: Rect::new(r.x + 0.5, r.y + 0.5, r.width - 1., r.height - 1.),
                        color: color(
                            theme,
                            &format!(
                                "PipsPagerSelectionIndicatorBorderBrush{}",
                                if suffix.is_empty() && part.selected {
                                    "Selected"
                                } else {
                                    suffix
                                }
                            ),
                        ),
                        radius: 3.5,
                        width: 1.,
                    });
                    // Official Content is FontIcon EA3B, not an analytic ellipse.
                    // Its hinted shape/sidebearings at 4/6 DIP are visible at fractional DPI.
                    // FontIcon receives a rounded DesiredSize before Grid alignment.
                    let width = ((part.text.width * self.dpr).ceil() / self.dpr) as f32 as f64;
                    let height = ((part.text.height * self.dpr).ceil() / self.dpr) as f32 as f64;
                    let glyph_rect = Rect::new(
                        ((r.x + (r.width - width) / 2.) * self.dpr + 0.5).floor() / self.dpr,
                        ((r.y + (r.height - height) / 2.) * self.dpr + 0.5).floor() / self.dpr,
                        part.text.width,
                        part.text.height,
                    );
                    text(
                        out,
                        &part.text,
                        &part.font,
                        &color(theme, key),
                        glyph_rect,
                        false,
                    );
                    out.push(Draw::Restore);
                }
                "pipButton" => {
                    fill(
                        out,
                        r,
                        color(
                            theme,
                            &format!("PipsPagerNavigationButtonBackground{suffix}"),
                        ),
                        4.,
                    );
                    out.push(Draw::Stroke {
                        rect: Rect::new(r.x + 0.5, r.y + 0.5, r.width - 1., r.height - 1.),
                        color: color(
                            theme,
                            &format!("PipsPagerNavigationButtonBorderBrush{suffix}"),
                        ),
                        radius: 3.5,
                        width: 1.,
                    });
                    out.push(Draw::Save);
                    let scale = if pressed {
                        scalar("PipsPagerNavigationButtonScalePressed")
                    } else {
                        1.
                    };
                    out.push(Draw::Transform {
                        matrix: [
                            scale,
                            0.,
                            0.,
                            scale,
                            r.x * (1. - scale) + r.width * (1. - scale) / 2.,
                            r.y * (1. - scale) + r.height * (1. - scale) / 2.,
                        ],
                    });
                    let fg = color(
                        theme,
                        &format!("PipsPagerNavigationButtonForeground{suffix}"),
                    );
                    if p.orientation == Orientation::Horizontal {
                        out.push(Draw::Save);
                        out.push(Draw::Transform {
                            matrix: [
                                0.,
                                -1.,
                                1.,
                                0.,
                                r.x + (r.width - r.height) / 2.,
                                r.y + (r.height + r.width) / 2.,
                            ],
                        });
                        text(
                            out,
                            &part.text,
                            &part.font,
                            &fg,
                            Rect::new(0., 0., r.width, r.height),
                            true,
                        );
                        out.push(Draw::Restore);
                    } else {
                        text(out, &part.text, &part.font, &fg, r, true);
                    }
                    out.push(Draw::Restore);
                }
                "breadcrumb" | "ellipsis" => {
                    let last = part.selected;
                    let fg_key = if disabled {
                        if last {
                            "BreadcrumbBarCurrentDisabledForegroundBrush"
                        } else {
                            "BreadcrumbBarDisabledForegroundBrush"
                        }
                    } else if pressed {
                        if last {
                            "BreadcrumbBarCurrentPressedForegroundBrush"
                        } else {
                            "BreadcrumbBarPressedForegroundBrush"
                        }
                    } else if hovered {
                        if last {
                            "BreadcrumbBarCurrentHoverForegroundBrush"
                        } else {
                            "BreadcrumbBarHoverForegroundBrush"
                        }
                    } else if last {
                        "BreadcrumbBarCurrentNormalForegroundBrush"
                    } else {
                        "BreadcrumbBarNormalForegroundBrush"
                    };
                    let caption_width = (r.width - if last { 0. } else { 16. }).max(0.);
                    let caption_x = if last {
                        r.x + (self.dpr + 0.5).floor() / self.dpr
                    } else {
                        ((r.x + (caption_width - part.text.width) / 2.) * self.dpr + 0.5).floor()
                            / self.dpr
                    };
                    let label = Rect::new(
                        caption_x,
                        if part.role == "ellipsis" {
                            r.y
                        } else {
                            r.y + (r.height
                                - scalar("BreadcrumbBarCaptionHeight") * part.font.size / 14.)
                                / 2.
                        },
                        (r.x + caption_width - caption_x).max(0.),
                        if part.role == "ellipsis" {
                            r.height
                        } else {
                            part.text.height
                        },
                    );
                    if !c.slots.contains_key(&(part.key.clone(), "header".into())) {
                        text(
                            out,
                            &part.text,
                            &part.font,
                            &color(theme, fg_key),
                            label,
                            false,
                        );
                    }
                    if !last {
                        if let Some(layout) = c.glyphs.get("breadcrumbChevron") {
                            text(
                                out,
                                layout,
                                &Font {
                                    family: "Segoe Fluent Icons".into(),
                                    size: 12.,
                                    ..Default::default()
                                },
                                &color(theme, "BreadcrumbBarNormalForegroundBrush"),
                                Rect::new(r.x + r.width - 16., r.y, 16., r.height),
                                true,
                            );
                        }
                    }
                }
                "tab" => {
                    let selected = part.selected;
                    let key = if disabled {
                        "TabViewItemHeaderBackgroundDisabled"
                    } else if selected {
                        "TabViewItemHeaderBackgroundSelected"
                    } else if pressed {
                        "TabViewItemHeaderBackgroundPressed"
                    } else if hovered {
                        "TabViewItemHeaderBackgroundPointerOver"
                    } else {
                        "TabViewItemHeaderBackground"
                    };
                    let bg = color(theme, key);
                    if selected {
                        // TabViewItem::UpdateTabGeometry: 4 DIP outward bottom corners,
                        // 8 DIP top corners and a -4 DIP Path margin.
                        let geometry=crate::icons::parse_path(&format!("M {},{} a4,4 0 0 0 4,-4 L {},{} a8,8 0 0 1 8,-8 l{},0 a8,8 0 0 1 8,8 l0,20 a4,4 0 0 0 4,4 Z",r.x-4.,r.y+32.,r.x,r.y+8.,(r.width-16.).max(0.))).unwrap();
                        out.push(Draw::VectorPath {
                            rect: geometry.bounds,
                            geometry,
                            color: bg,
                        });
                        let left = r.x - 1.;
                        let right = r.x + r.width + 1.;
                        let top = r.y;
                        let bottom = r.y + 31.;
                        let border=crate::icons::parse_path(&format!("M {left},{bottom} L {left},{} a8,8 0 0 1 8,-8 H {} a8,8 0 0 1 8,8 L {right},{bottom} L {},{bottom} L {},{} a7,7 0 0 0 -7,-7 H {} a7,7 0 0 0 -7,7 L {},{bottom} Z",top+8.,right-8.,right-1.,right-1.,top+8.,left+8.,left+1.)).unwrap();
                        let border_brush = brush(theme, "TabViewSelectedItemBorderBrush");
                        if border_brush.kind == "solid" {
                            out.push(Draw::VectorPath {
                                rect: border.bounds,
                                geometry: border,
                                color: border_brush.solid_color(),
                            });
                        } else {
                            out.push(Draw::PathBrush {
                                rect: Rect::new(left, top, right - left, 31.),
                                geometry: border,
                                brush: Box::new(border_brush),
                            });
                        }
                    } else {
                        fill(out, r, bg, 8.);
                    }
                    if selected {
                        fill(
                            out,
                            Rect::new(r.x, r.y + r.height - 1. / self.dpr, r.width, 1. / self.dpr),
                            color(theme, "TabViewItemHeaderBackgroundSelected"),
                            0.,
                        );
                    } else if part.index + 1 != p.selected_index {
                        fill(
                            out,
                            Rect::new(r.x + r.width - 1., r.y + 8., 1., 16.),
                            color(theme, "TabViewItemSeparator"),
                            0.,
                        );
                    }
                    let item = &q.items[part.index as usize];
                    let compact = q.tab_width_mode == TabViewWidthMode::Compact && !selected;
                    let start = r.x + if selected { 8. } else { 9. };
                    let icon = if item.icon.is_empty() && item.image_source.is_empty() {
                        0.
                    } else {
                        26.
                    };
                    let fg = color(
                        theme,
                        if disabled {
                            "TabViewItemHeaderForegroundDisabled"
                        } else if selected {
                            "TabViewItemHeaderForegroundSelected"
                        } else if pressed {
                            "TabViewItemHeaderForegroundPressed"
                        } else if hovered {
                            "TabViewItemHeaderForegroundPointerOver"
                        } else {
                            "TabViewItemHeaderForeground"
                        },
                    );
                    if !item.image_source.is_empty() {
                        if self.images.contains_key(&item.image_source) {
                            out.push(Draw::Image {
                                source: item.image_source.clone(),
                                rect: Rect::new(start, r.y + 8., 16., 16.),
                            });
                        }
                    } else if icon > 0. {
                        if let Some(layout) = c.glyphs.get(&item.icon) {
                            text(
                                out,
                                layout,
                                &Font {
                                    family: "Segoe Fluent Icons".into(),
                                    size: 16.,
                                    ..Default::default()
                                },
                                &fg,
                                Rect::new(start, r.y, 16., r.height),
                                true,
                            );
                        }
                    }
                    if !compact && !c.slots.contains_key(&(item.id.clone(), "header".into())) {
                        text(
                            out,
                            &part.text,
                            &part.font,
                            &fg,
                            Rect::new(
                                start + icon,
                                r.y,
                                (r.width
                                    - if selected { 14. } else { 12. }
                                    - icon
                                    - if item.is_closable { 36. } else { 0. })
                                .max(0.),
                                r.height,
                            ),
                            false,
                        );
                    }
                }
                "closeTab" | "addTab" | "tabScroll" => {
                    let prefix = if part.role == "closeTab" {
                        "TabViewItemHeaderCloseButton"
                    } else {
                        "TabViewButton"
                    };
                    let parent_hover = part.role == "closeTab"
                        && q.items
                            .get(part.index as usize)
                            .is_some_and(|item| c.hovered.as_ref() == Some(&item.id));
                    let parent_pressed = part.role == "closeTab"
                        && q.items.get(part.index as usize).is_some_and(|item| {
                            c.pressed.as_ref().is_some_and(|(_, key)| key == &item.id)
                        });
                    let parent_state = if disabled {
                        Some("Disabled")
                    } else if hovered || pressed {
                        None
                    } else if part.index == p.selected_index {
                        Some("Selected")
                    } else if parent_pressed {
                        Some("Pressed")
                    } else if parent_hover {
                        Some("PointerOver")
                    } else {
                        None
                    };
                    let (background, foreground) = if part.role == "closeTab" {
                        if let Some(state) = parent_state {
                            (
                                format!("TabViewItemHeader{state}CloseButtonBackground"),
                                format!("TabViewItemHeader{state}CloseButtonForeground"),
                            )
                        } else {
                            (
                                format!("{prefix}Background{suffix}"),
                                format!("{prefix}Foreground{suffix}"),
                            )
                        }
                    } else {
                        (
                            format!("{prefix}Background{suffix}"),
                            format!("{prefix}Foreground{suffix}"),
                        )
                    };
                    fill(out, r, color(theme, &background), 4.);
                    if part.role == "closeTab" && theme == Theme::HighContrast {
                        out.push(Draw::Stroke {
                            rect: Rect::new(r.x + 0.5, r.y + 0.5, r.width - 1., r.height - 1.),
                            color: color(
                                theme,
                                &format!("TabViewItemHeaderCloseButtonBorderBrush{suffix}"),
                            ),
                            radius: 3.5,
                            width: 1.,
                        });
                    }
                    text(
                        out,
                        &part.text,
                        &part.font,
                        &color(theme, &foreground),
                        r,
                        true,
                    );
                }
                _ => {}
            }
            if let Some(tab) = tab {
                tab_cache
                    .entry(tab.key.clone())
                    .or_default()
                    .extend(out[cache_start..].iter().cloned());
                out.push(Draw::Restore);
                out.push(Draw::EndLayer);
            }
        }
        if is_tabs {
            self.paint_tab_ghosts(id, out);
            self.nodes.get_mut(&id).unwrap().nav_controls.tab_cache = tab_cache;
        }
    }
    pub(in crate::scene) fn paint_navigation_tree_item(
        &self,
        id: u32,
        out: &mut Vec<Draw>,
    ) -> Option<String> {
        let n = &self.nodes[&id];
        let owner = n.props.collection_owner?;
        let root = &self.nodes[&owner];
        if root.kind != NodeKind::TreeView {
            return None;
        }
        let row = root.nav_controls.tree_rows.get(&n.props.collection_key)?;
        // Collection rows do not track Button's pointer state. Use the current
        // hit route so checkbox/template descendants hover their row, while
        // clipped rows and rows behind another surface remain unhovered.
        let hovered = self.pointer.is_some_and(|(x, y)| {
            self.inside(id, x, y) && self.pointer_route(x, y).contains(&id)
        });
        let pressed = root.collection.pressed.as_ref() == Some(&row.key);
        let selected = row.selected;
        let enabled = n.enabled;
        let suffix = if !enabled {
            if selected {
                "SelectedDisabled"
            } else {
                "Disabled"
            }
        } else if selected {
            if pressed {
                "SelectedPressed"
            } else if hovered {
                "SelectedPointerOver"
            } else {
                "Selected"
            }
        } else if pressed {
            "Pressed"
        } else if hovered {
            "PointerOver"
        } else {
            ""
        };
        let r = Rect::new(
            4.,
            2.,
            (n.rect.width - 8.).max(0.),
            (n.rect.height - 4.).max(0.),
        );
        fill(
            out,
            r,
            color(n.theme, &format!("TreeViewItemBackground{suffix}")),
            4.,
        );
        let foreground = color(
            n.theme,
            if !enabled {
                "TreeViewItemForegroundDisabled"
            } else if selected {
                "TreeViewItemForegroundSelected"
            } else {
                "TreeViewItemForeground"
            },
        );
        let depth = row.depth as f64 * 16.;
        let multiple =
            root.props.nav_controls.tree_selection_mode == TreeViewSelectionMode::Multiple;
        let rtl = self.effective_flow_direction(owner) == FlowDirection::RightToLeft;
        if rtl {
            out.push(Draw::Save);
            out.push(Draw::Transform {
                matrix: [-1., 0., 0., 1., n.rect.width, 0.],
            });
        }
        let (_, chevron, _) = tree_columns(self.dpr, multiple);
        if row.has_children {
            let glyph = if row.expanded {
                "treeExpanded"
            } else {
                "treeCollapsed"
            };
            if let Some(layout) = root.nav_controls.glyphs.get(glyph) {
                text(
                    out,
                    layout,
                    &Font {
                        family: "Segoe Fluent Icons".into(),
                        size: 8.,
                        ..Default::default()
                    },
                    &foreground,
                    Rect::new(
                        chevron + depth,
                        0.,
                        if multiple { 12. } else { 40. },
                        n.rect.height,
                    ),
                    true,
                );
            }
        }
        if root.props.nav_controls.tree_selection_mode == TreeViewSelectionMode::Single
            && n.collection.indicator_opacity.value(self.time) > 0.
        {
            let h = n.collection.indicator_layout_height;
            let scale = n.collection.indicator_scale.value(self.time);
            out.push(Draw::Layer {
                opacity: n.collection.indicator_opacity.value(self.time),
            });
            out.push(Draw::Save);
            out.push(Draw::Transform {
                matrix: [1., 0., 0., scale, 0., n.rect.height / 2. * (1. - scale)],
            });
            fill(
                out,
                Rect::new(4., (n.rect.height - h) / 2., 3., h),
                color(
                    n.theme,
                    if !enabled {
                        "TreeViewItemSelectionIndicatorForegroundDisabled"
                    } else if pressed {
                        "TreeViewItemSelectionIndicatorForegroundPressed"
                    } else if hovered {
                        "TreeViewItemSelectionIndicatorForegroundPointerOver"
                    } else {
                        "TreeViewItemSelectionIndicatorForeground"
                    },
                ),
                1.5,
            );
            out.push(Draw::Restore);
            out.push(Draw::EndLayer);
        }
        if rtl {
            out.push(Draw::Restore);
        }
        Some(foreground)
    }
}
