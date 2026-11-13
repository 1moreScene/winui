//! Port of the community WinUI.TableView, commit 665fea5.
//! Copyright and MIT license: third_party/WinUI.TableView/LICENSE.md.
//! Data shaping, selection, virtualization and edit transactions belong to Rust.
use super::*;
use crate::content::GridTrack;
use serde_json::{json, Value};
use std::{
    collections::{BTreeSet, HashSet},
    sync::Arc,
};
mod runtime;
mod grouping;
pub use grouping::{GroupDescription, GroupInfo};
fn contract() -> &'static Value {
    static IR: std::sync::OnceLock<Value> = std::sync::OnceLock::new();
    IR.get_or_init(|| {
        serde_json::from_str(include_str!("../../references/table-view-runtime.json"))
            .expect("extracted community TableView contract")
    })
}
fn theme_resource(key: &str, theme: Theme) -> BrushValue {
    let dictionary = match theme {
        Theme::Light => "Light",
        Theme::Dark => "Dark",
        Theme::HighContrast => "HighContrast",
    };
    let value = &contract()["themes"][dictionary][key];
    if let Some(color) = value["color"].as_str() {
        return BrushValue::Color(color.into());
    }
    let resource = value["resource"]
        .as_str()
        .expect("source TableView brush alias");
    if let Some(opacity) = value["opacity"].as_f64() {
        let color = crate::resources::Resources::current()
            .resolve(theme, resource)
            .expect("TableView source color dependency")
            .solid_color();
        let mut rgba = crate::material::rgba(&color);
        rgba[3] *= opacity;
        return BrushValue::Color(crate::material::css(rgba));
    }
    BrushValue::Resource {
        resource: resource.into(),
    }
}

#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Cell {
    pub row: String,
    pub column: String,
}
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
#[derive(PartialEq)]
pub struct Row {
    pub fields: Arc<Vec<String>>,
    pub id: String,
    pub values: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub display: Option<Box<BTreeMap<String, String>>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub operations: Option<Box<BTreeMap<String, Value>>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub group_values: Option<Box<BTreeMap<String, Value>>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub clipboard: Option<Box<BTreeMap<String, String>>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub styles: Option<Box<BTreeMap<String, CellStyle>>>,
    pub header: String,
}
#[cfg(target_arch = "wasm32")]
pub(crate) fn decode_browser_rows(json: &str) -> Result<Vec<Row>, String> {
    if !json.trim_start().starts_with('{') {
        return serde_json::from_str(json).map_err(|error| error.to_string());
    }
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct CompactRows {
        field_orders: Vec<Arc<Vec<String>>>,
        rows: Vec<(String, usize, Value)>,
    }
    let source: CompactRows = serde_json::from_str(json).map_err(|error| error.to_string())?;
    source.rows.into_iter().map(|(id, order, values)| {
        let fields = source.field_orders.get(order).ok_or("invalid table row field order")?;
        let values = match values {
            Value::Array(values) if values.len() == fields.len() => Value::Object(
                fields.iter().cloned().zip(values).collect(),
            ),
            Value::Object(_) => values,
            _ => return Err("invalid table row values".into()),
        };
        Ok(Row { id, values, fields: fields.clone(), ..Row::default() })
    }).collect()
}
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
#[derive(PartialEq)]
pub struct CellStyle {
    pub foreground: Option<BrushValue>,
    pub background: Option<BrushValue>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
#[derive(PartialEq)]
pub struct Column {
    pub key: String,
    pub field: String,
    pub header: String,
    pub kind: TableViewColumnKind,
    pub width: GridTrack,
    pub min_width: f64,
    pub max_width: f64,
    pub visible: bool,
    pub is_read_only: bool,
    pub can_sort: bool,
    pub can_filter: bool,
    pub can_group: bool,
    pub can_resize: bool,
    pub can_reorder: bool,
    pub options: Vec<String>,
    pub sort_member_path: Option<String>,
    pub clipboard_member_path: Option<String>,
    pub has_template: bool,
    pub has_edit_template: bool,
    pub has_header_template: bool,
}
impl Default for Column {
    fn default() -> Self {
        Self {
            key: String::new(),
            field: String::new(),
            header: String::new(),
            kind: Default::default(),
            width: GridTrack {
                unit: GridUnit::Auto,
                value: 1.,
            },
            min_width: 50.,
            max_width: 10000.,
            visible: true,
            is_read_only: false,
            can_sort: true,
            can_filter: true,
            can_group: true,
            can_resize: true,
            can_reorder: true,
            options: vec![],
            sort_member_path: None,
            clipboard_member_path: None,
            has_template: false,
            has_edit_template: false,
            has_header_template: false,
        }
    }
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
#[derive(PartialEq)]
pub struct Sort {
    pub column: String,
    pub direction: TableViewSortDirection,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
#[derive(PartialEq)]
pub struct Filter {
    pub column: String,
    #[serde(default)]
    pub values: Option<Vec<Value>>,
    #[serde(default)]
    pub search: String,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
#[derive(PartialEq)]
pub struct TableProperties {
    pub items: Arc<Vec<Row>>,
    pub columns: Vec<Column>,
    pub auto_generate_columns: bool,
    pub sorts: Vec<Sort>,
    pub filters: Vec<Filter>,
    pub groups: Vec<GroupDescription>,
    pub can_group_columns: bool,
    pub default_group_state: TableViewGroupState,
    pub are_sticky_group_headers_enabled: bool,
    pub show_group_expand_collapse_button: bool,
    pub has_group_header_template: bool,
    pub group_header_height: f64,
    pub search: String,
    pub selection_unit: TableViewSelectionUnit,
    pub selection_mode: ListViewSelectionMode,
    pub selected_keys: Vec<String>,
    pub selected_cells: Vec<Cell>,
    pub current_cell: Option<Cell>,
    pub is_read_only: bool,
    pub can_copy: bool,
    pub can_paste: bool,
    pub can_sort_columns: bool,
    pub can_filter_columns: bool,
    pub can_resize_columns: bool,
    pub can_reorder_columns: bool,
    pub can_reorder_rows: bool,
    pub frozen_column_count: usize,
    pub row_height: f64,
    pub header_row_height: f64,
    pub row_header_width: f64,
    pub cells_horizontal_offset: f64,
    pub use_right_click_for_column_filter: bool,
    pub force_row_or_cell_selection_on_context_requested: bool,
    pub expanded_rows: Vec<String>,
    pub headers_visibility: TableViewHeadersVisibility,
    pub grid_lines_visibility: TableViewGridLinesVisibility,
    pub header_grid_lines_visibility: TableViewGridLinesVisibility,
    pub alternate_row_background: Option<BrushValue>,
    pub alternate_row_foreground: Option<BrushValue>,
    pub horizontal_grid_lines_stroke: Option<BrushValue>,
    pub vertical_grid_lines_stroke: Option<BrushValue>,
    pub horizontal_grid_lines_stroke_thickness: f64,
    pub vertical_grid_lines_stroke_thickness: f64,
    pub column_auto_width_mode: TableViewColumnAutoWidthMode,
    pub corner_button_mode: TableViewCornerButtonMode,
    pub show_export_options: bool,
    pub show_filter_items_count: bool,
    pub row_details_visibility_mode: TableViewRowDetailsVisibilityMode,
    pub row_details_height: f64,
    pub has_row_details_template: bool,
    pub has_row_header_template: bool,
    pub are_row_details_frozen: bool,
    pub page_size: usize,
    pub page_index: usize,
    pub show_drag_rectangle: bool,
    pub cell_context_menu: Vec<overlays::MenuEntry>,
    pub row_context_menu: Vec<overlays::MenuEntry>,
}
impl Default for TableProperties {
    fn default() -> Self {
        Self {
            items: Arc::default(),
            columns: vec![],
            auto_generate_columns: true,
            sorts: vec![],
            filters: vec![],
            groups: vec![],
            can_group_columns: true,
            default_group_state: Default::default(),
            are_sticky_group_headers_enabled: false,
            show_group_expand_collapse_button: true,
            has_group_header_template: false,
            group_header_height: grouping::default_height(),
            search: String::new(),
            selection_unit: Default::default(),
            selection_mode: ListViewSelectionMode::Extended,
            selected_keys: vec![],
            selected_cells: vec![],
            current_cell: None,
            is_read_only: false,
            can_copy: true,
            can_paste: true,
            can_sort_columns: true,
            can_filter_columns: true,
            can_resize_columns: true,
            can_reorder_columns: true,
            can_reorder_rows: false,
            frozen_column_count: 0,
            row_height: 40.,
            header_row_height: 32.,
            row_header_width: 16.,
            cells_horizontal_offset: 16.,
            use_right_click_for_column_filter: false,
            force_row_or_cell_selection_on_context_requested: false,
            expanded_rows: vec![],
            headers_visibility: Default::default(),
            grid_lines_visibility: Default::default(),
            header_grid_lines_visibility: Default::default(),
            alternate_row_background: None,
            alternate_row_foreground: None,
            horizontal_grid_lines_stroke: None,
            vertical_grid_lines_stroke: None,
            horizontal_grid_lines_stroke_thickness: 1.,
            vertical_grid_lines_stroke_thickness: 1.,
            column_auto_width_mode: Default::default(),
            corner_button_mode: Default::default(),
            show_export_options: false,
            show_filter_items_count: false,
            row_details_visibility_mode: Default::default(),
            row_details_height: 56.,
            has_row_details_template: false,
            has_row_header_template: false,
            are_row_details_frozen: false,
            page_size: 0,
            page_index: 0,
            show_drag_rectangle: true,
            cell_context_menu: vec![],
            row_context_menu: vec![],
        }
    }
}
pub fn props(p: &NodeProperties) -> TableProperties {
    p.table.as_deref().cloned().unwrap_or_default()
}
pub fn path<'a>(value: &'a Value, key: &str) -> &'a Value {
    key.split('.')
        .fold(value, |v, k| v.get(k).unwrap_or(&Value::Null))
}
pub fn text(value: &Value) -> String {
    match value {
        Value::Null => String::new(),
        Value::String(s) => s.clone(),
        Value::Number(n) if n.is_f64() => n.as_f64().unwrap().to_string(),
        _ => value.to_string(),
    }
}

fn value_key(value: &Value) -> String {
    if value.as_str().is_some_and(|text| text.trim().is_empty()) {
        return "null".into();
    }
    if let Value::Number(n) = value {
        if let Some(n) = n.as_f64() {
            return format!("n:{}", if n == 0. { 0. } else { n });
        }
    }
    value.to_string()
}
/// Clipboard TSV/CSV, including quoted delimiters, newlines and doubled quotes.
pub fn parse_clipboard(input: &str) -> Result<Vec<Vec<String>>, String> {
    let input = input.trim_start_matches('\u{feff}');
    let mut quote = false;
    let mut tabs = 0;
    let mut commas = 0;
    let mut chars = input.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '"' {
            if quote && chars.peek() == Some(&'"') {
                chars.next();
            } else {
                quote = !quote;
            }
        } else if !quote {
            match c {
                '\t' => tabs += 1,
                ',' => commas += 1,
                '\r' | '\n' => break,
                _ => {}
            }
        }
    }
    let separator = if tabs > 0 || commas == 0 { '\t' } else { ',' };
    let mut rows = vec![];
    let mut fields = vec![];
    let mut field = String::new();
    let mut quoted = false;
    let mut after_quote = false;
    let mut ended_record = false;
    let mut chars = input.chars().peekable();
    while let Some(c) = chars.next() {
        if quoted {
            ended_record = false;
            if c == '"' {
                if chars.peek() == Some(&'"') {
                    chars.next();
                    field.push('"');
                } else {
                    quoted = false;
                    after_quote = true;
                }
            } else {
                field.push(c);
            }
            continue;
        }
        if c == separator {
            fields.push(std::mem::take(&mut field));
            after_quote = false;
            ended_record = false;
        } else if c == '\r' || c == '\n' {
            if c == '\r' && chars.peek() == Some(&'\n') {
                chars.next();
            }
            fields.push(std::mem::take(&mut field));
            rows.push(std::mem::take(&mut fields));
            after_quote = false;
            ended_record = true;
        } else if after_quote {
            if !c.is_whitespace() {
                return Err("Unexpected text after a quoted clipboard field".into());
            }
        } else if c == '"' && field.is_empty() {
            quoted = true;
            ended_record = false;
        } else {
            field.push(c);
            ended_record = false;
        }
    }
    if quoted {
        return Err("Unclosed quoted clipboard field".into());
    }
    if !ended_record || !fields.is_empty() {
        fields.push(field);
        rows.push(fields);
    }
    Ok(rows)
}
fn converted_value(kind: TableViewColumnKind, value: Value) -> Result<Value, String> {
    if value.is_null() {
        return Ok(value);
    }
    let value = match kind {
        TableViewColumnKind::Number => {
            if value.is_number() {
                value
            } else if text(&value).is_empty() {
                Value::Null
            } else {
                let n = text(&value).parse::<f64>().map_err(|_| "Invalid number")?;
                if !n.is_finite() {
                    return Err("Invalid finite number".into());
                }
                json!(n)
            }
        }
        TableViewColumnKind::CheckBox | TableViewColumnKind::ToggleSwitch => {
            if value.is_boolean() {
                value
            } else {
                match text(&value).to_lowercase().as_str() {
                    "true" | "1" => json!(true),
                    "false" | "0" => json!(false),
                    "" => Value::Null,
                    _ => return Err("Invalid boolean".into()),
                }
            }
        }
        TableViewColumnKind::Date => {
            let s = value.as_str().ok_or("Date cell expects an ISO string")?;
            if s.is_empty() {
                Value::Null
            } else {
                crate::picker_value::Date::parse(s)?;
                value
            }
        }
        TableViewColumnKind::Time => {
            let n = if let Some(n) = value.as_u64() {
                n
            } else {
                let s = value.as_str().ok_or("Time cell expects minutes or HH:mm")?;
                if s.is_empty() {
                    return Ok(Value::Null);
                }
                if s.contains(':') {
                    crate::picker_value::parse_time(s)? as u64
                } else {
                    s.parse::<u64>().map_err(|_| "Invalid time")?
                }
            };
            if n >= 1440 {
                return Err("Time cell expects minutes 0..1439".into());
            }
            json!(n)
        }
        _ => value,
    };
    Ok(value)
}
fn write_cell(row: &mut Row, column: &Column, value: Value) -> Result<(), String> {
    if column.field.is_empty() {
        return Err("An editable TableView column requires a field or path".into());
    }
    let mut at = &mut row.values;
    let parts = column.field.split('.').collect::<Vec<_>>();
    for part in &parts[..parts.len() - 1] {
        if !at[*part].is_object() {
            at[*part] = json!({});
        }
        at = &mut at[*part];
    }
    at[parts.last().copied().unwrap()] = value;
    if let Some(display) = &mut row.display { display.remove(&column.key); }
    if let Some(operations) = &mut row.operations { operations.remove(&column.key); }
    if let Some(clipboard) = &mut row.clipboard { clipboard.remove(&column.key); }
    Ok(())
}
pub fn validate(p: &NodeProperties) -> Result<(), String> {
    let Some(t) = &p.table else { return Ok(()) };
    for v in [
        t.row_height,
        t.header_row_height,
        t.group_header_height,
        t.row_header_width,
        t.row_details_height,
        t.horizontal_grid_lines_stroke_thickness,
        t.vertical_grid_lines_stroke_thickness,
    ] {
        if !v.is_finite() || v < 0. || v > 10000. {
            return Err("Invalid TableView dimension".into());
        }
    }
    if t.row_height < 16. || t.header_row_height < 16. {
        return Err("TableView row/header height must be at least 16".into());
    }
    let mut keys = HashSet::new();
    for r in t.items.iter() {
        if r.id.is_empty() || !keys.insert(&r.id) || !r.values.is_object() {
            return Err("TableView items require unique nonempty keys and object values".into());
        }
        for s in r.styles.iter().flat_map(|styles| styles.values()) {
            for b in [&s.foreground, &s.background].into_iter().flatten() {
                b.validate()?;
            }
        }
    }
    keys.clear();
    for c in &t.columns {
        if c.key.is_empty()
            || !keys.insert(&c.key)
            || c.min_width < 0.
            || c.max_width < c.min_width
            || !c.min_width.is_finite()
            || !c.max_width.is_finite()
            || !c.width.value.is_finite()
            || c.width.value < 0.
        {
            return Err("Invalid TableView column key/width".into());
        }
    }
    for c in columns(t) {
        if !matches!(c.kind, TableViewColumnKind::Number | TableViewColumnKind::CheckBox
            | TableViewColumnKind::ToggleSwitch | TableViewColumnKind::Date | TableViewColumnKind::Time) {
            continue;
        }
        for row in t.items.iter() {
            let v = path(&row.values, &c.field);
            if v.is_null() {
                continue;
            }
            match c.kind {
                TableViewColumnKind::Number if !v.is_number() => {
                    return Err(format!("TableView {} expects numbers", c.key))
                }
                TableViewColumnKind::CheckBox | TableViewColumnKind::ToggleSwitch
                    if !v.is_boolean() =>
                {
                    return Err(format!("TableView {} expects booleans", c.key))
                }
                TableViewColumnKind::Date => {
                    crate::picker_value::Date::parse(
                        v.as_str().ok_or("Date cell expects an ISO string")?,
                    )?;
                }
                TableViewColumnKind::Time if v.as_u64().is_none_or(|n| n >= 1440) => {
                    return Err("Time cell expects minutes 0..1439".into())
                }
                _ => {}
            }
        }
    }
    for b in [
        &t.alternate_row_background,
        &t.alternate_row_foreground,
        &t.horizontal_grid_lines_stroke,
        &t.vertical_grid_lines_stroke,
    ]
    .into_iter()
    .flatten()
    {
        b.validate()?;
    }
    Ok(())
}
fn all_columns(t: &TableProperties) -> Vec<Column> {
    let mut cols = t.columns.clone();
    if t.auto_generate_columns {
        if let Some(fields) = t.items.first().and_then(|r| r.values.as_object()) {
            let order = if t.items[0].fields.is_empty() {
                fields.keys().cloned().collect::<Vec<_>>()
            } else {
                t.items[0].fields.as_ref().clone()
            };
            for key in &order {
                let Some(value) = fields.get(key) else {
                    continue;
                };
                if key == "id" || cols.iter().any(|c| c.field == *key) {
                    continue;
                }
                cols.push(Column {
                    key: key.clone(),
                    field: key.clone(),
                    header: key.clone(),
                    kind: match value {
                        Value::Bool(_) => TableViewColumnKind::CheckBox,
                        Value::Number(_) => TableViewColumnKind::Number,
                        _ => TableViewColumnKind::Text,
                    },
                    ..Default::default()
                });
            }
        }
    }
    cols
}
pub fn columns(t: &TableProperties) -> Vec<Column> {
    all_columns(t).into_iter().filter(|c| c.visible).collect()
}
fn operation<'a>(row: &'a Row, col: &Column) -> &'a Value {
    row.operations.as_ref().and_then(|operations| operations.get(&col.key)).unwrap_or_else(|| {
        path(
            &row.values,
            col.sort_member_path.as_deref().unwrap_or(&col.field),
        )
    })
}
pub fn view(t: &TableProperties, cols: &[Column]) -> Vec<usize> {
    if t.search.is_empty() && t.filters.is_empty() && t.sorts.is_empty() {
        return (0..t.items.len()).collect();
    }
    let search = t.search.to_lowercase();
    let filters = t
        .filters
        .iter()
        .map(|f| {
            (
                f,
                f.values
                    .as_ref()
                    .map(|values| values.iter().map(value_key).collect::<HashSet<_>>()),
            )
        })
        .collect::<Vec<_>>();
    let mut rows = (0..t.items.len())
        .filter(|&i| {
            let row = &t.items[i];
            (search.is_empty()
                || cols.iter().any(|c| {
                    text(path(&row.values, &c.field))
                        .to_lowercase()
                        .contains(&search)
                }))
                && filters.iter().all(|(f, allowed)| {
                    cols.iter().find(|c| c.key == f.column).is_none_or(|c| {
                        let v = operation(row, c);
                        allowed
                            .as_ref()
                            .is_none_or(|values| values.contains(&value_key(v)))
                            && (f.search.is_empty()
                                || text(v).to_lowercase().contains(&f.search.to_lowercase()))
                    })
                })
        })
        .collect::<Vec<_>>();
    rows.sort_by(|&a, &b| {
        for s in &t.sorts {
            if let Some(c) = cols.iter().find(|c| c.key == s.column) {
                let a = operation(&t.items[a], c);
                let b = operation(&t.items[b], c);
                let cmp = match (a, b) {
                    (Value::Null, Value::Null) => std::cmp::Ordering::Equal,
                    (Value::Null, _) => std::cmp::Ordering::Less,
                    (_, Value::Null) => std::cmp::Ordering::Greater,
                    (Value::Number(a), Value::Number(b)) => a
                        .as_f64()
                        .partial_cmp(&b.as_f64())
                        .unwrap_or(std::cmp::Ordering::Equal),
                    (Value::Bool(a), Value::Bool(b)) => a.cmp(b),
                    _ => text(a).to_lowercase().cmp(&text(b).to_lowercase()),
                };
                let cmp = if s.direction == TableViewSortDirection::Descending {
                    cmp.reverse()
                } else {
                    cmp
                };
                if !cmp.is_eq() {
                    return cmp;
                }
            }
        }
        std::cmp::Ordering::Equal
    });
    rows
}
pub fn csv(
    t: &TableProperties,
    cols: &[Column],
    indices: &[usize],
    selected: bool,
    headers: bool,
    separator: char,
) -> String {
    let escape = |s: String| {
        if s.contains([separator, '"', '\r', '\n']) {
            format!("\"{}\"", s.replace('"', "\"\""))
        } else {
            s
        }
    };
    let cells: BTreeSet<_> = t.selected_cells.iter().cloned().collect();
    let used = cols
        .iter()
        .filter(|c| {
            !selected || t.selected_keys.len() > 0 || cells.iter().any(|s| s.column == c.key)
        })
        .collect::<Vec<_>>();
    let mut out = vec![];
    if headers {
        out.push(
            used.iter()
                .map(|c| escape(c.header.clone()))
                .collect::<Vec<_>>()
                .join(&separator.to_string()),
        );
    }
    for &i in indices {
        let row = &t.items[i];
        let whole = t.selected_keys.contains(&row.id);
        if selected && !whole && !cells.iter().any(|s| s.row == row.id) {
            continue;
        }
        out.push(
            used.iter()
                .map(|c| {
                    if selected
                        && !whole
                        && !cells.contains(&Cell {
                            row: row.id.clone(),
                            column: c.key.clone(),
                        })
                    {
                        return String::new();
                    }
                    escape(row.clipboard.as_ref().and_then(|clipboard| clipboard.get(&c.key)).cloned().unwrap_or_else(|| {
                        text(path(
                            &row.values,
                            c.clipboard_member_path.as_deref().unwrap_or(&c.field),
                        ))
                    }))
                })
                .collect::<Vec<_>>()
                .join(&separator.to_string()),
        );
    }
    out.join("\r\n")
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Slot {
    pub id: u32,
    pub row: String,
    pub column: String,
    pub index: usize,
    pub view_index: usize,
    pub role: String,
    pub editing: bool,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HeaderSlot {
    pub id: u32,
    pub column: String,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BodyMotion {
    pub body_opacity: f64,
    pub body_offset_y: f64,
}
/// Stable view identities are shared between frames. The browser wire omits
/// unchanged keys while the public SDK continues to expose the full view.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TableSnapshot {
    pub groups: Vec<GroupDescription>,
    pub realized_groups: Vec<GroupInfo>,
    pub group_count: usize,
    pub is_grouped: bool,
    pub header_slots: Vec<HeaderSlot>,
    pub columns: Vec<Column>,
    pub column_widths: Vec<f64>,
    pub realized: Vec<Slot>,
    #[serde(skip_serializing_if = "unchanged_view_keys")]
    pub view_keys: Arc<Vec<String>>,
    pub total_count: usize,
    pub filtered_count: usize,
    pub selected_keys: Vec<String>,
    pub selected_cells: Vec<Cell>,
    pub current_cell: Option<Cell>,
    pub editing_cell: Option<Cell>,
    pub expanded_rows: Vec<String>,
    pub motion: Option<BodyMotion>,
    pub sorts: Vec<Sort>,
    pub filters: Vec<Filter>,
    pub page_index: usize,
    pub page_count: usize,
    pub scroll: Option<super::scroll::ScrollSnapshot>,
}

#[cfg(target_arch = "wasm32")]
pub(crate) fn omitted_view_keys() -> &'static Arc<Vec<String>> {
    static OMITTED: std::sync::OnceLock<Arc<Vec<String>>> = std::sync::OnceLock::new();
    OMITTED.get_or_init(Arc::default)
}

fn unchanged_view_keys(keys: &Arc<Vec<String>>) -> bool {
    #[cfg(target_arch = "wasm32")]
    return Arc::ptr_eq(keys, omitted_view_keys());
    #[cfg(not(target_arch = "wasm32"))]
    { let _ = keys; false }
}
#[derive(Clone)]
struct Pending {
    request: u32,
    action: String,
    data: Value,
}
#[derive(Clone, PartialEq)]
struct LayoutKey {
    inner: Rect,
    version: u64,
    theme: Theme,
    enabled: bool,
    visible: bool,
    dpr: f64,
    horizontal_offset: f64,
    group_scroll_y: f64,
    realized_rows: [usize; 2],
}
#[derive(Default)]
pub struct TableState {
    group_entries: Vec<grouping::Entry>,
    group_headers: Vec<grouping::Header>,
    group_realized: Vec<GroupInfo>,
    group_nodes: HashMap<String, u32>,
    group_overrides: HashMap<String, bool>,
    group_descriptions: Vec<GroupDescription>,
    group_extent: f64,
    row_draw_cache: Option<RowDrawCache>,
    view_keys: Arc<Vec<String>>,
    layout_key: Option<LayoutKey>,
    pointer_slot: Option<Slot>,
    pub(super) layout_bounds: Option<Rect>,
    pub(super) owner: Option<u32>,
    pub(super) role: String,
    pub(super) cell_clip: Option<Rect>,
    cell: Option<Cell>,
    content_kind: String,
    body: Option<u32>,
    canvas: Option<u32>,
    header: Option<u32>,
    corner: Option<u32>,
    menu: Option<u32>,
    pub slots: Vec<Slot>,
    pub cols: Vec<Column>,
    pub order: Vec<usize>,
    pub all_order: Vec<usize>,
    widths: Vec<f64>,
    row_offsets: Arc<Vec<f64>>,
    row_offsets_key: Option<(u64, f64, usize)>,
    header_buttons: Vec<(u32, String, bool)>,
    rows: Vec<(String, u32)>,
    row_key: String,
    row_selected: bool,
    row_visual_initialized: bool,
    row_background: Option<BrushValue>,
    pub(super) row_indicator_opacity: crate::animation::Motion,
    pub(super) row_indicator_scale: crate::animation::Motion,
    pub(super) body_opacity: crate::animation::Motion,
    pub(super) body_offset_y: crate::animation::Motion,
    queued: std::collections::VecDeque<(EventKind, String, Value)>,
    source: Option<Arc<Vec<Row>>>,
    shape: String,
    visual: String,
    editing: Option<Cell>,
    editor: Option<u32>,
    // Native EndCellEditing must succeed before navigation or another click proceeds.
    after_commit: Option<(Cell, bool, bool)>,
    anchor: Option<Cell>,
    pending: Option<Pending>,
    next_request: u32,
    ctrl: bool,
    shift: bool,
    last_tap: Option<(Cell, f64)>,
    touch_candidate: Option<(i32, Cell, bool, [f64; 2], NodeKind)>,
    editor_touch: Option<(i32, u32, [f64; 2])>,
    drag: Option<(i32, usize, f64, f64, bool)>,
    drag_ghost: Option<(f64, std::sync::Arc<Vec<crate::render::Draw>>)>,
    row_drag: Option<(i32, String, f64)>,
    select_drag: Option<(i32, Cell, bool, [f64; 2], [f64; 2])>,
    select_scroll_origin: [f64; 2],
    auto_scroll_delta: [f64; 2],
    pub(super) auto_scroll_next: Option<f64>,
    menu_column: Option<String>,
    filter_search: Option<u32>,
    filter_list: Option<u32>,
    filter_entries: Vec<(String, Value, String)>,
    filter_selected: HashSet<String>,
    filter_all: Option<u32>,
}

#[derive(PartialEq)]
struct RowDrawKey {
    layout: Option<LayoutKey>,
    raster: [f64; 6],
    dpr: f64,
    theme: Theme,
    foreground: String,
    hovered_slot: Option<u32>,
    captured: Option<(i32, u32)>,
    focused: Option<u32>,
    policy: [bool; 2],
    states: Vec<(u32, u64, ControlState, bool, Option<bool>, bool)>,
}
struct RowDrawCache {
    key: RowDrawKey,
    commands: Arc<Vec<crate::render::Draw>>,
}
