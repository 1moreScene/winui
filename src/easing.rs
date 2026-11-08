//! Port of pinned components/animation/EasingFunctions.cpp and core/inc/EasingFunctions.h.
use crate::enums::{EasingFunction, EasingMode};
use serde::{Deserialize, Serialize};
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct EasingParameters {
    pub exponent: f64,
    pub amplitude: f64,
    pub power: f64,
    pub oscillations: u32,
    pub springiness: f64,
    pub bounces: u32,
    pub bounciness: f64,
}
impl Default for EasingParameters {
    fn default() -> Self {
        Self {
            exponent: 2.,
            amplitude: 1.,
            power: 2.,
            oscillations: 3,
            springiness: 3.,
            bounces: 3,
            bounciness: 2.,
        }
    }
}
impl EasingParameters {
    pub fn validate(&self) -> Result<(), String> {
        if [
            self.exponent,
            self.amplitude,
            self.power,
            self.springiness,
            self.bounciness,
        ]
        .iter()
        .any(|x| !x.is_finite() || x.abs() > 50.)
            || self.oscillations > 50
            || self.bounces > 50
        {
            return Err(
                "easing parameters must be finite and within supported numeric bounds".into(),
            );
        }
        Ok(())
    }
}
pub fn sample(function: EasingFunction, mode: EasingMode, t: f64, p: &EasingParameters) -> f64 {
    let t = t.clamp(0., 1.);
    if t == 0. || t == 1. {
        return t;
    }
    let core = |t: f64| -> f64 {
        let exp = |x: f64, e: f64| {
            if e.abs() <= 0.0001 {
                x
            } else {
                (e * x).exp_m1() / e.exp_m1()
            }
        };
        match function {
            EasingFunction::Circle => 1. - (1. - t * t).max(0.).sqrt(),
            EasingFunction::Back => t * t * t - t * p.amplitude * (t * std::f64::consts::PI).sin(),
            EasingFunction::Exponential => exp(t, p.exponent),
            EasingFunction::Power => t.powf(p.power.max(0.)),
            EasingFunction::Quadratic => t.powi(2),
            EasingFunction::Cubic => t.powi(3),
            EasingFunction::Quartic => t.powi(4),
            EasingFunction::Quintic => t.powi(5),
            EasingFunction::Sine => 1. - ((1. - t) * std::f64::consts::FRAC_PI_2).sin(),
            EasingFunction::Elastic => {
                exp(t, p.springiness)
                    * (t * (2. * std::f64::consts::PI * p.oscillations as f64
                        + std::f64::consts::FRAC_PI_2))
                        .sin()
            }
            EasingFunction::Bounce => {
                let b = if p.bounciness <= 1.0001 {
                    1.01
                } else {
                    p.bounciness
                };
                let n = p.bounces as f64;
                let pow = b.powf(n);
                let units = (1. - pow) / (1. - b) + pow / 2.;
                let start = (-(t * units) * (1. - b) + 1.).ln() / b.ln();
                let start = start.floor();
                let a = (1. - b.powf(start)) / ((1. - b) * units);
                let z = (1. - b.powf(start + 1.)) / ((1. - b) * units);
                let mid = (a + z) / 2.;
                let radius = mid - a;
                let relative = t - mid;
                -b.powf(start - n) / (radius * radius) * (relative - radius) * (relative + radius)
            }
        }
    };
    match mode {
        EasingMode::EaseIn => core(t),
        EasingMode::EaseOut => 1. - core(1. - t),
        EasingMode::EaseInOut => {
            if t < 0.5 {
                core(2. * t) / 2.
            } else {
                1. - core(2. - 2. * t) / 2.
            }
        }
    }
}
