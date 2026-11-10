use super::*;
use std::borrow::Cow;

#[cfg(target_arch = "wasm32")]
pub(super) struct Key {
    size: [f64; 2],
    dpr: f64,
    transform: [f64; 4],
    commands: std::sync::Arc<Vec<Draw>>,
}
#[cfg(target_arch = "wasm32")]
impl PartialEq for Key {
    fn eq(&self, other: &Self) -> bool {
        self.size == other.size
            && self.dpr == other.dpr
            && self.transform == other.transform
            && (std::sync::Arc::ptr_eq(&self.commands, &other.commands)
                || self.commands == other.commands)
    }
}

/// Retention is an optimization hint; expanding it preserves draw semantics.
pub fn expand_retained(commands: &[Draw]) -> Cow<'_, [Draw]> {
    if !commands
        .iter()
        .any(|c| matches!(c, Draw::RetainedGroup { .. }))
    {
        return Cow::Borrowed(commands);
    }
    fn append(commands: &[Draw], out: &mut Vec<Draw>) {
        for c in commands {
            if let Draw::RetainedGroup { commands, .. } = c {
                append(commands, out);
            } else {
                out.push(c.clone());
            }
        }
    }
    let mut result = Vec::new();
    append(commands, &mut result);
    Cow::Owned(result)
}

/// Retained groups must not hide mutable host images from frame invalidation.
pub fn contains_external_image(commands: &[Draw]) -> bool {
    commands.iter().any(|command| match command {
        Draw::Image { .. } | Draw::TintedImage { .. } => true,
        Draw::RetainedGroup { commands, .. } => contains_external_image(commands),
        Draw::CrossFade { source, target, .. } => {
            contains_external_image(source) || contains_external_image(target)
        }
        _ => false,
    })
}

#[cfg(target_arch = "wasm32")]
pub(super) fn requires_backdrop(commands: &[Draw]) -> bool {
    commands.iter().any(|c| match c {
        Draw::Acrylic { .. } | Draw::SystemBackdrop { .. } => true,
        Draw::RetainedGroup { commands, .. } => requires_backdrop(commands),
        Draw::CrossFade { source, target, .. } => {
            requires_backdrop(source) || requires_backdrop(target)
        }
        _ => false,
    })
}

#[cfg(target_arch = "wasm32")]
pub(super) fn paint(
    backend: &CanvasBackend,
    bounds: Rect,
    raster: [f64; 6],
    commands: &std::sync::Arc<Vec<Draw>>,
) -> Result<(), wasm_bindgen::JsValue> {
    use wasm_bindgen::JsCast;
    // External pixel/backdrop sources must be sampled on the current frame.
    let reusable = commands.iter().all(|c| {
        !matches!(
            c,
            Draw::Acrylic { .. }
                | Draw::SystemBackdrop { .. }
                | Draw::WindowLayer { .. }
                | Draw::Image { .. }
                | Draw::TintedImage { .. }
                | Draw::Raster { .. }
                | Draw::CrossFade { .. }
                | Draw::RetainedGroup { .. }
        )
    });
    let dpr = backend.dpr.get();
    let sx = raster[0] * dpr;
    let sy = raster[3] * dpr;
    if !reusable || raster[1].abs() > 1e-9 || raster[2].abs() > 1e-9 || sx <= 0. || sy <= 0. {
        return paint_commands(backend, commands);
    }
    let tx = raster[4] * dpr;
    let ty = raster[5] * dpr;
    let left = (bounds.x * sx + tx).floor() - 2.;
    let top = (bounds.y * sy + ty).floor() - 2.;
    let width = ((bounds.x + bounds.width) * sx + tx).ceil() + 2. - left;
    let height = ((bounds.y + bounds.height) * sy + ty).ceil() + 2. - top;
    if ![left, top, width, height].into_iter().all(f64::is_finite)
        || width <= 0.
        || height <= 0.
        || width > 8192.
        || height > 8192.
        || width * height > 4_194_304.
    {
        return paint_commands(backend, commands);
    }
    let key = Key {
        size: [width, height],
        dpr,
        transform: [sx, sy, tx - left, ty - top],
        commands: commands.clone(),
    };
    let cached = {
        let mut cache = backend.retained_rasters.borrow_mut();
        cache.iter().position(|(k, _)| *k == key).map(|i| {
            let entry = cache.remove(i).unwrap();
            let canvas = entry.1.clone();
            cache.push_back(entry);
            canvas
        })
    };
    let canvas = if let Some(canvas) = cached {
        backend
            .retained_raster_hits
            .set(backend.retained_raster_hits.get() + 1);
        canvas
    } else {
        let canvas = backend
            .canvas
            .owner_document()
            .unwrap()
            .create_element("canvas")?
            .dyn_into::<web_sys::HtmlCanvasElement>()?;
        let context = canvas
            .get_context("2d")?
            .unwrap()
            .dyn_into::<web_sys::CanvasRenderingContext2d>()?;
        let mut layer = CanvasBackend::new(canvas, context)?;
        layer.canvas.set_width(width as u32);
        layer.canvas.set_height(height as u32);
        layer.images = backend.images.clone();
        layer.glyphs = backend.glyphs.clone();
        layer.glyph_serial = backend.glyph_serial.clone();
        layer.vector_rasters = backend.vector_rasters.clone();
        layer.vector_raster_hits = backend.vector_raster_hits.clone();
        layer.dpr.set(dpr);
        layer
            .context
            .set_transform(sx, 0., 0., sy, tx - left, ty - top)?;
        super::paint(&layer, commands)?;
        let canvas = layer.canvas.clone();
        let mut cache = backend.retained_rasters.borrow_mut();
        cache.push_back((key, canvas.clone()));
        while cache.len() > 128
            || cache
                .iter()
                .map(|(_, c)| c.width() as u64 * c.height() as u64)
                .sum::<u64>()
                > 4_194_304
        {
            let (_, old) = cache.pop_front().unwrap();
            old.set_width(0);
            old.set_height(0);
        }
        canvas
    };
    backend
        .context
        .draw_image_with_html_canvas_element_and_dw_and_dh(
            &canvas,
            (left - tx) / sx,
            (top - ty) / sy,
            width / sx,
            height / sy,
        )?;
    Ok(())
}
