use winui_wasm::typography::Font;

#[test]
fn native_icon_names_use_host_aliases_and_per_glyph_fallback() {
    let font = Font {family:"Segoe Fluent Icons".into(), ..Font::default()};
    let css = font.css();
    assert!(css.contains("WinUI Native Fluent Icons, WinUI Native MDL2 Icons, WinUI Portable Icons"));
    assert!(!css.contains("Segoe Fluent Icons"));
    let mdl2 = Font {family:"\"Segoe MDL2 Assets\"".into(), ..Font::default()}.css();
    assert!(mdl2.contains("\"WinUI Native MDL2 Icons\", WinUI Portable Icons"));
    assert!(!mdl2.contains("WinUI Native Fluent Icons"));
}

#[test]
fn custom_and_text_fonts_keep_their_original_family_order() {
    let font = Font {family:"My Icons, serif".into(), ..Font::default()};
    assert!(font.css().contains("My Icons, serif, Segoe UI"));
    assert!(!font.css().contains("WinUI Portable Icons"));
}
