//! CPU color-spectrum values and bitmaps from the pinned WinUI ColorSpectrum.
//! Ring masking and the selection ellipse belong to the control's visual tree.
use crate::{
    enums::{ColorSpectrumComponents, ColorSpectrumShape},
    picker_value::Hsv,
};

#[derive(Clone, Copy, Debug)]
pub struct Spectrum {
    pub shape: ColorSpectrumShape,
    pub components: ColorSpectrumComponents,
    /// Hue in degrees; saturation/value in fractions, including endpoints.
    pub hue: [f64; 2],
    pub saturation: [f64; 2],
    pub value: [f64; 2],
}
impl Default for Spectrum {
    fn default() -> Self {
        Self {
            shape: ColorSpectrumShape::Box,
            components: ColorSpectrumComponents::HueSaturation,
            hue: [0., 359.],
            saturation: [0., 1.],
            value: [0., 1.],
        }
    }
}
impl Spectrum {
    pub fn validate(&self) -> Result<(), String> {
        for (range, maximum) in [(self.hue, 359.), (self.saturation, 1.), (self.value, 1.)] {
            if !range.iter().all(|v| v.is_finite())
                || range[0] < 0.
                || range[1] > maximum
                || range[0] > range[1]
            {
                return Err(
                    "Spectrum channel bounds must be finite, ordered and within the channel range"
                        .into(),
                );
            }
        }
        Ok(())
    }
    fn hue_saturation(&self) -> bool {
        matches!(
            self.components,
            ColorSpectrumComponents::HueSaturation | ColorSpectrumComponents::SaturationHue
        )
    }
    fn fractions(&self, color: Hsv) -> [f64; 3] {
        let normalize = |value: f64, range: [f64; 2]| {
            if range[0] == range[1] {
                0.
            } else {
                ((value - range[0]) / (range[1] - range[0])).clamp(0., 1.)
            }
        };
        let mut result = [
            normalize(color.h, self.hue),
            normalize(color.s, self.saturation),
            normalize(color.v, self.value),
        ];
        if self.hue_saturation() {
            result[1] = 1. - result[1];
        } else {
            result[2] = 1. - result[2];
        }
        result
    }
    fn pair(&self, [h, s, v]: [f64; 3]) -> [f64; 2] {
        use ColorSpectrumComponents::*;
        match self.components {
            HueSaturation => [h, s],
            SaturationHue => [s, h],
            HueValue => [h, v],
            ValueHue => [v, h],
            SaturationValue => [s, v],
            ValueSaturation => [v, s],
        }
    }
    fn color_from_pair(&self, [x, y]: [f64; 2], base: Hsv) -> Hsv {
        use ColorSpectrumComponents::*;
        let map = |range: [f64; 2], value: f64| range[0] + value * (range[1] - range[0]);
        let mut color = base;
        match self.components {
            HueSaturation => {
                color.h = map(self.hue, x);
                color.s = map(self.saturation, 1. - y);
            }
            SaturationHue => {
                color.s = map(self.saturation, 1. - x);
                color.h = map(self.hue, y);
            }
            HueValue => {
                color.h = map(self.hue, x);
                color.v = map(self.value, 1. - y);
            }
            ValueHue => {
                color.v = map(self.value, 1. - x);
                color.h = map(self.hue, y);
            }
            SaturationValue => {
                color.s = map(self.saturation, x);
                color.v = map(self.value, 1. - y);
            }
            ValueSaturation => {
                color.v = map(self.value, 1. - x);
                color.s = map(self.saturation, y);
            }
        }
        color
    }
    fn at_pixel(&self, x: f64, y: f64, side: u32, base: Hsv) -> Hsv {
        let pair = if self.shape == ColorSpectrumShape::Box {
            let extent = f64::from(side.saturating_sub(1)).max(1.);
            [x / extent, y / extent]
        } else {
            let radius = f64::from(side) / 2.;
            // The native angular bitmap deliberately quantizes to whole degrees.
            let theta = ((radius - y).atan2(radius - x).to_degrees() + 180.).floor();
            [
                theta / 360.,
                1. - (x - radius).hypot(y - radius).min(radius) / radius,
            ]
        };
        self.color_from_pair(pair, base)
    }
    /// Native hit testing rounds to the bitmap pixel; dragging outside a ring
    /// projects onto its edge. The channel absent from the spectrum is retained.
    pub fn hit(&self, mut x: f64, mut y: f64, side: u32, base: Hsv) -> Hsv {
        if side == 0 || !x.is_finite() || !y.is_finite() {
            return base;
        }
        if self.shape == ColorSpectrumShape::Ring {
            let radius = f64::from(side) / 2.;
            let distance = (x - radius).hypot(y - radius);
            if distance > radius {
                x = radius + (x - radius) * radius / distance;
                y = radius + (y - radius) * radius / distance;
            }
        }
        let maximum = f64::from(side - 1);
        self.at_pixel(
            x.round().clamp(0., maximum),
            y.round().clamp(0., maximum),
            side,
            base,
        )
    }
    /// The ellipse uses the full display width, as the native implementation
    /// does; its position is deliberately not divided by bitmap width minus one.
    pub fn position(&self, side: f64, color: Hsv) -> [f64; 2] {
        let [x, y] = self.pair(self.fractions(color));
        if self.shape == ColorSpectrumShape::Box {
            [side * x, side * y]
        } else {
            let radius = side / 2.;
            let theta = x * std::f64::consts::TAU;
            [
                radius + theta.cos() * (1. - y) * radius,
                radius + theta.sin() * (1. - y) * radius,
            ]
        }
    }
    fn byte_color(color: Hsv) -> [f64; 4] {
        color.rgba().map(|v| (v.clamp(0., 1.) * 255.).round())
    }
    fn displayed(&self, mut color: Hsv) -> [u8; 4] {
        use ColorSpectrumComponents::*;
        color.a = 1.;
        // Native Composition blends quantized endpoint surfaces. Hue/saturation
        // remains at full value even when the third-dimension slider is dark.
        let (low, high, weight) = match self.components {
            HueSaturation | SaturationHue => {
                color.v = 1.;
                (color, color, 0.)
            }
            HueValue | ValueHue => {
                let mut low = color;
                let mut high = color;
                low.s = 0.;
                high.s = 1.;
                (low, high, color.s)
            }
            SaturationValue | ValueSaturation => {
                let sextant = color.h.rem_euclid(360.) / 60.;
                let mut low = color;
                let mut high = color;
                low.h = sextant.floor() * 60.;
                high.h = (low.h + 60.).rem_euclid(360.);
                (low, high, sextant.fract())
            }
        };
        let a = Self::byte_color(low);
        let b = Self::byte_color(high);
        std::array::from_fn(|i| (a[i] + (b[i] - a[i]) * weight).round() as u8)
    }
    /// RGBA bitmap in logical pixels, independent of DPR. The renderer stretches
    /// this cached image; ring visuals clip to an ellipse separately.
    pub fn bitmap(&self, side: u32, base: Hsv) -> Result<Vec<u8>, String> {
        self.validate()?;
        if side == 0 || side > 4096 {
            return Err("Spectrum bitmap side must be between 1 and 4096".into());
        }
        let mut pixels = Vec::with_capacity(side as usize * side as usize * 4);
        for y in 0..side {
            for x in 0..side {
                pixels.extend(self.displayed(self.at_pixel(
                    f64::from(x),
                    f64::from(y),
                    side,
                    base,
                )));
            }
        }
        Ok(pixels)
    }
}
