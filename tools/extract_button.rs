use serde_json::json;
use std::path::Path;
pub fn generate(out: &Path) {
    let path = "references/winui/Button_themeresources.xaml";
    println!("cargo:rerun-if-changed={path}");
    println!("cargo:rerun-if-changed=references/button-palettes.json");
    println!("cargo:rerun-if-changed=references/button-native-metrics.json");
    let source = std::fs::read_to_string(path).unwrap();
    let xml = roxmltree::Document::parse(&source).unwrap();
    let ns = "http://schemas.microsoft.com/winfx/2006/xaml";
    let palettes: serde_json::Value =
        serde_json::from_slice(&std::fs::read("references/button-palettes.json").unwrap()).unwrap();
    let metrics: serde_json::Value =
        serde_json::from_slice(&std::fs::read("references/button-native-metrics.json").unwrap())
            .unwrap();
    let mut aliases = serde_json::Map::new();
    for (theme, key) in [
        ("Light", "Light"),
        ("Dark", "Default"),
        ("HighContrast", "HighContrast"),
    ] {
        let dict = xml
            .descendants()
            .find(|n| {
                n.tag_name().name() == "ResourceDictionary" && n.attribute((ns, "Key")) == Some(key)
            })
            .unwrap();
        let mut table = serde_json::Map::new();
        for entry in dict
            .children()
            .filter(|n| n.tag_name().name() == "StaticResource")
        {
            let key = entry.attribute((ns, "Key")).unwrap();
            let leaf = entry.attribute("ResourceKey").unwrap();
            assert!(
                palettes[theme][leaf].is_object(),
                "unresolved Button leaf {theme}/{key} -> {leaf}"
            );
            let brush = &palettes[theme][leaf];
            match brush["kind"].as_str() {
                Some("solid") => {
                    assert!(
                        brush["color"]
                            .as_str()
                            .is_some_and(|c| c.len() == 7 || c.len() == 9),
                        "invalid solid brush {leaf}"
                    );
                }
                Some("linearGradient") => {
                    assert_eq!(
                        brush["spreadMethod"], "Pad",
                        "unsupported gradient spread {leaf}"
                    );
                    assert!(
                        matches!(
                            brush["mappingMode"].as_str(),
                            Some("Absolute" | "RelativeToBoundingBox")
                        ),
                        "unsupported gradient mapping {leaf}"
                    );
                    assert_eq!(
                        brush["stops"].as_array().unwrap().len(),
                        2,
                        "unsupported gradient stop count {leaf}"
                    );
                }
                _ => panic!("unsupported Button brush {theme}/{leaf}"),
            }
            table.insert(key.into(), json!(leaf));
        }
        aliases.insert(theme.into(), json!(table));
    }
    let padding = xml
        .descendants()
        .find(|n| n.attribute((ns, "Key")) == Some("ButtonPadding"))
        .unwrap()
        .text()
        .unwrap()
        .split(',')
        .map(|x| x.parse::<f64>().unwrap())
        .collect::<Vec<_>>();
    assert_eq!(padding.len(), 4);
    let mut styles = serde_json::Map::new();
    for (variant, key, prefix) in [
        ("Standard", "DefaultButtonStyle", "Button"),
        ("Accent", "AccentButtonStyle", "AccentButton"),
        ("Subtle", "SubtleButtonStyle", "SubtleButton"),
    ] {
        let style = xml
            .descendants()
            .find(|n| n.tag_name().name() == "Style" && n.attribute((ns, "Key")) == Some(key))
            .unwrap();
        let presenter = style
            .descendants()
            .find(|n| n.tag_name().name() == "ContentPresenter")
            .unwrap();
        assert_eq!(presenter.attribute((ns, "Name")), Some("ContentPresenter"));
        let transition = style
            .descendants()
            .find(|n| n.tag_name().name() == "BrushTransition")
            .unwrap()
            .attribute("Duration")
            .unwrap();
        assert_eq!(transition, "0:0:0.083");
        let mut states = serde_json::Map::new();
        for state in ["Normal", "PointerOver", "Pressed", "Disabled"] {
            let s = style
                .descendants()
                .find(|n| {
                    n.tag_name().name() == "VisualState" && n.attribute((ns, "Name")) == Some(state)
                })
                .unwrap();
            let mut values = serde_json::Map::new();
            for prop in ["Background", "Foreground", "BorderBrush"] {
                let fallback = format!("{prefix}{prop}");
                let mut resource = fallback;
                for animation in s
                    .descendants()
                    .filter(|n| n.tag_name().name() == "ObjectAnimationUsingKeyFrames")
                {
                    if animation.attribute("Storyboard.TargetProperty") == Some(prop) {
                        let frame = animation.children().find(|n| n.is_element()).unwrap();
                        assert_eq!(frame.tag_name().name(), "DiscreteObjectKeyFrame");
                        let value = frame.attribute("Value").unwrap();
                        resource = value
                            .strip_prefix("{ThemeResource ")
                            .and_then(|v| v.strip_suffix('}'))
                            .expect("only source ThemeResource state values supported")
                            .into();
                    }
                }
                values.insert(prop.into(), json!(resource));
            }
            states.insert(state.into(), json!(values));
        }
        let sizing = style
            .children()
            .find(|n| n.attribute("Property") == Some("BackgroundSizing"))
            .and_then(|n| n.attribute("Value"))
            .unwrap_or("InnerBorderEdge");
        styles.insert(variant.into(),json!({"key":key,"states":states,"backgroundSizing":sizing,"part":"ContentPresenter","backgroundTransitionMs":83}));
    }
    let m = &metrics[0];
    let result = json!({"source":path,"sourceCommit":"7b12709347527238494ca28cb9fed326d513e779","aliases":aliases,"primitives":palettes,"styles":styles,"defaults":{"padding":padding,"fontSize":m["fontSize"],"fontFamily":m["fontFamily"],"cornerRadius":m["cornerRadius"]["TopLeft"],"borderThickness":m["borderThickness"]["Left"]}});
    std::fs::write(
        out.join("button-template.json"),
        serde_json::to_vec_pretty(&result).unwrap(),
    )
    .unwrap();
}
