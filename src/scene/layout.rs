use super::*;
use crate::{
    content::GridTrack,
    typography::{self},
};
fn inset(r: Rect, p: [f64; 4]) -> Rect {
    Rect::new(
        r.x + p[0],
        r.y + p[1],
        (r.width - p[0] - p[2]).max(0.),
        (r.height - p[1] - p[3]).max(0.),
    )
}
fn tracks(
    spec: &[GridTrack],
    available: f64,
    gap: f64,
    children: &[(usize, usize, f64)],
) -> Vec<f64> {
    let n = spec.len().max(1);
    let fallback = GridTrack::default();
    let spec: Vec<_> = if spec.is_empty() {
        vec![&fallback]
    } else {
        spec.iter().collect()
    };
    let mut values: Vec<_> = spec
        .iter()
        .map(|s| {
            if s.unit == GridUnit::Pixel {
                s.value
            } else {
                0.
            }
        })
        .collect();
    let mut order = children.to_vec();
    order.sort_by_key(|c| c.1);
    for (start, span, size) in order {
        let start = start.min(n - 1);
        let end = (start + span).min(n);
        let occupied =
            values[start..end].iter().sum::<f64>() + gap * (end - start).saturating_sub(1) as f64;
        let deficit = (size - occupied).max(0.);
        let mut targets: Vec<_> = (start..end)
            .filter(|i| spec[*i].unit == GridUnit::Star)
            .collect();
        if targets.is_empty() {
            targets = (start..end)
                .filter(|i| spec[*i].unit == GridUnit::Auto)
                .collect();
        }
        if !targets.is_empty() {
            let add = deficit / targets.len() as f64;
            for i in targets {
                values[i] += add;
            }
        }
    }
    if available.is_finite() {
        let fixed = spec
            .iter()
            .enumerate()
            .filter(|(_, s)| s.unit != GridUnit::Star)
            .map(|(i, _)| values[i])
            .sum::<f64>()
            + gap * n.saturating_sub(1) as f64;
        let total = spec
            .iter()
            .filter(|s| s.unit == GridUnit::Star)
            .map(|s| s.value)
            .sum::<f64>();
        let remaining = (available - fixed).max(0.);
        for (i, s) in spec.iter().enumerate() {
            if s.unit == GridUnit::Star {
                values[i] = if total > 0. {
                    remaining * s.value / total
                } else {
                    0.
                };
            }
        }
    }
    values
}
fn span(values: &[f64], start: usize, count: usize, gap: f64) -> f64 {
    let start = start.min(values.len() - 1);
    let end = (start + count).min(values.len());
    values[start..end].iter().sum::<f64>() + gap * (end - start).saturating_sub(1) as f64
}
fn offset(values: &[f64], index: usize, gap: f64) -> f64 {
    let index = index.min(values.len() - 1);
    values[..index].iter().sum::<f64>() + gap * index as f64
}
// CGrid::MeasureCell gives an unbounded constraint only to a range that
// contains Auto and no Star. A spanning child can begin in an Auto column
// while still requiring the finite width of its Star columns for wrapping.
fn unbounded_auto(spec: &[GridTrack], start: usize, count: usize) -> bool {
    let range = spec.iter().skip(start.min(spec.len().saturating_sub(1))).take(count);
    range.clone().any(|t| t.unit == GridUnit::Auto)
        && !range.clone().any(|t| t.unit == GridUnit::Star)
}
impl Scene {
    pub(super) fn effective_flow_direction(&self, id: u32) -> FlowDirection {
        let mut at = Some(id);
        while let Some(id) = at {
            let n = &self.nodes[&id];
            if n.props.flow_direction_local {
                return n.props.flow_direction;
            }
            at = n.parent;
        }
        FlowDirection::LeftToRight
    }
    fn layout_properties(&self, id: u32) -> NodeProperties {
        let mut p = self.nodes[&id].props.clone();
        if matches!(self.nodes[&id].kind,NodeKind::Page|NodeKind::UserControl){p.padding=[0.;4];p.border_thickness=[0.;4];}
        p.margin = p.margin.map(|v| (v * self.dpr).round() / self.dpr);
        // Margin is arranged in the parent's coordinate system. Mirroring just
        // Grid columns leaves asymmetric margins on the wrong side in RTL.
        if self.nodes[&id].parent.is_some_and(|parent| {
            self.effective_flow_direction(parent) == FlowDirection::RightToLeft
        }) {
            p.margin.swap(0, 2);
        }
        p.flow_direction = self.effective_flow_direction(id);
        p
    }
    pub(super) fn measure_node(
        &mut self,
        id: u32,
        available: [f64; 2],
        measure: &mut impl TextMeasurer,
    ) -> [f64; 2] {
        let node = &self.nodes[&id];
        let (p, kind, children) = (
            self.layout_properties(id),
            node.kind,
            self.ordered_children(id),
        );
        if !p.visible {
            self.nodes.get_mut(&id).unwrap().desired = [0.; 2];
            return [0.; 2];
        }
        let border = if matches!(
            kind,
            NodeKind::Button | NodeKind::DropDownButton
                | NodeKind::RepeatButton
                | NodeKind::ToggleButton
                | NodeKind::HyperlinkButton
        ) {
            crate::button::defaults().border_thickness
        } else {
            0.
        };
        let mut pad = [
            p.padding[0] + border + crate::selection::leading(kind),
            p.padding[1] + border,
            p.padding[2] + border,
            p.padding[3] + border,
        ];
        if kind == NodeKind::CollectionItem
            || matches!(kind,NodeKind::Border|NodeKind::TableView) || matches!(kind,NodeKind::ContentPresenter|NodeKind::Frame) || matches!(kind,NodeKind::RelativePanel|NodeKind::LayoutPanel)
            || collections::is_view(kind)
            || overlays::is_overlay(kind)
        {
            let thickness = if kind == NodeKind::CollectionItem
                || matches!(kind,NodeKind::Border|NodeKind::TableView) || matches!(kind,NodeKind::ContentPresenter|NodeKind::Frame) || matches!(kind,NodeKind::RelativePanel|NodeKind::LayoutPanel)
                || overlays::is_overlay(kind)
                || collections::is_view(kind)
            {
                if matches!(kind,NodeKind::ContentPresenter|NodeKind::Frame){p.border_thickness.map(|v|(v*self.dpr).round()/self.dpr)}else{overlays::border_thickness(p.border_thickness, self.dpr)}
            } else {
                p.border_thickness
            };
            for (value, border) in pad.iter_mut().zip(thickness) {
                *value += border;
            }
        }
        if kind == NodeKind::Expander {
            pad = [0.; 4];
        }
        if compact_controls::is_split(kind) {
            pad = [0.; 4];
        }
        let aw = (p.width.unwrap_or(available[0] - p.margin[0] - p.margin[2]))
            .min(p.max_width.unwrap_or(f64::INFINITY))
            .max(p.min_width)
            .max(0.);
        let ah = (p.height.unwrap_or(available[1] - p.margin[1] - p.margin[3]))
            .min(p.max_height.unwrap_or(f64::INFINITY))
            .max(p.min_height)
            .max(0.);
        // Measure against the smallest physical-pixel width Arrange can produce.
        // Otherwise rounding a finite slot can create an extra line after height was measured.
        let measured_width = if aw.is_finite()
            && !crate::icons::is_icon(kind)
            && !crate::shapes::is_shape(kind)
            && kind != NodeKind::Image
        {
            (aw * self.dpr + 1e-9).floor() / self.dpr
        } else {
            aw
        };
        let inner = [
            (measured_width - pad[0] - pad[2]).max(0.),
            (ah - pad[1] - pad[3]).max(0.),
        ];
        let mut size: [f64; 2] = [0.; 2];
        let header = typography::layout(
            &p.header,
            &p.font(),
            inner[0],
            false,
            p.trimming,
            p.line_height,
            measure,
        );
        self.nodes.get_mut(&id).unwrap().header_text = header;
        let (measure_kind, p) = if crate::icons::is_icon(kind) {
            crate::icon_source::resolve(kind, &p).unwrap_or((kind, p))
        } else {
            (kind, p)
        };
        match measure_kind {
            NodeKind::Segmented|NodeKind::SegmentedItem => {size=self.measure_segmented(id,inner,measure);}
            NodeKind::TableView=>{size=self.measure_table(id,inner);}
            NodeKind::ScrollBar|NodeKind::Thumb|NodeKind::TickBar|NodeKind::ItemsPresenter=>{size=self.measure_primitive(id,inner,measure);}
            NodeKind::ContentControl|NodeKind::ContentPresenter|NodeKind::UserControl|NodeKind::Page|NodeKind::Frame=>{size=self.measure_content_host(id,inner,measure);}
            NodeKind::PagerControl|NodeKind::AnnotatedScrollBar|NodeKind::LayoutPanel|NodeKind::RichTextBlock|NodeKind::RichTextBlockOverflow=>{size=self.measure_reading(id,inner,measure);}
            NodeKind::ItemsRepeater=>{size=self.measure_repeater(id,inner,measure);}
            NodeKind::RefreshContainer|NodeKind::RefreshVisualizer=>{size=self.measure_refresh(id,inner,measure);}
            NodeKind::SplitView|NodeKind::SemanticZoom|NodeKind::ParallaxView|NodeKind::SwipeControl=>{size=self.measure_view(id,inner,measure);}
            NodeKind::UICommand|NodeKind::StandardCommand=>{}
            NodeKind::MenuBar|NodeKind::MenuBarItem|NodeKind::CommandBarFlyout=>{size=self.measure_command_menu(id,inner,measure);}
            NodeKind::RelativePanel|NodeKind::WrapPanel=>{size=self.measure_layout_panel(id,inner,measure);}
            NodeKind::CalendarView|NodeKind::CalendarDatePicker|NodeKind::DatePicker|NodeKind::TimePicker|NodeKind::ColorPicker=>{size=self.measure_picker(id,inner,measure);}
            _ if self.is_picker_surface(id)=>{size=self.measure_picker(id,inner,measure);}
            NodeKind::AppBarButton | NodeKind::AppBarToggleButton | NodeKind::DropDownButton | NodeKind::CommandBar | NodeKind::AppBarSeparator => {size=self.measure_command(id,inner,measure);}

            NodeKind::AutoSuggestBox
            | NodeKind::NumberBox
            | NodeKind::ComboBox
            | NodeKind::ContentDialog
            | NodeKind::TeachingTip => {
                for child in &children {
                    if !overlays::is_overlay(self.nodes[child].kind) {
                        let d = self.measure_node(*child, inner, measure);
                        size = [size[0].max(d[0]), size[1].max(d[1])];
                    }
                }
            }
            NodeKind::FlipView
            | NodeKind::PipsPager
            | NodeKind::BreadcrumbBar
            | NodeKind::TabView | NodeKind::SelectorBar => {
                size = self.measure_navigation_control(id, inner, measure);
            }
            NodeKind::ItemsView | NodeKind::ListView | NodeKind::GridView | NodeKind::TreeView => {
                size = self.measure_collection(id, inner, measure);
            }
            NodeKind::ItemsStackPanel
            | NodeKind::ItemsWrapGrid
            | NodeKind::VariableSizedWrapGrid => {
                size = self.measure_items_panel(id, inner, measure);
            }
            NodeKind::InfoBar
            | NodeKind::PersonPicture
            | NodeKind::RatingControl
            | NodeKind::SplitButton
            | NodeKind::ToggleSplitButton => {
                size = self.measure_compact(id, inner, measure);
            }
            NodeKind::Slider => {
                let header = if p.header.is_empty() {
                    0.
                } else {
                    self.nodes[&id].header_text.height + 4.
                };
                size = if p.orientation == Orientation::Vertical {
                    [32., header]
                } else {
                    [self.nodes[&id].header_text.width, 32. + header]
                };
            }
            NodeKind::MenuFlyout => {size=self.measure_menu_presenter(id,inner[0],measure);}
            NodeKind::ToolTip if children.is_empty() => {
                let text = typography::layout(
                    &p.text,
                    &p.font(),
                    inner[0],
                    true,
                    p.trimming,
                    p.line_height,
                    measure,
                );
                size = [text.width, text.height];
                self.nodes.get_mut(&id).unwrap().text = text;
            }

            NodeKind::Rectangle
            | NodeKind::Line
            | NodeKind::Path
            | NodeKind::Polygon
            | NodeKind::Polyline => {
                size = crate::shapes::measure(
                    kind,
                    &p,
                    self.nodes[&id].shape_path.as_ref().unwrap(),
                    inner,
                );
            }

            NodeKind::IconSourceElement => {}
            NodeKind::AnimatedIcon if !p.source.is_empty() => {
                let source = serde_json::from_value(p.source.clone().into()).unwrap();
                size = crate::animated_icon::size(source);
                if size[0] > 0. && size[1] > 0. {
                    let scale = (inner[0] / size[0]).min(inner[1] / size[1]);
                    if scale.is_finite() {
                        size = size.map(|v| v * scale);
                    }
                }
            }
            NodeKind::FontIcon | NodeKind::SymbolIcon => {
                let label = if measure_kind == NodeKind::SymbolIcon {
                    crate::icons::symbol_glyph(p.symbol.unwrap_or(Symbol::Emoji))
                } else {
                    &p.glyph
                };
                let font = p.font();
                let m = measure.measure(label, &font);
                let text = typography::layout(
                    label,
                    &font,
                    f64::INFINITY,
                    false,
                    p.trimming,
                    Some(m.ascent + m.descent),
                    measure,
                );
                size = [text.width, text.height];
                self.nodes.get_mut(&id).unwrap().text = text;
            }
            NodeKind::PathIcon => {
                let b = self.nodes[&id].icon_path.as_ref().unwrap().bounds;
                size = [(b.x + b.width).max(0.), (b.y + b.height).max(0.)];
            }
            NodeKind::BitmapIcon | NodeKind::ImageIcon => {
                size = self
                    .images
                    .get(crate::icons::source(&p, measure_kind))
                    .copied()
                    .unwrap_or([0.; 2]);
                if size[0] > 0. && size[1] > 0. {
                    let scale = (inner[0] / size[0]).min(inner[1] / size[1]);
                    if scale.is_finite() {
                        size = size.map(|n| n * scale);
                    }
                }
            }
            NodeKind::Canvas => {
                for child in &children {
                    self.measure_node(*child, [f64::INFINITY; 2], measure);
                }
            }
            NodeKind::Border => {
                if let Some(child) = children.first() {
                    size = self.measure_node(*child, inner, measure);
                }
            }
            NodeKind::InfoBadge => {
                let label = crate::icons::badge_label(&p);
                let margin = crate::icons::badge_margin(&p);
                let mut font = p.font();
                if p.value < 0. {
                    font.family = "Segoe Fluent Icons".into();
                    // FontIcon's default 20-DIP em is fitted by the template
                    // Viewbox into the height remaining after its bottom margin.
                    font.size = if inner[1].is_finite() {
                        (inner[1] - margin[1] - margin[3]).max(1.)
                    } else {
                        20.
                    };
                }
                let text = typography::layout(
                    &label,
                    &font,
                    f64::INFINITY,
                    false,
                    p.trimming,
                    None,
                    measure,
                );
                size = if label.is_empty() {
                    [4., 4.]
                } else {
                    [
                        (text.width + margin[0] + margin[2]).max(
                            (if p.value >= 0. {
                                text.height + margin[1] + margin[3]
                            } else {
                                font.size + margin[1] + margin[3]
                            } + p.padding[1]
                                + p.padding[3])
                                .min(p.max_height.unwrap_or(f64::INFINITY))
                                - p.padding[0]
                                - p.padding[2],
                        ),
                        if p.value >= 0. {
                            text.height + margin[1] + margin[3]
                        } else {
                            font.size + margin[1] + margin[3]
                        },
                    ]
                };
                self.nodes.get_mut(&id).unwrap().text = text;
            }
            NodeKind::Expander => {
                let head = typography::layout(
                    &p.header,
                    &p.font(),
                    (inner[0] - 78.).max(0.),
                    p.wrap,
                    p.trimming,
                    p.line_height,
                    measure,
                );
                let mut header_size = [head.width, head.height];
                if let Some(child) = children.iter().find(|child| self.nodes[child].props.is_expander_header && !self.nodes[child].children.is_empty()) {
                    header_size = self.measure_node(*child, [(inner[0] - 78.).max(0.), f64::INFINITY], measure);
                }
                let hh = p.min_height.max(header_size[1] + 2.);
                let mut content = [0.; 2];
                if let Some(child) = children.iter().find(|child| !self.nodes[child].props.is_expander_header) {
                    content = self.measure_node(
                        *child,
                        [
                            (inner[0] - p.padding[0] - p.padding[2] - 2.).max(0.),
                            f64::INFINITY,
                        ],
                        measure,
                    );
                }
                let n = self.nodes.get_mut(&id).unwrap();
                n.header_text = head;
                n.expander.header_height = hh;
                n.expander.content_height =
                    (content[1] + p.padding[1] + p.padding[3] + 1.).max(p.min_height);
                size = [
                    (header_size[0] + 78.).max(content[0] + p.padding[0] + p.padding[2] + 2.),
                    hh + if n.expander.shown(self.time, &p) {
                        n.expander.content_height
                    } else {
                        0.
                    },
                ];
            }
            NodeKind::Viewbox => {
                let content = children
                    .first()
                    .map(|child| self.measure_node(*child, [f64::INFINITY; 2], measure))
                    .unwrap_or([0.; 2]);
                // The source Viewbox measures an internal Border. Its rounded
                // natural DesiredSize is the scale denominator, including when
                // an explicitly sized child falls on a half physical pixel.
                let content = content.map(|v| (v * self.dpr + 0.5 + 1e-9).floor() / self.dpr);
                self.nodes.get_mut(&id).unwrap().viewbox.content_size = content;
                let scale =
                    basic_next::viewbox_scale(inner, content, p.stretch, p.stretch_direction);
                size = std::array::from_fn(|i| {
                    ((content[i] * scale[i] * self.dpr + 0.5 + 1e-9).floor() / self.dpr)
                        .min(inner[i])
                });
            }
            NodeKind::ProgressBar => {
                size = [0., p.min_height];
            }
            NodeKind::ProgressRing => {
                size = [32., 32.];
            }
            NodeKind::TextBox | NodeKind::PasswordBox | NodeKind::RichEditBox => {
                let hh = self.input_header_height(id);
                let focused = self.focused == Some(id);
                let editor = &mut self.nodes.get_mut(&id).unwrap().editor;
                let scroll = (editor.scroll_x, editor.scroll_y);
                size = editor.layout(
                    kind,
                    &p,
                    (aw, p.height),
                    focused,
                    hh,
                    self.dpr,
                    measure,
                );
                // Measure can use an unconstrained height. Only Arrange can
                // clamp the scroll offset to the actual editor viewport.
                if kind == NodeKind::RichEditBox {
                    (editor.scroll_x, editor.scroll_y) = scroll;
                }
                // Editor padding is already incorporated by its template layout.
                size[0] = (size[0] - pad[0] - pad[2]).max(0.);
                size[1] = (size[1] - pad[1] - pad[3]).max(0.);
            }
            NodeKind::ScrollViewer | NodeKind::ScrollView | NodeKind::ScrollContentPresenter => {
                let available = [
                    if p.horizontal_scroll_mode == ScrollMode::Disabled
                        || p.horizontal_scroll_bar_visibility == ScrollBarVisibility::Disabled
                    {
                        inner[0] / p.zoom_factor
                    } else {
                        f64::INFINITY
                    },
                    if p.vertical_scroll_mode == ScrollMode::Disabled
                        || p.vertical_scroll_bar_visibility == ScrollBarVisibility::Disabled
                    {
                        inner[1] / p.zoom_factor
                    } else {
                        f64::INFINITY
                    },
                ];
                for child in &children {
                    let d = self.measure_node(*child, available, measure);
                    size[0] = size[0].max(d[0]);
                    size[1] = size[1].max(d[1]);
                }
                if let Some(host) = self.nodes[&id].scroll.host.as_ref() {
                    size = [
                        host.extent_width.max(host.viewport_width),
                        host.extent_height.max(host.viewport_height),
                    ];
                }
                self.nodes.get_mut(&id).unwrap().scroll.extent = size;
                size = [
                    (size[0] * p.zoom_factor).min(inner[0]),
                    (size[1] * p.zoom_factor).min(inner[1]),
                ];
            }
            NodeKind::TextBlock
            | NodeKind::Button
            | NodeKind::RepeatButton
            | NodeKind::HyperlinkButton
            | NodeKind::ToggleButton
            | NodeKind::CheckBox
            | NodeKind::RadioButton
            | NodeKind::ToggleSwitch

            | NodeKind::CollectionItem
            | NodeKind::CollectionHeader
                if children.is_empty() || self.uses_default_collection_label(id, &children) =>
            {
                // The checkbox occupies the row's leading inset, outside the label slot.
                for child in &children {
                    self.measure_node(*child, inner, measure);
                }
                let mut text = typography::layout(
                    p.display_text(kind),
                    &p.font(),
                    inner[0],
                    p.wrap,
                    p.trimming,
                    p.line_height,
                    measure,
                );
                if kind == NodeKind::TextBlock && p.trimming == TextTrimming::Clip {
                    typography::line_services_rounding(&mut text, self.dpr);
                }
                if kind == NodeKind::TextBlock {
                    typography::constrain_lines(&mut text,&p.font(),inner[0],inner[1],p.max_lines,p.trimming,measure);
                }
                size = [text.width, text.height];
                self.nodes.get_mut(&id).unwrap().text = text;
            }
            NodeKind::RadioButtons => {
                for child in &children {
                    self.measure_node(*child, [f64::INFINITY, f64::INFINITY], measure);
                }
                let max_w = children
                    .iter()
                    .map(|c| self.nodes[c].desired[0])
                    .fold(0., f64::max);
                let max_w = (max_w * self.dpr).ceil() / self.dpr;
                let max_h = children
                    .iter()
                    .map(|c| self.nodes[c].desired[1])
                    .fold(0., f64::max);
                let cols = p
                    .max_columns
                    .min(children.len())
                    .min(
                        ((inner[0] + selection_input::group_spacing()[0])
                            / (max_w + selection_input::group_spacing()[0]))
                            .floor()
                            .max(1.) as usize,
                    )
                    .max(1);
                let rows = children.len().div_ceil(cols);
                size = [
                    max_w * cols as f64
                        + selection_input::group_spacing()[0] * cols.saturating_sub(1) as f64,
                    max_h * rows as f64
                        + selection_input::group_spacing()[1] * rows.saturating_sub(1) as f64
                        + self.input_header_height(id),
                ];
            }
            NodeKind::Image => {
                size = self.images.get(&p.source).copied().unwrap_or([0.; 2]);
                if p.stretch != ImageStretch::None
                    && size[0] > 0.
                    && size[1] > 0.
                    && inner[0].is_finite() != inner[1].is_finite()
                {
                    let axis = usize::from(!inner[0].is_finite());
                    let scale = inner[axis] / size[axis];
                    size = [size[0] * scale, size[1] * scale];
                }
                if p.stretch != ImageStretch::None
                    && size[0] > 0.
                    && size[1] > 0.
                    && inner.iter().all(|v| v.is_finite())
                {
                    let ratios = [inner[0] / size[0], inner[1] / size[1]];
                    size = match p.stretch {
                        ImageStretch::Fill => inner,
                        ImageStretch::Uniform => {
                            let scale = ratios[0].min(ratios[1]);
                            [size[0] * scale, size[1] * scale]
                        }
                        ImageStretch::UniformToFill => {
                            let scale = ratios[0].max(ratios[1]);
                            [
                                (size[0] * scale).min(inner[0]),
                                (size[1] * scale).min(inner[1]),
                            ]
                        }
                        ImageStretch::None => unreachable!(),
                    };
                }
            }
            NodeKind::NavigationView => {
                size = self.measure_navigation_view(id,inner,measure);
            }
            NodeKind::NavigationViewItem => {
                let text=typography::layout(&p.text,&p.font(),inner[0],p.wrap,p.trimming,p.line_height,measure);
                let host=self.nodes[&id].navigation_template.parts.get("ItemPart:standalone/ContentPresenter").copied();
                let content=host.map(|host|self.measure_node(host,inner,measure)).unwrap_or([text.width,text.height]);
                size=[8.+content[0]+if p.icon_source.is_some(){40.+12.+(14.*self.dpr).round()/self.dpr}else{12.+(14.*self.dpr).round()/self.dpr},content[1].max(36.)+4.];
            }
            NodeKind::StackPanel => {
                let vertical = p.orientation == Orientation::Vertical;
                for child in &children {
                    let child_size = self.measure_node(
                        *child,
                        if vertical {
                            [inner[0], f64::INFINITY]
                        } else {
                            [f64::INFINITY, inner[1]]
                        },
                        measure,
                    );
                    if vertical {
                        size[0] = size[0].max(child_size[0]);
                        size[1] += child_size[1];
                    } else {
                        size[0] += child_size[0];
                        size[1] = size[1].max(child_size[1]);
                    }
                }
                let gaps = p.spacing
                    * children
                        .iter()
                        .filter(|c| self.nodes[c].props.visible)
                        .count()
                        .saturating_sub(1) as f64;
                if vertical {
                    size[1] += gaps;
                } else {
                    size[0] += gaps;
                }
            }
            NodeKind::Popup
            | NodeKind::ToolTip
            | NodeKind::Flyout
            | NodeKind::Grid
            | NodeKind::Button
            | NodeKind::RepeatButton
            | NodeKind::HyperlinkButton
            | NodeKind::ToggleButton
            | NodeKind::CheckBox
            | NodeKind::RadioButton
            | NodeKind::CollectionItem
            | NodeKind::CollectionHeader => {
                for child in &children {
                    let cp = &self.nodes[child].props;
                    let width = if unbounded_auto(&p.columns, cp.column, cp.column_span)
                    {
                        f64::INFINITY
                    } else {
                        inner[0]
                    };
                    let height = if unbounded_auto(&p.rows, cp.row, cp.row_span) {f64::INFINITY} else {inner[1]};
                    self.measure_node(*child, [width, height], measure);
                }
                let column_spacing = p.column_spacing.unwrap_or(p.spacing);
                let row_spacing = p.row_spacing.unwrap_or(p.spacing);
                let widths = self.grid_tracks(&children, &p.columns, inner[0], column_spacing, true);
                for child in &children {
                    let cp = &self.nodes[child].props;
                    // An unbounded Star/Auto axis remains unbounded during
                    // Measure. Feeding its natural track width back into a
                    // second Measure would enlarge an intrinsic Image and alter
                    // the Viewbox's natural scale denominator.
                    let fixed = p
                        .columns
                        .iter()
                        .skip(cp.column)
                        .take(cp.column_span)
                        .any(|t| t.unit == GridUnit::Pixel);
                    let w = if !inner[0].is_finite() && !fixed {
                        f64::INFINITY
                    } else {
                        span(&widths, cp.column, cp.column_span, column_spacing)
                    };
                    let h = if unbounded_auto(&p.rows, cp.row, cp.row_span) {f64::INFINITY} else {inner[1]};
                    self.measure_node(*child, [w, h], measure);
                }
                let heights = self.grid_tracks(&children, &p.rows, inner[1], row_spacing, false);
                // Desired size of star tracks comes from content, rather than occupying the
                // entire measure constraint. Arrange distributes the final available size.
                let desired_w =
                    self.grid_tracks(&children, &p.columns, f64::INFINITY, column_spacing, true);
                let desired_h =
                    self.grid_tracks(&children, &p.rows, f64::INFINITY, row_spacing, false);
                size = [
                    desired_w.iter().sum::<f64>()
                        + column_spacing * widths.len().saturating_sub(1) as f64,
                    desired_h.iter().sum::<f64>()
                        + row_spacing * heights.len().saturating_sub(1) as f64,
                ];
            }
            _ => {}
        }
        if kind == NodeKind::ToggleSwitch {
            size[1] = size[1].max(20.) + 20. + self.input_header_height(id);
        }
        if !p.header.is_empty() {
            size[0] = size[0].max(self.nodes[&id].header_text.width);
        }
        // Natural desired dimensions include the physical-pixel ceiling. Propagate
        // that budget through StackPanel/Grid instead of rounding only the child
        // during Arrange, where its fractional parent slot could shrink it again.
        let ceil_pixel = |v: f64| (v * self.dpr - 1e-9).ceil() / self.dpr;
        let without_margin = [
            p.width
                .unwrap_or_else(|| ceil_pixel(size[0] + pad[0] + pad[2]))
                .max(p.min_width)
                .min(p.max_width.unwrap_or(f64::INFINITY)),
            p.height
                .unwrap_or_else(|| ceil_pixel(size[1] + pad[1] + pad[3]))
                .max(p.min_height)
                .min(p.max_height.unwrap_or(f64::INFINITY)),
        ];
        // Arrange consumes pixel-rounded margins. Budget those same margins in
        // DesiredSize, otherwise a 10-DIP margin at 125% can steal 0.8 DIP from
        // a naturally sized child and wrap its final word into a clipped line.
        let margin = if self.is_combo_item(id) {
            self.nodes[&id].props.margin
        } else {
            p.margin
        };
        let result = std::array::from_fn(|axis| {
            let raw_margin = self.nodes[&id].props.margin;
            let m = (margin[axis] + margin[axis + 2])
                .max(raw_margin[axis] + raw_margin[axis + 2]);
            if m != 0. {
                ceil_pixel(without_margin[axis] + m)
            } else {
                without_margin[axis]
            }
        });
        self.nodes.get_mut(&id).unwrap().desired_without_margin = without_margin;
        self.nodes.get_mut(&id).unwrap().desired = result;
        if kind == NodeKind::CollectionItem {
            let font = crate::typography::Font {
                family: "Segoe Fluent Icons".into(),
                size: 16.,
                ..Default::default()
            };
            self.nodes.get_mut(&id).unwrap().collection.check_label = crate::typography::layout(
                "\u{e73e}",
                &font,
                f64::INFINITY,
                false,
                TextTrimming::Clip,
                Some(16.),
                measure,
            );
        }
        result
    }
    fn grid_tracks(
        &self,
        children: &[u32],
        spec: &[GridTrack],
        available: f64,
        gap: f64,
        horizontal: bool,
    ) -> Vec<f64> {
        let values = children
            .iter()
            .filter(|id| self.nodes[id].props.visible)
            .map(|id| {
                let node = &self.nodes[id];
                if horizontal {
                    (node.props.column, node.props.column_span, node.desired[0])
                } else {
                    (node.props.row, node.props.row_span, node.desired[1])
                }
            })
            .collect::<Vec<_>>();
        tracks(spec, available, gap, &values)
    }
    pub(super) fn arrange_node(
        &mut self,
        id: u32,
        slot: Rect,
        parent_world: Matrix,
        inherited: (Theme, bool, bool),
        measure: &mut impl TextMeasurer,
    ) {
        let (theme, enabled, visible) = inherited;
        let n = &self.nodes[&id];
        let default_label = self.uses_default_collection_label(id, &n.children);
        let (mut p, kind, children, desired) = (
            self.layout_properties(id),
            n.kind,
            self.ordered_children(id),
            n.desired,
        );
        let combo_template = self.is_combo_item(id);
        // ComboBoxItem's margin belongs to its inner Grid template. Preserve
        // the raw margin and XFLOAT RenderSize instead of shrinking its ink by
        // rounding each outer container margin independently.
        if combo_template {
            p.margin = n.props.margin;
        }
        let slot = inset(slot, p.margin);
        let width = p
            .width
            .unwrap_or(if p.horizontal_alignment == HorizontalAlignment::Stretch {
                slot.width
            } else {
                // Never round an unconstrained natural width below its text
                // advance: that would introduce a new wrap during Arrange.
                (((desired[0] - p.margin[0] - p.margin[2]) * self.dpr).ceil() / self.dpr)
                    .min(slot.width)
            })
            .max(p.min_width)
            .min(p.max_width.unwrap_or(f64::INFINITY));
        let height = p
            .height
            .unwrap_or(if p.vertical_alignment == VerticalAlignment::Stretch {
                slot.height
            } else {
                (desired[1] - p.margin[1] - p.margin[3]).min(slot.height)
            })
            .max(p.min_height)
            .min(p.max_height.unwrap_or(f64::INFINITY));
        let media = kind == NodeKind::Image
            // CMediaBase::UpdateInternalSize uses the specified/natural size
            // directly without layout storage under Canvas. Its ImageBrush
            // performs the centered stretch/crop inside that rectangle.
            && !self.nodes[&id].parent.is_some_and(|parent| self.nodes[&parent].kind == NodeKind::Canvas)
            && self
                .images
                .get(&p.source)
                .is_some_and(|s| s[0] > 0. && s[1] > 0.);
        let allocation = if kind == NodeKind::Viewbox || media {
            [width, height].map(|v| (v * self.dpr + 0.5 + 1e-9).floor() / self.dpr)
        } else {
            [width, height]
        };
        let (width, height) = if kind == NodeKind::Viewbox || media {
            let content = if media {
                self.images[&p.source]
            } else {
                self.nodes[&id].viewbox.content_size
            };
            let scale =
                basic_next::viewbox_scale(allocation, content, p.stretch, p.stretch_direction);
            let render = [content[0] * scale[0], content[1] * scale[1]]
                .map(|v| (v * self.dpr + 0.5 + 1e-9).floor() / self.dpr);
            let v = &mut self.nodes.get_mut(&id).unwrap().viewbox;
            v.scale = scale;
            // Media Arrange rounds the allocation before deriving its layout clip.
            // Reusing the unrounded slot clips the last image row/column at 125%.
            let clip_slot = if media {
                [slot.width, slot.height]
                    .map(|value| (value * self.dpr + 0.5 + 1e-9).floor() / self.dpr)
            } else {
                [slot.width, slot.height]
            };
            v.clip = (render[0] > allocation[0].min(clip_slot[0]) + 1e-6
                || render[1] > allocation[1].min(clip_slot[1]) + 1e-6)
                .then(|| {
                    let clip_width=render[0].min(allocation[0]).min(clip_slot[0]);
                    let clip_height=render[1].min(allocation[1]).min(clip_slot[1]);
                    Rect::new(
                        if media{match p.horizontal_alignment{HorizontalAlignment::Center=>(render[0]-clip_width).max(0.)/2.,HorizontalAlignment::Right=>(render[0]-clip_width).max(0.),_=>0.}}else{0.},
                        if media{match p.vertical_alignment{VerticalAlignment::Center=>(render[1]-clip_height).max(0.)/2.,VerticalAlignment::Bottom=>(render[1]-clip_height).max(0.),_=>0.}}else{0.},
                        clip_width,
                        clip_height,
                    )
                });
            (render[0], render[1])
        } else {
            (width, height)
        };
        let aligned = if media {
            [if matches!(p.horizontal_alignment,HorizontalAlignment::Center|HorizontalAlignment::Right){width}else{width.min(allocation[0])},if matches!(p.vertical_alignment,VerticalAlignment::Center|VerticalAlignment::Bottom){height}else{height.min(allocation[1])}]
        } else if kind == NodeKind::Viewbox {
            [width.min(allocation[0]), height.min(allocation[1])]
        } else {
            [width, height]
        };
        // Native FrameworkElement stores Viewbox ink/alignment sizes as
        // XFLOAT. Do this subtraction at the source precision after rounding
        // RenderSize, keeping child-space layout and the scale denominator intact.
        let alignment_offset = |space: f64, ink: f64, half: bool| {
            if kind == NodeKind::Viewbox || media {
                let d = space as f32 - ink as f32;
                f64::from(if half { d * 0.5 } else { d })
            } else {
                (space - ink) * if half { 0.5 } else { 1. }
            }
        };
        let x = slot.x
            + match p.horizontal_alignment {
                HorizontalAlignment::Left => 0.,
                HorizontalAlignment::Right => alignment_offset(slot.width, aligned[0], false),
                HorizontalAlignment::Stretch
                    if kind == NodeKind::Viewbox || media || kind == NodeKind::CollectionItem =>
                {
                    alignment_offset(slot.width, aligned[0], true).max(0.)
                }
                _ => alignment_offset(slot.width, aligned[0], true),
            };
        let y = slot.y
            + match p.vertical_alignment {
                VerticalAlignment::Top => 0.,
                VerticalAlignment::Bottom => alignment_offset(slot.height, aligned[1], false),
                VerticalAlignment::Stretch
                    if kind == NodeKind::Viewbox || media || kind == NodeKind::CollectionItem =>
                {
                    alignment_offset(slot.height, aligned[1], true).max(0.)
                }
                _ => alignment_offset(slot.height, aligned[1], true),
            };
        // Stable half-pixel ties: x and x+an integer pixel width must round
        // in the same direction despite floating point addition noise.
        let round = |v: f64| (v * self.dpr + 0.5 + 1e-9).floor() / self.dpr;
        let rect = if combo_template {
            let native_round = |v: f64| ((v as f32 as f64) * self.dpr).round() / self.dpr;
            Rect::new(
                native_round(x),
                native_round(y),
                native_round(width),
                native_round(height),
            )
        } else {
            Rect::new(
                round(x),
                round(y),
                (round(x + width) - round(x)).max(0.),
                (round(y + height) - round(y)).max(0.),
            )
        };
        let world = parent_world
            .multiply(Matrix([1., 0., 0., 1., rect.x, rect.y]))
            .multiply(Matrix(p.transform))
            .multiply(if kind == NodeKind::CollectionItem {
                self.nodes[&id].collection.entry_matrix(rect, self.time)
            } else {
                Matrix::default()
            });
        let theme = p.theme.unwrap_or(theme);
        let enabled = enabled && p.enabled;
        let visible = visible && p.visible;
        let n = self.nodes.get_mut(&id).unwrap();
        n.rect = rect;
        n.world = world;
        n.theme = theme;
        n.enabled = enabled;
        n.visible = visible;
        let border = if matches!(
            kind,
            NodeKind::Button | NodeKind::DropDownButton
                | NodeKind::RepeatButton
                | NodeKind::ToggleButton
                | NodeKind::HyperlinkButton
        ) {
            crate::button::defaults().border_thickness
        } else {
            0.
        };
        if kind == NodeKind::CollectionItem
            || matches!(kind,NodeKind::Border|NodeKind::TableView) || matches!(kind,NodeKind::ContentPresenter|NodeKind::Frame) || matches!(kind,NodeKind::RelativePanel|NodeKind::LayoutPanel)
            || overlays::is_overlay(kind)
            || collections::is_view(kind)
        {
            p.border_thickness = if matches!(kind,NodeKind::ContentPresenter|NodeKind::Frame){p.border_thickness.map(|v|(v*self.dpr).round()/self.dpr)}else{overlays::border_thickness(p.border_thickness, self.dpr)};
        }
        let inner = inset(
            Rect::new(0., 0., rect.width, rect.height),
            [
                p.padding[0]
                    + border
                    + crate::selection::leading(kind)
                    + if kind == NodeKind::CollectionItem
                        || matches!(kind,NodeKind::Border|NodeKind::TableView) || matches!(kind,NodeKind::ContentPresenter|NodeKind::Frame) || matches!(kind,NodeKind::RelativePanel|NodeKind::LayoutPanel)
                        || collections::is_view(kind)
                        || overlays::is_overlay(kind)
                    {
                        p.border_thickness[0]
                    } else {
                        0.
                    },
                p.padding[1]
                    + border
                    + if kind == NodeKind::CollectionItem
                        || matches!(kind,NodeKind::Border|NodeKind::TableView) || matches!(kind,NodeKind::ContentPresenter|NodeKind::Frame) || matches!(kind,NodeKind::RelativePanel|NodeKind::LayoutPanel)
                        || collections::is_view(kind)
                        || overlays::is_overlay(kind)
                    {
                        p.border_thickness[1]
                    } else {
                        0.
                    },
                p.padding[2]
                    + border
                    + if kind == NodeKind::CollectionItem
                        || matches!(kind,NodeKind::Border|NodeKind::TableView) || matches!(kind,NodeKind::ContentPresenter|NodeKind::Frame) || matches!(kind,NodeKind::RelativePanel|NodeKind::LayoutPanel)
                        || collections::is_view(kind)
                        || overlays::is_overlay(kind)
                    {
                        p.border_thickness[2]
                    } else {
                        0.
                    },
                p.padding[3]
                    + border
                    + if kind == NodeKind::CollectionItem
                        || matches!(kind,NodeKind::Border|NodeKind::TableView) || matches!(kind,NodeKind::ContentPresenter|NodeKind::Frame) || matches!(kind,NodeKind::RelativePanel|NodeKind::LayoutPanel)
                        || collections::is_view(kind)
                        || overlays::is_overlay(kind)
                    {
                        p.border_thickness[3]
                    } else {
                        0.
                    },
            ],
        );
        if matches!(
            kind,
            NodeKind::TextBlock
                | NodeKind::Button
                | NodeKind::RepeatButton
                | NodeKind::HyperlinkButton
                | NodeKind::ToggleButton
                | NodeKind::CheckBox
                | NodeKind::RadioButton
                | NodeKind::ToggleSwitch

                | NodeKind::CollectionItem
                | NodeKind::CollectionHeader
        ) && (children.is_empty() || default_label)
        {
            n.text = typography::layout(
                p.display_text(kind),
                &p.font(),
                inner.width,
                p.wrap,
                p.trimming,
                p.line_height,
                measure,
            );
            if kind == NodeKind::TextBlock && p.trimming == TextTrimming::Clip {
                typography::line_services_rounding(&mut n.text, self.dpr);
            }
            if kind == NodeKind::TextBlock {
                typography::constrain_lines(&mut n.text,&p.font(),inner.width,inner.height,p.max_lines,p.trimming,measure);
            }
        }
        // NavigationView binds its viewport and policies once, in its template executor.
        if text_edit::is_editor(kind) {
            let hh = self.input_header_height(id);
            let focused = self.focused == Some(id);
            self.nodes.get_mut(&id).unwrap().editor.layout(
                kind,
                &p,
                (rect.width, Some(rect.height)),
                focused,
                hh,
                self.dpr,
                measure,
            );
            if kind == NodeKind::RichEditBox {
                self.sync_rich_editor_scroll(id);
            }
        }
        if kind == NodeKind::MenuFlyout {
            let extent=self.nodes[&id].overlay.row_heights.iter().sum::<f64>();
            let state=&mut self.nodes.get_mut(&id).unwrap().overlay;
            state.menu_extent=extent;state.menu_viewport=inner.height;
            state.menu_offset=state.menu_offset.clamp(0.,(extent-inner.height).max(0.));
            let mut y = ((rect.y+inner.y-state.menu_offset)*self.dpr).round_ties_even()/self.dpr-rect.y;
            let mut rows = vec![];
            for index in 0..p.menu_items.len() {
                let h=self.nodes[&id].overlay.row_heights[index];
                let row_y = ((rect.y + y) * self.dpr).round_ties_even() / self.dpr - rect.y;
                rows.push(Rect::new(inner.x, row_y, inner.width, h));
                y += h;
            }
            self.nodes.get_mut(&id).unwrap().overlay.rows = rows;
            self.arrange_menu_parts(id);
        }
        if kind==NodeKind::NavigationView{self.arrange_navigation_view(id,measure);
        }else if kind==NodeKind::NavigationViewItem&&self.nodes[&id].navigation_template.owner.is_none(){self.arrange_standalone_navigation_item(id,measure);
        }else if kind==NodeKind::TableView{self.arrange_table(id,inner,measure);
        }else if kind==NodeKind::ItemsPresenter{self.arrange_items_presenter(id,inner,measure);
        }else if content_hosts::is_host(kind){self.arrange_content_host(id,inner,measure);
        }else if matches!(kind,NodeKind::PagerControl|NodeKind::AnnotatedScrollBar|NodeKind::LayoutPanel|NodeKind::RichTextBlock|NodeKind::RichTextBlockOverflow){self.arrange_reading(id,inner,measure);
        }else if view_controls::is_view(kind){
            self.arrange_view(id,inner,measure);
        }else if kind==NodeKind::ItemsRepeater{self.arrange_repeater(id,inner,measure);
        }else if refresh::is_control(kind){self.arrange_refresh(id,inner,measure);
        }else if picker_controls::is_control(kind)||self.is_picker_surface(id){
            self.arrange_picker(id,measure);
        }else if matches!(kind,NodeKind::MenuBar|NodeKind::MenuBarItem|NodeKind::CommandBarFlyout){
            self.arrange_command_menu(id,inner,measure);
        }else if matches!(kind,NodeKind::RelativePanel|NodeKind::WrapPanel){
            self.arrange_layout_panel(id,inner,measure);
        }else if command_controls::is_control(kind) {
            self.arrange_command(id,Rect::new(0.,0.,rect.width,rect.height),measure);
        }else if compact_controls::is_compact(kind) {
            self.arrange_compact(id, measure);
        } else if kind == NodeKind::Canvas {
            for child in children {
                let cp = &self.nodes[&child].props;
                let d = self.nodes[&child].desired;
                let x = cp.canvas_left.unwrap_or(0.);
                let y = cp.canvas_top.unwrap_or(0.);
                self.arrange_node(
                    child,
                    Rect::new(0., 0., d[0], d[1]),
                    world,
                    (theme, enabled, visible),
                    measure,
                );
                let child = self.nodes.get_mut(&child).unwrap();
                child.rect.x += x;
                child.rect.y += y;
            }
        } else if kind == NodeKind::Expander {
            self.nodes.get_mut(&id).unwrap().expander.size = [rect.width, rect.height];
            let v = self.nodes[&id].expander.snapshot(self.time, &p);
            let shown = self.nodes[&id].expander.shown(self.time, &p);
            for child in children {
                if self.nodes[&child].props.is_expander_header {
                    self.arrange_node(child, Rect::new(17., v.header.y + 1., (rect.width - 78.).max(0.), (v.header.height - 2.).max(0.)), world, (theme, enabled, visible), measure);
                    continue;
                }
                let available = [
                    (rect.width - 2. - p.padding[0] - p.padding[2]).max(0.),
                    (v.clip.height - 1. - p.padding[1] - p.padding[3]).max(0.),
                ];
                let desired = self.nodes[&child].desired;
                let size = [
                    if p.horizontal_content_alignment == HorizontalAlignment::Stretch {
                        available[0]
                    } else {
                        desired[0].min(available[0])
                    },
                    if p.vertical_content_alignment == VerticalAlignment::Stretch {
                        available[1]
                    } else {
                        desired[1].min(available[1])
                    },
                ];
                let offset = [
                    match p.horizontal_content_alignment {
                        HorizontalAlignment::Center => (available[0] - size[0]) / 2.,
                        HorizontalAlignment::Right => available[0] - size[0],
                        _ => 0.,
                    },
                    match p.vertical_content_alignment {
                        VerticalAlignment::Center => (available[1] - size[1]) / 2.,
                        VerticalAlignment::Bottom => available[1] - size[1],
                        _ => 0.,
                    },
                ];
                self.arrange_node(
                    child,
                    Rect::new(
                        1. + p.padding[0] + offset[0],
                        v.clip.y
                            + if p.expand_direction == ExpandDirection::Up {
                                1.
                            } else {
                                0.
                            }
                            + p.padding[1]
                            + offset[1],
                        size[0],
                        size[1],
                    ),
                    world.multiply(Matrix([1., 0., 0., 1., 0., v.offset])),
                    (theme, enabled, visible && shown),
                    measure,
                );
            }
        } else if kind == NodeKind::Border
            || overlays::is_overlay(kind)
            || composed::is_control(kind)
        {
            for child in children {
                self.arrange_node(child, inner, world, (theme, enabled, visible), measure);
            }
        } else if kind == NodeKind::Viewbox {
            let v = &self.nodes[&id].viewbox;
            let content = v.content_size;
            let child_world = world.multiply(v.matrix());
            if let Some(child) = children.first() {
                self.arrange_node(
                    *child,
                    Rect::new(0., 0., content[0], content[1]),
                    child_world,
                    (theme, enabled, visible),
                    measure,
                );
            }
        } else if matches!(kind,NodeKind::Segmented|NodeKind::SegmentedItem) {
            self.arrange_segmented(id,inner,measure);
        } else if super::navigation_controls::is_control(kind) && kind != NodeKind::TreeView {
            self.arrange_navigation_control(id, inner, measure);
        } else if super::collections::is_view(kind) {
            self.arrange_collection(id, inner, measure);
        } else if super::collections::is_panel(kind) {
            self.arrange_items_panel(id, inner, measure);
        } else if matches!(kind,NodeKind::ScrollViewer|NodeKind::ScrollView|NodeKind::ScrollContentPresenter) {
            let viewport = self.nodes[&id]
                .scroll
                .host
                .as_ref()
                .map(|h| [h.viewport_width, h.viewport_height])
                .unwrap_or([inner.width, inner.height]);
            self.nodes.get_mut(&id).unwrap().scroll.viewport = viewport;
            if !self.nodes[&id].scroll.initialized {
                let n = self.nodes.get_mut(&id).unwrap();
                n.scroll.zoom.set(p.zoom_factor, self.time, false);
                n.scroll.initialized = true;
                n.scroll.x.set(p.horizontal_offset, self.time, false);
                n.scroll.y.set(p.vertical_offset, self.time, false);
            }
            {
                let n = self.nodes.get_mut(&id).unwrap();
                let max = n.scroll.max(self.time);
                if n.props.horizontal_offset > max[0] {
                    n.props.horizontal_offset = max[0];
                    n.scroll.x.set(max[0], self.time, false);
                }
                if n.props.vertical_offset > max[1] {
                    n.props.vertical_offset = max[1];
                    n.scroll.y.set(max[1], self.time, false);
                }
            }
            let extent = self.nodes[&id].scroll.extent;
            // A disabled axis arranges the content into the viewport. Its natural
            // desired extent must not widen a stretched content subtree (for
            // example ContentDialog's horizontally disabled ScrollViewer).
            let content_width = if p.horizontal_scroll_mode == ScrollMode::Disabled
                || p.horizontal_scroll_bar_visibility == ScrollBarVisibility::Disabled
            {
                inner.width / p.zoom_factor
            } else {
                extent[0].max(inner.width / p.zoom_factor)
            };
            let content_height = if p.vertical_scroll_mode == ScrollMode::Disabled
                || p.vertical_scroll_bar_visibility == ScrollBarVisibility::Disabled
            {
                inner.height / p.zoom_factor
            } else {
                extent[1].max(inner.height / p.zoom_factor)
            };
            let content_world = world.multiply(self.nodes[&id].scroll.matrix(self.time));
            for child in children {
                self.arrange_node(
                    child,
                    Rect::new(
                        inner.x,
                        inner.y,
                        content_width,
                        content_height,
                    ),
                    content_world,
                    (theme, enabled, visible),
                    measure,
                );
            }
        } else if kind == NodeKind::RadioButtons {
            let max_w = children
                .iter()
                .map(|c| self.nodes[c].desired[0])
                .fold(0., f64::max);
            let max_w = (max_w * self.dpr).ceil() / self.dpr;
            let max_h = children
                .iter()
                .map(|c| self.nodes[c].desired[1])
                .fold(0., f64::max);
            let cols = p
                .max_columns
                .min(children.len())
                .min(
                    ((inner.width + selection_input::group_spacing()[0])
                        / (max_w + selection_input::group_spacing()[0]))
                        .floor()
                        .max(1.) as usize,
                )
                .max(1);
            let base = children.len() / cols;
            let extra = children.len() % cols;
            let mut index = 0;
            for col in 0..cols {
                for row in 0..base + usize::from(col < extra) {
                    let child = children[index];
                    index += 1;
                    self.arrange_node(
                        child,
                        Rect::new(
                            inner.x + col as f64 * (max_w + selection_input::group_spacing()[0]),
                            inner.y
                                + self.input_header_height(id)
                                + row as f64 * (max_h + selection_input::group_spacing()[1]),
                            max_w,
                            max_h,
                        ),
                        world,
                        (theme, enabled, visible),
                        measure,
                    );
                }
            }
        } else if kind == NodeKind::StackPanel {
            let vertical = p.orientation == Orientation::Vertical;
            let mut pos = if vertical { inner.y } else { inner.x };
            for child in children {
                if !self.nodes[&child].props.visible {
                    continue;
                }
                let size = self.nodes[&child].desired;
                let slot = if vertical {
                    Rect::new(inner.x, pos, inner.width, size[1])
                } else {
                    Rect::new(pos, inner.y, size[0], inner.height)
                };
                self.arrange_node(child, slot, world, (theme, enabled, visible), measure);
                pos += if vertical { size[1] } else { size[0] } + p.spacing;
            }
        } else if matches!(
            kind,
            NodeKind::Popup
                | NodeKind::ToolTip
                | NodeKind::Flyout
                | NodeKind::Grid
                | NodeKind::Button
                | NodeKind::RepeatButton
                | NodeKind::HyperlinkButton
                | NodeKind::ToggleButton
                | NodeKind::CheckBox
                | NodeKind::RadioButton
                | NodeKind::CollectionItem
                | NodeKind::CollectionHeader
        ) {
            let column_spacing = p.column_spacing.unwrap_or(p.spacing);
            let row_spacing = p.row_spacing.unwrap_or(p.spacing);
            let widths = self.grid_tracks(&children, &p.columns, inner.width, column_spacing, true);
            let heights = self.grid_tracks(&children, &p.rows, inner.height, row_spacing, false);
            for child in children {
                let cp = &self.nodes[&child].props;
                let mut slot = Rect::new(
                    inner.x + offset(&widths, cp.column, column_spacing),
                    inner.y + offset(&heights, cp.row, row_spacing),
                    span(&widths, cp.column, cp.column_span, column_spacing),
                    span(&heights, cp.row, cp.row_span, row_spacing),
                );
                if p.flow_direction == FlowDirection::RightToLeft && kind == NodeKind::Grid {
                    slot.x = inner.x + inner.width - (slot.x - inner.x) - slot.width;
                }
                if kind == NodeKind::CollectionItem {
                    // ContentPresenter honors the item style's Center vertical
                    // alignment; a ListView stretches width, GridView centers it.
                    let desired = self.nodes[&child].desired;
                    let height = desired[1].min(slot.height);
                    slot.y += match p.vertical_content_alignment {
                        VerticalAlignment::Top => 0.,
                        VerticalAlignment::Bottom => slot.height - height,
                        _ => (slot.height - height) / 2.,
                    };
                    slot.height = height;
                    if p.horizontal_content_alignment != HorizontalAlignment::Stretch {
                        let width = desired[0].min(slot.width);
                        slot.x += match p.horizontal_content_alignment {
                            HorizontalAlignment::Left => 0.,
                            HorizontalAlignment::Right => slot.width - width,
                            _ => (slot.width - width) / 2.,
                        };
                        slot.width = width;
                    }
                }
                self.arrange_node(child, slot, world, (theme, enabled, visible), measure);
            }
        }
    }
    pub(super) fn refresh_visual_tree(
        &mut self,
        id: u32,
        parent_world: Matrix,
        theme: Theme,
        enabled: bool,
        visible: bool,
    ) {
        let n = self.nodes.get_mut(&id).unwrap();
        n.world = parent_world
            .multiply(Matrix([1., 0., 0., 1., n.rect.x, n.rect.y]))
            .multiply(
                n.presentation
                    .matrix(n.props.transform, n.props.center_point),
            )
            .multiply(n.effects.matrix(self.time,n.rect))
            .multiply(if n.kind == NodeKind::CollectionItem {
                n.collection.entry_matrix(n.rect, self.time)
            } else {
                Matrix::default()
            })
            .multiply(if overlays::is_overlay(n.kind) && (n.navigation_template.owner.is_none() || n.kind==NodeKind::ToolTip) {
                n.overlay
                    .visual
                    .matrix(n.kind, n.overlay.actual, n.rect.height, self.time)
            } else {
                Matrix::default()
            });
        n.theme = n.props.theme.unwrap_or(theme);
        n.enabled = enabled && n.props.enabled && n.view_control.command_enabled.unwrap_or(true);
        n.visible = visible
            && n.props.visible
            && (!overlays::is_overlay(n.kind) || (n.navigation_template.owner.is_some()&&n.kind!=NodeKind::ToolTip) || n.overlay.visual.shown(self.time));
        let (world, theme, enabled, visible, children) =
            (n.world, n.theme, n.enabled, n.visible, n.children.clone());
        let expander = (n.kind == NodeKind::Expander).then(|| (n.expander.shown(self.time, &n.props), n.expander.snapshot(self.time, &n.props).offset));
        let world = if n.kind == NodeKind::Viewbox {
            world.multiply(n.viewbox.matrix())
        } else if super::collections::is_scroll_owner(n.kind) {
            world.multiply(n.scroll.matrix(self.time))
        } else {
            world
        };
        for child in children {
            let parent_world = if overlays::is_overlay(self.nodes[&child].kind)&&(self.nodes[&child].navigation_template.owner.is_none()||self.nodes[&child].kind==NodeKind::ToolTip) {
                Matrix::default()
            } else if expander.is_some() && !self.nodes[&child].props.is_expander_header {
                world.multiply(Matrix([1., 0., 0., 1., 0., expander.unwrap().1]))
            } else {
                world
            };
            let child_visible=visible&&expander.is_none_or(|(shown,_)| shown||self.nodes[&child].props.is_expander_header)&&self.view_child_visible(id,child)&&self.content_child_visible(id,child);
            let child_enabled=enabled&&self.view_child_enabled(id,child)&&self.content_child_enabled(id,child);
            self.refresh_visual_tree(child, parent_world.multiply(self.semantic_child_matrix(id,child)).multiply(self.content_child_matrix(id,child)), theme, child_enabled, child_visible);
        }
    }
}
