use serde_json::json;
use winui_wasm::{
    enums::*,
    render::Draw,
    scene::{
        motion_effects::{MotionCommand, SpringOptions},
        AnimationOptions, Scene, Update,
    },
    typography::{Font, Metrics, TextMeasurer},
};
struct Text;
impl TextMeasurer for Text {
    fn measure(&mut self, text: &str, font: &Font) -> Metrics {
        Metrics {
            left: 0.,
            right: 0.,
            width: text.chars().count() as f64 * font.size * 0.5,
            ascent: font.size * 0.8,
            descent: font.size * 0.2,
        }
    }
}
fn frame(s: &mut Scene, t: f64) {
    s.advance(t);
    s.layout(&mut Text);
}
fn patch(s: &mut Scene, id: u32, value: serde_json::Value) {
    s.update(vec![Update { id, patch: value }]).unwrap();
}
fn command(s: &mut Scene, id: u32, value: serde_json::Value) -> Result<bool, String> {
    s.motion_command(id, serde_json::from_value::<MotionCommand>(value).unwrap())
}
fn scene() -> Scene {
    let mut s = Scene::new(Theme::Light, false);
    s.resize(800., 600., 1.25).unwrap();
    s
}

#[test]
fn implicit_assignment_retargets_from_presentation_and_invalid_batches_are_atomic() {
    let mut s = scene();
    let n=s.create(s.root,NodeKind::Grid,json!({"motion":{"implicit":{"translationX":300,"opacity":300}},"width":50,"height":50})).unwrap();
    patch(&mut s, n, json!({"translationX":100,"opacity":0.5}));
    assert_eq!(s.get(n).unwrap().presentation.translation_x, 0.);
    frame(&mut s, 150.);
    let x = s.get(n).unwrap().presentation.translation_x;
    assert!((x - 50.).abs() < 0.01);
    patch(&mut s, n, json!({"translationX":0}));
    assert_eq!(s.get(n).unwrap().presentation.translation_x, x);
    assert!(s
        .update(vec![
            Update {
                id: n,
                patch: json!({"translationX":200})
            },
            Update {
                id: n,
                patch: json!({"motion":{"implicit":{"width":300}}})
            }
        ])
        .is_err());
    frame(&mut s, 450.);
    assert_eq!(s.get(n).unwrap().presentation.translation_x, 0.);
    assert_eq!(s.get(n).unwrap().presentation.opacity, 0.5);
    assert!(!s.snapshot().animating);
}
#[test]
fn spring_is_physical_and_retarget_keeps_velocity() {
    let spring = SpringOptions {
        period: 100.,
        damping_ratio: 0.2,
    };
    assert!((spring.value(1., 1.5, 0., 0.) - 1.).abs() < 1e-10);
    assert!(spring.value(1., 1.5, 0., 50.) > 1.5);
    let mut s = scene();
    let n = s.create(s.root, NodeKind::Grid, json!({})).unwrap();
    let options = AnimationOptions {
        spring: Some(spring),
        ..Default::default()
    };
    s.animate(n, json!({"scaleX":1.5}), options.clone())
        .unwrap();
    frame(&mut s, 20.);
    let before = s.get(n).unwrap().presentation.scale_x;
    s.animate(n, json!({"scaleX":1.}), options).unwrap();
    assert_eq!(s.get(n).unwrap().presentation.scale_x, before);
    frame(&mut s, 20.001);
    assert!(
        s.get(n).unwrap().presentation.scale_x > before,
        "reversal preserves incoming velocity"
    );
    s.set_policies(true, false);
    assert_eq!(s.get(n).unwrap().presentation.scale_x, 1.);
    assert!(!s.snapshot().animating);
}
#[test]
fn hover_spring_is_owned_by_rust_input_and_settles() {
    let mut s = scene();
    let n=s.create(s.root,NodeKind::Button,json!({"width":100,"height":50,"horizontalAlignment":"Left","verticalAlignment":"Top","motion":{"hoverSpring":{"period":100,"dampingRatio":0.4}}})).unwrap();
    frame(&mut s, 0.);
    s.input(
        winui_wasm::scene::Input::Move {
            pointer: 1,
            x: 20.,
            y: 20.,
        },
        0.,
    )
    .unwrap();
    frame(&mut s, 0.);
    frame(&mut s, 50.);
    assert!(s.get(n).unwrap().presentation.scale_x > 1.5);
    s.input(
        winui_wasm::scene::Input::Move {
            pointer: 1,
            x: 700.,
            y: 500.,
        },
        50.,
    )
    .unwrap();
    frame(&mut s, 50.);
    frame(&mut s, 2000.);
    assert_eq!(s.get(n).unwrap().presentation.scale_x, 1.);
    assert!(!s.snapshot().animating);
}
#[test]
fn bindings_use_dependency_order_layout_and_cycle_validation() {
    let mut s = scene();
    let a = s
        .create(s.root, NodeKind::Grid, json!({"width":80,"scaleX":2}))
        .unwrap();
    let b = s.create(s.root, NodeKind::Grid, json!({})).unwrap();
    let c = s.create(s.root, NodeKind::Grid, json!({})).unwrap();
    command(&mut s,b,json!({"command":"bind","expressions":{"scaleX":{"kind":"binary","operation":"divide","left":{"kind":"constant","value":1},"right":{"kind":"reference","node":a,"property":"scaleX"}}}})).unwrap();
    command(&mut s,c,json!({"command":"bind","expressions":{"translationX":{"kind":"reference","node":b,"property":"scaleX"}}})).unwrap();
    frame(&mut s, 0.);
    assert_eq!(s.get(b).unwrap().presentation.scale_x, 0.5);
    assert_eq!(s.get(c).unwrap().presentation.translation_x, 0.5);
    assert!(command(&mut s,a,json!({"command":"bind","expressions":{"scaleX":{"kind":"reference","node":c,"property":"translationX"}}})).is_err());
    patch(&mut s, a, json!({"scaleX":0}));
    frame(&mut s, 1.);
    assert_eq!(
        s.get(b).unwrap().presentation.scale_x,
        0.5,
        "singular frame retains finite presentation"
    );
    s.destroy(a).unwrap();
    frame(&mut s, 2.);
    assert_eq!(s.get(b).unwrap().presentation.scale_x, 1.);
    assert_eq!(s.get(c).unwrap().presentation.translation_x, 1.);
    command(&mut s, c, json!({"command":"clearExpressions"})).unwrap();
    assert_eq!(s.get(c).unwrap().presentation.translation_x, 0.);
}
#[test]
fn entrance_staggers_and_reposition_keeps_layout_and_hit_geometry_consistent() {
    let mut s = scene();
    let p=s.create(s.root,NodeKind::StackPanel,json!({"orientation":"Horizontal","motion":{"childrenTransitions":["Entrance","Reposition"]}})).unwrap();
    let a = s
        .create(p, NodeKind::Grid, json!({"width":75,"height":75}))
        .unwrap();
    let b = s
        .create(p, NodeKind::Grid, json!({"width":75,"height":75}))
        .unwrap();
    frame(&mut s, 0.);
    assert!(
        (s.get(b).unwrap().world.0[4] - s.get(b).unwrap().rect.x - 40.).abs() < 0.01,
        "rect={:?}, world={:?}",
        s.get(b).unwrap().rect,
        s.get(b).unwrap().world
    );
    assert!(s.snapshot().animating);
    frame(&mut s, 667.);
    assert!(s.snapshot().animating, "second child has 35ms stagger");
    frame(&mut s, 702.);
    assert!(!s.snapshot().animating);
    patch(&mut s, a, json!({"visible":false}));
    frame(&mut s, 702.);
    assert_eq!(s.get(b).unwrap().rect.x, 0.);
    assert!((s.get(b).unwrap().world.0[4] - 75.2).abs() < 0.01);
    frame(&mut s, 1069.);
    assert!(s.get(b).unwrap().world.0[4].abs() < 0.01);
    assert!(!s.snapshot().animating);
}
#[test]
fn deleted_node_is_immediately_invalid_but_its_visual_exits_then_releases() {
    let mut s = scene();
    let p = s
        .create(
            s.root,
            NodeKind::StackPanel,
            json!({"motion":{"childrenTransitions":["AddDelete"]}}),
        )
        .unwrap();
    let n = s
        .create(
            p,
            NodeKind::Grid,
            json!({"width":50,"height":50,"background":"#ff0000"}),
        )
        .unwrap();
    frame(&mut s, 600.);
    s.destroy(n).unwrap();
    assert!(s.get(n).is_err());
    assert!(s.snapshot().animating);
    let out = s.base_display_list();
    assert!(out
        .iter()
        .any(|d| matches!(d,Draw::Fill{color,..}if color=="#ff0000")));
    frame(&mut s, 700.);
    assert!(!s.snapshot().animating);
    assert!(!s
        .base_display_list()
        .iter()
        .any(|d| matches!(d,Draw::Fill{color,..}if color=="#ff0000")));
}
#[test]
fn backgrounds_crossfade_from_presented_value_and_theme_resources_resolve_locally() {
    let mut s = scene();
    let n = s
        .create(
            s.root,
            NodeKind::Grid,
            json!({"background":"#0000ff","motion":{"backgroundDuration":150}}),
        )
        .unwrap();
    frame(&mut s, 0.);
    patch(&mut s, n, json!({"background":"#ffff00"}));
    frame(&mut s, 0.);
    frame(&mut s, 75.);
    assert!(s
        .base_display_list()
        .iter()
        .any(|d| matches!(d,Draw::Fill{color,..}if color=="#808080ff")));
    patch(&mut s, n, json!({"background":"#0000ff"}));
    frame(&mut s, 75.);
    assert!(s
        .base_display_list()
        .iter()
        .any(|d| matches!(d,Draw::Fill{color,..}if color=="#808080ff")));
    s.set_policies(true, false);
    frame(&mut s, 76.);
    assert!(!s.snapshot().animating);
}
#[test]
fn connected_capture_survives_source_disposal_is_single_use_and_times_out() {
    let mut s = scene();
    let a = s
        .create(
            s.root,
            NodeKind::Grid,
            json!({"width":50,"height":50,"horizontalAlignment":"Left","verticalAlignment":"Top"}),
        )
        .unwrap();
    let b=s.create(s.root,NodeKind::Grid,json!({"width":100,"height":100,"margin":[200,0,0,0],"horizontalAlignment":"Left","verticalAlignment":"Top"})).unwrap();
    frame(&mut s, 0.);
    command(
        &mut s,
        a,
        json!({"command":"prepareConnected","key":"hero"}),
    )
    .unwrap();
    s.destroy(a).unwrap();
    assert!(command(
        &mut s,
        b,
        json!({"command":"startConnected","key":"hero","configuration":"Direct"})
    )
    .unwrap());
    frame(&mut s, 0.);
    assert!(s.get(b).unwrap().world.0[4].abs() < 0.01);
    assert!((s.get(b).unwrap().world.0[0] - 0.5).abs() < 0.01);
    assert!(!command(&mut s, b, json!({"command":"startConnected","key":"hero"})).unwrap());
    frame(&mut s, 200.);
    assert!((s.get(b).unwrap().world.0[4] - 200.).abs() < 0.01);
    assert!(!s.snapshot().animating);
    command(&mut s, b, json!({"command":"prepareConnected","key":"old"})).unwrap();
    assert_eq!(s.snapshot().next_frame_at, Some(2200.));
    frame(&mut s, 2200.);
    assert!(!command(&mut s, b, json!({"command":"startConnected","key":"old"})).unwrap());
}

#[test]
fn resource_background_theme_change_animates_without_recoloring_border_or_foreground() {
    let mut s = scene();
    let n=s.create(s.root,NodeKind::Border,json!({"width":100,"height":100,"background":{"resource":"SolidBackgroundFillColorBaseBrush"},"borderBrush":"#ff0000","borderThickness":[2,2,2,2],"theme":"Light","motion":{"backgroundDuration":150}})).unwrap();
    frame(&mut s, 0.);
    patch(&mut s, n, json!({"theme":"Dark"}));
    frame(&mut s, 0.);
    frame(&mut s, 75.);
    assert!(s.base_display_list().iter().any(|draw|matches!(draw,Draw::Border{color,background,..}if color=="#ff0000"&&background.as_deref()==Some("#8a8a8aff"))));
    frame(&mut s, 150.);
    assert!(!s.snapshot().animating);
}

#[test]
fn cancelling_active_connection_releases_snapshot_and_restores_target_transform() {
    let mut s = scene();
    let n = s
        .create(
            s.root,
            NodeKind::Grid,
            json!({"width":50,"height":50,"horizontalAlignment":"Left","verticalAlignment":"Top"}),
        )
        .unwrap();
    frame(&mut s, 0.);
    command(
        &mut s,
        n,
        json!({"command":"prepareConnected","key":"same-node"}),
    )
    .unwrap();
    patch(&mut s, n, json!({"margin":[200,0,0,0]}));
    frame(&mut s, 0.);
    command(
        &mut s,
        n,
        json!({"command":"startConnected","key":"same-node"}),
    )
    .unwrap();
    frame(&mut s, 0.);
    assert!(s.snapshot().animating);
    let root = s.root;
    command(
        &mut s,
        root,
        json!({"command":"cancelConnected","key":"same-node"}),
    )
    .unwrap();
    frame(&mut s, 1.);
    assert!(!s.snapshot().animating);
    assert_eq!(s.get(n).unwrap().world.0[4], 200.);
}

#[test]
fn outgoing_content_and_delete_snapshots_balance_nested_clip_and_layer_scopes() {
    let mut s = scene();
    let p = s
        .create(
            s.root,
            NodeKind::StackPanel,
            json!({"clip":true,"motion":{"childrenTransitions":["Content"]}}),
        )
        .unwrap();
    let n = s
        .create(p, NodeKind::TextBlock, json!({"text":"Before","height":40}))
        .unwrap();
    frame(&mut s, 700.);
    patch(&mut s, n, json!({"text":"After"}));
    frame(&mut s, 710.);
    let commands = s.base_display_list();
    let (mut saves, mut layers) = (0i32, 0i32);
    for command in commands {
        match command {
            Draw::Save | Draw::Clip { .. } | Draw::RoundedClip { .. } | Draw::CornerClip { .. } => {
                saves += 1
            }
            Draw::Restore => saves -= 1,
            Draw::Layer { .. } | Draw::WindowLayer { .. } | Draw::VectorLayer { .. } => layers += 1,
            Draw::EndLayer => layers -= 1,
            _ => {}
        }
        assert!(saves >= 0 && layers >= 0, "display list scope underflow");
    }
    assert_eq!(
        (saves, layers),
        (0, 0),
        "Canvas and WebGL require balanced captured clips"
    );
}
