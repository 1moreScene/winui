use serde::{Deserialize, Serialize};

pub use crate::enums::*;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct Item {
    pub id: String,
    pub text: String,
    /// Segoe Fluent Icons glyph. The browser host supplies the font.
    pub icon: String,
    pub animated_icon_source: Option<AnimatedIconSource>,
    pub kind: ItemKind,
    pub enabled: bool,
    pub selects_on_invoked: bool,
    pub children: Vec<Item>,
}
impl Default for Item {
    fn default() -> Self {
        Self {
            id: String::new(),
            text: String::new(),
            icon: String::new(),
            animated_icon_source: None,
            kind: ItemKind::Item,
            enabled: true,
            selects_on_invoked: true,
            children: vec![],
        }
    }
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct Properties {
    pub items: Vec<Item>,
    pub footer_items: Vec<Item>,
    pub pane_display_mode: PaneDisplayMode,
    pub selected_id: Option<String>,
    pub is_pane_open: Option<bool>,
    pub is_pane_visible: bool,
    pub is_settings_visible: bool,
    pub is_back_button_visible: bool,
    pub is_back_enabled: bool,
    pub is_pane_toggle_button_visible: bool,
    pub selection_follows_focus: bool,
    pub open_pane_length: f64,
    pub compact_pane_length: f64,
    pub compact_mode_threshold_width: f64,
    pub expanded_mode_threshold_width: f64,
    pub pane_title: String,
    pub header: String,
    pub content: String,
    pub content_node: Option<crate::content::ContentNode>,
    pub theme: Theme,
    pub accent: String,
    pub reduced_motion: bool,
    pub reduced_transparency: bool,
    /// Browser host capability. DOM outside the Rust surface cannot be sampled.
    pub is_backdrop_available: bool,
    pub expanded_pane_material: Option<crate::material::AcrylicOptions>,
    pub always_show_header: bool,
}
impl Default for Properties {
    fn default() -> Self {
        Self {
            items: vec![],
            footer_items: vec![],
            pane_display_mode: PaneDisplayMode::Auto,
            selected_id: None,
            is_pane_open: None,
            is_pane_visible: true,
            is_settings_visible: true,
            is_back_button_visible: true,
            is_back_enabled: false,
            is_pane_toggle_button_visible: true,
            selection_follows_focus: false,
            open_pane_length: 320.,
            compact_pane_length: 48.,
            compact_mode_threshold_width: 641.,
            expanded_mode_threshold_width: 1008.,
            pane_title: String::new(),
            header: "Sample Page 1".into(),
            content: "Sample Page 1".into(),
            content_node: None,
            theme: Theme::Light,
            accent: "#005fb8".into(),
            reduced_motion: false,
            reduced_transparency: false,
            is_backdrop_available: true,
            expanded_pane_material: None,
            always_show_header: true,
        }
    }
}
impl Properties {
    pub fn find(&self, id: &str) -> Option<&Item> {
        fn find_in<'a>(items: &'a [Item], id: &str) -> Option<&'a Item> {
            items.iter().find_map(|i| {
                if i.id == id {
                    Some(i)
                } else {
                    find_in(&i.children, id)
                }
            })
        }
        find_in(&self.items, id).or_else(|| find_in(&self.footer_items, id))
    }
    pub fn validate(&self) -> Result<(), String> {
        if let Some(material) = &self.expanded_pane_material {
            material.validate()?;
        }
        if let Some(content) = &self.content_node {
            content.validate(0, &mut 0)?;
        }
        let mut ids = std::collections::HashSet::new();
        fn visit(
            items: &[Item],
            ids: &mut std::collections::HashSet<String>,
            depth: u32,
        ) -> Result<(), String> {
            if depth > 16 {
                return Err("menu nesting exceeds 16".into());
            }
            for i in items {
                if i.id.is_empty() || i.id.starts_with('$') || !ids.insert(i.id.clone()) {
                    return Err(format!("empty, reserved or duplicate item id: {}", i.id));
                }
                if ids.len() > 2000 {
                    return Err("menu exceeds 2000 nodes".into());
                }
                visit(&i.children, ids, depth + 1)?;
            }
            Ok(())
        }
        visit(&self.items, &mut ids, 0)?;
        visit(&self.footer_items, &mut ids, 0)?;
        for n in [
            self.open_pane_length,
            self.compact_pane_length,
            self.compact_mode_threshold_width,
            self.expanded_mode_threshold_width,
        ] {
            if !n.is_finite() || n < 0. {
                return Err("pane lengths and thresholds must be finite and nonnegative".into());
            }
        }
        if !(self.accent.len() == 7
            && self.accent.starts_with('#')
            && self.accent[1..].bytes().all(|b| b.is_ascii_hexdigit()))
        {
            return Err("accent must be #RRGGBB".into());
        }
        if let Some(id) = &self.selected_id {
            if id != "$settings"
                && !self
                    .find(id)
                    .is_some_and(|i| i.kind == ItemKind::Item && i.selects_on_invoked)
            {
                return Err(format!("invalid selected id: {id}"));
            }
        }
        Ok(())
    }
}

#[derive(Clone, Copy, Default, Debug, Deserialize, Serialize, PartialEq)]
pub struct Rect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}
impl Rect {
    pub fn new(x: f64, y: f64, width: f64, height: f64) -> Self {
        Self {
            x,
            y,
            width: width.max(0.),
            height: height.max(0.),
        }
    }
    pub fn contains(self, x: f64, y: f64) -> bool {
        x >= self.x && y >= self.y && x < self.x + self.width && y < self.y + self.height
    }
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Part {
    pub id: String,
    pub text: String,
    pub icon: String,
    pub rect: Rect,
    pub enabled: bool,
    pub selected: bool,
    pub expanded: Option<bool>,
    pub depth: usize,
    pub kind: ItemKind,
    pub clip: Option<Rect>,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Event {
    pub kind: EventKind,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub recommended_navigation_transition: Option<NavigationTransition>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub item_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<u32>,
}
#[derive(Debug, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase", deny_unknown_fields)]
pub enum Input {
    Resize { width: f64, height: f64 },
    Move { x: f64, y: f64 },
    Down { x: f64, y: f64 },
    Up { x: f64, y: f64 },
    Leave,
    Cancel,
    Invoke { id: String },
    Focus { id: String },
    Blur,
    Key { key: String },
    Wheel { delta: f64 },
    ContentWheel { delta: f64 },
    ScrollKey { content: bool, key: String },
    Expand { id: String, expanded: bool },
    ResolveClosing { request: u32, cancel: bool },
}
