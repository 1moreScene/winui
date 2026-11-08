//! Template parts, annotation scheduling and collection layout integration.
use super::*;
impl Scene {
    pub fn items_view_index_at(
        &self,
        id: u32,
        horizontal: f64,
        vertical: f64,
    ) -> Result<Option<usize>, String> {
        let n = self.get(id)?;
        if n.kind != NodeKind::ItemsView {
            return Err("Requires ItemsView".into());
        }
        if !horizontal.is_finite()
            || !vertical.is_finite()
            || !(0. ..=1.).contains(&horizontal)
            || !(0. ..=1.).contains(&vertical)
        {
            return Err("Viewport ratios must be in 0..1".into());
        }
        let [ox, oy] = n.scroll.offsets(self.time);
        let x = ox + horizontal * n.scroll.viewport[0];
        let y = oy + vertical * n.scroll.viewport[1];
        let distance = |r: Rect| {
            let dx = (x - x.clamp(r.x, r.x + r.width)).abs();
            let dy = (y - y.clamp(r.y, r.y + r.height)).abs();
            if n.collection.geometry.stack {
                dy * 10000. + dx
            } else {
                dy * dy + dx * dx
            }
        };
        Ok((0..n.props.collection_items.len()).min_by(|a, b| {
            distance(self.collection_item_rect(id, *a, n.scroll.viewport[0])).total_cmp(&distance(
                self.collection_item_rect(id, *b, n.scroll.viewport[0]),
            ))
        }))
    }
    pub(in crate::scene) fn sync_advanced_reading(&mut self) {
        let rich = self
            .nodes
            .values()
            .filter(|n| {
                matches!(
                    n.kind,
                    NodeKind::RichTextBlock | NodeKind::RichTextBlockOverflow
                )
            })
            .map(|n| n.id)
            .collect::<Vec<_>>();
        for id in &rich {
            self.nodes.get_mut(id).unwrap().reading.rich_source = None;
        }
        for id in rich
            .iter()
            .copied()
            .filter(|id| self.nodes[id].kind == NodeKind::RichTextBlock)
            .collect::<Vec<_>>()
        {
            let mut at = id;
            let mut seen = vec![id];
            while let Some(next) = props(&self.nodes[&at].props)
                .overflow_content_target
                .filter(|t| self.nodes.contains_key(t))
            {
                if seen.contains(&next) {
                    break;
                }
                seen.push(next);
                self.nodes.get_mut(&next).unwrap().reading.rich_source = Some(id);
                at = next;
            }
        }
        let bars = self
            .nodes
            .values()
            .filter(|n| n.kind == NodeKind::AnnotatedScrollBar)
            .map(|n| n.id)
            .collect::<Vec<_>>();
        for id in bars {
            let q = props(&self.nodes[&id].props);
            let template_signature =
                serde_json::to_string(&(&q.labels, q.has_label_template, q.has_detail_template))
                    .unwrap();
            let template_changed = self.nodes[&id].reading.template_signature != template_signature;
            if self.nodes[&id].reading.tooltip.is_none() {
                let anchor = self
                    .create(
                        id,
                        NodeKind::Grid,
                        json!({"width":1,"height":3,"isTabStop":false}),
                    )
                    .expect("annotation anchor budget");
                let tip=self.create(id,NodeKind::ToolTip,json!({"placementTarget":anchor,"placement":"Top","maxWidth":360,"minHeight":40,"padding":[8,6,8,6]})).expect("annotation tooltip budget");
                self.nodes.get_mut(&tip).unwrap().overlay.manual_tooltip=true;
                let body = self
                    .create(tip, NodeKind::Grid, json!({"isTabStop":false}))
                    .expect("annotation body budget");
                let text = self
                    .create(
                        body,
                        NodeKind::TextBlock,
                        json!({"wrap":true,"maxWidth":344,"visible":!q.has_detail_template}),
                    )
                    .expect("annotation detail text budget");
                let slot = self
                    .create(
                        body,
                        NodeKind::Grid,
                        json!({"isTabStop":false,"visible":q.has_detail_template}),
                    )
                    .expect("annotation detail slot budget");
                let n = self.nodes.get_mut(&id).unwrap();
                n.reading.detail_text = Some(text);
                n.reading.tooltip = Some(tip);
                n.reading.tooltip_anchor = Some(anchor);
                n.reading.detail_slot = Some(slot);
            }
            if let Some(slot) = self.nodes[&id].reading.detail_slot {
                if self.nodes[&slot].props.visible != q.has_detail_template {
                    self.nodes.get_mut(&slot).unwrap().props.visible = q.has_detail_template;
                    self.invalidate(id, true);
                }
            }
            if let Some(text) = self.nodes[&id].reading.detail_text {
                self.nodes.get_mut(&text).unwrap().props.visible = !q.has_detail_template;
            }
            let expected = if q.has_label_template {
                q.labels.len()
            } else {
                0
            };
            while self.nodes[&id].reading.label_slots.len() > expected {
                if let Some((child, _)) = self.nodes.get_mut(&id).unwrap().reading.label_slots.pop()
                {
                    let _ = self.destroy(child);
                }
            }
            while self.nodes[&id].reading.label_slots.len() < expected {
                let index = self.nodes[&id].reading.label_slots.len();
                match self.create(id, NodeKind::Grid, json!({"isTabStop":false})) {
                    Ok(child) => self
                        .nodes
                        .get_mut(&id)
                        .unwrap()
                        .reading
                        .label_slots
                        .push((child, index)),
                    Err(e) => {
                        self.nodes.get_mut(&id).unwrap().reading.template_error = Some(e);
                        break;
                    }
                }
            }
            if template_changed {
                self.nodes.get_mut(&id).unwrap().reading.template_signature = template_signature;
                self.emit(id, EventKind::RealizationChanged);
            }
        }
    }
    pub(in crate::scene) fn annotation_labels(&self, id: u32) -> Vec<Annotation> {
        let q = props(&self.nodes[&id].props);
        let mut labels = q.labels;
        if let Some(source) = q.label_item_source {
            for label in &mut labels {
                if let Some(index) = label.item_index {
                    if let Some(r) = self.repeater_item_bounds(source, index) {
                        label.scroll_offset = r.y;
                    }
                }
            }
        }
        labels
    }
    pub(in crate::scene) fn arrange_annotation(
        &mut self,
        id: u32,
        inner: Rect,
        m: &mut impl TextMeasurer,
    ) {
        let mut q = props(&self.nodes[&id].props);
        q.labels = self.annotation_labels(id);
        let button = metric("annotationButtonHeight");
        let rail = Rect::new(
            inner.x,
            inner.y + button,
            inner.width,
            (inner.height - button * 2.).max(0.),
        );
        let range = (q.maximum - q.minimum).max(0.);
        let factor =
            (rail.height - metric("ThumbHeight")).max(0.) / (range + q.viewport_size).max(1.);
        let mut label_props = self.nodes[&id].props.clone();
        label_props.margin = [0., -5., 0., -2.];
        if !q.label_style.is_null() {
            label_props = properties::patch(&label_props, &q.label_style, NodeKind::TextBlock)
                .unwrap_or(label_props);
        }
        let f = label_props.font();
        let world = self.nodes[&id].world;
        let flags = (
            self.nodes[&id].theme,
            self.nodes[&id].enabled,
            self.nodes[&id].visible,
        );
        let mut entries = vec![];
        for (i, label) in q.labels.iter().enumerate() {
            let slot = self.nodes[&id]
                .reading
                .label_slots
                .iter()
                .find(|(_, index)| *index == i)
                .map(|p| p.0);
            let size = if let Some(child) = slot {
                self.nodes.get_mut(&child).unwrap().props.visible = true;
                self.measure_node(child, [inner.width, f64::INFINITY], m)
            } else {
                let met = m.measure(&label.text, &f);
                [
                    met.width + label_props.margin[0] + label_props.margin[2],
                    ((met.ascent + met.descent + label_props.margin[1] + label_props.margin[3])
                        * self.dpr)
                        .round()
                        / self.dpr,
                ]
            };
            let top = (label.scroll_offset - q.minimum) * factor;
            entries.push((
                i,
                Rect::new(
                    rail.x + rail.width - size[0],
                    rail.y + top,
                    size[0],
                    size[1],
                ),
                slot,
                true,
            ));
        }
        let mut previous: Option<usize> = None;
        for i in (0..entries.len()).rev() {
            let r = entries[i].1;
            let out = r.y < rail.y || r.y + r.height > rail.y + rail.height;
            let collision = previous.is_some_and(|p| entries[p].1.y <= r.y + r.height);
            if out {
                entries[i].3 = false;
            } else if collision {
                if i == 0 && previous.is_some_and(|p| p + 1 < entries.len()) {
                    entries[previous.unwrap()].3 = false;
                    entries[i].3 = true;
                } else {
                    entries[i].3 = false;
                }
            } else {
                previous = Some(i);
            }
        }
        let labels = entries
            .iter()
            .filter(|p| p.3)
            .map(|p| {
                let r = p.1;
                let margin = if q.has_label_template {
                    [0.; 4]
                } else {
                    label_props.margin
                };
                (
                    q.labels[p.0].text.clone(),
                    Rect::new(
                        r.x + margin[0],
                        r.y + margin[1],
                        r.width - margin[0] - margin[2],
                        r.height - margin[1] - margin[3],
                    ),
                )
            })
            .collect();
        for (_, r, slot, visible) in entries {
            if let Some(child) = slot {
                self.nodes.get_mut(&child).unwrap().props.visible = visible;
                self.arrange_node(child, r, world, (flags.0, flags.1, flags.2 && visible), m);
            }
        }
        let thumb = Rect::new(
            rail.x + rail.width - metric("ThumbWidth"),
            rail.y + (q.value - q.minimum).clamp(0., range) * factor,
            metric("ThumbWidth"),
            metric("ThumbHeight"),
        );
        let n = self.nodes.get_mut(&id).unwrap();
        n.reading.rail = rail;
        n.reading.thumb = thumb;
        n.reading.labels = labels;
        if let Some(anchor) = n.reading.tooltip_anchor {
            let y = n.reading.hover_point.unwrap_or(rail.y);
            self.arrange_node(
                anchor,
                Rect::new(rail.x + rail.width - 1., y, 1., 3.),
                world,
                flags,
                m,
            );
        }
    }
    pub(in crate::scene) fn reading_tick(&mut self) {
        let ids = self
            .nodes
            .values()
            .filter(|n| {
                n.kind == NodeKind::AnnotatedScrollBar
                    && n.reading.next_wake.is_some_and(|t| t <= self.time)
            })
            .map(|n| n.id)
            .collect::<Vec<_>>();
        for id in ids {
            let q = props(&self.nodes[&id].props);
            let d = self.nodes[&id].reading.repeat_direction;
            if d != 0. && self.effective_enabled(id) && self.nodes[&id].reading.drag.is_some() {
                let step = if q.small_change > 0. {
                    q.small_change
                } else {
                    q.viewport_size / 8.
                };
                let value = self.nodes[&id]
                    .reading
                    .pending
                    .map(|p| p.1)
                    .unwrap_or(q.value)
                    + d * step;
                self.request_annotation(
                    id,
                    value,
                    if d < 0. {
                        AnnotatedScrollBarScrollingEventKind::IncrementButton
                    } else {
                        AnnotatedScrollBarScrollingEventKind::DecrementButton
                    },
                );
                self.nodes.get_mut(&id).unwrap().reading.next_wake = Some(
                    self.time
                        + basic_next::contract()["repeatDefaults"]["interval"]
                            .as_f64()
                            .unwrap_or(33.),
                );
                self.invalidate(id, true);
            } else {
                self.nodes.get_mut(&id).unwrap().reading.next_wake = None;
            }
        }
    }
    pub(in crate::scene) fn advanced_input(&mut self, input: &Input) -> Result<bool, String> {
        if let Input::KeyDown { key, .. } = input {
            let mut at = self.focused;
            while let Some(id) = at {
                let n = &self.nodes[&id];
                if n.kind == NodeKind::PagerControl
                    && matches!(key.as_str(), "ArrowLeft" | "ArrowRight")
                {
                    let parts = n
                        .reading
                        .parts
                        .iter()
                        .filter(|(id, _, _)| {
                            self.effective_enabled(*id) && self.nodes[id].props.is_tab_stop
                        })
                        .map(|p| p.0)
                        .collect::<Vec<_>>();
                    if let Some(index) = parts.iter().position(|p| Some(*p) == self.focused) {
                        let next = if key == "ArrowLeft" {
                            index.saturating_sub(1)
                        } else {
                            (index + 1).min(parts.len() - 1)
                        };
                        self.focus(Some(parts[next]));
                    }
                    return Ok(true);
                }
                at = n.parent;
            }
        }
        if let Input::ReadingDetail {
            id,
            request,
            content,
        } = input
        {
            let n = self.get(*id)?;
            if n.kind != NodeKind::AnnotatedScrollBar {
                return Err("Detail response requires AnnotatedScrollBar".into());
            }
            if n.reading.detail_request == Some(*request) {
                if let Some(tip) = n.reading.tooltip {
                    if let Some(text) = self.nodes[id].reading.detail_text {
                        self.nodes.get_mut(&text).unwrap().props.text = content.clone();
                    }
                    self.nodes.get_mut(&tip).unwrap().props.is_open =
                        !content.is_empty() || props(&self.nodes[id].props).has_detail_template;
                    self.invalidate(tip, true);
                }
            }
            return Ok(true);
        }
        if let Input::Move { x, y, .. } = input {
            let hit = self.hit(*x, *y);
            let ids = self
                .nodes
                .values()
                .filter(|n| n.kind == NodeKind::AnnotatedScrollBar)
                .map(|n| n.id)
                .collect::<Vec<_>>();
            for id in ids {
                let n = &self.nodes[&id];
                let (_, local) = n.world.inverse().unwrap_or_default().point(*x, *y);
                let rail = n.reading.rail;
                let q = props(&n.props);
                if hit == Some(id) && local >= rail.y && local <= rail.y + rail.height {
                    let factor = (rail.height - metric("ThumbHeight")).max(1.)
                        / (q.maximum - q.minimum + q.viewport_size).max(1.);
                    let offset = (q.minimum + (local - rail.y) / factor)
                        .clamp(q.minimum, q.maximum + q.viewport_size);
                    let changed = n.reading.hover.is_none_or(|v| (v - offset).abs() > 0.5);
                    if changed {
                        let n = self.nodes.get_mut(&id).unwrap();
                        n.reading.next_request = n.reading.next_request.wrapping_add(1);
                        let request = n.reading.next_request;
                        n.reading.detail_request = Some(request);
                        n.reading.hover = Some(offset);
                        n.reading.hover_point = Some(local);
                        self.emit(id, EventKind::DetailLabelRequested);
                        self.events.last_mut().unwrap().request_id = Some(request);
                        let mut labels = self.annotation_labels(id);
                        let source = q.label_item_source;
                        if let Some(source) = source {
                            let rects = self
                                .nodes
                                .get(&source)
                                .map(|n| n.props.collection_items.len())
                                .unwrap_or(0);
                            let row_end = (0..rects)
                                .filter(|i| {
                                    self.repeater_item_bounds(source, *i)
                                        .is_some_and(|r| r.y <= offset)
                                })
                                .last();
                            if let Some(row_end) = row_end {
                                labels.retain(|l| l.item_index.is_none_or(|i| i <= row_end));
                            }
                        }
                        let label = labels
                            .iter()
                            .filter(|l| l.scroll_offset <= offset)
                            .last()
                            .map(|l| l.text.clone())
                            .unwrap_or_default();
                        self.events.last_mut().unwrap().payload =
                            Some(json!({"scrollOffset":offset,"label":label}));
                        self.invalidate(id, true);
                    }
                } else if self.nodes[&id].reading.drag.is_none() {
                    if let Some(tip) = self.nodes[&id].reading.tooltip {
                        self.nodes.get_mut(&tip).unwrap().props.is_open = false;
                    }
                    self.nodes.get_mut(&id).unwrap().reading.hover = None;
                }
            }
        }
        if matches!(
            input,
            Input::Leave | Input::Blur | Input::Cancel { .. } | Input::Up { .. }
        ) {
            for n in self
                .nodes
                .values_mut()
                .filter(|n| n.kind == NodeKind::AnnotatedScrollBar)
            {
                n.reading.next_wake = None;
                n.reading.repeat_direction = 0.;
                if matches!(input, Input::Leave | Input::Blur | Input::Cancel { .. }) {
                    n.reading.drag = None;
                }
            }
        }
        if matches!(input, Input::Leave | Input::Blur | Input::Cancel { .. }) {
            let tips = self
                .nodes
                .values()
                .filter(|n| n.kind == NodeKind::AnnotatedScrollBar)
                .filter_map(|n| n.reading.tooltip)
                .collect::<Vec<_>>();
            for tip in tips {
                self.nodes.get_mut(&tip).unwrap().props.is_open = false;
                self.invalidate(tip, true);
            }
        }
        Ok(false)
    }
    pub(in crate::scene) fn items_view_layout(
        &mut self,
        id: u32,
        a: [f64; 2],
        sample: [f64; 2],
    ) -> Option<[f64; 2]> {
        let n = &self.nodes[&id];
        if n.kind != NodeKind::ItemsView {
            return None;
        }
        let q = props(&n.props);
        let layout = q.layout?;
        if matches!(layout, repeater::RepeaterLayout::StackLayout(_)) {
            return None;
        }
        fn minimum_width(scene: &Scene, id: u32) -> f64 {
            let n = &scene.nodes[&id];
            n.props.min_width.max(
                n.children
                    .iter()
                    .map(|c| minimum_width(scene, *c))
                    .fold(0., f64::max),
            )
        }
        let minimum = n
            .collection
            .realized
            .values()
            .next()
            .map(|c| minimum_width(self, *c))
            .unwrap_or(0.);
        let h = if let repeater::RepeaterLayout::LinedFlowLayout(l) = &layout {
            l.line_height.unwrap_or(sample[1])
        } else {
            sample[1]
        }
        .max(1.);
        let mut sizes = HashMap::new();
        for (i, item) in n.props.collection_items.iter().enumerate() {
            let ratio = q
                .item_aspect_ratios
                .get(i)
                .copied()
                .unwrap_or(sample[0] / sample[1].max(1.));
            sizes.insert(item.id.clone(), [(h * ratio).max(minimum), h]);
        }
        let (slots, extent) = repeater::slots(&layout, &n.props.collection_items, &sizes, a);
        self.nodes.get_mut(&id).unwrap().reading.item_slots = slots;
        Some(extent)
    }
    pub(in crate::scene) fn paint_items_view(
        &self,
        id: u32,
        out: &mut Vec<Draw>,
    ) -> Option<String> {
        let n = &self.nodes[&id];
        let owner = n.props.collection_owner?;
        let root = &self.nodes[&owner];
        if root.kind != NodeKind::ItemsView {
            return None;
        }
        let selected = root.collection.selected.contains(&n.props.collection_key);
        let hovered = self.pointer.is_some_and(|p| self.inside(id, p.0, p.1));
        let pressed = root.collection.pressed.as_ref() == Some(&n.props.collection_key);
        let state = if pressed {
            "Pressed"
        } else if hovered {
            "PointerOver"
        } else {
            ""
        };
        let key = format!(
            "ItemContainer{}{}Background",
            if selected { "Selected" } else { "" },
            state
        );
        let bg = contract()["itemContainerPalettes"][n.theme.as_str()][&key]["color"]
            .as_str()
            .unwrap_or("#00000000");
        let r = Rect::new(0., 0., n.rect.width, n.rect.height);
        out.push(Draw::Fill {
            rect: r,
            color: bg.into(),
            radius: 4.,
        });
        Some(color(n.theme, "TextFillColorPrimaryBrush"))
    }
    pub(in crate::scene) fn paint_items_view_border(&self, id: u32, out: &mut Vec<Draw>) -> bool {
        let n = &self.nodes[&id];
        let Some(owner) = n.props.collection_owner else {
            return false;
        };
        let root = &self.nodes[&owner];
        if root.kind != NodeKind::ItemsView {
            return false;
        }
        let selected = root.collection.selected.contains(&n.props.collection_key);
        if selected {
            out.push(Draw::Border {
                rect: Rect::new(0., 0., n.rect.width, n.rect.height),
                thickness: [2.; 4],
                radius: [4.; 4],
                color: color(n.theme, "AccentFillColorDefaultBrush"),
                background: None,
            });
            out.push(Draw::Border {
                rect: Rect::new(
                    2.,
                    2.,
                    (n.rect.width - 4.).max(0.),
                    (n.rect.height - 4.).max(0.),
                ),
                thickness: [1.; 4],
                radius: [2.; 4],
                color: if n.theme == Theme::Dark {
                    "#202020"
                } else {
                    "#ffffff"
                }
                .into(),
                background: None,
            });
        }
        if root.props.selection_mode == ListViewSelectionMode::Multiple {
            let r = Rect::new((n.rect.width - 24.).max(0.), 4., 20., 20.);
            out.push(Draw::Border {
                rect: r,
                thickness: [1.; 4],
                radius: [3.; 4],
                color: if selected {
                    color(n.theme, "AccentFillColorDefaultBrush")
                } else {
                    contract()["itemContainerPalettes"][n.theme.as_str()]
                        ["CheckBoxCheckBackgroundStrokeUnchecked"]["color"]
                        .as_str()
                        .unwrap_or("#99000000")
                        .into()
                },
                background: Some(if selected {
                    color(n.theme, "AccentFillColorDefaultBrush")
                } else {
                    contract()["itemContainerPalettes"][n.theme.as_str()]
                        ["ItemContainerCheckboxBackgroundUnchecked"]["color"]
                        .as_str()
                        .unwrap_or("#ffffffdd")
                        .into()
                }),
            });
            if selected {
                out.push(Draw::Text {
                    style: FontStyle::Normal,
                    x: r.x + 2.,
                    y: r.y + 16.,
                    text: "\u{e001}".into(),
                    color: "#ffffff".into(),
                    size: 16.,
                    font: "Segoe Fluent Icons".into(),
                    max_width: 18.,
                    weight: 400,
                });
            }
        }
        true
    }
}
