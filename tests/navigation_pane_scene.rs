use serde_json::json;
use winui_wasm::{enums::*, render::Draw, scene::Scene, typography::{Font,Metrics,TextMeasurer}};

struct Measure;
impl TextMeasurer for Measure {
 fn measure(&mut self,text:&str,font:&Font)->Metrics {Metrics{width:text.chars().count() as f64*font.size*0.5,ascent:font.size*0.8,descent:font.size*0.2,..Default::default()}}
}
fn fixture(mode:&str,open:bool)->(Scene,u32) {
 let mut s=Scene::new(Theme::Light,false);s.resize(800.,540.,1.25).unwrap();
 let id=s.create(s.root,NodeKind::NavigationView,json!({"navigation":{"paneDisplayMode":mode,"isPaneOpen":open,"items":[{"id":"a","text":"First"}],"isBackButtonVisible":"Collapsed"}})).unwrap();
 s.create(id,NodeKind::Grid,json!({"background":"#0088cc"})).unwrap();tick(&mut s,1000.);(s,id)
}
fn tick(s:&mut Scene,time:f64){s.advance(time);s.layout(&mut Measure);}
fn command(s:&mut Scene,id:u32,input:serde_json::Value,time:f64){s.input(serde_json::from_value(json!({"kind":"navigation","id":id,"input":input})).unwrap(),time).unwrap();s.layout(&mut Measure);}
fn close(s:&mut Scene,id:u32,time:f64){
 command(s,id,json!({"kind":"invoke","id":"$toggle"}),time);
 let request=s.snapshot().events.iter().find(|e|e.kind==EventKind::PaneClosing).unwrap().request_id.unwrap();
 command(s,id,json!({"kind":"resolveClosing","request":request,"cancel":false}),time);
}
fn width(s:&Scene,id:u32)->f64{s.get(id).unwrap().nav.as_ref().unwrap().pane.width}

#[test]fn scene_arrange_preserves_open_close_and_reversal_timelines(){
 for mode in ["Left","LeftCompact","LeftMinimal"] {
  let(s,id)=fixture(mode,false);let mut s=s;let closed=width(&s,id);
  command(&mut s,id,json!({"kind":"invoke","id":"$toggle"}),1000.);
  assert_eq!(width(&s,id),closed,"{mode}: first arrange must preserve the animation's initial sample");
  tick(&mut s,1070.);let middle=width(&s,id);assert!(middle>closed&&middle<320.,"{mode}: {middle}");
  s.invalidate(id,true);s.layout(&mut Measure);assert_eq!(width(&s,id),middle);
  close(&mut s,id,1070.);assert_eq!(width(&s,id),middle,"reversal must sample the visible width");
  tick(&mut s,1100.);assert!(width(&s,id)>closed&&width(&s,id)<middle);
  command(&mut s,id,json!({"kind":"invoke","id":"$toggle"}),1100.);let reverse=width(&s,id);
  tick(&mut s,1140.);assert!(width(&s,id)>reverse&&width(&s,id)<320.);
  tick(&mut s,1450.);assert_eq!(width(&s,id),320.);
 }
}
#[test]fn closing_overlay_keeps_acrylic_above_the_page_until_the_last_frame(){
 for mode in ["LeftCompact","LeftMinimal"] {
  let(mut s,id)=fixture(mode,true);close(&mut s,id,1000.);
  for time in [1000.,1030.,1060.,1100.] {
   tick(&mut s,time);let nav=s.get(id).unwrap().nav.as_ref().unwrap();assert!(nav.pane_recipe().is_some(),"{mode}: material disappeared at {time}");
   let list=s.display_list();let acrylic=list.iter().position(|d|matches!(d,Draw::Acrylic{..})).expect("visible closing pane must still execute Acrylic");
   let page=list.iter().position(|d|matches!(d,Draw::Fill{color,..} if color.starts_with("#0088cc"))).expect("real page background");
   assert!(acrylic>page,"{mode}: page must be painted before the closing Acrylic pane");
  }
  tick(&mut s,1120.);assert!(!s.display_list().iter().any(|d|matches!(d,Draw::Acrylic{..})));
 }
}
#[test]fn inherited_transparency_policy_updates_the_actual_material_track(){
 let(mut s,id)=fixture("LeftCompact",true);s.reduced_transparency=true;s.invalidate(id,true);tick(&mut s,1000.);
 assert_eq!(s.get(id).unwrap().nav.as_ref().unwrap().material_motion.value(1000.),0.);
 assert!(!s.display_list().iter().any(|d|matches!(d,Draw::Acrylic{..})));
 s.reduced_transparency=false;s.invalidate(id,true);tick(&mut s,1000.);
 assert_eq!(s.get(id).unwrap().nav.as_ref().unwrap().material_motion.value(1000.),0.);
 tick(&mut s,1080.);let weight=s.get(id).unwrap().nav.as_ref().unwrap().material_motion.value(1080.);assert!(weight>0.&&weight<1.);
 tick(&mut s,1167.);assert_eq!(s.get(id).unwrap().nav.as_ref().unwrap().material_motion.value(1167.),1.);
}
#[test]fn acrylic_uses_a_fixed_surface_with_an_animated_pane_clip(){
 for mode in ["LeftCompact","LeftMinimal"] {
  let(mut s,id)=fixture(mode,false);
  command(&mut s,id,json!({"kind":"invoke","id":"$toggle"}),1000.);
  let mut widths=Vec::new();
  for time in [1040.,1080.,1160.,1250.,1350.] {
   tick(&mut s,time);let pane=s.get(id).unwrap().nav.as_ref().unwrap().pane;
   let list=s.display_list();
   let at=list.iter().position(|d|matches!(d,Draw::Acrylic{..})).unwrap();
   assert!(matches!(&list[at],Draw::Acrylic{rect,..} if rect.width==320.));
   assert!(matches!(&list[at-1],Draw::Clip{rect,..} if *rect==pane));
   assert!(matches!(&list[at+1],Draw::Restore));
   let mut depth=0i32;
   for draw in &list {
    match draw {Draw::Save|Draw::Clip{..}|Draw::RoundedClip{..}|Draw::CornerClip{..}=>depth+=1,Draw::Restore=>depth-=1,_=>{}}
    assert!(depth>=0,"unbalanced restore");
   }
   assert_eq!(depth,0,"pane clip must preserve the enclosing display-list stack");
   widths.push(pane.width);
  }
  assert!(widths.windows(2).any(|v|v[0]!=v[1]));
 }
}
#[test]fn left_compact_inline_uses_its_own_source_track_for_both_directions(){
 let(mut s,id)=fixture("Left",true);close(&mut s,id,1000.);
 let motion=&s.get(id).unwrap().nav.as_ref().unwrap().pane_motion;
 assert_eq!(motion.duration,200.);assert_eq!(motion.curve,[0.,0.35,0.15,1.]);
 tick(&mut s,1016.);assert!(width(&s,id)>160.,"first presented frame must not already be nearly closed");
 tick(&mut s,1120.);assert!(width(&s,id)>48.,"CompactInline keeps animating beyond Overlay's close endpoint");
 tick(&mut s,1200.);assert_eq!(width(&s,id),48.);
 command(&mut s,id,json!({"kind":"invoke","id":"$toggle"}),1300.);
 assert_eq!(s.get(id).unwrap().nav.as_ref().unwrap().pane_motion.duration,200.);
 tick(&mut s,1500.);assert_eq!(width(&s,id),320.);
 for mode in ["LeftCompact","LeftMinimal"] {
  let(mut s,id)=fixture(mode,true);close(&mut s,id,1000.);
  let motion=&s.get(id).unwrap().nav.as_ref().unwrap().pane_motion;
  assert_eq!(motion.duration,120.);assert_eq!(motion.curve,[0.1,0.9,0.2,1.]);
 }
}
#[test]fn fractional_dpi_measure_constraints_do_not_reset_pane_motion(){
 for (w,h,dpr) in [(1528.,650.,1.25),(1527.,650.,1.25),(999.,649.,1.5),(1200.3,650.2,1.25)] {
  for nested in [false,true] {
   let mut s=Scene::new(Theme::Light,false);s.resize(w,h,dpr).unwrap();
   let parent=if nested{s.create(s.root,NodeKind::Grid,json!({"padding":[0.2,0.2,0.2,0.2]})).unwrap()}else{s.root};
   let id=s.create(parent,NodeKind::NavigationView,json!({"navigation":{"paneDisplayMode":"Left","isPaneOpen":true,"items":[{"id":"a","text":"First"}]}})).unwrap();
   let frame=s.create(id,NodeKind::Frame,json!({"contentHost":{"pages":[{"key":"page","content":{"kind":"TextBlock","properties":{"text":"Real Page at fractional DPI"}}}]}})).unwrap();
   tick(&mut s,1000.);
   s.input(serde_json::from_value(json!({"kind":"contentHost","id":frame,"action":"navigate","page":"page","transition":"Suppress"})).unwrap(),1000.).unwrap();
   tick(&mut s,1000.);close(&mut s,id,1000.);
   assert_eq!(width(&s,id),320.,"{w}x{h} at {dpr}, nested={nested}: Measure must not snap the first closing frame");
   let content_width=s.get(frame).unwrap().rect.width;
   for time in [1016.,1050.,1100.,1160.,1199.] {
    s.invalidate(id,true);tick(&mut s,time);
    assert!(width(&s,id)>48.&&width(&s,id)<320.,"{w}x{h} at {dpr}, nested={nested}, {time}");
    assert_eq!(s.get(frame).unwrap().rect.width,content_width);
   }
   tick(&mut s,1200.);assert_eq!(width(&s,id),48.);
   command(&mut s,id,json!({"kind":"invoke","id":"$toggle"}),1300.);tick(&mut s,1350.);
   assert!(width(&s,id)>48.&&width(&s,id)<320.);
   // An actual viewport resize remains an adaptive, immediate layout change.
   s.resize(w+80.,h+40.,dpr).unwrap();tick(&mut s,1360.);assert_eq!(width(&s,id),320.);
  }
 }
}
#[test]fn generated_viewports_preserve_the_timeline_through_repeated_layout(){
 // Test the layout invariant across arbitrary fractions, rather than encoding
 // per-resolution fixes. A fixed seed keeps a failing geometry reproducible.
 let mut seed=0x5c17u64;
 let mut random=||{seed=seed.wrapping_mul(6364136223846793005).wrapping_add(1);(seed>>11) as f64/((1u64<<53) as f64)};
 for case in 0..32 {
  let (w,h,dpr)=(360.+random()*1640.,160.+random()*1000.,0.75+random()*3.25);
  let mut s=Scene::new(Theme::Light,false);s.resize(w,h,dpr).unwrap();
  let parent=if case%2==0{s.create(s.root,NodeKind::Grid,json!({"padding":[0.2,0.2,0.2,0.2]})).unwrap()}else{s.root};
  let mode=["Left","LeftCompact","LeftMinimal"][case%3];
  let id=s.create(parent,NodeKind::NavigationView,json!({"navigation":{"paneDisplayMode":mode,"isPaneOpen":true,"items":[{"id":"a","text":"Item"}]}})).unwrap();
  tick(&mut s,1000.);close(&mut s,id,1000.);
  let motion=&s.get(id).unwrap().nav.as_ref().unwrap().pane_motion;
  let track=(motion.from,motion.to,motion.start,motion.duration,motion.curve);
  assert!(track.3>0.,"{case}: {w}x{h}, dpr={dpr}, {mode}");
  for fraction in [0.08,0.3,0.6,0.99] {
   s.advance(1000.+track.3*fraction);
   let sample=s.get(id).unwrap().nav.as_ref().unwrap().pane_motion.value(s.time);
   for _ in 0..3 {
    s.invalidate(id,true);s.layout(&mut Measure);
    let nav=s.get(id).unwrap().nav.as_ref().unwrap();let motion=&nav.pane_motion;
    assert_eq!((motion.from,motion.to,motion.start,motion.duration,motion.curve),track,"{case}: {w}x{h}, dpr={dpr}, {mode}");
    assert_eq!(nav.pane.width,sample,"layout must preserve the sampled visual");
   }
  }
 }
}
#[test]fn gallery_can_suppress_the_current_item_without_disposing_navigation(){
 let mut nav=winui_wasm::navigation::NavigationView::new(serde_json::from_value(json!({"selectedId":"a","items":[{"id":"a","text":"First"},{"id":"b","text":"Second"}]})).unwrap()).unwrap();
 nav.update(json!([{"items":[{"id":"a","text":"First","selectsOnInvoked":false},{"id":"b","text":"Second"}]}])).unwrap();assert_eq!(nav.selected.as_deref(),Some("a"));
 nav.update(json!([{"selectedId":"b"}])).unwrap();
 nav.update(json!([{"selectedId":"a"}])).unwrap();assert_eq!(nav.selected.as_deref(),Some("b"));assert_eq!(nav.props.selected_id.as_deref(),Some("b"));
 assert!(nav.snapshot().events.iter().any(|e|e.kind==EventKind::ItemInvoked&&e.item_id.as_deref()==Some("a")));
}
