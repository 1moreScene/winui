use super::*;

impl Scene {
    pub(in crate::scene) fn paint_table_rows_retained(
        &mut self,
        id: u32,
        children: &[u32],
        foreground: &str,
        out: &mut Vec<crate::render::Draw>,
    ) -> bool {
        let n = &self.nodes[&id];
        if n.table.role != "tableBodyRows" {
            return false;
        }
        let Some(owner) = n.table.owner else {
            return false;
        };
        let q = props(&self.nodes[&owner].props);
        // Custom details/headers can intentionally overflow row bounds; retain
        // their existing ordering and clipping rather than assuming row isolation.
        if q.has_row_details_template || q.has_row_header_template {
            return false;
        }
        let rows = self.nodes[&owner].table.rows.clone();
        let slots = self.nodes[&owner].table.slots.clone();
        let mut row_for_child = HashMap::new();
        for (key, node) in &rows {
            row_for_child.insert(*node, key.as_str());
        }
        for slot in &slots {
            row_for_child.insert(slot.id, slot.row.as_str());
        }
        if children
            .iter()
            .any(|child| !row_for_child.contains_key(child) && !self.nodes[&owner].table.group_nodes.values().any(|node|node==child))
        {
            return false;
        }
        let mut raster = self.nodes[&id].world.0;
        let shift = self.table_text_scroll_offset(id);
        raster[4] += shift[0];
        raster[5] += shift[1];
        let sticky_clip=self.table_sticky_row_clip(id);
        if let Some(rect)=sticky_clip {out.push(crate::render::Draw::Clip{rect});}
        for (key, row) in &rows {
            let bounds = self.nodes[row].rect;
            let row_children = children
                .iter()
                .filter(|child| row_for_child.get(child) == Some(&key.as_str()))
                .copied()
                .collect::<Vec<_>>();
            // Only known static table parts can reuse a display list. Dynamic
            // controls/editors and active visual tracks still sample every frame.
            let mut stable = self.animations.is_empty();
            let mut states = Vec::new();
            let mut pending = row_children.clone();
            while let Some(child) = pending.pop() {
                let n = &self.nodes[&child];
                stable &= matches!(
                    n.kind,
                    NodeKind::Grid
                        | NodeKind::TextBlock
                        | NodeKind::CheckBox
                        | NodeKind::ToggleSwitch
                        | NodeKind::HyperlinkButton
                ) && !n.button.animating(self.time)
                    && !n.accept.active(self.time)
                    && !n.selection_visual.active(self.time)
                    && !n.effects.active(self.time)
                    && !n.material_motion.active(self.time)
                    && !n.material_colors.active(self.time)
                    && !n.table.row_indicator_opacity.active(self.time)
                    && !n.table.row_indicator_scale.active(self.time);
                states.push((
                    child,
                    n.paint_version,
                    n.button.state(n.enabled),
                    n.visible,
                    n.props.is_checked,
                    n.props.is_on,
                ));
                pending.extend(n.children.iter().copied());
            }
            let mut row_layout=self.nodes[&owner].table.layout_key.clone();
            if let Some(key)=&mut row_layout {key.group_scroll_y=0.;}
            let draw_key = RowDrawKey {
                layout: row_layout,
                raster,
                dpr: self.dpr,
                theme: self.nodes[row].theme,
                foreground: foreground.into(),
                hovered_slot: self.nodes[&owner]
                    .table
                    .pointer_slot
                    .as_ref()
                    .filter(|slot| &slot.row == key)
                    .map(|slot| slot.id),
                captured: self.captured,
                focused: self.focused,
                policy: [self.reduced_motion, self.reduced_transparency],
                states,
            };
            let cached = stable
                .then(|| self.nodes[row].table.row_draw_cache.as_ref())
                .flatten()
                .filter(|cache| cache.key == draw_key)
                .map(|cache| cache.commands.clone());
            let commands = if let Some(commands) = cached {
                commands
            } else {
                let mut commands = Vec::new();
                for child in row_children {
                    self.paint_node(child, Some(foreground.into()), &mut commands);
                }
                let commands = Arc::new(commands);
                self.nodes.get_mut(row).unwrap().table.row_draw_cache =
                    stable.then(|| RowDrawCache {
                        key: draw_key,
                        commands: commands.clone(),
                    });
                commands
            };
            out.push(crate::render::Draw::RetainedGroup {
                bounds,
                raster,
                commands,
            });
        }
        if sticky_clip.is_some(){out.push(crate::render::Draw::Restore);}
        for child in children.iter().filter(|child| !row_for_child.contains_key(child)) {
            self.paint_node(*child,Some(foreground.into()),out);
        }
        true
    }
    pub(in crate::scene) fn table_text_scroll_offset(&self, id: u32) -> [f64; 2] {
        let Some(owner) = self.table_owner(id) else {
            return [0.; 2];
        };
        let table = &self.nodes[&owner];
        let frozen_count = table
            .props
            .table
            .as_deref()
            .map(|q| q.frozen_column_count)
            .unwrap_or(0);
        let mut shift = [0.; 2];
        let mut frozen = false;
        let mut at = Some(id);
        while let Some(id) = at {
            let n = &self.nodes[&id];
            if n.table.role == "rowHeader" {
                frozen = true;
            }
            if let Some(cell) = &n.table.cell {
                frozen = table
                    .table
                    .cols
                    .iter()
                    .position(|c| c.key == cell.column)
                    .is_some_and(|i| i < frozen_count);
            }
            if collections::is_scroll_owner(n.kind) {
                let mut offset = n.scroll.offsets(self.time);
                // Frozen cells already compensate the body's horizontal
                // translation in layout; their glyph texture stays stationary.
                if Some(id) == table.table.body && frozen {
                    offset[0] = 0.;
                }
                let m = n.world.0;
                shift[0] += m[0] * offset[0] + m[2] * offset[1];
                shift[1] += m[1] * offset[0] + m[3] * offset[1];
            }
            if id == owner {
                break;
            }
            at = n.parent;
        }
        shift
    }
    pub(in crate::scene) fn refresh_table_pointer(&mut self) {
        if !self.nodes.values().any(|n| n.kind == NodeKind::TableView) {
            return;
        }
        // Hit testing traverses the visual tree and resolves popup occlusion.
        // Sample once per paint, rather than once for every cell and row layer.
        let slot = self
            .pointer
            .and_then(|(x, y)| self.hit(x, y))
            .and_then(|target| {
                let owner = self.table_owner(target)?;
                self.table_slot(owner, target).map(|slot| (owner, slot))
            });
        for n in self
            .nodes
            .values_mut()
            .filter(|n| n.kind == NodeKind::TableView)
        {
            n.table.pointer_slot = slot
                .as_ref()
                .filter(|(owner, _)| *owner == n.id)
                .map(|(_, slot)| slot.clone());
        }
    }
    pub(in crate::scene) fn paint_table_selection_background(
        &self,
        id: u32,
        out: &mut Vec<crate::render::Draw>,
    ) {
        let n = &self.nodes[&id];
        let Some(owner) = n.table.owner else { return };
        let Some(q) = self.nodes[&owner].props.table.as_deref() else {
            return;
        };
        if matches!(n.table.role.as_str(), "filterMenuItem" | "detailsToggle") {
            let state = n.button.state(n.enabled);
            if matches!(state, ControlState::PointerOver | ControlState::Pressed) {
                out.push(crate::render::Draw::Fill {
                    rect: Rect::new(0., 0., n.rect.width, n.rect.height),
                    color: Self::color(
                        &BrushValue::Resource {
                            resource: if state == ControlState::Pressed {
                                "SubtleFillColorTertiaryBrush"
                            } else {
                                "SubtleFillColorSecondaryBrush"
                            }
                            .into(),
                        },
                        n.theme,
                    ),
                    radius: 4.,
                });
            }
            return;
        }

        if n.table.role == "rowBackground" || n.table.role == "rowHeader" {
            let row = &n.table.row_key;
            let hovered = self.nodes[&owner]
                .table
                .pointer_slot
                .as_ref()
                .is_some_and(|slot| slot.row == *row);
            let selected = q.selected_keys.contains(row);
            let pressed = self.nodes[&owner]
                .table
                .select_drag
                .as_ref()
                .is_some_and(|(_, cell, _, _, _)| cell.row == *row)
                || self.nodes[&owner]
                    .table
                    .row_drag
                    .as_ref()
                    .is_some_and(|(_, key, _)| key == row);
            if n.table.role == "rowBackground" {
                if let Some(background) = &n.table.row_background {
                    out.push(crate::render::Draw::Fill {
                        rect: Rect::new(0., 0., n.rect.width, n.rect.height),
                        color: Self::color(background, n.theme),
                        radius: 0.,
                    });
                }
            }
            if n.table.role == "rowBackground" && (selected || hovered || pressed) {
                let key = if selected && pressed {
                    "TableViewRowBackgroundSelectedPressed"
                } else if pressed {
                    "TableViewRowBackgroundPressed"
                } else if selected && hovered {
                    "TableViewRowBackgroundSelectedPointerOver"
                } else if selected {
                    "TableViewRowBackgroundSelected"
                } else {
                    "TableViewRowBackgroundPointerOver"
                };
                out.push(crate::render::Draw::Fill {
                    rect: Rect::new(
                        if n.table.role == "rowBackground" {
                            2.
                        } else {
                            0.
                        },
                        0.,
                        (n.rect.width
                            - if n.table.role == "rowBackground" {
                                4.
                            } else {
                                0.
                            })
                        .max(0.),
                        n.rect.height,
                    ),
                    color: Self::color(&theme_resource(key, n.theme), n.theme),
                    radius: if n.table.role == "rowBackground" {
                        4.
                    } else {
                        0.
                    },
                });
            }
            if n.table.role == "rowHeader" {
                if let Some((_, row_id)) = self.nodes[&owner]
                    .table
                    .rows
                    .iter()
                    .find(|(key, _)| key == row)
                {
                    let visual = &self.nodes[row_id].table;
                    let opacity = visual.row_indicator_opacity.value(self.time);
                    let height = 16. * visual.row_indicator_scale.value(self.time);
                    if opacity > 0. && height > 0. {
                        out.push(crate::render::Draw::Layer { opacity });
                        out.push(crate::render::Draw::Fill {
                            rect: Rect::new(0., (n.rect.height - height) / 2., 3., height),
                            color: Self::color(
                                &theme_resource(
                                    if pressed {
                                        "TableViewRowSelectionIndicatorPressedBrush"
                                    } else if hovered {
                                        "TableViewRowSelectionIndicatorPointerOverBrush"
                                    } else {
                                        "TableViewRowSelectionIndicatorBrush"
                                    },
                                    n.theme,
                                ),
                                n.theme,
                            ),
                            radius: 1.5,
                        });
                        out.push(crate::render::Draw::EndLayer);
                    }
                }
            }
            return;
        }
        let Some(cell) = &n.table.cell else { return };
        // SelectionBorder and RootBorder are separate source layers.
        let selected = q.selected_cells.contains(cell);
        let hovered = self.nodes[&owner]
            .table
            .pointer_slot
            .as_ref()
            .is_some_and(|slot| slot.id == id);
        for (visible, key) in [
            (selected, "TableViewCellBackgroundSelected"),
            (hovered, "TableViewCellBackgroundPointerOver"),
        ] {
            if visible {
                out.push(crate::render::Draw::Fill {
                    rect: Rect::new(0., 0., n.rect.width, n.rect.height),
                    color: Self::color(&theme_resource(key, n.theme), n.theme),
                    radius: 4.,
                });
            }
        }
    }

    pub(in crate::scene) fn is_table_hit_target(&self, id: u32) -> bool {
        let t = &self.nodes[&id].table;
        t.owner.is_some() && (t.cell.is_some() || t.role == "rowHeader")
    }

    pub(in crate::scene) fn paint_table_separators(
        &self,
        id: u32,
        out: &mut Vec<crate::render::Draw>,
    ) {
        let n = &self.nodes[&id];
        if n.kind == NodeKind::TableView {
            let thickness = n
                .props
                .border_thickness
                .map(|v| (v * self.dpr).round() / self.dpr);
            if thickness.iter().any(|v| *v > 0.) && n.props.border_brush.is_some() {
                out.push(crate::render::Draw::Border {
                    rect: Rect::new(0., 0., n.rect.width, n.rect.height),
                    thickness,
                    radius: [n.props.corner_radius; 4],
                    color: Self::color(
                        &match n.props.border_brush.as_ref().unwrap() {
                            BrushValue::Resource { resource }
                                if resource == "TableViewBorderBrush" =>
                            {
                                theme_resource("TableViewBorderBrush", n.theme)
                            }
                            brush => brush.clone(),
                        },
                        n.theme,
                    ),
                    background: None,
                });
            }
            if props(&n.props).show_drag_rectangle {
                if let Some((_, _, _, a, b)) = &n.table.select_drag {
                    if (a[0] - b[0]).abs() + (a[1] - b[1]).abs() > 5. {
                        let inv = n.world.inverse().unwrap_or_default();
                        let mut a = inv.point(a[0], a[1]);
                        let b = inv.point(b[0], b[1]);
                        if let Some(body) = n.table.body {
                            let scroll = self.nodes[&body]
                                .scroll
                                .snapshot(&self.nodes[&body].props, self.time);
                            a.0 -= scroll.horizontal_offset - n.table.select_scroll_origin[0];
                            a.1 -= scroll.vertical_offset - n.table.select_scroll_origin[1];
                        }
                        let rect = Rect::new(
                            a.0.min(b.0),
                            a.1.min(b.1),
                            (a.0 - b.0).abs(),
                            (a.1 - b.1).abs(),
                        );
                        out.push(crate::render::Draw::Fill {
                            rect,
                            color: Self::color(
                                &theme_resource("TableViewDragRectangleFill", n.theme),
                                n.theme,
                            ),
                            radius: 0.,
                        });
                        out.push(crate::render::Draw::Stroke {
                            rect,
                            color: Self::color(
                                &theme_resource("TableViewDragRectangleStroke", n.theme),
                                n.theme,
                            ),
                            width: 1.,
                            radius: 0.,
                        });
                    }
                }
            }
            if let Some((edge, commands)) = &n.table.drag_ghost {
                if let Some((_, from, _, _, false)) = n.table.drag {
                    let width = n.table.widths[from];
                    let height = props(&n.props).header_row_height;
                    let x = edge - width / 2.;
                    let y = n.table.layout_bounds.unwrap_or_default().y;
                    out.push(crate::render::Draw::Save);
                    out.push(crate::render::Draw::Transform {
                        matrix: [1., 0., 0., 1., x, y],
                    });
                    out.extend(super::super::overlay_visual::shadow_at_depth(
                        32., n.theme, width, height, 0.,
                    ));
                    out.push(crate::render::Draw::Fill {
                        rect: Rect::new(0., 0., width, height),
                        radius: 0.,
                        color: Self::color(
                            &BrushValue::Resource {
                                resource: "CardBackgroundFillColorDefaultBrush".into(),
                            },
                            n.theme,
                        ),
                    });
                    out.extend(commands.iter().cloned());
                    out.push(crate::render::Draw::Stroke {
                        rect: Rect::new(0., 0., width, height),
                        radius: 0.,
                        width: 1.,
                        color: Self::color(
                            &BrushValue::Resource {
                                resource: "CardStrokeColorDefaultBrush".into(),
                            },
                            n.theme,
                        ),
                    });
                    for (glyph, y) in [("\u{eb0f}", 10.), ("\u{eb11}", height + 2.)] {
                        out.push(crate::render::Draw::Text {
                            style: FontStyle::Normal,
                            x: width / 2. - 6.,
                            y,
                            text: glyph.into(),
                            color: Self::color(
                                &BrushValue::Resource {
                                    resource: "TextFillColorTertiaryBrush".into(),
                                },
                                n.theme,
                            ),
                            size: 12.,
                            font: "Segoe Fluent Icons".into(),
                            max_width: 12.,
                            weight: 400,
                        });
                    }
                    out.push(crate::render::Draw::Restore);
                }
            }
            return;
        }
        let Some(owner) = n.table.owner else { return };
        let Some(q) = self.nodes[&owner].props.table.as_deref() else {
            return;
        };
        if n.table.role.starts_with("group"){return;}
        let r = Rect::new(0., 0., n.rect.width, n.rect.height);
        if n.table.role == "filterMenuItem" {
            if !n.props.source.is_empty() {
                out.push(crate::render::Draw::Text {
                    style: FontStyle::Normal,
                    x: 15.2,
                    y: 22.4,
                    text: n.props.source.clone(),
                    color: Self::color(
                        &BrushValue::Resource {
                            resource: if n.enabled {
                                "TextFillColorPrimaryBrush"
                            } else {
                                "TextFillColorDisabledBrush"
                            }
                            .into(),
                        },
                        n.theme,
                    ),
                    size: 16.,
                    font: "Segoe Fluent Icons".into(),
                    max_width: 16.,
                    weight: 400,
                });
            }
            return;
        }
        if n.table.role == "headerOption" || n.table.role == "detailsToggle" {
            return;
        }
        if n.table.role == "headerMain" {
            if let Some((_, key, _)) = self.nodes[&owner]
                .table
                .header_buttons
                .iter()
                .find(|(node, _, filter)| *node == id && !*filter)
            {
                if let Some(direction) = q.sorts.iter().find(|sort| sort.column == *key).map(|s|s.direction).or_else(||q.groups.iter().find(|g|g.column==*key).map(|g|g.direction)) {
                    out.push(crate::render::Draw::Text {
                        style: FontStyle::Normal,
                        x: (r.width - 14.).max(0.),
                        y: 12.,
                        text: if direction == TableViewSortDirection::Ascending {
                            "\u{f0ad}"
                        } else {
                            "\u{f0ae}"
                        }
                        .into(),
                        color: Self::color(
                            &BrushValue::Resource {
                                resource: "TextFillColorPrimaryBrush".into(),
                            },
                            n.theme,
                        ),
                        size: 10.,
                        font: "Segoe Fluent Icons".into(),
                        max_width: 12.,
                        weight: 400,
                    });
                }
            }
        }

        let lines = if n.table.role.starts_with("header") {
            q.header_grid_lines_visibility
        } else {
            q.grid_lines_visibility
        };
        if matches!(n.table.role.as_str(), "headerRow" | "rowBackground")
            && matches!(
                lines,
                TableViewGridLinesVisibility::Horizontal | TableViewGridLinesVisibility::All
            )
        {
            let h = (q.horizontal_grid_lines_stroke_thickness * self.dpr).round() / self.dpr;
            out.push(crate::render::Draw::Fill {
                rect: Rect::new(0., (r.height - h).max(0.), r.width, h),
                color: q
                    .horizontal_grid_lines_stroke
                    .as_ref()
                    .map(|b| Self::color(b, n.theme))
                    .unwrap_or_else(|| {
                        Self::color(
                            &theme_resource("TableViewHorizontalGridLineStroke", n.theme),
                            n.theme,
                        )
                    }),
                radius: 0.,
            });
        }
        if !matches!(n.table.role.as_str(), "headerRow" | "rowBackground")
            && matches!(
                lines,
                TableViewGridLinesVisibility::Vertical | TableViewGridLinesVisibility::All
            )
        {
            let w = (q.vertical_grid_lines_stroke_thickness * self.dpr).round() / self.dpr;
            out.push(crate::render::Draw::Fill {
                rect: Rect::new((r.width - w).max(0.), 0., w, r.height),
                color: q
                    .vertical_grid_lines_stroke
                    .as_ref()
                    .map(|b| Self::color(b, n.theme))
                    .unwrap_or_else(|| {
                        Self::color(
                            &theme_resource("TableViewVerticalGridLineStroke", n.theme),
                            n.theme,
                        )
                    }),
                radius: 0.,
            });
        }
    }

    fn table_emit(&mut self, id: u32, kind: EventKind, mut data: Value) {
        if matches!(
            kind,
            EventKind::SelectionChanged
                | EventKind::CellSelectionChanged
                | EventKind::CurrentCellChanged
        ) {
            if let Some(q) = self.nodes[&id].props.table.as_deref() {
                data["selectedKeys"] = json!(q.selected_keys);
                data["selectedCells"] = json!(q.selected_cells);
                data["currentCell"] = json!(q.current_cell);
            }
        }
        self.emit(id, kind);
        self.events.last_mut().unwrap().payload = Some(json!({"table":data}));
    }
    pub(super) fn table_request(&mut self, id: u32, kind: EventKind, action: &str, data: Value) {
        if self.nodes[&id].table.pending.is_some() {
            self.nodes
                .get_mut(&id)
                .unwrap()
                .table
                .queued
                .push_back((kind, action.into(), data));
            return;
        }
        let s = &mut self.nodes.get_mut(&id).unwrap().table;
        s.next_request = s.next_request.wrapping_add(1).max(1);
        let request = s.next_request;
        s.pending = Some(Pending {
            request,
            action: action.into(),
            data: data.clone(),
        });
        self.table_emit(id, kind, data);
        self.events.last_mut().unwrap().request_id = Some(request);
    }
    pub(super) fn table_changed(&mut self, id: u32, items: bool) {
        let q = props(&self.nodes[&id].props);
        self.table_emit(id,EventKind::TableViewChanged,json!({"sorts":q.sorts,"filters":q.filters,"selectedKeys":q.selected_keys,"selectedCells":q.selected_cells,"currentCell":q.current_cell,"columns":q.columns,"pageIndex":q.page_index,"groups":q.groups,"expandedRows":q.expanded_rows,"items":if items{Some(q.items.iter().map(|r|r.values.clone()).collect::<Vec<_>>())}else{None},"itemKeys":if items{Some(q.items.iter().map(|r|r.id.clone()).collect::<Vec<_>>())}else{None}}));
        self.invalidate(id, true);
    }
    pub(super) fn table_part(&mut self, parent: u32, kind: NodeKind, patch: Value) -> u32 {
        self.create(parent, kind, patch)
            .expect("validated TableView template part")
    }
    fn ensure_table(&mut self, id: u32) {
        if self.nodes[&id].table.body.is_some() {
            return;
        }
        let body=self.table_part(id,NodeKind::ScrollViewer,json!({"horizontalScrollMode":"Enabled","verticalScrollMode":"Enabled","horizontalScrollBarVisibility":"Auto","verticalScrollBarVisibility":"Auto","isTabStop":false,"clip":true,"horizontalContentAlignment":"Left","verticalContentAlignment":"Top","accessibleName":"Table rows"}));
        let canvas = self.table_part(
            body,
            NodeKind::Canvas,
            json!({"clip":false,"horizontalAlignment":"Left","verticalAlignment":"Top"}),
        );
        {
            let n = self.nodes.get_mut(&canvas).unwrap();
            n.table.owner = Some(id);
            n.table.role = "tableBodyRows".into();
            n.table.body_opacity.snap(1.);
        }
        let header = self.table_part(id, NodeKind::Canvas, json!({"clip":true}));
        let corner=self.table_part(header,NodeKind::Button,json!({"text":"\u{e788}","fontFamily":"Segoe Fluent Icons","variant":"Subtle","accessibleName":"Select all cells"}));
        let s = &mut self.nodes.get_mut(&id).unwrap().table;
        s.body = Some(body);
        s.canvas = Some(canvas);
        s.header = Some(header);
        s.corner = Some(corner);
    }
    pub(in crate::scene) fn measure_table(&mut self, id: u32, available: [f64; 2]) -> [f64; 2] {
        let p = &self.nodes[&id].props;
        [
            p.width.unwrap_or(if available[0].is_finite() {
                available[0]
            } else {
                640.
            }),
            p.height.unwrap_or(320.),
        ]
    }
    fn table_shape(&mut self, id: u32) {
        let q = props(&self.nodes[&id].props);
        let shape = json!([
            q.columns,
            q.auto_generate_columns,
            q.sorts,
            q.filters,
            q.search,
            q.page_size,
            q.page_index, q.groups, q.default_group_state,
            self.nodes[&id].table.group_overrides
        ])
        .to_string();
        if self.nodes[&id]
            .table
            .source
            .as_ref()
            .is_some_and(|old| Arc::ptr_eq(old, &q.items))
            && self.nodes[&id].table.shape == shape
            && self.nodes[&id].table.group_descriptions.len()==q.groups.len()
            && self.nodes[&id].table.group_descriptions.iter().zip(&q.groups).all(|(a,b)|Arc::ptr_eq(&a.comparison_ranks,&b.comparison_ranks))
        {
            return;
        }
        let cols = columns(&q);
        let all = view(&q, &cols);
        let start = if q.page_size > 0 {
            q.page_index.saturating_mul(q.page_size).min(all.len())
        } else {
            0
        };
        let page: Vec<usize> = if q.page_size > 0 {
            all.iter().skip(start).take(q.page_size).copied().collect()
        } else {
            all.clone()
        };
        if self.nodes[&id].table.group_descriptions.iter().map(|g|&g.column).ne(q.groups.iter().map(|g|&g.column)) {
            self.nodes.get_mut(&id).unwrap().table.group_overrides.retain(|id,_| {
                serde_json::from_str::<Value>(id).ok().and_then(|v|v[0].as_array().cloned()).is_some_and(|prefix|
                    prefix.len()<=q.groups.len() && prefix.iter().zip(&q.groups).all(|(column,g)|column.as_str()==Some(g.column.as_str())))
            });
        }
        let (order, group_headers, group_entries) = grouping::build(&q, &all_columns(&q), &page, &self.nodes[&id].table.group_overrides);
        let s = &self.nodes[&id].table;
        let reset = s.source.is_none()
            || s.order
                .iter()
                .filter_map(|&i| {
                    s.source
                        .as_ref()
                        .and_then(|source| source.get(i))
                        .map(|row| &row.id)
                })
                .ne(order.iter().map(|&i| &q.items[i].id));
        if reset {
            if let Some(canvas) = s.canvas {
                let reduced = self.reduced_motion;
                let n = &mut self.nodes.get_mut(&canvas).unwrap().table;
                let a = &contract()["entrance"];
                n.body_opacity.snap(if reduced { 1. } else { 0. });
                n.body_offset_y.snap(if reduced {
                    0.
                } else {
                    a["defaults"]["FromVerticalOffset"].as_f64().unwrap()
                });
                if !reduced {
                    n.body_opacity.curve =
                        serde_json::from_value(a["opacity"]["curve"].clone()).unwrap();
                    n.body_opacity.retarget(
                        1.,
                        self.time + a["opacity"]["delayMs"].as_f64().unwrap(),
                        a["opacity"]["durationMs"].as_f64().unwrap(),
                    );
                    n.body_offset_y.curve =
                        serde_json::from_value(a["translation"]["curve"].clone()).unwrap();
                    n.body_offset_y.retarget(
                        0.,
                        self.time + a["translation"]["delayMs"].as_f64().unwrap(),
                        a["translation"]["durationMs"].as_f64().unwrap(),
                    );
                }
            }
        }
        let s = &mut self.nodes.get_mut(&id).unwrap().table;
        s.cols = cols;
        s.view_keys = Arc::new(order.iter().map(|&i| q.items[i].id.clone()).collect());
        s.order = order;
        s.group_headers = group_headers;
        s.group_entries = group_entries;
        s.group_descriptions = q.groups.clone();
        s.row_offsets_key = None;
        s.all_order = all;
        s.source = Some(q.items.clone());
        s.shape = shape;
        s.widths.clear();
        let live = if q.groups.is_empty() {q.items.iter().map(|r|r.id.as_str()).collect::<HashSet<_>>()}
            else {self.nodes[&id].table.order.iter().map(|&i|q.items[i].id.as_str()).collect::<HashSet<_>>()};
        let t = self
            .nodes
            .get_mut(&id)
            .unwrap()
            .props
            .table
            .as_mut()
            .unwrap();
        t.selected_keys.retain(|k| live.contains(k.as_str()));
        t.selected_cells.retain(|c| live.contains(c.row.as_str()));
        if t.current_cell
            .as_ref()
            .is_some_and(|c| !live.contains(c.row.as_str()))
        {
            t.current_cell = None;
        }
        if self.nodes[&id]
            .table
            .editing
            .as_ref()
            .is_some_and(|c| !live.contains(c.row.as_str()))
        {
            self.nodes.get_mut(&id).unwrap().table.editing = None;
        }
    }
    fn table_widths(&mut self, id: u32, width: f64, m: &mut impl TextMeasurer) -> Vec<f64> {
        let p = &self.nodes[&id].props;
        let q = props(p);
        let cols = self.nodes[&id].table.cols.clone();
        let font = p.font();
        let grid = if matches!(
            q.header_grid_lines_visibility,
            TableViewGridLinesVisibility::All | TableViewGridLinesVisibility::Vertical
        ) || matches!(
            q.grid_lines_visibility,
            TableViewGridLinesVisibility::All | TableViewGridLinesVisibility::Vertical
        ) {
            (q.vertical_grid_lines_stroke_thickness * self.dpr).round() / self.dpr
        } else {
            0.
        };
        let mut header_font = font.clone();
        header_font.weight = 600;
        let mut widths = if self.nodes[&id].table.widths.len() == cols.len() {
            self.nodes[&id].table.widths.clone()
        } else {
            cols.iter()
                .map(|c| {
                    if c.width.unit == GridUnit::Pixel {
                        return c.width.value.clamp(c.min_width, c.max_width);
                    }
                    let mut w = if q.column_auto_width_mode != TableViewColumnAutoWidthMode::Cells {
                        m.measure(&c.header, &header_font).width
                            + if q.can_filter_columns && c.can_filter {
                                32.
                            } else {
                                24.
                            }
                            + grid
                    } else {
                        0.
                    };
                    if q.column_auto_width_mode != TableViewColumnAutoWidthMode::Header {
                        for r in q.items.iter() {
                            let text = r
                                .display
                                .get(&c.key)
                                .cloned()
                                .unwrap_or_else(|| text(path(&r.values, &c.field)));
                            let content = match c.kind {
                                TableViewColumnKind::CheckBox => 28.,
                                TableViewColumnKind::ToggleSwitch => 40.,
                                _ => m.measure(&text, &font).width,
                            };
                            w = w.max(
                                content
                                    + 24.
                                    + 2. * contract()["cell"]["selectionBorderThickness"]
                                        .as_f64()
                                        .unwrap()
                                    + grid,
                            );
                        }
                    }
                    w.clamp(c.min_width, c.max_width)
                })
                .collect::<Vec<_>>()
        };
        let fixed = cols
            .iter()
            .zip(&widths)
            .filter(|(c, _)| c.width.unit != GridUnit::Star)
            .map(|(_, w)| *w)
            .sum::<f64>();
        let mut total = cols
            .iter()
            .filter(|c| c.width.unit == GridUnit::Star)
            .map(|c| c.width.value)
            .sum::<f64>();
        // TableViewHeaderRow.OnDesiredWidthTimerTick reserves 32 DIP and
        // redistributes star weight after pinning each min/max-constrained column.
        let _ = width;
        let mut available = (self.nodes[&id].rect.width - 32. - fixed).max(0.);
        let mut remaining = cols
            .iter()
            .enumerate()
            .filter(|(_, c)| c.width.unit == GridUnit::Star)
            .map(|(i, _)| i)
            .collect::<Vec<_>>();
        loop {
            let unit = if total > 0. { available / total } else { 0. };
            let clamped = remaining.iter().copied().find(|&i| {
                let c = &cols[i];
                (unit * c.width.value).clamp(c.min_width, c.max_width) != unit * c.width.value
            });
            if let Some(i) = clamped {
                let c = &cols[i];
                widths[i] = (unit * c.width.value).clamp(c.min_width, c.max_width);
                available = (available - widths[i]).max(0.);
                total -= c.width.value;
                remaining.retain(|&n| n != i);
            } else {
                for i in remaining {
                    widths[i] = unit * cols[i].width.value;
                }
                break;
            }
        }
        self.nodes.get_mut(&id).unwrap().table.widths = widths.clone();
        widths
    }
    pub(in crate::scene) fn arrange_table(
        &mut self,
        id: u32,
        inner: Rect,
        m: &mut impl TextMeasurer,
    ) {
        self.nodes.get_mut(&id).unwrap().table.layout_bounds = Some(inner);
        self.ensure_table(id);
        let layout_key = self.table_layout_key(id, inner);
        if self.nodes[&id].table.layout_key.as_ref() == Some(&layout_key) {
            return;
        }
        // A vertical realization change does not invalidate the measured cells
        // that remain in the viewport. Their Canvas slots are absolute row
        // positions; scrolling is applied later by refresh_visual_tree.
        let incremental = !self.dirty
            && self.nodes[&id]
                .table
                .layout_key
                .as_ref()
                .is_some_and(|previous| {
                    let mut previous = previous.clone();
                    previous.realized_rows = layout_key.realized_rows;
                    previous.group_scroll_y = layout_key.group_scroll_y;
                    previous == layout_key
                });
        let existing_children = incremental.then(|| {
            self.nodes[&self.nodes[&id].table.canvas.unwrap()]
                .children
                .iter()
                .copied()
                .collect::<HashSet<_>>()
        });
        self.table_shape(id);
        let q = props(&self.nodes[&id].props);
        let p = self.nodes[&id].props.clone();
        if self.nodes[&id].table.editing.as_ref().is_some_and(|cell| {
            q.is_read_only
                || self.nodes[&id]
                    .table
                    .cols
                    .iter()
                    .find(|c| c.key == cell.column)
                    .is_none_or(|c| c.is_read_only)
        }) {
            let cell = self.nodes.get_mut(&id).unwrap().table.editing.take();
            self.nodes.get_mut(&id).unwrap().table.editor = None;
            self.table_emit(
                id,
                EventKind::CellEditEnded,
                json!({"cell":cell,"cancelled":true}),
            );
        }
        let cols = self.nodes[&id].table.cols.clone();
        let order = self.nodes[&id].table.order.clone();
        let header_height = if matches!(
            q.headers_visibility,
            TableViewHeadersVisibility::All | TableViewHeadersVisibility::Columns
        ) {
            q.header_row_height
        } else {
            0.
        };
        let row_header = grouping::indent() * q.groups.len().saturating_sub(1) as f64 + if matches!(
            q.headers_visibility,
            TableViewHeadersVisibility::All | TableViewHeadersVisibility::Rows
        ) {
            q.row_header_width.max(q.cells_horizontal_offset)
                + if q.has_row_details_template
                    && q.row_details_visibility_mode
                        == TableViewRowDetailsVisibilityMode::VisibleWhenExpanded
                {
                    24.
                } else {
                    0.
                }
                + if matches!(
                    q.grid_lines_visibility,
                    TableViewGridLinesVisibility::All | TableViewGridLinesVisibility::Vertical
                ) || matches!(
                    q.header_grid_lines_visibility,
                    TableViewGridLinesVisibility::All | TableViewGridLinesVisibility::Vertical
                ) {
                    (q.vertical_grid_lines_stroke_thickness * self.dpr).round() / self.dpr
                } else {
                    0.
                }
        } else {
            0.
        };
        let header_line = if matches!(
            q.header_grid_lines_visibility,
            TableViewGridLinesVisibility::All | TableViewGridLinesVisibility::Horizontal
        ) {
            (q.horizontal_grid_lines_stroke_thickness * self.dpr).round() / self.dpr
        } else {
            0.
        };
        let header_content_height = (header_height - header_line).max(0.);
        let row_line = if matches!(
            q.grid_lines_visibility,
            TableViewGridLinesVisibility::All | TableViewGridLinesVisibility::Horizontal
        ) {
            (q.horizontal_grid_lines_stroke_thickness * self.dpr).round() / self.dpr
        } else {
            0.
        };
        let widths = self
            .table_widths(id, (inner.width - row_header).max(0.), m)
            .into_iter()
            .map(|width| (width * self.dpr).round() / self.dpr)
            .collect::<Vec<_>>();
        let total = widths.iter().sum::<f64>() + row_header;
        let (body, canvas, header, corner) = {
            let s = &self.nodes[&id].table;
            (
                s.body.unwrap(),
                s.canvas.unwrap(),
                s.header.unwrap(),
                s.corner.unwrap(),
            )
        };
        let mut offset = self.nodes[&body]
            .scroll
            .snapshot(&self.nodes[&body].props, self.time);
        let offsets_key = (self.nodes[&id].layout_version, self.dpr, order.len());
        let offsets = if self.nodes[&id].table.row_offsets_key == Some(offsets_key) {
            self.nodes[&id].table.row_offsets.clone()
        } else {
            let mut offsets = Vec::with_capacity(order.len() + 1);
            let mut y=0.;
            let entries=self.nodes[&id].table.group_entries.clone();
            for entry in entries {
                match entry {
                    grouping::Entry::Header(index)=>{
                        self.nodes.get_mut(&id).unwrap().table.group_headers[index].y=y;
                        y += q.group_header_height.max(24.);
                    },
                    grouping::Entry::End(index)=>{ self.nodes.get_mut(&id).unwrap().table.group_headers[index].end_y=y; },
                    grouping::Entry::Row(index)=>{
                        offsets.push(y);
                        y += q.row_height + row_line + if grouping::details(&q,&q.items[index]) {q.row_details_height} else {0.};
                    }
                }
            }
            offsets.push(y);
            self.nodes.get_mut(&id).unwrap().table.group_extent=y;
            Arc::new(offsets)
        };
        self.nodes.get_mut(&id).unwrap().table.row_offsets = offsets.clone();
        // The view can shrink to headers only while scrolled near the end.
        // Realize against the new extent, which ScrollViewer will clamp during
        // its Arrange below, rather than caching an empty off-screen range.
        offset.vertical_offset=offset.vertical_offset.min((offsets.last().copied().unwrap_or(0.)-(inner.height-header_height).max(0.)).max(0.));
        {
            let c = &mut self.nodes.get_mut(&canvas).unwrap().props;
            c.width = Some(total.max(inner.width));
            c.height = Some(*offsets.last().unwrap());
        }
        self.nodes.get_mut(&header).unwrap().props.background = Some(theme_resource(
            "TableViewHeaderRowBackground",
            self.nodes[&id].theme,
        ));
        self.nodes.get_mut(&header).unwrap().table.owner = Some(id);
        self.nodes.get_mut(&header).unwrap().table.role = "headerRow".into();
        let mut expected = vec![];
        let mut left = row_header;
        for (ci, c) in cols.iter().enumerate() {
            let x = left
                - if ci < q.frozen_column_count {
                    0.
                } else {
                    offset.horizontal_offset
                };
            left += widths[ci];
            if x + widths[ci] < row_header || x > inner.width {
                continue;
            }
            let existing = self.nodes[&id]
                .table
                .header_buttons
                .iter()
                .find(|(_, key, filter)| key == &c.key && !*filter)
                .map(|s| s.0);
            let button = existing.unwrap_or_else(|| {
                self.table_part(header, NodeKind::Button, json!({"variant":"Subtle","text":c.header,"fontWeight":600,"fontSize":p.font_size,"fontFamily":p.font_family}))
            });
            let filter = c.can_filter && q.can_filter_columns;
            let filter_width = if filter {
                (19. * self.dpr).round() / self.dpr
            } else {
                0.
            };
            {
                let n = self.nodes.get_mut(&button).unwrap();
                n.props.text = c.header.clone();
                n.props.font_weight = 600;
                n.props.font_size = p.font_size;
                n.props.font_family = p.font_family.clone();
                n.props.accessible_name = Some(format!("Sort {}", c.header));
                let clip_left = if ci < q.frozen_column_count {
                    0.
                } else {
                    (row_header + widths.iter().take(q.frozen_column_count).sum::<f64>() - x)
                        .max(0.)
                        .min(widths[ci])
                };
                n.table.cell_clip = Some(Rect::new(
                    clip_left,
                    0.,
                    (widths[ci] - clip_left).max(0.),
                    header_content_height,
                ));
                n.props.canvas_left = Some(x);
                n.props.canvas_top = Some(0.);
                n.props.width = Some(widths[ci]);
                n.props.height = Some(header_content_height);
                n.props.visible = header_height > 0.;
                n.props.horizontal_content_alignment = HorizontalAlignment::Left;
                n.props.padding = [12., 0., if filter { 20. } else { 12. }, 0.];
                n.props.z_index = if ci < q.frozen_column_count { 10 } else { 0 };
                n.props.background = None;
            }
            self.nodes.get_mut(&button).unwrap().table.owner = Some(id);
            self.nodes.get_mut(&button).unwrap().table.role = "headerMain".into();
            if c.has_header_template {
                self.nodes.get_mut(&button).unwrap().props.text.clear();
                let slot = self.nodes[&button]
                    .children
                    .first()
                    .copied()
                    .unwrap_or_else(|| {
                        self.table_part(button, NodeKind::Grid, json!({"clip":true}))
                    });
                let n = &mut self.nodes.get_mut(&slot).unwrap().props;
                n.width = Some((widths[ci] - filter_width - 24.).max(0.));
                n.height = Some(header_height);
            } else {
                let children = self.nodes[&button].children.clone();
                for child in children {
                    let _ = self.destroy(child);
                }
            }
            expected.push((button, c.key.clone(), false));
            if filter {
                let old = self.nodes[&id]
                    .table
                    .header_buttons
                    .iter()
                    .find(|(_, key, filter)| key == &c.key && *filter)
                    .map(|s| s.0);
                let b = old.unwrap_or_else(|| {
                    self.table_part(
                        header,
                        NodeKind::Button,
                        json!({"variant":"Standard","fontFamily":"Segoe Fluent Icons","minWidth":0,"minHeight":0}),
                    )
                });
                let n = self.nodes.get_mut(&b).unwrap();
                n.props.text = if q.filters.iter().any(|f| f.column == c.key) {
                    "\u{e71c}"
                } else {
                    "\u{e712}"
                }
                .into();
                n.props.accessible_name = Some(format!("Filter {}", c.header));
                let left = x + widths[ci] - filter_width;
                let clip_left = if ci < q.frozen_column_count {
                    0.
                } else {
                    (row_header + widths.iter().take(q.frozen_column_count).sum::<f64>() - left)
                        .max(0.)
                        .min(filter_width)
                };
                n.table.cell_clip = Some(Rect::new(
                    clip_left,
                    0.,
                    (filter_width - clip_left).max(0.),
                    filter_width,
                ));
                n.props.canvas_left = Some(x + widths[ci] - filter_width);
                n.props.canvas_top = Some((header_content_height - filter_width).max(0.));
                n.props.width = Some((19. * self.dpr).round() / self.dpr);
                n.props.height = Some(filter_width);
                n.props.visible = header_height > 0.;
                n.props.z_index = if ci < q.frozen_column_count { 10 } else { 0 };
                n.props.background = Some(BrushValue::Color("#00000000".into()));
                n.props.padding = [4.; 4];
                n.props.border_thickness = [0.; 4];
                n.props.font_size = 11.;
                n.table.owner = Some(id);
                n.table.role = "headerOption".into();
                expected.push((b, c.key.clone(), true));
            }
        }
        let old = self.nodes[&id].table.header_buttons.clone();
        for (b, _, _) in old {
            if !expected.iter().any(|s| s.0 == b) {
                let _ = self.destroy(b);
            }
        }
        self.nodes.get_mut(&id).unwrap().table.header_buttons = expected;
        {
            let n = &mut self.nodes.get_mut(&corner).unwrap().props;
            n.text = if q.corner_button_mode == TableViewCornerButtonMode::Options {
                "\u{e712}"
            } else {
                "\u{e788}"
            }
            .into();
            n.padding = [0.; 4];
            n.accessible_name = Some(
                if q.corner_button_mode == TableViewCornerButtonMode::Options {
                    "Table options"
                } else {
                    "Select all cells"
                }
                .into(),
            );
            n.canvas_left = Some(0.);
            n.width = Some(row_header);
            n.height = Some(header_height);
            n.visible = row_header > 0.
                && header_height > 0.
                && q.corner_button_mode != TableViewCornerButtonMode::None;
            n.z_index = 20;
            n.background = Some(BrushValue::Color("#00000000".into()));
            n.font_size = 12.;
            n.rotation = 0.;
        }
        self.nodes.get_mut(&corner).unwrap().table.owner = Some(id);
        self.nodes.get_mut(&corner).unwrap().table.role = "corner".into();
        if q.corner_button_mode == TableViewCornerButtonMode::Options {
            self.nodes.get_mut(&corner).unwrap().props.text.clear();
            if self.nodes[&corner].children.is_empty() {
                self.table_part(corner,NodeKind::FontIcon,json!({"glyph":"\u{e712}","fontSize":12,"width":10,"height":12,"rotation":90,"centerPoint":[5,6],"horizontalAlignment":"Center","verticalAlignment":"Center"}));
            }
        } else {
            for child in self.nodes[&corner].children.clone() {
                let _ = self.destroy(child);
            }
        }
        let start = offsets
            .partition_point(|y| *y < offset.vertical_offset)
            .saturating_sub(1);
        let end = (offsets.partition_point(|y| {
            *y <= offset.vertical_offset + (inner.height - header_height).max(0.)
        }) + 1)
            .min(order.len());
        let old = self.nodes[&id].table.slots.clone();
        let mut slots = vec![];
        let inherited = (
            self.nodes[&id].theme,
            self.nodes[&id].enabled,
            self.nodes[&id].visible,
        );
        let old_rows = self.nodes[&id].table.rows.clone();
        let mut rows = Vec::new();
        for ri in start..end {
            let index = order[ri];
            let row = &q.items[index];
            if incremental {
                if let Some((_, node)) = old_rows.iter().find(|(key, _)| key == &row.id) {
                    rows.push((row.id.clone(), *node));
                    slots.extend(old.iter().filter(|slot| slot.row == row.id).cloned());
                    continue;
                }
            }
            let y = offsets[ri];
            let whole = q.selected_keys.contains(&row.id);
            let row_part = old_rows
                .iter()
                .find(|(key, _)| key == &row.id)
                .map(|(_, node)| *node)
                .unwrap_or_else(|| {
                    self.table_part(canvas, NodeKind::Grid, json!({"clip":true,"zIndex":-1}))
                });
            {
                let node = self.nodes.get_mut(&row_part).unwrap();
                node.props.canvas_left = Some(offset.horizontal_offset);
                node.props.canvas_top = Some(y);
                node.props.width = Some(inner.width);
                node.props.height = Some(q.row_height + row_line);
                node.table.owner = Some(id);
                node.table.role = "rowBackground".into();
                node.table.row_key = row.id.clone();
                let state = &mut node.table;
                state.row_background = if ri % 2 == 1 {
                    q.alternate_row_background.clone()
                } else {
                    None
                };
                if !state.row_visual_initialized || self.reduced_motion {
                    state
                        .row_indicator_opacity
                        .snap(if whole { 1. } else { 0. });
                    state.row_indicator_scale.snap(1.);
                } else if state.row_selected != whole {
                    let motion = &contract()["indicator"];
                    state.row_indicator_opacity.curve = [0., 0., 1., 1.];
                    state.row_indicator_opacity.retarget(
                        if whole { 1. } else { 0. },
                        self.time,
                        motion["opacityMs"].as_f64().unwrap(),
                    );
                    if whole {
                        state.row_indicator_scale.curve =
                            serde_json::from_value(motion["fromZeroCurve"].clone()).unwrap();
                        if !state.row_indicator_scale.active(self.time) {
                            state.row_indicator_scale.snap(0.);
                        }
                        state.row_indicator_scale.retarget(
                            1.,
                            self.time,
                            motion["scaleMs"].as_f64().unwrap(),
                        );
                    }
                }
                state.row_visual_initialized = true;
                state.row_selected = whole;
            }
            rows.push((row.id.clone(), row_part));
            let mut x = row_header;
            for (ci, c) in cols.iter().enumerate() {
                let frozen = ci < q.frozen_column_count;
                let screen = x - offset.horizontal_offset;
                if !frozen && (screen + widths[ci] < row_header || screen > inner.width) {
                    x += widths[ci];
                    continue;
                }
                let cell = Cell {
                    row: row.id.clone(),
                    column: c.key.clone(),
                };
                let editing = self.nodes[&id].table.editing.as_ref() == Some(&cell);
                let slot = old
                    .iter()
                    .find(|s| {
                        s.row == row.id
                            && s.column == c.key
                            && s.role == "cell"
                            && s.editing == editing
                    })
                    .map(|s| s.id)
                    .unwrap_or_else(|| {
                        self.table_part(canvas, NodeKind::Grid, json!({"clip":true}))
                    });
                self.nodes.get_mut(&slot).unwrap().table.owner = Some(id);
                self.nodes.get_mut(&slot).unwrap().table.cell = Some(cell.clone());
                let selected = whole || q.selected_cells.contains(&cell);

                let style = row.styles.get(&c.key).cloned().unwrap_or_default();
                let bg = style.background;
                let clip_left = if frozen {
                    0.
                } else {
                    (row_header + widths.iter().take(q.frozen_column_count).sum::<f64>() - screen)
                        .max(0.)
                        .min(widths[ci])
                };
                self.nodes.get_mut(&slot).unwrap().table.cell_clip = Some(Rect::new(
                    clip_left,
                    0.,
                    (widths[ci] - clip_left).max(0.),
                    q.row_height,
                ));
                {
                    let n = &mut self.nodes.get_mut(&slot).unwrap().props;
                    n.canvas_left = Some(x + if frozen { offset.horizontal_offset } else { 0. });
                    n.canvas_top = Some(y);
                    n.width = Some(widths[ci]);
                    n.height = Some(q.row_height);
                    n.z_index = if frozen { 10 } else { 0 };
                    n.background = bg;
                    n.foreground = if selected && inherited.0 == Theme::HighContrast {
                        Some(BrushValue::Resource {
                            resource: "TextOnAccentFillColorPrimaryBrush".into(),
                        })
                    } else {
                        style.foreground.or_else(|| {
                            if ri % 2 == 1 {
                                q.alternate_row_foreground.clone()
                            } else {
                                None
                            }
                        })
                    };
                    n.border_thickness = [0.; 4];
                    n.border_brush = None;
                    // Community MeasureOverride reduces the generated element's
                    // MaxWidth by the selection border even when its brush is hidden.
                    // ContentPresenter centers that constrained element.
                    let inset = (contract()["cell"]["selectionBorderThickness"]
                        .as_f64()
                        .unwrap()
                        * self.dpr)
                        .round()
                        / self.dpr;
                    let margin = if editing
                        && !matches!(
                            c.kind,
                            TableViewColumnKind::CheckBox | TableViewColumnKind::ToggleSwitch
                        ) {
                        0.
                    } else {
                        contract()["cell"]["contentMargin"].as_f64().unwrap()
                    };
                    let line = if matches!(
                        q.grid_lines_visibility,
                        TableViewGridLinesVisibility::All | TableViewGridLinesVisibility::Vertical
                    ) {
                        (q.vertical_grid_lines_stroke_thickness * self.dpr).round() / self.dpr
                    } else {
                        0.
                    };
                    n.padding = [margin + inset, 0., margin + inset + line, 0.];
                    n.accessible_name = Some(format!(
                        "{}, {}: {}",
                        index + 1,
                        c.header,
                        text(path(&row.values, &c.field))
                    ));
                }
                let template = if editing {
                    c.has_edit_template
                } else {
                    c.has_template
                };
                let content_kind = format!("{:?}|{}", c.kind, template);
                if self.nodes[&slot].table.content_kind != content_kind {
                    let children = self.nodes[&slot].children.clone();
                    for child in children {
                        let _ = self.destroy(child);
                    }
                    self.nodes.get_mut(&slot).unwrap().table.content_kind = content_kind;
                }
                if !template {
                    self.table_cell_content(id, slot, row, c, editing, &p);
                } else if editing {
                    self.table_focus_template_editor(id, slot);
                }
                slots.push(Slot {
                    id: slot,
                    row: row.id.clone(),
                    column: c.key.clone(),
                    index,
                    role: "cell".into(),
                    editing,
                });
                x += widths[ci];
            }
            if row_header > 0. {
                let slot = old
                    .iter()
                    .find(|s| s.row == row.id && s.role == "rowHeader")
                    .map(|s| s.id)
                    .unwrap_or_else(|| {
                        self.table_part(canvas, NodeKind::Grid, json!({"clip":true}))
                    });
                {
                    let n = &mut self.nodes.get_mut(&slot).unwrap().props;
                    n.canvas_left = Some(offset.horizontal_offset);
                    n.canvas_top = Some(y);
                    n.width = Some(row_header);
                    n.height = Some(q.row_height);
                    n.z_index = 20;
                    n.background = None;
                    n.padding = [4., 2., 4., 2.];
                }
                self.nodes.get_mut(&slot).unwrap().table.owner = Some(id);
                self.nodes.get_mut(&slot).unwrap().table.role = "rowHeader".into();
                self.nodes.get_mut(&slot).unwrap().table.row_key = row.id.clone();
                self.nodes.get_mut(&slot).unwrap().table.row_background = if ri % 2 == 1 {
                    q.alternate_row_background.clone()
                } else {
                    None
                };
                if q.has_row_details_template
                    && q.row_details_visibility_mode
                        == TableViewRowDetailsVisibilityMode::VisibleWhenExpanded
                {
                    let toggle=self.nodes[&slot].children.iter().find(|node|self.nodes[node].props.layout_key=="table-details-toggle").copied().unwrap_or_else(||{let button=self.table_part(slot,NodeKind::ToggleButton,json!({"variant":"Subtle","layoutKey":"table-details-toggle","minWidth":0,"minHeight":0,"width":16,"padding":[2,2,2,2],"margin":[4,2,4,2],"horizontalAlignment":"Right","verticalAlignment":"Stretch","isTabStop":false}));self.table_part(button,NodeKind::AnimatedIcon,json!({"source":"ChevronUpDownSmall","width":12,"height":12,"useParentState":true}));button});
                    let n = self.nodes.get_mut(&toggle).unwrap();
                    n.props.is_checked = Some(q.expanded_rows.contains(&row.id));
                    n.props.accessible_name = Some(format!(
                        "{} row details",
                        if q.expanded_rows.contains(&row.id) {
                            "Collapse"
                        } else {
                            "Expand"
                        }
                    ));
                    n.table.owner = Some(id);
                    n.table.role = "detailsToggle".into();
                    n.table.row_key = row.id.clone();
                } else if !q.has_row_header_template {
                    let label = row.header.clone();
                    self.table_label(slot, label, &p);
                }
                slots.push(Slot {
                    id: slot,
                    row: row.id.clone(),
                    column: String::new(),
                    index,
                    role: "rowHeader".into(),
                    editing: false,
                });
            }
            if grouping::details(&q,row) {
                let slot = old
                    .iter()
                    .find(|s| s.row == row.id && s.role == "details")
                    .map(|s| s.id)
                    .unwrap_or_else(|| {
                        self.table_part(
                            canvas,
                            NodeKind::Grid,
                            json!({"clip":true,"padding":[12,8,12,8]}),
                        )
                    });
                {
                    let n = &mut self.nodes.get_mut(&slot).unwrap().props;
                    n.canvas_left = Some(if q.are_row_details_frozen {
                        offset.horizontal_offset
                    } else {
                        0.
                    });
                    n.canvas_top = Some(y + q.row_height + row_line);
                    n.width = Some(if q.are_row_details_frozen {
                        inner.width
                    } else {
                        total
                    });
                    n.height = Some(q.row_details_height);
                    n.z_index = 30;
                }
                slots.push(Slot {
                    id: slot,
                    row: row.id.clone(),
                    column: String::new(),
                    index,
                    role: "details".into(),
                    editing: false,
                });
            }
        }
        for (_, node) in old_rows {
            if !rows.iter().any(|(_, live)| *live == node) {
                let _ = self.destroy(node);
            }
        }
        self.nodes.get_mut(&id).unwrap().table.rows = rows;
        for s in &old {
            if !slots.iter().any(|n| n.id == s.id) {
                let _ = self.destroy(s.id);
            }
        }
        self.table_realize_groups(id, inner.width, (inner.height-header_height).max(0.), offset.horizontal_offset, offset.vertical_offset);
        let signature =
            json!([slots, q.current_cell, q.selected_cells, q.selected_keys, self.nodes[&id].table.group_realized]).to_string();
        let changed = self.nodes[&id].table.visual != signature;
        {
            let s = &mut self.nodes.get_mut(&id).unwrap().table;
            s.slots = slots;
            s.visual = signature;
        }
        let world = self.nodes[&id].world;
        if let Some(existing) = existing_children {
            let children = self.nodes[&canvas].children.clone();
            let canvas_world = self.nodes[&canvas].world;
            for child in children
                .into_iter()
                .filter(|child| !existing.contains(child))
            {
                let desired = self.measure_node(child, [f64::INFINITY; 2], m);
                let cp = &self.nodes[&child].props;
                let (x, y) = (cp.canvas_left.unwrap_or(0.), cp.canvas_top.unwrap_or(0.));
                self.arrange_node(
                    child,
                    Rect::new(0., 0., desired[0], desired[1]),
                    canvas_world,
                    inherited,
                    m,
                );
                let node = self.nodes.get_mut(&child).unwrap();
                node.rect.x += x;
                node.rect.y += y;
            }
            // Existing group headers need only their Canvas position updated:
            // their content, measures and row display lists remain reusable.
            for node in self.nodes[&id].table.group_nodes.values().copied().collect::<Vec<_>>() {
                if existing.contains(&node) {
                    let n=self.nodes.get_mut(&node).unwrap();
                    n.rect.x=n.props.canvas_left.unwrap_or(0.);n.rect.y=n.props.canvas_top.unwrap_or(0.);
                }
            }
            // Creation/removal dirties ancestors. All affected slots have just
            // completed Measure/Arrange and the table extent is unchanged.
            self.dirty = false;
        } else {
            self.measure_node(
                body,
                [inner.width, (inner.height - header_height).max(0.)],
                m,
            );
            self.arrange_node(
                body,
                Rect::new(
                    inner.x,
                    inner.y + header_height,
                    inner.width,
                    (inner.height - header_height).max(0.),
                ),
                world,
                inherited,
                m,
            );
            self.measure_node(header, [inner.width, header_height], m);
            self.arrange_node(
                header,
                Rect::new(inner.x, inner.y, inner.width, header_height),
                world,
                inherited,
                m,
            );
        }
        self.sync_table_filter(id);
        if changed {
            self.table_emit(id, EventKind::RealizationChanged, json!({}));
        }
        // Template realization can invalidate ancestors while creating parts.
        // Retain the final revision, not the one before those parts existed.
        let mut key = self.table_layout_key(id, inner);
        key.horizontal_offset = offset.horizontal_offset;
        key.realized_rows = [start, end];
        self.nodes.get_mut(&id).unwrap().table.layout_key = Some(key);
        self.nodes.get_mut(&id).unwrap().table.row_offsets_key =
            Some((self.nodes[&id].layout_version, self.dpr, order.len()));
    }
    fn table_layout_key(&self, id: u32, inner: Rect) -> LayoutKey {
        let n = &self.nodes[&id];
        let offset = n
            .table
            .body
            .map(|body| self.nodes[&body].scroll.offsets(self.time))
            .unwrap_or_default();
        let q = props(&n.props);
        let header = if matches!(
            q.headers_visibility,
            TableViewHeadersVisibility::All | TableViewHeadersVisibility::Columns
        ) {
            q.header_row_height
        } else {
            0.
        };
        let start = n
            .table
            .row_offsets
            .partition_point(|y| *y < offset[1])
            .saturating_sub(1);
        let end = (n
            .table
            .row_offsets
            .partition_point(|y| *y <= offset[1] + (inner.height - header).max(0.))
            + 1)
        .min(n.table.order.len());
        LayoutKey {
            inner,
            version: n.layout_version,
            theme: n.theme,
            enabled: n.enabled,
            visible: n.visible,
            dpr: self.dpr,
            horizontal_offset: offset[0],
            group_scroll_y: if q.groups.is_empty(){0.}else{offset[1]},
            realized_rows: [start, end],
        }
    }
    fn table_label(&mut self, slot: u32, label: String, p: &NodeProperties) {
        let child = self.nodes[&slot]
            .children
            .first()
            .copied()
            .unwrap_or_else(|| {
                self.table_part(
                    slot,
                    NodeKind::TextBlock,
                    json!({"trimming":"CharacterEllipsis","verticalAlignment":"Center"}),
                )
            });
        let n = &mut self.nodes.get_mut(&child).unwrap().props;
        n.text = label;
        n.font_size = p.font_size;
        n.font_family = p.font_family.clone();
        n.font_weight = p.font_weight;
    }
    fn table_cell_content(
        &mut self,
        id: u32,
        slot: u32,
        row: &Row,
        c: &Column,
        editing: bool,
        p: &NodeProperties,
    ) {
        let value = path(&row.values, &c.field);
        let label = row
            .display
            .get(&c.key)
            .cloned()
            .unwrap_or_else(|| text(value));
        let kind = if editing {
            match c.kind {
                TableViewColumnKind::Number => NodeKind::NumberBox,
                TableViewColumnKind::CheckBox => NodeKind::CheckBox,
                TableViewColumnKind::ToggleSwitch => NodeKind::ToggleSwitch,
                TableViewColumnKind::ComboBox => NodeKind::ComboBox,
                TableViewColumnKind::Date => NodeKind::CalendarDatePicker,
                TableViewColumnKind::Time => NodeKind::TimePicker,
                _ => NodeKind::TextBox,
            }
        } else {
            match c.kind {
                TableViewColumnKind::CheckBox => NodeKind::CheckBox,
                TableViewColumnKind::ToggleSwitch => NodeKind::ToggleSwitch,
                TableViewColumnKind::Hyperlink => NodeKind::HyperlinkButton,
                _ => NodeKind::TextBlock,
            }
        };
        let child = self.nodes[&slot].children.first().copied();
        let child = if let Some(child) = child {
            child
        } else {
            let mut patch = json!({"verticalAlignment":"Center","fontSize":p.font_size,"fontFamily":p.font_family,"minWidth":0});
            if editing && !matches!(kind, NodeKind::CheckBox | NodeKind::ToggleSwitch) {
                patch["horizontalAlignment"] = "Stretch".into();
            }
            if kind == NodeKind::TextBlock {
                patch["text"] = label.clone().into();
                patch["trimming"] = "CharacterEllipsis".into();
            }
            if kind == NodeKind::TextBox {
                patch["text"] = label.clone().into();
            }
            if kind == NodeKind::NumberBox {
                patch["numberValue"] = value.clone();
                patch["text"] = text(value).into();
            }
            if kind == NodeKind::ToggleSwitch {
                // TableViewToggleSwitchColumn.GenerateElement explicitly sets
                // OnContent/OffContent to its null defaults. A standalone
                // ToggleSwitch's localized On/Off labels do not belong here.
                patch["onContent"] = "".into();
                patch["offContent"] = "".into();
            }
            if kind == NodeKind::ComboBox {
                patch["collectionItems"] = json!(c.options.iter().enumerate().map(|(index,text)|json!({"id":format!("table-option-{index}"),"text":text,"enabled":true})).collect::<Vec<_>>());
                patch["selectedIndex"] = json!(c
                    .options
                    .iter()
                    .position(|s| s == &text(value))
                    .map(|i| i as i32)
                    .unwrap_or(-1));
            }
            if kind == NodeKind::CalendarDatePicker {
                patch["pickerControls"] = json!({"date":value});
            }
            if kind == NodeKind::TimePicker {
                patch["pickerControls"] = json!({"time":value});
            }
            let child = self.table_part(slot, kind, patch);
            if editing && c.kind == TableViewColumnKind::Time {
                let node = self.nodes.get_mut(&child).unwrap();
                node.table.owner = Some(id);
                node.table.role = "tableTimeEditor".into();
                node.props.vertical_alignment = VerticalAlignment::Stretch;
            }
            if editing {
                self.nodes.get_mut(&id).unwrap().table.editor = Some(child);
                let focus = self.nodes[&child]
                    .composed
                    .parts
                    .get("InputBox")
                    .copied()
                    .filter(|_| matches!(kind, NodeKind::NumberBox | NodeKind::ComboBox))
                    .unwrap_or(child);
                self.focus(Some(focus));
                if kind == NodeKind::NumberBox {
                    let length = self.nodes[&focus].props.text.encode_utf16().count();
                    let _ = self.editor_select(focus, 0, length);
                }
                if kind == NodeKind::TextBox {
                    let _ = self.editor_select(child, 0, label.encode_utf16().count());
                }
            }
            child
        };
        if editing && self.nodes[&id].table.editor != Some(child) {
            self.nodes.get_mut(&id).unwrap().table.editor = Some(child);
            let focus = self.nodes[&child]
                .composed
                .parts
                .get("InputBox")
                .copied()
                .filter(|_| matches!(kind, NodeKind::NumberBox | NodeKind::ComboBox))
                .unwrap_or(child);
            self.focus(Some(focus));
        }
        if kind == NodeKind::CheckBox {
            let n = &mut self.nodes.get_mut(&child).unwrap().props;
            n.width = Some(28.);
            n.min_width = 20.;
            n.horizontal_alignment = HorizontalAlignment::Center;
        }
        if matches!(kind, NodeKind::CheckBox | NodeKind::ToggleSwitch) {
            // Community boolean columns keep the enabled appearance in read-
            // only tables, but remove the generated control from hit testing.
            let read_only = props(&self.nodes[&id].props).is_read_only || c.is_read_only;
            self.nodes.get_mut(&child).unwrap().props.is_hit_test_visible = !read_only;
        }
        if !editing && c.kind == TableViewColumnKind::Number {
            self.nodes
                .get_mut(&child)
                .unwrap()
                .props
                .horizontal_alignment = HorizontalAlignment::Right;
        }
        if !editing {
            let n = &mut self.nodes.get_mut(&child).unwrap().props;
            n.text = if kind == NodeKind::CheckBox || kind == NodeKind::ToggleSwitch {
                String::new()
            } else {
                label
            };
            n.is_checked = value.as_bool();
            n.is_on = value.as_bool().unwrap_or(false);
            n.is_tab_stop = false;
        } else if self.nodes[&child].kind == NodeKind::CheckBox
            || self.nodes[&child].kind == NodeKind::ToggleSwitch
        {
            let n = &mut self.nodes.get_mut(&child).unwrap().props;
            if self.focused != Some(child) {
                n.is_checked = value.as_bool();
                n.is_on = value.as_bool().unwrap_or(false);
            }
        }
    }
    pub(in crate::scene) fn table_snapshot(&self, id: u32) -> Option<TableSnapshot> {
        let n = self.nodes.get(&id)?;
        if n.kind != NodeKind::TableView {
            return None;
        }
        let s = &n.table;
        let q = props(&n.props);
        Some(TableSnapshot {
            groups: q.groups.clone(),
            is_grouped: !q.groups.is_empty(),
            group_count: s.group_headers.len(),
            realized_groups: s.group_realized.clone(),
            header_slots: s
                .header_buttons
                .iter()
                .filter(|(_, _, filter)| !*filter)
                .filter_map(|(b, key, _)| {
                    self.nodes[b].children.first().map(|slot| HeaderSlot {
                        id: *slot,
                        column: key.clone(),
                    })
                })
                .collect(),
            columns: s.cols.clone(),
            column_widths: s.widths.clone(),
            realized: s.slots.clone(),
            view_keys: s.view_keys.clone(),
            total_count: q.items.len(),
            filtered_count: s.all_order.len(),
            selected_keys: q.selected_keys,
            selected_cells: q.selected_cells,
            current_cell: q.current_cell,
            editing_cell: s.editing.clone(),
            expanded_rows: q.expanded_rows,
            motion: s
                .canvas
                .and_then(|canvas| self.nodes.get(&canvas))
                .map(|n| BodyMotion {
                    body_opacity: n.table.body_opacity.value(self.time),
                    body_offset_y: n.table.body_offset_y.value(self.time),
                }),
            sorts: q.sorts,
            filters: q.filters,
            page_index: q.page_index,
            page_count: if q.page_size == 0 {
                1
            } else {
                s.all_order.len().div_ceil(q.page_size)
            },
            scroll: s.body.map(|b| {
                self.nodes[&b]
                    .scroll
                    .snapshot(&self.nodes[&b].props, self.time)
            }),
        })
    }
    fn table_owner(&self, mut id: u32) -> Option<u32> {
        loop {
            let n = self.nodes.get(&id)?;
            if n.kind == NodeKind::TableView {
                return Some(id);
            }
            id = n.parent?;
        }
    }
    fn table_update_auto_scroll(&mut self, id: u32, point: [f64; 2]) {
        let Some(body) = self.nodes[&id].table.body else {
            return;
        };
        let n = &self.nodes[&body];
        let p = n
            .world
            .inverse()
            .unwrap_or_default()
            .point(point[0], point[1]);
        let local = [p.0, p.1];
        let viewport = [n.rect.width, n.rect.height];
        let source = &contract()["dragSelection"];
        let edge = source["edgeThreshold"].as_f64().unwrap();
        let speed = source["maxScrollSpeed"].as_f64().unwrap();
        let interval = source["intervalMs"].as_f64().unwrap();
        let delta = std::array::from_fn(|axis| {
            let pos = local[axis];
            let length = viewport[axis];
            if pos > length - edge {
                ((pos - (length - edge)) / edge).min(1.) * speed
            } else if pos < edge {
                -((edge - pos) / edge).min(1.) * speed
            } else {
                0.
            }
        });
        let s = &mut self.nodes.get_mut(&id).unwrap().table;
        s.auto_scroll_delta = delta;
        if delta.iter().any(|v| v.abs() > 0.5) {
            if s.auto_scroll_next.is_none() {
                s.auto_scroll_next = Some(self.time + interval);
            }
        } else {
            s.auto_scroll_next = None;
        }
    }
    pub(in crate::scene) fn table_drag_tick(&mut self) {
        let ids = self
            .nodes
            .values()
            .filter(|n| {
                n.kind == NodeKind::TableView
                    && n.table
                        .auto_scroll_next
                        .is_some_and(|next| next <= self.time)
            })
            .map(|n| n.id)
            .collect::<Vec<_>>();
        for id in ids {
            let Some((_, anchor, row, _, point)) = self.nodes[&id].table.select_drag.clone() else {
                self.nodes.get_mut(&id).unwrap().table.auto_scroll_next = None;
                continue;
            };
            let Some(body) = self.nodes[&id].table.body else {
                continue;
            };
            let offset = self.nodes[&body]
                .scroll
                .snapshot(&self.nodes[&body].props, self.time);
            let delta = self.nodes[&id].table.auto_scroll_delta;
            let _ = self.scroll_change(
                body,
                Some(offset.horizontal_offset + delta[0]),
                Some(offset.vertical_offset + delta[1]),
                None,
                false,
            );
            let next = self.nodes[&body]
                .scroll
                .snapshot(&self.nodes[&body].props, self.time);
            let changed = (next.horizontal_offset - offset.horizontal_offset).abs() >= 0.5
                || (next.vertical_offset - offset.vertical_offset).abs() >= 0.5;
            self.nodes.get_mut(&id).unwrap().table.auto_scroll_next = changed
                .then_some(self.time + contract()["dragSelection"]["intervalMs"].as_f64().unwrap());
            if !changed {
                continue;
            }
            let n = &self.nodes[&body];
            let local = n
                .world
                .inverse()
                .unwrap_or_default()
                .point(point[0], point[1]);
            let q = props(&self.nodes[&id].props);
            let min_x = q.cells_horizontal_offset + 1.;
            let clamped = n.world.point(
                local.0.clamp(min_x, (n.rect.width - 1.).max(min_x)),
                local.1.clamp(1., (n.rect.height - 1.).max(1.)),
            );
            if let Some(r) = self.table_row_at(id, clamped.0, clamped.1) {
                let x = self.nodes[&id]
                    .world
                    .inverse()
                    .unwrap_or_default()
                    .point(clamped.0, clamped.1)
                    .0;
                let s = &self.nodes[&id].table;
                if let Some(c) = (0..s.cols.len()).find(|&c| x < self.table_column_right(id, c)) {
                    let cell = Cell {
                        row: q.items[s.order[r]].id.clone(),
                        column: s.cols[c].key.clone(),
                    };
                    if q.current_cell.as_ref() != Some(&cell) {
                        let shift = s.shift;
                        let s = &mut self.nodes.get_mut(&id).unwrap().table;
                        s.anchor = Some(anchor);
                        s.shift = true;
                        self.table_select(id, cell, row);
                        self.nodes.get_mut(&id).unwrap().table.shift = shift;
                    }
                }
            }
            self.invalidate(id, true);
        }
    }
    fn table_focus_template_editor(&mut self, id: u32, slot: u32) {
        let Some(root) = self.nodes[&slot].children.first().copied() else {
            return;
        };
        if self.nodes[&id].table.editor == Some(root) {
            return;
        }
        // The community cell focuses its editing ContentControl on Loaded.
        // A caller's template can arrive after the initial cell realization;
        // find its first focusable child once, without stealing later focus.
        let mut pending = vec![root];
        while let Some(child) = pending.pop() {
            let n = &self.nodes[&child];
            if !n.props.visible || !self.effective_enabled(child) {
                continue;
            }
            let target = n.composed.parts.get("InputBox").copied().or_else(|| {
                (text_edit::is_editor(n.kind)
                    || crate::selection::is_button(n.kind)
                    || matches!(n.kind, NodeKind::Slider | NodeKind::RatingControl | NodeKind::CalendarDatePicker | NodeKind::TimePicker)
                    || n.kind == NodeKind::Grid && n.props.is_tab_stop)
                    .then_some(child)
            });
            if let Some(target) = target {
                self.nodes.get_mut(&id).unwrap().table.editor = Some(root);
                self.focus(Some(target));
                return;
            }
            pending.extend(n.children.iter().rev().copied());
        }
    }
    fn table_slot(&self, id: u32, target: u32) -> Option<Slot> {
        self.nodes[&id]
            .table
            .slots
            .iter()
            .find(|s| self.descendant_of(target, s.id))
            .cloned()
    }
    pub(in crate::scene) fn table_cell_owns_touch(&self,target:u32)->bool {
        self.table_owner(target).is_some_and(|id|self.table_slot(id,target).is_some())
    }
    pub(in crate::scene) fn table_pointer_cursor(&self, target: u32) -> Option<&'static str> {
        let id = self.table_owner(target)?;
        let s = &self.nodes[&id].table;
        if s.drag.is_some_and(|(_, _, _, _, resize)| resize) {
            return Some("col-resize");
        }
        let (_, key, filter) = s
            .header_buttons
            .iter()
            .find(|(node, _, _)| self.descendant_of(target, *node))?;
        if *filter {
            return None;
        }
        let from = s.cols.iter().position(|c| c.key == *key)?;
        let (x, y) = self.pointer?;
        let local = self.nodes[&id].world.inverse()?.point(x, y);
        let q = props(&self.nodes[&id].props);
        if !q.can_resize_columns {
            return None;
        }
        let right = self.table_column_right(id, from);
        let top = s.layout_bounds.unwrap_or_default().y;
        let line = if matches!(
            q.header_grid_lines_visibility,
            TableViewGridLinesVisibility::All | TableViewGridLinesVisibility::Horizontal
        ) {
            (q.horizontal_grid_lines_stroke_thickness * self.dpr).round() / self.dpr
        } else {
            0.
        };
        let right_strip = s.cols[from].can_resize
            && (right - local.0).abs() <= 4.
            && local.1 - top
                < q.header_row_height
                    - line
                    - if q.can_filter_columns && s.cols[from].can_filter {
                        19.2
                    } else {
                        0.
                    };
        let left_strip =
            from > 0 && s.cols[from - 1].can_resize && local.0 - (right - s.widths[from]) <= 4.;
        (right_strip || left_strip).then_some("col-resize")
    }
    fn table_deselect(&mut self, id: u32) {
        // TableView.cs DeselectAllItems/DeselectAllCells: row-only deselection
        // preserves CurrentCellSlot; clearing cell ranges resets it.
        let q = self
            .nodes
            .get_mut(&id)
            .unwrap()
            .props
            .table
            .as_mut()
            .unwrap();
        let rows = !q.selected_keys.is_empty();
        let cells = !q.selected_cells.is_empty();
        q.selected_keys.clear();
        q.selected_cells.clear();
        let current = cells && q.current_cell.take().is_some();
        if cells {
            self.table_emit(id, EventKind::CellSelectionChanged, json!({}));
        }
        if rows || cells {
            self.table_emit(id, EventKind::SelectionChanged, json!({}));
        }
        if current {
            self.table_emit(id, EventKind::CurrentCellChanged, json!({"cell":null}));
        }
    }
    fn table_next_cell(&self, id: u32, enter: bool, editing: bool) -> Option<(Cell, usize, usize)> {
        // Source TableView.cs GetNextSlot: Enter is row-major within a column;
        // Tab is column-major within a row. Both wrap and honor Shift.
        let s = &self.nodes[&id].table;
        let q = props(&self.nodes[&id].props);
        if s.order.is_empty() || s.cols.is_empty() {
            return None;
        }
        let current = q.current_cell.as_ref();
        let mut row =
            current.and_then(|cell| s.order.iter().position(|&i| q.items[i].id == cell.row));
        let mut col = current.and_then(|cell| s.cols.iter().position(|c| c.key == cell.column));
        for _ in 0..s.order.len() * s.cols.len() {
            let (r, c) = if let (Some(r), Some(c)) = (row, col) {
                if enter {
                    if s.shift {
                        if r == 0 {
                            (s.order.len() - 1, (c + s.cols.len() - 1) % s.cols.len())
                        } else {
                            (r - 1, c)
                        }
                    } else if r + 1 == s.order.len() {
                        (0, (c + 1) % s.cols.len())
                    } else {
                        (r + 1, c)
                    }
                } else if s.shift {
                    if c == 0 {
                        ((r + s.order.len() - 1) % s.order.len(), s.cols.len() - 1)
                    } else {
                        (r, c - 1)
                    }
                } else if c + 1 == s.cols.len() {
                    ((r + 1) % s.order.len(), 0)
                } else {
                    (r, c + 1)
                }
            } else {
                (0, 0)
            };
            row = Some(r);
            col = Some(c);
            if !editing || (!s.cols[c].is_read_only && !q.is_read_only) {
                return Some((
                    Cell {
                        row: q.items[s.order[r]].id.clone(),
                        column: s.cols[c].key.clone(),
                    },
                    r,
                    c,
                ));
            }
        }
        None
    }
    fn table_continue_selection(&mut self, id: u32, cell: Cell, row: bool, edit: bool) {
        let previous = self.nodes[&id].table.editing.clone();
        self.table_select(id, cell.clone(), row);
        let q = props(&self.nodes[&id].props);
        let s = &self.nodes[&id].table;
        if let (Some(r), Some(c)) = (
            s.order.iter().position(|&i| q.items[i].id == cell.row),
            s.cols.iter().position(|c| c.key == cell.column),
        ) {
            self.table_bring_cell(id, r, c);
        }
        if edit && previous.as_ref() != Some(&cell) {
            self.table_edit(id, cell);
        }
    }
    fn table_select(&mut self, id: u32, cell: Cell, row: bool) {
        let state = &self.nodes[&id].table;
        let (ctrl, shift, anchor) = (state.ctrl, state.shift, state.anchor.clone());
        let cols = state.cols.clone();
        let order = state.order.clone();
        let old = props(&self.nodes[&id].props);
        let mut q = old.clone();
        q.current_cell = Some(cell.clone());
        let additive = ctrl || q.selection_mode == ListViewSelectionMode::Multiple;
        if q.selection_mode != ListViewSelectionMode::None {
            let rows = row || q.selection_unit == TableViewSelectionUnit::Row;
            let rows = rows && q.selection_unit != TableViewSelectionUnit::Cell;
            if !additive || q.selection_mode == ListViewSelectionMode::Single {
                q.selected_keys.clear();
                q.selected_cells.clear();
            }
            if shift && q.selection_mode != ListViewSelectionMode::Single && anchor.is_some() {
                let a = anchor.unwrap();
                let ar = order.iter().position(|&i| q.items[i].id == a.row);
                let br = order.iter().position(|&i| q.items[i].id == cell.row);
                let ac = cols.iter().position(|c| c.key == a.column);
                let bc = cols.iter().position(|c| c.key == cell.column);
                if let (Some(ar), Some(br), Some(ac), Some(bc)) = (ar, br, ac, bc) {
                    for r in ar.min(br)..=ar.max(br) {
                        let key = q.items[order[r]].id.clone();
                        if rows {
                            q.selected_keys.push(key);
                        } else {
                            for c in ac.min(bc)..=ac.max(bc) {
                                q.selected_cells.push(Cell {
                                    row: key.clone(),
                                    column: cols[c].key.clone(),
                                });
                            }
                        }
                    }
                }
            } else if rows {
                if additive && old.selected_keys.contains(&cell.row) {
                    q.selected_keys.retain(|r| r != &cell.row);
                } else {
                    q.selected_keys.push(cell.row.clone());
                }
            } else if additive && old.selected_cells.contains(&cell) {
                q.selected_cells.retain(|c| c != &cell);
            } else {
                q.selected_cells.push(cell.clone());
            }
            if q.selection_unit == TableViewSelectionUnit::CellWithRow {
                if rows {
                    let keys = q.selected_keys.iter().collect::<HashSet<_>>();
                    q.selected_cells.retain(|c| keys.contains(&c.row));
                } else {
                    let old_rows = old
                        .selected_cells
                        .iter()
                        .map(|c| &c.row)
                        .collect::<HashSet<_>>();
                    let cell_rows = q
                        .selected_cells
                        .iter()
                        .map(|c| c.row.clone())
                        .collect::<BTreeSet<_>>();
                    q.selected_keys
                        .retain(|key| !old_rows.contains(key) || cell_rows.contains(key));
                    q.selected_keys.extend(cell_rows);
                }
            }
            q.selected_keys.sort();
            q.selected_keys.dedup();
            q.selected_cells.sort();
            q.selected_cells.dedup();
        }
        let cells_changed = old.selected_cells != q.selected_cells;
        let rows_changed = old.selected_keys != q.selected_keys;
        {
            let n = self.nodes.get_mut(&id).unwrap();
            n.props.table = Some(Box::new(q));
            if !shift {
                n.table.anchor = Some(cell.clone());
            }
        }
        if old.current_cell.as_ref() != Some(&cell) {
            self.table_emit(id, EventKind::CurrentCellChanged, json!({"cell":cell}));
        }
        if cells_changed {
            self.table_emit(id, EventKind::CellSelectionChanged, json!({"cell":cell}));
        }
        if cells_changed || rows_changed {
            self.table_emit(id, EventKind::SelectionChanged, json!({"cell":cell}));
        }
        self.table_changed(id, false);
        self.focus(Some(id));
    }
    fn table_export(
        &mut self,
        id: u32,
        selected: bool,
        headers: bool,
        copy: bool,
        client_operation: Option<Value>,
    ) {
        let q = props(&self.nodes[&id].props);
        if copy && !q.can_copy {
            return;
        }
        let s = &self.nodes[&id].table;
        let content = csv(
            &q,
            &s.cols,
            if q.groups.is_empty(){&s.all_order}else{&s.order},
            selected,
            headers,
            if copy { '\t' } else { ',' },
        );
        self.table_request(
            id,
            if copy {
                EventKind::CopyRequested
            } else {
                EventKind::TableViewExport
            },
            if copy { "copy" } else { "export" },
            json!({"text":content,"selected":selected,"includeHeaders":headers,"clientOperation":client_operation}),
        );
    }
    fn table_edit(&mut self, id: u32, cell: Cell) {
        if !self.effective_enabled(id) {
            return;
        }
        let q = props(&self.nodes[&id].props);
        let Some(c) = self.nodes[&id]
            .table
            .cols
            .iter()
            .find(|c| c.key == cell.column)
        else {
            return;
        };
        if q.is_read_only || c.is_read_only || (c.field.is_empty() && !c.has_edit_template) {
            return;
        }
        let Some(row) = q.items.iter().find(|r| r.id == cell.row) else {
            return;
        };
        self.table_request(
            id,
            EventKind::BeginningEdit,
            "beginEdit",
            json!({"cell":cell,"value":path(&row.values,&c.field)}),
        );
    }
    fn table_commit(&mut self, id: u32, cancel: bool, explicit: Option<Value>) {
        let Some(cell) = self.nodes[&id].table.editing.clone() else {
            return;
        };
        if !cancel && explicit.is_none() {
            if let Some(editor) = self.nodes[&id].table.editor.filter(|editor| {
                self.nodes
                    .get(editor)
                    .is_some_and(|n| n.kind == NodeKind::NumberBox)
            }) {
                self.pump_composed_events();
                self.commit_number(editor);
                self.sync_composed();
            }
        }
        let Some(c) = self.nodes[&id]
            .table
            .cols
            .iter()
            .find(|c| c.key == cell.column)
        else {
            return;
        };
        let value = explicit
            .or_else(|| {
                self.nodes[&id]
                    .table
                    .editor
                    .and_then(|e| self.nodes.get(&e))
                    .map(|e| match e.kind {
                        NodeKind::NumberBox => json!(e.props.number_value),
                        NodeKind::CheckBox => json!(e.props.is_checked),
                        NodeKind::ToggleSwitch => json!(e.props.is_on),
                        NodeKind::ComboBox => {
                            json!(c.options.get(e.props.selected_index.max(0) as usize))
                        }
                        NodeKind::CalendarDatePicker => json!(e
                            .props
                            .picker_controls
                            .as_ref()
                            .and_then(|p| p.date.clone())),
                        NodeKind::TimePicker => json!(e
                            .props
                            .picker_controls
                            .as_ref()
                            .and_then(|p| p.time.clone())),
                        _ => json!(e.props.text),
                    })
            })
            .unwrap_or(Value::Null);
        self.table_request(
            id,
            EventKind::CellEditEnding,
            "commitEdit",
            json!({"cell":cell,"value":value,"cancelEdit":cancel}),
        );
    }
    fn table_set_value(&mut self, id: u32, cell: &Cell, value: Value) -> Result<(), String> {
        let q = props(&self.nodes[&id].props);
        let col = self.nodes[&id]
            .table
            .cols
            .iter()
            .find(|c| c.key == cell.column)
            .ok_or("Unknown TableView column")?
            .clone();
        if q.is_read_only || col.is_read_only {
            return Err("TableView cell is read-only".into());
        }
        let value = converted_value(col.kind, value)?;
        let mut rows = (*q.items).clone();
        let row = rows
            .iter_mut()
            .find(|r| r.id == cell.row)
            .ok_or("Unknown TableView row")?;
        write_cell(row, &col, value)?;
        self.nodes
            .get_mut(&id)
            .unwrap()
            .props
            .table
            .as_mut()
            .unwrap()
            .items = Arc::new(rows);
        Ok(())
    }
    fn table_resolve(
        &mut self,
        id: u32,
        request: u32,
        cancel: bool,
        data: &Value,
    ) -> Result<(), String> {
        let pending = self.nodes.get_mut(&id).unwrap().table.pending.take();
        let Some(p) = pending else { return Ok(()) };
        if p.request != request {
            self.nodes.get_mut(&id).unwrap().table.pending = Some(p);
            return Ok(());
        }
        if cancel && p.action != "applySort" {
            self.nodes.get_mut(&id).unwrap().table.after_commit = None;
            self.table_next_request(id);
            return Ok(());
        }
        let cell = p
            .data
            .get("cell")
            .and_then(|v| serde_json::from_value::<Cell>(v.clone()).ok());
        match p.action.as_str() {
            "sort" => {
                // Original DoSort raises Sorting, then ClearSorting before
                // changing descriptions. A handled clear preserves existing sorts.
                self.table_request(id, EventKind::ClearSorting, "applySort", p.data);
            }
            "applySort" => {
                if !cancel {
                    self.table_deselect(id);
                }
                let column = p.data["column"].as_str().unwrap();
                let direction = serde_json::from_value(p.data["direction"].clone()).ok();
                let q = self
                    .nodes
                    .get_mut(&id)
                    .unwrap()
                    .props
                    .table
                    .as_mut()
                    .unwrap();
                let implicit_group = q.groups.iter().any(|g|g.column==column) && !q.sorts.iter().any(|s|s.column==column);
                if !cancel && !p.data["additive"].as_bool().unwrap_or(false) { q.sorts.retain(|s|s.column==column); }
                if let Some(group)=q.groups.iter_mut().find(|g|g.column==column) {
                    if let Some(direction)=direction {group.direction=direction;}
                }
                if !cancel || direction.is_some() {
                    q.sorts.retain(|s| s.column != column);
                }
                if let Some(direction) = direction.filter(|_|!implicit_group) {
                    q.sorts.push(Sort {
                        column: column.into(),
                        direction,
                    });
                }
                self.table_changed(id, false);
            }
            "group" => {
                if let Some(column)=p.data["column"].as_str() {
                    let q=self.nodes.get_mut(&id).unwrap().props.table.as_mut().unwrap();
                    if !q.groups.iter().any(|g|g.column==column) {
                        let direction=q.sorts.iter().find(|s|s.column==column).map(|s|s.direction).unwrap_or(TableViewSortDirection::Ascending);
                        q.groups.push(GroupDescription{column:column.into(),direction,..Default::default()});
                    }
                    self.table_changed(id,false);
                }
            }
            "beginEdit" => {
                let cell = cell.unwrap();
                let q = props(&self.nodes[&id].props);
                if !self.effective_enabled(id)
                    || q.is_read_only
                    || self.nodes[&id]
                        .table
                        .cols
                        .iter()
                        .find(|c| c.key == cell.column)
                        .is_none_or(|c| c.is_read_only)
                    || !q.items.iter().any(|r| r.id == cell.row)
                {
                    self.table_next_request(id);
                    return Ok(());
                }
                self.nodes.get_mut(&id).unwrap().table.editing = Some(cell.clone());
                self.nodes.get_mut(&id).unwrap().table.editor = None;
                self.nodes
                    .get_mut(&id)
                    .unwrap()
                    .props
                    .table
                    .as_mut()
                    .unwrap()
                    .current_cell = Some(cell.clone());
                self.table_emit(id, EventKind::PreparingCellForEdit, json!({"cell":cell}));
                self.invalidate(id, true);
            }
            "commitEdit" => {
                let cell = cell.unwrap();
                let cancelled = p.data["cancelEdit"].as_bool().unwrap_or(false);
                if !cancelled {
                    self.table_set_value(
                        id,
                        &cell,
                        data.get("value")
                            .cloned()
                            .unwrap_or_else(|| p.data["value"].clone()),
                    )?;
                }
                let s = &mut self.nodes.get_mut(&id).unwrap().table;
                s.editing = None;
                s.editor = None;
                self.table_emit(
                    id,
                    EventKind::CellEditEnded,
                    json!({"cell":cell,"cancelled":cancelled}),
                );
                self.table_changed(id, !cancelled);
                self.focus(Some(id));
                if let Some((next, row, edit)) =
                    self.nodes.get_mut(&id).unwrap().table.after_commit.take()
                {
                    // EndingEdit may be cancelled by the application; continuation
                    // is consumed only here, after a successful commit.
                    let continue_edit = edit && next != cell;
                    let modifiers = (self.nodes[&id].table.ctrl, self.nodes[&id].table.shift);
                    if edit {
                        let s = &mut self.nodes.get_mut(&id).unwrap().table;
                        s.ctrl = false;
                        s.shift = false;
                    }
                    self.table_continue_selection(id, next, row, continue_edit);
                    {
                        let s = &mut self.nodes.get_mut(&id).unwrap().table;
                        s.ctrl = modifiers.0;
                        s.shift = modifiers.1;
                    }
                }
            }
            "clearSorting" => {
                self.table_deselect(id);
                self.nodes
                    .get_mut(&id)
                    .unwrap()
                    .props
                    .table
                    .as_mut()
                    .unwrap()
                    .sorts
                    .clear();
                self.table_changed(id, false);
            }
            "reorder" => {
                self.table_deselect(id);
                let cols = self.nodes[&id].table.cols.clone();
                let Some(from) = cols
                    .iter()
                    .position(|c| Some(c.key.as_str()) == p.data["column"].as_str())
                else {
                    self.table_next_request(id);
                    return Ok(());
                };
                let to = (p.data["to"].as_u64().unwrap() as usize).min(cols.len() - 1);
                let mut cols = cols;
                let item = cols.remove(from);
                cols.insert(to, item);
                let q = self
                    .nodes
                    .get_mut(&id)
                    .unwrap()
                    .props
                    .table
                    .as_mut()
                    .unwrap();
                let mut next = cols.into_iter();
                q.columns = all_columns(q)
                    .into_iter()
                    .map(|c| if c.visible { next.next().unwrap() } else { c })
                    .collect();
                q.auto_generate_columns = false;
                self.table_emit(id, EventKind::ColumnReordered, p.data);
                self.table_changed(id, false);
            }
            "context" => {
                let q = props(&self.nodes[&id].props);
                let items = if p.data["row"].as_bool().unwrap_or(false) {
                    q.row_context_menu
                } else {
                    q.cell_context_menu
                };
                if !items.is_empty() {
                    if let Some(menu) = self.nodes[&id].table.menu {
                        let _ = self.destroy(menu);
                    }
                    let menu=self.create(id,NodeKind::MenuFlyout,json!({"menuItems":items,"isOpen":true,"placementTarget":p.data["target"],"placement":"BottomEdgeAlignedLeft"}))?;
                    self.nodes.get_mut(&id).unwrap().table.menu = Some(menu);
                }
            }
            "paste" => {
                let content = data
                    .get("text")
                    .and_then(Value::as_str)
                    .unwrap_or(p.data["text"].as_str().unwrap_or(""));
                match self.table_paste(id, content) {
                    Ok(()) => self.table_emit(
                        id,
                        EventKind::PasteFromClipboard,
                        json!({"text":content,"ready":true,"clientOperation":p.data["clientOperation"]}),
                    ),
                    Err(error) => self.table_emit(
                        id,
                        EventKind::PasteFromClipboard,
                        json!({"text":content,"error":error,"ready":true,"clientOperation":p.data["clientOperation"]}),
                    ),
                }
            }
            "copy" | "export" => {
                let copy = p.action == "copy";
                let q = props(&self.nodes[&id].props);
                let s = &self.nodes[&id].table;
                // Business converters may have refreshed the source while the
                // request was dispatched. Re-export the current Rust view unless
                // the application explicitly replaced the requested text.
                let content = if data.get("text").is_some_and(|v| v != &p.data["text"]) {
                    text(&data["text"])
                } else {
                    csv(
                        &q,
                        &s.cols,
                        if q.groups.is_empty(){&s.all_order}else{&s.order},
                        p.data["selected"].as_bool().unwrap_or(false),
                        p.data["includeHeaders"].as_bool().unwrap_or(true),
                        if copy { '\t' } else { ',' },
                    )
                };
                if copy {
                    self.emit(id, EventKind::CopyRequested);
                    self.events.last_mut().unwrap().text = Some(content);
                } else {
                    self.table_emit(
                        id,
                        EventKind::TableViewExport,
                        json!({"text":content,"ready":true,"clientOperation":p.data["clientOperation"]}),
                    );
                }
            }
            _ => {}
        }
        self.table_next_request(id);
        Ok(())
    }
    fn table_next_request(&mut self, id: u32) {
        if let Some((kind, action, data)) =
            self.nodes.get_mut(&id).unwrap().table.queued.pop_front()
        {
            self.table_request(id, kind, &action, data);
        }
    }
    pub(in crate::scene) fn table_input(&mut self, input: &Input) -> Result<bool, String> {
        if let Input::Table {
            id,
            action,
            data,
            request,
            cancel,
        } = input
        {
            let id = *id;
            if self.get(id)?.kind != NodeKind::TableView {
                return Err("Not a TableView".into());
            }
            self.table_shape(id);
            match action.as_str() {
                "context" => self.table_context(id, data["target"].as_u64().map(|v| v as u32)),
                "resolve" => self.table_resolve(id, request.unwrap_or(0), *cancel, data)?,
                "select" => {
                    let cell =
                        serde_json::from_value(data["cell"].clone()).map_err(|e| e.to_string())?;
                    self.table_select(id, cell, data["row"].as_bool().unwrap_or(false));
                }
                "group" => self.table_group_column(id,data["column"].as_str().unwrap_or("")),
                "ungroup" => self.table_ungroup(id,data["column"].as_str()),
                "ungroupAll" => self.table_ungroup(id,None),
                "toggleGroup" | "expandGroup" | "collapseGroup" => self.table_expand_group(id,data,match action.as_str(){"expandGroup"=>Some(true),"collapseGroup"=>Some(false),_=>None}),
                "expandAllGroups" | "collapseAllGroups" => {
                    let expanded=action=="expandAllGroups";
                    let q=self.nodes.get_mut(&id).unwrap().props.table.as_mut().unwrap();
                    q.default_group_state=if expanded{TableViewGroupState::Expanded}else{TableViewGroupState::Collapsed};
                    self.nodes.get_mut(&id).unwrap().table.group_overrides.clear();
                    self.table_changed(id,false);
                }
                "groupSort" => {
                    let q=self.nodes.get_mut(&id).unwrap().props.table.as_mut().unwrap();
                    if let Some(g)=q.groups.iter_mut().find(|g|Some(g.column.as_str())==data["column"].as_str()) {
                        if let Ok(mode)=serde_json::from_value(data["sortMode"].clone()){g.sort_mode=mode;}
                        if let Ok(direction)=serde_json::from_value(data["direction"].clone()){g.direction=direction;}
                    }
                    self.table_changed(id,false);
                }
                "selectAll" => self.table_select_all(id),
                "toggleRowDetails"=>{let row=data["row"].as_str().unwrap_or("");let q=self.nodes.get_mut(&id).unwrap().props.table.as_mut().unwrap();if q.items.iter().any(|item|item.id==row){if q.expanded_rows.iter().any(|key|key==row){q.expanded_rows.retain(|key|key!=row);}else{q.expanded_rows.push(row.into());}self.table_changed(id,false);}},
                "clearSelection" => {
                    self.table_deselect(id);
                    self.table_changed(id, false);
                }
                "sort" => self.table_sort(
                    id,
                    data["column"].as_str().unwrap_or(""),
                    data.get("direction"),
                    data["additive"].as_bool().unwrap_or(false),
                ),
                "clearSorting" => {
                    self.table_deselect(id);
                    self.nodes
                        .get_mut(&id)
                        .unwrap()
                        .props
                        .table
                        .as_mut()
                        .unwrap()
                        .sorts
                        .clear();
                    self.table_changed(id, false);
                }
                "filter" => {
                    let filter: Filter =
                        serde_json::from_value(data.clone()).map_err(|e| e.to_string())?;
                    self.table_deselect(id);
                    let q = self
                        .nodes
                        .get_mut(&id)
                        .unwrap()
                        .props
                        .table
                        .as_mut()
                        .unwrap();
                    q.filters.retain(|f| f.column != filter.column);
                    q.filters.push(filter);
                    q.page_index = 0;
                    self.table_changed(id, false);
                }
                "clearFilters" => {
                    self.nodes
                        .get_mut(&id)
                        .unwrap()
                        .props
                        .table
                        .as_mut()
                        .unwrap()
                        .filters
                        .clear();
                    self.table_changed(id, false);
                }
                "beginEdit" => self.table_edit(
                    id,
                    serde_json::from_value(data["cell"].clone()).map_err(|e| e.to_string())?,
                ),
                "commitEdit" => self.table_commit(id, false, data.get("value").cloned()),
                "cancelEdit" => self.table_commit(id, true, None),
                "setValue" => {
                    let cell =
                        serde_json::from_value(data["cell"].clone()).map_err(|e| e.to_string())?;
                    self.table_set_value(id, &cell, data["value"].clone())?;
                    self.table_changed(id, true);
                }
                "copy" | "export" => self.table_export(
                    id,
                    data["selected"].as_bool().unwrap_or(action == "copy"),
                    data["includeHeaders"].as_bool().unwrap_or(true),
                    action == "copy",data.get("clientOperation").cloned(),
                ),
                "requestPaste" => self.table_request(
                    id,
                    EventKind::PasteFromClipboard,
                    "paste",
                    json!({"text":data["text"].as_str().unwrap_or(""),"clientOperation":data["clientOperation"]}),
                ),
                "paste" => self.table_paste(id, data["text"].as_str().unwrap_or(""))?,
                "reorderColumn" => self.table_reorder(
                    id,
                    data["from"].as_u64().unwrap_or(0) as usize,
                    data["to"].as_u64().unwrap_or(0) as usize,
                ),
                "resizeColumn" => {
                    let key = data["column"].as_str().unwrap_or("");
                    let width = data["width"].as_f64().ok_or("Invalid column width")?;
                    self.table_resize(id, key, width)?;
                }
                "reorderRow" => self.table_reorder_row(
                    id,
                    data["row"].as_str().unwrap_or(""),
                    data["index"].as_u64().unwrap_or(0) as usize,
                ),
                "scrollIntoView" => {
                    let source=props(&self.nodes[&id].props);
                    if let Some(body) = self.nodes[&id].table.body {
                        if let Some(i) = self.nodes[&id].table.order.iter().position(|&i| {
                            source.items[i].id
                                == data["row"].as_str().unwrap_or("")
                        }) {
                            let y = self.nodes[&id]
                                .table
                                .row_offsets
                                .get(i)
                                .copied()
                                .unwrap_or(0.);
                            self.input(
                                Input::Scroll {
                                    id: body,
                                    x: None,
                                    y: Some(y),
                                    zoom: None,
                                    animated: false,
                                },
                                self.time,
                            )?;
                        }
                    }
                }
                "openFilter" => {
                    self.table_filter_menu(id, data["column"].as_str().unwrap_or(""))?
                }
                _ => return Err(format!("Unknown TableView action: {action}")),
            }
            self.invalidate(id, true);
            return Ok(true);
        }
        if let Input::Modifiers { ctrl, shift } = input {
            for n in self
                .nodes
                .values_mut()
                .filter(|n| n.kind == NodeKind::TableView)
            {
                n.table.ctrl = *ctrl;
                n.table.shift = *shift;
            }
            return Ok(false);
        }
        if let Input::Touch {
            pointer,
            x,
            y,
            phase,
        } = input
        {
            if !x.is_finite() || !y.is_finite() {
                return Err("invalid touch position".into());
            }
            // An editor is inside the table's ScrollViewer, so the browser
            // submits Touch rather than Down/Up even for its template buttons.
            // Recognize a tap separately from cell selection; leave pans and
            // picker wheels on their existing Rust scrolling paths.
            let editor_touches = self.nodes.values()
                .filter_map(|n| n.table.editor_touch.map(|touch| (n.id, touch)))
                .collect::<Vec<_>>();
            for (id, (pid, target, origin)) in editor_touches {
                if phase == "down" || (pid == *pointer &&
                    (phase == "cancel" || (*x-origin[0]).abs()+(*y-origin[1]).abs()>8.)) {
                    self.nodes.get_mut(&id).unwrap().table.editor_touch = None;
                } else if pid == *pointer && phase == "up" {
                    self.nodes.get_mut(&id).unwrap().table.editor_touch = None;
                    let editor = self.nodes[&id].table.editor;
                    if editor.is_some_and(|root| self.nodes.contains_key(&root)
                        && self.nodes.contains_key(&target) && self.descendant_of(target, root))
                        && self.hit(*x, *y) == Some(target) {
                        self.input(Input::Down {pointer:*pointer, x:*x, y:*y}, self.time)?;
                        self.input(Input::Up {pointer:*pointer, x:*x, y:*y}, self.time)?;
                    }
                }
            }
            if phase == "cancel" {
                for n in self.nodes.values_mut() {
                    if n.table
                        .touch_candidate
                        .as_ref()
                        .is_some_and(|c| c.0 == *pointer)
                    {
                        n.table.touch_candidate = None;
                        n.table.last_tap = None;
                    }
                }
                return Ok(false);
            }
            if phase == "down" {
                if let Some(target) = self.hit(*x, *y) {
                    if let Some(id) = self.table_owner(target) {
                        if let Some(slot) = self.table_slot(id, target) {
                            if slot.editing {
                                let multi_touch = self.nodes.values().any(|n|
                                    n.scroll.touches.keys().any(|p| p != pointer));
                                if !multi_touch && crate::selection::is_button(self.nodes[&target].kind)
                                    && self.nodes[&id].table.editor.is_some_and(|root|self.descendant_of(target,root)) {
                                    self.nodes.get_mut(&id).unwrap().table.editor_touch = Some((*pointer,target,[*x,*y]));
                                }
                                // Tapping an active editor must not double-tap
                                // the containing cell and recreate that editor.
                                return Ok(false);
                            }
                            if slot.role != "details" {
                                let column = if slot.column.is_empty() {
                                    self.nodes[&id]
                                        .table
                                        .cols
                                        .first()
                                        .map(|c| c.key.clone())
                                        .unwrap_or_default()
                                } else {
                                    slot.column
                                };
                                let kind = self.nodes[&target].kind;
                                self.nodes.get_mut(&id).unwrap().table.touch_candidate = Some((
                                    *pointer,
                                    Cell {
                                        row: slot.row,
                                        column,
                                    },
                                    slot.role == "rowHeader",
                                    [*x, *y],
                                    kind,
                                ));
                            }
                        }
                    }
                }
            } else {
                let ids = self
                    .nodes
                    .values()
                    .filter(|n| {
                        n.table
                            .touch_candidate
                            .as_ref()
                            .is_some_and(|c| c.0 == *pointer)
                    })
                    .map(|n| n.id)
                    .collect::<Vec<_>>();
                for id in ids {
                    let candidate = self.nodes[&id].table.touch_candidate.clone().unwrap();
                    let (_, cell, row, origin, kind) = candidate;
                    if (*x - origin[0]).abs() + (*y - origin[1]).abs() > 8. {
                        let s = &mut self.nodes.get_mut(&id).unwrap().table;
                        s.touch_candidate = None;
                        s.last_tap = None;
                    } else if phase == "up" {
                        self.nodes.get_mut(&id).unwrap().table.touch_candidate = None;
                        let double = self.nodes[&id]
                            .table
                            .last_tap
                            .as_ref()
                            .is_some_and(|(old, time)| old == &cell && self.time - *time < 500.);
                        self.nodes.get_mut(&id).unwrap().table.last_tap =
                            Some((cell.clone(), self.time));
                        self.table_select(id, cell.clone(), row);
                        let q = props(&self.nodes[&id].props);
                        let col = self.nodes[&id]
                            .table
                            .cols
                            .iter()
                            .find(|c| c.key == cell.column)
                            .cloned();
                        if let Some(col) = col {
                            if matches!(kind, NodeKind::CheckBox | NodeKind::ToggleSwitch)
                                && !q.is_read_only
                                && !col.is_read_only
                            {
                                let value = q
                                    .items
                                    .iter()
                                    .find(|r| r.id == cell.row)
                                    .map(|r| path(&r.values, &col.field).as_bool().unwrap_or(false))
                                    .unwrap_or(false);
                                self.table_set_value(id, &cell, json!(!value))?;
                                self.table_changed(id, true);
                            } else if kind == NodeKind::HyperlinkButton {
                                if let Some(row) = q.items.iter().find(|r| r.id == cell.row) {
                                    let uri = text(path(&row.values, &col.field));
                                    if uri.starts_with("https://")
                                        || uri.starts_with("http://")
                                        || uri.starts_with("mailto:")
                                    {
                                        self.table_emit(
                                            id,
                                            EventKind::Click,
                                            json!({"cell":cell,"uri":uri}),
                                        );
                                    }
                                }
                            } else if double {
                                self.table_emit(
                                    id,
                                    EventKind::CellDoubleTapped,
                                    json!({"cell":cell}),
                                );
                                self.table_emit(
                                    id,
                                    EventKind::RowDoubleTapped,
                                    json!({"cell":cell}),
                                );
                                self.table_edit(id, cell);
                            }
                        }
                    }
                }
            }
            return Ok(false);
        }
        if let Input::Move { x, y, pointer } = input {
            let active = self
                .nodes
                .values()
                .find_map(|n| n.table.select_drag.as_ref().map(|d| (n.id, d.clone())));
            if let Some((id, (pid, anchor, row, origin, _))) = active {
                if pid == *pointer {
                    let target = self.hit(*x, *y);
                    if let Some(slot) = target.and_then(|t| self.table_slot(id, t)) {
                        if slot.role != "details" {
                            let column = if slot.column.is_empty() {
                                anchor.column.clone()
                            } else {
                                slot.column
                            };
                            let shift = self.nodes[&id].table.shift;
                            self.nodes.get_mut(&id).unwrap().table.shift = true;
                            self.nodes.get_mut(&id).unwrap().table.anchor = Some(anchor.clone());
                            self.table_select(
                                id,
                                Cell {
                                    row: slot.row,
                                    column,
                                },
                                row,
                            );
                            self.nodes.get_mut(&id).unwrap().table.shift = shift;
                        }
                    }
                    self.nodes.get_mut(&id).unwrap().table.select_drag =
                        Some((pid, anchor, row, origin, [*x, *y]));
                    self.table_update_auto_scroll(id, [*x, *y]);
                    self.invalidate(id, false);
                    return Ok(true);
                }
            }
            let ids = self
                .nodes
                .values()
                .filter(|n| n.table.drag.is_some() || n.table.row_drag.is_some())
                .map(|n| n.id)
                .collect::<Vec<_>>();
            for id in ids {
                if let Some((pid, col, origin, width, resize)) = self.nodes[&id].table.drag {
                    if pid == *pointer && resize {
                        let key = self.nodes[&id].table.cols[col].key.clone();
                        self.table_resize(
                            id,
                            &key,
                            width
                                + self.nodes[&id]
                                    .world
                                    .inverse()
                                    .unwrap_or_default()
                                    .point(*x, *y)
                                    .0
                                - origin,
                        )?;
                        self.invalidate(id, true);
                        return Ok(true);
                    }
                    if pid == *pointer && !resize {
                        let local = self.nodes[&id]
                            .world
                            .inverse()
                            .unwrap_or_default()
                            .point(*x, *y)
                            .0;
                        let q = props(&self.nodes[&id].props);
                        if (local - origin).abs() > 5.
                            && q.can_reorder_columns
                            && self.nodes[&id].table.cols[col].can_reorder
                        {
                            if let Some((_, edge)) = self.table_drop_target(id, *x, *y, col) {
                                let cached = self.nodes[&id]
                                    .table
                                    .drag_ghost
                                    .as_ref()
                                    .map(|(_, commands)| commands.clone());
                                let commands = if let Some(commands) = cached {
                                    commands
                                } else {
                                    let key = self.nodes[&id].table.cols[col].key.clone();
                                    let parts = self.nodes[&id]
                                        .table
                                        .header_buttons
                                        .iter()
                                        .filter(|(_, column, _)| *column == key)
                                        .map(|(node, _, _)| *node)
                                        .collect::<Vec<_>>();
                                    let mut commands = vec![
                                        crate::render::Draw::Save,
                                        crate::render::Draw::Transform {
                                            matrix: [
                                                1.,
                                                0.,
                                                0.,
                                                1.,
                                                -(self.table_column_right(id, col)
                                                    - width
                                                    - self.nodes[&id]
                                                        .table
                                                        .layout_bounds
                                                        .unwrap_or_default()
                                                        .x),
                                                0.,
                                            ],
                                        },
                                    ];
                                    for part in parts {
                                        let clip = self
                                            .nodes
                                            .get_mut(&part)
                                            .unwrap()
                                            .table
                                            .cell_clip
                                            .take();
                                        self.paint_node(part, None, &mut commands);
                                        self.nodes.get_mut(&part).unwrap().table.cell_clip = clip;
                                    }
                                    commands.push(crate::render::Draw::Restore);
                                    Arc::new(commands)
                                };
                                self.nodes.get_mut(&id).unwrap().table.drag_ghost =
                                    Some((edge, commands));
                            } else {
                                self.nodes.get_mut(&id).unwrap().table.drag_ghost = None;
                            }
                            self.invalidate(id, false);
                        }
                        return Ok(true);
                    }
                }
                if self.nodes[&id].table.row_drag.is_some() {
                    let _ = y;
                    return Ok(true);
                }
            }
        }
        if let Input::Up { x, y, pointer } = input {
            let active = self
                .nodes
                .values()
                .find(|n| {
                    n.table
                        .select_drag
                        .as_ref()
                        .is_some_and(|s| s.0 == *pointer)
                })
                .map(|n| n.id);
            if let Some(id) = active {
                self.nodes.get_mut(&id).unwrap().table.select_drag = None;
                self.nodes.get_mut(&id).unwrap().table.auto_scroll_next = None;
                self.captured = None;
                self.invalidate(id, false);
                return Ok(true);
            }
            let ids = self
                .nodes
                .values()
                .filter(|n| n.table.drag.is_some() || n.table.row_drag.is_some())
                .map(|n| n.id)
                .collect::<Vec<_>>();
            for id in ids {
                if let Some((pid, from, origin, _, resize)) =
                    self.nodes.get_mut(&id).unwrap().table.drag.take()
                {
                    if pid == *pointer {
                        self.nodes.get_mut(&id).unwrap().table.drag_ghost = None;
                        self.captured = None;
                        if !resize {
                            if (self.nodes[&id]
                                .world
                                .inverse()
                                .unwrap_or_default()
                                .point(*x, *y)
                                .0
                                - origin)
                                .abs()
                                > 5.
                            {
                                if let Some((to, _)) = self.table_drop_target(id, *x, *y, from) {
                                    self.table_reorder(id, from, to);
                                }
                            } else {
                                let key = self.nodes[&id].table.cols[from].key.clone();
                                self.table_sort(id, &key, None, self.nodes[&id].table.ctrl);
                            }
                        }
                        return Ok(true);
                    }
                }
                if let Some((pid, row, start)) =
                    self.nodes.get_mut(&id).unwrap().table.row_drag.take()
                {
                    if pid == *pointer {
                        self.captured = None;
                        if (*y - start).abs() > 5. {
                            if let Some(index) = self.table_row_at(id, *x, *y) {
                                self.table_reorder_row(id, &row, index);
                            }
                        }
                        return Ok(true);
                    }
                }
            }
        }
        if matches!(input, Input::Cancel { .. }) {
            for n in self.nodes.values_mut() {
                n.table.drag = None;
                n.table.drag_ghost = None;
                n.table.row_drag = None;
                n.table.select_drag = None;
                n.table.auto_scroll_next = None;
                n.table.touch_candidate = None;
                n.table.editor_touch = None;
            }
            return Ok(false);
        }
        if let Input::Down { x, y, pointer } = input {
            let Some(target) = self.hit(*x, *y) else {
                return Ok(false);
            };
            let Some(id) = self.table_owner(target) else {
                return Ok(false);
            };
            if !self.effective_enabled(id) {
                return Ok(false);
            }
            if self.nodes[&id]
                .table
                .menu
                .is_some_and(|menu| self.descendant_of(target, menu))
            {
                return Ok(false);
            }
            let header = self.nodes[&id].table.header_buttons.clone();
            if let Some((_, key, filter)) = header
                .iter()
                .find(|(b, _, _)| self.descendant_of(target, *b))
            {
                if *filter {
                    // OptionsButton occupies the bottom right. The source right
                    // resize strip excludes this entire lower region.
                    self.table_filter_menu(id, key)?;
                    return Ok(true);
                }
                let mut from = self.nodes[&id]
                    .table
                    .cols
                    .iter()
                    .position(|c| c.key == *key)
                    .unwrap();
                let local = self.nodes[&id]
                    .world
                    .inverse()
                    .unwrap_or_default()
                    .point(*x, *y)
                    .0;
                let edge = self.table_column_right(id, from);
                let q = props(&self.nodes[&id].props);
                let c = &self.nodes[&id].table.cols[from];
                let header_y = self.nodes[&id]
                    .world
                    .inverse()
                    .unwrap_or_default()
                    .point(*x, *y)
                    .1
                    - self.nodes[&id].table.layout_bounds.unwrap_or_default().y;
                let right = q.can_resize_columns
                    && c.can_resize
                    && (edge - local).abs() <= 4.
                    && header_y
                        < q.header_row_height
                            - if q.can_filter_columns && c.can_filter {
                                19.2
                            } else {
                                0.
                            };
                let left = from > 0
                    && q.can_resize_columns
                    && self.nodes[&id].table.cols[from - 1].can_resize
                    && local - (edge - self.nodes[&id].table.widths[from]) <= 4.;
                if left {
                    from -= 1;
                }
                let resize = left || right;
                let width = self.nodes[&id].table.widths[from];
                self.nodes.get_mut(&id).unwrap().table.drag =
                    Some((*pointer, from, local, width, resize));
                self.captured = Some((*pointer, id));
                self.focus(Some(id));
                return Ok(true);
            }
            if self.nodes[&id]
                .table
                .corner
                .is_some_and(|b| self.descendant_of(target, b))
            {
                if props(&self.nodes[&id].props).corner_button_mode
                    == TableViewCornerButtonMode::Options
                {
                    self.table_options_menu(id)?;
                } else {
                    self.table_select_all(id);
                }
                return Ok(true);
            }
            if let Some(slot) = self.table_slot(id, target) {
                if slot.role == "rowHeader"
                    && self.nodes[&slot.id].children.iter().any(|node| {
                        self.nodes[node].table.role == "detailsToggle"
                            && self.descendant_of(target, *node)
                    })
                {
                    return Ok(false);
                }
                if slot.role == "details" {
                    return Ok(false);
                }
                if self.nodes[&id]
                    .table
                    .editing
                    .as_ref()
                    .is_some_and(|c| c.row == slot.row && c.column == slot.column)
                {
                    return Ok(false);
                }
                let column = if slot.column.is_empty() {
                    self.nodes[&id]
                        .table
                        .cols
                        .first()
                        .map(|c| c.key.clone())
                        .unwrap_or_default()
                } else {
                    slot.column.clone()
                };
                let cell = Cell {
                    row: slot.row.clone(),
                    column,
                };
                if self.nodes[&id].table.editing.is_some() {
                    self.nodes.get_mut(&id).unwrap().table.last_tap =
                        Some((cell.clone(), self.time));
                    self.nodes.get_mut(&id).unwrap().table.after_commit =
                        Some((cell, slot.role == "rowHeader", false));
                    self.table_commit(id, false, None);
                    return Ok(true);
                }
                let double = self.nodes[&id]
                    .table
                    .last_tap
                    .as_ref()
                    .is_some_and(|(c, time)| c == &cell && self.time - *time < 500.);
                self.nodes.get_mut(&id).unwrap().table.last_tap = Some((cell.clone(), self.time));
                self.table_select(id, cell.clone(), slot.role == "rowHeader");
                if slot.role == "rowHeader" && props(&self.nodes[&id].props).can_reorder_rows && props(&self.nodes[&id].props).groups.is_empty() {
                    self.nodes.get_mut(&id).unwrap().table.row_drag =
                        Some((*pointer, slot.row, *y));
                    self.captured = Some((*pointer, id));
                }
                if slot.role == "cell" {
                    let q = props(&self.nodes[&id].props);
                    if let Some(c) = self.nodes[&id]
                        .table
                        .cols
                        .iter()
                        .find(|c| c.key == cell.column)
                        .cloned()
                    {
                        if matches!(
                            self.nodes[&target].kind,
                            NodeKind::CheckBox | NodeKind::ToggleSwitch
                        ) && !q.is_read_only
                            && !c.is_read_only
                        {
                            // Let the actual SDK control capture the pointer and
                            // render Pressed. Its release/keyboard event writes
                            // the binding; pointer down must not toggle data.
                            return Ok(false);
                        }
                        if self.nodes[&target].kind == NodeKind::HyperlinkButton {
                            if let Some(row) = q.items.iter().find(|r| r.id == cell.row) {
                                let uri = text(path(&row.values, &c.field));
                                if uri.starts_with("https://")
                                    || uri.starts_with("http://")
                                    || uri.starts_with("mailto:")
                                {
                                    self.table_emit(
                                        id,
                                        EventKind::Click,
                                        json!({"cell":cell,"uri":uri}),
                                    );
                                }
                                return Ok(true);
                            }
                        }
                    }
                }
                if !double && self.nodes[&id].table.row_drag.is_none() {
                    if let Some(body) = self.nodes[&id].table.body {
                        let offset = self.nodes[&body]
                            .scroll
                            .snapshot(&self.nodes[&body].props, self.time);
                        self.nodes.get_mut(&id).unwrap().table.select_scroll_origin =
                            [offset.horizontal_offset, offset.vertical_offset];
                    }
                    self.nodes.get_mut(&id).unwrap().table.select_drag = Some((
                        *pointer,
                        cell.clone(),
                        slot.role == "rowHeader",
                        [*x, *y],
                        [*x, *y],
                    ));
                    self.captured = Some((*pointer, id));
                }
                if double {
                    self.table_emit(id, EventKind::CellDoubleTapped, json!({"cell":cell}));
                    self.table_emit(id, EventKind::RowDoubleTapped, json!({"cell":cell}));
                    self.table_edit(id, cell);
                }
                return Ok(true);
            }
        }
        if let Input::KeyDown { key, .. } = input {
            if let Some(id) = self
                .focused
                .and_then(|f| self.table_owner(f))
                .filter(|id| self.effective_enabled(*id))
            {
                let focus = self.focused.unwrap();
                if self.nodes[&focus].table.role=="groupToggle" {return Ok(false);}
                if key == "Enter"
                    && self.nodes[&id].table.filter_search == Some(focus)
                    && !self.nodes[&focus].props.text.is_empty()
                {
                    if let Some(button) = self
                        .nodes
                        .values()
                        .find(|n| {
                            n.props.layout_key == "table-filter-apply"
                                && self.table_owner(n.id) == Some(id)
                        })
                        .map(|n| n.id)
                    {
                        self.emit(button, EventKind::Click);
                        self.pump_table_events();
                        return Ok(true);
                    }
                }
                if self.nodes[&id].table.menu.is_some_and(|menu| {
                    self.nodes.get(&menu).is_some_and(|m| m.props.is_open)
                        && self.descendant_of(focus, menu)
                }) || self
                    .background_scroll_root()
                    .is_some_and(|root| self.table_owner(root) == Some(id))
                {
                    return Ok(false);
                }
                if self.nodes[&id].table.editing.is_some() {
                    if key == "Escape" {
                        self.table_commit(id, true, None);
                        return Ok(true);
                    }
                    if key == "Enter" || key == "Tab" {
                        if let Some((cell, _, _)) = self.table_next_cell(id, key == "Enter", true) {
                            self.nodes.get_mut(&id).unwrap().table.after_commit =
                                Some((cell, false, true));
                        }
                        self.table_commit(id, false, None);
                        return Ok(true);
                    }
                    return Ok(false);
                }
                let q = props(&self.nodes[&id].props);
                let ctrl = self.nodes[&id].table.ctrl;
                let shift = self.nodes[&id].table.shift;
                if key == "ContextMenu" {
                    self.table_context(id, None);
                    return Ok(true);
                }
                if ctrl && key.eq_ignore_ascii_case("a") {
                    if shift {
                        self.table_deselect(id);
                        self.table_changed(id, false);
                    } else {
                        self.table_select_all(id);
                    }
                    return Ok(true);
                }
                if ctrl && key.eq_ignore_ascii_case("c") {
                    self.table_export(id, true, shift, true, None);
                    return Ok(true);
                }
                if key == "Enter" || key == "Tab" {
                    if let Some((cell, _, _)) = self.table_next_cell(id, key == "Enter", false) {
                        let modifiers = (self.nodes[&id].table.ctrl, self.nodes[&id].table.shift);
                        {
                            let s = &mut self.nodes.get_mut(&id).unwrap().table;
                            s.ctrl = false;
                            s.shift = false;
                        }
                        self.table_continue_selection(id, cell, false, false);
                        let s = &mut self.nodes.get_mut(&id).unwrap().table;
                        s.ctrl = modifiers.0;
                        s.shift = modifiers.1;
                    }
                    return Ok(true);
                }
                if key == "F2" {
                    if let Some(cell) = q.current_cell {
                        self.table_edit(id, cell);
                    }
                    return Ok(true);
                }
                if [
                    "ArrowDown",
                    "ArrowUp",
                    "ArrowLeft",
                    "ArrowRight",
                    "Home",
                    "End",
                    "PageDown",
                    "PageUp",
                ]
                .contains(&key.as_str())
                {
                    let s = &self.nodes[&id].table;
                    if s.order.is_empty() || s.cols.is_empty() {
                        return Ok(true);
                    }
                    let row = q
                        .current_cell
                        .as_ref()
                        .and_then(|c| s.order.iter().position(|&i| q.items[i].id == c.row))
                        .unwrap_or(0);
                    let col = q
                        .current_cell
                        .as_ref()
                        .and_then(|c| s.cols.iter().position(|s| s.key == c.column))
                        .unwrap_or(0);
                    let last = s.order.len() - 1;
                    let last_col = s.cols.len() - 1;
                    let page = s
                        .body
                        .map(|b| {
                            (self.nodes[&b].rect.height / q.row_height).floor().max(1.) as usize
                        })
                        .unwrap_or(1);
                    let row = match key.as_str() {
                        "ArrowDown" => (row + 1).min(last),
                        "ArrowUp" => row.saturating_sub(1),
                        "PageDown" => (row + page).min(last),
                        "PageUp" => row.saturating_sub(page),
                        "Home" if ctrl => 0,
                        "End" if ctrl => last,
                        _ => row,
                    };
                    let col = match key.as_str() {
                        "ArrowLeft" => col.saturating_sub(1),
                        "ArrowRight" => (col + 1).min(last_col),
                        "Home" => 0,
                        "End" => last_col,
                        _ => col,
                    };
                    let cell = Cell {
                        row: q.items[s.order[row]].id.clone(),
                        column: s.cols[col].key.clone(),
                    };
                    self.table_select(id, cell.clone(), false);
                    self.table_bring_cell(id, row, col);
                    return Ok(true);
                }
            }
        }
        Ok(false)
    }
    fn table_context(&mut self, id: u32, target: Option<u32>) {
        let slot = target.and_then(|t| self.table_slot(id, t)).or_else(|| {
            let q = props(&self.nodes[&id].props);
            self.nodes[&id]
                .table
                .slots
                .iter()
                .find(|s| {
                    q.current_cell
                        .as_ref()
                        .is_some_and(|c| c.row == s.row && c.column == s.column)
                })
                .cloned()
        });
        if let Some(slot) = slot {
            let column = if slot.column.is_empty() {
                self.nodes[&id]
                    .table
                    .cols
                    .first()
                    .map(|c| c.key.clone())
                    .unwrap_or_default()
            } else {
                slot.column.clone()
            };
            let cell = Cell {
                row: slot.row,
                column,
            };
            if props(&self.nodes[&id].props).force_row_or_cell_selection_on_context_requested {
                self.table_select(id, cell.clone(), slot.role == "rowHeader");
            }
            self.table_request(
                id,
                EventKind::ContextRequested,
                "context",
                json!({"cell":cell,"target":slot.id,"row":slot.role=="rowHeader"}),
            );
        }
    }
    fn table_select_all(&mut self, id: u32) {
        let q = props(&self.nodes[&id].props);
        if matches!(
            q.selection_mode,
            ListViewSelectionMode::None | ListViewSelectionMode::Single
        ) {
            return;
        }
        let s = &self.nodes[&id].table;
        let keys = s
            .order
            .iter()
            .map(|&i| q.items[i].id.clone())
            .collect::<Vec<_>>();
        let cols = s.cols.clone();
        let t = self
            .nodes
            .get_mut(&id)
            .unwrap()
            .props
            .table
            .as_mut()
            .unwrap();
        if t.selection_unit == TableViewSelectionUnit::Cell {
            t.selected_cells = keys
                .iter()
                .flat_map(|row| {
                    cols.iter().map(move |c| Cell {
                        row: row.clone(),
                        column: c.key.clone(),
                    })
                })
                .collect();
        } else {
            t.selected_keys = keys;
        }
        self.table_emit(id, EventKind::SelectionChanged, json!({}));
        self.table_changed(id, false);
    }
    fn table_sort(&mut self, id: u32, column: &str, direction: Option<&Value>, additive: bool) {
        let q = props(&self.nodes[&id].props);
        if !q.can_sort_columns
            || !self.nodes[&id]
                .table
                .cols
                .iter()
                .any(|c| c.key == column && c.can_sort)
        {
            return;
        }
        let direction = direction.cloned().unwrap_or_else(|| {
            match q
                .sorts
                .iter()
                .find(|s| s.column == column)
                .map(|s| s.direction)
            {
                None => q.groups.iter().find(|g|g.column==column).map(|g|json!(if g.direction==TableViewSortDirection::Ascending {TableViewSortDirection::Descending}else{TableViewSortDirection::Ascending})).unwrap_or(json!(TableViewSortDirection::Ascending)),
                Some(TableViewSortDirection::Ascending) => {
                    json!(TableViewSortDirection::Descending)
                }
                Some(TableViewSortDirection::Descending) => Value::Null,
            }
        });
        self.table_request(
            id,
            EventKind::Sorting,
            "sort",
            json!({"column":column,"direction":direction,"additive":additive}),
        );
    }
    fn table_reorder(&mut self, id: u32, from: usize, to: usize) {
        let q = props(&self.nodes[&id].props);
        let cols = &self.nodes[&id].table.cols;
        if from >= cols.len()
            || to >= cols.len()
            || from == to
            || !q.can_reorder_columns
            || !cols[from].can_reorder
        {
            return;
        }
        self.table_request(
            id,
            EventKind::ColumnReordering,
            "reorder",
            json!({"from":from,"to":to,"column":cols[from].key}),
        );
    }
    fn table_resize(&mut self, id: u32, key: &str, width: f64) -> Result<(), String> {
        if !width.is_finite() {
            return Err("Invalid width".into());
        }
        let q = props(&self.nodes[&id].props);
        if !q.can_resize_columns {
            return Ok(());
        }
        let mut cols = all_columns(&q);
        if let Some(c) = cols.iter_mut().find(|c| c.key == key && c.can_resize) {
            c.width = GridTrack {
                unit: GridUnit::Pixel,
                value: width.clamp(c.min_width, c.max_width),
            };
            let q = self
                .nodes
                .get_mut(&id)
                .unwrap()
                .props
                .table
                .as_mut()
                .unwrap();
            q.columns = cols;
            q.auto_generate_columns = false;
            self.table_changed(id, false);
        }
        Ok(())
    }
    fn table_reorder_row(&mut self, id: u32, row: &str, index: usize) {
        let q = props(&self.nodes[&id].props);
        if !q.can_reorder_rows
            || !q.groups.is_empty()
            || !q.sorts.is_empty()
            || !q.filters.is_empty()
            || !q.search.is_empty()
        {
            return;
        }
        let mut rows = (*q.items).clone();
        if let Some(from) = rows.iter().position(|r| r.id == row) {
            let r = rows.remove(from);
            rows.insert(index.min(rows.len()), r);
            self.nodes
                .get_mut(&id)
                .unwrap()
                .props
                .table
                .as_mut()
                .unwrap()
                .items = Arc::new(rows);
            self.table_changed(id, true);
        }
    }
    fn table_column_right(&self, id: u32, column: usize) -> f64 {
        let q = props(&self.nodes[&id].props);
        let s = &self.nodes[&id].table;
        let header = s
            .header_buttons
            .first()
            .and_then(|(node, _, _)| self.nodes.get(node))
            .and_then(|n| n.props.canvas_left)
            .unwrap_or(0.);
        let offset = s
            .body
            .map(|b| {
                self.nodes[&b]
                    .scroll
                    .snapshot(&self.nodes[&b].props, self.time)
                    .horizontal_offset
            })
            .unwrap_or(0.);
        s.layout_bounds.unwrap_or_default().x
            + header
            + s.widths.iter().take(column + 1).map(|w|(w*self.dpr).round()/self.dpr).sum::<f64>()
            - if column < q.frozen_column_count {
                0.
            } else {
                offset
            }
    }
    fn table_column_at(&self, id: u32, x: f64, y: f64) -> Option<usize> {
        if !self.inside(self.nodes[&id].table.header?, x, y) {
            return None;
        }
        let x = self.nodes[&id].world.inverse()?.point(x, y).0;
        (0..self.nodes[&id].table.cols.len()).find(|&c| x < self.table_column_right(id, c))
    }
    fn table_drop_target(&self, id: u32, x: f64, y: f64, from: usize) -> Option<(usize, f64)> {
        // TableViewHeaderRow.ShowColumnDropIndicator/ColumnDropCompleted use
        // the target header's midpoint, then compensate for the removed source.
        let col = self.table_column_at(id, x, y)?;
        let s = &self.nodes[&id].table;
        let x = self.nodes[&id].world.inverse()?.point(x, y).0;
        let right = self.table_column_right(id, col);
        let left = right - (s.widths[col]*self.dpr).round()/self.dpr;
        if x < left {
            return None;
        }
        let before = x < (left + right) / 2.;
        let insertion = col + usize::from(!before);
        let to = if from < insertion {
            insertion.saturating_sub(1)
        } else {
            insertion
        }
        .min(s.cols.len() - 1);
        Some((to, if before { left } else { right }))
    }
    fn table_row_at(&self, id: u32, x: f64, y: f64) -> Option<usize> {
        let s = &self.nodes[&id].table;
        let body = s.body?;
        if !self.inside(body, x, y) {
            return None;
        }
        let (_, y) = self.nodes[&body].world.inverse()?.point(x, y);
        let y = y + self.nodes[&body]
            .scroll
            .snapshot(&self.nodes[&body].props, self.time)
            .vertical_offset;
        let index = s
            .row_offsets
            .partition_point(|v| *v <= y)
            .saturating_sub(1)
            .min(s.order.len().saturating_sub(1));
        let q=props(&self.nodes[&id].props);
        let row=*s.order.get(index)?;
        let row_end=s.row_offsets[index]+q.row_height+if grouping::details(&q,&q.items[row]){q.row_details_height}else{0.};
        if y<s.row_offsets[index] || y>=row_end {return None;}
        Some(row)
    }
    pub(in crate::scene) fn table_scroll_target(
        &self,
        body: u32,
        target: u32,
    ) -> Option<(u32, bool, f64)> {
        let owner = self.table_owner(target)?;
        let s = &self.nodes[&owner].table;
        if s.body != Some(body) {
            return None;
        }
        let slot = self.table_slot(owner, target)?;
        if !matches!(slot.role.as_str(),"cell"|"rowHeader") {return None;}
        let q = props(&self.nodes[&owner].props);
        let frozen = slot.role != "cell"
            || s.cols
                .iter()
                .position(|c| c.key == slot.column)
                .is_some_and(|col| col < q.frozen_column_count);
        let header = s
            .corner
            .and_then(|corner| self.nodes[&corner].props.width)
            .unwrap_or(0.);
        Some((
            slot.id,
            frozen,
            header + s.widths.iter().take(q.frozen_column_count).map(|w|(w*self.dpr).round()/self.dpr).sum::<f64>(),
        ))
    }
    fn table_bring_cell(&mut self, id: u32, row: usize, col: usize) {
        let s = &self.nodes[&id].table;
        let Some(body) = s.body else {
            return;
        };
        let snap = self.nodes[&body]
            .scroll
            .snapshot(&self.nodes[&body].props, self.time);
        let q = props(&self.nodes[&id].props);
        let y = s.row_offsets[row];
        let bottom = y + q.row_height;
        let y = if y < snap.vertical_offset {
            y
        } else if bottom > snap.vertical_offset + snap.viewport_height {
            bottom - snap.viewport_height
        } else {
            snap.vertical_offset
        };
        let header = s
            .corner
            .and_then(|corner| self.nodes[&corner].props.width)
            .unwrap_or(0.);
        // Reveal uses the same physical-pixel widths as Arrange. Summing the
        // unrounded property values shifts a boundary again on every Enter.
        let widths=s.widths.iter().map(|w|(w*self.dpr).round()/self.dpr).collect::<Vec<_>>();
        let start = widths.iter().take(col).sum::<f64>() + header;
        let end = start + widths[col];
        let frozen_left = header + widths.iter().take(q.frozen_column_count).sum::<f64>();
        let x = if col < q.frozen_column_count {
            snap.horizontal_offset
        } else if start < snap.horizontal_offset + frozen_left {
            (start - frozen_left).max(0.)
        } else if end > snap.horizontal_offset + snap.viewport_width {
            end - snap.viewport_width
        } else {
            snap.horizontal_offset
        };
        let _ = self.input(
            Input::Scroll {
                id: body,
                x: Some(x),
                y: Some(y),
                zoom: None,
                animated: false,
            },
            self.time,
        );
    }
    fn table_paste(&mut self, id: u32, content: &str) -> Result<(), String> {
        let q = props(&self.nodes[&id].props);
        if !q.can_paste || q.is_read_only {
            return Ok(());
        }
        let Some(cell) = q.current_cell else {
            return Ok(());
        };
        let s = &self.nodes[&id].table;
        let Some(row) = s.order.iter().position(|&i| q.items[i].id == cell.row) else {
            return Ok(());
        };
        let Some(col) = s.cols.iter().position(|c| c.key == cell.column) else {
            return Ok(());
        };
        let mut changes = vec![];
        for (ri, fields) in parse_clipboard(content)?.into_iter().enumerate() {
            let Some(&index) = s.order.get(row + ri) else {
                break;
            };
            for (ci, value) in fields.into_iter().enumerate() {
                let Some(c) = s.cols.get(col + ci) else { break };
                if !c.is_read_only && !c.field.is_empty() {
                    changes.push((index, c.clone(), converted_value(c.kind, json!(value))?));
                }
            }
        }
        let mut rows = (*q.items).clone();
        for (index, col, value) in changes {
            write_cell(&mut rows[index], &col, value)?;
        }
        self.nodes
            .get_mut(&id)
            .unwrap()
            .props
            .table
            .as_mut()
            .unwrap()
            .items = Arc::new(rows);
        self.table_changed(id, true);
        Ok(())
    }
    fn table_options_menu(&mut self, id: u32) -> Result<(), String> {
        let q = props(&self.nodes[&id].props);
        let editing = self.nodes[&id].table.editing.is_some();
        let selected = !q.selected_keys.is_empty() || !q.selected_cells.is_empty();
        let copyable = q.can_copy && (selected || q.current_cell.is_some());
        let icon = crate::icons::symbol_glyph;
        // TableViewHeaderRow.xaml and its StandardUICommands define the icon
        // column, separators, shortcuts, visibility and CanExecute conditions.
        let mut items = vec![
            json!({"id":"selectAll","text":"Select All","icon":icon(Symbol::SelectAll),"enabled":!editing && matches!(q.selection_mode,ListViewSelectionMode::Multiple|ListViewSelectionMode::Extended),"keyboardAccelerators":[{"key":"A","modifiers":["Control"]}]}),
            json!({"id":"clearSelection","text":"Deselect All","icon":icon(Symbol::ClearSelection),"enabled":!editing && selected,"keyboardAccelerators":[{"key":"A","modifiers":["Control","Shift"]}]}),
            json!({"id":"selectionSeparator","kind":"Separator"}),
            json!({"id":"copy","text":"Copy","icon":icon(Symbol::Copy),"enabled":copyable,"keyboardAccelerators":[{"key":"C","modifiers":["Control"]}]}),
            json!({"id":"paste","text":"Paste","icon":icon(Symbol::Paste),"enabled":q.can_paste && !editing && !q.is_read_only,"keyboardAccelerators":[{"key":"V","modifiers":["Control"]}]}),
            json!({"id":"copyWithHeaders","text":"Copy with Headers","enabled":copyable,"keyboardAccelerators":[{"key":"C","modifiers":["Control","Shift"]}]}),
            json!({"id":"copySeparator","kind":"Separator"}),
            json!({"id":"clearSorting","text":"Clear Sorting","enabled":!editing && !q.sorts.is_empty()}),
            json!({"id":"clearFilters","text":"Clear Filter","enabled":!editing && !q.filters.is_empty()}),
        ];
        if q.can_group_columns { items.push(json!({"id":"ungroupAll","text":"Ungroup All","enabled":!editing&&!q.groups.is_empty()})); }
        if q.show_export_options {
            items.extend([
                json!({"id":"exportSeparator","kind":"Separator"}),
                json!({"id":"export","text":"Export All to CSV","icon":"\u{ede1}"}),
                json!({"id":"exportSelected","text":"Export Selected to CSV","icon":"\u{ede1}","enabled":!editing && (selected || q.current_cell.is_some())}),
            ]);
        }
        if let Some(menu) = self.nodes[&id].table.menu {
            let _ = self.destroy(menu);
        }
        let menu=self.create(id,NodeKind::MenuFlyout,json!({"menuItems":items,"isOpen":true,"placementTarget":self.nodes[&id].table.corner,"placement":"BottomEdgeAlignedLeft"}))?;
        let state = &mut self.nodes.get_mut(&id).unwrap().table;
        state.menu = Some(menu);
        state.menu_column = None;
        state.filter_search = None;
        state.filter_list = None;
        state.filter_all = None;
        state.filter_entries.clear();
        state.filter_selected.clear();
        Ok(())
    }
    fn sync_table_filter(&mut self, id: u32) {
        let Some(list) = self.nodes[&id]
            .table
            .filter_list
            .filter(|list| self.nodes.contains_key(list))
        else {
            return;
        };
        let selected = self.nodes[&id].table.filter_selected.clone();
        let realized = self.nodes[&list].collection.realized.clone();
        for (key, slot) in realized {
            if !self.nodes.contains_key(&slot) {
                continue;
            }
            let label = self.nodes[&id]
                .table
                .filter_entries
                .iter()
                .find(|(id, _, _)| *id == key)
                .map(|(_, _, text)| text.clone())
                .unwrap_or_default();
            self.prepare_table_filter_item(list, slot, &key, &label);
        }
        if let Some(all) = self.nodes[&id]
            .table
            .filter_all
            .filter(|all| self.nodes.contains_key(all))
        {
            let items = &self.nodes[&list].props.collection_items;
            let value = if items.iter().all(|item| selected.contains(&item.id)) {
                Some(true)
            } else if items.iter().all(|item| !selected.contains(&item.id)) {
                Some(false)
            } else {
                None
            };
            self.nodes.get_mut(&all).unwrap().props.is_checked = value;
        }
    }
    pub(in crate::scene) fn prepare_table_filter_item(
        &mut self, list: u32, slot: u32, key: &str, label: &str,
    ) {
        let Some(owner) = self.nodes[&list].table.owner
            .filter(|owner| self.nodes[owner].table.filter_list == Some(list)) else { return; };
        let checked = self.nodes[&owner].table.filter_selected.contains(key);
        let checkbox = self.nodes[&slot]
            .children.first().copied().unwrap_or_else(|| {
                self.table_part(slot, NodeKind::CheckBox,
                    json!({"horizontalAlignment":"Stretch","minWidth":0}))
            });
        let p = &mut self.nodes.get_mut(&checkbox).unwrap().props;
        p.text = label.into();
        p.is_checked = Some(checked);
        p.layout_key = format!("table-filter-value:{key}");
        // Match the source ItemContainerStyle instead of ListView's
        // default 40px minimum and 16px left padding.
        let p = &mut self.nodes.get_mut(&slot).unwrap().props;
        p.padding = [12., 0., 12., 0.];
        p.min_height = 36.;
        p.height = Some(36.);
    }
    fn table_filter_menu(&mut self, id: u32, key: &str) -> Result<(), String> {
        let q = props(&self.nodes[&id].props);
        let Some(col) = self.nodes[&id]
            .table
            .cols
            .iter()
            .find(|c| c.key == key)
            .cloned()
        else {
            return Ok(());
        };
        if !q.can_filter_columns || !col.can_filter {
            return Ok(());
        }
        if let Some(menu) = self.nodes[&id].table.menu {
            let _ = self.destroy(menu);
        }
        let anchor = self.nodes[&id]
            .table
            .header_buttons
            .iter()
            .find(|(_, k, filter)| k == key && *filter)
            .map(|s| s.0);
        let menu = self.create(
            id,
            NodeKind::Flyout,
            json!({"isOpen":true,"placementTarget":anchor,"placement":"Bottom"}),
        )?;
        self.nodes.get_mut(&menu).unwrap().props.padding = [0., 2., 0., 2.];
        let panel = self.table_part(menu, NodeKind::StackPanel, json!({"width":266,"spacing":0}));
        let current_sort = q.sorts.iter().find(|sort| sort.column == key);
        let grouped=q.groups.iter().find(|g|g.column==key);
        for (action,label,icon,enabled) in [
            ("group",if grouped.is_some(){"Ungroup"}else{"Group"},"\u{f168}",q.can_group_columns&&col.can_group),
            ("group-count",if grouped.is_some_and(|g|g.sort_mode==TableViewGroupSortMode::Count){"Sort Groups by Value"}else{"Sort Groups by Count"},"\u{e9d9}",grouped.is_some())] {
            let item=self.table_part(panel,NodeKind::Button,json!({"text":label,"source":icon,"height":32,"padding":[43,4,11,5],"horizontalAlignment":"Stretch","horizontalContentAlignment":"Left","enabled":enabled,"layoutKey":format!("table-filter-{action}")}));
            self.nodes.get_mut(&item).unwrap().table.owner=Some(id);
            self.nodes.get_mut(&item).unwrap().table.role="filterMenuItem".into();
        }
        self.table_part(panel,NodeKind::Border,json!({"height":1,"margin":[12,4,12,4],"background":{"resource":"DividerStrokeColorDefaultBrush"}}));
        for (action, label, icon, enabled) in [
            (
                "asc",
                "Sort Ascending",
                "\u{f0ad}",
                q.can_sort_columns
                    && col.can_sort
                    && current_sort
                        .is_none_or(|s| s.direction != TableViewSortDirection::Ascending),
            ),
            (
                "desc",
                "Sort Descending",
                "\u{f0ae}",
                q.can_sort_columns
                    && col.can_sort
                    && current_sort
                        .is_none_or(|s| s.direction != TableViewSortDirection::Descending),
            ),
            ("unsort", "Clear Sorting", "", current_sort.is_some() && grouped.is_none()),
        ] {
            let item=self.table_part(panel,NodeKind::Button,json!({"text":label,"source":icon,"height":32,"padding":[43,4,11,5],"horizontalAlignment":"Stretch","horizontalContentAlignment":"Left","enabled":enabled,"layoutKey":format!("table-filter-{action}")}));
            self.nodes.get_mut(&item).unwrap().table.owner = Some(id);
            self.nodes.get_mut(&item).unwrap().table.role = "filterMenuItem".into();
        }
        self.table_part(panel,NodeKind::Border,json!({"height":0.8,"margin":[0,1.6,0,0.8],"background":{"resource":"MenuFlyoutSeparatorBackground"}}));
        let clear=self.table_part(panel,NodeKind::Button,json!({"text":"Clear Filter","height":32,"padding":[43,4,11,5],"horizontalAlignment":"Stretch","horizontalContentAlignment":"Left","enabled":q.filters.iter().any(|f|f.column==key),"layoutKey":"table-filter-clear"}));
        self.nodes.get_mut(&clear).unwrap().table.owner = Some(id);
        self.nodes.get_mut(&clear).unwrap().table.role = "filterMenuItem".into();
        let content=self.table_part(panel,NodeKind::Grid,json!({"width":250,"height":300,"margin":[8,4,8,4],"rows":[{"unit":"Auto","value":1},{"unit":"Auto","value":1},{"unit":"Star","value":1}]}));
        let search = self.table_part(
            content,
            NodeKind::TextBox,
            json!({"placeholderText":"Search...","accessibleName":"Search filter values","row":0}),
        );
        let all_border=self.table_part(content,NodeKind::Border,json!({"row":1,"borderThickness":[0,0,0,1],"borderBrush":{"resource":"MenuFlyoutSeparatorBackground"}}));
        let all = self.table_part(
            all_border,
            NodeKind::CheckBox,
            json!({"text":"(Select All)","margin":[12,8,12,1],"layoutKey":"table-filter-all"}),
        );
        let mut values = BTreeMap::<String, (Value, usize)>::new();
        let mut context = q.clone();
        context.filters.retain(|filter| filter.column != key);
        for index in view(&context, &self.nodes[&id].table.cols) {
            let row = &q.items[index];
            let value = operation(row, &col);
            let value = if value.as_str().is_some_and(|value| value.trim().is_empty()) {
                Value::Null
            } else {
                value.clone()
            };
            let entry = values.entry(value_key(&value)).or_insert((value, 0));
            entry.1 += 1;
        }
        let active = q
            .filters
            .iter()
            .find(|f| f.column == key)
            .and_then(|f| f.values.as_ref())
            .map(|values| values.iter().map(value_key).collect::<HashSet<_>>());
        let mut entries = vec![];
        let mut selected = vec![];
        let mut values = values.into_iter().collect::<Vec<_>>();
        values.sort_by(|(_, (a, ac)), (_, (b, bc))| {
            if a.is_null() || b.is_null() {
                return b.is_null().cmp(&a.is_null());
            }
            let count = if q.show_filter_items_count {
                bc.cmp(ac)
            } else {
                std::cmp::Ordering::Equal
            };
            count.then_with(|| match (a, b) {
                (Value::Number(a), Value::Number(b)) => {
                    a.as_f64().unwrap().total_cmp(&b.as_f64().unwrap())
                }
                (Value::Bool(a), Value::Bool(b)) => a.cmp(b),
                _ => text(a).cmp(&text(b)),
            })
        });
        for (key, (value, count)) in values {
            let checked = active.as_ref().is_none_or(|values| values.contains(&key));
            let label = if q.show_filter_items_count {
                format!(
                    "{} ({count})",
                    if value.is_null() {
                        "(Blank)".into()
                    } else {
                        text(&value)
                    }
                )
            } else {
                if value.is_null() {
                    "(Blank)".into()
                } else {
                    text(&value)
                }
            };
            if checked {
                selected.push(key.clone());
            }
            entries.push((key, value, label));
        }
        let list=self.table_part(content,NodeKind::ListView,json!({"row":2,"width":250,"itemHeight":36,"selectionMode":"None","hasItemTemplate":true,"accessibleName":"Filter values","collectionItems":entries.iter().map(|(id,_,label)|json!({"id":id,"text":label,"enabled":true})).collect::<Vec<_>>()}));
        self.nodes.get_mut(&list).unwrap().table.owner=Some(id);
        let buttons=self.table_part(panel,NodeKind::Grid,json!({"margin":[12,4,12,4],"columnSpacing":16,"columns":[{"unit":"Star","value":1},{"unit":"Star","value":1}]}));
        self.table_part(buttons,NodeKind::Button,json!({"text":"Ok","column":0,"horizontalAlignment":"Stretch","variant":"Accent","layoutKey":"table-filter-apply"}));
        self.table_part(buttons,NodeKind::Button,json!({"text":"Cancel","column":1,"horizontalAlignment":"Stretch","layoutKey":"table-filter-cancel"}));
        let s = &mut self.nodes.get_mut(&id).unwrap().table;
        s.menu = Some(menu);
        s.menu_column = Some(key.into());
        s.filter_search = Some(search);
        s.filter_list = Some(list);
        s.filter_entries = entries;
        s.filter_selected = selected.into_iter().collect();
        s.filter_all = Some(all);
        self.focus(Some(search));
        self.invalidate(id, true);
        Ok(())
    }
    pub(in crate::scene) fn pump_table_events(&mut self) {
        let relevant = self
            .events
            .iter()
            .enumerate()
            .filter(|(_, e)| self.table_owner(e.target).is_some_and(|id| id != e.target))
            .map(|(i, _)| i)
            .collect::<Vec<_>>();
        let events = relevant
            .into_iter()
            .filter_map(|index| {
                let e = &mut self.events[index];
                let payload = e.payload.get_or_insert_with(|| json!({}));
                if payload.get("_tableProcessed").is_some() {
                    None
                } else {
                    payload["_tableProcessed"] = json!(true);
                    Some(e.clone())
                }
            })
            .collect::<Vec<_>>();
        for e in events {
            let Some(id) = self.table_owner(e.target) else {
                continue;
            };
            if e.target == id {
                continue;
            }
            if matches!(e.kind, EventKind::Checked | EventKind::Unchecked | EventKind::Indeterminate | EventKind::Toggled) {
                if let Some(slot) = self.table_slot(id, e.target).filter(|slot|slot.role=="cell"&&!slot.editing) {
                    let q=props(&self.nodes[&id].props);
                    if let Some(column)=self.nodes[&id].table.cols.iter().find(|c|c.key==slot.column) {
                        // Only the generated boolean element owns this binding.
                        // CheckBoxes inside caller templates remain caller-owned;
                        // an active editor retains its cancellable commit flow.
                        let generated=self.nodes[&slot.id].children.first()==Some(&e.target);
                        let value=match (column.kind,e.kind) {
                            (TableViewColumnKind::CheckBox,EventKind::Checked|EventKind::Unchecked|EventKind::Indeterminate)=>e.is_checked.map(|v|json!(v)),
                            (TableViewColumnKind::ToggleSwitch,EventKind::Toggled)=>e.is_on.map(|v|json!(v)),
                            _=>None,
                        };
                        if generated&&!q.is_read_only&&!column.is_read_only&&!column.field.is_empty()
                            &&q.items.iter().any(|row|row.id==slot.row) {
                            if let Some(value)=value {
                                let cell=Cell{row:slot.row,column:slot.column};
                                self.table_set_value(id,&cell,value).expect("validated generated boolean binding");
                                self.table_changed(id,true);
                            }
                        }
                    }
                }
            }
            if e.kind == EventKind::RealizationChanged {
                self.sync_table_filter(id);
            }
            if e.kind == EventKind::Opened && self.nodes[&id].table.menu == Some(e.target) {
                if let Some(search) = self.nodes[&id].table.filter_search {
                    self.focus(Some(search));
                }
            }
            if e.kind == EventKind::Closing && self.nodes[&id].table.menu == Some(e.target) {
                if let Some(request) = e.request_id {
                    let _ = self.resolve_overlay_close(e.target, request, false);
                }
            }
            if e.kind == EventKind::Click
                && self
                    .nodes
                    .get(&e.target)
                    .is_some_and(|n| n.table.role == "detailsToggle")
            {
                let row = self.nodes[&e.target].table.row_key.clone();
                let q = self
                    .nodes
                    .get_mut(&id)
                    .unwrap()
                    .props
                    .table
                    .as_mut()
                    .unwrap();
                if q.expanded_rows.contains(&row) {
                    q.expanded_rows.retain(|key| *key != row);
                } else {
                    q.expanded_rows.push(row);
                }
                self.table_changed(id, false);
            }
            if e.kind == EventKind::Click && self.nodes.get(&e.target).is_some_and(|n|n.table.role=="groupToggle") {
                let key=self.nodes[&e.target].table.row_key.clone();
                self.table_expand_group(id,&json!({"id":key}),None);
            }
            if e.kind == EventKind::Click {
                let role = self
                    .nodes
                    .get(&e.target)
                    .map(|n| n.props.layout_key.clone())
                    .unwrap_or_default();
                if role.starts_with("table-filter-") {
                    match role.as_str() {
                        "table-filter-group" | "table-filter-group-count" | "table-filter-ungroup-all" => {
                            let key=self.nodes[&id].table.menu_column.clone().unwrap_or_default();
                            if let Some(menu)=self.nodes[&id].table.menu {self.nodes.get_mut(&menu).unwrap().props.is_open=false;}
                            if role=="table-filter-group" {
                                if self.nodes[&id].props.table.as_ref().unwrap().groups.iter().any(|g|g.column==key){self.table_ungroup(id,Some(&key));}
                                else {self.table_group_column(id,&key);}
                            } else if role=="table-filter-ungroup-all" {self.table_ungroup(id,None);}
                            else {
                                let q=self.nodes.get_mut(&id).unwrap().props.table.as_mut().unwrap();
                                if let Some(g)=q.groups.iter_mut().find(|g|g.column==key){g.sort_mode=if g.sort_mode==TableViewGroupSortMode::Key{TableViewGroupSortMode::Count}else{TableViewGroupSortMode::Key};}
                                self.table_changed(id,false);
                            }
                        }
                        "table-filter-cancel" => {
                            if let Some(menu) = self.nodes[&id].table.menu {
                                self.nodes.get_mut(&menu).unwrap().props.is_open = false;
                            }
                        }
                        "table-filter-asc" | "table-filter-desc" | "table-filter-unsort" => {
                            let column = self.nodes[&id]
                                .table
                                .menu_column
                                .clone()
                                .unwrap_or_default();
                            let direction = if role.ends_with("asc") {
                                json!(TableViewSortDirection::Ascending)
                            } else if role.ends_with("desc") {
                                json!(TableViewSortDirection::Descending)
                            } else {
                                Value::Null
                            };
                            self.table_sort(id, &column, Some(&direction), false);
                            if let Some(menu) = self.nodes[&id].table.menu {
                                self.nodes.get_mut(&menu).unwrap().props.is_open = false;
                            }
                        }
                        "table-filter-apply" | "table-filter-clear" => {
                            let key = self.nodes[&id]
                                .table
                                .menu_column
                                .clone()
                                .unwrap_or_default();
                            let visible = self.nodes[&id]
                                .table
                                .filter_list
                                .and_then(|list| self.nodes.get(&list))
                                .map(|list| {
                                    list.props
                                        .collection_items
                                        .iter()
                                        .map(|item| item.id.clone())
                                        .collect::<HashSet<_>>()
                                })
                                .unwrap_or_default();
                            let values = self.nodes[&id]
                                .table
                                .filter_entries
                                .iter()
                                .filter(|(key, _, _)| {
                                    visible.contains(key)
                                        && self.nodes[&id].table.filter_selected.contains(key)
                                })
                                .map(|(_, value, _)| value.clone())
                                .collect::<Vec<_>>();
                            let search = self.nodes[&id]
                                .table
                                .filter_search
                                .and_then(|search| self.nodes.get(&search))
                                .map(|n| !n.props.text.is_empty())
                                .unwrap_or(false);
                            let should_apply = role.ends_with("apply")
                                && (search || values.len() != visible.len());
                            if should_apply {
                                self.table_deselect(id);
                            }
                            let q = self
                                .nodes
                                .get_mut(&id)
                                .unwrap()
                                .props
                                .table
                                .as_mut()
                                .unwrap();
                            q.filters.retain(|f| f.column != key);
                            if should_apply {
                                q.filters.push(Filter {
                                    column: key,
                                    values: Some(values),
                                    search: String::new(),
                                });
                            }
                            if let Some(menu) = self.nodes[&id].table.menu {
                                if let Some(n) = self.nodes.get_mut(&menu) {
                                    n.props.is_open = false;
                                }
                            }
                            self.table_changed(id, false);
                        }
                        _ => {}
                    }
                }
            }
            if matches!(
                e.kind,
                EventKind::Checked | EventKind::Unchecked | EventKind::Indeterminate
            ) {
                let role = self
                    .nodes
                    .get(&e.target)
                    .map(|n| n.props.layout_key.clone())
                    .unwrap_or_default();
                if role == "table-filter-all" {
                    let on = e.is_checked.flatten().unwrap_or(false);
                    if let Some(list) = self.nodes[&id].table.filter_list {
                        let keys = self.nodes[&list]
                            .props
                            .collection_items
                            .iter()
                            .map(|item| item.id.clone())
                            .collect::<Vec<_>>();
                        for key in keys {
                            if on {
                                self.nodes
                                    .get_mut(&id)
                                    .unwrap()
                                    .table
                                    .filter_selected
                                    .insert(key);
                            } else {
                                self.nodes
                                    .get_mut(&id)
                                    .unwrap()
                                    .table
                                    .filter_selected
                                    .remove(&key);
                            }
                        }
                    }
                } else if let Some(key) = role.strip_prefix("table-filter-value:") {
                    if e.is_checked.flatten().unwrap_or(false) {
                        self.nodes
                            .get_mut(&id)
                            .unwrap()
                            .table
                            .filter_selected
                            .insert(key.into());
                    } else {
                        self.nodes
                            .get_mut(&id)
                            .unwrap()
                            .table
                            .filter_selected
                            .remove(key);
                    }
                }
                self.sync_table_filter(id);
            }
            if e.kind == EventKind::TextChanged
                && self.nodes[&id].table.filter_search == Some(e.target)
            {
                let search = e.text.unwrap_or_default().to_lowercase();
                // Original GetFilterItems rebuilds check states on each search:
                // search results begin selected; clearing search restores the
                // applied column filter, rather than retaining an abandoned draft.
                let q = props(&self.nodes[&id].props);
                let column = self.nodes[&id].table.menu_column.clone();
                let active = q
                    .filters
                    .iter()
                    .find(|filter| Some(&filter.column) == column.as_ref())
                    .and_then(|filter| filter.values.as_ref());
                let selected = self.nodes[&id]
                    .table
                    .filter_entries
                    .iter()
                    .filter(|(_, value, _)| {
                        !search.is_empty()
                            || active.is_none_or(|values| {
                                values.iter().any(|v| value_key(v) == value_key(value))
                            })
                    })
                    .map(|(key, _, _)| key.clone())
                    .collect();
                self.nodes.get_mut(&id).unwrap().table.filter_selected = selected;
                if let Some(list) = self.nodes[&id].table.filter_list {
                    let entries = self.nodes[&id]
                        .table
                        .filter_entries
                        .iter()
                        .filter(|(_, value, _)| text(value).to_lowercase().contains(&search))
                        .map(|(id, _, label)| super::super::collections::CollectionData {
                            id: id.clone(),
                            text: label.clone(),
                            enabled: true,
                            group: None,
                        })
                        .collect::<Vec<_>>();
                    if let Some(n) = self.nodes.get_mut(&list) {
                        n.props.collection_items = Arc::new(entries);
                    }
                }
                self.invalidate(id, true);
            }
            if e.kind == EventKind::MenuItemInvoked && self.nodes[&id].table.menu == Some(e.target)
            {
                match e.item_id.as_deref().unwrap_or("") {
                    "selectAll" => self.table_select_all(id),
                    "clearSelection" => {
                        self.table_deselect(id);
                        self.table_changed(id, false);
                    }
                    "copy" => self.table_export(id, true, false, true, None),
                    "copyWithHeaders" => self.table_export(id, true, true, true, None),
                    "paste" => self.table_emit(
                        id,
                        EventKind::PasteFromClipboard,
                        json!({"readClipboard":true}),
                    ),
                    "export" => self.table_export(id, false, true, false, None),
                    "exportSelected" => self.table_export(id, true, true, false, None),
                    "ungroupAll" => self.table_ungroup(id,None),
                    "clearSorting" => {
                        self.table_request(id, EventKind::ClearSorting, "clearSorting", json!({}));
                    }
                    "clearFilters" => {
                        self.nodes
                            .get_mut(&id)
                            .unwrap()
                            .props
                            .table
                            .as_mut()
                            .unwrap()
                            .filters
                            .clear();
                        self.table_changed(id, false);
                    }
                    _ => {
                        self.table_emit(
                            id,
                            EventKind::MenuItemInvoked,
                            json!({"cell":props(&self.nodes[&id].props).current_cell}),
                        );
                        self.events.last_mut().unwrap().item_id = e.item_id;
                    }
                }
            }
        }
    }
}
