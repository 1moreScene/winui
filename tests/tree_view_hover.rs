use serde_json::{json, Value};
use winui_wasm::{
    enums::{NodeKind, Theme},
    render::{expand_retained, Draw},
    resources::Brush,
    scene::{Input, Scene, Update},
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

fn tree(theme: Theme, mode: &str, dpr: f64) -> (Scene, u32, u32) {
    let mut scene = Scene::new(theme, true);
    scene.resize(500., 300., dpr).unwrap();
    let tree = scene
        .create(
            scene.root,
            NodeKind::TreeView,
            json!({"width":300,"height":120,"horizontalAlignment":"Left",
                "verticalAlignment":"Top","navControls":{"treeSelectionMode":mode,
                "items":[{"id":"file","text":"File"}]}}),
        )
        .unwrap();
    scene.layout(&mut Measure);
    let row = scene
        .nodes
        .values()
        .find(|node| node.props.collection_owner == Some(tree))
        .unwrap()
        .id;
    (scene, tree, row)
}

fn native_color(theme: Theme, suffix: &str) -> String {
    let contract: Value = serde_json::from_str(include_str!(
        "../references/navigation-controls-template.json"
    ))
    .unwrap();
    let brush: Brush = serde_json::from_value(
        contract["palettes"][theme.as_str()][format!("TreeViewItemBackground{suffix}")].clone(),
    )
    .unwrap();
    brush.solid_color()
}

fn background(scene: &mut Scene, row: u32) -> String {
    scene.layout(&mut Measure);
    let row = &scene.nodes[&row];
    let (width, height) = (row.rect.width - 8., row.rect.height - 4.);
    let draws = scene.display_list();
    expand_retained(&draws)
        .iter()
        .find_map(|draw| match draw {
            Draw::Fill {
                rect,
                color,
                radius,
            } if rect.x == 4.
                && rect.y == 2.
                && rect.width == width
                && rect.height == height
                && *radius == 4. =>
            {
                Some(color.clone())
            }
            _ => None,
        })
        .expect("TreeView row background")
}

fn move_to(scene: &mut Scene, node: u32, x: f64, y: f64) {
    let (x, y) = scene.nodes[&node].world.point(x, y);
    scene.input(Input::Move { x, y, pointer: 1 }, 0.).unwrap();
}

#[test]
fn tree_hover_uses_native_background_for_all_selection_modes_and_clears_on_exit() {
    for theme in [Theme::Light, Theme::Dark] {
        for mode in ["None", "Single", "Multiple"] {
            for dpr in [1., 1.25, 1.5] {
                let (mut scene, tree, row) = tree(theme, mode, dpr);
                assert_eq!(background(&mut scene, row), native_color(theme, ""));
                move_to(&mut scene, row, 150., 14.);
                assert_eq!(
                    background(&mut scene, row),
                    native_color(theme, "PointerOver"),
                    "{theme:?} {mode} DPR {dpr}"
                );
                if mode != "None" {
                    scene
                        .navigation_control_command(
                            tree,
                            json!({"action":"selectNode","key":"file"}),
                        )
                        .unwrap();
                    assert_eq!(
                        background(&mut scene, row),
                        native_color(theme, "SelectedPointerOver")
                    );
                }
                move_to(&mut scene, tree, 150., 100.);
                let normal = if mode == "None" { "" } else { "Selected" };
                assert_eq!(background(&mut scene, row), native_color(theme, normal));
                move_to(&mut scene, row, 150., 14.);
                scene.input(Input::Leave, 0.).unwrap();
                assert_eq!(background(&mut scene, row), native_color(theme, normal));
            }
        }
    }
}

#[test]
fn tree_hover_routes_through_checkbox_and_interactive_item_template() {
    for mode in ["Single", "Multiple"] {
        let (mut scene, _, row) = tree(Theme::Light, mode, 1.25);
        let child = if mode == "Multiple" {
            scene.nodes[&row]
                .children
                .iter()
                .copied()
                .find(|id| scene.nodes[id].kind == NodeKind::CheckBox)
                .unwrap()
        } else {
            scene.create(row, NodeKind::Button,
                json!({"text":"Template","width":90,"height":24,"minHeight":0,"horizontalAlignment":"Left"})).unwrap()
        };
        scene.layout(&mut Measure);
        let rect = scene.nodes[&child].rect;
        let (x, y) = scene.nodes[&child]
            .world
            .point(rect.width / 2., rect.height / 2.);
        assert_eq!(scene.hit(x, y), Some(child));
        scene.input(Input::Move { x, y, pointer: 1 }, 0.).unwrap();
        assert_eq!(
            background(&mut scene, row),
            native_color(Theme::Light, "PointerOver")
        );
    }
}

#[test]
fn tree_hover_respects_clipping_occlusion_and_disabled_state_without_another_move() {
    let (mut scene, tree, row) = tree(Theme::Light, "Single", 1.25);
    move_to(&mut scene, row, 150., 14.);
    assert_eq!(
        background(&mut scene, row),
        native_color(Theme::Light, "PointerOver")
    );
    let covering = scene
        .create(
            scene.root,
            NodeKind::Button,
            json!({"width":300,"height":40,"horizontalAlignment":"Left","verticalAlignment":"Top"}),
        )
        .unwrap();
    assert_eq!(background(&mut scene, row), native_color(Theme::Light, ""));
    scene.destroy(covering).unwrap();
    assert_eq!(
        background(&mut scene, row),
        native_color(Theme::Light, "PointerOver")
    );
    let popup = scene
        .create(
            row,
            NodeKind::Popup,
            json!({"isOpen":true,"width":300,"height":40}),
        )
        .unwrap();
    assert_eq!(background(&mut scene, row), native_color(Theme::Light, ""));
    scene.destroy(popup).unwrap();
    assert_eq!(
        background(&mut scene, row),
        native_color(Theme::Light, "PointerOver")
    );
    scene
        .update(vec![Update {
            id: tree,
            patch: json!({"height":8}),
        }])
        .unwrap();
    assert_eq!(background(&mut scene, row), native_color(Theme::Light, ""));
    scene
        .update(vec![Update {
            id: tree,
            patch: json!({"height":120,"enabled":false}),
        }])
        .unwrap();
    assert_eq!(
        background(&mut scene, row),
        native_color(Theme::Light, "Disabled")
    );
    scene
        .update(vec![Update {
            id: tree,
            patch: json!({"enabled":true}),
        }])
        .unwrap();
    assert_eq!(
        background(&mut scene, row),
        native_color(Theme::Light, "PointerOver")
    );
}
