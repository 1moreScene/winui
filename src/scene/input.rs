use super::*;
use crate::model::Input as NavInput;
/// Host projection of Rust control semantics. Labels and headers are not editors.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PointerPresentation {
    pub cursor: &'static str,
    pub text_selection: &'static str,
    pub editor_cursor: &'static str,
    pub editor_text_selection: &'static str,
}
#[derive(Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase", deny_unknown_fields)]
pub enum Input {
    Table{id:u32,action:String,#[serde(default)]data:serde_json::Value,#[serde(default)]request:Option<u32>,#[serde(default)]cancel:bool},
    Primitive{id:u32,action:String,#[serde(default)]value:f64},
    RichEdit{id:u32,command:rich_edit::RichEditCommand},
    RichSelect{id:u32,start:usize,length:usize},
    RichPointerSelection{id:u32,x:f64,y:f64,#[serde(default)]paragraph:bool},
    ReadingDetail{id:u32,request:u32,content:String},
    ContentHost{id:u32,action:content_hosts::HostAction,#[serde(default)]page:Option<String>,#[serde(default)]parameter:u32,#[serde(default)]transition:NavigationTransition,#[serde(default)]request:Option<u32>,#[serde(default)]cancel:bool},
    Reading{id:u32,action:String,#[serde(default)]index:i32,#[serde(default)]offset:f64,#[serde(default)]request:Option<u32>,#[serde(default)]cancel:bool},
    ContextRequest { id: u32 },
    ContextRequestAt { x:f64,y:f64 },
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
    pub(super) fn pointer_presentation(&self, id: u32) -> PointerPresentation {
        let n = &self.nodes[&id];
        // A noneditable ComboBox projects its selection through InputBox for
        // accessibility and focus. That template part is not a text editor.
        let selection_box = n.composed.owner.and_then(|owner| self.nodes.get(&owner))
            .is_some_and(|owner| owner.kind == NodeKind::ComboBox
                && !owner.props.is_editable
                && owner.composed.parts.get("InputBox") == Some(&id));
        let text_input = n.enabled && !selection_box;
        let mut result = PointerPresentation {
            cursor: "default",
            text_selection: "none",
            editor_cursor: if text_input { "text" } else { "default" },
            editor_text_selection: if text_input { "text" } else { "none" },
        };
        if n.enabled {
            if let Some(cursor)=self.table_pointer_cursor(id){result.cursor=cursor;}
            else if n.kind == NodeKind::HyperlinkButton {
                result.cursor = "pointer";
            } else if let Some((cursor, selection)) = self.rich_pointer_presentation(id) {
                result.cursor = cursor;
                result.text_selection = selection;
            }
        }
        result
    }
    pub(in crate::scene) fn activate(&mut self, id: u32) -> Result<(), String> {
        if self.nodes[&id].kind==NodeKind::SegmentedItem {return self.activate_segmented(id);}
        if let (Some(owner),Some(action))=(self.nodes[&id].navigation_template.owner,self.nodes[&id].navigation_template.action.clone()){
            self.navigation_input(owner,NavInput::Invoke{id:action})?;return Ok(());
        }
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
        if self.nodes[&id].kind==NodeKind::NavigationViewItem{self.emit(id,EventKind::ItemInvoked);}
        self.pump_command_events();
        self.pump_navigation_control_events();
        if self.nodes.get(&id).is_some_and(|node|node.props.close_flyout) {self.close_owner_flyout(id)?;}
        Ok(())
    }
    pub(super) fn close_owner_flyout(&mut self,id:u32)->Result<(),String>{
        let mut at=self.nodes.get(&id).and_then(|node|node.parent);
        while let Some(owner)=at {
            let Some(node)=self.nodes.get(&owner) else {break;};
            if matches!(node.kind,NodeKind::Flyout|NodeKind::MenuFlyout|NodeKind::CommandBarFlyout){return self.request_overlay_close(owner);}
            at=node.parent;
        }
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
        if let Some(owner)=n.navigation_template.owner {
            if let Some(key)=&n.navigation_template.action {
                if let Some(part)=self.nodes[&owner].nav.as_ref().and_then(|nav|nav.parts.iter().find(|p|&p.id==key)) {
                    let (lx,ly)=self.nodes[&owner].world.inverse().unwrap_or_default().point(x,y);
                    if part.clip.is_some_and(|r|!r.contains(lx,ly)){return None;}
                }
            }
        }
        if n.kind == NodeKind::MenuFlyout
            && n.overlay.visual.entrance.value(self.time) < 1. - 1e-9
            && !super::overlay_visual::window_bounds(n.kind, n.rect).contains(x, y)
        {
            return None;
        }
        if !n.visible || !n.enabled || !n.props.is_hit_test_visible || (n.props.clip && !self.inside(id, x, y))
        {
            return None;
        }
        if n.kind==NodeKind::CommandBar {
            let (x,y)=n.world.inverse().unwrap_or_default().point(x,y);
            if !self.command_primary_clip(id).contains(x,y){return None;}
        }
        if n.kind==NodeKind::NavigationView&&self.navigation_blocks_content(id,x,y){return Some(id);}
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
        let ordered = self.ordered_visual_children(id);
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
            if n.kind == NodeKind::Expander && !self.nodes[child].props.is_expander_header {
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
        if n.navigation_template.action.is_some()&&self.inside(id,x,y){return Some(self.navigation_hit_owner(id));}
        if matches!(
            n.kind,
            NodeKind::TableView|NodeKind::Thumb|NodeKind::ScrollBar|NodeKind::AnnotatedScrollBar | NodeKind::RichTextBlock|NodeKind::RichTextBlockOverflow | NodeKind::ItemsView | NodeKind::MenuBarItem | NodeKind::SelectorBar |
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
                | NodeKind::SegmentedItem | NodeKind::Button | NodeKind::NavigationViewItem | NodeKind::AppBarButton | NodeKind::AppBarToggleButton | NodeKind::DropDownButton
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
                        | NodeKind::RichEditBox
                | NodeKind::PasswordBox
        ) || n.props.pointer_notifications || n.props.context_flyout_target.is_some() || (n.kind == NodeKind::Grid && n.props.is_tab_stop) || self.is_table_hit_target(id) {
            self.inside(id, x, y).then_some(id)
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
                // A native popup window owns its complete island, including
                // padding, separators, disabled children and presenter gaps.
                // No interactive child at this point does not mean that the
                // owner behind the window can receive pointer-over or presses.
                if self.nodes[&id].props.is_hit_test_visible
                    && self.popup_window_bounds(id).contains(x, y)
                {
                    return Some(id);
                }
            }
        }
        self.hit_node(self.root, x, y)
    }
    fn navigation_input(&mut self, id: u32, input: NavInput) -> Result<(), String> {
        let pointer_visual=matches!(&input,NavInput::Move{..}|NavInput::Down{..}|NavInput::Leave|NavInput::Cancel|NavInput::Focus{..}|NavInput::Blur);
        if matches!(&input,NavInput::Invoke{id} if id=="$search"){self.nodes.get_mut(&id).ok_or("Unknown NavigationView")?.navigation_template.focus_search=true;}
        let nav = self
            .nodes
            .get_mut(&id)
            .and_then(|n| n.nav.as_mut())
            .ok_or("node is not a NavigationView")?;
        let scroll=(nav.scroll,nav.content_scroll);
        nav.input(input, self.time)?;
        let geometry=!pointer_visual||scroll!=(nav.scroll,nav.content_scroll);
        self.invalidate(id,geometry);
        Ok(())
    }
    fn navigation_touch_input(&mut self,input:&Input)->Result<bool,String>{
        let Input::Touch{pointer,x,y,phase}=input else{return Ok(false);};
        let owner=self.nodes.values().find(|n|n.nav.as_ref().is_some_and(|nav|nav.touching(*pointer))).map(|n|n.id);
        let target=owner.or_else(||(phase=="down").then(||self.hit(*x,*y)).flatten().and_then(|id|{
            let n=&self.nodes[&id];if n.nav.is_some(){Some(id)}else{n.navigation_template.owner.filter(|id|self.nodes[id].nav.is_some())}
        }));
        let Some(id)=target else{return Ok(false);};
        if !self.effective_enabled(id){self.navigation_input(id,NavInput::Cancel)?;return Ok(true);}
        let (x,y)=self.nodes[&id].world.inverse().unwrap_or_default().point(*x,*y);
        if phase=="down"{self.focus(Some(id));}
        self.navigation_input(id,NavInput::Touch{pointer:*pointer,x,y,phase:phase.clone()})?;Ok(true)
    }
    /// Floating surfaces own their pointer route. Their logical owner can lie
    /// underneath them, but must not receive pointer-over through that surface.
    pub(super) fn pointer_route(&self, x: f64, y: f64) -> Vec<u32> {
        let mut route = Vec::new();
        let mut at = self.hit(x, y);
        while let Some(id) = at {
            route.push(id);
            let n = &self.nodes[&id];
            if overlays::is_overlay(n.kind) { break; }
            at = n.parent;
        }
        route
    }
    fn pointer_ancestors_contain(&self,id:u32,x:f64,y:f64)->bool {let mut at=self.nodes[&id].parent;while let Some(id)=at{let n=&self.nodes[&id];if !n.visible||!n.props.is_hit_test_visible||((n.props.clip||collections::is_scroll_owner(n.kind))&&!self.inside(id,x,y)){return false;}if overlays::is_overlay(n.kind){break;}at=n.parent;}true}
    fn pointer(&mut self, x: f64, y: f64) {
        self.pointer = Some((x, y));
        let hit = self.hit(x, y);
        let route = self.pointer_route(x, y);
        self.scroll_hover(x, y);
        let ids: Vec<_> = self
            .nodes
            .values()
            .filter(|n| {
                n.kind == NodeKind::Slider
                    || (n.kind == NodeKind::Grid && n.props.is_tab_stop)
                    || crate::selection::is_button(n.kind)
                    || text_edit::is_editor(n.kind) || n.props.pointer_notifications
            })
            .map(|n| n.id)
            .collect();
        for id in ids {
            let observed=&self.nodes[&id];let inside=if crate::selection::is_button(observed.kind)||(observed.kind==NodeKind::Grid&&observed.props.is_tab_stop)||text_edit::is_editor(observed.kind)||observed.kind==NodeKind::Slider {hit==Some(id)}else{route.contains(&id)&&observed.visible&&observed.enabled&&observed.props.is_hit_test_visible&&self.inside(id,x,y)&&self.pointer_ancestors_contain(id,x,y)};
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
                if let Some(selection) = n.selection_visual.allocated_mut() {
                    selection.cancel_drag();
                }
                n.editor.peek = false;
                n.scroll.drag = None;
                n.scroll.repeat = None;
                n.scroll.pan = None;
                n.scroll.pinch = None;
                n.scroll.touches.clear();
                n.scroll.touch_tap=None;
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
            self.segmented_focus_changed(id);
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
        self.revision+=1;
        self.advance(time);
        // Template-specific handlers may consume the event before the common
        // pointer path; cursor hit testing must still see its current position.
        match &input {
            Input::Move { x, y, .. } | Input::Down { x, y, .. } | Input::Up { x, y, .. } => {
                if !x.is_finite() || !y.is_finite() { return Err("invalid pointer position".into()); }
                self.pointer = Some((*x, *y));
            }
            Input::Leave => self.pointer = None,
            _ => {}
        }
        if let Input::KeyDown{key,..}=&input {
            if key=="ContextMenu" {
                if let Some(id)=self.focused.filter(|id|(self.nodes[id].kind==NodeKind::Button||self.context_flyout_owner(*id).is_some()) && self.effective_enabled(*id)) {self.emit(id,EventKind::ContextRequested);return Ok(());}
            }
        }
        if let Input::ContextRequestAt{x,y}=input {
            if !x.is_finite()||!y.is_finite(){return Err("invalid context position".into());}
            self.pointer=Some((x,y));self.menu_input_narrow=false;
            if let Some(id)=self.hit(x,y).filter(|id|self.context_flyout_owner(*id).is_some()&&self.effective_enabled(*id)){self.emit(id,EventKind::ContextRequested);}
            return Ok(());
        }
        if let Input::ContextRequest { id } = input {
            self.menu_input_narrow=false;
            if self.nodes.get(&id).is_some_and(|n| n.visible) && self.effective_enabled(id) {
                self.emit(id, EventKind::ContextRequested);
            }
            return Ok(());
        }
        // The native light-dismiss layer sees outside presses before the
        // controls below it. Template handlers may otherwise consume them.
        if let Input::Down { x, y, .. } = &input {
            if self.overlay_down(*x, *y)? {
                self.sync_overlays();
                self.invalidate(self.root, false);
                return Ok(());
            }
        }
        if self.table_input(&input)?{return Ok(());}
        if self.navigation_touch_input(&input)?{return Ok(());}
        if self.primitive_input(&input)?{return Ok(());}
        if self.segmented_input(&input)? {return Ok(());}
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
            Input::Table{..}|Input::Primitive{..}|Input::ContentHost{..}|Input::RichSelect{..}|Input::RichPointerSelection{..}|Input::ReadingDetail{..}|Input::Reading{..}|Input::ViewControl{..}=>{},
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
            | Input::ContextRequest { .. } | Input::ContextRequestAt{..} | Input::CollectionCommit { .. }
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
                        if super::collections::is_scroll_owner(self.nodes[&id].kind) || self.nodes[&id].kind == NodeKind::RichEditBox {
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
                        NodeKind::SegmentedItem | NodeKind::Button | NodeKind::NavigationViewItem | NodeKind::AppBarButton | NodeKind::AppBarToggleButton | NodeKind::DropDownButton
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
                        NodeKind::Grid if n.props.is_tab_stop => {
                            n.button.captured = Some(pointer);
                            n.button.pressed = true;
                        }
                        kind if super::collections::is_scroll_owner(kind) || kind == NodeKind::RichEditBox => {
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
                        if crate::selection::is_button(n.kind) || (n.kind == NodeKind::Grid && n.props.is_tab_stop) {
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
                        } else if n.kind == NodeKind::RichEditBox {
                            n.scroll.drag = None;
                            n.scroll.repeat = None;
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
                    if let Some(selection) = n.selection_visual.allocated_mut() {
                        selection.cancel_drag();
                    }
                    n.scroll.drag = None;
                    n.scroll.repeat = None;
                    n.scroll.pan = None;
                    n.scroll.touches.clear();
                    n.scroll.touch_tap=None;
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
                    && (n.kind == NodeKind::Grid && n.props.is_tab_stop || matches!(
                        n.kind,
                        NodeKind::RichTextBlock|NodeKind::RichTextBlockOverflow|NodeKind::ItemsView|NodeKind::Slider
                            | NodeKind::ListView
                            | NodeKind::GridView
                            | NodeKind::RatingControl
                            | NodeKind::SplitButton
                            | NodeKind::ToggleSplitButton
                            | NodeKind::MenuFlyout
                            | NodeKind::MenuBarItem | NodeKind::SegmentedItem | NodeKind::Button | NodeKind::NavigationViewItem | NodeKind::AppBarButton | NodeKind::AppBarToggleButton | NodeKind::DropDownButton
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
                        | NodeKind::RichEditBox
                            | NodeKind::PasswordBox
                    ))
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
                    } else if (crate::selection::is_button(n.kind) || (n.kind == NodeKind::Grid && n.props.is_tab_stop))
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
                    if (crate::selection::is_button(n.kind) || (n.kind == NodeKind::Grid && n.props.is_tab_stop)) && n.button.key.as_deref() == Some(&key)
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
                let n = self.get(id)?;
                if !crate::selection::is_button(n.kind) && !(n.kind == NodeKind::Grid && n.props.is_tab_stop) {
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
            Input::RichEdit{id,command} => self.rich_edit_command(id,command)?,
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
