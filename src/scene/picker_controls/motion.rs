//! CalendarView's fixed SDK VisualTransition tracks. Cached commands retain
//! the displayed outgoing view when a transition is interrupted.
use super::*;
use crate::animation::bezier;

pub struct CalendarTransition {
    pub from: CalendarViewDisplayMode,
    pub to: CalendarViewDisplayMode,
    pub start: f64,
    pub outgoing: Vec<Draw>,
}
fn time(value: &str) -> f64 {
    value
        .split(':')
        .fold(0., |n, v| n * 60. + v.parse::<f64>().expect("SDK key time"))
        * 1000.
}
fn transition(
    from: CalendarViewDisplayMode,
    to: CalendarViewDisplayMode,
) -> Option<&'static Value> {
    contract()["calendarMotion"]["transitions"]
        .as_array()?
        .iter()
        .find(|v| v["from"] == from.as_str() && v["to"] == to.as_str())
}
fn curve() -> [f64; 4] {
    std::array::from_fn(|i| contract()["calendarMotion"]["curve"][i].as_f64().unwrap())
}
fn track(config: &Value, target: &str, property: &str, initial: f64, elapsed: f64) -> f64 {
    let Some(track) = config["tracks"]
        .as_array()
        .unwrap()
        .iter()
        .find(|v| v["target"] == target && v["property"] == property)
    else {
        return initial;
    };
    let mut at = 0.;
    let mut value = initial;
    for frame in track["frames"].as_array().unwrap() {
        let next = time(frame["KeyTime"].as_str().unwrap());
        let next_value = frame["Value"].as_str().unwrap().parse::<f64>().unwrap();
        if elapsed < next {
            if frame["kind"] == "DiscreteDoubleKeyFrame" || next <= at {
                return value;
            }
            let t = ((elapsed - at) / (next - at)).clamp(0., 1.);
            return value
                + (next_value - value)
                    * if frame["kind"] == "SplineDoubleKeyFrame" {
                        bezier(t, curve())
                    } else {
                        t
                    };
        }
        at = next;
        value = next_value;
    }
    value
}
impl CalendarTransition {
    fn duration(&self) -> f64 {
        transition(self.from, self.to)
            .map(|v| {
                v["tracks"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .flat_map(|t| t["frames"].as_array().unwrap())
                    .map(|f| time(f["KeyTime"].as_str().unwrap()))
                    .fold(0., f64::max)
            })
            .unwrap_or(0.)
    }
    pub fn active(&self, now: f64) -> bool {
        now < self.start + self.duration()
    }
    fn values(&self, mode: CalendarViewDisplayMode, now: f64, entering: bool) -> [f64; 2] {
        let Some(config) = transition(self.from, self.to) else {
            return [1., 1.];
        };
        let view = match mode {
            CalendarViewDisplayMode::Month => "MonthView",
            CalendarViewDisplayMode::Year => "YearViewScrollViewer",
            CalendarViewDisplayMode::Decade => "DecadeViewScrollViewer",
        };
        let transform = match mode {
            CalendarViewDisplayMode::Month => "MonthViewTransform",
            CalendarViewDisplayMode::Year => "YearViewTransform",
            CalendarViewDisplayMode::Decade => "DecadeViewTransform",
        };
        [
            track(
                config,
                view,
                "Opacity",
                if entering { 0. } else { 1. },
                now - self.start,
            ),
            track(config, transform, "ScaleX", 1., now - self.start),
        ]
    }
}
impl PickerState {
    pub fn animating(&self, now: f64) -> bool {
        if self.calendar_scroll.active(now) {
            return true;
        }
        self.calendar_transition
            .as_ref()
            .is_some_and(|t| t.active(now))
            || self.header_fade_start.is_some_and(|at| {
                now < at
                    + contract()["calendarMotion"]["headerFadeMs"]
                        .as_f64()
                        .unwrap()
            })
    }
}
impl Scene {
    pub(super) fn calendar_first_date(q: &PickerProperties, date: Date) -> Date {
        let min = q.bounds().0;
        match q.display_mode {
            CalendarViewDisplayMode::Month => {
                let first = Date { day: 1, ..date };
                let start = first.ordinal()
                    - (i32::from(first.weekday()) - q.first_day_of_week as i32).rem_euclid(7);
                let min_start = min.ordinal()
                    - (i32::from(min.weekday()) - q.first_day_of_week as i32).rem_euclid(7);
                Date::from_ordinal(start.max(min_start))
            }
            CalendarViewDisplayMode::Year => {
                let start = min.year * 12 + min.month as i32 - 1;
                let target = (date.year * 12).max(start);
                let first = start
                    + (target - start).div_euclid(q.year_columns as i32) * q.year_columns as i32;
                Date {
                    year: first / 12,
                    month: (first % 12 + 1) as u8,
                    day: 1,
                }
            }
            CalendarViewDisplayMode::Decade => {
                let target = (date.year / 10 * 10).max(min.year);
                Date {
                    year: min.year
                        + (target - min.year).div_euclid(q.year_columns as i32)
                            * q.year_columns as i32,
                    month: 1,
                    day: 1,
                }
            }
        }
    }
    pub(super) fn start_calendar_scroll(&mut self, id: u32, old: Date, new: Date) {
        if old == new || self.reduced_motion || self.nodes[&id].theme == Theme::HighContrast {
            return;
        }
        let n = &self.nodes[&id];
        let q = n.props.picker_controls.as_deref().unwrap();
        let old = Self::calendar_first_date(q, old);
        let new = Self::calendar_first_date(q, new);
        let step = match q.display_mode {
            CalendarViewDisplayMode::Month => {
                (new.ordinal() - old.ordinal()).div_euclid(7) as f64 * n.picker.cell
            }
            CalendarViewDisplayMode::Year => {
                ((new.year - old.year) * 12 + new.month as i32 - old.month as i32)
                    .div_euclid(q.year_columns as i32) as f64
                    * n.picker.calendar_grid.height
                    / q.year_rows as f64
            }
            CalendarViewDisplayMode::Decade => {
                (new.year - old.year).div_euclid(q.year_columns as i32) as f64
                    * n.picker.calendar_grid.height
                    / q.year_rows as f64
            }
        };
        let state = &mut self.nodes.get_mut(&id).unwrap().picker;
        if state.calendar_days.is_empty() {
            return;
        }
        let remaining = if state.calendar_scroll.active(self.time) {
            state.calendar_scroll_distance * (1. - state.calendar_scroll.value(self.time))
        } else {
            0.
        };
        state.calendar_scroll_distance = step + remaining;
        state.calendar_scroll_outgoing = state.calendar_days.clone();
        state.calendar_scroll.set(0., self.time, false);
        state.calendar_scroll.set(1., self.time, true);
        state.header_fade_start = Some(self.time);
    }
    pub(super) fn calendar_day_commands(
        &mut self,
        id: u32,
        current: Vec<Draw>,
        clip: Rect,
    ) -> Vec<Draw> {
        let state = &self.nodes[&id].picker;
        let mut core = Vec::new();
        if state.calendar_scroll.active(self.time) {
            let distance = state.calendar_scroll_distance;
            let travel = distance * state.calendar_scroll.value(self.time);
            for (view, offset) in [
                (&state.calendar_scroll_outgoing, -travel),
                (&current, distance - travel),
            ] {
                // Paint shared rows once, so glyph coverage and selection strokes
                // do not become darker while the old/new viewports overlap.
                let incoming_top = (clip.y + distance - travel).clamp(clip.y, clip.y + clip.height);
                let incoming_bottom =
                    (clip.y + clip.height + distance - travel).clamp(clip.y, clip.y + clip.height);
                let segment = if std::ptr::eq(view, &current) {
                    clip
                } else if distance >= 0. {
                    Rect::new(clip.x, clip.y, clip.width, (incoming_top - clip.y).max(0.))
                } else {
                    Rect::new(
                        clip.x,
                        incoming_bottom,
                        clip.width,
                        (clip.y + clip.height - incoming_bottom).max(0.),
                    )
                };
                core.push(Draw::Clip { rect: segment });
                core.push(Draw::Save);
                core.push(Draw::Transform {
                    matrix: [1., 0., 0., 1., 0., offset],
                });
                core.extend(view.iter().cloned());
                core.push(Draw::Restore);
                core.push(Draw::Restore);
            }
        } else {
            core = current;
            self.nodes
                .get_mut(&id)
                .unwrap()
                .picker
                .calendar_scroll_outgoing
                .clear();
        }
        self.nodes.get_mut(&id).unwrap().picker.calendar_days = core.clone();
        let mut commands = vec![Draw::Clip { rect: clip }];
        commands.extend(core);
        commands.push(Draw::Restore);
        commands
    }
    pub(super) fn start_calendar_transition(
        &mut self,
        id: u32,
        from: CalendarViewDisplayMode,
        to: CalendarViewDisplayMode,
    ) {
        if self.reduced_motion
            || self.nodes[&id].theme == Theme::HighContrast
            || transition(from, to).is_none()
        {
            return;
        }
        let state = &mut self.nodes.get_mut(&id).unwrap().picker;
        if state.calendar_presented.is_empty() {
            return;
        }
        state.calendar_scroll.set(1., self.time, false);
        state.calendar_transition = Some(CalendarTransition {
            from,
            to,
            start: self.time,
            outgoing: state.calendar_presented.clone(),
        });
        state.header_fade_start = Some(self.time);
    }
    pub(in crate::scene) fn picker_part_opacity(&self, id: u32) -> Option<f64> {
        let n = &self.nodes[&id];
        if n.picker.role != "HeaderButton" {
            return None;
        }
        let owner = n.picker.owner?;
        let at = self.nodes[&owner].picker.header_fade_start?;
        Some(
            ((self.time - at)
                / contract()["calendarMotion"]["headerFadeMs"]
                    .as_f64()
                    .unwrap())
            .clamp(0., 1.),
        )
    }
    pub(super) fn calendar_background_opacity(&self, id: u32) -> f64 {
        let Some(t) = self.nodes[&id]
            .picker
            .calendar_transition
            .as_ref()
            .filter(|t| t.active(self.time))
        else {
            return 1.;
        };
        transition(t.from, t.to)
            .map(|v| track(v, "BackgroundLayer", "Opacity", 1., self.time - t.start))
            .unwrap_or(1.)
    }
    pub(super) fn calendar_view_commands(&mut self, id: u32, current: Vec<Draw>) -> Vec<Draw> {
        let state = &self.nodes[&id].picker;
        let mut commands = Vec::new();
        if let Some(t) = state
            .calendar_transition
            .as_ref()
            .filter(|t| t.active(self.time))
        {
            let n = &self.nodes[&id];
            let top = self.nodes[&n.picker.parts["HeaderButton"]].rect.height
                + (6. * self.dpr).round_ties_even() / self.dpr
                + (7. * self.dpr).round_ties_even() / self.dpr;
            let clip = Rect::new(0., top, n.rect.width, (n.rect.height - top).max(0.));
            let center = [n.rect.width / 2., top + clip.height / 2.];
            commands.push(Draw::Clip { rect: clip });
            for (view, entering) in [(&t.outgoing, false), (&current, true)] {
                let [opacity, scale] =
                    t.values(if entering { t.to } else { t.from }, self.time, entering);
                commands.push(Draw::Layer { opacity });
                commands.push(Draw::Save);
                commands.push(Draw::Transform {
                    matrix: [
                        scale,
                        0.,
                        0.,
                        scale,
                        center[0] * (1. - scale),
                        center[1] * (1. - scale),
                    ],
                });
                commands.extend(view.iter().cloned());
                commands.push(Draw::Restore);
                commands.push(Draw::EndLayer);
            }
            commands.push(Draw::Restore);
        } else {
            commands = current;
            self.nodes.get_mut(&id).unwrap().picker.calendar_transition = None;
        }
        self.nodes.get_mut(&id).unwrap().picker.calendar_presented = commands.clone();
        commands
    }
}
