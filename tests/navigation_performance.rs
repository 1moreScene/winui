use serde_json::json;
use winui_wasm::{enums::*,scene::{Scene,Input},typography::{Font,Metrics,TextMeasurer}};
#[derive(Default)]struct Measure{calls:usize}
impl TextMeasurer for Measure{fn measure(&mut self,text:&str,font:&Font)->Metrics{self.calls+=1;Metrics{width:text.len() as f64*font.size/2.,ascent:font.size*0.8,descent:font.size*0.2,..Default::default()}}}

#[test]fn hover_and_indicator_do_not_remeasure_page_or_recreate_source_parts(){
 let mut s=Scene::new(Theme::Light,false);s.resize(900.,600.,1.25).unwrap();
 let id=s.create(s.root,NodeKind::NavigationView,json!({"navigation":{"paneDisplayMode":"Left","isPaneOpen":true,"selectedId":"a","items":[{"id":"a","text":"First"},{"id":"b","text":"Second"}]}})).unwrap();
 let frame=s.create(id,NodeKind::Frame,json!({"contentHost":{"pages":[{"key":"page","content":{"kind":"TextBlock","properties":{"text":"Real page content"}}}]}})).unwrap();
 let mut measure=Measure::default();s.advance(1000.);s.layout(&mut measure);
 s.input(serde_json::from_value(json!({"kind":"contentHost","id":frame,"action":"navigate","page":"page","transition":"Suppress"})).unwrap(),1000.).unwrap();s.layout(&mut measure);
 let parts=s.snapshot().nodes.iter().map(|n|n.id).collect::<Vec<_>>();
 let first=s.get(id).unwrap().nav.as_ref().unwrap().parts.iter().find(|p|p.id=="b").unwrap().rect;
 let layout=s.layout_passes;let measurements=measure.calls;
 for i in 0..24{
  s.input(Input::Navigation{id,input:serde_json::from_value(json!({"kind":"move","x":first.x+20.,"y":first.y+10.+i as f64*0.1})).unwrap()},1000.+i as f64).unwrap();
  s.advance(1000.+i as f64);s.layout(&mut measure);
 }
 assert_eq!(s.layout_passes,layout,"hover is a brush/icon state change");
 assert_eq!(measure.calls,measurements,"hover must not measure the navigation or Page");
 assert_eq!(s.snapshot().nodes.iter().map(|n|n.id).collect::<Vec<_>>(),parts);
 assert!(s.snapshot().nodes.iter().any(|n|n.template_part.as_deref()==Some("ItemPart:b/LayoutRoot")&&serde_json::to_value(&n.props.background).unwrap()==json!({"resource":"NavigationViewItemBackgroundPointerOver"})));
 s.input(Input::Navigation{id,input:serde_json::from_value(json!({"kind":"invoke","id":"b"})).unwrap()},1100.).unwrap();s.layout(&mut measure);
 let layout=s.layout_passes;let measurements=measure.calls;
 for time in [1116.,1132.,1164.,1220.,1500.]{s.advance(time);s.layout(&mut measure);}
 assert_eq!(s.layout_passes,layout,"indicator animation must not lay out Frame/Page each frame");
 assert_eq!(measure.calls,measurements);
 assert_eq!(s.get(frame).unwrap().kind,NodeKind::Frame);
 assert_eq!(s.get(id).unwrap().nav.as_ref().unwrap().selected.as_deref(),Some("b"));
 s.update(vec![winui_wasm::scene::Update{id,patch:json!({"navigation":{"selectionFollowsFocus":true}})}]).unwrap();s.layout(&mut measure);
 let layout=s.layout_passes;
 s.input(Input::Navigation{id,input:serde_json::from_value(json!({"kind":"focus","id":"a"})).unwrap()},1600.).unwrap();s.layout(&mut measure);
 assert_eq!(s.layout_passes,layout,"focus selection only changes indicator/brush/container state");
 assert!(s.snapshot().nodes.iter().any(|n|n.template_part.as_deref()==Some("Item:a")&&n.props.is_selected));
}

#[test]fn inline_content_changes_layout_width_once_and_animates_position(){
 let mut s=Scene::new(Theme::Light,false);s.resize(800.,540.,1.25).unwrap();
 let id=s.create(s.root,NodeKind::NavigationView,json!({"navigation":{"paneDisplayMode":"Left","isPaneOpen":false,"items":[{"id":"a","text":"First"}]}})).unwrap();
 let frame=s.create(id,NodeKind::Frame,json!({"contentHost":{"pages":[{"key":"page","content":{"kind":"TextBlock","properties":{"text":"A real page with content"}}}]}})).unwrap();
 let mut m=Measure::default();s.advance(1000.);s.layout(&mut m);
 s.input(serde_json::from_value(json!({"kind":"contentHost","id":frame,"action":"navigate","page":"page","transition":"Suppress"})).unwrap(),1000.).unwrap();s.layout(&mut m);
 let closed=s.get(frame).unwrap().rect.width;
 s.input(Input::Navigation{id,input:serde_json::from_value(json!({"kind":"invoke","id":"$toggle"})).unwrap()},1000.).unwrap();s.layout(&mut m);
 let open=s.get(frame).unwrap().rect.width;assert!(open<closed);
 let mut positions=Vec::new();
 for time in [1016.,1040.,1080.,1175.,1350.]{s.advance(time);s.layout(&mut m);assert_eq!(s.get(frame).unwrap().rect.width,open);positions.push(s.get(frame).unwrap().world.0[4]);}
 assert!(positions.windows(2).any(|p|p[0]!=p[1]));
 s.input(Input::Navigation{id,input:serde_json::from_value(json!({"kind":"invoke","id":"$toggle"})).unwrap()},1400.).unwrap();s.layout(&mut m);
 let request=s.snapshot().events.iter().find(|e|e.kind==EventKind::PaneClosing).unwrap().request_id.unwrap();
 s.input(Input::Navigation{id,input:serde_json::from_value(json!({"kind":"resolveClosing","request":request,"cancel":false})).unwrap()},1400.).unwrap();s.layout(&mut m);
 for time in [1416.,1440.,1480.,1520.]{s.advance(time);s.layout(&mut m);assert_eq!(s.get(frame).unwrap().rect.width,closed);}
}
