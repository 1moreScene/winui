use serde_json::json;
use winui_wasm::{
    enums::*,
    render::Draw,
    scene::{Input, Scene, Update},
    typography::{Font, Metrics, TextMeasurer},
};
struct FontHost;
#[test]
fn navigation_initial_material_uses_inherited_dark_theme_and_transparency_policy(){
    let mut scene=Scene::new(Theme::Dark,false);scene.reduced_transparency=true;
    let id=scene.create(scene.root,NodeKind::NavigationView,json!({"navigation":{"paneDisplayMode":"LeftCompact","isPaneOpen":true}})).unwrap();
    frame(&mut scene);
    let mut snapshot=scene.snapshot();let node=snapshot.nodes.iter_mut().find(|node|node.id==id).unwrap();
    let nav=node.navigation.as_ref().unwrap();let pane=nav.pane_material.as_ref().unwrap();
    assert_eq!(winui_wasm::material::rgba(&pane.recipe.fallback_color),[44./255.,44./255.,44./255.,1.]);
    assert_eq!(winui_wasm::material::rgba(&pane.colors.as_ref().unwrap().fallback),[44./255.,44./255.,44./255.,1.]);
    assert_eq!(pane.weight,0.);assert!(!nav.animating);
}
#[test]
fn scene_root_without_a_brush_never_invents_a_theme_backdrop() {
    for theme in [Theme::Light, Theme::Dark, Theme::HighContrast] {
        let mut scene = Scene::new(theme, true);
        scene.resize(320., 80., 1.).unwrap();
        scene.layout(&mut FontHost);
        assert!(
            !scene.base_display_list().iter().any(|draw| matches!(draw, Draw::Fill { .. })),
            "null Grid.Background must stay transparent in {theme:?}"
        );
        scene.update(vec![Update {
            id: scene.root,
            patch: json!({"background":"#c05080"}),
        }]).unwrap();
        scene.layout(&mut FontHost);
        assert!(scene.base_display_list().iter().any(|draw|matches!(draw,Draw::Fill{rect,color,..} if rect.width==320.&&rect.height==80.&&color=="#c05080")));
        scene.update(vec![Update {
            id: scene.root,
            patch: json!({"background":null}),
        }]).unwrap();
        scene.layout(&mut FontHost);
        assert!(!scene.base_display_list().iter().any(|draw| matches!(draw, Draw::Fill { .. })));
    }
}
impl TextMeasurer for FontHost {
    fn measure(&mut self, text: &str, font: &Font) -> Metrics {
        let width = text
            .chars()
            .map(|c| {
                if c.is_ascii() {
                    font.size * 0.5
                } else {
                    font.size
                }
            })
            .sum();
        Metrics {
            width,
            ascent: font.size,
            descent: font.size * 0.3,
            left: 0.,
            right: width,
        }
    }
}
fn frame(s: &mut Scene) {
    s.resize(600., 400., 1.).unwrap();
    s.layout(&mut FontHost);
    s.display_list();
}
fn click(s: &mut Scene, x: f64, y: f64) {
    s.input(Input::Down { x, y, pointer: 1 }, 10.).unwrap();
    s.input(Input::Up { x, y, pointer: 1 }, 20.).unwrap();
}
fn clicks(s: &mut Scene) -> usize {
    s.snapshot()
        .events
        .iter()
        .filter(|e| e.kind == EventKind::Click)
        .count()
}

#[test]
fn animated_presentation_drives_hit_testing_without_layout_work() {
    let mut s = Scene::new(Theme::Light, false);
    let button = s
        .create(
            s.root,
            NodeKind::Button,
            json!({"width":100,"height":40,
        "horizontalAlignment":"Left","verticalAlignment":"Top"}),
        )
        .unwrap();
    frame(&mut s);
    let passes = s.layout_passes;
    s.animate(
        button,
        json!({"translationX":200,"scaleX":2}),
        winui_wasm::scene::AnimationOptions {
            duration: 100.,
            delay: 0.,
            easing: AnimationEasing::Linear,
            curve: None,
            ..Default::default()
        },
    )
    .unwrap();
    s.advance(50.);
    s.layout(&mut FontHost);
    assert_eq!(s.layout_passes, passes);
    assert_eq!(s.hit(240., 20.), Some(button));
    assert_eq!(s.hit(80., 20.), None);
    // Input advances the presentation between rendered frames as well.
    s.input(
        Input::Down {
            x: 300.,
            y: 20.,
            pointer: 1,
        },
        75.,
    )
    .unwrap();
    assert_eq!(s.captured, Some((1, button)));
    assert_eq!(
        s.snapshot()
            .nodes
            .iter()
            .find(|n| n.id == button)
            .unwrap()
            .props
            .translation_x,
        200.
    );
}

#[test]
fn rapid_material_policy_reversal_reaches_fully_solid_fallback() {
    let mut s = Scene::new(Theme::Light, false);
    let panel = s
        .create(
            s.root,
            NodeKind::Grid,
            json!({"width":200,"height":200,
        "acrylic":{"tintColor":"#ffffff","tintOpacity":0.2,"fallbackColor":"#f3f3f3"}}),
        )
        .unwrap();
    frame(&mut s);
    s.set_policies(false, true);
    frame(&mut s);
    s.advance(166.);
    frame(&mut s);
    assert!(s.get(panel).unwrap().material_motion.value(s.time) < 0.01);
    s.set_policies(false, false);
    frame(&mut s);
    s.set_policies(false, true);
    frame(&mut s);
    assert!(
        s.snapshot().animating,
        "a tiny remaining material weight still requires its final frame"
    );
    s.advance(400.);
    frame(&mut s);
    assert_eq!(s.get(panel).unwrap().material_motion.value(s.time), 0.);
    assert!(!s.snapshot().animating);
    // No paint occurs between policy update and the clock jump.
    s.set_policies(false, false);
    s.advance(700.);
    frame(&mut s);
    assert_eq!(s.get(panel).unwrap().material_motion.value(s.time), 1.);
    s.set_policies(false, true);
    s.advance(1000.);
    frame(&mut s);
    assert_eq!(s.get(panel).unwrap().material_motion.value(s.time), 0.);
}
#[test]
fn scene_combines_button_navigation_and_text_on_one_display_list() {
    let mut s = Scene::new(Theme::Light, true);
    let panel = s
        .create(
            s.root,
            NodeKind::StackPanel,
            json!({"padding":[12,12,12,12],"spacing":8}),
        )
        .unwrap();
    s.create(panel, NodeKind::TextBlock, json!({"text":"中文/English"}))
        .unwrap();
    let button = s
        .create(panel, NodeKind::Button, json!({"text":"Save"}))
        .unwrap();
    let nav=s.create(panel,NodeKind::NavigationView,json!({"height":200,"navigation":{"paneDisplayMode":"Left","items":[{"id":"home","text":"Home"}]}})).unwrap();
    frame(&mut s);
    assert!(s.get(nav).unwrap().rect.y > s.get(button).unwrap().rect.y);
    assert!(s
        .display_list()
        .iter()
        .any(|d| matches!(d,Draw::Text{text,..}if text=="Save")));
    let n = s.get(button).unwrap();
    let (x, y) = n.world.point(5., 5.);
    click(&mut s, x, y);
    assert_eq!(clicks(&mut s), 1);
}
#[test]
fn property_batches_validate_before_commit_and_invalidate_ancestors() {
    let mut s = Scene::new(Theme::Light, true);
    let panel = s.create(s.root, NodeKind::StackPanel, json!({})).unwrap();
    let a = s
        .create(panel, NodeKind::Button, json!({"text":"A"}))
        .unwrap();
    let b = s
        .create(panel, NodeKind::TextBlock, json!({"text":"B"}))
        .unwrap();
    frame(&mut s);
    let version = s.get(panel).unwrap().layout_version;
    assert!(s
        .update(vec![
            Update {
                id: a,
                patch: json!({"text":"changed"})
            },
            Update {
                id: b,
                patch: json!({"maxWidth":-1})
            }
        ])
        .is_err());
    assert_eq!(s.get(a).unwrap().props.text, "A");
    s.update(vec![Update {
        id: a,
        patch: json!({"text":"Longer label"}),
    }])
    .unwrap();
    assert!(s.get(panel).unwrap().layout_version > version);
    frame(&mut s);
    let passes = s.layout_passes;
    s.input(
        Input::Move {
            x: 15.,
            y: 15.,
            pointer: 1,
        },
        20.,
    )
    .unwrap();
    frame(&mut s);
    assert_eq!(s.layout_passes, passes);
}
#[test]
fn capture_drag_cancel_disable_and_keyboard_repeat_match_buttonbase() {
    let mut s = Scene::new(Theme::Light, true);
    let b = s
        .create(
            s.root,
            NodeKind::Button,
            json!({"width":100,"height":40,"verticalAlignment":"Top"}),
        )
        .unwrap();
    frame(&mut s);
    s.input(
        Input::Down {
            x: 10.,
            y: 10.,
            pointer: 7,
        },
        0.,
    )
    .unwrap();
    s.input(
        Input::Move {
            x: 300.,
            y: 10.,
            pointer: 7,
        },
        1.,
    )
    .unwrap();
    s.input(
        Input::Up {
            x: 300.,
            y: 10.,
            pointer: 7,
        },
        2.,
    )
    .unwrap();
    assert_eq!(clicks(&mut s), 0);
    s.input(
        Input::Down {
            x: 10.,
            y: 10.,
            pointer: 1,
        },
        3.,
    )
    .unwrap();
    s.input(
        Input::Move {
            x: 300.,
            y: 10.,
            pointer: 1,
        },
        4.,
    )
    .unwrap();
    s.input(
        Input::Move {
            x: 10.,
            y: 10.,
            pointer: 1,
        },
        5.,
    )
    .unwrap();
    s.input(
        Input::Up {
            x: 10.,
            y: 10.,
            pointer: 1,
        },
        6.,
    )
    .unwrap();
    assert_eq!(clicks(&mut s), 1);
    s.input(Input::Focus { id: b }, 7.).unwrap();
    s.input(
        Input::KeyDown {
            key: "Enter".into(),
            repeat: false,
        },
        8.,
    )
    .unwrap();
    for _ in 0..30 {
        s.input(
            Input::KeyDown {
                key: "Enter".into(),
                repeat: true,
            },
            9.,
        )
        .unwrap();
    }
    assert_eq!(clicks(&mut s), 0);
    s.input(
        Input::KeyUp {
            key: "Enter".into(),
        },
        10.,
    )
    .unwrap();
    assert_eq!(clicks(&mut s), 1);
    s.input(
        Input::KeyDown {
            key: " ".into(),
            repeat: false,
        },
        11.,
    )
    .unwrap();
    s.update(vec![Update {
        id: b,
        patch: json!({"enabled":false}),
    }])
    .unwrap();
    s.input(Input::KeyUp { key: " ".into() }, 12.).unwrap();
    assert_eq!(clicks(&mut s), 0);
    assert_eq!(s.focused, None);
}
#[test]
fn press_and_hover_modes_emit_once_at_the_source_trigger() {
    for mode in [ClickMode::Press, ClickMode::Hover] {
        let mut s = Scene::new(Theme::Light, true);
        s.create(
            s.root,
            NodeKind::Button,
            json!({"width":100,"height":40,"verticalAlignment":"Top","clickMode":mode}),
        )
        .unwrap();
        frame(&mut s);
        s.input(
            Input::Move {
                x: 10.,
                y: 10.,
                pointer: 1,
            },
            0.,
        )
        .unwrap();
        assert_eq!(clicks(&mut s), usize::from(mode == ClickMode::Hover));
        s.input(
            Input::Down {
                x: 10.,
                y: 10.,
                pointer: 1,
            },
            1.,
        )
        .unwrap();
        assert_eq!(clicks(&mut s), usize::from(mode == ClickMode::Press));
        s.input(
            Input::Up {
                x: 10.,
                y: 10.,
                pointer: 1,
            },
            2.,
        )
        .unwrap();
        assert_eq!(clicks(&mut s), 0);
    }
}
#[test]
fn destroyed_handles_cycles_and_reparented_subtrees_are_safe() {
    let mut s = Scene::new(Theme::Light, true);
    let a = s.create(s.root, NodeKind::Grid, json!({})).unwrap();
    let b = s.create(a, NodeKind::Button, json!({"text":"B"})).unwrap();
    assert!(s.reparent(a, b, None).is_err());
    let p = s.create(s.root, NodeKind::StackPanel, json!({})).unwrap();
    s.reparent(b, p, None).unwrap();
    assert_eq!(s.get(b).unwrap().parent, Some(p));
    assert!(s.destroy(p).unwrap().contains(&b));
    assert!(s.get(b).is_err());
    let next = s.create(s.root, NodeKind::Button, json!({})).unwrap();
    assert!(next > b);
    assert!(s.create(next, NodeKind::Button, json!({})).is_err());
}
#[test]
fn transformed_hit_testing_respects_all_nested_clips() {
    let mut s = Scene::new(Theme::Light, true);
    let group=s.create(s.root,NodeKind::Grid,json!({"width":80,"height":80,"horizontalAlignment":"Left","verticalAlignment":"Top","clip":true,"transform":[1,0,0,1,20,30]})).unwrap();
    let b=s.create(group,NodeKind::Button,json!({"width":100,"height":40,"horizontalAlignment":"Left","verticalAlignment":"Top","margin":[60,0,0,0]})).unwrap();
    frame(&mut s);
    assert_eq!(s.hit(85., 40.), Some(b));
    assert_eq!(s.hit(110., 40.), None);
    click(&mut s, 110., 40.);
    assert_eq!(clicks(&mut s), 0);
}
#[test]
fn unicode_wrap_and_ellipsis_preserve_clusters_and_layout_constraints() {
    let mut s = Scene::new(Theme::Dark, true);
    let t=s.create(s.root,NodeKind::TextBlock,json!({"text":"中文文字换行 English words","width":80,"wrap":true,"maxHeight":90,"padding":[4,4,4,4]})).unwrap();
    frame(&mut s);
    assert!(s.get(t).unwrap().text.lines.len() > 1);
    assert!(s.get(t).unwrap().rect.height <= 90.);
    let t = s
        .create(
            s.root,
            NodeKind::TextBlock,
            json!({"text":"A👩‍💻é中文","width":40,"trimming":"CharacterEllipsis"}),
        )
        .unwrap();
    frame(&mut s);
    assert!(s.get(t).unwrap().text.lines[0].text.ends_with('…'));
    assert!(!s.get(t).unwrap().text.lines[0].text.ends_with("\u{200d}…"));
    let c = s
        .create(
            s.root,
            NodeKind::CheckBox,
            json!({"text":"Two-state CheckBox","fontSize":14.01}),
        )
        .unwrap();
    frame(&mut s);
    assert_eq!(
        s.get(c).unwrap().text.lines.len(),
        1,
        "fractional natural width must not create a second line during Arrange"
    );
}
#[test]
fn opacity_is_an_isolated_layer_and_disabled_inherits() {
    let mut s = Scene::new(Theme::Light, true);
    let p = s
        .create(
            s.root,
            NodeKind::Grid,
            json!({"opacity":0.5,"enabled":false}),
        )
        .unwrap();
    let b = s
        .create(p, NodeKind::Button, json!({"text":"Click"}))
        .unwrap();
    frame(&mut s);
    assert!(!s.get(b).unwrap().enabled);
    assert!(s
        .display_list()
        .iter()
        .any(|d| matches!(d,Draw::Layer{opacity}if *opacity==0.5)));
    s.input(Input::Invoke { id: b }, 0.).unwrap();
    assert_eq!(clicks(&mut s), 0);
    let mut overshoot = Scene::new(Theme::Light, false);
    let p = overshoot
        .create(overshoot.root, NodeKind::Grid, json!({"opacity":0}))
        .unwrap();
    frame(&mut overshoot);
    overshoot
        .animate(
            p,
            json!({"opacity":1}),
            winui_wasm::scene::AnimationOptions {
                easing_function: Some(EasingFunction::Back),
                easing_mode: EasingMode::EaseIn,
                duration: 1000.,
                ..Default::default()
            },
        )
        .unwrap();
    overshoot.advance(200.);
    assert_eq!(overshoot.get(p).unwrap().presentation.opacity, 0.);
    assert!(overshoot
        .display_list()
        .iter()
        .any(|d| matches!(d, Draw::Layer{opacity} if *opacity == 0.)));
}
#[test]
fn collapsed_subtrees_drop_visuals_and_cannot_keep_focus_or_capture() {
    let mut s = Scene::new(Theme::Light, true);
    let p = s.create(s.root, NodeKind::StackPanel, json!({})).unwrap();
    let b = s
        .create(p, NodeKind::Button, json!({"text":"Visible"}))
        .unwrap();
    frame(&mut s);
    s.input(Input::Focus { id: b }, 0.).unwrap();
    s.update(vec![Update {
        id: p,
        patch: json!({"visible":false}),
    }])
    .unwrap();
    frame(&mut s);
    assert!(!s.get(b).unwrap().visible);
    assert_eq!(s.focused, None);
    assert!(!s
        .display_list()
        .iter()
        .any(|d| matches!(d,Draw::Text{text,..}if text=="Visible")));
}
#[test]
fn reparent_cannot_hide_interactive_descendants_inside_button_content() {
    let mut s = Scene::new(Theme::Light, true);
    let p = s.create(s.root, NodeKind::Grid, json!({})).unwrap();
    s.create(p, NodeKind::Button, json!({})).unwrap();
    let b = s.create(s.root, NodeKind::Button, json!({})).unwrap();
    assert!(s.reparent(p, b, None).is_err());
    assert_eq!(s.get(p).unwrap().parent, Some(s.root));
}
#[test]
fn a_zero_star_column_stays_zero_and_narrow_button_clips_from_content_origin() {
    let mut s = Scene::new(Theme::Light, true);
    let grid = s
        .create(
            s.root,
            NodeKind::Grid,
            json!({"columns":[{"unit":"Star","value":0},{"unit":"Star","value":1}]}),
        )
        .unwrap();
    let t = s
        .create(grid, NodeKind::TextBlock, json!({"text":"zero"}))
        .unwrap();
    let b = s
        .create(
            grid,
            NodeKind::Button,
            json!({"column":1,"width":50,"text":"A deliberately long label"}),
        )
        .unwrap();
    frame(&mut s);
    assert_eq!(s.get(t).unwrap().rect.width, 0.);
    let text = s
        .display_list()
        .into_iter()
        .find(|d| matches!(d,Draw::Text{text,..}if text=="A deliberately long label"))
        .unwrap();
    if let Draw::Text { x, .. } = text {
        assert_eq!(x, 12.);
    }
    assert_eq!(s.get(b).unwrap().rect.width, 50.);
}
