use serde_json::{json, Value};
use std::collections::HashMap;
fn thickness(text: &str) -> Vec<f64> {
    let n: Vec<f64> = text.split(',').map(|x| x.parse().unwrap()).collect();
    match n.as_slice() {
        [a] => vec![*a; 4],
        [x, y] => vec![*x, *y, *x, *y],
        [l, t, r, b] => vec![*l, *t, *r, *b],
        _ => panic!("unsupported thickness: {text}"),
    }
}
fn track(value: &str) -> Value {
    if value == "Auto" {
        json!({"unit":"Auto","value":1.})
    } else if value.ends_with('*') {
        json!({"unit":"Star","value":value.trim_end_matches('*').parse::<f64>().unwrap_or(1.)})
    } else {
        json!({"unit":"Pixel","value":value.parse::<f64>().unwrap()})
    }
}
fn convert(node: roxmltree::Node, resources: &HashMap<String, f64>) -> Value {
    let mut resources = resources.clone();
    for group in node
        .children()
        .filter(|n| n.is_element() && n.tag_name().name().ends_with(".Resources"))
    {
        for child in group.children().filter(|n| n.is_element()) {
            assert_eq!(
                child.tag_name().name(),
                "Double",
                "unsupported resource node"
            );
            let key = child
                .attribute(("http://schemas.microsoft.com/winfx/2006/xaml", "Key"))
                .unwrap();
            resources.insert(key.into(), child.text().unwrap().parse().unwrap());
        }
    }
    let kind = node.tag_name().name();
    if kind == "Page" {
        let child = node
            .children()
            .find(|n| n.is_element())
            .expect("page content");
        return convert(child, &resources);
    }
    assert!(
        ["Grid", "StackPanel", "TextBlock", "Ellipse", "ScrollViewer"].contains(&kind),
        "unsupported content node {kind}"
    );
    let mut result = serde_json::Map::new();
    result.insert("kind".into(), json!(kind));
    let numeric = |value: &str| -> f64 {
        if value.starts_with("{StaticResource ") {
            let key = value
                .trim_start_matches("{StaticResource ")
                .trim_end_matches('}');
            *resources
                .get(key)
                .unwrap_or_else(|| panic!("unresolved scalar {key}"))
        } else {
            value.parse().unwrap()
        }
    };
    for attr in node.attributes() {
        if attr.namespace().is_some() {
            assert!(
                ["Name", "Class", "Ignorable"].contains(&attr.name()),
                "unsupported namespaced attribute {}",
                attr.name()
            );
            continue;
        }
        let key = match attr.name() {
            "Margin" => {
                result.insert("margin".into(), json!(thickness(attr.value())));
                continue;
            }
            "Background" | "Fill" => "fill",
            "Text" => "text",
            "HorizontalAlignment" => "horizontalAlignment",
            "VerticalAlignment" => "verticalAlignment",
            "Style" => {
                let style = attr.value();
                let (size, weight) = match style {
                    "{ThemeResource BodyTextBlockStyle}"
                    | "{StaticResource BodyTextBlockStyle}" => (14., 400),
                    "{ThemeResource TitleTextBlockStyle}"
                    | "{StaticResource TitleTextBlockStyle}" => (28., 600),
                    _ => panic!("unsupported style {style}"),
                };
                result.insert("fontSize".into(), json!(size));
                result.insert("fontWeight".into(), json!(weight));
                result.insert("wrap".into(), json!(true));
                if size == 28. {
                    result.insert("trimSideBearings".into(), json!(true));
                }
                continue;
            }
            "TextWrapping" => {
                assert!(["WrapWholeWords", "NoWrap", "Wrap"].contains(&attr.value()));
                result.insert("wrap".into(), json!(attr.value() != "NoWrap"));
                continue;
            }
            "Width" => "width",
            "Height" => "height",
            "MinWidth" => "minWidth",
            "MinHeight" => "minHeight",
            "Grid.Row" => "row",
            "Grid.Column" => "column",
            "Grid.RowSpan" => "rowSpan",
            "Grid.ColumnSpan" => "columnSpan",
            other => panic!("unsupported {kind} attribute {other}"),
        };
        result.insert(
            key.into(),
            if ["width", "height", "minWidth", "minHeight"].contains(&key) {
                json!(numeric(attr.value()))
            } else if ["row", "column", "rowSpan", "columnSpan"].contains(&key) {
                json!(attr.value().parse::<usize>().unwrap())
            } else {
                json!(attr.value())
            },
        );
    }
    let mut children = vec![];
    for child in node.children().filter(|n| n.is_element()) {
        let name = child.tag_name().name();
        if name.ends_with(".Resources") {
            continue;
        }
        if name == "Grid.RowDefinitions" || name == "Grid.ColumnDefinitions" {
            let row = name == "Grid.RowDefinitions";
            let tracks: Vec<_> = child
                .children()
                .filter(|n| n.is_element())
                .map(|n| {
                    assert_eq!(
                        n.tag_name().name(),
                        if row {
                            "RowDefinition"
                        } else {
                            "ColumnDefinition"
                        }
                    );
                    track(
                        n.attribute(if row { "Height" } else { "Width" })
                            .unwrap_or("*"),
                    )
                })
                .collect();
            result.insert(if row { "rows" } else { "columns" }.into(), json!(tracks));
        } else {
            children.push(convert(child, &resources));
        }
    }
    result.insert("children".into(), json!(children));
    Value::Object(result)
}
pub fn generate(out: &std::path::Path) {
    let mut templates = serde_json::Map::new();
    for name in [
        "SamplePage1",
        "SamplePage2",
        "SamplePage3",
        "SamplePage4",
        "SamplePage5",
        "SamplePage6",
        "SamplePage7",
        "SampleSettingsPage",
    ] {
        let path = format!("references/gallery-pages/{name}.xaml");
        println!("cargo:rerun-if-changed={path}");
        let xml = std::fs::read_to_string(&path).expect("pinned Gallery page required");
        let document = roxmltree::Document::parse(&xml).expect("valid Gallery XML");
        templates.insert(
            format!("gallery/{name}"),
            convert(document.root_element(), &HashMap::new()),
        );
    }
    std::fs::write(
        out.join("content-templates.json"),
        serde_json::to_vec(&templates).unwrap(),
    )
    .unwrap();
}
