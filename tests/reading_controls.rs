use serde_json::{json, Value};
use winui_wasm::{
    enums::*,
    scene::{Input, Scene, Update},
    typography::{Font, Metrics, TextMeasurer},
};
struct Measure;
impl TextMeasurer for Measure {
    fn measure(&mut self, s: &str, f: &Font) -> Metrics {
        Metrics {
            width: s.chars().count() as f64 * f.size * 0.5,
            ascent: f.size * 0.8,
            descent: f.size * 0.2,
            ..Default::default()
        }
    }
}
fn scene() -> Scene {
    let mut s = Scene::new(Theme::Light, true);
    s.resize(640., 480., 1.25).unwrap();
    s
}
fn frame(s: &mut Scene) -> Value {
    s.layout(&mut Measure);
    s.display_list();
    serde_json::to_value(s.snapshot()).unwrap()
}
fn action(s: &mut Scene, id: u32, a: &str, index: i32) {
    s.input(
        Input::Reading {
            id,
            action: a.into(),
            index,
            offset: 0.,
            request: None,
            cancel: false,
        },
        s.time + 1.,
    )
    .unwrap();
}
#[test]
fn pager_modes_boundary_coercion_events_and_disposal() {
    for mode in ["Auto", "ComboBox", "NumberBox", "ButtonPanel"] {
        let mut s = scene();
        let id = s
            .create(
                s.root,
                NodeKind::PagerControl,
                json!({"reading":{"displayMode":mode,"numberOfPages":12,"selectedPageIndex":2}}),
            )
            .unwrap();
        frame(&mut s);
        assert!(!s.nodes[&id].children.is_empty());
        action(&mut s, id, "page", 100);
        let f = frame(&mut s);
        assert_eq!(
            s.nodes[&id]
                .props
                .reading
                .as_ref()
                .unwrap()
                .selected_page_index,
            11
        );
        assert!(f["events"]
            .as_array()
            .unwrap()
            .iter()
            .any(|e| e["kind"] == "SelectedIndexChanged"));
        s.update(vec![Update {
            id,
            patch: json!({"reading":{"numberOfPages":2}}),
        }])
        .unwrap();
        frame(&mut s);
        assert_eq!(
            s.nodes[&id]
                .props
                .reading
                .as_ref()
                .unwrap()
                .selected_page_index,
            1
        );
        let nodes = s.nodes.len();
        frame(&mut s);
        assert_eq!(s.nodes.len(), nodes);
        s.destroy(id).unwrap();
        frame(&mut s);
        assert_eq!(s.nodes.len(), 1);
    }
}
#[test]
fn pager_child_invocation_is_owned_by_rust() {
    let mut s = scene();
    let id = s
        .create(
            s.root,
            NodeKind::PagerControl,
            json!({"reading":{"numberOfPages":12}}),
        )
        .unwrap();
    let f = frame(&mut s);
    let n = f["nodes"]
        .as_array()
        .unwrap()
        .iter()
        .find(|n| n["id"] == id)
        .unwrap();
    let next = n["reading"]["parts"]
        .as_array()
        .unwrap()
        .iter()
        .find(|p| p["role"] == "next")
        .unwrap()["id"]
        .as_u64()
        .unwrap() as u32;
    s.input(Input::Invoke { id: next }, 1.).unwrap();
    frame(&mut s);
    assert_eq!(
        s.nodes[&id]
            .props
            .reading
            .as_ref()
            .unwrap()
            .selected_page_index,
        1
    );
}
#[test]
fn items_view_selection_virtualization_and_mutation() {
    let mut s = scene();
    let id=s.create(s.root,NodeKind::ItemsView,json!({"width":240,"height":160,"selectionMode":"Multiple","collectionItems":(0..10000).map(|i|json!({"id":i.to_string(),"text":format!("Item {i}")})).collect::<Vec<_>>()})).unwrap();
    frame(&mut s);
    assert!(s.nodes.len() < 150);
    action(&mut s, id, "select", 9);
    frame(&mut s);
    assert_eq!(
        s.nodes[&id].props.selected_keys.as_ref(),
        &vec!["9".to_string()]
    );
    action(&mut s, id, "selectAll", 0);
    frame(&mut s);
    assert_eq!(s.nodes[&id].props.selected_keys.len(), 10000);
    action(&mut s, id, "invert", 0);
    frame(&mut s);
    assert!(s.nodes[&id].props.selected_keys.is_empty());
}
#[test]
fn layout_panel_padding_and_natural_height_propagate() {
    let mut s = scene();
    let id=s.create(s.root,NodeKind::LayoutPanel,json!({"width":200,"padding":[8,8,8,8],"borderThickness":[1,1,1,1],"reading":{"layout":{"kind":"StackLayout","spacing":5}}})).unwrap();
    let a = s
        .create(
            id,
            NodeKind::TextBlock,
            json!({"text":"Text wrapping with long labels and 中文" ,"wrap":true}),
        )
        .unwrap();
    let b = s
        .create(id, NodeKind::Button, json!({"text":"Save"}))
        .unwrap();
    frame(&mut s);
    assert!(s.nodes[&b].rect.y >= s.nodes[&a].rect.y + s.nodes[&a].rect.height + 4.);
    assert!(s.nodes[&a].rect.x >= 8.);
    assert!(s.nodes[&id].desired[1] >= s.nodes[&b].rect.y + s.nodes[&b].rect.height + 8.);
}
#[test]
fn rich_text_shared_lines_styling_and_resize() {
    let mut s = scene();
    let id=s.create(s.root,NodeKind::RichTextBlock,json!({"width":100,"reading":{"paragraphs":[{"runs":[{"text":"Hello "},{"text":"World","fontWeight":700,"fontSize":24},{"text":" 中文👨‍👩‍👧‍👦 link","link":"help"}]}]}})).unwrap();
    let first = frame(&mut s);
    let h = s.nodes[&id].desired[1];
    assert!(h > 30.);
    let n = first["nodes"]
        .as_array()
        .unwrap()
        .iter()
        .find(|n| n["id"] == id)
        .unwrap();
    assert!(n["reading"]["links"].as_array().unwrap().len() > 0);
    s.update(vec![Update {
        id,
        patch: json!({"width":400}),
    }])
    .unwrap();
    frame(&mut s);
    assert!(s.nodes[&id].desired[1] < h);
    let draws = serde_json::to_string(&s.display_list()).unwrap();
    assert!(draws.contains("World"));
    assert!(draws.contains("700"));
}
#[test]
fn annotated_scroll_cancel_and_stale_response() {
    let mut s = scene();
    let id=s.create(s.root,NodeKind::AnnotatedScrollBar,json!({"width":60,"height":300,"reading":{"maximum":1000,"viewportSize":100,"labels":[{"text":"A","scrollOffset":0},{"text":"B","scrollOffset":1},{"text":"Z","scrollOffset":1000}]}})).unwrap();
    let f = frame(&mut s);
    assert!(
        f["nodes"]
            .as_array()
            .unwrap()
            .iter()
            .find(|n| n["id"] == id)
            .unwrap()["reading"]["labels"]
            .as_array()
            .unwrap()
            .len()
            < 3
    );
    s.input(
        Input::Reading {
            id,
            action: "seek".into(),
            index: 0,
            offset: 600.,
            request: None,
            cancel: false,
        },
        1.,
    )
    .unwrap();
    let f = frame(&mut s);
    let r = f["events"]
        .as_array()
        .unwrap()
        .iter()
        .find(|e| e["kind"] == "Scrolling")
        .unwrap()["requestId"]
        .as_u64()
        .unwrap() as u32;
    s.input(
        Input::Reading {
            id,
            action: "resolveScroll".into(),
            index: 0,
            offset: 0.,
            request: Some(r),
            cancel: true,
        },
        2.,
    )
    .unwrap();
    frame(&mut s);
    assert_eq!(s.nodes[&id].props.reading.as_ref().unwrap().value, 0.);
}
#[test]
fn annotated_stale_response_preserves_the_new_request_and_target_lifetime() {
    let mut s = scene();
    let target = s
        .create(
            s.root,
            NodeKind::ScrollViewer,
            json!({"width":200,"height":100}),
        )
        .unwrap();
    let content = s
        .create(target, NodeKind::Border, json!({"width":200,"height":2000}))
        .unwrap();
    let id = s
        .create(
            s.root,
            NodeKind::AnnotatedScrollBar,
            json!({"width":60,"height":100,"reading":{"scrollTarget":target}}),
        )
        .unwrap();
    frame(&mut s);
    let mut requests = vec![];
    for value in [200., 600.] {
        s.input(
            Input::Reading {
                id,
                action: "seek".into(),
                index: 0,
                offset: value,
                request: None,
                cancel: false,
            },
            s.time + 1.,
        )
        .unwrap();
        let f = frame(&mut s);
        requests.push(
            f["events"]
                .as_array()
                .unwrap()
                .iter()
                .find(|e| e["kind"] == "Scrolling")
                .unwrap()["requestId"]
                .as_u64()
                .unwrap() as u32,
        );
    }
    for request in requests {
        s.input(
            Input::Reading {
                id,
                action: "resolveScroll".into(),
                index: 0,
                offset: 0.,
                request: Some(request),
                cancel: false,
            },
            s.time + 1.,
        )
        .unwrap();
        frame(&mut s);
    }
    assert_eq!(s.nodes[&target].props.vertical_offset, 600.);
    s.destroy(target).unwrap();
    frame(&mut s);
    assert!(!s.nodes.contains_key(&content));
    assert_eq!(
        s.nodes[&id].props.reading.as_ref().unwrap().scroll_target,
        None
    );
}
#[test]
fn uniform_grid_justification_is_supported(){let mut s=scene();let id=s.create(s.root,NodeKind::ItemsView,json!({"width":200,"height":100,"collectionItems":[{"id":"a","text":"A"}],"reading":{"layout":{"kind":"UniformGridLayout","minItemWidth":40,"minItemHeight":40,"itemsJustification":"Center"}}})).unwrap();frame(&mut s);let f=frame(&mut s);let n=f["nodes"].as_array().unwrap().iter().find(|n|n["id"]==id).unwrap();assert_eq!(n["reading"]["slots"][0]["x"],80.);}
#[test]
fn pager_internal_combobox_selection_uses_composed_payload() {
 let mut s=scene();let id=s.create(s.root,NodeKind::PagerControl,json!({"reading":{"numberOfPages":5}})).unwrap();let f=frame(&mut s);
 let node=f["nodes"].as_array().unwrap().iter().find(|n|n["id"]==id).unwrap();let input=node["reading"]["parts"].as_array().unwrap().iter().find(|p|p["role"]=="input").unwrap()["id"].as_u64().unwrap()as u32;
 let request=serde_json::from_value(json!({"kind":"composed","id":input,"action":"select","index":3})).unwrap();s.input(request,1.).unwrap();frame(&mut s);
 assert_eq!(s.nodes[&id].props.reading.as_ref().unwrap().selected_page_index,3);
}
