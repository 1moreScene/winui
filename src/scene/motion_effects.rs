//! Rust-owned layout transitions, implicit property changes and Composition bindings.
use super::*;
use crate::animation::bezier;
use crate::render::Draw;
use std::collections::BTreeSet;

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct MotionProperties {
    pub implicit: BTreeMap<String, f64>,
    pub background_duration: Option<f64>,
    pub transitions: Vec<ThemeTransition>,
    pub children_transitions: Vec<ThemeTransition>,
    pub disable_stagger: bool,
    pub hover_spring: Option<HoverSpring>,
}
impl MotionProperties {
    pub fn validate(&self) -> Result<(), String> {
        for (key, duration) in &self.implicit {
            if !visual_key(key) {
                return Err(format!("unsupported implicit property: {key}"));
            }
            validate_duration(*duration)?;
        }
        if let Some(duration) = self.background_duration {
            validate_duration(duration)?;
        }
        if let Some(spring) = &self.hover_spring {
            spring.spring.validate()?;
            if !spring.scale.is_finite() || !(0.01..=100.).contains(&spring.scale) {
                return Err("invalid hover scale".into());
            }
        }
        Ok(())
    }
}
pub(super) fn visual_key(key: &str) -> bool {
    matches!(
        key,
        "translationX" | "translationY" | "scaleX" | "scaleY" | "rotation" | "opacity"
    )
}
fn validate_duration(value: f64) -> Result<(), String> {
    if value.is_finite() && (0. ..=86_400_000.).contains(&value) {
        Ok(())
    } else {
        Err("invalid transition duration".into())
    }
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct SpringOptions {
    pub period: f64,
    pub damping_ratio: f64,
}
impl Default for SpringOptions {
    fn default() -> Self {
        Self {
            period: 50.,
            damping_ratio: 0.6,
        }
    }
}
impl SpringOptions {
    pub fn validate(&self) -> Result<(), String> {
        if !self.period.is_finite()
            || !(1. ..=10_000.).contains(&self.period)
            || !self.damping_ratio.is_finite()
            || !(0.01..=1.).contains(&self.damping_ratio)
        {
            return Err("spring requires period 1..10000 ms and dampingRatio 0.01..1".into());
        }
        Ok(())
    }
    pub fn duration(&self) -> f64 {
        (12. * self.period / (std::f64::consts::TAU * self.damping_ratio)).max(self.period)
    }
    /// Exact damped oscillator solution, including velocity on interruption (units/ms).
    pub fn value(&self, from: f64, to: f64, velocity: f64, time: f64) -> f64 {
        let w = std::f64::consts::TAU / self.period;
        let z = self.damping_ratio;
        let x = from - to;
        let t = time.max(0.);
        if z >= 1. {
            return to + (x + (velocity + w * x) * t) * (-w * t).exp();
        }
        let wd = w * (1. - z * z).sqrt();
        to + (-z * w * t).exp()
            * (x * (wd * t).cos() + (velocity + z * w * x) / wd * (wd * t).sin())
    }
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct HoverSpring {
    pub scale: f64,
    #[serde(flatten)]
    pub spring: SpringOptions,
}
impl Default for HoverSpring {
    fn default() -> Self {
        Self {
            scale: 1.5,
            spring: SpringOptions::default(),
        }
    }
}

/// Typed scalar expression tree. References always use the source's presentation.
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase", deny_unknown_fields)]
pub enum Expression {
    Constant {
        value: f64,
    },
    Reference {
        node: u32,
        property: ExpressionProperty,
    },
    Binary {
        operation: ExpressionOperation,
        left: Box<Expression>,
        right: Box<Expression>,
    },
    Sin {
        value: Box<Expression>,
    },
    Cos {
        value: Box<Expression>,
    },
}
impl Expression {
    fn references(&self, refs: &mut BTreeSet<u32>, depth: usize) -> Result<(), String> {
        if depth > 32 {
            return Err("expression nesting limit is 32".into());
        }
        match self {
            Self::Constant { value } if !value.is_finite() || value.abs() > 1e9 => {
                return Err("invalid expression constant".into())
            }
            Self::Reference { node, .. } => {
                refs.insert(*node);
            }
            Self::Binary { left, right, .. } => {
                left.references(refs, depth + 1)?;
                right.references(refs, depth + 1)?;
            }
            Self::Sin { value } | Self::Cos { value } => value.references(refs, depth + 1)?,
            _ => {}
        }
        Ok(())
    }
    fn evaluate(&self, scene: &Scene) -> Option<f64> {
        let value = match self {
            Self::Constant { value } => *value,
            Self::Reference { node, property } => {
                let n = scene.nodes.get(node)?;
                match property {
                    ExpressionProperty::ActualWidth => n.rect.width,
                    ExpressionProperty::ActualHeight => n.rect.height,
                    ExpressionProperty::ActualOffsetX => n.rect.x,
                    ExpressionProperty::ActualOffsetY => n.rect.y,
                    ExpressionProperty::ScaleX => n.presentation.scale_x,
                    ExpressionProperty::ScaleY => n.presentation.scale_y,
                    ExpressionProperty::TranslationX => n.presentation.translation_x,
                    ExpressionProperty::TranslationY => n.presentation.translation_y,
                    ExpressionProperty::Rotation => n.presentation.rotation,
                    ExpressionProperty::Opacity => n.presentation.opacity,
                }
            }
            Self::Sin { value } => value.evaluate(scene)?.sin(),
            Self::Cos { value } => value.evaluate(scene)?.cos(),
            Self::Binary {
                operation,
                left,
                right,
            } => {
                let (a, b) = (left.evaluate(scene)?, right.evaluate(scene)?);
                match operation {
                    ExpressionOperation::Add => a + b,
                    ExpressionOperation::Subtract => a - b,
                    ExpressionOperation::Multiply => a * b,
                    ExpressionOperation::Divide => a / b,
                    ExpressionOperation::Modulo => a % b,
                }
            }
        };
        (value.is_finite() && value.abs() <= 1e9).then_some(value)
    }
}
#[derive(Clone, Debug, Default)]
pub(crate) struct EffectState {
    pub rect: Option<Rect>,
    pub visible: bool,
    pub text: String,
    pub hover: bool,
    tracks: Vec<EffectTrack>,
    pub bindings: BTreeMap<String, Expression>,
    background: Option<ColorTransition>,
    connection: Option<Connection>,
}
#[derive(Clone, Debug)]
struct ColorTransition {
    from: [f64; 4],
    to: [f64; 4],
    start: f64,
    duration: f64,
}
impl ColorTransition {
    fn value(&self, time: f64) -> [f64; 4] {
        let t = if self.duration == 0. {
            1.
        } else {
            ((time - self.start) / self.duration).clamp(0., 1.)
        };
        // BrushTransition is a linear crossfade of premultiplied solid brushes.
        let alpha = self.from[3] + (self.to[3] - self.from[3]) * t;
        std::array::from_fn(|i| {
            if i == 3 {
                alpha
            } else if alpha > 0. {
                (self.from[i] * self.from[3] * (1. - t) + self.to[i] * self.to[3] * t) / alpha
            } else {
                0.
            }
        })
    }
}
#[derive(Clone, Debug)]
struct EffectTrack {
    key: String,
    from: f64,
    to: f64,
    start: f64,
    duration: f64,
    curve: [f64; 4],
}
impl EffectTrack {
    fn value(&self, time: f64) -> f64 {
        let t = if self.duration == 0. {
            1.
        } else {
            ((time - self.start) / self.duration).clamp(0., 1.)
        };
        self.from + (self.to - self.from) * bezier(t, self.curve)
    }
}
#[derive(Clone, Debug)]
pub(super) struct Connection {
    from: Matrix,
    start: f64,
    duration: f64,
    configuration: ConnectedAnimationConfiguration,
    source: Vec<Draw>,
    source_size: [f64; 2],
    key: String,
}
impl Connection {
    pub fn progress(&self, time: f64) -> f64 {
        bezier(
            ((time - self.start) / self.duration).clamp(0., 1.),
            if self.configuration == ConnectedAnimationConfiguration::Direct {
                [0.1, 0.9, 0.2, 1.]
            } else {
                [0.8, 0., 0.2, 1.]
            },
        )
    }
    fn matrix(&self, time: f64) -> Matrix {
        let t = ((time - self.start) / self.duration).clamp(0., 1.);
        let p = self.progress(time);
        let identity = Matrix::default().0;
        let mut matrix =
            std::array::from_fn(|i| self.from.0[i] + (identity[i] - self.from.0[i]) * p);
        if self.configuration == ConnectedAnimationConfiguration::Gravity {
            let dip = if t < 0.66 {
                bezier(t / 0.66, [0.35, 0., 0.55, 1.])
            } else {
                1. - bezier((t - 0.66) / 0.34, [0.45, 0., 0.55, 1.])
            };
            matrix[5] += 80. * dip;
            if (self.from.0[0] - 1.).abs() < 1e-6 && (self.from.0[3] - 1.).abs() < 1e-6 {
                matrix[0] *= 1. + 0.1 * dip;
                matrix[3] *= 1. + 0.1 * dip;
            }
        }
        Matrix(matrix)
    }
}
#[derive(Clone, Debug)]
struct PreparedConnection {
    world: Matrix,
    size: [f64; 2],
    prepared: f64,
    commands: Vec<Draw>,
}
#[derive(Clone, Debug)]
pub(super) struct Ghost {
    pub parent: u32,
    pub start: f64,
    pub duration: f64,
    pub commands: Vec<Draw>,
    pub recipe: String,
    pub center: [f64; 2],
}
#[derive(Default)]
pub(super) struct MotionRuntime {
    prepared: BTreeMap<String, PreparedConnection>,
    pub ghosts: Vec<Ghost>,
}

#[derive(Deserialize)]
#[serde(tag = "command", rename_all = "camelCase", deny_unknown_fields)]
pub enum MotionCommand {
    Bind {
        expressions: BTreeMap<String, Expression>,
    },
    ClearExpressions,
    PrepareConnected {
        key: String,
    },
    StartConnected {
        key: String,
        #[serde(default)]
        configuration: ConnectedAnimationConfiguration,
    },
    CancelConnected {
        key: String,
    },
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct NativeTrack {
    kind: u32,
    delay_ms: f64,
    duration_ms: f64,
    flags: u32,
    curve: [f64; 4],
    values: Vec<f64>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct NativeRecipe {
    tracks: Vec<NativeTrack>,
    stagger_delay: f64,
    stagger_delay_cap: f64,
}
fn recipes() -> &'static BTreeMap<String, NativeRecipe> {
    static RECORDS: std::sync::OnceLock<BTreeMap<String, NativeRecipe>> =
        std::sync::OnceLock::new();
    RECORDS.get_or_init(|| {
        serde_json::from_value(
            serde_json::from_str::<serde_json::Value>(include_str!(
                "../../references/gallery-motion-native.json"
            ))
            .unwrap()["records"]
                .clone(),
        )
        .unwrap()
    })
}
impl EffectState {
    fn values(&self, time: f64) -> motion::VisualValues {
        let mut values = motion::VisualValues::default();
        for track in &self.tracks {
            values.set(&track.key, track.value(time));
        }
        values
    }
    pub fn matrix(&self, time: f64, rect: Rect) -> Matrix {
        self.values(time)
            .matrix(Matrix::default().0, [rect.width / 2., rect.height / 2.])
            .multiply(
                self.connection
                    .as_ref()
                    .map(|c| c.matrix(time))
                    .unwrap_or_default(),
            )
    }
    pub fn opacity(&self, time: f64) -> f64 {
        self.values(time).opacity.clamp(0., 1.)
            * self
                .connection
                .as_ref()
                .map(|c| c.progress(time))
                .unwrap_or(1.)
    }
    pub fn paint_connection_source(&self, time: f64, rect: Rect, out: &mut Vec<Draw>) {
        if let Some(c) = &self.connection {
            if time < c.start + c.duration {
                out.push(Draw::Save);
                out.push(Draw::Transform {
                    matrix: [
                        rect.width / c.source_size[0],
                        0.,
                        0.,
                        rect.height / c.source_size[1],
                        0.,
                        0.,
                    ],
                });
                out.extend(c.source.clone());
                out.push(Draw::Restore);
            }
        }
    }
    pub fn active(&self, time: f64) -> bool {
        self.tracks.iter().any(|t| time < t.start + t.duration)
            || self
                .connection
                .as_ref()
                .is_some_and(|c| time < c.start + c.duration)
            || self
                .background
                .as_ref()
                .is_some_and(|c| time < c.start + c.duration)
    }
    pub fn background(&self, time: f64) -> Option<String> {
        self.background
            .as_ref()
            .map(|c| color_string(c.value(time)))
    }
}
fn color_string(c: [f64; 4]) -> String {
    format!(
        "#{:02x}{:02x}{:02x}{:02x}",
        (c[0] * 255.).round() as u8,
        (c[1] * 255.).round() as u8,
        (c[2] * 255.).round() as u8,
        (c[3] * 255.).round() as u8
    )
}

impl Scene {
    pub(super) fn motion_deadline(&self) -> Option<f64> {
        self.motion_runtime
            .prepared
            .values()
            .map(|p| p.prepared + 2000.)
            .filter(|t| *t > self.time)
            .min_by(f64::total_cmp)
    }
    pub(super) fn detach_motion_sources(&mut self, removed: &[u32]) {
        for n in self.nodes.values_mut() {
            let keys = n
                .effects
                .bindings
                .iter()
                .filter_map(|(key, expr)| {
                    let mut refs = BTreeSet::new();
                    let _ = expr.references(&mut refs, 0);
                    refs.iter()
                        .any(|id| removed.contains(id))
                        .then_some(key.clone())
                })
                .collect::<Vec<_>>();
            for key in keys {
                n.effects.bindings.remove(&key);
                n.presentation
                    .set(&key, motion::VisualValues::from_props(&n.props).get(&key));
            }
        }
        self.motion_runtime
            .ghosts
            .retain(|g| !removed.contains(&g.parent));
    }
    pub fn motion_command(&mut self, node: u32, command: MotionCommand) -> Result<bool, String> {
        self.get(node)?;
        match command {
            MotionCommand::Bind { expressions } => {
                for (key, expr) in &expressions {
                    if !visual_key(key) {
                        return Err(format!("unsupported expression target: {key}"));
                    }
                    let mut refs = BTreeSet::new();
                    expr.references(&mut refs, 0)?;
                    if refs.len() > 64 {
                        return Err("expression reference limit is 64".into());
                    }
                    for source in refs {
                        self.get(source)?;
                    }
                }
                fn visit(
                    scene: &Scene,
                    id: u32,
                    target: u32,
                    staged: &BTreeMap<String, Expression>,
                    path: &mut BTreeSet<u32>,
                ) -> Result<(), String> {
                    if !path.insert(id) {
                        return Err("expression dependency cycle".into());
                    }
                    let expressions = if id == target {
                        staged
                    } else {
                        &scene
                            .nodes
                            .get(&id)
                            .ok_or("expression source no longer exists")?
                            .effects
                            .bindings
                    };
                    let mut refs = BTreeSet::new();
                    for expr in expressions.values() {
                        expr.references(&mut refs, 0)?;
                    }
                    for source in refs {
                        visit(scene, source, target, staged, path)?;
                    }
                    path.remove(&id);
                    Ok(())
                }
                visit(self, node, node, &expressions, &mut BTreeSet::new())?;
                self.interrupt(
                    node,
                    expressions.keys().map(String::as_str).collect(),
                    AnimationResult::Interrupted,
                );
                self.nodes.get_mut(&node).unwrap().effects.bindings = expressions;
            }
            MotionCommand::ClearExpressions => {
                let n = self.nodes.get_mut(&node).unwrap();
                for key in n.effects.bindings.keys() {
                    n.presentation
                        .set(key, motion::VisualValues::from_props(&n.props).get(key));
                }
                n.effects.bindings.clear();
            }
            MotionCommand::PrepareConnected { key } => {
                if key.is_empty() || key.len() > 256 {
                    return Err("connected animation key must have 1..256 bytes".into());
                }
                self.motion_runtime
                    .prepared
                    .retain(|_, p| self.time - p.prepared < 2000.);
                if self.motion_runtime.prepared.len() >= 64
                    && !self.motion_runtime.prepared.contains_key(&key)
                {
                    return Err("prepared connected animation limit reached".into());
                }
                let n = &self.nodes[&node];
                if n.rect.width <= 0. || n.rect.height <= 0. || !n.visible {
                    return Err("connected source must be laid out and visible".into());
                }
                let (world, size, parent) = (n.world, [n.rect.width, n.rect.height], n.parent);
                let inverse = world
                    .inverse()
                    .ok_or("connected source has a singular transform")?;
                let parent_world = parent.map(|p| self.nodes[&p].world).unwrap_or_default();
                let mut commands = vec![
                    Draw::Save,
                    Draw::Transform {
                        matrix: inverse.multiply(parent_world).0,
                    },
                ];
                self.paint_node(node, None, &mut commands);
                commands.push(Draw::Restore);
                if commands.len() > 32768 {
                    return Err("connected visual exceeds display-list snapshot budget".into());
                }
                self.motion_runtime.prepared.insert(
                    key,
                    PreparedConnection {
                        world,
                        size,
                        prepared: self.time,
                        commands,
                    },
                );
            }
            MotionCommand::StartConnected { key, configuration } => {
                let n = &self.nodes[&node];
                let previous_connection = n
                    .effects
                    .connection
                    .as_ref()
                    .map(|c| c.matrix(self.time))
                    .unwrap_or_default();
                let base_world = n.world.multiply(
                    previous_connection
                        .inverse()
                        .ok_or("connected target has a singular connection")?,
                );
                let inverse = base_world
                    .inverse()
                    .ok_or("connected target has a singular transform")?;
                if n.rect.width <= 0. || n.rect.height <= 0. || !n.visible {
                    return Err("connected target must be laid out and visible".into());
                }
                let Some(prepared) = self.motion_runtime.prepared.remove(&key) else {
                    return Ok(false);
                };
                if self.time - prepared.prepared >= 2000. {
                    return Ok(false);
                }
                let from = inverse.multiply(prepared.world).multiply(Matrix([
                    prepared.size[0] / n.rect.width,
                    0.,
                    0.,
                    prepared.size[1] / n.rect.height,
                    0.,
                    0.,
                ]));
                if !self.reduced_motion {
                    self.nodes.get_mut(&node).unwrap().effects.connection = Some(Connection {
                        from,
                        start: self.time,
                        duration: if configuration == ConnectedAnimationConfiguration::Direct {
                            200.
                        } else {
                            300.
                        },
                        configuration,
                        source: prepared.commands,
                        source_size: prepared.size,
                        key,
                    });
                }
            }
            MotionCommand::CancelConnected { key } => {
                self.motion_runtime.prepared.remove(&key);
                for n in self.nodes.values_mut() {
                    if n.effects.connection.as_ref().is_some_and(|c| c.key == key) {
                        n.effects.connection = None;
                    }
                }
            }
        }
        self.invalidate(node, false);
        Ok(true)
    }
    pub(super) fn implicit_updates(
        &self,
        id: u32,
        props: &NodeProperties,
        keys: &[&str],
    ) -> Vec<(String, f64, f64)> {
        let n = &self.nodes[&id];
        let Some(config) = &props.motion else {
            return vec![];
        };
        keys.iter()
            .filter_map(|key| {
                config
                    .implicit
                    .get(*key)
                    .filter(|_| {
                        motion::VisualValues::from_props(&n.props).get(key)
                            != motion::VisualValues::from_props(props).get(key)
                    })
                    .map(|duration| {
                        (
                            (*key).to_string(),
                            motion::VisualValues::from_props(props).get(key),
                            *duration,
                        )
                    })
            })
            .collect()
    }
    fn transition_kinds(&self, id: u32) -> Vec<ThemeTransition> {
        let n = &self.nodes[&id];
        let mut kinds = n
            .props
            .motion
            .as_ref()
            .map(|m| m.transitions.clone())
            .unwrap_or_default();
        if let Some(parent) = n
            .parent
            .and_then(|p| self.nodes.get(&p))
            .and_then(|p| p.props.motion.as_ref())
        {
            kinds.extend(&parent.children_transitions);
        }
        kinds
    }
    fn set_effect_recipe(&mut self, id: u32, recipe: &str, offset: [f64; 2], stagger: f64) {
        let now = self.time;
        let mut tracks = vec![];
        for track in &recipes()[recipe].tracks {
            let mut push = |key: &str, from: f64, to: f64| {
                tracks.push(EffectTrack {
                    key: key.into(),
                    from,
                    to,
                    start: now + stagger + track.delay_ms,
                    duration: track.duration_ms,
                    curve: track.curve,
                })
            };
            match track.kind {
                0 => {
                    push("translationX", offset[0], 0.);
                    push("translationY", offset[1], 0.);
                }
                1 => {
                    push(
                        "scaleX",
                        if track.flags & 2 != 0 {
                            track.values[2]
                        } else {
                            1.
                        },
                        track.values[0],
                    );
                    push(
                        "scaleY",
                        if track.flags & 2 != 0 {
                            track.values[3]
                        } else {
                            1.
                        },
                        track.values[1],
                    );
                }
                2 => push(
                    "opacity",
                    if track.flags & 2 != 0 {
                        track.values[1]
                    } else {
                        1.
                    },
                    track.values[0],
                ),
                _ => unreachable!("capture includes only supported theme tracks"),
            }
        }
        self.nodes.get_mut(&id).unwrap().effects.tracks = tracks;
    }
    /// Runs after layout. Expressions read final arranged geometry and evaluate in dependency order.
    pub(super) fn sync_motion_effects(&mut self) {
        let ids = self.nodes.keys().copied().collect::<Vec<_>>();
        let mut stagger: BTreeMap<u32, usize> = BTreeMap::new();
        for &id in &ids {
            let n = &self.nodes[&id];
            let kinds = self.transition_kinds(id);
            if kinds.is_empty()
                && n.props.motion.is_none()
                && n.effects.rect.is_none()
                && n.effects.bindings.is_empty()
            {
                continue;
            }
            let old_rect = n.effects.rect;
            let old_visible = n.effects.visible;
            let old_hover = n.effects.hover;
            let text_changed = n.effects.text != n.props.text;
            let old_values = n.effects.values(self.time);
            let rect = n.rect;
            let visible = n.visible;
            let just_loaded = visible && (!old_visible || old_rect.is_none());
            if !self.reduced_motion && visible {
                if just_loaded {
                    let recipe = if kinds.contains(&ThemeTransition::Entrance) {
                        Some(("entrance", [40., 0.]))
                    } else if kinds.contains(&ThemeTransition::AddDelete) {
                        Some(("add", [0., 0.]))
                    } else if kinds.contains(&ThemeTransition::Popup) {
                        Some(("popup", [0., 40.]))
                    } else if kinds.contains(&ThemeTransition::Content) {
                        Some(("content", [40., 0.]))
                    } else {
                        None
                    };
                    if let Some((recipe, offset)) = recipe {
                        let parent = n.parent.unwrap_or(self.root);
                        let count = stagger.entry(parent).or_default();
                        let disabled = self.nodes[&parent]
                            .props
                            .motion
                            .as_ref()
                            .is_some_and(|m| m.disable_stagger);
                        let delay = if disabled {
                            0.
                        } else {
                            (*count as f64 * recipes()[recipe].stagger_delay)
                                .min(recipes()[recipe].stagger_delay_cap)
                        };
                        *count += 1;
                        self.set_effect_recipe(id, recipe, offset, delay);
                    }
                } else if let Some(previous) = old_rect {
                    if (previous.x - rect.x).abs() + (previous.y - rect.y).abs() > 0.01
                        && (kinds.contains(&ThemeTransition::Reposition)
                            || kinds.contains(&ThemeTransition::AddDelete))
                    {
                        let value = old_values;
                        self.set_effect_recipe(
                            id,
                            "reposition",
                            [
                                previous.x - rect.x + value.translation_x,
                                previous.y - rect.y + value.translation_y,
                            ],
                            0.,
                        );
                    } else if text_changed && kinds.contains(&ThemeTransition::Content) {
                        self.set_effect_recipe(id, "content", [40., 0.], 0.);
                    }
                }
            }
            let n = &self.nodes[&id];
            let hover = n.enabled
                && n.visible
                && self.pointer.is_some_and(|(x, y)| {
                    n.world.inverse().is_some_and(|m| {
                        let (x, y) = m.point(x, y);
                        x >= 0. && y >= 0. && x < n.rect.width && y < n.rect.height
                    })
                });
            let spring = n.props.motion.as_ref().and_then(|m| m.hover_spring.clone());
            let bg = n.props.background.as_ref().and_then(|b| {
                if matches!(b, BrushValue::Gradient(_)) {
                    None
                } else {
                    Some(Self::color(b, n.theme))
                }
            });
            let bg_duration = n.props.motion.as_ref().and_then(|m| m.background_duration);
            let n = self.nodes.get_mut(&id).unwrap();
            if let Some(color) = bg.filter(|_| bg_duration.is_some()) {
                let target = crate::material::rgba(&color);
                let color = n.effects.background.get_or_insert(ColorTransition {
                    from: target,
                    to: target,
                    start: self.time,
                    duration: 0.,
                });
                if color.to != target {
                    *color = ColorTransition {
                        from: color.value(self.time),
                        to: target,
                        start: self.time,
                        duration: if self.reduced_motion {
                            0.
                        } else {
                            bg_duration.unwrap()
                        },
                    };
                }
            } else {
                n.effects.background = None;
            }
            if self.reduced_motion || !visible {
                n.effects.tracks.clear();
                n.effects.connection = None;
                if let Some(bg) = &mut n.effects.background {
                    bg.duration = 0.;
                }
            }
            if n.effects
                .connection
                .as_ref()
                .is_some_and(|c| self.time >= c.start + c.duration)
            {
                n.effects.connection = None;
            }
            n.effects
                .tracks
                .retain(|t| self.time < t.start + t.duration);
            n.effects.rect = Some(rect);
            n.effects.visible = visible;
            n.effects.text = n.props.text.clone();
            n.effects.hover = hover;
            if let Some(spring) = spring.filter(|_| hover != old_hover) {
                let scale = if hover { spring.scale } else { 1. };
                let _ = self.animate(
                    id,
                    serde_json::json!({"scaleX":scale,"scaleY":scale}),
                    AnimationOptions {
                        spring: Some(spring.spring),
                        ..Default::default()
                    },
                );
            }
        }
        fn evaluate(scene: &mut Scene, id: u32, done: &mut BTreeSet<u32>) {
            if !done.insert(id) {
                return;
            }
            let bindings = scene.nodes[&id].effects.bindings.clone();
            let mut refs = BTreeSet::new();
            for expr in bindings.values() {
                let _ = expr.references(&mut refs, 0);
            }
            for source in refs {
                if scene.nodes.contains_key(&source) {
                    evaluate(scene, source, done);
                }
            }
            for (key, expr) in bindings {
                if let Some(value) = expr.evaluate(scene) {
                    scene.nodes.get_mut(&id).unwrap().presentation.set(
                        &key,
                        if key == "opacity" {
                            value.clamp(0., 1.)
                        } else {
                            value
                        },
                    );
                }
            }
        }
        let mut done = BTreeSet::new();
        for id in ids {
            evaluate(self, id, &mut done);
        }
        self.motion_runtime.ghosts.retain(|g| {
            !self.reduced_motion
                && self.time < g.start + g.duration
                && self.nodes.contains_key(&g.parent)
        });
        self.motion_runtime
            .prepared
            .retain(|_, p| self.time - p.prepared < 2000.);
    }
    pub(super) fn capture_motion_exit(&mut self, id: u32) {
        let n = &self.nodes[&id];
        let kinds = self.transition_kinds(id);
        let recipe = if kinds.contains(&ThemeTransition::AddDelete) {
            "delete"
        } else if kinds.contains(&ThemeTransition::Popup) {
            "popupOut"
        } else if kinds.contains(&ThemeTransition::Content) {
            "contentOut"
        } else {
            return;
        };
        if self.reduced_motion || !n.visible || n.rect.width <= 0. || n.rect.height <= 0. {
            return;
        }
        let parent = n.parent.unwrap();
        let parent_world = self.nodes[&parent].world;
        let (cx, cy) = n.world.point(n.rect.width / 2., n.rect.height / 2.);
        let mut commands = vec![Draw::Save];
        let mut clip_count = 0;
        let mut ancestor = Some(parent);
        while let Some(at) = ancestor {
            let n = &self.nodes[&at];
            if n.props.clip || collections::is_scroll_owner(n.kind) {
                if let Some(inverse) = n.world.inverse() {
                    clip_count += 1;
                    commands.extend([
                        Draw::Transform { matrix: n.world.0 },
                        Draw::Clip {
                            rect: Rect::new(0., 0., n.rect.width, n.rect.height),
                        },
                        Draw::Transform { matrix: inverse.0 },
                    ]);
                }
            }
            ancestor = n.parent;
        }
        commands.push(Draw::Transform {
            matrix: parent_world.0,
        });
        self.paint_node(id, None, &mut commands);
        for _ in 0..clip_count {
            commands.push(Draw::Restore);
        }
        commands.push(Draw::Restore);
        let duration = recipes()[recipe]
            .tracks
            .iter()
            .map(|t| t.delay_ms + t.duration_ms)
            .fold(0., f64::max);
        self.motion_runtime.ghosts.push(Ghost {
            parent,
            start: self.time,
            duration,
            commands,
            recipe: recipe.into(),
            center: [cx, cy],
        });
        // Bound transient surfaces under repeated synchronous mutations.
        if self.motion_runtime.ghosts.len() > 128 {
            self.motion_runtime.ghosts.remove(0);
        }
    }
    pub(super) fn paint_motion_exits(&self, out: &mut Vec<Draw>) {
        for ghost in &self.motion_runtime.ghosts {
            let track = recipes()[&ghost.recipe]
                .tracks
                .iter()
                .find(|t| t.kind == 2)
                .unwrap();
            let t = ((self.time - ghost.start - track.delay_ms) / track.duration_ms).clamp(0., 1.);
            out.push(Draw::Save);
            out.push(Draw::Clip {
                rect: Rect::new(0., 0., self.width, self.height),
            });
            out.push(Draw::Layer {
                opacity: 1. - bezier(t, track.curve),
            });
            if let Some(scale) = recipes()[&ghost.recipe].tracks.iter().find(|t| t.kind == 1) {
                let t =
                    ((self.time - ghost.start - scale.delay_ms) / scale.duration_ms).clamp(0., 1.);
                let sx = 1. + (scale.values[0] - 1.) * bezier(t, scale.curve);
                let sy = 1. + (scale.values[1] - 1.) * bezier(t, scale.curve);
                out.push(Draw::Transform {
                    matrix: [
                        sx,
                        0.,
                        0.,
                        sy,
                        ghost.center[0] * (1. - sx),
                        ghost.center[1] * (1. - sy),
                    ],
                });
            }
            out.extend(ghost.commands.clone());
            out.push(Draw::EndLayer);
            out.push(Draw::Restore);
            out.push(Draw::Restore);
        }
    }
}
