use serde_json::{json, Value};
use winui_wasm::{
    enums::*,
    scene::{viewbox_scale, Input, Scene, Update},
    typography::{Font, Metrics, TextMeasurer},
};
struct Measure;
impl TextMeasurer for Measure {
    fn measure(&mut self, text: &str, font: &Font) -> Metrics {
        Metrics {
            width: text.len() as f64 * font.size * 0.5,
            ascent: font.size,
            descent: font.size * 0.3,
            ..Default::default()
        }
    }
}
fn frame(s: &mut Scene, t: f64) {
    s.advance(t);
    s.layout(&mut Measure);
    s.display_list();
}
fn scene() -> Scene {
    let mut s = Scene::new(Theme::Light, true);
    s.resize(1000., 500., 1.).unwrap();
    s
}
fn patch(s: &mut Scene, id: u32, p: Value) {
    s.update(vec![Update { id, patch: p }]).unwrap();
}
fn clicks(s: &mut Scene) -> usize {
    s.snapshot()
        .events
        .iter()
        .filter(|e| e.kind == EventKind::Click)
        .count()
}
fn repeat(s: &mut Scene) -> u32 {
    s.create(s.root,NodeKind::RepeatButton,json!({"text":"Click and hold","width":160,"height":40,"horizontalAlignment":"Left","verticalAlignment":"Top"})).unwrap()
}
fn down(s: &mut Scene, t: f64) {
    s.input(
        Input::Down {
            x: 20.,
            y: 20.,
            pointer: 1,
        },
        t,
    )
    .unwrap();
}

#[test]
fn repeat_defaults_and_demand_driven_source_timer() {
    let mut s = scene();
    let id = repeat(&mut s);
    frame(&mut s, 0.);
    let p = s.properties(id).unwrap();
    assert_eq!(
        (p.delay, p.interval, p.click_mode),
        (500, 33, ClickMode::Press)
    );
    down(&mut s, 0.);
    assert_eq!(clicks(&mut s), 1);
    assert_eq!(s.snapshot().next_frame_at, Some(500.));
    assert!(!s.snapshot().animating);
    frame(&mut s, 499.);
    assert_eq!(clicks(&mut s), 0);
    frame(&mut s, 500.);
    assert_eq!(clicks(&mut s), 1);
    assert_eq!(s.snapshot().next_frame_at, Some(533.));
    frame(&mut s, 533.);
    assert_eq!(clicks(&mut s), 1);
    s.input(
        Input::Up {
            x: 20.,
            y: 20.,
            pointer: 1,
        },
        540.,
    )
    .unwrap();
    assert_eq!(clicks(&mut s), 0);
    assert_eq!(s.snapshot().next_frame_at, None);
    frame(&mut s, 3000.);
    assert_eq!(clicks(&mut s), 0);
}
#[test]
fn repeat_exit_reentry_cancel_disable_and_hover() {
    let mut s = scene();
    let id = repeat(&mut s);
    frame(&mut s, 0.);
    down(&mut s, 0.);
    clicks(&mut s);
    s.input(
        Input::Move {
            x: 300.,
            y: 20.,
            pointer: 1,
        },
        100.,
    )
    .unwrap();
    assert_eq!(s.snapshot().next_frame_at, None);
    frame(&mut s, 700.);
    assert_eq!(clicks(&mut s), 0);
    s.input(
        Input::Move {
            x: 20.,
            y: 20.,
            pointer: 1,
        },
        800.,
    )
    .unwrap();
    assert_eq!(s.snapshot().next_frame_at, Some(1300.));
    frame(&mut s, 1300.);
    assert_eq!(clicks(&mut s), 1);
    s.input(Input::Leave, 1305.).unwrap();
    assert_eq!(s.snapshot().next_frame_at, None);
    s.input(
        Input::Move {
            x: 20.,
            y: 20.,
            pointer: 1,
        },
        1308.,
    )
    .unwrap();
    assert_eq!(s.snapshot().next_frame_at, Some(1808.));
    s.input(Input::Cancel { pointer: Some(1) }, 1310.).unwrap();
    frame(&mut s, 2000.);
    assert_eq!(clicks(&mut s), 0);
    patch(
        &mut s,
        id,
        json!({"clickMode":"Hover","delay":100,"interval":40}),
    );
    s.input(Input::Leave, 2000.).unwrap();
    s.input(
        Input::Move {
            x: 20.,
            y: 20.,
            pointer: 1,
        },
        2010.,
    )
    .unwrap();
    assert_eq!(clicks(&mut s), 1);
    frame(&mut s, 2110.);
    assert_eq!(clicks(&mut s), 1);
    patch(&mut s, id, json!({"enabled":false}));
    frame(&mut s, 2200.);
    assert_eq!(clicks(&mut s), 0);
    assert_eq!(s.snapshot().next_frame_at, None);
}
#[test]
fn repeat_keyboard_matches_own_native_key_probe_and_release_mode() {
    let native: Value =
        serde_json::from_str(include_str!("../references/basic-next-metrics.json")).unwrap();
    assert!(native["keyRuns"][0]["clicks"].as_array().unwrap().len() >= 4);
    assert_eq!(native["keyRuns"][1]["clicks"].as_array().unwrap().len(), 1);
    let mut s = scene();
    let id = repeat(&mut s);
    patch(&mut s, id, json!({"delay":120,"interval":60}));
    frame(&mut s, 0.);
    s.input(Input::Focus { id }, 0.).unwrap();
    s.input(
        Input::KeyDown {
            key: " ".into(),
            repeat: false,
        },
        0.,
    )
    .unwrap();
    assert_eq!(clicks(&mut s), 1);
    for t in [120., 180., 240., 300., 360.] {
        frame(&mut s, t);
        assert_eq!(clicks(&mut s), 1);
    }
    s.input(
        Input::KeyDown {
            key: " ".into(),
            repeat: true,
        },
        380.,
    )
    .unwrap();
    assert_eq!(clicks(&mut s), 0);
    s.input(Input::KeyUp { key: " ".into() }, 390.).unwrap();
    frame(&mut s, 450.);
    assert_eq!(clicks(&mut s), 0);
    s.input(
        Input::KeyDown {
            key: "Enter".into(),
            repeat: false,
        },
        500.,
    )
    .unwrap();
    assert_eq!(clicks(&mut s), 1);
    frame(&mut s, 900.);
    assert_eq!(clicks(&mut s), 0);
    s.input(
        Input::KeyUp {
            key: "Enter".into(),
        },
        910.,
    )
    .unwrap();
    patch(&mut s, id, json!({"clickMode":"Release"}));
    s.input(
        Input::KeyDown {
            key: " ".into(),
            repeat: false,
        },
        1000.,
    )
    .unwrap();
    assert_eq!(clicks(&mut s), 0);
    frame(&mut s, 1120.);
    assert_eq!(clicks(&mut s), 1);
    s.input(Input::KeyUp { key: " ".into() }, 1130.).unwrap();
    assert_eq!(clicks(&mut s), 1);
}
#[test]
fn repeat_live_interval_validation_clock_gaps_and_subtree_disposal() {
    let mut s = scene();
    let id = repeat(&mut s);
    frame(&mut s, 0.);
    down(&mut s, 0.);
    clicks(&mut s);
    patch(&mut s, id, json!({"delay":10,"interval":100}));
    assert_eq!(s.snapshot().next_frame_at, Some(500.));
    assert!(s
        .update(vec![Update {
            id,
            patch: json!({"interval":0})
        }])
        .is_err());
    assert_eq!(s.properties(id).unwrap().interval, 100);
    frame(&mut s, 500.);
    assert_eq!(clicks(&mut s), 1);
    assert_eq!(s.snapshot().next_frame_at, Some(600.));
    frame(&mut s, 1_000_000.);
    assert_eq!(clicks(&mut s), 1);
    assert_eq!(s.snapshot().next_frame_at, Some(1_000_100.));
    s.input(
        Input::KeyDown {
            key: "Escape".into(),
            repeat: false,
        },
        1_000_001.,
    )
    .unwrap();
    assert_eq!(s.snapshot().next_frame_at, None);
    s.input(Input::Blur, 1_000_010.).unwrap();
    frame(&mut s, 1_000_200.);
    assert_eq!(clicks(&mut s), 0);
    s.input(Input::Invoke { id }, 1_000_210.).unwrap();
    assert_eq!(clicks(&mut s), 1);
    assert_eq!(s.snapshot().next_frame_at, None);
    s.destroy(id).unwrap();
    frame(&mut s, 2_000_000.);
    assert_eq!(s.snapshot().next_frame_at, None);
}
#[test]
fn viewbox_matches_all_native_arrange_profiles() {
    let profiles: [Value; 2] = [
        serde_json::from_str(include_str!("../references/basic-next-metrics.json")).unwrap(),
        serde_json::from_str(include_str!("../references/basic-next-metrics-125.json")).unwrap(),
    ];
    for native in profiles {
        for case in native["boxes"].as_array().unwrap() {
            let slot = &case["slot"];
            let mut s = scene();
            s.resize(1000., 500., native["environment"]["dpi"].as_f64().unwrap())
                .unwrap();
            let panel=s.create(s.root,NodeKind::Grid,json!({"width":slot["width"],"height":slot["height"],"translationX":slot["x"],"translationY":slot["y"],"horizontalAlignment":"Left","verticalAlignment":"Top"})).unwrap();
            let vb = s
            .create(
                panel,
                NodeKind::Viewbox,
                json!({"width":case["explicitWidth"],"height":case["explicitHeight"],"stretch":case["stretch"],"stretchDirection":case["direction"]}),
            )
            .unwrap();
            let child = s
                .create(vb, NodeKind::Grid, json!({"width":100,"height":50}))
                .unwrap();
            frame(&mut s, 0.);
            let n = &s.nodes[&vb];
            let world = n.world.point(0., 0.);
            for (actual, expected) in [
                (world.0, case["bounds"]["x"].as_f64().unwrap()),
                (world.1, case["bounds"]["y"].as_f64().unwrap()),
                (n.rect.width, case["bounds"]["width"].as_f64().unwrap()),
                (n.rect.height, case["bounds"]["height"].as_f64().unwrap()),
                (n.desired[0], case["desired"][0].as_f64().unwrap()),
                (n.desired[1], case["desired"][1].as_f64().unwrap()),
            ] {
                assert!(
                    (actual - expected).abs() < 0.01,
                    "{case} {actual} != {expected}"
                );
            }
            let m = s.nodes[&child].world.0;
            assert!((m[0] - case["scale"][0].as_f64().unwrap()).abs() < 1e-6);
            assert!((m[3] - case["scale"][1].as_f64().unwrap()).abs() < 1e-6);
        }
    }
}
#[test]
fn viewbox_unbounded_and_zero_constraints_match_native_measure() {
    let native: Value =
        serde_json::from_str(include_str!("../references/basic-next-metrics.json")).unwrap();
    for case in native["measurements"].as_array().unwrap() {
        let available =
            std::array::from_fn(|i| case["available"][i].as_f64().unwrap_or(f64::INFINITY));
        let scale = viewbox_scale(
            available,
            [100., 50.],
            serde_json::from_value(case["stretch"].clone()).unwrap(),
            StretchDirection::Both,
        );
        for i in 0..2 {
            let size = ([100., 50.][i] * scale[i]).min(available[i]);
            assert!((size - case["desired"][i].as_f64().unwrap()).abs() < 0.001);
        }
    }
    assert_eq!(
        viewbox_scale(
            [80., 90.],
            [0., 0.],
            ImageStretch::Fill,
            StretchDirection::Both
        ),
        [0., 0.]
    );
}
#[test]
fn viewbox_clip_hit_transform_one_child_and_atomic_reparent() {
    let mut s = scene();
    let vb=s.create(s.root,NodeKind::Viewbox,json!({"width":60,"height":40,"stretch":"None","horizontalAlignment":"Left","verticalAlignment":"Top"})).unwrap();
    let b = s
        .create(
            vb,
            NodeKind::RepeatButton,
            json!({"text":"Hold","width":100,"height":50}),
        )
        .unwrap();
    frame(&mut s, 0.);
    assert_eq!(s.hit(20., 20.), Some(b));
    assert_eq!(s.hit(80., 20.), None);
    assert!(s.create(vb, NodeKind::Grid, json!({})).is_err());
    patch(&mut s, vb, json!({"stretch":"Fill"}));
    frame(&mut s, 0.);
    assert!((s.nodes[&b].world.0[0] - 0.6).abs() < 1e-9);
    assert_eq!(s.hit(50., 20.), Some(b));
    let other = s.create(s.root, NodeKind::Grid, json!({})).unwrap();
    assert!(s.reparent(other, vb, None).is_err());
    assert_eq!(s.nodes[&other].parent, Some(s.root));
    let outer = s.create(s.root, NodeKind::Button, json!({})).unwrap();
    assert!(s.reparent(vb, outer, None).is_err());
    s.destroy(b).unwrap();
    let replacement = s
        .create(vb, NodeKind::Grid, json!({"width":20,"height":20}))
        .unwrap();
    frame(&mut s, 0.);
    assert_eq!(s.nodes[&replacement].world.0[0], 3.);
}

#[test]
fn unbounded_grid_keeps_the_native_viewbox_images_intrinsic_measure() {
    let mut s = scene();
    let vb = s
        .create(s.root, NodeKind::Viewbox, json!({"width":200,"height":200}))
        .unwrap();
    let grid = s
        .create(vb, NodeKind::Grid, json!({"padding":[15,15,15,15]}))
        .unwrap();
    let stack = s.create(grid, NodeKind::StackPanel, json!({})).unwrap();
    s.create(stack, NodeKind::Grid, json!({"width":160,"height":10}))
        .unwrap();
    let image = s
        .create(stack, NodeKind::Image, json!({"source":"slices"}))
        .unwrap();
    s.image_ready("slices".into(), [90., 90.]).unwrap();
    s.layout(&mut Measure);
    let n = s.snapshot();
    assert_eq!(
        n.nodes.iter().find(|n| n.id == image).unwrap().desired,
        [90., 90.]
    );
    assert_eq!(
        n.nodes
            .iter()
            .find(|n| n.id == vb)
            .unwrap()
            .viewbox
            .as_ref()
            .unwrap()
            .content_size,
        [190., 130.]
    );
}

#[test]
fn canvas_image_keeps_its_explicit_rectangle_for_centered_stretch_and_crop() {
    use winui_wasm::render::Draw;
    for mode in ["None", "Fill", "Uniform", "UniformToFill"] {
        let mut s = scene();
        let canvas = s.create(s.root, NodeKind::Canvas, json!({})).unwrap();
        let image = s
            .create(
                canvas,
                NodeKind::Image,
                json!({"width":100,"height":100,"source":"photo","stretch":mode}),
            )
            .unwrap();
        s.image_ready("photo".into(), [400., 200.]).unwrap();
        s.layout(&mut Measure);
        let snap = s.snapshot();
        let n = snap.nodes.iter().find(|n| n.id == image).unwrap();
        assert_eq!([n.rect.width, n.rect.height], [100., 100.], "{mode}");
        if mode == "UniformToFill" {
            assert!(s.display_list().iter().any(|d|matches!(d,Draw::Image{rect,source} if source=="photo"&&rect.x == -50.&&rect.width == 200.)));
        }
    }
}
