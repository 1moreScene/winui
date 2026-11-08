use super::*;
use crate::model::Input as NavInput;
#[derive(Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase", deny_unknown_fields)]
pub enum Input {
    Primitive{id:u32,action:String,#[serde(default)]value:f64},
    RichSelect{id:u32,start:usize,length:usize},
    RichPointerSelection{id:u32,x:f64,y:f64,#[serde(default)]paragraph:bool},
    ReadingDetail{id:u32,request:u32,content:String},
    ContentHost{id:u32,action:content_hosts::HostAction,#[serde(default)]page:Option<String>,#[serde(default)]parameter:u32,#[serde(default)]transition:NavigationTransition,#[serde(default)]request:Option<u32>,#[serde(default)]cancel:bool},
    Reading{id:u32,action:String,#[serde(default)]index:i32,#[serde(default)]offset:f64,#[serde(default)]request:Option<u32>,#[serde(default)]cancel:bool},
    ContextRequest { id: u32 },
    RepeaterScroll{id:u32,index:usize,#[serde(default)]focus:bool},
    Refresh{id:u32,action:refresh::RefreshAction,#[serde(default)]request:Option<u32>,#[serde(default)]ratio:f64,#[serde(default)]eligible:bool},
    ViewControl {id:u32, action:String, #[serde(default)]request:Option<u32>, #[serde(default)]cancel:bool, #[serde(default)]parameter:serde_json::Value},
    CollectionRestore {
        id: u32,
        key: String,
        offset: f64,
    },
    CollectionReorder {
        id: u32,
        keys: Vec<String>,
        index: usize,
    },
    CollectionDragStart {
        id: u32,
        index: usize,
    },
    CollectionDragOver {
        id: u32,
        source: Option<u32>,
        items: Vec<collections::CollectionData>,
        x: f64,
        y: f64,
        operation: DataPackageOperation,
    },
    CollectionDragResolve {
        id: u32,
        request: u32,
        cancel: bool,
        operation: DataPackageOperation,
    },
    CollectionDrop {
        id: u32,
    },
    CollectionDragEnd {
        id: u32,
        operation: DataPackageOperation,
    },
    CollectionDragLeave {
        id: u32,
    },
    CollectionRemove {
        id: u32,
        keys: Vec<String>,
    },
    CollectionContext {
        id: u32,
        index: usize,
        x: f64,
        y: f64,
    },
    Composed {
        id: u32,
        action: super::composed::ComposedAction,
        #[serde(default)]
        index: Option<usize>,
        #[serde(default)]
        request: Option<u32>,
        #[serde(default)]
        cancel: bool,
    },
    CollectionCommit {
        id: u32,
        request: u32,
    },
    CollectionScroll {
        id: u32,
        index: usize,
    },
    CollectionInvoke {
        id: u32,
        index: usize,
        #[serde(default)]
        ctrl: bool,
        #[serde(default)]
        shift: bool,
    },
    CollectionFocus {
        id: u32,
        index: usize,
    },
    Modifiers {
        ctrl: bool,
        shift: bool,
    },
    PointerDevice {
        touch: bool,
    },
    InfoBarClose {
        id: u32,
    },
    SplitInvoke {
        id: u32,
        secondary: bool,
    },
    CloseOverlay {
        id: u32,
    },
    ResolveOverlay {
        id: u32,
        request: u32,
        cancel: bool,
    },
    MenuInvoke {
        id: u32,
        index: usize,
    },
    Touch {
        pointer: i32,
        x: f64,
        y: f64,
        phase: String,
    },
    Move {
        x: f64,
        y: f64,
        pointer: i32,
    },
    Down {
        x: f64,
        y: f64,
        pointer: i32,
    },
    Up {
        x: f64,
        y: f64,
        pointer: i32,
    },
    Cancel {
        pointer: Option<i32>,
    },
    Leave,
    Focus {
        id: u32,
    },
    Blur,
    KeyDown {
        key: String,
        repeat: bool,
    },
    DismissCommandBars,
    CommandAccelerator { key:String, control:bool, shift:bool, alt:bool },
    KeyUp {
        key: String,
    },
    Invoke {
        id: u32,
    },
    Navigation {
        id: u32,
        input: serde_json::Value,
    },
    Edit {
        id: u32,
        text: String,
        start: usize,
        length: usize,
        #[serde(rename = "inputType")]
        input_type: String,
    },
    Select {
        id: u32,
        start: usize,
        length: usize,
        #[serde(default)]
        backward: bool,
    },
    EditComposition {
        id: u32,
        text: String,
        active: bool,
        start: usize,
        length: usize,
    },
    EditPointer {
        id: u32,
        x: f64,
        y: f64,
        extend: bool,
        word: bool,
    },
    EditCommand {
        id: u32,
        command: String,
    },
    Scroll {
        id: u32,
        x: Option<f64>,
        y: Option<f64>,
        zoom: Option<f64>,
        animated: bool,
    },
}
impl Scene {
    pub(in crate::scene) fn activate(&mut self, id: u32) -> Result<(), String> {
        if self.view_activate(id)? {return Ok(());}
        if self.invoke_menu_header(id)? {return Ok(());}
        if self.compact_activate(id)? {
            return Ok(());
        }
        let n = self.get(id)?;
        if n.kind == NodeKind::Expander {
            let open = !n.props.is_expanded;
            return self.update(vec![Update {
                id,
                patch: serde_json::json!({"isExpanded":open}),
            }]);
        }
        if n.kind == NodeKind::ToggleSwitch {
            let next = !n.props.is_on;
            self.update(vec![Update {
                id,
                patch: serde_json::json!({"isOn":next}),
            }])?;
            return Ok(());
        }
        if crate::selection::is_toggle(n.kind) {
            let checked = if n.kind == NodeKind::RadioButton {
                Some(true)
            } else {
                match n.props.is_checked {
                    None => Some(false),
                    Some(false) => Some(true),
                    Some(true) if n.props.is_three_state => None,
                    Some(true) => Some(false),
                }
            };
            self.update(vec![Update {
                id,
                patch: serde_json::json!({"isChecked":checked}),
            }])?;
        }
        self.emit(id, EventKind::Click);
        self.pump_command_events();
        self.pump_navigation_control_events();
        Ok(())
    }
    pub(super) fn inside(&self, id: u32, x: f64, y: f64) -> bool {
        let n = &self.nodes[&id];
        n.world.inverse().is_some_and(|m| {
            let (x, y) = m.point(x, y);
            Rect::new(0.,0.,n.rect.width,if id==self.root&&self.auto_height&&!n.props.clip{self.presentation_height()}else{n.rect.height}).contains(x,y)
        })
    }
    fn hit_node(&self, id: u32, x: f64, y: f64) -> Option<u32> {
        let n = &self.nodes[&id];
        if n.kind == NodeKind::MenuFlyout
            && n.overlay.visual.entrance.value(self.time) < 1. - 1e-9
            && !super::overlay_visual::window_bounds(n.kind, n.rect).contains(x, y)
        {
            return None;
        }
        if !n.visible || !n.enabled || ((n.props.clip || id == self.root) && !self.inside(id, x, y))
        {
            return None;
        }
        if n.kind==NodeKind::CommandBar {
            let (x,y)=n.world.inverse().unwrap_or_default().point(x,y);
            if !self.command_primary_clip(id).contains(x,y){return None;}
        }
        if let Some(clip) = n.viewbox.clip {
            let (lx, ly) = n.world.inverse().unwrap_or_default().point(x, y);
            if !clip.contains(lx, ly) {
                return None;
            }
        }
        if n.kind == NodeKind::Border && n.props.corner_radius > 0. {
            let (lx, ly) = n.world.inverse().unwrap_or_default().point(x, y);
            let r = n
                .props
                .corner_radius
                .min(n.rect.width / 2.)
                .min(n.rect.height / 2.);
            let cx = lx.clamp(r, n.rect.width - r);
            let cy = ly.clamp(r, n.rect.height - r);
            if lx < 0.
                || ly < 0.
                || lx > n.rect.width
                || ly > n.rect.height
                || (lx - cx).powi(2) + (ly - cy).powi(2) > r * r
            {
                return None;
            }
        }
        if matches!(n.kind,NodeKind::ScrollViewer|NodeKind::ScrollView|NodeKind::ScrollContentPresenter) && n.scroll.host.is_some() {
            let (lx, ly) = n.world.inverse().unwrap_or_default().point(x, y);
            if !n
                .scroll
                .visible_regions()
                .iter()
                .any(|r| r.contains(lx, ly))
            {
                return None;
            }
        }
        if super::collections::is_scroll_owner(n.kind) && self.inside(id, x, y) {
            let (lx, ly) = n.world.inverse().unwrap_or_default().point(x, y);
            if (lx >= n.rect.width - 14. && n.scroll.thumb(&n.props, true, self.time).is_some())
                || (ly >= n.rect.height - 14.
                    && n.scroll.thumb(&n.props, false, self.time).is_some())
            {
                return Some(id);
            }
        }
        let ordered = self.ordered_children(id);
        for child in ordered.iter().rev() {
            if !self.content_child_enabled(id,*child){continue;}
            if n.kind==NodeKind::SplitView&&view_controls::props(&self.nodes[child]).slot==ViewControlSlot::Pane {let(lx,ly)=n.world.inverse().unwrap_or_default().point(x,y);if !n.view_control.pane.contains(lx,ly){continue;}}

            if super::collections::is_view(n.kind)
                && self.nodes[child].kind == NodeKind::CollectionItem
            {
                if let Some(clip) = self.collection_sticky_clip(id) {
                    let (lx, ly) = n
                        .world
                        .multiply(n.scroll.matrix(self.time))
                        .inverse()
                        .unwrap_or_default()
                        .point(x, y);
                    if !clip.contains(lx, ly) {
                        continue;
                    }
                }
            }
            if n.kind == NodeKind::Expander {
                let (lx, ly) = n.world.inverse().unwrap_or_default().point(x, y);
                if !n
                    .expander
                    .snapshot(self.time, &n.props)
                    .clip
                    .contains(lx, ly)
                {
                    continue;
                }
            }
            if let Some(hit) = self.hit_node(*child, x, y) {
                return Some(hit);
            }
        }
        if matches!(n.kind,NodeKind::ScrollViewer|NodeKind::ScrollView|NodeKind::ScrollContentPresenter) && n.scroll.host.is_some() {
            return None;
        }
        if n.kind == NodeKind::Expander {
            let (lx, ly) = n.world.inverse().unwrap_or_default().point(x, y);
            return n
                .expander
                .snapshot(self.time, &n.props)
                .header
                .contains(lx, ly)
                .then_some(id);
        }
        if matches!(
            n.kind,
            NodeKind::Thumb|NodeKind::ScrollBar|NodeKind::AnnotatedScrollBar | NodeKind::RichTextBlock|NodeKind::RichTextBlockOverflow | NodeKind::ItemsView | NodeKind::MenuBarItem | NodeKind::SelectorBar |
            NodeKind::MenuFlyout
                | NodeKind::FlipView
                | NodeKind::PipsPager
                | NodeKind::BreadcrumbBar
                | NodeKind::TreeView
                | NodeKind::TabView
                | NodeKind::ListView
                | NodeKind::GridView
                | NodeKind::CollectionItem
                | NodeKind::RatingControl
                | NodeKind::SplitButton
                | NodeKind::ToggleSplitButton
                | NodeKind::Slider
                | NodeKind::Button | NodeKind::AppBarButton | NodeKind::AppBarToggleButton | NodeKind::DropDownButton
                | NodeKind::RepeatButton
                | NodeKind::HyperlinkButton
                | NodeKind::Expander
                | NodeKind::ToggleButton
                | NodeKind::CheckBox
                | NodeKind::RadioButton
                | NodeKind::ToggleSwitch
                | NodeKind::NavigationView

                | NodeKind::ScrollViewer | NodeKind::ScrollView | NodeKind::ScrollContentPresenter
                | NodeKind::TextBox
                | NodeKind::PasswordBox
        ) && self.inside(id, x, y)
        {
            Some(id)
        } else {
            None
        }
    }
    pub fn hit(&self, x: f64, y: f64) -> Option<u32> {
        for id in self.overlay_ids().into_iter().rev() {
            if self.nodes[&id].kind != NodeKind::ToolTip && self.nodes[&id].overlay.open {
                if let Some(hit) = self.hit_node(id, x, y) {
                    return Some(hit);
                }
            }
        }
        self.hit_node(self.root, x, y)
    }
    fn navigation_input(&mut self, id: u32, input: NavInput) -> Result<(), String> {
        let nav = self
            .nodes
            .get_mut(&id)
            .and_then(|n| n.nav.as_mut())
            .ok_or("node is not a NavigationView")?;
        nav.input(input, self.time)?;
        Ok(())
    }
    fn pointer_ancestors_contain(&self,id:u32,x:f64,y:f64)->bool {let mut at=self.nodes[&id].parent;while let Some(id)=at{let n=&self.nodes[&id];if !n.visible||((n.props.clip||collections::is_scroll_owner(n.kind))&&!self.inside(id,x,y)){return false;}at=n.parent;}true}
    fn pointer(&mut self, x: f64, y: f64) {
        self.pointer = Some((x, y));
        let hit = self.hit(x, y);
        self.scroll_hover(x, y);
        let ids: Vec<_> = self
            .nodes
            .values()
            .filter(|n| {
                n.kind == NodeKind::Slider
                    || crate::selection::is_button(n.kind)
                    || text_edit::is_editor(n.kind) || n.props.pointer_notifications
            })
            .map(|n| n.id)
            .collect();
        for id in ids {
            let observed=&self.nodes[&id];let inside=if crate::selection::is_button(observed.kind)||text_edit::is_editor(observed.kind)||observed.kind==NodeKind::Slider {hit==Some(id)}else{observed.visible&&observed.enabled&&self.inside(id,x,y)&&self.pointer_ancestors_contain(id,x,y)};
            let n = self.nodes.get_mut(&id).unwrap();
            let entering = inside && !n.button.pointer_inside;
            let pointer_event =
                if n.props.pointer_notifications && inside != n.button.pointer_inside {
                    Some(if inside {
                        EventKind::PointerEntered
                    } else {
                        EventKind::PointerExited
                    })
                } else {
                    None
                };
            n.button.pointer_inside = inside;
            if n.kind == NodeKind::Slider && entering {
                n.slider.tooltip_dismissed = false;
            }
            if n.kind != NodeKind::RepeatButton
                && n.button.captured.is_some()
                && n.button.key.is_none()
            {
                n.button.pressed = inside;
            }
            let activate = entering && n.enabled && crate::selection::is_button(n.kind)&&n.props.click_mode == ClickMode::Hover;
            if let Some(event) = pointer_event {
                self.emit(id, event);
            }
            if activate {
                self.activate(id).expect("validated toggle state");
            }
        }
        self.sync_repeats();
    }
    pub(super) fn focus(&mut self, id: Option<u32>) {
        if self.focused == id {
            return;
        }
        if let Some(old) = self.focused.take() {
            if let Some(n) = self.nodes.get_mut(&old) {
                n.button.cancel();
                n.selection_visual.cancel_drag();
                n.editor.peek = false;
                n.scroll.drag = None;
                n.scroll.repeat = None;
                n.scroll.pan = None;
                n.scroll.pinch = None;
                n.scroll.touches.clear();
                if n.nav.is_some() {
                    let _ = self.navigation_input(old, NavInput::Blur);
                }
            }
            if self.captured.is_some_and(|v| v.1 == old) {
                self.captured = None;
            }
            if self
                .nodes
                .get(&old)
                .is_some_and(|n| text_edit::is_editor(n.kind))
            {
                self.invalidate(old, true);
            }
            self.emit(old, EventKind::LostFocus);
        }
        self.focused = id;
        if let Some(id) = id {
            self.nodes.get_mut(&id).unwrap().editor.blink_start = self.time;
            if self.dirty {
                self.pending_bring_into_view = Some(id);
            } else {
                self.bring_into_view(id);
            }
            if text_edit::is_editor(self.nodes[&id].kind) {
                self.invalidate(id, true);
            }
            self.emit(id, EventKind::GotFocus);
            self.repeater_focus_changed(id);
        }
    }
    pub fn input(&mut self, input: Input, time: f64) -> Result<(), String> {
        if let Input::PointerDevice { touch } = input {
            self.menu_pointer_touch = touch;
            return Ok(());
        }
        match &input {
            Input::Touch { .. } => self.menu_input_narrow = false,
            Input::Move { .. } | Input::Down { .. } => {
                self.menu_input_narrow = !self.menu_pointer_touch
            }
            Input::KeyDown { .. } => self.menu_input_narrow = true,
            _ => {}
        }
        self.advance(time);
        if let Input::KeyDown{key,..}=&input {
            if key=="ContextMenu" {
                if let Some(id)=self.focused.filter(|id|self.nodes[id].kind==NodeKind::Button && self.effective_enabled(*id)) {self.emit(id,EventKind::ContextRequested);return Ok(());}
            }
        }
        if let Input::ContextRequest { id } = input {
            if self.nodes.get(&id).is_some_and(|n| n.visible) && self.effective_enabled(id) {
                self.emit(id, EventKind::ContextRequested);
            }
            return Ok(());
        }
        if self.primitive_input(&input)?{return Ok(());}
        if self.content_host_input(&input)?{self.invalidate(self.root,true);return Ok(());}
        if self.reading_input(&input)?{self.invalidate(self.root,true);return Ok(());}
        if self.repeater_input(&input)?{self.invalidate(self.root,true);return Ok(());}
        if self.refresh_input(&input)?{self.invalidate(self.root,true);return Ok(());}
        if self.view_input(&input)? {self.invalidate(self.root,true);return Ok(());}
        self.pump_composed_events();
        if self.picker_input(&input)?{self.invalidate(self.root,true);return Ok(());}
        if self.menu_entry_input(&input)?{self.invalidate(self.root,true);return Ok(());}
        if self.command_menu_input(&input)?{self.invalidate(self.root,true);return Ok(());}
        self.pump_command_events();
        if self.command_input(&input)? {self.invalidate(self.root,true);return Ok(());}

        self.pump_navigation_control_events();
        if self.navigation_control_input(&input)? {
            return Ok(());
        }
        self.pump_composed_events();
        if self.composed_input(&input)? {
            self.invalidate(self.root, true);
            return Ok(());
        }
        self.refresh_visual_tree(self.root, Matrix::default(), self.theme, true, true);
        self.sync_collections();
        if self.collection_input(&input)? {
            self.invalidate(self.root, false);
            return Ok(());
        }
        if self.compact_input(&input)? {
            self.invalidate(self.root, false);
            return Ok(());
        }
        if self.floating_input(&input)? {
            self.sync_sliders();
            self.sync_overlays();
            self.invalidate(self.root, false);
            return Ok(());
        }
        match input {
            Input::Primitive{..}|Input::ContentHost{..}|Input::RichSelect{..}|Input::RichPointerSelection{..}|Input::ReadingDetail{..}|Input::Reading{..}|Input::ViewControl{..}=>{},
            Input::RepeaterScroll{..}|Input::Refresh{..}=>unreachable!(),
            Input::CommandAccelerator {..} | Input::DismissCommandBars => {},
            Input::CollectionRestore { .. }
            | Input::CollectionReorder { .. }
            | Input::CollectionDragStart { .. }
            | Input::CollectionDragOver { .. }
            | Input::CollectionDragResolve { .. }
            | Input::CollectionDrop { .. }
            | Input::CollectionDragEnd { .. }
            | Input::CollectionDragLeave { .. }
            | Input::CollectionRemove { .. }
            | Input::CollectionContext { .. } => unreachable!(),
            Input::PointerDevice { .. }
            | Input::Composed { .. }
            | Input::ContextRequest { .. } | Input::CollectionCommit { .. }
            | Input::CollectionScroll { .. }
            | Input::CollectionInvoke { .. }
            | Input::CollectionFocus { .. }
            | Input::Modifiers { .. }
            | Input::InfoBarClose { .. }
            | Input::SplitInvoke { .. }
            | Input::CloseOverlay { .. }
            | Input::ResolveOverlay { .. }
            | Input::MenuInvoke { .. } => unreachable!(),
            Input::Touch {
                pointer,
                x,
                y,
                phase,
            } => self.scroll_touch(pointer, x, y, &phase)?,
            Input::Move { x, y, pointer } => {
                if !x.is_finite() || !y.is_finite() {
                    return Err("invalid pointer position".into());
                }
                if self.captured.is_none_or(|v| v.0 == pointer) {
                    self.pointer(x, y);
                    self.update_switch_drag(x, y);
                    if let Some((_, id)) = self.captured {
                        if super::collections::is_scroll_owner(self.nodes[&id].kind) {
                            self.scroll_pointer_move(id, x, y)?;
                        }
                    }
                    let target = self.captured.map(|v| v.1).or_else(|| self.hit(x, y));
                    if let Some(id) = target {
                        if self.nodes[&id].kind == NodeKind::NavigationView {
                            let (x, y) = self.nodes[&id]
                                .world
                                .inverse()
                                .map(|m| m.point(x, y))
                                .unwrap_or((-1e10, -1e10));
                            self.navigation_input(id, NavInput::Move { x, y })?;
                        }
                    }
                }
            }
            Input::Down { x, y, pointer } => {
                if self.captured.is_some() {
                    return Ok(());
                }
                self.pointer(x, y);
                if let Some(id) = self.hit(x, y) {
                    let n = &self.nodes[&id];
                    if crate::selection::is_button(n.kind) && n.props.click_mode == ClickMode::Hover
                    {
                        return Ok(());
                    }
                    // NumberBox spin/query/drop-down parts delegate focus to
                    // their template's input; pressing chrome must not blur it.
                    let focus_target = self.nodes[&id]
                        .composed
                        .owner
                        .and_then(|owner| {
                            self.nodes[&owner].composed.parts.get("InputBox").copied()
                        })
                        .filter(|_| {
                            matches!(
                                self.nodes[&id].kind,
                                NodeKind::Button | NodeKind::RepeatButton
                            )
                        })
                        .unwrap_or(id);
                    self.focus(Some(focus_target));
                    self.captured = Some((pointer, id));
                    let n = self.nodes.get_mut(&id).unwrap();
                    match n.kind {
                        NodeKind::Button | NodeKind::AppBarButton | NodeKind::AppBarToggleButton | NodeKind::DropDownButton
                        | NodeKind::SplitButton
                        | NodeKind::ToggleSplitButton
                        | NodeKind::RepeatButton
                        | NodeKind::HyperlinkButton
                        | NodeKind::Expander
                        | NodeKind::ToggleButton
                        | NodeKind::CheckBox
                        | NodeKind::RadioButton
                        | NodeKind::ToggleSwitch => {
                            n.button.captured = Some(pointer);
                            n.button.pressed = true;
                            if n.kind == NodeKind::ToggleSwitch {
                                let local =
                                    n.world.inverse().map(|m| m.point(x, y).0).unwrap_or(0.);
                                n.selection_visual.drag = Some((
                                    local,
                                    if n.props.is_on { 20. } else { 0. },
                                    n.props.is_on,
                                ));
                            }
                            if n.props.click_mode == ClickMode::Press {
                                self.activate(id)?;
                            }
                        }
                        NodeKind::ScrollViewer | NodeKind::ScrollView | NodeKind::ScrollContentPresenter => {
                            self.scroll_pointer_down(id, x, y)?;
                        }
                        NodeKind::NavigationView => {
                            let (x, y) = n
                                .world
                                .inverse()
                                .map(|m| m.point(x, y))
                                .unwrap_or((-1e10, -1e10));
                            self.navigation_input(id, NavInput::Down { x, y })?;
                        }
                        _ => {
                            self.captured = None;
                        }
                    }
                }
            }
            Input::Up { x, y, pointer } => {
                if let Some((p, id)) = self.captured {
                    if pointer == p {
                        self.pointer(x, y);
                        let inside = self.hit(x, y) == Some(id);
                        let n = self.nodes.get_mut(&id).unwrap();
                        if crate::selection::is_button(n.kind) {
                            let click = inside
                                && n.button.pressed
                                && n.button.key.is_none()
                                && n.props.click_mode == ClickMode::Release
                                && n.enabled;
                            n.button.captured = None;
                            n.button.pressed = n.button.key.is_some();
                            let drag = if n.kind == NodeKind::ToggleSwitch {
                                n.selection_visual.drag = None;
                                n.selection_visual.drag_offset.take()
                            } else {
                                None
                            };
                            if let Some(offset) = drag {
                                n.selection_visual.position.snap(offset);
                                self.update(vec![Update {
                                    id,
                                    patch: serde_json::json!({"isOn":offset>=10.}),
                                }])?;
                            } else if click {
                                self.activate(id)?;
                            }
                        } else if super::collections::is_scroll_owner(n.kind) {
                            n.scroll.drag = None;
                            n.scroll.repeat = None;
                            self.emit(id, EventKind::ViewChanged);
                        } else if n.nav.is_some() {
                            let (x, y) = n
                                .world
                                .inverse()
                                .map(|m| m.point(x, y))
                                .unwrap_or((-1e10, -1e10));
                            self.navigation_input(id, NavInput::Up { x, y })?;
                        }
                        self.captured = None;
                    }
                }
            }
            Input::Cancel { pointer } => {
                if self
                    .captured
                    .is_some_and(|v| pointer.is_none_or(|p| p == v.0))
                {
                    let (_, id) = self.captured.take().unwrap();
                    let n = self.nodes.get_mut(&id).unwrap();
                    n.button.cancel();
                    if n.kind == NodeKind::Slider {
                        n.slider.tooltip_dismissed = true;
                    }
                    n.selection_visual.cancel_drag();
                    n.scroll.drag = None;
                    n.scroll.repeat = None;
                    n.scroll.pan = None;
                    n.scroll.touches.clear();
                    n.editor.peek = false;
                    if n.nav.is_some() {
                        self.navigation_input(id, NavInput::Cancel)?;
                    }
                }
            }
            Input::Leave => {
                self.pointer = None;
                let exits: Vec<_> = self
                    .nodes
                    .values()
                    .filter(|n| n.props.pointer_notifications && n.button.pointer_inside)
                    .map(|n| n.id)
                    .collect();
                for id in exits {
                    self.emit(id, EventKind::PointerExited);
                }
                for n in self.nodes.values_mut() {
                    n.button.pointer_inside = false;
                    n.scroll.hover = false;
                    n.scroll.bar_hover = false;
                    if n.kind != NodeKind::RepeatButton && n.button.captured.is_some() {
                        n.button.pressed = false;
                    }
                    if let Some(nav) = &mut n.nav {
                        nav.input(NavInput::Leave, self.time)?;
                    }
                }
            }
            Input::Focus { id } => {
                if self.focus_menu_item(id){return Ok(());}
                let n = self.get(id)?;
                if self.effective_enabled(id)
                    && matches!(
                        n.kind,
                        NodeKind::RichTextBlock|NodeKind::RichTextBlockOverflow|NodeKind::ItemsView|NodeKind::Slider
                            | NodeKind::ListView
                            | NodeKind::GridView
                            | NodeKind::RatingControl
                            | NodeKind::SplitButton
                            | NodeKind::ToggleSplitButton
                            | NodeKind::MenuFlyout
                            | NodeKind::MenuBarItem | NodeKind::Button | NodeKind::AppBarButton | NodeKind::AppBarToggleButton | NodeKind::DropDownButton
                            | NodeKind::RepeatButton
                            | NodeKind::HyperlinkButton
                            | NodeKind::Expander
                            | NodeKind::ToggleButton
                            | NodeKind::CheckBox
                            | NodeKind::RadioButton
                            | NodeKind::ToggleSwitch
                            | NodeKind::NavigationView

                            | NodeKind::ScrollViewer | NodeKind::ScrollView | NodeKind::ScrollContentPresenter
                            | NodeKind::TextBox
                            | NodeKind::PasswordBox
                    )
                {
                    self.focus(Some(id));
                }
            }
            Input::Blur => self.focus(None),
            Input::KeyDown { key, repeat } => {
                if let Some(id) = self.focused {
                    if !self.effective_enabled(id) {
                        return Ok(());
                    }
                    if self.nodes[&id].kind == NodeKind::RadioButton
                        && matches!(
                            key.as_str(),
                            "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight"
                        )
                    {
                        return self.radio_arrow(id, &key);
                    }
                    if super::collections::is_scroll_owner(self.nodes[&id].kind) {
                        let n = &self.nodes[&id];
                        let o = n.scroll.offsets(self.time);
                        let h = n.scroll.viewport[1];
                        let x = match key.as_str() {
                            "ArrowLeft" => o[0] - 16.,
                            "ArrowRight" => o[0] + 16.,
                            _ => o[0],
                        };
                        let y = match key.as_str() {
                            "ArrowUp" => o[1] - 16.,
                            "ArrowDown" => o[1] + 16.,
                            "PageUp" => o[1] - h,
                            "PageDown" | " " => o[1] + h,
                            "Home" => 0.,
                            "End" => n.scroll.max(self.time)[1],
                            _ => o[1],
                        };
                        self.scroll_change(id, Some(x.max(0.)), Some(y.max(0.)), None, true)?;
                        return Ok(());
                    }
                    let n = self.nodes.get_mut(&id).unwrap();
                    if n.nav.is_some() {
                        self.navigation_input(id, NavInput::Key { key })?;
                    } else if crate::selection::is_button(n.kind)
                        && n.props.click_mode != ClickMode::Hover
                    {
                        if n.kind == NodeKind::CheckBox
                            && !n.props.is_three_state
                            && matches!(key.as_str(), "Add" | "Subtract")
                        {
                            n.button.cancel();
                            self.update(vec![Update {
                                id,
                                patch: serde_json::json!({"isChecked":key=="Add"}),
                            }])?;
                        } else if key == " "
                            || (key == "Enter"
                                && !matches!(
                                    n.kind,
                                    NodeKind::CheckBox
                                        | NodeKind::RadioButton
                                        | NodeKind::ToggleSwitch
                                ))
                        {
                            if !repeat && n.button.key.is_none() && n.button.captured.is_none() {
                                n.button.key = Some(key);
                                n.button.pressed = true;
                                if n.props.click_mode == ClickMode::Press {
                                    self.activate(id)?;
                                }
                            }
                        } else {
                            n.button.key = None;
                            n.button.pressed = false;
                        }
                    }
                }
            }
            Input::KeyUp { key } => {
                if let Some(id) = self.focused {
                    if !self.effective_enabled(id) {
                        return Ok(());
                    }
                    let n = self.nodes.get_mut(&id).unwrap();
                    if crate::selection::is_button(n.kind) && n.button.key.as_deref() == Some(&key)
                    {
                        let click = n.button.pressed
                            && n.button.captured.is_none()
                            && n.props.click_mode == ClickMode::Release;
                        n.button.key = None;
                        n.button.pressed = n.button.captured.is_some() && n.button.pointer_inside;
                        if click {
                            self.activate(id)?;
                        }
                    }
                }
            }
            Input::Invoke { id } => {
                if !crate::selection::is_button(self.get(id)?.kind) {
                    return Err("invoke requires an action control".into());
                }
                if self.effective_enabled(id) {
                    self.activate(id)?;
                }
            }
            Input::Navigation { id, input } => {
                if self.effective_enabled(id) {
                    self.navigation_input(
                        id,
                        serde_json::from_value(input).map_err(|e| e.to_string())?,
                    )?;
                }
            }
            Input::Edit {
                id,
                text,
                start,
                length,
                input_type,
            } => self.editor_commit(id, text, start, length, input_type)?,
            Input::Select {
                id,
                start,
                length,
                backward,
            } => {
                self.editor_select(id, start, length)?;
                self.nodes.get_mut(&id).unwrap().editor.backward = backward;
            }
            Input::EditPointer {
                id,
                x,
                y,
                extend,
                word,
            } => self.editor_pointer(id, x, y, extend, word)?,
            Input::EditComposition {
                id,
                text,
                active,
                start,
                length,
            } => {
                if !text_edit::is_editor(self.get(id)?.kind) || text.len() > 1_000_000 {
                    return Err("invalid composition".into());
                }
                if self.effective_enabled(id) && !self.nodes[&id].props.is_read_only {
                    if active {
                        let start = text_edit::boundary(&text, start.min(text_edit::units(&text)));
                        let end = text_edit::boundary(
                            &text,
                            start.saturating_add(length).min(text_edit::units(&text)),
                        );
                        let length = end - start;
                        self.nodes.get_mut(&id).unwrap().editor.draft = Some(text);
                        let e = &mut self.nodes.get_mut(&id).unwrap().editor;
                        e.draft_selection = (start, length);
                        self.invalidate(id, true);
                    } else {
                        self.editor_commit(
                            id,
                            text,
                            start,
                            length,
                            "insertCompositionText".into(),
                        )?;
                    }
                }
            }
            Input::EditCommand { id, command } => match command.as_str() {
                "helperEnter" | "helperLeave" | "helperDown" | "helperUp" => {
                    let n = self.nodes.get_mut(&id).ok_or("invalid editor handle")?;
                    if !text_edit::is_editor(n.kind) {
                        return Err("helper requires editor".into());
                    }
                    n.editor.helper_hover = command != "helperLeave";
                    n.editor.helper_pressed = command == "helperDown";
                    self.invalidate(id, false);
                }
                "undo" => self.editor_history(id, false)?,
                "redo" => self.editor_history(id, true)?,
                "selectAll" => {
                    let n = self.get(id)?;
                    self.editor_select(
                        id,
                        0,
                        text_edit::units(text_edit::EditorState::logical(n.kind, &n.props)),
                    )?;
                }
                "clear" => self.editor_commit(id, String::new(), 0, 0, "deleteContent".into())?,
                "revealStart" | "revealEnd" => {
                    let n = self.get(id)?;
                    if n.kind != NodeKind::PasswordBox {
                        return Err("reveal requires PasswordBox".into());
                    }
                    let allowed = self.effective_enabled(id) && self.focused == Some(id);
                    let n = self.nodes.get_mut(&id).unwrap();
                    n.editor.peek = allowed
                        && command == "revealStart"
                        && n.props.password_reveal_mode == PasswordRevealMode::Peek
                        && n.editor.user_edited;
                    self.invalidate(id, true);
                }
                _ => return Err("unknown editor command".into()),
            },
            Input::Scroll {
                id,
                x,
                y,
                zoom,
                animated,
            } => self.scroll_change(id, x, y, zoom, animated)?,

        }
        self.pump_navigation_control_events();
        self.pump_composed_events();
        self.revision += 1;
        self.sync_accept_visuals();
        self.sync_repeats();
        self.sync_sliders();
        self.tooltip_tick();
        Ok(())
    }
}
