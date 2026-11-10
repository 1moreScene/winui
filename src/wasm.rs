use crate::{
    model::{Input, Properties},
    render, Runtime,
};
use std::collections::HashMap;
use wasm_bindgen::{prelude::*, JsCast};
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};
mod popup_input;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console, js_name = error)]
    fn report_panic(message: &str);
    #[wasm_bindgen(js_namespace = performance, js_name = now)]
    fn frame_clock() -> f64;
}

fn error(e: impl ToString) -> JsValue {
    JsValue::from_str(&e.to_string())
}
#[wasm_bindgen]
#[derive(Default)]
pub struct WinUiRuntime {
    core: Runtime,
    surfaces: HashMap<u32, render::CanvasBackend>,
    scenes: HashMap<u32, SceneHost>,
    frames: HashMap<u32, crate::frame::Frame>,
}
#[wasm_bindgen]
impl WinUiRuntime {
    pub fn navigation_frame_create(&mut self) -> Result<u32, JsValue> {
        let id = self.core.allocate().map_err(error)?;
        self.frames.insert(id, crate::frame::Frame::default());
        Ok(id)
    }
    pub fn navigation_frame_command(&mut self, id:u32, json:&str, time:f64, preview:bool) -> Result<String,JsValue> {
        let command = serde_json::from_str(json).map_err(error)?;
        let frame = self.frames.get_mut(&id).ok_or_else(||error("invalid or destroyed Frame"))?;
        if preview { let mut candidate=frame.clone(); candidate.apply(command,time).map_err(error)?;serde_json::to_string(&candidate.snapshot(time)).map_err(error) }
        else { frame.apply(command,time).map_err(error)?;serde_json::to_string(&frame.snapshot(time)).map_err(error) }
    }
    pub fn navigation_frame_tick(&mut self,id:u32,time:f64)->Result<String,JsValue>{
        let frame=self.frames.get_mut(&id).ok_or_else(||error("invalid or destroyed Frame"))?;
        frame.advance(time);serde_json::to_string(&frame.snapshot(time)).map_err(error)
    }
    pub fn navigation_frame_destroy(&mut self,id:u32)->Result<(),JsValue>{self.frames.remove(&id).map(|_|()).ok_or_else(||error("invalid or destroyed Frame"))}
    pub fn animated_icon_info(&self, source: &str) -> Result<String, JsValue> {
        let source: crate::enums::AnimatedIconSource =
            serde_json::from_str(source).map_err(error)?;
        serde_json::to_string(&crate::animated_icon::info(source)).map_err(error)
    }
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        std::panic::set_hook(Box::new(|info| report_panic(&info.to_string())));
        Self::default()
    }
    pub fn create(&mut self, json: &str, canvas: HtmlCanvasElement) -> Result<u32, JsValue> {
        let props: Properties = serde_json::from_str(json).map_err(error)?;
        let ctx = canvas
            .get_context("2d")?
            .ok_or_else(|| error("Canvas 2D is unavailable"))?
            .dyn_into::<CanvasRenderingContext2d>()?;
        let backend = render::CanvasBackend::new(canvas, ctx)?;
        let id = self.core.create(props).map_err(error)?;
        self.surfaces.insert(id, backend);
        Ok(id)
    }
    pub fn update(&mut self, id: u32, json: &str, time: f64) -> Result<(), JsValue> {
        let patches = serde_json::from_str(json).map_err(error)?;
        let view = self.core.get(id).map_err(error)?;
        view.advance(time);
        view.update(patches).map_err(error)
    }
    pub fn input(&mut self, id: u32, json: &str, time: f64) -> Result<(), JsValue> {
        let input: Input = serde_json::from_str(json).map_err(error)?;
        self.core
            .get(id)
            .map_err(error)?
            .input(input, time)
            .map_err(error)
    }
    pub fn frame(&mut self, id: u32, time: f64, dpr: f64) -> Result<String, JsValue> {
        if !dpr.is_finite() || dpr <= 0. || dpr > 8. {
            return Err(error("invalid device pixel ratio"));
        }
        let nav = self.core.get(id).map_err(error)?;
        nav.advance(time);
        let backend = self
            .surfaces
            .get(&id)
            .ok_or_else(|| error("surface has been released"))?;
        let canvas = &backend.canvas;
        let ctx = &backend.context;
        measure_navigation(nav, ctx)?;
        nav.layout();
        let w = (nav.width * dpr).ceil() as u32;
        let h = (nav.height * dpr).ceil() as u32;
        if canvas.width() != w {
            canvas.set_width(w);
        }
        if canvas.height() != h {
            canvas.set_height(h);
        }
        ctx.set_transform(1., 0., 0., 1., 0., 0.)?;
        ctx.clear_rect(0., 0., w as f64, h as f64);
        ctx.set_transform(dpr, 0., 0., dpr, 0., 0.)?;
        backend.dpr.set(dpr);
        render::paint(backend, &render::display_list(nav))?;
        serde_json::to_string(&nav.snapshot()).map_err(error)
    }
    pub fn inspect(&mut self, id: u32) -> Result<String, JsValue> {
        let nav = self.core.get(id).map_err(error)?;
        serde_json::to_string(&nav.snapshot()).map_err(error)
    }
    pub fn destroy(&mut self, id: u32) -> Result<(), JsValue> {
        self.core.destroy(id).map_err(error)?;
        if let Some(backend) = self.surfaces.remove(&id) {
            backend.release();
        }
        Ok(())
    }
    pub fn properties(&mut self, id: u32) -> Result<String, JsValue> {
        serde_json::to_string(&self.core.get(id).map_err(error)?.props).map_err(error)
    }
    pub fn template(&self, key: &str) -> Result<String, JsValue> {
        serde_json::to_string(&crate::content::template(key).map_err(error)?).map_err(error)
    }
    pub fn live_count(&self) -> usize {
        self.core.live_count()
            + self.frames.len()
            + self
                .scenes
                .values()
                .map(|s| s.scene.nodes.len())
                .sum::<usize>()
    }
}

fn measure_navigation(
    nav: &mut crate::navigation::NavigationView,
    ctx: &CanvasRenderingContext2d,
) -> Result<(), JsValue> {
    // Typography stays on the Rust side of the host boundary. The same Canvas
    // font is used to measure Top navigation and to draw its labels.
    ctx.set_font("14px Segoe UI, system-ui, sans-serif");
    for item in nav.props.items.iter().chain(nav.props.footer_items.iter()) {
        if !nav.text_widths.contains_key(&item.text) {
            nav.text_widths
                .insert(item.text.clone(), ctx.measure_text(&item.text)?.width());
        }
    }
    fn prime(
        node: &crate::content::ContentNode,
        ctx: &CanvasRenderingContext2d,
        widths: &mut HashMap<String, f64>,
    ) -> Result<(), JsValue> {
        if node.kind == crate::model::ContentKind::TextBlock {
            ctx.set_font(&format!(
                "{} {}px Segoe UI, system-ui, sans-serif",
                node.font_weight, node.font_size
            ));
            for word in node
                .text
                .split_whitespace()
                .chain(std::iter::once(" "))
                .chain(std::iter::once(node.text.as_str()))
            {
                let key = crate::content::metric_key(word, node.font_size, node.font_weight);
                if let std::collections::hash_map::Entry::Vacant(entry) = widths.entry(key) {
                    entry.insert(ctx.measure_text(word)?.width());
                }
                if node.trim_side_bearings {
                    if let Some(c) = word.chars().next() {
                        let key = crate::content::metric_key(
                            &format!("@bearing:{c}"),
                            node.font_size,
                            node.font_weight,
                        );
                        if let std::collections::hash_map::Entry::Vacant(entry) = widths.entry(key)
                        {
                            entry.insert(
                                ctx.measure_text(&c.to_string())?.actual_bounding_box_left(),
                            );
                        }
                    }
                }
            }
        }
        for child in &node.children {
            prime(child, ctx, widths)?;
        }
        Ok(())
    }
    if let Some(content) = &nav.props.content_node {
        prime(content, ctx, &mut nav.text_widths)?;
    }
    Ok(())
}
#[derive(serde::Deserialize, Default)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
struct SceneInit {
    auto_height: bool,
    theme: crate::enums::Theme,
    reduced_motion: bool,
    reduced_transparency: bool,
    backend: crate::enums::RendererBackend,
    root: serde_json::Value,
}
enum SceneBackend {
    Canvas(render::CanvasBackend),
    Gpu(crate::gpu::GpuBackend),
}
struct SceneHost {
    popup_input: popup_input::PopupInput,
    floating_canvas: Option<HtmlCanvasElement>,
    floating_backend: Option<SceneBackend>,
    floating_backdrop: Option<HtmlCanvasElement>,
    page_backdrop: Option<(HtmlCanvasElement, crate::model::Rect)>,
    scene: crate::scene::Scene,
    backend: SceneBackend,
    text: crate::typography::BrowserText,
    lost: bool,
    retained_base: Option<(crate::model::Rect,f64,Vec<render::Draw>)>,
    projected_properties: HashMap<u32, crate::scene::NodeProperties>,
    base_paints: u64,
    base_reuses: u64,
    last_serialize_ms: f64,
}
fn paint_scene_backend(
    backend: &mut SceneBackend,
    list: &[render::Draw],
    width: f64,
    height: f64,
    dpr: f64,
) -> Result<serde_json::Value, JsValue> {
    Ok(match backend {
        SceneBackend::Canvas(b) => {
            let (w, h) = ((width * dpr).ceil() as u32, (height * dpr).ceil() as u32);
            if b.canvas.width() != w {
                b.canvas.set_width(w);
            }
            if b.canvas.height() != h {
                b.canvas.set_height(h);
            }
            // ceil(DIP * DPR) may allocate a partial trailing pixel. Clearing
            // the logical DIP rectangle can leave that backing row untouched
            // (and outside the browser's damage region). Repeated translucent
            // borders then accumulate into a dark line, even after they move.
            b.context.set_transform(1., 0., 0., 1., 0., 0.)?;
            b.context.clear_rect(0., 0., w as f64, h as f64);
            b.context.set_transform(dpr, 0., 0., dpr, 0., 0.)?;
            b.dpr.set(dpr);
            // A hidden host can receive its final ResizeObserver/animation
            // frame at zero size. Keep layout/events current, but Canvas2D
            // cannot use that empty surface as a drawImage source for layers.
            if w > 0 && h > 0 {
                render::paint(b, list)?;
            }
            serde_json::json!({"kind":"Canvas2D","lost":false,"generation":1})
        }
        SceneBackend::Gpu(b) => {
            let lost = !b.paint(list, width, height, dpr)?;
            serde_json::json!({"kind":"WebGL2","lost":lost,"generation":b.generation,"draws":b.draws,"uploads":b.uploads,"effectPasses":b.effect_passes,"cachedSurfaces":b.cached_surfaces()})
        }
    })
}
#[wasm_bindgen]
impl WinUiRuntime {
    pub fn scene_create(&mut self, json: &str, canvas: HtmlCanvasElement) -> Result<u32, JsValue> {
        let init: SceneInit = serde_json::from_str(json).map_err(error)?;
        let document = canvas
            .owner_document()
            .ok_or_else(|| error("canvas document missing"))?;
        let mut scene = crate::scene::Scene::new(init.theme, init.reduced_motion);
        scene.auto_height = init.auto_height;
        scene.set_policies(init.reduced_motion, init.reduced_transparency);
        if !init.root.is_null() {
            scene
                .update(vec![crate::scene::Update {
                    id: scene.root,
                    patch: init.root,
                }])
                .map_err(error)?;
        }
        let text = crate::typography::BrowserText::new(&document)?;
        let backend = match init.backend {
            crate::enums::RendererBackend::Canvas2D => {
                let context = canvas
                    .get_context("2d")?
                    .ok_or_else(|| error("Canvas 2D unavailable"))?
                    .dyn_into()?;
                SceneBackend::Canvas(render::CanvasBackend::new(canvas, context)?)
            }
            crate::enums::RendererBackend::WebGL2 => {
                SceneBackend::Gpu(crate::gpu::GpuBackend::new(canvas)?)
            }
        };
        let id = self.core.allocate().map_err(error)?;
        self.scenes.insert(
            id,
            SceneHost {
                popup_input: popup_input::PopupInput::default(),
                floating_canvas: None,
                floating_backend: None,
                floating_backdrop: None,
                page_backdrop: None,
                scene,
                backend,
                text,
                lost: false,
                retained_base: None,
                projected_properties:HashMap::new(),
                base_paints: 0,
                base_reuses: 0,
                last_serialize_ms: 0.,
            },
        );
        Ok(id)
    }
    pub fn scene_floating_surface(
        &mut self,
        id: u32,
        canvas: HtmlCanvasElement,
    ) -> Result<(), JsValue> {
        let host = self
            .scenes
            .get_mut(&id)
            .ok_or_else(|| error("invalid scene"))?;
        host.popup_input = popup_input::PopupInput::default();
        host.floating_canvas = Some(canvas);
        host.floating_backend = None;
        Ok(())
    }
    pub fn scene_root(&self, id: u32) -> Result<u32, JsValue> {
        Ok(self
            .scenes
            .get(&id)
            .ok_or_else(|| error("invalid scene"))?
            .scene
            .root)
    }
    /// Browser host rasterization only. Acrylic composition remains in Rust.
    pub fn scene_floating_backdrop(&mut self, id: u32, canvas: Option<HtmlCanvasElement>, x: f64, y: f64, width: f64, height: f64) -> Result<(), JsValue> {
        if ![x,y,width,height].iter().all(|v|v.is_finite()) || width < 0. || height < 0. {
            return Err(error("invalid page backdrop bounds"));
        }
        let host = self.scenes.get_mut(&id).ok_or_else(||error("invalid scene"))?;
        host.page_backdrop = canvas.map(|canvas|(canvas,crate::model::Rect::new(x,y,width,height)));
        Ok(())
    }
    pub fn scene_node(
        &mut self,
        id: u32,
        parent: u32,
        kind: &str,
        json: &str,
    ) -> Result<u32, JsValue> {
        let kind = serde_json::from_str(kind).map_err(error)?;
        let patch = serde_json::from_str(json).map_err(error)?;
        self.scenes
            .get_mut(&id)
            .ok_or_else(|| error("invalid scene"))?
            .scene
            .create(parent, kind, patch)
            .map_err(error)
    }
    pub fn scene_update(&mut self, id: u32, json: &str, time: f64) -> Result<(), JsValue> {
        let updates = serde_json::from_str(json).map_err(error)?;
        let host = self
            .scenes
            .get_mut(&id)
            .ok_or_else(|| error("invalid scene"))?;
        host.scene.advance(time);
        host.scene.update(updates).map_err(error)
    }
    pub fn scene_configure(
        &mut self,
        id: u32,
        theme: &str,
        reduced: bool,
        transparency: bool,
        time: f64,
    ) -> Result<(), JsValue> {
        let theme = serde_json::from_str(theme).map_err(error)?;
        let host = self
            .scenes
            .get_mut(&id)
            .ok_or_else(|| error("invalid scene"))?;
        host.scene.advance(time);
        host.scene.theme = theme;
        host.scene.set_policies(reduced, transparency);
        host.scene.invalidate(host.scene.root, true);
        Ok(())
    }
    pub fn scene_motion(&mut self,id:u32,node:u32,command:&str,time:f64)->Result<bool,JsValue> {
        let command=serde_json::from_str(command).map_err(error)?;
        let host=self.scenes.get_mut(&id).ok_or_else(||error("invalid scene"))?;
        host.scene.advance(time);
        host.scene.layout(&mut host.text);
        host.scene.motion_command(node,command).map_err(error)
    }
    pub fn scene_animate(
        &mut self,
        id: u32,
        node: u32,
        targets: &str,
        options: &str,
        time: f64,
    ) -> Result<u32, JsValue> {
        let targets = serde_json::from_str(targets).map_err(error)?;
        let options = serde_json::from_str(options).map_err(error)?;
        let host = self
            .scenes
            .get_mut(&id)
            .ok_or_else(|| error("invalid scene"))?;
        host.scene.advance(time);
        host.scene.animate(node, targets, options).map_err(error)
    }
    pub fn scene_cancel_animation(
        &mut self,
        id: u32,
        animation: u32,
        time: f64,
    ) -> Result<(), JsValue> {
        let host = self
            .scenes
            .get_mut(&id)
            .ok_or_else(|| error("invalid scene"))?;
        host.scene.advance(time);
        host.scene.cancel_animation(animation);
        Ok(())
    }
    pub fn scene_input(&mut self, id: u32, json: &str, time: f64) -> Result<(), JsValue> {
        let input = serde_json::from_str(json).map_err(error)?;
        self.scenes
            .get_mut(&id)
            .ok_or_else(|| error("invalid scene"))?
            .scene
            .input(input, time)
            .map_err(error)
    }
    pub fn scene_navigation_input(
        &mut self,
        id: u32,
        owner: u32,
        input: &str,
        time: f64,
    ) -> Result<String, JsValue> {
        let scene = &mut self
            .scenes
            .get_mut(&id)
            .ok_or_else(|| error("invalid scene"))?
            .scene;
        let value = serde_json::from_str(input).map_err(error)?;
        serde_json::to_string(
            &scene
                .navigation_control_host_input(owner, value, time)
                .map_err(error)?,
        )
        .map_err(error)
    }
    pub fn scene_navigation_slot(
        &mut self,
        id: u32,
        owner: u32,
        key: &str,
        role: &str,
    ) -> Result<u32, JsValue> {
        self.scenes
            .get_mut(&id)
            .ok_or_else(|| error("invalid scene"))?
            .scene
            .navigation_slot(owner, key, role)
            .map_err(error)
    }
    pub fn scene_collection_input(
        &mut self,
        id: u32,
        owner: u32,
        json: &str,
        time: f64,
    ) -> Result<String, JsValue> {
        let input = serde_json::from_str::<Option<crate::scene::Input>>(json).map_err(error)?;
        let host = self
            .scenes
            .get_mut(&id)
            .ok_or_else(|| error("invalid scene"))?;
        serde_json::to_string(
            &host
                .scene
                .collection_host_input(owner, input, time)
                .map_err(error)?,
        )
        .map_err(error)
    }
    pub fn scene_scroll_host(
        &mut self,
        id: u32,
        node: u32,
        input: &str,
        time: f64,
    ) -> Result<String, JsValue> {
        let metrics = serde_json::from_str(input).map_err(error)?;
        let scene = &mut self
            .scenes
            .get_mut(&id)
            .ok_or_else(|| error("invalid scene"))?
            .scene;
        scene.advance(time);
        scene.set_scroll_host(node, metrics).map_err(error)?;
        let n = scene.get(node).map_err(error)?;
        serde_json::to_string(&n.scroll.snapshot(&n.props, time)).map_err(error)
    }
    pub fn scene_scroll_scope(&self, id: u32) -> Result<u32, JsValue> {
        Ok(self.scenes.get(&id).ok_or_else(|| error("invalid scene"))?.scene.background_scroll_root().unwrap_or(0))
    }
    pub fn scene_wheel(&mut self, id: u32, input: &str, time: f64) -> Result<bool, JsValue> {
        #[derive(serde::Deserialize)]
        #[serde(deny_unknown_fields)]
        struct Wheel {
            x: f64,
            y: f64,
            dx: f64,
            dy: f64,
            ctrl: bool,
        }
        let w: Wheel = serde_json::from_str(input).map_err(error)?;
        let scene = &mut self
            .scenes
            .get_mut(&id)
            .ok_or_else(|| error("invalid scene"))?
            .scene;
        scene.advance(time);
        scene.wheel(w.x, w.y, w.dx, w.dy, w.ctrl).map_err(error)
    }
    pub fn scene_reparent(
        &mut self,
        id: u32,
        node: u32,
        parent: u32,
        index: Option<usize>,
    ) -> Result<(), JsValue> {
        self.scenes
            .get_mut(&id)
            .ok_or_else(|| error("invalid scene"))?
            .scene
            .reparent(node, parent, index)
            .map_err(error)
    }
    pub fn scene_remove(&mut self, id: u32, node: u32) -> Result<String, JsValue> {
        serde_json::to_string(
            &self
                .scenes
                .get_mut(&id)
                .ok_or_else(|| error("invalid scene"))?
                .scene
                .destroy(node)
                .map_err(error)?,
        )
        .map_err(error)
    }
    pub fn scene_items_view_index(&self,id:u32,owner:u32,horizontal:f64,vertical:f64)->Result<i32,JsValue>{self.scenes.get(&id).ok_or_else(||error("invalid scene"))?.scene.items_view_index_at(owner,horizontal,vertical).map(|v|v.map(|i|i as i32).unwrap_or(-1)).map_err(error)}
    pub fn scene_collection_header(&mut self,id:u32,owner:u32)->Result<u32,JsValue>{self.scenes.get_mut(&id).ok_or_else(||error("invalid scene"))?.scene.collection_header_slot(owner).map_err(error)}
    pub fn scene_content_find(&self,id:u32,node:u32,name:&str)->Result<u32,JsValue>{self.scenes.get(&id).ok_or_else(||error("invalid scene"))?.scene.find_content_name(node,name).map(|id|id.unwrap_or(0)).map_err(error)}
    pub fn scene_ui_command(&self,id:u32,node:u32)->Result<String,JsValue>{
        serde_json::to_string(&self.scenes.get(&id).ok_or_else(||error("invalid scene"))?.scene.command_metadata(node).map_err(error)?).map_err(error)
    }
    pub fn scene_properties(&self, id: u32, node: u32) -> Result<String, JsValue> {
        serde_json::to_string(
            &self
                .scenes
                .get(&id)
                .ok_or_else(|| error("invalid scene"))?
                .scene
                .properties(node)
                .map_err(error)?,
        )
        .map_err(error)
    }
    pub fn scene_rich_edit_export(&self,id:u32,node:u32,mathml:bool,selection:bool)->Result<String,JsValue>{
        let scene=&self.scenes.get(&id).ok_or_else(||error("invalid scene"))?.scene;
        if selection {
            let p=scene.properties(node).map_err(error)?;let doc=p.document.as_ref().ok_or_else(||error("rich export requires RichEditBox"))?.selection(p.selection_start,p.selection_length);
            return if mathml {Ok(crate::scene::rich_edit::math::document_xml(&doc))}else{crate::scene::rich_edit::rtf::encode(&doc,&p).map_err(error)};
        }
        if mathml{scene.rich_edit_mathml(node)}else{scene.rich_edit_rtf(node)}.map_err(error)
    }
    pub fn scene_rich_edit_selection(&self,id:u32,node:u32)->Result<String,JsValue>{
        let p=self.scenes.get(&id).ok_or_else(||error("invalid scene"))?.scene.properties(node).map_err(error)?;
        let doc=p.document.as_ref().ok_or_else(||error("rich selection requires RichEditBox"))?.selection(p.selection_start,p.selection_length);
        serde_json::to_string(&serde_json::json!({"document":doc,"text":doc.plain_text()})).map_err(error)
    }
    pub fn scene_content_slot(&self, id: u32, node: u32, slot: &str) -> Result<u32, JsValue> {
        self.scenes
            .get(&id)
            .ok_or_else(|| error("invalid scene"))?
            .scene
            .composed_content_slot(node, slot)
            .map_err(error)
    }
    pub fn scene_popup_viewport(&mut self,id:u32,x:f64,y:f64,width:f64,height:f64)->Result<(),JsValue>{
        if [x,y,width,height].iter().any(|v|!v.is_finite())||width<=0.||height<=0.||width>16384.||height>16384. {return Err(error("invalid popup viewport"));}
        let host=self.scenes.get_mut(&id).ok_or_else(||error("invalid scene"))?;
        let rect=crate::model::Rect::new(x,y,width,height);
        if host.scene.popup_viewport!=Some(rect){host.scene.popup_viewport=Some(rect);if host.scene.has_floating_surface(){host.scene.invalidate(host.scene.root,true);}}
        Ok(())
    }
    pub fn scene_frame(
        &mut self,
        id: u32,
        time: f64,
        width: f64,
        height: f64,
        dpr: f64,
    ) -> Result<String, JsValue> {
        let frame_started = frame_clock();
        if width * dpr > 8192. || height * dpr > 8192. || width * height * dpr * dpr > 16_777_216. {
            return Err(error(
                "surface exceeds supported GPU/Canvas allocation budget",
            ));
        }
        let host = self
            .scenes
            .get_mut(&id)
            .ok_or_else(|| error("invalid scene"))?;
        host.scene.advance(time);
        host.scene.resize(width, height, dpr).map_err(error)?;
        for node in host.scene.nodes.values_mut() {
            if let Some(nav) = &mut node.nav {
                measure_navigation(nav, &host.text.ctx)?;
            }
        }
        let sources = host.scene.image_sources();
        host.scene
            .images
            .retain(|source, _| sources.contains(source));
        match &mut host.backend {
            SceneBackend::Canvas(b) => b
                .images
                .borrow_mut()
                .retain(|source, _| sources.contains(source)),
            SceneBackend::Gpu(b) => b.retain_images(&sources),
        }
        host.scene.layout(&mut host.text);
        host.scene.validate_panel_layouts().map_err(error)?;
        let layout_finished = frame_clock();
        let floating = host.floating_canvas.is_some();
        let mut list = if floating {
            host.scene.base_display_list()
        } else {
            host.scene.display_list()
        };
        // A floating animation does not dirty the retained content underneath
        // it. Compare the actual display list, including transforms, material
        // values and raster revisions, instead of repainting an unchanged base.
        // GPU presentation still runs each frame to observe context loss.
        let surface=host.scene.surface_bounds();
        let raster_height=surface.height;
        list.insert(0,render::Draw::Transform{matrix:[1.,0.,0.,1.,-surface.x,-surface.y]});
        list.insert(0,render::Draw::Save);list.push(render::Draw::Restore);
        if raster_height*dpr>8192.||surface.width*raster_height*dpr*dpr>16_777_216.{return Err(error("presentation surface exceeds allocation budget"));}
        let retain = !host.scene.has_composition_animation() && matches!(&host.backend, SceneBackend::Canvas(_)) && !render::contains_external_image(&list);
        let reuse = retain && host.retained_base.as_ref().is_some_and(|(old_surface,old_dpr,old_list)|*old_surface==surface && *old_dpr==dpr && *old_list==list);
        let list_finished = frame_clock();
        let mut backend = if reuse {
            host.base_reuses += 1;
            serde_json::json!({"kind":"Canvas2D","lost":false,"generation":1})
        } else {
            host.base_paints += 1;
            let info=paint_scene_backend(&mut host.backend, &list, surface.width, raster_height, dpr)?;
            host.retained_base=retain.then_some((surface,dpr,list));
            info
        };
        backend["basePaints"]=host.base_paints.into();
        backend["baseReuses"]=host.base_reuses.into();
        if let SceneBackend::Canvas(canvas)=&host.backend {
            backend["vectorRasterHits"]=canvas.vector_raster_hits.get().into();
            backend["retainedRasterHits"]=canvas.retained_raster_hits.get().into();
        }
        host.lost = backend["lost"].as_bool().unwrap_or(false);
        let bounds = host.scene.floating_surface_bounds();
        let visible = floating && width > 0. && raster_height > 0.
            && host.scene.has_floating_surface();
        if let Some(canvas) = &host.floating_canvas {
            host.popup_input.sync(canvas, if visible { host.scene.floating_input_regions() } else { Vec::new() });
        }
        let mut floating_info = serde_json::Value::Null;
        if visible {
            if bounds.width * dpr > 8192.
                || bounds.height * dpr > 8192.
                || bounds.width * bounds.height * dpr * dpr > 16_777_216.
            {
                return Err(error(
                    "floating surface exceeds supported allocation budget",
                ));
            }
            if host.floating_backend.is_none() {
                let canvas = host.floating_canvas.clone().unwrap();
                host.floating_backend = Some(match &host.backend {
                    SceneBackend::Canvas(main) => {
                        let context = canvas.get_context("2d")?.unwrap().dyn_into()?;
                        let mut b = render::CanvasBackend::new(canvas, context)?;
                        b.images = main.images.clone();
                        SceneBackend::Canvas(b)
                    }
                    SceneBackend::Gpu(main) => {
                        let mut b = crate::gpu::GpuBackend::new(canvas)?;
                        b.images = main.images.clone();
                        SceneBackend::Gpu(b)
                    }
                });
            }
            let source = match &host.backend {
                SceneBackend::Canvas(b) => &b.canvas,
                SceneBackend::Gpu(b) => &b.canvas,
            };
            let seed = if let Some(seed) = &host.floating_backdrop {
                seed.clone()
            } else {
                source
                    .owner_document()
                    .unwrap()
                    .create_element("canvas")?
                    .dyn_into::<HtmlCanvasElement>()?
            };
            let sw = (bounds.width * dpr).ceil() as u32;
            let sh = (bounds.height * dpr).ceil() as u32;
            if seed.width() != sw { seed.set_width(sw); }
            if seed.height() != sh { seed.set_height(sh); }
            let context = seed
                .get_context("2d")?
                .unwrap()
                .dyn_into::<CanvasRenderingContext2d>()?;
            context.set_fill_style_str(match host.scene.theme {
                crate::enums::Theme::Light => "#f3f3f3",
                crate::enums::Theme::Dark => "#202020",
                crate::enums::Theme::HighContrast => "#000000",
            });
            context.fill_rect(0., 0., seed.width() as f64, seed.height() as f64);
            if let Some((page, rect)) = &host.page_backdrop {
                context.draw_image_with_html_canvas_element_and_dw_and_dh(
                    page, (rect.x-bounds.x)*dpr, (rect.y-bounds.y)*dpr,
                    rect.width*dpr, rect.height*dpr,
                )?;
            }
            context.draw_image_with_html_canvas_element(
                source,
                (surface.x-bounds.x) * dpr,
                (surface.y-bounds.y) * dpr,
            )?;
            let target = host.floating_backend.as_mut().unwrap();
            match target {
                SceneBackend::Canvas(b) => b.set_external_backdrop(&seed)?,
                SceneBackend::Gpu(b) => {
                    b.external_backdrop = Some(seed.clone());
                    b.retain_images(&sources);
                }
            }
            host.floating_backdrop = Some(seed);
            let mut commands = vec![
                render::Draw::Save,
                render::Draw::Transform {
                    matrix: [1., 0., 0., 1., -bounds.x, -bounds.y],
                },
            ];
            commands.extend(host.scene.floating_display_list());
            commands.push(render::Draw::Restore);
            floating_info =
                paint_scene_backend(target, &commands, bounds.width, bounds.height, dpr)?;
        }
        if floating_info["lost"].as_bool()==Some(true){backend["lost"]=true.into();}
        let paint_finished = frame_clock();
        #[derive(serde::Serialize)]
        #[serde(rename_all="camelCase")]
        struct FrameSnapshot {#[serde(flatten)] scene:crate::scene::Snapshot,backend:serde_json::Value,floating_surface:serde_json::Value}
        let mut snapshot=host.scene.snapshot();
        // Properties include the complete public schema, even on small template
        // nodes. Send them only when their actual values change. Comparing the
        // actual values also observes internal template/editor mutations,
        // which need not go through a public property update or layout revision.
        host.projected_properties.retain(|id,_|host.scene.nodes.contains_key(id));
        for node in &mut snapshot.nodes {
            if host.projected_properties.get(&node.id)==Some(&node.props) {
                node.props.snapshot_omit=true;
            } else {
                host.projected_properties.insert(node.id,node.props.clone());
            }
        }
        let snapshot_finished = frame_clock();
        backend["rustFrameTimings"] = serde_json::json!({"layoutMs":layout_finished-frame_started,"displayListMs":list_finished-layout_finished,"paintMs":paint_finished-list_finished,"snapshotMs":snapshot_finished-paint_finished,"previousSerializeMs":host.last_serialize_ms});
        let result = serde_json::to_string(&FrameSnapshot{scene:snapshot,backend,floating_surface:serde_json::json!({"visible":visible,"bounds":bounds,"backend":floating_info})}).map_err(error);
        host.last_serialize_ms=frame_clock()-snapshot_finished;
        result
    }

    pub fn scene_image(
        &mut self,
        id: u32,
        source: String,
        image: web_sys::HtmlImageElement,
    ) -> Result<(), JsValue> {
        let host = self
            .scenes
            .get_mut(&id)
            .ok_or_else(|| error("invalid scene"))?;
        host.retained_base = None;
        host.scene
            .image_ready(
                source.clone(),
                [image.natural_width() as f64, image.natural_height() as f64],
            )
            .map_err(error)?;
        match &host.backend {
            SceneBackend::Canvas(b) => {
                b.images.borrow_mut().insert(source, image);
            }
            SceneBackend::Gpu(b) => {
                b.images.borrow_mut().insert(source, image);
            }
        }
        Ok(())
    }
    pub fn scene_fonts_changed(&mut self, id: u32) -> Result<(), JsValue> {
        let host = self
            .scenes
            .get_mut(&id)
            .ok_or_else(|| error("invalid scene"))?;
        host.retained_base = None;
        host.text.invalidate();
        host.scene.invalidate_navigation_fonts();
        if let SceneBackend::Gpu(b) = &mut host.backend {
            b.invalidate_text();
        }
        Ok(())
    }
    pub fn scene_restore(&mut self, id: u32) -> Result<(), JsValue> {
        let host = self
            .scenes
            .get_mut(&id)
            .ok_or_else(|| error("invalid scene"))?;
        host.floating_backend = None;
        host.retained_base = None;
        if let SceneBackend::Gpu(old) = &mut host.backend {
            let mut backend = crate::gpu::GpuBackend::new(old.canvas.clone())?;
            backend.images = old.images.clone();
            backend.generation = old.generation + 1;
            host.backend = SceneBackend::Gpu(backend);
            host.lost = false;
            host.text.invalidate();
            host.scene.invalidate(host.scene.root, true);
        }
        Ok(())
    }
    pub fn scene_destroy(&mut self, id: u32) -> Result<(), JsValue> {
        let mut host = self
            .scenes
            .remove(&id)
            .ok_or_else(|| error("invalid or destroyed scene"))?;
        if let Some(backend)=&mut host.floating_backend {
            match backend {SceneBackend::Canvas(b)=>b.release(),SceneBackend::Gpu(b)=>b.release()};
        }
        if let Some(canvas)=host.floating_backdrop {canvas.set_width(0);canvas.set_height(0);}
        match &mut host.backend {
            SceneBackend::Canvas(b) => b.release(),
            SceneBackend::Gpu(b) => b.release(),
        };
        Ok(())
    }
}
