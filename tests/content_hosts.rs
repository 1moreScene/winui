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
fn scene(reduced: bool) -> Scene {
    let mut s = Scene::new(Theme::Light, reduced);
    s.resize(800., 600., 1.25).unwrap();
    s
}
fn layout(s: &mut Scene) {
    s.layout(&mut Measure);
    s.display_list();
}
fn input(s: &mut Scene, id: u32, action: &str, extra: Value) {
    let mut v = json!({"kind":"contentHost","id":id,"action":action});
    for (k, vv) in extra.as_object().unwrap() {
        v[k] = vv.clone();
    }
    s.input(serde_json::from_value(v).unwrap(), s.time).unwrap();
}
fn resolve(s: &mut Scene, id: u32, cancel: bool) {
    let request = snapshot(s, id)["pending"].as_u64().unwrap() as u32;
    input(s, id, "resolve", json!({"request":request,"cancel":cancel}));
    layout(s);
}
fn frame(s: &mut Scene, cache_size: usize) -> u32 {
    s.create(s.root,NodeKind::Frame,json!({"width":200,"height":120,"contentHost":{"cacheSize":cache_size,"pages":[{"key":"a","cacheMode":"Enabled","content":{"kind":"StackPanel","children":[{"kind":"TextBox","name":"editor","properties":{"text":"original","width":140}},{"kind":"Button","name":"action","properties":{"text":"Action"}}]}},{"key":"b","content":{"kind":"TextBlock","name":"message","properties":{"text":"Second"}}},{"key":"c","cacheMode":"Required","content":{"kind":"TextBlock","properties":{"text":"Required"}}}]}})).unwrap()
}
fn snapshot(s: &mut Scene, id: u32) -> Value {
    layout(s);
    serde_json::to_value(s.snapshot()).unwrap()["nodes"]
        .as_array()
        .unwrap()
        .iter()
        .find(|n| n["id"] == id)
        .unwrap()["contentHost"]
        .clone()
}

#[test]
fn native_content_host_geometry_matrix() {
    let native: Value =
        serde_json::from_str(include_str!("../references/content-hosts-native.json")).unwrap();
    let mut max = 0.0_f64;
    for row in native["rows"].as_array().unwrap() {
        if row["kind"] == "Frame" {
            continue;
        } // Frame's public SDK content is Page, not arbitrary FrameworkElement.
        let mut s = scene(true);
        let kind: NodeKind = serde_json::from_value(row["kind"].clone()).unwrap();
        let mut p = json!({"width":200,"height":120,"horizontalAlignment":"Left","verticalAlignment":"Top"});
        if matches!(kind, NodeKind::ContentControl | NodeKind::ContentPresenter) {
            p["padding"] = json!([6, 4, 10, 8]);
            p["borderThickness"] = json!([2, 2, 2, 2]);
        }
        if matches!(kind, NodeKind::ContentControl | NodeKind::ContentPresenter)
            && row["state"] != "Default"
        {
            let (h, v) = match row["state"].as_str().unwrap() {
                "Center" => ("Center", "Center"),
                "RightBottom" => ("Right", "Bottom"),
                "Stretch" => ("Stretch", "Stretch"),
                _ => ("Left", "Top"),
            };
            p["horizontalContentAlignment"] = json!(h);
            p["verticalContentAlignment"] = json!(v);
        }
        let host = s.create(s.root, kind, p).unwrap();
        let child = s
            .create(host, NodeKind::Border, json!({"width":40,"height":20}))
            .unwrap();
        layout(&mut s);
        let actual = s.get(child).unwrap().rect;
        let expected = &row["parts"]
            .as_array()
            .unwrap()
            .iter()
            .find(|p| p["name"] == "ContentChild")
            .unwrap()["rect"];
        for (a, b) in [actual.x, actual.y, actual.width, actual.height]
            .iter()
            .zip(expected.as_array().unwrap())
        {
            let delta = (a - b.as_f64().unwrap()).abs();
            max = max.max(delta);
            assert!(
                delta <= 0.81,
                "{} {} actual={actual:?} expected={expected}",
                row["kind"],
                row["state"]
            );
        }
    }
    println!("40 same-SDK static host states; maximum geometry difference {max} DIP");
}
#[test]
fn single_content_child_and_ownership_are_enforced() {
    let mut s = scene(true);
    for kind in [
        NodeKind::ContentControl,
        NodeKind::ContentPresenter,
        NodeKind::Page,
        NodeKind::UserControl,
    ] {
        let host = s.create(s.root, kind, json!({})).unwrap();
        let child = s.create(host, NodeKind::Grid, json!({})).unwrap();
        assert!(s.create(host, NodeKind::TextBlock, json!({})).is_err());
        let text = s.create(s.root, NodeKind::TextBlock, json!({})).unwrap();
        assert!(s.reparent(text, host, None).is_err());
        s.destroy(child).unwrap();
        s.create(host, NodeKind::TextBlock, json!({})).unwrap();
    }
}
#[test]
fn content_replacement_releases_tree_and_remeasures() {
    let mut s = scene(true);
    let host=s.create(s.root,NodeKind::ContentControl,json!({"horizontalAlignment":"Left","verticalAlignment":"Top","contentHost":{"content":"One"}})).unwrap();
    layout(&mut s);
    let old = s.get(host).unwrap().children[0];
    let height = s.get(host).unwrap().desired[1];
    s.update(vec![Update {
        id: host,
        patch: json!({"fontSize":28,"contentHost":{"content":"Much longer content"}}),
    }])
    .unwrap();
    layout(&mut s);
    assert!(s.get(old).is_err());
    assert!(s.get(host).unwrap().desired[1] > height);
    assert_eq!(s.get(host).unwrap().children.len(), 1);
    let child = s.get(host).unwrap().children[0];
    assert!(s.destroy(child).is_err());
    assert!(s.reparent(child, s.root, None).is_err());
    s.update(vec![Update {
        id: host,
        patch: json!({"contentHost":{"content":null}}),
    }])
    .unwrap();
    layout(&mut s);
    assert!(s.get(host).unwrap().children.is_empty());
}
#[test]
fn invalid_template_and_batch_are_atomic() {
    let mut s = scene(true);
    let host = s
        .create(
            s.root,
            NodeKind::ContentPresenter,
            json!({"contentHost":{"content":"Keep"}}),
        )
        .unwrap();
    layout(&mut s);
    let child = s.get(host).unwrap().children[0];
    let count = s.snapshot().nodes.len();
    let invalid = json!({"contentHost":{"content":null,"contentTemplate":{"kind":"TextBlock","children":[{"kind":"TextBlock"}]}}});
    assert!(s
        .update(vec![
            Update {
                id: host,
                patch: json!({"width":123})
            },
            Update {
                id: host,
                patch: invalid
            }
        ])
        .is_err());
    assert_eq!(s.get(host).unwrap().props.width, None);
    assert_eq!(s.get(host).unwrap().children[0], child);
    assert_eq!(s.snapshot().nodes.len(), count);
}
#[test]
fn frame_cancel_and_stale_resolution_preserve_journal() {
    let mut s = scene(true);
    let f = frame(&mut s, 2);
    input(&mut s, f, "navigate", json!({"page":"a","parameter":41}));
    let before = snapshot(&mut s, f);
    assert!(before["frame"]["current"].is_null());
    resolve(&mut s, f, true);
    assert!(s
        .events
        .iter()
        .any(|e| e.kind == EventKind::FrameNavigationStopped));
    assert!(snapshot(&mut s, f)["frame"]["current"].is_null());
    input(&mut s, f, "resolve", json!({"request":1}));
    assert!(snapshot(&mut s, f)["frame"]["current"].is_null());
    input(&mut s, f, "navigate", json!({"page":"a","parameter":42}));
    resolve(&mut s, f, false);
    let snap = snapshot(&mut s, f);
    assert_eq!(snap["frame"]["current"]["parameter"], 42);
    assert_eq!(snap["frame"]["backStack"].as_array().unwrap().len(), 0);
}
#[test]
fn frame_history_cache_and_named_controls_live_in_rust() {
    let mut s = scene(true);
    let f = frame(&mut s, 1);
    input(&mut s, f, "navigate", json!({"page":"a"}));
    resolve(&mut s, f, false);
    let editor = s.find_content_name(f, "editor").unwrap().unwrap();
    s.update(vec![Update {
        id: editor,
        patch: json!({"text":"Edited"}),
    }])
    .unwrap();
    input(&mut s, f, "navigate", json!({"page":"b"}));
    resolve(&mut s, f, false);
    assert_eq!(
        snapshot(&mut s, f)["frame"]["backStack"]
            .as_array()
            .unwrap()
            .len(),
        1
    );
    assert!(s.find_content_name(f, "editor").unwrap().is_none());
    input(&mut s, f, "back", json!({}));
    resolve(&mut s, f, false);
    assert_eq!(s.find_content_name(f, "editor").unwrap(), Some(editor));
    assert_eq!(s.get(editor).unwrap().props.text, "Edited");
    input(&mut s, f, "navigate", json!({"page":"c"}));
    resolve(&mut s, f, false);
    assert!(snapshot(&mut s, f)["frame"]["forwardStack"]
        .as_array()
        .unwrap()
        .is_empty());
    input(&mut s, f, "clearHistory", json!({}));
    assert!(snapshot(&mut s, f)["frame"]["backStack"]
        .as_array()
        .unwrap()
        .is_empty());
    assert!(s.create(f, NodeKind::Page, json!({})).is_err());
}
#[test]
fn frame_invalid_target_and_live_definition_changes_are_rejected() {
    let mut s = scene(true);
    let f = frame(&mut s, 2);
    let bad: Input = serde_json::from_value(
        json!({"kind":"contentHost","id":f,"action":"navigate","page":"missing"}),
    )
    .unwrap();
    assert!(s.input(bad, 0.).is_err());
    assert!(snapshot(&mut s, f)["frame"]["current"].is_null());
    input(&mut s, f, "navigate", json!({"page":"a"}));
    resolve(&mut s, f, false);
    assert!(s
        .update(vec![Update {
            id: f,
            patch: json!({"contentHost":{"pages":[]}})
        }])
        .is_err());
    assert_eq!(snapshot(&mut s, f)["frame"]["current"]["page"], "a");
}
#[test]
fn frame_transitions_disable_outgoing_input_and_settle() {
    let mut s = scene(false);
    let f = frame(&mut s, 2);
    input(&mut s, f, "navigate", json!({"page":"a"}));
    resolve(&mut s, f, false);
    let editor = s.find_content_name(f, "editor").unwrap().unwrap();
    s.input(
        serde_json::from_value(json!({"kind":"focus","id":editor})).unwrap(),
        0.,
    )
    .unwrap();
    input(
        &mut s,
        f,
        "navigate",
        json!({"page":"b","transition":"SlideFromRight"}),
    );
    resolve(&mut s, f, false);
    let snap = snapshot(&mut s, f);
    assert_eq!(snap["frame"]["animating"], true);
    assert_ne!(s.focused, Some(editor));
    let old = s.get(editor).unwrap();
    assert!(!old.enabled);
    s.advance(600.);
    layout(&mut s);
    assert_eq!(snapshot(&mut s, f)["frame"]["animating"], false);
    assert!(!s.get(editor).unwrap().visible);
    let id = s.find_content_name(f, "message").unwrap().unwrap();
    assert!(s.get(id).unwrap().visible);
}
#[test]
fn user_control_names_do_not_escape_nested_scopes() {
    let mut s = scene(true);
    let host = s.create(s.root, NodeKind::UserControl, json!({})).unwrap();
    let nested = s
        .create(host, NodeKind::UserControl, json!({"layoutKey":"nested"}))
        .unwrap();
    let text = s
        .create(
            nested,
            NodeKind::TextBlock,
            json!({"layoutKey":"private","text":"Inside"}),
        )
        .unwrap();
    assert_eq!(s.find_content_name(host, "nested").unwrap(), Some(nested));
    assert_eq!(s.find_content_name(host, "private").unwrap(), None);
    assert_eq!(s.find_content_name(nested, "private").unwrap(), Some(text));
}

#[test]
fn pending_navigation_definitions_cannot_be_replaced_by_callbacks() {
    let mut s = scene(true);
    let f = frame(&mut s, 2);
    input(&mut s, f, "navigate", json!({"page":"a"}));
    assert!(s
        .update(vec![Update {
            id: f,
            patch: json!({"contentHost":{"pages":[]}})
        }])
        .is_err());
    resolve(&mut s, f, false);
    assert_eq!(snapshot(&mut s, f)["frame"]["current"]["page"], "a");
}

#[test]
fn transparent_incoming_page_keeps_its_natural_measure_during_animation() {
    let mut s = scene(false);
    let f = frame(&mut s, 2);
    s.update(vec![Update{id:f,patch:json!({"width":null,"height":null,"horizontalAlignment":"Left","verticalAlignment":"Top"})}]).unwrap();
    input(&mut s, f, "navigate", json!({"page":"a"}));
    resolve(&mut s, f, false);
    input(&mut s, f, "navigate", json!({"page":"b"}));
    resolve(&mut s, f, false);
    assert!(s.get(f).unwrap().desired[0] > 0.);
    assert!(s.get(f).unwrap().desired[1] > 0.);
    let before = s.get(f).unwrap().desired;
    s.advance(600.);
    layout(&mut s);
    assert_eq!(before, s.get(f).unwrap().desired);
}
