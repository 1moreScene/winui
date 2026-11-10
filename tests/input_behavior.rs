use serde_json::json;
use winui_wasm::{
    enums::*,
    scene::{HostScrollMetrics, Input, Scene, Update},
    typography::{Font, Metrics, TextMeasurer},
};

struct Measure;
impl TextMeasurer for Measure {
    fn measure(&mut self, text: &str, font: &Font) -> Metrics {
        Metrics {
            width: text.chars().count() as f64 * font.size * 0.5,
            ascent: font.size * 0.8,
            descent: font.size * 0.2,
            ..Default::default()
        }
    }
}
fn frame(s: &mut Scene, time: f64) {
    s.advance(time);
    s.layout(&mut Measure);
}

#[test]
fn boundary_wheel_preserves_inflight_motion_without_duplicate_view_events() {
    let mut s = Scene::new(Theme::Light, false);
    s.resize(300., 300., 1.).unwrap();
    let id = s
        .create(
            s.root,
            NodeKind::ScrollViewer,
            json!({"width":200,"height":200}),
        )
        .unwrap();
    s.create(id, NodeKind::Grid, json!({"height":700})).unwrap();
    frame(&mut s, 0.);
    assert!(s.wheel(100., 100., 0., 10000., false).unwrap());
    frame(&mut s, 100.);
    let expected = s.nodes[&id].scroll.y.value(200.);
    s.snapshot();
    assert!(s.wheel(100., 100., 0., 100., false).unwrap());
    assert_eq!(s.nodes[&id].scroll.y.value(200.), expected);
    assert!(!s
        .snapshot()
        .events
        .iter()
        .any(|e| e.kind == EventKind::ViewChanged));
    frame(&mut s, 1000.);
    assert_eq!(s.properties(id).unwrap().vertical_offset, 500.);
}
fn patch(s: &mut Scene, id: u32, patch: serde_json::Value) {
    s.update(vec![Update { id, patch }]).unwrap();
}

#[test]
fn combobox_selection_part_uses_owner_mode_instead_of_readonly_textbox_semantics() {
    let mut s = Scene::new(Theme::Light, true);
    s.resize(600., 600., 1.).unwrap();
    let stack = s.create(s.root, NodeKind::StackPanel, json!({})).unwrap();
    let combo = s
        .create(
            stack,
            NodeKind::ComboBox,
            json!({"width":240,"selectedIndex":0,
        "collectionItems":[{"id":"a","text":"Arial"}]}),
        )
        .unwrap();
    let readonly = s
        .create(
            stack,
            NodeKind::TextBox,
            json!({"isReadOnly":true,"text":"Copyable"}),
        )
        .unwrap();
    for editable in [false, true, false, true] {
        patch(&mut s, combo, json!({"isEditable":editable}));
        frame(&mut s, 0.);
        let snap = s.snapshot();
        let input = snap
            .nodes
            .iter()
            .find(|n| n.kind == NodeKind::TextBox && n.composed_owner == Some(combo))
            .unwrap();
        assert_eq!(
            input.pointer.editor_cursor,
            if editable { "text" } else { "default" }
        );
        assert_eq!(
            input.pointer.editor_text_selection,
            if editable { "text" } else { "none" }
        );
        let normal = snap.nodes.iter().find(|n| n.id == readonly).unwrap();
        assert_eq!(
            (
                normal.pointer.editor_cursor,
                normal.pointer.editor_text_selection
            ),
            ("text", "text")
        );
    }
    for kind in [NodeKind::AutoSuggestBox, NodeKind::NumberBox] {
        let owner = s
            .create(stack, kind, json!({"isReadOnly":true,"width":240}))
            .unwrap();
        frame(&mut s, 0.);
        let snap = s.snapshot();
        let input = snap
            .nodes
            .iter()
            .find(|n| n.kind == NodeKind::TextBox && n.composed_owner == Some(owner))
            .unwrap();
        assert_eq!(
            (
                input.pointer.editor_cursor,
                input.pointer.editor_text_selection
            ),
            ("text", "text")
        );
    }
    patch(&mut s, stack, json!({"enabled":false}));
    frame(&mut s, 0.);
    for n in s
        .snapshot()
        .nodes
        .iter()
        .filter(|n| n.kind == NodeKind::TextBox)
    {
        assert_eq!(
            (n.pointer.editor_cursor, n.pointer.editor_text_selection),
            ("default", "none")
        );
    }
}

#[test]
fn wheel_stays_with_scrollable_owner_at_both_limits_on_each_axis() {
    for kind in [
        NodeKind::ScrollViewer,
        NodeKind::ScrollView,
        NodeKind::ScrollContentPresenter,
    ] {
        let mut s = Scene::new(Theme::Light, true);
        s.resize(400., 400., 1.).unwrap();
        let outer = s
            .create(
                s.root,
                NodeKind::ScrollViewer,
                json!({"width":300,"height":300,"horizontalScrollBarVisibility":"Auto"}),
            )
            .unwrap();
        let content = s
            .create(outer, NodeKind::Grid, json!({"width":900,"height":900}))
            .unwrap();
        let inner = s.create(content, kind,
            json!({"width":200,"height":200,"horizontalScrollMode":"Enabled","verticalScrollMode":"Enabled","horizontalScrollBarVisibility":"Auto","horizontalAlignment":"Left","verticalAlignment":"Top"})).unwrap();
        s.create(inner, NodeKind::Grid, json!({"width":600,"height":700}))
            .unwrap();
        frame(&mut s, 0.);
        for (dx, dy) in [
            (-100., 0.),
            (0., -100.),
            (1000., 0.),
            (100., 0.),
            (0., 1000.),
            (0., 100.),
        ] {
            assert!(
                s.wheel(100., 100., dx, dy, false).unwrap(),
                "{kind:?} {dx} {dy}"
            );
            assert_eq!(
                s.properties(outer).unwrap().horizontal_offset,
                0.,
                "{kind:?}"
            );
            assert_eq!(s.properties(outer).unwrap().vertical_offset, 0., "{kind:?}");
        }
        assert_eq!(s.properties(inner).unwrap().horizontal_offset, 400.);
        assert_eq!(s.properties(inner).unwrap().vertical_offset, 500.);
        // Chaining properties must not change mouse-wheel ownership.
        patch(
            &mut s,
            inner,
            json!({"isHorizontalScrollChainingEnabled":false,"isVerticalScrollChainingEnabled":false}),
        );
        assert!(s.wheel(100., 100., 100., 100., false).unwrap());
        assert_eq!(s.properties(outer).unwrap().vertical_offset, 0.);
    }
}

#[test]
fn horizontal_only_hidden_viewer_routes_vertical_wheel_and_retains_ownership() {
    let mut s = Scene::new(Theme::Light, true);
    s.resize(400., 400., 1.).unwrap();
    let outer = s.create(s.root, NodeKind::ScrollViewer,
        json!({"width":300,"height":300})).unwrap();
    let content = s.create(outer, NodeKind::Grid, json!({"height":900})).unwrap();
    let inner = s.create(content, NodeKind::ScrollViewer,
        json!({"width":200,"height":100,"verticalAlignment":"Top",
            "horizontalScrollBarVisibility":"Hidden","horizontalScrollMode":"Enabled",
            "verticalScrollBarVisibility":"Hidden","verticalScrollMode":"Disabled"})).unwrap();
    let items = s.create(inner, NodeKind::Grid, json!({"width":800,"height":100})).unwrap();
    frame(&mut s, 0.);
    for (dx, dy, expected) in [(0., 120., 120.), (40., 80., 160.),
        (0., 10000., 600.), (0., 120., 600.), (0., -10000., 0.), (0., -120., 0.)] {
        assert!(s.wheel(100., 50., dx, dy, false).unwrap());
        assert_eq!(s.properties(inner).unwrap().horizontal_offset, expected);
        assert_eq!(s.properties(inner).unwrap().vertical_offset, 0.);
        assert_eq!(s.properties(outer).unwrap().vertical_offset, 0.);
    }
    assert!(!s.wheel(100., 50., 0., 120., true).unwrap());
    let scroll = s.snapshot().nodes.into_iter().find(|n| n.id == inner).unwrap().scroll.unwrap();
    assert!(scroll.horizontal_thumb.is_none() && scroll.vertical_thumb.is_none());
    // An empty row must give the vertical wheel back to the surrounding page.
    patch(&mut s, items, json!({"width":100}));
    frame(&mut s, 1.);
    assert!(s.wheel(100., 50., 0., 120., false).unwrap());
    assert_eq!(s.properties(outer).unwrap().vertical_offset, 120.);
}

#[test]
fn empty_or_disabled_axes_bubble_but_ctrl_wheel_never_scrolls() {
    let mut s = Scene::new(Theme::Light, true);
    s.resize(400., 400., 1.).unwrap();
    let outer = s
        .create(
            s.root,
            NodeKind::ScrollViewer,
            json!({"width":300,"height":300,"zoomMode":"Enabled"}),
        )
        .unwrap();
    let content = s
        .create(outer, NodeKind::Grid, json!({"height":900}))
        .unwrap();
    let inner = s
        .create(
            content,
            NodeKind::ScrollViewer,
            json!({"width":200,"height":200,"verticalAlignment":"Top"}),
        )
        .unwrap();
    s.create(inner, NodeKind::Grid, json!({"height":100}))
        .unwrap();
    frame(&mut s, 0.);
    assert!(s.wheel(100., 100., 0., 80., false).unwrap());
    assert_eq!(s.properties(outer).unwrap().vertical_offset, 80.);
    patch(&mut s, outer, json!({"verticalOffset":0}));
    assert!(s.wheel(100., 100., 0., -80., true).unwrap());
    assert_eq!(s.properties(inner).unwrap().vertical_offset, 0.);
    assert!(s.properties(outer).unwrap().zoom_factor > 1.);
    patch(&mut s, outer, json!({"zoomMode":"Disabled"}));
    assert!(!s.wheel(100., 100., 0., 80., true).unwrap());
    assert_eq!(s.properties(outer).unwrap().vertical_offset, 0.);
    assert!(!s.wheel(390., 390., 0., 80., false).unwrap());
}

#[test]
fn hosted_policy_tracks_overflow_and_disabled_axes_instead_of_offset() {
    let mut s = Scene::new(Theme::Light, true);
    s.resize(400., 400., 1.).unwrap();
    let id = s
        .create(
            s.root,
            NodeKind::ScrollViewer,
            json!({"width":200,"height":200,"horizontalScrollBarVisibility":"Hidden"}),
        )
        .unwrap();
    let metrics = HostScrollMetrics {
        viewport_width: 200.,
        viewport_height: 200.,
        extent_width: 600.,
        extent_height: 700.,
        horizontal_offset: 400.,
        vertical_offset: 500.,
        occlusions: vec![],
    };
    s.set_scroll_host(id, metrics.clone()).unwrap();
    frame(&mut s, 0.);
    let scroll = s
        .snapshot()
        .nodes
        .into_iter()
        .find(|n| n.id == id)
        .unwrap()
        .scroll
        .unwrap();
    assert!(scroll.horizontal_wheel_contained && scroll.vertical_wheel_contained);
    assert!(s.wheel(100., 100., 0., 100., false).unwrap());
    patch(
        &mut s,
        id,
        json!({"horizontalScrollMode":"Disabled","verticalScrollBarVisibility":"Disabled"}),
    );
    frame(&mut s, 1.);
    let scroll = s
        .snapshot()
        .nodes
        .into_iter()
        .find(|n| n.id == id)
        .unwrap()
        .scroll
        .unwrap();
    assert!(!scroll.horizontal_wheel_contained && !scroll.vertical_wheel_contained);
    assert!(!s.wheel(100., 100., 0., 100., false).unwrap());
    patch(
        &mut s,
        id,
        json!({"horizontalScrollMode":"Enabled","verticalScrollBarVisibility":"Auto"}),
    );
    s.set_scroll_host(
        id,
        HostScrollMetrics {
            extent_width: 200.,
            extent_height: 200.,
            horizontal_offset: 0.,
            vertical_offset: 0.,
            ..metrics
        },
    )
    .unwrap();
    frame(&mut s, 2.);
    let scroll = s
        .snapshot()
        .nodes
        .into_iter()
        .find(|n| n.id == id)
        .unwrap()
        .scroll
        .unwrap();
    assert!(!scroll.horizontal_wheel_contained && !scroll.vertical_wheel_contained);
}

#[test]
fn pointer_projection_distinguishes_labels_editors_links_and_disabled_ancestors() {
    let mut s = Scene::new(Theme::Light, true);
    s.resize(700., 500., 1.).unwrap();
    let stack = s.create(s.root, NodeKind::StackPanel, json!({})).unwrap();
    let mut ordinary = Vec::new();
    for kind in [
        NodeKind::Button,
        NodeKind::CheckBox,
        NodeKind::RadioButton,
        NodeKind::ToggleSwitch,
        NodeKind::Slider,
        NodeKind::TextBlock,
        NodeKind::TextBox,
        NodeKind::PasswordBox,
    ] {
        ordinary.push(
            s.create(stack, kind, json!({"text":"Label","header":"Header"}))
                .unwrap(),
        );
    }
    let link = s
        .create(stack, NodeKind::HyperlinkButton, json!({"text":"Link"}))
        .unwrap();
    let rich = s
        .create(stack, NodeKind::RichTextBlock, json!({"text":"Selectable"}))
        .unwrap();
    frame(&mut s, 0.);
    let snap = s.snapshot();
    for id in &ordinary {
        let n = snap.nodes.iter().find(|n| n.id == *id).unwrap();
        assert_eq!(n.pointer.cursor, "default", "{:?}", n.kind);
        assert_eq!(n.pointer.text_selection, "none");
        if n.editor.is_some() {
            assert_eq!(n.pointer.editor_cursor, "text");
        }
    }
    assert_eq!(
        snap.nodes
            .iter()
            .find(|n| n.id == link)
            .unwrap()
            .pointer
            .cursor,
        "pointer"
    );
    assert_eq!(
        snap.nodes
            .iter()
            .find(|n| n.id == rich)
            .unwrap()
            .pointer
            .cursor,
        "text"
    );
    patch(
        &mut s,
        rich,
        json!({"reading":{"isTextSelectionEnabled":false}}),
    );
    frame(&mut s, 1.);
    assert_eq!(
        s.snapshot()
            .nodes
            .iter()
            .find(|n| n.id == rich)
            .unwrap()
            .pointer
            .cursor,
        "default"
    );
    patch(&mut s, stack, json!({"enabled":false}));
    frame(&mut s, 2.);
    for n in s
        .snapshot()
        .nodes
        .iter()
        .filter(|n| ordinary.contains(&n.id) || n.id == link || n.id == rich)
    {
        assert_eq!(n.pointer.cursor, "default");
        assert_eq!(n.pointer.editor_cursor, "default");
    }
}

#[test]
fn rich_links_use_rust_hit_geometry_and_overflow_inherits_selection_policy() {
    let mut s = Scene::new(Theme::Light, true);
    s.resize(600., 300., 1.).unwrap();
    let rich=s.create(s.root,NodeKind::RichTextBlock,json!({"width":200,"height":40,
        "horizontalAlignment":"Left","verticalAlignment":"Top","reading":{"paragraphs":[{"runs":[{"text":"Link","link":"target"}]}]}})).unwrap();
    frame(&mut s, 0.);
    let snap = s.snapshot();
    let n = snap.nodes.iter().find(|n| n.id == rich).unwrap();
    let r = &n.reading.as_ref().unwrap()["links"][0]["rect"];
    let (x, y) = n
        .world
        .point(r["x"].as_f64().unwrap() + 1., r["y"].as_f64().unwrap() + 1.);
    s.input(Input::Move { x, y, pointer: 1 }, 1.).unwrap();
    assert_eq!(
        s.snapshot()
            .nodes
            .iter()
            .find(|n| n.id == rich)
            .unwrap()
            .pointer
            .cursor,
        "pointer"
    );
    s.input(
        Input::Move {
            x: 180.,
            y: 30.,
            pointer: 1,
        },
        2.,
    )
    .unwrap();
    assert_eq!(
        s.snapshot()
            .nodes
            .iter()
            .find(|n| n.id == rich)
            .unwrap()
            .pointer
            .cursor,
        "text"
    );
    let overflow = s
        .create(
            s.root,
            NodeKind::RichTextBlockOverflow,
            json!({"width":200,"height":80}),
        )
        .unwrap();
    patch(
        &mut s,
        rich,
        json!({"reading":{"overflowContentTarget":overflow,"isTextSelectionEnabled":false}}),
    );
    frame(&mut s, 3.);
    let snap = s.snapshot();
    let p = &snap
        .nodes
        .iter()
        .find(|n| n.id == overflow)
        .unwrap()
        .pointer;
    assert_eq!((p.cursor, p.text_selection), ("default", "none"));
}
