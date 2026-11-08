use serde::{Deserialize, Serialize};
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MaterialConstants {
    pub blur_radius: f64,
    pub noise_opacity: f64,
    pub switch_duration: f64,
    pub switch_curve: [f64; 4],
    pub tint_transition_duration: f64,
}
pub fn constants() -> &'static MaterialConstants {
    static VALUE: std::sync::OnceLock<MaterialConstants> = std::sync::OnceLock::new();
    VALUE.get_or_init(|| {
        serde_json::from_str(include_str!(concat!(env!("OUT_DIR"), "/material.json")))
            .expect("extracted material graph")
    })
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AcrylicOptions {
    pub tint_color: String,
    pub tint_opacity: f64,
    #[serde(default)]
    pub luminosity_opacity: Option<f64>,
    pub fallback_color: String,
}
/// Effective brush inputs are animated after the original tint/luminosity recipe,
/// just as AcrylicBrush::OnPropertyChanged animates Composition effect colors.
#[derive(Clone, Debug, Serialize)]
pub struct AcrylicColors {
    pub tint: String,
    pub luminosity: String,
    pub fallback: String,
}
#[derive(Clone, Debug, Default)]
pub struct AcrylicTransition {
    from: [[f64; 4]; 3],
    target: [[f64; 4]; 3],
    start: [f64; 3],
    duration: [f64; 3],
    initialized: bool,
}
pub fn composition_progress(t: f64) -> f64 {
    static CURVE: std::sync::OnceLock<Vec<f64>> = std::sync::OnceLock::new();
    let curve = CURVE.get_or_init(|| {
        serde_json::from_str::<serde_json::Value>(include_str!(concat!(
            env!("OUT_DIR"),
            "/composition-color-profile.json"
        )))
        .unwrap()["defaultCurve"]
            .as_array()
            .unwrap()
            .iter()
            .map(|v| v.as_f64().unwrap())
            .collect()
    });
    let position = t.clamp(0., 1.) * (curve.len() - 1) as f64;
    let i = (position.floor() as usize).min(curve.len() - 2);
    curve[i] + (curve[i + 1] - curve[i]) * (position - i as f64)
}
fn hsl(c: [f64; 4]) -> [f64; 3] {
    let max = c[0].max(c[1]).max(c[2]);
    let min = c[0].min(c[1]).min(c[2]);
    let d = max - min;
    let l = (max + min) / 2.;
    if d < 1e-12 {
        return [0., 0., l];
    }
    let h = if max == c[0] {
        ((c[1] - c[2]) / d).rem_euclid(6.)
    } else if max == c[1] {
        (c[2] - c[0]) / d + 2.
    } else {
        (c[0] - c[1]) / d + 4.
    };
    [h / 6., d / (1. - (2. * l - 1.).abs()), l]
}
/// Composition ColorKeyFrameAnimation Auto uses HSL in the pinned native runtime.
pub fn interpolate_color(a: [f64; 4], b: [f64; 4], t: f64) -> [f64; 4] {
    let x = hsl(a);
    let y = hsl(b);
    let dh = (y[0] - x[0] + 0.5).rem_euclid(1.) - 0.5;
    let h = (x[0] + dh * t).rem_euclid(1.);
    let s = x[1] + (y[1] - x[1]) * t;
    let l = x[2] + (y[2] - x[2]) * t;
    let c = (1. - (2. * l - 1.).abs()) * s;
    let z = c * (1. - ((h * 6.).rem_euclid(2.) - 1.).abs());
    let rgb = match (h * 6.).floor() as u8 {
        0 => [c, z, 0.],
        1 => [z, c, 0.],
        2 => [0., c, z],
        3 => [0., z, c],
        4 => [z, 0., c],
        _ => [c, 0., z],
    };
    [
        rgb[0] + l - c / 2.,
        rgb[1] + l - c / 2.,
        rgb[2] + l - c / 2.,
        a[3] + (b[3] - a[3]) * t,
    ]
}
impl AcrylicTransition {
    pub fn current(&self, time: f64) -> Option<AcrylicColors> {
        self.initialized.then(|| {
            let c = self.values(time);
            AcrylicColors {
                tint: css(c[0]),
                luminosity: css(c[1]),
                fallback: css(c[2]),
            }
        })
    }
    fn values(&self, time: f64) -> [[f64; 4]; 3] {
        std::array::from_fn(|i| {
            let t = if self.duration[i] == 0. {
                1.
            } else {
                ((time - self.start[i]) / self.duration[i]).clamp(0., 1.)
            };
            let t = composition_progress(t);
            interpolate_color(self.from[i], self.target[i], t)
        })
    }
    pub fn sample(&mut self, recipe: &AcrylicOptions, time: f64, reduced: bool) -> AcrylicColors {
        let (tint, luminosity) = recipe.colors();
        let next = [rgba(&tint), rgba(&luminosity), rgba(&recipe.fallback_color)];
        // Native rebuilds the effect graph when changing to/from opaque tint.
        if self.initialized && (next[0][3] >= 1.) != (self.target[0][3] >= 1.) {
            self.initialized = false;
        }
        let old = self.values(time);
        for i in 0..3 {
            if !self.initialized || reduced || self.target[i] != next[i] {
                self.from[i] = if !self.initialized || reduced {
                    next[i]
                } else {
                    old[i]
                };
                self.target[i] = next[i];
                self.start[i] = time;
                self.duration[i] = if self.initialized && !reduced {
                    constants().tint_transition_duration
                } else {
                    0.
                };
            }
        }
        self.initialized = true;
        let colors = self.values(time);
        AcrylicColors {
            tint: css(colors[0]),
            luminosity: css(colors[1]),
            fallback: css(colors[2]),
        }
    }
    pub fn active(&self, time: f64) -> bool {
        self.initialized
            && (0..3)
                .any(|i| self.from[i] != self.target[i] && time < self.start[i] + self.duration[i])
    }
}
impl AcrylicOptions {
    pub fn validate(&self) -> Result<(), String> {
        if !valid_color(&self.tint_color) || !valid_color(&self.fallback_color) {
            return Err("acrylic colors must be #RRGGBB or #RRGGBBAA".into());
        }
        for v in std::iter::once(self.tint_opacity).chain(self.luminosity_opacity) {
            if !v.is_finite() || !(0. ..=1.).contains(&v) {
                return Err("acrylic opacity must be between 0 and 1".into());
            }
        }
        Ok(())
    }
    /// Port of AcrylicBrush.cpp GetEffectiveTintColor / GetLuminosityColor.
    pub fn colors(&self) -> (String, String) {
        let [r, g, b, a] = rgba(&self.tint_color);
        let max = r.max(g).max(b);
        let min = r.min(g).min(b);
        let saturation = if max == 0. { 0. } else { (max - min) / max };
        let suppression = if max > 0.5 { 0.45 } else { 0.05 };
        let modifier =
            0.9 - suppression * ((max - 0.5).abs() / 0.5) * (1. - saturation * 2.).max(0.);
        let alpha = (a
            * self.tint_opacity
            * if self.luminosity_opacity.is_some() {
                1.
            } else {
                modifier
            }
            * 255.)
            .round()
            / 255.;
        let tint = css([r, g, b, alpha]);
        let luminosity = if let Some(opacity) = self.luminosity_opacity {
            css([r, g, b, opacity])
        } else {
            let v = max.clamp(0.125, 0.965);
            let factor = if max == 0. { 0. } else { v / max };
            let color = if max == 0. {
                [v, v, v]
            } else {
                [r * factor, g * factor, b * factor]
            };
            let opacity = (((a * self.tint_opacity * 255.).round() / 255.) * 0.88 + 0.15).min(1.);
            css([color[0], color[1], color[2], opacity])
        };
        (tint, luminosity)
    }
}
pub fn valid_color(value: &str) -> bool {
    (value.len() == 7 || value.len() == 9)
        && value.starts_with('#')
        && value[1..].bytes().all(|b| b.is_ascii_hexdigit())
}
pub fn rgba(value: &str) -> [f64; 4] {
    let channel =
        |offset| u8::from_str_radix(&value[offset..offset + 2], 16).unwrap() as f64 / 255.;
    [
        channel(1),
        channel(3),
        channel(5),
        if value.len() == 9 { channel(7) } else { 1. },
    ]
}
pub fn css(value: [f64; 4]) -> String {
    format!(
        "#{:02x}{:02x}{:02x}{:02x}",
        (value[0] * 255.).round() as u8,
        (value[1] * 255.).round() as u8,
        (value[2] * 255.).round() as u8,
        (value[3] * 255.).round() as u8
    )
}

/// Canvas ImageData's ToUint8Clamp conversion, including ties to even.
/// Values are byte-domain channels; recipe Color conversions stay separate.
pub fn clamp_u8(value: f64) -> u8 {
    value.clamp(0., 255.).round_ties_even() as u8
}

/// Native HostBackdrop supplies its blur before the two desktop Acrylic blend nodes.
pub fn host_backdrop_profile() -> &'static serde_json::Value {
    static PROFILE: std::sync::OnceLock<serde_json::Value> = std::sync::OnceLock::new();
    PROFILE.get_or_init(|| {
        serde_json::from_str(include_str!("../references/host-backdrop-profile.json")).unwrap()
    })
}
pub fn host_backdrop_blur_pixels() -> f64 {
    host_backdrop_profile()["hostBlurSigmaPixels"]
        .as_f64()
        .unwrap()
}

/// Floating point evaluation of the nonseparable luminosity/color graph.
/// Keep intermediate channels unquantized, as the Composition effect graph does.
#[inline]
pub fn blend_acrylic(backdrop: [f64; 3], tint: [f64; 4], luminosity: [f64; 4]) -> [f64; 3] {
    fn lum(c: [f64; 3]) -> f64 {
        c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11
    }
    fn set_lum(c: [f64; 3], target: f64) -> [f64; 3] {
        let delta = target - lum(c);
        let mut c = c.map(|v| v + delta);
        let l = lum(c);
        let n = c.into_iter().fold(f64::INFINITY, f64::min);
        let x = c.into_iter().fold(f64::NEG_INFINITY, f64::max);
        if n < 0. {
            c = c.map(|v| l + (v - l) * l / (l - n));
        }
        if x > 1. {
            c = c.map(|v| l + (v - l) * (1. - l) / (x - l));
        }
        c
    }
    if tint[3] >= 1. {
        return [tint[0], tint[1], tint[2]];
    }
    let layer = set_lum(backdrop, lum([luminosity[0], luminosity[1], luminosity[2]]));
    let color = std::array::from_fn(|i| backdrop[i] + (layer[i] - backdrop[i]) * luminosity[3]);
    let layer = set_lum([tint[0], tint[1], tint[2]], lum(color));
    std::array::from_fn(|i| color[i] + (layer[i] - color[i]) * tint[3])
}

#[derive(Clone, Copy)]
pub struct NoiseAxis {
    lo: usize,
    hi: usize,
    t: f64,
}
pub const NOISE_GRAY_OPAQUE: bool = include!(concat!(env!("OUT_DIR"), "/noise-gray-opaque.rs"));
#[inline]
pub fn noise_axis(value: f64) -> NoiseAxis {
    let p = value - 0.5;
    let p = p - (p / 256.).floor() * 256.;
    let lo = p.floor() as usize;
    NoiseAxis {
        lo,
        hi: (lo + 1) % 256,
        t: p - lo as f64,
    }
}
#[inline]
pub fn sample_noise_axes(x: NoiseAxis, y: NoiseAxis) -> [f64; 4] {
    const DATA: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/noise.rgba"));
    let channel = |c| {
        let at = |x, y| DATA[(y * 256 + x) * 4 + c] as f64 / 255.;
        (at(x.lo, y.lo) * (1. - x.t) + at(x.hi, y.lo) * x.t) * (1. - y.t)
            + (at(x.lo, y.hi) * (1. - x.t) + at(x.hi, y.hi) * x.t) * y.t
    };
    if NOISE_GRAY_OPAQUE {
        let g = channel(0);
        [g, g, g, 1.]
    } else {
        std::array::from_fn(channel)
    }
}
/// BorderEffect Wrap + linear sampling of the pinned Acrylic noise surface.
#[inline]
pub fn sample_noise(point: [f64; 2]) -> [f64; 4] {
    sample_noise_axes(noise_axis(point[0]), noise_axis(point[1]))
}

#[cfg(test)]
mod noise_regression {
    #[test]
    fn accelerated_noise_matches_four_channel_wrapped_reference() {
        const DATA: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/noise.rgba"));
        for x in -37..39 {
            for y in -33..35 {
                for dpr in [1., 1.25, 1.5, 2.] {
                    let point = [x as f64 / dpr + 0.13, y as f64 / dpr - 0.37];
                    let px = (point[0] - 0.5).rem_euclid(256.);
                    let py = (point[1] - 0.5).rem_euclid(256.);
                    let ix = px.floor() as usize;
                    let iy = py.floor() as usize;
                    let fx = px - ix as f64;
                    let fy = py - iy as f64;
                    let actual = super::sample_noise(point);
                    for (channel, value) in actual.iter().enumerate() {
                        let at = |x, y| DATA[(y * 256 + x) * 4 + channel] as f64 / 255.;
                        let a = at(ix, iy) * (1. - fx) + at((ix + 1) % 256, iy) * fx;
                        let b = at(ix, (iy + 1) % 256) * (1. - fx)
                            + at((ix + 1) % 256, (iy + 1) % 256) * fx;
                        assert!((*value - (a * (1. - fy) + b * fy)).abs() < 1e-12);
                    }
                }
            }
        }
    }
}
