use serde_json::json;
use winui_wasm::{
    enums::*,
    render::Draw,
    scene::{Scene, Update},
    shapes,
    typography::{Font, Metrics, TextMeasurer},
};
struct Measure;
impl TextMeasurer for Measure {
    fn measure(&mut self, _: &str, f: &Font) -> Metrics {
        Metrics {
            width: 0.,
            ascent: f.size,
            descent: 0.,
            ..Default::default()
        }
    }
}
fn scene() -> Scene {
    let mut s = Scene::new(Theme::Light, true);
    s.resize(500., 300., 1.25).unwrap();
    s
}
#[test]
fn source_shape_defaults_natural_geometry_and_noninteractive_ownership() {
    let mut s = scene();
    let line = s
        .create(
            s.root,
            NodeKind::Line,
            json!({"x1":4,"y1":6,"x2":140,"y2":44,"stroke":"#000000","strokeThickness":4}),
        )
        .unwrap();
    let n = &s.nodes[&line];
    assert_eq!(
        shapes::measure(
            n.kind,
            &n.props,
            n.shape_path.as_ref().unwrap(),
            [f64::INFINITY; 2]
        ),
        [142., 46.]
    );
    assert_eq!(n.props.stretch, ImageStretch::None);
    assert!(!n.props.is_tab_stop);
    assert!(s.create(line, NodeKind::Grid, json!({})).is_err());
    let r = s
        .create(
            s.root,
            NodeKind::Rectangle,
            json!({"width":100,"height":60,"radiusX":20,"radiusY":5,"fill":"#4682b4"}),
        )
        .unwrap();
    assert_eq!(s.nodes[&r].props.stretch, ImageStretch::Fill);
    s.layout(&mut Measure);
    assert!(s
        .display_list()
        .iter()
        .any(|c| matches!(c, Draw::VectorPath { .. })));
}
#[test]
fn malformed_paths_points_and_dash_styles_reject_the_entire_batch() {
    let mut s = scene();
    let id = s
        .create(
            s.root,
            NodeKind::Path,
            json!({"data":"M0 0L20 0 20 20Z","fill":"#4682b4"}),
        )
        .unwrap();
    for patch in [
        json!({"data":"M broken","opacity":0.5}),
        json!({"strokeDashArray":[0,0],"opacity":0.5}),
        json!({"strokeThickness":-1}),
        json!({"points":[[1,2,3]]}),
    ] {
        assert!(s.update(vec![Update { id, patch }]).is_err());
        assert_eq!(s.nodes[&id].props.opacity, 1.);
    }
}
#[test]
fn stretched_fill_keeps_stroke_width_and_applies_layout_clip() {
    let mut s = scene();
    let id=s.create(s.root,NodeKind::Path,json!({"width":120,"height":56,"data":"M10 6 L60 6 40 26Z","stroke":"#000000","strokeThickness":4,"stretch":"UniformToFill"})).unwrap();
    s.layout(&mut Measure);
    let commands = s.display_list();
    let bounds = s.nodes[&id].rect;
    assert!(commands.iter().any(
        |d| matches!(d,Draw::Clip{rect}if rect.width==bounds.width&&rect.height==bounds.height)
    ));
    assert!(commands
        .iter()
        .any(|d| matches!(d,Draw::VectorPath{geometry,..}if geometry.bounds.width>120.)));
    s.destroy(id).unwrap();
}
#[test]
fn fill_rules_gradients_and_dashes_are_actual_paths_not_rectangular_fakes() {
    let mut s = scene();
    let id=s.create(s.root,NodeKind::Polygon,json!({"points":[[0,0],[80,0],[0,80]],"fillRule":"Nonzero","fill":{"kind":"linearGradient","from":[0,0],"to":[1,0],"stops":[{"offset":0,"color":"#ff0000"},{"offset":1,"color":"#0000ff"}]},"stroke":"#000000","strokeThickness":4,"strokeDashArray":[2,2],"strokeDashCap":"Triangle"})).unwrap();
    s.layout(&mut Measure);
    let commands = s.display_list();
    assert!(commands
        .iter()
        .any(|d| matches!(d,Draw::PathBrush{geometry,..}if !geometry.even_odd)));
    assert!(commands
        .iter()
        .any(|d| matches!(d,Draw::VectorPath{color,..}if color=="#000000")));
    s.destroy(id).unwrap();
}
