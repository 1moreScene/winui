use serde_json::json;
use winui_wasm::{model::*, navigation::NavigationView, render::{display_list, Draw}};

fn view(mode: &str, reduced: bool) -> NavigationView {
    let mut view = NavigationView::new(serde_json::from_value(json!({
        "hasExternalContent": true, "paneDisplayMode": mode,
        "reducedMotion": reduced, "lightDismissOverlayMode": "On",
        "items": [{"id":"one","text":"One"}]
    })).unwrap()).unwrap();
    view.input(Input::Resize { width: 900., height: 600. }, 0.).unwrap();
    view
}

#[test]
fn external_page_stays_transparent_and_outside_the_closed_input_surface() {
    for mode in ["Left", "LeftCompact", "LeftMinimal", "Top"] {
        let mut view = view(mode, true);
        let snapshot = view.snapshot();
        assert!(!display_list(&view).iter().any(|d| matches!(d, Draw::ContentBackground { .. })));
        assert!(!display_list(&view).iter().any(|d| matches!(d, Draw::Text {text, ..} if text == "Sample Page 1")));
        assert!(!snapshot.host_clip.unwrap().iter().any(|r| r.contains(890., 590.)), "{mode} captures the DOM page");
        assert!(snapshot.light_dismiss.is_none());
    }
    let mut ordinary = NavigationView::new(Properties::default()).unwrap();
    assert!(ordinary.snapshot().host_clip.is_none());
    assert!(display_list(&ordinary).iter().any(|d| matches!(d, Draw::ContentBackground { .. })));
}

#[test]
fn rust_dismiss_hit_testing_and_cancellation_own_the_external_page_layer() {
    let mut view = view("LeftCompact", true);
    view.input(Input::Invoke { id: "$toggle".into() }, 0.).unwrap();
    let snapshot = view.snapshot();
    if let Some(material) = &snapshot.pane_material {
        assert!(!material.backdrop_available);
        assert_eq!(material.weight, 0.);
    }
    let layer = snapshot.light_dismiss.unwrap();
    assert!(layer.interactive && layer.opacity == 1.);
    assert!(snapshot.host_clip.unwrap().iter().any(|r| r.contains(890., 590.)));
    assert!(snapshot.parts.iter().any(|p| p.id == "$dismiss" && p.rect == layer.rect));
    view.input(Input::Down { x: 800., y: 300. }, 1.).unwrap();
    view.input(Input::Up { x: 800., y: 300. }, 2.).unwrap();
    let request = view.snapshot().events.into_iter().find(|e| e.kind == EventKind::PaneClosing).unwrap().request_id.unwrap();
    view.input(Input::ResolveClosing { request, cancel: true }, 3.).unwrap();
    assert!(view.snapshot().light_dismiss.unwrap().interactive);
    view.input(Input::Key { key: "Escape".into() }, 4.).unwrap();
    let request = view.snapshot().events.into_iter().find(|e| e.kind == EventKind::PaneClosing).unwrap().request_id.unwrap();
    view.input(Input::ResolveClosing { request, cancel: false }, 5.).unwrap();
    let snapshot = view.snapshot();
    assert!(!snapshot.is_pane_open && snapshot.light_dismiss.is_none());
    assert!(!snapshot.host_clip.unwrap().iter().any(|r| r.contains(890., 590.)));
}

#[test]
fn dismiss_paint_uses_native_theme_resources_and_desktop_auto_is_transparent() {
    let resources: serde_json::Value = serde_json::from_str(include_str!("../references/view-command-template.json")).unwrap();
    for theme in ["Light", "Dark", "HighContrast"] {
        let mut view = view("LeftMinimal", true);
        view.update(json!([{"theme":theme,"isPaneOpen":true}])).unwrap();
        let layer = view.snapshot().light_dismiss.unwrap();
        assert_eq!(layer.color, resources["palettes"][theme]["SplitViewLightDismissOverlayBackground"]["color"].as_str().unwrap());
        assert!(display_list(&view).iter().any(|d| matches!(d, Draw::Fill {rect,color,..} if *rect == layer.rect && *color == layer.color)));
        for mode in ["Auto", "Off"] {
            view.update(json!([{"lightDismissOverlayMode":mode}])).unwrap();
            let layer = view.snapshot().light_dismiss.unwrap();
            assert_eq!(layer.color, "#00000000");
            assert!(layer.interactive);
            assert!(!display_list(&view).iter().any(|d| matches!(d, Draw::Layer { .. })), "transparent dismiss must not allocate a viewport-sized offscreen layer");
        }
    }
}

#[test]
fn closing_layer_finishes_in_rust_and_reversal_keeps_opacity_continuous() {
    let mut view = view("LeftMinimal", false);
    view.input(Input::Invoke { id: "$toggle".into() }, 0.).unwrap();
    view.advance(80.); view.layout();
    let before = view.snapshot().light_dismiss.unwrap().opacity;
    assert!(before > 0. && before < 1.);
    view.input(Input::Invoke { id: "$dismiss".into() }, 80.).unwrap();
    let request = view.snapshot().events.into_iter().find(|e| e.kind == EventKind::PaneClosing).unwrap().request_id.unwrap();
    view.input(Input::ResolveClosing { request, cancel: false }, 80.).unwrap();
    let closing = view.snapshot().light_dismiss.unwrap();
    assert!(!closing.interactive && (closing.opacity-before).abs() < 0.001);
    view.advance(100.); view.layout();
    let before = view.snapshot().light_dismiss.unwrap().opacity;
    view.input(Input::Invoke { id: "$toggle".into() }, 100.).unwrap();
    assert!((view.snapshot().light_dismiss.unwrap().opacity-before).abs() < 0.001);
    view.advance(500.); view.layout();
    assert_eq!(view.snapshot().light_dismiss.unwrap().opacity, 1.);
    view.update(json!([{"isPaneVisible":false}])).unwrap();
    assert!(view.snapshot().host_clip.unwrap().is_empty());
    assert!(view.snapshot().light_dismiss.is_none());
}
