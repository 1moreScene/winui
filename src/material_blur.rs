//! Bounded, separable InApp/HostBackdrop executor shared with acrylic.glsl's 49 taps.
//! Canvas keeps its 2D backend; only the painted visual's blur tile is evaluated here.
pub struct BlurTile {
    pixels: Vec<[u8; 4]>,
    origin: [i32; 2],
    size: [usize; 2],
    source_size: [usize; 2],
}
#[derive(Clone, Copy)]
pub struct AxisSample {
    lo: usize,
    hi: usize,
    t: f64,
}
fn sample(get: impl Fn(i32, i32) -> [u8; 4], x: f64, y: f64) -> [f64; 4] {
    let ix = x.floor() as i32;
    let iy = y.floor() as i32;
    let fx = x - ix as f64;
    let fy = y - iy as f64;
    if fx == 0. && fy == 0. {
        return get(ix, iy).map(|v| v as f64 / 255.);
    }
    let [a, b, c, d] = [
        get(ix, iy),
        get(ix + 1, iy),
        get(ix, iy + 1),
        get(ix + 1, iy + 1),
    ];
    std::array::from_fn(|i| {
        ((a[i] as f64 * (1. - fx) + b[i] as f64 * fx) * (1. - fy)
            + (c[i] as f64 * (1. - fx) + d[i] as f64 * fx) * fy)
            / 255.
    })
}
impl BlurTile {
    /// Bounds are normalized top-left coordinates, including half-texel inset.
    pub fn new(source: &[u8], size: [usize; 2], sigma: f64, bounds: [f64; 4]) -> Self {
        let [w, h] = size;
        // A popup can extend far outside the viewport. Texture CLAMP_TO_EDGE
        // makes those coordinates identical; never allocate its offscreen area.
        let min = [
            (bounds[0] * w as f64 - 0.5).clamp(0., w as f64 - 1.),
            (bounds[1] * h as f64 - 0.5).clamp(0., h as f64 - 1.),
        ];
        let max = [
            (bounds[2] * w as f64 - 0.5).clamp(min[0], w as f64 - 1.),
            (bounds[3] * h as f64 - 0.5).clamp(min[1], h as f64 - 1.),
        ];
        let origin = min.map(|v| v.floor() as i32);
        let tile_size =
            std::array::from_fn(|i| (max[i].ceil() as i32 - origin[i] + 1).max(1) as usize);
        let [tw, th] = tile_size;
        let mut weights = [0.; 49];
        let mut total = 0.;
        for (i, weight) in weights.iter_mut().enumerate() {
            let x = i as f64 - 24.;
            *weight = (-0.5 * x * x / sigma.max(0.01).powi(2)).exp();
            total += *weight;
        }
        for weight in &mut weights {
            *weight /= total;
        }
        // InApp surfaces use an integer, half-texel-inset crop. Every tap is
        // then an exact texel: four bilinear fetches and their interpolation
        // are redundant. Retain the fractional path for HostBackdrop clamps.
        if min.into_iter().chain(max).all(|v| v.fract() == 0.) {
            return Self {
                pixels: integer_blur(source, size, origin, tile_size, &weights),
                origin,
                size: tile_size,
                source_size: size,
            };
        }
        let get = |x: i32, y: i32| {
            let at =
                (y.clamp(0, h as i32 - 1) as usize * w + x.clamp(0, w as i32 - 1) as usize) * 4;
            [source[at], source[at + 1], source[at + 2], source[at + 3]]
        };
        let mut first = vec![[0; 4]; tw * th];
        for y in 0..th {
            for x in 0..tw {
                let xx = origin[0] as f64 + x as f64;
                let yy = (origin[1] as f64 + y as f64).clamp(min[1], max[1]);
                let mut sum = [0.; 4];
                for (i, weight) in weights.iter().enumerate() {
                    let color = sample(get, (xx + i as f64 - 24.).clamp(min[0], max[0]), yy);
                    for c in 0..4 {
                        sum[c] += color[c] * weight;
                    }
                }
                first[y * tw + x] = sum.map(|v| crate::material::clamp_u8(v * 255.));
            }
        }
        let get_first = |x: i32, y: i32| {
            first[(y - origin[1]).clamp(0, th as i32 - 1) as usize * tw
                + (x - origin[0]).clamp(0, tw as i32 - 1) as usize]
        };
        let mut pixels = vec![[0; 4]; tw * th];
        for y in 0..th {
            for x in 0..tw {
                let xx = (origin[0] as f64 + x as f64).clamp(min[0], max[0]);
                let yy = origin[1] as f64 + y as f64;
                let mut sum = [0.; 4];
                for (i, weight) in weights.iter().enumerate() {
                    let color = sample(get_first, xx, (yy + i as f64 - 24.).clamp(min[1], max[1]));
                    for c in 0..4 {
                        sum[c] += color[c] * weight;
                    }
                }
                pixels[y * tw + x] = sum.map(|v| crate::material::clamp_u8(v * 255.));
            }
        }
        Self {
            pixels,
            origin,
            size: tile_size,
            source_size: size,
        }
    }
    /// Prepare the invariant coordinate work once per output row/column.
    pub fn raster_axis(
        &self,
        start: f64,
        source_origin: f64,
        source_extent: f64,
        count: usize,
        axis: usize,
    ) -> Vec<AxisSample> {
        (0..count)
            .map(|i| {
                let p = (start + i as f64 + 0.5 - source_origin) / source_extent
                    * self.source_size[axis] as f64
                    - 0.5;
                let lo = p.floor() as i32 - self.origin[axis];
                AxisSample {
                    lo: lo.clamp(0, self.size[axis] as i32 - 1) as usize,
                    hi: (lo + 1).clamp(0, self.size[axis] as i32 - 1) as usize,
                    t: p - p.floor(),
                }
            })
            .collect()
    }
    #[inline]
    pub fn sample_axes(&self, x: AxisSample, y: AxisSample) -> [f64; 4] {
        let [a, b, c, d] = [
            self.pixels[y.lo * self.size[0] + x.lo],
            self.pixels[y.lo * self.size[0] + x.hi],
            self.pixels[y.hi * self.size[0] + x.lo],
            self.pixels[y.hi * self.size[0] + x.hi],
        ];
        std::array::from_fn(|i| {
            ((a[i] as f64 * (1. - x.t) + b[i] as f64 * x.t) * (1. - y.t)
                + (c[i] as f64 * (1. - x.t) + d[i] as f64 * x.t) * y.t)
                / 255.
        })
    }
    #[inline]
    pub fn gray_axes(&self, x: AxisSample, y: AxisSample) -> f64 {
        let [a, b, c, d] = [
            self.pixels[y.lo * self.size[0] + x.lo][0],
            self.pixels[y.lo * self.size[0] + x.hi][0],
            self.pixels[y.hi * self.size[0] + x.lo][0],
            self.pixels[y.hi * self.size[0] + x.hi][0],
        ];
        ((a as f64 * (1. - x.t) + b as f64 * x.t) * (1. - y.t)
            + (c as f64 * (1. - x.t) + d as f64 * x.t) * y.t)
            / 255.
    }
    pub fn is_opaque_grayscale(&self) -> bool {
        self.pixels
            .iter()
            .all(|p| p[0] == p[1] && p[1] == p[2] && p[3] == 255)
    }
    /// Equivalent scalar bilinear sampling for the native gray popup palettes.
    #[inline]
    pub fn sample_gray(&self, uv: [f64; 2]) -> f64 {
        let x = uv[0] * self.source_size[0] as f64 - 0.5;
        let y = uv[1] * self.source_size[1] as f64 - 0.5;
        let ix = x.floor() as i32;
        let iy = y.floor() as i32;
        let fx = x - ix as f64;
        let fy = y - iy as f64;
        let get = |x: i32, y: i32| {
            self.pixels[(y - self.origin[1]).clamp(0, self.size[1] as i32 - 1) as usize
                * self.size[0]
                + (x - self.origin[0]).clamp(0, self.size[0] as i32 - 1) as usize][0]
                as f64
        };
        ((get(ix, iy) * (1. - fx) + get(ix + 1, iy) * fx) * (1. - fy)
            + (get(ix, iy + 1) * (1. - fx) + get(ix + 1, iy + 1) * fx) * fy)
            / 255.
    }
    pub fn sample(&self, uv: [f64; 2]) -> [f64; 4] {
        let [w, h] = self.size;
        let get = |x: i32, y: i32| {
            self.pixels[(y - self.origin[1]).clamp(0, h as i32 - 1) as usize * w
                + (x - self.origin[0]).clamp(0, w as i32 - 1) as usize]
        };
        sample(
            get,
            uv[0] * self.source_size[0] as f64 - 0.5,
            uv[1] * self.source_size[1] as f64 - 0.5,
        )
    }
}

fn integer_blur(
    source: &[u8],
    size: [usize; 2],
    origin: [i32; 2],
    tile: [usize; 2],
    weights: &[f64; 49],
) -> Vec<[u8; 4]> {
    let [tw, th] = tile;
    let opaque = source.chunks_exact(4).all(|p| p[3] == 255);
    let gray = opaque && source.chunks_exact(4).all(|p| p[0] == p[1] && p[1] == p[2]);
    let channels = if gray {
        1
    } else if opaque {
        3
    } else {
        4
    };
    let mut first = vec![[0; 4]; tw * th];
    for y in 0..th {
        for x in 0..tw {
            let mut sum = [0.; 4];
            for (tap, weight) in weights.iter().enumerate() {
                let sx = (x as i32 + tap as i32 - 24).clamp(0, tw as i32 - 1) as usize;
                let at = ((origin[1] as usize + y) * size[0] + origin[0] as usize + sx) * 4;
                for c in 0..channels {
                    sum[c] += source[at + c] as f64 / 255. * weight;
                }
            }
            first[y * tw + x] = sum.map(|v| crate::material::clamp_u8(v * 255.));
            if opaque {
                first[y * tw + x][3] = 255;
            }
            if gray {
                first[y * tw + x][1] = first[y * tw + x][0];
                first[y * tw + x][2] = first[y * tw + x][0];
            }
        }
    }
    let mut result = vec![[0; 4]; tw * th];
    for y in 0..th {
        for x in 0..tw {
            let mut sum = [0.; 4];
            for (tap, weight) in weights.iter().enumerate() {
                let sy = (y as i32 + tap as i32 - 24).clamp(0, th as i32 - 1) as usize;
                for c in 0..channels {
                    sum[c] += first[sy * tw + x][c] as f64 / 255. * weight;
                }
            }
            result[y * tw + x] = sum.map(|v| crate::material::clamp_u8(v * 255.));
            if opaque {
                result[y * tw + x][3] = 255;
            }
            if gray {
                result[y * tw + x][1] = result[y * tw + x][0];
                result[y * tw + x][2] = result[y * tw + x][0];
            }
        }
    }
    result
}
