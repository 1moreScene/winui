use serde_json::{json, Value};
use winui_wasm::{
    enums::*,
    render::Draw,
    scene::{Scene, Update},
    typography::{Font, Metrics, TextMeasurer},
};
struct Measure;
impl TextMeasurer for Measure {
    fn measure(&mut self, s: &str, f: &Font) -> Metrics {
        Metrics {
            width: s.chars().count() as f64 * f.size * 0.5,
            ascent: f.size,
            descent: f.size * 0.25,
            ..Default::default()
        }
    }
}
fn scene(props: Value) -> (Scene, u32) {
    let mut s = Scene::new(Theme::Light, true);
    s.resize(420., 320., 1.25).unwrap();
    let root = s.root;
    let id = s.create(root, NodeKind::RichEditBox, props).unwrap();
    (s, id)
}
fn send(s: &mut Scene, v: Value) {
    s.input(serde_json::from_value(v).unwrap(), 1.).unwrap();
}
fn command(s: &mut Scene, id: u32, c: Value) {
    send(s, json!({"kind":"richEdit","id":id,"command":c}));
}
fn select(s: &mut Scene, id: u32, start: usize, length: usize) {
    send(
        s,
        json!({"kind":"select","id":id,"start":start,"length":length,"backward":false}),
    );
}
fn doc(s: &Scene, id: u32) -> Value {
    serde_json::to_value(s.properties(id).unwrap().document.as_ref().unwrap()).unwrap()
}
#[test]
fn selection_formatting_preserves_unselected_runs_and_full_history() {
    let (mut s, id) = scene(json!({"text":"Hello world"}));
    select(&mut s, id, 6, 5);
    command(
        &mut s,
        id,
        json!({"action":"format","format":{"bold":true,"foreground":"#ff0000"}}),
    );
    assert_eq!(doc(&s, id)["runs"][0]["text"], "Hello ");
    assert_eq!(doc(&s, id)["runs"][1]["format"]["bold"], true);
    send(
        &mut s,
        json!({"kind":"editCommand","id":id,"command":"undo"}),
    );
    assert_eq!(doc(&s, id)["runs"].as_array().unwrap().len(), 1);
    send(
        &mut s,
        json!({"kind":"editCommand","id":id,"command":"redo"}),
    );
    assert_eq!(doc(&s, id)["runs"][1]["format"]["foreground"], "#ff0000");
    assert_eq!(s.properties(id).unwrap().text, "Hello world");
}
#[test]
fn collapsed_format_applies_only_to_inserted_text_and_survives_typing() {
    let (mut s, id) = scene(json!({"text":"ab"}));
    select(&mut s, id, 1, 0);
    command(&mut s, id, json!({"action":"toggleBold"}));
    command(&mut s, id, json!({"action":"replace","text":"🙂中"}));
    assert_eq!(s.properties(id).unwrap().text, "a🙂中b");
    assert_eq!(s.properties(id).unwrap().selection_start, 4);
    assert_eq!(doc(&s, id)["runs"][1]["format"]["bold"], true);
    assert!(doc(&s, id)["runs"][2]["format"]["bold"].is_null());
    send(
        &mut s,
        json!({"kind":"editCommand","id":id,"command":"undo"}),
    );
    assert_eq!(s.properties(id).unwrap().text, "ab");
}
#[test]
fn browser_edit_ime_and_deletion_keep_surrounding_formats() {
    let (mut s, id) = scene(
        json!({"document":{"runs":[{"text":"AAA","format":{"bold":true}},{"text":"BBB","format":{"italic":true}}]}}),
    );
    select(&mut s, id, 3, 0);
    for text in ["AAAzhBBB", "AAA中BBB"] {
        send(
            &mut s,
            json!({"kind":"editComposition","id":id,"text":text,"active":true,"start":4,"length":0}),
        );
        s.layout(&mut Measure);
        assert_eq!(s.properties(id).unwrap().text, "AAABBB");
    }
    send(
        &mut s,
        json!({"kind":"editComposition","id":id,"text":"AAA中BBB","active":false,"start":4,"length":0}),
    );
    assert_eq!(doc(&s, id)["runs"][0]["text"], "AAA中");
    assert_eq!(doc(&s, id)["runs"][1]["format"]["italic"], true);
    select(&mut s, id, 1, 3);
    command(&mut s, id, json!({"action":"replace","text":""}));
    assert_eq!(s.properties(id).unwrap().text, "ABBB");
    assert_eq!(doc(&s, id)["runs"][1]["format"]["italic"], true);
}
#[test]
fn repeated_text_insertion_uses_selection_not_an_ambiguous_diff() {
    let (mut s, id) = scene(
        json!({"document":{"runs":[{"text":"a","format":{"bold":true}},{"text":"aa","format":{"italic":true}}]}}),
    );
    select(&mut s, id, 1, 0);
    command(&mut s, id, json!({"action":"replace","text":"a"}));
    assert_eq!(doc(&s, id)["runs"][0]["text"], "aa");
    assert_eq!(doc(&s, id)["runs"][1]["text"], "aa");
}
#[test]
fn lists_follow_paragraph_split_merge_and_exclude_next_paragraph_boundary() {
    let (mut s, id) = scene(json!({"text":"one\ntwo\nthree"}));
    select(&mut s, id, 0, 4);
    command(
        &mut s,
        id,
        json!({"action":"paragraph","format":{"listStyle":"UpperRoman","alignment":"Center"}}),
    );
    assert_eq!(doc(&s, id)["paragraphs"][0]["listStyle"], "UpperRoman");
    assert_eq!(doc(&s, id)["paragraphs"][1]["listStyle"], "None");
    select(&mut s, id, 1, 0);
    command(&mut s, id, json!({"action":"replace","text":"\n"}));
    assert_eq!(doc(&s, id)["paragraphs"][1]["listStyle"], "UpperRoman");
    assert_eq!(doc(&s, id)["paragraphs"][2]["listStyle"], "None");
    select(&mut s, id, 1, 1);
    command(&mut s, id, json!({"action":"replace","text":""}));
    assert_eq!(doc(&s, id)["paragraphs"][1]["listStyle"], "None");
}
#[test]
fn variable_fonts_wrap_and_paint_with_real_styles_and_no_helper() {
    let (mut s, id) = scene(
        json!({"width":160,"height":140,"header":"Editor","document":{"runs":[{"text":"Small "},{"text":"Big text wraps here","format":{"fontSize":32,"italic":true,"underline":true,"foreground":"#ff0000"}}]}}),
    );
    send(&mut s, json!({"kind":"focus","id":id}));
    select(&mut s, id, 6, 0);
    s.layout(&mut Measure);
    let node = s.snapshot().nodes.into_iter().find(|n| n.id == id).unwrap();
    let editor = node.editor.unwrap();
    assert!(editor.caret.height >= 40.);
    assert!(!editor.clear_visible);
    assert!(editor.helper_button.is_none());
    let draws = s.display_list();
    assert!(draws.iter().any(|d|matches!(d,Draw::Text{size,style:FontStyle::Italic,color,..} if *size==32.&&color=="#ff0000")));
    assert!(draws
        .iter()
        .any(|d| matches!(d,Draw::Fill{rect,color,..} if rect.height<4.&&color=="#ff0000")));
}
#[test]
fn invalid_document_and_batches_are_atomic_and_unknown_features_rejected() {
    let (mut s, id) = scene(json!({"text":"original"}));
    assert!(s
        .update(vec![
            Update {
                id,
                patch: json!({"text":"changed"})
            },
            Update {
                id,
                patch: json!({"document":{"runs":[{"text":"bad","format":{"fontSize":-1}}]}})
            }
        ])
        .is_err());
    assert_eq!(s.properties(id).unwrap().text, "original");
    assert!(s
        .update(vec![Update {
            id,
            patch: json!({"document":{"runs":[],"mathML":"<math/>"}})
        }])
        .is_err());
    assert!(s
        .update(vec![Update {
            id,
            patch: json!({"text":"a","document":{"runs":[]}})
        }])
        .is_err());
    assert!(s
        .create(s.root, NodeKind::TextBox, json!({"document":{"runs":[]}}))
        .is_err());
}
#[test]
fn programmatic_document_change_invalidates_old_history_even_for_same_text() {
    let (mut s, id) = scene(json!({"text":"hello"}));
    select(&mut s, id, 0, 5);
    command(&mut s, id, json!({"action":"toggleBold"}));
    s.update(vec![Update {
        id,
        patch: json!({"document":{"runs":[{"text":"hello","format":{"italic":true}}]}}),
    }])
    .unwrap();
    s.layout(&mut Measure);
    assert!(
        !s.snapshot()
            .nodes
            .into_iter()
            .find(|n| n.id == id)
            .unwrap()
            .editor
            .unwrap()
            .can_undo
    );
}
#[test]
fn readonly_disabled_and_max_length_preserve_document() {
    let (mut s, id) = scene(json!({"text":"abc","maxLength":5}));
    select(&mut s, id, 1, 0);
    command(&mut s, id, json!({"action":"replace","text":"🙂🙂"}));
    assert_eq!(s.properties(id).unwrap().text, "a🙂bc");
    s.update(vec![Update {
        id,
        patch: json!({"isReadOnly":true}),
    }])
    .unwrap();
    let before = doc(&s, id);
    command(&mut s, id, json!({"action":"toggleBold"}));
    command(&mut s, id, json!({"action":"replace","text":"bad"}));
    assert_eq!(doc(&s, id), before);
    s.update(vec![Update {
        id,
        patch: json!({"isReadOnly":false,"enabled":false}),
    }])
    .unwrap();
    command(&mut s, id, json!({"action":"toggleBold"}));
    assert_eq!(doc(&s, id), before);
}
#[test]
fn formatting_text_events_include_immutable_document_and_lifecycle_rejects_destroyed() {
    let (mut s, id) = scene(json!({"text":"hello"}));
    s.snapshot();
    select(&mut s, id, 0, 5);
    command(&mut s, id, json!({"action":"toggleBold"}));
    command(&mut s, id, json!({"action":"toggleItalic"}));
    let events = s
        .snapshot()
        .events
        .into_iter()
        .filter(|e| e.kind == EventKind::TextChanged)
        .collect::<Vec<_>>();
    assert_eq!(events.len(), 2);
    assert_eq!(
        events[0].payload.as_ref().unwrap()["document"]["runs"][0]["format"]["bold"],
        true
    );
    assert!(
        events[0].payload.as_ref().unwrap()["document"]["runs"][0]["format"]["italic"].is_null()
    );
    s.destroy(id).unwrap();
    assert!(s
        .input(
            serde_json::from_value(
                json!({"kind":"richEdit","id":id,"command":{"action":"toggleBold"}})
            )
            .unwrap(),
            2.
        )
        .is_err());
}
#[test]
fn rich_navigation_uses_wrapped_font_geometry_and_wheel_does_not_snap_back() {
    let (mut s, id) = scene(
        json!({"width":100,"height":65,"text":"one two three four five six seven eight nine ten"}),
    );
    s.layout(&mut Measure);
    select(&mut s, id, 0, 0);
    command(&mut s, id, json!({"action":"navigate","key":"ArrowDown"}));
    assert!(s.properties(id).unwrap().selection_start > 0);
    command(
        &mut s,
        id,
        json!({"action":"navigate","key":"End","control":true}),
    );
    assert_eq!(s.properties(id).unwrap().selection_start, 48);
    s.layout(&mut Measure);
    command(&mut s, id, json!({"action":"scroll","x":0,"y":-1000}));
    s.layout(&mut Measure);
    assert_eq!(
        s.snapshot()
            .nodes
            .into_iter()
            .find(|n| n.id == id)
            .unwrap()
            .editor
            .unwrap()
            .scroll_y,
        0.
    );
    command(
        &mut s,
        id,
        json!({"action":"navigate","key":"Home","control":true}),
    );
    s.layout(&mut Measure);
    assert_eq!(s.properties(id).unwrap().selection_start, 0);
}
#[test]
fn no_op_host_input_preserves_mixed_format_and_initial_typing_inherits_document() {
    let (mut s, id) = scene(
        json!({"document":{"runs":[{"text":"a","format":{"bold":true}},{"text":"b","format":{"italic":true}}]}}),
    );
    command(&mut s, id, json!({"action":"replace","text":"X"}));
    assert_eq!(doc(&s, id)["runs"][0]["text"], "Xa");
    select(&mut s, id, 0, 3);
    let before = doc(&s, id);
    send(
        &mut s,
        json!({"kind":"edit","id":id,"text":"Xab","start":0,"length":3,"inputType":"insertText"}),
    );
    assert_eq!(doc(&s, id), before);
}

#[test]
fn toggle_resolves_inherited_font_and_paragraph_updates_preserve_other_fields() {
    let (mut s, id) = scene(json!({"text":"hello","fontWeight":700,"fontStyle":"Italic"}));
    select(&mut s, id, 0, 5);
    command(&mut s, id, json!({"action":"toggleBold"}));
    command(&mut s, id, json!({"action":"toggleItalic"}));
    assert_eq!(doc(&s, id)["runs"][0]["format"]["bold"], false);
    assert_eq!(doc(&s, id)["runs"][0]["format"]["italic"], false);
    command(
        &mut s,
        id,
        json!({"action":"paragraph","format":{"listStyle":"Bullet"}}),
    );
    command(
        &mut s,
        id,
        json!({"action":"paragraph","format":{"alignment":"Right"}}),
    );
    assert_eq!(doc(&s, id)["paragraphs"][0]["listStyle"], "Bullet");
    assert_eq!(doc(&s, id)["paragraphs"][0]["alignment"], "Right");
}

#[test]
fn high_contrast_selection_uses_system_text_and_one_continuous_fill() {
    let mut s = Scene::new(Theme::HighContrast, true);
    s.resize(300., 140., 1.25).unwrap();
    let id = s
        .create(
            s.root,
            NodeKind::RichEditBox,
            json!({"text":"Selected","width":240,"height":100}),
        )
        .unwrap();
    select(&mut s, id, 0, 8);
    send(&mut s, json!({"kind":"focus","id":id}));
    s.layout(&mut Measure);
    let draws = s.display_list();
    assert_eq!(
        draws
            .iter()
            .filter(|d| matches!(d,Draw::Text{color,..} if winui_wasm::material::rgba(color)==[0.,0.,0.,1.]))
            .count(),
        8
    );
    assert_eq!(
        draws
            .iter()
            .filter(|d| matches!(d,Draw::Fill{color,rect,..} if color.eq_ignore_ascii_case("#ffff00ff")&&rect.height>10.))
            .count(),
        1
    );
}
