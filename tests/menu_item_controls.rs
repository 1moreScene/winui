use serde_json::json;
use winui_wasm::{
    enums::*,
    scene::{Input, Scene, Update},
    typography::{Font, Metrics, TextMeasurer},
};
fn take(s: &mut Scene) -> Vec<winui_wasm::scene::SceneEvent> {
    std::mem::take(&mut s.events)
}
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
fn frame(s: &mut Scene) {
    s.layout(&mut Measure);
}
fn make() -> (Scene, u32) {
    let mut s = Scene::new(Theme::Light, true);
    s.resize(800., 600., 1.25).unwrap();
    let root = s.root;
    let m = s
        .create(
            root,
            NodeKind::MenuFlyout,
            json!({"isOpen":true,"placementPosition":[20,20]}),
        )
        .unwrap();
    (s, m)
}
fn patch(s: &mut Scene, id: u32, v: serde_json::Value) {
    s.update(vec![Update { id, patch: v }]).unwrap();
}
fn invoke(s: &mut Scene, m: u32, index: usize) {
    s.input(Input::MenuInvoke { id: m, index }, 0.).unwrap();
}
#[test]
fn public_factories_project_all_five_kinds_and_preserve_handles() {
    let (mut s, m) = make();
    let a = s.menu_flyout_item(m, "Open").unwrap();
    let t = s.toggle_menu_flyout_item(m, "Toolbar", true).unwrap();
    let r = s.radio_menu_flyout_item(m, "Small", "size", true).unwrap();
    let sub = s.menu_flyout_sub_item(m, "More").unwrap();
    let line = s.menu_flyout_separator(m).unwrap();
    let c = s.menu_flyout_item(sub, "Nested").unwrap();
    frame(&mut s);
    let entries = &s.get(m).unwrap().props.menu_items;
    assert_eq!(entries.len(), 5);
    assert_eq!(
        entries.iter().map(|e| e.kind).collect::<Vec<_>>(),
        vec![
            MenuEntryKind::Command,
            MenuEntryKind::Toggle,
            MenuEntryKind::Radio,
            MenuEntryKind::Submenu,
            MenuEntryKind::Separator
        ]
    );
    assert_eq!(entries[3].items[0].source_node, Some(c));
    patch(&mut s, a, json!({"text":"Updated"}));
    patch(&mut s, t, json!({"isChecked":false}));
    frame(&mut s);
    assert_eq!(s.get(m).unwrap().props.menu_items[0].text, "Updated");
    assert!(!s.get(m).unwrap().props.menu_items[1].checked);
    assert!(s.get(r).unwrap().props.is_checked.unwrap());
    s.destroy(line).unwrap();
    frame(&mut s);
    assert_eq!(s.get(m).unwrap().props.menu_items.len(), 4);
    assert!(s.destroy(sub).unwrap().contains(&c));
    frame(&mut s);
    assert_eq!(s.get(m).unwrap().props.menu_items.len(), 3);
}
#[test]
fn toggles_update_rust_before_click_and_disabled_items_do_not_invoke() {
    let (mut s, m) = make();
    let t = s.toggle_menu_flyout_item(m, "Toggle", false).unwrap();
    frame(&mut s);
    take(&mut s);
    invoke(&mut s, m, 0);
    assert_eq!(s.properties(t).unwrap().is_checked, Some(true));
    let e = take(&mut s);
    let events = e
        .iter()
        .filter(|e| e.target == t)
        .map(|e| e.kind)
        .collect::<Vec<_>>();
    assert_eq!(
        events,
        vec![
            EventKind::IsCheckedChanged,
            EventKind::Checked,
            EventKind::Click
        ]
    );
    patch(&mut s, t, json!({"enabled":false}));
    patch(&mut s, m, json!({"isOpen":true}));
    frame(&mut s);
    take(&mut s);
    invoke(&mut s, m, 0);
    assert!(!take(&mut s)
        .iter()
        .any(|e| e.target == t && e.kind == EventKind::Click));
}
#[test]
fn radios_are_exclusive_across_menus_and_nested_groups_and_never_toggle_off() {
    let (mut s, m) = make();
    let a = s.radio_menu_flyout_item(m, "A", "shared", true).unwrap();
    let m2 = s.create(s.root, NodeKind::MenuFlyout, json!({})).unwrap();
    let sub = s.menu_flyout_sub_item(m2, "Sub").unwrap();
    let b = s.radio_menu_flyout_item(sub, "B", "shared", true).unwrap();
    assert_eq!(s.properties(a).unwrap().is_checked, Some(false));
    assert_eq!(s.properties(b).unwrap().is_checked, Some(true));
    patch(&mut s, a, json!({"isChecked":true}));
    assert_eq!(s.properties(b).unwrap().is_checked, Some(false));
    frame(&mut s);
    invoke(&mut s, m, 0);
    assert_eq!(s.properties(a).unwrap().is_checked, Some(true));
    patch(&mut s, a, json!({"isChecked":false}));
    assert_eq!(s.properties(a).unwrap().is_checked, Some(false));
    s.update(vec![
        Update {
            id: a,
            patch: json!({"isChecked":true}),
        },
        Update {
            id: b,
            patch: json!({"isChecked":true}),
        },
    ])
    .unwrap();
    assert_eq!(s.properties(a).unwrap().is_checked, Some(false));
    assert_eq!(s.properties(b).unwrap().is_checked, Some(true));
}
#[test]
fn child_ownership_validation_and_batches_are_atomic() {
    let (mut s, m) = make();
    assert!(s.menu_flyout_item(s.root, "No").is_err());
    let sub = s.menu_flyout_sub_item(m, "Sub").unwrap();
    assert!(s.create(sub, NodeKind::TextBlock, json!({})).is_err());
    let t = s.toggle_menu_flyout_item(m, "Toggle", false).unwrap();
    assert!(s
        .update(vec![
            Update {
                id: t,
                patch: json!({"text":"Bad"})
            },
            Update {
                id: t,
                patch: json!({"isChecked":null})
            }
        ])
        .is_err());
    assert_eq!(s.properties(t).unwrap().text, "Toggle");
    frame(&mut s);
    assert!(s
        .update(vec![Update {
            id: m,
            patch: json!({"menuItems":[{"id":"mix","text":"Mix"}]})
        }])
        .is_err());
    let data = s
        .create(
            s.root,
            NodeKind::MenuFlyout,
            json!({"menuItems":[{"id":"data","text":"Data"}]}),
        )
        .unwrap();
    assert!(s.menu_flyout_item(data, "Mix").is_err());
}
#[test]
fn nested_invocation_updates_source_and_removing_open_submenu_releases_presenter() {
    let (mut s, m) = make();
    let sub = s.menu_flyout_sub_item(m, "More").unwrap();
    let t = s.toggle_menu_flyout_item(sub, "Nested", false).unwrap();
    frame(&mut s);
    invoke(&mut s, m, 0);
    frame(&mut s);
    let nested = s
        .snapshot()
        .nodes
        .into_iter()
        .find(|n| n.kind == NodeKind::MenuFlyout && n.id != m)
        .unwrap()
        .id;
    invoke(&mut s, nested, 0);
    assert_eq!(s.properties(t).unwrap().is_checked, Some(true));
    patch(&mut s, m, json!({"isOpen":true}));
    frame(&mut s);
    invoke(&mut s, m, 0);
    frame(&mut s);
    s.destroy(sub).unwrap();
    frame(&mut s);
    assert!(s.get(nested).is_err());
    assert!(s.get(t).is_err());
    assert!(s.get(m).unwrap().props.menu_items.is_empty());
}
#[test]
fn hidden_items_are_excluded_and_separator_does_not_activate() {
    let (mut s, m) = make();
    let a = s.menu_flyout_item(m, "Hidden").unwrap();
    s.menu_flyout_separator(m).unwrap();
    let b = s.menu_flyout_item(m, "Visible").unwrap();
    patch(&mut s, a, json!({"visible":false}));
    frame(&mut s);
    take(&mut s);
    assert_eq!(s.get(m).unwrap().props.menu_items.len(), 2);
    invoke(&mut s, m, 0);
    assert!(!take(&mut s).iter().any(|e| e.kind == EventKind::Click));
    invoke(&mut s, m, 1);
    assert!(take(&mut s)
        .iter()
        .any(|e| e.target == b && e.kind == EventKind::Click));
}
#[test]
fn command_metadata_and_parameter_are_owned_and_executed_by_rust() {
    let (mut s, m) = make();
    let command = s
        .create(
            s.root,
            NodeKind::UICommand,
            json!({"viewControls":{"label":"Save command","description":"Save","canExecute":true}}),
        )
        .unwrap();
    let a = s
        .create(
            m,
            NodeKind::MenuFlyoutItem,
            json!({"viewControls":{"command":command,"commandParameter":{"value":42}}}),
        )
        .unwrap();
    frame(&mut s);
    assert_eq!(s.get(m).unwrap().props.menu_items[0].text, "Save command");
    take(&mut s);
    invoke(&mut s, m, 0);
    let e = take(&mut s);
    assert!(e
        .iter()
        .any(|e| e.target == a && e.kind == EventKind::Click));
    assert!(e
        .iter()
        .any(|e| e.target == command && e.kind == EventKind::CanExecuteRequested));
}
#[test]
fn standalone_accelerators_use_same_state_and_click_path() {
    let (mut s, m) = make();
    let t=s.create(m,NodeKind::ToggleMenuFlyoutItem,json!({"text":"Flag","menuItem":{"icon":"x","keyboardAccelerators":[{"key":"k","modifiers":["Control"]}]}})).unwrap();
    patch(&mut s, m, json!({"isOpen":false}));
    frame(&mut s);
    take(&mut s);
    s.input(
        Input::CommandAccelerator {
            key: "k".into(),
            control: true,
            shift: false,
            alt: false,
        },
        0.,
    )
    .unwrap();
    assert_eq!(s.properties(t).unwrap().is_checked, Some(true));
    assert!(take(&mut s)
        .iter()
        .any(|e| e.target == t && e.kind == EventKind::Click));
    patch(
        &mut s,
        t,
        json!({"menuItem":{"areCheckStatesEnabled":false}}),
    );
    assert_eq!(s.properties(t).unwrap().menu_item.unwrap().icon, "x");
}

#[test]
fn radio_and_toggle_icons_use_separate_native_glyph_columns() {
    use winui_wasm::render::Draw;
    let (mut s, m) = make();
    s.create(
        m,
        NodeKind::ToggleMenuFlyoutItem,
        json!({"text":"Toolbar","isChecked":true,"menuItem":{"icon":"\u{e74e}"}}),
    )
    .unwrap();
    s.radio_menu_flyout_item(m, "Portrait", "orientation", true)
        .unwrap();
    frame(&mut s);
    let draws = s.floating_display_list();
    let text_x = |value: &str| {
        draws
            .iter()
            .find_map(|d| match d {
                Draw::Text { text, x, .. } if text == value => Some(*x),
                _ => None,
            })
            .unwrap()
    };
    assert!(text_x("\u{e74e}") > text_x("\u{e73e}"));
    assert!(text_x("Toolbar") > text_x("\u{e74e}"));
    assert!(draws
        .iter()
        .any(|d| matches!(d,Draw::Text{text,..}if text=="\u{e915}")));
}

#[test]
fn source_focus_maps_to_presenter_and_reparent_retains_identity() {
    let (mut s, m) = make();
    let a = s.menu_flyout_item(m, "Open").unwrap();
    let second = s
        .create(
            s.root,
            NodeKind::MenuFlyout,
            json!({"isOpen":true,"placementPosition":[300,20]}),
        )
        .unwrap();
    s.reparent(a, second, None).unwrap();
    frame(&mut s);
    assert!(s.get(m).unwrap().props.menu_items.is_empty());
    assert_eq!(
        s.get(second).unwrap().props.menu_items[0].source_node,
        Some(a)
    );
    assert!(s.get(a).unwrap().rect.width > 0.);
    s.input(Input::Focus { id: a }, 0.).unwrap();
    let n = s
        .snapshot()
        .nodes
        .into_iter()
        .find(|n| n.id == second)
        .unwrap();
    assert!(n.focused);
    assert_eq!(n.overlay.unwrap().selected_index, Some(0));
}

#[test]
fn captions_use_native_size_order_and_do_not_share_the_label_clip() {
    use winui_wasm::render::Draw;
    let (mut s, m) = make();
    patch(&mut s, m, json!({"width":260}));
    s.create(m,NodeKind::MenuFlyoutItem,json!({"text":"A long document label which must remain inside its own column","menuItem":{"icon":"\u{e8e5}","keyboardAccelerators":[{"key":"o","modifiers":["Shift","Control"]}]}})).unwrap();
    s.toggle_menu_flyout_item(m, "Flag", true).unwrap();
    frame(&mut s);
    let snap = s.snapshot().nodes.into_iter().find(|n| n.id == m).unwrap();
    let parts = &snap.overlay.unwrap().menu_parts[0];
    assert!(parts.label.x + parts.label.width <= parts.shortcut.x);
    assert!(parts.label.width < 180.);
    assert!(s
        .floating_display_list()
        .iter()
        .any(|d| matches!(d,Draw::Text{text,size,..}if text=="Ctrl+Shift+O"&&*size==12.)));
}

#[test]
fn rtl_mirrors_template_slots_without_reversing_caption_text() {
    use winui_wasm::render::Draw;
    let (mut s, m) = make();
    patch(
        &mut s,
        m,
        json!({"flowDirection":"RightToLeft","width":280}),
    );
    s.create(m,NodeKind::ToggleMenuFlyoutItem,json!({"text":"Toolbar","isChecked":true,"menuItem":{"icon":"\u{e74e}","keyboardAccelerators":[{"key":"s","modifiers":["Control"]}]}})).unwrap();
    s.menu_flyout_sub_item(m, "Share").unwrap();
    frame(&mut s);
    let overlay = s
        .snapshot()
        .nodes
        .into_iter()
        .find(|n| n.id == m)
        .unwrap()
        .overlay
        .unwrap();
    let row = &overlay.menu_parts[0];
    assert!(row.check.x > row.icon.x);
    assert!(row.icon.x > row.label.x);
    assert!(row.shortcut.x + row.shortcut.width <= row.label.x);
    assert!(overlay.menu_parts[1].chevron.x < overlay.menu_parts[1].label.x);
    let draws = s.floating_display_list();
    assert!(draws
        .iter()
        .any(|d| matches!(d,Draw::Text{text,..}if text=="Ctrl+S")));
    assert!(draws
        .iter()
        .any(|d| matches!(d,Draw::Text{text,..}if text=="\u{e974}")));
    assert!(!draws
        .iter()
        .any(|d| matches!(d,Draw::Text{text,..}if text=="\u{e76c}")));
}

#[test]
fn normal_radio_and_submenu_glyphs_use_their_secondary_foreground() {
    use winui_wasm::render::Draw;
    let (mut s, m) = make();
    s.radio_menu_flyout_item(m, "Portrait", "g", true).unwrap();
    s.menu_flyout_sub_item(m, "Share").unwrap();
    frame(&mut s);
    let draws = s.floating_display_list();
    let color = |glyph: &str| {
        draws
            .iter()
            .find_map(|d| {
                if let Draw::Text { text, color, .. } = d {
                    (text == glyph).then_some(color.clone())
                } else {
                    None
                }
            })
            .unwrap()
    };
    assert_ne!(color("Portrait"), color("\u{e915}"));
    assert_eq!(color("\u{e915}"), color("\u{e974}"));
}

#[test]
fn caption_margin_contributes_to_row_measure_at_fractional_dpr() {
    let (mut s, m) = make();
    s.create(m,NodeKind::MenuFlyoutItem,json!({"text":"Open","menuItem":{"keyboardAccelerators":[{"key":"o","modifiers":["Control"]}]}})).unwrap();
    s.toggle_menu_flyout_item(m, "Flag", true).unwrap();
    frame(&mut s);
    let n = s.snapshot().nodes.into_iter().find(|n| n.id == m).unwrap();
    let rows = n.overlay.unwrap().rows;
    assert!(
        rows[0].height >= rows[1].height,
        "Caption top margin must participate in measure"
    );
    for pair in rows.windows(2) {
        assert!(
            (pair[1].y - pair[0].y - pair[0].height).abs() < 1e-7,
            "Rounded row heights must accumulate without a second rounding phase"
        );
    }
    for row in rows {
        assert!((row.height * 1.25 - (row.height * 1.25).round()).abs() < 1e-7);
    }
}
