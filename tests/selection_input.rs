use serde_json::json;
use winui_wasm::{
    enums::*,
    scene::{Input, Scene, Update},
    typography::{Font, Metrics, TextMeasurer},
};
struct Measure;
impl TextMeasurer for Measure {
    fn measure(&mut self, text: &str, font: &Font) -> Metrics {
        let width = text.chars().count() as f64 * font.size * 0.5;
        Metrics {
            width,
            ascent: font.size,
            descent: font.size * 0.3,
            left: 0.,
            right: width,
        }
    }
}
fn frame(scene: &mut Scene, time: f64) {
    scene.advance(time);
    scene.layout(&mut Measure);
    scene.display_list();
}
fn patch(scene: &mut Scene, id: u32, patch: serde_json::Value) {
    scene.update(vec![Update { id, patch }]).unwrap();
}
#[test]
fn radio_exclusion_named_scope_reselection_and_notification_order() {
    let mut s = Scene::new(Theme::Light, true);
    let a = s.create(s.root, NodeKind::StackPanel, json!({})).unwrap();
    let b = s.create(s.root, NodeKind::StackPanel, json!({})).unwrap();
    let first = s
        .create(a, NodeKind::RadioButton, json!({"groupName":"theme"}))
        .unwrap();
    let second = s
        .create(b, NodeKind::RadioButton, json!({"groupName":"theme"}))
        .unwrap();
    s.input(Input::Invoke { id: first }, 0.).unwrap();
    s.snapshot();
    s.input(Input::Invoke { id: second }, 0.).unwrap();
    let events = s.snapshot().events;
    assert_eq!(
        events.iter().map(|e| e.kind).collect::<Vec<_>>(),
        [EventKind::Unchecked, EventKind::Checked, EventKind::Click]
    );
    assert_eq!(s.properties(first).unwrap().is_checked, Some(false));
    assert_eq!(s.properties(second).unwrap().is_checked, Some(true));
    s.input(Input::Invoke { id: second }, 0.).unwrap();
    assert_eq!(
        s.snapshot()
            .events
            .iter()
            .map(|e| e.kind)
            .collect::<Vec<_>>(),
        [EventKind::Click]
    );
    let independent = s
        .create(a, NodeKind::RadioButton, json!({"isChecked":true}))
        .unwrap();
    assert_eq!(s.properties(second).unwrap().is_checked, Some(true));
    assert_eq!(s.properties(independent).unwrap().is_checked, Some(true));
}
#[test]
fn group_items_keyboard_roving_tab_atomic_updates_and_lifetime() {
    let mut s = Scene::new(Theme::Light, true);
    s.resize(600., 300., 1.).unwrap();
    let group=s.create(s.root,NodeKind::RadioButtons,json!({"header":"Options","items":["One",{"text":"Disabled","enabled":false},"Three"],"selectedIndex":0})).unwrap();
    frame(&mut s, 0.);
    s.snapshot();
    let children = s.get(group).unwrap().children.clone();
    s.input(Input::Focus { id: children[0] }, 0.).unwrap();
    s.input(
        Input::KeyDown {
            key: "ArrowDown".into(),
            repeat: false,
        },
        0.,
    )
    .unwrap();
    assert_eq!(s.focused, Some(children[2]));
    assert_eq!(s.properties(group).unwrap().selected_index, 2);
    assert_eq!(
        s.snapshot()
            .nodes
            .iter()
            .filter(|n| n.kind == NodeKind::RadioButton && n.tab_stop)
            .map(|n| n.id)
            .collect::<Vec<_>>(),
        [children[2]]
    );
    let before = s.properties(group).unwrap().selected_index;
    assert!(s
        .update(vec![
            Update {
                id: group,
                patch: json!({"selectedIndex":1})
            },
            Update {
                id: group,
                patch: json!({"maxColumns":0})
            }
        ])
        .is_err());
    assert_eq!(s.properties(group).unwrap().selected_index, before);
    patch(&mut s, group, json!({"fontSize":20}));
    assert_eq!(s.properties(children[0]).unwrap().font_size, 20.);
    patch(&mut s, group, json!({"items":["New"]}));
    assert_eq!(
        s.properties(s.get(group).unwrap().children[0])
            .unwrap()
            .font_size,
        20.
    );

    assert_eq!(s.properties(group).unwrap().selected_index, -1);
    for old in children {
        assert!(s.get(old).is_err());
    }
    let latest = s.get(group).unwrap().children.clone();
    s.destroy(group).unwrap();
    for child in latest {
        assert!(s.get(child).is_err());
    }
}
#[test]
fn switch_space_repeat_enter_disabled_cancel_and_immutable_notifications() {
    let mut s = Scene::new(Theme::Light, true);
    let id = s.create(s.root, NodeKind::ToggleSwitch, json!({})).unwrap();
    s.input(Input::Focus { id }, 0.).unwrap();
    s.snapshot();
    s.input(
        Input::KeyDown {
            key: "Enter".into(),
            repeat: false,
        },
        0.,
    )
    .unwrap();
    s.input(
        Input::KeyUp {
            key: "Enter".into(),
        },
        0.,
    )
    .unwrap();
    assert!(!s.properties(id).unwrap().is_on);
    s.input(
        Input::KeyDown {
            key: " ".into(),
            repeat: false,
        },
        0.,
    )
    .unwrap();
    for _ in 0..10 {
        s.input(
            Input::KeyDown {
                key: " ".into(),
                repeat: true,
            },
            0.,
        )
        .unwrap();
    }
    s.input(Input::KeyUp { key: " ".into() }, 0.).unwrap();
    assert!(s.properties(id).unwrap().is_on);
    let events = s.snapshot().events;
    assert_eq!(
        events.iter().map(|e| e.kind).collect::<Vec<_>>(),
        [EventKind::Toggled]
    );
    assert_eq!(events[0].is_on, Some(true));
    patch(&mut s, id, json!({"isOn":false}));
    patch(&mut s, id, json!({"isOn":true}));
    assert_eq!(
        s.snapshot()
            .events
            .iter()
            .map(|e| e.is_on)
            .collect::<Vec<_>>(),
        [Some(false), Some(true)]
    );
    s.input(
        Input::KeyDown {
            key: " ".into(),
            repeat: false,
        },
        0.,
    )
    .unwrap();
    patch(&mut s, id, json!({"enabled":false}));
    s.input(Input::KeyUp { key: " ".into() }, 0.).unwrap();
    assert!(s.properties(id).unwrap().is_on);
}
#[test]
fn switch_drag_commits_by_thumb_position_and_cancel_preserves_value() {
    let mut s = Scene::new(Theme::Light, false);
    s.resize(300., 40., 1.).unwrap();
    let id = s
        .create(
            s.root,
            NodeKind::ToggleSwitch,
            json!({"width":220,"height":40}),
        )
        .unwrap();
    frame(&mut s, 0.);
    s.input(
        Input::Down {
            x: 5.,
            y: 20.,
            pointer: 1,
        },
        10.,
    )
    .unwrap();
    s.input(
        Input::Move {
            x: 25.,
            y: 20.,
            pointer: 1,
        },
        20.,
    )
    .unwrap();
    s.input(
        Input::Up {
            x: 25.,
            y: 20.,
            pointer: 1,
        },
        30.,
    )
    .unwrap();
    assert!(s.properties(id).unwrap().is_on);
    s.input(
        Input::Down {
            x: 25.,
            y: 20.,
            pointer: 2,
        },
        300.,
    )
    .unwrap();
    s.input(
        Input::Move {
            x: 1.,
            y: 20.,
            pointer: 2,
        },
        310.,
    )
    .unwrap();
    s.input(Input::Cancel { pointer: Some(2) }, 320.).unwrap();
    assert!(s.properties(id).unwrap().is_on);
    frame(&mut s, 600.);
    assert!(s.snapshot().animating);
    frame(&mut s, 700.);
    assert!(!s.snapshot().animating);
}
#[test]
fn selection_templates_render_and_policy_changes_settle_in_all_palettes() {
    for theme in [Theme::Light, Theme::Dark, Theme::HighContrast] {
        let mut s = Scene::new(theme, false);
        s.resize(600., 400., 1.25).unwrap();
        let stack = s
            .create(s.root, NodeKind::StackPanel, json!({"spacing":12}))
            .unwrap();
        s.create(
            stack,
            NodeKind::RadioButton,
            json!({"text":"Choice","isChecked":true}),
        )
        .unwrap();
        let switch = s
            .create(
                stack,
                NodeKind::ToggleSwitch,
                json!({"header":"Work","isOn":true}),
            )
            .unwrap();
        frame(&mut s, 0.);
        patch(&mut s, switch, json!({"isOn":false}));
        frame(&mut s, 40.);
        assert!(s.snapshot().animating);
        s.set_policies(true, false);
        frame(&mut s, 40.);
        assert!(!s.snapshot().animating);
    }
}

#[test]
fn uneven_columns_spatial_keys_and_reparented_exclusion_follow_tree() {
    let mut s = Scene::new(Theme::Light, true);
    s.resize(700., 300., 1.).unwrap();
    let group = s
        .create(
            s.root,
            NodeKind::RadioButtons,
            json!({"items":["A","B","C","D"],"maxColumns":3,"selectedIndex":1}),
        )
        .unwrap();
    frame(&mut s, 0.);
    let c = s.get(group).unwrap().children.clone();
    assert_eq!(s.get(c[0]).unwrap().rect.x, s.get(c[1]).unwrap().rect.x);
    assert!(s.get(c[2]).unwrap().rect.x > s.get(c[1]).unwrap().rect.x);
    assert_eq!(s.get(c[2]).unwrap().rect.y, s.get(c[3]).unwrap().rect.y);
    s.input(Input::Focus { id: c[1] }, 0.).unwrap();
    for (key, expected) in [
        ("ArrowRight", 2),
        ("ArrowRight", 3),
        ("ArrowLeft", 2),
        ("ArrowLeft", 0),
    ] {
        s.input(
            Input::KeyDown {
                key: key.into(),
                repeat: false,
            },
            0.,
        )
        .unwrap();
        assert_eq!(s.focused, Some(c[expected]));
        assert_eq!(s.properties(group).unwrap().selected_index, expected as i32);
    }
    let a = s.create(s.root, NodeKind::StackPanel, json!({})).unwrap();
    let b = s.create(s.root, NodeKind::StackPanel, json!({})).unwrap();
    let first = s
        .create(a, NodeKind::RadioButton, json!({"isChecked":true}))
        .unwrap();
    let second = s
        .create(b, NodeKind::RadioButton, json!({"isChecked":true}))
        .unwrap();
    s.reparent(second, a, Some(0)).unwrap();
    assert_eq!(s.properties(first).unwrap().is_checked, Some(false));
    patch(&mut s, second, json!({"isChecked":false}));
    assert!(
        s.snapshot()
            .nodes
            .iter()
            .find(|n| n.id == second)
            .unwrap()
            .tab_stop
    );
}

#[test]
fn multi_group_capacity_checks_are_atomic_and_shrink_before_growth() {
    let mut s = Scene::new(Theme::Light, true);
    let a = s
        .create(
            s.root,
            NodeKind::RadioButtons,
            json!({"items":vec!["A";2500]}),
        )
        .unwrap();
    let b = s
        .create(
            s.root,
            NodeKind::RadioButtons,
            json!({"items":vec!["B";2000]}),
        )
        .unwrap();
    assert!(s
        .update(vec![
            Update {
                id: a,
                patch: json!({"items":vec!["A";2900]})
            },
            Update {
                id: b,
                patch: json!({"items":vec!["B";2500]})
            }
        ])
        .is_err());
    assert_eq!(s.get(a).unwrap().children.len(), 2500);
    assert_eq!(s.properties(b).unwrap().items.len(), 2000);
    s.update(vec![
        Update {
            id: a,
            patch: json!({"items":vec!["A";3000]}),
        },
        Update {
            id: b,
            patch: json!({"items":vec!["B";1000]}),
        },
    ])
    .unwrap();
    assert_eq!(s.get(a).unwrap().children.len(), 3000);
    assert_eq!(s.get(b).unwrap().children.len(), 1000);
    let mut deep = Scene::new(Theme::Light, true);
    let mut parent = deep.root;
    for _ in 0..62 {
        parent = deep
            .create(parent, NodeKind::StackPanel, json!({}))
            .unwrap();
    }
    assert!(deep
        .create(
            parent,
            NodeKind::RadioButtons,
            json!({"items":["Too deep"]})
        )
        .is_err());
    assert!(deep.get(parent).unwrap().children.is_empty());
    let empty = deep
        .create(parent, NodeKind::RadioButtons, json!({}))
        .unwrap();
    assert!(deep
        .update(vec![Update {
            id: empty,
            patch: json!({"items":["Too deep"]})
        }])
        .is_err());
    assert!(deep.properties(empty).unwrap().items.is_empty());
}

#[test]
fn vector_antialias_groups_keep_text_at_native_resolution() {
    use winui_wasm::render::Draw;
    let mut s = Scene::new(Theme::Light, true);
    s.resize(500., 150., 1.25).unwrap();
    let stack = s.create(s.root, NodeKind::StackPanel, json!({})).unwrap();
    s.create(
        stack,
        NodeKind::RadioButton,
        json!({"text":"Choice","isChecked":true}),
    )
    .unwrap();
    s.create(
        stack,
        NodeKind::ToggleSwitch,
        json!({"header":"Work","isOn":true}),
    )
    .unwrap();
    frame(&mut s, 0.);
    let mut groups = Vec::new();
    let mut count = 0;
    let mut texts = 0;
    for draw in s.display_list() {
        match draw {
            Draw::VectorLayer { bounds } => {
                assert!(bounds.width <= 40. && bounds.height <= 20.);
                groups.push(true);
                count += 1;
            }
            Draw::Layer { .. } => groups.push(false),
            Draw::EndLayer => {
                groups.pop().unwrap();
            }
            Draw::Text { .. } => {
                assert!(!groups.contains(&true));
                texts += 1;
            }
            _ => {}
        }
    }
    assert!(groups.is_empty());
    assert_eq!(count, 2);
    assert!(texts >= 3);
}
