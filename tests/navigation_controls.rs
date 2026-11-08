use serde_json::{json, Value};
use winui_wasm::{
    enums::*,
    scene::{Scene, Update},
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
    let mut s = Scene::new(Theme::Light, false);
    s.resize(800., 500., 1.25).unwrap();
    s
}
fn items() -> Value {
    json!([{"id":"a","text":"First","isClosable":false},{"id":"b","text":"Second"},{"id":"c","text":"Third"}])
}
fn root(s: &mut Scene, k: NodeKind, q: Value) -> u32 {
    s.create(s.root, k, json!({"width":400,"height":280,"navControls":q}))
        .unwrap()
}
fn frame(s: &mut Scene, id: u32) -> Value {
    s.layout(&mut Measure);
    let _ = s.display_list();
    let snap = serde_json::to_value(s.snapshot()).unwrap();
    snap["nodes"]
        .as_array()
        .unwrap()
        .iter()
        .find(|n| n["id"] == id)
        .unwrap()["navigationControl"]
        .clone()
}
fn command(s: &mut Scene, id: u32, q: Value) {
    s.navigation_control_command(id, q).unwrap();
}
#[test]
fn breadcrumb_popup_uses_host_window_bounds_outside_a_short_scene() {
    let mut s = scene();
    s.resize(400., 30., 1.25).unwrap();
    s.popup_viewport = Some(winui_wasm::model::Rect::new(-100., -200., 1440., 1000.));
    let id = s
        .create(
            s.root,
            NodeKind::BreadcrumbBar,
            json!({"width":80,"navControls":{"items":items()}}),
        )
        .unwrap();
    frame(&mut s, id);
    command(&mut s, id, json!({"action":"openOverflow"}));
    frame(&mut s, id);
    let popup = s
        .nodes
        .values()
        .find(|n| n.kind == NodeKind::Flyout)
        .unwrap();
    assert!(popup.rect.height > 70.);
    assert!(popup.rect.y >= 26.);
}
#[test]
fn explicit_selection_wins_over_stable_identity_when_items_and_index_change_together() {
    let mut s = scene();
    let id = root(&mut s, NodeKind::TabView, json!({"items":items()}));
    frame(&mut s, id);
    let mut values = items().as_array().unwrap().clone();
    values.insert(0, json!({"id":"new","text":"Inserted"}));
    s.events.clear();
    s.update(vec![Update {
        id,
        patch: json!({"navControls":{"items":values},"selectedIndex":0}),
    }])
    .unwrap();
    s.layout(&mut Measure);
    assert_eq!(s.nodes[&id].props.selected_index, 0);
    assert!(s
        .events
        .iter()
        .any(|e| e.kind == EventKind::SelectionChanged && e.item_id.as_deref() == Some("new")));
}

#[test]
fn flip_buttons_hide_after_idle_even_while_pointer_stays_inside() {
    let mut s = scene();
    let id = root(&mut s, NodeKind::FlipView, json!({"items":items()}));
    frame(&mut s, id);
    s.input(
        serde_json::from_value(json!({"kind":"move","x":100,"y":100,"pointer":1})).unwrap(),
        10.,
    )
    .unwrap();
    assert!(frame(&mut s, id)["parts"]
        .as_array()
        .unwrap()
        .iter()
        .any(|p| p["role"] == "flipButton" && p["visible"] == true));
    s.advance(3011.);
    assert!(frame(&mut s, id)["parts"]
        .as_array()
        .unwrap()
        .iter()
        .filter(|p| p["role"] == "flipButton")
        .all(|p| p["visible"] == false));
}
#[test]
fn tree_checkboxes_precede_expanders_and_keep_default_row_height() {
    for rtl in [false, true] {
        let mut s = scene();
        let id = tree(&mut s);
        if rtl {
            s.update(vec![Update {
                id,
                patch: json!({"flowDirection":"RightToLeft"}),
            }])
            .unwrap();
        }
        frame(&mut s, id);
        let root_row = s
            .nodes
            .values()
            .find(|n| n.props.collection_owner == Some(id) && n.props.collection_key == "root")
            .unwrap();
        assert_eq!(root_row.rect.height, 32.);
        let check = s
            .nodes
            .values()
            .find(|n| n.parent == Some(root_row.id) && n.kind == NodeKind::CheckBox)
            .unwrap();
        if rtl {
            assert!(check.rect.x > root_row.rect.width - 40.);
        } else {
            assert!((check.rect.x - 14.4).abs() < 0.81);
        }
    }
}
#[test]
fn template_frame_accepts_real_native_gradient_border_and_background() {
    let mut s = scene();
    let id=s.create(s.root,NodeKind::Border,json!({"width":347,"height":280,"borderBrush":{"resource":"TextControlBorderBrush"},"borderThickness":[1,1,1,1],"background":{"kind":"linearGradient","from":[0,0],"to":[1,1],"stops":[{"offset":0,"color":"#ffffff"},{"offset":1,"color":"#eeeeee"}]}})).unwrap();
    s.layout(&mut Measure);
    let draws = s.display_list();
    assert!(
        draws
            .iter()
            .filter(|d| matches!(d, winui_wasm::render::Draw::PathBrush { .. }))
            .count()
            >= 2
    );
    assert!((s.nodes[&id].rect.width - 347.).abs() < 0.81);
}

#[test]
fn five_controls_draw_both_themes_without_missing_native_brushes() {
    for theme in [Theme::Light, Theme::Dark] {
        let mut s = scene();
        s.theme = theme;
        for kind in [
            NodeKind::FlipView,
            NodeKind::PipsPager,
            NodeKind::BreadcrumbBar,
            NodeKind::TreeView,
            NodeKind::TabView,
        ] {
            let id = root(&mut s, kind, json!({"items":items(),"numberOfPages":10}));
            assert!(!frame(&mut s, id).is_null());
        }
    }
}
#[test]
fn pips_wrap_finite_but_infinite_does_not_overflow() {
    let mut s = scene();
    let id = root(
        &mut s,
        NodeKind::PipsPager,
        json!({"numberOfPages":10,"wrapMode":"Wrap"}),
    );
    frame(&mut s, id);
    command(&mut s, id, json!({"action":"step","direction":-1}));
    assert_eq!(frame(&mut s, id)["selectedPageIndex"], 9);
    s.update(vec![Update {
        id,
        patch: json!({"navControls":{"numberOfPages":-1,"selectedPageIndex":2147483647}}),
    }])
    .unwrap();
    command(&mut s, id, json!({"action":"step","direction":1}));
    assert_eq!(frame(&mut s, id)["selectedPageIndex"], 2147483647);
}
#[test]
fn flip_selection_preserves_identity_after_insert_and_interrupts_from_presented_page() {
    let mut s = scene();
    let id = root(&mut s, NodeKind::FlipView, json!({"items":items()}));
    frame(&mut s, id);
    command(&mut s, id, json!({"action":"choose","index":1}));
    s.advance(40.);
    let a = frame(&mut s, id);
    command(&mut s, id, json!({"action":"choose","index":2}));
    let b = frame(&mut s, id);
    assert_eq!(a["parts"][0]["rect"], b["parts"][0]["rect"]);
    s.advance(2000.);
    let mut values = items().as_array().unwrap().clone();
    values.insert(0, json!({"id":"new","text":"New"}));
    s.update(vec![Update {
        id,
        patch: json!({"navControls":{"items":values}}),
    }])
    .unwrap();
    assert_eq!(frame(&mut s, id)["selectedIndex"], 3);
}
#[test]
fn tab_close_is_a_request_and_nonclosable_tab_is_protected() {
    let mut s = scene();
    let id = root(&mut s, NodeKind::TabView, json!({"items":items()}));
    frame(&mut s, id);
    command(&mut s, id, json!({"action":"close","index":0}));
    assert!(!s
        .events
        .iter()
        .any(|e| e.kind == EventKind::TabCloseRequested));
    command(&mut s, id, json!({"action":"close","index":1}));
    assert!(s
        .events
        .iter()
        .any(|e| e.kind == EventKind::TabCloseRequested));
    assert_eq!(s.nodes[&id].props.nav_controls.items.len(), 3);
}
#[test]
fn tab_drop_checks_permission_and_duplicate_ids_and_reorders_stably() {
    let mut s = scene();
    let a = root(
        &mut s,
        NodeKind::TabView,
        json!({"items":items(),"canDragTabs":true}),
    );
    let b = root(&mut s, NodeKind::TabView, json!({"items":[]}));
    frame(&mut s, a);
    command(&mut s, a, json!({"action":"dragStart","index":1}));
    let reply = s
        .navigation_control_host_input(
            b,
            json!({"action":"drop","source":a,"items":[],"index":0}),
            1.,
        )
        .unwrap();
    assert_eq!(reply["committed"], false);
    s.update(vec![Update {
        id: b,
        patch: json!({"navControls":{"allowDropTabs":true}}),
    }])
    .unwrap();
    let reply = s
        .navigation_control_host_input(
            b,
            json!({"action":"drop","source":a,"items":[],"index":0}),
            2.,
        )
        .unwrap();
    assert_eq!(reply["committed"], true);
    assert_eq!(
        s.nodes[&a]
            .props
            .nav_controls
            .items
            .iter()
            .map(|i| i.id.as_str())
            .collect::<Vec<_>>(),
        ["a", "c"]
    );
    assert_eq!(s.nodes[&b].props.nav_controls.items[0].id, "b");
    command(&mut s, a, json!({"action":"dragStart","index":1}));
    command(
        &mut s,
        a,
        json!({"action":"drop","source":a,"items":[],"index":0}),
    );
    assert_eq!(s.nodes[&a].props.nav_controls.items[0].id, "c");
}
fn tree(s: &mut Scene) -> u32 {
    root(
        s,
        NodeKind::TreeView,
        json!({"treeSelectionMode":"Multiple","items":[{"id":"root","text":"Root","isExpanded":true},{"id":"child","text":"Child","parent":"root"},{"id":"other","text":"Other","parent":"root"},{"id":"dest","text":"Destination"}]}),
    )
}
#[test]
fn tree_multiselection_preserves_hidden_descendants_and_partial_state() {
    let mut s = scene();
    let id = tree(&mut s);
    frame(&mut s, id);
    command(&mut s, id, json!({"action":"selectNode","key":"child"}));
    let snap = frame(&mut s, id);
    assert!(snap["treeRows"]
        .as_array()
        .unwrap()
        .iter()
        .any(|r| r["key"] == "root" && r["partial"] == true));
    command(
        &mut s,
        id,
        json!({"action":"expand","key":"root","expanded":false}),
    );
    assert!(s.nodes[&id]
        .props
        .selected_keys
        .iter()
        .any(|k| k == "child"));
    command(&mut s, id, json!({"action":"selectNode","key":"root"}));
    assert_eq!(s.nodes[&id].props.selected_keys.len(), 3);
}
#[test]
fn tree_reparent_retains_hidden_subtree_and_rejects_cycle_atomically() {
    let mut s = scene();
    let id = tree(&mut s);
    frame(&mut s, id);
    assert!(s
        .navigation_control_command(
            id,
            json!({"action":"reparent","keys":["root"],"parent":"child","before":null})
        )
        .is_err());
    assert_eq!(s.nodes[&id].props.nav_controls.items[0].parent, None);
    command(
        &mut s,
        id,
        json!({"action":"expand","key":"root","expanded":false}),
    );
    command(
        &mut s,
        id,
        json!({"action":"reparent","keys":["root"],"parent":"dest","before":null}),
    );
    assert_eq!(s.nodes[&id].props.nav_controls.items.len(), 4);
    assert_eq!(
        s.nodes[&id]
            .props
            .nav_controls
            .items
            .iter()
            .find(|i| i.id == "root")
            .unwrap()
            .parent
            .as_deref(),
        Some("dest")
    );
    assert_eq!(
        s.nodes[&id]
            .props
            .nav_controls
            .items
            .iter()
            .find(|i| i.id == "child")
            .unwrap()
            .parent
            .as_deref(),
        Some("root")
    );
}
#[test]
fn breadcrumb_overflow_retains_last_and_uses_existing_flyout() {
    let mut s = scene();
    let id = root(
        &mut s,
        NodeKind::BreadcrumbBar,
        json!({"items":(0..10).map(|i|json!({"id":i.to_string(),"text":format!("Folder {i}")})).collect::<Vec<_>>()}),
    );
    let snap = frame(&mut s, id);
    assert!(snap["firstVisibleIndex"].as_i64().unwrap() > 0);
    assert_eq!(
        snap["parts"].as_array().unwrap().last().unwrap()["key"],
        "9"
    );
    command(&mut s, id, json!({"action":"openOverflow"}));
    frame(&mut s, id);
    assert!(s
        .nodes
        .values()
        .any(|n| n.kind == NodeKind::Flyout && n.props.is_open));
}
#[test]
fn flip_template_slots_stay_bounded_and_can_be_recreated() {
    let mut s = scene();
    let id = root(
        &mut s,
        NodeKind::FlipView,
        json!({"items":(0..100).map(|i|json!({"id":i.to_string(),"text":i.to_string()})).collect::<Vec<_>>()}),
    );
    for index in 0..20 {
        command(&mut s, id, json!({"action":"choose","index":index}));
        s.advance(index as f64 * 1000.);
        frame(&mut s, id);
        s.navigation_slot(id, &index.to_string(), "content")
            .unwrap();
        frame(&mut s, id);
        assert!(s.nodes[&id].children.len() < 5);
    }
    command(&mut s, id, json!({"action":"choose","index":0}));
    s.advance(25000.);
    frame(&mut s, id);
    assert!(s.navigation_slot(id, "0", "content").is_ok());
}

#[test]
fn flip_acrylic_chrome_samples_after_template_content() {
    use winui_wasm::render::Draw;
    let mut s = scene();
    let id = root(&mut s, NodeKind::FlipView, json!({"items":items()}));
    frame(&mut s, id);
    let slot = s.navigation_slot(id, "a", "content").unwrap();
    s.create(slot,NodeKind::Grid,json!({"background":"#ff00ff","horizontalAlignment":"Stretch","verticalAlignment":"Stretch"})).unwrap();
    s.input(
        serde_json::from_value(json!({"kind":"move","x":100,"y":100,"pointer":1})).unwrap(),
        10.,
    )
    .unwrap();
    s.layout(&mut Measure);
    let draws = s.display_list();
    let page = draws
        .iter()
        .rposition(|d| matches!(d,Draw::Fill{color,..} if color=="#ff00ff"))
        .unwrap();
    let chrome = draws
        .iter()
        .position(|d| matches!(d, Draw::Acrylic { .. }))
        .unwrap();
    assert!(
        page < chrome,
        "Acrylic must sample its template page before chrome is drawn"
    );
}
#[test]
fn pips_render_native_font_glyph_and_pressed_selected_uses_normal_size() {
    use winui_wasm::render::Draw;
    let mut s = scene();
    let id = root(
        &mut s,
        NodeKind::PipsPager,
        json!({"numberOfPages":5,"selectedPageIndex":2}),
    );
    frame(&mut s, id);
    assert!(s
        .display_list()
        .iter()
        .any(|d| matches!(d,Draw::Text{text,size,..} if text=="\u{ea3b}"&&*size==6.)));
    s.input(
        serde_json::from_value(json!({"kind":"down","x":30,"y":12,"pointer":1})).unwrap(),
        10.,
    )
    .unwrap();
    frame(&mut s, id);
    assert!(!s
        .display_list()
        .iter()
        .any(|d| matches!(d,Draw::Text{text,size,..} if text=="\u{ea3b}"&&*size==6.)));
}
#[test]
fn tabs_entrance_add_delete_timing_and_reduced_motion_release_ghosts() {
    let mut s = scene();
    let id = root(&mut s, NodeKind::TabView, json!({"items":items()}));
    let v = frame(&mut s, id);
    assert_eq!(v["tabVisuals"][0]["opacity"], 0.);
    assert_eq!(v["tabVisuals"][0]["offsetY"], 28.);
    s.advance(300.);
    let v = frame(&mut s, id);
    let entry = &v["tabVisuals"][0];
    assert!(entry["opacity"].as_f64().unwrap() > 0.);
    assert!(entry["opacity"].as_f64().unwrap() < 1.);
    assert!(entry["offsetY"].as_f64().unwrap() > 0.);
    s.advance(700.);
    frame(&mut s, id);
    let mut list = items().as_array().unwrap().clone();
    list.push(json!({"id":"new","text":"New"}));
    s.update(vec![Update {
        id,
        patch: json!({"navControls":{"items":list}}),
    }])
    .unwrap();
    let v = frame(&mut s, id);
    let added = v["tabVisuals"]
        .as_array()
        .unwrap()
        .iter()
        .find(|v| v["key"] == "new")
        .unwrap();
    assert_eq!(added["opacity"], 0.);
    assert_eq!(added["scale"], 0.85);
    s.advance(960.);
    let v = frame(&mut s, id);
    let added = v["tabVisuals"]
        .as_array()
        .unwrap()
        .iter()
        .find(|v| v["key"] == "new")
        .unwrap();
    let opacity = added["opacity"].as_f64().unwrap();
    assert!(opacity > 0. && opacity < 1.);
    s.update(vec![Update {
        id,
        patch: json!({"navControls":{"items":items()}}),
    }])
    .unwrap();
    let v = frame(&mut s, id);
    let ghost = v["tabVisuals"]
        .as_array()
        .unwrap()
        .iter()
        .find(|v| v["removed"] == true)
        .unwrap();
    assert!((ghost["opacity"].as_f64().unwrap() - opacity).abs() < 1e-8);
    s.reduced_motion = true;
    let v = frame(&mut s, id);
    assert!(v["tabVisuals"]
        .as_array()
        .unwrap()
        .iter()
        .all(|v| v["removed"] == false && v["opacity"] == 1. && v["offsetY"] == 0.));
}
#[test]
fn tab_delete_keeps_an_unhittable_visual_then_releases_it_after_120ms() {
    let mut s = scene();
    let id = root(&mut s, NodeKind::TabView, json!({"items":items()}));
    frame(&mut s, id);
    s.advance(800.);
    frame(&mut s, id);
    s.update(vec![Update{id,patch:json!({"navControls":{"items":[{"id":"a","text":"First"},{"id":"c","text":"Third"}]}})}]).unwrap();
    let v = frame(&mut s, id);
    assert!(v["tabVisuals"]
        .as_array()
        .unwrap()
        .iter()
        .any(|v| v["key"] == "b" && v["removed"] == true));
    assert!(!v["parts"]
        .as_array()
        .unwrap()
        .iter()
        .any(|v| v["key"] == "b"));
    s.advance(860.);
    let v = frame(&mut s, id);
    let ghost = v["tabVisuals"]
        .as_array()
        .unwrap()
        .iter()
        .find(|v| v["removed"] == true)
        .unwrap();
    assert!(ghost["opacity"].as_f64().unwrap() > 0. && ghost["opacity"].as_f64().unwrap() < 1.);
    s.advance(921.);
    let v = frame(&mut s, id);
    assert!(!v["tabVisuals"]
        .as_array()
        .unwrap()
        .iter()
        .any(|v| v["removed"] == true));
    s.advance(1261.);
    frame(&mut s, id);
    assert!(!s.snapshot().animating);
}

#[test]
fn flip_buttons_use_native_triangle_and_fractional_dpi_geometry() {
    use winui_wasm::render::Draw;
    let baseline: Value = serde_json::from_str(include_str!(
        "../references/navigation-controls-paging-buttons.json"
    ))
    .unwrap();
    for orientation in ["Horizontal", "Vertical"] {
        let native = baseline["cases"]
            .as_array()
            .unwrap()
            .iter()
            .find(|c| {
                c["kind"] == "FlipView"
                    && c["theme"] == "Light"
                    && c["axis"] == orientation
                    && c["pattern"]
                        == if orientation == "Horizontal" {
                            "Flat"
                        } else {
                            "Stripes"
                        }
                    && c["state"] == "Normal"
            })
            .unwrap();
        let mut s = scene();
        s.resize(800., 450., 1.25).unwrap();
        let id=s.create(s.root,NodeKind::FlipView,json!({"width":400,"height":270,"selectedIndex":1,"orientation":orientation,"navControls":{"items":items()}})).unwrap();
        frame(&mut s, id);
        s.input(
            serde_json::from_value(json!({"kind":"move","x":100,"y":100,"pointer":1})).unwrap(),
            10.,
        )
        .unwrap();
        let v = frame(&mut s, id);
        let next = v["parts"]
            .as_array()
            .unwrap()
            .iter()
            .find(|p| p["key"] == "next")
            .unwrap();
        for (i, key) in ["x", "y", "width", "height"].iter().enumerate() {
            let expected = native["button"][i].as_f64().unwrap() - if i < 2 { 24. } else { 0. };
            assert!((next["rect"][key].as_f64().unwrap() - expected).abs() < 0.0001);
        }
        let draws = s.display_list();
        assert!(draws.iter().any(|d|matches!(d,Draw::Text{text,..}if text==if orientation=="Horizontal"{"\u{edda}"}else{"\u{eddc}"})));
        assert!(!draws
            .iter()
            .any(|d| matches!(d,Draw::Text{text,..}if text=="\u{e76c}")));
    }
}
