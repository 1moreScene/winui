use serde_json::json;
use winui_wasm::{
    enums::*,
    icons,
    render::Draw,
    scene::{Scene, Update},
    typography::{Font, Metrics, TextMeasurer},
};
struct Measure;
impl TextMeasurer for Measure {
    fn measure(&mut self, text: &str, font: &Font) -> Metrics {
        Metrics {
            width: text.chars().count() as f64 * font.size,
            ascent: font.size * 0.8,
            descent: font.size * 0.2,
            ..Default::default()
        }
    }
}
fn scene() -> Scene {
    let mut s = Scene::new(Theme::Light, true);
    s.resize(500., 300., 1.).unwrap();
    s
}
#[test]
fn path_commands_fill_rules_native_bounds_and_atomic_rejection() {
    let fixtures: serde_json::Value =
        serde_json::from_str(include_str!("../references/icons-metrics.json")).unwrap();
    for row in fixtures["rows"]
        .as_array()
        .unwrap()
        .iter()
        .filter(|r| r["kind"] == "PathIcon")
    {
        let mut s = scene();
        let id = s
            .create(s.root, NodeKind::PathIcon, row["props"].clone())
            .unwrap();
        s.layout(&mut Measure);
        assert_eq!(
            s.nodes[&id].desired,
            [
                row["desired"][0].as_f64().unwrap(),
                row["desired"][1].as_f64().unwrap()
            ]
        );
    }
    let mut s = scene();
    let id = s
        .create(
            s.root,
            NodeKind::PathIcon,
            json!({"data":"F1 M1 2 Q3 4 5 6 T7 8 H10 V20 Z"}),
        )
        .unwrap();
    let old = s.nodes[&id].props.data.clone();
    assert!(s
        .update(vec![Update {
            id,
            patch: json!({"data":"M broken","opacity":0.5})
        }])
        .is_err());
    assert_eq!(s.nodes[&id].props.data, old);
    assert_eq!(s.nodes[&id].props.opacity, 1.);
    assert!(!s.nodes[&id].icon_path.as_ref().unwrap().even_odd);
    assert!(icons::parse_path("F0 M0 0L10 0 10 10Z").unwrap().even_odd);
    assert!(icons::parse_path("M0 0 L1e20 1").is_err());
    assert!(icons::parse_path("M0 0 C1e999 0 0 0 1 1").is_err());
    assert!(icons::parse_path("").unwrap().commands.is_empty());
}
#[test]
fn icon_defaults_glyph_mapping_and_noninteractive_content_contract() {
    let mut s = scene();
    for kind in [
        NodeKind::FontIcon,
        NodeKind::SymbolIcon,
        NodeKind::PathIcon,
        NodeKind::BitmapIcon,
        NodeKind::ImageIcon,
    ] {
        let id = s.create(s.root, kind, json!({})).unwrap();
        let n = &s.nodes[&id];
        assert!(!n.props.is_tab_stop);
        assert_eq!(n.props.font_size, 20.);
        if kind == NodeKind::SymbolIcon {
            assert_eq!(n.props.symbol, Some(Symbol::Emoji));
        }
        assert!(s.create(id, NodeKind::Grid, json!({})).is_err());
    }
    assert_eq!(icons::symbol_glyph(Symbol::Accept), "\u{e8fb}");
    assert_eq!(icons::contract()["symbols"].as_object().unwrap().len(), 197);
    let button = s
        .create(s.root, NodeKind::Button, json!({"foreground":"#0067c0"}))
        .unwrap();
    s.create(button, NodeKind::SymbolIcon, json!({"symbol":"Accept"}))
        .unwrap();
    s.layout(&mut Measure);
    assert!(s
        .display_list()
        .iter()
        .any(|d| matches!(d,Draw::Text{text,color,..} if text=="\u{e8fb}" && color=="#0067c0")));
}
#[test]
fn bitmap_alpha_mask_image_colors_uniform_layout_and_shared_lifetime() {
    let mut s = scene();
    s.image_ready("image.png".into(), [90., 90.]).unwrap();
    let b=s.create(s.root,NodeKind::BitmapIcon,json!({"uriSource":"image.png","width":50,"horizontalAlignment":"Left","verticalAlignment":"Top","foreground":"#0067c0"})).unwrap();
    let i=s.create(s.root,NodeKind::ImageIcon,json!({"source":"image.png","width":30,"horizontalAlignment":"Left","verticalAlignment":"Top"})).unwrap();
    s.layout(&mut Measure);
    assert_eq!(s.nodes[&b].desired, [50., 50.]);
    assert_eq!(s.nodes[&i].desired, [30., 30.]);
    assert_eq!(s.image_sources().len(), 1);
    let commands = s.display_list();
    assert!(commands
        .iter()
        .any(|d| matches!(d,Draw::TintedImage{color,..} if color=="#0067c0")));
    assert!(commands.iter().any(|d| matches!(d, Draw::Image { .. })));
    s.update(vec![Update {
        id: b,
        patch: json!({"showAsMonochrome":false}),
    }])
    .unwrap();
    s.layout(&mut Measure);
    assert!(!s
        .display_list()
        .iter()
        .any(|d| matches!(d, Draw::TintedImage { .. })));
    s.destroy(b).unwrap();
    assert_eq!(s.image_sources().len(), 1);
    s.destroy(i).unwrap();
    assert!(s.image_sources().is_empty());
}
#[test]
fn badge_named_styles_automatically_apply_native_icon_padding() {
    let mut s = scene();
    for style in ["Attention", "Informational"] {
        let id = s
            .create(
                s.root,
                NodeKind::InfoBadge,
                json!({"glyph":"\u{ea38}","badgeStyle":style}),
            )
            .unwrap();
        assert_eq!(s.nodes[&id].props.padding, [0., 4., 0., 2.]);
        s.update(vec![Update {
            id,
            patch: json!({"value":10}),
        }])
        .unwrap();
        assert_eq!(s.nodes[&id].props.padding, [0.; 4]);
        s.update(vec![Update {
            id,
            patch: json!({"value":-1,"padding":[1,1,1,1]}),
        }])
        .unwrap();
        assert_eq!(s.nodes[&id].props.padding, [1.; 4]);
    }
    let id = s
        .create(
            s.root,
            NodeKind::InfoBadge,
            json!({"symbol":"Accept","badgeStyle":"Success"}),
        )
        .unwrap();
    assert_eq!(icons::badge_margin(&s.nodes[&id].props), [4.; 4]);
}
