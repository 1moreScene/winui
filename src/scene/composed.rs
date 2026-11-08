//! Composed controls share the editor, collection and floating executors.
use super::*;
use crate::resources::Resources;
use serde_json::{json, Value};

pub fn is_control(k: NodeKind) -> bool {
    matches!(
        k,
        NodeKind::NumberBox
            | NodeKind::AutoSuggestBox
            | NodeKind::ComboBox
            | NodeKind::ContentDialog
            | NodeKind::TeachingTip
    )
}
pub fn defaults(k: NodeKind, p: &mut NodeProperties) {
    if !is_control(k) {
        return;
    }
    p.is_tab_stop = false;
    p.horizontal_alignment = HorizontalAlignment::Left;
    p.vertical_alignment = VerticalAlignment::Top;
    if k == NodeKind::NumberBox {
        p.number_decimal_separator = ".".into();
        p.number_group_separator = ",".into();
        p.number_minus_sign = "-".into();
        p.minimum = -f64::MAX;
        p.maximum = f64::MAX;
        p.min_width = 120.;
    }
    if matches!(k, NodeKind::AutoSuggestBox | NodeKind::ComboBox) {
        p.min_width = 64.;
    }
}
pub fn validate_properties(
    k: NodeKind,
    p: &mut NodeProperties,
    patch: &serde_json::Map<String, Value>,
) -> Result<(), String> {
    if !p.editor_helper_right_inset.is_finite()
        || p.editor_helper_right_inset < 0.
        || p.editor_helper_right_inset > 100000.
    {
        return Err("Invalid editor helper inset".into());
    }
    if p.shadow_depth
        .is_some_and(|v| !v.is_finite() || !(0. ..=128.).contains(&v))
    {
        return Err("shadowDepth must be finite and between 0 and 128".into());
    }
    if p.placement_margin
        .iter()
        .any(|v| !v.is_finite() || v.abs() > 1e6)
        || p.number_rounding_increment
            .is_some_and(|v| !v.is_finite() || v <= 0. || v > 1e100)
    {
        return Err("Invalid placement margin or rounding increment".into());
    }
    if !is_control(k) {
        return Ok(());
    }
    if !p.max_drop_down_height.is_finite()
        || p.max_drop_down_height <= 0.
        || p.max_drop_down_height > 100000.
    {
        return Err("maxDropDownHeight must be finite and positive".into());
    }
    if k == NodeKind::NumberBox {
        if p.number_decimal_separator.is_empty()
            || p.number_decimal_separator.len() > 16
            || p.number_group_separator.len() > 16
            || p.number_minus_sign.is_empty()
            || p.number_minus_sign.len() > 16
            || p.number_digits.iter().any(|d| d.is_empty() || d.len() > 16)
            || p.number_group_sizes.iter().any(|s| *s == 0 || *s > 9)
            || p.number_min_fraction_digits > 100
        {
            return Err("Invalid NumberBox number format descriptor".into());
        }
        if p.number_value.is_some_and(|v| !v.is_finite()) {
            return Err("NumberBox value must be finite or null (empty)".into());
        }
        if p.minimum > p.maximum {
            if patch.contains_key("maximum") && !patch.contains_key("minimum") {
                p.minimum = p.maximum;
            } else {
                p.maximum = p.minimum;
            }
        }
        if p.validation_mode == NumberBoxValidationMode::InvalidInputOverwritten {
            p.number_value = p.number_value.map(|v| v.clamp(p.minimum, p.maximum));
        }
    }
    if matches!(k, NodeKind::AutoSuggestBox | NodeKind::ComboBox) {
        let mut keys = std::collections::HashSet::new();
        if p.collection_items.len() > 100000 {
            return Err("item count exceeds scene collection budget".into());
        }
        for i in p.collection_items.iter() {
            if i.id.is_empty() || !keys.insert(&i.id) {
                return Err("items need unique nonempty IDs".into());
            }
        }
        if p.selected_index < -1 {
            return Err("selectedIndex must be >= -1".into());
        }
        if p.selected_index >= p.collection_items.len() as i32 {
            p.selected_index = -1;
        }
    }
    Ok(())
}
#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ComposedAction {
    Focus,
    Open,
    Close,
    Toggle,
    Submit,
    Select,
    Increment,
    Decrement,
    Resolve,
    Primary,
    Secondary,
    CloseButton,
    Action,
}
#[derive(Clone, Debug)]
struct Pending {
    id: u32,
    phase: EventKind,
    result: ContentDialogResult,
    reason: TeachingTipCloseReason,
}
#[derive(Clone, Debug, Default)]
pub struct ComposedState {
    pub owner: Option<u32>,
    pub role: &'static str,
    pub parts: BTreeMap<&'static str, u32>,
    building: bool,
    suppress_text: usize,
    last_text: String,
    last_value: Option<f64>,
    last_selected: i32,
    had_focus: bool,
    compact_dismissed: bool,
    modal_active: bool,
    closing_approved: bool,
    pending: Option<Pending>,
    result: ContentDialogResult,
    reason: TeachingTipCloseReason,
    original_text: String,
    search: String,
    search_at: f64,
    restore_focus: Option<u32>,
    last_modal_focus: Option<u32>,
    restore_after_cancel: bool,
    part_cache: BTreeMap<u32, serde_json::Map<String, Value>>,
    last_items: Option<std::sync::Arc<Vec<collections::CollectionData>>>,
    last_number_format: Value,
    last_popup_open: bool,
    popup_anchor_index: Option<i32>,
    pub pointer_focused: bool,
    input_press: Option<i32>,
    reveal_selection: Option<usize>,
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ComposedSnapshot {
    pub parts: BTreeMap<&'static str, u32>,
    pub value: Option<f64>,
    pub selected_index: i32,
    pub pending_request: Option<u32>,
    pub result: ContentDialogResult,
    pub modal_active: bool,
}
impl ComposedState {
    pub fn snapshot(&self, p: &NodeProperties) -> ComposedSnapshot {
        ComposedSnapshot {
            parts: self.parts.clone(),
            value: p.number_value,
            selected_index: p.selected_index,
            pending_request: self.pending.as_ref().map(|p| p.id),
            result: self.result,
            modal_active: self.modal_active,
        }
    }
}

impl Scene {
    pub(super) fn composed_content_parent(
        &self,
        parent: u32,
        _kind: NodeKind,
    ) -> Result<u32, String> {
        let n = self.get(parent)?;
        if !is_control(n.kind) || n.composed.building {
            return Ok(parent);
        }
        n.composed
            .parts
            .get("Content")
            .copied()
            .ok_or_else(|| "The control template owns its children".into())
    }
    fn part(
        &mut self,
        owner: u32,
        parent: u32,
        key: &'static str,
        kind: NodeKind,
        p: Value,
    ) -> Result<u32, String> {
        let id = self.create(parent, kind, p)?;
        let n = self.nodes.get_mut(&id).unwrap();
        n.composed.owner = Some(owner);
        n.composed.role = key;
        self.nodes
            .get_mut(&owner)
            .unwrap()
            .composed
            .parts
            .insert(key, id);
        Ok(id)
    }
    pub(super) fn init_composed(&mut self, id: u32) -> Result<(), String> {
        let kind = self.nodes[&id].kind;
        let p = self.nodes[&id].props.clone();
        self.nodes.get_mut(&id).unwrap().composed.building = true;
        if matches!(
            kind,
            NodeKind::NumberBox | NodeKind::AutoSuggestBox | NodeKind::ComboBox
        ) {
            let root = self.part(
                id,
                id,
                "LayoutRoot",
                NodeKind::Grid,
                json!({"rows":[{"unit":"Auto"},{"unit":"Auto"},{"unit":"Auto"}]}),
            )?;
            self.part(
                id,
                root,
                "Header",
                NodeKind::TextBlock,
                json!({"row":0,"margin":[0,0,0,8],"visible":false}),
            )?;
            let body=self.part(id,root,"InputRoot",NodeKind::Grid,json!({"row":1,"columns":[{"unit":"Star"},{"unit":"Pixel","value":0},{"unit":"Pixel","value":38}]}))?;
            let mut text = p.text.clone();
            if kind == NodeKind::NumberBox {
                let v = p
                    .number_value
                    .or_else(|| {
                        if p.accepts_expression {
                            crate::number_box::evaluate_with(&text, |t| parse_number(t, &p))
                        } else {
                            parse_number(text.trim(), &p)
                        }
                    })
                    .filter(|v| v.is_finite());
                let n = self.nodes.get_mut(&id).unwrap();
                n.props.number_value = v.map(|v| {
                    if p.validation_mode == NumberBoxValidationMode::Disabled {
                        v
                    } else {
                        v.clamp(p.minimum, p.maximum)
                    }
                });
                text = if n.props.number_value.is_none()
                    && p.validation_mode == NumberBoxValidationMode::Disabled
                {
                    p.text.clone()
                } else {
                    format_number(n.props.number_value, &n.props)
                };
                n.props.text = text.clone();
            } else if p.selected_index >= 0 {
                text = p.collection_items[p.selected_index as usize].text.clone();
                self.nodes.get_mut(&id).unwrap().props.text = text.clone();
            }
            self.part(id,body,"InputBox",NodeKind::TextBox,json!({"columnSpan":3,"text":text,"minWidth":0,"placeholderText":p.placeholder_text,"accessibleName":p.accessible_name.clone().unwrap_or_else(||p.header.clone())}))?;
            self.part(
                id,
                root,
                "Description",
                NodeKind::TextBlock,
                json!({"row":2,"fontSize":14,"margin":[0,0,0,0],"visible":false,"wrap":true}),
            )?;
            if kind == NodeKind::NumberBox {
                self.part(id,body,"PopupIndicator",NodeKind::TextBlock,json!({"column":2,"text":"\u{ec8f}","fontFamily":"Segoe Fluent Icons","fontSize":12,"horizontalAlignment":"Center","verticalAlignment":"Center","visible":false,"foreground":{"resource":"NumberBoxPopupIndicatorForeground"}}))?;
                self.part(id,body,"UpSpinButton",NodeKind::RepeatButton,json!({"column":1,"width":32,"minWidth":32,"minHeight":0,"verticalAlignment":"Stretch","margin":[4,4,4,4],"borderThickness":[0,1,1,1],"padding":[0,0,0,0],"accessibleName":"Increase value","isTabStop":false,"text":"\u{e70e}","fontFamily":"Segoe Fluent Icons","fontSize":14}))?;
                self.part(id,body,"DownSpinButton",NodeKind::RepeatButton,json!({"column":2,"width":32,"minWidth":32,"minHeight":0,"verticalAlignment":"Stretch","margin":[0,4,4,4],"borderThickness":[0,1,1,1],"padding":[0,0,0,0],"accessibleName":"Decrease value","isTabStop":false,"text":"\u{e70d}","fontFamily":"Segoe Fluent Icons","fontSize":14}))?;
                let popup=self.part(id,id,"Popup",NodeKind::Flyout,json!({"minWidth":0,"maxWidth":null,"padding":[6,6,6,6],"autoFocus":false,"placement":"Right","isOpen":false,"shadowDepth":16,"acrylicResource":"NumberBoxPopupBackground","borderBrush":{"resource":"NumberBoxPopupBorderBrush"},"placementTarget":body}))?;
                let stack = self.part(
                    id,
                    popup,
                    "SpinPanel",
                    NodeKind::StackPanel,
                    json!({"spacing":4}),
                )?;
                self.part(id,stack,"PopupUpSpinButton",NodeKind::RepeatButton,json!({"width":36,"height":36,"borderThickness":[0,0,0,0],"padding":[0,0,0,0],"text":"\u{e70e}","fontFamily":"Segoe Fluent Icons","fontSize":16,"accessibleName":"Increase value","isTabStop":false}))?;
                self.part(id,stack,"PopupDownSpinButton",NodeKind::RepeatButton,json!({"width":36,"height":36,"borderThickness":[0,0,0,0],"padding":[0,0,0,0],"text":"\u{e70d}","fontFamily":"Segoe Fluent Icons","fontSize":16,"accessibleName":"Decrease value","isTabStop":false}))?;
            } else {
                let drop_button=self.part(id,body,"DropDownButton",NodeKind::Button,json!({"column":2,"width":38,"minWidth":0,"minHeight":0,"height":32,"padding":[0,0,0,0],"variant":"Subtle","text":if kind==NodeKind::ComboBox{""}else{"\u{e721}"},"fontFamily":"Segoe Fluent Icons","fontSize":12,"accessibleName":if kind==NodeKind::ComboBox{"Open drop-down"}else{"Submit query"},"isTabStop":false}))?;
                if kind == NodeKind::ComboBox {
                    self.part(id,drop_button,"DropDownGlyph",NodeKind::AnimatedIcon,json!({"width":12,"height":12,"source":"ChevronDownSmall","useParentState":true,"horizontalAlignment":"Center","verticalAlignment":"Center"}))?;
                }
                let popup=self.part(id,id,"Popup",NodeKind::Flyout,json!({"minWidth":0,"maxWidth":null,"padding":[0,4,0,4],"autoFocus":false,"placement":"Bottom","placementTarget":body,"isOpen":false,"maxHeight":p.max_drop_down_height,"borderBrush":{"resource":if kind==NodeKind::ComboBox{"ComboBoxDropDownBorderBrush"}else{"AutoSuggestBoxSuggestionsListBorderBrush"}},"acrylicResource":if kind==NodeKind::ComboBox{"ComboBoxDropDownBackground"}else{"AutoSuggestBoxSuggestionsListBackground"}}))?;
                self.part(id,popup,"ItemsPresenter",NodeKind::ListView,json!({"minHeight":0,"margin":if kind==NodeKind::AutoSuggestBox{json!([-1,0,-1,0])}else{json!([0,0,0,0])},"selectionMode":"Single","isItemClickEnabled":true,"verticalScrollBarVisibility":"Auto","horizontalScrollBarVisibility":"Disabled","itemContainerStyle":{"minHeight":if kind==NodeKind::AutoSuggestBox{40}else{32},"borderThickness":if kind==NodeKind::ComboBox{json!([1,1,1,1])}else{json!([0,0,0,0])},"padding":if kind==NodeKind::AutoSuggestBox{json!([16,0,12,0])}else{json!([11,5,11,7])},"margin":if kind==NodeKind::AutoSuggestBox{json!([0,0,0,0])}else{json!([5,2,5,2])}}}))?;
            }
        } else if kind == NodeKind::ContentDialog {
            let popup=self.part(id,id,"Popup",NodeKind::Flyout,json!({"minWidth":0,"maxWidth":null,"maxHeight":null,"padding":[0,0,0,0],"borderThickness":[0,0,0,0],"cornerRadius":0,"background":"#00000000","shadowDepth":0,"autoFocus":false,"isLightDismissEnabled":false,"isOpen":false}))?;
            let grid = self.part(
                id,
                popup,
                "LayoutRoot",
                NodeKind::Grid,
                json!({"background":{"resource":"ContentDialogSmokeFill"}}),
            )?;
            let panel=self.part(id,grid,"DialogBorder",NodeKind::Border,json!({"minWidth":320,"maxWidth":548,"minHeight":184,"maxHeight":756,"margin":[24,24,24,24],"horizontalAlignment":"Center","verticalAlignment":"Center","background":{"resource":"ContentDialogBackground"},"borderBrush":{"resource":"ContentDialogBorderBrush"},"borderThickness":[1,1,1,1],"cornerRadius":8,"shadowDepth":128}))?;
            let stack = self.part(
                id,
                panel,
                "DialogSpace",
                NodeKind::Grid,
                json!({"rows":[{"unit":"Star"},{"unit":"Auto"}]}),
            )?;
            let scroll = self.part(
                id,
                stack,
                "ContentScrollViewer",
                NodeKind::ScrollViewer,
                json!({"maxHeight":420,"verticalScrollBarVisibility":"Auto","isTabStop":false}),
            )?;
            let top=self.part(id,scroll,"TopBorder",NodeKind::Border,json!({"background":{"resource":"ContentDialogTopOverlay"},"borderBrush":{"resource":"ContentDialogSeparatorBorderBrush"},"borderThickness":[0,0,0,1]}))?;
            let content = self.part(
                id,
                top,
                "TopContent",
                NodeKind::Grid,
                json!({"padding":[24,24,24,24],"rows":[{"unit":"Auto"},{"unit":"Auto"}]}),
            )?;
            self.part(
                id,
                content,
                "Title",
                NodeKind::TextBlock,
                json!({"text":p.title,"fontSize":20,"fontWeight":600,"wrap":true}),
            )?;
            self.part(
                id,
                content,
                "Content",
                NodeKind::StackPanel,
                json!({"row":1,"spacing":8,"margin":[0,12,0,0]}),
            )?;
            let buttons=self.part(id,stack,"CommandSpace",NodeKind::Grid,json!({"row":1,"padding":[24,24,24,24],"columns":[{"unit":"Star"},{"unit":"Star"},{"unit":"Star"}],"spacing":8}))?;
            self.part(
                id,
                buttons,
                "PrimaryButton",
                NodeKind::Button,
                json!({"column":0,"horizontalAlignment":"Stretch"}),
            )?;
            self.part(
                id,
                buttons,
                "SecondaryButton",
                NodeKind::Button,
                json!({"column":1,"horizontalAlignment":"Stretch"}),
            )?;
            self.part(
                id,
                buttons,
                "CloseButton",
                NodeKind::Button,
                json!({"column":2,"horizontalAlignment":"Stretch"}),
            )?;
        } else {
            let popup=self.part(id,id,"Popup",NodeKind::Flyout,json!({"minWidth":304,"maxWidth":320,"maxHeight":504,"padding":[12,12,12,12],"cornerRadius":8,"background":{"resource":"TeachingTipBackgroundBrush"},"borderBrush":{"resource":"TeachingTipBorderBrush"},"shadowDepth":32,"autoFocus":false,"isLightDismissEnabled":p.is_light_dismiss_enabled,"isOpen":false}))?;
            let presentation = self.part(
                id,
                popup,
                "PresentationRoot",
                NodeKind::Grid,
                json!({"columns":[{"unit":"Auto"}]}),
            )?;
            let root = self.part(
                id,
                presentation,
                "LayoutRoot",
                NodeKind::StackPanel,
                json!({"spacing":0}),
            )?;
            self.part(
                id,
                root,
                "HeroContent",
                NodeKind::StackPanel,
                json!({"row":0,"visible":false}),
            )?;
            let labels = self.part(
                id,
                root,
                "Labels",
                NodeKind::Grid,
                json!({"row":1,"columns":[{"unit":"Auto"},{"unit":"Star"},{"unit":"Auto"}]}),
            )?;
            self.part(
                id,
                labels,
                "Icon",
                NodeKind::IconSourceElement,
                json!({"visible":false,"margin":[0,0,12,0]}),
            )?;
            let titles = self.part(
                id,
                labels,
                "Titles",
                NodeKind::StackPanel,
                json!({"column":1,"spacing":0}),
            )?;
            self.part(
                id,
                titles,
                "Title",
                NodeKind::TextBlock,
                json!({"fontWeight":600,"wrap":true}),
            )?;
            self.part(
                id,
                titles,
                "Subtitle",
                NodeKind::TextBlock,
                json!({"wrap":true}),
            )?;
            let close_layer = self.part(
                id,
                presentation,
                "HeaderCloseLayer",
                NodeKind::Canvas,
                json!({}),
            )?;
            self.part(id,close_layer,"AlternateCloseButton",NodeKind::Button,json!({"text":"\u{e711}","fontFamily":"Segoe Fluent Icons","fontSize":16,"width":40,"height":40,"canvasTop":-12,"padding":[0,0,0,0],"variant":"Subtle","accessibleName":"Close"}))?;
            self.part(
                id,
                root,
                "Content",
                NodeKind::StackPanel,
                json!({"row":2,"spacing":8}),
            )?;
            let buttons=self.part(id,root,"CommandSpace",NodeKind::Grid,json!({"row":3,"columns":[{"unit":"Star"},{"unit":"Star"}],"spacing":8,"margin":[0,12,0,0]}))?;
            let action_button=self.part(
                id,
                buttons,
                "ActionButton",
                NodeKind::Button,
                json!({"horizontalAlignment":"Stretch","horizontalContentAlignment":"Center","column":0}),
            )?;
            self.part(
                id,
                action_button,
                "ActionButtonText",
                NodeKind::TextBlock,
                json!({"wrap":true,"horizontalAlignment":"Center"}),
            )?;
            let close_button=self.part(
                id,
                buttons,
                "CloseButton",
                NodeKind::Button,
                json!({"horizontalAlignment":"Stretch","horizontalContentAlignment":"Center","column":1}),
            )?;
            self.part(
                id,
                close_button,
                "CloseButtonText",
                NodeKind::TextBlock,
                json!({"wrap":true,"horizontalAlignment":"Center"}),
            )?;
        }
        if is_control(kind) {
            let popup = self.nodes[&id].composed.parts["Popup"];
            self.nodes.get_mut(&popup).unwrap().overlay.visual.profile = Some(kind);
        }
        let n = self.nodes.get_mut(&id).unwrap();
        n.composed.building = false;
        n.composed.last_text = n.props.text.clone();
        n.composed.last_value = n.props.number_value;
        n.composed.last_selected = n.props.selected_index;
        n.composed.last_number_format = number_format_signature(&n.props);
        self.sync_composed();
        Ok(())
    }
    pub(super) fn patch_part(&mut self, id: u32, key: &str, p: Value) {
        if let Some(child) = self.nodes[&id].composed.parts.get(key).copied().or_else(||self.nodes[&id].picker.parts.get(key).copied()) {
            // Property comparison avoids restarting editor generations or layout
            // invalidations for a frame whose template configuration is unchanged.
            let changes: serde_json::Map<String, Value> = p
                .as_object()
                .unwrap()
                .iter()
                .filter(|(k, v)| {
                    if key == "InputBox" && *k == "text" {
                        return v.as_str() != Some(self.nodes[&child].props.text.as_str());
                    }
                    self.nodes[&id]
                        .composed
                        .part_cache
                        .get(&child)
                        .and_then(|c| c.get(*k))
                        != Some(*v)
                })
                .map(|(k, v)| (k.clone(), v.clone()))
                .collect();
            if !changes.is_empty() {
                let keep_numeric_edit = key == "InputBox"
                    && self.nodes[&id].kind == NodeKind::NumberBox
                    && self.nodes[&child].editor.user_edited
                    && !self.nodes[&child].props.text.is_empty();
                if changes.contains_key("text") && key == "InputBox" {
                    self.nodes.get_mut(&id).unwrap().composed.suppress_text += 1;
                }
                self.update(vec![Update {
                    id: child,
                    patch: Value::Object(changes.clone()),
                }])
                .expect("validated composed template patch");
                if keep_numeric_edit {
                    self.nodes.get_mut(&child).unwrap().editor.user_edited = true;
                }
                self.nodes
                    .get_mut(&id)
                    .unwrap()
                    .composed
                    .part_cache
                    .entry(child)
                    .or_default()
                    .extend(changes);
            }
        }
    }
    pub(super) fn emit_composed(&mut self, id: u32, kind: EventKind, payload: Value) {
        self.emit(id, kind);
        self.events.last_mut().unwrap().payload = Some(payload);
    }
    pub(super) fn pump_composed_events(&mut self) {
        for _ in 0..10000 {
            let Some(index) = self.events.iter().position(|e| !e.composed_processed) else {
                break;
            };
            self.events[index].composed_processed = true;
            let event = self.events[index].clone();
            if self.picker_template_event(&event) { continue; }
            let Some(child) = self.nodes.get(&event.target) else {
                continue;
            };
            let Some(owner) = child.composed.owner else {
                continue;
            };
            if !self.nodes.contains_key(&owner) {
                continue;
            }
            let role = child.composed.role;
            let kind = self.nodes[&owner].kind;
            match event.kind {
                EventKind::TextChanged if role == "InputBox" => {
                    let state = &mut self.nodes.get_mut(&owner).unwrap().composed;
                    if state.suppress_text > 0 {
                        state.suppress_text -= 1;
                        continue;
                    }
                    let text = self.nodes[&event.target].props.text.clone();
                    let n = self.nodes.get_mut(&owner).unwrap();
                    n.props.text = text.clone();
                    n.composed.last_text = text.clone();
                    if kind == NodeKind::AutoSuggestBox {
                        n.composed.original_text = text.clone();
                        n.props.selected_index = -1;
                        n.props.is_suggestion_list_open = true;
                        self.emit_composed(owner,EventKind::TextChanged,json!({"text":text,"reason":AutoSuggestionBoxTextChangeReason::UserInput}));
                    }
                }
                EventKind::Click => match role {
                    "UpSpinButton" | "PopupUpSpinButton" => self.step_number(owner, false, false),
                    "DownSpinButton" | "PopupDownSpinButton" => {
                        self.step_number(owner, true, false)
                    }
                    "DropDownButton" => {
                        if kind == NodeKind::ComboBox {
                            let n = self.nodes.get_mut(&owner).unwrap();
                            n.props.is_drop_down_open = !n.props.is_drop_down_open;
                        } else {
                            self.submit_query(owner);
                        }
                    }
                    "PrimaryButton" => self.request_composed(
                        owner,
                        EventKind::PrimaryButtonClick,
                        ContentDialogResult::Primary,
                        TeachingTipCloseReason::Programmatic,
                    ),
                    "SecondaryButton" => self.request_composed(
                        owner,
                        EventKind::SecondaryButtonClick,
                        ContentDialogResult::Secondary,
                        TeachingTipCloseReason::Programmatic,
                    ),
                    "CloseButton" | "AlternateCloseButton" => {
                        if kind == NodeKind::ContentDialog {
                            self.request_composed(
                                owner,
                                EventKind::CloseButtonClick,
                                ContentDialogResult::None,
                                TeachingTipCloseReason::CloseButton,
                            );
                        } else {
                            self.emit_composed(owner, EventKind::CloseButtonClick, json!({}));
                            self.request_composed(
                                owner,
                                EventKind::Closing,
                                ContentDialogResult::None,
                                TeachingTipCloseReason::CloseButton,
                            );
                        }
                    }
                    "ActionButton" => {
                        self.emit_composed(owner, EventKind::ActionButtonClick, json!({}))
                    }
                    _ => {}
                },
                EventKind::ItemClick if role == "ItemsPresenter" => {
                    if let Some(key) = event.item_id.as_ref() {
                        if let Some(index) = self.nodes[&owner]
                            .props
                            .collection_items
                            .iter()
                            .position(|i| &i.id == key)
                        {
                            self.choose_composed(owner, index, true);
                        }
                    }
                    // Internal list templates have no JS controller to complete
                    // their notification-before-selection transaction.
                    if let Some(request) = event.request_id {
                        let _ = self.input(
                            Input::CollectionCommit {
                                id: event.target,
                                request,
                            },
                            self.time,
                        );
                    }
                }
                EventKind::Opening | EventKind::Opened if role == "Popup" => {
                    if matches!(kind, NodeKind::ContentDialog | NodeKind::TeachingTip) {
                        self.emit_composed(owner, event.kind, json!({}));
                    }
                    if event.kind == EventKind::Opened && kind == NodeKind::ContentDialog {
                        let key = match self.nodes[&owner].props.default_button {
                            ContentDialogButton::Primary => "PrimaryButton",
                            ContentDialogButton::Secondary => "SecondaryButton",
                            ContentDialogButton::Close => "CloseButton",
                            _ => "",
                        };
                        let content = self.nodes[&owner].composed.parts["Content"];
                        let preferred = self.nodes[&owner]
                            .composed
                            .parts
                            .get(key)
                            .copied()
                            .filter(|id| self.nodes[id].visible && self.effective_enabled(*id));
                        let first_content = self
                            .nodes
                            .values()
                            .find(|n| {
                                self.descendant_of(n.id, content)
                                    && n.visible
                                    && n.enabled
                                    && n.props.is_tab_stop
                                    && (crate::selection::is_button(n.kind)
                                        || text_edit::is_editor(n.kind))
                            })
                            .map(|n| n.id);
                        let fallback = ["PrimaryButton", "SecondaryButton", "CloseButton"]
                            .into_iter()
                            .map(|key| self.nodes[&owner].composed.parts[key])
                            .find(|id| self.nodes[id].visible && self.effective_enabled(*id));
                        self.focus(preferred.or(first_content).or(fallback));
                    }
                }
                EventKind::Closing if role == "Popup" => {
                    if let Some(request) = event.request_id {
                        if matches!(kind, NodeKind::ContentDialog | NodeKind::TeachingTip)
                            && !self.nodes[&owner].composed.closing_approved
                        {
                            let _ = self.resolve_overlay_close(event.target, request, true);
                            self.request_composed(
                                owner,
                                EventKind::Closing,
                                ContentDialogResult::None,
                                TeachingTipCloseReason::LightDismiss,
                            );
                        } else {
                            let _ = self.resolve_overlay_close(event.target, request, false);
                        }
                    }
                }
                EventKind::Closed if role == "Popup" => {
                    let n = self.nodes.get_mut(&owner).unwrap();
                    n.props.is_drop_down_open = false;
                    n.props.is_suggestion_list_open = false;
                    n.composed.compact_dismissed = true;
                    if matches!(kind, NodeKind::ContentDialog | NodeKind::TeachingTip) {
                        n.props.is_open = false;
                        n.composed.modal_active = false;
                        n.composed.closing_approved = false;
                        n.composed.restore_after_cancel = false;
                        let (result, reason) = (n.composed.result, n.composed.reason);
                        let restore = n.composed.restore_focus.take();
                        if kind == NodeKind::ContentDialog {
                            self.focus(restore.filter(|id| {
                                self.nodes.contains_key(id) && self.effective_enabled(*id)
                            }));
                        }
                        self.emit_composed(
                            owner,
                            EventKind::Closed,
                            json!({"dialogResult":result,"reason":reason}),
                        );
                    } else {
                        self.emit_composed(owner, EventKind::Closed, json!({}));
                    }
                }
                _ => {}
            }
        }
    }
    pub(super) fn restore_composed_focus(&mut self) {
        let ids: Vec<_> = self
            .nodes
            .values()
            .filter(|n| n.composed.restore_after_cancel)
            .map(|n| n.id)
            .collect();
        for id in ids {
            let focus = self.nodes[&id]
                .composed
                .last_modal_focus
                .filter(|f| self.nodes.get(f).is_some_and(|n| n.enabled && n.visible));
            if focus.is_some() {
                self.nodes
                    .get_mut(&id)
                    .unwrap()
                    .composed
                    .restore_after_cancel = false;
                self.focus(focus);
            }
        }
    }
    pub(super) fn sync_composed(&mut self) {
        if self.composed_syncing {
            return;
        }
        self.composed_syncing = true;
        let ids: Vec<_> = self
            .nodes
            .values()
            .filter(|n| is_control(n.kind) && !n.composed.building)
            .map(|n| n.id)
            .collect();
        for id in ids {
            let mut p = self.nodes[&id].props.clone();
            let kind = self.nodes[&id].kind;
            if kind == NodeKind::ContentDialog {
                if let Some(focus) = self.focused.filter(|f| self.descendant_of(*f, id)) {
                    self.nodes.get_mut(&id).unwrap().composed.last_modal_focus = Some(focus);
                }
            }
            if matches!(kind, NodeKind::ContentDialog | NodeKind::TeachingTip) {
                let popup = self.nodes[&id].composed.parts["Popup"];
                if !p.is_open
                    && self.nodes[&popup].overlay.open
                    && !self.nodes[&id].composed.closing_approved
                {
                    self.request_composed(
                        id,
                        EventKind::Closing,
                        ContentDialogResult::None,
                        TeachingTipCloseReason::Programmatic,
                    );
                    p.is_open = true;
                    self.nodes.get_mut(&id).unwrap().props.is_open = true;
                }
            }
            let focused = self.focused.is_some_and(|f| self.descendant_of(f, id));
            let old_focus = self.nodes[&id].composed.had_focus;
            if old_focus && !focused {
                if kind == NodeKind::NumberBox {
                    self.commit_number(id);
                }
                if kind == NodeKind::AutoSuggestBox {
                    self.nodes
                        .get_mut(&id)
                        .unwrap()
                        .props
                        .is_suggestion_list_open = false;
                }
            }
            if focused && !old_focus {
                self.nodes.get_mut(&id).unwrap().composed.compact_dismissed = false;
            }
            self.nodes.get_mut(&id).unwrap().composed.had_focus = focused;
            if matches!(
                kind,
                NodeKind::NumberBox | NodeKind::AutoSuggestBox | NodeKind::ComboBox
            ) {
                self.patch_part(id,"Header",json!({"text":p.header,"visible":!p.header.is_empty(),"fontFamily":p.font_family,"fontSize":p.font_size}));
                self.patch_part(
                    id,
                    "Description",
                    json!({"text":p.description,"visible":!p.description.is_empty()}),
                );
                if kind == NodeKind::NumberBox {
                    let format = number_format_signature(&p);
                    let changed_format = format != self.nodes[&id].composed.last_number_format;
                    self.nodes.get_mut(&id).unwrap().composed.last_number_format = format;
                    if p.number_value != self.nodes[&id].composed.last_value || changed_format {
                        self.set_number(id, p.number_value);
                    } else if p.text != self.nodes[&id].composed.last_text {
                        self.commit_number(id);
                    }
                    let inline =
                        p.spin_button_placement_mode == NumberBoxSpinButtonPlacementMode::Inline;
                    self.patch_part(id,"InputBox",json!({"text":self.nodes[&id].props.text,"placeholderText":p.placeholder_text,"isReadOnly":p.is_read_only,"fontFamily":p.font_family,"fontSize":p.font_size,"fontWeight":p.font_weight,"fontStyle":p.font_style,"numberBoxEditor":true,"editorHelperRightInset":if inline{76}else if p.spin_button_placement_mode==NumberBoxSpinButtonPlacementMode::Compact{24}else{0},"padding":[10,5,if inline{82}else if p.spin_button_placement_mode==NumberBoxSpinButtonPlacementMode::Compact{30}else{6},6]}));
                    let compact =
                        p.spin_button_placement_mode == NumberBoxSpinButtonPlacementMode::Compact;
                    self.patch_part(id,"InputRoot",json!({"columns":[{"unit":"Star"},{"unit":"Pixel","value":if inline{40}else{0}},{"unit":"Pixel","value":if inline{36}else if compact{24}else{0}}]}));
                    self.patch_part(id, "PopupIndicator", json!({"visible":compact}));
                    for name in ["UpSpinButton", "DownSpinButton"] {
                        self.patch_part(id, name, json!({"visible":inline}));
                    }
                    let v = self.nodes[&id].props.number_value;
                    for (name, up) in [
                        ("UpSpinButton", true),
                        ("PopupUpSpinButton", true),
                        ("DownSpinButton", false),
                        ("PopupDownSpinButton", false),
                    ] {
                        self.patch_part(id,name,json!({"enabled":!p.is_read_only&&v.is_some_and(|v|p.is_wrap_enabled||if up{v<p.maximum}else{v>p.minimum})}));
                    }
                    self.patch_part(id,"Popup",json!({"isOpen":focused&&p.spin_button_placement_mode==NumberBoxSpinButtonPlacementMode::Compact&&!self.nodes[&id].composed.compact_dismissed}));
                } else {
                    if p.selected_index != self.nodes[&id].composed.last_selected {
                        if p.selected_index >= 0 {
                            self.choose_composed(id, p.selected_index as usize, false);
                        } else {
                            let n = self.nodes.get_mut(&id).unwrap();
                            n.composed.last_selected = -1;
                            if kind == NodeKind::ComboBox {
                                if !p.is_editable {
                                    n.props.text.clear();
                                    n.composed.last_text.clear();
                                }
                                self.emit_composed(
                                    id,
                                    EventKind::SelectionChanged,
                                    json!({"selectedIndex":-1,"itemId":null}),
                                );
                            }
                        }
                    }
                    if kind == NodeKind::AutoSuggestBox
                        && p.text != self.nodes[&id].composed.last_text
                    {
                        self.nodes.get_mut(&id).unwrap().composed.last_text = p.text.clone();
                        self.emit_composed(id,EventKind::TextChanged,json!({"text":p.text,"reason":AutoSuggestionBoxTextChangeReason::ProgrammaticChange}));
                    }
                    self.patch_part(id,"InputBox",json!({"text":self.nodes[&id].props.text,"placeholderText":p.placeholder_text,"isReadOnly":p.is_read_only||(kind==NodeKind::ComboBox&&!p.is_editable),"height":if kind==NodeKind::ComboBox&&p.font_size==14.&&(!p.is_editable||!focused&&!p.is_drop_down_open){Some(32.)}else{None},"minHeight":32,"fontFamily":p.font_family,"fontSize":p.font_size,"fontWeight":p.font_weight,"fontStyle":p.font_style,"editorHelperRightInset":if kind==NodeKind::ComboBox || p.query_icon{38}else{0},"padding":[if kind==NodeKind::ComboBox{11}else{10},5,if kind==NodeKind::ComboBox{if p.is_editable{38}else{25}}else if p.query_icon{40}else{6},if kind==NodeKind::ComboBox&&!p.is_editable{7}else{6}]}));
                    self.patch_part(
                        id,
                        "DropDownButton",
                        json!({"visible":kind==NodeKind::ComboBox||p.query_icon,"height":if kind==NodeKind::ComboBox{None}else{Some(32.)},"verticalAlignment":"Stretch"}),
                    );
                    if kind == NodeKind::ComboBox {
                        let state = self.combo_common_state(id).as_str();
                        self.patch_part(id,"DropDownButton",json!({"animatedIconState":state}));
                    }
                    let width = self.nodes[&id]
                        .composed
                        .parts
                        .get("InputRoot")
                        .map(|r| self.nodes[r].rect.width)
                        .unwrap_or(120.)
                        .max(p.min_width)
                        .max(1.);
                    let open = if kind == NodeKind::ComboBox {
                        p.is_drop_down_open
                    } else {
                        p.is_suggestion_list_open && !p.collection_items.is_empty()
                    };
                    if open && !self.nodes[&id].composed.last_popup_open {
                        self.nodes.get_mut(&id).unwrap().composed.popup_anchor_index =
                            Some(p.selected_index);
                    }
                    if open
                        && !self.nodes[&id].composed.last_popup_open
                        && self.nodes[&id].props.selected_index >= 0
                    {
                        self.nodes.get_mut(&id).unwrap().composed.reveal_selection =
                            Some(self.nodes[&id].props.selected_index as usize);
                    }
                    self.nodes.get_mut(&id).unwrap().composed.last_popup_open = open;
                    self.patch_part(id,"Popup",json!({"isOpen":open,"width":width,"maxHeight":p.max_drop_down_height,"padding":if kind==NodeKind::AutoSuggestBox{json!([0,2,0,2])}else{json!([0,4,0,4])}}));
                    let selected = p
                        .collection_items
                        .get(self.nodes[&id].props.selected_index.max(0) as usize)
                        .filter(|_| self.nodes[&id].props.selected_index >= 0)
                        .map(|v| vec![v.id.clone()])
                        .unwrap_or_default();
                    if !self.nodes[&id]
                        .composed
                        .last_items
                        .as_ref()
                        .is_some_and(|items| std::sync::Arc::ptr_eq(items, &p.collection_items))
                    {
                        self.patch_part(
                            id,
                            "ItemsPresenter",
                            json!({"collectionItems":p.collection_items}),
                        );
                        self.nodes.get_mut(&id).unwrap().composed.last_items =
                            Some(p.collection_items.clone());
                    }
                    self.patch_part(id,"ItemsPresenter",json!({"selectedKeys":selected,"fontFamily":p.font_family,"fontSize":p.font_size,"maxHeight":(p.max_drop_down_height-10.).max(0.),"minWidth":(width-2.).max(0.)}));
                }
            } else if kind == NodeKind::ContentDialog {
                self.patch_part(id,"Popup",json!({"width":self.width.max(1.),"height":self.height.max(1.),"horizontalOffset":0,"verticalOffset":0,"isOpen":p.is_open}));
                self.patch_part(
                    id,
                    "Title",
                    json!({"text":p.title,"visible":!p.title.is_empty()}),
                );
                self.patch_part(
                    id,
                    "ContentScrollViewer",
                    json!({"maxHeight":(self.height-130.).max(40.)}),
                );
                self.patch_part(
                    id,
                    "Content",
                    json!({"margin":[0,if p.title.is_empty(){0}else{12},0,0]}),
                );
                let busy = self.nodes[&id].composed.pending.is_some();
                let mut column = 0;
                for (name, label, enabled, button) in [
                    (
                        "PrimaryButton",
                        &p.primary_button_text,
                        p.is_primary_button_enabled,
                        ContentDialogButton::Primary,
                    ),
                    (
                        "SecondaryButton",
                        &p.secondary_button_text,
                        p.is_secondary_button_enabled,
                        ContentDialogButton::Secondary,
                    ),
                    (
                        "CloseButton",
                        &p.close_button_text,
                        true,
                        ContentDialogButton::Close,
                    ),
                ] {
                    self.patch_part(id,name,json!({"text":label,"visible":!label.is_empty(),"enabled":enabled&&!busy,"column":column,"variant":if p.default_button==button{"Accent"}else{"Standard"}}));
                    if !label.is_empty() {
                        column += 1;
                    }
                }
                let keys = ["PrimaryButton", "SecondaryButton", "CloseButton"];
                let minima: Vec<f64> = keys
                    .iter()
                    .filter_map(|key| {
                        let b = &self.nodes[&self.nodes[&id].composed.parts[*key]];
                        b.props.visible.then(|| {
                            let ink = b
                                .text
                                .lines
                                .iter()
                                .map(|line| line.width)
                                .fold(0f64, f64::max);
                            let edge = (crate::button::defaults().border_thickness * self.dpr)
                                .round()
                                / self.dpr;
                            ((ink + b.props.padding[0] + b.props.padding[2] + 2. * edge) * self.dpr
                                - 1e-9)
                                .ceil()
                                / self.dpr
                        })
                    })
                    .collect();
                for (key, width) in keys
                    .iter()
                    .filter(|key| {
                        self.nodes[&self.nodes[&id].composed.parts[**key]]
                            .props
                            .visible
                    })
                    .copied()
                    .zip(minima.iter())
                    .collect::<Vec<_>>()
                {
                    self.patch_part(id, key, json!({"minWidth":width}));
                }
                let command_min =
                    minima.iter().sum::<f64>() + (column - 1).max(0) as f64 * 8. + 48.;
                let commands = &self.nodes[&self.nodes[&id].composed.parts["CommandSpace"]];
                let available = (commands
                    .rect
                    .width
                    .max(320. - 2. * (self.dpr).round() / self.dpr)
                    - 48.
                    - (column - 1).max(0) as f64 * 8.)
                    .max(0.);
                let share = available / column.max(1) as f64;
                let mut remaining = available;
                let weights: Vec<_> = minima
                    .iter()
                    .enumerate()
                    .map(|(index, min)| {
                        let width = if index + 1 == minima.len() {
                            remaining.max(*min)
                        } else {
                            share.max(*min)
                        };
                        remaining = (remaining - width).max(0.);
                        json!({"unit":"Star","value":width.max(1.)})
                    })
                    .collect();
                self.patch_part(id,"CommandSpace",json!({"minWidth":command_min,"columns":if weights.is_empty(){vec![json!({"unit":"Star"})]}else{weights},"visible":column>0}));
            } else {
                self.patch_part(
                    id,
                    "Title",
                    json!({"text":p.title,"visible":!p.title.is_empty()}),
                );
                self.patch_part(
                    id,
                    "Subtitle",
                    json!({"text":p.subtitle,"visible":!p.subtitle.is_empty()}),
                );
                self.patch_part(
                    id,
                    "Icon",
                    json!({"iconSource":p.icon_source,"visible":p.icon_source.is_some()}),
                );
                let has_content = !self.nodes[&self.nodes[&id].composed.parts["Content"]]
                    .children
                    .is_empty();
                self.patch_part(
                    id,
                    "Content",
                    json!({"visible":has_content,"margin":[0,12,0,0]}),
                );
                let action = !p.action_button_content.is_empty();
                let close = !p.close_button_text.is_empty();
                self.patch_part(id,"CommandSpace",json!({"visible":action||close,"columns":if action&&close{json!([{"unit":"Star"},{"unit":"Star"}])}else{json!([{"unit":"Star"}])}}));
                self.patch_part(id, "CloseButton", json!({"column":if action{1}else{0}}));
                self.patch_part(id,"ActionButton",json!({"accessibleName":p.action_button_content,"visible":!p.action_button_content.is_empty()}));
                self.patch_part(
                    id,
                    "ActionButtonText",
                    json!({"text":p.action_button_content}),
                );
                self.patch_part(id, "CloseButtonText", json!({"text":p.close_button_text}));
                self.patch_part(
                    id,
                    "CloseButton",
                    json!({"accessibleName":p.close_button_text,"visible":!p.close_button_text.is_empty()}),
                );
                self.patch_part(
                    id,
                    "AlternateCloseButton",
                    json!({"visible":p.close_button_text.is_empty()}),
                );
                self.patch_part(
                    id,
                    "Titles",
                    json!({"margin":[0,0,if p.close_button_text.is_empty(){28}else{0},0]}),
                );
                let placement = match p.preferred_placement {
                    TeachingTipPlacementMode::Bottom
                    | TeachingTipPlacementMode::BottomLeft
                    | TeachingTipPlacementMode::BottomRight => OverlayPlacement::Bottom,
                    TeachingTipPlacementMode::Left
                    | TeachingTipPlacementMode::LeftTop
                    | TeachingTipPlacementMode::LeftBottom => OverlayPlacement::Left,
                    TeachingTipPlacementMode::Right
                    | TeachingTipPlacementMode::RightTop
                    | TeachingTipPlacementMode::RightBottom => OverlayPlacement::Right,
                    _ => OverlayPlacement::Top,
                };
                self.patch_part(id,"Popup",json!({"isOpen":p.is_open,"placementTarget":p.placement_target,"placement":placement,"horizontalOffset":if p.placement_target.is_none(){24.}else{0.},"verticalOffset":if p.placement_target.is_none(){(self.height-160.).max(0.)}else{0.},"isLightDismissEnabled":p.is_light_dismiss_enabled,"background":if p.is_light_dismiss_enabled{Value::Null}else{json!({"resource":"TeachingTipBackgroundBrush"})},"acrylicResource":if p.is_light_dismiss_enabled{Some("TeachingTipTransientBackground")}else{None}}));
                let parts = &self.nodes[&id].composed.parts;
                let root = parts["LayoutRoot"];
                let hero = parts["HeroContent"];
                let labels = parts["Labels"];
                let content = parts["Content"];
                let commands = parts["CommandSpace"];
                let auto_bottom = p.hero_content_placement
                    == TeachingTipHeroContentPlacementMode::Auto
                    && (self.nodes[&parts["Popup"]].overlay.actual == OverlayPlacement::Bottom
                        || matches!(
                            p.preferred_placement,
                            TeachingTipPlacementMode::Bottom
                                | TeachingTipPlacementMode::BottomLeft
                                | TeachingTipPlacementMode::BottomRight
                                | TeachingTipPlacementMode::LeftBottom
                                | TeachingTipPlacementMode::RightBottom
                        ));
                let order = if p.hero_content_placement
                    == TeachingTipHeroContentPlacementMode::Bottom
                    || auto_bottom
                {
                    vec![labels, content, commands, hero]
                } else {
                    vec![hero, labels, content, commands]
                };
                if self.nodes[&root].children != order {
                    self.nodes.get_mut(&root).unwrap().children = order;
                    self.invalidate(root, true);
                }
                if let Some(hero) = self.nodes[&id].composed.parts.get("HeroContent") {
                    self.patch_part(
                        id,
                        "HeroContent",
                        json!({"visible":!self.nodes[hero].children.is_empty(),"margin":if p.hero_content_placement==TeachingTipHeroContentPlacementMode::Bottom||auto_bottom{json!([-12,12,-12,-12])}else{json!([-12,-12,-12,12])}}),
                    );
                }
            }
        }
        self.composed_syncing = false;
    }
    fn set_number(&mut self, id: u32, value: Option<f64>) {
        let p = &self.nodes[&id].props;
        let value = value
            .map(|v| {
                if p.validation_mode == NumberBoxValidationMode::Disabled {
                    v
                } else {
                    v.clamp(p.minimum, p.maximum)
                }
            })
            .filter(|v| v.is_finite());
        let old = self.nodes[&id].composed.last_value;
        let text = format_number(value, p);
        let n = self.nodes.get_mut(&id).unwrap();
        n.props.number_value = value;
        n.props.text = text.clone();
        n.composed.last_text = text;
        n.composed.last_value = value;
        if old != value {
            self.emit_composed(
                id,
                EventKind::ValueChanged,
                json!({"oldValue":old,"newValue":value}),
            );
            self.events.last_mut().unwrap().value = None;
        }
    }
    fn commit_number(&mut self, id: u32) {
        let p = &self.nodes[&id].props;
        let text = p.text.trim();
        if text.is_empty() {
            self.set_number(id, None);
            return;
        }
        let value = if p.accepts_expression {
            crate::number_box::evaluate_with(text, |t| parse_number(t, p))
        } else {
            parse_number(text, p)
        };
        if let Some(v) = value {
            self.set_number(id, Some(v));
        } else if p.validation_mode == NumberBoxValidationMode::InvalidInputOverwritten {
            self.set_number(id, p.number_value);
        }
    }
    fn step_number(&mut self, id: u32, down: bool, large: bool) {
        if self.nodes[&id].props.is_read_only || !self.effective_enabled(id) {
            return;
        }
        self.commit_number(id);
        let p = &self.nodes[&id].props;
        if let Some(mut value) = p.number_value {
            value += if down { -1. } else { 1. }
                * if large {
                    p.large_change
                } else {
                    p.small_change
                };
            if p.is_wrap_enabled {
                if value > p.maximum {
                    value = p.minimum;
                } else if value < p.minimum {
                    value = p.maximum;
                }
            }
            self.set_number(id, Some(value));
            let length = self.nodes[&id].props.text.encode_utf16().count();
            self.patch_part(id,"InputBox",json!({"text":self.nodes[&id].props.text,"selectionStart":length,"selectionLength":0}));
            let input = self.nodes[&id].composed.parts["InputBox"];
            self.focus(Some(input));
        }
    }
    fn choose_composed(&mut self, id: u32, index: usize, submit: bool) {
        let Some(item) = self.nodes[&id].props.collection_items.get(index).cloned() else {
            return;
        };
        if !item.enabled {
            return;
        }
        let kind = self.nodes[&id].kind;
        let old = self.nodes[&id].composed.last_selected;
        let n = self.nodes.get_mut(&id).unwrap();
        n.props.selected_index = index as i32;
        n.composed.last_selected = index as i32;
        n.composed.reveal_selection = Some(index);
        if kind == NodeKind::ComboBox || n.props.update_text_on_select {
            n.props.text = item.text.clone();
            n.composed.last_text = item.text.clone();
        }
        if kind == NodeKind::AutoSuggestBox {
            self.emit_composed(
                id,
                EventKind::SuggestionChosen,
                json!({"itemId":item.id,"selectedIndex":index}),
            );
            if self.nodes[&id].props.update_text_on_select {
                self.emit_composed(id,EventKind::TextChanged,json!({"text":item.text,"reason":AutoSuggestionBoxTextChangeReason::SuggestionChosen}));
            }
            if submit {
                self.submit_query(id);
            }
        } else {
            if old != index as i32 {
                self.emit_composed(
                    id,
                    EventKind::SelectionChanged,
                    json!({"selectedIndex":index,"itemId":item.id}),
                );
            }
            if submit {
                self.nodes.get_mut(&id).unwrap().props.is_drop_down_open = false;
            }
        }
    }
    fn submit_query(&mut self, id: u32) {
        let p = &self.nodes[&id].props;
        let chosen = if p.selected_index >= 0 {
            p.collection_items
                .get(p.selected_index as usize)
                .map(|i| i.id.clone())
        } else {
            None
        };
        let text = p.text.clone();
        self.nodes
            .get_mut(&id)
            .unwrap()
            .props
            .is_suggestion_list_open = false;
        self.emit_composed(
            id,
            EventKind::QuerySubmitted,
            json!({"queryText":text,"chosenSuggestion":chosen}),
        );
    }
    fn request_composed(
        &mut self,
        id: u32,
        phase: EventKind,
        result: ContentDialogResult,
        reason: TeachingTipCloseReason,
    ) {
        if self.nodes[&id].composed.pending.is_some() {
            return;
        }
        let button = match phase {
            EventKind::PrimaryButtonClick => Some("PrimaryButton"),
            EventKind::SecondaryButtonClick => Some("SecondaryButton"),
            EventKind::CloseButtonClick => Some("CloseButton"),
            _ => None,
        };
        if let Some(button) = button.and_then(|key| self.nodes[&id].composed.parts.get(key)) {
            if !self.nodes[button].props.visible || !self.effective_enabled(*button) {
                return;
            }
        }
        self.next_composed_request = self.next_composed_request.wrapping_add(1);
        let request = self.next_composed_request;
        self.nodes.get_mut(&id).unwrap().composed.pending = Some(Pending {
            id: request,
            phase,
            result,
            reason,
        });
        self.emit_composed(id, phase, json!({"dialogResult":result,"reason":reason}));
        self.events.last_mut().unwrap().request_id = Some(request);
    }
    fn resolve_composed(&mut self, id: u32, request: u32, cancel: bool) {
        let Some(pending) = self.nodes[&id]
            .composed
            .pending
            .clone()
            .filter(|p| p.id == request)
        else {
            return;
        };
        self.nodes.get_mut(&id).unwrap().composed.pending = None;
        if cancel {
            if self.nodes[&id].kind == NodeKind::ContentDialog {
                self.nodes
                    .get_mut(&id)
                    .unwrap()
                    .composed
                    .restore_after_cancel = true;
            }
            return;
        }
        if pending.phase == EventKind::TextSubmitted {
            self.finish_combo_commit(id);
            return;
        }
        if matches!(
            pending.phase,
            EventKind::PrimaryButtonClick
                | EventKind::SecondaryButtonClick
                | EventKind::CloseButtonClick
        ) {
            self.request_composed(id, EventKind::Closing, pending.result, pending.reason);
        } else {
            let n = self.nodes.get_mut(&id).unwrap();
            n.composed.result = pending.result;
            n.composed.reason = pending.reason;
            n.composed.closing_approved = true;
            n.props.is_open = false;
        }
    }
    pub(super) fn composed_input(&mut self, input: &Input) -> Result<bool, String> {
        match input {
            Input::Down { x, y, pointer } => {
                let ids: Vec<_> = self
                    .nodes
                    .values()
                    .filter(|n| {
                        n.kind == NodeKind::ComboBox
                            && (self.inside(n.composed.parts["InputRoot"], *x, *y)
                                || self.inside(n.composed.parts["Popup"], *x, *y))
                    })
                    .map(|n| n.id)
                    .collect();
                for id in ids {
                    let n=&self.nodes[&id];
                    let press=n.visible&&n.enabled&&!n.props.is_editable&&!n.props.is_drop_down_open
                        &&self.inside(n.composed.parts["InputRoot"],*x,*y)
                        &&!self.inside(n.composed.parts["DropDownButton"],*x,*y);
                    if press {self.nodes.get_mut(&id).unwrap().composed.input_press=Some(*pointer);}
                    self.nodes.get_mut(&id).unwrap().composed.pointer_focused = true;
                }
            }
            Input::Up {x,y,pointer} => {
                let ids:Vec<_>=self.nodes.values().filter(|n|n.composed.input_press==Some(*pointer)).map(|n|n.id).collect();
                for id in ids {
                    self.nodes.get_mut(&id).unwrap().composed.input_press=None;
                    let n=&self.nodes[&id];
                    if n.enabled&&n.visible&&self.inside(n.composed.parts["InputRoot"],*x,*y) {
                        let target=n.composed.parts["InputBox"];
                        self.nodes.get_mut(&id).unwrap().props.is_drop_down_open=true;
                        self.captured=None;
                        self.focus(Some(target));self.sync_composed();return Ok(true);
                    }
                }
            }
            Input::Cancel {pointer} => {
                for n in self.nodes.values_mut(){if pointer.is_none()||n.composed.input_press==*pointer{n.composed.input_press=None;}}
            }
            Input::EditPointer { id, .. } => {
                if let Some(owner) = self.nodes.get(id).and_then(|n| n.composed.owner) {
                    if self.nodes[&owner].kind == NodeKind::ComboBox {
                        self.nodes.get_mut(&owner).unwrap().composed.pointer_focused = true;
                    }
                }
            }
            Input::KeyDown { .. } => {
                let ids: Vec<_> = self
                    .nodes
                    .values()
                    .filter(|n| {
                        n.kind == NodeKind::ComboBox
                            && self
                                .focused
                                .is_some_and(|focus| self.descendant_of(focus, n.id))
                    })
                    .map(|n| n.id)
                    .collect();
                for id in ids {
                    self.nodes.get_mut(&id).unwrap().composed.pointer_focused = false;
                }
            }
            _ => {}
        }

        if let Input::Modifiers { shift, .. } = input {
            self.composed_shift = *shift;
            return Ok(false);
        }

        if let Input::Composed {
            id,
            action,
            index,
            request,
            cancel,
        } = input
        {
            if !is_control(self.get(*id)?.kind) {
                return Err("not a composed control".into());
            }
            let kind = self.nodes[id].kind;
            use ComposedAction as A;
            let supported = match kind {
                NodeKind::NumberBox => {
                    matches!(action, A::Focus | A::Submit | A::Increment | A::Decrement)
                }
                NodeKind::AutoSuggestBox => matches!(
                    action,
                    A::Focus | A::Submit | A::Open | A::Close | A::Toggle | A::Select
                ),
                NodeKind::ComboBox => matches!(
                    action,
                    A::Focus | A::Submit | A::Open | A::Close | A::Toggle | A::Select | A::Resolve
                ),
                NodeKind::ContentDialog => matches!(
                    action,
                    A::Open | A::Close | A::Primary | A::Secondary | A::CloseButton | A::Resolve
                ),
                _ => matches!(
                    action,
                    A::Open | A::Close | A::CloseButton | A::Action | A::Resolve
                ),
            };
            if !supported {
                return Err("Unsupported action for this composed control".into());
            }
            match action {
                ComposedAction::Resolve => {
                    self.resolve_composed(*id, request.ok_or("missing request")?, *cancel);
                }
                ComposedAction::Increment => self.step_number(*id, false, false),
                ComposedAction::Decrement => self.step_number(*id, true, false),
                ComposedAction::Select => {
                    self.choose_composed(*id, index.ok_or("missing item index")?, true)
                }
                ComposedAction::Focus => {
                    self.nodes.get_mut(id).unwrap().composed.pointer_focused = false;
                    let target = self.nodes[id].composed.parts.get("InputBox").copied();
                    self.focus(target);
                }
                ComposedAction::Submit => {
                    if kind == NodeKind::NumberBox {
                        self.commit_number(*id);
                    } else if kind == NodeKind::AutoSuggestBox {
                        self.submit_query(*id);
                    } else {
                        self.submit_combo(*id);
                    }
                }
                ComposedAction::Open | ComposedAction::Toggle => {
                    let open = !matches!(action, ComposedAction::Toggle)
                        || !self.nodes[id].props.is_drop_down_open;
                    if kind == NodeKind::ContentDialog {
                        if self.nodes.values().any(|n| {
                            n.id != *id
                                && n.kind == NodeKind::ContentDialog
                                && n.composed.modal_active
                        }) {
                            return Err(
                                "Only one ContentDialog may be active per scene root".into()
                            );
                        }
                        if self.nodes[id].composed.modal_active {
                            return Err("ContentDialog is already showing".into());
                        }
                        let n = self.nodes.get_mut(id).unwrap();
                        n.props.is_open = true;
                        n.composed.modal_active = true;
                        n.composed.result = ContentDialogResult::None;
                        n.composed.restore_focus = self.focused;
                    } else {
                        let p = &mut self.nodes.get_mut(id).unwrap().props;
                        if kind == NodeKind::ComboBox {
                            p.is_drop_down_open = open;
                        } else if kind == NodeKind::AutoSuggestBox {
                            p.is_suggestion_list_open = open;
                        } else {
                            p.is_open = true;
                        }
                    }
                }
                ComposedAction::Primary => self.request_composed(
                    *id,
                    EventKind::PrimaryButtonClick,
                    ContentDialogResult::Primary,
                    TeachingTipCloseReason::Programmatic,
                ),
                ComposedAction::Secondary => self.request_composed(
                    *id,
                    EventKind::SecondaryButtonClick,
                    ContentDialogResult::Secondary,
                    TeachingTipCloseReason::Programmatic,
                ),
                ComposedAction::Action => {
                    self.emit_composed(*id, EventKind::ActionButtonClick, json!({}))
                }
                ComposedAction::CloseButton if kind == NodeKind::ContentDialog => self
                    .request_composed(
                        *id,
                        EventKind::CloseButtonClick,
                        ContentDialogResult::None,
                        TeachingTipCloseReason::CloseButton,
                    ),
                ComposedAction::Close | ComposedAction::CloseButton => {
                    if matches!(kind, NodeKind::ContentDialog | NodeKind::TeachingTip) {
                        self.request_composed(
                            *id,
                            EventKind::Closing,
                            ContentDialogResult::None,
                            if matches!(action, ComposedAction::CloseButton) {
                                TeachingTipCloseReason::CloseButton
                            } else {
                                TeachingTipCloseReason::Programmatic
                            },
                        );
                    } else {
                        let p = &mut self.nodes.get_mut(id).unwrap().props;
                        p.is_drop_down_open = false;
                        p.is_suggestion_list_open = false;
                    }
                }
            }
            self.sync_composed();
            return Ok(true);
        }
        let owner = self.focused.and_then(|f| self.nodes.get(&f)).and_then(|n| {
            n.composed
                .owner
                .or_else(|| n.parent.and_then(|p| self.nodes[&p].composed.owner))
        });
        if let Input::Focus { id } = input {
            if let Some(dialog) = self
                .nodes
                .values()
                .find(|n| n.kind == NodeKind::ContentDialog && n.composed.modal_active)
                .map(|n| n.id)
            {
                if !self.descendant_of(*id, dialog) {
                    return Ok(true);
                }
            }
        }
        if let Some(id) = owner {
            let kind = self.nodes[&id].kind;
            if let Input::KeyDown { key, .. } = input {
                let composing = self
                    .focused
                    .is_some_and(|f| self.nodes[&f].editor.draft.is_some());
                if composing {
                    return Ok(false);
                }
                if kind == NodeKind::NumberBox
                    && matches!(
                        key.as_str(),
                        "ArrowUp" | "ArrowDown" | "PageUp" | "PageDown"
                    )
                {
                    self.step_number(id, key.ends_with("Down"), key.starts_with("Page"));
                    self.sync_composed();
                    return Ok(true);
                }
                if kind == NodeKind::ComboBox
                    && !self.nodes[&id].props.is_editable
                    && self.nodes[&id].props.is_text_search_enabled
                    && key.chars().count() == 1
                    && key != " "
                {
                    let n = self.nodes.get_mut(&id).unwrap();
                    if self.time - n.composed.search_at > 1000. {
                        n.composed.search.clear();
                    }
                    n.composed.search_at = self.time;
                    n.composed.search.push_str(&key.to_lowercase());
                    let query = n.composed.search.clone();
                    if let Some(index) = n
                        .props
                        .collection_items
                        .iter()
                        .position(|i| i.enabled && i.text.to_lowercase().starts_with(&query))
                    {
                        self.choose_composed(id, index, false);
                        self.sync_composed();
                    }
                    return Ok(true);
                }
                if matches!(kind, NodeKind::AutoSuggestBox | NodeKind::ComboBox) {
                    if matches!(key.as_str(), "ArrowDown" | "ArrowUp" | "Home" | "End") {
                        let p = &self.nodes[&id].props;
                        let entries: Vec<_> = p
                            .collection_items
                            .iter()
                            .enumerate()
                            .filter(|(_, i)| i.enabled)
                            .map(|(i, _)| i)
                            .collect();
                        if !entries.is_empty() {
                            let current =
                                entries.iter().position(|i| *i as i32 == p.selected_index);
                            let at = match key.as_str() {
                                "Home" => 0,
                                "End" => entries.len() - 1,
                                "ArrowUp" => {
                                    current.map_or(entries.len() - 1, |i| i.saturating_sub(1))
                                }
                                _ => current.map_or(0, |i| (i + 1).min(entries.len() - 1)),
                            };
                            self.choose_composed(id, entries[at], false);
                            if kind == NodeKind::AutoSuggestBox {
                                self.nodes
                                    .get_mut(&id)
                                    .unwrap()
                                    .props
                                    .is_suggestion_list_open = true;
                            }
                            self.sync_composed();
                        }
                        return Ok(true);
                    }
                    if matches!(key.as_str(), "F4" | "Alt+ArrowDown")
                        || (key == " "
                            && kind == NodeKind::ComboBox
                            && !self.nodes[&id].props.is_editable)
                    {
                        let p = &mut self.nodes.get_mut(&id).unwrap().props;
                        p.is_drop_down_open = !p.is_drop_down_open;
                        self.sync_composed();
                        return Ok(true);
                    }
                    if key == "Enter" {
                        if kind == NodeKind::AutoSuggestBox {
                            self.submit_query(id);
                        } else {
                            self.submit_combo(id);
                        }
                        self.sync_composed();
                        return Ok(true);
                    }
                    if matches!(key.as_str(), "Escape" | "Alt+ArrowUp") {
                        let n = self.nodes.get_mut(&id).unwrap();
                        n.props.is_drop_down_open = false;
                        n.props.is_suggestion_list_open = false;
                        if kind == NodeKind::AutoSuggestBox {
                            n.props.text = n.composed.original_text.clone();
                            n.composed.last_text = n.props.text.clone();
                        }
                        self.sync_composed();
                        return Ok(true);
                    }
                }
            }
            if let Input::KeyUp { key } = input {
                if kind == NodeKind::NumberBox
                    && matches!(key.as_str(), "Enter" | "Escape" | "GamepadA" | "GamepadB")
                {
                    if matches!(key.as_str(), "Escape" | "GamepadB") {
                        let v = self.nodes[&id].props.number_value;
                        self.set_number(id, v);
                    } else {
                        self.commit_number(id);
                    }
                    self.sync_composed();
                    return Ok(true);
                }
            }
        }
        if let Some(dialog) = self
            .nodes
            .values()
            .find(|n| n.kind == NodeKind::ContentDialog && n.composed.modal_active)
            .map(|n| n.id)
        {
            if let Input::KeyDown { key, .. } = input {
                if self
                    .focused
                    .is_some_and(|f| self.nodes[&f].editor.draft.is_some())
                {
                    return Ok(false);
                }
                if key == "Tab" {
                    let candidates: Vec<_> = self
                        .nodes
                        .values()
                        .filter(|n| {
                            self.descendant_of(n.id, dialog)
                                && n.visible
                                && n.enabled
                                && n.props.is_tab_stop
                                && (crate::selection::is_button(n.kind)
                                    || text_edit::is_editor(n.kind))
                        })
                        .map(|n| n.id)
                        .collect();
                    if !candidates.is_empty() {
                        let current = self
                            .focused
                            .and_then(|f| candidates.iter().position(|id| *id == f));
                        let next = if self.composed_shift {
                            current.map_or(candidates.len() - 1, |n| {
                                (n + candidates.len() - 1) % candidates.len()
                            })
                        } else {
                            current.map_or(0, |n| (n + 1) % candidates.len())
                        };
                        self.focus(Some(candidates[next]));
                    }
                    return Ok(true);
                }
                if key == "Escape" {
                    self.request_composed(
                        dialog,
                        EventKind::Closing,
                        ContentDialogResult::None,
                        TeachingTipCloseReason::Programmatic,
                    );
                    return Ok(true);
                }
                if key == "Enter" {
                    if self.focused.is_some_and(|f| {
                        crate::selection::is_button(self.nodes[&f].kind)
                            || (text_edit::is_editor(self.nodes[&f].kind)
                                && self.nodes[&f].props.accepts_return)
                    }) {
                        return Ok(false);
                    }
                    let b = self.nodes[&dialog].props.default_button;
                    match b {
                        ContentDialogButton::Primary => self.request_composed(
                            dialog,
                            EventKind::PrimaryButtonClick,
                            ContentDialogResult::Primary,
                            TeachingTipCloseReason::Programmatic,
                        ),
                        ContentDialogButton::Secondary => self.request_composed(
                            dialog,
                            EventKind::SecondaryButtonClick,
                            ContentDialogResult::Secondary,
                            TeachingTipCloseReason::Programmatic,
                        ),
                        ContentDialogButton::Close => self.request_composed(
                            dialog,
                            EventKind::Closing,
                            ContentDialogResult::None,
                            TeachingTipCloseReason::CloseButton,
                        ),
                        _ => {}
                    }
                    if b != ContentDialogButton::None {
                        return Ok(true);
                    }
                }
            }
            if self.nodes[&dialog].composed.closing_approved
                && matches!(
                    input,
                    Input::Down { .. } | Input::Up { .. } | Input::Invoke { .. }
                )
            {
                return Ok(true);
            }
            if let Input::Down { x, y, .. } | Input::Move { x, y, .. } = input {
                let panel = self.nodes[&dialog].composed.parts["DialogBorder"];
                if !self.inside(panel, *x, *y) {
                    return Ok(true);
                }
            }
        }
        Ok(false)
    }
    fn submit_combo(&mut self, id: u32) {
        let text = self.nodes[&id].props.text.clone();
        if self.nodes[&id].props.is_editable {
            self.request_composed(
                id,
                EventKind::TextSubmitted,
                ContentDialogResult::None,
                TeachingTipCloseReason::Programmatic,
            );
            self.events.last_mut().unwrap().payload = Some(json!({"text":text}));
            return;
        }
        self.finish_combo_commit(id);
    }
    fn finish_combo_commit(&mut self, id: u32) {
        let text = self.nodes[&id].props.text.clone();
        let found = self.nodes[&id]
            .props
            .collection_items
            .iter()
            .position(|i| i.enabled && i.text == text);
        if let Some(index) = found {
            self.choose_composed(id, index, true);
        } else if self.nodes[&id].props.selected_index >= 0 {
            let n = self.nodes.get_mut(&id).unwrap();
            n.props.selected_index = -1;
            n.composed.last_selected = -1;
            self.emit_composed(
                id,
                EventKind::SelectionChanged,
                json!({"selectedIndex":-1,"itemId":null}),
            );
        }
        self.nodes.get_mut(&id).unwrap().props.is_drop_down_open = false;
    }
}
fn parse_number(text: &str, p: &NodeProperties) -> Option<f64> {
    let mut text = text.trim().replace(&p.number_minus_sign, "-");
    if !p.number_group_separator.is_empty() {
        text = text.replace(&p.number_group_separator, "");
    }
    text = text.replace(&p.number_decimal_separator, ".");
    for (i, digit) in p.number_digits.iter().enumerate() {
        if digit != &i.to_string() {
            text = text.replace(digit, &i.to_string());
        }
    }
    if text
        .chars()
        .any(|c| !c.is_ascii_digit() && !"+-.".contains(c))
    {
        return None;
    }
    text.parse::<f64>().ok().filter(|v| v.is_finite())
}
fn format_number(v: Option<f64>, p: &NodeProperties) -> String {
    let Some(v) = v else {
        return String::new();
    };
    // NumberBox::UpdateTextToValue applies SignificantDigitsNumberRounder(10),
    // whose default RoundHalfUp resolves a negative tie toward positive infinity.
    let v = if v == 0. {
        0.
    } else {
        let exponent = 9 - v.abs().log10().floor() as i32;
        if exponent >= 0 {
            let scale = 10f64.powi(exponent.min(308));
            (v * scale + 0.5).floor() / scale
        } else {
            let scale = 10f64.powi(-exponent);
            (v / scale + 0.5).floor() * scale
        }
    };
    let v = p
        .number_rounding_increment
        .map(|step| (v / step + 0.5).floor() * step)
        .unwrap_or(v);
    if !v.is_finite() {
        return if v.is_sign_negative() {
            format!("{}∞", p.number_minus_sign)
        } else {
            "∞".into()
        };
    }
    let raw = v.abs().to_string();
    let (integer, fraction) = raw.split_once('.').unwrap_or((&raw, ""));
    let mut groups = Vec::new();
    let mut end = integer.len();
    let mut width = p.number_group_sizes[0] as usize;
    if p.number_use_grouping {
        while end > width {
            groups.push(&integer[end - width..end]);
            end -= width;
            width = p.number_group_sizes[1] as usize;
        }
    }
    groups.push(&integer[..end]);
    groups.reverse();
    let mut result = groups.join(&p.number_group_separator);
    let mut fraction = fraction.to_owned();
    while fraction.len() < p.number_min_fraction_digits as usize {
        fraction.push('0');
    }
    if !fraction.is_empty() {
        result.push_str(&p.number_decimal_separator);
        result.push_str(&fraction);
    }
    if v.is_sign_negative() && v != 0. {
        result = format!("{}{result}", p.number_minus_sign);
    }
    let mut localized = String::new();
    for c in result.chars() {
        if c.is_ascii_digit() {
            localized.push_str(&p.number_digits[(c as u8 - b'0') as usize]);
        } else {
            localized.push(c);
        }
    }
    localized
}

impl Scene {
    /// Positions the composed popup from the source template's named input part.
    pub(super) fn composed_popup_placement(
        &self,
        id: u32,
        size: [f64; 2],
    ) -> Option<(Rect, OverlayPlacement)> {
        let popup = &self.nodes[&id];
        let owner = popup.composed.owner?;
        let n = &self.nodes[&owner];
        let [w, h] = size;
        let snap = |v: f64| (v * self.dpr + 0.5 + 1e-9).floor() / self.dpr;
        if n.kind == NodeKind::ContentDialog {
            return Some((
                Rect::new(0., 0., self.width, self.height),
                OverlayPlacement::Bottom,
            ));
        }
        if matches!(
            n.kind,
            NodeKind::NumberBox | NodeKind::AutoSuggestBox | NodeKind::ComboBox
        ) {
            let input = &self.nodes[&n.composed.parts["InputRoot"]];
            let a = input
                .world
                .bounds(Rect::new(0., 0., input.rect.width, input.rect.height));
            let rect = match n.kind {
                NodeKind::NumberBox => Rect::new(snap(a.x + a.width - 21.), snap(a.y - 27.), w, h),
                NodeKind::AutoSuggestBox => {
                    let viewport=self.popup_viewport.unwrap_or(Rect::new(0.,0.,self.width,self.height));
                    let bottom=viewport.y+viewport.height;
                    let below = a.y + a.height - 2. / self.dpr;
                    let y = if below + h > bottom && a.y - viewport.y >= h {
                        a.y - h
                    } else {
                        below
                    };
                    Rect::new(a.x, y, w, h.min((bottom - y).max(0.)))
                }
                _ => {
                    let list = &self.nodes[&n.composed.parts["ItemsPresenter"]];
                    let cell = list.collection.geometry.cell[1].max(32.);
                    let anchor_index = n
                        .composed
                        .popup_anchor_index
                        .unwrap_or(n.props.selected_index);
                    let index = if anchor_index >= 0 {
                        anchor_index as f64
                    } else {
                        (n.props.collection_items.len() / 2) as f64
                    };
                    let y = if n.props.is_editable {
                        a.y + a.height - 1. / self.dpr
                    } else {
                        let style = &list.props.item_container_style;
                        let pixel = |v: f64| (v * self.dpr).round() / self.dpr;
                        let row_text_top =
                            overlays::border_thickness(popup.props.border_thickness, self.dpr)[1]
                                + popup.props.padding[1]
                                + pixel(style.margin.unwrap_or([0.; 4])[1])
                                + overlays::border_thickness(
                                    style.border_thickness.unwrap_or([0.; 4]),
                                    self.dpr,
                                )[1]
                                + style.padding.unwrap_or([0.; 4])[1];
                        let input_text_top =
                            self.nodes[&n.composed.parts["InputBox"]].editor.view.y;
                        a.y - (row_text_top - input_text_top)
                            - if n.props.collection_items.len() as f64 * cell <= h {
                                index * cell
                            } else {
                                (index * cell).min(h / 2.)
                            }
                    };
                    let viewport=self.popup_viewport.unwrap_or(Rect::new(0.,0.,self.width,self.height));
                    let height=h.min(viewport.height);
                    Rect::new(a.x.clamp(viewport.x,(viewport.x+viewport.width-w).max(viewport.x)),
                        snap(y).clamp(viewport.y,(viewport.y+viewport.height-height).max(viewport.y)),w,height)
                }
            };
            return Some((
                rect,
                if n.kind == NodeKind::NumberBox {
                    OverlayPlacement::Right
                } else {
                    OverlayPlacement::Bottom
                },
            ));
        }
        if n.kind != NodeKind::TeachingTip {
            return None;
        }
        use TeachingTipPlacementMode as P;
        let preferred = n.props.preferred_placement;
        let Some(target) = n.props.placement_target.and_then(|id| self.nodes.get(&id)) else {
            let x = match preferred {
                P::Left | P::TopLeft | P::BottomLeft | P::LeftTop | P::LeftBottom => {
                    32. + n.props.placement_margin[0]
                }
                P::Right | P::TopRight | P::BottomRight | P::RightTop | P::RightBottom => {
                    (self.width - w - 32. - n.props.placement_margin[2]).max(0.)
                }
                _ => ((self.width - w) / 2.).max(0.),
            };
            let y = match preferred {
                P::Top | P::TopLeft | P::TopRight | P::LeftTop | P::RightTop => {
                    32. + n.props.placement_margin[1]
                }
                P::Left | P::Right | P::Center => ((self.height - h) / 2.).max(0.),
                _ => (self.height - h - 32. - n.props.placement_margin[3]).max(0.),
            };
            return Some((Rect::new(x, y, w, h), OverlayPlacement::Top));
        };
        let a = target
            .world
            .bounds(Rect::new(0., 0., target.rect.width, target.rect.height));
        // A scrolled Scene can be only partly visible in its browser window.
        // Choose a fallback against the actual window, so an explicit
        // preferred side cannot leave the tip's buttons below the screen.
        let viewport = self.popup_viewport.unwrap_or(Rect::new(0., 0., self.width, self.height));
        let left = viewport.x;
        let top = viewport.y;
        let right = viewport.x + viewport.width;
        let bottom = viewport.y + viewport.height;
        let fits = |r: Rect| r.x >= left && r.y >= top && r.x + w <= right && r.y + h <= bottom;
        let cx = a.x + a.width / 2.;
        let cy = a.y + a.height / 2.;
        // The template reserves its 8 DIP tail columns even when TailVisibility is Collapsed.
        let tail = 8.;
        let edge = (10. * self.dpr).ceil() / self.dpr + (10. * self.dpr).ceil() / self.dpr;
        let candidate = |p| {
            let side = match p {
                P::Bottom | P::BottomLeft | P::BottomRight => OverlayPlacement::Bottom,
                P::Left | P::LeftTop | P::LeftBottom => OverlayPlacement::Left,
                P::Right | P::RightTop | P::RightBottom => OverlayPlacement::Right,
                _ => OverlayPlacement::Top,
            };
            let x = match p {
                P::TopLeft | P::BottomLeft => cx - w + edge,
                P::TopRight | P::BottomRight => cx - edge,
                P::Left | P::LeftTop | P::LeftBottom => {
                    a.x - w - tail - n.props.placement_margin[0]
                }
                P::Right | P::RightTop | P::RightBottom => {
                    a.x + a.width + tail + n.props.placement_margin[2]
                }
                _ => cx - w / 2.,
            };
            let y = match p {
                P::Top | P::TopLeft | P::TopRight | P::Auto => {
                    a.y - h - tail - n.props.placement_margin[1]
                }
                P::Bottom | P::BottomLeft | P::BottomRight => {
                    a.y + a.height + tail + n.props.placement_margin[3]
                }
                P::LeftTop | P::RightTop => cy - h + edge,
                P::LeftBottom | P::RightBottom => cy - edge,
                P::Center => cy - h - tail,
                _ => cy - h / 2.,
            };
            (Rect::new(snap(x), snap(y), w, h), side)
        };
        let requested = if preferred == P::Auto {
            P::Top
        } else {
            preferred
        };
        let (mut rect, mut side) = candidate(requested);
        if !fits(rect) {
            for p in [
                P::Top,
                P::Bottom,
                P::Left,
                P::Right,
                P::TopLeft,
                P::TopRight,
                P::BottomLeft,
                P::BottomRight,
                P::LeftTop,
                P::LeftBottom,
                P::RightTop,
                P::RightBottom,
            ] {
                let (r, s) = candidate(p);
                if fits(r) {
                    rect = r;
                    side = s;
                    break;
                }
            }
            rect.x = rect.x.clamp(left, (right - w).max(left));
            rect.y = rect.y.clamp(top, (bottom - h).max(top));
        }
        Some((rect, side))
    }
    pub(super) fn paint_combo_item(
        &self,
        id: u32,
        out: &mut Vec<crate::render::Draw>,
    ) -> Option<String> {
        let n = &self.nodes[&id];
        let list = self.nodes.get(&n.props.collection_owner?)?;
        let owner = self.nodes.get(&list.composed.owner?)?;
        if owner.kind != NodeKind::ComboBox {
            return None;
        }
        let selected = list.collection.selected.contains(&n.props.collection_key);
        let hover = self.pointer.is_some_and(|(x, y)| self.inside(id, x, y));
        let pressed = list.collection.pressed.as_ref() == Some(&n.props.collection_key);
        let suffix = if !n.enabled && selected {
            "SelectedDisabled"
        } else if !n.enabled {
            "Disabled"
        } else if selected && pressed {
            "SelectedPressed"
        } else if selected && hover {
            "SelectedPointerOver"
        } else if selected {
            if self
                .focused
                .is_some_and(|focus| self.descendant_of(focus, owner.id))
            {
                "Selected"
            } else {
                "SelectedUnfocused"
            }
        } else if pressed {
            "Pressed"
        } else if hover {
            "PointerOver"
        } else {
            ""
        };
        let brush = |part: &str| {
            let key = format!("ComboBoxItem{part}{suffix}");
            Resources::current()
                .resolve(n.theme, &key)
                .unwrap_or_else(|_| {
                    Resources::current()
                        .resolve(n.theme, &format!("ComboBoxItem{part}"))
                        .unwrap()
                })
        };
        let r = Rect::new(0., 0., n.rect.width, n.rect.height);
        use crate::render::Draw;
        out.push(Draw::Border {
            rect: r,
            thickness: overlays::border_thickness(n.props.border_thickness, self.dpr),
            radius: [4.; 4],
            color: brush("BorderBrush").solid_color(),
            background: Some(brush("Background").solid_color()),
        });
        if selected {
            let pill = Resources::current()
                .resolve(n.theme, "ComboBoxItemPillFillBrush")
                .or_else(|_| Resources::current().resolve(n.theme, "AccentFillColorDefaultBrush"))
                .unwrap();
            let border = overlays::border_thickness(n.props.border_thickness, self.dpr);
            let top = (((r.height - 16.) / 2.) * self.dpr + 0.5 + 1e-9).floor() / self.dpr;
            let scale = n.collection.indicator_scale.value(self.time);
            out.push(Draw::Save);
            out.push(Draw::Transform {
                matrix: [1., 0., 0., scale, 0., (top + 8.) * (1. - scale)],
            });
            out.push(Draw::Fill {
                rect: Rect::new(border[0], top, (3. * self.dpr).round() / self.dpr, 16.),
                radius: 1.5,
                color: pill.solid_color(),
            });
            out.push(Draw::Restore);
        }
        Some(brush("Foreground").solid_color())
    }
    pub(super) fn is_combo_item(&self, id: u32) -> bool {
        self.nodes[&id]
            .props
            .collection_owner
            .and_then(|list| self.nodes[&list].composed.owner)
            .is_some_and(|owner| self.nodes[&owner].kind == NodeKind::ComboBox)
    }
    pub(super) fn composed_corner_radii(&self, id: u32) -> Option<[f64; 4]> {
        let n = &self.nodes[&id];
        let owner = self.nodes.get(&n.composed.owner?)?;
        if !(owner.kind == NodeKind::AutoSuggestBox
            || owner.kind == NodeKind::ComboBox && owner.props.is_editable)
        {
            return None;
        }
        let popup = &self.nodes[&owner.composed.parts["Popup"]];
        if !popup.overlay.open {
            return None;
        }
        let r = n.props.corner_radius;
        let below = popup.overlay.actual == OverlayPlacement::Bottom;
        match n.composed.role {
            "Popup" => Some(if below {
                [0., 0., r, r]
            } else {
                [r, r, 0., 0.]
            }),
            "InputBox" => Some(if below {
                [r, r, 0., 0.]
            } else {
                [0., 0., r, r]
            }),
            _ => None,
        }
    }
    pub(super) fn popup_window_bounds(&self, id: u32) -> Rect {
        let n = &self.nodes[&id];
        let mut r = super::overlay_visual::window_bounds(n.kind, n.rect);
        if n.composed
            .owner
            .is_some_and(|id| self.nodes[&id].kind == NodeKind::TeachingTip)
        {
            r = Rect::new(r.x - 8., r.y - 8., r.width + 16., r.height + 16.);
        }
        r
    }
    pub(super) fn paint_composed_tail(&self, id: u32, out: &mut Vec<crate::render::Draw>) {
        let popup = &self.nodes[&id];
        let Some(owner) = popup.composed.owner else {
            return;
        };
        let n = &self.nodes[&owner];
        if n.kind != NodeKind::TeachingTip
            || n.props.tail_visibility == TeachingTipTailVisibility::Collapsed
        {
            return;
        }
        let Some(target) = n.props.placement_target.and_then(|id| self.nodes.get(&id)) else {
            return;
        };
        let a = target
            .world
            .bounds(Rect::new(0., 0., target.rect.width, target.rect.height));
        let r = popup.rect;
        let half = 10.;
        let edge = 1. / self.dpr;
        let cx = (a.x + a.width / 2. - r.x).clamp(half + 8., (r.width - half - 8.).max(half + 8.));
        let cy =
            (a.y + a.height / 2. - r.y).clamp(half + 8., (r.height - half - 8.).max(half + 8.));
        let points = match popup.overlay.actual {
            OverlayPlacement::Top => [
                [cx - half, r.height - 2.],
                [cx, r.height + 8.],
                [cx + half, r.height - 2.],
            ],
            OverlayPlacement::Bottom => [[cx - half, 2.], [cx, -8.], [cx + half, 2.]],
            OverlayPlacement::Left => [
                [r.width - 2., cy - half],
                [r.width + 8., cy],
                [r.width - 2., cy + half],
            ],
            _ => [[2., cy - half], [-8., cy], [2., cy + half]],
        };
        use crate::render::Draw;
        out.push(Draw::Save);
        out.push(Draw::Transform {
            matrix: Matrix([1., 0., 0., 1., r.x, r.y])
                .multiply(
                    popup
                        .presentation
                        .matrix(popup.props.transform, popup.props.center_point),
                )
                .multiply(popup.overlay.visual.matrix(
                    popup.kind,
                    popup.overlay.actual,
                    r.height,
                    self.time,
                ))
                .0,
        });
        let clip = match popup.overlay.actual {
            OverlayPlacement::Top => {
                Rect::new(cx - half - 1., r.height - edge, 2. * half + 2., 9. + edge)
            }
            OverlayPlacement::Bottom => Rect::new(cx - half - 1., -9., 2. * half + 2., 9. + edge),
            OverlayPlacement::Left => {
                Rect::new(r.width - edge, cy - half - 1., 9. + edge, 2. * half + 2.)
            }
            _ => Rect::new(-9., cy - half - 1., 9. + edge, 2. * half + 2.),
        };
        out.push(Draw::Clip { rect: clip });
        let geometry = crate::icons::parse_path(&format!(
            "M {} {} L {} {} L {} {} Z",
            points[0][0], points[0][1], points[1][0], points[1][1], points[2][0], points[2][1]
        ))
        .unwrap();
        let brush = Resources::current()
            .resolve(
                popup.theme,
                if n.props.is_light_dismiss_enabled {
                    "TeachingTipTransientBackground"
                } else {
                    "TeachingTipBackgroundBrush"
                },
            )
            .unwrap();
        if brush.kind == "acrylic" {
            // TailPolygon uses the same AcrylicBrush and transition as the body.
            // Its 20x10 right triangle is the exterior half of a rotated square.
            let center = match popup.overlay.actual {
                OverlayPlacement::Top => [cx, r.height - 2.],
                OverlayPlacement::Bottom => [cx, 2.],
                OverlayPlacement::Left => [r.width - 2., cy],
                _ => [2., cy],
            };
            let q = std::f64::consts::FRAC_1_SQRT_2;
            let side = half * std::f64::consts::SQRT_2;
            out.push(Draw::Save);
            out.push(Draw::Transform {
                matrix: [q, q, -q, q, center[0], center[1]],
            });
            out.push(Draw::Clip {
                rect: Rect::new(-side / 2., -side / 2., side, side),
            });
            out.push(Draw::Transform {
                matrix: [
                    q,
                    -q,
                    q,
                    q,
                    -q * (center[0] + center[1]),
                    q * (center[0] - center[1]),
                ],
            });
            out.push(Draw::Acrylic {
                rect: geometry.bounds,
                recipe: crate::material::AcrylicOptions {
                    tint_color: brush.tint.clone(),
                    tint_opacity: brush.tint_opacity,
                    luminosity_opacity: brush.luminosity_opacity,
                    fallback_color: brush.fallback.clone(),
                },
                colors: popup.material_colors.current(self.time),
                weight: popup.material_motion.value(self.time),
            });
            out.push(Draw::Restore);
            out.push(Draw::Restore);
        } else {
            out.push(Draw::VectorPath {
                rect: geometry.bounds,
                geometry,
                color: brush.solid_color(),
            });
        }
        out.push(Draw::Polyline {
            points: points.to_vec(),
            color: Resources::current()
                .resolve(popup.theme, "TeachingTipBorderBrush")
                .unwrap()
                .solid_color(),
            width: 1.,
        });
        out.push(Draw::Restore);
        out.push(Draw::Restore);
    }
}

impl Scene {
    /// Windowed choice popups own the scroll input scope, including at their
    /// extent boundary. Platform hosts project this decision across Scene roots.
    pub fn background_scroll_root(&self) -> Option<u32> {
        self.nodes.values().filter(|n| n.visible && n.enabled && (n.kind == NodeKind::ComboBox && n.props.is_drop_down_open || matches!(n.kind,NodeKind::CalendarDatePicker|NodeKind::DatePicker|NodeKind::TimePicker) && n.props.is_open))
            .filter_map(|n| n.composed.parts.get("Popup").copied().or_else(||n.picker.parts.get("Popup").copied()))
            .max_by_key(|id| self.nodes[id].overlay.order)
    }

    pub(super) fn composed_wheel(&mut self, x: f64, y: f64, dy: f64, ctrl: bool) -> bool {
        if let Some(dialog) = self
            .nodes
            .values()
            .find(|n| n.kind == NodeKind::ContentDialog && n.composed.modal_active)
        {
            if !self.inside(dialog.composed.parts["DialogBorder"], x, y) {
                return true;
            }
        }
        if ctrl {
            return false;
        }
        let owner = self
            .focused
            .and_then(|f| self.nodes.get(&f))
            .and_then(|n| n.composed.owner);
        if let Some(id) = owner {
            if self.nodes[&id].kind == NodeKind::NumberBox && self.inside(id, x, y) && dy != 0. {
                self.step_number(id, dy > 0., false);
                self.sync_composed();
                self.invalidate(id, true);
                return true;
            }
        }
        false
    }

    pub(super) fn combo_common_state(&self, id: u32) -> ControlState {
        let n = &self.nodes[&id];
        if !n.enabled { return ControlState::Disabled; }
        let drop = n.composed.parts["DropDownButton"];
        if self.captured.is_some_and(|(_, target)| self.descendant_of(target, id) && !(n.props.is_editable && target == drop)) {
            return ControlState::Pressed;
        }
        if self.pointer.is_some_and(|(x,y)| self.inside(n.composed.parts["InputRoot"],x,y) || n.props.is_drop_down_open && self.inside(n.composed.parts["Popup"],x,y)) {
            ControlState::PointerOver
        } else { ControlState::Normal }
    }
}

fn number_format_signature(p: &NodeProperties) -> Value {
    json!([
        p.number_decimal_separator,
        p.number_group_separator,
        p.number_minus_sign,
        p.number_digits,
        p.number_group_sizes,
        p.number_use_grouping,
        p.number_min_fraction_digits,
        p.number_rounding_increment
    ])
}
impl Scene {
    pub fn composed_content_slot(&self, id: u32, slot: &str) -> Result<u32, String> {
        let n = self.get(id)?;
        if n.kind==NodeKind::ItemsPresenter{return self.primitive_slot(id,slot)}
        if slot=="refreshVisualizer"&&n.kind==NodeKind::RefreshContainer{return n.refresh.visualizer.ok_or("RefreshVisualizer is not initialized".into());}
        let key = match slot {
            "content" => "Content",
            "heroContent" if n.kind == NodeKind::TeachingTip => "HeroContent",
            "itemsPresenter" if matches!(n.kind, NodeKind::AutoSuggestBox | NodeKind::ComboBox) => {
                "ItemsPresenter"
            }
            _ => return Err("Unsupported composed content slot".into()),
        };
        n.composed
            .parts
            .get(key)
            .copied()
            .ok_or_else(|| "This control has no such content slot".into())
    }
}

impl Scene {
    pub(super) fn composed_popup_arranged(
        &mut self,
        id: u32,
        measure: &mut impl crate::typography::TextMeasurer,
    ) {
        let Some(owner) = self.nodes[&id].composed.owner else {
            return;
        };
        if !matches!(
            self.nodes[&owner].kind,
            NodeKind::AutoSuggestBox | NodeKind::ComboBox
        ) || !self.nodes[&id].overlay.open
        {
            return;
        }
        if self.nodes[&owner].kind == NodeKind::ComboBox {
            let input = &self.nodes[&self.nodes[&owner].composed.parts["InputRoot"]];
            let a = input
                .world
                .bounds(Rect::new(0., 0., input.rect.width, input.rect.height));
            let r = self.nodes[&id].rect;
            self.nodes.get_mut(&id).unwrap().overlay.visual.scale_center =
                [0., a.y + a.height / 2. - r.y - r.height / 2.];
        }
        if let Some(index) = self
            .nodes
            .get_mut(&owner)
            .unwrap()
            .composed
            .reveal_selection
            .take()
        {
            let list = self.nodes[&owner].composed.parts["ItemsPresenter"];
            if self.collection_bring(list, index).is_ok() {
                let n = &self.nodes[&list];
                let b = overlays::border_thickness(n.props.border_thickness, self.dpr);
                let p = n.props.padding;
                let rect = Rect::new(
                    p[0] + b[0],
                    p[1] + b[1],
                    (n.rect.width - p[0] - p[2] - b[0] - b[2]).max(0.),
                    (n.rect.height - p[1] - p[3] - b[1] - b[3]).max(0.),
                );
                self.arrange_collection(list, rect, measure);
            }
        }
    }
}

pub(super) fn motion() -> &'static serde_json::Value {
    static VALUE: std::sync::OnceLock<serde_json::Value> = std::sync::OnceLock::new();
    &VALUE.get_or_init(|| {
        serde_json::from_str(include_str!(
            "../../references/composed-controls-resources.json"
        ))
        .unwrap()
    })["motion"]
}
