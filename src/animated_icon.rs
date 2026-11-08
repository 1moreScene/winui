//! Pinned Composition visual graph and the public AnimatedIcon QueueOne policy.
use crate::{
    animation,
    enums::AnimatedIconSource,
    icons::{PathCommand, PathGeometry},
    model::Rect,
    render::Draw,
    scene::Matrix,
};
use serde::{Deserialize, Serialize};
use std::{
    collections::{BTreeMap, HashMap, VecDeque},
    sync::OnceLock,
};
#[derive(Deserialize)]
struct Contract {
    visuals: HashMap<String, RawSource>,
}
#[derive(Deserialize)]
struct RawSource {
    duration: f64,
    size: [f64; 2],
    markers: BTreeMap<String, f64>,
    animations: HashMap<String, Track>,
    variables: HashMap<String, String>,
    geometries: HashMap<String, Geometry>,
    root: Visual,
}
struct Source {
    raw: RawSource,
    paths: HashMap<String, PathGeometry>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Geometry {
    #[serde(default)]
    commands: Vec<PathCommand>,
    #[serde(default)]
    even_odd: bool,
    ellipse: Option<[f64; 2]>,
}
#[derive(Deserialize)]
struct Visual {
    properties: HashMap<String, Vec<f64>>,
    geometry: Option<String>,
    animations: HashMap<String, String>,
    children: Vec<Visual>,
}
#[derive(Deserialize)]
struct Track {
    kind: String,
    keys: Vec<Key>,
}
#[derive(Deserialize)]
struct Key {
    progress: f64,
    value: Value,
    curve: Option<[f64; 4]>,
    step: Option<String>,
}
#[derive(Deserialize)]
#[serde(untagged)]
enum Value {
    Literal(Vec<f64>),
    Bezier {
        variable: String,
        points: [[f64; 2]; 4],
    },
}
fn sources() -> &'static HashMap<String, Source> {
    static ALL: OnceLock<HashMap<String, Source>> = OnceLock::new();
    ALL.get_or_init(|| {
        let c: Contract = serde_json::from_str(include_str!("../references/animated-icons.json"))
            .expect("extracted animated icons");
        c.visuals
            .into_iter()
            .map(|(name, raw)| {
                let paths = raw
                    .geometries
                    .iter()
                    .map(|(key, g)| {
                        use kurbo::Shape;
                        let p = if let Some(r) = g.ellipse {
                            PathGeometry::from_bez(
                                &kurbo::Ellipse::new((0., 0.), (r[0], r[1]), 0.).to_path(0.001),
                                false,
                            )
                        } else {
                            let g = PathGeometry {
                                commands: g.commands.clone(),
                                bounds: Rect::default(),
                                even_odd: g.even_odd,
                            };
                            PathGeometry::from_bez(&g.to_bez(), g.even_odd)
                        };
                        (key.clone(), p)
                    })
                    .collect();
                (name, Source { raw, paths })
            })
            .collect()
    })
}
fn source(kind: AnimatedIconSource) -> Option<&'static Source> {
    sources().get(kind.as_str())
}
pub fn size(kind: AnimatedIconSource) -> [f64; 2] {
    source(kind).map(|s| s.raw.size).unwrap_or([0.; 2])
}
pub fn info(kind: AnimatedIconSource) -> serde_json::Value {
    source(kind).map(|s|serde_json::json!({"size":s.raw.size,"durationMs":s.raw.duration,"markers":s.raw.markers})).unwrap_or_else(||serde_json::json!({"size":[0,0],"durationMs":0,"markers":{}}))
}
fn value(v: &Value, vars: &HashMap<String, f64>) -> Vec<f64> {
    match v {
        Value::Literal(v) => v.clone(),
        Value::Bezier { variable, points } => {
            let t = vars[variable];
            let u = 1. - t;
            (0..2)
                .map(|i| {
                    u * u * u * points[0][i]
                        + 3. * u * u * t * points[1][i]
                        + 3. * u * t * t * points[2][i]
                        + t * t * t * points[3][i]
                })
                .collect()
        }
    }
}
fn sample(track: &Track, p: f64, base: &[f64], vars: &HashMap<String, f64>) -> Vec<f64> {
    let mut previous = base.to_vec();
    let mut start = 0.;
    for key in &track.keys {
        let end = value(&key.value, vars);
        if p < key.progress {
            if track.kind == "bool" {
                return previous;
            }
            let t = ((p - start) / (key.progress - start)).clamp(0., 1.);
            let t = if let Some(curve) = key.curve {
                animation::bezier(t, curve)
            } else if key.step.as_deref() == Some("end") {
                if t >= 1. {
                    1.
                } else {
                    0.
                }
            } else if key.step.as_deref() == Some("start") {
                if t > 0. {
                    1.
                } else {
                    0.
                }
            } else {
                t
            };
            return previous
                .iter()
                .zip(end)
                .map(|(a, b)| a + (b - a) * t)
                .collect();
        }
        previous = end;
        start = key.progress;
    }
    previous
}
fn draw_visual(
    v: &Visual,
    s: &Source,
    p: f64,
    vars: &HashMap<String, f64>,
    color: &str,
    out: &mut Vec<Draw>,
) {
    let mut props = v.properties.clone();
    for (name, track) in &v.animations {
        let base = props
            .get(name)
            .cloned()
            .unwrap_or_else(|| match name.as_str() {
                "Offset" => vec![0., 0.],
                "Scale.X" | "Scale.Y" | "Opacity" | "StrokeThickness" | "IsVisible" => vec![1.],
                _ => vec![0.],
            });
        props.insert(
            name.clone(),
            sample(&s.raw.animations[track], p, &base, vars),
        );
    }
    let scalar = |name: &str, default: f64| props.get(name).map(|v| v[0]).unwrap_or(default);
    let pair =
        |name: &str, default: [f64; 2]| props.get(name).map(|v| [v[0], v[1]]).unwrap_or(default);
    if scalar("IsVisible", 1.) < 0.5 || scalar("Opacity", 1.) <= 0. {
        return;
    }
    let center = pair("CenterPoint", [0.; 2]);
    let offset = pair("Offset", [0.; 2]);
    let scale = pair("Scale", [1.; 2]);
    let sx = scalar("Scale.X", scale[0]);
    let sy = scalar("Scale.Y", scale[1]);
    let angle = scalar("RotationAngleInDegrees", 0.).to_radians();
    let (c, sn) = (angle.cos(), angle.sin());
    let property = Matrix([
        c * sx,
        sn * sx,
        -sn * sy,
        c * sy,
        offset[0] + center[0] - c * sx * center[0] + sn * sy * center[1],
        offset[1] + center[1] - sn * sx * center[0] - c * sy * center[1],
    ]);
    let matrix = props
        .get("TransformMatrix")
        .map(|m| Matrix([m[0], m[1], m[2], m[3], m[4], m[5]]))
        .unwrap_or_default();
    out.push(Draw::Save);
    out.push(Draw::Transform {
        matrix: property.multiply(matrix).0,
    });
    let clipped = props.contains_key("Clip");
    if clipped {
        let size = pair("Size", s.raw.size);
        out.push(Draw::Clip {
            rect: Rect::new(0., 0., size[0], size[1]),
        });
    }
    let opacity = scalar("Opacity", 1.);
    if opacity < 1. {
        out.push(Draw::Layer { opacity });
    }
    if let Some(g) = v.geometry.as_ref().map(|g| &s.paths[g]) {
        if props.contains_key("FillBrush") {
            out.push(Draw::VectorPath {
                rect: g.bounds,
                geometry: g.clone(),
                color: color.into(),
            });
        }
        if props.contains_key("StrokeBrush") {
            let mut style = kurbo::Stroke::new(scalar("StrokeThickness", 1.));
            if props.contains_key("StrokeStartCap") {
                style.start_cap = kurbo::Cap::Round;
            }
            if props.contains_key("StrokeEndCap") {
                style.end_cap = kurbo::Cap::Round;
            }
            if props.contains_key("StrokeLineJoin") {
                style.join = kurbo::Join::Round;
            }
            style.miter_limit = scalar("StrokeMiterLimit", 10.);
            let path = kurbo::stroke(
                g.to_bez().elements().iter().copied(),
                &style,
                &kurbo::StrokeOpts::default(),
                0.005,
            );
            let outline = PathGeometry::from_bez(&path, false);
            out.push(Draw::VectorPath {
                rect: outline.bounds,
                geometry: outline,
                color: color.into(),
            });
        }
    }
    for child in &v.children {
        draw_visual(child, s, p, vars, color, out);
    }
    if opacity < 1. {
        out.push(Draw::EndLayer);
    }
    if clipped {
        out.push(Draw::Restore);
    }
    out.push(Draw::Restore);
}
pub fn draw(kind: AnimatedIconSource, progress: f64, color: &str, out: &mut Vec<Draw>) {
    if let Some(s) = source(kind) {
        let mut vars = HashMap::new();
        for (key, track) in &s.raw.variables {
            vars.insert(
                key.clone(),
                sample(&s.raw.animations[track], progress, &[0.], &HashMap::new())[0],
            );
        }
        draw_visual(&s.raw.root, s, progress, &vars, color, out);
    }
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub state: String,
    pub progress: f64,
    pub active: bool,
    pub queued_states: Vec<String>,
    pub segment_start: String,
    pub segment_end: String,
}
pub struct Player {
    kind: AnimatedIconSource,
    current: String,
    requested: Option<String>,
    queue: VecDeque<String>,
    progress: f64,
    from: f64,
    to: f64,
    start: f64,
    duration: f64,
    previous_length: f64,
    playing: bool,
    segment_start: String,
    segment_end: String,
}
impl Default for Player {
    fn default() -> Self {
        Self {
            kind: AnimatedIconSource::None,
            current: String::new(),
            requested: None,
            queue: VecDeque::new(),
            progress: 0.,
            from: 0.,
            to: 0.,
            start: 0.,
            duration: 0.,
            previous_length: 1.,
            playing: false,
            segment_start: String::new(),
            segment_end: String::new(),
        }
    }
}
impl Player {
    pub fn progress(&self, now: f64) -> f64 {
        if self.playing {
            self.from + (self.to - self.from) * ((now - self.start) / self.duration).clamp(0., 1.)
        } else {
            self.progress
        }
    }
    pub fn active(&self) -> bool {
        self.playing
    }
    fn transition(&mut self, next: String, now: f64, reduced: bool) {
        let Some(s) = source(self.kind) else {
            self.current = next;
            return;
        };
        let markers = &s.raw.markers;
        let name = format!("{}To{next}", self.current);
        let a = format!("{name}_Start");
        let b = format!("{name}_End");
        let pair = markers.get(&a).zip(markers.get(&b));
        self.segment_start.clear();
        self.segment_end.clear();
        if let Some((&from, &to)) = pair {
            self.from = from;
            self.to = to;
            self.previous_length = (to - from).abs();
            self.duration = s.raw.duration * self.previous_length;
            self.segment_start = a;
            self.segment_end = b;
        } else {
            let target = markers
                .get(&b)
                .map(|v| (*v, b.clone()))
                .or_else(|| markers.get(&a).map(|v| (*v, a.clone())))
                .or_else(|| markers.get(&name).map(|v| (*v, name.clone())))
                .or_else(|| markers.get(&next).map(|v| (*v, next.clone())))
                .or_else(|| {
                    markers
                        .iter()
                        .find(|(k, _)| k.contains(&format!("To{next}_End")))
                        .map(|(k, v)| (*v, k.clone()))
                });
            if let Some((to, label)) = target {
                self.from = to;
                self.to = to;
                self.duration = 0.;
                self.segment_end = label;
            } else if let Some(to) = next
                .trim_start()
                .parse::<f32>()
                .ok()
                .filter(|v| v.is_finite())
            {
                self.from = self.progress(now);
                self.to = to as f64;
                self.duration = s.raw.duration * self.previous_length;
                self.segment_end = next.clone();
            } else {
                self.from = 0.;
                self.to = 0.;
                self.duration = 0.;
                self.segment_end = "0.0".into();
            }
        }
        self.current = next;
        self.start = now;
        self.playing = !reduced && self.duration >= 20.;
        self.progress = if self.playing { self.from } else { self.to };
    }
    pub fn sync(
        &mut self,
        kind: AnimatedIconSource,
        state: &str,
        now: f64,
        reduced: bool,
        visible: bool,
    ) {
        if self.kind != kind {
            self.kind = kind;
            self.queue.clear();
            self.playing = false;
            self.progress = 0.;
            self.requested = None;
            self.previous_length = 1.;
        }
        self.advance(now, reduced || !visible);
        if self.requested.as_deref() != Some(state) {
            self.requested = Some(state.into());
            if self.playing {
                if self.queue.len() >= 4 {
                    let next = self.queue.pop_front().unwrap();
                    self.transition(next, now, reduced);
                }
                self.queue.push_back(state.into());
            } else {
                self.transition(state.into(), now, reduced || !visible);
            }
        }
        if reduced || !visible {
            self.advance(now, true);
        }
    }
    pub fn advance(&mut self, now: f64, snap: bool) {
        while self.playing && (snap || now >= self.start + self.duration) {
            let at = if snap {
                now
            } else {
                self.start + self.duration
            };
            self.progress = self.to;
            self.playing = false;
            if let Some(next) = self.queue.pop_front() {
                self.transition(next, at, snap);
            }
        }
        if snap {
            while let Some(next) = self.queue.pop_front() {
                self.transition(next, now, true);
            }
        }
    }
    pub fn snapshot(&self, now: f64) -> Snapshot {
        Snapshot {
            state: self.current.clone(),
            progress: self.progress(now),
            active: self.playing,
            queued_states: self.queue.iter().cloned().collect(),
            segment_start: self.segment_start.clone(),
            segment_end: self.segment_end.clone(),
        }
    }
}
