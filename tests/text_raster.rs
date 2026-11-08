use winui_wasm::{
    enums::FontStyle,
    enums::TextTrimming,
    typography::{layout, line_services_rounding, snap_baseline, Font, Metrics, TextMeasurer},
};
struct FontMetrics;
impl TextMeasurer for FontMetrics {
    fn measure(&mut self, _: &str, font: &Font) -> Metrics {
        Metrics {
            width: 20.,
            ascent: font.size * 2210. / 2048.,
            descent: font.size * 514. / 2048.,
            ..Default::default()
        }
    }
}
#[test]
fn clip_text_uses_native_text_dpi_and_full_height_rounding_offset() {
    for (size, native) in [
        (8., 9.1933333333),
        (11., 12.44),
        (12., 12.99),
        (14., 15.6866666667),
        (16., 17.5866666667),
        (20., 22.1833333333),
        (28., 30.57),
    ] {
        let font = Font {
            size,
            style: FontStyle::Normal,
            ..Default::default()
        };
        let mut text = layout(
            "Open",
            &font,
            300.,
            false,
            TextTrimming::Clip,
            None,
            &mut FontMetrics,
        );
        line_services_rounding(&mut text, 1.25);
        assert!(
            (text.lines[0].baseline - native).abs() < 0.00001,
            "{size}: {}",
            text.lines[0].baseline
        );
    }
}
#[test]
fn baseline_rounding_uses_world_pixels_and_preserves_rotated_layout() {
    for dpr in [1., 1.25, 1.5, 2.] {
        let matrix = [1., 0., 0., 1., 0., 168.];
        let y = snap_baseline(15.6866666667, matrix, dpr);
        let pixel = (y + 168.) * dpr;
        assert!((pixel - pixel.round()).abs() < 1e-9);
    }
    let rotated = [0., 1., -1., 0., 0., 168.];
    assert_eq!(snap_baseline(15.3, rotated, 1.25), 15.3);
}

#[test]
fn every_axis_aligned_glyph_run_snaps_its_baseline_without_rounding_layout_metrics() {
    use serde_json::json;
    use winui_wasm::{
        enums::{NodeKind, Theme},
        render::Draw,
        scene::Scene,
    };
    for dpr in [1., 1.25, 1.5, 2.] {
        for kind in [NodeKind::TextBlock, NodeKind::Button] {
            for trimming in [TextTrimming::None, TextTrimming::Clip] {
                let mut scene = Scene::new(Theme::Light, true);
                scene.resize(500., 300., dpr).unwrap();
                let canvas = scene
                    .create(scene.root, NodeKind::Canvas, json!({}))
                    .unwrap();
                let text = scene.create(canvas, kind, json!({"text":"Open","canvasTop":10.1,"canvasLeft":20.3,"trimming":trimming})).unwrap();
                scene.layout(&mut FontMetrics);
                let baseline = scene.nodes[&text].text.lines[0].baseline;
                let phases: Vec<_> = scene
                    .display_list()
                    .into_iter()
                    .filter_map(|d| match d {
                        Draw::TextRasterPhase { phase } => Some(phase),
                        _ => None,
                    })
                    .collect();
                assert!(!phases.is_empty());
                assert!(
                    phases.iter().all(|p| p[1].abs() < 1e-9),
                    "{kind:?} {trimming:?} {dpr}: {phases:?}"
                );
                assert_eq!(scene.nodes[&text].text.lines[0].baseline, baseline);
            }
        }
    }
}

#[test]
fn ordinary_text_renders_with_height_rounding_budget_but_reports_the_unadjusted_baseline() {
    use serde_json::json;
    use winui_wasm::{
        enums::{NodeKind, Theme},
        render::Draw,
        scene::Scene,
    };
    for size in [8., 11., 16.] {
        let dpr = 1.25;
        let mut scene = Scene::new(Theme::Light, true);
        scene.resize(500., 300., dpr).unwrap();
        let canvas = scene
            .create(scene.root, NodeKind::Canvas, json!({}))
            .unwrap();
        let text = scene
            .create(
                canvas,
                NodeKind::TextBlock,
                json!({"text":"Open","fontSize":size,"canvasTop":10,"trimming":TextTrimming::None}),
            )
            .unwrap();
        scene.layout(&mut FontMetrics);
        let raw_baseline = scene.nodes[&text].text.lines[0].baseline;
        let height = scene.nodes[&text].text.height;
        let adjustment = (height * dpr).ceil() / dpr - height;
        let expected = ((10. + raw_baseline + adjustment) * dpr + 0.5).floor();
        let rendered = scene
            .display_list()
            .into_iter()
            .find_map(|d| match d {
                Draw::Text { y, .. } => Some((10. + y) * dpr),
                _ => None,
            })
            .unwrap();
        assert!((rendered - expected).abs() < 1e-9);
        assert_eq!(scene.nodes[&text].text.lines[0].baseline, raw_baseline);
    }
}
