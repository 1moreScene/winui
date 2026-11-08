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
            descent: 0.,
            ..Default::default()
        }
    }
}
fn scene() -> Scene {
    let mut s = Scene::new(Theme::Light, true);
    s.resize(800., 500., 1.25).unwrap();
    s
}
#[test]
fn every_compact_template_paints_all_supported_themes_and_releases_reparented_flyouts() {
    for theme in [Theme::Light, Theme::Dark, Theme::HighContrast] {
        for kind in [
            NodeKind::PersonPicture,
            NodeKind::RatingControl,
            NodeKind::InfoBar,
            NodeKind::SplitButton,
            NodeKind::ToggleSplitButton,
        ] {
            let mut s = Scene::new(theme, true);
            s.resize(800., 500., 1.25).unwrap();
            s.create(s.root,kind,json!({"isOpen":true,"displayName":"Jane Doe","title":"Title","message":"Message","text":"Choose"})).unwrap();
            s.layout(&mut Measure);
            assert!(!s.display_list().is_empty());
        }
    }
    let mut s = scene();
    let split = s.create(s.root, NodeKind::SplitButton, json!({})).unwrap();
    let flyout = s.create(s.root, NodeKind::Flyout, json!({})).unwrap();
    let child = s
        .create(flyout, NodeKind::Button, json!({"text":"Action"}))
        .unwrap();
    s.reparent(flyout, split, None).unwrap();
    assert_eq!(s.nodes[&split].props.flyout_target, Some(flyout));
    s.destroy(flyout).unwrap();
    assert!(!s.nodes.contains_key(&child));
    assert_eq!(s.nodes[&split].props.flyout_target, None);
}
fn input(s: &mut Scene, v: serde_json::Value, time: f64) {
    s.input(serde_json::from_value::<Input>(v).unwrap(), time)
        .unwrap();
    s.layout(&mut Measure);
}
#[test]
fn infobar_measures_its_close_viewbox_and_glyph_at_fractional_dpi_and_after_reopen() {
    for dpr in [1., 1.25, 1.5, 2.] {
        let mut s = scene();
        s.resize(800., 500., dpr).unwrap();
        let bar = s
            .create(
                s.root,
                NodeKind::InfoBar,
                json!({"isOpen":true,"width":400,"title":"Title","message":"Message"}),
            )
            .unwrap();
        s.layout(&mut Measure);
        let close = s.nodes[&bar].children[0];
        let view = s.nodes[&close].children[0];
        let glyph = s.nodes[&view].children[0];
        assert_eq!(s.nodes[&view].kind, NodeKind::Viewbox);
        assert_eq!(s.nodes[&view].props.width, Some(16.));
        assert!(s.nodes[&glyph].desired[0] > 0.);
        assert!(!s.nodes[&glyph].text.lines.is_empty());
        assert!((s.nodes[&close].rect.width - (38. * dpr).round() / dpr).abs() < 0.001);
        assert!(s
            .display_list()
            .iter()
            .any(|d| matches!(d,winui_wasm::render::Draw::Text{text,..} if text=="\u{e711}")));
        s.update(vec![Update {
            id: bar,
            patch: json!({"isOpen":false}),
        }])
        .unwrap();
        s.layout(&mut Measure);
        let request = s.events.last().unwrap().request_id.unwrap();
        input(
            &mut s,
            json!({"kind":"resolveOverlay","id":bar,"request":request,"cancel":false}),
            1.,
        );
        s.update(vec![Update {
            id: bar,
            patch: json!({"isOpen":true}),
        }])
        .unwrap();
        s.layout(&mut Measure);
        assert!(s.nodes[&glyph].visible);
        assert!(s.nodes[&glyph].desired[0] > 0.);
    }
}
#[test]
fn native_defaults_coercion_and_derived_initials_are_real_properties() {
    let mut s = scene();
    let r = s
        .create(s.root, NodeKind::RatingControl, json!({}))
        .unwrap();
    assert_eq!(s.nodes[&r].props.value, -1.);
    assert_eq!(s.nodes[&r].props.placeholder_value, -1.);
    assert!(s.nodes[&r].props.is_clear_enabled);
    s.update(vec![Update {
        id: r,
        patch: json!({"maxRating":0,"value":0,"placeholderValue":0}),
    }])
    .unwrap();
    assert_eq!(s.nodes[&r].props.max_rating, 1);
    assert_eq!(s.nodes[&r].props.value, 1.);
    assert_eq!(s.nodes[&r].props.placeholder_value, 1.);
    for (name, expected) in [
        ("Jane Doe", "JD"),
        ("Ada Lovelace (work)", "AL"),
        ("张三", ""),
        ("-Jean Dupont", "JD"),
        ("Иван Петров", "ИП"),
    ] {
        let p = s
            .create(
                s.root,
                NodeKind::PersonPicture,
                json!({"displayName":name,"width":96,"height":64}),
            )
            .unwrap();
        s.layout(&mut Measure);
        let n = s.snapshot().nodes.into_iter().find(|n| n.id == p).unwrap();
        assert_eq!(n.compact.unwrap().actual_initials, expected);
        assert_eq!(n.rect.width, 64.);
        s.destroy(p).unwrap();
    }
}
#[test]
fn info_bar_close_button_and_programmatic_close_preserve_reason_and_cancellation() {
    let mut s = scene();
    let id = s
        .create(
            s.root,
            NodeKind::InfoBar,
            json!({"width":400,"isOpen":true,"title":"Title","message":"Message"}),
        )
        .unwrap();
    s.layout(&mut Measure);
    let close = s.nodes[&id].children[0];
    input(&mut s, json!({"kind":"invoke","id":close}), 1.);
    assert_eq!(
        s.events.iter().map(|e| e.kind).collect::<Vec<_>>(),
        [EventKind::CloseButtonClick, EventKind::Closing]
    );
    assert_eq!(
        s.events[1].close_reason,
        Some(InfoBarCloseReason::CloseButton)
    );
    let request = s.events[1].request_id.unwrap();
    s.events.clear();
    input(
        &mut s,
        json!({"kind":"resolveOverlay","id":id,"request":request,"cancel":true}),
        2.,
    );
    assert!(s.nodes[&id].props.is_open);
    assert!(s.events.is_empty());
    s.update(vec![Update {
        id,
        patch: json!({"isOpen":false}),
    }])
    .unwrap();
    s.layout(&mut Measure);
    let event = s.events.last().unwrap();
    assert_eq!(event.close_reason, Some(InfoBarCloseReason::Programmatic));
    assert!(
        s.nodes[&close].props.visible,
        "pending cancellable close keeps its button visible"
    );
    let request = event.request_id.unwrap();
    s.events.clear();
    input(
        &mut s,
        json!({"kind":"resolveOverlay","id":id,"request":request-1,"cancel":false}),
        3.,
    );
    assert!(s.nodes[&id].props.is_open);
    input(
        &mut s,
        json!({"kind":"resolveOverlay","id":id,"request":request,"cancel":false}),
        4.,
    );
    assert!(!s.nodes[&id].props.is_open);
    assert_eq!(s.nodes[&id].rect.height, 0.);
    assert_eq!(s.events[0].kind, EventKind::Closed);
}
#[test]
fn rating_pointer_drag_clear_fractional_keyboard_and_readonly_follow_cpp() {
    let mut s = scene();
    let id = s
        .create(
            s.root,
            NodeKind::RatingControl,
            json!({"horizontalAlignment":"Left","verticalAlignment":"Top"}),
        )
        .unwrap();
    s.layout(&mut Measure);
    input(&mut s, json!({"kind":"down","x":60,"y":16,"pointer":1}), 1.);
    input(&mut s, json!({"kind":"up","x":60,"y":16,"pointer":1}), 2.);
    assert_eq!(s.nodes[&id].props.value, 3.);
    input(&mut s, json!({"kind":"down","x":60,"y":16,"pointer":1}), 3.);
    input(&mut s, json!({"kind":"up","x":-20,"y":16,"pointer":1}), 4.);
    assert_eq!(s.nodes[&id].props.value, -1.);
    input(
        &mut s,
        json!({"kind":"keyDown","key":"ArrowRight","repeat":false}),
        5.,
    );
    assert_eq!(s.nodes[&id].props.value, 1.);
    s.update(vec![Update {
        id,
        patch: json!({"value":3.5}),
    }])
    .unwrap();
    input(
        &mut s,
        json!({"kind":"keyDown","key":"ArrowLeft","repeat":false}),
        6.,
    );
    assert_eq!(s.nodes[&id].props.value, 3.);
    s.update(vec![Update {
        id,
        patch: json!({"isReadOnly":true}),
    }])
    .unwrap();
    input(
        &mut s,
        json!({"kind":"keyDown","key":"End","repeat":false}),
        7.,
    );
    assert_eq!(s.nodes[&id].props.value, 3.);
}
#[test]
fn split_primary_secondary_keyboard_and_nested_flyout_have_distinct_actions() {
    let mut s = scene();
    let id = s
        .create(
            s.root,
            NodeKind::ToggleSplitButton,
            json!({"text":"Choose","horizontalAlignment":"Left","verticalAlignment":"Top"}),
        )
        .unwrap();
    let menu = s
        .create(
            id,
            NodeKind::MenuFlyout,
            json!({"menuItems":[{"id":"one","text":"One"}]}),
        )
        .unwrap();
    s.layout(&mut Measure);
    assert_eq!(s.nodes[&id].props.flyout_target, Some(menu));
    input(&mut s, json!({"kind":"down","x":10,"y":16,"pointer":1}), 1.);
    input(&mut s, json!({"kind":"up","x":10,"y":16,"pointer":1}), 2.);
    assert_eq!(s.nodes[&id].props.is_checked, Some(true));
    assert_eq!(
        s.events
            .iter()
            .filter(|e| e.target == id)
            .map(|e| e.kind)
            .collect::<Vec<_>>(),
        [
            EventKind::GotFocus,
            EventKind::IsCheckedChanged,
            EventKind::Click
        ]
    );
    s.events.clear();
    let x = s.nodes[&id].rect.width - 10.;
    input(&mut s, json!({"kind":"down","x":x,"y":16,"pointer":1}), 3.);
    input(&mut s, json!({"kind":"up","x":x,"y":16,"pointer":1}), 4.);
    assert!(s.nodes[&menu].props.is_open);
    assert_eq!(s.nodes[&id].props.is_checked, Some(true));
    assert!(!s
        .events
        .iter()
        .any(|e| e.target == id && e.kind == EventKind::Click));
    s.update(vec![Update {
        id: menu,
        patch: json!({"isOpen":false}),
    }])
    .unwrap();
    input(&mut s, json!({"kind":"focus","id":id}), 5.);
    input(&mut s, json!({"kind":"keyUp","key":"F4"}), 6.);
    assert!(s.nodes[&menu].props.is_open);
    s.destroy(id).unwrap();
    assert!(!s.nodes.contains_key(&menu));
}
#[test]
fn floating_content_breaks_button_input_boundary_but_ordinary_content_does_not() {
    let mut s = scene();
    let split = s
        .create(s.root, NodeKind::SplitButton, json!({"text":"Split"}))
        .unwrap();
    assert!(s.create(split, NodeKind::Button, json!({})).is_err());
    let flyout = s.create(split, NodeKind::Flyout, json!({})).unwrap();
    let button = s
        .create(flyout, NodeKind::Button, json!({"text":"Action"}))
        .unwrap();
    s.layout(&mut Measure);
    assert!(s.nodes.contains_key(&button));
}
#[test]
fn image_sources_share_lifecycle_and_invalid_batch_is_atomic() {
    let mut s = scene();
    let p = s
        .create(
            s.root,
            NodeKind::PersonPicture,
            json!({"profilePicture":"same.png","badgeImageSource":"badge.png"}),
        )
        .unwrap();
    let r = s
        .create(
            s.root,
            NodeKind::RatingControl,
            json!({"ratingItemInfo":{"kind":"Image","image":"same.png","unsetImage":"empty.png"}}),
        )
        .unwrap();
    assert_eq!(s.image_sources().len(), 3);
    assert!(s
        .update(vec![
            Update {
                id: p,
                patch: json!({"displayName":"new"})
            },
            Update {
                id: r,
                patch: json!({"maxRating":101})
            }
        ])
        .is_err());
    assert!(s.nodes[&p].props.display_name.is_empty());
    let split = s.create(s.root, NodeKind::SplitButton, json!({})).unwrap();
    assert!(s
        .update(vec![Update {
            id: split,
            patch: json!({"flyoutTarget":p,"text":"changed"})
        }])
        .is_err());
    assert!(s.nodes[&split].props.text.is_empty());
    s.destroy(p).unwrap();
    assert_eq!(s.image_sources().len(), 2);
    s.destroy(r).unwrap();
    assert!(s.image_sources().is_empty());
}
#[test]
fn rating_custom_state_fallback_and_rtl_pointer_use_the_same_source_geometry() {
    let mut s = scene();
    let r=s.create(s.root,NodeKind::RatingControl,json!({"flowDirection":"RightToLeft","placeholderValue":2,"ratingItemInfo":{"kind":"Font","glyph":"X","unsetGlyph":"o","placeholderGlyph":"P","pointerOverGlyph":"Q","disabledGlyph":"D"}})).unwrap();
    s.layout(&mut Measure);
    let texts = |s: &mut Scene| {
        s.display_list()
            .into_iter()
            .filter_map(|d| match d {
                winui_wasm::render::Draw::Text { text, .. } => Some(text),
                _ => None,
            })
            .collect::<Vec<_>>()
    };
    assert!(texts(&mut s).iter().any(|t| t == "P"));
    let rect = s.nodes[&r].rect;
    let x = rect.x + rect.width - 8.;
    let y = rect.y + 16.;
    input(&mut s, json!({"kind":"move","pointer":1,"x":x,"y":y}), 1.);
    // PointerOverPlaceholder falls back to Placeholder, not the Set glyph.
    assert!(texts(&mut s).iter().any(|t| t == "P"));
    input(&mut s, json!({"kind":"down","pointer":1,"x":x,"y":y}), 2.);
    input(&mut s, json!({"kind":"up","pointer":1,"x":x,"y":y}), 3.);
    assert_eq!(s.nodes[&r].props.value, 1.);
    assert!(texts(&mut s).iter().any(|t| t == "Q"));
    s.update(vec![Update {
        id: r,
        patch: json!({"enabled":false}),
    }])
    .unwrap();
    s.layout(&mut Measure);
    assert!(texts(&mut s).iter().any(|t| t == "D"));
}
#[test]
fn shared_slider_tooltip_closes_on_release_and_capture_cancel_then_reopens_for_keyboard() {
    let mut s = scene();
    let id = s
        .create(s.root, NodeKind::Slider, json!({"width":220}))
        .unwrap();
    s.layout(&mut Measure);
    let tip = s.nodes[&id]
        .children
        .iter()
        .copied()
        .find(|c| s.nodes[c].kind == NodeKind::ToolTip)
        .unwrap();
    let r = s.nodes[&id].rect;
    let x = r.x + r.width / 2.;
    let y = r.y + r.height / 2.;
    input(&mut s, json!({"kind":"down","pointer":1,"x":x,"y":y}), 1.);
    assert!(s.nodes[&tip].props.is_open);
    input(
        &mut s,
        json!({"kind":"up","pointer":1,"x":x+300.,"y":y}),
        2.,
    );
    assert!(!s.nodes[&tip].props.is_open);
    input(
        &mut s,
        json!({"kind":"keyDown","key":"ArrowRight","repeat":false}),
        3.,
    );
    assert!(s.nodes[&tip].props.is_open);
    input(&mut s, json!({"kind":"down","pointer":1,"x":x,"y":y}), 4.);
    input(&mut s, json!({"kind":"cancel","pointer":1}), 5.);
    assert!(!s.nodes[&tip].props.is_open);
}
#[test]
fn split_content_is_clipped_before_template_border_and_native_flyout_is_left_aligned() {
    let mut s = scene();
    let canvas = s.create(s.root, NodeKind::Canvas, json!({})).unwrap();
    let split = s
        .create(
            canvas,
            NodeKind::SplitButton,
            json!({"width":100,"height":32,"canvasLeft":180,"canvasTop":80,"padding":[0,0,0,0]}),
        )
        .unwrap();
    s.create(
        split,
        NodeKind::Border,
        json!({"width":400,"height":80,"background":"#ff0000","cornerRadii":[4,0,0,4]}),
    )
    .unwrap();
    let flyout = s
        .create(split, NodeKind::Flyout, json!({"width":200}))
        .unwrap();
    s.create(flyout, NodeKind::TextBlock, json!({"text":"Content"}))
        .unwrap();
    s.layout(&mut Measure);
    let commands = s.display_list();
    let red=commands.iter().position(|d|matches!(d,winui_wasm::render::Draw::Border{background:Some(c),radius,..} if c=="#ff0000"&&*radius==[4.,0.,0.,4.])).unwrap();
    assert!(commands[..red].iter().any(
        |d| matches!(d,winui_wasm::render::Draw::Clip{rect} if rect.width<100.&&rect.height==32.)
    ));
    assert!(commands[red+1..].iter().any(|d|matches!(d,winui_wasm::render::Draw::Fill{rect,..} if rect.width==1./1.25&&rect.height==32.)));
    input(
        &mut s,
        json!({"kind":"splitInvoke","id":split,"secondary":true}),
        1.,
    );
    assert!((s.nodes[&flyout].rect.x - s.nodes[&split].world.0[4]).abs() < 1.);
    assert_eq!(
        s.nodes[&flyout].props.placement,
        OverlayPlacement::BottomEdgeAlignedLeft
    );
    assert!(s
        .update(vec![Update {
            id: split,
            patch: json!({"cornerRadii":[-1,0,0,0]})
        }])
        .is_err());
}
