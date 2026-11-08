pub fn extract() {
    let profile = "references/composition-color-profile.json";
    println!("cargo:rerun-if-changed={profile}");
    let profile_bytes =
        std::fs::read(profile).expect("native Composition color profile is required");
    let profile_json: serde_json::Value = serde_json::from_slice(&profile_bytes).unwrap();
    assert_eq!(profile_json["colorSpace"], "Hsl");
    assert_eq!(profile_json["defaultCurve"].as_array().unwrap().len(), 129);
    std::fs::write(
        std::path::PathBuf::from(std::env::var("OUT_DIR").unwrap())
            .join("composition-color-profile.json"),
        profile_bytes,
    )
    .unwrap();
    let header = "references/winui/AcrylicBrush.h";
    let source = "references/winui/AcrylicBrush.cpp";
    println!("cargo:rerun-if-changed={header}");
    println!("cargo:rerun-if-changed={source}");
    let h = std::fs::read_to_string(header).unwrap();
    let cpp = std::fs::read_to_string(source).unwrap();
    let scalar = |text: &str, marker: &str, suffix: &str| -> f64 {
        text.split_once(marker)
            .unwrap_or_else(|| panic!("missing Acrylic source constant {marker}"))
            .1
            .split_once(suffix)
            .unwrap()
            .0
            .trim()
            .parse()
            .unwrap()
    };
    // Unknown recipes must fail extraction rather than silently dropping an effect.
    for operation in [
        "EffectBorderMode::Hard",
        "BlendEffectMode::Color",
        "BlendEffectMode::Luminosity",
        "CanvasComposite::SourceOver",
        "CanvasEdgeBehavior::Wrap",
        "opaqueFallbackColor.A = 0xFF",
        "{ 0.5f, 0.0f }, { 0.0f, 0.9f }",
    ] {
        assert!(
            cpp.contains(operation),
            "unsupported Acrylic graph: {operation}"
        );
    }
    let value = serde_json::json!({"blurRadius":scalar(&h,"sc_blurRadius = ","f;"),
        "noiseOpacity":scalar(&h,"sc_noiseOpacity = ","f;"),
        "switchDuration":scalar(&cpp,"const auto switchDuration = ","ms;"),
        "tintTransitionDuration":scalar(&h,"sc_defaultTintTransitionDuration{ ","ms }"),
        "switchCurve":[0.5,0.0,0.0,0.9],
        "operations":["opaque-fallback","backdrop-source-over","gaussian-hard-border","luminosity","color","wrapped-noise-source-over","fallback-crossfade"],
        "sources":[header,source,"references/winui/NoiseAsset_256X256_PNG.png"]});
    let json = serde_json::to_string_pretty(&value).unwrap() + "\n";
    std::fs::write(
        std::path::PathBuf::from(std::env::var("OUT_DIR").unwrap()).join("material.json"),
        &json,
    )
    .unwrap();
    if std::fs::read_to_string("references/material-graph.json")
        .ok()
        .as_deref()
        != Some(&json)
    {
        std::fs::write("references/material-graph.json", json).unwrap();
    }
}
