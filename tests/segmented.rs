use serde_json::json;
use winui_wasm::{
    enums::{EventKind, NodeKind, Theme},
    render::Draw,
    scene::{Input, Scene, Update},
    typography::{Font, Metrics, TextMeasurer},
};

struct Measure;
impl TextMeasurer for Measure {
    fn measure(&mut self, text: &str, font: &Font) -> Metrics {
        Metrics {
            width: text.chars().count() as f64 * font.size / 2.,
            ascent: font.size * 0.8,
            descent: font.size * 0.2,
            ..Default::default()
        }
    }
}

#[test]
fn selected_pill_retargets_in_place_without_overpainting_the_border() {
    let mut scene = Scene::new(Theme::Light, false);
    scene.resize(400., 200., 1.).unwrap();
    let control = scene
        .create(scene.root, NodeKind::Segmented, json!({"selectedIndex":0}))
        .unwrap();
    let item = scene
        .create(
            control,
            NodeKind::SegmentedItem,
            json!({"text":"Day","glyph":"\u{E8BF}"}),
        )
        .unwrap();
    scene
        .create(control, NodeKind::SegmentedItem, json!({"text":"Week"}))
        .unwrap();
    scene.layout(&mut Measure);
    let pill = |scene: &mut Scene| {
        scene
            .display_list()
            .into_iter()
            .find_map(|draw| match draw {
                Draw::CornerClip { rect, radii } if rect.height == 3. && radii[0][1] == 1. => {
                    Some(rect)
                }
                _ => None,
            })
            .unwrap()
    };
    let rest = pill(&mut scene);
    assert_eq!(rest.width, 16.);
    assert_eq!(rest.y + rest.height + 1., scene.nodes[&item].rect.height);
    let (x, y) = scene.nodes[&item].world.point(15., 10.);
    scene.input(Input::Down { x, y, pointer: 1 }, 10.).unwrap();
    assert_eq!(pill(&mut scene), rest);
    scene.advance(83.);
    let mid = pill(&mut scene);
    assert!(mid.width > 8. && mid.width < 16.);
    assert_eq!(mid.y, rest.y);
    scene.input(Input::Up { x, y, pointer: 1 }, 83.).unwrap();
    assert_eq!(pill(&mut scene), mid);
    scene.advance(250.);
    assert_eq!(pill(&mut scene), rest);
}

#[test]
fn keyboard_focus_selection_and_source_reorder() {
    let mut scene = Scene::new(Theme::Light, false);
    scene.resize(480., 320., 1.25).unwrap();
    let control = scene.create(scene.root, NodeKind::Segmented, json!({"selectedIndex":0,"segmentedSource":[{"name":"a","content":"Day"},{"name":"b","content":"Week","enabled":false},{"name":"c","content":"Month"}]})).unwrap();
    scene.layout(&mut Measure);
    scene.display_list();
    let [a, b, c] = scene.nodes[&control]
        .children
        .as_slice()
        .try_into()
        .unwrap();
    assert!(scene.nodes[&a].props.is_selected);
    assert!(
        (scene.nodes[&a].rect.width - scene.nodes[&b].rect.width).abs() <= 1. / scene.dpr + 1e-8
    );
    scene.input(Input::Focus { id: a }, 1.).unwrap();
    scene
        .input(
            Input::KeyDown {
                key: "ArrowRight".into(),
                repeat: false,
            },
            2.,
        )
        .unwrap();
    assert_eq!(scene.focused, Some(c));
    assert!(scene.nodes[&a].props.is_selected);
    scene.events.clear();
    scene
        .input(
            Input::KeyDown {
                key: " ".into(),
                repeat: false,
            },
            3.,
        )
        .unwrap();
    scene.input(Input::KeyUp { key: " ".into() }, 4.).unwrap();
    assert_eq!(scene.nodes[&control].props.selected_index, 2);
    assert_eq!(
        scene
            .events
            .iter()
            .filter(|e| e.kind == EventKind::SelectionChanged)
            .count(),
        1
    );
    scene.update(vec![Update{id:control,patch:json!({"segmentedSource":[{"name":"c","content":"Month"},{"name":"a","content":"Day"}]})}]).unwrap();
    scene.layout(&mut Measure);
    assert_eq!(scene.nodes[&control].children, vec![c, a]);
    assert_eq!(scene.nodes[&control].props.selected_index, 0);
    assert_eq!(scene.focused, Some(c));
}

#[test]
fn all_styles_paint_and_hidden_items_leave_no_gap() {
    for theme in [Theme::Light, Theme::Dark, Theme::HighContrast] {
        for style in ["Default", "Pivot", "Button"] {
            let mut scene = Scene::new(theme, false);
            scene.resize(480., 320., 1.25).unwrap();
            let control=scene.create(scene.root,NodeKind::Segmented,json!({"segmentedStyle":style,"orientation":"Vertical","selectedIndex":0,"selectionMode":"Multiple"})).unwrap();
            let a = scene
                .create(
                    control,
                    NodeKind::SegmentedItem,
                    json!({"text":"Day","glyph":"\u{E8BF}"}),
                )
                .unwrap();
            scene
                .create(
                    control,
                    NodeKind::SegmentedItem,
                    json!({"text":"Hidden","visible":false}),
                )
                .unwrap();
            let b = scene
                .create(
                    control,
                    NodeKind::SegmentedItem,
                    json!({"text":"Month","enabled":false}),
                )
                .unwrap();
            scene.layout(&mut Measure);
            assert!(scene.nodes[&b].rect.y < scene.nodes[&a].rect.height + 3.);
            scene.display_list();
            scene.input(Input::Invoke { id: b }, 10.).unwrap();
            assert!(!scene.nodes[&b].props.is_selected);
            scene.input(Input::Invoke { id: a }, 20.).unwrap();
            assert!(!scene.nodes[&a].props.is_selected);
            scene.display_list();
        }
    }
}

#[test]
fn icon_and_declared_content_follow_orientation() {
    let mut scene = Scene::new(Theme::Light, true);
    scene.resize(300., 200., 1.).unwrap();
    let segmented = scene
        .create(scene.root, NodeKind::Segmented, json!({}))
        .unwrap();
    let item = scene
        .create(
            segmented,
            NodeKind::SegmentedItem,
            json!({"glyph":"\u{E8BF}"}),
        )
        .unwrap();
    let content = scene
        .create(item, NodeKind::TextBlock, json!({"text":"Day"}))
        .unwrap();
    scene.layout(&mut Measure);
    let horizontal = scene.nodes[&content].rect;
    assert!(horizontal.x >= 24.);
    scene
        .update(vec![Update {
            id: segmented,
            patch: json!({"orientation":"Vertical"}),
        }])
        .unwrap();
    scene.layout(&mut Measure);
    let vertical = scene.nodes[&content].rect;
    assert!(vertical.y >= 21.);
    assert!(vertical.x < horizontal.x);
    assert!(scene.nodes[&item].rect.height > vertical.y + vertical.height);
}
