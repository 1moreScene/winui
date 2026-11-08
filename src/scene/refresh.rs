//! Pull-to-refresh state and animation live in Rust; the host transports input.
use super::*;
use crate::render::Draw;
use std::sync::OnceLock;
fn metric(key: &str) -> f64 {
    static V: OnceLock<serde_json::Value> = OnceLock::new();
    V.get_or_init(|| {
        serde_json::from_str(include_str!(
            "../../references/repeater-refresh-template.json"
        ))
        .unwrap()
    })[key]
        .as_f64()
        .unwrap()
}
fn rotation_enabled() -> bool {
    true
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct RefreshProperties {
    pub pull_direction: RefreshPullDirection,
    pub visualizer_orientation: RefreshVisualizerOrientation,
    #[serde(default = "rotation_enabled")]
    pub is_rotation_enabled: bool,
}
impl Default for RefreshProperties {
    fn default() -> Self {
        Self {
            pull_direction: Default::default(),
            visualizer_orientation: Default::default(),
            is_rotation_enabled: true,
        }
    }
}
#[derive(Default)]
pub struct RefreshState {
    pub owner: Option<u32>,
    pub visualizer: Option<u32>,
    pub state: RefreshVisualizerState,
    pub ratio: f64,
    gesture: Option<(i32, f64, f64, bool)>,
    pub request: Option<u32>,
    serial: u32,
    pub started: f64,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RefreshSnapshot {
    pub state: RefreshVisualizerState,
    pub interaction_ratio: f64,
    pub request_id: Option<u32>,
    pub visualizer: Option<u32>,
}
impl RefreshState {
    pub fn snapshot(&self) -> RefreshSnapshot {
        RefreshSnapshot {
            state: self.state,
            interaction_ratio: self.ratio,
            request_id: self.request,
            visualizer: self.visualizer,
        }
    }
}
pub fn is_control(k: NodeKind) -> bool {
    matches!(k, NodeKind::RefreshContainer | NodeKind::RefreshVisualizer)
}
pub fn defaults(k: NodeKind, p: &mut NodeProperties) {
    if is_control(k) {
        p.refresh = Some(Box::default());
        p.is_tab_stop = false;
        if k == NodeKind::RefreshContainer {
            p.clip = true;
        } else {
            p.height = Some(metric("visualizerHeight"));
            p.min_height = metric("visualizerMinHeight");
        }
    }
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum RefreshAction {
    Request,
    Complete,
    Interact,
    Release,
    Cancel,
}
impl Scene {
    /// Create a container with its Rust-owned default RefreshVisualizer.
    pub fn refresh_container(
        &mut self,
        parent: u32,
        pull_direction: RefreshPullDirection,
    ) -> Result<u32, String> {
        self.create(
            parent,
            NodeKind::RefreshContainer,
            serde_json::json!({"refresh":{"pullDirection":pull_direction}}),
        )
    }
    /// Create a standalone refresh indicator with the native default content.
    pub fn refresh_visualizer(
        &mut self,
        parent: u32,
        orientation: RefreshVisualizerOrientation,
    ) -> Result<u32, String> {
        self.create(
            parent,
            NodeKind::RefreshVisualizer,
            serde_json::json!({"refresh":{"visualizerOrientation":orientation}}),
        )
    }
    pub(super) fn init_refresh(&mut self, id: u32) -> Result<(), String> {
        if self.nodes[&id].kind == NodeKind::RefreshContainer {
            let child = self.create(id, NodeKind::RefreshVisualizer, serde_json::json!({}))?;
            self.nodes.get_mut(&child).unwrap().refresh.owner = Some(id);
            self.nodes.get_mut(&id).unwrap().refresh.visualizer = Some(child);
        }
        Ok(())
    }
    fn refresh_state(&mut self, id: u32, state: RefreshVisualizerState) {
        let old = self.nodes[&id].refresh.state;
        if old == state {
            return;
        }
        let n = self.nodes.get_mut(&id).unwrap();
        n.refresh.state = state;
        n.refresh.started = self.time;
        if let Some(child) = n.refresh.visualizer {
            let r = &mut self.nodes.get_mut(&child).unwrap().refresh;
            r.state = state;
            r.started = self.time;
        }
        self.emit(id, EventKind::RefreshStateChanged);
        if let Some(e) = self.events.last_mut() {
            e.payload = Some(serde_json::json!({"oldState":old,"state":state}));
        }
        self.invalidate(id, true);
    }
    pub fn request_refresh(&mut self, id: u32) -> Result<Option<u32>, String> {
        let n = self.get(id)?;
        if !is_control(n.kind) {
            return Err("Node is not a refresh control".into());
        }
        if let Some(owner) = n.refresh.owner {
            return self.request_refresh(owner);
        }
        if !n.enabled || !n.props.enabled {
            return Ok(None);
        }
        if n.refresh.request.is_some() {
            return Ok(n.refresh.request);
        }
        let n = self.nodes.get_mut(&id).unwrap();
        n.refresh.serial = n.refresh.serial.wrapping_add(1).max(1);
        let request = n.refresh.serial;
        n.refresh.request = Some(request);
        n.refresh.gesture = None;
        self.refresh_state(id, RefreshVisualizerState::Refreshing);
        self.emit(id, EventKind::RefreshRequested);
        if let Some(e) = self.events.last_mut() {
            e.request_id = Some(request);
        }
        Ok(Some(request))
    }
    pub fn complete_refresh(&mut self, id: u32, request: u32) -> Result<(), String> {
        let n = self.get(id)?;
        if !is_control(n.kind) {
            return Err("Node is not a refresh control".into());
        }
        if let Some(owner) = n.refresh.owner {
            return self.complete_refresh(owner, request);
        }
        if n.refresh.request != Some(request) {
            return Err("Stale or already completed refresh request".into());
        }
        let n = self.nodes.get_mut(&id).unwrap();
        n.refresh.request = None;
        n.refresh.ratio = 0.;
        self.refresh_state(id, RefreshVisualizerState::Idle);
        Ok(())
    }
    fn refresh_ratio(&mut self, id: u32, ratio: f64, eligible: bool) {
        let r = &mut self.nodes.get_mut(&id).unwrap().refresh;
        r.ratio = ratio;
        if r.state == RefreshVisualizerState::Refreshing {
            return;
        }
        let next = if ratio <= 0. {
            RefreshVisualizerState::Idle
        } else if !eligible || r.state == RefreshVisualizerState::Peeking {
            RefreshVisualizerState::Peeking
        } else if ratio > metric("executionRatio") {
            RefreshVisualizerState::Pending
        } else {
            RefreshVisualizerState::Interacting
        };
        self.refresh_state(id, next);
    }
    fn refresh_release(&mut self, id: u32, cancel: bool) -> Result<(), String> {
        self.nodes.get_mut(&id).unwrap().refresh.gesture = None;
        if !cancel && self.nodes[&id].refresh.state == RefreshVisualizerState::Pending {
            self.request_refresh(id)?;
        } else if self.nodes[&id].refresh.state != RefreshVisualizerState::Refreshing {
            self.nodes.get_mut(&id).unwrap().refresh.ratio = 0.;
            self.refresh_state(id, RefreshVisualizerState::Idle);
        }
        Ok(())
    }
    pub(super) fn refresh_input(&mut self, input: &Input) -> Result<bool, String> {
        if let Input::Refresh {
            id,
            action,
            request,
            ratio,
            eligible,
        } = input
        {
            if !is_control(self.get(*id)?.kind) {
                return Err("Node is not a refresh control".into());
            }
            if !ratio.is_finite() || *ratio < 0. || *ratio > 10. {
                return Err("Invalid refresh ratio".into());
            }
            let id = self.nodes[id].refresh.owner.unwrap_or(*id);
            match action {
                RefreshAction::Request => {
                    self.request_refresh(id)?;
                }
                RefreshAction::Complete => self.complete_refresh(
                    id,
                    request.ok_or("Completion requires a refresh request")?,
                )?,
                RefreshAction::Interact => {
                    if self.nodes[&id].enabled {
                        self.refresh_ratio(id, *ratio, *eligible);
                    }
                }
                RefreshAction::Release => self.refresh_release(id, false)?,
                RefreshAction::Cancel => self.refresh_release(id, true)?,
            }
            self.invalidate(id, true);
            return Ok(true);
        }
        let Input::Touch {
            pointer,
            x,
            y,
            phase,
        } = input
        else {
            return Ok(false);
        };
        if !x.is_finite() || !y.is_finite() {
            return Err("Invalid touch coordinates".into());
        }
        let active = self
            .nodes
            .values()
            .find(|n| {
                n.kind == NodeKind::RefreshContainer
                    && n.refresh.gesture.is_some_and(|g| g.0 == *pointer)
            })
            .map(|n| n.id);
        if phase == "down" {
            if active.is_some() {
                return Ok(false);
            }
            let mut at = self.hit(*x, *y);
            let mut scroll = None;
            while let Some(id) = at {
                let n = &self.nodes[&id];
                if collections::is_scroll_owner(n.kind) && scroll.is_none() {
                    scroll = Some(id);
                }
                if n.kind == NodeKind::RefreshContainer && n.enabled && n.refresh.request.is_none()
                {
                    let direction = n.props.refresh.as_ref().unwrap().pull_direction;
                    let axis = usize::from(matches!(
                        direction,
                        RefreshPullDirection::TopToBottom | RefreshPullDirection::BottomToTop
                    ));
                    let reverse = matches!(
                        direction,
                        RefreshPullDirection::BottomToTop | RefreshPullDirection::RightToLeft
                    );
                    let eligible = scroll.is_none_or(|s| {
                        let n = &self.nodes[&s];
                        let offset = n.scroll.offsets(self.time)[axis];
                        if reverse {
                            offset >= n.scroll.max(self.time)[axis] - 0.5
                        } else {
                            offset <= 0.5
                        }
                    });
                    self.nodes.get_mut(&id).unwrap().refresh.gesture =
                        Some((*pointer, *x, *y, eligible));
                    break;
                }
                at = n.parent;
            }
            return Ok(false);
        }
        if let Some(id) = active {
            if phase == "up" || phase == "cancel" {
                let consume = self.nodes[&id].refresh.ratio > 0.;
                self.refresh_release(id, phase == "cancel")?;
                return Ok(consume);
            }
            if phase == "move" {
                let (_, sx, sy, eligible) = self.nodes[&id].refresh.gesture.unwrap();
                let dir = self.nodes[&id]
                    .props
                    .refresh
                    .as_ref()
                    .unwrap()
                    .pull_direction;
                let delta = match dir {
                    RefreshPullDirection::TopToBottom => y - sy,
                    RefreshPullDirection::BottomToTop => sy - y,
                    RefreshPullDirection::LeftToRight => x - sx,
                    RefreshPullDirection::RightToLeft => sx - x,
                };
                let perpendicular = if matches!(
                    dir,
                    RefreshPullDirection::TopToBottom | RefreshPullDirection::BottomToTop
                ) {
                    (x - sx).abs()
                } else {
                    (y - sy).abs()
                };
                if delta <= 4. || perpendicular > delta {
                    if self.nodes[&id].refresh.ratio > 0. {
                        self.refresh_ratio(id, 0., eligible);
                    }
                    return Ok(false);
                }
                if !eligible {
                    return Ok(false);
                }
                self.scroll_touch(*pointer, *x, *y, "cancel")?;
                self.refresh_ratio(id, (delta / metric("visualizerHeight")).clamp(0., 2.), true);
                self.invalidate(id, true);
                return Ok(true);
            }
        }
        Ok(false)
    }
    pub(super) fn measure_refresh(
        &mut self,
        id: u32,
        available: [f64; 2],
        m: &mut impl TextMeasurer,
    ) -> [f64; 2] {
        let children = self.nodes[&id].children.clone();
        let visualizer = self.nodes[&id].refresh.visualizer;
        let mut desired = [0_f64; 2];
        for child in children {
            let d = self.measure_node(child, available, m);
            if Some(child) != visualizer {
                desired[0] = desired[0].max(d[0]);
                desired[1] = desired[1].max(d[1]);
            }
        }
        if self.nodes[&id].kind == NodeKind::RefreshVisualizer && desired == [0.; 2] {
            let font = crate::typography::Font {
                family: "Segoe Fluent Icons, Segoe MDL2 Assets".into(),
                size: 20.,
                ..Default::default()
            };
            let glyph = crate::icons::symbol_glyph(Symbol::Refresh);
            let metrics = m.measure(glyph, &font);
            let text = crate::typography::layout(
                glyph,
                &font,
                f64::INFINITY,
                false,
                TextTrimming::None,
                Some(metrics.ascent + metrics.descent),
                m,
            );
            self.nodes.get_mut(&id).unwrap().text = text;
            desired = [metric("indicatorSize"), metric("visualizerHeight")];
        }
        desired
    }
    pub(super) fn arrange_refresh(&mut self, id: u32, inner: Rect, m: &mut impl TextMeasurer) {
        let n = &self.nodes[&id];
        let world = n.world;
        let inherited = (n.theme, n.enabled, n.visible);
        let children = n.children.clone();
        let visualizer = n.refresh.visualizer;
        let state = n.refresh.state;
        let ratio = n.refresh.ratio;
        let direction = n.props.refresh.as_ref().unwrap().pull_direction;
        let distance = if state == RefreshVisualizerState::Refreshing {
            metric("visualizerHeight") * metric("executionRatio")
        } else {
            metric("visualizerHeight") * ratio
        };
        let dimension = metric("visualizerHeight");
        for child in children {
            if visualizer.is_none() {
                let p = &mut self.nodes.get_mut(&child).unwrap().props;
                p.horizontal_alignment = HorizontalAlignment::Center;
                p.vertical_alignment = VerticalAlignment::Center;
            }
            let r = if Some(child) == visualizer {
                let mut r = match direction {
                    RefreshPullDirection::TopToBottom => Rect::new(
                        inner.x,
                        inner.y - dimension + distance,
                        inner.width,
                        dimension,
                    ),
                    RefreshPullDirection::BottomToTop => Rect::new(
                        inner.x,
                        inner.y + inner.height - distance,
                        inner.width,
                        dimension,
                    ),
                    RefreshPullDirection::LeftToRight => Rect::new(
                        inner.x - dimension + distance,
                        inner.y,
                        dimension,
                        inner.height,
                    ),
                    RefreshPullDirection::RightToLeft => Rect::new(
                        inner.x + inner.width - distance,
                        inner.y,
                        dimension,
                        inner.height,
                    ),
                };
                if distance == 0. {
                    r.width = 0.;
                    r.height = 0.;
                }
                let n = self.nodes.get_mut(&child).unwrap();
                n.refresh.ratio = ratio;
                n.props.refresh.as_mut().unwrap().pull_direction = direction;
                r
            } else if visualizer.is_some() {
                match direction {
                    RefreshPullDirection::TopToBottom => {
                        Rect::new(inner.x, inner.y + distance, inner.width, inner.height)
                    }
                    RefreshPullDirection::BottomToTop => {
                        Rect::new(inner.x, inner.y - distance, inner.width, inner.height)
                    }
                    RefreshPullDirection::LeftToRight => {
                        Rect::new(inner.x + distance, inner.y, inner.width, inner.height)
                    }
                    RefreshPullDirection::RightToLeft => {
                        Rect::new(inner.x - distance, inner.y, inner.width, inner.height)
                    }
                }
            } else {
                inner
            };
            self.arrange_node(child, r, world, inherited, m);
        }
    }
    pub(super) fn begin_refresh_content(&self, id: u32, out: &mut Vec<Draw>) {
        let n = &self.nodes[&id];
        let r = &n.refresh;
        let q = n.props.refresh.as_ref().unwrap();
        let state = r.state;
        let base = match q.visualizer_orientation {
            RefreshVisualizerOrientation::Auto => match q.pull_direction {
                RefreshPullDirection::LeftToRight => -std::f64::consts::FRAC_PI_2,
                RefreshPullDirection::RightToLeft => std::f64::consts::FRAC_PI_2,
                _ => 0.,
            },
            RefreshVisualizerOrientation::Normal => 0.,
            RefreshVisualizerOrientation::Rotate90DegreesCounterclockwise => {
                -std::f64::consts::FRAC_PI_2
            }
            RefreshVisualizerOrientation::Rotate270DegreesCounterclockwise => {
                std::f64::consts::FRAC_PI_2
            }
        };
        let angle = base
            + if state == RefreshVisualizerState::Refreshing
                && q.is_rotation_enabled
                && !self.reduced_motion
            {
                (self.time - r.started) / metric("rotationDuration") * std::f64::consts::TAU
            } else if state == RefreshVisualizerState::Interacting && q.is_rotation_enabled {
                r.ratio.min(metric("executionRatio")) / metric("executionRatio")
                    * std::f64::consts::TAU
            } else {
                0.
            };
        let elapsed = (self.time - r.started) / metric("pendingDuration");
        let scale = if state == RefreshVisualizerState::Pending
            && (0. ..1.).contains(&elapsed)
            && !self.reduced_motion
        {
            1. + 0.5 * (1. - (elapsed * 2. - 1.).abs())
        } else {
            1.
        };
        let (c, s) = (angle.cos() * scale, angle.sin() * scale);
        let [x, y] = [n.rect.width / 2., n.rect.height / 2.];
        let direction = q.pull_direction;
        let vertical = matches!(
            direction,
            RefreshPullDirection::TopToBottom | RefreshPullDirection::BottomToTop
        );
        let far = matches!(
            direction,
            RefreshPullDirection::BottomToTop | RefreshPullDirection::RightToLeft
        );
        let dimension = if vertical {
            n.rect.height
        } else {
            n.rect.width
        };
        let translation = if r.owner.is_some() {
            if state == RefreshVisualizerState::Refreshing {
                (1. - metric("executionRatio")) * 0.5 * dimension
            } else if state == RefreshVisualizerState::Interacting {
                (1. - r.ratio) * 0.5 * dimension
            } else {
                0.
            }
        } else {
            0.
        } * if far { -1. } else { 1. };
        out.push(Draw::Save);
        out.push(Draw::Transform {
            matrix: [
                c,
                s,
                -s,
                c,
                x - c * x + s * y + if vertical { 0. } else { translation },
                y - s * x - c * y + if vertical { translation } else { 0. },
            ],
        });
        out.push(Draw::Layer {
            opacity: if matches!(
                state,
                RefreshVisualizerState::Peeking
                    | RefreshVisualizerState::Pending
                    | RefreshVisualizerState::Refreshing
            ) {
                1.
            } else {
                metric("minimumOpacity")
            },
        });
    }
    pub(super) fn paint_refresh(&self, id: u32, out: &mut Vec<Draw>) {
        let n = &self.nodes[&id];
        if n.kind != NodeKind::RefreshVisualizer || !n.children.is_empty() {
            return;
        }
        self.begin_refresh_content(id, out);
        let color = if let Some(fg) = &n.props.foreground {
            Self::color(fg, n.theme)
        } else if n.theme == Theme::Light {
            "#000000".into()
        } else {
            "#ffffff".into()
        };
        for line in &n.text.lines {
            out.push(Draw::Text {
                style: FontStyle::Normal,
                x: (n.rect.width - n.text.width) / 2.,
                y: (n.rect.height - n.text.height) / 2. + line.baseline,
                text: line.text.clone(),
                color: color.clone(),
                size: 20.,
                font: "Segoe Fluent Icons, Segoe MDL2 Assets".into(),
                max_width: n.text.width.max(30.),
                weight: 400,
            });
        }
        out.push(Draw::EndLayer);
        out.push(Draw::Restore);
    }
}
