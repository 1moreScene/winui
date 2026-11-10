use super::*;
use crate::{
    render::Draw,
    resources::{Brush, Resources},
};
impl Scene {
    fn paint_icon(&self, id: u32, foreground: &str, out: &mut Vec<Draw>) {
        let n = &self.nodes[&id];
        let Some((kind, p)) = crate::icon_source::resolve(n.kind, &n.props) else {
            return;
        };
        let color = p
            .foreground
            .as_ref()
            .map(|b| Self::color(b, n.theme))
            .unwrap_or_else(|| foreground.into());
        let color=self.picker_icon_foreground(id).unwrap_or(color);
        let foreground = color.as_str();
        let r = Rect::new(0., 0., n.rect.width, n.rect.height);
        out.push(Draw::Clip { rect: r });
        if p.flow_direction == FlowDirection::RightToLeft
            && ((kind == NodeKind::FontIcon && p.mirrored_when_right_to_left)
                || (kind == NodeKind::AnimatedIcon && !p.mirrored_when_right_to_left))
        {
            out.push(Draw::Transform {
                matrix: [-1., 0., 0., 1., r.width, 0.],
            });
        }
        match kind {
            NodeKind::AnimatedIcon => {
                let source = serde_json::from_value(p.source.clone().into()).unwrap();
                let size = crate::animated_icon::size(source);
                if size[0] > 0. && size[1] > 0. {
                    let scale = (r.width / size[0]).min(r.height / size[1]);
                    out.push(Draw::Save);
                    out.push(Draw::Transform {
                        matrix: [
                            scale,
                            0.,
                            0.,
                            scale,
                            (r.width - size[0] * scale) / 2.,
                            (r.height - size[1] * scale) / 2.,
                        ],
                    });
                    crate::animated_icon::draw(
                        source,
                        n.animated_icon.progress(self.time),
                        foreground,
                        out,
                    );
                    out.push(Draw::Restore);
                }
            }
            NodeKind::FontIcon | NodeKind::SymbolIcon => {
                let x = ((r.width - n.text.width) / 2. * self.dpr).round() / self.dpr;
                let y = ((r.height - n.text.height) / 2. * self.dpr).round() / self.dpr;
                for line in &n.text.lines {
                    out.push(Draw::Text {
                        style: p.font_style,
                        x,
                        y: y + line.baseline,
                        text: line.text.clone(),
                        color: foreground.into(),
                        size: p.font_size,
                        font: p.font_family.clone(),
                        max_width: (r.width - x).max(0.),
                        weight: p.font_weight,
                    });
                }
            }
            NodeKind::PathIcon => out.push(Draw::VectorPath {
                rect: r,
                geometry: n.icon_path.clone().unwrap(),
                color: foreground.into(),
            }),
            NodeKind::BitmapIcon | NodeKind::ImageIcon => {
                let source = crate::icons::source(&p, kind);
                if let Some(size) = self.images.get(source) {
                    let scale = (r.width / size[0]).min(r.height / size[1]);
                    let w = size[0] * scale;
                    let h = size[1] * scale;
                    let rect = Rect::new((r.width - w) / 2., (r.height - h) / 2., w, h);
                    if kind == NodeKind::BitmapIcon && p.show_as_monochrome {
                        out.push(Draw::TintedImage {
                            rect,
                            source: source.into(),
                            color: foreground.into(),
                        });
                    } else {
                        out.push(Draw::Image {
                            rect,
                            source: source.into(),
                        });
                    }
                }
            }
            _ => unreachable!(),
        }
        out.push(Draw::Restore);
    }
    pub fn display_list(&mut self) -> Vec<Draw> {
        let mut out = self.base_display_list();
        out.extend(self.floating_display_list());
        out
    }
    pub fn floating_surface_bounds(&self) -> Rect {
        let mut left = f64::INFINITY;
        let mut top = f64::INFINITY;
        let mut right = f64::NEG_INFINITY;
        let mut bottom = f64::NEG_INFINITY;
        for id in self.overlay_ids() {
            let r = self.popup_window_bounds(id);
            left = left.min(r.x);
            top = top.min(r.y);
            right = right.max(r.x + r.width);
            bottom = bottom.max(r.y + r.height);
        }
        if !left.is_finite() {
            return Rect::new(0., 0., 0., 0.);
        }
        let snap_down = |v: f64| (v * self.dpr).floor() / self.dpr;
        let snap_up = |v: f64| (v * self.dpr).ceil() / self.dpr;
        Rect::new(
            snap_down(left),
            snap_down(top),
            snap_up(right) - snap_down(left),
            snap_up(bottom) - snap_down(top),
        )
    }
    pub fn has_floating_surface(&self) -> bool {
        !self.overlay_ids().is_empty()
    }
    pub fn base_display_list(&mut self) -> Vec<Draw> {
        self.refresh_table_pointer();
        let mut out = vec![];
        // A Scene is an embeddable visual tree, not a Window backdrop. WinUI
        // Grid.Background defaults to null: leave unpainted pixels transparent
        // in every theme. Explicit root brushes are painted by paint_node.
        self.paint_node(self.root, None, &mut out);
        self.paint_motion_exits(&mut out);
        out
    }
    pub fn floating_display_list(&mut self) -> Vec<Draw> {
        self.refresh_table_pointer();
        let mut out = vec![];
        out.push(Draw::Clip {
            rect: self.floating_surface_bounds(),
        });
        for id in self.overlay_ids() {
            let n = &self.nodes[&id];
            let opacity = n.overlay.visual.opacity.value(self.time);
            let windowed = matches!(n.kind, NodeKind::ToolTip | NodeKind::MenuFlyout)
                || n.composed.owner.is_some_and(|owner| {
                    matches!(
                        self.nodes[&owner].kind,
                        NodeKind::NumberBox | NodeKind::AutoSuggestBox | NodeKind::ComboBox | NodeKind::CalendarDatePicker | NodeKind::DatePicker | NodeKind::TimePicker
                    )
                });
            let combo_acrylic = n.composed.owner.is_some_and(|owner|
                self.nodes[&owner].kind == NodeKind::ComboBox);
            // Keep the shadow in its own surface so restored in-app Acrylic
            // can inherit the page backdrop without sampling that shadow.
            out.push(if combo_acrylic {
                Draw::WindowLayer { opacity, inherit_backdrop: false }
            } else {
                Draw::Layer { opacity }
            });
            out.push(Draw::Clip {
                rect: self.popup_window_bounds(id),
            });
            out.push(Draw::Save);
            out.push(Draw::Transform {
                matrix: Matrix([1., 0., 0., 1., n.rect.x, n.rect.y])
                    .multiply(
                        n.presentation
                            .matrix(n.props.transform, n.props.center_point),
                    )
                    .multiply(n.effects.matrix(self.time,n.rect))
                    .multiply(n.overlay.visual.matrix(
                        n.kind,
                        n.overlay.actual,
                        n.rect.height,
                        self.time,
                    ))
                    .0,
            });
            let mut shadows = if let Some(z) = n.props.shadow_depth {
                super::overlay_visual::shadow_at_depth(
                    z,
                    n.theme,
                    n.rect.width,
                    n.rect.height,
                    n.props.corner_radius,
                )
            } else {
                super::overlay_visual::shadow_commands(
                    n.kind,
                    n.theme,
                    n.rect.width,
                    n.rect.height,
                    n.props.corner_radius,
                )
            };
            let weight = n.overlay.visual.shadow_opacity(self.time);
            for shadow in &mut shadows {
                if let Draw::Shadow { opacity, .. } = shadow {
                    *opacity *= weight;
                }
            }
            out.extend(shadows);
            out.push(Draw::Restore);
            // The compositor's shadow is outside the popup's content surface.
            // In-app Acrylic inside that window must not blur its own shadow.
            if windowed {
                out.push(Draw::WindowLayer { opacity: 1., inherit_backdrop: combo_acrylic });
            }
            self.paint_node(id, None, &mut out);
            self.paint_composed_tail(id, &mut out);
            if windowed {
                out.push(Draw::EndLayer);
            }
            out.push(Draw::Restore);
            out.push(Draw::EndLayer);
        }
        out.push(Draw::Restore);
        out
    }
    pub(super) fn color(value: &BrushValue, theme: Theme) -> String {
        match value {
            BrushValue::Color(c) => c.clone(),
            BrushValue::Gradient(_) => unreachable!("gradient backgrounds use the brush executor"),
            BrushValue::Resource { resource } => Resources::current()
                .resolve(theme, resource)
                .expect("validated resource")
                .solid_color(),
        }
    }
    pub(super) fn brush_command(
        out: &mut Vec<Draw>,
        rect: Rect,
        radius: f64,
        width: f64,
        brush: &Brush,
    ) {
        if brush.kind == "solid" {
            if width == 0. {
                out.push(Draw::Fill {
                    rect,
                    color: brush.solid_color(),
                    radius,
                });
            } else {
                out.push(Draw::Stroke {
                    rect,
                    color: brush.solid_color(),
                    radius,
                    width,
                });
            }
        } else {
            out.push(Draw::Gradient {
                rect,
                radius,
                width,
                brush: Box::new(brush.clone()),
            });
        }
    }
    pub(super) fn paint_node(&mut self, id: u32, inherited: Option<String>, out: &mut Vec<Draw>) {
        if self.paint_navigation_template(id,inherited.clone(),out){return;}
        if self.connected_source_hidden(id) { return; }
        if self.paint_picker_wheel_navigation(id,out){return;}
        if self.picker_custom_part(id){return;}
        if self.paint_picker_wheel_item(id,out){return;}
        let n = &self.nodes[&id];
        if !n.visible || n.rect.width <= 0. || n.rect.height <= 0. {
            return;
        }
        let presentation = n.presentation;
        let (p, rect, kind, theme, enabled, text, children) = (
            {let mut p=n.props.clone();if let Some(color)=n.effects.background(self.time){p.background=Some(BrushValue::Color(color));}p},
            n.rect,
            n.kind,
            n.theme,
            n.enabled,
            n.text.clone(),
            self.ordered_visual_children(id),
        );
        let visual_height=if kind==NodeKind::CommandBar&&!p.clip{self.nodes[&id].command.body.height.max(rect.height)}else if id==self.root&&self.auto_height&&!p.clip{self.raster_height()}else{rect.height};
        let r = Rect::new(0.,0.,rect.width,visual_height);
        let resources = Resources::current();
        out.push(Draw::Save);
        out.push(Draw::Transform {
            matrix: Matrix([1., 0., 0., 1., rect.x, rect.y])
                .multiply(presentation.matrix(p.transform, p.center_point))
                .multiply(n.effects.matrix(self.time,rect))
                .multiply(if n.table.role=="tableBodyRows" {Matrix([1.,0.,0.,1.,0.,n.table.body_offset_y.value(self.time)])}else{Matrix::default()})
                .multiply(if kind == NodeKind::CollectionItem {
                    n.collection.entry_matrix(r, self.time)
                } else {
                    Matrix::default()
                })
                .multiply(if overlays::is_overlay(kind) {
                    self.nodes[&id].overlay.visual.matrix(
                        kind,
                        self.nodes[&id].overlay.actual,
                        rect.height,
                        self.time,
                    )
                } else {
                    Matrix::default()
                })
                .0,
        });
        if !overlays::is_overlay(kind) {
            if let Some(z) = p.shadow_depth.or_else(||(p.theme_shadow||n.effects.casts_shadow()).then_some(presentation.translation_z+n.effects.depth(self.time))) {
                out.extend(super::overlay_visual::shadow_at_depth(
                    z,
                    theme,
                    r.width,
                    r.height,
                    p.corner_radius,
                ));
            }
        }
        let text_commands_start = out.len();
        let layout_clip = self.nodes[&id].viewbox.clip;
        if p.clip || layout_clip.is_some() {
            out.push(Draw::Clip {
                rect: layout_clip.unwrap_or(r),
            });
        }
        let command_clip=(kind==NodeKind::CommandBar).then(||self.command_primary_clip(id));
        let table_clip=n.table.cell_clip;
        if let Some(rect)=table_clip {out.push(Draw::Clip{rect});}
        if let Some(rect)=command_clip{out.push(Draw::Clip{rect});}
        let split_clip = self.nodes[&id].overlay.visual.split_clip(r, self.time);
        if let Some(rect) = split_clip {
            out.push(Draw::Clip { rect });
        }
        let joined = self.composed_corner_radii(id).or_else(||self.command_flyout_radii(id));
        let floating_radii = joined.unwrap_or([p.corner_radius; 4]);
        let floating_clip =
            (overlays::is_overlay(kind) || matches!(kind,NodeKind::FlipView|NodeKind::TableView)) && p.corner_radius > 0.;
        if floating_clip {
            if joined.is_some() {
                out.push(Draw::CornerClip {
                    rect: r,
                    radii: floating_radii.map(|v| [v, v]),
                });
            } else {
                out.push(Draw::RoundedClip {
                    rect: r,
                    radius: p.corner_radius,
                });
            }
        }
        let connection_start=n.effects.has_crossfade(self.time).then_some(out.len());
        let opacity = presentation.opacity * n.effects.opacity(self.time)
            * if n.table.role=="tableBodyRows"{n.table.body_opacity.value(self.time)}else{1.}
            * if kind == NodeKind::CollectionItem {
                n.collection.item_visual(self.time).opacity
            } else {
                1.
            };
        if opacity < 1. {
            out.push(Draw::Layer { opacity });
        }
        let mut foreground = p
            .foreground
            .as_ref()
            .map(|b| Self::color(b, theme))
            .or(inherited)
            .unwrap_or_else(|| {
                resources
                    .color(theme, "TextFillColorPrimaryBrush")
                    .to_string()
            });
        let inner_background = overlays::is_overlay(kind) && kind != NodeKind::Popup;
        let collection_gradient_border=collections::is_view(kind)&&p.border_brush.as_ref().is_some_and(|b|match b{BrushValue::Gradient(_)=>true,BrushValue::Resource{resource}=>Resources::current().resolve(theme,resource).is_ok_and(|b|b.kind!="solid"),_=>false});
        if collections::is_view(kind) && !collection_gradient_border && p.border_thickness.iter().any(|b| *b > 0.) {
            out.push(Draw::Border {
                rect: r,
                thickness: overlays::border_thickness(p.border_thickness, self.dpr),
                radius: [0.; 4],
                color: p
                    .border_brush
                    .as_ref()
                    .map(|b| Self::color(b, theme))
                    .unwrap_or_else(|| "#00000000".into()),
                background: None,
            });
        }
        if inner_background {
            let b = overlays::border_thickness(p.border_thickness, self.dpr);
            let rect = Rect::new(
                b[0],
                b[1],
                (r.width - b[0] - b[2]).max(0.),
                (r.height - b[1] - b[3]).max(0.),
            );
            if joined.is_some() {
                out.push(Draw::CornerClip {
                    rect,
                    radii: [
                        [
                            (floating_radii[0] - b[0]).max(0.),
                            (floating_radii[0] - b[1]).max(0.),
                        ],
                        [
                            (floating_radii[1] - b[2]).max(0.),
                            (floating_radii[1] - b[1]).max(0.),
                        ],
                        [
                            (floating_radii[2] - b[2]).max(0.),
                            (floating_radii[2] - b[3]).max(0.),
                        ],
                        [
                            (floating_radii[3] - b[0]).max(0.),
                            (floating_radii[3] - b[3]).max(0.),
                        ],
                    ],
                });
            } else {
                out.push(Draw::RoundedClip {
                    rect,
                    radius: (p.corner_radius - b.into_iter().fold(0f64, f64::max)).max(0.),
                });
            }
        }
        let resolved = p.acrylic_resource.as_ref().map(|key| {
            resources
                .resolve_material(theme, key)
                .expect("validated material resource")
        });
        let recipe = p.acrylic.clone().or_else(|| {
            resolved
                .filter(|b| b.kind == "acrylic")
                .map(|b| crate::material::AcrylicOptions {
                    tint_color: b.tint.clone(),
                    tint_opacity: b.tint_opacity,
                    luminosity_opacity: b.luminosity_opacity,
                    fallback_color: b.fallback.clone(),
                })
        });
        let radii = p.corner_radii.unwrap_or([p.corner_radius; 4]);
        let border = if kind == NodeKind::Border || matches!(kind,NodeKind::ContentPresenter|NodeKind::Frame) {
            p.border_thickness
        } else {
            [0.; 4]
        };
        let material_clip = (recipe.is_some() || resolved.is_some())
            && !overlays::is_overlay(kind)
            && (radii.iter().any(|v| *v > 0.) || border.iter().any(|v| *v > 0.));
        if material_clip {
            if kind == NodeKind::Border || matches!(kind,NodeKind::ContentPresenter|NodeKind::Frame) {
                // BackgroundSizing=InnerBorderEdge: subtract each border
                // axis separately, preserving the native elliptical corners.
                let radii = crate::render::normalized_corners(r, radii);
                let inner = Rect::new(
                    border[0],
                    border[1],
                    (r.width - border[0] - border[2]).max(0.),
                    (r.height - border[1] - border[3]).max(0.),
                );
                let radii = [
                    [
                        (radii[0] - border[0]).max(0.),
                        (radii[0] - border[1]).max(0.),
                    ],
                    [
                        (radii[1] - border[2]).max(0.),
                        (radii[1] - border[1]).max(0.),
                    ],
                    [
                        (radii[2] - border[2]).max(0.),
                        (radii[2] - border[3]).max(0.),
                    ],
                    [
                        (radii[3] - border[0]).max(0.),
                        (radii[3] - border[3]).max(0.),
                    ],
                ];
                out.push(Draw::CornerClip { rect: inner, radii });
            } else {
                out.push(Draw::RoundedClip {
                    rect: r,
                    radius: if joined.is_some() {
                        0.
                    } else {
                        p.corner_radius
                    },
                });
            }
        }
        if let Some(brush) = resolved.filter(|b| b.kind == "solid") {
            out.push(Draw::Fill {
                rect: r,
                color: brush.solid_color(),
                // The material clip owns the edge coverage in every policy.
                radius: 0.,
            });
        }
        if let Some(recipe) = &recipe {
            let target = if self.reduced_transparency || theme == Theme::HighContrast {
                0.
            } else {
                1.
            };
            let motion = &mut self.nodes.get_mut(&id).unwrap().material_motion;
            if self.reduced_motion || theme == Theme::HighContrast {
                motion.snap(target);
            } else if motion.to != target {
                motion.retarget(
                    target,
                    self.time,
                    crate::material::constants().switch_duration,
                );
            }
            let weight = motion.value(self.time);
            out.push(Draw::Acrylic {
                rect: r,
                recipe: recipe.clone(),
                colors: Some(self.nodes.get_mut(&id).unwrap().material_colors.sample(
                    recipe,
                    self.time,
                    self.reduced_motion || theme == Theme::HighContrast,
                )),
                weight,
            });
        }
        if material_clip {
            out.push(Draw::Restore);
        }
        if overlays::is_overlay(kind) && kind != NodeKind::Popup {
            let prefix = if kind == NodeKind::ToolTip {
                "ToolTip"
            } else if kind == NodeKind::MenuFlyout {
                "MenuFlyoutPresenter"
            } else {
                "FlyoutPresenter"
            };
            // Menu's transparent Background is only the top layer of its native
            // SystemBackdrop. Adapt that backdrop to the root's real scene sampler.
            let key = if kind == NodeKind::MenuFlyout {
                overlays::contract()["presentation"]["browserSystemBackdropRecipe"]
                    .as_str()
                    .unwrap()
                    .to_owned()
            } else if kind == NodeKind::ToolTip {
                "ToolTipBackgroundBrush".to_owned()
            } else {
                format!("{prefix}Background")
            };
            let command_flyout = kind == NodeKind::CommandBarFlyout || self.nodes[&id].overlay.visual.profile == Some(NodeKind::CommandBarFlyout);
            let brush: Brush = if (kind == NodeKind::MenuFlyout || command_flyout) && theme != Theme::HighContrast {
                serde_json::from_value(
                    crate::material::host_backdrop_profile()["palettes"][theme.as_str()].clone(),
                )
                .unwrap()
            } else if command_flyout {
                serde_json::from_value(super::command_menus::contract()["palettes"][theme.as_str()]["CommandBarFlyoutBackground"].clone()).unwrap()
            } else {
                overlays::brush(theme, &key)
            };
            if p.background.is_none() && p.acrylic.is_none() && p.acrylic_resource.is_none() {
                if brush.kind == "solid" {
                    Self::brush_command(
                        out,
                        r,
                        if joined.is_some() {
                            0.
                        } else {
                            p.corner_radius
                        },
                        0.,
                        &brush,
                    );
                } else if brush.kind == "acrylic" {
                    let recipe = crate::material::AcrylicOptions {
                        tint_color: brush.tint.clone(),
                        tint_opacity: brush.tint_opacity,
                        luminosity_opacity: brush.luminosity_opacity,
                        fallback_color: brush.fallback.clone(),
                    };
                    let weight = if self.reduced_transparency || theme == Theme::HighContrast {
                        0.
                    } else {
                        1.
                    };
                    out.push(if kind == NodeKind::MenuFlyout || command_flyout {
                        Draw::SystemBackdrop {
                            rect: r,
                            recipe,
                            colors: None,
                            weight,
                        }
                    } else {
                        Draw::Acrylic {
                            rect: r,
                            recipe,
                            colors: None,
                            weight,
                        }
                    });
                }
            }
            if let Some(background) = &p.background {
                match background {
                    BrushValue::Gradient(brush) => Self::brush_command(
                        out,
                        r,
                        if joined.is_some() {
                            0.
                        } else {
                            p.corner_radius
                        },
                        0.,
                        brush,
                    ),
                    _ => out.push(Draw::Fill {
                        rect: r,
                        color: Self::color(background, theme),
                        radius: if joined.is_some() {
                            0.
                        } else {
                            p.corner_radius
                        },
                    }),
                }
            }
            out.push(Draw::Restore);
            out.push(Draw::Border {
                rect: r,
                thickness: overlays::border_thickness(p.border_thickness, self.dpr),
                color: p
                    .border_brush
                    .as_ref()
                    .map(|b| Self::color(b, theme))
                    .unwrap_or_else(|| {
                        overlays::brush(
                            theme,
                            if kind == NodeKind::ToolTip {
                                "ToolTipBorderBrush"
                            } else if kind == NodeKind::MenuFlyout {
                                "MenuFlyoutPresenterBorderBrush"
                            } else {
                                "FlyoutBorderThemeBrush"
                            },
                        )
                        .solid_color()
                    }),
                radius: floating_radii,
                background: None,
            });
        }
        if matches!(
            kind,
            NodeKind::Button
                | NodeKind::RepeatButton
                | NodeKind::ToggleButton
                | NodeKind::HyperlinkButton
        ) && !self.is_command_more(id) && !matches!(self.nodes[&id].table.role.as_str(),"headerMain"|"filterMenuItem"|"detailsToggle") {
            let style = if kind == NodeKind::HyperlinkButton {
                five_controls::hyperlink_style()
            } else if kind == NodeKind::RepeatButton && p.variant == ButtonVariant::Standard {
                basic_next::repeat_style()
            } else {
                crate::button::style(p.variant)
            };
            let state = self.nodes[&id].button.state(enabled);
            let mut keys = style.states[state.as_str()].clone();
            let number_spin = self.nodes[&id]
                .composed
                .owner
                .is_some_and(|owner| self.nodes[&owner].kind == NodeKind::NumberBox);
            let choice_button = self.nodes[&id].composed.role == "DropDownButton";
            if number_spin {
                let suffix = match state {
                    ControlState::Normal => "",
                    ControlState::PointerOver => "PointerOver",
                    ControlState::Pressed => "Pressed",
                    ControlState::Disabled => "Disabled",
                };
                for prop in ["Background", "BorderBrush", "Foreground"] {
                    if suffix != "Disabled" || prop == "BorderBrush" {
                        keys.insert(
                            prop.into(),
                            format!(
                                "TextControlButton{prop}{}",
                                if suffix == "Disabled" { "" } else { suffix }
                            ),
                        );
                    }
                }
            }
            if choice_button {
                let suffix = match state {
                    ControlState::Normal => "",
                    ControlState::PointerOver => "PointerOver",
                    ControlState::Pressed => "Pressed",
                    ControlState::Disabled => "Disabled",
                };
                let combo = self.nodes[&id]
                    .composed
                    .owner
                    .is_some_and(|owner| self.nodes[&owner].kind == NodeKind::ComboBox);
                let combo_edit_focus = combo && self.nodes[&id].composed.owner.is_some_and(|owner| self.nodes[&owner].props.is_editable && self.focused == self.nodes[&owner].composed.parts.get("InputBox").copied());
                keys.insert(
                    "Background".into(),
                    if combo {
                        if suffix == "PointerOver" || suffix == "Pressed" {
                            format!(
                                "{}{}",
                                if suffix == "Pressed" && combo_edit_focus { "ComboBoxFocusedDropDownBackground" } else { "ComboBoxDropDownBackground" },
                                if suffix == "Pressed" {
                                    "PointerPressed"
                                } else {
                                    suffix
                                }
                            )
                        } else {
                            "TextControlButtonBackground".into()
                        }
                    } else {
                        format!("TextControlButtonBackground{suffix}")
                    },
                );
                keys.insert("BorderBrush".into(), "TextControlButtonBorderBrush".into());
                keys.insert(
                    "Foreground".into(),
                    if combo {
                        if combo_edit_focus {
                            "ComboBoxEditableDropDownGlyphForeground".into()
                        } else { format!(
                            "ComboBoxDropDownGlyphForeground{}",
                            if suffix == "Disabled" { "Disabled" } else if self.nodes[&id].composed.owner.is_some_and(|owner| !self.nodes[&owner].props.is_editable && !self.nodes[&owner].composed.pointer_focused && self.focused == self.nodes[&owner].composed.parts.get("InputBox").copied()) { "Focused" } else { "" }
                        ) }
                    } else {
                        format!("TextControlButtonForeground{suffix}")
                    },
                );
                // The XAML overlay exists only for editable ComboBox; the ordinary
                // drop-down glyph never paints independent Button chrome.
                if combo
                    && !self.nodes[&self.nodes[&id].composed.owner.unwrap()]
                        .props
                        .is_editable
                {
                    keys.insert("Background".into(), "TextControlButtonBackground".into());
                }
            }

            let info_close = self.nodes[&id].parent.is_some_and(|p| {
                self.nodes[&p].kind == NodeKind::InfoBar
                    && self.nodes[&p].compact.close_button == Some(id)
            });
            if info_close {
                let name = if theme == Theme::Dark {
                    "Default"
                } else {
                    theme.as_str()
                };
                let aliases = &compact_controls::contract()["infoBarCloseButton"]["aliases"][name];
                for prop in ["Background", "BorderBrush", "Foreground"] {
                    let local = keys[prop].clone();
                    keys.insert(
                        prop.into(),
                        aliases[&local]
                            .as_str()
                            .expect("InfoBar local Button resource alias")
                            .into(),
                    );
                }
            }
            if kind == NodeKind::ToggleButton {
                let extracted = crate::selection::state(kind, p.is_checked, state);
                for property in ["Background", "BorderBrush", "Foreground"] {
                    keys.insert(
                        property.into(),
                        extracted[&format!("ContentPresenter.{property}")].clone(),
                    );
                }
            }
            let outer = if kind == NodeKind::ToggleButton {
                p.is_checked == Some(true) && state != ControlState::Disabled
            } else {
                style.background_sizing != "InnerBorderEdge"
            };
            let close_brushes = info_close.then(|| {
                ["Background", "BorderBrush", "Foreground"]
                    .map(|key| compact_controls::brush(theme, &keys[key]))
            });
            let bg = if let Some(b) = &close_brushes {
                &b[0]
            } else {
                resources
                    .resolve(theme, &keys["Background"])
                    .unwrap_or_else(|_| {
                        resources
                            .resolve(theme, keys["Background"].trim_end_matches("Disabled"))
                            .unwrap()
                    })
            };
            let border = if let Some(b) = &close_brushes {
                &b[1]
            } else {
                resources.resolve(theme, &keys["BorderBrush"]).unwrap()
            };
            let fg = if let Some(b) = &close_brushes {
                &b[2]
            } else {
                resources
                    .resolve(theme, &keys["Foreground"])
                    .unwrap_or_else(|_| {
                        resources
                            .resolve(theme, keys["Foreground"].trim_end_matches("Disabled"))
                            .unwrap()
                    })
            };
            // Normal uses TemplateBinding Background/Foreground. VSM setters
            // on the ContentPresenter override those bindings in other states.
            let target_background = if state == ControlState::Normal {
                p.background.as_ref().map(|color| Self::color(color, theme))
                    .unwrap_or_else(|| bg.solid_color())
            } else {
                bg.solid_color()
            };
            let background = if choice_button && self.nodes[&id].composed.owner.is_some_and(|owner| self.nodes[&owner].kind == NodeKind::ComboBox) {
                // DropDownOverlay uses immediate VSM setters, not Button's
                // animated Background transition.
                target_background
            } else {
                self.nodes.get_mut(&id).unwrap().button.color_value(
                    enabled,
                    &target_background,
                    self.time,
                    self.reduced_motion,
                    style.duration,
                )
            };
            if p.foreground.is_none() || state != ControlState::Normal {
                foreground = fg.solid_color();
            }
            let b = if self.nodes[&id].table.owner.is_some() {0.}else{crate::button::defaults().border_thickness};
            let inner = if !outer {
                Rect::new(
                    b,
                    b,
                    (r.width - b * 2.).max(0.),
                    (r.height - b * 2.).max(0.),
                )
            } else {
                r
            };
            if number_spin || choice_button {
                let margin = if choice_button {
                    [4., 4., 4., 4.]
                } else {
                    [0.; 4]
                };
                out.push(Draw::Border {
                    rect: Rect::new(
                        margin[0],
                        margin[1],
                        (r.width - margin[0] - margin[2]).max(0.),
                        (r.height - margin[1] - margin[3]).max(0.),
                    ),
                    thickness: if choice_button {
                        [0.; 4]
                    } else {
                        p.border_thickness
                    },
                    radius: [p.corner_radius; 4],
                    color: border.solid_color(),
                    background: Some(background),
                });
            } else {
                out.push(Draw::Fill {
                    rect: inner,
                    color: background,
                    radius: (p.corner_radius - if !outer { b } else { 0. }).max(0.),
                });
                if b>0. {
                Self::brush_command(
                    out,
                    Rect::new(
                        b / 2.,
                        b / 2.,
                        (r.width - b).max(0.),
                        (r.height - b).max(0.),
                    ),
                    (p.corner_radius - b / 2.).max(0.),
                    b,
                    border,
                );
                }
            }
        } else if matches!(kind, NodeKind::RadioButton | NodeKind::ToggleSwitch) {
            let input_foreground = self.paint_input_selection(id, out);
            if p.foreground.is_none() {
                foreground = input_foreground;
            }
        } else if kind == NodeKind::CheckBox {
            let keys =
                crate::selection::state(kind, p.is_checked, self.nodes[&id].button.state(enabled));
            let c = crate::selection::checkbox();
            if p.foreground.is_none() {
                foreground = resources
                    .resolve(theme, &keys["ContentPresenter.Foreground"])
                    .unwrap()
                    .solid_color();
            }
            if let Some(bg) = &p.background {
                out.push(Draw::Fill {
                    rect: r,
                    color: Self::color(bg, theme),
                    radius: p.corner_radius,
                });
            }
            let box_rect = Rect::new(0., (r.height - c.size) / 2., c.size, c.size);
            Self::brush_command(
                out,
                box_rect,
                p.corner_radius,
                0.,
                resources
                    .resolve(theme, &keys["NormalRectangle.Fill"])
                    .unwrap(),
            );
            Self::brush_command(
                out,
                Rect::new(
                    c.border / 2.,
                    box_rect.y + c.border / 2.,
                    c.size - c.border,
                    c.size - c.border,
                ),
                (p.corner_radius - c.border / 2.).max(0.),
                c.border,
                resources
                    .resolve(theme, &keys["NormalRectangle.Stroke"])
                    .unwrap(),
            );
            if let Some(path) = self.nodes[&id].accept.draw(
                self.time,
                box_rect,
                resources
                    .resolve(theme, &keys["CheckGlyph.Foreground"])
                    .unwrap()
                    .solid_color(),
            ) {
                out.push(path);
            }
        } else if kind == NodeKind::CollectionItem {
            foreground = self.paint_collection_item(id, out);
            if !enabled {
                out.push(Draw::Layer {
                    opacity: if self.nodes[&p.collection_owner.unwrap()].kind==NodeKind::ItemsView{0.3}else{collections::contract()["metrics"]["ListViewItemDisabledThemeOpacity"]
                        ["value"]
                        .as_str()
                        .unwrap()
                        .parse()
                        .unwrap()},
                });
            }
        } else if compact_controls::is_compact(kind) {
            if compact_controls::is_split(kind) {
                foreground = self.split_foreground(id);
            }
            self.paint_compact(id, out);
        } else if crate::shapes::is_shape(kind) {
            if p.stretch == ImageStretch::UniformToFill {
                out.push(Draw::Clip { rect: r });
            }
            crate::shapes::paint(
                kind,
                &p,
                self.nodes[&id].shape_path.as_ref().unwrap(),
                r,
                theme,
                out,
            );
            if p.stretch == ImageStretch::UniformToFill {
                out.push(Draw::Restore);
            }
        } else if crate::icons::is_icon(kind) {
            self.paint_icon(id, &foreground, out);
        } else if kind == NodeKind::Slider {
            self.paint_slider(id, out);
        } else if overlays::is_overlay(kind) {
            if kind == NodeKind::Popup {
                if let Some(background) = &p.background {
                    match background {
                        BrushValue::Gradient(brush) => {
                            Self::brush_command(out, r, p.corner_radius, 0., brush)
                        }
                        _ => out.push(Draw::Fill {
                            rect: r,
                            color: Self::color(background, theme),
                            radius: p.corner_radius,
                        }),
                    }
                }
            }
            if kind == NodeKind::MenuFlyout {
                self.paint_menu(id, out);
            }
        } else if progress::is_progress(kind) {
            self.paint_progress(id, out);
        } else if matches!(
            kind,
            NodeKind::ContentPresenter | NodeKind::Frame | NodeKind::LayoutPanel | NodeKind::RelativePanel | NodeKind::Border | NodeKind::Expander | NodeKind::InfoBadge
        ) {
            self.paint_five(id, out);
        } else if command_controls::is_control(kind)||self.is_command_more(id)||self.nodes[&id].command.separator {
            // These template backgrounds belong to the inner command border.
        } else if let Some(BrushValue::Gradient(brush)) = &p.background {
            Self::brush_command(out, r, p.corner_radius, 0., brush);
        } else if let Some(background) = &p.background {
            if kind == NodeKind::Ellipse {
                out.push(Draw::Ellipse {
                    rect: r,
                    color: Self::color(background, theme),
                });
            } else {
                out.push(Draw::Fill {
                    rect: r,
                    color: Self::color(background, theme),
                    radius: p.corner_radius,
                });
            }
        }
        self.paint_table_selection_background(id,out);
        if self.nodes[&id].table.role=="filterMenuItem" {foreground=Self::color(&BrushValue::Resource{resource:if enabled{"TextFillColorPrimaryBrush"}else{"TextFillColorDisabledBrush"}.into()},theme);}
        self.paint_primitive(id,out);
        self.paint_reading(id,out);
        if picker_controls::is_control(kind)||self.is_picker_surface(id){
            if let Some(value)=self.paint_picker(id,out){foreground=value;}
        }
        if collection_gradient_border{self.paint_gradient_border(id,out);}
        self.paint_refresh(id,out);
        self.paint_command_menu(id,out);
        if command_controls::is_control(kind)||self.is_command_more(id)||self.nodes[&id].command.separator{
            if kind!=NodeKind::CommandBar{foreground=self.command_foreground(id);}
            self.paint_command(id,out);
        }
        if navigation_controls::is_control(kind) {
            self.paint_navigation_control(id, out, false);
        }
        match kind {
            NodeKind::TextBox | NodeKind::PasswordBox | NodeKind::RichEditBox => self.paint_editor(id, out),
            NodeKind::RadioButtons => self.paint_input_header(id, out),
            NodeKind::NavigationView => {
                let nav = self.nodes.get_mut(&id).unwrap().nav.as_mut().unwrap();
                if !enabled {
                    for part in &mut nav.parts {
                        part.enabled = false;
                    }
                    nav.hovered = None;
                    nav.pressed = None;
                }
                out.extend(crate::render::navigation_display_list(nav,false));
            }
            NodeKind::ToolTip
            | NodeKind::TextBlock
            | NodeKind::Button
            | NodeKind::RepeatButton
            | NodeKind::HyperlinkButton
            | NodeKind::ToggleButton
            | NodeKind::CheckBox
            | NodeKind::RadioButton
            | NodeKind::CollectionItem
            | NodeKind::CollectionHeader
                if children.is_empty() =>
            {
                let b = if matches!(
                    kind,
                    NodeKind::Button
                        | NodeKind::RepeatButton
                        | NodeKind::ToggleButton
                        | NodeKind::HyperlinkButton
                ) {
                    if self.nodes[&id].table.owner.is_some() {0.}else{crate::button::defaults().border_thickness}
                } else {
                    0.
                };
                let composed_owner = self.nodes[&id]
                    .composed
                    .owner
                    .and_then(|owner| self.nodes.get(&owner))
                    .map(|owner| owner.kind);
                let borders = if kind == NodeKind::CollectionItem
                    || composed_owner == Some(NodeKind::NumberBox)
                {
                    overlays::border_thickness(p.border_thickness, self.dpr)
                } else if matches!(
                    composed_owner,
                    Some(NodeKind::ContentDialog | NodeKind::TeachingTip)
                ) {
                    [(b * self.dpr).round() / self.dpr; 4]
                } else {
                    [b; 4]
                };
                let inner = Rect::new(
                    p.padding[0] + borders[0] + crate::selection::leading(kind),
                    p.padding[1] + borders[1],
                    (r.width
                        - p.padding[0]
                        - p.padding[2]
                        - borders[0]
                        - borders[2]
                        - crate::selection::leading(kind))
                    .max(0.),
                    (r.height - p.padding[1] - p.padding[3] - borders[1] - borders[3]).max(0.),
                );
                out.push(Draw::Clip { rect: inner });
                let y = inner.y
                    + if matches!(
                        kind,
                        NodeKind::Button
                            | NodeKind::CollectionItem
                            | NodeKind::CollectionHeader
                            | NodeKind::RepeatButton
                            | NodeKind::ToggleButton
                            | NodeKind::HyperlinkButton
                    ) {
                        ((inner.height - text.height.ceil()) / 2. * self.dpr).round() / self.dpr
                    } else {
                        0.
                    };
                // CTextBlock::GetContentRenderingOffset adds the full Measure
                // rounding budget on the DWriteLayout path too. Its public
                // BaselineOffset remains unadjusted, unlike LineServices.
                let rendering_adjustment =
                    if kind == NodeKind::TextBlock && p.trimming == TextTrimming::Clip {
                        0.
                    } else {
                        let height = text.height
                            + if kind == NodeKind::TextBlock {
                                p.padding[1] + p.padding[3]
                            } else {
                                0.
                            };
                        ((height * self.dpr - 1e-9).ceil() / self.dpr - height).max(0.)
                    };
                for line in &text.lines {
                    let x = inner.x
                        + if matches!(kind, NodeKind::TextBlock | NodeKind::CollectionHeader)
                            && p.optical_margin_alignment
                                == OpticalMarginAlignment::TrimSideBearings
                        {
                            if self.effective_flow_direction(id) == FlowDirection::RightToLeft {
                                line.width - line.ink_right
                            } else {
                                line.ink_left
                            }
                        } else {
                            0.
                        }
                        + if kind == NodeKind::TextBlock
                            && self.effective_flow_direction(id) == FlowDirection::RightToLeft
                        {
                            (inner.width - line.width).max(0.)
                        } else {
                            0.
                        }
                        + if (kind == NodeKind::CollectionItem
                            && self.nodes[&p.collection_owner.unwrap()].kind == NodeKind::GridView)
                            || matches!(
                                kind,
                                NodeKind::Button
                                    | NodeKind::RepeatButton
                                    | NodeKind::ToggleButton
                                    | NodeKind::HyperlinkButton
                            )
                        {
                            let offset=if kind==NodeKind::CollectionItem{(inner.width-text.width)/2.}else{match p.horizontal_content_alignment{HorizontalAlignment::Left|HorizontalAlignment::Stretch=>0.,HorizontalAlignment::Right=>inner.width-text.width,HorizontalAlignment::Center=>(inner.width-text.width)/2.}};
                            (offset * self.dpr).round() / self.dpr
                        } else {
                            0.
                        };
                    out.push(Draw::Text {
                        style: p.font_style,
                        x,
                        y: y + line.baseline + rendering_adjustment,
                        text: line.text.clone(),
                        color: foreground.clone(),
                        size: p.font_size,
                        font: p.font_family.clone(),
                        max_width: (inner.x + inner.width - x).max(0.),
                        weight: p.font_weight,
                    });
                }
                out.push(Draw::Restore);
            }
            NodeKind::Image => {
                if let Some(size) = self.images.get(&p.source) {
                    let mut image = r;
                    match p.stretch {
                        ImageStretch::Uniform | ImageStretch::UniformToFill => {
                            let scale = if p.stretch == ImageStretch::Uniform {
                                (r.width / size[0]).min(r.height / size[1])
                            } else {
                                (r.width / size[0]).max(r.height / size[1])
                            };
                            image.width = size[0] * scale;
                            image.height = size[1] * scale;
                            image.x = (r.width - image.width) / 2.;
                            image.y = (r.height - image.height) / 2.;
                        }
                        ImageStretch::None => {
                            image.width = size[0];
                            image.height = size[1];
                        }
                        _ => {}
                    }
                    out.push(Draw::Clip { rect: r });
                    out.push(Draw::Image {
                        rect: image,
                        source: p.source.clone(),
                    });
                    out.push(Draw::Restore);
                }
            }
            _ => {}
        }
        if kind == NodeKind::Viewbox {
            out.push(Draw::Save);
            out.push(Draw::Transform {
                matrix: self.nodes[&id].viewbox.matrix().0,
            });
        }
        if collections::is_scroll_owner(kind) {
            out.push(Draw::Save);
            out.push(Draw::Transform {
                matrix: self.nodes[&id].scroll.matrix(self.time).0,
            });
        }
        if kind == NodeKind::Expander {
            self.snap_text_commands(id, text_commands_start, out);
            for child in children.iter().copied().filter(|child| self.nodes[child].props.is_expander_header).collect::<Vec<_>>() {
                self.paint_node(child, Some(foreground.clone()), out);
            }
            let v = self.nodes[&id].expander.snapshot(self.time, &p);
            out.push(Draw::Clip { rect: v.clip });
            out.push(Draw::Save);
            out.push(Draw::Transform {
                matrix: [1., 0., 0., 1., 0., v.offset],
            });
        }
        if kind == NodeKind::Border && p.corner_radius > 0. {
            out.push(Draw::RoundedClip {
                rect: r,
                radius: p.corner_radius,
            });
        }
        if compact_controls::is_split(kind) {
            out.push(Draw::RoundedClip {
                rect: r,
                radius: p.corner_radius,
            });
            out.push(Draw::Clip {
                rect: Rect::new(0., 0., self.split_primary_width(id), r.height),
            });
        }
        let collection_clip = kind == NodeKind::CollectionItem
            && matches!(self.nodes[&p.collection_owner.unwrap()].kind,NodeKind::GridView|NodeKind::ItemsView);
        if collection_clip {
            out.push(Draw::RoundedClip {
                rect: r,
                radius: p.corner_radius,
            });
        }
        if kind != NodeKind::Expander { self.snap_text_commands(id, text_commands_start, out); }
        if !self.paint_table_rows_retained(id,&children,&foreground,out) {
        for child in children {
            let table_clip=(self.nodes[&child].table.role!="groupHeader").then(||self.table_sticky_row_clip(id)).flatten();
            if let Some(rect)=table_clip {out.push(Draw::Clip{rect});}
            if kind == NodeKind::Expander && self.nodes[&child].props.is_expander_header { continue; }
            let pane=kind==NodeKind::SplitView&&view_controls::props(&self.nodes[&child]).slot==ViewControlSlot::Pane;
            if pane {
                let v=view_controls::props(&self.nodes[&id]);
                if view_controls::overlay_mode(v.display_mode)&&v.is_pane_open&&v.light_dismiss_overlay_mode==LightDismissOverlayMode::On {out.push(Draw::Fill{rect:r,color:view_controls::pane_color(theme,"SplitViewLightDismissOverlayBackground"),radius:0.});}
                out.push(Draw::Clip{rect:self.nodes[&id].view_control.pane});
                let color=v.pane_background.as_ref().map(|b|Self::color(b,theme)).unwrap_or_else(||view_controls::pane_color(theme,"SystemControlPageBackgroundChromeLowBrush"));
                out.push(Draw::Fill{rect:self.nodes[&id].view_control.pane,color,radius:0.});
            }
            let sticky_clip =
                collections::is_view(kind) && self.nodes[&child].kind == NodeKind::CollectionItem;
            if sticky_clip {
                if let Some(rect) = self.collection_sticky_clip(id) {
                    out.push(Draw::Clip { rect });
                }
            }
            let tab_header = (kind == NodeKind::TabView && self.nodes[&child].nav_controls.slot_role == "header")
                .then(|| self.nodes[&child].nav_controls.slot_key.clone())
                .and_then(|key| self.nodes[&id].nav_controls.parts.iter().find(|p|p.role=="tab"&&p.key==key).map(|p|(key,p.rect)));
            if let Some((key,rect))=&tab_header { Self::tab_visual_commands(&self.nodes[&id].nav_controls.tab_visual(key,self.time),*rect,out); }
            let tab_start=out.len();
            let semantic=kind==NodeKind::SemanticZoom;
            if semantic{let slot=view_controls::props(&self.nodes[&child]).slot;let progress=self.nodes[&id].view_control.motion.value(self.time);let opacity=if slot==ViewControlSlot::ZoomedIn{progress}else if slot==ViewControlSlot::ZoomedOut{1.-progress}else if slot==ViewControlSlot::ZoomButton{self.nodes[&id].view_control.zoom_button_motion.value(self.time)}else{1.};out.push(Draw::Layer{opacity});out.push(Draw::Save);out.push(Draw::Transform{matrix:self.semantic_child_matrix(id,child).0});}
            if kind==NodeKind::RefreshVisualizer{self.begin_refresh_content(id,out);}
            let picker_opacity=self.picker_part_opacity(child);if let Some(opacity)=picker_opacity{out.push(Draw::Layer{opacity});}
            let frame_visual=self.frame_visual(id,child);
            if let Some(v)=frame_visual{out.push(Draw::Layer{opacity:v.opacity});out.push(Draw::Save);out.push(Draw::Transform{matrix:self.content_child_matrix(id,child).0});}
            self.paint_node(child, Some(foreground.clone()), out);
            if frame_visual.is_some(){out.push(Draw::Restore);out.push(Draw::EndLayer);}
            if picker_opacity.is_some(){out.push(Draw::EndLayer);}
            if kind==NodeKind::RefreshVisualizer{out.push(Draw::EndLayer);out.push(Draw::Restore);}
            if semantic{out.push(Draw::Restore);out.push(Draw::EndLayer);}
            if pane {out.push(Draw::Restore);}
            if let Some((key,_))=tab_header {
                self.nodes.get_mut(&id).unwrap().nav_controls.tab_cache.entry(key).or_default().extend(out[tab_start..].iter().cloned());
                out.push(Draw::Restore);out.push(Draw::EndLayer);
            }
            if sticky_clip && self.collection_sticky_clip(id).is_some() {
                out.push(Draw::Restore);
            }
            if table_clip.is_some(){out.push(Draw::Restore);}
        }
        }
        self.paint_table_separators(id,out);
        if kind == NodeKind::FlipView {
            let start = out.len();
            self.paint_navigation_control(id, out, true);
            self.snap_text_commands(id, start, out);
        }
        if collection_clip {
            out.push(Draw::Restore);
        }
        if kind == NodeKind::CollectionHeader && p.collection_key!="$header" {
            let stroke = collections::header_divider(theme);
            out.push(Draw::Stroke {
                rect: Rect::new(
                    12.25,
                    (r.height - 0.75).max(0.),
                    (r.width - 24.5).max(0.),
                    0.5,
                ),
                width: 0.5,
                radius: 0.,
                color: stroke,
            });
        }
        if kind == NodeKind::CollectionItem {
            if !enabled {
                out.push(Draw::EndLayer);
            }
            self.paint_collection_item_border(id, out);
        }
        if compact_controls::is_split(kind) {
            out.push(Draw::Restore);
            out.push(Draw::Restore);
            self.paint_split_border(id, out);
        }
        if kind == NodeKind::Border && p.corner_radius > 0. {
            out.push(Draw::Restore);
        }
        if kind == NodeKind::Expander {
            out.push(Draw::Restore);
            out.push(Draw::Restore);
        }
        if kind == NodeKind::Viewbox {
            out.push(Draw::Restore);
        }
        if collections::is_scroll_owner(kind) {
            out.push(Draw::Restore);
            self.paint_scrollbars(id, out);
        }
        if opacity < 1. {
            out.push(Draw::EndLayer);
        }
        if let Some(start)=connection_start {let target=out.split_off(start);out.push(self.nodes[&id].effects.crossfade(self.time,r,target).unwrap());}
        if floating_clip {
            out.push(Draw::Restore);
        }
        if split_clip.is_some() {
            out.push(Draw::Restore);
        }
        if command_clip.is_some(){out.push(Draw::Restore);}
        if table_clip.is_some(){out.push(Draw::Restore);}
        if p.clip || layout_clip.is_some() {
            out.push(Draw::Restore);
        }
        out.push(Draw::Restore);
    }

    pub(super) fn snap_text_commands(&self, id: u32, start: usize, out: &mut Vec<Draw>) {
        // DWriteTextRenderer disables DirectWrite's own snapping because XAML
        // realizes every glyph run through D2DTextDrawingContext, which snaps
        // its physical baseline. This includes the ordinary DWriteLayout path.
        let mut raster = self.nodes[&id].world;
        // Table rows scroll as retained glyph textures in native Composition.
        // Snap at their layout position, then move that texture continuously.
        // Snapping again after every scroll sample makes text jump a pixel.
        let table_scroll = self.table_text_scroll_offset(id);
        raster.0[4] += table_scroll[0];
        raster.0[5] += table_scroll[1];
        let mut ancestor = Some(id);
        while let Some(at) = ancestor {
            let n = &self.nodes[&at];
            if overlays::is_overlay(n.kind) {
                let offset =
                    n.overlay
                        .visual
                        .offset(n.kind, n.overlay.actual, n.rect.height, self.time);
                raster.0[4] -= n.world.0[0] * offset[0] + n.world.0[2] * offset[1];
                raster.0[5] -= n.world.0[1] * offset[0] + n.world.0[3] * offset[1];
                break;
            }
            ancestor = n.parent;
        }
        let mut saved = Vec::new();
        for mut command in out.split_off(start) {
            match &mut command {
                Draw::Text { x, y, .. } => {
                    *y = crate::typography::snap_baseline(*y, raster.0, self.dpr);
                    let m = raster.0;
                    if (m[0] - 1.)
                        .abs()
                        .max((m[3] - 1.).abs())
                        .max(m[1].abs())
                        .max(m[2].abs())
                        < 1e-9
                    {
                        let (x, y) = raster.point(*x, *y);
                        out.push(Draw::TextRasterPhase {
                            phase: [x * self.dpr, y * self.dpr]
                                .map(|v| (v.rem_euclid(1.) * 256.).round() / 256.),
                        });
                    }
                }
                Draw::Save
                | Draw::Clip { .. }
                | Draw::RoundedClip { .. }
                | Draw::CornerClip { .. } => saved.push(raster),
                Draw::Restore => {
                    if let Some(value) = saved.pop() {
                        raster = value;
                    }
                }
                Draw::Transform { matrix } => raster = raster.multiply(Matrix(*matrix)),
                _ => {}
            }
            out.push(command);
        }
    }
}
