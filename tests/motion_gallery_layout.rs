use serde_json::json;
use winui_wasm::{enums::*,scene::{Scene,Update},typography::{Font,Metrics,TextMeasurer}};
struct Measure;
impl TextMeasurer for Measure {
    fn measure(&mut self,text:&str,font:&Font)->Metrics{Metrics{width:text.chars().count() as f64*font.size*0.5,ascent:font.size*0.8,descent:font.size*0.2,..Default::default()}}
}
#[test]
fn connected_sample_spanning_text_does_not_expand_its_auto_image_column() {
    for dpr in [1.,1.25,1.5] {
        let mut s=Scene::new(Theme::Light,true);s.resize(800.,600.,dpr).unwrap();
        let scroll=s.create(s.root,NodeKind::ScrollViewer,json!({})).unwrap();
        let grid=s.create(scroll,NodeKind::Grid,json!({"columns":[{"unit":"Auto"},{"unit":"Star"},{"unit":"Star"}],"rows":[{"unit":"Auto"},{"unit":"Auto"},{"unit":"Star"}]})).unwrap();
        let source=s.create(grid,NodeKind::Grid,json!({"minWidth":250,"minHeight":150,"rowSpan":2,"margin":[5,5,5,5]})).unwrap();
        let gray=s.create(grid,NodeKind::Grid,json!({"column":1,"minHeight":150,"margin":[6,6,6,6]})).unwrap();
        s.create(grid,NodeKind::Grid,json!({"column":2,"row":1,"minHeight":150,"margin":[6,6,6,6]})).unwrap();
        s.create(grid,NodeKind::TextBlock,json!({"row":2,"columnSpan":3,"wrap":true,"text":"A long paragraph that spans Auto and Star columns. ".repeat(16)})).unwrap();
        s.layout(&mut Measure);
        assert!((s.nodes[&source].rect.width-250.).abs()<1./dpr);
        assert!(s.nodes[&gray].rect.width>100.);
        assert!(s.nodes[&grid].rect.width<=801.);
    }
}
#[test]
fn floating_surface_allocation_and_clip_follow_expression_translation() {
    for theme in [Theme::Light,Theme::Dark] {
        let mut s=Scene::new(theme,true);s.resize(800.,600.,1.25).unwrap();
        let popup=s.create(s.root,NodeKind::Popup,json!({"isOpen":true,"width":200,"height":50,"translationX":300,"translationY":80})).unwrap();
        s.create(popup,NodeKind::Grid,json!({"background":"#ffffff"})).unwrap();
        s.layout(&mut Measure);
        let bounds=s.floating_surface_bounds();
        assert!((bounds.x-300.).abs()<1.&& (bounds.y-80.).abs()<1.);
        assert!(bounds.width>=200.&&bounds.height>=49.6);
        s.update(vec![Update{id:popup,patch:json!({"translationX":420,"scaleX":1.5})}]).unwrap();
        s.layout(&mut Measure);
        let bounds=s.floating_surface_bounds();
        assert!((bounds.x-420.).abs()<1.&&bounds.width>=300.);
    }
}

#[test]
fn native_control_presenter_keeps_natural_width_and_top_left_padding() {
    for width in [640.,1143.] {
        let mut s=Scene::new(Theme::Light,true);s.resize(width,266.,1.).unwrap();
        let presenter=s.create(s.root,NodeKind::ContentPresenter,json!({"padding":[12,12,12,12],"horizontalContentAlignment":"Left","verticalContentAlignment":"Top"})).unwrap();
        let content=s.create(presenter,NodeKind::StackPanel,json!({"width":263})).unwrap();
        s.create(content,NodeKind::TextBlock,json!({"text":"Hover over the button below","margin":[0,0,0,12],"height":19})).unwrap();
        let button=s.create(content,NodeKind::Button,json!({"width":100,"height":50,"horizontalAlignment":"Left"})).unwrap();
        s.layout(&mut Measure);
        assert_eq!(s.nodes[&content].rect.width,263.);
        assert_eq!((s.nodes[&button].world.0[4],s.nodes[&button].world.0[5]),(12.,43.));
    }
}
#[test]
fn wrapped_text_ellipsis_and_max_lines_are_rust_layout_properties() {
    let font=Font::default();
    let mut text=winui_wasm::typography::layout(&"wrapped paragraph ".repeat(12),&font,150.,true,TextTrimming::CharacterEllipsis,None,&mut Measure);
    let line_height=text.line_height;
    winui_wasm::typography::constrain_lines(&mut text,&font,150.,line_height*2.1,0,TextTrimming::CharacterEllipsis,&mut Measure);
    assert_eq!(text.lines.len(),2);assert!(text.lines[1].text.ends_with('…'));
    let mut s=Scene::new(Theme::Light,true);s.resize(150.,600.,1.).unwrap();
    let id=s.create(s.root,NodeKind::TextBlock,json!({"text":"long body ".repeat(40),"wrap":true,"maxLines":3,"trimming":"CharacterEllipsis"})).unwrap();
    s.layout(&mut Measure);
    assert_eq!(s.nodes[&id].text.lines.len(),3);assert!(s.nodes[&id].text.lines[2].text.ends_with('…'));
}
#[test]
fn smoke_input_blocking_preserves_enabled_card_visuals() {
    let mut s=Scene::new(Theme::Light,true);s.resize(300.,200.,1.).unwrap();
    let panel=s.create(s.root,NodeKind::Grid,json!({"isHitTestVisible":false})).unwrap();
    let button=s.create(panel,NodeKind::Button,json!({"text":"Item"})).unwrap();
    s.layout(&mut Measure);let n=&s.nodes[&button];let (x,y)=n.world.point(n.rect.width/2.,n.rect.height/2.);assert!(n.enabled);assert_ne!(s.hit(x,y),Some(button));
    s.update(vec![Update{id:panel,patch:json!({"isHitTestVisible":true})}]).unwrap();
    s.layout(&mut Measure);assert_eq!(s.hit(x,y),Some(button));
}
#[test]
fn stretched_slider_keeps_native_track_row_and_paints_inline_ticks() {
    let mut s=Scene::new(Theme::Light,true);s.resize(150.,216.,1.).unwrap();
    let id=s.create(s.root,NodeKind::Slider,json!({"header":"Change radius","tickFrequency":25})).unwrap();
    s.layout(&mut Measure);
    let snap=s.snapshot();let slider=snap.nodes.iter().find(|n|n.id==id).unwrap().slider.as_ref().unwrap();
    assert!((slider.track.y-(s.nodes[&id].header_text.height+18.)).abs()<1.);
    let draws=s.display_list();let ticks=draws.iter().filter(|d|matches!(d,winui_wasm::render::Draw::Fill{rect,radius,..} if rect.width==1. && rect.height==4. && *radius==0.)).count();
    assert_eq!(ticks,5);
}
