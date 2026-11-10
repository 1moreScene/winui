//! Logical layout and raster allocation are independent, as in a XAML visual.
use super::*;
impl Scene {
    pub fn property_revision(&self)->u64 {self.revision}
    pub fn has_composition_animation(&self)->bool {!self.animations.is_empty()||self.nodes.values().any(|n|n.effects.active(self.time))}
    pub fn surface_bounds(&self)->Rect {
        let base=Rect::new(0.,0.,self.width,self.raster_height());
        if self.nodes[&self.root].props.clip{return base;}
        let (mut l,mut t,mut r,mut b)=(0_f64,0_f64,base.width,base.height);
        for n in self.nodes.values().filter(|n|n.visible&&!overlays::is_overlay(n.kind)) {
            let mut rect=n.world.bounds(Rect::new(0.,0.,n.rect.width,n.rect.height));
            if let Some(z)=n.props.shadow_depth.or_else(||(n.props.theme_shadow||n.effects.casts_shadow()).then_some(n.presentation.translation_z+n.effects.depth(self.time))) {
                for draw in super::overlay_visual::shadow_at_depth(z,n.theme,n.rect.width,n.rect.height,n.props.corner_radius) {
                    if let crate::render::Draw::Shadow{rect:s,..}=draw {let s=n.world.bounds(s);let x=rect.x.min(s.x);let y=rect.y.min(s.y);rect=Rect::new(x,y,(rect.x+rect.width).max(s.x+s.width)-x,(rect.y+rect.height).max(s.y+s.height)-y);}
                }
            }
            if rect.x>=l&&rect.y>=t&&rect.x+rect.width<=r&&rect.y+rect.height<=b{continue;}
            let mut at=n.parent;
            while let Some(id)=at {
                let parent=&self.nodes[&id];
                if parent.props.clip||collections::is_scroll_owner(parent.kind)||(parent.kind==NodeKind::Border&&parent.props.corner_radius>0.)||parent.viewbox.clip.is_some(){
                    let c=parent.world.bounds(parent.viewbox.clip.unwrap_or(Rect::new(0.,0.,parent.rect.width,parent.rect.height)));
                    let x=rect.x.max(c.x);let y=rect.y.max(c.y);rect=Rect::new(x,y,((rect.x+rect.width).min(c.x+c.width)-x).max(0.),((rect.y+rect.height).min(c.y+c.height)-y).max(0.));
                }
                at=parent.parent;
            }
            if rect.width>0.&&rect.height>0. {l=l.min(rect.x);t=t.min(rect.y);r=r.max(rect.x+rect.width);b=b.max(rect.y+rect.height);}
        }
        let down=|v:f64|(v*self.dpr).floor()/self.dpr;let up=|v:f64|(v*self.dpr).ceil()/self.dpr;
        Rect::new(down(l),down(t),up(r)-down(l),up(b)-down(t))
    }
}
