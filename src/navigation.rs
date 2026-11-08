use crate::{
    animation::{IndicatorTimeline, Motion},
    model::*,
};
use serde::Serialize;
use std::collections::{HashMap, HashSet};
pub use crate::navigation_scroll::Visual as ScrollbarVisual;

#[derive(Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Template {
    pub compact_pane_length: f64,
    pub item_height: f64,
    pub indicator_width: f64,
    pub indicator_height: f64,
    pub indicator_radius: f64,
    pub top_pane_height: f64,
    pub header_row_height: f64,
    pub overflow_width: f64,
    pub header_margin: [f64; 4],
    pub item_margin: [f64; 4],
    pub header_font_size: f64,
}
impl Default for Template {
    fn default() -> Self {
        serde_json::from_str(include_str!(concat!(
            env!("OUT_DIR"),
            "/navigation-template.json"
        )))
        .expect("the checked-in, source-extracted NavigationView template must be valid")
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub next_frame_at: Option<f64>,
    pub scrollbars: Vec<ScrollbarVisual>,
    pub pane_material: Option<PaneMaterialVisual>,
    pub time: f64,
    pub display_mode: DisplayMode,
    pub is_pane_open: bool,
    pub selected_id: Option<String>,
    pub focused_id: Option<String>,
    pub pane: Rect,
    pub content: Rect,
    pub parts: Vec<Part>,
    pub events: Vec<Event>,
    pub animating: bool,
    pub overflow_open: bool,
    pub expanded_ids: Vec<String>,
    pub scroll_offset: f64,
    pub max_scroll: f64,
    pub indicator_visuals: Vec<crate::animation::IndicatorVisual>,
    pub content_scroll_offset: f64,
    pub max_content_scroll: f64,
    pub hierarchy_visuals: Vec<crate::navigation_motion::Visual>,
}
#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct PaneMaterialVisual {
    pub recipe:crate::material::AcrylicOptions,
    pub colors:Option<crate::material::AcrylicColors>,
    pub weight:f64,
    pub backdrop_available:bool,
}

pub struct NavigationView {
    pub(crate) menu_scrollbar: crate::navigation_scroll::Scrollbar,
    pub(crate) content_scrollbar: crate::navigation_scroll::Scrollbar,
    host_policies_initialized:bool,
    pub hierarchy_motion: crate::navigation_motion::HierarchyMotion,
    pub props: Properties,
    pub template: Template,
    pub width: f64,
    pub height: f64,
    pub display_mode: DisplayMode,
    pub pane_open: bool,
    pub selected: Option<String>,
    pub focused: Option<String>,
    pub hovered: Option<String>,
    pub pressed: Option<String>,
    pub expanded: HashSet<String>,
    pub parts: Vec<Part>,
    pub pane: Rect,
    all_rows: Vec<Part>,
    menu_clip: Rect,
    pub flyout: Option<Rect>,
    flyout_owner: Option<String>,
    pub content: Rect,
    pub overflow_open: bool,
    pub scroll: f64,
    pub pane_motion: Motion,
    pub material_motion: Motion,
    pub pane_material_colors: [crate::material::AcrylicTransition;2],
    pub indicator_motion: IndicatorTimeline,
    pub indicator_target: Option<Rect>,
    indicator_owner: Option<String>,
    indicator_clip: Option<Rect>,
    outgoing_indicator_clip: Option<Rect>,
    pub now: f64,
    pub animated_icons: HashMap<String, (AnimatedIconSource, crate::animated_icon::Player)>,
    pub text_widths: HashMap<String, f64>,
    events: Vec<Event>,
    closing: Option<u32>,
    next_request: u32,
    force_closed: bool,
    settle_event: Option<EventKind>,
    max_scroll: f64,
    pub content_scroll: f64,
    pub max_content_scroll: f64,
}
impl NavigationView {
    pub fn new(props: Properties) -> Result<Self, String> {
        props.validate()?;
        let selected = props.selected_id.clone();
        let mut s = Self {
            menu_scrollbar:Default::default(),content_scrollbar:Default::default(),
            host_policies_initialized:false,
            hierarchy_motion: Default::default(),
            props,
            template: Template::default(),
            width: 800.,
            height: 400.,
            display_mode: DisplayMode::Compact,
            pane_open: false,
            selected,
            focused: None,
            hovered: None,
            pressed: None,
            expanded: HashSet::new(),
            parts: vec![],
            all_rows: vec![],
            menu_clip: Rect::default(),
            flyout: None,
            flyout_owner: None,
            pane: Rect::default(),
            content: Rect::default(),
            overflow_open: false,
            scroll: 0.,
            pane_motion: Motion::default(),
            material_motion: Motion {
                curve: [0.5, 0., 0., 0.9],
                ..Motion::default()
            },
            pane_material_colors: Default::default(),
            indicator_motion: IndicatorTimeline::default(),
            indicator_target: None,
            indicator_owner: None,
            indicator_clip: None,
            outgoing_indicator_clip: None,
            now: 0.,
            animated_icons: HashMap::new(),
            text_widths: HashMap::new(),
            events: vec![],
            closing: None,
            next_request: 0,
            force_closed: false,
            settle_event: None,
            max_scroll: 0.,
            content_scroll: 0.,
            max_content_scroll: 0.,
        };
        s.display_mode = s.mode();
        s.pane_open = s
            .props
            .is_pane_open
            .unwrap_or(s.display_mode == DisplayMode::Expanded);
        s.pane_motion.snap(s.pane_width());
        s.material_motion.snap(
            if s.props.reduced_transparency || !s.props.is_backdrop_available || s.props.theme == Theme::HighContrast {
                0.
            } else {
                1.
            },
        );
        s.layout();
        Ok(s)
    }
    pub fn mode(&self) -> DisplayMode {
        match self.props.pane_display_mode {
            PaneDisplayMode::Auto => {
                if self.width >= self.props.expanded_mode_threshold_width {
                    DisplayMode::Expanded
                } else if self.width > 0. && self.width < self.props.compact_mode_threshold_width {
                    DisplayMode::Minimal
                } else {
                    DisplayMode::Compact
                }
            }
            PaneDisplayMode::Left => DisplayMode::Expanded,
            PaneDisplayMode::LeftCompact => DisplayMode::Compact,
            _ => DisplayMode::Minimal,
        }
    }
    pub fn is_top(&self) -> bool {
        self.props.pane_display_mode == PaneDisplayMode::Top
    }
    fn pane_width(&self) -> f64 {
        if !self.props.is_pane_visible || self.is_top() {
            0.
        } else if self.pane_open {
            self.props.open_pane_length.min(self.width)
        } else if self.display_mode != DisplayMode::Minimal {
            self.props.compact_pane_length.min(self.width)
        } else {
            0.
        }
    }
    fn emit(&mut self, kind: EventKind, item_id: Option<String>) {
        let transition = if matches!(kind, EventKind::ItemInvoked | EventKind::SelectionChanged) {
            Some(self.recommended_transition(item_id.as_deref()))
        } else { None };
        self.events.push(Event {
            kind,
            recommended_navigation_transition: transition,
            item_id,
            request_id: None,
        });
    }
    /// A batch is deserialized and validated in full before any live state changes.
    pub fn update(&mut self, patches: serde_json::Value) -> Result<(), String> {
        let mut value = serde_json::to_value(&self.props).map_err(|e| e.to_string())?;
        let batch = patches
            .as_array()
            .ok_or("batch must be an array of property patches")?;
        for patch in batch {
            for (k, v) in patch.as_object().ok_or("each patch must be an object")? {
                value.as_object_mut().unwrap().insert(k.clone(), v.clone());
            }
        }
        let props: Properties = serde_json::from_value(value).map_err(|e| e.to_string())?;
        props.validate()?;
        let pane_changed = props.is_pane_open != self.props.is_pane_open;
        let geometry_changed = props.open_pane_length != self.props.open_pane_length
            || props.compact_pane_length != self.props.compact_pane_length
            || props.is_pane_visible != self.props.is_pane_visible
            || props.compact_mode_threshold_width != self.props.compact_mode_threshold_width
            || props.expanded_mode_threshold_width != self.props.expanded_mode_threshold_width;
        let selection_changed = props.selected_id != self.props.selected_id;
        let orientation_changed = props.pane_display_mode != self.props.pane_display_mode;
        let material_policy_changed = props.reduced_transparency != self.props.reduced_transparency
            || props.is_backdrop_available != self.props.is_backdrop_available
            || props.theme != self.props.theme;
        let content_changed = serde_json::to_value(&props.content_node).unwrap()
            != serde_json::to_value(&self.props.content_node).unwrap();
        if props.theme!=self.props.theme {self.pane_material_colors=Default::default();}
        self.props = props;
        self.text_widths.clear();
        if content_changed {
            self.content_scroll = 0.;
        }
        if material_policy_changed {
            let target =
                if self.props.reduced_transparency || !self.props.is_backdrop_available || self.props.theme == Theme::HighContrast {
                    0.
                } else {
                    1.
                };
            self.material_motion.retarget(target, self.now, 167.);
        }
        self.expanded.retain(|id| self.props.find(id).is_some());
        if self
            .focused
            .as_ref()
            .is_some_and(|id| !id.starts_with('$') && self.props.find(id).is_none())
        {
            self.focused = None;
        }
        if selection_changed {
            self.select(self.props.selected_id.clone());
        }
        if self
            .selected
            .as_ref()
            .is_some_and(|id| id != "$settings" && self.props.find(id).is_none())
        {
            self.select(None);
        }
        if !self.props.is_settings_visible && self.selected.as_deref() == Some("$settings") {
            self.select(None);
        }
        if orientation_changed {
            self.overflow_open = false;
            self.scroll = 0.;
        }
        if orientation_changed || geometry_changed {
            self.adapt();
        }
        if pane_changed {
            if let Some(open) = self.props.is_pane_open {
                self.request_pane(open);
            } else {
                self.force_closed = false;
                self.pane_open = self.display_mode == DisplayMode::Expanded;
                self.pane_motion.snap(self.pane_width());
            }
        }
        if self.props.reduced_motion {
            self.pane_motion.snap(self.pane_width());
            self.indicator_motion.finish();
            self.material_motion.snap(
                if self.props.reduced_transparency || !self.props.is_backdrop_available || self.props.theme == Theme::HighContrast {
                    0.
                } else {
                    1.
                },
            );
        }
        self.layout();
        Ok(())
    }
    pub(crate) fn adapt(&mut self) {
        let mode = self.mode();
        if mode != self.display_mode {
            let previous = self.display_mode;
            self.display_mode = mode;
            self.emit(EventKind::DisplayModeChanged, None);
            if mode == DisplayMode::Expanded && !self.force_closed {
                self.pane_open = true;
            } else if previous == DisplayMode::Expanded || mode == DisplayMode::Minimal {
                self.pane_open = false;
            }
        }
        // Native UpdateAdaptiveLayout does not animate window resizes.
        self.pane_motion.snap(self.pane_width());
    }
    pub fn input(&mut self, input: Input, now: f64) -> Result<(), String> {
        self.advance(now);
        if self.hierarchy_motion.active(self.now){self.layout();}
        match input {
            Input::Resize { width, height } => {
                if !width.is_finite() || !height.is_finite() || width < 0. || height < 0. {
                    return Err("invalid viewport".into());
                }
                use crate::layout::LayoutNode;
                self.arrange(crate::layout::Size::new(width, height)?);
            }
            Input::Move { x, y } => {
                self.menu_scrollbar.hover(x,y,self.now,self.props.reduced_motion);
                self.content_scrollbar.hover(x,y,self.now,self.props.reduced_motion);
                self.menu_scrollbar.drag(x,y,self.now,self.props.reduced_motion);
                self.content_scrollbar.drag(x,y,self.now,self.props.reduced_motion);
                self.scroll=self.menu_scrollbar.state.offsets(self.now)[1];
                self.content_scroll=self.content_scrollbar.state.offsets(self.now)[1];
                self.hovered = self.hit(x, y);
            }
            Input::Down { x, y } => {
                if self.menu_scrollbar.down(x,y,self.now,self.props.reduced_motion)||self.content_scrollbar.down(x,y,self.now,self.props.reduced_motion){self.pressed=None;self.layout();return Ok(());}
                self.pressed = self.hit(x, y);
                if self.pressed.is_some() {
                    self.focused = self.pressed.clone();
                }
            }
            Input::Up { x, y } => {
                if self.menu_scrollbar.captured()||self.content_scrollbar.captured(){self.menu_scrollbar.release();self.content_scrollbar.release();self.pressed=None;self.layout();return Ok(());}
                let id = self.hit(x, y);
                if id == self.pressed {
                    if let Some(id) = id {
                        self.invoke(&id);
                    }
                }
                self.pressed = None;
            }
            Input::Leave => {
                self.menu_scrollbar.hover(-1.,-1.,self.now,self.props.reduced_motion);
                self.content_scrollbar.hover(-1.,-1.,self.now,self.props.reduced_motion);
                self.hovered = None;
            }
            Input::Cancel => {
                self.menu_scrollbar.release();self.content_scrollbar.release();
                self.menu_scrollbar.hover(-1.,-1.,self.now,self.props.reduced_motion);
                self.content_scrollbar.hover(-1.,-1.,self.now,self.props.reduced_motion);
                self.hovered = None;
                self.pressed = None;
            }
            Input::Invoke { id } => self.invoke(&id),
            Input::Focus { id } => {
                if self
                    .parts
                    .iter()
                    .any(|p| p.id == id && p.enabled && p.kind == ItemKind::Item)
                {
                    self.focused = Some(id.clone());
                    if self.props.selection_follows_focus
                        && !id.starts_with('$')
                        && self.props.find(&id).is_some_and(|i| i.selects_on_invoked)
                    {
                        self.select(Some(id));
                    }
                }
            }
            Input::Blur => self.focused = None,
            Input::Key { key } => self.key(&key),
            Input::Wheel { delta } => {
                if delta.is_finite() {
                    self.scroll = (self.scroll + delta).clamp(0., self.max_scroll);
                }
            }
            Input::ContentWheel { delta } => {
                if delta.is_finite() {
                    self.content_scroll =
                        (self.content_scroll + delta).clamp(0., self.max_content_scroll);
                }
            }
            Input::ScrollKey{content,key}=>{let bar=if content{&mut self.content_scrollbar}else{&mut self.menu_scrollbar};bar.key(&key,self.now,self.props.reduced_motion);}
            Input::Expand { id, expanded } => {
                if self.expanded.contains(&id) != expanded {
                    self.toggle_item(&id);
                }
            }
            Input::ResolveClosing { request, cancel } => {
                if self.closing != Some(request) {
                    return Err("stale PaneClosing request".into());
                }
                self.closing = None;
                if !cancel {
                    self.set_pane(false);
                } else {
                    self.props.is_pane_open = Some(true);
                }
            }
        }
        self.layout();
        Ok(())
    }
    pub fn advance(&mut self, now: f64) {
        if now.is_finite() {
            self.now = now.max(self.now);
        }
        self.hierarchy_motion.advance(self.now,self.props.reduced_motion);
        self.scroll=self.menu_scrollbar.tick(self.now,self.props.reduced_motion);
        self.content_scroll=self.content_scrollbar.tick(self.now,self.props.reduced_motion);
        if !self.pane_motion.active(self.now) {
            if let Some(event) = self.settle_event.take() {
                self.emit(event, None);
            }
        }
    }
    fn hit(&self, x: f64, y: f64) -> Option<String> {
        self.parts
            .iter()
            .rev()
            .find(|p| {
                p.enabled
                    && p.kind == ItemKind::Item
                    && p.rect.contains(x, y)
                    && p.clip.is_none_or(|r| r.contains(x, y))
            })
            .map(|p| p.id.clone())
    }
    fn select(&mut self, id: Option<String>) {
        if self.selected != id {
            let transition=self.recommended_transition(id.as_deref());
            self.selected = id.clone();
            self.props.selected_id = id.clone();
            self.emit(EventKind::SelectionChanged, id);
            self.events.last_mut().unwrap().recommended_navigation_transition=Some(transition);
        }
    }
    fn recommended_transition(&self,next:Option<&str>)->NavigationTransition {
        if !self.is_top(){return NavigationTransition::Entrance;}
        let Some(next)=next else{return NavigationTransition::Entrance};
        if self.overflow_open && self.flyout_owner.is_none() {return NavigationTransition::SlideFromRight;}
        fn index(items:&[Item],id:&str,path:&mut Vec<usize>)->bool {
            for (i,item) in items.iter().enumerate(){path.push(i);if item.id==id||index(&item.children,id,path){return true;}path.pop();}false
        }
        let path=|id:&str|->Option<Vec<usize>> {
            let mut path=vec![0];if index(&self.props.items,id,&mut path){return Some(path);}
            let mut path=vec![1];if index(&self.props.footer_items,id,&mut path){return Some(path);}
            if id=="$settings"&&self.props.is_settings_visible{return Some(vec![1,self.props.footer_items.len()]);}None
        };
        if let (Some(previous),Some(target))=(self.selected.as_deref().and_then(path),path(next)){
            match previous.cmp(&target){std::cmp::Ordering::Less=>NavigationTransition::SlideFromRight,std::cmp::Ordering::Greater=>NavigationTransition::SlideFromLeft,_=>NavigationTransition::Entrance}
        }else{NavigationTransition::Entrance}
    }
    fn request_pane(&mut self, open: bool) {
        if open {
            self.closing = None;
            if !self.pane_open {
                self.set_pane(true);
            }
        } else if self.pane_open && self.closing.is_none() {
            self.next_request += 1;
            self.closing = Some(self.next_request);
            self.events.push(Event {
                kind: EventKind::PaneClosing,
                recommended_navigation_transition: None,
                item_id: None,
                request_id: Some(self.next_request),
            });
        }
    }
    fn set_pane(&mut self, open: bool) {
        self.pane_open = open;
        self.force_closed = !open;
        self.props.is_pane_open = Some(open);
        if open {
            self.emit(EventKind::PaneOpening, None);
        }
        self.settle_event = Some(if open {
            EventKind::PaneOpened
        } else {
            EventKind::PaneClosed
        });
        // Native SplitView tracks are documented in the extracted template report.
        let duration = if self.props.reduced_motion {
            0.
        } else if open {
            350.
        } else {
            120.
        };
        self.pane_motion
            .retarget(self.pane_width(), self.now, duration);
    }
    fn toggle_item(&mut self, id: &str) {
        if self
            .props
            .find(id)
            .is_some_and(|i| !i.children.is_empty() && i.enabled)
        {
            self.hierarchy_motion.pending=true;
            if self.expanded.remove(id) {
                self.emit(EventKind::ItemCollapsed, Some(id.into()));
            } else {
                self.expanded.insert(id.into());
                self.emit(EventKind::ItemExpanding, Some(id.into()));
            }
        }
    }
    fn invoke(&mut self, id: &str) {
        match id {
            "$toggle" => self.request_pane(!self.pane_open),
            "$dismiss" => {
                self.overflow_open = false;
                if self.is_top() {
                    self.expanded.clear();
                } else {
                    self.request_pane(false);
                }
            }
            "$back" => {
                if self.props.is_back_enabled {
                    self.emit(EventKind::BackRequested, None);
                }
            }
            "$overflow" => self.overflow_open = !self.overflow_open,
            "$settings" => {
                if self.props.is_settings_visible {
                    self.emit(EventKind::ItemInvoked, Some(id.into()));
                    self.select(Some(id.into()));
                    if self.display_mode != DisplayMode::Expanded && !self.is_top() {
                        self.request_pane(false);
                    }
                }
            }
            _ if id.starts_with("$expand:") => self.toggle_item(&id[8..]),
            _ => {
                if let Some(i) = self.props.find(id) {
                    if !i.enabled || i.kind != ItemKind::Item {
                        return;
                    }
                    let selects = i.selects_on_invoked;
                    let parent = !i.children.is_empty();
                    self.emit(EventKind::ItemInvoked, Some(id.into()));
                    if selects {
                        self.select(Some(id.into()));
                    }
                    if parent {
                        self.toggle_item(id);
                    } else {
                        self.overflow_open = false;
                        if self.is_top() {
                            self.expanded.clear();
                        } else if self.display_mode != DisplayMode::Expanded {
                            self.request_pane(false);
                        }
                    }
                }
            }
        }
    }
    fn key(&mut self, key: &str) {
        if key == "Escape" {
            self.overflow_open = false;
            if let Some(owner) = self.flyout_owner.clone() {
                self.expanded.clear();
                self.focused = Some(owner);
            }
            if self.pane_open && self.display_mode != DisplayMode::Expanded {
                self.request_pane(false);
            }
            return;
        }
        if key == "Enter" || key == " " {
            if let Some(id) = self.focused.clone() {
                self.invoke(&id);
            }
            return;
        }
        let focused = self.focused.clone().unwrap_or_default();
        if !self.is_top() && (key == "ArrowRight" || key == "ArrowLeft") {
            if key == "ArrowRight" && !self.expanded.contains(&focused) {
                self.toggle_item(&focused);
            }
            if key == "ArrowLeft" {
                if self.expanded.contains(&focused) {
                    self.toggle_item(&focused);
                } else if let Some(part) = self.parts.iter().find(|p| p.id == focused) {
                    let depth = part.depth;
                    let before = self
                        .parts
                        .iter()
                        .take_while(|p| p.id != focused)
                        .collect::<Vec<_>>();
                    if let Some(p) = before.into_iter().rev().find(|p| {
                        p.depth < depth && !p.id.starts_with('$') && p.kind == ItemKind::Item
                    }) {
                        self.focused = Some(p.id.clone());
                    }
                }
            }
            return;
        }
        let mut candidates: Vec<_> = if self.is_top() {
            self.parts.iter().collect()
        } else {
            self.all_rows.iter().collect()
        };
        if self.is_top() {
            candidates.sort_by(|a, b| a.rect.x.total_cmp(&b.rect.x));
        }
        let ids: Vec<String> = candidates
            .iter()
            .filter(|p| {
                p.enabled
                    && p.kind == ItemKind::Item
                    && !p.id.starts_with("$expand:")
                    && p.id != "$dismiss"
            })
            .map(|p| p.id.clone())
            .collect();
        if ids.is_empty() {
            return;
        }
        let index = ids.iter().position(|id| *id == focused).unwrap_or(0);
        let next = match key {
            "Home" => 0,
            "End" => ids.len() - 1,
            "ArrowDown" | "ArrowRight" => (index + 1).min(ids.len() - 1),
            "ArrowUp" | "ArrowLeft" => index.saturating_sub(1),
            _ => return,
        };
        let id = ids[next].clone();
        self.focused = Some(id.clone());
        if !self.is_top() {
            if let Some(part) = self
                .all_rows
                .iter()
                .find(|p| p.id == id && p.clip == Some(self.menu_clip))
            {
                if part.rect.y < self.menu_clip.y {
                    self.scroll =
                        (self.scroll + part.rect.y - self.menu_clip.y).clamp(0., self.max_scroll);
                } else if part.rect.y + part.rect.height > self.menu_clip.y + self.menu_clip.height
                {
                    self.scroll = (self.scroll + part.rect.y + part.rect.height
                        - self.menu_clip.y
                        - self.menu_clip.height)
                        .clamp(0., self.max_scroll);
                }
            }
            if key == "Home" {
                self.scroll = 0.;
            }
        }
        if self.props.selection_follows_focus
            && self.props.find(&id).is_some_and(|i| i.selects_on_invoked)
        {
            self.select(Some(id));
        }
    }
    fn part(&mut self, id: &str, text: &str, icon: &str, rect: Rect, enabled: bool) {
        self.parts.push(Part {
            id: id.into(),
            text: text.into(),
            icon: icon.into(),
            rect,
            enabled,
            selected: self.selected.as_deref() == Some(id),
            expanded: None,
            depth: 0,
            kind: ItemKind::Item,
            clip: None,
        });
    }
    fn rows(&mut self, items: &[Item], depth: usize, x: f64, y: &mut f64, width: f64, clip: Rect) {
        let row = self.template.item_height + 4.;
        for i in items {
            let h = match i.kind {
                ItemKind::Separator => 8.,
                ItemKind::Header => 40.,
                _ => row,
            };
            let r = Rect::new(
                x + self.template.item_margin[0],
                *y + 2.,
                width - self.template.item_margin[0] - self.template.item_margin[2],
                h - 4.,
            );
            let row_part = Part {
                id: i.id.clone(),
                text: i.text.clone(),
                icon: i.icon.clone(),
                rect: r,
                enabled: i.enabled,
                selected: self.selected.as_ref() == Some(&i.id),
                expanded: if i.children.is_empty() {
                    None
                } else {
                    Some(self.expanded.contains(&i.id))
                },
                depth,
                kind: i.kind,
                clip: Some(clip),
            };
            self.all_rows.push(row_part.clone());
            {
                self.parts.push(row_part);
                if !i.children.is_empty()
                    && (self.pane_open || self.is_top() || self.flyout.is_some())
                {
                    self.part(
                        &format!("$expand:{}", i.id),
                        if self.expanded.contains(&i.id) {
                            "Collapse"
                        } else {
                            "Expand"
                        },
                        "",
                        Rect::new(r.x + r.width - 40., r.y, 40., r.height),
                        i.enabled,
                    );
                    self.parts.last_mut().unwrap().clip = Some(clip);
                }
            }
            *y += h;
            if self.expanded.contains(&i.id)
                && (self.pane_open || self.is_top() || self.flyout.is_some())
            {
                self.rows(&i.children, depth + 1, x, y, width, clip);
            }
        }
    }
    pub fn layout(&mut self) {
        let previous_scroll=self.scroll;
        self.menu_clip=Rect::default();self.max_scroll=0.;
        let overlay=self.display_mode!=DisplayMode::Expanded&&self.pane_open;
        if let Some(recipe)=self.pane_recipe(){self.pane_material_colors[usize::from(overlay)].sample(&recipe,self.now,self.props.reduced_motion);}
        self.parts.clear();
        self.all_rows.clear();
        self.flyout = None;
        self.flyout_owner = None;
        let top = self.is_top();
        let pw = self.pane_motion.value(self.now).min(self.width);
        let inline = self.display_mode == DisplayMode::Expanded;
        let content_x = if self.props.is_pane_visible && !top {
            if inline {
                pw
            } else if self.display_mode == DisplayMode::Compact {
                self.props.compact_pane_length.min(self.width)
            } else {
                0.
            }
        } else {
            0.
        };
        let content_y = if top && self.props.is_pane_visible {
            self.template.top_pane_height
        } else {
            0.
        };
        self.content = Rect::new(
            content_x,
            content_y,
            self.width - content_x,
            self.height - content_y,
        );
        self.pane = Rect::new(0., 0., pw, self.height);
        let body = self.content_body();
        self.max_content_scroll = self
            .props
            .content_node
            .as_ref()
            .map(|n| {
                (crate::content::desired(n, body.width, &|text, size, weight| {
                    self.measure_content(text, size, weight)
                })
                .1 - body.height)
                    .max(0.)
            })
            .unwrap_or(0.);
        self.content_scroll = self.content_scroll.min(self.max_content_scroll);
        if !self.props.is_pane_visible {
            self.sync_animated_icons();
            self.update_indicator();
            return;
        }
        let items = self.props.items.clone();
        let footer = self.props.footer_items.clone();
        if top {
            let mut x = 4.;
            if self.props.is_back_button_visible {
                self.part(
                    "$back",
                    "Back",
                    "\u{e72b}",
                    Rect::new(x, 6., 40., 36.),
                    self.props.is_back_enabled,
                );
                x += 40.;
            }
            let mut reserve = if self.props.is_settings_visible {
                40.
            } else {
                0.
            };
            reserve += footer
                .iter()
                .map(|i| self.top_item_width(i))
                .sum::<f64>()
                .min((self.width - 100.).max(0.));
            reserve += 4.;
            let menu_items: Vec<_> = items.iter().filter(|i| i.kind == ItemKind::Item).collect();
            let total_width = menu_items
                .iter()
                .map(|i| self.top_item_width(i))
                .sum::<f64>();
            let overflow_reserve = if x + total_width > self.width - reserve {
                self.template.overflow_width
            } else {
                0.
            };
            let mut overflow = vec![];
            for i in &items {
                if i.kind != ItemKind::Item {
                    continue;
                }
                let w = self.top_item_width(i);
                if overflow.is_empty() && x + w <= self.width - reserve - overflow_reserve {
                    self.part(
                        &i.id,
                        &i.text,
                        &i.icon,
                        Rect::new(x + 4., 2., w - 8., 44.),
                        i.enabled,
                    );
                    self.parts.last_mut().unwrap().expanded = if i.children.is_empty() {
                        None
                    } else {
                        Some(self.expanded.contains(&i.id))
                    };
                    x += w;
                } else {
                    overflow.push(i.clone());
                }
            }
            if !overflow.is_empty() {
                self.part(
                    "$overflow",
                    "More",
                    "\u{e712}",
                    Rect::new(x, 4., self.template.overflow_width, 40.),
                    true,
                );
            }
            if self.props.is_settings_visible {
                self.part(
                    "$settings",
                    "Settings",
                    "\u{e713}",
                    Rect::new((self.width - 42.).max(0.), 6., 36., 36.),
                    true,
                );
            }
            let mut footer_x = (self.width - reserve).max(x + overflow_reserve);
            for i in &footer {
                let w = self.top_item_width(i);
                if footer_x + w
                    <= self.width
                        - if self.props.is_settings_visible {
                            44.
                        } else {
                            0.
                        }
                {
                    self.part(
                        &i.id,
                        &i.text,
                        &i.icon,
                        Rect::new(footer_x + 4., 2., w - 8., 44.),
                        i.enabled,
                    );
                    footer_x += w;
                } else {
                    overflow.push(i.clone());
                }
            }
            if !overflow.is_empty() && !self.parts.iter().any(|p| p.id == "$overflow") {
                self.part(
                    "$overflow",
                    "More",
                    "\u{e712}",
                    Rect::new(x, 4., self.template.overflow_width, 40.),
                    true,
                );
            }
            if self.overflow_open {
                self.part("$dismiss", "Dismiss menu", "", self.content, true);
                let w = self.popup_width(&overflow).min(self.width);
                let x = x.min((self.width - w).max(0.));
                let mut y = 52.;
                let clip = Rect::new(x, 48., w, self.height - 48.);
                self.flyout = Some(clip);
                self.flyout_owner = Some("$overflow".into());
                self.rows(&overflow, 0, x, &mut y, w, clip);
                self.flyout = Some(Rect::new(x, 48., w, (y - 44.).min(clip.height)));
            } else if let Some(parent) = items
                .iter()
                .chain(footer.iter())
                .find(|i| !i.children.is_empty() && self.expanded.contains(&i.id))
            {
                if let Some(part) = self.parts.iter().find(|p| p.id == parent.id) {
                    let w = self.popup_width(&parent.children).min(self.width);
                    let x = part.rect.x.min((self.width - w).max(0.));
                    let mut y = 52.;
                    let clip = Rect::new(x, 48., w, self.height - 48.);
                    self.part("$dismiss", "Dismiss submenu", "", self.content, true);
                    self.flyout = Some(clip);
                    self.flyout_owner = Some(parent.id.clone());
                    self.rows(&parent.children, 0, x, &mut y, clip.width, clip);
                    self.flyout = Some(Rect::new(x, 48., w, (y - 44.).min(clip.height)));
                }
            }
        } else {
            let overlay = !inline && self.pane_open;
            if overlay {
                self.part(
                    "$dismiss",
                    "Close navigation pane",
                    "",
                    Rect::new(pw, 0., self.width - pw, self.height),
                    true,
                );
            }
            let minimal = self.display_mode == DisplayMode::Minimal;
            let toggle_y = if self.props.is_back_button_visible && !minimal {
                44.
            } else {
                4.
            };
            let button_x = if self.props.is_back_button_visible && minimal {
                44.
            } else {
                4.
            };
            if self.props.is_back_button_visible {
                self.part(
                    "$back",
                    "Back",
                    "\u{e72b}",
                    Rect::new(4., 6., 40., 36.),
                    self.props.is_back_enabled,
                );
            }
            if self.props.is_pane_toggle_button_visible {
                self.part(
                    "$toggle",
                    "Open navigation",
                    "\u{e700}",
                    Rect::new(button_x, toggle_y + 2., 40., 36.),
                    true,
                );
            }
            if pw > 0. {
                let footer_h = (footer.len() as f64
                    + if self.props.is_settings_visible {
                        1.
                    } else {
                        0.
                    })
                    * 40.
                    + 4.;
                let menu_top = toggle_y
                    + if self.props.is_pane_toggle_button_visible {
                        self.template.header_row_height
                    } else {
                        0.
                    };
                let bottom = (self.height - footer_h).max(menu_top);
                let clip = Rect::new(0., menu_top, pw, bottom - menu_top);
                self.menu_clip = clip;
                let mut y = menu_top - self.scroll;
                self.rows(&items, 0, 0., &mut y, pw, clip);
                self.max_scroll = (y + self.scroll - bottom).max(0.);
                self.scroll = self.scroll.min(self.max_scroll);
                let mut y = bottom;
                let clip = Rect::new(0., bottom, pw, self.height - bottom);
                self.rows(&footer, 0, 0., &mut y, pw, clip);
                if self.props.is_settings_visible {
                    self.part(
                        "$settings",
                        "Settings",
                        "\u{e713}",
                        Rect::new(4., self.height - 42., pw - 8., 36.),
                        true,
                    );
                }
            }
        }
        if previous_scroll!=self.scroll {
            for part in self.parts.iter_mut().chain(self.all_rows.iter_mut()).filter(|p|p.clip==Some(self.menu_clip)){part.rect.y+=previous_scroll-self.scroll;}
        }
        self.menu_scrollbar.sync(self.menu_clip,self.max_scroll,self.scroll,self.now,self.props.reduced_motion);
        self.content_scrollbar.sync(self.content_body(),self.max_content_scroll,self.content_scroll,self.now,self.props.reduced_motion);
        self.hierarchy_motion.arrange(&mut self.parts,self.menu_clip,self.scroll,self.now,self.props.reduced_motion);
        self.hierarchy_motion.sync_chevrons(&self.parts,self.hovered.as_deref(),self.pressed.as_deref(),self.now,self.props.reduced_motion,self.pane_open||self.is_top()||self.flyout.is_some());
        if !self.parts.iter().any(|p| p.selected) {
            let ancestor = self
                .parts
                .iter()
                .filter(|p| {
                    !p.id.starts_with('$')
                        && self.selected.as_ref().is_some_and(|selected| {
                            self.props
                                .find(&p.id)
                                .is_some_and(|node| Self::contains(&node.children, selected))
                        })
                })
                .max_by_key(|p| p.depth)
                .map(|p| p.id.clone());
            if let Some(id) = ancestor {
                if let Some(p) = self.parts.iter_mut().find(|p| p.id == id) {
                    p.selected = true;
                }
            }
        }
        self.sync_animated_icons();
        self.update_indicator();
    }
    fn contains(items: &[Item], id: &str) -> bool {
        items
            .iter()
            .any(|i| i.id == id || Self::contains(&i.children, id))
    }
    fn popup_width(&self, items: &[Item]) -> f64 {
        items
            .iter()
            .map(|i| self.top_item_width(i) + if i.children.is_empty() { 0. } else { 16. })
            .fold(160., f64::max)
    }
    fn top_item_width(&self, item: &Item) -> f64 {
        let text = self
            .text_widths
            .get(&item.text)
            .copied()
            .unwrap_or_else(|| item.text.chars().count() as f64 * 7.2);
        (text
            + if item.icon.is_empty() && item.animated_icon_source.is_none() {
                32.
            } else {
                56.
            }
            + if item.children.is_empty() { 0. } else { 24. })
        .ceil()
        .max(40.)
    }
    pub fn content_body(&self) -> Rect {
        let header = if !self.props.header.is_empty()
            && (self.props.always_show_header
                || (!self.is_top() && self.display_mode == DisplayMode::Minimal))
        {
            83.
        } else {
            1.
        };
        let border = if self.is_top() || self.display_mode == DisplayMode::Minimal {
            0.
        } else {
            1.
        };
        Rect::new(
            self.content.x + border,
            self.content.y + header,
            self.content.width - border,
            self.content.height - header,
        )
    }
    pub fn measure_content(&self, text: &str, size: f64, weight: u16) -> f64 {
        let key = crate::content::metric_key(text, size, weight);
        if let Some(value) = self.text_widths.get(&key) {
            return *value;
        }
        if text.starts_with("@bearing:") {
            return 0.;
        }
        let space = self
            .text_widths
            .get(&crate::content::metric_key(" ", size, weight))
            .copied()
            .unwrap_or(size * 0.25);
        let words: Vec<_> = text.split_whitespace().collect();
        words
            .iter()
            .map(|w| {
                self.text_widths
                    .get(&crate::content::metric_key(w, size, weight))
                    .copied()
                    .unwrap_or(w.chars().count() as f64 * size * 0.52)
            })
            .sum::<f64>()
            + space * words.len().saturating_sub(1) as f64
    }
    fn update_indicator(&mut self) {
        let part = self.parts.iter().find(|p| p.selected);
        let owner = part.map(|p| p.id.clone());
        let clip = part.and_then(|p| p.clip);
        let selected = part.map(|p| {
            let r = p.rect;
            if self.is_top() && r.y < self.template.top_pane_height {
                Rect::new(r.x + (r.width - 16.) / 2., r.y + r.height - 7., 16., 3.)
            } else {
                Rect::new(
                    r.x + p.depth as f64 * 31.,
                    r.y + (r.height - 16.) / 2.,
                    3.,
                    16.,
                )
            }
        });
        if selected != self.indicator_target {
            if let Some(r) = selected {
                let same_item = owner == self.indicator_owner;
                let same_shape = self.indicator_target.is_some_and(|old| old.width == r.width && old.height == r.height);
                if same_item && same_shape {
                    self.indicator_motion.reposition(r);
                } else {
                    let animate = !same_item && self.indicator_target.is_some() && !self.props.reduced_motion;
                    self.outgoing_indicator_clip = self.indicator_clip;
                    self.indicator_motion.retarget(r, self.is_top() && r.y < 48., self.now, animate);
                }
            } else {
                self.indicator_motion.finish();
            }
            self.indicator_target = selected;
        }
        self.indicator_owner = owner;
        self.indicator_clip = clip;
    }
    pub fn indicator_visual_clips(&self) -> Vec<(crate::animation::IndicatorVisual, Option<Rect>)> {
        if self.indicator_target.is_none() { return vec![]; }
        let visuals = self.indicator_motion.visuals(self.now);
        let animated = visuals.len() > 1;
        visuals.into_iter().enumerate().map(|(i, visual)| (visual,
            if animated && i == 0 { self.outgoing_indicator_clip } else { self.indicator_clip })).collect()
    }
    fn visible_indicator_visuals(&self) -> Vec<crate::animation::IndicatorVisual> {
        self.indicator_visual_clips().into_iter().filter_map(|(mut visual, clip)| {
            if let Some(clip) = clip {
                let r = visual.rect;
                let x = r.x.max(clip.x); let y = r.y.max(clip.y);
                visual.rect = Rect::new(x, y, (r.x + r.width).min(clip.x + clip.width) - x,
                    (r.y + r.height).min(clip.y + clip.height) - y);
            }
            (visual.rect.width > 0. && visual.rect.height > 0. && visual.opacity > 0.).then_some(visual)
        }).collect()
    }
    pub fn snapshot(&mut self) -> Snapshot {
        self.sync_animated_icons();
        let mut expanded_ids: Vec<_> = self.expanded.iter().cloned().collect();
        expanded_ids.sort();
        Snapshot {
            next_frame_at:self.next_frame_at(),
            scrollbars:[self.menu_scrollbar.visual(false,self.now),self.content_scrollbar.visual(true,self.now)].into_iter().flatten().collect(),
            pane_material:self.pane_recipe().map(|recipe|PaneMaterialVisual{recipe,colors:self.pane_colors(),weight:if self.props.is_backdrop_available{self.material_motion.value(self.now)}else{0.},backdrop_available:self.props.is_backdrop_available}),
            time: self.now,
            display_mode: self.display_mode,
            is_pane_open: self.pane_open,
            selected_id: self.selected.clone(),
            focused_id: self.focused.clone(),
            pane: self.pane,
            content: self.content,
            parts: self.parts.clone(),
            events: std::mem::take(&mut self.events),
            animating: self.animated_icons.values().any(|(_, p)| p.active())
                || self.menu_scrollbar.active(self.now)||self.content_scrollbar.active(self.now)
                || self.hierarchy_motion.active(self.now)
                || self.pane_motion.active(self.now)
                || self.material_motion.active(self.now)
                || self.pane_material_colors.iter().any(|c|c.active(self.now))
                || self.indicator_motion.active(self.now)
                || self.settle_event.is_some(),
            overflow_open: self.overflow_open,
            expanded_ids,
            scroll_offset: self.scroll,
            max_scroll: self.max_scroll,
            content_scroll_offset: self.content_scroll,
            max_content_scroll: self.max_content_scroll,
            indicator_visuals: self.visible_indicator_visuals(),
            hierarchy_visuals: self.hierarchy_motion.snapshot(self.now),
        }
    }
}

impl NavigationView {
    pub fn next_frame_at(&self)->Option<f64>{self.menu_scrollbar.next_frame_at(self.now).into_iter().chain(self.content_scrollbar.next_frame_at(self.now)).min_by(f64::total_cmp)}
    pub(crate) fn inherit_policies(&mut self,theme:Theme,reduced:bool,transparency:bool){
        if !self.host_policies_initialized {
            self.props.theme=theme;self.props.reduced_motion=reduced;self.props.reduced_transparency=transparency;
            self.pane_material_colors=Default::default();
            self.material_motion.snap(if transparency||!self.props.is_backdrop_available||theme==Theme::HighContrast{0.}else{1.});
            self.host_policies_initialized=true;
        }else if self.props.theme!=theme||self.props.reduced_motion!=reduced||self.props.reduced_transparency!=transparency{
            self.update(serde_json::json!([{"theme":theme,"reducedMotion":reduced,"reducedTransparency":transparency}])).expect("valid inherited NavigationView policies");
        }
    }
    pub fn pane_recipe(&self)->Option<crate::material::AcrylicOptions>{
        if self.display_mode!=DisplayMode::Expanded&&self.pane_open {
            crate::resources::Resources::current().resolve(self.props.theme,"NavigationViewDefaultPaneBackground").ok()
                .filter(|b|b.kind=="acrylic").map(|b|crate::material::AcrylicOptions{tint_color:b.tint.clone(),tint_opacity:b.tint_opacity,luminosity_opacity:b.luminosity_opacity,fallback_color:b.fallback.clone()})
        }else{self.props.expanded_pane_material.clone()}
    }
    pub fn pane_colors(&self)->Option<crate::material::AcrylicColors>{self.pane_material_colors[usize::from(self.display_mode!=DisplayMode::Expanded&&self.pane_open)].current(self.now)}
    fn sync_animated_icons(&mut self) {
        let visible: Vec<_> = self
            .parts
            .iter()
            .filter_map(|p| {
                self.props
                    .find(&p.id)
                    .and_then(|i| i.animated_icon_source)
                    .map(|source| (p.id.clone(), source, p.enabled))
            })
            .collect();
        self.animated_icons
            .retain(|id, _| visible.iter().any(|(v, _, _)| v == id));
        for (id, source, enabled) in visible {
            let state = if self.pressed.as_ref() == Some(&id) && enabled {
                "Pressed"
            } else if self.hovered.as_ref() == Some(&id) && enabled {
                "PointerOver"
            } else {
                "Normal"
            };
            let player = self
                .animated_icons
                .entry(id)
                .or_insert_with(|| (source, Default::default()));
            player.0 = source;
            player
                .1
                .sync(source, state, self.now, self.props.reduced_motion, true);
        }
    }
}
