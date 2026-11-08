//! AnimatedAcceptVisualSource geometry and marker slices from the pinned WinUI source.
//! Marker playback is shared by the two renderers. Native AnimatedIcon queue policy
//! is not yet reproduced; interrupted segments are replaced with the new segment.
use crate::{enums::ControlState, model::Rect, render::Draw};
use serde::Deserialize;
use std::{collections::HashMap, sync::OnceLock};
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Source {
    duration_ms: f64,
    size: f64,
    scale: f64,
    shape_scale: f64,
    stroke: f64,
    geometries: Vec<Vec<[f64; 2]>>,
    segments: HashMap<String, Segment>,
}
#[derive(Deserialize)]
struct Segment {
    geometry: Option<usize>,
    #[serde(default)]
    start: f64,
    #[serde(default)]
    end: f64,
    trim: Option<Trim>,
}
#[derive(Deserialize)]
struct Trim {
    property: String,
    start: f64,
    end: f64,
    curve: [f64; 4],
}
fn source() -> &'static Source {
    static SOURCE: OnceLock<Source> = OnceLock::new();
    SOURCE.get_or_init(|| {
        serde_json::from_str(include_str!("../references/animated-accept.json"))
            .expect("extracted AnimatedAccept source")
    })
}
#[derive(Default)]
pub struct AcceptVisual {
    state: Option<String>,
    checked: Option<bool>,
    segment: Option<String>,
    started: f64,
}
impl AcceptVisual {
    pub fn sync(&mut self, visual: ControlState, checked: Option<bool>, now: f64, reduced: bool) {
        let prefix = match visual {
            ControlState::PointerOver => "PointerOver",
            ControlState::Pressed => "Pressed",
            _ => "Normal",
        };
        let next = format!(
            "{prefix}{}",
            match checked {
                Some(true) => "On",
                Some(false) => "Off",
                None => "Indeterminate",
            }
        );
        if self.state.as_ref() != Some(&next) {
            self.segment = self.state.as_ref().and_then(|previous| {
                let key = format!("{previous}To{next}");
                source().segments.contains_key(&key).then_some(key)
            });
            self.started = now;
            self.state = Some(next);
            self.checked = checked;
        }
        if reduced {
            self.segment = None;
        }
    }
    pub fn active(&self, now: f64) -> bool {
        self.segment.as_ref().is_some_and(|key| {
            let s = &source().segments[key];
            now < self.started + (s.end - s.start) * source().duration_ms
        })
    }
    pub fn path(&self, now: f64) -> Vec<[f64; 2]> {
        let src = source();
        let mut trim = [0., 1.];
        let geometry = if self.active(now) {
            let seg = &src.segments[self.segment.as_ref().unwrap()];
            if let Some(tr) = &seg.trim {
                let progress = seg.start + (now - self.started).max(0.) / src.duration_ms;
                let value = crate::animation::bezier(
                    ((progress - tr.start) / (tr.end - tr.start)).clamp(0., 1.),
                    tr.curve,
                );
                trim[usize::from(tr.property == "TrimEnd")] = value;
            }
            seg.geometry
        } else {
            match self.checked {
                Some(true) => Some(1),
                None => Some(0),
                _ => None,
            }
        };
        geometry
            .map(|index| trim_path(&src.geometries[index], trim))
            .unwrap_or_default()
    }
    pub fn draw(&self, now: f64, rect: Rect, color: String) -> Option<Draw> {
        let src = source();
        let path = self.path(now);
        if path.len() < 2 {
            return None;
        }
        let factor = rect.width / src.size;
        let y = if self.checked.is_none() { 24. } else { 23. };
        // The template gives the checked/off icon Margin=0,1,0,-1; mixed uses zero.
        let margin = if self.checked.is_none() { 0. } else { 1. };
        Some(Draw::Polyline {
            points: path
                .into_iter()
                .map(|[x, p]| {
                    [
                        rect.x + (24. + src.scale * src.shape_scale * x) * factor,
                        rect.y
                            + (24. + src.scale * (y - 24. + src.shape_scale * p)) * factor
                            + margin,
                    ]
                })
                .collect(),
            width: src.stroke * src.scale * src.shape_scale * factor,
            color,
        })
    }
}
fn trim_path(points: &[[f64; 2]], trim: [f64; 2]) -> Vec<[f64; 2]> {
    if trim == [0., 1.] {
        return points.to_vec();
    }
    if trim[1] - trim[0] <= 1e-9 {
        return vec![];
    }
    let lengths: Vec<_> = points
        .windows(2)
        .map(|p| (p[1][0] - p[0][0]).hypot(p[1][1] - p[0][1]))
        .collect();
    let total: f64 = lengths.iter().sum();
    let start = total * trim[0];
    let end = total * trim[1];
    let mut result = vec![];
    let mut offset = 0.;
    for (p, length) in points.windows(2).zip(lengths) {
        let left = start.max(offset);
        let right = end.min(offset + length);
        if right > left && length > 0. {
            for d in [left, right] {
                let t = (d - offset) / length;
                let point = if t >= 1. {
                    p[1]
                } else if t <= 0. {
                    p[0]
                } else {
                    [
                        p[0][0] + (p[1][0] - p[0][0]) * t,
                        p[0][1] + (p[1][1] - p[0][1]) * t,
                    ]
                };
                if result.last().is_none_or(|previous: &[f64; 2]| {
                    (previous[0] - point[0]).hypot(previous[1] - point[1]) > 1e-10
                }) {
                    result.push(point);
                }
            }
        }
        offset += length;
    }
    result
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn native_marker_slices_trim_and_reduced_motion() {
        let mut visual = AcceptVisual::default();
        visual.sync(ControlState::Normal, Some(false), 0., false);
        assert!(visual.path(0.).is_empty());
        visual.sync(ControlState::Normal, Some(true), 10., false);
        assert!(visual.active(20.));
        let length = |p: Vec<[f64; 2]>| {
            p.windows(2)
                .map(|p| (p[1][0] - p[0][0]).hypot(p[1][1] - p[0][1]))
                .sum::<f64>()
        };
        assert!(length(visual.path(90.)) < length(visual.path(200.)));
        // The cached _cubicBezierEasingFunction_0 reference must retain native
        // ease-out. A linear fallback draws only ~47% at 150ms, visibly too slow.
        let complete = length(visual.path(330.));
        assert!(length(visual.path(160.)) / complete > 0.8);
        assert!(length(visual.path(210.)) / complete > 0.9);
        assert!(!visual.active(330.));
        assert_eq!(visual.path(330.), source().geometries[1]);
        visual.sync(ControlState::Normal, Some(false), 340., false);
        assert!(visual.active(350.));
        visual.sync(ControlState::Normal, Some(false), 350., true);
        assert!(visual.path(350.).is_empty());
        visual.sync(ControlState::Normal, None, 360., false);
        assert_eq!(visual.path(360.), source().geometries[0]);
    }
}
