use serde_json::json;
use winui_wasm::{
    enums::*,
    scene::{Scene, Update},
    typography::{Font, Metrics, TextMeasurer},
};

#[derive(Default)]
struct Measure(usize);

#[test]
fn fractional_dpi_roundoff_is_not_scrollable_but_real_subpixel_overflow_is() {
    let mut scene = Scene::new(Theme::Light, false);
    let id = scene.create(scene.root, NodeKind::ScrollViewer, json!({"verticalScrollBarVisibility":"Auto"})).unwrap();
    let node = scene.nodes.get_mut(&id).unwrap();
    node.scroll.viewport = [198.54545454545453, 147.63636363636363];
    node.scroll.extent = [198.54545454545456, 147.63636363636365];
    assert_eq!(node.scroll.max(0.), [0., 0.]);
    assert!(node.scroll.thumb(&node.props, true, 0.).is_none());
    node.scroll.extent[1] = node.scroll.viewport[1] + 0.001;
    assert!(node.scroll.max(0.)[1] > 0.0009);
    assert!(node.scroll.thumb(&node.props, true, 0.).is_some());
}
impl TextMeasurer for Measure {
    fn measure(&mut self, text: &str, font: &Font) -> Metrics {
        self.0 += 1;
        Metrics {
            width: text.chars().count() as f64 * font.size * 0.5,
            ascent: font.size * 0.8,
            descent: font.size * 0.2,
            ..Default::default()
        }
    }
}
fn list() -> (Scene, u32, Measure) {
    let mut s = Scene::new(Theme::Light, false);
    s.resize(400., 300., 1.).unwrap();
    let id = s.create(s.root, NodeKind::ListView, json!({
        "width":360,"height":280,
        "collectionItems":(0..200).map(|i|json!({"id":i.to_string(),"text":format!("Item {i}")})).collect::<Vec<_>>()
    })).unwrap();
    let mut m = Measure::default();
    s.layout(&mut m);
    (s, id, m)
}

#[test]
fn wheel_motion_does_not_replay_duplicate_compositor_capture_frames() {
    let (mut s, id, mut m) = list();
    assert!(s.wheel(80., 100., 0., 400., false).unwrap());
    let mut previous = 0.;
    for t in 1..300 {
        s.advance(t as f64);
        let offset = s.nodes[&id].scroll.y.value(t as f64);
        assert!(offset > previous, "scroll paused at {t}ms: {offset}");
        previous = offset;
    }
    s.advance(2000.);
    s.layout(&mut m);
    assert_eq!(s.nodes[&id].scroll.y.value(2000.), 400.);
}

#[test]
fn distant_animated_destination_does_not_expand_the_realized_interval() {
    let (mut s, id, mut m) = list();
    assert!(s.wheel(80., 100., 0., 10000., false).unwrap());
    for time in [1., 16., 50., 100., 250., 1000.] {
        s.advance(time);
        s.layout(&mut m);
        assert!(
            s.nodes[&id].children.len() < 40,
            "unbounded realization at {time}ms"
        );
        let offset = s.nodes[&id].scroll.y.value(time);
        assert!(
            s.nodes[&id].children.iter().any(|child| {
                let r = s.nodes[child].rect;
                r.y <= offset + 1. && r.y + r.height > offset
            }),
            "presented viewport has a gap at {time}ms"
        );
    }
}

#[test]
fn unchanged_scroll_frames_reuse_measurement_and_invalidate_for_template_changes() {
    let (mut s, id, mut m) = list();
    // Warm the realized set after the initial container creation revisions.
    for _ in 0..3 {
        s.layout(&mut m);
    }
    m.0 = 0;
    s.layout(&mut m);
    let cached = m.0;
    s.invalidate(id, true);
    m.0 = 0;
    s.layout(&mut m);
    let invalidated = m.0;
    assert!(
        cached < invalidated,
        "cached={cached}, invalidated={invalidated}"
    );
    let child = s.nodes[&id].children[0];
    let text = s
        .create(
            child,
            NodeKind::TextBlock,
            json!({"text":"Template","fontSize":14}),
        )
        .unwrap();
    s.layout(&mut m);
    let before = s.nodes[&text].desired[1];
    s.update(vec![Update {
        id: text,
        patch: json!({"fontSize":40}),
    }])
    .unwrap();
    s.layout(&mut m);
    assert!(s.nodes[&text].desired[1] > before);
    s.resize(300., 300., 1.25).unwrap();
    s.layout(&mut m);
    assert_eq!(s.nodes[&id].scroll.viewport[0], 360.);
}
