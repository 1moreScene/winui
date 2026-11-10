//! Same-SDK compact templates and pinned C++ behavior. All input/state lives in Rust.
use super::*;
use crate::{
    render::Draw,
    resources::Brush,
    typography::{self, Font, TextLayout},
};
use serde_json::Value;
use std::sync::OnceLock;
const RATING_LABELS: [&str; 6] = [
    "set",
    "unset",
    "placeholder",
    "pointer",
    "pointerPlaceholder",
    "disabled",
];

pub(super) fn contract() -> &'static Value {
    static DATA: OnceLock<Value> = OnceLock::new();
    DATA.get_or_init(|| {
        serde_json::from_str(include_str!(
            "../../references/compact-controls-template.json"
        ))
        .unwrap()
    })
}
pub(super) fn metric(key: &str) -> f64 {
    contract()["metrics"]["Shared"]
        .get(key)
        .or_else(|| contract()["metrics"]["Default"].get(key))
        .unwrap()["value"]
        .as_str()
        .unwrap()
        .parse()
        .unwrap()
}
fn thickness(key: &str) -> [f64; 4] {
    let values: Vec<f64> = contract()["metrics"]["Shared"][key]["value"]
        .as_str()
        .unwrap()
        .split(',')
        .map(|v| v.parse().unwrap())
        .collect();
    match values.as_slice() {
        [v] => [*v; 4],
        [x, y] => [*x, *y, *x, *y],
        [a, b, c, d] => [*a, *b, *c, *d],
        _ => panic!("invalid source thickness"),
    }
}
pub(super) fn brush(theme: Theme, key: &str) -> Brush {
    if theme == Theme::HighContrast {
        let resource = contract()["aliases"]["HighContrast"][key]
            .as_str()
            .unwrap_or(key);
        if let Ok(brush) = crate::resources::Resources::current().resolve(theme, resource) {
            return brush.clone();
        }
        // Same black/yellow fixture as the shared resources; browser hosts do
        // not expose arbitrary Windows high-contrast theme dictionaries.
        let value = if resource.contains("Transparent") {
            "#00000000"
        } else if resource.contains("Gray")
            || resource.contains("Medium")
            || resource.contains("Disabled")
        {
            "#808080"
        } else if resource.contains("HighlightText")
            || resource.contains("ButtonFace")
            || resource.contains("WindowColor")
        {
            "#000000"
        } else if resource.contains("Highlight")
            || resource.contains("Accent")
            || resource.contains("Hotlight")
        {
            "#ffff00"
        } else if resource.contains("Foreground")
            || resource.contains("Text")
            || resource.contains("Stroke")
            || resource.contains("Border")
        {
            "#ffffff"
        } else {
            "#000000"
        };
        return serde_json::from_value(serde_json::json!({"kind":"solid","color":value})).unwrap();
    }
    serde_json::from_value(contract()["palettes"][theme.as_str()][key].clone())
        .unwrap_or_else(|_| panic!("Missing compact brush {key}"))
}
fn color(theme: Theme, key: &str) -> String {
    brush(theme, key).solid_color()
}
pub(super) fn is_split(kind: NodeKind) -> bool {
    matches!(kind, NodeKind::SplitButton | NodeKind::ToggleSplitButton)
}
pub(super) fn is_compact(kind: NodeKind) -> bool {
    is_split(kind)
        || matches!(
            kind,
            NodeKind::InfoBar | NodeKind::PersonPicture | NodeKind::RatingControl
        )
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(tag = "kind", deny_unknown_fields)]
#[derive(PartialEq)]
pub enum RatingItemInfo {
    Font {
        #[serde(default)]
        glyph: String,
        #[serde(default, rename = "unsetGlyph")]
        unset_glyph: String,
        #[serde(default, rename = "placeholderGlyph")]
        placeholder_glyph: String,
        #[serde(default, rename = "pointerOverGlyph")]
        pointer_over_glyph: String,
        #[serde(default, rename = "pointerOverPlaceholderGlyph")]
        pointer_over_placeholder_glyph: String,
        #[serde(default, rename = "disabledGlyph")]
        disabled_glyph: String,
    },
    Image {
        #[serde(default)]
        image: String,
        #[serde(default, rename = "unsetImage")]
        unset_image: String,
        #[serde(default, rename = "placeholderImage")]
        placeholder_image: String,
        #[serde(default, rename = "pointerOverImage")]
        pointer_over_image: String,
        #[serde(default, rename = "pointerOverPlaceholderImage")]
        pointer_over_placeholder_image: String,
        #[serde(default, rename = "disabledImage")]
        disabled_image: String,
    },
}
impl RatingItemInfo {
    fn values(&self) -> [&str; 6] {
        match self {
            Self::Font {
                glyph,
                unset_glyph,
                placeholder_glyph,
                pointer_over_glyph,
                pointer_over_placeholder_glyph,
                disabled_glyph,
            } => [
                glyph,
                unset_glyph,
                placeholder_glyph,
                pointer_over_glyph,
                pointer_over_placeholder_glyph,
                disabled_glyph,
            ],
            Self::Image {
                image,
                unset_image,
                placeholder_image,
                pointer_over_image,
                pointer_over_placeholder_image,
                disabled_image,
            } => [
                image,
                unset_image,
                placeholder_image,
                pointer_over_image,
                pointer_over_placeholder_image,
                disabled_image,
            ],
        }
    }
    fn item(&self, index: usize) -> &str {
        let a = self.values();
        if !a[index].is_empty() {
            a[index]
        } else if index == 4 && !a[2].is_empty() {
            a[2]
        } else {
            a[0]
        }
    }
}
#[derive(Default)]
pub(super) struct CompactState {
    pub secondary_animation: crate::animated_icon::Player,
    pub close_button: Option<u32>,
    pub labels: HashMap<&'static str, TextLayout>,
    pub areas: HashMap<&'static str, Rect>,
    pub vertical: bool,
    pub open: bool,
    pub initialized: bool,
    pub request: u32,
    pub pending: Option<u32>,
    pub reason: Option<InfoBarCloseReason>,
    pub secondary_pressed: bool,
    pub rating_hover: Option<f64>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompactSnapshot {
    pub primary: Rect,
    pub secondary: Rect,
    pub flyout_open: bool,
    pub pending_close: Option<u32>,
    pub actual_initials: String,
    pub rating_hover: Option<f64>,
    pub vertical: bool,
}
pub(super) fn defaults(kind: NodeKind, p: &mut NodeProperties) {
    if !is_compact(kind) {
        return;
    }
    p.padding = [0.; 4];
    p.clip = false;
    p.font_family = "Segoe UI".into();
    p.font_size = 14.;
    match kind {
        NodeKind::PersonPicture => {
            p.width = Some(96.);
            p.height = Some(96.);
            p.font_weight = 600;
            p.is_tab_stop = false;
        }
        NodeKind::RatingControl => {
            p.value = -1.;
            p.font_family = "Segoe Fluent Icons".into();
            p.min_height = 32.;
            p.is_tab_stop = true;
            p.horizontal_alignment = HorizontalAlignment::Left;
            p.vertical_alignment = VerticalAlignment::Center;
        }
        NodeKind::InfoBar => {
            p.is_tab_stop = false;
            p.vertical_alignment = VerticalAlignment::Top;
        }
        _ => {
            p.horizontal_alignment = HorizontalAlignment::Left;
            p.vertical_alignment = VerticalAlignment::Center;
            p.is_checked = Some(false);
            p.is_tab_stop = true;
            p.min_height = 0.;
            p.padding = thickness("SplitButtonPadding");
            p.corner_radius = 4.;
        }
    }
}
pub(super) fn coerce(
    kind: NodeKind,
    p: &mut NodeProperties,
    patch: &serde_json::Map<String, Value>,
) -> Result<(), String> {
    if kind == NodeKind::InfoBar && p.icon_source.is_some() {
        return Err("InfoBar custom IconSource is not supported by this template slice".into());
    }
    if [p.placeholder_value].iter().any(|v| !v.is_finite())
        || p.max_rating > 100
        || p.initial_set_value.unsigned_abs() > 1000000
    {
        return Err("invalid rating range or value".into());
    }
    if let Some(item) = &p.rating_item_info {
        if item.values().iter().any(|v| v.len() > 1_000_000) {
            return Err("rating item source exceeds limit".into());
        }
    }
    for text in [
        &p.title,
        &p.message,
        &p.display_name,
        &p.initials,
        &p.profile_picture,
        &p.badge_glyph,
        &p.badge_image_source,
        &p.badge_text,
        &p.caption,
    ] {
        if text.len() > 1_000_000 {
            return Err("compact control text/source exceeds limit".into());
        }
    }
    if kind == NodeKind::RatingControl {
        p.max_rating = p.max_rating.max(1);
        p.value = if p.value < 0. {
            -1.
        } else {
            p.value.max(1.).min(p.max_rating as f64)
        };
        p.placeholder_value = if p.placeholder_value < 0. {
            -1.
        } else {
            p.placeholder_value
                .max(
                    contract()["observedBehavior"]["ratingPlaceholderMinimum"]
                        .as_f64()
                        .expect("native RatingControl coercion evidence"),
                )
                .min(p.max_rating as f64)
        };
    }
    if kind == NodeKind::ToggleSplitButton && p.is_checked.is_none() {
        return Err("ToggleSplitButton.isChecked must be boolean".into());
    }
    if kind == NodeKind::PersonPicture {
        let width = patch.get("width").and_then(Value::as_f64);
        let height = patch.get("height").and_then(Value::as_f64);
        let size = match (width, height) {
            (Some(w), Some(h)) => Some(w.min(h)),
            (Some(w), None) => Some(w),
            (None, Some(h)) => Some(h),
            _ => None,
        };
        if let Some(size) = size {
            p.width = Some(size);
            p.height = Some(size);
        }
    }
    Ok(())
}
pub(super) fn initials(p: &NodeProperties) -> String {
    if !p.initials.is_empty() {
        return p.initials.clone();
    }
    let ranges = contract()["initialsRanges"].as_array().unwrap();
    let mut standard = false;
    for c in p.display_name.chars().take(3) {
        let c = c as u64;
        if c == 0 || c == 0xfeff {
            break;
        }
        for r in ranges {
            if c >= r[0].as_u64().unwrap() && c <= r[1].as_u64().unwrap() {
                if r[2] != "Standard" {
                    return String::new();
                }
                standard = true;
                break;
            }
        }
    }
    if !standard {
        return String::new();
    }
    let mut text = p.display_name.trim_end().to_owned();
    for (a, b) in [('(', ')'), ('[', ']'), ('{', '}')] {
        if text.ends_with(b) {
            if let Some(i) = text.rfind(a) {
                text.truncate(i);
                break;
            }
        }
    }
    let words: Vec<_> = text.split(' ').filter(|s| !s.is_empty()).collect();
    if words.is_empty() {
        return String::new();
    }
    let first = |word: &str| {
        let chars: Vec<_> = word.chars().collect();
        let start = chars
            .iter()
            .position(|c| !matches!(*c as u32,0x21..=0x2f|0x3a..=0x40|0x7b..=0x7e))
            .unwrap_or(0);
        let mut result = String::new();
        if let Some(c) = chars.get(start) {
            result.extend(c.to_uppercase());
            for c in chars
                .iter()
                .skip(start + 1)
                .take_while(|c| matches!(**c as u32, 0x300..=0x36f))
            {
                result.push(*c);
            }
        }
        result
    };
    let mut result = first(words[0]);
    if words.len() > 1 {
        result.push_str(&first(words[words.len() - 1]));
    }
    result
}
pub(super) fn image_sources(n: &Node) -> Vec<String> {
    let mut result = vec![];
    if n.kind == NodeKind::PersonPicture {
        result.extend(
            [&n.props.profile_picture, &n.props.badge_image_source]
                .into_iter()
                .filter(|s| !s.is_empty())
                .cloned(),
        );
    }
    if n.kind == NodeKind::RatingControl {
        if let Some(item @ RatingItemInfo::Image { .. }) = &n.props.rating_item_info {
            result.extend(
                item.values()
                    .into_iter()
                    .filter(|s| !s.is_empty())
                    .map(str::to_owned),
            );
        }
    }
    result
}
fn label(
    text: &str,
    font: &Font,
    width: f64,
    wrap: bool,
    measure: &mut impl TextMeasurer,
) -> TextLayout {
    typography::layout(text, font, width, wrap, TextTrimming::Clip, None, measure)
}
fn icon_font(size: f64) -> Font {
    Font {
        family: "Segoe Fluent Icons".into(),
        size,
        weight: 400,
        style: FontStyle::Normal,
    }
}
fn paint_text(out: &mut Vec<Draw>, text: &TextLayout, font: &Font, x: f64, y: f64, color: &str) {
    for line in &text.lines {
        out.push(Draw::Text {
            style: font.style,
            x,
            y: y + line.baseline,
            text: line.text.clone(),
            color: color.into(),
            size: font.size,
            font: font.family.clone(),
            max_width: text.width.max(1.) + 1.,
            weight: font.weight,
        });
    }
}
impl Scene {
    pub(super) fn validate_compact_target(&self, p: &NodeProperties) -> Result<(), String> {
        for id in [p.flyout_target,p.context_flyout_target].into_iter().flatten() {
            if !self
                .nodes
                .get(&id)
                .is_some_and(|n| matches!(n.kind, NodeKind::CommandBarFlyout | NodeKind::Flyout | NodeKind::MenuFlyout))
            {
                return Err("flyout target must be a live Flyout/MenuFlyout in this scene".into());
            }
        }
        Ok(())
    }
    pub(super) fn compact_snapshot(&self, id: u32) -> CompactSnapshot {
        let n = &self.nodes[&id];
        let primary = self.split_primary_width(id);
        CompactSnapshot {
            primary: Rect::new(0., 0., primary, n.rect.height),
            secondary: Rect::new(primary, 0., (n.rect.width - primary).max(0.), n.rect.height),
            flyout_open: n
                .props
                .flyout_target
                .and_then(|i| self.nodes.get(&i))
                .is_some_and(|n| n.overlay.open),
            pending_close: n.compact.pending,
            actual_initials: initials(&n.props),
            rating_hover: n.compact.rating_hover,
            vertical: n.compact.vertical,
        }
    }
    pub(super) fn split_primary_width(&self, id: u32) -> f64 {
        (self.nodes[&id].rect.width
            - (metric("SplitButtonSecondaryButtonSize") * self.dpr).round() / self.dpr
            - 1. / self.dpr)
            .max(0.)
    }
    pub(super) fn measure_compact(
        &mut self,
        id: u32,
        available: [f64; 2],
        measure: &mut impl TextMeasurer,
    ) -> [f64; 2] {
        let p = self.nodes[&id].props.clone();
        let kind = self.nodes[&id].kind;
        let mut labels = HashMap::new();
        let mut areas = HashMap::new();
        let mut vertical = false;
        let size = match kind {
            NodeKind::PersonPicture => {
                let s = p.width.unwrap_or(96.).min(p.height.unwrap_or(96.));
                let text = if p.is_group {
                    "\u{e716}".into()
                } else {
                    let name = initials(&p);
                    if name.is_empty() {
                        "\u{e77b}".into()
                    } else {
                        name
                    }
                };
                let mut font = p.font();
                font.size = (s * 0.42).max(1.);
                if p.is_group || initials(&p).is_empty() {
                    font = Font {
                        weight: p.font_weight,
                        ..icon_font(font.size)
                    };
                }
                labels.insert(
                    "person",
                    if p.is_group || initials(&p).is_empty() {
                        typography::layout(
                            &text,
                            &font,
                            f64::INFINITY,
                            false,
                            TextTrimming::Clip,
                            Some(font.size),
                            measure,
                        )
                    } else {
                        typography::layout_tight(&text, &font, measure)
                    },
                );
                let badge = if p.badge_number > 0 {
                    if p.badge_number > 99 {
                        "99+".into()
                    } else {
                        p.badge_number.to_string()
                    }
                } else {
                    p.badge_glyph.clone()
                };
                let mut font = p.font();
                font.size = (s * 0.3).max(1.);
                font.weight = p.font_weight;
                if p.badge_number == 0 {
                    font = Font {
                        weight: p.font_weight,
                        ..icon_font(font.size)
                    };
                }
                labels.insert(
                    "badge",
                    if p.badge_number != 0 {
                        typography::layout_tight(&badge, &font, measure)
                    } else {
                        typography::layout(
                            &badge,
                            &font,
                            f64::INFINITY,
                            false,
                            TextTrimming::Clip,
                            Some(font.size),
                            measure,
                        )
                    },
                );
                [s, s]
            }
            NodeKind::RatingControl => {
                let mut font = p.font();
                font.size = 12.;
                font.family = "Segoe UI".into();
                labels.insert(
                    "caption",
                    typography::layout_tight(&p.caption, &font, measure),
                );
                let render = metric("RatingControlFontSizeForRendering");
                let font = Font {
                    size: render,
                    ..p.font()
                };
                for (index, key) in RATING_LABELS.iter().enumerate() {
                    let glyph = match &p.rating_item_info {
                        Some(item @ RatingItemInfo::Font { .. }) => item.item(index),
                        _ => contract()["ratingFontInfo"]
                            [if index == 1 { "UnsetGlyph" } else { "Glyph" }]
                        .as_str()
                        .unwrap(),
                    };
                    labels.insert(
                        *key,
                        typography::layout(
                            glyph,
                            &font,
                            f64::INFINITY,
                            false,
                            TextTrimming::Clip,
                            Some(render),
                            measure,
                        ),
                    );
                }
                let width = p.max_rating as f64 * render / 2.
                    + (p.max_rating - 1) as f64 * metric("RatingControlItemSpacing");
                [
                    width
                        + if p.caption.is_empty() {
                            0.
                        } else {
                            12. + labels["caption"].width
                        },
                    render,
                ]
            }
            NodeKind::InfoBar => {
                if !p.is_open {
                    self.nodes.get_mut(&id).unwrap().compact.labels.clear();
                    return [0., 0.];
                }
                let border = 1. / self.dpr;
                let left = 16.
                    + border
                    + if p.is_icon_visible {
                        (30. * self.dpr).round() / self.dpr
                    } else {
                        0.
                    };
                let close = if p.is_closable {
                    (metric("InfoBarCloseButtonSize") * self.dpr).round() / self.dpr
                        + (6. * self.dpr).round() / self.dpr
                } else {
                    0.
                };
                let width = (available[0] - left - 16. - border - close).max(0.);
                let mut title_font = p.font();
                title_font.weight = 600;
                let title = label(&p.title, &title_font, width, true, measure);
                let message = label(&p.message, &p.font(), width, true, measure);
                let children = self.ordered_children(id);
                let close_id = self.nodes[&id].compact.close_button;
                let mut action = [0f64; 2];
                let mut content = [0f64; 2];
                for c in children {
                    if Some(c) == close_id {
                        let size = (metric("InfoBarCloseButtonSize") * self.dpr).round() / self.dpr;
                        self.measure_node(c, [size, size], measure);
                        continue;
                    }
                    let d = self.measure_node(c, [width, available[1]], measure);
                    if self.nodes[&c].props.is_info_bar_action {
                        action[0] = action[0].max(d[0]);
                        action[1] = action[1].max(d[1]);
                    } else {
                        content[0] = content[0].max(d[0]);
                        content[1] += d[1];
                    }
                }
                let count = usize::from(!p.title.is_empty())
                    + usize::from(!p.message.is_empty())
                    + usize::from(action[0] > 0.);
                let horizontal_width = title.width
                    + message.width
                    + action[0]
                    + if !p.title.is_empty() && !p.message.is_empty() {
                        12.
                    } else {
                        0.
                    }
                    + if action[0] > 0. { 16. } else { 0. };
                vertical = count == 1
                    || horizontal_width > width
                    || title.height + 14. > 48.
                    || message.height + 14. > 48.;
                let title_y = if vertical { 14. } else { 14.4 };
                let message_y = if vertical {
                    14. + if p.title.is_empty() {
                        0.
                    } else {
                        title.height + 4.
                    }
                } else {
                    14.4
                };
                areas.insert(
                    "title",
                    Rect::new(
                        left,
                        ((title_y + border) * self.dpr).round() / self.dpr,
                        title.width,
                        title.height,
                    ),
                );
                areas.insert(
                    "message",
                    Rect::new(
                        left + if !vertical && !p.title.is_empty() {
                            ((title.width + 12.) * self.dpr).round() / self.dpr
                        } else {
                            0.
                        },
                        ((message_y + border) * self.dpr).round() / self.dpr,
                        message.width,
                        message.height,
                    ),
                );
                let body_h = if vertical {
                    message_y
                        + message.height
                        + if action[1] > 0. { 12. + action[1] } else { 0. }
                        + 18.
                } else {
                    (title.height.max(message.height) + 14.4).max(action[1] + 8.) + 14.4
                };
                let action_y = if vertical {
                    message_y + message.height + 12.
                } else {
                    8.8
                };
                let action_x = if vertical {
                    left
                } else {
                    left + ((title.width
                        + message.width
                        + if p.message.is_empty() { 0. } else { 12. }
                        + 16.)
                        * self.dpr)
                        .round()
                        / self.dpr
                };
                areas.insert(
                    "action",
                    Rect::new(action_x, action_y, action[0], action[1]),
                );
                areas.insert("body", Rect::new(left, body_h, width, content[1]));
                labels.insert("title", title);
                labels.insert("message", message);
                let h = (body_h + content[1] + border * 2.).max(metric("InfoBarMinHeight"));
                [available[0], h]
            }
            _ => {
                let pad = p.padding;
                let text = label(&p.text, &p.font(), f64::INFINITY, false, measure);
                let mut content = if p.text.is_empty() {
                    [0., 0.]
                } else {
                    [text.width, text.height]
                };
                for child in self.ordered_children(id) {
                    let d = self.measure_node(
                        child,
                        [(available[0] - 58.).max(0.), available[1]],
                        measure,
                    );
                    content[0] = content[0].max(d[0]);
                    content[1] = content[1].max(d[1]);
                }
                labels.insert("label", text);
                let secondary =
                    (metric("SplitButtonSecondaryButtonSize") * self.dpr).round() / self.dpr;
                [
                    (content[0] + pad[0] + pad[2]).max(metric("SplitButtonPrimaryButtonSize"))
                        + secondary
                        + 1. / self.dpr,
                    content[1] + pad[1] + pad[3],
                ]
            }
        };
        let n = self.nodes.get_mut(&id).unwrap();
        n.compact.labels = labels;
        n.compact.areas = areas;
        n.compact.vertical = vertical;
        size
    }
    pub(super) fn arrange_compact(&mut self, id: u32, measure: &mut impl TextMeasurer) {
        let n = &self.nodes[&id];
        let p = n.props.clone();
        let children = self.ordered_children(id);
        let world = n.world;
        let inherited = (
            n.theme,
            n.enabled,
            n.visible && (n.kind != NodeKind::InfoBar || p.is_open),
        );
        let r = n.rect;
        let kind = n.kind;
        if kind == NodeKind::InfoBar {
            self.measure_compact(id, [r.width, r.height], measure);
            let close = self.nodes[&id].compact.close_button;
            for child in children {
                let cp = &self.nodes[&child].props;
                let slot = if Some(child) == close {
                    let size = (metric("InfoBarCloseButtonSize") * self.dpr).round() / self.dpr;
                    let margin = (5. * self.dpr).round() / self.dpr;
                    let right = (6. * self.dpr).round() / self.dpr;
                    Rect::new(
                        (r.width - size - right).max(0.),
                        margin + 1. / self.dpr,
                        size,
                        size,
                    )
                } else {
                    self.nodes[&id].compact.areas[if cp.is_info_bar_action {
                        "action"
                    } else {
                        "body"
                    }]
                };
                if Some(child) == close {
                    let p = &mut self.nodes.get_mut(&child).unwrap().props;
                    p.width = Some(slot.width);
                    p.height = Some(slot.height);
                }
                self.arrange_node(child, slot, world, inherited, measure);
            }
        } else if is_split(kind) {
            let pad = p.padding;
            let width = self.split_primary_width(id);
            for child in children {
                self.arrange_node(
                    child,
                    Rect::new(
                        pad[0],
                        pad[1],
                        (width - pad[0] - pad[2]).max(0.),
                        (r.height - pad[1] - pad[3]).max(0.),
                    ),
                    world,
                    inherited,
                    measure,
                );
            }
        }
    }
    pub(super) fn sync_compact(&mut self) {
        let splits: Vec<_> = self
            .nodes
            .values()
            .filter(|n| is_split(n.kind))
            .map(|n| n.id)
            .collect();
        for id in splits {
            let n = &self.nodes[&id];
            let secondary = self.pointer.is_some_and(|(x, y)| {
                n.world.inverse().unwrap_or_default().point(x, y).0 >= self.split_primary_width(id)
            });
            let state = if !n.enabled {
                "Disabled"
            } else if secondary {
                n.button.state(true).as_str()
            } else {
                "Normal"
            };
            let visible = n.visible;
            self.nodes
                .get_mut(&id)
                .unwrap()
                .compact
                .secondary_animation
                .sync(
                    AnimatedIconSource::ChevronDownSmall,
                    state,
                    self.time,
                    self.reduced_motion,
                    visible,
                );
        }

        let ids: Vec<_> = self
            .nodes
            .values()
            .filter(|n| n.kind == NodeKind::InfoBar)
            .map(|n| n.id)
            .collect();
        for id in ids {
            let n = &self.nodes[&id];
            let requested = n.props.is_open;
            let old = n.compact.open;
            let initialized = n.compact.initialized;
            let pending = n.compact.pending;
            if initialized && old && !requested && pending.is_none() {
                self.nodes.get_mut(&id).unwrap().props.is_open = true;
                self.request_info_close(id, InfoBarCloseReason::Programmatic);
            } else if requested && !old {
                self.nodes.get_mut(&id).unwrap().compact.open = true;
                if initialized {
                    self.emit(id, EventKind::Opened);
                }
            }
            let n = self.nodes.get_mut(&id).unwrap();
            n.compact.initialized = true;
            if let Some(close) = n.compact.close_button {
                self.nodes.get_mut(&close).unwrap().props.visible =
                    self.nodes[&id].props.is_open && self.nodes[&id].props.is_closable;
            }
        }
    }
    pub(super) fn request_info_close(&mut self, id: u32, reason: InfoBarCloseReason) {
        let n = &mut self.nodes.get_mut(&id).unwrap();
        if !n.props.is_open || n.compact.pending.is_some() {
            return;
        }
        n.compact.request = n.compact.request.wrapping_add(1);
        let request = n.compact.request;
        n.compact.pending = Some(request);
        n.compact.reason = Some(reason);
        if reason == InfoBarCloseReason::CloseButton {
            self.emit(id, EventKind::CloseButtonClick);
            self.events.last_mut().unwrap().close_reason = Some(reason);
        }
        self.emit(id, EventKind::Closing);
        let event = self.events.last_mut().unwrap();
        event.request_id = Some(request);
        event.close_reason = Some(reason);
    }
    pub(super) fn resolve_info_close(&mut self, id: u32, request: u32, cancel: bool) {
        let n = self.nodes.get_mut(&id).unwrap();
        if n.compact.pending != Some(request) {
            return;
        }
        n.compact.pending = None;
        if !cancel {
            n.props.is_open = false;
            n.compact.open = false;
            let reason = n.compact.reason;
            self.emit(id, EventKind::Closed);
            self.events.last_mut().unwrap().close_reason = reason;
            self.invalidate(id, true);
        }
    }
    pub(super) fn compact_activate(&mut self, id: u32) -> Result<bool, String> {
        let n = &self.nodes[&id];
        if let Some(parent) = n.parent {
            if self.nodes[&parent].kind == NodeKind::InfoBar
                && self.nodes[&parent].compact.close_button == Some(id)
            {
                self.request_info_close(parent, InfoBarCloseReason::CloseButton);
                return Ok(true);
            }
        }
        if !is_split(n.kind) {
            return Ok(false);
        }
        let secondary = n.compact.secondary_pressed;
        let pointer = n.button.key.is_none()
            && self.pointer.is_some_and(|(x, y)| {
                let p = n.world.inverse().unwrap_or_default().point(x, y);
                p.0 >= self.split_primary_width(id)
            });
        if secondary {
            if pointer {
                self.open_split_flyout(id)?;
            }
            return Ok(true);
        }
        if pointer {
            return Ok(true);
        }
        if n.kind == NodeKind::ToggleSplitButton {
            let checked = n.props.is_checked != Some(true);
            self.nodes.get_mut(&id).unwrap().props.is_checked = Some(checked);
            self.emit(id, EventKind::IsCheckedChanged);
            self.events.last_mut().unwrap().is_checked = Some(Some(checked));
        }
        self.emit(id, EventKind::Click);
        self.invalidate(id, false);
        Ok(true)
    }
    pub(super) fn open_split_flyout(&mut self, id: u32) -> Result<(), String> {
        if let Some(target) = self.nodes[&id].props.flyout_target {
            if self.nodes.contains_key(&target) {
                self.update(vec![Update {
                    id: target,
                    patch: serde_json::json!({"placementTarget":id,"placement":"BottomEdgeAlignedLeft","isOpen":true}),
                }])?;
            }
        }
        Ok(())
    }
    pub(super) fn rating_width(&self, id: u32) -> f64 {
        self.nodes[&id].props.max_rating as f64 * 16.
            + (self.nodes[&id].props.max_rating - 1) as f64 * metric("RatingControlItemSpacing")
    }
    fn rating_left(&self, id: u32) -> f64 {
        let n = &self.nodes[&id];
        if n.props.flow_direction == FlowDirection::RightToLeft && !n.props.caption.is_empty() {
            n.compact
                .labels
                .get("caption")
                .map_or(0., |text| text.width + 12.)
        } else {
            0.
        }
    }
    fn rating_logical_x(&self, id: u32, x: f64) -> f64 {
        let x = x - self.rating_left(id);
        if self.nodes[&id].props.flow_direction == FlowDirection::RightToLeft {
            self.rating_width(id) - x
        } else {
            x
        }
    }
    fn set_rating(&mut self, id: u32, next: f64, mouse: bool) {
        let p = &self.nodes[&id].props;
        let old = p.value;
        let next = next.clamp(0., p.max_rating as f64);
        if old <= -1. && next == 0. {
            return;
        }
        let next = if !p.is_clear_enabled && next <= 0. {
            1.
        } else if (next == old && p.is_clear_enabled && (next != p.max_rating as f64 || mouse))
            || next <= 0.
        {
            -1.
        } else {
            next
        };
        self.nodes.get_mut(&id).unwrap().props.value = next;
        self.emit(id, EventKind::ValueChanged);
        self.invalidate(id, false);
    }
    pub(super) fn compact_input(&mut self, input: &Input) -> Result<bool, String> {
        match input {
            Input::InfoBarClose { id } => {
                if self.get(*id)?.kind != NodeKind::InfoBar {
                    return Err("not an InfoBar".into());
                }
                self.request_info_close(*id, InfoBarCloseReason::Programmatic);
                return Ok(true);
            }
            Input::SplitInvoke { id, secondary } => {
                if !is_split(self.get(*id)?.kind) {
                    return Err("not a SplitButton".into());
                }
                if self.effective_enabled(*id) {
                    if *secondary {
                        self.open_split_flyout(*id)?;
                    } else {
                        self.nodes.get_mut(id).unwrap().compact.secondary_pressed = false;
                        let old = self.pointer.take();
                        self.compact_activate(*id)?;
                        self.pointer = old;
                    }
                }
                return Ok(true);
            }
            Input::Move { x, y, .. } | Input::Down { x, y, .. } => {
                let ids: Vec<_> = self
                    .nodes
                    .values()
                    .filter(|n| n.kind == NodeKind::RatingControl)
                    .map(|n| n.id)
                    .collect();
                for id in ids {
                    let n = &self.nodes[&id];
                    let (x, y) = n.world.inverse().unwrap_or_default().point(*x, *y);
                    let x = self.rating_logical_x(id, x);
                    let hover = n.enabled
                        && !n.props.is_read_only
                        && x >= 0.
                        && x < self.rating_width(id)
                        && y >= 0.
                        && y < n.rect.height;
                    self.nodes.get_mut(&id).unwrap().compact.rating_hover = hover.then_some(x);
                }
                if let Input::Down { pointer, x, y } = input {
                    if let Some(id) = self.hit(*x, *y) {
                        let n = &self.nodes[&id];
                        if is_split(n.kind) {
                            let x = n.world.inverse().unwrap_or_default().point(*x, *y).0;
                            let secondary = x >= self.split_primary_width(id);
                            self.nodes.get_mut(&id).unwrap().compact.secondary_pressed = secondary;
                        }
                        if self.nodes[&id].kind == NodeKind::RatingControl
                            && !self.nodes[&id].props.is_read_only
                        {
                            let local = self.nodes[&id]
                                .world
                                .inverse()
                                .unwrap_or_default()
                                .point(*x, *y);
                            let logical = self.rating_logical_x(id, local.0);
                            if logical >= 0. && logical < self.rating_width(id) {
                                self.pointer = Some((*x, *y));
                                self.focus(Some(id));
                                self.captured = Some((*pointer, id));
                                return Ok(true);
                            }
                        }
                    }
                }
            }
            Input::Up { x, y, pointer } => {
                if let Some((captured, id)) = self.captured {
                    if captured == *pointer && self.nodes[&id].kind == NodeKind::RatingControl {
                        let n = &self.nodes[&id];
                        let x = n.world.inverse().unwrap_or_default().point(*x, *y).0;
                        let x = self.rating_logical_x(id, x);
                        let value = (x / self.rating_width(id) * n.props.max_rating as f64).ceil();
                        if n.enabled && !n.props.is_read_only {
                            self.set_rating(id, value, true);
                        }
                        self.captured = None;
                        return Ok(true);
                    }
                }
            }
            Input::KeyUp { key } => {
                if let Some(id) = self.focused {
                    if is_split(self.nodes[&id].kind)
                        && matches!(key.as_str(), " " | "Space" | "Enter")
                        && self.nodes[&id].button.key.as_deref() == Some(key)
                        && self.effective_enabled(id)
                    {
                        let n = self.nodes.get_mut(&id).unwrap();
                        n.button.key = None;
                        n.button.pressed = false;
                        n.compact.secondary_pressed = false;
                        let old = self.pointer.take();
                        self.compact_activate(id)?;
                        self.pointer = old;
                        return Ok(true);
                    }
                    if is_split(self.nodes[&id].kind)
                        && (key == "F4" || key == "Alt+ArrowDown")
                        && self.effective_enabled(id)
                    {
                        self.open_split_flyout(id)?;
                        return Ok(true);
                    }
                }
            }
            Input::KeyDown { key, .. } => {
                if let Some(id) = self.focused {
                    let n = &self.nodes[&id];
                    if is_split(n.kind) {
                        self.nodes.get_mut(&id).unwrap().compact.secondary_pressed = false;
                    } else if n.kind == NodeKind::RatingControl
                        && n.enabled
                        && !n.props.is_read_only
                    {
                        let p = &n.props;
                        let reverse = if p.flow_direction == FlowDirection::RightToLeft {
                            -1.
                        } else {
                            1.
                        };
                        let change = match key.as_str() {
                            "ArrowLeft" => -reverse,
                            "ArrowRight" => reverse,
                            "ArrowUp" => 1.,
                            "ArrowDown" => -1.,
                            _ => 0.,
                        };
                        let next = if key == "Home" {
                            0.
                        } else if key == "End" {
                            p.max_rating as f64
                        } else if change != 0. {
                            if p.value < 0. {
                                p.initial_set_value as f64
                            } else if p.value.fract() != 0. {
                                p.value.floor() + if change < 0. { 0. } else { change }
                            } else {
                                p.value + change
                            }
                        } else {
                            return Ok(false);
                        };
                        self.set_rating(id, next, false);
                        return Ok(true);
                    }
                }
            }
            Input::Leave => {
                for n in self.nodes.values_mut() {
                    n.compact.rating_hover = None;
                }
            }
            _ => {}
        }
        Ok(false)
    }
    pub(super) fn split_foreground(&self, id: u32) -> String {
        let n = &self.nodes[&id];
        let checked =
            n.enabled && n.kind == NodeKind::ToggleSplitButton && n.props.is_checked == Some(true);
        n.props
            .foreground
            .as_ref()
            .map(|v| Self::color(v, n.theme))
            .unwrap_or_else(|| {
                color(
                    n.theme,
                    &format!(
                        "SplitButtonForeground{}{}",
                        if checked { "Checked" } else { "" },
                        if !n.enabled {
                            "Disabled"
                        } else if n.button.pressed {
                            "Pressed"
                        } else {
                            ""
                        }
                    ),
                )
            })
    }
    pub(super) fn paint_compact(&self, id: u32, out: &mut Vec<Draw>) {
        let n = &self.nodes[&id];
        let p = &n.props;
        let r = Rect::new(0., 0., n.rect.width, n.rect.height);
        let theme = n.theme;
        if n.kind == NodeKind::PersonPicture {
            let s = r.width.min(r.height);
            out.push(Draw::VectorLayer { bounds: r });
            out.push(Draw::Border {
                rect: r,
                thickness: [metric("PersonPictureEllipseStrokeThickness"); 4],
                radius: [s / 2.; 4],
                color: color(theme, "PersonPictureEllipseFillStrokeBrush"),
                background: Some(
                    p.background
                        .as_ref()
                        .map(|v| Self::color(v, theme))
                        .unwrap_or_else(|| color(theme, "PersonPictureEllipseFillThemeBrush")),
                ),
            });
            out.push(Draw::EndLayer);
            if !p.is_group && !p.profile_picture.is_empty() {
                self.compact_image(&p.profile_picture, r, out);
            } else if let Some(text) = n.compact.labels.get("person") {
                let mut font = p.font();
                font.size = (s * 0.42).max(1.);
                if p.is_group || initials(p).is_empty() {
                    font = Font {
                        weight: p.font_weight,
                        ..icon_font(font.size)
                    };
                }
                paint_text(
                    out,
                    text,
                    &font,
                    ((s - text.width) / 2. * self.dpr).round() / self.dpr,
                    ((s - text.height) / 2. * self.dpr).round() / self.dpr,
                    &p.foreground
                        .as_ref()
                        .map(|v| Self::color(v, theme))
                        .unwrap_or_else(|| color(theme, "PersonPictureForegroundThemeBrush")),
                );
            }
            if !p.badge_image_source.is_empty()
                || p.badge_number > 0
                || (p.badge_number == 0 && !p.badge_glyph.is_empty())
            {
                // BadgeGrid measures both its ellipse and its tight text. A
                // wide "99+" label expands the Grid and shifts the centered
                // ellipse left while preserving the Grid's right margin.
                let grid_width = n
                    .compact
                    .labels
                    .get("badge")
                    .map_or(s / 2., |text| text.width.max(s / 2.));
                let b = Rect::new(
                    s + 4. - grid_width + (grid_width - s / 2.) / 2.,
                    -4.,
                    s / 2.,
                    s / 2.,
                );
                out.push(Draw::VectorLayer {
                    bounds: Rect::new(b.x - 2., b.y - 2., b.width + 4., b.height + 4.),
                });
                out.push(Draw::Ellipse {
                    rect: b,
                    color: color(theme, "PersonPictureEllipseBadgeFillThemeBrush"),
                });
                out.push(Draw::EndLayer);
                if !p.badge_image_source.is_empty() {
                    self.compact_image(&p.badge_image_source, b, out);
                } else if let Some(text) = n.compact.labels.get("badge") {
                    let mut font = p.font();
                    font.size = (s * 0.3).max(1.);
                    font.weight = p.font_weight;
                    if p.badge_number == 0 {
                        font = Font {
                            weight: p.font_weight,
                            ..icon_font(font.size)
                        };
                    }
                    paint_text(
                        out,
                        text,
                        &font,
                        b.x + (b.width - text.width) / 2.,
                        b.y + (b.height - text.height) / 2.,
                        &color(theme, "PersonPictureEllipseBadgeForegroundThemeBrush"),
                    );
                }
            }
        } else if n.kind == NodeKind::RatingControl {
            let hover = n.compact.rating_hover;
            let value = if let Some(x) = hover {
                (x / self.rating_width(id) * p.max_rating as f64).ceil()
            } else if p.value >= 0. {
                p.value
            } else {
                p.placeholder_value
            };
            let key = if !n.enabled {
                "RatingControlDisabledSelectedForeground"
            } else if hover.is_some() {
                if p.value >= 0. {
                    "RatingControlPointerOverSelectedForeground"
                } else if p.placeholder_value < 0. {
                    "RatingControlPointerOverPlaceholderForeground"
                } else {
                    "RatingControlPointerOverUnselectedForeground"
                }
            } else if p.value >= 0. {
                "RatingControlSelectedForeground"
            } else {
                "RatingControlPlaceholderForeground"
            };
            let render = metric("RatingControlFontSizeForRendering");
            for i in 0..p.max_rating {
                let rtl = p.flow_direction == FlowDirection::RightToLeft;
                let position = if rtl { p.max_rating - 1 - i } else { i };
                let x = self.rating_left(id)
                    + position as f64 * (render / 2. + metric("RatingControlItemSpacing"));
                let y = (r.height - render / 2.) / 2.;
                out.push(Draw::Save);
                out.push(Draw::Transform {
                    matrix: [0.5, 0., 0., 0.5, x, y],
                });
                let font = Font {
                    size: render,
                    ..p.font()
                };
                for filled in [false, true] {
                    if filled {
                        let fraction = (value - i as f64).clamp(0., 1.);
                        if fraction == 0. {
                            continue;
                        }
                        out.push(Draw::Clip {
                            rect: Rect::new(
                                if rtl { render * (1. - fraction) } else { 0. },
                                0.,
                                render * fraction,
                                render,
                            ),
                        });
                    }
                    let item_index = if !filled {
                        1
                    } else if !n.enabled {
                        5
                    } else if hover.is_some() {
                        if p.value >= 0. {
                            3
                        } else {
                            4
                        }
                    } else if p.value >= 0. {
                        0
                    } else {
                        2
                    };
                    if let Some(item @ RatingItemInfo::Image { .. }) = &p.rating_item_info {
                        let source = item.item(item_index);
                        if !source.is_empty() {
                            if let Some(size) = self.images.get(source) {
                                let scale = (render / size[0]).min(render / size[1]);
                                let w = size[0] * scale;
                                let h = size[1] * scale;
                                out.push(Draw::Image {
                                    rect: Rect::new((render - w) / 2., (render - h) / 2., w, h),
                                    source: source.into(),
                                });
                            }
                        }
                    } else {
                        let text = &n.compact.labels[RATING_LABELS[item_index]];
                        let color = if filled {
                            color(theme, key)
                        } else {
                            color(theme, "RatingControlUnselectedForeground")
                        };
                        paint_text(out, text, &font, 0., 0., &color);
                    }
                    if filled {
                        out.push(Draw::Restore);
                    }
                }
                out.push(Draw::Restore);
            }
            if !p.caption.is_empty() {
                let mut font = p.font();
                font.family = "Segoe UI".into();
                font.size = 12.;
                let text = &n.compact.labels["caption"];
                paint_text(
                    out,
                    text,
                    &font,
                    if p.flow_direction == FlowDirection::RightToLeft {
                        0.
                    } else {
                        self.rating_width(id) + 12.
                    },
                    (r.height - text.height) / 2.,
                    &color(theme, "RatingControlCaptionForeground"),
                );
            }
        } else if n.kind == NodeKind::InfoBar {
            if !p.is_open {
                return;
            }
            let severity = p.severity.as_str();
            let bg = p
                .background
                .as_ref()
                .map(|v| Self::color(v, theme))
                .unwrap_or_else(|| {
                    color(theme, &format!("InfoBar{severity}SeverityBackgroundBrush"))
                });
            out.push(Draw::Border {
                rect: r,
                thickness: [1. / self.dpr; 4],
                radius: [4.; 4],
                color: color(theme, "InfoBarBorderBrush"),
                background: Some(bg),
            });
            if p.is_icon_visible {
                let font = icon_font(metric("InfoBarIconFontSize"));
                let x = 16. + 1. / self.dpr;
                let y = 16.8;
                let glyph = |key: &str| {
                    contract()["metrics"]["Shared"][key]["value"]
                        .as_str()
                        .unwrap()
                        .to_owned()
                };
                for (key, fg) in [
                    (
                        "InfoBarIconBackgroundGlyph".into(),
                        format!("InfoBar{severity}SeverityIconBackground"),
                    ),
                    (
                        format!("InfoBar{severity}IconGlyph"),
                        format!("InfoBar{severity}SeverityIconForeground"),
                    ),
                ] {
                    out.push(Draw::Text {
                        style: FontStyle::Normal,
                        x,
                        y: y + font.size,
                        text: glyph(&key),
                        color: color(theme, &fg),
                        size: font.size,
                        font: font.family.clone(),
                        max_width: 20.,
                        weight: 400,
                    });
                }
            }
            for name in ["title", "message"] {
                if let (Some(text), Some(area)) =
                    (n.compact.labels.get(name), n.compact.areas.get(name))
                {
                    let mut font = p.font();
                    if name == "title" {
                        font.weight = 600;
                    }
                    paint_text(
                        out,
                        text,
                        &font,
                        area.x,
                        area.y,
                        &p.foreground
                            .as_ref()
                            .map(|v| Self::color(v, theme))
                            .unwrap_or_else(|| {
                                color(
                                    theme,
                                    if name == "title" {
                                        "InfoBarTitleForeground"
                                    } else {
                                        "InfoBarMessageForeground"
                                    },
                                )
                            }),
                    );
                }
            }
        } else {
            let checked =
                n.enabled && n.kind == NodeKind::ToggleSplitButton && p.is_checked == Some(true);
            let primary = self.split_primary_width(id);
            let pointer = self
                .pointer
                .map(|(x, y)| n.world.inverse().unwrap_or_default().point(x, y));
            let secondary = pointer.is_some_and(|(x, _)| x >= primary);
            let hovered = n.button.pointer_inside;
            let pressed = n.button.pressed;
            let opened = p
                .flyout_target
                .and_then(|i| self.nodes.get(&i))
                .is_some_and(|n| n.overlay.open);
            out.push(Draw::RoundedClip {
                rect: r,
                radius: p.corner_radius,
            });
            for second in [false, true] {
                let suffix = if !n.enabled {
                    "Disabled"
                } else if opened
                    || pressed && n.compact.secondary_pressed == second && secondary == second
                {
                    "Pressed"
                } else if hovered && secondary == second {
                    "PointerOver"
                } else {
                    ""
                };
                let key = format!(
                    "SplitButtonBackground{}{suffix}",
                    if checked { "Checked" } else { "" }
                );
                let region = if second {
                    Rect::new(
                        primary + 1. / self.dpr,
                        0.,
                        (r.width - primary - 1. / self.dpr).max(0.),
                        r.height,
                    )
                } else {
                    Rect::new(0., 0., primary + 1. / self.dpr, r.height)
                };
                out.push(Draw::Fill {
                    rect: region,
                    color: color(theme, &key),
                    radius: 0.,
                });
            }
            out.push(Draw::Restore);
            let fg = self.split_foreground(id);
            if !self
                .ordered_children(id)
                .iter()
                .any(|child| !overlays::is_overlay(self.nodes[child].kind))
            {
                if let Some(text) = n.compact.labels.get("label") {
                    out.push(Draw::Clip {
                        rect: Rect::new(0., 0., primary, r.height),
                    });
                    let pad = p.padding;
                    paint_text(
                        out,
                        text,
                        &p.font(),
                        (pad[0] * self.dpr).round() / self.dpr,
                        ((r.height - text.height) / 2. * self.dpr).round() / self.dpr,
                        &fg,
                    );
                    out.push(Draw::Restore);
                }
            }
            let source = AnimatedIconSource::ChevronDownSmall;
            let size = crate::animated_icon::size(source);
            let scale = 12. / size[0];
            out.push(Draw::Save);
            out.push(Draw::Transform {
                matrix: [scale, 0., 0., scale, r.width - 24., (r.height - 12.) / 2.],
            });
            crate::animated_icon::draw(
                source,
                n.compact.secondary_animation.progress(self.time),
                &if checked || !n.enabled {
                    fg.clone()
                } else {
                    color(
                        theme,
                        if pressed {
                            "SplitButtonForegroundSecondaryPressed"
                        } else {
                            "SplitButtonForegroundSecondary"
                        },
                    )
                },
                out,
            );
            out.push(Draw::Restore);
        }
    }
    pub(super) fn paint_split_border(&self, id: u32, out: &mut Vec<Draw>) {
        let n = &self.nodes[&id];
        let p = &n.props;
        let r = Rect::new(0., 0., n.rect.width, n.rect.height);
        let checked =
            n.enabled && n.kind == NodeKind::ToggleSplitButton && p.is_checked == Some(true);
        let opened = p
            .flyout_target
            .and_then(|id| self.nodes.get(&id))
            .is_some_and(|n| n.overlay.open);
        let suffix = if !n.enabled {
            "Disabled"
        } else if n.button.pressed || opened {
            "Pressed"
        } else if n.button.pointer_inside {
            "PointerOver"
        } else {
            ""
        };
        Self::brush_command(
            out,
            r,
            p.corner_radius,
            1.,
            &brush(
                n.theme,
                &format!(
                    "SplitButtonBorderBrush{}{suffix}",
                    if checked { "Checked" } else { "" }
                ),
            ),
        );
        out.push(Draw::Fill {
            rect: Rect::new(self.split_primary_width(id), 0., 1. / self.dpr, r.height),
            color: color(
                n.theme,
                if checked {
                    "SplitButtonBorderBrushCheckedDivider"
                } else {
                    "SplitButtonBorderBrushDivider"
                },
            ),
            radius: 0.,
        });
    }
    fn compact_image(&self, source: &str, rect: Rect, out: &mut Vec<Draw>) {
        if let Some(size) = self.images.get(source) {
            let scale = (rect.width / size[0]).max(rect.height / size[1]);
            let w = size[0] * scale;
            let h = size[1] * scale;
            out.push(Draw::RoundedClip {
                rect,
                radius: rect.width / 2.,
            });
            out.push(Draw::Image {
                rect: Rect::new(
                    rect.x + (rect.width - w) / 2.,
                    rect.y + (rect.height - h) / 2.,
                    w,
                    h,
                ),
                source: source.into(),
            });
            out.push(Draw::Restore);
        }
    }
}
