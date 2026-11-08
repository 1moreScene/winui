use serde_json::json;
use winui_wasm::{
    animated_icon::{self, Player},
    enums::*,
    render::Draw,
    scene::{Input, Scene, Update},
    typography::{Font, Metrics, TextMeasurer},
};
struct Measure;
impl TextMeasurer for Measure {
    fn measure(&mut self, t: &str, f: &Font) -> Metrics {
        Metrics {
            width: t.chars().count() as f64 * f.size,
            ascent: f.size * 0.8,
            descent: f.size * 0.2,
            ..Default::default()
        }
    }
}
fn scene() -> Scene {
    let mut s = Scene::new(Theme::Light, false);
    s.resize(500., 300., 1.25).unwrap();
    s
}
#[test]
fn parent_button_state_drives_real_find_press_release_keyboard_and_disable() {
    let mut s = scene();
    let button = s
        .create(
            s.root,
            NodeKind::Button,
            json!({"width":100,"height":70,"horizontalAlignment":"Left","verticalAlignment":"Top"}),
        )
        .unwrap();
    let icon = s
        .create(
            button,
            NodeKind::AnimatedIcon,
            json!({"source":"Find","useParentState":true}),
        )
        .unwrap();
    s.layout(&mut Measure);
    let send = |s: &mut Scene, value: serde_json::Value, time| {
        s.input(serde_json::from_value(value).unwrap(), time)
            .unwrap();
        s.layout(&mut Measure);
    };
    send(&mut s, json!({"kind":"move","x":30,"y":30,"pointer":1}), 0.);
    s.advance(200.);
    s.layout(&mut Measure);
    assert_eq!(
        s.nodes[&icon].animated_icon.snapshot(s.time).state,
        "PointerOver"
    );
    let mut normal = vec![];
    let mut hover = vec![];
    let mut pressed = vec![];
    animated_icon::draw(AnimatedIconSource::Find, 0., "#000000", &mut normal);
    animated_icon::draw(AnimatedIconSource::Find, 0.06, "#000000", &mut hover);
    // The pinned Find visual intentionally keeps its hover segment static.
    assert_eq!(
        serde_json::to_value(normal).unwrap(),
        serde_json::to_value(&hover).unwrap()
    );
    send(
        &mut s,
        json!({"kind":"down","x":30,"y":30,"pointer":1}),
        210.,
    );
    let player = &s.nodes[&icon].animated_icon;
    assert_eq!(
        player.snapshot(s.time).segment_start,
        "PointerOverToPressed_Start"
    );
    animated_icon::draw(AnimatedIconSource::Find, 0.43, "#000000", &mut pressed);
    assert_ne!(
        serde_json::to_value(pressed).unwrap(),
        serde_json::to_value(&hover).unwrap()
    );
    send(&mut s, json!({"kind":"up","x":30,"y":30,"pointer":1}), 400.);
    s.advance(900.);
    s.layout(&mut Measure);
    assert_eq!(
        s.nodes[&icon].animated_icon.snapshot(s.time).state,
        "PointerOver"
    );
    send(
        &mut s,
        json!({"kind":"keyDown","key":" ","repeat":false}),
        910.,
    );
    assert_eq!(
        s.nodes[&icon].animated_icon.snapshot(s.time).state,
        "Pressed"
    );
    send(&mut s, json!({"kind":"keyUp","key":" "}), 1100.);
    s.update(vec![Update {
        id: button,
        patch: json!({"enabled":false}),
    }])
    .unwrap();
    s.advance(1600.);
    s.layout(&mut Measure);
    assert_eq!(
        s.nodes[&icon].animated_icon.snapshot(s.time).state,
        "Disabled"
    );
}
#[test]
fn built_in_metadata_matches_runtime_native_sources_and_draws_all_frames() {
    let native: serde_json::Value =
        serde_json::from_str(include_str!("../references/animated-icons-metrics.json")).unwrap();
    for row in native["rows"][0]["nodes"].as_array().unwrap() {
        let kind: AnimatedIconSource = serde_json::from_value(row["name"].clone()).unwrap();
        let info = animated_icon::info(kind);
        assert_eq!(
            info["markers"].as_object().unwrap().len(),
            row["markers"].as_object().unwrap().len()
        );
        for (key, value) in info["markers"].as_object().unwrap() {
            assert!(
                (value.as_f64().unwrap() - row["markers"][key].as_f64().unwrap()).abs() < 1e-12
            );
        }
        for i in 0..2 {
            assert_eq!(info["size"][i].as_f64(), row["size"][i].as_f64());
        }
        assert!(
            (info["durationMs"].as_f64().unwrap() - row["duration"].as_f64().unwrap()).abs() < 1e-7
        );
        let mut draw = vec![];
        animated_icon::draw(
            kind,
            row["progress"].as_f64().unwrap(),
            "#0067c0",
            &mut draw,
        );
        assert!(draw.iter().any(|d| matches!(d, Draw::VectorPath { .. })));
    }
}
#[test]
fn native_queue_one_waits_then_plays_queued_state_and_caps_overflow() {
    let mut p = Player::default();
    p.sync(AnimatedIconSource::Back, "Normal", 0., true, true);
    p.sync(AnimatedIconSource::Back, "PointerOver", 100., false, true);
    p.sync(AnimatedIconSource::Back, "Normal", 140., false, true);
    let s = p.snapshot(140.);
    assert_eq!(s.state, "PointerOver");
    assert_eq!(s.queued_states, ["Normal"]);
    assert!((s.progress - 0.03).abs() < 0.002);
    p.advance(251., false);
    let s = p.snapshot(251.);
    assert_eq!(s.state, "Normal");
    assert_eq!(s.segment_start, "PointerOverToNormal_Start");
    assert!(s.active);
    p.advance(500., false);
    assert!(!p.active());
    for (i, state) in [
        "PointerOver",
        "Pressed",
        "Normal",
        "PointerOver",
        "Pressed",
        "Normal",
        "Pressed",
        "PointerOver",
    ]
    .iter()
    .enumerate()
    {
        p.sync(
            AnimatedIconSource::Back,
            state,
            600. + i as f64 * 5.,
            false,
            true,
        );
        assert!(p.snapshot(640.).queued_states.len() <= 4);
    }
    p.advance(10000., false);
    assert!(!p.active());
    assert!(p.snapshot(10000.).queued_states.is_empty());
}
#[test]
fn scene_coalesces_state_updates_inherits_state_and_stops_hidden_or_reduced() {
    let mut s = scene();
    let parent = s
        .create(
            s.root,
            NodeKind::Grid,
            json!({"animatedIconState":"Normal"}),
        )
        .unwrap();
    let id = s
        .create(
            parent,
            NodeKind::AnimatedIcon,
            json!({"source":"Find","width":48,"height":48}),
        )
        .unwrap();
    s.layout(&mut Measure);
    s.update(vec![
        Update {
            id: parent,
            patch: json!({"animatedIconState":"PointerOver"}),
        },
        Update {
            id: parent,
            patch: json!({"animatedIconState":"Pressed"}),
        },
    ])
    .unwrap();
    s.layout(&mut Measure);
    let state = s
        .snapshot()
        .nodes
        .into_iter()
        .find(|n| n.id == id)
        .unwrap()
        .animated_icon
        .unwrap();
    assert_eq!(state.segment_start, "NormalToPressed_Start");
    assert!(state.queued_states.is_empty());
    assert!(state.active);
    s.set_policies(true, false);
    s.layout(&mut Measure);
    assert!(!s.nodes[&id].animated_icon.active());
    s.set_policies(false, false);
    s.update(vec![Update {
        id,
        patch: json!({"state":"Normal"}),
    }])
    .unwrap();
    s.layout(&mut Measure);
    assert!(s.nodes[&id].animated_icon.active());
    s.update(vec![Update {
        id: parent,
        patch: json!({"visible":false}),
    }])
    .unwrap();
    s.layout(&mut Measure);
    assert!(!s.nodes[&id].animated_icon.active());
    s.destroy(parent).unwrap();
    assert!(!s.snapshot().animating);
}
#[test]
fn animated_icon_removal_does_not_leave_a_frame_request_at_any_transition_time() {
    for time in [0., 1., 41.5, 83., 250., 1000.] {
        let mut s = scene();
        s.set_policies(false, false);
        let parent = s
            .create(s.root, NodeKind::Button, json!({"text":"Find"}))
            .unwrap();
        let icon = s
            .create(
                parent,
                NodeKind::AnimatedIcon,
                json!({"source":"Find","width":48,"height":48,"state":"Normal"}),
            )
            .unwrap();
        s.layout(&mut Measure);
        s.display_list();
        s.update(vec![Update {
            id: icon,
            patch: json!({"state":"Pressed"}),
        }])
        .unwrap();
        s.layout(&mut Measure);
        s.display_list();
        s.advance(time);
        s.destroy(parent).unwrap();
        // Check before another layout, then after presentation: neither may
        // schedule frames for removed players or unrelated default state.
        assert!(!s.snapshot().animating, "after destroy at {time}");
        s.layout(&mut Measure);
        s.display_list();
        assert!(!s.snapshot().animating);
        assert_eq!(s.nodes.len(), 1);
    }
}
#[test]
fn fallback_sources_update_atomically_and_keep_image_ownership() {
    let mut s = scene();
    let id = s
        .create(
            s.root,
            NodeKind::AnimatedIcon,
            json!({"width":48,"height":48,"fallbackIconSource":{"kind":"Symbol","symbol":"Find"}}),
        )
        .unwrap();
    s.layout(&mut Measure);
    assert!(s
        .display_list()
        .iter()
        .any(|d| matches!(d, Draw::Text { .. })));
    assert!(s
        .update(vec![Update {
            id,
            patch: json!({"source":"invented","opacity":0.2})
        }])
        .is_err());
    assert_eq!(s.nodes[&id].props.opacity, 1.);
    s.update(vec![Update {
        id,
        patch: json!({"fallbackIconSource":{"kind":"Bitmap","uriSource":"shared.png"}}),
    }])
    .unwrap();
    assert!(s.image_sources().contains("shared.png"));
    s.update(vec![Update {
        id,
        patch: json!({"source":"Settings"}),
    }])
    .unwrap();
    assert!(s.image_sources().is_empty());
    s.layout(&mut Measure);
    assert!(s
        .display_list()
        .iter()
        .any(|d| matches!(d, Draw::VectorPath { .. })));
    assert!(s
        .create(
            s.root,
            NodeKind::IconSourceElement,
            json!({"iconSource":{"kind":"Image","source":"image.png"}})
        )
        .is_err());
}
#[test]
fn pointer_notifications_are_opt_in_and_stop_on_unsubscribe_policy() {
    let mut s = scene();
    let id = s
        .create(
            s.root,
            NodeKind::Button,
            json!({"width":100,"height":40,"verticalAlignment":"Top"}),
        )
        .unwrap();
    s.layout(&mut Measure);
    let input = |x| {
        serde_json::from_value::<Input>(json!({"kind":"move","x":x,"y":10,"pointer":1})).unwrap()
    };
    s.input(input(10.), 0.).unwrap();
    assert!(s.events.is_empty());
    s.input(Input::Leave, 0.).unwrap();
    s.update(vec![Update {
        id,
        patch: json!({"pointerNotifications":true}),
    }])
    .unwrap();
    s.input(input(10.), 0.).unwrap();
    s.input(input(11.), 0.).unwrap();
    s.input(Input::Leave, 0.).unwrap();
    assert_eq!(
        s.events.iter().map(|e| e.kind).collect::<Vec<_>>(),
        [EventKind::PointerEntered, EventKind::PointerExited]
    );
    s.events.clear();
    s.update(vec![Update {
        id,
        patch: json!({"pointerNotifications":false}),
    }])
    .unwrap();
    s.input(input(10.), 0.).unwrap();
    assert!(s.events.is_empty());
}
#[test]
fn navigation_owns_animation_state_and_releases_removed_item_players() {
    use winui_wasm::{
        model::{Input as NavInput, Properties},
        navigation::NavigationView,
    };
    let mut nav=NavigationView::new(serde_json::from_value::<Properties>(json!({"items":[{"id":"settings","text":"Game Settings","animatedIconSource":"Settings"}],"isSettingsVisible":false,"isBackButtonVisible":false})).unwrap()).unwrap();
    nav.width = 500.;
    nav.height = 300.;
    nav.layout();
    let r = nav.parts.iter().find(|p| p.id == "settings").unwrap().rect;
    nav.input(
        NavInput::Move {
            x: r.x + 10.,
            y: r.y + 10.,
        },
        0.,
    )
    .unwrap();
    nav.layout();
    assert!(nav.snapshot().animating);
    assert_eq!(
        nav.animated_icons["settings"].1.snapshot(0.).state,
        "PointerOver"
    );
    nav.update(json!([{"items":[]}])).unwrap();
    nav.layout();
    assert!(nav.animated_icons.is_empty());
}
