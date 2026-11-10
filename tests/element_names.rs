use serde_json::json;
use winui_wasm::{
    enums::*,
    scene::{ElementReferenceProperty as Ref, Input, Scene, Update},
};

fn scene() -> Scene {
    Scene::new(Theme::Light, true)
}
fn patch(s: &mut Scene, id: u32, value: serde_json::Value) {
    s.update(vec![Update { id, patch: value }]).unwrap();
}

#[test]
fn forward_names_resolve_in_rust_and_survive_repeated_declarations_and_recreation() {
    let mut s = scene();
    let ticks = s
        .create(
            s.root,
            NodeKind::TickBar,
            json!({"elementReferences":{"primitiveSource":"volume"}}),
        )
        .unwrap();
    let pending = s.snapshot();
    assert_eq!(pending.unresolved_element_references.len(), 1);
    assert_eq!(
        pending.unresolved_element_references[0].property,
        Ref::PrimitiveSource
    );
    let slider = s
        .create(
            s.root,
            NodeKind::Slider,
            json!({"name":"volume","value":40}),
        )
        .unwrap();
    s.advance(0.);
    assert_eq!(
        s.properties(ticks).unwrap().primitives.unwrap().source,
        Some(slider)
    );
    patch(
        &mut s,
        ticks,
        json!({"primitives":{"source":null},"elementReferences":{"primitiveSource":"volume"}}),
    );
    s.advance(1.);
    assert_eq!(
        s.properties(ticks).unwrap().primitives.unwrap().source,
        Some(slider)
    );
    s.destroy(slider).unwrap();
    assert_eq!(s.snapshot().unresolved_element_references.len(), 1);
    let replacement = s
        .create(s.root, NodeKind::Slider, json!({"name":"volume"}))
        .unwrap();
    assert!(s.snapshot().unresolved_element_references.is_empty());
    assert_eq!(
        s.properties(ticks).unwrap().primitives.unwrap().source,
        Some(replacement)
    );
    patch(
        &mut s,
        ticks,
        json!({"elementReferences":{"primitiveSource":null},"primitives":{"source":null}}),
    );
    s.advance(2.);
    assert_eq!(
        s.properties(ticks).unwrap().primitives.unwrap().source,
        None
    );
}

#[test]
fn duplicate_names_and_wrong_forward_targets_fail_without_inserting_nodes() {
    let mut s = scene();
    s.create(
        s.root,
        NodeKind::TickBar,
        json!({"elementReferences":{"primitiveSource":"slider"}}),
    )
    .unwrap();
    let count = s.nodes.len();
    assert!(s
        .create(s.root, NodeKind::Button, json!({"name":"slider"}))
        .is_err());
    assert_eq!(s.nodes.len(), count);
    let slider = s
        .create(s.root, NodeKind::Slider, json!({"name":"slider"}))
        .unwrap();
    assert!(s
        .create(s.root, NodeKind::Slider, json!({"name":"slider"}))
        .is_err());
    assert!(s
        .update(vec![Update {
            id: slider,
            patch: json!({"elementReferences":{"primitiveSource":"slider"}})
        }])
        .is_err());
    assert!(s.properties(slider).unwrap().element_references.is_empty());
}

#[test]
fn names_can_be_swapped_atomically_and_invalid_batches_leave_properties_unchanged() {
    let mut s = scene();
    let a = s
        .create(s.root, NodeKind::Slider, json!({"name":"a"}))
        .unwrap();
    let b = s
        .create(s.root, NodeKind::Slider, json!({"name":"b"}))
        .unwrap();
    let ticks = s
        .create(
            s.root,
            NodeKind::TickBar,
            json!({"elementReferences":{"primitiveSource":"a"}}),
        )
        .unwrap();
    s.snapshot();
    assert!(s
        .update(vec![Update {
            id: a,
            patch: json!({"name":"b","value":30})
        }])
        .is_err());
    assert_eq!(s.properties(a).unwrap().value, 0.);
    s.update(vec![
        Update {
            id: a,
            patch: json!({"name":"b"}),
        },
        Update {
            id: b,
            patch: json!({"name":"a"}),
        },
    ])
    .unwrap();
    s.snapshot();
    assert_eq!(
        s.properties(ticks).unwrap().primitives.unwrap().source,
        Some(b)
    );
}

#[test]
fn text_overflow_cycles_and_targets_inside_their_surface_are_rejected() {
    let mut s = scene();
    let first = s
        .create(
            s.root,
            NodeKind::RichTextBlockOverflow,
            json!({"name":"first","elementReferences":{"overflowContentTarget":"second"}}),
        )
        .unwrap();
    assert!(s
        .create(
            s.root,
            NodeKind::RichTextBlockOverflow,
            json!({"name":"second","elementReferences":{"overflowContentTarget":"first"}})
        )
        .is_err());
    let second = s
        .create(
            s.root,
            NodeKind::RichTextBlockOverflow,
            json!({"name":"second"}),
        )
        .unwrap();
    s.snapshot();
    assert_eq!(
        s.properties(first)
            .unwrap()
            .reading
            .unwrap()
            .overflow_content_target,
        Some(second)
    );
    let flyout = s
        .create(
            s.root,
            NodeKind::Flyout,
            json!({"elementReferences":{"placementTarget":"inside"}}),
        )
        .unwrap();
    assert!(s
        .create(flyout, NodeKind::Button, json!({"name":"inside"}))
        .is_err());
    let outside = s
        .create(s.root, NodeKind::Button, json!({"name":"inside"}))
        .unwrap();
    assert!(s.reparent(outside, flyout, None).is_err());
    s.create(
        s.root,
        NodeKind::UICommand,
        json!({"name":"command-a","elementReferences":{"command":"command-b"}}),
    )
    .unwrap();
    assert!(s
        .create(
            s.root,
            NodeKind::UICommand,
            json!({"name":"command-b","elementReferences":{"command":"command-a"}})
        )
        .is_err());
}

#[test]
fn named_commands_and_shared_flyouts_work_without_host_linking() {
    let mut s = scene();
    let button = s
        .create(
            s.root,
            NodeKind::Button,
            json!({"elementReferences":{"command":"save","flyoutTarget":"menu"}}),
        )
        .unwrap();
    let command = s
        .create(
            s.root,
            NodeKind::UICommand,
            json!({"name":"save","viewControls":{"label":"Save"}}),
        )
        .unwrap();
    let menu = s
        .create(s.root, NodeKind::MenuFlyout, json!({"name":"menu"}))
        .unwrap();
    s.input(Input::Invoke { id: button }, 0.).unwrap();
    assert_eq!(
        s.properties(button).unwrap().view_controls.unwrap().command,
        Some(command)
    );
    assert_eq!(s.properties(button).unwrap().flyout_target, Some(menu));
    assert!(s.properties(menu).unwrap().is_open);
}
