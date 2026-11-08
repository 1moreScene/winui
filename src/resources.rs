use crate::model::Theme;
use serde::Deserialize;
use std::{collections::HashMap, sync::OnceLock};

#[derive(Clone, Debug, Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GradientStop {
    pub offset: f64,
    pub color: String,
}
#[derive(Clone, Debug, Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Brush {
    pub kind: String,
    #[serde(default)]
    pub mapping_mode: String,
    #[serde(default)]
    pub spread_method: String,
    #[serde(default = "identity")]
    pub relative_transform: [f64; 6],
    #[serde(default = "identity")]
    pub transform: [f64; 6],
    #[serde(default = "one")]
    pub opacity: f64,
    #[serde(default)]
    pub stops: Vec<GradientStop>,
    #[serde(default)]
    pub from: [f64; 2],
    #[serde(default)]
    pub to: [f64; 2],
    #[serde(default)]
    pub color: String,
    #[serde(default)]
    pub tint: String,
    #[serde(default)]
    pub tint_opacity: f64,
    #[serde(default)]
    pub luminosity_opacity: Option<f64>,
    #[serde(default)]
    pub fallback: String,
    #[serde(default = "midpoint")]
    pub center: [f64; 2],
    #[serde(default = "midpoint")]
    pub origin: [f64; 2],
    #[serde(default = "midpoint")]
    pub radius: [f64; 2],
}
fn midpoint() -> [f64; 2] {
    [0.5; 2]
}
fn one() -> f64 {
    1.
}
fn identity() -> [f64; 6] {
    [1., 0., 0., 1., 0., 0.]
}
impl Brush {
    pub fn gradient_sample(&self, rect: crate::model::Rect, uv: [f64; 2]) -> [f64; 4] {
        let parameter = if self.kind == "radialGradient" {
            let (center, origin, radius) = self.radial_parameters(rect);
            if radius.contains(&0.) {
                None
            } else {
                let f = [
                    (origin[0] - center[0]) / radius[0],
                    (origin[1] - center[1]) / radius[1],
                ];
                let q = [
                    (uv[0] - origin[0]) / radius[0],
                    (uv[1] - origin[1]) / radius[1],
                ];
                let a = 1. - f[0] * f[0] - f[1] * f[1];
                let b = f[0] * q[0] + f[1] * q[1];
                let qq = q[0] * q[0] + q[1] * q[1];
                let disc = b * b + a * qq;
                let t = if a.abs() < 1e-10 {
                    if b.abs() < 1e-10 {
                        0.
                    } else {
                        -qq / (2. * b)
                    }
                } else {
                    (b + disc.max(0.).sqrt()) / a
                };
                if disc < 0. || t < 0. {
                    None
                } else {
                    Some(t)
                }
            }
        } else {
            let [a, b] = self.gradient_points(rect);
            let x = rect.x + uv[0] * rect.width;
            let y = rect.y + uv[1] * rect.height;
            let d = [b[0] - a[0], b[1] - a[1]];
            let length = d[0] * d[0] + d[1] * d[1];
            if length < 1e-15 {
                None
            } else {
                Some(((x - a[0]) * d[0] + (y - a[1]) * d[1]) / length)
            }
        };
        let mut result = crate::material::rgba(&self.stops.last().unwrap().color);
        if let Some(t) = parameter {
            let t = match self.spread_method.as_str() {
                "Repeat" => t.rem_euclid(1.),
                "Reflect" => {
                    let t = t.rem_euclid(2.);
                    if t > 1. {
                        2. - t
                    } else {
                        t
                    }
                }
                _ => t,
            };
            result = crate::material::rgba(&self.stops[0].color);
            for pair in self.stops.windows(2) {
                let a = &pair[0];
                let b = &pair[1];
                if t < b.offset {
                    let t = ((t - a.offset) / (b.offset - a.offset).max(1e-10)).clamp(0., 1.);
                    let x = crate::material::rgba(&a.color);
                    let y = crate::material::rgba(&b.color);
                    result = std::array::from_fn(|i| x[i] + (y[i] - x[i]) * t);
                    break;
                }
                result = crate::material::rgba(&b.color);
            }
        }
        result[3] *= self.opacity;
        result
    }
    pub fn radial_parameters(&self, rect: crate::model::Rect) -> ([f64; 2], [f64; 2], [f64; 2]) {
        if self.mapping_mode == "Absolute" {
            (
                [self.center[0] / rect.width, self.center[1] / rect.height],
                [self.origin[0] / rect.width, self.origin[1] / rect.height],
                [self.radius[0] / rect.width, self.radius[1] / rect.height],
            )
        } else {
            (self.center, self.origin, self.radius)
        }
    }
    pub fn gradient_points(&self, rect: crate::model::Rect) -> [[f64; 2]; 2] {
        let relative = crate::scene::Matrix(self.relative_transform);
        let transform = crate::scene::Matrix(self.transform);
        [self.from, self.to].map(|point| {
            let (mut x, mut y) = (point[0], point[1]);
            if self.mapping_mode == "Absolute" {
                x /= rect.width.max(1e-9);
                y /= rect.height.max(1e-9);
            }
            (x, y) = relative.point(x, y);
            (x, y) = transform.point(x * rect.width, y * rect.height);
            [rect.x + x, rect.y + y]
        })
    }
    pub fn solid_color(&self) -> String {
        assert_eq!(self.kind, "solid");
        let mut rgba = crate::material::rgba(&self.color);
        rgba[3] *= self.opacity;
        crate::material::css(rgba)
    }
}
#[derive(Deserialize)]
pub struct Resources {
    aliases: HashMap<String, HashMap<String, String>>,
    primitives: HashMap<String, HashMap<String, Brush>>,
}
impl Resources {
    pub fn current() -> &'static Self {
        static RESOURCES: OnceLock<Resources> = OnceLock::new();
        RESOURCES.get_or_init(|| {
            let mut result: Self = serde_json::from_str(include_str!(concat!(
                env!("OUT_DIR"),
                "/navigation-resources.json"
            )))
            .expect("validated resource IR");
            let motion:Self=serde_json::from_str(include_str!("../references/motion-resources.json")).expect("pinned motion brushes");
            for(theme,brushes)in motion.primitives {result.primitives.entry(theme).or_default().extend(brushes);}
            let composed: Self = serde_json::from_str(include_str!(
                "../references/composed-controls-resources.json"
            ))
            .expect("composed control resources");
            for (theme, aliases) in composed.aliases {
                result.aliases.entry(theme).or_default().extend(aliases);
            }
            for (theme, brushes) in composed.primitives {
                result.primitives.entry(theme).or_default().extend(brushes);
            }
            let button: Self = serde_json::from_str(include_str!(concat!(
                env!("OUT_DIR"),
                "/button-template.json"
            )))
            .expect("validated Button resources");
            for (theme, aliases) in button.aliases {
                result.aliases.entry(theme).or_default().extend(aliases);
            }
            for (theme, brushes) in button.primitives {
                result.primitives.entry(theme).or_default().extend(brushes);
            }
            let selection: Self =
                serde_json::from_str(include_str!("../references/selection-template.json"))
                    .expect("validated selection resources");
            for (theme, aliases) in selection.aliases {
                result.aliases.entry(theme).or_default().extend(aliases);
            }
            for (theme, brushes) in selection.primitives {
                result.primitives.entry(theme).or_default().extend(brushes);
            }
            let input: Self =
                serde_json::from_str(include_str!("../references/selection-input-template.json"))
                    .expect("selection input resources");
            for (theme, aliases) in input.aliases {
                result.aliases.entry(theme).or_default().extend(aliases);
            }
            for (theme, brushes) in input.primitives {
                result.primitives.entry(theme).or_default().extend(brushes);
            }
            let text: Self =
                serde_json::from_str(include_str!("../references/text-scroll-template.json"))
                    .expect("text/scroll resources");
            for (theme, brushes) in text.primitives {
                result.primitives.entry(theme).or_default().extend(brushes);
            }
            let primitives:Self=serde_json::from_str(include_str!("../references/scroll-primitives-template.json")).expect("scroll primitives resources");
            for(theme,aliases)in primitives.aliases{result.aliases.entry(theme).or_default().extend(aliases);}
            for(theme,brushes)in primitives.primitives{result.primitives.entry(theme).or_default().extend(brushes);}
            let basics: Self =
                serde_json::from_str(include_str!("../references/basic-next-template.json"))
                    .expect("RepeatButton resources");
            for (theme, brushes) in basics.primitives {
                result.primitives.entry(theme).or_default().extend(brushes);
            }
            let five: Self =
                serde_json::from_str(include_str!("../references/five-controls-template.json"))
                    .expect("five control resources");
            for (theme, brushes) in five.primitives {
                result.primitives.entry(theme).or_default().extend(brushes);
            }
            let progress: Self =
                serde_json::from_str(include_str!("../references/progress-template.json"))
                    .expect("progress resources");
            for (theme, brushes) in progress.primitives {
                result.primitives.entry(theme).or_default().extend(brushes);
            }
            let compact: Self = serde_json::from_str(include_str!(
                "../references/compact-shared-resources.json"
            )).expect("compact shared resource dependencies");
            for (theme, aliases) in compact.aliases {
                result.aliases.entry(theme).or_default().extend(aliases);
            }
            for (theme, brushes) in compact.primitives {
                result.primitives.entry(theme).or_default().extend(brushes);
            }
            let views:serde_json::Value=serde_json::from_str(include_str!("../references/view-command-template.json")).expect("view resources");
            let palettes:HashMap<String,HashMap<String,Brush>>=serde_json::from_value(views["palettes"].clone()).expect("view brushes");for(theme,brushes)in palettes{result.primitives.entry(theme).or_default().extend(brushes);}
            let pickers:serde_json::Value=serde_json::from_str(include_str!("../references/picker-controls-template.json")).expect("picker resources");
            let palettes:HashMap<String,HashMap<String,Brush>>=serde_json::from_value(pickers["palettes"].clone()).expect("picker brushes");
            for(theme,brushes)in palettes{result.primitives.entry(theme).or_default().extend(brushes);}
            let commands:serde_json::Value=serde_json::from_str(include_str!("../references/command-controls-template.json")).expect("command resource contract");
            let palettes:std::collections::HashMap<String,std::collections::HashMap<String,Brush>>=serde_json::from_value(commands["palettes"].clone()).expect("native command brushes");
            for (theme,brushes)in palettes{result.primitives.entry(theme).or_default().extend(brushes);}
            result.aliases.entry("HighContrast".into()).or_default().insert("CommandBarOverflowPresenterBorderBrush".into(),"MenuFlyoutPresenterBorderBrush".into());
            let menus: serde_json::Value = serde_json::from_str(include_str!("../references/command-menu-template.json")).expect("command menu resources");
            let palettes: HashMap<String, HashMap<String, Brush>> = serde_json::from_value(menus["palettes"].clone()).expect("command menu brushes");
            for (theme, brushes) in palettes { result.primitives.entry(if theme=="Default" {"Dark".into()}else{theme}).or_default().extend(brushes); }
            let overlays: serde_json::Value =
                serde_json::from_str(include_str!("../references/overlay-template.json"))
                    .expect("overlay resource contract");
            let palettes: HashMap<String, HashMap<String, Brush>> =
                serde_json::from_value(overlays["palettes"].clone())
                    .expect("native overlay brushes");
            for (theme, brushes) in palettes {
                result.primitives.entry(theme).or_default().extend(brushes);
            }
            let palettes: HashMap<String, HashMap<String, Brush>> =
                serde_json::from_value(crate::scene::collections::contract()["palettes"].clone())
                    .expect("native collection brushes");
            for (theme, brushes) in palettes {
                result.primitives.entry(theme).or_default().extend(brushes);
            }
            let gallery:Self=serde_json::from_str(include_str!("../references/repeater-gallery-resources.json")).expect("pinned Gallery legacy brushes");
            for(theme,brushes)in gallery.primitives{for(key,brush)in brushes{result.primitives.entry(theme.clone()).or_default().entry(key).or_insert(brush);}}
            result
        })
    }
    pub fn resolve(&self, theme: Theme, key: &str) -> Result<&Brush, String> {
        let name = match theme {
            Theme::Light => "Light",
            Theme::Dark => "Dark",
            Theme::HighContrast => "HighContrast",
        };
        let mut current = key;
        for _ in 0..32 {
            if let Some(brush) = self.primitives.get(name).and_then(|d| d.get(current)) {
                return Ok(brush);
            }
            current = self
                .aliases
                .get(name)
                .and_then(|d| d.get(current))
                .map(|s| s.as_str())
                .ok_or_else(|| format!("unresolved theme resource {name}/{current}"))?;
        }
        Err(format!("cyclic theme resource: {key}"))
    }
    /// Material policy uses the matched high-contrast window-color fixture when
    /// an Acrylic-only theme key has no high-contrast brush of its own.
    pub fn resolve_material(&self, theme: Theme, key: &str) -> Result<&Brush, String> {
        if theme == Theme::HighContrast {
            self.resolve(Theme::Light, key)?;
            self.resolve(Theme::Dark, key)?;
            self.resolve(theme, key)
                .or_else(|_| self.resolve(theme, "LayerFillColorDefaultBrush"))
        } else {
            self.resolve(theme, key)
        }
    }
    pub fn color(&self, theme: Theme, key: &str) -> &str {
        let brush = self
            .resolve(theme, key)
            .unwrap_or_else(|error| panic!("required brush {key}: {error}"));
        assert_eq!(brush.kind, "solid", "expected solid brush: {key}");
        &brush.color
    }
}
