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
            width: text.chars().count() as f64 * font.size * 0.5,
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
fn patch(s: &mut Scene, id: u32, patch: serde_json::Value) {
    s.update(vec![Update { id, patch }]).unwrap();
}
#[test]
fn grid_independent_spacing_updates_cells_spans_and_natural_size() {
    let mut s = Scene::new(Theme::Light, true);
    s.resize(600., 400., 1.).unwrap();
    let grid=s.create(s.root,NodeKind::Grid,json!({"width":240,"height":160,"rows":[{"unit":"Pixel","value":50},{"unit":"Pixel","value":50},{"unit":"Pixel","value":50}],"columns":[{"unit":"Pixel","value":50},{"unit":"Pixel","value":50},{"unit":"Pixel","value":50}],"rowSpacing":3,"columnSpacing":16})).unwrap();
    let cell = s
        .create(grid, NodeKind::Grid, json!({"row":2,"column":2}))
        .unwrap();
    let span = s
        .create(grid, NodeKind::Grid, json!({"rowSpan":2,"columnSpan":2}))
        .unwrap();
    frame(&mut s, 0.);
    assert_eq!((s.nodes[&cell].rect.x, s.nodes[&cell].rect.y), (132., 106.));
    assert_eq!(
        (s.nodes[&span].rect.width, s.nodes[&span].rect.height),
        (116., 103.)
    );
    patch(&mut s, grid, json!({"rowSpacing":0,"columnSpacing":8}));
    frame(&mut s, 1.);
    assert_eq!((s.nodes[&cell].rect.x, s.nodes[&cell].rect.y), (116., 100.));
    assert!(s
        .update(vec![Update {
            id: grid,
            patch: json!({"rowSpacing":-1})
        }])
        .is_err());
    assert_eq!(s.properties(grid).unwrap().row_spacing, Some(0.));
    patch(
        &mut s,
        grid,
        json!({"width":null,"height":null,"horizontalAlignment":"Left","verticalAlignment":"Top"}),
    );
    frame(&mut s, 2.);
    assert_eq!(
        (s.nodes[&grid].rect.width, s.nodes[&grid].rect.height),
        (166., 150.)
    );
}
#[test]
fn expander_header_slot_remains_visible_and_hit_testable_across_content_states() {
    for direction in ["Down", "Up"] {
        let mut s = Scene::new(Theme::Light, true);
        s.resize(600., 400., 1.).unwrap();
        let exp=s.create(s.root,NodeKind::Expander,json!({"width":500,"verticalAlignment":"Top","padding":[0,0,0,0],"horizontalContentAlignment":"Left","expandDirection":direction})).unwrap();
        let header = s
            .create(exp, NodeKind::Grid, json!({"isExpanderHeader":true}))
            .unwrap();
        let text=s.create(header,NodeKind::TextBlock,json!({"text":"This text is centered","horizontalAlignment":"Center","verticalAlignment":"Center"})).unwrap();
        let body = s
            .create(
                exp,
                NodeKind::TextBlock,
                json!({"text":"And this text is left aligned","margin":[4,4,4,4]}),
            )
            .unwrap();
        assert!(s.create(exp, NodeKind::Grid, json!({})).is_err());
        assert!(s
            .create(exp, NodeKind::Grid, json!({"isExpanderHeader":true}))
            .is_err());
        assert!(s.reparent(header, s.root, None).is_err());
        assert!(s
            .update(vec![Update {
                id: header,
                patch: json!({"isExpanderHeader":false})
            }])
            .is_err());
        frame(&mut s, 0.);
        assert!(s.nodes[&text].visible);
        assert!(!s.nodes[&body].visible);
        assert!(s
            .display_list()
            .iter()
            .any(|d| matches!(d,Draw::Text{text,..} if text=="This text is centered")));
        for open in [true, false, true] {
            patch(&mut s, exp, json!({"isExpanded":open}));
            frame(&mut s, 1000.);
            assert!(s.nodes[&text].visible);
            assert_eq!(s.nodes[&body].visible, open);
            let n = &s.nodes[&text];
            let (x, y) = n.world.point(2., 2.);
            assert_eq!(s.hit(x, y), Some(exp));
            if open {
                assert_eq!(s.nodes[&body].rect.x, 5.);
            }
        }
        let child = s
            .create(header, NodeKind::Button, json!({"text":"Header button"}))
            .unwrap();
        frame(&mut s, 2000.);
        let n = &s.nodes[&child];
        let (x, y) = n.world.point(2., 2.);
        assert_eq!(s.hit(x, y), Some(child));
        s.input(Input::Invoke { id: child }, 2000.).unwrap();
    }
}
