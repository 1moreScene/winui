#[path = "tools/extract_button.rs"]
mod button;
#[path = "tools/extract_content.rs"]
mod content;
#[path = "tools/extract_material.rs"]
mod material;
fn main() {
    material::extract();
    let path = "references/winui/NavigationView_themeresources.xaml";
    println!("cargo:rerun-if-changed={path}");
    let source = std::fs::read_to_string(path).expect("pinned WinUI resources are required");
    let xml = roxmltree::Document::parse(&source).expect("WinUI resource XML must parse");
    let mut result = serde_json::Map::new();
    for (field, key) in [
        ("compactPaneLength", "NavigationViewCompactPaneLength"),
        ("itemHeight", "NavigationViewItemOnLeftMinHeight"),
        ("indicatorWidth", "NavigationViewSelectionIndicatorWidth"),
        ("indicatorHeight", "NavigationViewSelectionIndicatorHeight"),
        ("indicatorRadius", "NavigationViewSelectionIndicatorRadius"),
        ("topPaneHeight", "NavigationViewTopPaneHeight"),
        ("headerRowHeight", "NavigationViewPaneHeaderRowMinHeight"),
        ("overflowWidth", "TopNavigationViewOverflowButtonWidth"),
    ] {
        let node = xml
            .root_element()
            .children()
            .find(|n| {
                n.attribute(("http://schemas.microsoft.com/winfx/2006/xaml", "Key")) == Some(key)
            })
            .unwrap_or_else(|| panic!("required resource {key} is missing"));
        assert_eq!(
            node.tag_name().name(),
            "Double",
            "unsupported resource node for {key}"
        );
        let value: f64 = node
            .text()
            .expect("scalar resource value")
            .parse()
            .expect("numeric resource, not an unresolved expression");
        result.insert(field.into(), serde_json::json!(value));
    }
    for (field, key) in [
        ("headerMargin", "NavigationViewHeaderMargin"),
        ("itemMargin", "NavigationViewItemButtonMargin"),
    ] {
        let node = xml
            .descendants()
            .find(|n| {
                n.attribute(("http://schemas.microsoft.com/winfx/2006/xaml", "Key")) == Some(key)
            })
            .expect("required thickness");
        let numbers: Vec<f64> = node
            .text()
            .unwrap()
            .split(',')
            .map(|v| v.parse().expect("scalar thickness"))
            .collect();
        let values = match numbers.as_slice() {
            [all] => vec![*all; 4],
            [x, y] => vec![*x, *y, *x, *y],
            [l, t, r, b] => vec![*l, *t, *r, *b],
            _ => panic!("unsupported Thickness: {key}"),
        };
        result.insert(field.into(), serde_json::json!(values));
    }
    let style = xml
        .descendants()
        .find(|n| {
            n.attribute(("http://schemas.microsoft.com/winfx/2006/xaml", "Key"))
                == Some("NavigationViewTitleHeaderContentControlTextStyle")
        })
        .unwrap();
    let font = style
        .children()
        .find(|n| n.attribute("Property") == Some("FontSize"))
        .unwrap()
        .attribute("Value")
        .unwrap()
        .parse::<f64>()
        .unwrap();
    result.insert("headerFontSize".into(), serde_json::json!(font));
    result.insert("source".into(), serde_json::json!(path));
    result.insert(
        "sourceCommit".into(),
        serde_json::json!("7b12709347527238494ca28cb9fed326d513e779"),
    );
    let out = std::path::PathBuf::from(std::env::var_os("OUT_DIR").unwrap());
    std::fs::write(
        out.join("navigation-template.json"),
        serde_json::to_vec_pretty(&result).unwrap(),
    )
    .unwrap();
    let resources = "references/navigation-resources.json";
    println!("cargo:rerun-if-changed={resources}");
    let bytes = std::fs::read(resources).expect("source and native theme IR required");
    let dictionary: serde_json::Value =
        serde_json::from_slice(&bytes).expect("valid resource dictionary");
    for theme in ["Light", "Dark", "HighContrast"] {
        for key in [
            "NavigationViewContentBackground",
            "NavigationViewSelectionIndicatorForeground",
            "NavigationViewItemForeground",
            "NavigationViewItemBackgroundSelected",
            "NavigationViewItemBackgroundPointerOver",
            "NavigationViewItemBackgroundPressed",
            "NavigationViewContentGridBorderBrush",
        ] {
            let leaf = dictionary["aliases"][theme][key]
                .as_str()
                .unwrap_or_else(|| panic!("missing alias {theme}/{key}"));
            assert!(
                dictionary["primitives"][theme][leaf].is_object(),
                "unresolved {theme}/{key} -> {leaf}"
            );
        }
    }
    std::fs::write(out.join("navigation-resources.json"), bytes).unwrap();
    let noise = "references/winui/NoiseAsset_256X256_PNG.png";
    println!("cargo:rerun-if-changed={noise}");
    let mut decoder = png::Decoder::new(std::fs::File::open(noise).unwrap());
    decoder.set_transformations(png::Transformations::EXPAND | png::Transformations::STRIP_16);
    let mut reader = decoder.read_info().unwrap();
    let mut buffer = vec![0; reader.output_buffer_size()];
    let info = reader.next_frame(&mut buffer).unwrap();
    assert_eq!((info.width, info.height), (256, 256));
    let mut rgba = Vec::with_capacity(256 * 256 * 4);
    for pixel in buffer[..info.buffer_size()].chunks(info.color_type.samples()) {
        match info.color_type {
            png::ColorType::Rgba => rgba.extend_from_slice(pixel),
            png::ColorType::Rgb => rgba.extend_from_slice(&[pixel[0], pixel[1], pixel[2], 255]),
            png::ColorType::Grayscale => {
                rgba.extend_from_slice(&[pixel[0], pixel[0], pixel[0], 255])
            }
            png::ColorType::GrayscaleAlpha => {
                rgba.extend_from_slice(&[pixel[0], pixel[0], pixel[0], pixel[1]])
            }
            _ => panic!("unsupported noise format"),
        }
    }
    let gray_opaque = rgba.chunks_exact(4).all(|p| p[0] == p[1] && p[1] == p[2] && p[3] == 255);
    std::fs::write(out.join("noise-gray-opaque.rs"), gray_opaque.to_string()).unwrap();
    std::fs::write(out.join("noise.rgba"), rgba).unwrap();
    content::generate(&out);
    button::generate(&out);
}
