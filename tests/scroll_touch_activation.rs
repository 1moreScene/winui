use serde_json::json;
use winui_wasm::{enums::*,scene::{Input,Scene},typography::{Font,Metrics,TextMeasurer}};
struct Measure;
impl TextMeasurer for Measure {fn measure(&mut self,text:&str,font:&Font)->Metrics {Metrics{width:text.len() as f64*font.size/2.,ascent:font.size,descent:0.,..Default::default()}}}
fn setup()->(Scene,u32,u32){
 let mut s=Scene::new(Theme::Light,true);s.resize(390.,400.,2.).unwrap();
 let scroll=s.create(s.root,NodeKind::ScrollViewer,json!({"height":300})).unwrap();
 let canvas=s.create(scroll,NodeKind::Canvas,json!({"height":900})).unwrap();
 let tile=s.create(canvas,NodeKind::Grid,json!({"width":200,"height":100,"isTabStop":true,"background":"#0078D4"})).unwrap();
 s.layout(&mut Measure);s.events.clear();(s,scroll,tile)
}
fn touch(s:&mut Scene,pointer:i32,phase:&str,y:f64){s.input(Input::Touch{pointer,x:80.,y,phase:phase.into()},s.time+20.).unwrap();s.layout(&mut Measure);}
#[test]fn scroll_content_focusable_panel_taps_activate_once_but_pans_and_cancellations_do_not(){
 let(mut s,scroll,tile)=setup();touch(&mut s,1,"down",60.);touch(&mut s,1,"up",60.);
 assert_eq!(s.events.iter().filter(|e|e.target==tile&&e.kind==EventKind::Click).count(),1);
 s.events.clear();touch(&mut s,2,"down",60.);touch(&mut s,2,"move",20.);touch(&mut s,2,"up",20.);
 assert!(s.nodes[&scroll].scroll.offsets(s.time)[1]>=40.);
 assert!(!s.events.iter().any(|e|e.kind==EventKind::Click));
 touch(&mut s,3,"down",20.);touch(&mut s,3,"cancel",20.);
 assert!(!s.events.iter().any(|e|e.kind==EventKind::Click));
}
#[test]fn multiple_fingers_or_a_removed_template_cannot_activate_a_scroll_content_panel(){
 let(mut s,_,tile)=setup();touch(&mut s,1,"down",60.);touch(&mut s,2,"down",60.);touch(&mut s,1,"up",60.);touch(&mut s,2,"up",60.);
 assert!(!s.events.iter().any(|e|e.kind==EventKind::Click));
 touch(&mut s,3,"down",60.);s.destroy(tile).unwrap();touch(&mut s,3,"up",60.);
 assert!(!s.events.iter().any(|e|e.kind==EventKind::Click));
}
