//! Text layout is shared by both backends; GPU text uses the same measured run
//! rasterized at the target DPR, with its actual ink bounds, never a stretched canvas.
use serde::{Deserialize, Serialize};
use unicode_segmentation::UnicodeSegmentation;
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Font {
    pub family: String,
    pub size: f64,
    pub weight: u16,
    pub style: crate::enums::FontStyle,
}
impl Default for Font {
    fn default() -> Self {
        Self {
            family: "Segoe UI, system-ui, sans-serif".into(),
            size: 14.,
            weight: 400,
            style: Default::default(),
        }
    }
}
impl Font {
    pub fn css(&self) -> String {
        // 宿主仅在 Windows 注册本机字体别名；其他平台只加载独立命名的开源字体。
        // 测量、Canvas2D 和 WebGL2 使用同一字体栈，缺字时逐字形回退。
        let fluent = self.family.contains("Segoe Fluent Icons");
        let mdl2 = self.family.contains("Segoe MDL2 Assets");
        let family = self.family
            .replace("Segoe Fluent Icons", "WinUI Native Fluent Icons")
            .replace("Segoe MDL2 Assets", "WinUI Native MDL2 Icons");
        let fallback = if fluent && !mdl2 {
            ", WinUI Native MDL2 Icons, WinUI Portable Icons"
        } else if fluent || mdl2 {
            ", WinUI Portable Icons"
        } else {
            ""
        };
        format!(
            "{} {} {}px {}{}, Segoe UI, system-ui, sans-serif",
            self.style.as_str().to_lowercase(),
            self.weight,
            self.size,
            family,
            fallback
        )
    }
}
#[derive(Clone, Copy, Debug, Default, Serialize)]
pub struct Metrics {
    pub width: f64,
    pub ascent: f64,
    pub descent: f64,
    pub left: f64,
    pub right: f64,
}
pub trait TextMeasurer {
    fn measure(&mut self, text: &str, font: &Font) -> Metrics;
    /// Natural line spacing, including the primary font's line gap.
    fn line_height(&mut self, font: &Font, reference: Metrics) -> f64 {
        (reference.ascent + reference.descent).max(font.size * 1.330078125)
    }
    /// Design cap height used by TextLineBounds=Tight. Hosts may provide exact font metrics.
    fn cap_height(&mut self, font: &Font) -> f64 {
        font.size * 0.7
    }
}
/// Oversized probes are only a precision aid. System/variable fonts can select
/// another optical face at large sizes, and platform font APIs can clamp them
/// without changing Canvas.font. Never let that probe replace target-size metrics.
#[cfg(target_arch = "wasm32")]
fn refined_metric(target: f64, scaled: f64) -> f64 {
    if scaled.is_finite() && (scaled - target).abs() <= 1. {
        scaled
    } else {
        target
    }
}
/// D2DTextDrawingContext::GetGlyphRunTransformAndBounds rounds the physical
/// baseline before handing the glyph texture to Composition.
pub fn snap_baseline(y: f64, matrix: [f64; 6], dpr: f64) -> f64 {
    if matrix[1].abs() < 1e-9 && matrix[2].abs() < 1e-9 && matrix[3].abs() > 1e-9 {
        let pixel = (matrix[3] * y + matrix[5]) * dpr;
        (((pixel + 0.5).floor() / dpr) - matrix[5]) / matrix[3]
    } else {
        y
    }
}
/// TextTrimming.Clip opts out of TextBlock's DWriteLayout fast path.
/// LineServices uses 300 units per DIP, then TextBlock adds the full upward
/// layout-rounding budget to its rendering offset (TextBlock.cpp, MeasureOverride).
pub fn line_services_rounding(layout: &mut TextLayout, dpr: f64) {
    let old_height = layout.line_height;
    layout.line_height = (old_height * 300.).round() / 300.;
    layout.height = layout.line_height * layout.lines.len() as f64;
    let offset = ((layout.height * dpr - 1e-9).ceil() / dpr - layout.height).max(0.);
    for (i, line) in layout.lines.iter_mut().enumerate() {
        line.baseline = ((line.baseline - i as f64 * old_height) * 300.).round() / 300.
            + i as f64 * layout.line_height
            + offset;
        line.width = (line.width * 300.).round() / 300.;
    }
    layout.width = (layout.width * 300.).round() / 300.;
}
/// Tight line bounds retain ink overflow below the baseline, as native TextBlock does.
pub fn layout_tight(text: &str, font: &Font, measure: &mut impl TextMeasurer) -> TextLayout {
    let mut value = layout(
        text,
        font,
        f64::INFINITY,
        false,
        crate::enums::TextTrimming::Clip,
        None,
        measure,
    );
    let height = measure.cap_height(font);
    for line in &mut value.lines {
        line.baseline = height;
    }
    value.height = height;
    value.line_height = height;
    value
}
#[derive(Clone, Debug, Serialize)]
pub struct Line {
    pub text: String,
    pub width: f64,
    pub baseline: f64,
    #[serde(rename = "inkLeft")]
    pub ink_left: f64,
    #[serde(rename = "inkRight")]
    pub ink_right: f64,
}
#[derive(Clone, Debug, Default, Serialize)]
pub struct TextLayout {
    pub lines: Vec<Line>,
    pub width: f64,
    pub height: f64,
    pub line_height: f64,
}
pub fn layout(
    text: &str,
    font: &Font,
    width: f64,
    wrap: bool,
    trimming: crate::enums::TextTrimming,
    line_height: Option<f64>,
    measure: &mut impl TextMeasurer,
) -> TextLayout {
    let reference = measure.measure(if text.is_empty() { "Hg" } else { text }, font);
    let line_height = line_height.unwrap_or_else(|| measure.line_height(font, reference));
    let mut values = Vec::new();
    for paragraph in text.split('\n') {
        if !wrap || paragraph.is_empty() {
            values.push(paragraph.to_string());
            continue;
        }
        let mut start = 0;
        let mut previous = 0;
        for (end, _) in unicode_linebreak::linebreaks(paragraph) {
            if end <= start {
                continue;
            }
            let value = paragraph[start..end].trim_end();
            if previous > start && measure.measure(value, font).width > width {
                values.push(paragraph[start..previous].trim_end().to_string());
                start = previous;
            }
            previous = end;
        }
        if start < paragraph.len() {
            values.push(paragraph[start..].trim_end().to_string());
        }
    }
    // WinUI TextWrapping.Wrap falls back to grapheme boundaries for a token
    // wider than the line. Keep the normal Unicode word opportunities above,
    // but do not clip long labels (for example a reusable AppBar command).
    if wrap && width.is_finite() && width > 0. {
        let mut broken = Vec::new();
        for value in values {
            let mut rest = value.as_str();
            while measure.measure(rest, font).width > width {
                let boundaries = rest
                    .grapheme_indices(true)
                    .map(|(i, _)| i)
                    .chain(std::iter::once(rest.len()))
                    .collect::<Vec<_>>();
                let (mut lo, mut hi) = (1, boundaries.len() - 1);
                while lo < hi {
                    let mid = (lo + hi).div_ceil(2);
                    if measure.measure(&rest[..boundaries[mid]], font).width <= width {
                        lo = mid;
                    } else {
                        hi = mid - 1;
                    }
                }
                let end = boundaries[lo];
                broken.push(rest[..end].to_string());
                rest = &rest[end..];
                if rest.is_empty() {
                    break;
                }
            }
            if !rest.is_empty() || value.is_empty() {
                broken.push(rest.to_string());
            }
        }
        values = broken;
    }
    let mut result = TextLayout {
        line_height,
        ..TextLayout::default()
    };
    for (index, mut value) in values.into_iter().enumerate() {
        let mut metrics = measure.measure(&value, font);
        if matches!(
            trimming,
            crate::enums::TextTrimming::CharacterEllipsis
                | crate::enums::TextTrimming::WordEllipsis
        ) && metrics.width > width
        {
            let boundaries: Vec<_> = if trimming == crate::enums::TextTrimming::WordEllipsis {
                std::iter::once(0)
                    .chain(value.unicode_word_indices().map(|(i, w)| i + w.len()))
                    .collect()
            } else {
                value
                    .grapheme_indices(true)
                    .map(|(i, _)| i)
                    .chain(std::iter::once(value.len()))
                    .collect()
            };
            let (mut lo, mut hi) = (0, boundaries.len() - 1);
            while lo < hi {
                let mid = (lo + hi).div_ceil(2);
                let candidate = format!("{}…", &value[..boundaries[mid]]);
                if measure.measure(&candidate, font).width <= width {
                    lo = mid;
                } else {
                    hi = mid - 1;
                }
            }
            value = if measure.measure("…", font).width <= width {
                format!("{}…", &value[..boundaries[lo]])
            } else {
                String::new()
            };
            metrics = measure.measure(&value, font);
        }
        result.width = result.width.max(metrics.width.min(width.max(0.)));
        result.lines.push(Line {
            text: value,
            width: metrics.width,
            baseline: reference.ascent + index as f64 * line_height,
            ink_left: metrics.left,
            ink_right: metrics.right,
        });
    }
    result.height = result.lines.len() as f64 * line_height;
    result
}
/// TextBlock MaxLines and height-constrained ellipsis are applied after wrapping.
/// Retain full line baselines; the renderer still clips a partially visible line.
pub fn constrain_lines(
    result: &mut TextLayout, font: &Font, width: f64, height: f64,
    max_lines: usize, trimming: crate::enums::TextTrimming,
    measure: &mut impl TextMeasurer,
) {
    let ellipsis = matches!(trimming, crate::enums::TextTrimming::CharacterEllipsis | crate::enums::TextTrimming::WordEllipsis);
    let mut count = if max_lines == 0 {usize::MAX} else {max_lines};
    if ellipsis && height.is_finite() && result.line_height > 0. {
        count = count.min(((height / result.line_height + 1e-9).floor() as usize).max(1));
    }
    if result.lines.len() <= count {return;}
    result.lines.truncate(count);
    if ellipsis {
        if let Some(last) = result.lines.last_mut() {
            let text = format!("{}…", last.text.trim_end().trim_end_matches('…'));
            let mut clipped = layout(&text,font,width,false,trimming,Some(result.line_height),measure);
            if let Some(mut line) = clipped.lines.pop() {line.baseline=last.baseline;*last=line;}
        }
    }
    result.width=result.lines.iter().map(|line|line.width.min(width.max(0.))).fold(0.,f64::max);
    result.height=result.lines.len() as f64*result.line_height;
}
#[cfg(target_arch = "wasm32")]
pub struct BrowserText {
    pub ctx: web_sys::CanvasRenderingContext2d,
    cache: std::collections::HashMap<String, Metrics>,
    line_cache: std::collections::HashMap<String, f64>,
    cap_cache: std::collections::HashMap<String, f64>,
    line_host: web_sys::HtmlElement,
    line_box: web_sys::HtmlElement,
}
#[cfg(target_arch = "wasm32")]
impl BrowserText {
    pub fn new(document: &web_sys::Document) -> Result<Self, wasm_bindgen::JsValue> {
        use wasm_bindgen::JsCast;
        let c = document
            .create_element("canvas")?
            .dyn_into::<web_sys::HtmlCanvasElement>()?;
        let ctx = c
            .get_context("2d")?
            .ok_or_else(|| wasm_bindgen::JsValue::from_str("text measurer unavailable"))?
            .dyn_into()?;
        // An empty line's primary-font strut exposes lineGap, which Canvas
        // fontBoundingBox omits (for example Arial). A zero-sized clipped host
        // avoids adding any visible content, hit target or document overflow.
        let line_host = document
            .create_element("div")?
            .dyn_into::<web_sys::HtmlElement>()?;
        line_host.set_attribute("aria-hidden", "true")?;
        line_host.set_attribute("data-winui-font-metrics", "")?;
        line_host.style().set_css_text("position:fixed;left:0;top:0;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none;contain:strict");
        let line_box = document
            .create_element("div")?
            .dyn_into::<web_sys::HtmlElement>()?;
        line_box.set_inner_html("<br>");
        line_host.append_child(&line_box)?;
        document
            .document_element()
            .ok_or_else(|| wasm_bindgen::JsValue::from_str("font metrics require a document root"))?
            .append_child(&line_host)?;
        Ok(Self {
            ctx,
            cache: Default::default(),
            line_cache: Default::default(),
            cap_cache: Default::default(),
            line_host,
            line_box,
        })
    }
    pub fn invalidate(&mut self) {
        self.cache.clear();
        self.line_cache.clear();
        self.cap_cache.clear();
    }
}
#[cfg(target_arch = "wasm32")]
impl Drop for BrowserText {
    fn drop(&mut self) {
        self.line_host.remove();
    }
}
#[cfg(target_arch = "wasm32")]
impl TextMeasurer for BrowserText {
    fn line_height(&mut self, font: &Font, reference: Metrics) -> f64 {
        let key = font.css();
        if let Some(value) = self.line_cache.get(&key) {
            return value.max(reference.ascent + reference.descent);
        }
        self.ctx.set_font(&key);
        self.line_box.style().set_property("font", &self.ctx.font()).expect("valid font");
        self.line_box.style().set_property("line-height", "normal").expect("valid line spacing");
        let target = self.line_box.get_bounding_client_rect().height();
        let mut large = font.clone();
        large.size = 8192.;
        self.ctx.set_font(&large.css());
        let accepted = self.ctx.font();
        let accepted_size = accepted
            .split_whitespace()
            .find_map(|s| s.strip_suffix("px").and_then(|v| v.parse::<f64>().ok()))
            .unwrap_or(large.size);
        self.line_box
            .style()
            .set_property("font", &accepted)
            .expect("valid font");
        self.line_box
            .style()
            .set_property("line-height", "normal")
            .expect("valid line spacing");
        let value = self.line_box.get_bounding_client_rect().height() / accepted_size * font.size;
        self.ctx.set_font(&key);
        let value = if value > 0. && value.is_finite() {
            refined_metric(target, value)
        } else {
            reference.ascent + reference.descent
        };
        if self.line_cache.len() > 1024 {
            self.line_cache.clear();
        }
        self.line_cache.insert(key, value);
        value.max(reference.ascent + reference.descent)
    }
    fn cap_height(&mut self, font: &Font) -> f64 {
        let key = font.css();
        if let Some(value) = self.cap_cache.get(&key) {
            return *value;
        }
        self.ctx.set_font(&key);
        let target = self.ctx.measure_text("H").expect("valid cap-height metrics").actual_bounding_box_ascent();
        let precision = 8192. / font.size;
        let mut large = font.clone();
        large.size *= precision;
        self.ctx.set_font(&large.css());
        // Canvas normalizes oversized CSS fonts (Chrome caps them at 10000px).
        // Divide by the accepted size, preserving precision without shifting baselines.
        let precision = self
            .ctx
            .font()
            .split_whitespace()
            .find_map(|s| s.strip_suffix("px").and_then(|s| s.parse::<f64>().ok()))
            .unwrap_or(large.size)
            / font.size;
        let cap = self
            .ctx
            .measure_text("H")
            .expect("valid cap-height metrics")
            .actual_bounding_box_ascent()
            / precision;
        self.ctx.set_font(&font.css());
        let cap = refined_metric(target, cap).max(font.size * 0.1);
        if self.cap_cache.len() >= 1024 {
            self.cap_cache.clear();
        }
        self.cap_cache.insert(key, cap);
        cap
    }
    fn measure(&mut self, text: &str, font: &Font) -> Metrics {
        let key = format!(
            "{}:{}:{}:{:?}:{text}",
            font.family, font.size, font.weight, font.style
        );
        if let Some(value) = self.cache.get(&key) {
            return *value;
        }
        self.ctx.set_font(&font.css());
        let m = self.ctx.measure_text(text).expect("valid font and text");
        // At small sizes Canvas rounds font-box metrics to whole CSS pixels,
        // while DirectWrite exposes fractional baselines. Measure a larger run
        // to recover fractional metrics, but validate against the target size:
        // platform font limits and optical/fallback faces can change at 8192px.
        let precision = 8192. / font.size;
        let mut large = font.clone();
        large.size *= precision;
        self.ctx.set_font(&large.css());
        let high = self.ctx.measure_text(text).expect("scaled font metrics");
        let precision = self
            .ctx
            .font()
            .split_whitespace()
            .find_map(|s| s.strip_suffix("px").and_then(|s| s.parse::<f64>().ok()))
            .unwrap_or(large.size)
            / font.size;
        self.ctx.set_font(&font.css());
        let value = Metrics {
            width: m.width(),
            ascent: refined_metric(m.font_bounding_box_ascent(), high.font_bounding_box_ascent() / precision),
            descent: refined_metric(m.font_bounding_box_descent(), high.font_bounding_box_descent() / precision),
            // Ink bounds belong to the run we actually draw, including hinting
            // and fallback at its real size; a larger optical face can differ.
            left: m.actual_bounding_box_left(),
            right: m.actual_bounding_box_right(),
        };
        if self.cache.len() > 8192 {
            self.cache.clear();
        }
        self.cache.insert(key, value);
        value
    }
}
