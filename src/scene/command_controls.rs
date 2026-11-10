//! Fixed SDK AppBar/DropDown command templates and CommandBar composition.
use super::*;
use crate::{
    animation::Motion,
    render::Draw,
    resources::Brush,
    typography::{self, Font, TextLayout, TextMeasurer},
};
use serde_json::{json, Value};
use std::{
    collections::HashSet,
    sync::{Arc, OnceLock},
};
mod input;
mod layout;
mod paint;
pub fn is_action(k: NodeKind) -> bool {
    matches!(
        k,
        NodeKind::AppBarButton | NodeKind::AppBarToggleButton | NodeKind::DropDownButton
    )
}
pub fn is_control(k: NodeKind) -> bool {
    is_action(k) || matches!(k,NodeKind::CommandBar|NodeKind::AppBarSeparator)
}
fn contract() -> &'static Value {
    static V: OnceLock<Value> = OnceLock::new();
    V.get_or_init(|| {
        serde_json::from_str(include_str!(
            "../../references/command-controls-template.json"
        ))
        .unwrap()
    })
}

pub(in crate::scene) fn motion() -> &'static Value {
    &contract()["motion"]
}
pub(in crate::scene) fn brush(theme: Theme, key: &str) -> Brush {
    if theme == Theme::HighContrast {
        return crate::resources::Resources::current().resolve(theme,key).cloned().unwrap_or_else(|_|serde_json::from_value(json!({"kind":"solid","color":if key.contains("Background"){"#000000"}else{"#ffffff"}})).unwrap());
    }
    serde_json::from_value(contract()["palettes"][theme.as_str()][key].clone())
        .unwrap_or_else(|e| panic!("Command brush {key}: {e}"))
}
pub(in crate::scene) fn color(theme: Theme, key: &str) -> String {
    brush(theme, key).solid_color()
}
#[derive(Clone, Debug, Serialize, Deserialize, Default)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
#[derive(PartialEq)]
pub struct Accelerator {
    pub key: String,
    pub modifiers: Vec<KeyboardAcceleratorModifier>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
#[derive(PartialEq)]
pub struct CommandItem {
    pub id: String,
    pub label: String,
    pub kind: CommandBarItemKind,
    pub icon_source: Option<crate::icon_source::IconSource>,
    pub enabled: bool,
    pub visible: bool,
    pub is_checked: Option<bool>,
    pub is_three_state: bool,
    pub dynamic_overflow_order: i32,
    pub keyboard_accelerators: Vec<Accelerator>,
    pub flyout_target: Option<u32>,
}
impl Default for CommandItem {
    fn default() -> Self {
        Self {
            id: String::new(),
            label: String::new(),
            kind: Default::default(),
            icon_source: None,
            enabled: true,
            visible: true,
            is_checked: Some(false),
            is_three_state: false,
            dynamic_overflow_order: 0,
            keyboard_accelerators: vec![],
            flyout_target: None,
        }
    }
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
#[derive(PartialEq)]
pub struct CommandProperties {
    pub label: String,
    pub is_compact: bool,
    pub label_position: CommandBarLabelPosition,
    pub default_label_position: CommandBarDefaultLabelPosition,
    pub closed_display_mode: CommandBarClosedDisplayMode,
    pub overflow_button_visibility: CommandBarOverflowButtonVisibility,
    pub is_dynamic_overflow_enabled: bool,
    pub is_sticky: bool,
    pub dynamic_overflow_order: i32,
    pub primary_commands: Arc<Vec<CommandItem>>,
    pub secondary_commands: Arc<Vec<CommandItem>>,
    pub keyboard_accelerators: Vec<Accelerator>,
    #[serde(skip)]
    pub inside_bar: bool,
}
impl Default for CommandProperties {
    fn default() -> Self {
        Self {
            label: String::new(),
            is_compact: false,
            label_position: Default::default(),
            default_label_position: Default::default(),
            closed_display_mode: Default::default(),
            overflow_button_visibility: Default::default(),
            is_dynamic_overflow_enabled: true,
            is_sticky: false,
            dynamic_overflow_order: 0,
            primary_commands: Arc::new(vec![]),
            secondary_commands: Arc::new(vec![]),
            keyboard_accelerators: vec![],
            inside_bar: false,
        }
    }
}
impl CommandProperties {
    pub fn is_default(&self) -> bool {
        self.label.is_empty()
            && !self.is_compact
            && self.label_position == CommandBarLabelPosition::Default
            && self.default_label_position == CommandBarDefaultLabelPosition::Bottom
            && self.closed_display_mode == CommandBarClosedDisplayMode::Compact
            && self.overflow_button_visibility == CommandBarOverflowButtonVisibility::Auto
            && self.is_dynamic_overflow_enabled
            && !self.is_sticky
            && self.dynamic_overflow_order == 0
            && self.primary_commands.is_empty()
            && self.secondary_commands.is_empty()
            && self.keyboard_accelerators.is_empty()
            && !self.inside_bar
    }
}
#[derive(Default)]
pub struct CommandState {
    pub(super) owner: Option<u32>,
    pub(super) role: String,
    icon: Option<u32>,
    icon_source_node: Option<u32>,
    chevron: Option<u32>,
    pub(super) primary: HashMap<String, u32>,
    pub(super) more: Option<u32>,
    pub(super) popup: Option<u32>,
    overflow_panel: Option<u32>,
    overflow_separator: Option<u32>,
    pub(super) inline: Vec<String>,
    pub(super) overflow: Vec<String>,
    label: TextLayout,
    shortcut: TextLayout,
    overflow_icons: bool,
    overflow_toggles: bool,
    icon_rect: Rect,
    label_rect: Rect,
    pub(super) body: Rect,
    content: Rect,
    source: Arc<Vec<CommandItem>>,
    secondary: Arc<Vec<CommandItem>>,
    background: Motion,
    pub(super) expansion: Motion,
    expansion_initialized: bool,
    colors: Option<(String, String)>,
    signature: String,
    style_signature: String,
    pub(super) separator: bool,
    in_overflow: bool,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandSnapshot {
    pub owner: Option<u32>,
    pub in_overflow: bool,
    pub primary_clip: Rect,
    pub expansion_progress: f64,
    pub body: Rect,
    pub icon: Rect,
    pub label: Rect,
    pub inline: Vec<String>,
    pub overflow: Vec<String>,
    pub more_button: Option<u32>,
    pub flyout_open: bool,
}
impl CommandState {
    pub(super) fn snapshot(&self, open: bool) -> CommandSnapshot {
        CommandSnapshot {
            owner: self.owner,
            in_overflow: self.in_overflow,
            primary_clip: self.body,
            expansion_progress: self.expansion.value(0.),
            body: self.body,
            icon: self.icon_rect,
            label: self.label_rect,
            inline: self.inline.clone(),
            overflow: self.overflow.clone(),
            more_button: self.more,
            flyout_open: open,
        }
    }
    pub(super) fn animating(&self, now: f64) -> bool {
        self.background.active(now) || self.expansion.active(now)
    }
}
pub fn defaults(k: NodeKind, p: &mut NodeProperties) {
    if !is_control(k) {
        return;
    }
    p.horizontal_alignment = HorizontalAlignment::Left;
    p.vertical_alignment = VerticalAlignment::Center;
    p.is_tab_stop = is_action(k);
    p.padding = [0.; 4];
    p.corner_radius = 4.;
    if k == NodeKind::DropDownButton {
        p.padding = [11., 5., 11., 6.];
        p.border_thickness = [1.; 4];
        p.min_height = 32.;
    } else if k == NodeKind::AppBarSeparator {
        p.padding=[2.,8.,2.,8.];
        p.vertical_alignment=VerticalAlignment::Stretch;
    } else if k == NodeKind::CommandBar {
        p.horizontal_alignment = HorizontalAlignment::Stretch;
        p.vertical_alignment = VerticalAlignment::Top;
        p.is_light_dismiss_enabled = true;
    } else {
        p.is_checked = Some(false);
    }
}
pub fn validate(k: NodeKind, p: &mut NodeProperties) -> Result<(), String> {
    if !is_control(k) {
        return Ok(());
    }
    let q = &p.command_controls;
    if q.label.len() > 1_000_000 || q.primary_commands.len() + q.secondary_commands.len() > 10000 {
        return Err("Command text/source exceeds limits".into());
    }
    let mut keys = HashSet::new();
    for item in q.primary_commands.iter().chain(q.secondary_commands.iter()) {
        if item.id.is_empty() || !keys.insert(&item.id) {
            return Err("Command IDs must be nonempty and unique across primary/secondary".into());
        }
        if let Some(icon) = &item.icon_source {
            icon.validate(p)?;
        }
    }
    if k != NodeKind::DropDownButton {
        p.text = q.label.clone();
    }
    if let Some(icon) = &p.icon_source {
        icon.validate(p)?;
    }
    Ok(())
}
impl Scene {
    pub(super) fn init_command(&mut self, id: u32) -> Result<(), String> {
        if is_action(self.nodes[&id].kind) {
            let icon = self.create(
                id,
                NodeKind::Viewbox,
                json!({"width":16,"height":16,"visible":false}),
            )?;
            let source = self.create(
                icon,
                NodeKind::IconSourceElement,
                json!({"isTabStop":false}),
            )?;
            self.nodes.get_mut(&id).unwrap().command.icon = Some(icon);
            self.nodes.get_mut(&id).unwrap().command.icon_source_node = Some(source);
            if self.nodes[&id].kind == NodeKind::DropDownButton {
                let arrow = self.create(
                    id,
                    NodeKind::AnimatedIcon,
                    json!({"source":"ChevronDownSmall","width":12,"height":12}),
                )?;
                self.nodes.get_mut(&id).unwrap().command.chevron = Some(arrow);
            } else if self.nodes[&id].kind == NodeKind::AppBarButton {
                let arrow = self.create(
                    id,
                    NodeKind::FontIcon,
                    json!({"glyph":"\u{e974}","fontSize":8,"width":8,"height":8,"visible":false}),
                )?;
                self.nodes.get_mut(&id).unwrap().command.chevron = Some(arrow);
            }
        } else if self.nodes[&id].kind==NodeKind::CommandBar {
            self.init_command_bar(id)?;
        } else {
            self.nodes.get_mut(&id).unwrap().command.separator=true;
        }
        Ok(())
    }
    pub(super) fn sync_commands(&mut self) {
        let ids = self
            .nodes
            .values()
            .filter(|n| is_control(n.kind))
            .map(|n| n.id)
            .collect::<Vec<_>>();
        for id in ids {
            if !self.nodes.contains_key(&id) {
                continue;
            }
            if self.nodes[&id].kind == NodeKind::CommandBar {
                let _ = self.sync_command_bar(id);
            } else if is_action(self.nodes[&id].kind) {
                self.sync_command_action(id);
            }
        }
    }
    fn sync_command_action(&mut self, id: u32) {
        let n = &self.nodes[&id];
        let source = n.props.icon_source.clone();
        let icon = n.command.icon.unwrap();
        let source_node = n.command.icon_source_node.unwrap();
        let arrow = n.command.chevron;
        let dropdown = n.kind == NodeKind::DropDownButton;
        let has_flyout = n.props.flyout_target.is_some();
        let arrow_color = if dropdown {
            None
        } else {
            Some(self.command_foreground(id))
        };
        let state = n.button.state(n.enabled);
        let theme = n.theme;
        let signature = serde_json::to_string(&source).unwrap();
        if signature != n.command.signature {
            self.nodes.get_mut(&id).unwrap().command.signature = signature;
            let _ = self.update(vec![
                Update {
                    id: icon,
                    patch: json!({"visible":source.is_some()}),
                },
                Update {
                    id: source_node,
                    patch: json!({"iconSource":source}),
                },
            ]);
        }
        if let Some(arrow) = arrow {
            let signature = format!("{theme:?}-{state:?}-{has_flyout}");
            if self.nodes[&id].command.style_signature != signature {
                self.nodes.get_mut(&id).unwrap().command.style_signature = signature;
                let _=self.update(vec![Update{id:arrow,patch:json!({"visible":dropdown||has_flyout,"state":if state==ControlState::Disabled{"Normal"}else{state.as_str()},"foreground":if let Some(color)=&arrow_color{color.clone()}else if state==ControlState::Disabled{color(theme,"ButtonForegroundDisabled")}else{color(theme,&format!("DropDownButtonForegroundSecondary{}",if state==ControlState::Normal{""}else{state.as_str()}))}})}]);
            }
        }
    }
}

impl Scene {
    pub(in crate::scene) fn command_expanded_template(&self,id:u32)->bool {
        let n=&self.nodes[&id];n.props.is_open||n.command.expansion.active(self.time)||n.command.expansion.value(self.time)>1e-8
    }
    pub(in crate::scene) fn command_primary_clip(&self,id:u32)->Rect {
        let n=&self.nodes[&id];
        if self.in_command_bar_flyout(id){return Rect::new(0.,0.,n.rect.width,super::command_menus::flyout_metric("rowHeight"));}
        let closed=match n.props.command_controls.closed_display_mode {CommandBarClosedDisplayMode::Compact=>48.,CommandBarClosedDisplayMode::Minimal=>24.,CommandBarClosedDisplayMode::Hidden=>0.};
        let full=n.command.body.height.max(closed);
        let height=closed+(full-closed)*n.command.expansion.value(self.time);
        Rect::new(0.,0.,n.rect.width,if n.props.clip{height.min(n.rect.height)}else{height})
    }
    fn command_bar_can_overflow(&self,id:u32)->bool {
        let mut at=Some(id);
        while let Some(id)=at {
            let n=&self.nodes[&id];
            if n.props.clip||collections::is_scroll_owner(n.kind)||(n.kind==NodeKind::Border&&n.props.corner_radius>0.){return false;}
            at=n.parent;
        }
        true
    }
    /// Natural layout and visual overflow are separate. Auto-sized browser
    /// hosts reserve the presented extent; explicitly clipped hosts keep it.
    pub fn presentation_height(&self)->f64 {
        if !self.auto_height{return self.height;}
        let mut height=self.nodes[&self.root].desired[1];
        for n in self.nodes.values().filter(|n|n.kind==NodeKind::CommandBar&&n.visible){
            if self.command_bar_can_overflow(n.id){let rect=if self.command_expanded_template(n.id){n.command.body}else{self.command_primary_clip(n.id)};let r=n.world.bounds(rect);height=height.max(r.y+r.height);}
        }
        height
    }
    pub fn raster_height(&self)->f64 {
        if !self.auto_height{return self.height;}
        let mut height=self.height.max(self.nodes[&self.root].desired[1]);
        for n in self.nodes.values().filter(|n|n.kind==NodeKind::CommandBar&&n.visible){
            if self.command_expanded_template(n.id)&&self.command_bar_can_overflow(n.id){let r=n.world.bounds(n.command.body);height=height.max(r.y+r.height);}
        }
        height
    }
}
