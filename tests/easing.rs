use winui_wasm::{
    easing::{sample, EasingParameters},
    enums::*,
};
#[test]
fn all_easing_functions_match_the_fixed_native_runtime() {
    let fixture: serde_json::Value = serde_json::from_str(include_str!(
        "../references/validation/native-easing-functions.json"
    ))
    .unwrap();
    for curve in fixture["curves"].as_array().unwrap() {
        let function: EasingFunction = serde_json::from_value(curve["name"].clone()).unwrap();
        let mode: EasingMode = serde_json::from_value(curve["mode"].clone()).unwrap();
        for (i, value) in curve["values"].as_array().unwrap().iter().enumerate() {
            let actual = sample(
                function,
                mode,
                i as f64 / 256.,
                &EasingParameters::default(),
            );
            let expected = value.as_f64().unwrap();
            assert!(
                (actual - expected).abs() < 0.0001,
                "{function:?} {mode:?} at {i}: {actual} vs {expected}"
            );
        }
    }
}
