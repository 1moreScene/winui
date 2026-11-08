use serde_json::json;
use winui_wasm::{
    enums::*,
    render::Draw,
    scene::{Input, Scene, Update},
    typography::{Font, Metrics, TextMeasurer},
};
struct Measure;
impl TextMeasurer for Measure {
    fn measure(&mut self, text: &str, font: &Font) -> Metrics {
        Metrics {
            width: text.chars().count() as f64 * font.size * 0.54,
            ascent: font.size * 0.8,
            descent: font.size * 0.2,
            ..Default::default()
        }
    }
}
fn frame(s: &mut Scene, t: f64) {
    s.advance(t);
    s.layout(&mut Measure);
}
fn patch(s: &mut Scene, id: u32, p: serde_json::Value) {
    s.update(vec![Update { id, patch: p }]).unwrap();
}
#[test]
fn border_inset_single_content_atomic_move_and_canvas_natural_measure() {
    let mut s = Scene::new(Theme::Light, true);
    s.resize(500., 300., 1.25).unwrap();
    let b = s
        .create(
            s.root,
            NodeKind::Border,
            json!({"width":180,"height":80,"borderThickness":[2,4,6,8],"padding":[10,10,10,10]}),
        )
        .unwrap();
    let content = s.create(b, NodeKind::Grid, json!({})).unwrap();
    assert!(s.create(b, NodeKind::Grid, json!({})).is_err());
    frame(&mut s, 0.);
    let r = s.nodes[&content].rect;
    assert!((r.x - 12.).abs() < 0.5);
    assert!((r.y - 14.).abs() < 0.5);
    assert!((r.width - 152.).abs() < 0.5);
    assert!((r.height - 48.).abs() < 0.5);
    let canvas = s
        .create(
            s.root,
            NodeKind::Canvas,
            json!({"width":100,"height":70,"horizontalAlignment":"Left","verticalAlignment":"Top"}),
        )
        .unwrap();
    let a = s
        .create(
            canvas,
            NodeKind::Button,
            json!({"width":80,"height":40,"canvasLeft":10.25,"canvasTop":5.25,"zIndex":2}),
        )
        .unwrap();
    let z = s
        .create(
            canvas,
            NodeKind::Button,
            json!({"width":80,"height":40,"canvasLeft":10.25,"canvasTop":5.25}),
        )
        .unwrap();
    frame(&mut s, 0.);
    assert!((s.nodes[&a].rect.x - 10.25).abs() < 1e-9);
    assert_eq!(s.hit(20., 20.), Some(a));
    patch(&mut s, z, json!({"zIndex":3}));
    frame(&mut s, 0.);
    assert_eq!(s.hit(20., 20.), Some(z));
    let natural = s
        .create(
            s.root,
            NodeKind::Canvas,
            json!({"horizontalAlignment":"Left","verticalAlignment":"Top"}),
        )
        .unwrap();
    s.create(natural, NodeKind::Grid, json!({"width":300,"height":200}))
        .unwrap();
    frame(&mut s, 0.);
    assert_eq!(s.nodes[&natural].desired, [0., 0.]);
}
#[test]
fn expander_events_motion_reversal_clipping_keyboard_and_collapse_visibility() {
    let mut s = Scene::new(Theme::Light, false);
    s.resize(500., 300., 1.).unwrap();
    let e = s
        .create(
            s.root,
            NodeKind::Expander,
            json!({"header":"Header","width":200,"verticalAlignment":"Top"}),
        )
        .unwrap();
    let b = s
        .create(e, NodeKind::Button, json!({"text":"Content","height":30}))
        .unwrap();
    frame(&mut s, 0.);
    assert_eq!(s.nodes[&e].rect.height, 48.);
    assert!(!s.nodes[&b].visible);
    s.input(Input::Invoke { id: e }, s.time).unwrap();
    frame(&mut s, 0.);
    assert_eq!(s.nodes[&e].rect.height, 111.);
    assert!(s
        .snapshot()
        .events
        .iter()
        .any(|v| v.kind == EventKind::Expanding && v.is_expanded == Some(true)));
    frame(&mut s, 100.);
    let before = s
        .snapshot()
        .nodes
        .into_iter()
        .find(|n| n.id == e)
        .unwrap()
        .expander
        .unwrap()
        .progress;
    patch(&mut s, e, json!({"isExpanded":false}));
    frame(&mut s, 100.);
    let after = s
        .snapshot()
        .nodes
        .into_iter()
        .find(|n| n.id == e)
        .unwrap()
        .expander
        .unwrap()
        .progress;
    assert!((before - after).abs() < 1e-9);
    frame(&mut s, 300.);
    assert_eq!(s.nodes[&e].rect.height, 48.);
    assert!(!s.nodes[&b].visible);
    assert_eq!(s.hit(20., 70.), None);
    s.input(Input::Focus { id: e }, s.time).unwrap();
    s.input(
        Input::KeyDown {
            key: " ".into(),
            repeat: false,
        },
        s.time,
    )
    .unwrap();
    s.input(Input::KeyUp { key: " ".into() }, s.time).unwrap();
    frame(&mut s, 301.);
    assert!(s.nodes[&e].props.is_expanded);
    patch(&mut s, e, json!({"expandDirection":"Up"}));
    frame(&mut s, 700.);
    let snap = s
        .snapshot()
        .nodes
        .into_iter()
        .find(|n| n.id == e)
        .unwrap()
        .expander
        .unwrap();
    assert_eq!(snap.header.y, 63.);
    assert_eq!(snap.clip.y, 0.);
    patch(&mut s, e, json!({"isExpanded":false}));
    frame(&mut s, 868.);
    assert!(
        s.nodes[&b].visible,
        "CollapseDown retains content until the source 200ms visibility key"
    );
    frame(&mut s, 901.);
    assert!(!s.nodes[&b].visible);
    let mut saves = 0;
    for d in s.display_list() {
        match d {
            Draw::Save | Draw::Clip { .. } | Draw::RoundedClip { .. } => saves += 1,
            Draw::Restore => {
                saves -= 1;
                assert!(saves >= 0);
            }
            _ => {}
        }
    }
    assert_eq!(saves, 0);
}
#[test]
fn badge_defaults_precedence_width_and_invalid_atomic_value() {
    let mut s = Scene::new(Theme::Dark, true);
    s.resize(200., 200., 1.).unwrap();
    let b = s
        .create(
            s.root,
            NodeKind::InfoBadge,
            json!({"horizontalAlignment":"Left","verticalAlignment":"Top"}),
        )
        .unwrap();
    frame(&mut s, 0.);
    assert_eq!(s.nodes[&b].desired, [4., 4.]);
    patch(&mut s, b, json!({"value":5,"glyph":"X"}));
    frame(&mut s, 0.);
    assert_eq!(s.nodes[&b].desired, [16., 16.]);
    assert_eq!(s.nodes[&b].text.lines[0].text, "5");
    patch(&mut s, b, json!({"value":123}));
    frame(&mut s, 0.);
    assert_eq!(s.nodes[&b].desired, [26., 16.]);
    assert!(s
        .update(vec![Update {
            id: b,
            patch: json!({"value":-2,"badgeStyle":"Critical"})
        }])
        .is_err());
    assert_eq!(s.nodes[&b].props.value, 123.);
    patch(&mut s, b, json!({"value":-1}));
    frame(&mut s, 0.);
    assert_eq!(s.nodes[&b].text.lines[0].text, "X");
    assert!(!s.nodes[&b].props.is_tab_stop);
}
#[test]
fn hyperlink_shares_button_capture_events_and_rejects_bad_uri() {
    let mut s = Scene::new(Theme::Light, true);
    s.resize(200., 100., 1.).unwrap();
    let h = s
        .create(s.root, NodeKind::HyperlinkButton, json!({"text":"Link"}))
        .unwrap();
    frame(&mut s, 0.);
    s.input(Input::Focus { id: h }, s.time).unwrap();
    s.input(
        Input::KeyDown {
            key: "Enter".into(),
            repeat: false,
        },
        s.time,
    )
    .unwrap();
    s.input(
        Input::KeyUp {
            key: "Enter".into(),
        },
        s.time,
    )
    .unwrap();
    frame(&mut s, 1.);
    assert!(s
        .snapshot()
        .events
        .iter()
        .any(|e| e.kind == EventKind::Click && e.target == h));
    assert!(s
        .update(vec![Update {
            id: h,
            patch: json!({"navigateUri":"javascript:alert(1)"})
        }])
        .is_err());
    patch(
        &mut s,
        h,
        json!({"navigateUri":"https://example.com","enabled":false}),
    );
    frame(&mut s, 2.);
    s.input(Input::Invoke { id: h }, s.time).unwrap();
    assert!(s
        .snapshot()
        .events
        .iter()
        .all(|e| e.kind != EventKind::Click));
}
