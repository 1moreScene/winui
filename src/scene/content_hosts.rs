//! Content hosts and a scene-resident Frame. Layout follows ContentPresenter.cpp;
//! navigation reuses crate::frame, including the existing native-derived motion.
use super::*;
use crate::frame::{Command, Frame};
use serde_json::{json, Value};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
#[derive(PartialEq)]
pub struct TemplateNode {
    pub kind: NodeKind,
    #[serde(default)]
    pub name: String,
    #[serde(default = "empty_object")]
    pub properties: Value,
    #[serde(default)]
    pub children: Vec<TemplateNode>,
}
fn empty_object() -> Value {
    json!({})
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
#[derive(PartialEq)]
pub struct PageDefinition {
    pub key: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub cache_mode: NavigationCacheMode,
    #[serde(default)]
    pub content: Option<TemplateNode>,
    #[serde(default)]
    pub content_resource: Option<String>,
}
fn page_content(page:&PageDefinition)->Result<TemplateNode,String>{
    match (&page.content,&page.content_resource){
        (Some(content),None)=>Ok(content.clone()),
        (None,Some(key))=>crate::content::template(key).map(|n|super::navigation_view::legacy_content(&n)),
        _=>Err("A Page requires exactly one content or contentResource".into()),
    }
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
#[derive(PartialEq)]
pub struct HostProperties {
    pub content: Option<String>,
    pub content_template: Option<TemplateNode>,
    pub pages: Vec<PageDefinition>,
    pub cache_size: usize,
}
impl Default for HostProperties {
    fn default() -> Self {
        Self {
            content: None,
            content_template: None,
            pages: vec![],
            cache_size: 10,
        }
    }
}
#[derive(Clone)]
struct Pending {
    request: u32,
    command: Command,
    payload: Value,
}
#[derive(Default)]
pub struct HostState {
    pub(super) owner: Option<u32>,
    pub(super) creating: bool,
    generated: Option<u32>,
    signature: String,
    pub(super) frame: Frame,
    instances: BTreeMap<u32, u32>,
    pending: Option<Pending>,
    next_request: u32,
}
pub fn is_host(k: NodeKind) -> bool {
    matches!(
        k,
        NodeKind::ContentControl
            | NodeKind::ContentPresenter
            | NodeKind::UserControl
            | NodeKind::Page
            | NodeKind::Frame
    )
}
pub fn props(p: &NodeProperties) -> HostProperties {
    p.content_host.as_deref().cloned().unwrap_or_default()
}
pub fn defaults(k: NodeKind, p: &mut NodeProperties) {
    if !is_host(k) {
        return;
    }
    p.content_host = Some(Box::default());
    p.is_tab_stop = false;
    p.horizontal_content_alignment = if matches!(
        k,
        NodeKind::ContentPresenter | NodeKind::UserControl | NodeKind::Page | NodeKind::Frame
    ) {
        HorizontalAlignment::Stretch
    } else {
        HorizontalAlignment::Left
    };
    p.vertical_content_alignment = if matches!(
        k,
        NodeKind::ContentPresenter | NodeKind::UserControl | NodeKind::Page | NodeKind::Frame
    ) {
        VerticalAlignment::Stretch
    } else {
        VerticalAlignment::Top
    };
    if k == NodeKind::Frame {
        p.clip = true;
    }
}
fn validate_template(t: &TemplateNode, depth: usize, count: &mut usize) -> Result<(), String> {
    *count += 1;
    if depth > 24 || *count > 512 {
        return Err("Content template exceeds depth/node budget".into());
    }
    if t.kind == NodeKind::Frame || t.properties.get("contentHost").is_some() {
        return Err("Nested Frame/host definitions are not supported in content templates".into());
    }
    if !matches!(
        t.kind,
        NodeKind::Grid
            | NodeKind::StackPanel
            | NodeKind::Canvas
            | NodeKind::Border
            | NodeKind::Viewbox
            | NodeKind::WrapPanel
            | NodeKind::RelativePanel
            | NodeKind::ScrollViewer
            | NodeKind::ScrollView
            | NodeKind::ContentControl
            | NodeKind::ContentPresenter
            | NodeKind::Page
            | NodeKind::UserControl
            | NodeKind::TextBlock
            | NodeKind::Image
            | NodeKind::Rectangle
            | NodeKind::Ellipse
            | NodeKind::Line
            | NodeKind::Path
            | NodeKind::Polygon
            | NodeKind::Polyline
            | NodeKind::FontIcon
            | NodeKind::SymbolIcon
            | NodeKind::PathIcon
            | NodeKind::Button
            | NodeKind::ToggleButton
            | NodeKind::CheckBox
            | NodeKind::RadioButton
            | NodeKind::ToggleSwitch
            | NodeKind::TextBox
                        | NodeKind::RichEditBox
            | NodeKind::PasswordBox
            | NodeKind::AutoSuggestBox
            | NodeKind::InfoBadge
            | NodeKind::AnimatedIcon
            | NodeKind::IconSourceElement
            | NodeKind::BitmapIcon
            | NodeKind::ImageIcon
            | NodeKind::HyperlinkButton
            | NodeKind::NavigationViewItem
    ) {
        return Err("Unsupported content template node; use an explicit child tree".into());
    }
    properties::create(&mut t.properties.clone(), t.kind, None)?;
    if t.children.len() > 1
        && matches!(
            t.kind,
            NodeKind::ContentControl
                | NodeKind::ContentPresenter
                | NodeKind::UserControl
                | NodeKind::Page
                | NodeKind::Border
                | NodeKind::Viewbox
                | NodeKind::ScrollViewer
                | NodeKind::ScrollView
        )
    {
        return Err("Content template host accepts one child".into());
    }
    // Template children must use ordinary public containment contracts. Internal
    // collection/template parts cannot be instantiated by arbitrary descriptions.
    if !t.children.is_empty()
        && !matches!(
            t.kind,
            NodeKind::Grid
                | NodeKind::StackPanel
                | NodeKind::Canvas
                | NodeKind::Border
                | NodeKind::Viewbox
                | NodeKind::ScrollViewer
                | NodeKind::ScrollView
                | NodeKind::WrapPanel
                | NodeKind::RelativePanel
                | NodeKind::ContentControl
                | NodeKind::ContentPresenter
                | NodeKind::UserControl
                | NodeKind::Page
                | NodeKind::Button
                | NodeKind::ToggleButton
        )
    {
        return Err("Unsupported template child container".into());
    }
    if matches!(
        t.kind,
        NodeKind::CollectionItem
            | NodeKind::CollectionHeader
            | NodeKind::UICommand
            | NodeKind::StandardCommand
    ) {
        return Err("Internal and command nodes cannot be content template roots".into());
    }
    for child in &t.children {
        validate_template(child, depth + 1, count)?;
    }
    Ok(())
}
/// Validate a public descriptor before a navigation/template transaction commits.
pub(crate) fn validate_descriptor(t: &TemplateNode) -> Result<(), String> {
    validate_template(t, 0, &mut 0)
}
pub fn validate(p: &NodeProperties) -> Result<(), String> {
    let Some(q) = &p.content_host else {
        return Ok(());
    };
    if q.cache_size > 10000
        || q.pages.len() > 128
        || q.content.as_ref().is_some_and(|s| s.len() > 1_000_000)
    {
        return Err("Content host budget exceeded".into());
    }
    if q.content.is_some() && q.content_template.is_some() {
        return Err("Use content or contentTemplate".into());
    }
    let mut count = 0;
    if let Some(t) = &q.content_template {
        validate_template(t, 0, &mut count)?;
    }
    let mut keys = std::collections::HashSet::new();
    for page in &q.pages {
        if page.key.is_empty() || page.key.len() > 1024 || !keys.insert(&page.key) {
            return Err("Page keys must be nonempty and unique".into());
        }
        validate_template(&page_content(page)?, 0, &mut count)?;
    }
    Ok(())
}
impl Scene {
    pub(super) fn preflight_content_host(
        &self,
        parent: u32,
        kind: NodeKind,
        p: &NodeProperties,
    ) -> Result<(), String> {
        if !is_host(kind) {
            return Ok(());
        }
        let q = props(p);
        if q.content.is_some() && self.nodes.len() + 2 > 5000 {
            return Err("Content host exceeds scene node budget".into());
        }
        if kind == NodeKind::Frame && (q.content.is_some() || q.content_template.is_some()) {
            return Err("Frame content comes from pages".into());
        }
        if kind != NodeKind::Frame && !q.pages.is_empty() {
            return Err("pages is only valid on Frame".into());
        }
        if let Some(t) = &q.content_template {
            fn budget(t: &TemplateNode) -> (usize, usize) {
                let children = t.children.iter().map(budget).collect::<Vec<_>>();
                (
                    1 + children.iter().map(|b| b.0).sum::<usize>(),
                    1 + children.iter().map(|b| b.1).max().unwrap_or(0),
                )
            }
            let (count, depth) = budget(t);
            let mut at = Some(parent);
            let mut ancestors = 0;
            while let Some(id) = at {
                ancestors += 1;
                at = self.nodes[&id].parent;
            }
            if self.nodes.len() + count + 1 > 5000 || ancestors + depth + 1 >= 64 {
                return Err("Content template exceeds scene budget".into());
            }
            let mut probe = Scene::new(self.theme, true);
            probe.instantiate_content(probe.root, t)?;
        }
        Ok(())
    }
    pub(super) fn validate_host_patch(&self, id: u32, p: &NodeProperties) -> Result<(), String> {
        let n = &self.nodes[&id];
        if !is_host(n.kind) {
            return Ok(());
        }
        self.preflight_content_host(n.parent.unwrap_or(self.root), n.kind, p)?;
        let q = props(p);
        if n.kind == NodeKind::Frame {
            if q.content.is_some() || q.content_template.is_some() {
                return Err("Frame content comes from registered pages".into());
            }
            if (!n.content_host.instances.is_empty() || n.content_host.pending.is_some())
                && serde_json::to_value(&q.pages).unwrap()
                    != serde_json::to_value(props(&n.props).pages).unwrap()
            {
                return Err("Page definitions cannot change while a Frame retains pages; create a new Frame".into());
            }
        } else if !q.pages.is_empty() {
            return Err("pages is only valid on Frame".into());
        }
        if (q.content.is_some() || q.content_template.is_some())
            && n.children.iter().any(|c| {
                !overlays::is_overlay(self.nodes[c].kind)
                    && self.nodes[c].content_host.owner != Some(id)
            })
        {
            return Err("Use content/template or a child element".into());
        }
        Ok(())
    }
    pub(super) fn instantiate_content(&mut self, parent: u32, t: &TemplateNode) -> Result<u32, String> {
        let mut p = t.properties.clone();
        if !t.name.is_empty() {
            p.as_object_mut()
                .ok_or("Template properties must be an object")?
                .insert("layoutKey".into(), json!(t.name));
        }
        let id = self.create(parent, t.kind, p)?;
        for child in &t.children {
            self.instantiate_content(id, child)?;
        }
        Ok(id)
    }
    pub(super) fn sync_content_hosts(&mut self) {
        let ids = self
            .nodes
            .values()
            .filter(|n| is_host(n.kind))
            .map(|n| n.id)
            .collect::<Vec<_>>();
        for id in ids {
            if self.nodes.contains_key(&id) {
                self.sync_content_host(id)
                    .expect("validated content host template");
            }
        }
    }
    pub(super) fn sync_content_host(&mut self, id: u32) -> Result<(), String> {
        let q = props(&self.nodes[&id].props);
        if self.nodes[&id].kind == NodeKind::Frame {
            self.nodes.get_mut(&id).unwrap().content_host.frame.apply(
                Command::Configure {
                    cache_size: q.cache_size,
                    reduced_motion: self.reduced_motion,
                },
                self.time,
            )?;
            self.nodes
                .get_mut(&id)
                .unwrap()
                .content_host
                .frame
                .advance(self.time);
            let snapshot = self.nodes[&id].content_host.frame.snapshot(self.time);
            let signature = serde_json::to_string(&snapshot.visuals).unwrap();
            if signature != self.nodes[&id].content_host.signature {
                self.nodes.get_mut(&id).unwrap().content_host.signature = signature;
                self.invalidate(id, true);
            }
            let remove = self.nodes[&id]
                .content_host
                .instances
                .iter()
                .filter(|(instance, _)| !snapshot.pages.iter().any(|p| p.instance == **instance))
                .map(|(a, b)| (*a, *b))
                .collect::<Vec<_>>();
            for (instance, node) in remove {
                self.nodes
                    .get_mut(&id)
                    .unwrap()
                    .content_host
                    .instances
                    .remove(&instance);
                self.nodes.get_mut(&node).unwrap().content_host.owner = None;
                self.destroy(node)?;
            }
            for page in snapshot.pages {
                if self.nodes[&id]
                    .content_host
                    .instances
                    .contains_key(&page.instance)
                {
                    continue;
                }
                let def = q
                    .pages
                    .iter()
                    .find(|p| p.key == page.page)
                    .ok_or("Unregistered Frame page")?;
                self.nodes.get_mut(&id).unwrap().content_host.creating = true;
                let result = (|| {
                    let node = self.create(id, NodeKind::Page, json!({"title":def.title}))?;
                    self.instantiate_content(node, &page_content(def)?)?;
                    Ok::<_, String>(node)
                })();
                self.nodes.get_mut(&id).unwrap().content_host.creating = false;
                let node = result?;
                self.nodes.get_mut(&node).unwrap().content_host.owner = Some(id);
                self.nodes
                    .get_mut(&id)
                    .unwrap()
                    .content_host
                    .instances
                    .insert(page.instance, node);
            }
            return Ok(());
        }
        let p = &self.nodes[&id].props;
        let signature = serde_json::to_string(&(
            &q.content,
            &q.content_template,
            p.font_size,
            p.font_weight,
            &p.font_family,
            p.font_style,
            p.wrap,
        ))
        .unwrap();
        if signature == self.nodes[&id].content_host.signature {
            return Ok(());
        }
        self.validate_host_patch(id, &self.nodes[&id].props)?;
        if let Some(old) = self.nodes[&id].content_host.generated {
            self.nodes.get_mut(&old).unwrap().content_host.owner = None;
            self.destroy(old)?;
            self.nodes.get_mut(&id).unwrap().content_host.generated = None;
        }
        let template=q.content_template.or_else(||q.content.map(|text|TemplateNode{kind:NodeKind::TextBlock,name:String::new(),properties:json!({"text":text,"wrap":self.nodes[&id].props.wrap,"fontSize":self.nodes[&id].props.font_size,"fontWeight":self.nodes[&id].props.font_weight,"fontFamily":self.nodes[&id].props.font_family,"fontStyle":self.nodes[&id].props.font_style}),children:vec![]}));
        self.nodes.get_mut(&id).unwrap().content_host.creating = true;
        let result = template
            .map(|t| self.instantiate_content(id, &t))
            .transpose();
        self.nodes.get_mut(&id).unwrap().content_host.creating = false;
        if let Some(child) = result? {
            self.nodes.get_mut(&child).unwrap().content_host.owner = Some(id);
            self.nodes.get_mut(&id).unwrap().content_host.generated = Some(child);
        }
        self.nodes.get_mut(&id).unwrap().content_host.signature = signature;
        self.invalidate(id, true);
        Ok(())
    }
    pub(super) fn frame_visual(&self, parent: u32, child: u32) -> Option<crate::frame::Visual> {
        let n = &self.nodes[&parent];
        if n.kind != NodeKind::Frame {
            return None;
        }
        let instance = n
            .content_host
            .instances
            .iter()
            .find(|(_, id)| **id == child)?
            .0;
        n.content_host
            .frame
            .visuals(self.time)
            .into_iter()
            .find(|v| v.instance == *instance)
    }
    pub(super) fn content_child_matrix(&self, parent: u32, child: u32) -> Matrix {
        self.frame_visual(parent, child)
            .map_or(Matrix::default(), |v| Matrix([1., 0., 0., 1., v.x, v.y]))
    }
    pub(super) fn content_child_visible(&self, parent: u32, child: u32) -> bool {
        self.nodes[&parent].kind != NodeKind::Frame
            || self.frame_visual(parent, child).is_some_and(|v| v.visible)
    }
    pub(super) fn content_child_enabled(&self, parent: u32, child: u32) -> bool {
        self.nodes[&parent].kind != NodeKind::Frame
            || self
                .frame_visual(parent, child)
                .is_some_and(|v| v.interactive)
    }
    pub fn find_content_name(&self, id: u32, name: &str) -> Result<Option<u32>, String> {
        let n = self.get(id)?;
        if !is_host(n.kind) {
            return Err("findName requires a content host".into());
        }
        if name.is_empty() {
            return Ok(None);
        }
        let root = if n.kind == NodeKind::Frame {
            n.content_host
                .frame
                .snapshot(self.time)
                .current_instance
                .and_then(|i| n.content_host.instances.get(&i).copied())
        } else {
            Some(id)
        };
        fn find(s: &Scene, id: u32, name: &str) -> Option<u32> {
            for child in &s.nodes[&id].children {
                let n = &s.nodes[child];
                if n.props.layout_key == name {
                    return Some(*child);
                }
                if !matches!(n.kind, NodeKind::Page | NodeKind::UserControl) {
                    if let Some(id) = find(s, *child, name) {
                        return Some(id);
                    }
                }
            }
            None
        }
        Ok(root.and_then(|id| find(self, id, name)))
    }
    pub(super) fn content_host_snapshot(&self, id: u32) -> Option<Value> {
        let n = &self.nodes[&id];
        if !is_host(n.kind) {
            return None;
        }
        Some(if n.kind == NodeKind::Frame {
            json!({"frame":n.content_host.frame.snapshot(self.time),"pageNodes":n.content_host.instances,"pending":n.content_host.pending.as_ref().map(|p|p.request)})
        } else {
            json!({"contentNode":n.content_host.generated.or_else(||self.ordered_children(id).first().copied()),"owner":n.content_host.owner})
        })
    }
    pub(super) fn measure_content_host(
        &mut self,
        id: u32,
        inner: [f64; 2],
        measure: &mut impl TextMeasurer,
    ) -> [f64; 2] {
        let children = self.ordered_children(id);
        let mut size = [0.0_f64; 2];
        for child in children {
            let d = self.measure_node(child, inner, measure);
            let current = self.nodes[&id].kind != NodeKind::Frame
                || self.nodes[&id]
                    .content_host
                    .frame
                    .snapshot(self.time)
                    .current_instance
                    .and_then(|instance| {
                        self.nodes[&id]
                            .content_host
                            .instances
                            .get(&instance)
                            .copied()
                    })
                    == Some(child);
            if current {
                size = [size[0].max(d[0]), size[1].max(d[1])];
            }
        }
        size
    }
    pub(super) fn arrange_content_host(
        &mut self,
        id: u32,
        inner: Rect,
        measure: &mut impl TextMeasurer,
    ) {
        let n = &self.nodes[&id];
        let (mut p, world, theme, enabled, visible) =
            (n.props.clone(), n.world, n.theme, n.enabled, n.visible);
        if matches!(n.kind, NodeKind::Page | NodeKind::UserControl) {
            p.horizontal_content_alignment = HorizontalAlignment::Stretch;
            p.vertical_content_alignment = VerticalAlignment::Stretch;
        }
        for child in self.ordered_children(id) {
            let d = self.nodes[&child].desired;
            let w = if p.horizontal_content_alignment == HorizontalAlignment::Stretch {
                inner.width
            } else {
                d[0]
            };
            let h = if p.vertical_content_alignment == VerticalAlignment::Stretch {
                inner.height
            } else {
                d[1]
            };
            let x = match p.horizontal_content_alignment {
                HorizontalAlignment::Center => (inner.width - w) / 2.,
                HorizontalAlignment::Right => inner.width - w,
                _ => 0.,
            };
            let y = match p.vertical_content_alignment {
                VerticalAlignment::Center => (inner.height - h) / 2.,
                VerticalAlignment::Bottom => inner.height - h,
                _ => 0.,
            };
            self.arrange_node(
                child,
                Rect::new(inner.x + x, inner.y + y, w, h),
                world.multiply(self.content_child_matrix(id, child)),
                (
                    theme,
                    enabled && self.content_child_enabled(id, child),
                    visible && self.content_child_visible(id, child),
                ),
                measure,
            );
        }
    }
    fn frame_event(&mut self, id: u32, kind: EventKind, payload: Value, request: Option<u32>) {
        self.emit(id, kind);
        let e = self.events.last_mut().unwrap();
        e.payload = Some(payload);
        e.request_id = request;
    }
    pub(super) fn content_host_input(&mut self, input: &Input) -> Result<bool, String> {
        let Input::ContentHost {
            id,
            action,
            page,
            parameter,
            transition,
            request,
            cancel,
        } = input
        else {
            return Ok(false);
        };
        if self.get(*id)?.kind != NodeKind::Frame {
            return Err("Navigation requires Frame".into());
        }
        if *action == HostAction::Resolve {
            let Some(pending) = self.nodes[id]
                .content_host
                .pending
                .clone()
                .filter(|p| Some(p.request) == *request)
            else {
                return Ok(true);
            };
            self.nodes.get_mut(id).unwrap().content_host.pending = None;
            if *cancel {
                self.frame_event(
                    *id,
                    EventKind::FrameNavigationStopped,
                    pending.payload,
                    None,
                );
                return Ok(true);
            }
            self.nodes
                .get_mut(id)
                .unwrap()
                .content_host
                .frame
                .apply(pending.command, self.time)?;
            self.sync_content_host(*id)?;
            self.frame_event(*id, EventKind::FrameNavigated, pending.payload, None);
            self.invalidate(*id, true);
            self.reconcile_input();
            return Ok(true);
        }
        if self.nodes[id].content_host.pending.is_some() {
            return Err("Frame navigation is already pending".into());
        }
        let q = props(&self.nodes[id].props);
        let command = match action {
            HostAction::Navigate => {
                let def = q
                    .pages
                    .iter()
                    .find(|p| Some(&p.key) == page.as_ref())
                    .ok_or("Unknown Frame page")?;
                Command::Navigate {
                    page: def.key.clone(),
                    parameter: *parameter,
                    transition: *transition,
                    cache_mode: def.cache_mode,
                }
            }
            HostAction::Back => {
                if self.nodes[id].content_host.frame.back.is_empty() {
                    return Ok(true);
                }
                Command::Back
            }
            HostAction::Forward => {
                if self.nodes[id].content_host.frame.forward.is_empty() {
                    return Ok(true);
                }
                Command::Forward
            }
            HostAction::Refresh => Command::Refresh,
            HostAction::ClearHistory => {
                self.nodes
                    .get_mut(id)
                    .unwrap()
                    .content_host
                    .frame
                    .apply(Command::ClearHistory, self.time)?;
                self.invalidate(*id, false);
                return Ok(true);
            }
            HostAction::Resolve => unreachable!(),
        };
        let mut preview = self.nodes[id].content_host.frame.clone();
        preview.apply(command.clone(), self.time)?;
        // Allocate/validate the entire target tree on an isolated scene before
        // changing the journal. Template creation cannot partially commit a page.
        if let Some(entry) = &preview.current {
            if let Some(def) = q.pages.iter().find(|p| p.key == entry.page) {
                let mut probe = Scene::new(self.theme, true);
                let page = probe.create(probe.root, NodeKind::Page, json!({}))?;
                probe.instantiate_content(page, &page_content(def)?)?;
            }
        }
        let needed = preview
            .snapshot(self.time)
            .pages
            .iter()
            .filter(|p| {
                !self.nodes[id]
                    .content_host
                    .instances
                    .contains_key(&p.instance)
            })
            .count();
        let count = |t: &TemplateNode| -> usize {
            fn n(t: &TemplateNode) -> usize {
                1 + t.children.iter().map(n).sum::<usize>()
            }
            n(t)
        };
        let budget = q
            .pages
            .iter()
            .map(|p| page_content(p).map(|t|count(&t)+1).unwrap_or(usize::MAX/256))
            .max()
            .unwrap_or(0)
            * needed;
        if self.nodes.len() + budget > 5000 {
            return Err("Frame page would exceed scene node limit".into());
        }
        let payload = json!({"frameNavigation":{"from":self.nodes[id].content_host.frame.current,"to":preview.current,"mode":preview.mode}});
        let n = self.nodes.get_mut(id).unwrap();
        let next = n
            .content_host
            .next_request
            .checked_add(1)
            .ok_or("Frame request identity exhausted")?;
        n.content_host.next_request = next;
        n.content_host.pending = Some(Pending {
            request: next,
            command,
            payload: payload.clone(),
        });
        self.frame_event(*id, EventKind::FrameNavigating, payload, Some(next));
        Ok(true)
    }
}
#[derive(Clone, Copy, Debug, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum HostAction {
    Navigate,
    Back,
    Forward,
    Refresh,
    ClearHistory,
    Resolve,
}
