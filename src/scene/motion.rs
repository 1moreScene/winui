use super::*;
use crate::animation::{bezier, Motion};

/// Logical targets live in NodeProperties; these are the currently presented values.
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct VisualValues {
    pub translation_x: f64,
    pub translation_y: f64,
    pub translation_z: f64,
    pub scale_x: f64,
    pub scale_y: f64,
    pub opacity: f64,
    pub rotation: f64,
}
impl Default for VisualValues {
    fn default() -> Self {
        Self {
            translation_x: 0.,
            translation_y: 0.,
            translation_z: 0.,
            scale_x: 1.,
            scale_y: 1.,
            opacity: 1.,
            rotation: 0.,
        }
    }
}
impl VisualValues {
    pub fn from_props(p: &NodeProperties) -> Self {
        Self {
            translation_x: p.translation_x,
            translation_y: p.translation_y,
            translation_z: p.translation_z,
            scale_x: p.scale_x,
            scale_y: p.scale_y,
            opacity: p.opacity,
            rotation: p.rotation,
        }
    }
    pub fn matrix(self, base: [f64; 6], center: [f64; 2]) -> Matrix {
        let r = self.rotation.to_radians();
        let (sin, cos) = r.sin_cos();
        Matrix([1., 0., 0., 1., self.translation_x, self.translation_y])
            .multiply(Matrix(base))
            .multiply(Matrix([1., 0., 0., 1., center[0], center[1]]))
            .multiply(Matrix([cos, sin, -sin, cos, 0., 0.]))
            .multiply(Matrix([self.scale_x, 0., 0., self.scale_y, 0., 0.]))
            .multiply(Matrix([1., 0., 0., 1., -center[0], -center[1]]))
    }
    pub(super) fn get(self, key: &str) -> f64 {
        match key {
            "translationX" => self.translation_x,
            "translationY" => self.translation_y,
            "translationZ" => self.translation_z,
            "scaleX" => self.scale_x,
            "scaleY" => self.scale_y,
            "opacity" => self.opacity,
            "rotation" => self.rotation,
            _ => unreachable!(),
        }
    }
    pub(super) fn set(&mut self, key: &str, value: f64) {
        match key {
            "translationX" => self.translation_x = value,
            "translationY" => self.translation_y = value,
            "translationZ" => self.translation_z = value,
            "scaleX" => self.scale_x = value,
            "scaleY" => self.scale_y = value,
            "opacity" => self.opacity = value,
            "rotation" => self.rotation = value,
            _ => unreachable!(),
        }
    }
}
#[derive(Clone, Debug, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct AnimationOptions {
    pub spring:Option<super::motion_effects::SpringOptions>,
    pub duration: f64,
    pub delay: f64,
    pub easing: AnimationEasing,
    /// Optional cubic; x control points must remain in [0,1].
    pub curve: Option<[f64; 4]>,
    pub easing_function: Option<EasingFunction>,
    pub easing_mode: EasingMode,
    pub easing_parameters: crate::easing::EasingParameters,
}
impl Default for AnimationOptions {
    fn default() -> Self {
        Self {
            spring:None,
            duration: 600.,
            delay: 0.,
            easing: AnimationEasing::EaseOut,
            curve: None,
            easing_function: None,
            easing_mode: EasingMode::default(),
            easing_parameters: Default::default(),
        }
    }
}
impl AnimationOptions {
    fn curve(&self) -> [f64; 4] {
        self.curve.unwrap_or(match self.easing {
            AnimationEasing::Discrete | AnimationEasing::Linear => [0., 0., 1., 1.],
            AnimationEasing::EaseOut => [0.1, 0.9, 0.2, 1.],
            AnimationEasing::EaseIn => [0.9, 0.1, 1., 0.2],
            AnimationEasing::Material => [0.5, 0., 0., 0.9],
        })
    }
    fn validate(&self) -> Result<(), String> {
        self.easing_parameters.validate()?;
        if let Some(spring)=&self.spring {spring.validate()?;}
        let c = self.curve();
        if [self.duration, self.delay]
            .iter()
            .any(|v| !v.is_finite() || !(0. ..=86_400_000.).contains(v))
            || c.iter().any(|v| !v.is_finite() || v.abs() > 10.)
            || !(0. ..=1.).contains(&c[0])
            || !(0. ..=1.).contains(&c[2])
        {
            return Err("invalid animation duration, delay or cubic curve".into());
        }
        Ok(())
    }
}
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ScalarKeyFrame {
    pub offset: f64,
    pub value: f64,
    #[serde(default)]
    pub easing: Option<AnimationEasing>,
    #[serde(default)]
    pub curve: Option<[f64; 4]>,
}
#[derive(Deserialize)]
#[serde(untagged)]
enum TrackValue {
    Value(f64),
    Frames(Vec<ScalarKeyFrame>),
}
fn progress(
    t: f64,
    options: &AnimationOptions,
    easing: Option<AnimationEasing>,
    curve: Option<[f64; 4]>,
) -> f64 {
    if let Some(curve) = curve {
        return bezier(t, curve);
    }
    if let Some(kind) = easing {
        let mut local = options.clone();
        local.easing = kind;
        local.curve = None;
        local.easing_function = None;
        return progress(t, &local, None, None);
    }
    if let Some(curve) = options.curve {
        return bezier(t, curve);
    }
    if let Some(function) = options.easing_function {
        return crate::easing::sample(function, options.easing_mode, t, &options.easing_parameters);
    }
    if options.easing == AnimationEasing::Discrete {
        return if t >= 1. { 1. } else { 0. };
    }
    bezier(t, options.curve())
}
fn track_value(frames: &[ScalarKeyFrame], from: f64, t: f64, options: &AnimationOptions) -> f64 {
    let (mut offset, mut value) = (0., from);
    for frame in frames {
        if frame.offset == 0. {
            value = frame.value;
            continue;
        }
        if t <= frame.offset {
            let u = ((t - offset) / (frame.offset - offset)).clamp(0., 1.);
            return value + (frame.value - value) * progress(u, options, frame.easing, frame.curve);
        }
        offset = frame.offset;
        value = frame.value;
    }
    value
}
pub(super) struct Animation {
    id: u32,
    node: u32,
    start: f64,
    options: AnimationOptions,
    from: VisualValues,
    targets: BTreeMap<String, Vec<ScalarKeyFrame>>,
    velocities:BTreeMap<String,f64>,
}
impl Animation {
    fn value(&self,key:&str,elapsed:f64)->f64 {
        let frames=&self.targets[key];
        if let Some(spring)=&self.options.spring {spring.value(self.from.get(key),frames.last().unwrap().value,*self.velocities.get(key).unwrap_or(&0.),elapsed)}
        else {track_value(frames,self.from.get(key),if self.options.duration==0. {1.}else{(elapsed/self.options.duration).clamp(0.,1.)},&self.options)}
    }
}
#[derive(Serialize)]
pub struct AnimationCompletion {
    pub id: u32,
    pub result: AnimationResult,
}

impl Scene {
    /// A group owns all its tracks. Overlap interrupts the complete older group.
    pub fn animate(
        &mut self,
        node: u32,
        targets: serde_json::Value,
        mut options: AnimationOptions,
    ) -> Result<u32, String> {
        self.get(node)?;
        options.validate()?;
        if let Some(spring)=&options.spring {options.duration=spring.duration();}
        let targets = targets
            .as_object()
            .ok_or("animation targets must be an object")?;
        if targets.is_empty()
            || targets.keys().any(|k| {
                !matches!(
                    k.as_str(),
                    "translationX" | "translationY" | "translationZ" | "scaleX" | "scaleY" | "opacity" | "rotation"
                )
            })
        {
            return Err("animate requires translationX/Y, scaleX/Y or opacity targets".into());
        }
        let mut tracks = BTreeMap::new();
        let mut patch = serde_json::Map::new();
        for (key, value) in targets {
            let value: TrackValue =
                serde_json::from_value(value.clone()).map_err(|e| e.to_string())?;
            let frames = match value {
                TrackValue::Value(value) => vec![ScalarKeyFrame {
                    offset: 1.,
                    value,
                    easing: None,
                    curve: None,
                }],
                TrackValue::Frames(frames) => frames,
            };
            if frames.is_empty() || frames.len() > 256 || frames.last().unwrap().offset != 1. {
                return Err("keyframes require 1..256 entries ending at offset 1".into());
            }
            let mut previous = -1.;
            for f in &frames {
                if !f.offset.is_finite() || !(0. ..=1.).contains(&f.offset) || f.offset <= previous
                {
                    return Err("keyframe offsets must increase strictly from 0 to 1".into());
                }
                properties::patch(
                    &self.get(node)?.props,
                    &serde_json::json!({key:f.value}),
                    self.get(node)?.kind,
                )?;
                let mut segment = options.clone();
                if let Some(curve) = f.curve {
                    segment.curve = Some(curve);
                }
                segment.validate()?;
                previous = f.offset;
            }
            patch.insert(key.clone(), serde_json::json!(frames.last().unwrap().value));
            tracks.insert(key.clone(), frames);
        }
        if options.spring.is_some() && tracks.values().any(|frames|frames.len()!=1) {return Err("spring animation accepts scalar endpoints only".into());}
        let velocities=targets.keys().map(|key|{
            let v=options.spring.as_ref().and_then(|s|s.initial_velocity).unwrap_or_else(||self.animations.values().find(|a|a.node==node&&a.targets.contains_key(key)).map(|a|{
                let elapsed=(self.time-a.start-a.options.delay).max(0.);
                (a.value(key,elapsed+0.01)-a.value(key,elapsed))/0.01
            }).unwrap_or(0.));(key.clone(),v)
        }).collect();
        let patch = serde_json::Value::Object(patch);
        let props = properties::patch(&self.get(node)?.props, &patch, self.get(node)?.kind)?;
        let id = self
            .next_animation
            .checked_add(1)
            .ok_or("animation handle space exhausted")?;
        self.interrupt(
            node,
            targets.keys().map(String::as_str).collect(),
            AnimationResult::Interrupted,
        );
        let from = self.get(node)?.presentation;
        for key in targets.keys() {self.nodes.get_mut(&node).unwrap().effects.bindings.remove(key);}
        self.nodes.get_mut(&node).unwrap().props = props;
        self.next_animation = id;
        self.revision+=1;
        self.animations.insert(
            id,
            Animation {
                id,
                node,
                start: self.time,
                options,
                from,
                targets: tracks,
                velocities,
            },
        );
        self.advance_animations();
        Ok(id)
    }
    pub fn cancel_animation(&mut self, id: u32) {
        self.finish_animation(id, AnimationResult::Cancelled);
    }
    fn finish_animation(&mut self, id: u32, result: AnimationResult) {
        if self.animations.remove(&id).is_some() {
            self.animation_completions
                .push(AnimationCompletion { id, result });
        }
    }
    pub(super) fn interrupt(&mut self, node: u32, keys: Vec<&str>, result: AnimationResult) {
        let ids: Vec<_> = self
            .animations
            .values()
            .filter(|a| {
                a.node == node
                    && (keys.is_empty() || keys.iter().any(|k| a.targets.contains_key(*k)))
            })
            .map(|a| a.id)
            .collect();
        for id in ids {
            self.finish_animation(id, result);
        }
    }
    pub(super) fn advance_animations(&mut self) {
        let mut finished = vec![];
        for a in self.animations.values() {
            let elapsed = self.time - a.start - a.options.delay;
            let t = if self.reduced_motion {
                1.
            } else if elapsed < 0. {
                0.
            } else if a.options.duration == 0. {
                1.
            } else {
                (elapsed / a.options.duration).clamp(0., 1.)
            };
            let n = self
                .nodes
                .get_mut(&a.node)
                .expect("destroy cancels owned animations");
            for (key, target) in &a.targets {
                let value = if elapsed < 0. && !self.reduced_motion {
                    a.from.get(key)
                } else {
                    if t>=1. {target.last().unwrap().value}else{a.value(key,elapsed)}
                };
                // Cubic overshoot is permitted for transforms, never for group alpha.
                n.presentation.set(
                    key,
                    if key == "opacity" {
                        value.clamp(0., 1.)
                    } else {
                        value
                    },
                );
            }
            if t >= 1. {
                finished.push(a.id);
            }
        }
        for id in finished {
            self.finish_animation(id, AnimationResult::Completed);
        }
    }
    pub fn set_policies(&mut self, reduced_motion: bool, reduced_transparency: bool) {
        self.reduced_motion = reduced_motion;
        self.reduced_transparency = reduced_transparency;
        self.advance_animations();
        self.refresh_visual_tree(self.root, Matrix::default(), self.theme, true, true);
        self.sync_accept_visuals();
        for n in self.nodes.values_mut() {
            if n.props.acrylic.is_none() && n.props.acrylic_resource.is_none() {
                continue;
            }
            let target = if reduced_transparency || n.theme == Theme::HighContrast {
                0.
            } else {
                1.
            };
            if reduced_motion || n.theme == Theme::HighContrast {
                n.material_motion.snap(target);
            } else if n.material_motion.to != target {
                n.material_motion.retarget(
                    target,
                    self.time,
                    crate::material::constants().switch_duration,
                );
            }
        }
        self.invalidate(self.root, false);
    }
}

pub(super) fn material_motion() -> Motion {
    let mut motion = Motion {
        curve: crate::material::constants().switch_curve,
        ..Motion::default()
    };
    motion.snap(1.);
    motion
}
