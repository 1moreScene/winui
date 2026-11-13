//! Community WinUI.TableView 1.5.1 GroupDescription/CollectionViewGroup semantics.
//! Original source and MIT notice: references/table-view-grouping-release.json.
use super::*;
fn group_contract() -> &'static Value {
    static IR: std::sync::OnceLock<Value> = std::sync::OnceLock::new();
    IR.get_or_init(|| {
        serde_json::from_str(include_str!(
            "../../../references/table-view-grouping-runtime.json"
        ))
        .expect("extracted release grouping template")
    })
}
pub(super) fn indent() -> f64 {
    group_contract()["groupIndentSize"].as_f64().unwrap()
}
pub(super) fn default_height() -> f64 {
    group_contract()["themes"]["Light"]["TableViewGroupHeaderRowMinHeight"]
        .as_f64()
        .unwrap()
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct GroupDescription {
    pub column: String,
    pub direction: TableViewSortDirection,
    pub sort_mode: TableViewGroupSortMode,
    #[serde(skip_serializing)]
    pub comparison_ranks: Arc<BTreeMap<String, usize>>,
}
impl Default for GroupDescription {
    fn default() -> Self {
        Self {
            column: String::new(),
            direction: TableViewSortDirection::Ascending,
            sort_mode: TableViewGroupSortMode::Key,
            comparison_ranks: Arc::default(),
        }
    }
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GroupInfo {
    pub id: String,
    pub path: Vec<Value>,
    pub column: String,
    pub key: Value,
    pub count: usize,
    pub level: usize,
    pub is_expanded: bool,
    pub container: Option<u32>,
}
#[derive(Clone)]
pub(super) struct Header {
    pub info: GroupInfo,
    pub y: f64,
    pub end_y: f64,
}
#[derive(Clone)]
pub(super) enum Entry {
    Header(usize),
    Row(usize),
    End(usize),
}
pub(super) fn compare(a: &Value, b: &Value) -> std::cmp::Ordering {
    match (a, b) {
        (Value::Null, Value::Null) => std::cmp::Ordering::Equal,
        (Value::Null, _) => std::cmp::Ordering::Less,
        (_, Value::Null) => std::cmp::Ordering::Greater,
        (Value::Number(a), Value::Number(b)) => a
            .as_f64()
            .partial_cmp(&b.as_f64())
            .unwrap_or(std::cmp::Ordering::Equal),
        (Value::Bool(a), Value::Bool(b)) => a.cmp(b),
        _ => text(a).to_lowercase().cmp(&text(b).to_lowercase()),
    }
}
pub(super) fn build(
    q: &TableProperties,
    cols: &[Column],
    rows: &[usize],
    overrides: &HashMap<String, bool>,
) -> (Vec<usize>, Vec<Header>, Vec<Entry>) {
    fn level(
        q: &TableProperties,
        cols: &[Column],
        rows: &[usize],
        overrides: &HashMap<String, bool>,
        depth: usize,
        path: &mut Vec<Value>,
        order: &mut Vec<usize>,
        headers: &mut Vec<Header>,
        entries: &mut Vec<Entry>,
    ) {
        let Some(desc) = q.groups.get(depth) else {
            for &row in rows {
                order.push(row);
                entries.push(Entry::Row(row));
            }
            return;
        };
        let col = cols.iter().find(|c| c.key == desc.column);
        let mut buckets: Vec<(Value, Vec<usize>)> = Vec::new();
        let mut lookup = HashMap::<String, usize>::new();
        for &row in rows {
            let key = q.items[row]
                .group_values
                .as_ref().and_then(|values| values.get(&desc.column))
                .unwrap_or_else(|| {
                    col.map(|c| operation(&q.items[row], c))
                        .unwrap_or_else(|| super::path(&q.items[row].values, &desc.column))
                })
                .clone();
            // JSON encoding preserves number/bool/null/string identity and avoids
            // collisions between equal labels belonging to different levels.
            let wire = key.to_string();
            if let Some(&at) = lookup.get(&wire) {
                buckets[at].1.push(row);
            } else {
                lookup.insert(wire, buckets.len());
                buckets.push((key, vec![row]));
            }
        }
        let key_compare = |a: &Value, b: &Value| {
            if desc.comparison_ranks.is_empty() {
                compare(a, b)
            } else {
                desc.comparison_ranks
                    .get(&a.to_string())
                    .cmp(&desc.comparison_ranks.get(&b.to_string()))
            }
        };
        buckets.sort_by(|a, b| {
            if desc.sort_mode == TableViewGroupSortMode::Count {
                let cmp = a.1.len().cmp(&b.1.len());
                return (if desc.direction == TableViewSortDirection::Descending {
                    cmp.reverse()
                } else {
                    cmp
                })
                .then_with(|| key_compare(&a.0, &b.0));
            }
            let cmp = key_compare(&a.0, &b.0);
            if desc.direction == TableViewSortDirection::Descending {
                cmp.reverse()
            } else {
                cmp
            }
        });
        for (key, rows) in buckets {
            path.push(key.clone());
            let id = json!([
                q.groups
                    .iter()
                    .take(depth + 1)
                    .map(|g| &g.column)
                    .collect::<Vec<_>>(),
                path
            ])
            .to_string();
            let expanded = overrides
                .get(&id)
                .copied()
                .unwrap_or(q.default_group_state == TableViewGroupState::Expanded);
            let index = headers.len();
            headers.push(Header {
                info: GroupInfo {
                    id,
                    path: path.clone(),
                    column: desc.column.clone(),
                    key,
                    count: rows.len(),
                    level: depth,
                    is_expanded: expanded,
                    container: None,
                },
                y: 0.,
                end_y: 0.,
            });
            entries.push(Entry::Header(index));
            if expanded {
                level(
                    q,
                    cols,
                    &rows,
                    overrides,
                    depth + 1,
                    path,
                    order,
                    headers,
                    entries,
                );
            }
            entries.push(Entry::End(index));
            path.pop();
        }
    }
    let (mut order, mut headers, mut entries) = (Vec::new(), Vec::new(), Vec::new());
    level(
        q,
        cols,
        rows,
        overrides,
        0,
        &mut Vec::new(),
        &mut order,
        &mut headers,
        &mut entries,
    );
    (order, headers, entries)
}
pub(super) fn details(q: &TableProperties, row: &Row) -> bool {
    q.has_row_details_template
        && match q.row_details_visibility_mode {
            TableViewRowDetailsVisibilityMode::Visible => true,
            TableViewRowDetailsVisibilityMode::VisibleWhenSelected => {
                q.selected_keys.contains(&row.id)
                    || q.selected_cells.iter().any(|c| c.row == row.id)
            }
            TableViewRowDetailsVisibilityMode::VisibleWhenExpanded => {
                q.expanded_rows.contains(&row.id)
            }
            _ => false,
        }
}

impl Scene {
    pub(in crate::scene) fn table_sticky_row_clip(&self, canvas: u32) -> Option<Rect> {
        let n = &self.nodes[&canvas];
        if n.table.role != "tableBodyRows" {
            return None;
        }
        let owner = n.table.owner?;
        let table = &self.nodes[&owner];
        let q = table.props.table.as_ref()?;
        if !q.are_sticky_group_headers_enabled {
            return None;
        }
        let y = self.nodes[&table.table.body?].scroll.offsets(self.time)[1];
        let headers = &table.table.group_headers;
        let at = headers.partition_point(|h| h.y <= y);
        let h = headers[..at].iter().rev().find(|h| h.end_y > y)?;
        let bottom = (y + q.group_header_height.max(24.)).min(h.end_y);
        Some(Rect::new(
            0.,
            bottom,
            n.rect.width,
            (table.table.group_extent - bottom).max(0.),
        ))
    }

    pub(super) fn table_group_column(&mut self, id: u32, column: &str) {
        let q = props(&self.nodes[&id].props);
        if !q.can_group_columns
            || q.groups.iter().any(|g| g.column == column)
            || !all_columns(&q)
                .iter()
                .any(|c| c.key == column && c.can_group)
        {
            return;
        }
        self.table_request(id, EventKind::Grouping, "group", json!({"column":column}));
    }
    pub(super) fn table_ungroup(&mut self, id: u32, column: Option<&str>) {
        let q = self
            .nodes
            .get_mut(&id)
            .unwrap()
            .props
            .table
            .as_mut()
            .unwrap();
        let level = column
            .and_then(|column| q.groups.iter().position(|g| g.column == column))
            .unwrap_or(0);
        q.groups
            .retain(|g| column.is_some_and(|column| g.column != column));
        self.nodes
            .get_mut(&id)
            .unwrap()
            .table
            .group_overrides
            .retain(|id, _| {
                column.is_some()
                    && serde_json::from_str::<Value>(id)
                        .ok()
                        .and_then(|v| v[0].as_array().map(Vec::len))
                        .is_some_and(|depth| depth <= level)
            });
        self.table_changed(id, false);
    }
    pub(super) fn table_expand_group(&mut self, id: u32, data: &Value, expanded: Option<bool>) {
        let Some(info) = self.nodes[&id]
            .table
            .group_headers
            .iter()
            .find(|h| {
                data["id"].as_str() == Some(&h.info.id)
                    || data.get("path") == Some(&json!(h.info.path))
            })
            .map(|h| h.info.clone())
        else {
            return;
        };
        self.nodes
            .get_mut(&id)
            .unwrap()
            .table
            .group_overrides
            .insert(info.id, expanded.unwrap_or(!info.is_expanded));
        self.table_changed(id, false);
    }
    pub(super) fn table_realize_groups(
        &mut self,
        id: u32,
        width: f64,
        height: f64,
        scroll_x: f64,
        scroll_y: f64,
    ) {
        let q = props(&self.nodes[&id].props);
        let theme = self.nodes[&id].theme;
        let theme_key = match theme {
            Theme::Light => "Light",
            Theme::Dark => "Dark",
            Theme::HighContrast => "HighContrast",
        };
        let values = &group_contract()["themes"][theme_key];
        let font_size = values["TableViewGroupHeaderRowFontSize"].as_f64().unwrap();
        let margins = &values["TableViewGroupHeaderRowExpanderMargin"];
        let content_margin = &values["TableViewGroupHeaderRowContentMargin"];
        let button_size = group_contract()["expandButtonSize"].as_f64().unwrap();
        let icon = &group_contract()["expandIcon"];
        let canvas = self.nodes[&id].table.canvas.unwrap();
        let headers = &self.nodes[&id].table.group_headers;
        let h = q.group_header_height.max(24.);
        let at = headers.partition_point(|g| g.y <= scroll_y);
        let sticky = if q.are_sticky_group_headers_enabled {
            headers[..at].iter().rposition(|g| g.end_y > scroll_y)
        } else {
            None
        };
        let first = headers.partition_point(|g| g.y + h < scroll_y);
        let end = headers.partition_point(|g| g.y <= scroll_y + height);
        let mut visible = (first..end).collect::<Vec<_>>();
        if let Some(sticky) = sticky {
            if !visible.contains(&sticky) {
                visible.insert(0, sticky);
            }
        }
        let headers = visible
            .into_iter()
            .map(|i| (i, headers[i].clone()))
            .collect::<Vec<_>>();
        let old = self.nodes[&id].table.group_nodes.clone();
        let mut live = HashMap::new();
        let mut realized = Vec::new();
        for (i, header) in &headers {
            let pinned = sticky == Some(*i);
            let y = if pinned {
                scroll_y.min(header.end_y - h)
            } else {
                header.y
            };
            if y + h < scroll_y || y > scroll_y + height {
                continue;
            }
            let node = old
                .get(&header.info.id)
                .copied()
                .unwrap_or_else(|| self.table_part(canvas, NodeKind::Canvas, json!({"clip":true})));
            live.insert(header.info.id.clone(), node);
            let theme = self.nodes[&id].theme;
            let n = self.nodes.get_mut(&node).unwrap();
            n.props.canvas_left = Some(scroll_x);
            n.props.canvas_top = Some(y);
            n.props.width = Some(width);
            n.props.height = Some(h);
            n.props.z_index = if pinned { 40 } else { 30 };
            n.props.background = Some(BrushValue::Resource {
                resource: if theme == Theme::HighContrast {
                    "SystemColorWindowColor"
                } else {
                    "CardBackgroundFillColorSecondaryBrush"
                }
                .into(),
            });
            n.props.foreground = Some(BrushValue::Resource {
                resource: "TextFillColorPrimaryBrush".into(),
            });
            n.table.owner = Some(id);
            n.table.role = "groupHeader".into();
            let button=self.nodes[&node].children.iter().find(|n|self.nodes[n].table.role=="groupToggle").copied()
                .unwrap_or_else(||self.table_part(node,NodeKind::Button,json!({"variant":"Subtle","minWidth":button_size,"minHeight":button_size,"padding":[4,4,4,4],"background":"#00000000","borderThickness":[0,0,0,0]})));
            let n = self.nodes.get_mut(&button).unwrap();
            n.props.canvas_left =
                Some(indent() * header.info.level as f64 + margins[0].as_f64().unwrap());
            n.props.canvas_top = Some((h - button_size) / 2.);
            n.props.width = Some(button_size);
            n.props.height = Some(button_size);
            n.props.opacity = if q.show_group_expand_collapse_button {
                1.
            } else {
                0.
            };
            n.props.is_hit_test_visible = q.show_group_expand_collapse_button;
            n.props.is_tab_stop = q.show_group_expand_collapse_button;
            n.props.accessible_name = Some(format!(
                "{} {}: {}",
                if header.info.is_expanded {
                    "Collapse"
                } else {
                    "Expand"
                },
                header.info.column,
                text(&header.info.key)
            ));
            n.table.owner = Some(id);
            n.table.role = "groupToggle".into();
            n.table.row_key = header.info.id.clone();
            let icon=self.nodes[&button].children.first().copied().unwrap_or_else(||self.table_part(button,NodeKind::FontIcon,json!({"glyph":icon["glyph"],"fontSize":icon["fontSize"],"width":12,"height":12,"centerPoint":[6,6]})));
            let rotation = if header.info.is_expanded { 0. } else { -90. };
            if self.nodes[&icon].props.rotation != rotation {
                // The release VSM setter changes the rendered transform too.
                // Direct property writes leave Presentation.rotation unchanged.
                self.update(vec![Update { id: icon, patch: json!({"rotation":rotation}) }])
                    .expect("validated native group-chevron rotation");
            }
            let content = self.nodes[&node]
                .children
                .iter()
                .find(|n| self.nodes[n].table.role == "groupContent")
                .copied()
                .unwrap_or_else(|| {
                    self.table_part(
                        node,
                        NodeKind::Grid,
                        json!({"clip":true,"fontSize":font_size}),
                    )
                });
            let family = self.nodes[&id].props.font_family.clone();
            let n = self.nodes.get_mut(&content).unwrap();
            let x = indent() * header.info.level as f64
                + margins[0].as_f64().unwrap()
                + button_size
                + margins[2].as_f64().unwrap()
                + content_margin[0].as_f64().unwrap();
            n.props.canvas_left = Some(x);
            n.props.canvas_top = Some(0.);
            n.props.width = Some((width - x - content_margin[2].as_f64().unwrap()).max(0.));
            n.props.height =
                Some(h - (q.horizontal_grid_lines_stroke_thickness * self.dpr).round() / self.dpr);
            n.props.font_family = family;
            n.table.owner = Some(id);
            n.table.role = "groupContent".into();
            let kind = if q.has_group_header_template {
                "template"
            } else {
                "default"
            };
            if self.nodes[&content].table.content_kind != kind {
                for child in self.nodes[&content].children.clone() {
                    // A caller may have mounted its subtree before the template
                    // flag reaches Arrange. Only the generated default labels
                    // belong to the outgoing native template in that direction.
                    if !q.has_group_header_template || self.nodes[&child].table.role=="groupDefaultLabel" {
                        let _ = self.destroy(child);
                    }
                }
                self.nodes.get_mut(&content).unwrap().table.content_kind = kind.into();
            }
            let mut info = header.info.clone();
            info.container = Some(content);
            realized.push(info);
            if !q.has_group_header_template {
                for (label, align) in [
                    (
                        match &header.info.key {
                            Value::Bool(v) => if *v { "True" } else { "False" }.into(),
                            v => text(v),
                        },
                        HorizontalAlignment::Left,
                    ),
                    (header.info.count.to_string(), HorizontalAlignment::Right),
                ] {
                    let child=self.nodes[&content].children.iter().find(|n|self.nodes[n].props.horizontal_alignment==align).copied()
                        .unwrap_or_else(||self.table_part(content,NodeKind::TextBlock,json!({"fontSize":font_size,"verticalAlignment":"Center","trimming":"CharacterEllipsis"})));
                    self.nodes.get_mut(&child).unwrap().table.role="groupDefaultLabel".into();
                    let n = &mut self.nodes.get_mut(&child).unwrap().props;
                    n.text = label;
                    n.horizontal_alignment = align;
                }
            }
            let line = self.nodes[&node]
                .children
                .iter()
                .find(|n| self.nodes[n].props.layout_key == "groupLine")
                .copied()
                .unwrap_or_else(|| {
                    self.table_part(
                        node,
                        NodeKind::Grid,
                        json!({"layoutKey":"groupLine","isHitTestVisible":false}),
                    )
                });
            let n = &mut self.nodes.get_mut(&line).unwrap().props;
            let thickness =
                (q.horizontal_grid_lines_stroke_thickness * self.dpr).round() / self.dpr;
            n.canvas_top = Some(h - thickness);
            n.width = Some(width);
            n.height = Some(thickness);
            n.background = Some(
                q.horizontal_grid_lines_stroke
                    .clone()
                    .unwrap_or_else(|| theme_resource("TableViewHorizontalGridLineStroke", theme)),
            );
        }
        for (key, node) in old {
            if !live.contains_key(&key) {
                let _ = self.destroy(node);
            }
        }
        self.nodes.get_mut(&id).unwrap().table.group_nodes = live;
        self.nodes.get_mut(&id).unwrap().table.group_realized = realized;
    }
}
