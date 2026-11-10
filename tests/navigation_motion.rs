use serde_json::json;
use winui_wasm::{
    model::{Input, PaneDisplayMode, Properties},
    navigation::NavigationView,
    render::{display_list, Draw},
};
fn view() -> NavigationView {
    NavigationView::new(serde_json::from_value(json!({"paneDisplayMode":"Left","isBackButtonVisible":"Collapsed","selectedId":"follower","items":[
 {"id":"parent","text":"Parent","selectsOnInvoked":false,"children":[{"id":"child","text":"Child"},{"id":"nested","text":"Nested","children":[{"id":"leaf","text":"Leaf"}]}]},
 {"id":"follower","text":"Follower"},{"id":"last","text":"Last"}]})).unwrap()).unwrap()
}
fn tick(nav: &mut NavigationView, time: f64) {
    nav.advance(time);
    nav.layout();
}
fn y(nav: &NavigationView, id: &str) -> f64 {
    nav.parts.iter().find(|p| p.id == id).unwrap().rect.y
}
#[test]
fn source_200ms_reposition_moves_existing_items_but_commits_children_immediately() {
    let mut nav = view();
    tick(&mut nav, 1000.);
    let old = y(&nav, "follower");
    nav.input(
        Input::Expand {
            id: "parent".into(),
            expanded: true,
        },
        1000.,
    )
    .unwrap();
    assert!(nav.parts.iter().any(|p| p.id == "child"));
    assert_eq!(y(&nav, "follower"), old);
    assert!(nav.snapshot().animating);
    tick(&mut nav, 1100.);
    assert!(y(&nav, "follower") > old && y(&nav, "follower") < old + 80.);
    assert!(!nav.indicator_motion.active(1100.));
    assert_eq!(nav.indicator_target.unwrap().y, y(&nav, "follower") + 10.);
    tick(&mut nav, 1200.);
    assert_eq!(y(&nav, "follower"), old + 80.);
    assert!(nav
        .snapshot()
        .hierarchy_visuals
        .iter()
        .all(|v| v.offset_y == 0.));
}
#[test]
fn rapid_collapse_samples_current_offset_and_nested_changes_and_scroll_do_not_restart_it() {
    let mut nav = view();
    tick(&mut nav, 1000.);
    let old = y(&nav, "follower");
    nav.input(
        Input::Expand {
            id: "parent".into(),
            expanded: true,
        },
        1000.,
    )
    .unwrap();
    tick(&mut nav, 1070.);
    let current = y(&nav, "follower");
    nav.input(
        Input::Expand {
            id: "parent".into(),
            expanded: false,
        },
        1070.,
    )
    .unwrap();
    assert_eq!(y(&nav, "follower"), current);
    assert!(!nav.parts.iter().any(|p| p.id == "child"));
    tick(&mut nav, 1270.);
    assert_eq!(y(&nav, "follower"), old);
    nav.input(
        Input::Expand {
            id: "parent".into(),
            expanded: true,
        },
        1300.,
    )
    .unwrap();
    tick(&mut nav, 1500.);
    nav.input(
        Input::Expand {
            id: "nested".into(),
            expanded: true,
        },
        1500.,
    )
    .unwrap();
    assert!(nav.parts.iter().any(|p| p.id == "leaf"));
    tick(&mut nav, 1700.);
    assert_eq!(y(&nav, "follower"), old + 120.);
    nav.input(Input::Wheel { delta: 12. }, 1700.).unwrap();
    assert!(nav
        .snapshot()
        .hierarchy_visuals
        .iter()
        .all(|v| v.offset_y == 0.));
}
#[test]
fn chevrons_use_native_state_markers_and_reduced_motion_and_removal_release_tracks() {
    let mut nav = view();
    tick(&mut nav, 1000.);
    nav.input(
        Input::Expand {
            id: "parent".into(),
            expanded: true,
        },
        1000.,
    )
    .unwrap();
    let s = nav.snapshot();
    let c = s
        .hierarchy_visuals
        .iter()
        .find(|p| p.id == "parent")
        .unwrap()
        .chevron
        .as_ref()
        .unwrap();
    assert!(c.active);
    assert!(c.segment_start.contains("NormalOffToNormalOn"));
    nav.update(json!([{"reducedMotion":true}])).unwrap();
    assert!(!nav.snapshot().animating);
    assert!(nav
        .snapshot()
        .hierarchy_visuals
        .iter()
        .all(|v| v.offset_y == 0. && v.chevron.as_ref().is_none_or(|c| !c.active)));
    nav.update(json!([{"items":[],"selectedId":null}])).unwrap();
    assert!(nav.snapshot().hierarchy_visuals.is_empty());
}
#[test]
fn acrylic_recipe_updates_have_500ms_color_motion_and_capability_returns_with_crossfade() {
    let mut nav = NavigationView::new(Properties {
        pane_display_mode: PaneDisplayMode::Left,
        expanded_pane_material: Some(
            serde_json::from_value(
                json!({"tintColor":"#ffffff","tintOpacity":0.6,"fallbackColor":"#f2f2f2"}),
            )
            .unwrap(),
        ),
        ..Properties::default()
    })
    .unwrap();
    tick(&mut nav, 1000.);
    let old = nav.pane_colors().unwrap().tint;
    nav.update(json!([{"expandedPaneMaterial":{"tintColor":"#2055ee","tintOpacity":0.6,"fallbackColor":"#dadada"}}])).unwrap();
    assert_eq!(nav.pane_colors().unwrap().tint, old);
    assert!(nav.snapshot().animating);
    tick(&mut nav, 1250.);
    let middle = nav.pane_colors().unwrap().tint;
    assert_ne!(middle, old);
    tick(&mut nav, 1500.);
    assert_ne!(nav.pane_colors().unwrap().tint, middle);
    nav.update(json!([{"isBackdropAvailable":false}])).unwrap();
    tick(&mut nav, 1800.);
    assert_eq!(nav.material_motion.value(1800.), 0.);
    assert!(!display_list(&nav)
        .iter()
        .any(|d| matches!(d, Draw::Acrylic { .. })));
    nav.update(json!([{"isBackdropAvailable":true}])).unwrap();
    assert_eq!(nav.material_motion.value(1800.), 0.);
    tick(&mut nav, 1880.);
    assert!(nav.material_motion.value(1880.) > 0. && nav.material_motion.value(1880.) < 1.);
}

#[test]
fn descendant_motion_inherits_ancestor_offset_without_restarting_its_timeline() {
    let mut nav=NavigationView::new(serde_json::from_value(json!({"paneDisplayMode":"Left","isBackButtonVisible":"Collapsed","items":[
 {"id":"a","text":"A","children":[{"id":"a1","text":"A1"},{"id":"a2","text":"A2"}]},
 {"id":"b","text":"B","children":[{"id":"nested","text":"Nested","children":[{"id":"leaf","text":"Leaf"}]},{"id":"sibling","text":"Sibling"}]}]})).unwrap()).unwrap();
    nav.input(
        Input::Expand {
            id: "b".into(),
            expanded: true,
        },
        1000.,
    )
    .unwrap();
    tick(&mut nav, 2000.);
    nav.input(
        Input::Expand {
            id: "a".into(),
            expanded: true,
        },
        2000.,
    )
    .unwrap();
    tick(&mut nav, 2070.);
    nav.input(
        Input::Expand {
            id: "nested".into(),
            expanded: true,
        },
        2070.,
    )
    .unwrap();
    tick(&mut nav, 2170.);
    let s = nav.snapshot();
    let parent = s.hierarchy_visuals.iter().find(|p| p.id == "b").unwrap();
    let child = s
        .hierarchy_visuals
        .iter()
        .find(|p| p.id == "sibling")
        .unwrap();
    let own = -40. * (1. - winui_wasm::animation::bezier(0.5, [0., 0.35, 0.15, 1.]));
    assert!((child.offset_y - parent.offset_y - own).abs() < 0.0001);
}
