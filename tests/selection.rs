use serde_json::json;
use winui_wasm::{
    enums::*,
    scene::{Input, Scene, Update},
};
fn invoke(scene: &mut Scene, id: u32) {
    scene.input(Input::Invoke { id }, 0.).unwrap();
}
#[test]
fn three_state_cycle_and_notification_order_match_native() {
    let native: serde_json::Value = serde_json::from_str(include_str!(
        "../references/validation/native-selection-behavior.json"
    ))
    .unwrap();
    for kind in [NodeKind::ToggleButton, NodeKind::CheckBox] {
        let mut s = Scene::new(Theme::Light, true);
        let id = s
            .create(s.root, kind, json!({"isThreeState":true}))
            .unwrap();
        for expected in native["sequence"].as_array().unwrap() {
            invoke(&mut s, id);
            assert_eq!(
                serde_json::to_value(s.properties(id).unwrap().is_checked).unwrap(),
                expected["isChecked"]
            );
            let actual: Vec<_> = s
                .snapshot()
                .events
                .iter()
                .map(|e| e.kind.as_str())
                .collect();
            let actual: Vec<_> = actual.into_iter().map(String::from).collect();
            assert_eq!(serde_json::to_value(actual).unwrap(), expected["events"]);
        }
        // Notifications retain their own value when several inputs land
        // before the next host frame and the logical state has changed again.
        for _ in 0..3 {
            invoke(&mut s, id);
        }
        let values: Vec<_> = s
            .snapshot()
            .events
            .into_iter()
            .filter_map(|e| e.is_checked)
            .collect();
        assert_eq!(values, vec![None, Some(false), Some(true)]);
    }
}
#[test]
fn checkbox_space_enter_numpad_and_disabled_policy() {
    let mut s = Scene::new(Theme::Light, true);
    let id = s.create(s.root, NodeKind::CheckBox, json!({})).unwrap();
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
    assert_eq!(s.properties(id).unwrap().is_checked, Some(false));
    s.input(
        Input::KeyDown {
            key: " ".into(),
            repeat: false,
        },
        0.,
    )
    .unwrap();
    s.input(
        Input::KeyDown {
            key: " ".into(),
            repeat: true,
        },
        0.,
    )
    .unwrap();
    assert_eq!(s.properties(id).unwrap().is_checked, Some(false));
    s.input(Input::KeyUp { key: " ".into() }, 0.).unwrap();
    assert_eq!(s.properties(id).unwrap().is_checked, Some(true));
    s.snapshot();
    s.input(
        Input::KeyDown {
            key: "Subtract".into(),
            repeat: false,
        },
        0.,
    )
    .unwrap();
    let events = s.snapshot().events;
    assert_eq!(events.len(), 1);
    assert_eq!(events[0].kind, EventKind::Unchecked);
    s.update(vec![Update {
        id,
        patch: json!({"isChecked":null}),
    }])
    .unwrap();
    invoke(&mut s, id);
    assert_eq!(s.properties(id).unwrap().is_checked, Some(false));
    s.update(vec![Update {
        id,
        patch: json!({"enabled":false}),
    }])
    .unwrap();
    invoke(&mut s, id);
    assert_eq!(s.properties(id).unwrap().is_checked, Some(false));
    assert_eq!(s.focused, None);
}
#[test]
fn checked_updates_are_atomic_and_idempotent_and_toggle_content_is_safe() {
    let mut s = Scene::new(Theme::Light, true);
    let id = s.create(s.root, NodeKind::ToggleButton, json!({})).unwrap();
    assert!(s
        .update(vec![
            Update {
                id,
                patch: json!({"isChecked":true})
            },
            Update {
                id,
                patch: json!({"width":-1})
            }
        ])
        .is_err());
    assert_eq!(s.properties(id).unwrap().is_checked, Some(false));
    assert!(s.snapshot().events.is_empty());
    s.update(vec![Update {
        id,
        patch: json!({"isChecked":true}),
    }])
    .unwrap();
    assert_eq!(s.snapshot().events[0].kind, EventKind::Checked);
    s.update(vec![Update {
        id,
        patch: json!({"isChecked":true}),
    }])
    .unwrap();
    assert!(s.snapshot().events.is_empty());
    let content = s.create(id, NodeKind::Grid, json!({})).unwrap();
    assert!(s.create(content, NodeKind::CheckBox, json!({})).is_err());
    s.destroy(id).unwrap();
    assert!(s.get(content).is_err());
}
