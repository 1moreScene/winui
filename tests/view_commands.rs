use serde_json::{json, Value};
use winui_wasm::{
    enums::*,
    scene::{view_controls::parallax_offset, Input, Scene, Update},
    typography::{Font, Metrics, TextMeasurer},
};
struct Measure;
impl TextMeasurer for Measure {
    fn measure(&mut self, s: &str, f: &Font) -> Metrics {
        Metrics {
            width: s.chars().count() as f64 * f.size * 0.5,
            ascent: f.size * 0.8,
            descent: f.size * 0.2,
            ..Default::default()
        }
    }
}
fn scene() -> Scene {
    let mut s = Scene::new(Theme::Light, true);
    s.resize(640., 360., 1.).unwrap();
    s
}
fn frame(s: &mut Scene) -> Value {
    s.layout(&mut Measure);
    s.display_list();
    serde_json::to_value(s.snapshot()).unwrap()
}
fn action(
    s: &mut Scene,
    id: u32,
    action: &str,
    request: Option<u32>,
    cancel: bool,
    parameter: Value,
) {
    s.input(
        Input::ViewControl {
            id,
            action: action.into(),
            request,
            cancel,
            parameter,
        },
        s.time + 1.,
    )
    .unwrap();
}
fn update(s: &mut Scene, id: u32, patch: Value) {
    s.update(vec![Update { id, patch }]).unwrap();
}
#[test]
fn split_view_all_native_modes_sides_and_open_states() {
    let native: Value = serde_json::from_str(include_str!(
        "../references/validation/view-command-native.json"
    ))
    .unwrap();
    for case in native["cases"]
        .as_array()
        .unwrap()
        .iter()
        .filter(|c| c["kind"] == "SplitView")
    {
        let mut s = scene();
        let p = &case["props"];
        let id=s.create(s.root,NodeKind::SplitView,json!({"width":480,"height":240,"horizontalAlignment":"Left","verticalAlignment":"Top","viewControls":{ "displayMode":p["displayMode"],"panePlacement":p["panePlacement"],"isPaneOpen":p["isPaneOpen"],"openPaneLength":160,"compactPaneLength":40}})).unwrap();
        let pane = s
            .create(id, NodeKind::Grid, json!({"viewControls":{"slot":"Pane"}}))
            .unwrap();
        let content = s
            .create(
                id,
                NodeKind::Grid,
                json!({"viewControls":{"slot":"Content"}}),
            )
            .unwrap();
        frame(&mut s);
        let parts = case["parts"].as_array().unwrap();
        let cp = parts.iter().find(|p| p["name"] == "ContentRoot").unwrap();
        let actual = &s.nodes[&content].rect;
        let expected = &cp["rect"];
        assert!(
            (actual.x - (expected["x"].as_f64().unwrap() - 24.)).abs() <= 1.01,
            "{} x {actual:?}",
            case["id"]
        );
        assert!(
            (actual.width - expected["width"].as_f64().unwrap()).abs() <= 1.01,
            "{} width {actual:?}",
            case["id"]
        );
        assert_eq!(
            s.nodes[&pane].visible,
            p["isPaneOpen"].as_bool().unwrap()
                || p["displayMode"].as_str().unwrap().starts_with("Compact")
        );
    }
}
#[test]
fn pane_close_negotiation_and_focus_restore() {
    let mut s = scene();
    let outside = s
        .create(s.root, NodeKind::Button, json!({"text":"Open"}))
        .unwrap();
    let id = s.create(s.root, NodeKind::SplitView, json!({})).unwrap();
    s.create(id, NodeKind::Grid, json!({"viewControls":{"slot":"Pane"}}))
        .unwrap();
    frame(&mut s);
    s.input(Input::Focus { id: outside }, 1.).unwrap();
    action(&mut s, id, "openPane", None, false, Value::Null);
    frame(&mut s);
    action(&mut s, id, "closePane", None, false, Value::Null);
    let events = frame(&mut s);
    let request = events["events"]
        .as_array()
        .unwrap()
        .iter()
        .find(|e| e["kind"] == "paneClosing")
        .unwrap()["requestId"]
        .as_u64()
        .unwrap() as u32;
    action(&mut s, id, "resolvePane", Some(request), true, Value::Null);
    assert!(
        s.nodes[&id]
            .props
            .view_controls
            .as_ref()
            .unwrap()
            .is_pane_open
    );
    action(&mut s, id, "closePane", None, false, Value::Null);
    let events = frame(&mut s);
    let request = events["events"]
        .as_array()
        .unwrap()
        .iter()
        .find(|e| e["kind"] == "paneClosing")
        .unwrap()["requestId"]
        .as_u64()
        .unwrap() as u32;
    action(&mut s, id, "resolvePane", Some(request), false, Value::Null);
    let events = frame(&mut s);
    assert!(
        !s.nodes[&id]
            .props
            .view_controls
            .as_ref()
            .unwrap()
            .is_pane_open
    );
    assert_eq!(s.focused, Some(outside));
    assert!(!events["events"]
        .as_array()
        .unwrap()
        .iter()
        .any(|e| e["kind"] == "paneClosing"));
}
#[test]
fn semantic_zoom_retains_both_trees_but_disables_inactive_input() {
    let mut s = scene();
    let zoom = s.create(s.root, NodeKind::SemanticZoom, json!({})).unwrap();
    let a = s
        .create(
            zoom,
            NodeKind::Grid,
            json!({"viewControls":{"slot":"ZoomedIn"}}),
        )
        .unwrap();
    let b = s
        .create(
            zoom,
            NodeKind::Grid,
            json!({"viewControls":{"slot":"ZoomedOut"}}),
        )
        .unwrap();
    let button = s
        .create(a, NodeKind::Button, json!({"text":"Detail"}))
        .unwrap();
    frame(&mut s);
    assert!(s.nodes[&a].visible);
    assert!(!s.nodes[&b].visible);
    action(&mut s, zoom, "toggleZoom", None, false, Value::Null);
    frame(&mut s);
    assert!(!s.nodes[&a].visible);
    assert!(s.nodes[&b].visible);
    s.input(Input::Invoke { id: button }, 3.).unwrap();
    assert!(!frame(&mut s)["events"]
        .as_array()
        .unwrap()
        .iter()
        .any(|e| e["kind"] == "click"));
    update(
        &mut s,
        zoom,
        json!({"viewControls":{"canChangeViews":false}}),
    );
    action(&mut s, zoom, "toggleZoom", None, false, Value::Null);
    assert!(
        !s.nodes[&zoom]
            .props
            .view_controls
            .as_ref()
            .unwrap()
            .is_zoomed_in_view_active
    );
    assert!(s
        .create(
            zoom,
            NodeKind::Grid,
            json!({"viewControls":{"slot":"ZoomedIn"}})
        )
        .is_err());
}
#[test]
fn parallax_expression_negative_clamp_ratio_and_equal_offsets() {
    assert_eq!(parallax_offset(50., 0., 100., 80., 1., true), -40.);
    assert_eq!(parallax_offset(0., 0., 100., -80., 1., true), -80.);
    assert_eq!(parallax_offset(100., 0., 100., -80., 1., true), 0.);
    assert_eq!(parallax_offset(200., 0., 100., 80., 0.2, true), -20.);
    assert_eq!(parallax_offset(200., 0., 100., 80., 0.2, false), -40.);
    assert_eq!(parallax_offset(50., 10., 10., 80., 1., false), 0.);
}
#[test]
fn parallax_tracks_rust_source_and_cleans_up_removed_sources() {
    let mut s = scene();
    let scroll = s
        .create(
            s.root,
            NodeKind::ScrollViewer,
            json!({"width":200,"height":200}),
        )
        .unwrap();
    s.create(scroll, NodeKind::Grid, json!({"height":1000}))
        .unwrap();
    let p=s.create(s.root,NodeKind::ParallaxView,json!({"width":300,"height":200,"viewControls":{"source":scroll,"verticalShift":100,"verticalSourceOffsetKind":"Absolute","verticalSourceEndOffset":800}})).unwrap();
    s.create(p, NodeKind::Grid, json!({})).unwrap();
    frame(&mut s);
    s.input(
        Input::Scroll {
            id: scroll,
            x: None,
            y: Some(400.),
            zoom: None,
            animated: false,
        },
        10.,
    )
    .unwrap();
    let snap = frame(&mut s);
    let v = snap["nodes"]
        .as_array()
        .unwrap()
        .iter()
        .find(|n| n["id"] == p)
        .unwrap();
    assert_eq!(v["viewControl"]["translation"][1], -50.);
    s.destroy(scroll).unwrap();
    assert!(s.nodes[&p]
        .props
        .view_controls
        .as_ref()
        .unwrap()
        .source
        .is_none());
    frame(&mut s);
}
#[test]
fn standard_command_presets_overrides_and_gate_linkage() {
    let mut s = scene();
    let c = s
        .create(
            s.root,
            NodeKind::StandardCommand,
            json!({"viewControls":{"standardKind":"Save"}}),
        )
        .unwrap();
    let native: Value =
        serde_json::from_str(include_str!("../references/view-command-template.json")).unwrap();
    assert_eq!(
        s.command_metadata(c).unwrap().label,
        native["standardCommands"]["Save"]["label"]
    );
    update(&mut s, c, json!({"viewControls":{"label":"Custom"}}));
    update(&mut s, c, json!({"viewControls":{"standardKind":"Copy"}}));
    assert_eq!(s.command_metadata(c).unwrap().label, "Custom");
    assert_eq!(
        s.command_metadata(c).unwrap().icon_symbol,
        Some(Symbol::Copy)
    );
    let button = s
        .create(
            s.root,
            NodeKind::Button,
            json!({"viewControls":{"command":c}}),
        )
        .unwrap();
    frame(&mut s);
    assert_eq!(s.nodes[&button].props.text, "Custom");
    update(&mut s, c, json!({"viewControls":{"canExecute":false}}));
    frame(&mut s);
    assert!(!s.nodes[&button].enabled);
    s.input(Input::Invoke { id: button }, 2.).unwrap();
    assert!(!frame(&mut s)["events"]
        .as_array()
        .unwrap()
        .iter()
        .any(|e| e["kind"] == "canExecuteRequested"));
}
#[test]
fn command_query_cancel_forwarding_and_atomic_cycle_rejection() {
    let mut s = scene();
    let child = s.create(s.root, NodeKind::UICommand, json!({})).unwrap();
    let c = s
        .create(
            s.root,
            NodeKind::UICommand,
            json!({"viewControls":{"command":child}}),
        )
        .unwrap();
    action(&mut s, c, "execute", None, false, json!({"document":7}));
    let snap = frame(&mut s);
    let e = &snap["events"][0];
    let request = e["requestId"].as_u64().unwrap() as u32;
    assert_eq!(e["payload"]["parameter"], json!({"document":7}));
    action(
        &mut s,
        c,
        "resolveExecute",
        Some(request),
        true,
        Value::Null,
    );
    assert!(frame(&mut s)["events"].as_array().unwrap().is_empty());
    action(&mut s, c, "execute", None, false, json!("go"));
    let snap = frame(&mut s);
    let request = snap["events"][0]["requestId"].as_u64().unwrap() as u32;
    action(
        &mut s,
        c,
        "resolveExecute",
        Some(request),
        false,
        Value::Null,
    );
    let events = frame(&mut s);
    assert!(!events["events"]
        .as_array()
        .unwrap()
        .iter()
        .any(|e| e["kind"] == "executeRequested"));
    let child_request = events["events"]
        .as_array()
        .unwrap()
        .iter()
        .find(|e| e["target"] == child)
        .unwrap()["requestId"]
        .as_u64()
        .unwrap() as u32;
    action(
        &mut s,
        child,
        "resolveExecute",
        Some(child_request),
        false,
        Value::Null,
    );
    let approved = frame(&mut s);
    assert_eq!(
        approved["events"]
            .as_array()
            .unwrap()
            .iter()
            .filter(|e| e["kind"] == "executeRequested")
            .count(),
        2
    );
    assert!(events["events"]
        .as_array()
        .unwrap()
        .iter()
        .any(|e| e["kind"] == "canExecuteRequested" && e["target"] == child));
    update(&mut s, c, json!({"viewControls":{"command":null}}));
    assert!(s
        .update(vec![
            Update {
                id: c,
                patch: json!({"viewControls":{"command":child}})
            },
            Update {
                id: child,
                patch: json!({"viewControls":{"command":c}})
            }
        ])
        .is_err());
    assert!(s.nodes[&c]
        .props
        .view_controls
        .as_ref()
        .unwrap()
        .command
        .is_none());
    update(&mut s, c, json!({"viewControls":{"command":child}}));
    s.update(vec![
        Update {
            id: c,
            patch: json!({"viewControls":{"command":null}}),
        },
        Update {
            id: child,
            patch: json!({"viewControls":{"command":c}}),
        },
    ])
    .unwrap();
    assert_eq!(
        s.nodes[&child]
            .props
            .view_controls
            .as_ref()
            .unwrap()
            .command,
        Some(c)
    );
    s.destroy(child).unwrap();
    frame(&mut s);
}

#[test]
fn split_reversal_finishes_geometry_and_keeps_display_stack_balanced() {
    use winui_wasm::render::Draw;
    let mut s = Scene::new(Theme::Light, false);
    s.resize(480., 240., 1.25).unwrap();
    let id = s
        .create(
            s.root,
            NodeKind::SplitView,
            json!({"viewControls":{"openPaneLength":160}}),
        )
        .unwrap();
    let pane = s
        .create(id, NodeKind::Grid, json!({"viewControls":{"slot":"Pane"}}))
        .unwrap();
    s.create(pane, NodeKind::Button, json!({"text":"Pane action"}))
        .unwrap();
    frame(&mut s);
    update(&mut s, id, json!({"viewControls":{"isPaneOpen":true}}));
    frame(&mut s);
    s.advance(175.);
    let mid = frame(&mut s);
    let progress = mid["nodes"]
        .as_array()
        .unwrap()
        .iter()
        .find(|n| n["id"] == id)
        .unwrap()["viewControl"]["progress"]
        .as_f64()
        .unwrap();
    update(&mut s, id, json!({"viewControls":{"isPaneOpen":false}}));
    let reversed = frame(&mut s);
    assert!(
        (reversed["nodes"]
            .as_array()
            .unwrap()
            .iter()
            .find(|n| n["id"] == id)
            .unwrap()["viewControl"]["progress"]
            .as_f64()
            .unwrap()
            - progress)
            .abs()
            < 1e-6
    );
    s.advance(1000.);
    let complete = frame(&mut s);
    assert!(!s.nodes[&pane].visible);
    assert!(!complete["animating"].as_bool().unwrap());
    let mut saves = 0i32;
    let mut layers = 0i32;
    for draw in s.display_list() {
        match draw {
            Draw::Save | Draw::Clip { .. } | Draw::RoundedClip { .. } | Draw::CornerClip { .. } => {
                saves += 1
            }
            Draw::Restore => saves -= 1,
            Draw::Layer { .. } | Draw::WindowLayer { .. } | Draw::VectorLayer { .. } => layers += 1,
            Draw::EndLayer => layers -= 1,
            _ => {}
        }
        assert!(saves >= 0 && layers >= 0);
    }
    assert_eq!((saves, layers), (0, 0));
}

#[test]
fn child_command_veto_prevents_all_execute_notifications() {
    let mut s = scene();
    let child = s.create(s.root, NodeKind::UICommand, json!({})).unwrap();
    let parent = s
        .create(
            s.root,
            NodeKind::UICommand,
            json!({"viewControls":{"command":child}}),
        )
        .unwrap();
    action(&mut s, parent, "execute", None, false, json!(7));
    let request = frame(&mut s)["events"][0]["requestId"].as_u64().unwrap() as u32;
    action(
        &mut s,
        parent,
        "resolveExecute",
        Some(request),
        false,
        Value::Null,
    );
    let events = frame(&mut s);
    assert!(!events["events"]
        .as_array()
        .unwrap()
        .iter()
        .any(|e| e["kind"] == "executeRequested"));
    let request = events["events"][0]["requestId"].as_u64().unwrap() as u32;
    action(
        &mut s,
        child,
        "resolveExecute",
        Some(request),
        true,
        Value::Null,
    );
    assert!(frame(&mut s)["events"].as_array().unwrap().is_empty());
}

#[test]
fn command_objects_never_add_visual_stack_spacing() {
    let mut s = scene();
    let stack = s
        .create(s.root, NodeKind::StackPanel, json!({"spacing":20}))
        .unwrap();
    s.create(stack, NodeKind::UICommand, json!({})).unwrap();
    let a = s
        .create(stack, NodeKind::Button, json!({"text":"First","height":32}))
        .unwrap();
    s.create(
        stack,
        NodeKind::StandardCommand,
        json!({"viewControls":{"standardKind":"Save"}}),
    )
    .unwrap();
    let b = s
        .create(
            stack,
            NodeKind::Button,
            json!({"text":"Second","height":32}),
        )
        .unwrap();
    frame(&mut s);
    assert_eq!(s.nodes[&a].rect.y, 0.);
    assert_eq!(s.nodes[&b].rect.y, 52.);
}

fn touch(s: &mut Scene, pointer: i32, x: f64, y: f64, phase: &str) {
    s.input(
        Input::Touch {
            pointer,
            x,
            y,
            phase: phase.into(),
        },
        s.time + 1.,
    )
    .unwrap();
    frame(s);
}
#[test]
fn swipe_execute_threshold_cancel_gate_and_command_lifetime() {
    let mut s = scene();
    let command = s
        .create(
            s.root,
            NodeKind::StandardCommand,
            json!({"viewControls":{"standardKind":"Delete"}}),
        )
        .unwrap();
    let swipe = s.create(s.root, NodeKind::SwipeControl, json!({"width":300,"height":60,"horizontalAlignment":"Left","verticalAlignment":"Top","viewControls":{"rightItems":{"mode":"Execute","items":[{"id":"delete","command":command,"commandParameter":"List item 0","background":"#FF0000"}]}}})).unwrap();
    s.create(swipe, NodeKind::Grid, json!({})).unwrap();
    frame(&mut s);
    for (end, phase, enabled, executed) in [
        (150., "up", true, false),
        (50., "cancel", true, false),
        (50., "up", false, false),
        (50., "up", true, true),
    ] {
        update(
            &mut s,
            command,
            json!({"viewControls":{"canExecute":enabled}}),
        );
        frame(&mut s);
        s.events.clear();
        touch(&mut s, 1, 250., 30., "down");
        touch(&mut s, 1, end, 30., "move");
        s.input(
            Input::Touch {
                pointer: 1,
                x: end,
                y: 30.,
                phase: phase.into(),
            },
            s.time + 1.,
        )
        .unwrap();
        let events = frame(&mut s);
        let request = events["events"]
            .as_array()
            .unwrap()
            .iter()
            .find(|e| e["kind"] == "canExecuteRequested");
        assert_eq!(request.is_some(), executed, "{end}/{phase}/{enabled}");
        if let Some(request) = request {
            assert_eq!(request["payload"]["parameter"], "List item 0");
        }
    }
    s.destroy(command).unwrap();
    frame(&mut s);
    assert!(s.nodes[&swipe]
        .props
        .view_controls
        .as_ref()
        .unwrap()
        .right_items
        .as_ref()
        .unwrap()
        .items[0]
        .command
        .is_none());
}
#[test]
fn reveal_swipe_shows_action_and_returns_to_closed_after_invoke() {
    let mut s = scene();
    let command = s
        .create(
            s.root,
            NodeKind::UICommand,
            json!({"viewControls":{"label":"Archive"}}),
        )
        .unwrap();
    let swipe=s.create(s.root,NodeKind::SwipeControl,json!({"width":300,"height":60,"horizontalAlignment":"Left","verticalAlignment":"Top","viewControls":{"rightItems":{"items":[{"id":"archive","command":command}]}}})).unwrap();
    let text = s
        .create(swipe, NodeKind::TextBlock, json!({"text":"Message"}))
        .unwrap();
    frame(&mut s);
    assert!(s.nodes[&text].desired[1] > 0.);
    assert!(s
        .display_list()
        .iter()
        .any(|draw| matches!(draw,winui_wasm::render::Draw::Text{text,..} if text=="Message")));
    touch(&mut s, 1, 250., 30., "down");
    touch(&mut s, 1, 150., 30., "move");
    touch(&mut s, 1, 150., 30., "up");
    let button = s
        .nodes
        .values()
        .find(|n| n.kind == NodeKind::AppBarButton && n.parent == Some(swipe))
        .unwrap()
        .id;
    assert!(s.nodes[&button].visible);
    assert_eq!(s.nodes[&button].props.command_controls.label, "Archive");
    s.events.clear();
    s.input(Input::Invoke { id: button }, s.time + 1.).unwrap();
    assert!(frame(&mut s)["events"]
        .as_array()
        .unwrap()
        .iter()
        .any(|e| e["kind"] == "canExecuteRequested"));
    assert!(!s.nodes[&button].visible);
}
#[test]
fn collection_header_contributes_to_extent_scroll_and_virtualization() {
    let mut s = scene();
    let list=s.create(s.root,NodeKind::ListView,json!({"width":240,"height":160,"collectionItems":(0..50).map(|i|json!({"id":i.to_string(),"text":format!("Item {i}")})).collect::<Vec<_>>()})).unwrap();
    let header = s.collection_header_slot(list).unwrap();
    assert_eq!(s.collection_header_slot(list).unwrap(), header);
    s.create(
        header,
        NodeKind::TextBlock,
        json!({"text":"Gallery header","height":90}),
    )
    .unwrap();
    frame(&mut s);
    assert_eq!(s.nodes[&header].rect.height, 90.);
    let item = s
        .nodes
        .values()
        .find(|n| n.kind == NodeKind::CollectionItem && n.props.collection_key == "0")
        .unwrap()
        .id;
    assert!((s.nodes[&item].rect.y - 90.).abs() < 1.);
    s.input(
        Input::CollectionScroll {
            id: list,
            index: 49,
        },
        1.,
    )
    .unwrap();
    let snap = frame(&mut s);
    let list_snap = snap["nodes"]
        .as_array()
        .unwrap()
        .iter()
        .find(|n| n["id"] == list)
        .unwrap();
    assert!(list_snap["collection"]["realized"]
        .as_array()
        .unwrap()
        .iter()
        .any(|i| i["index"] == 49));
    assert!(s.nodes.len() < 35);
}
#[test]
fn semantic_pinch_uses_source_hysteresis_and_cannot_change_gate() {
    let mut s = scene();
    let zoom = s.create(s.root, NodeKind::SemanticZoom, json!({})).unwrap();
    for slot in ["ZoomedIn", "ZoomedOut"] {
        s.create(zoom, NodeKind::Grid, json!({"viewControls":{"slot":slot}}))
            .unwrap();
    }
    frame(&mut s);
    touch(&mut s, 1, 100., 100., "down");
    touch(&mut s, 2, 300., 100., "down");
    touch(&mut s, 2, 260., 100., "move");
    assert!(
        !s.nodes[&zoom]
            .props
            .view_controls
            .as_ref()
            .unwrap()
            .is_zoomed_in_view_active
    );
    touch(&mut s, 2, 295., 100., "move");
    assert!(
        s.nodes[&zoom]
            .props
            .view_controls
            .as_ref()
            .unwrap()
            .is_zoomed_in_view_active
    );
    touch(&mut s, 2, 260., 100., "move");
    touch(&mut s, 2, 260., 100., "up");
    touch(&mut s, 1, 100., 100., "up");
    update(
        &mut s,
        zoom,
        json!({"viewControls":{"canChangeViews":false}}),
    );
    touch(&mut s, 1, 100., 100., "down");
    touch(&mut s, 2, 200., 100., "down");
    touch(&mut s, 2, 350., 100., "move");
    assert!(
        !s.nodes[&zoom]
            .props
            .view_controls
            .as_ref()
            .unwrap()
            .is_zoomed_in_view_active
    );
}
#[test]
fn semantic_zoom_button_appears_on_pointer_then_fades_after_native_delay() {
    let mut s = Scene::new(Theme::Light, false);
    s.resize(640., 360., 1.).unwrap();
    let zoom = s
        .create(
            s.root,
            NodeKind::SemanticZoom,
            json!({"viewControls":{"isZoomOutButtonEnabled":true}}),
        )
        .unwrap();
    s.create(
        zoom,
        NodeKind::Grid,
        json!({"viewControls":{"slot":"ZoomedIn"}}),
    )
    .unwrap();
    frame(&mut s);
    let button = s
        .nodes
        .values()
        .find(|n| n.parent == Some(zoom) && n.kind == NodeKind::Button)
        .unwrap()
        .id;
    assert!(!s.nodes[&button].visible);
    s.input(
        Input::Move {
            x: 100.,
            y: 100.,
            pointer: 1,
        },
        1.,
    )
    .unwrap();
    s.advance(170.);
    frame(&mut s);
    assert!(s.nodes[&button].visible);
    assert!(s.snapshot().next_frame_at.is_some());
    s.advance(3200.);
    frame(&mut s);
    s.advance(3400.);
    frame(&mut s);
    assert!(!s.nodes[&button].visible);
}
#[test]
fn menu_command_metadata_execute_and_detached_handles_are_consistent() {
    let mut s = scene();
    let command = s
        .create(
            s.root,
            NodeKind::StandardCommand,
            json!({"viewControls":{"standardKind":"Delete"}}),
        )
        .unwrap();
    let menu=s.create(s.root,NodeKind::MenuFlyout,json!({"isOpen":true,"menuItems":[{"id":"delete","command":command,"commandParameter":"row"}]})).unwrap();
    frame(&mut s);
    let entry = &s.nodes[&menu].props.menu_items[0];
    assert_eq!(entry.text, s.command_metadata(command).unwrap().label);
    assert!(!entry.icon.is_empty());
    assert!(!entry.keyboard_accelerators.is_empty());
    s.events.clear();
    s.input(Input::MenuInvoke { id: menu, index: 0 }, 1.)
        .unwrap();
    let snap = frame(&mut s);
    let event = snap["events"]
        .as_array()
        .unwrap()
        .iter()
        .find(|e| e["kind"] == "canExecuteRequested")
        .unwrap();
    assert_eq!(event["payload"]["parameter"], "row");
    update(
        &mut s,
        command,
        json!({"viewControls":{"canExecute":false}}),
    );
    frame(&mut s);
    assert!(!s.nodes[&menu].props.menu_items[0].enabled);
    assert!(s
        .create(
            s.root,
            NodeKind::MenuFlyout,
            json!({"menuItems":[{"id":"bad","command":menu}]})
        )
        .is_err());
    s.destroy(command).unwrap();
    frame(&mut s);
    assert!(s.nodes[&menu].props.menu_items[0].command.is_none());
}

#[test]
fn recycled_collection_swipe_actions_stay_hidden_until_a_gesture() {
    let mut s = scene();
    let list=s.create(s.root,NodeKind::ListView,json!({"width":300,"height":160,"hasItemTemplate":true,"collectionItems":[{"id":"row","text":"List item 0"}]})).unwrap();
    frame(&mut s);
    let item = s
        .nodes
        .values()
        .find(|n| n.kind == NodeKind::CollectionItem && n.parent == Some(list))
        .unwrap()
        .id;
    let grid = s
        .create(item, NodeKind::Grid, json!({"pointerNotifications":true}))
        .unwrap();
    let swipe=s.create(grid,NodeKind::SwipeControl,json!({"viewControls":{"rightItems":{"mode":"Execute","items":[{"id":"delete","text":"Delete"}]}}})).unwrap();
    let label = s
        .create(
            swipe,
            NodeKind::TextBlock,
            json!({"text":"List item 0","fontSize":18}),
        )
        .unwrap();
    frame(&mut s);
    let action = s
        .nodes
        .values()
        .find(|n| n.parent == Some(swipe) && n.kind == NodeKind::AppBarButton)
        .unwrap()
        .id;
    assert!(!s.nodes[&action].visible);
    assert!(s.nodes[&label].rect.height > 0.);
    s.events.clear();
    let point = s.nodes[&grid].world.point(10., 10.);
    s.input(
        Input::Move {
            pointer: 1,
            x: point.0,
            y: point.1,
        },
        1.,
    )
    .unwrap();
    let hovered = frame(&mut s);
    assert!(
        hovered["events"]
            .as_array()
            .unwrap()
            .iter()
            .any(|e| e["kind"] == "PointerEntered" && e["target"] == grid),
        "grid {:?} / {:?}, point {point:?}, events {}",
        s.nodes[&grid].rect,
        s.nodes[&grid].visible,
        hovered["events"]
    );
    assert!(!s.nodes[&action].visible);
}

#[test]
fn long_command_labels_wrap_without_splitting_grapheme_clusters() {
    let layout = winui_wasm::typography::layout(
        "Custom XamlUICommand",
        &Font {
            size: 12.,
            ..Default::default()
        },
        64.,
        true,
        TextTrimming::Clip,
        None,
        &mut Measure,
    );
    assert_eq!(layout.lines.len(), 3);
    assert!(layout.lines.iter().all(|line| line.width <= 64.));
    let emoji = "👩‍💻👩‍💻";
    let layout = winui_wasm::typography::layout(
        emoji,
        &Font::default(),
        22.,
        true,
        TextTrimming::Clip,
        None,
        &mut Measure,
    );
    assert_eq!(
        layout
            .lines
            .iter()
            .map(|line| line.text.as_str())
            .collect::<Vec<_>>(),
        vec!["👩‍💻", "👩‍💻"]
    );
}

#[test]
fn gallery_delete_menu_uses_sdk_theme_dictionary_names() {
    for theme in [Theme::Light,Theme::Dark,Theme::HighContrast] {
        let mut s=Scene::new(theme,true);s.resize(640.,600.,1.).unwrap();
        let command=s.create(s.root,NodeKind::StandardCommand,json!({"viewControls":{"standardKind":"Delete"}})).unwrap();
        let menu=s.create(s.root,NodeKind::MenuBar,json!({"menuControls":{"items":[{"id":"edit","title":"Edit","items":[{"id":"delete","command":command}]}]}})).unwrap();
        frame(&mut s);
        assert!(s.nodes[&menu].rect.width>0.);
        assert!(s.display_list().iter().any(|draw|matches!(draw,winui_wasm::render::Draw::Text{text,..}if text=="Edit")));
    }
}
