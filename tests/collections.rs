use serde_json::json;
use winui_wasm::{
    enums::*,
    scene::{Input, Scene, Update},
    typography::{Font, Metrics, TextMeasurer},
};
struct Measure;
impl TextMeasurer for Measure {
    fn measure(&mut self, text: &str, font: &Font) -> Metrics {
        Metrics {
            width: text.chars().count() as f64 * font.size * 0.5,
            ascent: font.size * 0.8,
            descent: font.size * 0.2,
            ..Default::default()
        }
    }
}
fn scene() -> Scene {
    let mut s = Scene::new(Theme::Light, true);
    s.resize(800., 500., 1.25).unwrap();
    s
}
fn data(n: usize) -> serde_json::Value {
    json!((0..n)
        .map(|i| json!({"id":i.to_string(),"text":format!("Item {}",i+1)}))
        .collect::<Vec<_>>())
}
fn input(s: &mut Scene, v: serde_json::Value, t: f64) {
    s.input(serde_json::from_value::<Input>(v).unwrap(), t)
        .unwrap();
    s.layout(&mut Measure);
}
#[test]
fn native_defaults_uniform_slots_and_bounded_window_are_real_nodes() {
    let mut s = scene();
    let list = s
        .create(
            s.root,
            NodeKind::ListView,
            json!({"collectionItems":data(10000),"width":240,"height":160}),
        )
        .unwrap();
    s.layout(&mut Measure);
    let snap = s.snapshot();
    let owner = snap.nodes.iter().find(|n| n.id == list).unwrap();
    let c = owner.collection.as_ref().unwrap();
    assert_eq!(c.total_count, 10000);
    assert!(c.realized.len() < 30);
    assert_eq!(c.cell[1], 40.);
    assert!(owner.props.collection_items.is_empty());
    assert!(serde_json::to_vec(&snap).unwrap().len() < 200000);
    input(
        &mut s,
        json!({"kind":"collectionScroll","id":list,"index":9999}),
        1.,
    );
    let snap = s.snapshot();
    let c = snap
        .nodes
        .iter()
        .find(|n| n.id == list)
        .unwrap()
        .collection
        .as_ref()
        .unwrap();
    assert!(c.realized.iter().any(|r| r.index == 9999));
    assert!(c.realized.len() < 30);
    assert!(s.nodes.len() < 35);
    let before = s.nodes.len();
    s.destroy(list).unwrap();
    assert!(s.nodes.len() < before);
    assert_eq!(s.nodes.len(), 1);
}
#[test]
fn item_click_is_a_notification_before_selection_and_destroy_or_removal_is_safe() {
    let mut s = scene();
    let list = s
        .create(
            s.root,
            NodeKind::ListView,
            json!({"collectionItems":data(5),"width":240,"height":160,"isItemClickEnabled":true}),
        )
        .unwrap();
    s.layout(&mut Measure);
    s.events.clear();
    input(
        &mut s,
        json!({"kind":"collectionInvoke","id":list,"index":1}),
        1.,
    );
    assert!(s.nodes[&list].props.selected_keys.is_empty());
    let event = s
        .events
        .iter()
        .find(|e| e.kind == EventKind::ItemClick)
        .unwrap();
    let request = event.request_id.unwrap();
    assert_eq!(event.item_id.as_deref(), Some("1"));
    input(
        &mut s,
        json!({"kind":"collectionCommit","id":list,"request":request-1}),
        2.,
    );
    assert!(s.nodes[&list].props.selected_keys.is_empty());
    input(
        &mut s,
        json!({"kind":"collectionCommit","id":list,"request":request}),
        3.,
    );
    assert_eq!(
        s.nodes[&list].props.selected_keys.as_ref(),
        &vec!["1".to_string()]
    );
    input(
        &mut s,
        json!({"kind":"collectionInvoke","id":list,"index":2}),
        4.,
    );
    let request = s
        .events
        .iter()
        .rev()
        .find(|e| e.kind == EventKind::ItemClick)
        .unwrap()
        .request_id
        .unwrap();
    s.update(vec![Update {
        id: list,
        patch: json!({"collectionItems":data(2)}),
    }])
    .unwrap();
    input(
        &mut s,
        json!({"kind":"collectionCommit","id":list,"request":request}),
        5.,
    );
    assert_eq!(
        s.nodes[&list].props.selected_keys.as_ref(),
        &vec!["1".to_string()]
    );
}
#[test]
fn selection_modes_range_keys_and_reordered_stable_ids_follow_collection_contract() {
    let mut s = scene();
    let list = s
        .create(
            s.root,
            NodeKind::ListView,
            json!({"collectionItems":data(8),"width":240,"height":160,"selectionMode":"Extended"}),
        )
        .unwrap();
    s.layout(&mut Measure);
    input(
        &mut s,
        json!({"kind":"collectionInvoke","id":list,"index":1}),
        1.,
    );
    input(
        &mut s,
        json!({"kind":"collectionInvoke","id":list,"index":4,"shift":true}),
        2.,
    );
    assert_eq!(s.nodes[&list].props.selected_keys.len(), 4);
    input(
        &mut s,
        json!({"kind":"keyDown","key":"Ctrl+ArrowDown","repeat":false}),
        3.,
    );
    assert_eq!(s.nodes[&list].props.selected_keys.len(), 4);
    input(
        &mut s,
        json!({"kind":"keyDown","key":"Ctrl+ ","repeat":false}),
        4.,
    );
    assert!(s.nodes[&list].props.selected_keys.iter().any(|k| k == "5"));
    s.update(vec![Update {
        id: list,
        patch: json!({"collectionItems":[{"id":"5","text":"Moved"},{"id":"1","text":"One"}]}),
    }])
    .unwrap();
    s.layout(&mut Measure);
    assert_eq!(s.nodes[&list].props.selected_keys.len(), 2);
    s.update(vec![Update {
        id: list,
        patch: json!({"selectionMode":"None"}),
    }])
    .unwrap();
    s.layout(&mut Measure);
    assert!(s.nodes[&list].props.selected_keys.is_empty());
}
#[test]
fn real_grid_item_containers_use_native_size_and_template_ownership() {
    let mut s = scene();
    let grid = s
        .create(
            s.root,
            NodeKind::GridView,
            json!({"collectionItems":data(8),"width":200,"maximumRowsOrColumns":3}),
        )
        .unwrap();
    s.layout(&mut Measure);
    let snap = s.snapshot();
    let c = snap
        .nodes
        .iter()
        .find(|n| n.id == grid)
        .unwrap()
        .collection
        .as_ref()
        .unwrap();
    assert_eq!(c.per_line, 3);
    assert_eq!(c.cell, [48., 48.]);
    let container = c.realized[0].id;
    assert!(s.reparent(container, s.root, None).is_err());
    assert!(s
        .create(grid, NodeKind::Button, json!({"text":"Wrong content"}))
        .is_err());
    assert!(s.create(grid, NodeKind::CollectionItem, json!({})).is_err());
    s.create(
        container,
        NodeKind::Rectangle,
        json!({"width":32,"height":32,"fill":"#ffa500"}),
    )
    .unwrap();
    s.layout(&mut Measure);
    assert!(!s.display_list().is_empty());
    let old = s.properties(grid).unwrap();
    assert!(s
        .update(vec![Update {
            id: grid,
            patch: json!({"collectionItems":[{"id":"a","text":"a"},{"id":"a","text":"b"}]})
        }])
        .is_err());
    assert_eq!(
        s.properties(grid).unwrap().collection_items.len(),
        old.collection_items.len()
    );
}
#[test]
fn wrapping_panels_honor_native_orientation_first_cell_and_spans() {
    let mut s = scene();
    let p = s
        .create(
            s.root,
            NodeKind::VariableSizedWrapGrid,
            json!({"width":400,"itemWidth":44,"itemHeight":44,"maximumRowsOrColumns":3}),
        )
        .unwrap();
    for (row, col) in [(1, 1), (2, 1), (1, 2), (2, 2)] {
        s.create(
            p,
            NodeKind::Border,
            json!({"rowSpan":row,"columnSpan":col,"background":"#ffa500"}),
        )
        .unwrap();
    }
    s.layout(&mut Measure);
    let children = s.nodes[&p].children.clone();
    assert_eq!(s.nodes[&children[0]].rect.x, 0.);
    assert_eq!(s.nodes[&children[1]].rect.y, 44.);
    assert_eq!(s.nodes[&children[2]].rect.x, 44.);
    assert_eq!(s.nodes[&children[3]].rect.y, 44.);
    s.update(vec![Update {
        id: p,
        patch: json!({"orientation":"Horizontal"}),
    }])
    .unwrap();
    s.layout(&mut Measure);
    assert_eq!(s.nodes[&children[1]].rect.x, 44.);
    assert_eq!(s.nodes[&children[2]].rect.y, 88.);
}

#[test]
fn smaller_wrap_cells_keep_minimum_container_and_full_text_advance() {
    let mut s = scene();
    let list=s.create(s.root,NodeKind::ListView,json!({"width":220,"height":160,"collectionItems":data(12),"itemsPanel":"ItemsWrapGrid","orientation":"Horizontal","itemWidth":60,"itemHeight":40,"maximumRowsOrColumns":3})).unwrap();
    s.layout(&mut Measure);
    let items = s.nodes[&list].children.clone();
    let first = &s.nodes[&items[0]];
    assert_eq!(first.rect.width, 88.);
    assert_eq!(first.text.width, 42.);
    let (x, y) = first.world.point(61., 20.);
    assert_eq!(s.hit(x, y), Some(items[1]));
    assert!(s.display_list().iter().any(|draw|matches!(draw,winui_wasm::render::Draw::Text{text,max_width,..} if text=="Item 10"&&*max_width>=49.)));
}

#[test]
fn touch_tap_selects_but_pan_cancel_disabled_and_repeat_do_not() {
    let mut s = scene();
    let list=s.create(s.root,NodeKind::ListView,json!({"width":240,"height":160,"collectionItems":[{"id":"a","text":"A","enabled":false},{"id":"b","text":"B"},{"id":"c","text":"C"}]})).unwrap();
    s.layout(&mut Measure);
    let r = s.nodes[&list].rect;
    let (x, y) = (r.x + 30., r.y + 60.);
    input(
        &mut s,
        json!({"kind":"touch","phase":"down","pointer":1,"x":x,"y":y}),
        1.,
    );
    input(
        &mut s,
        json!({"kind":"touch","phase":"up","pointer":1,"x":x,"y":y}),
        2.,
    );
    assert_eq!(
        s.nodes[&list].props.selected_keys.as_ref(),
        &vec!["b".to_string()]
    );
    input(
        &mut s,
        json!({"kind":"touch","phase":"down","pointer":2,"x":x,"y":y+40.}),
        3.,
    );
    input(
        &mut s,
        json!({"kind":"touch","phase":"move","pointer":2,"x":x,"y":y+10.}),
        4.,
    );
    input(
        &mut s,
        json!({"kind":"touch","phase":"up","pointer":2,"x":x,"y":y+10.}),
        5.,
    );
    assert_eq!(
        s.nodes[&list].props.selected_keys.as_ref(),
        &vec!["b".to_string()]
    );
    input(&mut s, json!({"kind":"focus","id":list}), 6.);
    input(
        &mut s,
        json!({"kind":"keyDown","key":"Home","repeat":false}),
        7.,
    );
    assert_eq!(
        s.nodes[&list].props.selected_keys.as_ref(),
        &vec!["b".to_string()]
    );
    s.update(vec![Update {
        id: list,
        patch: json!({"selectionMode":"Multiple"}),
    }])
    .unwrap();
    input(
        &mut s,
        json!({"kind":"keyDown","key":" ","repeat":true}),
        8.,
    );
    assert_eq!(s.nodes[&list].props.selected_keys.len(), 1);
}

#[test]
fn rtl_grid_mirrors_slots_and_keeps_directional_keyboard_selection() {
    let mut s = scene();
    let grid=s.create(s.root,NodeKind::GridView,json!({"width":144,"height":160,"collectionItems":data(8),"flowDirection":"RightToLeft","maximumRowsOrColumns":3})).unwrap();
    s.layout(&mut Measure);
    let snap = s.snapshot();
    let root = snap.nodes.iter().find(|n| n.id == grid).unwrap();
    let items = &root.collection.as_ref().unwrap().realized;
    let first = snap.nodes.iter().find(|n| n.id == items[0].id).unwrap();
    let second = snap.nodes.iter().find(|n| n.id == items[1].id).unwrap();
    assert!(first.rect.x > second.rect.x);
    input(&mut s, json!({"kind":"focus","id":grid}), 1.);
    input(
        &mut s,
        json!({"kind":"keyDown","key":"ArrowLeft","repeat":false}),
        2.,
    );
    assert_eq!(
        s.nodes[&grid].props.selected_keys.as_ref(),
        &vec!["1".to_string()]
    );
}

#[test]
fn rtl_parent_mirrors_asymmetric_child_margins_without_changing_authored_values() {
    let mut s = scene();
    let grid=s.create(s.root,NodeKind::Grid,json!({"width":300,"height":100,"flowDirection":"RightToLeft","columns":[{"unit":"Pixel","value":44},{"unit":"Star","value":1}]})).unwrap();
    let label = s
        .create(
            grid,
            NodeKind::TextBlock,
            json!({"column":1,"text":"Contact","margin":[12,0,0,0]}),
        )
        .unwrap();
    s.layout(&mut Measure);
    let node = &s.nodes[&label];
    assert_eq!(node.rect.x, 0.);
    assert_eq!(node.rect.width, 244.);
    assert_eq!(node.props.margin, [12., 0., 0., 0.]);
}

#[test]
fn scene_budget_exhaustion_is_diagnostic_and_recovers_without_panic() {
    let mut s = scene();
    let list = s
        .create(
            s.root,
            NodeKind::ListView,
            json!({"width":240,"height":160,"collectionItems":data(20)}),
        )
        .unwrap();
    let mut fillers = Vec::new();
    while s.nodes.len() < 5000 {
        fillers.push(
            s.create(s.root, NodeKind::TextBlock, json!({"text":""}))
                .unwrap(),
        );
    }
    s.layout(&mut Measure);
    assert!(s
        .snapshot()
        .nodes
        .iter()
        .find(|n| n.id == list)
        .unwrap()
        .collection
        .as_ref()
        .unwrap()
        .realization_error
        .is_some());
    for id in fillers.iter().take(30) {
        s.destroy(*id).unwrap();
    }
    s.layout(&mut Measure);
    let snap = s.snapshot();
    let c = snap
        .nodes
        .iter()
        .find(|n| n.id == list)
        .unwrap()
        .collection
        .as_ref()
        .unwrap();
    assert!(c.realization_error.is_none());
    assert!(!c.realized.is_empty());
}

#[test]
fn rapid_selection_uses_source_indicator_timing_with_bounded_interruptions() {
    use winui_wasm::render::Draw;
    let mut s = Scene::new(Theme::Light, false);
    s.resize(800., 500., 1.25).unwrap();
    let list = s
        .create(
            s.root,
            NodeKind::ListView,
            json!({"width":240,"height":160,"collectionItems":data(5)}),
        )
        .unwrap();
    s.layout(&mut Measure);
    for i in 0..30 {
        let key = (i % 4).to_string();
        s.update(vec![Update {
            id: list,
            patch: json!({"selectedKeys":[key]}),
        }])
        .unwrap();
        s.advance(i as f64 * 10.);
        s.layout(&mut Measure);
        for d in s.display_list() {
            match d {
                Draw::Fill { rect, radius, .. }
                    if (radius - 1.5).abs() < 1e-8 && rect.width < 4. =>
                {
                    assert!(rect.height <= 16.01)
                }
                Draw::Layer { opacity } => assert!((0. ..=1.).contains(&opacity)),
                _ => {}
            }
        }
    }
    let ir = winui_wasm::scene::collections::contract();
    assert_eq!(ir["animations"]["indicatorOpacityMs"], 83);
    assert_eq!(ir["animations"]["indicatorScaleMs"], 167);
}

#[test]
fn container_style_survives_virtualization_and_uses_rounded_native_margins() {
    let mut s = scene();
    let grid=s.create(s.root,NodeKind::GridView,json!({"width":240,"height":150,"collectionItems":data(100),"itemContainerStyle":{"margin":[5,5,5,5],"minWidth":100,"minHeight":67}})).unwrap();
    s.layout(&mut Measure);
    let snapshot = s.snapshot();
    let view = snapshot.nodes.iter().find(|n| n.id == grid).unwrap();
    let collection = view.collection.as_ref().unwrap();
    assert_eq!(collection.cell, [110.4, 77.6]);
    let first = snapshot
        .nodes
        .iter()
        .find(|n| n.id == collection.realized[0].id)
        .unwrap();
    assert_eq!([first.rect.width, first.rect.height], [100., 67.2]);
    input(
        &mut s,
        json!({"kind":"collectionScroll","id":grid,"index":99}),
        1.,
    );
    let snapshot = s.snapshot();
    let view = snapshot.nodes.iter().find(|n| n.id == grid).unwrap();
    let last = view
        .collection
        .as_ref()
        .unwrap()
        .realized
        .iter()
        .find(|r| r.index == 99)
        .unwrap();
    let container = snapshot.nodes.iter().find(|n| n.id == last.id).unwrap();
    assert_eq!(container.props.margin, [5.; 4]);
    assert!(
        (container.rect.width - 100.).abs() < 1e-8 && (container.rect.height - 67.2).abs() < 1e-8
    );
}

#[test]
fn selected_grid_uses_inward_pixel_rounded_borders_over_colored_content() {
    use winui_wasm::render::Draw;
    let mut s = scene();
    let grid = s
        .create(
            s.root,
            NodeKind::GridView,
            json!({"width":240,"collectionItems":data(1),"selectedKeys":["0"]}),
        )
        .unwrap();
    s.layout(&mut Measure);
    let container = s.nodes[&grid].children[0];
    s.create(
        container,
        NodeKind::Rectangle,
        json!({"width":190,"height":130,"fill":"#ff0000"}),
    )
    .unwrap();
    s.layout(&mut Measure);
    let borders = s
        .display_list()
        .into_iter()
        .filter_map(|draw| match draw {
            Draw::Border {
                rect,
                thickness,
                radius,
                background: None,
                ..
            } if thickness == [2.4; 4] => Some((rect, radius)),
            _ => None,
        })
        .collect::<Vec<_>>();
    assert_eq!(borders.len(), 2);
    assert!((borders[0].0.x - 1.6).abs() < 1e-8);
    assert_eq!(borders[1].0.x, 0.);
    assert_eq!(borders[0].1, [2.; 4]);
    assert_eq!(borders[1].1, [4.; 4]);
}

#[test]
fn photo_template_layout_clip_keeps_the_last_physical_image_row() {
    let mut s = scene();
    s.images.insert("photo.jpg".into(), [1500., 1000.]);
    let grid = s
        .create(
            s.root,
            NodeKind::GridView,
            json!({"width":780,"collectionItems":data(1)}),
        )
        .unwrap();
    s.layout(&mut Measure);
    let container = s.nodes[&grid].children[0];
    let image = s
        .create(
            container,
            NodeKind::Image,
            json!({"source":"photo.jpg","width":190,"height":130,"stretch":"UniformToFill"}),
        )
        .unwrap();
    s.layout(&mut Measure);
    assert_eq!(s.nodes[&image].rect.height, 130.4);
    assert!(s.display_list().iter().any(|draw|matches!(draw,winui_wasm::render::Draw::Clip{rect} if (rect.height-130.4).abs()<1e-8&&(rect.width-190.4).abs()<1e-8)));
}

#[test]
fn optical_text_alignment_trims_ink_without_changing_desired_advance() {
    struct Ink;
    impl TextMeasurer for Ink {
        fn measure(&mut self, text: &str, font: &Font) -> Metrics {
            Metrics {
                width: text.len() as f64 * font.size * 0.5,
                ascent: font.size * 0.8,
                descent: font.size * 0.2,
                left: -2.2,
                right: text.len() as f64 * font.size * 0.5 - 2.5,
            }
        }
    }
    let mut s = scene();
    let title = s
        .create(
            s.root,
            NodeKind::TextBlock,
            json!({"text":"Title","fontSize":28,"horizontalAlignment":"Left"}),
        )
        .unwrap();
    s.layout(&mut Ink);
    let desired = s.nodes[&title].desired;
    s.update(vec![Update {
        id: title,
        patch: json!({"opticalMarginAlignment":"TrimSideBearings"}),
    }])
    .unwrap();
    s.layout(&mut Ink);
    assert_eq!(s.nodes[&title].desired, desired);
    assert!(s.display_list().iter().any(|draw|matches!(draw,winui_wasm::render::Draw::Text{text,x,..} if text=="Title"&&(*x+2.2).abs()<1e-8)));
}

#[test]
fn selected_list_press_uses_native_layout_height_and_scale_storyboard() {
    let mut s = Scene::new(Theme::Light, false);
    s.resize(800., 500., 1.25).unwrap();
    let list = s
        .create(
            s.root,
            NodeKind::ListView,
            json!({"width":240,"height":160,"collectionItems":data(3),"selectedKeys":["1"]}),
        )
        .unwrap();
    s.layout(&mut Measure);
    let item = s.nodes[&list].children[1];
    let (x, y) = s.nodes[&item].world.point(30., 20.);
    assert_eq!(s.collection_indicator(item).unwrap().layout_height, 16.);
    input(&mut s, json!({"kind":"down","x":x,"y":y,"pointer":1}), 0.);
    let c = s.collection_indicator(item).unwrap();
    // The actual Height is rounded at arrange; ScaleY uses the native old/(old-6) ratio.
    assert_eq!(c.layout_height, 10.4);
    assert!((c.scale - 1.6).abs() < 1e-6);
    assert_eq!(c.opacity, 0.);
    s.advance(70.);
    s.layout(&mut Measure);
    let scale = s.collection_indicator(item).unwrap().scale;
    assert!(scale > 1. && scale < 1.6);
    input(&mut s, json!({"kind":"up","x":x,"y":y,"pointer":1}), 70.);
    assert_eq!(s.collection_indicator(item).unwrap().layout_height, 16.);
    assert!((s.collection_indicator(item).unwrap().scale - scale).abs() < 1e-8);
    s.advance(237.);
    s.layout(&mut Measure);
    assert_eq!(s.collection_indicator(item).unwrap().scale, 1.);
    assert_eq!(
        s.nodes[&list].props.selected_keys.as_ref(),
        &vec!["1".to_string()]
    );
}
