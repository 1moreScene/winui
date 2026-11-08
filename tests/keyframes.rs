use serde_json::json;
use winui_wasm::{
    enums::*,
    scene::{AnimationOptions, Scene},
};
#[test]
fn multi_property_keyframes_hold_and_reverse_from_presented_values() {
    let mut s = Scene::new(Theme::Light, false);
    let id = s.create(s.root, NodeKind::Grid, json!({})).unwrap();
    let options = AnimationOptions {
        duration: 1000.,
        easing: AnimationEasing::Linear,
        ..Default::default()
    };
    s.animate(
        id,
        json!({"translationX":[{"offset":0.4,"value":200},{"offset":1,"value":100}],
        "opacity":[{"offset":0.4,"value":0.5,"easing":"Discrete"},{"offset":1,"value":1}]}),
        options.clone(),
    )
    .unwrap();
    s.advance(200.);
    assert!((s.get(id).unwrap().presentation.translation_x - 100.).abs() < 0.01);
    assert_eq!(s.get(id).unwrap().presentation.opacity, 1.);
    s.advance(400.);
    assert_eq!(s.get(id).unwrap().presentation.opacity, 0.5);
    assert_eq!(s.properties(id).unwrap().translation_x, 100.);
    s.animate(id, json!({"translationX":0}), options).unwrap();
    assert!((s.get(id).unwrap().presentation.translation_x - 200.).abs() < 0.01);
    s.advance(900.);
    assert!((s.get(id).unwrap().presentation.translation_x - 100.).abs() < 0.01);
    // Per-frame easing overrides the global cubic; a global cubic overrides
    // the optional family. These are separate precedence layers.
    s.animate(
        id,
        json!({"rotation":[{"offset":1,"value":180,"easing":"Linear"}]}),
        AnimationOptions {
            duration: 1000.,
            curve: Some([0.8, 0., 0.2, 1.]),
            easing_function: Some(EasingFunction::Quadratic),
            easing_mode: EasingMode::EaseIn,
            ..Default::default()
        },
    )
    .unwrap();
    s.advance(1150.);
    assert!((s.get(id).unwrap().presentation.rotation - 45.).abs() < 0.01);
    s.animate(
        id,
        json!({"rotation":145}),
        AnimationOptions {
            duration: 1000.,
            curve: Some([0., 0., 1., 1.]),
            easing_function: Some(EasingFunction::Quadratic),
            easing_mode: EasingMode::EaseIn,
            ..Default::default()
        },
    )
    .unwrap();
    s.advance(1400.);
    assert!((s.get(id).unwrap().presentation.rotation - 70.).abs() < 0.01);
}
#[test]
fn malformed_keyframes_do_not_interrupt_live_animation() {
    let mut s = Scene::new(Theme::Light, false);
    let id = s.create(s.root, NodeKind::Grid, json!({})).unwrap();
    s.animate(id, json!({"translationX":100}), Default::default())
        .unwrap();
    for invalid in [
        json!({"translationX":[]}),
        json!({"translationX":[{"offset":0.4,"value":50}]}),
        json!({"translationX":[{"offset":0.8,"value":50},{"offset":0.2,"value":0},{"offset":1,"value":10}]}),
        json!({"opacity":[{"offset":1,"value":2}]}),
    ] {
        assert!(s.animate(id, invalid, Default::default()).is_err());
    }
    assert!(s.snapshot().animating);
    assert!(s.snapshot().animation_completions.is_empty());
}
