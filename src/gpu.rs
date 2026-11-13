//! Minimal GPU executor. Geometry, input and typography remain Rust-owned.
//! Glyph/run bitmaps are measured and rasterized with the same font/DPR used by
//! the reference backend, then uploaded as textures; a whole scene is never blitted.
use crate::{material, model::Rect, render::Draw, scene::Matrix};
use std::{cell::RefCell, collections::HashMap, rc::Rc};
use wasm_bindgen::{JsCast, JsValue};
use web_sys::{
    CanvasRenderingContext2d, HtmlCanvasElement, HtmlImageElement, WebGl2RenderingContext as Gl,
    WebGlFramebuffer, WebGlProgram, WebGlRenderbuffer, WebGlShader, WebGlTexture,
};
fn err(message: impl ToString) -> JsValue {
    JsValue::from_str(&message.to_string())
}
const VERTEX: &str = r#"#version 300 es
precision highp float;
uniform mat3 u_transform;uniform vec2 u_resolution;uniform vec4 u_rect;uniform vec2 u_expansion;out vec2 v_uv;
void main(){vec2 uv=vec2(float(gl_VertexID&1),float((gl_VertexID>>1)&1));v_uv=uv+(uv*2.-1.)*u_expansion/u_rect.zw;vec3 p=u_transform*vec3(u_rect.xy+v_uv*u_rect.zw,1.);gl_Position=vec4(p.x/u_resolution.x*2.-1.,1.-p.y/u_resolution.y*2.,0.,1.);}
"#;
const FRAGMENT: &str = r#"#version 300 es
precision highp float;
in vec2 v_uv;out vec4 outputColor;
uniform vec2 u_size;uniform vec4 u_clipRadiiY;uniform vec4 u_radii;uniform vec4 u_color;uniform vec4 u_color2;uniform vec4 u_gradient;uniform vec2 u_offsets;uniform float u_width;uniform int u_kind;uniform int u_flip;uniform sampler2D u_texture;
uniform int u_stopCount;uniform float u_stopOffsets[32];uniform vec4 u_stopColors[32];
uniform vec2 u_center;uniform vec2 u_origin;uniform vec2 u_radius;uniform int u_spread;
uniform vec2 u_path[3];uniform int u_pathCount;uniform vec3 u_arc;uniform vec2 u_arcCenter;
float segmentDistance(vec2 p,vec2 a,vec2 b){vec2 v=b-a;return length(p-a-v*clamp(dot(p-a,v)/max(dot(v,v),.0000001),0.,1.));}
vec4 gradientColor(float t){
 if(u_spread==1)t=fract(t);else if(u_spread==2){t=mod(t,2.);t=t>1.?2.-t:t;}
 vec4 c=u_stopColors[0];
 for(int i=1;i<32;i++){if(i>=u_stopCount)break;
   if(t<u_stopOffsets[i])return mix(c,u_stopColors[i],clamp((t-u_stopOffsets[i-1])/max(u_stopOffsets[i]-u_stopOffsets[i-1],.000001),0.,1.));
   c=u_stopColors[i];
 }return c;
}
ACRYLIC_GRAPH
void main(){
 if(u_kind==4||u_kind==5){outputColor=acrylicPixel(u_kind);return;}
 if(u_kind==12){vec2 uv=vec2(v_uv.x,u_flip==1?1.-v_uv.y:v_uv.y);float a=texture(u_texture,uv).a*u_color.a;outputColor=vec4(u_color.rgb*a,a);return;}
 if(u_kind==2){vec2 uv=vec2(v_uv.x,u_flip==1?1.-v_uv.y:v_uv.y);vec4 texel=texture(u_texture,uv);outputColor=vec4(texel.rgb*u_color.rgb*u_color.a,texel.a*u_color.a);return;}
 if(u_kind==8){
   vec2 p=v_uv*u_size;
   if(any(lessThan(p,vec2(0.)))||any(greaterThan(p,u_size)))discard;
   vec4 rx=u_radii,ry=u_clipRadiiY;
   if(rx.x>0.&&ry.x>0.&&p.x<rx.x&&p.y<ry.x&&length((p-vec2(rx.x,ry.x))/vec2(rx.x,ry.x))>1.)discard;
   if(rx.y>0.&&ry.y>0.&&p.x>u_size.x-rx.y&&p.y<ry.y&&length((p-vec2(u_size.x-rx.y,ry.y))/vec2(rx.y,ry.y))>1.)discard;
   if(rx.z>0.&&ry.z>0.&&p.x>u_size.x-rx.z&&p.y>u_size.y-ry.z&&length((p-(u_size-vec2(rx.z,ry.z)))/vec2(rx.z,ry.z))>1.)discard;
   if(rx.w>0.&&ry.w>0.&&p.x<rx.w&&p.y>u_size.y-ry.w&&length((p-vec2(rx.w,u_size.y-ry.w))/vec2(rx.w,ry.w))>1.)discard;
   outputColor=vec4(1.);return;
 }
 vec2 p=(v_uv-.5)*u_size;vec2 halfSize=(u_size-vec2(u_width))*.5;float radius=v_uv.y<.5?(v_uv.x<.5?u_radii.x:u_radii.y):(v_uv.x<.5?u_radii.w:u_radii.z);radius=min(radius,min(halfSize.x,halfSize.y));vec2 q=abs(p)-halfSize+radius;float d=length(max(q,0.))+min(max(q.x,q.y),0.)-radius;
 if((u_kind==8||u_kind==10)&&d>0.)discard;
 float dist=u_width>0.?abs(d)-u_width*.5:d;
 if(u_kind==3)dist=(length(p/max(halfSize,vec2(.001)))-1.)*min(halfSize.x,halfSize.y);
 if(u_kind==7){vec2 q=v_uv*u_size;dist=segmentDistance(q,u_path[0],u_path[1]);if(u_pathCount==3)dist=min(dist,segmentDistance(q,u_path[1],u_path[2]));dist-=u_width*.5;}
 if(u_kind==9){
   vec2 q=v_uv*u_size-u_arcCenter;float angle=mod(atan(q.y,q.x)-u_arc.y+12.5663706144,6.2831853072);
   float radial=abs(length(q)-u_arc.x);float sweep=u_arc.z;
   vec2 a=u_arc.x*vec2(cos(u_arc.y),sin(u_arc.y));vec2 b=u_arc.x*vec2(cos(u_arc.y+sweep),sin(u_arc.y+sweep));
   dist=(sweep>=6.28318||angle<=sweep?radial:min(length(q-a),length(q-b)))-u_width*.5;
 }
 float alpha=clamp(.5-dist/max(fwidth(dist),.0001),0.,1.);vec4 color=u_color;
 if(u_kind==1||u_kind==6){float t;
 if(u_kind==6){vec2 f=(u_origin-u_center)/u_radius;vec2 q=(v_uv-u_origin)/u_radius;float b=dot(f,q),a=1.-dot(f,f),qq=dot(q,q),disc=b*b+a*qq;
 t=abs(a)<.000001?(abs(b)<.000001?0.:-qq/(2.*b)):(b+sqrt(max(0.,disc)))/a;
 if(disc<0.||t<0.){color=u_stopColors[u_stopCount-1];float alpha=color.a*clamp(.5-dist/max(fwidth(dist),.0001),0.,1.);outputColor=vec4(color.rgb*alpha,alpha);return;}}
 else{vec2 v=u_gradient.zw-u_gradient.xy;t=dot(v_uv-u_gradient.xy,v)/max(dot(v,v),.00000001);}
 color=gradientColor(t);}

 float a=color.a*alpha;outputColor=vec4(color.rgb*a,a);
}
"#;
struct Texture {
    value: WebGlTexture,
    width: f64,
    height: f64,
    left: f64,
    ascent: f64,
}
struct Layer {
    texture: WebGlTexture,
    framebuffer: WebGlFramebuffer,
    stencil: WebGlRenderbuffer,
    width: i32,
    height: i32,
}
#[derive(Clone, Default)]
struct State {
    matrix: Matrix,
    clips: Vec<(Matrix, Rect, [[f64; 2]; 4])>,
}
pub struct GpuBackend {
    pub external_backdrop: Option<HtmlCanvasElement>,
    pub canvas: HtmlCanvasElement,
    gl: Gl,
    program: WebGlProgram,
    noise: WebGlTexture,
    pub effect_passes: u64,
    raster: HtmlCanvasElement,
    ctx: CanvasRenderingContext2d,
    vector_backend: crate::render::CanvasBackend,
    textures: RefCell<HashMap<String, Texture>>,
    raster_revisions: RefCell<HashMap<u64,u64>>,
    layers: RefCell<Vec<Layer>>,
    pub images: Rc<RefCell<HashMap<String, HtmlImageElement>>>,
    pub draws: u64,
    pub uploads: u64,
    pub generation: u64,
}
impl GpuBackend {
    pub fn new(canvas: HtmlCanvasElement) -> Result<Self, JsValue> {
        let attrs = web_sys::WebGlContextAttributes::new();
        attrs.set_alpha(true);
        attrs.set_stencil(true);
        attrs.set_antialias(true);
        attrs.set_premultiplied_alpha(true);
        let gl = canvas
            .get_context_with_context_options("webgl2", &attrs)?
            .ok_or_else(|| err("WebGL2 is unavailable; explicitly select Canvas2D"))?
            .dyn_into::<Gl>()?;
        let vs = Self::shader(&gl, Gl::VERTEX_SHADER, VERTEX)?;
        let fs = Self::shader(
            &gl,
            Gl::FRAGMENT_SHADER,
            &FRAGMENT.replace("ACRYLIC_GRAPH", include_str!("acrylic.glsl")),
        )?;
        let program = gl
            .create_program()
            .ok_or_else(|| err("GPU program allocation failed"))?;
        gl.attach_shader(&program, &vs);
        gl.attach_shader(&program, &fs);
        gl.link_program(&program);
        gl.delete_shader(Some(&vs));
        gl.delete_shader(Some(&fs));
        if !gl
            .get_program_parameter(&program, Gl::LINK_STATUS)
            .as_bool()
            .unwrap_or(false)
        {
            let log = gl.get_program_info_log(&program).unwrap_or_default();
            gl.delete_program(Some(&program));
            return Err(err(log));
        }
        let document = canvas
            .owner_document()
            .ok_or_else(|| err("canvas document missing"))?;
        let raster = document
            .create_element("canvas")?
            .dyn_into::<HtmlCanvasElement>()?;
        let ctx: CanvasRenderingContext2d = raster.get_context("2d")?.unwrap().dyn_into()?;
        let noise = gl
            .create_texture()
            .ok_or_else(|| err("noise texture allocation failed"))?;
        gl.active_texture(Gl::TEXTURE1);
        gl.bind_texture(Gl::TEXTURE_2D, Some(&noise));
        gl.tex_parameteri(Gl::TEXTURE_2D, Gl::TEXTURE_MIN_FILTER, Gl::LINEAR as i32);
        gl.tex_parameteri(Gl::TEXTURE_2D, Gl::TEXTURE_MAG_FILTER, Gl::LINEAR as i32);
        gl.tex_parameteri(Gl::TEXTURE_2D, Gl::TEXTURE_WRAP_S, Gl::REPEAT as i32);
        gl.tex_parameteri(Gl::TEXTURE_2D, Gl::TEXTURE_WRAP_T, Gl::REPEAT as i32);
        gl.tex_image_2d_with_i32_and_i32_and_i32_and_format_and_type_and_opt_u8_array(
            Gl::TEXTURE_2D,
            0,
            Gl::RGBA as i32,
            256,
            256,
            0,
            Gl::RGBA,
            Gl::UNSIGNED_BYTE,
            Some(include_bytes!(concat!(env!("OUT_DIR"), "/noise.rgba"))),
        )?;
        gl.active_texture(Gl::TEXTURE0);
        let vector_backend = crate::render::CanvasBackend::new(raster.clone(), ctx.clone())?;
        Ok(Self {
            external_backdrop: None,
            noise,
            effect_passes: 0,
            canvas,
            gl,
            program,
            vector_backend,
            raster,
            ctx,
            textures: Default::default(),
            raster_revisions: Default::default(),
            layers: Default::default(),
            images: Default::default(),
            draws: 0,
            uploads: 0,
            generation: 1,
        })
    }
    fn shader(gl: &Gl, kind: u32, source: &str) -> Result<WebGlShader, JsValue> {
        let shader = gl
            .create_shader(kind)
            .ok_or_else(|| err("shader allocation failed"))?;
        gl.shader_source(&shader, source);
        gl.compile_shader(&shader);
        if !gl
            .get_shader_parameter(&shader, Gl::COMPILE_STATUS)
            .as_bool()
            .unwrap_or(false)
        {
            let log = gl.get_shader_info_log(&shader).unwrap_or_default();
            gl.delete_shader(Some(&shader));
            return Err(err(log));
        }
        Ok(shader)
    }
    pub fn retain_images(&mut self, sources: &std::collections::HashSet<String>) {
        self.images
            .borrow_mut()
            .retain(|source, _| sources.contains(source));
        self.textures.borrow_mut().retain(|key, texture| {
            let keep = key
                .strip_prefix("image:")
                .is_none_or(|source| sources.contains(source));
            if !keep {
                self.gl.delete_texture(Some(&texture.value));
            }
            keep
        });
    }
    pub fn invalidate_text(&mut self) {
        self.raster_revisions.borrow_mut().clear();
        for texture in self.textures.borrow_mut().drain().map(|(_, v)| v) {
            self.gl.delete_texture(Some(&texture.value));
        }
    }
    pub fn release_rasters(&mut self) {
        self.vector_backend.release_rasters();
        self.invalidate_text();
        for layer in self.layers.borrow_mut().drain(..) {
            self.delete_layer(layer);
        }
        self.raster.set_width(0);
        self.raster.set_height(0);
        self.canvas.set_width(0);
        self.canvas.set_height(0);
    }
    pub fn release(&mut self) {
        self.release_rasters();
        self.gl.delete_texture(Some(&self.noise));
        self.gl.delete_program(Some(&self.program));
        self.images.borrow_mut().clear();
    }
    fn delete_layer(&self, layer: Layer) {
        self.gl.delete_texture(Some(&layer.texture));
        self.gl.delete_framebuffer(Some(&layer.framebuffer));
        self.gl.delete_renderbuffer(Some(&layer.stencil));
    }
    fn texture(&self) -> Result<WebGlTexture, JsValue> {
        let g = &self.gl;
        let t = g
            .create_texture()
            .ok_or_else(|| err("texture allocation failed"))?;
        g.bind_texture(Gl::TEXTURE_2D, Some(&t));
        g.tex_parameteri(Gl::TEXTURE_2D, Gl::TEXTURE_MIN_FILTER, Gl::LINEAR as i32);
        g.tex_parameteri(Gl::TEXTURE_2D, Gl::TEXTURE_MAG_FILTER, Gl::LINEAR as i32);
        g.tex_parameteri(Gl::TEXTURE_2D, Gl::TEXTURE_WRAP_S, Gl::CLAMP_TO_EDGE as i32);
        g.tex_parameteri(Gl::TEXTURE_2D, Gl::TEXTURE_WRAP_T, Gl::CLAMP_TO_EDGE as i32);
        Ok(t)
    }
    fn layer(&self, w: i32, h: i32) -> Result<Layer, JsValue> {
        let index = self
            .layers
            .borrow()
            .iter()
            .position(|l| l.width == w && l.height == h);
        if let Some(index) = index {
            return Ok(self.layers.borrow_mut().swap_remove(index));
        }
        let reusable={self.layers.borrow_mut().pop()};
        if let Some(mut layer)=reusable {
            let g=&self.gl;g.bind_texture(Gl::TEXTURE_2D,Some(&layer.texture));
            g.tex_image_2d_with_i32_and_i32_and_i32_and_format_and_type_and_opt_u8_array(Gl::TEXTURE_2D,0,Gl::RGBA as i32,w,h,0,Gl::RGBA,Gl::UNSIGNED_BYTE,None)?;
            g.bind_renderbuffer(Gl::RENDERBUFFER,Some(&layer.stencil));g.renderbuffer_storage(Gl::RENDERBUFFER,Gl::DEPTH24_STENCIL8,w,h);
            layer.width=w;layer.height=h;return Ok(layer);
        }
        let g = &self.gl;
        let texture = self.texture()?;
        g.tex_image_2d_with_i32_and_i32_and_i32_and_format_and_type_and_opt_u8_array(
            Gl::TEXTURE_2D,
            0,
            Gl::RGBA as i32,
            w,
            h,
            0,
            Gl::RGBA,
            Gl::UNSIGNED_BYTE,
            None,
        )?;
        let framebuffer = g
            .create_framebuffer()
            .ok_or_else(|| err("framebuffer allocation failed"))?;
        g.bind_framebuffer(Gl::FRAMEBUFFER, Some(&framebuffer));
        g.framebuffer_texture_2d(
            Gl::FRAMEBUFFER,
            Gl::COLOR_ATTACHMENT0,
            Gl::TEXTURE_2D,
            Some(&texture),
            0,
        );
        let stencil = g
            .create_renderbuffer()
            .ok_or_else(|| err("stencil allocation failed"))?;
        g.bind_renderbuffer(Gl::RENDERBUFFER, Some(&stencil));
        g.renderbuffer_storage(Gl::RENDERBUFFER, Gl::DEPTH24_STENCIL8, w, h);
        g.framebuffer_renderbuffer(
            Gl::FRAMEBUFFER,
            Gl::DEPTH_STENCIL_ATTACHMENT,
            Gl::RENDERBUFFER,
            Some(&stencil),
        );
        if g.check_framebuffer_status(Gl::FRAMEBUFFER) != Gl::FRAMEBUFFER_COMPLETE {
            return Err(err("incomplete GPU layer"));
        }
        Ok(Layer {
            texture,
            framebuffer,
            stencil,
            width: w,
            height: h,
        })
    }
    fn uniform4(&self, name: &str, value: [f64; 4]) {
        self.gl.uniform4f(
            self.gl.get_uniform_location(&self.program, name).as_ref(),
            value[0] as f32,
            value[1] as f32,
            value[2] as f32,
            value[3] as f32,
        );
    }
    fn quad(
        &mut self,
        rect: Rect,
        matrix: Matrix,
        size: [f64; 2],
        radii: [f64; 4],
        color: [f64; 4],
        style: (f64, i32),
    ) {
        let (stroke, kind) = style;
        if rect.width <= 0. || rect.height <= 0. {
            return;
        }
        let density = f64::from(self.canvas.width()) / size[0];
        let sx = matrix.0[0].hypot(matrix.0[1]) * density;
        let sy = matrix.0[2].hypot(matrix.0[3]) * density;
        // SDF antialiasing needs fragments outside the geometric bounds as well
        // as inside. An exact quad dropped the half-covered top/left edge at
        // fractional DPR before the fragment shader could evaluate coverage.
        let fringe = if !matches!(kind, 2 | 4 | 5 | 12) && sx > 1e-6 && sy > 1e-6 {
            [1. / sx, 1. / sy]
        } else {
            [0.; 2]
        };
        let g = &self.gl;
        g.uniform2f(
            g.get_uniform_location(&self.program, "u_expansion")
                .as_ref(),
            fringe[0] as f32,
            fringe[1] as f32,
        );
        // Samplers remain active even when a uniform selects the shape branch.
        // Never leave the current render target bound as a sampled texture while
        // drawing a shape/stencil mask (including first/incremental React frames).
        if !matches!(kind, 2 | 4 | 5 | 12) {
            g.bind_texture(Gl::TEXTURE_2D, None);
        }
        let [a, b, c, d, e, f] = matrix.0;
        g.uniform_matrix3fv_with_f32_array(
            g.get_uniform_location(&self.program, "u_transform")
                .as_ref(),
            false,
            &[
                a as f32, b as f32, 0., c as f32, d as f32, 0., e as f32, f as f32, 1.,
            ],
        );
        g.uniform2f(
            g.get_uniform_location(&self.program, "u_resolution")
                .as_ref(),
            size[0] as f32,
            size[1] as f32,
        );
        self.uniform4("u_rect", [rect.x, rect.y, rect.width, rect.height]);
        self.uniform4("u_radii", radii);
        self.uniform4("u_color", color);
        g.uniform2f(
            g.get_uniform_location(&self.program, "u_size").as_ref(),
            rect.width as f32,
            rect.height as f32,
        );
        g.uniform1f(
            g.get_uniform_location(&self.program, "u_width").as_ref(),
            stroke as f32,
        );
        g.uniform1i(
            g.get_uniform_location(&self.program, "u_kind").as_ref(),
            kind,
        );
        g.draw_arrays(Gl::TRIANGLE_STRIP, 0, 4);
        self.draws += 1;
    }
    fn clip(&mut self, state: &State, size: [f64; 2]) {
        let g = &self.gl;
        g.stencil_mask(0xff);
        g.clear_stencil(0);
        g.clear(Gl::STENCIL_BUFFER_BIT);
        if state.clips.is_empty() {
            g.disable(Gl::STENCIL_TEST);
            return;
        }
        g.enable(Gl::STENCIL_TEST);
        g.color_mask(false, false, false, false);
        for (index, (matrix, rect, radius)) in state.clips.iter().enumerate() {
            self.gl.stencil_func(Gl::EQUAL, index as i32, 0xff);
            self.gl.stencil_op(Gl::KEEP, Gl::KEEP, Gl::INCR);
            // DirectX and OpenGL include opposite horizontal edges when an
            // axis-aligned clip lies exactly on pixel centers. Change only
            // those stencil ties, by more than hardware subpixel quantization;
            // painted geometry and non-tie clipping remain untouched.
            let mut clip_rect = *rect;
            if radius.iter().flatten().all(|v| *v == 0.)
                && matrix.0[1].abs() < 1e-12
                && matrix.0[2].abs() < 1e-12
                && matrix.0[3].abs() > 1e-12
            {
                let density = f64::from(self.canvas.width()) / size[0];
                let adjust = |local: f64| {
                    let pixel = (matrix.0[5] + matrix.0[3] * local) * density;
                    if (pixel - pixel.floor() - 0.5).abs() < 1e-5 {
                        local - (1. / 128.) / density / matrix.0[3]
                    } else {
                        local
                    }
                };
                let top = adjust(rect.y);
                let bottom = adjust(rect.y + rect.height);
                clip_rect.y = top;
                clip_rect.height = (bottom - top).max(0.);
            }
            self.uniform4("u_clipRadiiY", radius.map(|v| v[1]));
            self.quad(
                clip_rect,
                *matrix,
                size,
                radius.map(|v| v[0]),
                [0.; 4],
                (
                    0.,
                    if radius.iter().flatten().any(|v| *v > 0.) {
                        8
                    } else {
                        10
                    },
                ),
            );
        }
        self.gl.color_mask(true, true, true, true);
        self.gl
            .stencil_func(Gl::EQUAL, state.clips.len() as i32, 0xff);
        self.gl.stencil_op(Gl::KEEP, Gl::KEEP, Gl::KEEP);
        self.gl.stencil_mask(0);
    }
    fn upload_text(
        &mut self,
        key: &str,
        text: &str,
        requested_font: &crate::typography::Font,
        dpr: f64,
        color: &str,
        phase: Option<[f64; 2]>,
    ) -> Result<(), JsValue> {
        self.ctx.set_font(&requested_font.css());
        let m = self.ctx.measure_text(text)?;
        let left = m.actual_bounding_box_left();
        let ascent = m.actual_bounding_box_ascent();
        // Rasterize the run at its final physical-pixel phase and place the
        // texture on whole pixels. Fractional texture origins otherwise filter
        // an already antialiased glyph a second time (especially 11px badges).
        let origin = if let Some([x, y]) = phase {
            [
                (left * dpr - x).ceil() / dpr + x / dpr + 2. / dpr,
                (ascent * dpr - y).ceil() / dpr + y / dpr + 2. / dpr,
            ]
        } else {
            [left + 2. / dpr, ascent + 2. / dpr]
        };
        let w = ((left + m.actual_bounding_box_right()).max(0.) * dpr).ceil() as u32 + 4;
        let h = ((ascent + m.actual_bounding_box_descent()).max(0.) * dpr).ceil() as u32 + 4;
        if w > 8192 || h > 8192 {
            return Err(err("glyph run texture exceeds GPU limits; split the text"));
        }
        self.raster.set_width(w);
        self.raster.set_height(h);
        self.ctx.set_transform(dpr, 0., 0., dpr, 0., 0.)?;
        self.ctx.set_font(&requested_font.css());
        self.ctx.set_fill_style_str(color);
        self.ctx.fill_text(text, origin[0], origin[1])?;
        let t = self.texture()?;
        self.gl.pixel_storei(Gl::UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
        self.gl
            .tex_image_2d_with_u32_and_u32_and_html_canvas_element(
                Gl::TEXTURE_2D,
                0,
                Gl::RGBA as i32,
                Gl::RGBA,
                Gl::UNSIGNED_BYTE,
                &self.raster,
            )?;
        self.textures.borrow_mut().insert(
            key.into(),
            Texture {
                value: t,
                width: w as f64 / dpr,
                height: h as f64 / dpr,
                left: origin[0],
                ascent: origin[1],
            },
        );
        self.uploads += 1;
        Ok(())
    }
    pub fn cached_surfaces(&self) -> usize {
        self.layers.borrow().len()
    }
    #[allow(clippy::too_many_arguments)]
    fn acrylic(
        &mut self,
        rect: Rect,
        colors: &material::AcrylicColors,
        weight: f64,
        state: &State,
        size: [f64; 2],
        dpr: f64,
        surfaces: &[&WebGlTexture],
        target: &WebGlFramebuffer,
        desktop: bool,
    ) -> Result<(), JsValue> {
        // InApp BackdropBrush crops its input before Gaussian downsampling.
        let sample = state.matrix.bounds(rect);
        let effect_size = if desktop {
            size
        } else {
            [sample.width.max(1e-6), sample.height.max(1e-6)]
        };
        let w = (effect_size[0] / 4.).ceil().max(1.) as i32;
        let h = (effect_size[1] / 4.).ceil().max(1.) as i32;
        let a = self.layer(w, h)?;
        let b = self.layer(w, h)?;
        self.gl
            .bind_framebuffer(Gl::FRAMEBUFFER, Some(&a.framebuffer));
        self.gl.viewport(0, 0, w, h);
        self.gl.disable(Gl::STENCIL_TEST);
        let mut fallback = material::rgba(&colors.fallback);
        fallback[3] = 1.;
        self.gl.clear_color(
            fallback[0] as f32,
            fallback[1] as f32,
            fallback[2] as f32,
            1.,
        );
        self.gl.clear(Gl::COLOR_BUFFER_BIT);
        self.gl.clear_color(0., 0., 0., 0.);
        self.gl.uniform1i(
            self.gl
                .get_uniform_location(&self.program, "u_flip")
                .as_ref(),
            1,
        );
        let full = Rect::new(0., 0., size[0], size[1]);
        for texture in surfaces {
            self.gl.bind_texture(Gl::TEXTURE_2D, Some(texture));
            let source_transform = if desktop {
                Matrix::default()
            } else {
                Matrix([1., 0., 0., 1., -sample.x, -sample.y])
            };
            self.quad(
                full,
                source_transform,
                effect_size,
                [0.; 4],
                [1.; 4],
                (0., 2),
            );
        }
        self.gl.disable(Gl::BLEND);
        // Half a texel of the downsampled source keeps the clamp inside it.
        let half_x = size[0] / w as f64 / 2.;
        let half_y = size[1] / h as f64 / 2.;
        // Both CreateBackdropBrush and HostBackdrop crop to the brush visual
        // before Gaussian HARD-border extension, including narrow edge buttons.
        let bounds = if desktop {
            [
                (sample.x + half_x.min(sample.width / 2.)) / size[0],
                1. - (sample.y + sample.height - half_y.min(sample.height / 2.)) / size[1],
                (sample.x + sample.width - half_x.min(sample.width / 2.)) / size[0],
                1. - (sample.y + half_y.min(sample.height / 2.)) / size[1],
            ]
        } else {
            [
                0.5 / w as f64,
                0.5 / h as f64,
                1. - 0.5 / w as f64,
                1. - 0.5 / h as f64,
            ]
        };
        self.uniform4("u_sampleBounds", bounds);
        self.gl.uniform2f(
            self.gl
                .get_uniform_location(&self.program, "u_pixels")
                .as_ref(),
            w as f32,
            h as f32,
        );
        self.gl.uniform1f(
            self.gl
                .get_uniform_location(&self.program, "u_sigma")
                .as_ref(),
            (if desktop {
                material::host_backdrop_blur_pixels() / dpr
            } else {
                material::constants().blur_radius
            } / 4.) as f32,
        );
        for (source, destination, axis) in [
            (&a.texture, &b.framebuffer, [1. / w as f64, 0.]),
            (&b.texture, &a.framebuffer, [0., 1. / h as f64]),
        ] {
            self.gl.bind_framebuffer(Gl::FRAMEBUFFER, Some(destination));
            self.gl.bind_texture(Gl::TEXTURE_2D, Some(source));
            self.gl.uniform2f(
                self.gl
                    .get_uniform_location(&self.program, "u_axis")
                    .as_ref(),
                axis[0] as f32,
                axis[1] as f32,
            );
            self.quad(
                Rect::new(0., 0., effect_size[0], effect_size[1]),
                Matrix::default(),
                effect_size,
                [0.; 4],
                [1.; 4],
                (0., 4),
            );
        }
        self.gl.enable(Gl::BLEND);
        self.gl.bind_framebuffer(Gl::FRAMEBUFFER, Some(target));
        self.gl.viewport(
            0,
            0,
            (size[0] * dpr).ceil() as i32,
            (size[1] * dpr).ceil() as i32,
        );
        self.clip(state, size);
        self.gl.bind_texture(Gl::TEXTURE_2D, Some(&a.texture));
        self.uniform4(
            "u_effectRect",
            if desktop {
                [0., 0., 1., 1.]
            } else {
                [
                    sample.x / size[0],
                    1. - (sample.y + sample.height) / size[1],
                    sample.width / size[0],
                    sample.height / size[1],
                ]
            },
        );
        let (tint, luminosity) = (&colors.tint, &colors.luminosity);
        self.uniform4("u_color2", material::rgba(luminosity));
        self.uniform4("u_fallback", material::rgba(&colors.fallback));
        self.gl.uniform2f(
            self.gl
                .get_uniform_location(&self.program, "u_pixels")
                .as_ref(),
            self.canvas.width() as f32,
            self.canvas.height() as f32,
        );
        self.gl.uniform1f(
            self.gl
                .get_uniform_location(&self.program, "u_weight")
                .as_ref(),
            weight as f32,
        );
        self.gl.uniform1f(
            self.gl
                .get_uniform_location(&self.program, "u_noiseOpacity")
                .as_ref(),
            if desktop {
                0.
            } else {
                material::constants().noise_opacity as f32
            },
        );
        self.gl.uniform1i(
            self.gl
                .get_uniform_location(&self.program, "u_noise")
                .as_ref(),
            1,
        );
        self.quad(
            rect,
            state.matrix,
            size,
            [0.; 4],
            material::rgba(tint),
            (0., 5),
        );
        self.effect_passes += 3;
        self.layers.borrow_mut().extend([a, b]);
        Ok(())
    }
    pub fn paint(
        &mut self,
        commands: &[Draw],
        width: f64,
        height: f64,
        dpr: f64,
    ) -> Result<bool, JsValue> {
        let expanded=crate::render::expand_retained(commands);
        let commands=expanded.as_ref();
        let raster_slots=commands.iter().filter_map(|draw|if let Draw::Raster{slot,..}=draw{Some(*slot)}else{None}).collect::<std::collections::HashSet<_>>();
        self.raster_revisions.borrow_mut().retain(|slot,_|raster_slots.contains(slot));
        self.textures.borrow_mut().retain(|key,texture|{let keep=key.strip_prefix("raster:").and_then(|slot|slot.parse::<u64>().ok()).is_none_or(|slot|raster_slots.contains(&slot));if !keep{self.gl.delete_texture(Some(&texture.value));}keep});
        if self.gl.is_context_lost() {
            return Ok(false);
        }
        if width == 0. || height == 0. {
            return Ok(true);
        }
        let (w, h) = ((width * dpr).ceil() as u32, (height * dpr).ceil() as u32);
        if self.canvas.width() != w {
            self.canvas.set_width(w);
        }
        if self.canvas.height() != h {
            self.canvas.set_height(h);
        }
        // The backing surface is rounded to whole physical pixels; projection
        // must use that same extent rather than stretching fractional CSS sizes.
        let size = [f64::from(w) / dpr, f64::from(h) / dpr];
        let root_layer = self.layer(w as i32, h as i32)?;
        self.gl
            .bind_framebuffer(Gl::FRAMEBUFFER, Some(&root_layer.framebuffer));
        self.gl.viewport(0, 0, w as i32, h as i32);
        self.gl.use_program(Some(&self.program));
        self.gl.enable(Gl::BLEND);
        self.gl.blend_func(Gl::ONE, Gl::ONE_MINUS_SRC_ALPHA);
        self.gl.disable(Gl::DEPTH_TEST);
        self.gl.disable(Gl::STENCIL_TEST);
        self.gl.color_mask(true, true, true, true);
        self.gl.clear_color(0., 0., 0., 0.);
        self.gl.stencil_mask(0xff);
        self.gl.clear(Gl::COLOR_BUFFER_BIT | Gl::STENCIL_BUFFER_BIT);
        self.gl.active_texture(Gl::TEXTURE0);
        self.gl.uniform1i(
            self.gl
                .get_uniform_location(&self.program, "u_texture")
                .as_ref(),
            0,
        );
        if self.textures.borrow().len() > 512 {
            self.invalidate_text();
        }
        let external_texture = if let Some(canvas) = &self.external_backdrop {
            let texture = self.texture()?;
            self.gl.bind_texture(Gl::TEXTURE_2D, Some(&texture));
            self.gl.pixel_storei(Gl::UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
            self.gl.pixel_storei(Gl::UNPACK_FLIP_Y_WEBGL, 1);
            self.gl
                .tex_image_2d_with_u32_and_u32_and_html_canvas_element(
                    Gl::TEXTURE_2D,
                    0,
                    Gl::RGBA as i32,
                    Gl::RGBA,
                    Gl::UNSIGNED_BYTE,
                    canvas,
                )?;
            self.gl.pixel_storei(Gl::UNPACK_FLIP_Y_WEBGL, 0);
            Some(texture)
        } else {
            None
        };
        let mut state = State::default();
        let mut stack = Vec::new();
        let mut layers: Vec<(Layer, State, f64, bool, bool)> = vec![];
        let mut allocated_scopes=Vec::new();
        let mut scope_states=Vec::new();
        let mut text_phase = None;
        for command in commands {
            match command {
                Draw::RetainedGroup{..}=>unreachable!("retained display groups are expanded above"),
                Draw::Shadow { rect, .. }
                | Draw::CrossFade { rect,.. }
                | Draw::Border { rect, .. }
                | Draw::VectorPath { rect, .. }
                | Draw::PathBrush { rect, .. } => {
                    let m = state.matrix.0;
                    let density = (dpr * m[0].hypot(m[1]).max(m[2].hypot(m[3]))).clamp(1., 16.);
                    // Preserve the destination pixel phase when rasterizing vectors.
                    // Otherwise the intermediate texture and the final quad each
                    // filter the same edge, visibly softening small stroke caps.
                    let aligned = !matches!(command, Draw::Border { .. } | Draw::Shadow { .. })
                        && m[1].abs() < 1e-9
                        && m[2].abs() < 1e-9
                        && (m[0] * dpr - density).abs() < 1e-9
                        && (m[3] * dpr - density).abs() < 1e-9;
                    let phase = |position: f64| {
                        if aligned {
                            let physical = position * dpr;
                            physical - physical.floor()
                        } else {
                            0.
                        }
                    };
                    let px = phase(m[0] * rect.x + m[4]);
                    let py = phase(m[3] * rect.y + m[5]);
                    let dynamic=matches!(command,Draw::CrossFade{..});
                    // One streaming composite texture, not a retained texture per
                    // animation progress value and serialized subtree.
                    let key=if dynamic{"connected-composite".to_string()}else{format!("border:{}:{}:{}:{}",serde_json::to_string(command).unwrap(),density,px,py)};
                    let w = (rect.width * density + px).ceil() + 4.;
                    let h = (rect.height * density + py).ceil() + 4.;
                    if w > 8192. || h > 8192. || w * h > 16_777_216. {
                        return Err(err("Border exceeds raster allocation budget"));
                    }
                    if dynamic || !self.textures.borrow().contains_key(&key) {
                        self.raster.set_width(w as u32);
                        self.raster.set_height(h as u32);
                        self.ctx.set_transform(
                            density,
                            0.,
                            0.,
                            density,
                            2. + px - rect.x * density,
                            2. + py - rect.y * density,
                        )?;
                        match command {
                            Draw::Border {
                                thickness,
                                radius,
                                color,
                                background,
                                ..
                            } => crate::render::paint_border(
                                &self.ctx,
                                *rect,
                                *thickness,
                                *radius,
                                color,
                                background.as_deref(),
                            )?,
                            Draw::VectorPath {
                                geometry, color, ..
                            } => crate::render::paint_icon_path(&self.ctx, geometry, color),
                            Draw::Shadow { .. } | Draw::PathBrush { .. } | Draw::CrossFade {..} => {
                                self.vector_backend.images.borrow_mut().extend(self.images.borrow().iter().map(|(k,v)|(k.clone(),v.clone())));
                                self.vector_backend.dpr.set(density);
                                crate::render::paint(
                                    &self.vector_backend,
                                    std::slice::from_ref(command),
                                )?;
                            }
                            _ => unreachable!(),
                        }
                        let existing=dynamic.then(||self.textures.borrow().get(&key).map(|t|t.value.clone())).flatten();
                        let texture=if let Some(texture)=existing{self.gl.bind_texture(Gl::TEXTURE_2D,Some(&texture));texture}else{self.texture()?};
                        self.gl.pixel_storei(Gl::UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
                        self.gl
                            .tex_image_2d_with_u32_and_u32_and_html_canvas_element(
                                Gl::TEXTURE_2D,
                                0,
                                Gl::RGBA as i32,
                                Gl::RGBA,
                                Gl::UNSIGNED_BYTE,
                                &self.raster,
                            )?;
                        self.textures.borrow_mut().insert(
                            key.clone(),
                            Texture {
                                value: texture,
                                width: w / density,
                                height: h / density,
                                left: 0.,
                                ascent: 0.,
                            },
                        );
                        self.uploads += 1;
                    }
                    let t = self.textures.borrow()[&key].value.clone();
                    self.gl.bind_texture(Gl::TEXTURE_2D, Some(&t));
                    self.gl.uniform1i(
                        self.gl
                            .get_uniform_location(&self.program, "u_flip")
                            .as_ref(),
                        0,
                    );
                    self.quad(
                        Rect::new(
                            rect.x - (2. + px) / density,
                            rect.y - (2. + py) / density,
                            w / density,
                            h / density,
                        ),
                        state.matrix,
                        size,
                        [0.; 4],
                        [1.; 4],
                        (0., 2),
                    );
                }
                Draw::Save => stack.push(state.clone()),
                Draw::Transform { matrix } => state.matrix = state.matrix.multiply(Matrix(*matrix)),
                Draw::CornerClip { rect, radii } => {
                    stack.push(state.clone());
                    state.clips.push((
                        state.matrix,
                        *rect,
                        crate::render::normalized_corner_ellipses(*rect, *radii),
                    ));
                    self.clip(&state, size);
                }
                Draw::RoundedClip { rect, radius } => {
                    stack.push(state.clone());
                    state.clips.push((
                        state.matrix,
                        *rect,
                        crate::render::normalized_corners(*rect, [*radius; 4]).map(|v| [v, v]),
                    ));
                    self.clip(&state, size);
                }
                Draw::Clip { rect } => {
                    stack.push(state.clone());
                    state.clips.push((state.matrix, *rect, [[0.; 2]; 4]));
                    self.clip(&state, size);
                }
                Draw::Restore => {
                    state = stack.pop().ok_or_else(|| err("unbalanced restore"))?;
                    self.clip(&state, size);
                }
                Draw::Layer { .. } | Draw::WindowLayer { .. } | Draw::VectorLayer { .. } => {
                    let opacity =
                        if let Draw::Layer { opacity } | Draw::WindowLayer { opacity, .. } = command {
                            *opacity
                        } else {
                            1.
                        };
                    scope_states.push(state.clone());
                    let allocated=opacity<1.||matches!(command,Draw::WindowLayer{..});allocated_scopes.push(allocated);
                    if !allocated{continue;}
                    let layer = self.layer(w as i32, h as i32)?;
                    self.gl
                        .bind_framebuffer(Gl::FRAMEBUFFER, Some(&layer.framebuffer));
                    self.gl.stencil_mask(0xff);
                    self.gl.clear(Gl::COLOR_BUFFER_BIT | Gl::STENCIL_BUFFER_BIT);
                    layers.push((
                        layer,
                        state.clone(),
                        opacity,
                        matches!(command, Draw::WindowLayer { .. }),
                        matches!(command, Draw::WindowLayer { inherit_backdrop: true, .. }),
                    ));
                    self.clip(&state, size);
                }
                Draw::EndLayer => {
                    let scope=scope_states.pop().ok_or_else(||err("unbalanced layer state"))?;
                    if !allocated_scopes.pop().ok_or_else(||err("unbalanced layer scope"))?{state=scope;self.clip(&state,size);continue;}
                    let (layer, old, alpha, _, _) =
                        layers.pop().ok_or_else(|| err("unbalanced layer"))?;
                    self.gl.bind_framebuffer(
                        Gl::FRAMEBUFFER,
                        Some(
                            layers
                                .last()
                                .map(|v| &v.0.framebuffer)
                                .unwrap_or(&root_layer.framebuffer),
                        ),
                    );
                    state = old;
                    self.clip(&state, size);
                    self.gl.bind_texture(Gl::TEXTURE_2D, Some(&layer.texture));
                    self.gl.uniform1i(
                        self.gl
                            .get_uniform_location(&self.program, "u_flip")
                            .as_ref(),
                        1,
                    );
                    self.quad(
                        Rect::new(0., 0., size[0], size[1]),
                        Matrix::default(),
                        size,
                        [0.; 4],
                        [1., 1., 1., alpha],
                        (0., 2),
                    );
                    self.layers.borrow_mut().push(layer);
                }
                Draw::Fill {
                    rect,
                    color,
                    radius,
                } => self.quad(
                    *rect,
                    state.matrix,
                    size,
                    [*radius; 4],
                    material::rgba(color),
                    (0., 0),
                ),
                Draw::Stroke {
                    rect,
                    color,
                    radius,
                    width,
                } => {
                    let b = *width / 2.;
                    self.quad(
                        Rect::new(
                            rect.x - b,
                            rect.y - b,
                            rect.width + width,
                            rect.height + width,
                        ),
                        state.matrix,
                        size,
                        [*radius; 4],
                        material::rgba(color),
                        (*width, 0),
                    );
                }
                Draw::Arc {
                    center,
                    radius,
                    start,
                    end,
                    color,
                    width,
                } => {
                    if end <= start || *radius <= 0. {
                        continue;
                    }
                    let extent = radius + width / 2. + 1.;
                    self.gl.uniform2f(
                        self.gl
                            .get_uniform_location(&self.program, "u_arcCenter")
                            .as_ref(),
                        extent as f32,
                        extent as f32,
                    );
                    self.gl.uniform3f(
                        self.gl
                            .get_uniform_location(&self.program, "u_arc")
                            .as_ref(),
                        *radius as f32,
                        *start as f32,
                        (end - start).min(std::f64::consts::TAU) as f32,
                    );
                    self.quad(
                        Rect::new(
                            center[0] - extent,
                            center[1] - extent,
                            extent * 2.,
                            extent * 2.,
                        ),
                        state.matrix,
                        size,
                        [0.; 4],
                        material::rgba(color),
                        (*width, 9),
                    );
                }
                Draw::Polyline {
                    points,
                    color,
                    width,
                } => {
                    if points.len() < 2 {
                        continue;
                    }
                    if points.len() > 3 {
                        return Err(err("polyline supports up to three vertices"));
                    }
                    let min_x = points.iter().map(|p| p[0]).fold(f64::INFINITY, f64::min) - width;
                    let min_y = points.iter().map(|p| p[1]).fold(f64::INFINITY, f64::min) - width;
                    let max_x = points
                        .iter()
                        .map(|p| p[0])
                        .fold(f64::NEG_INFINITY, f64::max)
                        + width;
                    let max_y = points
                        .iter()
                        .map(|p| p[1])
                        .fold(f64::NEG_INFINITY, f64::max)
                        + width;
                    let mut vertices = [0f32; 6];
                    for (i, p) in points.iter().enumerate() {
                        vertices[2 * i] = (p[0] - min_x) as f32;
                        vertices[2 * i + 1] = (p[1] - min_y) as f32;
                    }
                    self.gl.uniform2fv_with_f32_array(
                        self.gl
                            .get_uniform_location(&self.program, "u_path[0]")
                            .as_ref(),
                        &vertices,
                    );
                    self.gl.uniform1i(
                        self.gl
                            .get_uniform_location(&self.program, "u_pathCount")
                            .as_ref(),
                        points.len() as i32,
                    );
                    self.quad(
                        Rect::new(min_x, min_y, max_x - min_x, max_y - min_y),
                        state.matrix,
                        size,
                        [0.; 4],
                        material::rgba(color),
                        (*width, 7),
                    );
                }
                Draw::Ellipse { rect, color } => self.quad(
                    *rect,
                    state.matrix,
                    size,
                    [0.; 4],
                    material::rgba(color),
                    (0., 3),
                ),
                Draw::Gradient {
                    rect,
                    radius,
                    width,
                    brush,
                } => {
                    if brush.kind == "radialGradient" && brush.radius.contains(&0.) {
                        let mut color = material::rgba(&brush.stops.last().unwrap().color);
                        color[3] *= brush.opacity;
                        self.quad(*rect, state.matrix, size, [*radius; 4], color, (0., 0));
                        continue;
                    }
                    let mut offsets = [0f32; 32];
                    let mut colors = [0f32; 128];
                    for (i, stop) in brush.stops.iter().enumerate() {
                        offsets[i] = stop.offset as f32;
                        let mut color = material::rgba(&stop.color);
                        color[3] *= brush.opacity;
                        for c in 0..4 {
                            colors[i * 4 + c] = color[c] as f32;
                        }
                    }
                    self.gl.uniform1i(
                        self.gl
                            .get_uniform_location(&self.program, "u_stopCount")
                            .as_ref(),
                        brush.stops.len() as i32,
                    );
                    self.gl.uniform1fv_with_f32_array(
                        self.gl
                            .get_uniform_location(&self.program, "u_stopOffsets[0]")
                            .as_ref(),
                        &offsets,
                    );
                    self.gl.uniform4fv_with_f32_array(
                        self.gl
                            .get_uniform_location(&self.program, "u_stopColors[0]")
                            .as_ref(),
                        &colors,
                    );
                    self.gl.uniform1i(
                        self.gl
                            .get_uniform_location(&self.program, "u_spread")
                            .as_ref(),
                        match brush.spread_method.as_str() {
                            "Repeat" => 1,
                            "Reflect" => 2,
                            _ => 0,
                        },
                    );
                    let border = *width / 2.;
                    let bounds = Rect::new(
                        rect.x - border,
                        rect.y - border,
                        rect.width + width,
                        rect.height + width,
                    );
                    let [from, to] = brush.gradient_points(bounds);
                    self.uniform4(
                        "u_gradient",
                        [
                            (from[0] - bounds.x) / bounds.width,
                            (from[1] - bounds.y) / bounds.height,
                            (to[0] - bounds.x) / bounds.width,
                            (to[1] - bounds.y) / bounds.height,
                        ],
                    );
                    let (center, origin, radial_radius) = brush.radial_parameters(bounds);
                    for (name, value) in [
                        ("u_center", center),
                        ("u_origin", origin),
                        ("u_radius", radial_radius),
                    ] {
                        self.gl.uniform2f(
                            self.gl.get_uniform_location(&self.program, name).as_ref(),
                            value[0] as f32,
                            value[1] as f32,
                        );
                    }
                    let border = *width / 2.;
                    self.quad(
                        Rect::new(
                            rect.x - border,
                            rect.y - border,
                            rect.width + width,
                            rect.height + width,
                        ),
                        state.matrix,
                        size,
                        [*radius; 4],
                        [1.; 4],
                        (*width, if brush.kind == "radialGradient" { 6 } else { 1 }),
                    );
                }
                Draw::TextRasterPhase { phase } => text_phase = Some(*phase),
                Draw::Text {
                    style,
                    x,
                    y,
                    text,
                    color,
                    size: font_size,
                    font,
                    max_width,
                    weight,
                } => {
                    let raster_phase = text_phase.take();
                    if text.is_empty() || *max_width <= 0. {
                        continue;
                    }
                    let m = state.matrix.0;
                    let phase = (m[0] - 1.)
                        .abs()
                        .max((m[3] - 1.).abs())
                        .max(m[1].abs())
                        .max(m[2].abs())
                        < 1e-9;
                    let phase = phase.then(|| {
                        [(x + m[4]) * dpr, (y + m[5]) * dpr]
                            .map(|v| (v.rem_euclid(1.) * 256.).round() / 256.)
                    });
                    let phase = raster_phase.or(phase);
                    let key = format!(
                        "text:{dpr}:{weight}:{font_size}:{style:?}:{font}:{color}:{text}:{phase:?}"
                    );
                    if !self.textures.borrow().contains_key(&key) {
                        self.upload_text(
                            &key,
                            text,
                            &crate::typography::Font {
                                family: font.clone(),
                                size: *font_size,
                                weight: *weight,
                                style: *style,
                            },
                            dpr,
                            color,
                            phase,
                        )?;
                    }
                    let (t, r) = {
                        let textures = self.textures.borrow();
                        let t = &textures[&key];
                        (
                            t.value.clone(),
                            Rect::new(x - t.left, y - t.ascent, t.width, t.height),
                        )
                    };
                    let mut clipped = state.clone();
                    clipped.clips.push((
                        state.matrix,
                        Rect::new(*x, *y - font_size * 1.4, *max_width, font_size * 2.),
                        [[0.; 2]; 4],
                    ));
                    self.clip(&clipped, size);
                    self.gl.bind_texture(Gl::TEXTURE_2D, Some(&t));
                    self.gl.uniform1i(
                        self.gl
                            .get_uniform_location(&self.program, "u_flip")
                            .as_ref(),
                        0,
                    );
                    self.quad(r, state.matrix, size, [0.; 4], [1.; 4], (0., 2));
                    self.clip(&state, size);
                }
                Draw::Raster {rect,slot,revision,width,height,rgba} => {
                    let key=format!("raster:{slot}");
                    if self.raster_revisions.borrow().get(slot)!=Some(revision) || !self.textures.borrow().contains_key(&key) {
                        if let Some(old)=self.textures.borrow_mut().remove(&key){self.gl.delete_texture(Some(&old.value));}
                        self.raster.set_width(*width);self.raster.set_height(*height);
                        let data=web_sys::ImageData::new_with_u8_clamped_array_and_sh(wasm_bindgen::Clamped(rgba.as_slice()),*width,*height)?;
                        self.ctx.put_image_data(&data,0.,0.)?;
                        let texture=self.texture()?;
                        self.gl.pixel_storei(Gl::UNPACK_PREMULTIPLY_ALPHA_WEBGL,1);
                        self.gl.tex_image_2d_with_u32_and_u32_and_html_canvas_element(Gl::TEXTURE_2D,0,Gl::RGBA as i32,Gl::RGBA,Gl::UNSIGNED_BYTE,&self.raster)?;
                        self.textures.borrow_mut().insert(key.clone(),Texture{value:texture,width:0.,height:0.,left:0.,ascent:0.});
                        self.raster_revisions.borrow_mut().insert(*slot,*revision);self.uploads+=1;
                    }
                    self.gl.bind_texture(Gl::TEXTURE_2D,Some(&self.textures.borrow()[&key].value));
                    self.gl.uniform1i(self.gl.get_uniform_location(&self.program,"u_flip").as_ref(),0);
                    self.quad(*rect,state.matrix,size,[0.;4],[1.;4],(0.,2));
                }
                Draw::Image { rect, source } | Draw::TintedImage { rect, source, .. } => {
                    let key = format!("image:{source}");
                    if !self.textures.borrow().contains_key(&key) {
                        let image = self.images.borrow().get(source).cloned();
                        if let Some(image) = image {
                            // A decoded SVG can have a natural size while lacking
                            // explicit intrinsic dimensions. Browsers may reject
                            // that HTMLImageElement as a WebGL upload source.
                            // Resolve every decoded image to the same natural-size
                            // pixel surface first; URL suffixes cannot identify
                            // SVG reliably (data/blob URLs are supported too).
                            self.raster.set_width(image.natural_width());
                            self.raster.set_height(image.natural_height());
                            self.ctx
                                .draw_image_with_html_image_element(&image, 0., 0.)?;
                            let t = self.texture()?;
                            self.gl.pixel_storei(Gl::UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
                            self.gl
                                .tex_image_2d_with_u32_and_u32_and_html_canvas_element(
                                    Gl::TEXTURE_2D,
                                    0,
                                    Gl::RGBA as i32,
                                    Gl::RGBA,
                                    Gl::UNSIGNED_BYTE,
                                    &self.raster,
                                )?;
                            self.textures.borrow_mut().insert(
                                key.clone(),
                                Texture {
                                    value: t,
                                    width: 0.,
                                    height: 0.,
                                    left: 0.,
                                    ascent: 0.,
                                },
                            );
                            self.uploads += 1;
                        } else {
                            continue;
                        }
                    }
                    let t = self.textures.borrow()[&key].value.clone();
                    self.gl.bind_texture(Gl::TEXTURE_2D, Some(&t));
                    self.gl.uniform1i(
                        self.gl
                            .get_uniform_location(&self.program, "u_flip")
                            .as_ref(),
                        0,
                    );
                    let (color, kind) = if let Draw::TintedImage { color, .. } = command {
                        (material::rgba(color), 12)
                    } else {
                        ([1.; 4], 2)
                    };
                    self.quad(*rect, state.matrix, size, [0.; 4], color, (0., kind));
                }
                Draw::ContentBackground {
                    rect,
                    color,
                    border,
                    top_left_radius,
                } => {
                    self.quad(
                        *rect,
                        state.matrix,
                        size,
                        [*top_left_radius, 0., 0., 0.],
                        material::rgba(color),
                        (0., 0),
                    );
                    self.quad(
                        Rect::new(rect.x, rect.y, rect.width, 1.),
                        state.matrix,
                        size,
                        [0.; 4],
                        material::rgba(border),
                        (0., 0),
                    );
                    self.quad(
                        Rect::new(rect.x, rect.y, 1., rect.height),
                        state.matrix,
                        size,
                        [0.; 4],
                        material::rgba(border),
                        (0., 0),
                    );
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
                    let target = material::AcrylicColors {
                        tint,
                        luminosity,
                        fallback: recipe.fallback_color.clone(),
                    };
                    let colors = colors.as_ref().unwrap_or(&target);
                    if *weight <= 0. {
                        self.quad(
                            *rect,
                            state.matrix,
                            size,
                            [0.; 4],
                            material::rgba(&colors.fallback),
                            (0., 0),
                        );
                    } else {
                        let desktop = matches!(command, Draw::SystemBackdrop { .. });
                        let window = layers.iter().rposition(|v| v.3);
                        let inherit_backdrop = window.is_some_and(|i| layers[i].4);
                        let mut surfaces: Vec<_> = if desktop {
                            std::iter::once(&root_layer.texture)
                                .chain(
                                    layers
                                        .iter()
                                        .take(window.unwrap_or(layers.len().saturating_sub(1)))
                                        .map(|v| &v.0.texture),
                                )
                                .collect()
                        } else if inherit_backdrop {
                            let window = window.unwrap();
                            // The preceding window layer owns the popup shadow.
                            // Inherit its underlying surfaces, then this window's
                            // content, excluding the shadow surface itself.
                            std::iter::once(&root_layer.texture)
                                .chain(layers.iter().take(window.saturating_sub(1)).map(|v| &v.0.texture))
                                .chain(layers.iter().skip(window).map(|v| &v.0.texture))
                                .collect()
                        } else if let Some(window) = window {
                            layers.iter().skip(window).map(|v| &v.0.texture).collect()
                        } else {
                            std::iter::once(&root_layer.texture)
                                .chain(layers.iter().map(|v| &v.0.texture))
                                .collect()
                        };
                        if desktop || window.is_none() || inherit_backdrop {
                            if let Some(texture) = &external_texture {
                                surfaces.insert(0, texture);
                            }
                        }
                        let target = layers
                            .last()
                            .map(|v| &v.0.framebuffer)
                            .unwrap_or(&root_layer.framebuffer);
                        self.acrylic(
                            *rect,
                            colors,
                            *weight,
                            &state,
                            size,
                            dpr,
                            &surfaces,
                            target,
                            matches!(command, Draw::SystemBackdrop { .. }),
                        )?;
                    }
                }
            }
        }
        if !stack.is_empty() || !layers.is_empty() {
            return Err(err("unbalanced display list"));
        }
        self.gl.bind_framebuffer(Gl::FRAMEBUFFER, None);
        self.gl.disable(Gl::STENCIL_TEST);
        self.gl.clear(Gl::COLOR_BUFFER_BIT);
        self.gl
            .bind_texture(Gl::TEXTURE_2D, Some(&root_layer.texture));
        self.gl.uniform1i(
            self.gl
                .get_uniform_location(&self.program, "u_flip")
                .as_ref(),
            1,
        );
        self.quad(
            Rect::new(0., 0., size[0], size[1]),
            Matrix::default(),
            size,
            [0.; 4],
            [1.; 4],
            (0., 2),
        );
        self.layers.borrow_mut().push(root_layer);
        if let Some(texture) = external_texture {
            self.gl.delete_texture(Some(&texture));
        }
        let error = self.gl.get_error();
        if error != Gl::NO_ERROR {
            return Err(err(format!("WebGL error: {error}")));
        }
        Ok(true)
    }
}
