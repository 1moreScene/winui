use serde_json::{json, Value};
use winui_wasm::{
    enums::*,
    scene::{Input, Scene, Update},
    typography::{Font, Metrics, TextMeasurer},
};
struct Measure;
impl TextMeasurer for Measure {
    fn measure(&mut self, t: &str, f: &Font) -> Metrics {
        Metrics {
            width: t.len() as f64 * f.size * 0.5,
            ascent: f.size * 0.8,
            descent: f.size * 0.2,
            ..Default::default()
        }
    }
}
fn scene() -> Scene {
    let mut s = Scene::new(Theme::Light, true);
    s.resize(800., 500., 1.).unwrap();
    s
}
fn source() -> Value {
    json!([{"id":"a","text":"A"},{"id":"b","text":"B"},{"id":"c","text":"C"},{"id":"d","text":"D"}])
}
fn send(s: &mut Scene, v: Value, t: f64) {
    s.input(serde_json::from_value::<Input>(v).unwrap(), t)
        .unwrap();
    s.layout(&mut Measure);
}
fn resolve(s: &mut Scene, id: u32, cancel: bool, t: f64) {
    let r = s
        .events
        .iter()
        .rev()
        .find(|e| e.target == id && e.request_id.is_some())
        .unwrap()
        .request_id
        .unwrap();
    send(
        s,
        json!({"kind":"collectionDragResolve","id":id,"request":r,"cancel":cancel,"operation":"Move"}),
        t,
    );
}
fn order(s: &Scene, id: u32) -> Vec<String> {
    s.nodes[&id]
        .props
        .collection_items
        .iter()
        .map(|i| i.id.clone())
        .collect()
}
#[test]
fn group_headers_stick_push_and_recycle_without_leaking_containers() {
    let mut s = scene();
    let mut items = vec![];
    for group in ["A", "B", "C"] {
        for i in 0..4 {
            items.push(json!({"id":format!("{group}{i}"),"text":"Contact","group":group}));
        }
    }
    let id=s.create(s.root,NodeKind::ListView,json!({"width":400,"height":200,"collectionGroups":[{"id":"A","header":"A"},{"id":"B","header":"B"},{"id":"C","header":"C"}],"collectionItems":items})).unwrap();
    for _ in 0..3 {
        s.layout(&mut Measure);
    }
    let snap = s.snapshot();
    let c = snap
        .nodes
        .iter()
        .find(|n| n.id == id)
        .unwrap()
        .collection
        .as_ref()
        .unwrap();
    assert_eq!(c.headers.len(), 3);
    let header = c.headers.iter().find(|h| h.key == "A").unwrap().id;
    let height = s.nodes[&header].rect.height + 4.;
    assert!(height >= 48.);
    let boundary = height + 160.;
    send(
        &mut s,
        json!({"kind":"scroll","id":id,"x":null,"y":70.,"zoom":null,"animated":false}),
        0.,
    );
    assert!((s.nodes[&header].world.point(0., 0.).1).abs() < 1e-6);
    send(
        &mut s,
        json!({"kind":"scroll","id":id,"x":null,"y":boundary-height+10.,"zoom":null,"animated":false}),
        1.,
    );
    assert!((s.nodes[&header].world.point(0., 0.).1 + 10.).abs() < 1e-6);
    s.update(vec![Update {
        id,
        patch: json!({"collectionGroups":[],"collectionItems":source()}),
    }])
    .unwrap();
    s.layout(&mut Measure);
    assert!(!s.nodes.contains_key(&header));
    assert!(!s
        .nodes
        .values()
        .any(|n| n.kind == NodeKind::CollectionHeader));
}
#[test]
fn variable_height_templates_use_measured_prefix_positions() {
    let mut s = scene();
    let id = s
        .create(
            s.root,
            NodeKind::ListView,
            json!({"width":240,"height":150,"hasItemTemplate":true,"collectionItems":source()}),
        )
        .unwrap();
    s.layout(&mut Measure);
    let realized = s
        .snapshot()
        .nodes
        .into_iter()
        .find(|n| n.id == id)
        .unwrap()
        .collection
        .unwrap()
        .realized;
    for item in &realized {
        s.create(
            item.id,
            NodeKind::Border,
            json!({"height":40.+item.index as f64*10.}),
        )
        .unwrap();
    }
    for _ in 0..3 {
        s.layout(&mut Measure);
    }
    let a = realized.iter().find(|i| i.index == 0).unwrap();
    let b = realized.iter().find(|i| i.index == 1).unwrap();
    let c = realized.iter().find(|i| i.index == 2).unwrap();
    assert_eq!(s.nodes[&b.id].rect.y - s.nodes[&a.id].rect.y, 40.);
    assert_eq!(s.nodes[&c.id].rect.y - s.nodes[&b.id].rect.y, 50.);
}
#[test]
fn stable_multi_item_reorder_is_atomic_and_keeps_selection() {
    let mut s = scene();
    let id=s.create(s.root,NodeKind::ListView,json!({"width":240,"height":160,"collectionItems":source(),"selectedKeys":["a","b"],"selectionMode":"Extended"})).unwrap();
    s.layout(&mut Measure);
    send(
        &mut s,
        json!({"kind":"collectionReorder","id":id,"keys":["a","b"],"index":4}),
        0.,
    );
    assert_eq!(order(&s, id), ["c", "d", "a", "b"]);
    assert_eq!(
        s.nodes[&id].props.selected_keys.as_ref(),
        &vec!["a".to_string(), "b".to_string()]
    );
    assert!(s.events.iter().any(|e| e.kind == EventKind::ItemsChanged));
}
#[test]
fn drag_negotiation_stale_resolution_cancel_and_cross_list_move() {
    let mut s = scene();
    let a=s.create(s.root,NodeKind::ListView,json!({"width":240,"height":160,"collectionItems":source(),"canDragItems":true,"canReorderItems":true,"allowDrop":true})).unwrap();
    let b = s
        .create(
            s.root,
            NodeKind::ListView,
            json!({"width":240,"height":160,"collectionItems":[],"allowDrop":true}),
        )
        .unwrap();
    s.layout(&mut Measure);
    send(
        &mut s,
        json!({"kind":"collectionDragStart","id":a,"index":1}),
        0.,
    );
    let request = s.events.last().unwrap().request_id.unwrap();
    send(
        &mut s,
        json!({"kind":"collectionDragResolve","id":a,"request":request+1,"cancel":false,"operation":"Move"}),
        0.,
    );
    resolve(&mut s, a, false, 0.);
    let drag = s
        .snapshot()
        .nodes
        .into_iter()
        .find(|n| n.id == a)
        .unwrap()
        .collection
        .unwrap()
        .drag;
    assert!(drag.active);
    let item = json!([{"id":"b","text":"B"}]);
    send(
        &mut s,
        json!({"kind":"collectionDragOver","id":b,"source":a,"items":item,"x":12.,"y":20.,"operation":"Move"}),
        1.,
    );
    resolve(&mut s, b, false, 1.);
    send(&mut s, json!({"kind":"collectionDrop","id":b}), 2.);
    resolve(&mut s, b, true, 2.);
    assert_eq!(order(&s, a), ["a", "b", "c", "d"]);
    assert!(order(&s, b).is_empty());
    send(
        &mut s,
        json!({"kind":"collectionDragOver","id":b,"source":a,"items":item,"x":12.,"y":20.,"operation":"Move"}),
        3.,
    );
    resolve(&mut s, b, false, 3.);
    send(&mut s, json!({"kind":"collectionDrop","id":b}), 4.);
    resolve(&mut s, b, false, 4.);
    assert_eq!(order(&s, a), ["a", "c", "d"]);
    assert_eq!(order(&s, b), ["b"]);
    send(
        &mut s,
        json!({"kind":"collectionDragEnd","id":a,"operation":"Move"}),
        5.,
    );
    assert_eq!(s.events.last().unwrap().kind, EventKind::DragItemsCompleted);
}
#[test]
fn grouped_auto_reorder_is_disabled_like_the_native_items_host() {
    let mut s = scene();
    let id=s.create(s.root,NodeKind::ListView,json!({"width":240,"height":160,"collectionGroups":[{"id":"g","header":"Group"}],"collectionItems":[{"id":"a","group":"g"},{"id":"b","group":"g"}],"allowDrop":true,"canDragItems":true,"canReorderItems":true})).unwrap();
    s.layout(&mut Measure);
    send(
        &mut s,
        json!({"kind":"collectionReorder","id":id,"keys":["a"],"index":2}),
        0.,
    );
    assert_eq!(order(&s, id), ["a", "b"]);
}
#[test]
fn live_reorder_waits_without_mutating_source_and_leave_cancels() {
    let mut s = scene();
    let id=s.create(s.root,NodeKind::ListView,json!({"width":240,"height":160,"collectionItems":source(),"canDragItems":true,"canReorderItems":true,"allowDrop":true})).unwrap();
    s.layout(&mut Measure);
    send(
        &mut s,
        json!({"kind":"collectionDragOver","id":id,"source":id,"items":[{"id":"a","text":"A"}],"x":80.,"y":100.,"operation":"Move"}),
        0.,
    );
    resolve(&mut s, id, false, 0.);
    s.advance(199.);
    s.layout(&mut Measure);
    let c = s
        .snapshot()
        .nodes
        .into_iter()
        .find(|n| n.id == id)
        .unwrap()
        .collection
        .unwrap();
    assert_eq!(c.drag.preview_index, None);
    s.advance(201.);
    s.layout(&mut Measure);
    let c = s
        .snapshot()
        .nodes
        .into_iter()
        .find(|n| n.id == id)
        .unwrap()
        .collection
        .unwrap();
    assert!(c.drag.preview_index.is_some());
    assert_eq!(order(&s, id), ["a", "b", "c", "d"]);
    send(&mut s, json!({"kind":"collectionDragLeave","id":id}), 202.);
    s.advance(600.);
    s.layout(&mut Measure);
    assert!(!s.snapshot().animating);
}
#[test]
fn source_insertions_preserve_anchors_offsets_and_follow_end_by_mode() {
    for (mode, expected) in [
        ("KeepItemsInView", 120.),
        ("KeepScrollOffset", 80.),
        ("KeepLastItemInView", 120.),
    ] {
        let mut s = scene();
        let items = (0..10)
            .map(|i| json!({"id":i.to_string(),"text":"Item"}))
            .collect::<Vec<_>>();
        let id=s.create(s.root,NodeKind::ListView,json!({"width":240,"height":160,"collectionItems":items,"itemsUpdatingScrollMode":mode})).unwrap();
        s.layout(&mut Measure);
        send(
            &mut s,
            json!({"kind":"scroll","id":id,"x":null,"y":80.,"zoom":null,"animated":false}),
            0.,
        );
        let mut inserted = vec![json!({"id":"new","text":"New"})];
        inserted.extend(items.clone());
        s.update(vec![Update {
            id,
            patch: json!({"collectionItems":inserted}),
        }])
        .unwrap();
        for _ in 0..3 {
            s.layout(&mut Measure);
        }
        assert_eq!(s.nodes[&id].props.vertical_offset, expected, "{mode}");
        send(
            &mut s,
            json!({"kind":"collectionRestore","id":id,"key":"5","offset":7.}),
            1.,
        );
        assert_eq!(s.nodes[&id].props.vertical_offset, 247.);
    }
    let mut s = scene();
    let id=s.create(s.root,NodeKind::ListView,json!({"width":240,"height":80,"collectionItems":source(),"itemsUpdatingScrollMode":"KeepLastItemInView"})).unwrap();
    s.layout(&mut Measure);
    send(
        &mut s,
        json!({"kind":"scroll","id":id,"x":null,"y":80.,"zoom":null,"animated":false}),
        0.,
    );
    let mut appended = source().as_array().unwrap().clone();
    appended.push(json!({"id":"e","text":"E"}));
    s.update(vec![Update {
        id,
        patch: json!({"collectionItems":appended}),
    }])
    .unwrap();
    for _ in 0..3 {
        s.layout(&mut Measure);
    }
    assert_eq!(s.nodes[&id].props.vertical_offset, 120.);
}
#[test]
fn incremental_requests_coalesce_and_resume_after_a_page() {
    let mut s = scene();
    let id = s
        .create(
            s.root,
            NodeKind::ListView,
            json!({"width":240,"height":160,"collectionItems":source(),"hasMoreItems":true}),
        )
        .unwrap();
    s.layout(&mut Measure);
    assert_eq!(
        s.events
            .iter()
            .filter(|e| e.kind == EventKind::IncrementalLoadRequested)
            .count(),
        1
    );
    s.events.clear();
    for _ in 0..10 {
        s.layout(&mut Measure);
    }
    assert!(!s
        .events
        .iter()
        .any(|e| e.kind == EventKind::IncrementalLoadRequested));
    let mut page = source().as_array().unwrap().clone();
    page.push(json!({"id":"e","text":"E"}));
    s.update(vec![Update {
        id,
        patch: json!({"collectionItems":page}),
    }])
    .unwrap();
    s.layout(&mut Measure);
    assert_eq!(
        s.events
            .iter()
            .filter(|e| e.kind == EventKind::IncrementalLoadRequested)
            .count(),
        1
    );
}

#[test]
fn keyboard_reorder_and_context_follow_native_modifiers() {
    let mut s = scene();
    let id=s.create(s.root,NodeKind::ListView,json!({"width":240,"height":160,"collectionItems":source(),"selectedKeys":["a"],"canReorderItems":true,"allowDrop":true})).unwrap();
    s.layout(&mut Measure);
    send(&mut s, json!({"kind":"focus","id":id}), 0.);
    send(
        &mut s,
        json!({"kind":"keyDown","key":"Alt+Shift+ArrowDown","repeat":false}),
        1.,
    );
    assert_eq!(order(&s, id), ["b", "a", "c", "d"]);
    assert_eq!(
        s.nodes[&id].props.selected_keys.as_ref(),
        &vec!["a".to_string()]
    );
    send(
        &mut s,
        json!({"kind":"keyDown","key":"Shift+F10","repeat":false}),
        2.,
    );
    assert!(s
        .events
        .iter()
        .any(|e| e.kind == EventKind::ContextRequested
            && e.collection.as_ref().unwrap().position.is_some()));
}
#[test]
fn drag_placeholder_uses_the_measured_fade_and_cancel_restores_visibility() {
    use winui_wasm::render::Draw;
    let mut s = Scene::new(Theme::Light, false);
    s.resize(800., 500., 1.).unwrap();
    let id = s
        .create(
            s.root,
            NodeKind::ListView,
            json!({"width":240,"height":160,"collectionItems":source(),"canDragItems":true}),
        )
        .unwrap();
    s.layout(&mut Measure);
    send(
        &mut s,
        json!({"kind":"collectionDragStart","id":id,"index":0}),
        0.,
    );
    resolve(&mut s, id, false, 0.);
    s.advance(70.);
    s.layout(&mut Measure);
    assert!(s
        .display_list()
        .iter()
        .any(|d| matches!(d,Draw::Layer{opacity} if *opacity>0.&&*opacity<1.)));
    s.advance(167.);
    s.layout(&mut Measure);
    assert!(s
        .display_list()
        .iter()
        .any(|d| matches!(d,Draw::Layer{opacity} if *opacity==0.)));
    send(
        &mut s,
        json!({"kind":"collectionDragEnd","id":id,"operation":"None"}),
        168.,
    );
    assert!(!s
        .display_list()
        .iter()
        .any(|d| matches!(d,Draw::Layer{opacity} if *opacity==0.)));
}
#[test]
fn platform_drag_negotiation_never_recycles_dom_slots_before_the_scheduled_frame() {
    let mut s = scene();
    let a = s
        .create(
            s.root,
            NodeKind::ListView,
            json!({"width":240,"height":160,"collectionItems":source(),"canDragItems":true}),
        )
        .unwrap();
    let b = s
        .create(
            s.root,
            NodeKind::ListView,
            json!({"width":240,"height":160,"collectionItems":[],"allowDrop":true}),
        )
        .unwrap();
    s.layout(&mut Measure);
    let before = s.nodes.len();
    let command = |v| Some(serde_json::from_value::<Input>(v).unwrap());
    let start = s
        .collection_host_input(
            a,
            command(json!({"kind":"collectionDragStart","id":a,"index":0})),
            0.,
        )
        .unwrap();
    assert_eq!(start.events.len(), 1);
    let request = start.events[0].request_id.unwrap();
    let active=s.collection_host_input(a,command(json!({"kind":"collectionDragResolve","id":a,"request":request,"cancel":false,"operation":"Move"})),0.).unwrap();
    assert!(active.drag.unwrap().active);
    let over=s.collection_host_input(b,command(json!({"kind":"collectionDragOver","id":b,"source":a,"items":[{"id":"a","text":"A"}],"x":20.,"y":20.,"operation":"Move"})),1.).unwrap();
    s.collection_host_input(b,command(json!({"kind":"collectionDragResolve","id":b,"request":over.events[0].request_id.unwrap(),"cancel":false,"operation":"Move"})),1.).unwrap();
    let drop = s
        .collection_host_input(b, command(json!({"kind":"collectionDrop","id":b})), 2.)
        .unwrap();
    let committed=s.collection_host_input(b,command(json!({"kind":"collectionDragResolve","id":b,"request":drop.events[0].request_id.unwrap(),"cancel":false,"operation":"Move"})),2.).unwrap();
    assert_eq!(
        committed
            .events
            .iter()
            .filter(|e| e.kind == EventKind::ItemsChanged)
            .count(),
        2
    );
    assert_eq!(s.nodes.len(), before);
    s.collection_host_input(b, command(json!({"kind":"collectionDragLeave","id":b})), 3.)
        .unwrap();
    let ended = s
        .collection_host_input(
            a,
            command(json!({"kind":"collectionDragEnd","id":a,"operation":"Move"})),
            3.,
        )
        .unwrap();
    assert!(!ended.drag.unwrap().active);
    assert_eq!(
        ended
            .events
            .iter()
            .filter(|e| e.kind == EventKind::DragItemsCompleted)
            .count(),
        1
    );
    s.layout(&mut Measure);
    s.advance(2000.);
    s.layout(&mut Measure);
    assert!(!s.snapshot().animating);
}
#[test]
fn external_drag_opens_a_gap_and_drop_uses_measured_add_delete_timelines() {
    let mut s = Scene::new(Theme::Light, false);
    s.resize(800., 500., 1.).unwrap();
    let a = s
        .create(
            s.root,
            NodeKind::ListView,
            json!({"width":240,"height":160,"collectionItems":source(),"canDragItems":true}),
        )
        .unwrap();
    let b=s.create(s.root,NodeKind::ListView,json!({"width":240,"height":160,"collectionItems":[{"id":"x","text":"X"},{"id":"y","text":"Y"}],"canReorderItems":true,"allowDrop":true})).unwrap();
    s.layout(&mut Measure);
    let old = s
        .snapshot()
        .nodes
        .into_iter()
        .find(|n| n.id == b)
        .unwrap()
        .collection
        .unwrap()
        .realized
        .into_iter()
        .find(|n| n.key == "x")
        .unwrap()
        .id;
    send(
        &mut s,
        json!({"kind":"collectionDragStart","id":a,"index":0}),
        0.,
    );
    resolve(&mut s, a, false, 0.);
    send(
        &mut s,
        json!({"kind":"collectionDragOver","id":b,"source":a,"items":[{"id":"a","text":"A"}],"x":10.,"y":5.,"operation":"Move"}),
        0.,
    );
    resolve(&mut s, b, false, 0.);
    s.advance(200.);
    s.layout(&mut Measure);
    s.advance(280.);
    s.layout(&mut Measure);
    assert!(s.nodes[&old].rect.y > 0. && s.nodes[&old].rect.y < 40.);
    send(&mut s, json!({"kind":"collectionDrop","id":b}), 300.);
    resolve(&mut s, b, false, 300.);
    send(
        &mut s,
        json!({"kind":"collectionDragEnd","id":a,"operation":"Move"}),
        300.,
    );
    let added = s
        .snapshot()
        .nodes
        .into_iter()
        .find(|n| n.id == b)
        .unwrap()
        .collection
        .unwrap()
        .realized
        .into_iter()
        .find(|n| n.key == "a")
        .unwrap()
        .id;
    let visual = |s: &mut Scene| {
        s.snapshot()
            .nodes
            .into_iter()
            .find(|n| n.id == added)
            .unwrap()
            .collection_item_visual
            .unwrap()
    };
    s.advance(539.);
    s.layout(&mut Measure);
    assert_eq!(visual(&mut s).opacity, 0.);
    assert_eq!(visual(&mut s).scale, 0.85);
    s.advance(600.);
    s.layout(&mut Measure);
    let midway = visual(&mut s);
    assert!((midway.opacity - 0.5).abs() < 1e-5);
    assert!(midway.scale > 0.85 && midway.scale < 1.);
    s.advance(761.);
    s.layout(&mut Measure);
    assert_eq!(visual(&mut s).opacity, 1.);
    assert_eq!(visual(&mut s).scale, 1.);
    assert!(!s.snapshot().animating);
}
