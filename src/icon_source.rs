//! Reusable icon-source definitions shared by IconSourceElement and AnimatedIcon fallback.
use crate::{
    enums::*,
    scene::{BrushValue, NodeProperties},
};
use serde::{Deserialize, Serialize};
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct IconSource {
    pub kind: IconSourceKind,
    pub foreground: Option<BrushValue>,
    pub glyph: String,
    pub font_family: String,
    pub font_size: f64,
    pub font_weight: u16,
    pub font_style: FontStyle,
    pub symbol: Symbol,
    pub data: String,
    pub uri_source: String,
    pub source: String,
    pub show_as_monochrome: bool,
    pub mirrored_when_right_to_left: bool,
}
impl Default for IconSource {
    fn default() -> Self {
        Self {
            kind: IconSourceKind::Symbol,
            foreground: None,
            glyph: String::new(),
            font_family: "Segoe Fluent Icons, Segoe MDL2 Assets".into(),
            font_size: 20.,
            font_weight: 400,
            font_style: FontStyle::Normal,
            symbol: Symbol::Emoji,
            data: String::new(),
            uri_source: String::new(),
            source: String::new(),
            show_as_monochrome: true,
            mirrored_when_right_to_left: false,
        }
    }
}
impl IconSource {
    pub fn resolve(&self, base: &NodeProperties) -> (NodeKind, NodeProperties) {
        let mut p = base.clone();
        p.icon_source = None;
        p.fallback_icon_source = None;
        p.glyph = self.glyph.clone();
        p.symbol = Some(self.symbol);
        p.font_family = self.font_family.clone();
        p.font_size = self.font_size;
        p.font_weight = self.font_weight;
        p.font_style = self.font_style;
        p.data = self.data.clone();
        p.uri_source = self.uri_source.clone();
        p.source = self.source.clone();
        p.show_as_monochrome = self.show_as_monochrome;
        p.mirrored_when_right_to_left = self.mirrored_when_right_to_left;
        if self.foreground.is_some() {
            p.foreground = self.foreground.clone();
        }
        let kind = match self.kind {
            IconSourceKind::Font => {
                p.symbol = None;
                NodeKind::FontIcon
            }
            IconSourceKind::Symbol => {
                p.glyph.clear();
                p.font_family = "Segoe Fluent Icons".into();
                p.font_size = 20.;
                NodeKind::SymbolIcon
            }
            IconSourceKind::Path => NodeKind::PathIcon,
            IconSourceKind::Bitmap => NodeKind::BitmapIcon,
            IconSourceKind::Image => NodeKind::ImageIcon,
        };
        (kind, p)
    }
    pub fn validate(&self, base: &NodeProperties) -> Result<(), String> {
        let (kind, p) = self.resolve(base);
        p.validate(kind)?;
        if kind == NodeKind::PathIcon {
            crate::icons::parse_path(&p.data)?;
        }
        if p.uri_source.len() > 1_000_000 || p.data.len() > 262144 {
            return Err("Icon source exceeds size limits".into());
        }
        Ok(())
    }
    pub fn image_source(&self) -> &str {
        match self.kind {
            IconSourceKind::Bitmap => &self.uri_source,
            IconSourceKind::Image => &self.source,
            _ => "",
        }
    }
}
pub fn resolve(kind: NodeKind, p: &NodeProperties) -> Option<(NodeKind, NodeProperties)> {
    if kind == NodeKind::IconSourceElement {
        return p.icon_source.as_ref().map(|s| s.resolve(p));
    }
    if kind == NodeKind::AnimatedIcon && p.source.is_empty() {
        return p.fallback_icon_source.as_ref().map(|s| s.resolve(p));
    }
    Some((kind, p.clone()))
}
pub fn path(
    kind: NodeKind,
    p: &NodeProperties,
) -> Result<Option<crate::icons::PathGeometry>, String> {
    let Some((kind, p)) = resolve(kind, p) else {
        return Ok(None);
    };
    if kind == NodeKind::PathIcon {
        Ok(Some(crate::icons::parse_path(&p.data)?))
    } else {
        Ok(None)
    }
}
