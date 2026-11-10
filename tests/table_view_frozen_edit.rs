use serde_json::json;
use winui_wasm::{
    enums::*,
    scene::{Input, Scene},
    typography::{Font, Metrics, TextMeasurer},
};
struct Measure;
impl TextMeasurer for Measure {
    fn measure(&mut self, text: &str, font: &Font) -> Metrics {
        Metrics {
            width: text.chars().count() as f64 * font.size * 0.5,
            ascent: font.size,
            descent: 4.,
            ..Default::default()
        }
    }
}
fn setup() -> (Scene, u32, u32) {
    let mut s = Scene::new(Theme::Light, true);
    s.resize(640., 360., 1.25).unwrap();
    s.popup_viewport = Some(winui_wasm::model::Rect::new(0., 0., 640., 1000.));
    let items=(0..24).map(|i|json!({"id":format!("r{i}"),"values":{"name":format!("Name {i}"),"group":if i%2==0{"A"}else{"B"}}})).collect::<Vec<_>>();
    let id=s.create(s.root,NodeKind::TableView,json!({"height":320,"table":{"items":items,"autoGenerateColumns":false,"frozenColumnCount":1,"columns":[{"key":"name","field":"name","width":{"unit":"Pixel","value":180}},{"key":"group","field":"group","kind":"ComboBox","options":["A","B","C","D"],"width":{"unit":"Pixel","value":150}},{"key":"middle","field":"name","width":{"unit":"Pixel","value":300}},{"key":"last","field":"name","width":{"unit":"Pixel","value":300}}]}})).unwrap();
    s.layout(&mut Measure);
    s.layout(&mut Measure);
    let body = s
        .nodes
        .values()
        .find(|n| {
            n.kind == NodeKind::ScrollViewer
                && n.props.accessible_name.as_deref() == Some("Table rows")
        })
        .unwrap()
        .id;
    (s, id, body)
}
fn begin(s: &mut Scene, id: u32, row: &str, column: &str) {
    s.input(serde_json::from_value::<Input>(json!({"kind":"table","id":id,"action":"beginEdit","data":{"cell":{"row":row,"column":column}}})).unwrap(),s.time).unwrap();
    s.layout(&mut Measure);
    let request = s
        .events
        .iter()
        .rev()
        .find(|e| e.target == id && e.kind == EventKind::BeginningEdit)
        .unwrap()
        .request_id;
    s.input(serde_json::from_value::<Input>(json!({"kind":"table","id":id,"action":"resolve","request":request,"cancel":false,"data":{}})).unwrap(),s.time).unwrap();
    s.layout(&mut Measure);
    s.layout(&mut Measure);
}
#[test]
fn editing_at_the_right_edge_keeps_horizontal_offset_and_real_focus() {
    let (mut s, id, body) = setup();
    let max = s.nodes[&body].scroll.max(s.time)[0];
    s.input(
        Input::Scroll {
            id: body,
            x: Some(max),
            y: None,
            zoom: None,
            animated: false,
        },
        1000.,
    )
    .unwrap();
    s.layout(&mut Measure);
    s.layout(&mut Measure);
    let before = s.nodes[&body].scroll.offsets(s.time)[0];
    begin(&mut s, id, "r0", "last");
    assert!(
        (s.nodes[&body].scroll.offsets(s.time)[0] - before).abs() < 0.001,
        "Starting an already visible editor must not reset horizontal scrolling"
    );
    let focused = s.focused.expect("the editor must retain focus");
    assert_eq!(s.nodes[&focused].kind, NodeKind::TextBox);
    assert_eq!(s.nodes[&focused].props.text, "Name 0");
    let snapshot = serde_json::to_value(s.snapshot()).unwrap();
    let table = snapshot["nodes"]
        .as_array()
        .unwrap()
        .iter()
        .find(|n| n["id"] == id)
        .unwrap();
    assert_eq!(
        table["table"]["editingCell"],
        json!({"row":"r0","column":"last"})
    );
}
#[test]
fn initial_combo_selection_reaches_the_collapsed_input_and_popup_escapes_the_cell() {
    let (mut s, id, body) = setup();
    s.input(
        Input::Scroll {
            id: body,
            x: Some(50.),
            y: None,
            zoom: None,
            animated: false,
        },
        0.,
    )
    .unwrap();
    s.layout(&mut Measure);
    s.layout(&mut Measure);
    begin(&mut s, id, "r5", "group");
    assert_eq!(
        s.nodes[&body].scroll.offsets(s.time)[0],
        0.,
        "Reveal the whole editor beyond the frozen band, not only its unclipped tail"
    );
    let combo = s
        .nodes
        .values()
        .find(|n| n.kind == NodeKind::ComboBox)
        .unwrap()
        .id;
    let input = s.nodes[&combo].composed.parts["InputBox"];
    assert_eq!(s.nodes[&combo].props.selected_index, 1);
    assert_eq!(
        s.nodes[&input].props.text, "B",
        "Initial selection must be displayed before the first selection change"
    );
    let button = s.nodes[&combo].composed.parts["DropDownButton"];
    let n = &s.nodes[&button];
    let (x, y) = n.world.point(n.rect.width / 2., n.rect.height / 2.);
    s.input(Input::Down { pointer: 1, x, y }, 1000.).unwrap();
    s.input(Input::Up { pointer: 1, x, y }, 1001.).unwrap();
    s.advance(1500.);
    s.layout(&mut Measure);
    let popup = s.nodes[&combo].composed.parts["Popup"];
    assert!(s.nodes[&popup].props.is_open);
    let list = s.floating_display_list();
    let data = serde_json::to_value(list).unwrap();
    assert!(
        data.as_array().unwrap().iter().any(|d| d["text"] == "B"),
        "The popup must paint in the floating surface"
    );
    assert!(
        s.floating_surface_bounds().y + s.floating_surface_bounds().height > 320.,
        "The popup is intentionally outside the table's clipped body"
    );
}

#[test]
fn delayed_template_editor_focuses_its_first_input_once_without_resetting_scroll() {
    use winui_wasm::scene::Update;
    let (mut s, id, body) = setup();
    let mut table = serde_json::to_value(s.nodes[&id].props.table.clone()).unwrap();
    table["columns"][3]["hasTemplate"] = true.into();
    table["columns"][3]["hasEditTemplate"] = true.into();
    s.update(vec![Update {
        id,
        patch: json!({"table":table}),
    }])
    .unwrap();
    s.layout(&mut Measure);
    let max = s.nodes[&body].scroll.max(s.time)[0];
    s.input(
        Input::Scroll {
            id: body,
            x: Some(max),
            y: None,
            zoom: None,
            animated: false,
        },
        0.,
    )
    .unwrap();
    s.layout(&mut Measure);
    begin(&mut s, id, "r0", "last");
    let snapshot = serde_json::to_value(s.snapshot()).unwrap();
    let slot = snapshot["nodes"]
        .as_array()
        .unwrap()
        .iter()
        .find(|n| n["id"] == id)
        .unwrap()["table"]["realized"]
        .as_array()
        .unwrap()
        .iter()
        .find(|s| s["row"] == "r0" && s["column"] == "last")
        .unwrap()["id"]
        .as_u64()
        .unwrap() as u32;
    let root = s
        .create(
            slot,
            NodeKind::StackPanel,
            json!({"orientation":"Horizontal"}),
        )
        .unwrap();
    s.layout(&mut Measure);
    let input = s
        .create(
            root,
            NodeKind::TextBox,
            json!({"text":"Template value","width":170}),
        )
        .unwrap();
    let save = s
        .create(root, NodeKind::Button, json!({"text":"Save"}))
        .unwrap();
    s.layout(&mut Measure);
    assert_eq!(s.focused, Some(input));
    assert!((s.nodes[&body].scroll.offsets(s.time)[0] - max).abs() < 0.001);
    s.input(Input::Focus { id: save }, 0.).unwrap();
    s.layout(&mut Measure);
    assert_eq!(
        s.focused,
        Some(save),
        "Later layout must not steal focus from template buttons"
    );
    assert!((s.nodes[&body].scroll.offsets(s.time)[0] - max).abs() < 0.001);
}

#[test]
fn keyboard_continuation_uses_the_same_fractional_dpi_widths_as_arrange() {
    use winui_wasm::scene::Update;
    let (mut s, id, body) = setup();
    let mut table = serde_json::to_value(s.nodes[&id].props.table.clone()).unwrap();
    let columns = table["columns"].as_array_mut().unwrap();
    for (key, width) in [("extra-a", 90), ("extra-b", 95)] {
        columns.insert(
            1,
            json!({"key":key,"field":"name","width":{"unit":"Pixel","value":width}}),
        );
    }
    s.update(vec![Update {
        id,
        patch: json!({"table":table}),
    }])
    .unwrap();
    s.layout(&mut Measure);
    s.input(
        Input::Scroll {
            id: body,
            x: Some(230.),
            y: None,
            zoom: None,
            animated: false,
        },
        0.,
    )
    .unwrap();
    s.layout(&mut Measure);
    begin(&mut s, id, "r0", "group");
    let before = s.nodes[&body].scroll.offsets(s.time)[0];
    assert!((before - 185.6).abs() < 0.001);
    s.input(
        Input::KeyDown {
            key: "Enter".into(),
            repeat: false,
        },
        0.,
    )
    .unwrap();
    for kind in [EventKind::CellEditEnding, EventKind::BeginningEdit] {
        let request = s
            .events
            .iter()
            .rev()
            .find(|e| e.target == id && e.kind == kind)
            .unwrap()
            .request_id;
        s.input(serde_json::from_value::<Input>(json!({"kind":"table","id":id,"action":"resolve","request":request,"cancel":false,"data":{}})).unwrap(),0.).unwrap();
        s.layout(&mut Measure);
    }
    assert!(
        (s.nodes[&body].scroll.offsets(s.time)[0] - before).abs() < 0.001,
        "Enter must not shift horizontally at an already revealed frozen-band boundary"
    );
    assert_eq!(s.nodes[&s.focused.unwrap()].props.text, "B");
}
