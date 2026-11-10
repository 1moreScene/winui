//! Audited ToggleButton/CheckBox template subset. Checked state is Rust-owned.
use crate::enums::{ControlState, NodeKind};
use serde::Deserialize;
use std::{collections::HashMap, sync::OnceLock};
pub fn is_toggle(kind: NodeKind) -> bool {
    matches!(
        kind,
        NodeKind::ToggleButton | NodeKind::CheckBox | NodeKind::RadioButton | NodeKind::AppBarToggleButton
    )
}
pub fn is_button(kind: NodeKind) -> bool {
    matches!(
        kind,
        NodeKind::NavigationViewItem | NodeKind::MenuBarItem | NodeKind::Button | NodeKind::AppBarButton | NodeKind::DropDownButton
            | NodeKind::SplitButton
            | NodeKind::ToggleSplitButton
            | NodeKind::RepeatButton
            | NodeKind::HyperlinkButton
            | NodeKind::Expander
            | NodeKind::ToggleSwitch
    ) || is_toggle(kind)
}
#[derive(Deserialize)]
pub struct Checkbox {
    #[serde(rename = "CheckBoxSize")]
    pub size: f64,
    #[serde(rename = "CheckBoxGlyphSize")]
    pub glyph_size: f64,
    #[serde(rename = "CheckBoxHeight")]
    pub height: f64,
    #[serde(rename = "CheckBoxMinWidth")]
    pub min_width: f64,
    #[serde(rename = "CheckBoxBorderThickness")]
    pub border: f64,
    pub padding: [f64; 4],
    #[serde(rename = "checkedGlyph")]
    pub checked_glyph: String,
    #[serde(rename = "mixedGlyph")]
    pub mixed_glyph: String,
}
#[derive(Deserialize)]
struct Template {
    checkbox: Checkbox,
    styles: HashMap<String, Style>,
}
#[derive(Deserialize)]
struct Style {
    states: HashMap<String, HashMap<String, String>>,
}
fn template() -> &'static Template {
    static VALUE: OnceLock<Template> = OnceLock::new();
    VALUE.get_or_init(|| {
        serde_json::from_str(include_str!("../references/selection-template.json"))
            .expect("extracted selection template")
    })
}
pub fn checkbox() -> &'static Checkbox {
    &template().checkbox
}
pub fn state_name(kind: NodeKind, checked: Option<bool>, state: ControlState) -> String {
    if kind == NodeKind::CheckBox {
        format!(
            "{}{}",
            match checked {
                Some(false) => "Unchecked",
                Some(true) => "Checked",
                None => "Indeterminate",
            },
            state.as_str()
        )
    } else {
        let prefix = match checked {
            Some(false) => "",
            Some(true) => "Checked",
            None => "Indeterminate",
        };
        format!(
            "{prefix}{}",
            if state == ControlState::Normal && !prefix.is_empty() {
                ""
            } else {
                state.as_str()
            }
        )
    }
}
pub fn state(
    kind: NodeKind,
    checked: Option<bool>,
    visual: ControlState,
) -> &'static HashMap<String, String> {
    &template().styles[kind.as_str()].states[&state_name(kind, checked, visual)]
}
/// Content begins after the checkbox's 20-DIP glyph column.
pub fn leading(kind: NodeKind) -> f64 {
    if kind == NodeKind::CheckBox || kind == NodeKind::RadioButton {
        checkbox().size
    } else if kind == NodeKind::ToggleSwitch {
        52.
    } else {
        0.
    }
}
