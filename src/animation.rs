/// Retargeting samples the old timeline first; reversal never jumps to an endpoint.
#[derive(Clone, Debug)]
pub struct Motion {
    pub from: f64,
    pub to: f64,
    pub start: f64,
    pub duration: f64,
    pub curve: [f64; 4],
}
impl Default for Motion {
    fn default() -> Self {
        Self {
            from: 0.,
            to: 0.,
            start: 0.,
            duration: 0.,
            curve: [0.1, 0.9, 0.2, 1.],
        }
    }
}
impl Motion {
    pub fn value(&self, now: f64) -> f64 {
        if self.duration <= 0. {
            return self.to;
        }
        let t = ((now - self.start) / self.duration).clamp(0., 1.);
        self.from + (self.to - self.from) * bezier(t, self.curve)
    }
    pub fn retarget(&mut self, to: f64, now: f64, duration: f64) {
        self.from = self.value(now);
        self.to = to;
        self.start = now;
        self.duration = duration;
    }
    pub fn active(&self, now: f64) -> bool {
        self.duration > 0. && now < self.start + self.duration && (self.from - self.to).abs() > 1e-9
    }
    pub fn snap(&mut self, value: f64) {
        self.from = value;
        self.to = value;
        self.duration = 0.;
    }
}
pub fn bezier(x: f64, p: [f64; 4]) -> f64 {
    if x <= 0. {
        return 0.;
    }
    if x >= 1. {
        return 1.;
    }
    let sample = |t: f64, a: f64, b: f64| {
        3. * (1. - t).powi(2) * t * a + 3. * (1. - t) * t * t * b + t * t * t
    };
    let (mut lo, mut hi) = (0., 1.);
    for _ in 0..18 {
        let t = (lo + hi) / 2.;
        if sample(t, p[0], p[2]) < x {
            lo = t;
        } else {
            hi = t;
        }
    }
    sample((lo + hi) / 2., p[1], p[3])
}

/// NavigationView.cpp::PlayIndicatorAnimations: 600ms offset/scale/opacity tracks,
/// with the discrete center-point change at 200ms. Coordinates are absolute DIP.
#[derive(Clone, Debug, Default)]
pub struct IndicatorTimeline {
    from: crate::model::Rect,
    to: crate::model::Rect,
    start: f64,
    duration: f64,
    horizontal: bool,
    different_depth: bool,
}
#[derive(Clone, Copy, Debug, serde::Serialize)]
pub struct IndicatorVisual {
    pub rect: crate::model::Rect,
    pub opacity: f64,
}
impl IndicatorTimeline {
    pub fn active(&self, now: f64) -> bool {
        self.duration > 0. && now < self.start + self.duration
    }
    pub fn finish(&mut self) {
        self.from = self.to;
        self.duration = 0.;
    }
    pub fn retarget(&mut self, to: crate::model::Rect, horizontal: bool, now: f64, animate: bool) {
        let changes_depth = if horizontal { (self.to.y - to.y).abs() > 0.01 } else { (self.to.x - to.x).abs() > 0.01 };
        // Native selection changes finish a previous cross-level transition.
        // Do not turn a stretched in-flight bar into a new item's base height.
        let current = if changes_depth || self.different_depth { self.to }
            else { self.visuals(now).last().map(|v| v.rect).unwrap_or(self.to) };
        self.from = current;
        self.to = to;
        self.different_depth = if horizontal { (current.y - to.y).abs() > 0.01 } else { (current.x - to.x).abs() > 0.01 };
        self.start = now;
        self.duration = if animate && self.horizontal == horizontal {
            600.
        } else {
            0.
        };
        self.horizontal = horizontal;
    }
    /// An item's layout moved (scroll/reflow), but its identity did not change.
    /// Carry the existing local animation with the container without restarting it.
    pub fn reposition(&mut self, to: crate::model::Rect) {
        self.from.x += to.x - self.to.x;
        self.from.y += to.y - self.to.y;
        self.to = to;
    }
    pub fn visuals(&self, now: f64) -> Vec<IndicatorVisual> {
        if self.to.width == 0. || self.to.height == 0. {
            return vec![];
        }
        if !self.active(now) {
            return vec![IndicatorVisual {
                rect: self.to,
                opacity: 1.,
            }];
        }
        let t = ((now - self.start) / self.duration).clamp(0., 1.);
        // NavigationView::PlayIndicatorNonSameLevelAnimations scales the old
        // and new bars inside their own containers rather than stretching a
        // single bar across different indentation levels.
        if self.different_depth {
            let incoming = bezier(t, [0.1, 0.9, 0.2, 1.0]);
            let down = self.to.y >= self.from.y;
            let scale = |r: crate::model::Rect, value: f64, from_top: bool| {
                if self.horizontal {
                    crate::model::Rect::new(r.x + r.width * (1. - value) / 2., r.y, r.width * value, r.height)
                } else {
                    crate::model::Rect::new(r.x, r.y + if from_top { 0. } else { r.height * (1. - value) }, r.width, r.height * value)
                }
            };
            return vec![
                IndicatorVisual { rect: scale(self.from, 1. - incoming, !down), opacity: 1. },
                IndicatorVisual { rect: scale(self.to, incoming, down), opacity: 1. },
            ];
        }
        let (a, b, start_size, end_size) = if self.horizontal {
            (self.from.x, self.to.x, self.from.width, self.to.width)
        } else {
            (self.from.y, self.to.y, self.from.height, self.to.height)
        };
        // Advance the two edges, not a new scale relative to an already-stretched
        // dimension. Retargets stay inside the union of current and target bounds.
        let forward = b + end_size / 2. >= a + start_size / 2.;
        let first = t < 0.333;
        let ease = if first {
            bezier(t / 0.333, [0.9, 0.1, 1.0, 0.2])
        } else {
            bezier((t - 0.333) / 0.667, [0.1, 0.9, 0.2, 1.0])
        };
        let start_end = a + start_size;
        let target_end = b + end_size;
        let (position, end) = match (forward, first) {
            (true, true) => (a, start_end + (target_end - start_end) * ease),
            (true, false) => (a + (b - a) * ease, target_end),
            (false, true) => (a + (b - a) * ease, start_end),
            (false, false) => (b, start_end + (target_end - start_end) * ease),
        };
        let length = (end - position).max(0.);
        let rect = if self.horizontal {
            crate::model::Rect::new(position, self.to.y, length, self.to.height)
        } else {
            crate::model::Rect::new(self.to.x, position, self.to.width, length)
        };
        let outgoing_opacity = if t < 0.333 {
            1.
        } else {
            1. - bezier((t - 0.333) / 0.667, [0.1, 0.9, 0.2, 1.])
        };
        vec![
            IndicatorVisual {
                rect,
                opacity: outgoing_opacity,
            },
            IndicatorVisual { rect, opacity: 1. },
        ]
    }
}
