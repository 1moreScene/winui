use serde_json::{json, Value};
use winui_wasm::{
    enums::*,
    scene::{Input, Scene, Update},
    typography::{Font, Metrics, TextMeasurer},
};
struct Measure;
impl TextMeasurer for Measure {
    fn measure(&mut self, text: &str, font: &Font) -> Metrics {
        Metrics {
            width: text.chars().count() as f64 * font.size / 2.,
            ascent: font.size * 0.8,
            descent: font.size * 0.2,
            ..Default::default()
        }
    }
}
fn frame(s: &mut Scene) {
    for _ in 0..5 {
        s.advance(1000.);
        s.layout(&mut Measure);
    }
}
fn items(count: usize) -> Value {
    json!((0..count)
        .map(|i| json!({"id":format!("key{i}"),"text":format!("Row {i}"),"enabled":true}))
        .collect::<Vec<_>>())
}
fn scene() -> Scene {
    let mut s = Scene::new(Theme::Light, true);
    s.resize(640., 480., 1.25).unwrap();
    s
}

#[test]
fn focusable_grid_repeater_uses_spatial_arrow_navigation() {
    let mut s=scene();
    let id=s.create(s.root,NodeKind::ItemsRepeater,json!({"collectionItems":items(8),"hasItemTemplate":true,"repeater":{"isKeyboardNavigationEnabled":true,"layout":{"kind":"UniformGridLayout","minItemWidth":150,"minItemHeight":120,"minColumnSpacing":8,"minRowSpacing":8}}})).unwrap();
    frame(&mut s);
    let mut targets=Vec::new();
    for i in 0..8 {
        let slot=s.try_get_repeater_element(id,i).unwrap().unwrap();
        targets.push(s.create(slot,NodeKind::Grid,json!({"isTabStop":true,"minWidth":150,"minHeight":120})).unwrap());
    }
    frame(&mut s);
    s.input(Input::Focus{id:targets[0]},1000.).unwrap();
    for (key,index) in [("ArrowRight",1),("ArrowDown",5),("ArrowLeft",4),("ArrowUp",0)] {
        s.input(Input::KeyDown{key:key.into(),repeat:false},1000.).unwrap();
        frame(&mut s);
        let snapshot=s.snapshot();
        assert!(snapshot.nodes.iter().find(|n|n.id==targets[index]).unwrap().focused,"{key} must follow the realized grid geometry; focused {:?}; slots {:?}",snapshot.nodes.iter().filter(|n|n.focused).map(|n|(n.id,n.kind,n.rect)).collect::<Vec<_>>(),(0..8).map(|i|s.repeater_item_bounds(id,i)).collect::<Vec<_>>());
    }
}
#[test]
fn centered_refresh_list_uses_natural_width_but_stretched_lists_keep_their_viewport() {
    let mut s = scene();
    let refresh = s.create(s.root, NodeKind::RefreshContainer, json!({"horizontalAlignment":"Center"})).unwrap();
    let list = s.create(refresh, NodeKind::ListView, json!({"minWidth":200,"height":200,"borderThickness":[1,1,1,1],"collectionItems":[{"id":"0","text":"AcrylicBrush"}]})).unwrap();
    frame(&mut s);
    assert!((s.nodes[&refresh].rect.width - 200.).abs() < 0.01);
    assert!((s.nodes[&list].rect.width - 200.).abs() < 0.01);
    s.update(vec![Update{id:list,patch:json!({"collectionItems":[{"id":"0","text":"A much longer content label that exceeds the minimum width"}]})}]).unwrap();
    frame(&mut s);
    assert!(s.nodes[&list].rect.width > 200.);
    let stretched = s.create(s.root, NodeKind::ListView, json!({"height":200,"collectionItems":[{"id":"1","text":"Short"}]})).unwrap();
    frame(&mut s);
    assert_eq!(s.nodes[&stretched].rect.width, 640.);
}
#[test]
fn natural_template_margins_reserve_the_same_pixels_that_arrange_consumes() {
    let mut s = scene();
    let grid = s.create(s.root, NodeKind::Grid, json!({"margin":[10,10,10,10],"horizontalAlignment":"Left","verticalAlignment":"Top"})).unwrap();
    let text = s.create(grid, NodeKind::TextBlock, json!({"text":"Sweet potato","padding":[10,10,10,10],"wrap":true,"horizontalAlignment":"Center","verticalAlignment":"Center"})).unwrap();
    frame(&mut s);
    assert_eq!(s.nodes[&text].text.lines.len(), 1);
    assert!(s.nodes[&text].rect.width >= s.nodes[&text].desired_without_margin[0]);
}
#[test]
fn natural_horizontal_repeaters_stop_layout_after_finite_arrange() {
    let mut s = scene();
    let panel = s.create(s.root, NodeKind::StackPanel, json!({})).unwrap();
    let id = s.create(panel, NodeKind::ItemsRepeater, json!({"collectionItems":items(7),"repeater":{"layout":{"kind":"StackLayout","orientation":"Horizontal"}}})).unwrap();
    frame(&mut s);
    assert_eq!(s.nodes[&id].repeater.realized.len(), 7);
    assert!(!s.snapshot().animating, "Measure/Arrange cross-axis differences must not perpetually invalidate the size cache");
    let passes = s.snapshot().layout_passes;
    frame(&mut s);
    assert_eq!(s.snapshot().layout_passes, passes);
}
#[test]
fn gallery_color_buttons_use_native_presenter_state_brushes_over_local_colors() {
    use winui_wasm::{material, render::Draw};
    let native: Value = serde_json::from_str(include_str!("../references/repeater-button-native.json")).unwrap();
    for row in native["rows"].as_array().unwrap().iter().filter(|r| r["state"] != "AnimatedTemplate") {
        let theme = if row["theme"] == "Dark" { Theme::Dark } else { Theme::Light };
        let mut s = Scene::new(theme, true);
        s.resize(640., 480., 1.25).unwrap();
        let id = s.create(s.root, NodeKind::Button, json!({"text":"Blue","width":250,"height":32,"background":"#0000ff","foreground":{"resource":"TextFillColorInverseBrush"}})).unwrap();
        let state = row["state"].as_str().unwrap();
        if state == "Disabled" { s.update(vec![Update{id,patch:json!({"enabled":false})}]).unwrap(); }
        s.nodes.get_mut(&id).unwrap().button.pointer_inside = matches!(state, "PointerOver" | "Pressed");
        s.nodes.get_mut(&id).unwrap().button.pressed = state == "Pressed";
        frame(&mut s);
        let commands = s.base_display_list();
        let background = commands.iter().find_map(|d| if let Draw::Fill{color,..}=d{Some(color)}else{None}).unwrap();
        let foreground = commands.iter().find_map(|d| if let Draw::Text{color,..}=d{Some(color)}else{None}).unwrap();
        for (actual, expected) in [(background, row["background"].as_str().unwrap()), (foreground, row["foreground"].as_str().unwrap())] {
            let (actual, expected) = (material::rgba(actual), material::rgba(expected));
            for i in 0..4 { assert!((actual[i]-expected[i]).abs()<1./255., "{} {} {:?} {:?}", row["theme"], state, actual, expected); }
        }
    }
}
#[test]
fn varied_templates_wait_for_a_sample_and_keep_size_estimates_through_star_measure() {
    let mut s=scene();
    let grid=s.create(s.root,NodeKind::Grid,json!({"columns":[{"unit":"Star","value":1},{"unit":"Star","value":1}]})).unwrap();
    let host=s.create(grid,NodeKind::ScrollViewer,json!({"height":600})).unwrap();
    let id=s.create(host,NodeKind::ItemsRepeater,json!({"collectionItems":items(1000),"hasItemTemplate":true,"repeater":{"layout":{"kind":"VariedImageSizeLayout","width":200}}})).unwrap();
    frame(&mut s);
    assert_eq!(s.nodes[&id].repeater.realized.len(),1,"Do not instantiate an entire viewport using empty 32-DIP templates");
    let template=|i|json!({"width":200,"height":270+(i%3)*30});
    fill_templates(&mut s,id,template);
    for index in [990,0,990,0] {
        s.repeater_scroll_to(id,index,false,false).unwrap();
        fill_templates(&mut s,id,template);
        frame(&mut s);
        assert!(s.try_get_repeater_element(id,index).unwrap().is_some(),"index {index} drifted out of the viewport");
        assert!(s.nodes[&id].repeater.realized.len()<20);
        assert!(!s.snapshot().animating);
    }
}
fn repeater(s: &mut Scene, count: usize, layout: Value) -> (u32, u32) {
    let host = s
        .create(
            s.root,
            NodeKind::ScrollViewer,
            json!({"width":320,"height":180}),
        )
        .unwrap();
    let id = s
        .create(
            host,
            NodeKind::ItemsRepeater,
            json!({"collectionItems":items(count),"repeater":{"layout":layout}}),
        )
        .unwrap();
    (host, id)
}
fn realized(s: &Scene, id: u32) -> Vec<(String, u32)> {
    s.nodes[&id]
        .repeater
        .realized
        .iter()
        .map(|(k, v)| (k.clone(), *v))
        .collect()
}
fn fill_templates(s: &mut Scene, id: u32, properties: impl Fn(usize) -> Value) {
    for _ in 0..12 {
        frame(s);
        let pending = realized(s, id).into_iter().filter(|(_,child)|s.nodes[child].children.is_empty()).collect::<Vec<_>>();
        if pending.is_empty() { return; }
        for (key, child) in pending {
            let index=s.nodes[&id].props.collection_items.iter().position(|item|item.id==key).unwrap();
            s.create(child,NodeKind::Border,properties(index)).unwrap();
        }
    }
    panic!("asynchronous template realization did not settle");
}
#[test]
fn repeater_virtualizes_a_large_source_and_recycles_private_descendants() {
    let mut s = scene();
    let (host, id) = repeater(&mut s, 100000, json!({"kind":"StackLayout","spacing":4}));
    frame(&mut s);
    assert!(s.nodes.len() < 150, "realized {} nodes", s.nodes.len());
    assert!(!realized(&s, id).is_empty());
    assert!(s.nodes[&host].scroll.extent[1] > 1_000_000.);
    let before = realized(&s, id);
    s.input(
        Input::Scroll {
            id: host,
            x: None,
            y: Some(50000.),
            zoom: None,
            animated: false,
        },
        1000.,
    )
    .unwrap();
    frame(&mut s);
    assert!(realized(&s, id).iter().any(|(key, _)| key != "key0"));
    assert!(before.iter().any(|(_, child)| !s.nodes.contains_key(child)));
    assert!(s.nodes.len() < 150);
    s.destroy(host).unwrap();
    assert_eq!(s.nodes.len(), 1);
}
#[test]
fn stable_ids_preserve_elements_during_reorder_and_report_index_changes() {
    let mut s = scene();
    let (_, id) = repeater(&mut s, 6, json!({"kind":"StackLayout"}));
    frame(&mut s);
    let child = s.nodes[&id].repeater.realized["key1"];
    let mut data = items(6).as_array().unwrap().clone();
    data.swap(1, 2);
    s.events.clear();
    s.update(vec![Update {
        id,
        patch: json!({"collectionItems":data}),
    }])
    .unwrap();
    frame(&mut s);
    assert_eq!(s.nodes[&id].repeater.realized["key1"], child);
    assert!(s
        .events
        .iter()
        .any(|e| e.kind == EventKind::ElementIndexChanged
            && e.payload.as_ref().unwrap()["key"] == "key1"));
    assert!(s.create(id, NodeKind::Button, json!({})).is_err());
}
#[test]
fn uniform_grid_packs_stretches_and_justifies_the_last_line() {
    let mut s = scene();
    let (_, id) = repeater(
        &mut s,
        5,
        json!({"kind":"UniformGridLayout","minItemWidth":80,"minItemHeight":40,"minColumnSpacing":8,"minRowSpacing":4,"itemsJustification":"Center"}),
    );
    frame(&mut s);
    let a = s.nodes[&s.nodes[&id].repeater.realized["key0"]].rect;
    let b = s.nodes[&s.nodes[&id].repeater.realized["key3"]].rect;
    assert!((a.x - 32.).abs() < 1.);
    assert!((b.x - 76.).abs() < 1.);
    assert!((b.y - 44.).abs() < 1.);
    assert!((a.width - 80.).abs() < 1.);
    s.update(vec![Update{id,patch:json!({"repeater":{"layout":{"kind":"UniformGridLayout","minItemWidth":80,"minItemHeight":40,"minColumnSpacing":8,"itemsStretch":"Uniform"}}})}]).unwrap();
    frame(&mut s);
    let a = s.nodes[&s.nodes[&id].repeater.realized["key0"]].rect;
    assert!(a.width > 100.);
    assert!(a.height > 50.);
}
#[test]
fn stack_measures_variable_templates_and_propagates_extent() {
    let mut s = scene();
    let (host, id) = repeater(&mut s, 3, json!({"kind":"StackLayout","spacing":5}));
    s.update(vec![Update {
        id,
        patch: json!({"hasItemTemplate":true}),
    }])
    .unwrap();
    frame(&mut s);
    fill_templates(&mut s,id,|index|json!({"height":([20,60,100][index])}));
    frame(&mut s);
    assert!(
        (s.nodes[&host].scroll.extent[1] - 190.).abs() < 1.,
        "extent {}",
        s.nodes[&host].scroll.extent[1]
    );
    let child = s.nodes[&id].repeater.realized["key2"];
    assert!((s.nodes[&child].rect.y - 90.).abs() < 1.);
}
fn refresh(s: &mut Scene, id: u32, action: &str, ratio: f64, request: Option<u32>) {
    let input:Input=serde_json::from_value(json!({"kind":"refresh","id":id,"action":action,"ratio":ratio,"eligible":true,"request":request})).unwrap();
    s.input(input, 1000.).unwrap();
}
#[test]
fn refresh_threshold_release_deferral_and_stale_completion() {
    let mut s = scene();
    let id = s
        .create(
            s.root,
            NodeKind::RefreshContainer,
            json!({"width":320,"height":200}),
        )
        .unwrap();
    let host = s.create(id, NodeKind::ScrollViewer, json!({})).unwrap();
    s.create(host, NodeKind::TextBlock, json!({"text":"Content"}))
        .unwrap();
    frame(&mut s);
    refresh(&mut s, id, "interact", 0.8, None);
    assert_eq!(
        s.nodes[&id].refresh.state,
        RefreshVisualizerState::Interacting
    );
    refresh(&mut s, id, "interact", 0.81, None);
    assert_eq!(s.nodes[&id].refresh.state, RefreshVisualizerState::Pending);
    refresh(&mut s, id, "release", 0., None);
    let request = s.nodes[&id].refresh.request.unwrap();
    assert_eq!(
        s.nodes[&id].refresh.state,
        RefreshVisualizerState::Refreshing
    );
    assert_eq!(s.request_refresh(id).unwrap(), Some(request));
    assert_eq!(
        s.events
            .iter()
            .filter(|e| e.target == id && e.kind == EventKind::RefreshRequested)
            .count(),
        1
    );
    assert!(s.complete_refresh(id, request + 1).is_err());
    frame(&mut s);
    let _ = s.base_display_list();
    s.complete_refresh(id, request).unwrap();
    assert_eq!(s.nodes[&id].refresh.state, RefreshVisualizerState::Idle);
    assert!(s.complete_refresh(id, request).is_err());
    s.destroy(id).unwrap();
    assert_eq!(s.nodes.len(), 1);
}
#[test]
fn short_pull_cancel_and_disabled_refresh_do_not_request_work() {
    let mut s = scene();
    let id = s
        .create(s.root, NodeKind::RefreshVisualizer, json!({}))
        .unwrap();
    frame(&mut s);
    refresh(&mut s, id, "interact", 0.4, None);
    refresh(&mut s, id, "release", 0., None);
    assert_eq!(s.nodes[&id].refresh.state, RefreshVisualizerState::Idle);
    refresh(&mut s, id, "interact", 1., None);
    refresh(&mut s, id, "cancel", 0., None);
    assert_eq!(s.nodes[&id].refresh.state, RefreshVisualizerState::Idle);
    s.update(vec![Update {
        id,
        patch: json!({"enabled":false}),
    }])
    .unwrap();
    frame(&mut s);
    assert!(s.request_refresh(id).unwrap().is_none());
}
#[test]
fn invalid_repeater_properties_are_rejected_atomically() {
    let mut s = scene();
    let (_, id) = repeater(&mut s, 2, json!({"kind":"StackLayout"}));
    assert!(s
        .update(vec![Update {
            id,
            patch: json!({"repeater":{"verticalCacheLength":-1}})
        }])
        .is_err());
    assert_eq!(
        s.nodes[&id]
            .props
            .repeater
            .as_ref()
            .unwrap()
            .vertical_cache_length,
        2.
    );
    assert!(s
        .update(vec![Update {
            id,
            patch: json!({"collectionItems":[{"id":"same"},{"id":"same"}]})
        }])
        .is_err());
}

#[test]
fn vertical_uniform_grid_uses_final_height_for_stretch() {
    let mut s = scene();
    let id=s.create(s.root,NodeKind::ItemsRepeater,json!({"width":320,"height":180,"collectionItems":items(8),"repeater":{"layout":{"kind":"UniformGridLayout","orientation":"Vertical","minItemWidth":80,"minItemHeight":40,"minColumnSpacing":8,"minRowSpacing":4,"itemsStretch":"Fill"}}})).unwrap();
    frame(&mut s);
    let child = s.nodes[&id].repeater.realized["key3"];
    assert!(
        (s.nodes[&child].rect.y - 138.4).abs() < 0.81,
        "parent {:?}, item {:?}",
        s.nodes[&id].rect,
        s.nodes[&child].rect
    );
}

#[test]
fn touch_pulls_from_a_scroll_edge_request_once_and_release_pan_ownership() {
    let mut s = scene();
    let id = s
        .refresh_container(s.root, RefreshPullDirection::TopToBottom)
        .unwrap();
    s.update(vec![Update {
        id,
        patch: json!({"width":320,"height":200}),
    }])
    .unwrap();
    let host = s.create(id, NodeKind::ScrollViewer, json!({})).unwrap();
    s.create(
        host,
        NodeKind::TextBlock,
        json!({"text":"content","height":800}),
    )
    .unwrap();
    frame(&mut s);
    let (x, y) = s.nodes[&id].world.point(80., 30.);
    for (phase, dy) in [
        ("down", 0.),
        ("move", 30.),
        ("up", 30.),
        ("down", 0.),
        ("move", 100.),
        ("up", 100.),
    ] {
        s.input(
            Input::Touch {
                pointer: 7,
                x,
                y: y + dy,
                phase: phase.into(),
            },
            1000.,
        )
        .unwrap();
        frame(&mut s);
    }
    assert_eq!(
        s.nodes[&id].refresh.state,
        RefreshVisualizerState::Refreshing
    );
    assert!(s.nodes[&host].scroll.touches.is_empty());
    assert_eq!(
        s.events
            .iter()
            .filter(|e| e.kind == EventKind::RefreshRequested && e.target == id)
            .count(),
        1
    );
}

#[test]
fn gallery_activity_feed_alternates_the_wide_tile_in_rust() {
    let mut s = scene();
    let id=s.create(s.root,NodeKind::ItemsRepeater,json!({"width":400,"height":300,"collectionItems":items(9),"repeater":{"layout":{"kind":"ActivityFeedLayout","minItemSize":[80,108],"rowSpacing":12,"columnSpacing":12}}})).unwrap();
    frame(&mut s);
    let rect = |i: usize| s.nodes[&s.nodes[&id].repeater.realized[&format!("key{i}")]].rect;
    assert_eq!(rect(0).width, 91.2);
    assert!((rect(2).width - 194.).abs() < 0.81);
    assert!((rect(3).width - 194.).abs() < 0.81);
    assert!((rect(3).y - 120.).abs() < 0.81);
    assert!((rect(5).x - 309.).abs() < 0.81);
}
#[test]
fn gallery_flow_uses_item_sizes_wrapping_and_line_alignment() {
    let mut s = scene();
    let id=s.create(s.root,NodeKind::ItemsRepeater,json!({"width":320,"height":200,"hasItemTemplate":true,"collectionItems":items(8),"repeater":{"layout":{"kind":"FlowLayout","minItemSpacing":8,"lineSpacing":8}}})).unwrap();
    frame(&mut s);
    fill_templates(&mut s,id,|_|json!({"width":96,"height":64}));
    frame(&mut s);
    let third = s.nodes[&s.nodes[&id].repeater.realized["key2"]].rect;
    let next = s.nodes[&s.nodes[&id].repeater.realized["key3"]].rect;
    assert!((third.x - 208.).abs() < 0.81);
    assert!((next.y - 72.).abs() < 0.81);
    s.update(vec![Update{id,patch:json!({"repeater":{"layout":{"kind":"FlowLayout","minItemSpacing":8,"lineSpacing":8,"lineAlignment":"Center"}}})}]).unwrap();
    frame(&mut s);
    assert!((s.nodes[&s.nodes[&id].repeater.realized["key0"]].rect.x - 8.).abs() < 0.81);
}
#[test]
fn gallery_varied_layout_measures_templates_into_the_lowest_column() {
    let mut s = scene();
    let id=s.create(s.root,NodeKind::ItemsRepeater,json!({"width":420,"height":400,"hasItemTemplate":true,"collectionItems":items(4),"repeater":{"layout":{"kind":"VariedImageSizeLayout","width":200}}})).unwrap();
    frame(&mut s);
    fill_templates(&mut s,id,|i|json!({"height":([100,150,80,120][i])}));
    frame(&mut s);
    let r = s.nodes[&s.nodes[&id].repeater.realized["key3"]].rect;
    assert_eq!([r.x, r.y], [200., 150.4]);
}
#[test]
fn gallery_center_scaling_and_home_end_focus_are_rust_owned() {
    let mut s = scene();
    let (host, id) = repeater(&mut s, 20, json!({"kind":"StackLayout"}));
    s.update(vec![Update{id,patch:json!({"hasItemTemplate":true,"repeater":{"isScrollCenterScaleEnabled":true,"isKeyboardNavigationEnabled":true,"isFocusCenteringEnabled":true}})}]).unwrap();
    frame(&mut s);
    let first = s.try_get_repeater_element(id, 0).unwrap().unwrap();
    let button = s
        .create(first, NodeKind::Button, json!({"text":"Blue"}))
        .unwrap();
    frame(&mut s);
    assert!(s.nodes[&first].presentation.scale_x < 1.);
    s.input(Input::Focus { id: button }, 1000.).unwrap();
    s.input(
        Input::KeyDown {
            key: "End".into(),
            repeat: false,
        },
        1000.,
    )
    .unwrap();
    frame(&mut s);
    let last = s.try_get_repeater_element(id, 19).unwrap().unwrap();
    let last_button = s
        .create(last, NodeKind::Button, json!({"text":"DarkKhaki"}))
        .unwrap();
    frame(&mut s);
    assert_eq!(s.focused, Some(last_button));
    assert!(s.nodes[&host].props.vertical_offset > 0.);
}
#[test]
fn gallery_custom_refresh_visualizer_is_available_before_first_frame() {
    let mut s = scene();
    let id = s
        .refresh_container(s.root, RefreshPullDirection::TopToBottom)
        .unwrap();
    let visual = s.composed_content_slot(id, "refreshVisualizer").unwrap();
    s.update(vec![Update {
        id: visual,
        patch: json!({"refresh":{"isRotationEnabled":false}}),
    }])
    .unwrap();
    s.create(
        visual,
        NodeKind::Image,
        json!({"source":"/official/repeater/SunBlack.png","width":35,"height":35}),
    )
    .unwrap();
    frame(&mut s);
    assert!(
        !s.nodes[&visual]
            .props
            .refresh
            .as_ref()
            .unwrap()
            .is_rotation_enabled
    );
    s.destroy(id).unwrap();
    assert_eq!(s.nodes.len(), 1);
}

#[test]
fn gallery_legacy_brushes_and_list_border_gradients_are_resolved_by_the_sdk(){
 let mut s=scene();let id=s.create(s.root,NodeKind::ListView,json!({"collectionItems":[{"id":"a","text":"AcrylicBrush"}],"width":200,"height":200,"borderBrush":{"resource":"TextControlBorderBrush"},"borderThickness":[1,1,1,1]})).unwrap();s.create(s.root,NodeKind::Rectangle,json!({"width":300,"height":24,"fill":{"resource":"SystemControlBackgroundAccentBrush"}})).unwrap();frame(&mut s);let display=s.base_display_list();assert!(display.iter().any(|d|matches!(d,winui_wasm::render::Draw::PathBrush{..})));s.destroy(id).unwrap();
}

#[test]
fn gallery_custom_sun_stops_both_interaction_and_refresh_rotation(){let mut s=scene();let id=s.refresh_visualizer(s.root,RefreshVisualizerOrientation::Normal).unwrap();s.update(vec![Update{id,patch:json!({"refresh":{"isRotationEnabled":false}})}]).unwrap();frame(&mut s);refresh(&mut s,id,"interact",0.3,None);frame(&mut s);assert!(!s.base_display_list().iter().any(|d|matches!(d,winui_wasm::render::Draw::Transform{matrix}if matrix[1].abs()>1e-6||matrix[2].abs()>1e-6)));}
