//! Shared icon contract, including WinUI's legacy Symbol-to-Fluent migration.
use crate::{
    enums::{NodeKind, Symbol},
    model::Rect,
    scene::NodeProperties,
};
use serde_json::Value;
use std::sync::OnceLock;
pub fn contract() -> &'static Value {
    static IR: OnceLock<Value> = OnceLock::new();
    IR.get_or_init(|| {
        serde_json::from_str(include_str!("../references/icons-template.json")).unwrap()
    })
}
pub fn symbol_glyph(symbol: Symbol) -> &'static str {
    contract()["symbols"][symbol.as_str()].as_str().unwrap()
}
pub fn badge_label(p: &NodeProperties) -> String {
    if p.value >= 0. {
        format!("{:.0}", p.value)
    } else if let Some(symbol) = p.symbol {
        symbol_glyph(symbol).into()
    } else {
        p.glyph.clone()
    }
}
pub fn badge_margin(p: &NodeProperties) -> [f64; 4] {
    if p.value < 0. && p.symbol.is_some() {
        [4.; 4]
    } else {
        [4., 0., 4., 2.]
    }
}
pub fn is_icon(kind: NodeKind) -> bool {
    matches!(
        kind,
        NodeKind::AnimatedIcon
            | NodeKind::IconSourceElement
            | NodeKind::FontIcon
            | NodeKind::SymbolIcon
            | NodeKind::PathIcon
            | NodeKind::BitmapIcon
            | NodeKind::ImageIcon
    )
}
pub fn is_image(kind: NodeKind) -> bool {
    matches!(
        kind,
        NodeKind::Image
            | NodeKind::BitmapIcon
            | NodeKind::ImageIcon
            | NodeKind::IconSourceElement
            | NodeKind::AnimatedIcon
    )
}
pub fn source(p: &NodeProperties, kind: NodeKind) -> &str {
    if kind == NodeKind::IconSourceElement {
        return p
            .icon_source
            .as_ref()
            .map(|s| s.image_source())
            .unwrap_or("");
    }
    if kind == NodeKind::AnimatedIcon {
        return if p.source.is_empty() {
            p.fallback_icon_source
                .as_ref()
                .map(|s| s.image_source())
                .unwrap_or("")
        } else {
            ""
        };
    }
    if kind == NodeKind::BitmapIcon {
        &p.uri_source
    } else {
        &p.source
    }
}
#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
pub enum PathCommand {
    Move([f64; 2]),
    Line([f64; 2]),
    Quad([f64; 4]),
    Cubic([f64; 6]),
    Close,
}
#[derive(Clone, Debug, serde::Serialize)]
pub struct PathGeometry {
    pub commands: Vec<PathCommand>,
    pub bounds: Rect,
    pub even_odd: bool,
}
impl PathGeometry {
    pub fn from_bez(path: &kurbo::BezPath, even_odd: bool) -> Self {
        use kurbo::{PathEl, Shape};
        let b = path.bounding_box();
        let commands = path
            .elements()
            .iter()
            .map(|e| match *e {
                PathEl::MoveTo(p) => PathCommand::Move([p.x, p.y]),
                PathEl::LineTo(p) => PathCommand::Line([p.x, p.y]),
                PathEl::QuadTo(a, b) => PathCommand::Quad([a.x, a.y, b.x, b.y]),
                PathEl::CurveTo(a, b, c) => PathCommand::Cubic([a.x, a.y, b.x, b.y, c.x, c.y]),
                PathEl::ClosePath => PathCommand::Close,
            })
            .collect();
        Self {
            commands,
            bounds: Rect::new(b.x0, b.y0, b.width(), b.height()),
            even_odd,
        }
    }
    pub fn to_bez(&self) -> kurbo::BezPath {
        let mut p = kurbo::BezPath::new();
        for c in &self.commands {
            match c {
                PathCommand::Move(v) => p.move_to((v[0], v[1])),
                PathCommand::Line(v) => p.line_to((v[0], v[1])),
                PathCommand::Quad(v) => p.quad_to((v[0], v[1]), (v[2], v[3])),
                PathCommand::Cubic(v) => p.curve_to((v[0], v[1]), (v[2], v[3]), (v[4], v[5])),
                PathCommand::Close => p.close_path(),
            }
        }
        p
    }
}
pub fn parse_path(data: &str) -> Result<PathGeometry, String> {
    use kurbo::Shape;
    let data = data.trim();
    let (even_odd, data) = if let Some(p) = data.strip_prefix("F1") {
        (false, p)
    } else if let Some(p) = data.strip_prefix("F0") {
        (true, p)
    } else {
        (true, data)
    };
    let path = kurbo::BezPath::from_svg(data).map_err(|e| format!("Invalid PathIcon data: {e}"))?;
    if !path.is_finite() {
        return Err("PathIcon control points must be finite".into());
    }
    if path.elements().len() > 4096 {
        return Err("PathIcon exceeds 4096 path elements".into());
    }
    let b = path.bounding_box();
    if ![b.x0, b.y0, b.x1, b.y1]
        .iter()
        .all(|n| n.is_finite() && n.abs() <= 1e7)
    {
        return Err("PathIcon coordinates exceed finite geometry bounds".into());
    }
    let mut commands = Vec::new();
    for e in path.elements() {
        use kurbo::PathEl;
        commands.push(match *e {
            PathEl::MoveTo(p) => PathCommand::Move([p.x, p.y]),
            PathEl::LineTo(p) => PathCommand::Line([p.x, p.y]),
            PathEl::QuadTo(a, b) => PathCommand::Quad([a.x, a.y, b.x, b.y]),
            PathEl::CurveTo(a, b, c) => PathCommand::Cubic([a.x, a.y, b.x, b.y, c.x, c.y]),
            PathEl::ClosePath => PathCommand::Close,
        });
    }
    Ok(PathGeometry {
        commands,
        bounds: Rect::new(b.x0, b.y0, b.width(), b.height()),
        even_odd,
    })
}
