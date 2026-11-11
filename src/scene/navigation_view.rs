//! Specialized executor for the pinned NavigationView XAML template.
//! All presenters, slots, menu containers and floating content are Rust nodes.
//! The navigation state machine supplies the source-derived visual-state layout.
use super::*;
use crate::render::{Draw, NavigationLayer};
use serde_json::{json, Value};
use std::collections::{BTreeMap, HashSet};

#[derive(Default)]
pub struct TemplateState {
    pub owner: Option<u32>,
    pub name: String,
    pub action: Option<String>,
    pub building: bool,
    pub focus_search:bool,
    pub motion_override:Option<bool>,
    pub transparency_override:Option<bool>,
    pub slot: bool,
    pub parts: BTreeMap<String, u32>,
    slots: BTreeMap<String, u32>,
    signatures: BTreeMap<String, String>,
    generated: BTreeMap<String, u32>,
    rows: BTreeMap<String, u32>,
    sizes: BTreeMap<String, [f64; 2]>,
    content_measure_width: Option<f64>,
    standalone: Option<Box<NavigationView>>,
    row_parts:BTreeMap<String,BTreeMap<String,u32>>,
    row_data:BTreeMap<String,String>,
    item_key:Option<String>,
    item_role:String,
}
#[derive(Deserialize)]
#[serde(rename_all="camelCase")]
struct Contract { parts: Vec<Part>, metrics: BTreeMap<String, String>, item_templates:BTreeMap<String,Vec<Part>> }
#[derive(Deserialize)]
struct Part { name: String, kind: NodeKind, parent: Option<String>, slot: Option<String>, attributes: BTreeMap<String, String> }
fn contract() -> &'static Contract {
    static C: std::sync::OnceLock<Contract> = std::sync::OnceLock::new();
    C.get_or_init(||serde_json::from_str(include_str!("../../references/navigation-composition-template.json")).expect("compiled NavigationView template"))
}
fn metric(key: &str) -> f64 { contract().metrics[key].split(',').next().unwrap().parse().unwrap() }
pub fn is_item(kind: NodeKind) -> bool { matches!(kind, NodeKind::NavigationViewItem|NodeKind::NavigationViewItemPresenter|NodeKind::NavigationViewItemHeader|NodeKind::NavigationViewItemSeparator) }

impl Scene {
    pub(super) fn navigation_content_parent(&self, parent:u32)->Result<u32,String>{
        let n=self.get(parent)?;
        if n.kind==NodeKind::NavigationView&&!n.navigation_template.building {return self.navigation_view_slot(parent,"Content");}
        if n.kind==NodeKind::NavigationViewItem&&!n.navigation_template.building{if let Some(content)=n.navigation_template.parts.get("ItemPart:standalone/ContentPresenter"){return Ok(*content);}}
        Ok(parent)
    }
    pub fn navigation_view_slot(&self,id:u32,slot:&str)->Result<u32,String>{
        self.get(id)?.navigation_template.slots.get(slot).copied().ok_or_else(||format!("Unknown NavigationView slot {slot}"))
    }
    pub fn navigation_template_part(&self,id:u32,name:&str)->Result<Option<u32>,String>{
        let n=self.get(id)?;if n.kind!=NodeKind::NavigationView{return Err("Expected NavigationView".into());}
        Ok(n.navigation_template.parts.get(name).copied())
    }
    fn nav_part(&mut self,owner:u32,parent:u32,kind:NodeKind,name:&str,patch:Value)->Result<u32,String>{
        self.nodes.get_mut(&parent).unwrap().repeater.creating=true;
        let result=self.create(parent,kind,patch);
        self.nodes.get_mut(&parent).unwrap().repeater.creating=false;
        let id=result?;
        let t=&mut self.nodes.get_mut(&id).unwrap().navigation_template;t.owner=Some(owner);t.name=name.into();
        self.nodes.get_mut(&owner).unwrap().navigation_template.parts.insert(name.into(),id);
        Ok(id)
    }
    pub(super) fn init_navigation_template(&mut self,id:u32,patch:&Value)->Result<(),String>{
        if self.nodes[&id].kind==NodeKind::NavigationViewItem&&self.nodes[&id].parent.is_none_or(|parent|!self.nodes[&parent].repeater.creating){return self.sync_standalone_navigation_item(id);}
        if self.nodes[&id].kind!=NodeKind::NavigationView{return Ok(());}
        let state=&mut self.nodes.get_mut(&id).unwrap().navigation_template;state.motion_override=patch.get("navigation").and_then(|p|p.get("reducedMotion")).and_then(Value::as_bool);state.transparency_override=patch.get("navigation").and_then(|p|p.get("reducedTransparency")).and_then(Value::as_bool);
        self.nodes.get_mut(&id).unwrap().navigation_template.building=true;
        let result:Result<(),String>=(||{
            for def in &contract().parts {
                let parent=def.parent.as_ref().map(|key|self.nodes[&id].navigation_template.parts[key]).unwrap_or(id);
                let mut p=json!({"layoutKey":def.name,"isTabStop":false,"clip":false});
                if let Some(slot)=&def.slot {if slot=="Pane"{p["viewControls"]=json!({"slot":"Pane"});}}
                if let Some(v)=def.attributes.get("Canvas.ZIndex"){p["zIndex"]=json!(v.parse::<i32>().unwrap());}
                if def.name=="PaneTitleTextBlock"{p["horizontalAlignment"]=json!("Left");}
                if def.kind==NodeKind::ToolTip{p["placementTarget"]=json!(parent);p["text"]=json!(if def.name.contains("Close"){"Close navigation"}else{"Back"});}
                if def.kind==NodeKind::Button {p["variant"]=json!("Subtle");p["padding"]=json!([0,0,0,0]);}
                if def.kind==NodeKind::ScrollViewer {p["verticalScrollBarVisibility"]=json!("Hidden");p["horizontalScrollBarVisibility"]=json!("Hidden");}
                if def.kind==NodeKind::ContentControl {p["horizontalContentAlignment"]=json!("Stretch");p["verticalContentAlignment"]=json!("Stretch");}
                self.nav_part(id,parent,def.kind,&def.name,p)?;
            }
            let root=self.nodes[&id].navigation_template.parts["RootGrid"];
            // NavigationViewItem.xaml owns this flyout; its repeater is moved here
            // when compact/top hierarchy is expanded, preserving item identity.
            let flyout=self.nav_part(id,root,NodeKind::Flyout,"ChildrenFlyout",json!({"isTabStop":false,"clip":false}))?;
            let scroll=self.nav_part(id,flyout,NodeKind::ScrollViewer,"ChildrenScrollViewer",json!({"isTabStop":false,"clip":false}))?;
            self.nav_part(id,scroll,NodeKind::ItemsRepeater,"ChildrenMenuItemsHost",json!({"isTabStop":false,"clip":false}))?;
            for slot in ["Content","Header","PaneHeader","PaneCustomContent","PaneFooter","AutoSuggestBox","ContentOverlay"] {
                let presenter=self.nav_presenter(id,slot,false);
                let node=self.nav_part(id,presenter,NodeKind::Grid,&format!("Slot:{slot}"),json!({"isTabStop":false}))?;
                self.nodes.get_mut(&node).unwrap().navigation_template.slot=true;
                self.nodes.get_mut(&id).unwrap().navigation_template.slots.insert(slot.into(),node);
            }
            Ok(())
        })();
        self.nodes.get_mut(&id).unwrap().navigation_template.building=false;
        result?;self.sync_navigation_slots(id)
    }
    fn nav_presenter(&self,id:u32,slot:&str,top:bool)->u32{
        let key=match(slot,top){
            ("Content",_)=>"ContentPresenter",("Header",_)=>"HeaderContent",
            ("PaneHeader",false)=>"PaneHeaderContentBorder",("PaneHeader",true)=>"PaneHeaderOnTopPane",
            ("PaneCustomContent",false)=>"PaneCustomContentBorder",("PaneCustomContent",true)=>"PaneCustomContentOnTopPane",
            ("PaneFooter",false)=>"FooterContentBorder",("PaneFooter",true)=>"PaneFooterOnTopPane",
            ("AutoSuggestBox",false)=>"PaneAutoSuggestBoxPresenter",("AutoSuggestBox",true)=>"TopPaneAutoSuggestBoxPresenter",
            ("ContentOverlay",_)=>"TopNavContentOverlayAreaGrid",_=>unreachable!()};
        self.nodes[&id].navigation_template.parts[key]
    }
    fn nav_reparent(&mut self,node:u32,parent:u32){
        let old=self.nodes[&node].parent;if old==Some(parent){return;}
        if let Some(old)=old{self.nodes.get_mut(&old).unwrap().children.retain(|c|*c!=node);}
        self.nodes.get_mut(&parent).unwrap().children.push(node);self.nodes.get_mut(&node).unwrap().parent=Some(parent);
    }
    pub(super) fn validate_navigation_slots(&self,id:u32,p:&NodeProperties)->Result<(),String>{
        let Some(p)=p.navigation.as_ref()else{return Ok(())};
        for (slot,present) in [("Content",p.content_node.is_some()||p.content.is_some()),("Header",p.header_template.is_some()||p.header.is_some()),("PaneHeader",p.pane_header.is_some()),("PaneCustomContent",p.pane_custom_content.is_some()),("PaneFooter",p.pane_footer.is_some()),("AutoSuggestBox",p.auto_suggest_box.is_some()),("ContentOverlay",p.content_overlay.is_some())]{
            let host=self.navigation_view_slot(id,slot)?;let generated=self.nodes[&id].navigation_template.generated.get(slot).copied();
            if present&&self.nodes[&host].children.iter().any(|c|Some(*c)!=generated){return Err(format!("{slot} already has explicit content; remove it before setting a template"));}
        }
        Ok(())
    }
    pub(super) fn sync_navigation_slots(&mut self,id:u32)->Result<(),String>{
        let p=self.nodes[&id].nav.as_ref().unwrap().props.clone();
        let text=|text:&str,size:f64|content_hosts::TemplateNode{kind:NodeKind::TextBlock,name:String::new(),properties:json!({"text":text,"height":if text.is_empty(){Some(0.)}else{None},"fontSize":size,"fontWeight":if size==28.{600}else{400},"wrap":true}),children:vec![]};
        let content=if p.content_node.is_some(){p.content_node.as_ref().map(legacy_content)}else{p.content.as_ref().map(|content|text(content,14.))};
        let templates=[("Content",content),("Header",p.header_template.clone().or_else(||p.header.as_ref().map(|header|text(header,28.)))),
            ("PaneHeader",p.pane_header.clone()),("PaneCustomContent",p.pane_custom_content.clone()),("PaneFooter",p.pane_footer.clone()),
            ("AutoSuggestBox",p.auto_suggest_box.clone()),("ContentOverlay",p.content_overlay.clone())];
        for (slot,template) in templates {
            let signature=serde_json::to_string(&template).unwrap();
            if self.nodes[&id].navigation_template.signatures.get(slot)==Some(&signature){continue;}
            let host=self.navigation_view_slot(id,slot)?;
            let generated=self.nodes[&id].navigation_template.generated.get(slot).copied();
            if template.is_some()&&self.nodes[&host].children.iter().any(|c|Some(*c)!=generated){return Err(format!("{slot} already has explicit content; remove it before setting a template"));}
            if let Some(old)=self.nodes.get_mut(&id).unwrap().navigation_template.generated.remove(slot){self.destroy(old)?;}
            if let Some(t)=template{let child=self.instantiate_content(host,&t)?;self.nodes.get_mut(&id).unwrap().navigation_template.generated.insert(slot.into(),child);}
            self.nodes.get_mut(&id).unwrap().navigation_template.signatures.insert(slot.into(),signature);
        }
        Ok(())
    }
    pub(super) fn sync_navigation_templates(&mut self){
        let ids=self.nodes.values().filter(|n|n.kind==NodeKind::NavigationView).map(|n|n.id).collect::<Vec<_>>();
        for id in ids{self.sync_navigation_slots(id).expect("validated NavigationView slot transaction");}
        let items=self.nodes.values().filter(|n|n.kind==NodeKind::NavigationViewItem&&n.navigation_template.owner.is_none()).map(|n|n.id).collect::<Vec<_>>();
        for id in items{self.sync_standalone_navigation_item(id).expect("validated standalone NavigationViewItem");}
    }
    fn sync_standalone_navigation_item(&mut self,id:u32)->Result<(),String>{
        let n=&self.nodes[&id];let item=crate::model::Item{id:"standalone".into(),text:n.props.text.clone(),icon:n.props.glyph.clone(),icon_source:n.props.icon_source.clone(),..Default::default()};
        let props=crate::model::Properties{items:vec![item],..Default::default()};
        let part=crate::model::Part{id:"standalone".into(),text:n.props.text.clone(),icon:n.props.glyph.clone(),rect:n.rect,enabled:n.enabled,selected:n.props.is_selected,expanded:None,depth:0,kind:ItemKind::Item,clip:None};
        if self.nodes[&id].navigation_template.standalone.is_none(){
            self.nodes.get_mut(&id).unwrap().navigation_template.standalone=Some(Box::new(NavigationView::new(props.clone()).unwrap()));
            self.nodes.get_mut(&id).unwrap().navigation_template.building=true;
            let result=self.nav_part(id,id,NodeKind::NavigationViewItemPresenter,"Presenter:standalone",json!({"isTabStop":false,"clip":false}));
            self.nodes.get_mut(&id).unwrap().navigation_template.building=false;result?;
        }
        self.sync_navigation_item_parts(id,id,&part,"Left",&props)
    }
    pub(super) fn arrange_standalone_navigation_item(&mut self,id:u32,m:&mut impl TextMeasurer){
        let n=&self.nodes[&id];let p=&n.props;let part=crate::model::Part{id:"standalone".into(),text:p.text.clone(),icon:p.glyph.clone(),rect:n.rect,enabled:n.enabled,selected:p.is_selected,expanded:None,depth:0,kind:ItemKind::Item,clip:None};
        let state=n.button.state(n.enabled);let(theme,selected)=(n.theme,p.is_selected);
        let nav=self.nodes.get_mut(&id).unwrap().navigation_template.standalone.as_mut().unwrap();nav.props.theme=theme;nav.pane_open=true;nav.parts=vec![part];nav.selected=selected.then(||"standalone".into());nav.hovered=matches!(state,ControlState::PointerOver|ControlState::Pressed).then(||"standalone".into());nav.pressed=(state==ControlState::Pressed).then(||"standalone".into());
        self.arrange_navigation_item_parts(id,id,"standalone",m);
        if let Some(indicator)=self.nodes[&id].navigation_template.row_parts["standalone"].get("SelectionIndicator").copied(){self.nodes.get_mut(&indicator).unwrap().presentation.opacity=if selected{1.}else{0.};}
    }
    pub(super) fn measure_navigation_view(&mut self,id:u32,available:[f64;2],m:&mut impl TextMeasurer)->[f64;2]{
        let width=if available[0].is_finite(){available[0]}else{self.nodes[&id].nav.as_ref().unwrap().props.open_pane_length};
        let p=self.nodes[&id].nav.as_ref().unwrap().props.clone();
        fn widths(items:&[crate::model::Item],font:&crate::typography::Font,m:&mut impl TextMeasurer,out:&mut std::collections::HashMap<String,f64>){for item in items{let mut font=font.clone();font.size=14.;font.weight=if item.kind==ItemKind::Header{600}else{400};out.insert(item.text.clone(),m.measure(&item.text,&font).width);widths(&item.children,&font,m,out);}}
        let mut text_widths=std::collections::HashMap::new();let font=self.nodes[&id].props.font();widths(&p.items,&font,m,&mut text_widths);widths(&p.footer_items,&font,m,&mut text_widths);
        let nav=self.nodes.get_mut(&id).unwrap().nav.as_mut().unwrap();nav.text_widths=text_widths;nav.slot_metrics.dpr=self.dpr;
        let top=p.pane_display_mode==PaneDisplayMode::Top;
        let mut sizes=BTreeMap::new();
        // Adaptive layout belongs to ActualSize/Arrange. At fractional DPI a
        // 650 DIP measure constraint can arrange to 650.4 DIP; treating those
        // as alternating viewport resizes snaps the pane timeline every frame.
        let rounded_width=(width*self.dpr+0.5+1e-9).floor()/self.dpr;
        let pixel_border=(self.dpr.round()/self.dpr).max(1./self.dpr);
        let content_width=self.nodes[&id].nav.as_ref().unwrap().measure_content_width(rounded_width,pixel_border);
        self.nodes.get_mut(&id).unwrap().navigation_template.content_measure_width=Some(content_width);
        for (slot,node) in self.nodes[&id].navigation_template.slots.clone(){
            let bound=match slot.as_str(){"Content"=>content_width,"Header"=>width,"AutoSuggestBox"=>if top{216.}else{(p.open_pane_length-32.).max(0.)},_=>if top{width}else{p.open_pane_length}};
            sizes.insert(slot,self.measure_node(node,[bound,available[1]],m));
        }
        let content=sizes["Content"];
        self.nodes.get_mut(&id).unwrap().navigation_template.sizes=sizes;
        let height=if available[1].is_finite(){available[1]}else{content[1]};
        [width,height]
    }
    pub(super) fn arrange_navigation_view(&mut self,id:u32,m:&mut impl TextMeasurer){
        let (width,height,world,theme,enabled,visible)={let n=&self.nodes[&id];(n.rect.width,n.rect.height,n.world,n.theme,n.enabled,n.visible)};
        let p=self.nodes[&id].nav.as_ref().unwrap().props.clone();
        let top=self.nodes[&id].nav.as_ref().unwrap().is_top();
        for (slot,node) in self.nodes[&id].navigation_template.slots.clone(){let presenter=self.nav_presenter(id,&slot,top);self.nav_reparent(node,presenter);}
        let sizes=self.nodes[&id].navigation_template.sizes.clone();
        let has=|slot:&str| self.nodes[&self.nodes[&id].navigation_template.slots[slot]].children.iter().any(|c|self.nodes[c].props.visible);
        let shown=|slot:&str|if has(slot){sizes.get(slot).copied().unwrap_or_default()}else{[0.,0.]};
        let mut header=shown("Header");if has("Header"){header[1]=header[1].max(metric("PaneToggleButtonHeight"));}let pane_header=shown("PaneHeader");let custom=shown("PaneCustomContent");let footer=shown("PaneFooter");let search=shown("AutoSuggestBox");let overlay=shown("ContentOverlay");
        {
            let pixel_border=(self.dpr.round()/self.dpr).max(1./self.dpr);
            let motion=self.nodes[&id].navigation_template.motion_override.unwrap_or(self.reduced_motion);let transparency=self.nodes[&id].navigation_template.transparency_override.unwrap_or(self.reduced_transparency);
            let nav=self.nodes.get_mut(&id).unwrap().nav.as_mut().unwrap();
            nav.inherit_policies(theme,motion,transparency);
            // Adaptive layout snaps actual viewport changes. A normal Arrange
            // must keep the SplitView's in-flight open/close sample intact.
            if nav.width!=width||nav.height!=height{nav.width=width;nav.height=height;nav.adapt();}
            nav.slot_metrics.border_width=Some(pixel_border);
            nav.slot_metrics.header_height=Some(if header[1]>0.{pixel_border+44.+header[1]}else{pixel_border});
            nav.slot_metrics.pane_header_height=pane_header[1];nav.slot_metrics.custom_height=custom[1];nav.slot_metrics.footer_height=footer[1]+4.;
            nav.slot_metrics.search_height=if search[1]>0.{search[1].max(metric("NavigationViewAutoSuggestAreaHeight"))+8.}else{0.};
            nav.slot_metrics.top_leading=pane_header[0];nav.slot_metrics.top_custom=if custom[0]>0.{custom[0].max(metric("TopNavigationViewPaneCustomContentMinWidth"))}else{0.};
            nav.slot_metrics.top_search=if search[0]>0.{search[0].max(216.)+8.}else{0.};nav.slot_metrics.top_footer=footer[0];nav.slot_metrics.top_overlay=overlay[1];nav.layout();
        }
        self.sync_navigation_rows(id).expect("bounded native navigation containers");
        let nav=self.nodes[&id].nav.as_ref().unwrap();let pane=nav.pane;let content=nav.content;let body=nav.content_body();let menu=nav.menu_clip;
        let pane_open=nav.pane_open;let overlay_pane=nav.display_mode!=DisplayMode::Expanded&&pane_open;
        let flyout=nav.flyout;let popup_owner=nav.flyout_owner.clone();let parts=nav.parts.clone();
        let header_visible=header[1]>0.&&(p.always_show_header||(!top&&nav.display_mode==DisplayMode::Minimal));
        let toggle_y=if p.back_button_visible()&&nav.display_mode!=DisplayMode::Minimal{44.}else{4.};
        let close=parts.iter().any(|part|part.id=="$close");
        let header_row=if p.is_pane_toggle_button_visible{metric("NavigationViewPaneHeaderRowMinHeight")}else{0.};
        let header_row=header_row.max(pane_header[1]);let search_y=toggle_y+header_row;
        let custom_y=search_y+nav.slot_metrics.search_height;
        let footer_y=menu.y+menu.height;
        let mut rects=BTreeMap::new();
        let split=self.nodes[&id].navigation_template.parts["RootSplitView"];
        let native_mode=if nav.display_mode==DisplayMode::Expanded{SplitViewDisplayMode::CompactInline}else if nav.display_mode==DisplayMode::Compact{SplitViewDisplayMode::CompactOverlay}else{SplitViewDisplayMode::Overlay};
        {
            let split_node=self.nodes.get_mut(&split).unwrap();
            let v=split_node.props.view_controls.get_or_insert_with(Default::default);
            v.is_pane_open=pane_open&&!top;v.display_mode=native_mode;v.open_pane_length=p.open_pane_length;v.compact_pane_length=p.compact_pane_length;
            split_node.view_control.motion.from=if !top&&pane.width>0.{1.}else{0.};split_node.view_control.motion.to=split_node.view_control.motion.from;split_node.view_control.motion.duration=0.;
            split_node.view_control.pane=Rect::new(pane.x,pane.y-content.y,pane.width,pane.height);
        }
        let full=Rect::new(0.,0.,width,height);
        for def in &contract().parts{rects.insert(def.name.clone(),full);}
        rects.insert("RootSplitView".into(),Rect::new(0.,content.y,width,height-content.y));
        rects.insert("PaneContentGrid".into(),Rect::new(pane.x,pane.y+4.,pane.width,(pane.height-8.).max(0.)));rects.insert("ContentGrid".into(),content);
        for key in ["TopNavArea","TopNavGrid"]{rects.insert(key.into(),Rect::new(0.,0.,width,48.+overlay[1]));}
        rects.insert("ContentPresenter".into(),body);
        rects.insert("HeaderContent".into(),Rect::new(body.x+56.,content.y+self.nodes[&id].nav.as_ref().unwrap().slot_metrics.border_width.unwrap()+44.,(body.width-56.).max(0.),header[1]));
        rects.insert("PaneHeaderContentBorder".into(),Rect::new(if p.is_pane_toggle_button_visible{40.}else{0.}+if close{40.}else{0.},toggle_y,(pane.width-if p.is_pane_toggle_button_visible{40.}else{0.}-if close{40.}else{0.}).max(0.),header_row));
        rects.insert("PaneAutoSuggestBoxPresenter".into(),Rect::new(16.,search_y,(pane.width-32.).max(0.),search[1].max(40.)));
        rects.insert("AutoSuggestArea".into(),Rect::new(0.,search_y,pane.width,self.nodes[&id].nav.as_ref().unwrap().slot_metrics.search_height));
        rects.insert("PaneCustomContentBorder".into(),Rect::new(0.,custom_y,pane.width,custom[1]));
        rects.insert("FooterContentBorder".into(),Rect::new(0.,footer_y,pane.width,footer[1]));
        rects.insert("MenuItemsHost".into(),menu);rects.insert("MenuItemsScrollViewer".into(),menu);
        let footer_start=footer_y+footer[1]+4.;
        let footer_rect=Rect::new(0.,footer_start,pane.width,(height-4.-footer_start).max(0.));
        rects.insert("FooterMenuItemsHost".into(),footer_rect);rects.insert("FooterItemsScrollViewer".into(),footer_rect);
        let footer_width=p.footer_items.iter().filter_map(|i|parts.iter().find(|r|r.id==i.id)).map(|r|r.rect.width+8.).sum::<f64>();
        let mut x=width-if p.is_settings_visible{44.}else{4.}-footer_width;
        x-=footer[0];rects.insert("PaneFooterOnTopPane".into(),Rect::new(x,0.,footer[0],48.));
        let search_width=if search[0]>0.{search[0].max(216.)}else{0.};
        x-=search_width+if search_width>0.{8.}else{0.};rects.insert("TopPaneAutoSuggestBoxPresenter".into(),Rect::new(x+if search_width>0.{4.}else{0.},0.,search_width,48.));
        let menu_end=parts.iter().filter(|part|part.rect.y<48.&&part.id!="$settings"&&!p.footer_items.iter().any(|i|i.id==part.id)).map(|part|part.rect.x+part.rect.width+if part.id=="$overflow"{0.}else{4.}).fold(4.,f64::max);
        let custom_width=(x-menu_end).max(custom[0]);
        rects.insert("PaneCustomContentOnTopPane".into(),Rect::new(x-custom_width,0.,custom_width,48.));
        let menu_start=4.+if p.back_button_visible(){40.}else{0.}+pane_header[0];
        let primary_end=parts.iter().filter(|part|part.rect.y<48.&&!part.id.starts_with('$')&&!p.footer_items.iter().any(|i|i.id==part.id)).map(|part|part.rect.x+part.rect.width+4.).fold(menu_start,f64::max);
        rects.insert("TopNavMenuItemsHost".into(),Rect::new(menu_start,0.,(primary_end-menu_start).max(0.),48.));
        rects.insert("TopFooterMenuItemsHost".into(),Rect::new(width-if p.is_settings_visible{44.}else{4.}-footer_width,0.,footer_width+if p.is_settings_visible{40.}else{0.},48.));
        rects.insert("ItemsContainerGrid".into(),Rect::new(0.,menu.y,pane.width,(height-menu.y-4.).max(0.)));
        for def in &contract().parts{if def.kind==NodeKind::ItemsRepeaterScrollHost{if let Some(child)=contract().parts.iter().find(|child|child.parent.as_deref()==Some(def.name.as_str())){if let Some(rect)=rects.get(&child.name).copied(){rects.insert(def.name.clone(),rect);}}}}

        rects.insert("PaneHeaderOnTopPane".into(),Rect::new(if p.back_button_visible(){48.}else{4.},0.,pane_header[0],48.));
        rects.insert("PaneTitleTextBlock".into(),Rect::new(48.+if close{40.}else{0.},toggle_y,(pane.width-60.-if close{40.}else{0.}).max(0.),40.));
        rects.insert("TopNavContentOverlayAreaGrid".into(),Rect::new(0.,48.,width,overlay[1]));
        for (name,action) in [("NavigationViewBackButton","$back"),("NavigationViewCloseButton","$close"),("TogglePaneButton","$toggle"),("TopNavOverflowButton","$overflow")]{if let Some(part)=parts.iter().find(|p|p.id==action){rects.insert(name.into(),part.rect);}}
        if let Some(r)=flyout {for key in ["TopNavOverflowFlyout","TopNavMenuItemsOverflowHost","ChildrenFlyout","ChildrenScrollViewer","ChildrenMenuItemsHost"]{rects.insert(key.into(),r);}}
        // Each source part is arranged in its parent's coordinates. Slot subtrees
        // run the normal Rust Measure/Arrange paths, including Frame and Page.
        // Row presenters arrange their item templates below; those same parts
        // do not also need to be arranged as full-size root-template grids.
        let root_part=|node:&Node|node.navigation_template.item_key.is_none()&&!node.navigation_template.name.starts_with("Presenter:");
        let mut ordered=self.nodes[&id].navigation_template.parts.values().copied().filter(|node|root_part(&self.nodes[node])).collect::<Vec<_>>();ordered.sort_unstable();ordered.dedup();
        for node in ordered{
            if self.nodes[&node].navigation_template.slot||self.nodes[&node].kind==NodeKind::ToolTip{continue;}
            let name=self.nodes[&node].navigation_template.name.clone();
            let global=rects.get(&name).copied().or_else(||self.nodes[&node].navigation_template.action.as_ref().and_then(|key|parts.iter().find(|p|&p.id==key).map(|p|p.rect))).unwrap_or(full);
            let parent=self.nodes[&node].parent.unwrap();
            let parent_name=&self.nodes[&parent].navigation_template.name;
            let pg=if parent==id{Rect::default()}else{rects.get(parent_name).copied().or_else(||self.nodes[&parent].navigation_template.action.as_ref().and_then(|key|parts.iter().find(|p|&p.id==key).map(|p|p.rect))).unwrap_or(full)};
            let local=Rect::new(global.x-pg.x,global.y-pg.y,global.width,global.height);
            let n=self.nodes.get_mut(&node).unwrap();n.rect=local;n.world=world.multiply(Matrix([1.,0.,0.,1.,global.x,global.y]));n.theme=theme;n.enabled=enabled;n.visible=visible;n.layout_version+=1;
            if name=="PaneContentGrid"{n.visible &= !top&&p.is_pane_visible&&pane.width>0.;}
            if name=="TopNavArea"{n.visible &= top&&p.is_pane_visible;}
            if name=="HeaderContent"{n.visible &= header_visible;}
            if name=="PaneHeaderContentBorder"{n.visible &= pane_open;}
            if name=="PaneAutoSuggestBoxPresenter"{n.visible &= pane_open;}
            if name=="PaneAutoSuggestButton"{n.visible &= !top&&!pane_open&&search[1]>0.;n.rect=Rect::new(4.-pg.x,search_y-pg.y,40.,40.);}
            if name=="ShadowCaster"||name.contains("Padding")||name=="VisualItemsSeparator"||name=="PaneTitleOnTopPane"{n.visible=false;}
            if name=="PaneTitleTextBlock"{n.props.text=p.pane_title.clone();n.props.font_weight=600;n.props.font_size=14.;n.visible &=pane_open&&!top&&!p.pane_title.is_empty();}
            if ["NavigationViewBackButton","NavigationViewCloseButton","TogglePaneButton","TopNavOverflowButton","PaneAutoSuggestButton"].contains(&name.as_str()){let action=match name.as_str(){"NavigationViewBackButton"=>"$back","NavigationViewCloseButton"=>"$close","TogglePaneButton"=>"$toggle","PaneAutoSuggestButton"=>"$search",_=>"$overflow"};n.navigation_template.action=Some(action.into());n.visible &=parts.iter().any(|p|p.id==action);n.enabled &=parts.iter().find(|p|p.id==action).is_some_and(|p|p.enabled);}
            if name=="ChildrenFlyout"{n.visible &=flyout.is_some()&&popup_owner.as_deref()!=Some("$overflow");}
            if name=="TopNavOverflowFlyout"{n.visible &=flyout.is_some()&&popup_owner.as_deref()==Some("$overflow");}
            if let Some(action)=&n.navigation_template.action {n.visible &=parts.iter().any(|p|&p.id==action);}
            n.props.visible=n.visible;n.props.enabled=n.enabled;
        }
        // Inactive source branches are excluded from paint/input/accessibility.
        for node in self.nodes[&id].navigation_template.parts.values().copied().filter(|node|root_part(&self.nodes[node])).collect::<Vec<_>>(){
            let mut at=self.nodes[&node].parent;let mut show=true;
            while let Some(parent)=at{if parent==id{break;}show &=self.nodes[&parent].visible;at=self.nodes[&parent].parent;}
            self.nodes.get_mut(&node).unwrap().visible &=show;
        }
        for (slot,node) in self.nodes[&id].navigation_template.slots.clone(){
            let parent=self.nodes[&node].parent.unwrap();let n=&self.nodes[&parent];
            let mut r=Rect::new(0.,0.,n.rect.width,n.rect.height);let(pw,show)=(n.world,n.visible);
            if slot=="AutoSuggestBox"{r.y=(r.height-search[1])/2.;r.height=search[1];}
            if slot=="Content"&&self.nodes[&id].navigation_template.content_measure_width.is_none_or(|width|(width-r.width).abs()>1e-7){
                // Nested fractional offsets can round the available slot by
                // one pixel. Keep Page's Measure constraint equal to Arrange.
                self.measure_node(node,[r.width,r.height],m);
                self.nodes.get_mut(&id).unwrap().navigation_template.content_measure_width=Some(r.width);
            }
            self.arrange_node(node,r,pw,(theme,enabled,show),m);
            if slot=="Content"&&overlay_pane { /* Dismiss is above the content tree in hit testing. */ }
        }
        if self.nodes[&id].navigation_template.focus_search&&pane_open {
            let slot=self.navigation_view_slot(id,"AutoSuggestBox").unwrap();
            if let Some(search)=self.nodes[&slot].children.first().copied(){if let Some(editor)=self.nodes[&search].composed.parts.get("InputBox").copied(){self.focus(Some(editor));self.nodes.get_mut(&id).unwrap().navigation_template.focus_search=false;}}
        }
        let title=self.nodes[&id].navigation_template.parts["PaneTitleTextBlock"];
        {let n=&self.nodes[&title];let(rect,world,show)=(n.rect,n.world,n.visible);self.measure_node(title,[rect.width,rect.height],m);let h=self.nodes[&title].desired[1];let parent=self.nodes[&title].parent.unwrap();let parent_world=self.nodes[&parent].world;self.arrange_node(title,Rect::new(rect.x,rect.y+(rect.height-h)/2.-1.,rect.width,h),parent_world,(theme,enabled,show),m);let _=world;}
        for row in self.nodes[&id].navigation_template.rows.values().copied().collect::<Vec<_>>(){
            let key=self.nodes[&row].navigation_template.action.clone().unwrap();
            if self.nodes[&id].navigation_template.row_parts.contains_key(&key){self.arrange_navigation_item_parts(id,row,&key,m);continue;}
            let presenter=self.nodes[&row].children[0];let row_node=&self.nodes[&row];let (r,w,show)=(Rect::new(0.,0.,row_node.rect.width,row_node.rect.height),row_node.world,row_node.visible);
            let n=self.nodes.get_mut(&presenter).unwrap();n.rect=r;n.world=w;n.theme=theme;n.visible=show;n.enabled=enabled;
            let children=n.children.clone();
            for child in children{self.measure_node(child,[r.width,r.height],m);let desired=self.nodes[&child].desired;let badge=self.nodes[&child].kind==NodeKind::InfoBadge;let x=if badge{(r.width-desired[0]-12.).max(0.)}else{if parts.iter().find(|p|p.id==self.nodes[&row].navigation_template.action.as_deref().unwrap_or("")).is_some_and(|p|!p.icon.is_empty()){40.}else{12.}};self.arrange_node(child,Rect::new(x,0.,if badge{desired[0]}else{(r.width-x-12.).max(0.)},r.height),w,(theme,enabled,show),m);}
        }
    }
    fn sync_navigation_rows(&mut self,id:u32)->Result<(),String>{
        let nav=self.nodes[&id].nav.as_ref().unwrap();let parts=nav.parts.clone();let p=nav.props.clone();let top=nav.is_top();let popup=nav.flyout_owner.clone();
        let keys=parts.iter().filter(|p|(!p.id.starts_with('$')||p.id=="$settings")&&p.clip.is_none_or(|r|p.rect.x+p.rect.width>r.x&&p.rect.x<r.x+r.width&&p.rect.y+p.rect.height>r.y&&p.rect.y<r.y+r.height)).map(|p|p.id.clone()).collect::<HashSet<_>>();
        for (key,row) in self.nodes[&id].navigation_template.rows.clone(){if !keys.contains(&key){
            self.nodes.get_mut(&id).unwrap().navigation_template.building=true;
            let removed=self.destroy(row);
            self.nodes.get_mut(&id).unwrap().navigation_template.building=false;
            let removed=removed?;
            self.nodes.get_mut(&id).unwrap().navigation_template.parts.retain(|_,node|!removed.contains(node));
            self.nodes.get_mut(&id).unwrap().navigation_template.row_parts.remove(&key);
            self.nodes.get_mut(&id).unwrap().navigation_template.row_data.remove(&key);
            self.nodes.get_mut(&id).unwrap().navigation_template.signatures.remove(&format!("Row:{key}"));
            self.nodes.get_mut(&id).unwrap().navigation_template.generated.retain(|_,node|!removed.contains(node));
            self.nodes.get_mut(&id).unwrap().navigation_template.rows.remove(&key);
        }}
        for part in parts.iter().filter(|p|keys.contains(&p.id)){
            let in_popup=self.nodes[&id].nav.as_ref().unwrap().flyout.is_some_and(|r|r.contains(part.rect.x+part.rect.width/2.,part.rect.y+part.rect.height/2.));
            let host=if in_popup{if popup.as_deref()==Some("$overflow"){"TopNavMenuItemsOverflowHost"}else{"ChildrenMenuItemsHost"}}else if p.footer_items.iter().any(|i|i.id==part.id)||part.id=="$settings"{if top{"TopFooterMenuItemsHost"}else{"FooterMenuItemsHost"}}else if top{"TopNavMenuItemsHost"}else{"MenuItemsHost"};
            let parent=self.nodes[&id].navigation_template.parts[host];
            let style=if in_popup{"Overflow"}else if top{"Top"}else{"Left"};
            if let Some(row)=self.nodes[&id].navigation_template.rows.get(&part.id).copied(){
                self.nav_reparent(row,parent);
                if part.kind==ItemKind::Item{self.sync_navigation_item_parts(id,row,part,style,&p)?;}
                continue;
            }
            let kind=match part.kind{ItemKind::Item=>NodeKind::NavigationViewItem,ItemKind::Header=>NodeKind::NavigationViewItemHeader,ItemKind::Separator=>NodeKind::NavigationViewItemSeparator};
            let row=self.nav_part(id,parent,kind,&format!("Item:{}",part.id),json!({"isTabStop":false,"clip":false}))?;
            self.nodes.get_mut(&row).unwrap().navigation_template.action=Some(part.id.clone());
            let presenter=self.nav_part(id,row,NodeKind::NavigationViewItemPresenter,&format!("Presenter:{}",part.id),json!({"isTabStop":false,"clip":false}))?;
            self.nodes.get_mut(&id).unwrap().navigation_template.rows.insert(part.id.clone(),row);
            if part.kind==ItemKind::Item{self.sync_navigation_item_parts(id,row,part,style,&p)?;}
            else{
                let style=if part.kind==ItemKind::Header{"Header"}else{"Separator"};let mut nodes=BTreeMap::new();
                for def in &contract().item_templates[style]{
                    let parent=def.parent.as_ref().map(|key|nodes[key]).unwrap_or(presenter);
                    let patch=if def.kind==NodeKind::TextBlock{json!({"text":part.text,"fontSize":14,"fontWeight":600,"wrap":false,"foreground":{"resource":"NavigationViewItemHeaderForeground"},"isTabStop":false})}else if def.kind==NodeKind::Rectangle{json!({"fill":{"resource":"NavigationViewItemSeparatorForeground"},"isTabStop":false})}else{json!({"isTabStop":false})};
                    let node=self.nav_part(id,parent,def.kind,&format!("ItemPart:{}/{}",part.id,def.name),patch)?;
                    let state=&mut self.nodes.get_mut(&node).unwrap().navigation_template;state.item_key=Some(part.id.clone());state.item_role=def.name.clone();nodes.insert(def.name.clone(),node);
                }
                self.nodes.get_mut(&id).unwrap().navigation_template.row_parts.insert(part.id.clone(),nodes);
            }
        }
        Ok(())
    }
    fn sync_navigation_item_parts(&mut self,owner:u32,row:u32,part:&crate::model::Part,style:&str,p:&crate::model::Properties)->Result<(),String>{
        let item=p.find(&part.id);
        let data_signature=serde_json::to_string(&(&part.text,&part.icon,item.map(|i|&i.tooltip),item.and_then(|i|i.animated_icon_source),item.and_then(|i|i.icon_source.as_ref()),item.and_then(|i|i.content_template.as_ref()).or(p.menu_item_template.as_ref()),item.and_then(|i|i.info_badge.as_ref()))).unwrap();
        let signature=format!("{style}:{data_signature}");
        let key=format!("Row:{}",part.id);
        if self.nodes[&owner].navigation_template.signatures.get(&key)==Some(&signature){return Ok(());}
        let presenter=self.nodes[&row].children[0];
        let preserve=self.nodes[&owner].navigation_template.row_data.get(&part.id)==Some(&data_signature);
        let keep_content=preserve||(owner==row&&part.text.is_empty()&&self.nodes[&owner].navigation_template.row_parts.contains_key(&part.id));
        let mut saved=BTreeMap::new();
        if preserve||keep_content {if let Some(old)=self.nodes[&owner].navigation_template.row_parts.get(&part.id).cloned(){for role in ["Icon","ContentPresenter","InfoBadgePresenter"]{if !preserve&&role!="ContentPresenter"{continue;}let children=self.nodes[&old[role]].children.clone();for child in &children{self.nav_reparent(*child,row);}saved.insert(role,children);}}}
        self.nodes.get_mut(&owner).unwrap().navigation_template.building=true;
        let result=(||{
            for old in self.nodes[&presenter].children.clone(){let removed=self.destroy(old)?;self.nodes.get_mut(&owner).unwrap().navigation_template.parts.retain(|_,id|!removed.contains(id));}
            let mut nodes=BTreeMap::new();
            for def in &contract().item_templates[style]{
                let parent=def.parent.as_ref().map(|name|nodes[name]).unwrap_or(presenter);
                let mut patch=json!({"isTabStop":false,"clip":false});
                if def.kind==NodeKind::ContentPresenter{patch["verticalContentAlignment"]=json!("Center");patch["horizontalContentAlignment"]=json!("Stretch");}
                if def.kind==NodeKind::Rectangle{patch["opacity"]=json!(0.);patch["fill"]=json!({"resource":"NavigationViewSelectionIndicatorForeground"});patch["radiusX"]=json!(2.);patch["radiusY"]=json!(2.);}
                if def.kind==NodeKind::AnimatedIcon{patch["source"]=json!("ChevronUpDownSmall");}
                let node=self.nav_part(owner,parent,def.kind,&format!("ItemPart:{}/{}",part.id,def.name),patch)?;
                let state=&mut self.nodes.get_mut(&node).unwrap().navigation_template;state.item_key=Some(part.id.clone());state.item_role=def.name.clone();
                nodes.insert(def.name.clone(),node);
            }
            let content=nodes["ContentPresenter"];
            if keep_content{for child in saved.remove("ContentPresenter").unwrap_or_default(){self.nav_reparent(child,content);}}
            else if let Some(template)=item.and_then(|i|i.content_template.as_ref()).or(p.menu_item_template.as_ref()){self.instantiate_content(content,template)?;}
            else if !part.text.is_empty(){let node=self.create(content,NodeKind::TextBlock,json!({"text":part.text,"fontSize":14,"wrap":false,"trimming":"CharacterEllipsis","verticalAlignment":"Center"}))?;self.own_navigation_decoration(node,owner,&part.id);}
            let icon=nodes["Icon"];
            if preserve{for child in saved.remove("Icon").unwrap_or_default(){self.nav_reparent(child,icon);}}
            else if let Some(source)=item.and_then(|i|i.animated_icon_source){let node=self.create(icon,NodeKind::AnimatedIcon,json!({"source":source,"width":16,"height":16}))?;self.own_navigation_decoration(node,owner,&part.id);}
            else if let Some(source)=item.and_then(|i|i.icon_source.as_ref()){let node=self.create(icon,NodeKind::IconSourceElement,json!({"iconSource":source,"width":16,"height":16}))?;self.own_navigation_decoration(node,owner,&part.id);}
            else if !part.icon.is_empty(){let node=self.create(icon,NodeKind::FontIcon,json!({"glyph":part.icon,"fontSize":16,"width":16,"height":16}))?;self.own_navigation_decoration(node,owner,&part.id);}
            if preserve{for child in saved.remove("InfoBadgePresenter").unwrap_or_default(){self.nav_reparent(child,nodes["InfoBadgePresenter"]);}}
            else if let Some(template)=item.and_then(|i|i.info_badge.as_ref()){self.instantiate_content(nodes["InfoBadgePresenter"],template)?;}
            let tip_key=format!("Tip:{}",part.id);
            if let Some(old)=self.nodes.get_mut(&owner).unwrap().navigation_template.generated.remove(&tip_key){if self.nodes.contains_key(&old){self.destroy(old)?;}}
            let tip=self.create(row,NodeKind::ToolTip,json!({"text":item.filter(|i|!i.tooltip.is_empty()).map_or(part.text.as_str(),|i|i.tooltip.as_str()),"placementTarget":row,"visible":false}))?;
            self.nodes.get_mut(&owner).unwrap().navigation_template.generated.insert(tip_key,tip);
            self.nodes.get_mut(&owner).unwrap().navigation_template.row_parts.insert(part.id.clone(),nodes);
            self.nodes.get_mut(&owner).unwrap().navigation_template.row_data.insert(part.id.clone(),data_signature);
            self.nodes.get_mut(&owner).unwrap().navigation_template.signatures.insert(key,signature);
            Ok::<_,String>(())
        })();
        self.nodes.get_mut(&owner).unwrap().navigation_template.building=false;result
    }
    fn own_navigation_decoration(&mut self,node:u32,owner:u32,key:&str){let state=&mut self.nodes.get_mut(&node).unwrap().navigation_template;state.owner=Some(owner);state.item_key=Some(key.into());}
    fn arrange_navigation_item_parts(&mut self,owner:u32,row:u32,key:&str,m:&mut impl TextMeasurer){
        let parts=self.nodes[&owner].navigation_template.row_parts[key].clone();
        let nav=self.nodes[&owner].nav.as_ref().or(self.nodes[&owner].navigation_template.standalone.as_deref()).unwrap();let Some(part)=nav.parts.iter().find(|p|p.id==key).cloned()else{return;};
        if part.kind!=ItemKind::Item{self.arrange_navigation_aux_parts(owner,row,&part,m);return;}
        let top=nav.is_top()&&part.rect.y<48.;let icon_only=(!nav.pane_open&&!nav.is_top())||(top&&key=="$settings");
        let explicit_tooltip=nav.props.find(key).is_some_and(|i|!i.tooltip.is_empty());
        let over=nav.hovered.as_deref().is_some_and(|id|id==key||id.strip_prefix("$expand:")==Some(key));let pressed=nav.pressed.as_deref()==Some(key);
        let fg=if !part.enabled{"NavigationViewItemForegroundDisabled"}else if pressed{"NavigationViewItemForegroundPressed"}else if over{"NavigationViewItemForegroundPointerOver"}else{"NavigationViewItemForeground"};
        let bg=if !part.enabled{if part.selected{"NavigationViewItemBackgroundSelectedDisabled"}else{"NavigationViewItemBackgroundDisabled"}}else if pressed{if part.selected{"NavigationViewItemBackgroundSelectedPressed"}else{"NavigationViewItemBackgroundPressed"}}else if over{if part.selected{"NavigationViewItemBackgroundSelectedPointerOver"}else{"NavigationViewItemBackgroundPointerOver"}}else if part.selected&&!top{"NavigationViewItemBackgroundSelected"}else{"NavigationViewItemBackground"};
        let chevron_state=nav.hierarchy_motion.chevrons.get(key).map(|p|p.snapshot(self.time).state).unwrap_or_else(||"NormalOff".into());
        {let n=self.nodes.get_mut(&row).unwrap();if owner!=row{n.rect.x-=4.;n.rect.y-=2.;n.rect.width+=8.;n.rect.height+=4.;n.world=n.world.multiply(Matrix([1.,0.,0.,1.,-4.,-2.]));}n.enabled &=part.enabled;n.props.enabled=n.enabled;n.props.is_selected=part.selected;n.props.text=part.text.clone();n.props.is_expanded=part.expanded.unwrap_or(false);}
        let (width,height,world,theme,enabled,visible)={let n=&self.nodes[&row];(n.rect.width,n.rect.height,n.world,n.theme,n.enabled&&part.enabled,n.visible)};
        let full=Rect::new(0.,0.,width,height);
        if let Some(tip)=self.nodes[&owner].navigation_template.generated.get(&format!("Tip:{key}")).copied(){self.nodes.get_mut(&tip).unwrap().props.visible=visible&&(explicit_tooltip||icon_only);}
        let layout=Rect::new(4.,(2.*self.dpr).round()/self.dpr,width-8.,height-4.);
        let has_icon=!self.nodes[&parts["Icon"]].children.is_empty();
        let content_x=if has_icon{if top{36.}else{44.+part.depth as f64*31.}}else{12.+part.depth as f64*31.};
        let badge=parts["InfoBadgePresenter"];let badge_size=self.measure_node(badge,[width,height],m);
        let badge_width=badge_size[0];let chevron=if part.expanded.is_some()&&!icon_only{40.}else{0.};
        let trailing=if top{12.}else{26.};
        let content=Rect::new(layout.x+content_x,layout.y,(layout.width-content_x-trailing-chevron-badge_width).max(0.),layout.height);
        let mut bounds=BTreeMap::new();for role in parts.keys(){bounds.insert(role.clone(),layout);}
        bounds.insert("ContentGrid".into(),Rect::new(layout.x,layout.y,(layout.width-if top{0.}else{14.}).max(0.),layout.height));
        bounds.insert("IconColumn".into(),Rect::new(layout.x,layout.y,40.,layout.height));
        bounds.insert("IconBox".into(),Rect::new(layout.x+12.+part.depth as f64*31.,layout.y+(layout.height-16.)/2.,16.,16.));
        bounds.insert("Icon".into(),bounds["IconBox"]);
        bounds.insert("ContentPresenter".into(),content);
        bounds.insert("InfoBadgePresenter".into(),Rect::new((width-trailing-chevron-badge_width).max(0.),(height-badge_size[1])/2.,badge_width,badge_size[1]));
        bounds.insert("ExpandCollapseChevron".into(),Rect::new((width-40.).max(0.),0.,40.,height));
        bounds.insert("ExpandCollapseChevronIcon".into(),Rect::new((width-26.).max(0.),(height-12.)/2.,12.,12.));
        bounds.insert("SelectionIndicator".into(),if top{Rect::new((width-16.)/2.,height-7.,16.,3.)}else{Rect::new(0.,(height-16.)/2.,3.,16.)});
        let presenter=self.nodes[&row].children[0];{let n=self.nodes.get_mut(&presenter).unwrap();n.rect=full;n.world=world;n.theme=theme;n.visible=visible;n.enabled=enabled;}
        let mut ordered=parts.values().copied().collect::<Vec<_>>();ordered.sort_unstable();
        for node in ordered{
            let role=self.nodes[&node].navigation_template.item_role.clone();let r=bounds[&role];
            let parent=self.nodes[&node].parent.unwrap();let pr=if parent==presenter{Rect::default()}else{bounds[&self.nodes[&parent].navigation_template.item_role]};
            let show=visible&&match role.as_str(){"ContentPresenter"=>!icon_only,"IconBox"|"IconColumn"|"Icon"=>has_icon,"ExpandCollapseChevron"|"ExpandCollapseChevronIcon"=>chevron>0.,"InfoBadgePresenter"=>badge_width>0.,"PointerRectangle"=>false,_=>true};
            let n=self.nodes.get_mut(&node).unwrap();n.rect=Rect::new(r.x-pr.x,r.y-pr.y,r.width,r.height);n.world=world.multiply(Matrix([1.,0.,0.,1.,r.x,r.y]));n.theme=theme;n.enabled=enabled;n.visible=show;n.props.visible=show;n.props.enabled=enabled;n.props.foreground=Some(BrushValue::Resource{resource:fg.into()});
            if role=="LayoutRoot"{n.props.background=Some(BrushValue::Resource{resource:bg.into()});n.props.corner_radius=4.;}
            if role=="ExpandCollapseChevronIcon"{n.props.animated_icon_state=chevron_state.clone();}
            if role=="Icon"{n.props.animated_icon_state=if pressed{"Pressed"}else if over{"PointerOver"}else{"Normal"}.into();}
        }
        for role in ["Icon","ContentPresenter","InfoBadgePresenter"]{
            let host=parts[role];let n=&self.nodes[&host];let r=Rect::new(0.,0.,n.rect.width,n.rect.height);
            self.measure_node(host,[r.width,r.height],m);self.arrange_content_host(host,r,m);
        }
    }
    /// Pointer/selection visual states change brushes and icon state without
    /// remeasuring the source template or its Frame/Page content.
    pub(super) fn sync_navigation_item_visuals(&mut self){
        let owners=self.nodes.values().filter(|n|n.nav.is_some()).map(|n|n.id).collect::<Vec<_>>();
        for owner in owners{
            let nav=self.nodes[&owner].nav.as_ref().unwrap();
            let mut changes=Vec::new();
            let mut selection=Vec::new();
            for (key,parts) in &self.nodes[&owner].navigation_template.row_parts{
                let Some(part)=nav.parts.iter().find(|p|&p.id==key&&p.kind==ItemKind::Item)else{continue};
                if let Some(row)=self.nodes[&owner].navigation_template.rows.get(key){selection.push((*row,part.selected));}
                let top=nav.is_top()&&part.rect.y<48.;
                let over=nav.hovered.as_deref().is_some_and(|id|id==key||id.strip_prefix("$expand:")==Some(key));
                let pressed=nav.pressed.as_deref()==Some(key);
                let fg=if !part.enabled{"NavigationViewItemForegroundDisabled"}else if pressed{"NavigationViewItemForegroundPressed"}else if over{"NavigationViewItemForegroundPointerOver"}else{"NavigationViewItemForeground"};
                let bg=if !part.enabled{if part.selected{"NavigationViewItemBackgroundSelectedDisabled"}else{"NavigationViewItemBackgroundDisabled"}}else if pressed{if part.selected{"NavigationViewItemBackgroundSelectedPressed"}else{"NavigationViewItemBackgroundPressed"}}else if over{if part.selected{"NavigationViewItemBackgroundSelectedPointerOver"}else{"NavigationViewItemBackgroundPointerOver"}}else if part.selected&&!top{"NavigationViewItemBackgroundSelected"}else{"NavigationViewItemBackground"};
                for (role,node) in parts{changes.push((*node,fg,(role=="LayoutRoot").then_some(bg),if role=="Icon"{Some(if pressed{"Pressed"}else if over{"PointerOver"}else{"Normal"})}else{None}));}
            }
            for (row,selected) in selection{self.nodes.get_mut(&row).unwrap().props.is_selected=selected;}
            for (node,fg,bg,icon) in changes{let p=&mut self.nodes.get_mut(&node).unwrap().props;
                if !matches!(&p.foreground,Some(BrushValue::Resource{resource}) if resource==fg){p.foreground=Some(BrushValue::Resource{resource:fg.into()});}
                if let Some(bg)=bg{if !matches!(&p.background,Some(BrushValue::Resource{resource}) if resource==bg){p.background=Some(BrushValue::Resource{resource:bg.into()});}}
                if let Some(icon)=icon{if p.animated_icon_state!=icon{p.animated_icon_state=icon.into();}}
            }
        }
    }
    fn arrange_navigation_aux_parts(&mut self,owner:u32,row:u32,part:&crate::model::Part,m:&mut impl TextMeasurer){
        let top=self.nodes[&owner].nav.as_ref().unwrap().is_top()&&part.rect.y<48.;
        {let n=self.nodes.get_mut(&row).unwrap();n.rect.x-=4.;n.rect.y-=2.;n.rect.width+=8.;n.rect.height+=4.;n.world=n.world.multiply(Matrix([1.,0.,0.,1.,-4.,-2.]));}
        let n=&self.nodes[&row];let(w,h,world,theme,visible)=(n.rect.width,n.rect.height,n.world,n.theme,n.visible);let presenter=n.children[0];
        {let n=self.nodes.get_mut(&presenter).unwrap();n.rect=Rect::new(0.,0.,w,h);n.world=world;n.visible=visible;n.theme=theme;}
        let parts=self.nodes[&owner].navigation_template.row_parts[&part.id].clone();let mut bounds=BTreeMap::new();
        let margin=if top{12.}else{16.};
        for role in parts.keys(){bounds.insert(role.clone(),match role.as_str(){"InnerHeaderGrid"=>Rect::new(margin,0.,(w-margin*2.).max(0.),h),"HeaderText"=>{let node=parts[role];self.measure_node(node,[w,h],m);let dh=self.nodes[&node].desired[1];Rect::new(margin,(h-dh)/2.,(w-margin*2.).max(0.),dh)},"SeparatorLine"=>if top{Rect::new(3.,(h-24.)/2.,1.,24.)}else{Rect::new(0.,3.,w,1.)},_=>Rect::new(0.,0.,w,h)});}
        for (&ref role,&node) in &parts {let r=bounds[role];let parent=self.nodes[&node].parent.unwrap();let pr=if parent==presenter{Rect::default()}else{bounds[&self.nodes[&parent].navigation_template.item_role]};let n=self.nodes.get_mut(&node).unwrap();n.rect=Rect::new(r.x-pr.x,r.y-pr.y,r.width,r.height);n.world=world.multiply(Matrix([1.,0.,0.,1.,r.x,r.y]));n.theme=theme;n.visible=visible;n.props.visible=visible;if role=="HeaderText"{n.props.text=part.text.clone();}}
    }
    /// Template hit regions participate in the same scene as page controls.
    pub(super) fn navigation_hit_owner(&self,id:u32)->u32{
        let n=&self.nodes[&id];if n.navigation_template.action.is_some(){n.navigation_template.owner.unwrap_or(id)}else{id}
    }
    pub(super) fn navigation_blocks_content(&self,id:u32,x:f64,y:f64)->bool{
        let n=&self.nodes[&id];let Some(nav)=&n.nav else{return false};let (x,y)=n.world.inverse().unwrap_or_default().point(x,y);
        nav.parts.iter().any(|p|p.id=="$dismiss"&&p.rect.contains(x,y))&&!nav.pane.contains(x,y)
    }
    /// Internal source parts paint in Rust. User slot content takes the normal
    /// control renderer, so editors, Page and Frame remain real shared controls.
    pub(super) fn paint_navigation_template(&mut self,id:u32,inherited:Option<String>,out:&mut Vec<Draw>)->bool{
        if self.nodes[&id].kind==NodeKind::ToolTip{return false;}
        if self.nodes[&id].kind==NodeKind::NavigationViewItem&&self.nodes[&id].navigation_template.owner.is_none(){
            let n=&self.nodes[&id];if !n.visible||n.rect.width<=0.||n.rect.height<=0.{return true;}
            let rect=n.rect;let children=self.ordered_children(id).into_iter().filter(|child|self.nodes[child].kind!=NodeKind::ToolTip).collect::<Vec<_>>();out.push(Draw::Save);out.push(Draw::Transform{matrix:[1.,0.,0.,1.,rect.x,rect.y]});
            for child in children{self.paint_node(child,inherited.clone(),out);}out.push(Draw::Restore);return true;
        }
        let n=&self.nodes[&id];let root=n.kind==NodeKind::NavigationView;
        let Some(owner)=root.then_some(id).or(n.navigation_template.owner)else{return false};
        if n.navigation_template.slot||n.navigation_template.item_key.is_some(){return false;}
        let name=n.navigation_template.name.clone();
        if !root&&matches!(n.kind,NodeKind::ContentControl|NodeKind::ContentPresenter|NodeKind::TextBlock|NodeKind::Border)&&!name.starts_with("Item:"){return false;}
        if !n.visible||n.rect.width<=0.||n.rect.height<=0.{return true;}
        let rect=n.rect;let children=self.ordered_children(id).into_iter().filter(|child|self.nodes[child].kind!=NodeKind::ToolTip).collect::<Vec<_>>();let action=n.navigation_template.action.clone();
        out.push(Draw::Save);out.push(Draw::Transform{matrix:[1.,0.,0.,1.,rect.x,rect.y]});
        if root{out.push(Draw::Clip{rect:Rect::new(0.,0.,rect.width,rect.height)});out.extend(crate::render::navigation_layer(self.nodes[&id].nav.as_ref().unwrap(),false,NavigationLayer::Background));}
        let layer=match name.as_str(){"PaneContentGrid"=>Some(NavigationLayer::Pane),"TopNavOverflowFlyout"|"ChildrenFlyout"=>Some(NavigationLayer::Flyout),_=>None};
        if let Some(layer)=layer{let nav=self.nodes[&owner].nav.as_ref().unwrap();let (x,y)=nav_relative(self,owner,id);out.push(Draw::Save);out.push(Draw::Transform{matrix:[1.,0.,0.,1.,-x,-y]});out.extend(crate::render::navigation_layer(nav,false,layer));out.push(Draw::Restore);}
        if let Some(action)=action.filter(|_|!name.starts_with("Item:")){
            let (x,y)=nav_relative(self,owner,id);out.push(Draw::Save);out.push(Draw::Transform{matrix:[1.,0.,0.,1.,-x,-y]});out.extend(crate::render::navigation_layer(self.nodes[&owner].nav.as_ref().unwrap(),false,NavigationLayer::Item(&action)));out.push(Draw::Restore);
        }
        if name.starts_with("Presenter:")&&!self.nodes[&owner].navigation_template.row_parts.contains_key(&name[10..]){
            let key=&name[10..];let (x,y)=nav_relative(self,owner,id);out.push(Draw::Save);out.push(Draw::Transform{matrix:[1.,0.,0.,1.,-x,-y]});out.extend(crate::render::navigation_layer(self.nodes[&owner].nav.as_ref().unwrap(),false,NavigationLayer::Item(key)));out.push(Draw::Restore);
        }
        let mut children=children;
        if name=="RootGrid"{children.sort_by_key(|c|if self.nodes[c].navigation_template.name=="PaneToggleButtonGrid"{100}else{0});}
        if name=="RootSplitView"{let nav=self.nodes[&owner].nav.as_ref().unwrap();children.sort_by_key(|c|{let pane=self.nodes[c].navigation_template.name=="PaneContentGrid";if nav.pane_overlay_visible()==pane{1}else{0}});}
        if name=="RootSplitView"{out.extend(crate::render::navigation_layer(self.nodes[&owner].nav.as_ref().unwrap(),false,NavigationLayer::Dismiss));}
        for child in children{self.paint_node(child,inherited.clone(),out);}
        if root{
            let nav=self.nodes[&id].nav.as_ref().unwrap();let visuals=nav.indicator_visual_clips();let selected=nav.selected.clone();let accent=nav.props.accent.clone();
            let indicator=selected.as_ref().and_then(|key|self.nodes[&id].navigation_template.row_parts.get(key)).and_then(|parts|parts.get("SelectionIndicator")).copied();
            if let Some(indicator)=indicator {for (visual,clip) in visuals{
                if let Some(rect)=clip{out.push(Draw::Clip{rect});}
                let n=self.nodes.get_mut(&indicator).unwrap();let old=(n.rect,n.presentation.opacity,n.props.fill.clone());n.rect=visual.rect;n.presentation.opacity=visual.opacity;
                if accent!="#005fb8"{n.props.fill=Some(BrushValue::Color(accent.clone()));}
                self.paint_node(indicator,inherited.clone(),out);
                let n=self.nodes.get_mut(&indicator).unwrap();n.rect=old.0;n.presentation.opacity=old.1;n.props.fill=old.2;
                if clip.is_some(){out.push(Draw::Restore);}
            }}
            let nav=self.nodes[&id].nav.as_ref().unwrap();nav.menu_scrollbar.paint(nav.props.theme,nav.props.reduced_transparency||!nav.backdrop_available(),nav.now,out);
            // Source Flyouts are logical children of the overflow button, but
            // paint in a popup layer above the content rather than in that
            // button's regular child collection (which excludes overlays).
            for name in ["TopNavOverflowFlyout","ChildrenFlyout"] {
                let popup=self.nodes[&id].navigation_template.parts[name];
                if !self.nodes[&popup].visible {continue;}
                let parent=self.nodes[&popup].parent.unwrap();
                let (x,y)=nav_relative(self,id,parent);
                out.push(Draw::Save);out.push(Draw::Transform{matrix:[1.,0.,0.,1.,x,y]});
                self.paint_node(popup,inherited.clone(),out);out.push(Draw::Restore);
            }
            out.push(Draw::Restore);
        }
        out.push(Draw::Restore);true
    }
}
fn nav_relative(scene:&Scene,owner:u32,id:u32)->(f64,f64){let nav=&scene.nodes[&owner];let n=&scene.nodes[&id];let p=nav.world.inverse().unwrap_or_default().multiply(n.world);(p.0[4],p.0[5])}
pub(super) fn legacy_content(n:&crate::content::ContentNode)->content_hosts::TemplateNode{
    content_hosts::TemplateNode{kind:match n.kind{ContentKind::Grid=>NodeKind::Grid,ContentKind::StackPanel=>NodeKind::StackPanel,ContentKind::TextBlock=>NodeKind::TextBlock,ContentKind::Ellipse=>NodeKind::Ellipse,ContentKind::ScrollViewer=>NodeKind::ScrollViewer},name:String::new(),properties:json!({"text":n.text,"fontSize":n.font_size,"fontWeight":n.font_weight,"wrap":n.wrap,"opticalMarginAlignment":if n.trim_side_bearings{"TrimSideBearings"}else{"None"},"margin":n.margin,"width":n.width,"height":n.height,"minWidth":n.min_width,"minHeight":n.min_height,"fill":n.fill.as_deref().map(crate::content::brush),"background":if matches!(n.kind,ContentKind::Grid|ContentKind::StackPanel){n.fill.as_deref().map(crate::content::brush)}else{None},"row":n.row,"column":n.column,"rowSpan":n.row_span,"columnSpan":n.column_span,"rows":n.rows,"columns":n.columns,"horizontalAlignment":n.horizontal_alignment,"verticalAlignment":n.vertical_alignment,"orientation":n.orientation,"spacing":n.spacing}),children:n.children.iter().map(legacy_content).collect()}
}
