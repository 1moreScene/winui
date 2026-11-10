use serde_json::json;
use winui_wasm::{
    enums::*,
    scene::{Input, Scene, Update},
    typography::{Font, Metrics, TextMeasurer},
};

struct Measure;
impl TextMeasurer for Measure {
    fn measure(&mut self, text: &str, font: &Font) -> Metrics {
        Metrics {
            width: text.chars().count() as f64 * font.size * 0.5,
            ascent: font.size,
            descent: 4.,
            ..Default::default()
        }
    }
}
fn setup(kind: NodeKind, checked: bool) -> (Scene, u32, u32) {
    let mut s = Scene::new(Theme::Light, true);
    s.resize(640., 360., 1.25).unwrap();
    let table=s.create(s.root,NodeKind::TableView,json!({"height":320,"table":{"autoGenerateColumns":false,"items":[{"id":"a","values":{"flag":checked}},{"id":"b","values":{"flag":false}}],"columns":[{"key":"flag","field":"flag","kind":if kind==NodeKind::CheckBox{"CheckBox"}else{"ToggleSwitch"},"width":{"unit":"Pixel","value":180}}]}})).unwrap();
    s.layout(&mut Measure);
    let child = s
        .nodes
        .values()
        .filter(|n| n.kind == kind)
        .min_by(|a, b| a.world.0[5].total_cmp(&b.world.0[5]))
        .unwrap()
        .id;
    (s, table, child)
}
fn point(s: &Scene, child: u32) -> (f64, f64) {
    let n = &s.nodes[&child];
    n.world.point(n.rect.width / 2., n.rect.height / 2.)
}
fn value(s: &Scene, table: u32) -> bool {
    s.nodes[&table].props.table.as_ref().unwrap().items[0].values["flag"]
        .as_bool()
        .unwrap()
}
fn frame(s: &mut Scene, input: Input) {
    s.input(input, s.time).unwrap();
    s.layout(&mut Measure);
}

#[test]
fn generated_boolean_cells_press_capture_and_only_toggle_on_valid_release() {
    for kind in [NodeKind::CheckBox, NodeKind::ToggleSwitch] {
        for initial in [false, true] {
            let (mut s, table, child) = setup(kind, initial);
            let (x, y) = point(&s, child);
            frame(&mut s, Input::Move { pointer: 1, x, y });
            let hover = s.display_list();
            frame(&mut s, Input::Down { pointer: 1, x, y });
            assert_eq!(
                s.nodes[&child].button.state(true),
                ControlState::Pressed,
                "{kind:?} must enter its own pressed visual state"
            );
            assert_eq!(s.captured, Some((1, child)));
            assert_eq!(
                value(&s, table),
                initial,
                "Pointer down must not change the bound value"
            );
            assert_ne!(
                s.display_list(),
                hover,
                "Pressed state must reach actual drawing commands, including retained rows"
            );
            if kind == NodeKind::CheckBox {
                frame(
                    &mut s,
                    Input::Move {
                        pointer: 1,
                        x: 600.,
                        y: 340.,
                    },
                );
                assert_ne!(s.nodes[&child].button.state(true), ControlState::Pressed);
                frame(&mut s, Input::Move { pointer: 1, x, y });
                assert_eq!(s.nodes[&child].button.state(true), ControlState::Pressed);
            }
            frame(&mut s, Input::Up { pointer: 1, x, y });
            assert_ne!(s.nodes[&child].button.state(true), ControlState::Pressed);
            assert_eq!(s.captured, None);
            assert_eq!(value(&s, table), !initial);
        }
    }
}

#[test]
fn checkbox_release_outside_or_cancel_keeps_value_and_clears_pressed_state() {
    for cancel in [false, true] {
        let (mut s, table, child) = setup(NodeKind::CheckBox, false);
        let (x, y) = point(&s, child);
        frame(&mut s, Input::Down { pointer: 1, x, y });
        if cancel {
            frame(&mut s, Input::Cancel { pointer: Some(1) });
        } else {
            frame(
                &mut s,
                Input::Move {
                    pointer: 1,
                    x: 600.,
                    y: 340.,
                },
            );
            frame(
                &mut s,
                Input::Up {
                    pointer: 1,
                    x: 600.,
                    y: 340.,
                },
            );
        }
        assert!(!value(&s, table));
        assert_ne!(s.nodes[&child].button.state(true), ControlState::Pressed);
        assert_eq!(s.captured, None);
    }
}

#[test]
fn checkbox_space_uses_the_same_press_release_and_binding_path() {
    let (mut s, table, child) = setup(NodeKind::CheckBox, false);
    frame(&mut s, Input::Focus { id: child });
    frame(
        &mut s,
        Input::KeyDown {
            key: " ".into(),
            repeat: false,
        },
    );
    assert_eq!(s.nodes[&child].button.state(true), ControlState::Pressed);
    assert!(!value(&s, table));
    frame(&mut s, Input::KeyUp { key: " ".into() });
    assert!(value(&s, table));
    assert_ne!(s.nodes[&child].button.state(true), ControlState::Pressed);
}

#[test]
fn read_only_boolean_columns_keep_their_enabled_appearance_without_accepting_presses() {
    let (mut s, table, child) = setup(NodeKind::CheckBox, true);
    s.update(vec![Update {
        id: table,
        patch: json!({"table":{"isReadOnly":true}}),
    }])
    .unwrap();
    s.layout(&mut Measure);
    assert!(s.nodes[&child].enabled);
    assert!(!s.nodes[&child].props.is_hit_test_visible);
    let (x, y) = point(&s, child);
    frame(&mut s, Input::Down { pointer: 1, x, y });
    frame(&mut s, Input::Up { pointer: 1, x, y });
    assert!(value(&s, table));
    assert_ne!(s.nodes[&child].button.state(true), ControlState::Pressed);
}

#[test]
fn checked_events_inside_a_cancellable_editor_do_not_commit_the_source_early() {
    let (mut s, table, _) = setup(NodeKind::CheckBox, false);
    let command = |action: &str, data: serde_json::Value| {
        serde_json::from_value::<Input>(
            json!({"kind":"table","id":table,"action":action,"data":data}),
        )
        .unwrap()
    };
    frame(
        &mut s,
        command("beginEdit", json!({"cell":{"row":"a","column":"flag"}})),
    );
    let resolve = |s: &mut Scene, kind: EventKind| {
        let request = s
            .events
            .iter()
            .rev()
            .find(|e| e.target == table && e.kind == kind)
            .unwrap()
            .request_id;
        frame(s,serde_json::from_value::<Input>(json!({"kind":"table","id":table,"action":"resolve","request":request,"cancel":false,"data":{}})).unwrap());
    };
    resolve(&mut s, EventKind::BeginningEdit);
    let child = s.focused.unwrap();
    let (x, y) = point(&s, child);
    frame(&mut s, Input::Down { pointer: 1, x, y });
    frame(&mut s, Input::Up { pointer: 1, x, y });
    assert_eq!(s.nodes[&child].props.is_checked, Some(true));
    assert!(!value(&s, table));
    frame(&mut s, command("cancelEdit", json!({})));
    resolve(&mut s, EventKind::CellEditEnding);
    assert!(!value(&s, table));
}

#[test]
fn checkboxes_in_caller_templates_keep_their_own_binding_contract() {
    let (mut s, table, _) = setup(NodeKind::CheckBox, false);
    s.update(vec![Update{id:table,patch:json!({"table":{"columns":[{"key":"flag","field":"flag","kind":"Template","hasTemplate":true,"width":{"unit":"Pixel","value":180}}]}})}]).unwrap();
    s.layout(&mut Measure);
    let slot = s
        .snapshot()
        .nodes
        .into_iter()
        .find(|n| n.id == table)
        .unwrap()
        .table
        .unwrap()
        .realized
        .into_iter()
        .find(|s| s.row == "a" && s.column == "flag")
        .unwrap()
        .id;
    let child = s
        .create(slot, NodeKind::CheckBox, json!({"isChecked":false}))
        .unwrap();
    s.layout(&mut Measure);
    let (x, y) = point(&s, child);
    frame(&mut s, Input::Down { pointer: 1, x, y });
    frame(&mut s, Input::Up { pointer: 1, x, y });
    assert_eq!(s.nodes[&child].props.is_checked, Some(true));
    assert!(!value(&s, table));
}

#[test]
fn a_queued_boolean_event_does_not_write_into_a_replaced_source() {
    let (mut s, table, child) = setup(NodeKind::CheckBox, false);
    s.input(Input::Invoke { id: child }, s.time).unwrap();
    s.update(vec![Update {
        id: table,
        patch: json!({"table":{"items":[{"id":"replacement","values":{"flag":false}}]}}),
    }])
    .unwrap();
    s.layout(&mut Measure);
    assert!(!value(&s, table));
    assert_eq!(
        s.nodes[&table].props.table.as_ref().unwrap().items[0].id,
        "replacement"
    );
}
