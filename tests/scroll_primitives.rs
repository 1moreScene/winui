use serde_json::{json, Value};
use winui_wasm::{
    enums::*,
    model::Rect,
    scene::{scroll_primitives::tick_marks, Input, Scene, Update},
    typography::{Font, Metrics, TextMeasurer},
};
struct Measure;
impl TextMeasurer for Measure {
    fn measure(&mut self, s: &str, f: &Font) -> Metrics {
        Metrics {
            width: s.chars().count() as f64 * f.size * 0.5,
            ascent: f.size,
            descent: f.size * (5.2 / 14.),
            ..Default::default()
        }
    }
}
fn scene() -> Scene {
    let mut s = Scene::new(Theme::Light, true);
    s.resize(800., 600., 1.25).unwrap();
    s
}
fn layout(s: &mut Scene) {
    s.layout(&mut Measure);
    s.display_list();
}
fn input(s: &mut Scene, v: Value) {
    s.input(serde_json::from_value::<Input>(v).unwrap(), s.time)
        .unwrap();
}
fn state(s: &mut Scene, id: u32) -> Value {
    layout(s);
    serde_json::to_value(s.snapshot()).unwrap()["nodes"]
        .as_array()
        .unwrap()
        .iter()
        .find(|n| n["id"] == id)
        .unwrap()["primitive"]
        .clone()
}
fn patch(s: &mut Scene, id: u32, v: Value) {
    s.update(vec![Update { id, patch: v }]).unwrap();
}
fn close(actual: [f64; 4], expected: &Value) -> f64 {
    let mut maximum = 0.0_f64;
    for (a, b) in actual.iter().zip(expected.as_array().unwrap()) {
        maximum = maximum.max((a - b.as_f64().unwrap()).abs());
        assert!(
            (a - b.as_f64().unwrap()).abs() < 0.81,
            "actual={actual:?} expected={expected}"
        );
    }
    maximum
}
#[test]
fn native_scrollbar_geometry_matrix() {
    let native: Value =
        serde_json::from_str(include_str!("../references/scroll-primitives-native.json")).unwrap();
    let mut count = 0;
    let mut maximum_error = 0.0_f64;
    for row in native["rows"]
        .as_array()
        .unwrap()
        .iter()
        .filter(|r| r["kind"] == "ScrollBar")
    {
        let mut s = scene();
        let vertical = row["state"].as_str().unwrap().starts_with("Vertical");
        let parts = row["state"]
            .as_str()
            .unwrap()
            .split('-')
            .collect::<Vec<_>>();
        let value = parts[1].parse::<f64>().unwrap();
        let enabled = parts[2] != "Disabled";
        let mut p = json!({"minimum":0,"maximum":100,"value":value,"orientation":if vertical{"Vertical"}else{"Horizontal"},"enabled":enabled,"horizontalAlignment":"Left","verticalAlignment":"Top","primitives":{"viewportSize":25,"indicatorMode":"MouseIndicator"}});
        p[if vertical { "height" } else { "width" }] = json!(200);
        let bar = s.create(s.root, NodeKind::ScrollBar, p).unwrap();
        let actual = state(&mut s, bar)["bar"]["thumb"].clone();
        let name = if vertical {
            "VerticalThumb"
        } else {
            "HorizontalThumb"
        };
        let part = row["parts"]
            .as_array()
            .unwrap()
            .iter()
            .find(|p| p["name"] == name)
            .unwrap();
        maximum_error = maximum_error.max(close(
            [
                actual["x"].as_f64().unwrap(),
                actual["y"].as_f64().unwrap(),
                actual["width"].as_f64().unwrap(),
                actual["height"].as_f64().unwrap(),
            ],
            &part["rect"],
        ));
        count += 1;
    }
    assert_eq!(count, 24);
    println!("nativeGeometry ScrollBar states={count} maximumErrorDip={maximum_error}");
}
#[test]
fn native_tickbar_logical_intervals_dense_gap_and_pixel_thickness() {
    let native: Value =
        serde_json::from_str(include_str!("../references/scroll-primitives-native.json")).unwrap();
    let mut count = 0;
    let mut maximum_error = 0.0_f64;
    for row in native["rows"]
        .as_array()
        .unwrap()
        .iter()
        .filter(|r| r["kind"] == "TickBar")
    {
        let vertical = row["state"].as_str().unwrap().starts_with("Vertical");
        let frequency = row["state"]
            .as_str()
            .unwrap()
            .split('-')
            .nth(1)
            .unwrap()
            .parse::<f64>()
            .unwrap();
        let parts = row["parts"].as_array().unwrap();
        let name = if vertical {
            "LeftTickBar"
        } else {
            "TopTickBar"
        };
        let at = parts.iter().position(|p| p["name"] == name).unwrap();
        let rect = &parts[at]["rect"];
        let thumb_name = if vertical {
            "VerticalThumb"
        } else {
            "HorizontalThumb"
        };
        let thumb = &parts.iter().find(|p| p["name"] == thumb_name).unwrap()["rect"];
        let main = usize::from(vertical);
        let length = rect[main + 2].as_f64().unwrap();
        let cross = rect[3 - main].as_f64().unwrap();
        let size = thumb[main + 2].as_f64().unwrap();
        let actual = tick_marks(
            length, cross, size, 0., 100., frequency, vertical, false, 1.25,
        );
        let expected = parts[at + 1..]
            .iter()
            .take_while(|p| p["type"] == "Rectangle")
            .collect::<Vec<_>>();
        assert_eq!(actual.len(), expected.len(), "{}", row["state"]);
        for (a, b) in actual.iter().zip(expected) {
            let mut r = b["rect"].clone();
            r[0] = json!(r[0].as_f64().unwrap() - rect[0].as_f64().unwrap());
            r[1] = json!(r[1].as_f64().unwrap() - rect[1].as_f64().unwrap());
            maximum_error = maximum_error.max(close([a.x, a.y, a.width, a.height], &r));
        }
        count += 1;
    }
    assert_eq!(count, 12);
    println!("nativeGeometry TickBar states={count} maximumErrorDip={maximum_error}");
}
#[test]
fn thumb_original_coordinate_delta_capture_cancel_and_disable() {
    let mut s = scene();
    let t=s.create(s.root,NodeKind::Thumb,json!({"width":40,"height":24,"horizontalAlignment":"Left","verticalAlignment":"Top","background":"#778899"})).unwrap();
    layout(&mut s);
    input(&mut s, json!({"kind":"down","x":10,"y":10,"pointer":7}));
    assert_eq!(s.captured, Some((7, t)));
    assert_eq!(s.events.last().unwrap().kind, EventKind::DragStarted);
    input(&mut s, json!({"kind":"move","x":30,"y":15,"pointer":7}));
    let e = s
        .events
        .iter()
        .find(|e| e.kind == EventKind::DragDelta)
        .unwrap();
    assert_eq!(e.payload.as_ref().unwrap()["horizontalChange"], 20.);
    patch(&mut s, t, json!({"translationX":20}));
    layout(&mut s);
    input(&mut s, json!({"kind":"move","x":40,"y":15,"pointer":7}));
    assert_eq!(
        s.events
            .iter()
            .rev()
            .find(|e| e.kind == EventKind::DragDelta)
            .unwrap()
            .payload
            .as_ref()
            .unwrap()["horizontalChange"],
        10.
    );
    input(
        &mut s,
        json!({"kind":"primitive","id":t,"action":"cancelDrag"}),
    );
    assert!(s.captured.is_none());
    let e = s.events.last().unwrap();
    assert_eq!(e.kind, EventKind::DragCompleted);
    assert_eq!(e.payload.as_ref().unwrap()["canceled"], true);
    assert_eq!(e.payload.as_ref().unwrap()["horizontalChange"], 30.);
    input(&mut s, json!({"kind":"down","x":25,"y":10,"pointer":8}));
    patch(&mut s, t, json!({"enabled":false}));
    layout(&mut s);
    assert_eq!(state(&mut s, t)["isDragging"], false);
    assert!(s.captured.is_none());
}
#[test]
fn scrollbar_arrows_repeat_track_drag_keys_and_no_duplicate_boundary_event() {
    let mut s = scene();
    let b=s.create(s.root,NodeKind::ScrollBar,json!({"height":200,"horizontalAlignment":"Left","verticalAlignment":"Top","maximum":100,"smallChange":2,"largeChange":20,"isTabStop":true,"primitives":{"viewportSize":25,"indicatorMode":"MouseIndicator"}})).unwrap();
    layout(&mut s);
    input(&mut s, json!({"kind":"down","x":6,"y":194,"pointer":1}));
    assert_eq!(s.get(b).unwrap().props.value, 2.);
    s.advance(251.);
    assert_eq!(s.get(b).unwrap().props.value, 4.);
    input(&mut s, json!({"kind":"up","x":6,"y":194,"pointer":1}));
    let snap = state(&mut s, b);
    let r = &snap["bar"]["thumb"];
    let x = r["x"].as_f64().unwrap() + 3.;
    let y = r["y"].as_f64().unwrap() + 10.;
    input(&mut s, json!({"kind":"down","x":x,"y":y,"pointer":2}));
    input(&mut s, json!({"kind":"move","x":x,"y":y+70.4,"pointer":2}));
    assert!((s.get(b).unwrap().props.value - 54.).abs() < 0.01);
    input(&mut s, json!({"kind":"up","x":x,"y":y+70.4,"pointer":2}));
    input(&mut s, json!({"kind":"focus","id":b}));
    input(&mut s, json!({"kind":"keyDown","key":"End","repeat":false}));
    assert_eq!(s.get(b).unwrap().props.value, 100.);
    s.events.clear();
    input(
        &mut s,
        json!({"kind":"keyDown","key":"ArrowDown","repeat":false}),
    );
    assert!(!s
        .events
        .iter()
        .any(|e| e.kind == EventKind::Scroll || e.kind == EventKind::ValueChanged));
    patch(&mut s, b, json!({"minimum":120}));
    assert_eq!(s.get(b).unwrap().props.maximum, 120.);
    assert_eq!(s.get(b).unwrap().props.value, 120.);
}
#[test]
fn linked_bar_and_scroll_presenter_share_view_state_and_clipping() {
    let mut s = scene();
    let p=s.create(s.root,NodeKind::ScrollContentPresenter,json!({"width":200,"height":120,"horizontalAlignment":"Left","verticalAlignment":"Top"})).unwrap();
    let child = s
        .create(p, NodeKind::Border, json!({"width":400,"height":300}))
        .unwrap();
    let b=s.create(s.root,NodeKind::ScrollBar,json!({"height":200,"width":12,"horizontalAlignment":"Right","primitives":{"scrollTarget":p}})).unwrap();
    layout(&mut s);
    layout(&mut s);
    assert_eq!(s.get(b).unwrap().props.maximum, 180.);
    input(
        &mut s,
        json!({"kind":"primitive","id":b,"action":"setValue","value":80}),
    );
    layout(&mut s);
    assert_eq!(s.get(p).unwrap().props.vertical_offset, 80.);
    input(
        &mut s,
        json!({"kind":"scroll","id":p,"x":50,"y":80,"zoom":1,"animated":false}),
    );
    layout(&mut s);
    let n = s.get(child).unwrap();
    let r = n
        .world
        .bounds(Rect::new(0., 0., n.rect.width, n.rect.height));
    assert_eq!([r.x, r.y, r.width, r.height], [-50., -80., 400., 300.]);
    assert!(s.create(p, NodeKind::Grid, json!({})).is_err());
    patch(&mut s, b, json!({"value":100}));
    layout(&mut s);
    assert_eq!(s.get(p).unwrap().props.vertical_offset, 100.);
    s.destroy(p).unwrap();
    assert!(s
        .get(b)
        .unwrap()
        .props
        .primitives
        .as_ref()
        .unwrap()
        .scroll_target
        .is_none());
}
#[test]
fn items_presenter_headers_slots_updates_and_ownership() {
    let mut s = scene();
    let ip=s.create(s.root,NodeKind::ItemsPresenter,json!({"width":200,"horizontalAlignment":"Left","verticalAlignment":"Top","header":"Header","primitives":{"footer":"Footer"}})).unwrap();
    let body = s
        .create(ip, NodeKind::StackPanel, json!({"height":80}))
        .unwrap();
    layout(&mut s);
    let h = s.primitive_slot(ip, "header").unwrap();
    let f = s.primitive_slot(ip, "footer").unwrap();
    assert_eq!(s.get(body).unwrap().world.0[5], 19.2);
    assert!((s.get(f).unwrap().rect.y - 99.2).abs() < 0.81);
    assert!(s.destroy(h).is_err());
    assert!(s.reparent(h, s.root, None).is_err());
    assert!(s.create(ip, NodeKind::Grid, json!({})).is_err());
    patch(
        &mut s,
        ip,
        json!({"header":"","primitives":{"footer":"Changed"}}),
    );
    layout(&mut s);
    assert_eq!(s.get(h).unwrap().desired[1], 0.);
    assert_eq!(s.primitive_slot(ip, "footer").unwrap(), f);
    s.destroy(ip).unwrap();
    assert!(s.get(body).is_err());
}
#[test]
fn tickbar_live_source_mutation_and_disposal() {
    let mut s = scene();
    let slider = s
        .create(
            s.root,
            NodeKind::Slider,
            json!({"width":200,"tickFrequency":20}),
        )
        .unwrap();
    let ticks = s
        .create(
            s.root,
            NodeKind::TickBar,
            json!({"width":200,"height":4,"primitives":{"source":slider}}),
        )
        .unwrap();
    assert_eq!(state(&mut s, ticks)["ticks"].as_array().unwrap().len(), 6);
    patch(&mut s, slider, json!({"tickFrequency":1}));
    assert_eq!(state(&mut s, ticks)["ticks"].as_array().unwrap().len(), 9);
    patch(&mut s, slider, json!({"tickFrequency":0}));
    assert!(state(&mut s, ticks)["ticks"].as_array().unwrap().is_empty());
    s.destroy(slider).unwrap();
    assert!(state(&mut s, ticks)["ticks"].as_array().unwrap().is_empty());
}
#[test]
fn source_validation_and_invalid_batches_are_atomic() {
    let mut s = scene();
    let b = s.create(s.root, NodeKind::ScrollBar, json!({})).unwrap();
    let t = s.create(s.root, NodeKind::Thumb, json!({})).unwrap();
    assert!(s
        .update(vec![
            Update {
                id: b,
                patch: json!({"value":0.5})
            },
            Update {
                id: t,
                patch: json!({"primitives":{"source":b}})
            }
        ])
        .is_err());
    assert_eq!(s.get(b).unwrap().props.value, 0.);
    let bad: Input =
        serde_json::from_value(json!({"kind":"primitive","id":9999,"action":"setValue","value":1}))
            .unwrap();
    assert!(s.input(bad, 0.).is_err());
}
#[test]
fn all_primitive_brushes_resolve_in_three_themes() {
    for theme in [Theme::Light, Theme::Dark, Theme::HighContrast] {
        let mut s = scene();
        s.theme = theme;
        for disabled in [true, false] {
            s.create(s.root,NodeKind::ScrollBar,json!({"height":200,"enabled":!disabled,"primitives":{"indicatorMode":"MouseIndicator"}})).unwrap();
        }
        let source = s
            .create(
                s.root,
                NodeKind::Slider,
                json!({"width":200,"tickFrequency":10}),
            )
            .unwrap();
        s.create(
            s.root,
            NodeKind::TickBar,
            json!({"width":200,"height":4,"primitives":{"source":source}}),
        )
        .unwrap();
        layout(&mut s);
    }
}

#[test]
fn repeat_pauses_outside_and_touch_cancellation_releases_capture() {
    let mut s = scene();
    let b=s.create(s.root,NodeKind::ScrollBar,json!({"height":200,"horizontalAlignment":"Left","verticalAlignment":"Top","maximum":100,"smallChange":2,"primitives":{"viewportSize":25,"indicatorMode":"MouseIndicator"}})).unwrap();
    layout(&mut s);
    input(&mut s, json!({"kind":"down","x":6,"y":194,"pointer":1}));
    assert_eq!(s.get(b).unwrap().props.value, 2.);
    input(&mut s, json!({"kind":"move","x":60,"y":194,"pointer":1}));
    s.advance(1000.);
    assert_eq!(s.get(b).unwrap().props.value, 2.);
    input(&mut s, json!({"kind":"move","x":6,"y":194,"pointer":1}));
    s.advance(1251.);
    assert_eq!(s.get(b).unwrap().props.value, 4.);
    input(&mut s, json!({"kind":"cancel","pointer":1}));
    assert!(s.captured.is_none());
    let t = s
        .create(
            s.root,
            NodeKind::Thumb,
            json!({"width":40,"height":24,"horizontalAlignment":"Left","verticalAlignment":"Top"}),
        )
        .unwrap();
    layout(&mut s);
    input(
        &mut s,
        json!({"kind":"touch","pointer":9,"x":20,"y":10,"phase":"down"}),
    );
    assert_eq!(s.captured, Some((9, t)));
    input(
        &mut s,
        json!({"kind":"touch","pointer":9,"x":30,"y":20,"phase":"cancel"}),
    );
    assert!(s.captured.is_none());
    assert_eq!(state(&mut s, t)["isDragging"], false);
}
#[test]
fn presenter_reparent_and_custom_header_conflicts_validate_before_commit() {
    let mut s = scene();
    let ip = s
        .create(s.root, NodeKind::ItemsPresenter, json!({}))
        .unwrap();
    let h = s.primitive_slot(ip, "header").unwrap();
    let child = s.create(h, NodeKind::Grid, json!({"height":20})).unwrap();
    assert!(s
        .update(vec![Update {
            id: ip,
            patch: json!({"header":"Conflict"})
        }])
        .is_err());
    assert_eq!(s.get(ip).unwrap().props.header, "");
    assert!(s.get(child).is_ok());
    let panel = s.create(s.root, NodeKind::StackPanel, json!({})).unwrap();
    s.reparent(panel, ip, None).unwrap();
    s.reparent(panel, ip, None).unwrap();
    assert!(s.create(ip, NodeKind::Button, json!({})).is_err());
}
