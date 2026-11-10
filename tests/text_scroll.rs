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
            descent: font.size * 0.3,
            ..Default::default()
        }
    }
}
fn frame(s: &mut Scene, time: f64) {
    s.advance(time);
    s.layout(&mut Measure);
    s.display_list();
}
fn patch(s: &mut Scene, id: u32, p: serde_json::Value) {
    s.update(vec![Update { id, patch: p }]).unwrap();
}
fn edit(s: &mut Scene, id: u32, text: &str, time: f64) {
    s.input(
        Input::Edit {
            id,
            text: text.into(),
            start: text.encode_utf16().count(),
            length: 0,
            input_type: "insertText".into(),
        },
        time,
    )
    .unwrap();
}
#[test]
fn editor_unicode_history_readonly_and_immutable_events() {
    let mut s = Scene::new(Theme::Light, true);
    s.resize(400., 120., 1.).unwrap();
    let id = s
        .create(s.root, NodeKind::TextBox, json!({"header":"Name"}))
        .unwrap();
    frame(&mut s, 0.);
    s.snapshot();
    edit(&mut s, id, "A", 1.);
    edit(&mut s, id, "A🙂", 2.);
    edit(&mut s, id, "A🙂中", 3.);
    assert_eq!(s.properties(id).unwrap().text, "A🙂中");
    let events = s.snapshot().events;
    assert_eq!(
        events
            .iter()
            .filter(|e| e.kind == EventKind::TextChanged)
            .map(|e| e.text.as_deref().unwrap())
            .collect::<Vec<_>>(),
        ["A", "A🙂", "A🙂中"]
    );
    s.input(
        Input::EditCommand {
            id,
            command: "undo".into(),
        },
        4.,
    )
    .unwrap();
    assert_eq!(s.properties(id).unwrap().text, "");
    s.input(
        Input::EditCommand {
            id,
            command: "redo".into(),
        },
        5.,
    )
    .unwrap();
    assert_eq!(s.properties(id).unwrap().text, "A🙂中");
    s.input(
        Input::Select {
            backward: false,
            id,
            start: 2,
            length: 100,
        },
        6.,
    )
    .unwrap();
    let p = s.properties(id).unwrap();
    assert_eq!((p.selection_start, p.selection_length), (1, 3));
    patch(&mut s, id, json!({"isReadOnly":true}));
    edit(&mut s, id, "bad", 7.);
    assert_eq!(s.properties(id).unwrap().text, "A🙂中");
    assert!(s
        .update(vec![
            Update {
                id,
                patch: json!({"text":"rollback"})
            },
            Update {
                id,
                patch: json!({"maxLength":-1})
            }
        ])
        .is_err());
    assert_eq!(s.properties(id).unwrap().text, "A🙂中");
}
#[test]
fn editor_ime_commits_once_and_masked_password_uses_own_events() {
    let mut s = Scene::new(Theme::Light, true);
    s.resize(400., 160., 1.).unwrap();
    let id = s.create(s.root, NodeKind::TextBox, json!({})).unwrap();
    for value in ["z", "zh", "中"] {
        s.input(
            Input::EditComposition {
                id,
                text: value.into(),
                active: true,
                start: value.encode_utf16().count(),
                length: 0,
            },
            1.,
        )
        .unwrap();
        frame(&mut s, 1.);
        assert_eq!(s.properties(id).unwrap().text, "");
    }
    s.input(
        Input::EditComposition {
            id,
            text: "中".into(),
            active: false,
            start: 1,
            length: 0,
        },
        2.,
    )
    .unwrap();
    assert_eq!(
        s.snapshot()
            .events
            .iter()
            .filter(|e| e.kind == EventKind::TextChanged)
            .count(),
        1
    );
    let pwd = s
        .create(s.root, NodeKind::PasswordBox, json!({"passwordChar":"#"}))
        .unwrap();
    edit(&mut s, pwd, "secret", 3.);
    frame(&mut s, 3.);
    let draws = serde_json::to_string(&s.display_list()).unwrap();
    assert!(!draws.contains("secret"));
    assert!(draws.contains("######"));
    assert!(s
        .snapshot()
        .events
        .iter()
        .any(|e| e.kind == EventKind::PasswordChanged && e.text.is_none()));
    patch(&mut s, pwd, json!({"passwordRevealMode":"Visible"}));
    frame(&mut s, 4.);
    assert!(serde_json::to_string(&s.display_list())
        .unwrap()
        .contains("secret"));
}
#[test]
fn scrolling_measure_clamp_wheel_ownership_and_transformed_children() {
    let mut s = Scene::new(Theme::Light, true);
    s.resize(500., 400., 1.).unwrap();
    let outer = s
        .create(
            s.root,
            NodeKind::ScrollViewer,
            json!({"width":300,"height":200,"horizontalScrollBarVisibility":"Auto","horizontalAlignment":"Left","verticalAlignment":"Top"}),
        )
        .unwrap();
    let stack = s
        .create(
            outer,
            NodeKind::StackPanel,
            json!({"height":800,"width":600}),
        )
        .unwrap();
    let inner = s
        .create(
            stack,
            NodeKind::ScrollViewer,
            json!({"height":100,"width":250,"horizontalAlignment":"Left","verticalAlignment":"Top"}),
        )
        .unwrap();
    s.create(inner, NodeKind::Grid, json!({"height":300}))
        .unwrap();
    frame(&mut s, 0.);
    assert!(s.wheel(20., 20., 0., 500., false).unwrap());
    frame(&mut s, 1000.);
    assert_eq!(
        s.snapshot()
            .nodes
            .into_iter()
            .find(|n| n.id == inner)
            .unwrap()
            .scroll
            .unwrap()
            .vertical_offset,
        200.
    );
    assert!(s.wheel(20., 20., 0., 500., false).unwrap());
    frame(&mut s, 2000.);
    assert_eq!(s.properties(outer).unwrap().vertical_offset, 0.);
    assert_eq!(s.properties(inner).unwrap().vertical_offset, 200.);
    assert_eq!(s.get(inner).unwrap().world.0[5], 0.);
    assert!(s.create(outer, NodeKind::Grid, json!({})).is_err());
    s.input(
        Input::Scroll {
            id: outer,
            x: None,
            y: None,
            zoom: Some(2.),
            animated: false,
        },
        2001.,
    )
    .unwrap();
    frame(&mut s, 2001.);
    assert_eq!(s.get(inner).unwrap().world.0[0], 2.);
}
#[test]
fn editor_paste_limit_preserves_suffix_and_composition_keeps_logical_selection() {
    let mut s = Scene::new(Theme::Light, true);
    s.resize(300., 80., 1.).unwrap();
    let id = s
        .create(
            s.root,
            NodeKind::TextBox,
            json!({"text":"abcd","maxLength":8,"selectionStart":2}),
        )
        .unwrap();
    frame(&mut s, 0.);
    s.input(
        Input::Edit {
            id,
            text: "ab🙂中xyzcd".into(),
            start: 8,
            length: 0,
            input_type: "insertFromPaste".into(),
        },
        1.,
    )
    .unwrap();
    assert_eq!(s.properties(id).unwrap().text, "ab🙂中xcd");
    s.input(
        Input::Select {
            id,
            start: 1,
            length: 4,
            backward: true,
        },
        2.,
    )
    .unwrap();
    frame(&mut s, 2.);
    let n = s.snapshot().nodes.into_iter().find(|n| n.id == id).unwrap();
    assert!(n.editor.unwrap().backward);
    s.input(
        Input::EditComposition {
            id,
            text: "draft".into(),
            active: true,
            start: 5,
            length: 0,
        },
        3.,
    )
    .unwrap();
    assert_eq!(s.properties(id).unwrap().selection_start, 1);
    assert_eq!(s.properties(id).unwrap().text, "ab🙂中xcd");
    patch(&mut s, id, json!({"text":"server"}));
    frame(&mut s, 4.);
    assert!(!serde_json::to_string(&s.display_list())
        .unwrap()
        .contains("draft"));
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
fn scroll_native_zoom_extent_and_interruption_stay_bounded() {
    let mut s = Scene::new(Theme::Light, false);
    s.resize(400., 266., 1.).unwrap();
    let id=s.create(s.root,NodeKind::ScrollViewer,json!({"width":400,"height":266,"zoomMode":"Enabled","horizontalScrollBarVisibility":"Auto"})).unwrap();
    let content = s
        .create(id, NodeKind::Grid, json!({"width":1000,"height":800}))
        .unwrap();
    frame(&mut s, 0.);
    s.input(
        Input::Scroll {
            id,
            x: Some(0.),
            y: Some(400.),
            zoom: None,
            animated: true,
        },
        1.,
    )
    .unwrap();
    frame(&mut s, 100.);
    let a = s
        .snapshot()
        .nodes
        .into_iter()
        .find(|n| n.id == id)
        .unwrap()
        .scroll
        .unwrap()
        .vertical_offset;
    assert!(a > 0. && a < 400.);
    s.input(
        Input::Scroll {
            id,
            x: None,
            y: Some(0.),
            zoom: None,
            animated: true,
        },
        100.,
    )
    .unwrap();
    let b = s
        .snapshot()
        .nodes
        .into_iter()
        .find(|n| n.id == id)
        .unwrap()
        .scroll
        .unwrap()
        .vertical_offset;
    assert!((a - b).abs() < 1e-8);
    frame(&mut s, 2000.);
    assert_eq!(s.properties(id).unwrap().vertical_offset, 0.);
    patch(&mut s, id, json!({"zoomFactor":2,"verticalOffset":500}));
    frame(&mut s, 2001.);
    let v = s
        .snapshot()
        .nodes
        .into_iter()
        .find(|n| n.id == id)
        .unwrap()
        .scroll
        .unwrap();
    assert_eq!(
        (v.extent_width, v.extent_height, v.scrollable_height),
        (2000., 1600., 1334.)
    );
    assert_eq!(v.vertical_offset, 500.);
    patch(&mut s, content, json!({"height":100}));
    frame(&mut s, 2002.);
    assert_eq!(s.properties(id).unwrap().vertical_offset, 0.);
    let second = s.create(s.root, NodeKind::Grid, json!({})).unwrap();
    assert!(s.reparent(second, id, None).is_err());
}
#[test]
fn touch_pan_pinch_and_cancel_keep_view_in_rust() {
    let mut s = Scene::new(Theme::Light, true);
    s.resize(400., 266., 1.).unwrap();
    let id = s
        .create(
            s.root,
            NodeKind::ScrollViewer,
            json!({"zoomMode":"Enabled","horizontalScrollBarVisibility":"Auto"}),
        )
        .unwrap();
    s.create(id, NodeKind::Grid, json!({"width":1000,"height":800}))
        .unwrap();
    frame(&mut s, 0.);
    for (phase, pointer, x, y) in [
        ("down", 1, 100., 150.),
        ("move", 1, 80., 50.),
        ("down", 2, 180., 50.),
        ("move", 2, 280., 50.),
    ] {
        s.input(
            Input::Touch {
                phase: phase.into(),
                pointer,
                x,
                y,
            },
            1.,
        )
        .unwrap();
        frame(&mut s, 1.);
    }
    let v = s
        .snapshot()
        .nodes
        .into_iter()
        .find(|n| n.id == id)
        .unwrap()
        .scroll
        .unwrap();
    assert_eq!(v.zoom_factor, 2.);
    assert!(v.is_intermediate);
    assert!(v.vertical_offset > 100.);
    for pointer in [1, 2] {
        s.input(
            Input::Touch {
                phase: "cancel".into(),
                pointer,
                x: 0.,
                y: 0.,
            },
            2.,
        )
        .unwrap();
    }
    frame(&mut s, 2.);
    assert!(
        !s.snapshot()
            .nodes
            .into_iter()
            .find(|n| n.id == id)
            .unwrap()
            .scroll
            .unwrap()
            .is_intermediate
    );
}
#[test]
fn natural_text_slots_reserve_pixel_rounding_through_nested_panels() {
    struct Fractional;
    impl TextMeasurer for Fractional {
        fn measure(&mut self, text: &str, font: &Font) -> Metrics {
            Metrics {
                width: text.chars().count() as f64 * 7.015,
                ascent: font.size,
                descent: font.size * 0.3,
                ..Default::default()
            }
        }
    }
    for dpr in [1., 1.25, 1.5, 2.] {
        let mut s = Scene::new(Theme::Light, true);
        s.resize(900., 160., dpr).unwrap();
        let row = s
            .create(
                s.root,
                NodeKind::StackPanel,
                json!({"orientation":"Horizontal","horizontalAlignment":"Left"}),
            )
            .unwrap();
        s.create(row, NodeKind::PasswordBox, json!({"width":250}))
            .unwrap();
        let mut ids = vec![];
        for kind in [
            NodeKind::CheckBox,
            NodeKind::Button,
            NodeKind::RadioButton,
            NodeKind::TextBlock,
        ] {
            ids.push(
                s.create(row, kind, json!({"text":"Show password"}))
                    .unwrap(),
            );
        }
        s.layout(&mut Fractional);
        let snapshot = s.snapshot();
        for id in ids {
            let n = snapshot.nodes.iter().find(|n| n.id == id).unwrap();
            assert_eq!(n.text.lines.len(), 1, "{:?} at {dpr}", n.kind);
            assert!(n.rect.width + 1e-8 >= n.desired[0]);
            assert!(n.rect.height >= n.text.height);
        }
    }
}
#[test]
fn hosted_scroll_surface_has_no_content_tree_and_only_bar_hit_regions() {
    use winui_wasm::scene::HostScrollMetrics;
    let mut s = Scene::new(Theme::Light, true);
    s.resize(800., 600., 1.).unwrap();
    let small=s.create(s.root,NodeKind::ScrollViewer,json!({"width":300,"height":200,"horizontalAlignment":"Left","verticalAlignment":"Top","horizontalScrollBarVisibility":"Auto"})).unwrap();
    let metrics = HostScrollMetrics {
        occlusions: vec![],
        viewport_width: 300.,
        viewport_height: 200.,
        extent_width: 800.,
        extent_height: 1000.,
        horizontal_offset: 0.,
        vertical_offset: 300.,
    };
    s.set_scroll_host(small, metrics.clone()).unwrap();
    let root = s
        .create(
            s.root,
            NodeKind::ScrollViewer,
            json!({"horizontalScrollBarVisibility":"Auto"}),
        )
        .unwrap();
    s.set_scroll_host(
        root,
        HostScrollMetrics {
            occlusions: vec![],
            viewport_width: 800.,
            viewport_height: 600.,
            extent_width: 800.,
            extent_height: 1200.,
            horizontal_offset: 0.,
            vertical_offset: 0.,
        },
    )
    .unwrap();
    frame(&mut s, 0.);
    s.snapshot();
    assert_eq!(s.hit(50., 50.), None);
    assert_eq!(s.hit(294., 70.), Some(small));
    assert!(s.create(small, NodeKind::Grid, json!({})).is_err());
    s.input(
        Input::Down {
            x: 294.,
            y: 70.,
            pointer: 1,
        },
        1.,
    )
    .unwrap();
    s.input(
        Input::Move {
            x: 294.,
            y: 170.,
            pointer: 1,
        },
        2.,
    )
    .unwrap();
    s.input(
        Input::Up {
            x: 294.,
            y: 170.,
            pointer: 1,
        },
        3.,
    )
    .unwrap();
    frame(&mut s, 3.);
    assert!(s.properties(small).unwrap().vertical_offset > 700.);
    let before = s.properties(small).unwrap().vertical_offset;
    assert!(s
        .set_scroll_host(
            small,
            HostScrollMetrics {
                vertical_offset: f64::NAN,
                ..metrics.clone()
            }
        )
        .is_err());
    assert_eq!(s.properties(small).unwrap().vertical_offset, before);
    assert!(s
        .input(
            Input::Scroll {
                id: small,
                x: None,
                y: None,
                zoom: Some(2.),
                animated: false
            },
            4.
        )
        .is_err());
    s.snapshot();
    s.set_scroll_host(small, metrics.clone()).unwrap();
    assert!(!s
        .snapshot()
        .events
        .iter()
        .any(|e| e.kind == EventKind::ViewChanged));
    s.input(
        Input::Down {
            x: 294.,
            y: 190.,
            pointer: 1,
        },
        6.,
    )
    .unwrap();
    let stopped = s.properties(small).unwrap().vertical_offset;
    s.input(Input::Blur, 7.).unwrap();
    frame(&mut s, 1000.);
    assert_eq!(s.properties(small).unwrap().vertical_offset, stopped);
    assert!(s.snapshot().captured.is_none());
    s.set_scroll_host(
        small,
        HostScrollMetrics {
            occlusions: vec![winui_wasm::model::Rect::new(280., 0., 20., 150.)],
            ..metrics
        },
    )
    .unwrap();
    frame(&mut s, 5.);
    assert_eq!(s.hit(294., 70.), None);
    assert_eq!(s.hit(294., 180.), Some(small));
}
#[test]
fn editor_inner_helper_geometry_and_focus_band_follow_native_size_and_pixel_rounding() {
    for kind in [NodeKind::TextBox, NodeKind::PasswordBox] {
        for height in [32., 80.] {
            for dpr in [1., 1.25, 1.5, 2.] {
                let mut s = Scene::new(Theme::Light, true);
                s.resize(300., 100., dpr).unwrap();
                let id=s.create(s.root,kind,json!({"width":250,"height":height,"horizontalAlignment":"Left","verticalAlignment":"Top"})).unwrap();
                edit(&mut s, id, "secret", 0.);
                s.input(Input::Focus { id }, 0.).unwrap();
                frame(&mut s, 0.);
                let n = s.snapshot().nodes.into_iter().find(|n| n.id == id).unwrap();
                let e = n.editor.unwrap();
                let button = e.helper_button.unwrap();
                let mask = e.helper_mask.unwrap();
                assert_eq!((button.width, button.height), (height, height));
                assert_eq!((mask.width, mask.height), (height - 6., height - 10.));
                assert!(s.display_list().iter().any(|command|matches!(command,winui_wasm::render::Draw::Fill{rect,..} if (rect.height-(2.*dpr).round()/dpr).abs()<1e-8 && rect.width==n.rect.width && (rect.y+rect.height-n.rect.height).abs()<1e-8)));
            }
        }
    }
}
