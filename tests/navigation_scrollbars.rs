use serde_json::json;
use winui_wasm::{
    model::Input,
    navigation::NavigationView,
    render::{display_list, Draw},
};
fn view() -> NavigationView {
    let mut nav=NavigationView::new(serde_json::from_value(json!({"paneDisplayMode":"Left","isSettingsVisible":false,"items":(0..40).map(|i|json!({"id":format!("item{i}"),"text":format!("Item {i}")})).collect::<Vec<_>>(),"selectedId":"item0"})).unwrap()).unwrap();
    nav.input(
        Input::Resize {
            width: 800.,
            height: 400.,
        },
        0.,
    )
    .unwrap();
    nav
}
#[test]
fn touch_pan_cancels_item_activation_clamps_offsets_and_keeps_taps_working(){
    let mut nav=view();let before=nav.snapshot();
    let row=before.parts.iter().find(|p|p.id=="item2").unwrap();
    let x=row.rect.x+40.;let y=row.rect.y+row.rect.height/2.;
    nav.input(Input::Touch{pointer:1,x,y,phase:"down".into()},1.).unwrap();
    nav.input(Input::Touch{pointer:1,x,y:y-120.,phase:"move".into()},2.).unwrap();
    nav.input(Input::Touch{pointer:1,x,y:y-120.,phase:"up".into()},3.).unwrap();
    let after=nav.snapshot();assert!(after.scroll_offset>100.);assert_eq!(after.selected_id,before.selected_id);
    assert!(!after.events.iter().any(|e|e.kind==winui_wasm::enums::EventKind::ItemInvoked));
    nav.input(Input::Touch{pointer:2,x,y,phase:"down".into()},4.).unwrap();
    nav.input(Input::Touch{pointer:2,x,y:-10000.,phase:"move".into()},5.).unwrap();
    nav.input(Input::Touch{pointer:2,x,y:-10000.,phase:"cancel".into()},6.).unwrap();
    let end=nav.snapshot();assert_eq!(end.scroll_offset,end.max_scroll);
    let row=end.parts.iter().find(|p|p.kind==winui_wasm::model::ItemKind::Item&&p.clip.is_some_and(|clip|clip.contains(p.rect.x+40.,p.rect.y+p.rect.height/2.))).unwrap();
    let (x,y,id)=(row.rect.x+40.,row.rect.y+row.rect.height/2.,row.id.clone());
    nav.input(Input::Touch{pointer:3,x,y,phase:"down".into()},7.).unwrap();
    nav.input(Input::Touch{pointer:3,x:x+2.,y:y+2.,phase:"up".into()},8.).unwrap();
    assert_eq!(nav.snapshot().selected_id,Some(id));
}
#[test]
fn template_menu_scrollbar_uses_shared_rust_thumb_paint_hover_drag_and_keys() {
    let mut nav = view();
    let before = nav.snapshot();
    assert_eq!(before.scrollbars.len(), 1);
    let rail = before.scrollbars[0].rect;
    nav.input(
        Input::Move {
            x: rail.x + 7.,
            y: rail.y + 30.,
        },
        1000.,
    )
    .unwrap();
    nav.advance(1600.);
    nav.layout();
    let bar = nav.snapshot().scrollbars.remove(0);
    assert_eq!(bar.opacity, 1.);
    assert_eq!(bar.expansion, 1.);
    assert!(display_list(&nav).iter().any(|d|matches!(d,Draw::VectorLayer{bounds} if bounds.width==bar.thumb.width&&bounds.height==bar.thumb.height)));
    let (x, y) = (
        bar.thumb.x + bar.thumb.width / 2.,
        bar.thumb.y + bar.thumb.height / 2.,
    );
    nav.input(Input::Down { x, y }, 1601.).unwrap();
    nav.input(Input::Move { x, y: y + 300. }, 1610.).unwrap();
    nav.input(Input::Up { x, y: y + 300. }, 1611.).unwrap();
    let after = nav.snapshot();
    assert!(after.scroll_offset > before.scroll_offset + 500.);
    assert_eq!(after.selected_id, before.selected_id);
    nav.input(
        Input::ScrollKey {
            content: false,
            key: "Home".into(),
        },
        1700.,
    )
    .unwrap();
    nav.advance(2500.);
    nav.layout();
    assert_eq!(nav.snapshot().scroll_offset, 0.);
    nav.input(
        Input::ScrollKey {
            content: false,
            key: "End".into(),
        },
        2600.,
    )
    .unwrap();
    nav.advance(3400.);
    nav.layout();
    let end = nav.snapshot();
    assert_eq!(end.scroll_offset, end.max_scroll);
    nav.input(Input::Leave, 3500.).unwrap();
    nav.advance(10000.);
    nav.layout();
    assert_eq!(nav.snapshot().scrollbars[0].opacity, 0.);
    assert!(!nav.snapshot().animating);
}
#[test]
fn resize_and_top_mode_remove_scrollbar_and_cancel_gesture_without_stealing_selection() {
    let mut nav = view();
    let bar = nav.snapshot().scrollbars.remove(0);
    nav.input(
        Input::Down {
            x: bar.thumb.x + 1.,
            y: bar.thumb.y + 1.,
        },
        1000.,
    )
    .unwrap();
    nav.input(Input::Cancel, 1001.).unwrap();
    nav.input(
        Input::Move {
            x: bar.thumb.x + 1.,
            y: 350.,
        },
        1002.,
    )
    .unwrap();
    assert_eq!(nav.snapshot().scroll_offset, 0.);
    nav.update(json!([{"paneDisplayMode":"Top"}])).unwrap();
    assert!(nav.snapshot().scrollbars.is_empty());
    nav.update(json!([{"paneDisplayMode":"Left"}])).unwrap();
    nav.input(
        Input::Resize {
            width: 800.,
            height: 3000.,
        },
        2000.,
    )
    .unwrap();
    assert!(nav.snapshot().scrollbars.is_empty());
}

#[test]
fn native_content_scrollbar_is_independent_of_menu_offset_and_clip() {
    let mut nav = view();
    nav.update(json!([{"contentNode":{"kind":"StackPanel","height":1600.,"children":[{"kind":"TextBlock","text":"Content"}]}}])).unwrap();
    let initial = nav.snapshot();
    assert_eq!(initial.scrollbars.len(), 2);
    let content = initial.scrollbars.iter().find(|bar| bar.content).unwrap();
    assert!(content.rect.x >= initial.content.x);
    assert!(content.maximum > 1000.);
    nav.input(Input::ContentWheel { delta: 200. }, 1000.)
        .unwrap();
    let scrolled = nav.snapshot();
    assert_eq!(scrolled.content_scroll_offset, 200.);
    assert_eq!(scrolled.scroll_offset, 0.);
    nav.input(
        Input::ScrollKey {
            content: true,
            key: "End".into(),
        },
        1200.,
    )
    .unwrap();
    nav.advance(2000.);
    nav.layout();
    let end = nav.snapshot();
    assert_eq!(end.content_scroll_offset, end.max_content_scroll);
    assert_eq!(end.scroll_offset, 0.);
}
