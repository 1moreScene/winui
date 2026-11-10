//! Root-level floating surfaces. Logical ownership remains in the scene tree.
use super::*;
use crate::{render::Draw, resources::Resources};
use std::sync::OnceLock;

pub fn contract() -> &'static serde_json::Value {
    static VALUE: OnceLock<serde_json::Value> = OnceLock::new();
    VALUE.get_or_init(|| {
        serde_json::from_str(include_str!("../../references/overlay-template.json")).unwrap()
    })
}
pub fn metric(name: &str, fallback: f64) -> f64 {
    contract()["metrics"]["Shared"][name]
        .as_str()
        .and_then(|s| s.parse().ok())
        .unwrap_or(fallback)
}
pub fn padding(name: &str) -> [f64; 4] {
    let values: Vec<f64> = contract()["metrics"]["Shared"][name]
        .as_str()
        .unwrap()
        .split(',')
        .map(|n| n.parse().unwrap())
        .collect();
    std::array::from_fn(|i| values[if values.len() == 1 { 0 } else { i }])
}
pub fn is_overlay(kind: NodeKind) -> bool {
    matches!(
        kind,
        NodeKind::CommandBarFlyout | NodeKind::Popup | NodeKind::ToolTip | NodeKind::Flyout | NodeKind::MenuFlyout
    )
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
#[derive(PartialEq)]
pub struct MenuEntry {
    #[serde(skip_serializing_if="Option::is_none")]
    pub source_node:Option<u32>,
    pub command:Option<u32>,pub command_parameter:serde_json::Value,pub command_metadata:Option<super::view_controls::CommandMetadata>,pub command_base_enabled:Option<bool>,
    pub items:Vec<MenuEntry>,
    pub group_name:String,
    pub keyboard_accelerators:Vec<super::command_controls::Accelerator>,
    pub id: String,
    pub accessible_name:String,
    pub text: String,
    pub icon: String,
    pub kind: MenuEntryKind,
    pub enabled: bool,
    pub checked: bool,
}
impl Default for MenuEntry {
    fn default() -> Self {
        Self {
            source_node:None,command:None,command_parameter:serde_json::Value::Null,command_metadata:None,command_base_enabled:None,
            items:vec![],group_name:String::new(),keyboard_accelerators:vec![],
            id: String::new(),
            accessible_name:String::new(),
            text: String::new(),
            icon: String::new(),
            kind: MenuEntryKind::Command,
            enabled: true,
            checked: false,
        }
    }
}
#[derive(Default)]
pub(super) struct OverlayState {
    pub open: bool,
    pub submenus:HashMap<usize,u32>,
    pub submenu_ids:HashMap<usize,String>,
    pub submenu_hover: Option<usize>,
    pub submenu_open_at: Option<f64>,
    pub submenu_close_at: Option<f64>,
    pub menu_offset: f64,
    pub menu_extent: f64,
    pub menu_viewport: f64,
    pub parent_menu:Option<(u32,usize)>,
    pub shortcuts:Vec<TextLayout>,
    pub visual: super::overlay_visual::OverlayVisual,
    pub needs_focus: bool,
    pub manual_tooltip: bool,
    pub local_horizontal_offset: bool,
    pub local_vertical_offset: bool,
    pub tooltip_keyboard: bool,
    pub order: u64,
    pub restore: Option<u32>,
    pub pending: Option<u32>,
    pub request: u32,
    pub actual: OverlayPlacement,
    pub hover_since: Option<f64>,
    pub expires: Option<f64>,
    pub dismissed: bool,
    pub selected: Option<usize>,
    pub pressed: Option<usize>,
    pub rows: Vec<Rect>,
    pub labels: Vec<TextLayout>,
    pub narrow: bool,
    pub check_label: TextLayout,
    pub radio_label: TextLayout,
    pub icons:Vec<TextLayout>,
    pub chevron_label:TextLayout,
    pub shortcut_width:f64,
    pub row_heights:Vec<f64>,
    pub parts:Vec<super::menu_presenter::MenuRowParts>,
}
pub(super) fn menu_thickness(key: &str) -> [f64; 4] {
    std::array::from_fn(|i| contract()["menuLayout"][key][i].as_f64().unwrap())
}
pub(super) fn menu_padding(narrow: bool) -> [f64; 4] {
    menu_thickness(if narrow { "narrowPadding" } else { "padding" })
}
pub(super) fn menu_placeholder(items: &[MenuEntry]) -> f64 {
    let checks=items.iter().any(|item|matches!(item.kind,MenuEntryKind::Toggle|MenuEntryKind::Radio)||item.checked);
    let icons=items.iter().any(|item|!item.icon.is_empty());
    (usize::from(checks)+usize::from(icons)) as f64 * contract()["menuLayout"]["placeholder"].as_f64().unwrap()
}
pub(super) fn menu_row_height(separator: bool, label: &TextLayout, narrow: bool, dpr: f64) -> f64 {
    let raw = if separator {
        let p = menu_thickness("separatorPadding");
        contract()["menuLayout"]["separatorHeight"]
            .as_f64()
            .unwrap()
            + p[1]
            + p[3]
    } else {
        let p = menu_padding(narrow);
        let margin = menu_thickness("itemMargin");
        label.height + p[1] + p[3] + margin[1] + margin[3]
    };
    (raw * dpr - 1e-9).ceil() / dpr
}
/// XAML layout rounds each border thickness to device pixels before measuring its child.
pub(super) fn border_thickness(values: [f64; 4], dpr: f64) -> [f64; 4] {
    values.map(|v| (v * dpr).round_ties_even() / dpr)
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OverlaySnapshot {
    pub is_open: bool,
    pub opacity: f64,
    pub offset: [f64; 2],
    pub clip: Rect,
    pub active: bool,
    pub actual_placement: OverlayPlacement,
    pub pending_close: Option<u32>,
    pub selected_index: Option<usize>,
    pub rows: Vec<Rect>,
    pub menu_parts:Vec<super::menu_presenter::MenuRowParts>,
    pub order: u64,
}
impl OverlayState {
    pub fn snapshot(&self, kind: NodeKind, rect: Rect, time: f64) -> OverlaySnapshot {
        let offset = self.visual.offset(kind, self.actual, rect.height, time);
        let window = super::overlay_visual::window_bounds(kind, rect);
        let mut clip = Rect::new(
            window.x - rect.x - offset[0],
            window.y - rect.y - offset[1],
            window.width,
            window.height,
        );
        if let Some(split) = self
            .visual
            .split_clip(Rect::new(0., 0., rect.width, rect.height), time)
        {
            let left = clip.x.max(split.x);
            let top = clip.y.max(split.y);
            clip = Rect::new(
                left,
                top,
                (clip.x + clip.width).min(split.x + split.width) - left,
                (clip.y + clip.height).min(split.y + split.height) - top,
            );
            clip.width = clip.width.max(0.);
            clip.height = clip.height.max(0.);
        }
        OverlaySnapshot {
            is_open: self.open,
            opacity: self.visual.opacity.value(time),
            offset,
            clip,
            active: self.visual.active(time),
            actual_placement: self.actual,
            pending_close: self.pending,
            selected_index: self.selected,
            rows: self.rows.clone(),
            menu_parts:self.parts.clone(),
            order: self.order,
        }
    }
}
/// Anchor rectangles are in root DIPs. Popup offsets use the immediate parent's origin.
pub fn place(
    anchor: Rect,
    size: [f64; 2],
    viewport: [f64; 2],
    requested: OverlayPlacement,
    gap: f64,
) -> (Rect, OverlayPlacement) {
    use OverlayPlacement::*;
    let [w, h] = [
        size[0].min(viewport[0]).max(0.),
        size[1].min(viewport[1]).max(0.),
    ];
    let candidates = match requested {
        Auto | Top => [Top, Bottom, Right, Left],
        Bottom | BottomEdgeAlignedLeft | BottomEdgeAlignedRight => [Bottom, Top, Right, Left],
        Left | LeftEdgeAlignedTop => [Left, Right, Top, Bottom],
        Right | RightEdgeAlignedTop => [Right, Left, Top, Bottom],
    };
    let candidate = |side| match side {
        Top => Rect::new(
            if requested == BottomEdgeAlignedLeft {
                anchor.x
            } else if requested==BottomEdgeAlignedRight { anchor.x+anchor.width-w } else {
                anchor.x + (anchor.width - w) / 2.
            },
            anchor.y - h - gap,
            w,
            h,
        ),
        Bottom => Rect::new(
            if requested == BottomEdgeAlignedLeft {
                anchor.x
            } else if requested==BottomEdgeAlignedRight { anchor.x+anchor.width-w } else {
                anchor.x + (anchor.width - w) / 2.
            },
            anchor.y + anchor.height + gap,
            w,
            h,
        ),
        Left => Rect::new(
            anchor.x - w - gap,
            if matches!(requested, RightEdgeAlignedTop | LeftEdgeAlignedTop) { anchor.y } else { anchor.y + (anchor.height - h) / 2. },
            w,
            h,
        ),
        _ => Rect::new(
            anchor.x + anchor.width + gap,
            if matches!(requested, RightEdgeAlignedTop | LeftEdgeAlignedTop) { anchor.y } else { anchor.y + (anchor.height - h) / 2. },
            w,
            h,
        ),
    };
    let score = |r: Rect| (r.x + r.width).min(viewport[0]).min(r.width + r.x.max(0.)) - r.x.max(0.);
    let mut best = (candidate(candidates[0]), candidates[0], -1.);
    for side in candidates {
        let mut r = candidate(side);
        if matches!(side, Top | Bottom) {
            r.x = r.x.clamp(0., (viewport[0] - w).max(0.));
        } else {
            r.y = r.y.clamp(0., (viewport[1] - h).max(0.));
        }
        let area = score(r).max(0.) * ((r.y + r.height).min(viewport[1]) - r.y.max(0.)).max(0.);
        if area > best.2 {
            best = (r, side, area);
        }
        if r.x >= 0. && r.y >= 0. && r.x + w <= viewport[0] && r.y + h <= viewport[1] {
            best = (r, side, area);
            break;
        }
    }
    best.0.x = best.0.x.clamp(0., (viewport[0] - w).max(0.));
    best.0.y = best.0.y.clamp(0., (viewport[1] - h).max(0.));
    (best.0, best.1)
}
/// ToolTipPositioning uses integer-DIP RECT/SIZE values before device rounding.
/// Offset inflates its docking rectangle instead of translating its center.
pub fn place_tooltip(
    anchor: Rect,
    size: [f64; 2],
    viewport: [f64; 2],
    requested: OverlayPlacement,
    offset: [f64; 2],
) -> (Rect, OverlayPlacement) {
    let [ox, oy] = offset.map(f64::trunc);
    let left = anchor.x.trunc() - ox;
    let top = anchor.y.trunc() - oy;
    let right = (anchor.x + anchor.width).trunc() + ox;
    let bottom = (anchor.y + anchor.height).trunc() + oy;
    let (mut rect, side) = place(
        Rect::new(left, top, (right - left).max(0.), (bottom - top).max(0.)),
        size.map(f64::trunc),
        viewport.map(f64::trunc),
        requested,
        0.,
    );
    rect.x = rect.x.floor();
    rect.y = rect.y.floor();
    rect.width = size[0].min(viewport[0]);
    rect.height = size[1].min(viewport[1]);
    (rect, side)
}
pub(super) fn brush(theme: Theme, key: &str) -> crate::resources::Brush {
    let name = theme.as_str();
    let value = &contract()["palettes"][name][key];
    if !value.is_null() {
        return serde_json::from_value(value.clone()).expect("native overlay palette");
    }
    let aliases = &contract()["aliases"][if theme == Theme::Dark {
        "Default"
    } else {
        name
    }];
    let alias = aliases[key].as_str().unwrap_or(key);
    Resources::current()
        .resolve(theme, alias)
        .cloned()
        .expect("audited overlay brush is missing")
}
impl Scene {
    pub(super) fn floating_input(&mut self, input: &Input) -> Result<bool, String> {
        match input {
            Input::CloseOverlay { id } => {
                self.request_overlay_close(*id)?;
                return Ok(true);
            }
            Input::ResolveOverlay {
                id,
                request,
                cancel,
            } => {
                self.resolve_overlay_close(*id, *request, *cancel)?;
                return Ok(true);
            }
            Input::MenuInvoke { id, index } => {
                self.invoke_menu(*id, *index)?;
                return Ok(true);
            }
            Input::KeyDown { key, .. } => {
                if self.overlay_key(key)? {
                    return Ok(true);
                }
                if let Some(id) = self
                    .focused
                    .filter(|id| self.nodes[id].kind == NodeKind::Slider && self.nodes[id].enabled)
                {
                    return self.slider_key(id, key);
                }
            }
            Input::Move { x, y, pointer } => {
                self.overlay_pointer(*x, *y);
                if let Some((captured, id)) = self.captured {
                    if captured == *pointer && self.nodes[&id].kind == NodeKind::Slider {
                        self.slider_pointer(id, *x, *y)?;
                        return Ok(true);
                    }
                }
            }
            Input::Down { x, y, pointer } => {
                self.overlay_pointer(*x, *y);
                if self.overlay_down(*x, *y)? {
                    return Ok(true);
                }
                if let Some(id) = self.hit(*x, *y) {
                    if self.nodes[&id].kind == NodeKind::Slider {
                        self.focus(Some(id));
                        self.captured = Some((*pointer, id));
                        self.nodes.get_mut(&id).unwrap().button.pressed = true;
                        self.slider_pointer(id, *x, *y)?;
                        return Ok(true);
                    }
                    if self.nodes[&id].kind == NodeKind::MenuFlyout {
                        self.focus(Some(id));
                        self.captured = Some((*pointer, id));
                        self.nodes.get_mut(&id).unwrap().overlay.pressed =
                            self.nodes[&id].overlay.selected;
                        return Ok(true);
                    }
                }
            }
            Input::Up { x, y, pointer } => {
                if let Some((captured, id)) = self.captured {
                    if captured == *pointer {
                        if self.nodes[&id].kind == NodeKind::Slider {
                            let n = self.nodes.get_mut(&id).unwrap();
                            n.button.pressed = false;
                            n.button.pointer_inside = false;
                            n.slider.tooltip_dismissed = true;
                            self.captured = None;
                            return Ok(true);
                        }
                        if self.nodes[&id].kind == NodeKind::MenuFlyout {
                            self.captured = None;
                            let n = &self.nodes[&id];
                            let (x, y) = n.world.inverse().unwrap_or_default().point(*x, *y);
                            if let Some(index) =
                                n.overlay.rows.iter().position(|r| r.contains(x, y))
                            {
                                if n.overlay.pressed == Some(index) {
                                    self.invoke_menu(id, index)?;
                                }
                            }
                            return Ok(true);
                        }
                    }
                }
            }
            _ => {}
        }
        Ok(false)
    }
    pub(super) fn overlay_ids(&self) -> Vec<u32> {
        let mut ids: Vec<_> = self
            .nodes
            .values()
            .filter(|n| is_overlay(n.kind) && (n.navigation_template.owner.is_none()||n.kind==NodeKind::ToolTip) && n.overlay.visual.shown(self.time) && n.visible)
            .map(|n| n.id)
            .collect();
        ids.sort_by_key(|id| self.nodes[id].overlay.order);
        ids
    }
    /// Local native window bounds for platform input projection. ToolTips do
    /// not receive input; child controls continue to receive normal events.
    pub fn floating_input_regions(&self) -> Vec<(u32, Rect)> {
        self.overlay_ids().into_iter().filter_map(|id| {
            let n=&self.nodes[&id];
            if !n.overlay.open || n.kind==NodeKind::ToolTip || !n.props.is_hit_test_visible {return None;}
            let mut rect=super::overlay_visual::window_bounds(n.kind,Rect::new(0.,0.,n.rect.width,n.rect.height));
            if n.composed.owner.is_some_and(|owner|self.nodes[&owner].kind==NodeKind::TeachingTip) {
                rect=Rect::new(rect.x-8.,rect.y-8.,rect.width+16.,rect.height+16.);
            }
            Some((id,rect))
        }).collect()
    }
    pub(super) fn descendant_of(&self, mut id: u32, parent: u32) -> bool {
        loop {
            if id == parent {
                return true;
            }
            let Some(next) = self.nodes.get(&id).and_then(|n| n.parent) else {
                return false;
            };
            id = next;
        }
    }
    pub(super) fn sync_overlays(&mut self) {
        let ids: Vec<_> = self
            .nodes
            .values()
            .filter(|n| is_overlay(n.kind)&&(n.navigation_template.owner.is_none()||n.kind==NodeKind::ToolTip))
            .map(|n| n.id)
            .collect();
        for id in ids {
            let n = &self.nodes[&id];
            let mut eligible = n.props.visible && n.props.enabled;
            let mut presentation_eligible=eligible;
            let mut parent = n.parent;
            while let Some(p) = parent {
                let n = &self.nodes[&p];
                presentation_eligible &= n.props.visible && n.props.enabled;
                eligible &=
                    n.props.visible && n.props.enabled && (!is_overlay(n.kind) || n.props.is_open);
                parent = n.parent;
            }
            if let Some(target) = n.props.placement_target {
                eligible &= self
                    .nodes
                    .get(&target)
                    .is_some_and(|n| n.visible && n.enabled);
            }
            eligible &= self.placement_reference_ready(id);
            let open = eligible && n.props.is_open;
            let closing_with_owner=n.overlay.visual.command_overflow && presentation_eligible && n.command.owner.and_then(|bar|self.nodes.get(&bar)).and_then(|bar|bar.menu.owner).and_then(|owner|self.nodes.get(&owner)).is_some_and(|owner|owner.kind==NodeKind::CommandBarFlyout && !owner.props.is_open && owner.overlay.visual.shown(self.time));
            let reduced = self.reduced_motion || n.theme == Theme::HighContrast || (!eligible && !closing_with_owner);
            if open == n.overlay.open {
                continue;
            }
            self.revision += 1;
            if open {
                let restore = self.focused;
                let n = self.nodes.get_mut(&id).unwrap();
                n.overlay.open = true;
                n.overlay.visual.closing_with_owner=false;
                n.overlay.order = self.revision;
                n.overlay.restore = restore;
                n.overlay.pending = None;
                n.overlay.selected = None;
                n.overlay.pressed = None;
                n.overlay.needs_focus = true;
                n.overlay.narrow = self.menu_input_narrow;
                n.overlay
                    .visual
                    .transition(n.kind, true, self.time, reduced);
                self.emit(id, EventKind::Opening);

                if self.overlay_auto_focus(id) && self.nodes[&id].kind != NodeKind::ToolTip {
                    let first = self.command_first_overflow(id).or_else(|| self
                        .nodes
                        .values()
                        .find(|n| {
                            n.id != id
                                && self.descendant_of(n.id, id)
                                && n.props.is_tab_stop
                                && self.effective_enabled(n.id)
                                && n.props.visible
                                && (crate::selection::is_button(n.kind)
                                    || text_edit::is_editor(n.kind)
                                    || matches!(
                                        n.kind,
                                        NodeKind::Slider | NodeKind::NavigationView
                                    ))
                        })
                        .map(|n| n.id));
                    if let Some(first) =
                        first.or((self.nodes[&id].kind == NodeKind::MenuFlyout).then_some(id))
                    {
                        self.focus(Some(first));
                        self.nodes.get_mut(&id).unwrap().overlay.needs_focus = false;
                    }
                }
            } else {
                let n = self.nodes.get_mut(&id).unwrap();
                n.overlay.visual.closing_with_owner=closing_with_owner;
                n.overlay.open = false;
                n.overlay.pending = None;
                n.overlay
                    .visual
                    .transition(n.kind, false, self.time, reduced);
                let restore = n.overlay.restore.take();
                let restore_focus = n.props.restore_focus;
                if self.focused.is_some_and(|f| self.descendant_of(f, id)) {
                    self.focus(if restore_focus {
                        restore.filter(|f| self.effective_enabled(*f))
                    } else {
                        None
                    });
                }
            }
            self.invalidate(id, true);
        }
        self.finish_overlay_visuals();
    }
    pub(super) fn layout_overlays(&mut self, measure: &mut impl TextMeasurer) {
        let ids = self.overlay_ids();
        for id in ids {
            self.nodes
                .get_mut(&id)
                .unwrap()
                .overlay
                .visual
                .begin_frame(self.time);
            // A native popup belongs to its window, even when its anchor lives
            // in a short auto-height scene. Composed controls retain their own
            // owner-specific placement contract.
            let window_popup = self.nodes[&id].composed.owner.is_none_or(|owner|
                matches!(self.nodes[&owner].kind, NodeKind::NumberBox | NodeKind::AutoSuggestBox | NodeKind::ComboBox | NodeKind::TeachingTip | NodeKind::CalendarDatePicker | NodeKind::DatePicker | NodeKind::TimePicker));
            let bounds = if window_popup { self.popup_viewport } else { None }
                .unwrap_or(Rect::new(0.,0.,self.width,self.height));
            let desired = self.measure_node(id, [bounds.width,bounds.height], measure);
            let n = &self.nodes[&id];
            let p = n.props.clone();
            let kind = n.kind;
            let parent = n.parent.unwrap_or(self.root);
            let pn = &self.nodes[&parent];
            let inherited = (p.theme.unwrap_or(pn.theme), pn.enabled, pn.visible);
            let parent_world = pn.world;
            let theme = inherited.0;
            if self.reduced_motion || theme == Theme::HighContrast {
                let n = self.nodes.get_mut(&id).unwrap();
                n.overlay.visual.settle(n.overlay.open);
            }

            let (rect, actual) = if let Some((owner,index)) = self.nodes[&id].overlay.parent_menu {
                let row=self.nodes[&owner].overlay.rows.get(index).copied().unwrap_or_default();
                let mut anchor=self.nodes[&owner].world.bounds(Rect::new(0.,row.y,self.nodes[&owner].rect.width,row.height));
                anchor.x-=bounds.x;anchor.y-=bounds.y;
                let rtl=self.effective_flow_direction(owner)==FlowDirection::RightToLeft;
                let (mut rect,side)=place(anchor,desired,[bounds.width,bounds.height],if rtl {OverlayPlacement::LeftEdgeAlignedTop}else{OverlayPlacement::RightEdgeAlignedTop},0.);
                rect.x+=bounds.x;rect.y+=bounds.y;(rect,side)
            } else if let Some(placement) = self.picker_popup_placement(id, desired).or_else(||self.composed_popup_placement(id, desired))
            {
                placement
            } else if let Some(point) = p
                .placement_position
                .filter(|_| matches!(kind, NodeKind::Flyout | NodeKind::MenuFlyout | NodeKind::CommandBarFlyout))
            {
                let target = &self.nodes[&p.placement_target.unwrap_or(parent)];
                let (x, y) = target.world.point(point[0], point[1]);
                let w = desired[0].min(bounds.width);
                let h = desired[1].min(bounds.height);
                (
                    Rect::new(
                        x.clamp(bounds.x, bounds.x+(bounds.width-w).max(0.)),
                        y.clamp(bounds.y, bounds.y+(bounds.height-h).max(0.)),
                        w,
                        h,
                    ),
                    OverlayPlacement::Bottom,
                )
            } else if kind == NodeKind::Popup && p.placement_target.is_none() {
                let (x, y) = parent_world.point(p.horizontal_offset, p.vertical_offset);
                (
                    Rect::new(
                        x,
                        y,
                        desired[0].min(bounds.width),
                        desired[1].min(bounds.height),
                    ),
                    p.placement,
                )
            } else {
                let target = p.placement_target.unwrap_or(parent);
                let target = &self.nodes[&target];
                let local = if target.kind == NodeKind::Slider {
                    self.slider_geometry(target.id).thumb
                } else {
                    Rect::new(0., 0., target.rect.width, if target.kind==NodeKind::CommandBar{self.command_primary_clip(target.id).height}else{target.rect.height})
                };
                let mut anchor = target.world.bounds(local);
                anchor.x-=bounds.x;anchor.y-=bounds.y;
                if kind == NodeKind::ToolTip {
                    let state = &self.nodes[&id].overlay;
                    let automatic = !state.manual_tooltip && target.kind != NodeKind::Slider;
                    let default = contract()["toolTipPlacement"][if state.tooltip_keyboard {
                        "DEFAULT_KEYBOARD_OFFSET"
                    } else {
                        "DEFAULT_MOUSE_OFFSET"
                    }]
                    .as_f64()
                    .unwrap();
                    let offsets = [
                        if automatic && !state.local_horizontal_offset {
                            default
                        } else {
                            p.horizontal_offset
                        },
                        if automatic && !state.local_vertical_offset {
                            default
                        } else {
                            p.vertical_offset
                        },
                    ];
                    let (mut rect,actual)=place_tooltip(
                        anchor,
                        desired,
                        [bounds.width,bounds.height],
                        p.placement,
                        offsets,
                    );rect.x+=bounds.x;rect.y+=bounds.y;(rect,actual)
                } else {
                    anchor.x += p.horizontal_offset;
                    anchor.y += p.vertical_offset;
                    let preferred=if self.nodes[&id].command.role=="overflow"&&desired[0]>target.rect.width{OverlayPlacement::BottomEdgeAlignedLeft}else{p.placement};
                    let (mut rect,actual)=place(anchor,desired,[bounds.width,bounds.height],preferred,if target.kind==NodeKind::CommandBar{0.}else{4.});rect.x+=bounds.x;rect.y+=bounds.y;(rect,actual)
                }
            };
            let owner = self.nodes[&id]
                .composed
                .owner
                .and_then(|id| self.nodes.get(&id));
            let anchor = owner
                .and_then(|n| n.props.placement_target)
                .and_then(|id| self.nodes.get(&id))
                .map(|n| {
                    n.world
                        .bounds(Rect::new(0., 0., n.rect.width, n.rect.height))
                });
            let center = anchor
                .map(|a| {
                    [
                        (a.x + a.width / 2. - rect.x).clamp(0., rect.width),
                        (a.y + a.height / 2. - rect.y).clamp(0., rect.height),
                    ]
                })
                .unwrap_or([rect.width / 2., rect.height / 2.]);
            let visual = &mut self.nodes.get_mut(&id).unwrap().overlay.visual;
            visual.scale_bounds = [rect.width, rect.height];
            if visual.profile != Some(NodeKind::ComboBox) {
                visual.scale_center = center;
            }
            self.nodes.get_mut(&id).unwrap().overlay.actual = actual;
            if let Some(owner) = self.nodes[&id]
                .composed
                .owner
                .filter(|owner| self.nodes[owner].kind == NodeKind::TeachingTip)
            {
                let close = self.nodes[&owner].composed.parts["AlternateCloseButton"];
                let border = border_thickness(self.nodes[&id].props.border_thickness, self.dpr);
                self.nodes.get_mut(&close).unwrap().props.canvas_left =
                    Some((rect.width - border[0] - border[2] - 24. - 28.).max(0.));
            }
            if let Some(owner) = self.nodes[&id]
                .composed
                .owner
                .filter(|owner| self.nodes[owner].kind == NodeKind::ContentDialog)
            {
                let panel = self.nodes[&owner].composed.parts["DialogBorder"];
                let amount = self.nodes[&id].overlay.visual.entrance.value(self.time);
                let closed = super::composed::motion()["contentDialog"]["closedScale"]
                    .as_f64()
                    .unwrap();
                let scale = closed - (closed - 1.) * amount;
                let size = self.nodes[&panel].desired_without_margin;
                self.nodes.get_mut(&panel).unwrap().props.transform = [
                    scale,
                    0.,
                    0.,
                    scale,
                    (1. - scale) * size[0] / 2.,
                    (1. - scale) * size[1] / 2.,
                ];
            }
            self.arrange_node(id, rect, Matrix::default(), inherited, measure);
            self.composed_popup_arranged(id, measure);
            self.refresh_visual_tree(id, Matrix::default(), theme, inherited.1, inherited.2);
            if self.nodes[&id].overlay.needs_focus && self.overlay_auto_focus(id) {
                let first = self.picker_popup_focus(id).or_else(||self.command_first_overflow(id)).or_else(||self
                    .nodes
                    .values()
                    .find(|n| {
                        n.id != id
                            && self.descendant_of(n.id, id)
                            && n.visible
                            && n.enabled
                            && n.props.is_tab_stop
                            && (crate::selection::is_button(n.kind)
                                || text_edit::is_editor(n.kind)
                                || matches!(n.kind, NodeKind::Slider | NodeKind::NavigationView))
                    })
                    .map(|n| n.id));
                if let Some(first) = first {
                    self.focus(Some(first));
                    self.nodes.get_mut(&id).unwrap().overlay.needs_focus = false;
                }
            }
        }
    }
    pub(super) fn request_overlay_close(&mut self, id: u32) -> Result<(), String> {
        let n = self.get(id)?;
        if !is_overlay(n.kind) {
            return Err("node is not a floating surface".into());
        }
        if !n.overlay.open || n.overlay.pending.is_some() {
            return Ok(());
        }
        if matches!(n.kind, NodeKind::Popup | NodeKind::ToolTip) {
            return self.close_overlay(id);
        }
        let n = self.nodes.get_mut(&id).unwrap();
        n.overlay.request = n.overlay.request.wrapping_add(1);
        n.overlay.pending = Some(n.overlay.request);
        let request = n.overlay.request;
        self.emit(id, EventKind::Closing);
        self.events.last_mut().unwrap().request_id = Some(request);
        Ok(())
    }
    pub(super) fn resolve_overlay_close(
        &mut self,
        id: u32,
        request: u32,
        cancel: bool,
    ) -> Result<(), String> {
        if self.get(id)?.kind == NodeKind::InfoBar {
            self.resolve_info_close(id, request, cancel);
            return Ok(());
        }
        let n = self.get(id)?;
        if n.overlay.pending != Some(request) {
            return Ok(());
        }
        self.nodes.get_mut(&id).unwrap().overlay.pending = None;
        if !cancel {
            self.close_overlay(id)?;
        }
        Ok(())
    }
    fn close_overlay(&mut self, id: u32) -> Result<(), String> {
        let descendants: Vec<_> = self
            .nodes
            .values()
            .filter(|n| is_overlay(n.kind) && self.descendant_of(n.id, id))
            .map(|n| n.id)
            .collect();
        for child in descendants {
            self.nodes.get_mut(&child).unwrap().props.is_open = false;
            if self.nodes[&child].kind == NodeKind::ToolTip {
                self.nodes.get_mut(&child).unwrap().overlay.dismissed = true;
            }
        }
        self.sync_overlays();
        Ok(())
    }
    pub(super) fn overlay_down(&mut self, x: f64, y: f64) -> Result<bool, String> {
        for id in self
            .overlay_ids()
            .into_iter()
            .rev()
            .filter(|id| self.nodes[id].overlay.open)
            .collect::<Vec<_>>()
        {
            let n = &self.nodes[&id];
            if n.kind == NodeKind::ToolTip {
                continue;
            }
            if self.inside(id, x, y) {
                return Ok(false);
            }
            if n.props.is_light_dismiss_enabled {
                self.request_overlay_close(id)?;
                return Ok(true);
            }
        }
        Ok(false)
    }
    pub(super) fn overlay_key(&mut self, key: &str) -> Result<bool, String> {
        if key == "Escape" {
            if let Some(id) = self.overlay_ids().into_iter().rev().find(|id| {
                self.nodes[id].kind != NodeKind::ToolTip
                    && self.nodes[id].props.is_light_dismiss_enabled
            }) {
                self.request_overlay_close(id)?;
                return Ok(true);
            }
        }
        let Some(id) = self
            .focused
            .filter(|id| self.nodes[id].kind == NodeKind::MenuFlyout)
        else {
            return Ok(false);
        };
        if key == "Enter" || key == " " {
            if let Some(index) = self.nodes[&id].overlay.selected {
                self.invoke_menu(id, index)?;
            }
            return Ok(true);
        }
        let entries = &self.nodes[&id].props.menu_items;
        let enabled: Vec<_> = entries
            .iter()
            .enumerate()
            .filter(|(_, e)| e.enabled && e.kind != MenuEntryKind::Separator)
            .map(|(i, _)| i)
            .collect();
        if enabled.is_empty() {
            return Ok(false);
        }
        let at = self.nodes[&id]
            .overlay
            .selected
            .and_then(|i| enabled.iter().position(|v| *v == i));
        let next = match key {
            "Home" => Some(0),
            "End" => Some(enabled.len() - 1),
            "ArrowDown" => Some(at.map_or(0, |a| (a + 1) % enabled.len())),
            "ArrowUp" => Some(at.map_or(enabled.len() - 1, |a| {
                (a + enabled.len() - 1) % enabled.len()
            })),
            _ => None,
        };
        if let Some(next) = next {
            self.nodes.get_mut(&id).unwrap().overlay.selected = Some(enabled[next]);
            self.menu_ensure_visible(id,enabled[next]);
            return Ok(true);
        }
        Ok(false)
    }
    pub(super) fn invoke_menu(&mut self, id: u32, index: usize) -> Result<(), String> {
        self.invoke_menu_entry(id,index)
    }
    pub(super) fn overlay_pointer(&mut self, x: f64, y: f64) {
        for id in self.overlay_ids() {
            if self.nodes[&id].kind != NodeKind::MenuFlyout {
                continue;
            }
            let n = &self.nodes[&id];
            let (x, y) = n.world.inverse().unwrap_or_default().point(x, y);
            let index = n
                .overlay
                .rows
                .iter()
                .position(|r| r.contains(x, y))
                .filter(|i| {
                    n.props.menu_items[*i].enabled
                        && n.props.menu_items[*i].kind != MenuEntryKind::Separator
                });
            self.nodes.get_mut(&id).unwrap().overlay.selected = index;
        }
    }
    pub(super) fn tooltip_tick(&mut self) {
        let ids: Vec<_> = self
            .nodes
            .values()
            .filter(|n| {
                n.kind == NodeKind::ToolTip
                    && !n.overlay.manual_tooltip
                    && n.props.placement_target.is_some_and(|target| {
                        self.nodes
                            .get(&target)
                            .is_none_or(|n| n.kind != NodeKind::Slider)
                    })
            })
            .map(|n| n.id)
            .collect();
        for id in ids {
            let n = &self.nodes[&id];
            let target = n.props.placement_target.unwrap();
            let hovered = self.pointer.is_some_and(|(x, y)| {
                self.nodes.contains_key(&target) && self.inside(target, x, y)
            });
            let focused = self.focused == Some(target)||self.nodes.get(&target).is_some_and(|n|n.navigation_template.owner.zip(n.navigation_template.action.as_ref()).is_some_and(|(owner,key)|self.focused==Some(owner)&&self.nodes[&owner].nav.as_ref().is_some_and(|nav|nav.focused.as_ref()==Some(key))));
            let eligible = self
                .nodes
                .get(&target)
                .is_some_and(|n| n.visible && n.enabled)
                && (hovered || focused);
            let state = &mut self.nodes.get_mut(&id).unwrap().overlay;
            state.tooltip_keyboard = focused;
            if !eligible {
                state.hover_since = None;
                state.expires = None;
                state.dismissed = false;
                if state.open {
                    self.nodes.get_mut(&id).unwrap().props.is_open = false;
                }
            } else if !state.dismissed {
                let start = *state.hover_since.get_or_insert(self.time);
                let delay = if focused {
                    0.
                } else {
                    contract()["toolTipService"]["DEFAULT_SPI_GETMOUSEHOVERTIME"]
                        .as_f64()
                        .unwrap()
                };
                if self.time >= start + delay {
                    let expires = *state.expires.get_or_insert(
                        self.time
                            + contract()["toolTipService"]["DEFAULT_SHOW_DURATION_SECONDS"]
                                .as_f64()
                                .unwrap()
                                * 1000.,
                    );
                    if self.time >= expires {
                        state.dismissed = true;
                        self.nodes.get_mut(&id).unwrap().props.is_open = false;
                    } else {
                        self.nodes.get_mut(&id).unwrap().props.is_open = true;
                    }
                }
            }
        }
        self.sync_overlays();
    }
    pub(super) fn overlay_deadline(&self) -> Option<f64> {
        self.nodes
            .values()
            .filter(|n| n.kind == NodeKind::ToolTip && !n.overlay.dismissed)
            .filter_map(|n| {
                if n.overlay.open {
                    n.overlay.expires
                } else {
                    n.overlay.hover_since.map(|t| t + 400.)
                }
            })
            .filter(|t| *t > self.time)
            .min_by(f64::total_cmp)
    }
    pub(super) fn paint_menu(&self,id:u32,out:&mut Vec<Draw>){self.paint_menu_presenter(id,out);}
}
