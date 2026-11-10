//! Presentation MathML parsing and baseline-aware layout, independent of DOM MathML.
use super::*;
use crate::{
    model::Rect,
    render::Draw,
    typography::{Font, TextMeasurer},
};
use std::collections::BTreeMap;

#[derive(Clone, Debug)]
pub struct MathNode {
    pub name: String,
    pub text: String,
    pub attributes: BTreeMap<String, String>,
    pub children: Vec<MathNode>,
}
/// Resolve common MathML entities without loading a DTD or any external resource.
pub fn canonical(xml: &str) -> Result<String, String> {
    let mut out = String::with_capacity(xml.len());
    let mut at = 0;
    while at < xml.len() {
        let rest = &xml[at..];
        let amp = rest.find('&');
        let cdata = rest.find("<![CDATA[").map(|i| (i, "]]>", 9));
        let comment = rest.find("<!--").map(|i| (i, "-->", 4));
        let section = [cdata, comment].into_iter().flatten().min_by_key(|v| v.0);
        if let Some((start, end, lead)) = section.filter(|s| amp.is_none_or(|a| s.0 < a)) {
            let close = rest[start + lead..]
                .find(end)
                .map(|i| start + lead + i + end.len())
                .ok_or("unterminated MathML comment/CDATA")?;
            out.push_str(&rest[..close]);
            at += close;
            continue;
        }
        let Some(start) = amp else {
            out.push_str(rest);
            break;
        };
        out.push_str(&rest[..start]);
        let end = rest[start..]
            .find(';')
            .filter(|n| *n <= 40)
            .ok_or("invalid MathML entity")?
            + start;
        let name = &rest[start + 1..end];
        if name.starts_with('#') || ["amp", "lt", "gt", "quot", "apos"].contains(&name) {
            out.push_str(&rest[start..=end]);
        } else {
            let value = match name {
                "nbsp" => "\u{a0}",
                "InvisibleTimes" => "\u{2062}",
                "ApplyFunction" => "\u{2061}",
                "InvisibleComma" => "\u{2063}",
                "ThinSpace" => "\u{2009}",
                "VeryThinSpace" => "\u{200a}",
                "alpha" => "α",
                "beta" => "β",
                "gamma" => "γ",
                "delta" => "δ",
                "epsilon" => "ε",
                "theta" => "θ",
                "lambda" => "λ",
                "mu" => "μ",
                "nu" => "ν",
                "sigma" => "σ",
                "phi" => "φ",
                "omega" => "ω",
                "pi" => "π",
                "Gamma" => "Γ",
                "Delta" => "Δ",
                "Theta" => "Θ",
                "Lambda" => "Λ",
                "Pi" => "Π",
                "Sigma" => "Σ",
                "Phi" => "Φ",
                "Omega" => "Ω",
                "infin" => "∞",
                "sum" => "∑",
                "prod" => "∏",
                "int" => "∫",
                "radic" => "√",
                "times" => "×",
                "divide" => "÷",
                "minus" => "−",
                "plusmn" => "±",
                "le" => "≤",
                "ge" => "≥",
                "ne" => "≠",
                "isin" => "∈",
                "notin" => "∉",
                "subset" => "⊂",
                "subseteq" => "⊆",
                "rarr" => "→",
                "harr" => "↔",
                "langle" => "⟨",
                "rangle" => "⟩",
                "prime" => "′",
                "Prime" => "″",
                "forall" => "∀",
                "exist" => "∃",
                "partial" => "∂",
                "nabla" => "∇",
                _ => {
                    return Err(format!(
                        "unsupported MathML named entity: {name}; use Unicode or a numeric entity"
                    ))
                }
            };
            out.push_str(value);
        }
        at += end + 1;
    }
    Ok(out)
}
impl MathNode {
    fn attr(&self, key: &str) -> Option<&str> {
        self.attributes.get(key).map(String::as_str)
    }
}
pub fn parse(xml: &str) -> Result<MathNode, String> {
    if xml.len() > 131072 || xml.contains("<!DOCTYPE") || xml.contains("<!ENTITY") {
        return Err("MathML exceeds limits or declares a DTD/entity".into());
    }
    let xml = canonical(xml)?;
    let doc = roxmltree::Document::parse(&xml).map_err(|e| format!("invalid MathML: {e}"))?;
    if doc.root_element().tag_name().name() != "math" {
        return Err("MathML root must be math".into());
    }
    fn node(n: roxmltree::Node, depth: usize, count: &mut usize) -> Result<MathNode, String> {
        *count += 1;
        if depth > 48 || *count > 4096 {
            return Err("MathML tree exceeds limits".into());
        }
        if n.tag_name()
            .namespace()
            .is_some_and(|s| s != "http://www.w3.org/1998/Math/MathML")
        {
            return Err("unsupported MathML namespace".into());
        }
        let name = n.tag_name().name();
        if ![
            "math",
            "mrow",
            "mi",
            "mn",
            "mo",
            "mtext",
            "ms",
            "mspace",
            "mfrac",
            "msqrt",
            "mroot",
            "msub",
            "msup",
            "msubsup",
            "munder",
            "mover",
            "munderover",
            "mfenced",
            "mtable",
            "mtr",
            "mtd",
            "mstyle",
            "mphantom",
            "mpadded",
            "menclose",
            "merror",
            "semantics",
            "annotation",
            "annotation-xml",
        ]
        .contains(&name)
        {
            return Err(format!("unsupported MathML element: {name}"));
        }
        let metadata = matches!(name, "annotation" | "annotation-xml");
        let mut attributes = BTreeMap::new();
        for a in n.attributes() {
            let key = a.name();
            let common = [
                "mathcolor",
                "mathbackground",
                "mathsize",
                "mathvariant",
                "displaystyle",
                "scriptlevel",
                "id",
                "class",
            ];
            let local: &[&str] = match name {
                "math" => &["display"],
                "mo" => &[
                    "stretchy",
                    "largeop",
                    "lspace",
                    "rspace",
                    "fence",
                    "separator",
                    "form",
                    "movablelimits",
                    "accent",
                    "symmetric",
                ],
                "mspace" => &["width", "height", "depth"],
                "mfrac" => &["linethickness", "bevelled", "numalign", "denomalign"],
                "mfenced" => &["open", "close", "separators"],
                "ms" => &["lquote", "rquote"],
                "mpadded" => &["width", "height", "depth", "lspace", "voffset"],
                "menclose" => &["notation"],
                "mtable" => &[
                    "rowspacing",
                    "columnspacing",
                    "columnalign",
                    "rowalign",
                    "equalrows",
                    "equalcolumns",
                ],
                "mtd" => &["columnalign"],
                "mover" | "munder" | "munderover" => &["accent", "accentunder"],
                _ => &[],
            };
            if !metadata && !common.contains(&key) && !local.contains(&key) {
                return Err(format!("unsupported MathML attribute {name}.{key}"));
            }
            if key == "mathcolor" || key == "mathbackground" {
                if !crate::material::valid_color(a.value()) {
                    return Err("MathML colors use #RRGGBB[AA]".into());
                }
            }
            if key == "mathvariant"
                && !matches!(
                    a.value(),
                    "normal"
                        | "bold"
                        | "italic"
                        | "bold-italic"
                        | "monospace"
                        | "sans-serif"
                        | "double-struck"
                        | "script"
                        | "fraktur"
                )
            {
                return Err("unsupported MathML mathvariant".into());
            }
            if [
                "displaystyle",
                "stretchy",
                "largeop",
                "fence",
                "separator",
                "movablelimits",
                "accent",
                "accentunder",
                "symmetric",
                "bevelled",
                "equalrows",
                "equalcolumns",
            ]
            .contains(&key)
                && !matches!(a.value(), "true" | "false")
            {
                return Err(format!("invalid MathML boolean: {key}"));
            }
            if key == "scriptlevel" {
                let level = a
                    .value()
                    .parse::<i32>()
                    .map_err(|_| "invalid MathML scriptlevel")?;
                if !(-8..=8).contains(&level) {
                    return Err("MathML scriptlevel exceeds limits".into());
                }
            }
            if ["numalign", "denomalign", "columnalign"].contains(&key)
                && a.value()
                    .split_whitespace()
                    .any(|v| !matches!(v, "left" | "center" | "right"))
            {
                return Err("unsupported MathML alignment".into());
            }
            if key == "rowalign" && a.value() != "baseline" {
                return Err("MathML rowalign currently supports baseline".into());
            }
            if key == "notation"
                && a.value().split_whitespace().any(|v| {
                    !matches!(
                        v,
                        "box"
                            | "top"
                            | "bottom"
                            | "left"
                            | "right"
                            | "horizontalstrike"
                            | "updiagonalstrike"
                            | "downdiagonalstrike"
                    )
                })
            {
                return Err("unsupported MathML enclosure notation".into());
            }
            if matches!(key, "rowspacing" | "columnspacing")
                && a.value().split_whitespace().count() > 1
            {
                return Err("MathML table spacing currently uses one repeated length".into());
            }
            attributes.insert(key.into(), a.value().into());
        }
        let children = if metadata {
            vec![]
        } else {
            n.children()
                .filter(|n| n.is_element())
                .map(|n| node(n, depth + 1, count))
                .collect::<Result<Vec<_>, _>>()?
        };
        let required = match name {
            "mfrac" | "mroot" | "msub" | "msup" | "munder" | "mover" => Some(2),
            "msubsup" | "munderover" => Some(3),
            _ => None,
        };
        if required.is_some_and(|r| children.len() != r) {
            return Err(format!("MathML {name} has incorrect argument count"));
        }
        if name == "semantics"
            && (children.is_empty()
                || matches!(children[0].name.as_str(), "annotation" | "annotation-xml"))
        {
            return Err("MathML semantics needs a presentation expression".into());
        }
        if name == "mtable" && children.iter().any(|n| n.name != "mtr")
            || name == "mtr" && children.iter().any(|n| n.name != "mtd")
        {
            return Err("MathML table needs mtr rows and mtd cells".into());
        }
        if matches!(name, "mi" | "mn" | "mo" | "mtext" | "ms") && !children.is_empty() {
            return Err("MathML token cannot contain markup".into());
        }
        let text = n
            .children()
            .filter_map(|n| n.text().filter(|_| n.is_text()))
            .collect::<String>();
        if !metadata && text.chars().count() > 256 {
            return Err("MathML token exceeds 256 characters".into());
        }
        let value = MathNode {
            name: name.into(),
            text,
            attributes,
            children,
        };
        // Validate dimensions before admitting the document, not in the paint loop.
        for key in [
            "mathsize",
            "width",
            "height",
            "depth",
            "lspace",
            "rspace",
            "voffset",
            "linethickness",
            "rowspacing",
            "columnspacing",
        ] {
            if let Some(v) = value.attr(key) {
                dimension(v.split_whitespace().next().unwrap_or(""), 16., 16.)?;
            }
        }
        Ok(value)
    }
    node(doc.root_element(), 0, &mut 0)
}
fn dimension(s: &str, em: f64, relative: f64) -> Result<f64, String> {
    let s = s.trim();
    let named = match s {
        "thinmathspace" => Some(em / 6.),
        "mediummathspace" => Some(em * 2. / 9.),
        "thickmathspace" => Some(em * 5. / 18.),
        "thin" => Some(em / 24.),
        "medium" => Some(em / 16.),
        "thick" => Some(em / 12.),
        "normal" => Some(em),
        "small" => Some(em * 0.8),
        "big" => Some(em * 1.2),
        _ => None,
    };
    if let Some(v) = named {
        return Ok(v);
    }
    let (number, scale) = if let Some(v) = s.strip_suffix("em") {
        (v, em)
    } else if let Some(v) = s.strip_suffix("ex") {
        (v, em * 0.5)
    } else if let Some(v) = s.strip_suffix("px") {
        (v, 1.)
    } else if let Some(v) = s.strip_suffix("pt") {
        (v, 96. / 72.)
    } else if let Some(v) = s.strip_suffix('%') {
        (v, relative / 100.)
    } else {
        (s, 1.)
    };
    let v = number
        .parse::<f64>()
        .map_err(|_| format!("invalid MathML dimension: {s}"))?
        * scale;
    if !v.is_finite() || v.abs() > 8192. {
        return Err("MathML dimension exceeds limits".into());
    }
    Ok(v)
}
#[derive(Clone)]
enum Primitive {
    Text {
        at: [f64; 2],
        text: String,
        font: Font,
        color: Option<String>,
    },
    Line {
        from: [f64; 2],
        to: [f64; 2],
        width: f64,
        color: Option<String>,
    },
    Background {
        rect: Rect,
        color: String,
    },
}
#[derive(Clone, Default)]
pub struct MathBox {
    pub width: f64,
    pub ascent: f64,
    pub descent: f64,
    ink: Vec<Primitive>,
}
impl MathBox {
    fn append(&mut self, b: &Self, x: f64, y: f64) {
        for p in &b.ink {
            let mut p = p.clone();
            match &mut p {
                Primitive::Text { at, .. } => {
                    at[0] += x;
                    at[1] += y;
                }
                Primitive::Line { from, to, .. } => {
                    from[0] += x;
                    from[1] += y;
                    to[0] += x;
                    to[1] += y;
                }
                Primitive::Background { rect, .. } => {
                    rect.x += x;
                    rect.y += y;
                }
            }
            self.ink.push(p);
        }
    }
    fn line(&mut self, a: [f64; 2], b: [f64; 2], font: &Font, color: &Option<String>) {
        self.ink.push(Primitive::Line {
            from: a,
            to: b,
            width: (font.size / 18.).max(1.),
            color: color.clone(),
        });
    }
    pub fn paint(&self, out: &mut Vec<Draw>, x: f64, y: f64, color: &str, force_color: bool) {
        for p in &self.ink {
            match p {
                Primitive::Text {
                    at,
                    text,
                    font,
                    color: own,
                } => out.push(Draw::Text {
                    x: x + at[0],
                    y: y + at[1],
                    text: text.clone(),
                    font: font.family.clone(),
                    size: font.size,
                    weight: font.weight,
                    style: font.style,
                    max_width: 100000.,
                    color: if force_color {
                        color.into()
                    } else {
                        own.clone().unwrap_or_else(|| color.into())
                    },
                }),
                Primitive::Line {
                    from,
                    to,
                    width,
                    color: own,
                } => out.push(Draw::Polyline {
                    points: vec![[x + from[0], y + from[1]], [x + to[0], y + to[1]]],
                    width: *width,
                    color: if force_color {
                        color.into()
                    } else {
                        own.clone().unwrap_or_else(|| color.into())
                    },
                }),
                Primitive::Background { rect, color: own } => {
                    if !force_color {
                        out.push(Draw::Fill {
                            rect: Rect::new(x + rect.x, y + rect.y, rect.width, rect.height),
                            radius: 0.,
                            color: own.clone(),
                        });
                    }
                }
            }
        }
    }
}
pub fn layout(n: &MathNode, base: &Font, m: &mut impl TextMeasurer) -> MathBox {
    let mut font = base.clone();
    font.family = "Cambria Math".into();
    layout_node(n, &font, None, false, None, m)
}
fn token(text: String, font: &Font, color: Option<String>, m: &mut impl TextMeasurer) -> MathBox {
    let v = m.measure(&text, font);
    MathBox {
        width: v.width,
        ascent: v.ascent,
        descent: v.descent,
        ink: vec![Primitive::Text {
            at: [0., 0.],
            text,
            font: font.clone(),
            color,
        }],
    }
}
fn row(boxes: &[MathBox]) -> MathBox {
    let mut r = MathBox::default();
    for b in boxes {
        r.append(b, r.width, 0.);
        r.width += b.width;
        r.ascent = r.ascent.max(b.ascent);
        r.descent = r.descent.max(b.descent);
    }
    r
}
fn layout_node(
    n: &MathNode,
    base: &Font,
    color: Option<String>,
    display: bool,
    inherited_variant: Option<&str>,
    m: &mut impl TextMeasurer,
) -> MathBox {
    let mut f = base.clone();
    if let Some(s) = n.attr("mathsize") {
        f.size = dimension(s, f.size, f.size).unwrap().clamp(1., 512.);
    }
    if let Some(s) = n.attr("scriptlevel") {
        f.size = (f.size * 0.71_f64.powi(s.parse().unwrap())).clamp(6., 512.);
    }
    let color = n.attr("mathcolor").map(str::to_string).or(color);
    let display = n
        .attr("displaystyle")
        .map(|v| v == "true")
        .unwrap_or(display || n.attr("display") == Some("block"));
    let variant = n.attr("mathvariant").or(inherited_variant);
    if let Some(v) = variant {
        f.style = if v.contains("italic") {
            FontStyle::Italic
        } else {
            FontStyle::Normal
        };
        f.weight = if v.contains("bold") { 700 } else { 400 };
        if v == "monospace" {
            f.family = "Consolas".into();
        } else if v == "sans-serif" {
            f.family = "Segoe UI".into();
        }
    }
    let dim = |key: &str, default: f64, rel: f64| {
        n.attr(key)
            .map(|s| dimension(s.split_whitespace().next().unwrap_or(""), f.size, rel).unwrap())
            .unwrap_or(default)
    };
    let child = |node: &MathNode, font: &Font, m: &mut _| {
        layout_node(node, font, color.clone(), display, variant, m)
    };
    let mut result = match n.name.as_str() {
        "mi" | "mn" | "mo" | "mtext" | "ms" => {
            let mut font = f.clone();
            if n.name == "mi" && n.text.chars().count() == 1 && variant.is_none() {
                font.style = FontStyle::Italic;
            }
            if n.name == "mo"
                && display
                && n.attr("largeop") != Some("false")
                && n.text.chars().any(|c| "∑∏∫⋂⋃".contains(c))
            {
                font.size *= 1.4;
            }
            let mut text = if n.name == "ms" {
                format!(
                    "{}{}{}",
                    n.attr("lquote").unwrap_or("\""),
                    n.text,
                    n.attr("rquote").unwrap_or("\"")
                )
            } else {
                n.text.clone()
            };
            if let Some(variant) = variant {
                text = text.chars().map(|c| alphabet_variant(c, variant)).collect();
            }
            let b = token(text, &font, color.clone(), m);
            let left = if n.name == "mo" {
                dim("lspace", f.size * 0.12, f.size)
            } else {
                0.
            };
            let right = if n.name == "mo" {
                dim("rspace", f.size * 0.12, f.size)
            } else {
                0.
            };
            let mut r = MathBox {
                width: (left + b.width + right).max(0.),
                ascent: b.ascent,
                descent: b.descent,
                ..Default::default()
            };
            r.append(&b, left, 0.);
            r
        }
        "mspace" => MathBox {
            width: dim("width", 0., f.size).max(0.),
            ascent: dim("height", 0., f.size).max(0.),
            descent: dim("depth", 0., f.size).max(0.),
            ..Default::default()
        },
        "mfrac" => {
            let mut small = f.clone();
            if !display {
                small.size *= 0.85;
            }
            let a = child(&n.children[0], &small, m);
            let b = child(&n.children[1], &small, m);
            if n.attr("bevelled") == Some("true") {
                row(&[a, token("/".into(), &f, color.clone(), m), b])
            } else {
                let gap = f.size * 0.18;
                let axis = -f.size * 0.25;
                let line = dim("linethickness", (f.size / 18.).max(1.), f.size).max(0.);
                let w = a.width.max(b.width) + f.size * 0.3;
                let ay = axis - gap - a.descent - line / 2.;
                let by = axis + gap + b.ascent + line / 2.;
                let mut r = MathBox {
                    width: w,
                    ascent: (a.ascent - ay).max(0.),
                    descent: (by + b.descent).max(0.),
                    ..Default::default()
                };
                let align = |key: &str, width: f64| match n.attr(key).unwrap_or("center") {
                    "left" => f.size * 0.15,
                    "right" => w - width - f.size * 0.15,
                    _ => (w - width) / 2.,
                };
                r.append(&a, align("numalign", a.width), ay);
                r.append(&b, align("denomalign", b.width), by);
                if line > 0. {
                    r.ink.push(Primitive::Line {
                        from: [0., axis],
                        to: [w, axis],
                        width: line,
                        color: color.clone(),
                    });
                }
                r
            }
        }
        "msub" | "msup" | "msubsup" | "munder" | "mover" | "munderover" => {
            let a = child(&n.children[0], &f, m);
            let mut small = f.clone();
            small.size = (f.size * 0.71).max(6.);
            let b = child(&n.children[1], &small, m);
            let c = n.children.get(2).map(|n| child(n, &small, m));
            let (below, above) = match n.name.as_str() {
                "msub" | "munder" => (Some(&b), None),
                "msup" | "mover" => (None, Some(&b)),
                _ => (Some(&b), c.as_ref()),
            };
            let centered = matches!(n.name.as_str(), "munder" | "mover" | "munderover");
            let sw = below
                .map_or(0., |b| b.width)
                .max(above.map_or(0., |b| b.width));
            let width = if centered {
                a.width.max(sw)
            } else {
                a.width + sw + f.size * 0.06
            };
            let mut r = MathBox {
                width,
                ascent: a.ascent,
                descent: a.descent,
                ..Default::default()
            };
            r.append(&a, if centered { (width - a.width) / 2. } else { 0. }, 0.);
            for (script, up) in [(below, false), (above, true)] {
                if let Some(s) = script {
                    let y = if centered {
                        if up {
                            -a.ascent - f.size * 0.12 - s.descent
                        } else {
                            a.descent + f.size * 0.12 + s.ascent
                        }
                    } else if up {
                        -(a.ascent * 0.65).max(f.size * 0.4) - s.descent
                    } else {
                        a.descent.max(f.size * 0.18) + s.ascent * 0.7
                    };
                    r.append(
                        s,
                        if centered {
                            (width - s.width) / 2.
                        } else {
                            a.width + f.size * 0.06
                        },
                        y,
                    );
                    r.ascent = r.ascent.max(s.ascent - y);
                    r.descent = r.descent.max(y + s.descent);
                }
            }
            r
        }
        "msqrt" | "mroot" => {
            let a = if n.name == "mroot" {
                child(&n.children[0], &f, m)
            } else {
                row(&n
                    .children
                    .iter()
                    .map(|n| child(n, &f, m))
                    .collect::<Vec<_>>())
            };
            let mut small = f.clone();
            small.size = (f.size * 0.55).max(6.);
            let index = if n.name == "mroot" {
                Some(child(&n.children[1], &small, m))
            } else {
                None
            };
            let lead = f.size * 0.65
                + index
                    .as_ref()
                    .map_or(0., |i| (i.width - f.size * 0.35).max(0.));
            let gap = f.size * 0.12;
            let top = -a.ascent - gap;
            let mut r = MathBox {
                width: lead + a.width + gap,
                ascent: a.ascent + gap * 2.,
                descent: a.descent,
                ..Default::default()
            };
            r.append(&a, lead, 0.);
            let pts = [
                [lead - f.size * 0.65, -f.size * 0.1],
                [lead - f.size * 0.45, -f.size * 0.2],
                [lead - f.size * 0.25, a.descent],
                [lead - f.size * 0.08, top],
                [r.width, top],
            ];
            for p in pts.windows(2) {
                r.line(p[0], p[1], &f, &color);
            }
            if let Some(i) = index {
                let y = top + i.ascent * 0.5;
                r.append(&i, 0., y);
                r.ascent = r.ascent.max(i.ascent - y);
            }
            r
        }
        "mfenced" => {
            let mut v = vec![];
            let sep = n
                .attr("separators")
                .unwrap_or(",")
                .chars()
                .filter(|c| !c.is_whitespace())
                .collect::<Vec<_>>();
            for (i, c) in n.children.iter().enumerate() {
                if i > 0 && !sep.is_empty() {
                    v.push(token(
                        sep[(i - 1).min(sep.len() - 1)].to_string(),
                        &f,
                        color.clone(),
                        m,
                    ));
                }
                v.push(child(c, &f, m));
            }
            let inner = row(&v);
            let mut fence = f.clone();
            fence.size = f.size.max((inner.ascent + inner.descent) * 0.85);
            let left = token(
                n.attr("open").unwrap_or("(").into(),
                &fence,
                color.clone(),
                m,
            );
            let right = token(
                n.attr("close").unwrap_or(")").into(),
                &fence,
                color.clone(),
                m,
            );
            row(&[left, inner, right])
        }
        "mtable" => {
            let cells = n
                .children
                .iter()
                .map(|r| {
                    r.children
                        .iter()
                        .map(|c| child(c, &f, m))
                        .collect::<Vec<_>>()
                })
                .collect::<Vec<_>>();
            let cols = cells.iter().map(Vec::len).max().unwrap_or(0);
            let mut widths = vec![0_f64; cols];
            for r in &cells {
                for (i, c) in r.iter().enumerate() {
                    widths[i] = widths[i].max(c.width);
                }
            }
            let colgap = dim("columnspacing", f.size * 0.8, f.size);
            let rowgap = dim("rowspacing", f.size * 0.4, f.size);
            if n.attr("equalcolumns") == Some("true") {
                let max = widths.iter().copied().fold(0_f64, f64::max);
                widths.fill(max);
            }
            let mut heights = cells
                .iter()
                .map(|r| {
                    (
                        r.iter().map(|c| c.ascent).fold(0_f64, f64::max),
                        r.iter().map(|c| c.descent).fold(0_f64, f64::max),
                    )
                })
                .collect::<Vec<_>>();
            if n.attr("equalrows") == Some("true") {
                let a = heights.iter().map(|h| h.0).fold(0_f64, f64::max);
                let d = heights.iter().map(|h| h.1).fold(0_f64, f64::max);
                heights.fill((a, d));
            }
            let total = heights.iter().map(|h| h.0 + h.1).sum::<f64>()
                + rowgap * cells.len().saturating_sub(1) as f64;
            let ascent = total / 2. + f.size * 0.25;
            let mut r = MathBox {
                width: widths.iter().sum::<f64>() + colgap * cols.saturating_sub(1) as f64,
                ascent,
                descent: (total - ascent).max(0.),
                ..Default::default()
            };
            let mut y = -ascent;
            for (ri, row) in cells.iter().enumerate() {
                let mut x = 0.;
                for (ci, c) in row.iter().enumerate() {
                    let columns = n
                        .attr("columnalign")
                        .unwrap_or("center")
                        .split_whitespace()
                        .collect::<Vec<_>>();
                    let align = n.children[ri].children[ci]
                        .attr("columnalign")
                        .and_then(|v| v.split_whitespace().next())
                        .unwrap_or_else(|| {
                            columns
                                .get(ci)
                                .or_else(|| columns.last())
                                .copied()
                                .unwrap_or("center")
                        });
                    let dx = match align {
                        "left" => 0.,
                        "right" => widths[ci] - c.width,
                        _ => (widths[ci] - c.width) / 2.,
                    };
                    r.append(c, x + dx, y + heights[ri].0);
                    x += widths[ci] + colgap;
                }
                y += heights[ri].0 + heights[ri].1 + rowgap;
            }
            r
        }
        "semantics" => child(&n.children[0], &f, m),
        "annotation" | "annotation-xml" => MathBox::default(),
        _ => {
            let mut boxes = n
                .children
                .iter()
                .map(|n| child(n, &f, m))
                .collect::<Vec<_>>();
            let height = boxes
                .iter()
                .map(|b| b.ascent + b.descent)
                .fold(0_f64, f64::max);
            for (i, node) in n.children.iter().enumerate() {
                if node.name == "mo"
                    && node.attr("stretchy") != Some("false")
                    && node.text.chars().count() == 1
                    && node.text.chars().any(|c| "()[]{}|‖⌈⌉⌊⌋".contains(c))
                    && height > f.size * 1.5
                {
                    let mut large = f.clone();
                    large.size = (height * 0.95).min(512.);
                    boxes[i] = child(node, &large, m);
                }
            }
            let mut r = row(&boxes);
            if n.name == "mphantom" {
                r.ink.clear();
            }
            if n.name == "mpadded" {
                let dx = dim("lspace", 0., r.width);
                let dy = -dim("voffset", 0., r.ascent);
                let ink = r.clone();
                r.ink.clear();
                r.append(&ink, dx, dy);
                r.width = dim("width", r.width, r.width).max(0.);
                r.ascent = dim("height", r.ascent, r.ascent).max(0.);
                r.descent = dim("depth", r.descent, r.descent).max(0.);
            }
            if n.name == "menclose" || n.name == "merror" {
                let gap = f.size * 0.1;
                let b = r.clone();
                r.ink.clear();
                r.width += 2. * gap;
                r.ascent += gap;
                r.descent += gap;
                r.append(&b, gap, 0.);
                let x = r.width;
                let top = -r.ascent;
                let bottom = r.descent;
                for v in n.attr("notation").unwrap_or("box").split_whitespace() {
                    match v {
                        "box" | "roundedbox" | "circle" => {
                            for (a, b) in [
                                ([0., top], [x, top]),
                                ([x, top], [x, bottom]),
                                ([x, bottom], [0., bottom]),
                                ([0., bottom], [0., top]),
                            ] {
                                r.line(a, b, &f, &color);
                            }
                        }
                        "top" => r.line([0., top], [x, top], &f, &color),
                        "bottom" => r.line([0., bottom], [x, bottom], &f, &color),
                        "left" => r.line([0., top], [0., bottom], &f, &color),
                        "right" => r.line([x, top], [x, bottom], &f, &color),
                        "horizontalstrike" => {
                            r.line([0., -f.size * 0.25], [x, -f.size * 0.25], &f, &color)
                        }
                        "updiagonalstrike" => r.line([0., bottom], [x, top], &f, &color),
                        "downdiagonalstrike" => r.line([0., top], [x, bottom], &f, &color),
                        _ => {}
                    }
                }
            }
            r
        }
    };
    if let Some(background) = n.attr("mathbackground") {
        result.ink.insert(
            0,
            Primitive::Background {
                rect: Rect::new(
                    0.,
                    -result.ascent,
                    result.width,
                    result.ascent + result.descent,
                ),
                color: background.into(),
            },
        );
    }
    result
}
pub fn escape(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}
fn alphabet_variant(c: char, variant: &str) -> char {
    let legacy = match variant {
        "double-struck" => match c {
            'C' => Some('ℂ'),
            'H' => Some('ℍ'),
            'N' => Some('ℕ'),
            'P' => Some('ℙ'),
            'Q' => Some('ℚ'),
            'R' => Some('ℝ'),
            'Z' => Some('ℤ'),
            _ => None,
        },
        "script" => match c {
            'B' => Some('ℬ'),
            'E' => Some('ℰ'),
            'F' => Some('ℱ'),
            'H' => Some('ℋ'),
            'I' => Some('ℐ'),
            'L' => Some('ℒ'),
            'M' => Some('ℳ'),
            'R' => Some('ℛ'),
            'e' => Some('ℯ'),
            'g' => Some('ℊ'),
            'o' => Some('ℴ'),
            _ => None,
        },
        "fraktur" => match c {
            'C' => Some('ℭ'),
            'H' => Some('ℌ'),
            'I' => Some('ℑ'),
            'R' => Some('ℜ'),
            'Z' => Some('ℨ'),
            _ => None,
        },
        _ => None,
    };
    if let Some(c) = legacy {
        return c;
    }
    let (upper, lower) = match variant {
        "double-struck" => (0x1d538, 0x1d552),
        "script" => (0x1d49c, 0x1d4b6),
        "fraktur" => (0x1d504, 0x1d51e),
        _ => return c,
    };
    let value = if c.is_ascii_uppercase() {
        upper + c as u32 - 'A' as u32
    } else if c.is_ascii_lowercase() {
        lower + c as u32 - 'a' as u32
    } else if c.is_ascii_digit() && variant == "double-struck" {
        0x1d7d8 + c as u32 - '0' as u32
    } else {
        return c;
    };
    char::from_u32(value).unwrap_or(c)
}
pub fn plain_text(n: &MathNode) -> String {
    let c = n.children.iter().map(plain_text).collect::<Vec<_>>();
    match n.name.as_str() {
        "mi" | "mn" | "mo" | "mtext" | "ms" => n.text.clone(),
        "mfrac" => format!("({})/({})", c[0], c[1]),
        "msqrt" => format!("sqrt({})", c.join("")),
        "mroot" => format!("root({}, {})", c[1], c[0]),
        "msub" => format!("{}_({})", c[0], c[1]),
        "msup" => format!("{}^({})", c[0], c[1]),
        "msubsup" => format!("{}_({})^({})", c[0], c[1], c[2]),
        "mfenced" => format!(
            "{}{}{}",
            n.attr("open").unwrap_or("("),
            c.join(n.attr("separators").unwrap_or(",")),
            n.attr("close").unwrap_or(")")
        ),
        "semantics" => c.first().cloned().unwrap_or_default(),
        "annotation" | "annotation-xml" => String::new(),
        "mtr" => c.join(", "),
        "mtable" => c.join("; "),
        _ => c.join(""),
    }
}
pub fn document_xml(doc: &RichEditDocument) -> String {
    if doc.runs.len() == 1 {
        if let Some(xml) = &doc.runs[0].mathml {
            return canonical(xml).expect("validated MathML");
        }
    }
    let mut out = String::from("<math xmlns=\"http://www.w3.org/1998/Math/MathML\"><mrow>");
    for r in &doc.runs {
        if let Some(xml) = &r.mathml {
            let xml = canonical(xml).expect("validated MathML");
            let parsed = roxmltree::Document::parse(&xml).unwrap();
            let root = parsed.root_element();
            out.push_str("<mrow");
            for ns in root.namespaces() {
                if let Some(prefix) = ns.name() {
                    out.push_str(&format!(" xmlns:{}=\"{}\"", prefix, escape(ns.uri())));
                }
            }
            for attr in root.attributes() {
                if attr.name() != "display" {
                    out.push_str(&format!(" {}=\"{}\"", attr.name(), escape(attr.value())));
                }
            }
            if root.attribute("display") == Some("block")
                && root.attribute("displaystyle").is_none()
            {
                out.push_str(" displaystyle=\"true\"");
            }
            out.push('>');
            for child in root.children().filter(|n| n.is_element()) {
                out.push_str(&xml[child.range()]);
            }
            out.push_str("</mrow>");
        } else if !r.text.is_empty() {
            out.push_str("<mtext>");
            out.push_str(&escape(&r.text));
            out.push_str("</mtext>");
        }
    }
    out.push_str("</mrow></math>");
    out
}
