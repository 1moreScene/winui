use winui_wasm::{model::Theme, resources::Resources};

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
