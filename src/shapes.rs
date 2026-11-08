//! Shape measure/geometry/stroke share the pinned CShape contract.
use crate::{
    enums::*,
    icons::PathGeometry,
    model::Rect,
    render::Draw,
    scene::{BrushValue, NodeProperties},
};
use kurbo::{BezPath, ParamCurve, ParamCurveDeriv, Shape};
pub fn is_shape(kind: NodeKind) -> bool {
    matches!(
        kind,
        NodeKind::Rectangle
            | NodeKind::Line
            | NodeKind::Path
            | NodeKind::Polygon
            | NodeKind::Polyline
    )
}
pub fn geometry(kind: NodeKind, p: &NodeProperties) -> Result<PathGeometry, String> {
    if kind == NodeKind::Path {
        return crate::icons::parse_path(&p.data);
    }
    let mut path = BezPath::new();
    if kind == NodeKind::Line {
        path.move_to((p.x1, p.y1));
        path.line_to((p.x2, p.y2));
    } else if matches!(kind, NodeKind::Polygon | NodeKind::Polyline) && p.points.len() > 1 {
        path.move_to((p.points[0][0], p.points[0][1]));
        for v in p.points.iter().skip(1) {
            path.line_to((v[0], v[1]));
        }
        if kind == NodeKind::Polygon {
            path.close_path();
        }
    }
    Ok(PathGeometry::from_bez(
        &path,
        p.fill_rule == FillRule::EvenOdd,
    ))
}
pub fn stroke_width(p: &NodeProperties) -> f64 {
    if p.stroke.is_some() {
        p.stroke_thickness
    } else {
        0.
    }
}
pub fn measure(
    kind: NodeKind,
    p: &NodeProperties,
    g: &PathGeometry,
    available: [f64; 2],
) -> [f64; 2] {
    let t = stroke_width(p);
    if kind == NodeKind::Rectangle {
        return [t; 2];
    }
    if g.commands.is_empty() {
        return [0.; 2];
    }
    let b = g.bounds;
    if p.stretch == ImageStretch::None {
        return [
            (b.x + b.width + t / 2.).max(0.),
            (b.y + b.height + t / 2.).max(0.),
        ];
    }
    let mut scale = [1.; 2];
    for i in 0..2 {
        let dim = if i == 0 { b.width } else { b.height };
        if available[i].is_finite() && dim > 1e-7 {
            scale[i] = (available[i] - t).max(0.) / dim;
        }
    }
    if p.stretch != ImageStretch::Fill {
        let common = if available.iter().all(|v| v.is_finite()) {
            if p.stretch == ImageStretch::Uniform {
                scale[0].min(scale[1])
            } else {
                scale[0].max(scale[1])
            }
        } else if available[0].is_finite() {
            scale[0]
        } else {
            scale[1]
        };
        scale = [common; 2];
    }
    [b.width * scale[0] + t, b.height * scale[1] + t]
}
fn rectangle(r: Rect, rx: f64, ry: f64) -> BezPath {
    let (rx, ry) = (rx.min(r.width / 2.), ry.min(r.height / 2.));
    let x = r.x;
    let y = r.y;
    let (right, bottom) = (x + r.width, y + r.height);
    let k = 0.5522847498307936;
    let mut b = BezPath::new();
    b.move_to((x + rx, y));
    b.line_to((right - rx, y));
    b.curve_to(
        (right - rx + k * rx, y),
        (right, y + ry - k * ry),
        (right, y + ry),
    );
    b.line_to((right, bottom - ry));
    b.curve_to(
        (right, bottom - ry + k * ry),
        (right - rx + k * rx, bottom),
        (right - rx, bottom),
    );
    b.line_to((x + rx, bottom));
    b.curve_to(
        (x + rx - k * rx, bottom),
        (x, bottom - ry + k * ry),
        (x, bottom - ry),
    );
    b.line_to((x, y + ry));
    b.curve_to((x, y + ry - k * ry), (x + rx - k * rx, y), (x + rx, y));
    b.close_path();
    b
}
fn cap(cap: PenLineCap) -> kurbo::Cap {
    match cap {
        PenLineCap::Flat | PenLineCap::Triangle => kurbo::Cap::Butt,
        PenLineCap::Round => kurbo::Cap::Round,
        PenLineCap::Square => kurbo::Cap::Square,
    }
}
fn widen(path: &BezPath, p: &NodeProperties, start: PenLineCap, end: PenLineCap) -> BezPath {
    let mut stroke = kurbo::Stroke::new(p.stroke_thickness);
    stroke.start_cap = cap(start);
    stroke.end_cap = cap(end);
    stroke.join = match p.stroke_line_join {
        PenLineJoin::Miter => kurbo::Join::Miter,
        PenLineJoin::Bevel => kurbo::Join::Bevel,
        PenLineJoin::Round => kurbo::Join::Round,
    };
    stroke.miter_limit = p.stroke_miter_limit;
    let mut outline = kurbo::stroke(
        path.elements().iter().copied(),
        &stroke,
        &kurbo::StrokeOpts::default(),
        0.005,
    );
    if start == PenLineCap::Triangle || end == PenLineCap::Triangle {
        let segments: Vec<_> = path.segments().collect();
        for (s, t, dir) in [(segments.first(), 0., -1.), (segments.last(), 1., 1.)] {
            let enabled = if t == 0. {
                start == PenLineCap::Triangle
            } else {
                end == PenLineCap::Triangle
            };
            if !enabled {
                continue;
            }
            if let Some(seg) = s {
                let point = seg.eval(t);
                let d = match seg {
                    kurbo::PathSeg::Line(v) => v.deriv().eval(t),
                    kurbo::PathSeg::Quad(v) => v.deriv().eval(t),
                    kurbo::PathSeg::Cubic(v) => v.deriv().eval(t),
                };
                let n = d.x.hypot(d.y);
                if n < 1e-12 {
                    continue;
                }
                let half = p.stroke_thickness / 2.;
                let u = kurbo::Vec2::new(d.x / n, d.y / n);
                let v = kurbo::Vec2::new(-u.y, u.x);
                let mut points = [point + v * half, point - v * half, point + u * (half * dir)];
                let sign = (points[1] - points[0]).cross(points[2] - points[0]);
                if sign * outline.area() < 0. {
                    points.swap(0, 1);
                }
                outline.move_to(points[0]);
                outline.line_to(points[1]);
                outline.line_to(points[2]);
                outline.close_path();
            }
        }
    }
    outline
}
fn brush(
    geometry: PathGeometry,
    value: &BrushValue,
    theme: crate::model::Theme,
    out: &mut Vec<Draw>,
) {
    let resolved = match value {
        BrushValue::Gradient(b) => b.clone(),
        BrushValue::Resource { resource } => Box::new(
            crate::resources::Resources::current()
                .resolve(theme, resource)
                .unwrap()
                .clone(),
        ),
        BrushValue::Color(color) => {
            out.push(Draw::VectorPath {
                rect: geometry.bounds,
                geometry,
                color: color.clone(),
            });
            return;
        }
    };
    if resolved.kind == "solid" {
        out.push(Draw::VectorPath {
            rect: geometry.bounds,
            geometry,
            color: resolved.solid_color(),
        });
    } else {
        out.push(Draw::PathBrush {
            rect: geometry.bounds,
            geometry,
            brush: resolved,
        });
    }
}
pub fn paint(
    kind: NodeKind,
    p: &NodeProperties,
    g: &PathGeometry,
    r: Rect,
    theme: crate::model::Theme,
    out: &mut Vec<Draw>,
) {
    let t = stroke_width(p);
    let mut path = g.to_bez();
    if kind == NodeKind::Rectangle {
        if p.stretch == ImageStretch::None {
            return;
        }
        let mut w = (r.width - t).max(0.);
        let mut h = (r.height - t).max(0.);
        if p.stretch == ImageStretch::Uniform {
            w = w.min(h);
            h = w;
        } else if p.stretch == ImageStretch::UniformToFill {
            w = w.max(h);
            h = w;
        }
        path = rectangle(
            Rect::new(
                t / 2. + (r.width - w - t).max(0.) / 2.,
                t / 2. + (r.height - h - t).max(0.) / 2.,
                w,
                h,
            ),
            p.radius_x,
            p.radius_y,
        );
    } else if p.stretch != ImageStretch::None {
        let b = g.bounds;
        let mut sx = if b.width > 1e-7 {
            (r.width - t).max(0.) / b.width
        } else {
            1.
        };
        let mut sy = if b.height > 1e-7 {
            (r.height - t).max(0.) / b.height
        } else {
            1.
        };
        if p.stretch == ImageStretch::Uniform {
            sx = sx.min(sy);
            sy = sx;
        } else if p.stretch == ImageStretch::UniformToFill {
            sx = sx.max(sy);
            sy = sx;
        }
        path.apply_affine(kurbo::Affine::new([
            sx,
            0.,
            0.,
            sy,
            t / 2. - b.x * sx + (r.width - b.width * sx - t).max(0.) / 2.,
            t / 2. - b.y * sy + (r.height - b.height * sy - t).max(0.) / 2.,
        ]));
    }
    if path.elements().is_empty() {
        return;
    }
    if kind != NodeKind::Line {
        if let Some(fill) = &p.fill {
            brush(PathGeometry::from_bez(&path, g.even_odd), fill, theme, out);
        }
    }
    if let Some(value) = &p.stroke {
        if p.stroke_thickness > 0. {
            let outline = if p.stroke_dash_array.is_empty() {
                widen(&path, p, p.stroke_start_line_cap, p.stroke_end_line_cap)
            } else {
                let pattern: Vec<_> = p
                    .stroke_dash_array
                    .iter()
                    .map(|n| n * p.stroke_thickness)
                    .collect();
                let dashed = kurbo::dash(
                    path.elements().iter().copied(),
                    p.stroke_dash_offset * p.stroke_thickness,
                    &pattern,
                );
                let mut whole = BezPath::new();
                let mut current = BezPath::new();
                for el in dashed {
                    if matches!(el, kurbo::PathEl::MoveTo(_)) && !current.elements().is_empty() {
                        whole.extend(
                            widen(&current, p, p.stroke_dash_cap, p.stroke_dash_cap)
                                .elements()
                                .iter()
                                .copied(),
                        );
                        current = BezPath::new();
                    }
                    current.push(el);
                }
                if !current.elements().is_empty() {
                    whole.extend(
                        widen(&current, p, p.stroke_dash_cap, p.stroke_dash_cap)
                            .elements()
                            .iter()
                            .copied(),
                    );
                }
                whole
            };
            brush(PathGeometry::from_bez(&outline, false), value, theme, out);
        }
    }
}
