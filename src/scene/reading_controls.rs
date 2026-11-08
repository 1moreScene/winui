//! Five controls backed by the shared Rust scene; callers supply data only.
//! Pinned source: references/reading-controls-sources.json.
use super::*;
use crate::{
    render::Draw,
    typography::{Font, TextMeasurer},
};
use serde_json::{json, Value};
use unicode_segmentation::UnicodeSegmentation;
mod advanced;
mod rich;

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct RichRun {
    pub text: String,
    pub inline: Option<String>,
    pub font_size: Option<f64>,
    pub font_weight: Option<u16>,
    pub font_style: Option<FontStyle>,
    pub foreground: Option<BrushValue>,
    pub underline: bool,
    pub strikethrough: bool,
    pub link: Option<String>,
}
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct Paragraph {
    pub runs: Vec<RichRun>,
    pub margin: [f64; 4],
}
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct TextRange {
    pub start_index: usize,
    pub length: usize,
}
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct TextHighlighter {
    pub background: Option<BrushValue>,
    pub foreground: Option<BrushValue>,
    pub ranges: Vec<TextRange>,
}
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct Annotation {
    pub text: String,
    pub scroll_offset: f64,
    pub item_index: Option<usize>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct ReadingProperties {
    pub text_alignment: TextAlignment,
    pub is_text_selection_enabled: bool,
    pub text_highlighters: Vec<TextHighlighter>,
    pub overflow_content_target: Option<u32>,
    pub first_button_command: Option<u32>,
    pub previous_button_command: Option<u32>,
    pub next_button_command: Option<u32>,
    pub last_button_command: Option<u32>,
    pub pager_input_command: Option<u32>,
    pub first_button_style: Value,
    pub previous_button_style: Value,
    pub next_button_style: Value,
    pub last_button_style: Value,
    pub number_button_style: Value,
    pub has_label_template: bool,
    pub has_detail_template: bool,
    pub label_style: Value,
    pub item_aspect_ratios: Vec<f64>,

    pub display_mode: PagerControlDisplayMode,
    pub number_of_pages: i32,
    pub selected_page_index: i32,
    pub first_button_visibility: PagerControlButtonVisibility,
    pub previous_button_visibility: PagerControlButtonVisibility,
    pub next_button_visibility: PagerControlButtonVisibility,
    pub last_button_visibility: PagerControlButtonVisibility,
    pub button_panel_always_show_first_last_page_index: bool,
    pub prefix_text: String,
    pub suffix_text: String,
    pub labels: Vec<Annotation>,
    pub minimum: f64,
    pub maximum: f64,
    pub viewport_size: f64,
    pub value: f64,
    pub small_change: f64,
    pub featured_spacing: Option<f64>,
    pub scroll_target: Option<u32>,
    pub label_item_source: Option<u32>,
    pub paragraphs: Vec<Paragraph>,
    pub layout: Option<repeater::RepeaterLayout>,
}
impl Default for ReadingProperties {
    fn default() -> Self {
        Self {
            text_alignment: Default::default(),
            is_text_selection_enabled: true,
            text_highlighters: vec![],
            overflow_content_target: None,
            first_button_command: None,
            previous_button_command: None,
            next_button_command: None,
            last_button_command: None,
            pager_input_command: None,
            first_button_style: Value::Null,
            previous_button_style: Value::Null,
            next_button_style: Value::Null,
            last_button_style: Value::Null,
            number_button_style: Value::Null,
            has_label_template: false,
            has_detail_template: false,
            label_style: Value::Null,
            item_aspect_ratios: vec![],
            display_mode: Default::default(),
            number_of_pages: 0,
            selected_page_index: 0,
            first_button_visibility: Default::default(),
            previous_button_visibility: Default::default(),
            next_button_visibility: Default::default(),
            last_button_visibility: Default::default(),
            button_panel_always_show_first_last_page_index: true,
            prefix_text: "Page".into(),
            suffix_text: String::new(),
            labels: vec![],
            minimum: 0.,
            maximum: 0.,
            viewport_size: 0.,
            value: 0.,
            small_change: 0.,
            featured_spacing: None,
            scroll_target: None,
            label_item_source: None,
            paragraphs: vec![],
            layout: None,
        }
    }
}
#[derive(Clone)]
struct Fragment {
    start: usize,
    end: usize,
    rtl: bool,
    inline: Option<u32>,
    text: String,
    font: Font,
    color: Option<BrushValue>,
    underline: bool,
    strike: bool,
    link: Option<String>,
    rect: Rect,
    baseline: f64,
}
#[derive(Default)]
pub struct ReadingState {
    pub(super) inline_nodes: HashMap<String, u32>,
    rich_source: Option<u32>,
    rich_start: usize,
    rich_end: usize,
    rich_text: String,
    rich_drag: Option<(i32, usize)>,
    rich_selection: (usize, usize),
    pub(super) item_slots: Vec<Rect>,
    label_slots: Vec<(u32, usize)>,
    tooltip: Option<u32>,
    tooltip_anchor: Option<u32>,
    detail_text: Option<u32>,
    detail_slot: Option<u32>,
    detail_request: Option<u32>,
    hover_point: Option<f64>,
    template_signature: String,
    pub next_wake: Option<f64>,
    repeat_direction: f64,

    signature: String,
    parts: Vec<(u32, String, i32)>,
    slots: Vec<(u32, Rect)>,
    fragments: Vec<Fragment>,
    pub labels: Vec<(String, Rect)>,
    pub thumb: Rect,
    pub rail: Rect,
    pub hover: Option<f64>,
    drag: Option<i32>,
    pressed_link: Option<(i32, String)>,
    pending: Option<(u32, f64)>,
    next_request: u32,
    last_page: Option<i32>,
    template_error: Option<String>,
    pub last_invoke: Option<(usize, f64)>,
}
pub fn props(p: &NodeProperties) -> ReadingProperties {
    p.reading.as_deref().cloned().unwrap_or_default()
}
pub fn defaults(k: NodeKind, p: &mut NodeProperties) {
    if matches!(
        k,
        NodeKind::PagerControl
            | NodeKind::AnnotatedScrollBar
            | NodeKind::LayoutPanel
            | NodeKind::RichTextBlock
            | NodeKind::RichTextBlockOverflow
            | NodeKind::ItemsView
    ) {
        p.reading = Some(Box::default());
    }
    match k {
        NodeKind::PagerControl => {
            p.is_tab_stop = false;
            p.horizontal_alignment = HorizontalAlignment::Stretch;
            p.vertical_alignment = VerticalAlignment::Top;
        }
        NodeKind::LayoutPanel => {
            p.is_tab_stop = false;
        }
        NodeKind::RichTextBlock | NodeKind::RichTextBlockOverflow => {
            p.is_tab_stop = false;
            p.wrap = true;
            p.clip = true;
        }
        NodeKind::AnnotatedScrollBar => {
            p.is_tab_stop = false;
            p.min_width = metric("LabelsGridMinWidth");
            p.clip = true;
        }
        _ => {}
    }
}
pub fn validate(p: &NodeProperties) -> Result<(), String> {
    let Some(q) = p.reading.as_deref() else {
        return Ok(());
    };
    if q.featured_spacing
        .is_some_and(|s| !s.is_finite() || s < 0. || s > 1e4)
    {
        return Err("Invalid featured layout spacing".into());
    }
    if q.number_of_pages < -1 || q.number_of_pages > 1_000_000 || q.selected_page_index < 0 {
        return Err("Invalid pager count/index".into());
    }
    if [
        q.minimum,
        q.maximum,
        q.viewport_size,
        q.value,
        q.small_change,
    ]
    .iter()
    .any(|v| !v.is_finite() || v.abs() > 1e12)
        || q.maximum < q.minimum
        || q.viewport_size < 0.
        || q.small_change < 0.
    {
        return Err("Invalid annotated scroll range".into());
    }
    if q.labels.len() > 10000
        || q.labels
            .iter()
            .any(|a| !a.scroll_offset.is_finite() || a.text.len() > 10000)
    {
        return Err("Invalid annotations".into());
    }
    if q.paragraphs.len() > 10000
        || q.paragraphs.iter().map(|p| p.runs.len()).sum::<usize>() > 10000
        || q.paragraphs
            .iter()
            .flat_map(|p| &p.runs)
            .map(|r| r.text.len())
            .sum::<usize>()
            > 1_000_000
    {
        return Err("Rich text budget exceeded".into());
    }
    for par in &q.paragraphs {
        if par.margin.iter().any(|v| !v.is_finite() || v.abs() > 1e6) {
            return Err("Invalid paragraph margin".into());
        }
        for r in &par.runs {
            if r.font_size
                .is_some_and(|s| !s.is_finite() || s <= 0. || s > 512.)
                || r.font_weight.is_some_and(|w| !(1..=1000).contains(&w))
            {
                return Err("Invalid rich text font".into());
            }
            if let Some(c) = &r.foreground {
                c.validate()?;
            }
        }
    }
    if let Some(layout) = &q.layout {
        let rp = repeater::RepeaterProperties {
            layout: layout.clone(),
            ..Default::default()
        };
        rp.validate()?;
    }
    Ok(())
}
pub fn validate_for(_kind: NodeKind, p: &NodeProperties) -> Result<(), String> {
    if let Some(q) = p.reading.as_deref() {
        for style in [
            &q.first_button_style,
            &q.previous_button_style,
            &q.next_button_style,
            &q.last_button_style,
            &q.number_button_style,
        ] {
            if !style.is_null() {
                properties::patch(
                    &NodeProperties::defaults(NodeKind::Button),
                    style,
                    NodeKind::Button,
                )?;
            }
        }
        if !q.label_style.is_null() {
            properties::patch(
                &NodeProperties::defaults(NodeKind::TextBlock),
                &q.label_style,
                NodeKind::TextBlock,
            )?;
        }
        if q.item_aspect_ratios
            .iter()
            .any(|v| !v.is_finite() || *v <= 0. || *v > 1e4)
        {
            return Err("Invalid item aspect ratio".into());
        }
        for h in &q.text_highlighters {
            if [&h.background, &h.foreground]
                .into_iter()
                .flatten()
                .any(|b| matches!(b, BrushValue::Gradient(_)))
            {
                return Err("TextHighlighter requires a solid color brush".into());
            }
            if let Some(b) = &h.background {
                b.validate()?;
            }
            if let Some(b) = &h.foreground {
                b.validate()?;
            }
        }
    }
    Ok(())
}
fn contract() -> &'static Value {
    static C: std::sync::OnceLock<Value> = std::sync::OnceLock::new();
    C.get_or_init(|| {
        serde_json::from_str(include_str!(
            "../../references/reading-controls-template.json"
        ))
        .unwrap()
    })
}
fn metric(k: &str) -> f64 {
    contract()["metrics"][k].as_f64().unwrap()
}
fn color(theme: Theme, k: &str) -> String {
    contract()["palettes"][theme.as_str()][k]["color"]
        .as_str()
        .unwrap()
        .into()
}
fn mode(q: &ReadingProperties) -> PagerControlDisplayMode {
    if q.display_mode == PagerControlDisplayMode::Auto {
        if q.number_of_pages >= 0 && q.number_of_pages < 10 {
            PagerControlDisplayMode::ComboBox
        } else {
            PagerControlDisplayMode::NumberBox
        }
    } else {
        q.display_mode
    }
}
fn page(q: &ReadingProperties) -> i32 {
    if q.number_of_pages > 0 {
        q.selected_page_index.min(q.number_of_pages - 1)
    } else {
        q.selected_page_index
    }
}
fn page_numbers(q: &ReadingProperties) -> Vec<i32> {
    let n = q.number_of_pages;
    let p = page(q);
    if n >= 0 && n <= 7 {
        return (0..n).collect();
    }
    if n < 0 {
        return if p < 3 {
            (0..5).collect()
        } else {
            vec![0, -1, p - 1, p, p + 1]
        };
    }
    if p < 4 {
        let mut v = (0..5).collect::<Vec<_>>();
        if q.button_panel_always_show_first_last_page_index {
            v.extend([-1, n - 1])
        }
        return v;
    }
    if p >= n - 4 {
        let mut v = vec![];
        if q.button_panel_always_show_first_last_page_index {
            v.extend([0, -1])
        }
        v.extend(n - 5..n);
        return v;
    }
    let mut v = vec![];
    if q.button_panel_always_show_first_last_page_index {
        v.extend([0, -1])
    }
    v.extend([p - 1, p, p + 1]);
    if q.button_panel_always_show_first_last_page_index {
        v.extend([-1, n - 1])
    }
    v
}
pub(super) fn item_gaps(p: &NodeProperties) -> [f64; 2] {
    match p.reading.as_deref().and_then(|p| p.layout.as_ref()) {
        Some(repeater::RepeaterLayout::StackLayout(l)) => {
            if l.orientation == Orientation::Vertical {
                [0., l.spacing]
            } else {
                [l.spacing, 0.]
            }
        }
        Some(repeater::RepeaterLayout::UniformGridLayout(l)) => {
            [l.min_column_spacing, l.min_row_spacing]
        }
        _ => [0.; 2],
    }
}

impl Scene {
    pub(super) fn sync_reading(&mut self) {
        self.sync_advanced_reading();
        self.pump_reading_events();
        let ids = self
            .nodes
            .values()
            .filter(|n| {
                matches!(
                    n.kind,
                    NodeKind::ItemsView | NodeKind::PagerControl | NodeKind::AnnotatedScrollBar
                )
            })
            .map(|n| n.id)
            .collect::<Vec<_>>();
        for id in ids {
            let q = props(&self.nodes[&id].props);
            if !self.effective_enabled(id) {
                self.nodes.get_mut(&id).unwrap().reading.drag = None;
                self.nodes.get_mut(&id).unwrap().reading.pending = None;
                if self.captured.is_some_and(|c| c.1 == id) {
                    self.captured = None;
                }
            }
            if self.nodes[&id].kind == NodeKind::ItemsView {
                let signature = serde_json::to_string(&q.layout).unwrap();
                if self.nodes[&id].reading.signature != signature {
                    self.nodes.get_mut(&id).unwrap().reading.item_slots.clear();
                    let p = &mut self.nodes.get_mut(&id).unwrap().props;
                    match &q.layout {
                        Some(repeater::RepeaterLayout::UniformGridLayout(l)) => {
                            p.items_panel = Some(NodeKind::ItemsWrapGrid);
                            p.orientation = l.orientation;
                            p.item_width = l.min_item_width;
                            p.item_height = l.min_item_height;
                            p.maximum_rows_or_columns = if l.maximum_rows_or_columns > 4096 {
                                -1
                            } else {
                                l.maximum_rows_or_columns.max(1) as i32
                            };
                        }
                        Some(repeater::RepeaterLayout::StackLayout(l)) => {
                            p.items_panel = Some(NodeKind::ItemsStackPanel);
                            p.orientation = l.orientation;
                            p.item_width = None;
                            p.item_height = None;
                        }
                        Some(repeater::RepeaterLayout::LinedFlowLayout(_)) => {
                            p.items_panel = Some(NodeKind::ItemsWrapGrid);
                            p.orientation = Orientation::Horizontal;
                            p.item_width = None;
                            p.item_height = None;
                            p.maximum_rows_or_columns = -1;
                        }
                        _ => {
                            p.items_panel = Some(NodeKind::ItemsStackPanel);
                            p.orientation = Orientation::Vertical;
                            p.item_width = None;
                            p.item_height = None;
                        }
                    }
                    self.nodes.get_mut(&id).unwrap().reading.signature = signature;
                    self.invalidate(id, true);
                }
                continue;
            }
            if self.nodes[&id].kind == NodeKind::AnnotatedScrollBar {
                if let Some(target) = q.scroll_target.filter(|t| self.nodes.contains_key(t)) {
                    let n = &self.nodes[&target];
                    let max =
                        (n.scroll.extent[1] * n.props.zoom_factor - n.scroll.viewport[1]).max(0.);
                    let value = n.scroll.offsets(self.time)[1];
                    let viewport = n.scroll.viewport[1];
                    let q = self
                        .nodes
                        .get_mut(&id)
                        .unwrap()
                        .props
                        .reading
                        .as_mut()
                        .unwrap();
                    if (q.maximum, q.value, q.viewport_size) != (max, value, viewport) {
                        q.minimum = 0.;
                        q.maximum = max;
                        q.value = value;
                        q.viewport_size = viewport;
                        self.invalidate(id, true);
                    }
                }
                continue;
            }
            let selected = page(&q);
            let previous = self.nodes[&id].reading.last_page;
            self.nodes
                .get_mut(&id)
                .unwrap()
                .props
                .reading
                .as_mut()
                .unwrap()
                .selected_page_index = selected;
            if previous.is_some_and(|p| p != selected) {
                self.emit(id, EventKind::SelectedIndexChanged);
                let e = self.events.last_mut().unwrap();
                e.selected_index = Some(selected);
                e.payload = Some(json!({"previousPageIndex":previous,"newPageIndex":selected}));
            }
            self.nodes.get_mut(&id).unwrap().reading.last_page = Some(selected);
            let q = props(&self.nodes[&id].props);
            let gates = [
                q.first_button_command,
                q.previous_button_command,
                q.next_button_command,
                q.last_button_command,
                q.pager_input_command,
            ]
            .map(|c| c.map(|id| self.command_can_execute(id, &mut vec![]).unwrap_or(false)));
            let signature = serde_json::to_string(&(&q, gates)).unwrap();
            if self.nodes[&id].reading.signature == signature {
                continue;
            }
            // Retain stable parts while the mode/number panel topology stays the same.
            let existing = std::mem::take(&mut self.nodes.get_mut(&id).unwrap().reading.parts);
            let mut desired: Vec<(String, i32, NodeKind, Value)> = vec![];
            for (role, visibility, index, glyph) in [
                ("first", q.first_button_visibility, 0, "\u{e892}"),
                (
                    "previous",
                    q.previous_button_visibility,
                    selected - 1,
                    "\u{e76b}",
                ),
            ] {
                if visibility != PagerControlButtonVisibility::Hidden
                    && !(role == "last" && q.number_of_pages < 0)
                {
                    desired.push((role.into(),index,NodeKind::Button,json!({"text":glyph,"fontFamily":"Segoe Fluent Icons","width":metric("pagerNavigationSize"),"height":metric("pagerNavigationSize"),"padding":[0,0,0,0],"variant":"Subtle","enabled":selected>0,"opacity":if selected==0&&visibility==PagerControlButtonVisibility::HiddenOnEdge{0.}else{1.},"accessibleName":if role=="first"{"First page"}else{"Previous page"}})))
                }
            }
            if mode(&q) == PagerControlDisplayMode::ButtonPanel {
                for (i, p) in page_numbers(&q).into_iter().enumerate() {
                    desired.push((format!("page:{i}"),p,if p<0{NodeKind::SymbolIcon}else{NodeKind::Button},json!({"text":(p+1).to_string(),"symbol":"More","width":if p<0{Some(20.)}else{None},"minWidth":if p<0{20.}else{32.},"height":32,"padding":[11,0,11,0],"variant":"Subtle","accessibleName":format!("Page {}",p+1)})))
                }
            } else {
                desired.push((
                    "prefix".into(),
                    -1,
                    NodeKind::TextBlock,
                    json!({"text":q.prefix_text,"margin":[5,0,5,0]}),
                ));
                if mode(&q) == PagerControlDisplayMode::ComboBox {
                    let count = if q.number_of_pages > 0 {
                        q.number_of_pages
                    } else {
                        ((selected / 100) + 1).saturating_mul(100)
                    };
                    desired.push(("input".into(),-1,NodeKind::ComboBox,json!({"collectionItems":(1..=count).map(|p|json!({"id":p.to_string(),"text":p.to_string()})).collect::<Vec<_>>(),"selectedIndex":selected,"width":metric("pagerInputWidth"),"accessibleName":"Page"})));
                } else {
                    desired.push(("input".into(),-1,NodeKind::NumberBox,json!({"minWidth":metric("pagerInputWidth"),"numberValue":selected+1,"minimum":1,"maximum":if q.number_of_pages>0{q.number_of_pages}else{i32::MAX},"width":metric("pagerInputWidth"),"accessibleName":"Page"})));
                }
                if q.number_of_pages > 0 {
                    desired.push(("suffix".into(),-1,NodeKind::TextBlock,json!({"text":if q.suffix_text.is_empty(){"of".into()}else{q.suffix_text.clone()},"margin":[5,0,0,0]})));
                    desired.push((
                        "total".into(),
                        -1,
                        NodeKind::TextBlock,
                        json!({"text":q.number_of_pages.to_string(),"margin":[5,0,5,0]}),
                    ));
                }
            }
            for (role, visibility, index, glyph) in [
                ("next", q.next_button_visibility, selected + 1, "\u{e76c}"),
                (
                    "last",
                    q.last_button_visibility,
                    q.number_of_pages - 1,
                    "\u{e893}",
                ),
            ] {
                let edge = q.number_of_pages > 0 && selected >= q.number_of_pages - 1
                    || role == "last" && q.number_of_pages <= 0;
                if visibility != PagerControlButtonVisibility::Hidden
                    && !(role == "last" && q.number_of_pages < 0)
                {
                    desired.push((role.into(),index,NodeKind::Button,json!({"text":glyph,"fontFamily":"Segoe Fluent Icons","width":metric("pagerNavigationSize"),"height":metric("pagerNavigationSize"),"padding":[0,0,0,0],"variant":"Subtle","enabled":!edge,"opacity":if edge&&visibility==PagerControlButtonVisibility::HiddenOnEdge{0.}else{1.},"accessibleName":if role=="next"{"Next page"}else{"Last page"}})))
                }
            }
            let mut parts = vec![];
            let mut reused = std::collections::HashSet::new();
            for (role, index, kind, mut patch) in desired {
                let style = match role.as_str() {
                    "first" => &q.first_button_style,
                    "previous" => &q.previous_button_style,
                    "next" => &q.next_button_style,
                    "last" => &q.last_button_style,
                    _ => &q.number_button_style,
                };
                if kind == NodeKind::Button {
                    if let Some(style) = style.as_object() {
                        for (k, v) in style {
                            patch.as_object_mut().unwrap().insert(k.clone(), v.clone());
                        }
                    }
                    let command = match role.as_str() {
                        "first" => q.first_button_command,
                        "previous" => q.previous_button_command,
                        "next" => q.next_button_command,
                        "last" => q.last_button_command,
                        _ => None,
                    };
                    if let Some(command) = command {
                        if !self
                            .command_can_execute(command, &mut vec![])
                            .unwrap_or(false)
                        {
                            patch["enabled"] = json!(false);
                        }
                    }
                }

                if role == "input" {
                    patch["enabled"] = json!(q
                        .pager_input_command
                        .is_none_or(|c| self.command_can_execute(c, &mut vec![]).unwrap_or(false)));
                }
                let old = existing
                    .iter()
                    .find(|(cid, r, _)| {
                        r == &role && self.nodes.get(cid).is_some_and(|n| n.kind == kind)
                    })
                    .map(|v| v.0);
                let child = if let Some(cid) = old {
                    reused.insert(cid);
                    if let Err(error) = self.update(vec![Update { id: cid, patch }]) {
                        self.nodes.get_mut(&id).unwrap().reading.template_error = Some(error);
                    }
                    Some(cid)
                } else {
                    match self.create(id, kind, patch) {
                        Ok(cid) => Some(cid),
                        Err(error) => {
                            self.nodes.get_mut(&id).unwrap().reading.template_error = Some(error);
                            None
                        }
                    }
                };
                if let Some(cid) = child {
                    parts.push((cid, role, index));
                }
            }
            for (cid, _, _) in existing {
                if !reused.contains(&cid) && self.nodes.contains_key(&cid) {
                    let _ = self.destroy(cid);
                }
            }
            let state = &mut self.nodes.get_mut(&id).unwrap().reading;
            state.parts = parts;
            state.signature = signature;
            self.invalidate(id, true);
        }
    }
    pub(super) fn pump_reading_events(&mut self) {
        let events = self
            .events
            .iter_mut()
            .filter(|e| !e.reading_processed)
            .map(|e| {
                e.reading_processed = true;
                e.clone()
            })
            .collect::<Vec<_>>();
        for e in events {
            let Some(parent) = self.nodes.get(&e.target).and_then(|n| n.parent) else {
                continue;
            };
            if self.nodes[&parent].kind != NodeKind::PagerControl {
                continue;
            }
            let part = self.nodes[&parent]
                .reading
                .parts
                .iter()
                .find(|p| p.0 == e.target)
                .cloned();
            if let Some((_, role, index)) = part {
                let selected = if e.kind == EventKind::Click && index >= 0 {
                    Some(index)
                } else if role == "input" && e.kind == EventKind::SelectionChanged {
                    e.selected_index.or_else(|| {
                        e.payload
                            .as_ref()
                            .and_then(|p| p["selectedIndex"].as_i64())
                            .map(|v| v as i32)
                    })
                } else if role == "input" && e.kind == EventKind::ValueChanged {
                    e.value
                        .or_else(|| e.payload.as_ref().and_then(|p| p["newValue"].as_f64()))
                        .map(|v| v as i32 - 1)
                } else {
                    None
                };
                if let Some(selected) = selected {
                    let q = self
                        .nodes
                        .get_mut(&parent)
                        .unwrap()
                        .props
                        .reading
                        .as_mut()
                        .unwrap();
                    q.selected_page_index = selected.max(0);
                    let command = match role.as_str() {
                        "first" => q.first_button_command,
                        "previous" => q.previous_button_command,
                        "next" => q.next_button_command,
                        "last" => q.last_button_command,
                        "input" => q.pager_input_command,
                        _ => None,
                    };
                    if let Some(command) = command {
                        let _ = self.request_execute(command, json!(selected));
                    }
                    self.invalidate(parent, true);
                }
            }
        }
    }
    pub(super) fn measure_reading(
        &mut self,
        id: u32,
        a: [f64; 2],
        m: &mut impl TextMeasurer,
    ) -> [f64; 2] {
        match self.nodes[&id].kind {
            NodeKind::PagerControl => {
                let parts = self.nodes[&id].reading.parts.clone();
                let mut size = [0_f64; 2];
                for (i, (cid, role, _)) in parts.iter().enumerate() {
                    let d = self.measure_node(*cid, a, m);
                    size[0] += d[0];
                    if role.starts_with("page:")
                        && i + 1 < parts.len()
                        && parts[i + 1].1.starts_with("page:")
                    {
                        size[0] += metric("pagerNumberSpacing");
                    }
                    size[1] = size[1].max(d[1]);
                }
                size[0] += metric("pagerSpacing") * parts.len().saturating_sub(1) as f64;
                size
            }
            NodeKind::LayoutPanel => self.measure_layout_host(id, a, m),
            NodeKind::RichTextBlock | NodeKind::RichTextBlockOverflow => {
                self.measure_rich(id, a[0], m)
            }
            NodeKind::AnnotatedScrollBar => {
                let q = props(&self.nodes[&id].props);
                let mut label_props = self.nodes[&id].props.clone();
                label_props.margin = [0., -5., 0., -2.];
                if !q.label_style.is_null() {
                    label_props =
                        properties::patch(&label_props, &q.label_style, NodeKind::TextBlock)
                            .unwrap_or(label_props);
                }
                let f = label_props.font();
                let width = q
                    .labels
                    .iter()
                    .map(|l| {
                        m.measure(&l.text, &f).width + label_props.margin[0] + label_props.margin[2]
                    })
                    .fold(metric("LabelsGridMinWidth"), f64::max);
                [width, a[1].min(200.)]
            }
            _ => [0.; 2],
        }
    }
    fn measure_layout_host(&mut self, id: u32, a: [f64; 2], m: &mut impl TextMeasurer) -> [f64; 2] {
        let q = props(&self.nodes[&id].props);
        let layout = q.layout;
        let children = self.ordered_children(id);
        let mut items = vec![];
        let mut sizes = HashMap::new();
        let mut desired = [0_f64; 2];
        if let Some(spacing) = q.featured_spacing {
            let width = if a[0].is_finite() { a[0] } else { 520. };
            let col = ((width - spacing) / 2.).max(0.);
            let mut sizes = vec![];
            for (i, c) in children.iter().enumerate() {
                sizes.push(self.measure_node(
                    *c,
                    [if i == 0 { width } else { col }, f64::INFINITY],
                    m,
                ));
            }
            let mut slots = vec![];
            let mut y = 0.;
            if let Some(c) = children.first() {
                slots.push((*c, Rect::new(0., 0., width, sizes[0][1])));
                y = sizes[0][1];
            }
            for i in (1..children.len()).step_by(2) {
                y += spacing;
                let h = sizes[i][1].max(sizes.get(i + 1).map(|s| s[1]).unwrap_or(0.));
                slots.push((children[i], Rect::new(0., y, col, h)));
                if i + 1 < children.len() {
                    slots.push((children[i + 1], Rect::new(col + spacing, y, col, h)));
                }
                y += h;
            }
            self.nodes.get_mut(&id).unwrap().reading.slots = slots;
            return [width, y];
        }

        for child in &children {
            let d=self.measure_node(*child,if matches!(layout,Some(repeater::RepeaterLayout::StackLayout(_))){let vertical=matches!(&layout,Some(repeater::RepeaterLayout::StackLayout(l))if l.orientation==Orientation::Vertical);if vertical{[a[0],f64::INFINITY]}else{[f64::INFINITY,a[1]]}}else{a},m);
            let key = child.to_string();
            items.push(collections::CollectionData {
                id: key.clone(),
                text: String::new(),
                enabled: true,
                group: None,
            });
            sizes.insert(key, d);
            desired = [desired[0].max(d[0]), desired[1].max(d[1])];
        }
        let (slots, extent) = if let Some(l) = layout {
            repeater::slots(&l, &items, &sizes, a)
        } else {
            (
                children
                    .iter()
                    .map(|_| Rect::new(0., 0., a[0], a[1]))
                    .collect(),
                desired,
            )
        };
        self.nodes.get_mut(&id).unwrap().reading.slots = children.into_iter().zip(slots).collect();
        extent
    }
    pub(super) fn arrange_reading(&mut self, id: u32, inner: Rect, m: &mut impl TextMeasurer) {
        let n = &self.nodes[&id];
        let world = n.world;
        let flags = (n.theme, n.enabled, n.visible);
        let kind = n.kind;
        if kind == NodeKind::PagerControl {
            let parts = n.reading.parts.clone();
            let mut x =
                inner.x + (inner.width - self.nodes[&id].desired_without_margin[0]).max(0.) / 2.;
            for (i, (cid, role, _)) in parts.iter().enumerate() {
                let cid = *cid;
                let d = self.nodes[&cid].desired;
                self.arrange_node(
                    cid,
                    Rect::new(x, inner.y + (inner.height - d[1]) / 2., d[0], d[1]),
                    world,
                    flags,
                    m,
                );
                x += d[0] + metric("pagerSpacing");
                if role.starts_with("page:")
                    && i + 1 < parts.len()
                    && parts[i + 1].1.starts_with("page:")
                {
                    x += metric("pagerNumberSpacing");
                }
            }
        }
        if kind == NodeKind::LayoutPanel {
            self.measure_layout_host(id, [inner.width, inner.height], m);
            let q = props(&self.nodes[&id].props);
            let layout = q.layout;
            let featured = q.featured_spacing.is_some();
            let slots = self.nodes[&id].reading.slots.clone();
            for (cid, mut r) in slots {
                if layout.is_none() && !featured {
                    r = inner
                } else {
                    r.x += inner.x;
                    r.y += inner.y
                }
                self.arrange_node(cid, r, world, flags, m);
            }
        }
        if matches!(
            kind,
            NodeKind::RichTextBlock | NodeKind::RichTextBlockOverflow
        ) {
            self.arrange_rich(id, inner, m);
        }
        if kind == NodeKind::AnnotatedScrollBar {
            self.arrange_annotation(id, inner, m);
        }
    }

    fn measure_rich(&mut self, id: u32, width: f64, m: &mut impl TextMeasurer) -> [f64; 2] {
        self.layout_rich(id, width, f64::INFINITY, m)
    }
    pub(super) fn paint_reading(&self, id: u32, out: &mut Vec<Draw>) {
        let n = &self.nodes[&id];
        if !matches!(
            n.kind,
            NodeKind::RichTextBlock
                | NodeKind::RichTextBlockOverflow
                | NodeKind::AnnotatedScrollBar
                | NodeKind::PagerControl
        ) {
            return;
        }
        let foreground = n
            .props
            .foreground
            .as_ref()
            .map(|c| Self::color(c, n.theme))
            .unwrap_or_else(|| color(n.theme, "TextFillColorPrimaryBrush"));
        if n.kind == NodeKind::PagerControl {
            let q = props(&n.props);
            if mode(&q) == PagerControlDisplayMode::ButtonPanel {
                if let Some((child, _, _)) = n
                    .reading
                    .parts
                    .iter()
                    .find(|(_, role, index)| role.starts_with("page:") && *index == page(&q))
                {
                    let r = self.nodes[child].rect;
                    out.push(Draw::Fill {
                        rect: Rect::new(r.x, n.rect.height - 2., r.width, 2.),
                        color: color(n.theme, "AccentFillColorDefaultBrush"),
                        radius: 1.,
                    });
                }
            }
        }
        if matches!(
            n.kind,
            NodeKind::RichTextBlock | NodeKind::RichTextBlockOverflow
        ) {
            self.paint_rich(id, out);
        }
        if n.kind == NodeKind::AnnotatedScrollBar {
            let mut label_props = n.props.clone();
            if !props(&n.props).label_style.is_null() {
                label_props = properties::patch(
                    &label_props,
                    &props(&n.props).label_style,
                    NodeKind::TextBlock,
                )
                .unwrap_or(label_props);
            }
            let label_color = label_props
                .foreground
                .as_ref()
                .map(|b| Self::color(b, n.theme))
                .unwrap_or(foreground.clone());
            for (text, r) in &n.reading.labels {
                if props(&n.props).has_label_template {
                    continue;
                }
                out.push(Draw::Text {
                    style: n.props.font_style,
                    x: r.x,
                    y: r.y + label_props.font_size,
                    text: text.clone(),
                    color: label_color.clone(),
                    size: label_props.font_size,
                    font: label_props.font_family.clone(),
                    max_width: r.width,
                    weight: label_props.font_weight,
                });
            }
            out.push(Draw::Fill {
                rect: n.reading.thumb,
                color: color(n.theme, "AccentFillColorDefaultBrush"),
                radius: metric("ThumbHeight") / 2.,
            });
            for (y, glyph) in [
                (0., "\u{eddb}"),
                (n.rect.height - metric("annotationButtonHeight"), "\u{eddc}"),
            ] {
                out.push(Draw::Text {
                    style: FontStyle::Normal,
                    x: n.rect.width - 19.,
                    y: y + 13.,
                    text: glyph.into(),
                    color: foreground.clone(),
                    size: 8.,
                    font: "Segoe Fluent Icons".into(),
                    max_width: 12.,
                    weight: 400,
                });
            }
        }
    }
    pub(super) fn reading_snapshot(&self, id: u32) -> Option<Value> {
        let n = &self.nodes[&id];
        match n.kind {
            NodeKind::ItemsView => Some(json!({"slots":n.reading.item_slots})),
            NodeKind::PagerControl => {
                let q = props(&n.props);
                Some(
                    json!({"templateError":n.reading.template_error,"displayMode":mode(&q),"selectedPageIndex":page(&q),"parts":n.reading.parts.iter().map(|(id,role,index)|json!({"id":id,"role":role,"index":index})).collect::<Vec<_>>()}),
                )
            }
            NodeKind::AnnotatedScrollBar => Some(
                json!({"thumb":n.reading.thumb,"rail":n.reading.rail,"labels":n.reading.labels,"hoverOffset":n.reading.hover,"labelSlots":n.reading.label_slots.iter().map(|(id,index)|json!({"id":id,"index":index})).collect::<Vec<_>>(),"detailSlot":n.reading.detail_slot}),
            ),
            NodeKind::RichTextBlock | NodeKind::RichTextBlockOverflow => {
                Some(self.rich_snapshot(id))
            }
            _ => None,
        }
    }
    fn request_annotation(
        &mut self,
        id: u32,
        offset: f64,
        kind: AnnotatedScrollBarScrollingEventKind,
    ) {
        let q = props(&self.nodes[&id].props);
        let offset = offset.clamp(q.minimum, q.maximum);
        let n = self.nodes.get_mut(&id).unwrap();
        n.reading.next_request = n.reading.next_request.wrapping_add(1);
        let request = n.reading.next_request;
        n.reading.pending = Some((request, offset));
        self.emit(id, EventKind::Scrolling);
        let e = self.events.last_mut().unwrap();
        e.request_id = Some(request);
        e.value = Some(offset);
        e.payload = Some(json!({"scrollOffset":offset,"scrollingEventKind":kind}));
    }
    pub(super) fn items_view_tap(&mut self, owner: u32, index: usize) -> bool {
        if self.nodes[&owner].kind != NodeKind::ItemsView {
            return true;
        }
        let last = self.nodes[&owner].reading.last_invoke;
        self.nodes.get_mut(&owner).unwrap().reading.last_invoke = Some((index, self.time));
        last.is_some_and(|(i, t)| i == index && self.time - t <= 500.)
    }
    pub(super) fn reading_input(&mut self, input: &Input) -> Result<bool, String> {
        if self.rich_input(input)? {
            return Ok(true);
        }
        if self.advanced_input(input)? {
            return Ok(true);
        }
        if let Input::Reading {
            id,
            action,
            index,
            offset,
            request,
            cancel,
        } = input
        {
            let n = self.get(*id)?;
            if !self.effective_enabled(*id) {
                return Ok(true);
            }
            match (action.as_str(), n.kind) {
                ("page", NodeKind::PagerControl) => {
                    self.nodes
                        .get_mut(id)
                        .unwrap()
                        .props
                        .reading
                        .as_mut()
                        .unwrap()
                        .selected_page_index = (*index).max(0);
                }
                ("resolveScroll", NodeKind::AnnotatedScrollBar) => {
                    let pending = self.nodes[id].reading.pending;
                    if let Some((r, v)) = pending {
                        if Some(r) == *request {
                            self.nodes.get_mut(id).unwrap().reading.pending = None;
                        }
                        if Some(r) == *request && !*cancel {
                            let target = props(&self.nodes[id].props).scroll_target;
                            self.nodes
                                .get_mut(id)
                                .unwrap()
                                .props
                                .reading
                                .as_mut()
                                .unwrap()
                                .value = v;
                            if let Some(t) = target.filter(|t| self.nodes.contains_key(t)) {
                                self.scroll_change(t, None, Some(v), None, false)?;
                            }
                        }
                    }
                }
                ("seek", NodeKind::AnnotatedScrollBar) => {
                    if !offset.is_finite() {
                        return Err("Invalid seek".into());
                    }
                    self.request_annotation(
                        *id,
                        *offset,
                        AnnotatedScrollBarScrollingEventKind::Click,
                    );
                }
                ("link", NodeKind::RichTextBlock | NodeKind::RichTextBlockOverflow) => {
                    let links = self.nodes[id]
                        .reading
                        .fragments
                        .iter()
                        .filter_map(|f| f.link.as_ref())
                        .cloned()
                        .collect::<Vec<_>>();
                    if let Some(link) = links.get((*index).max(0) as usize) {
                        self.emit(self.rich_owner(*id), EventKind::HyperlinkClick);
                        self.events.last_mut().unwrap().text = Some(link.clone());
                    }
                }
                (
                    "select" | "deselect" | "selectAll" | "deselectAll" | "invert",
                    NodeKind::ItemsView,
                ) => {
                    let p = &self.nodes[id].props;
                    let items = p.collection_items.clone();
                    let mut keys = p.selected_keys.as_ref().clone();
                    let multi = matches!(
                        p.selection_mode,
                        ListViewSelectionMode::Multiple | ListViewSelectionMode::Extended
                    );
                    if p.selection_mode == ListViewSelectionMode::None {
                        return Ok(true);
                    }
                    match action.as_str() {
                        "deselectAll" => keys.clear(),
                        "selectAll" => {
                            keys = items
                                .iter()
                                .filter(|i| i.enabled)
                                .take(if multi { usize::MAX } else { 1 })
                                .map(|i| i.id.clone())
                                .collect()
                        }
                        "invert" => {
                            keys = items
                                .iter()
                                .filter(|i| i.enabled && !keys.contains(&i.id))
                                .take(if multi { usize::MAX } else { 1 })
                                .map(|i| i.id.clone())
                                .collect()
                        }
                        _ => {
                            let i = usize::try_from(*index)
                                .ok()
                                .and_then(|i| items.get(i))
                                .ok_or("Invalid item index")?;
                            if action == "deselect" {
                                keys.retain(|k| k != &i.id)
                            } else if i.enabled {
                                if !multi {
                                    keys.clear()
                                }
                                if !keys.contains(&i.id) {
                                    keys.push(i.id.clone())
                                }
                            }
                        }
                    }
                    self.update(vec![Update {
                        id: *id,
                        patch: json!({"selectedKeys":keys}),
                    }])?;
                }
                _ => return Err("Invalid control action".into()),
            }
            return Ok(true);
        }
        // Annotation capture stays in Rust, including drag-out, cancel and bounds.
        if let Input::Down { x, y, pointer }
        | Input::Move { x, y, pointer }
        | Input::Up { x, y, pointer } = input
        {
            let dragging = self
                .nodes
                .values()
                .find(|n| n.reading.drag == Some(*pointer))
                .map(|n| n.id);
            let hit = dragging.or_else(|| self.hit(*x, *y));
            if let Some(id) = hit.filter(|id| self.nodes[id].kind == NodeKind::AnnotatedScrollBar) {
                if !self.effective_enabled(id) {
                    return Ok(false);
                }
                let n = &self.nodes[&id];
                let (_, y) = n.world.inverse().unwrap_or_default().point(*x, *y);
                let q = props(&n.props);
                let rail = n.reading.rail;
                let offset = (q.minimum
                    + (y - rail.y) / (rail.height - metric("ThumbHeight")).max(1.)
                        * (q.maximum - q.minimum + q.viewport_size))
                    .clamp(q.minimum, q.maximum);
                if matches!(input, Input::Down { .. }) {
                    self.nodes.get_mut(&id).unwrap().reading.drag = Some(*pointer);
                    let direction = if y < rail.y {
                        -1.
                    } else if y > rail.y + rail.height {
                        1.
                    } else {
                        0.
                    };
                    self.nodes.get_mut(&id).unwrap().reading.repeat_direction = direction;
                    self.nodes.get_mut(&id).unwrap().reading.next_wake = if direction != 0. {
                        Some(self.time + 500.)
                    } else {
                        None
                    };
                    self.captured = Some((*pointer, id));
                    let step = if q.small_change > 0. {
                        q.small_change
                    } else {
                        q.viewport_size / 8.
                    };
                    let (value, kind) = if y < rail.y {
                        (
                            q.value - step,
                            AnnotatedScrollBarScrollingEventKind::IncrementButton,
                        )
                    } else if y > rail.y + rail.height {
                        (
                            q.value + step,
                            AnnotatedScrollBarScrollingEventKind::DecrementButton,
                        )
                    } else {
                        (offset, AnnotatedScrollBarScrollingEventKind::Click)
                    };
                    self.request_annotation(id, value, kind);
                }
                if matches!(input, Input::Move { .. }) {
                    self.nodes.get_mut(&id).unwrap().reading.hover = Some(offset);
                    if dragging.is_some() && self.nodes[&id].reading.repeat_direction == 0. {
                        self.request_annotation(
                            id,
                            offset,
                            AnnotatedScrollBarScrollingEventKind::Drag,
                        );
                    }
                }
                if matches!(input, Input::Up { .. }) {
                    self.nodes.get_mut(&id).unwrap().reading.drag = None;
                    self.captured = None;
                }
                return Ok(true);
            }
        }
        if matches!(input, Input::Blur | Input::Leave) {
            for n in self.nodes.values_mut() {
                n.reading.pressed_link = None;
                if matches!(input, Input::Blur) {
                    n.reading.drag = None;
                }
            }
        }
        if let Input::Cancel { pointer } = input {
            for n in self.nodes.values_mut() {
                if pointer.is_none() || n.reading.drag == *pointer {
                    n.reading.drag = None
                }
                n.reading.pressed_link = None;
            }
        }
        Ok(false)
    }
}
