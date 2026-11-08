use serde_json::json;
use winui_wasm::{
    enums::*,
    scene::{AnimationOptions, Scene, Update},
};
fn options(duration: f64, delay: f64) -> AnimationOptions {
    AnimationOptions {
        duration,
        delay,
        easing: AnimationEasing::Linear,
        curve: None,
        ..Default::default()
    }
}
#[test]
fn tracks_delay_reverse_and_logical_targets_are_independent() {
    let mut s = Scene::new(Theme::Light, false);
    let n = s.create(s.root, NodeKind::Grid, json!({})).unwrap();
    let first = s
        .animate(
            n,
            json!({"translationX":200.,"opacity":0.2}),
            options(100., 50.),
        )
        .unwrap();
    assert_eq!(s.properties(n).unwrap().translation_x, 200.);
    s.advance(25.);
    assert_eq!(s.get(n).unwrap().presentation.translation_x, 0.);
    s.advance(100.);
    let v = s.get(n).unwrap().presentation;
    assert!((v.translation_x - 100.).abs() < 0.01);
    assert!((v.opacity - 0.6).abs() < 0.001);
    let second = s
        .animate(
            n,
            json!({"translationX":0.,"opacity":1.}),
            options(100., 0.),
        )
        .unwrap();
    assert!((s.get(n).unwrap().presentation.translation_x - v.translation_x).abs() < 0.01);
    let done = s.snapshot().animation_completions;
    assert_eq!(done.len(), 1);
    assert_eq!(done[0].id, first);
    assert_eq!(done[0].result, AnimationResult::Interrupted);
    s.advance(150.);
    assert!((s.get(n).unwrap().presentation.translation_x - 50.).abs() < 0.01);
    s.advance(200.);
    assert_eq!(s.get(n).unwrap().presentation.translation_x, 0.);
    let done = s.snapshot().animation_completions;
    assert_eq!(done[0].id, second);
    assert_eq!(done[0].result, AnimationResult::Completed);
    assert!(s.snapshot().animation_completions.is_empty());
}
#[test]
fn invalid_animation_and_atomic_property_batch_preserve_live_tracks() {
    let mut s = Scene::new(Theme::Light, false);
    let n = s.create(s.root, NodeKind::Button, json!({})).unwrap();
    s.animate(
        n,
        json!({"translationX":100.,"opacity":0.5}),
        options(100., 0.),
    )
    .unwrap();
    s.advance(50.);
    assert!(s
        .animate(n, json!({"opacity":2.}), options(100., 0.))
        .is_err());
    assert!(s
        .animate(n, json!({"width":500.}), options(100., 0.))
        .is_err());
    assert!(s
        .update(vec![
            Update {
                id: n,
                patch: json!({"opacity":0.8})
            },
            Update {
                id: n,
                patch: json!({"width":-1.})
            }
        ])
        .is_err());
    assert!(s.snapshot().animating);
    s.advance(75.);
    assert!((s.get(n).unwrap().presentation.translation_x - 75.).abs() < 0.01);
    s.update(vec![Update {
        id: n,
        patch: json!({"opacity":0.8}),
    }])
    .unwrap();
    assert!(!s.snapshot().animating);
    s.advance(200.);
    assert!((s.get(n).unwrap().presentation.translation_x - 75.).abs() < 0.01);
    assert_eq!(s.get(n).unwrap().presentation.opacity, 0.8);
}
#[test]
fn cancel_destroy_and_policy_changes_settle_once() {
    let mut s = Scene::new(Theme::Light, false);
    let p = s.create(s.root, NodeKind::Grid, json!({})).unwrap();
    let n = s.create(p, NodeKind::Grid, json!({})).unwrap();
    let a = s
        .animate(n, json!({"translationY":100.}), options(100., 0.))
        .unwrap();
    s.advance(50.);
    let current = s.get(n).unwrap().presentation.translation_y;
    s.cancel_animation(a);
    s.cancel_animation(a);
    s.advance(500.);
    assert_eq!(s.get(n).unwrap().presentation.translation_y, current);
    assert_eq!(s.snapshot().animation_completions.len(), 1);
    s.animate(n, json!({"translationY":0.}), options(100., 500.))
        .unwrap();
    s.set_policies(true, true);
    assert_eq!(s.get(n).unwrap().presentation.translation_y, 0.);
    assert_eq!(
        s.snapshot().animation_completions[0].result,
        AnimationResult::Completed
    );
    s.set_policies(false, false);
    s.animate(n, json!({"translationY":200.}), options(100., 0.))
        .unwrap();
    s.destroy(p).unwrap();
    assert_eq!(
        s.snapshot().animation_completions[0].result,
        AnimationResult::Disposed
    );
    assert!(!s.snapshot().animating);
    // Zero-duration tracks still honor delay unless motion is disabled by policy.
    let n = s.create(s.root, NodeKind::Grid, json!({})).unwrap();
    s.animate(n, json!({"translationX":10.}), options(0., 100.))
        .unwrap();
    s.advance(550.);
    assert_eq!(s.get(n).unwrap().presentation.translation_x, 0.);
    s.advance(600.);
    assert_eq!(s.get(n).unwrap().presentation.translation_x, 10.);
}
