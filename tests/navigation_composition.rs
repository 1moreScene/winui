use serde_json::{json,Value};
use winui_wasm::{enums::*,model::Properties,scene::{Scene,Update},typography::{Font,Metrics,TextMeasurer}};
struct Measure;
impl TextMeasurer for Measure{fn measure(&mut self,text:&str,font:&Font)->Metrics{Metrics{width:text.chars().count() as f64*font.size*0.5,ascent:font.size*0.8,descent:font.size*0.2,..Default::default()}}}
fn scene()->Scene{let mut s=Scene::new(Theme::Light,true);s.resize(1000.,600.,1.).unwrap();s}
fn layout(s:&mut Scene){s.layout(&mut Measure);s.display_list();}
fn nav(s:&mut Scene,extra:Value)->u32{let mut p=json!({"paneDisplayMode":"Left","isBackButtonVisible":"Collapsed","items":[{"id":"a","text":"First"},{"id":"b","text":"Second"}]});for(k,v)in extra.as_object().unwrap(){p[k]=v.clone();}s.create(s.root,NodeKind::NavigationView,json!({"navigation":p})).unwrap()}
#[test]fn native_defaults_are_empty_and_back_visibility_preserves_auto(){let p=Properties::default();assert!(p.header.is_none()&&p.content.is_none());assert_eq!(p.is_back_button_visible,NavigationViewBackButtonVisible::Auto);assert!(p.back_button_visible());}
#[test]fn navigation_template_inherits_scene_theme_and_system_motion_policy(){
 let mut s=Scene::new(Theme::Dark,true);s.resize(800.,540.,1.25).unwrap();let n=nav(&mut s,json!({}));layout(&mut s);let p=&s.get(n).unwrap().nav.as_ref().unwrap().props;assert_eq!(p.theme,Theme::Dark);assert!(p.reduced_motion);
 s.theme=Theme::HighContrast;s.reduced_motion=false;s.invalidate(n,true);layout(&mut s);let p=&s.get(n).unwrap().nav.as_ref().unwrap().props;assert_eq!(p.theme,Theme::HighContrast);assert!(!p.reduced_motion);
 s.update(vec![Update{id:n,patch:json!({"navigation":{"theme":"Light","reducedMotion":true}})}]).unwrap();layout(&mut s);let p=&s.get(n).unwrap().nav.as_ref().unwrap().props;assert_eq!(p.theme,Theme::Light);assert!(p.reduced_motion);
}
#[test]fn null_and_empty_string_headers_preserve_native_presence_semantics(){
 let mut s=scene();let nav=nav(&mut s,json!({}));layout(&mut s);assert_eq!(s.get(nav).unwrap().nav.as_ref().unwrap().content_body().y,1.);
 s.update(vec![Update{id:nav,patch:json!({"navigation":{"header":""}})}]).unwrap();layout(&mut s);assert_eq!(s.get(nav).unwrap().nav.as_ref().unwrap().content_body().y,81.);
 s.update(vec![Update{id:nav,patch:json!({"navigation":{"header":null}})}]).unwrap();layout(&mut s);assert_eq!(s.get(nav).unwrap().nav.as_ref().unwrap().content_body().y,1.);
}
#[test]fn minimal_open_pane_uses_the_real_close_button_and_full_title_hit_area(){
 let mut s=scene();let nav=nav(&mut s,json!({"paneDisplayMode":"LeftMinimal","isBackButtonVisible":"Visible","isPaneOpen":true,"reducedMotion":true}));layout(&mut s);
 let parts=&s.get(nav).unwrap().nav.as_ref().unwrap().parts;assert!(parts.iter().any(|p|p.id=="$close"));assert!(!parts.iter().any(|p|p.id=="$back"));assert_eq!(parts.iter().find(|p|p.id=="$toggle").unwrap().rect.width,280.);
 let close=s.navigation_template_part(nav,"NavigationViewCloseButton").unwrap().unwrap();assert!(s.get(close).unwrap().visible);
 let tip=s.navigation_template_part(nav,"NavigationViewCloseButtonToolTip").unwrap().unwrap();assert_eq!(s.get(tip).unwrap().kind,NodeKind::ToolTip);
 s.input(serde_json::from_value(json!({"kind":"navigation","id":nav,"input":{"kind":"invoke","id":"$close"}})).unwrap(),0.).unwrap();let snapshot=serde_json::to_value(s.snapshot()).unwrap();assert!(snapshot["events"].as_array().unwrap().iter().any(|e|e["kind"]=="paneClosing"));
}
#[test]fn source_template_is_real_owned_nodes_and_content_accepts_frame_pages(){
 let mut s=scene();let nav=nav(&mut s,json!({}));
 let frame=s.create(nav,NodeKind::Frame,json!({"contentHost":{"pages":[{"key":"a","content":{"kind":"TextBox","name":"editor","properties":{"text":"first"}}}]}})).unwrap();
 assert_eq!(s.get(frame).unwrap().parent,Some(s.navigation_view_slot(nav,"Content").unwrap()));
 for(name,kind)in[("RootSplitView",NodeKind::SplitView),("MenuItemsHost",NodeKind::ItemsRepeater),("MenuItemsScrollViewer",NodeKind::ScrollViewer),("ContentPresenter",NodeKind::ContentPresenter),("NavigationViewBackButton",NodeKind::Button)]{let node=s.navigation_template_part(nav,name).unwrap().unwrap();assert_eq!(s.get(node).unwrap().kind,kind);}
 layout(&mut s);let snapshot=serde_json::to_value(s.snapshot()).unwrap();assert!(snapshot["nodes"].as_array().unwrap().iter().any(|n|n["kind"]=="NavigationViewItemPresenter"));
}
#[test]fn search_and_custom_regions_reflow_and_move_the_same_instances(){
 let mut s=scene();let nav=nav(&mut s,json!({"paneHeader":{"kind":"TextBlock","properties":{"text":"Header"}},"autoSuggestBox":{"kind":"AutoSuggestBox","properties":{"text":"keep text"}},"paneCustomContent":{"kind":"HyperlinkButton","properties":{"text":"More info","height":32}},"paneFooter":{"kind":"StackPanel","properties":{"height":64}}}));
 layout(&mut s);let search=s.navigation_view_slot(nav,"AutoSuggestBox").unwrap();let child=s.get(search).unwrap().children[0];let before=s.get(child).unwrap().world;
 let original=s.get(nav).unwrap().nav.as_ref().unwrap().parts.iter().find(|p|p.id=="a").unwrap().rect.y;assert!(original>100.);
 s.update(vec![Update{id:nav,patch:json!({"navigation":{"paneDisplayMode":"Top"}})}]).unwrap();layout(&mut s);
 assert_eq!(s.get(search).unwrap().children[0],child);assert_ne!(s.get(child).unwrap().world,before);assert_eq!(s.get(child).unwrap().props.text,"keep text");
}
#[test]fn malformed_native_slots_are_rejected_before_mutation(){
 let mut s=scene();let nav=nav(&mut s,json!({}));let before=serde_json::to_value(s.properties(nav).unwrap()).unwrap();
 assert!(s.update(vec![Update{id:nav,patch:json!({"navigation":{"autoSuggestBox":{"kind":"Button","properties":{"text":"wrong"}}}})}]).is_err());
 assert_eq!(serde_json::to_value(s.properties(nav).unwrap()).unwrap(),before);
}
#[test]fn every_pinned_gallery_page_instantiates_through_frame_resource_navigation(){
 let mut s=scene();let nav=nav(&mut s,json!({}));
 let pages=(1..=7).map(|i|json!({"key":format!("SamplePage{i}"),"contentResource":format!("gallery/SamplePage{i}")})).chain(std::iter::once(json!({"key":"SampleSettingsPage","contentResource":"gallery/SampleSettingsPage"}))).collect::<Vec<_>>();
 let frame=s.create(nav,NodeKind::Frame,json!({"contentHost":{"pages":pages}})).unwrap();
 for page in pages{
  let request=json!({"kind":"contentHost","id":frame,"action":"navigate","page":page["key"]});s.input(serde_json::from_value(request).unwrap(),0.).unwrap();layout(&mut s);
  let snapshot=serde_json::to_value(s.snapshot()).unwrap();let pending=snapshot["nodes"].as_array().unwrap().iter().find(|n|n["id"]==frame).unwrap()["contentHost"]["pending"].clone();
  s.input(serde_json::from_value(json!({"kind":"contentHost","id":frame,"action":"resolve","request":pending,"cancel":false})).unwrap(),0.).unwrap();layout(&mut s);
  let snapshot=serde_json::to_value(s.snapshot()).unwrap();assert!(snapshot["nodes"].as_array().unwrap().iter().any(|n|n["kind"]=="Page"));
 }
}
#[test]fn explicit_slot_conflict_is_atomic_and_template_parts_cannot_escape(){
 let mut s=scene();let nav=nav(&mut s,json!({}));let frame=s.create(nav,NodeKind::Frame,json!({})).unwrap();
 let before=serde_json::to_value(s.properties(nav).unwrap()).unwrap();
 assert!(s.update(vec![Update{id:nav,patch:json!({"navigation":{"content":"conflicting content"}})}]).is_err());
 assert_eq!(serde_json::to_value(s.properties(nav).unwrap()).unwrap(),before);assert!(s.get(frame).is_ok());
 let part=s.navigation_template_part(nav,"RootSplitView").unwrap().unwrap();assert!(s.reparent(part,s.root,None).is_err());assert!(s.destroy(part).is_err());layout(&mut s);
}
#[test]fn item_content_state_survives_left_top_template_reparenting(){
 let mut s=scene();let nav=nav(&mut s,json!({"items":[{"id":"a","text":"First","iconSource":{"kind":"Symbol","symbol":"Home"},"contentTemplate":{"kind":"TextBox","properties":{"text":"original"}},"infoBadge":{"kind":"InfoBadge","properties":{"value":4}}}]}));
 layout(&mut s);let host=s.navigation_template_part(nav,"ItemPart:a/ContentPresenter").unwrap().unwrap();let editor=s.get(host).unwrap().children[0];
 s.update(vec![Update{id:editor,patch:json!({"text":"edited"})}]).unwrap();
 for mode in ["Top","Left"] {s.update(vec![Update{id:nav,patch:json!({"navigation":{"paneDisplayMode":mode}})}]).unwrap();layout(&mut s);let host=s.navigation_template_part(nav,"ItemPart:a/ContentPresenter").unwrap().unwrap();assert_eq!(s.get(host).unwrap().children[0],editor);assert_eq!(s.get(editor).unwrap().props.text,"edited");}
}
#[test]fn native_header_separator_and_item_presenter_parts_are_real_rust_nodes(){
 let mut s=scene();let nav=nav(&mut s,json!({"selectedId":"a","items":[{"id":"a","text":"First","icon":"x"},{"id":"h","kind":"Header","text":"Actions"},{"id":"s","kind":"Separator"}]}));layout(&mut s);
 for(name,kind)in[("ItemPart:a/SelectionIndicator",NodeKind::Rectangle),("ItemPart:a/ContentPresenter",NodeKind::ContentPresenter),("ItemPart:h/HeaderText",NodeKind::TextBlock),("ItemPart:s/SeparatorLine",NodeKind::Rectangle)]{let node=s.navigation_template_part(nav,name).unwrap().unwrap();assert_eq!(s.get(node).unwrap().kind,kind);assert!(s.get(node).unwrap().visible,"{name}");}
 assert!(!s.display_list().is_empty());
}
#[test]fn large_menu_realizes_only_visible_source_containers(){
 let mut s=scene();let items=(0..2000).map(|i|json!({"id":format!("item{i}"),"text":format!("Item {i}")})).collect::<Vec<_>>();let nav=nav(&mut s,json!({"items":items}));layout(&mut s);
 let snapshot=serde_json::to_value(s.snapshot()).unwrap();assert!(snapshot["nodes"].as_array().unwrap().len()<500);assert!(s.navigation_template_part(nav,"Item:item1999").unwrap().is_none());
}
#[test]fn compact_search_opens_the_pane_and_focuses_the_real_editor(){
 let mut s=scene();let nav=nav(&mut s,json!({"paneDisplayMode":"LeftCompact","autoSuggestBox":{"kind":"AutoSuggestBox","properties":{"queryIcon":true}}}));layout(&mut s);
 s.input(serde_json::from_value(json!({"kind":"navigation","id":nav,"input":{"kind":"invoke","id":"$search"}})).unwrap(),0.).unwrap();layout(&mut s);
 assert!(s.get(nav).unwrap().nav.as_ref().unwrap().pane_open);
 let snapshot=serde_json::to_value(s.snapshot()).unwrap();let focused=snapshot["focused"].as_u64().unwrap();assert_eq!(snapshot["nodes"].as_array().unwrap().iter().find(|n|n["id"]==focused).unwrap()["kind"],"TextBox");
}
#[test]fn public_footer_items_use_native_presenter_parts_and_do_not_round_outer_margins_twice(){
 let mut s=scene();s.resize(800.,540.,1.25).unwrap();let stack=s.create(s.root,NodeKind::StackPanel,json!({})).unwrap();
 let mut first=0;for _ in 0..2{let item=s.create(stack,NodeKind::NavigationViewItem,json!({"iconSource":{"kind":"Symbol","symbol":"Download"}})).unwrap();if first==0{first=item;}}
 layout(&mut s);assert_eq!(s.get(stack).unwrap().desired[1],80.);
 let presenter=s.get(first).unwrap().children[0];assert_eq!(s.get(presenter).unwrap().kind,NodeKind::NavigationViewItemPresenter);
 let snapshot=serde_json::to_value(s.snapshot()).unwrap();assert!(snapshot["nodes"].as_array().unwrap().iter().any(|n|n["navigationOwner"]==first&&n["templatePart"]=="ItemPart:standalone/Icon"));
 for kind in ["down","up"]{s.input(serde_json::from_value(json!({"kind":kind,"x":20,"y":20,"pointer":1})).unwrap(),0.).unwrap();}
 let snapshot=serde_json::to_value(s.snapshot()).unwrap();assert!(snapshot["events"].as_array().unwrap().iter().any(|e|e["target"]==first&&e["kind"]=="itemInvoked"),"root={:?}, events={}",s.get(first).unwrap().rect,snapshot["events"]);
 s.destroy(stack).unwrap();
}
#[test]fn shoulder_navigation_honors_native_policy_and_skips_nonselectable_items(){
 use winui_wasm::{navigation::NavigationView,model::Input};
 let mut view=NavigationView::new(serde_json::from_value(json!({"paneDisplayMode":"Top","selectedId":"a","items":[{"id":"a","text":"First"},{"id":"skip","text":"Skip","selectsOnInvoked":false},{"id":"b","text":"Second"}]})).unwrap()).unwrap();
 view.input(Input::Resize{width:1000.,height:600.},0.).unwrap();view.layout();
 view.input(Input::Key{key:"GamepadRightShoulder".into()},0.).unwrap();assert_eq!(view.selected.as_deref(),Some("a"));
 view.update(json!([{"shoulderNavigationEnabled":"Always"}])).unwrap();view.layout();view.input(Input::Key{key:"GamepadRightShoulder".into()},0.).unwrap();assert_eq!(view.selected.as_deref(),Some("b"));
 view.update(json!([{"shoulderNavigationEnabled":"WhenSelectionFollowsFocus","selectionFollowsFocus":false}])).unwrap();view.input(Input::Key{key:"GamepadLeftShoulder".into()},0.).unwrap();assert_eq!(view.selected.as_deref(),Some("b"));
 view.update(json!([{"selectionFollowsFocus":true}])).unwrap();view.input(Input::Key{key:"GamepadLeftShoulder".into()},0.).unwrap();assert_eq!(view.selected.as_deref(),Some("a"));
}
