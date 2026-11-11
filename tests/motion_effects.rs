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
        initial_velocity:None,
    };
    assert!((spring.value(1., 1.5, 0., 0.) - 1.).abs() < 1e-10);
    assert!(spring.value(1., 1.5, 0., 350.) > 1.5);
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
    frame(&mut s, 350.);
    assert!(s.get(n).unwrap().presentation.scale_x > 1.5);
    s.input(
        winui_wasm::scene::Input::Move {
            pointer: 1,
            x: 700.,
            y: 500.,
        },
        350.,
    )
    .unwrap();
    frame(&mut s, 350.);
    frame(&mut s, 4000.);
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
fn connected_start_waits_for_image_layout_and_can_be_cancelled_expired_or_removed() {
    for outcome in ["loaded","cancelled","expired","removed","unready-source"] {
        let mut s=scene();
        let source=s.create(s.root,NodeKind::Grid,json!({"width":50,"height":50})).unwrap();
        frame(&mut s,0.);
        command(&mut s,source,json!({"command":"prepareConnected","key":"late-image"})).unwrap();
        let target=s.create(s.root,NodeKind::Image,json!({"source":"late-image.png","horizontalAlignment":"Left","verticalAlignment":"Top"})).unwrap();
        frame(&mut s,10.);
        assert!(s.nodes[&target].rect.width<=0.||s.nodes[&target].rect.height<=0.);
        assert!(command(&mut s,target,json!({"command":"startConnected","key":"late-image"})).unwrap());
        assert!(!s.snapshot().animating);
        if outcome=="cancelled" {command(&mut s,target,json!({"command":"cancelConnected","key":"late-image"})).unwrap();}
        if outcome=="unready-source" {assert!(!command(&mut s,target,json!({"command":"prepareConnected","key":"late-image"})).unwrap());}
        if outcome=="removed" {s.destroy(target).unwrap();frame(&mut s,100.);continue;}
        s.images.insert("late-image.png".into(),[200.,100.]);s.invalidate(s.root,true);
        frame(&mut s,if outcome=="expired"{2100.}else{100.});
        assert_eq!(s.snapshot().animating,outcome=="loaded");
        frame(&mut s,2500.);
        let completed=s.events.iter().filter(|e|e.target==target&&e.kind==EventKind::ConnectedAnimationCompleted).count();
        assert_eq!(completed,usize::from(outcome=="loaded"));
    }
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
fn connected_coordinated_elements_share_geometry_and_complete_once() {
    let mut s = scene();
    let source=s.create(s.root,NodeKind::Grid,json!({"width":50,"height":50,"background":"#fa0000","horizontalAlignment":"Left","verticalAlignment":"Top"})).unwrap();
    let target=s.create(s.root,NodeKind::Grid,json!({"width":100,"height":100,"margin":[200,0,0,0],"background":"#0000fa","horizontalAlignment":"Left","verticalAlignment":"Top"})).unwrap();
    let related=s.create(s.root,NodeKind::Grid,json!({"width":80,"height":50,"margin":[320,0,0,0],"background":"#00fa00","horizontalAlignment":"Left","verticalAlignment":"Top"})).unwrap();
    frame(&mut s,0.);
    let ratio=s.get(source).unwrap().rect.width/s.get(target).unwrap().rect.width;
    let expected_x=(s.get(related).unwrap().world.0[4]-s.get(target).unwrap().world.0[4])*ratio;
    command(&mut s,source,json!({"command":"prepareConnected","key":"detail"})).unwrap();
    assert!(command(&mut s,target,json!({"command":"startConnected","key":"detail","configuration":"Direct","coordinated":[related]})).unwrap());
    frame(&mut s,0.);
    assert!((s.get(related).unwrap().world.0[0]-ratio).abs()<1e-6);
    assert!((s.get(related).unwrap().world.0[4]-expected_x).abs()<1e-6);
    fn red_count(draws:&[Draw])->usize{draws.iter().map(|d|match d {Draw::Fill{color,..} if color=="#fa0000"=>1,Draw::CrossFade{source,target,..}=>red_count(source)+red_count(target),_=>0}).sum()}
    let red=red_count(&s.base_display_list());
    assert_eq!(red,1,"only the captured source is drawn while its retained original is suppressed");
    frame(&mut s,200.);
    assert!((s.get(related).unwrap().world.0[4]-320.).abs()<1e-6);
    let events=s.snapshot().events.into_iter().filter(|e|e.kind==EventKind::ConnectedAnimationCompleted).collect::<Vec<_>>();
    assert_eq!(events.len(),1);
    assert_eq!(events[0].payload.as_ref().unwrap()["key"],"detail");
    frame(&mut s,201.);
    assert!(!s.snapshot().events.iter().any(|e|e.kind==EventKind::ConnectedAnimationCompleted));
    assert!(!s.snapshot().animating);
}

#[test]
fn invalid_coordinated_targets_do_not_consume_preparation_and_reduced_motion_completes() {
    let mut s=scene();
    let a=s.create(s.root,NodeKind::Grid,json!({"width":50,"height":50})).unwrap();
    let b=s.create(s.root,NodeKind::Grid,json!({"width":100,"height":100})).unwrap();
    frame(&mut s,0.);
    command(&mut s,a,json!({"command":"prepareConnected","key":"valid"})).unwrap();
    assert!(command(&mut s,b,json!({"command":"startConnected","key":"valid","coordinated":[b]})).is_err());
    s.set_policies(true,false);
    assert!(command(&mut s,b,json!({"command":"startConnected","key":"valid"})).unwrap());
    frame(&mut s,0.);
    assert!(!s.snapshot().animating);
    // snapshot drains notifications; prepare again to verify instant completion.
    command(&mut s,a,json!({"command":"prepareConnected","key":"instant"})).unwrap();
    command(&mut s,b,json!({"command":"startConnected","key":"instant"})).unwrap();
    assert!(s.snapshot().events.iter().any(|e|e.kind==EventKind::ConnectedAnimationCompleted&&e.payload.as_ref().unwrap()["key"]=="instant"));
}

#[test]
fn focusable_grid_activates_by_pointer_enter_and_space_without_button_chrome() {
    use winui_wasm::scene::Input;
    let mut s=scene();
    let grid=s.create(s.root,NodeKind::Grid,json!({"width":150,"height":120,"isTabStop":true,"horizontalAlignment":"Left","verticalAlignment":"Top"})).unwrap();
    s.create(grid,NodeKind::TextBlock,json!({"text":"Item 1"})).unwrap();
    frame(&mut s,0.);
    s.input(Input::Down{pointer:1,x:20.,y:20.},0.).unwrap();
    s.input(Input::Up{pointer:1,x:20.,y:20.},0.).unwrap();
    assert_eq!(s.snapshot().events.iter().filter(|e|e.kind==EventKind::Click).count(),1);
    for key in ["Enter"," "] {
        s.input(Input::KeyDown{key:key.into(),repeat:false},0.).unwrap();
        s.input(Input::KeyDown{key:key.into(),repeat:true},0.).unwrap();
        s.input(Input::KeyUp{key:key.into()},0.).unwrap();
        assert_eq!(s.snapshot().events.iter().filter(|e|e.kind==EventKind::Click).count(),1);
    }
    patch(&mut s,grid,json!({"enabled":false}));
    s.input(Input::Invoke{id:grid},0.).unwrap();
    assert!(!s.snapshot().events.iter().any(|e|e.kind==EventKind::Click));
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

#[test]
fn composition_depth_preserves_native_order_and_drives_theme_shadow() {
    let mut s=scene();
    let a=s.create(s.root,NodeKind::Button,json!({"width":50,"height":50,"translationZ":32,"themeShadow":true})).unwrap();
    let b=s.create(s.root,NodeKind::Button,json!({"width":50,"height":50})).unwrap();frame(&mut s,0.);
    let n=&s.nodes[&a];let (x,y)=n.world.point(25.,25.);assert_eq!(s.hit(x,y),Some(b),"native flat projection retains visual collection order");
    assert!(s.display_list().iter().any(|d|matches!(d,Draw::Shadow{..})));
    patch(&mut s,a,json!({"translationZ":0,"themeShadow":false}));frame(&mut s,1.);assert_eq!(s.hit(x,y),Some(b));
    command(&mut s,a,json!({"command":"prepareConnected","key":"z"})).unwrap();
    command(&mut s,b,json!({"command":"startConnected","key":"z","configuration":"Gravity"})).unwrap();frame(&mut s,199.);
    let target=s.create(s.root,NodeKind::Grid,json!({})).unwrap();
    command(&mut s,target,json!({"command":"bind","expressions":{"translationZ":{"kind":"reference","node":b,"property":"translationZ"}}})).unwrap();frame(&mut s,199.);
    assert!((s.nodes[&target].presentation.translation_z-32.).abs()<1e-8);
    assert!(s.display_list().iter().any(|d|matches!(d,Draw::Shadow{opacity,..} if *opacity>0.)));
    frame(&mut s,301.);assert!(s.display_list().iter().all(|d|!matches!(d,Draw::Shadow{..})));
}
#[test]
fn scaled_visual_overflow_does_not_change_layout_or_bypass_explicit_clip() {
    let mut s=scene();s.auto_height=true;s.resize(300.,105.,1.25).unwrap();
    let panel=s.create(s.root,NodeKind::StackPanel,json!({"padding":[12,12,12,12]})).unwrap();
    s.create(panel,NodeKind::TextBlock,json!({"text":"Hover","height":19,"margin":[0,0,0,12]})).unwrap();
    let button=s.create(panel,NodeKind::Button,json!({"width":100,"height":50})).unwrap();frame(&mut s,0.);
    let desired=s.nodes[&s.root].desired;patch(&mut s,button,json!({"scaleX":1.5,"scaleY":1.5}));frame(&mut s,1.);
    let bounds=s.surface_bounds();let n=&s.nodes[&button];let bottom=n.world.bounds(winui_wasm::model::Rect::new(0.,0.,100.,50.));
    assert!(bounds.y+bounds.height>=bottom.y+bottom.height);assert_eq!(s.nodes[&s.root].desired,desired);
    let (x,y)=n.world.point(20.,48.);assert_eq!(s.hit(x,y),Some(button));
    patch(&mut s,panel,json!({"clip":true}));frame(&mut s,2.);assert!(s.surface_bounds().height<bounds.height);assert_ne!(s.hit(x,y),Some(button));
}

#[test]
fn interop_hover_restarts_with_native_zero_initial_velocity() {
    let mut s=scene();let id=s.create(s.root,NodeKind::Button,json!({"width":100,"height":50,"motion":{"hoverSpring":{"period":100,"dampingRatio":0.2}}})).unwrap();frame(&mut s,0.);
    let n=&s.nodes[&id];let (x,y)=n.world.point(20.,20.);
    s.input(winui_wasm::scene::Input::Move{pointer:1,x,y},0.).unwrap();frame(&mut s,0.);frame(&mut s,20.);
    s.input(winui_wasm::scene::Input::Leave,20.).unwrap();frame(&mut s,20.);let start=s.nodes[&id].presentation.scale_x;frame(&mut s,20.01);
    assert!((s.nodes[&id].presentation.scale_x-start).abs()<1e-5);
    frame(&mut s,7000.);assert_eq!(s.nodes[&id].presentation.scale_x,1.);
}

#[test]
fn spring_trajectory_matches_independent_composition_capture() {
    let data:serde_json::Value=serde_json::from_str(include_str!("../references/validation/motion-spring-native.json")).unwrap();
    for case in data["cases"].as_array().unwrap(){
        let spring=SpringOptions{period:case["period"].as_f64().unwrap(),damping_ratio:case["dampingRatio"].as_f64().unwrap(),initial_velocity:Some(0.)};
        for sample in case["samples"].as_array().unwrap(){let expected=sample["scale"].as_f64().unwrap();let actual=spring.value(1.,1.5,0.,sample["timeMs"].as_f64().unwrap());assert!((actual-expected).abs()<0.006,"native Period={}, damping={}, t={}: {actual} vs {expected}",spring.period,spring.damping_ratio,sample["timeMs"]);}
    }
}
