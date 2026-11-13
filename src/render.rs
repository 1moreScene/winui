use crate::{model::*, navigation::NavigationView};
use serde::Serialize;
mod retained;
pub use retained::{expand_retained, contains_external_image};

pub fn command_count(commands:&[Draw],limit:usize)->usize {
    let mut stack=vec![(commands,0)];let mut count=0;
    while let Some((commands,depth))=stack.pop(){if depth>8{return limit+1;}for command in commands{count+=1;if count>limit{return count;}match command{Draw::CrossFade{source,target,..}=>{stack.push((source,depth+1));stack.push((target,depth+1));},Draw::RetainedGroup{commands,..}=>stack.push((commands,depth+1)),_=>{}}}}count
}
/// Backend-independent display list shared by Canvas2D and the Rust WebGL2 executor.
#[derive(Clone, Debug, Serialize, PartialEq)]
#[serde(tag = "op", rename_all = "camelCase")]
pub enum Draw {
    /// Retained visual content. Its raster transform excludes compositor-only
    /// scrolling/entrance motion; other backends may execute commands directly.
    RetainedGroup { bounds:Rect, raster:[f64;6], commands:std::sync::Arc<Vec<Draw>> },
    /// Physical-pixel phase of the next glyph run before compositor motion.
    TextRasterPhase {
        phase: [f64; 2],
    },
    /// Hollow, source-recipe drop shadow; bounds include the blur allocation.
    Shadow {
        rect: Rect,
        caster: Rect,
        radius: f64,
        blur: f64,
        offset_y: f64,
        opacity: f64,
    },
    Save,
    Transform {
        matrix: [f64; 6],
    },
    Layer {
        opacity: f64,
    },
    /// A popup window starts a new in-app Backdrop sampling surface. Desktop
    /// HostBackdrop still samples the windows underneath it.
    WindowLayer {
        opacity: f64,
        /// Inherit the parent window's underlying backdrop, excluding its
        /// shadow/content surface (used by restored ComboBox in-app Acrylic).
        inherit_backdrop: bool,
    },
    /// Small vector group. Canvas samples geometry above display resolution;
    /// text remains outside the group and keeps its native-DPR rasterization.
    VectorLayer {
        bounds: Rect,
    },
    EndLayer,
    /// Premultiplied RGBA interpolation, composited onto the parent exactly once.
    CrossFade { rect:Rect, progress:f64, source:std::sync::Arc<Vec<Draw>>, source_scale:[f64;2], target:std::sync::Arc<Vec<Draw>> },
    Gradient {
        rect: Rect,
        radius: f64,
        width: f64,
        brush: Box<crate::resources::Brush>,
    },
    Image {
        rect: Rect,
        source: String,
    },
    /// Rust-generated pixel content. Slots replace prior revisions and are
    /// retained only while referenced by the current display list.
    Raster {
        rect: Rect,
        slot: u64,
        revision: u64,
        width: u32,
        height: u32,
        #[serde(skip_serializing)]
        rgba: std::sync::Arc<Vec<u8>>,
    },
    TintedImage {
        rect: Rect,
        source: String,
        color: String,
    },
    VectorPath {
        rect: Rect,
        geometry: crate::icons::PathGeometry,
        color: String,
    },
    PathBrush {
        rect: Rect,
        geometry: crate::icons::PathGeometry,
        brush: Box<crate::resources::Brush>,
    },
    Ellipse {
        rect: Rect,
        color: String,
    },
    /// Circular stroke with round caps. Transforms also scale the stroke/caps.
    Arc {
        center: [f64; 2],
        radius: f64,
        start: f64,
        end: f64,
        color: String,
        width: f64,
    },
    /// Open path with round caps and joins; Rust supplies the vector geometry.
    Polyline {
        points: Vec<[f64; 2]>,
        color: String,
        width: f64,
    },
    ContentBackground {
        rect: Rect,
        color: String,
        border: String,
        top_left_radius: f64,
    },
    Acrylic {
        rect: Rect,
        recipe: crate::material::AcrylicOptions,
        colors: Option<crate::material::AcrylicColors>,
        weight: f64,
    },
    /// System HostBackdrop adaptation: physical-pixel blur, no texture noise.
    SystemBackdrop {
        rect: Rect,
        recipe: crate::material::AcrylicOptions,
        colors: Option<crate::material::AcrylicColors>,
        weight: f64,
    },
    Fill {
        rect: Rect,
        color: String,
        radius: f64,
    },
    Stroke {
        rect: Rect,
        color: String,
        radius: f64,
        width: f64,
    },
    /// Border geometry keeps an elliptical inner edge for unequal side widths.
    Border {
        rect: Rect,
        thickness: [f64; 4],
        radius: [f64; 4],
        color: String,
        background: Option<String>,
    },
    Text {
        style: crate::enums::FontStyle,
        x: f64,
        y: f64,
        text: String,
        color: String,
        size: f64,
        font: String,
        max_width: f64,
        weight: u16,
    },
    Clip {
        rect: Rect,
    },
    RoundedClip {
        rect: Rect,
        radius: f64,
    },
    CornerClip {
        rect: Rect,
        radii: [[f64; 2]; 4],
    },
    Restore,
}
struct Palette<'a> {
    pane: &'static str,
    content: &'a str,
    text: &'a str,
    secondary: &'a str,
    disabled: &'a str,
    hover: &'a str,
    pressed: &'a str,
    border: &'a str,
}
impl Palette<'static> {
    fn new(theme: Theme) -> Self {
        let r = crate::resources::Resources::current();
        Self {
            pane: match theme {
                Theme::Light => "#f3f3f3",
                Theme::Dark => "#202020",
                Theme::HighContrast => "#000000",
            },
            content: r.color(theme, "NavigationViewContentBackground"),
            text: r.color(theme, "NavigationViewItemForeground"),
            secondary: r.color(theme, "TextFillColorSecondaryBrush"),
            disabled: r.color(theme, "TextFillColorDisabledBrush"),
            hover: r.color(theme, "NavigationViewItemBackgroundPointerOver"),
            pressed: r.color(theme, "NavigationViewItemBackgroundPressed"),
            border: r.color(theme, "NavigationViewContentGridBorderBrush"),
        }
    }
}
fn fill(out: &mut Vec<Draw>, rect: Rect, color: &str, radius: f64) {
    out.push(Draw::Fill {
        rect,
        color: color.into(),
        radius,
    });
}
fn text(out: &mut Vec<Draw>, x: f64, y: f64, value: &str, color: &str, size: f64, width: f64) {
    out.push(Draw::Text {
        style: Default::default(),
        x,
        y,
        text: value.into(),
        color: color.into(),
        size,
        font: "Segoe UI, system-ui, sans-serif".into(),
        max_width: width.max(0.),
        weight: if size >= 28. { 600 } else { 400 },
    });
}

pub fn display_list(nav: &NavigationView) -> Vec<Draw> {
    navigation_display_list(nav,true)
}
/// A shared scene already painted the app backdrop. Expanded/Top pane resources
/// are transparent in native WinUI; do not cover that backdrop with a fake gray.
#[derive(Clone, Copy, PartialEq)]
pub(crate) enum NavigationLayer<'a> { All, Background, Pane, Dismiss, Flyout, Item(&'a str) }
pub(crate) fn navigation_display_list(nav:&NavigationView,standalone_background:bool)->Vec<Draw>{
    navigation_layer(nav,standalone_background,NavigationLayer::All)
}
pub(crate) fn navigation_layer(nav:&NavigationView,standalone_background:bool,layer:NavigationLayer<'_>)->Vec<Draw>{
    let p = Palette::new(nav.props.theme);
    let mut out = vec![];
    if matches!(layer,NavigationLayer::All|NavigationLayer::Background) {
    fill(
        &mut out,
        Rect::new(0., 0., nav.width, nav.height),
        if !nav.props.has_external_content && (standalone_background||nav.props.theme==Theme::HighContrast){p.pane}else{"#00000000"},
        0.,
    );
    }
    if !nav.props.has_external_content && matches!(layer,NavigationLayer::All|NavigationLayer::Background) {
    out.push(Draw::ContentBackground {
        rect: nav.content,
        color: p.content.into(),
        border: p.border.into(),
        top_left_radius: if nav.is_top() || nav.display_mode == DisplayMode::Minimal {
            0.
        } else {
            8.
        },
    });
    }
    if !nav.props.has_external_content && layer==NavigationLayer::All {
    out.push(Draw::Clip { rect: nav.content });
    let border = if nav.is_top() || nav.display_mode == DisplayMode::Minimal {
        0.
    } else {
        1.
    };
    let left = nav.content.x + border + nav.template.header_margin[0];
    let mut y = nav.content.y;
    if nav.props.header.is_some()
        && (nav.props.always_show_header
            || (!nav.is_top() && nav.display_mode == DisplayMode::Minimal))
    {
        text(
            &mut out,
            left,
            y + 76.,
            nav.props.header.as_deref().unwrap_or_default(),
            p.text,
            nav.template.header_font_size,
            nav.content.width - nav.template.header_margin[0],
        );
        y += 83.;
    }
    if let Some(content) = &nav.props.content_node {
        crate::content::paint(
            content,
            nav.content_body(),
            nav.props.theme,
            &|text, size, weight| nav.measure_content(text, size, weight),
            &mut out,
            nav.content_scroll,
        );
    } else {
        for line in nav.props.content.as_deref().unwrap_or_default().lines() {
            text(
                &mut out,
                nav.content.x + border,
                y + 15.,
                line,
                p.text,
                14.,
                nav.content.width - 48.,
            );
            y += 22.;
        }
    }
    out.push(Draw::Restore);
    nav.content_scrollbar.paint(nav.props.theme,nav.props.reduced_transparency||!nav.backdrop_available(),nav.now,&mut out);
    }
    if let Some(layer) = nav.light_dismiss_visual().filter(|v| matches!(layer,NavigationLayer::All|NavigationLayer::Dismiss) && v.color != "#00000000" && v.opacity > 0.) {
        out.push(Draw::Layer { opacity: layer.opacity });
        fill(&mut out, layer.rect, &layer.color, 0.);
        out.push(Draw::EndLayer);
    }
    // CompactOverlay/Overlay panes sample the already-painted content backdrop.
    if matches!(layer,NavigationLayer::All|NavigationLayer::Pane) && nav.props.is_pane_visible && !nav.is_top() && nav.pane.width > 0. {
        let pane_start = out.len();
        let overlay = nav.pane_overlay_visible();
        let recipe = nav.pane_recipe();
        if let Some(recipe) = recipe {
            let colors=nav.pane_colors();
            let weight = if nav.backdrop_available() { nav.material_motion.value(nav.now) } else { 0. };
            if weight <= 0.001 || nav.props.theme == Theme::HighContrast {
                fill(
                    &mut out,
                    nav.pane,
                    if nav.props.theme == Theme::HighContrast {
                        p.pane
                    } else {
                        colors.as_ref().map_or(recipe.fallback_color.as_str(),|c|c.fallback.as_str())
                    },
                    0.,
                );
            } else {
                // SplitView keeps PaneRoot at OpenPaneLength and animates its
                // rectangle clip. A changing Acrylic surface would invalidate
                // the backdrop blur cache on every pane-animation sample.
                out.push(Draw::Clip { rect: nav.pane });
                out.push(Draw::Acrylic {
                    rect: Rect::new(nav.pane.x, nav.pane.y,
                        nav.props.open_pane_length.min(nav.width), nav.pane.height),
                    colors,
                    recipe,
                    weight,
                });
                out.push(Draw::Restore);
            }
        } else {
            fill(&mut out, nav.pane, if nav.props.theme == Theme::HighContrast { p.pane } else { crate::resources::Resources::current().color(nav.props.theme,"NavigationViewExpandedPaneBackground") }, 0.);
        }
        if overlay {
            // Draw after the backdrop sample: the moving shadow must not feed
            // back into the fixed pane's Acrylic surface.
            fill(&mut out, Rect::new(nav.pane.width, 0., 6., nav.height), "#00000018", 0.);
        }
        if layer==NavigationLayer::All && nav.pane_open && !nav.props.pane_title.is_empty() {
            text(
                &mut out,
                52. + if nav.props.back_button_visible() {
                    40.
                } else {
                    0.
                },
                25.,
                &nav.props.pane_title,
                p.text,
                14.,
                nav.pane.width - 64.,
            );
        }
        if layer==NavigationLayer::All && !overlay {
            // Inline/closed-compact Pane is behind Content in SplitView's tree;
            // sampling later content would leak tile colors into the pane blur.
            let pane_commands = out.split_off(pane_start);
            out.splice(1..1, pane_commands);
        }
    }
    if let Some(r) = nav.flyout.filter(|_|matches!(layer,NavigationLayer::All|NavigationLayer::Flyout)) {
        fill(
            &mut out,
            Rect::new(r.x + 2., r.y + 3., r.width, r.height),
            "#00000022",
            8.,
        );
        fill(&mut out, r, p.pane, 8.);
        out.push(Draw::Stroke {
            rect: r,
            color: p.border.into(),
            radius: 8.,
            width: 1.,
        });
    }
    for part in &nav.parts {
        if !matches!(layer,NavigationLayer::All) && !matches!(layer,NavigationLayer::Item(id) if id==part.id) { continue; }
        if part.id == "$dismiss" || part.id.starts_with("$expand:") {
            continue;
        }
        let r = part.rect;
        let icon_only =
            (!nav.pane_open && !nav.is_top()) || (part.id == "$settings" && nav.is_top());
        if let Some(clip) = part.clip {
            out.push(Draw::Clip { rect: clip });
        }
        out.push(Draw::Clip { rect: r });
        if part.kind == ItemKind::Separator {
            fill(
                &mut out,
                Rect::new(r.x + 12., r.y + 1., r.width - 24., 1.),
                p.border,
                0.,
            );
        } else if part.kind == ItemKind::Header {
            if !icon_only {
                text(
                    &mut out,
                    r.x + 12.,
                    r.y + 23.,
                    &part.text,
                    p.secondary,
                    14.,
                    r.width - 24.,
                );
            }
        } else {
            let over = nav.hovered.as_deref().is_some_and(|id|id==part.id||id.strip_prefix("$expand:")==Some(part.id.as_str()));
            let pressed = nav.pressed.as_ref() == Some(&part.id);
            let selected = part.selected && !nav.is_top();
            let bg = if pressed && selected {
                Some(p.hover)
            } else if pressed || (selected && over) {
                Some(p.pressed)
            } else if over || selected {
                Some(p.hover)
            } else {
                None
            };
            if let Some(bg) = bg {
                fill(&mut out, r, bg, 4.);
            }
            let color = if !part.enabled {
                p.disabled
            } else if nav.props.theme == Theme::HighContrast && (over || selected) {
                "#000000"
            } else if pressed {
                p.secondary
            } else {
                p.text
            };
            let center_y = r.y + r.height / 2.;
            let animated = nav.animated_icons.get(&part.id);
            if let Some((source, player)) = animated {
                let size = crate::animated_icon::size(*source);
                if size[0] > 0. && size[1] > 0. {
                    let scale = 16. / size[0].max(size[1]);
                    let x = r.x
                        + if nav.is_top() && r.y < 48. {
                            12.
                        } else {
                            12. + part.depth as f64 * 31.
                        };
                    out.push(Draw::Save);
                    out.push(Draw::Transform {
                        matrix: [scale, 0., 0., scale, x, center_y - 8.],
                    });
                    crate::animated_icon::draw(*source, player.progress(nav.now), color, &mut out);
                    out.push(Draw::Restore);
                }
            } else if !(part.icon.is_empty() && animated.is_none()) {
                out.push(Draw::Text {
                    style: Default::default(),
                    x: r.x
                        + if nav.is_top() && r.y < 48. {
                            12.
                        } else {
                            12. + part.depth as f64 * 31.
                        },
                    y: center_y + 6.,
                    text: part.icon.clone(),
                    color: color.into(),
                    size: 16.,
                    font: "Segoe Fluent Icons, Segoe MDL2 Assets, sans-serif".into(),
                    max_width: 20.,
                    weight: 400,
                });
            }
            let custom_content=layer!=NavigationLayer::All && (nav.props.find(&part.id).is_some_and(|item|item.content_template.is_some())||nav.props.menu_item_template.is_some());
            if !custom_content && !icon_only && part.id != "$toggle" && part.id != "$back" && part.id != "$close" && !(part.id=="$overflow"&&nav.props.overflow_label_mode==NavigationViewOverflowLabelMode::NoLabel) {
                let x = r.x
                    + if nav.is_top() && r.y < 48. {
                        if part.icon.is_empty() && animated.is_none() {
                            12.
                        } else {
                            36.
                        }
                    } else {
                        part.depth as f64 * 31.
                            + if part.icon.is_empty() && animated.is_none() {
                                12.
                            } else {
                                44.
                            }
                    };
                text(
                    &mut out,
                    x,
                    center_y + 5.,
                    &part.text,
                    color,
                    14.,
                    r.width - (x - r.x) - if part.expanded.is_some() { 30. } else { 12. },
                );
            }
            if let Some(expanded) = part.expanded {
                if !icon_only {
                    let _=expanded;
                    if let Some(player)=nav.hierarchy_motion.chevrons.get(&part.id){
                        let source=AnimatedIconSource::ChevronUpDownSmall;let size=crate::animated_icon::size(source);let scale=12./size[0].max(size[1]);
                        out.push(Draw::Save);out.push(Draw::Transform{matrix:[scale,0.,0.,scale,r.x+r.width-26.,center_y-6.]});
                        crate::animated_icon::draw(source,player.progress(nav.now),color,&mut out);out.push(Draw::Restore);
                    }
                }
            }
            // Project policy: suppress focus black frames in the browser, including
            // Canvas-rendered ones. Focus and keyboard navigation remain in Rust.
        }
        out.push(Draw::Restore);
        if part.clip.is_some() {
            out.push(Draw::Restore);
        }
    }
    if matches!(layer,NavigationLayer::All) && nav.indicator_target.is_some() {
        let color = if nav.props.accent == "#005fb8" {
            crate::resources::Resources::current().color(
                nav.props.theme,
                "NavigationViewSelectionIndicatorForeground",
            )
        } else {
            &nav.props.accent
        };
        for (visual, clip) in nav.indicator_visual_clips() {
            if let Some(rect) = clip { out.push(Draw::Clip { rect }); }
            let mut rgba = crate::material::rgba(color);
            rgba[3] *= visual.opacity;
            fill(
                &mut out,
                visual.rect,
                &crate::material::css(rgba),
                nav.template.indicator_radius,
            );
            if clip.is_some() { out.push(Draw::Restore); }
        }
    }
    if matches!(layer,NavigationLayer::All) { nav.menu_scrollbar.paint(nav.props.theme,nav.props.reduced_transparency||!nav.backdrop_available(),nav.now,&mut out); }
    out
}

#[cfg(target_arch = "wasm32")]
pub struct CanvasBackend {
    pub canvas: web_sys::HtmlCanvasElement,
    pub context: web_sys::CanvasRenderingContext2d,
    scratch: web_sys::HtmlCanvasElement,
    backdrop: web_sys::HtmlCanvasElement,
    local_backdrop: web_sys::HtmlCanvasElement,
    windowed: std::cell::Cell<bool>,
    isolated_window: std::cell::Cell<bool>,
    window_material: std::cell::RefCell<Option<(String, web_sys::HtmlCanvasElement, web_sys::CanvasPattern)>>,
    raster_images: std::cell::RefCell<std::collections::HashMap<u64, (u64, web_sys::HtmlCanvasElement)>>,
    material_tiles: std::cell::RefCell<std::collections::VecDeque<MaterialTile>>,
    capture: web_sys::HtmlCanvasElement,
    effect: web_sys::HtmlCanvasElement,
    material_sample: web_sys::HtmlCanvasElement,
    pub dpr: std::cell::Cell<f64>,
    pub images: std::rc::Rc<
        std::cell::RefCell<std::collections::HashMap<String, web_sys::HtmlImageElement>>,
    >,
    layers: std::cell::RefCell<Vec<CanvasBackend>>,
    gradients: std::cell::RefCell<std::collections::HashMap<String, web_sys::HtmlCanvasElement>>,
    vector_layers: std::cell::RefCell<Vec<CanvasBackend>>,
    vector_rasters: std::rc::Rc<std::cell::RefCell<std::collections::VecDeque<(Vec<u8>,web_sys::HtmlCanvasElement)>>>,
    pub vector_raster_hits: std::rc::Rc<std::cell::Cell<u64>>,
    retained_rasters: std::rc::Rc<std::cell::RefCell<std::collections::VecDeque<(retained::Key,web_sys::HtmlCanvasElement)>>>,
    pub retained_raster_hits: std::rc::Rc<std::cell::Cell<u64>>,
    glyphs: std::rc::Rc<std::cell::RefCell<std::collections::HashMap<String, (GlyphSurface,u64)>>>,
    glyph_serial: std::rc::Rc<std::cell::Cell<u64>>,
}
#[cfg(target_arch = "wasm32")]
struct MaterialTile {
    key:String,
    source:Vec<u8>,
    canvas:web_sys::HtmlCanvasElement,
    origin:[f64;2],
}
#[cfg(target_arch = "wasm32")]
#[derive(Clone)]
struct GlyphSurface {
    canvas: web_sys::HtmlCanvasElement,
    origin: [f64; 2],
    size: [f64; 2],
}
#[cfg(target_arch = "wasm32")]
fn canvas_context(
    canvas: &web_sys::HtmlCanvasElement,
) -> Result<web_sys::CanvasRenderingContext2d, wasm_bindgen::JsValue> {
    use wasm_bindgen::JsCast;
    canvas.get_context("2d")?
        .ok_or_else(|| wasm_bindgen::JsValue::from_str("Canvas 2D unavailable"))?
        .dyn_into()
        .map_err(Into::into)
}
#[cfg(target_arch = "wasm32")]
fn readback_context(
    canvas: &web_sys::HtmlCanvasElement,
) -> Result<web_sys::CanvasRenderingContext2d, wasm_bindgen::JsValue> {
    use wasm_bindgen::prelude::*;
    use wasm_bindgen::JsCast;
    #[wasm_bindgen(inline_js = "export function winuiReadbackContext(canvas) { return canvas.getContext('2d', {willReadFrequently: true}); }")]
    extern "C" {
        #[wasm_bindgen(catch, js_name = winuiReadbackContext)]
        fn readback(canvas: &web_sys::HtmlCanvasElement) -> Result<JsValue, JsValue>;
    }
    readback(canvas)?.dyn_into()
}
#[cfg(target_arch = "wasm32")]
impl CanvasBackend {
    fn retained_layer(&self, canvas: web_sys::HtmlCanvasElement, context: web_sys::CanvasRenderingContext2d) -> Self {
        Self {
            canvas, context,
            scratch: self.scratch.clone(), backdrop: self.backdrop.clone(),
            local_backdrop: self.local_backdrop.clone(), capture: self.capture.clone(),
            effect: self.effect.clone(), material_sample: self.material_sample.clone(),
            windowed: Default::default(), isolated_window: Default::default(),
            window_material: Default::default(), raster_images: Default::default(), material_tiles: Default::default(),
            dpr: std::cell::Cell::new(self.dpr.get()), images: self.images.clone(),
            layers: Default::default(), gradients: Default::default(), vector_layers: Default::default(),
            vector_rasters: self.vector_rasters.clone(), vector_raster_hits: self.vector_raster_hits.clone(),
            retained_rasters: Default::default(), retained_raster_hits: Default::default(),
            glyphs: self.glyphs.clone(), glyph_serial: self.glyph_serial.clone(),
        }
    }
    pub fn set_external_backdrop(
        &self,
        source: &web_sys::HtmlCanvasElement,
    ) -> Result<(), wasm_bindgen::JsValue> {
        use wasm_bindgen::JsCast;
        if self.backdrop.width() != source.width() { self.backdrop.set_width(source.width()); }
        if self.backdrop.height() != source.height() { self.backdrop.set_height(source.height()); }
        let ctx = self
            .backdrop
            .get_context("2d")?
            .unwrap()
            .dyn_into::<web_sys::CanvasRenderingContext2d>()?;
        ctx.clear_rect(0., 0., source.width() as f64, source.height() as f64);
        ctx.draw_image_with_html_canvas_element(source, 0., 0.)?;
        Ok(())
    }
    pub fn new(
        canvas: web_sys::HtmlCanvasElement,
        context: web_sys::CanvasRenderingContext2d,
    ) -> Result<Self, wasm_bindgen::JsValue> {
        use wasm_bindgen::JsCast;
        let document = canvas
            .owner_document()
            .ok_or_else(|| wasm_bindgen::JsValue::from_str("canvas document missing"))?;
        let surface = || -> Result<web_sys::HtmlCanvasElement, wasm_bindgen::JsValue> {
            let canvas = document.create_element("canvas")?.dyn_into::<web_sys::HtmlCanvasElement>()?;
            canvas.set_width(0);
            canvas.set_height(0);
            Ok(canvas)
        };
        Ok(Self {
            canvas,
            context,
            scratch: surface()?,
            backdrop: surface()?,
            local_backdrop: surface()?,
            windowed: std::cell::Cell::new(false),
            isolated_window: std::cell::Cell::new(false),
            window_material: Default::default(),
            material_tiles: Default::default(),
            raster_images: Default::default(),
            capture: surface()?,
            effect: surface()?,
            material_sample: surface()?,
            dpr: std::cell::Cell::new(1.),
            images: Default::default(),
            layers: Default::default(),
            gradients: Default::default(),
            vector_layers: Default::default(),
            vector_rasters: Default::default(),
            vector_raster_hits: Default::default(),
            retained_rasters: Default::default(),
            retained_raster_hits: Default::default(),
            glyphs: Default::default(),
            glyph_serial: Default::default(),
        })
    }
    pub fn release_rasters(&self) {
        for (_, (_, canvas)) in self.raster_images.borrow_mut().drain() { canvas.set_width(0); canvas.set_height(0); }
        if let Some((_,canvas,_)) = self.window_material.borrow_mut().take() { canvas.set_width(0); canvas.set_height(0); }
        for tile in self.material_tiles.borrow_mut().drain(..){tile.canvas.set_width(0);tile.canvas.set_height(0);}
        self.canvas.set_width(0);
        self.canvas.set_height(0);
        self.scratch.set_width(0);
        self.scratch.set_height(0);
        for canvas in [
            &self.backdrop,
            &self.local_backdrop,
            &self.capture,
            &self.effect,
            &self.material_sample,
        ] {
            canvas.set_width(0);
            canvas.set_height(0);
        }
        for layer in self.layers.borrow_mut().drain(..){layer.release_rasters();}
        for layer in self.vector_layers.borrow_mut().drain(..){layer.release_rasters();}
        for (_,canvas) in self.vector_rasters.borrow_mut().drain(..){canvas.set_width(0);canvas.set_height(0);}
        for (_,canvas) in self.retained_rasters.borrow_mut().drain(..){canvas.set_width(0);canvas.set_height(0);}
        for (_, (glyph, _)) in self.glyphs.borrow_mut().drain() {
            glyph.canvas.set_width(0);
            glyph.canvas.set_height(0);
        }
        for canvas in self.gradients.borrow_mut().drain().map(|(_, c)| c) {
            canvas.set_width(0);
            canvas.set_height(0);
        }
    }
    pub fn release(&self) {
        self.release_rasters();
        self.images.borrow_mut().clear();
    }
    fn glyph(
        &self,
        text: &str,
        font: &crate::typography::Font,
        color: &str,
        phase: [f64; 2],
    ) -> Result<GlyphSurface, wasm_bindgen::JsValue> {
        use wasm_bindgen::JsCast;
        let dpr = self.dpr.get();
        let key = format!("{}:{color}:{dpr}:{phase:?}:{text}", font.css());
        let serial=self.glyph_serial.get().wrapping_add(1);self.glyph_serial.set(serial);
        if let Some((glyph,used)) = self.glyphs.borrow_mut().get_mut(&key) {
            *used=serial;
            return Ok(glyph.clone());
        }
        let canvas = self
            .canvas
            .owner_document()
            .unwrap()
            .create_element("canvas")?
            .dyn_into::<web_sys::HtmlCanvasElement>()?;
        let context = canvas_context(&canvas)?;
        context.set_font(&font.css());
        let metrics = context.measure_text(text)?;
        let left = metrics.actual_bounding_box_left();
        let ascent = metrics.actual_bounding_box_ascent();
        let origin = [
            ((left * dpr - phase[0]).ceil() + phase[0] + 2.) / dpr,
            ((ascent * dpr - phase[1]).ceil() + phase[1] + 2.) / dpr,
        ];
        let width = ((left + metrics.actual_bounding_box_right()).max(0.) * dpr).ceil() as u32 + 4;
        let height =
            ((ascent + metrics.actual_bounding_box_descent()).max(0.) * dpr).ceil() as u32 + 4;
        if width > 16384 || height > 16384 {
            return Err(wasm_bindgen::JsValue::from_str(
                "Glyph surface exceeds browser limits",
            ));
        }
        canvas.set_width(width);
        canvas.set_height(height);
        context.set_transform(dpr, 0., 0., dpr, 0., 0.)?;
        context.set_font(&font.css());
        context.set_fill_style_str(color);
        context.fill_text(text, origin[0], origin[1])?;
        let glyph = GlyphSurface {
            canvas,
            origin,
            size: [width as f64 / dpr, height as f64 / dpr],
        };
        let mut cache = self.glyphs.borrow_mut();
        if cache.len() >= 1024 {
            if let Some(old)=cache.iter().min_by_key(|(_,(_,used))|*used).map(|(key,_)|key.clone()) {
                if let Some((old,_))=cache.remove(&old){old.canvas.set_width(0);old.canvas.set_height(0);}
            }
        }
        cache.insert(key, (glyph.clone(),serial));
        Ok(glyph)
    }
    fn composite_surface(&self,w:u32,h:u32,left:f64,top:f64,m:crate::scene::Matrix,commands:&[Draw])->Result<Self,wasm_bindgen::JsValue>{
        use wasm_bindgen::JsCast;
        let mut layer=if let Some(layer)=self.layers.borrow_mut().pop(){layer}else{let canvas=self.canvas.owner_document().unwrap().create_element("canvas")?.dyn_into::<web_sys::HtmlCanvasElement>()?;let ctx=canvas.get_context("2d")?.unwrap().dyn_into()?;Self::new(canvas,ctx)?};
        if layer.canvas.width()!=w{layer.canvas.set_width(w);}if layer.canvas.height()!=h{layer.canvas.set_height(h);}
        layer.images=self.images.clone();layer.dpr.set(self.dpr.get());layer.windowed.set(self.windowed.get());layer.isolated_window.set(false);
        layer.context.set_transform(1.,0.,0.,1.,0.,0.)?;layer.context.clear_rect(0.,0.,w as f64,h as f64);
        fn material(commands:&[Draw])->bool{commands.iter().any(|draw|matches!(draw,Draw::Acrylic{..}|Draw::SystemBackdrop{..})||matches!(draw,Draw::CrossFade{source,target,..} if material(source)||material(target)))}
        if material(commands){
            for (dest,local) in [(&layer.backdrop,false),(&layer.local_backdrop,true)]{
                if dest.width()!=w{dest.set_width(w);}if dest.height()!=h{dest.set_height(h);}
                let ctx: web_sys::CanvasRenderingContext2d=dest.get_context("2d")?.unwrap().dyn_into()?;ctx.set_transform(1.,0.,0.,1.,0.,0.)?;ctx.clear_rect(0.,0.,w as f64,h as f64);
                let base=if local{&self.local_backdrop}else{&self.backdrop};
                if base.width()>0&&base.height()>0{ctx.draw_image_with_html_canvas_element(base,-left,-top)?;}
                ctx.draw_image_with_html_canvas_element(&self.canvas,-left,-top)?;
            }
        }
        layer.context.set_transform(m.0[0],m.0[1],m.0[2],m.0[3],m.0[4]-left,m.0[5]-top)?;
        Ok(layer)
    }
    fn uniform_acrylic(&self,rect:Rect,weight:f64,colors:&crate::material::AcrylicColors,backdrop:[f64;3],desktop:bool)->Result<(),wasm_bindgen::JsValue>{
        use wasm_bindgen::JsCast;
        let ctx=&self.context;
        if desktop {
            let fallback=crate::material::rgba(&colors.fallback);
            let base=crate::material::blend_acrylic(backdrop,crate::material::rgba(&colors.tint),crate::material::rgba(&colors.luminosity));
            let mix=weight.clamp(0.,1.);let other=(1.-mix)*fallback[3];let alpha=mix+other;
            let rgb=base.map(|v|v*mix);let c=std::array::from_fn::<_,4,_>(|i|if i==3{crate::material::clamp_u8(alpha*255.)}else{crate::material::clamp_u8((rgb[i]+fallback[i]*other)/alpha.max(1e-12)*255.)});
            ctx.set_fill_style_str(&format!("#{:02x}{:02x}{:02x}{:02x}",c[0],c[1],c[2],c[3]));
            ctx.fill_rect(rect.x,rect.y,rect.width,rect.height);
            return Ok(());
        }
            let key=format!("{weight}|{colors:?}|{backdrop:?}");
            if self.window_material.borrow().as_ref().is_none_or(|(cached,_,_)|cached!=&key) {
                let tint=crate::material::rgba(&colors.tint);
                let luminosity=crate::material::rgba(&colors.luminosity);
                let fallback=crate::material::rgba(&colors.fallback);
                let base=crate::material::blend_acrylic(backdrop,tint,luminosity);
                let mix=weight.clamp(0.,1.);
                let fallback_weight=(1.-mix)*fallback[3];
                let alpha=mix+fallback_weight;
                let mut bytes=vec![0u8;256*256*4];
                for (index,pixel) in bytes.chunks_exact_mut(4).enumerate() {
                    let noise=crate::material::sample_noise([(index%256) as f64+0.5,(index/256) as f64+0.5]);
                    let opacity=noise[3]*crate::material::constants().noise_opacity;
                    for c in 0..3 {
                        let color=base[c]+(noise[c]-base[c])*opacity;
                        pixel[c]=crate::material::clamp_u8((color*mix+fallback[c]*fallback_weight)/alpha.max(1e-12)*255.);
                    }
                    pixel[3]=crate::material::clamp_u8(255.*alpha);
                }
                let tile=self.canvas.owner_document().unwrap().create_element("canvas")?.dyn_into::<web_sys::HtmlCanvasElement>()?;
                tile.set_width(256);tile.set_height(256);
                let target=tile.get_context("2d")?.unwrap().dyn_into::<web_sys::CanvasRenderingContext2d>()?;
                let image=web_sys::ImageData::new_with_u8_clamped_array_and_sh(wasm_bindgen::Clamped(&bytes),256,256)?;
                target.put_image_data(&image,0.,0.)?;
                let pattern=ctx.create_pattern_with_html_canvas_element(&tile,"repeat")?.ok_or_else(||wasm_bindgen::JsValue::from_str("material tile unavailable"))?;
                if let Some((_,old,_))=self.window_material.borrow_mut().replace((key,tile,pattern)){old.set_width(0);old.set_height(0);}
            }
            let cache=self.window_material.borrow();
            let pattern=&cache.as_ref().unwrap().2;
            ctx.save();ctx.translate(rect.x,rect.y)?;
            ctx.set_image_smoothing_enabled(true);
            ctx.set_fill_style_canvas_pattern(pattern);
            ctx.fill_rect(0.,0.,rect.width,rect.height);
            ctx.restore();
        Ok(())
    }
    fn acrylic(
        &self,
        rect: Rect,
        weight: f64,
        colors: &crate::material::AcrylicColors,
        desktop: bool,
        stable_window_background: bool,
    ) -> Result<(), wasm_bindgen::JsValue> {
        use wasm_bindgen::JsCast;
        let ctx = &self.context;
        if weight <= 0. {
            ctx.set_fill_style_str(&colors.fallback);
            ctx.fill_rect(rect.x, rect.y, rect.width, rect.height);
            return Ok(());
        }
        let w = self.canvas.width() as f64;
        let h = self.canvas.height() as f64;
        if w == 0. || h == 0. {
            return Ok(());
        }
        let dpr = self.dpr.get();
        let transform = ctx.get_transform()?;
        // Empty popup-window content and opaque tint have no varying backdrop.
        if stable_window_background && !desktop {
            let fallback=crate::material::rgba(&colors.fallback);
            return self.uniform_acrylic(rect,weight,colors,[fallback[0],fallback[1],fallback[2]],desktop);
        }
        if crate::material::rgba(&colors.tint)[3]>=1. {
            return self.uniform_acrylic(rect,weight,colors,[0.;3],desktop);
        }
        let blur_px = if desktop {
            crate::material::host_backdrop_blur_pixels()
        } else {
            crate::material::constants().blur_radius * dpr
        };
        let resize = |canvas: &web_sys::HtmlCanvasElement, width: u32, height: u32| {
            if canvas.width() != width {
                canvas.set_width(width);
            }
            if canvas.height() != height {
                canvas.set_height(height);
            }
        };
        let matrix = crate::scene::Matrix([
            transform.a(), transform.b(), transform.c(), transform.d(), transform.e(), transform.f(),
        ]);
        let bounds = matrix.bounds(rect);
        let left = bounds.x.floor().clamp(0., w);
        let top = bounds.y.floor().clamp(0., h);
        let width = (bounds.x + bounds.width).ceil().clamp(left, w) - left;
        let height = (bounds.y + bounds.height).ceil().clamp(top, h) - top;
        if width == 0. || height == 0. {
            return Ok(());
        }
        let mut fallback = crate::material::rgba(&colors.fallback);
        fallback[3] = 1.;
        let source = if !desktop && self.windowed.get() {
            &self.local_backdrop
        } else {
            &self.backdrop
        };
        let mut cache_input=None;
        let blur_tile = if crate::material::rgba(&colors.tint)[3] < 1. {
            // BackdropBrush first crops to the painted visual. D2D HARD border
            // then extends that cropped source, not the entire scene. This also
            // applies to InApp Acrylic (e.g. the narrow FlipView edge buttons).
            // Share the GPU's quarter-DIP source and bounded 49-tap Gaussian.
            let source_rect = if desktop {
                Rect::new(0., 0., w, h)
            } else {
                bounds
            };
            // Copy just the source rectangle before downsampling. Coordinates
            // outside the real backdrop continue to use the fallback color.
            let x = source_rect.x.floor();
            let y = source_rect.y.floor();
            let capture_width = (source_rect.x + source_rect.width).ceil() - x;
            let capture_height = (source_rect.y + source_rect.height).ceil() - y;
            if capture_width > 8192. || capture_height > 8192. || capture_width * capture_height > 16_777_216. {
                return self.uniform_acrylic(rect,weight,colors,[fallback[0],fallback[1],fallback[2]],desktop);
            }
            resize(&self.capture, capture_width as u32, capture_height as u32);
            let capture = canvas_context(&self.capture)?;
            capture.set_transform(1., 0., 0., 1., 0., 0.)?;
            capture.set_fill_style_str(&crate::material::css(fallback));
            capture.fill_rect(0., 0., capture_width, capture_height);
            let copy = |canvas: &web_sys::HtmlCanvasElement| {
                let left = x.max(0.);
                let top = y.max(0.);
                let width = (x + capture_width).min(w) - left;
                let height = (y + capture_height).min(h) - top;
                if width > 0. && height > 0. {
                    capture.draw_image_with_html_canvas_element_and_sw_and_sh_and_dx_and_dy_and_dw_and_dh(
                        canvas, left, top, width, height, left - x, top - y, width, height,
                    )?;
                }
                Ok::<_, wasm_bindgen::JsValue>(())
            };
            if source.width() == w as u32 && source.height() == h as u32 {
                copy(source)?;
            }
            if !desktop {
                copy(&self.canvas)?;
            }
            let bw = (source_rect.width / dpr / 4.).ceil().max(1.) as u32;
            let bh = (source_rect.height / dpr / 4.).ceil().max(1.) as u32;
            resize(&self.material_sample, bw, bh);
            let small = readback_context(&self.material_sample)?;
            small.set_image_smoothing_enabled(true);
            small
                .unchecked_ref::<SamplingContext>()
                .set_image_smoothing_quality("low");
            small.set_fill_style_str(&crate::material::css(fallback));
            small.fill_rect(0., 0., bw as f64, bh as f64);
            // Crop BEFORE downsampling: otherwise a sub-texel amount of the
            // adjacent page survives the clamp on a narrow Acrylic visual.
            small.draw_image_with_html_canvas_element_and_sw_and_sh_and_dx_and_dy_and_dw_and_dh(
                &self.capture,
                source_rect.x - x,
                source_rect.y - y,
                source_rect.width,
                source_rect.height,
                0.,
                0.,
                bw as f64,
                bh as f64,
            )?;
            let pixels = small.get_image_data(0., 0., bw as f64, bh as f64)?.data().0;
            // A uniform live source is still sampled on every frame. Evaluate
            // its graph once; retain the local noise tile across translation.
            // A changed source color or recipe changes that tile's cache key.
            if let Some(first)=pixels.get(..4) {
                if pixels.chunks_exact(4).all(|p|p==first) {
                    return self.uniform_acrylic(rect,weight,colors,[first[0] as f64/255.,first[1] as f64/255.,first[2] as f64/255.],desktop);
                }
            }
            let clamp = if desktop {
                let hx = (w / bw as f64 / 2.).min(bounds.width / 2.);
                let hy = (h / bh as f64 / 2.).min(bounds.height / 2.);
                [
                    (bounds.x + hx) / w,
                    (bounds.y + hy) / h,
                    (bounds.x + bounds.width - hx) / w,
                    (bounds.y + bounds.height - hy) / h,
                ]
            } else {
                [
                    0.5 / bw as f64,
                    0.5 / bh as f64,
                    1. - 0.5 / bw as f64,
                    1. - 0.5 / bh as f64,
                ]
            };
            let key=format!("{w},{h},{dpr}|{rect:?}|{weight}|{colors:?}|{desktop}|{clamp:?}|{:?}",[transform.a(),transform.b(),transform.c(),transform.d(),transform.e(),transform.f()]);
            let hit={let mut cache=self.material_tiles.borrow_mut();
                let at=cache.iter().position(|tile|tile.key==key&&tile.source==pixels);
                at.map(|at|{let tile=cache.remove(at).unwrap();let result=(tile.canvas.clone(),tile.origin);cache.push_back(tile);result})};
            if let Some((canvas,[x,y]))=hit {
                ctx.save();ctx.set_transform(1.,0.,0.,1.,0.,0.)?;
                ctx.draw_image_with_html_canvas_element(&canvas,x,y)?;ctx.restore();
                return Ok(());
            }
            let tile = crate::material_blur::BlurTile::new(
                &pixels,
                [bw as usize, bh as usize],
                blur_px / dpr / 4.,
                clamp,
            );
            cache_input=Some((key,pixels));
            Some((tile, source_rect))
        } else {
            None
        };
        resize(&self.effect, width as u32, height as u32);
        let e = readback_context(&self.effect)?;
        e.set_transform(1., 0., 0., 1., 0., 0.)?;
        e.clear_rect(0., 0., width, height);
        e.save();
        e.set_transform(
            transform.a(),
            transform.b(),
            transform.c(),
            transform.d(),
            transform.e() - left,
            transform.f() - top,
        )?;
        e.begin_path();
        e.rect(rect.x, rect.y, rect.width, rect.height);
        e.clip();
        let (tint, luminosity) = (colors.tint.clone(), colors.luminosity.clone());
        // Preserve subpixel coverage independently from the backdrop tile.
        e.set_fill_style_str("white");
        e.fill_rect(rect.x, rect.y, rect.width, rect.height);
        // Evaluate color, noise and premultiplied crossfade in one floating-point
        // pass. Canvas blend modes quantize every intermediate paint separately.
        let inverse = matrix.inverse().unwrap_or_default();
        {
            let image = e.get_image_data(0., 0., width, height)?;
            let mut bytes = image.data().0;
            let tint = crate::material::rgba(&tint);
            let luminosity = crate::material::rgba(&luminosity);
            let fallback = crate::material::rgba(&colors.fallback);
            let mix = weight.clamp(0., 1.);
            let fallback_weight = (1. - mix) * fallback[3];
            let alpha = mix + fallback_weight;
            let gray=|v:[f64;4]|v[0]==v[1]&&v[1]==v[2];
            let scalar=gray(tint)&&gray(luminosity)&&gray(fallback)&&(desktop||crate::material::NOISE_GRAY_OPAQUE)&&blur_tile.as_ref().is_some_and(|(tile,_)|tile.is_opaque_grayscale());
            let noise_opacity=crate::material::constants().noise_opacity;
            let sampling=blur_tile.as_ref().map(|(tile,source)|(tile.raster_axis(left,source.x,source.width,image.width() as usize,0),tile.raster_axis(top,source.y,source.height,image.height() as usize,1)));
            let noise_axes=(!desktop&&inverse.0[1]==0.&&inverse.0[2]==0.).then(||{
                let xs=(0..image.width()).map(|i|crate::material::noise_axis(inverse.point(left+i as f64+0.5,0.).0-rect.x)).collect::<Vec<_>>();
                let ys=(0..image.height()).map(|i|crate::material::noise_axis(inverse.point(0.,top+i as f64+0.5).1-rect.y)).collect::<Vec<_>>();(xs,ys)
            });
            for (index, pixel) in bytes
                .chunks_exact_mut(4)
                .enumerate()
                .filter(|(_, p)| p[3] != 0)
            {
                let column=index%image.width() as usize;
                let row=index/image.width() as usize;
                if scalar {
                    let (tile,_source)=blur_tile.as_ref().unwrap();
                    let px=left+(index%image.width() as usize) as f64+0.5;
                    let py=top+(index/image.width() as usize) as f64+0.5;
                    let axes=sampling.as_ref().unwrap();
                    let background=tile.gray_axes(axes.0[column],axes.1[row]);
                    // SetLum on gray has no saturation or channel clipping.
                    // The color blend node then leaves its luminance intact.
                    let mut color=background+(luminosity[0]-background)*luminosity[3];
                    if !desktop {
                        let (x,y)=inverse.point(px,py);
                        let noise=noise_axes.as_ref().map_or_else(||crate::material::sample_noise([x-rect.x,y-rect.y]),|axes|crate::material::sample_noise_axes(axes.0[column],axes.1[row]));
                        color+=(noise[0]-color)*noise[3]*noise_opacity;
                    }
                    let value=crate::material::clamp_u8((color*mix+fallback[0]*fallback_weight)/alpha.max(1e-12)*255.);
                    pixel[0]=value;pixel[1]=value;pixel[2]=value;
                    pixel[3]=crate::material::clamp_u8(pixel[3] as f64*alpha);
                    continue;
                }
                let backdrop = blur_tile.as_ref().map_or_else(
                    || {
                        [
                            pixel[0] as f64 / 255.,
                            pixel[1] as f64 / 255.,
                            pixel[2] as f64 / 255.,
                        ]
                    },
                    |(tile, _source)| {
                        let axes=sampling.as_ref().unwrap();
                        let p=tile.sample_axes(axes.0[column],axes.1[row]);
                        [p[0], p[1], p[2]]
                    },
                );
                let mut color = crate::material::blend_acrylic(backdrop, tint, luminosity);
                if !desktop {
                    let (x, y) = inverse.point(
                        left + (index % image.width() as usize) as f64 + 0.5,
                        top + (index / image.width() as usize) as f64 + 0.5,
                    );
                    let noise = noise_axes.as_ref().map_or_else(||crate::material::sample_noise([x-rect.x,y-rect.y]),|axes|crate::material::sample_noise_axes(axes.0[column],axes.1[row]));
                    let opacity = noise[3] * noise_opacity;
                    for i in 0..3 {
                        color[i] += (noise[i] - color[i]) * opacity;
                    }
                }
                for i in 0..3 {
                    pixel[i] = crate::material::clamp_u8(
                        (color[i] * mix + fallback[i] * fallback_weight) / alpha.max(1e-12) * 255.,
                    );
                }
                pixel[3] = crate::material::clamp_u8(pixel[3] as f64 * alpha);
            }
            let image = web_sys::ImageData::new_with_u8_clamped_array_and_sh(
                wasm_bindgen::Clamped(bytes.as_slice()),
                image.width(),
                image.height(),
            )?;
            e.put_image_data(&image, 0., 0.)?;
            if let Some((key,source))=cache_input {
                let canvas=self.canvas.owner_document().unwrap().create_element("canvas")?.dyn_into::<web_sys::HtmlCanvasElement>()?;
                canvas.set_width(image.width());canvas.set_height(image.height());
                canvas_context(&canvas)?.put_image_data(&image,0.,0.)?;
                let mut cache=self.material_tiles.borrow_mut();
                cache.push_back(MaterialTile{key,source,canvas,origin:[left,top]});
                // Bound retained CPU/GPU surfaces per layer, including animated
                // recipes and size changes. Never retain an entire viewport.
                while cache.len()>4||cache.iter().map(|v|v.canvas.width() as u64*v.canvas.height() as u64).sum::<u64>()>1_048_576 {
                    let old=cache.pop_front().unwrap();old.canvas.set_width(0);old.canvas.set_height(0);
                }
            }
        }
        e.restore();
        ctx.save();
        ctx.set_transform(1., 0., 0., 1., 0., 0.)?;
        ctx.draw_image_with_html_canvas_element(&self.effect, left, top)?;
        ctx.restore();
        Ok(())
    }
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen::prelude::wasm_bindgen]
extern "C" {
    // web-sys 0.3.81 omits this standardized Canvas2D property.
    #[wasm_bindgen(extends = web_sys::CanvasRenderingContext2d)]
    type SamplingContext;
    #[wasm_bindgen(method, setter, js_name = imageSmoothingQuality)]
    fn set_image_smoothing_quality(this: &SamplingContext, quality: &str);
}

pub(crate) fn normalized_corners(r: Rect, radii: [f64; 4]) -> [f64; 4] {
    let f = (r.width / (radii[0] + radii[1]).max(1e-9))
        .min(r.width / (radii[3] + radii[2]).max(1e-9))
        .min(r.height / (radii[0] + radii[3]).max(1e-9))
        .min(r.height / (radii[1] + radii[2]).max(1e-9))
        .min(1.);
    radii.map(|v| v * f)
}
#[cfg(target_arch = "wasm32")]
pub(crate) fn normalized_corner_ellipses(r: Rect, radii: [[f64; 2]; 4]) -> [[f64; 2]; 4] {
    let f = (r.width / (radii[0][0] + radii[1][0]).max(1e-9))
        .min(r.width / (radii[3][0] + radii[2][0]).max(1e-9))
        .min(r.height / (radii[0][1] + radii[3][1]).max(1e-9))
        .min(r.height / (radii[1][1] + radii[2][1]).max(1e-9))
        .min(1.);
    radii.map(|v| v.map(|a| a * f))
}
#[cfg(target_arch = "wasm32")]
fn rounded_path(
    ctx: &web_sys::CanvasRenderingContext2d,
    rect: Rect,
    rs: [[f64; 2]; 4],
) -> Result<(), wasm_bindgen::JsValue> {
    let [x, y, w, h] = [rect.x, rect.y, rect.width, rect.height];
    ctx.move_to(x + rs[0][0], y);
    for (end, center, rad, start) in [
        (
            [x + w - rs[1][0], y],
            [x + w - rs[1][0], y + rs[1][1]],
            rs[1],
            -std::f64::consts::FRAC_PI_2,
        ),
        (
            [x + w, y + h - rs[2][1]],
            [x + w - rs[2][0], y + h - rs[2][1]],
            rs[2],
            0.,
        ),
        (
            [x + rs[3][0], y + h],
            [x + rs[3][0], y + h - rs[3][1]],
            rs[3],
            std::f64::consts::FRAC_PI_2,
        ),
        (
            [x, y + rs[0][1]],
            [x + rs[0][0], y + rs[0][1]],
            rs[0],
            std::f64::consts::PI,
        ),
    ] {
        ctx.line_to(end[0], end[1]);
        if rad[0] > 0. && rad[1] > 0. {
            ctx.ellipse(
                center[0],
                center[1],
                rad[0],
                rad[1],
                0.,
                start,
                start + std::f64::consts::FRAC_PI_2,
            )?;
        } else {
            let a = start + std::f64::consts::FRAC_PI_2;
            ctx.line_to(center[0] + rad[0] * a.cos(), center[1] + rad[1] * a.sin());
        }
    }
    ctx.close_path();
    Ok(())
}
#[cfg(target_arch = "wasm32")]
pub(crate) fn paint_border(
    ctx: &web_sys::CanvasRenderingContext2d,
    r: Rect,
    t: [f64; 4],
    radius: [f64; 4],
    color: &str,
    background: Option<&str>,
) -> Result<(), wasm_bindgen::JsValue> {
    let radii = normalized_corners(r, radius);
    let inner = Rect::new(
        r.x + t[0],
        r.y + t[1],
        (r.width - t[0] - t[2]).max(0.),
        (r.height - t[1] - t[3]).max(0.),
    );
    let outer = radii.map(|v| [v, v]);
    let inner_r = [
        [(radii[0] - t[0]).max(0.), (radii[0] - t[1]).max(0.)],
        [(radii[1] - t[2]).max(0.), (radii[1] - t[1]).max(0.)],
        [(radii[2] - t[2]).max(0.), (radii[2] - t[3]).max(0.)],
        [(radii[3] - t[0]).max(0.), (radii[3] - t[3]).max(0.)],
    ];
    if let Some(bg) = background {
        if inner.width > 0. && inner.height > 0. {
            ctx.begin_path();
            rounded_path(ctx, inner, inner_r)?;
            ctx.set_fill_style_str(bg);
            ctx.fill();
        }
    }
    if t.iter().any(|v| *v > 0.) {
        ctx.begin_path();
        rounded_path(ctx, r, outer)?;
        if inner.width > 0. && inner.height > 0. {
            rounded_path(ctx, inner, inner_r)?;
        }
        ctx.set_fill_style_str(color);
        ctx.fill_with_canvas_winding_rule(web_sys::CanvasWindingRule::Evenodd);
    }
    Ok(())
}
#[cfg(target_arch = "wasm32")]
pub(crate) fn paint_icon_path(
    ctx: &web_sys::CanvasRenderingContext2d,
    geometry: &crate::icons::PathGeometry,
    color: &str,
) {
    use crate::icons::PathCommand;
    ctx.begin_path();
    for c in &geometry.commands {
        match c {
            PathCommand::Move(p) => ctx.move_to(p[0], p[1]),
            PathCommand::Line(p) => ctx.line_to(p[0], p[1]),
            PathCommand::Quad(p) => ctx.quadratic_curve_to(p[0], p[1], p[2], p[3]),
            PathCommand::Cubic(p) => ctx.bezier_curve_to(p[0], p[1], p[2], p[3], p[4], p[5]),
            PathCommand::Close => ctx.close_path(),
        }
    }
    ctx.set_fill_style_str(color);
    ctx.fill_with_canvas_winding_rule(if geometry.even_odd {
        web_sys::CanvasWindingRule::Evenodd
    } else {
        web_sys::CanvasWindingRule::Nonzero
    });
}
#[cfg(target_arch = "wasm32")]
pub fn paint(backend: &CanvasBackend, commands: &[Draw]) -> Result<(), wasm_bindgen::JsValue> {
    let raster_slots = commands.iter().filter_map(|draw| if let Draw::Raster {slot,..}=draw {Some(*slot)}else{None}).collect::<std::collections::HashSet<_>>();
    backend.raster_images.borrow_mut().retain(|slot,(_,canvas)| {let keep=raster_slots.contains(slot);if !keep {canvas.set_width(0);canvas.set_height(0);}keep});
    paint_commands(backend, commands)
}
#[cfg(target_arch = "wasm32")]
fn paint_commands(backend: &CanvasBackend, commands: &[Draw]) -> Result<(), wasm_bindgen::JsValue> {
    let ctx = &backend.context;
    let mut text_phase = None;
    fn path(
        ctx: &web_sys::CanvasRenderingContext2d,
        r: Rect,
        radius: f64,
    ) -> Result<(), wasm_bindgen::JsValue> {
        // WinUI Ellipse and Rectangle RadiusX/RadiusY use circular arcs.
        // A quadratic through the corner produces visibly squared-off circles.
        let radius = radius
            .max(0.)
            .min(r.width.abs() / 2.)
            .min(r.height.abs() / 2.);
        ctx.begin_path();
        ctx.round_rect_with_f64(r.x, r.y, r.width, r.height, radius)?;
        ctx.close_path();
        Ok(())
    }
    let mut index = 0;
    let mut painted = false;
    while index < commands.len() {
        let cmd = &commands[index];
        let stable_window_background = !painted && backend.isolated_window.get();
        if !matches!(cmd,Draw::Save|Draw::Restore|Draw::Transform{..}|Draw::Clip{..}|Draw::RoundedClip{..}|Draw::CornerClip{..}|Draw::TextRasterPhase{..}) { painted = true; }
        index += 1;
        match cmd {
            Draw::RetainedGroup { bounds, raster, commands } => {
                retained::paint(backend,*bounds,*raster,commands)?;
            }
            Draw::Shadow {
                rect,
                caster,
                radius,
                blur,
                offset_y,
                opacity,
            } => {
                ctx.save();
                // Hollow out the inset dummy while retaining the native border overlap.
                // The offscreen source below prevents black antialias leakage.
                ctx.begin_path();
                ctx.rect(rect.x, rect.y, rect.width, rect.height);
                // HWCompNodeWinRT excludes its one-DIP inset dummy, leaving
                // shadow underneath the translucent native border band.
                ctx.round_rect_with_f64(
                    caster.x + 1.,
                    caster.y + 1.,
                    (caster.width - 2.).max(0.),
                    (caster.height - 2.).max(0.),
                    *radius,
                )?;
                ctx.clip_with_canvas_winding_rule(web_sys::CanvasWindingRule::Evenodd);
                let m = ctx.get_transform()?;
                let density = m.a().hypot(m.b()).max(m.c().hypot(m.d()));
                // Composition BlurRadius spans three Gaussian standard deviations;
                // Canvas shadowBlur spans two. Keep the native downward profile.
                ctx.set_shadow_blur((blur + 1.) * density * (2. / 3.));
                ctx.set_shadow_color(&crate::material::css([0., 0., 0., *opacity]));
                // Cast from outside the destination clip. Drawing the black source
                // in place leaves antialiased black pixels at all four corners,
                // even with an inverse rounded clip. WinUI also insets its dummy
                // caster by one DIP to keep that source beneath the real panel.
                let shift = caster.width + rect.width + blur * 4. + 32.;
                ctx.set_shadow_offset_x(m.a() * shift + m.c() * offset_y);
                ctx.set_shadow_offset_y(m.b() * shift + m.d() * offset_y);
                path(
                    ctx,
                    Rect::new(
                        caster.x + 1. - shift,
                        caster.y + 1.,
                        (caster.width - 2.).max(0.),
                        (caster.height - 2.).max(0.),
                    ),
                    *radius,
                )?;
                ctx.set_fill_style_str("#000000");
                ctx.fill();
                ctx.restore();
            }
            Draw::PathBrush {
                geometry, brush, ..
            } => {
                let b = geometry.bounds;
                if b.width <= 0. || b.height <= 0. {
                    continue;
                }
                // The brush extends beyond the contour so only the geometry
                // clip contributes edge coverage; retain the original mapping.
                let m = ctx.get_transform()?;
                let padding = 2. / m.a().hypot(m.b()).max(m.c().hypot(m.d())).max(0.1);
                let rect = Rect::new(
                    b.x - padding,
                    b.y - padding,
                    b.width + padding * 2.,
                    b.height + padding * 2.,
                );
                let mut mapped = brush.clone();
                let [from, to] = brush.gradient_points(b);
                mapped.from = [from[0] - rect.x, from[1] - rect.y];
                mapped.to = [to[0] - rect.x, to[1] - rect.y];
                let (c, o, r) = brush.radial_parameters(b);
                mapped.center = [c[0] * b.width + padding, c[1] * b.height + padding];
                mapped.origin = [o[0] * b.width + padding, o[1] * b.height + padding];
                mapped.radius = [r[0] * b.width, r[1] * b.height];
                mapped.mapping_mode = "Absolute".into();
                mapped.relative_transform = [1., 0., 0., 1., 0., 0.];
                mapped.transform = [1., 0., 0., 1., 0., 0.];
                ctx.save();
                paint_icon_path(ctx, geometry, "#00000000");
                ctx.clip_with_canvas_winding_rule(if geometry.even_odd {
                    web_sys::CanvasWindingRule::Evenodd
                } else {
                    web_sys::CanvasWindingRule::Nonzero
                });
                paint_commands(
                    backend,
                    &[Draw::Gradient {
                        rect,
                        radius: 0.,
                        width: 0.,
                        brush: mapped,
                    }],
                )?;
                ctx.restore();
            }
            Draw::VectorPath {
                geometry, color, ..
            } => paint_icon_path(ctx, geometry, color),
            Draw::TintedImage {
                rect,
                source,
                color,
            } => {
                if let Some(image) = backend.images.borrow().get(source) {
                    let scratch = &backend.scratch;
                    scratch.set_width(image.natural_width());
                    scratch.set_height(image.natural_height());
                    use wasm_bindgen::JsCast;
                    let s: web_sys::CanvasRenderingContext2d = scratch
                        .get_context("2d")?
                        .ok_or_else(|| wasm_bindgen::JsValue::from_str("Canvas 2D unavailable"))?
                        .dyn_into()?;
                    s.draw_image_with_html_image_element(image, 0., 0.)?;
                    s.set_global_composite_operation("source-in")?;
                    s.set_fill_style_str(color);
                    s.fill_rect(0., 0., scratch.width() as f64, scratch.height() as f64);
                    s.set_global_composite_operation("source-over")?;
                    ctx.draw_image_with_html_canvas_element_and_dw_and_dh(
                        scratch,
                        rect.x,
                        rect.y,
                        rect.width,
                        rect.height,
                    )?;
                }
            }
            Draw::Border {
                rect,
                thickness,
                radius,
                color,
                background,
            } => paint_border(
                ctx,
                *rect,
                *thickness,
                *radius,
                color,
                background.as_deref(),
            )?,
            Draw::Save => ctx.save(),
            Draw::Transform { matrix } => ctx.transform(
                matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5],
            )?,
            Draw::CrossFade{rect,progress,source,source_scale,target} => {
                let t=ctx.get_transform()?;
                let m=crate::scene::Matrix([t.a(),t.b(),t.c(),t.d(),t.e(),t.f()]);
                let bounds=m.bounds(*rect);let left=bounds.x.floor()-1.;let top=bounds.y.floor()-1.;
                let w=(bounds.x+bounds.width).ceil()-left+1.;let h=(bounds.y+bounds.height).ceil()-top+1.;
                if w<=0.||h<=0.{continue;}
                if w>8192.||h>8192.||w*h>16_777_216.{return Err(wasm_bindgen::JsValue::from_str("crossfade surface exceeds allocation budget"));}
                let a=backend.composite_surface(w as u32,h as u32,left,top,m,source)?;
                let b=backend.composite_surface(w as u32,h as u32,left,top,m,target)?;
                a.context.scale(source_scale[0],source_scale[1])?;
                paint(&a,source)?;paint(&b,target)?;
                a.context.set_transform(1.,0.,0.,1.,0.,0.)?;
                a.context.set_global_composite_operation("destination-in")?;
                a.context.set_fill_style_str(&format!("rgba(0,0,0,{})",1.-progress.clamp(0.,1.)));a.context.fill_rect(0.,0.,w,h);
                a.context.set_global_composite_operation("lighter")?;a.context.set_global_alpha(progress.clamp(0.,1.));
                a.context.draw_image_with_html_canvas_element(&b.canvas,0.,0.)?;
                a.context.set_global_composite_operation("source-over")?;a.context.set_global_alpha(1.);
                ctx.save();ctx.set_transform(1.,0.,0.,1.,0.,0.)?;ctx.draw_image_with_html_canvas_element(&a.canvas,left,top)?;ctx.restore();
                backend.layers.borrow_mut().extend([a,b]);
            }
            Draw::VectorLayer { bounds } => {
                let start = index;
                let mut depth = 1;
                while index < commands.len() && depth > 0 {
                    match commands[index] {
                        Draw::Layer { .. }
                        | Draw::WindowLayer { .. }
                        | Draw::VectorLayer { .. } => depth += 1,
                        Draw::EndLayer => depth -= 1,
                        _ => {}
                    }
                    index += 1;
                }
                if depth != 0 {
                    return Err(wasm_bindgen::JsValue::from_str("unbalanced vector layer"));
                }
                let t = ctx.get_transform()?;
                let point =
                    |x: f64, y: f64| [t.a() * x + t.c() * y + t.e(), t.b() * x + t.d() * y + t.f()];
                let corners = [
                    point(bounds.x, bounds.y),
                    point(bounds.x + bounds.width, bounds.y),
                    point(bounds.x, bounds.y + bounds.height),
                    point(bounds.x + bounds.width, bounds.y + bounds.height),
                ];
                // Align the destination to physical pixels, retaining the exact
                // subpixel phase inside the raster instead of snapping geometry.
                let left = corners
                    .iter()
                    .map(|p| p[0])
                    .fold(f64::INFINITY, f64::min)
                    .floor()
                    - 2.;
                let top = corners
                    .iter()
                    .map(|p| p[1])
                    .fold(f64::INFINITY, f64::min)
                    .floor()
                    - 2.;
                let w = corners
                    .iter()
                    .map(|p| p[0])
                    .fold(f64::NEG_INFINITY, f64::max)
                    .ceil()
                    + 2.
                    - left;
                let h = corners
                    .iter()
                    .map(|p| p[1])
                    .fold(f64::NEG_INFINITY, f64::max)
                    .ceil()
                    + 2.
                    - top;
                const SAMPLES: f64 = 4.;
                if ![left, top, w, h].into_iter().all(f64::is_finite)
                    || w <= 0.
                    || h <= 0.
                    || w * SAMPLES > 8192.
                    || h * SAMPLES > 8192.
                    || w * h * SAMPLES * SAMPLES > 1_048_576.
                {
                    paint_commands(backend, &commands[start..index - 1])?;
                    continue;
                }
                let group=&commands[start..index-1];
                // Reuse immutable vector textures across equal controls and
                // frames. Include transform/physical phase so fractional DPR
                // and animation samples retain their exact raster geometry.
                // Backdrop/material and external pixel content stay dynamic.
                let reusable=group.iter().all(|draw|matches!(draw,
                    Draw::Save|Draw::Restore|Draw::Transform{..}|Draw::Layer{..}|Draw::EndLayer|
                    Draw::Fill{..}|Draw::Stroke{..}|Draw::Border{..}|Draw::Ellipse{..}|
                    Draw::Arc{..}|Draw::Polyline{..}|Draw::VectorPath{..}|
                    Draw::Clip{..}|Draw::RoundedClip{..}|Draw::CornerClip{..}|Draw::VectorLayer{..}));
                let phase=|v:f64|(v*1_000_000.).round()/1_000_000.;
                let key=if reusable {Some(serde_json::to_vec(&(backend.dpr.get(),w,h,
                    [t.a(),t.b(),t.c(),t.d(),phase(t.e()-left),phase(t.f()-top)],group))
                    .map_err(|e|wasm_bindgen::JsValue::from_str(&e.to_string()))?)}else{None};
                let cached=key.as_ref().and_then(|key|{
                    let mut cache=backend.vector_rasters.borrow_mut();
                    let at=cache.iter().position(|(k,_)|k==key)?;
                    let entry=cache.remove(at).unwrap();let canvas=entry.1.clone();cache.push_back(entry);Some(canvas)
                });
                if let Some(canvas)=cached {
                    backend.vector_raster_hits.set(backend.vector_raster_hits.get()+1);
                    ctx.save();ctx.set_transform(1.,0.,0.,1.,0.,0.)?;
                    ctx.set_image_smoothing_enabled(true);
                    ctx.unchecked_ref::<SamplingContext>().set_image_smoothing_quality("high");
                    ctx.draw_image_with_html_canvas_element_and_dw_and_dh(&canvas,left,top,w,h)?;
                    ctx.restore();continue;
                }
                use wasm_bindgen::JsCast;
                let layer = if let Some(layer) = backend.vector_layers.borrow_mut().pop() {
                    layer
                } else {
                    let canvas = backend
                        .canvas
                        .owner_document()
                        .unwrap()
                        .create_element("canvas")?
                        .dyn_into::<web_sys::HtmlCanvasElement>()?;
                    let context = canvas.get_context("2d")?.unwrap().dyn_into()?;
                    CanvasBackend::new(canvas, context)?
                };
                if layer.canvas.width() != (w * SAMPLES) as u32 {
                    layer.canvas.set_width((w * SAMPLES) as u32);
                }
                if layer.canvas.height() != (h * SAMPLES) as u32 {
                    layer.canvas.set_height((h * SAMPLES) as u32);
                }
                layer.context.set_transform(1., 0., 0., 1., 0., 0.)?;
                layer.context.clear_rect(0., 0., w * SAMPLES, h * SAMPLES);
                layer.dpr.set(backend.dpr.get() * SAMPLES);
                layer.context.set_transform(
                    t.a() * SAMPLES,
                    t.b() * SAMPLES,
                    t.c() * SAMPLES,
                    t.d() * SAMPLES,
                    (t.e() - left) * SAMPLES,
                    (t.f() - top) * SAMPLES,
                )?;
                paint(&layer, &commands[start..index - 1])?;
                if let Some(key)=key {
                    let canvas=backend.canvas.owner_document().unwrap().create_element("canvas")?.dyn_into::<web_sys::HtmlCanvasElement>()?;
                    canvas.set_width(layer.canvas.width());canvas.set_height(layer.canvas.height());
                    let context=canvas.get_context("2d")?.unwrap().dyn_into::<web_sys::CanvasRenderingContext2d>()?;
                    context.draw_image_with_html_canvas_element(&layer.canvas,0.,0.)?;
                    let mut cache=backend.vector_rasters.borrow_mut();cache.push_back((key,canvas));
                    while cache.len()>64||cache.iter().map(|(_,c)|c.width() as u64*c.height() as u64).sum::<u64>()>1_048_576 {
                        let (_,canvas)=cache.pop_front().unwrap();canvas.set_width(0);canvas.set_height(0);
                    }
                }
                ctx.save();
                ctx.set_transform(1., 0., 0., 1., 0., 0.)?;
                ctx.set_image_smoothing_enabled(true);
                ctx.unchecked_ref::<SamplingContext>()
                    .set_image_smoothing_quality("high");
                ctx.draw_image_with_html_canvas_element_and_dw_and_dh(
                    &layer.canvas,
                    left,
                    top,
                    w,
                    h,
                )?;
                ctx.restore();
                backend.vector_layers.borrow_mut().push(layer);
            }
            Draw::Layer { opacity } | Draw::WindowLayer { opacity, .. } => {
                let new_window = matches!(commands[index - 1], Draw::WindowLayer { .. });
                let inherit_backdrop = matches!(commands[index - 1], Draw::WindowLayer { inherit_backdrop: true, .. });
                let start = index;
                let mut depth = 1;
                while index < commands.len() && depth > 0 {
                    match commands[index] {
                        Draw::Layer { .. }
                        | Draw::WindowLayer { .. }
                        | Draw::VectorLayer { .. } => depth += 1,
                        Draw::EndLayer => depth -= 1,
                        _ => {}
                    }
                    index += 1;
                }
                if depth != 0 {
                    return Err(wasm_bindgen::JsValue::from_str("unbalanced layer"));
                }
                // An invisible group cannot contribute to the current frame.
                // In particular, drag placeholders and delayed entry tracks
                // must not copy three full-size backdrop surfaces per item.
                if *opacity <= 0. {
                    continue;
                }
                if *opacity>=1. && !new_window {ctx.save();paint_commands(backend,&commands[start..index-1])?;ctx.restore();continue;}
                let mut layer = if let Some(layer) = backend.layers.borrow_mut().pop() {
                    layer
                } else {
                    use wasm_bindgen::JsCast;
                    let canvas = backend
                        .canvas
                        .owner_document()
                        .unwrap()
                        .create_element("canvas")?
                        .dyn_into::<web_sys::HtmlCanvasElement>()?;
                    let context = canvas.get_context("2d")?.unwrap().dyn_into()?;
                    CanvasBackend::new(canvas, context)?
                };
                layer.images = backend.images.clone();
                layer.glyphs=backend.glyphs.clone();layer.glyph_serial=backend.glyph_serial.clone();
                layer.vector_rasters=backend.vector_rasters.clone();layer.vector_raster_hits=backend.vector_raster_hits.clone();
                layer.retained_rasters=backend.retained_rasters.clone();layer.retained_raster_hits=backend.retained_raster_hits.clone();
                let needs_backdrop=retained::requires_backdrop(&commands[start..index-1]);
                for canvas in [&layer.canvas].into_iter().chain(needs_backdrop.then_some([&layer.backdrop,&layer.local_backdrop]).into_iter().flatten()) {
                    if canvas.width() != backend.canvas.width() {
                        canvas.set_width(backend.canvas.width());
                    }
                    if canvas.height() != backend.canvas.height() {
                        canvas.set_height(backend.canvas.height());
                    }
                }
                layer.context.set_transform(1., 0., 0., 1., 0., 0.)?;
                layer.context.clear_rect(
                    0.,
                    0.,
                    layer.canvas.width() as f64,
                    layer.canvas.height() as f64,
                );
                layer.dpr.set(backend.dpr.get());
                use wasm_bindgen::JsCast;
                if needs_backdrop {
                let backdrop = layer
                    .backdrop
                    .get_context("2d")?
                    .unwrap()
                    .dyn_into::<web_sys::CanvasRenderingContext2d>()?;
                backdrop.clear_rect(
                    0.,
                    0.,
                    layer.canvas.width() as f64,
                    layer.canvas.height() as f64,
                );
                if backend.backdrop.width() == backend.canvas.width()
                    && backend.backdrop.height() == backend.canvas.height()
                {
                    backdrop.draw_image_with_html_canvas_element(&backend.backdrop, 0., 0.)?;
                }
                backdrop.draw_image_with_html_canvas_element(&backend.canvas, 0., 0.)?;
                let local = layer
                    .local_backdrop
                    .get_context("2d")?
                    .unwrap()
                    .dyn_into::<web_sys::CanvasRenderingContext2d>()?;
                local.clear_rect(
                    0.,
                    0.,
                    layer.canvas.width() as f64,
                    layer.canvas.height() as f64,
                );
                layer.windowed.set(new_window || backend.windowed.get());
                layer.isolated_window.set(new_window);
                if inherit_backdrop {
                    if backend.backdrop.width() > 0 && backend.backdrop.height() > 0 {
                        local.draw_image_with_html_canvas_element(&backend.backdrop, 0., 0.)?;
                    }
                } else if !new_window && backend.windowed.get() {
                    if backend.local_backdrop.width() > 0 && backend.local_backdrop.height() > 0 {
                        local.draw_image_with_html_canvas_element(&backend.local_backdrop, 0., 0.)?;
                    }
                    local.draw_image_with_html_canvas_element(&backend.canvas, 0., 0.)?;
                }
                }
                layer.windowed.set(new_window || backend.windowed.get());
                layer.isolated_window.set(new_window && !inherit_backdrop);
                let t = ctx.get_transform()?;
                layer
                    .context
                    .set_transform(t.a(), t.b(), t.c(), t.d(), t.e(), t.f())?;
                paint(&layer, &commands[start..index - 1])?;
                ctx.save();
                ctx.set_transform(1., 0., 0., 1., 0., 0.)?;
                ctx.set_global_alpha(*opacity);
                ctx.draw_image_with_html_canvas_element(&layer.canvas, 0., 0.)?;
                ctx.restore();
                backend.layers.borrow_mut().push(layer);
            }
            Draw::EndLayer => return Err(wasm_bindgen::JsValue::from_str("unexpected layer end")),
            Draw::Gradient {
                rect,
                radius,
                width,
                brush,
            } => {
                let b = *width / 2.;
                let bounds = Rect::new(
                    rect.x - b,
                    rect.y - b,
                    rect.width + width,
                    rect.height + width,
                );
                if brush.kind == "radialGradient" && brush.radius.contains(&0.) {
                    let stop = brush.stops.last().unwrap();
                    let mut color = crate::material::rgba(&stop.color);
                    color[3] *= brush.opacity;
                    path(ctx, *rect, *radius)?;
                    ctx.set_fill_style_str(&crate::material::css(color));
                    ctx.fill();
                    continue;
                }
                let [a, b] = brush.gradient_points(bounds);
                let radial = brush.kind == "radialGradient";
                let repeating = matches!(brush.spread_method.as_str(), "Repeat" | "Reflect");
                // Canvas radial gradients cannot express WinUI's elliptical focal cone.
                // Cache just the brush texture, using the same sampling equation as the GPU.
                if radial || repeating {
                    use wasm_bindgen::JsCast;
                    let transform = ctx.get_transform()?;
                    let density = transform
                        .a()
                        .hypot(transform.b())
                        .max(transform.c().hypot(transform.d()))
                        .max(0.1);
                    let w = (bounds.width * density).ceil() as u32;
                    let h = (bounds.height * density).ceil() as u32;
                    if u64::from(w) * u64::from(h) > 1_048_576 {
                        return Err(wasm_bindgen::JsValue::from_str(
                            "complex Canvas gradient exceeds reference raster budget; use WebGL2",
                        ));
                    }
                    let key = format!(
                        "{w}:{h}:{}:{}:{}",
                        bounds.width,
                        bounds.height,
                        serde_json::to_string(brush).unwrap()
                    );
                    if !backend.gradients.borrow().contains_key(&key) {
                        if backend.gradients.borrow().len() >= 8 {
                            for canvas in backend.gradients.borrow_mut().drain().map(|(_, c)| c) {
                                canvas.set_width(0);
                                canvas.set_height(0);
                            }
                        }
                        let canvas = backend
                            .canvas
                            .owner_document()
                            .unwrap()
                            .create_element("canvas")?
                            .dyn_into::<web_sys::HtmlCanvasElement>()?;
                        canvas.set_width(w);
                        canvas.set_height(h);
                        let mut pixels = vec![0u8; w as usize * h as usize * 4];
                        for y in 0..h {
                            for x in 0..w {
                                let color = brush.gradient_sample(
                                    bounds,
                                    [(x as f64 + 0.5) / w as f64, (y as f64 + 0.5) / h as f64],
                                );
                                let i = (y as usize * w as usize + x as usize) * 4;
                                for channel in 0..4 {
                                    pixels[i + channel] =
                                        (color[channel].clamp(0., 1.) * 255.).round() as u8;
                                }
                            }
                        }
                        let image = web_sys::ImageData::new_with_u8_clamped_array_and_sh(
                            wasm_bindgen::Clamped(&pixels),
                            w,
                            h,
                        )?;
                        canvas
                            .get_context("2d")?
                            .unwrap()
                            .dyn_into::<web_sys::CanvasRenderingContext2d>()?
                            .put_image_data(&image, 0., 0.)?;
                        backend.gradients.borrow_mut().insert(key.clone(), canvas);
                    }
                    ctx.save();
                    path(ctx, *rect, *radius)?;
                    ctx.clip();
                    ctx.draw_image_with_html_canvas_element_and_dw_and_dh(
                        &backend.gradients.borrow()[&key],
                        bounds.x,
                        bounds.y,
                        bounds.width,
                        bounds.height,
                    )?;
                    ctx.restore();
                    continue;
                }
                let gradient = ctx.create_linear_gradient(a[0], a[1], b[0], b[1]);
                for stop in &brush.stops {
                    let mut rgba = crate::material::rgba(&stop.color);
                    rgba[3] *= brush.opacity;
                    gradient.add_color_stop(stop.offset as f32, &crate::material::css(rgba))?;
                }
                path(ctx, *rect, *radius)?;
                if *width > 0. {
                    ctx.set_stroke_style_canvas_gradient(&gradient);
                    ctx.set_line_width(*width);
                    ctx.stroke();
                } else {
                    ctx.set_fill_style_canvas_gradient(&gradient);
                    ctx.fill();
                }
            }
            Draw::Raster {rect,slot,revision,width,height,rgba} => {
                use wasm_bindgen::JsCast;
                let mut images=backend.raster_images.borrow_mut();
                if !images.contains_key(slot) {
                    let canvas=backend.canvas.owner_document().unwrap().create_element("canvas")?.dyn_into::<web_sys::HtmlCanvasElement>()?;
                    images.insert(*slot,(0,canvas));
                }
                let (current,canvas)=images.get_mut(slot).unwrap();
                if current!=revision || canvas.width()!=*width || canvas.height()!=*height {
                    if canvas.width()!=*width {canvas.set_width(*width);}
                    if canvas.height()!=*height {canvas.set_height(*height);}
                    let target=canvas.get_context("2d")?.unwrap().dyn_into::<web_sys::CanvasRenderingContext2d>()?;
                    let data=web_sys::ImageData::new_with_u8_clamped_array_and_sh(wasm_bindgen::Clamped(rgba.as_slice()),*width,*height)?;
                    target.put_image_data(&data,0.,0.)?;*current = *revision;
                }
                ctx.draw_image_with_html_canvas_element_and_dw_and_dh(canvas,rect.x,rect.y,rect.width,rect.height)?;
            }
            Draw::Image { rect, source } => {
                use wasm_bindgen::JsCast;
                if let Some(image) = backend.images.borrow().get(source) {
                    ctx.set_image_smoothing_enabled(true);
                    ctx.unchecked_ref::<SamplingContext>()
                        .set_image_smoothing_quality("high");
                    ctx.draw_image_with_html_image_element_and_dw_and_dh(
                        image,
                        rect.x,
                        rect.y,
                        rect.width,
                        rect.height,
                    )?;
                }
            }

            Draw::Arc {
                center,
                radius,
                start,
                end,
                color,
                width,
            } => {
                if end > start && *radius > 0. {
                    ctx.begin_path();
                    ctx.arc(center[0], center[1], *radius, *start, *end)?;
                    ctx.set_stroke_style_str(color);
                    ctx.set_line_width(*width);
                    ctx.set_line_cap("round");
                    ctx.stroke();
                }
            }
            Draw::Polyline {
                points,
                color,
                width,
            } => {
                if let Some(first) = points.first() {
                    ctx.begin_path();
                    ctx.move_to(first[0], first[1]);
                    for p in &points[1..] {
                        ctx.line_to(p[0], p[1]);
                    }
                    ctx.set_stroke_style_str(color);
                    ctx.set_line_width(*width);
                    ctx.set_line_cap("round");
                    ctx.set_line_join("round");
                    ctx.stroke();
                }
            }
            Draw::Ellipse { rect: r, color } => {
                ctx.begin_path();
                ctx.ellipse(
                    r.x + r.width / 2.,
                    r.y + r.height / 2.,
                    r.width / 2.,
                    r.height / 2.,
                    0.,
                    0.,
                    std::f64::consts::TAU,
                )?;
                ctx.set_fill_style_str(color);
                ctx.fill();
            }
            Draw::ContentBackground {
                rect: r,
                color,
                border,
                top_left_radius: a,
            } => {
                ctx.begin_path();
                ctx.move_to(r.x, r.y + r.height);
                ctx.line_to(r.x, r.y + a);
                ctx.quadratic_curve_to(r.x, r.y, r.x + a, r.y);
                ctx.line_to(r.x + r.width, r.y);
                ctx.line_to(r.x + r.width, r.y + r.height);
                ctx.close_path();
                ctx.set_fill_style_str(color);
                ctx.fill();
                ctx.begin_path();
                ctx.move_to(r.x + 0.5, r.y + r.height);
                ctx.line_to(r.x + 0.5, r.y + a);
                ctx.quadratic_curve_to(r.x + 0.5, r.y + 0.5, r.x + a, r.y + 0.5);
                ctx.line_to(r.x + r.width, r.y + 0.5);
                ctx.set_stroke_style_str(border);
                ctx.set_line_width(1.);
                ctx.stroke();
            }
            Draw::Acrylic {
                rect,
                recipe,
                colors,
                weight,
            }
            | Draw::SystemBackdrop {
                rect,
                recipe,
                colors,
                weight,
            } => {
                let (tint, luminosity) = recipe.colors();
                let target = crate::material::AcrylicColors {
                    tint,
                    luminosity,
                    fallback: recipe.fallback_color.clone(),
                };
                backend.acrylic(
                    *rect,
                    *weight,
                    colors.as_ref().unwrap_or(&target),
                    matches!(cmd, Draw::SystemBackdrop { .. }),
                    stable_window_background,
                )?;
            }
            Draw::Fill {
                rect,
                color,
                radius,
            } => {
                path(ctx, *rect, *radius)?;
                ctx.set_fill_style_str(color);
                ctx.fill();
            }
            Draw::Stroke {
                rect,
                color,
                radius,
                width,
            } => {
                path(ctx, *rect, *radius)?;
                ctx.set_stroke_style_str(color);
                ctx.set_line_width(*width);
                ctx.stroke();
            }
            Draw::TextRasterPhase { phase } => text_phase = Some(*phase),
            Draw::Text {
                style,
                x,
                y,
                text,
                color,
                size,
                font,
                max_width,
                weight,
            } => {
                let phase = text_phase.take();
                if *max_width <= 0. {
                    continue;
                }
                if phase.is_none() { ctx.set_font(
                    &crate::typography::Font {
                        style: *style,
                        weight: *weight,
                        size: *size,
                        family: font.clone(),
                    }
                    .css(),
                );
                ctx.set_fill_style_str(color); }
                // Clip instead of Canvas maxWidth's horizontal glyph scaling.
                ctx.save();
                ctx.begin_path();
                ctx.rect(*x, *y - size * 1.4, *max_width, size * 2.);
                ctx.clip();
                if let Some(phase) = phase {
                    let glyph = backend.glyph(
                        text,
                        &crate::typography::Font {
                            style: *style,
                            weight: *weight,
                            size: *size,
                            family: font.clone(),
                        },
                        color,
                        phase,
                    )?;
                    ctx.draw_image_with_html_canvas_element_and_dw_and_dh(
                        &glyph.canvas,
                        x - glyph.origin[0],
                        y - glyph.origin[1],
                        glyph.size[0],
                        glyph.size[1],
                    )?;
                } else {
                    ctx.fill_text(text, *x, *y)?;
                }
                ctx.restore();
            }
            Draw::CornerClip { rect, radii } => {
                ctx.save();
                ctx.begin_path();
                rounded_path(ctx, *rect, normalized_corner_ellipses(*rect, *radii))?;
                ctx.clip();
            }
            Draw::RoundedClip { rect, radius } => {
                ctx.save();
                path(ctx, *rect, *radius)?;
                ctx.clip();
            }
            Draw::Clip { rect } => {
                ctx.save();
                ctx.begin_path();
                ctx.rect(rect.x, rect.y, rect.width, rect.height);
                ctx.clip();
            }
            Draw::Restore => ctx.restore(),
        }
    }
    Ok(())
}
