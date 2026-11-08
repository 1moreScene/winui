use serde_json::json;
use winui_wasm::{enums::NodeKind, model::*, navigation::NavigationView};

fn long_menu() -> NavigationView {
    NavigationView::new(serde_json::from_value(json!({
        "paneDisplayMode":"Left", "selectedId":"item2", "isBackButtonVisible":false,
        "reducedTransparency":true,
        "items":(0..30).map(|i|json!({"id":format!("item{i}"),"text":format!("Item {i}")})).collect::<Vec<_>>()
    })).unwrap()).unwrap()
}

#[test]
fn selected_item_scrolling_carries_animation_without_restarting_or_stretching_it() {
    let mut nav = long_menu();
    nav.input(Input::Resize { width: 1200., height: 600. }, 0.).unwrap();
    nav.input(Input::Invoke { id: "item5".into() }, 100.).unwrap();
    nav.advance(250.);
    let before = nav.indicator_motion.visuals(250.);
    nav.input(Input::Wheel { delta: 20. }, 250.).unwrap();
    let after = nav.indicator_motion.visuals(250.);
    assert_eq!(before.len(), after.len());
    for (before, after) in before.iter().zip(after.iter()) {
        assert!((after.rect.y - (before.rect.y - 20.)).abs() < 0.0001);
        assert!((after.rect.height - before.rect.height).abs() < 0.0001);
    }
    assert!(!nav.indicator_motion.active(701.));
    nav.advance(1000.);
    nav.input(Input::Wheel { delta: 20. }, 1010.).unwrap();
    assert!(!nav.indicator_motion.active(1010.));
    let snapshot = nav.snapshot();
    let part = snapshot.parts.iter().find(|part|part.id == "item5").unwrap();
    let bar = snapshot.indicator_visuals.last().unwrap().rect;
    assert_eq!(bar.height, 16.);
    assert!((bar.y - (part.rect.y + (part.rect.height - 16.)/2.)).abs() < 0.0001);
}

#[test]
fn reflow_above_the_selected_item_does_not_start_a_selection_transition() {
    let mut nav = NavigationView::new(serde_json::from_value(json!({
        "paneDisplayMode":"Left", "selectedId":"selected", "reducedTransparency":true,
        "isBackButtonVisible":false,
        "items":[{"id":"branch","text":"Branch","selectsOnInvoked":false,"children":[
            {"id":"a","text":"A"},{"id":"b","text":"B"}]},
            {"id":"selected","text":"Selected"}]
    })).unwrap()).unwrap();
    nav.advance(1000.);
    let old = nav.indicator_target.unwrap();
    nav.input(Input::Expand { id:"branch".into(), expanded:true },1010.).unwrap();
    assert!(!nav.indicator_motion.active(1010.));
    // Layout commits immediately; the existing selection visual follows the native
    // 200 ms item Offset animation rather than restarting its selection timeline.
    assert_eq!(nav.indicator_target.unwrap().y,old.y);
    nav.advance(1210.);nav.layout();
    assert_eq!(nav.indicator_target.unwrap().y - old.y,80.);
    assert_eq!(nav.snapshot().indicator_visuals.last().unwrap().rect,nav.indicator_target.unwrap());
}

#[test]
fn cross_depth_changes_scale_local_bars_and_keep_logical_selection_when_collapsed() {
    let mut nav = NavigationView::new(serde_json::from_value(json!({
        "paneDisplayMode":"Left", "selectedId":"one", "reducedTransparency":true,
        "items":[{"id":"one","text":"One"},{"id":"branch","text":"Branch","selectsOnInvoked":false,
            "children":[{"id":"child","text":"Child"}]}]
    })).unwrap()).unwrap();
    nav.input(Input::Expand {id:"branch".into(), expanded:true},10.).unwrap();
    nav.input(Input::Invoke {id:"child".into()},100.).unwrap();
    for time in [100.,180.,350.,600.] {
        nav.advance(time);
        for visual in nav.snapshot().indicator_visuals {
            assert!(visual.rect.height <= 16.0001);
            assert_eq!(visual.rect.width,3.);
        }
    }
    nav.advance(800.);
    assert_eq!(nav.snapshot().indicator_visuals.last().unwrap().rect.height,16.);
    nav.input(Input::Expand {id:"branch".into(), expanded:false},810.).unwrap();
    nav.advance(1500.);
    let snapshot = nav.snapshot();
    assert_eq!(snapshot.selected_id.as_deref(),Some("child"));
    assert!(snapshot.parts.iter().find(|part|part.id=="branch").unwrap().selected);
    assert_eq!(snapshot.indicator_visuals.last().unwrap().rect.height,16.);
}

#[test]
fn scrolling_out_hides_the_indicator_and_keeps_paint_inside_the_menu_clip() {
    let mut nav=long_menu();
    nav.advance(1000.);
    nav.input(Input::Wheel {delta:10000.},1010.).unwrap();
    assert!(nav.snapshot().indicator_visuals.is_empty());
    assert!(!nav.indicator_motion.active(1010.));
    nav.input(Input::Wheel {delta:-10000.},1020.).unwrap();
    let snapshot=nav.snapshot();
    let selected=snapshot.parts.iter().find(|part|part.selected).unwrap();
    let clip=selected.clip.unwrap();
    for visual in snapshot.indicator_visuals {
        assert!(visual.rect.y>=clip.y);
        assert!(visual.rect.y+visual.rect.height<=clip.y+clip.height);
    }
}

#[test]
fn removed_prototype_is_not_a_runtime_control_or_input_protocol() {
    assert!(serde_json::from_value::<NodeKind>(json!("InputProbe")).is_err());
    for kind in ["composition","commit"] {
        assert!(serde_json::from_value::<winui_wasm::scene::Input>(json!({"kind":kind,"id":1,"text":"draft"})).is_err());
    }
}
