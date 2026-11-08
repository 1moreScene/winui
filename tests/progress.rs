use serde_json::json;
use winui_wasm::{
    enums::*,
    render::Draw,
    scene::{Scene, Update},
    typography::{Font, Metrics, TextMeasurer},
};
struct Measure;
impl TextMeasurer for Measure {
    fn measure(&mut self, _: &str, _: &Font) -> Metrics {
        Metrics::default()
    }
}
fn frame(s: &mut Scene, t: f64) {
    s.advance(t);
    s.layout(&mut Measure);
    s.display_list();
}
fn patch(s: &mut Scene, id: u32, p: serde_json::Value) {
    s.update(vec![Update { id, patch: p }]).unwrap();
}
fn visual(s: &mut Scene, id: u32) -> serde_json::Value {
    serde_json::to_value(
        s.snapshot()
            .nodes
            .into_iter()
            .find(|n| n.id == id)
            .unwrap()
            .progress
            .unwrap(),
    )
    .unwrap()
}

#[test]
fn progress_defaults_measure_and_pointer_passthrough() {
    let mut s = Scene::new(Theme::Light, false);
    s.resize(400., 100., 1.).unwrap();
    s.resize(400., 100., 1.25).unwrap();
    let bar = s
        .create(s.root, NodeKind::ProgressBar, json!({"width":130}))
        .unwrap();
    let ring = s.create(s.root, NodeKind::ProgressRing, json!({})).unwrap();
    frame(&mut s, 0.);
    assert_eq!(s.nodes[&ring].desired, [32., 32.]);
    assert!((s.nodes[&bar].rect.height - 3.2).abs() < 1e-9);
    assert!(!s.nodes[&ring].props.is_tab_stop);
    assert!(!s.nodes[&bar].props.is_tab_stop);
    assert!(s.nodes[&ring].props.is_indeterminate);
    assert!(!s.nodes[&bar].props.is_indeterminate);
    assert_eq!(s.hit(200., 50.), None);
    let mut saves = 0;
    let mut layers = 0;
    for draw in s.display_list() {
        match draw {
            Draw::Save | Draw::Clip { .. } | Draw::RoundedClip { .. } => saves += 1,
            Draw::Restore => {
                saves -= 1;
                assert!(saves >= 0);
            }
            Draw::Layer { .. } | Draw::VectorLayer { .. } => layers += 1,
            Draw::EndLayer => {
                layers -= 1;
                assert!(layers >= 0);
            }
            _ => {}
        }
    }
    assert_eq!((saves, layers), (0, 0));
    assert!(s.snapshot().animating);
}
#[test]
fn range_coercion_and_atomic_notifications() {
    let mut s = Scene::new(Theme::Light, true);
    let id = s
        .create(s.root, NodeKind::ProgressBar, json!({"value":150}))
        .unwrap();
    assert_eq!(s.properties(id).unwrap().value, 100.);
    patch(&mut s, id, json!({"maximum":25}));
    assert_eq!(s.properties(id).unwrap().value, 25.);
    let snap = s.snapshot();
    let event = snap
        .events
        .iter()
        .find(|e| e.kind == EventKind::ValueChanged)
        .unwrap();
    assert_eq!(event.value, Some(25.));
    patch(&mut s, id, json!({"minimum":30}));
    assert_eq!(s.properties(id).unwrap().maximum, 30.);
    patch(&mut s, id, json!({"maximum":-10}));
    assert_eq!(s.properties(id).unwrap().minimum, -10.);
    let before = s.properties(id).unwrap().value;
    assert!(s
        .update(vec![
            Update {
                id,
                patch: json!({"value":20})
            },
            Update {
                id,
                patch: json!({"minimum":30,"maximum":10})
            }
        ])
        .is_err());
    assert_eq!(s.properties(id).unwrap().value, before);
    assert!(s
        .update(vec![Update {
            id,
            patch: json!({"determinateSource":{}})
        }])
        .is_err());
}
#[test]
fn ring_uses_native_trim_rotation_period_and_distinct_geometry() {
    let mut s = Scene::new(Theme::Light, false);
    s.resize(400., 100., 1.).unwrap();
    let ring = s
        .create(
            s.root,
            NodeKind::ProgressRing,
            json!({"width":60,"height":60}),
        )
        .unwrap();
    frame(&mut s, 0.);
    frame(&mut s, 500.);
    let v = visual(&mut s, ring);
    assert!((v["trimEnd"].as_f64().unwrap() - 0.25005).abs() < 1e-5);
    assert_eq!(v["rotation"], 225.);
    frame(&mut s, 1000.);
    let v = visual(&mut s, ring);
    assert_eq!(v["trimEnd"], 0.5);
    assert_eq!(v["trimStart"], 0.);
    assert_eq!(v["rotation"], 450.);
    frame(&mut s, 1500.);
    assert_eq!(visual(&mut s, ring)["trimStart"], 0.25);
    frame(&mut s, 2500.);
    assert_eq!(visual(&mut s, ring)["rotation"], 225.);
    let commands = s.display_list();
    assert!(commands
        .iter()
        .any(|d| matches!(d,Draw::Arc{width,..}if (*width-7.5).abs()<1e-6)));
    patch(&mut s, ring, json!({"isIndeterminate":false,"value":50}));
    s.reduced_motion = true;
    frame(&mut s, 2500.);
    assert!(s
        .display_list()
        .iter()
        .any(|d| matches!(d,Draw::Arc{width,..}if (*width-2.65499997).abs()<1e-6)));
    assert_eq!(visual(&mut s, ring)["trimEnd"], 0.5);
}
#[test]
fn ring_increase_retargets_from_presentation_decrease_snaps() {
    let mut s = Scene::new(Theme::Light, false);
    s.resize(400., 100., 1.).unwrap();
    let id = s
        .create(
            s.root,
            NodeKind::ProgressRing,
            json!({"isIndeterminate":false}),
        )
        .unwrap();
    frame(&mut s, 0.);
    patch(&mut s, id, json!({"value":100}));
    frame(&mut s, 0.);
    frame(&mut s, 500.);
    let before = visual(&mut s, id)["trimEnd"].as_f64().unwrap();
    assert!((before - 0.25).abs() < 1e-4);
    patch(&mut s, id, json!({"value":75}));
    frame(&mut s, 500.);
    let after = visual(&mut s, id)["trimEnd"].as_f64().unwrap();
    assert!((after - before).abs() < 1e-4);
    frame(&mut s, 1500.);
    assert!((visual(&mut s, id)["trimEnd"].as_f64().unwrap() - 0.75).abs() < 1e-4);
    assert!(!s.snapshot().animating);
    patch(&mut s, id, json!({"value":10}));
    frame(&mut s, 1500.);
    assert!(!s.snapshot().animating);
    assert!(visual(&mut s, id)["trimEnd"].as_f64().unwrap() < 0.11);
}
#[test]
fn progress_visibility_policy_and_disposal_stop_scheduling() {
    let mut s = Scene::new(Theme::Light, false);
    s.resize(400., 100., 1.).unwrap();
    let parent = s.create(s.root, NodeKind::Grid, json!({})).unwrap();
    let id = s.create(parent, NodeKind::ProgressRing, json!({})).unwrap();
    frame(&mut s, 0.);
    assert!(s.snapshot().animating);
    patch(&mut s, id, json!({"isActive":false}));
    frame(&mut s, 100.);
    assert!(!s.snapshot().animating);
    assert_eq!(visual(&mut s, id)["active"], false);
    patch(&mut s, id, json!({"isActive":true}));
    frame(&mut s, 200.);
    assert_eq!(visual(&mut s, id)["phase"], 0.);
    patch(&mut s, parent, json!({"visible":false}));
    frame(&mut s, 250.);
    assert!(!s.snapshot().animating);
    patch(&mut s, parent, json!({"visible":true}));
    s.reduced_motion = true;
    frame(&mut s, 300.);
    assert!(!s.snapshot().animating);
    assert_eq!(visual(&mut s, id)["phase"], 0.5);
    s.reduced_motion = false;
    s.theme = Theme::HighContrast;
    frame(&mut s, 310.);
    assert!(!s.snapshot().animating);
    s.destroy(parent).unwrap();
    frame(&mut s, 400.);
    assert!(!s.snapshot().animating);
    assert!(s.properties(id).is_err());
}
#[test]
fn bar_reposition_and_color_reversals_are_bounded_and_settle() {
    let mut s = Scene::new(Theme::Light, false);
    s.resize(400., 100., 1.).unwrap();
    s.resize(300., 60., 1.).unwrap();
    let id = s
        .create(s.root, NodeKind::ProgressBar, json!({"width":130}))
        .unwrap();
    frame(&mut s, 0.);
    for (t, value) in [(0., 80), (30., 20), (60., 90), (90., 10)] {
        patch(&mut s, id, json!({"value":value}));
        frame(&mut s, t);
        let offset = visual(&mut s, id)["indicatorOffset"].as_f64().unwrap();
        assert!(offset.abs() <= 1.);
    }
    patch(&mut s, id, json!({"showPaused":true}));
    frame(&mut s, 100.);
    frame(&mut s, 183.5);
    let color = visual(&mut s, id)["color"].clone();
    patch(&mut s, id, json!({"showError":true}));
    frame(&mut s, 183.5);
    assert_eq!(visual(&mut s, id)["color"], color);
    frame(&mut s, 1000.);
    assert_eq!(visual(&mut s, id)["color"], "#c42b1cff");
    assert!(!s.snapshot().animating);
    patch(&mut s, id, json!({"width":260}));
    frame(&mut s, 1000.);
    assert_eq!(s.nodes[&id].rect.width, 260.);
}
#[test]
fn bar_paused_error_priority_reduced_motion_and_equal_range() {
    let mut s = Scene::new(Theme::Light, false);
    s.resize(400., 100., 1.).unwrap();
    let id = s
        .create(
            s.root,
            NodeKind::ProgressBar,
            json!({"width":130,"isIndeterminate":true}),
        )
        .unwrap();
    frame(&mut s, 0.);
    frame(&mut s, 500.);
    assert!(s.snapshot().animating);
    patch(&mut s, id, json!({"showPaused":true,"showError":true}));
    frame(&mut s, 500.);
    frame(&mut s, 1250.);
    assert!(!s.snapshot().animating);
    assert_eq!(visual(&mut s, id)["color"], "#c42b1cff");
    patch(&mut s, id, json!({"showError":false}));
    s.reduced_motion = true;
    frame(&mut s, 1300.);
    assert!(!s.snapshot().animating);
    assert_eq!(visual(&mut s, id)["color"], "#9d5d00ff");
    patch(
        &mut s,
        id,
        json!({"isIndeterminate":false,"minimum":10,"maximum":10,"value":10}),
    );
    frame(&mut s, 1400.);
    assert_eq!(visual(&mut s, id)["fraction"], 0.);
}
