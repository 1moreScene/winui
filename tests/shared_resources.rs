use winui_wasm::{model::Theme, resources::Resources};

#[test]
fn connected_animation_system_color_uses_the_extracted_rust_resource_contract() {
    let native: serde_json::Value = serde_json::from_str(include_str!("../references/motion-resources.json")).unwrap();
    for theme in [Theme::Light, Theme::Dark, Theme::HighContrast] {
        let brush = Resources::current().resolve(theme, "SystemAccentColor").unwrap();
        assert_eq!(brush.kind, "solid");
        assert_eq!(brush.color, native["primitives"][theme.as_str()]["SystemAccentColor"]["color"].as_str().unwrap());
    }
}

#[test]
fn sdk_resource_brush_resolves_measured_static_alias_dependencies() {
    let resources = Resources::current();
    for (theme, expected) in [(Theme::Light, "#003E92FF"), (Theme::Dark, "#99EBFFFF")] {
        let direct = resources
            .resolve(theme, "AccentTextFillColorPrimaryBrush")
            .unwrap();
        let alias = resources
            .resolve(theme, "InfoBarHyperlinkButtonForeground")
            .unwrap();
        assert_eq!(direct.color, expected);
        assert_eq!(direct.color, alias.color);
    }
    assert!(resources
        .resolve(Theme::HighContrast, "AccentTextFillColorPrimaryBrush")
        .is_ok());
}
