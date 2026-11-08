use super::*;
fn ceil(v: f64, dpr: f64) -> f64 {
    ((v * dpr - 1e-8).ceil() / dpr).max(0.)
}
impl Scene {
    pub(in crate::scene) fn measure_command(
        &mut self,
        id: u32,
        available: [f64; 2],
        measure: &mut impl TextMeasurer,
    ) -> [f64; 2] {
        let n = &self.nodes[&id];
        let k = n.kind;
        let floating=self.in_command_bar_flyout(id);
        let p = n.props.clone();
        let q = &p.command_controls;
        if k==NodeKind::AppBarSeparator {
            return if n.command.in_overflow {[0.,1.]}else{[1.,if q.is_compact {32.}else{0.}]};
        }
        if k == NodeKind::CommandBar {
            let children = n.command.primary.values().copied().collect::<Vec<_>>();
            let mut total = 48.;
            for child in children {
                let d = self.measure_node(child, [f64::INFINITY, 64.], measure);
                total += d[0];
            }
            return [
                if available[0].is_finite() {
                    available[0]
                } else {
                    total
                },
                match q.closed_display_mode {
                    CommandBarClosedDisplayMode::Hidden if !p.is_open => 0.,
                    CommandBarClosedDisplayMode::Minimal if !p.is_open => 24.,
                    _ => if floating{super::super::command_menus::flyout_metric("rowHeight")}else{48.},
                },
            ];
        }
        let font = Font {
            size: if k == NodeKind::DropDownButton {
                p.font_size
            } else if n.command.in_overflow {
                14.
            } else {
                12.
            },
            ..p.font()
        };
        let text = if q.label.is_empty() {
            &p.text
        } else {
            &q.label
        };
        let label = typography::layout(
            text,
            &font,
            if k == NodeKind::AppBarButton || k == NodeKind::AppBarToggleButton {
                if n.command.in_overflow
                    || q.default_label_position == CommandBarDefaultLabelPosition::Right
                {
                    f64::INFINITY
                } else {
                    64.
                }
            } else {
                available[0].max(0.)
            },
            k != NodeKind::DropDownButton
                && !n.command.in_overflow
                && !(q.inside_bar
                    && q.default_label_position == CommandBarDefaultLabelPosition::Right),
            TextTrimming::Clip,
            None,
            measure,
        );
        let shortcut = q
            .keyboard_accelerators
            .first()
            .map(|a| {
                a.modifiers
                    .iter()
                    .map(|m| match m {
                        KeyboardAcceleratorModifier::Control => "Ctrl",
                        KeyboardAcceleratorModifier::Shift => "Shift",
                        KeyboardAcceleratorModifier::Alt => "Alt",
                    })
                    .chain(std::iter::once(a.key.as_str()))
                    .collect::<Vec<_>>()
                    .join("+")
            })
            .unwrap_or_default();
        let shortcut = typography::layout(
            &shortcut,
            &Font {
                size: 12.,
                ..p.font()
            },
            f64::INFINITY,
            false,
            TextTrimming::Clip,
            None,
            measure,
        );
        let shortcut_width = if shortcut.lines.first().is_some_and(|l| !l.text.is_empty()) {
            shortcut.width + 36.
        } else {
            0.
        };
        let menu_icons = n.command.overflow_icons;
        let menu_toggles = n.command.overflow_toggles;
        let width = label.width;
        let height = label.height;
        let overflow = n.command.in_overflow;
        let inside = q.inside_bar;
        let right = q.default_label_position == CommandBarDefaultLabelPosition::Right;
        let compact = q.is_compact;
        let children = n.children.clone();
        let icon = n.command.icon;
        let arrow = n.command.chevron;
        let mut content = [0_f64; 2];
        for child in children {
            if overlays::is_overlay(self.nodes[&child].kind)
                || Some(child) == icon
                || Some(child) == arrow
            {
                continue;
            }
            let d = self.measure_node(child, [f64::INFINITY, f64::INFINITY], measure);
            content = [content[0].max(d[0]), content[1].max(d[1])];
        }
        self.nodes.get_mut(&id).unwrap().command.label = label;
        self.nodes.get_mut(&id).unwrap().command.shortcut = shortcut;
        if k == NodeKind::DropDownButton {
            // XAML rounds the child advance before the Button template adds
            // physical-pixel border thickness, then rounds the outer Size.
            let b = overlays::border_thickness(p.border_thickness, self.dpr);
            let logical = crate::button::defaults().border_thickness;
            let round = |v: f64| (v * self.dpr).round_ties_even() / self.dpr;
            let outer_width = round(
                ceil(width.max(content[0]), self.dpr)
                    + 20.
                    + p.padding[0]
                    + p.padding[2]
                    + b[0]
                    + b[2],
            );
            let outer_height =
                round(height.max(content[1]).max(12.) + p.padding[1] + p.padding[3] + b[1] + b[3])
                    .max(32.);
            return [
                (outer_width - p.padding[0] - p.padding[2] - 2. * logical).max(0.),
                (outer_height - p.padding[1] - p.padding[3] - 2. * logical).max(0.),
            ];
        }
        if overflow {
            return [
                width
                    + 24.
                    + if menu_icons { 26.4 } else { 0. }
                    + if menu_toggles { 26.4 } else { 0. }
                    + shortcut_width
                    + if p.flyout_target.is_some() { 20. } else { 0. },
                32_f64.max(height + 13.),
            ];
        }
        if floating&&!overflow{return [super::super::command_menus::flyout_metric("primaryWidth"),super::super::command_menus::flyout_metric("actionHeight")];}
        [
            if right && inside { width + 48. } else { 68. },
            if inside {
                if compact
                    || right
                    || q.default_label_position == CommandBarDefaultLabelPosition::Collapsed
                {
                    48.
                } else {
                    64_f64.max(42. + height)
                }
            } else if compact || q.label_position == CommandBarLabelPosition::Collapsed {
                64.
            } else {
                64_f64.max(42. + height)
            },
        ]
    }
    pub(in crate::scene) fn arrange_command(
        &mut self,
        id: u32,
        rect: Rect,
        measure: &mut impl TextMeasurer,
    ) {
        if self.nodes[&id].kind==NodeKind::AppBarSeparator {
            self.nodes.get_mut(&id).unwrap().command.body=rect;
            return;
        }
        if self.nodes[&id].kind == NodeKind::CommandBar {
            self.arrange_command_bar(id, rect, measure);
            return;
        }
        let n = &self.nodes[&id];
        let k = n.kind;
        let p = n.props.clone();
        let q = &p.command_controls;
        let overflow = n.command.in_overflow;
        let right =
            q.inside_bar && q.default_label_position == CommandBarDefaultLabelPosition::Right;
        let compact = q.is_compact;
        let icon = n.command.icon;
        let arrow = n.command.chevron;
        let children = n.children.clone();
        let inherited = (n.theme, n.enabled, n.visible);
        let world = n.world;
        let w = rect.width;
        let h = rect.height;
        let label_h = n.command.label.height;
        let label_hidden = !self.in_command_bar_flyout(id)&&(q.label_position == CommandBarLabelPosition::Collapsed
            || q.default_label_position == CommandBarDefaultLabelPosition::Collapsed
            || compact && !right);
        let (body, icon_rect, label_rect, content) = if self.in_command_bar_flyout(id)&&!overflow {
            (Rect::new(2.,2.,(w-4.).max(0.),(h-4.).max(0.)),Rect::new((w-16.)/2.,super::super::command_menus::flyout_metric("iconY"),16.,16.),Rect::new(2.,super::super::command_menus::flyout_metric("labelY"),(w-4.).max(0.),label_h),Rect::new(2.,2.,(w-4.).max(0.),(h-4.).max(0.)))
        }else if k == NodeKind::DropDownButton {
            let b = overlays::border_thickness(p.border_thickness, self.dpr);
            let round = |v: f64| (v * self.dpr).round_ties_even() / self.dpr;
            let x = round(p.padding[0] + b[0]);
            let y = round(p.padding[1] + b[1]);
            let width = round((w - p.padding[0] - p.padding[2] - b[0] - b[2] - 20.).max(0.));
            let height = round((h - p.padding[1] - p.padding[3] - b[1] - b[3]).max(0.));
            let content = Rect::new(x, y, width, height);
            (Rect::new(0., 0., w, h), Rect::default(), content, content)
        } else if overflow {
            (
                Rect::new(4., 0., (w - 8.).max(0.), h),
                Rect::new(
                    if n.command.overflow_toggles {
                        38.4
                    } else {
                        12.
                    },
                    (h - 16.) / 2.,
                    16.,
                    16.,
                ),
                Rect::new(
                    12. + if n.command.overflow_icons { 26.4 } else { 0. }
                        + if n.command.overflow_toggles { 26.4 } else { 0. },
                    5.,
                    (w - 24.
                        - if n.command.overflow_icons { 26.4 } else { 0. }
                        - if n.command.overflow_toggles { 26.4 } else { 0. }
                        - if n.command.shortcut.width > 0. {
                            n.command.shortcut.width + 36.
                        } else {
                            0.
                        })
                    .max(0.),
                    label_h,
                ),
                Rect::new(12., (h - 16.) / 2., 16., 16.),
            )
        } else {
            let y = if label_hidden && q.inside_bar && !right {
                12.
            } else {
                16.
            };
            let icon = Rect::new(
                if right {
                    12.
                } else {
                    ceil((w - 16.) / 2., self.dpr)
                },
                y,
                16.,
                16.,
            );
            (
                Rect::new(
                    ceil(2., self.dpr),
                    ceil(6., self.dpr),
                    ceil((w - 4.).max(0.), self.dpr),
                    ceil(
                        (h - if compact && !q.inside_bar { 28. } else { 12. }).max(0.),
                        self.dpr,
                    ),
                ),
                icon,
                if label_hidden {
                    Rect::default()
                } else if right {
                    Rect::new(36., 16., (w - 48.).max(0.), label_h)
                } else {
                    Rect::new(
                        ceil(2., self.dpr),
                        ceil(34., self.dpr),
                        (w - 4.).max(0.),
                        label_h,
                    )
                },
                icon,
            )
        };
        {
            let c = &mut self.nodes.get_mut(&id).unwrap().command;
            c.body = body;
            c.icon_rect = icon_rect;
            c.label_rect = label_rect;
            c.content = content;
        }
        for child in children {
            if overlays::is_overlay(self.nodes[&child].kind) {
                continue;
            }
            let slot = if Some(child) == icon {
                icon_rect
            } else if Some(child) == arrow && k != NodeKind::DropDownButton {
                if overflow {
                    Rect::new((w - 28.).max(0.), (h - 12.) / 2., 12., 12.)
                } else {
                    Rect::new((w - 20.).max(0.), 20., 8., 8.)
                }
            } else if Some(child) == arrow {
                Rect::new(
                    content.x + content.width + 8.,
                    content.y + (content.height - 12.) / 2.,
                    12.,
                    12.,
                )
            } else {
                content
            };
            if Some(child) == icon {
                self.nodes.get_mut(&child).unwrap().props.width = Some(slot.width);
                self.nodes.get_mut(&child).unwrap().props.height = Some(slot.height);
            }
            self.measure_node(child, [slot.width, slot.height], measure);
            self.arrange_node(child, slot, world, inherited, measure);
        }
    }
    fn arrange_command_bar(&mut self, id: u32, r: Rect, measure: &mut impl TextMeasurer) {
        let floating=self.in_command_bar_flyout(id);let row_height=if floating{super::super::command_menus::flyout_metric("rowHeight")}else{48.};
        let n = &self.nodes[&id];
        let p = n.props.clone();
        let q = &p.command_controls;
        let world = n.world;
        let inherited = (n.theme, n.enabled, n.visible);
        let more = n.command.more.unwrap();
        let popup = n.command.popup.unwrap();
        let panel = n.command.overflow_panel.unwrap();
        let map = n.command.primary.clone();
        let mut inline = q
            .primary_commands
            .iter()
            .filter(|i| i.visible)
            .map(|i| i.id.clone())
            .collect::<Vec<_>>();
        let mut overflow = vec![];
        let mut widths = HashMap::new();
        let expanded=self.command_expanded_template(id);
        let mut expanded_height=64f64;
        for key in &inline {
            let child = map[key];
            self.nodes.get_mut(&child).unwrap().props.visible = true;
            self.nodes.get_mut(&child).unwrap().command.in_overflow = false;
            self.nodes
                .get_mut(&child)
                .unwrap()
                .props
                .horizontal_alignment = HorizontalAlignment::Left;
            let d = self.measure_node(child, [f64::INFINITY, 64.], measure);
            if !self.nodes[&child].command.separator{expanded_height=expanded_height.max(d[1]);}
            widths.insert(key.clone(), d[0]);
        }
        let mut content = [0_f64; 2];
        let custom = self.nodes[&id]
            .children
            .iter()
            .filter(|c| {
                self.nodes[c].command.owner.is_none_or(|o| o != id)
                    && !overlays::is_overlay(self.nodes[c].kind)
            })
            .copied()
            .collect::<Vec<_>>();
        for child in &custom {
            let d = self.measure_node(*child, [r.width, 48.], measure);
            content = [content[0].max(d[0]), content[1].max(d[1])];
        }
        let needs_more = q.overflow_button_visibility
            == CommandBarOverflowButtonVisibility::Visible
            || q.overflow_button_visibility == CommandBarOverflowButtonVisibility::Auto
                && (!q.secondary_commands.is_empty()
                    || q.default_label_position == CommandBarDefaultLabelPosition::Bottom
                        && !inline.is_empty()
                    || q.closed_display_mode != CommandBarClosedDisplayMode::Compact
                    || inline.iter().map(|k| widths[k]).sum::<f64>() + content[0] > r.width);
        let more_button_width=if floating{super::super::command_menus::flyout_metric("moreWidth")}else{48.};
        let more_width=if needs_more{more_button_width+if floating{self.dpr.round()/self.dpr}else{0.}}else{0.};
        let available = (r.width - more_width - content[0]).max(0.);
        if q.is_dynamic_overflow_enabled {
            while inline.iter().map(|k| widths[k]).sum::<f64>() > available && !inline.is_empty() {
                let positive = q
                    .primary_commands
                    .iter()
                    .filter(|i| inline.contains(&i.id) && i.dynamic_overflow_order > 0)
                    .map(|i| i.dynamic_overflow_order)
                    .min();
                let remove = if let Some(order) = positive {
                    q.primary_commands
                        .iter()
                        .filter(|i| i.dynamic_overflow_order == order && inline.contains(&i.id))
                        .map(|i| i.id.clone())
                        .collect::<Vec<_>>()
                } else {
                    vec![inline.last().unwrap().clone()]
                };
                for key in remove {
                    inline.retain(|k| k != &key);
                    overflow.push(key);
                }
            }
        }
        // Overflowed primary commands retain original declaration order, before secondary.
        overflow = q
            .primary_commands
            .iter()
            .filter(|i| overflow.contains(&i.id))
            .map(|i| i.id.clone())
            .chain(
                q.secondary_commands
                    .iter()
                    .filter(|i| i.visible)
                    .map(|i| i.id.clone()),
            )
            .collect();
        let menu_icons = overflow
            .iter()
            .any(|key| self.nodes[&map[key]].props.icon_source.is_some());
        let menu_toggles = overflow
            .iter()
            .any(|key| self.nodes[&map[key]].kind == NodeKind::AppBarToggleButton);
        for key in &overflow {
            let c = &mut self.nodes.get_mut(&map[key]).unwrap().command;
            c.overflow_icons = menu_icons;
            c.overflow_toggles = menu_toggles;
        }
        let mut at = r.width - more_width - inline.iter().map(|k| widths[k]).sum::<f64>();
        let row_h =
            if floating {row_height} else if expanded && q.default_label_position == CommandBarDefaultLabelPosition::Bottom {
                expanded_height
            } else {
                48.
            };
        self.nodes.get_mut(&id).unwrap().command.body=Rect::new(0.,0.,r.width,row_h);
        for key in &inline {
            let child = map[key];
            if self.nodes[&child].command.separator {
                self.nodes.get_mut(&child).unwrap().props.height = Some(row_h);
            }
            if self.nodes[&child].parent != Some(id) {
                let _ = self.reparent(child, id, None);
            }
            self.nodes.get_mut(&child).unwrap().command.in_overflow = false;
            self.nodes.get_mut(&child).unwrap().props.visible = true;
            let inset=if floating{super::super::command_menus::flyout_metric("primaryVerticalInset")}else{0.};
            let rect = Rect::new(at, inset, widths[key], row_h-2.*inset);
            self.arrange_node(child, rect, world, inherited, measure);
            at += widths[key];
        }
        let primary_count = overflow
            .iter()
            .filter(|key| q.primary_commands.iter().any(|item| &item.id == *key))
            .count();
        let separator = self.nodes[&id].command.overflow_separator.unwrap();
        let has_separator = primary_count > 0 && overflow.len() > primary_count;
        let separator_height = 8. + self.dpr.round() / self.dpr;
        if self.nodes[&separator].props.visible != has_separator
            || self.nodes[&separator].props.height != Some(separator_height)
        {
            let _ = self.update(vec![Update {
                id: separator,
                patch: json!({"visible":has_separator,"height":separator_height}),
            }]);
        }
        for (index, key) in overflow.iter().enumerate() {
            let index = index + usize::from(has_separator && index >= primary_count);
            let child = map[key];
            if self.nodes[&child].parent != Some(panel)
                || self.nodes[&panel].children.get(index) != Some(&child)
            {
                let _ = self.reparent(child, panel, Some(index));
            }
            let n = self.nodes.get_mut(&child).unwrap();
            n.command.in_overflow = true;
            n.props.horizontal_alignment = HorizontalAlignment::Stretch;
            if n.command.separator {
                n.props.width = None;
                n.props.height = Some(separator_height);
            }
        }
        if has_separator && self.nodes[&panel].children.get(primary_count) != Some(&separator) {
            let _ = self.reparent(separator, panel, Some(primary_count));
        }
        for key in &inline {
            let child = map[key];
            if self.nodes[&child].command.separator {
                let n = self.nodes.get_mut(&child).unwrap();
                n.props.width = Some(5.);
                n.props.height = Some(row_h);
            }
        }
        let hidden = !expanded && q.closed_display_mode != CommandBarClosedDisplayMode::Compact;
        if hidden {
            for key in &inline {
                self.nodes.get_mut(&map[key]).unwrap().props.visible = false;
            }
        }
        for child in custom {
            self.arrange_node(
                child,
                Rect::new(4., 0., (at - 4.).max(0.), 48.),
                world,
                inherited,
                measure,
            );
        }
        self.nodes.get_mut(&more).unwrap().props.visible = needs_more
            && (!hidden || q.closed_display_mode == CommandBarClosedDisplayMode::Minimal);
        self.nodes.get_mut(&more).unwrap().props.height = Some(if hidden { 24. } else { row_h });
        self.arrange_node(
            more,
            Rect::new(
                (r.width - more_width).max(0.),
                0.,
                more_button_width,
                if hidden { 24. } else { row_h },
            ),
            world,
            inherited,
            measure,
        );
        let changed = self.nodes[&id].command.overflow != overflow;
        {
            let c = &mut self.nodes.get_mut(&id).unwrap().command;
            c.inline = inline;
            c.overflow = overflow;
        }
        if changed {
            self.emit(id, EventKind::ItemsChanged);
            self.events.last_mut().unwrap().payload = Some(
                json!({"command":{"action":"overflow","ids":self.nodes[&id].command.overflow}}),
            );
        }
        let popup_open = p.is_open && !self.nodes[&id].command.overflow.is_empty();
        let pp = &self.nodes[&popup].props;
        if pp.is_open != popup_open {
            let _ = self.update(vec![Update {
                id: popup,
                patch: json!({"isOpen":popup_open,"minWidth":if floating{r.width}else{160.},"placementTarget":id}),
            }]);
        }
    }
}
