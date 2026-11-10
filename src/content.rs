use crate::{
    enums::*,
    model::{Rect, Theme},
    render::Draw,
};
use serde::{Deserialize, Serialize};
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
#[derive(PartialEq)]
pub struct GridTrack {
    pub unit: GridUnit,
    pub value: f64,
}
impl Default for GridTrack {
    fn default() -> Self {
        Self {
            unit: GridUnit::Star,
            value: 1.,
        }
    }
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
#[derive(PartialEq)]
pub struct ContentNode {
    pub kind: ContentKind,
    pub children: Vec<ContentNode>,
    pub rows: Vec<GridTrack>,
    pub columns: Vec<GridTrack>,
    pub row: usize,
    pub column: usize,
    pub row_span: usize,
    pub column_span: usize,
    pub margin: [f64; 4],
    pub width: Option<f64>,
    pub height: Option<f64>,
    pub min_width: f64,
    pub min_height: f64,
    pub fill: Option<String>,
    pub text: String,
    pub font_size: f64,
    pub font_weight: u16,
    pub wrap: bool,
    pub trim_side_bearings: bool,
    pub horizontal_alignment: HorizontalAlignment,
    pub vertical_alignment: VerticalAlignment,
    pub orientation: Orientation,
    pub spacing: f64,
}
impl Default for ContentNode {
    fn default() -> Self {
        Self {
            kind: ContentKind::Grid,
            children: vec![],
            rows: vec![],
            columns: vec![],
            row: 0,
            column: 0,
            row_span: 1,
            column_span: 1,
            margin: [0.; 4],
            width: None,
            height: None,
            min_width: 0.,
            min_height: 0.,
            fill: None,
            text: String::new(),
            font_size: 14.,
            font_weight: 400,
            wrap: false,
            trim_side_bearings: false,
            horizontal_alignment: HorizontalAlignment::Stretch,
            vertical_alignment: VerticalAlignment::Stretch,
            orientation: Orientation::Vertical,
            spacing: 0.,
        }
    }
}
pub type Measure<'a> = dyn Fn(&str, f64, u16) -> f64 + 'a;
pub fn metric_key(text: &str, size: f64, weight: u16) -> String {
    format!("content:{size}:{weight}:{text}")
}
pub fn template(key: &str) -> Result<ContentNode, String> {
    let dict: std::collections::HashMap<String, ContentNode> = serde_json::from_str(include_str!(
        concat!(env!("OUT_DIR"), "/content-templates.json")
    ))
    .map_err(|e| e.to_string())?;
    dict.get(key)
        .cloned()
        .ok_or_else(|| format!("unknown content template: {key}"))
}
fn lines(n: &ContentNode, width: f64, measure: &Measure) -> Vec<String> {
    let mut result = vec![];
    for paragraph in n.text.lines() {
        if !n.wrap {
            result.push(paragraph.into());
            continue;
        }
        let mut line = String::new();
        for word in paragraph.split_whitespace() {
            let candidate = if line.is_empty() {
                word.into()
            } else {
                format!("{line} {word}")
            };
            if !line.is_empty() && measure(&candidate, n.font_size, n.font_weight) > width {
                result.push(std::mem::take(&mut line));
                line = word.into();
            } else {
                line = candidate;
            }
        }
        result.push(line);
    }
    result
}
fn track_sizes(
    n: &ContentNode,
    width: f64,
    height: f64,
    measure: &Measure,
) -> (Vec<f64>, Vec<f64>) {
    let columns = if n.columns.is_empty() {
        vec![GridTrack::default()]
    } else {
        n.columns.clone()
    };
    let rows = if n.rows.is_empty() {
        vec![GridTrack::default()]
    } else {
        n.rows.clone()
    };
    let mut cw: Vec<f64> = columns
        .iter()
        .map(|t| {
            if t.unit == GridUnit::Pixel {
                t.value
            } else {
                0.
            }
        })
        .collect();
    for child in &n.children {
        let col = child.column.min(cw.len() - 1);
        if child.column_span == 1 && columns[col].unit == GridUnit::Auto {
            cw[col] = cw[col].max(natural_width(child, measure));
        }
    }
    let star: f64 = columns
        .iter()
        .filter(|t| t.unit == GridUnit::Star)
        .map(|t| t.value)
        .sum();
    let remaining = (width - cw.iter().sum::<f64>()).max(0.);
    for (i, t) in columns.iter().enumerate() {
        if t.unit == GridUnit::Star {
            cw[i] = if star > 0. {
                remaining * t.value / star
            } else {
                0.
            };
        }
    }
    let mut rh: Vec<f64> = rows
        .iter()
        .map(|t| {
            if t.unit == GridUnit::Pixel {
                t.value
            } else {
                0.
            }
        })
        .collect();
    for child in &n.children {
        let col = child.column.min(cw.len() - 1);
        let end = (col + child.column_span).min(cw.len());
        let row = child.row.min(rh.len() - 1);
        let rend = (row + child.row_span).min(rh.len());
        let wanted = desired(child, cw[col..end].iter().sum(), measure).1;
        let current: f64 = rh[row..rend].iter().sum();
        if wanted > current {
            let grow: Vec<_> = (row..rend)
                .filter(|&i| rows[i].unit != GridUnit::Pixel)
                .collect();
            for &i in &grow {
                rh[i] += (wanted - current) / grow.len() as f64;
            }
        }
    }
    if height.is_finite() {
        let extra = (height - rh.iter().sum::<f64>()).max(0.);
        let star: f64 = rows
            .iter()
            .filter(|t| t.unit == GridUnit::Star)
            .map(|t| t.value)
            .sum();
        for (i, t) in rows.iter().enumerate() {
            if t.unit == GridUnit::Star && star > 0. {
                rh[i] += extra * t.value / star;
            }
        }
    }
    (cw, rh)
}
pub fn desired(n: &ContentNode, width: f64, measure: &Measure) -> (f64, f64) {
    let inner = (n.width.unwrap_or(width) - n.margin[0] - n.margin[2]).max(0.);
    let (w, h) = match n.kind {
        ContentKind::TextBlock => (
            measure(&n.text, n.font_size, n.font_weight).min(inner),
            (lines(n, inner, measure).len() as f64 * n.font_size * 1.330078125).ceil(),
        ),
        ContentKind::StackPanel => {
            let sizes: Vec<_> = n
                .children
                .iter()
                .map(|c| desired(c, inner, measure))
                .collect();
            if n.orientation == Orientation::Horizontal {
                (
                    sizes.iter().map(|s| s.0).sum::<f64>()
                        + n.spacing * sizes.len().saturating_sub(1) as f64,
                    sizes.iter().map(|s| s.1).fold(0., f64::max),
                )
            } else {
                (
                    sizes.iter().map(|s| s.0).fold(0., f64::max),
                    sizes.iter().map(|s| s.1).sum::<f64>()
                        + n.spacing * sizes.len().saturating_sub(1) as f64,
                )
            }
        }
        ContentKind::ScrollViewer => n
            .children
            .first()
            .map(|c| desired(c, inner, measure))
            .unwrap_or((0., 0.)),
        ContentKind::Grid => {
            let (_, r) = track_sizes(n, inner, f64::INFINITY, measure);
            (natural_width(n, measure).min(inner), r.iter().sum())
        }
        ContentKind::Ellipse => (0., 0.),
    };
    (
        n.width.unwrap_or(w).max(n.min_width) + n.margin[0] + n.margin[2],
        n.height.unwrap_or(h).max(n.min_height) + n.margin[1] + n.margin[3],
    )
}
fn natural_width(n: &ContentNode, measure: &Measure) -> f64 {
    let size = n
        .width
        .unwrap_or_else(|| match n.kind {
            ContentKind::TextBlock => measure(&n.text, n.font_size, n.font_weight),
            ContentKind::StackPanel if n.orientation == Orientation::Horizontal => {
                n.children.iter().map(|c| natural_width(c, measure)).sum()
            }
            ContentKind::Grid => {
                let count = n.columns.len().max(1);
                let mut widths = vec![0f64; count];
                for child in &n.children {
                    let start = child.column.min(count - 1);
                    let end = (start + child.column_span).min(count);
                    let required = natural_width(child, measure) / (end - start) as f64;
                    for width in &mut widths[start..end] {
                        *width = width.max(required);
                    }
                }
                for (i, track) in n.columns.iter().enumerate() {
                    if track.unit == GridUnit::Pixel {
                        widths[i] = track.value;
                    }
                }
                widths.iter().sum()
            }
            _ => n
                .children
                .iter()
                .map(|c| natural_width(c, measure))
                .fold(0., f64::max),
        })
        .max(n.min_width);
    size + n.margin[0] + n.margin[2]
}
fn color(value: &str, theme: Theme) -> String {
    if let Some(key) = value
        .strip_prefix("{ThemeResource ")
        .and_then(|s| s.strip_suffix('}'))
    {
        if key == "SystemAccentColor" {
            return "#0078d4".into();
        }
        return crate::resources::Resources::current()
            .color(theme, key)
            .into();
    }
    match value {
        "DarkGray" => "#a9a9a9",
        "LightGray" => "#d3d3d3",
        "Gray" => "#808080",
        "DarkSalmon" => "#e9967a", "DarkRed" => "#8b0000", "LightCoral" => "#f08080", "IndianRed" => "#cd5c5c",
        "Khaki" => "#f0e68c", "DarkKhaki" => "#bdb76b", "DarkSeaGreen" => "#8fbc8f", "MediumSeaGreen" => "#3cb371", "DarkOliveGreen" => "#556b2f",
        "MediumTurquoise" => "#48d1cc", "SteelBlue" => "#4682b4", "SkyBlue" => "#87ceeb", "PowderBlue" => "#b0e0e6", "PaleVioletRed" => "#db7093",
        "Transparent" => "#00000000",
        "Black" => "#000000",
        "White" => "#ffffff",
        other => other,
    }
    .into()
}
/// Preserve XAML resource identity when instantiating a source Page as real nodes.
pub(crate) fn brush(value:&str)->crate::scene::BrushValue{
    if let Some(key)=value.strip_prefix("{ThemeResource ").and_then(|s|s.strip_suffix('}')){
        return crate::scene::BrushValue::Resource{resource:key.into()};
    }
    crate::scene::BrushValue::Color(color(value,Theme::Light))
}
pub fn paint(
    n: &ContentNode,
    slot: Rect,
    theme: Theme,
    measure: &Measure,
    out: &mut Vec<Draw>,
    scroll: f64,
) {
    let desired = desired(n, slot.width, measure);
    let mut r = Rect::new(
        slot.x + n.margin[0],
        slot.y + n.margin[1],
        slot.width - n.margin[0] - n.margin[2],
        slot.height - n.margin[1] - n.margin[3],
    );
    let w = n
        .width
        .unwrap_or(if n.horizontal_alignment == HorizontalAlignment::Stretch {
            r.width
        } else {
            desired.0 - n.margin[0] - n.margin[2]
        })
        .max(n.min_width)
        .min(r.width);
    let h = n
        .height
        .unwrap_or(if n.vertical_alignment == VerticalAlignment::Stretch {
            r.height
        } else {
            desired.1 - n.margin[1] - n.margin[3]
        })
        .max(n.min_height)
        .min(r.height);
    r.x += match n.horizontal_alignment {
        HorizontalAlignment::Center => (r.width - w) / 2.,
        HorizontalAlignment::Stretch if n.width.is_some() => (r.width - w) / 2.,
        HorizontalAlignment::Right => r.width - w,
        _ => 0.,
    };
    r.y += match n.vertical_alignment {
        VerticalAlignment::Center => (r.height - h) / 2.,
        VerticalAlignment::Stretch if n.height.is_some() => (r.height - h) / 2.,
        VerticalAlignment::Bottom => r.height - h,
        _ => 0.,
    };
    r.width = w;
    r.height = h;
    // XAML UseLayoutRounding aligns arranged edges to the current DIP raster.
    let right = (r.x + r.width).round();
    let bottom = (r.y + r.height).round();
    r.x = r.x.round();
    r.y = r.y.round();
    r.width = (right - r.x).max(0.);
    r.height = (bottom - r.y).max(0.);
    if let Some(fill) = &n.fill {
        if n.kind == ContentKind::Ellipse {
            out.push(Draw::Ellipse {
                rect: r,
                color: color(fill, theme),
            });
        } else {
            out.push(Draw::Fill {
                rect: r,
                color: color(fill, theme),
                radius: 0.,
            });
        }
    }
    match n.kind {
        ContentKind::TextBlock => {
            let color =
                crate::resources::Resources::current().color(theme, "TextFillColorPrimaryBrush");
            for (i, line) in lines(n, r.width, measure).iter().enumerate() {
                out.push(Draw::Text {
                    style: Default::default(),
                    x: r.x
                        + if n.trim_side_bearings {
                            line.chars()
                                .next()
                                .map(|c| {
                                    measure(&format!("@bearing:{c}"), n.font_size, n.font_weight)
                                })
                                .unwrap_or(0.)
                        } else {
                            0.
                        },
                    y: r.y + n.font_size * 1.071428571 + 1. + i as f64 * n.font_size * 1.330078125,
                    text: line.clone(),
                    color: color.into(),
                    size: n.font_size,
                    weight: n.font_weight,
                    font: "Segoe UI, system-ui, sans-serif".into(),
                    max_width: r.width,
                });
            }
        }
        ContentKind::Grid => {
            let (cw, rh) = track_sizes(n, r.width, r.height, measure);
            for child in &n.children {
                let c = child.column.min(cw.len() - 1);
                let row = child.row.min(rh.len() - 1);
                let cell = Rect::new(
                    r.x + cw[..c].iter().sum::<f64>(),
                    r.y + rh[..row].iter().sum::<f64>(),
                    cw[c..(c + child.column_span).min(cw.len())].iter().sum(),
                    rh[row..(row + child.row_span).min(rh.len())].iter().sum(),
                );
                paint(child, cell, theme, measure, out, scroll);
            }
        }
        ContentKind::StackPanel => {
            let mut offset = 0.;
            for child in &n.children {
                let size = desired_child(child, r.width, measure);
                let cell = if n.orientation == Orientation::Vertical {
                    Rect::new(r.x, r.y + offset, r.width, size.1)
                } else {
                    Rect::new(r.x + offset, r.y, size.0, r.height)
                };
                paint(child, cell, theme, measure, out, scroll);
                offset += if n.orientation == Orientation::Vertical {
                    size.1
                } else {
                    size.0
                } + n.spacing;
            }
        }
        ContentKind::ScrollViewer => {
            out.push(Draw::Clip { rect: r });
            for child in &n.children {
                let h = desired_child(child, r.width, measure).1.max(r.height);
                paint(
                    child,
                    Rect::new(r.x, r.y - scroll, r.width, h),
                    theme,
                    measure,
                    out,
                    0.,
                );
            }
            out.push(Draw::Restore);
        }
        ContentKind::Ellipse => {}
    }
}
fn desired_child(n: &ContentNode, w: f64, m: &Measure) -> (f64, f64) {
    desired(n, w, m)
}
impl ContentNode {
    pub fn validate(&self, depth: usize, count: &mut usize) -> Result<(), String> {
        *count += 1;
        if depth > 32 || *count > 5000 {
            return Err("content tree exceeds limits".into());
        }
        for value in [
            self.min_width,
            self.min_height,
            self.font_size,
            self.spacing,
        ]
        .into_iter()
        .chain(self.margin)
        .chain(self.width)
        .chain(self.height)
        {
            if !value.is_finite() || value < 0. {
                return Err("content dimensions must be finite and nonnegative".into());
            }
        }
        if self.row_span == 0 || self.column_span == 0 {
            return Err("grid spans must be positive".into());
        }
        for child in &self.children {
            child.validate(depth + 1, count)?;
        }
        Ok(())
    }
}
